import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { computed, ref } from 'vue';

const require = createRequire(import.meta.url);
const ts = require('../api/node_modules/typescript');
const source = ts.transpileModule(readFileSync('app/composables/useTelegramPhone.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ phone = null, allowed = true, available = true, savedPhone = '+85512345678', fail = false } = {} as any) {
  const user = ref({ id: 'account-123', phone, providers: ['TELEGRAM'] });
  const requests: Array<{ path: string; options: any }> = [];
  let prompts = 0;
  const exports: any = {};
  runInNewContext(source, {
    exports, ref, computed,
    useAuth: () => ({ user }),
    onMounted: (fn: () => void) => fn(),
    onScopeDispose: () => {},
    getTelegramMiniApp: () => available ? {
      initData: 'dummy-init-data',
      requestContact: (callback: (allowed: boolean) => void) => { prompts++; callback(allowed); },
    } : undefined,
    $fetch: async (path: string, options: any) => {
      requests.push({ path, options });
      if (fail) throw new Error('Failed');
      return path === '/api/auth/me' ? { user: { ...user.value, phone: savedPhone } } : { phone: null };
    },
    setTimeout: (fn: () => void, ms: number) => { if (ms === 500) queueMicrotask(fn); return 1; },
    clearTimeout: () => {},
  });
  const setting = exports.useTelegramPhone();
  return { setting, user, requests, prompts: () => prompts };
}

test('phone sharing defaults off without prompting on page load', () => {
  const { setting, prompts, requests } = setup();
  assert.equal(setting.enabled.value, false);
  assert.equal(prompts(), 0);
  assert.equal(requests.length, 0);
});

test('cancelled Telegram permission leaves the switch off without saving', async () => {
  const { setting, prompts, requests } = setup({ allowed: false });
  await setting.toggle();
  assert.equal(prompts(), 1);
  assert.equal(setting.enabled.value, false);
  assert.equal(requests.length, 0);
});

test('switch turns on only after the backend returns the saved phone', async () => {
  const { setting, requests } = setup();
  await setting.toggle();
  assert.equal(setting.enabled.value, true);
  assert.equal(requests[0]?.path, '/api/auth/me');
});

test('permission alone does not turn the switch on when webhook delivery is delayed', async () => {
  const { setting } = setup({ savedPhone: null });
  await setting.toggle();
  assert.equal(setting.enabled.value, false);
  assert.match(setting.status.value, /not confirmed yet/);
});

test('turning off removes the profile phone and updates the switch', async () => {
  const { setting, user, requests } = setup({ phone: '+85512345678' });
  await setting.toggle();
  assert.equal(requests[0]?.path, '/api/auth/phone');
  assert.equal(requests[0]?.options.method, 'DELETE');
  assert.equal(user.value.phone, null);
  assert.equal(setting.enabled.value, false);
});

test('failed removal preserves the saved phone and reports an error', async () => {
  const { setting } = setup({ phone: '+85512345678', fail: true });
  await setting.toggle();
  assert.equal(setting.enabled.value, true);
  assert.ok(setting.error.value);
});

test('normal browsers cannot enable sharing but can remove a saved phone', async () => {
  const off = setup({ available: false });
  await off.setting.toggle();
  assert.equal(off.setting.disabled.value, true);
  assert.equal(off.prompts(), 0);
  const on = setup({ available: false, phone: '+85512345678' });
  await on.setting.toggle();
  assert.equal(on.setting.enabled.value, false);
});
