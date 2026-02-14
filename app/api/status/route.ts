import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { checkGeminiConnection } from '@/lib/gemini';
import { log } from '@/lib/logger';

export async function GET() {
  const status = {
    backend: 'healthy',
    database: 'unhealthy',
    llm: 'unhealthy',
    timestamp: new Date().toISOString(),
  };
  
  // Check database
  try {
    const db = await getDatabase();
    await db.admin().ping();
    status.database = 'healthy';
  } catch (error) {
    log.error('Database health check failed', {
      error: error instanceof Error ? error : String(error),
      operation: 'health_check',
    });
  }
  
  // Check LLM
  try {
    const isHealthy = await checkGeminiConnection();
    status.llm = isHealthy ? 'healthy' : 'unhealthy';
  } catch (error) {
    log.error('LLM health check failed', {
      error: error instanceof Error ? error : String(error),
      operation: 'health_check',
    });
  }
  
  return NextResponse.json(status);
}
