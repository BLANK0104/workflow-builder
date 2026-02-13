import Groq from 'groq-sdk';
import { StepType } from './types';
import { log } from './logger';
import { retryWithBackoff, CircuitBreaker, withTimeout } from './retry';
import { aiRequestSchema, aiResponseSchema, type AIRequest, type AIResponse } from './validation';
import { sanitizeText } from './security';

if (!process.env.GROQ_API_KEY) {
  throw new Error('Please add your Groq API key to .env.local');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Circuit breaker for AI service reliability
const circuitBreaker = new CircuitBreaker(
  5,     // failure threshold
  60000, // 1 minute recovery time
  3      // success threshold
);

// Rate limiting for API calls
let lastApiCall = 0;
const MIN_API_INTERVAL = 100; // 100ms between calls

/**
 * Enhanced AI processing with retry logic, validation, and reliability features
 */
export async function processWithGemini(
  prompt: string, 
  stepType: StepType,
  customPrompt?: string
): Promise<string> {
  const timer = log.time('ai_processing');
  
  try {
    // Sanitize and validate inputs
    const sanitizedPrompt = sanitizeText(prompt, 10000);
    const sanitizedCustomPrompt = customPrompt ? sanitizeText(customPrompt, 1000) : undefined;
    
    // Build enhanced prompt
    const enhancedPrompt = buildPrompt(sanitizedPrompt, stepType, sanitizedCustomPrompt);
    
    // Validate AI request parameters
    const aiRequest = aiRequestSchema.parse({
      prompt: enhancedPrompt,
      content: sanitizedPrompt,
      model: 'llama-3.3-70b-versatile',
      temperature: getTemperatureForStepType(stepType),
      maxTokens: 8000,
    });
    
    log.info('Starting AI processing', {
      stepType,
      promptLength: enhancedPrompt.length,
      model: aiRequest.model,
      operation: 'ai_processing',
    });
    
    // Execute with circuit breaker and retry logic
    const result = await circuitBreaker.execute(async () => {
      return await retryWithBackoff(
        async () => await executeGroqRequest(aiRequest),
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          retryCondition: (error) => {
            // Retry on rate limits, network errors, and temporary failures
            const retryableErrors = [
              'rate_limit_exceeded',
              'service_unavailable',
              'timeout',
              'ECONNRESET',
              'ETIMEDOUT',
            ];
            return retryableErrors.some(errorType => 
              error.message.toLowerCase().includes(errorType.toLowerCase())
            );
          },
        },
        { 
          stepType, 
          operation: 'groq_api_call' 
        }
      );
    }, { stepType, operation: 'ai_processing_circuit' });
    
    // Validate and sanitize response
    const response = aiResponseSchema.parse(result);
    const sanitizedContent = sanitizeText(response.content, 50000);
    
    log.info('AI processing completed successfully', {
      stepType,
      inputLength: sanitizedPrompt.length,
      outputLength: sanitizedContent.length,
      usage: response.usage,
      model: response.model,
      operation: 'ai_processing',
    });
    
    timer.end('AI processing completed');
    return sanitizedContent;
    
  } catch (error) {
    timer.end('AI processing failed');
    log.error('AI processing failed', {
      stepType,
      error: error instanceof Error ? error : String(error),
      operation: 'ai_processing',
    });
    
    // Return fallback content or re-throw based on error type
    if (error instanceof Error && error.message.includes('Circuit breaker is open')) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }
    
    throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute Groq API request with rate limiting and timeout
 */
async function executeGroqRequest(request: AIRequest): Promise<AIResponse> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall));
  }
  lastApiCall = Date.now();
  
  // Execute with timeout
  const completion = await withTimeout(
    groq.chat.completions.create({
      messages: [{
        role: 'user',
        content: request.prompt,
      }],
      model: request.model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    }),
    30000, // 30 second timeout
    'AI request timed out'
  );
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from AI service');
  }
  
  return {
    content,
    usage: completion.usage ? {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    } : undefined,
    finishReason: completion.choices[0]?.finish_reason || undefined,
    model: completion.model,
  };
}

/**
 * Build enhanced prompt based on step type
 */
function buildPrompt(prompt: string, stepType: StepType, customPrompt?: string): string {
  if (stepType === 'custom' && customPrompt) {
    return `${customPrompt}\n\nText to process:\n${prompt}`;
  }
  
  const promptTemplates: Record<StepType, string> = {
    clean: `Clean and normalize the following text. Remove extra whitespace, fix formatting, and make it readable:\n\n${prompt}`,
    summarize: `Provide a concise summary of the following text:\n\n${prompt}`,
    extract: `Extract the key points from the following text as a bullet list:\n\n${prompt}`,
    categorize: `Categorize the following text into relevant tags or categories (e.g., technology, business, health, etc.):\n\n${prompt}`,
    translate: `Translate the following text to English (if not already in English):\n\n${prompt}`,
    sentiment: `Analyze the sentiment of the following text (positive, negative, neutral) and explain why:\n\n${prompt}`,
    keywords: `Extract important keywords and phrases from the following text:\n\n${prompt}`,
    questions: `Generate relevant questions that could be answered by the following text:\n\n${prompt}`,
    expand: `Expand and elaborate on the following text with more details and context:\n\n${prompt}`,
    simplify: `Simplify and make the following text easier to understand:\n\n${prompt}`,
    'bullet-points': `Convert the following text into clear bullet points:\n\n${prompt}`,
    custom: prompt, // Fallback, should not reach here
  };
  
  return promptTemplates[stepType] || prompt;
}

/**
 * Get appropriate temperature setting based on step type
 */
function getTemperatureForStepType(stepType: StepType): number {
  const temperatureMap: Record<StepType, number> = {
    clean: 0.1,        // Low creativity for cleaning
    summarize: 0.2,    // Low creativity for summaries
    extract: 0.1,      // Factual extraction
    categorize: 0.3,   // Some creativity for categorization
    translate: 0.1,    // Accuracy over creativity
    sentiment: 0.2,    // Balanced analysis
    keywords: 0.1,     // Factual extraction
    questions: 0.6,    // More creative for question generation
    expand: 0.7,       // High creativity for expansion
    simplify: 0.3,     // Moderate creativity
    'bullet-points': 0.2, // Structured output
    custom: 0.5,       // Balanced default
  };
  
  return temperatureMap[stepType] || 0.5;
}

/**
 * Health check for AI service
 */
export async function checkGeminiConnection(): Promise<boolean> {
  try {
    log.info('Checking AI service connection', { operation: 'health_check' });
    
    const result = await withTimeout(
      groq.chat.completions.create({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
        temperature: 0.1,
      }),
      10000, // 10 second timeout for health check
      'Health check timed out'
    );
    
    const isHealthy = !!result.choices[0]?.message?.content;
    
    log.info('AI service health check completed', {
      healthy: isHealthy,
      operation: 'health_check',
    });
    
    return isHealthy;
  } catch (error) {
    log.error('AI service health check failed', {
      error: error instanceof Error ? error : String(error),
      operation: 'health_check',
    });
    return false;
  }
}

/**
 * Get AI service metrics and status
 */
export function getAIServiceMetrics() {
  return {
    circuitBreakerState: circuitBreaker.getState(),
    lastApiCall,
    minApiInterval: MIN_API_INTERVAL,
  };
}
