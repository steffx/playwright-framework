import { test, expect } from '../../src/fixtures/test';
import { PRODUCTS } from '../../src/data/products';

// Runs only in the mobile-chrome project (Pixel 7 emulation: small viewport, touch, mobile UA).
test.describe('Mobile', { tag: '@mobile' }, () => {
  test('runs with a mobile viewport and touch', async ({ page, isMobile, hasTouch }) => {
    expect(isMobile).toBe(true);
    expect(hasTouch).toBe(true);
    expect(page.viewportSize()!.width).toBeLessThan(500);
  });

  test('product grid collapses to one column', async ({ inventoryPage }) => {
    await inventoryPage.goto();
    const [first, second] = await Promise.all([
      inventoryPage.cards.nth(0).boundingBox(),
      inventoryPage.cards.nth(1).boundingBox(),
    ]);
    expect(second!.y).toBeGreaterThan(first!.y); // stacked, not side by side
    expect(Math.round(second!.x)).toBe(Math.round(first!.x));
  });

  test('shopper can add to cart with a tap', async ({ shopperPage, inventoryPage }) => {
    await inventoryPage.goto();
    await inventoryPage.card(PRODUCTS.tote.name).getByRole('button').tap();
    await expect(inventoryPage.header.cartCount).toHaveText('1');
  });
});
