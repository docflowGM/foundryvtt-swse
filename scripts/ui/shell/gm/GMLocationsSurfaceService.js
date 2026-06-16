/** GM Locations surface view-model. */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function titleCase(value = '') {
  return text(value).split(/[-_\s]+/g).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function option(value, label, selected = '') {
  return { value, label: label || titleCase(value), selected: String(value) === String(selected || '') };
}

function optionsFrom(list = [], selected = '', { includeAll = false, allLabel = 'All' } = {}) {
  const rows = list.map(entry => option(entry.value, entry.label, selected));
  return includeAll ? [{ value: '', label: allLabel, selected: !selected }, ...rows] : rows;
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(entry => text(entry)).filter(Boolean);
  return String(value ?? '').split(/,|\n/g).map(entry => text(entry)).filter(Boolean);
}

function tagsLabel(value = []) {
  return splitList(value).join(', ');
}

function dateLabel(value = '') {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'No timestamp';
  try { return date.toLocaleString(); } catch (_err) { return value; }
}

function revealClass(value = '') {
  if (value === 'active') return 'is-active';
  if (value === 'known') return 'is-known';
  if (value === 'compromised') return 'is-compromised';
  if (value === 'hinted') return 'is-hinted';
  return 'is-hidden';
}

function findFaction(factions = [], factionId = '') {
  const id = text(factionId).toLowerCase();
  if (!id) return null;
  return factions.find(faction => text(faction.id).toLowerCase() === id || text(faction.name).toLowerCase() === id) || null;
}

function contactRowsForFaction(factions = [], factionId = '') {
  const selected = findFaction(factions, factionId);
  const source = selected ? [selected] : factions;
  return source.flatMap(faction => asArray(faction.contacts).map(contact => ({ ...contact, factionId: faction.id, factionName: faction.name })));
}

function locationChain(location = {}, byId = new Map()) {
  const rows = [];
  let current = location;
  const seen = new Set();
  while (current?.id && !seen.has(current.id)) {
    seen.add(current.id);
    rows.unshift(current.name);
    current = current.parentLocationId ? byId.get(current.parentLocationId) : null;
  }
  return rows.filter(Boolean).join(' → ');
}

function depthFor(location = {}, byId = new Map()) {
  let depth = 0;
  let current = location.parentLocationId ? byId.get(location.parentLocationId) : null;
  const seen = new Set([location.id]);
  while (current?.id && !seen.has(current.id)) {
    depth += 1;
    seen.add(current.id);
    current = current.parentLocationId ? byId.get(current.parentLocationId) : null;
  }
  return depth;
}

function locationCard(location = {}, records = [], factions = []) {
  const byId = new Map(records.map(entry => [entry.id, entry]));
  const parent = location.parentLocationId ? byId.get(location.parentLocationId) : null;
  const children = records.filter(entry => entry.parentLocationId === location.id);
  const faction = findFaction(factions, location.controllingFactionId);
  const factionIds = Array.from(new Set([location.controllingFactionId, ...asArray(location.factionIds), ...asArray(location.factionPresence).map(entry => entry.factionId)].filter(Boolean)));
  const factionNames = factionIds.map(id => findFaction(factions, id)?.name || id).filter(Boolean);
  const contactCount = asArray(location.contactIds).length;
  const actorCount = asArray(location.npcActorUuids).length;
  return {
    id: location.id,
    name: location.name,
    category: location.category,
    categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.CATEGORIES, location.category),
    type: location.type,
    typeLabel: LocationRegistryService.optionLabel(LocationRegistryService.TYPES, location.type),
    scale: location.scale,
    scaleLabel: LocationRegistryService.optionLabel(LocationRegistryService.SCALES, location.scale),
    parentLocationId: location.parentLocationId,
    parentName: parent?.name || '',
    chain: locationChain(location, byId),
    depth: depthFor(location, byId),
    depthClass: `depth-${Math.min(5, depthFor(location, byId))}`,
    revealState: location.revealState,
    revealLabel: LocationRegistryService.optionLabel(LocationRegistryService.REVEAL_STATES, location.revealState),
    revealClass: revealClass(location.revealState),
    knownToPlayers: location.knownToPlayers,
    activeForParty: location.activeForParty,
    controllingFactionName: faction?.name || '',
    factionNames: factionNames.join(', '),
    factionCount: factionIds.length,
    contactCount,
    npcCount: contactCount + actorCount,
    intelCount: asArray(location.linkedIntelIds).length,
    jobCount: asArray(location.linkedJobIds).length,
    sceneCount: asArray(location.linkedSceneUuids).length + (location.map?.sceneUuid ? 1 : 0),
    encounterSeedCount: asArray(location.encounterSeeds).length,
    atlasFactCount: asArray(location.atlasFacts).length,
    childCount: children.length,
    hasScene: Boolean(location.map?.sceneUuid || asArray(location.linkedSceneUuids).length),
    hasMapImage: Boolean(location.map?.imagePath),
    hasEncounterSeeds: asArray(location.encounterSeeds).length > 0,
    publicSummary: location.publicSummary,
    tagsLabel: tagsLabel(location.tags),
    updatedLabel: dateLabel(location.updatedAt),
    searchText: [location.name, location.category, location.type, location.region, location.sector, location.system, location.publicSummary, location.gmNotes, tagsLabel(location.tags), factionNames.join(' ')].join(' ').toLowerCase()
  };
}


