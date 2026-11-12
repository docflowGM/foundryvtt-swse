/**
 * Progression evidence (read-only contract) + certification record builder.
 *
 * The progression finalizer is the authority on what a character legally selected. This module
 * is a THIN layer over its existing outputs - it is NOT a rules engine:
 *   - what a level-up was entitled to grant   -> buildLevelUpEntitlementManifest()  (levelup-entitlement-manifest.js)
 *   - whether it materialized correctly        -> auditLevelUpActorAfterFinalization() (levelup-finalization-audit.js)
 *   - which item was created for which choice  -> acquisition flags stamped by FeatTalentPlanBuilder
 *
 * Gap this closes (see docs/audits/reconciliation-v2-progression-authority-audit.md): the single
 * `flags.swse.levelUpFinalizationReceipt` is replaced by the next level-up, stores selection NAMES
 * rather than item identities, and is written BEFORE the post-apply audit runs. After a verified
 * commit the finalizer therefore appends one durable, event-specific certification
 * (`flags.swse.progressionCertifications`) that binds each granted item instance to the entitlement
 * it satisfied. Only an `outcome: 'certified'` record (post-audit passed) is trusted.
 *
 * Reading API (all pure, none mutates):
 *   getVerifiedHistory(actor)               trusted + untrusted certification records
 *   getAcquisitionEvidence(actor, item)     certified | stamped | none, with the entitlement context
 *   checkCertificationConsistency(actor)    certified grants whose item/class state no longer holds
 *
 * Absence of a certification is an EVIDENCE GAP (unverifiable), never proof of an illegal choice.
 * No legacy migration: existing items without a certification stay "stamped" or "none".
 */

export const CERTIFICATION_FLAG_PATH = 'flags.swse.progressionCertifications';
export const MAX_CERTIFICATIONS = 64;

const GRANT_ITEM_TYPES = Object.freeze(['feat', 'talent']);

function norm(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function positiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch (_err) { return []; }
}

function progressionMeta(item) {
  const flags = item?.flags?.swse?.progression || {};
  const acq = item?.system?.acquisition || {};
  return {
    sourceSession: flags.sourceSession ?? acq.sourceSession ?? null,
    selectionKey: flags.selectionKey ?? acq.selectionKey ?? null,
    selectionId: flags.selectionId ?? acq.selectionId ?? null,
    slotType: flags.slotType ?? acq.slotType ?? item?.system?.slotType ?? flags.source ?? acq.source ?? null,
    slotKey: flags.slotKey ?? acq.slotKey ?? null,
    classId: flags.classId ?? acq.classId ?? null,
    className: flags.className ?? acq.className ?? null,
    classLevel: positiveInt(flags.classLevel ?? acq.classLevel),
    characterLevel: positiveInt(flags.characterLevel ?? acq.characterLevel),
  };
}

/** general | class | multiclass-starting | unknown, from a recorded slot/source token. */
export function normalizeGrantSlotKind(token) {
  const t = norm(token);
  if (!t) return 'unknown';
  if (t.includes('multiclass') || t.includes('starting_feat')) return 'multiclass-starting';
  if (t === 'class' || t.includes('class_feat') || t.includes('class_talent') || t === 'bonus_feat') return 'class';
  if (t === 'heroic' || t === 'general' || t.includes('general') || t.includes('heroic')) return 'general';
  return 'unknown';
}

function certifiedRecords(actor) {
  const raw = actor?.flags?.swse?.progressionCertifications;
  return Array.isArray(raw) ? raw.filter(r => r && typeof r === 'object' && r.kind === 'swse-progression-certification') : [];
}

/**
 * @returns {{trusted:Array, untrusted:Array}} Only `outcome === 'certified'` is trusted. An
 * audit-failed or malformed record is surfaced as untrusted evidence, never as proof.
 */
export function getVerifiedHistory(actor) {
  const trusted = [];
  const untrusted = [];
  for (const record of certifiedRecords(actor)) {
    const wellFormed = record.sessionId && Array.isArray(record.grants);
    if (wellFormed && record.outcome === 'certified' && record.audit?.ok === true) trusted.push(record);
    else untrusted.push(record);
  }
  return { trusted, untrusted };
}

/**
 * Evidence for one owned item.
 *  certified : a trusted certification lists THIS item instance (id) and it still exists
 *  stamped   : the item carries acquisition metadata but no trusted certification lists it
 *  none      : no progression metadata at all (manual add, GM grant, pre-metadata import)
 */
