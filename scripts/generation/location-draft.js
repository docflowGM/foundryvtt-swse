/**
 * PHASE 8D-1 — location dependency/draft foundation.
 *
 * Generated Locations remain DRAFTS in this phase — no Location record
 * is created here. Later commit reuses `LocationRegistryService`
 * verbatim (its own `upsertLocation()` already validates parent
 * existence and rejects cycles — this module never reimplements that
 * hierarchy validation). Reuses the existing built-in Location Library
 * (`location-library-seeds.js`'s `LOCATION_LIBRARY_SEEDS`/
 * `filterLocationLibrarySeeds`) for "random planet"/"random POI" modes
 * rather than inventing a second planet-name generator — building the
 * actual upsert-ready record from a chosen seed is deferred to the
 * commit step (`buildLocationLibraryRecords()`, already exists), which
 * is Phase 8D-2+ scope, not this foundation pass.
 *
 * Relationships use IDs only, NEVER visible names — matching the
 * exact-id-only discipline already established by
 * `GMCampaignContextService`'s `exactLocation()`/`exactFaction()`
 * helpers (Correction 12, reused here rather than `findLocation()`,
 * which also matches by name/slug and is therefore wrong for this
 * purpose).
 */

import { LOCATION_LIBRARY_SEEDS, filterLocationLibrarySeeds } from '../locations/location-library-seeds.js';
import { pickRandom } from './lib/weighted-random.js';
import { createDraftId } from './lib/draft-id.js';
import { createProvenance, isProvenance } from './provenance.js';

/**
 * How a Job/Faction generator wants to resolve its mission Location.
 * `RANDOM_PLANET`/`RANDOM_PLANET_AND_POI` pick from the existing,
 * curated Location Library (this file's original Phase 8D-1 modes).
 * `GENERATE_NEW_PLANET`/`GENERATE_NEW_PLANET_AND_POI`/
 * `GENERATE_NEW_POI` (Phase 8D-2) are the DISTINCT procedural path —
 * see `planets/planet-draft.js` — never a redefinition of the existing
 * `RANDOM_PLANET` meaning. Known/library and procedural/new stay two
 * separate, explicit modes so a caller (and a future UI) always chooses
 * deliberately between them.
 */
export const LOCATION_DRAFT_MODE = Object.freeze({
  USE_CURRENT: 'use-current',
  USE_EXISTING: 'use-existing',
  RANDOM_POI_ON_CURRENT_PLANET: 'random-poi-on-current-planet',
  RANDOM_PLANET: 'random-planet',
  RANDOM_PLANET_AND_POI: 'random-planet-and-poi',
  GENERATE_NEW_PLANET: 'generate-new-planet',
  GENERATE_NEW_PLANET_AND_POI: 'generate-new-planet-and-poi',
  GENERATE_NEW_POI: 'generate-new-poi'
});

const LOCATION_DRAFT_MODES = Object.freeze(Object.values(LOCATION_DRAFT_MODE));

export function isLocationDraftMode(value) {
  return LOCATION_DRAFT_MODES.includes(value);
}

function cleanString(value) {
  return String(value ?? '').trim();
}

/**
 * A locally-unique, non-canonical draft id — namespaced so it can never
 * be confused with a real `LocationRegistryService` record id. Only
 * meaningful within one generation batch (for `parentDraftId` linking
 * before commit); never written to a canonical record. Phase 8D-2:
 * delegates to the shared `createDraftId()` (`lib/draft-id.js`) rather
 * than keeping its own local implementation, so every domain mints
 * draft ids the identical way.
 */
function newDraftId() {
  return createDraftId('location');
}

/**
 * Build one location dependency draft.
 *
 * - `USE_CURRENT`/`USE_EXISTING`: `locationId` must be set (a real,
 *   canonical id resolved by the caller — see `describeExistingLocation()`
 *   below); no new Location is implied.
 * - `RANDOM_PLANET`/`RANDOM_PLANET_AND_POI`: `librarySeedId` names which
 *   Location Library seed this draft was generated from; `name`/
 *   `category`/`type`/`biomes`/`summary` are copied from that seed for
 *   display, but nothing is persisted yet.
 * - `RANDOM_POI_ON_CURRENT_PLANET`: `parentLocationId` (a real canonical
 *   planet id) OR `parentDraftId` (another draft in the same batch, when
 *   the "current planet" is itself still a draft) identifies where this
 *   POI attaches once committed — never both, and never a name.
 */
