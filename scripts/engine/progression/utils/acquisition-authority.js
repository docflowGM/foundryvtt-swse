/**
 * Acquisition authority - ONE advisory check for interactive feat/talent acquisition (drag-and-drop
 * today). Product decision (Phase 6): the progression engine is a convenience, not a requirement.
 * Players may build entirely by hand; reconciliation helps, it does not police.
 *
 *   DEFAULT (advisory): every acquisition is ALLOWED. Proven problems (unmet prerequisites, no open
 *   entitlement) are returned as `advisories` for a non-blocking notice, and the item is stamped as a
 *   manual acquisition. Missing provenance alone is never a problem.
 *
 *   STRICT (opt-in extension point for a GM-controlled campaign rule): the previous behavior - a player
 *   is refused on a PROVEN problem and a GM is offered the explicit GM-grant dialog. Nothing enables it
 *   by default; `getAcquisitionMode()` is the single seam a future world setting would drive.
 *
 * The check owns no rules: prerequisites -> AbilityEngine.evaluateAcquisition; entitlement -> the
 * reconciliation report; evidence -> progression-evidence.js. A slot context is stamped only when the
 * only open slots are general-kind (class-list / tree eligibility is not decided here).
 */
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { ProgressionReconciler } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js';
import { auditTransactionMaterialization } from './levelup-finalization-audit.js';
import { buildProgressionCertification, persistCertification } from './progression-evidence.js';

const GATED_TYPES = Object.freeze(['feat', 'talent']);

export function isGatedAcquisitionType(type) {
  return GATED_TYPES.includes(type);
}

function slotsFor(report, itemType) {
  const s = report?.slots || {};
  return itemType === 'feat'
    ? { classKind: s.classFeats || [], generalKind: s.generalFeats || [], unattributed: Number(report?.classification?.unclassifiedFeatCount || 0) }
    : { classKind: s.classTalents || [], generalKind: s.heroicTalents || [], unattributed: Number(report?.classification?.unclassifiedTalentCount || 0) };
}

/** Entitlement availability from the reconciliation report. Pure. */
export function assessEntitlement(report, itemType) {
  if (!report || report.rollup?.gmDiagnostic === true || report.status === 'engine-failure') {
    return { status: 'unverifiable', reason: 'validation-unavailable', slot: null };
  }
  const { classKind, generalKind, unattributed } = slotsFor(report, itemType);
  const all = [...classKind, ...generalKind];
  const open = all.filter(slot => slot?.status === 'open');
  if (open.length) {
    const onlyGeneral = open.every(slot => generalKind.includes(slot));
    const first = onlyGeneral ? [...open].sort((a, b) => (a.characterLevel || 0) - (b.characterLevel || 0))[0] : null;
    return {
      status: 'open-slot',
      reason: onlyGeneral ? 'general-slot-open' : 'class-slot-open-eligibility-not-decided',
      slot: first ? { slotType: 'general', slotId: first.id, characterLevel: Number(first.characterLevel || 0) || 0 } : null,
    };
  }
  const undecided = all.some(slot => slot?.status === 'unverifiable') || unattributed > 0;
  if (undecided) return { status: 'unverifiable', reason: 'history-incomplete', slot: null };
  if (!all.length) return { status: 'unverifiable', reason: 'no-slots-derived', slot: null };
  return { status: 'no-open-entitlement', reason: 'all-entitlements-satisfied', slot: null };
}

/** Prerequisites via the existing authority. Blocks only when demonstrably unmet. */
export function assessPrerequisites(actor, item) {
  let assessment;
  try {
    assessment = AbilityEngine.evaluateAcquisition(actor, item);
  } catch (err) {
    return { status: 'unverifiable', missing: [], reason: `evaluator-error: ${err?.message || err}` };
  }
  const missing = Array.isArray(assessment?.missingPrereqs) ? assessment.missingPrereqs.filter(Boolean) : [];
  const unresolved = Array.isArray(assessment?.unresolved) ? assessment.unresolved.filter(Boolean) : [];
  if (assessment?.legal === true) return { status: 'met', missing: [], reason: '' };
  if (missing.length && !unresolved.length) return { status: 'unmet', missing, reason: missing.join('; ') };
  return { status: 'unverifiable', missing, reason: unresolved.length ? 'unresolved-prerequisite-terms' : 'no-verdict' };
}

/**
 * @returns {{decision:'allow'|'block'|'needs-gm', reasons:string[], prerequisites:object, entitlement:object, acquisition:object|null}}
 */
/** Single seam for a future GM-controlled strict mode. Advisory unless explicitly enabled. */
export function getAcquisitionMode() {
  try {
    return globalThis.game?.settings?.get?.('foundryvtt-swse', 'strictAcquisition') === true ? 'strict' : 'advisory';
  } catch (_err) {
    return 'advisory'; // setting not registered
  }
}

