# Phase 2: AI-Powered Past Questions Analysis & RAG System - AI Integration & File Processing

## 🎯 Overview

This document provides a comprehensive implementation guide for Phase 2 of the AI-Powered Past Questions Analysis & RAG System. Phase 2 focuses on integrating AI capabilities, implementing robust file processing pipelines, and establishing the foundational RAG (Retrieval-Augmented Generation) system that will power intelligent question analysis and content understanding.

## 📋 Implementation Scope

### Core Objectives

1. **Gemini AI Integration**: Complete integration with Google's Gemini AI API for question extraction and concept identification
2. **File Processing Pipeline**: Robust document processing supporting PDF, image, and text files with OCR capabilities
3. **RAG System Foundation**: Vector-based knowledge base with semantic search and content retrieval
4. **AI Processing Engine**: Intelligent question extraction, concept mapping, and resource matching
5. **Performance Optimization**: Efficient processing workflows with caching and batch operations

## 🤖 AI Integration Architecture

### 1. Gemini AI Service Layer

**Purpose**: Central service for all AI operations using Google's Gemini API for advanced language understanding.

```typescript
// /src/lib/ai/gemini-service.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

interface QuestionExtractionResult {
  questions: ExtractedQuestion[];
  confidence: number;
  processingTime: number;
  metadata: {
    documentType: string;
    totalQuestions: number;
    averageConfidence: number;
  };
}

interface ConceptIdentificationResult {
  concepts: IdentifiedConcept[];
  conceptHierarchy: ConceptHierarchy[];
  confidence: number;
  reasoning: string;
}

interface ResourceMatchingResult {
  matches: ResourceMatch[];
  totalMatches: number;
  averageRelevance: number;
  searchQuery: string;
}

class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private prisma: PrismaClient;
  private cache: Map<string, any>;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent results
        maxOutputTokens: 8192,
        topP: 0.8,
        topK: 40,
      },
    });
    this.prisma = new PrismaClient();
    this.cache = new Map();
  }

  /**
   * Initialize AI service with configuration and validation
   */
  async initialize(): Promise<void> {
    try {
      // Validate API connection
      await this.validateAPIConnection();

      // Load processing templates
      await this.loadPromptTemplates();

      // Initialize caching system
      this.initializeCache();

      console.log("Gemini AI Service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Gemini AI Service:", error);
      throw new Error("AI Service initialization failed");
    }
  }

  /**
   * Extract questions from document text using AI
   */
  async extractQuestionsFromText(
    text: string,
    documentMetadata: DocumentMetadata
  ): Promise<QuestionExtractionResult> {
    const startTime = Date.now();

    try {
      // Create cache key
      const cacheKey = this.generateCacheKey(
        "extract_questions",
        text,
        documentMetadata
      );

      // Check cache first
      if (this.cache.has(cacheKey)) {
        console.log("Returning cached question extraction result");
        return this.cache.get(cacheKey);
      }

      // Prepare extraction prompt
      const prompt = this.buildQuestionExtractionPrompt(text, documentMetadata);

      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      // Parse AI response
      const extractedData = await this.parseQuestionExtractionResponse(
        generatedText
      );

      // Validate extracted questions
      const validatedQuestions = await this.validateExtractedQuestions(
        extractedData.questions
      );

      // Calculate confidence scores
      const confidence = this.calculateExtractionConfidence(
        validatedQuestions,
        text
      );

      // Prepare result
      const extractionResult: QuestionExtractionResult = {
        questions: validatedQuestions,
        confidence,
        processingTime: Date.now() - startTime,
        metadata: {
          documentType: documentMetadata.type,
          totalQuestions: validatedQuestions.length,
          averageConfidence:
            validatedQuestions.reduce((sum, q) => sum + q.confidence, 0) /
            validatedQuestions.length,
        },
      };

      // Cache result
      this.cache.set(cacheKey, extractionResult);

      return extractionResult;
    } catch (error) {
      console.error("Question extraction failed:", error);
      throw new Error(`Question extraction failed: ${error.message}`);
    }
  }

  /**
   * Identify academic concepts from extracted questions
   */
  async identifyQuestionConcepts(
    questions: ExtractedQuestion[],
    courseContext?: CourseContext
  ): Promise<ConceptIdentificationResult> {
    try {
      const cacheKey = this.generateCacheKey(
        "identify_concepts",
        questions,
        courseContext
      );

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Build concept identification prompt
      const prompt = this.buildConceptIdentificationPrompt(
        questions,
        courseContext
      );

      // Process with AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      // Parse concept identification response
      const conceptData = await this.parseConceptIdentificationResponse(
        generatedText
      );

      // Enrich concepts with database information
      const enrichedConcepts = await this.enrichConceptsWithDatabase(
        conceptData.concepts
      );

      // Build concept hierarchy
      const hierarchy = await this.buildConceptHierarchy(enrichedConcepts);

      const identificationResult: ConceptIdentificationResult = {
        concepts: enrichedConcepts,
        conceptHierarchy: hierarchy,
        confidence: conceptData.confidence,
        reasoning: conceptData.reasoning,
      };

      this.cache.set(cacheKey, identificationResult);
      return identificationResult;
    } catch (error) {
      console.error("Concept identification failed:", error);
      throw new Error(`Concept identification failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive concept summaries using AI
   */
  async generateConceptSummaries(
    concepts: IdentifiedConcept[]
  ): Promise<ConceptSummary[]> {
    try {
      const summaries: ConceptSummary[] = [];

      // Process concepts in batches to avoid API limits
      const batchSize = 5;
      for (let i = 0; i < concepts.length; i += batchSize) {
        const batch = concepts.slice(i, i + batchSize);
        const batchSummaries = await this.processSummaryBatch(batch);
        summaries.push(...batchSummaries);
      }

      return summaries;
    } catch (error) {
      console.error("Concept summary generation failed:", error);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  /**
   * Match identified concepts with existing platform resources
   */
  async matchResourcesWithConcepts(
    concepts: IdentifiedConcept[],
    courseId?: number
  ): Promise<ResourceMatchingResult> {
    try {
      const cacheKey = this.generateCacheKey(
        "match_resources",
        concepts,
        courseId
      );

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Get available resources
      const availableResources = await this.getAvailableResources(courseId);

      // Generate semantic search queries for each concept
      const searchQueries = await this.generateSemanticSearchQueries(concepts);

      // Perform semantic matching
      const matches: ResourceMatch[] = [];

      for (const concept of concepts) {
        const conceptMatches = await this.findMatchingResources(
          concept,
          availableResources,
          searchQueries[concept.id]
        );
        matches.push(...conceptMatches);
      }

      // Rank and filter matches
      const rankedMatches = this.rankResourceMatches(matches);
      const filteredMatches = this.filterLowQualityMatches(rankedMatches);

      const matchingResult: ResourceMatchingResult = {
        matches: filteredMatches,
        totalMatches: filteredMatches.length,
        averageRelevance:
          filteredMatches.reduce((sum, m) => sum + m.relevanceScore, 0) /
          filteredMatches.length,
        searchQuery: searchQueries.map((q) => q.query).join(" OR "),
      };

      this.cache.set(cacheKey, matchingResult);
      return matchingResult;
    } catch (error) {
      console.error("Resource matching failed:", error);
      throw new Error(`Resource matching failed: ${error.message}`);
    }
  }

  /**
   * Generate personalized study recommendations
   */
  async generateStudyRecommendations(
    questions: ExtractedQuestion[],
    concepts: IdentifiedConcept[],
    userProfile: UserProfile
  ): Promise<StudyRecommendation[]> {
    try {
      // Analyze question difficulty patterns
      const difficultyAnalysis = this.analyzeDifficultyPatterns(questions);

      // Identify knowledge gaps
      const knowledgeGaps = await this.identifyKnowledgeGaps(
        concepts,
        userProfile
      );

      // Generate recommendation prompt
      const prompt = this.buildStudyRecommendationPrompt(
        questions,
        concepts,
        difficultyAnalysis,
        knowledgeGaps,
        userProfile
      );

      // Process with AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      // Parse recommendations
      const recommendations = await this.parseStudyRecommendations(
        generatedText
      );

      // Enrich with resource links
      const enrichedRecommendations =
        await this.enrichRecommendationsWithResources(recommendations);

      return enrichedRecommendations;
    } catch (error) {
      console.error("Study recommendation generation failed:", error);
      throw new Error(
        `Study recommendation generation failed: ${error.message}`
      );
    }
  }

  // Private helper methods
  private async validateAPIConnection(): Promise<void> {
    try {
      const testPrompt =
        "Test connection. Respond with 'OK' if you receive this message.";
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();

      if (!text.includes("OK")) {
        throw new Error("API connection validation failed");
      }
    } catch (error) {
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  private async loadPromptTemplates(): Promise<void> {
    // Load and validate prompt templates from configuration
    this.promptTemplates = {
      questionExtraction: await this.loadTemplate("question-extraction"),
      conceptIdentification: await this.loadTemplate("concept-identification"),
      resourceMatching: await this.loadTemplate("resource-matching"),
      studyRecommendation: await this.loadTemplate("study-recommendation"),
    };
  }

  private buildQuestionExtractionPrompt(
    text: string,
    metadata: DocumentMetadata
  ): string {
    return `
    You are an expert educational content analyzer. Extract all questions from the following ${metadata.type} document.

    DOCUMENT CONTEXT:
    - Type: ${metadata.type}
    - Academic Level: ${metadata.academicLevel}
    - Subject: ${metadata.subject}
    - Language: ${metadata.language}

    EXTRACTION REQUIREMENTS:
    1. Identify all questions in the text
    2. Preserve exact question text
    3. Extract question numbers/labels if present
    4. Identify allocated marks if mentioned
    5. Estimate difficulty level (1-5 scale)
    6. Determine question type (multiple choice, essay, calculation, etc.)

    DOCUMENT TEXT:
    ${text}

    Please respond with a JSON array of questions in this format:
    {
      "questions": [
        {
          "questionText": "exact question text",
          "questionNumber": "1(a)" or null,
          "marks": number or null,
          "difficulty": 1-5,
          "questionType": "type",
          "confidence": 0.0-1.0,
          "extractionNotes": "any relevant notes"
        }
      ],
      "metadata": {
        "totalQuestions": number,
        "processingNotes": "overall analysis notes"
      }
    }
    `;
  }

  private buildConceptIdentificationPrompt(
    questions: ExtractedQuestion[],
    context?: CourseContext
  ): string {
    const questionsText = questions
      .map((q, i) => `${i + 1}. ${q.questionText}`)
      .join("\n");

    return `
    You are an expert academic content analyzer. Identify key academic concepts from these questions.

    ${context ? `COURSE CONTEXT: ${context.name} - ${context.description}` : ""}

    QUESTIONS TO ANALYZE:
    ${questionsText}

    IDENTIFICATION REQUIREMENTS:
    1. Identify all academic concepts tested in these questions
    2. Categorize concepts by subject area
    3. Determine concept difficulty and academic level
    4. Identify concept relationships and dependencies
    5. Provide confidence scores for each identification

    Respond with JSON in this format:
    {
      "concepts": [
        {
          "name": "concept name",
          "description": "brief description",
          "category": "subject category",
          "subcategory": "specific area",
          "difficulty": "BEGINNER|INTERMEDIATE|ADVANCED",
          "academicLevel": "level",
          "confidence": 0.0-1.0,
          "keywords": ["related", "keywords"],
          "questionReferences": [question indices that test this concept]
        }
      ],
      "conceptRelationships": [
        {
          "fromConcept": "concept A",
          "toConcept": "concept B",
          "relationship": "PREREQUISITE|BUILDS_ON|RELATED",
          "strength": 0.0-1.0
        }
      ],
      "confidence": 0.0-1.0,
      "reasoning": "overall analysis reasoning"
    }
    `;
  }

  private async parseQuestionExtractionResponse(
    response: string
  ): Promise<any> {
    try {
      // Clean and parse JSON response
      const cleanedResponse = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleanedResponse);

      // Validate structure
      const validationSchema = z.object({
        questions: z.array(
          z.object({
            questionText: z.string(),
            questionNumber: z.string().nullable(),
            marks: z.number().nullable(),
            difficulty: z.number().min(1).max(5),
            questionType: z.string(),
            confidence: z.number().min(0).max(1),
            extractionNotes: z.string().optional(),
          })
        ),
        metadata: z.object({
          totalQuestions: z.number(),
          processingNotes: z.string().optional(),
        }),
      });

      return validationSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse question extraction response:", error);
      throw new Error("Invalid AI response format");
    }
  }

  private generateCacheKey(operation: string, ...args: any[]): string {
    const argsString = JSON.stringify(args);
    const hash = require("crypto")
      .createHash("md5")
      .update(argsString)
      .digest("hex");
    return `${operation}_${hash}`;
  }

  private calculateExtractionConfidence(
    questions: any[],
    originalText: string
  ): number {
    // Implement confidence calculation logic
    const factors = {
      questionCount: Math.min(questions.length / 10, 1), // Normalize to 1
      avgQuestionConfidence:
        questions.reduce((sum, q) => sum + q.confidence, 0) / questions.length,
      textCoverage: this.calculateTextCoverage(questions, originalText),
    };

    return (
      (factors.questionCount +
        factors.avgQuestionConfidence +
        factors.textCoverage) /
      3
    );
  }
}

export { GeminiAIService };
export type {
  QuestionExtractionResult,
  ConceptIdentificationResult,
  ResourceMatchingResult,
};
```

### 2. Document Processing Pipeline

**Purpose**: Robust file processing system supporting multiple document formats with intelligent content extraction.

```typescript
// /src/lib/processing/file-processor.ts

import { promises as fs } from "fs";
import path from "path";
import * as pdfParse from "pdf-parse";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import mammoth from "mammoth";
import { z } from "zod";

interface ProcessingResult {
  extractedText: string;
  metadata: DocumentMetadata;
  confidence: number;
  processingTime: number;
  pages?: PageData[];
  images?: ProcessedImage[];
  structure?: DocumentStructure;
}

interface DocumentMetadata {
  originalName: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  language?: string;
  hasImages: boolean;
  processingMethod: string;
  quality: ProcessingQuality;
}

interface ProcessingOptions {
  performOCR: boolean;
  extractImages: boolean;
  maintainStructure: boolean;
  language: string;
  qualityThreshold: number;
}

class DocumentProcessor {
  private tempDir: string;
  private supportedFormats: Set<string>;
  private processingQueue: Map<string, ProcessingJob>;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp", "processing");
    this.supportedFormats = new Set([
      "pdf",
      "png",
      "jpg",
      "jpeg",
      "gif",
      "bmp",
      "tiff",
      "doc",
      "docx",
      "txt",
      "rtf",
    ]);
    this.processingQueue = new Map();
    this.ensureTempDirectory();
  }

  /**
   * Process uploaded file and extract text content
   */
  async processFile(
    filePath: string,
    options: ProcessingOptions = this.getDefaultOptions()
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const fileExt = path.extname(filePath).toLowerCase().slice(1);

    if (!this.supportedFormats.has(fileExt)) {
      throw new Error(`Unsupported file format: ${fileExt}`);
    }

    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(filePath, fileExt);

      let result: ProcessingResult;

      // Route to appropriate processor
      switch (fileExt) {
        case "pdf":
          result = await this.processPDF(filePath, options, metadata);
          break;
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "bmp":
        case "tiff":
          result = await this.processImage(filePath, options, metadata);
          break;
        case "doc":
        case "docx":
          result = await this.processWordDocument(filePath, options, metadata);
          break;
        case "txt":
          result = await this.processTextFile(filePath, options, metadata);
          break;
        default:
          throw new Error(`No processor available for ${fileExt}`);
      }

      // Post-process extracted text
      result.extractedText = await this.cleanAndStructureText(
        result.extractedText
      );
      result.processingTime = Date.now() - startTime;

      // Validate extraction quality
      await this.validateExtractedContent(result);

      return result;
    } catch (error) {
      console.error(`File processing failed for ${filePath}:`, error);
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF files with intelligent layout detection
   */
  private async processPDF(
    filePath: string,
    options: ProcessingOptions,
    metadata: DocumentMetadata
  ): Promise<ProcessingResult> {
    try {
      const pdfBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);

      let extractedText = pdfData.text;
      let confidence = this.calculateTextConfidence(extractedText);
      const pages: PageData[] = [];

      // If confidence is low and OCR is enabled, fall back to OCR
      if (confidence < options.qualityThreshold && options.performOCR) {
        console.log("PDF text quality low, performing OCR fallback");
        const ocrResult = await this.performPDFOCR(pdfBuffer, options);

        if (ocrResult.confidence > confidence) {
          extractedText = ocrResult.text;
          confidence = ocrResult.confidence;
        }

        pages.push(...ocrResult.pages);
      }

      // Extract document structure if requested
      let structure: DocumentStructure | undefined;
      if (options.maintainStructure) {
        structure = await this.extractDocumentStructure(pdfData, extractedText);
      }

      return {
        extractedText,
        metadata: {
          ...metadata,
          pageCount: pdfData.numpages,
          processingMethod:
            confidence >= options.qualityThreshold ? "text_extraction" : "ocr",
          quality: this.determineProcessingQuality(confidence),
        },
        confidence,
        processingTime: 0, // Will be set by caller
        pages: pages.length > 0 ? pages : undefined,
        structure,
      };
    } catch (error) {
      console.error("PDF processing failed:", error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process image files using OCR
   */
  private async processImage(
    filePath: string,
    options: ProcessingOptions,
    metadata: DocumentMetadata
  ): Promise<ProcessingResult> {
    try {
      // Preprocess image for better OCR results
      const preprocessedPath = await this.preprocessImage(filePath);

      // Perform OCR
      const ocrResult = await Tesseract.recognize(
        preprocessedPath,
        options.language,
        {
          logger: (info) => {
            if (info.status === "recognizing text") {
              console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
            }
          },
        }
      );

      // Extract additional image metadata
      const imageMetadata = await sharp(filePath).metadata();

      return {
        extractedText: ocrResult.data.text,
        metadata: {
          ...metadata,
          processingMethod: "ocr",
          quality: this.determineProcessingQuality(
            ocrResult.data.confidence / 100
          ),
          hasImages: true,
        },
        confidence: ocrResult.data.confidence / 100,
        processingTime: 0,
        images: [
          {
            path: filePath,
            width: imageMetadata.width || 0,
            height: imageMetadata.height || 0,
            format: imageMetadata.format || "unknown",
            confidence: ocrResult.data.confidence / 100,
          },
        ],
      };
    } catch (error) {
      console.error("Image processing failed:", error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Process Microsoft Word documents
   */
  private async processWordDocument(
    filePath: string,
    options: ProcessingOptions,
    metadata: DocumentMetadata
  ): Promise<ProcessingResult> {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });

      let extractedText = result.value;
      const confidence = this.calculateTextConfidence(extractedText);

      // Extract document structure if requested
      let structure: DocumentStructure | undefined;
      if (options.maintainStructure) {
        const htmlResult = await mammoth.convertToHtml({ buffer });
        structure = await this.parseHTMLStructure(htmlResult.value);
      }

      return {
        extractedText,
        metadata: {
          ...metadata,
          processingMethod: "native_extraction",
          quality: this.determineProcessingQuality(confidence),
        },
        confidence,
        processingTime: 0,
        structure,
      };
    } catch (error) {
      console.error("Word document processing failed:", error);
      throw new Error(`Word document processing failed: ${error.message}`);
    }
  }

  /**
   * Clean and structure extracted text
   */
  async cleanAndStructureText(rawText: string): Promise<string> {
    let cleanedText = rawText;

    // Remove excessive whitespace
    cleanedText = cleanedText.replace(/\s+/g, " ");

    // Fix common OCR errors
    cleanedText = this.fixOCRErrors(cleanedText);

    // Normalize line breaks
    cleanedText = cleanedText.replace(/\r\n/g, "\n");

    // Remove headers/footers if detected
    cleanedText = this.removeHeadersFooters(cleanedText);

    // Structure questions if detected
    cleanedText = await this.structureQuestions(cleanedText);

    return cleanedText.trim();
  }

  /**
   * Validate extracted content quality
   */
  private async validateExtractedContent(
    result: ProcessingResult
  ): Promise<void> {
    const validation = {
      hasMinimumLength: result.extractedText.length >= 10,
      hasReadableContent: this.hasReadableContent(result.extractedText),
      meetsQualityThreshold: result.confidence >= 0.7,
      containsQuestions: this.likelyContainsQuestions(result.extractedText),
    };

    const validationScore =
      Object.values(validation).filter(Boolean).length / 4;

    if (validationScore < 0.5) {
      console.warn("Extracted content quality is low:", validation);
    }

    // Update result metadata with validation info
    result.metadata.quality = {
      ...result.metadata.quality,
      validationScore,
      validationDetails: validation,
    };
  }

  // Helper Methods
  private async preprocessImage(imagePath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, `processed_${Date.now()}.png`);

    await sharp(imagePath)
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .normalize()
      .sharpen()
      .grayscale()
      .png({ quality: 90 })
      .toFile(outputPath);

    return outputPath;
  }

  private fixOCRErrors(text: string): string {
    // Common OCR error patterns and fixes
    const corrections = {
      rn: "m",
      vv: "w",
      "0": "o", // In word contexts
      "5": "s", // In word contexts
      "1": "l", // In word contexts
      "|": "I",
    };

    let correctedText = text;

    // Apply context-aware corrections
    for (const [error, correction] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b\\w*${error}\\w*\\b`, "g");
      correctedText = correctedText.replace(regex, (match) => {
        // Only apply correction if it makes sense in context
        if (this.shouldApplyCorrection(match, error, correction)) {
          return match.replace(error, correction);
        }
        return match;
      });
    }

    return correctedText;
  }

  private likelyContainsQuestions(text: string): boolean {
    const questionPatterns = [
      /^\d+\.?\s+/m, // Numbered questions
      /^\([a-z]\)\s+/m, // Lettered sub-questions
      /\?\s*$/m, // Questions ending with ?
      /explain|describe|calculate|find|determine|solve|what|how|why/i,
    ];

    return questionPatterns.some((pattern) => pattern.test(text));
  }

  private calculateTextConfidence(text: string): number {
    const factors = {
      length: Math.min(text.length / 1000, 1),
      readability: this.calculateReadabilityScore(text),
      structure: this.calculateStructureScore(text),
      questionContent: this.likelyContainsQuestions(text) ? 1 : 0.5,
    };

    return Object.values(factors).reduce((sum, factor) => sum + factor, 0) / 4;
  }

  private getDefaultOptions(): ProcessingOptions {
    return {
      performOCR: true,
      extractImages: false,
      maintainStructure: true,
      language: "eng",
      qualityThreshold: 0.7,
    };
  }
}

export { DocumentProcessor };
export type { ProcessingResult, DocumentMetadata, ProcessingOptions };
```

### 3. RAG System Foundation

**Purpose**: Vector-based knowledge base with semantic search capabilities for intelligent content retrieval.

```typescript
// /src/lib/rag/knowledge-base.ts

import { OpenAI } from "openai";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

interface RAGDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embeddings?: number[];
  chunks?: DocumentChunk[];
}

interface DocumentChunk {
  id: string;
  content: string;
  embeddings: number[];
  metadata: ChunkMetadata;
  parentDocumentId: string;
}

interface SearchResult {
  documents: RAGDocument[];
  totalResults: number;
  searchQuery: string;
  processingTime: number;
  relevanceScores: number[];
}

interface ContextualAnswer {
  answer: string;
  confidence: number;
  sources: DocumentReference[];
  context: string[];
  reasoning: string;
}

class RAGKnowledgeBase {
  private openai: OpenAI;
  private pinecone: PineconeClient;
  private prisma: PrismaClient;
  private index: any;
  private embeddingModel: string;
  private maxChunkSize: number;
  private chunkOverlap: number;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.pinecone = new PineconeClient();
    this.prisma = new PrismaClient();
    this.embeddingModel = "text-embedding-ada-002";
    this.maxChunkSize = 1000;
    this.chunkOverlap = 200;
  }

  /**
   * Initialize RAG system with vector database
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Pinecone
      await this.pinecone.init({
        environment: process.env.PINECONE_ENVIRONMENT!,
        apiKey: process.env.PINECONE_API_KEY!,
      });

      // Get or create index
      const indexName = "studyhub-knowledge-base";
      this.index = this.pinecone.Index(indexName);

      console.log("RAG Knowledge Base initialized successfully");
    } catch (error) {
      console.error("Failed to initialize RAG system:", error);
      throw new Error("RAG system initialization failed");
    }
  }

  /**
   * Index resource content for semantic search
   */
  async indexResourceContent(
    resourceId: number,
    content: string,
    metadata: DocumentMetadata
  ): Promise<void> {
    try {
      // Chunk the content
      const chunks = await this.chunkContent(content);

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await this.generateChunkEmbeddings(
        chunks,
        resourceId
      );

      // Store in vector database
      await this.storeInVectorDB(chunksWithEmbeddings, resourceId, metadata);

      // Update database with RAG metadata
      await this.updateResourceRAGStatus(resourceId, {
        ragContent: content,
        ragLastUpdated: new Date(),
        ragMetadata: {
          chunkCount: chunks.length,
          totalTokens: content.length / 4, // Rough estimate
          indexingMethod: "openai_embeddings",
        },
      });

      console.log(
        `Successfully indexed resource ${resourceId} with ${chunks.length} chunks`
      );
    } catch (error) {
      console.error(`Failed to index resource ${resourceId}:`, error);
      throw new Error(`Resource indexing failed: ${error.message}`);
    }
  }

  /**
   * Search for similar content using semantic search
   */
  async searchSimilarContent(
    query: string,
    filters: SearchFilters = {},
    limit: number = 10
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Search vector database
      const vectorResults = await this.index.query({
        queryRequest: {
          vector: queryEmbedding,
          topK: limit * 2, // Get more results for filtering
          includeMetadata: true,
          filter: this.buildPineconeFilters(filters),
        },
      });

      // Process and rank results
      const processedResults = await this.processSearchResults(
        vectorResults.matches
      );

      // Get full document content
      const documents = await this.enrichResultsWithContent(processedResults);

      return {
        documents: documents.slice(0, limit),
        totalResults: vectorResults.matches.length,
        searchQuery: query,
        processingTime: Date.now() - startTime,
        relevanceScores: documents.map((doc) => doc.relevanceScore),
      };
    } catch (error) {
      console.error("Semantic search failed:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Generate contextual answers using RAG
   */
  async generateContextualAnswers(
    question: string,
    context: SearchFilters = {}
  ): Promise<ContextualAnswer> {
    try {
      // Search for relevant context
      const searchResults = await this.searchSimilarContent(
        question,
        context,
        5
      );

      if (searchResults.documents.length === 0) {
        throw new Error("No relevant context found for the question");
      }

      // Prepare context for AI
      const relevantContext = searchResults.documents
        .map((doc) => doc.content)
        .join("\n\n");

      // Generate answer using context
      const answer = await this.generateAnswerWithContext(
        question,
        relevantContext
      );

      // Calculate confidence based on context relevance
      const confidence = this.calculateAnswerConfidence(
        answer,
        relevantContext,
        searchResults.relevanceScores
      );

      return {
        answer: answer.text,
        confidence,
        sources: searchResults.documents.map((doc) => ({
          resourceId: doc.resourceId,
          title: doc.metadata.title,
          relevance: doc.relevanceScore,
        })),
        context: searchResults.documents.map((doc) =>
          doc.content.substring(0, 200)
        ),
        reasoning: answer.reasoning,
      };
    } catch (error) {
      console.error("Contextual answer generation failed:", error);
      throw new Error(`Answer generation failed: ${error.message}`);
    }
  }

  /**
   * Update knowledge base with new content
   */
  async updateKnowledgeBase(resourceId: number): Promise<void> {
    try {
      // Get resource content
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          extractedQuestions: true,
          conceptMappings: true,
        },
      });

      if (!resource) {
        throw new Error(`Resource ${resourceId} not found`);
      }

      // Remove old entries
      await this.removeFromIndex(resourceId);

      // Re-index with updated content
      if (resource.ragContent) {
        await this.indexResourceContent(resourceId, resource.ragContent, {
          title: resource.title,
          type: resource.type,
          uploadedAt: resource.uploadedAt,
          courseId: resource.courseId,
        });
      }

      console.log(`Updated knowledge base for resource ${resourceId}`);
    } catch (error) {
      console.error(
        `Knowledge base update failed for resource ${resourceId}:`,
        error
      );
      throw new Error(`Knowledge base update failed: ${error.message}`);
    }
  }

  // Private Methods
  private async chunkContent(content: string): Promise<string[]> {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+\s+/);

    let currentChunk = "";

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + sentence + ". ";

      if (
        potentialChunk.length > this.maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk);
        currentChunk = overlapSentences + sentence + ". ";
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 50); // Filter out very short chunks
  }

  private async generateChunkEmbeddings(
    chunks: string[],
    resourceId: number
  ): Promise<DocumentChunk[]> {
    const chunksWithEmbeddings: DocumentChunk[] = [];

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      try {
        const embeddings = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: batch,
        });

        for (let j = 0; j < batch.length; j++) {
          chunksWithEmbeddings.push({
            id: `${resourceId}_chunk_${i + j}`,
            content: batch[j],
            embeddings: embeddings.data[j].embedding,
            metadata: {
              chunkIndex: i + j,
              chunkLength: batch[j].length,
              resourceId,
            },
            parentDocumentId: resourceId.toString(),
          });
        }

        // Rate limiting
        await this.sleep(100);
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i}:`, error);
        throw error;
      }
    }

    return chunksWithEmbeddings;
  }

  private async storeInVectorDB(
    chunks: DocumentChunk[],
    resourceId: number,
    metadata: DocumentMetadata
  ): Promise<void> {
    try {
      const vectors = chunks.map((chunk) => ({
        id: chunk.id,
        values: chunk.embeddings,
        metadata: {
          resourceId,
          content: chunk.content,
          chunkIndex: chunk.metadata.chunkIndex,
          title: metadata.title,
          type: metadata.type,
          uploadedAt: metadata.uploadedAt.toISOString(),
          courseId: metadata.courseId,
        },
      }));

      // Upsert vectors in batches
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.upsert({ upsertRequest: { vectors: batch } });
      }
    } catch (error) {
      console.error("Failed to store vectors in database:", error);
      throw error;
    }
  }

  private async generateAnswerWithContext(
    question: string,
    context: string
  ): Promise<{ text: string; reasoning: string }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert educational assistant. Answer questions based on the provided context. 
                     If the context doesn't contain enough information, say so. 
                     Provide clear, accurate, and helpful explanations.`,
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${question}\n\nPlease provide a detailed answer based on the context above.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return {
        text: completion.choices[0].message.content || "",
        reasoning: `Answer generated based on ${context.length} characters of relevant context`,
      };
    } catch (error) {
      console.error("Failed to generate answer:", error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { RAGKnowledgeBase };
export type { RAGDocument, SearchResult, ContextualAnswer };
```

## 🔧 Integration Architecture

### API Service Layer Pattern

```typescript
// /src/lib/ai/ai-service-coordinator.ts

class AIServiceCoordinator {
  private geminiService: GeminiAIService;
  private documentProcessor: DocumentProcessor;
  private ragKnowledgeBase: RAGKnowledgeBase;
  private jobQueue: AIProcessingQueue;

  async processUploadedDocument(
    resourceId: number,
    filePath: string,
    options: ProcessingOptions
  ): Promise<ProcessingJobResult> {
    // 1. Process document to extract text
    const processingResult = await this.documentProcessor.processFile(
      filePath,
      options
    );

    // 2. Extract questions using AI
    const extractionResult = await this.geminiService.extractQuestionsFromText(
      processingResult.extractedText,
      processingResult.metadata
    );

    // 3. Identify concepts
    const conceptResult = await this.geminiService.identifyQuestionConcepts(
      extractionResult.questions
    );

    // 4. Match with existing resources
    const matchingResult = await this.geminiService.matchResourcesWithConcepts(
      conceptResult.concepts,
      resourceId
    );

    // 5. Index content in RAG system
    await this.ragKnowledgeBase.indexResourceContent(
      resourceId,
      processingResult.extractedText,
      processingResult.metadata
    );

    // 6. Store results in database
    await this.storeProcessingResults(resourceId, {
      extractionResult,
      conceptResult,
      matchingResult,
      processingResult,
    });

    return {
      resourceId,
      questionsExtracted: extractionResult.questions.length,
      conceptsIdentified: conceptResult.concepts.length,
      resourcesMatched: matchingResult.matches.length,
      processingTime: Date.now() - startTime,
      status: "COMPLETED",
    };
  }
}
```

## 📊 Performance Optimization

### Caching Strategy

```typescript
// /src/lib/cache/ai-cache-manager.ts

class AICacheManager {
  private redis: Redis;
  private memoryCache: Map<string, any>;
  private cachePolicy: CachePolicy;

  // Multi-tier caching
  async getCachedResult(key: string): Promise<any> {
    // 1. Check memory cache (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // 2. Check Redis cache
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      this.memoryCache.set(key, parsed); // Promote to memory
      return parsed;
    }

    return null;
  }

  async setCachedResult(key: string, value: any, ttl: number): Promise<void> {
    // Store in both caches
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Batch Processing

```typescript
// /src/lib/processing/batch-processor.ts

class BatchProcessor {
  async processBatch(items: ProcessingItem[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item) => this.processItem(item))
      );
      results.push(...batchResults);

      // Rate limiting between batches
      if (i + batchSize < items.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }
}
```

## 🧪 Testing Framework

### Integration Tests

```typescript
// /src/tests/integration/ai-processing.test.ts

