import { test, expect } from '../../src/fixtures/test';

// Visual regression. Baselines are per browser and OS, so generate them in the same
// environment CI uses (the Docker image) with: npm run test:update-snapshots
test.describe('Visual regression', { tag: '@visual' }, () => {
  test.use({ viewport: { width: 1280, height: 800 } });


  test('product grid', async ({ page, inventoryPage }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.cards).toHaveCount(6);
    // Mask parts that legitimately change between runs (here: the per-user greeting).
    await expect(page).toHaveScreenshot('inventory.png', {
      fullPage: true,
      mask: [inventoryPage.header.greeting],
    });
  });

  test('single product card', async ({ inventoryPage }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.card('Trail Backpack')).toHaveScreenshot('product-card.png');
  });

  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page', async ({ page }) => {
      await page.goto('/login.html');
      await expect(page).toHaveScreenshot('login.png', { fullPage: true });
    });

    test('login form accessibility tree', async ({ page }) => {
      // ARIA snapshot: compares the structure screen readers see, not pixels.
      // Robust to styling changes, catches lost labels and roles.
      await page.goto('/login.html');
      await expect(page.locator('form')).toMatchAriaSnapshot(`
        - text: Username
        - textbox "Username"
        - text: Password
        - textbox "Password"
        - paragraph:
          - button "Log in"
        - alert
      `);
    });
  });
});
