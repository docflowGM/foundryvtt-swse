import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 6: Grab/Grapple defense-channel
// correctness (docs/audits/v2-math-integrity-authority-ledger.md).
//
// Round 5 fixed static/contextual stacking. A sixth review, reading the
// ACTUAL current packs/feats.db data (not a synthetic fixture), found the
// contextual-modifier collector round 5 introduced was itself semantically
// wrong for one specific feat.
//
// The old RESIST_GRAB_AND_GRAPPLE rule shape bundled two DIFFERENT SWSE
// mechanics into one `bonus` field:
//   (a) a Reflex Defense bonus against an incoming Grab/Grapple attack, and
//   (b) a bonus to the wielder's OWN opposed Grapple checks.
// Grapple Resistance's real text grants BOTH, coincidentally at the same
// value (+5), which is why this bug was invisible until now. Grab Back's
// real text grants ONLY (a) -- "+2 bonus to your Reflex Defense against
// Grab and Grapple attacks" -- with no opposed-check bonus at all. But its
// metadata used the same single-field shape (`bonus: 2`), so round 5's
// collectContextualGrappleModifiers() (which reads RESIST_GRAB_AND_GRAPPLE
// for the opposed-check channel) incorrectly gave a Grab Back defender +2
// on their own opposed Grapple checks -- a bonus that feat does not grant.
//
// Fixed by splitting the channels explicitly in the rule shape itself
// (GRAB_GRAPPLE_RESISTANCE: {reflexBonus, opposedGrappleBonus}), not by
// special-casing feat names anywhere in the consuming code:
//   - packs/feats.db / packs/feat-catalog.db / data/feat-catalog.json
//     (all three are live-loaded feat data sources -- see feat-registry.js/
//     feat-pack-seeder.js for data/feat-catalog.json specifically)
//   - grapple-feat-normalization-hooks.js's "grapple resistance" entry
//   - hp-recompute-hooks.js's HPRecomputeHooks grapple-rule branch (a
//     second, independent normalization hook -- dormant for compendium-
//     shipped items since hasExistingGrappleRules() short-circuits before
//     it runs, but kept consistent in case it ever fires for a bare/legacy
//     item)
//   - MetaResourceFeatResolver.getGrappleResistanceBonus() now reads
//     `reflexBonus` (the channel it has always served: attemptGrab()'s
//     Reflex-Defense-vs-incoming-Grab check)
//   - grappling-system.js#collectContextualGrappleModifiers() now reads
//     `opposedGrappleBonus` (the channel it serves: the wielder's own
//     opposed Grapple check bonus at roll time)
// A legacy RESIST_GRAB_AND_GRAPPLE shape is still read for backward
// compatibility with any already-embedded item created before this fix,
// but ONLY for the Reflex channel (the one value both known feats agree
// on) -- never for the opposed-check channel, which would risk
// reintroducing the exact over-grant bug this fixes. This is a
// conservative under-grant, never an over-grant, for stale data.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { MetaResourceFeatResolver } = await import(
  '/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js'
);

// ─── 0. Production metadata proof: read the REAL pack records ─────────────
// Not a synthetic fixture -- this is exactly what ships to players.

function findFeatRecord(path, name) {
  const raw = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj?.name === name) return obj;
  }
  throw new Error(`"${name}" not found in ${path}`);
}

for (const packPath of ['packs/feats.db', 'packs/feat-catalog.db']) {
  const grappleResistance = findFeatRecord(packPath, 'Grapple Resistance');
  const grabBack = findFeatRecord(packPath, 'Grab Back');

  const grResRule = grappleResistance.system.abilityMeta.grappleRules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
  assert.ok(grResRule, `[${packPath}] Grapple Resistance must have a GRAB_GRAPPLE_RESISTANCE rule`);
  assert.equal(grResRule.reflexBonus, 5, `[${packPath}] Grapple Resistance's real production data must grant +5 Reflex`);
  assert.equal(grResRule.opposedGrappleBonus, 5, `[${packPath}] Grapple Resistance's real production data must grant +5 to opposed Grapple checks`);

  const grabBackRule = grabBack.system.abilityMeta.grappleRules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
  assert.ok(grabBackRule, `[${packPath}] Grab Back must have a GRAB_GRAPPLE_RESISTANCE rule`);
  assert.equal(grabBackRule.reflexBonus, 2, `[${packPath}] Grab Back's real production data must grant +2 Reflex`);
  assert.equal(grabBackRule.opposedGrappleBonus, 0, `[${packPath}] Grab Back's real production data must grant NO opposed-Grapple-check bonus`);
}

console.log('  [1/4] real packs/feats.db and packs/feat-catalog.db records for Grapple Resistance and Grab Back carry the correct split-channel values OK');

// data/feat-catalog.json is a third, separately-loaded live data source
// (see feat-registry.js/feat-pack-seeder.js) with its own copies of the
// same records -- also migrated, also checked here for real.
{
  const catalog = JSON.parse(readFileSync(new URL('../data/feat-catalog.json', import.meta.url), 'utf8'));
  const grappleResistance = catalog.find(f => f.name === 'Grapple Resistance');
  const grabBack = catalog.find(f => f.name === 'Grab Back');
  const grResRule = grappleResistance.system.abilityMeta.grappleRules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
  const grabBackRule = grabBack.system.abilityMeta.grappleRules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
  assert.equal(grResRule.reflexBonus, 5);
  assert.equal(grResRule.opposedGrappleBonus, 5);
  assert.equal(grabBackRule.reflexBonus, 2);
  assert.equal(grabBackRule.opposedGrappleBonus, 0);
}

