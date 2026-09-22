import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`login fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'خوش آمدید!' })).toBeVisible();
    await expect(page.getByLabel('نام کاربری', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const input = page.getByLabel('رمز عبور', { exact: true });
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await input.fill('sample-password');
    await page.getByRole('button', { name: 'نمایش رمز عبور' }).click();
    await expect(input).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'پنهان کردن رمز عبور' }).click();
    await expect(input).toHaveAttribute('type', 'password');
    await page.screenshot({ path: `test-results/login-${viewport.width}.png`, fullPage: true });
  });
}

test('login submits credentials, prevents duplicate requests and recovers from API errors', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/*login', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      username: 'test-user',
      password: 'wrong-password',
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 401, json: { success: false } });
  });
  await page.goto('/auth/login');
  await page.getByLabel('نام کاربری', { exact: true }).fill('test-user');
  await page.getByLabel('رمز عبور', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'ورود به پنل مدیریت' }).click();
  await expect(page.getByRole('button', { name: 'در حال ورود…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('نام کاربری یا رمز عبور صحیح نیست.');
  await expect(page.getByRole('button', { name: 'ورود به پنل مدیریت' })).toBeEnabled();
  expect(requests).toBe(1);
});
