/**
 * Language knowledge granted by a species. Most automatic languages are spoken and understood. A published profile can
 * restrict one: the character understands it but cannot speak it (e.g. Wookiee and Gamorrean Basic, Celegian Basic).
 * Restrictions are stored next to the species language list and reset with the rest of the species grant.
 *
 * Pure module: no Foundry globals.
 */

export const LANGUAGE_RESTRICTION = Object.freeze({ UNDERSTAND_ONLY: 'understand-only' });

/** Audit spoken-restriction values that mean "understands but cannot speak". Others are not modelled here. */
const UNDERSTAND_ONLY_AUDIT_VALUES = new Set(['CANNOT_SPEAK', 'UNDERSTAND_ONLY']);

/** { Basic: 'understand-only' } from audit language entries; unmodelled restrictions are ignored (they stay display text). */
export function languageRestrictionsFromAudit(entries) {
  const out = {};
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (UNDERSTAND_ONLY_AUDIT_VALUES.has(entry?.spokenRestriction)) out[entry.name] = LANGUAGE_RESTRICTION.UNDERSTAND_ONLY;
  }
  return out;
}

const norm = name => String(name ?? '').trim().toLowerCase();

/**
 * The species-imposed restriction on a language the character knows: 'understand-only' or null (none recorded).
 * Whether the character KNOWS the language at all is owned by the language authority (the language step / actor languages);
 * this only records what the species grant forbids.
 */
export function speciesLanguageRestriction(actor, language) {
  const restrictions = actor?.flags?.swse?.speciesLanguageRestrictions ?? {};
  const key = Object.keys(restrictions).find(name => norm(name) === norm(language));
  return key && restrictions[key] === LANGUAGE_RESTRICTION.UNDERSTAND_ONLY ? 'understand-only' : null;
}

/** A known language may be spoken unless the species grant restricts it to understanding. */
export const speciesAllowsSpeaking = (actor, language) => speciesLanguageRestriction(actor, language) === null;
