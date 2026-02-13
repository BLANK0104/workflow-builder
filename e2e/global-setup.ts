import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Setting up global test environment...');
  
  // Wait for the dev server to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be available
    await page.goto(config.webServer?.url || 'http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    
    console.log('Application is ready for testing');
  } catch (error) {
    console.error('Failed to connect to application:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;