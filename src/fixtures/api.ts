import { test as base } from '@playwright/test';
import { ShopApi } from '../api/ShopApi';
import { buildUser, NewUser } from '../data/factories';

// API-only fixtures. Kept separate from the UI fixtures so API tests never start a browser.
export const test = base.extend<{ api: ShopApi; authedApi: ShopApi; user: NewUser }>({
  api: async ({ request }, use) => use(new ShopApi(request)),
  user: async ({}, use) => use(buildUser()),
  authedApi: async ({ request, user }, use) => {
    const api = new ShopApi(request);
    await api.createUserAndLogin(user);
    await use(api);
  },
});

export { expect } from '../utils/matchers';
