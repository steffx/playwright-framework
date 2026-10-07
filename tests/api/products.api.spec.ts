import { test, expect } from '../../src/fixtures/api';
import type { Product } from '../../src/api/types';

// Lightweight contract check without extra libraries: every field present with the right type.
function expectProductShape(p: Product) {
  expect(p).toEqual({
    id: expect.any(Number),
    name: expect.any(String),
    category: expect.stringMatching(/^(bags|apparel|gear)$/),
    price: expect.any(Number),
    stock: expect.any(Number),
    description: expect.any(String),
  });
  expect(p.price).toBeMoney();
}

test.describe('Products API', { tag: '@api' }, () => {
  test('lists all products with a valid shape', { tag: '@smoke' }, async ({ api }) => {
    const products = await api.products();
    expect(products).toHaveLength(6);
    products.forEach(expectProductShape);
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length); // ids are unique
  });

  test('filters by category', async ({ api }) => {
    const gear = await api.products({ category: 'gear' });
    expect(gear.map((p) => p.category)).toEqual(['gear', 'gear']);
  });

  test('search is case-insensitive', async ({ api }) => {
    const lower = await api.products({ q: 'jacket' });
    const upper = await api.products({ q: 'JACKET' });
    expect(lower).toEqual(upper);
    expect(lower).toHaveLength(1);
  });

  for (const [sort, field, descending] of [
    ['price-asc', 'price', false],
    ['price-desc', 'price', true],
    ['name-asc', 'name', false],
    ['name-desc', 'name', true],
  ] as const) {
    test(`sorts by ${sort}`, async ({ api }) => {
      const products = await api.products({ sort });
      expect(products.map((p) => p[field])).toBeSorted({ descending });
    });
  }

  test('gets a single product', async ({ api }) => {
    const res = await api.getProduct(4);
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ id: 4, name: 'Rain Shell Jacket' });
  });

  test('unknown product is 404', async ({ api }) => {
    const res = await api.getProduct(999);
    expect(res.status()).toBe(404);
  });

  test('responds quickly', async ({ request }) => {
    const start = Date.now();
    await request.get('/api/products');
    expect(Date.now() - start).toBeLessThan(500);
  });
});
