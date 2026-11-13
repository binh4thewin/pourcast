import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: { command: 'node server.mjs', url: 'http://localhost:4173', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
