import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerUiPort, DialogPort, openForceAlchemyWorkbenchPort } from '../scripts/utils/ui-ports.js';

// A-07: engine talent modules reach dialogs/workbench through a registered port, not by importing apps/**.
test('unregistered port fails loudly', () => {
  delete globalThis.SWSEDialogV2;
  assert.throws(() => DialogPort.prompt({}), /not registered/);
  assert.throws(() => openForceAlchemyWorkbenchPort({}), /not registered/);
});
test('registered implementations receive the call unchanged; confirm stays optional', async () => {
  const calls = [];
  registerUiPort('dialogV2', { prompt: async (o) => { calls.push(['prompt', o]); return 'p'; } });
  assert.equal(await DialogPort.prompt({ a: 1 }), 'p');
  assert.equal(DialogPort.confirm({ b: 2 }), undefined);
  registerUiPort('dialogV2', { prompt: async () => 0, confirm: async (o) => { calls.push(['confirm', o]); return true; } });
  assert.equal(await DialogPort.confirm({ b: 2 }), true);
  registerUiPort('forceAlchemyWorkbench', async (actor, opts) => ({ actor, opts }));
  assert.deepEqual(await openForceAlchemyWorkbenchPort('x', { y: 1 }), { actor: 'x', opts: { y: 1 } });
  assert.deepEqual(calls, [['prompt', { a: 1 }], ['confirm', { b: 2 }]]);
});
test('engine/talent no longer imports presentation modules; the UI modules register the ports', () => {
  for (const f of fs.readdirSync('scripts/engine/talent').filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(`scripts/engine/talent/${f}`, 'utf8');
    assert.ok(!/scripts\/apps\//.test(src.split('\n').filter((l) => l.startsWith('import')).join('\n')), `${f} imports apps/**`);
  }
  assert.match(fs.readFileSync('scripts/apps/dialogs/swse-dialog-v2.js', 'utf8'), /registerUiPort\('dialogV2', SWSEDialogV2\)/);
  assert.match(fs.readFileSync('scripts/apps/force-alchemy/force-alchemy-workbench-app.js', 'utf8'), /registerUiPort\('forceAlchemyWorkbench', openForceAlchemyWorkbench\)/);
});
