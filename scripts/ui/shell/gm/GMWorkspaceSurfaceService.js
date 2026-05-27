/** GM actor workspace surface view-model. */

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
  return {
    id: actor.id,
    name: actor.name,
    type: actor.type,
    img: actor.img,
    ownerUsers,
    ownerLabel: ownerUsers.length ? ownerUsers.join(', ') : 'No linked player',
    hpValue,
    hpMax,
    hpLabel: hpMax ? `${hpValue}/${hpMax} HP` : 'HP unavailable',
    conditionTrack,
    conditionLabel: conditionTrack ? `CT ${conditionTrack}` : 'CT normal',
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
    const ownedActors = game.actors.filter((actor) => actor.isOwner);
    const scene = game.scenes?.active ?? globalThis.canvas?.scene ?? null;
    const sceneTokens = safeCollection(scene?.tokens).map(token => ({ token, actor: token.actor ?? game.actors?.get(token.actorId) })).filter(row => row.actor);
    const combatants = safeCollection(game.combat?.combatants).map(combatant => ({ combatant, actor: combatant.actor })).filter(row => row.actor);

    const playerActorIds = new Set(safeCollection(game.users).map(user => user?.character?.id).filter(Boolean));
    const sceneActorIds = new Set(sceneTokens.map(row => row.actor.id));
    const combatActorIds = new Set(combatants.map(row => row.actor.id));

    const playerActors = uniqueActors(ownedActors.filter(actor => playerActorIds.has(actor.id)).map(actor => actorCard(actor)));
    const sceneActors = uniqueActors(sceneTokens.map(({ token, actor }) => actorCard(actor, { inScene: true, sceneName: scene?.name ?? '', tokenName: token.name })));
    const combatActors = uniqueActors(combatants.map(({ actor }) => actorCard(actor, { inCombat: true, inScene: sceneActorIds.has(actor.id), sceneName: scene?.name ?? '' })));
    const otherActors = uniqueActors(ownedActors
      .filter(actor => !playerActorIds.has(actor.id) && !sceneActorIds.has(actor.id) && !combatActorIds.has(actor.id))
      .map(actor => actorCard(actor)));

    const gmActors = uniqueActors(ownedActors.map(actor => actorCard(actor)));
    const rosterSections = [
      { id: 'party', label: 'Player-linked Party', hint: 'Actors tied to logged-in player users.', count: playerActors.length, actors: playerActors, empty: 'No player-linked actors.' },
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
      quickActions: [
        { route: 'bulletin', label: 'Send Notice', icon: 'fa-solid fa-paper-plane' },
        { route: 'jobs', label: 'Assign Job', icon: 'fa-solid fa-clipboard-list' },
        { route: 'healing', label: 'Recovery Tools', icon: 'fa-solid fa-heart-pulse' },
        { route: 'trade', label: 'Trade Console', icon: 'fa-solid fa-right-left' }
      ]
    };
  }
}
