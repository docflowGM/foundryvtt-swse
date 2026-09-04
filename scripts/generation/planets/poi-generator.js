/**
 * PHASE 8D-2 foundation — procedural POI (point-of-interest) draft
 * generator (`GENERATE_NEW_POI` support, and the child half of
 * `GENERATE_NEW_PLANET_AND_POI`).
 *
 * Context weighting: when a caller passes `parentPlanetDraft` (the
 * object `planet-draft.js`'s `createProceduralPlanetDraft()` returns),
 * this reads its `worldClass.biomes` + `worldClass.tags` +
 * `economy.primarySector`/`secondarySectors[].tags` +
 * `government.tags` and merges them into the soft tag preference used
 * for BOTH the POI template pick and the settlement-name pick — a POI
 * generated for a volcanic mining world should skew toward "Mine"/
 * "Processing Plant" over "Fishing Village", and one generated under a
 * theocracy should skew toward "Temple"/"Shrine" over "Government
 * Complex". CORRECTED (Phase 8D-2 review, economy follow-up): also
 * applies `poi-template.js`'s new HARD compatibility filter (using the
 * planet's `worldClass.biomes`+`tags` and `populationScale`) on top of
 * that soft preference -- an uninhabited world can no longer roll
 * "Market District" at all, not just less often. When the hard filter
 * would eliminate every template (an over-constrained context), this
 * falls back to the full pool and records
 * `DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH` in the draft's `diagnostics`
 * array (matching `reward-estimator.js`'s established plain-array
 * diagnostics convention) rather than silently hiding the mismatch. A
 * caller without a planet draft object at hand (e.g. attaching a POI
 * to an existing canonical planet) can instead pass `preferTags`/
 * `planetTags`/`populationScale` directly.
 *
 * CORRECTED (round 3): the draft's `biomes` field is no longer a raw
 * copy of the picked template's biome data. A template's
 * `data/poi-templates.js` field (renamed `biomeAffinities` in round 3)
 * is "where this KIND of POI is plausible" (`ruins`: desert OR
 * jungle), never "what this SPECIFIC generated POI's biome actually
 * is" -- writing the whole affinity list into a draft's `biomes` used
 * to claim a single Ruins POI was simultaneously desert AND jungle,
 * even on an ice-world parent that's neither. `deriveActualPoiBiomes()`
 * now intersects the template's `biomeAffinities` with the PARENT
 * planet's actual biomes (when known) -- a Ruins POI on a jungle world
 * gets `biomes: ['jungle']`, on a desert world `biomes: ['desert']`,
 * and an indoor installation with no affinities at all (Prison,
 * Research Facility, ...) correctly gets `biomes: []` regardless of
 * parent -- its environment doesn't depend on outdoor terrain. With NO
 * parent context at all (a standalone POI with nothing to intersect
 * against), the affinity list is used as-is, as the only information
 * available.
 *
 * CORRECTED (round 3): a generated draft now persists the resolved
 * `generatorContext` (`{ preferTags, planetTags, populationScale }`)
 * it was actually built from. `rerollPoiTemplate()`/`rerollPoiName()`
 * fall back to that stored context for any option the caller omits, so
 * a bare `rerollPoiTemplate(draft, { rng })` reroll still respects the
 * original parent planet's soft preference AND hard compatibility
 * filter -- previously omitting `planetTags`/`populationScale` on a
 * reroll silently dropped the hard filter entirely (reopening the
 * exact "Market District on an uninhabited world" problem the filter
 * exists to prevent) and omitting `preferTags` lost all context bias,
 * even though the draft still had a real parent. The stored context is
 * the RESOLVED values actually used (not the raw `parentPlanetDraft`
 * object, which is heavier to keep around and can go stale) -- never
 * reconstructed by parsing the old POI's own `tags`, which would be
 * lossy and unreliable.
 *
 * Reuses `settlement-name-generator.js` for the POI's place-name rather
 * than inventing a second name generator — a POI IS a settlement/named
 * place, just at a smaller scale than a planet.
 */

import { LOCATION_DRAFT_MODE } from '../location-draft.js';
import { createDraftId } from '../lib/draft-id.js';
import { createProvenance } from '../provenance.js';
import { mergeTags } from '../lib/tag-utils.js';
import { joinClauses } from '../lib/description-composer.js';
import { DIAGNOSTIC_CODE } from '../lib/generator-diagnostics.js';
import { pickCompatiblePoiTemplate } from './poi-template.js';
import { getRandomSettlementName } from '../names/settlement-name-generator.js';

