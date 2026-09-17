/**
 * FactionRegistryService
 *
 * GM-owned faction/organization registry plus actor relationship helpers used by
 * the GM Workspace/Factions surfaces, Job Board consequences, and player Allies
 * app. Registry state is world-scoped; actor relationships remain per-actor.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const MODULE_ID = 'foundryvtt-swse';
const REGISTRY_SETTING = 'gmFactionRegistry';
const ACTOR_RELATIONSHIPS_FLAG = 'alliesFactionRelationships';
const LEGACY_FACTIONS_FLAG = 'factions';
const MAX_HISTORY = 75;

const RELATIONSHIP_TYPES = Object.freeze([
  { value: 'known', label: 'Known Faction' },
  { value: 'member', label: 'Membership' },
  { value: 'enemy', label: 'Enemy / Rival' },
  { value: 'patron', label: 'Patron / Client' },
  { value: 'founder', label: 'Founder / Leader / Owner' },
  { value: 'ally', label: 'Ally' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'other', label: 'Other' }
]);

const SOURCE_TYPES = Object.freeze([
  { value: 'gm', label: 'GM Manual' },
  { value: 'job', label: 'Job Board' },
  { value: 'organization', label: 'Owned Organization' },
  { value: 'player-suggested', label: 'Player Suggested' }
]);

const APPROVAL_STATUSES = new Set(['suggested', 'pending', 'pending_approval']);

const CONTACT_DISPOSITIONS = Object.freeze([
  { value: 'unknown', label: 'Unknown' },
  { value: 'ally', label: 'Ally' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'rival', label: 'Rival' },
  { value: 'hostile', label: 'Hostile' }
]);

const CONTACT_REVEAL_STATES = Object.freeze([
  { value: 'hidden', label: 'GM Only' },
  { value: 'hinted', label: 'Hinted' },
  { value: 'known', label: 'Known to Players' },
  { value: 'compromised', label: 'Compromised' }
]);

const CONTACT_DISPOSITION_VALUES = new Set(CONTACT_DISPOSITIONS.map(entry => entry.value));
const CONTACT_REVEAL_VALUES = new Set(CONTACT_REVEAL_STATES.map(entry => entry.value));

function nowIso() {
  try { return new Date().toISOString(); } catch (_err) { return ''; }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback ?? '').trim();
}

function clampScale(value) {
  const n = Math.floor(Number(value) || 1);
  return Math.max(1, Math.min(20, n));
}

function normalizeScore(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function randomId() {
  return foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
}

/**
 * Mints a randomId() guaranteed not to collide with anything already in
 * `reserved` (retrying until it draws a fresh value), then adds it to
 * `reserved` so a later call against the same set can't repeat it either.
 * Used by migrateLegacyIdentities() so a newly-minted id can never
 * accidentally match a healthy, already-persisted id elsewhere in the
 * registry -- structural collision-safety rather than relying on the
 * astronomically low probability of randomId() repeating.
 */
function mintUniqueId(reserved) {
  let candidate = randomId();
  while (reserved.has(candidate)) candidate = randomId();
  reserved.add(candidate);
  return candidate;
}

/**
 * Reproduces the EXACT pre-hardening id formula for a raw Faction/Contact
 * that is missing an id, so migrateLegacyIdentities() can recover the
 * "old effective identity" an external reference (Location/Intel/Job/Actor
 * relationship) may already have captured before this hardening pass --
 * see that method's own doc comment (CORRECTION PASS round 2).
 */
function legacyFactionIdCandidate(rawFaction) {
  return slugify(cleanText(rawFaction.name || rawFaction.factionName || 'Unnamed Faction'));
}
function legacyContactIdCandidate(rawContact) {
  const name = cleanText(rawContact.name || rawContact.contactName || 'Unnamed Contact');
  const role = cleanText(rawContact.role || rawContact.contactRole || rawContact.title || 'Faction Contact');
  return slugify(`${name}-${role}`);
}

function slugify(value) {
  const base = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || randomId();
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(entry => cleanText(entry)).filter(Boolean);
  return cleanText(value).split(',').map(entry => cleanText(entry)).filter(Boolean);
}

function normalizeIdList(value) {
  if (Array.isArray(value)) return value.map(entry => cleanText(entry)).filter(Boolean);
  return cleanText(value).split(',').map(entry => cleanText(entry)).filter(Boolean);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'known'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off', 'hidden'].includes(normalized)) return false;
  return Boolean(fallback);
}

function normalizeChoice(value, allowedValues, fallback) {
  const normalized = cleanText(value || fallback).toLowerCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeJobDefaults(record = {}, fallback = {}) {
  const source = record.jobDefaults && typeof record.jobDefaults === 'object'
    ? { ...record.jobDefaults, ...record }
    : record;
  const successDelta = normalizeScore(source.defaultSuccessDelta ?? source.successDelta ?? fallback.defaultSuccessDelta ?? fallback.successDelta ?? 1);
  const failureDelta = normalizeScore(source.defaultFailureDelta ?? source.failureDelta ?? fallback.defaultFailureDelta ?? fallback.failureDelta ?? -1);
  return {
    tone: cleanText(source.defaultJobTone || source.tone || fallback.defaultJobTone || fallback.tone || ''),
    rewardStyle: cleanText(source.defaultRewardStyle || source.rewardStyle || fallback.defaultRewardStyle || fallback.rewardStyle || ''),
    objective: cleanText(source.defaultObjective || source.objective || fallback.defaultObjective || fallback.objective || ''),
    briefing: cleanText(source.defaultBriefing || source.briefing || fallback.defaultBriefing || fallback.briefing || ''),
    instructions: cleanText(source.defaultInstructions || source.instructions || fallback.defaultInstructions || fallback.instructions || ''),
    credits: Math.max(0, normalizeScore(source.defaultCredits ?? source.credits ?? fallback.defaultCredits ?? fallback.credits ?? 0)),
    xp: Math.max(0, normalizeScore(source.defaultXp ?? source.xp ?? fallback.defaultXp ?? fallback.xp ?? 0)),
    successDelta,
    failureDelta,
    visibility: cleanText(source.defaultVisibility || source.visibility || fallback.defaultVisibility || fallback.visibility || 'posted'),
    legality: cleanText(source.defaultLegality || source.legality || fallback.defaultLegality || fallback.legality || ''),
    payStyle: cleanText(source.defaultPayStyle || source.payStyle || fallback.defaultPayStyle || fallback.payStyle || ''),
    rivalFactionName: cleanText(source.defaultRivalFactionName || source.rivalFactionName || source.rivalFaction || fallback.defaultRivalFactionName || fallback.rivalFactionName || fallback.rivalFaction || ''),
    rivalSuccessDelta: normalizeScore(source.defaultRivalSuccessDelta ?? source.rivalSuccessDelta ?? fallback.defaultRivalSuccessDelta ?? fallback.rivalSuccessDelta ?? -1),
    rivalFailureDelta: normalizeScore(source.defaultRivalFailureDelta ?? source.rivalFailureDelta ?? fallback.defaultRivalFailureDelta ?? fallback.rivalFailureDelta ?? 1),
    consequenceNotes: cleanText(source.defaultConsequenceNotes || source.consequenceNotes || fallback.defaultConsequenceNotes || fallback.consequenceNotes || '')
  };
}

function normalizeContact(record = {}) {
  const name = cleanText(record.name || record.contactName || 'Unnamed Contact');
  const role = cleanText(record.role || record.contactRole || record.title || 'Faction Contact');
  const revealState = normalizeChoice(record.revealState || (record.knownToPlayers ? 'known' : 'hidden'), CONTACT_REVEAL_VALUES, 'hidden');
  const knownToPlayers = normalizeBoolean(record.knownToPlayers, revealState === 'known' || revealState === 'compromised');
  return {
    // Identity hardening (PRE-8D-4): a NEW Contact (created through
    // upsertFactionContact(), which always supplies an id explicitly before
    // calling this function -- see that method) never derives its id from
    // display name/role; it always gets a fresh randomId() there instead.
    // This fallback only ever fires for a RAW, never-yet-migrated legacy
    // Contact record read directly off disk (id genuinely absent in
    // storage) -- for that case ONLY, recompute the exact legacy formula
    // pre-hardening code used (slugify(name-role)) rather than a fresh
    // random value, so an external reference (Location/Intel/Job/Actor
    // relationship) that already captured THIS record's old effective id
    // keeps resolving. This is a stability/backward-compat concern, not a
    // reintroduction of name-derived identity for new records: it is
    // itself collision-checked and superseded once
    // migrateLegacyIdentities() persists a real id (CORRECTION PASS round 2).
    id: cleanText(record.id || record.contactId) || slugify(`${name}-${role}`),
    name,
    role,
    title: cleanText(record.title || ''),
    description: cleanText(record.description || record.notes || ''),
    image: cleanText(record.image || record.img || record.imageUrl || ''),
    actorId: cleanText(record.actorId || record.promotedActorId || ''),
    actorUuid: cleanText(record.actorUuid || record.promotedActorUuid || ''),
    actorName: cleanText(record.actorName || record.promotedActorName || ''),
    promotedAt: cleanText(record.promotedAt || ''),
    tags: normalizeTags(record.tags),

    // Phase 2 dossier fields. These remain lightweight registry metadata and do
    // not duplicate actor stats; promoted NPC actors stay linked by UUID/id.
    disposition: normalizeChoice(record.disposition || record.relationshipDisposition, CONTACT_DISPOSITION_VALUES, 'unknown'),
    revealState,
    knownToPlayers,
    publicNotes: cleanText(record.publicNotes || record.playerNotes || ''),
    gmNotes: cleanText(record.gmNotes || record.privateNotes || ''),
    lastKnownLocation: cleanText(record.lastKnownLocation || record.location || record.locationName || ''),
    agenda: cleanText(record.agenda || record.motivation || ''),
    secret: cleanText(record.secret || record.secretNotes || ''),
    factionRank: cleanText(record.factionRank || record.rank || ''),
    messengerPersonaId: cleanText(record.messengerPersonaId || record.personaId || ''),
    linkedIntelIds: normalizeIdList(record.linkedIntelIds || record.intelIds),

    defaultJobTone: cleanText(record.defaultJobTone || record.jobDefaults?.tone || ''),
    defaultRewardStyle: cleanText(record.defaultRewardStyle || record.jobDefaults?.rewardStyle || ''),
    defaultObjective: cleanText(record.defaultObjective || record.jobDefaults?.objective || ''),
    defaultBriefing: cleanText(record.defaultBriefing || record.jobDefaults?.briefing || ''),
    defaultInstructions: cleanText(record.defaultInstructions || record.jobDefaults?.instructions || ''),
    defaultCredits: Math.max(0, normalizeScore(record.defaultCredits ?? record.jobDefaults?.credits ?? 0)),
    defaultXp: Math.max(0, normalizeScore(record.defaultXp ?? record.jobDefaults?.xp ?? 0)),
    defaultSuccessDelta: normalizeScore(record.defaultSuccessDelta ?? record.jobDefaults?.successDelta ?? 1),
    defaultFailureDelta: normalizeScore(record.defaultFailureDelta ?? record.jobDefaults?.failureDelta ?? -1),
    defaultVisibility: cleanText(record.defaultVisibility || record.jobDefaults?.visibility || 'posted'),
    defaultLegality: cleanText(record.defaultLegality || record.jobDefaults?.legality || ''),
    defaultPayStyle: cleanText(record.defaultPayStyle || record.jobDefaults?.payStyle || ''),
    defaultRivalFactionName: cleanText(record.defaultRivalFactionName || record.jobDefaults?.rivalFactionName || record.rivalFactionName || ''),
    defaultRivalSuccessDelta: normalizeScore(record.defaultRivalSuccessDelta ?? record.jobDefaults?.rivalSuccessDelta ?? -1),
    defaultRivalFailureDelta: normalizeScore(record.defaultRivalFailureDelta ?? record.jobDefaults?.rivalFailureDelta ?? 1),
    defaultConsequenceNotes: cleanText(record.defaultConsequenceNotes || record.jobDefaults?.consequenceNotes || ''),
    jobDefaults: normalizeJobDefaults(record),
    active: record.active === false ? false : true,
    createdAt: cleanText(record.createdAt || nowIso()),
    updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso())
  };
}

