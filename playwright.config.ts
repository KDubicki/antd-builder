import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'pnpm start' : `pnpm dev -p ${port}`,
    env: {
      PORT: String(port),
      // The server validates env at startup; e2e never calls Gemini.
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'e2e-placeholder',
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
