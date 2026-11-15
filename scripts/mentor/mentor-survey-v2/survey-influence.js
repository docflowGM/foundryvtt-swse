/**
 * Mentor Survey V2: the single event-based survey influence calculator.
 *
 * Replaces the legacy shared level-decay (IdentityEngine.computeSurveyBias, floor 0.175). Each COMPLETED survey is its
 * own immutable ledger event and decays on its own clock:
 *
 *   D_s(L) = 2^-(max(0, L - L_s) / H_s)          W_s(L) = A_s * D_s(L)
 *   C_s(t, L) = E_s(t) * R(n_s(t)) * A_s * D_s(L)   with   R(n) = 1 + step * min(n - 1, maxSteps)
 *   E_survey(t, L) = sum_s C_s(t, L)  -> bounded by the survey-channel policy -> F(E) = 1 - exp(-E / k)
 *
 * Authority rules enforced here:
 *  - Only CERTIFIED tag evidence (event.tagEvidence entries with certified === true AND a tag in the registered 190-tag
 *    ontology) contributes. No certified mapping => zero tag evidence. Nothing is fabricated from text, neutral
 *    answers, skipped questions, depth answers, goals or Q6 corrections.
 *  - A question contributes to a tag at most once (aliases/duplicate paths collapse). R is applied once; raw answer
 *    counts are never multiplied again.
 *  - Declared goals are a separate, non-decaying lane (see declaredGoals). Acquired mechanics are never read or decayed.
 *  - Survey influence is a RANKING signal only. It cannot bypass eligibility or force a selection.
 *  - Normalized affinity is NOT a probability.
 *
 * All coefficients live in SURVEY_INFLUENCE_CONFIG (single owner). They are PROVISIONAL test defaults pending
 * calibration (docs/design/mentor-survey-v2/07-SURVEY-INFLUENCE-CALIBRATION.md).
 */
import { EVENT_TYPES } from './contract.js';
import { reduceLedger } from './intent-ledger.js';

export const SURVEY_TYPES = Object.freeze(['l1', 'multiclass', 'prestige']);

/** @typedef {{A:number,H:number}} TypePolicy */
export const SURVEY_INFLUENCE_CONFIG = Object.freeze({
  version: 1,
  status: 'PROVISIONAL_TEST_DEFAULTS',
  types: Object.freeze({
    l1: Object.freeze({ A: 0.65, H: 8 }),
    multiclass: Object.freeze({ A: 0.9, H: 4 }),
    prestige: Object.freeze({ A: 1.2, H: 3 }),
  }),
  reinforcement: Object.freeze({ step: 0.15, maxSteps: 3 }),
  /** F(E) = 1 - exp(-E / k) */
  saturationK: 1.0,
  /** Survey-channel bounds so event COUNT cannot overwhelm observed mechanics (provisional, owner to calibrate). */
  channel: Object.freeze({
    maxRawPerTag: 2.0, // cap on summed raw evidence per tag before saturation
    maxAffinityToSuggestions: 0.5, // ceiling multiplier applied to F(E) when handed to the Suggestion Engine
  }),
  /** Q6 correction coefficients. null = NOT APPROVED: corrections are recorded and reported, never applied. */
  calibration: Object.freeze({ negativeFactorByCalibration: null, positiveEvidence: null }),
});

export function validateConfig(cfg = SURVEY_INFLUENCE_CONFIG) {
  const problems = [];
  for (const t of SURVEY_TYPES) {
    const p = cfg.types?.[t];
    if (!p || !(p.A > 0) || !(p.H > 0)) problems.push(`type ${t}: A and H must be positive`);
  }
  if (!(cfg.saturationK > 0)) problems.push('saturationK must be positive');
  if (!(cfg.reinforcement?.step >= 0) || !Number.isInteger(cfg.reinforcement?.maxSteps) || cfg.reinforcement.maxSteps < 0) problems.push('reinforcement invalid');
  if (!(cfg.channel?.maxRawPerTag > 0) || !(cfg.channel?.maxAffinityToSuggestions > 0 && cfg.channel.maxAffinityToSuggestions <= 1)) problems.push('channel bounds invalid');
  return problems;
}

/* ------------------------------ ontology registration (fail closed) ------------------------------ */

let ontologyTags = new Set();
/** The later answer-to-tag integration registers the frozen 190-tag ontology here. Empty = nothing certifies. */
export function registerOntologyTags(tags) { ontologyTags = new Set(tags || []); }
export function resetOntologyTags() { ontologyTags = new Set(); }

/* ------------------------------ the math ------------------------------ */

export const surveyAge = (L, Ls) => Math.max(0, Number(L) - Number(Ls)); // age can never be negative
export const decay = (H, age) => 2 ** (-age / H);
export const reinforcement = (n, cfg = SURVEY_INFLUENCE_CONFIG) => 1 + cfg.reinforcement.step * Math.min(Math.max(n, 1) - 1, cfg.reinforcement.maxSteps);
export const saturate = (E, k = SURVEY_INFLUENCE_CONFIG.saturationK) => 1 - Math.exp(-Math.max(0, E) / k);

export function eventWeight(type, L, Ls, cfg = SURVEY_INFLUENCE_CONFIG) {
  const p = cfg.types[type];
  const age = surveyAge(L, Ls);
  const D = decay(p.H, age);
  return { age, A: p.A, H: p.H, D, W: p.A * D };
}

