/**
 * Multiclass Q2: Build Integration. Pure.
 *
 * Offers up to four authored answers, one per distinct OBSERVED mechanical strength of the actor's current build, each
 * joined with the player's Q1 interest. The strengths come from the EXISTING IdentityEngine observed-only accessor
 * (computeObservedBehaviorBias), filtered to the 125 canonical keys the library is written for. No new scorer.
 *
 * Fail closed:
 *  - the {{q1_focus}} slot is filled ONLY from certified noun phrases in pack.q2Content.q1Focus (owner-supplied);
 *    without a phrase for the player's Q1 answer, Q2 is unavailable ("needs_q1_focus"), never improvised;
 *  - fewer than four observed strengths yields fewer answers; none yields no question ("insufficient_observed_evidence");
 *  - answers E (alternate direction) and F (not sure) are not authored as a generic pair, so they are not offered.
 */
import { EDITORIAL_STATUS } from '../contract.js';
import { isRecordPlayable, toViewOption } from '../content-store.js';

const unavailable = (reason) => ({ available: false, reason, view: null, records: [] });

/** Top (up to) four observed canonical strengths: score desc, key asc; only positive scores of canonical keys. */
export function topObservedKeys(observedMechanicalBias, canonicalKeys, max = 4) {
  const canon = new Set(canonicalKeys);
  return Object.entries(observedMechanicalBias || {})
    .filter(([k, v]) => canon.has(k) && Number(v) > 0)
    .sort((a, b) => (Number(b[1]) - Number(a[1])) || a[0].localeCompare(b[0]))
    .slice(0, max).map(([k]) => k);
}

export const q2Available = (pack) => Boolean(pack?.q2Content?.destinations);

export function resolveQ2({ pack, draft, ctx, runtime, preview }) {
  if (!q2Available(pack)) return unavailable('blocked_source');
  const q1 = draft?.answers?.q1;
  if (!q1?.meta || q1.meta.kind !== 'direction') return unavailable('needs_q1_focus'); // a neutral/absent Q1 has no focus to join
  const focus = pack.q2Content.q1Focus?.[q1.optionId];
  if (typeof focus !== 'string' || !focus.trim()) return unavailable('needs_q1_focus');
  const keys = topObservedKeys(runtime?.observedBias, pack.q2Content.keys);
  if (!keys.length) return unavailable('insufficient_observed_evidence');
  const rows = pack.q2Content.destinations[ctx.destinationClassId];
  const records = keys.map((k) => ({ ...rows[k], text: rows[k].text.replace(/\{\{q1_focus\}\}/g, focus.trim()) }));
  if (!records.every((r) => r.editorialStatus === EDITORIAL_STATUS.APPROVED || preview)) return unavailable('unapproved_content');
  if (!records.every((r) => isRecordPlayable(r, { preview }))) return unavailable('unplayable_record');
  const intro = pack.mentors[ctx.destinationClassId].intros.q2;
  if (intro && intro.editorialStatus !== EDITORIAL_STATUS.APPROVED && !preview) return unavailable('unapproved_content');
  return { available: true, reason: 'ok', records, preview,
    view: { surveyKind: 'multiclass', questionId: 'q2', mentorIntro: intro?.text ?? null, prompt: null, situation: null, options: records.map((r) => toViewOption(r)), page: null, canSkip: true, canGoBack: true } };
}

export function q2SelectionMeta(records, optionId) {
  const r = records.find((x) => x.id === optionId);
  return r ? { kind: 'integration', biasKey: r.biasKey } : null;
}
