import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Phase 3D.4 (A-06): engine code reads the athletics house rule through HouseRuleService, not game.settings.get.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
for (const f of ['scripts/engine/progression/skills/skill-registry.js', 'scripts/engine/progression/prerequisites/legacy-prereq-registry.js']) {
  const src = fs.readFileSync(f, 'utf8');
  assert.ok(!/game\.settings\.get\(\s*['"]foundryvtt-swse['"]\s*,\s*['"]athleticsConsolidation/.test(src), `${f} must not read the house rule directly`);
  assert.ok(/HouseRuleService\.getBoolean\('athleticsConsolidation'/.test(src), `${f} reads through HouseRuleService`);
}
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
let value = true;
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: (ns, k) => (k === 'athleticsConsolidation' ? value : undefined), set: () => {}, settings: new Map([['foundryvtt-swse.athleticsConsolidation', {}]]) } };
assert.equal(HouseRuleService.getBoolean('athleticsConsolidation', false), true);
value = false; assert.equal(HouseRuleService.getBoolean('athleticsConsolidation', false), false);
globalThis.game = { settings: { get: () => { throw new Error('not registered'); } } };
assert.equal(HouseRuleService.getBoolean('athleticsConsolidation', false), false, 'unregistered setting falls back to the default');
console.log('house-rule-reads-via-service: ok');
