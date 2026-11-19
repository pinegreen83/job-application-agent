import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  projects: [
    { name: 'desktop-edge', use: { browserName: 'chromium', channel: 'msedge', viewport: { width: 1280, height: 900 } } },
    { name: 'narrow-edge', use: { browserName: 'chromium', channel: 'msedge', viewport: { width: 390, height: 844 } } },
  ],
});
