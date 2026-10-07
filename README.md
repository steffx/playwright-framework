# ShopLite Playwright Framework

A Playwright + TypeScript test framework for **ShopLite**, a small e-commerce app that ships in this repo (`demo-app/`). It covers UI, API, network mocking, visual regression, accessibility, mobile emulation and browser features such as dialogs, iframes, files, tabs, the clock and geolocation.

The app is bundled with the tests on purpose: the suite is hermetic, so it runs the same way on a laptop, in Docker and in CI, with no shared test environment and no flaky third-party demo site.

```
API project       24 tests   no browser, pure HTTP
chromium          74 tests   desktop Chrome
firefox / webkit  70 tests   each (visual baselines are Chromium-only)
mobile-chrome      3 tests   Pixel 7 emulation
```

## Quick start

```bash
npm install
npx playwright install --with-deps   # browsers (skip if already installed)
npm test                              # starts the app, runs every project
npm run test:chromium                 # API + Chromium only: fastest full check
npm run test:smoke                    # only tests tagged @smoke
npm run test:ui                       # Playwright UI mode: watch, time-travel, pick locators
npm run report                        # open the last HTML report
npm run app                           # run ShopLite yourself at http://localhost:3000
```

Log in with `standard_user` / `secret_sauce`. `locked_user` is locked out on purpose. The browser playground lives at `/playground/index.html`.

## Project layout

```
demo-app/                 ShopLite: Express REST API + static HTML pages (in-memory data)
src/
  api/ShopApi.ts          typed API client used by API tests and for fast UI test setup
  pages/                  page objects (BasePage + shared Header component)
  fixtures/test.ts        UI fixtures: page objects, fresh user, logged-in page, axe, auto error check
  fixtures/api.ts         API-only fixtures (never start a browser)
  data/                   seed users, product reference data, faker factories
  utils/matchers.ts       custom expect matchers: toBeSorted, toBeMoney
tests/
  setup/                  logs in once and saves storage state for the other projects
  ui/                     login, catalog, cart, checkout (end to end)
  api/                    auth, products, cart and order lifecycle
  network/                mocking, failures, slow responses, request/response assertions, HAR
  visual/                 screenshot comparison and ARIA snapshots
  a11y/                   axe-core WCAG 2.1 AA scans and keyboard-only flow
  browser/                dialogs, iframes, upload/download, tabs, contexts, clock, geo, locale, input
  mobile/                 device emulation, responsive layout, tap
reporters/                custom summary reporter (also writes the GitHub Actions job summary)
.github/workflows/        CI: typecheck, API, 4 browser projects x 2 shards, merged HTML report
Dockerfile, docker-compose.yml
```

## Design decisions (and why)

- **User-facing locators first.** `getByRole`, `getByLabel`, `getByText`, then `getByTestId` only where there is no accessible name (the cart badge, order id). These survive CSS refactors and double as a light accessibility check.
- **Arrange through the API, assert through the UI.** Cart and checkout tests seed data with `ShopApi` and only drive the UI for the behavior under test. That keeps them fast and focused, and the end to end test then confirms the order through the API too.
- **A fresh account per test** (`shopper` fixture) instead of one shared login. Tests run fully parallel across workers and browsers without fighting over one cart. Read-only tests reuse a single saved session from the `setup` project instead.
- **Page objects stay thin.** They hold locators and user actions; assertions live in tests, so a failure points at the test's intent.
- **An automatic fixture fails any test whose page throws an uncaught error**, even if its assertions passed. It caught three real bugs while this suite was being written (see below).
- **No `waitForTimeout`.** Everything relies on auto-waiting, web-first assertions, `expect.poll` or `toPass`.
- **API fixtures are separate from UI fixtures**, because an auto fixture that touches `page` would launch a browser for every API test.

## Playwright feature map

