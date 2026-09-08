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
import { createDraftId } from './lib/draft-id.js';
import { isNpcCompetenceLevel } from './npc/npc-competence.js';

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
 * PHASE 8D-3B addition: `flavorNotes` normalizer. Each entry is `{
 * qualityId, text }` -- `qualityId` is the persisted identity (a
 * `npc/npc-flavor.js` catalog entry id, e.g. `"organic.smells-like-soup"`),
 * `text` is the resolved display string, matching this whole
 * generation ecosystem's "store the resolved value directly" convention
 * (see `npc/npc-flavor.js`'s header for the full rationale). An entry
 * missing either half is dropped rather than stored malformed.
 */
function cleanFlavorNotes(value) {
  return Array.isArray(value)
    ? value.map((entry) => ({ qualityId: cleanString(entry?.qualityId), text: cleanString(entry?.text) })).filter((entry) => entry.qualityId && entry.text)
    : [];
}

/** PHASE 8D-3B addition: `relationshipHooks` normalizer. Each entry is `{ type, text, subjectId, subjectDraftId }` -- `type` is an `npc-flavor`-style stable vocabulary value (`data/npc-relationship-hooks.js`'s `RELATIONSHIP_HOOK_TYPE`), `text` the resolved narrative sentence; `subjectId`/`subjectDraftId` stay empty unless a caller explicitly resolves the hook to a real canonical id or another draft's id (never fabricated here — same discipline as `faction-relationship-draft.js`'s generated-vs-canonical split). */
function cleanRelationshipHooks(value) {
  return Array.isArray(value)
    ? value.map((entry) => ({
      type: cleanString(entry?.type),
      text: cleanString(entry?.text),
      subjectId: cleanString(entry?.subjectId),
      subjectDraftId: cleanString(entry?.subjectDraftId)
    })).filter((entry) => entry.type && entry.text)
    : [];
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
    // PHASE 8D-3B addition: same domain-namespaced draft-id addressing
    // every other draft type (planet/POI/...) already uses (`lib/draft-id.js`)
    // -- npc-concept.js was the one draft schema still missing it, which
    // left a Faction bundle's generated contacts unaddressable for a
    // scoped per-contact reroll (`faction-bundle.js`'s
    // `rerollFactionContact()`). Purely additive: preserved verbatim by
    // `updateNpcConceptDraft()`'s reroll merge exactly like every other
    // field, and a caller that never reads it is unaffected.
    draftId: cleanString(input.draftId) || createDraftId('npc'),
    kind,
    name: cleanString(input.name),
    role: cleanString(input.role),
    title: cleanString(input.title),

    // PHASE 8D-3B addition: presentation/identity. `pronouns`/
    // `presentation` are free-text, GM/caller-supplied only (no
    // generator table backs either — see the phase completion report's
    // reuse-mapping section for why). `ageImpression` is a narrative
    // impression, never a number (`npc/npc-characterization.js`'s
    // `pickNpcAgeImpression()`, kind-aware: droids get "well-maintained"/
    // "aged", never a biological age).
    pronouns: cleanString(input.pronouns),
    presentation: cleanString(input.presentation),
    ageImpression: cleanString(input.ageImpression),

    // Real canonical references ONLY — empty string when unresolved.
    factionId: cleanString(input.factionId),
    linkedLocationId: cleanString(input.linkedLocationId),
    // PHASE 8D-3B addition: link to another draft (e.g. a
    // `planet-draft.js` planet, or a `faction-draft.js` Faction) in the
    // same generation batch that hasn't been committed yet — mirrors
    // `faction-draft.js`'s existing `territoryLocationDraftIds` pattern.
    // Never both this AND `linkedLocationId` meaning the same Location.
    locationDraftId: cleanString(input.locationDraftId),
    factionDraftId: cleanString(input.factionDraftId),
    // Narrative-only: how this NPC relates to wherever they were
    // generated (`data/npc-location-relationships.js`) — "native" vs.
    // "just passing through" — feeds locality/species weighting the
    // same way `recruitment-profile.js`'s `localityBias` already does
    // for Faction membership, at the individual-NPC scale.
    locationRelationship: cleanString(input.locationRelationship),

    // Addendum: rank/authority metadata. factionRankTitle is the
    // DISPLAY string (whatever this Faction actually calls the rank);
    // commandTier is the normalized vocabulary from rank-metadata.js.
    // Never a level/CL substitute — see this file's header comment.
    factionRankTitle: cleanString(input.factionRankTitle),
    commandTier: isCommandTier(input.commandTier) ? input.commandTier : COMMAND_TIER.NONE,
    authorityScope: cleanString(input.authorityScope),
    // REUSE NOTE (phase completion report): the schema addendum's
    // proposed `factionRole` field is this EXISTING `specialistRole`
    // field — "what this person does for the Faction" is exactly what
    // specialistRole already meant (Phase 8D-1 addendum). This phase
    // adds `data/npc-faction-roles.js`/`pickNpcFactionRole()` to
    // actually populate it for generated Contacts, rather than adding
    // a second, redundant field.
    specialistRole: cleanString(input.specialistRole),
    targetImportance: RANK_TARGET_IMPORTANCES.includes(input.targetImportance) ? input.targetImportance : '',

    // PHASE 8D-3B addition: occupation is MORE SPECIFIC than `role`
    // ("technician" vs. "hyperdrive maintenance engineer") — see
    // `data/npc-occupations.js`'s header. `socialRole`/`narrativeFunction`
    // are similarly new, SUGGEST-tier-flavored fields (matching
    // `combatRole`/`levelBand`'s existing discipline on this schema).
    occupation: cleanString(input.occupation),
    socialRole: cleanString(input.socialRole),
    narrativeFunction: cleanString(input.narrativeFunction),
    // Narrative-only "how good are they at their role" — see
    // `npc/npc-competence.js`'s header for the full hard rule and its
    // documented (never mechanically applied) SWSE Crew Quality
    // equivalence.
    competenceLevel: isNpcCompetenceLevel(input.competenceLevel) ? input.competenceLevel : '',

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
    // PHASE 8D-3B addition: mirrors the canonical Faction Contact
    // schema's own `knownToPlayers` field verbatim (reused vocabulary,
    // not invented) — distinct from `revealState`'s GM-workflow states,
    // this is the simple "do the PLAYERS currently know this NPC
    // exists" boolean a promoted Contact already carries.
    knownToPlayers: Boolean(input.knownToPlayers),
    publicNotes: cleanString(input.publicNotes),
    gmNotes: cleanString(input.gmNotes),
    agenda: cleanString(input.agenda),
    secret: cleanString(input.secret),
    // PHASE 8D-3B addition: what currently makes dealing with this NPC
    // harder/more interesting (`data/npc-complications.js`) — distinct
    // from `secret` (something hidden); a complication may be entirely
    // known to everyone.
    complication: cleanString(input.complication),
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
    // PHASE 8D-3B addition: 2-3 distinct traits (phase spec §16 count
    // discipline), from the SAME `data/npc-personality-traits.js` pool
    // `personality` above already draws its single pick from -- no
    // second personality vocabulary. `personality` is kept for backward
    // compatibility (existing callers/tests) and, by convention, mirrors
    // `personalityTraits[0]` when both are generator-populated together.
    personalityTraits: cleanStringArray(input.personalityTraits),
    temperament: cleanString(input.temperament),
    socialStyle: cleanString(input.socialStyle),
    hook: cleanString(input.hook),

    // Phase 8D-2 addendum: broader narrative-generation fields.
    // `motivation` (WHY this NPC does what it does) stays distinct from
    // `agenda` (WHAT they are actively pursuing right now) -- two NPCs
    // can share a motivation ("desperate to pay off a debt") while
    // pursuing very different agendas. `appearance`/`mannerisms` are
    // physical-description/behavioral-tic flavor only -- never anything
    // that could be mistaken for a mechanical trait. `situation` is a
    // short "why this matters right now" beat distinct from the older
    // `hook` field (a hook is what draws a PC in; a situation is the
    // NPC's own current circumstance) -- both may be populated
    // independently. `suggestion` is SUGGEST-tier only: a proposed way
    // a GM might use this NPC, never an authoritative link to any
    // mechanic, statblock, or canonical record.
    appearance: cleanString(input.appearance),
    // PHASE 8D-3B addition: 1-3 short visual cues (phase spec §12),
    // reusing `data/npc-appearance-traits.js`/the droid flavor
    // catalog's chassis/paint categories rather than a duplicate pool
    // (see `npc/npc-characterization.js`) -- distinct from the single
    // free-text `appearance` field above, which callers/tests already
    // populate directly.
    appearanceCues: cleanStringArray(input.appearanceCues),
    motivation: cleanString(input.motivation),
    // PHASE 8D-3B addition: `desire` (what they currently WANT,
    // immediately actionable) and `fear` (what they're afraid WILL
    // happen) are each independent from `motivation`/`agenda` -- four
    // distinct questions per the phase spec's §7 breakdown.
    desire: cleanString(input.desire),
    fear: cleanString(input.fear),
    loyalty: cleanString(input.loyalty),
    mannerisms: cleanString(input.mannerisms),
    voice: cleanString(input.voice),
    speechStyle: cleanString(input.speechStyle),
    situation: cleanString(input.situation),
    suggestion: cleanString(input.suggestion),
    // PHASE 8D-3B addition: narrative-only ladders (`npc/npc-characterization.js`
    // has no dedicated pick module for these two — they're context-
    // informed by role/occupation/Location, populated directly by
    // `npc/npc-bundle.js`). Never Use Computer/Mechanics bonuses or
    // credits.
    technologyFamiliarity: cleanString(input.technologyFamiliarity),
    lifestyle: cleanString(input.lifestyle),
    // PHASE 8D-3B addition: lightweight structured story threads
    // (`data/npc-relationship-hooks.js`) -- see `cleanRelationshipHooks()`'s
    // own doc comment above.
    relationshipHooks: cleanRelationshipHooks(input.relationshipHooks),
    // PHASE 8D-3B addition: DERIVED (never the sole authority) --
    // composed from safe-to-reveal structured facts only
    // (`lib/description-composer.js`'s `composeNpcPublicDescription()`),
    // exactly like `suggestion` above already is from personality+
    // motivation. A caller can always recompose fresh from the draft's
    // own fields; this stored copy is a convenience, not authority.
    publicDescription: cleanString(input.publicDescription),
    // PHASE 8D-3B addition: SUGGEST-tier only, reusing the EXISTING
    // `data/planet-hook-archetypes.js` `JOB_ARCHETYPE_TAGS`/
    // `FACTION_ARCHETYPE_TAGS`-style vocabulary (`JOB_ARCHETYPE_METADATA`)
    // rather than a new catalog — see the phase completion report.
    // `suggestedNarrativeFunction` is deliberately NOT a separate field
    // (it would duplicate `narrativeFunction` above); a caller wanting
    // "the suggested function" reads that field directly.
    suggestedJobArchetypeTags: cleanStringArray(input.suggestedJobArchetypeTags),
    suggestedOppositionTags: cleanStringArray(input.suggestedOppositionTags),
    // PHASE 8D-3B addition: canonical-promotion seam fields, populated
    // ONLY by an explicit future promotion action (e.g. a
    // `FactionRegistryService.promoteFactionContactToActor()`-style
    // call) -- never by generation itself. A concept remains fully
    // useful with all three empty/null.
    actorId: cleanString(input.actorId),
    actorUuid: cleanString(input.actorUuid),
    promotedAt: input.promotedAt ? String(input.promotedAt) : null,

    // PHASE 8D-3B addition: small, memorable sensory/behavioral quirks
    // (`npc/npc-flavor.js`, `data/npc-flavor-qualities-organic.js`/
    // `-droid.js`) -- narrative flavor only, never a mechanical
    // modifier. Deliberately NOT folded into `appearance`/`mannerisms`
    // (single free-text fields already reserved for a generator's own
    // narrative pick) -- flavorNotes stays a distinct, independently
    // rerollable LIST so a GM can keep two quirks and reroll a third,
    // per this field's own reroll contract in `npc-flavor.js`.
    flavorNotes: cleanFlavorNotes(input.flavorNotes),

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
