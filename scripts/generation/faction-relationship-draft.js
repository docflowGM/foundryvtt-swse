/**
 * PHASE 8D-1 — Faction ally/enemy relationship draft foundation.
 *
 * Confirmed by reconnaissance: the canonical Faction record
 * (`FactionRegistryService`) has NO `allies`/`enemies` array — only
 * per-actor relationship rows carry a `relationshipType` drawn from
 * `RELATIONSHIP_TYPES` (`known/member/enemy/patron/founder/ally/
 * neutral/other`). SWSE Organizations explicitly have allies and
 * enemies as a fundamental trait, so this module adds that concept at
 * the DRAFT layer only — it never writes to the Faction registry and
 * never invents a field on the canonical record.
 *
 * A relationship is either:
 *  - CANONICAL: a real, existing Faction, referenced by its stable id
 *    only (never by name);
 *  - GENERATED: an unresolved concept (a short description of an ally/
 *    enemy that does not exist as a canonical Faction yet) — this NEVER
 *    carries a fake Faction id. `factionId` stays empty until a GM
 *    resolves/creates the real Faction and links it explicitly.
 *
 * These feed future Job objective generation (protect an ally, rescue
 * an allied member, sabotage an enemy, destroy enemy supplies, capture
 * an enemy agent, attack an enemy stronghold, negotiate between rivals)
 * — Phase 8D-2+ scope, not built here.
 */

import { createProvenance, isProvenance } from './provenance.js';

export const FACTION_RELATIONSHIP_KIND = Object.freeze({ ALLY: 'ally', ENEMY: 'enemy' });

function cleanString(value) {
  return String(value ?? '').trim();
}

/**
 * Build a CANONICAL relationship draft entry — references a real,
 * already-existing Faction by id. Returns `null` if `factionId` is
 * blank (a canonical entry with no real id is a contradiction; use
 * `createGeneratedFactionRelationshipConcept()` instead).
 */
export function createCanonicalFactionRelationship({ kind, factionId, note = '' } = {}) {
  const cleanId = cleanString(factionId);
  if (kind !== FACTION_RELATIONSHIP_KIND.ALLY && kind !== FACTION_RELATIONSHIP_KIND.ENEMY) return null;
  if (!cleanId) return null;
  return { kind, resolved: true, factionId: cleanId, name: '', note: cleanString(note) };
}

/**
 * Build a GENERATED (unresolved) relationship concept — a short
 * description of an ally/enemy organization that is not yet a canonical
 * Faction. `factionId` is always empty here; it is populated later, by
 * an explicit GM action, once/if a real Faction is linked or created —
 * this function itself never manufactures one.
 */
export function createGeneratedFactionRelationshipConcept({ kind, name, note = '', provenance } = {}) {
  if (kind !== FACTION_RELATIONSHIP_KIND.ALLY && kind !== FACTION_RELATIONSHIP_KIND.ENEMY) return null;
  const cleanName = cleanString(name);
  if (!cleanName) return null;
  return {
    kind,
    resolved: false,
    factionId: '',
    name: cleanName,
    note: cleanString(note),
    provenance: isProvenance(provenance) ? provenance : createProvenance()
  };
}

/**
 * A Faction draft's full relationship set: canonical ally/enemy Faction
 * ids plus unresolved generated concepts, kept in separate lists so a
 * caller never has to inspect `resolved` to know which list to read.
 */
export function createFactionRelationshipDraftSet() {
  return { allyFactionIds: [], enemyFactionIds: [], generatedAllyConcepts: [], generatedEnemyConcepts: [] };
}

/**
 * Add one relationship (canonical or generated) to a relationship set,
 * returning a NEW set (no mutation). Routes to the correct list based
 * on `entry.kind`/`entry.resolved` — never requires the caller to know
 * the set's internal field names.
 */
export function addFactionRelationship(set, entry) {
  const base = set && typeof set === 'object' ? set : createFactionRelationshipDraftSet();
  if (!entry || (entry.kind !== FACTION_RELATIONSHIP_KIND.ALLY && entry.kind !== FACTION_RELATIONSHIP_KIND.ENEMY)) return base;
  const next = {
    allyFactionIds: [...base.allyFactionIds],
    enemyFactionIds: [...base.enemyFactionIds],
    generatedAllyConcepts: [...base.generatedAllyConcepts],
    generatedEnemyConcepts: [...base.generatedEnemyConcepts]
  };
  if (entry.resolved) {
    if (entry.kind === FACTION_RELATIONSHIP_KIND.ALLY && !next.allyFactionIds.includes(entry.factionId)) next.allyFactionIds.push(entry.factionId);
    if (entry.kind === FACTION_RELATIONSHIP_KIND.ENEMY && !next.enemyFactionIds.includes(entry.factionId)) next.enemyFactionIds.push(entry.factionId);
  } else {
    if (entry.kind === FACTION_RELATIONSHIP_KIND.ALLY) next.generatedAllyConcepts.push(entry);
    if (entry.kind === FACTION_RELATIONSHIP_KIND.ENEMY) next.generatedEnemyConcepts.push(entry);
  }
  return next;
}