describe("AI Processing Integration", () => {
  let aiService: GeminiAIService;
  let processor: DocumentProcessor;
  let ragSystem: RAGKnowledgeBase;

  beforeAll(async () => {
    aiService = new GeminiAIService();
    processor = new DocumentProcessor();
    ragSystem = new RAGKnowledgeBase();

    await aiService.initialize();
    await ragSystem.initialize();
  });

  test("should process PDF and extract questions", async () => {
    const testPDFPath = "./test-files/sample-questions.pdf";

    // Process document
    const processingResult = await processor.processFile(testPDFPath);
    expect(processingResult.extractedText).toBeDefined();
    expect(processingResult.confidence).toBeGreaterThan(0.7);

    // Extract questions
    const extractionResult = await aiService.extractQuestionsFromText(
      processingResult.extractedText,
      processingResult.metadata
    );

    expect(extractionResult.questions.length).toBeGreaterThan(0);
    expect(extractionResult.confidence).toBeGreaterThan(0.7);
  });

  test("should identify concepts from questions", async () => {
    const sampleQuestions = [
      {
        questionText: "Calculate the derivative of f(x) = x^2 + 3x + 1",
        difficulty: 3,
      },
      {
        questionText: "Solve the quadratic equation 2x^2 - 5x + 3 = 0",
        difficulty: 2,
      },
    ];

    const conceptResult = await aiService.identifyQuestionConcepts(
      sampleQuestions
    );

    expect(conceptResult.concepts.length).toBeGreaterThan(0);
    expect(
      conceptResult.concepts.some((c) =>
        c.name.toLowerCase().includes("derivative")
      )
    ).toBe(true);
    expect(
      conceptResult.concepts.some((c) =>
        c.name.toLowerCase().includes("quadratic")
      )
    ).toBe(true);
  });

  test("should search RAG system effectively", async () => {
    // First index some content
    await ragSystem.indexResourceContent(
      1,
      "Calculus is the mathematical study of continuous change. Derivatives measure rates of change.",
      { title: "Calculus Basics", type: "textbook" }
    );

    // Search for related content
    const searchResult = await ragSystem.searchSimilarContent(
      "What is calculus?"
    );

    expect(searchResult.documents.length).toBeGreaterThan(0);
    expect(searchResult.documents[0].content).toContain("Calculus");
  });
});
```

## ✅ Phase 2 Implementation Checklist

### Core AI Services

- [ ] Implement GeminiAIService with all methods
- [ ] Create DocumentProcessor with multi-format support
- [ ] Build RAG knowledge base with vector search
- [ ] Set up service coordinator for workflow management

### File Processing Pipeline

- [ ] PDF text extraction with OCR fallback
- [ ] Image processing with Tesseract OCR
- [ ] Word document processing with Mammoth
- [ ] Text cleaning and structure detection

### Vector Database Setup

- [ ] Configure Pinecone vector database
- [ ] Implement embedding generation
- [ ] Create efficient chunking strategy
- [ ] Set up semantic search capabilities

### Performance Optimization

- [ ] Multi-tier caching system
- [ ] Batch processing for API calls
- [ ] Rate limiting and error handling
- [ ] Memory management for large documents

### Quality Assurance

- [ ] Confidence scoring for all operations
- [ ] Content validation and error detection
- [ ] Processing quality metrics
- [ ] Fallback mechanisms for low-quality results

### Integration Testing

- [ ] End-to-end processing tests
- [ ] AI accuracy validation
- [ ] Performance benchmarking
- [ ] Error scenario testing

## 🎯 Success Metrics

### Processing Accuracy

- **Question Extraction**: >90% accuracy for well-formatted documents
- **Concept Identification**: >85% precision with >80% recall
- **Resource Matching**: >80% relevance for top-5 results
- **OCR Quality**: >85% character accuracy for clear images

### Performance Targets

- **PDF Processing**: <30 seconds for 10-page documents
- **AI Question Extraction**: <60 seconds for 20 questions
- **Concept Identification**: <45 seconds for 10 concepts
- **RAG Search**: <2 seconds for semantic queries

### System Reliability

- **API Success Rate**: >99% for valid inputs
- **Error Recovery**: Automatic retry with exponential backoff
- **Cache Hit Rate**: >70% for repeated operations
- **Processing Queue**: Handle 100+ concurrent jobs

---

**Phase 2 Implementation Status: Ready for Development**

This comprehensive AI integration and file processing system provides the intelligent foundation needed to transform StudyHub into an advanced educational platform with sophisticated content understanding and personalized learning capabilities.
