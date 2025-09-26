// Smart Resource Recommendation System
import { db } from './dbconfig';

interface UserInteraction {
    userId: number;
    resourceId: number;
    interactionType: 'view' | 'download' | 'vote' | 'comment';
    weight: number;
    timestamp: Date;
}

interface ResourceFeatures {
    id: number;
    title: string;
    description: string;
    tags: string[];
    courseId: number;
    departmentId: number;
    fileType: string;
    year?: number;
}

interface UserProfile {
    userId: number;
    enrolledCourses: number[];
    departmentId?: number;
    interactionHistory: UserInteraction[];
    preferredTags: string[];
    preferredFileTypes: string[];
}

export class RecommendationEngine {
    // Weights for different interaction types
    private readonly INTERACTION_WEIGHTS = {
        view: 1,
        download: 3,
        vote: 2,
        comment: 4
    };

    /**
     * Calculate cosine similarity between two users based on resource interactions
     */
    calculateUserSimilarity(userAInteractions: UserInteraction[], userBInteractions: UserInteraction[]): number {
        // Create interaction vectors for both users
        const resourceIds = new Set([
            ...userAInteractions.map(i => i.resourceId),
            ...userBInteractions.map(i => i.resourceId)
        ]);

        if (resourceIds.size === 0) return 0;

        const vectorA: number[] = [];
        const vectorB: number[] = [];

        resourceIds.forEach(resourceId => {
            // Get weighted interaction score for user A
            const userAScore = userAInteractions
                .filter(i => i.resourceId === resourceId)
                .reduce((sum, i) => sum + i.weight, 0);

            // Get weighted interaction score for user B
            const userBScore = userBInteractions
                .filter(i => i.resourceId === resourceId)
                .reduce((sum, i) => sum + i.weight, 0);

            vectorA.push(userAScore);
            vectorB.push(userBScore);
        });

        return this.cosineSimilarity(vectorA, vectorB);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
        if (vectorA.length !== vectorB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Analyze resource content using TF-IDF-like approach
     */
    analyzeResourceContent(resource: ResourceFeatures, allResources: ResourceFeatures[]): number[] {
        const text = `${resource.title} ${resource.description} ${resource.tags.join(' ')}`.toLowerCase();
        const words = text.split(/\s+/).filter(word => word.length > 2);

        // Simple TF-IDF calculation
        const termFreq = this.calculateTermFrequency(words);
        const docFreq = this.calculateDocumentFrequency(words, allResources);

        const features: number[] = [];

        // Convert to feature vector (simplified)
        Object.keys(termFreq).forEach(term => {
            const tf = termFreq[term];
            const idf = Math.log(allResources.length / (docFreq[term] || 1));
            features.push(tf * idf);
        });

        return features;
    }

    /**
     * Calculate term frequency
     */
    private calculateTermFrequency(words: string[]): Record<string, number> {
        const freq: Record<string, number> = {};
        const totalWords = words.length;

        words.forEach(word => {
            freq[word] = (freq[word] || 0) + 1;
        });

        // Normalize by total words
        Object.keys(freq).forEach(word => {
            freq[word] = freq[word] / totalWords;
        });

        return freq;
    }

    /**
     * Calculate document frequency across all resources
     */
    private calculateDocumentFrequency(words: string[], allResources: ResourceFeatures[]): Record<string, number> {
        const docFreq: Record<string, number> = {};

        words.forEach(word => {
            if (!docFreq[word]) {
                docFreq[word] = allResources.filter(resource => {
                    const text = `${resource.title} ${resource.description} ${resource.tags.join(' ')}`.toLowerCase();
                    return text.includes(word);
                }).length;
            }
        });

        return docFreq;
    }

    /**
     * Get user interaction history with weights
     */
    async getUserInteractions(userId: number): Promise<UserInteraction[]> {
        // Get resource-related activity logs
        const resourceActivities = await db.activityLog.findMany({
            where: {
                userId,
                activityType: {
                    in: ['RESOURCE_UPLOAD', 'RESOURCE_COMMENT', 'UPVOTE_RECEIVED']
                },
                resourceId: { not: null }
            }
        });

        // Get votes
        const votes = await db.contentVote.findMany({
            where: { voterId: userId },
            include: { resource: true }
        });

        // Get comments
        const comments = await db.resourceComment.findMany({
            where: { authorId: userId },
            include: { resource: true }
        });

        const interactions: UserInteraction[] = [];

        // Add resource activity interactions
        resourceActivities.forEach(activity => {
            if (activity.resourceId) {
                let interactionType: 'view' | 'download' | 'vote' | 'comment';
                let weight: number;

                switch (activity.activityType) {
                    case 'RESOURCE_UPLOAD':
                        // User uploaded this resource, treat as high engagement
                        interactionType = 'view';
                        weight = this.INTERACTION_WEIGHTS.view * 3; // Higher weight for own uploads
                        break;
                    case 'RESOURCE_COMMENT':
                        interactionType = 'comment';
                        weight = this.INTERACTION_WEIGHTS.comment;
                        break;
                    case 'UPVOTE_RECEIVED':
                        // User received upvotes on this resource
                        interactionType = 'vote';
                        weight = this.INTERACTION_WEIGHTS.vote;
                        break;
                    default:
                        interactionType = 'view';
                        weight = this.INTERACTION_WEIGHTS.view;
                }

                interactions.push({
                    userId,
                    resourceId: activity.resourceId,
                    interactionType,
                    weight,
                    timestamp: activity.createdAt
                });
            }
        });

        // Add vote interactions
        votes.forEach(vote => {
            if (vote.resourceId) {
                interactions.push({
                    userId,
                    resourceId: vote.resourceId,
                    interactionType: 'vote',
                    weight: this.INTERACTION_WEIGHTS.vote * vote.voteWeight,
                    timestamp: vote.createdAt
                });
            }
        });

        // Add comment interactions
        comments.forEach(comment => {
            interactions.push({
                userId,
                resourceId: comment.resourceId,
                interactionType: 'comment',
                weight: this.INTERACTION_WEIGHTS.comment,
                timestamp: comment.createdAt
            });
        });

        return interactions;
    }

    /**
     * Get user profile with preferences
     */
    async getUserProfile(userId: number): Promise<UserProfile> {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                enrollments: {
                    where: { status: 'ACTIVE' },
                    include: { course: true }
                },
                contentVotes: {
                    include: { resource: { include: { tags: true } } }
                }
            }
        });

