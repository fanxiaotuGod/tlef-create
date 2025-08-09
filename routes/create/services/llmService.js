/**
 * LLM Service for Quiz Question Generation
 * Uses UBC GenAI Toolkit LLM module for real AI-powered question generation
 */

import { LLMModule } from 'ubc-genai-toolkit-llm';
import { ConsoleLogger } from 'ubc-genai-toolkit-core';
import { QUESTION_TYPES } from '../config/constants.js';

class QuizLLMService {
  constructor() {
    // Create a custom logger that matches the interface
    this.logger = {
      debug: (message, metadata) => console.log(`[DEBUG] ${message}`, metadata || ''),
      info: (message, metadata) => console.log(`[INFO] ${message}`, metadata || ''),
      warn: (message, metadata) => console.warn(`[WARN] ${message}`, metadata || ''),
      error: (message, metadata) => console.error(`[ERROR] ${message}`, metadata || '')
    };
    
    try {
      // Initialize LLM module with Ollama (local LLM)
      this.llm = new LLMModule({
        provider: 'ollama',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        logger: this.logger,
        defaultOptions: {
          temperature: 0.7,
          maxTokens: 2000
        }
      });

      console.log('✅ QuizLLMService initialized with UBC GenAI Toolkit');
    } catch (error) {
      console.error('❌ Failed to initialize QuizLLMService:', error.message);
      console.error('💡 LLM features will be disabled. Ensure Ollama is running with llama3.1:8b model.');
      this.llm = null;
    }
  }

  /**
   * Generate a high-quality question using LLM + RAG content
   */
  async generateQuestion(questionConfig) {
    const {
      learningObjective,
      questionType,
      relevantContent = [],
      difficulty = 'moderate',
      courseContext = '',
      previousQuestions = []
    } = questionConfig;

    console.log(`🤖 Generating ${questionType} question with LLM...`);
    console.log(`📝 Learning Objective: ${learningObjective.substring(0, 100)}...`);
    console.log(`📚 Using ${relevantContent.length} content chunks`);

    if (!this.llm) {
      throw new Error('LLM service not initialized. Please check Ollama configuration.');
    }

    try {
      // Build expert-level prompt
      const prompt = this.buildExpertPrompt(
        learningObjective, 
        questionType, 
        relevantContent, 
        difficulty,
        courseContext,
        previousQuestions
      );

      console.log(`📋 Generated prompt (${prompt.length} chars)`);

      // Call LLM
      const startTime = Date.now();
      const response = await this.llm.sendMessage(prompt, {
        temperature: this.getTemperatureForQuestionType(questionType),
        maxTokens: 2000
      });

      const processingTime = Date.now() - startTime;
      console.log(`⏱️ LLM response received in ${processingTime}ms`);
      console.log(`🔍 Raw LLM response:`, response.content.substring(0, 500) + '...');

      // Parse and validate response
      const questionData = this.parseAndValidateResponse(response.content, questionType);
      
      return {
        success: true,
        questionData: {
          ...questionData,
          generationMetadata: {
            llmModel: response.model || 'llama3.1:8b',
            generationPrompt: prompt,
            learningObjective: learningObjective,
            contentSources: relevantContent.map(c => c.source),
            processingTime: processingTime,
            temperature: this.getTemperatureForQuestionType(questionType),
            generationMethod: 'llm-rag-enhanced',
            contentScore: this.calculateContentRelevanceScore(relevantContent),
            confidence: this.estimateQuestionQuality(questionData),
            usage: response.usage
          }
        }
      };

    } catch (error) {
      console.error('❌ LLM question generation failed:', error);
      throw error;
    }
  }

