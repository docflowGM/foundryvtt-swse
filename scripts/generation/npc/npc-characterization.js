/**
 * PHASE 8D-3B production — NPC characterization picker aggregate.
 *
 * Thin composition over the new schema-addendum data pools (temperament,
 * social style, desire, fear, social role, narrative function, location
 * relationship, faction role, loyalty, complication, relationship
 * hooks, voice, speech style, age impression, mannerism) -- matches
 * `planets/planet-hooks.js`'s own precedent of aggregating several
 * small, independent picks into one file rather than one file per
 * one-line wrapper. This module owns no NEW table data of its own
 * beyond the two small fixed age-impression ladders (too small to
 * justify a separate data file, same size-class as `rank-metadata.js`'s
 * inline `RANK_TARGET_IMPORTANCE` enum).
 *
 * KIND-DISPATCH FIX: `pickNpcMannerism()`/`pickNpcVoice()` below are
 * kind-aware (`'living'` -> organic pool, `'droid'` -> the NEW droid
 * pool) -- previously (`npc-narrative-generator.js`'s
 * `pickNpcMannerism()`) EVERY generated NPC, including droids, drew
 * from the organic-only `data/npc-mannerisms.js` pool. This module's
 * versions are what `npc/npc-bundle.js` now calls instead, exactly
 * mirroring the organic/droid structural-separation discipline
 * `npc/npc-flavor.js` already established for flavor notes.
 */

import { NPC_TEMPERAMENTS } from '../data/npc-temperaments.js';
import { NPC_SOCIAL_STYLES } from '../data/npc-social-styles.js';
import { NPC_DESIRES } from '../data/npc-desires.js';
import { NPC_FEARS } from '../data/npc-fears.js';
import { NPC_SOCIAL_ROLES } from '../data/npc-social-roles.js';
import { NPC_NARRATIVE_FUNCTIONS } from '../data/npc-narrative-functions.js';
import { NPC_LOCATION_RELATIONSHIPS } from '../data/npc-location-relationships.js';
import { NPC_FACTION_ROLES } from '../data/npc-faction-roles.js';
import { NPC_LOYALTY_PROFILES } from '../data/npc-loyalty-profiles.js';
import { NPC_COMPLICATIONS } from '../data/npc-complications.js';
import { NPC_RELATIONSHIP_HOOK_TEMPLATES, NPC_RELATIONSHIP_HOOK_SUBJECTS } from '../data/npc-relationship-hooks.js';
import { NPC_VOICE_QUALITIES_ORGANIC } from '../data/npc-voice-qualities-organic.js';
import { NPC_VOICE_QUALITIES_DROID } from '../data/npc-voice-qualities-droid.js';
import { NPC_SPEECH_STYLES } from '../data/npc-speech-styles.js';
import { NPC_MANNERISMS } from '../data/npc-mannerisms.js';
import { NPC_DROID_MANNERISMS } from '../data/npc-mannerisms-droid.js';
import { NPC_PERSONALITY_TRAITS } from '../data/npc-personality-traits.js';
import { NPC_APPEARANCE_TRAITS } from '../data/npc-appearance-traits.js';
import { DROID_NPC_FLAVOR_QUALITIES } from '../data/npc-flavor-qualities-droid.js';
import { weightedPick, weightedPickWithPreference, weightedPickUniqueN, randomIntInclusive } from '../lib/weighted-random.js';
import { updateNpcConceptDraft, recomposeNpcPublicDescription } from '../npc-concept.js';

// --- small fixed ladders (organic vs. droid) -----------------------------
// Deliberately NOT numeric ages -- an "impression," per the phase spec,
// never forcing biological concepts onto droids.
const ORGANIC_AGE_IMPRESSIONS = Object.freeze([
  { value: 'young', weight: 2 }, { value: 'middle-aged', weight: 3 }, { value: 'elderly', weight: 1 },
  { value: 'ageless-looking', weight: 0.5 }, { value: 'weathered', weight: 1.5 }
]);
const DROID_AGE_IMPRESSIONS = Object.freeze([
  { value: 'new-looking', weight: 1.5 }, { value: 'well-maintained', weight: 3 }, { value: 'aged', weight: 1.5 },
  { value: 'heavily repaired', weight: 1 }, { value: 'obsolete-looking', weight: 1 }
]);

/** Pick an age impression for the given `kind` (`'living'`/`'droid'`). */
export function pickNpcAgeImpression({ kind, rng } = {}) {
  const pool = kind === 'droid' ? DROID_AGE_IMPRESSIONS : ORGANIC_AGE_IMPRESSIONS;
  return weightedPick(pool, { rng, weightOf: (e) => e.weight })?.value ?? '';
}

