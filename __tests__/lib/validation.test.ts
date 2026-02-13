import {
  workflowStepSchema,
  workflowSchema,
  createWorkflowSchema,
  stepResultSchema,
  workflowRunSchema,
  aiRequestSchema,
  paginationSchema,
  fileUploadSchema,
} from '../../lib/validation';

describe('Validation Schemas', () => {
  describe('workflowStepSchema', () => {
    test('should validate correct workflow step', () => {
      const validStep = {
        id: 'step-1',
        type: 'summarize',
        name: 'Summarize Content',
        order: 1,
      };
      
      const result = workflowStepSchema.parse(validStep);
      expect(result).toEqual(validStep);
    });

    test('should require custom prompt for custom step type', () => {
      const customStep = {
        id: 'step-1',
        type: 'custom',
        name: 'Custom Step',
        order: 1,
        customPrompt: 'Do something custom',
      };
      
      const result = workflowStepSchema.parse(customStep);
      expect(result).toEqual(customStep);
    });

    test('should reject invalid step types', () => {
      const invalidStep = {
        id: 'step-1',
        type: 'invalid-type',
        name: 'Invalid Step',
        order: 1,
      };
      
      expect(() => workflowStepSchema.parse(invalidStep)).toThrow();
    });

    test('should reject invalid order values', () => {
      const invalidStep = {
        id: 'step-1',
        type: 'summarize',
        name: 'Test Step',
        order: -1,
      };
      
      expect(() => workflowStepSchema.parse(invalidStep)).toThrow();
    });
  });

  describe('workflowSchema', () => {
    test('should validate correct workflow', () => {
      const validWorkflow = {
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step-1',
            type: 'clean',
            name: 'Clean Text',
            order: 0,
          },
          {
            id: 'step-2',
            type: 'summarize',
            name: 'Summarize',
            order: 1,
          },
        ],
      };
      
      const result = workflowSchema.parse(validWorkflow);
      expect(result.name).toBe(validWorkflow.name);
      expect(result.steps).toHaveLength(2);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test('should reject workflows with too few steps', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            type: 'clean',
            name: 'Clean Text',
            order: 0,
          },
        ],
      };
      
      expect(() => workflowSchema.parse(invalidWorkflow)).toThrow();
    });

    test('should reject workflows with too many steps', () => {
      const steps = Array.from({ length: 5 }, (_, i) => ({
        id: `step-${i}`,
        type: 'clean',
        name: `Step ${i}`,
        order: i,
      }));
      
      const invalidWorkflow = {
        name: 'Test Workflow',
        steps,
      };
      
      expect(() => workflowSchema.parse(invalidWorkflow)).toThrow();
    });
  });

  describe('createWorkflowSchema', () => {
    test('should validate workflow creation input', () => {
      const createInput = {
        name: 'New Workflow',
        description: 'Description',
        steps: [
          {
            id: 'step-1',
            type: 'clean',
            name: 'Clean',
            order: 0,
          },
          {
            id: 'step-2',
            type: 'summarize',
            name: 'Summarize',
            order: 1,
          },
        ],
      };
      
      const result = createWorkflowSchema.parse(createInput);
      expect(result).not.toHaveProperty('_id');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });
  });

  describe('stepResultSchema', () => {
    test('should validate successful step result', () => {
      const successResult = {
        stepId: 'step-1',
        stepName: 'Clean Text',
        input: 'Raw input text',
        output: 'Cleaned output text',
        duration: 1500,
        status: 'success',
      };
      
      const result = stepResultSchema.parse(successResult);
      expect(result).toEqual(successResult);
    });

    test('should validate error step result', () => {
      const errorResult = {
        stepId: 'step-1',
        stepName: 'Clean Text',
        input: 'Raw input text',
        output: '',
        duration: 500,
        status: 'error',
        error: 'Processing failed',
      };
      
      const result = stepResultSchema.parse(errorResult);
      expect(result).toEqual(errorResult);
    });

    test('should reject oversized content', () => {
      const oversizedResult = {
        stepId: 'step-1',
        stepName: 'Clean Text',
        input: 'a'.repeat(20000), // Exceeds 10000 limit
        output: 'Output',
        duration: 1000,
        status: 'success',
      };
      
      expect(() => stepResultSchema.parse(oversizedResult)).toThrow();
    });
  });

  describe('aiRequestSchema', () => {
    test('should validate AI request with defaults', () => {
      const request = {
        prompt: 'Summarize this text',
        content: 'Text to summarize',
      };
      
      const result = aiRequestSchema.parse(request);
      expect(result.model).toBe('llama3-8b-8192');
      expect(result.temperature).toBe(0.1);
      expect(result.maxTokens).toBe(4096);
    });

    test('should validate AI request with custom parameters', () => {
      const request = {
        prompt: 'Generate creative content',
        content: 'Base content',
        model: 'custom-model',
        temperature: 0.8,
        maxTokens: 2048,
      };
      
      const result = aiRequestSchema.parse(request);
      expect(result).toEqual(request);
    });

    test('should reject invalid temperature values', () => {
      const request = {
        prompt: 'Test prompt',
        content: 'Test content',
        temperature: 3.0, // Exceeds max of 2.0
      };
      
      expect(() => aiRequestSchema.parse(request)).toThrow();
    });
  });

  describe('paginationSchema', () => {
    test('should validate pagination with defaults', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('updatedAt');
      expect(result.sortOrder).toBe('desc');
    });

    test('should validate custom pagination parameters', () => {
      const params = {
        page: 3,
        limit: 25,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      };
      
      const result = paginationSchema.parse(params);
      expect(result).toEqual(params);
    });

    test('should reject invalid page numbers', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    test('should reject excessive limit values', () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    });
  });

  describe('fileUploadSchema', () => {
    test('should validate file with default size limit', () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const result = fileUploadSchema.parse({ file: mockFile });
      expect(result.file).toBe(mockFile);
      expect(result.maxSize).toBe(10 * 1024 * 1024);
    });

    test('should reject oversized files', () => {
      // Create a mock file that appears to exceed the size limit
      const mockFile = {
        size: 20 * 1024 * 1024, // 20MB
        name: 'large-file.txt',
      } as File;
      
      expect(() => fileUploadSchema.parse({ 
        file: mockFile, 
        maxSize: 10 * 1024 * 1024 
      })).toThrow();
    });
  });
});