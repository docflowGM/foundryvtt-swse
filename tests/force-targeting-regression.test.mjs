import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dialogSource = await readFile(
  new URL('../scripts/sheets/v2/character-sheet/force-roll-dialog.js', import.meta.url),
  'utf8'
);
const finalIntegrationSource = await readFile(
  new URL('../scripts/engine/force/force-power-final-integration.js', import.meta.url),
  'utf8'
);
const healingSource = await readFile(
  new URL('../scripts/engine/force/phase5-force-healing-mitigation.js', import.meta.url),
  'utf8'
);
const damageSource = await readFile(
  new URL('../scripts/engine/force/phase6-force-direct-damage.js', import.meta.url),
  'utf8'
);

// The Force preroller must support both canvas targeting and theater-of-the-mind play.
assert.match(dialogSource, /name=["']targetMode["']/);
assert.match(dialogSource, /Selected token/);
assert.match(dialogSource, /Pick from combatants/);
assert.match(dialogSource, /Manual defense \/ theater of mind/);
assert.match(dialogSource, /No target .* GM adjudication/);
assert.match(dialogSource, /targetContext/);
assert.match(dialogSource, /targetActor/);
assert.match(dialogSource, /Targeting is optional/);

// Target-requiring powers must roll first. Missing actor targets may suppress
// automation, but must not return a failure before the ForceExecutor roll runs.
for (const source of [finalIntegrationSource, healingSource, damageSource]) {
  assert.doesNotMatch(source, /if\s*\([^\n]*!target[^\n]*\)\s*return\s*\{\s*success:\s*false/);
}

assert.match(finalIntegrationSource, /outcome:\s*['"]manual-adjudication['"]/);
assert.match(healingSource, /No actor target was selected\. The Use the Force check is valid/);
assert.match(damageSource, /No actor target was selected\. Damage and target effects were not rolled or applied automatically/);

// Preserve automated outcomes when an actual actor target is available.
assert.match(finalIntegrationSource, /applyForceStunPlan\(target, plan\)/);
assert.match(healingSource, /applyVitalTransfer\(/);
assert.match(damageSource, /resolveForceLightning\(/);
assert.match(damageSource, /resolveForceSlam\(/);

console.log('Force targeting regression guards passed.');
