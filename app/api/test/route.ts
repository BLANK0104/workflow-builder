import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const db = await getDatabase();
    
    // Simple ping to verify connection
    const result = await db.admin().ping();
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Database connection successful',
      ping: result,
      env: {
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
        groqKey: process.env.GROQ_API_KEY ? 'Set' : 'Not Set',
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    log.error('Database test failed', {
      error: error instanceof Error ? error : String(error),
      operation: 'database_test',
    });
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
        env: {
          mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
          groqKey: process.env.GROQ_API_KEY ? 'Set' : 'Not Set',
          nodeEnv: process.env.NODE_ENV
        }
      },
      { status: 500 }
    );
  }
}