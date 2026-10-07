import { test, expect } from '../../src/fixtures/test';

test.describe('Dialogs and frames', { tag: '@browser' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground/index.html');
  });

  test('accepts an alert and reads its message', async ({ page }) => {
    // Register the handler before the action that opens the dialog.
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Welcome to ShopLite!');
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Show alert' }).click();
    await expect(page.locator('#dialog-result')).toHaveText('Alert closed');
  });

  test('dismisses a confirm', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.locator('#dialog-result')).toHaveText('Deletion cancelled');
  });

  test('accepts a confirm', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.locator('#dialog-result')).toHaveText('Account deleted');
  });

  test('answers a prompt', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.defaultValue()).toBe('My list');
      await dialog.accept('Camping trip');
    });
    await page.getByRole('button', { name: 'Rename list' }).click();
    await expect(page.locator('#dialog-result')).toHaveText('List renamed to Camping trip');
  });

  test('fills a form inside an iframe', async ({ page }) => {
    // frameLocator-style access: locators pierce into the frame and auto-wait like any other.
    const frame = page.frameLocator('iframe[title="Newsletter signup"]');
    await frame.getByLabel('Email address').fill('stefan@example.com');
    await frame.getByRole('button', { name: 'Subscribe' }).click();
    await expect(frame.getByRole('status')).toHaveText('Subscribed stefan@example.com');
  });

  test('validates inside the iframe via the Frame API', async ({ page }) => {
    const frame = page.frame({ url: /newsletter\.html/ });
    expect(frame).not.toBeNull();
    await frame!.getByLabel('Email address').fill('not-an-email');
    await frame!.getByRole('button', { name: 'Subscribe' }).click();
    await expect(frame!.getByRole('status')).toHaveText('Enter a valid email');
  });
});
