import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Step 1: retired mutation/commerce surfaces stay gone and nothing imports them.
// Static evidence only (no computed imports detected); not a Foundry startup proof.
const RETIRED = [
  ['scripts/governance/mutation/mutation-gateway.js', 'MutationGateway'],
  ['scripts/governance/mutation/mutation-router.js', 'MutationRouter'],
  ['scripts/engine/store/store-transaction-engine.js', 'StoreTransactionEngine'],
  ['scripts/domain/vehicles/vehicle-transaction-service.js', 'VehicleTransactionService'],
  ['scripts/patches/follower-droid-garage-hotfix.js', 'registerFollowerDroidGarageHotfix'],
  ['scripts/apps/progression-framework/shell/mutation-coordinator.js', 'MutationCoordinator'],
  ['scripts/apps/progression-framework/shell/mutation-plan.js', null], // generic name 'MutationPlan' is used elsewhere: import check only
  ['scripts/engine/core/UpdatePipeline.js', 'UpdatePipeline'],
  ['scripts/engine/core/commands/ActorCommands.js', 'ActorCommands'],
  ['scripts/engine/core/ProgressionStatePersistence.js', 'ProgressionStatePersistence']
];
for (const [file] of RETIRED) assert.equal(fs.existsSync(file), false, `${file} must stay deleted`);

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const full = path.join(dir, n);
    if (fs.statSync(full).isDirectory()) walk(full, out); else if (/\.(js|mjs|hbs|json)$/.test(n)) out.push(full);
  }
  return out;
}
const live = [...walk('scripts'), ...walk('templates'), 'system.json', 'index.js'];
for (const file of live) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [retired, symbol] of RETIRED) {
    const base = path.basename(retired, '.js');
    const importRe = new RegExp(`(from\\s+['"][^'"]*${base}(\\.js)?['"]|import\\(['"][^'"]*${base}(\\.js)?['"]\\))`);
    assert.equal(importRe.test(text), false, `${file} still imports ${base}`);
    // a runtime reference to the symbol (not a comment line)
    const code = text.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    if (symbol) assert.equal(new RegExp(`\\b${symbol}\\b`).test(code), false, `${file} references ${symbol}`);
  }
}
console.log('Step 1 retired mutation-surface tests passed.');
