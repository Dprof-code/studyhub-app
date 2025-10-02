import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export class DocumentAIService {
    private client: DocumentProcessorServiceClient;
    private projectId: string;
    private location: string;
    private processorId: string;

    constructor() {
        // Initialize Document AI client with credentials from environment variables
        const credentials = {
            type: 'service_account',
            project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
            private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            universe_domain: 'googleapis.com'
        };

        // Initialize client with credentials from environment variables
        if (process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
            this.client = new DocumentProcessorServiceClient({
                credentials: credentials
            });
        } else {
            // Fallback to default credential chain (GOOGLE_APPLICATION_CREDENTIALS file)
            this.client = new DocumentProcessorServiceClient();
        }

        // Configuration from environment variables
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
        this.location = process.env.DOCUMENT_AI_LOCATION || 'us'; // Default to 'us'
        this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || '';

        if (!this.projectId || !this.processorId) {
            console.warn('⚠️ Document AI not fully configured. Will fall back to other OCR methods.');
        }
    }

    /**
     * Extract text from image using Google Cloud Document AI OCR
     */
    async extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
        try {
            if (!this.projectId || !this.processorId) {
                throw new Error('Document AI not configured - missing project ID or processor ID');
            }

            console.log(`🤖 Using Google Cloud Document AI for OCR processing...`);
            console.log(`📊 Image size: ${imageBuffer.length} bytes, type: ${mimeType}`);

            // The resource name of the processor
            const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

            // Convert buffer to base64
            const encodedImage = imageBuffer.toString('base64');

            // Configure the request
            const request = {
                name,
                rawDocument: {
                    content: encodedImage,
                    mimeType: mimeType,
                },
                // Enable text extraction features
                documentType: 'general' as const,
                skipHumanReview: true,
            };

            console.log(`📤 Sending request to Document AI processor: ${this.processorId}`);

            // Process the document
            const [result] = await this.client.processDocument(request);

            if (!result.document?.text) {
                throw new Error('Document AI returned no text content');
            }

            const extractedText = result.document.text;
            console.log(`✅ Document AI extracted ${extractedText.length} characters`);

            // Log confidence and processing details if available
            if (result.document.pages && result.document.pages.length > 0) {
                const page = result.document.pages[0];
                console.log(`📄 Processed ${result.document.pages.length} page(s)`);

                if (page.blocks && page.blocks.length > 0) {
                    console.log(`🔤 Found ${page.blocks.length} text blocks`);
                }
            }

            return extractedText;

        } catch (error) {
            console.error('❌ Document AI OCR failed:', error);

            // Provide helpful error messages
            if (error instanceof Error) {
                if (error.message.includes('not configured')) {
                    console.log('💡 To use Document AI, set these environment variables:');
                    console.log('   - GOOGLE_CLOUD_PROJECT_ID');
                    console.log('   - DOCUMENT_AI_PROCESSOR_ID');
                    console.log('   - DOCUMENT_AI_LOCATION (optional, defaults to "us")');
                    console.log('   And either:');
                    console.log('   - GOOGLE_CLOUD_PRIVATE_KEY + GOOGLE_CLOUD_CLIENT_EMAIL (recommended)');
                    console.log('   - OR GOOGLE_APPLICATION_CREDENTIALS (path to service account key file)');
                }
            }

            throw new Error(`Document AI OCR failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract structured data from document (tables, form fields, etc.)
     */
    async extractStructuredData(imageBuffer: Buffer, mimeType: string): Promise<{
        text: string;
        pages: any[];
        entities: any[];
        tables: Array<{
            rows: number;
            columns: number;
            content: string[][];
        }>;
        formFields: Array<{
            name: string;
            value: string;
        }>;
    }> {
        try {
            if (!this.projectId || !this.processorId) {
                throw new Error('Document AI not configured');
            }

            console.log(`📋 Extracting structured data using Document AI...`);

            const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;
            const encodedImage = imageBuffer.toString('base64');

            const request = {
                name,
                rawDocument: {
                    content: encodedImage,
                    mimeType: mimeType,
                },
            };

            const [result] = await this.client.processDocument(request);

            if (!result.document) {
                throw new Error('Document AI returned no document data');
            }

            const structuredData: {
                text: string;
                pages: any[];
                entities: any[];
                tables: Array<{
                    rows: number;
                    columns: number;
                    content: string[][];
                }>;
                formFields: Array<{
                    name: string;
                    value: string;
                }>;
            } = {
                text: result.document.text || '',
                pages: result.document.pages || [],
                entities: result.document.entities || [],
                tables: [],
                formFields: []
            };

            // Extract tables if present
            if (result.document.pages) {
                for (const page of result.document.pages) {
                    if (page.tables) {
                        for (const table of page.tables) {
                            const tableData = {
                                rows: table.bodyRows?.length || 0,
                                columns: table.headerRows?.[0]?.cells?.length || 0,
                                content: this.extractTableContent(table, result.document.text || '')
                            };
                            structuredData.tables.push(tableData);
                        }
                    }

                    if (page.formFields) {
                        for (const field of page.formFields) {
                            const fieldData = {
                                name: this.extractText(field.fieldName, result.document.text || ''),
                                value: this.extractText(field.fieldValue, result.document.text || '')
                            };
                            structuredData.formFields.push(fieldData);
                        }
                    }
                }
            }

            console.log(`✅ Extracted structured data: ${structuredData.tables.length} tables, ${structuredData.formFields.length} form fields`);
            return structuredData;

        } catch (error) {
            console.error('❌ Document AI structured extraction failed:', error);
            throw new Error(`Structured data extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Helper method to extract text from Document AI text segments
     */
    private extractText(textAnchor: any, fullText: string): string {
        if (!textAnchor?.textSegments) return '';

        let extractedText = '';
        for (const segment of textAnchor.textSegments) {
            const startIndex = parseInt(segment.startIndex || '0');
            const endIndex = parseInt(segment.endIndex || fullText.length.toString());
            extractedText += fullText.substring(startIndex, endIndex);
        }

        return extractedText.trim();
    }

    /**
     * Helper method to extract table content
     */
    private extractTableContent(table: any, fullText: string): string[][] {
        const content: string[][] = [];

        // Extract header rows
        if (table.headerRows) {
            for (const row of table.headerRows) {
                const rowContent: string[] = [];
                if (row.cells) {
                    for (const cell of row.cells) {
                        const cellText = this.extractText(cell.layout?.textAnchor, fullText);
                        rowContent.push(cellText);
                    }
                }
                content.push(rowContent);
            }
        }

        // Extract body rows
        if (table.bodyRows) {
            for (const row of table.bodyRows) {
                const rowContent: string[] = [];
                if (row.cells) {
                    for (const cell of row.cells) {
                        const cellText = this.extractText(cell.layout?.textAnchor, fullText);
                        rowContent.push(cellText);
                    }
                }
                content.push(rowContent);
            }
        }

        return content;
    }

    /**
     * Check if Document AI is properly configured
     */
    isConfigured(): boolean {
        return !!(this.projectId && this.processorId &&
            (process.env.GOOGLE_CLOUD_PRIVATE_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS));
    }

    /**
     * Get configuration status for debugging
     */
    getConfigurationStatus(): any {
        return {
            hasProjectId: !!this.projectId,
            hasProcessorId: !!this.processorId,
            hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
            hasClientEmail: !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
            hasCredentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            location: this.location,
            authMethod: process.env.GOOGLE_CLOUD_PRIVATE_KEY ? 'environment_variables' : 'credentials_file',
            isFullyConfigured: this.isConfigured()
        };
    }
}

// Singleton instance
export const documentAI = new DocumentAIService();