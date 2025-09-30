import { jobQueue, JOB_TYPES } from './jobQueue';
import { db as prisma } from '@/lib/dbconfig';

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
    private async extractQuestionsProcessor(job: any): Promise<any> {
        const { resourceId, fileType: _fileType } = job.data;

        try {
            console.log(`🔍 Starting question extraction for resource ${resourceId}`);
            console.log(`📝 Job ID: ${job.id}, Type: ${job.type}`);

            // Update job progress
            job.progress = 10;

            // Create processing job record if it doesn't exist
            const existingJob = await prisma.aIProcessingJob.findUnique({
                where: { id: job.id }
            });

            if (!existingJob) {
                await prisma.aIProcessingJob.create({
                    data: {
                        id: job.id,
                        resourceId,
                        status: 'PROCESSING',
                        progress: 10,
                        results: {}
                    }
                });
            } else {
                await prisma.aIProcessingJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'PROCESSING',
                        progress: 10
                    }
                });
            }

            // Simulate AI processing (replace with actual AI service later)
            job.progress = 30;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

            // Mock extracted questions for now
            const mockQuestions = [
                {
                    questionText: "Sample question extracted from the document",
                    questionNumber: "1",
                    marks: 10,
                    difficulty: 'MEDIUM'
                },
                {
                    questionText: "Another sample question found in the document",
                    questionNumber: "2",
                    marks: 15,
                    difficulty: 'HARD'
                }
            ];

            job.progress = 60;

            // Store extracted questions in database
            const savedQuestions = await Promise.all(
                mockQuestions.map(async (questionData) => {
                    return await prisma.extractedQuestion.create({
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

            // Update resource status
            await prisma.resource.update({
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
                extractedText: 'Sample extracted text preview...'
            };

        } catch (error) {
            console.error(`Error in question extraction for resource ${resourceId}:`, error);

            // Update database job status
            await prisma.aIProcessingJob.update({
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
                    let concept = await prisma.concept.findFirst({
                        where: { name: conceptData.name }
                    });

                    if (!concept) {
                        concept = await prisma.concept.create({
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
            await prisma.resource.update({
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
                await prisma.aIProcessingJob.create({
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
                await prisma.aIProcessingJob.update({
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

            await prisma.aIProcessingJob.update({
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
            await prisma.aIProcessingJob.update({
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
    return await jobQueue.add(JOB_TYPES.ANALYZE_DOCUMENT, data, {
        maxAttempts: 2
    });
}

// Helper function to get job status
export async function getJobStatus(jobId: string) {
    return await jobQueue.getJob(jobId);
}

// Helper function to get queue statistics
export async function getQueueStats() {
    return await jobQueue.getStats();
}