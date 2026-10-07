import { test, expect } from '../../src/fixtures/test';

test.describe('Clock, geolocation and locale', { tag: '@browser' }, () => {
  test('freezes the date the page sees', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-12-25T10:00:00'));
    await page.goto('/playground/index.html');
    await expect(page.getByTestId('today')).toHaveText('Friday, December 25, 2026');
  });

  test('fast-forwards a 60 second session timer instantly', async ({ page }) => {
    await page.clock.install(); // take control of timers before the page loads
    await page.goto('/playground/index.html');
    await expect(page.getByTestId('seconds-left')).toHaveText('60');

    await page.clock.runFor(10_000);
    await expect(page.getByTestId('seconds-left')).toHaveText('50');

    await page.clock.runFor(50_000);
    await expect(page.getByRole('alert')).toHaveText('Session expired. Please log in again.');
  });

  test.describe('in Charlotte', () => {
    test.use({ geolocation: { latitude: 35.2271, longitude: -80.8431 }, permissions: ['geolocation'] });

    test('finds the nearest store from the browser location', async ({ page }) => {
      await page.goto('/playground/index.html');
      await page.getByRole('button', { name: 'Find nearest store' }).click();
      await expect(page.locator('#nearest-store')).toHaveText('Nearest store: Charlotte Uptown');
    });

    test('updates when the location changes mid-test', async ({ page, context }) => {
      await page.goto('/playground/index.html');
      await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
      await page.getByRole('button', { name: 'Find nearest store' }).click();
      await expect(page.locator('#nearest-store')).toHaveText('Nearest store: San Francisco Union Square');
    });
  });

  test.describe('without location permission', () => {
    test.use({ permissions: [] });

    test('explains that permission was denied', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Permission-denied prompts behave differently per engine');
      await page.goto('/playground/index.html');
      await page.getByRole('button', { name: 'Find nearest store' }).click();
      await expect(page.locator('#nearest-store')).toHaveText('Location permission denied');
    });
  });

  test.describe('emulating a German user in Berlin', () => {
    test.use({ locale: 'de-DE', timezoneId: 'Europe/Berlin' });

    test('browser reports the emulated locale and time zone', async ({ page }) => {
      await page.goto('/playground/index.html');
      const env = await page.evaluate(() => ({
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        price: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(1234.5),
      }));
      // Intl uses a non-breaking space before the currency sign, hence \s in the regex.
      expect(env).toEqual({ language: 'de-DE', timeZone: 'Europe/Berlin', price: expect.stringMatching(/^1\.234,50\s€$/) });
    });
  });
});
