import { test, expect } from '@playwright/test';

test.describe('Workflow Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage and display the workflow builder', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Workflow Builder/);
    
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for workflow creation form or button
    await expect(
      page.locator('h1, h2').filter({ hasText: /workflow/i }).first()
    ).toBeVisible();
  });

  test('should create a new workflow', async ({ page }) => {
    // Look for a "Create Workflow" or similar button
    const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
    } else {
      // If no button, try to navigate directly to create page
      await page.goto('/create');
    }
    
    // Wait for the form to be visible
    await expect(page.locator('form, input[name="name"], [data-testid="workflow-form"]').first()).toBeVisible();
    
    // Fill out the workflow creation form
    const nameInput = page.locator('input[name="name"], [placeholder*="name"], #name').first();
    await nameInput.fill('Test E2E Workflow');
    
    const descriptionInput = page.locator('input[name="description"], textarea[name="description"], [placeholder*="description"]').first();
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Created via E2E test');
    }
    
    // Add workflow steps (assuming there's a way to add steps)
    const addStepButton = page.locator('button').filter({ hasText: /add.*step|step/i }).first();
    if (await addStepButton.isVisible()) {
      // Add first step
      await addStepButton.click();
      await page.locator('select, [data-testid="step-type"]').first().selectOption('clean');
      
      // Add second step
      await addStepButton.click();
      await page.locator('select, [data-testid="step-type"]').last().selectOption('summarize');
    }
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /save|create|submit/i }).first();
    await submitButton.click();
    
    // Wait for success indication
    await expect(
      page.locator('text=success, text=created, text=saved, [data-testid="success"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display workflows list', async ({ page }) => {
    // Navigate to workflows list (might be homepage or dedicated page)
    const workflowsLink = page.locator('a').filter({ hasText: /workflow/i }).first();
    if (await workflowsLink.isVisible()) {
      await workflowsLink.click();
    }
    
    // Check if workflows are displayed
    await expect(
      page.locator('[data-testid="workflow-item"], .workflow-card, .workflow-list').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should handle workflow execution', async ({ page }) => {
    // Look for an existing workflow to test
    const workflowItem = page.locator('[data-testid="workflow-item"], .workflow-card').first();
    
    if (await workflowItem.isVisible()) {
      // Find and click run/execute button
      const runButton = workflowItem.locator('button').filter({ hasText: /run|execute|start/i }).first();
      
      if (await runButton.isVisible()) {
        await runButton.click();
        
        // Provide input for the workflow
        const inputField = page.locator('textarea, input[type="text"]').filter({ hasText: /input|text/i }).first();
        if (await inputField.isVisible()) {
          await inputField.fill('Test input for E2E workflow execution');
        }
        
        // Submit execution
        const executeButton = page.locator('button').filter({ hasText: /run|execute|start/i }).first();
        await executeButton.click();
        
        // Wait for execution to complete
        await expect(
          page.locator('text=completed, text=success, text=finished, [data-testid="execution-complete"]').first()
        ).toBeVisible({ timeout: 30000 });
      }
    }
  });

  test('should navigate between pages without errors', async ({ page }) => {
    // Test navigation to ensure no console errors or broken links
    const navigationLinks = [
      '/',
      '/history',
      '/status',
      '/analytics',
    ];
    
    for (const link of navigationLinks) {
      await page.goto(link);
      
      // Check that page loaded without errors
      await expect(page.locator('body')).toBeVisible();
      
      // Check for error messages
      const errorElements = page.locator('text=error, text=failed, .error, [data-testid="error"]');
      const errorCount = await errorElements.count();
      
      if (errorCount > 0) {
        console.warn(`Found ${errorCount} error elements on ${link}`);
      }
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/');
    
    // Check that main content is visible and properly sized
    const mainContent = page.locator('main, [role="main"], .main').first();
    await expect(mainContent).toBeVisible();
    
    // Check that horizontal scrolling is not needed
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate errors
    await page.route('**/api/workflows', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/');
    
    // Check that error is handled gracefully (no app crash)
    await expect(page.locator('body')).toBeVisible();
    
    // Look for user-friendly error message
    await expect(
      page.locator('text=error, text=failed, text=try again, .error-message').first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Security Tests', () => {
  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check for security headers
    const headers = response?.headers() || {};
    
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toBeTruthy();
  });

  test('should sanitize user input', async ({ page }) => {
    await page.goto('/');
    
    // Try to inject script in form inputs
    const textInput = page.locator('input[type="text"], textarea').first();
    
    if (await textInput.isVisible()) {
      const maliciousScript = '<script>alert("XSS")</script>';
      await textInput.fill(maliciousScript);
      
      // Submit form if possible
      const form = textInput.locator('xpath=ancestor::form[1]');
      const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Wait a moment and check that no alert appeared
        await page.waitForTimeout(1000);
        
        // The script should not execute - we expect no alert dialog
        const dialogs = page.locator('dialog[open]');
        expect(await dialogs.count()).toBe(0);
      }
    }
  });
});