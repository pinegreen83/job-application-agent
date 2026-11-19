import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Renderer fixtures only. Rust/native cancellation and persistence are separate evidence.
async function installFixture(page: Page, mode = 'normal') {
  await page.addInitScript(fixture => {
    const id = '00000000-0000-4000-8000-000000000001';
    let input = { operation: 'analyze', modelId: 'mock-synthetic-v1', scenario: 'success' };
    let resolvePending: ((result: unknown) => void) | undefined;
    const calls = { starts: 0, writes: 0 };
    const ticket = () => ({ requestId: id, operation: input.operation });
    Object.assign(window, { isTauri: true, mockCalls: calls, __TAURI_INTERNALS__: {
      invoke: async (command: string, args: { request?: typeof input }) => {
        if (command === 'm0_load_record') return { id: 'synthetic-m0-001', text: '이전 합성 저장본' };
        if (command === 'm0_save_record') { calls.writes++; throw new Error('Unexpected write'); }
        if (command === 'm0_start_mock') {
          calls.starts++;
          if (fixture === 'native-error') throw 'synthetic-secret-native-details';
          input = args.request!; return ticket();
        }
        if (command === 'm0_cancel_mock') {
          resolvePending?.({ ...ticket(), status: 'cancelled', error: { code: 'CANCELLED', message: 'synthetic-secret-cancel' } });
          return ticket();
        }
        if (command === 'm0_mock_result') {
          if (input.scenario === 'wait_for_cancel') return new Promise(resolve => { resolvePending = resolve; });
          const errors: Record<string, string> = { connection_error: 'CONNECTION_ERROR', network_error: 'NETWORK_ERROR', quota_exceeded: 'QUOTA_EXCEEDED', incomplete_response: 'INCOMPLETE_RESPONSE' };
          const code = input.modelId === 'mock-unsupported' ? 'UNSUPPORTED_MODEL' : errors[input.scenario];
          if (code) return { ...ticket(), status: 'failed', error: { code, message: 'synthetic-secret-error' } };
          return { ...ticket(), requestId: fixture === 'wrong-id' ? '00000000-0000-4000-8000-000000000002' : id, status: 'succeeded', result: {
            synthetic: true, modelId: 'mock-synthetic-v1', promptVersion: 'm0-mock-v1',
            output: { kind: input.operation, sourceId: 'synthetic-m0-001', summary: fixture === 'incomplete-success' ? null : '합성 UI 응답' },
          } };
        }
        throw new Error('Unexpected command');
      },
    } });
  }, mode);
}

for (const operation of ['analyze', 'evaluate', 'generate', 'review']) {
  test(`Mock renderer identifies ${operation} synthetic result without saving`, async ({ page }) => {
    await installFixture(page); await page.goto('/');
    const mock = page.getByRole('region', { name: '합성 Provider Mock', exact: true });
    await mock.getByLabel('Mock 작업').selectOption(operation);
    await mock.getByRole('button', { name: 'Mock 시작', exact: true }).click();
    await expect(mock.getByRole('status')).toContainText(`합성 처리 완료 · ${operation}`);
    await expect(mock.getByRole('status')).toContainText('00000000-0000-4000-8000-000000000001');
    await expect(page.getByRole('region', { name: '마지막 확인 저장본' })).toContainText('이전 합성 저장본');
    expect(await page.evaluate(() => (window as unknown as { mockCalls: { writes: number } }).mockCalls.writes)).toBe(0);
  });
}

for (const [scenario, code] of [['connection_error', 'CONNECTION_ERROR'], ['network_error', 'NETWORK_ERROR'], ['quota_exceeded', 'QUOTA_EXCEEDED'], ['unsupported', 'UNSUPPORTED_MODEL'], ['incomplete_response', 'INCOMPLETE_RESPONSE']]) {
  test(`Mock renderer distinguishes ${code} and retains stored data`, async ({ page }) => {
    await installFixture(page); await page.goto('/');
    const mock = page.getByRole('region', { name: '합성 Provider Mock', exact: true });
    if (scenario === 'unsupported') await mock.getByLabel('가상 모델').selectOption('mock-unsupported');
    else await mock.getByLabel('합성 시나리오').selectOption(scenario);
    await mock.getByRole('button', { name: 'Mock 시작', exact: true }).click();
    await expect(mock.getByRole('alert')).toContainText(code);
    await expect(mock.getByRole('status')).toHaveCount(0);
    await expect(mock).not.toContainText('synthetic-secret');
    await expect(page.getByRole('region', { name: '마지막 확인 저장본' })).toContainText('이전 합성 저장본');
  });
}

test('Mock renderer allows cancellation after registration and blocks duplicate starts', async ({ page }) => {
  await installFixture(page); await page.goto('/');
  const mock = page.getByRole('region', { name: '합성 Provider Mock', exact: true });
  await mock.getByLabel('합성 시나리오').selectOption('wait_for_cancel');
  await mock.locator('form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(mock.getByRole('status')).toContainText('처리 중');
  await expect(mock.getByRole('button', { name: 'Mock 시작', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { mockCalls: { starts: number } }).mockCalls.starts)).toBe(1);
  await mock.getByRole('button', { name: 'Mock 취소', exact: true }).click();
  await expect(mock.getByRole('alert')).toContainText('CANCELLED');
  await expect(mock.getByRole('button', { name: 'Mock 시작', exact: true })).toBeEnabled();
  await expect(mock.getByRole('button', { name: 'Mock 취소', exact: true })).toBeDisabled();
  await expect(mock).not.toContainText('synthetic-secret');
});

for (const mode of ['native-error', 'wrong-id', 'incomplete-success']) {
  test(`Mock renderer rejects ${mode} without exposing native details or false completion`, async ({ page }) => {
    await installFixture(page, mode); await page.goto('/');
    const mock = page.getByRole('region', { name: '합성 Provider Mock', exact: true });
    await mock.getByRole('button', { name: 'Mock 시작', exact: true }).click();
    await expect(mock.getByRole('alert')).toContainText('IPC_FAILED');
    await expect(mock.getByRole('status')).toHaveCount(0);
    await expect(mock).not.toContainText('synthetic-secret');
  });
}
