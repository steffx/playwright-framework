import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type SortOption = 'Featured' | 'Price (low to high)' | 'Price (high to low)' | 'Name (A to Z)' | 'Name (Z to A)';

export class InventoryPage extends BasePage {
  readonly path = '/inventory.html';
  readonly heading: Locator;
  readonly search: Locator;
  readonly category: Locator;
  readonly sort: Locator;
  readonly productList: Locator;
  readonly cards: Locator;
  readonly status: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Products', level: 1 });
    this.search = page.getByRole('searchbox', { name: 'Search' });
    this.category = page.getByLabel('Category');
    this.sort = page.getByLabel('Sort by');
    this.productList = page.getByRole('list', { name: 'Product list' });
    this.cards = page.getByTestId('product-card');
    this.status = page.locator('#status');
    this.toast = page.locator('#toast');
  }

  /** Card for one product, found by filtering on its visible name. */
  card(name: string): Locator {
    return this.cards.filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  async addToCart(name: string) {
    await this.card(name).getByRole('button', { name: `Add ${name} to cart` }).click();
  }

  async sortBy(option: SortOption) {
    await this.sort.selectOption({ label: option });
  }

  async productNames(): Promise<string[]> {
    return this.cards.getByRole('heading').allInnerTexts();
  }

  async productPrices(): Promise<number[]> {
    const texts = await this.cards.locator('.price').allInnerTexts();
    return texts.map((t) => Number(t.replace('$', '')));
  }
}
