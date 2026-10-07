import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly path = '/cart.html';
  readonly rows: Locator;
  readonly subtotal: Locator;
  readonly emptyMessage: Locator;
  readonly checkoutLink: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('cell') });
    this.subtotal = page.getByTestId('subtotal');
    this.emptyMessage = page.getByText('Your cart is empty.');
    this.checkoutLink = page.getByRole('link', { name: 'Checkout' });
  }

  row(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }

  async remove(productName: string) {
    await this.page.getByRole('button', { name: `Remove ${productName}` }).click();
  }
}
