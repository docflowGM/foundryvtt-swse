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

const SYSTEM_ID = 'foundryvtt-swse';
const TAB_IDS = new Set(['companions', 'factions', 'bases', 'organizations']);
const COMPANION_KINDS = new Set(['follower', 'minion', 'privateer', 'beast', 'assigned-nonheroic']);

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

function mapPendingSlot(slot = {}) {
  const kind = slotKind(slot);
  const label = slotLabel(slot);
  return {
    id: slot.id || slot.slotId || `${kind}-${sourceTalentLabel(slot)}`,
    kind,
    label,
    title: `Open ${label} Slot`,
    sourceTalent: sourceTalentLabel(slot),
    description: slot.description || `${sourceTalentLabel(slot)} has granted an unfilled ${label.toLowerCase()} slot.`,
    canBuildFollower: kind === 'follower',
    canBuildMinion: kind === 'minion' || kind === 'privateer',
    canBuildBeast: kind === 'beast',
    status: 'OPEN SLOT'
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

export class AlliesSurfaceService {
  static async buildViewModel(actor, options = {}) {
    const requestedTab = TAB_IDS.has(String(options.activeTab || options.tab || '').toLowerCase())
      ? String(options.activeTab || options.tab).toLowerCase()
      : 'companions';
    const showHistory = options.showHistory === true || options.showHistory === 'true';

    const [companions, factions, bases, organizations] = await Promise.all([
      this._buildCompanions(actor, { showHistory }),
      this._buildFactions(actor),
      this._buildBases(actor),
      this._buildOrganizations(actor)
    ]);

    const counts = {
      companions: companions.totalCount,
      factions: factions.records.length,
      bases: bases.records.length,
      organizations: organizations.records.length
    };

    const tabDefinitions = [
      { id: 'companions', label: 'Companions', count: counts.companions, visible: companions.hasAny },
      { id: 'factions', label: 'Factions', count: counts.factions, visible: true },
      { id: 'bases', label: 'Bases', count: counts.bases, visible: true },
      { id: 'organizations', label: 'Organizations', count: counts.organizations, visible: true }
    ];
    const visibleTabs = tabDefinitions.filter(tab => tab.visible !== false);
    const activeTab = visibleTabs.some(tab => tab.id === requestedTab) ? requestedTab : (visibleTabs[0]?.id || 'factions');

    return {
      id: 'allies',
      title: 'Allies',
      subtitle: 'Companions // Factions // Bases // Organizations',
      actorName: actor?.name || 'Unknown Actor',
      actorImg: actorPortrait(actor),
      activeTab,
      showHistory,
      tabs: visibleTabs.map(tab => ({ ...tab, active: activeTab === tab.id })),
      counts,
      companions,
      factions,
      bases,
      organizations
    };
  }

  static async buildSummary(actor) {
    const vm = await this.buildViewModel(actor, { activeTab: 'companions' });
    return {
      total: vm.counts.companions + vm.counts.factions + vm.counts.bases + vm.counts.organizations,
      companions: vm.counts.companions,
      factions: vm.counts.factions,
      bases: vm.counts.bases,
      organizations: vm.counts.organizations,
      pending: vm.companions.pending.length
    };
  }

  static async _buildCompanions(actor, options = {}) {
    if (!actor) return this._emptyCompanions(options);

    const FollowerCreator = await loadFollowerCreator();
    const MinionCreator = await loadMinionCreator();
    const followerSlots = asArray(actor.getFlag?.(SYSTEM_ID, 'followerSlots'));
    const pendingSlots = followerSlots.filter(slot => !slot?.createdActorId).map(mapPendingSlot);

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
    const pendingMinions = pendingSlots.filter(slot => slot.kind === 'minion' || slot.kind === 'privateer');
    const pendingBeasts = pendingSlots.filter(slot => slot.kind === 'beast');
    const historyFollowers = history.filter(entry => entry.kind === 'follower');
    const historyMinions = history.filter(entry => ['minion', 'privateer', 'assigned-nonheroic'].includes(entry.kind));
    const historyBeasts = history.filter(entry => entry.kind === 'beast');

    const followerSlotTotal = Math.max(followers.length + pendingFollowers.length, followerSlots.filter(slot => slotKind(slot) === 'follower').length);
    const minionSlotTotal = Math.max(minions.length + pendingMinions.length, followerSlots.filter(slot => ['minion', 'privateer'].includes(slotKind(slot))).length);
    const beastSlotTotal = Math.max(beasts.length + pendingBeasts.length, followerSlots.filter(slot => slotKind(slot) === 'beast').length);

    const lanes = {
      followers: this._lane('Followers', followers, pendingFollowers, historyFollowers, followerSlotTotal, options),
      minions: this._lane('Minions', minions, pendingMinions, historyMinions, minionSlotTotal, options),
      beasts: this._lane('Beasts', beasts, pendingBeasts, historyBeasts, beastSlotTotal, options)
    };

    const activeTotal = pendingSlots.length + followers.length + minions.length + beasts.length;
    const historyTotal = history.length;
    return {
      pending: pendingSlots,
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
      hasOpenSlots: pending.length > 0,
      hasAny: count > 0 || (options.showHistory === true && historyCount > 0),
      showHistory: options.showHistory === true
    };
  }

  static _emptyCompanions(options = {}) {
    return {
      pending: [],
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

  static async _buildFactions(actor) {
    const records = [
      ...asArray(actor?.system?.factions),
      ...asArray(actor?.system?.affiliations),
      ...asArray(actor?.flags?.swse?.factions),
      ...asArray(actor?.getFlag?.(SYSTEM_ID, 'factions'))
    ].map(entry => mapRelationshipRecord(entry, 'faction'));
    return { records, hasAny: records.length > 0 };
  }

  static async _buildBases(actor) {
    const raw = [
      ...asArray(actor?.system?.bases),
      ...asArray(actor?.system?.assets?.bases),
      ...asArray(actor?.flags?.swse?.bases),
      ...asArray(actor?.getFlag?.(SYSTEM_ID, 'bases')),
      ...asArray(actor?.system?.relationships).filter(entry => relationshipKind(entry) === 'base')
    ];

    const records = raw
      .filter(entry => !['ship', 'vehicle', 'starship'].includes(relationshipKind(entry)))
      .map(entry => mapRelationshipRecord(entry, 'base'));
    return { records, hasAny: records.length > 0 };
  }

  static async _buildOrganizations(actor) {
    const records = [
      ...asArray(actor?.system?.organizations),
      ...asArray(actor?.system?.orgs),
      ...asArray(actor?.flags?.swse?.organizations),
      ...asArray(actor?.getFlag?.(SYSTEM_ID, 'organizations')),
      ...asArray(actor?.system?.relationships).filter(entry => relationshipKind(entry) === 'organization')
    ].map(entry => mapRelationshipRecord(entry, 'organization'));
    return { records, hasAny: records.length > 0 };
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
