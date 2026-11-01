import { test, expect } from '@playwright/test';

for (const status of [404, 500, 401]) {
  test(`login handles legacy API status ${status} without confusing it with invalid credentials`, async ({ page }) => {
    const token = `header.${Buffer.from(JSON.stringify({
      username: 'admin', userId: 'admin-id', roles: ['ADMIN'], isActive: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url')}.sig`;
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (!pathname.startsWith('/api/')) return route.continue();
      if (pathname.endsWith('/auth/login')) {
        await route.fulfill({ json: { success: true, data: token } });
      } else {
        await route.fulfill({ status, json: { success: false } });
      }
    });
    await page.goto('/auth/login');
    await page.getByLabel('نام کاربری', { exact: true }).fill('admin');
    await page.getByLabel('رمز عبور', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'ورود به پنل مدیریت' }).click();
    if (status === 404) {
      await expect(page).toHaveURL('/dashboards/dashboard');
    } else {
      await expect(page.getByRole('alert')).toContainText('دریافت اطلاعات حساب انجام نشد');
      await expect(page).toHaveURL('/auth/login');
    }
    expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBe(status === 401 ? null : token);
  });
}
