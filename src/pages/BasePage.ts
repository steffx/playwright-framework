import { Locator, Page } from '@playwright/test';

/** Shared header present on every logged-in page. */
export class Header {
  readonly cartLink: Locator;
  readonly cartCount: Locator;
  readonly greeting: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    const nav = page.getByRole('navigation', { name: 'Main' });
    this.cartLink = nav.getByRole('link', { name: 'Cart' });
    this.cartCount = page.getByTestId('cart-count');
    this.greeting = nav.getByText(/^Hi, /);
    this.logoutButton = nav.getByRole('button', { name: 'Log out' });
  }
}

export abstract class BasePage {
  abstract readonly path: string;
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  async goto() {
    await this.page.goto(this.path);
  }
}