function contextTagsFor(parentPlanetDraft, preferTags) {
  if (!parentPlanetDraft) return preferTags;
  const worldClassBiomes = parentPlanetDraft.worldClass?.biomes ?? [];
  const worldClassTags = parentPlanetDraft.worldClass?.tags ?? [];
  const economySectors = [parentPlanetDraft.economy?.primarySector, ...(parentPlanetDraft.economy?.secondarySectors ?? [])].filter(Boolean);
  const economyTags = economySectors.flatMap((e) => e.tags || []);
  const governmentTags = parentPlanetDraft.government?.tags ?? [];
  return mergeTags(preferTags, worldClassBiomes, worldClassTags, economyTags, governmentTags);
}

function planetTagsFor(parentPlanetDraft, explicitPlanetTags) {
  if (explicitPlanetTags.length) return explicitPlanetTags;
  if (!parentPlanetDraft) return [];
  return mergeTags(parentPlanetDraft.worldClass?.biomes ?? [], parentPlanetDraft.worldClass?.tags ?? []);
}

/**
 * The REAL biome list (never merged with procedural tags) for a known
 * parent planet -- the intersection basis for `deriveActualPoiBiomes()`.
 * Falls back to `planetTags` (whatever hard-filter context is known,
 * biomes+tags merged) for a caller that supplied that directly instead
 * of a `parentPlanetDraft` -- still safe, because `biomeAffinities`
 * values are always real Library biomes to begin with (self-checked at
 * `data/poi-templates.js`'s module load), so intersecting against a
 * slightly broader pool can only ever narrow correctly, never smuggle
 * in a non-real value.
 */
function parentBiomesFor(parentPlanetDraft, planetTags) {
  if (parentPlanetDraft?.worldClass?.biomes) return parentPlanetDraft.worldClass.biomes;
  return planetTags;
}

/**
 * Derive a POI draft's ACTUAL `biomes` from its template's
 * `biomeAffinities` (where this KIND of POI is plausible) and the
 * parent planet's real biomes (what this world's biome actually is).
 * See module doc for the three cases (outdoor + known parent =
 * intersection; indoor installation = empty regardless; no parent
 * context at all = affinity list used as the only information
 * available).
 */
function deriveActualPoiBiomes(template, parentBiomes) {
  if (!template.biomeAffinities.length) return [];
  if (!parentBiomes.length) return template.biomeAffinities.slice();
  return template.biomeAffinities.filter((biome) => parentBiomes.includes(biome));
}

function composeSummary(template, name) {
  return joinClauses([`${name} is a`, `${template.value.replace(/-/g, ' ')}`, `known locally as "${template.label}."`], ' ');
}

/**
 * Generate a full procedural POI draft.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string} [options.parentLocationId] - a real canonical planet
 *   id, when the parent planet is already committed.
 * @param {string} [options.parentDraftId] - another draft's id in the
 *   same batch, when the parent planet is itself still a draft (e.g.
 *   `createProceduralPlanetDraft()`'s own `draftId`). Never both this
 *   and `parentLocationId`.
 * @param {object} [options.parentPlanetDraft] - optional planet draft
 *   object to derive context tags, the actual biomes, AND the hard
 *   compatibility filter from (see module doc); does not by itself set
 *   `parentDraftId` -- pass that explicitly too if linking.
 * @param {string[]} [options.preferTags] - explicit SOFT context tags,
 *   used directly or merged with `parentPlanetDraft`'s tags if both given.
 * @param {string[]} [options.planetTags] - explicit HARD-filter tags
 *   (biomes+tags); derived from `parentPlanetDraft` when omitted; also
 *   the actual-biome intersection basis when `parentPlanetDraft` itself
 *   isn't supplied.
 * @param {string} [options.populationScale] - explicit HARD-filter
 *   population scale; derived from `parentPlanetDraft` when omitted.
 */