export function pickNpcTemperament({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_TEMPERAMENTS, { rng, preferTags })?.value ?? '';
}

export function pickNpcSocialStyle({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_SOCIAL_STYLES, { rng, preferTags })?.value ?? '';
}

/** 2-3 distinct personality traits (phase spec §16/§50 count discipline), from the SAME pool `npc-narrative-generator.js`'s single-pick `personality` field already draws from -- no second personality vocabulary. */
export function pickNpcPersonalityTraits({ rng, preferTags = [], count } = {}) {
  const resolvedCount = Number.isFinite(count) ? count : randomIntInclusive(2, 3, { rng });
  return weightedPickUniqueN(NPC_PERSONALITY_TRAITS, resolvedCount, { rng, preferTags }).map((e) => e.value);
}

export function pickNpcDesire({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_DESIRES, { rng, preferTags })?.value ?? '';
}

export function pickNpcFear({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_FEARS, { rng, preferTags })?.value ?? '';
}

export function pickNpcSocialRole({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_SOCIAL_ROLES, { rng, preferTags })?.value ?? '';
}

export function pickNpcNarrativeFunction({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_NARRATIVE_FUNCTIONS, { rng, preferTags })?.value ?? '';
}

export function pickNpcLocationRelationship({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_LOCATION_RELATIONSHIPS, { rng, preferTags })?.value ?? '';
}

/** Populates `npc-concept.js`'s EXISTING `specialistRole` field for a Faction Contact -- see `data/npc-faction-roles.js`'s header for why this is not a new/separate field. */
export function pickNpcFactionRole({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_FACTION_ROLES, { rng, preferTags })?.value ?? '';
}

export function pickNpcLoyalty({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_LOYALTY_PROFILES, { rng, preferTags })?.value ?? '';
}

export function pickNpcComplication({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_COMPLICATIONS, { rng, preferTags })?.value ?? '';
}

