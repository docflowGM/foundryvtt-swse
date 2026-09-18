import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for Category C row 18 in
// docs/audits/ability-schema-authority-migration-phase3-ledger.md:
// scripts/actors/v2/character-actor.js's mirrorIdentity() built
// system.derived.identity.abilities (an array of {key,label,total,mod})
// entirely from system.abilities -- the legacy, always-{base:10,mod:0}
// compatibility mirror -- never reading system.attributes at all. This
// array is not dead output: templates/actors/character/v2/partials/
// skills-panel.hbs does `{{#each @root.derived.identity.abilities as |ab|}}`
// in two places, so this fed real, player-facing ability score/modifier
// display on the skills panel. Fixed to use
// SchemaAdapters.getAbilityScore()/getAbilityMod(), which is safe to call
// synchronously inside computeCharacterDerived (it falls through to a
// synchronously-fresh system.attributes reconstruction whenever
// system.derived.attributes isn't yet populated for this prepare cycle).

registerFoundryPathLoader();
installFoundryShimGlobals();

const { computeCharacterDerived } = await import(
  '/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js'
);

function actorWithDivergentMirror() {
  return {
    id: 'char-identity-ability-1',
    type: 'character',
    name: 'Identity Ability Test Character',
    items: [],
    system: {
      level: 1,
      skills: {},
      attributes: {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 20, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      // Always the legacy default stub, deliberately divergent from the
      // real Dex 20 above, to prove the fix no longer trusts this block.
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Test 1 — system.derived.identity.abilities must reflect the real Dex 20
// (+5), not the stale system.abilities mirror's Dex 10 (+0).
// ---------------------------------------------------------------------------
{
  const actor = actorWithDivergentMirror();
  computeCharacterDerived(actor, actor.system);
  const abilities = actor.system.derived.identity.abilities;
  assert.ok(Array.isArray(abilities), 'derived.identity.abilities must be an array (skills-panel.hbs iterates it directly)');

  const dex = abilities.find(a => a.key === 'dex');
  assert.ok(dex, 'dex entry must be present');
  assert.equal(dex.total, 20, 'dex total must be the real score (20), not the stale mirror (10)');
  assert.equal(dex.mod, 5, 'dex mod must be derived from the real score (+5), not the stale mirror (+0)');

  const str = abilities.find(a => a.key === 'str');
  assert.equal(str.total, 10, 'str total must be 10 for an unmodified base score');
  assert.equal(str.mod, 0, 'str mod must be 0 for an unmodified base score');
}

// ---------------------------------------------------------------------------
// Test 2 — every ability key is present with a label, in a stable order.
// ---------------------------------------------------------------------------
{
  const actor = actorWithDivergentMirror();
  computeCharacterDerived(actor, actor.system);
  const abilities = actor.system.derived.identity.abilities;
  assert.deepEqual(abilities.map(a => a.key), ['str', 'dex', 'con', 'int', 'wis', 'cha']);
  assert.equal(abilities.find(a => a.key === 'wis').label, 'Wisdom');
}

console.log('character-actor-identity-ability-authority.test.mjs: all assertions passed');