function librarySeedCard(seed = {}, records = []) {
  const imported = records.some(record => record.id === seed.id || record.librarySeedId === seed.id);
  const childCount = asArray(seed.children).length;
  const factCount = asArray(seed.atlasFacts).length;
  const biomeLabels = asArray(seed.biomes).map(biome => LocationRegistryService.optionLabel(LocationRegistryService.LIBRARY_BIOMES, biome)).filter(Boolean);
  return {
    id: seed.id,
    name: seed.name,
    type: seed.type || 'planet',
    typeLabel: LocationRegistryService.optionLabel(LocationRegistryService.TYPES, seed.type || 'planet'),
    category: seed.category || 'planetary',
    categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.CATEGORIES, seed.category || 'planetary'),
    region: seed.region || '',
    sector: seed.sector || '',
    system: seed.system || '',
    summary: seed.summary || '',
    tagsLabel: tagsLabel(seed.tags || seed.biomes),
    biomeLabels: biomeLabels.join(', '),
    childCount,
    factCount,
    imported,
    importLabel: imported ? 'Imported' : 'Import',
    searchText: [seed.name, seed.region, seed.sector, seed.system, seed.summary, tagsLabel(seed.tags), tagsLabel(seed.biomes)].join(' ').toLowerCase()
  };
}

function selectedVm(location = null, records = [], factions = []) {
  if (!location) return null;
  const byId = new Map(records.map(entry => [entry.id, entry]));
  const card = locationCard(location, records, factions);
  const children = records.filter(entry => entry.parentLocationId === location.id).map(entry => locationCard(entry, records, factions));
  const contactRows = contactRowsForFaction(factions).filter(contact => asArray(location.contactIds).includes(contact.id));
  const factionRows = Array.from(new Set([location.controllingFactionId, ...location.factionIds, ...location.factionPresence.map(entry => entry.factionId)].filter(Boolean))).map(id => findFaction(factions, id)).filter(Boolean);
  return {
    ...card,
    raw: location,
    children,
    factionRows,
    contactRows,
    actorRows: location.npcActorUuids.map(uuid => ({ uuid })),
    intelRows: location.linkedIntelIds.map(id => ({ id })),
    jobRows: location.linkedJobIds.map(id => ({ id })),
    sceneRows: Array.from(new Set([location.map?.sceneUuid, ...location.linkedSceneUuids].filter(Boolean))).map(uuid => ({ uuid, isPrimary: uuid === location.map?.sceneUuid })),
    encounterSeeds: location.encounterSeeds.map(seed => ({
      ...seed,
      categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.ENCOUNTER_SEED_CATEGORIES, seed.category),
      sourceLabel: seed.sourceKind === 'compendium' ? 'Compendium Actor' : seed.sourceKind === 'world' ? 'World Actor' : 'Manual Seed',
      hasActor: Boolean(seed.uuid)
    })),
    atlasFacts: location.atlasFacts.map(fact => ({
      ...fact,
      categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_CATEGORIES, fact.category),
      revealLabel: LocationRegistryService.optionLabel(LocationRegistryService.REVEAL_STATES, fact.revealState),
      revealModeLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_REVEAL_MODES, fact.revealMode || 'any'),
      checkCount: asArray(fact.checks).length,
      checksText: LocationRegistryService.formatAtlasCheckLines(fact.checks),
      checkRows: asArray(fact.checks).map(check => ({
        ...check,
        skillLabel: LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, check.skill),
        summary: `${LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, check.skill)} DC ${check.dc}${check.label ? ` — ${check.label}` : ''}`
      })),
      checkLabel: asArray(fact.checks).map(check => `${LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, check.skill)} DC ${check.dc}${check.label ? ` — ${check.label}` : ''}`).join(' / '),
      outputLabel: LocationRegistryService.optionLabel(LocationRegistryService.LEAD_OUTPUTS, fact.onReveal?.output || 'none')
    })),
    parentChain: locationChain(location, byId),
    tags: tagsLabel(location.tags),
    factionIdsText: tagsLabel(location.factionIds),
    contactIdsText: tagsLabel(location.contactIds),
    npcActorUuidsText: tagsLabel(location.npcActorUuids),
    linkedIntelIdsText: tagsLabel(location.linkedIntelIds),
    linkedJobIdsText: tagsLabel(location.linkedJobIds),
    linkedSceneUuidsText: tagsLabel(location.linkedSceneUuids),
    mapSceneUuid: location.map?.sceneUuid || '',
    mapImagePath: location.map?.imagePath || '',
    mapDefaultGrid: location.map?.defaultGrid ?? 100,
    mapDefaultWidth: location.map?.defaultWidth ?? 0,
    mapDefaultHeight: location.map?.defaultHeight ?? 0,
    mapDefaultPadding: location.map?.defaultPadding ?? 0.25,
    mapNotes: location.map?.notes || ''
  };
}