function labelFor(list, value) {
  return list.find(entry => entry.value === value)?.label ?? value;
}

function scoreLabel(value) {
  const score = normalizeScore(value);
  return score > 0 ? `+${score}` : score === 0 ? '+0' : String(score);
}

function getSetting(fallback = []) {
  try {
    const value = game.settings?.get?.(MODULE_ID, REGISTRY_SETTING);
    return Array.isArray(value) ? value : fallback;
  } catch (_err) {
    return fallback;
  }
}

async function setSetting(value = []) {
  return game.settings?.set?.(MODULE_ID, REGISTRY_SETTING, Array.isArray(value) ? value : []);
}

function actorLabel(actor) {
  return actor?.name || 'Unknown Actor';
}

function actorUuid(actor) {
  if (!actor) return '';
  try { return actor.uuid || `Actor.${actor.id}`; } catch (_err) { return actor.id ? `Actor.${actor.id}` : ''; }
}

async function resolveActorReference({ uuid = '', actorId = '' } = {}) {
  const byUuid = cleanText(uuid);
  if (byUuid && typeof fromUuid === 'function') {
    try {
      const resolved = await fromUuid(byUuid);
      if (resolved?.documentName === 'Actor' || resolved?.constructor?.documentName === 'Actor') return resolved;
      if (resolved?.actor) return resolved.actor;
    } catch (_err) {}
  }
  const id = cleanText(actorId);
  return id ? game.actors?.get?.(id) || null : null;
}

function parsePlanetSystem(value = '') {
  const raw = cleanText(value);
  if (!raw) return { planet: '', system: '' };
  const [planet, system] = raw.split('/').map(part => cleanText(part));
  return { planet: planet || raw, system: system || '' };
}

function planetSystemFrom(data = {}) {
  const planet = cleanText(data.planet || data.locationPlanet || data.world || '');
  const system = cleanText(data.system || data.starSystem || data.locationSystem || '');
  if (planet && system) return `${planet} / ${system}`;
  return cleanText(data.planetSystem || data.location || planet || system || '');
}

export function registerFactionRegistrySettings() {
  if (game.settings.settings.has(`${MODULE_ID}.${REGISTRY_SETTING}`)) return;
  game.settings.register(MODULE_ID, REGISTRY_SETTING, {
    name: 'GM Faction Registry',
    hint: 'Campaign factions and organizations tracked by the GM Workspace, GM Factions manager, Job Board, and Allies application.',
    scope: 'world',
    config: false,
    type: Object,
    default: []
  });
  // PRE-8D-4 identity hardening: sweep existing worlds once per ready for any
  // Faction/Contact record left with a missing or colliding id by the old
  // name-derived fallback. GM-only, idempotent, no-op once the registry is clean.
  Hooks.once('ready', () => {
    if (!game.user?.isGM) return;
    FactionRegistryService.migrateLegacyIdentities().catch(err => {
      SWSELogger.warn?.('[FactionRegistryService] Legacy identity migration failed.', err);
    });
  });
}

export class FactionRegistryService {
  static RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
  static SOURCE_TYPES = SOURCE_TYPES;
  static CONTACT_DISPOSITIONS = CONTACT_DISPOSITIONS;
  static CONTACT_REVEAL_STATES = CONTACT_REVEAL_STATES;
  static REGISTRY_SETTING = REGISTRY_SETTING;
  static ACTOR_RELATIONSHIPS_FLAG = ACTOR_RELATIONSHIPS_FLAG;
  static LEGACY_FACTIONS_FLAG = LEGACY_FACTIONS_FLAG;

  static getRelationshipTypeOptions() {
    return RELATIONSHIP_TYPES.map(entry => ({ ...entry }));
  }

  static getSourceTypeOptions() {
    return SOURCE_TYPES.map(entry => ({ ...entry }));
  }

  static getContactDispositionOptions() {
    return CONTACT_DISPOSITIONS.map(entry => ({ ...entry }));
  }

  static getContactRevealStateOptions() {
    return CONTACT_REVEAL_STATES.map(entry => ({ ...entry }));
  }

  static getRegistry() {
    return safeArray(getSetting()).map(record => this._normalizeFactionRecord(record));
  }

  static async saveRegistry(records = []) {
    const normalized = safeArray(records).map(record => this._normalizeFactionRecord(record));
    await setSetting(normalized);
    Hooks.callAll('swseFactionRegistryUpdated', { records: normalized });
    return normalized;
  }

