import { test, expect } from '../../src/fixtures/test';
import { USERS } from '../../src/data/users';

// These tests need a logged-out browser, so they opt out of the saved session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('standard user can log in and see products', { tag: ['@smoke', '@auth'] }, async ({ page, loginPage, inventoryPage }) => {
    await loginPage.login(USERS.standard);

    await expect(page).toHaveURL('/inventory.html');
    await expect(inventoryPage.heading).toBeVisible();
    await expect(inventoryPage.header.greeting).toHaveText('Hi, Sam');
  });

  test('locked out user sees an error', { tag: '@auth' }, async ({ page, loginPage }) => {
    await loginPage.login(USERS.locked);

    await expect(loginPage.error).toHaveText('Sorry, this user has been locked out');
    await expect(page).toHaveURL(/login/);
  });

  // Data-driven: one test per row, each reported separately.
  const invalidLogins = [
    { case: 'wrong password', username: 'standard_user', password: 'nope', error: 'Username and password do not match any user' },
    { case: 'unknown user', username: 'ghost', password: 'secret_sauce', error: 'Username and password do not match any user' },
    { case: 'empty username', username: '', password: 'secret_sauce', error: 'Username and password are required' },
    { case: 'empty password', username: 'standard_user', password: '', error: 'Username and password are required' },
  ];
  for (const { case: name, username, password, error } of invalidLogins) {
    test(`rejects ${name}`, { tag: '@auth' }, async ({ loginPage }) => {
      await loginPage.login({ username, password });
      await expect(loginPage.error).toHaveText(error);
    });
  }

  test('password field masks input', async ({ loginPage }) => {
    await expect(loginPage.password).toHaveAttribute('type', 'password');
  });

  test('logging out clears the session', async ({ page, loginPage, inventoryPage }) => {
    await loginPage.login(USERS.standard);
    await inventoryPage.header.logoutButton.click();

    await expect(page).toHaveURL(/login/);
    expect(await page.evaluate(() => localStorage.getItem('shoplite.token'))).toBeNull();

    // A protected page now bounces back to login.
    await page.goto('/cart.html');
    await expect(page).toHaveURL(/login/);
  });
});
