import { jobQueue, JOB_TYPES } from './jobQueue';
import { Job } from 'bull';
import { db } from '@/lib/dbconfig';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window === 'undefined') {
    // Server-side configuration
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

    /**
     * Initialize all job processors
     */
    init(): void {
        console.log('🔧 Initializing AI Job Processors...');

        jobQueue.process(JOB_TYPES.EXTRACT_QUESTIONS, this.extractQuestionsProcessor.bind(this));
        jobQueue.process(JOB_TYPES.IDENTIFY_CONCEPTS, this.identifyConceptsProcessor.bind(this));
        jobQueue.process(JOB_TYPES.UPDATE_RAG_INDEX, this.updateRAGIndexProcessor.bind(this));
        jobQueue.process(JOB_TYPES.ANALYZE_DOCUMENT, this.analyzeDocumentProcessor.bind(this));

        console.log('✅ AI Job Processors initialized successfully');
        console.log('📋 Registered processors:', Object.values(JOB_TYPES));
    }

    /**
     * Extract questions from uploaded documents
     */
    public async extractQuestionsProcessor(job: any): Promise<any> {
        const { resourceId, filePath, fileType } = job.data;
        const path = require('path');
        const fs = require('fs');
        let Tesseract;
        try {
            Tesseract = require('tesseract.js');
        } catch (e) {
            // tesseract.js not installed
        }

        try {
            console.log(`🔍 Starting question extraction for resource ${resourceId}`);
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

            // Handle both local files and URLs (like Cloudinary)
            if (filePath.startsWith('http')) {
                // Download file from URL
                console.log(`📥 Downloading file from URL: ${filePath}`);
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to download file: ${response.statusText}`);
                }
                fileBuffer = Buffer.from(await response.arrayBuffer());
            } else {
                // Read local file
                fileBuffer = fs.readFileSync(filePath);
            }

            // 1. Extract text from PDF or image
            if (fileType.toLowerCase().includes('pdf')) {
                // PDF extraction
                job.progress = 20;
                const data = new Uint8Array(fileBuffer);
                const pdf = await pdfjsLib.getDocument({ data }).promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ') + '\n';
                }
                extractedText = text;
            } else if (fileType.toLowerCase().match(/(jpg|jpeg|png|bmp|gif|tiff)$/)) {
                // Image extraction (OCR)
                if (!Tesseract) throw new Error('tesseract.js is not installed. Please run: npm install tesseract.js');
                job.progress = 20;
                const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
                extractedText = text;
            } else {
                throw new Error('Unsupported file type for question extraction.');
            }

            console.log(`📄 Extracted text length: ${extractedText.length} characters`);
            job.progress = 40;

            // 2. Extract questions using regex (e.g., lines starting with number or Q)
            const questionRegex = /^(?:Q\.?|Question)?\s*(\d{1,2})[\).\-:]?\s+([\s\S]+?)(?=\n(?:Q\.?|Question)?\s*\d{1,2}[\).\-:]?|$)/gim;
            const questions: any[] = [];
            let match;
            let qNum = 1;
            while ((match = questionRegex.exec(extractedText)) !== null) {
                questions.push({
                    questionText: match[2].trim(),
                    questionNumber: match[1] || String(qNum),
                    marks: 0,
                    difficulty: 'MEDIUM'
                });
                qNum++;
            }
            // Fallback: If no matches, split by lines and treat each as a question
            if (questions.length === 0) {
                extractedText.split('\n').forEach((line: string, idx: number) => {
                    if (line.trim().length > 20) {
                        questions.push({
                            questionText: line.trim(),
                            questionNumber: String(idx + 1),
                            marks: 0,
                            difficulty: 'MEDIUM'
                        });
                    }
                });
            }

            job.progress = 60;

            // 3. Store extracted questions in database
            const savedQuestions = await Promise.all(
                questions.map(async (questionData) => {
                    return await db.extractedQuestion.create({
                        data: {
                            resourceId,
                            questionText: questionData.questionText,
                            questionNumber: questionData.questionNumber,
                            marks: questionData.marks,
                            difficulty: questionData.difficulty as any,
                            aiAnalysis: {}
                        }
                    });
                })
            );

            job.progress = 80;

            // 4. Update resource status
            await db.resource.update({
                where: { id: resourceId },
                data: {
                    aiProcessingStatus: 'COMPLETED',
                    isPastQuestion: true
                }
            });

            job.progress = 100;
            console.log(`Question extraction completed for resource ${resourceId}`);

            return {
                questionsExtracted: savedQuestions.length,
                questions: savedQuestions,
                extractedText
            };

        } catch (error) {
            console.error(`Error in question extraction for resource ${resourceId}:`, error);
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
     * Identify concepts from extracted questions
     */
    private async identifyConceptsProcessor(job: any): Promise<any> {
        const { questions: _questions } = job.data;

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
                    // Create or find existing concept
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

    /**
     * Update RAG knowledge base index
     */
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
                    ragContent: content.substring(0, 2000) // Store preview
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

    /**
     * Complete document analysis workflow
     */
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
                // Job might already exist, update it
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

            // Step 2: Identify concepts (if questions were found)
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
                resourceMatches: 5 // Mock value
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

            // Update job status on error
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
    // In serverless environment, we'll store the job in database and process immediately
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 Creating AI analysis job: ${jobId}`);

    // Create database record
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

    // For serverless deployment, we'll process the job immediately in background
    // This avoids the issue of job being lost when the instance shuts down
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

    // Try to get from database first
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
            updatedAt: dbJob.completedAt || dbJob.startedAt || dbJob.createdAt, // Use completion/start time as update time
            attempts: 0,
            maxAttempts: 2,
            result: dbJob.results,
            error: dbJob.errorMessage
        };
    }

    // Fallback to in-memory queue
    return await jobQueue.getJob(jobId);
}

// Background processing function for serverless environment
async function processJobInBackground(jobId: string, data: AnalyzeDocumentJobData) {
    console.log(`🎯 Starting background processing for job: ${jobId}`);

    try {
        // Update status to processing
        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: {
                status: 'PROCESSING',
                progress: 10,
                startedAt: new Date()
            }
        });

        console.log(`📝 Processing document analysis for resource ${data.resourceId}`);

        // Create an AI processor instance to use the real extraction logic
        const processor = new AIJobProcessors();

        // Create a mock job object for the processor
        const mockJob = {
            id: jobId,
            data: {
                resourceId: data.resourceId,
                filePath: data.filePath,
                fileType: data.fileType
            },
            progress: 10
        };

        // Use the real extraction processor instead of mock data
        const extractResult = await processor.extractQuestionsProcessor(mockJob);

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: { progress: 60 }
        });

        // Use real concept identification (when implemented)
        // For now, still using mock concepts but will be replaced with real AI later
        const mockConcepts = [
            { name: 'Linear Algebra', description: 'Mathematical concepts involving vectors and matrices', category: 'Mathematics' },
            { name: 'Data Structures', description: 'Ways of organizing and storing data', category: 'Computer Science' }
        ];

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: { progress: 80 }
        });

        // The resource status is already updated by the extractQuestionsProcessor
        // Complete the job
        const finalResults = {
            questionsExtracted: extractResult.questionsExtracted,
            conceptsIdentified: mockConcepts.length,
            ragIndexed: true,
            resourceMatches: 5
        };

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

        await db.aIProcessingJob.update({
            where: { id: jobId },
            data: {
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : String(error),
                completedAt: new Date()
            }
        });
    }
}

// Helper function to get queue statistics
export async function getQueueStats() {
    return await jobQueue.getStats();
}