  /**
   * PRE-8D-4 identity-hardening migration. Detects Faction/Contact records in
   * the persisted registry that are missing a canonical id, or that collide
   * on the same id (two records resolving to the same id -- most likely two
   * legacy no-id records that both fell back to slugify(name) before this
   * hardening pass), and assigns each a fresh, name-independent id exactly
   * once. A healthy legacy id (already unique, already persisted -- however
   * it was originally derived) is never touched. Idempotent: a second call
   * finds nothing left to migrate and writes nothing.
   *
   * CORRECTION PASS (independent review of PR #969) hardened this twice over:
   *
   * 1. Contact ids are now reserved/claimed in ONE pool GLOBAL across the
   *    entire registry, not reset per-Faction. Contact identity is a
   *    single namespace registry-wide (getAllFactionContacts() and every
   *    id-only consumer, e.g. Location lead reveal, address a Contact by
   *    its id alone) -- two different Factions' Contacts that both carried
   *    the same legacy name/role-derived id would previously both survive
   *    unchanged as long as neither Faction saw the other's Contact id, a
   *    real cross-Faction collision the old per-Faction Set could miss.
   * 2. Every pre-existing, non-empty Faction id AND Contact id in the raw
   *    registry is reserved up front, before minting anything (mintUniqueId()
   *    above) -- so a record processed early that needs a fresh id can
   *    never draw the exact id a healthy record LATER in the registry
   *    already legitimately holds and force that later record into being
   *    treated as the duplicate instead. This makes "a healthy legacy id is
   *    never rewritten" a structural guarantee, not merely astronomically
   *    likely.
   *
   * A genuine duplicate non-empty id is intrinsically ambiguous for any
   * EXISTING external reference (Job/Intel/Location) that already pointed
   * at that id -- there is no way to know which of the two records it
   * meant, and this migration does not guess: it keeps the first
   * occurrence exactly as-is and mints a fresh id only for the later
   * duplicate, then reports every such case (via the returned `collisions`
   * array and an SWSELogger warning) rather than pretending the ambiguity
   * doesn't exist.
   *
   * CORRECTION PASS round 2 (independent re-review): a MISSING id is not
   * given a fresh random id outright anymore. Pre-hardening code always
   * read a missing Faction/Contact id as slugify(name)/slugify(name-role)
   * (see _normalizeFactionRecord()/normalizeContact()'s own fallback,
   * which reproduces the identical formula for the same reason) -- any
   * external reference (a Location's controllingFactionId, an Intel
   * record's linkedFactionId, a Job's issuerFactionId, an Actor
   * relationship's factionId) created by reading THIS record before this
   * hardening pass shipped would have captured that exact value. Minting
   * a random id instead would silently orphan every such reference. So a
   * missing id first tries that EXACT legacy formula as its candidate;
   * only when the candidate is already reserved/claimed (a genuine
   * name/role collision between two legacy no-id records, or a collision
   * with a healthy already-persisted id) does it fall back to
   * mintUniqueId() -- reported as a real migratedFactions/migratedContacts
   * entry either way, with `recoveredLegacyIdentity` marking which
   * happened. New records (through upsertFaction()/upsertFactionContact(),
   * which always supply an id explicitly and never reach this path) are
   * completely unaffected -- this is legacy-read compatibility, not a
   * reintroduction of name-derived identity for anything new.
   */
  static async migrateLegacyIdentities() {
    const raw = safeArray(getSetting());

    const reservedFactionIds = new Set();
    const reservedContactIds = new Set();
    for (const rawFaction of raw) {
      const id = cleanText(rawFaction.id || rawFaction.factionId);
      if (id) reservedFactionIds.add(id);
      for (const rawContact of safeArray(rawFaction.contacts)) {
        const contactId = cleanText(rawContact.id || rawContact.contactId);
        if (contactId) reservedContactIds.add(contactId);
      }
    }

    const claimedFactionIds = new Set();
    const claimedContactIds = new Set();
    const migratedFactions = [];
    const migratedContacts = [];
    const collisions = [];
    let changed = false;

    const next = raw.map(rawFaction => {
      const faction = { ...rawFaction };
      const priorFactionId = cleanText(faction.id || faction.factionId);
      let factionId = priorFactionId;
      if (!factionId) {
        const legacyCandidate = legacyFactionIdCandidate(faction);
        const recoveredLegacyIdentity = !reservedFactionIds.has(legacyCandidate) && !claimedFactionIds.has(legacyCandidate);
        factionId = recoveredLegacyIdentity ? legacyCandidate : mintUniqueId(reservedFactionIds);
        if (recoveredLegacyIdentity) reservedFactionIds.add(factionId);
        migratedFactions.push({ from: '(missing)', to: factionId, name: cleanText(faction.name), recoveredLegacyIdentity });
        if (!recoveredLegacyIdentity) collisions.push({ kind: 'faction', duplicateId: legacyCandidate, reassignedTo: factionId, name: cleanText(faction.name) });
        changed = true;
      } else if (claimedFactionIds.has(factionId)) {
        const newId = mintUniqueId(reservedFactionIds);
        migratedFactions.push({ from: factionId, to: newId, name: cleanText(faction.name), recoveredLegacyIdentity: false });
        collisions.push({ kind: 'faction', duplicateId: factionId, reassignedTo: newId, name: cleanText(faction.name) });
        factionId = newId;
        changed = true;
      }
      faction.id = factionId;
      claimedFactionIds.add(factionId);

      faction.contacts = safeArray(faction.contacts).map(rawContact => {
        const contact = { ...rawContact };
        const priorContactId = cleanText(contact.id || contact.contactId);
        let contactId = priorContactId;
        if (!contactId) {
          const legacyCandidate = legacyContactIdCandidate(contact);
          const recoveredLegacyIdentity = !reservedContactIds.has(legacyCandidate) && !claimedContactIds.has(legacyCandidate);
          contactId = recoveredLegacyIdentity ? legacyCandidate : mintUniqueId(reservedContactIds);
          if (recoveredLegacyIdentity) reservedContactIds.add(contactId);
          migratedContacts.push({ factionId, from: '(missing)', to: contactId, name: cleanText(contact.name), recoveredLegacyIdentity });
          if (!recoveredLegacyIdentity) collisions.push({ kind: 'contact', duplicateId: legacyCandidate, factionId, reassignedTo: contactId, name: cleanText(contact.name) });
          changed = true;
        } else if (claimedContactIds.has(contactId)) {
          const newContactId = mintUniqueId(reservedContactIds);
          migratedContacts.push({ factionId, from: contactId, to: newContactId, name: cleanText(contact.name), recoveredLegacyIdentity: false });
          collisions.push({ kind: 'contact', duplicateId: contactId, factionId, reassignedTo: newContactId, name: cleanText(contact.name) });
          contactId = newContactId;
          changed = true;
        }
        contact.id = contactId;
        claimedContactIds.add(contactId);
        return contact;
      });
      return faction;
    });

    if (!changed) return { changed: false, migratedFactions: [], migratedContacts: [], collisions: [] };

    for (const collision of collisions) {
      SWSELogger.warn?.(
        `[FactionRegistryService] Identity migration found a duplicate persisted ${collision.kind} id "${collision.duplicateId}"`
        + ` (name: "${collision.name}") — the first record with that id keeps it; this later one was reassigned to "${collision.reassignedTo}".`
        + ' Any existing external reference (Job/Intel/Location) that pointed at the duplicated id intending THIS record cannot be'
        + ' automatically disambiguated and may now resolve to the wrong record — review manually if this world has such references.'
      );
    }

    await setSetting(next);
    Hooks.callAll('swseFactionRegistryIdentityMigrated', { migratedFactions, migratedContacts, collisions });
    return { changed: true, migratedFactions, migratedContacts, collisions };
  }

  static findFaction(query = '') {
    const cleanQuery = cleanText(query);
    const needle = cleanQuery.toLowerCase();
    if (!needle) return null;
    // Identity hardening (PRE-8D-4, correction pass round 7): this stays
    // the flexible, name-capable SEARCH helper (see the canonical-mutation
    // resolvers below, which intentionally stay stricter) -- but "flexible"
    // must never mean an EARLIER record's display name can shadow a LATER
    // record's real canonical id. A single combined .find() evaluates
    // every OR-branch per record in array order, so an earlier Faction
    // named e.g. "faction-x" would win over a later Faction whose real id
    // actually IS "faction-x".
    //
    // Identity hardening (PRE-8D-4, correction pass round 8): round 7's
    // own id-pass was ITSELF still one combined `record.id === cleanQuery
    // || record.id.toLowerCase() === needle` predicate -- so an earlier
    // Faction matching only case-insensitively could still shadow a later
    // Faction's real EXACT id (e.g. an earlier "FACTION-X" beating a later
    // "faction-x"). Genuinely three separate passes over the full
    // registry now: exact id always wins outright; legacy
    // case-insensitive id compatibility only when it names exactly ONE
    // Faction (never guessed among 2+ differently-cased ids); name/slug
    // only once no id match won at all.
    //
    // Identity hardening (PRE-8D-4, correction pass round 9): round 8's
    // case-insensitive-id pass fell through to the name/slug pass on
    // EITHER 0 or 2+ matches -- correct for 0 (there is genuinely no id
    // candidate, so trying a name is the right next step), but wrong for
    // 2+: an ambiguous ID-shaped query must refuse outright, the same way
    // every other ambiguity in this file refuses rather than guesses. A
    // display name must never rescue a query that already matched 2+ ids
    // case-insensitively -- that would let a THIRD record's name decide
    // among two ID-shaped candidates it has nothing to do with.
    const records = this.getRegistry();
    const exactById = records.find(record => record.id === cleanQuery);
    if (exactById) return exactById;
    const caseInsensitiveIdMatches = records.filter(record => record.id.toLowerCase() === needle);
    if (caseInsensitiveIdMatches.length === 1) return caseInsensitiveIdMatches[0];
    if (caseInsensitiveIdMatches.length > 1) return null;
    return records.find(record => record.name.toLowerCase() === needle || slugify(record.name) === needle) ?? null;
  }

  /**
   * PUBLIC counterpart to the private mutation resolvers above, for
   * external callers that only ever have a free-text Faction name
   * available (no id widget -- e.g. the Job Board's "save client as
   * reusable contact" field) and want find-existing-or-create-new
   * semantics without risking a silent pick among several same-named
   * Factions. Throws if 2+ Factions already share that exact name -- the
   * caller must let the GM resolve the ambiguity, never have one chosen
   * for them.
   */
  static async resolveOrCreateFactionByName(name = '', createData = {}) {
    const cleanName = cleanText(name);
    if (!cleanName) throw new Error('Faction name is required.');
    const resolution = this._resolveFactionByUniqueName(cleanName);
    if (resolution.ambiguous) {
      throw new Error(`Multiple Factions are named "${cleanName}" — open the Faction editor and pick the intended one, or rename one of them, before continuing.`);
    }
    if (resolution.faction) return resolution.faction;
    return this.upsertFaction({ ...createData, name: cleanName });
  }

