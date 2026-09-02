/** GM Locations surface view-model. */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { jobForThread, jobStatus, statusLabel as jobStatusLabel } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}


const FALLBACK_LOCATION_OPTIONS = Object.freeze({
  CATEGORIES: [
    { value: 'planetary', label: 'Planetary' },
    { value: 'space', label: 'Space' },
    { value: 'installation', label: 'Installations' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'other', label: 'Other / Strange' },
    { value: 'custom', label: 'Custom' }
  ],
  TYPES: [
    { value: 'planet', label: 'Planet' },
    { value: 'moon', label: 'Moon' },
    { value: 'star-system', label: 'Star System' },
    { value: 'orbit', label: 'Orbit' },
    { value: 'space-station', label: 'Space Station' },
    { value: 'ship', label: 'Ship' },
    { value: 'city', label: 'City / Settlement' },
    { value: 'region', label: 'Region / District' },
    { value: 'poi', label: 'Point of Interest' },
    { value: 'base', label: 'Base / Safehouse' },
    { value: 'temple', label: 'Temple / Ruin' },
    { value: 'facility', label: 'Facility' },
    { value: 'unknown', label: 'Unknown Coordinates' },
    { value: 'custom', label: 'Custom' }
  ],
  SCALES: [
    { value: 'galactic', label: 'Galactic' },
    { value: 'sector', label: 'Sector' },
    { value: 'system', label: 'System' },
    { value: 'planetary', label: 'Planetary' },
    { value: 'regional', label: 'Regional' },
    { value: 'local', label: 'Local' },
    { value: 'site', label: 'Site' },
    { value: 'room', label: 'Room / Interior' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'abstract', label: 'Abstract' }
  ],
  REVEAL_STATES: [
    { value: 'hidden', label: 'GM Only' },
    { value: 'hinted', label: 'Hinted' },
    { value: 'known', label: 'Known' },
    { value: 'active', label: 'Active' },
    { value: 'compromised', label: 'Compromised' }
  ]
});

function normalizeOptionEntry(entry) {
  if (entry && typeof entry === 'object') {
    const value = text(entry.value ?? entry.id ?? entry.key ?? entry.name ?? entry.label);
    return value ? { value, label: text(entry.label ?? entry.name ?? entry.value, titleCase(value)) } : null;
  }
  const value = text(entry);
  return value ? { value, label: titleCase(value) } : null;
}

function normalizeOptions(list = []) {
  return asArray(list).map(normalizeOptionEntry).filter(Boolean);
}

function optionSource(key) {
  const source = normalizeOptions(LocationRegistryService?.[key]);
  if (source.length) return source;
  return normalizeOptions(FALLBACK_LOCATION_OPTIONS[key] || []);
}

