// Groq with Llama 3.1 70B token limits
export const MAX_INPUT_TOKENS = 128000; // 128K tokens context window
export const MAX_OUTPUT_TOKENS = 8000; // 8K tokens output
export const MAX_TOKENS_PER_REQUEST = 11000; // 12K TPM limit, use 11K for safety margin
export const APPROX_CHARS_PER_TOKEN = 4; // Rough estimate
export const MAX_INPUT_CHARS = MAX_INPUT_TOKENS * APPROX_CHARS_PER_TOKEN; // ~512KB

// Estimate tokens from text (rough approximation)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

// Check if text exceeds token limit
export function validateTokenLimit(text: string): { valid: boolean; tokens: number; limit: number } {
  const tokens = estimateTokens(text);
  return {
    valid: tokens <= MAX_TOKENS_PER_REQUEST,
    tokens,
    limit: MAX_TOKENS_PER_REQUEST
  };
}
