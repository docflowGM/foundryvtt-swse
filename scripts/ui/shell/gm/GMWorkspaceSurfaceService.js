/** GM actor workspace surface view-model. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { GMPartyRosterService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-party-roster-service.js';
import { isXPEnabled, determineLevelFromXP } from '/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js';
import { XP_LEVEL_THRESHOLDS, XP_MAX_LEVEL } from '/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js';
import { GMCampaignContextService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function safeCollection(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (collection.contents) return Array.from(collection.contents);
  if (collection.values) return Array.from(collection.values());
  try { return Array.from(collection); } catch (_err) { return []; }
}

function actorCard(actor, extra = {}) {
  if (!actor) return null;
  const ownerUsers = safeCollection(game.users)
    .filter(user => user?.character?.id === actor.id)
    .map(user => user.name)
    .filter(Boolean);
  const hp = actor.system?.hp ?? actor.system?.attributes?.hp ?? {};
  const hpValue = Number(hp.value ?? hp.current ?? 0) || 0;
  const hpMax = Number(hp.max ?? hp.maximum ?? 0) || 0;
  // CORRECTION 2: the canonical Actor schema stores Condition Track at
  // system.conditionTrack.current (the exact field
  // GMCombatRecoveryService.buildActorCard() reads) — .value/.condition.track
  // are legacy-compatibility fallbacks only, never the primary source.
  const conditionTrack = Number(actor.system?.conditionTrack?.current ?? actor.system?.conditionTrack?.value ?? actor.system?.condition?.track ?? 0) || 0;
  const xpTotal = Number(actor.system?.xp?.total ?? actor.system?.xp?.value ?? actor.system?.experience ?? 0) || 0;
  const credits = Number(actor.system?.credits ?? actor.system?.wealth?.credits ?? 0) || 0;
  const level = Number(actor.system?.level ?? actor.system?.details?.level ?? actor.system?.progression?.level ?? 0) || 0;
  const xpSystemEnabled = extra.xpSystemEnabled !== false;
  const xpLevel = xpSystemEnabled ? determineLevelFromXP(xpTotal) : null;
  const xpBasisLevel = xpSystemEnabled ? Math.max(Number(level) || 1, Number(xpLevel) || 1) : null;
  const xpTargetLevel = xpSystemEnabled && xpBasisLevel < XP_MAX_LEVEL ? xpBasisLevel + 1 : null;
  const xpNextThreshold = xpTargetLevel ? XP_LEVEL_THRESHOLDS[xpTargetLevel] : null;
  const xpToNextLevel = xpNextThreshold !== null && xpNextThreshold !== undefined ? Math.max(0, xpNextThreshold - xpTotal) : 0;
  const xpProgressLabel = xpSystemEnabled
    ? (xpTargetLevel ? `${xpTotal.toLocaleString()} XP · ${xpToNextLevel.toLocaleString()} to L${xpTargetLevel}` : `${xpTotal.toLocaleString()} XP · max tier`)
    : 'XP tracking disabled';
  const forcePoints = actor.system?.forcePoints ?? actor.system?.resources?.forcePoints ?? {};
  const fpValue = Number(forcePoints.value ?? 0) || 0;
  const fpMax = Number(forcePoints.max ?? 0) || 0;
  const hasForcePool = fpMax > 0 || fpValue > 0;
  const partyMeta = GMPartyRosterService.membershipMeta(actor);
  const inParty = partyMeta.inParty;
  const hpRatio = hpMax > 0 ? hpValue / hpMax : 1;
  const hpTone = hpMax <= 0 ? 'muted' : (hpValue <= 0 ? 'crit' : (hpRatio <= 0.5 ? 'warn' : 'ok'));
  const typeChipClass = ['character', 'pc'].includes(actor.type) ? 'pc' : (actor.type === 'npc' ? 'npc' : (actor.type === 'droid' ? 'droid' : (actor.type === 'vehicle' ? 'vehicle' : '')));
  const typeLabel = actor.type === 'character' ? 'PC' : String(actor.type || 'actor').toUpperCase();
  return {
    id: actor.id,
    name: actor.name,
    type: actor.type,
    typeLabel,
    typeChipClass,
    img: actor.img,
    ownerUsers,
    ownerLabel: ownerUsers.length ? ownerUsers.join(', ') : 'No linked player',
    hpValue,
    hpMax,
    hpLabel: hpMax ? `${hpValue}/${hpMax} HP` : 'HP unavailable',
    hpTone,
    conditionTrack,
    conditionLabel: conditionTrack ? `CT ${conditionTrack}` : 'CT normal',
    xpTotal,
    xpSystemEnabled,
    xpLevel,
    xpTargetLevel,
    xpToNextLevel,
    xpProgressLabel,
    canUseXpControls: xpSystemEnabled,
    canGrantLevelUpXp: xpSystemEnabled && xpToNextLevel > 0,
    credits,
    level,
    levelLabel: level ? `Level ${level}` : (xpLevel ? `XP Level ${xpLevel}` : 'Level unknown'),
    fpValue,
    fpMax,
    forcePointsLabel: hasForcePool ? `${fpValue}/${fpMax || fpValue} FP` : 'No FP pool',
    hasForcePool,
    canRestoreForcePoints: hasForcePool && fpValue < (fpMax || fpValue),
    inParty,
    partySource: partyMeta.source,
    partySourceLabel: partyMeta.label,
    partySourceDetail: partyMeta.detail,
    partyPlayerLinked: partyMeta.playerLinked,
    partyExplicit: partyMeta.explicit,
    partyExplicitlyIncluded: partyMeta.explicitlyIncluded,
    partyExplicitlyExcluded: partyMeta.explicitlyExcluded,
    inCombat: Boolean(extra.inCombat),
    inScene: Boolean(extra.inScene),
    sceneName: extra.sceneName || '',
    tokenName: extra.tokenName || actor.name
  };
}

function uniqueActors(rows = []) {
  const map = new Map();
  for (const row of rows) {
    if (row?.id && !map.has(row.id)) map.set(row.id, row);
  }
  return Array.from(map.values());
}

/**
 * Selected-Actor campaign dossier (Phase 7). Resolves
 * GMCampaignContextService.forActor() EXACTLY ONCE per render, only for
 * the one selected Actor — never per roster card (the Phase 7 performance
 * rule). Decorates the shared context for Workspace's presentation rather
 * than re-querying Locations/Factions/Jobs/Intel/Trade independently
 * (Phase 7 addendum B).
 *
 * Selection-state contract: an explicit selectedActorId that no longer
 * resolves to a real Actor is reported as a `warning`, never silently
 * substituted for another Actor (Phase 7 7S) — the fallback chain below
 * applies ONLY when there is no explicit selection at all. With no
 * explicit selection, Workspace picks the most contextually relevant
 * Actor rather than defaulting straight to an empty dossier (PRE-
 * BROADCAST INTEGRITY PASS item 4): first party member, else first
 * active-combat Actor, else first current-scene Actor, else first
 * visible GM-owned Actor — an honest UX default, not a resolved identity
 * claim, matching the same "default to the first visible record"
 * convention Locations already uses (GMLocationsSurfaceService
 * .buildViewModel()'s own selectedLocationId fallback).
 */
