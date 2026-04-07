import { test, expect } from '@playwright/test';
import path from 'path';

const CSV_PATH = path.join(__dirname, 'fixtures', 'revolut-test.csv');

test.describe('CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="your username"]', 'demo');
    await page.fill('input[type="password"]', 'DemoPassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('clicking upload area opens the file picker', async ({ page }) => {
    await page.goto('/import');
    await page.click('text=Revolut');

    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await page.locator('text=Click to select a file').first().click();

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('uploading a CSV imports transactions successfully', async ({ page }) => {
    await page.goto('/import');
    await page.click('text=Revolut');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);

    await expect(page.getByText('Import complete')).toBeVisible({ timeout: 10000 });
  });
});
