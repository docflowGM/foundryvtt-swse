/**
 * Grounded method inference for the Mentor's Reflection (shared by Multiclass and Prestige). Pure.
 *
 * Adds NO scorer. The ranking is the existing observed accessor (computeObservedBehaviorBias); the AUTHORIZATION to make a
 * claim is the fail-closed provenance (computeObservedBehaviorBiasProvenance) joined to the frozen actor-evidence facts:
 *
 *  - a `method_preference` claim about a mechanical-bias key needs at least TWO independent sources of verified evidence;
 *  - a source is an owned talent or feat (by item id) or a trained skill (by skill key); a Skill Focus feat and the trained
 *    skill it names are ONE source, and repeated primitives on one item are one source;
 *  - every source must resolve to a fact in the frozen projection, and the claim cites exactly those fact ids;
 *  - ownership proves capability, not behavior: the wording is a question ("I wonder whether that reflects how you prefer..."),
 *    never a statement of history, frequency, motive or preference.
 *
 * Theme claims (a mechanical theme tied to a canonical archetype parent) are NOT produced: the canonical 297 SSOT carries no
 * mechanical-bias field and its mechanics sections are audited `draft`, so no certified semantic relationship exists.
 */
import { topObservedKeys } from './resolvers/multiclass-q2.js';

export const MIN_INDEPENDENT_SOURCES = 2;
export const MAX_METHOD_CLAIMS = 2;
export const THEME_RESOLUTION = Object.freeze({ available: false, reason: 'canonical SSOT has no mechanical-bias field and its mechanics sections are audited draft' });

const PHRASE_OVERRIDES = Object.freeze({ forceDC: 'force DC', unarmeddMastery: 'unarmed mastery', adaptiveAI: 'adaptive AI', conditionTrack: 'condition track' });
/** Method phrase derived from the canonical key identifier (camelCase split); a few identifiers need an explicit form. Draft until reviewed. */
export function methodPhraseOf(key) {
  if (PHRASE_OVERRIDES[key]) return PHRASE_OVERRIDES[key];
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

const skillFocusSkill = (name) => { const m = /^skill focus\s*\(([^)]+)\)/i.exec(String(name || '')); return m ? m[1].trim().toLowerCase() : null; };

/** The independent source identity of one provenance entry. */
export function sourceKeyOf(entry, kind) {
  if (kind === 'skill') return `skill:${String(entry.skillKey).toLowerCase()}`;
  const focus = skillFocusSkill(entry.name);
  if (focus) return `skill:${focus}`; // Skill Focus (X) and trained X are the same underlying source
  const id = entry.itemId ?? entry.canonicalId;
  return id ? `item:${id}` : null;
}

/**
 * @returns {Array<{claimId,claimKind,key,groundedBy:string[],sourceKeys:string[],slots:{method_phrase:string}}>}
 */
export const claimSignature = (claim) => `${claim.claimId}|${[...claim.groundedBy].sort().join(',')}`;

/**
 * Method claims the player already rejected (committed, non-preview correction events whose snapshot shows the claim and its exact
 * supporting facts). A rejected claim is not shown again while its evidence is unchanged; it may return only if the supporting
 * facts differ. Owned facts, goals and eligibility are never touched.
 */
export function rejectedSignatures(events) {
  const evs = (events || []).filter((e) => !e.provenance?.preview);
  const snaps = new Map(evs.filter((e) => e.type === 'reflection_snapshot').map((e) => [e.readingId, e]));
  const out = new Set();
  for (const c of evs.filter((e) => e.type === 'reflection_correction')) {
    const snap = snaps.get(c.readingId);
    for (const id of c.rejectedClaimIds || []) {
      const claim = snap?.reading?.claims?.find((x) => x.claimId === id);
      if (claim?.claimKind === 'method_preference') out.add(claimSignature(claim));
    }
  }
  return out;
}

export function methodClaims({ projection, observedBias, provenance, canonicalKeys, events = [], max = MAX_METHOD_CLAIMS }) {
  if (!projection?.facts || !provenance) return [];
  const facts = projection.facts;
  const byItem = new Map(facts.filter((f) => f.source?.itemId != null).map((f) => [String(f.source.itemId), f]));
  const bySkill = new Map(facts.filter((f) => f.kind === 'trained_skill').map((f) => [String(f.canonicalId).toLowerCase(), f]));
  const claims = []; const rejected = rejectedSignatures(events);
  for (const key of topObservedKeys(observedBias, canonicalKeys, canonicalKeys.length)) {
    const sources = new Map(); // sourceKey -> fact
    for (const e of provenance.items?.[key] || []) {
      const sk = sourceKeyOf(e, 'item'); if (!sk) continue;
      const fact = skillFocusSkill(e.name) ? bySkill.get(sk) ?? byItem.get(String(e.itemId)) : byItem.get(String(e.itemId));
      if (fact && ['talent', 'feat'].includes(fact.kind)) sources.set(sk, fact); // class features and other items are not counted
      else if (fact && fact.kind === 'trained_skill') sources.set(sk, fact);
    }
    for (const e of provenance.skills?.[key] || []) {
      const sk = sourceKeyOf(e, 'skill'); const fact = bySkill.get(`skill:${String(e.skillKey).toLowerCase()}`);
      if (fact && e.trained === true) sources.set(sk, fact);
    }
    if (sources.size < MIN_INDEPENDENT_SOURCES) continue;
    const groundedBy = [...new Set([...sources.values()].map((f) => f.factId))].sort();
    const claim = { claimId: `claim.method.${key}`, claimKind: 'method_preference', key, groundedBy, sourceKeys: [...sources.keys()].sort(), slots: { method_phrase: methodPhraseOf(key), method_key: key } };
    if (rejected.has(claimSignature(claim))) continue; // already rejected on this exact evidence
    claims.push(claim);
    if (claims.length >= max) break;
  }
  return claims;
}

/** Theme claims need a certified semantic relationship that the canonical data does not supply: none are made. */
export function themeClaims() { return []; }

/** Future-safe: a theme is displayed only when exactly one canonical parent matches; several matches or none omit the inference. */
export function pickUnambiguousTheme(matchingParents) {
  return Array.isArray(matchingParents) && matchingParents.length === 1 ? matchingParents[0] : null;
}
