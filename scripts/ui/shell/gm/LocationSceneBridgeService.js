/**
 * LocationSceneBridgeService
 *
 * Scene launcher/factory helper. It links to, creates, activates, and stages
 * tokens on real Foundry Scene documents; it does not replace the Foundry Scene
 * system or store custom map documents.
 */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function gridSize(value) {
  const numeric = Math.floor(Number(value) || 100);
  return Math.max(0, numeric);
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function resolveScene(uuid = '') {
  const sceneUuid = text(uuid);
  if (!sceneUuid) return null;
  return fromUuid(sceneUuid).catch(() => null);
}

async function resolveActor(uuid = '') {
  const actorUuid = text(uuid);
  if (!actorUuid) return null;
  const doc = await fromUuid(actorUuid).catch(() => null);
  return doc?.documentName === 'Actor' || doc?.type ? doc : null;
}

async function rollQuantity(quantity = '1') {
  const formula = text(quantity, '1');
  if (/^\d+$/.test(formula)) return Math.max(1, Number(formula));
  try {
    const roll = await new Roll(formula).evaluate({ async: true });
    return Math.max(1, Math.floor(Number(roll.total) || 1));
  } catch (_err) {
    return 1;
  }
}

function layoutPosition(index = 0, scene = null) {
  const size = Number(scene?.grid?.size || scene?.grid?.sizeX || 100) || 100;
  const columns = 6;
  const margin = size;
  const x = margin + (index % columns) * size * 1.5;
  const y = margin + Math.floor(index / columns) * size * 1.5;
  return { x: Math.floor(x), y: Math.floor(y) };
}

export class LocationSceneBridgeService {
  static async getLinkedScene(locationOrId) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    const uuid = text(location?.map?.sceneUuid || location?.linkedSceneUuids?.[0] || '');
    return resolveScene(uuid);
  }

  static async openLinkedScene(locationOrId) {
    const scene = await this.getLinkedScene(locationOrId);
    if (scene?.view) return scene.view();
    return scene;
  }

  static async activateLinkedScene(locationOrId) {
    const scene = await this.getLinkedScene(locationOrId);
    if (!scene) return null;
    if (scene.activate) await scene.activate();
    else await scene.update?.({ active: true });
    return scene;
  }

  static async createSceneFromLocation(locationOrId, { activate = false, nameSuffix = '' } = {}) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    if (!location || !game.user?.isGM) return null;
    const map = location.map || {};
    const img = text(map.imagePath || location.image || '');
    if (!img) throw new Error('Location needs a map image path before a Scene can be created.');
    const sceneData = {
      name: `${location.name}${nameSuffix ? ` ${nameSuffix}` : ''}`,
      active: Boolean(activate),
      img,
      grid: { size: gridSize(map.defaultGrid) },
      padding: Number(map.defaultPadding ?? 0.25),
      navigation: true,
      flags: {
        'foundryvtt-swse': {
          sourceLocationId: location.id,
          sourceLocationName: location.name,
          sceneFactory: 'locations'
        }
      }
    };
    if (Number(map.defaultWidth) > 0) sceneData.width = Number(map.defaultWidth);
    if (Number(map.defaultHeight) > 0) sceneData.height = Number(map.defaultHeight);
    const scene = await Scene.create(sceneData);
    if (scene?.uuid) await LocationRegistryService.linkScene(location.id, scene.uuid, { primary: true });
    return scene;
  }

  static async createEncounterScene(locationOrId, options = {}) {
    return this.createSceneFromLocation(locationOrId, { ...options, nameSuffix: options.nameSuffix ?? 'Encounter' });
  }

  static async stageEncounterSeeds(locationOrId, { sceneUuid = '', seedIds = [], createIfMissing = true, activate = false } = {}) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    if (!location || !game.user?.isGM) return { scene: null, created: [], skipped: [] };
    let scene = await resolveScene(sceneUuid) || await this.getLinkedScene(location);
    if (!scene && createIfMissing) scene = await this.createEncounterScene(location, { activate });
    if (!scene) throw new Error('No linked Scene exists. Add a map image and create a Scene first.');

    const allowedIds = new Set((Array.isArray(seedIds) ? seedIds : []).filter(Boolean));
    const seeds = (location.encounterSeeds || []).filter(seed => !allowedIds.size || allowedIds.has(seed.id));
    const tokenData = [];
    const skipped = [];
    let tokenIndex = 0;

    for (const seed of seeds) {
      const actor = await resolveActor(seed.uuid);
      if (!actor?.getTokenDocument) {
        skipped.push({ seed, reason: 'Actor UUID could not be resolved.' });
        continue;
      }
      const quantity = await rollQuantity(seed.quantity || '1');
      for (let i = 0; i < quantity; i += 1) {
        const position = layoutPosition(tokenIndex, scene);
        tokenIndex += 1;
        const token = await actor.getTokenDocument(position);
        const data = token.toObject();
        data.name = quantity > 1 ? `${seed.name || actor.name} ${i + 1}` : (seed.name || actor.name);
        if (seed.img) {
          data.texture = data.texture || {};
          data.texture.src = seed.img;
        }
        if (seed.tokenHidden) data.hidden = true;
        if (seed.tokenDisposition && !Number.isNaN(Number(seed.tokenDisposition))) data.disposition = Number(seed.tokenDisposition);
        tokenData.push(data);
      }
    }

    const created = tokenData.length ? await scene.createEmbeddedDocuments('Token', tokenData) : [];
    if (activate && scene.activate) await scene.activate();
    return { scene, created, skipped };
  }
}