export function createLocationDependencyDraft({
  mode,
  locationId = '',
  parentLocationId = '',
  parentDraftId = '',
  librarySeedId = '',
  name = '',
  category = '',
  type = '',
  biomes = [],
  tags = [],
  summary = '',
  provenance
} = {}) {
  if (!isLocationDraftMode(mode)) return null;
  return {
    draftId: newDraftId(),
    mode,
    locationId: cleanString(locationId),
    parentLocationId: cleanString(parentLocationId),
    parentDraftId: cleanString(parentDraftId),
    librarySeedId: cleanString(librarySeedId),
    name: cleanString(name),
    category: cleanString(category),
    type: cleanString(type),
    biomes: Array.isArray(biomes) ? [...biomes] : [],
    tags: Array.isArray(tags) ? [...tags] : [],
    summary: cleanString(summary),
    provenance: isProvenance(provenance) ? provenance : createProvenance({ presetId: mode, templateId: cleanString(librarySeedId) })
  };
}

/**
 * Pick a random Location Library seed (a preset planet), optionally
 * constrained by biome/category. Thin wrapper over the existing
 * `filterLocationLibrarySeeds()` + this module's shared weighted-pick
 * primitive — never re-implements filtering.
 */
export function pickRandomLocationLibrarySeed({ rng, biome = '', category = '' } = {}) {
  const pool = (biome || category) ? filterLocationLibrarySeeds({ biome, category }) : LOCATION_LIBRARY_SEEDS;
  return pickRandom(pool, { rng });
}

/** Pick a random child POI from a given Location Library seed's `children[]`, or null if it has none. */
export function pickRandomLocationLibraryChild(seed, { rng } = {}) {
  const children = Array.isArray(seed?.children) ? seed.children : [];
  return pickRandom(children, { rng });
}

/**
 * Build a `RANDOM_PLANET` (or `RANDOM_PLANET_AND_POI`) dependency draft
 * from a chosen Location Library seed. When `includeChild` is true and
 * the seed has at least one child POI, a random child is also drafted
 * with `parentDraftId` pointing at the planet draft — the two remain
 * linked by draft id until both are committed together.
 */
export function buildLocationDraftFromLibrarySeed(seed, { rng, includeChild = false } = {}) {
  if (!seed) return [];
  const planetDraft = createLocationDependencyDraft({
    mode: includeChild ? LOCATION_DRAFT_MODE.RANDOM_PLANET_AND_POI : LOCATION_DRAFT_MODE.RANDOM_PLANET,
    librarySeedId: seed.id,
    name: seed.name,
    category: seed.category || 'planetary',
    type: seed.type || 'planet',
    biomes: seed.biomes || [],
    tags: seed.tags || [],
    summary: seed.summary || ''
  });
  const drafts = [planetDraft];
  if (includeChild) {
    const child = pickRandomLocationLibraryChild(seed, { rng });
    if (child) {
      drafts.push(createLocationDependencyDraft({
        mode: LOCATION_DRAFT_MODE.RANDOM_POI_ON_CURRENT_PLANET,
        parentDraftId: planetDraft.draftId,
        librarySeedId: seed.id,
        name: child.name,
        category: child.category || planetDraft.category,
        type: child.type || 'poi',
        biomes: child.biomes || seed.biomes || [],
        tags: child.tags || [],
        summary: child.summary || ''
      }));
    }
  }
  return drafts;
}

/**
 * Read-only lookup of a real, canonical Location by EXACT id (never by
 * name/slug — matches `GMCampaignContextService`'s `exactLocation()`
 * discipline). Requires `LocationRegistryService`, so unlike the rest of
 * this module it needs the Foundry `game.settings` shim to run under
 * Node tests. Returns `null` for an unresolved id rather than guessing.
 */
export async function describeExistingLocation(locationId) {
  const id = cleanString(locationId);
  if (!id) return null;
  const { LocationRegistryService } = await import('../locations/location-registry-service.js');
  const record = LocationRegistryService.getRegistry().find((entry) => entry.id === id) || null;
  return record ? { id: record.id, name: record.name, category: record.category, type: record.type } : null;
}