export function getAcquisitionEvidence(actor, item, history = null) {
  const id = item?.id ?? item?._id ?? null;
  const { trusted } = history || getVerifiedHistory(actor);
  if (id) {
    for (const record of trusted) {
      const grant = record.grants.find(g => g?.itemId === id);
      if (grant) {
        return {
          status: 'certified',
          sessionId: record.sessionId,
          slotKind: normalizeGrantSlotKind(grant.slotType),
          slotType: grant.slotType || null,
          classId: grant.classId || null,
          className: grant.className || null,
          classLevel: positiveInt(grant.classLevel),
          characterLevel: positiveInt(grant.characterLevel),
          certification: record,
        };
      }
    }
  }
  // A GM-authorized grant that explicitly does NOT count against a progression slot is an authorized
  // exception (GMGrantDialog: gm-reward / manual with countsAgainstSlot:false). It is outside slot accounting.
  const acq = item?.system?.acquisition || item?.flags?.swse?.acquisition || item?.flags?.['foundryvtt-swse']?.acquisition || null;
  if (acq && acq.countsAgainstSlot === false && acq.grantedBy) {
    return { status: 'external', sessionId: null, slotKind: 'unknown', slotType: null, classId: null, className: null, classLevel: 0, characterLevel: 0, certification: null, grant: { source: acq.source || null, grantedByName: acq.grantedByName || null, reason: acq.reason || '' } };
  }
  const meta = progressionMeta(item);
  if (meta.sourceSession || meta.selectionKey) {
    return {
      status: 'stamped',
      sessionId: meta.sourceSession,
      slotKind: normalizeGrantSlotKind(meta.slotType),
      slotType: meta.slotType,
      classId: meta.classId,
      className: meta.className,
      classLevel: meta.classLevel,
      characterLevel: meta.characterLevel,
      certification: null,
    };
  }
  return { status: 'none', sessionId: null, slotKind: 'unknown', slotType: null, classId: null, className: null, classLevel: 0, characterLevel: 0, certification: null };
}

/**
 * Compare trusted certifications to current actor state. Findings are about the certification,
 * never accusations about the character:
 *   certified-item-removed         the awarded item instance no longer exists
 *   certified-class-level-lost     the class level the grant belongs to is no longer reached
 *   certified-character-level-lost the actor level is below the grant's character level
 */
export function checkCertificationConsistency(actor, classLevels = null) {
  const { trusted, untrusted } = getVerifiedHistory(actor);
  const owned = new Set(actorItems(actor).map(i => i?.id ?? i?._id).filter(Boolean));
  const levelByClass = new Map((Array.isArray(classLevels) ? classLevels : []).map(r => [norm(r.classId || r.className), positiveInt(r.level)]));
  const actorLevel = positiveInt(actor?.system?.level);
  const findings = [];
  for (const record of trusted) {
    for (const grant of record.grants) {
      if (!owned.has(grant.itemId)) {
        findings.push({
          code: 'certified-item-removed', sessionId: record.sessionId, itemId: grant.itemId, name: grant.name || '', itemType: grant.itemType || null,
          slotType: grant.slotType || null, slotKind: normalizeGrantSlotKind(grant.slotType),
          classId: grant.classId || null, className: grant.className || null, classLevel: positiveInt(grant.classLevel), characterLevel: positiveInt(grant.characterLevel),
        });
        continue;
      }
      const need = positiveInt(grant.classLevel);
      if (need && classLevels && grant.classId) {
        const have = levelByClass.get(norm(grant.classId)) ?? 0;
        if (have < need) findings.push({ code: 'certified-class-level-lost', sessionId: record.sessionId, itemId: grant.itemId, name: grant.name || '', classId: grant.classId, required: need, current: have });
      }
      const needChar = positiveInt(grant.characterLevel);
      if (needChar && actorLevel && actorLevel < needChar) {
        findings.push({ code: 'certified-character-level-lost', sessionId: record.sessionId, itemId: grant.itemId, name: grant.name || '', required: needChar, current: actorLevel });
      }
    }
  }
  return { findings, trustedCount: trusted.length, untrustedCount: untrusted.length };
}

/** Index used by the reconciler: itemId -> evidence, computed once per reconciliation. */
export function buildEvidenceIndex(actor) {
  const history = getVerifiedHistory(actor);
  const byItemId = new Map();
  let certified = 0;
  let stamped = 0;
  let none = 0;
  let external = 0;
  for (const item of actorItems(actor).filter(i => GRANT_ITEM_TYPES.includes(i?.type))) {
    const evidence = getAcquisitionEvidence(actor, item, history);
    byItemId.set(item?.id ?? item?._id, evidence);
    if (evidence.status === 'certified') certified += 1;
    else if (evidence.status === 'external') external += 1;
    else if (evidence.status === 'stamped') stamped += 1;
    else none += 1;
  }
  return { history, byItemId, counts: { certified, stamped, none, external, untrustedRecords: history.untrusted.length } };
}

