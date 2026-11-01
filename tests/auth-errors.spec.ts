import { test, expect } from '@playwright/test';

for (const screen of ['login', 'register']) {
  test(`${screen} clears errors after ten seconds and on edits or actions`, async ({ page }) => {
    await page.clock.install();
    await page.route(
      `**/api/auth/${screen === 'register' ? 'register/request-otp' : 'login'}`,
      (route) =>
        route.fulfill({ status: screen === 'login' ? 401 : 409, json: { success: false } }),
    );
    await page.goto(`/auth/${screen}`);
    if (screen === 'register') {
      await page.getByLabel('نوع حساب', { exact: true }).selectOption('DRIVER');
      await page.getByLabel('شماره موبایل', { exact: true }).fill('09121234567');
      await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('password123');
    }
    await page.getByLabel('نام کاربری', { exact: true }).fill('test-user');
    await page.getByLabel('رمز عبور', { exact: true }).fill('password123');
    const submit = page.getByRole('button', {
      name: screen === 'login' ? 'ورود به پنل مدیریت' : 'ارسال کد تأیید',
      exact: true,
    });
    await submit.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.clock.runFor(9000);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.clock.runFor(1000);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await submit.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByLabel('نام کاربری', { exact: true }).fill('another-user');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await submit.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'نمایش رمز عبور', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}
