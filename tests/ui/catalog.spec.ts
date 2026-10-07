import { test, expect } from '../../src/fixtures/test';
import { PRODUCTS } from '../../src/data/products';

// Uses the session saved by the setup project (no login code needed here).
test.describe('Product catalog', { tag: '@catalog' }, () => {
  test.beforeEach(async ({ inventoryPage }) => {
    await inventoryPage.goto();
  });

  test('lists every product from the catalog', { tag: '@smoke' }, async ({ inventoryPage, catalog }) => {
    // `catalog` is a worker-scoped fixture fetched from the API: the UI must match the backend.
    await expect(inventoryPage.cards).toHaveCount(catalog.length);
    expect(await inventoryPage.productNames()).toEqual(catalog.map((p) => p.name));
  });

  test('search filters products by name', async ({ inventoryPage }) => {
    await inventoryPage.search.fill('ba');
    // Auto-retrying assertion: waits through the debounce and re-render, no sleeps.
    await expect(inventoryPage.cards).toHaveCount(1);
    await expect(inventoryPage.cards.first()).toContainText(PRODUCTS.backpack.name);
  });

  test('search with no matches shows an empty state', async ({ inventoryPage }) => {
    await inventoryPage.search.fill('unicorn');
    await expect(inventoryPage.status).toHaveText('No products match your search');
    await expect(inventoryPage.cards).toHaveCount(0);
  });

  test('category filter shows only that category', async ({ inventoryPage }) => {
    await inventoryPage.category.selectOption('apparel');
    await expect(inventoryPage.cards).toHaveCount(2);
    await expect(inventoryPage.cards.getByRole('heading')).toHaveText([PRODUCTS.beanie.name, PRODUCTS.jacket.name]);
  });

  test.describe('sorting', () => {
    test('by price, low to high', async ({ inventoryPage }) => {
      await inventoryPage.sortBy('Price (low to high)');
      await expect(inventoryPage.cards.first()).toContainText(PRODUCTS.bottle.name);
      expect(await inventoryPage.productPrices()).toBeSorted(); // custom matcher
    });

    test('by price, high to low', async ({ inventoryPage }) => {
      await inventoryPage.sortBy('Price (high to low)');
      await expect(inventoryPage.cards.first()).toContainText(PRODUCTS.jacket.name);
      expect(await inventoryPage.productPrices()).toBeSorted({ descending: true });
    });

    test('by name, Z to A', async ({ inventoryPage }) => {
      await inventoryPage.sortBy('Name (Z to A)');
      await expect(inventoryPage.cards.first()).toContainText(PRODUCTS.backpack.name);
      expect(await inventoryPage.productNames()).toBeSorted({ descending: true });
    });
  });

  test('sold-out products cannot be added', async ({ inventoryPage }) => {
    const card = inventoryPage.card(PRODUCTS.headlamp.name);
    await expect(card.getByRole('button', { name: `${PRODUCTS.headlamp.name} sold out` })).toBeDisabled();
  });

  test('product card shows name, price and description', async ({ inventoryPage }) => {
    const card = inventoryPage.card(PRODUCTS.backpack.name);
    // Soft assertions: report every mismatch in the card, not just the first.
    await expect.soft(card.getByRole('heading')).toHaveText(PRODUCTS.backpack.name);
    await expect.soft(card.locator('.price')).toHaveText('$79.99');
    await expect.soft(card.getByText('28L daypack')).toBeVisible();
    await expect.soft(card.getByRole('button')).toBeEnabled();
  });

  test('opens a product detail page', async ({ page, inventoryPage }) => {
    await test.step('click the product name', async () => {
      await inventoryPage.card(PRODUCTS.jacket.name).getByRole('link').click();
    });
    await test.step('detail page shows the product', async () => {
      await expect(page).toHaveURL(`/product.html?id=${PRODUCTS.jacket.id}`);
      await expect(page).toHaveTitle(`ShopLite | ${PRODUCTS.jacket.name}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(PRODUCTS.jacket.name);
      await expect(page.getByText('6 in stock')).toBeVisible();
    });
  });
});
