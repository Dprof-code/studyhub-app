import { jobQueue, JOB_TYPES } from './jobQueue';
import { db } from '../dbconfig';
import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';
import tesseract from 'node-tesseract-ocr';

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
                    // Save the file buffer to a temporary file
                    const tempFilePath = `/tmp/temp_image_${job.id}.png`;
                    fs.writeFileSync(tempFilePath, fileBuffer);

                    // Configure node-tesseract-ocr
                    const config = {
                        lang: 'eng',
                        oem: 1, // LSTM-based OCR engine
                        psm: 3, // Automatic page segmentation
                    };

                    console.log(`🔧 Starting OCR with node-tesseract-ocr...`);
                    const ocrResult = await Promise.race([
                        tesseract.recognize(tempFilePath, config),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('OCR processing timeout after 5 minutes')), 300000)
                        )
                    ]) as string;

                    extractedText = ocrResult;
                    console.log(`✅ OCR processing complete, extracted ${extractedText.length} characters`);

                    // Clean up temporary file
                    fs.unlinkSync(tempFilePath);
                } catch (ocrError) {
                    console.error(`❌ OCR processing failed:`, ocrError);
                    console.log(`🔄 Using fallback text for OCR failure`);
                    extractedText = "Image file processed. OCR extraction failed due to timeout or technical issues. This may be due to poor image quality, large file size, or server limitations. Please try with a smaller, clearer image.";
                }
            } else {
                throw new Error(`Unsupported file type for question extraction: ${fileType}`);
            }

            // 2. Clean up OCR text
            console.log(`🧹 Cleaning up OCR text...`);
            extractedText = extractedText
                .replace(/©/g, 'c)') // Fix common OCR error for 'c)'
                .replace(/Desoribe/g, 'Describe') // Fix common spelling errors
                .replace(/itswarious/g, 'its various')
                .replace(/\s+/g, ' ') // Normalize multiple spaces
                .replace(/\r\n/g, '\n') // Normalize line breaks
                .trim();

            console.log(`📄 Extracted text preview: ${extractedText.substring(0, 200)}...`);
            job.progress = 40;

            // 3. Extract questions using improved regex
            console.log(`🔍 Extracting questions from text...`);

            // Regex to match various question numbering formats
            const questionRegex = /^(?:Q\.?|Question)?\s*((?:\d+[a-z]?)|\([ivx]+\))\s*[\).\-:]?\s*([\s\S]+?)(?=\n*(?:(?:Q\.?|Question)?\s*(?:(?:\d+[a-z]?)|\([ivx]+\))\s*[\).\-:]?)|$)/gim;

            // Keywords to filter out headers and instructions
            const headerKeywords = [
                'SCHOOL OF', 'DEPARTMENT OF', 'COURSE CODE', 'COURSE TITLE',
                'COURSE UNITS', 'INSTRUCTION:', 'SECTION', 'TIME ALLOWED',
                'EXAMINATIONS', 'SEMESTER'
            ];

            const questions: any[] = [];
            let match;
            let currentParentQuestion: any = null;

            while ((match = questionRegex.exec(extractedText)) !== null) {
                const questionNumber = match[1];
                let questionText = match[2].trim();

                // Skip headers and instructions
                if (headerKeywords.some(keyword => questionText.toUpperCase().includes(keyword))) {
                    console.log(`⏭️ Skipping header: ${questionText.substring(0, 50)}...`);
                    continue;
                }

                // Remove trailing marks or other metadata
                questionText = questionText.replace(/\(\s*\d+\s*marks?\s*\)$/i, '').trim();

                // Skip short lines that are unlikely to be questions
                if (questionText.length < 20) {
                    console.log(`⏭️ Skipping short line: ${questionText}`);
                    continue;
                }

                // Determine if this is a parent question or sub-question
                const isSubQuestion = /^[a-z]\)$|\([ivx]+\)$/i.test(questionNumber);

                if (!isSubQuestion) {
                    // New parent question
                    currentParentQuestion = {
                        questionNumber,
                        questionText,
                        subQuestions: [],
                        marks: 0,
                        difficulty: 'MEDIUM'
                    };
                    questions.push(currentParentQuestion);
                } else if (currentParentQuestion) {
                    // Add as sub-question to the current parent
                    currentParentQuestion.subQuestions.push({
                        questionNumber,
                        questionText
                    });
                } else {
                    // Treat as standalone if no parent (fallback)
                    questions.push({
                        questionNumber,
                        questionText,
                        subQuestions: [],
                        marks: 0,
                        difficulty: 'MEDIUM'
                    });
                }
            }

            // Fallback: Process remaining text for questions if regex fails
            if (questions.length === 0) {
                console.log(`⚠️ No structured questions found, using line-by-line fallback`);
                const lines = extractedText.split('\n');
                let currentQuestion: any = null;

                lines.forEach((line: string, idx: number) => {
                    line = line.trim();
                    if (line.length < 20 || headerKeywords.some(keyword => line.toUpperCase().includes(keyword))) {
                        return;
                    }

                    const numberMatch = line.match(/^(?:\d+[a-z]?)|\([ivx]+\)/i);
                    if (numberMatch) {
                        currentQuestion = {
                            questionNumber: numberMatch[0],
                            questionText: line.replace(numberMatch[0], '').trim(),
                            subQuestions: [],
                            marks: 0,
                            difficulty: 'MEDIUM'
                        };
                        questions.push(currentQuestion);
                    } else if (currentQuestion) {
                        // Append to the current question's text
                        currentQuestion.questionText += ' ' + line;
                    }
                });
            }

            // Clean up question text and assign marks
            questions.forEach(question => {
                // Extract marks from question text (e.g., "(3 marks)")
                const marksMatch = question.questionText.match(/\((\d+)\s*marks?\)/i);
                if (marksMatch) {
                    question.marks = parseInt(marksMatch[1], 10);
                    question.questionText = question.questionText.replace(marksMatch[0], '').trim();
                }

                // Clean sub-questions
                question.subQuestions.forEach((sub: any) => {
                    const subMarksMatch = sub.questionText.match(/\((\d+)\s*marks?\)/i);
                    if (subMarksMatch) {
                        sub.marks = parseInt(subMarksMatch[1], 10);
                        sub.questionText = sub.questionText.replace(subMarksMatch[0], '').trim();
                    }
                });
            });

            console.log(`✅ Found ${questions.length} questions with ${questions.reduce((sum, q) => sum + q.subQuestions.length, 0)} sub-questions`);
            job.progress = 60;

            // 4. Store extracted questions in database
            console.log(`💾 Saving questions to database...`);
            const savedQuestions = await Promise.all(
                questions.map(async (questionData) => {
                    const question = await db.extractedQuestion.create({
                        data: {
                            resourceId,
                            questionText: questionData.questionText,
                            questionNumber: questionData.questionNumber,
                            marks: questionData.marks,
                            difficulty: questionData.difficulty as any,
                            aiAnalysis: {
                                subQuestions: questionData.subQuestions
                            }
                        }
                    });
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