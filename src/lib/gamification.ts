// Gamification service for handling XP, reputation, and achievements
import { db } from './dbconfig';
import type {
    ActivityType,
    AchievementCategory,
    ReputationTier,
    VoteType,
    User,
    UserStats
} from '@/generated/prisma';

// Point values for different activities
export const ACTIVITY_POINTS = {
    RESOURCE_UPLOAD: { xp: 15, reputation: 5 },
    COURSE_CREATION: { xp: 25, reputation: 10 },
    COMMENT_HELPFUL: { xp: 8, reputation: 3 },
    DISCUSSION_PARTICIPATION: { xp: 5, reputation: 2 },
    UPVOTE_RECEIVED: { xp: 3, reputation: 1 },
    EXPERT_ENDORSEMENT: { xp: 20, reputation: 8 },
    DAILY_LOGIN: { xp: 2, reputation: 0 },
    THREAD_CREATION: { xp: 10, reputation: 4 },
    POST_CREATION: { xp: 5, reputation: 2 },
    RESOURCE_COMMENT: { xp: 5, reputation: 2 },
    PEER_HELP: { xp: 12, reputation: 5 },
    QUALITY_CONTRIBUTION: { xp: 20, reputation: 8 }
} as const;

// Level thresholds (exponential growth)
export const LEVEL_THRESHOLDS = Array.from({ length: 50 }, (_, i) =>
    Math.floor(100 * Math.pow(1.5, i))
);

// Reputation tier thresholds
export const REPUTATION_TIERS = {
    NEWCOMER: { min: 0, max: 50 },
    CONTRIBUTOR: { min: 51, max: 200 },
    VALUED_MEMBER: { min: 201, max: 500 },
    COMMUNITY_LEADER: { min: 501, max: 1000 },
    EXPERT_CONTRIBUTOR: { min: 1001, max: Infinity }
} as const;

/**
 * Award points and reputation to a user for an activity
 */
export async function awardActivityPoints(
    userId: number,
    activityType: ActivityType,
    context?: {
        resourceId?: number;
        threadId?: number;
        postId?: number;
        targetUserId?: number;
        metadata?: any;
    }
): Promise<{ xpGained: number; reputationGained: number; levelUp?: boolean }> {
    const points = ACTIVITY_POINTS[activityType];

    // Get or create user stats
    let userStats = await db.userStats.findUnique({
        where: { userId }
    });

    if (!userStats) {
        userStats = await db.userStats.create({
            data: { userId }
        });
    }

    const oldLevel = userStats.currentLevel;
    const newXP = userStats.totalXP + points.xp;
    const newReputation = userStats.reputationScore + points.reputation;

    // Calculate new level
    const newLevel = calculateLevel(newXP);
    const levelUp = newLevel > oldLevel;

    // Update user stats
    await db.userStats.update({
        where: { userId },
        data: {
            totalXP: newXP,
            reputationScore: newReputation,
            currentLevel: newLevel,
            reputationTier: calculateReputationTier(newReputation),
            // Update activity counters based on activity type
            ...(activityType === 'RESOURCE_UPLOAD' && { resourceUploads: { increment: 1 } }),
            ...(activityType === 'THREAD_CREATION' && { threadsCreated: { increment: 1 } }),
            ...(activityType === 'POST_CREATION' && { postsCreated: { increment: 1 } }),
            ...(activityType === 'RESOURCE_COMMENT' && { commentsCreated: { increment: 1 } }),
            ...(activityType === 'UPVOTE_RECEIVED' && { upvotesReceived: { increment: 1 } }),
            ...(activityType === 'EXPERT_ENDORSEMENT' && { expertEndorsements: { increment: 1 } }),
            ...(activityType === 'PEER_HELP' && { peersHelped: { increment: 1 } })
        }
    });

    // Log the activity
    await db.activityLog.create({
        data: {
            userId,
            activityType,
            xpGained: points.xp,
            reputationGained: points.reputation,
            description: getActivityDescription(activityType),
            resourceId: context?.resourceId,
            threadId: context?.threadId,
            postId: context?.postId,
            targetUserId: context?.targetUserId,
            metadata: context?.metadata || {}
        }
    });

    // Check for achievement unlocks
    await checkAchievementUnlocks(userId, activityType, userStats);

    return {
        xpGained: points.xp,
        reputationGained: points.reputation,
        levelUp
    };
}

/**
 * Calculate user level based on total XP
 */