/**
 * Build the certification for a just-committed progression transaction.
 *
 * Entitlement context comes from the level-up manifest (the canonical statement of what THIS
 * transaction owed): class grants belong to manifest.classId at manifest.classLevel; general
 * grants belong to manifest.characterLevel. Chargen/recovery sessions carry no manifest, so the
 * context is the one the committed selection itself recorded, falling back to the starting level.
 *
 * Returns null when there is nothing to certify or no session identity to bind it to.
 * `audit` is the post-commit audit result: only audit.ok === true yields outcome 'certified'.
 */
export function buildProgressionCertification({ actor, sessionId, mode, manifest = null, audit = null, fallbackClass = null, now = new Date().toISOString() } = {}) {
  if (!sessionId || sessionId === 'unknown') return null;
  const ctx = manifest
    ? { classId: manifest.classId, className: manifest.className, classLevel: positiveInt(manifest.classLevel), characterLevel: positiveInt(manifest.characterLevel) }
    : { classId: fallbackClass?.classId || null, className: fallbackClass?.className || null, classLevel: positiveInt(fallbackClass?.classLevel), characterLevel: positiveInt(fallbackClass?.characterLevel) };
  const grants = [];
  for (const item of actorItems(actor).filter(i => GRANT_ITEM_TYPES.includes(i?.type))) {
    const meta = progressionMeta(item);
    if (meta.sourceSession !== sessionId) continue;
    const kind = normalizeGrantSlotKind(meta.slotType);
    const isClassLike = kind === 'class' || kind === 'multiclass-starting';
    grants.push({
      itemId: item.id ?? item._id ?? null,
      itemType: item.type,
      name: item.name || '',
      selectionKey: meta.selectionKey || null,
      selectionId: meta.selectionId || null,
      slotType: meta.slotType || null,
      slotKey: meta.slotKey || null,
      classId: isClassLike ? (meta.classId || ctx.classId || null) : null,
      className: isClassLike ? (meta.className || ctx.className || null) : null,
      classLevel: isClassLike ? (meta.classLevel || ctx.classLevel || 0) : 0,
      characterLevel: kind === 'general' ? (meta.characterLevel || ctx.characterLevel || 0) : (meta.characterLevel || 0),
    });
  }
  const auditOk = audit ? audit.ok === true : true;
  return {
    kind: 'swse-progression-certification',
    version: 1,
    sessionId,
    mode: mode || null,
    outcome: auditOk ? 'certified' : 'audit-failed',
    certifiedAt: now,
    characterLevel: ctx.characterLevel || positiveInt(actor?.system?.level) || null,
    classId: ctx.classId || null,
    className: ctx.className || null,
    classLevel: ctx.classLevel || null,
    audit: {
      kind: manifest ? 'levelup-post-finalization' : 'item-presence',
      ok: auditOk,
      errorCount: Array.isArray(audit?.errors) ? audit.errors.length : 0,
      errors: Array.isArray(audit?.errors) ? audit.errors.slice(0, 10) : [],
    },
    grants,
  };
}

/**
 * Persist a certification through the actor mutation authority. Best effort: never throws.
 * @param {object} engine ActorEngine-like object exposing updateActor
 */
export async function persistCertification(engine, actor, record, source = 'progression-evidence') {
  try {
    if (!record) return { certified: false, reason: 'no-record' };
    if (!engine?.updateActor) return { certified: false, reason: 'actor-engine-unavailable' };
    await engine.updateActor(actor, {
      [CERTIFICATION_FLAG_PATH]: appendCertification(actor?.flags?.swse?.progressionCertifications, record),
    }, { source, meta: { guardKey: 'progression-certification' } });
    return { certified: record.outcome === 'certified', outcome: record.outcome, grantCount: record.grants.length };
  } catch (error) {
    return { certified: false, reason: 'write-failed', error: error?.message ?? String(error) };
  }
}

/** Append-only (per sessionId), bounded. Pure: returns the new array to persist. */
export function appendCertification(existing, record) {
  const list = Array.isArray(existing) ? existing.filter(r => r && r.sessionId !== record.sessionId) : [];
  list.push(record);
  return list.slice(-MAX_CERTIFICATIONS);
}

export default {
  getVerifiedHistory,
  getAcquisitionEvidence,
  checkCertificationConsistency,
  buildEvidenceIndex,
  buildProgressionCertification,
  appendCertification,
  persistCertification,
};
