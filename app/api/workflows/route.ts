import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { 
  withStandardMiddleware, 
  withValidation, 
  withMethodValidation,
  createApiResponse,
  composeMiddleware 
} from '@/lib/middleware';
import { 
  workflowSchema, 
  createWorkflowSchema, 
  workflowQuerySchema,
  type Workflow,
  type CreateWorkflow 
} from '@/lib/validation';
import { log } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/retry';

// GET /api/workflows - List workflows with pagination and filtering
const getHandler = withValidation(workflowQuerySchema, 'query')(
  async (request: NextRequest, query) => {
    const timer = log.time('get_workflows');
    
    try {
      const db = await getDatabase();
      
      // Build filter and sort options
      const filter: any = {};
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } },
        ];
      }
      if (query.stepType) {
        filter['steps.type'] = query.stepType;
      }
      
      const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
      const skip = (query.page - 1) * query.limit;
      
      // Execute query with retry logic
      const [workflows, totalCount] = await retryWithBackoff(async () => {
        const collection = db.collection<Workflow>('workflows');
        return await Promise.all([
          collection
            .find(filter)
            .sort({ [query.sortBy]: sortDirection })
            .skip(skip)
            .limit(query.limit)
            .toArray(),
          collection.countDocuments(filter),
        ]);
      }, {}, { operation: 'fetch_workflows' });
      
      log.info('Successfully fetched workflows', {
        count: workflows.length,
        total: totalCount,
        page: query.page,
        operation: 'get_workflows',
      });
      
      timer.end();
      
      return createApiResponse({
        workflows,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / query.limit),
        },
      }, `Found ${workflows.length} workflows`);
      
    } catch (error) {
      timer.end();
      log.error('Failed to fetch workflows', { 
        error: error instanceof Error ? error : String(error), 
        operation: 'get_workflows' 
      });
      throw error;
    }
  }
);

// POST /api/workflows - Create new workflow
const postHandler = withValidation(createWorkflowSchema)(
  async (request: NextRequest, workflowData: CreateWorkflow) => {
    const timer = log.time('create_workflow');
    
    try {
      const db = await getDatabase();
      
      // Validate and create workflow
      const workflow = workflowSchema.parse({
        ...workflowData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Insert with retry logic
      const result = await retryWithBackoff(async () => {
        return await db.collection<Workflow>('workflows').insertOne(workflow);
      }, {}, { operation: 'create_workflow' });
      
      const createdWorkflow = { ...workflow, _id: result.insertedId };
      
      log.info('Successfully created workflow', {
        workflowId: result.insertedId?.toString(),
        workflowName: workflow.name,
        stepCount: workflow.steps.length,
        operation: 'create_workflow',
      });
      
      timer.end();
      
      return createApiResponse(
        createdWorkflow, 
        'Workflow created successfully', 
        201
      );
      
    } catch (error) {
      timer.end();
      log.error('Failed to create workflow', { 
        error: error instanceof Error ? error : String(error), 
        workflowName: workflowData.name,
        operation: 'create_workflow' 
      });
      throw error;
    }
  }
);

// Apply middleware and method validation
const middlewareStack = composeMiddleware(
  withStandardMiddleware,
  withMethodValidation(['GET', 'POST'])
);

export const GET = middlewareStack(getHandler);
export const POST = middlewareStack(postHandler);