async function buildSelectedActorSection(requestedActorId, { partyActors = [], combatActors = [], sceneActors = [], gmActors = [] } = {}, { xpSystemEnabled }) {
  const selectedActorId = text(requestedActorId)
    || partyActors[0]?.id
    || combatActors[0]?.id
    || sceneActors[0]?.id
    || gmActors[0]?.id
    || '';
  if (!selectedActorId) {
    return {
      selectedActorId: '', hasSelection: false, warning: '',
      empty: 'No Actor selected. Choose a party member or GM-owned actor below to open their campaign dossier.'
    };
  }
  const actor = game.actors?.get?.(selectedActorId);
  if (!actor) {
    return {
      selectedActorId, hasSelection: false, empty: '',
      warning: `The selected Actor (${selectedActorId}) could not be found. It may have been deleted or is no longer accessible.`
    };
  }

  const context = await GMCampaignContextService.forActor(actor);
  // FINAL CORRECTION 2: forActor() is the ONE authoritative
  // GMCombatRecoveryService.buildActorCard(actor) call for this render —
  // it already resolves party/ownership/effects/poisons/ongoing-effects
  // internally, so Workspace consumes the exact card forActor() computed
  // (context.operations.recovery.card) rather than calling
  // buildActorCard() a second time for the same Actor.
  const recoveryCard = context.operations?.recovery?.card ?? null;
  const card = actorCard(actor, { xpSystemEnabled });
  const locations = (context.relationships?.locations ?? []).map(entry => ({
    ...entry,
    roleLabel: entry.role === 'direct-actor' ? 'Present at Location' : 'Via Faction Contact'
  }));

  return {
    selectedActorId,
    hasSelection: true,
    warning: '',
    empty: '',
    identity: card,
    currentSituation: {
      hpLabel: card.hpLabel,
      hpTone: card.hpTone,
      conditionLabel: card.conditionLabel,
      injured: context.operations?.recovery?.injured ?? false,
      naturalHealingEligible: context.operations?.recovery?.naturalHealingEligible ?? false,
      recoveryKindLabel: recoveryCard?.kindLabel || '',
      statusChips: recoveryCard?.statusChips ?? [],
      inCombat: context.party?.inCombat ?? false,
      inScene: context.party?.inScene ?? false,
      isPartyMember: context.party?.isPartyMember ?? false
    },
    relationships: { ...context.relationships, locations },
    operations: {
      recovery: recoveryCard,
      trades: context.operations?.trades ?? []
    },
    progression: {
      xpTotal: card.xpTotal,
      xpProgressLabel: card.xpProgressLabel,
      xpSystemEnabled: card.xpSystemEnabled,
      canUseXpControls: card.canUseXpControls,
      canGrantLevelUpXp: card.canGrantLevelUpXp,
      credits: card.credits,
      levelLabel: card.levelLabel,
      fpValue: card.fpValue,
      fpMax: card.fpMax,
      hasForcePool: card.hasForcePool,
      canRestoreForcePoints: card.canRestoreForcePoints
    },
    limitations: context.limitations ?? []
  };
}

