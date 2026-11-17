/**
 * Multiclass Q2: Build Integration. Pure.
 *
 * Offers up to four authored answers (A-D), one per distinct OBSERVED strength of the actor's current build, joined with a
 * focus phrase for the player's Q1 answer, then the owner-approved E (alternative direction) and F (not sure yet).
 * Strengths come from the EXISTING IdentityEngine observed-only accessor (computeObservedBehaviorBias) filtered to the 125
 * canonical keys, and are further restricted to keys with ACTOR PROVENANCE: an owned item's rules primitives or trained-skill
 * contribution (computeObservedBehaviorBiasProvenance). A key supported only by ability scores is a tendency, not evidence of
 * past training, so no autobiographical answer is offered for it. No new scorer.
 *
 *  - {{q1_focus}} comes from pack.q2Content.q1Focus (per Q1 answer; editorial drafts) or the approved neutral focus for an
 *    undecided Q1 ("what this new training could offer"); no specialization is inferred from a neutral answer;
 *  - zero evidence-backed strengths, a missing phrase or a neutral Q1 never remove E and F;
 *  - E records exploration only and F records no scored preference.
 */
import { EDITORIAL_STATUS } from '../contract.js';
import { isRecordPlayable, toViewOption } from '../content-store.js';

const unavailable = (reason) => ({ available: false, reason, view: null, records: [] });

/** Top (up to) four observed canonical strengths: score desc, key asc; only positive scores of canonical keys that pass `isBacked`. */
export function topObservedKeys(observedMechanicalBias, canonicalKeys, max = 4, isBacked = () => true) {
  const canon = new Set(canonicalKeys);
  return Object.entries(observedMechanicalBias || {})
    .filter(([k, v]) => canon.has(k) && Number(v) > 0 && isBacked(k))
    .sort((a, b) => (Number(b[1]) - Number(a[1])) || a[0].localeCompare(b[0]))
    .slice(0, max).map(([k]) => k);
}

/**
 * Exact actor provenance for a key, from the engine's fail-closed provenance accessor: owned items (id, type, canonical id, rule
 * primitive) and explicitly mapped trained skills. Ability-only keys, conditional rules and generic-default mappings give none.
 * The snapshot reference travels with the answer so the ledger can show exactly what authorized the statement.
 */
export function keyProvenance(provenance, key) {
  const items = (provenance?.items?.[key] || []).map((i) => ({ itemId: i.itemId, type: i.type, name: i.name, canonicalId: i.canonicalId, certified: i.certified === true, ruleType: i.ruleType }));
  const skills = (provenance?.skills?.[key] || []).map((k) => ({ skillKey: k.skillKey, canonicalId: k.canonicalId, trained: k.trained === true, skillFocus: k.skillFocus === true }));
  if (!items.length && !skills.length) return null;
  return { items: items.slice(0, 3), skills: skills.slice(0, 3), snapshot: provenance.snapshot ?? null };
}

export const q2Available = (pack) => Boolean(pack?.q2Content?.destinations);

export function resolveQ2({ pack, draft, ctx, runtime, preview }) {
  if (!q2Available(pack)) return unavailable('blocked_source');
  const q1 = draft?.answers?.q1;
  if (!q1?.meta) return unavailable('needs_q1_focus'); // no Q1 answer: nothing to join
  const c = pack.q2Content;
  const focusRec = q1.meta.kind === 'neutral' ? c.q1FocusNeutral : q1.meta.kind === 'direction' ? c.q1Focus?.[q1.optionId] : null;
  const focus = typeof focusRec?.text === 'string' ? focusRec.text.trim() : '';
  const rows = c.destinations[ctx.destinationClassId];
  const keys = focus ? topObservedKeys(runtime?.observedBias, c.keys, 4, (k) => Boolean(keyProvenance(runtime?.observedProvenance, k))) : [];
  const strengths = keys.map((k) => ({ ...rows[k], text: rows[k].text.replace(/\{\{q1_focus\}\}/g, focus), evidence: keyProvenance(runtime.observedProvenance, k) }));
  const records = [...strengths, c.alternatives.alternative, c.alternatives.undecided];
  const shown = [...records, ...(strengths.length ? [focusRec] : [])];
  if (!shown.every((r) => r.editorialStatus === EDITORIAL_STATUS.APPROVED || preview)) return unavailable('unapproved_content');
  if (!records.every((r) => isRecordPlayable(r, { preview }))) return unavailable('unplayable_record');
  const intro = pack.mentors[ctx.destinationClassId].intros.q2;
  if (intro && intro.editorialStatus !== EDITORIAL_STATUS.APPROVED && !preview) return unavailable('unapproved_content');
  return { available: true, reason: 'ok', records, preview,
    view: { surveyKind: 'multiclass', questionId: 'q2', mentorIntro: intro?.text ?? null, prompt: null, situation: null, options: records.map((r) => toViewOption(r)), page: null, canSkip: true, canGoBack: true } };
}

export function q2SelectionMeta(records, optionId) {
  const r = records.find((x) => x.id === optionId);
  if (!r) return null;
  if (r.kind === 'alternative' || r.kind === 'undecided') return { kind: r.kind };
  return { kind: 'integration', biasKey: r.biasKey, evidence: r.evidence ?? null };
}