| Area | Feature | Where |
|---|---|---|
| Config | projects, `dependencies`, `webServer`, retries, `forbidOnly`, per-project `testIgnore`/`testDir`, `snapshotPathTemplate` | `playwright.config.ts` |
| Auth | setup project + `storageState`; opting out with an empty state; injecting a session with `addInitScript` | `tests/setup`, `tests/ui/login.spec.ts`, `src/fixtures/test.ts` |
| Fixtures | test fixtures, worker-scoped fixture (`catalog`), automatic fixture (`failOnPageErrors`), fixture teardown | `src/fixtures/test.ts` |
| Organization | `describe`, `beforeEach`/`beforeAll`/`afterAll`, tags + `--grep`, `test.step`, annotations, data-driven loops | `tests/ui/*` |
| Test modifiers | `test.skip` (conditional), `test.fail` (known bug), `test.fixme`, serial mode | `tests/browser/*`, `tests/api/orders.api.spec.ts` |
| Locators | role, label, text, test id, `filter({ has, hasText })`, `first`/`nth`, chaining, `allInnerTexts` | `src/pages/*` |
| Assertions | web-first (`toHaveText`, `toHaveCount`, `toBeDisabled`, `toHaveURL`, `toBeFocused`, `toHaveJSProperty`...), soft assertions, `expect.poll`, `toPass`, asymmetric matchers, custom matchers | everywhere; `src/utils/matchers.ts` |
| API testing | `request` fixture, `playwright.request.newContext`, status/header/body checks, contract shape checks, negative and authorization tests | `tests/api/*` |
| Network | `page.route` with `fulfill`, `abort`, `continue`, `route.fetch` (patch a real response), held responses, `waitForRequest`/`waitForResponse`, `postDataJSON`, `routeFromHAR` | `tests/network/mocking.spec.ts` |
| Visual | `toHaveScreenshot` for page and element, masking, animations disabled, `toMatchAriaSnapshot` | `tests/visual/visual.spec.ts` |
| Accessibility | `@axe-core/playwright` WCAG 2.1 AA, scoped scans with `include`, results attached to the report, keyboard-only flow | `tests/a11y/*` |
| Browser features | alert/confirm/prompt, `frameLocator` and `page.frame`, `setInputFiles` (disk, buffers, clearing), downloads, new tabs, multiple isolated contexts | `tests/browser/*` |
| Emulation | `page.clock` (fixed time, `install` + `runFor`), geolocation + permissions, locale and time zone, mobile devices, touch `tap` | `tests/browser/time-location.spec.ts`, `tests/mobile/*` |
| Input | hover, `dragTo`, keyboard shortcuts (`ControlOrMeta`), `pressSequentially`, `evaluate`/`evaluateAll` | `tests/browser/interactions.spec.ts` |
| Debugging | trace on first retry, screenshot and video on failure, `testInfo.attach`, `testInfo.outputPath` | config, several tests |
| Reporting | list/dot, HTML, JUnit, blob (for shard merging), custom reporter | `playwright.config.ts`, `reporters/` |
| CI/CD | GitHub Actions, official Playwright container, sharding, `merge-reports`, nightly schedule | `.github/workflows/playwright.yml` |
| Docker | test image, compose with app and tests as separate services (`BASE_URL`) | `Dockerfile`, `docker-compose.yml` |

## Bugs this suite found while it was being built

Good interview stories, all real:

1. **Checkout totals never rendered.** The review step looked up elements by `id` but they only had `data-testid`, so it threw. The UI test saw empty totals and the auto error fixture reported the exception.
2. **Protected pages threw "Session expired" when logged out.** The redirect to login happened, but the page script kept running and its API call rejected unhandled. Fixed by not letting the client continue after a 401.
3. **Newsletter form couldn't show its own validation message** because native browser validation blocked submission first.
4. **A race in a test, not the app.** `waitForResponse` with a loose predicate sometimes caught the initial page load instead of the filtered request. It passed once and failed under `--repeat-each=3`. Fixed by waiting for the initial load and matching on the exact query parameter.

The full suite then passed 5 repeats in a row (`--repeat-each=5`, 501 runs, 0 failures).

## Common tasks

```bash
npx playwright test tests/ui/checkout.spec.ts --headed          # watch one file
npx playwright test -g "end to end" --debug                     # step through with the inspector
npx playwright test --project=chromium --repeat-each=5          # flakiness check
npx playwright show-trace test-results/<test>/trace.zip         # open a trace
npm run test:update-snapshots                                   # refresh visual baselines
UPDATE_HAR=1 npx playwright test --grep HAR --project=chromium  # re-record the HAR
BASE_URL=https://staging.example.com npx playwright test        # point at another environment
```

Visual baselines are per browser and OS. The committed ones were generated on Linux Chromium; regenerate them inside the Docker image before relying on them in CI.

## Ideas to extend it

- ESLint with `eslint-plugin-playwright` (catches missing `await`, focused tests)
- JSON schema validation for API responses with `zod` or `ajv`
- Performance budget checks (`performance.timing`, Lighthouse) and a k6 load test against the API
- Component testing with `@playwright/experimental-ct-react`
- Publishing the HTML report to GitHub Pages
