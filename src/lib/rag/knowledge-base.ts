import { db } from '../dbconfig';
import { geminiAI } from '../ai/gemini-service';

interface SearchResult {
    resourceId: number;
    content: string;
    relevanceScore: number;
    title: string;
    description?: string;
}

interface KnowledgeEntry {
    id: string;
    content: string;
    metadata: {
        resourceId: number;
        title: string;
        courseId: number;
        courseName: string;
        tags: string[];
        uploadDate: Date;
    };
    embeddings?: number[]; // For future vector search implementation
}

export class RAGKnowledgeBase {
    private knowledgeIndex: Map<string, KnowledgeEntry> = new Map();
    private isInitialized = false;

    /**
     * Initialize the knowledge base by indexing existing resources
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('Initializing RAG Knowledge Base...');
            await this.indexAllResources();
            this.isInitialized = true;
            console.log(`Knowledge base initialized with ${this.knowledgeIndex.size} entries`);
        } catch (error) {
            console.error('Failed to initialize knowledge base:', error);
            throw error;
        }
    }

    /**
     * Index all existing resources for RAG
     */
    private async indexAllResources(): Promise<void> {
        const resources = await db.resource.findMany({
            where: {
                isPastQuestion: false // Only index study materials, not past questions
            },
            include: {
                tags: true,
                course: true,
                uploader: {
                    select: { username: true }
                }
            }
        });

        for (const resource of resources) {
            await this.indexResource(resource.id);
        }
    }

    /**
     * Index a specific resource for RAG search
     */
    async indexResource(resourceId: number): Promise<void> {
        try {
            const resource = await db.resource.findUnique({
                where: { id: resourceId },
                include: {
                    tags: true,
                    course: true
                }
            });

            if (!resource) {
                throw new Error(`Resource with id ${resourceId} not found`);
            }

            // Create searchable content
            const content = this.createSearchableContent(resource);

            // Update database with RAG content
            await db.resource.update({
                where: { id: resourceId },
                data: {
                    ragContent: content
                }
            });

            // Add to in-memory index
            const knowledgeEntry: KnowledgeEntry = {
                id: `resource_${resourceId}`,
                content,
                metadata: {
                    resourceId: resource.id,
                    title: resource.title,
                    courseId: resource.courseId,
                    courseName: resource.course.title,
                    tags: resource.tags.map(tag => tag.name),
                    uploadDate: resource.createdAt
                }
            };

            this.knowledgeIndex.set(knowledgeEntry.id, knowledgeEntry);

        } catch (error) {
            console.error(`Failed to index resource ${resourceId}:`, error);
        }
    }

    /**
     * Create searchable content from resource
     */
    private createSearchableContent(resource: any): string {
        const parts = [
            `Title: ${resource.title}`,
            resource.description ? `Description: ${resource.description}` : '',
            `Course: ${resource.course.title}`,
            resource.tags.length > 0 ? `Tags: ${resource.tags.map((t: any) => t.name).join(', ')}` : '',
            `File Type: ${resource.fileType}`,
            resource.year ? `Year: ${resource.year}` : ''
        ].filter(Boolean);

        return parts.join('\n');
    }

    /**
     * Search for relevant content based on query
     */
    async searchSimilarContent(
        query: string,
        limit: number = 10,
        courseId?: number
    ): Promise<SearchResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const results: SearchResult[] = [];

            // Get all relevant entries from database
            const whereClause: any = {
                isPastQuestion: false,
                ragContent: { not: null }
            };

            if (courseId) {
                whereClause.courseId = courseId;
            }

            const resources = await db.resource.findMany({
                where: whereClause,
                include: {
                    tags: true,
                    course: true
                },
                take: 50 // Limit for performance
            });

            // Calculate relevance for each resource
            for (const resource of resources) {
                if (!resource.ragContent) continue;

                const relevanceScore = await this.calculateRelevance(
                    query,
                    resource.ragContent
                );

                if (relevanceScore > 0.3) { // Minimum relevance threshold
                    results.push({
                        resourceId: resource.id,
                        content: resource.ragContent,
                        relevanceScore,
                        title: resource.title,
                        description: resource.description || undefined
                    });
                }
            }

