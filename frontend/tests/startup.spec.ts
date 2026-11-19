import { expect, test } from '@playwright/test';

test('AC-M0-01 browser portion: synthetic startup without external services', async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:1420') {
      externalRequests.push(url.origin);
      await route.abort();
    } else await route.continue();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('첫 화면');
  await expect(page.getByRole('article')).toContainText('합성 데이터');
  await expect(page.getByRole('article')).toContainText('synthetic-m0-a-001');
  await expect(page.getByRole('article')).toContainText('분석하지 않음');
  await expect(page.getByRole('complementary')).toContainText('외부 서비스에 전송하지 않습니다');
  await expect(page.getByRole('button', { name: 'Rust로 검증' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Mock 시작', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('브라우저에서는 Rust 검증을 실행할 수 없습니다');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('startup.png'), fullPage: true });
});
