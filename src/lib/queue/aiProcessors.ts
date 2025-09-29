import { JobProcessor, jobQueue, JOB_TYPES } from './jobQueue';
import { GeminiAIService } from '@/lib/ai/gemini-service';
import { RAGKnowledgeBase } from '@/lib/rag/knowledge-base';
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
    private geminiService: GeminiAIService;
    private ragKnowledgeBase: RAGKnowledgeBase;

    constructor() {
        this.geminiService = new GeminiAIService();
        this.ragKnowledgeBase = new RAGKnowledgeBase();
    }

    /**
     * Initialize all job processors
     */
    init(): void {
        jobQueue.process(JOB_TYPES.EXTRACT_QUESTIONS, this.extractQuestionsProcessor);
        jobQueue.process(JOB_TYPES.IDENTIFY_CONCEPTS, this.identifyConceptsProcessor);
        jobQueue.process(JOB_TYPES.UPDATE_RAG_INDEX, this.updateRAGIndexProcessor);
        jobQueue.process(JOB_TYPES.ANALYZE_DOCUMENT, this.analyzeDocumentProcessor);

        console.log('AI Job Processors initialized');
    }

    /**
     * Extract questions from uploaded documents
     */
    private extractQuestionsProcessor: JobProcessor<ExtractQuestionsJobData> = async (job) => {
        const { resourceId, fileType } = job.data;

        // TODO: Implement file fetching from job.data.filePath

        try {
            // Update database job status
            await prisma.aIProcessingJob.update({
                where: { id: job.id },
                data: {
                    status: 'PROCESSING',
                    progress: 10
                }
            });

            // Extract text from document
            job.progress = 20;
            const fileBuffer = Buffer.from(''); // You'll need to read the actual file

            // Dynamically import DocumentProcessor to avoid server-side issues
            let processingResult;
            try {
                const { DocumentProcessor } = await import('@/lib/processing/file-processor');
                const documentProcessor = new DocumentProcessor();
                processingResult = await documentProcessor.processDocument(fileBuffer, fileType);
            } catch (error) {
                console.error('Document processing error:', error);
                // Fallback to empty text if document processing fails
                processingResult = { extractedText: '', processingTime: 0 };
            }

            const extractedText = processingResult.extractedText;

            // Extract questions using AI
            job.progress = 60;
            const questions = await this.geminiService.extractQuestionsFromText(extractedText);

            // Store extracted questions in database
            job.progress = 80;
            const savedQuestions = await Promise.all(
                questions.map(async (questionData) => {
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

            // Update resource status
            await prisma.resource.update({
                where: { id: resourceId },
                data: {
                    aiProcessingStatus: 'COMPLETED',
                    isPastQuestion: true
                }
            });

            job.progress = 100;

            return {
                questionsExtracted: savedQuestions.length,
                questions: savedQuestions,
                extractedText: extractedText.substring(0, 500) + '...' // Preview
            };

        } catch (error) {
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
    };

    /**
     * Identify concepts from extracted questions
     */
    private identifyConceptsProcessor: JobProcessor<IdentifyConceptsJobData> = async (job) => {
        const { questions } = job.data;

        try {
            job.progress = 20;

            // Identify concepts using AI
            const allConceptsData = await Promise.all(
                questions.map(q => this.geminiService.identifyQuestionConcepts(q))
            );
            const conceptsData = allConceptsData.flat();

            job.progress = 60;

            // Store concepts and relationships
            const savedConcepts = await Promise.all(
                conceptsData.map(async (conceptData) => {
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
    };

    /**
     * Update RAG knowledge base index
     */
    private updateRAGIndexProcessor: JobProcessor<UpdateRAGIndexJobData> = async (job) => {
        const { resourceId, content, concepts } = job.data;

        try {
            job.progress = 30;

            // Update RAG knowledge base
            await this.ragKnowledgeBase.indexResource(resourceId);

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
    };

    /**
     * Complete document analysis workflow
     */
    private analyzeDocumentProcessor: JobProcessor<AnalyzeDocumentJobData> = async (job) => {
        const { resourceId, filePath, fileType, enableAIAnalysis } = job.data;

        if (!enableAIAnalysis) {
            return { message: 'AI analysis not enabled for this resource' };
        }

        try {
            // Create processing job record
            await prisma.aIProcessingJob.create({
                data: {
                    id: job.id,
                    resourceId,
                    status: 'PROCESSING',
                    progress: 0,
                    results: {}
                }
            });

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

            // Update final job status
            await prisma.aIProcessingJob.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    progress: 100,
                    results: {
                        questions: extractResult.questionsExtracted,
                        concepts: conceptResult?.conceptsIdentified || 0,
                        ragIndexed: ragResult.indexed
                    }
                }
            });

            job.progress = 100;

            return {
                questionsExtracted: extractResult.questionsExtracted,
                conceptsIdentified: conceptResult?.conceptsIdentified || 0,
                ragIndexed: ragResult.indexed,
                processingJobId: job.id
            };

        } catch (error) {
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
    };
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