            // Sort by relevance and limit results
            return results
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, limit);

        } catch (error) {
            console.error('Error searching content:', error);
            return [];
        }
    }

    /**
     * Calculate relevance score between query and content
     */
    private async calculateRelevance(query: string, content: string): Promise<number> {
        try {
            // Simple keyword matching for now
            // In production, you'd want to use proper embeddings/vector similarity
            const queryTerms = query.toLowerCase().split(/\s+/);
            const contentLower = content.toLowerCase();

            let matchCount = 0;
            const uniqueTerms = new Set(queryTerms);

            for (const term of uniqueTerms) {
                if (term.length > 2 && contentLower.includes(term)) {
                    matchCount++;
                }
            }

            // Basic relevance calculation
            let score = matchCount / uniqueTerms.size;

            // Boost score for exact phrase matches
            if (contentLower.includes(query.toLowerCase())) {
                score += 0.3;
            }

            // Use AI for more sophisticated relevance (optional - use sparingly due to API costs)
            if (score > 0.5 && queryTerms.length > 3) {
                try {
                    const aiScore = await this.getAIRelevanceScore(query, content);
                    score = (score + aiScore) / 2; // Average the scores
                } catch (_error) {
                    // Fallback to keyword-based score if AI fails
                    console.warn('AI relevance scoring failed, using keyword-based score');
                }
            }

            return Math.max(0, Math.min(1, score));
        } catch (error) {
            console.error('Error calculating relevance:', error);
            return 0;
        }
    }

    /**
     * Get AI-powered relevance score
     */
    private async getAIRelevanceScore(query: string, content: string): Promise<number> {
        const prompt = `
Rate the relevance of this content to the given query on a scale of 0.0 to 1.0.

Query: ${query}

Content: ${content.slice(0, 500)}...

Consider:
1. Topic alignment
2. Concept overlap
3. Educational value for answering the query

Return only a decimal number (e.g., 0.75).
        `;

        try {
            const result = await geminiAI.generateContent(prompt);
            const response = result.response.text().trim();
            const score = parseFloat(response);

            return isNaN(score) ? 0.0 : Math.max(0.0, Math.min(1.0, score));
        } catch (_error) {
            console.error('Error getting AI relevance score:', _error);
            return 0.5; // Neutral score as fallback
        }
    }

    /**
     * Generate contextual answer using RAG
     */
    async generateContextualAnswer(
        question: string,
        courseId?: number,
        maxContextLength: number = 2000
    ): Promise<{
        answer: string;
        sources: SearchResult[];
        confidence: number;
    }> {
        try {
            // Search for relevant content
            const searchResults = await this.searchSimilarContent(question, 5, courseId);

            if (searchResults.length === 0) {
                return {
                    answer: "I couldn't find relevant resources to answer this question. Please try rephrasing your question or check if there are resources available for this topic.",
                    sources: [],
                    confidence: 0.0
                };
            }

            // Prepare context from top results
            let context = '';
            let contextLength = 0;
            const usedSources: SearchResult[] = [];

            for (const result of searchResults) {
                const resultContent = `Source: ${result.title}\n${result.content}\n\n`;

                if (contextLength + resultContent.length <= maxContextLength) {
                    context += resultContent;
                    contextLength += resultContent.length;
                    usedSources.push(result);
                } else {
                    break;
                }
            }

            // Generate answer using AI with context
            const answer = await geminiAI.answerQuestionWithRAG(
                question,
                [context],
                courseId ? await this.getCourseContext(courseId) : undefined
            );

            // Calculate confidence based on source relevance
            const avgRelevance = usedSources.length > 0
                ? usedSources.reduce((sum, source) => sum + source.relevanceScore, 0) / usedSources.length
                : 0;

            return {
                answer,
                sources: usedSources,
                confidence: avgRelevance
            };

        } catch (error) {
            console.error('Error generating contextual answer:', error);
            return {
                answer: "I encountered an error while trying to answer your question. Please try again later.",
                sources: [],
                confidence: 0.0
            };
        }
    }

    /**
     * Get course context for better AI responses
     */
    private async getCourseContext(courseId: number): Promise<string> {
        try {
            const course = await db.course.findUnique({
                where: { id: courseId },
                include: {
                    department: true
                }
            });

            if (!course) return '';

            return `${course.title} (${course.department?.name || ''}) - Level ${course.level}`;
        } catch (_error) {
            return '';
        }
    }

    /**
     * Update knowledge base when new resources are added
     */
    async updateKnowledgeBase(resourceId: number): Promise<void> {
        await this.indexResource(resourceId);
    }

    /**
     * Remove resource from knowledge base
     */
    async removeFromKnowledgeBase(resourceId: number): Promise<void> {
        const entryId = `resource_${resourceId}`;
        this.knowledgeIndex.delete(entryId);

        // Update database
        await db.resource.update({
            where: { id: resourceId },
            data: { ragContent: null }
        });
    }

    /**
     * Get knowledge base statistics
     */
    getStatistics(): {
        totalEntries: number;
        memoryEntries: number;
        isInitialized: boolean;
    } {
        return {
            totalEntries: this.knowledgeIndex.size,
            memoryEntries: this.knowledgeIndex.size,
            isInitialized: this.isInitialized
        };
    }
}

// Singleton instance
export const ragKnowledgeBase = new RAGKnowledgeBase();