/**
 * PHASE 8D-3B production — full NPC concept composer.
 *
 * Composes every existing NPC sub-generator into ONE `npc-concept.js`
 * draft: `selectMemberKind()`/`selectFactionSpeciesWithLocality()`/
 * `selectSpeciesId()` (species/droid selection, `population-profile.js`/
 * `recruitment-profile.js` — built in Phase 8D-1 but never called from
 * a generator until now), `npc-role.js` (role/occupation, new this
 * phase), `rank-metadata.js` (commandTier/factionRankTitle), and
 * `npc-narrative-generator.js` (appearance/personality/mannerism/
 * motivation/agenda/secret/suggestion). This module owns no table data
 * or pick logic of its own — deliberately just composition, matching
 * `planet-draft.js`/`planet-bundle.js`'s own "avoid the procedural god
 * object" discipline.
 *
 * Name generation is the ONE Foundry-dependent step
 * (`chargen-shared.js`'s `getRandomName()`/`getRandomDroidName()`,
 * per the phase spec's "SHARED NAME AUTHORITY" section — reused, not
 * reimplemented). Exactly like `location-population-profile.js`'s
 * `resolveLocationPopulationProfile()`, that ONE Foundry-dependent call
 * is isolated behind a dynamic import and an injectable
 * `nameProvider`/`droidNameProvider` — every other function in this
 * module stays pure and Node-testable, and a caller (test or otherwise)
 * can inject a deterministic synchronous provider instead of the
 * default async Foundry-fetch-backed one. `createGeneratedNpcConcept()`
 * is therefore async; every OTHER export in this module is a plain
 * sync function.
 *
 * `kind`/species selection is caller-driven, never inferred here: pass
 * `populationProfile` (a Faction's own, from `population-profile.js`)
 * to bias living/droid + species selection toward that Faction's
 * explicit identity; pass `locationPopulationProfile` +
 * `recruitmentProfile`/`localityBias` to additionally blend in a
 * Location's demographics (`selectFactionSpeciesWithLocality()`); pass
 * neither for a context-free standalone NPC (falls back to a neutral
 * mixed/open default). `droidLikelihood` is a SEPARATE, independent
 * input for the no-Faction-context case — see
 * `droidLikelihoodForPrevalence()` below — matching the phase spec's
 * "Droids are conceptually separate from Species demographics" rule;
 * when a `populationProfile` IS supplied, its own
 * `livingDroidComposition` takes over instead (a Faction's explicit
 * population composition always wins over a generic Location droid
 * prevalence guess).
 */

import { createNpcConceptDraft, NPC_CONCEPT_KIND } from '../npc-concept.js';
import { generateNpcNarrativeFacts } from './npc-narrative-generator.js';
import { pickNpcRole, pickNpcDroidRole } from './npc-role.js';
import { generateNpcFlavorNotes } from './npc-flavor.js';
import { pickNpcOccupation } from './npc-occupation.js';
import { rollNpcCompetence } from './npc-competence.js';
import {
  pickNpcAgeImpression, pickNpcTemperament, pickNpcSocialStyle, pickNpcPersonalityTraits,
  pickNpcDesire, pickNpcFear, pickNpcSocialRole, pickNpcNarrativeFunction,
  pickNpcFactionRole, pickNpcLoyalty, pickNpcComplication, pickNpcRelationshipHooks,
  pickNpcVoice, pickNpcSpeechStyle, pickNpcMannerismForKind, pickNpcAppearanceForKind,
  pickNpcTechnologyFamiliarity, pickNpcLifestyle
} from './npc-characterization.js';
import { generatePlanetSuggestedJobArchetypeTags, deriveSuggestedOppositionTags } from '../planets/planet-hooks.js';
import { composeNpcPublicDescription } from '../lib/description-composer.js';
import {
  createContactLocationLink, rollContactLocationRelationshipFlavor, CONTACT_LOCATION_LINK_STATUS, CONTACT_LOCATION_LINK_SOURCE
} from './npc-location-link.js';
import {
  selectMemberKind, selectSpeciesId, createPopulationProfile
} from '../population-profile.js';
import { selectFactionSpeciesWithLocality } from '../recruitment-profile.js';
import {
  COMMAND_TIER, MILITARY_RANK_TIER_MAP, resolveCommandTier
} from '../rank-metadata.js';
import { pickRandom } from '../lib/weighted-random.js';
import { NPC_ROLE_TIER } from '../data/npc-roles.js';