export function calculateLevel(totalXP: number): number {
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (totalXP < LEVEL_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 50; // Max level
}

/**
 * Calculate reputation tier based on reputation score
 */
export function calculateReputationTier(reputation: number): ReputationTier {
    if (reputation <= REPUTATION_TIERS.NEWCOMER.max) return 'NEWCOMER';
    if (reputation <= REPUTATION_TIERS.CONTRIBUTOR.max) return 'CONTRIBUTOR';
    if (reputation <= REPUTATION_TIERS.VALUED_MEMBER.max) return 'VALUED_MEMBER';
    if (reputation <= REPUTATION_TIERS.COMMUNITY_LEADER.max) return 'COMMUNITY_LEADER';
    return 'EXPERT_CONTRIBUTOR';
}

/**
 * Get XP required for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= 50) return 0;
    return LEVEL_THRESHOLDS[currentLevel - 1];
}

/**
 * Handle content voting with reputation weighting
 */
export async function handleContentVote(
    voterId: number,
    voteType: VoteType,
    contentType: 'resource' | 'post' | 'comment',
    contentId: number
): Promise<{ success: boolean; message: string }> {
    // Get voter's reputation to determine vote weight
    const voterStats = await db.userStats.findUnique({
        where: { userId: voterId }
    });

    const voteWeight = calculateVoteWeight(voterStats?.reputationScore || 0);

    // Check if user already voted on this content
    const existingVote = await db.contentVote.findFirst({
        where: {
            voterId,
            voteType,
            ...(contentType === 'resource' && { resourceId: contentId }),
            ...(contentType === 'post' && { postId: contentId }),
            ...(contentType === 'comment' && { commentId: contentId })
        }
    });

    if (existingVote) {
        return { success: false, message: 'You have already voted on this content' };
    }

    // Create the vote
    await db.contentVote.create({
        data: {
            voterId,
            voteType,
            voteWeight,
            ...(contentType === 'resource' && { resourceId: contentId }),
            ...(contentType === 'post' && { postId: contentId }),
            ...(contentType === 'comment' && { commentId: contentId })
        }
    });

    // Award points to content creator if it's a positive vote
    if (['UPVOTE', 'HELPFUL', 'QUALITY_CONTENT'].includes(voteType)) {
        let contentCreatorId: number | null = null;

        if (contentType === 'resource') {
            const resource = await db.resource.findUnique({
                where: { id: contentId },
                select: { uploaderId: true }
            });
            contentCreatorId = resource?.uploaderId || null;
        } else if (contentType === 'post') {
            const post = await db.post.findUnique({
                where: { id: contentId },
                select: { authorId: true }
            });
            contentCreatorId = post?.authorId || null;
        } else if (contentType === 'comment') {
            const comment = await db.resourceComment.findUnique({
                where: { id: contentId },
                select: { authorId: true }
            });
            contentCreatorId = comment?.authorId || null;
        }

        if (contentCreatorId && contentCreatorId !== voterId) {
            const activityType = voteType === 'EXPERT_APPROVAL' ? 'EXPERT_ENDORSEMENT' : 'UPVOTE_RECEIVED';
            await awardActivityPoints(contentCreatorId, activityType);
        }
    }

    return { success: true, message: 'Vote recorded successfully' };
}

/**
 * Calculate vote weight based on voter's reputation
 */
function calculateVoteWeight(reputation: number): number {
    if (reputation < 50) return 1;
    if (reputation < 200) return 2;
    if (reputation < 500) return 3;
    if (reputation < 1000) return 4;
    return 5; // Maximum weight for expert contributors
}

/**
 * Check and unlock achievements for a user
 */
async function checkAchievementUnlocks(
    userId: number,
    activityType: ActivityType,
    userStats: UserStats
): Promise<void> {
    // Get all active achievements that the user hasn't unlocked yet
    const achievements = await db.achievement.findMany({
        where: {
            isActive: true,
            NOT: {
                userAchievements: {
                    some: {
                        userId,
                        unlockedAt: { not: null }
                    }
                }
            }
        }
    });

    for (const achievement of achievements) {
        const conditions = achievement.requiredActions as any;
        let shouldUnlock = false;

        // Simple achievement checking logic (can be expanded)
        switch (achievement.category) {
            case 'LEARNING':
                shouldUnlock = checkLearningAchievement(conditions, userStats, activityType);
                break;
            case 'SOCIAL':
                shouldUnlock = checkSocialAchievement(conditions, userStats, activityType);
                break;
            case 'QUALITY':
                shouldUnlock = checkQualityAchievement(conditions, userStats, activityType);
                break;
            case 'CONSISTENCY':
                shouldUnlock = checkConsistencyAchievement(conditions, userStats, activityType);
                break;
            case 'MILESTONE':
                shouldUnlock = checkMilestoneAchievement(conditions, userStats, activityType);
                break;
        }

        if (shouldUnlock) {
            await unlockAchievement(userId, achievement.id);
        }
    }
}

/**
 * Unlock an achievement for a user
 */
async function unlockAchievement(userId: number, achievementId: number): Promise<void> {
    const achievement = await db.achievement.findUnique({
        where: { id: achievementId }
    });

    if (!achievement) return;

    // Create or update user achievement
    await db.userAchievement.upsert({
        where: {
            userId_achievementId: {
                userId,
                achievementId
            }
        },
        create: {
            userId,
            achievementId,
            progress: 1.0,
            unlockedAt: new Date()
        },
        update: {
            progress: 1.0,
            unlockedAt: new Date()
        }
    });

    // Award achievement rewards
    if (achievement.xpReward > 0 || achievement.reputationReward > 0) {
        await db.userStats.update({
            where: { userId },
            data: {
                totalXP: { increment: achievement.xpReward },
                reputationScore: { increment: achievement.reputationReward }
            }
        });
    }
}

// Achievement checking functions
function checkLearningAchievement(conditions: any, stats: UserStats, activity: ActivityType): boolean {
    // Example: First upload achievement
    if (conditions.type === 'first_upload' && activity === 'RESOURCE_UPLOAD' && stats.resourceUploads === 0) {
        return true;
    }
    return false;
}

function checkSocialAchievement(conditions: any, stats: UserStats, activity: ActivityType): boolean {
    // Example: Help 10 peers
    if (conditions.type === 'peer_helper' && stats.peersHelped >= 10) {
        return true;
    }
    return false;
}

function checkQualityAchievement(conditions: any, stats: UserStats, activity: ActivityType): boolean {
    // Example: Receive 50 upvotes
    if (conditions.type === 'popular_contributor' && stats.upvotesReceived >= 50) {
        return true;
    }
    return false;
}

function checkConsistencyAchievement(conditions: any, stats: UserStats, activity: ActivityType): boolean {
    // Example: 7-day login streak
    if (conditions.type === 'weekly_warrior' && stats.loginStreak >= 7) {
        return true;
    }
    return false;
}

function checkMilestoneAchievement(conditions: any, stats: UserStats, activity: ActivityType): boolean {
    // Example: Reach level 10
    if (conditions.type === 'level_milestone' && stats.currentLevel >= conditions.targetLevel) {
        return true;
    }
    return false;
}

/**
 * Get activity description for logging
 */
function getActivityDescription(activityType: ActivityType): string {
    const descriptions = {
        RESOURCE_UPLOAD: 'Uploaded a new resource',
        COURSE_CREATION: 'Created a new course',
        COMMENT_HELPFUL: 'Posted a helpful comment',
        DISCUSSION_PARTICIPATION: 'Participated in discussion',
        UPVOTE_RECEIVED: 'Received an upvote',
        EXPERT_ENDORSEMENT: 'Received expert endorsement',
        DAILY_LOGIN: 'Daily login bonus',
        THREAD_CREATION: 'Created a new thread',
        POST_CREATION: 'Created a new post',
        RESOURCE_COMMENT: 'Commented on a resource',
        PEER_HELP: 'Helped a peer',
        QUALITY_CONTRIBUTION: 'Made a quality contribution'
    };

    return descriptions[activityType];
}

/**
 * Update daily login streak
 */
export async function updateLoginStreak(userId: number): Promise<void> {
    const userStats = await db.userStats.findUnique({
        where: { userId }
    });

    if (!userStats) {
        await db.userStats.create({
            data: { userId }
        });
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLogin = userStats.lastLoginDate;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = 1;

    if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        lastLoginDate.setHours(0, 0, 0, 0);

        if (lastLoginDate.getTime() === yesterday.getTime()) {
            // Consecutive day
            newStreak = userStats.loginStreak + 1;
        } else if (lastLoginDate.getTime() === today.getTime()) {
            // Already logged in today
            return;
        }
        // else: streak broken, start new (newStreak = 1)
    }

    await db.userStats.update({
        where: { userId },
        data: {
            loginStreak: newStreak,
            longestLoginStreak: Math.max(userStats.longestLoginStreak, newStreak),
            lastLoginDate: new Date(),
            totalLoginDays: { increment: 1 }
        }
    });

    // Award daily login points
    await awardActivityPoints(userId, 'DAILY_LOGIN');
}