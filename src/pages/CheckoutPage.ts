import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { Shipping } from '../data/factories';

export class CheckoutPage extends BasePage {
  readonly path = '/checkout.html';
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly postalCode: Locator;
  readonly continueButton: Locator;
  readonly infoError: Locator;
  readonly total: Locator;
  readonly tax: Locator;
  readonly placeOrderButton: Locator;
  readonly confirmation: Locator;
  readonly orderId: Locator;

  constructor(page: Page) {
    super(page);
    this.firstName = page.getByLabel('First name');
    this.lastName = page.getByLabel('Last name');
    this.postalCode = page.getByLabel('Postal code');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.infoError = page.locator('#info-error');
    this.total = page.getByTestId('review-total');
    this.tax = page.getByTestId('review-tax');
    this.placeOrderButton = page.getByRole('button', { name: 'Place order' });
    this.confirmation = page.getByRole('heading', { name: 'Thank you for your order!' });
    this.orderId = page.getByTestId('order-id');
  }

  async fillShipping({ firstName, lastName, postalCode }: Partial<Shipping>) {
    if (firstName !== undefined) await this.firstName.fill(firstName);
    if (lastName !== undefined) await this.lastName.fill(lastName);
    if (postalCode !== undefined) await this.postalCode.fill(postalCode);
    await this.continueButton.click();
  }
}
