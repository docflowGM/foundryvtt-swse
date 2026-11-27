/**
 * 3N-PRG Stages A-B — Unified progression mannequin (builder + projection facade).
 *
 * One simulated character state: an immutable snapshot of the starting actor plus the current draft selections, rebuilt on every call.
 * The mannequin is the plan the finalizer would apply, applied NON-PERSISTENTLY:
 *   - the plan comes from ProgressionFinalizer.dryRun (the finalizer's own compilation + adapter contribution + validation). When dryRun refuses
 *     a draft that is not finished yet, the same compile step dryRun runs (_compileMutationPlan + adapter contribution) supplies a PROVISIONAL
 *     plan and the readiness error is reported as pending. There is no second plan compiler here.
 *   - the plan is applied with ActorEngine's own bucket stages (plan-stages.js: delete -> set -> update -> add, ActorEngine.applyMutationPlan's
 *     order) through an in-memory gateway that can only write to the mannequin object. ActorEngine itself, Foundry documents, settings, chat,
 *     credits, Force/Destiny Points, receipts and snapshots are never touched.
 *   - the HP recompute that Foundry's hp-recompute hooks trigger after class/level changes is mirrored with the same pure authority
 *     ActorEngine.recomputeHP uses (hp-accounting.js#planHpRecompute).
 *   - mechanics come only from the canonical authorities: DerivedCalculator.computeAll (which delegates to BABCalculator.calculateDetailed,
 *     DefenseCalculator.calculate, combat-stat-rules#computeGrappleBonus and the Damage Threshold pass), hp-accounting, and SecondWindRules
 *     with the same inputs ActorEngine.applySecondWind / resetSecondWind pass it.
 *
 * Isolation: the mannequin has its own id (`prg-mannequin:<actor id>:<token>`), no `_stats`, and computeAll is called with `signature: null`, so
 * it can never read or write the real actor's DerivedCalculator result cache; per-id calculator caches are evicted after the build.
 * Stale previews: every request takes a monotonically increasing token per preview key; a build that finishes after a newer request for the same
 * key returns `{ stale: true }` with no values, so an older async build can never overwrite a newer one.
 * Partial builds: values that depend on an unresolved selection are `null` with a `pending` entry naming the part; nothing is defaulted.
 *
 * Not a rules authority: no formula lives here. Offline-verified only (node harness); nothing here is FOUNDRY_TESTED.
 */
import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { applyDeleteOps, applySetOps, applyUpdateOps, applyAddOps } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/plan-stages.js';
import { validateMutationPlan } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/mutation-plan-helpers.js';
import { getCanonicalAbilityMod } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/canonical-actor-shapes.js';
import { DerivedCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js';
import { applyDerivedSnapshot, ensureDerivedState } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js';
import { planHpRecompute, HP_LEDGER_PATH } from '/systems/foundryvtt-swse/scripts/engine/HP/hp-accounting.js';
import { SecondWindRules } from '/systems/foundryvtt-swse/scripts/engine/combat/SecondWindRules.js';
import { MetaResourceFeatResolver } from '/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { isDroidProgressionActor } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js';

export const MANNEQUIN_ID_PREFIX = 'prg-mannequin';
const PLAN_SOURCE = 'ActorEngine.applyMutationPlan:mannequin';

export class MannequinPersistenceError extends Error {
  constructor(method) {
    super(`Progression mannequin is read-only: ${method}() is not allowed (zero-persistence contract)`);
    this.name = 'MannequinPersistenceError';
    this.method = method;
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Plain-data helpers
// ---------------------------------------------------------------------------------------------------------------------------------------------

function plainClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/** Foundry's flattenObject semantics: nested plain objects become dotted keys; arrays and empty objects stay leaves. */
function flattenUpdate(data, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(data ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value) && Object.keys(value).length > 0) flattenUpdate(value, path, out);
    else out[path] = value;
  }
  return out;
}

/** Document#update leaf write, including the '-=' deletion-key convention. */
function writePath(target, dotPath, value) {
  const parts = String(dotPath).split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (node[part] === null || typeof node[part] !== 'object') node[part] = {};
    node = node[part];
  }
  const last = parts[parts.length - 1];
  if (last.startsWith('-=')) delete node[last.slice(2)];
  else node[last] = plainClone(value);
}