/** `PLANET_DROID_PREVALENCE` value -> base droid-selection probability for a context-free NPC roll (no Faction populationProfile supplied). Deliberately duplicated as PLAIN NUMBERS here rather than importing `planets/planet-profile.js` (a Faction/NPC module has no business depending on the planet module — see the phase spec's layering; a caller who HAS a planet draft passes its `droidPrevalence` string straight in, this table is the only place that maps it to a probability). */
const DROID_LIKELIHOOD_BY_PREVALENCE = Object.freeze({
  rare: 0.03,
  low: 0.08,
  normal: 0.15,
  high: 0.30,
  'very-high': 0.50,
  automated: 0.75
});

/** Resolve a droid-selection probability for a `PLANET_DROID_PREVALENCE`-shaped string, or the neutral 0.15 default for an unrecognized/omitted value. */
export function droidLikelihoodForPrevalence(prevalence) {
  return DROID_LIKELIHOOD_BY_PREVALENCE[prevalence] ?? 0.15;
}

/**
 * CORRECTION (independent review of PR #964's initial head): a
 * generated NPC's `technologyFamiliarity`/`lifestyle` were biased
 * ONLY by the NPC's own rolled role tier -- a Location's real
 * technology/economy context (now available from Phase 8D-3A's planet
 * drafts) never reached these two fields at all, even though every
 * OTHER context-sensitive pick (occupation/appearance/flavor/voice/
 * speech) already receives Location context indirectly via
 * `preferTags`. `resolveLocationContextBias()` below closes that gap
 * with ONE structured optional input rather than a growing pile of
 * separate scalar parameters -- see `createGeneratedNpcConcept()`'s own
 * `locationContext` doc.
 *
 * Deliberately duplicated as PLAIN STRING KEYS here, exactly like
 * `DROID_LIKELIHOOD_BY_PREVALENCE` above -- this module still never
 * imports `planets/planet-profile.js` (the Faction/NPC layer has no
 * business depending on the planet module); a caller who HAS a planet
 * draft passes its `technologyLevel`/`technologyAccess` STRINGS
 * straight through `locationContext`, and this is the only place those
 * strings get mapped to a bias number.
 */
const TECHNOLOGY_LEVEL_BIAS = Object.freeze({
  primitive: -2, 'pre-industrial': -1.5, industrial: -0.5, frontier: -0.5,
  'galactic-standard': 0, advanced: 1, 'cutting-edge': 2
});
const TECHNOLOGY_ACCESS_BIAS = Object.freeze({
  isolated: -1.5, scarce: -1, limited: -0.3, common: 0.3, ubiquitous: 1.5
});
const WEALTHY_ECONOMY_TAGS = new Set(['financial-services', 'trade', 'urban', 'cosmopolitan']);
const MODEST_ECONOMY_TAGS = new Set(['mining', 'frontier', 'rural', 'salvage', 'agriculture']);

/**
 * Resolve `{ technologyBias, lifestyleBias }` (each roughly -2..+2, fed
 * straight into `pickNpcTechnologyFamiliarity()`/`pickNpcLifestyle()`)
 * from an OPTIONAL `locationContext`. Returns `null` for either bias
 * when `locationContext` supplies nothing relevant, so the caller falls
 * back to its own default (role-tier-derived) heuristic instead of a
 * silent 0 -- "no Location context supplied" and "Location context is
 * neutral" are different states.
 */