        if (!user) throw new Error('User not found');

        const interactions = await this.getUserInteractions(userId);

        // Analyze user preferences from interactions
        const tagCounts: Record<string, number> = {};
        const fileTypeCounts: Record<string, number> = {};

        for (const vote of user.contentVotes) {
            if (vote.resource) {
                // Count preferred tags
                vote.resource.tags.forEach(tag => {
                    tagCounts[tag.name] = (tagCounts[tag.name] || 0) + vote.voteWeight;
                });

                // Count preferred file types
                fileTypeCounts[vote.resource.fileType] =
                    (fileTypeCounts[vote.resource.fileType] || 0) + vote.voteWeight;
            }
        }

        const preferredTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag]) => tag);

        const preferredFileTypes = Object.entries(fileTypeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type]) => type);

        return {
            userId,
            enrolledCourses: user.enrollments.map(e => e.courseId),
            departmentId: user.departmentId || undefined,
            interactionHistory: interactions,
            preferredTags,
            preferredFileTypes
        };
    }

    /**
     * Generate hybrid recommendations combining collaborative and content-based filtering
     */
    async generateRecommendations(userId: number, limit = 20): Promise<number[]> {
        const userProfile = await getUserProfile(userId);

        // Get collaborative filtering recommendations
        const collaborativeRecs = await this.getCollaborativeRecommendations(userId, userProfile);

        // Get content-based recommendations
        const contentBasedRecs = await this.getContentBasedRecommendations(userProfile);

        // Combine recommendations with weights
        const hybridScores: Record<number, number> = {};

        // Weight: 60% collaborative, 40% content-based
        collaborativeRecs.forEach(({ resourceId, score }) => {
            hybridScores[resourceId] = (hybridScores[resourceId] || 0) + (score * 0.6);
        });

        contentBasedRecs.forEach(({ resourceId, score }) => {
            hybridScores[resourceId] = (hybridScores[resourceId] || 0) + (score * 0.4);
        });

        // Sort by combined score and return top recommendations
        return Object.entries(hybridScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([resourceId]) => parseInt(resourceId));
    }

    /**
     * Get collaborative filtering recommendations
     */
    private async getCollaborativeRecommendations(
        userId: number,
        userProfile: UserProfile
    ): Promise<Array<{ resourceId: number; score: number }>> {
        // Find similar users
        const allUsers = await db.user.findMany({
            where: { id: { not: userId } },
            take: 100 // Limit for performance
        });

        const similarities: Array<{ userId: number; similarity: number }> = [];

        for (const otherUser of allUsers) {
            const otherInteractions = await this.getUserInteractions(otherUser.id);
            const similarity = this.calculateUserSimilarity(
                userProfile.interactionHistory,
                otherInteractions
            );

            if (similarity > 0.1) { // Minimum similarity threshold
                similarities.push({ userId: otherUser.id, similarity });
            }
        }

        // Sort by similarity
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topSimilarUsers = similarities.slice(0, 10);

        // Get resources liked by similar users
        const recommendations: Record<number, number> = {};

        for (const { userId: similarUserId, similarity } of topSimilarUsers) {
            const similarUserVotes = await db.contentVote.findMany({
                where: {
                    voterId: similarUserId,
                    voteType: { in: ['UPVOTE', 'HELPFUL', 'QUALITY_CONTENT'] }
                }
            });

            similarUserVotes.forEach(vote => {
                if (vote.resourceId && !userProfile.interactionHistory.some(i => i.resourceId === vote.resourceId)) {
                    recommendations[vote.resourceId] =
                        (recommendations[vote.resourceId] || 0) + (similarity * vote.voteWeight);
                }
            });
        }

        return Object.entries(recommendations)
            .map(([resourceId, score]) => ({ resourceId: parseInt(resourceId), score }));
    }

    /**
     * Get content-based recommendations
     */
    private async getContentBasedRecommendations(
        userProfile: UserProfile
    ): Promise<Array<{ resourceId: number; score: number }>> {
        // Get resources from enrolled courses and preferred department
        const whereClause: any = {
            id: {
                notIn: userProfile.interactionHistory.map(i => i.resourceId)
            }
        };

        if (userProfile.enrolledCourses.length > 0) {
            whereClause.OR = [
                { courseId: { in: userProfile.enrolledCourses } },
                ...(userProfile.departmentId ? [{
                    course: { departmentId: userProfile.departmentId }
                }] : [])
            ];
        } else if (userProfile.departmentId) {
            whereClause.course = { departmentId: userProfile.departmentId };
        }

        const candidateResources = await db.resource.findMany({
            where: whereClause,
            include: {
                tags: true,
                course: { include: { department: true } }
            },
            take: 200 // Limit for performance
        });

        const recommendations: Array<{ resourceId: number; score: number }> = [];

        candidateResources.forEach(resource => {
            let score = 0;

            // Score based on preferred tags
            const resourceTags = resource.tags.map(t => t.name);
            const tagMatches = resourceTags.filter(tag => userProfile.preferredTags.includes(tag));
            score += tagMatches.length * 0.3;

            // Score based on preferred file types
            if (userProfile.preferredFileTypes.includes(resource.fileType)) {
                score += 0.2;
            }

            // Score based on enrolled courses
            if (userProfile.enrolledCourses.includes(resource.courseId)) {
                score += 0.4;
            }

            // Score based on department match
            if (userProfile.departmentId && resource.course?.departmentId === userProfile.departmentId) {
                score += 0.1;
            }

            if (score > 0) {
                recommendations.push({ resourceId: resource.id, score });
            }
        });

        return recommendations.sort((a, b) => b.score - a.score);
    }
}

// Singleton instance
export const recommendationEngine = new RecommendationEngine();

// Helper function to get user profile (exported for use in API)
export async function getUserProfile(userId: number): Promise<UserProfile> {
    return recommendationEngine.getUserProfile(userId);
}