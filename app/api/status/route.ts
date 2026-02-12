import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { checkGeminiConnection } from '@/lib/gemini';

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
    console.error('Database health check failed:', error);
  }
  
  // Check LLM
  try {
    const isHealthy = await checkGeminiConnection();
    status.llm = isHealthy ? 'healthy' : 'unhealthy';
  } catch (error) {
    console.error('LLM health check failed:', error);
  }
  
  return NextResponse.json(status);
}