export function resolveLocationContextBias(locationContext) {
  if (!locationContext) return { technologyBias: null, lifestyleBias: null };
  const { technologyLevel, technologyAccess, economyTags = [], locationTags = [] } = locationContext;
  let technologyBias = null;
  if (technologyLevel in TECHNOLOGY_LEVEL_BIAS || technologyAccess in TECHNOLOGY_ACCESS_BIAS) {
    technologyBias = (TECHNOLOGY_LEVEL_BIAS[technologyLevel] ?? 0) + (TECHNOLOGY_ACCESS_BIAS[technologyAccess] ?? 0);
  }
  const combinedTags = [...economyTags, ...locationTags];
  let lifestyleBias = null;
  if (combinedTags.length) {
    const wealthy = combinedTags.filter((t) => WEALTHY_ECONOMY_TAGS.has(t)).length;
    const modest = combinedTags.filter((t) => MODEST_ECONOMY_TAGS.has(t)).length;
    if (wealthy || modest) lifestyleBias = Math.max(-2, Math.min(2, wealthy - modest));
  }
  return { technologyBias, lifestyleBias };
}

/** Default command-tier roll weights for a generated Contact: heavily rank-and-file, rarely strategic. `leadershipBoost` (e.g. from a Faction's `doctrine.eliteAvailability`) multiplies every tier ABOVE `rank-and-file`, softly shifting the distribution upward without ever excluding the common case. */
const BASE_COMMAND_TIER_WEIGHTS = Object.freeze([
  { value: COMMAND_TIER.NONE, weight: 3 },
  { value: COMMAND_TIER.RANK_AND_FILE, weight: 5 },
  { value: COMMAND_TIER.FIRETEAM_LEADERSHIP, weight: 2 },
  { value: COMMAND_TIER.SQUAD_COMMAND, weight: 1.5 },
  { value: COMMAND_TIER.SPECIALIST, weight: 2 },
  { value: COMMAND_TIER.SENIOR_SPECIALIST, weight: 1 },
  { value: COMMAND_TIER.JUNIOR_COMMAND, weight: 0.75 },
  { value: COMMAND_TIER.TACTICAL_COMMAND, weight: 0.4 },
  { value: COMMAND_TIER.OPERATIONAL_COMMAND, weight: 0.2 },
  { value: COMMAND_TIER.STRATEGIC_COMMAND, weight: 0.08 }
]);

const LEADERSHIP_TIERS = new Set([
  COMMAND_TIER.FIRETEAM_LEADERSHIP, COMMAND_TIER.SQUAD_COMMAND, COMMAND_TIER.SENIOR_SPECIALIST,
  COMMAND_TIER.JUNIOR_COMMAND, COMMAND_TIER.TACTICAL_COMMAND, COMMAND_TIER.OPERATIONAL_COMMAND, COMMAND_TIER.STRATEGIC_COMMAND
]);

/**
 * Roll a commandTier for one generated Contact. `leadershipBoost`
 * (default 1 = unbiased) multiplies every above-rank-and-file tier's
 * weight — a Faction with high `doctrine.eliteAvailability`/
 * `reinforcementCapability` can pass a boost > 1 so its generated
 * roster skews toward more leaders/specialists, never a hard guarantee.
 */
export function rollCommandTier({ rng, leadershipBoost = 1 } = {}) {
  const entries = BASE_COMMAND_TIER_WEIGHTS.map((entry) => ({
    ...entry,
    weight: LEADERSHIP_TIERS.has(entry.value) ? entry.weight * leadershipBoost : entry.weight
  }));
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = (rng ?? Math.random)() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return COMMAND_TIER.NONE;
}

/** Reverse-lookup: a display rank title whose `tierMap` entry resolves to `commandTier`. Returns '' if the tier is NONE or no title in the map maps to it (never invents a title). */
export function titleForCommandTier(commandTier, tierMap = MILITARY_RANK_TIER_MAP, { rng } = {}) {
  if (!commandTier || commandTier === COMMAND_TIER.NONE) return '';
  const matches = Object.entries(tierMap).filter(([, tier]) => tier === commandTier).map(([title]) => title);
  return pickRandom(matches, { rng }) ?? '';
}

