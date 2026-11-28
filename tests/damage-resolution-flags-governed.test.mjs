import assert from 'node:assert/strict';
import fs from 'node:fs';
// F-CMB-001 (3E): DamageResolutionEngine's combat bookkeeping flags (encounter-use counters, Stay Up, Quick Comeback, Pinpoint block, rescue marker,
// first-threshold marker) go through ActorEngine's governed flag API (recalc:false), never raw document setFlag/unsetFlag.
const src = fs.readFileSync('scripts/engine/combat/damage-resolution-engine.js', 'utf8');
assert.ok(!/\.(setFlag|unsetFlag)\??\.?\(/.test(src), 'no raw setFlag/unsetFlag calls remain');
assert.equal((src.match(/ActorEngine\.(updateActorFlags|unsetActorFlag)\(/g) || []).length, 2, 'the two helpers are the only flag writers');
assert.ok(/recalc: false/.test(src), 'bookkeeping flags never trigger a recalculation');
console.log('damage-resolution-flags-governed: ok');