  static async upsertFaction(data = {}) {
    const name = cleanText(data.name || data.factionName || data.factionLabel);
    if (!name) throw new Error('Faction name is required.');
    const records = this.getRegistry();
    const requestedId = cleanText(data.id || data.factionId);
    // Identity hardening (PRE-8D-4): canonical sameness is decided by id ONLY.
    // A matching display name never implies "this is the same Faction" --
    // duplicate Faction names are legal and must coexist. Callers that want
    // find-existing-by-name-or-create semantics (e.g. the Job consequence
    // pipeline, which only ever carries a factionName) must resolve that
    // explicitly themselves via findFaction() before calling upsertFaction().
    //
    // Identity hardening (PRE-8D-4, correction pass round 6): this is the
    // authority's own creation/update boundary -- it must not let an
    // unknown supplied id become the id of a newly-created record. A
    // caller-chosen id is only ever a REFERENCE to a record that must
    // already exist ("update exactly this Faction"); it is never
    // permission to mint a new canonical identity. Omitting the id is the
    // only way to create -- the authority always mints that id itself.
    // An audit of every production caller (see PR #969's round-6
    // correction-pass writeup) found no legitimate case that depends on
    // create-with-caller-chosen-id, so this is a hard requirement, not an
    // optional check.
    const existing = requestedId ? records.find(record => record.id === requestedId) ?? null : null;
    if (requestedId && !existing) {
      throw new Error(`No Faction exists with id "${requestedId}" — cannot update a record that does not exist. Omit the id to create a new Faction; the registry mints its id.`);
    }
    // Identity hardening (PRE-8D-4, correction pass round 7): a newly
    // minted Faction id must be structurally collision-safe, not merely
    // "randomId() is astronomically unlikely to repeat" -- the same
    // standard migrateLegacyIdentities() already holds itself to via
    // mintUniqueId(). Reserving every id already in the registry means an
    // unlucky (or, in tests, stubbed) randomID() draw can never silently
    // produce two Factions sharing one canonical id between creation and
    // the next migration sweep.
    const id = existing?.id || mintUniqueId(new Set(records.map(record => record.id).filter(Boolean)));
    const score = normalizeScore(data.score ?? data.startingScore ?? existing?.score ?? 0);
    const source = this._normalizeSource(data.source || existing?.source || 'gm');
    const historyType = existing ? 'faction-updated' : 'faction-created';
    const historyNote = cleanText(data.historyNote || data.notes || '');
    const record = this._normalizeFactionRecord({
      ...existing,
      ...data,
      id,
      name,
      planetSystem: planetSystemFrom(data) || existing?.planetSystem || '',
      score,
      startingScore: normalizeScore(data.startingScore ?? existing?.startingScore ?? score),
      source,
      status: cleanText(data.status || existing?.status || 'active'),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: [
        ...safeArray(existing?.history),
        {
          id: randomId(),
          at: nowIso(),
          type: historyType,
          source,
          note: historyNote
        }
      ].slice(-MAX_HISTORY)
    });
    const next = existing ? records.map(entry => entry.id === existing.id ? record : entry) : [...records, record];
    await this.saveRegistry(next);
    return record;
  }

  static async deleteFaction(factionId) {
    const id = cleanText(factionId);
    if (!id) return false;
    const next = this.getRegistry().filter(record => record.id !== id);
    await this.saveRegistry(next);
    return true;
  }

  static getFactionContacts(factionId = '') {
    const faction = this.findFaction(factionId);
    return faction ? safeArray(faction.contacts).map(contact => normalizeContact(contact)) : [];
  }

  static getAllFactionContacts() {
    return this.getRegistry().flatMap(faction => safeArray(faction.contacts).map(contact => ({
      ...normalizeContact(contact),
      factionId: faction.id,
      factionName: faction.name,
      factionType: faction.type,
      factionImage: faction.image || faction.sigil || '',
      factionScore: faction.score
    })));
  }

  static findFactionContact(factionId = '', contactId = '') {
    const faction = this.findFaction(factionId);
    const cleanContactId = cleanText(contactId);
    const needle = cleanContactId.toLowerCase();
    if (!faction || !needle) return null;
    // Identity hardening (PRE-8D-4, correction pass round 7): same
    // id-always-outranks-name precedence as findFaction() above, applied
    // to this Faction's Contacts.
    //
    // Identity hardening (PRE-8D-4, correction pass round 8): same
    // genuinely-three-pass fix as findFaction() above -- exact id always
    // wins outright; legacy case-insensitive id compatibility only when
    // unique; name only once no id match won at all.
    //
    // Identity hardening (PRE-8D-4, correction pass round 9): same fix as
    // findFaction() above -- 2+ case-insensitive id matches must refuse
    // outright (ambiguous), never fall through to a name match.
    const contacts = safeArray(faction.contacts).map(entry => normalizeContact(entry));
    const exactById = contacts.find(entry => entry.id === cleanContactId);
    let contact = exactById;
    let idAmbiguous = false;
    if (!contact) {
      const caseInsensitiveIdMatches = contacts.filter(entry => entry.id.toLowerCase() === needle);
      if (caseInsensitiveIdMatches.length === 1) contact = caseInsensitiveIdMatches[0];
      else if (caseInsensitiveIdMatches.length > 1) idAmbiguous = true;
    }
    if (!contact && !idAmbiguous) contact = contacts.find(entry => entry.name.toLowerCase() === needle);
    return contact ? { faction, contact } : null;
  }

  /**
   * CORRECTION PASS (independent review of PR #969): resolves an existing
   * Faction for a CANONICAL MUTATION path -- never a search. findFaction()
   * stays the flexible, name-capable SEARCH helper for read/display use
   * (§4); every canonical mutator below resolves through one of the four
   * methods here instead, so "which Faction does this refer to" is never
   * decided by silently picking the first of several same-named matches
   * now that duplicate Faction names are explicitly legal.
   *
   * _resolveFactionForMutation(id, name) is the STRICT form for callers
   * that carry a genuinely separate id field and name field (they may both
   * be populated with unrelated values, e.g. a stale id alongside a fresh
   * name during an edit): a non-empty id is authoritative and is never
   * abandoned in favor of the name, matched or not. Only when no id at all
   * is supplied does the name get tried -- and only honored when it names
   * EXACTLY ONE canonical Faction; two or more is ambiguous.
   *
   * _resolveFactionByIdOrUniqueName(idOrName) is the PERMISSIVE form for
   * the handful of callers that only ever have ONE combined string (the
   * existing `factionId || factionName` pattern already used at several UI
   * call sites, which is itself already "real id if we had one, else the
   * name as a last resort" -- never a case where a real id was present but
   * wrong). It tries the string as an exact id first, then as a name.
   *
   * Both return { faction, ambiguous }. ambiguous=true means 2+ candidates
   * were found by name and none was picked -- never guess.
   */
  static _resolveFactionByUniqueName(name = '') {
    const cleanName = cleanText(name);
    if (!cleanName) return { faction: null, ambiguous: false };
    const matches = this.getRegistry().filter(record => record.name.toLowerCase() === cleanName.toLowerCase());
    if (matches.length === 1) return { faction: matches[0], ambiguous: false };
    if (matches.length > 1) return { faction: null, ambiguous: true };
    return { faction: null, ambiguous: false };
  }

  static _resolveFactionForMutation(id = '', name = '') {
    const cleanId = cleanText(id);
    if (cleanId) {
      const byId = this.getRegistry().find(record => record.id === cleanId);
      return { faction: byId ?? null, ambiguous: false };
    }
    return this._resolveFactionByUniqueName(name);
  }

  static _resolveFactionByIdOrUniqueName(idOrName = '') {
    const query = cleanText(idOrName);
    if (!query) return { faction: null, ambiguous: false };
    const byId = this.getRegistry().find(record => record.id === query);
    if (byId) return { faction: byId, ambiguous: false };
    return this._resolveFactionByUniqueName(query);
  }

  /** Same PERMISSIVE (id-or-unique-name) policy, scoped to one Faction's Contacts. */
  static _resolveFactionContactByIdOrUniqueName(faction, idOrName = '') {
    const query = cleanText(idOrName);
    if (!faction || !query) return { contact: null, ambiguous: false };
    const contacts = safeArray(faction.contacts).map(entry => normalizeContact(entry));
    const byId = contacts.find(contact => contact.id === query);
    if (byId) return { contact: byId, ambiguous: false };
    const nameMatches = contacts.filter(contact => contact.name.toLowerCase() === query.toLowerCase());
    if (nameMatches.length === 1) return { contact: nameMatches[0], ambiguous: false };
    if (nameMatches.length > 1) return { contact: null, ambiguous: true };
    return { contact: null, ambiguous: false };
  }

