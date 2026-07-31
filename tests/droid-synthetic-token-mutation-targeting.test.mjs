import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// PHASE 5 — Live Foundry VTT v13 Validation and Surgical Runtime Fixes.
//
// Verifies that droid conversion/reconciliation/Garage-installation
// mutations — which all route through ActorEngine.applyMutationPlan()/
// updateActor(), confirmed by reading scripts/governance/actor-engine/actor-engine.js
// (it imports and delegates every actor update to applyActorUpdateAtomic
// from scripts/utils/actor-utils.js) — correctly respect the synthetic-
// token targeting fix documented in that file's own comment:
//
//   "Phase 7 (vehicle-crew-assignment-phase-7) finding: an unlinked
//   token's synthetic actor (actor.isToken === true, actor.token set)
//   legitimately has actor.collection === null — that is not corruption...
//   Before this guard, EVERY mutation to an unlinked vehicle token was
//   silently redirected to game.actors.get(actor.id) — the BASE WORLD
//   ACTOR sharing that id — instead of the token's own synthetic actor."
//
// This fix predates and is unrelated to the droid stabilization work —
// it is a general ActorEngine/actor-utils concern used by every actor
// mutation in the system, not something this droid effort introduced or
// needed to build. This test exists because Phase 4 identified that no
// automated coverage confirmed droid mutations actually benefit from it;
// this loads and exercises the REAL, unmodified applyActorUpdateAtomic()
// (not a fake) via the Foundry-shim harness to close that gap.

registerFoundryPathLoader();

const { applyActorUpdateAtomic } = await import(
  '/systems/foundryvtt-swse/scripts/utils/actor-utils.js'
);

function makeActor({ id, name, collection, isToken, updateImpl }) {
  const calls = [];
  return {
    id,
    name,
    type: 'droid',
    collection,
    isToken: Boolean(isToken),
    constructor: { name: 'Actor' },
    async update(payload, options) {
      calls.push({ payload, options });
      return updateImpl ? updateImpl(payload, options) : this;
    },
    _calls: calls
  };
}

// ── World droid Actor: has a real collection, isToken false — updates directly. ──
{
  installFoundryShimGlobals();
  const worldActor = makeActor({ id: 'world-droid-1', name: 'World Droid', collection: { name: 'Actors' }, isToken: false });
  const result = await applyActorUpdateAtomic(worldActor, { system: { droidCalculationMode: 'playable-derived' } });
  assert.equal(worldActor._calls.length, 1, 'update() called exactly once, no recovery detour');
  assert.equal(worldActor._calls[0].payload['system.droidCalculationMode'], 'playable-derived');
  assert.equal(result, worldActor);
}

// ── Linked droid token Actor: actorLink true means it shares the base actor's
// real collection (isToken is false for a linked token's represented actor
// in Foundry's model) — same path as the world actor, no redirect. ──
{
  installFoundryShimGlobals();
  const linkedTokenActor = makeActor({ id: 'linked-droid-1', name: 'Linked Token Droid', collection: { name: 'Actors' }, isToken: false });
  await applyActorUpdateAtomic(linkedTokenActor, { system: { droidCalculationMode: 'stock-statblock' } });
  assert.equal(linkedTokenActor._calls.length, 1);
}

// ── Unlinked synthetic droid token Actor: collection === null AND isToken
// === true — this is the exact case the Phase 7 fix protects. Must update
// the synthetic actor directly, never redirect to game.actors.get(id). ──
{
  installFoundryShimGlobals();
  const baseWorldDroid = makeActor({ id: 'shared-droid-id', name: 'Base World Droid', collection: { name: 'Actors' }, isToken: false });
  game.actors.set('shared-droid-id', baseWorldDroid);

  const syntheticTokenActor = makeActor({ id: 'shared-droid-id', name: 'Synthetic Token Droid', collection: null, isToken: true });
  await applyActorUpdateAtomic(syntheticTokenActor, { system: { installedSystems: { darkvision: { id: 'darkvision' } } } });

  assert.equal(syntheticTokenActor._calls.length, 1, 'the synthetic actor itself was updated');
  assert.equal(baseWorldDroid._calls.length, 0, 'the base world actor sharing the same id was NEVER touched — this is exactly the bug the Phase 7 fix closes');
}

// ── A genuinely detached/corrupted actor: collection === null AND isToken
// === false. This is NOT a synthetic token — recovery via game.actors.get()
// is correct here, unlike the synthetic-token case above. ──
{
  installFoundryShimGlobals();
  const recoveredWorldActor = makeActor({ id: 'detached-droid-id', name: 'Recovered Droid', collection: { name: 'Actors' }, isToken: false });
  game.actors.set('detached-droid-id', recoveredWorldActor);

  const detachedActor = makeActor({ id: 'detached-droid-id', name: 'Detached Droid Reference', collection: null, isToken: false });
  await applyActorUpdateAtomic(detachedActor, { system: { droidCalculationMode: 'playable-derived' } });

  assert.equal(detachedActor._calls.length, 0, 'the stale/detached reference itself is never updated');
  assert.equal(recoveredWorldActor._calls.length, 1, 'recovery redirected the update to the real world actor');
}

// ── A detached, non-token actor with no recoverable world actor throws
// rather than silently dropping the mutation. ──
{
  installFoundryShimGlobals();
  const unrecoverable = makeActor({ id: 'ghost-droid-id', name: 'Ghost Droid', collection: null, isToken: false });
  await assert.rejects(
    () => applyActorUpdateAtomic(unrecoverable, { system: { droidCalculationMode: 'playable-derived' } }),
    /synthetic\/unowned and not recoverable/
  );
}

resetFoundryShimGlobals();
console.log('Droid synthetic-token mutation-targeting tests passed.');
