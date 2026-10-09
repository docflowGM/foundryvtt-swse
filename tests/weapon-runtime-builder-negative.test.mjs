import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildRegistry, serialize } from '../tools/build-weapon-runtime-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANON = 'data/canonical/weapons.json';
const real = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mutateCanon = (fn) => (f) => (f === CANON ? (() => { const j = JSON.parse(real(f)); fn(j); return JSON.stringify(j); })() : real(f));

// byte-stable and equal to the committed registry (the registry is generated from the canonical corpus only)
assert.equal(serialize(buildRegistry()), serialize(buildRegistry()));
assert.equal(serialize(buildRegistry()), real('data/weapons/canonical-weapon-registry.json'));

// missing / duplicate / unmapped canonical identities and production-id collisions fail loudly
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities.pop(); })), /expected 203/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities[1] = j.identities[0]; })), /duplicate canonical identity|assigned to two identities/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities[1].production.id = j.identities[0].production.id; })), /assigned to two identities/);
assert.throws(() => buildRegistry(mutateCanon((j) => { delete j.identities[0].production.id; })), /no production id/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities[0].canonicalStats.attackProfiles = []; })), /no attackProfiles/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.status = 'AUDIT_EVIDENCE'; })), /not the canonical weapons corpus/);

// Only explicit live-attack consumers may import the weapon runtime (allow-list: new consumers need an explicit phase decision)
//   5D-A: attack pipeline + registry init.   5D-B: roll dialog (attack-form selector), attack-ability provenance (stat rules,
//   item editor/weapon config write paths).   5D-C: damage roll (canonical selected-form damage).   5D-E: special-effect execution.
const ALLOWED_RUNTIME_CONSUMERS = new Set([
  'scripts/combat/rolls/attacks.js',
  'scripts/engine/combat/combat-roll-math.js',
  'scripts/infrastructure/hooks/init-hooks.js',
  'scripts/rolls/roll-config.js',
  'scripts/engine/combat/combat-stat-rules.js',
  'scripts/items/item-defaults.js',
  'scripts/ui/weapon-config-dialog.js',
  'scripts/combat/rolls/damage.js',
  'scripts/engine/combat/canonical-special-effects.js', // 5D-E: Apply-Damage execution of the selected form's special effects
  // 5D-F attack-shape convergence: planners/executor/gates read the selected form's structured capabilities (no names)
  'scripts/combat/multi-attack.js',
  'scripts/engine/combat/full-attack-executor.js',
  'scripts/engine/combat/dual-wield-combat-shape-resolver.js',
  'scripts/engine/combat/combat-option-resolver.js',
  'scripts/engine/combat/weapon-target-gate-classifiers.js',
  'scripts/combat/rolls/enhanced-rolls.js',
  'scripts/engine/combat/features/combat-feature-handlers.js',
  'scripts/engine/feat/scoped-combat-feat-resolver.js', // 5D-G: Weapon Focus/Specialization selector join
  'scripts/engine/combat/fire-state-store.js', // 5D-G: owned fire state (readiness) for the selected form
  'scripts/engine/combat/damage-type-rules.js', // 5D-H: CANNOT_NEGATE_ATTACK relation -> reaction negation exclusions
  // 5D-I-C-B weapon control: the declarative control contract is read by the control executor, the falling-object authority and the existing grapple
  // adapter (canonical feat identity + weapon entitlement); no builder / census / manifest is ever read at runtime
  'scripts/engine/combat/weapon-control-effects.js',
  'scripts/engine/combat/falling-object-rules.js',
  'scripts/combat/systems/grappling-system.js',
  // 5D-I-C-C reaction / defense: the one reaction-weapon context (eligibility, modifiers, passive defense, disarm protection) and the live Block / Deflect /
  // Redirect Shot executor that reads it (identity-first talent ownership)
  'scripts/engine/combat/reactions/reaction-weapon-context.js',
  'scripts/engine/talent/lightsaber-talent-actions.js',
  // weapon-readiness UI: sheet view model + configuration dialog (read the owned / canonical configuration; mutate only through FireStateStore)
  'scripts/sheets/v2/character-sheet/concept-context.js',
  'scripts/sheets/v2/character-like-sheet.js',
]);
const refs = execFileSync('git', ['ls-files', 'scripts', 'index.js', 'system.json'], { cwd: ROOT }).toString().split('\n').filter((f) => f.endsWith('.js') && !f.startsWith('scripts/items/weapon-runtime/'));
for (const f of refs) {
  const imports = /weapon-runtime\//.test(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  assert.ok(!imports || ALLOWED_RUNTIME_CONSUMERS.has(f), `${f} must not import the weapon runtime (not an approved runtime consumer)`);
}
for (const f of ALLOWED_RUNTIME_CONSUMERS) assert.ok(/weapon-runtime\//.test(real(f)), `${f} is an expected runtime consumer`);
console.log('weapon-runtime-builder-negative: ok');
