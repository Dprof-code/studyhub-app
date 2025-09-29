-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'RESOURCE_DOWNLOAD';

-- CreateTable
CREATE TABLE "course_analyses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "analysisType" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "insights" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_analyses_userId_idx" ON "course_analyses"("userId");

-- CreateIndex
CREATE INDEX "course_analyses_courseId_idx" ON "course_analyses"("courseId");

-- CreateIndex
CREATE INDEX "course_analyses_analysisType_idx" ON "course_analyses"("analysisType");

-- CreateIndex
CREATE INDEX "course_analyses_createdAt_idx" ON "course_analyses"("createdAt");

-- AddForeignKey
ALTER TABLE "course_analyses" ADD CONSTRAINT "course_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_analyses" ADD CONSTRAINT "course_analyses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