  /**
   * CORRECTION PASS round 2 (independent re-review): PUBLIC counterparts to
   * the two PERMISSIVE private resolvers above, for external callers that
   * need to safely resolve a Faction/Contact by id-or-unique-name to feed a
   * SUBSEQUENT mutation (not merely to display something) -- e.g. "read this
   * Contact's current data so I can toggle its revealState," or "resolve
   * which Contact an Intel record should link back to." Using the flexible
   * findFaction()/findFactionContact() SEARCH helpers for that purpose was
   * exactly the bug this whole phase exists to close, one layer removed:
   * reading the WRONG same-named record's data is just as unsafe as
   * mutating it directly by the wrong id. Never guesses among duplicates.
   */
  static resolveFactionForMutation(factionIdOrName = '') {
    return this._resolveFactionByIdOrUniqueName(factionIdOrName);
  }

  static resolveFactionContactForMutation(factionIdOrName = '', contactIdOrName = '') {
    const factionResolution = this._resolveFactionByIdOrUniqueName(factionIdOrName);
    if (factionResolution.ambiguous) return { faction: null, contact: null, ambiguous: true, ambiguousKind: 'faction' };
    const faction = factionResolution.faction;
    if (!faction) return { faction: null, contact: null, ambiguous: false };
    const contactResolution = this._resolveFactionContactByIdOrUniqueName(faction, contactIdOrName);
    if (contactResolution.ambiguous) return { faction, contact: null, ambiguous: true, ambiguousKind: 'contact' };
    return { faction, contact: contactResolution.contact, ambiguous: false };
  }

  /**
   * CORRECTION PASS round 4 (independent re-re-re-re-review): EXACT-ID-ONLY
   * counterparts to the PERMISSIVE resolvers directly above, for callers
   * that already hold a genuinely canonical id (not a combined id-or-name
   * input string) and must never let a stale/unresolvable id be silently
   * "rescued" by a same-named record. resolveFactionForMutation()/
   * resolveFactionContactForMutation() are id-or-unique-name COMPATIBILITY
   * resolvers for the handful of legacy/free-text callers that genuinely
   * only ever have one combined string -- they are intentionally NOT
   * canonical-id validators, and remain permissive for those callers.
   * These two methods never fall back to a display-name match under any
   * circumstance: a non-matching id means "not found," full stop, even if
   * some other record's NAME happens to equal the queried id string.
   */
  static resolveFactionByIdForMutation(factionId = '') {
    const cleanId = cleanText(factionId);
    if (!cleanId) return null;
    return this.getRegistry().find(record => record.id === cleanId) ?? null;
  }

  static resolveFactionContactByIdsForMutation(factionId = '', contactId = '') {
    const faction = this.resolveFactionByIdForMutation(factionId);
    const cleanContactId = cleanText(contactId);
    if (!faction || !cleanContactId) return { faction: faction ?? null, contact: null };
    const contact = safeArray(faction.contacts)
      .map(entry => normalizeContact(entry))
      .find(entry => entry.id === cleanContactId) ?? null;
    return { faction, contact };
  }

  static async upsertFactionContact(factionId = '', data = {}) {
    const factionIdQuery = factionId || data.factionId;
    const resolution = this._resolveFactionForMutation(factionIdQuery, data.factionName);
    if (resolution.ambiguous) throw new Error(`Multiple Factions are named "${cleanText(data.factionName)}" — specify a Faction id.`);
    const faction = resolution.faction;
    if (!faction) throw new Error('Faction is required to save a notable NPC/contact.');
    const existingContacts = safeArray(faction.contacts).map(contact => normalizeContact(contact));
    const requestedId = cleanText(data.id || data.contactId);
    const name = cleanText(data.name || data.contactName);
    if (!name) throw new Error('Contact name is required.');
    // Identity hardening (PRE-8D-4): match an existing Contact by id ONLY.
    // Two Contacts on the same Faction with the same name+role are legal and
    // must remain distinct records -- a matching name never implies reuse.
    //
    // Identity hardening (PRE-8D-4, correction pass round 6): same
    // creation/update boundary as upsertFaction() above -- a caller-chosen
    // id may only reference an existing Contact, never mint a new one.
    // Omitting the id is the only way to create; the authority mints it.
    const existing = requestedId ? existingContacts.find(contact => contact.id === requestedId) ?? null : null;
    if (requestedId && !existing) {
      throw new Error(`No Contact exists with id "${requestedId}" on ${faction.name} — cannot update a record that does not exist. Omit the id to create a new Contact; the registry mints its id.`);
    }
    // Identity hardening (PRE-8D-4, correction pass round 7): same
    // structural collision-safety as upsertFaction() above, but reserved
    // registry-GLOBALLY -- migrateLegacyIdentities() already established
    // Contact ids as one pool across every Faction, not per-Faction, so a
    // newly minted Contact id must never collide with a Contact on ANY
    // Faction, not merely this one.
    const reservedContactIds = new Set(
      this.getRegistry().flatMap(record => safeArray(record.contacts).map(entry => entry?.id).filter(Boolean))
    );
    const contact = normalizeContact({
      ...existing,
      ...data,
      id: existing?.id || mintUniqueId(reservedContactIds),
      name,
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso()
    });
    const contacts = existing
      ? existingContacts.map(entry => entry.id === existing.id ? contact : entry)
      : [...existingContacts, contact];
    const records = this.getRegistry();
    const next = records.map(record => record.id === faction.id ? this._normalizeFactionRecord({ ...record, contacts, updatedAt: nowIso() }) : record);
    await this.saveRegistry(next);
    return { faction: this.findFaction(faction.id), contact };
  }

  static async deleteFactionContact(factionId = '', contactId = '') {
    const resolution = this._resolveFactionByIdOrUniqueName(factionId);
    if (resolution.ambiguous) throw new Error(`Multiple Factions are named "${cleanText(factionId)}" — specify a Faction id.`);
    const faction = resolution.faction;
    const id = cleanText(contactId);
    if (!faction || !id) return false;
    const contacts = safeArray(faction.contacts).map(contact => normalizeContact(contact)).filter(contact => contact.id !== id);
    const records = this.getRegistry();
    const next = records.map(record => record.id === faction.id ? this._normalizeFactionRecord({ ...record, contacts, updatedAt: nowIso() }) : record);
    await this.saveRegistry(next);
    return true;
  }

  static async promoteFactionContactToActor(factionId = '', contactId = '') {
    const factionResolution = this._resolveFactionByIdOrUniqueName(factionId);
    if (factionResolution.ambiguous) throw new Error(`Multiple Factions are named "${cleanText(factionId)}" — specify a Faction id.`);
    const faction = factionResolution.faction;
    if (!faction) throw new Error('Faction contact could not be found.');
    const contactResolution = this._resolveFactionContactByIdOrUniqueName(faction, contactId);
    if (contactResolution.ambiguous) throw new Error(`Multiple Contacts named "${cleanText(contactId)}" exist on ${faction.name} — specify a Contact id.`);
    const contact = contactResolution.contact;
    if (!contact) throw new Error('Faction contact could not be found.');

    const existingActor = await resolveActorReference({ uuid: contact.actorUuid, actorId: contact.actorId });
    if (existingActor) {
      await this.upsertFactionContact(faction.id, {
        ...contact,
        actorId: existingActor.id,
        actorUuid: actorUuid(existingActor),
        actorName: existingActor.name,
        promotedAt: contact.promotedAt || nowIso()
      });
      return { faction: this.findFaction(faction.id), contact: this.findFactionContact(faction.id, contact.id)?.contact, actor: existingActor, created: false };
    }

    if (!game.user?.isGM) throw new Error('Only a GM can promote a faction contact to an actor.');
    const actorData = {
      name: contact.name,
      type: 'npc',
      img: contact.image || faction.image || 'icons/svg/mystery-man.svg',
      flags: {
        [MODULE_ID]: {
          factionContact: {
            factionId: faction.id,
            factionName: faction.name,
            contactId: contact.id,
            contactName: contact.name,
            contactRole: contact.role,
            contactTitle: contact.title,
            contactDisposition: contact.disposition,
            contactRevealState: contact.revealState,
            contactKnownToPlayers: contact.knownToPlayers,
            contactFactionRank: contact.factionRank,
            contactLastKnownLocation: contact.lastKnownLocation,
            source: 'faction-registry',
            promotedAt: nowIso()
          }
        }
      }
    };
    const actor = await Actor.create(actorData, { renderSheet: false });
    try {
      await this.upsertFactionContact(faction.id, {
        ...contact,
        actorId: actor.id,
        actorUuid: actorUuid(actor),
        actorName: actor.name,
        promotedAt: nowIso()
      });
    } catch (linkErr) {
      // The actor was created but linking it back to the faction contact failed.
      // Delete the orphan so a later promotion does not create a duplicate.
      try { await actor.delete?.(); } catch (_deleteErr) {}
      return { faction: this.findFaction(faction.id), contact: undefined, created: false, error: `Failed to link contact actor: ${linkErr?.message ?? 'unknown error'}` };
    }
    return { faction: this.findFaction(faction.id), contact: this.findFactionContact(faction.id, contact.id)?.contact, actor, created: true };
  }

