import { test, expect } from '../../src/fixtures/test';
import { PRODUCTS } from '../../src/data/products';
import { buildShipping } from '../../src/data/factories';

test.describe('Checkout', { tag: '@checkout' }, () => {
  test('shopper can buy products end to end', { tag: ['@smoke', '@e2e'] }, async ({ page, shopperPage, inventoryPage, cartPage, checkoutPage, api }) => {
    const shipping = buildShipping();

    await test.step('add two products to the cart', async () => {
      await inventoryPage.goto();
      await inventoryPage.addToCart(PRODUCTS.backpack.name);
      await inventoryPage.addToCart(PRODUCTS.beanie.name);
      await expect(inventoryPage.header.cartCount).toHaveText('2');
    });

    await test.step('review the cart', async () => {
      await inventoryPage.header.cartLink.click();
      await expect(cartPage.rows).toHaveCount(2);
      await cartPage.checkoutLink.click();
    });

    await test.step('enter shipping details', async () => {
      await checkoutPage.fillShipping(shipping);
      // 79.99 + 29.00 = 108.99, tax 8% = 8.72
      await expect(checkoutPage.tax).toHaveText('$8.72');
      await expect(checkoutPage.total).toHaveText('$117.71');
    });

    const orderId = await test.step('place the order', async () => {
      await checkoutPage.placeOrderButton.click();
      await expect(checkoutPage.confirmation).toBeVisible();
      await expect(checkoutPage.orderId).toHaveText(/^ORD-[0-9A-F]{8}$/);
      return checkoutPage.orderId.innerText();
    });

    await test.step('order is persisted and the cart is emptied', async () => {
      const order = await api.order(orderId);
      expect(order).toMatchObject({ total: 117.71, shipping });
      await expect(checkoutPage.header.cartCount).toHaveText('0');
    });

    test.info().annotations.push({ type: 'order', description: orderId });
  });

  test.describe('shipping form validation', () => {
    test.beforeEach(async ({ shopperPage, api, checkoutPage }) => {
      await api.seedCart([{ productId: PRODUCTS.tote.id }]);
      await checkoutPage.goto();
    });

    const cases = [
      { field: 'first name', data: { firstName: '' }, error: 'First name is required' },
      { field: 'last name', data: { lastName: '' }, error: 'Last name is required' },
      { field: 'postal code', data: { postalCode: '' }, error: 'Postal code is required' },
      { field: 'postal code format', data: { postalCode: '12AB' }, error: 'Postal code must be 5 digits' },
    ];
    for (const { field, data, error } of cases) {
      test(`requires a valid ${field}`, async ({ checkoutPage }) => {
        await checkoutPage.fillShipping(buildShipping(data));
        await expect(checkoutPage.infoError).toHaveText(error);
        await expect(checkoutPage.placeOrderButton).toBeHidden();
      });
    }
  });

  test('placing an order with an empty cart shows an error', async ({ shopperPage, checkoutPage }) => {
    await checkoutPage.goto();
    await checkoutPage.fillShipping(buildShipping());
    await checkoutPage.placeOrderButton.click();
    await expect(checkoutPage.page.locator('#review-error')).toHaveText('Cart is empty');
  });
});
