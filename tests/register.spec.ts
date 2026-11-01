import { test, expect, type Page } from '@playwright/test';

async function fillForm(page: Page, type = 'COMPANY') {
  await page.getByLabel('نوع حساب', { exact: true }).selectOption(type);
  await page.getByLabel('نام کاربری', { exact: true }).fill('new-user');
  await page.getByLabel('شماره موبایل', { exact: true }).fill('۰۹۱۲۱۲۳۴۵۶۷');
  await page.getByLabel('رمز عبور', { exact: true }).fill('password123');
  await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('password123');
}

for (const accountType of ['COMPANY', 'DRIVER', 'BROKER']) {
  test(`OTP registration opens ${accountType} only after verification`, async ({ page }) => {
    let requests = 0;
    let verifies = 0;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname.endsWith('/request-otp')) {
        requests++;
        expect(route.request().postDataJSON()).toEqual({
          username: 'new-user',
          password: 'password123',
          phoneNumber: '09121234567',
          accountType,
        });
        await route.fulfill({
          json: { success: true, data: { phoneNumber: '+989121234567', expiresIn: 120 } },
        });
      } else if (url.pathname.endsWith('/verify-otp')) {
        verifies++;
        expect(route.request().postDataJSON()).toEqual({
          phoneNumber: '+989121234567',
          code: '123456',
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
        const payload = {
          username: 'new-user',
          userId: 'id',
          roles: [accountType],
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
        await route.fulfill({
          json: {
            success: true,
            data: {
              accessToken: `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`,
              refreshToken: 'test-refresh',
            },
          },
        });
      } else {
        await route.fulfill({ status: 404, json: { success: false } });
      }
    });
    await page.goto('/auth/register');
    await fillForm(page, accountType);
    await expect(page.getByText(/شماره‌ای را وارد کنید که با آن از تلگرام و واتساپ/)).toBeVisible();
    await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
    await expect(page.getByLabel('کد تأیید', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeNull();
    await expect(page.locator('#register-password')).toHaveValue('');
    await page.getByLabel('کد تأیید', { exact: true }).fill('۱۲۳۴۵۶');
    await page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' }).click();
    await expect(page.getByRole('button', { name: 'در حال تأیید…' })).toBeDisabled();
    await expect(page).toHaveURL(`/account/${accountType.toLowerCase()}`);
    expect(requests).toBe(1);
    expect(verifies).toBe(1);
    await page.reload();
    await expect(page.getByRole('heading', { name: /پنل/ })).toBeVisible();
  });
}

test('invalid OTP can be retried, expires, and a new code can be requested', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  let verifies = 0;
  await page.route('**/api/auth/register/request-otp', async (route) => {
    requests++;
    await route.fulfill({ json: { success: true, data: { expiresIn: 120 } } });
  });
  await page.route('**/api/auth/register/verify-otp', async (route) => {
    verifies++;
    await route.fulfill({ status: 400, json: { success: false } });
  });
  await page.goto('/auth/register');
  await fillForm(page);
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await page.getByLabel('کد تأیید', { exact: true }).fill('000000');
  await page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' }).click();
  await expect(page.getByRole('alert')).toContainText('نامعتبر');
  await expect(page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' })).toBeEnabled();
  await page.clock.runFor(120000);
  await expect(page.getByRole('button', { name: 'تأیید و تکمیل ثبت‌نام' })).toBeDisabled();
  await page.getByRole('button', { name: 'ویرایش شماره یا درخواست کد جدید' }).click();
  await expect(page.getByLabel('رمز عبور', { exact: true })).toHaveValue('');
  await fillForm(page);
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await expect(page.getByLabel('کد تأیید', { exact: true })).toHaveValue('');
  expect(requests).toBe(2);
  expect(verifies).toBe(1);
});

test('registration validates password confirmation and handles duplicate mobile or username', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/auth/register/request-otp', async (route) => {
    requests++;
    await route.fulfill({ status: 409, json: { success: false } });
  });
  await page.goto('/auth/register');
  await fillForm(page);
  await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('different');
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('یکسان نیستند');
  expect(requests).toBe(0);
  await fillForm(page);
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('نام کاربری یا شماره موبایل قبلاً ثبت شده');
  expect(requests).toBe(1);
});

test('account pages require login', async ({ page }) => {
  await page.goto('/account/driver');
  await expect(page).toHaveURL('/auth/login');
});
