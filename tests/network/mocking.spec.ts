import { test, expect } from '../../src/fixtures/test';
import type { Product } from '../../src/api/types';

// Network interception lets UI tests control the backend: edge cases, errors
// and slow responses that are hard or impossible to produce for real.
test.describe('Network mocking', { tag: '@network' }, () => {
  test('renders a fully mocked product list', async ({ page, inventoryPage }) => {
    const fake: Product[] = [
      { id: 101, name: 'Mocked Kayak', category: 'gear', price: 999, stock: 1, description: 'Served by page.route' },
    ];
    await page.route('**/api/products?*', (route) => route.fulfill({ json: fake }));

    await inventoryPage.goto();
    await expect(inventoryPage.cards).toHaveCount(1);
    await expect(inventoryPage.cards).toContainText('Mocked Kayak');
    await expect(inventoryPage.cards).toContainText('$999.00');
  });

  test('shows an error state when the API is down', async ({ page, inventoryPage }) => {
    await page.route('**/api/products?*', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));
    await inventoryPage.goto();
    await expect(inventoryPage.status).toHaveText('Failed to load products. Please try again.');
  });

  test('shows an error state when the network fails', async ({ page, inventoryPage }) => {
    await page.route('**/api/products?*', (route) => route.abort('internetdisconnected'));
    await inventoryPage.goto();
    await expect(inventoryPage.status).toHaveText('Failed to load products. Please try again.');
  });

  test('modifies a real response on the fly', async ({ page, inventoryPage }) => {
    // Fetch the real response, then patch it: every product goes on sale.
    await page.route('**/api/products?*', async (route) => {
      const response = await route.fetch();
      const products: Product[] = await response.json();
      await route.fulfill({ response, json: products.map((p) => ({ ...p, price: 1 })) });
    });

    await inventoryPage.goto();
    await expect(inventoryPage.cards.first()).toBeVisible();
    expect(new Set(await inventoryPage.productPrices())).toEqual(new Set([1]));
  });

  test('shows a loading state while the API is slow', async ({ page, inventoryPage }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/products?*', async (route) => {
      await gate; // hold the response until the test has checked the spinner
      await route.continue();
    });

    await inventoryPage.goto();
    await expect(inventoryPage.status).toHaveText('Loading products…');
    release();
    await expect(inventoryPage.cards.first()).toBeVisible();
    await expect(inventoryPage.status).toBeHidden();
  });

  test('sends the right query when filtering', async ({ page, inventoryPage }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.cards.first()).toBeVisible();

    // Start waiting before the action that triggers the request, to avoid a race.
    const requestPromise = page.waitForRequest((req) => req.url().includes('/api/products') && req.url().includes('sort='));
    await inventoryPage.sortBy('Price (high to low)');
    const request = await requestPromise;

    const url = new URL(request.url());
    expect(url.searchParams.get('sort')).toBe('price-desc');
    expect(request.method()).toBe('GET');
  });

  test('waits for and inspects an API response', async ({ page, inventoryPage }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.cards.first()).toBeVisible(); // let the initial load finish first
    // Match the specific request: a loose predicate here once caught the initial
    // unfiltered load instead (a real race this suite hit; repeat-each exposed it).
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/products') && new URL(res.url()).searchParams.get('category') === 'bags',
    );
    await inventoryPage.category.selectOption('bags');
    const response = await responsePromise;
    const body: Product[] = await response.json();
    expect(response.status()).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((p) => p.category === 'bags')).toBe(true);
  });

  test('add to cart sends the right payload', async ({ shopperPage, page, inventoryPage }) => {
    await inventoryPage.goto();
    const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/cart') && r.method() === 'POST');
    await inventoryPage.addToCart('Canvas Tote');
    const request = await requestPromise;
    expect(request.postDataJSON()).toEqual({ productId: 2, quantity: 1 });
    expect(request.headers()['authorization']).toMatch(/^Bearer /);
  });

  test('replays the API from a HAR file', async ({ page, inventoryPage }) => {
    // The HAR is a recorded snapshot of /api/products. Re-record it with:
    //   UPDATE_HAR=1 npx playwright test mocking --grep HAR --project=chromium
    await page.routeFromHAR('test-data/products.har', {
      url: '**/api/products?*',
      update: !!process.env.UPDATE_HAR,
      updateContent: 'embed',
    });
    await inventoryPage.goto();
    await expect(inventoryPage.cards).toHaveCount(6);
  });
});
