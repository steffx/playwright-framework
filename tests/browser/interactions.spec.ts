import { test, expect } from '../../src/fixtures/test';

test.describe('Interactions and waiting', { tag: '@browser' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground/index.html');
  });

  test('auto-waits for slow content without sleeps', async ({ page }) => {
    await page.getByRole('button', { name: 'Load recommendations' }).click();
    // Content arrives after 1.5 to 2.5s; the assertion retries until it does.
    await expect(page.getByRole('list', { name: 'Recommendations' }).getByRole('listitem')).toHaveCount(3);
  });

  test('expect.poll retries any async function', async ({ page }) => {
    await page.getByRole('button', { name: 'Load recommendations' }).click();
    await expect
      .poll(() => page.getByRole('list', { name: 'Recommendations' }).getByRole('listitem').allInnerTexts(), {
        intervals: [250, 500, 1000],
        timeout: 5_000,
      })
      .toContain('Headlamp 400');
  });

  test('toPass retries a whole block of assertions', async ({ page }) => {
    await page.getByRole('button', { name: 'Load recommendations' }).click();
    await expect(async () => {
      const items = await page.getByRole('list', { name: 'Recommendations' }).getByRole('listitem').allInnerTexts();
      expect(items).toHaveLength(3);
      expect(items[0]).toBe('Merino Beanie');
    }).toPass({ timeout: 5_000 });
  });

  test('drags a product into the wishlist', async ({ page }) => {
    const wishlist = page.getByLabel('Wishlist drop zone');
    await page.getByText('Steel Water Bottle', { exact: true }).dragTo(wishlist);
    await expect(wishlist).toContainText('Steel Water Bottle');
  });

  test('shows a tooltip on hover', async ({ page }) => {
    const tip = page.getByRole('tooltip');
    await expect(tip).toBeHidden();
    await page.getByRole('button', { name: 'Shipping info' }).hover();
    await expect(tip).toHaveText('Free shipping over $50');
  });

  test('handles keyboard shortcuts', async ({ page }) => {
    await page.getByLabel('Press Control+K in here').press('ControlOrMeta+k');
    await expect(page.locator('#shortcut-result')).toHaveText('Command palette opened');
  });

  test('types character by character', async ({ page }) => {
    const box = page.getByLabel('Press Control+K in here');
    await box.pressSequentially('hello', { delay: 30 });
    await expect(box).toHaveValue('hello');
    await box.clear();
    await expect(box).toBeEmpty();
  });

  test('runs JavaScript in the page', async ({ page }) => {
    const title = await page.evaluate(() => document.title);
    expect(title).toBe('ShopLite | Playground');
    const sectionCount = await page.locator('section').evaluateAll((els) => els.length);
    expect(sectionCount).toBeGreaterThanOrEqual(8);
  });

  test('known bug example: marked as failing', async ({ page }) => {
    // test.fail() documents a known defect: the test passes while the bug exists
    // and starts failing once it is fixed, reminding you to remove the marker.
    test.fail(true, 'BUG-123: prompt accepts an empty list name');
    page.once('dialog', (d) => d.accept(''));
    await page.getByRole('button', { name: 'Rename list' }).click();
    await expect(page.locator('#dialog-result')).toHaveText('List renamed to ');
  });

  test.fixme('drag and drop reorders wishlist items', async () => {
    // test.fixme: planned coverage, skipped until the feature exists.
  });
});
