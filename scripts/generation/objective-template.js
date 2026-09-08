/**
 * PHASE 8D-1 — objective template schema, normalizer, validator, and a
 * small representative fixture catalog.
 *
 * This is foundation only: the schema/normalizer/validator/renderer that
 * the eventual ~200-template objective library (Phase 8D-2+) will be
 * built on, plus enough representative templates to prove the contract
 * across rescue/extraction/delivery/sabotage/recovery/investigation/ship
 * theft-recovery/escort. The full catalog is explicitly NOT built here.
 *
 * An objective template is generator vocabulary, not a claim that every
 * slot type maps to a canonical Foundry document type — `slots` name
 * WHAT KIND of thing a generator needs to resolve (an NPC concept, a
 * real/generated Location, a Store-priced item, ...), not how it will
 * eventually be persisted.
 */

import { OBJECTIVE_TIERS, OBJECTIVE_DIFFICULTIES, isObjectiveTier, isObjectiveDifficulty } from './objective-economy.js';

/** Generator slot vocabulary (§6/§8 of the phase spec). */
export const OBJECTIVE_SLOT_TYPE = Object.freeze({
  NPC: 'npc',
  LIVING_NPC: 'living-npc',
  DROID: 'droid',
  PERSON_OR_DROID: 'person-or-droid',
  FACTION: 'faction',
  LOCATION: 'location',
  PLANET: 'planet',
  POI: 'poi',
  VEHICLE: 'vehicle',
  SHIP: 'ship',
  ITEM: 'item',
  WEAPON: 'weapon',
  CARGO: 'cargo',
  DATA: 'data',
  FACILITY: 'facility',
  CREATURE: 'creature',
  STRUCTURE: 'structure',
  DEVICE: 'device',
  SABOTAGE_TARGET: 'sabotage-target'
});

const SLOT_TYPES = Object.freeze(Object.values(OBJECTIVE_SLOT_TYPE));

export function isObjectiveSlotType(value) {
  return SLOT_TYPES.includes(value);
}

/**
 * Normalize a raw objective template into the canonical shape, or return
 * `null` if it fails validation (fails safe — never throws). Callers
 * that need error detail should call `validateObjectiveTemplate()`
 * first.
 *
 * Canonical shape:
 * ```
 * {
 *   id, missionTypes: string[], tiers: string[], template: string,
 *   slots: { [slotName]: { type, required } },
 *   difficulty: { min, max }, weight, tags: string[],
 *   creates: { npcConcepts, locations },
 *   constraints: string[], oppositionHints: string[],
 *   locationHints: string[], subjectHints: string[]
 * }
 * ```
 *
 * `constraints`/`oppositionHints`/`locationHints`/`subjectHints`
 * (added in the Phase 8D-2 correction pass) are OPTIONAL free-text tag
 * arrays -- validated the same lightweight way `tags` already is
 * (coerced to an array of strings, never a hard schema error), not a
 * new closed vocabulary. They let a template loosely suggest e.g. an
 * `objective-constraint.js` constraint value, an `opposition-request.js`
 * `archetypeTags` entry, a Location biome/category hint, or a
 * `mission-subject.js` archetype -- a FUTURE Job composer can read
 * them as starting suggestions; nothing here performs that resolution
 * itself, and no existing fixture is required to populate them.
 */
export function normalizeObjectiveTemplate(raw) {
  const { valid, errors } = validateObjectiveTemplate(raw);
  if (!valid) return null;

  const slots = {};
  for (const [slotName, slotDef] of Object.entries(raw.slots || {})) {
    const type = typeof slotDef === 'string' ? slotDef : slotDef?.type;
    slots[slotName] = { type, required: slotDef?.required !== false };
  }

  const stringArray = (value) => (Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []);

  return {
    id: String(raw.id),
    missionTypes: [...raw.missionTypes],
    tiers: [...raw.tiers],
    template: String(raw.template),
    slots,
    difficulty: { min: raw.difficulty?.min || OBJECTIVE_DIFFICULTIES[1], max: raw.difficulty?.max || raw.difficulty?.min || OBJECTIVE_DIFFICULTIES[1] },
    weight: Number.isFinite(Number(raw.weight)) && Number(raw.weight) > 0 ? Number(raw.weight) : 1,
    tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
    creates: {
      npcConcepts: Math.max(0, Number(raw.creates?.npcConcepts ?? 0) || 0),
      locations: Math.max(0, Number(raw.creates?.locations ?? 0) || 0)
    },
    constraints: stringArray(raw.constraints),
    oppositionHints: stringArray(raw.oppositionHints),
    locationHints: stringArray(raw.locationHints),
    subjectHints: stringArray(raw.subjectHints),
    // errors is always [] here (normalize only returns non-null when valid)
    errors
  };
}

