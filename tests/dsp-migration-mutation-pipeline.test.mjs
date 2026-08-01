import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { fakeActorEngineCallLog, resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// Phase 3 §A backcheck — real behavioral proof (not source-text regex)
// that a 'system.-=darkSideScore': null deletion key survives the actual
// production normalization/flatten path, and that the migration's new
// skipRecalc/suppressAppRefresh/render/guardKey options actually reach
// ActorEngine.updateActor(). MutationNormalizationService and
// applyActorUpdateAtomic are real, unfaked production code — only
// ActorEngine itself is faked (per the harness's documented convention),
// for the second half of this file.

registerFoundryPathLoader();

const { MutationNormalizationService } = await import(
  '/systems/foundryvtt-swse/scripts/governance/mutation/mutation-normalization-service.js'
);
const { applyActorUpdateAtomic } = await import(
  '/systems/foundryvtt-swse/scripts/utils/actor-utils.js'
);
const { migrateDarkSidePoints } = await import(
  '/systems/foundryvtt-swse/scripts/migration/dark-side-points-migration.js'
);

// ── 1. MutationNormalizationService.normalizePayload: real deletion-key survival ──
{
  installFoundryShimGlobals();
  const payload = {
    'system.darkSide.value': 5,
    'system.-=darkSideScore': null
  };
  const { normalizedUpdateData } = MutationNormalizationService.normalizePayload(payload, { system: {} });
  const flat = foundry.utils.flattenObject(normalizedUpdateData);
  assert.equal(flat['system.darkSide.value'], 5);
  assert.equal('system.-=darkSideScore' in flat, true, 'the deletion key must survive normalization intact');
  assert.equal(flat['system.-=darkSideScore'], null);
  resetFoundryShimGlobals();
}

// ── 2. applyActorUpdateAtomic -> actor.update(): real deletion-key survival end to end ──
{
  installFoundryShimGlobals();
  let received = null;
  const fakeActor = {
    id: 'actor-1',
    name: 'Test Actor',
    collection: {}, // non-null so applyActorUpdateAtomic doesn't attempt a world-collection refetch
    constructor: { name: 'FakeActor' },
    async update(payload, options) {
      received = { payload, options };
      return this;
    }
  };
  const changes = {
    'system.darkSide.value': 5,
    'system.-=darkSideScore': null
  };
  await applyActorUpdateAtomic(fakeActor, changes, { skipRecalc: true });
  assert.ok(received, 'actor.update() was called');
  assert.equal(received.payload['system.darkSide.value'], 5);
  assert.equal('system.-=darkSideScore' in received.payload, true, 'the deletion key must reach the final Foundry-bound payload intact');
  assert.equal(received.payload['system.-=darkSideScore'], null);
  resetFoundryShimGlobals();
}

// ── 3. migrateDarkSidePoints() actually passes skipRecalc/suppressAppRefresh/render/guardKey to ActorEngine ──
{
  const map = new Map();
  const actor = {
    id: 'actor-legacy',
    name: 'Legacy Actor',
    _source: { system: { darkSideScore: 5 } },
    system: { darkSideScore: 5, darkSide: { value: 0, max: 0 } }
  };
  map.set(actor.id, actor);
  map[Symbol.iterator] = function* iterateValues() { yield* this.values(); };

  installFoundryShimGlobals({
    game: {
      user: { isGM: true, id: 'gm-1' },
      actors: map,
      settings: {
        get: () => undefined,
        set: async () => {},
        settings: { has: (fullKey) => fullKey === 'foundryvtt-swse.darkSidePointsPhase2Migration' }
      }
    }
  });
  resetFakeActorEngine();

  await migrateDarkSidePoints({ silent: true });

  const updateCalls = fakeActorEngineCallLog.filter(c => c.method === 'updateActor');
  assert.equal(updateCalls.length, 1);
  const { options } = updateCalls[0];
  assert.equal(options.skipRecalc, true);
  assert.equal(options.suppressAppRefresh, true);
  assert.equal(options.render, false);
  assert.equal(options.source, 'dark-side-points-phase2-migration');
  assert.equal(options.meta?.guardKey, 'dark-side-points-phase2');
  assert.equal(options.meta?.origin, 'migration');
  resetFoundryShimGlobals();
}

console.log('DSP migration mutation-pipeline backcheck tests passed.');
