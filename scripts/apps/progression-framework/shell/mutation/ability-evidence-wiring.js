/**
 * Production wiring for the ability-acknowledgment service (Checkpoint E).
 *
 * The service owns no rules; this module supplies the canonical authorities and FAILS CLOSED: if any of them cannot be obtained,
 * `buildAbilityEvidenceDeps` returns `{ ok:false }` and nothing is written. Authorities used (no parallel logic):
 *   - mutation:    ActorEngine.updateActor
 *   - entitlement: ProgressionFinalizer._abilityEntitlementCheck (count / existence / rules-deferred)
 *   - house rule:  ProgressionRules.getAbilityIncreaseAllocationMode
 *   - permission:  user.isGM or actor.canUserModify(user, 'update')
 * Imports are lazy so reading this module never pulls the finalizer into unrelated code.
 */
import { AbilityAcknowledgmentService } from './ability-acknowledgment-service.js';

const BASE = '/systems/foundryvtt-swse/scripts';

export function acknowledgmentCanModify(actor, user) {
  if (!user?.id) return false;
  if (user.isGM === true) return true;
  return typeof actor?.canUserModify === 'function' ? actor.canUserModify(user, 'update') === true : false;
}

/** @param {{loaders?:object}} [opts] loaders: test seam for the lazy imports */
export async function buildAbilityEvidenceDeps(actor, { user = globalThis.game?.user, loaders = {} } = {}) {
  try {
    const load = {
      engine: loaders.engine || (async () => (await import(`${BASE}/governance/actor-engine/actor-engine.js`)).ActorEngine),
      finalizer: loaders.finalizer || (async () => (await import(`${BASE}/apps/progression-framework/shell/progression-finalizer.js`)).ProgressionFinalizer),
      rules: loaders.rules || (async () => (await import(`${BASE}/engine/progression/ProgressionRules.js`)).ProgressionRules),
    };
    const [engine, finalizer, rules] = await Promise.all([load.engine(), load.finalizer(), load.rules()]);
    if (!user?.id) return { ok: false, code: 'NO_ACTIVE_USER', message: 'No active user is identified; nothing was changed.' };
    if (typeof engine?.updateActor !== 'function') return { ok: false, code: 'ENGINE_UNAVAILABLE', message: 'ActorEngine is unavailable; nothing was changed.' };
    if (typeof finalizer?._abilityEntitlementCheck !== 'function') return { ok: false, code: 'ENTITLEMENT_UNVALIDATED', message: 'The entitlement authority is unavailable; nothing was changed.' };
    if (typeof rules?.getAbilityIncreaseAllocationMode !== 'function') return { ok: false, code: 'ALLOCATION_RULE_UNKNOWN', message: 'The allocation rule is unavailable; nothing was changed.' };
    return {
      ok: true, user,
      deps: {
        engine,
        entitlementCheck: (level) => finalizer._abilityEntitlementCheck(actor, level, null),
        getAllocationMode: () => rules.getAbilityIncreaseAllocationMode(),
        canModify: acknowledgmentCanModify,
      },
    };
  } catch (err) {
    return { ok: false, code: 'DEPENDENCIES_UNAVAILABLE', message: `Acknowledgment is unavailable (${err?.message || 'dependency error'}); nothing was changed.` };
  }
}

/**
 * Run one acknowledgment operation with production dependencies. Always returns a service-shaped result
 * ({status, code, message, record}); never throws for an expected refusal.
 * @param {'acknowledge'|'correct'|'supersede'|'withdraw'} op
 */
export async function runAbilityEvidenceOperation(actor, op, args = {}, opts = {}) {
  if (!['acknowledge', 'correct', 'supersede', 'withdraw'].includes(op)) return { status: 'refused', code: 'UNKNOWN_OPERATION', message: 'Unknown operation; nothing was changed.' };
  const wired = await buildAbilityEvidenceDeps(actor, opts);
  if (!wired.ok) return { status: 'refused', code: wired.code, message: wired.message };
  const service = opts.service || AbilityAcknowledgmentService;
  return service[op](actor, { ...args, user: wired.user, deps: wired.deps });
}

export default { buildAbilityEvidenceDeps, runAbilityEvidenceOperation, acknowledgmentCanModify };
