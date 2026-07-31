import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// follower-mutation-planning.js imports follower-talent-config.js via the
// Foundry-absolute '/systems/foundryvtt-swse/...' specifier convention used
// throughout this codebase. That target module is pure data with zero
// Foundry dependency of its own, so only the shim's path-rewrite hook is
// needed here — no Foundry globals (game/Actor/etc.) are installed or
// required for this file's imports to resolve. Static `import` declarations
// are resolved at link time, before any module-level code (including a
// registration call) runs, so the module under test must be loaded via a
// dynamic import() AFTER registering — a static import here would resolve
// too early and miss the path rewrite.
registerFoundryPathLoader();

const {
  choiceArray,
  uniqueList,
  clonePlain,
  getGrantingTalentNameFromMutation,
  getGrantingTalentItemIdFromMutation,
  getFixedFollowerProfileFromChoices,
  usesNoStartingCredits,
  resolveFollowerName,
  resolveFollowerDroidSystems,
  resolveFollowerDroidCredits,
  buildFollowerCreationPreflight
} = await import('../scripts/apps/progression-framework/adapters/follower-mutation-planning.js');

// MUTATION-GOVERNANCE ADDENDUM (correction pass).
//
// A prior review found that FollowerCreator.createFollowerFromMutation's
// preflight block assigned to an undeclared `actorData` variable
// (`actorData = {` with no const/let/var). Because .mjs files always run in
// strict mode, that assignment threw a ReferenceError on every single
// follower creation attempt — silently swallowed by the preflight's own
// catch, which returned null. The bug was invisible to the previous test
// suite because every test exercised the pure transaction *coordinator*
// with mock steps, never this actual preflight-building logic.
//
// buildFollowerCreationPreflight() is the exact code that now runs in
// production (FollowerCreator.createFollowerFromMutation calls it
// directly — see follower-creator.js). This file imports and executes that
// real function, not a reimplementation or a mock, so a regression of this
// exact class of bug (a bad declaration, a typo'd identifier, a thrown
// error during normal, valid input) is caught here.

function makeOwner(overrides = {}) {
  return { id: 'owner-1', name: 'Rex Blaine', ...overrides };
}

function makeFollowerMutation(overrides = {}) {
  return {
    speciesName: 'Human',
    templateType: 'aggressive',
    persistentChoices: {},
    followerState: {
      level: 4,
      abilities: { str: { base: 14 }, dex: { base: 12 }, con: { base: 10 }, int: { base: 10 }, wis: { base: 10 }, cha: { base: 10 } },
      hp: { max: 22, value: 22 },
      baseAttackBonus: 3,
      defenses: { fortitude: { total: 14 }, reflex: { total: 12 }, will: { total: 11 } }
    },
    targetHeroicLevel: 4,
    ...overrides
  };
}

// --- Regression test: the real production preflight path must not throw
// on ordinary, valid input, and must reach a usable actorData payload. ---
{
  const owner = makeOwner();
  const followerMutation = makeFollowerMutation();

  // This is the exact call FollowerCreator.createFollowerFromMutation makes.
  // Before the fix, this line threw `ReferenceError: actorData is not
  // defined` for every caller, valid input or not.
  const preflight = buildFollowerCreationPreflight(owner, followerMutation);

  assert.ok(preflight, 'buildFollowerCreationPreflight must not throw on valid input');
  assert.ok(preflight.actorData, 'must produce an actorData payload');
  assert.equal(preflight.actorData.type, 'npc');
  assert.equal(preflight.actorData.name, "Rex Blaine's Aggressive Follower");
  assert.equal(preflight.actorData.system.race, 'Human');
  assert.equal(preflight.actorData.system.level, 4);
  assert.equal(preflight.actorData.system.isFollower, true);
  assert.equal(preflight.actorData.system.isDroid, false);
  assert.equal(preflight.actorData.system.hp.max, 22);
  assert.equal(preflight.actorData.flags.swse.follower.ownerId, 'owner-1');
  assert.equal(preflight.actorData.flags.swse.follower.templateType, 'aggressive');
  assert.equal(preflight.isDroidFollower, false);
  assert.equal(preflight.fixedProfile, null);
}

// --- Droid follower path reaches the same preflight without throwing, and
// carries the resolved droid systems/credits into the payload. ---
{
  const owner = makeOwner();
  const followerMutation = makeFollowerMutation({
    speciesName: 'Droid',
    persistentChoices: {
      droidConfig: {
        isDroid: true,
        size: 'small',
        speed: 4,
        droidSystems: { locomotion: { id: 'walking' }, processor: { id: 'heuristic' }, appendages: [] },
        droidCredits: { base: 500, spent: 200 }
      },
      startingCredits: 500
    }
  });

  const preflight = buildFollowerCreationPreflight(owner, followerMutation);

  assert.equal(preflight.isDroidFollower, true);
  assert.equal(preflight.actorData.system.isDroid, true);
  assert.equal(preflight.actorData.system.noConstitution, true);
  assert.equal(preflight.actorData.system.droidSize, 'small');
  assert.equal(preflight.actorData.system.credits, 0, 'droid followers never carry independent spendable credits');
  assert.ok(preflight.actorData.system.droidSystems);
  assert.equal(preflight.actorData.system.droidCredits.spent, 200);
  assert.equal(preflight.actorData.flags['foundryvtt-swse'].isDroid, true);
}