/** Pick one relationship-hook subject filler (a generic, unresolved description -- never a fabricated name/id). */
export function pickNpcRelationshipHookSubject({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(NPC_RELATIONSHIP_HOOK_SUBJECTS, { rng, preferTags })?.value ?? 'someone from their past';
}

/** Pick one relationship-hook TEMPLATE and fill its `{subject}` placeholder, returning `{ type, text }`. */
export function pickNpcRelationshipHook({ rng, preferTags = [] } = {}) {
  const template = weightedPickWithPreference(NPC_RELATIONSHIP_HOOK_TEMPLATES, { rng, preferTags });
  if (!template) return null;
  const subject = pickNpcRelationshipHookSubject({ rng, preferTags });
  return { type: template.type, text: template.text.replace('{subject}', subject) };
}

/** 0-2 relationship hooks (phase spec §50 count discipline), each independently rolled -- may repeat the same TYPE (e.g. two separate "debtor" hooks toward different subjects), never two IDENTICAL rendered hooks. */
export function pickNpcRelationshipHooks({ rng, preferTags = [], count } = {}) {
  const resolvedCount = Number.isFinite(count) ? count : randomIntInclusive(0, 2, { rng });
  const hooks = [];
  const seenText = new Set();
  let attempts = 0;
  while (hooks.length < resolvedCount && attempts < resolvedCount * 6) {
    attempts++;
    const hook = pickNpcRelationshipHook({ rng, preferTags });
    if (!hook || seenText.has(hook.text)) continue;
    seenText.add(hook.text);
    hooks.push(hook);
  }
  return hooks;
}

/** Kind-dispatched voice pick -- organic vs. droid vocabulator/audio pool, never crossed. */
export function pickNpcVoice({ kind, rng, preferTags = [] } = {}) {
  const pool = kind === 'droid' ? NPC_VOICE_QUALITIES_DROID : NPC_VOICE_QUALITIES_ORGANIC;
  return weightedPickWithPreference(pool, { rng, preferTags })?.value ?? '';
}

/** Speech style: ONE shared pool (phase spec: "may be shared where compatible"), with `excludedTags` gating the handful of organic/droid-specific entries. */
export function pickNpcSpeechStyle({ kind, rng, preferTags = [] } = {}) {
  const excluded = kind === 'droid' ? 'droid' : 'organic';
  const pool = NPC_SPEECH_STYLES.filter((entry) => !(entry.excludedTags ?? []).includes(excluded));
  return weightedPickWithPreference(pool, { rng, preferTags })?.value ?? '';
}

/** Kind-dispatched PRIMARY mannerism pick -- fixes the pre-existing gap where every NPC (droids included) drew from the organic-only pool. */
export function pickNpcMannerismForKind({ kind, rng, preferTags = [] } = {}) {
  const pool = kind === 'droid' ? NPC_DROID_MANNERISMS : NPC_MANNERISMS;
  return weightedPickWithPreference(pool, { rng, preferTags })?.value ?? '';
}

/** Droid flavor-quality categories that describe purely VISUAL/physical presentation -- reused as the droid "appearance cue" source (phase spec §27's "separate droid appearance cues" requirement) rather than building a third droid content pool that would substantially overlap `data/npc-flavor-qualities-droid.js`'s existing chassis/paint/replacement-parts/photoreceptor entries. */
const DROID_APPEARANCE_CATEGORIES = new Set(['chassis', 'paint', 'replacement-parts', 'photoreceptor']);
// `data/npc-flavor-qualities-droid.js` entries use `text` (the flavor-note
// schema field name), not `value` (the plain-pool convention every other
// pick function in this file reads via `weightedPickWithPreference()`'s
// default `?.value`) -- normalized here, once, rather than teaching the
// shared picker two different field-name conventions.
const DROID_APPEARANCE_POOL = Object.freeze(
  DROID_NPC_FLAVOR_QUALITIES.filter((entry) => DROID_APPEARANCE_CATEGORIES.has(entry.category)).map((entry) => ({ ...entry, value: entry.text }))
);

/**
 * Kind-dispatched appearance pick -- fixes the same organic-pool-leak
 * gap `pickNpcMannerismForKind()` fixes, for physical appearance.
 * `'living'` draws from `data/npc-appearance-traits.js` (unchanged from
 * `npc-narrative-generator.js`'s existing single pick); `'droid'` draws
 * from the visual subset of the droid flavor pool above -- NEVER the
 * organic pool. Returns a single string (matches `npc-concept.js`'s
 * existing single-value `appearance` field); `npc/npc-bundle.js` wraps
 * it into the new `appearanceCues` array.
 */
export function pickNpcAppearanceForKind({ kind, rng, preferTags = [] } = {}) {
  const pool = kind === 'droid' ? DROID_APPEARANCE_POOL : NPC_APPEARANCE_TRAITS;
  return weightedPickWithPreference(pool, { rng, preferTags })?.value ?? '';
}

// --- small fixed narrative ladders (technology familiarity / lifestyle) --
// Too small (6-7 fixed values each) to justify a separate data file --
// same size class as `rank-metadata.js`'s inline `RANK_TARGET_IMPORTANCE`
// enum. Both are context-informed (role/occupation/Location/Faction)
// but stay purely narrative -- never Use Computer/Mechanics bonuses or
// credits (phase spec §10/§11).
const TECHNOLOGY_FAMILIARITY_LADDER = Object.freeze([
  'unfamiliar', 'basic', 'ordinary', 'comfortable', 'expert', 'specialist'
]);
const LIFESTYLE_LADDER = Object.freeze([
  'destitute', 'poor', 'working-class', 'comfortable', 'affluent', 'wealthy', 'elite'
]);

/** Default (unweighted-by-context) technology-familiarity roll: a bell-ish curve centered on "ordinary"/"comfortable", `contextBias` (-2..+2) shifts the center -- e.g. an advanced-tech Location or a technician role passes a positive bias. */
export function pickNpcTechnologyFamiliarity({ rng, contextBias = 0 } = {}) {
  const center = 2 + Math.round(Math.max(-2, Math.min(2, contextBias))); // index into the 6-value ladder, clamped
  const roll = randomIntInclusive(-1, 1, { rng });
  const index = Math.max(0, Math.min(TECHNOLOGY_FAMILIARITY_LADDER.length - 1, center + roll));
  return TECHNOLOGY_FAMILIARITY_LADDER[index];
}

/** Default lifestyle roll, same shape as `pickNpcTechnologyFamiliarity()`. `contextBias` (-2..+2) -- e.g. a wealthy Location or a noble-house Faction passes a positive bias. */
export function pickNpcLifestyle({ rng, contextBias = 0 } = {}) {
  const center = 2 + Math.round(Math.max(-2, Math.min(2, contextBias)));
  const roll = randomIntInclusive(-1, 1, { rng });
  const index = Math.max(0, Math.min(LIFESTYLE_LADDER.length - 1, center + roll));
  return LIFESTYLE_LADDER[index];
}

// --- targeted reroll wrappers (phase spec §51) -----------------------
// Plain-value fields with no pool-based re-selection needed (name/
// agenda/motivation/secret/etc.) are already covered by
// `npc-concept.js`'s own generic `updateNpcConceptDraft(draft,
// {field: newValue})` patch, per that module's documented "one generic
// patch function covers every independently-rerollable field" design --
// duplicating that here as `rerollNpcX()` wrappers would contradict the
// codebase's own stated convention. The wrappers below exist ONLY for
// fields that need an actual POOL RE-SELECTION (optionally re-applying
// context/role tags), matching the existing precedent
// `npc-narrative-generator.js`'s `rerollNpcPersonality()`/etc. already
// set for the Phase 8D-2 fields.

export function rerollNpcTemperament(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { temperament: pickNpcTemperament({ rng, preferTags }) });
}

