/**
 * PHASE 8D-3A production — named planet presets for
 * `planets/planet-draft.js`'s `createProceduralPlanetDraft({ presetId })`.
 *
 * A preset is NOT a bespoke generator -- it never fabricates a fact
 * directly, and it owns no pick logic of its own. It is only a bundle
 * of SOFT preference tags (the same free-text vocabulary every other
 * Phase 8D pool already tags its entries with: biomes/world-class
 * tags, economy sector tags, government `ORGANIZATION_FAMILY` tags,
 * hazard/trait tags) plus an optional `densityBias` override --
 * exactly the inputs `pickPlanetWorldClass()`/`pickPlanetClimate()`/
 * `pickPlanetHydrosphere()`/`pickPlanetGovernment()`/
 * `generatePlanetEconomySectors()`/`pickPlanetHazards()`/
 * `pickPlanetTraits()`/`pickPlanetHistoryHooks()`/population's
 * `densityBias` already accept. `createProceduralPlanetDraft()` feeds
 * a preset's `preferTags` into every one of those picks (weighting,
 * never filtering -- a "Mining World" preset makes an agricultural
 * roll less likely, never impossible), so "20 presets" means 20 small
 * data entries, not 20 new code paths.
 *
 * `id` is the STABLE identifier persisted on a generated draft's own
 * `presetId` field and recorded in its `provenance.presetId` -- a GM
 * reviewing a draft later can see exactly which preset (if any) shaped
 * it. `label`/`description` are display-only.
 */

