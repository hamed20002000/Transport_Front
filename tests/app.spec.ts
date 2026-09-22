import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const endpoints = JSON.parse(
  readFileSync(new URL('../src/core/config/endpoints.json', import.meta.url), 'utf8'),
);

async function signInFixture(page: Page, signedIn = true) {
  const payload = Buffer.from(
    JSON.stringify({ userid: 1, username: 'TestAdmin', role: 'Admin', exp: 4102444800 }),
  ).toString('base64url');
  if (signedIn)
    await page.addInitScript(
      (token) => localStorage.setItem('authToken', token),
      `e30.${payload}.test`,
    );
  const operations = ['category-view', 'orders-view', 'drivers-view'].map((id) => ({
    id,
    recordStatus: 0,
    systemOperation: { id: 'view', name: 'Görüntülemek' },
  }));
  const menus = [
    {
      id: 'category',
      name: 'Kategoriler',
      url: '/baseinfo/list-categories',
      icon: 'IconCategory',
      order: 1,
      recordStatus: 0,
      menus: [],
      menuOperations: [operations[0]],
    },
    {
      id: 'orders',
      name: 'Siparişler',
      url: '/order/list-order/',
      icon: 'IconShoppingCart',
      order: 2,
      recordStatus: 0,
      menus: [],
      menuOperations: [operations[1]],
    },
    {
      id: 'drivers',
      name: 'Sürücüler',
      url: '/driver/list-driver/',
      icon: 'IconTruck',
      order: 3,
      recordStatus: 0,
      menus: [],
      menuOperations: [operations[2]],
    },
  ];
  await page.route(`${endpoints.baseurl}**`, async (route) => {
    const url = route.request().url();
    let data: unknown = [];
    if (route.request().method() === 'POST' && url.endsWith('login')) data = `e30.${payload}.test`;
    else if (url.endsWith('get-roles')) data = [{ id: '1', name: 'Admin', recordStatus: 0 }];
    else if (url.endsWith('get-menus')) data = menus;
    else if (url.includes('get-role-with-operations/'))
      data = {
        roleMenuOperations: operations.map((menuOperation) => ({ recordStatus: 0, menuOperation })),
      };
    else if (url.includes('get-user-with-role-and-operations/')) data = { userMenuOperations: [] };
    await route.fulfill({ json: { success: true, httpStatusCode: 200, data } });
  });
  await page.route('**/socket.io/**', (route) => route.abort());
}

test('admin route redirects an anonymous user to the existing login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.locator('input').first()).toBeVisible();
});

test('admin uses authorized server menus, supports favorites, search, and CSV export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signInFixture(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'پنل مدیریت', exact: true })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Siparişler عمومی' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'افزودن به علاقه‌مندی‌ها: Siparişler' }).click();
  await page.getByRole('button', { name: 'علاقه‌مندی‌ها', exact: true }).click();
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(1);
  await page.getByLabel('جست‌وجو در بخش‌ها').fill('missing-page');
  await expect(page.getByText('بخشی پیدا نشد')).toBeVisible();
  await page.getByRole('button', { name: 'پاک‌کردن فیلترها' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'دریافت فهرست' }).click();
  expect((await download).suggestedFilename()).toBe('accessible-pages.csv');
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile admin does not overflow and uses the existing menu drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInFixture(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'پنل مدیریت', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'menu', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Kategoriler' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
});

test('an existing guarded feature still loads after route and UI migration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signInFixture(page);
  await page.goto('/baseinfo/list-categories');
  await expect(page.getByRole('heading', { name: 'Yeni Kategori Kaydı' })).toBeVisible();
  await expect(page.getByLabel('Kategori Ara')).toBeVisible();
  expect(errors).toEqual([]);
});

test('login loads permissions before redirecting and remembers only username', async ({ page }) => {
  await signInFixture(page, false);
  await page.goto('/auth/login?url=%2Fadmin');
  await page.getByLabel('نام کاربری', { exact: true }).fill('TestAdmin');
  await page.getByLabel('رمز عبور', { exact: true }).fill('test-password');
  await page.getByLabel('نام کاربری من را به خاطر بسپار').check();
  await page.getByLabel('رمز عبور', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'پنل مدیریت', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('transport.rememberedUsername'))).toBe(
    'TestAdmin',
  );
  await page.goto('/auth/login');
  await expect(page.getByLabel('نام کاربری', { exact: true })).toHaveValue('TestAdmin');
  await expect(page.getByLabel('رمز عبور', { exact: true })).toHaveValue('');
});
