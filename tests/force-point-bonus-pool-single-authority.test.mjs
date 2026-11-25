import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods } from './helpers/real-force-point-engine.mjs';

// Findings F-TAL-007 / F-FRC-003 (V2 realignment Phase 3B): the bonus Force Point pool lived in TWO flag scopes.
// Guardian Spirit and the sheet's manual "adjust bonus Force Points" wrote `flags['foundryvtt-swse'].bonusForcePoints`
// (via setFlag('swse'), which SWSEActorBase / the Document compatibility bridge redirect to the canonical scope), while
// ActorEngine.spendForcePoints and every other producer wrote the literal legacy path `flags.swse.bonusForcePoints`.
// Reads (getFlag('swse', ...)) prefer the canonical copy, so after any canonical write every later debit landed where
// nothing read it and the same bonus point could be spent again.
//
// This test runs the REAL GuardianSpiritActions and the REAL ActorEngine.spendForcePoints against an in-memory actor that
// reproduces the production flag semantics (canonical-first getFlag, 'swse' setFlag redirected to canonical).

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
// Applies a flat update (including `a.b.-=key` deletion keys) to the in-memory actor, like Document.update would.
function applyUpdate(actor, update) {
  for (const [path, value] of Object.entries(update)) {
    const parts = path.split('.');
    let node = actor;
    for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
    const leaf = parts.at(-1);
    if (leaf.startsWith('-=')) delete node[leaf.slice(2)];
    else node[leaf] = clone(value);
  }
}
const CANON = 'foundryvtt-swse';
function makeActor(legacyPool, extraFlags = {}) {
  const actor = {
    id: 'a1', name: 'Tester', type: 'character',
    flags: { swse: { ...(legacyPool ? { bonusForcePoints: clone(legacyPool) } : {}), ...extraFlags } },
    items: [], effects: [],
    system: { forcePoints: { value: 3, max: 5 }, level: { heroic: 4 }, attributes: {} },
    // Production flag semantics (scripts/actors/base/swse-actor-base.js:446-466 and scripts/utils/flags/swse-flags.js):
    getFlag(scope, key) {
      if (scope === 'swse') {
        const canonical = this.flags?.[CANON]?.[key];
        if (canonical !== undefined) return canonical;
        return this.flags?.swse?.[key];
      }
      return this.flags?.[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      const s = scope === 'swse' ? CANON : scope;
      (this.flags[s] ??= {})[key] = clone(value);
      return this;
    },
    async unsetFlag(scope, key) {
      const s = scope === 'swse' ? CANON : scope;
      delete this.flags?.[s]?.[key];
      return this;
    },
  };
  return actor;
}

const { fake: ActorEngine, restore } = await graftRealForcePointMethods(async (actor, update) => { applyUpdate(actor, update); return actor; });
const { GuardianSpiritActions } = await import('/systems/foundryvtt-swse/scripts/engine/talent/guardian-spirit-actions.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const unrestricted = (id, value) => ({ id, source: 'Force Flow', value, max: value, restrictions: '', expires: '', encounterId: null, createdAt: 1 });
const poolOf = (value, entries) => ({ value, max: value, sources: [...new Set(entries.map(e => e.source))], entries, note: '' });
const spendCtx = { useKind: 'roll-bonus', rollDomain: 'attack.melee' };
let rid = 0;
const spend = (actor) => ActorEngine.spendForcePoints(actor, 1, { ...spendCtx, requestId: `req-${++rid}` });
const remainingBonus = (actor) => GuardianSpiritActions.getBonusForcePoints(actor).value;
const copies = (actor) => ({ canonical: actor.flags?.[CANON]?.bonusForcePoints, legacy: actor.flags?.swse?.bonusForcePoints });

try {
  // 1. REPRODUCTION (the defect): one unrestricted bonus point; a manual adjustment (or Guardian claim) creates the
  //    canonical copy; spending the unrestricted point must consume it exactly once.
  {
    const actor = makeActor(poolOf(1, [unrestricted('flow-1', 1)]));
    await GuardianSpiritActions.adjustBonusForcePoints(actor, 1, 'Manual');           // sheet button; writes the pool
    assert.equal(remainingBonus(actor), 2, 'the manual point was added to the existing pool');
    const first = await spend(actor);
    assert.equal(first.bonusSpent, 1, 'first spend consumes one unrestricted bonus point');
    assert.equal(remainingBonus(actor), 1, 'one point left after the first spend (manual entry is restricted)');
    const entriesAfterFirst = GuardianSpiritActions.getBonusForcePoints(actor).entries.map(e => e.id);
    assert.ok(!entriesAfterFirst.includes('flow-1'), 'the spent unrestricted entry is gone from the pool every reader sees');
    // The unrestricted point is gone. A second spend must draw the NORMAL pool, never the spent bonus entry again.
    const second = await spend(actor);
    assert.equal(second.bonusSpent, 0, 'the spent bonus point cannot be spent a second time');
    assert.equal(second.normalSpent, 1, 'the second spend falls through to a normal Force Point');
    ok('repeated spend of one unrestricted bonus point is impossible after a manual/Guardian pool write');
  }

  // 2. Exactly one stored copy after any governed write; no shadow remains.
  {
    const actor = makeActor(poolOf(1, [unrestricted('flow-1', 1)]));
    await GuardianSpiritActions.claimGuardianBonusForcePoint(actor).catch(() => null); // may warn without the talent
    actor.items = [{ id: 't1', type: 'talent', name: 'Guardian Spirit', flags: {}, system: {} }];
    await GuardianSpiritActions.claimGuardianBonusForcePoint(actor);
    let c = copies(actor);
    assert.ok(c.legacy && !c.canonical, 'after a Guardian Spirit write the pool lives only in the single governed location');
    await spend(actor);
    c = copies(actor);
    assert.ok(c.legacy && !c.canonical, 'after a spend the pool still lives only in the single governed location');
    ok('exactly one stored copy of the pool after Guardian write and after spend');
  }

  // 3. Historical divergent saved data: both scopes populated (the state the old code produced).
  //    No balance may be discarded and no value may exceed what either stored copy says.
  {
    const canonical = poolOf(2, [unrestricted('a', 1), { ...unrestricted('g', 1), source: 'Guardian Spirit', restrictions: 'Guardian only' }]);
    const legacy = poolOf(1, [{ ...unrestricted('g', 1), source: 'Guardian Spirit', restrictions: 'Guardian only' }, unrestricted('f', 1)]);
    const actor = makeActor(legacy);
    actor.flags[CANON] = { bonusForcePoints: clone(canonical) };
    const merged = GuardianSpiritActions.getBonusForcePoints(actor);
    const ids = merged.entries.map(e => e.id).sort();
    assert.deepEqual(ids, ['a', 'f', 'g'], 'union of both copies: no balance discarded');
    assert.ok(merged.entries.every(e => e.value <= 1), 'no entry exceeds the value either copy recorded');
    const out = await spend(actor);
    assert.equal(out.bonusSpent, 1, 'one unrestricted point was spent');
    const c = copies(actor);
    assert.ok(c.legacy && !c.canonical, 'the divergent state is healed into one copy by the governed write');
    const after = GuardianSpiritActions.getBonusForcePoints(actor);
    assert.equal(after.entries.filter(e => !e.restrictions).length, 1, 'exactly one unrestricted point remains of the two that were stored');
    ok('historical divergent data is merged without discarding balances and healed on the next governed write');
  }

  // 4. The common case is unchanged: a single legacy copy behaves exactly as before.
  {
    const actor = makeActor(poolOf(2, [unrestricted('x', 2)]));
    assert.equal(remainingBonus(actor), 2);
    const out = await spend(actor);
    assert.equal(out.bonusSpent, 1);
    assert.equal(remainingBonus(actor), 1);
    const out2 = await spend(actor);
    assert.equal(out2.bonusSpent, 1);
    assert.equal(remainingBonus(actor), 0);
    const out3 = await spend(actor);
    assert.equal(out3.bonusSpent, 0, 'an empty bonus pool is not spendable');
    ok('single-copy pools behave as before and cannot be overspent');
  }
} finally {
  restore();
}
console.log('force-point-bonus-pool-single-authority: ok');
