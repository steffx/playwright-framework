import { test, expect } from '../../src/fixtures/test';
import path from 'path';
import fs from 'fs/promises';

test.describe('Files, downloads and tabs', { tag: '@browser' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground/index.html');
  });

  test('uploads a file from disk', async ({ page }) => {
    await page.getByLabel('Attach receipt').setInputFiles(path.join(__dirname, '../../test-data/receipt.txt'));
    await expect(page.getByRole('list', { name: 'Selected files' })).toContainText('receipt.txt');
  });

  test('uploads multiple in-memory files', async ({ page }) => {
    await page.getByLabel('Attach receipt').setInputFiles([
      { name: 'a.csv', mimeType: 'text/csv', buffer: Buffer.from('id\n1\n') },
      { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from('{"ok":true}') },
    ]);
    const items = page.getByRole('list', { name: 'Selected files' }).getByRole('listitem');
    await expect(items).toHaveText(['a.csv (5 bytes)', 'b.json (11 bytes)']);
  });

  test('clears a file selection', async ({ page }) => {
    const input = page.getByLabel('Attach receipt');
    await input.setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
    await input.setInputFiles([]);
    await expect(input).toHaveJSProperty('files.length', 0);
  });

  test('downloads the product export and checks its contents', async ({ page }, testInfo) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Export products (CSV)' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('products.csv');
    const file = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(file);

    const lines = (await fs.readFile(file, 'utf-8')).trim().split('\n');
    expect(lines[0]).toBe('id,name,category,price');
    expect(lines).toHaveLength(7);
    await testInfo.attach('products.csv', { path: file });
  });

  test('handles a link that opens a new tab', async ({ page, context }) => {
    const pagePromise = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Open help center' }).click();
    const helpTab = await pagePromise;

    await helpTab.waitForLoadState();
    await expect(helpTab).toHaveTitle('ShopLite | Help center');
    await expect(helpTab.getByRole('heading', { name: 'Help center' })).toBeVisible();
    expect(context.pages()).toHaveLength(2);

    await helpTab.close();
    await expect(page.getByRole('heading', { name: 'Browser feature playground' })).toBeVisible();
  });

  test('two users in isolated browser contexts at the same time', async ({ browser }) => {
    // Each context is a separate incognito-like session: separate storage, cookies and carts.
    const alice = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const bob = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const [alicePage, bobPage] = await Promise.all([alice.newPage(), bob.newPage()]);

    await alicePage.goto('/login.html');
    await alicePage.getByLabel('Username').fill('standard_user');
    await alicePage.getByLabel('Password').fill('secret_sauce');
    await alicePage.getByRole('button', { name: 'Log in' }).click();
    await expect(alicePage).toHaveURL(/inventory/);

    await bobPage.goto('/inventory.html');
    await expect(bobPage).toHaveURL(/login/); // Bob is not logged in

    await Promise.all([alice.close(), bob.close()]);
  });
});
