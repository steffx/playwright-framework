import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { Credentials } from '../data/users';

export class LoginPage extends BasePage {
  readonly path = '/login.html';
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    // User-facing locators: label text and accessible role/name, not CSS classes.
    this.username = page.getByLabel('Username');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Log in' });
    this.error = page.getByRole('alert');
  }

  async login({ username, password }: Credentials) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }
}
