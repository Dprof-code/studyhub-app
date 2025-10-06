-- CreateTable
CREATE TABLE "learning_content" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_content_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "learning_content" ADD CONSTRAINT "learning_content_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
