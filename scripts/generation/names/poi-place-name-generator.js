/**
 * PHASE 8D-3A production — POI place-name style dispatch.
 *
 * `planets/poi-generator.js` always named a POI as
 * `${settlementName} ${template.label}`, reusing
 * `settlement-name-generator.js` for every POI regardless of kind --
 * fine for an actual settlement (`type: 'city'`, e.g. Fishing
 * Village), but "Kalhaven Sith Tomb" or "Kalhaven Research Facility"
 * reads oddly for a natural feature or an installation. This module
 * adds two more naming STYLES (`data/poi-place-name-components.js`)
 * and dispatches to the right one from the POI template's own
 * canonical `type` -- never a new per-template field, so none of the
 * 194 `POI_TEMPLATES` entries needed touching:
 *
 *  - `city`             -> SETTLEMENT (unchanged; `settlement-name-generator.js`)
 *  - `facility`/`base`  -> FACILITY   (an institutional designation, e.g. "Site 7")
 *  - `region`           -> DISTRICT   (a quarter/ward name, e.g. "the Ashfall Quarter")
 *  - anything else
 *    (`poi`/`temple`/`battlefield`/`force-vergence`)
 *                        -> GEOGRAPHIC (an adjective+feature pair, e.g. "Shattered Ridge")
 *
 * Every style resolves to the same `{ style, name, ... }` shape a
 * caller can persist as a POI draft's `nameDraft` and later reroll via
 * `rerollPoiPlaceName()` without needing to know which style produced
 * it -- `poi-generator.js` always appends `template.label` after
 * `nameDraft.name`, so `poi.name.endsWith(poi.template.label)` holds
 * regardless of style, exactly as it always has.
 */

import {
  GEOGRAPHIC_NAME_DESCRIPTORS,
  GEOGRAPHIC_FEATURE_NOUNS,
  FACILITY_DESIGNATIONS,
  DISTRICT_DESCRIPTORS
} from '../data/poi-place-name-components.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';
import { getRandomSettlementName } from './settlement-name-generator.js';

export const POI_NAME_STYLE = Object.freeze({
  SETTLEMENT: 'settlement',
  GEOGRAPHIC: 'geographic',
  FACILITY: 'facility',
  DISTRICT: 'district'
});

const POI_NAME_STYLES = Object.freeze(Object.values(POI_NAME_STYLE));

export function isPoiNameStyle(value) {
  return POI_NAME_STYLES.includes(value);
}

/** Resolve the naming style for a POI template's canonical `type` -- see module doc. */
export function poiNameStyleForType(type) {
  if (type === 'facility' || type === 'base') return POI_NAME_STYLE.FACILITY;
  if (type === 'region') return POI_NAME_STYLE.DISTRICT;
  if (type === 'city') return POI_NAME_STYLE.SETTLEMENT;
  return POI_NAME_STYLE.GEOGRAPHIC;
}

function composeGeographicName(descriptor, feature) {
  return `${descriptor?.value ?? 'Shattered'} ${feature?.value ?? 'Ridge'}`;
}

/**
 * Generate a POI place-name draft in the given `style`:
 * `{ style, name, ...styleComponents }`. `styleComponents` varies by
 * style (a nested `settlement` draft for SETTLEMENT, `descriptor`+
 * `feature` for GEOGRAPHIC, a single `entry` for FACILITY/DISTRICT) --
 * a caller only needs `style`+`name`; the rest is kept for
 * inspection/reroll.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.preferTags]
 * @param {string} [options.style] - a `POI_NAME_STYLE` value, defaults to SETTLEMENT.
 */
export function getRandomPoiPlaceName({ rng, preferTags = [], style = POI_NAME_STYLE.SETTLEMENT } = {}) {
  if (style === POI_NAME_STYLE.FACILITY) {
    const entry = weightedPickWithPreference(FACILITY_DESIGNATIONS, { rng, preferTags });
    return { style, name: entry.value, entry };
  }
  if (style === POI_NAME_STYLE.DISTRICT) {
    const entry = weightedPickWithPreference(DISTRICT_DESCRIPTORS, { rng, preferTags });
    return { style, name: entry.value, entry };
  }
  if (style === POI_NAME_STYLE.GEOGRAPHIC) {
    const descriptor = weightedPickWithPreference(GEOGRAPHIC_NAME_DESCRIPTORS, { rng, preferTags });
    const feature = weightedPickWithPreference(GEOGRAPHIC_FEATURE_NOUNS, { rng, preferTags });
    return { style, name: composeGeographicName(descriptor, feature), descriptor, feature };
  }
  const settlement = getRandomSettlementName({ rng, preferTags });
  return { style: POI_NAME_STYLE.SETTLEMENT, name: settlement.name, settlement };
}

/** Reroll a place-name draft, keeping its existing `style` (or SETTLEMENT if the draft/style is missing). */
export function rerollPoiPlaceName(nameDraft, { rng, preferTags = [] } = {}) {
  return getRandomPoiPlaceName({ rng, preferTags, style: nameDraft?.style ?? POI_NAME_STYLE.SETTLEMENT });
}