export function validateAcquisition({ actor, item, isGM = false, user = null, now = new Date().toISOString(), reportOverride = null, strict = false } = {}) {
  if (!actor || !item || !isGatedAcquisitionType(item.type)) {
    return { decision: 'allow', reasons: [], advisories: [], prerequisites: { status: 'not-applicable' }, entitlement: { status: 'not-applicable' }, acquisition: null };
  }
  const prerequisites = assessPrerequisites(actor, item);
  let report = reportOverride;
  if (!report) {
    try { report = ProgressionReconciler.safeReconcileActor(actor, { output: 'report' }); } catch (_err) { report = null; }
  }
  const entitlement = assessEntitlement(report, item.type);

  const reasons = [];
  if (prerequisites.status === 'unmet') reasons.push(`Prerequisites not met: ${prerequisites.reason}`);
  if (entitlement.status === 'no-open-entitlement') reasons.push(`${actor.name} has no open ${item.type} entitlement; every progression ${item.type} choice is already satisfied.`);

  const sessionId = `drop:${globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10)}`;
  const stamp = {
    source: 'player-drop',
    sourceType: 'player-drop',
    sourceSession: sessionId,
    selectionKey: `${item.type}s`,
    selectionId: item.name,
    acquiredBy: user?.id || null,
    acquiredByName: user?.name || null,
    acquiredAt: now,
    entitlementStatus: entitlement.status,
    // Explicitly clear any stale placement metadata the dropped source item may carry (e.g. dragged from another actor).
    slotType: null, slotKey: null, classId: null, className: null, classLevel: null, characterLevel: null,
    ...(entitlement.slot ? { slotType: entitlement.slot.slotType, slotKey: entitlement.slot.slotId, characterLevel: entitlement.slot.characterLevel } : {}),
  };

  if (reasons.length && strict) {
    return { decision: isGM ? 'needs-gm' : 'block', reasons, advisories: [], prerequisites, entitlement, acquisition: null };
  }
  // Advisory (default): always allowed; proven problems are only reported.
  return { decision: 'allow', reasons: [], advisories: reasons, prerequisites, entitlement, acquisition: stamp };
}

/**
 * After the drop committed: certify the new item when (and only when) a slot context was proven.
 * Best effort; never throws; the acquisition itself is already applied.
 */
export async function recordAcquisitionEvidence({ actor, acquisition, engine, itemType = null, itemName = null } = {}) {
  if (!actor || !acquisition?.sourceSession || !acquisition.slotType) return { certified: false, reason: 'no-slot-context' };
  const stamped = Array.from(actor?.items ?? []).find(i => (i?.system?.acquisition?.sourceSession ?? i?.flags?.swse?.progression?.sourceSession) === acquisition.sourceSession);
  if (!stamped) return { certified: false, reason: 'item-not-found' };
  // Real post-commit verification: THIS drop's item must exist as a persisted item stamped with this
  // acquisition's session id (not merely an older same-name item).
  const key = (itemType || stamped.type) === 'talent' ? 'talents' : 'feats';
  const audit = auditTransactionMaterialization(actor, { [key]: [{ name: itemName || stamped.name }] }, acquisition.sourceSession);
  const record = buildProgressionCertification({ actor, sessionId: acquisition.sourceSession, mode: 'drop', manifest: null, audit });
  if (!record || !record.grants.length) return { certified: false, reason: 'item-not-found' };
  return persistCertification(engine, actor, record, 'AcquisitionAuthority.drop');
}

/**
 * GM override for a proven problem. ALWAYS asks (the injected `prompt` is the existing GMGrantDialog);
 * metadata already present on the dropped source item is never treated as authorization. An approved
 * exception returns explicit, freshly-stamped GM-grant evidence (who, when, why) with any stale
 * placement metadata from the source item cleared; a cancelled prompt stops the acquisition.
 * @returns {Promise<{stop:boolean, acquisition:object|null}>}
 */
export async function resolveGmOverride({ actor, item, prompt, now = new Date().toISOString() } = {}) {
  const granted = await prompt({ actor, item });
  if (!granted || typeof granted !== 'object' || !granted.grantedBy) return { stop: true, acquisition: null };
  return {
    stop: false,
    acquisition: {
      ...granted,
      sourceSession: `gm-grant:${globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10)}`,
      grantedAt: granted.grantedAt || now,
      slotType: null, slotKey: null, classId: null, className: null, classLevel: null, characterLevel: null,
    },
  };
}

export default { getAcquisitionMode, resolveGmOverride, isGatedAcquisitionType, assessEntitlement, assessPrerequisites, validateAcquisition, recordAcquisitionEvidence };
