/**
 * Mentor Survey V2: contract vocabulary.
 * Spec: docs/design/mentor-survey-v2/01-SHARED-ARCHITECTURE-CONTRACT.md
 *
 * Pure module (no Foundry globals) so every rule here is testable under plain Node.
 */

export const SURVEY_KINDS = Object.freeze({ L1: 'l1', MULTICLASS: 'multiclass', PRESTIGE: 'prestige' });

/** Question ids per survey (stable). L1 has exactly five questions; no sixth is authorized. */
export const QUESTION_IDS = Object.freeze({
  [SURVEY_KINDS.L1]: Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5']),
  [SURVEY_KINDS.MULTICLASS]: Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']),
  [SURVEY_KINDS.PRESTIGE]: Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']),
});

/** Investment depth. Bridge is a purpose, never a depth. */
export const DEPTH_IDS = Object.freeze(['dip', 'dive', 'swim', 'undecided']);

/** Q6 calibration answers. Hidden bands are illustrative design notes, not scoring constants. */
export const CALIBRATION_IDS = Object.freeze(['A', 'B', 'C', 'D', 'E']);

/** The four independent authority lanes. */
export const LANES = Object.freeze({
  DECLARED_FUTURE_GOAL: 'declared_future_goal',
  INFERRED_CURRENT_IDENTITY: 'inferred_current_identity',
  VERIFIED_MECHANICAL_ELIGIBILITY: 'verified_mechanical_eligibility',
  FINALIZED_ACQUISITION: 'finalized_acquisition',
});

/** Lanes a survey may WRITE (everything else is read-only to surveys). */
export const WRITABLE_LANES = Object.freeze([LANES.DECLARED_FUTURE_GOAL, LANES.INFERRED_CURRENT_IDENTITY]);

export const EVENT_TYPES = Object.freeze({
  SURVEY_COMPLETED: 'survey_completed',
  GOAL_DECLARATION: 'goal_declaration',
  GOAL_REVISION: 'goal_revision',
  REFLECTION_SNAPSHOT: 'reflection_snapshot',
  REFLECTION_CORRECTION: 'reflection_correction',
});

export const EDITORIAL_STATUS = Object.freeze({ APPROVED: 'owner_approved_text', DRAFT: 'draft_text' });
export const MECHANICS_STATUS = Object.freeze({
  CERTIFIED: 'certified_mechanic',
  UNVERIFIED: 'unverified_mechanic',
  NONE: 'none',
});
export const RELEASE_STATE = Object.freeze({ WITHHELD: 'withheld', RELEASED: 'released' });

/** Option/response keys that may be shown to a player. Everything else is internal and never serialized to the view. */
export const VIEW_OPTION_FIELDS = Object.freeze(['optionId', 'text', 'detail', 'kind']);
export const VIEW_QUESTION_FIELDS = Object.freeze(['surveyKind', 'questionId', 'mentorIntro', 'prompt', 'situation', 'options', 'page', 'canSkip', 'canGoBack']);

/** Ledger location: written only by the progression finalizer. */
export const LEDGER_FLAG_SCOPE = 'foundryvtt-swse';
export const LEDGER_FLAG_KEY = 'mentorSurvey.events';
export const LEDGER_SET_PATH = `flags.${LEDGER_FLAG_SCOPE}.${LEDGER_FLAG_KEY}`;

/** Progression-session draft selection key (draft-only; never persisted on the actor). */
export const SESSION_SELECTION_KEY = 'mentorSurvey';

export const CONTENT_VERSION = 1;
export const DEFINITION_VERSION = 1;

/** Stable, deterministic JSON (sorted keys) for hashing. Never depends on key insertion order. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/** FNV-1a 32-bit, hex. Deterministic, dependency-free; used for revision keys and event ids, not for security. */
export function hashString(input) {
  let h = 0x811c9dc5;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const revisionOf = (value) => hashString(stableStringify(value));

export function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
