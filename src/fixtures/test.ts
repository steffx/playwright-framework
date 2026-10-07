import { test as base, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CartPage, CheckoutPage, InventoryPage, LoginPage } from '../pages';
import { ShopApi } from '../api/ShopApi';
import { buildUser, NewUser } from '../data/factories';
import type { Product } from '../api/types';

type Shopper = NewUser & { token: string };

type TestFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  api: ShopApi;
  /** A brand-new account created through the API for this test only. */
  shopper: Shopper;
  /** A page already logged in as `shopper`, with an empty cart. */
  shopperPage: Page;
  makeAxeBuilder: () => AxeBuilder;
  failOnPageErrors: void;
};

type WorkerFixtures = {
  /** Product catalog, fetched once per worker process and shared by its tests. */
  catalog: Product[];
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Page objects: constructed lazily, only for tests that ask for them.
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),

  api: async ({ request }, use) => use(new ShopApi(request)),

  shopper: async ({ api }, use) => {
    const user = buildUser();
    const token = await api.createUserAndLogin(user);
    await use({ ...user, token });
    // Teardown would go here (e.g. delete the user); the demo app is in-memory so nothing to clean.
  },

  shopperPage: async ({ page, shopper }, use) => {
    // Skip the login UI entirely: put the session where the app expects it before any page script runs.
    await page.addInitScript(({ token, firstName, username }) => {
      localStorage.setItem('shoplite.token', token);
      localStorage.setItem('shoplite.user', JSON.stringify({ username, firstName }));
    }, shopper);
    await use(page);
  },

  makeAxeBuilder: async ({ page }, use) => {
    // One place to define the accessibility standard every scan is held to.
    await use(() => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']));
  },

  // Automatic fixture: runs for every test without being requested.
  // An uncaught exception in the page fails the test even if the assertions passed.
  failOnPageErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await use();
      if (errors.length) {
        await testInfo.attach('page-errors', { body: errors.join('\n'), contentType: 'text/plain' });
        throw new Error(`Uncaught page errors:\n${errors.join('\n')}`);
      }
    },
    { auto: true },
  ],

  catalog: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext({ baseURL: workerInfo.project.use.baseURL });
      const products = (await (await request.get('/api/products')).json()) as Product[];
      await use(products);
      await request.dispose();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '../utils/matchers';