function leadDiscoveryRows(records = []) {
  const byId = new Map(records.map(entry => [entry.id, entry]));
  return LocationRegistryService.getAtlasLeadDiscoveries({ unresolvedOnly: true }).map((lead) => {
    const location = byId.get(lead.locationId) || LocationRegistryService.findLocation(lead.locationId);
    const fact = location?.atlasFacts?.find(entry => entry.id === lead.factId);
    const onReveal = fact?.onReveal || {};
    const chain = location ? locationChain(location, byId) : lead.locationName;
    const revealCount = asArray(lead.revealLocationIds).length + asArray(lead.revealFactionIds).length + asArray(lead.revealContactIds).length;
    return {
      ...lead,
      locationName: location?.name || lead.locationName || lead.locationId,
      locationChain: chain,
      factTitle: fact?.title || lead.factTitle || lead.factId,
      teaser: fact?.teaser || '',
      body: fact?.body || '',
      skillLabel: LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, lead.skill),
      checkLabel: lead.checkLabel || '',
      outputLabel: LocationRegistryService.optionLabel(LocationRegistryService.LEAD_OUTPUTS, lead.output),
      wantsJob: lead.wantsJob || onReveal.output === 'job-draft' || onReveal.createJob,
      wantsIntel: lead.wantsIntel || onReveal.output === 'intel-draft' || onReveal.createIntel,
      hasRevealLinks: revealCount > 0,
      revealCount,
      updatedLabel: dateLabel(lead.updatedAt || lead.createdAt)
    };
  });
}

