// Slice 6T disposition: WatchCircle Initiate subtracts a NORMAL Force Point and, per the canonical talent text, "does not count as
// spending a Force Point". So it is a documented exemption from the V2 spend path (no receipt, no round-cap count, no Temptation
// trigger) and must never touch temporary/bonus points. Offline; not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'u1', isGM: false }, combat: null });

const mod = await import('/systems/foundryvtt-swse/scripts/engine/talent/consular-talent-actions.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const Cls = mod.ConsularTalentActions ?? Object.values(mod).find((v) => typeof v === 'function' && v._spendNormalForcePoint);
assert.ok(Cls?._spendNormalForcePoint, 'class under test found');

const calls = [];
const saved = { updateActor: ActorEngine.updateActor, spendForcePoints: ActorEngine.spendForcePoints };
ActorEngine.updateActor = async (actor, update) => { calls.push(['updateActor', update]); for (const [p, v] of Object.entries(update)) { const k = p.split('.'); let o = actor; for (const x of k.slice(0, -1)) o = o[x]; o[k.at(-1)] = v; } return actor; };
ActorEngine.spendForcePoints = async () => { calls.push(['spendForcePoints']); throw new Error('must not be called'); };
const mk = (fp, bonus = 3) => ({ id: 'w', name: 'W', system: { forcePoints: { value: fp, max: 5 } }, flags: { swse: { bonusForcePoints: { value: bonus, entries: [{ id: 'b', value: bonus }] } } } });
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
try {
  { const a = mk(3); const r = await Cls._spendNormalForcePoint(a);
    assert.equal(r.spent, 1); assert.equal(a.system.forcePoints.value, 2);
    assert.equal(a.flags.swse.bonusForcePoints.value, 3, 'temporary/bonus points are never touched');
    assert.ok(!calls.some((c) => c[0] === 'spendForcePoints'), 'no V2 spend (printed: does not count as spending a Force Point)');
    assert.equal(a.flags.swse.forcePointLedger, undefined, 'no V2 receipt, so no round-cap count and no Temptation trigger');
    ok('subtracts exactly one NORMAL point, ignores bonus points, creates no V2 receipt'); }
  { const a = mk(0, 4); await assert.rejects(() => Cls._spendNormalForcePoint(a), /normal Force Point/); assert.equal(a.flags.swse.bonusForcePoints.value, 4); ok('with no normal point it refuses even when temporary points exist'); }
  // transfer reconciliation with injected failures (the ally write can fail before applying, or apply and then throw)
  const mkA = (id, fp) => ({ ...mk(fp), id, name: id });
  const injectOnAlly = (mode) => { ActorEngine.updateActor = async (actor, update) => {
    if (actor.id === 'ally' && mode !== 'ok') { if (mode === 'throw-after-apply') { for (const [p, v] of Object.entries(update)) { const k = p.split('.'); let o = actor; for (const x of k.slice(0, -1)) o = o[x]; o[k.at(-1)] = v; } } throw new Error('ally write failed'); }
    for (const [p, v] of Object.entries(update)) { const k = p.split('.'); let o = actor; for (const x of k.slice(0, -1)) o = o[x]; o[k.at(-1)] = v; } return actor; }; };
  { const a = mkA('src', 3), al = mkA('ally', 1); injectOnAlly('ok'); const r = await Cls._transferWatchCircleForcePoint(a, al);
    assert.equal(a.system.forcePoints.value, 2); assert.equal(al.system.forcePoints.value, 2); assert.equal(r.granted, 1); ok('success: exactly one point leaves and exactly one arrives'); }
  { const a = mkA('src', 3), al = mkA('ally', 1); injectOnAlly('throw-before-apply');
    await assert.rejects(() => Cls._transferWatchCircleForcePoint(a, al), /ally write failed/);
    assert.equal(a.system.forcePoints.value, 3, 'ally gain never landed: the actor point is returned'); assert.equal(al.system.forcePoints.value, 1); ok('ally write fails before applying: exact return, no loss'); }
  { const a = mkA('src', 3), al = mkA('ally', 1); injectOnAlly('throw-after-apply'); const r = await Cls._transferWatchCircleForcePoint(a, al);
    assert.equal(a.system.forcePoints.value, 2, 'transfer stands: NOT restored'); assert.equal(al.system.forcePoints.value, 2, 'no duplicate gain'); assert.equal(r.acknowledgementLost, true); ok('ally write applied but acknowledgement lost: transfer stands, no duplication'); }
  { const a = mkA('src', 0), al = mkA('ally', 1); injectOnAlly('ok'); await assert.rejects(() => Cls._transferWatchCircleForcePoint(a, al), /normal Force Point/); assert.equal(al.system.forcePoints.value, 1); ok('no normal point: nothing moves'); }
  { const a = mkA('src', 3); injectOnAlly('ok'); assert.equal(await Cls._transferWatchCircleForcePoint(a, null), null); assert.equal(a.system.forcePoints.value, 2); ok('no ally document: only the subtraction; the GM applies the gain (stated on the card)'); }
  { const src = readFileSync(new URL('../scripts/engine/talent/consular-talent-actions.js', import.meta.url), 'utf8');
    const i = src.indexOf('static async promptWatchCircleInitiate'); const body = src.slice(i, src.indexOf('static async promptAcrobaticRecovery', i));
    assert.ok(body.indexOf('showRollModifiersDialog') < body.indexOf('_spendReadyFarseeing'), 'Farseeing is consumed only after the roll dialog is confirmed'); ok('cancelling the roll dialog no longer consumes Farseeing'); }
} finally { Object.assign(ActorEngine, saved); }
console.log(`class-force-v2-watchcircle-exemption: ${n} checks passed`);
