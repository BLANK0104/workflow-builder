// Groq with Llama 3.1 70B token limits
export const MAX_INPUT_TOKENS = 128000; // 128K tokens input
export const MAX_OUTPUT_TOKENS = 8000; // 8K tokens output
export const APPROX_CHARS_PER_TOKEN = 4; // Rough estimate
export const MAX_INPUT_CHARS = MAX_INPUT_TOKENS * APPROX_CHARS_PER_TOKEN; // ~512KB
