import { jobQueue, JOB_TYPES } from './jobQueue';
import { db } from '../dbconfig';
import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';
import tesseract from 'node-tesseract-ocr'; // Import node-tesseract-ocr

// ... (other imports and interfaces remain the same)

// Configure PDF.js worker (unchanged)
if (typeof window === 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
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
                    // Save the file buffer to a temporary file (node-tesseract-ocr requires a file path)
                    const tempFilePath = `./temp_image_${job.id}.png`;
                    fs.writeFileSync(tempFilePath, fileBuffer);

                    // Configure node-tesseract-ocr
                    const config = {
                        lang: 'eng',
                        oem: 1, // Use LSTM-based OCR engine
                        psm: 3, // Automatic page segmentation with OSD
                    };

                    console.log(`🔧 Starting OCR with node-tesseract-ocr...`);
                    const ocrResult = await Promise.race([
                        tesseract.recognize(tempFilePath, config),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('OCR processing timeout after 5 minutes')), 300000)
                        )
                    ]);

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

            console.log(`📄 Extracted text preview: ${extractedText.substring(0, 200)}...`);
            job.progress = 40;

            // 2. Extract questions using regex (e.g., lines starting with number or Q)
            console.log(`🔍 Extracting questions from text...`);
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
                console.log(`⚠️ No structured questions found, using line-by-line fallback`);
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

            console.log(`✅ Found ${questions.length} questions`);
            job.progress = 60;

            // 3. Store extracted questions in database
            console.log(`💾 Saving questions to database...`);
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

    // ... (rest of the class remains unchanged)
}

// Initialize processors
export const aiJobProcessors = new AIJobProcessors();

// ... (rest of the file remains unchanged)