/**
 * Validate a raw objective template. Never throws — returns
 * `{ valid, errors }` so a caller (or a future content-authoring tool)
 * can report every problem at once rather than fail on the first.
 */
export function validateObjectiveTemplate(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['template must be an object'] };
  }
  if (!raw.id || typeof raw.id !== 'string') errors.push('id is required and must be a string');
  if (!Array.isArray(raw.missionTypes) || raw.missionTypes.length === 0) errors.push('missionTypes must be a non-empty array');
  if (!Array.isArray(raw.tiers) || raw.tiers.length === 0) {
    errors.push('tiers must be a non-empty array');
  } else if (!raw.tiers.every(isObjectiveTier)) {
    errors.push(`tiers must only contain ${OBJECTIVE_TIERS.join('/')}`);
  }
  if (!raw.template || typeof raw.template !== 'string') errors.push('template must be a non-empty string');

  const slotNamesInTemplate = extractSlotNames(raw.template || '');
  const declaredSlots = raw.slots && typeof raw.slots === 'object' ? Object.keys(raw.slots) : [];
  for (const slotName of slotNamesInTemplate) {
    if (!declaredSlots.includes(slotName)) errors.push(`template references undeclared slot "${slotName}"`);
  }
  for (const [slotName, slotDef] of Object.entries(raw.slots || {})) {
    const type = typeof slotDef === 'string' ? slotDef : slotDef?.type;
    if (!isObjectiveSlotType(type)) errors.push(`slot "${slotName}" has invalid type "${type}"`);
  }

  if (raw.difficulty) {
    const { min, max } = raw.difficulty;
    if (min && !isObjectiveDifficulty(min)) errors.push(`difficulty.min "${min}" is not a valid difficulty band`);
    if (max && !isObjectiveDifficulty(max)) errors.push(`difficulty.max "${max}" is not a valid difficulty band`);
    if (min && max && OBJECTIVE_DIFFICULTIES.indexOf(min) > OBJECTIVE_DIFFICULTIES.indexOf(max)) {
      errors.push('difficulty.min must not be harder than difficulty.max');
    }
  }
  if (raw.weight !== undefined && (!Number.isFinite(Number(raw.weight)) || Number(raw.weight) <= 0)) {
    errors.push('weight must be a positive number when supplied');
  }

  return { valid: errors.length === 0, errors };
}

/** Extract `{slotName}` tokens from a template string, in order, deduplicated. */
export function extractSlotNames(template) {
  const matches = String(template || '').match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return [...new Set(matches.map((token) => token.slice(1, -1)))];
}

/**
 * Resolve a normalized template's `{slotName}` tokens against already-
 * resolved slot VALUES (plain strings — this function does not itself
 * pick NPCs/Locations/etc., it only composes text). Throws if a required
 * slot has no supplied value, so a caller finds a missing dependency
 * immediately rather than shipping a broken briefing with a literal
 * "{targetNpc}" in it.
 */
export function renderObjectiveTemplate(normalizedTemplate, slotValues = {}) {
  let text = normalizedTemplate.template;
  for (const [slotName, slotDef] of Object.entries(normalizedTemplate.slots)) {
    const value = slotValues[slotName];
    if ((value === undefined || value === null || value === '') && slotDef.required) {
      throw new Error(`renderObjectiveTemplate: missing required slot "${slotName}" for template "${normalizedTemplate.id}"`);
    }
    text = text.split(`{${slotName}}`).join(value ?? '');
  }
  return text;
}

