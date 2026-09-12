/**
 * Objective template schema, normalizer, validator, renderer, and the
 * production fixture catalog (254 entries, within the Phase 8D-3C
 * hydration spec's documented 250-400 target — see §203 of
 * docs/audits/gm-datapad-ecosystem-redesign.md).
 *
 * PHASE 8D-1 built the schema/normalizer/validator/renderer plus a
 * 12-fixture representative catalog proving the contract across
 * rescue/extraction/delivery/sabotage/recovery/investigation/ship
 * theft-recovery/escort. PHASE 8D-3C hydration grew that to production
 * scale across all 14 `JOB_ARCHETYPE_METADATA` mission types — wiring
 * (schema/normalizer/validator/renderer) unchanged throughout; only the
 * fixture catalog grew.
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

// --- production fixture catalog (254 entries; see file header) ---------
// The original PHASE 8D-1 12-fixture set (one or more templates per
// family in that phase's required coverage list: rescue, extraction,
// delivery, sabotage, recovery, investigation, ship theft/recovery,
// escort) plus PHASE 8D-3C's hydration batches, grouped by inline
// comment markers below, extending coverage across all 14
// JOB_ARCHETYPE_METADATA mission types.
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
  },

  // --- PHASE 8D-3C hydration batch 1: delivery/transport/procurement/escort,
  // deliberately weighted toward ordinary, non-dramatic work per the phase
  // spec's "mundane Star Wars work as much as dramatic plots" instruction. ---
  {
    id: 'delivery-medical-supplies-frontier',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: 'Transport a shipment of medical supplies to {destination} before the local clinic runs out.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 11,
    tags: ['delivery', 'medical'],
    subjectHints: ['grateful clinic staff']
  },
  {
    id: 'delivery-spare-parts-settlement',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: 'Deliver {cargo} to a frontier settlement whose only working vendor has run dry.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 10,
    tags: ['delivery']
  },
  {
    id: 'delivery-under-time-pressure',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: 'Deliver {cargo} to {destination} on a tight schedule the client insists cannot slip.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['delivery'],
    constraints: ['a strict time limit before the situation worsens'],
    oppositionHints: ['rival-crew', 'opportunist-raiders']
  },
  {
    id: 'delivery-through-contested-territory',
    missionTypes: ['delivery', 'smuggling'],
    tiers: ['primary'],
    template: 'Move {cargo} through territory contested by rival groups to reach {destination}.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['delivery', 'smuggling'],
    oppositionHints: ['checkpoint-patrol', 'rival-syndicate']
  },
  {
    id: 'procure-rare-component',
    missionTypes: ['delivery', 'recovery'],
    tiers: ['primary'],
    template: 'Track down and procure {cargo} for a buyer who has exhausted every closer supplier.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['delivery', 'procurement']
  },
  {
    id: 'procure-supplies-price-negotiation',
    missionTypes: ['delivery'],
    tiers: ['primary', 'secondary'],
    template: 'Negotiate and procure bulk supplies from {targetNpc} on behalf of the client.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 8,
    tags: ['delivery', 'negotiation'],
    creates: { npcConcepts: 1 },
    subjectHints: ['shrewd local merchant', 'overworked quartermaster']
  },
  {
    id: 'escort-technician-to-repair-site',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort a technician safely to {destination} to carry out urgent repairs.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 9,
    tags: ['escort', 'repair'],
    subjectHints: ['nervous specialist unused to travel']
  },
  {
    id: 'escort-vip-public-appearance',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Provide close protection for {targetNpc} during a public appearance at {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['escort'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['hostile-protesters', 'hired-troublemakers'],
    subjectHints: ['VIP requiring protection', 'local dignitary']
  },
  {
    id: 'escort-convoy-hostile-route',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort a supply convoy along a route known for raids, from {origin} to {destination}.',
    slots: {
      origin: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 7,
    tags: ['escort'],
    oppositionHints: ['raiders', 'pirates']
  },
  {
    id: 'escort-refugees-off-world',
    missionTypes: ['escort', 'rescue'],
    tiers: ['primary'],
    template: 'Arrange safe passage for a group of refugees seeking to leave {origin} for good.',
    slots: { origin: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['escort', 'rescue'],
    subjectHints: ['refugees seeking passage off-world']
  },
  {
    id: 'transport-livestock-shipment',
    missionTypes: ['delivery'],
    tiers: ['tertiary'],
    template: 'Transport a shipment of live cargo to {destination} without losing any along the way.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['delivery']
  },
  {
    id: 'survey-planetary-hazards',
    missionTypes: ['investigation'],
    tiers: ['primary', 'secondary'],
    template: 'Survey {targetLocation} and report on hazards before a client commits further resources.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 7,
    tags: ['investigation', 'survey'],
    creates: { locations: 1 }
  },
  {
    id: 'survey-poi-viability',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: 'Survey {targetLocation} to determine whether it is worth further investment.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['investigation', 'survey']
  },
  {
    id: 'negotiate-labor-dispute',
    missionTypes: ['investigation', 'escort'],
    tiers: ['primary'],
    template: 'Mediate a labor dispute at {targetLocation} before it escalates further.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['negotiation'],
    subjectHints: ['frustrated labor steward', 'anxious site foreman']
  },
  {
    id: 'negotiate-local-dispute-mediation',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Mediate a dispute between {targetNpc} and a rival claimant over {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['negotiation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'repair-settlement-infrastructure',
    missionTypes: ['delivery', 'recovery'],
    tiers: ['primary'],
    template: 'Repair failing infrastructure at {targetLocation} before conditions worsen for residents.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['repair']
  },
  {
    id: 'repair-disabled-vehicle-stranded',
    missionTypes: ['recovery', 'delivery'],
    tiers: ['secondary'],
    template: 'Reach a stranded {vehicleName} at {targetLocation} and get it operational again.',
    slots: {
      vehicleName: { type: OBJECTIVE_SLOT_TYPE.VEHICLE },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['repair', 'recovery']
  },
  {
    id: 'customs-clearance-problem',
    missionTypes: ['delivery', 'investigation'],
    tiers: ['secondary'],
    template: 'Resolve a customs hold on {cargo} before the delay becomes permanent.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['delivery', 'legal']
  },
  {
    id: 'witness-locate-and-interview',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Locate {targetNpc}, a witness who has gone quiet, and get them to talk.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['investigation'],
    creates: { npcConcepts: 1 },
    subjectHints: ['frightened witness', 'reluctant former employee']
  },
  {
    id: 'investigate-financial-irregularities',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Investigate irregularities in {faction}\'s recent finances without tipping them off.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'investigate-workers-conditions',
    missionTypes: ['investigation'],
    tiers: ['primary', 'secondary'],
    template: 'Investigate conditions among workers at {targetLocation} on behalf of a concerned client.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['investigation']
  },
  {
    id: 'reconnaissance-scout-route',
    missionTypes: ['investigation'],
    tiers: ['secondary', 'tertiary'],
    template: 'Scout {targetLocation} ahead of a larger operation and report back.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 7,
    tags: ['investigation', 'reconnaissance']
  },
  {
    id: 'reconnaissance-facility-layout',
    missionTypes: ['investigation', 'infiltration'],
    tiers: ['secondary'],
    template: 'Map the layout of {targetLocation} without alerting its security.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['investigation', 'infiltration'],
    constraints: ['stealth required -- detection ends the mission'],
    oppositionHints: ['facility-security']
  },
  {
    id: 'medical-transport-critical-patient',
    missionTypes: ['rescue', 'delivery'],
    tiers: ['primary'],
    template: 'Transport {targetNpc} to medical care at {destination} before their condition worsens.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['rescue', 'medical'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'debt-collection-difficult-client',
    missionTypes: ['bounty', 'investigation'],
    tiers: ['secondary'],
    template: 'Collect an outstanding debt from {targetNpc}, who has been avoiding the issue.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['bounty'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'mapping-uncharted-territory',
    missionTypes: ['investigation'],
    tiers: ['secondary', 'tertiary'],
    template: 'Map an uncharted stretch of {targetLocation} for a client\'s survey records.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.PLANET } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation', 'survey'],
    creates: { locations: 1 }
  },
  {
    id: 'prospecting-resource-survey',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: 'Assess {targetLocation} for viable resources ahead of a formal claim.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation', 'survey']
  },
  {
    id: 'perimeter-security-detail',
    missionTypes: ['escort'],
    tiers: ['secondary', 'tertiary'],
    template: 'Hold perimeter security at {targetLocation} while the client\'s own business concludes.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['escort'],
    oppositionHints: ['opportunist-raiders']
  },

  // --- PHASE 8D-3C hydration batch 2: recovery/salvage/heist. ---
  {
    id: 'recovery-lost-shipment-manifest',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Recover {cargo}, lost in transit, before its true owner files a claim against the carrier.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 9,
    tags: ['recovery']
  },
  {
    id: 'recovery-stolen-item-tracing',
    missionTypes: ['recovery', 'investigation'],
    tiers: ['primary'],
    template: 'Trace and recover an item stolen from {targetNpc} before it changes hands again.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['recovery', 'investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'recovery-data-cache-facility',
    missionTypes: ['recovery', 'infiltration'],
    tiers: ['primary'],
    template: 'Retrieve a data cache from {targetLocation} without alerting whoever secured it there.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['recovery', 'infiltration'],
    constraints: ['stealth required -- detection ends the mission'],
    oppositionHints: ['facility-security']
  },
  {
    id: 'recovery-equipment-abandoned-site',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Recover usable equipment from an abandoned site at {targetLocation} before scavengers strip it bare.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 8,
    tags: ['recovery'],
    oppositionHints: ['rival-scavengers']
  },
  {
    id: 'salvage-derelict-ship-parts',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Strip salvageable parts from the derelict {shipName} before it is claimed or destroyed.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['recovery', 'salvage'],
    creates: { locations: 1 }
  },
  {
    id: 'salvage-industrial-site-materials',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Salvage usable materials from a decommissioned facility at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['recovery', 'salvage']
  },
  {
    id: 'heist-vault-extraction',
    missionTypes: ['heist'],
    tiers: ['primary'],
    template: 'Breach the vault at {targetLocation} and extract its contents without triggering an alarm.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'difficult', max: 'extreme' },
    weight: 6,
    tags: ['heist'],
    creates: { locations: 1 },
    constraints: ['stealth required -- detection ends the mission', 'no witnesses can be left behind'],
    oppositionHints: ['facility-security', 'security-droids'],
    locationHints: ['urban', 'corporate']
  },
  {
    id: 'heist-swap-authentic-item',
    missionTypes: ['heist'],
    tiers: ['primary'],
    template: 'Substitute a convincing forgery for {cargo} at {targetLocation} before anyone notices the difference.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['heist'],
    oppositionHints: ['facility-security']
  },
  {
    id: 'heist-corporate-database-theft',
    missionTypes: ['heist', 'infiltration'],
    tiers: ['primary'],
    template: 'Infiltrate {targetLocation} and copy proprietary records before the crew is detected.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 6,
    tags: ['heist', 'infiltration'],
    constraints: ['stealth required -- detection ends the mission'],
    oppositionHints: ['facility-security', 'corporate-security'],
    locationHints: ['corporate', 'urban']
  },
  {
    id: 'heist-auction-house-lift',
    missionTypes: ['heist'],
    tiers: ['primary'],
    template: 'Lift {cargo} from a heavily attended auction at {targetLocation} without a scene.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['heist'],
    oppositionHints: ['private-security']
  },
  {
    id: 'recovery-crashed-cargo-hauler',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Reach the crash site of a cargo hauler near {targetLocation} and recover what remains intact.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['recovery'],
    creates: { locations: 1 }
  },
  {
    id: 'recovery-family-heirloom',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Locate and recover a family heirloom last seen at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['recovery']
  },
  {
    id: 'recovery-research-samples',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Recover research samples from {targetLocation} before they degrade beyond usefulness.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['recovery'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'recovery-impounded-vehicle',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Recover {vehicleName}, impounded at {targetLocation}, through means legal or otherwise.',
    slots: {
      vehicleName: { type: OBJECTIVE_SLOT_TYPE.VEHICLE },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['recovery']
  },
  {
    id: 'recovery-black-box-flight-data',
    missionTypes: ['recovery', 'investigation'],
    tiers: ['primary'],
    template: 'Recover the flight recorder from the wreck of {shipName} for an insurer\'s investigation.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['recovery', 'investigation'],
    creates: { locations: 1 }
  },
  {
    id: 'heist-payroll-transfer-intercept',
    missionTypes: ['heist', 'smuggling'],
    tiers: ['primary'],
    template: 'Intercept a payroll transfer en route to {destination} before it reaches its destination.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['heist'],
    oppositionHints: ['armed-escort']
  },
  {
    id: 'recovery-poi-lost-technology',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Recover a piece of lost technology rumored to be hidden at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI } },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 6,
    tags: ['recovery'],
    creates: { locations: 1 },
    oppositionHints: ['rival-treasure-hunters']
  },
  {
    id: 'recovery-return-item-rightful-owner',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Return a recovered item to its rightful owner, {targetNpc}, discreetly.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['recovery'],
    creates: { npcConcepts: 1 }
  },

  // --- PHASE 8D-3C hydration batch 3: rescue/extraction/bounty/hunt/assault. ---
  {
    id: 'rescue-trapped-mine-collapse',
    missionTypes: ['rescue'],
    tiers: ['primary'],
    template: 'Reach {targetNpc}, trapped after a collapse at {targetLocation}, before air or time runs out.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['rescue'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'rescue-downed-pilot-hostile-territory',
    missionTypes: ['rescue', 'extraction'],
    tiers: ['primary'],
    template: 'Locate and extract a downed pilot from hostile territory near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 7,
    tags: ['rescue', 'extraction'],
    creates: { npcConcepts: 1, locations: 1 },
    oppositionHints: ['military-patrol'],
    subjectHints: ['downed pilot']
  },
  {
    id: 'rescue-debtor-held-collateral',
    missionTypes: ['rescue'],
    tiers: ['primary'],
    template: 'Free {targetNpc}, held as collateral against a debt, from {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['rescue'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['debt-collectors']
  },
  {
    id: 'rescue-shipwreck-survivors',
    missionTypes: ['rescue', 'extraction'],
    tiers: ['primary'],
    template: 'Locate survivors from the wreck of {shipName} before exposure or scavengers reach them first.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['rescue'],
    creates: { npcConcepts: 1, locations: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'extraction-informant-blown-cover',
    missionTypes: ['extraction'],
    tiers: ['primary'],
    template: 'Extract {targetNpc}, an informant whose cover is unraveling, from {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 6,
    tags: ['extraction'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens'],
    oppositionHints: ['counter-intelligence-agents'],
    subjectHints: ['undercover agent needing exfiltration']
  },
  {
    id: 'extraction-defector-safe-house',
    missionTypes: ['extraction', 'escort'],
    tiers: ['primary'],
    template: 'Move {targetNpc}, a defector, to a safe house at {destination} without being followed.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['extraction'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['pursuit-team']
  },
  {
    id: 'bounty-skip-tracer-nonviolent',
    missionTypes: ['bounty', 'hunt'],
    tiers: ['primary'],
    template: 'Track down {targetNpc}, who skipped an obligation, and bring them in without incident.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 8,
    tags: ['bounty', 'hunt'],
    creates: { npcConcepts: 1 },
    constraints: ['no lethal force permitted'],
    subjectHints: ['fugitive']
  },
  {
    id: 'bounty-dangerous-fugitive-capture',
    missionTypes: ['bounty', 'hunt'],
    tiers: ['primary'],
    template: 'Locate and capture {targetNpc}, wanted for a serious offense, at {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 6,
    tags: ['bounty', 'hunt'],
    creates: { npcConcepts: 1 },
    constraints: ['the target must be taken alive'],
    oppositionHints: ['personal-guards']
  },
  {
    id: 'hunt-creature-livestock-threat',
    missionTypes: ['hunt'],
    tiers: ['primary'],
    template: 'Track and deal with a creature threatening livestock near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['hunt'],
    oppositionHints: ['predator-creature']
  },
  {
    id: 'bounty-informant-flipped',
    missionTypes: ['bounty', 'hunt'],
    tiers: ['secondary'],
    template: 'Locate {targetNpc}, who has flipped on a former associate, before that associate finds them first.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['bounty'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'assault-clear-checkpoint',
    missionTypes: ['assault'],
    tiers: ['primary'],
    template: 'Clear a hostile checkpoint blocking access to {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['assault'],
    oppositionHints: ['checkpoint-patrol']
  },
  {
    id: 'assault-disable-gun-emplacement',
    missionTypes: ['assault', 'sabotage'],
    tiers: ['primary'],
    template: 'Disable a gun emplacement guarding {targetLocation} before the main approach begins.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['assault', 'sabotage'],
    oppositionHints: ['gun-crew'],
    locationHints: ['military-paramilitary']
  },
  {
    id: 'assault-break-siege',
    missionTypes: ['assault', 'rescue'],
    tiers: ['primary'],
    template: 'Break a siege around {targetLocation} to relieve those trapped inside.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['assault', 'rescue'],
    oppositionHints: ['besieging-force']
  },
  {
    id: 'rescue-negotiate-hostage-release',
    missionTypes: ['rescue'],
    tiers: ['primary'],
    template: 'Negotiate the release of {targetNpc}, held at {targetLocation}, without a shot fired.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['rescue', 'negotiation'],
    creates: { npcConcepts: 1 },
    constraints: ['no lethal force permitted'],
    oppositionHints: ['captors']
  },
  {
    id: 'extraction-scientist-before-rivals',
    missionTypes: ['extraction', 'rescue'],
    tiers: ['primary'],
    template: 'Extract {targetNpc} from {targetLocation} before a rival organization gets there first.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 6,
    tags: ['extraction'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['rival-organization-agents']
  },
  {
    id: 'bounty-corporate-embezzler',
    missionTypes: ['bounty', 'investigation'],
    tiers: ['primary'],
    template: 'Locate {targetNpc}, who vanished with corporate funds, before the trail goes cold.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['bounty', 'investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'hunt-poacher-protected-species',
    missionTypes: ['hunt', 'investigation'],
    tiers: ['secondary'],
    template: 'Track down poachers operating illegally near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['hunt', 'illegal'],
    oppositionHints: ['poaching-crew']
  },

  // --- PHASE 8D-3C hydration batch 4: sabotage/infiltration/smuggling/boarding. ---
  {
    id: 'sabotage-disable-comm-relay',
    missionTypes: ['sabotage'],
    tiers: ['primary'],
    template: 'Disable the communications relay at {targetLocation} without being traced.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['sabotage'],
    constraints: ['no witnesses can be left behind'],
    oppositionHints: ['facility-security']
  },
  {
    id: 'sabotage-delay-production-line',
    missionTypes: ['sabotage'],
    tiers: ['primary'],
    template: 'Quietly delay production at {targetLocation} without triggering a full shutdown investigation.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['sabotage'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'sabotage-single-critical-system',
    missionTypes: ['sabotage'],
    tiers: ['primary'],
    template: 'Disable {targetAsset1} at {targetLocation} and withdraw before it is noticed.',
    slots: {
      targetAsset1: { type: OBJECTIVE_SLOT_TYPE.SABOTAGE_TARGET },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['sabotage'],
    oppositionHints: ['facility-security']
  },
  {
    id: 'sabotage-vehicle-fleet',
    missionTypes: ['sabotage'],
    tiers: ['secondary'],
    template: 'Disable a fleet of vehicles staged at {targetLocation} before they can deploy.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['sabotage'],
    oppositionHints: ['motor-pool-guards']
  },
  {
    id: 'infiltration-plant-false-evidence',
    missionTypes: ['infiltration'],
    tiers: ['primary'],
    template: 'Infiltrate {targetLocation} and plant evidence that will mislead an ongoing investigation.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 4,
    tags: ['infiltration'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'infiltration-assume-false-identity',
    missionTypes: ['infiltration'],
    tiers: ['primary'],
    template: 'Assume a false identity to gain access to {targetLocation} and gather what is needed from within.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['infiltration'],
    oppositionHints: ['internal-security']
  },
  {
    id: 'infiltration-plant-listening-device',
    missionTypes: ['infiltration', 'investigation'],
    tiers: ['secondary'],
    template: 'Plant a listening device inside {targetLocation} without leaving a trace.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['infiltration'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'smuggling-contraband-past-checkpoint',
    missionTypes: ['smuggling'],
    tiers: ['primary'],
    template: 'Move {cargo} past a checkpoint at {targetLocation} without triggering a search.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['smuggling'],
    oppositionHints: ['checkpoint-patrol']
  },
  {
    id: 'smuggling-passengers-discreet-transport',
    missionTypes: ['smuggling', 'escort'],
    tiers: ['primary'],
    template: 'Arrange discreet transport to {destination} for passengers who cannot travel through official channels.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['smuggling']
  },
  {
    id: 'smuggling-weapons-restricted-zone',
    missionTypes: ['smuggling'],
    tiers: ['primary'],
    template: 'Move {cargo} into a restricted zone for a client unwilling to explain why.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 4,
    tags: ['smuggling', 'illegal'],
    oppositionHints: ['border-patrol']
  },
  {
    id: 'boarding-derelict-investigate',
    missionTypes: ['boarding', 'investigation'],
    tiers: ['primary'],
    template: 'Board the derelict {shipName} and determine what happened aboard.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['boarding', 'investigation']
  },
  {
    id: 'boarding-disable-and-seize',
    missionTypes: ['boarding'],
    tiers: ['primary'],
    template: 'Disable and board {shipName}, then secure the vessel for seizure.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['boarding'],
    oppositionHints: ['ship-crew']
  },
  {
    id: 'boarding-evacuate-crew',
    missionTypes: ['boarding', 'rescue'],
    tiers: ['primary'],
    template: 'Board {shipName}, in distress, and evacuate its crew before it is lost.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 6,
    tags: ['boarding', 'rescue'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'infiltration-corporate-onboarding',
    missionTypes: ['infiltration'],
    tiers: ['primary'],
    template: 'Get hired at {targetLocation} under false pretenses to gain access from within.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['infiltration'],
    locationHints: ['corporate']
  },
  {
    id: 'sabotage-leak-damaging-information',
    missionTypes: ['sabotage', 'investigation'],
    tiers: ['secondary'],
    template: 'Leak damaging information about {faction} to the right audience without being traced.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['sabotage']
  },
  {
    id: 'smuggling-evade-patrol-route',
    missionTypes: ['smuggling'],
    tiers: ['secondary'],
    template: 'Plot a route around a known patrol to move {cargo} without incident.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['smuggling']
  },

  // --- PHASE 8D-3C hydration batch 5: faction-affiliated objectives, spanning
  // planetary government / sector authority / military patrol / security
  // service / criminal syndicate / mercenary company / corporation / local
  // militia / religious order / aristocratic house / trading concern /
  // frontier settlement / labor organization archetypes rather than any
  // single era's named factions, per the phase spec's era-agnosticism rule. ---
  {
    id: 'faction-deliver-diplomatic-message',
    missionTypes: ['delivery', 'escort'],
    tiers: ['primary', 'secondary'],
    template: 'Deliver a sensitive diplomatic message from {faction} to {destination} in person.',
    slots: {
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['faction', 'delivery']
  },
  {
    id: 'faction-recover-stolen-standard',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: "Recover {faction}'s stolen ceremonial standard from whoever took it as a trophy.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['faction', 'recovery']
  },
  {
    id: 'faction-negotiate-territory-boundary',
    missionTypes: ['investigation'],
    tiers: ['primary', 'secondary'],
    template: "Negotiate a territory boundary dispute on behalf of {faction} at {targetLocation}.",
    slots: {
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'negotiation']
  },
  {
    id: 'faction-escort-recruiter',
    missionTypes: ['escort'],
    tiers: ['secondary', 'tertiary'],
    template: "Escort {faction}'s recruiter safely through territory that doesn't welcome them.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['faction', 'escort'],
    oppositionHints: ['hostile-locals']
  },
  {
    id: 'faction-infiltrate-rival-meeting',
    missionTypes: ['infiltration', 'investigation'],
    tiers: ['primary'],
    template: "Infiltrate a closed meeting held by a rival of {faction} and report on what's decided.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'infiltration'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'faction-security-service-patrol-gap',
    missionTypes: ['escort', 'assault'],
    tiers: ['secondary'],
    template: 'Cover a gap in patrol coverage for {faction} while their own personnel are stretched thin.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['faction', 'escort']
  },
  {
    id: 'faction-recover-defector-records',
    missionTypes: ['recovery', 'investigation'],
    tiers: ['primary'],
    template: "Recover records a defector took when they left {faction} without authorization.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'recovery']
  },
  {
    id: 'faction-mercenary-subcontract',
    missionTypes: ['assault', 'escort'],
    tiers: ['primary'],
    template: 'Fulfill a subcontracted security job {faction} does not want traced back to them directly.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction'],
    oppositionHints: ['rival-mercenaries']
  },
  {
    id: 'faction-trading-concern-shipment-escort',
    missionTypes: ['escort', 'delivery'],
    tiers: ['primary'],
    template: "Escort {faction}'s shipment through territory where its safety cannot be guaranteed.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['faction', 'escort'],
    oppositionHints: ['raiders']
  },
  {
    id: 'faction-religious-order-pilgrimage-security',
    missionTypes: ['escort'],
    tiers: ['secondary'],
    template: 'Provide security for a pilgrimage organized by {faction} to {destination}.',
    slots: {
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['faction', 'escort']
  },
  {
    id: 'faction-aristocratic-house-scandal-containment',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: "Contain a scandal threatening {faction}'s public standing before it spreads further.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['faction', 'investigation']
  },
  {
    id: 'faction-labor-organization-mediate-strike',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: "Mediate between {faction} and site management before a labor strike turns violent.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'negotiation']
  },
  {
    id: 'faction-frontier-settlement-supply-run',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: "Run urgently needed supplies to a frontier settlement aligned with {faction}.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 7,
    tags: ['faction', 'delivery']
  },
  {
    id: 'faction-planetary-government-census-escort',
    missionTypes: ['escort'],
    tiers: ['tertiary'],
    template: "Escort a census team working on behalf of {faction} through outlying districts.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['faction', 'escort']
  },
  {
    id: 'faction-sector-authority-smuggling-investigation',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Investigate suspected smuggling activity on behalf of {faction} without tipping off the operation.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'faction-criminal-syndicate-collections',
    missionTypes: ['bounty'],
    tiers: ['secondary'],
    template: "Collect an outstanding debt on behalf of {faction} from a client who has been stalling.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['faction', 'bounty', 'illegal']
  },

  // --- PHASE 8D-3C hydration batch 6: defend/observe/secure/intercept/
  // capture/destroy/procure coverage, and shorter secondary/tertiary side
  // objectives meant to pair alongside a primary. ---
  {
    id: 'defend-settlement-raid',
    missionTypes: ['assault', 'escort'],
    tiers: ['primary'],
    template: 'Defend {targetLocation} against an anticipated raid.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['assault'],
    oppositionHints: ['raiders']
  },
  {
    id: 'defend-convoy-ambush',
    missionTypes: ['escort', 'assault'],
    tiers: ['primary'],
    template: 'Defend a convoy caught in an ambush near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['escort', 'assault'],
    oppositionHints: ['ambush-force']
  },
  {
    id: 'defend-negotiation-in-progress',
    missionTypes: ['escort'],
    tiers: ['secondary'],
    template: 'Hold the perimeter while a delicate negotiation concludes at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['escort']
  },
  {
    id: 'observe-report-troop-movement',
    missionTypes: ['investigation'],
    tiers: ['secondary', 'tertiary'],
    template: 'Observe and report on movements near {targetLocation} without engaging.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'observe-verify-rumor',
    missionTypes: ['investigation'],
    tiers: ['tertiary'],
    template: 'Quietly verify whether a rumor about {targetLocation} has any basis in fact.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation']
  },
  {
    id: 'secure-landing-zone',
    missionTypes: ['escort', 'assault'],
    tiers: ['secondary'],
    template: 'Secure a landing zone at {targetLocation} ahead of the main operation.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['escort']
  },
  {
    id: 'secure-evidence-before-tampering',
    missionTypes: ['investigation'],
    tiers: ['primary', 'secondary'],
    template: 'Secure evidence at {targetLocation} before anyone has a chance to tamper with it.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['investigation'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'intercept-message-before-delivery',
    missionTypes: ['investigation', 'sabotage'],
    tiers: ['primary'],
    template: 'Intercept a message before it reaches its intended recipient at {destination}.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['sabotage'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'intercept-rival-shipment',
    missionTypes: ['heist', 'smuggling'],
    tiers: ['primary'],
    template: 'Intercept a rival shipment before it reaches {destination}.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['heist'],
    oppositionHints: ['rival-crew']
  },
  {
    id: 'locate-missing-person-no-leads',
    missionTypes: ['investigation', 'rescue'],
    tiers: ['primary'],
    template: 'Locate {targetNpc}, missing with no solid leads, starting from {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['investigation', 'rescue'],
    creates: { npcConcepts: 1 },
    subjectHints: ['missing person']
  },
  {
    id: 'locate-vanished-shipment',
    missionTypes: ['investigation', 'delivery'],
    tiers: ['secondary'],
    template: 'Locate a shipment of {cargo} that vanished somewhere between {origin} and {destination}.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      origin: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['investigation', 'delivery']
  },
  {
    id: 'capture-live-specimen',
    missionTypes: ['hunt'],
    tiers: ['primary'],
    template: 'Capture a live specimen near {targetLocation} for a client\'s own purposes.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['hunt'],
    constraints: ['the target must be taken alive']
  },
  {
    id: 'capture-vehicle-intact',
    missionTypes: ['assault', 'recovery'],
    tiers: ['secondary'],
    template: 'Capture {vehicleName} intact rather than destroy it.',
    slots: { vehicleName: { type: OBJECTIVE_SLOT_TYPE.VEHICLE } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['assault']
  },
  {
    id: 'destroy-stockpiled-weapons',
    missionTypes: ['sabotage', 'assault'],
    tiers: ['primary'],
    template: 'Destroy a stockpile of illicit weapons found at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['sabotage', 'illegal']
  },
  {
    id: 'destroy-evidence-before-raid',
    missionTypes: ['sabotage'],
    tiers: ['secondary'],
    template: 'Destroy incriminating material at {targetLocation} before an anticipated raid.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['sabotage', 'illegal'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'procure-medical-specialist',
    missionTypes: ['delivery', 'escort'],
    tiers: ['primary'],
    template: 'Convince a reluctant specialist to travel to {destination} and treat a patient in need.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['delivery'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'procure-rare-part-black-market',
    missionTypes: ['smuggling', 'delivery'],
    tiers: ['secondary'],
    template: 'Source a rare part through channels the client would rather not know about.',
    slots: {},
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['smuggling', 'gray-area']
  },
  {
    id: 'transport-time-sensitive-organ',
    missionTypes: ['delivery', 'rescue'],
    tiers: ['primary'],
    template: 'Rush a time-sensitive medical shipment to {destination} before it is no longer viable.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['delivery', 'medical'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'repair-comm-network-outage',
    missionTypes: ['delivery'],
    tiers: ['secondary'],
    template: 'Restore a communications outage affecting {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['repair']
  },
  {
    id: 'repair-water-purification-system',
    missionTypes: ['delivery', 'rescue'],
    tiers: ['primary'],
    template: 'Repair a failing water purification system at {targetLocation} before it becomes a health crisis.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['repair', 'rescue']
  },
  {
    id: 'secure-witness-safe-house',
    missionTypes: ['escort', 'rescue'],
    tiers: ['primary'],
    template: 'Move {targetNpc} to a secure safe house and keep them there until it is safe to emerge.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['escort', 'rescue'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'intercept-communication-verify-loyalty',
    missionTypes: ['investigation'],
    tiers: ['tertiary'],
    template: 'Quietly verify whether {targetNpc} is still loyal before the client commits further.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'observe-monitor-rival-activity',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: 'Monitor activity at {targetLocation} over several days without being noticed.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },

  // --- PHASE 8D-3C hydration batch 7: droid/creature/data/weapon/structure/
  // device slot coverage, and planet/POI-scale objectives. ---
  {
    id: 'recovery-rogue-droid-reprogram',
    missionTypes: ['recovery', 'hunt'],
    tiers: ['primary'],
    template: 'Track down a malfunctioning {droidName} before it causes further harm.',
    slots: { droidName: { type: OBJECTIVE_SLOT_TYPE.DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['recovery']
  },
  {
    id: 'recovery-stolen-droid-unit',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Recover a stolen {droidName} and return it to its registered owner.',
    slots: { droidName: { type: OBJECTIVE_SLOT_TYPE.DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['recovery']
  },
  {
    id: 'escort-protocol-droid-negotiation',
    missionTypes: ['escort'],
    tiers: ['tertiary'],
    template: 'Escort {droidName} safely to {destination} to handle a sensitive negotiation.',
    slots: {
      droidName: { type: OBJECTIVE_SLOT_TYPE.DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['escort']
  },
  {
    id: 'hunt-creature-relocate-not-kill',
    missionTypes: ['hunt'],
    tiers: ['secondary'],
    template: 'Relocate a dangerous creature away from {targetLocation} without killing it.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['hunt'],
    constraints: ['no lethal force permitted']
  },
  {
    id: 'hunt-creature-terrorizing-route',
    missionTypes: ['hunt', 'escort'],
    tiers: ['primary'],
    template: 'Deal with a creature that has made a key route unsafe to travel.',
    slots: {},
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['hunt']
  },
  {
    id: 'recovery-encrypted-data-drive',
    missionTypes: ['recovery', 'heist'],
    tiers: ['primary'],
    template: 'Recover an encrypted data drive from {targetLocation} before it can be wiped remotely.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['recovery'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'recovery-decrypt-and-deliver-data',
    missionTypes: ['delivery', 'investigation'],
    tiers: ['secondary'],
    template: 'Deliver recovered data to an analyst at {destination} for decryption.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['delivery']
  },
  {
    id: 'recovery-prototype-weapon',
    missionTypes: ['recovery', 'heist'],
    tiers: ['primary'],
    template: 'Recover a prototype weapon before it falls into the wrong hands.',
    slots: {},
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['recovery'],
    oppositionHints: ['facility-security']
  },
  {
    id: 'sabotage-critical-structure-support',
    missionTypes: ['sabotage'],
    tiers: ['primary'],
    template: 'Weaken a structural support at {targetLocation} enough to force an evacuation, not a collapse.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.STRUCTURE } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 4,
    tags: ['sabotage'],
    constraints: ['avoid collateral damage to nearby civilians']
  },
  {
    id: 'sabotage-security-device-blind-spot',
    missionTypes: ['sabotage', 'infiltration'],
    tiers: ['secondary'],
    template: 'Disable a specific security device at {targetLocation} to create a temporary blind spot.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.DEVICE } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['sabotage', 'infiltration']
  },
  {
    id: 'survey-planet-colonization-viability',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Survey {targetLocation} to assess whether it can support a new settlement.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.PLANET } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['investigation', 'survey'],
    creates: { locations: 1 }
  },
  {
    id: 'survey-poi-structural-integrity',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: 'Assess the structural integrity of {targetLocation} before it is reopened to traffic.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation']
  },
  {
    id: 'recovery-poi-buried-cache',
    missionTypes: ['recovery'],
    tiers: ['primary'],
    template: 'Locate and recover a cache buried somewhere within {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['recovery']
  },
  {
    id: 'delivery-medical-team-planetside',
    missionTypes: ['delivery', 'rescue'],
    tiers: ['primary'],
    template: 'Ferry a medical team down to {targetLocation} to respond to an ongoing crisis.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.PLANET } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['delivery', 'rescue']
  },
  {
    id: 'escort-diplomat-planetary-summit',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort a diplomat to a summit on {targetLocation}, where tensions are already high.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.PLANET } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['escort'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['hostile-protesters']
  },
  {
    id: 'investigation-poi-history-hook',
    missionTypes: ['investigation'],
    tiers: ['tertiary'],
    template: 'Research the history behind {targetLocation} for a client with a personal interest in it.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['investigation']
  },
  {
    id: 'delivery-supplies-poi-outpost',
    missionTypes: ['delivery'],
    tiers: ['secondary'],
    template: 'Resupply an isolated outpost at {targetLocation} that has gone quiet.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 6,
    tags: ['delivery']
  },
  {
    id: 'rescue-stranded-survey-team',
    missionTypes: ['rescue'],
    tiers: ['primary'],
    template: 'Reach a survey team stranded on {targetLocation} after their transport failed.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.PLANET } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['rescue'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'faction-poi-claim-dispute',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: "Investigate a disputed claim to {targetLocation} on behalf of {faction}.",
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.POI },
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['faction', 'investigation']
  },
  {
    id: 'heist-museum-exhibit-piece',
    missionTypes: ['heist'],
    tiers: ['primary'],
    template: 'Lift a specific exhibit piece from {targetLocation} during a public showing.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['heist'],
    oppositionHints: ['private-security']
  },
  {
    id: 'delivery-artifact-museum-loan',
    missionTypes: ['delivery', 'escort'],
    tiers: ['secondary'],
    template: 'Transport a valuable loan item to {destination} for a temporary exhibit.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['delivery']
  },
  {
    id: 'investigation-sabotaged-equipment-source',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Determine who sabotaged equipment at {targetLocation} before it happens again.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['investigation']
  },
  {
    id: 'escort-witness-to-hearing',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort {targetNpc} safely to {destination} to testify at a formal hearing.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['escort'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['silencing-agents']
  },
  {
    id: 'rescue-search-and-recovery-wilderness',
    missionTypes: ['rescue'],
    tiers: ['primary'],
    template: 'Search {targetLocation} for {targetNpc}, missing since a routine trip went wrong.',
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['rescue'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'delivery-courier-sealed-documents',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: 'Personally carry sealed documents to {destination}, with no digital copy permitted.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 8,
    tags: ['delivery']
  },
  {
    id: 'escort-injured-transport-hospital',
    missionTypes: ['rescue', 'delivery'],
    tiers: ['primary'],
    template: 'Get {targetNpc} to proper medical care at {destination} before their condition deteriorates.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['rescue'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'investigation-verify-supplier-legitimacy',
    missionTypes: ['investigation'],
    tiers: ['tertiary'],
    template: 'Quietly verify whether a new supplier at {targetLocation} is legitimate before the client signs a contract.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['investigation']
  },
  {
    id: 'negotiate-hostage-exchange',
    missionTypes: ['rescue', 'bounty'],
    tiers: ['primary'],
    template: 'Arrange and oversee an exchange between {faction} and the party holding {targetNpc}.',
    slots: {
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION },
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['rescue', 'negotiation'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['captors']
  },
  {
    id: 'assault-retake-facility',
    missionTypes: ['assault'],
    tiers: ['primary'],
    template: 'Retake {targetLocation} from those who have seized control of it.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['assault'],
    oppositionHints: ['occupying-force']
  },
  {
    id: 'infiltration-swap-guest-list',
    missionTypes: ['infiltration', 'heist'],
    tiers: ['secondary'],
    template: 'Get someone added to the guest list for an event at {targetLocation} without raising suspicion.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['infiltration']
  },
  {
    id: 'boarding-quarantine-inspection',
    missionTypes: ['boarding', 'investigation'],
    tiers: ['secondary'],
    template: 'Board {shipName} for a quarantine inspection following a reported outbreak.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['boarding']
  },
  {
    id: 'smuggling-forged-manifest-run',
    missionTypes: ['smuggling'],
    tiers: ['secondary'],
    template: 'Run {cargo} through official inspection using a manifest that will not survive close scrutiny.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['smuggling', 'illegal']
  },
  {
    id: 'delivery-livestock-breeding-stock',
    missionTypes: ['delivery'],
    tiers: ['tertiary'],
    template: 'Deliver valuable breeding stock to {destination} without losing any in transit.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['delivery']
  },
  {
    id: 'recovery-family-remains-closure',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Recover the remains of someone lost at {targetLocation} so their family can finally have closure.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['recovery']
  },

  // --- PHASE 8D-3C hydration batch 8: extraction/boarding/bounty/hunt/
  // assault/heist depth, and additional ordinary-work coverage. ---
  {
    id: 'extraction-engineer-before-purge',
    missionTypes: ['extraction'],
    tiers: ['primary'],
    template: 'Extract {targetNpc} from {faction} before an internal purge reaches them.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['extraction', 'faction'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'extraction-family-quiet-departure',
    missionTypes: ['extraction', 'escort'],
    tiers: ['primary'],
    template: 'Arrange the quiet departure of a family from {origin} before their situation is noticed.',
    slots: { origin: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['extraction'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'extraction-corporate-asset-competitor',
    missionTypes: ['extraction'],
    tiers: ['primary'],
    template: 'Extract {targetNpc}, a valuable specialist, to a competing employer at {destination}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['extraction'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['corporate-security']
  },
  {
    id: 'extraction-prisoner-transfer-intercept',
    missionTypes: ['extraction', 'assault'],
    tiers: ['primary'],
    template: 'Intercept a prisoner transfer and extract {targetNpc} before it reaches {destination}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['extraction'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['prison-transport-guards']
  },
  {
    id: 'extraction-quiet-resignation',
    missionTypes: ['extraction'],
    tiers: ['secondary'],
    template: 'Help {targetNpc} leave {faction} quietly, without triggering retaliation.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['extraction', 'faction'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'boarding-salvage-claim-verification',
    missionTypes: ['boarding', 'recovery'],
    tiers: ['secondary'],
    template: 'Board the derelict {shipName} to verify a salvage claim before it is formally filed.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['boarding', 'recovery']
  },
  {
    id: 'boarding-hostile-pirate-vessel',
    missionTypes: ['boarding', 'assault'],
    tiers: ['primary'],
    template: 'Board and clear {shipName}, currently in pirate hands.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['boarding', 'assault'],
    oppositionHints: ['pirates']
  },
  {
    id: 'boarding-retrieve-black-box-active',
    missionTypes: ['boarding', 'investigation'],
    tiers: ['secondary'],
    template: 'Board {shipName} mid-flight to retrieve its flight recorder before it reaches port.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['boarding']
  },
  {
    id: 'boarding-deliver-urgent-orders',
    missionTypes: ['boarding', 'delivery'],
    tiers: ['tertiary'],
    template: 'Board {shipName} mid-transit to deliver orders that cannot wait for the next port.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['boarding', 'delivery']
  },
  {
    id: 'bounty-witness-protection-relocation',
    missionTypes: ['bounty', 'escort'],
    tiers: ['secondary'],
    template: 'Relocate {targetNpc} to a new identity and location before old associates track them down.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['bounty', 'escort'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'bounty-recover-collateral-not-person',
    missionTypes: ['bounty', 'recovery'],
    tiers: ['secondary'],
    template: 'Recover collateral seized against a debt, without needing to find the debtor themselves.',
    slots: {},
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['bounty']
  },
  {
    id: 'bounty-verify-identity-before-collection',
    missionTypes: ['bounty', 'investigation'],
    tiers: ['tertiary'],
    template: 'Confirm {targetNpc}\'s identity before the bounty is formally collected.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['bounty'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'hunt-track-migratory-pattern',
    missionTypes: ['hunt', 'investigation'],
    tiers: ['tertiary'],
    template: 'Track the migratory pattern of a creature population near {targetLocation} for a client\'s records.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['hunt', 'investigation']
  },
  {
    id: 'hunt-locate-missing-livestock',
    missionTypes: ['hunt', 'recovery'],
    tiers: ['tertiary'],
    template: 'Locate livestock that wandered off from {targetLocation} before predators find them first.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['hunt', 'recovery']
  },
  {
    id: 'assault-hold-the-line',
    missionTypes: ['assault'],
    tiers: ['primary'],
    template: 'Hold {targetLocation} against a sustained push until relief arrives.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['assault'],
    oppositionHints: ['assault-force']
  },
  {
    id: 'assault-clear-path-for-evacuation',
    missionTypes: ['assault', 'rescue'],
    tiers: ['primary'],
    template: 'Clear a path for evacuees fleeing {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['assault', 'rescue'],
    oppositionHints: ['hostile-force']
  },
  {
    id: 'assault-neutralize-sniper-position',
    missionTypes: ['assault'],
    tiers: ['secondary'],
    template: 'Neutralize a fortified position overlooking {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['assault'],
    oppositionHints: ['entrenched-gunner']
  },
  {
    id: 'heist-replace-security-footage',
    missionTypes: ['heist', 'infiltration'],
    tiers: ['secondary'],
    template: 'Loop or replace security footage at {targetLocation} to cover the crew\'s tracks.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['heist', 'infiltration']
  },
  {
    id: 'heist-crack-vault-combination',
    missionTypes: ['heist'],
    tiers: ['secondary'],
    template: 'Obtain the combination or key to a vault at {targetLocation} ahead of the main job.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['heist']
  },
  {
    id: 'heist-distraction-crew-diversion',
    missionTypes: ['heist'],
    tiers: ['secondary', 'tertiary'],
    template: 'Create a convincing diversion at {targetLocation} while the real job happens elsewhere.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['heist']
  },
  {
    id: 'delivery-formal-contract-signing',
    missionTypes: ['delivery', 'escort'],
    tiers: ['tertiary'],
    template: 'Escort a representative to {destination} to formally sign a contract in person.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['delivery', 'escort']
  },
  {
    id: 'delivery-emergency-fuel-run',
    missionTypes: ['delivery'],
    tiers: ['primary'],
    template: 'Run emergency fuel to {destination} before its reserves run out entirely.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 7,
    tags: ['delivery'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'delivery-quarantine-supplies',
    missionTypes: ['delivery', 'rescue'],
    tiers: ['primary'],
    template: 'Get supplies through a quarantine perimeter around {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['delivery', 'rescue']
  },
  {
    id: 'escort-negotiator-hostile-meeting',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort a negotiator into a meeting with a faction that has threatened violence before.',
    slots: {},
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['escort'],
    oppositionHints: ['hostile-hosts']
  },
  {
    id: 'escort-livestock-drive-territory',
    missionTypes: ['escort', 'delivery'],
    tiers: ['tertiary'],
    template: 'Guide a livestock drive through territory known for predators near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['escort']
  },
  {
    id: 'investigation-sabotage-source-industrial',
    missionTypes: ['investigation', 'sabotage'],
    tiers: ['primary'],
    template: 'Determine the source of repeated sabotage at {targetLocation} before production halts entirely.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['investigation']
  },
  {
    id: 'investigation-missing-shipment-insurance-fraud',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Determine whether a reported loss of {cargo} was genuine or staged for the insurance payout.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['investigation']
  },
  {
    id: 'recovery-antique-ship-parts',
    missionTypes: ['recovery'],
    tiers: ['tertiary'],
    template: 'Locate rare, no-longer-manufactured parts for a client restoring an old vessel.',
    slots: {},
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['recovery']
  },
  {
    id: 'delivery-seed-stock-agricultural-relief',
    missionTypes: ['delivery'],
    tiers: ['secondary'],
    template: 'Deliver seed stock to {destination} in time for the next planting season.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['delivery'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'infiltration-recover-hostage-intel-first',
    missionTypes: ['infiltration', 'investigation'],
    tiers: ['secondary'],
    template: 'Quietly confirm exactly where {targetNpc} is being held before any rescue attempt.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['infiltration', 'investigation'],
    creates: { npcConcepts: 1 },
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'sabotage-jam-tracking-beacon',
    missionTypes: ['sabotage'],
    tiers: ['tertiary'],
    template: 'Disable a tracking beacon before it leads unwanted attention to {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['sabotage']
  },

  // --- PHASE 8D-3C hydration batch 9 (final): rounding out smuggling/
  // boarding/extraction depth and remaining ordinary-work variety to
  // close out the 250-400 production target. ---
  {
    id: 'smuggling-refugees-closed-border',
    missionTypes: ['smuggling', 'rescue'],
    tiers: ['primary'],
    template: 'Move a group across a closed border to {destination} without official notice.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['smuggling', 'rescue'],
    oppositionHints: ['border-patrol']
  },
  {
    id: 'smuggling-medical-supplies-embargo',
    missionTypes: ['smuggling', 'delivery'],
    tiers: ['primary'],
    template: 'Move medical supplies past an embargo to reach {destination}.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['smuggling', 'delivery'],
    oppositionHints: ['customs-patrol']
  },
  {
    id: 'smuggling-information-out-of-lockdown',
    missionTypes: ['smuggling', 'investigation'],
    tiers: ['secondary'],
    template: 'Get information out of a locked-down {targetLocation} to someone who needs to know.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['smuggling', 'investigation']
  },
  {
    id: 'smuggling-double-blind-handoff',
    missionTypes: ['smuggling'],
    tiers: ['secondary'],
    template: 'Complete a double-blind handoff of {cargo} where neither party can identify the other.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['smuggling']
  },
  {
    id: 'smuggling-fuel-blockade-run',
    missionTypes: ['smuggling'],
    tiers: ['primary'],
    template: 'Run a blockade to deliver desperately needed fuel to {destination}.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['smuggling'],
    oppositionHints: ['blockade-patrol']
  },
  {
    id: 'boarding-tow-disabled-vessel',
    missionTypes: ['boarding', 'recovery'],
    tiers: ['secondary'],
    template: 'Board and secure {shipName} for a tow back to {destination}.',
    slots: {
      shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['boarding', 'recovery']
  },
  {
    id: 'boarding-reclaim-repossessed-ship',
    missionTypes: ['boarding', 'recovery'],
    tiers: ['secondary'],
    template: 'Board {shipName} to formally repossess it on behalf of a creditor.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['boarding']
  },
  {
    id: 'boarding-mediate-crew-mutiny',
    missionTypes: ['boarding', 'investigation'],
    tiers: ['secondary'],
    template: 'Board {shipName} to mediate a dispute between its captain and crew before it turns violent.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['boarding']
  },
  {
    id: 'extraction-witness-mid-trial',
    missionTypes: ['extraction', 'rescue'],
    tiers: ['primary'],
    template: 'Extract {targetNpc} from protective custody before those who want them silenced find a way in first.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['extraction'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'extraction-recover-lost-team-member',
    missionTypes: ['extraction', 'rescue'],
    tiers: ['secondary'],
    template: 'Locate and extract a team member separated from the main group near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['extraction']
  },
  {
    id: 'delivery-tools-repair-crew-relief',
    missionTypes: ['delivery'],
    tiers: ['tertiary'],
    template: 'Deliver replacement tools to a repair crew stalled without them at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['delivery']
  },
  {
    id: 'delivery-legal-filing-deadline',
    missionTypes: ['delivery'],
    tiers: ['secondary'],
    template: 'Get a legal filing to {destination} before a hard deadline lapses.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['delivery', 'legal'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'delivery-relief-supplies-disaster',
    missionTypes: ['delivery', 'rescue'],
    tiers: ['primary'],
    template: 'Get relief supplies to {targetLocation} after a disaster has cut off normal routes.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['delivery', 'rescue']
  },
  {
    id: 'escort-inspector-hazard-site',
    missionTypes: ['escort'],
    tiers: ['tertiary'],
    template: 'Escort a safety inspector through a hazardous site at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['escort']
  },
  {
    id: 'escort-mourners-memorial-service',
    missionTypes: ['escort'],
    tiers: ['tertiary'],
    template: 'Provide quiet security for a memorial service at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['escort']
  },
  {
    id: 'investigation-audit-suspected-fraud',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: 'Conduct a discreet audit of {faction} to confirm or rule out suspected fraud.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'investigation']
  },
  {
    id: 'investigation-identify-informant-leak',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: "Identify who within {faction} has been leaking information, without alerting them.",
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'recovery-return-borrowed-vehicle',
    missionTypes: ['recovery'],
    tiers: ['tertiary'],
    template: 'Retrieve {vehicleName}, borrowed and never returned, from wherever it ended up.',
    slots: { vehicleName: { type: OBJECTIVE_SLOT_TYPE.VEHICLE } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['recovery']
  },
  {
    id: 'recovery-lost-pet-companion',
    missionTypes: ['recovery'],
    tiers: ['tertiary'],
    template: 'Find a lost companion creature that wandered off near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['recovery']
  },
  {
    id: 'heist-swap-shipment-labels',
    missionTypes: ['heist', 'smuggling'],
    tiers: ['secondary'],
    template: 'Swap shipping labels on {cargo} to redirect it without anyone noticing until it\'s too late.',
    slots: { cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['heist', 'smuggling']
  },
  {
    id: 'heist-infiltrate-high-security-vault-team',
    missionTypes: ['heist'],
    tiers: ['primary'],
    template: 'Join an inside team to breach {targetLocation} from within rather than force entry.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'severe', max: 'extreme' },
    weight: 3,
    tags: ['heist'],
    oppositionHints: ['facility-security', 'security-droids'],
    locationHints: ['corporate']
  },
  {
    id: 'assault-escort-under-fire',
    missionTypes: ['assault', 'escort'],
    tiers: ['primary'],
    template: 'Fight through to extract {targetNpc}, currently pinned down near {targetLocation}.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['assault', 'rescue'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['hostile-force']
  },
  {
    id: 'assault-demonstration-of-force',
    missionTypes: ['assault'],
    tiers: ['secondary'],
    template: "Stage a limited show of force at {targetLocation} to discourage further aggression, without escalating to war.",
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['assault']
  },
  {
    id: 'infiltration-verify-double-agent',
    missionTypes: ['infiltration', 'investigation'],
    tiers: ['primary'],
    template: 'Determine whether {targetNpc} is genuinely loyal or secretly working for the opposition.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['infiltration', 'investigation'],
    creates: { npcConcepts: 1 },
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'infiltration-obtain-formal-credentials',
    missionTypes: ['infiltration'],
    tiers: ['tertiary'],
    template: 'Obtain legitimate-looking credentials needed to access {targetLocation} later.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['infiltration']
  },
  {
    id: 'sabotage-poison-water-supply-prevent',
    missionTypes: ['sabotage', 'investigation'],
    tiers: ['primary'],
    template: 'Stop an attempt to contaminate the water supply at {targetLocation} before it succeeds.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['sabotage', 'rescue'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'sabotage-counter-intelligence-operation',
    missionTypes: ['sabotage', 'investigation'],
    tiers: ['secondary'],
    template: 'Feed deliberately false information to a rival\'s intelligence network.',
    slots: {},
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['sabotage']
  },
  {
    id: 'hunt-clear-nest-before-construction',
    missionTypes: ['hunt'],
    tiers: ['tertiary'],
    template: 'Relocate a creature nest before construction begins at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['hunt'],
    constraints: ['no lethal force permitted']
  },
  {
    id: 'bounty-serve-formal-summons',
    missionTypes: ['bounty', 'delivery'],
    tiers: ['tertiary'],
    template: 'Locate {targetNpc} and formally serve them with a legal summons.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['bounty', 'legal'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'delivery-time-capsule-ceremony',
    missionTypes: ['delivery'],
    tiers: ['tertiary'],
    template: 'Deliver a ceremonial item to {destination} in time for a scheduled observance.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['delivery']
  },
  {
    id: 'escort-negotiating-team-rival-territory',
    missionTypes: ['escort'],
    tiers: ['primary'],
    template: 'Escort a negotiating team safely into and out of rival-controlled {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['escort'],
    oppositionHints: ['hostile-hosts']
  },
  {
    id: 'recovery-satellite-relay-downed',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Recover a downed relay unit before it reveals more than the client wants known.',
    slots: {},
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['recovery']
  },
  {
    id: 'investigation-confirm-death-inheritance',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: "Confirm what actually happened to {targetNpc} for an estate that can't otherwise be settled.",
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'delivery-prototype-field-test',
    missionTypes: ['delivery', 'investigation'],
    tiers: ['secondary'],
    template: 'Field-test a prototype device at {targetLocation} and report results back to the client.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['delivery']
  },

  // --- PHASE 8D-3C hydration batch 10 (closing): final pass rounding out
  // hunt/bounty/boarding/extraction to close out the 250-400 target. ---
  {
    id: 'hunt-identify-creature-species-threat',
    missionTypes: ['hunt', 'investigation'],
    tiers: ['secondary'],
    template: 'Identify an unfamiliar creature species reported near {targetLocation} before locals overreact.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['hunt', 'investigation']
  },
  {
    id: 'hunt-recover-trophy-proof',
    missionTypes: ['hunt'],
    tiers: ['tertiary'],
    template: 'Bring back proof of a successful hunt to satisfy a skeptical client.',
    slots: {},
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['hunt']
  },
  {
    id: 'hunt-guide-expedition-safely',
    missionTypes: ['hunt', 'escort'],
    tiers: ['secondary'],
    template: 'Guide an expedition safely through territory known for dangerous wildlife near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['hunt', 'escort']
  },
  {
    id: 'bounty-negotiate-voluntary-surrender',
    missionTypes: ['bounty', 'hunt'],
    tiers: ['primary'],
    template: 'Convince {targetNpc} to surrender voluntarily rather than force the issue.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['bounty', 'hunt', 'negotiation'],
    creates: { npcConcepts: 1 },
    constraints: ['no lethal force permitted']
  },
  {
    id: 'bounty-recover-skip-collateral-asset',
    missionTypes: ['bounty', 'recovery'],
    tiers: ['secondary'],
    template: 'Recover an asset {targetNpc} put up as collateral before skipping town.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['bounty', 'recovery'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'bounty-locate-material-witness',
    missionTypes: ['bounty', 'investigation'],
    tiers: ['secondary'],
    template: 'Locate {targetNpc}, a material witness who disappeared before a scheduled hearing.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['bounty', 'investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'boarding-verify-cargo-manifest-dispute',
    missionTypes: ['boarding', 'investigation'],
    tiers: ['tertiary'],
    template: 'Board {shipName} to resolve a manifest dispute before it escalates further.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['boarding']
  },
  {
    id: 'boarding-rescue-crew-mechanical-failure',
    missionTypes: ['boarding', 'rescue'],
    tiers: ['primary'],
    template: 'Board {shipName}, crippled by mechanical failure, and get its crew to safety.',
    slots: { shipName: { type: OBJECTIVE_SLOT_TYPE.SHIP } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['boarding', 'rescue'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'extraction-recover-defecting-officer',
    missionTypes: ['extraction'],
    tiers: ['primary'],
    template: 'Extract {targetNpc}, a defecting officer of {faction}, before their absence is noticed.',
    slots: {
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID },
      faction: { type: OBJECTIVE_SLOT_TYPE.FACTION }
    },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['extraction', 'faction'],
    creates: { npcConcepts: 1 },
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'extraction-medical-team-warzone',
    missionTypes: ['extraction', 'rescue'],
    tiers: ['primary'],
    template: 'Extract a medical team from {targetLocation} as fighting closes in.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'severe' },
    weight: 6,
    tags: ['extraction', 'rescue'],
    creates: { npcConcepts: 1 },
    oppositionHints: ['advancing-force']
  },
  {
    id: 'delivery-scientific-samples-cold-chain',
    missionTypes: ['delivery'],
    tiers: ['secondary'],
    template: 'Keep {cargo} within safe conditions for the entire trip to {destination}.',
    slots: {
      cargo: { type: OBJECTIVE_SLOT_TYPE.CARGO },
      destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION }
    },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['delivery']
  },
  {
    id: 'escort-inspector-compliance-audit',
    missionTypes: ['escort', 'investigation'],
    tiers: ['tertiary'],
    template: 'Escort a compliance auditor through {targetLocation} without incident.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['escort']
  },
  {
    id: 'investigation-clear-suspects-name',
    missionTypes: ['investigation'],
    tiers: ['primary'],
    template: "Investigate what actually happened at {targetLocation} to clear {targetNpc}'s name.",
    slots: {
      targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION },
      targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID }
    },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 6,
    tags: ['investigation'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'recovery-time-locked-container',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Open a time-locked container at {targetLocation} exactly when its terms allow.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['recovery']
  },
  {
    id: 'sabotage-halt-illegal-logging',
    missionTypes: ['sabotage', 'investigation'],
    tiers: ['secondary'],
    template: 'Quietly halt unauthorized resource extraction happening near {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['sabotage']
  },
  {
    id: 'heist-recover-gambling-debt-marker',
    missionTypes: ['heist', 'recovery'],
    tiers: ['secondary'],
    template: 'Retrieve a signed debt marker from {targetLocation} before it can be used as leverage.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 4,
    tags: ['heist', 'recovery']
  },
  {
    id: 'assault-liberate-work-camp',
    missionTypes: ['assault', 'rescue'],
    tiers: ['primary'],
    template: 'Liberate workers held against their will at {targetLocation}.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'difficult', max: 'severe' },
    weight: 5,
    tags: ['assault', 'rescue'],
    oppositionHints: ['overseers'],
    subjectHints: ['captured ally awaiting rescue']
  },
  {
    id: 'infiltration-confirm-facility-purpose',
    missionTypes: ['infiltration', 'investigation'],
    tiers: ['secondary'],
    template: 'Determine the true purpose of {targetLocation}, which does not match its official records.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.FACILITY } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['infiltration', 'investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'smuggling-diplomatic-pouch-unofficial',
    missionTypes: ['smuggling', 'delivery'],
    tiers: ['secondary'],
    template: 'Move an unofficial diplomatic pouch to {destination} outside normal channels.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['smuggling']
  },
  {
    id: 'recovery-child-custody-dispute',
    missionTypes: ['recovery', 'rescue'],
    tiers: ['primary'],
    template: 'Locate {targetNpc}, caught in the middle of a custody dispute, and ensure their safety.',
    slots: { targetNpc: { type: OBJECTIVE_SLOT_TYPE.PERSON_OR_DROID } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['recovery', 'rescue'],
    creates: { npcConcepts: 1 }
  },
  {
    id: 'escort-relic-religious-procession',
    missionTypes: ['escort'],
    tiers: ['tertiary'],
    template: "Escort a religious relic through {targetLocation} during a public procession.",
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 3,
    tags: ['escort']
  },
  {
    id: 'delivery-vaccine-outbreak-response',
    missionTypes: ['delivery', 'rescue'],
    tiers: ['primary'],
    template: 'Deliver vaccine doses to {destination} ahead of a spreading outbreak.',
    slots: { destination: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 7,
    tags: ['delivery', 'rescue'],
    constraints: ['a strict time limit before the situation worsens']
  },
  {
    id: 'investigation-verify-treaty-compliance',
    missionTypes: ['investigation'],
    tiers: ['secondary'],
    template: 'Quietly verify whether {faction} is actually complying with a recent agreement.',
    slots: { faction: { type: OBJECTIVE_SLOT_TYPE.FACTION } },
    difficulty: { min: 'standard', max: 'difficult' },
    weight: 5,
    tags: ['faction', 'investigation'],
    constraints: ['stealth required -- detection ends the mission']
  },
  {
    id: 'recovery-lost-cultural-record',
    missionTypes: ['recovery'],
    tiers: ['secondary'],
    template: 'Recover a lost cultural record from {targetLocation} before it is lost for good.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 4,
    tags: ['recovery']
  },
  {
    id: 'delivery-election-ballots-remote-district',
    missionTypes: ['delivery'],
    tiers: ['secondary'],
    template: 'Deliver ballots to a remote district at {targetLocation} in time to be counted.',
    slots: { targetLocation: { type: OBJECTIVE_SLOT_TYPE.LOCATION } },
    difficulty: { min: 'routine', max: 'standard' },
    weight: 5,
    tags: ['delivery', 'legal'],
    constraints: ['a strict time limit before the situation worsens']
  }
];

/** Normalized, validated production fixture catalog (frozen). */
export const OBJECTIVE_TEMPLATE_FIXTURES = Object.freeze(
  RAW_FIXTURES.map((raw) => Object.freeze(normalizeObjectiveTemplate(raw)))
);

/** Fixtures whose `missionTypes` include the given mission type. */
export function fixturesForMissionType(missionType) {
  return OBJECTIVE_TEMPLATE_FIXTURES.filter((template) => template.missionTypes.includes(missionType));
}