/** Certified evidence entries, collapsed to one contribution per (question, tag). Rejections are reported, not hidden. */
export function certifiedEvidenceByTag(event) {
  const byTag = new Map();
  const rejected = [];
  for (const e of event.tagEvidence || []) {
    const ok = e && e.certified === true && typeof e.tag === 'string' && ontologyTags.has(e.tag) && typeof e.questionId === 'string' && e.E > 0;
    if (!ok) { rejected.push({ questionId: e?.questionId ?? null, tag: e?.tag ?? null, reason: e?.certified !== true ? 'not_certified' : !ontologyTags.has(e?.tag) ? 'tag_not_in_ontology' : 'invalid_entry' }); continue; }
    const slot = byTag.get(e.tag) || new Map();
    slot.set(e.questionId, Math.max(slot.get(e.questionId) || 0, Number(e.E))); // aliases/duplicate paths count once per question
    byTag.set(e.tag, slot);
  }
  return { byTag, rejected };
}

/** Per-tag contribution of ONE survey event at level L. Provenance is preserved; nothing is merged across events. */
export function eventContributions(event, L, cfg = SURVEY_INFLUENCE_CONFIG) {
  const w = eventWeight(event.surveyKind, L, event.actorLevel, cfg);
  const { byTag, rejected } = certifiedEvidenceByTag(event);
  const contributions = [];
  for (const [tag, perQuestion] of [...byTag.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const n = perQuestion.size;
    const E = Math.max(...perQuestion.values()); // validated base quality: strongest single supporting question; never summed with R
    const R = reinforcement(n, cfg);
    contributions.push({ tag, E, n, R, C: E * R * w.A * w.D, questionIds: [...perQuestion.keys()].sort() });
  }
  return { eventId: event.eventId, surveyKind: event.surveyKind, scopeId: event.scopeId, completedAtLevel: event.actorLevel, ...w, contributions, rejected };
}

/** Events that count: completed, non-superseded, non-preview, known survey type. */
export function activeSurveyEvents(events) {
  const live = new Set(Object.values(reduceLedger(events).latestSurvey).map((e) => e.eventId));
  // An event whose completion level is missing or invalid has no trustworthy decay clock: it contributes nothing
  // (never a fabricated level-1 history).
  return (events || []).filter((e) => e.type === EVENT_TYPES.SURVEY_COMPLETED && live.has(e.eventId) && SURVEY_TYPES.includes(e.surveyKind)
    && Number.isInteger(e.actorLevel) && e.actorLevel >= 1);
}

/**
 * Full diagnostic breakdown AND the numbers used for ranking. Developer-facing: never shown to players.
 * @returns {{level:number, events:object[], tags:Record<string,{raw:number,capped:number,affinity:number,suggestionWeight:number,sources:object[]}>, suggestionTags:Record<string,number>}}
 */
export function computeSurveyInfluence(events, currentLevel, cfg = SURVEY_INFLUENCE_CONFIG) {
  const L = Math.max(1, Number(currentLevel) || 1);
  const per = activeSurveyEvents(events).map((e) => eventContributions(e, L, cfg));
  const tags = {};
  for (const ev of per) {
    for (const c of ev.contributions) {
      const t = (tags[c.tag] ||= { raw: 0, capped: 0, affinity: 0, suggestionWeight: 0, sources: [] });
      t.raw += c.C;
      t.sources.push({ eventId: ev.eventId, surveyKind: ev.surveyKind, C: c.C, E: c.E, n: c.n, R: c.R, A: ev.A, D: ev.D, age: ev.age, questionIds: c.questionIds });
    }
  }
  const suggestionTags = {};
  for (const [tag, t] of Object.entries(tags)) {
    t.capped = Math.min(t.raw, cfg.channel.maxRawPerTag); // survey-channel bound: event count cannot overwhelm observed choices
    t.affinity = saturate(t.capped, cfg.saturationK); // normalized affinity (NOT a probability); raw is kept separately
    t.suggestionWeight = cfg.channel.maxAffinityToSuggestions * t.affinity;
    suggestionTags[tag] = t.suggestionWeight;
  }
  return { level: L, events: per, tags, suggestionTags };
}

/* ------------------------------ separate lanes ------------------------------ */

/** Declared goals never decay: they persist until explicitly revised (separate lane from decaying development preferences). */
export function declaredGoals(events) {
  return Object.fromEntries(Object.entries(reduceLedger(events).goals).map(([lane, e]) => [lane, { eventId: e.eventId, target: e.target, declaredAtLevel: e.actorLevel ?? null }]));
}

/**
 * Q6 calibration authority: SEPARATE from survey evidence and from the survey half-lives. It adjusts only an INFERRED
 * interpretation map (claim ref -> strength). Coefficients are not approved (cfg.calibration = null), so by default the
 * corrections are reported and not applied. The input map is never mutated and owned mechanics are not an input.
 */
export function applyCalibration(inferred, corrections, cfg = SURVEY_INFLUENCE_CONFIG) {
  const out = { ...inferred };
  const applied = [];
  const neg = cfg.calibration?.negativeFactorByCalibration;
  for (const c of corrections || []) {
    const factor = neg?.[c.calibration];
    for (const claimId of c.rejectedClaimIds || []) {
      if (!(claimId in out)) continue;
      if (typeof factor === 'number' && factor >= 0 && factor <= 1) { out[claimId] = out[claimId] * factor; applied.push({ claimId, calibration: c.calibration, factor }); }
    }
  }
  return { inferred: out, applied, coefficientsApproved: neg != null };
}
