-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "aiProcessingStatus" "ProcessingStatus",
ADD COLUMN     "isPastQuestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ragContent" TEXT;

-- CreateTable
CREATE TABLE "ExtractedQuestion" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionNumber" TEXT,
    "marks" INTEGER,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "aiAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "parentConceptId" INTEGER,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionConcept" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "conceptId" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isMainConcept" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptResource" (
    "id" SERIAL NOT NULL,
    "conceptId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "extractedContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProcessingJob" (
    "id" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractedQuestion_resourceId_idx" ON "ExtractedQuestion"("resourceId");

-- CreateIndex
CREATE INDEX "ExtractedQuestion_difficulty_idx" ON "ExtractedQuestion"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_name_key" ON "Concept"("name");

-- CreateIndex
CREATE INDEX "Concept_category_idx" ON "Concept"("category");

-- CreateIndex
CREATE INDEX "Concept_parentConceptId_idx" ON "Concept"("parentConceptId");

-- CreateIndex
CREATE INDEX "QuestionConcept_questionId_idx" ON "QuestionConcept"("questionId");

-- CreateIndex
CREATE INDEX "QuestionConcept_conceptId_idx" ON "QuestionConcept"("conceptId");

-- CreateIndex
CREATE INDEX "QuestionConcept_confidence_idx" ON "QuestionConcept"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionConcept_questionId_conceptId_key" ON "QuestionConcept"("questionId", "conceptId");

-- CreateIndex
CREATE INDEX "ConceptResource_conceptId_idx" ON "ConceptResource"("conceptId");

-- CreateIndex
CREATE INDEX "ConceptResource_resourceId_idx" ON "ConceptResource"("resourceId");

-- CreateIndex
CREATE INDEX "ConceptResource_relevanceScore_idx" ON "ConceptResource"("relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptResource_conceptId_resourceId_key" ON "ConceptResource"("conceptId", "resourceId");

-- CreateIndex
CREATE INDEX "AIProcessingJob_resourceId_idx" ON "AIProcessingJob"("resourceId");

-- CreateIndex
CREATE INDEX "AIProcessingJob_status_idx" ON "AIProcessingJob"("status");

-- CreateIndex
CREATE INDEX "AIProcessingJob_createdAt_idx" ON "AIProcessingJob"("createdAt");

-- AddForeignKey
ALTER TABLE "ExtractedQuestion" ADD CONSTRAINT "ExtractedQuestion_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_parentConceptId_fkey" FOREIGN KEY ("parentConceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionConcept" ADD CONSTRAINT "QuestionConcept_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExtractedQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionConcept" ADD CONSTRAINT "QuestionConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptResource" ADD CONSTRAINT "ConceptResource_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptResource" ADD CONSTRAINT "ConceptResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProcessingJob" ADD CONSTRAINT "AIProcessingJob_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
