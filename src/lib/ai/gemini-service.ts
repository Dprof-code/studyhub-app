import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../dbconfig';

interface ExtractedQuestion {
    questionNumber?: string;
    questionText: string;
    marks?: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    concepts: string[];
}

interface ConceptAnalysis {
    name: string;
    confidence: number;
    isMainConcept: boolean;
    description?: string;
    category: string;
}

interface ResourceMatch {
    resourceId: number;
    relevanceScore: number;
    extractedContent?: string;
    reason: string;
}

export class GeminiAIService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;
    private initialized = false;

    constructor() {
        // Don't initialize during construction
    }

    private ensureInitialized() {
        if (!this.initialized) {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY environment variable is required');
            }
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
            this.initialized = true;
        }
    }

    // constructor() {
    //     if (!process.env.GEMINI_API_KEY) {
    //         throw new Error('GEMINI_API_KEY environment variable is required');
    //     }
    //     this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    //     this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    // }

    /**
     * Extract text directly from image using Gemini Vision
     */
    async extractTextFromImage(base64Image: string, mimeType: string): Promise<string> {
        this.ensureInitialized(); // Initialize only when needed
        try {
            // Use Gemini 1.5 model which supports vision natively
            // const visionModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
            const visionModel = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-pro' });

            const prompt = `
You are an expert document text extractor. Extract ALL text from this image, which appears to be an academic document, exam paper, or educational material.

Instructions:
1. Extract every single piece of text visible in the image
2. Maintain the original structure and formatting as much as possible
3. Preserve question numbers, parts (a, b, c), and any numbering
4. Include all instructions, headers, and content
5. If there are mathematical symbols or formulas, describe them clearly
6. If text is unclear or partially obscured, make your best interpretation
7. Do not add any commentary or explanations - just extract the text

Return only the extracted text without any additional formatting or comments.
            `;

            const result = await visionModel.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ]);

            const extractedText = result.response.text();

            if (!extractedText || extractedText.trim().length < 10) {
                throw new Error('Gemini Vision returned insufficient text content');
            }

            console.log(`🧠 Gemini Vision extracted ${extractedText.length} characters from image`);
            return extractedText;

        } catch (error) {
            console.error('❌ Gemini Vision text extraction failed:', error);
            throw new Error(`Vision text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }    /**
     * Extract questions directly from image using Gemini Vision
     */
    async extractQuestionsFromImage(base64Image: string, mimeType: string, courseContext?: string): Promise<ExtractedQuestion[]> {
        this.ensureInitialized();
        try {
            // Use Gemini 1.5 model which supports vision natively
            const visionModel = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `
You are an expert academic question extractor with computer vision capabilities. Analyze this image which appears to be an exam paper, past question paper, or academic test.

Course Context: ${courseContext || 'General Academic'}

Extract individual questions directly from the image and provide detailed analysis in JSON format:

{
  "questions": [
    {
      "questionNumber": "1a" or "Q1" or null if not clear,
      "questionText": "Complete question text exactly as it appears",
      "marks": number or null if not visible,
      "difficulty": "EASY" | "MEDIUM" | "HARD" | "EXPERT",
      "concepts": ["concept1", "concept2", "concept3"],
      "questionType": "multiple_choice" | "short_answer" | "essay" | "calculation" | "diagram" | "other",
      "hasImage": true if question contains diagrams/images,
      "pageSection": "top" | "middle" | "bottom" | "full_page"
    }
  ]
}

Guidelines:
1. Extract each question as a separate, complete entity
2. Include sub-questions as separate entries (e.g., 1a, 1b, 1c)
3. Estimate difficulty based on question complexity, required knowledge depth, and academic level
4. Identify 2-6 key academic concepts per question
5. Detect question types based on structure and requirements
6. Note if questions include diagrams, charts, or visual elements
7. If no clear questions are found, return empty array
8. Focus on actual questions, ignore headers, instructions, or administrative text
9. Preserve exact wording and mathematical notation
10. If marks are in brackets like (5 marks), extract the number

Return only valid JSON without any explanation or markdown formatting.
            `;

            const result = await visionModel.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ]);

            const response = result.response.text();

            // Clean and parse JSON response
            const cleanedResponse = response.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);

            const questions = parsed.questions || [];
            console.log(`🧠 Gemini Vision extracted ${questions.length} questions directly from image`);

            return questions;

        } catch (error) {
            console.error('❌ Gemini Vision question extraction failed:', error);
            throw new Error(`Vision question extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }    /**
     * Extract individual questions from raw text
     */
    async extractQuestionsFromText(rawText: string, courseContext?: string): Promise<ExtractedQuestion[]> {
        const prompt = `
You are an expert academic question extractor. Extract individual questions from the following text which appears to be from a past question paper or exam.

Course Context: ${courseContext || 'General Academic'}

Text to analyze:
${rawText}

Please extract each question and provide the following information in JSON format:

{
  "questions": [
    {
      "questionNumber": "1a" or "Q1" or null if not clear,
      "questionText": "Complete question text",
      "marks": number or null,
      "difficulty": "EASY" | "MEDIUM" | "HARD" | "EXPERT",
      "concepts": ["concept1", "concept2", "concept3"]
    }
  ]
}

Rules:
1. Each question should be complete and self-contained
2. Include sub-questions as separate entries (e.g., 1a, 1b, etc.)
3. Estimate difficulty based on question complexity and academic level
4. Identify 2-5 key concepts per question
5. If no clear question structure is found, return empty array
6. Focus on extracting actual questions, ignore instructions or headers

Return only valid JSON without any explanation.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            // Clean and parse JSON response
            const cleanedResponse = response.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);

            return parsed.questions || [];
        } catch (error) {
            console.error('Error extracting questions:', error);
            throw new Error('Failed to extract questions from text');
        }
    }

    /**
     * Identify and analyze concepts in a question
     */
    async identifyQuestionConcepts(questionText: string, courseContext?: string): Promise<ConceptAnalysis[]> {
        const prompt = `
You are an expert academic concept analyzer. Analyze the following question and identify the key academic concepts it covers.

Course Context: ${courseContext || 'General Academic'}

Question: ${questionText}

Provide analysis in JSON format:

{
  "concepts": [
    {
      "name": "Concept Name",
      "confidence": 0.95,
      "isMainConcept": true,
      "description": "Brief explanation of the concept",
      "category": "Subject Area (e.g., Mathematics, Physics, Computer Science)"
    }
  ]
}

Rules:
1. Confidence should be between 0.0 and 1.0
2. Mark 1-2 concepts as main concepts (isMainConcept: true)
3. Include 3-7 concepts total
4. Use standard academic terminology
5. Provide brief, clear descriptions
6. Categorize by broad subject area

Return only valid JSON without explanation.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            const cleanedResponse = response.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);

            return parsed.concepts || [];
        } catch (error) {
            console.error('Error analyzing concepts:', error);
            throw new Error('Failed to analyze question concepts');
        }
    }

    /**
     * Generate concept summary for learning
     */
    async generateConceptSummary(conceptName: string, context: string = ''): Promise<string> {
        const prompt = `
You are an expert educator. Provide a clear, concise explanation of the following academic concept.

Concept: ${conceptName}
Context: ${context}

Create a summary that includes:
1. Definition (2-3 sentences)
2. Key characteristics or principles
3. Common applications or examples
4. Why it's important to understand

Keep the explanation accessible but academically accurate. Target undergraduate level understanding.
Write in a friendly, educational tone.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('Error generating concept summary:', error);
            throw new Error('Failed to generate concept summary');
        }
    }

    /**
     * Match concepts with existing resources
     */
    async matchResourcesWithConcepts(
        concepts: string[],
        courseId?: number
    ): Promise<ResourceMatch[]> {
        try {
            // Get existing resources from database
            const whereClause: any = {
                isPastQuestion: false // Exclude past question papers from matches
            };

            if (courseId) {
                whereClause.courseId = courseId;
            }

            const existingResources = await db.resource.findMany({
                where: whereClause,
                include: {
                    tags: true,
                    course: {
                        include: {
                            department: true
                        }
                    }
                },
                take: 100 // Limit for performance
            });

            const matches: ResourceMatch[] = [];

            // Use AI to evaluate resource relevance
            for (const resource of existingResources) {
                const resourceContent = `
                    Title: ${resource.title}
                    Description: ${resource.description || ''}
                    Tags: ${resource.tags.map(t => t.name).join(', ')}
                    Course: ${resource.course.title}
                    Department: ${resource.course.department?.name || ''}
                `;

                const relevanceScore = await this.calculateResourceRelevance(
                    concepts,
                    resourceContent
                );

                if (relevanceScore > 0.3) { // Minimum relevance threshold
                    matches.push({
                        resourceId: resource.id,
                        relevanceScore,
                        extractedContent: `${resource.title} - ${resource.description || ''}`.slice(0, 200),
                        reason: `Matches concepts: ${concepts.slice(0, 3).join(', ')}`
                    });
                }
            }

            // Sort by relevance score
            return matches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);

        } catch (error) {
            console.error('Error matching resources:', error);
            return [];
        }
    }

    // method for extracting learning content from educational materials
    async extractLearningContent(
        text: string,
        courseContext: string,
        resourceTags: string[]
    ): Promise<{
        concepts: Array<{
            name: string;
            description: string;
            category: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD';
            confidence: number;
        }>;
        summaries: string[];
        objectives: string[];
        definitions: Array<{
            term: string;
            definition: string;
        }>;
    }> {
        try {
            const resourceType = this.getResourceType(resourceTags);

            const prompt = `
Analyze this ${resourceType} content and extract educational elements:

COURSE CONTEXT: ${courseContext}

CONTENT:
${text}

Extract the following:

1. KEY CONCEPTS: Identify 5-15 main concepts covered
   - Provide name, description, category, difficulty level
   - Rate confidence (0.0-1.0) for each concept

2. CHAPTER/SECTION SUMMARIES: Create 2-5 concise summaries
   - Each summary should be 100-200 words
   - Focus on main ideas and learning outcomes

3. LEARNING OBJECTIVES: Identify what students should learn
   - List 3-10 specific learning objectives
   - Use action verbs (understand, analyze, apply, etc.)

4. KEY DEFINITIONS: Extract important terms and definitions
   - Include technical terms, jargon, and key vocabulary

Return as structured JSON:
{
  "concepts": [
    {
      "name": "concept name",
      "description": "detailed explanation",
      "category": "category (e.g., theory, practical, mathematical)",
      "difficulty": "EASY|MEDIUM|HARD",
      "confidence": 0.9
    }
  ],
  "summaries": ["summary 1", "summary 2"],
  "objectives": ["objective 1", "objective 2"],
  "definitions": [
    {
      "term": "technical term",
      "definition": "clear definition"
    }
  ]
}`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            // Parse and validate JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);

            // Validate and return structured data
            return {
                concepts: analysis.concepts || [],
                summaries: analysis.summaries || [],
                objectives: analysis.objectives || [],
                definitions: analysis.definitions || []
            };

        } catch (error) {
            console.error('Failed to extract learning content:', error);
            throw new Error(`Learning content extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getResourceType(tags: string[]): string {
        if (tags.includes('lecture-note')) return 'lecture note';
        if (tags.includes('concept')) return 'concept explanation';
        if (tags.includes('reference')) return 'reference material';
        if (tags.includes('topic')) return 'topic overview';
        return 'educational content';
    }

    /**
     * Calculate relevance score between concepts and resource
     */
    private async calculateResourceRelevance(
        concepts: string[],
        resourceContent: string
    ): Promise<number> {
        const prompt = `
Analyze how relevant this resource is to the given concepts. Rate relevance from 0.0 to 1.0.

Concepts: ${concepts.join(', ')}

Resource:
${resourceContent}

Consider:
1. Direct topic matches
2. Related subject matter
3. Educational value for these concepts
4. Complementary learning material

Return only a decimal number between 0.0 and 1.0 (e.g., 0.85).
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().trim();
            const score = parseFloat(response);

            return isNaN(score) ? 0.0 : Math.max(0.0, Math.min(1.0, score));
        } catch (error) {
            console.error('Error calculating relevance:', error);
            return 0.0;
        }
    }

    /**
     * Generate study recommendations based on questions
     */
    async generateStudyRecommendations(
        questions: ExtractedQuestion[],
        matchedResources: ResourceMatch[]
    ): Promise<string> {
        const questionsText = questions.map(q =>
            `${q.questionNumber ? q.questionNumber + ': ' : ''}${q.questionText.slice(0, 200)}...`
        ).join('\n');

        const resourcesText = matchedResources.slice(0, 5).map(r =>
            `- ${r.extractedContent} (Relevance: ${(r.relevanceScore * 100).toFixed(0)}%)`
        ).join('\n');

        const prompt = `
You are an expert study advisor. Based on the extracted questions and available resources, create a personalized study plan and recommendations.

Questions from past paper:
${questionsText}

Available resources:
${resourcesText}

Create comprehensive study recommendations including:
1. Study priority order (which concepts to focus on first)
2. Resource utilization strategy
3. Practice recommendations
4. Time allocation suggestions
5. Key concepts to master

Write in a helpful, motivating tone. Be specific and actionable.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('Error generating study recommendations:', error);
            return 'Unable to generate study recommendations at this time. Please try again later.';
        }
    }

    /**
     * Answer a question using RAG-based knowledge
     */
    async answerQuestionWithRAG(
        question: string,
        contextResources: string[],
        courseContext?: string
    ): Promise<string> {
        const context = contextResources.join('\n\n---\n\n');

        const prompt = `
You are an expert tutor. Answer the following question using the provided context from educational resources.

Course Context: ${courseContext || 'General Academic'}

Question: ${question}

Available Resources:
${context}

Instructions:
1. Provide a comprehensive but concise answer
2. Reference specific concepts when relevant
3. Include examples where helpful
4. Mention which resources support your answer
5. If the question can't be fully answered from the context, be honest about limitations

Answer in a clear, educational manner suitable for students.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('Error generating RAG answer:', error);
            throw new Error('Failed to generate answer');
        }
    }

    /**
     * Generate personalized study plan
     */
    async generateStudyPlan(planData: {
        resources: any[],
        userProfile: any,
        timeframe: string,
        goals: string[],
        studyHours: number,
        difficultyLevel: string
    }): Promise<any> {
        const prompt = `
You are an expert study planner. Create a personalized study plan based on the following information:

User Profile:
- Study Level: ${planData.userProfile.studyLevel}
- Enrolled Courses: ${planData.userProfile.enrolledCourses?.map((c: any) => c.name).join(', ')}
- Study Patterns: ${JSON.stringify(planData.userProfile.studyPatterns)}

Study Requirements:
- Timeframe: ${planData.timeframe}
- Goals: ${planData.goals.join(', ')}
- Available Study Hours: ${planData.studyHours}
- Difficulty Level: ${planData.difficultyLevel}

Available Resources:
${planData.resources.map(r => `- ${r.title} (${r.fileType})`).slice(0, 10).join('\n')}

Create a study plan with:
1. Overview and learning objectives
2. Daily/weekly activities
3. Resource utilization schedule
4. Study tips specific to user's level
5. Progress milestones

Return as JSON:
{
  "overview": "Plan description",
  "activities": [
    {
      "type": "reading|practice|review",
      "resource": "resource title",
      "duration": "minutes",
      "description": "activity description"
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating study plan:', error);
            return {
                overview: 'Unable to generate detailed study plan',
                activities: [],
                tips: ['Create a consistent study schedule', 'Focus on understanding concepts', 'Practice regularly']
            };
        }
    }

    /**
     * Generate insights from analytics data
     */
    async generateInsights(insightData: {
        analyticsType: string,
        data: any,
        userId: number,
        context: string
    }): Promise<any> {
        const prompt = `
You are an expert learning analytics advisor. Analyze the following data and provide actionable insights.

Analytics Type: ${insightData.analyticsType}
Context: ${insightData.context}

Data Summary:
${JSON.stringify(insightData.data, null, 2)}

Provide insights including:
1. Key patterns identified
2. Strengths and areas for improvement
3. Actionable recommendations
4. Comparative analysis where relevant

Return as JSON:
{
  "keyPatterns": ["pattern1", "pattern2"],
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific action",
      "rationale": "why this helps"
    }
  ]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating insights:', error);
            return {
                keyPatterns: ['Unable to analyze patterns'],
                strengths: [],
                improvements: [],
                recommendations: []
            };
        }
    }

    /**
     * Generate search insights for advanced search
     */
    async generateSearchInsights(searchData: {
        query: string,
        resultsCount: number,
        userLevel: string,
        topConcepts: string[],
        userCourses: string[]
    }): Promise<any> {
        const prompt = `
Analyze this search query and results to provide helpful insights to the student.

Search Query: "${searchData.query}"
Results Found: ${searchData.resultsCount}
User Level: ${searchData.userLevel}
User's Courses: ${searchData.userCourses.join(', ')}
Top Concepts in Results: ${searchData.topConcepts.join(', ')}

Provide insights in JSON format:
{
  "searchAnalysis": "Brief analysis of what the user is looking for",
  "conceptConnections": ["How concepts relate to each other"],
  "studyTips": ["Specific tips for studying these concepts"],
  "nextSteps": ["Recommended follow-up searches or actions"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating search insights:', error);
            return {
                searchAnalysis: 'Analysis unavailable',
                conceptConnections: [],
                studyTips: [],
                nextSteps: []
            };
        }
    }

    /**
     * Analyze concept relationships for advanced learning paths
     */
    async analyzeConceptRelationships(data: {
        sourceConcept: any,
        relatedConcepts: any[],
        userLevel: number
    }): Promise<any> {
        const prompt = `
Analyze the relationships between these academic concepts for a level ${data.userLevel} student.

Source Concept: ${data.sourceConcept.name}
Description: ${data.sourceConcept.description || 'No description'}

Related Concepts:
${data.relatedConcepts.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n')}

Analyze and return relationships in JSON format:
{
  "relationships": [
    {
      "targetConcept": "concept name",
      "type": "prerequisite|related|builds_upon|leads_to",
      "strength": 0.8,
      "explanation": "how they relate"
    }
  ],
  "overallStrength": 0.75,
  "suggestedOrder": ["concept1", "concept2", "concept3"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error analyzing concept relationships:', error);
            return {
                relationships: [],
                overallStrength: 0.5,
                suggestedOrder: [data.sourceConcept.name]
            };
        }
    }

    /**
     * Generate optimal learning path for concepts
     */
    async generateOptimalLearningPath(data: {
        concepts: any[],
        userLevel: number,
        masteredConcepts: number[],
        timeConstraints: string
    }): Promise<any> {
        const prompt = `
Create an optimal learning sequence for these concepts:

Concepts to learn:
${data.concepts.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n')}

User Level: ${data.userLevel}
Already Mastered Concept IDs: ${data.masteredConcepts.join(', ')}
Time Constraints: ${data.timeConstraints}

Generate learning path in JSON:
{
  "sequence": [
    {
      "concept": "concept name",
      "order": 1,
      "reasoning": "why this order",
      "estimatedHours": 4
    }
  ],
  "timeEstimate": "total hours",
  "milestones": ["milestone 1", "milestone 2"],
  "prerequisites": ["prerequisite concepts"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating learning path:', error);
            return {
                sequence: data.concepts.map((c, i) => ({
                    concept: c.name,
                    order: i + 1,
                    reasoning: 'Sequential learning',
                    estimatedHours: 3
                })),
                timeEstimate: data.concepts.length * 3,
                milestones: ['Complete first half', 'Complete all concepts'],
                prerequisites: []
            };
        }
    }

    /**
     * Generate insights for concept analysis
     */
    async generateConceptInsights(data: {
        analysisResults: any,
        userLevel: number,
        masteredConcepts: number[],
        currentFocus: string
    }): Promise<any> {
        const prompt = `
Analyze these concept analysis results and provide learning insights:

Analysis Results: ${JSON.stringify(data.analysisResults, null, 2)}
User Level: ${data.userLevel}
Current Focus: ${data.currentFocus}
Mastered Concepts Count: ${data.masteredConcepts.length}

Provide insights in JSON:
{
  "keyInsights": ["insight 1", "insight 2"],
  "learningGaps": ["gap 1", "gap 2"],
  "strengths": ["strength 1", "strength 2"],
  "recommendations": [
    {
      "type": "immediate_action",
      "description": "what to do now",
      "priority": "high|medium|low"
    }
  ]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating concept insights:', error);
            return {
                keyInsights: ['Continue consistent learning'],
                learningGaps: [],
                strengths: ['Steady progress'],
                recommendations: []
            };
        }
    }

    /**
     * Analyze difficulty progression of questions
     */
    async analyzeDifficultyProgression(data: {
        questions: any[],
        courseLevel: number,
        resourceType: string
    }): Promise<any> {
        const prompt = `
Analyze the difficulty progression of these questions:

Questions: ${JSON.stringify(data.questions.slice(0, 10), null, 2)}
Course Level: ${data.courseLevel}
Resource Type: ${data.resourceType}

Return analysis in JSON:
{
  "distribution": {
    "EASY": count,
    "MEDIUM": count, 
    "HARD": count,
    "EXPERT": count
  },
  "progression": "gradual|steep|mixed|inconsistent",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "averageDifficulty": "MEDIUM",
  "range": "EASY to HARD"
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error analyzing difficulty progression:', error);
            return {
                distribution: { EASY: 0, MEDIUM: data.questions.length, HARD: 0, EXPERT: 0 },
                progression: 'gradual',
                recommendations: ['Practice more varied difficulties'],
                averageDifficulty: 'MEDIUM',
                range: 'MEDIUM'
            };
        }
    }

    /**
     * Generate detailed solution for a question
     */
    async generateDetailedSolution(data: {
        question: string,
        concepts: string[],
        difficulty: string,
        includeExplanations: boolean,
        generateHints: boolean,
        courseContext?: string
    }): Promise<any> {
        const prompt = `
Provide a detailed solution for this ${data.difficulty} level question:

Question: ${data.question}
Related Concepts: ${data.concepts.join(', ')}
Course Context: ${data.courseContext || 'General Academic'}

Include explanations: ${data.includeExplanations}
Include hints: ${data.generateHints}

Return solution in JSON:
{
  "solution": "step by step solution",
  "explanation": "detailed explanation of concepts",
  "hints": ["hint 1", "hint 2"],
  "keyFormulas": ["formula 1", "formula 2"],
  "commonMistakes": ["mistake 1", "mistake 2"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating detailed solution:', error);
            return {
                solution: 'Solution generation unavailable',
                explanation: 'Unable to generate explanation',
                hints: [],
                keyFormulas: [],
                commonMistakes: []
            };
        }
    }

    /**
     * Generate question variations
     */
    async generateQuestionVariations(data: {
        originalQuestion: string,
        difficulty: string,
        concepts: string[],
        variationCount: number,
        variationTypes: string[]
    }): Promise<any[]> {
        const prompt = `
Create ${data.variationCount} variations of this question:

Original Question: ${data.originalQuestion}
Difficulty: ${data.difficulty}
Concepts: ${data.concepts.join(', ')}
Variation Types: ${data.variationTypes.join(', ')}

Return variations as JSON array:
[
  {
    "question": "varied question text",
    "variationType": "different_context|increased_difficulty|simplified_version",
    "difficulty": "EASY|MEDIUM|HARD|EXPERT",
    "explanation": "how this varies from original"
  }
]
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating question variations:', error);
            return [];
        }
    }

    /**
     * Analyze question difficulty
     */
    async analyzeQuestionDifficulty(data: {
        question: string,
        concepts: string[],
        context: string
    }): Promise<any> {
        const prompt = `
Analyze the difficulty of this question:

Question: ${data.question}
Concepts: ${data.concepts.join(', ')}
Context: ${data.context}

Return analysis in JSON:
{
  "level": "EASY|MEDIUM|HARD|EXPERT",
  "factors": ["factor 1", "factor 2"],
  "cognitiveLevel": "remember|understand|apply|analyze|evaluate|create",
  "timeEstimate": "minutes",
  "confidence": 0.85
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error analyzing question difficulty:', error);
            return {
                level: 'MEDIUM',
                factors: ['Standard academic question'],
                cognitiveLevel: 'understand',
                timeEstimate: '10',
                confidence: 0.5
            };
        }
    }

    /**
     * Generate learning objectives from question
     */
    async generateLearningObjectives(data: {
        question: string,
        concepts: string[]
    }): Promise<string[]> {
        const prompt = `
Generate 2-3 learning objectives for this question:

Question: ${data.question}
Concepts: ${data.concepts.join(', ')}

Return as JSON array of strings:
["objective 1", "objective 2", "objective 3"]

Each objective should start with an action verb (understand, analyze, apply, etc.)
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating learning objectives:', error);
            return ['Understand the key concepts', 'Apply problem-solving skills'];
        }
    }

    /**
     * Generate questions from concepts
     */
    async generateConceptQuestions(data: {
        concept: string,
        description?: string,
        difficulty: string,
        questionTypes: string[],
        questionCount: number,
        sampleQuestions: any[],
        courseContext?: string
    }): Promise<any[]> {
        const prompt = `
Generate ${data.questionCount} ${data.difficulty} level questions about this concept:

Concept: ${data.concept}
Description: ${data.description || 'No description provided'}
Question Types: ${data.questionTypes.join(', ')}
Course Context: ${data.courseContext || 'General Academic'}

Sample Questions Style:
${data.sampleQuestions.slice(0, 2).map(q => `- ${q.questionText}`).join('\n')}

Return questions as JSON array:
[
  {
    "questionText": "question content",
    "questionType": "multiple_choice|short_answer|essay|problem_solving",
    "difficulty": "${data.difficulty}",
    "expectedAnswer": "answer or key points",
    "marks": number,
    "timeEstimate": "minutes"
  }
]
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating concept questions:', error);
            return [];
        }
    }

    /**
     * Analyze course content and structure
     */
    async analyzeCourse(data: {
        course: any,
        analysisResults: any,
        analysisType: string,
        focusAreas: string[]
    }): Promise<any> {
        const prompt = `
Analyze this course based on the analysis results:

Course: ${data.course.title} (${data.course.code})
Department: ${data.course.department}
Resources: ${data.course.resourceCount}
Students: ${data.course.enrollmentCount}

Analysis Type: ${data.analysisType}
Focus Areas: ${data.focusAreas.join(', ')}

Analysis Results:
${JSON.stringify(data.analysisResults, null, 2)}

Provide comprehensive insights in JSON format:
{
  "overview": "comprehensive course analysis summary",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "learningPath": ["step 1", "step 2", "step 3"],
  "improvements": ["improvement 1", "improvement 2"],
  "strengths": ["strength 1", "strength 2"],
  "risks": ["risk 1", "risk 2"],
  "predictions": ["prediction 1", "prediction 2"],
  "actions": ["action 1", "action 2"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error analyzing course:', error);
            return {
                overview: 'Course analysis completed',
                keyFindings: ['Analysis performed successfully'],
                recommendations: [],
                learningPath: [],
                improvements: [],
                strengths: ['Course has available resources'],
                risks: [],
                predictions: [],
                actions: []
            };
        }
    }

    /**
     * Generate study insights from plan and user data
     */
    async generateStudyInsights(data: {
        studyPlan: any,
        userAnalysis: any,
        userHistory: any
    }): Promise<any> {
        const prompt = `
Generate study insights for this personalized study plan:

Study Plan: ${data.studyPlan.title}
Total Hours: ${data.studyPlan.totalHours}
User Level: ${data.userAnalysis.userLevel}
User Performance: ${data.userHistory.averagePerformance}
Consistency Score: ${data.userHistory.consistencyScore}
Completed Sessions: ${data.userHistory.completedSessions}

Provide insights in JSON format:
{
  "recommendations": ["specific recommendation 1", "specific recommendation 2"],
  "outcomes": ["expected outcome 1", "expected outcome 2"],
  "challenges": ["potential challenge 1", "potential challenge 2"],
  "adaptations": ["adaptation suggestion 1", "adaptation suggestion 2"],
  "motivation": ["motivational tip 1", "motivational tip 2"]
}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating study insights:', error);
            return {
                recommendations: ['Follow the study plan consistently'],
                outcomes: ['Improved understanding of concepts'],
                challenges: ['Time management'],
                adaptations: ['Adjust schedule as needed'],
                motivation: ['Set small achievable goals']
            };
        }
    }

    /**
     * Generate content with the Gemini AI model
     */
    async generateContent(prompt: string): Promise<any> {
        this.ensureInitialized();
        try {
            const result = await this.model.generateContent(prompt);
            return result;
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }
}

// Singleton instance
export const geminiAI = new GeminiAIService();