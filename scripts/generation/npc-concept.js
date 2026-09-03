/**
 * PHASE 8D-1 (+ addendum) — NPC concept draft schema, normalizer, and
 * per-field reroll primitive.
 *
 * This is a CHARACTER CONCEPT, not a finished SWSE character. HARD RULE
 * (phase spec §5, restated): a generated NPC concept receives NO class
 * assignment and carries no HP/BAB/defenses/ability-score mechanics/
 * skill math/feats/talents/attacks/condition-track/progression data of
 * any kind. Existing NPC/Actor authority
 * (`FactionRegistryService.promoteFactionContactToActor()`,
 * `GMContactActorizerService`) owns turning a concept into a real
 * `type:'npc'` Actor and all its mechanics — this module never competes
 * with it and this schema has no field that could be mistaken for one.
 *
 * Addendum additions (rank/authority metadata for Faction Contacts):
 * `factionRankTitle`/`commandTier` are semantic/organizational, never a
 * level or Challenge Level proxy — see `rank-metadata.js`'s header
 * comment for the full rationale. `profileAffinity` is a MINIMAL seam
 * for a future NPC-catalog/opposition-selection phase (not built here):
 * it prefers soft `rankAffinity` tag arrays over a hard
 * `rankRequired` field, exactly as the addendum specifies, and contains
 * no mechanical data — only tags a future resolver could match against.
 *
 * `linkedLocationId`/`factionId` are populated ONLY when they reference
 * a real canonical record (never a fake/generated id) — an NPC concept
 * generated without a resolved Faction/Location leaves these empty
 * rather than inventing a placeholder.
 */

import { isCommandTier, COMMAND_TIER, RANK_TARGET_IMPORTANCES } from './rank-metadata.js';
import { createProvenance, isProvenance } from './provenance.js';

export const NPC_CONCEPT_KIND = Object.freeze({ LIVING: 'living', DROID: 'droid' });

export const NPC_DISPOSITION = Object.freeze([
  'ally', 'friendly', 'neutral', 'suspicious', 'rival', 'hostile'
]);

/**
 * Matches Faction Contact's own `revealState` vocabulary
 * (`hidden/hinted/known/compromised`) so a promoted concept's reveal
 * state maps onto the canonical Contact schema without translation.
 */
export const NPC_REVEAL_STATE = Object.freeze(['hidden', 'hinted', 'known', 'compromised']);

function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

/**
 * Build a normalized NPC concept draft. Never throws on missing optional
 * fields — everything but `kind`/`name` is optional and defaults to an
 * empty/neutral value. Returns `null` if `kind` is not `'living'` or
 * `'droid'` (fails safe rather than guessing).
 */
export function createNpcConceptDraft(input = {}) {
  const kind = input.kind === NPC_CONCEPT_KIND.DROID ? NPC_CONCEPT_KIND.DROID : (input.kind === NPC_CONCEPT_KIND.LIVING ? NPC_CONCEPT_KIND.LIVING : null);
  if (!kind) return null;

  const base = {
    kind,
    name: cleanString(input.name),
    role: cleanString(input.role),
    title: cleanString(input.title),

    // Real canonical references ONLY — empty string when unresolved.
    factionId: cleanString(input.factionId),
    linkedLocationId: cleanString(input.linkedLocationId),

    // Addendum: rank/authority metadata. factionRankTitle is the
    // DISPLAY string (whatever this Faction actually calls the rank);
    // commandTier is the normalized vocabulary from rank-metadata.js.
    // Never a level/CL substitute — see this file's header comment.
    factionRankTitle: cleanString(input.factionRankTitle),
    commandTier: isCommandTier(input.commandTier) ? input.commandTier : COMMAND_TIER.NONE,
    authorityScope: cleanString(input.authorityScope),
    specialistRole: cleanString(input.specialistRole),
    targetImportance: RANK_TARGET_IMPORTANCES.includes(input.targetImportance) ? input.targetImportance : '',

    // Addendum: minimal profile-affinity seam for a FUTURE NPC-catalog/
    // opposition-selection phase. Tags only, no mechanics, no catalog
    // lookup performed here.
    profileAffinity: {
      roleTags: cleanStringArray(input.profileAffinity?.roleTags),
      rankAffinity: cleanStringArray(input.profileAffinity?.rankAffinity),
      factionAffinityTags: cleanStringArray(input.profileAffinity?.factionAffinityTags)
    },

    disposition: NPC_DISPOSITION.includes(input.disposition) ? input.disposition : 'neutral',
    revealState: NPC_REVEAL_STATE.includes(input.revealState) ? input.revealState : 'hidden',
    publicNotes: cleanString(input.publicNotes),
    gmNotes: cleanString(input.gmNotes),
    agenda: cleanString(input.agenda),
    secret: cleanString(input.secret),
    lastKnownLocation: cleanString(input.lastKnownLocation),
    tags: cleanStringArray(input.tags),
    image: cleanString(input.image),

    // Suggestions only -- never mechanics. combatRole is a narrative hint
    // ("guard", "sniper"); levelBand is a coarse text suggestion
    // ("low"/"mid"/"high"), never a number, never read by any mechanics
    // system.
    combatRole: cleanString(input.combatRole),
    levelBand: cleanString(input.levelBand),

    personality: cleanString(input.personality),
    hook: cleanString(input.hook),

    provenance: isProvenance(input.provenance) ? input.provenance : createProvenance()
  };

  if (kind === NPC_CONCEPT_KIND.LIVING) {
    return {
      ...base,
      speciesId: cleanString(input.speciesId),
      speciesUuid: cleanString(input.speciesUuid),
      speciesName: cleanString(input.speciesName),
      background: cleanString(input.background)
    };
  }

  // droid
  return {
    ...base,
    droidRole: cleanString(input.droidRole),
    chassisSuggestion: cleanString(input.chassisSuggestion),
    primaryFunction: cleanString(input.primaryFunction),
    quirk: cleanString(input.quirk),
    allegianceConcept: cleanString(input.allegianceConcept)
  };
}

/**
 * Per-field reroll primitive (phase spec §14): return a NEW draft with
 * only the named fields replaced, preserving everything else untouched.
 * One generic patch function covers every independently-rerollable NPC
 * field (name/species/title/role/personality/agenda/secret/...) — unlike
 * the ship-name generator's two coupled fields, every NPC concept field
 * is independent, so no bespoke `rerollX()` wrapper is needed per field.
 */
export function updateNpcConceptDraft(draft, patch = {}) {
  if (!draft || typeof draft !== 'object') return draft;
  const merged = { ...draft, ...patch };
  if (patch.profileAffinity) {
    merged.profileAffinity = { ...draft.profileAffinity, ...patch.profileAffinity };
  }
  return createNpcConceptDraft(merged) ?? draft;
}

/**
 * Structural safety check used by tests: confirms a draft carries no key
 * that looks like mechanical Actor data. This is a guard against
 * accidental scope creep in future phases, not a general-purpose
 * validator.
 */
const FORBIDDEN_MECHANICAL_KEYS = Object.freeze([
  'hp', 'hitPoints', 'bab', 'baseAttackBonus', 'defenses', 'abilityScores',
  'skills', 'feats', 'talents', 'attacks', 'conditionTrack', 'level', 'class', 'classes'
]);

export function hasForbiddenMechanicalFields(draft) {
  if (!draft || typeof draft !== 'object') return false;
  return FORBIDDEN_MECHANICAL_KEYS.some((key) => Object.prototype.hasOwnProperty.call(draft, key));
}
