import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface ProcessingResult {
    extractedText: string;
    pageCount?: number;
    processingTime: number;
    confidence?: number; // For OCR results
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
     * Extract text from PDF document
     */
    async extractTextFromPDF(fileBuffer: Buffer): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
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
                    const ocrText = await this.extractTextFromPDFPageWithOCR(page);
                    if (ocrText) {
                        extractedText += `\n\n--- Page ${pageNum} (OCR) ---\n${ocrText}`;
                    }
                }
            }

            const processingTime = Date.now() - startTime;

            return {
                extractedText: extractedText.trim(),
                pageCount,
                processingTime
            };

        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error('Failed to process PDF document');
        }
    }

    /**
     * Extract text from PDF page using OCR (for scanned documents)
     */
    private async extractTextFromPDFPageWithOCR(page: any): Promise<string> {
        try {
            // Render page to canvas
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                throw new Error('Could not get canvas context');
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Convert canvas to image buffer
            const imageData = canvas.toDataURL('image/png');

            // Use OCR to extract text
            if (this.ocrWorker) {
                const { data: { text } } = await this.ocrWorker.recognize(imageData);
                return text;
            }

            return '';
        } catch (error) {
            console.error('Error with PDF page OCR:', error);
            return '';
        }
    }

    /**
     * Extract text from image using OCR
     */
    async extractTextFromImage(imageBuffer: Buffer): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            if (!this.ocrWorker) {
                await this.initializeOCR();
            }

            const { data: { text, confidence } } = await this.ocrWorker.recognize(imageBuffer);
            const processingTime = Date.now() - startTime;

            return {
                extractedText: text.trim(),
                processingTime,
                confidence: confidence / 100 // Convert to 0-1 scale
            };

        } catch (error) {
            console.error('Error extracting text from image:', error);
            throw new Error('Failed to process image document');
        }
    }

    /**
     * Process any supported document type
     */
    async processDocument(fileBuffer: Buffer, mimeType: string): Promise<ProcessingResult> {
        try {
            if (mimeType === 'application/pdf') {
                return await this.extractTextFromPDF(fileBuffer);
            } else if (mimeType.startsWith('image/')) {
                return await this.extractTextFromImage(fileBuffer);
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