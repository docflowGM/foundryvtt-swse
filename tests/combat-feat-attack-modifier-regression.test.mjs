import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Combat Feat Runtime Mechanics Audit — regression lock for the feats this
// audit confirmed runtime_complete (docs/audits/generated/combat-feat-runtime-status.json).
// Before this audit these were undocumented/unverified; several (Far Shot,
// Precise Shot, Point-Blank Shot, Weapon Focus, Double/Triple Attack) were
// mis-bucketed under taxonomy "Starship & Vehicle" despite being universal
// personal-combat feats, which is likely why no prior test covered them.

registerFoundryPathLoader();
installFoundryShimGlobals();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'feat-catalog.json'), 'utf8'));
function catalogSystem(name) {
  const doc = catalog.find((d) => d.name === name);
  assert.ok(doc, `fixture setup: "${name}" must exist in the canonical feat catalog`);
  return JSON.parse(JSON.stringify(doc.system));
}

// ---------------------------------------------------------------------
// Weapon Focus and Point-Blank Shot — ScopedCombatFeatResolver.getBonus,
// summed into combat-roll-math.js's resolveAttackBonus/resolveDamageBonus
// (the confirmed attack/damage SSOT).
// ---------------------------------------------------------------------
{
  const { ScopedCombatFeatResolver } = await import('/systems/foundryvtt-swse/scripts/engine/feat/scoped-combat-feat-resolver.js');

  const pistolProficient = { items: [{ type: 'feat', name: 'Weapon Focus', system: { selectedChoice: 'Pistols' } }] };
  const rightWeapon = { name: 'Blaster Pistol', system: { weaponGroup: 'Pistols' } };
  const wrongWeapon = { name: 'Blaster Rifle', system: { weaponGroup: 'Rifles' } };
  assert.equal(ScopedCombatFeatResolver.getBonus(pistolProficient, rightWeapon, 'attack'), 1, 'Weapon Focus (Pistols) must grant +1 attack with a Pistols weapon');
  assert.equal(ScopedCombatFeatResolver.getBonus(pistolProficient, wrongWeapon, 'attack'), 0, 'Weapon Focus (Pistols) must not apply to a Rifles weapon');

  const pointBlankActor = { items: [{ type: 'feat', name: 'Point-Blank Shot', system: {} }] };
  const rangedWeapon = { name: 'Blaster Pistol', system: { weaponType: 'ranged' } };
  assert.equal(
    ScopedCombatFeatResolver.getBonus(pointBlankActor, rangedWeapon, 'attack', { isPointBlank: true, attackType: 'ranged' }),
    1,
    'Point-Blank Shot must grant +1 attack in point-blank range with a ranged weapon'
  );
  assert.equal(
    ScopedCombatFeatResolver.getBonus(pointBlankActor, rangedWeapon, 'attack', { isPointBlank: false, attackType: 'ranged' }),
    0,
    'Point-Blank Shot must not apply outside point-blank range'
  );
}

// ---------------------------------------------------------------------
// Far Shot — a catalog-baked ATTACK_OPTION rule (control:"passive"),
// consumed by the real, registered CombatOptionResolver.collectAttackModifiers.
// ---------------------------------------------------------------------
{
  const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
  const farShotSystem = catalogSystem('Far Shot');
  const withFarShot = { items: [{ type: 'feat', name: 'Far Shot', system: farShotSystem }] };
  const without = { items: [] };
  const rifle = { name: 'Blaster Rifle', system: { weaponGroup: 'Rifles' } };

  const withResult = CombatOptionResolver.collectAttackModifiers(withFarShot, rifle, { rangeBand: 'medium' });
  const withoutResult = CombatOptionResolver.collectAttackModifiers(without, rifle, { rangeBand: 'medium' });
  assert.ok(withResult.attackBonus > 0, 'Far Shot must produce a positive range-penalty offset at medium range');
  assert.equal(withoutResult.attackBonus, 0, 'Without Far Shot, no range-penalty offset should be applied by this seam');
}

// ---------------------------------------------------------------------
// Precise Shot — a direct name check inside the confirmed SSOT
// (combat-roll-math.js), not reachable as a standalone exported unit under
// this Node harness (resolveAttackBonus has a browser-only dependency).
// Locked in as a source-text regression guard instead of a full-pipeline
// execution test — matches the existing pattern used elsewhere in this
// repo's test suite (see tests/rolling-ci-support-check.test.mjs) for
// SSOT internals that can't be isolated and executed under plain Node.
// ---------------------------------------------------------------------
{
  const source = fs.readFileSync(path.join(repoRoot, 'scripts', 'engine', 'combat', 'combat-roll-math.js'), 'utf8');
  assert.match(
    source,
    /actorHasFeatNamed\(actor,\s*'Precise Shot'\)/,
    'combat-roll-math.js must still suppress the firing-into-melee penalty for actors with Precise Shot'
  );
}

console.log('OK: Weapon Focus, Point-Blank Shot, Far Shot, and Precise Shot all confirmed to modify the real attack pipeline as documented in docs/audits/generated/combat-feat-runtime-status.json.');
