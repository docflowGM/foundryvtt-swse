/**
 * Acquisition authority - ONE gate for interactive feat/talent acquisition (drag-and-drop today;
 * any other interactive path can call it). It is deliberately thin and owns no rules:
 *
 *   identity / repeatability   -> DropResolutionEngine (already applied downstream)
 *   prerequisites / legality   -> AbilityEngine.evaluateAcquisition  (the existing single authority)
 *   available entitlement      -> the reconciliation report (ClassModel + verified evidence)
 *   evidence of the result     -> progression-evidence.js certification
 *
 * Decision rules (kept conservative so a pending rules question or missing history can never block a
 * legitimate acquisition):
 *   - BLOCK only on a PROVEN problem: prerequisites demonstrably unmet (no unresolved terms), or the
 *     character demonstrably has no open entitlement of that kind (every slot satisfied, nothing
 *     unverifiable/unattributed/deferred, validation engine healthy).
 *   - Anything undeterminable is `unverifiable`: allowed, recorded as an unattributed player
 *     acquisition, never certified into a slot.
 *   - A GM facing a proven problem is offered the existing GMGrantDialog override (recorded as an
 *     explicit GM grant); a player is refused before any actor change.
 *   - A slot context is stamped only when the only open slots are general-kind (any feat / any
 *     heroic talent). Class-kind slots need class-list / tree eligibility, which this gate does not
 *     decide, so the item is allowed unattributed rather than claimed for a class slot.
 */
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { ProgressionReconciler } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js';
import { auditSelectionsMaterialized } from './levelup-finalization-audit.js';
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
export function validateAcquisition({ actor, item, isGM = false, user = null, now = new Date().toISOString(), reportOverride = null } = {}) {
  if (!actor || !item || !isGatedAcquisitionType(item.type)) {
    return { decision: 'allow', reasons: [], prerequisites: { status: 'not-applicable' }, entitlement: { status: 'not-applicable' }, acquisition: null };
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
    ...(entitlement.slot ? { slotType: entitlement.slot.slotType, slotKey: entitlement.slot.slotId, characterLevel: entitlement.slot.characterLevel } : {}),
  };

  if (reasons.length) {
    return { decision: isGM ? 'needs-gm' : 'block', reasons, prerequisites, entitlement, acquisition: null };
  }
  return { decision: 'allow', reasons: [], prerequisites, entitlement, acquisition: stamp };
}

/**
 * After the drop committed: certify the new item when (and only when) a slot context was proven.
 * Best effort; never throws; the acquisition itself is already applied.
 */
export async function recordAcquisitionEvidence({ actor, acquisition, engine, itemType = null, itemName = null } = {}) {
  if (!actor || !acquisition?.sourceSession || !acquisition.slotType) return { certified: false, reason: 'no-slot-context' };
  const stamped = Array.from(actor?.items ?? []).find(i => (i?.system?.acquisition?.sourceSession ?? i?.flags?.swse?.progression?.sourceSession) === acquisition.sourceSession);
  if (!stamped) return { certified: false, reason: 'item-not-found' };
  // Real post-commit verification (the same item-presence check the finalizer uses for chargen/recovery):
  // the dropped selection must actually exist on the actor. Nothing is assumed to have passed.
  const key = (itemType || stamped.type) === 'talent' ? 'talents' : 'feats';
  const audit = auditSelectionsMaterialized(actor, { draftSelections: { [key]: [{ name: itemName || stamped.name }] } });
  const record = buildProgressionCertification({ actor, sessionId: acquisition.sourceSession, mode: 'drop', manifest: null, audit });
  if (!record || !record.grants.length) return { certified: false, reason: 'item-not-found' };
  return persistCertification(engine, actor, record, 'AcquisitionAuthority.drop');
}

export default { isGatedAcquisitionType, assessEntitlement, assessPrerequisites, validateAcquisition, recordAcquisitionEvidence };
