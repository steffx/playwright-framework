import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages';
import { USERS } from '../../src/data/users';
import { STORAGE_STATE } from '../../playwright.config';

// Runs once before the browser projects (see `dependencies` in the config).
// Logging in through the UI once and saving the session means the other
// tests start already authenticated, which keeps them fast and focused.
setup('authenticate as standard_user', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USERS.standard);
  await expect(page).toHaveURL(/inventory/);
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

  // Saves cookies and localStorage (where ShopLite keeps its token).
  await page.context().storageState({ path: STORAGE_STATE });
});
