/**
 * AssetGrantService
 *
 * GM-facing ownership/access grant helper for droid and vehicle actors.
 * This is intentionally not a store purchase path: Store/Transaction Engine
 * remains the player acquisition path. This service is for GM grants, Job Board
 * asset rewards, and Garage/Shipyard admin assignment of one existing asset to
 * one or more owner actors.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

const SYSTEM_ID = 'foundryvtt-swse';

function clone(value) {
  if (value == null) return value;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  try { return structuredClone(value); } catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (value instanceof Map) return Array.from(value.values());
  if (Array.isArray(value.contents)) return value.contents;
  if (typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') return Array.from(value);
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function nowIso() {
  return new Date().toISOString();
}

function ownerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
}

function observerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
}

function normalizeActorType(type) {
  const key = String(type || '').toLowerCase().trim();
  if (key === 'ship' || key === 'starship') return 'vehicle';
  return key;
}

function isGrantableAsset(actor) {
  const type = normalizeActorType(actor?.type);
  return type === 'droid' || type === 'vehicle';
}

function assetKind(actor) {
  return normalizeActorType(actor?.type) === 'vehicle' ? 'ship' : 'droid';
}

function roleForAsset(actor) {
  return normalizeActorType(actor?.type) === 'vehicle' ? 'vehicle' : 'droid';
}

function uniqueActors(actors = []) {
  const map = new Map();
  for (const actor of actors || []) {
    if (!actor?.id) continue;
    map.set(actor.id, actor);
  }
  return Array.from(map.values());
}

function dedupeById(entries = []) {
  const map = new Map();
  for (const entry of entries || []) {
    const id = String(entry?.id || entry?.actorId || '').trim();
    if (!id) continue;
    map.set(id, { ...entry, id });
  }
  return Array.from(map.values());
}

function dedupeByUuid(entries = []) {
  const map = new Map();
  for (const entry of entries || []) {
    const uuid = String(entry?.uuid || '').trim();
    if (!uuid) continue;
    map.set(uuid, { ...entry, uuid });
  }
  return Array.from(map.values());
}

function usersForActor(actor) {
  const users = asArray(globalThis.game?.users?.contents ?? globalThis.game?.users ?? []);
  const ownership = actor?.ownership || {};
  return users.filter(user => {
    if (!user?.id || user.isGM) return false;
    if (user.character?.id === actor?.id) return true;
    return Number(ownership[user.id] || 0) >= ownerLevel();
  });
}

function buildAssetDocumentOwnership(assetActor, recipientActors = [], options = {}) {
  const ownership = { ...(assetActor?.ownership || {}) };
  ownership.default = Number(ownership.default || 0);

  for (const recipient of recipientActors) {
    for (const user of usersForActor(recipient)) {
      ownership[user.id] = Math.max(Number(ownership[user.id] || 0), options.ownerAccessLevel ?? ownerLevel());
    }
  }

  if (globalThis.game?.user?.isGM && globalThis.game.user.id) {
    ownership[globalThis.game.user.id] = Math.max(Number(ownership[globalThis.game.user.id] || 0), ownerLevel());
  }

  return ownership;
}

function buildOwnerLinkEntry(assetActor, ownerActor, options = {}) {
  const type = normalizeActorType(assetActor?.type);
  if (!assetActor?.id || !isGrantableAsset(assetActor)) return null;
  const grantedAt = options.grantedAt || nowIso();
  return {
    id: assetActor.id,
    actorId: assetActor.id,
    uuid: assetActor.uuid || `Actor.${assetActor.id}`,
    name: assetActor.name || 'Granted Asset',
    type,
    img: assetActor.img || 'icons/svg/mystery-man.svg',
    source: options.grantSource || 'gm-grant',
    role: roleForAsset(assetActor),
    ownerActorId: ownerActor?.id ?? null,
    shared: options.shared === true,
    grantSource: options.grantSource || 'gm-grant',
    grantSourceThreadId: options.sourceThreadId || null,
    grantedAt,
    grantedBy: options.requesterId || globalThis.game?.user?.id || null,
    notes: options.notes || ''
  };
}

function buildRelationshipEntry(assetActor, ownerActor, options = {}) {
  const link = buildOwnerLinkEntry(assetActor, ownerActor, options);
  if (!link) return null;
  return {
    uuid: link.uuid,
    id: link.id,
    actorId: link.actorId,
    name: link.name,
    img: link.img,
    type: link.type === 'droid' ? 'asset-droid' : 'asset-vehicle',
    source: link.source,
    notes: link.notes || (link.shared ? 'Shared GM-granted asset' : 'GM-granted asset'),
    shared: link.shared,
    grantSource: link.grantSource,
    grantSourceThreadId: link.grantSourceThreadId,
    grantedAt: link.grantedAt
  };
}

function existingArray(actor, path) {
  const value = foundry?.utils?.getProperty?.(actor, path);
  return Array.isArray(value) ? clone(value) : [];
}

function actorSummary(actor) {
  return actor ? { id: actor.id, name: actor.name, type: actor.type } : null;
}

export class AssetGrantService {
  static isGrantableAsset(actor) {
    return isGrantableAsset(actor);
  }

  static assetCandidates({ includeUnowned = true } = {}) {
    const actors = asArray(globalThis.game?.actors?.contents ?? globalThis.game?.actors ?? [])
      .filter(actor => isGrantableAsset(actor));
    return actors
      .filter(actor => includeUnowned || actor.system?.ownedByActorId || actor.system?.assetOwnership)
      .map(actor => ({
        id: actor.id,
        uuid: actor.uuid || `Actor.${actor.id}`,
        name: actor.name || 'Unnamed Asset',
        img: actor.img || 'icons/svg/mystery-man.svg',
        type: normalizeActorType(actor.type),
        kind: assetKind(actor),
        typeLabel: normalizeActorType(actor.type) === 'vehicle' ? 'Ship / Vehicle' : 'Droid'
      }))
      .sort((a, b) => `${a.typeLabel} ${a.name}`.localeCompare(`${b.typeLabel} ${b.name}`));
  }

  static async grantAssetAccess({
    assetActor,
    recipientActors = [],
    primaryOwnerActor = null,
    shared = true,
    grantSource = 'gm-grant',
    sourceThreadId = null,
    requesterId = null,
    notes = '',
    updateDocumentOwnership = true
  } = {}) {
    if (!isGrantableAsset(assetActor)) {
      throw new Error('Only droid and vehicle actors can be granted through AssetGrantService.');
    }

    const recipients = uniqueActors(recipientActors).filter(actor => actor?.id);
    if (!recipients.length) throw new Error('No recipient actors were provided for asset grant.');

    const primary = recipients.find(actor => actor.id === primaryOwnerActor?.id) ?? recipients[0];
    const grantedAt = nowIso();
    const recipientIds = recipients.map(actor => actor.id);
    const recipientNames = recipients.map(actor => actor.name || actor.id);
    const actorType = normalizeActorType(assetActor.type);
    const kind = assetKind(assetActor);

    const existingOwnership = assetActor.system?.assetOwnership && typeof assetActor.system.assetOwnership === 'object'
      ? clone(assetActor.system.assetOwnership)
      : {};
    const ownerActorIds = Array.from(new Set([
      ...asArray(existingOwnership.ownerActorIds).map(String),
      primary.id,
      ...(shared ? recipientIds : [])
    ].filter(Boolean)));
    const accessActorIds = Array.from(new Set([
      ...asArray(existingOwnership.accessActorIds).map(String),
      ...recipientIds
    ].filter(Boolean)));

    const assetUpdate = {
      'system.assetOwnership': {
        ...existingOwnership,
        kind,
        type: actorType,
        shared: shared === true,
        primaryOwnerActorId: primary.id,
        primaryOwnerActorName: primary.name || '',
        ownerActorIds,
        accessActorIds,
        accessActorNames: recipientNames,
        grantSource,
        grantSourceThreadId: sourceThreadId,
        grantedBy: requesterId || globalThis.game?.user?.id || null,
        grantedAt: existingOwnership.grantedAt || grantedAt,
        lastGrantedAt: grantedAt,
        notes
      },
      'system.ownedByActorId': primary.id,
      'system.ownedByActorName': primary.name || '',
      [`flags.${SYSTEM_ID}.assetGrant`]: {
        source: grantSource,
        sourceThreadId,
        requesterId: requesterId || globalThis.game?.user?.id || null,
        grantedAt,
        shared: shared === true,
        primaryOwnerActorId: primary.id,
        recipientActorIds: recipientIds,
        notes
      }
    };

    if (updateDocumentOwnership) {
      assetUpdate.ownership = buildAssetDocumentOwnership(assetActor, recipients, { ownerAccessLevel: ownerLevel() });
    }

    await ActorEngine.updateActor(assetActor, assetUpdate, {
      source: 'AssetGrantService.grantAssetAccess.asset',
      suppressAppRefresh: true,
      skipRender: true
    });

    for (const recipient of recipients) {
      const link = buildOwnerLinkEntry(assetActor, recipient, { grantSource, sourceThreadId, requesterId, notes, shared, grantedAt });
      const relationship = buildRelationshipEntry(assetActor, recipient, { grantSource, sourceThreadId, requesterId, notes, shared, grantedAt });
      const ownedActors = dedupeById([...existingArray(recipient, 'system.ownedActors'), link]);
      const relationships = dedupeByUuid([...existingArray(recipient, 'system.relationships'), relationship]);

      await ActorEngine.updateActor(recipient, {
        'system.ownedActors': ownedActors,
        'system.relationships': relationships
      }, {
        source: 'AssetGrantService.grantAssetAccess.recipient',
        suppressAppRefresh: true,
        skipRender: true
      });
    }

    return {
      success: true,
      asset: actorSummary(assetActor),
      primaryOwner: actorSummary(primary),
      recipients: recipients.map(actorSummary),
      shared: shared === true,
      grantSource,
      grantedAt
    };
  }
}

export default AssetGrantService;