async function resolveNameProvider(kind, { nameProvider, droidNameProvider } = {}) {
  if (kind === NPC_CONCEPT_KIND.DROID && droidNameProvider) return droidNameProvider;
  if (kind === NPC_CONCEPT_KIND.LIVING && nameProvider) return nameProvider;
  const mod = await import('../../apps/chargen/chargen-shared.js');
  return kind === NPC_CONCEPT_KIND.DROID ? mod.getRandomDroidName : mod.getRandomName;
}

/**
 * Compose one full, generated NPC concept draft. See module doc for the
 * full field-by-field reuse map. Returns `null` only if
 * `createNpcConceptDraft()` itself would (an invalid `kind`), which
 * cannot happen from this function's own internal kind resolution — the
 * null case exists purely as a defensive contract match.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.preferTags] - soft role/narrative preference tags (organization-family/economy context).
 * @param {object} [options.populationProfile] - a Faction's `population-profile.js` profile (kind + species selection authority when supplied).
 * @param {object} [options.locationPopulationProfile] - a Location's `location-population-profile.js` profile, blended per `recruitmentProfile.localityBias` when both are supplied alongside `populationProfile`.
 * @param {object} [options.recruitmentProfile] - `recruitment-profile.js` shape; `localityBias` read from here when supplied.
 * @param {string} [options.droidPrevalence] - a `PLANET_DROID_PREVALENCE` string, used ONLY when `populationProfile` is omitted.
 * @param {string[]} [options.availableSpeciesIds] - canonical `SpeciesRegistry` ids to choose among (caller-supplied, per the "species ids are always caller-supplied" discipline).
 * @param {string} [options.commandTier] - explicit `COMMAND_TIER`; rolled via `rollCommandTier()` if omitted.
 * @param {number} [options.leadershipBoost] - forwarded to `rollCommandTier()` when `commandTier` is not explicit.
 * @param {object} [options.rankTierMap] - display-title map for `titleForCommandTier()` (defaults to the military example map).
 * @param {object} [options.locationContext] - optional structured Location signal: `{ technologyLevel, technologyAccess, technologySpecialties, economyTags, locationTags, locationId, locationDraftId }`. `technologyLevel`/`technologyAccess` (plain `planet-profile.js`-shaped strings -- this module still never imports that planet module, see `resolveLocationContextBias()`'s doc) bias `technologyFamiliarity`; `economyTags`/`locationTags` additionally bias `lifestyle` AND are folded into every other context-sensitive pick's `preferTags`. One structured object rather than a growing pile of separate scalar parameters.
 * @param {string} [options.factionId] - a REAL canonical Faction id (post-commit context only).
 * @param {string} [options.factionDraftId] - the draft:faction:... id of the `faction-draft.js` Faction this Contact is being generated FOR, pre-commit -- `factions/faction-bundle.js` always passes its own reserved `draftId` here so a generated Contact can always be traced back to its parent Faction draft even before either is committed.
 * @param {string} [options.linkedLocationId] - a REAL canonical Location id. Takes precedence over `locationContext.locationId` when BOTH are supplied (see the `resolvedLocationId` precedence note below) -- a caller should normally only ever supply one or the other.
 * @param {string} [options.locationDraftId] - a `planets/planet-draft.js` (or other Location-domain) draft id, pre-commit. Takes precedence over `locationContext.locationDraftId` when BOTH are supplied, same as `linkedLocationId` above.
 * @param {number} [options.flavorNoteCount] - explicit flavor-note count override; defaults to `npc-flavor.js`'s own 0-3 weighted roll.
 * @param {object} [options.nameProvider] - override for the living-name async provider (tests inject a deterministic stub).
 * @param {object} [options.droidNameProvider] - override for the droid-name async provider.
 */
