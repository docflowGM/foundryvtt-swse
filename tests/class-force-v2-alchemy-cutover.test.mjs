// Class/Force x Force V2, Decision A: Force Alchemy pays its Force Point cost through the V2 spend and rolls back exactly.
// Former behavior: wrote system.forcePoints.value directly and on failure restored the OLD whole balance (erasing unrelated
// regains). Credits / Dark Side cost handling is unchanged (credits -> TransactionEngine is a documented follow-up). Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.foundry.utils.randomID = (() => { let k = 0; return () => `alc-${++k}`; })();
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'u1', isGM: false }, combat: null, time: { worldTime: 0 } });

const { applyForceAlchemySelection } = await import('/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-mechanics-service.js');
const { ForceAlchemyStateService } = await import('/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-state-service.js');

const writer = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
let effectMode = 'ok';
ActorEngine.createActiveEffects = async (actor) => {
  if (effectMode === 'fail') { actor.system.forcePoints.value += 1; throw new Error('effect creation failed'); } // unrelated regain mid-flight
  return [{ id: 'fx1' }];
};
ActorEngine.deleteActiveEffects = async () => {};
ForceAlchemyStateService.recordSelection = async () => ({ entry: { id: 'e1', config: {} } });
ForceAlchemyStateService.updateSlot = async () => ({});
ForceAlchemyStateService.clearSlot = async () => {};

const mk = (fp = 3) => ({ id: 'alc', name: 'Alchemist', type: 'character',
  system: { forcePoints: { value: fp, max: 5 }, credits: 1000, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 5 } },
  flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } }, getFlag(s, n) { return this.flags?.[s]?.[n]; }, items: [] });
const detail = (over = {}) => ({ ready: true, rite: { id: 'rapid-alchemy', name: 'Rapid Alchemy', timing: 'encounter', stateKey: 'encounter', fpCost: 1, dspCost: 0, creditCost: 0, mechanical: true }, selectedTarget: { name: 'T' }, selectedConfig: {}, ...over });
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
try {
  { const a = mk(); let r, err; try { r = await applyForceAlchemySelection(a, detail()); } catch (e) { err = e; }
    assert.ok(err, 'a non-GM uncontracted Force Point cost is denied'); assert.match(err.message, /FP-RD-003|GM adjudication|certified/);
    assert.equal(a.system.forcePoints.value, 3); assert.deepEqual(ledger(a), []); ok('denied spend: rite not applied, nothing charged'); }
  globalThis.game.user.isGM = true;
  { const a = mk(); const r = await applyForceAlchemySelection(a, detail({ gmAdjudication: { reason: 'GM allows the rite' } }));
    assert.equal(r.mode, 'applied'); assert.equal(a.system.forcePoints.value, 2);
    assert.equal(ledger(a).length, 1); assert.equal(ledger(a)[0].state, 'finalized'); assert.equal(ledger(a)[0].abilitySourceRef, 'force-alchemy:rapid-alchemy'); ok('adjudicated rite: one finalized receipt after the effect exists'); }
  { const a = mk(3); effectMode = 'fail'; let err; try { await applyForceAlchemySelection(a, detail({ gmAdjudication: { reason: 'adjudicated' } })); } catch (e) { err = e; } effectMode = 'ok';
    assert.ok(err); assert.equal(ledger(a)[0].state, 'rolled-back');
    assert.equal(a.system.forcePoints.value, 4, 'start 3, paid 1 (=2), unrelated regain +1 (=3), exact rollback +1 (=4); the old snapshot restore would have given 3'); ok('rite fails: exactly that receipt is compensated; an unrelated regain survives'); }
  { const src = readFileSync(new URL('../scripts/apps/force-alchemy/force-alchemy-mechanics-service.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /'system\.forcePoints\.value'\s*\]?\s*=/); assert.doesNotMatch(src, /updates\['system\.forcePoints\.value'\]/);
    ok('structural: no direct Force Point balance write remains in the alchemy service'); }
} finally { restore(); }
console.log(`class-force-v2-alchemy-cutover: ${n} checks passed`);