export function rerollNpcSocialStyle(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { socialStyle: pickNpcSocialStyle({ rng, preferTags }) });
}

/** Reroll the WHOLE 2-3-trait set (mirrors `rerollNpcFlavorNotes()`'s "reroll the whole list" contract). */
export function rerollNpcPersonalityTraits(draft, { rng, preferTags = [], count } = {}) {
  return updateNpcConceptDraft(draft, { personalityTraits: pickNpcPersonalityTraits({ rng, preferTags, count }) });
}

export function rerollNpcDesire(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { desire: pickNpcDesire({ rng, preferTags }) });
}

export function rerollNpcFear(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { fear: pickNpcFear({ rng, preferTags }) });
}

export function rerollNpcSocialRole(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { socialRole: pickNpcSocialRole({ rng, preferTags }) });
}

export function rerollNpcNarrativeFunction(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { narrativeFunction: pickNpcNarrativeFunction({ rng, preferTags }) });
}

export function rerollNpcLocationRelationship(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { locationRelationship: pickNpcLocationRelationship({ rng, preferTags }) });
}

/** Rerolls the reused `specialistRole` slot (see `data/npc-faction-roles.js`'s header for why this is not a separate `factionRole` field). */
export function rerollNpcFactionRole(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { specialistRole: pickNpcFactionRole({ rng, preferTags }) });
}

export function rerollNpcLoyalty(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { loyalty: pickNpcLoyalty({ rng, preferTags }) });
}

export function rerollNpcComplication(draft, { rng, preferTags = [] } = {}) {
  return updateNpcConceptDraft(draft, { complication: pickNpcComplication({ rng, preferTags }) });
}

/** Reroll the WHOLE relationship-hooks list. */
export function rerollNpcRelationshipHooks(draft, { rng, preferTags = [], count } = {}) {
  return updateNpcConceptDraft(draft, { relationshipHooks: pickNpcRelationshipHooks({ rng, preferTags, count }) });
}

/** Kind-locked reroll -- always re-resolves against the draft's OWN `kind`, so a droid Contact's voice reroll can never cross into the organic pool (mirrors `npc-flavor.js`'s same kind-locking guarantee). */
export function rerollNpcVoice(draft, { rng, preferTags = [] } = {}) {
  if (!draft) return draft;
  return recomposeNpcPublicDescription(updateNpcConceptDraft(draft, { voice: pickNpcVoice({ kind: draft.kind, rng, preferTags }) }));
}

export function rerollNpcSpeechStyle(draft, { rng, preferTags = [] } = {}) {
  if (!draft) return draft;
  return recomposeNpcPublicDescription(updateNpcConceptDraft(draft, { speechStyle: pickNpcSpeechStyle({ kind: draft.kind, rng, preferTags }) }));
}

/** Kind-locked reroll for the PRIMARY `mannerisms` field. */
export function rerollNpcMannerism(draft, { rng, preferTags = [] } = {}) {
  if (!draft) return draft;
  return recomposeNpcPublicDescription(updateNpcConceptDraft(draft, { mannerisms: pickNpcMannerismForKind({ kind: draft.kind, rng, preferTags }) }));
}

/** Kind-locked reroll for `appearance`/`appearanceCues` together (kept in sync -- see `npc/npc-bundle.js`'s own composition of the two). */
export function rerollNpcAppearanceCues(draft, { rng, preferTags = [] } = {}) {
  if (!draft) return draft;
  const appearance = pickNpcAppearanceForKind({ kind: draft.kind, rng, preferTags });
  return recomposeNpcPublicDescription(updateNpcConceptDraft(draft, { appearance, appearanceCues: appearance ? [appearance] : [] }));
}

export function rerollNpcTechnologyFamiliarity(draft, { rng, contextBias = 0 } = {}) {
  return updateNpcConceptDraft(draft, { technologyFamiliarity: pickNpcTechnologyFamiliarity({ rng, contextBias }) });
}

export function rerollNpcLifestyle(draft, { rng, contextBias = 0 } = {}) {
  return updateNpcConceptDraft(draft, { lifestyle: pickNpcLifestyle({ rng, contextBias }) });
}

export function rerollNpcAgeImpression(draft, { rng } = {}) {
  if (!draft) return draft;
  return recomposeNpcPublicDescription(updateNpcConceptDraft(draft, { ageImpression: pickNpcAgeImpression({ kind: draft.kind, rng }) }));
}
