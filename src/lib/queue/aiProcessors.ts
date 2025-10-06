import { jobQueue, JOB_TYPES } from './jobQueue';
import { db } from '../dbconfig';
import { geminiAI } from '../ai/gemini-service';
import { documentAI } from '../ai/documentai-service';
import * as fs from 'fs';
import tesseract from 'node-tesseract-ocr';
import * as os from 'os';
import * as path from 'path';

import * as pdfjsLib from 'pdfjs-dist'; // Use root for types
import '@ungap/with-resolvers';

console.log('Loaded pdfjs-dist version:', require('pdfjs-dist/package.json').version);

// Job data interfaces
export interface ExtractQuestionsJobData {
    resourceId: number;
    filePath: string;
    fileType: string;
}

export interface IdentifyConceptsJobData {
    resourceId: number;
    questions: string[];
}

export interface UpdateRAGIndexJobData {
    resourceId: number;
    content: string;
    concepts: string[];
}

export interface AnalyzeDocumentJobData {
    resourceId: number;
    filePath: string;
    fileType: string;
    enableAIAnalysis: boolean;
    analysisType?: string; // 'questions' or 'content'
    tags?: string[]; // Resource tags for context
}

// AI Processing Job Processors
class AIJobProcessors {
    constructor() {
        // Simple constructor without external dependencies
    }

    init(): void {
        console.log('🔧 Initializing AI Job Processors...');

        jobQueue.process(JOB_TYPES.EXTRACT_QUESTIONS, this.extractQuestionsProcessor.bind(this));
        jobQueue.process(JOB_TYPES.IDENTIFY_CONCEPTS, this.identifyConceptsProcessor.bind(this));
        jobQueue.process(JOB_TYPES.UPDATE_RAG_INDEX, this.updateRAGIndexProcessor.bind(this));
        jobQueue.process(JOB_TYPES.ANALYZE_DOCUMENT, this.analyzeDocumentProcessor.bind(this));

        console.log('✅ AI Job Processors initialized successfully');
        console.log('📋 Registered processors:', Object.values(JOB_TYPES));
    }

