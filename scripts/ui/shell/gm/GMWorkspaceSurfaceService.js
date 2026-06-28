/** GM actor workspace surface view-model. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { GMPartyRosterService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-party-roster-service.js';
import { isXPEnabled, determineLevelFromXP } from '/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js';
import { XP_LEVEL_THRESHOLDS, XP_MAX_LEVEL } from '/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js';

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
  const conditionTrack = Number(actor.system?.conditionTrack?.value ?? actor.system?.condition?.track ?? 0) || 0;
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

export class GMWorkspaceSurfaceService {
  static async buildViewModel() {
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