  /**
   * Build expert-level prompt for question generation
   */
  buildExpertPrompt(learningObjective, questionType, relevantContent, difficulty, courseContext, previousQuestions) {
    const contentText = relevantContent
      .map((chunk, index) => `[Content ${index + 1}] (from ${chunk.source}, relevance: ${chunk.score.toFixed(2)})\n${chunk.content}`)
      .join('\n\n');

    const previousQuestionsText = previousQuestions.length > 0 
      ? `\n\nPREVIOUS QUESTIONS TO AVOID DUPLICATION:\n${previousQuestions.map((q, i) => `${i + 1}. ${q.questionText}`).join('\n')}`
      : '';

    const basePrompt = `You are an expert educational assessment designer specializing in creating high-quality, pedagogically sound quiz questions. Your task is to generate a ${questionType} question that effectively assesses student understanding.

LEARNING OBJECTIVE:
${learningObjective}

COURSE CONTEXT:
${courseContext || 'General academic course'}

RELEVANT COURSE MATERIALS:
${contentText || 'No specific course materials provided - use general knowledge related to the learning objective.'}

DIFFICULTY LEVEL: ${difficulty}

QUESTION TYPE: ${questionType}
${previousQuestionsText}

INSTRUCTIONS:
1. Create a question that directly assesses the learning objective
2. Use the provided course materials to create realistic, contextual content
3. Ensure the question tests meaningful understanding, not just memorization
4. Make the question engaging and relevant to real-world applications
5. Follow educational best practices for ${questionType} questions
6. Avoid duplicating previous questions - create unique content and scenarios

RESPONSE FORMAT:
Return ONLY a valid JSON object with this exact structure (all strings must be on single lines - no line breaks within strings):`;

    const formatInstructions = this.getFormatInstructions(questionType);
    
    return basePrompt + '\n' + formatInstructions;
  }

  /**
   * Get format instructions for each question type
   */
  getFormatInstructions(questionType) {
    const formats = {
      'multiple-choice': `{
  "questionText": "Your question here (should be clear, specific, and test understanding)",
  "options": [
    {"text": "Correct answer (substantive and detailed)", "isCorrect": true},
    {"text": "Plausible distractor 1 (common misconception)", "isCorrect": false},
    {"text": "Plausible distractor 2 (partially correct but incomplete)", "isCorrect": false},
    {"text": "Plausible distractor 3 (logical but incorrect)", "isCorrect": false}
  ],
  "correctAnswer": "Correct answer text (exact match)",
  "explanation": "Detailed explanation of why the correct answer is right and why distractors are wrong, referencing course materials"
}`,

      'true-false': `{
  "questionText": "Your true/false statement here (should be clear and test nuanced understanding)",
  "options": [
    {"text": "True", "isCorrect": true},
    {"text": "False", "isCorrect": false}
  ],
  "correctAnswer": "True",
  "explanation": "Detailed explanation of why the statement is true/false, with specific references to course concepts"
}`,

      'flashcard': `{
  "questionText": "Review this concept",
  "content": {
    "front": "Clear question or prompt about the concept",
    "back": "Comprehensive answer with key details and context"
  },
  "correctAnswer": "The back content",
  "explanation": "Additional context about why this concept is important and how it connects to the learning objective"
}`,

      'summary': `{
  "questionText": "Comprehensive summary question that requires synthesis of multiple concepts",
  "correctAnswer": "Model answer that demonstrates complete understanding (3-4 sentences)",
  "explanation": "Key points that should be included in a complete answer, assessment criteria"
}`,

      'discussion': `{
  "questionText": "Thought-provoking discussion question that encourages critical thinking",
  "correctAnswer": "Sample response that demonstrates deep engagement with the topic",
  "explanation": "Discussion points to consider, different perspectives, and evaluation criteria"
}`,

      'matching': `{
  "questionText": "Match the concepts to their correct definitions or characteristics",
  "leftItems": ["Concept A", "Concept B", "Concept C", "Concept D"],
  "rightItems": ["Definition W", "Definition X", "Definition Y", "Definition Z"],
  "matchingPairs": [["Concept A", "Definition X"], ["Concept B", "Definition Y"], ["Concept C", "Definition Z"], ["Concept D", "Definition W"]],
  "correctAnswer": "Concept A - Definition X, Concept B - Definition Y, Concept C - Definition Z, Concept D - Definition W",
  "explanation": "Detailed explanation of why each concept matches its definition"
}`,

      'ordering': `{
  "questionText": "Arrange the following items in the correct order (e.g., chronological, complexity, process steps)",
  "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
  "correctOrder": ["Item 3", "Item 1", "Item 4", "Item 2"],
  "correctAnswer": "Item 3, Item 1, Item 4, Item 2",
  "explanation": "Detailed explanation of why this is the correct order"
}`,

      'cloze': `{
  "questionText": "Fill in the blanks: In programming, _____ is used for _____ while _____ provides _____.",
  "textWithBlanks": "In programming, _____ is used for _____ while _____ provides _____.",
  "blankOptions": [["async", "sync", "callback"], ["error handling", "data processing", "user interaction"], ["promises", "callbacks", "events"], ["better readability", "more complexity", "faster execution"]],
  "correctAnswers": ["async", "error handling", "promises", "better readability"],
  "correctAnswer": "async, error handling, promises, better readability",
  "explanation": "Detailed explanation of why these are the correct answers for each blank"
}`
    };

    return formats[questionType] || formats['multiple-choice'];
  }

