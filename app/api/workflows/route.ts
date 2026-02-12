import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Workflow } from '@/lib/types';

export async function GET() {
  try {
    const db = await getDatabase();
    const workflows = await db
      .collection<Workflow>('workflows')
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();
    
    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, steps } = body;
    
    if (!name || !steps || steps.length < 2 || steps.length > 4) {
      return NextResponse.json(
        { error: 'Workflow must have a name and 2-4 steps' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const workflow: Workflow = {
      name,
      description: description || '',
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<Workflow>('workflows').insertOne(workflow);
    
    return NextResponse.json({ ...workflow, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
