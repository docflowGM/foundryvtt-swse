/**
 * AlliesSurfaceService — Holopad Allies surface view model and lightweight
 * management actions.
 *
 * Allies is the character-facing command surface for non-ship, non-vehicle
 * relationships: companions, factions, bases, and organizations. Droid
 * companions are visible here as allies, but physical droid work routes to the
 * Garage/customization surface.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetIntelService, INTEL_REVEAL_STATE } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';

const SYSTEM_ID = 'foundryvtt-swse';
const TAB_IDS = new Set(['companions', 'factions', 'contacts', 'intel', 'bases', 'organizations']);
const COMPANION_KINDS = new Set(['follower', 'minion', 'privateer', 'beast', 'assigned-nonheroic']);
const BASE_ACCOMMODATIONS = [
  ['airlock', 'Airlock'],
  ['barracks', 'Barracks / Capacity'],
  ['commandCenter', 'Command Center'],
  ['defenses', 'Defenses'],
  ['hangar', 'Hangar'],
  ['laboratory', 'Laboratory'],
  ['medicalBay', 'Medical Bay'],
  ['offices', 'Offices'],
  ['reactor', 'Reactor / Energy Station'],
  ['securityStation', 'Security Station'],
  ['sensors', 'Sensors'],
  ['garage', 'Garage'],
  ['lifeSupport', 'Life Support']
];

const ORGANIZATION_SCALE_MIN = 1;
const ORGANIZATION_SCALE_MAX = 20;
const ORGANIZATION_GM_FIELDS = new Set(['scale', 'score', 'benefits', 'bases', 'statistics']);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (value instanceof Map) return Array.from(value.values());
  if (Array.isArray(value.contents)) return value.contents;
  if (typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') return Array.from(value);
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();
}


function randomId(prefix = 'allies') {
  const id = foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`;
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function actorPortrait(actor) {
  return actor?.img || actor?.prototypeToken?.texture?.src || 'icons/svg/mystery-man.svg';
}

function actorTypeLabel(actor) {
  const kind = actor?.system?.npcProfile?.kind
    || actor?.flags?.swse?.follower?.kind
    || actor?.flags?.swse?.minion?.kind
    || actor?.getFlag?.(SYSTEM_ID, 'assignedAllyKind')
    || actor?.type
    || 'npc';
  return titleCase(kind);
}

function isDroidActor(actor) {
  if (!actor) return false;
  if (actor.type === 'droid') return true;
  const species = normalizeText(actor.system?.species?.name || actor.system?.species || actor.system?.race);
  const kind = normalizeText(actor.system?.npcProfile?.kind || actor.flags?.swse?.follower?.originType || actor.flags?.swse?.follower?.type);
  return species.includes('droid') || kind.includes('droid') || actor.getFlag?.(SYSTEM_ID, 'isDroid') === true;
}

function isDismissed(actor) {
  return actor?.getFlag?.(SYSTEM_ID, 'dismissedAlly') === true
    || actor?.flags?.swse?.follower?.active === false
    || actor?.flags?.swse?.minion?.active === false
    || actor?.flags?.swse?.beast?.active === false;
}

function safeLevel(actor) {
  const level = Number(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level);
  return Number.isFinite(level) && level > 0 ? level : null;
}

function hpLabel(actor) {
  const hp = actor?.system?.hp || actor?.system?.hitPoints || {};
  const value = Number(hp.value ?? hp.current);
  const max = Number(hp.max ?? hp.maximum);
  if (Number.isFinite(value) && Number.isFinite(max) && max > 0) return `${value}/${max}`;
  if (Number.isFinite(max) && max > 0) return `${max}`;
  return '—';
}

function defenseLabel(actor) {
  const defenses = actor?.system?.defenses || actor?.system?.defense || actor?.system?.defenseStats || {};
  const ref = defenses.reflex?.value ?? defenses.reflex ?? defenses.ref ?? defenses.reflexDefense;
  const fort = defenses.fortitude?.value ?? defenses.fortitude ?? defenses.fort ?? defenses.fortitudeDefense;
  const will = defenses.will?.value ?? defenses.will ?? defenses.willDefense;
  const parts = [];
  if (ref != null) parts.push(`Ref ${ref}`);
  if (fort != null) parts.push(`Fort ${fort}`);
  if (will != null) parts.push(`Will ${will}`);
  return parts.length ? parts.join(' · ') : '—';
}

function slotKind(slot = {}) {
  const explicit = normalizeText(slot.dependentKind || slot.kind || slot.slotKind || slot.type);
  if (COMPANION_KINDS.has(explicit)) return explicit;
  const talent = normalizeText(slot.talentName || slot.sourceTalent || slot.grantingTalent);
  if (talent.includes('attract privateer')) return 'privateer';
  if (talent.includes('attract minion') || talent.includes('superior minion')) return 'minion';
  if (talent.includes('beast')) return 'beast';
  return 'follower';
}

function slotLabel(slot = {}) {
  const kind = slotKind(slot);
  if (kind === 'privateer') return 'Privateer';
  if (kind === 'minion' || kind === 'assigned-nonheroic') return 'Minion';
  if (kind === 'beast') return 'Beast';
  return 'Follower';
}

function sourceTalentLabel(record = {}) {
  return record.sourceTalent || record.talentName || record.grantingTalent || record.talent || record.source || 'Unknown source';
}

function slotCreatedActorId(slot = {}) {
  return cleanString(slot.createdActorId ?? slot.actorId ?? slot.assignedActorId ?? slot.dependentActorId ?? slot.npcActorId);
}

function slotLiveActor(slot = {}) {
  const actorId = slotCreatedActorId(slot);
  return actorId ? game.actors?.get?.(String(actorId).replace(/^Actor\./, '')) ?? null : null;
}

function isOpenCompanionSlot(slot = {}) {
  const actorId = slotCreatedActorId(slot);
  if (!actorId) return true;
  return !slotLiveActor(slot);
}

function mapPendingSlot(slot = {}) {
  const kind = slotKind(slot);
  const label = slotLabel(slot);
  const staleActorId = slotCreatedActorId(slot);
  const staleAssignment = Boolean(staleActorId && !slotLiveActor(slot));
  return {
    id: slot.id || slot.slotId || `${kind}-${sourceTalentLabel(slot)}`,
    kind,
    label,
    title: staleAssignment ? `Rebuild ${label} Slot` : `Open ${label} Slot`,
    sourceTalent: sourceTalentLabel(slot),
    description: slot.description || (staleAssignment
      ? `${sourceTalentLabel(slot)} has a missing linked actor. Rebuild or refill this ${label.toLowerCase()} slot.`
      : `${sourceTalentLabel(slot)} has granted an unfilled ${label.toLowerCase()} slot.`),
    canBuildFollower: kind === 'follower',
    canBuildMinion: kind === 'minion' || kind === 'privateer' || kind === 'assigned-nonheroic',
    canBuildBeast: kind === 'beast',
    status: staleAssignment ? 'ACTOR MISSING' : 'OPEN SLOT'
  };
}

function ownerHeroicLevel(owner) {
  return Math.max(1, Number(getHeroicLevel(owner)) || Number(owner?.system?.level) || 1);
}

function desiredLevelFor(actor, kind, owner) {
  const ownerLevel = ownerHeroicLevel(owner);
  if (kind === 'follower') return ownerLevel;
  if (kind === 'minion' || kind === 'privateer') {
    const syncMode = actor?.getFlag?.(SYSTEM_ID, 'assignedAllySyncMode') || actor?.flags?.swse?.minion?.syncMode || 'owner-sync';
    if (syncMode === 'manual') return null;
    return Math.max(1, ownerLevel - 2);
  }
  return null;
}

function mapActorCard(actor, kind = 'follower', owner = null, options = {}) {
  const level = safeLevel(actor);
  const desiredLevel = desiredLevelFor(actor, kind, owner);
  const isDroid = isDroidActor(actor);
  const template = actor?.system?.progression?.followerTemplate
    || actor?.flags?.swse?.follower?.templateType
    || actor?.system?.npcProfile?.template
    || actor?.system?.npcProfile?.minion?.template
    || null;
  const sourceTalent = actor?.flags?.swse?.follower?.sourceTalent
    || actor?.flags?.swse?.follower?.grantingTalent
    || actor?.flags?.swse?.minion?.sourceTalent
    || actor?.flags?.swse?.minion?.grantingTalent
    || actor?.system?.npcProfile?.sourceTalent
    || actor?.system?.npcProfile?.owner?.sourceTalent
    || actor?.getFlag?.(SYSTEM_ID, 'assignedAllySource')
    || 'Linked ally';
  const canLevelUp = desiredLevel != null && level !== desiredLevel;
  const beastLevelRequested = actor?.getFlag?.(SYSTEM_ID, 'beastLevelUpRequested') === true;

  return {
    id: actor.id,
    uuid: actor.uuid,
    name: actor.name || 'Unnamed Ally',
    img: actorPortrait(actor),
    kind,
    typeLabel: isDroid && kind === 'follower' ? 'Droid Follower' : actorTypeLabel(actor),
    sourceTalent,
    level: level ?? '—',
    desiredLevel,
    levelLabel: level ? `Level ${level}` : 'Level —',
    desiredLevelLabel: desiredLevel ? `Target ${desiredLevel}` : null,
    hpLabel: hpLabel(actor),
    defenseLabel: defenseLabel(actor),
    templateLabel: template ? titleCase(template) : null,
    isDroid,
    canManage: true,
    canOpenGarage: isDroid,
    canLevelUpFollower: kind === 'follower' && canLevelUp,
    canSyncMinion: (kind === 'minion' || kind === 'privateer') && canLevelUp,
    canRequestBeastLevelUp: kind === 'beast' && !beastLevelRequested,
    beastLevelRequested,
    canFire: true,
    status: kind === 'follower'
      ? (canLevelUp ? 'LEVEL UP' : 'SYNCED')
      : kind === 'beast'
        ? (beastLevelRequested ? 'GM REVIEW' : 'LINKED')
        : (canLevelUp ? 'SYNC NEEDED' : 'SYNCED'),
    isStale: canLevelUp,
    showHistory: options.showHistory === true
  };
}

function uniqueActors(actors = []) {
  const seen = new Set();
  const out = [];
  for (const actor of actors || []) {
    if (!actor?.id || seen.has(actor.id) || isDismissed(actor)) continue;
    seen.add(actor.id);
    out.push(actor);
  }
  return out;
}

function uniqueEntries(entries = []) {
  const seen = new Set();
  const out = [];
  for (const entry of entries || []) {
    const id = entry?.id || entry?.actorId || entry?.uuid || entry?.name;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(entry);
  }
  return out;
}

function relationshipKind(entry = {}) {
  return normalizeText(entry.kind || entry.dependentKind || entry.npcKind || entry.type || entry.actorType || entry.category);
}

function mapRelationshipRecord(entry = {}, fallbackKind = 'record') {
  return {
    id: entry.id || entry.actorId || entry.uuid || entry.name || globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
    name: entry.name || entry.label || entry.title || 'Unnamed Record',
    typeLabel: titleCase(entry.kind || entry.type || fallbackKind),
    status: entry.status || entry.rank || entry.standing || 'Recorded',
    description: entry.description || entry.notes || entry.summary || '',
    meta: entry.location || entry.world || entry.scope || entry.role || ''
  };
}


function parseInteger(value, fallback = 0) {
  const number = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(number) ? number : fallback;
}

function clampInteger(value, min, max, fallback = min) {
  const number = parseInteger(value, fallback);
  return Math.min(max, Math.max(min, number));
}

function scoreClass(score) {
  return score > 0 ? 'is-positive' : score < 0 ? 'is-negative' : 'is-neutral';
}

function scoreStatus(score) {
  return score > 0 ? 'FAVORABLE' : score < 0 ? 'HOSTILE' : 'NEUTRAL';
}

function scoreLabel(score) {
  if (score > 0) return `+${score}`;
  if (score === 0) return '+0';
  return String(score);
}

function splitPlanetSystem(value = '') {
  const raw = cleanString(value);
  if (!raw) return { planet: '', system: '' };
  const [planet, system] = raw.split('/').map(part => cleanString(part));
  return { planet: planet || raw, system: system || '' };
}

function factionStatusLabel(status, score) {
  const normalized = cleanString(status).toLowerCase();
  if (['suggested', 'pending', 'pending_approval'].includes(normalized)) return 'PENDING GM APPROVAL';
  if (normalized === 'rejected') return 'REJECTED';
  return scoreStatus(score);
}

function mapFactionHistory(entry = {}) {
  const delta = parseInteger(entry.delta, 0);
  const before = entry.before === undefined ? null : parseInteger(entry.before, 0);
  const after = entry.after === undefined ? null : parseInteger(entry.after, 0);
  const reason = cleanString(entry.reason || entry.note || entry.type || entry.source || 'Faction update');
  const atLabel = entry.at ? new Date(entry.at).toLocaleString() : '';
  return {
    id: entry.id || randomId('history'),
    at: entry.at || '',
    atLabel,
    reason,
    source: cleanString(entry.source || ''),
    delta,
    deltaLabel: delta ? scoreLabel(delta) : '',
    beforeLabel: before === null ? '' : scoreLabel(before),
    afterLabel: after === null ? '' : scoreLabel(after),
    hasDelta: delta !== 0
  };
}

function mapFactionRecord(entry = {}, context = {}) {
  const registry = context.registry ?? null;
  const id = entry.id || entry.relationshipId || entry.factionId || randomId('faction');
  const factionId = entry.factionId || registry?.id || id;
  const score = parseInteger(entry.score ?? entry.factionScore ?? entry.reputation ?? entry.standingScore ?? registry?.score, 0);
  const location = splitPlanetSystem(entry.planetSystem || registry?.planetSystem || '');
  const planet = entry.planet || entry.world || entry.locationPlanet || location.planet || '';
  const system = entry.system || entry.starSystem || entry.locationSystem || location.system || '';
  const scale = entry.scale || entry.factionScale || entry.scope || registry?.scale || '';
  const statusValue = cleanString(entry.status || 'active');
  const metaParts = [];
  if (planet) metaParts.push(`Planet: ${planet}`);
  if (system) metaParts.push(`System: ${system}`);
  if (scale) metaParts.push(`Scale: ${scale}`);
  const history = [
    ...asArray(entry.history),
    ...asArray(entry.scoreHistory)
  ].map(mapFactionHistory).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
  const isGM = context.isGM === true;
  const pending = ['suggested', 'pending', 'pending_approval'].includes(statusValue.toLowerCase());
  return {
    id,
    factionId,
    name: entry.factionName || entry.name || entry.label || entry.title || registry?.name || 'Unnamed Faction',
    type: entry.type || entry.kind || entry.category || entry.factionType || registry?.type || '',
    planet,
    system,
    planetSystem: entry.planetSystem || registry?.planetSystem || '',
    scale,
    leader: entry.leader || entry.factionLeader || entry.commander || registry?.leader || '',
    relationshipType: entry.relationshipType || entry.relationship || 'known',
    benefits: entry.benefits || entry.factionBenefits || entry.perks || registry?.benefits || '',
    notes: entry.notes || entry.description || entry.summary || '',
    gmNotes: entry.gmNotes || registry?.gmNotes || '',
    source: entry.source || registry?.source || 'gm',
    approvalStatus: statusValue,
    isPending: pending,
    isRejected: statusValue.toLowerCase() === 'rejected',
    canEditScore: isGM,
    canEditGoverned: isGM,
    canSave: isGM || pending || statusValue.toLowerCase() === 'rejected',
    score,
    scoreLabel: scoreLabel(score),
    scoreClass: scoreClass(score),
    status: factionStatusLabel(statusValue, score),
    meta: metaParts.join(' · '),
    history,
    hasHistory: history.length > 0
  };
}

function normalizeFactionForStorage(data = {}, existing = {}) {
  return {
    id: data.id || existing.id || randomId('faction'),
    factionId: cleanString(data.factionId ?? existing.factionId),
    name: cleanString(data.name ?? data.factionName ?? existing.name) || 'Unnamed Faction',
    type: cleanString(data.type ?? existing.type),
    planet: cleanString(data.planet ?? existing.planet),
    system: cleanString(data.system ?? existing.system),
    scale: cleanString(data.scale ?? existing.scale),
    leader: cleanString(data.leader ?? existing.leader),
    relationshipType: cleanString(data.relationshipType ?? existing.relationshipType) || 'known',
    benefits: cleanString(data.benefits ?? existing.benefits),
    notes: cleanString(data.notes ?? existing.notes),
    gmNotes: cleanString(data.gmNotes ?? existing.gmNotes),
    source: cleanString(data.source ?? existing.source) || 'player-suggested',
    status: cleanString(data.status ?? existing.status) || 'pending_approval',
    score: parseInteger(data.score ?? existing.score, 0),
    createdAt: existing.createdAt || data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: asArray(data.history ?? existing.history).slice(-75),
    scoreHistory: asArray(data.scoreHistory ?? existing.scoreHistory).slice(-75)
  };
}

function factionOptionsForOrganizations(factions = []) {
  return [{ id: '', name: 'None / Unspecified' }, ...factions.map(faction => ({
    id: faction.id,
    name: faction.name || 'Unnamed Faction'
  }))];
}

function mapOrganizationRecord(entry = {}, context = {}) {
  const id = entry.id || entry.organizationId || randomId('organization');
  const score = parseInteger(entry.score ?? entry.organizationScore ?? entry.standingScore, 0);
  const scale = clampInteger(entry.scale ?? entry.organizationScale, ORGANIZATION_SCALE_MIN, ORGANIZATION_SCALE_MAX, 1);
  const alignedWithFactionId = cleanString(entry.alignedWithFactionId ?? entry.alignedWith ?? entry.alignmentWith);
  const alignedAgainstFactionId = cleanString(entry.alignedAgainstFactionId ?? entry.alignedAgainst ?? entry.opposedTo);
  const factionOptions = factionOptionsForOrganizations(context.factions || []).map(option => ({
    ...option,
    selectedWith: option.id === alignedWithFactionId,
    selectedAgainst: option.id === alignedAgainstFactionId
  }));

  return {
    id,
    name: entry.name || entry.label || entry.title || 'Unnamed Organization',
    type: entry.type || entry.kind || entry.category || entry.organizationType || '',
    planet: entry.planet || entry.world || entry.locationPlanet || '',
    system: entry.system || entry.starSystem || entry.locationSystem || '',
    leader: entry.leader || entry.organizationLeader || entry.commander || '',
    alignedWithFactionId,
    alignedAgainstFactionId,
    alignmentNotes: entry.alignmentNotes || entry.alignment || entry.notesAlignment || '',
    factionOptions,
    scale,
    scaleLabel: `${scale}/20`,
    benefits: entry.benefits || entry.organizationBenefits || entry.privileges || entry.perks || '',
    bases: entry.bases || entry.organizationBases || entry.holdings || '',
    statistics: entry.statistics || entry.stats || entry.organizationStats || '',
    notes: entry.notes || entry.description || entry.summary || '',
    score,
    scoreLabel: scoreLabel(score),
    scoreClass: scoreClass(score),
    status: scoreStatus(score),
    canEditConcept: true,
    canEditGoverned: context.canEditGoverned === true,
    governedLocked: context.canEditGoverned !== true,
    naturalLeaderRequired: context.hasNaturalLeader !== true
  };
}

function normalizeOrganizationForStorage(data = {}, existing = {}, options = {}) {
  const isGM = options.isGM === true;
  const normalized = {
    id: data.id || existing.id || randomId('organization'),
    name: cleanString(data.name ?? existing.name) || 'Unnamed Organization',
    type: cleanString(data.type ?? existing.type),
    planet: cleanString(data.planet ?? existing.planet),
    system: cleanString(data.system ?? existing.system),
    leader: cleanString(data.leader ?? existing.leader),
    alignedWithFactionId: cleanString(data.alignedWithFactionId ?? existing.alignedWithFactionId),
    alignedAgainstFactionId: cleanString(data.alignedAgainstFactionId ?? existing.alignedAgainstFactionId),
    alignmentNotes: cleanString(data.alignmentNotes ?? existing.alignmentNotes),
    notes: cleanString(data.notes ?? existing.notes),
    updatedAt: Date.now()
  };

  for (const field of ORGANIZATION_GM_FIELDS) {
    const value = isGM ? data[field] : existing[field];
    if (field === 'scale') normalized.scale = clampInteger(value, ORGANIZATION_SCALE_MIN, ORGANIZATION_SCALE_MAX, 1);
    else if (field === 'score') normalized.score = parseInteger(value, 0);
    else normalized[field] = cleanString(value);
  }

  if (!('scale' in normalized)) normalized.scale = clampInteger(existing.scale, ORGANIZATION_SCALE_MIN, ORGANIZATION_SCALE_MAX, 1);
  if (!('score' in normalized)) normalized.score = parseInteger(existing.score, 0);
  return normalized;
}


function normalizeBaseAccommodations(entry = {}) {
  const source = entry.accommodations || entry.facilities || entry.features || {};
  const out = {};
  for (const [key] of BASE_ACCOMMODATIONS) {
    out[key] = cleanString(source[key] ?? entry[key]);
  }
  return out;
}

function mapBaseRecord(entry = {}) {
  const id = entry.id || entry.baseId || randomId('base');
  const accommodations = normalizeBaseAccommodations(entry);
  return {
    id,
    name: entry.name || entry.label || entry.title || 'Unnamed Base',
    type: entry.type || entry.kind || entry.category || '',
    location: entry.location || entry.world || entry.planet || entry.address || '',
    notes: entry.notes || entry.description || entry.summary || '',
    status: entry.status || 'Recorded',
    accommodations,
    accommodationFields: BASE_ACCOMMODATIONS.map(([key, label]) => ({
      key,
      label,
      value: accommodations[key] || ''
    }))
  };
}

function normalizeBaseForStorage(data = {}) {
  const accommodations = normalizeBaseAccommodations(data);
  return {
    id: data.id || randomId('base'),
    name: cleanString(data.name) || 'Unnamed Base',
    type: cleanString(data.type),
    location: cleanString(data.location),
    notes: cleanString(data.notes),
    status: cleanString(data.status) || 'Recorded',
    accommodations,
    updatedAt: Date.now()
  };
}

function mapHistoryRecord(entry = {}) {
  const kind = entry.kind || 'follower';
  const actor = entry.id ? game?.actors?.get?.(entry.id) : null;
  const level = actor ? safeLevel(actor) : entry.levelAtDismissal;
  return {
    id: entry.id || entry.actorId || entry.uuid || entry.name,
    name: actor?.name || entry.name || 'Former Ally',
    img: actor ? actorPortrait(actor) : (entry.img || 'icons/svg/mystery-man.svg'),
    kind,
    typeLabel: titleCase(kind === 'privateer' ? 'Privateer' : kind === 'assigned-nonheroic' ? 'Assigned Nonheroic' : kind),
    sourceTalent: entry.sourceTalent || entry.talent || 'Previously hired',
    levelLabel: level ? `Level ${level}` : 'Level —',
    hpLabel: actor ? hpLabel(actor) : (entry.hpAtDismissal || '—'),
    dismissedAtLabel: entry.dismissedAt ? new Date(entry.dismissedAt).toLocaleString() : '',
    canRehire: Boolean(actor)
  };
}

function hasActorFeat(actor, featName) {
  const target = normalizeText(featName);
  return Array.from(actor?.items || []).some(item => item?.type === 'feat' && normalizeText(item.name) === target);
}

function hasNaturalLeader(actor) {
  return hasActorFeat(actor, 'Natural Leader');
}

function isNonheroicActor(actor) {
  if (!actor) return false;
  if (actor.system?.isMinion === true || actor.system?.progression?.isMinion === true) return true;
  if (String(actor.system?.class || actor.system?.className || '').toLowerCase().includes('nonheroic')) return true;
  if (asArray(actor.system?.progression?.classLevels).some(c => normalizeText(c.classId || c.class || c.name).includes('nonheroic'))) return true;
  return Array.from(actor.items || []).some(item => item.type === 'class' && normalizeText(item.name).includes('nonheroic'));
}

async function loadFollowerCreator() {
  try {
    const mod = await import('/systems/foundryvtt-swse/scripts/apps/follower-creator.js');
    return mod.FollowerCreator ?? null;
  } catch (err) {
    SWSELogger.warn('[AlliesSurfaceService] FollowerCreator unavailable:', err);
    return null;
  }
}

async function reconcileCompanionEntitlements(actor) {
  if (!actor || actor.isOwner !== true) return;

  try {
    const mod = await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/follower-hooks.js');
    await mod.reconcileFollowerSlotsForActor?.(actor);
    await mod.reconcileFollowerEnhancementsForActor?.(actor);
  } catch (err) {
    SWSELogger.warn('[AlliesSurfaceService] Companion entitlement reconciliation failed:', err);
  }
}

async function loadMinionCreator() {
  try {
    const mod = await import('/systems/foundryvtt-swse/scripts/apps/minion-creator.js');
    return mod.MinionCreator ?? null;
  } catch (err) {
    SWSELogger.warn('[AlliesSurfaceService] MinionCreator unavailable:', err);
    return null;
  }
}

async function updateActor(actor, data, options = {}) {
  try {
    const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
    return ActorEngine.updateActor(actor, data, options);
  } catch {
    return actor.update(data, options);
  }
}

function intelKindLabel(value = '') {
  return titleCase(value || 'intel');
}

function intelRevealLabel(value = '') {
  return titleCase(value || INTEL_REVEAL_STATE.REDACTED);
}

function intelLockerBody(intel = {}) {
  if (intel.revealState === INTEL_REVEAL_STATE.DECODED || intel.revealState === INTEL_REVEAL_STATE.FULLY_REVEALED) {
    return cleanString(intel.fullBody || intel.publicBody || intel.redactedBody || intel.summary);
  }
  return cleanString(intel.redactedBody || intel.publicBody || intel.summary || 'Encrypted or redacted Intel.');
}

function visibleContactToPlayers(contact = {}, isGM = false) {
  if (isGM) return true;
  const revealState = cleanString(contact.revealState || '').toLowerCase();
  return contact.knownToPlayers === true || ['hinted', 'known', 'compromised'].includes(revealState);
}

function contactDispositionLabel(value = '') {
  return titleCase(value || 'unknown');
}

function contactRevealLabel(value = '') {
  const normalized = cleanString(value || 'hidden').toLowerCase();
  if (normalized === 'hidden') return 'GM Only';
  if (normalized === 'hinted') return 'Hinted';
  if (normalized === 'known') return 'Known';
  if (normalized === 'compromised') return 'Compromised';
  return titleCase(normalized);
}

function intelLinkLabels(intel = {}) {
  const factionId = cleanString(intel.linkedFactionId);
  const contactId = cleanString(intel.linkedContactId);
  const faction = factionId ? FactionRegistryService.findFaction?.(factionId) : null;
  const contactFound = factionId && contactId ? FactionRegistryService.findFactionContact?.(factionId, contactId) : null;
  const contact = contactFound?.contact ?? null;
  return {
    linkedFactionName: faction?.name || '',
    linkedContactName: contact?.name || '',
    linkedContactRole: contact?.role || '',
    hasLinks: Boolean(faction?.name || contact?.name)
  };
}

function mapIntelLockerCard(entry = {}) {
  const { record, intel, state, decryption = null, lockbox = null } = entry;
  const releasedAt = intel.releasedAt || intel.updatedAt || record?.publishedAt || record?.createdAt || '';
  const releasedLabel = releasedAt ? new Date(releasedAt).toLocaleString() : 'No timestamp';
  const encrypted = intel.skillGate?.enabled || [INTEL_REVEAL_STATE.SEALED, INTEL_REVEAL_STATE.REDACTED, INTEL_REVEAL_STATE.PARTIAL].includes(intel.revealState);
  const decodedByDecryption = Boolean(decryption?.solved);
  const links = intelLinkLabels(intel);
  return {
    recordId: record?.id || '',
    intelId: intel.id,
    title: intel.title || 'Untitled Intel',
    kind: intel.kind,
    kindLabel: intelKindLabel(intel.kind),
    classification: intel.classification,
    classificationLabel: titleCase(intel.classification),
    revealState: intel.revealState,
    revealLabel: intelRevealLabel(intel.revealState),
    persistence: intel.persistence,
    summary: intel.summary || intel.publicBody || intel.redactedBody || '',
    body: decodedByDecryption ? cleanString(intel.fullBody || intel.publicBody || intel.redactedBody || intel.summary) : intelLockerBody(intel),
    linkedFactionId: intel.linkedFactionId || '',
    linkedContactId: intel.linkedContactId || '',
    linkedActorUuid: intel.linkedActorUuid || '',
    ...links,
    tags: asArray(intel.tags),
    tagsLabel: asArray(intel.tags).join(', '),
    releasedAt,
    releasedLabel,
    pinned: Boolean(state.pinned),
    archived: Boolean(state.archived),
    reviewed: Boolean(state.reviewed),
    notes: state.notes || '',
    encrypted,
    decryption,
    hasDecryption: Boolean(decryption?.enabled),
    canAttemptDecryption: Boolean(decryption?.canAttempt),
    isDecoded: decodedByDecryption || [INTEL_REVEAL_STATE.DECODED, INTEL_REVEAL_STATE.FULLY_REVEALED].includes(intel.revealState),
    lockbox: lockbox || { enabled: false },
    hasLockbox: Boolean(lockbox?.enabled),
    canClaimLockbox: Boolean(lockbox?.claimable),
    searchText: [intel.title, intel.kind, intel.classification, links.linkedFactionName, links.linkedContactName, intel.summary, intel.publicBody, intel.redactedBody, intel.fullBody, state.notes, ...(intel.tags ?? [])].join(' ').toLowerCase()
  };
}

function intelIndex(records = [], key = 'linkedFactionId') {
  const map = new Map();
  for (const record of records || []) {
    const id = cleanString(record?.[key]);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(record);
  }
  return map;
}

function contactKey(factionId = '', contactId = '') {
  return `${cleanString(factionId)}::${cleanString(contactId)}`;
}

function mapFactionContactSummary(contact = {}) {
  return {
    id: contact.id,
    name: contact.name || 'Unknown Contact',
    role: contact.role || 'Faction Contact',
    image: contact.image || contact.factionImage || 'icons/svg/mystery-man.svg',
    disposition: contact.disposition || 'unknown',
    dispositionLabel: contactDispositionLabel(contact.disposition),
    revealState: contact.revealState || 'hidden',
    revealLabel: contactRevealLabel(contact.revealState),
    factionRank: contact.factionRank || '',
    lastKnownLocation: contact.lastKnownLocation || '',
    actorId: contact.actorId || '',
    actorUuid: contact.actorUuid || ''
  };
}

function mapContactDossierCard(contact = {}, context = {}) {
  const intelByContact = context.intelByContact ?? new Map();
  const intelByFaction = context.intelByFaction ?? new Map();
  const directIntel = intelByContact.get(contactKey(contact.factionId, contact.id)) || [];
  const factionIntel = intelByFaction.get(contact.factionId) || [];
  const recentIntel = [...directIntel, ...factionIntel.filter(entry => !entry.linkedContactId)].slice(0, 4);
  const body = cleanString(contact.publicNotes || contact.description || contact.role || 'No public dossier notes have been released yet.');
  return {
    id: contact.id,
    factionId: contact.factionId || '',
    name: contact.name || 'Unknown Contact',
    role: contact.role || 'Faction Contact',
    title: contact.title || '',
    image: contact.image || contact.factionImage || 'icons/svg/mystery-man.svg',
    factionName: contact.factionName || 'Unknown Faction',
    factionType: contact.factionType || '',
    factionRank: contact.factionRank || '',
    disposition: contact.disposition || 'unknown',
    dispositionLabel: contactDispositionLabel(contact.disposition),
    revealState: contact.revealState || 'hidden',
    revealLabel: contactRevealLabel(contact.revealState),
    lastKnownLocation: contact.lastKnownLocation || '',
    agenda: context.isGM ? contact.agenda || '' : '',
    secret: context.isGM ? contact.secret || '' : '',
    body,
    publicNotes: contact.publicNotes || '',
    tagsLabel: asArray(contact.tags).join(', '),
    actorId: contact.actorId || '',
    actorUuid: contact.actorUuid || '',
    hasActor: Boolean(contact.actorId || contact.actorUuid),
    knownToPlayers: contact.knownToPlayers === true,
    intelCount: directIntel.length,
    factionIntelCount: factionIntel.length,
    recentIntel,
    hasRecentIntel: recentIntel.length > 0,
    isHidden: contact.revealState === 'hidden',
    searchText: [contact.name, contact.role, contact.factionName, contact.factionRank, contact.disposition, contact.publicNotes, contact.description, ...(contact.tags ?? [])].join(' ').toLowerCase()
  };
}

export class AlliesSurfaceService {
  static async buildViewModel(actor, options = {}) {
    const requestedTab = TAB_IDS.has(String(options.activeTab || options.tab || '').toLowerCase())
      ? String(options.activeTab || options.tab).toLowerCase()
      : 'companions';
    const showHistory = options.showHistory === true || options.showHistory === 'true';

    const [companions, intel, bases] = await Promise.all([
      this._buildCompanions(actor, { showHistory }),
      this._buildIntel(actor, options),
      this._buildBases(actor)
    ]);
    const factions = await this._buildFactions(actor, { intelRecords: intel.records });
    const contacts = await this._buildContacts(actor, { factions: factions.records, intelRecords: intel.records, search: options.contactSearch ?? options.search });
    const organizations = await this._buildOrganizations(actor, { factions: factions.records });

    const counts = {
      companions: companions.totalCount,
      factions: factions.records.length,
      contacts: contacts.records.length,
      intel: intel.records.length,
      bases: bases.records.length,
      organizations: organizations.records.length
    };

    const tabDefinitions = [
      { id: 'companions', label: 'Companions', count: counts.companions, visible: companions.hasAny },
      { id: 'factions', label: 'Factions', count: counts.factions, visible: true },
      { id: 'contacts', label: 'Contacts', count: counts.contacts, visible: true },
      { id: 'intel', label: 'Intel Locker', count: counts.intel, visible: true },
      { id: 'bases', label: 'Bases', count: counts.bases, visible: true },
      { id: 'organizations', label: 'Organizations', count: counts.organizations, visible: organizations.unlocked === true }
    ];
    const visibleTabs = tabDefinitions.filter(tab => tab.visible !== false);
    const activeTab = visibleTabs.some(tab => tab.id === requestedTab) ? requestedTab : (visibleTabs[0]?.id || 'factions');

    return {
      id: 'allies',
      title: 'Allies',
      subtitle: 'Companions // Factions // Contacts // Intel // Bases // Organizations',
      actorName: actor?.name || 'Unknown Actor',
      actorImg: actorPortrait(actor),
      activeTab,
      showHistory,
      tabs: visibleTabs.map(tab => ({ ...tab, active: activeTab === tab.id })),
      counts,
      companions,
      factions,
      contacts,
      intel,
      bases,
      organizations
    };
  }

  static async buildSummary(actor) {
    const vm = await this.buildViewModel(actor, { activeTab: 'companions' });
    return {
      total: vm.counts.companions + vm.counts.factions + vm.counts.contacts + vm.counts.intel + vm.counts.bases + vm.counts.organizations,
      companions: vm.counts.companions,
      factions: vm.counts.factions,
      contacts: vm.counts.contacts,
      intel: vm.counts.intel,
      bases: vm.counts.bases,
      organizations: vm.counts.organizations,
      pending: vm.companions.openSlotCount ?? vm.companions.pending.length,
      openSlots: vm.companions.openSlotCount ?? vm.companions.pending.length
    };
  }

  static async _buildCompanions(actor, options = {}) {
    if (!actor) return this._emptyCompanions(options);

    await reconcileCompanionEntitlements(actor);

    const FollowerCreator = await loadFollowerCreator();
    const MinionCreator = await loadMinionCreator();
    const followerSlots = asArray(actor.getFlag?.(SYSTEM_ID, 'followerSlots'));
    const pendingSlots = followerSlots.filter(isOpenCompanionSlot).map(mapPendingSlot);

    const followerActors = uniqueActors(FollowerCreator?.getFollowers?.(actor) || []);
    const minionActors = uniqueActors(MinionCreator?.getMinions?.(actor) || []);
    const assignedActors = uniqueActors(this._findAssignedNonheroics(actor));
    const beastActors = uniqueActors(this._findLinkedBeasts(actor));

    const followers = followerActors.map(a => mapActorCard(a, 'follower', actor, options));
    const minions = [
      ...minionActors.map(a => mapActorCard(a, a?.system?.npcProfile?.kind === 'privateer' ? 'privateer' : 'minion', actor, options)),
      ...assignedActors.map(a => mapActorCard(a, 'assigned-nonheroic', actor, options))
    ];
    const beasts = beastActors.map(a => mapActorCard(a, 'beast', actor, options));

    const history = asArray(actor.getFlag?.(SYSTEM_ID, 'previouslyHiredAllies')).map(mapHistoryRecord);
    const pendingFollowers = pendingSlots.filter(slot => slot.kind === 'follower');
    const pendingMinions = pendingSlots.filter(slot => slot.kind === 'minion' || slot.kind === 'privateer' || slot.kind === 'assigned-nonheroic');
    const pendingBeasts = pendingSlots.filter(slot => slot.kind === 'beast');
    const historyFollowers = history.filter(entry => entry.kind === 'follower');
    const historyMinions = history.filter(entry => ['minion', 'privateer', 'assigned-nonheroic'].includes(entry.kind));
    const historyBeasts = history.filter(entry => entry.kind === 'beast');

    const followerSlotTotal = Math.max(followers.length + pendingFollowers.length, followerSlots.filter(slot => slotKind(slot) === 'follower').length);
    const minionSlotTotal = Math.max(minions.length + pendingMinions.length, followerSlots.filter(slot => ['minion', 'privateer', 'assigned-nonheroic'].includes(slotKind(slot))).length);
    const beastSlotTotal = Math.max(beasts.length + pendingBeasts.length, followerSlots.filter(slot => slotKind(slot) === 'beast').length);

    const lanes = {
      followers: this._lane('Followers', followers, pendingFollowers, historyFollowers, followerSlotTotal, options),
      minions: this._lane('Minions', minions, pendingMinions, historyMinions, minionSlotTotal, options),
      beasts: this._lane('Beasts', beasts, pendingBeasts, historyBeasts, beastSlotTotal, options)
    };

    const openSlotCount = lanes.followers.openSlotCount + lanes.minions.openSlotCount + lanes.beasts.openSlotCount;
    const activeTotal = openSlotCount + followers.length + minions.length + beasts.length;
    const historyTotal = history.length;
    return {
      pending: pendingSlots,
      openSlotCount,
      ...lanes,
      totalCount: activeTotal,
      historyCount: historyTotal,
      hasAny: activeTotal > 0 || historyTotal > 0,
      showHistory: options.showHistory === true
    };
  }

  static _lane(title, active, pending, history, slotTotal, options) {
    const count = active.length + pending.length;
    const historyCount = history.length;
    const openCapacityCount = Math.max(0, Number(slotTotal || 0) - active.length - pending.length);
    return {
      title,
      pending,
      active,
      history,
      count,
      activeCount: active.length,
      pendingCount: pending.length,
      historyCount,
      slotTotal,
      slotSummary: slotTotal > 0 ? `${active.length}/${slotTotal}` : null,
      hasOpenSlots: pending.length > 0 || openCapacityCount > 0,
      openCapacityCount,
      openSlotCount: pending.length + openCapacityCount,
      hasOpenCapacity: openCapacityCount > 0,
      hasAny: count > 0 || slotTotal > 0 || (options.showHistory === true && historyCount > 0),
      showHistory: options.showHistory === true
    };
  }

  static _emptyCompanions(options = {}) {
    return {
      pending: [],
      openSlotCount: 0,
      followers: this._lane('Followers', [], [], [], 0, options),
      minions: this._lane('Minions', [], [], [], 0, options),
      beasts: this._lane('Beasts', [], [], [], 0, options),
      totalCount: 0,
      historyCount: 0,
      hasAny: false,
      showHistory: options.showHistory === true
    };
  }

  static _findAssignedNonheroics(actor) {
    const ids = new Set();
    for (const entry of asArray(actor.getFlag?.(SYSTEM_ID, 'assignedAllies'))) {
      const id = entry?.id || entry?.actorId;
      if (id) ids.add(id);
    }
    if (game?.actors) {
      for (const candidate of game.actors) {
        const ownerId = candidate?.getFlag?.(SYSTEM_ID, 'assignedAllyOwnerId');
        const kind = candidate?.getFlag?.(SYSTEM_ID, 'assignedAllyKind');
        if (ownerId === actor.id && kind === 'assigned-nonheroic') ids.add(candidate.id);
      }
    }
    return Array.from(ids).map(id => game.actors.get(id)).filter(Boolean);
  }

  static _findLinkedBeasts(actor) {
    const ids = new Set();
    for (const entry of asArray(actor.getFlag?.(SYSTEM_ID, 'beasts'))) {
      if (entry?.id || entry?.actorId) ids.add(entry.id || entry.actorId);
    }
    for (const entry of asArray(actor.system?.ownedActors)) {
      if (relationshipKind(entry) === 'beast' && (entry.id || entry.actorId)) ids.add(entry.id || entry.actorId);
    }
    for (const entry of asArray(actor.system?.relationships)) {
      if (relationshipKind(entry) === 'beast' && (entry.id || entry.actorId)) ids.add(entry.id || entry.actorId);
    }
    if (game?.actors) {
      for (const candidate of game.actors) {
        const ownerId = candidate?.flags?.swse?.beast?.ownerId || candidate?.system?.npcProfile?.owner?.actorId;
        const kind = normalizeText(candidate?.system?.npcProfile?.kind || candidate?.flags?.swse?.beast?.kind || candidate?.system?.kind);
        if (ownerId === actor.id && kind === 'beast') ids.add(candidate.id);
      }
    }
    return Array.from(ids).map(id => game.actors.get(id)).filter(Boolean);
  }


  static async reopenCompanionSlot(actor, slotId) {
    if (!actor || !slotId) return false;
    const slots = asArray(actor.getFlag?.(SYSTEM_ID, 'followerSlots'));
    let changed = false;
    const updated = slots.map(slot => {
      if (slot?.id !== slotId) return slot;
      const actorId = slotCreatedActorId(slot);
      if (!actorId || slotLiveActor(slot)) return slot;
      changed = true;
      return {
        ...slot,
        createdActorId: null,
        actorId: null,
        assignedActorId: null,
        dependentActorId: null,
        npcActorId: null,
        staleActorId: actorId,
        reopenedAt: Date.now()
      };
    });
    if (changed) await actor.setFlag(SYSTEM_ID, 'followerSlots', updated);
    return changed;
  }

  static async _buildFactions(actor, context = {}) {
    const isGM = game.user?.isGM === true;
    const registry = FactionRegistryService.getRegistry();
    const registryById = new Map(registry.map(record => [record.id, record]));
    const registryByName = new Map(registry.map(record => [normalizeText(record.name), record]));
    const flagFactions = asArray(actor?.getFlag?.(SYSTEM_ID, 'factions'));
    const actorRelationships = FactionRegistryService.getActorRelationships(actor);
    const legacyFactions = [
      ...asArray(actor?.system?.factions),
      ...asArray(actor?.system?.affiliations),
      ...asArray(actor?.flags?.swse?.factions),
      ...asArray(actor?.system?.relationships).filter(entry => relationshipKind(entry) === 'faction')
    ];
    const merged = new Map();
    const pushRecord = (entry = {}) => {
      const registryRecord = registryById.get(entry.factionId || entry.id) || registryByName.get(normalizeText(entry.factionName || entry.name || '')) || null;
      const key = registryRecord?.id || entry.factionId || normalizeText(entry.factionName || entry.name || entry.id || randomId('faction'));
      const existing = merged.get(key) || {};
      merged.set(key, { ...existing, ...registryRecord, ...entry, factionId: entry.factionId || registryRecord?.id || existing.factionId });
    };

    for (const entry of legacyFactions) pushRecord(entry);
    for (const entry of flagFactions) pushRecord(entry);
    for (const entry of actorRelationships) pushRecord({ ...entry, id: entry.id, factionId: entry.factionId, factionName: entry.factionName });

    const intelRecords = asArray(context.intelRecords);
    const intelByFaction = intelIndex(intelRecords, 'linkedFactionId');
    const allContacts = FactionRegistryService.getAllFactionContacts?.() ?? [];
    const contactsByFaction = new Map();
    for (const contact of allContacts.filter(contact => visibleContactToPlayers(contact, isGM))) {
      const key = cleanString(contact.factionId);
      if (!key) continue;
      if (!contactsByFaction.has(key)) contactsByFaction.set(key, []);
      contactsByFaction.get(key).push(mapFactionContactSummary(contact));
    }

    const records = Array.from(merged.values())
      .map(entry => mapFactionRecord(entry, { isGM, registry: registryById.get(entry.factionId) || registryByName.get(normalizeText(entry.factionName || entry.name || '')) || null }))
      .map(record => {
        const factionKey = record.factionId || record.id;
        const knownContacts = contactsByFaction.get(factionKey) || [];
        const linkedIntel = intelByFaction.get(factionKey) || [];
        return {
          ...record,
          knownContacts: knownContacts.slice(0, 6),
          knownContactCount: knownContacts.length,
          hasKnownContacts: knownContacts.length > 0,
          linkedIntelCount: linkedIntel.length,
          hasLinkedIntel: linkedIntel.length > 0,
          linkedIntelPreview: linkedIntel.slice(0, 4)
        };
      })
      .sort((a, b) => Number(b.isPending) - Number(a.isPending) || a.name.localeCompare(b.name));
    return {
      records,
      hasAny: records.length > 0,
      totalKnownContacts: records.reduce((sum, record) => sum + (record.knownContactCount || 0), 0),
      totalLinkedIntel: records.reduce((sum, record) => sum + (record.linkedIntelCount || 0), 0),
      canSuggest: !isGM,
      canManageDirectly: isGM,
      addLabel: isGM ? 'Add Faction Relationship' : 'Suggest Faction'
    };
  }

  static async _buildContacts(actor, context = {}) {
    const isGM = game.user?.isGM === true;
    const rawSearch = cleanString(context.search ?? '').toLowerCase();
    const factionIds = new Set(asArray(context.factions).flatMap(faction => [faction.factionId, faction.id].filter(Boolean)));
    const intelRecords = asArray(context.intelRecords);
    const intelByFaction = intelIndex(intelRecords, 'linkedFactionId');
    const intelByContact = new Map();
    for (const entry of intelRecords) {
      const key = contactKey(entry.linkedFactionId, entry.linkedContactId);
      if (key === '::') continue;
      if (!entry.linkedContactId) continue;
      if (!intelByContact.has(key)) intelByContact.set(key, []);
      intelByContact.get(key).push(entry);
    }

    const records = (FactionRegistryService.getAllFactionContacts?.() ?? [])
      .filter(contact => visibleContactToPlayers(contact, isGM))
      .filter(contact => isGM || factionIds.size === 0 || factionIds.has(contact.factionId) || contact.knownToPlayers === true || contact.revealState !== 'hidden')
      .map(contact => mapContactDossierCard(contact, { isGM, intelByFaction, intelByContact }))
      .filter(card => !rawSearch || card.searchText.includes(rawSearch))
      .sort((a, b) => a.factionName.localeCompare(b.factionName) || a.name.localeCompare(b.name));

    return {
      records,
      hasAny: records.length > 0,
      totalCount: records.length,
      actorLinkedCount: records.filter(record => record.hasActor).length,
      hiddenCount: records.filter(record => record.isHidden).length,
      intelLinkedCount: records.reduce((sum, record) => sum + (record.intelCount || 0), 0),
      search: rawSearch
    };
  }

  static async _buildIntel(actor, options = {}) {
    const rawSearch = cleanString(options.intelSearch ?? options.search ?? '');
    const includeArchived = options.includeArchivedIntel === true || options.includeArchivedIntel === 'true';
    const entries = await HolonetIntelService.getPlayerIntel(actor, { includeArchived, search: rawSearch });
    const records = entries.map(mapIntelLockerCard).filter(card => {
      if (!rawSearch) return true;
      return card.searchText.includes(rawSearch.toLowerCase());
    });
    const pinned = records.filter(card => card.pinned && !card.archived);
    const active = records.filter(card => !card.pinned && !card.archived);
    const archived = records.filter(card => card.archived);
    return {
      records,
      pinned,
      active,
      archived,
      hasAny: records.length > 0,
      hasPinned: pinned.length > 0,
      hasArchived: archived.length > 0,
      includeArchived,
      search: rawSearch,
      totalCount: records.length,
      pinnedCount: pinned.length,
      archivedCount: archived.length,
      decodedCount: records.filter(card => card.isDecoded).length,
      encryptedCount: records.filter(card => card.encrypted && !card.isDecoded).length
    };
  }

  static async updateIntelLockerState(ownerActor, intelId, patch = {}) {
    return HolonetIntelService.updatePlayerIntelState(ownerActor, intelId, patch);
  }

  static async attemptIntelDecryption(ownerActor, intelId, skillKey = 'useComputer') {
    return HolonetIntelService.requestIntelDecryption(intelId, { actor: ownerActor, skillKey });
  }

  static async claimIntelLockbox(ownerActor, intelId) {
    return HolonetIntelService.claimIntelLockbox(intelId, { actor: ownerActor });
  }

  static async _buildBases(actor) {
    const flagBases = asArray(actor?.getFlag?.(SYSTEM_ID, 'bases'));
    const legacyBases = [
      ...asArray(actor?.system?.bases),
      ...asArray(actor?.system?.assets?.bases),
      ...asArray(actor?.flags?.swse?.bases),
      ...asArray(actor?.system?.relationships).filter(entry => relationshipKind(entry) === 'base')
    ];

    const merged = uniqueEntries([...flagBases, ...legacyBases])
      .filter(entry => !['ship', 'vehicle', 'starship'].includes(relationshipKind(entry)))
      .map(entry => mapBaseRecord(entry));

    return {
      records: merged,
      hasAny: merged.length > 0,
      accommodationLabels: BASE_ACCOMMODATIONS.map(([key, label]) => ({ key, label }))
    };
  }

  static async _buildOrganizations(actor, context = {}) {
    const isGM = game.user?.isGM === true;
    const naturalLeader = hasNaturalLeader(actor);
    const factions = context.factions ? { records: context.factions } : await this._buildFactions(actor);
    const rawRecords = uniqueEntries([
      ...asArray(actor?.getFlag?.(SYSTEM_ID, 'organizations')),
      ...asArray(actor?.system?.organizations),
      ...asArray(actor?.system?.orgs),
      ...asArray(actor?.flags?.swse?.organizations),
      ...asArray(actor?.system?.relationships).filter(entry => relationshipKind(entry) === 'organization')
    ]);
    const context = {
      canEditGoverned: isGM,
      hasNaturalLeader: naturalLeader,
      factions: factions.records
    };
    const records = rawRecords.map(entry => mapOrganizationRecord(entry, context));
    const unlocked = naturalLeader || records.length > 0 || isGM;
    return {
      records,
      hasAny: records.length > 0,
      unlocked,
      canCreate: naturalLeader || isGM,
      canEditGoverned: isGM,
      hasNaturalLeader: naturalLeader,
      lockMessage: naturalLeader
        ? ''
        : 'Organizations unlock for player-created groups when this actor has the Natural Leader feat.',
      gmControlMessage: 'Organizations are player-visible but GM-governed. Scale, score, benefits, bases, and statistics are controlled by the GM.'
    };
  }

  static async addFaction(ownerActor) {
    if (!ownerActor) return false;
    if (game.user?.isGM) {
      const faction = await FactionRegistryService.upsertFaction({
        name: `New Faction ${FactionRegistryService.getRegistry().length + 1}`,
        source: 'gm',
        status: 'active'
      });
      await FactionRegistryService.addActorRelationship({ actor: ownerActor, faction, relationshipType: 'known', score: 0, source: 'gm', status: 'active' });
      return true;
    }
    const record = await FactionRegistryService.suggestFaction(ownerActor, {
      name: `Suggested Faction ${asArray(ownerActor.getFlag?.(SYSTEM_ID, 'factions')).length + 1}`,
      status: 'suggested'
    });
    return Boolean(record);
  }

  static async saveFaction(ownerActor, factionId, data = {}) {
    if (!ownerActor || !factionId) return false;
    if (game.user?.isGM) {
      const faction = await FactionRegistryService.upsertFaction({
        id: data.factionId || factionId,
        name: data.name,
        type: data.type,
        planet: data.planet,
        system: data.system,
        scale: data.scale,
        leader: data.leader,
        benefits: data.benefits,
        notes: data.notes,
        gmNotes: data.gmNotes,
        source: data.source || 'gm',
        status: 'active'
      });
      const existing = FactionRegistryService.getActorRelationships(ownerActor).find(entry => entry.id === factionId || entry.factionId === factionId || entry.factionId === faction.id);
      if (existing) {
        await FactionRegistryService.updateActorRelationship(ownerActor, existing.id, {
          factionId: faction.id,
          factionName: faction.name,
          relationshipType: data.relationshipType || existing.relationshipType || 'known',
          score: data.score,
          benefits: data.benefits,
          notes: data.notes,
          gmNotes: data.gmNotes,
          source: data.source || existing.source || 'gm',
          status: 'active'
        });
      } else {
        await FactionRegistryService.addActorRelationship({
          actor: ownerActor,
          faction,
          relationshipType: data.relationshipType || 'known',
          score: data.score,
          benefits: data.benefits,
          notes: data.notes,
          gmNotes: data.gmNotes,
          source: data.source || 'gm',
          status: 'active'
        });
      }
      return true;
    }

    const factions = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'factions')).map(entry => normalizeFactionForStorage(entry, entry));
    const existing = factions.find(faction => faction.id === factionId || faction.factionId === factionId) || {};
    const normalized = normalizeFactionForStorage({
      ...data,
      id: existing.id || factionId,
      factionId: existing.factionId || data.factionId || '',
      score: existing.score || 0,
      benefits: existing.benefits || '',
      gmNotes: existing.gmNotes || '',
      source: 'player-suggested',
      status: existing.status === 'rejected' ? 'suggested' : 'pending_approval'
    }, existing);
    const nextFactions = factions.some(faction => faction.id === normalized.id)
      ? factions.map(faction => faction.id === normalized.id ? { ...faction, ...normalized } : faction)
      : [...factions, normalized];
    await ownerActor.setFlag(SYSTEM_ID, 'factions', nextFactions);
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor: ownerActor, relationships: FactionRegistryService.getActorRelationships(ownerActor), suggestion: normalized });
    return true;
  }

  static async removeFaction(ownerActor, factionId) {
    if (!ownerActor || !factionId) return false;
    const legacy = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'factions')).map(entry => normalizeFactionForStorage(entry, entry));
    const relationships = FactionRegistryService.getActorRelationships(ownerActor);
    const relationship = relationships.find(entry => entry.id === factionId || entry.factionId === factionId);
    if (relationship && !game.user?.isGM) {
      ui?.notifications?.warn?.('GM-managed faction relationships cannot be removed by players. Ask the GM to archive or change it.');
      return false;
    }
    if (relationship) await FactionRegistryService.removeActorRelationship(ownerActor, relationship.id);
    await ownerActor.setFlag(SYSTEM_ID, 'factions', legacy.filter(faction => faction.id !== factionId && faction.factionId !== factionId));
    return true;
  }

  static async applyFactionDelta(ownerActor, factionName, delta, reason = '', options = {}) {
    return FactionRegistryService.applyScoreDelta({
      actor: ownerActor,
      factionName,
      delta,
      reason,
      source: options.source || 'gm',
      jobId: options.jobId || '',
      relationshipType: options.relationshipType || 'known',
      metadata: options.metadata || {}
    });
  }

  static async addBase(ownerActor) {
    if (!ownerActor) return false;
    const bases = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'bases')).map(normalizeBaseForStorage);
    const next = normalizeBaseForStorage({
      id: randomId('base'),
      name: `New Base ${bases.length + 1}`,
      type: '',
      location: '',
      notes: '',
      accommodations: {}
    });
    await ownerActor.setFlag(SYSTEM_ID, 'bases', [...bases, next]);
    return true;
  }

  static async saveBase(ownerActor, baseId, data = {}) {
    if (!ownerActor || !baseId) return false;
    const bases = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'bases')).map(normalizeBaseForStorage);
    const normalized = normalizeBaseForStorage({ ...data, id: baseId });
    const index = bases.findIndex(base => base.id === baseId);
    const nextBases = index >= 0
      ? bases.map(base => base.id === baseId ? { ...base, ...normalized } : base)
      : [...bases, normalized];
    await ownerActor.setFlag(SYSTEM_ID, 'bases', nextBases);
    return true;
  }

  static async removeBase(ownerActor, baseId) {
    if (!ownerActor || !baseId) return false;
    const bases = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'bases')).map(normalizeBaseForStorage);
    await ownerActor.setFlag(SYSTEM_ID, 'bases', bases.filter(base => base.id !== baseId));
    return true;
  }

  static async addOrganization(ownerActor) {
    if (!ownerActor) return false;
    if (!game.user?.isGM && !hasNaturalLeader(ownerActor)) {
      ui?.notifications?.warn?.('Organizations unlock when this actor has the Natural Leader feat.');
      return false;
    }
    const organizations = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'organizations'))
      .map(entry => normalizeOrganizationForStorage(entry, entry, { isGM: true }));
    const next = normalizeOrganizationForStorage({
      id: randomId('organization'),
      name: `New Organization ${organizations.length + 1}`,
      type: '',
      planet: '',
      system: '',
      leader: '',
      alignedWithFactionId: '',
      alignedAgainstFactionId: '',
      alignmentNotes: '',
      notes: '',
      scale: 1,
      score: 0,
      benefits: '',
      bases: '',
      statistics: ''
    }, {}, { isGM: true });
    await ownerActor.setFlag(SYSTEM_ID, 'organizations', [...organizations, next]);
    return true;
  }

  static async saveOrganization(ownerActor, organizationId, data = {}) {
    if (!ownerActor || !organizationId) return false;
    if (!game.user?.isGM && !hasNaturalLeader(ownerActor)) {
      ui?.notifications?.warn?.('Only Natural Leader characters can edit their organization concept.');
      return false;
    }
    const organizations = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'organizations'))
      .map(entry => normalizeOrganizationForStorage(entry, entry, { isGM: true }));
    const existing = organizations.find(org => org.id === organizationId) || {};
    const normalized = normalizeOrganizationForStorage({ ...data, id: organizationId }, existing, { isGM: game.user?.isGM === true });
    const nextOrganizations = organizations.some(org => org.id === organizationId)
      ? organizations.map(org => org.id === organizationId ? { ...org, ...normalized } : org)
      : [...organizations, normalized];
    await ownerActor.setFlag(SYSTEM_ID, 'organizations', nextOrganizations);

    const orgScoreDelta = parseInteger(normalized.score, 0) - parseInteger(existing.score, 0);

    if (normalized.alignedWithFactionId) {
      try {
        const faction = FactionRegistryService.findFaction(normalized.alignedWithFactionId);
        if (faction) {
          const currentRelationship = FactionRegistryService.getActorRelationships(ownerActor)
            .find(entry => entry.factionId === faction.id);
          await FactionRegistryService.addActorRelationship({
            actor: ownerActor,
            faction,
            relationshipType: 'founder',
            score: currentRelationship?.score ?? 0,
            benefits: faction.benefits,
            notes: `Founder/leader organization mirror: ${normalized.name}`,
            source: 'organization',
            status: 'active'
          });
          if (game.user?.isGM && orgScoreDelta) {
            await FactionRegistryService.applyScoreDelta({
              actor: ownerActor,
              factionId: faction.id,
              factionName: faction.name,
              delta: orgScoreDelta,
              source: 'organization',
              reason: `Organization score changed for ${normalized.name}`,
              relationshipType: 'founder',
              metadata: { organizationId, organizationName: normalized.name }
            });
          }
        }
      } catch (err) {
        SWSELogger.warn('[AlliesSurfaceService] Organization-to-faction mirror failed:', err);
      }
    }

    if (normalized.alignedAgainstFactionId) {
      try {
        const faction = FactionRegistryService.findFaction(normalized.alignedAgainstFactionId);
        if (faction) {
          const currentRelationship = FactionRegistryService.getActorRelationships(ownerActor)
            .find(entry => entry.factionId === faction.id);
          await FactionRegistryService.addActorRelationship({
            actor: ownerActor,
            faction,
            relationshipType: 'enemy',
            score: currentRelationship?.score ?? 0,
            notes: `Opposed organization mirror: ${normalized.name}`,
            source: 'organization',
            status: 'active'
          });
          if (game.user?.isGM && orgScoreDelta) {
            await FactionRegistryService.applyScoreDelta({
              actor: ownerActor,
              factionId: faction.id,
              factionName: faction.name,
              delta: -Math.abs(orgScoreDelta),
              source: 'organization',
              reason: `Organization opposition changed for ${normalized.name}`,
              relationshipType: 'enemy',
              metadata: { organizationId, organizationName: normalized.name }
            });
          }
        }
      } catch (err) {
        SWSELogger.warn('[AlliesSurfaceService] Organization opposition mirror failed:', err);
      }
    }

    return true;
  }

  static async removeOrganization(ownerActor, organizationId) {
    if (!ownerActor || !organizationId) return false;
    if (!game.user?.isGM) {
      ui?.notifications?.warn?.('Only the GM can remove organization records.');
      return false;
    }
    const organizations = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'organizations'))
      .map(entry => normalizeOrganizationForStorage(entry, entry, { isGM: true }));
    await ownerActor.setFlag(SYSTEM_ID, 'organizations', organizations.filter(org => org.id !== organizationId));
    return true;
  }

  static async dismissCompanion(ownerActor, actorId) {
    if (!ownerActor || !actorId) return false;
    const ally = game.actors?.get?.(actorId);
    if (!ally) return false;
    const kind = this._kindForAlly(ownerActor, ally);
    const slots = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followerSlots'));
    const slot = slots.find(entry => entry?.createdActorId === actorId) || null;
    const sourceTalent = ally.flags?.swse?.follower?.grantingTalent
      || ally.flags?.swse?.minion?.talentName
      || slot?.talentName
      || ally.getFlag?.(SYSTEM_ID, 'assignedAllySource')
      || 'Previously hired';

    const historyEntry = {
      id: ally.id,
      uuid: ally.uuid,
      name: ally.name,
      img: ally.img,
      kind,
      sourceTalent,
      slotId: slot?.id || null,
      slotSnapshot: slot || null,
      levelAtDismissal: safeLevel(ally),
      hpAtDismissal: hpLabel(ally),
      dismissedAt: Date.now()
    };

    await ownerActor.setFlag(SYSTEM_ID, 'previouslyHiredAllies', uniqueEntries([
      ...asArray(ownerActor.getFlag?.(SYSTEM_ID, 'previouslyHiredAllies')).filter(entry => (entry.id || entry.actorId) !== ally.id),
      historyEntry
    ]));

    await this._removeActiveLink(ownerActor, ally, kind);

    if (slot) {
      const updatedSlots = slots.map(entry => entry.id === slot.id
        ? { ...entry, createdActorId: null, dismissedActorId: ally.id, dismissedAt: Date.now() }
        : entry);
      await ownerActor.setFlag(SYSTEM_ID, 'followerSlots', updatedSlots);
    }

    await ally.setFlag(SYSTEM_ID, 'dismissedAlly', true);
    await ally.setFlag(SYSTEM_ID, 'dismissedFromOwnerId', ownerActor.id);
    await ally.setFlag(SYSTEM_ID, 'dismissedAt', Date.now());
    if (kind === 'follower') await updateActor(ally, { 'flags.swse.follower.active': false }, { source: 'Allies.dismissFollower' });
    if (['minion', 'privateer'].includes(kind)) await updateActor(ally, { 'flags.swse.minion.active': false }, { source: 'Allies.dismissMinion' });
    if (kind === 'beast') await updateActor(ally, { 'flags.swse.beast.active': false }, { source: 'Allies.dismissBeast' });
    return true;
  }

  static async rehireCompanion(ownerActor, actorId) {
    if (!ownerActor || !actorId) return false;
    const ally = game.actors?.get?.(actorId);
    if (!ally) return false;
    const history = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'previouslyHiredAllies'));
    const entry = history.find(item => (item.id || item.actorId) === actorId);
    if (!entry) return false;
    const kind = entry.kind || this._kindForAlly(ownerActor, ally);
    const link = {
      id: ally.id,
      uuid: ally.uuid,
      name: ally.name,
      type: ally.type,
      kind,
      dependentKind: kind,
      img: ally.img,
      talent: entry.sourceTalent || null
    };

    await this._addActiveLink(ownerActor, link, kind);

    const slots = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followerSlots'));
    if (entry.slotId) {
      const updatedSlots = slots.map(slot => slot.id === entry.slotId
        ? { ...slot, createdActorId: ally.id, rehireAt: Date.now(), dismissedActorId: null }
        : slot);
      await ownerActor.setFlag(SYSTEM_ID, 'followerSlots', updatedSlots);
    } else if (entry.slotSnapshot && !slots.some(slot => slot.id === entry.slotSnapshot.id)) {
      await ownerActor.setFlag(SYSTEM_ID, 'followerSlots', [...slots, { ...entry.slotSnapshot, createdActorId: ally.id, rehireAt: Date.now() }]);
    }

    await ownerActor.setFlag(SYSTEM_ID, 'previouslyHiredAllies', history.filter(item => (item.id || item.actorId) !== actorId));
    await ally.unsetFlag?.(SYSTEM_ID, 'dismissedAlly');
    await ally.unsetFlag?.(SYSTEM_ID, 'dismissedFromOwnerId');
    await ally.unsetFlag?.(SYSTEM_ID, 'dismissedAt');
    if (kind === 'follower') await updateActor(ally, { 'flags.swse.follower.active': true }, { source: 'Allies.rehireFollower' });
    if (['minion', 'privateer'].includes(kind)) await updateActor(ally, { 'flags.swse.minion.active': true }, { source: 'Allies.rehireMinion' });
    if (kind === 'beast') await updateActor(ally, { 'flags.swse.beast.active': true }, { source: 'Allies.rehireBeast' });
    return true;
  }

  static async assignDroppedActor(ownerActor, droppedActor) {
    if (!ownerActor || !droppedActor) return false;
    if (!game.user?.isGM) {
      ui?.notifications?.warn?.('Only a GM can assign an existing NPC ally by drag-and-drop.');
      return false;
    }
    if (!['npc', 'character'].includes(droppedActor.type) || !isNonheroicActor(droppedActor)) {
      ui?.notifications?.warn?.('Only nonheroic NPC actors can be assigned into Allies this way.');
      return false;
    }

    const kind = 'assigned-nonheroic';
    const link = {
      id: droppedActor.id,
      uuid: droppedActor.uuid,
      name: droppedActor.name,
      type: droppedActor.type,
      kind,
      dependentKind: kind,
      img: droppedActor.img,
      talent: 'GM Assignment',
      syncMode: 'manual'
    };

    await this._addActiveLink(ownerActor, link, kind);
    await droppedActor.setFlag(SYSTEM_ID, 'assignedAllyOwnerId', ownerActor.id);
    await droppedActor.setFlag(SYSTEM_ID, 'assignedAllyKind', kind);
    await droppedActor.setFlag(SYSTEM_ID, 'assignedAllySource', 'GM Assignment');
    await droppedActor.setFlag(SYSTEM_ID, 'assignedAllySyncMode', 'manual');
    await droppedActor.unsetFlag?.(SYSTEM_ID, 'dismissedAlly');

    const ownerUser = game.users?.find?.(u => u.character?.id === ownerActor.id);
    if (ownerUser) {
      await updateActor(droppedActor, {
        ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
      }, { source: 'Allies.assignDroppedActor.ownership' });
    }
    return true;
  }

  static async requestBeastLevelUp(ownerActor, beastId) {
    const beast = game.actors?.get?.(beastId);
    if (!ownerActor || !beast) return false;
    await beast.setFlag(SYSTEM_ID, 'beastLevelUpRequested', true);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ownerActor }),
      content: `<div class="swse-chat-card"><h3>Beast Advancement Request</h3><p>${ownerActor.name} requests GM approval to level up ${beast.name}.</p></div>`,
      flags: { [SYSTEM_ID]: { type: 'beast-level-up-request', ownerId: ownerActor.id, beastId } }
    });
    return true;
  }

  static _kindForAlly(ownerActor, ally) {
    const profileKind = normalizeText(ally?.system?.npcProfile?.kind || ally?.getFlag?.(SYSTEM_ID, 'assignedAllyKind'));
    if (COMPANION_KINDS.has(profileKind)) return profileKind;
    if (ally?.system?.isFollower || ally?.system?.progression?.isFollower || ally?.flags?.swse?.follower?.isFollower) return 'follower';
    if (ally?.system?.isMinion || ally?.system?.progression?.isMinion || ally?.flags?.swse?.minion?.isMinion) return profileKind === 'privateer' ? 'privateer' : 'minion';
    if (ally?.flags?.swse?.beast?.ownerId === ownerActor?.id || profileKind === 'beast') return 'beast';
    return 'assigned-nonheroic';
  }

  static async _removeActiveLink(ownerActor, ally, kind) {
    const id = ally.id;
    if (kind === 'follower') {
      await ownerActor.setFlag(SYSTEM_ID, 'followers', asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followers')).filter(entry => (entry.id || entry.actorId) !== id));
    } else if (['minion', 'privateer'].includes(kind)) {
      await ownerActor.setFlag(SYSTEM_ID, 'minions', asArray(ownerActor.getFlag?.(SYSTEM_ID, 'minions')).filter(entry => (entry.id || entry.actorId) !== id));
    } else if (kind === 'beast') {
      await ownerActor.setFlag(SYSTEM_ID, 'beasts', asArray(ownerActor.getFlag?.(SYSTEM_ID, 'beasts')).filter(entry => (entry.id || entry.actorId) !== id));
    } else {
      await ownerActor.setFlag(SYSTEM_ID, 'assignedAllies', asArray(ownerActor.getFlag?.(SYSTEM_ID, 'assignedAllies')).filter(entry => (entry.id || entry.actorId) !== id));
    }
    await updateActor(ownerActor, {
      'system.ownedActors': asArray(ownerActor.system?.ownedActors).filter(entry => (entry.id || entry.actorId) !== id)
    }, { source: 'Allies.removeActiveLink' });
  }

  static async _addActiveLink(ownerActor, link, kind) {
    if (kind === 'follower') {
      await ownerActor.setFlag(SYSTEM_ID, 'followers', uniqueEntries([...asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followers')), link]));
    } else if (['minion', 'privateer'].includes(kind)) {
      await ownerActor.setFlag(SYSTEM_ID, 'minions', uniqueEntries([...asArray(ownerActor.getFlag?.(SYSTEM_ID, 'minions')), link]));
    } else if (kind === 'beast') {
      await ownerActor.setFlag(SYSTEM_ID, 'beasts', uniqueEntries([...asArray(ownerActor.getFlag?.(SYSTEM_ID, 'beasts')), link]));
    } else {
      await ownerActor.setFlag(SYSTEM_ID, 'assignedAllies', uniqueEntries([...asArray(ownerActor.getFlag?.(SYSTEM_ID, 'assignedAllies')), link]));
    }
    await updateActor(ownerActor, {
      'system.ownedActors': uniqueEntries([...asArray(ownerActor.system?.ownedActors), link])
    }, { source: 'Allies.addActiveLink' });
  }
}

export default AlliesSurfaceService;
