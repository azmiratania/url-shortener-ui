import { expect, test } from '@playwright/test';

test('home page loads and shortens a URL', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('links');

  await page.fill('#destination', 'https://example.com/playwright-test');
  await page.click('#submit-btn');

  await expect(page.locator('#result.visible, #result')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#short-link')).not.toHaveText('');
  await expect(page.locator('#qr-image')).toBeVisible();
});

test('logo reloads the page', async ({ page }) => {
  await page.goto('/');
  await page.fill('#destination', 'https://example.com/reload-test');
  await page.click('#logo-home');
  await expect(page.locator('#destination')).toHaveValue('');
});

test('health endpoint responds', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  await expect(res.json()).resolves.toMatchObject({ status: 'ok' });
});