function titleCase(value = '') {
  return text(value).split(/[-_\s]+/g).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function option(value, label, selected = '') {
  const normalizedValue = text(value);
  return { value: normalizedValue, label: text(label, titleCase(normalizedValue)), selected: String(normalizedValue) === String(selected || '') };
}

function optionsFrom(list = [], selected = '', { includeAll = false, allLabel = 'All' } = {}) {
  const rows = normalizeOptions(list).map(entry => option(entry.value, entry.label, selected));
  return includeAll ? [{ value: '', label: allLabel, selected: !selected }, ...rows] : rows;
}

function filterButtonRows(list = [], selected = '', { allLabel = 'All' } = {}) {
  return [{ value: '', label: allLabel, selected: !selected }, ...normalizeOptions(list).map(entry => ({ ...entry, selected: entry.value === selected }))];
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(entry => text(entry)).filter(Boolean);
  return String(value ?? '').split(/,|\n/g).map(entry => text(entry)).filter(Boolean);
}

function searchMatches(haystack = '', query = '') {
  const terms = String(query || '').toLowerCase().split(/[\s,;|]+/g).map(part => part.trim()).filter(Boolean);
  if (!terms.length) return true;
  const target = String(haystack || '').toLowerCase();
  return terms.some(term => target.includes(term));
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

/**
 * World-collection UUIDs (`Scene.<id>`, `Actor.<id>`) resolve synchronously
 * via game.scenes/game.actors — the only UUID shape LocationSceneBridgeService
 * actually produces (Scene.create()) or the drop-payload path stores for a
 * world Actor. A compendium-sourced UUID (e.g. from a Quick Library drop)
 * won't match this and is reported as unresolved rather than attempted via
 * an async fromUuid() lookup — buildViewModel() renders every card in the
 * list on every request, so adding per-link async resolution there would
 * cost real render latency for a case the built-in importer/drop paths
 * don't produce. See docs/audits/... Phase 2 §"Scene/actor resolution
 * scope" for the tradeoff.
 */
function parseWorldDocId(uuid = '', docType = '') {
  const match = text(uuid).match(new RegExp(`^${docType}\\.([A-Za-z0-9]+)$`));
  return match ? match[1] : '';
}

function isCompendiumUuid(uuid = '') {
  return text(uuid).startsWith('Compendium.');
}

function resolveSceneRow(uuid, isPrimary) {
  const id = parseWorldDocId(uuid, 'Scene');
  // A Compendium.* UUID (a compendium-sourced Scene link) can't be
  // resolved synchronously here — game.scenes only holds world documents.
  // Reporting it as "Missing" would be false: LocationSceneBridgeService
  // resolves these fine via async fromUuid() when actually opening it.
  // Only a world-shaped (Scene.<id>) UUID that fails to resolve is
  // genuinely missing.
  if (!id && isCompendiumUuid(uuid)) {
    return { uuid, isPrimary, id: '', name: '', resolved: false, isActive: false, unverifiable: true, label: 'Compendium Scene (unverified)' };
  }
  const scene = id ? game.scenes?.get?.(id) : null;
  return {
    uuid,
    isPrimary,
    id: scene?.id || '',
    name: scene?.name || '',
    resolved: Boolean(scene),
    isActive: Boolean(scene?.active),
    unverifiable: false,
    label: scene ? scene.name : `Missing Scene (${uuid})`
  };
}

function resolveActorLink(uuid) {
  const id = parseWorldDocId(uuid, 'Actor');
  // Same reasoning as resolveSceneRow() above — a compendium-sourced
  // encounter-seed/NPC actor link is real and staging/linking already
  // resolves it via async fromUuid(); it just can't be verified here
  // without adding render-time I/O for every card in the list.
  if (!id && isCompendiumUuid(uuid)) {
    return { uuid, id: '', name: '', img: '', resolved: false, unverifiable: true, label: 'Compendium Actor (unverified)' };
  }
  const actor = id ? game.actors?.get?.(id) : null;
  return {
    uuid,
    id: actor?.id || '',
    name: actor?.name || '',
    img: actor?.img || '',
    resolved: Boolean(actor),
    unverifiable: false,
    label: actor ? actor.name : `Missing Actor (${uuid})`
  };
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

const TYPE_ICON_CLASSES = Object.freeze({
  planet: 'fa-solid fa-earth-americas',
  moon: 'fa-solid fa-moon',
  'star-system': 'fa-solid fa-sun',
  orbit: 'fa-solid fa-satellite',
  'space-station': 'fa-solid fa-satellite-dish',
  ship: 'fa-solid fa-rocket',
  city: 'fa-solid fa-city',
  region: 'fa-solid fa-map',
  poi: 'fa-solid fa-location-dot',
  base: 'fa-solid fa-shield-halved',
  temple: 'fa-solid fa-gopuram',
  facility: 'fa-solid fa-industry',
  unknown: 'fa-solid fa-question'
});

function iconClassForType(type = '') {
  return TYPE_ICON_CLASSES[type] || 'fa-solid fa-location-dot';
}

function locationCard(location = {}, records = [], factions = []) {
  const byId = new Map(records.map(entry => [entry.id, entry]));
  const parent = location.parentLocationId ? byId.get(location.parentLocationId) : null;
  const children = records.filter(entry => entry.parentLocationId === location.id);
  const faction = findFaction(factions, location.controllingFactionId);
  const factionIds = Array.from(new Set([location.controllingFactionId, ...asArray(location.factionIds), ...asArray(location.factionPresence).map(entry => entry.factionId)].filter(Boolean)));
  const factionNames = factionIds.map(id => findFaction(factions, id)?.name || id).filter(Boolean);
  const contactRows = contactRowsForFaction(factions).filter(contact => asArray(location.contactIds).includes(contact.id));
  const contactNames = contactRows.map(contact => [contact.name, contact.role, contact.factionName].filter(Boolean).join(' ')).filter(Boolean);
  const contactCount = asArray(location.contactIds).length;
  const actorCount = asArray(location.npcActorUuids).length;
  return {
    id: location.id,
    name: location.name,
    category: location.category,
    categoryLabel: LocationRegistryService.optionLabel(optionSource('CATEGORIES'), location.category),
    type: location.type,
    typeLabel: LocationRegistryService.optionLabel(optionSource('TYPES'), location.type),
    iconClass: iconClassForType(location.type),
    isCurrent: Boolean(location.activeForParty),
    isHidden: location.revealState === 'hidden',
    scale: location.scale,
    scaleLabel: LocationRegistryService.optionLabel(optionSource('SCALES'), location.scale),
    parentLocationId: location.parentLocationId,
    parentName: parent?.name || '',
    chain: locationChain(location, byId),
    depth: depthFor(location, byId),
    depthClass: `depth-${Math.min(5, depthFor(location, byId))}`,
    revealState: location.revealState,
    revealLabel: LocationRegistryService.optionLabel(optionSource('REVEAL_STATES'), location.revealState),
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
    contactNames: contactNames.join(', '),
    searchText: [location.name, location.category, location.type, location.region, location.sector, location.system, location.publicSummary, location.gmNotes, tagsLabel(location.tags), factionNames.join(' '), contactNames.join(' ')].join(' ').toLowerCase()
  };
}


function librarySeedCard(seed = {}, records = []) {
  // Provenance only (librarySeedId), not raw id equality — an unrelated
  // manually-created Location can share a seed's canonical id (e.g. a GM
  // manually creating "Tatooine" before ever importing the built-in
  // Tatooine seed), which used to make this seed falsely read as already
  // imported and disable its checkbox. librarySeedId is set only by a
  // real Library import and stays pinned to the seed's own canonical id
  // even if LocationRegistryService had to land the actual record at a
  // fallback id due to that collision.
  const imported = records.some(record => record.librarySeedId === seed.id);
  const childCount = asArray(seed.children).length;
  const factCount = asArray(seed.atlasFacts).length;
  const recordCount = 1 + childCount;
  const biomeLabels = asArray(seed.biomes).map(biome => LocationRegistryService.optionLabel(LocationRegistryService.LIBRARY_BIOMES, biome)).filter(Boolean);
  return {
    id: seed.id,
    name: seed.name,
    type: seed.type || 'planet',
    typeLabel: LocationRegistryService.optionLabel(optionSource('TYPES'), seed.type || 'planet'),
    category: seed.category || 'planetary',
    categoryLabel: LocationRegistryService.optionLabel(optionSource('CATEGORIES'), seed.category || 'planetary'),
    region: seed.region || '',
    sector: seed.sector || '',
    system: seed.system || '',
    summary: seed.summary || '',
    tagsLabel: tagsLabel(seed.tags || seed.biomes),
    biomeLabels: biomeLabels.join(', '),
    childCount,
    factCount,
    recordCount,
    recordLabel: `${recordCount} registry record${recordCount === 1 ? '' : 's'} · ${factCount} Atlas lead${factCount === 1 ? '' : 's'}`,
    imported,
    importLabel: imported ? 'Imported' : 'Import',
    searchText: [seed.name, seed.region, seed.sector, seed.system, seed.summary, tagsLabel(seed.tags), tagsLabel(seed.biomes)].join(' ').toLowerCase()
  };
}

/**
 * Resolve a linked Job Board posting by its thread id, via the real Job
 * Board authority — HolonetStorage.getThread() plus GMJobBoardSurfaceService's
 * own status derivation (jobForThread/jobStatus/statusLabel, exported for
 * exactly this reuse). Locations never stores a copy of a job's title or
 * status; this resolves it fresh on every render. A thread that no longer
 * exists (deleted, or a stale link) reports missing rather than throwing.
 */
async function resolveJobRow(jobId = '') {
  const id = text(jobId);
  if (!id) return null;
  const thread = await HolonetStorage.getThread(id).catch(() => null);
  if (!thread) return { id, title: 'Missing Job', status: 'missing', statusLabel: 'Missing', clientLabel: '', missing: true };
  const job = jobForThread(thread);
  const status = jobStatus(job);
  return {
    id: thread.id,
    title: text(job?.title || thread.title, 'Job Board Posting'),
    status,
    statusLabel: jobStatusLabel(status),
    clientLabel: text(job?.issuer?.contactName || job?.issuer?.name || job?.client?.name || job?.contactLabel),
    missing: false
  };
}

/**
 * Resolve a linked Holonet Intel record by its intel id, via the real
 * Intel authority — HolonetIntelService.getIntelById()/toIntelSummary().
 * Same non-storing, resolve-on-render approach as resolveJobRow() above.
 */
async function resolveIntelRow(intelId = '') {
  const id = text(intelId);
  if (!id) return null;
  const record = await HolonetIntelService.getIntelById(id).catch(() => null);
  const summary = record ? HolonetIntelService.toIntelSummary(record) : null;
  if (!summary) return { id, title: 'Missing Intel', status: 'missing', statusLabel: 'Missing', missing: true };
  return {
    id: summary.id || summary.recordId,
    title: text(summary.title, 'Untitled Intel'),
    status: summary.status,
    statusLabel: titleCase(summary.status),
    missing: false
  };
}

/**
 * "Factions Present" relationship rows — the faction registry stays the
 * sole authority for faction identity/name; a location only ever stores
 * relationship ids (controllingFactionId, factionPresence[].factionId).
 */
function factionRelationshipRows(location, factions = []) {
  const presenceById = new Map(asArray(location.factionPresence).map(entry => [entry.factionId, entry]));
  const ids = Array.from(new Set([location.controllingFactionId, ...asArray(location.factionIds), ...asArray(location.factionPresence).map(entry => entry.factionId)].filter(Boolean)));
  return ids.map((id) => {
    const faction = findFaction(factions, id);
    const presence = presenceById.get(id);
    const isController = id === location.controllingFactionId;
    return {
      id,
      name: faction?.name || id,
      roleLabel: isController ? 'Controlling Faction' : titleCase(presence?.influence || 'Present'),
      isController,
      missing: !faction
    };
  });
}

/**
 * "Contacts & NPCs" relationship rows — merges the Faction registry's
 * dossier contacts (already linked via location.contactIds) with raw
 * world-Actor links (location.npcActorUuids, resolved via resolveActorLink()
 * above). Both represent "who is here"; the distinction between a
 * registered Faction contact and a bare Actor UUID is an authority
 * implementation detail, not a separate campaign concept the GM needs
 * surfaced as two cards.
 */
function contactRelationshipRows(location, factions = []) {
  const contactRows = contactRowsForFaction(factions).filter(contact => asArray(location.contactIds).includes(contact.id));
  const fromContacts = contactRows.map(contact => ({
    id: contact.id,
    kind: 'contact',
    name: contact.name,
    roleLabel: [contact.role, contact.factionName].filter(Boolean).join(' · '),
    actorUuid: contact.actorUuid || '',
    // Carried through so a GM can navigate this contact row to its owning
    // Faction dossier (Phase 2 cross-surface navigation) without a second
    // lookup — the Faction registry stays the sole authority for this id,
    // this only threads the id already resolved by contactRowsForFaction().
    factionId: contact.factionId || '',
    missing: false,
    canUnlink: false
  }));
  const fromActors = asArray(location.npcActorUuids).map((uuid) => {
    const link = resolveActorLink(uuid);
    return {
      id: uuid,
      kind: 'actor',
      name: link.label,
      roleLabel: link.unverifiable ? 'Compendium-sourced' : '',
      actorUuid: uuid,
      missing: !link.resolved && !link.unverifiable,
      canUnlink: true
    };
  });
  return [...fromContacts, ...fromActors];
}

/** Pure — Encounter Seed rows with resolved display labels. No writes,
 *  no mutation of the Location record. Extracted from selectedVm() so the
 *  mapping is independently readable/testable. */
function buildEncounterSeedRows(location = {}) {
  return asArray(location.encounterSeeds).map((seed) => {
    const actorLink = seed.uuid ? resolveActorLink(seed.uuid) : null;
    return {
      ...seed,
      categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.ENCOUNTER_SEED_CATEGORIES, seed.category),
      sourceLabel: seed.sourceKind === 'compendium' ? 'Compendium Actor' : seed.sourceKind === 'world' ? 'World Actor' : 'Manual Seed',
      hasActor: Boolean(seed.uuid),
      actorResolved: actorLink ? actorLink.resolved : false,
      actorUnverifiable: actorLink ? actorLink.unverifiable : false,
      actorLabel: actorLink ? actorLink.label : ''
    };
  });
}

/** Pure — Atlas Fact rows with resolved display labels. Same extraction
 *  rationale as buildEncounterSeedRows() above. */
function buildAtlasFactRows(location = {}) {
  return asArray(location.atlasFacts).map(fact => ({
    ...fact,
    categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_CATEGORIES, fact.category),
    revealLabel: LocationRegistryService.optionLabel(optionSource('REVEAL_STATES'), fact.revealState),
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
  }));
}

/** Pure — identity group (name/type/category/region/reveal/parent). */
function buildLocationIdentityVm(location, { card, byId } = {}) {
  const parent = location.parentLocationId ? byId?.get(location.parentLocationId) : null;
  return {
    id: card.id,
    name: card.name,
    typeLabel: card.typeLabel,
    categoryLabel: card.categoryLabel,
    regionLabel: [location.region, location.sector, location.system].filter(Boolean).join(' · '),
    revealLabel: card.revealLabel,
    revealTone: card.revealClass,
    tags: splitList(location.tags),
    summary: location.publicSummary,
    parent: parent ? { id: parent.id, name: parent.name } : null
  };
}

/**
 * Pure — Campaign Relationships group. Jobs and Intel are resolved fresh
 * from their own real authorities on every render (Job Board's own
 * HolonetStorage thread + status derivation; HolonetIntelService's own
 * public getIntelById()/toIntelSummary() API) — Locations never stores a
 * copy of either title or status. LocationJobBridgeService/
 * LocationIntelBridgeService are deliberately NOT used here: they are
 * draft-creation adapters ("create a Job/Intel FROM this location"), not
 * lookup authorities for an EXISTING linked Job/Intel — Job Board and
 * Holonet Intel's own storage remain those authorities. leadRows is the
 * pre-computed global Atlas Lead Queue (leadDiscoveryRows(records) in
 * buildViewModel()), filtered here to this location — a second, separately
 * scoped call to LocationRegistryService.getAtlasLeadDiscoveries() would
 * duplicate the exact same actor-flag scan the global queue already paid
 * for. Leads stay a materially different concept from linked Intel: a Lead
 * is an unresolved player discovery, Intel is a separate campaign record
 * this location happens to reference.
 */
function buildRelationshipVm(location, { factions = [], jobRelationshipRows = [], intelRelationshipRows = [], leadRows = [] } = {}) {
  return {
    factions: factionRelationshipRows(location, factions),
    contacts: contactRelationshipRows(location, factions),
    jobs: jobRelationshipRows,
    intel: intelRelationshipRows,
    leads: leadRows.filter(lead => lead.locationId === location.id)
  };
}

/** Pure — Preparation group (Encounter Seeds, Scenes/Map, and the gating
 *  flags/reasons the template needs — matching
 *  LocationSceneBridgeService.createSceneFromLocation()'s own prerequisite
 *  check exactly, so Create Scene/Stage Encounter Seeds are never offered
 *  as guaranteed-failure controls). */
function buildPreparationVm(location, { encounterSeeds = [], sceneRows = [] } = {}) {
  const hasPrimaryScene = Boolean(location.map?.sceneUuid);
  const canCreateScene = Boolean(location.map?.imagePath || location.image);
  const stageBlockedReason = !encounterSeeds.length
    ? ''
    : (!hasPrimaryScene && !canCreateScene)
      ? 'Add a map image before staging — no Scene exists yet and one can\'t be created without one.'
      : '';
  const sceneCreationBlockedReason = (!hasPrimaryScene && !canCreateScene)
    ? 'Add a map image or a Map Image Path in the Edit wizard before creating a Scene.'
    : '';
  return {
    encounterSeeds,
    scenes: sceneRows.map(row => ({
      ...row,
      canOpen: row.isPrimary && row.resolved,
      canActivate: row.isPrimary && row.resolved,
      canUnlink: true
    })),
    canCreateScene,
    canStageEncounterSeeds: Boolean(encounterSeeds.length) && (hasPrimaryScene || canCreateScene),
    stageBlockedReason,
    sceneCreationBlockedReason
  };
}

/** Pure — World Detail group (Location-owned data only: children, Atlas
 *  Facts, environment/notes). Never Jobs/Factions/Actors — those are
 *  relationships, not Location-owned data. */
function buildWorldVm(location, { children = [], atlasFacts = [] } = {}) {
  return {
    children,
    atlasFacts,
    environment: {
      hazards: location.hazards || '',
      rumors: location.rumors || '',
      commerceNotes: location.commerceNotes || '',
      travelNotes: location.travelNotes || ''
    },
    publicSummary: location.publicSummary,
    gmNotes: location.gmNotes
  };
}

/**
 * Pure — Current Situation group. Built from the same relationship/
 * preparation data above, not a separate campaign-state fetch — "active"
 * Jobs means resolved status outside paid/archived/failed/missing (a real
 * status derived from the Job Board's own thread, never a guess).
 */
function buildCurrentSituationVm(location, { card, relationships, preparation } = {}) {
  const activeJobCount = relationships.jobs.filter(job => !['paid', 'archived', 'failed', 'missing'].includes(job.status)).length;
  const controllingFaction = relationships.factions.find(row => row.isController) || null;
  const primaryScene = preparation.scenes.find(row => row.isPrimary) || null;
  return {
    partyHere: card.isCurrent,
    isRevealed: location.revealState !== 'hidden',
    revealState: card.revealState,
    revealLabel: card.revealLabel,
    revealTone: card.revealClass,
    controllingFaction,
    activeJobCount,
    unresolvedLeadCount: relationships.leads.length,
    encounterSeedCount: preparation.encounterSeeds.length,
    hasScene: preparation.scenes.length > 0,
    sceneReady: Boolean(primaryScene?.resolved),
    warnings: []
  };
}

async function selectedVm(location = null, records = [], factions = [], { leadRows = [] } = {}) {
  if (!location) return null;
  const byId = new Map(records.map(entry => [entry.id, entry]));
  const card = locationCard(location, records, factions);
  const children = records.filter(entry => entry.parentLocationId === location.id).map(entry => locationCard(entry, records, factions));
  const contactRows = contactRowsForFaction(factions).filter(contact => asArray(location.contactIds).includes(contact.id));
  const factionRows = Array.from(new Set([location.controllingFactionId, ...location.factionIds, ...location.factionPresence.map(entry => entry.factionId)].filter(Boolean))).map(id => findFaction(factions, id)).filter(Boolean);

  const sceneRows = Array.from(new Set([location.map?.sceneUuid, ...location.linkedSceneUuids].filter(Boolean))).map(uuid => resolveSceneRow(uuid, uuid === location.map?.sceneUuid));
  const hasPrimaryScene = Boolean(location.map?.sceneUuid);
  // Matches LocationSceneBridgeService.createSceneFromLocation()'s own
  // prerequisite check (map.imagePath || location.image) exactly, so
  // Create Scene is never offered as a guaranteed-failure control.
  const canCreateScene = Boolean(location.map?.imagePath || location.image);

  const encounterSeeds = buildEncounterSeedRows(location);
  const atlasFacts = buildAtlasFactRows(location);

  // Jobs/Intel resolve fresh from their own authorities on every render —
  // see buildRelationshipVm()'s comment for why LocationJobBridgeService/
  // LocationIntelBridgeService (draft-creation adapters, not lookup
  // authorities) are deliberately not used here.
  const [jobRelationshipRows, intelRelationshipRows] = await Promise.all([
    Promise.all(location.linkedJobIds.map(resolveJobRow)),
    Promise.all(location.linkedIntelIds.map(resolveIntelRow))
  ]);

  const relationships = buildRelationshipVm(location, { factions, jobRelationshipRows, intelRelationshipRows, leadRows });
  const preparation = buildPreparationVm(location, { encounterSeeds, sceneRows });
  const world = buildWorldVm(location, { children, atlasFacts });
  const identity = buildLocationIdentityVm(location, { card, byId });
  const currentSituation = buildCurrentSituationVm(location, { card, relationships, preparation });

  return {
    ...card,
    raw: location,
    children,
    factionRows,
    contactRows,
    actorRows: location.npcActorUuids.map(uuid => resolveActorLink(uuid)),
    intelRows: location.linkedIntelIds.map(id => ({ id })),
    jobRows: location.linkedJobIds.map(id => ({ id })),
    sceneRows,
    hasPrimaryScene,
    canCreateScene,
    encounterSeeds,
    atlasFacts,
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
    mapNotes: location.map?.notes || '',

    // ---- Campaign-hub ecosystem VM (GM Datapad ecosystem redesign,
    // Phase 1). Presentation grouping only — every value here is derived
    // from the same authorities/fields as the flat properties above, not
    // a second stored data model. ----
    identity,
    currentSituation,
    relationships,
    preparation,
    world
  };
}


function blankEditorVm() {
  return {
    id: '',
    name: '',
    raw: {
      category: 'planetary',
      type: 'planet',
      scale: 'planetary',
      parentLocationId: '',
      revealState: 'hidden',
      controllingFactionId: '',
      region: '',
      sector: '',
      system: '',
      coordinates: '',
      image: '',
      publicSummary: '',
      gmNotes: '',
      linkedJournalUuid: '',
      hazards: '',
      rumors: '',
      commerceNotes: '',
      travelNotes: ''
    },
    tags: '',
    factionIdsText: '',
    contactIdsText: '',
    npcActorUuidsText: '',
    linkedIntelIdsText: '',
    linkedJobIdsText: '',
    linkedSceneUuidsText: '',
    mapSceneUuid: '',
    mapImagePath: '',
    mapDefaultGrid: 100,
    mapDefaultWidth: 0,
    mapDefaultHeight: 0,
    mapDefaultPadding: 0.25,
    mapNotes: ''
  };
}

function applyCreateDefaults(editor, defaults = null) {
  if (!defaults || typeof defaults !== 'object') return editor;
  return {
    ...editor,
    name: text(defaults.name, editor.name),
    factionIdsText: defaults.factionIds ? tagsLabel(defaults.factionIds) : editor.factionIdsText,
    contactIdsText: defaults.contactIds ? tagsLabel(defaults.contactIds) : editor.contactIdsText,
    raw: {
      ...editor.raw,
      controllingFactionId: text(defaults.controllingFactionId, editor.raw.controllingFactionId),
      publicSummary: text(defaults.publicSummary, editor.raw.publicSummary)
    }
  };
}

function leadDiscoveryRows(records = [], { locationId = '' } = {}) {
  const byId = new Map(records.map(entry => [entry.id, entry]));
  return LocationRegistryService.getAtlasLeadDiscoveries({ unresolvedOnly: true, locationId }).map((lead) => {
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
    const filteredCards = cards.filter((card) => {
      if (filters.category && card.category !== filters.category) return false;
      if (filters.type && card.type !== filters.type) return false;
      if (filters.revealState && card.revealState !== filters.revealState) return false;
      if (filters.special === 'known' && !card.knownToPlayers) return false;
      if (filters.special === 'hidden' && card.revealState !== 'hidden') return false;
      if (filters.special === 'active' && !card.activeForParty) return false;
      if (filters.special === 'has-scene' && !card.hasScene) return false;
      if (filters.special === 'has-seeds' && !card.hasEncounterSeeds) return false;
      if (!searchMatches(card.searchText, filters.search)) return false;
      return true;
    });
    const hasActiveFilters = Boolean(filters.search || filters.category || filters.type || filters.revealState || filters.special);
    // A filter that matches nothing must show nothing — silently
    // substituting the full unfiltered list ("filtersRelaxed") made a
    // zero-match filter look like it had no effect at all. The template
    // now renders a distinct "no locations match your filters" empty
    // state (with Clear Filters) instead.
    const visibleCards = filteredCards;
    const filtersProducedNoMatches = hasActiveFilters && cards.length > 0 && filteredCards.length === 0;
    const selectedLocationId = text(state.selectedLocationId || (state?.modal?.type === 'create' ? '' : visibleCards[0]?.id) || '');
    const selectedLocation = selectedLocationId ? LocationRegistryService.findLocation(selectedLocationId) : null;
    // Computed once, before selectedVm(), and handed to it as leadRows —
    // both the global Atlas Lead Queue below and the selected Location's
    // relationships.leads (Phase 1) read off this SAME
    // getAtlasLeadDiscoveries() scan, rather than each paying for their
    // own separately-scoped call.
    const allLeadRows = leadDiscoveryRows(records);
    const selected = await selectedVm(selectedLocation, records, factions, { leadRows: allLeadRows });
    const rawModal = state.modal && typeof state.modal === 'object' ? state.modal : {};
    const editor = selected || applyCreateDefaults(blankEditorVm(), rawModal.defaults);
    const hasSelection = Boolean(selected);
    const selectedVisibleCards = visibleCards.map(card => ({ ...card, selected: card.id === selectedLocationId }));
    const leadQueue = allLeadRows.map(lead => ({ ...lead, isSelectedLocation: lead.locationId === selectedLocationId }));
    const registryStats = LocationRegistryService.summarizeForWorkspace();
    // Selection is tracked in surface state (not just the checkbox DOM) so
    // it survives a filter rerun — before this, adjusting a library search/
    // biome/category filter rebuilt the whole import list from the VM with
    // no `checked` property at all, silently discarding whatever the GM had
    // already picked.
    const selectedSeedIds = new Set(asArray(state.librarySelectedSeedIds).map(id => String(id)));
    const librarySeeds = LocationRegistryService.getLibrarySeeds({ search: filters.librarySearch, biome: filters.libraryBiome, category: filters.libraryCategory });
    const libraryCards = librarySeeds.map(seed => ({ ...librarySeedCard(seed, records), checked: selectedSeedIds.has(String(seed.id)) }));
    const librarySummary = LocationRegistryService.summarizeLibrary({ search: filters.librarySearch, biome: filters.libraryBiome, category: filters.libraryCategory });
    const allLibraryCards = LocationRegistryService.getLibrarySeeds().map(seed => librarySeedCard(seed, records));
    librarySummary.visibleRecordCount = libraryCards.reduce((sum, card) => sum + Number(card.recordCount || 1), 0);
    librarySummary.totalRecordCount = allLibraryCards.reduce((sum, card) => sum + Number(card.recordCount || 1), 0);
    librarySummary.unimportedVisible = libraryCards.filter(card => !card.imported).length;
    librarySummary.selectedCount = libraryCards.filter(card => card.checked && !card.imported).length;
    const stats = {
      ...registryStats,
      total: registryStats.count,
      revealedCount: cards.filter(card => card.revealState !== 'hidden').length,
      importedCount: records.length,
      quickLibraryCount: librarySummary.total,
      quickLibraryVisible: librarySummary.visible,
      quickLibraryRecordCount: librarySummary.totalRecordCount,
      filteredCount: filteredCards.length,
      visibleCount: visibleCards.length
    };

    const modalType = text(rawModal.type);
    const deleteLocationId = text(rawModal.locationId);
    const deleteLocation = deleteLocationId ? LocationRegistryService.findLocation(deleteLocationId) : null;

    // A location can never be its own parent — excluded outright rather
    // than merely marked disabled=true, since <datalist> options don't
    // reliably enforce "disabled" across browsers and the field is free
    // text regardless (upsertLocation()'s own _validateParentLocationId()
    // is the real, unconditional guard against self-parenting and cycles —
    // it rejects the whole save rather than silently clearing the field;
    // this list is only the suggestion UI).
    const locationOptions = [{ value: '', label: 'No parent / standalone', selected: !editor?.parentLocationId }, ...records.filter(record => record.id !== selected?.id).map(record => ({
      value: record.id,
      label: locationChain(record, new Map(records.map(entry => [entry.id, entry]))) || record.name,
      selected: record.id === editor?.parentLocationId
    }))];
    const factionOptions = [{ value: '', label: 'No controlling faction', selected: !editor?.raw?.controllingFactionId }, ...factions.map(faction => ({ value: faction.id, label: faction.name, selected: faction.id === editor?.raw?.controllingFactionId }))];

    return {
      pageTitle: 'Locations',
      pageDescription: 'A GM hub for planets, cities, space sites, POIs, Atlas facts, encounter seeds, maps, and linked campaign systems.',
      locationManager: {
        filters,
        cards: selectedVisibleCards,
        allCards: cards,
        hasLocations: cards.length > 0,
        hasVisibleLocations: visibleCards.length > 0,
        hasActiveFilters,
        filtersProducedNoMatches,
        selectedLocationId,
        selected,
        editor,
        hasSelection,
        leadQueue,
        hasLeadQueue: leadQueue.length > 0,
        stats,
        library: {
          cards: libraryCards,
          previewCards: libraryCards.slice(0, 4),
          summary: librarySummary,
          hasCards: libraryCards.length > 0,
          selectedBiome: filters.libraryBiome,
          selectedCategory: filters.libraryCategory
        },
        modal: {
          isOpen: Boolean(modalType),
          isImport: modalType === 'import',
          isCreate: modalType === 'create',
          isDelete: modalType === 'delete',
          deleteLocationId,
          deleteLocationName: text(rawModal.locationName || deleteLocation?.name || deleteLocationId, 'Selected location')
        },
        libraryBiomeOptions: [{ value: '', label: 'All library biomes', selected: !filters.libraryBiome }, ...LocationRegistryService.getLibraryBiomes().map(entry => ({ ...entry, selected: entry.value === filters.libraryBiome }))],
        libraryCategoryOptions: optionsFrom(optionSource('CATEGORIES'), filters.libraryCategory, { includeAll: true, allLabel: 'All library categories' }),
        libraryBiomeButtons: filterButtonRows(LocationRegistryService.getLibraryBiomes(), filters.libraryBiome, { allLabel: 'All biomes' }),
        libraryCategoryButtons: filterButtonRows(optionSource('CATEGORIES'), filters.libraryCategory, { allLabel: 'All categories' }),
        categoryOptions: optionsFrom(optionSource('CATEGORIES'), filters.category, { includeAll: true, allLabel: 'All categories' }),
        typeOptions: optionsFrom(optionSource('TYPES'), filters.type, { includeAll: true, allLabel: 'All types' }),
        revealOptions: optionsFrom(optionSource('REVEAL_STATES'), filters.revealState, { includeAll: true, allLabel: 'All reveal states' }),
        specialOptions: [
          { value: '', label: 'All records', selected: !filters.special },
          { value: 'known', label: 'Known to players', selected: filters.special === 'known' },
          { value: 'hidden', label: 'GM only', selected: filters.special === 'hidden' },
          { value: 'active', label: 'Active location', selected: filters.special === 'active' },
          { value: 'has-scene', label: 'Has map/scene', selected: filters.special === 'has-scene' },
          { value: 'has-seeds', label: 'Has encounter seeds', selected: filters.special === 'has-seeds' }
        ],
        categoryFilterButtons: filterButtonRows(optionSource('CATEGORIES'), filters.category, { allLabel: 'All' }),
        typeFilterButtons: filterButtonRows(optionSource('TYPES'), filters.type, { allLabel: 'All' }),
        revealFilterButtons: filterButtonRows(optionSource('REVEAL_STATES'), filters.revealState, { allLabel: 'All' }),
        specialFilterButtons: [
          { value: '', label: 'All', selected: !filters.special },
          { value: 'known', label: 'Known', selected: filters.special === 'known' },
          { value: 'hidden', label: 'GM Only', selected: filters.special === 'hidden' },
          { value: 'active', label: 'Active', selected: filters.special === 'active' },
          { value: 'has-scene', label: 'Has Scene', selected: filters.special === 'has-scene' },
          { value: 'has-seeds', label: 'Has Seeds', selected: filters.special === 'has-seeds' }
        ],
        editorCategoryOptions: optionsFrom(optionSource('CATEGORIES'), editor?.raw?.category || 'planetary'),
        editorTypeOptions: optionsFrom(optionSource('TYPES'), editor?.raw?.type || 'planet'),
        editorScaleOptions: optionsFrom(optionSource('SCALES'), editor?.raw?.scale || 'planetary'),
        editorRevealOptions: optionsFrom(optionSource('REVEAL_STATES'), editor?.raw?.revealState || 'hidden'),
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
