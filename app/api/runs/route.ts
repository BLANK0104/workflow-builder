import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { processWithGemini } from '@/lib/gemini';
import { WorkflowRun, StepResult, Workflow } from '@/lib/types';
import { ObjectId } from 'mongodb';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    
    const db = await getDatabase();
    let query = db
      .collection<WorkflowRun>('runs')
      .find({})
      .sort({ createdAt: -1 });
    
    // Only apply limit if specified, otherwise return all
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const runs = await query.toArray();
    
    return NextResponse.json(runs);
  } catch (error) {
    log.error('Error fetching runs', {
      error: error instanceof Error ? error : String(error),
      operation: 'get_runs',
    });
    return NextResponse.json(
      { error: 'Failed to fetch runs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, input, inputType, fileName, fileType } = body;
    
    if (!workflowId || !input || input.trim() === '') {
      return NextResponse.json(
        { error: 'Workflow ID and input are required. Input cannot be empty.' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const workflow = await db
      .collection<Workflow>('workflows')
      .findOne({ _id: new ObjectId(workflowId) });
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    const startTime = Date.now();
    const results: StepResult[] = [];
    let currentInput = input;
    
    for (const step of workflow.steps) {
      const stepStartTime = Date.now();
      try {
        const output = await processWithGemini(currentInput, step.type, step.customPrompt);
        const stepDuration = Date.now() - stepStartTime;
        
        results.push({
          stepId: step.id,
          stepName: step.name,
          input: currentInput,
          output,
          duration: stepDuration,
          status: 'success',
        });
        
        currentInput = output;
      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          stepId: step.id,
          stepName: step.name,
          input: currentInput,
          output: '',
          duration: stepDuration,
          status: 'error',
          error: errorMessage,
        });
        
        // Return early with error details
        const run: WorkflowRun = {
          workflowId,
          workflowName: workflow.name,
          input,
          inputType: inputType || 'text',
          fileName,
          fileType,
          results,
          totalDuration: Date.now() - startTime,
          status: 'error',
          createdAt: new Date(),
        };
        
        const result = await db.collection<WorkflowRun>('runs').insertOne(run);
        return NextResponse.json({ ...run, _id: result.insertedId }, { status: 201 });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    const run: WorkflowRun = {
      workflowId,
      workflowName: workflow.name,
      input,
      inputType: inputType || 'text',
      fileName,
      fileType,
      results,
      totalDuration,
      status: 'success',
      createdAt: new Date(),
    };
    
    const result = await db.collection<WorkflowRun>('runs').insertOne(run);
    
    return NextResponse.json({ ...run, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    log.error('Error executing workflow', {
      error: error instanceof Error ? error : String(error),
      operation: 'execute_workflow',
    });
    return NextResponse.json(
      { error: `Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
