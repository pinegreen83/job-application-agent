import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:1420', headless: true },
  projects: [
    { name: 'desktop-edge', use: { browserName: 'chromium', channel: 'msedge', viewport: { width: 1280, height: 900 } } },
    { name: 'narrow-edge', use: { browserName: 'chromium', channel: 'msedge', viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:1420', reuseExistingServer: false },
});
