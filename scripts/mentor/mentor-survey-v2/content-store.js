/**
 * Mentor Survey V2: content validation, release gate and render-safe view building.
 *
 * Content is data (data/mentor-survey/*.json). This module never reconstructs content from labels and never
 * serializes internal fields to a view: view objects are built by ALLOW-LIST (VIEW_OPTION_FIELDS).
 */
import { EDITORIAL_STATUS, MECHANICS_STATUS, RELEASE_STATE, VIEW_OPTION_FIELDS } from './contract.js';

/* ---------------------------------------------------------------------------------------------- */
/* First-person and leak validation                                                                */
/* ---------------------------------------------------------------------------------------------- */

const FIRST_PERSON = /\b(I|I'm|I’m|I've|I’ve|I'd|I’d|I'll|I’ll|me|my|mine|myself)\b/;
// Openers the prestige audit (v0.26 section 39.2) identified as impersonal, not player voice.
const IMPERSONAL_OPENERS = /^\s*["“]?\s*(This is|Being|Becoming|It is|There is|He|She|They|The character)\b/;

export function isFirstPerson(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  if (IMPERSONAL_OPENERS.test(text)) return false;
  return FIRST_PERSON.test(text);
}

// Developer-facing material that must never appear in player text.
const LEAK_PATTERNS = [
  /`/,                                         // backticked developer ids
  /\d+(\.\d+)?\s*%/,                           // percentages / bands
  /\b[a-z]+_[a-z0-9_]+\b/,                     // snake_case ids (tag ids, route ids)
  /\b[a-z0-9]+(\.[a-z0-9_-]+){2,}\b/i,          // dotted ids such as q4.scout.tracking.seed01
  /\b(editorialFocus|editorialIntent|developerRoute|developer route|ontology|tagId|tag id)\b/i,
  /\b(confidence|weight|score)\s*[:=]/i,        // key:value metadata (ordinary prose is allowed)
];

export function findLeaks(text) {
  const t = String(text ?? '');
  return LEAK_PATTERNS.filter((re) => re.test(t)).map((re) => re.source);
}

/* ---------------------------------------------------------------------------------------------- */
/* Record validation                                                                               */
/* ---------------------------------------------------------------------------------------------- */

const ID_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/;

/**
 * Validate one player-selectable response record.
 * Returns an array of problems (empty = valid).
 * @param {object} record { id, text, editorialStatus, mechanicsStatus, sourceRef, internal? }
 * @param {{ neutralOk?: boolean }} [opts]
 */
export function validateResponseRecord(record, opts = {}) {
  const problems = [];
  if (!record || typeof record !== 'object') return ['record is not an object'];
  if (typeof record.id !== 'string' || !ID_PATTERN.test(record.id)) problems.push(`bad id "${record?.id}"`);
  if (!isFirstPerson(record.text)) problems.push(`${record.id}: text is not first person`);
  const leaks = findLeaks(record.text);
  if (leaks.length) problems.push(`${record.id}: player text leaks internal metadata (${leaks.join(', ')})`);
  if (!Object.values(EDITORIAL_STATUS).includes(record.editorialStatus)) problems.push(`${record.id}: bad editorialStatus`);
  if (!Object.values(MECHANICS_STATUS).includes(record.mechanicsStatus)) problems.push(`${record.id}: bad mechanicsStatus`);
  if (!record.sourceRef || typeof record.sourceRef !== 'object' || !record.sourceRef.commit) problems.push(`${record.id}: missing sourceRef.commit`);
  return problems;
}

/** Validate a Mentor-voiced line (intro, prompt): must not leak internals; first person not required. */
export function validateMentorLine(record) {
  const problems = [];
  if (!record || typeof record.text !== 'string' || !record.text.trim()) return ['empty mentor line'];
  const leaks = findLeaks(record.text);
  if (leaks.length) problems.push(`${record.id}: leaks internal metadata (${leaks.join(', ')})`);
  if (!Object.values(EDITORIAL_STATUS).includes(record.editorialStatus)) problems.push(`${record.id}: bad editorialStatus`);
  return problems;
}

/* ---------------------------------------------------------------------------------------------- */
/* Release gate                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

/**
 * A scope is playable only if the manifest releases it AND every presented record is owner-approved text with no
 * unverified mechanic. Editorial preview (GM setting, default off) additionally allows withheld/draft records.
 * @returns {{ playable: boolean, reason: string }}
 */
export function evaluateScopeRelease(manifest, surveyKind, scopeId, { preview = false } = {}) {
  const entry = manifest?.surveys?.[surveyKind]?.[scopeId];
  if (!entry) return { playable: false, reason: 'no_release_entry' };
  if (entry.releaseState === RELEASE_STATE.RELEASED) return { playable: true, reason: 'released' };
  if (preview === true) return { playable: true, reason: 'editorial_preview' };
  return { playable: false, reason: entry.reason || 'withheld' };
}

export function isRecordPlayable(record, { preview = false } = {}) {
  if (!record) return false;
  if (record.mechanicsStatus === MECHANICS_STATUS.UNVERIFIED && record.presentsMechanic === true) return false;
  if (preview === true) return true;
  return record.editorialStatus === EDITORIAL_STATUS.APPROVED;
}

/* ---------------------------------------------------------------------------------------------- */
/* View building (allow-list)                                                                      */
/* ---------------------------------------------------------------------------------------------- */

/** Player-visible option. Internal fields (tags, routes, status, source) are never copied. */
export function toViewOption(record, extra = {}) {
  const view = {};
  const src = { optionId: record.id, text: record.text, detail: record.detail, kind: record.kind, ...extra };
  for (const key of VIEW_OPTION_FIELDS) if (src[key] !== undefined) view[key] = src[key];
  return view;
}

/**
 * Deep leak scan of a serialized view. Used by tests and by the step as a last-line assertion in development.
 * Returns the list of offending paths.
 */
export function scanViewForLeaks(view) {
  const offenders = [];
  const forbiddenKeys = new Set(['internal', 'tags', 'tagIds', 'editorialFocus', 'editorialIntent', 'developerRoute', 'weights', 'score',
    'confidence', 'sourceRef', 'editorialStatus', 'mechanicsStatus', 'routeId', 'q1Route', 'ontology']);
  // Opaque ids are required by the UI to submit a choice and are never displayed; only displayed prose is scanned.
  const opaqueIdKeys = new Set(['optionId', 'questionId', 'surveyKind', 'kind']);
  (function walk(node, path, key) {
    if (node === null || typeof node !== 'object') {
      if (typeof node === 'string' && !opaqueIdKeys.has(key) && findLeaks(node).length) offenders.push(`${path}: ${findLeaks(node).join(',')}`);
      return;
    }
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${path}[${i}]`, key)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (forbiddenKeys.has(k)) offenders.push(`${path}.${k}`);
      walk(v, `${path}.${k}`, k);
    }
  })(view, '$', '');
  return offenders;
}