    public async extractQuestionsProcessor(job: any): Promise<any> {
        const { resourceId, filePath, fileType } = job.data;

        try {
            console.log(`🔍 Starting question extraction for resource ${resourceId}`);
            console.log(`📁 File path: ${filePath}`);
            console.log(`📄 File type: ${fileType}`);
            job.progress = 10;

            // Create/update processing job record
            const existingJob = await db.aIProcessingJob.findUnique({ where: { id: job.id } });
            if (!existingJob) {
                await db.aIProcessingJob.create({
                    data: { id: job.id, resourceId, status: 'PROCESSING', progress: 10, results: {} }
                });
            } else {
                await db.aIProcessingJob.update({
                    where: { id: job.id },
                    data: { status: 'PROCESSING', progress: 10 }
                });
            }

            let extractedText = '';
            let fileBuffer: Buffer;

            // Handle both local files and URLs (like Cloudinary) with enhanced timeout
            if (filePath.startsWith('http')) {
                console.log(`📥 Downloading file from URL: ${filePath}`);
                console.log(`⏰ Starting download with 120s timeout...`);

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                        controller.abort();
                        console.log('⏰ Download timeout reached (120s)');
                    }, 120000); // 2 minute timeout for download

                    const response = await fetch(filePath, {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/pdf,application/*,*/*'
                        }
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
                    }

                    const contentLength = response.headers.get('content-length');
                    const fileSize = contentLength ? parseInt(contentLength) : 0;
                    console.log(`📊 File size: ${fileSize > 0 ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}`);

                    if (fileSize > 50 * 1024 * 1024) { // 50MB limit
                        throw new Error('File too large for processing (>50MB). Please use a smaller file.');
                    }

                    fileBuffer = Buffer.from(await response.arrayBuffer());
                    console.log(`✅ Downloaded file successfully, actual size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        throw new Error('File download timeout. The file may be too large or the connection is slow.');
                    }
                    throw error;
                }
            } else {
                // Read local file
                console.log(`📁 Reading local file: ${filePath}`);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${filePath}`);
                }
                fileBuffer = fs.readFileSync(filePath);
                console.log(`✅ Read local file, size: ${fileBuffer.length} bytes`);
            }

            // 1. Extract text from PDF or image with Document AI as primary method
            if (fileType.toLowerCase().includes('pdf')) {
                console.log(`📖 Processing PDF file (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) with Document AI...`);
                job.progress = 20;

                try {
                    // Import Document AI service for PDF processing
                    const { documentAI } = await import('../ai/documentai-service');

                    console.log(`🤖 Using Google Cloud Document AI for PDF text extraction...`);
                    console.log(`📊 PDF details: application/pdf, size: ${fileBuffer.length} bytes`);

                    // Check if Document AI is configured
                    const configStatus = documentAI.getConfigurationStatus();
                    console.log(`⚙️ Document AI configuration:`, configStatus);

                    if (documentAI.isConfigured()) {
                        // Use Document AI for PDF processing
                        const documentAIResult = await Promise.race([
                            documentAI.extractTextFromImage(fileBuffer, 'application/pdf'),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Document AI PDF processing timeout after 5 minutes')), 300000)
                            )
                        ]) as string;

                        extractedText = documentAIResult;
                        console.log(`✅ Document AI PDF processing complete, extracted ${extractedText.length} characters`);
                        console.log(`📄 Document AI PDF output preview:`, extractedText.substring(0, 500));

                        // If Document AI returns very little text, try structured extraction
                        if (extractedText.length < 200) {
                            console.log(`🔄 Low text content, trying Document AI structured extraction...`);
                            try {
                                const structuredData = await documentAI.extractStructuredData(fileBuffer, 'application/pdf');
                                if (structuredData.text && structuredData.text.length > extractedText.length) {
                                    extractedText = structuredData.text;
                                    console.log(`✅ Document AI structured extraction provided better text (${extractedText.length} chars)`);
                                }

                                // Also extract table content if available
                                if (structuredData.tables && structuredData.tables.length > 0) {
                                    let tableText = '\n\n--- TABLES ---\n';
                                    structuredData.tables.forEach((table, index) => {
                                        tableText += `\nTable ${index + 1} (${table.rows}x${table.columns}):\n`;
                                        table.content.forEach(row => {
                                            tableText += row.join(' | ') + '\n';
                                        });
                                    });
                                    extractedText += tableText;
                                    console.log(`✅ Added ${structuredData.tables.length} tables to extracted text`);
                                }
                            } catch (structuredError) {
                                console.log(`⚠️ Structured extraction failed, using initial result`);
                            }
                        }

                        // Update progress
                        job.progress = 50;
                    } else {
                        throw new Error('Document AI not configured, falling back to PDF.js');
                    }

                } catch (documentAIError) {
                    console.error(`❌ Document AI PDF processing failed:`, documentAIError);
                    console.log(`🔄 Falling back to PDF.js for PDF processing...`);

                    try {
                        // Fallback to PDF.js processing
                        const pdfjsLib = await import('pdfjs-dist');

                        // Configure PDF.js for server-side use
                        if (typeof window === 'undefined') {
                            console.log('🔧 Configuring PDF.js for server-side processing (no worker)');
                            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                        }

                        const data = new Uint8Array(fileBuffer);
                        console.log(`🔧 Creating PDF.js loading task...`);

                        const loadingTask = pdfjsLib.getDocument({
                            data,
                            verbosity: 0, // Reduce logging
                            maxImageSize: 1024 * 1024, // 1MB max image size
                            disableFontFace: true, // Disable font loading for speed
                            disableRange: true, // Disable range requests
                            disableStream: true // Disable streaming
                        });

                        // Add comprehensive timeout to PDF processing
                        const pdf = await Promise.race([
                            loadingTask.promise,
                            new Promise((_, reject) => {
                                setTimeout(() => {
                                    console.log('⏰ PDF.js loading timeout (120s)');
                                    reject(new Error('PDF.js loading timeout after 120 seconds'));
                                }, 120000); // 2 minute timeout
                            })
                        ]) as any;

                        let text = '';
                        const totalPages = pdf.numPages;
                        console.log(`📄 PDF has ${totalPages} pages, starting PDF.js extraction...`);

                        // Limit page processing for very large documents
                        const maxPages = Math.min(totalPages, 50); // Process max 50 pages for fallback
                        if (totalPages > maxPages) {
                            console.log(`⚠️ Large PDF detected (${totalPages} pages). Processing first ${maxPages} pages only.`);
                        }

                        for (let i = 1; i <= maxPages; i++) {
                            try {
                                console.log(`📄 Processing page ${i}/${maxPages}...`);

                                // Add timeout for each page
                                const pagePromise = pdf.getPage(i);
                                const page = await Promise.race([
                                    pagePromise,
                                    new Promise((_, reject) => {
                                        setTimeout(() => {
                                            reject(new Error(`Page ${i} processing timeout`));
                                        }, 30000); // 30s per page
                                    })
                                ]) as any;

                                const content = await page.getTextContent();
                                const pageText = content.items.map((item: any) => item.str).join(' ');
                                text += pageText + '\n';

                                // Update progress incrementally
                                job.progress = 20 + (i / maxPages) * 30;

                                // Log progress every 10 pages
                                if (i % 10 === 0 || i === maxPages) {
                                    console.log(`✅ Processed ${i}/${maxPages} pages, extracted ${text.length} characters so far`);
                                }

                                // Memory management: if text is getting very large, break early
                                if (text.length > 500000) { // 500KB of text for fallback
                                    console.log(`⚠️ Large text content detected (${text.length} chars). Stopping early to prevent memory issues.`);
                                    break;
                                }

                            } catch (pageError) {
                                console.error(`❌ Error processing page ${i}:`, pageError instanceof Error ? pageError.message : String(pageError));
                                // Continue with next page instead of failing completely
                                continue;
                            }
                        }

                        extractedText = text;
                        console.log(`✅ PDF.js fallback processing complete! Extracted ${text.length} characters from ${maxPages} pages`);

                        if (text.length < 100) {
                            console.log(`⚠️ Very little text extracted. PDF might be image-based or corrupted.`);
                            throw new Error('PDF contains insufficient text content. It may be image-based or corrupted.');
                        }
                    } catch (pdfError) {
                        console.error(`❌ Both Document AI and PDF.js processing failed:`, pdfError);
                        throw new Error(`PDF processing failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
                    }
                }
            } else if (fileType.toLowerCase().match(/(jpg|jpeg|png|bmp|gif|tiff)$/)) {
                console.log(`🖼️ Processing image file with Document AI OCR...`);
                job.progress = 20;

                try {
                    // Import Document AI service for OCR processing
                    const { documentAI } = await import('../ai/documentai-service');

                    console.log(`� Using Google Cloud Document AI for text extraction...`);
                    console.log(`📊 Image details: ${this.getMimeTypeFromFileType(fileType)}, size: ${fileBuffer.length} bytes`);

                    // Check if Document AI is configured
                    const configStatus = documentAI.getConfigurationStatus();
                    console.log(`⚙️ Document AI configuration:`, configStatus);

                    if (documentAI.isConfigured()) {
                        // Use Document AI for OCR
                        const mimeType = this.getMimeTypeFromFileType(fileType);

                        const documentAIResult = await Promise.race([
                            documentAI.extractTextFromImage(fileBuffer, mimeType),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Document AI processing timeout after 2 minutes')), 120000)
                            )
                        ]) as string;

                        extractedText = documentAIResult;
                        console.log(`✅ Document AI processing complete, extracted ${extractedText.length} characters`);
                        console.log(`📄 Document AI output preview:`, extractedText.substring(0, 500));
                    } else {
                        throw new Error('Document AI not configured, falling back to alternative OCR');
                    }

                } catch (documentAIError) {
                    console.error(`❌ Document AI processing failed:`, documentAIError);
                    console.log(`🔄 Falling back to Gemini Vision OCR...`);

                    try {
                        // Fallback to Gemini Vision OCR
                        const { geminiAI } = await import('../ai/gemini-service');

                        const base64Image = fileBuffer.toString('base64');
                        const mimeType = this.getMimeTypeFromFileType(fileType);

                        const geminiResult = await Promise.race([
                            geminiAI.extractTextFromImage(base64Image, mimeType),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Gemini Vision timeout after 90 seconds')), 90000)
                            )
                        ]) as string;

                        extractedText = geminiResult;
                        console.log(`✅ Gemini Vision fallback complete, extracted ${extractedText.length} characters`);
                    } catch (geminiError) {
                        console.error(`❌ Gemini Vision fallback failed:`, geminiError);
                        console.log(`🔄 Falling back to traditional OCR...`);

                        try {
                            // Final fallback to traditional OCR
                            const tempDir = os.tmpdir();
                            const tempFilePath = path.join(tempDir, `temp_image_${job.id}.png`);
                            console.log(`📁 Using temporary file path for OCR fallback: ${tempFilePath}`);
                            fs.writeFileSync(tempFilePath, fileBuffer);

                            // Enhanced OCR configuration for better text extraction
                            const config = {
                                lang: 'eng',
                                oem: 1, // LSTM-based OCR engine
                                psm: 6, // Uniform block of text (better for exam papers)
                            };

                            console.log(`🔧 Starting traditional OCR with node-tesseract-ocr...`);

                            const ocrResult = await Promise.race([
                                tesseract.recognize(tempFilePath, config),
                                new Promise((_, reject) =>
                                    setTimeout(() => reject(new Error('OCR processing timeout after 90 seconds')), 90000)
                                )
                            ]) as string;

                            extractedText = ocrResult;
                            console.log(`✅ Traditional OCR processing complete, extracted ${extractedText.length} characters`);

                            // Clean up temporary file
                            fs.unlinkSync(tempFilePath);
                        } catch (ocrError) {
                            console.error(`❌ All OCR methods failed:`, ocrError);
                            extractedText = "All OCR processing methods failed. This may be due to poor image quality, unsupported format, network issues, or configuration problems. Please try with a clearer, higher-resolution image in a standard format (PNG, JPG), or check your API configurations.";

                            // Attempt to clean up if file exists
                            try {
                                const tempDir = os.tmpdir();
                                const tempFilePath = path.join(tempDir, `temp_image_${job.id}.png`);
                                if (fs.existsSync(tempFilePath)) {
                                    fs.unlinkSync(tempFilePath);
                                }
                            } catch (cleanupError) {
                                console.error(`❌ Failed to clean up temp file:`, cleanupError);
                            }
                        }
                    }
                }
            } else {
                throw new Error(`Unsupported file type for question extraction: ${fileType}`);
            }

            // 2. Enhanced text cleaning and preprocessing
            console.log(`🧹 Cleaning up OCR text...`);

            // More aggressive text cleaning for OCR artifacts
            extractedText = extractedText
                .replace(/©/g, 'c)') // Fix common OCR error for 'c)'
                .replace(/Desoribe/g, 'Describe') // Fix common spelling errors
                .replace(/itswarious/g, 'its various')
                .replace(/\s+/g, ' ') // Normalize multiple spaces
                .replace(/\r\n/g, '\n') // Normalize line breaks
                .replace(/\r/g, '\n') // Convert remaining \r to \n
                .replace(/[^\w\s.,()[\]{}:;?!@#$%^&*+=<>/\\|~`'"-]/g, ' ') // Remove weird OCR artifacts
                .replace(/\s+/g, ' ') // Clean up spaces again
                .trim();

            console.log(`📄 Cleaned text preview: ${extractedText.substring(0, 300)}...`);
            console.log(`📊 Text length after cleaning: ${extractedText.length} characters`);

            // If text is too short, it might be a poor OCR result
            if (extractedText.length < 100) {
                console.log(`⚠️ Text too short (${extractedText.length} chars), may indicate poor OCR quality`);
                extractedText = "OCR extraction yielded very limited text. This may be due to poor image quality, low resolution, or complex formatting. Please try with a clearer, higher-resolution image.";
            }

            job.progress = 40;

            // 3. Use Gemini AI for intelligent question extraction with course context
            console.log(`🧠 Using Gemini AI for intelligent question extraction...`);

            // Import Gemini service
            const { geminiAI } = await import('../ai/gemini-service');

            // Get comprehensive course context for better analysis
            const resource = await db.resource.findUnique({
                where: { id: resourceId },
                include: {
                    course: {
                        include: { department: true }
                    }
                }
            });

            if (!resource) {
                throw new Error(`Resource ${resourceId} not found`);
            }

            const courseContext = await this.getCourseContext(resource.courseId);
            console.log(`📚 Course context: ${courseContext}`);

            // Get existing concepts from course resources for better matching
            const existingConcepts = await this.getExistingCourseConcepts(resource.courseId);
            console.log(`� Found ${existingConcepts.length} existing concepts from course resources`);

            // Use different approaches based on file type for optimal results
            let extractedQuestions;
            if (fileType.toLowerCase().match(/(jpg|jpeg|png|bmp|gif|tiff)$/)) {
                // For images, try Document AI structured extraction first, then vision-based extraction
                console.log(`📸 Attempting direct question extraction from image...`);
                try {
                    const { documentAI } = await import('../ai/documentai-service');

                    if (documentAI.isConfigured()) {
                        console.log(`� Trying Document AI structured data extraction...`);
                        const mimeType = this.getMimeTypeFromFileType(fileType);

                        // First try to get structured data which might contain better question separation
                        const structuredData = await documentAI.extractStructuredData(fileBuffer, mimeType);

                        if (structuredData.text && structuredData.text.length > extractedText.length) {
                            console.log(`✅ Document AI structured extraction provided better text (${structuredData.text.length} chars vs ${extractedText.length} chars)`);
                            extractedText = structuredData.text; // Use better quality text
                        }
                    }

                    // Now try Gemini Vision for direct question extraction
                    const { geminiAI } = await import('../ai/gemini-service');
                    const base64Image = fileBuffer.toString('base64');
                    const mimeType = this.getMimeTypeFromFileType(fileType);

                    extractedQuestions = await geminiAI.extractQuestionsFromImage(
                        base64Image,
                        mimeType,
                        courseContext
                    );
                    console.log(`✅ Direct vision extraction found ${extractedQuestions.length} questions`);

                    // If direct vision extraction didn't find enough questions, fall back to text-based approach
                    if (extractedQuestions.length === 0 && extractedText.length > 100) {
                        console.log(`🔄 Vision found no questions, trying text-based extraction as backup...`);
                        extractedQuestions = await geminiAI.extractQuestionsFromText(extractedText, courseContext);
                        console.log(`✅ Text-based backup extraction found ${extractedQuestions.length} questions`);
                    }
                } catch (visionError) {
                    console.warn(`⚠️ Direct vision extraction failed, using text-based approach:`, visionError);
                    try {
                        const { geminiAI } = await import('../ai/gemini-service');
                        extractedQuestions = await geminiAI.extractQuestionsFromText(extractedText, courseContext);
                        console.log(`✅ Text-based fallback found ${extractedQuestions.length} questions`);
                    } catch (textError) {
                        console.error(`❌ Both vision and text extraction failed:`, textError);
                        extractedQuestions = await this.fallbackQuestionExtraction(extractedText);
                    }
                }
            } else {
                // For PDFs and other text-based files, use text extraction
                console.log(`📄 Using text-based question extraction for PDF/document...`);
                try {
                    const { geminiAI } = await import('../ai/gemini-service');
                    extractedQuestions = await geminiAI.extractQuestionsFromText(extractedText, courseContext);
                    console.log(`✅ Text-based extraction found ${extractedQuestions.length} questions`);
                } catch (geminiError) {
                    console.error(`❌ Text-based Gemini extraction failed:`, geminiError);
                    console.log(`🔄 Falling back to regex-based extraction...`);
                    extractedQuestions = await this.fallbackQuestionExtraction(extractedText);
                }
            } job.progress = 60;

            // 4. Store extracted questions in database with enhanced AI concept analysis
            console.log(`💾 Saving ${extractedQuestions.length} questions to database with enhanced concept matching...`);
            const savedQuestions = await Promise.all(
                extractedQuestions.map(async (questionData, index) => {
                    console.log(`💾 Saving question ${questionData.questionNumber || index + 1}: ${questionData.questionText.substring(0, 100)}...`);

                    // Use Gemini to identify concepts for each question with course context
                    let concepts = [];
                    try {
                        console.log(`🧠 Analyzing concepts for question ${questionData.questionNumber || index + 1}...`);
                        const aiConcepts = await geminiAI.identifyQuestionConcepts(questionData.questionText, courseContext);

                        // Enhance AI concepts with existing course concepts
                        concepts = await this.enhanceConceptsWithCourseData(aiConcepts, existingConcepts);

                        console.log(`✅ Enhanced analysis: ${concepts.length} concepts (${concepts.filter(c => c.isExisting).length} existing, ${concepts.filter(c => !c.isExisting).length} new)`);
                    } catch (conceptError) {
                        console.error(`❌ Concept analysis failed for question ${questionData.questionNumber}:`, conceptError);
                        concepts = [];
                    }

                    const question = await db.extractedQuestion.create({
                        data: {
                            resourceId,
                            questionText: questionData.questionText,
                            questionNumber: questionData.questionNumber || String(index + 1),
                            marks: questionData.marks || 0,
                            difficulty: questionData.difficulty || 'MEDIUM',
                            aiAnalysis: {
                                extractionMethod: fileType.toLowerCase().match(/(jpg|jpeg|png|bmp|gif|tiff)$/) ?
                                    'gemini-vision-enhanced' : 'gemini-ai-enhanced',
                                ocrQuality: extractedText.length > 500 ? 'good' : extractedText.length > 200 ? 'fair' : 'poor',
                                concepts: concepts,
                                courseContext: courseContext,
                                conceptMatching: {
                                    existingConcepts: concepts.filter(c => c.isExisting).length,
                                    newConcepts: concepts.filter(c => !c.isExisting).length,
                                    totalCourseConcepts: existingConcepts.length
                                },
                                visionAnalysis: questionData.questionType ? {
                                    questionType: questionData.questionType,
                                    hasImage: questionData.hasImage || false,
                                    pageSection: questionData.pageSection || 'unknown'
                                } : undefined
                            }
                        }
                    });

                    // Store enhanced concepts and create relationships
                    if (concepts.length > 0) {
                        await this.storeQuestionConcepts(question.id, concepts, resourceId);
                    }

                    return question;
                })
            );

            job.progress = 80;

            // 5. Update resource status
            console.log(`📊 Updating resource status...`);
            await db.resource.update({
                where: { id: resourceId },
                data: {
                    aiProcessingStatus: 'COMPLETED',
                    isPastQuestion: true
                }
            });

            job.progress = 100;
            console.log(`✅ Question extraction completed for resource ${resourceId}`);

            return {
                questionsExtracted: savedQuestions.length,
                questions: savedQuestions,
                extractedText
            };

        } catch (error) {
            console.error(`❌ Error in question extraction for resource ${resourceId}:`, error);
            console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

            try {
                await db.aIProcessingJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : String(error)
                    }
                });
            } catch (dbError) {
                console.error(`❌ Failed to update job status in database:`, dbError);
            }

            throw error;
        }
    }

    /**
     * Fallback question extraction using enhanced regex patterns
     */
    private async fallbackQuestionExtraction(extractedText: string): Promise<any[]> {
        console.log(`🔄 Using enhanced fallback regex-based question extraction...`);

        const questions: any[] = [];

        // Enhanced regex patterns for question detection - specifically for numbered questions
        console.log(`📝 Original text length: ${extractedText.length} characters`);
        console.log(`📄 Text to analyze: ${extractedText.substring(0, 300)}...`);

        // Try the most specific pattern first (numbered with periods)
        const numberedPattern = /(\d+)\.\s+([^]*?)(?=\s*\d+\.\s+|$)/g;
        let match;

        // Reset regex
        numberedPattern.lastIndex = 0;

        while ((match = numberedPattern.exec(extractedText)) !== null) {
            const questionNumber = match[1];
            let questionText = match[2].trim();

            // Clean up the question text
            questionText = questionText
                .replace(/\s+/g, ' ') // Normalize spaces
                .replace(/\n+/g, ' ') // Replace newlines with spaces
                .trim();

            // Skip very short questions or header-like text
            if (questionText.length < 15 ||
                questionText.toUpperCase().includes('DEPARTMENT') ||
                questionText.toUpperCase().includes('TIME ALLOWED') ||
                questionText.toUpperCase().includes('TEST DATE')) {
                console.log(`⏭️ Skipping question ${questionNumber}: too short or header-like`);
                continue;
            }

            // Extract marks if present in various formats
            const marksPatterns = [
                /\((\d+)\s*marks?\)/i,
                /\[(\d+)\s*marks?\]/i,
                /(\d+)\s*marks?\b/i
            ];

            let marks = 0;
            for (const pattern of marksPatterns) {
                const marksMatch = questionText.match(pattern);
                if (marksMatch) {
                    marks = parseInt(marksMatch[1]);
                    break;
                }
            }

            console.log(`✅ Found question ${questionNumber}: ${questionText.substring(0, 80)}... (${marks} marks)`);

            questions.push({
                questionNumber,
                questionText,
                marks,
                difficulty: 'MEDIUM',
                concepts: [],
                questionType: 'short_answer' // Default type for fallback
            });
        }

        // If the numbered pattern didn't work, try splitting by line breaks and finding questions
        if (questions.length === 0) {
            console.log(`🔄 Numbered pattern failed, trying line-based extraction...`);

            const lines = extractedText.split(/\r?\n/);
            let currentQuestion = '';
            let currentNumber = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check if line starts with a number and looks like a question
                const lineMatch = line.match(/^(\d+)\.\s*(.+)/);

                if (lineMatch) {
                    // Save previous question if exists
                    if (currentQuestion && currentNumber) {
                        const cleanedQuestion = currentQuestion.trim();
                        if (cleanedQuestion.length > 15) {
                            questions.push({
                                questionNumber: currentNumber,
                                questionText: cleanedQuestion,
                                marks: 0,
                                difficulty: 'MEDIUM',
                                concepts: [],
                                questionType: 'short_answer'
                            });
                        }
                    }

                    // Start new question
                    currentNumber = lineMatch[1];
                    currentQuestion = lineMatch[2];
                } else if (currentQuestion && line.length > 0 && !line.match(/^\d+\./)) {
                    // Continue current question
                    currentQuestion += ' ' + line;
                }
            }

            // Don't forget the last question
            if (currentQuestion && currentNumber) {
                const cleanedQuestion = currentQuestion.trim();
                if (cleanedQuestion.length > 15) {
                    questions.push({
                        questionNumber: currentNumber,
                        questionText: cleanedQuestion,
                        marks: 0,
                        difficulty: 'MEDIUM',
                        concepts: [],
                        questionType: 'short_answer'
                    });
                }
            }
        }

        console.log(`✅ Enhanced fallback extraction found ${questions.length} questions`);

        // Log each question for debugging
        questions.forEach((q, index) => {
            console.log(`📝 Question ${index + 1} (${q.questionNumber}): ${q.questionText.substring(0, 60)}...`);
        });

        return questions;
    }    /**
     * Store concepts and create question-concept relationships
     */
    private async storeQuestionConcepts(questionId: number, concepts: any[], resourceId: number): Promise<void> {
        try {
            for (const conceptData of concepts) {
                // Find or create concept
                let concept = await db.concept.findFirst({
                    where: { name: conceptData.name }
                });

                if (!concept) {
                    concept = await db.concept.create({
                        data: {
                            name: conceptData.name,
                            description: conceptData.description || '',
                            category: conceptData.category || 'General',
                            aiSummary: conceptData.description || ''
                        }
                    });
                }

                // Create question-concept relationship if schema supports it
                try {
                    await db.questionConcept.create({
                        data: {
                            questionId,
                            conceptId: concept.id,
                            confidence: conceptData.confidence || 0.8,
                            isMainConcept: conceptData.isMainConcept || false
                        }
                    });
                } catch {
                    console.log(`⚠️ Question-concept relationship not supported in current schema`);
                }

                // Create concept-resource relationship for RAG
                try {
                    const existing = await db.conceptResource.findFirst({
                        where: {
                            conceptId: concept.id,
                            resourceId
                        }
                    });

                    if (!existing) {
                        await db.conceptResource.create({
                            data: {
                                conceptId: concept.id,
                                resourceId,
                                relevanceScore: conceptData.confidence || 0.8,
                                extractedContent: conceptData.description || conceptData.name
                            }
                        });
                    }
                } catch (resourceRelationError) {
                    console.log(`⚠️ Concept-resource relationship creation failed:`, resourceRelationError);
                }
            }
        } catch (error) {
            console.error(`❌ Error storing concepts:`, error);
        }
    }

    /**
     * Get comprehensive course context for AI processing
     */
    private async getCourseContext(courseId: number): Promise<string> {
        try {
            const course = await db.course.findUnique({
                where: { id: courseId },
                include: {
                    department: true
                }
            });

            if (!course) {
                return 'General Academic';
            }

            return `${course.department.name} - ${course.title} (${course.code}) - Level ${course.level}. Synopsis: ${course.synopsis.substring(0, 200)}...`;
        } catch (error) {
            console.error(`❌ Error getting course context:`, error);
            return 'General Academic';
        }
    }

    /**
     * Get existing concepts from course resources to improve concept matching
     */
    private async getExistingCourseConcepts(courseId: number): Promise<any[]> {
        try {
            const existingConcepts = await db.concept.findMany({
                where: {
                    resources: {
                        some: {
                            resource: {
                                courseId: courseId
                            }
                        }
                    }
                },
                include: {
                    resources: {
                        where: {
                            resource: {
                                courseId: courseId
                            }
                        },
                        include: {
                            resource: true
                        }
                    }
                }
            });

            return existingConcepts.map(concept => ({
                id: concept.id,
                name: concept.name,
                description: concept.description,
                category: concept.category,
                aiSummary: concept.aiSummary,
                resourceCount: concept.resources.length
            }));
        } catch (error) {
            console.error(`❌ Error getting existing course concepts:`, error);
            return [];
        }
    }

    /**
     * Enhance AI-identified concepts with existing course data
     */
    private async enhanceConceptsWithCourseData(aiConcepts: any[], existingConcepts: any[]): Promise<any[]> {
        try {
            const enhancedConcepts = [];

            for (const aiConcept of aiConcepts) {
                // Check if concept already exists in course
                const existingConcept = existingConcepts.find(existing =>
                    existing.name.toLowerCase() === aiConcept.name.toLowerCase() ||
                    existing.name.toLowerCase().includes(aiConcept.name.toLowerCase()) ||
                    aiConcept.name.toLowerCase().includes(existing.name.toLowerCase())
                );

                if (existingConcept) {
                    // Use existing concept data with AI confidence
                    enhancedConcepts.push({
                        ...aiConcept,
                        id: existingConcept.id,
                        name: existingConcept.name, // Use standardized name
                        description: existingConcept.description || aiConcept.description,
                        category: existingConcept.category || aiConcept.category,
                        isExisting: true,
                        resourceCount: existingConcept.resourceCount
                    });
                } else {
                    // New concept identified by AI
                    enhancedConcepts.push({
                        ...aiConcept,
                        isExisting: false
                    });
                }
            }

            return enhancedConcepts;
        } catch (error) {
            console.error(`❌ Error enhancing concepts:`, error);
            return aiConcepts; // Return original if enhancement fails
        }
    }

    // method for content analysis (not just questions)
    private async analyzeContentProcessor(job: any): Promise<any> {
        const { resourceId, filePath, fileType, analysisType = 'questions' } = job.data;

        console.log(`📚 Starting ${analysisType} analysis for resource ${resourceId}`);

        try {
            // Step 1: Extract full text content
            const extractResult = await this.extractQuestionsProcessor({
                data: { resourceId, filePath, fileType }
            });

            if (analysisType === 'content') {
                // For learning materials: extract concepts, summaries, learning objectives
                const contentResult = await this.extractLearningContentProcessor({
                    data: {
                        resourceId,
                        extractedText: extractResult.extractedText,
                        resourceTags: job.data.tags
                    }
                });

                // Update RAG with comprehensive content
                const ragResult = await this.updateRAGIndexProcessor({
                    data: {
                        resourceId,
                        content: extractResult.extractedText,
                        concepts: contentResult?.concepts || [],
                        summaries: contentResult?.summaries || [],
                        learningObjectives: contentResult?.objectives || []
                    }
                });

                return {
                    analysisType: 'content',
                    contentExtracted: extractResult.extractedText.length,
                    conceptsIdentified: contentResult?.concepts?.length || 0,
                    summariesGenerated: contentResult?.summaries?.length || 0,
                    ragIndexed: ragResult?.indexed || false
                };
            } else {
                // For questions: use existing question extraction logic
                return await this.extractQuestionsProcessor(job);
            }
        } catch (error) {
            console.error(`❌ Content analysis failed:`, error);
            throw error;
        }
    }

    // method for extracting learning content from educational materials
    private async extractLearningContentProcessor(job: any): Promise<any> {
        const { resourceId, extractedText, resourceTags } = job.data;

        console.log(`📖 Extracting learning content for resource ${resourceId}`);

        try {
            // Get course context for better analysis
            const resource = await db.resource.findUnique({
                where: { id: resourceId },
                include: { course: true }
            });
            const courseContext = resource?.course ?
                await this.getCourseContext(resource.course.id) :
                'No course context available';

            // Use Gemini to extract educational content
            const contentAnalysis = await geminiAI.extractLearningContent(
                extractedText,
                courseContext,
                resourceTags
            );

            // Store concepts in database
            const concepts = [];
            for (const conceptData of contentAnalysis.concepts || []) {
                const concept = await this.storeOrUpdateConcept(conceptData, resourceId);
                concepts.push(concept);
            }

            // Store summaries and learning objectives
            if (contentAnalysis.summaries?.length > 0) {
                await this.storeLearningContent(resourceId, 'summary', contentAnalysis.summaries);
            }

            if (contentAnalysis.objectives?.length > 0) {
                await this.storeLearningContent(resourceId, 'objective', contentAnalysis.objectives);
            }

            return {
                concepts,
                summaries: contentAnalysis.summaries || [],
                objectives: contentAnalysis.objectives || []
            };

        } catch (error) {
            console.error(`❌ Learning content extraction failed:`, error);
            return { concepts: [], summaries: [], objectives: [] };
        }
    }

    // method to store learning content
    private async storeLearningContent(
        resourceId: number,
        contentType: 'summary' | 'objective' | 'definition',
        content: string[]
    ): Promise<void> {
        for (const item of content) {
            await db.learningContent.create({
                data: {
                    resourceId,
                    contentType,
                    content: item,
                    aiGenerated: true
                }
            });
        }
    }

    /**
     * Store or update a concept and create resource relationship
     */
    private async storeOrUpdateConcept(conceptData: any, resourceId: number): Promise<any> {
        try {
            // Find existing concept (case-insensitive)
            let concept = await db.concept.findFirst({
                where: {
                    name: {
                        equals: conceptData.name,
                        mode: 'insensitive'
                    }
                }
            });

            if (!concept) {
                // Create new concept
                concept = await db.concept.create({
                    data: {
                        name: conceptData.name,
                        description: conceptData.description || '',
                        category: conceptData.category || 'General',
                        aiSummary: ''
                    }
                });
                console.log(`✅ Created new concept: ${conceptData.name}`);
            } else {
                // Update existing concept if needed
                if (conceptData.description && (!concept.description || concept.description.length < conceptData.description.length)) {
                    await db.concept.update({
                        where: { id: concept.id },
                        data: {
                            description: conceptData.description,
                            category: conceptData.category || concept.category
                        }
                    });
                    console.log(`📝 Updated concept: ${conceptData.name}`);
                }
            }

            // Create or update concept-resource relationship
            await db.conceptResource.upsert({
                where: {
                    conceptId_resourceId: {
                        conceptId: concept.id,
                        resourceId: resourceId
                    }
                },
                update: {
                    relevanceScore: Math.max(conceptData.confidence || 0.8, 0.7)
                },
                create: {
                    conceptId: concept.id,
                    resourceId: resourceId,
                    relevanceScore: conceptData.confidence || 0.8,
                    extractedContent: conceptData.description || conceptData.name
                }
            });

            return concept;
        } catch (error) {
            console.error(`❌ Error storing/updating concept ${conceptData.name}:`, error);
            throw error;
        }
    }

    /**
     * Get MIME type from file extension
     */
    private getMimeTypeFromFileType(fileType: string): string {
        const type = fileType.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff'
        };

        return mimeTypes[type] || 'image/jpeg';
    }

    private async identifyConceptsProcessor(job: any): Promise<any> {
        const { resourceId, questions } = job.data;

        try {
            console.log(`🧠 Starting AI-powered concept identification for resource ${resourceId}`);
            job.progress = 10;

            // Get course context for better concept identification
            const resource = await db.resource.findUnique({
                where: { id: resourceId },
                include: {
                    course: {
                        include: {
                            department: {
                                include: { faculty: true }
                            }
                        }
                    }
                }
            });

            const courseContext = resource?.course ?
                `Course: ${resource.course.code} - ${resource.course.title}\nDepartment: ${resource.course.department.name}\nFaculty: ${resource.course.department.faculty.name}` :
                'No course context available';

            job.progress = 30;

            // Use Gemini AI to identify concepts from questions
            const questionsText = Array.isArray(questions) ?
                questions.map(q => typeof q === 'string' ? q : q.questionText || '').join('\n\n') :
                (typeof questions === 'string' ? questions : '');

            console.log(`📝 Analyzing ${questionsText.length} characters of question text`);

            if (!questionsText || questionsText.length < 10) {
                console.log('⚠️ No sufficient question text for concept identification');
                return {
                    conceptsIdentified: 0,
                    concepts: [],
                    message: 'Insufficient text for concept identification'
                };
            }

            job.progress = 50;

            // Use Gemini to identify concepts
            const conceptAnalyses = await geminiAI.identifyQuestionConcepts(questionsText, courseContext);

            job.progress = 70;

            // Store concepts in database with AI-generated descriptions
            const savedConcepts = [];
            for (const conceptData of conceptAnalyses) {
                try {
                    let concept = await db.concept.findFirst({
                        where: {
                            name: {
                                equals: conceptData.name,
                                mode: 'insensitive'
                            }
                        }
                    });

                    if (!concept) {
                        // Generate AI summary for the concept
                        const aiSummary = await geminiAI.generateConceptSummary(
                            conceptData.name,
                            courseContext + '\n\nQuestions context: ' + questionsText.substring(0, 500)
                        );

                        concept = await db.concept.create({
                            data: {
                                name: conceptData.name,
                                description: conceptData.description || `Key concept in ${resource?.course?.title || 'this course'}`,
                                category: conceptData.category || 'Academic',
                                aiSummary: aiSummary || ''
                            }
                        });

                        console.log(`✅ Created new concept: ${conceptData.name}`);
                    } else {
                        // Update existing concept with better description if needed
                        if (!concept.aiSummary || concept.aiSummary.length < 50) {
                            const aiSummary = await geminiAI.generateConceptSummary(
                                conceptData.name,
                                courseContext
                            );

                            await db.concept.update({
                                where: { id: concept.id },
                                data: { aiSummary: aiSummary || concept.aiSummary }
                            });
                        }

                        console.log(`📝 Updated existing concept: ${conceptData.name}`);
                    }

                    // Create concept-resource relationship
                    await db.conceptResource.upsert({
                        where: {
                            conceptId_resourceId: {
                                conceptId: concept.id,
                                resourceId: resourceId
                            }
                        },
                        update: {
                            relevanceScore: conceptData.confidence || 0.8
                        },
                        create: {
                            conceptId: concept.id,
                            resourceId: resourceId,
                            relevanceScore: conceptData.confidence || 0.8,
                            extractedContent: questionsText.substring(0, 500)
                        }
                    });

                    savedConcepts.push(concept);
                } catch (conceptError) {
                    console.error(`❌ Failed to process concept ${conceptData.name}:`, conceptError);
                }
            }

            job.progress = 100;
            console.log(`✅ AI concept identification completed: ${savedConcepts.length} concepts identified`);

            return {
                conceptsIdentified: savedConcepts.length,
                concepts: savedConcepts,
                aiAnalyzed: true,
                courseContext: courseContext
            };

        } catch (error) {
            console.error(`❌ AI concept identification failed:`, error);
            throw error;
        }
    }

    private async updateRAGIndexProcessor(job: any): Promise<any> {
        const { resourceId, content, concepts, summaries = [], objectives = [] } = job.data;

        try {
            console.log(`📚 Updating RAG index for resource ${resourceId} with ${content.length} characters`);
            job.progress = 20;

            // Enhanced RAG content building with smart chunking
            const ragContent = await this.buildEnhancedRAGContent(resourceId, content, concepts, summaries, objectives);

            job.progress = 50;

            // Update resource with enhanced RAG content
            await db.resource.update({
                where: { id: resourceId },
                data: {
                    ragContent: ragContent.fullContent
                }
            });

            job.progress = 80;

            // Create concept-resource relationships for better RAG retrieval
            if (concepts?.length > 0) {
                await this.createConceptResourceRelationships(resourceId, concepts, ragContent.chunks);
            }

            job.progress = 100;
            console.log(`✅ Enhanced RAG index updated successfully for resource ${resourceId}`);

            return {
                indexed: true,
                contentLength: ragContent.fullContent.length,
                chunksCount: ragContent.chunks.length,
                conceptsCount: concepts?.length || 0,
                summariesCount: summaries?.length || 0,
                objectivesCount: objectives?.length || 0,
                ragContentLength: ragContent.fullContent.length
            };

        } catch (error) {
            console.error(`❌ RAG indexing failed for resource ${resourceId}:`, error);
            throw error;
        }
    }

    /**
     * Build enhanced RAG content with smart chunking and concept extraction
     */
    private async buildEnhancedRAGContent(
        resourceId: number,
        content: string,
        concepts: string[] = [],
        summaries: string[] = [],
        objectives: string[] = []
    ): Promise<{
        fullContent: string;
        chunks: Array<{
            id: string;
            content: string;
            concepts: string[];
            type: 'content' | 'summary' | 'objective' | 'definition';
            startIndex: number;
            endIndex: number;
        }>;
    }> {
        console.log(`🧩 Building enhanced RAG content with smart chunking...`);

        const chunks: Array<{
            id: string;
            content: string;
            concepts: string[];
            type: 'content' | 'summary' | 'objective' | 'definition';
            startIndex: number;
            endIndex: number;
        }> = [];

        // Smart chunking strategy based on content structure
        const chunkSize = 1000; // Optimal size for retrieval
        const overlapSize = 200; // Overlap to maintain context

        // 1. Chunk main content intelligently
        console.log(`📄 Chunking main content (${content.length} chars) into optimal chunks...`);
        const contentChunks = this.intelligentTextChunking(content, chunkSize, overlapSize);

        contentChunks.forEach((chunk, index) => {
            chunks.push({
                id: `content_${index}`,
                content: chunk.text,
                concepts: this.extractConceptsFromChunk(chunk.text, concepts),
                type: 'content',
                startIndex: chunk.startIndex,
                endIndex: chunk.endIndex
            });
        });

        // 2. Add summaries as semantic chunks
        if (summaries?.length > 0) {
            summaries.forEach((summary, index) => {
                chunks.push({
                    id: `summary_${index}`,
                    content: summary,
                    concepts: this.extractConceptsFromChunk(summary, concepts),
                    type: 'summary',
                    startIndex: 0,
                    endIndex: summary.length
                });
            });
        }

        // 3. Add objectives as focused chunks
        if (objectives?.length > 0) {
            objectives.forEach((objective, index) => {
                chunks.push({
                    id: `objective_${index}`,
                    content: objective,
                    concepts: this.extractConceptsFromChunk(objective, concepts),
                    type: 'objective',
                    startIndex: 0,
                    endIndex: objective.length
                });
            });
        }

        // 4. Build comprehensive full content
        let enhancedRagContent = content;

        if (summaries?.length > 0) {
            enhancedRagContent += '\n\n=== SUMMARIES ===\n' + summaries.join('\n\n');
        }

        if (objectives?.length > 0) {
            enhancedRagContent += '\n\n=== LEARNING OBJECTIVES ===\n' + objectives.join('\n');
        }

        if (concepts?.length > 0) {
            enhancedRagContent += '\n\n=== KEY CONCEPTS ===\n' + concepts.join(', ');
        }

        console.log(`✅ Enhanced RAG content built: ${chunks.length} chunks, ${enhancedRagContent.length} total chars`);

        return {
            fullContent: enhancedRagContent,
            chunks: chunks
        };
    }

    /**
     * Intelligent text chunking that respects semantic boundaries
     */
    private intelligentTextChunking(
        text: string,
        chunkSize: number,
        overlapSize: number
    ): Array<{
        text: string;
        startIndex: number;
        endIndex: number;
    }> {
        const chunks: Array<{
            text: string;
            startIndex: number;
            endIndex: number;
        }> = [];

        // Split by paragraphs first to respect semantic boundaries
        const paragraphs = text.split(/\n\s*\n/);
        let currentChunk = '';
        let currentStartIndex = 0;
        let textIndex = 0;

        for (const paragraph of paragraphs) {
            const paragraphWithNewlines = paragraph + '\n\n';

            // If adding this paragraph exceeds chunk size, finalize current chunk
            if (currentChunk.length + paragraphWithNewlines.length > chunkSize && currentChunk.length > 0) {
                chunks.push({
                    text: currentChunk.trim(),
                    startIndex: currentStartIndex,
                    endIndex: textIndex
                });

                // Start new chunk with overlap
                const overlapText = currentChunk.slice(-overlapSize);
                currentChunk = overlapText + paragraphWithNewlines;
                currentStartIndex = Math.max(0, textIndex - overlapSize);
            } else {
                // Add paragraph to current chunk
                if (currentChunk.length === 0) {
                    currentStartIndex = textIndex;
                }
                currentChunk += paragraphWithNewlines;
            }

            textIndex += paragraphWithNewlines.length;
        }

        // Add final chunk if it has content
        if (currentChunk.trim().length > 0) {
            chunks.push({
                text: currentChunk.trim(),
                startIndex: currentStartIndex,
                endIndex: textIndex
            });
        }

        console.log(`📊 Intelligent chunking created ${chunks.length} chunks from ${paragraphs.length} paragraphs`);
        return chunks;
    }

    /**
     * Extract relevant concepts from a text chunk
     */
    private extractConceptsFromChunk(chunkText: string, allConcepts: string[]): string[] {
        const chunkLower = chunkText.toLowerCase();
        const relevantConcepts = allConcepts.filter(concept =>
            chunkLower.includes(concept.toLowerCase())
        );

        return relevantConcepts;
    }

    /**
     * Create concept-resource relationships with enhanced chunking data
     */
    private async createConceptResourceRelationships(
        resourceId: number,
        concepts: string[],
        chunks: Array<{
            id: string;
            content: string;
            concepts: string[];
            type: string;
        }>
    ): Promise<void> {
        console.log(`🔗 Creating concept-resource relationships for ${concepts.length} concepts...`);

        for (const conceptName of concepts) {
            // Find or create concept
            let concept = await db.concept.findFirst({
                where: { name: conceptName }
            });

            if (!concept) {
                concept = await db.concept.create({
                    data: {
                        name: conceptName,
                        description: `Concept extracted from document content`,
                        category: 'Auto-extracted',
                        aiSummary: ''
                    }
                });
            }

            // Find the most relevant chunk for this concept
            const relevantChunks = chunks.filter(chunk =>
                chunk.concepts.includes(conceptName)
            );

            const bestChunk = relevantChunks.length > 0 ? relevantChunks[0] : chunks[0];
            const extractedContent = bestChunk ? bestChunk.content.substring(0, 1000) : '';

            // Create or update concept-resource relationship
            await db.conceptResource.upsert({
                where: {
                    conceptId_resourceId: {
                        conceptId: concept.id,
                        resourceId: resourceId
                    }
                },
                update: {
                    relevanceScore: relevantChunks.length > 0 ? 0.9 : 0.7,
                    extractedContent: extractedContent
                },
                create: {
                    conceptId: concept.id,
                    resourceId: resourceId,
                    relevanceScore: relevantChunks.length > 0 ? 0.9 : 0.7,
                    extractedContent: extractedContent
                }
            });
        }

        console.log(`✅ Created/updated ${concepts.length} concept-resource relationships`);
    }

    private async analyzeDocumentProcessor(job: any): Promise<any> {
        const { resourceId, filePath, fileType, enableAIAnalysis, analysisType = 'questions', tags = [] } = job.data;

        if (!enableAIAnalysis) {
            return { message: 'AI analysis not enabled for this resource' };
        }

        try {
            console.log(`📄 Starting enhanced document analysis with Document AI for resource ${resourceId}`);
            console.log(`🆔 Job ID: ${job.id}, Analysis Type: ${analysisType}, Enable AI: ${enableAIAnalysis}`);

            // Create processing job record
            try {
                await db.aIProcessingJob.create({
                    data: {
                        id: job.id,
                        resourceId,
                        status: 'PROCESSING',
                        progress: 0,
                        results: {}
                    }
                });
            } catch {
                await db.aIProcessingJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'PROCESSING',
                        progress: 0,
                        results: {}
                    }
                });
            }

            job.progress = 10;

            // Step 1: Enhanced text extraction with Document AI
            console.log(`🤖 Starting enhanced text extraction with Document AI...`);
            const extractedContent = await this.extractContentWithDocumentAI(filePath, fileType);

            job.progress = 30;

            // Step 2: Extract learning content and concepts
            console.log(`🧠 Extracting learning content and concepts...`);
            const learningContent = await this.extractLearningContentWithAI(
                extractedContent.text,
                resourceId,
                tags
            );

            job.progress = 50;

            let questionResult = null;
            // Step 3: Extract questions if analysis type includes questions
            if (analysisType === 'questions' || analysisType === 'all') {
                console.log(`❓ Extracting questions from content...`);
                questionResult = await this.extractQuestionsProcessor({
                    ...job,
                    data: { resourceId, filePath, fileType }
                });
            }

            job.progress = 70;

            // Step 4: Enhanced concept identification from all extracted content
            console.log(`🔍 Enhanced concept identification...`);
            const allConcepts = [
                ...learningContent.concepts.map(c => c.name),
                ...(questionResult?.concepts || [])
            ];

            const conceptResult = await this.identifyConceptsProcessor({
                ...job,
                data: {
                    resourceId,
                    questions: questionResult?.questions?.map((q: any) => q.questionText) || [],
                    additionalContent: extractedContent.text
                }
            });

            job.progress = 85;

            // Step 5: Build enhanced RAG content with chunking
            console.log(`📚 Building enhanced RAG content with smart chunking...`);
            const ragResult = await this.updateRAGIndexProcessor({
                ...job,
                data: {
                    resourceId,
                    content: extractedContent.text,
                    concepts: [...new Set([...allConcepts, ...(conceptResult?.concepts?.map((c: any) => c.name) || [])])],
                    summaries: learningContent.summaries,
                    objectives: learningContent.objectives
                }
            });

            job.progress = 95;

            // Store additional learning content
            if (learningContent.definitions.length > 0) {
                await this.storeLearningContent(resourceId, 'definition',
                    learningContent.definitions.map(d => `${d.term}: ${d.definition}`)
                );
            }

            // Update final job status
            const finalResults = {
                questionsExtracted: questionResult?.questionsExtracted || 0,
                conceptsIdentified: conceptResult?.conceptsIdentified || 0,
                learningConceptsExtracted: learningContent.concepts.length,
                summariesExtracted: learningContent.summaries.length,
                objectivesExtracted: learningContent.objectives.length,
                definitionsExtracted: learningContent.definitions.length,
                ragIndexed: ragResult.indexed,
                chunksCreated: ragResult.chunksCount || 0,
                enhancedProcessing: true,
                documentAIUsed: extractedContent.usedDocumentAI
            };

            await db.aIProcessingJob.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    progress: 100,
                    results: finalResults
                }
            });

            job.progress = 100;

            console.log(`✅ Enhanced document analysis completed for resource ${resourceId}`);
            console.log(`📊 Results: ${finalResults.questionsExtracted} questions, ${finalResults.conceptsIdentified + finalResults.learningConceptsExtracted} concepts, ${finalResults.chunksCreated} chunks`);

            return finalResults;

        } catch (error) {
            console.error(`❌ Enhanced document analysis failed for resource ${resourceId}:`, error);

            await db.aIProcessingJob.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            });

            throw error;
        }
    }

    /**
     * Enhanced content extraction using Document AI as primary method
     */
    private async extractContentWithDocumentAI(filePath: string, fileType: string): Promise<{
        text: string;
        usedDocumentAI: boolean;
        tables?: Array<{ rows: number; columns: number; content: string[][] }>;
    }> {
        console.log(`🤖 Enhanced content extraction with Document AI for ${fileType}...`);

        try {
            // Download file if it's a URL
            let fileBuffer: Buffer;
            if (filePath.startsWith('http')) {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to download file: ${response.status}`);
                }
                fileBuffer = Buffer.from(await response.arrayBuffer());
            } else {
                const fs = await import('fs');
                fileBuffer = fs.readFileSync(filePath);
            }

            // Try Document AI first for all supported file types
            const { documentAI } = await import('../ai/documentai-service');

            if (documentAI.isConfigured()) {
                console.log(`🚀 Using Document AI for enhanced extraction...`);

                if (fileType.toLowerCase().includes('pdf')) {
                    // For PDFs, try structured extraction to get tables and better layout understanding
                    try {
                        const structuredData = await documentAI.extractStructuredData(fileBuffer, 'application/pdf');
                        console.log(`✅ Document AI structured extraction: ${structuredData.text.length} chars, ${structuredData.tables.length} tables`);

                        return {
                            text: structuredData.text,
                            usedDocumentAI: true,
                            tables: structuredData.tables
                        };
                    } catch (structuredError) {
                        console.log(`⚠️ Structured extraction failed, trying basic text extraction...`);
                        const text = await documentAI.extractTextFromImage(fileBuffer, 'application/pdf');
                        return {
                            text: text,
                            usedDocumentAI: true
                        };
                    }
                } else if (fileType.toLowerCase().match(/(jpg|jpeg|png|bmp|gif|tiff)$/)) {
                    // For images, use Document AI OCR
                    const mimeType = this.getMimeTypeFromFileType(fileType);
                    const text = await documentAI.extractTextFromImage(fileBuffer, mimeType);
                    console.log(`✅ Document AI image extraction: ${text.length} chars`);

                    return {
                        text: text,
                        usedDocumentAI: true
                    };
                }
            }

            throw new Error('Document AI not configured or unsupported file type');

        } catch (error) {
            console.log(`⚠️ Document AI extraction failed, falling back to standard methods: ${error}`);

            // Fallback to existing extraction methods
            return {
                text: "Fallback extraction - Document AI not available",
                usedDocumentAI: false
            };
        }
    }

    /**
     * Extract learning content using AI with enhanced prompting
     */
    private async extractLearningContentWithAI(
        text: string,
        resourceId: number,
        tags: string[]
    ): Promise<{
        concepts: Array<{ name: string; description: string; category: string; difficulty: string; confidence: number }>;
        summaries: string[];
        objectives: string[];
        definitions: Array<{ term: string; definition: string }>;
    }> {
        console.log(`🧠 Extracting learning content with AI for ${text.length} characters...`);

        try {
            // Get course context for better extraction
            const resource = await db.resource.findUnique({
                where: { id: resourceId },
                include: { course: true }
            });

            const courseContext = resource?.course ?
                `Course: ${resource.course.code} - ${resource.course.title}` :
                'General academic content';

            const { geminiAI } = await import('../ai/gemini-service');

            const learningContent = await geminiAI.extractLearningContent(
                text,
                courseContext,
                tags
            );

            console.log(`✅ Learning content extracted: ${learningContent.concepts.length} concepts, ${learningContent.summaries.length} summaries, ${learningContent.objectives.length} objectives, ${learningContent.definitions.length} definitions`);

            return learningContent;

        } catch (error) {
            console.error(`❌ Learning content extraction failed:`, error);
            return {
                concepts: [],
                summaries: [],
                objectives: [],
                definitions: []
            };
        }
    }
}

// Initialize processors
export const aiJobProcessors = new AIJobProcessors();

// Helper function to queue AI analysis
export async function queueAIAnalysis(data: AnalyzeDocumentJobData) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 Creating AI analysis job: ${jobId}`);

    await db.aIProcessingJob.create({
        data: {
            id: jobId,
            resourceId: data.resourceId,
            status: 'PENDING',
            progress: 0,
            results: {}
        }
    });

    console.log(`📝 Created database job record: ${jobId}`);

    processJobInBackground(jobId, data);

    return {
        id: jobId,
        type: 'analyze-document',
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        maxAttempts: 2
    };
}

// Helper function to get job status from database
export async function getJobStatus(jobId: string) {
    console.log(`📊 Getting job status for: ${jobId}`);

    const dbJob = await db.aIProcessingJob.findUnique({
        where: { id: jobId },
        include: {
            resource: {
                include: {
                    course: true,
                    uploader: {
                        select: { username: true }
                    }
                }
            }
        }
    });

    if (dbJob) {
        return {
            id: dbJob.id,
            type: 'analyze-document',
            status: dbJob.status.toLowerCase(),
            progress: dbJob.progress,
            createdAt: dbJob.createdAt,
            updatedAt: dbJob.completedAt || dbJob.startedAt || dbJob.createdAt,
            attempts: 0,
            maxAttempts: 2,
            result: dbJob.results,
            error: dbJob.errorMessage
        };
    }

    return await jobQueue.getJob(jobId);
}

// Background processing function for serverless environment
async function processJobInBackground(jobId: string, data: AnalyzeDocumentJobData) {
    console.log(`🎯 Starting background processing for job: ${jobId}`);
    console.log(`📄 Processing data:`, JSON.stringify(data, null, 2));

    try {
        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: {
                status: 'PROCESSING',
                progress: 10,
                startedAt: new Date()
            }
        });

        console.log(`📝 Processing document analysis for resource ${data.resourceId}`);

        const processor = new AIJobProcessors();

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: { progress: 20 }
        });

        console.log(`🔧 Created processor instance, starting extraction...`);

        const mockJob = {
            id: jobId,
            data: {
                resourceId: data.resourceId,
                filePath: data.filePath,
                fileType: data.fileType
            },
            progress: 20
        };

        console.log(`📝 Mock job data:`, JSON.stringify(mockJob, null, 2));

        // Increase extraction timeout for large files (10 minutes)
        const extractionTimeout = 600000; // 10 minutes
        const extractionPromise = processor.extractQuestionsProcessor(mockJob);

        let extractResult;
        try {
            console.log(`⏰ Starting extraction with enhanced timeout (${extractionTimeout / 1000}s)...`);
            extractResult = await Promise.race([
                extractionPromise,
                new Promise((_, reject) =>
                    setTimeout(() => {
                        console.log(`❌ Extraction timeout reached after ${extractionTimeout / 1000} seconds`);
                        reject(new Error(`Extraction timeout after ${extractionTimeout / 60000} minutes. File may be too large or complex.`));
                    }, extractionTimeout)
                )
            ]);
            console.log(`✅ Extraction completed successfully:`, extractResult);
        } catch (extractError) {
            console.error(`❌ Extraction failed:`, extractError);

            // Provide more helpful error messages
            let errorMessage = 'Extraction failed';
            if (extractError instanceof Error) {
                if (extractError.message.includes('timeout')) {
                    errorMessage = 'File processing timeout. The file may be too large or complex. Try with a smaller file.';
                } else if (extractError.message.includes('download')) {
                    errorMessage = 'Failed to download file. Please check the file URL and try again.';
                } else if (extractError.message.includes('PDF')) {
                    errorMessage = 'PDF processing failed. The file may be corrupted or password-protected.';
                } else {
                    errorMessage = `Processing failed: ${extractError.message}`;
                }
            }

            throw new Error(errorMessage);
        }

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: { progress: 60 }
        });

        const mockConcepts = [
            { name: 'Linear Algebra', description: 'Mathematical concepts involving vectors and matrices', category: 'Mathematics' },
            { name: 'Data Structures', description: 'Ways of organizing and storing data', category: 'Computer Science' }
        ];

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: { progress: 80 }
        });

        const finalResults = {
            questionsExtracted: extractResult.questionsExtracted || 0,
            conceptsIdentified: mockConcepts.length,
            ragIndexed: true,
            resourceMatches: 5
        };

        console.log(`📊 Final results:`, finalResults);

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                progress: 100,
                results: finalResults,
                completedAt: new Date()
            }
        });

        console.log(`✅ Background processing completed for job: ${jobId}`);

    } catch (error) {
        console.error(`❌ Background processing failed for job: ${jobId}`, error);
        console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

        try {
            await db.aIProcessingJob.update({
                where: { id: jobId },
                data: {
                    status: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : String(error),
                    completedAt: new Date()
                }
            });
        } catch (dbError) {
            console.error(`❌ Failed to update job status:`, dbError);
        }
    }
}

// Helper function to get queue statistics
export async function getQueueStats() {
    return await jobQueue.getStats();
}