console.log('  [2/4] real data/feat-catalog.json records carry the correct split-channel values OK');

// ─── 1. MetaResourceFeatResolver.getGrappleResistanceBonus() -- the ────────
//        Reflex-Defense-vs-incoming-Grab channel only.

function actorWithFeat(featSystemAbilityMeta) {
  return {
    items: [{ type: 'feat', name: 'Test Feat', system: { disabled: false, abilityMeta: featSystemAbilityMeta } }]
  };
}

{
  const grabBackActor = actorWithFeat({ grappleRules: [{ type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 2, opposedGrappleBonus: 0, source: 'Grab Back' }] });
  const grResActor = actorWithFeat({ grappleRules: [{ type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 5, opposedGrappleBonus: 5, source: 'Grapple Resistance' }] });

  assert.equal(MetaResourceFeatResolver.getGrappleResistanceBonus(grabBackActor, { mode: 'resistGrab' }), 2, 'Grab Back must contribute +2 to the Reflex-vs-incoming-Grab channel');
  assert.equal(MetaResourceFeatResolver.getGrappleResistanceBonus(grResActor, { mode: 'resistGrab' }), 5, 'Grapple Resistance must contribute +5 to the Reflex-vs-incoming-Grab channel');

  // Legacy shape: still read, but only for this Reflex channel.
  const legacyActor = actorWithFeat({ grappleRules: [{ type: 'RESIST_GRAB_AND_GRAPPLE', bonus: 2 }] });
  assert.equal(MetaResourceFeatResolver.getGrappleResistanceBonus(legacyActor, { mode: 'resistGrab' }), 2, 'a legacy-shaped rule must still contribute to the Reflex channel (backward compatibility)');
}

console.log('  [3/4] getGrappleResistanceBonus() (Reflex-vs-incoming-Grab channel) correctly reads reflexBonus for both feats, including legacy-shape backward compatibility OK');

// ─── 2. collectContextualGrappleModifiers() -- the opposed-Grapple-check ───
//        channel only, via SWSEGrappling._rollGrappleBonus() (the public
//        surface this internal collector feeds).

{
  globalThis.foundry = globalThis.foundry ?? {};
  globalThis.foundry.applications = globalThis.foundry.applications ?? {};
  globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
    ApplicationV2: class {},
    HandlebarsApplicationMixin: (Base) => class extends Base {}
  };
  globalThis.window = globalThis.window ?? globalThis;

  const { SWSEGrappling } = await import(
    '/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js'
  );

  function grappler(items) {
    return {
      id: 'grappler', name: 'Grappler', type: 'character', items,
      system: {
        level: 8, size: 'medium',
        attributes: { str: { base: 10, racial: 0, enhancement: 0, temp: 0 }, dex: { base: 10, racial: 0, enhancement: 0, temp: 0 } },
        // grappleBonusParts.core is what _rollGrappleBonus() actually reads
        // for the static/core term (see round 5); the plain
        // derived.grappleBonus mirror is set to match for realism but is
        // not itself consulted by _rollGrappleBonus() when parts.core is
        // present.
        derived: { grappleBonus: 12, grappleBonusParts: { core: 12, staticModifiers: 0, total: 12 }, modifiers: { breakdown: {} } }
      }
    };
  }

  const grabBackItem = { type: 'feat', name: 'Grab Back', system: { disabled: false, abilityMeta: { grappleRules: [
    { type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 2, opposedGrappleBonus: 0, source: 'Grab Back' }
  ] } } };
  const grResItem = { type: 'feat', name: 'Grapple Resistance', system: { disabled: false, abilityMeta: { grappleRules: [
    { type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 5, opposedGrappleBonus: 5, source: 'Grapple Resistance' }
  ] } } };

  const grabBackResistGrapple = await SWSEGrappling._rollGrappleBonus(grappler([grabBackItem]), { mode: 'resistGrapple' });
  assert.equal(grabBackResistGrapple, 12, 'Grab Back must NOT add anything to the opposed Grapple check (it grants no such bonus) -- this is the exact round-6 regression');

  const grResResistGrapple = await SWSEGrappling._rollGrappleBonus(grappler([grResItem]), { mode: 'resistGrapple' });
  assert.equal(grResResistGrapple, 12 + 5, 'Grapple Resistance must add its +5 to the opposed Grapple check');

  const grResAttackGrapple = await SWSEGrappling._rollGrappleBonus(grappler([grResItem]), { mode: 'attackGrapple' });
  assert.equal(grResAttackGrapple, 12, 'Grapple Resistance must NOT apply when the wielder is the one attacking (its opposed-check bonus is a resist-only mechanic)');

  const bothResistGrapple = await SWSEGrappling._rollGrappleBonus(grappler([grabBackItem, grResItem]), { mode: 'resistGrapple' });
  assert.equal(bothResistGrapple, 12 + 5, 'with both feats, only Grapple Resistance contributes to the opposed-check channel -- Grab Back still contributes 0');
}

console.log('  [4/4] collectContextualGrappleModifiers() (opposed-Grapple-check channel) correctly excludes Grab Back and correctly includes Grapple Resistance OK');

console.log('grab-grapple-resistance-channel-split.test.mjs: all assertions passed');
