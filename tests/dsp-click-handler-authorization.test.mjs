import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { fakeActorEngineCallLog, resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// Phase 3 — real behavioral coverage for the extracted click-handler
// module, using the existing Foundry-shim harness (ActorEngine faked per
// the harness's documented convention; DSPEngine and
// DarkSideScoreAccessPolicy are real production code).

registerFoundryPathLoader();

const { handleSetDarkSideScore } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/dsp-click-handler.js'
);

function actor(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Test Actor',
    isOwner: false,
    _source: { system: { darkSide: { value: 3, max: 10 } } },
    system: { darkSide: { value: 3, max: 10 } },
    ...overrides
  };
}

function fresh({ policy = 'gmOnly' } = {}) {
  installFoundryShimGlobals({
    game: {
      user: { isGM: false },
      settings: {
        get: (_ns, key) => (key === 'darkSideScoreEditPolicy' ? policy : undefined),
        set: async () => {},
        settings: { has: (fullKey) => fullKey === 'foundryvtt-swse.darkSideScoreEditPolicy' }
      }
    }
  });
  resetFakeActorEngine();
}

// Unauthorized call: zero ActorEngine calls, no throw, clean rejection result.
{
  fresh({ policy: 'gmOnly' });
  const target = actor({ isOwner: true }); // owner, but gmOnly policy and non-GM user
  const result = await handleSetDarkSideScore(target, 5, { sheetEditable: true, user: { isGM: false } });
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'not-authorized');
  assert.equal(fakeActorEngineCallLog.length, 0);
  resetFoundryShimGlobals();
}

// Authorized call: exactly one canonical system.darkSide.value update.
{
  fresh({ policy: 'ownerOrGM' });
  const target = actor({ isOwner: true });
  const result = await handleSetDarkSideScore(target, 5, { sheetEditable: true, user: { isGM: false } });
  assert.equal(result.applied, true);
  assert.equal(result.value, 5);
  const applyCalls = fakeActorEngineCallLog.filter(c => c.method === 'apply');
  assert.equal(applyCalls.length, 1, 'exactly one canonical write, no duplicate mutation');
  assert.equal(target.system.darkSide.value, 5);
  resetFoundryShimGlobals();
}

// "Owner status forged in the DOM is irrelevant" — only the real actor.isOwner
// matters; a caller cannot pass any flag that bypasses the actual check.
{
  fresh({ policy: 'ownerOrGM' });
  const nonOwnerTarget = actor({ isOwner: false });
  const result = await handleSetDarkSideScore(nonOwnerTarget, 5, { sheetEditable: true, user: { isGM: false } });
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'not-authorized');
  assert.equal(fakeActorEngineCallLog.length, 0);
  resetFoundryShimGlobals();
}

// Direct invocation with no originating DOM event (simulating a forged/console call).
{
  fresh({ policy: 'gmOnly' });
  const target = actor({ isOwner: true });
  const result = await handleSetDarkSideScore(target, undefined, { sheetEditable: true, user: { isGM: false } });
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'not-authorized', 'authorization is checked before the index is even inspected');
  assert.equal(fakeActorEngineCallLog.length, 0);
  resetFoundryShimGlobals();
}

// Malformed index (authorized user, but bad index) -> no mutation.
{
  fresh({ policy: 'gmOnly' });
  const target = actor();
  for (const bad of ['abc', undefined, NaN, {}]) {
    const result = await handleSetDarkSideScore(target, bad, { sheetEditable: true, user: { isGM: true } });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'malformed-index');
  }
  assert.equal(fakeActorEngineCallLog.length, 0);
  resetFoundryShimGlobals();
}

// Value 0 with authorization granted -> canonical update writes 0 (not treated as falsy/no-op).
{
  fresh({ policy: 'gmOnly' });
  const target = actor();
  const result = await handleSetDarkSideScore(target, 0, { sheetEditable: true, user: { isGM: true } });
  assert.equal(result.applied, true);
  assert.equal(result.value, 0);
  resetFoundryShimGlobals();
}

// Index above DSPEngine.getMax() -> clamped to the engine max, not the raw requested value.
{
  fresh({ policy: 'gmOnly' });
  const target = actor({ system: { darkSide: { value: 3, max: 10 } } });
  const result = await handleSetDarkSideScore(target, 999, { sheetEditable: true, user: { isGM: true } });
  assert.equal(result.applied, true);
  assert.equal(result.value, 10, 'clamped to the actor\'s max, not the forged 999');
  resetFoundryShimGlobals();
}

resetFoundryShimGlobals();
console.log('DSP click handler authorization tests passed.');
