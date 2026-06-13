/**
 * tests/e2e/critical-flows.spec.ts — End-to-end smoke tests.
 * Run with Playwright. Skipped if no browser available.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

test.describe('Unify E2E — Critical Flows', () => {
  test('login page renders with Persian RTL', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('text=یونیفای')).toBeVisible();
    await expect(page.locator('text=شماره دانشجویی')).toBeVisible();
  });

  test('login as student and redirect to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', '99012341');
    await page.fill('input[name="password"]', 'Demo1234!@');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/student\/dashboard/, { timeout: 10_000 });
    await expect(page.locator('text=وضعیت فعلی')).toBeVisible();
  });

  test('student can navigate to scheduler', async ({ page }) => {
    // Assume already logged in via cookie / storage state
    await page.goto(`${BASE_URL}/student/scheduler`);
    await expect(page.locator('text=برنامه‌ریز درسی')).toBeVisible();
  });

  test('API health endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('unify-api');
  });

  test('unauthenticated API call returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/users/me`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTH_FORBIDDEN');
  });

  test('login via API returns tokens', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: '99012341', password: 'Demo1234!@' },
    });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.role).toBe('STUDENT');
  });
});
