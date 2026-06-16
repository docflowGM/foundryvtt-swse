/**
 * LocationRegistryService
 *
 * World-scoped location/atlas registry. This is intentionally a lightweight
 * linking authority: locations own place metadata and Atlas facts only. Foundry
 * Actors, Scenes, Journals, Holonet Intel, Jobs, and Factions remain owned by
 * their existing systems and are linked by id/UUID.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { LOCATION_LIBRARY_BIOMES, LOCATION_LIBRARY_SEEDS, buildLocationLibraryRecords, filterLocationLibrarySeeds, getLocationLibrarySeed } from '/systems/foundryvtt-swse/scripts/locations/location-library-seeds.js';

const MODULE_ID = 'foundryvtt-swse';
const REGISTRY_SETTING = 'gmLocationRegistry';
const ATLAS_ACTOR_FLAG = 'atlasLocationState';
const MAX_HISTORY = 100;

const LOCATION_CATEGORIES = Object.freeze([
  { value: 'planetary', label: 'Planetary' },
  { value: 'space', label: 'Space' },
  { value: 'installation', label: 'Installations' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'other', label: 'Other / Strange' },
  { value: 'custom', label: 'Custom' }
]);

const LOCATION_TYPES = Object.freeze([
  { value: 'planet', label: 'Planet' },
  { value: 'moon', label: 'Moon' },
  { value: 'star-system', label: 'Star System' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'hyperspace-route', label: 'Hyperspace Route' },
  { value: 'asteroid', label: 'Asteroid / Mining Rock' },
  { value: 'space-station', label: 'Space Station' },
  { value: 'ship', label: 'Ship' },
  { value: 'fleet', label: 'Fleet' },
  { value: 'city', label: 'City / Settlement' },
  { value: 'region', label: 'Region / District' },
  { value: 'poi', label: 'Point of Interest' },
  { value: 'base', label: 'Base / Safehouse' },
  { value: 'temple', label: 'Temple / Ruin' },
  { value: 'facility', label: 'Facility' },
  { value: 'battlefield', label: 'Battlefield' },
  { value: 'force-vergence', label: 'Force Vergence' },
  { value: 'unknown', label: 'Unknown Coordinates' },
  { value: 'custom', label: 'Custom' }
]);

const LOCATION_SCALES = Object.freeze([
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
]);

const LOCATION_REVEAL_STATES = Object.freeze([
  { value: 'hidden', label: 'GM Only' },
  { value: 'hinted', label: 'Hinted' },
  { value: 'known', label: 'Known' },
  { value: 'active', label: 'Active' },
  { value: 'compromised', label: 'Compromised' }
]);

const ATLAS_FACT_CATEGORIES = Object.freeze([
  { value: 'general', label: 'General' },
  { value: 'history', label: 'History' },
  { value: 'culture', label: 'Culture' },
  { value: 'government', label: 'Government' },
  { value: 'underworld', label: 'Underworld' },
  { value: 'military', label: 'Military' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'travel', label: 'Travel' },
  { value: 'hazards', label: 'Hazards' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'rumors', label: 'Rumors' },
  { value: 'force-lore', label: 'Force Lore' },
  { value: 'technology', label: 'Technology' },
  { value: 'archaeology', label: 'Archaeology' },
  { value: 'local-secrets', label: 'Local Secrets' }
]);

const ATLAS_SKILLS = Object.freeze([
  { value: 'knowledgeGalacticLore', label: 'Knowledge (Galactic Lore)' },
  { value: 'knowledgeSocialSciences', label: 'Knowledge (Social Sciences)' },
  { value: 'knowledgeTactics', label: 'Knowledge (Tactics)' },
  { value: 'knowledgeTechnology', label: 'Knowledge (Technology)' },
  { value: 'knowledgeLifeSciences', label: 'Knowledge (Life Sciences)' },
  { value: 'knowledgeBureaucracy', label: 'Knowledge (Bureaucracy)' },
  { value: 'knowledgePhysicalSciences', label: 'Knowledge (Physical Sciences)' },
  { value: 'gatherInformation', label: 'Gather Information' },
  { value: 'useComputer', label: 'Use Computer' },
  { value: 'perception', label: 'Perception' },
  { value: 'survival', label: 'Survival' },
  { value: 'useTheForce', label: 'Use the Force' },
  { value: 'mechanics', label: 'Mechanics' }
]);


const ATLAS_FACT_REVEAL_MODES = Object.freeze([
  { value: 'any', label: 'Any listed check reveals this fact' },
  { value: 'tiered', label: 'Tiered knowledge stack / DC ladder' }
]);

const ENCOUNTER_SEED_CATEGORIES = Object.freeze([
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'civilians', label: 'Civilians' },
  { value: 'guards', label: 'Guards' },
  { value: 'criminals', label: 'Criminals' },
  { value: 'military', label: 'Military' },
  { value: 'droids', label: 'Droids' },
  { value: 'hazards', label: 'Hazards' },
  { value: 'bosses', label: 'Bosses' },
  { value: 'merchants', label: 'Merchants' },
  { value: 'quest-npcs', label: 'Quest NPCs' },
  { value: 'random', label: 'Random Encounters' }
]);

const LEAD_OUTPUTS = Object.freeze([
  { value: 'none', label: 'Reveal Fact Only' },
  { value: 'job-draft', label: 'Create Job Draft' },
  { value: 'intel-draft', label: 'Create Intel Draft' },
  { value: 'reveal-location', label: 'Reveal Location / POI' },
  { value: 'reveal-faction', label: 'Reveal Faction Presence' },
  { value: 'reveal-contact', label: 'Reveal Named NPC' },
  { value: 'holonet-update', label: 'Send Holonet Update' },
  { value: 'scene-prep', label: 'Prepare Scene' }
]);

const CATEGORY_VALUES = new Set(LOCATION_CATEGORIES.map(entry => entry.value));
const TYPE_VALUES = new Set(LOCATION_TYPES.map(entry => entry.value));
const SCALE_VALUES = new Set(LOCATION_SCALES.map(entry => entry.value));
const REVEAL_VALUES = new Set(LOCATION_REVEAL_STATES.map(entry => entry.value));
const FACT_CATEGORY_VALUES = new Set(ATLAS_FACT_CATEGORIES.map(entry => entry.value));
const SKILL_VALUES = new Set(ATLAS_SKILLS.map(entry => entry.value));
const SEED_CATEGORY_VALUES = new Set(ENCOUNTER_SEED_CATEGORIES.map(entry => entry.value));
const FACT_REVEAL_MODE_VALUES = new Set(ATLAS_FACT_REVEAL_MODES.map(entry => entry.value));
const LEAD_OUTPUT_VALUES = new Set(LEAD_OUTPUTS.map(entry => entry.value));

function nowIso() {
  try { return new Date().toISOString(); } catch (_err) { return ''; }
}

function randomId() {
  return foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
}

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function bool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'known', 'active'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off', 'hidden'].includes(normalized)) return false;
  return Boolean(fallback);
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (value instanceof Set) return Array.from(value.values());
  return [];
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(entry => text(entry)).filter(Boolean);
  return String(value ?? '').split(/,|\n/g).map(entry => text(entry)).filter(Boolean);
}

function choice(value, allowed, fallback) {
  const raw = text(value || fallback).toLowerCase();
  return allowed.has(raw) ? raw : fallback;
}

function slugify(value) {
  const slug = text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || randomId();
}

function getRegistrySetting(fallback = []) {
  try {
    const value = game.settings?.get?.(MODULE_ID, REGISTRY_SETTING);
    return Array.isArray(value) ? value : fallback;
  } catch (_err) {
    return fallback;
  }
}

async function setRegistrySetting(records = []) {
  return game.settings?.set?.(MODULE_ID, REGISTRY_SETTING, Array.isArray(records) ? records : []);
}

function normalizeMap(record = {}) {
  const source = record.map && typeof record.map === 'object' ? { ...record.map, ...record } : record;
  return {
    sceneUuid: text(source.sceneUuid || source.linkedSceneUuid || ''),
    imagePath: text(source.imagePath || source.mapImage || source.image || ''),
    imageUuid: text(source.imageUuid || ''),
    defaultGrid: Math.max(0, Math.floor(number(source.defaultGrid ?? source.grid ?? 100, 100))),
    defaultWidth: Math.max(0, Math.floor(number(source.defaultWidth ?? source.width ?? 0, 0))),
    defaultHeight: Math.max(0, Math.floor(number(source.defaultHeight ?? source.height ?? 0, 0))),
    defaultPadding: Math.max(0, Math.min(1, number(source.defaultPadding ?? source.padding ?? 0.25, 0.25))),
    notes: text(source.mapNotes || source.notes || '')
  };
}


function normalizeSkillKey(value = '') {
  const raw = text(value || '').trim();
  if (!raw) return 'knowledgeGalacticLore';
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const byValue = ATLAS_SKILLS.find(entry => entry.value.toLowerCase() === raw.toLowerCase() || entry.value.toLowerCase().replace(/[^a-z0-9]+/g, '') === compact);
  if (byValue) return byValue.value;
  const byLabel = ATLAS_SKILLS.find(entry => entry.label.toLowerCase() === raw.toLowerCase() || entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '') === compact);
  if (byLabel) return byLabel.value;
  const aliases = new Map([
    ['galacticlore', 'knowledgeGalacticLore'],
    ['knowledgegalactic', 'knowledgeGalacticLore'],
    ['socialsciences', 'knowledgeSocialSciences'],
    ['socialscience', 'knowledgeSocialSciences'],
    ['tactics', 'knowledgeTactics'],
    ['technology', 'knowledgeTechnology'],
    ['lifesciences', 'knowledgeLifeSciences'],
    ['lifescience', 'knowledgeLifeSciences'],
    ['bureaucracy', 'knowledgeBureaucracy'],
    ['physicalsciences', 'knowledgePhysicalSciences'],
    ['physicalscience', 'knowledgePhysicalSciences'],
    ['gatherinfo', 'gatherInformation'],
    ['gatherinformation', 'gatherInformation'],
    ['usecomputer', 'useComputer'],
    ['perception', 'perception'],
    ['survival', 'survival'],
    ['usetheforce', 'useTheForce'],
    ['force', 'useTheForce'],
    ['mechanics', 'mechanics']
  ]);
  return aliases.get(compact) || 'knowledgeGalacticLore';
}

function parseAtlasCheckLines(value = '') {
  const lines = String(value ?? '').split(/
+/g).map(line => text(line)).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    const pipeParts = line.split('|').map(part => text(part));
    let skillText = pipeParts[0] || '';
    let dcText = pipeParts[1] || '';
    let label = pipeParts.slice(2).join(' | ');
    if (!dcText) {
      const dcMatch = line.match(/(?:DC\s*)?(\d{1,3})/i);
      if (dcMatch) {
        dcText = dcMatch[1];
        skillText = line.slice(0, dcMatch.index).replace(/DC\s*$/i, '').trim() || skillText;
        label = line.slice((dcMatch.index || 0) + dcMatch[0].length).replace(/^\s*[-:|,]\s*/, '').trim() || label;
      }
    }
    const dc = Math.max(0, Math.floor(number(dcText, 0)));
    if (!dc) continue;
    parsed.push(normalizeCheck({ skill: normalizeSkillKey(skillText), dc, label }));
  }
  const seen = new Set();
  return parsed.filter((check) => {
    const key = `${check.skill}:${check.dc}:${check.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCheck(record = {}) {
  const skill = choice(normalizeSkillKey(record.skill || record.checkSkill), SKILL_VALUES, 'knowledgeGalacticLore');
  return {
    id: text(record.id || record.checkId) || randomId(),
    skill,
    dc: Math.max(0, Math.floor(number(record.dc ?? record.checkDc ?? 10, 10))),
    label: text(record.label || '')
  };
}

function normalizeOnReveal(record = {}) {
  const output = choice(record.output || record.outputType || record.leadOutput || 'none', LEAD_OUTPUT_VALUES, 'none');
  return {
    output,
    revealLocationIds: splitList(record.revealLocationIds || record.revealsLocationIds),
    revealFactionIds: splitList(record.revealFactionIds || record.factionIds),
    revealContactIds: splitList(record.revealContactIds || record.contactIds),
    createIntel: bool(record.createIntel, output === 'intel-draft'),
    createJob: bool(record.createJob, output === 'job-draft'),
    jobTitle: text(record.jobTitle || ''),
    jobObjective: text(record.jobObjective || ''),
    jobRewardCredits: Math.max(0, Math.floor(number(record.jobRewardCredits ?? record.rewardCredits ?? 0, 0))),
    intelTitle: text(record.intelTitle || ''),
    holonetTitle: text(record.holonetTitle || ''),
    notes: text(record.notes || '')
  };
}

function normalizeFact(record = {}, index = 0) {
  const title = text(record.title || record.name || `Atlas Fact ${index + 1}`);
  const revealState = choice(record.revealState || (record.knownToPlayers ? 'known' : 'hidden'), REVEAL_VALUES, 'hidden');
  const knownToPlayers = bool(record.knownToPlayers, revealState === 'known' || revealState === 'active' || revealState === 'compromised');
  const lineChecks = parseAtlasCheckLines(record.checksText || record.factChecksText || record.skillGatesText || '');
  const recordChecks = safeArray(record.checks).length ? safeArray(record.checks).map(normalizeCheck) : [];
  const checks = (recordChecks.length ? recordChecks : lineChecks.length ? lineChecks : [normalizeCheck(record)]);
  return {
    id: text(record.id || record.factId) || slugify(title),
    title,
    teaser: text(record.teaser || record.hint || 'Unresolved local lead.'),
    body: text(record.body || record.revealText || record.description || ''),
    category: choice(record.category || 'general', FACT_CATEGORY_VALUES, 'general'),
    revealState,
    knownToPlayers,
    checks,
    revealMode: choice(record.revealMode || record.factRevealMode || 'any', FACT_REVEAL_MODE_VALUES, 'any'),
    oneTime: bool(record.oneTime, false),
    repeatable: bool(record.repeatable, true),
    onReveal: normalizeOnReveal(record.onReveal || record),
    tags: splitList(record.tags),
    createdAt: text(record.createdAt || nowIso()),
    updatedAt: text(record.updatedAt || record.createdAt || nowIso())
  };
}

function normalizeEncounterSeed(record = {}, index = 0) {
  const name = text(record.name || record.actorName || record.label || `Encounter Seed ${index + 1}`);
  const uuid = text(record.uuid || record.actorUuid || record.documentUuid || '');
  const documentType = text(record.documentType || record.type || (uuid.includes('Actor') ? 'Actor' : ''));
  const sourceKind = text(record.sourceKind || record.source || (uuid?.startsWith?.('Compendium.') ? 'compendium' : uuid ? 'world' : 'manual'));
  return {
    id: text(record.id || record.seedId) || slugify(`${name}-${index + 1}`),
    uuid,
    name,
    category: choice(record.category || 'random', SEED_CATEGORY_VALUES, 'random'),
    role: text(record.role || ''),
    quantity: text(record.quantity || record.count || '1'),
    notes: text(record.notes || ''),
    img: text(record.img || record.image || ''),
    documentType,
    sourceKind,
    sourcePack: text(record.sourcePack || record.pack || ''),
    sourceId: text(record.sourceId || record.documentId || record.id || ''),
    tokenDisposition: text(record.tokenDisposition || record.disposition || ''),
    tokenHidden: bool(record.tokenHidden, false),
    createdAt: text(record.createdAt || nowIso()),
    updatedAt: text(record.updatedAt || record.createdAt || nowIso())
  };
}

function normalizeFactionPresence(record = {}) {
  return {
    factionId: text(record.factionId || record.id || ''),
    influence: text(record.influence || 'present'),
    status: text(record.status || 'active'),
    publicKnown: bool(record.publicKnown ?? record.knownToPlayers, false),
    gmNotes: text(record.gmNotes || record.notes || '')
  };
}

function normalizeLeadDiscovery(record = {}) {
  return {
    id: text(record.id || record.discoveryId) || randomId(),
    actorId: text(record.actorId || ''),
    actorName: text(record.actorName || ''),
    locationId: text(record.locationId || ''),
    locationName: text(record.locationName || ''),
    factId: text(record.factId || ''),
    factTitle: text(record.factTitle || ''),
    skill: normalizeSkillKey(record.skill || ''),
    checkId: text(record.checkId || ''),
    checkLabel: text(record.checkLabel || ''),
    dc: Math.max(0, Math.floor(number(record.dc ?? 0, 0))),
    total: Math.floor(number(record.total ?? 0, 0)),
    output: choice(record.output || 'none', LEAD_OUTPUT_VALUES, 'none'),
    wantsJob: bool(record.wantsJob ?? record.createJob, false),
    wantsIntel: bool(record.wantsIntel ?? record.createIntel, false),
    revealLocationIds: splitList(record.revealLocationIds),
    revealFactionIds: splitList(record.revealFactionIds),
    revealContactIds: splitList(record.revealContactIds),
    status: ['open', 'resolved', 'dismissed'].includes(text(record.status || 'open')) ? text(record.status || 'open') : 'open',
    note: text(record.note || ''),
    createdAt: text(record.createdAt || nowIso()),
    updatedAt: text(record.updatedAt || record.createdAt || nowIso()),
    resolvedAt: text(record.resolvedAt || ''),
    resolvedByUserId: text(record.resolvedByUserId || '')
  };
}

function normalizeActorLocationState(state = {}) {
  return {
    pins: splitList(state.pins),
    reviewed: splitList(state.reviewed),
    archived: splitList(state.archived),
    playerNotes: state.playerNotes && typeof state.playerNotes === 'object' ? { ...state.playerNotes } : {},
    revealedFacts: state.revealedFacts && typeof state.revealedFacts === 'object' ? { ...state.revealedFacts } : {},
    leadDiscoveries: safeArray(state.leadDiscoveries).map(normalizeLeadDiscovery).slice(-MAX_HISTORY),
    activeLocationId: text(state.activeLocationId || ''),
    lastUpdated: text(state.lastUpdated || nowIso())
  };
}

export function registerLocationRegistrySettings() {
  if (game.settings.settings.has(`${MODULE_ID}.${REGISTRY_SETTING}`)) return;
  game.settings.register(MODULE_ID, REGISTRY_SETTING, {
    name: 'GM Location Registry',
    hint: 'Campaign locations, Atlas facts, encounter seeds, and links to factions, Intel, jobs, scenes, maps, and NPCs.',
    scope: 'world',
    config: false,
    type: Object,
    default: []
  });
}

export class LocationRegistryService {
  static REGISTRY_SETTING = REGISTRY_SETTING;
  static ATLAS_ACTOR_FLAG = ATLAS_ACTOR_FLAG;
  static CATEGORIES = LOCATION_CATEGORIES;
  static TYPES = LOCATION_TYPES;
  static SCALES = LOCATION_SCALES;
  static REVEAL_STATES = LOCATION_REVEAL_STATES;
  static FACT_CATEGORIES = ATLAS_FACT_CATEGORIES;
  static ATLAS_SKILLS = ATLAS_SKILLS;
  static FACT_REVEAL_MODES = ATLAS_FACT_REVEAL_MODES;
  static ENCOUNTER_SEED_CATEGORIES = ENCOUNTER_SEED_CATEGORIES;
  static LEAD_OUTPUTS = LEAD_OUTPUTS;
  static LIBRARY_SEEDS = LOCATION_LIBRARY_SEEDS;
  static LIBRARY_BIOMES = LOCATION_LIBRARY_BIOMES;

  static normalizeSkillKey(value = '') {
    return normalizeSkillKey(value);
  }

  static parseAtlasCheckLines(value = '') {
    return parseAtlasCheckLines(value);
  }

  static formatAtlasCheckLines(checks = []) {
    return safeArray(checks).map((check) => {
      const normalized = normalizeCheck(check);
      const label = normalized.label ? ` | ${normalized.label}` : '';
      return `${normalized.skill} | ${normalized.dc}${label}`;
    }).join('
');
  }

  static getRegistry() {
    return safeArray(getRegistrySetting()).map(record => this.normalizeLocation(record));
  }

  static async saveRegistry(records = []) {
    const normalized = safeArray(records).map(record => this.normalizeLocation(record));
    await setRegistrySetting(normalized);
    Hooks.callAll('swseLocationRegistryUpdated', { records: normalized });
    return normalized;
  }

  static normalizeLocation(record = {}) {
    const name = text(record.name || record.locationName || 'Unnamed Location');
    const revealState = choice(record.revealState || (record.knownToPlayers ? 'known' : 'hidden'), REVEAL_VALUES, 'hidden');
    const knownToPlayers = bool(record.knownToPlayers, revealState === 'known' || revealState === 'active' || revealState === 'compromised');
    const category = choice(record.category || record.locale || 'planetary', CATEGORY_VALUES, 'planetary');
    const type = choice(record.type || record.locationType || 'poi', TYPE_VALUES, 'poi');
    return {
      id: text(record.id || record.locationId) || slugify(name),
      name,
      category,
      type,
      scale: choice(record.scale || defaultScaleFor(type), SCALE_VALUES, defaultScaleFor(type)),
      parentLocationId: text(record.parentLocationId || record.parentId || ''),
      currentLocationId: text(record.currentLocationId || ''),
      region: text(record.region || ''),
      sector: text(record.sector || ''),
      system: text(record.system || record.starSystem || ''),
      coordinates: text(record.coordinates || ''),
      image: text(record.image || record.img || ''),
      tags: splitList(record.tags),
      librarySeedId: text(record.librarySeedId || ''),
      libraryBiomes: splitList(record.libraryBiomes || record.biomes),
      revealState,
      knownToPlayers,
      activeForParty: bool(record.activeForParty, false),
      activeActorIds: splitList(record.activeActorIds),
      controllingFactionId: text(record.controllingFactionId || ''),
      factionIds: splitList(record.factionIds),
      factionPresence: safeArray(record.factionPresence).map(normalizeFactionPresence).filter(entry => entry.factionId),
      contactIds: splitList(record.contactIds),
      npcActorUuids: splitList(record.npcActorUuids || record.actorUuids),
      linkedIntelIds: splitList(record.linkedIntelIds || record.intelIds),
      linkedHolonetRecordIds: splitList(record.linkedHolonetRecordIds || record.holonetRecordIds),
      linkedJobIds: splitList(record.linkedJobIds || record.jobIds),
      linkedSceneUuids: splitList(record.linkedSceneUuids || record.sceneUuids),
      linkedJournalUuid: text(record.linkedJournalUuid || record.journalUuid || ''),
      encounterSeeds: safeArray(record.encounterSeeds).map(normalizeEncounterSeed),
      atlasFacts: safeArray(record.atlasFacts).map(normalizeFact),
      map: normalizeMap(record.map || record),
      publicSummary: text(record.publicSummary || record.description || ''),
      gmNotes: text(record.gmNotes || record.privateNotes || ''),
      hazards: text(record.hazards || ''),
      rumors: text(record.rumors || ''),
      commerceNotes: text(record.commerceNotes || ''),
      travelNotes: text(record.travelNotes || ''),
      history: safeArray(record.history).slice(-MAX_HISTORY),
      createdAt: text(record.createdAt || nowIso()),
      updatedAt: text(record.updatedAt || record.createdAt || nowIso())
    };
  }

  static findLocation(query = '') {
    const needle = text(query).toLowerCase();
    if (!needle) return null;
    return this.getRegistry().find(record => record.id === query || record.id.toLowerCase() === needle || record.name.toLowerCase() === needle || slugify(record.name) === needle) || null;
  }

  static getChildren(parentLocationId = '') {
    const parentId = text(parentLocationId);
    return this.getRegistry().filter(record => record.parentLocationId === parentId);
  }

  static getLocationsForFaction(factionId = '', { includeHidden = true } = {}) {
    const id = text(factionId);
    if (!id) return [];
    const isVisible = (location) => includeHidden || location.knownToPlayers || ['known', 'active', 'compromised'].includes(location.revealState);
    return this.getRegistry().filter((location) => {
      if (!isVisible(location)) return false;
      if (location.controllingFactionId === id) return true;
      if (safeArray(location.factionIds).includes(id)) return true;
      return safeArray(location.factionPresence).some(entry => text(entry.factionId) === id);
    });
  }

  static getLocationsForContact(contactId = '', { includeHidden = true } = {}) {
    const id = text(contactId);
    if (!id) return [];
    const isVisible = (location) => includeHidden || location.knownToPlayers || ['known', 'active', 'compromised'].includes(location.revealState);
    return this.getRegistry().filter(location => isVisible(location) && safeArray(location.contactIds).includes(id));
  }

  static async linkFactionToLocation(locationId = '', factionId = '', { controlling = false, presence = {} } = {}) {
    const location = this.findLocation(locationId);
    const id = text(factionId);
    if (!location || !id) return null;
    const factionIds = Array.from(new Set([...safeArray(location.factionIds), id].filter(Boolean)));
    const normalizedPresence = normalizeFactionPresence({ ...presence, factionId: id });
    const factionPresence = normalizedPresence.factionId
      ? [
        ...safeArray(location.factionPresence).filter(entry => text(entry.factionId) !== id),
        normalizedPresence
      ]
      : safeArray(location.factionPresence);
    return this.upsertLocation({
      ...location,
      factionIds,
      factionPresence,
      controllingFactionId: controlling ? id : location.controllingFactionId,
      historyNote: `Linked faction ${id} to ${location.name}.`
    });
  }

  static async linkContactToLocation(locationId = '', contactId = '', { factionId = '' } = {}) {
    const location = this.findLocation(locationId);
    const id = text(contactId);
    if (!location || !id) return null;
    return this.upsertLocation({
      ...location,
      contactIds: Array.from(new Set([...safeArray(location.contactIds), id].filter(Boolean))),
      factionIds: factionId ? Array.from(new Set([...safeArray(location.factionIds), text(factionId)].filter(Boolean))) : location.factionIds,
      historyNote: `Linked contact ${id} to ${location.name}.`
    });
  }

  static async upsertLocation(data = {}) {
    const records = this.getRegistry();
    const requestedId = text(data.id || data.locationId);
    const name = text(data.name || data.locationName || 'Unnamed Location');
    const byId = requestedId ? records.find(record => record.id === requestedId) : null;
    const byName = records.find(record => record.name.toLowerCase() === name.toLowerCase());
    const existing = byId ?? byName ?? null;
    const id = existing?.id || requestedId || slugify(name);
    const normalized = this.normalizeLocation({
      ...existing,
      ...data,
      id,
      name,
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: [
        ...safeArray(existing?.history),
        { id: randomId(), at: nowIso(), type: existing ? 'location-updated' : 'location-created', note: text(data.historyNote || '') }
      ]
    });
    const next = existing ? records.map(record => record.id === id ? normalized : record) : [...records, normalized];
    await this.saveRegistry(next);
    return normalized;
  }

  static async deleteLocation(locationId = '') {
    const id = text(locationId);
    if (!id) return false;
    const records = this.getRegistry();
    const next = records
      .filter(record => record.id !== id)
      .map(record => record.parentLocationId === id ? { ...record, parentLocationId: '' } : record);
    await this.saveRegistry(next);
    return next.length !== records.length;
  }

  static async revealLocation(locationId = '', { revealState = 'known', activeForParty = false } = {}) {
    const location = this.findLocation(locationId);
    if (!location) return null;
    return this.upsertLocation({ ...location, revealState, knownToPlayers: true, activeForParty: activeForParty || location.activeForParty });
  }

  static async setPartyLocation(locationId = '') {
    const id = text(locationId);
    const records = this.getRegistry().map(record => ({ ...record, activeForParty: record.id === id }));
    await this.saveRegistry(records);
    return this.findLocation(id);
  }

  static async addEncounterSeed(locationId = '', seed = {}) {
    const location = this.findLocation(locationId);
    if (!location) return null;
    const normalized = normalizeEncounterSeed(seed, location.encounterSeeds.length);
    const existing = location.encounterSeeds.find(entry => entry.id === normalized.id || (entry.uuid && entry.uuid === normalized.uuid));
    const encounterSeeds = existing
      ? location.encounterSeeds.map(entry => entry.id === existing.id ? { ...entry, ...normalized, id: existing.id, updatedAt: nowIso() } : entry)
      : [...location.encounterSeeds, normalized];
    return this.upsertLocation({ ...location, encounterSeeds });
  }

  static async removeEncounterSeed(locationId = '', seedId = '') {
    const location = this.findLocation(locationId);
    if (!location) return null;
    return this.upsertLocation({ ...location, encounterSeeds: location.encounterSeeds.filter(seed => seed.id !== seedId) });
  }

  static async updateEncounterSeed(locationId = '', seedId = '', patch = {}) {
    const location = this.findLocation(locationId);
    if (!location || !seedId) return null;
    const encounterSeeds = location.encounterSeeds.map((seed, index) => {
      if (seed.id !== seedId) return seed;
      return normalizeEncounterSeed({ ...seed, ...patch, id: seed.id, updatedAt: nowIso() }, index);
    });
    return this.upsertLocation({ ...location, encounterSeeds });
  }

  static async linkScene(locationId = '', sceneUuid = '', { primary = true } = {}) {
    const location = this.findLocation(locationId);
    const uuid = text(sceneUuid);
    if (!location || !uuid) return null;
    const linkedSceneUuids = Array.from(new Set([...safeArray(location.linkedSceneUuids), uuid]));
    const map = primary ? { ...(location.map || {}), sceneUuid: location.map?.sceneUuid || uuid } : { ...(location.map || {}) };
    return this.upsertLocation({ ...location, linkedSceneUuids, map, historyNote: `Linked Scene ${uuid}.` });
  }

  static async unlinkLocationLink(locationId = '', kind = '', value = '') {
    const location = this.findLocation(locationId);
    const linkKind = text(kind).toLowerCase();
    const needle = text(value);
    if (!location || !linkKind || !needle) return null;
    const remove = (list = []) => safeArray(list).filter(entry => text(entry) !== needle);
    const patch = { ...location };
    if (linkKind === 'faction') {
      patch.factionIds = remove(location.factionIds);
      patch.factionPresence = safeArray(location.factionPresence).filter(entry => text(entry.factionId) !== needle);
      if (patch.controllingFactionId === needle) patch.controllingFactionId = '';
    } else if (linkKind === 'contact' || linkKind === 'npc-dossier') {
      patch.contactIds = remove(location.contactIds);
    } else if (linkKind === 'actor' || linkKind === 'npc') {
      patch.npcActorUuids = remove(location.npcActorUuids);
      patch.encounterSeeds = safeArray(location.encounterSeeds).filter(seed => text(seed.uuid) !== needle);
    } else if (linkKind === 'scene') {
      patch.linkedSceneUuids = remove(location.linkedSceneUuids);
      if (patch.map?.sceneUuid === needle) patch.map = { ...(patch.map || {}), sceneUuid: patch.linkedSceneUuids[0] || '' };
    } else if (linkKind === 'journal') {
      if (patch.linkedJournalUuid === needle) patch.linkedJournalUuid = '';
    } else if (linkKind === 'intel') {
      patch.linkedIntelIds = remove(location.linkedIntelIds);
    } else if (linkKind === 'job') {
      patch.linkedJobIds = remove(location.linkedJobIds);
    } else if (linkKind === 'encounter-seed' || linkKind === 'seed') {
      patch.encounterSeeds = safeArray(location.encounterSeeds).filter(seed => text(seed.id) !== needle);
    } else {
      return null;
    }
    return this.upsertLocation({ ...patch, historyNote: `Unlinked ${linkKind} ${needle}.` });
  }

  static async upsertAtlasFact(locationId = '', fact = {}) {
    const location = this.findLocation(locationId);
    if (!location) return null;
    const normalized = normalizeFact(fact, location.atlasFacts.length);
    const existing = location.atlasFacts.find(entry => entry.id === normalized.id);
    const atlasFacts = existing
      ? location.atlasFacts.map(entry => entry.id === normalized.id ? { ...entry, ...normalized, id: entry.id, updatedAt: nowIso() } : entry)
      : [...location.atlasFacts, normalized];
    return this.upsertLocation({ ...location, atlasFacts });
  }

  static async removeAtlasFact(locationId = '', factId = '') {
    const location = this.findLocation(locationId);
    if (!location) return null;
    return this.upsertLocation({ ...location, atlasFacts: location.atlasFacts.filter(fact => fact.id !== factId) });
  }

  static getActorAtlasState(actor) {
    const raw = actor?.getFlag?.(MODULE_ID, ATLAS_ACTOR_FLAG) || {};
    return normalizeActorLocationState(raw);
  }

  static async setActorAtlasState(actor, patch = {}) {
    if (!actor?.setFlag) return null;
    const current = this.getActorAtlasState(actor);
    const next = normalizeActorLocationState({ ...current, ...patch, lastUpdated: nowIso() });
    await actor.setFlag(MODULE_ID, ATLAS_ACTOR_FLAG, next);
    return next;
  }

  static async patchActorLocationState(actor, locationId = '', patch = {}) {
    if (!actor?.setFlag) return null;
    const id = text(locationId);
    if (!id) return this.getActorAtlasState(actor);
    const current = this.getActorAtlasState(actor);
    const pins = new Set(current.pins);
    const reviewed = new Set(current.reviewed);
    const archived = new Set(current.archived);
    if (patch.pinned === true) pins.add(id);
    if (patch.pinned === false) pins.delete(id);
    if (patch.reviewed === true) reviewed.add(id);
    if (patch.reviewed === false) reviewed.delete(id);
    if (patch.archived === true) archived.add(id);
    if (patch.archived === false) archived.delete(id);
    const playerNotes = { ...current.playerNotes };
    if (patch.playerNotes !== undefined) playerNotes[id] = text(patch.playerNotes);
    const next = normalizeActorLocationState({ ...current, pins: [...pins], reviewed: [...reviewed], archived: [...archived], playerNotes });
    await actor.setFlag(MODULE_ID, ATLAS_ACTOR_FLAG, next);
    return next;
  }

  static async revealFactToActor(actor, locationId = '', factId = '') {
    if (!actor?.setFlag) return null;
    const location = this.findLocation(locationId);
    const fact = location?.atlasFacts?.find(entry => entry.id === factId);
    if (!location || !fact) return null;
    const current = this.getActorAtlasState(actor);
    const revealedFacts = { ...current.revealedFacts };
    const list = new Set(splitList(revealedFacts[location.id]));
    list.add(fact.id);
    revealedFacts[location.id] = [...list];
    await actor.setFlag(MODULE_ID, ATLAS_ACTOR_FLAG, normalizeActorLocationState({ ...current, revealedFacts }));
    return fact;
  }

  static async recordAtlasLeadDiscovery(actor, locationId = '', factId = '', context = {}) {
    if (!actor?.setFlag) return null;
    const location = this.findLocation(locationId);
    const fact = location?.atlasFacts?.find(entry => entry.id === factId);
    if (!location || !fact) return null;
    const onReveal = fact.onReveal || {};
    const current = this.getActorAtlasState(actor);
    const leadDiscoveries = safeArray(current.leadDiscoveries).map(normalizeLeadDiscovery);
    const existing = leadDiscoveries.find(entry => entry.locationId === location.id && entry.factId === fact.id && entry.status === 'open');
    const discovery = normalizeLeadDiscovery({
      ...(existing || {}),
      actorId: actor.id || context.actorId || '',
      actorName: actor.name || context.actorName || '',
      locationId: location.id,
      locationName: location.name,
      factId: fact.id,
      factTitle: fact.title,
      skill: context.skill || fact.checks?.[0]?.skill || '',
      checkId: context.checkId || fact.checks?.[0]?.id || '',
      checkLabel: context.checkLabel || fact.checks?.[0]?.label || '',
      dc: context.dc ?? fact.checks?.[0]?.dc ?? 0,
      total: context.total ?? 0,
      output: onReveal.output || 'none',
      wantsJob: onReveal.output === 'job-draft' || onReveal.createJob,
      wantsIntel: onReveal.output === 'intel-draft' || onReveal.createIntel,
      revealLocationIds: onReveal.revealLocationIds || [],
      revealFactionIds: onReveal.revealFactionIds || [],
      revealContactIds: onReveal.revealContactIds || [],
      status: existing?.status || 'open',
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso()
    });
    const nextDiscoveries = existing
      ? leadDiscoveries.map(entry => entry.id === existing.id ? discovery : entry)
      : [...leadDiscoveries, discovery];
    const next = normalizeActorLocationState({ ...current, leadDiscoveries: nextDiscoveries.slice(-MAX_HISTORY), lastUpdated: nowIso() });
    await actor.setFlag(MODULE_ID, ATLAS_ACTOR_FLAG, next);
    return discovery;
  }

  static getAtlasLeadDiscoveries({ unresolvedOnly = true, actorId = '', locationId = '' } = {}) {
    const actors = game.actors?.contents || Array.from(game.actors || []);
    return actors.flatMap((actor) => {
      if (actorId && actor?.id !== actorId) return [];
      const state = this.getActorAtlasState(actor);
      return safeArray(state.leadDiscoveries).map(normalizeLeadDiscovery).filter((entry) => {
        if (unresolvedOnly && entry.status !== 'open') return false;
        if (locationId && entry.locationId !== locationId) return false;
        return true;
      }).map(entry => ({ ...entry, actorId: entry.actorId || actor.id, actorName: entry.actorName || actor.name, actor }));
    }).sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  }

  static async resolveAtlasLeadDiscovery(actorOrId, discoveryId = '', patch = {}) {
    const actor = typeof actorOrId === 'string' ? game.actors?.get?.(actorOrId) : actorOrId;
    if (!actor?.setFlag || !discoveryId) return null;
    const current = this.getActorAtlasState(actor);
    const leadDiscoveries = safeArray(current.leadDiscoveries).map(normalizeLeadDiscovery);
    let resolved = null;
    const nextDiscoveries = leadDiscoveries.map((entry) => {
      if (entry.id !== discoveryId) return entry;
      resolved = normalizeLeadDiscovery({
        ...entry,
        ...patch,
        status: patch.status || 'resolved',
        note: patch.note ?? entry.note,
        updatedAt: nowIso(),
        resolvedAt: nowIso(),
        resolvedByUserId: game.user?.id || ''
      });
      return resolved;
    });
    if (!resolved) return null;
    await actor.setFlag(MODULE_ID, ATLAS_ACTOR_FLAG, normalizeActorLocationState({ ...current, leadDiscoveries: nextDiscoveries, lastUpdated: nowIso() }));
    return resolved;
  }

  static visibleLocationsForActor(actor, { includeArchived = false } = {}) {
    const state = this.getActorAtlasState(actor);
    const archived = new Set(state.archived);
    return this.getRegistry().filter((location) => {
      if (!includeArchived && archived.has(location.id)) return false;
      return location.knownToPlayers === true || ['known', 'active', 'compromised'].includes(location.revealState) || state.revealedFacts[location.id]?.length;
    });
  }


  static async linkDossierPayload(locationId = '', payload = {}) {
    const location = this.findLocation(locationId);
    if (!location || !payload || typeof payload !== 'object') return null;
    const kind = text(payload.kind || payload.type).toLowerCase();
    const id = text(payload.id || payload.recordId || payload.threadId || payload.uuid);
    const uuid = text(payload.uuid);
    const addUnique = (list = [], value = '') => Array.from(new Set([...safeArray(list), text(value)].filter(Boolean)));
    const patch = { ...location };

    if (kind === 'location' && id && id !== location.id) {
      const child = this.findLocation(id);
      if (!child) return null;
      return this.upsertLocation({ ...child, parentLocationId: location.id, historyNote: `Nested under ${location.name} by drag/drop.` });
    }

    if (kind === 'faction' && id) {
      patch.factionIds = addUnique(location.factionIds, id);
      if (!patch.controllingFactionId && payload.makeController) patch.controllingFactionId = id;
    } else if ((kind === 'contact' || kind === 'npc-dossier') && (id || payload.contactId)) {
      patch.contactIds = addUnique(location.contactIds, payload.contactId || id);
      patch.factionIds = addUnique(location.factionIds, payload.factionId);
    } else if ((kind === 'actor' || kind === 'npc' || kind === 'compendium-actor') && uuid) {
      patch.npcActorUuids = addUnique(location.npcActorUuids, uuid);
      patch.encounterSeeds = [...location.encounterSeeds, normalizeEncounterSeed({
        uuid,
        name: payload.name || payload.id || 'Dropped Actor',
        img: payload.img || payload.image || '',
        category: payload.category || 'random',
        role: payload.role || payload.type || 'Actor',
        quantity: payload.quantity || '1'
      }, location.encounterSeeds.length)];
    } else if (kind === 'scene' && (uuid || id)) {
      const sceneUuid = uuid || id;
      patch.linkedSceneUuids = addUnique(location.linkedSceneUuids, sceneUuid);
      patch.map = { ...(location.map || {}), sceneUuid: location.map?.sceneUuid || sceneUuid };
    } else if (kind === 'journal' && (uuid || id)) {
      patch.linkedJournalUuid = location.linkedJournalUuid || uuid || id;
    } else if ((kind === 'intel' || kind === 'holonet-intel') && id) {
      patch.linkedIntelIds = addUnique(location.linkedIntelIds, id);
    } else if ((kind === 'job' || kind === 'job-board-post') && id) {
      patch.linkedJobIds = addUnique(location.linkedJobIds, id);
    } else if (kind === 'image' && (payload.path || payload.src || id)) {
      patch.map = { ...(location.map || {}), imagePath: payload.path || payload.src || id };
    } else {
      return null;
    }

    return this.upsertLocation({ ...patch, historyNote: `Linked ${kind || 'dossier'} payload by drag/drop.` });
  }


  static getLibrarySeeds(filters = {}) {
    return filterLocationLibrarySeeds(filters);
  }

  static getLibrarySeed(seedId = '') {
    return getLocationLibrarySeed(seedId);
  }

  static getLibraryBiomes() {
    return LOCATION_LIBRARY_BIOMES;
  }

  static summarizeLibrary(filters = {}) {
    const seeds = this.getLibrarySeeds(filters);
    const records = this.getRegistry();
    const importedIds = new Set(records.map(record => record.librarySeedId || record.id).filter(Boolean));
    const importedSeedIds = new Set(records.map(record => record.librarySeedId).filter(Boolean));
    const biomeCounts = new Map();
    for (const seed of LOCATION_LIBRARY_SEEDS) {
      for (const biome of safeArray(seed.biomes)) biomeCounts.set(biome, (biomeCounts.get(biome) || 0) + 1);
    }
    return {
      total: LOCATION_LIBRARY_SEEDS.length,
      visible: seeds.length,
      imported: LOCATION_LIBRARY_SEEDS.filter(seed => importedIds.has(seed.id) || importedSeedIds.has(seed.id)).length,
      biomes: LOCATION_LIBRARY_BIOMES.map(entry => ({ ...entry, count: biomeCounts.get(entry.value) || 0 }))
    };
  }

  static buildLibrarySeedRecords(seedId = '', options = {}) {
    return buildLocationLibraryRecords(seedId, options).map(record => this.normalizeLocation(record));
  }

  static async importLibrarySeed(seedId = '', { overwrite = false, includeChildren = true, includeAtlasFacts = true, revealState = 'hidden', knownToPlayers = false } = {}) {
    const seed = this.getLibrarySeed(seedId);
    if (!seed) return { imported: [], skipped: [], seed: null };
    const incoming = this.buildLibrarySeedRecords(seed.id, { includeChildren, includeAtlasFacts, revealState, knownToPlayers, importedAt: nowIso() });
    const records = this.getRegistry();
    const byId = new Map(records.map(record => [record.id, record]));
    const imported = [];
    const skipped = [];
    for (const record of incoming) {
      const existing = byId.get(record.id);
      if (existing && !overwrite) {
        skipped.push(record);
        continue;
      }
      const nextRecord = existing ? this.normalizeLocation({ ...existing, ...record, createdAt: existing.createdAt, updatedAt: nowIso() }) : record;
      byId.set(record.id, nextRecord);
      imported.push(nextRecord);
    }
    await this.saveRegistry(Array.from(byId.values()));
    return { imported, skipped, seed };
  }

  static async importLibrarySeeds(seedIds = [], options = {}) {
    const ids = Array.from(new Set(safeArray(seedIds).map(id => text(id)).filter(Boolean)));
    const results = [];
    for (const seedId of ids) results.push(await this.importLibrarySeed(seedId, options));
    return results.reduce((summary, result) => {
      summary.imported.push(...safeArray(result.imported));
      summary.skipped.push(...safeArray(result.skipped));
      if (result.seed) summary.seeds.push(result.seed);
      return summary;
    }, { imported: [], skipped: [], seeds: [] });
  }

  static summarizeForWorkspace() {
    const records = this.getRegistry();
    const count = (predicate) => records.filter(predicate).length;
    return {
      count: records.length,
      known: count(record => record.knownToPlayers || record.revealState === 'known' || record.revealState === 'active'),
      hidden: count(record => record.revealState === 'hidden'),
      active: count(record => record.activeForParty || record.revealState === 'active'),
      planetary: count(record => record.category === 'planetary'),
      space: count(record => record.category === 'space'),
      installation: count(record => record.category === 'installation'),
      mobile: count(record => record.category === 'mobile'),
      other: count(record => record.category === 'other'),
      withScenes: count(record => record.map?.sceneUuid || record.linkedSceneUuids.length),
      withSeeds: count(record => record.encounterSeeds.length),
      factCount: records.reduce((sum, record) => sum + record.atlasFacts.length, 0),
      encounterSeedCount: records.reduce((sum, record) => sum + record.encounterSeeds.length, 0),
      librarySeedCount: records.filter(record => record.librarySeedId).length,
      leadDiscoveryCount: this.getAtlasLeadDiscoveries({ unresolvedOnly: true }).length
    };
  }

  static optionLabel(list = [], value = '') {
    return list.find(entry => entry.value === value)?.label || value;
  }
}

function defaultScaleFor(type = '') {
  if (['star-system', 'hyperspace-route'].includes(type)) return 'system';
  if (['asteroid'].includes(type)) return 'site';
  if (['planet', 'moon'].includes(type)) return 'planetary';
  if (['city', 'region', 'orbit'].includes(type)) return 'regional';
  if (['ship', 'fleet'].includes(type)) return 'mobile';
  return 'site';
}

try {
  globalThis.SWSELocationRegistryService = LocationRegistryService;
} catch (err) {
  SWSELogger.warn?.('[LocationRegistryService] Unable to expose global service handle.', err);
}
