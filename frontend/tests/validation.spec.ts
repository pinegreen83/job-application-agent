import { expect, test } from '@playwright/test';

// Renderer-only simulations. These do not prove Rust, native transport or ACL.
for (const scenario of ['success', 'invalid', 'transport', 'malformed'] as const) {
  test(`renderer IPC state with ${scenario} simulation`, async ({ page }) => {
    await page.addInitScript(mode => {
      Object.assign(window, {
        isTauri: true,
        __TAURI_INTERNALS__: {
          invoke: async (command: string, args: { record: { id: string; text: string } }) => {
            if (command !== 'm0_validate_record') throw new Error('Unexpected command');
            if (mode === 'invalid') throw { code: 'INVALID_RECORD', message: 'synthetic-secret-native-error' };
            if (mode === 'transport') throw 'synthetic-secret-framework-error';
            return { ...args.record, status: mode === 'malformed' ? 'stored' : 'validated' };
          },
        },
      });
    }, scenario);
    await page.goto('/');
    await page.getByLabel('합성 텍스트').fill('검증 🦀');
    await page.getByRole('button', { name: 'Rust로 검증' }).click();
    if (scenario === 'success') {
      await expect(page.getByRole('status')).toHaveText('입력 검증 완료 · 저장·분석되지 않았습니다.');
      // Editing invalidates the previous success; it must not label new text valid.
      await page.getByLabel('합성 텍스트').fill('새 합성 입력');
      await expect(page.getByRole('status')).toHaveCount(0);
    } else {
      await expect(page.getByRole('alert')).toContainText(scenario === 'invalid' ? 'INVALID_RECORD' : 'IPC_FAILED');
      await expect(page.locator('body')).not.toContainText('synthetic-secret');
    }
    await expect(page.getByRole('button', { name: 'Rust로 검증' })).toBeEnabled();
  });
}