export class GMWorkspaceSurfaceService {
  static async buildViewModel(host) {
    const xpSystemEnabled = isXPEnabled();
    const ownedActors = game.actors.filter((actor) => actor.isOwner);
    const scene = game.scenes?.active ?? globalThis.canvas?.scene ?? null;
    const sceneTokens = safeCollection(scene?.tokens).map(token => ({ token, actor: token.actor ?? game.actors?.get(token.actorId) })).filter(row => row.actor);
    const combatants = safeCollection(game.combat?.combatants).map(combatant => ({ combatant, actor: combatant.actor })).filter(row => row.actor);

    const sceneActorIds = new Set(sceneTokens.map(row => row.actor.id));
    const combatActorIds = new Set(combatants.map(row => row.actor.id));

    const gmActors = uniqueActors(ownedActors.map(actor => actorCard(actor, { xpSystemEnabled })));
    const partyActors = uniqueActors(gmActors.filter(actor => actor.inParty));
    const partyActorIds = new Set(partyActors.map(actor => actor.id));
    const availablePartyActors = uniqueActors(gmActors.filter(actor => !actor.inParty));
    const sceneActors = uniqueActors(sceneTokens.map(({ token, actor }) => actorCard(actor, { inScene: true, sceneName: scene?.name ?? '', tokenName: token.name, xpSystemEnabled })));
    const combatActors = uniqueActors(combatants.map(({ actor }) => actorCard(actor, { inCombat: true, inScene: sceneActorIds.has(actor.id), sceneName: scene?.name ?? '', xpSystemEnabled })));
    const otherActors = uniqueActors(ownedActors
      .filter(actor => !partyActorIds.has(actor.id) && !sceneActorIds.has(actor.id) && !combatActorIds.has(actor.id))
      .map(actor => actorCard(actor, { xpSystemEnabled })));
    const factionSummary = FactionRegistryService.summarizeForWorkspace();
    const state = host?.getSurfaceState?.('workspace') || {};
    const selection = await buildSelectedActorSection(state.selectedActorId, { partyActors, combatActors, sceneActors, gmActors }, { xpSystemEnabled });
    const actorOptions = gmActors
      .map(actor => ({ id: actor.id, name: actor.name, type: actor.type, label: `${actor.name} (${actor.type})` }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const rosterSections = [
      { id: 'party', label: 'GM Party Roster', hint: 'GM-defined adventuring party. Player-linked actors are default members unless explicitly removed.', count: partyActors.length, actors: partyActors, empty: 'No party members yet. Drop actors into the party bay or use Manage Party Members.' },
      { id: 'combat', label: 'Active Combat', hint: 'Combat tracker participants.', count: combatActors.length, actors: combatActors, empty: 'No active combat roster.' },
      { id: 'scene', label: 'Current Scene', hint: scene ? `Tokens on ${scene.name}.` : 'No scene is currently active.', count: sceneActors.length, actors: sceneActors, empty: 'No actor tokens on the active scene.' },
      { id: 'other', label: 'Other GM-Owned Actors', hint: 'Owned actors outside party, combat, and scene rosters.', count: otherActors.length, actors: otherActors, empty: 'No other GM-owned actors.' }
    ];

    return {
      pageTitle: 'Workspace',
      pageDescription: 'GM roster cockpit for party, scene, combat, and owned actors',
      sceneName: scene?.name ?? 'No active scene',
      combatLabel: game.combat ? `Round ${game.combat.round || 1}` : 'No active combat',
      gmActors,
      rosterSections,
      xpSystemEnabled,
      selection,
      partyManager: {
        members: partyActors,
        availableActors: availablePartyActors,
        hasMembers: partyActors.length > 0,
        hasAvailableActors: availablePartyActors.length > 0,
        summary: GMPartyRosterService.summarizeActors(gmActors),
        dropHint: 'Drop Actors here from the sidebar, a compendium, a scene token, or a workspace card. Compendium actors will be imported into the world first.',
        removeHint: 'Drop a party card here or use the red remove button to take an actor out of the current party roster.'
      },
      factionManager: {
        count: factionSummary.count,
        factions: factionSummary.factions,
        actorOptions,
        relationshipTypes: FactionRegistryService.getRelationshipTypeOptions(),
        sourceTypes: FactionRegistryService.getSourceTypeOptions(),
        empty: 'No campaign factions are currently tracked.'
      },
      quickActions: [
        { route: 'bulletin', label: 'Send Notice', icon: 'fa-solid fa-paper-plane' },
        { route: 'jobs', label: 'Assign Job', icon: 'fa-solid fa-clipboard-list' },
        { route: 'healing', label: 'Recovery Tools', icon: 'fa-solid fa-heart-pulse' },
        { route: 'trade', label: 'Trade Console', icon: 'fa-solid fa-right-left' }
      ]
    };
  }
}
