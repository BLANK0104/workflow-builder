import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Workflow } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const workflow = await db
      .collection<Workflow>('workflows')
      .findOne({ _id: new ObjectId(id) });
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const result = await db
      .collection<Workflow>('workflows')
      .deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Workflow deleted' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, steps } = body;
    
    if (!name || !steps || steps.length < 2 || steps.length > 4) {
      return NextResponse.json(
        { error: 'Workflow must have a name and 2-4 steps' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const result = await db.collection<Workflow>('workflows').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || '',
          steps,
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    const workflow = await db.collection<Workflow>('workflows').findOne({ _id: new ObjectId(id) });
    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}
