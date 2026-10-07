import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

// Lets the suite run against a pre-installed Chromium (e.g. a locked-down container).
const chromiumLaunch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

export const STORAGE_STATE = '.auth/standard_user.json';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI, // a stray test.only fails the CI run instead of silently skipping everything else
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',

  reporter: [
    [isCI ? 'dot' : 'list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['./reporters/summary-reporter.ts'],
    ...(isCI ? ([['blob']] as const) : []),
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
    actionTimeout: 10_000,
  },

  // Starts the demo app before the run and stops it after. Skipped when BASE_URL points elsewhere.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'node demo-app/server.js',
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: !isCI,
        env: { PORT: String(PORT) },
      },

  projects: [
    // 1. Logs in once through the UI and saves the session for the browser projects.
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { launchOptions: chromiumLaunch } },

    // 2. API tests: no browser at all, just Playwright's HTTP client.
    { name: 'api', testDir: './tests/api' },

    // 3. Desktop browsers, reusing the saved login.
    {
      name: 'chromium',
      testIgnore: /(api|mobile)\//,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE, launchOptions: chromiumLaunch },
    },
    {
      name: 'firefox',
      testIgnore: /(api|mobile|visual)\//,
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
    },
    {
      name: 'webkit',
      testIgnore: /(api|mobile|visual)\//,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
    },

    // 4. Mobile emulation (viewport, touch, user agent, device scale factor).
    {
      name: 'mobile-chrome',
      testDir: './tests/mobile',
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: STORAGE_STATE, launchOptions: chromiumLaunch },
    },
  ],
});
