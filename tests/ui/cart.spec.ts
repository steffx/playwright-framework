import { test, expect } from '../../src/fixtures/test';
import { PRODUCTS } from '../../src/data/products';

// Every test gets its own fresh account (the `shopper` fixture), so carts never
// collide even when tests run in parallel across workers and browsers.
test.describe('Cart', { tag: '@cart' }, () => {
  test('adding products updates the cart badge', { tag: '@smoke' }, async ({ shopperPage, inventoryPage }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.header.cartCount).toHaveText('0');

    await inventoryPage.addToCart(PRODUCTS.backpack.name);
    await expect(inventoryPage.toast).toHaveText('Added to cart');
    await expect(inventoryPage.header.cartCount).toHaveText('1');

    await inventoryPage.addToCart(PRODUCTS.bottle.name);
    await inventoryPage.addToCart(PRODUCTS.bottle.name);
    await expect(inventoryPage.header.cartCount).toHaveText('3');
  });

  test('UI cart matches what the API stored', async ({ shopperPage, inventoryPage, api }) => {
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.tote.name);
    await expect(inventoryPage.header.cartCount).toHaveText('1');

    // Verify through the backend, not just the screen.
    const cart = await (await api.getCart()).json();
    expect(cart.items).toEqual([expect.objectContaining({ productId: PRODUCTS.tote.id, quantity: 1 })]);
  });

  test('cart page lists items seeded through the API', async ({ shopperPage, cartPage, api }) => {
    // Arrange through the API (fast), act and assert through the UI (what we are testing).
    await api.seedCart([
      { productId: PRODUCTS.beanie.id, quantity: 2 },
      { productId: PRODUCTS.backpack.id },
    ]);

    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(2);
    await expect(cartPage.row(PRODUCTS.beanie.name)).toContainText('$58.00');
    await expect(cartPage.subtotal).toHaveText('$137.99');
    await expect(cartPage.header.cartCount).toHaveText('3');
  });

  test('removing the last item shows the empty cart', async ({ shopperPage, cartPage, api }) => {
    await api.seedCart([{ productId: PRODUCTS.jacket.id }]);
    await cartPage.goto();

    await cartPage.remove(PRODUCTS.jacket.name);

    await expect(cartPage.emptyMessage).toBeVisible();
    await expect(cartPage.header.cartCount).toHaveText('0');
  });

  test('cannot add more than the stock on hand', async ({ shopperPage, page }) => {
    await page.goto(`/product.html?id=${PRODUCTS.jacket.id}`);
    await page.getByLabel('Quantity').fill('7'); // only 6 in stock
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.locator('#toast')).toHaveText('Only 6 left in stock');
  });
});
