import { createWorker } from 'tesseract.js';

interface ProcessingResult {
    extractedText: string;
    pageCount?: number;
    processingTime: number;
    confidence?: number; // For OCR results
    usedDocumentAI?: boolean;
    tables?: Array<{ rows: number; columns: number; content: string[][] }>;
}

export class DocumentProcessor {
    private ocrWorker: any;

    constructor() {
        this.initializeOCR();
    }

    /**
     * Initialize Tesseract OCR worker
     */
    private async initializeOCR() {
        try {
            this.ocrWorker = await createWorker();
            await this.ocrWorker.loadLanguage('eng');
            await this.ocrWorker.initialize('eng');
        } catch (error) {
            console.error('Failed to initialize OCR worker:', error);
        }
    }

    /**
     * Extract text from PDF document using Document AI as primary method
     */
    async extractTextFromPDF(fileBuffer: Buffer): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Try Document AI first
            const { documentAI } = await import('../ai/documentai-service');

            if (documentAI.isConfigured()) {
                console.log(`🤖 Using Document AI for PDF processing...`);

                try {
                    // Try structured extraction first for better content understanding
                    const structuredData = await documentAI.extractStructuredData(fileBuffer, 'application/pdf');
                    const processingTime = Date.now() - startTime;

                    console.log(`✅ Document AI structured extraction: ${structuredData.text.length} chars, ${structuredData.tables.length} tables`);

                    return {
                        extractedText: structuredData.text,
                        processingTime,
                        usedDocumentAI: true,
                        tables: structuredData.tables
                    };
                } catch {
                    console.log(`⚠️ Structured extraction failed, trying basic Document AI extraction...`);

                    // Fallback to basic Document AI text extraction
                    const text = await documentAI.extractTextFromImage(fileBuffer, 'application/pdf');
                    const processingTime = Date.now() - startTime;

                    return {
                        extractedText: text,
                        processingTime,
                        usedDocumentAI: true
                    };
                }
            }
        } catch (documentAIError) {
            console.log(`⚠️ Document AI failed, falling back to PDF.js: ${documentAIError}`);
        }

        // Fallback to PDF.js if Document AI is not available
        console.log(`📄 Falling back to PDF.js processing...`);

        try {
            const pdfjsLib = await import('pdfjs-dist');

            // Configure PDF.js for server-side processing
            if (typeof window === 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '';
            }

            // Load PDF document
            const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
            const pageCount = pdfDoc.numPages;
            let extractedText = '';

            // Extract text from each page
            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');

                if (pageText.trim()) {
                    extractedText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
                } else {
                    // If no text found, try OCR on this page
                    console.log(`Page ${pageNum} has no extractable text, trying OCR...`);
                    const ocrText = await this.extractTextFromPDFPageWithOCR();
                    if (ocrText) {
                        extractedText += `\n\n--- Page ${pageNum} (OCR) ---\n${ocrText}`;
                    }
                }
            }

            const processingTime = Date.now() - startTime;

            return {
                extractedText: extractedText.trim(),
                pageCount,
                processingTime,
                usedDocumentAI: false
            };

        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error('Failed to process PDF document with both Document AI and PDF.js');
        }
    }

    /**
     * Extract text from PDF page using OCR (for scanned documents)
     */
    private async extractTextFromPDFPageWithOCR(): Promise<string> {
        try {
            // This would need to be adapted for server-side rendering
            // For now, return empty string as Canvas is not available in Node.js
            return '';
        } catch (error) {
            console.error('Error with PDF page OCR:', error);
            return '';
        }
    }

    /**
     * Extract text from image using Document AI as primary method
     */
    async extractTextFromImage(imageBuffer: Buffer, mimeType?: string): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Try Document AI first
            const { documentAI } = await import('../ai/documentai-service');

            if (documentAI.isConfigured()) {
                console.log(`🤖 Using Document AI for image OCR...`);

                const detectedMimeType = mimeType || 'image/png';
                const text = await documentAI.extractTextFromImage(imageBuffer, detectedMimeType);
                const processingTime = Date.now() - startTime;

                console.log(`✅ Document AI image extraction: ${text.length} chars`);

                return {
                    extractedText: text.trim(),
                    processingTime,
                    confidence: 0.95, // Document AI typically has high confidence
                    usedDocumentAI: true
                };
            }
        } catch (documentAIError) {
            console.log(`⚠️ Document AI image processing failed, falling back to Tesseract: ${documentAIError}`);
        }

        // Fallback to Tesseract OCR
        try {
            if (!this.ocrWorker) {
                await this.initializeOCR();
            }

            const { data: { text, confidence } } = await this.ocrWorker.recognize(imageBuffer);
            const processingTime = Date.now() - startTime;

            return {
                extractedText: text.trim(),
                processingTime,
                confidence: confidence / 100, // Convert to 0-1 scale
                usedDocumentAI: false
            };

        } catch (error) {
            console.error('Error extracting text from image:', error);
            throw new Error('Failed to process image document with both Document AI and Tesseract');
        }
    }

    /**
     * Process any supported document type with Document AI priority
     */
    async processDocument(fileBuffer: Buffer, mimeType: string): Promise<ProcessingResult> {
        try {
            if (mimeType === 'application/pdf') {
                return await this.extractTextFromPDF(fileBuffer);
            } else if (mimeType.startsWith('image/')) {
                return await this.extractTextFromImage(fileBuffer, mimeType);
            } else {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }
        } catch (error) {
            console.error('Error processing document:', error);
            throw error;
        }
    }

    /**
     * Clean and structure extracted text
     */
    cleanAndStructureText(rawText: string): string {
        return rawText
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove special characters that might interfere with processing
            .replace(/[^\w\s\n\-.,;:?!()\[\]{}'"]/g, '')
            // Normalize line breaks
            .replace(/\n+/g, '\n')
            // Trim whitespace
            .trim();
    }

    /**
     * Validate if extracted content looks like questions
     */
    validateExtractedContent(text: string): {
        isValid: boolean;
        confidence: number;
        reasons: string[];
    } {
        const reasons: string[] = [];
        let confidence = 0;

        // Check for question indicators
        const questionIndicators = [
            /question\s*\d+/gi,
            /q\d+/gi,
            /\d+\.\s/g,
            /\d+\)\s/g,
            /\?\s*$/gm,
            /explain/gi,
            /describe/gi,
            /analyze/gi,
            /calculate/gi,
            /solve/gi,
            /define/gi,
            /marks?/gi
        ];

        let indicatorCount = 0;
        questionIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                indicatorCount += matches.length;
            }
        });

        if (indicatorCount > 0) {
            confidence += 0.3;
            reasons.push(`Found ${indicatorCount} question indicators`);
        }

        // Check for academic language
        const academicTerms = /(?:theorem|principle|concept|theory|method|approach|formula|equation|analysis|synthesis|evaluation)/gi;
        const academicMatches = text.match(academicTerms);
        if (academicMatches && academicMatches.length > 2) {
            confidence += 0.2;
            reasons.push('Contains academic terminology');
        }

        // Check for marks/points indicators
        const marksPattern = /\[\s*\d+\s*marks?\s*\]|\(\s*\d+\s*marks?\s*\)|\d+\s*marks?/gi;
        if (marksPattern.test(text)) {
            confidence += 0.3;
            reasons.push('Contains marks allocation');
        }

        // Check for reasonable length
        if (text.length > 100 && text.length < 50000) {
            confidence += 0.1;
            reasons.push('Appropriate content length');
        }

        // Check for structured content (sections, numbering)
        const structurePattern = /(?:section|part|chapter)\s*[A-Z\d]/gi;
        if (structurePattern.test(text)) {
            confidence += 0.1;
            reasons.push('Contains structured sections');
        }

        return {
            isValid: confidence > 0.5,
            confidence,
            reasons
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
        }
    }
}

// Singleton instance
export const documentProcessor = new DocumentProcessor();