  /**
   * Simple JSON cleaning that handles the most common issues
   */
  simpleJsonClean(jsonString) {
    // The most common issue is literal newlines in string values
    // We need to carefully replace newlines only within string values
    
    let cleaned = jsonString;
    let inString = false;
    let result = '';
    let i = 0;
    
    while (i < cleaned.length) {
      const char = cleaned[i];
      
      if (char === '"' && (i === 0 || cleaned[i-1] !== '\\')) {
        // Toggle string state
        inString = !inString;
        result += char;
      } else if (inString && char === '\n') {
        // Replace literal newline with escaped newline in strings
        result += '\\n';
      } else if (inString && char === '\r') {
        // Replace literal carriage return with escaped version
        result += '\\r';
      } else if (inString && char === '\t') {
        // Replace literal tab with escaped version
        result += '\\t';
      } else {
        result += char;
      }
      
      i++;
    }
    
    return result;
  }

  /**
   * Parse and validate LLM response
   */
  parseAndValidateResponse(responseContent, questionType) {
    try {
      console.log(`🔍 Parsing LLM response for ${questionType}:`, responseContent.substring(0, 200) + '...');
      
      // Clean the response - remove any markdown formatting and explanatory text
      let cleanContent = responseContent.trim();
      
      // Remove markdown code blocks
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/```$/, '');
      }
      
      // Find JSON object - look for first { and last } more carefully
      const firstBrace = cleanContent.indexOf('{');
      if (firstBrace === -1) {
        throw new Error('No JSON object found in response');
      }
      
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let lastBrace = -1;
      
      for (let i = firstBrace; i < cleanContent.length; i++) {
        if (cleanContent[i] === '{') {
          braceCount++;
        } else if (cleanContent[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastBrace = i;
            break;
          }
        }
      }
      
      if (lastBrace === -1) {
        throw new Error('No matching closing brace found in JSON');
      }
      
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
      
      // Simple but effective JSON cleaning
      cleanContent = this.simpleJsonClean(cleanContent);
      
      console.log(`🧹 Cleaned content:`, cleanContent.substring(0, 200) + '...');

      const parsed = JSON.parse(cleanContent);
      console.log(`✅ Successfully parsed JSON:`, {
        hasQuestionText: !!parsed.questionText,
        hasOptions: !!parsed.options,
        hasCorrectAnswer: !!parsed.correctAnswer,
        hasExplanation: !!parsed.explanation
      });
      
      // Validate required fields
      if (!parsed.questionText || !parsed.correctAnswer || !parsed.explanation) {
        throw new Error('Missing required fields in LLM response');
      }

      // Type-specific validation
      if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE || questionType === QUESTION_TYPES.TRUE_FALSE) {
        if (!parsed.options || !Array.isArray(parsed.options)) {
          throw new Error('Missing or invalid options array');
        }
        
        const correctOptions = parsed.options.filter(opt => opt.isCorrect === true);
        if (correctOptions.length !== 1) {
          throw new Error('Exactly one option must be marked as correct');
        }
      }

      if (questionType === QUESTION_TYPES.FLASHCARD) {
        if (!parsed.content || !parsed.content.front || !parsed.content.back) {
          throw new Error('Flashcard missing front/back content');
        }
      }

      console.log('✅ LLM response validated successfully');
      return parsed;

    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error.message);
      console.error('Raw response:', responseContent);
      throw new Error(`Invalid LLM response format: ${error.message}`);
    }
  }

  /**
   * Get appropriate temperature for question type
   */
  getTemperatureForQuestionType(questionType) {
    const temperatures = {
      [QUESTION_TYPES.MULTIPLE_CHOICE]: 0.7,  // Balanced creativity and accuracy
      [QUESTION_TYPES.TRUE_FALSE]: 0.5,       // More factual, less creative
      [QUESTION_TYPES.FLASHCARD]: 0.6,        // Structured but clear
      [QUESTION_TYPES.SUMMARY]: 0.8,          // More creative and comprehensive
      [QUESTION_TYPES.DISCUSSION]: 0.9        // Most creative and open-ended
    };
    
    return temperatures[questionType] || 0.7;
  }

  /**
   * Calculate content relevance score
   */
  calculateContentRelevanceScore(relevantContent) {
    if (!relevantContent || relevantContent.length === 0) return 0;
    
    const totalScore = relevantContent.reduce((sum, chunk) => sum + chunk.score, 0);
    return totalScore / relevantContent.length;
  }

  /**
   * Estimate question quality based on generated content
   */
  estimateQuestionQuality(questionData) {
    let score = 0.5; // Base score
    
    // Check question text quality
    if (questionData.questionText && questionData.questionText.length > 20) {
      score += 0.1;
    }
    if (questionData.questionText && questionData.questionText.length > 50) {
      score += 0.1;
    }
    
    // Check explanation quality
    if (questionData.explanation && questionData.explanation.length > 50) {
      score += 0.1;
    }
    if (questionData.explanation && questionData.explanation.length > 100) {
      score += 0.1;
    }
    
    // Check options quality (for MC/TF)
    if (questionData.options && questionData.options.length >= 3) {
      score += 0.1;
      
      const avgOptionLength = questionData.options.reduce((sum, opt) => 
        sum + (opt.text?.length || 0), 0) / questionData.options.length;
      
      if (avgOptionLength > 20) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate multiple questions in batch
   */
  async generateQuestionBatch(batchConfig) {
    const {
      learningObjective,
      questionConfigs, // Array of { questionType, count }
      relevantContent,
      difficulty,
      courseContext
    } = batchConfig;

    console.log(`🎯 Generating batch of questions for LO: ${learningObjective.substring(0, 50)}...`);
    
    const questions = [];
    const errors = [];
    
    for (const config of questionConfigs) {
      for (let i = 0; i < config.count; i++) {
        try {
          const result = await this.generateQuestion({
            learningObjective,
            questionType: config.questionType,
            relevantContent,
            difficulty,
            courseContext,
            previousQuestions: questions // Avoid duplication
          });
          
          if (result.success) {
            questions.push({
              ...result.questionData,
              type: config.questionType,
              order: questions.length
            });
          }
          
          // Small delay to avoid overwhelming the LLM
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Failed to generate ${config.questionType} question ${i + 1}:`, error.message);
          errors.push({
            questionType: config.questionType,
            index: i + 1,
            error: error.message
          });
        }
      }
    }
    
    console.log(`✅ Generated ${questions.length} questions, ${errors.length} errors`);
    
    return {
      questions,
      errors,
      totalRequested: questionConfigs.reduce((sum, config) => sum + config.count, 0),
      totalGenerated: questions.length
    };
  }

  /**
   * Test LLM connection
   */
  async testConnection() {
    if (!this.llm) {
      return {
        success: false,
        error: 'LLM service not initialized. Please check Ollama configuration.'
      };
    }

    try {
      const response = await this.llm.sendMessage('Test connection. Reply with "OK" only.', {
        maxTokens: 10
      });
      
      return {
        success: true,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const llmService = new QuizLLMService();
export default llmService;