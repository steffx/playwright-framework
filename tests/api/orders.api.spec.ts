import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../src/fixtures/api';
import { PRODUCTS } from '../../src/data/products';
import { buildShipping, buildUser } from '../../src/data/factories';
import { ShopApi } from '../../src/api/ShopApi';

test.describe('Cart API', { tag: '@api' }, () => {
  test('adding the same product twice increases quantity', async ({ authedApi }) => {
    await authedApi.addToCart(PRODUCTS.bottle.id, 2);
    const res = await authedApi.addToCart(PRODUCTS.bottle.id, 1);
    expect(res.status()).toBe(201);
    const cart = await res.json();
    expect(cart.items).toEqual([{ productId: 5, name: 'Steel Water Bottle', price: 19.99, quantity: 3, lineTotal: 59.97 }]);
    expect(cart).toMatchObject({ subtotal: 59.97, tax: 4.8, total: 64.77 });
  });

  test('rejects invalid quantity and out-of-stock items', async ({ authedApi }) => {
    expect((await authedApi.addToCart(PRODUCTS.bottle.id, 0)).status()).toBe(400);
    expect((await authedApi.addToCart(PRODUCTS.headlamp.id)).status()).toBe(409);
    expect((await authedApi.addToCart(999)).status()).toBe(404);
  });

  test('removes a product', async ({ authedApi }) => {
    await authedApi.seedCart([{ productId: PRODUCTS.tote.id }, { productId: PRODUCTS.beanie.id }]);
    const cart = await (await authedApi.removeFromCart(PRODUCTS.tote.id)).json();
    expect(cart.items.map((i: { name: string }) => i.name)).toEqual([PRODUCTS.beanie.name]);
  });
});

// Serial mode: the steps share state and run in order; if one fails the rest are skipped.
test.describe('Order lifecycle', { tag: '@api' }, () => {
  test.describe.configure({ mode: 'serial' });

  let api: ShopApi;
  let orderId: string;
  const shipping = buildShipping();

  let context: APIRequestContext;

  test.beforeAll(async ({ playwright, baseURL }) => {
    context = await playwright.request.newContext({ baseURL });
    api = new ShopApi(context);
    await api.createUserAndLogin(buildUser());
  });

  test.afterAll(async () => {
    await context.dispose();
  });

  test('order without items is rejected', async () => {
    const res = await api.placeOrder(shipping);
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Cart is empty' });
  });

  test('order with missing shipping fields is rejected', async () => {
    await api.seedCart([{ productId: PRODUCTS.jacket.id }]);
    const res = await api.placeOrder({ ...shipping, postalCode: '' });
    expect(res.status()).toBe(400);
  });

  test('places an order', async () => {
    const res = await api.placeOrder(shipping);
    expect(res.status()).toBe(201);
    const order = await res.json();
    expect(order).toMatchObject({ shipping, subtotal: 149, tax: 11.92, total: 160.92 });
    orderId = order.id;
  });

  test('order can be fetched and the cart is now empty', async () => {
    const order = await api.order(orderId);
    expect(order.items).toHaveLength(1);
    expect(new Date(order.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect((await (await api.getCart()).json()).items).toEqual([]);
  });

  test('another user cannot read the order', async ({ request }) => {
    const stranger = new ShopApi(request);
    await stranger.createUserAndLogin(buildUser());
    expect((await stranger.getOrder(orderId)).status()).toBe(404);
  });
});
