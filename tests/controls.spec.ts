import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/controls.html');
});

test('text fields and checkboxes retain native form behavior', async ({ page }) => {
  await page.getByLabel('Name', { exact: true }).fill('Shipment A');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Shipment A');
  await page.getByLabel('Accept').check();
  await expect(page.getByTestId('checked')).toHaveText('true');
});
test('controlled searchable select preserves numeric identifiers', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Destination', exact: true }).click();
  await page.getByLabel('Find destination').fill('tab');
  await page.getByRole('option', { name: 'Tabriz' }).click();
  await expect(page.getByTestId('selection')).toHaveText('number:2');
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
test('multiple select retains selected IDs and remains open', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Multiple destinations' }).click();
  await page.getByRole('option', { name: 'Tehran' }).click();
  await page.getByRole('option', { name: 'Shiraz' }).click();
  await expect(page.getByTestId('multiple')).toHaveText('[1,3]');
  await page.getByRole('option', { name: 'Tehran' }).click();
  await expect(page.getByTestId('multiple')).toHaveText('[3]');
});
test('autocomplete supports keyboard filtering, selection, and clear', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Search city' }).fill('tab');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Search city' }).press('ArrowDown');
  await page.getByRole('combobox', { name: 'Search city' }).press('Enter');
  await expect(page.getByTestId('autocomplete')).toHaveText('Tabriz');
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.getByRole('combobox', { name: 'Search city' })).toHaveValue('');
});
test('date input returns a local Date and can be cleared', async ({ page }) => {
  await page.getByLabel('Departure date').fill('2026-09-22');
  await expect(page.getByTestId('date')).toHaveText('2026-9-22');
  await page.getByLabel('Departure date').fill('');
  await expect(page.getByTestId('date')).toHaveText('empty');
});
test('dialog has a title, traps focus, dismisses with Escape and restores focus', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Edit shipment' })).toBeVisible();
  await expect(page.getByLabel('Reference')).toBeFocused();
  await page.getByLabel('Reference').press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test('tabs, accordion, and pagination update their controlled state', async ({ page }) => {
  await page.getByRole('tab', { name: 'Second' }).click();
  await expect(page.getByRole('tabpanel')).toHaveText('Second panel');
  await page.getByRole('button', { name: 'Shipment details' }).click();
  await expect(page.getByText('Tracked cargo')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByTestId('page')).toHaveText('1:5');
  await page.getByRole('combobox', { name: 'Rows per page:' }).selectOption('10');
  await expect(page.getByTestId('page')).toHaveText('0:10');
});
