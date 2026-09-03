/**
 * PHASE 8D-2 foundation — procedural POI (point-of-interest) draft
 * generator (`GENERATE_NEW_POI` support, and the child half of
 * `GENERATE_NEW_PLANET_AND_POI`).
 *
 * Context weighting: when a caller passes `parentPlanetDraft` (the
 * object `planet-draft.js`'s `createProceduralPlanetDraft()` returns),
 * this reads its `worldClass.biomes` + `worldClass.tags` +
 * `economy.primarySector`/`secondarySectors[].tags` and merges them
 * into the soft tag preference used for BOTH the POI template pick and
 * the settlement-name pick — a POI generated for a volcanic mining
 * world should skew toward "Mine"/"Processing Plant" over "Fishing
 * Village". CORRECTED (Phase 8D-2 review, economy follow-up): also
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
  return mergeTags(preferTags, worldClassBiomes, worldClassTags, economyTags);
}

function planetTagsFor(parentPlanetDraft, explicitPlanetTags) {
  if (explicitPlanetTags.length) return explicitPlanetTags;
  if (!parentPlanetDraft) return [];
  return mergeTags(parentPlanetDraft.worldClass?.biomes ?? [], parentPlanetDraft.worldClass?.tags ?? []);
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
 *   object to derive context tags AND the hard compatibility filter
 *   from (see module doc); does not by itself set `parentDraftId` --
 *   pass that explicitly too if linking.
 * @param {string[]} [options.preferTags] - explicit SOFT context tags,
 *   used directly or merged with `parentPlanetDraft`'s tags if both given.
 * @param {string[]} [options.planetTags] - explicit HARD-filter tags
 *   (biomes+tags); derived from `parentPlanetDraft` when omitted.
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
    biomes: template.tags,
    tags: mergeTags(template.tags, contextTags),
    summary: composeSummary(template, name),
    diagnostics: contextMismatch ? [DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH] : [],
    provenance: createProvenance({ presetId: LOCATION_DRAFT_MODE.GENERATE_NEW_POI, templateId: template.value })
  };
}

/** Reroll ONLY the POI template (kind of place), keeping the same name/tags-context and parent linkage. Re-applies the same hard compatibility filter if `planetTags`/`populationScale` are supplied. */
export function rerollPoiTemplate(draft, { rng, preferTags = [], planetTags = [], populationScale = '' } = {}) {
  const { entry: template, contextMismatch } = pickCompatiblePoiTemplate({ rng, preferTags, planetTags, populationScale });
  const name = `${draft.nameDraft.name} ${template.label}`;
  return {
    ...draft,
    template,
    type: template.type,
    biomes: template.tags,
    name,
    tags: mergeTags(template.tags, preferTags),
    summary: composeSummary(template, name),
    diagnostics: contextMismatch ? [DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH] : []
  };
}

/** Reroll ONLY the name, keeping the same template/kind and parent linkage. */
export function rerollPoiName(draft, { rng, preferTags = [] } = {}) {
  const nameDraft = getRandomSettlementName({ rng, preferTags });
  const name = `${nameDraft.name} ${draft.template.label}`;
  return { ...draft, nameDraft, name, summary: composeSummary(draft.template, name) };
}
