-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RESOURCE_UPLOAD', 'COURSE_CREATION', 'COMMENT_HELPFUL', 'DISCUSSION_PARTICIPATION', 'UPVOTE_RECEIVED', 'EXPERT_ENDORSEMENT', 'DAILY_LOGIN', 'THREAD_CREATION', 'POST_CREATION', 'RESOURCE_COMMENT', 'PEER_HELP', 'QUALITY_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('LEARNING', 'SOCIAL', 'QUALITY', 'CONSISTENCY', 'MILESTONE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'HELPFUL', 'EXPERT_APPROVAL', 'QUALITY_CONTENT');

-- CreateEnum
CREATE TYPE "ReputationTier" AS ENUM ('NEWCOMER', 'CONTRIBUTOR', 'VALUED_MEMBER', 'COMMUNITY_LEADER', 'EXPERT_CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('MERIT', 'ROLE', 'EXPERT', 'ACHIEVEMENT', 'SEASONAL');

-- CreateTable
CREATE TABLE "UserStats" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "reputationTier" "ReputationTier" NOT NULL DEFAULT 'NEWCOMER',
    "resourceUploads" INTEGER NOT NULL DEFAULT 0,
    "threadsCreated" INTEGER NOT NULL DEFAULT 0,
    "postsCreated" INTEGER NOT NULL DEFAULT 0,
    "commentsCreated" INTEGER NOT NULL DEFAULT 0,
    "upvotesReceived" INTEGER NOT NULL DEFAULT 0,
    "expertEndorsements" INTEGER NOT NULL DEFAULT 0,
    "averageContentRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "loginStreak" INTEGER NOT NULL DEFAULT 0,
    "longestLoginStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" TIMESTAMP(3),
    "totalLoginDays" INTEGER NOT NULL DEFAULT 0,
    "peersHelped" INTEGER NOT NULL DEFAULT 0,
    "mentorshipPoints" INTEGER NOT NULL DEFAULT 0,
    "collaborationScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "reputationGained" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "resourceId" INTEGER,
    "threadId" INTEGER,
    "postId" INTEGER,
    "targetUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "tier" "AchievementTier" NOT NULL DEFAULT 'BRONZE',
    "iconUrl" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "reputationReward" INTEGER NOT NULL DEFAULT 0,
    "requiredActions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "seasonStartDate" TIMESTAMP(3),
    "seasonEndDate" TIMESTAMP(3),
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVote" (
    "id" SERIAL NOT NULL,
    "voterId" INTEGER NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "voteWeight" INTEGER NOT NULL DEFAULT 1,
    "resourceId" INTEGER,
    "postId" INTEGER,
    "commentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "requiredActivity" "ActivityType" NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "xpReward" INTEGER NOT NULL DEFAULT 5,
    "reputationReward" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallengeCompletion" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "iconUrl" TEXT,
    "color" TEXT,
    "requiredLevel" INTEGER,
    "requiredReputation" INTEGER,
    "requiredAchievements" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRare" BOOLEAN NOT NULL DEFAULT false,
    "maxHolders" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "badgeId" INTEGER NOT NULL,
    "awardedBy" INTEGER,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

-- CreateIndex
CREATE INDEX "UserStats_reputationScore_idx" ON "UserStats"("reputationScore");

-- CreateIndex
CREATE INDEX "UserStats_currentLevel_idx" ON "UserStats"("currentLevel");

-- CreateIndex
CREATE INDEX "UserStats_reputationTier_idx" ON "UserStats"("reputationTier");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_idx" ON "ActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_name_key" ON "Achievement"("name");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");

-- CreateIndex
CREATE INDEX "Achievement_tier_idx" ON "Achievement"("tier");

-- CreateIndex
CREATE INDEX "Achievement_isActive_idx" ON "Achievement"("isActive");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE INDEX "UserAchievement_unlockedAt_idx" ON "UserAchievement"("unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "ContentVote_voterId_idx" ON "ContentVote"("voterId");

-- CreateIndex
CREATE INDEX "ContentVote_voteType_idx" ON "ContentVote"("voteType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVote_voterId_resourceId_voteType_key" ON "ContentVote"("voterId", "resourceId", "voteType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVote_voterId_postId_voteType_key" ON "ContentVote"("voterId", "postId", "voteType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVote_voterId_commentId_voteType_key" ON "ContentVote"("voterId", "commentId", "voteType");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_category_period_rank_idx" ON "LeaderboardEntry"("category", "period", "rank");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_departmentId_idx" ON "LeaderboardEntry"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_category_period_key" ON "LeaderboardEntry"("userId", "category", "period");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_targetDate_key" ON "DailyChallenge"("targetDate");

-- CreateIndex
CREATE INDEX "DailyChallenge_targetDate_idx" ON "DailyChallenge"("targetDate");

-- CreateIndex
CREATE INDEX "DailyChallenge_isActive_idx" ON "DailyChallenge"("isActive");

-- CreateIndex
CREATE INDEX "DailyChallengeCompletion_userId_idx" ON "DailyChallengeCompletion"("userId");

-- CreateIndex
CREATE INDEX "DailyChallengeCompletion_completedAt_idx" ON "DailyChallengeCompletion"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeCompletion_userId_challengeId_key" ON "DailyChallengeCompletion"("userId", "challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE INDEX "Badge_type_idx" ON "Badge"("type");

-- CreateIndex
CREATE INDEX "Badge_isActive_idx" ON "Badge"("isActive");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_awardedAt_idx" ON "UserBadge"("awardedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVote" ADD CONSTRAINT "ContentVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVote" ADD CONSTRAINT "ContentVote_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVote" ADD CONSTRAINT "ContentVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVote" ADD CONSTRAINT "ContentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ResourceComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
