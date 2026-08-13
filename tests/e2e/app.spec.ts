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

test('pasting a URL into the destination field does not duplicate it', async ({ page, context }) => {
  const destination = 'https://www.youtube.com/watch?v=Y557UYdulIU';
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('#destination').click();
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, destination);
  await page.keyboard.press('ControlOrMeta+v');
  await expect(page.locator('#destination')).toHaveValue(destination);
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
