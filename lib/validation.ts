import { z } from 'zod';
import { ObjectId } from 'mongodb';

// MongoDB ObjectId schema
const objectIdSchema = z.custom<ObjectId>((val) => {
  if (typeof val === 'string') {
    return ObjectId.isValid(val);
  }
  return val instanceof ObjectId;
}, {
  message: "Invalid ObjectId format"
});

// Supported step types
const stepTypeSchema = z.enum([
  'clean', 
  'summarize', 
  'extract', 
  'categorize',
  'translate',
  'sentiment',
  'keywords',
  'questions',
  'expand',
  'simplify',
  'bullet-points',
  'custom'
]);

// Workflow step schema
export const workflowStepSchema = z.object({
  id: z.string().min(1, "Step ID is required"),
  type: stepTypeSchema,
  name: z.string().min(1, "Step name is required").max(100, "Step name too long"),
  order: z.number().int().min(0, "Order must be non-negative"),
  customPrompt: z.string().max(1000, "Custom prompt too long").optional(),
});

// Workflow schema
export const workflowSchema = z.object({
  _id: objectIdSchema.optional(),
  name: z.string().min(1, "Workflow name is required").max(100, "Workflow name too long"),
  description: z.string().max(500, "Description too long").default(''),
  steps: z.array(workflowStepSchema)
    .min(2, "Workflow must have at least 2 steps")
    .max(4, "Workflow can have at most 4 steps"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Create workflow input schema (for API)
export const createWorkflowSchema = workflowSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// Update workflow input schema
export const updateWorkflowSchema = createWorkflowSchema.partial().extend({
  updatedAt: z.date().default(() => new Date()),
});

// Step result schema
export const stepResultSchema = z.object({
  stepId: z.string().min(1),
  stepName: z.string().min(1),
  input: z.string().max(10000, "Input too large"),
  output: z.string().max(50000, "Output too large"),
  duration: z.number().min(0),
  status: z.enum(['success', 'error']),
  error: z.string().max(1000).optional(),
});

// Workflow run schema
export const workflowRunSchema = z.object({
  _id: objectIdSchema.optional(),
  workflowId: z.string().min(1, "Workflow ID is required"),
  workflowName: z.string().min(1, "Workflow name is required"),
  input: z.string().min(1, "Input is required").max(10000, "Input too large"),
  inputType: z.enum(['text', 'file']).default('text'),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(50).optional(),
  results: z.array(stepResultSchema).default([]),
  totalDuration: z.number().min(0).default(0),
  status: z.enum(['success', 'error', 'running']).default('running'),
  createdAt: z.date().default(() => new Date()),
});

// Create run input schema
export const createRunSchema = workflowRunSchema.omit({ 
  _id: true, 
  createdAt: true, 
  results: true, 
  totalDuration: true, 
  status: true 
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, "Must be a valid file"),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
}).refine((data) => data.file.size <= data.maxSize, {
  message: "File size exceeds maximum allowed size",
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.string().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const workflowQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  stepType: stepTypeSchema.optional(),
});

export const runQuerySchema = paginationSchema.extend({
  workflowId: z.string().optional(),
  status: z.enum(['success', 'error', 'running']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// AI processing schemas
export const aiRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt too long"),
  content: z.string().max(50000, "Content too large"),
  model: z.string().default('llama3-8b-8192'),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().min(1).max(8192).default(4096),
});

export const aiResponseSchema = z.object({
  content: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }).optional(),
  finishReason: z.string().optional(),
  model: z.string(),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.date().default(() => new Date()),
});

// Success response schema
export const successResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema,
  message: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

// API Response wrapper
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.union([
  successResponseSchema(dataSchema),
  errorResponseSchema,
]);

// Export TypeScript types from schemas
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type CreateWorkflow = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflow = z.infer<typeof updateWorkflowSchema>;
export type StepResult = z.infer<typeof stepResultSchema>;
export type WorkflowRun = z.infer<typeof workflowRunSchema>;
export type CreateRun = z.infer<typeof createRunSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type WorkflowQuery = z.infer<typeof workflowQuerySchema>;
export type RunQuery = z.infer<typeof runQuerySchema>;
export type AIRequest = z.infer<typeof aiRequestSchema>;
export type AIResponse = z.infer<typeof aiResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type StepType = z.infer<typeof stepTypeSchema>;