  static getActorRelationships(actor) {
    if (!actor) return [];
    const records = safeArray(actor.getFlag?.(MODULE_ID, ACTOR_RELATIONSHIPS_FLAG));
    return records.map(record => this._normalizeActorRelationship(record));
  }

  static getLegacyFactionRecords(actor) {
    if (!actor) return [];
    return safeArray(actor.getFlag?.(MODULE_ID, LEGACY_FACTIONS_FLAG));
  }

  static async saveActorRelationships(actor, relationships = []) {
    if (!actor?.setFlag) throw new Error('Actor relationship update requires a valid actor.');
    const normalized = safeArray(relationships).map(record => this._normalizeActorRelationship(record));
    await actor.setFlag(MODULE_ID, ACTOR_RELATIONSHIPS_FLAG, normalized);
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: normalized });
    return normalized;
  }

  static async addActorRelationship({ actor, faction = null, factionId = '', factionName = '', relationshipType = 'known', score = 0, benefits = '', notes = '', gmNotes = '', source = 'gm', status = 'active', history = [] } = {}) {
    if (!actor) throw new Error('Actor is required to add a faction relationship.');
    let factionRecord = faction;
    if (!factionRecord) {
      // Identity hardening (PRE-8D-4, correction pass): a stable factionId,
      // when supplied, is authoritative -- never abandoned for a name match.
      // Only when no id at all is given does the name get tried, and only
      // when it is unambiguous (§ _resolveFactionForMutation doc comment).
      const cleanFactionId = cleanText(factionId);
      const resolution = this._resolveFactionForMutation(cleanFactionId, factionName);
      if (resolution.ambiguous) throw new Error(`Multiple Factions are named "${cleanText(factionName)}" — specify a Faction id.`);
      // Identity hardening (PRE-8D-4, correction pass round 6): an explicit
      // factionId that fails to resolve must FAIL, never silently
      // materialize a new Faction under that stale/fabricated id --
      // upsertFaction() itself now refuses create-with-caller-chosen-id
      // for exactly this reason. Only a purely name-only call (no id ever
      // supplied) may create, and does so with no id so the registry mints
      // one.
      if (cleanFactionId && !resolution.faction) {
        throw new Error(`No Faction exists with id "${cleanFactionId}" — cannot add a relationship to a Faction that does not exist.`);
      }
      factionRecord = resolution.faction || await this.upsertFaction({ name: factionName, source });
    }
    const relationships = this.getActorRelationships(actor);
    // Match this Actor's existing relationship row by factionId ONLY --
    // factionRecord.id is always a real, specific, already-disambiguated
    // canonical id by this point, so a name-equality fallback here could
    // only ever update the WRONG same-named Faction's relationship row.
    const existing = relationships.find(entry => entry.factionId === factionRecord.id);
    const nextScore = normalizeScore(score ?? existing?.score ?? factionRecord.score ?? 0);
    const record = this._normalizeActorRelationship({
      ...existing,
      id: existing?.id || randomId(),
      factionId: factionRecord.id,
      factionName: factionRecord.name,
      type: cleanText(factionRecord.type || existing?.type || 'Faction'),
      planetSystem: cleanText(factionRecord.planetSystem || existing?.planetSystem || ''),
      scale: clampScale(factionRecord.scale ?? existing?.scale ?? 1),
      leader: cleanText(factionRecord.leader || existing?.leader || ''),
      relationshipType: this._normalizeRelationshipType(relationshipType || existing?.relationshipType || 'known'),
      score: nextScore,
      benefits: cleanText(benefits || existing?.benefits || factionRecord.benefits || ''),
      notes: cleanText(notes || existing?.notes || ''),
      gmNotes: cleanText(gmNotes || existing?.gmNotes || factionRecord.gmNotes || ''),
      source: this._normalizeSource(source || existing?.source || factionRecord.source || 'gm'),
      status: cleanText(status || existing?.status || 'active'),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: safeArray(history).length ? safeArray(history).slice(-MAX_HISTORY) : safeArray(existing?.history).slice(-MAX_HISTORY)
    });
    const next = existing ? relationships.map(entry => entry.id === existing.id ? record : entry) : [...relationships, record];
    await this.saveActorRelationships(actor, next);
    return record;
  }

  static async updateActorRelationship(actor, relationshipId, data = {}) {
    if (!actor || !relationshipId) return null;
    const relationships = this.getActorRelationships(actor);
    const existing = relationships.find(entry => entry.id === relationshipId || entry.factionId === relationshipId);
    if (!existing) return this.addActorRelationship({ actor, ...data, factionId: data.factionId || relationshipId });
    const targetFactionId = cleanText(data.factionId || existing.factionId);
    const resolution = this._resolveFactionForMutation(targetFactionId, data.factionName || existing.factionName);
    if (resolution.ambiguous) throw new Error(`Multiple Factions are named "${cleanText(data.factionName || existing.factionName)}" — specify a Faction id.`);
    // Identity hardening (PRE-8D-4, correction pass round 6): a resolved
    // relationship's factionId is a real, already-existing Faction by
    // construction (addActorRelationship() only ever stores factionRecord.id) --
    // if it no longer resolves (the Faction was deleted), this must fail
    // rather than silently resurrect a Faction under that stale id.
    if (targetFactionId && !resolution.faction) {
      throw new Error(`No Faction exists with id "${targetFactionId}" — cannot update this Actor relationship to reference a Faction that does not exist.`);
    }
    const faction = resolution.faction
      || await this.upsertFaction({ name: data.factionName || existing.factionName, source: data.source || existing.source || 'gm' });
    const updated = this._normalizeActorRelationship({
      ...existing,
      ...data,
      id: existing.id,
      factionId: faction.id,
      factionName: faction.name,
      type: data.type ?? faction.type ?? existing.type,
      planetSystem: planetSystemFrom(data) || faction.planetSystem || existing.planetSystem,
      scale: data.scale ?? faction.scale ?? existing.scale,
      leader: data.leader ?? faction.leader ?? existing.leader,
      updatedAt: nowIso(),
      history: safeArray(existing.history).slice(-MAX_HISTORY)
    });
    const next = relationships.map(entry => entry.id === existing.id ? updated : entry);
    await this.saveActorRelationships(actor, next);
    return updated;
  }

  static async removeActorRelationship(actor, relationshipId) {
    if (!actor || !relationshipId) return false;
    const relationships = this.getActorRelationships(actor);
    const next = relationships.filter(entry => entry.id !== relationshipId && entry.factionId !== relationshipId);
    await this.saveActorRelationships(actor, next);
    return true;
  }

  static async applyScoreDelta({ actorId = '', actor = null, factionName = '', factionId = '', delta = 0, source = 'job', jobId = '', reason = '', relationshipType = 'known', metadata = {} } = {}) {
    const targetActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    if (!targetActor) return null;
    const value = normalizeScore(delta);
    const factionLabel = cleanText(factionName || factionId);
    if (!factionLabel || !value) return null;
    // Identity hardening (PRE-8D-4, correction pass): fail SOFT (return
    // null + log) rather than throw on an ambiguous same-named Faction --
    // this runs in a per-actor loop from applyJobFactionDelta(), and a
    // thrown error here would abort every OTHER actor's unrelated update
    // in the same batch. A stable factionId, when supplied, is still
    // authoritative and never abandoned for a name match.
    const cleanFactionId = cleanText(factionId);
    const resolution = this._resolveFactionForMutation(cleanFactionId, factionName);
    if (resolution.ambiguous) {
      SWSELogger.warn?.(`[FactionRegistryService] applyScoreDelta: "${factionLabel}" is ambiguous (multiple Factions share that name) — refusing to guess which one. Supply a Faction id.`);
      return null;
    }
    // Identity hardening (PRE-8D-4, correction pass round 6): consistent
    // with this method's existing batch-safe fail-SOFT contract -- an
    // explicit factionId that fails to resolve must not fabricate a new
    // Faction under that stale id. Only the frozen name-only Job-
    // consequence compatibility case (no factionId at all) may create,
    // and does so with no id so the registry mints one.
    if (cleanFactionId && !resolution.faction) {
      SWSELogger.warn?.(`[FactionRegistryService] applyScoreDelta: no Faction exists with id "${cleanFactionId}" — refusing to fabricate a new Faction under a stale/unknown id.`);
      return null;
    }
    const existingFaction = resolution.faction;
    const faction = existingFaction || await this.upsertFaction({ name: factionLabel, source, historyNote: reason });
    const relationships = this.getActorRelationships(targetActor);
    const existing = relationships.find(entry => entry.factionId === faction.id);
    const before = normalizeScore(existing?.score ?? faction.startingScore ?? faction.score ?? 0);
    const after = before + value;
    const historyEntry = {
      id: randomId(),
      at: nowIso(),
      type: 'score-delta',
      source,
      jobId,
      delta: value,
      before,
      after,
      reason: cleanText(reason)
    };
    const relationship = await this.addActorRelationship({
      actor: targetActor,
      faction,
      relationshipType: existing?.relationshipType || relationshipType || 'known',
      score: after,
      source,
      status: 'active',
      benefits: existing?.benefits || faction.benefits || '',
      notes: existing?.notes || '',
      gmNotes: existing?.gmNotes || faction.gmNotes || '',
      history: [...safeArray(existing?.history), historyEntry].slice(-MAX_HISTORY)
    });
    const payload = {
      actorId: targetActor.id,
      actorName: targetActor.name,
      factionId: faction.id,
      factionName: faction.name,
      delta: value,
      before,
      after,
      source,
      jobId,
      reason: cleanText(reason),
      relationship,
      metadata: { ...metadata, autoCreatedFaction: !existingFaction }
    };
    Hooks.callAll('swseFactionScoreChanged', payload);
    Hooks.callAll('swse:factionScoreChanged', payload);
    return payload;
  }

  static async applyJobConsequences({ thread, status = '', requesterId = null } = {}) {
    const job = thread?.metadata?.job ?? null;
    if (!job) return [];
    const consequences = job.factionConsequences || job.relationshipConsequences || {};
    const factionName = cleanText(consequences.factionName || job.client?.factionName || job.client?.name || '');
    if (!factionName) return [];
    const normalizedStatus = cleanText(status || job.status);
    const delta = normalizedStatus === 'failed'
      ? normalizeScore(consequences.failureDelta)
      : normalizedStatus === 'complete'
        ? normalizeScore(consequences.successDelta)
        : 0;
    if (!delta) return [];
    const reason = cleanText(consequences.notes || `Job ${normalizedStatus}: ${job.title || thread?.title || 'Holonet Job'}`);
    return this.applyJobFactionDelta({
      thread,
      factionName,
      delta,
      source: 'job',
      reason,
      requesterId,
      status: normalizedStatus,
      metadata: { status: normalizedStatus }
    });
  }

  static async applyJobFactionDelta({ thread, factionName = '', delta = 0, source = 'job', reason = '', requesterId = null, status = '', metadata = {} } = {}) {
    const factionLabel = cleanText(factionName);
    const value = normalizeScore(delta);
    if (!thread || !factionLabel || !value) return [];
    const actorRows = safeArray(thread.participants)
      .filter(recipient => !String(recipient?.id || '').startsWith('gm:'))
      .filter(recipient => recipient?.actorId)
      .map(recipient => game.actors?.get?.(recipient.actorId))
      .filter(Boolean);
    const uniqueActors = Array.from(new Map(actorRows.map(actor => [actor.id, actor])).values());
    const results = [];
    for (const actor of uniqueActors) {
      const result = await this.applyScoreDelta({
        actor,
        factionName: factionLabel,
        delta: value,
        source,
        jobId: thread.id,
        reason,
        relationshipType: 'known',
        metadata: { threadId: thread.id, requesterId, status, ...metadata }
      });
      if (result) results.push(result);
    }
    return results;
  }

  static async suggestFaction(actor, data = {}) {
    if (!actor) return null;
    const records = this.getLegacyFactionRecords(actor);
    const existing = records.find(entry => entry.id === data.id) || null;
    const record = {
      ...existing,
      id: existing?.id || data.id || `suggested-${randomId()}`,
      factionId: cleanText(data.factionId || existing?.factionId || ''),
      name: cleanText(data.name || data.factionName || existing?.name || 'Suggested Faction'),
      type: cleanText(data.type || existing?.type || 'Faction'),
      planet: cleanText(data.planet || existing?.planet || ''),
      system: cleanText(data.system || existing?.system || ''),
      scale: cleanText(data.scale || existing?.scale || ''),
      leader: cleanText(data.leader || existing?.leader || ''),
      relationshipType: this._normalizeRelationshipType(data.relationshipType || existing?.relationshipType || 'known'),
      benefits: cleanText(existing?.benefits || ''),
      notes: cleanText(data.notes || existing?.notes || data.benefits || ''),
      gmNotes: cleanText(existing?.gmNotes || ''),
      source: 'player-suggested',
      status: 'pending_approval',
      score: normalizeScore(existing?.score ?? 0),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: safeArray(existing?.history).slice(-MAX_HISTORY)
    };
    const next = existing ? records.map(entry => entry.id === existing.id ? record : entry) : [...records, record];
    await actor.setFlag(MODULE_ID, LEGACY_FACTIONS_FLAG, next);
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: this.getActorRelationships(actor), suggestion: record });
    return record;
  }

  static getPendingSuggestions() {
    const rows = [];
    for (const actor of game.actors ?? []) {
      const records = this.getLegacyFactionRecords(actor)
        .filter(record => APPROVAL_STATUSES.has(cleanText(record.status).toLowerCase()));
      for (const record of records) {
        rows.push({ actor, actorId: actor.id, actorName: actorLabel(actor), record: this._normalizeSuggestion(record) });
      }
    }
    return rows.sort((a, b) => a.actorName.localeCompare(b.actorName) || a.record.name.localeCompare(b.record.name));
  }

  static async approveSuggestedFaction({ actorId = '', factionRecordId = '', data = {} } = {}) {
    const actor = actorId ? game.actors?.get?.(actorId) : null;
    if (!actor) return null;
    const records = this.getLegacyFactionRecords(actor);
    const suggestion = records.find(entry => entry.id === factionRecordId || entry.factionId === factionRecordId);
    if (!suggestion) return null;
    const merged = { ...suggestion, ...data };
    // Identity hardening (PRE-8D-4): resolve an existing Faction by id-or-
    // unambiguous-name explicitly at this call site (same pattern as
    // addActorRelationship/applyScoreDelta) so approving a player
    // suggestion keeps attaching to an already-known Faction of the same
    // name, exactly as before -- without relying on upsertFaction()'s
    // shared contract to infer that silently for every caller.
    //
    // CORRECTION PASS (independent review): a name match is only honored
    // when it names EXACTLY ONE canonical Faction. Two or more same-named
    // Factions is ambiguous -- the GM approving this suggestion never had
    // a chance to pick which one, so this now fails loudly (rather than
    // silently attaching to whichever one findFaction() happened to
    // return first) and asks the GM to disambiguate before approving.
    const cleanSuggestionFactionId = cleanText(merged.factionId);
    const resolution = this._resolveFactionForMutation(cleanSuggestionFactionId, merged.name || merged.factionName);
    if (resolution.ambiguous) {
      throw new Error(`Multiple Factions are named "${cleanText(merged.name || merged.factionName)}" — resolve which one this suggestion refers to (e.g. from the Faction editor) before approving.`);
    }
    // Identity hardening (PRE-8D-4, correction pass round 6): a stale
    // factionId carried by the suggestion (or supplied in GM edit data)
    // must never become a new canonical Faction's id. Audited: no
    // production caller of suggestFaction()/approveSuggestedFaction() ever
    // sets a factionId that isn't already a real Faction's id, so this is
    // a hard failure, not a soft fallback.
    if (cleanSuggestionFactionId && !resolution.faction) {
      throw new Error(`No Faction exists with id "${cleanSuggestionFactionId}" — this suggestion's Faction reference is stale. Resolve it from the Faction editor before approving.`);
    }
    const faction = await this.upsertFaction({
      id: resolution.faction?.id || '',
      name: merged.name || merged.factionName,
      type: merged.type,
      planetSystem: planetSystemFrom(merged),
      scale: merged.scale,
      leader: merged.leader,
      benefits: merged.benefits,
      notes: merged.notes,
      gmNotes: merged.gmNotes,
      source: 'player-suggested',
      status: 'active',
      historyNote: `Approved player faction suggestion for ${actorLabel(actor)}.`
    });
    const relationship = await this.addActorRelationship({
      actor,
      faction,
      relationshipType: merged.relationshipType || 'known',
      score: merged.score ?? 0,
      benefits: merged.benefits || faction.benefits,
      notes: merged.notes,
      gmNotes: merged.gmNotes,
      source: 'player-suggested',
      status: 'active',
      history: [
        ...safeArray(merged.history),
        { id: randomId(), at: nowIso(), type: 'suggestion-approved', source: 'gm', reason: cleanText(merged.approvalNote || '') }
      ].slice(-MAX_HISTORY)
    });
    await actor.setFlag(MODULE_ID, LEGACY_FACTIONS_FLAG, records.filter(entry => entry.id !== suggestion.id));
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: this.getActorRelationships(actor), approvedSuggestion: suggestion });
    return relationship;
  }

  static async rejectSuggestedFaction({ actorId = '', factionRecordId = '', reason = '' } = {}) {
    const actor = actorId ? game.actors?.get?.(actorId) : null;
    if (!actor) return null;
    const records = this.getLegacyFactionRecords(actor);
    const suggestion = records.find(entry => entry.id === factionRecordId || entry.factionId === factionRecordId);
    if (!suggestion) return null;
    const rejected = {
      ...suggestion,
      status: 'rejected',
      gmNotes: cleanText(reason || suggestion.gmNotes || ''),
      updatedAt: nowIso(),
      history: [
        ...safeArray(suggestion.history),
        { id: randomId(), at: nowIso(), type: 'suggestion-rejected', source: 'gm', reason: cleanText(reason) }
      ].slice(-MAX_HISTORY)
    };
    await actor.setFlag(MODULE_ID, LEGACY_FACTIONS_FLAG, records.map(entry => entry.id === suggestion.id ? rejected : entry));
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: this.getActorRelationships(actor), rejectedSuggestion: rejected });
    return rejected;
  }

  static getAllActorRelationshipRows() {
    const registryById = new Map(this.getRegistry().map(record => [record.id, record]));
    const rows = [];
    for (const actor of game.actors ?? []) {
      for (const relationship of this.getActorRelationships(actor)) {
        const faction = registryById.get(relationship.factionId) || null;
        rows.push(this._relationshipRow(actor, relationship, faction, false));
      }
      for (const legacy of this.getLegacyFactionRecords(actor)) {
        const normalized = this._normalizeSuggestion(legacy);
        if (!APPROVAL_STATUSES.has(normalized.status) && normalized.status !== 'rejected') continue;
        rows.push(this._relationshipRow(actor, normalized, registryById.get(normalized.factionId) || null, true));
      }
    }
    return rows.sort((a, b) => a.actorName.localeCompare(b.actorName) || a.factionName.localeCompare(b.factionName));
  }

  static summarizeForWorkspace() {
    const factions = this.getRegistry();
    return {
      count: factions.length,
      factions: factions.map(record => ({
        ...record,
        sourceLabel: labelFor(SOURCE_TYPES, record.source),
        scaleLabel: `Scale ${record.scale}`,
        scoreLabel: scoreLabel(record.score)
      })).sort((a, b) => a.name.localeCompare(b.name)),
      relationshipCount: this.getAllActorRelationshipRows().filter(row => !row.isSuggestion).length,
      pendingSuggestionCount: this.getPendingSuggestions().length
    };
  }

  static _relationshipRow(actor, relationship, faction = null, isSuggestion = false) {
    const score = normalizeScore(relationship.score ?? faction?.score ?? 0);
    const planetSystem = relationship.planetSystem || faction?.planetSystem || planetSystemFrom(relationship);
    const location = parsePlanetSystem(planetSystem);
    return {
      id: relationship.id,
      actorId: actor.id,
      actorName: actorLabel(actor),
      actorImg: actor.img || actor.prototypeToken?.texture?.src || 'icons/svg/mystery-man.svg',
      factionId: relationship.factionId || faction?.id || slugify(relationship.factionName || relationship.name),
      factionName: relationship.factionName || relationship.name || faction?.name || 'Unnamed Faction',
      type: relationship.type || faction?.type || 'Faction',
      planet: location.planet,
      system: location.system,
      planetSystem,
      scale: relationship.scale ?? faction?.scale ?? 1,
      leader: relationship.leader || faction?.leader || '',
      relationshipType: this._normalizeRelationshipType(relationship.relationshipType || 'known'),
      relationshipTypeLabel: labelFor(RELATIONSHIP_TYPES, this._normalizeRelationshipType(relationship.relationshipType || 'known')),
      score,
      scoreLabel: scoreLabel(score),
      benefits: relationship.benefits || faction?.benefits || '',
      notes: relationship.notes || '',
      gmNotes: relationship.gmNotes || faction?.gmNotes || '',
      source: this._normalizeSource(relationship.source || faction?.source || 'gm'),
      sourceLabel: labelFor(SOURCE_TYPES, this._normalizeSource(relationship.source || faction?.source || 'gm')),
      status: cleanText(relationship.status || 'active'),
      statusLabel: APPROVAL_STATUSES.has(cleanText(relationship.status).toLowerCase()) ? 'Pending Approval' : cleanText(relationship.status || 'active'),
      isSuggestion,
      isPending: APPROVAL_STATUSES.has(cleanText(relationship.status).toLowerCase()),
      isRejected: cleanText(relationship.status).toLowerCase() === 'rejected',
      history: safeArray(relationship.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeFactionRecord(record = {}) {
    const name = cleanText(record.name || record.factionName || 'Unnamed Faction');
    const source = this._normalizeSource(record.source || 'gm');
    const score = normalizeScore(record.score ?? record.startingScore ?? 0);
    return {
      // Identity hardening (PRE-8D-4): a NEW Faction (created through
      // upsertFaction(), which always supplies an id explicitly before
      // calling this function) never derives its id from name; it always
      // gets a fresh randomId() there instead. This fallback only ever
      // fires for a RAW, never-yet-migrated legacy Faction record read
      // directly off disk (id genuinely absent in storage) -- for that
      // case ONLY, recompute the exact legacy formula pre-hardening code
      // used (slugify(name)), so an external reference that already
      // captured this record's old effective id keeps resolving. Two
      // distinct legacy records that both lack an id and share a name
      // still can't collapse onto the same id long-term:
      // migrateLegacyIdentities() (below) detects that exact collision at
      // persist time and disambiguates it once, permanently
      // (CORRECTION PASS round 2).
      id: cleanText(record.id || record.factionId) || slugify(name),
      name,
      type: cleanText(record.type || record.kind || 'Faction'),
      planetSystem: planetSystemFrom(record),
      scale: clampScale(record.scale ?? 1),
      leader: cleanText(record.leader || ''),
      startingScore: normalizeScore(record.startingScore ?? score),
      score,
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || ''),
      gmNotes: cleanText(record.gmNotes || ''),
      image: cleanText(record.image || record.img || record.imageUrl || record.sigil || ''),
      jobDefaults: normalizeJobDefaults(record, {
        defaultJobTone: record.defaultJobTone,
        defaultRewardStyle: record.defaultRewardStyle,
        defaultObjective: record.defaultObjective,
        defaultBriefing: record.defaultBriefing,
        defaultInstructions: record.defaultInstructions,
        defaultCredits: record.defaultCredits,
        defaultXp: record.defaultXp,
        defaultSuccessDelta: record.defaultSuccessDelta,
        defaultFailureDelta: record.defaultFailureDelta,
        defaultVisibility: record.defaultVisibility,
        defaultLegality: record.defaultLegality,
        defaultPayStyle: record.defaultPayStyle,
        defaultRivalFactionName: record.defaultRivalFactionName,
        defaultRivalSuccessDelta: record.defaultRivalSuccessDelta,
        defaultRivalFailureDelta: record.defaultRivalFailureDelta,
        defaultConsequenceNotes: record.defaultConsequenceNotes
      }),
      contacts: safeArray(record.contacts).map(contact => normalizeContact(contact)),
      source,
      status: cleanText(record.status || 'active'),
      createdAt: cleanText(record.createdAt || nowIso()),
      updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso()),
      history: safeArray(record.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeActorRelationship(record = {}) {
    const factionName = cleanText(record.factionName || record.name || 'Unnamed Faction');
    return {
      id: cleanText(record.id) || randomId(),
      factionId: cleanText(record.factionId || slugify(factionName)),
      factionName,
      type: cleanText(record.type || record.kind || 'Faction'),
      planetSystem: planetSystemFrom(record),
      scale: clampScale(record.scale ?? 1),
      leader: cleanText(record.leader || ''),
      relationshipType: this._normalizeRelationshipType(record.relationshipType || record.relationship || 'known'),
      score: normalizeScore(record.score),
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || ''),
      gmNotes: cleanText(record.gmNotes || ''),
      source: this._normalizeSource(record.source || 'gm'),
      status: cleanText(record.status || 'active'),
      createdAt: cleanText(record.createdAt || nowIso()),
      updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso()),
      history: safeArray(record.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeSuggestion(record = {}) {
    const factionName = cleanText(record.factionName || record.name || 'Suggested Faction');
    return {
      id: cleanText(record.id) || randomId(),
      factionId: cleanText(record.factionId || ''),
      factionName,
      name: factionName,
      type: cleanText(record.type || 'Faction'),
      planetSystem: planetSystemFrom(record),
      planet: cleanText(record.planet || parsePlanetSystem(record.planetSystem).planet),
      system: cleanText(record.system || parsePlanetSystem(record.planetSystem).system),
      scale: cleanText(record.scale || ''),
      leader: cleanText(record.leader || ''),
      relationshipType: this._normalizeRelationshipType(record.relationshipType || 'known'),
      score: normalizeScore(record.score),
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || record.benefits || ''),
      gmNotes: cleanText(record.gmNotes || ''),
      source: 'player-suggested',
      status: cleanText(record.status || 'pending_approval'),
      createdAt: cleanText(record.createdAt || nowIso()),
      updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso()),
      history: safeArray(record.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeRelationshipType(value) {
    const raw = cleanText(value || 'known');
    return RELATIONSHIP_TYPES.some(entry => entry.value === raw) ? raw : 'known';
  }

  static _normalizeSource(value) {
    const raw = cleanText(value || 'gm');
    return SOURCE_TYPES.some(entry => entry.value === raw) ? raw : 'gm';
  }
}

try {
  globalThis.SWSEFactionRegistryService = FactionRegistryService;
} catch (err) {
  SWSELogger.warn?.('[FactionRegistryService] Unable to expose global service handle.', err);
}