export class GMLocationsSurfaceService {
  static async buildViewModel(host) {
    const state = host?.getSurfaceState?.('locations') || {};
    const filters = {
      search: text(state.search),
      category: text(state.category),
      type: text(state.type),
      revealState: text(state.revealState),
      special: text(state.special),
      librarySearch: text(state.librarySearch),
      libraryBiome: text(state.libraryBiome),
      libraryCategory: text(state.libraryCategory)
    };
    const registrySummary = FactionRegistryService.summarizeForWorkspace();
    const factions = registrySummary.factions || [];
    const records = LocationRegistryService.getRegistry();
    const cards = records.map(record => locationCard(record, records, factions));
    const visibleCards = cards.filter((card) => {
      if (filters.category && card.category !== filters.category) return false;
      if (filters.type && card.type !== filters.type) return false;
      if (filters.revealState && card.revealState !== filters.revealState) return false;
      if (filters.special === 'known' && !card.knownToPlayers) return false;
      if (filters.special === 'hidden' && card.revealState !== 'hidden') return false;
      if (filters.special === 'active' && !card.activeForParty) return false;
      if (filters.special === 'has-scene' && !card.hasScene) return false;
      if (filters.special === 'has-seeds' && !card.hasEncounterSeeds) return false;
      const q = filters.search.toLowerCase();
      if (q && !card.searchText.includes(q)) return false;
      return true;
    });
    const selectedLocationId = text(state.selectedLocationId || visibleCards[0]?.id || '');
    const selectedLocation = selectedLocationId ? LocationRegistryService.findLocation(selectedLocationId) : null;
    const selected = selectedVm(selectedLocation, records, factions);
    const leadQueue = leadDiscoveryRows(records);
    const stats = LocationRegistryService.summarizeForWorkspace();
    const librarySeeds = LocationRegistryService.getLibrarySeeds({ search: filters.librarySearch, biome: filters.libraryBiome, category: filters.libraryCategory });
    const libraryCards = librarySeeds.map(seed => librarySeedCard(seed, records));
    const librarySummary = LocationRegistryService.summarizeLibrary({ search: filters.librarySearch, biome: filters.libraryBiome, category: filters.libraryCategory });

    const locationOptions = [{ value: '', label: 'No parent / standalone', selected: !selected?.parentLocationId }, ...records.map(record => ({
      value: record.id,
      label: locationChain(record, new Map(records.map(entry => [entry.id, entry]))) || record.name,
      selected: record.id === selected?.parentLocationId,
      disabled: record.id === selected?.id
    }))];
    const factionOptions = [{ value: '', label: 'No controlling faction', selected: !selected?.raw?.controllingFactionId }, ...factions.map(faction => ({ value: faction.id, label: faction.name, selected: faction.id === selected?.raw?.controllingFactionId }))];

    return {
      pageTitle: 'Locations',
      pageDescription: 'A GM hub for planets, cities, space sites, POIs, Atlas facts, encounter seeds, maps, and linked campaign systems.',
      locationManager: {
        filters,
        cards: visibleCards,
        allCards: cards,
        hasLocations: cards.length > 0,
        hasVisibleLocations: visibleCards.length > 0,
        selectedLocationId,
        selected,
        leadQueue,
        hasLeadQueue: leadQueue.length > 0,
        stats,
        library: {
          cards: libraryCards,
          summary: librarySummary,
          hasCards: libraryCards.length > 0,
          selectedBiome: filters.libraryBiome,
          selectedCategory: filters.libraryCategory
        },
        libraryBiomeOptions: [{ value: '', label: 'All library biomes', selected: !filters.libraryBiome }, ...LocationRegistryService.getLibraryBiomes().map(entry => ({ ...entry, selected: entry.value === filters.libraryBiome }))],
        libraryCategoryOptions: optionsFrom(LocationRegistryService.CATEGORIES, filters.libraryCategory, { includeAll: true, allLabel: 'All library categories' }),
        categoryOptions: optionsFrom(LocationRegistryService.CATEGORIES, filters.category, { includeAll: true, allLabel: 'All categories' }),
        typeOptions: optionsFrom(LocationRegistryService.TYPES, filters.type, { includeAll: true, allLabel: 'All types' }),
        revealOptions: optionsFrom(LocationRegistryService.REVEAL_STATES, filters.revealState, { includeAll: true, allLabel: 'All reveal states' }),
        specialOptions: [
          { value: '', label: 'All records', selected: !filters.special },
          { value: 'known', label: 'Known to players', selected: filters.special === 'known' },
          { value: 'hidden', label: 'GM only', selected: filters.special === 'hidden' },
          { value: 'active', label: 'Active location', selected: filters.special === 'active' },
          { value: 'has-scene', label: 'Has map/scene', selected: filters.special === 'has-scene' },
          { value: 'has-seeds', label: 'Has encounter seeds', selected: filters.special === 'has-seeds' }
        ],
        editorCategoryOptions: optionsFrom(LocationRegistryService.CATEGORIES, selected?.raw?.category || 'planetary'),
        editorTypeOptions: optionsFrom(LocationRegistryService.TYPES, selected?.raw?.type || 'poi'),
        editorScaleOptions: optionsFrom(LocationRegistryService.SCALES, selected?.raw?.scale || 'site'),
        editorRevealOptions: optionsFrom(LocationRegistryService.REVEAL_STATES, selected?.raw?.revealState || 'hidden'),
        locationOptions,
        factionOptions,
        seedCategoryOptions: optionsFrom(LocationRegistryService.ENCOUNTER_SEED_CATEGORIES, 'random'),
        factCategoryOptions: optionsFrom(LocationRegistryService.FACT_CATEGORIES, 'general'),
        skillOptions: optionsFrom(LocationRegistryService.ATLAS_SKILLS, 'knowledgeGalacticLore'),
        factRevealModeOptions: optionsFrom(LocationRegistryService.FACT_REVEAL_MODES, 'any'),
        leadOutputOptions: optionsFrom(LocationRegistryService.LEAD_OUTPUTS, 'none')
      }
    };
  }
}
