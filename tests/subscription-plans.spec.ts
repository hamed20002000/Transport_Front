import { test, expect } from '@playwright/test';

for (const currency of ['IRR', 'EUR', 'GBP', 'SAR', 'CNY']) {
  test(`admin creates an exact-price ${currency} plan`, async ({ page }) => {
    const token = `header.${Buffer.from(JSON.stringify({ username: 'admin', roles: ['ADMIN'], isActive: true, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
    await page.addInitScript((token) => localStorage.setItem('authToken', token), token);
    let plans: unknown[] = [];
    let creates = 0;
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path === '/api/admin/subscription-plans') {
        expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
        if (route.request().method() === 'POST') {
          creates++;
          const data = route.request().postDataJSON();
          expect(data).toEqual({
            title: 'اشتراک شرکت',
            accountType: 'COMPANY',
            durationDays: 30,
            price: '9007199254740993',
            currency,
            recordStatus: 0,
            sortOrder: 0,
          });
          plans = [{ ...data, id: 'plan-1' }];
          return route.fulfill({ status: 201, json: { success: true, data: plans[0] } });
        }
        return route.fulfill({ json: { success: true, data: plans } });
      }
      return route.fulfill({ status: 404, json: { success: false } });
    });
    await page.goto('/admin');
    await page.getByRole('link', { name: 'پلن‌های اشتراک', exact: true }).first().click();
    await expect(page.getByText('هنوز پلنی ثبت نشده است.')).toBeVisible();
    await page.getByLabel('عنوان پلن').fill('اشتراک شرکت');
    await page.getByLabel('نوع حساب').selectOption('COMPANY');
    await page.getByLabel('واحد پول', { exact: true }).selectOption(currency);
    await page.locator('input[name=price]').fill('۹۰۰۷۱۹۹۲۵۴۷۴۰۹۹۳');
    await expect(page.locator('input[name=price]')).toHaveValue('۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳');
    await page.getByRole('button', { name: 'ثبت پلن', exact: true }).click();
    await expect(page.getByText('پلن اشتراک با موفقیت ثبت شد.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'اشتراک شرکت', exact: true })).toBeVisible();
    expect(creates).toBe(1);
    await page.reload();
    await expect(page.getByRole('cell', { name: 'اشتراک شرکت', exact: true })).toBeVisible();
  });
}

test('non-admin cannot open plans or call its API', async ({ page }) => {
  const token = `header.${Buffer.from(JSON.stringify({ username: 'driver', roles: ['DRIVER'], isActive: true, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
  await page.addInitScript((token) => localStorage.setItem('authToken', token), token);
  let calls = 0;
  await page.route('**/api/admin/subscription-plans', (route) => {
    calls++;
    return route.fulfill({ status: 403 });
  });
  await page.goto('/admin/subscription-plans');
  await expect(page.getByRole('alert')).toContainText('فقط برای مدیر');
  expect(calls).toBe(0);
});

test('admin deletes a plan by deactivating it', async ({ page }) => {
  const token = `header.${Buffer.from(JSON.stringify({ username: 'admin', roles: ['ADMIN'], isActive: true, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
  await page.addInitScript((token) => localStorage.setItem('authToken', token), token);
  const plan = { id: '6f1c2a3e-8b7d-4c5e-9a1b-2c3d4e5f6a7b', title: 'اشتراک راننده', accountType: 'DRIVER', durationDays: 30, price: '1000', currency: 'IRR', recordStatus: 0, sortOrder: 0 };
  let active = true;
  const deletes: string[] = [];
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (!path.startsWith('/api/admin/subscription-plans'))
      return route.fulfill({ status: 404, json: { success: false } });
    if (route.request().method() === 'DELETE') {
      deletes.push(path);
      active = false;
      return route.fulfill({ json: { success: true, data: { id: plan.id } } });
    }
    return route.fulfill({ json: { success: true, data: active ? [plan] : [] } });
  });
  await page.goto('/admin/subscription-plans');
  await expect(page.getByRole('cell', { name: 'اشتراک راننده', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'حذف اشتراک راننده' }).click();
  await expect(page.getByText('پلن اشتراک حذف شد.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'اشتراک راننده', exact: true })).toHaveCount(0);
  expect(deletes).toEqual([`/api/admin/subscription-plans/${plan.id}`]);
  await page.reload();
  await expect(page.getByText('هنوز پلنی ثبت نشده است.')).toBeVisible();
});

test('price input groups digits in threes while typing', async ({ page }) => {
  const token = `header.${Buffer.from(JSON.stringify({ username: 'admin', roles: ['ADMIN'], isActive: true, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
  await page.addInitScript((token) => localStorage.setItem('authToken', token), token);
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/admin/subscription-plans') return route.fulfill({ json: { success: true, data: [] } });
    return route.fulfill({ status: 404, json: { success: false } });
  });
  await page.goto('/admin/subscription-plans');
  const price = page.locator('input[name=price]');
  await price.pressSequentially('1250000');
  await expect(price).toHaveValue('۱٬۲۵۰٬۰۰۰');
  await price.pressSequentially('abc');
  await expect(price).toHaveValue('۱٬۲۵۰٬۰۰۰');
  // Insert a digit in the middle: the caret must stay right after it.
  await price.evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 1));
  await price.pressSequentially('9');
  await expect(price).toHaveValue('۱۹٬۲۵۰٬۰۰۰');
  await price.pressSequentially('8');
  await expect(price).toHaveValue('۱۹۸٬۲۵۰٬۰۰۰');
  await price.press('End');
  await price.press('Backspace');
  await expect(price).toHaveValue('۱۹٬۸۲۵٬۰۰۰');
});