export async function createGeneratedNpcConcept({
  rng,
  preferTags = [],
  populationProfile = null,
  locationPopulationProfile = null,
  recruitmentProfile = null,
  droidPrevalence = 'normal',
  availableSpeciesIds = [],
  commandTier,
  leadershipBoost = 1,
  rankTierMap = MILITARY_RANK_TIER_MAP,
  factionId = '',
  factionDraftId = '',
  linkedLocationId = '',
  locationDraftId = '',
  locationContext = null,
  flavorNoteCount,
  nameProvider,
  droidNameProvider,
  ...rest
} = {}) {
  // Fold locationContext's own tags into preferTags ONCE, at the top --
  // every existing preferTags-consuming pick below (role/occupation/
  // appearance/flavor/voice/speech/temperament/...) benefits
  // automatically, without threading a second tag array through every
  // call site individually. See `resolveLocationContextBias()`'s doc
  // for why technologyFamiliarity/lifestyle additionally need their
  // OWN numeric bias rather than only a soft tag preference.
  if (locationContext) {
    preferTags = [...preferTags, ...(locationContext.locationTags ?? []), ...(locationContext.economyTags ?? []), ...(locationContext.technologySpecialties ?? [])];
  }
  const { technologyBias: locationTechnologyBias, lifestyleBias: locationLifestyleBias } = resolveLocationContextBias(locationContext);

  // CORRECTION (independent review round 2 -- "duplicate Location
  // identity inputs"): `locationContext` and the separate
  // `linkedLocationId`/`locationDraftId` scalar params both claim to
  // carry Location identity. Rather than letting a caller supply
  // conflicting values that silently disagree (context carries bias
  // from Location A while the NPC links to Location B), the explicit
  // scalar params always WIN when supplied -- they are the caller's
  // unambiguous, single-purpose identity args -- and `locationContext`'s
  // own `locationId`/`locationDraftId` are only a fallback for a caller
  // that passes ONLY the structured object. Every place below that
  // previously read `linkedLocationId`/`locationDraftId` directly now
  // reads these resolved values instead, so a caller who supplies
  // `locationContext.locationDraftId` alone (no separate scalar) still
  // gets `locationRelationship` generated and `linkedLocationId`/
  // `locationDraftId` populated on the resulting draft.
  const resolvedLocationId = linkedLocationId || locationContext?.locationId || '';
  const resolvedLocationDraftId = locationDraftId || locationContext?.locationDraftId || '';

  const resolvedCommandTier = commandTier || rollCommandTier({ rng, leadershipBoost });

  let kind;
  let speciesId = '';
  if (populationProfile) {
    kind = selectMemberKind(populationProfile, { rng });
    if (kind === 'living') {
      speciesId = selectFactionSpeciesWithLocality({
        speciesPolicy: populationProfile.speciesPolicy,
        availableSpeciesIds,
        locationPopulationProfile,
        localityBias: recruitmentProfile?.localityBias ?? 0.5,
        rng
      }) || '';
    }
  } else {
    const roll = (rng ?? Math.random)();
    kind = roll < droidLikelihoodForPrevalence(droidPrevalence) ? 'droid' : 'living';
    if (kind === 'living') {
      speciesId = locationPopulationProfile
        ? (selectFactionSpeciesWithLocality({ speciesPolicy: createPopulationProfile().speciesPolicy, availableSpeciesIds, locationPopulationProfile, localityBias: 0.6, rng }) || '')
        : (selectSpeciesId(createPopulationProfile().speciesPolicy, availableSpeciesIds, { rng }) || '');
    }
  }

  const conceptKind = kind === 'droid' ? NPC_CONCEPT_KIND.DROID : NPC_CONCEPT_KIND.LIVING;
  const roleEntry = conceptKind === NPC_CONCEPT_KIND.DROID
    ? pickNpcDroidRole({ rng, preferTags, commandTier: resolvedCommandTier })
    : pickNpcRole({ rng, preferTags, commandTier: resolvedCommandTier });
  const roleTags = roleEntry?.tags ?? [];
  const combinedPreferTags = [...preferTags, ...roleTags];

  const narrative = generateNpcNarrativeFacts({ rng, preferTags });
  const factionRankTitle = titleForCommandTier(resolvedCommandTier, rankTierMap, { rng });
  // Flavor notes are biased by the SAME context tags as everything else,
  // plus the rolled role's own tags (so a mechanic's notes skew toward
  // grease/tools without that being a hard requirement) -- see
  // npc-flavor.js's header for why this stays a soft preference roll,
  // never a deterministic role -> quirk mapping.
  const flavorNotes = generateNpcFlavorNotes({ kind: conceptKind, preferTags, roleTags, count: flavorNoteCount, rng });

  // PHASE 8D-3B schema addendum: occupation is living-only (a droid's
  // role, e.g. "protocol droid"/"mining droid", already reads as an
  // occupation -- see data/npc-occupations.js's header); every other
  // new field below is kind-agnostic OR kind-dispatched as noted.
  const occupationEntry = conceptKind === NPC_CONCEPT_KIND.LIVING ? pickNpcOccupation({ rng, roleValue: roleEntry?.value, preferTags }) : null;
  // Kind-dispatch fix (phase completion report): `appearance` previously
  // ALWAYS came from `npc-narrative-generator.js`'s organic-only pool,
  // including for droids -- now routed through `pickNpcAppearanceForKind()`.
  const appearance = pickNpcAppearanceForKind({ kind: conceptKind, rng, preferTags });
  const ageImpression = pickNpcAgeImpression({ kind: conceptKind, rng });
  const temperament = pickNpcTemperament({ rng, preferTags: combinedPreferTags });
  const socialStyle = pickNpcSocialStyle({ rng, preferTags: combinedPreferTags });
  const personalityTraits = pickNpcPersonalityTraits({ rng, preferTags });
  const desire = pickNpcDesire({ rng, preferTags });
  const fear = pickNpcFear({ rng, preferTags });
  const socialRole = pickNpcSocialRole({ rng, preferTags });
  const narrativeFunction = pickNpcNarrativeFunction({ rng, preferTags });
  // CORRECTION (independent review round 3 -- Contact<->Location
  // hardening): a resolved Location association is now built as a
  // proper `locationLinks[]` entry (the schema's real authority)
  // rather than a lone `locationRelationship` scalar -- see
  // `npc-concept.js`'s own `legacyLocationFields` doc for how the old
  // scalar fields (`linkedLocationId`/`locationDraftId`/
  // `locationRelationship`) stay populated as DERIVED mirrors of this.
  const primaryLocationLink = (resolvedLocationId || resolvedLocationDraftId)
    ? createContactLocationLink({
      locationId: resolvedLocationId,
      locationDraftId: resolvedLocationDraftId,
      ...rollContactLocationRelationshipFlavor({ rng, preferTags }),
      status: CONTACT_LOCATION_LINK_STATUS.ACTIVE,
      primary: true,
      source: CONTACT_LOCATION_LINK_SOURCE.GENERATED
    })
    : null;
  // specialistRole (the reused "factionRole" slot -- see npc-concept.js's
  // own doc comment) is only rolled for a plausible Faction context:
  // an explicit populationProfile (faction-bundle.js's own
  // Contact-generation path), an explicit committed factionId, OR a
  // pre-commit factionDraftId (CORRECTION, independent review round 2 --
  // a Faction draft this Contact is being generated FOR is real Faction
  // context even before either draft is committed; previously only the
  // canonical-id case was recognized, so a Contact generated for a
  // fresh, not-yet-committed Faction draft never got a specialistRole).
  const isFactionContext = Boolean(populationProfile) || Boolean(factionId) || Boolean(factionDraftId);
  const specialistRole = isFactionContext ? pickNpcFactionRole({ rng, preferTags }) : '';
  const loyalty = pickNpcLoyalty({ rng, preferTags });
  const complication = pickNpcComplication({ rng, preferTags });
  const relationshipHooks = pickNpcRelationshipHooks({ rng, preferTags });
  const voice = pickNpcVoice({ kind: conceptKind, rng, preferTags: combinedPreferTags });
  const speechStyle = pickNpcSpeechStyle({ kind: conceptKind, rng, preferTags: combinedPreferTags });
  // Kind-dispatch fix (phase completion report): every NPC, droids
  // included, previously drew from the organic-only mannerism pool.
  const mannerisms = pickNpcMannerismForKind({ kind: conceptKind, rng, preferTags: combinedPreferTags });
  // CORRECTION (independent review): the role-derived bias below no
  // longer stands ALONE -- when a caller supplies `locationContext`,
  // its own technology/economy signal (`resolveLocationContextBias()`)
  // is ADDED to the role-derived bias (an advanced-tech world's own
  // technician reads as MORE tech-familiar than either signal alone
  // would suggest), never simply overridden. `pickNpcTechnologyFamiliarity()`/
  // `pickNpcLifestyle()` already clamp the combined bias internally.
  const roleTechnologyBias = roleTags.includes('technology') || roleTags.includes('research') ? 1 : 0;
  const technologyBias = roleTechnologyBias + (locationTechnologyBias ?? 0);
  const technologyFamiliarity = pickNpcTechnologyFamiliarity({ rng, contextBias: technologyBias });
  const roleLifestyleBias = roleEntry?.tier === NPC_ROLE_TIER.LEADERSHIP ? 1 : (roleEntry?.tier === NPC_ROLE_TIER.COMMON ? -0.5 : 0);
  const lifestyleBias = roleLifestyleBias + (locationLifestyleBias ?? 0);
  const lifestyle = pickNpcLifestyle({ rng, contextBias: lifestyleBias });
  const competenceLevel = rollNpcCompetence({ rng, roleTier: roleEntry?.tier, commandTier: resolvedCommandTier });
  // Reuse note: `generatePlanetSuggestedJobArchetypeTags()`/
  // `deriveSuggestedOppositionTags()` (`planets/planet-hooks.js`) are
  // generic tag utilities with no actual planet-specific dependency
  // (unlike e.g. PLANET_DROID_PREVALENCE, which genuinely IS
  // planet-context-derived and stays out of this module) -- reused here
  // per the phase spec's explicit "do not make a new Job-archetype
  // table" instruction, never a duplicate catalog.
  const suggestedJobArchetypeTags = generatePlanetSuggestedJobArchetypeTags({ rng, preferTags: combinedPreferTags, count: 2 });
  const suggestedOppositionTags = deriveSuggestedOppositionTags(combinedPreferTags);

  const nameFn = await resolveNameProvider(conceptKind, { nameProvider, droidNameProvider });
  const name = await nameFn();

  const publicDescription = composeNpcPublicDescription({
    name, ageImpression, occupation: occupationEntry?.value ?? '', role: roleEntry?.value ?? '',
    appearanceCues: appearance ? [appearance] : [], voice, speechStyle, mannerism: mannerisms,
    flavorNotes: flavorNotes.map((n) => n.text)
  });

  const base = {
    kind: conceptKind,
    name,
    role: roleEntry?.value ?? '',
    occupation: occupationEntry?.value ?? '',
    socialRole,
    narrativeFunction,
    competenceLevel,
    ageImpression,
    appearanceCues: appearance ? [appearance] : [],
    temperament,
    socialStyle,
    personalityTraits,
    desire,
    fear,
    loyalty,
    voice,
    speechStyle,
    technologyFamiliarity,
    lifestyle,
    relationshipHooks,
    complication,
    factionId,
    factionDraftId,
    locationLinks: primaryLocationLink ? [primaryLocationLink] : [],
    factionRankTitle,
    commandTier: resolvedCommandTier,
    specialistRole,
    appearance,
    personality: narrative.personality,
    mannerisms,
    motivation: narrative.motivation,
    agenda: narrative.agenda,
    secret: narrative.secret,
    suggestion: narrative.suggestion,
    publicDescription,
    suggestedJobArchetypeTags,
    suggestedOppositionTags,
    flavorNotes,
    profileAffinity: { roleTags },
    ...rest
  };

  if (conceptKind === NPC_CONCEPT_KIND.LIVING) {
    return createNpcConceptDraft({ ...base, speciesId });
  }
  return createNpcConceptDraft({
    ...base,
    droidRole: roleEntry?.value ?? '',
    chassisSuggestion: roleEntry?.chassisSuggestion ?? '',
    primaryFunction: roleEntry?.value ?? ''
  });
}