// --- A fixed follower profile (e.g. Akk Dog) reaches the preflight and
// suppresses starting credits as documented. ---
{
  const owner = makeOwner();
  const followerMutation = makeFollowerMutation({
    persistentChoices: {
      fixedFollowerProfile: {
        id: 'akk-dog-follower',
        speciesName: 'Akk Dog',
        speciesType: 'Beast',
        size: 'medium',
        speed: 6,
        noStartingCredits: true,
        creatureKind: 'beast'
      }
    }
  });

  const preflight = buildFollowerCreationPreflight(owner, followerMutation);

  assert.ok(preflight.fixedProfile);
  assert.equal(preflight.actorData.system.race, 'Akk Dog');
  assert.equal(preflight.actorData.system.credits, 0);
  assert.equal(preflight.actorData.system.progression.noStartingCredits, true);
  assert.equal(preflight.actorData.flags.swse.follower.fixedFollowerProfileId, 'akk-dog-follower');
}

// --- A missing followerState.abilities is a preflight failure (throws),
// which is the exact "nothing persisted yet, safe to return null" case
// FollowerCreator.createFollowerFromMutation's catch block handles. This
// proves preflight failures are real malformed-input failures, not the
// undeclared-variable bug masquerading as one. ---
{
  const owner = makeOwner();
  const malformed = { templateType: 'aggressive', persistentChoices: {} }; // no followerState at all
  assert.throws(() => buildFollowerCreationPreflight(owner, malformed));
}

// --- Calling twice with the same input produces an equivalent payload
// (pure, no hidden mutable state). ---
{
  const owner = makeOwner();
  const followerMutation = makeFollowerMutation();
  const first = buildFollowerCreationPreflight(owner, followerMutation);
  const second = buildFollowerCreationPreflight(owner, followerMutation);
  assert.deepEqual(first.actorData, second.actorData);
}

// --- Supporting pure helpers, exercised directly (not just transitively
// through buildFollowerCreationPreflight). ---

{
  assert.deepEqual(choiceArray(['a', ' b ', '', null]), ['a', 'b']);
  assert.deepEqual(choiceArray('solo'), ['solo']);
  assert.deepEqual(choiceArray(null), []);
}

{
  assert.deepEqual(uniqueList(['A', 'a', ' A ', 'B']), ['A', 'a', 'B'], 'trims but does not case-fold');
}

{
  const original = { a: 1, nested: { b: 2 } };
  const cloned = clonePlain(original);
  assert.deepEqual(cloned, original);
  assert.notEqual(cloned, original);
  cloned.nested.b = 99;
  assert.equal(original.nested.b, 2, 'clone is deep, not shallow');
}

{
  assert.equal(getGrantingTalentNameFromMutation({ grantingTalentName: 'Undying Loyalty' }), 'Undying Loyalty');
  assert.equal(getGrantingTalentNameFromMutation({ persistentChoices: { grantingTalentName: 'Fallback' } }), 'Fallback');
  assert.equal(getGrantingTalentNameFromMutation({}), null);
}

{
  assert.equal(getGrantingTalentItemIdFromMutation({ grantingTalentItemId: 'item-1' }), 'item-1');
  assert.equal(getGrantingTalentItemIdFromMutation({}), null);
}

{
  assert.equal(getFixedFollowerProfileFromChoices({}, {}), null);
  const profile = { id: 'x', speciesName: 'Test' };
  assert.equal(getFixedFollowerProfileFromChoices({ fixedFollowerProfile: profile }, {}), profile);
}

{
  assert.equal(usesNoStartingCredits({}, {}), false);
  assert.equal(usesNoStartingCredits({ fixedFollowerProfile: { noStartingCredits: true } }, {}), true);
}

{
  assert.equal(resolveFollowerName(makeOwner(), 'utility', {}), "Rex Blaine's Utility Follower");
  assert.equal(resolveFollowerName(makeOwner(), 'utility', { followerName: 'Custom Name' }), 'Custom Name');
}

{
  const systems = resolveFollowerDroidSystems({ droidSystems: { locomotion: { id: 'walking' } } });
  assert.ok(systems.locomotion);
  assert.deepEqual(resolveFollowerDroidSystems({}), { baseSystems: [], optionalSystems: [], allowedOptionalCategories: [] });
}

{
  const credits = resolveFollowerDroidCredits({ startingCredits: 300 }, { droidCredits: { spent: 100 } });
  assert.equal(credits.base, 300);
  assert.equal(credits.spent, 100);
  assert.equal(credits.remaining, 200);
  assert.equal(credits.unspentCreditsLost, true);
  assert.equal(credits.allowOverflow, false);
}

console.log('Follower mutation planning tests passed.');
