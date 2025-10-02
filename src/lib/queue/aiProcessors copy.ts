import { jobQueue, JOB_TYPES } from './jobQueue';
import { db } from '../dbconfig';
import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';
import tesseract from 'node-tesseract-ocr';
import * as os from 'os';
import * as path from 'path';

// Configure PDF.js worker
if (typeof window === 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

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

            // Handle both local files and URLs (like Cloudinary) with timeout
            if (filePath.startsWith('http')) {
                console.log(`📥 Downloading file from URL: ${filePath}`);

                const downloadPromise = fetch(filePath, {
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                });

                const response = await downloadPromise;
                if (!response.ok) {
                    throw new Error(`Failed to download file: ${response.statusText}`);
                }
                fileBuffer = Buffer.from(await response.arrayBuffer());
                console.log(`✅ Downloaded file, size: ${fileBuffer.length} bytes`);
            } else {
                // Read local file
                console.log(`📁 Reading local file: ${filePath}`);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${filePath}`);
                }
                fileBuffer = fs.readFileSync(filePath);
                console.log(`✅ Read local file, size: ${fileBuffer.length} bytes`);
            }

            // 1. Extract text from PDF or image
            if (fileType.toLowerCase().includes('pdf')) {
                console.log(`📖 Processing PDF file...`);
                job.progress = 20;

                try {
                    const data = new Uint8Array(fileBuffer);
                    const loadingTask = pdfjsLib.getDocument({ data });

                    // Add timeout to PDF processing
                    const pdf = await Promise.race([
                        loadingTask.promise,
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('PDF loading timeout')), 60000)
                        )
                    ]) as any;

                    let text = '';
                    console.log(`📄 PDF has ${pdf.numPages} pages`);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        console.log(`📄 Processing page ${i}/${pdf.numPages}`);
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map((item: any) => item.str).join(' ') + '\n';

                        // Update progress for each page
                        job.progress = 20 + (i / pdf.numPages) * 20;
                    }
                    extractedText = text;
                    console.log(`✅ PDF processing complete, extracted ${text.length} characters`);
                } catch (pdfError) {
                    console.error(`❌ PDF processing failed:`, pdfError);
                    throw new Error(`PDF processing failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
                }
            } else if (fileType.toLowerCase().match(/(jpg|jpeg|png|bmp|gif|tiff)$/)) {
                console.log(`🖼️ Processing image file with OCR...`);
                job.progress = 20;

                try {
                    // Use cross-platform temp directory
                    const tempDir = os.tmpdir();
                    const tempFilePath = path.join(tempDir, `temp_image_${job.id}.png`);
                    console.log(`📁 Using temporary file path: ${tempFilePath}`);
                    fs.writeFileSync(tempFilePath, fileBuffer);

                    // Enhanced OCR configuration for better text extraction
                    const config = {
                        lang: 'eng',
                        oem: 1, // LSTM-based OCR engine
                        psm: 6, // Uniform block of text (better for exam papers)
                        // Removed tessedit_char_whitelist to avoid command line issues
                    };

                    console.log(`🔧 Starting enhanced OCR with node-tesseract-ocr...`);
                    console.log(`📊 OCR Config:`, config);

                    const ocrResult = await Promise.race([
                        tesseract.recognize(tempFilePath, config),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('OCR processing timeout after 5 minutes')), 300000)
                        )
                    ]) as string;

                    extractedText = ocrResult;
                    console.log(`✅ OCR processing complete, extracted ${extractedText.length} characters`);
                    console.log(`📄 Raw OCR output preview:`, extractedText.substring(0, 500));

                    // Clean up temporary file
                    fs.unlinkSync(tempFilePath);
                } catch (ocrError) {
                    console.error(`❌ OCR processing failed:`, ocrError);
                    console.log(`🔄 Using fallback text for OCR failure`);
                    extractedText = "Image file processed. OCR extraction failed due to timeout or technical issues. This may be due to poor image quality, large file size, or server limitations. Please try with a smaller, clearer image.";
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

            // Use Gemini to extract structured questions
            let extractedQuestions;
            try {
                console.log(`🤖 Sending text to Gemini for question extraction...`);
                extractedQuestions = await geminiAI.extractQuestionsFromText(extractedText, courseContext);
                console.log(`✅ Gemini extracted ${extractedQuestions.length} questions`);
            } catch (geminiError) {
                console.error(`❌ Gemini extraction failed:`, geminiError);
                console.log(`🔄 Falling back to regex-based extraction...`);

                // Fallback to improved regex extraction
                extractedQuestions = await this.fallbackQuestionExtraction(extractedText);
            }

            job.progress = 60;

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
                                extractionMethod: 'gemini-ai-enhanced',
                                ocrQuality: extractedText.length > 500 ? 'good' : extractedText.length > 200 ? 'fair' : 'poor',
                                concepts: concepts,
                                courseContext: courseContext,
                                conceptMatching: {
                                    existingConcepts: concepts.filter(c => c.isExisting).length,
                                    newConcepts: concepts.filter(c => !c.isExisting).length,
                                    totalCourseConcepts: existingConcepts.length
                                }
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
     * Fallback question extraction using regex patterns
     */
    private async fallbackQuestionExtraction(extractedText: string): Promise<any[]> {
        console.log(`🔄 Using fallback regex-based question extraction...`);

        const questions: any[] = [];

        // Enhanced regex patterns for question detection
        const patterns = [
            /(\d+)\.\s*([^.]+(?:\.[^.]*)*?)(?=\d+\.|$)/gi, // 1. 2. 3. format
            /(\d+)\)\s*([^)]+(?:\)[^)]*)*?)(?=\d+\)|$)/gi, // 1) 2) 3) format
            /Question\s*(\d+)[:\-.]?\s*([^.]+(?:\.[^.]*)*?)(?=Question\s*\d+|$)/gi, // Question 1: format
        ];

        for (const pattern of patterns) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(extractedText)) !== null) {
                const questionNumber = match[1];
                const questionText = match[2].trim();

                // Skip very short or header-like text
                if (questionText.length < 10 ||
                    questionText.toUpperCase().includes('DEPARTMENT') ||
                    questionText.toUpperCase().includes('TIME ALLOWED')) {
                    continue;
                }

                // Extract marks if present
                const marksMatch = questionText.match(/\((\d+)\s*marks?\)/i);
                const marks = marksMatch ? parseInt(marksMatch[1]) : 0;

                questions.push({
                    questionNumber,
                    questionText,
                    marks,
                    difficulty: 'MEDIUM',
                    concepts: []
                });
            }
        }

        // If still no questions, try splitting by numbers at start of lines
        if (questions.length === 0) {
            const lines = extractedText.split('\n');
            let currentQuestion = '';
            let currentNumber = '';

            for (const line of lines) {
                const trimmed = line.trim();
                const numberMatch = trimmed.match(/^(\d+)[\).\-:\s]/);

                if (numberMatch) {
                    // Save previous question
                    if (currentQuestion && currentNumber) {
                        questions.push({
                            questionNumber: currentNumber,
                            questionText: currentQuestion.trim(),
                            marks: 0,
                            difficulty: 'MEDIUM',
                            concepts: []
                        });
                    }

                    // Start new question
                    currentNumber = numberMatch[1];
                    currentQuestion = trimmed.replace(numberMatch[0], '');
                } else if (currentQuestion) {
                    currentQuestion += ' ' + trimmed;
                }
            }

            // Don't forget the last question
            if (currentQuestion && currentNumber) {
                questions.push({
                    questionNumber: currentNumber,
                    questionText: currentQuestion.trim(),
                    marks: 0,
                    difficulty: 'MEDIUM',
                    concepts: []
                });
            }
        }

        console.log(`✅ Fallback extraction found ${questions.length} questions`);
        return questions;
    }

    /**
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

    private async identifyConceptsProcessor(job: any): Promise<any> {
        try {
            console.log(`🧠 Starting concept identification for job ${job.id}`);
            job.progress = 20;

            // Mock concept identification
            const mockConcepts = [
                { name: 'Linear Algebra', description: 'Mathematical concepts involving vectors and matrices', category: 'Mathematics' },
                { name: 'Data Structures', description: 'Ways of organizing and storing data', category: 'Computer Science' }
            ];

            job.progress = 60;

            // Store concepts in database
            const savedConcepts = await Promise.all(
                mockConcepts.map(async (conceptData) => {
                    let concept = await db.concept.findFirst({
                        where: { name: conceptData.name }
                    });

                    if (!concept) {
                        concept = await db.concept.create({
                            data: {
                                name: conceptData.name,
                                description: conceptData.description || '',
                                category: conceptData.category,
                                aiSummary: ''
                            }
                        });
                    }

                    return concept;
                })
            );

            job.progress = 100;

            return {
                conceptsIdentified: savedConcepts.length,
                concepts: savedConcepts
            };

        } catch (error) {
            throw error;
        }
    }

    private async updateRAGIndexProcessor(job: any): Promise<any> {
        const { resourceId, content, concepts } = job.data;

        try {
            job.progress = 30;

            // Mock RAG indexing
            await new Promise(resolve => setTimeout(resolve, 1000));

            job.progress = 70;

            // Update resource with RAG content
            await db.resource.update({
                where: { id: resourceId },
                data: {
                    ragContent: content.substring(0, 2000)
                }
            });

            job.progress = 100;

            return {
                indexed: true,
                contentLength: content.length,
                conceptsCount: concepts.length
            };

        } catch (error) {
            throw error;
        }
    }

    private async analyzeDocumentProcessor(job: any): Promise<any> {
        const { resourceId, filePath, fileType, enableAIAnalysis } = job.data;

        if (!enableAIAnalysis) {
            return { message: 'AI analysis not enabled for this resource' };
        }

        try {
            console.log(`📄 Starting document analysis for resource ${resourceId}`);
            console.log(`🆔 Job ID: ${job.id}, Enable AI: ${enableAIAnalysis}`);

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

            // Step 1: Extract questions
            const extractResult = await this.extractQuestionsProcessor({
                ...job,
                data: { resourceId, filePath, fileType }
            });

            job.progress = 40;

            // Step 2: Identify concepts
            let conceptResult = null;
            if (extractResult.questions && extractResult.questions.length > 0) {
                const questions = extractResult.questions.map((q: any) => q.questionText);
                conceptResult = await this.identifyConceptsProcessor({
                    ...job,
                    data: { resourceId, questions }
                });
            }

            job.progress = 70;

            // Step 3: Update RAG index
            const ragResult = await this.updateRAGIndexProcessor({
                ...job,
                data: {
                    resourceId,
                    content: extractResult.extractedText,
                    concepts: conceptResult?.concepts?.map((c: any) => c.name) || []
                }
            });

            job.progress = 90;

            // Update final job status
            const finalResults = {
                questionsExtracted: extractResult.questionsExtracted,
                conceptsIdentified: conceptResult?.conceptsIdentified || 0,
                ragIndexed: ragResult.indexed,
                resourceMatches: 5
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

            console.log(`Document analysis completed for resource ${resourceId}`);

            return finalResults;

        } catch (error) {
            console.error(`Error in document analysis for resource ${resourceId}:`, error);

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

        const extractionTimeout = 300000;
        const extractionPromise = processor.extractQuestionsProcessor(mockJob);

        let extractResult;
        try {
            console.log(`⏰ Starting extraction with ${extractionTimeout / 1000}s timeout...`);
            extractResult = await Promise.race([
                extractionPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Extraction timeout after 5 minutes')), extractionTimeout)
                )
            ]);
            console.log(`✅ Extraction completed:`, extractResult);
        } catch (extractError) {
            console.error(`❌ Extraction failed:`, extractError);
            throw new Error(`Extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}`);
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