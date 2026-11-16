/**
 * Grounded method inference for the Mentor's Reflection (shared by Multiclass and Prestige). Pure.
 *
 * Adds NO scorer. Ranking is the existing observed accessor (computeObservedBehaviorBias); the AUTHORIZATION to make a claim is the
 * fail-closed provenance (computeObservedBehaviorBiasProvenance) joined to the frozen actor-evidence facts:
 *
 *  - only keys the editorial ledger classifies as a genuine METHOD, with a reviewed phrase, can produce a claim (the other
 *    categories, capability, role, affiliation and unresolved, never do);
 *  - a claim needs at least TWO independent sources of verified evidence: an owned talent or feat with a CERTIFIED canonical id
 *    (an item known only by name is not a verified mechanic), or a trained skill;
 *  - source identity is stable and independent of list order: `item:<canonical id>` or `skill:<canonical skill key>`; a Skill Focus
 *    feat and the trained skill it names are ONE source (one skill-key authority, nested names included); repeated primitives
 *    on one item are one source;
 *  - the claim cites the exact fact ids for evidence validation and persists the stable source keys, which alone decide whether a
 *    later rejection still applies (positional fact ids may shift when an unrelated item is acquired);
 *  - ownership proves capability, not behavior: the wording is a question, never a statement of history, frequency, motive or preference.
 *
 * Theme claims are NOT produced: the canonical 297 SSOT carries no mechanical-bias field and its mechanics sections are audited `draft`.
 */
import { topObservedKeys } from './resolvers/multiclass-q2.js';
import { canonicalSkillKey, skillFocusTarget } from './actor-evidence.js';

export const MIN_INDEPENDENT_SOURCES = 2;
export const MAX_METHOD_CLAIMS = 2;
export const THEME_RESOLUTION = Object.freeze({ available: false, reason: 'canonical SSOT has no mechanical-bias field and its mechanics sections are audited draft' });

/** Source identity of a provenance entry, or null when it cannot be established (fail closed). */
export function sourceKeyOf(entry, kind, skillFacts) {
  if (kind === 'skill') return entry.skillKey ? `skill:${canonicalSkillKey(entry.skillKey)}` : null;
  const target = skillFocusTarget(entry.name);
  if (target) { // Skill Focus (X): the same underlying source as trained X; resolve X against the actor's trained skills by key or label
    const want = canonicalSkillKey(target);
    const hit = skillFacts.find((f) => canonicalSkillKey(String(f.canonicalId).replace(/^skill:/, '')) === want || canonicalSkillKey(f.label) === want);
    return `skill:${hit ? canonicalSkillKey(String(hit.canonicalId).replace(/^skill:/, '')) : want}`;
  }
  return entry.certified === true && entry.canonicalId ? `item:${entry.canonicalId}` : null;
}

/** A claim's identity for rejection matching: the claim and its stable sources, never positional fact ids. */
export const claimSignature = (claim) => `${claim.claimId}|${[...(claim.sourceKeys || [])].sort().join(',')}`;

/**
 * Method claims the player already rejected (committed, non-preview correction events whose snapshot shows the claim and its stable
 * source keys). A rejected claim is not shown again while its sources are unchanged; added, removed or changed sources may reopen it.
 */
export function rejectedSignatures(events) {
  const evs = (events || []).filter((e) => !e.provenance?.preview);
  const snaps = new Map(evs.filter((e) => e.type === 'reflection_snapshot').map((e) => [e.readingId, e]));
  const out = new Set();
  for (const c of evs.filter((e) => e.type === 'reflection_correction')) {
    const claims = snaps.get(c.readingId)?.reading?.claims || [];
    for (const id of c.rejectedClaimIds || []) {
      const claim = claims.find((x) => x.claimId === id);
      if (claim?.claimKind === 'method_preference' && Array.isArray(claim.sourceKeys)) out.add(claimSignature(claim));
    }
  }
  return out;
}

/**
 * @param {object} p
 * @param {object} p.methodKeys  { [canonicalKey]: { text } } keys the ledger classifies as methods, with their reviewed phrase
 * @returns {Array<{claimId,claimKind,key,groundedBy:string[],sourceKeys:string[],slots:{method_phrase:string,method_key:string}}>}
 */
export function methodClaims({ projection, observedBias, provenance, methodKeys, events = [], max = MAX_METHOD_CLAIMS }) {
  if (!projection?.facts || !provenance || !methodKeys) return [];
  const facts = projection.facts;
  const skillFacts = facts.filter((f) => f.kind === 'trained_skill');
  const byItem = new Map(facts.filter((f) => f.source?.itemId != null && f.certified === true).map((f) => [String(f.source.itemId), f]));
  const bySkill = new Map(skillFacts.map((f) => [canonicalSkillKey(String(f.canonicalId).replace(/^skill:/, '')), f]));
  const claims = []; const rejected = rejectedSignatures(events);
  for (const key of topObservedKeys(observedBias, Object.keys(methodKeys), Object.keys(methodKeys).length)) {
    const sources = new Map(); // stable source key -> fact
    for (const e of provenance.items?.[key] || []) {
      const sk = sourceKeyOf(e, 'item', skillFacts); if (!sk) continue;
      if (sk.startsWith('skill:')) { const f = bySkill.get(sk.slice(6)); if (f) sources.set(sk, f); continue; } // Skill Focus counts only through a trained skill fact
      const f = byItem.get(String(e.itemId));
      if (f && ['talent', 'feat'].includes(f.kind) && f.canonicalId === e.canonicalId) sources.set(sk, f); // certified owned talent/feat only
    }
    for (const e of provenance.skills?.[key] || []) {
      const sk = sourceKeyOf(e, 'skill', skillFacts); const f = sk && bySkill.get(sk.slice(6));
      if (f && e.trained === true) sources.set(sk, f);
    }
    if (sources.size < MIN_INDEPENDENT_SOURCES) continue;
    const claim = { claimId: `claim.method.${key}`, claimKind: 'method_preference', key, groundedBy: [...new Set([...sources.values()].map((f) => f.factId))].sort(), sourceKeys: [...sources.keys()].sort(), slots: { method_phrase: methodKeys[key].text, method_key: key } };
    if (rejected.has(claimSignature(claim))) continue;
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