export const PLANET_PRESETS = Object.freeze([
  {
    id: 'mining-world',
    label: 'Mining World',
    description: 'A world whose economy and settlement pattern center on extraction -- ore, minerals, or rarer resources pulled from rock.',
    preferTags: ['mountain', 'volcanic', 'mining', 'industrial', 'business-professional'],
    densityBias: 'sparse'
  },
  {
    id: 'ecumenopolis',
    label: 'Ecumenopolis',
    description: 'A city that swallowed an entire world -- hyper-urban, densely populated, layered infrastructure from pole to pole.',
    preferTags: ['urban', 'cosmopolitan', 'trade', 'financial-services', 'government-bureaucracy'],
    densityBias: 'dense'
  },
  {
    id: 'agricultural-world',
    label: 'Agricultural World',
    description: 'Broad farmland, ranches, and rural communities feeding a wider region.',
    preferTags: ['grassland', 'rural', 'agriculture', 'community-tribe'],
    densityBias: ''
  },
  {
    id: 'ocean-world',
    label: 'Ocean World',
    description: 'Mostly water -- island chains, coastal settlements, and a fishing/aquaculture economy.',
    preferTags: ['water', 'coastal', 'island', 'agriculture'],
    densityBias: ''
  },
  {
    id: 'ice-world',
    label: 'Ice World',
    description: 'A frozen, hostile world -- small, hardy, isolated settlements clinging to survivable pockets.',
    preferTags: ['ice', 'polar', 'frozen', 'isolated', 'frontier'],
    densityBias: 'sparse'
  },
  {
    id: 'desert-world',
    label: 'Desert World',
    description: 'Arid wastes, canyons, and dunes -- scattered settlements around water and trade routes.',
    preferTags: ['desert', 'arid', 'canyon', 'trade', 'frontier'],
    densityBias: ''
  },
  {
    id: 'jungle-world',
    label: 'Jungle World',
    description: 'Dense, overgrown, biologically rich -- settlements carved out of an aggressive wilderness.',
    preferTags: ['jungle', 'wildlife', 'frontier', 'community-tribe'],
    densityBias: ''
  },
  {
    id: 'ancient-ruins-world',
    label: 'Ancient Ruins World',
    description: 'A world defined by what came before -- precursor ruins, old battlefields, and archaeological mystery.',
    preferTags: ['ancient', 'ruin', 'mysterious', 'archaeological', 'cultural'],
    densityBias: 'sparse'
  },
  {
    id: 'trade-hub-world',
    label: 'Trade Hub World',
    description: 'A crossroads world -- shipping lanes, free ports, and a cosmopolitan mercantile character.',
    preferTags: ['urban', 'trade', 'commerce', 'cosmopolitan', 'financial-services'],
    densityBias: 'dense'
  },
  {
    id: 'frontier-outpost-world',
    label: 'Frontier Outpost World',
    description: 'The edge of settled space -- thin population, minimal infrastructure, self-reliant communities.',
    preferTags: ['frontier', 'remote', 'isolated', 'rural'],
    densityBias: 'sparse'
  },
  {
    id: 'military-garrison-world',
    label: 'Military Garrison World',
    description: 'A fortified world built around a standing military presence -- bases, drydocks, and martial order.',
    preferTags: ['military', 'military-paramilitary', 'industrial'],
    densityBias: ''
  },
  {
    id: 'pirate-haven-world',
    label: 'Pirate Haven World',
    description: 'A lawless refuge for raiders and smugglers -- hidden coves, black markets, and little central authority.',
    preferTags: ['criminal', 'crime-syndicate', 'black-market', 'frontier', 'lawless'],
    densityBias: ''
  },
  {
    id: 'penal-colony-world',
    label: 'Penal Colony World',
    description: 'A world given over to incarceration and forced labor -- harsh conditions, heavy enforcement.',
    preferTags: ['penal', 'enforcement', 'frontier', 'wasteland'],
    densityBias: 'sparse'
  },
  {
    id: 'research-outpost-world',
    label: 'Research Outpost World',
    description: 'A world dedicated to scientific work -- laboratories, observatories, and a small technical population.',
    preferTags: ['research', 'technology', 'business-professional', 'isolated'],
    densityBias: 'sparse'
  },
  {
    id: 'sacred-world',
    label: 'Sacred World',
    description: 'A world of deep religious or Force significance -- temples, pilgrimage routes, and a devout populace.',
    preferTags: ['sacred', 'holy', 'religion', 'force-tradition', 'mysterious'],
    densityBias: ''
  },
  {
    id: 'corporate-colony-world',
    label: 'Corporate Colony World',
    description: 'A world owned and administered as a corporate asset -- company towns, tight regulation, profit motive.',
    preferTags: ['business-professional', 'urban', 'trade', 'manufacturing'],
    densityBias: 'dense'
  },
  {
    id: 'volcanic-industrial-world',
    label: 'Volcanic Industrial World',
    description: 'Geothermal power and heavy industry built around an active, hostile volcanic landscape.',
    preferTags: ['volcanic', 'lava', 'industrial', 'hazard', 'manufacturing'],
    densityBias: ''
  },
  {
    id: 'post-cataclysmic-world',
    label: 'Post-Cataclysmic World',
    description: 'A world still recovering from disaster or war -- scarred terrain, rebuilding communities, hard-won resilience.',
    preferTags: ['wasteland', 'post-war', 'unstable', 'frontier'],
    densityBias: 'sparse'
  },
  {
    id: 'isolated-world',
    label: 'Isolated World',
    description: 'Cut off from the wider galaxy by distance or circumstance -- self-sufficient, insular, slow to change.',
    preferTags: ['isolated', 'remote', 'frontier', 'rural'],
    densityBias: 'sparse'
  },
  {
    id: 'crime-syndicate-world',
    label: 'Crime Syndicate World',
    description: 'A world effectively run by organized crime -- corrupt authority, black-market economy, and quiet menace.',
    preferTags: ['criminal', 'crime-syndicate', 'corrupt', 'black-market', 'urban'],
    densityBias: ''
  }
]);

const PLANET_PRESETS_BY_ID = new Map(PLANET_PRESETS.map((p) => [p.id, p]));

export function isPlanetPresetId(value) {
  return PLANET_PRESETS_BY_ID.has(value);
}

/** Look up a preset by id. Returns `null` for an unknown/empty id -- never throws, since a caller passing a stale or typo'd id should get "no preset applied," not a crash. */
export function getPlanetPreset(id) {
  return PLANET_PRESETS_BY_ID.get(id) ?? null;
}
