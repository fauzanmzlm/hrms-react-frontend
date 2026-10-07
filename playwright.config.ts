import { defineConfig, devices } from '@playwright/test'

// End-to-end checks run against the real Go backend (docker compose up on :8080)
// through the Vite dev server, which proxies /api to it.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Uses the locally installed Google Chrome; set E2E_BROWSER_CHANNEL=chromium
        // after `npx playwright install chromium` to use the bundled browser instead.
        channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
