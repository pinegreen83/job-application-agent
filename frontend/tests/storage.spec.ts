import { expect, test } from '@playwright/test';

// Renderer simulations only; real SQLite/restart evidence is recorded separately.
test('storage UI keeps input separate and restores after simulated failure and page restart', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { isTauri: true, __TAURI_INTERNALS__: {
      invoke: async (command: string, args: { record?: { id: string; text: string } }) => {
        if (command === 'm0_load_record') return JSON.parse(sessionStorage.getItem('synthetic-saved') ?? 'null');
        if (command === 'm0_save_record') {
          sessionStorage.setItem('synthetic-saved', JSON.stringify(args.record));
          return { ...args.record, status: 'saved' };
        }
        if (command === 'm0_simulate_save_failure') throw { code: 'SIMULATED_SAVE_FAILURE', message: 'synthetic-secret-never-show' };
        throw new Error('Unexpected command');
      },
    } });
  });
  await page.goto('/');
  const storage = page.locator('section[aria-labelledby="storage-title"]');
  const saved = storage.getByRole('region', { name: '마지막 확인 저장본' });
  await expect(saved).toContainText('저장된 합성 레코드가 없습니다.');
  await page.getByLabel('저장할 합성 텍스트').fill('정상 합성 저장 🦀');
  await page.getByRole('button', { name: '로컬에 저장' }).click();
  await expect(saved).toContainText('정상 합성 저장 🦀');
  await page.getByLabel('저장할 합성 텍스트').fill('실패할 새 입력');
  await expect(saved).toContainText('정상 합성 저장 🦀');
  await storage.getByText('개발용 저장 실패 검증', { exact: true }).click();
  await storage.getByRole('button', { name: '저장 실패·보존 검사' }).click();
  await expect(storage.getByRole('alert')).toContainText('SIMULATED_SAVE_FAILURE');
  await expect(storage.getByRole('status')).toContainText('저장본 보존을 확인했습니다');
  await expect(saved).toContainText('정상 합성 저장 🦀');
  await expect(storage).not.toContainText('synthetic-secret');
  await page.reload();
  await expect(saved).toContainText('정상 합성 저장 🦀');
  await expect(page.getByLabel('저장할 합성 텍스트')).toHaveValue('합성 SQLite 검증');
});

for (const operation of ['save', 'load', 'malformed-save', 'malformed-load'] as const) {
  test(`storage ${operation} error keeps last confirmed record and sanitizes native details`, async ({ page }) => {
    await page.addInitScript(mode => {
      Object.assign(window, { isTauri: true, __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          if (command === 'm0_load_record') {
            if (!(window as unknown as { failReads?: boolean }).failReads) return { id: 'synthetic-m0-001', text: '기존 합성 저장본' };
            if (mode === 'malformed-load') return { id: 'unexpected', text: 'synthetic-secret' };
            throw { code: 'LOAD_FAILED', message: 'synthetic-secret-path' };
          }
          if (command === 'm0_save_record') {
            if (mode === 'malformed-save') return { id: 'synthetic-m0-001', text: 'different', status: 'saved' };
            throw { code: 'SAVE_FAILED', message: 'synthetic-secret-sql' };
          }
          throw new Error('Unexpected command');
        },
      } });
    }, operation);
    await page.goto('/');
    const storage = page.locator('section[aria-labelledby="storage-title"]');
    await expect(storage.getByRole('region', { name: '마지막 확인 저장본' })).toContainText('기존 합성 저장본');
    await page.evaluate(() => { Object.assign(window, { failReads: true }); });
    await storage.getByRole('button', { name: operation.includes('load') ? '저장본 다시 읽기' : '로컬에 저장', exact: true }).click();
    await expect(storage.getByRole('alert')).toContainText(operation.startsWith('malformed') ? 'IPC_FAILED' : operation === 'save' ? 'SAVE_FAILED' : 'LOAD_FAILED');
    await expect(storage.getByRole('region', { name: '마지막 확인 저장본' })).toContainText('기존 합성 저장본');
    await expect(storage).not.toContainText('synthetic-secret');
  });
}

test('one pending save blocks duplicate form submissions until the native result', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { isTauri: true, saveCalls: 0, __TAURI_INTERNALS__: {
      invoke: async (command: string, args: { record?: { id: string; text: string } }) => {
        if (command === 'm0_load_record') return null;
        if (command === 'm0_save_record') {
          const state = window as unknown as { saveCalls: number; finishSave: () => void };
          state.saveCalls++;
          await new Promise<void>(resolve => { state.finishSave = resolve; });
          return { ...args.record, status: 'saved' };
        }
        throw new Error('Unexpected command');
      },
    } });
  });
  await page.goto('/');
  const storage = page.locator('section[aria-labelledby="storage-title"]');
  await expect(storage.getByRole('button', { name: '로컬에 저장' })).toBeEnabled();
  await storage.locator('form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(storage.getByRole('button', { name: '로컬에 저장' })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { saveCalls: number }).saveCalls)).toBe(1);
  await page.evaluate(() => (window as unknown as { finishSave: () => void }).finishSave());
  await expect(storage.getByRole('button', { name: '로컬에 저장' })).toBeEnabled();
  await expect(storage.getByRole('status')).toContainText('로컬 저장 완료');
});
