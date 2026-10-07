import { test, expect } from '../../src/fixtures/test';
import { PRODUCTS } from '../../src/data/products';

// Automated WCAG 2.1 AA scans with axe-core. They catch roughly a third to a half of
// accessibility issues (missing labels, contrast, ARIA misuse); keyboard tests below cover more.
test.describe('Accessibility', { tag: '@a11y' }, () => {
  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page has no WCAG violations', async ({ page, makeAxeBuilder }, testInfo) => {
      await page.goto('/login.html');
      const results = await makeAxeBuilder().analyze();
      // Full axe report attached to the HTML report for triage.
      await testInfo.attach('axe-results', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
      expect(results.violations).toEqual([]);
    });
  });

  test('product list has no WCAG violations', async ({ inventoryPage, makeAxeBuilder }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.cards.first()).toBeVisible();
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('cart page has no WCAG violations', async ({ shopperPage, cartPage, api, makeAxeBuilder }) => {
    await api.seedCart([{ productId: PRODUCTS.tote.id }]);
    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(1);
    const results = await makeAxeBuilder().include('main').analyze(); // scope a scan to one region
    expect(results.violations).toEqual([]);
  });

  test('checkout form can be completed with the keyboard only', async ({ shopperPage, page, api, checkoutPage }) => {
    await api.seedCart([{ productId: PRODUCTS.tote.id }]);
    await checkoutPage.goto();

    await checkoutPage.firstName.focus();
    await page.keyboard.type('Ada');
    await page.keyboard.press('Tab');
    await expect(checkoutPage.lastName).toBeFocused();
    await page.keyboard.type('Lovelace');
    await page.keyboard.press('Tab');
    await page.keyboard.type('28202');
    await page.keyboard.press('Enter'); // submits the form

    await expect(checkoutPage.placeOrderButton).toBeVisible();
  });
});
