import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 2's legacy-facade caller map
// (docs/audits/rolling-system-alignment-phase-2.md). Confirms the facades
// that DO have live callers are thin delegates to the aligned authorities,
// and that they no longer re-implement hit/critical interpretation.

const enhancedRolls = await readFile(new URL('../scripts/combat/rolls/enhanced-rolls.js', import.meta.url), 'utf8');

// SWSERoll.rollAttack() (the only enhanced-rolls.js attack entry point with
// live callers — character-sheet.js, action-economy-bindings.js,
// grappling-system.js, enhanced-combat-system.js, vehicle-weapons.js) must
// delegate dice execution and outcome interpretation to the canonical
// attacks.js rollAttack(), not recompute them.
assert.match(enhancedRolls, /import \{ rollAttack as canonicalRollAttack \} from "\/systems\/foundryvtt-swse\/scripts\/combat\/rolls\/attacks\.js"/);
assert.match(enhancedRolls, /static async rollAttack\(actor, weapon, options = \{\}\) \{[\s\S]{0,2000}canonicalRollAttack\(actor, weapon, \{/);

// It must read hit/critical from the canonical result rather than
// independently comparing roll.total to a defense value.
const rollAttackBody = enhancedRolls.slice(
  enhancedRolls.indexOf('static async rollAttack(actor, weapon, options = {}) {'),
  enhancedRolls.indexOf('static async rollBulkAttack(')
);
assert.doesNotMatch(rollAttackBody, /roll\.total\s*>=/, 'SWSERoll.rollAttack() must not independently compare roll.total to a defense.');
assert.match(rollAttackBody, /attackContext\.isHit \?\? attackResult\.isHit/, 'SWSERoll.rollAttack() must read isHit from the canonical result.');

console.log('Phase 2 legacy-facade delegation guards passed.');
