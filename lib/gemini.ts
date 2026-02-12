import Groq from 'groq-sdk';
import { StepType } from './types';

if (!process.env.GROQ_API_KEY) {
  throw new Error('Please add your Groq API key to .env.local');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function processWithGemini(
  prompt: string, 
  stepType: StepType,
  customPrompt?: string
): Promise<string> {
  try {
    
    let enhancedPrompt = '';
    
    if (stepType === 'custom' && customPrompt) {
      enhancedPrompt = `${customPrompt}\n\nText to process:\n${prompt}`;
    } else {
      switch (stepType) {
        case 'clean':
          enhancedPrompt = `Clean and normalize the following text. Remove extra whitespace, fix formatting, and make it readable:\n\n${prompt}`;
          break;
        case 'summarize':
          enhancedPrompt = `Provide a concise summary of the following text:\n\n${prompt}`;
          break;
        case 'extract':
          enhancedPrompt = `Extract the key points from the following text as a bullet list:\n\n${prompt}`;
          break;
        case 'categorize':
          enhancedPrompt = `Categorize the following text into relevant tags or categories (e.g., technology, business, health, etc.):\n\n${prompt}`;
          break;
        case 'translate':
          enhancedPrompt = `Translate the following text to English (if not already in English):\n\n${prompt}`;
          break;
        case 'sentiment':
          enhancedPrompt = `Analyze the sentiment of the following text (positive, negative, neutral) and explain why:\n\n${prompt}`;
          break;
        case 'keywords':
          enhancedPrompt = `Extract important keywords and phrases from the following text:\n\n${prompt}`;
          break;
        case 'questions':
          enhancedPrompt = `Generate relevant questions that could be answered by the following text:\n\n${prompt}`;
          break;
        case 'expand':
          enhancedPrompt = `Expand and elaborate on the following text with more details and context:\n\n${prompt}`;
          break;
        case 'simplify':
          enhancedPrompt = `Simplify and make the following text easier to understand:\n\n${prompt}`;
          break;
        case 'bullet-points':
          enhancedPrompt = `Convert the following text into clear bullet points:\n\n${prompt}`;
          break;
        default:
          enhancedPrompt = prompt;
      }
    }
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: enhancedPrompt,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Fast and high quality
      temperature: 0.7,
      max_tokens: 8000,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function checkGeminiConnection(): Promise<boolean> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10,
    });
    return !!completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Groq connection check failed:', error);
    return false;
  }
}
