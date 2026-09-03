/**
 * PHASE 8D-2 foundation — generate facts first, compose prose second.
 *
 * HARD RULE: a generated paragraph is never the sole authority for a
 * fact — every composer here reads STRUCTURED fields already on a
 * draft and renders them into a short summary; nothing stores only the
 * rendered prose. Rerolling one structured field (e.g. `economy`) and
 * re-composing therefore never leaves stale prose behind — the prose
 * is a derived VIEW, recomputed on demand, not persisted authority.
 *
 * This module provides the small compositional primitive
 * (`joinClauses()`/`composeFromTemplate()`) plus one example composer
 * per domain (Location/Faction/NPC) to prove the pattern — NOT a
 * natural-language generation system. A caller always CAN recompose
 * from the draft's own fields at any time; nothing here is required
 * reading for a draft to remain valid.
 */

function clean(value) {
  return String(value ?? '').trim();
}

/** Join non-empty clauses with the given separator, dropping blanks. */
export function joinClauses(clauses, separator = ' ') {
  return (Array.isArray(clauses) ? clauses : []).map(clean).filter(Boolean).join(separator);
}

/**
 * Render a `{token}`-style template against a flat `facts` object,
 * skipping (removing) any sentence fragment whose token resolved to an
 * empty string, when facts are supplied as an array of
 * `{ text, tokens }` clause candidates rather than a single fixed
 * string — simplest correct approach: substitute tokens, then drop any
 * clause that still contains an unresolved `{token}` (meaning that
 * fact was empty) rather than emitting a broken sentence.
 */
export function composeFromTemplate(templateClauses, facts = {}) {
  const rendered = [];
  for (const clauseTemplate of Array.isArray(templateClauses) ? templateClauses : []) {
    let clause = clauseTemplate;
    let allResolved = true;
    clause = clause.replace(/\{(\w+)\}/g, (_match, key) => {
      const value = clean(facts[key]);
      if (!value) allResolved = false;
      return value;
    });
    if (allResolved && clause.trim()) rendered.push(clause.trim());
  }
  return rendered.join(' ');
}

/**
 * Example composer: a short Location summary from structured facts.
 * Reads `worldClass`/`biomes`/`economy`/`stability` — the same field
 * names `planet-draft.js` (Phase 8D-2) uses — and never reads or
 * writes any stored prose field.
 */
export function composeLocationSummary({ worldClass = '', biomes = [], economy = [], stability = '' } = {}) {
  const clauses = [];
  if (worldClass) clauses.push(`A ${worldClass} world`);
  if (biomes.length) clauses.push(`of ${joinClauses(biomes.slice(0, 3), ', ')} terrain`);
  if (economy.length) clauses.push(`, known for ${joinClauses(economy.slice(0, 2), ' and ')}`);
  if (stability) clauses.push(`. The political situation is ${stability}.`);
  return joinClauses(clauses, ' ').replace(/\s+([,.])/g, '$1');
}

/** Example composer: a short Faction summary from structured facts. */
export function composeFactionSummary({ name = '', organizationFamily = '', scaleLabel = '', institutionalTraits = [] } = {}) {
  const clauses = [];
  if (name) clauses.push(name);
  if (organizationFamily) clauses.push(`is a ${organizationFamily}`);
  if (scaleLabel) clauses.push(`operating at a ${scaleLabel} scale`);
  if (institutionalTraits.length) clauses.push(`, known for being ${joinClauses(institutionalTraits.slice(0, 3), ' and ')}`);
  return `${joinClauses(clauses, ' ')}.`.replace(/\s+([,.])/g, '$1');
}

/** Example composer: a short NPC summary from structured facts. */
export function composeNpcSummary({ name = '', title = '', role = '', personalityPrimary = '', hook = '' } = {}) {
  const clauses = [];
  if (name) clauses.push(title ? `${title} ${name}` : name);
  if (role) clauses.push(`, a ${role}`);
  if (personalityPrimary) clauses.push(`known for being ${personalityPrimary}`);
  if (hook) clauses.push(`. ${hook}`);
  return joinClauses(clauses, ' ').replace(/\s+([,.])/g, '$1');
}
