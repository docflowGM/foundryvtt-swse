/**
 * Apply a COMPILED Galactic Profile to the canonical ProgressionSession — atomic, idempotent, ownership-aware.
 *
 * This is the only function that moves profile intent into the session. It never touches an actor, never
 * calls a finalizer, and writes every choice through `session.commitSelection` into the normal draft keys
 * (the profile keeps only bookkeeping in `draftSelections.profileApplication`, never a second copy of the character).
 *
 *   - Preconditions: compile.ok, exact subtype match (Apply never changes the session subtype).
 *   - Idempotent: same (profileId, revision, digest) is a no-op.
 *   - Atomic: any rejected commit restores the previous draft exactly.
 *   - Switching: keys the previous profile wrote and the player has NOT edited (fingerprint unchanged) are
 *     replaced or cleared; keys the player edited are kept and reported (`kept`); the optional `revalidate`
 *     callback lets V2 drop a kept value that is no longer legal.
 *   - Values that were not profile-owned but are replaced by this Apply are reported (`replaced`), never silent.
 */
import { getDroidDegreePackage } from '../droids/droid-trait-rules.js';

const STEP_ID = 'galactic-profile';
export const PROFILE_APPLICATION_SCHEMA = 'swse-profile-application-v1';

export function fingerprint(value) {
  const text = JSON.stringify(value ?? null);
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

const ARRAY_KEYS = new Set(['feats', 'talents', 'languages', 'forcePowers']);
const emptyFor = key => (ARRAY_KEYS.has(key) ? [] : null);
const isEmptyValue = v => v === null || v === undefined || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function getProfileApplication(session) {
  return session?.draftSelections?.profileApplication ?? null;
}

/** True when the player changed what the profile wrote for `key`. */
export function isOverridden(session, key) {
  const app = getProfileApplication(session);
  return !!app?.owned && key in app.owned && fingerprint(session.draftSelections[key]) !== app.owned[key];
}

/**
 * @param {object} session   ProgressionSession
 * @param {object} compiled  compileProfile() result
 * @param {{now?:()=>number, revalidate?:(key:string,value:any)=>boolean}} [opts]
 */
export function applyCompiledProfile(session, compiled, { now = Date.now, revalidate = null } = {}) {
  if (!session?.draftSelections || typeof session.commitSelection !== 'function') return { ok: false, code: 'INVALID_SESSION' };
  if (!compiled?.ok) return { ok: false, code: 'COMPILE_BLOCKED', blocked: compiled?.blocked ?? [] };
  if (session.subtype !== compiled.subtype) return { ok: false, code: 'SUBTYPE_MISMATCH', detail: `${session.subtype} vs ${compiled.subtype}` };

  const prev = getProfileApplication(session);
  if (prev && prev.profileId === compiled.profileId && prev.revision === compiled.revision && prev.digest === compiled.digest) {
    return { ok: true, changed: false, profileApplication: prev };
  }

  const before = clone(session.draftSelections);
  const beforeModified = session.lastModifiedAt;
  const writes = new Map(Object.entries(compiled.draft));
  const kept = []; const replaced = []; const cleared = [];

  // Ownership resolution against the previous application.
  for (const [key, fp] of Object.entries(prev?.owned ?? {})) {
    const current = session.draftSelections[key];
    const edited = fingerprint(current) !== fp;
    if (edited) {
      if (writes.has(key) || !isEmptyValue(current)) {
        const stillLegal = revalidate ? revalidate(key, current) !== false : true;
        if (stillLegal) { writes.delete(key); kept.push(key); }
        else { writes.set(key, writes.get(key) ?? emptyFor(key)); replaced.push({ key, reason: 'EDITED_VALUE_NO_LONGER_LEGAL' }); }
      }
    } else if (!writes.has(key)) {
      writes.set(key, emptyFor(key)); cleared.push(key);
    }
  }
  for (const key of writes.keys()) {
    if (!(prev?.owned && key in prev.owned) && !isEmptyValue(session.draftSelections[key])) replaced.push({ key, reason: 'PLAYER_VALUE_REPLACED' });
  }

  try {
    for (const [key, value] of writes) {
      if (!session.commitSelection(STEP_ID, key, clone(value), { replace: true })) throw new Error(`commit rejected: ${key}`);
    }
    const owned = {};
    for (const key of Object.keys(compiled.draft)) if (!kept.includes(key)) owned[key] = fingerprint(session.draftSelections[key]);
    const record = {
      schema: PROFILE_APPLICATION_SCHEMA,
      profileId: compiled.profileId,
      revision: compiled.revision,
      subtype: compiled.subtype,
      digest: compiled.digest,
      appliedAt: now(),
      owned,
      economy: clone(compiled.economy),
      deferred: clone(compiled.deferred),
      open: clone(compiled.open),
      locks: [...compiled.locks],
      overrides: [...kept]
    };
    if (!session.commitSelection(STEP_ID, 'profileApplication', record, { replace: true })) throw new Error('commit rejected: profileApplication');

    if (compiled.draft.droid && session.droidContext) {
      session.droidContext.creationMode = 'custom';
      session.droidContext.degree = compiled.draft.droid.droidDegree;
      session.droidContext.size = compiled.draft.droid.droidSize;
      session.droidContext.degreePackage = getDroidDegreePackage(compiled.draft.droid.droidDegree);
    }
    return { ok: true, changed: true, applied: [...writes.keys()].filter(k => !kept.includes(k)), kept, replaced, cleared, profileApplication: record };
  } catch (err) {
    session.draftSelections = before;       // atomic: restore the exact previous draft
    session.lastModifiedAt = beforeModified;
    return { ok: false, code: 'COMMIT_REJECTED', detail: err.message };
  }
}

/**
 * The single traversal filter for profile sessions (replaces TemplateTraversalPolicy for profiles).
 * Drops only steps the profile fully satisfied. A lock is released the moment the player overrides the key that
 * satisfied it, so an edited selection is never hidden from the player.
 */
const LOCK_KEYS = { species: 'species', class: 'class', attribute: 'attributes', background: 'background', skills: 'skills', 'class-talent': 'talents', 'droid-builder': 'droid' };
export function filterActiveStepsForProfile(activeNodeIds, session) {
  const app = getProfileApplication(session);
  if (!app) return activeNodeIds;
  const locks = new Set(app.locks || []);
  return activeNodeIds.filter(id => {
    if (id === 'l1-survey') return false;
    if (!locks.has(id)) return true;
    const key = LOCK_KEYS[id];
    return key ? isOverridden(session, key) : false;
  });
}