export function createProceduralPoiDraft({
  rng,
  parentLocationId = '',
  parentDraftId = '',
  parentPlanetDraft = null,
  preferTags = [],
  planetTags = [],
  populationScale = ''
} = {}) {
  const contextTags = contextTagsFor(parentPlanetDraft, preferTags);
  const hardFilterTags = planetTagsFor(parentPlanetDraft, planetTags);
  const hardFilterScale = populationScale || parentPlanetDraft?.populationScale || '';
  const { entry: template, contextMismatch } = pickCompatiblePoiTemplate({ rng, preferTags: contextTags, planetTags: hardFilterTags, populationScale: hardFilterScale });
  const nameDraft = getRandomSettlementName({ rng, preferTags: contextTags });
  const name = `${nameDraft.name} ${template.label}`;
  const generatorContext = { preferTags: contextTags, planetTags: hardFilterTags, populationScale: hardFilterScale };
  return {
    draftId: createDraftId('location'),
    mode: LOCATION_DRAFT_MODE.GENERATE_NEW_POI,
    locationId: '',
    parentLocationId: String(parentLocationId || ''),
    parentDraftId: String(parentDraftId || ''),
    librarySeedId: '',
    name,
    nameDraft,
    template,
    category: 'planetary',
    type: template.type,
    biomes: deriveActualPoiBiomes(template, parentBiomesFor(parentPlanetDraft, hardFilterTags)),
    tags: mergeTags(template.tags, contextTags),
    generatorContext,
    summary: composeSummary(template, name),
    diagnostics: contextMismatch ? [DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH] : [],
    provenance: createProvenance({ presetId: LOCATION_DRAFT_MODE.GENERATE_NEW_POI, templateId: template.value })
  };
}

/**
 * Reroll ONLY the POI template (kind of place), keeping the same
 * name/parent linkage. Any of `preferTags`/`planetTags`/
 * `populationScale`/`parentPlanetDraft` the caller omits falls back to
 * the draft's own stored `generatorContext` (or a freshly supplied
 * `parentPlanetDraft`, re-resolved exactly like creation does) -- so a
 * bare `rerollPoiTemplate(draft, { rng })` still respects the ORIGINAL
 * parent's soft preference and hard compatibility filter, never
 * silently losing them. Passing an explicit option overrides the
 * stored context for this reroll AND updates what's stored going
 * forward (e.g. re-parenting a POI to a different planet).
 */
export function rerollPoiTemplate(draft, { rng, preferTags, planetTags, populationScale, parentPlanetDraft = null } = {}) {
  const stored = draft.generatorContext ?? { preferTags: [], planetTags: [], populationScale: '' };
  const resolvedPreferTags = preferTags ?? (parentPlanetDraft ? contextTagsFor(parentPlanetDraft, []) : stored.preferTags);
  const resolvedPlanetTags = planetTags ?? (parentPlanetDraft ? planetTagsFor(parentPlanetDraft, []) : stored.planetTags);
  const resolvedPopulationScale = populationScale ?? (parentPlanetDraft?.populationScale) ?? stored.populationScale;
  const { entry: template, contextMismatch } = pickCompatiblePoiTemplate({ rng, preferTags: resolvedPreferTags, planetTags: resolvedPlanetTags, populationScale: resolvedPopulationScale });
  const name = `${draft.nameDraft.name} ${template.label}`;
  const generatorContext = { preferTags: resolvedPreferTags, planetTags: resolvedPlanetTags, populationScale: resolvedPopulationScale };
  return {
    ...draft,
    template,
    type: template.type,
    biomes: deriveActualPoiBiomes(template, parentBiomesFor(parentPlanetDraft, resolvedPlanetTags)),
    name,
    tags: mergeTags(template.tags, resolvedPreferTags),
    generatorContext,
    summary: composeSummary(template, name),
    diagnostics: contextMismatch ? [DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH] : []
  };
}

/** Reroll ONLY the name, keeping the same template/kind and parent linkage. Falls back to the draft's stored `generatorContext.preferTags` when the caller omits `preferTags`, same as `rerollPoiTemplate()`. */
export function rerollPoiName(draft, { rng, preferTags } = {}) {
  const resolvedPreferTags = preferTags ?? draft.generatorContext?.preferTags ?? [];
  const nameDraft = getRandomSettlementName({ rng, preferTags: resolvedPreferTags });
  const name = `${nameDraft.name} ${draft.template.label}`;
  return { ...draft, nameDraft, name, summary: composeSummary(draft.template, name) };
}
