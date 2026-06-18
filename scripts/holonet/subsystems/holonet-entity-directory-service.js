/**
 * Holonet Entity Directory Service
 *
 * Provides mention-picker data for GM Bulletin and Messenger composers.
 * The first pass favors real world content already present in Foundry:
 * actors, scenes, journal entries, and current state labels.
 */

import { HolonetStateService } from './holonet-state-service.js';

function uniqBy(items = [], keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}


function collectionValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.contents !== 'undefined') return Array.from(value.contents ?? []);
  if (typeof value.values === 'function') return Array.from(value.values());
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function imageFromTextureRecord(record) {
  if (!record) return null;
  if (typeof record === 'string') return record || null;
  return record.src || record.path || record.texture || record.img || null;
}

function scenePreviewImage(scene) {
  if (!scene) return null;
  if (scene.thumb) return scene.thumb;

  const levels = [
    scene.activeLevel,
    scene.level,
    ...collectionValues(scene.levels),
    ...collectionValues(scene._source?.levels),
    ...collectionValues(scene.toObject?.()?.levels)
  ].filter(Boolean);

  for (const level of levels) {
    const direct = imageFromTextureRecord(level.background);
    if (direct) return direct;
    const textures = level.textures ?? level._source?.textures ?? {};
    const texture = imageFromTextureRecord(textures.background) || imageFromTextureRecord(textures.base) || imageFromTextureRecord(textures.scene);
    if (texture) return texture;
  }

  // Legacy v13 fallback: read raw source data, not the deprecated Scene#background getter.
  return scene._source?.background?.src || scene.toObject?.()?.background?.src || null;
}

function actorMention(actor, group) {
  if (!actor?.name) return null;
  return {
    id: `${group}:${actor.id}`,
    token: `@${actor.name}`,
    label: actor.name,
    group,
    subtitle: actor.type,
    img: actor.img || null
  };
}

function sceneMention(scene) {
  if (!scene?.name) return null;
  return {
    id: `location:${scene.id}`,
    token: `@${scene.name}`,
    label: scene.name,
    group: 'locations',
    subtitle: 'scene',
    img: scenePreviewImage(scene)
  };
}

function journalMention(entry, group = 'factions') {
  if (!entry?.name) return null;
  return {
    id: `${group}:${entry.id}`,
    token: `@${entry.name}`,
    label: entry.name,
    group,
    subtitle: 'journal',
    img: entry.img || null
  };
}

export class HolonetEntityDirectoryService {
  static DEFAULT_TAGS = [
    '#mission',
    '#warning',
    '#urgent',
    '#reward',
    '#rumor',
    '#news',
    '#training',
    '#store'
  ];

  static async buildDirectory() {
    const actors = game.actors?.contents ?? [];
    const users = game.users?.contents ?? [];
    const scenes = game.scenes?.contents ?? [];
    const journals = game.journal?.contents ?? [];
    const playerState = await HolonetStateService.getAllPlayerState();
    const partyState = await HolonetStateService.getPartyState();

    const playerActors = uniqBy([
      ...users.map(user => user.character).filter(Boolean),
      ...actors.filter(actor => ['character', 'droid'].includes(actor.type))
    ].map(actor => actorMention(actor, 'characters')).filter(Boolean), item => item.token.toLowerCase());

    const npcActors = uniqBy(
      actors.filter(actor => ['npc', 'beast'].includes(actor.type)).map(actor => actorMention(actor, 'npcs')).filter(Boolean),
      item => item.token.toLowerCase()
    );

    const shipActors = uniqBy(
      actors.filter(actor => actor.type === 'vehicle').map(actor => actorMention(actor, 'ships')).filter(Boolean),
      item => item.token.toLowerCase()
    );

    const factionJournals = uniqBy(
      journals
        .filter(entry => /faction|guild|order|clan|house|alliance|empire|republic/i.test(`${entry.name} ${entry.folder?.name ?? ''}`))
        .map(entry => journalMention(entry, 'factions'))
        .filter(Boolean),
      item => item.token.toLowerCase()
    );

    const locationNames = new Set();
    if (partyState?.location) locationNames.add(partyState.location);
    for (const value of Object.values(playerState || {})) {
      if (value?.location) locationNames.add(value.location);
    }

    const stateLocations = Array.from(locationNames).map((name, index) => ({
      id: `state-location:${index}:${name}`,
      token: `@${name}`,
      label: name,
      group: 'locations',
      subtitle: 'state',
      img: null
    }));

    const sceneLocations = scenes.map(sceneMention).filter(Boolean);
    const locationJournals = journals
      .filter(entry => /location|planet|system|sector|station|temple|outpost|port|world/i.test(`${entry.name} ${entry.folder?.name ?? ''}`))
      .map(entry => journalMention(entry, 'locations'))
      .filter(Boolean);

    const locations = uniqBy([...stateLocations, ...sceneLocations, ...locationJournals], item => item.token.toLowerCase());

    return {
      groups: [
        { id: 'characters', label: 'Characters', items: playerActors },
        { id: 'npcs', label: 'NPCs', items: npcActors },
        { id: 'ships', label: 'Ships', items: shipActors },
        { id: 'factions', label: 'Factions', items: factionJournals },
        { id: 'locations', label: 'Locations', items: locations }
      ],
      tagSuggestions: this.DEFAULT_TAGS.map(token => ({ id: token, token, label: token.slice(1), group: 'tags', subtitle: 'topic' }))
    };
  }

  static async getMentionOptions() {
    const directory = await this.buildDirectory();
    return directory.groups.flatMap(group => group.items);
  }
}