// --- representative fixture catalog (NOT the full ~200-template library) -
// One or more templates per family named in the phase spec's required
// coverage list: rescue, extraction, delivery, sabotage, recovery,
// investigation, ship theft/recovery, escort.
const RAW_FIXTURES = [
  {
    id: 'rescue-person-secured-site',
    missionTypes: ['rescue', 'extraction'],
    tiers: ['primary'],
    template: 'Locate {targetNpc} at {targetLocation} and escort them safely to {destination}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 10,
    tags: ['rescue', 'extraction'],
    creates: { npcConcepts: 1, locations: 1 },
    constraints: ['no lethal force permitted', 'a strict time limit before the situation worsens'],
    oppositionHints: ['security-guards', 'captors'],
    subjectHints: ['hostage', 'kidnap victim', 'missing person']
  },
  {
    id: 'extraction-hostile-facility',
    missionTypes: ['extraction'],
    tiers: ['primary'],
    template: 'Infiltrate {targetLocation}, locate {targetNpc}, and extract them before reinforcements arrive.',
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY },
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'difficult', max: 'extreme' },
    weight: 8,
    tags: ['extraction', 'infiltration'],
    creates: { npcConcepts: 1, locations: 1 },
    constraints: ['stealth required -- detection ends the mission'],
    oppositionHints: ['military-patrol', 'security-guards'],
    locationHints: ['military-paramilitary', 'urban'],
    subjectHints: ['captured ally awaiting rescue', 'undercover agent needing exfiltration']
  },
  {
    id: 'delivery-cargo-local',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: 'Deliver {cargo} to {destination} before the deadline.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 12,
    tags: ['delivery', 'courier']
  },
  {
    id: 'sabotage-multiple-targets',
    missionTypes: ['sabotage', 'infiltration'],
    tiers: ['primary'],
    template: 'Infiltrate {targetLocation}, destroy {targetAsset1} and {targetAsset2}, then reach {extractionLocation}.',
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY },
      targetAsset1: { type: OBJECTIVE_SLOT_TYPE.SABOTAGE_TARGET },
      targetAsset2: { type: OBJECTIVE_SLOT_TYPE.SABOTAGE_TARGET },
      extractionLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 8,
    tags: ['sabotage', 'infiltration'],
    creates: { locations: 1 },
    constraints: ['no witnesses can be left behind', 'avoid collateral damage to nearby civilians'],
    oppositionHints: ['military-patrol', 'facility-security'],
    locationHints: ['military-paramilitary', 'industrial']
  },
  {
    id: 'recovery-cargo-wreck',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Locate {cargo} aboard the wreck of {shipName} near {targetLocation}.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 9,
    tags: ['recovery', 'salvage'],
    creates: { locations: 1 }
  },
  {
    id: 'investigation-determine-cause',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Investigate {targetLocation} and determine what happened to {targetNpc}.',
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 9,
    tags: ['investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'escort-convoy',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort {targetNpc} from {origin} to {destination}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      origin: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 10,
    tags: ['escort'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'ship-theft-deliver-intact',
    missionTypes: ['heist', 'smuggling'],
    tiers: ['primary'],
    template: 'Travel to {targetLocation}, locate {shipName}, steal the vessel, and deliver it to {destination}.',
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 7,
    tags: ['ship', 'theft'],
    creates: { locations: 1 }
  },
  {
    id: 'ship-recovery-return-owner',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Locate the stolen {shipName} near {targetLocation} and return the vessel intact to {client}.',
    slots: {
      shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      client: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['ship', 'recovery'],
    creates: { npcConcepts: 1, locations: 1 }
  },
  {
    id: 'ship-boarding-capture-target',
    missionTypes: ['bounty', 'hunt'],
    tiers: ['primary'],
    template: 'Intercept {shipName}, board the vessel, and capture {targetNpc}.',
    slots: {
      shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP },
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 6,
    tags: ['ship', 'boarding'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'faction-rescue-member',
    missionTypes: ['rescue', 'extraction'],
    tiers: ['primary', 'secondary'],
    template: 'Rescue {targetNpc}, a member of {faction}, from {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 7,
    tags: ['faction', 'member', 'organization-duty', 'rescue'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'faction-destroy-enemy-supplies',
    missionTypes: ['sabotage', 'assault'],
    tiers: ['primary', 'secondary'],
    template: "Locate and destroy {faction}'s enemy supply cache at {targetLocation}.",
    slots: {
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['faction', 'enemy', 'material', 'sabotage'],
    creates: { locations: 1 }
  }
];

/** Normalized, validated representative fixture catalog (frozen). */
export const OBJECTIVE_TEMPLATE_FIXTURES = Object.freeze(
  RAW_FIXTURES.map((raw) => Object.freeze(normalizeObjectiveTemplate(raw)))
);

/** Fixtures whose `missionTypes` include the given mission type. */
export function fixturesForMissionType(missionType) {
  return OBJECTIVE_TEMPLATE_FIXTURES.filter((template) => template.missionTypes.includes(missionType));
}
