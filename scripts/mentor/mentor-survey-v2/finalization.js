/**
 * Transactional commit of survey events. Called ONLY by ProgressionFinalizer while it compiles the atomic `set` map
 * for the advancement. Drafts, skipped, canceled or incomplete surveys have no `committed` record and produce nothing.
 * If the finalization fails or the session is discarded, this is never called, so nothing is persisted.
 */
import { buildCompletionEvents, buildLedgerSetPatch, readLedger, mergeEvents } from './intent-ledger.js';
import { buildReflectionEvents } from './reflection.js';
import { SESSION_SELECTION_KEY } from './contract.js';

/**
 * @param {object} p
 * @param {object} p.actor
 * @param {object|null} p.selection  progressionSession.draftSelections.mentorSurvey
 * @param {string} p.transactionId   the progression session id (one finalization = one transaction)
 * @param {number} p.level           character level at completion
 * @param {string} p.completedAt     ISO timestamp supplied by the caller (keeps this module deterministic)
 * @returns {Record<string, any>} a `set` patch, or {} when there is nothing to commit
 */
export function buildSurveyLedgerPatch({ actor, selection, transactionId, level, completedAt }) {
  const committed = selection?.committed;
  if (!committed || !transactionId) return {};
  const lvl = Number.isInteger(level) && level >= 1 ? level : null;
  if (lvl === null) return {}; // an unknown level can never produce a historical event (no fabricated decay clock)
  let ledger = readLedger(actor);
  const created = [];
  for (const key of Object.keys(committed).sort()) {
    const rec = committed[key];
    if (!rec?.payload || rec.payload.surveyKind !== rec.surveyKind) continue;
    const events = buildCompletionEvents({
      payload: rec.payload, transactionId, actorLevel: lvl, completedAt, preview: rec.preview === true,
      goals: rec.goals || [], existingEvents: ledger, answerDetails: rec.answerDetails || {}, tagEvidence: rec.tagEvidence || [], typed: rec.typed || {},
    });
    ledger = mergeEvents(ledger, events).events;
    created.push(...events);
    // Shared Q6 reflection: a snapshot of exactly what was shown plus (only if the player rejected or affirmed something) a
    // correction. Inferred-identity lane only; it never touches goals, acquisitions or eligibility.
    if (rec.reflection?.reading && rec.reflection?.result?.ok && events.length) {
      const refl = buildReflectionEvents({ reading: rec.reflection.reading, result: rec.reflection.result, transactionId, actorLevel: lvl, completedAt, preview: rec.preview === true, existingEvents: ledger });
      ledger = mergeEvents(ledger, refl).events;
      created.push(...refl);
    }
  }
  return buildLedgerSetPatch(actor, created);
}

export { SESSION_SELECTION_KEY };
