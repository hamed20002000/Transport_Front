import { test, expect } from '@playwright/test';

test('OTP follows backend phone, code, expiry, cooldown and attempt limits', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  let verifies = 0;
  await page.route('**/api/auth/register/request-otp', async (route) => {
    requests++;
    expect(route.request().postDataJSON().phoneNumber).toBe('09121234567');
    await route.fulfill({ json: {
      success: true, data: { phoneNumber: '09121234567', expiresIn: 300, retryAfter: 60 },
    } });
  });
  await page.route('**/api/auth/register/verify-otp', async (route) => {
    verifies++;
    expect(route.request().postDataJSON()).toEqual({ phoneNumber: '09121234567', code: '123456' });
    await route.fulfill({ status: 429, json: { success: false } });
  });
  await page.goto('/auth/register');
  await page.getByLabel('نوع حساب', { exact: true }).selectOption('DRIVER');
  await page.getByLabel('نام کاربری', { exact: true }).fill('new-user');
  await page.getByLabel('شماره موبایل', { exact: true }).fill('+۹۸۹۱۲۱۲۳۴۵۶۷');
  const passwords = async () => {
    await page.getByLabel('رمز عبور', { exact: true }).fill('password123');
    await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('password123');
  };
  await passwords();
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await expect(page.getByText('اعتبار کد: 300 ثانیه')).toBeVisible();
  await page.getByLabel('کد تأیید', { exact: true }).fill('۱۲۳');
  await page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' }).click();
  await expect(page.getByRole('alert')).toContainText('شش‌رقمی');
  expect(verifies).toBe(0);
  await page.getByLabel('کد تأیید', { exact: true }).fill('۱۲۳۴۵۶');
  await page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' }).click();
  await expect(page.getByRole('alert')).toContainText('کد جدید درخواست کنید');
  await expect(page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' })).toBeDisabled();
  await page.getByRole('button', { name: 'ویرایش شماره یا درخواست کد جدید' }).click();
  await passwords();
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('شمارش معکوس');
  expect(requests).toBe(1);
  await page.clock.runFor(60000);
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await expect(page.getByLabel('کد تأیید', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' })).toBeEnabled();
  expect(requests).toBe(2);
  await page.clock.runFor(300000);
  await expect(page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' })).toBeDisabled();
});