function readPath(source, dotPath) {
  return String(dotPath).split('.').reduce((node, part) => (node == null ? undefined : node[part]), source);
}

function documentList(entries = []) {
  const list = [...entries];
  Object.defineProperty(list, 'get', { value: (id) => list.find(doc => (doc?._id ?? doc?.id) === id) ?? undefined, enumerable: false });
  Object.defineProperty(list, 'contents', { get: () => list, enumerable: false });
  return list;
}

function plainDocument(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject(false) : doc;
  const out = plainClone(raw);
  const id = doc.id ?? doc._id ?? out?._id ?? out?.id ?? null;
  return { ...out, _id: id, id };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Stage A — snapshot, actor views and non-persistent plan application
// ---------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Immutable plain snapshot of the starting actor (deep-frozen). Built once per progression session by a consumer, or per call when absent.
 * Prepared `system` values are kept (DerivedCalculator reads the prepared actor at runtime), including the current `system.derived`.
 */
export function createMannequinSnapshot(actor) {
  if (!actor) throw new Error('createMannequinSnapshot requires an actor');
  const source = typeof actor.toObject === 'function' ? actor.toObject(false) : actor;
  const snapshot = {
    sourceActorId: actor.id ?? actor._id ?? null,
    name: actor.name ?? source?.name ?? '',
    type: actor.type ?? source?.type ?? 'character',
    img: actor.img ?? source?.img ?? null,
    system: plainClone(actor.system ?? source?.system ?? {}),
    flags: plainClone(actor.flags ?? source?.flags ?? {}),
    items: Array.from(actor.items?.contents ?? actor.items ?? []).map(plainDocument).filter(Boolean),
    effects: Array.from(actor.effects?.contents ?? actor.effects ?? []).map(plainDocument).filter(Boolean),
  };
  if (actor.system?.derived && snapshot.system && !snapshot.system.derived) ensureDerivedState(snapshot.system, plainClone(actor.system.derived));
  return deepFreeze(snapshot);
}

/** A mutable, read-only-to-the-world actor-like object built from the snapshot. Every persistence method throws. */
function materializeActorView(snapshot, { id, token = null } = {}) {
  const view = {
    id,
    _id: id,
    name: snapshot.name,
    type: snapshot.type,
    img: snapshot.img,
    system: plainClone(snapshot.system) ?? {},
    flags: plainClone(snapshot.flags) ?? {},
    items: documentList(snapshot.items.map(plainClone)),
    effects: documentList(snapshot.effects.map(plainClone)),
  };
  Object.defineProperties(view, {
    isMannequin: { value: true, enumerable: false },
    prgMannequin: { value: Object.freeze({ sourceActorId: snapshot.sourceActorId, token }), enumerable: false },
    getFlag: { value: (scope, key) => readPath(view.flags?.[scope], key) ?? null, enumerable: false },
    toObject: { value: () => plainClone({ _id: view.id, name: view.name, type: view.type, img: view.img, system: view.system, flags: view.flags, items: view.items, effects: view.effects }), enumerable: false },
  });
  for (const method of ['update', 'delete', 'setFlag', 'unsetFlag', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments', 'toggleStatusEffect', 'updateSource']) {
    Object.defineProperty(view, method, { value: () => { throw new MannequinPersistenceError(method); }, enumerable: false });
  }
  return view;
}

/** Deep merge of plain objects (source wins, arrays replace) — how Foundry fills a new document's system from its type defaults. */
function mergeDefaults(defaults, source) {
  if (!isPlainObject(defaults)) return plainClone(source);
  const out = plainClone(defaults);
  for (const [key, value] of Object.entries(source ?? {})) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? mergeDefaults(out[key], value) : plainClone(value);
  }
  return out;
}

/** The system defaults Foundry applies when it creates an embedded document of `type` (template.json model), when the runtime exposes them. */
function documentTypeDefaults(documentName, type) {
  const model = globalThis.game?.model?.[documentName] ?? globalThis.game?.system?.model?.[documentName] ?? null;
  const defaults = type && model ? model[type] : null;
  return isPlainObject(defaults) ? defaults : null;
}

/**
 * The gateway ActorEngine's plan stages persist through, bound to ONE target object. It never reaches Foundry; it refuses any other actor.
 * Write semantics follow Foundry: flattened leaf writes (nested objects merge, arrays replace, '-=' deletes); created documents get fresh ids
 * and their type's template defaults under the supplied system data.
 */
function createInMemoryGateway(target, idPrefix) {
  let created = 0;
  const assertTarget = (actor) => {
    if (actor !== target) throw new MannequinPersistenceError('gateway write to a non-mannequin actor');
  };
  const listFor = (embeddedName) => (embeddedName === 'ActiveEffect' || embeddedName === 'Effect' ? target.effects : target.items);
  return {
    async updateActor(actor, data = {}) {
      assertTarget(actor);
      for (const [path, value] of Object.entries(flattenUpdate(data))) writePath(actor, path, value);
      return actor;
    },
    async createEmbeddedDocuments(actor, embeddedName, docs = []) {
      assertTarget(actor);
      const list = listFor(embeddedName);
      const isEffect = list === target.effects;
      const out = docs.map((doc) => {
        const copy = plainClone(doc) ?? {};
        const defaults = isEffect ? null : documentTypeDefaults('Item', copy.type);
        if (defaults) copy.system = mergeDefaults(defaults, copy.system ?? {});
        created += 1;
        copy._id = `${idPrefix}-doc-${created}`;
        copy.id = copy._id;
        list.push(copy);
        return copy;
      });
      return out;
    },
    async updateEmbeddedDocuments(actor, embeddedName, updates = []) {
      assertTarget(actor);
      const list = listFor(embeddedName);
      for (const patch of updates) {
        const doc = list.find(entry => (entry?._id ?? entry?.id) === (patch?._id ?? patch?.id));
        if (!doc) continue;
        for (const [path, value] of Object.entries(flattenUpdate(patch))) {
          if (path === '_id' || path === 'id') continue;
          writePath(doc, path, value);
        }
      }
      return list;
    },
    async deleteEmbeddedDocuments(actor, embeddedName, ids = []) {
      assertTarget(actor);
      const list = listFor(embeddedName);
      const remove = new Set(ids);
      for (let i = list.length - 1; i >= 0; i -= 1) {
        if (remove.has(list[i]?._id) || remove.has(list[i]?.id)) list.splice(i, 1);
      }
      return [];
    },
  };
}

/** Same bucket order as ActorEngine.applyMutationPlan (create is world-actor creation and is never simulated here). */
async function applyPlanInMemory(mannequin, plan, gateway) {
  const buckets = { create: plan.create || {}, set: plan.set || {}, update: plan.update || {}, add: plan.add || {}, delete: plan.delete || {} };
  validateMutationPlan(buckets);
  await applyDeleteOps(gateway, mannequin, buckets.delete, PLAN_SOURCE);
  await applySetOps(gateway, mannequin, buckets.set, PLAN_SOURCE);
  await applyUpdateOps(gateway, mannequin, buckets.update, PLAN_SOURCE);
  await applyAddOps(gateway, mannequin, buckets.add, PLAN_SOURCE);
}

/** Mirror of ActorEngine.recomputeHP (fired by the hp-recompute hooks after a progression plan): same planner, same writes, in memory. */
function mirrorHpRecompute(mannequin) {
  const plan = planHpRecompute(mannequin);
  if (plan.action === 'baseline' || plan.action === 'adjust') {
    writePath(mannequin, HP_LEDGER_PATH, plan.ledger);
    if (plan.action === 'adjust') writePath(mannequin, 'system.hp.max', plan.newMax);
  }
  return { action: plan.action, reason: plan.reason, delta: plan.delta };
}

/** The finalizer's plan for this draft: dryRun when the draft is ready; otherwise the same compile step, marked provisional. */
async function compileFinalizerPlan(sessionState, compileView) {
  const state = { ...sessionState, actor: compileView };
  const dry = await ProgressionFinalizer.dryRun(state, compileView);
  if (dry?.success && dry.plan) return { plan: dry.plan, planSource: 'dryRun', readinessError: null, validation: dry.validation ?? null };
  const readinessError = dry?.error || 'dryRun refused the draft';
  try {
    let plan = await ProgressionFinalizer._compileMutationPlan(state, compileView);
    const adapter = state.progressionSession?.subtypeAdapter;
    if (adapter?.contributeMutationPlan) plan = await adapter.contributeMutationPlan(plan, state.progressionSession, compileView);
    return { plan, planSource: 'partial-compile', readinessError, validation: null };
  } catch (error) {
    return { plan: null, planSource: 'unavailable', readinessError, compileError: error?.message || String(error), validation: null };
  }
}

let _buildSequence = 0;

/**
 * Stage A: build the mannequin (actor-like `{ id, type, system, items, effects, flags }`) for the current draft.
 * @param {Actor|object} actor   the progression actor (never written)
 * @param {object} sessionState  `{ mode, actor, progressionSession: { draftSelections, ... }, sessionId }` (never written)
 * @param {object} [options]     `{ snapshot }` a snapshot from createMannequinSnapshot (preferred: the session's immutable starting state); `{ token }`
 * @returns {Promise<{ok, mannequin, plan, planSource, readinessError, hpRecompute, token, mannequinId}>}
 */
export async function buildMannequin(actor, sessionState, options = {}) {
  const snapshot = options.snapshot ?? createMannequinSnapshot(actor);
  const token = options.token ?? ++_buildSequence;
  const mannequinId = `${MANNEQUIN_ID_PREFIX}:${snapshot.sourceActorId ?? 'draft'}:${token}`;
  // The compile view keeps the real id so plan item ids / metadata line up with the actor; it has no _stats, so no cache signature.
  const compileView = materializeActorView(snapshot, { id: snapshot.sourceActorId, token });
  const compiled = await compileFinalizerPlan(sessionState ?? {}, compileView);
  if (!compiled.plan) {
    return { ok: false, mannequin: null, plan: null, planSource: compiled.planSource, readinessError: compiled.readinessError, compileError: compiled.compileError, token, mannequinId, snapshot };
  }
  const mannequin = materializeActorView(snapshot, { id: mannequinId, token });
  const gateway = createInMemoryGateway(mannequin, mannequinId);
  await applyPlanInMemory(mannequin, compiled.plan, gateway);
  const hpRecompute = mirrorHpRecompute(mannequin);
  return { ok: true, mannequin, plan: compiled.plan, planSource: compiled.planSource, readinessError: compiled.readinessError, hpRecompute, token, mannequinId, snapshot };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Stage B — projection through the canonical authorities
// ---------------------------------------------------------------------------------------------------------------------------------------------

const ALL_OUTPUTS = ['bab', 'defenses', 'damageThreshold', 'grapple', 'maxHp', 'secondWind'];

/** Which projected values depend on a selection that is not resolved yet. Dependency facts only; no rule is decided here. */
function collectPending({ mode, selections, plan, readinessError, isDroid, compileError }) {
  const pending = [];
  if (compileError) pending.push({ part: 'plan', reason: `the finalizer could not compile this draft: ${compileError}`, affects: ALL_OUTPUTS });
  if (!selections.class) pending.push({ part: 'class', reason: 'no class selected', affects: ALL_OUTPUTS });
  if (mode === 'chargen') {
    const hasAttributes = !!(selections.attributes && Object.keys(selections.attributes).length);
    if (!hasAttributes) pending.push({ part: 'attributes', reason: 'ability scores not chosen', affects: ['defenses', 'damageThreshold', 'grapple', 'maxHp', 'secondWind'] });
    if (!isDroid && !selections.species && !selections.pendingSpeciesContext) {
      pending.push({ part: 'species', reason: 'species not chosen (species ability modifiers unresolved)', affects: ['defenses', 'damageThreshold', 'grapple', 'maxHp', 'secondWind'] });
    }
  }
  if (mode === 'levelup' && plan?.set) {
    const manifest = plan.set['flags.swse.levelUpEntitlementManifest'] || null;
    const writesAbility = Object.keys(plan.set).some(key => /^system\.attributes\.[a-z]{3}\.base$/.test(key));
    if (manifest?.abilityIncreases?.required === true && !writesAbility) {
      pending.push({ part: 'abilityIncreases', reason: 'this level grants ability increases that are not allocated', affects: ['defenses', 'damageThreshold', 'grapple', 'maxHp', 'secondWind'] });
    }
    if (selections.class && !Object.prototype.hasOwnProperty.call(plan.set, 'system.hp.max')) {
      pending.push({ part: 'hpGain', reason: 'the level-up HP gain is not resolved, so the plan carries no new maximum', affects: ['maxHp', 'secondWind'] });
    }
  }
  // The finalizer would refuse this draft as it stands: every value is computed from a provisional plan.
  if (readinessError) pending.push({ part: 'readiness', reason: readinessError, affects: [], provisionalFor: ALL_OUTPUTS });
  return pending;
}

/** 'pending' (value withheld), 'provisional' (computed, but an input is not final) or 'projected'. */
function statusMap(pending, ok) {
  const blocked = new Set(pending.flatMap(entry => entry.affects || []));
  const provisional = new Set(pending.flatMap(entry => entry.provisionalFor || []));
  return Object.fromEntries(ALL_OUTPUTS.map(key => [key, (!ok || blocked.has(key)) ? 'pending' : (provisional.has(key) ? 'provisional' : 'projected')]));
}

function finiteOrNull(value) {
  const number = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(number) ? null : number;
}

/** Second Wind with the same inputs ActorEngine.applySecondWind (healing) and resetSecondWind (max uses) pass to SecondWindRules. */
function projectSecondWind(mannequin, pending) {
  const featRules = MetaResourceFeatResolver.getSecondWindRules(mannequin);
  const hasToughAsNails = mannequin.items?.some(i => i.type === 'talent' && i.name === 'Tough as Nails') === true;
  const isDroidActor = mannequin.type === 'droid' || mannequin.system?.isDroid === true;
  const maxHP = Number(mannequin.system?.hp?.max ?? 0) || 0;
  const conScore = isDroidActor ? 0 : Number(mannequin.system?.derived?.attributes?.con?.total ?? mannequin.system?.attributes?.con?.base ?? 10);
  const conMod = isDroidActor ? 0 : getCanonicalAbilityMod(mannequin, 'con');
  const fortClassBonus = Number(mannequin.system?.defenses?.fortitude?.classBonus ?? 0);
  if (HouseRuleService.isEnabled('secondWindWebEnhancement')) {
    pending.push({ part: 'secondWind.maxUses', reason: 'the secondWindWebEnhancement house rule reads stored system.defenses.fortitude.classBonus, which no progression plan writes', affects: [], provisionalFor: ['secondWind'] });
  }
  if (Number(mannequin.system?.derived?.heroicLevel ?? 0) <= 0) {
    pending.push({ part: 'secondWind.eligibility', reason: 'Second Wind eligibility for a character with no heroic level is DEFERRED_RULES_REVIEW (DC-A03); eligibility is not projected', affects: [], provisionalFor: ['secondWind'] });
  }
  return {
    healing: SecondWindRules.calculateHealingAmount(maxHP, conScore) + Number(featRules.extraHealing || 0),
    maxUses: SecondWindRules.calculateMaxUses(conMod, fortClassBonus, featRules, hasToughAsNails),
  };
}

/**
 * Stage B: derive the mannequin's mechanics through the canonical authorities. Read-only: DerivedCalculator.computeAll is called with
 * `signature: null` (no cache read or write) and its result is applied to the MANNEQUIN's own `system.derived`.
 */
export async function projectMannequin(build, sessionState = {}) {
  const selections = sessionState?.progressionSession?.draftSelections || {};
  const mode = sessionState?.mode;
  const isDroid = isDroidProgressionActor(build?.mannequin ?? build?.snapshot ?? null, {
    subtype: sessionState?.progressionSession?.subtype,
    droidContext: sessionState?.progressionSession?.droidContext,
    droid: selections.droid,
  });
  const ok = !!(build?.ok && build.mannequin);
  const pending = collectPending({ mode, selections, plan: build?.plan, readinessError: build?.readinessError, isDroid, compileError: ok ? null : (build?.compileError || 'no plan') });
  const result = {
    mannequinId: build?.mannequinId ?? null,
    planSource: build?.planSource ?? 'unavailable',
    complete: false,
    bab: null, babProvenance: null, defenses: null, damageThreshold: null, grapple: null, maxHp: null, currentHp: null, secondWind: null,
    status: statusMap(pending, ok),
    pending,
  };
  if (!ok) return result;

  const mannequin = build.mannequin;
  try {
    const updates = await DerivedCalculator.computeAll(mannequin, { signature: null });
    applyDerivedSnapshot(ensureDerivedState(mannequin.system), updates);
  } finally {
    DerivedCalculator.clearCaches(mannequin.id);
  }
  const derived = mannequin.system.derived || {};
  const total = (defense) => finiteOrNull(derived.defenses?.[defense]?.total);
  const secondWind = projectSecondWind(mannequin, pending);
  result.status = statusMap(pending, ok);
  const pick = (key, value) => (result.status[key] === 'pending' ? null : value);
  result.bab = pick('bab', finiteOrNull(derived.bab));
  result.babProvenance = result.bab === null ? null : (derived.babProvenance ?? null);
  result.defenses = pick('defenses', { fortitude: total('fortitude'), reflex: total('reflex'), will: total('will'), flatFooted: total('flatFooted') });
  result.damageThreshold = pick('damageThreshold', finiteOrNull(derived.damageThreshold));
  result.grapple = pick('grapple', finiteOrNull(derived.grappleBonus));
  result.maxHp = pick('maxHp', finiteOrNull(mannequin.system?.hp?.max));
  result.currentHp = result.maxHp === null ? null : finiteOrNull(mannequin.system?.hp?.value);
  result.secondWind = pick('secondWind', secondWind);
  result.complete = build.planSource === 'dryRun' && ALL_OUTPUTS.every(key => result.status[key] === 'projected');
  return result;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Facade with stale-preview protection
// ---------------------------------------------------------------------------------------------------------------------------------------------

const _latestPreviewToken = new Map();
let _previewSequence = 0;

/** True while `token` is the newest request for `previewKey`. */
export function isMannequinPreviewCurrent(previewKey, token) {
  return _latestPreviewToken.get(previewKey) === token;
}

/**
 * Projection facade: `{ bab, babProvenance, defenses, damageThreshold, grapple, maxHp, currentHp, secondWind, status, pending[], complete }`.
 * A build superseded by a newer request for the same preview key resolves to `{ stale: true, token, previewKey }` and carries no values.
 * @param {object} [options] `{ previewKey }` (default: the actor id), `{ snapshot }` the session's immutable starting snapshot
 */
export async function getMannequinProjection(actor, sessionState, options = {}) {
  const previewKey = options.previewKey ?? `${actor?.id ?? options.snapshot?.sourceActorId ?? 'draft'}`;
  const token = ++_previewSequence;
  if (_latestPreviewToken.size > 64) _latestPreviewToken.clear(); // bounded: more than 64 distinct preview keys resets (an older in-flight build then reads as stale, never as current)
  _latestPreviewToken.set(previewKey, token);
  const build = await buildMannequin(actor, sessionState, { snapshot: options.snapshot, token });
  if (!isMannequinPreviewCurrent(previewKey, token)) return { stale: true, token, previewKey };
  const projection = await projectMannequin(build, sessionState);
  if (!isMannequinPreviewCurrent(previewKey, token)) return { stale: true, token, previewKey };
  return { stale: false, token, previewKey, ...projection };
}
