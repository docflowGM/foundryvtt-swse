/**
 * StoreAcquisitionService
 *
 * Shared acquisition helpers for store-created or GM-approved actors.
 *
 * Boundaries:
 * - StoreEngine/Store UI decide what is being bought.
 * - TransactionEngine owns the commerce transaction and credit audit.
 * - ActorEngine executes the actual actor mutations.
 * - This service only builds ownership/linkage data and mutation-plan fragments.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const SYSTEM_ID = 'foundryvtt-swse';

function clone(value) {
  if (value === undefined || value === null) return value;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  try { return structuredClone(value); } catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function ownerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
}

function observerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
}

function normalizeActorType(type) {
  const key = String(type || '').toLowerCase();
  if (key === 'starship') return 'vehicle';
  if (key === 'ship') return 'vehicle';
  return key || 'actor';
}

function isAssetActorType(type) {
  const key = normalizeActorType(type);
  return key === 'droid' || key === 'vehicle';
}

function getFlags(data = {}) {
  data.flags ??= {};
  data.flags[SYSTEM_ID] ??= {};
  return data.flags[SYSTEM_ID];
}

function getSystem(data = {}) {
  data.system ??= {};
  return data.system;
}

function resolveUserName(userId) {
  if (!userId) return null;
  return globalThis.game?.users?.get?.(userId)?.name ?? null;
}

function dedupeById(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    const id = String(entry?.id || '').trim();
    if (!id) continue;
    map.set(id, { ...entry, id });
  }
  return Array.from(map.values());
}

function dedupeByUuid(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    const uuid = String(entry?.uuid || '').trim();
    if (!uuid) continue;
    map.set(uuid, { ...entry, uuid });
  }
  return Array.from(map.values());
}

export class StoreAcquisitionService {
  static isAssetActorType(type) {
    return isAssetActorType(type);
  }

  static resolveOwnerUser(ownerActor, explicitUserId = null) {
    const users = globalThis.game?.users;
    if (explicitUserId && users?.get?.(explicitUserId)) return users.get(explicitUserId);

    const characterOwner = users?.find?.(user => user?.character?.id === ownerActor?.id);
    if (characterOwner) return characterOwner;

    const ownership = ownerActor?.ownership || {};
    const bestOwner = users?.find?.(user => {
      if (!user || user.isGM) return false;
      const level = Number(ownership?.[user.id] ?? 0);
      return level >= ownerLevel();
    });
    if (bestOwner) return bestOwner;

    if (globalThis.game?.user && !globalThis.game.user.isGM) return globalThis.game.user;
    return null;
  }

  static buildActorOwnership(ownerActor, options = {}) {
    const { ownerUserId = null, includeCurrentGM = true } = options;
    const ownerUser = this.resolveOwnerUser(ownerActor, ownerUserId);
    const ownership = { default: 0 };

    if (ownerUser?.id) ownership[ownerUser.id] = ownerLevel();

    // Preserve direct owner entries from the purchasing actor where possible so
    // assistant players / co-owners can still open the purchased asset.
    for (const [userId, level] of Object.entries(ownerActor?.ownership || {})) {
      if (!userId || userId === 'default') continue;
      const numeric = Number(level || 0);
      if (numeric >= ownerLevel()) ownership[userId] = ownerLevel();
      else if (numeric >= observerLevel() && ownership[userId] === undefined) ownership[userId] = observerLevel();
    }

    if (includeCurrentGM && globalThis.game?.user?.isGM && globalThis.game.user.id) {
      ownership[globalThis.game.user.id] = ownerLevel();
    }

    return ownership;
  }

  static buildAcquisitionMetadata(options = {}) {
    const {
      ownerActor,
      ownerUserId = null,
      transactionId = null,
      transactionContext = 'store-purchase',
      audit = {},
      source = 'store',
      acquiredAt = Date.now()
    } = options;

    const ownerUser = this.resolveOwnerUser(ownerActor, ownerUserId);

    return {
      source,
      transactionId,
      transactionContext,
      acquiredAt,
      ownerActorId: ownerActor?.id ?? null,
      ownerActorName: ownerActor?.name ?? null,
      ownerUserId: ownerUser?.id ?? ownerUserId ?? null,
      ownerUserName: ownerUser?.name ?? resolveUserName(ownerUserId),
      requestId: audit?.requestId ?? audit?.approvalId ?? null,
      approvalType: audit?.approvalType ?? null,
      gmNotes: audit?.gmNotes ?? audit?.gmReason ?? ''
    };
  }

  static prepareCreateActorSpec(spec = {}, options = {}) {
    if (!spec?.data || !isAssetActorType(spec.type || spec.data?.type)) return spec;

    const prepared = clone(spec);
    prepared.data = clone(prepared.data || {});
    const system = getSystem(prepared.data);
    const flags = getFlags(prepared.data);
    const metadata = this.buildAcquisitionMetadata(options);

    prepared.data.ownership = this.buildActorOwnership(options.ownerActor, {
      ownerUserId: metadata.ownerUserId,
      includeCurrentGM: true
    });

    flags.storeAcquisition = {
      ...(flags.storeAcquisition || {}),
      ...metadata,
      createdFromStore: true
    };

    system.ownedByActorId = metadata.ownerActorId;
    system.ownedByActorName = metadata.ownerActorName;
    system.storeAcquisition = {
      ...(system.storeAcquisition || {}),
      transactionId: metadata.transactionId,
      source: metadata.source,
      acquiredAt: metadata.acquiredAt
    };

    return prepared;
  }

  static prepareCreateActorPlans(plans = [], options = {}) {
    const preparedPlans = [];
    const createdSpecs = [];

    for (const plan of plans || []) {
      const preparedPlan = clone(plan || {});
      if (preparedPlan.create?.actors?.length) {
        preparedPlan.create.actors = preparedPlan.create.actors.map(spec => {
          const prepared = this.prepareCreateActorSpec(spec, options);
          if (isAssetActorType(prepared?.type || prepared?.data?.type)) createdSpecs.push(prepared);
          return prepared;
        });
      }
      preparedPlans.push(preparedPlan);
    }

    return { plans: preparedPlans, createdSpecs };
  }

  static buildOwnerLinkEntry(specOrActor = {}, options = {}) {
    const data = specOrActor.data || specOrActor;
    const id = specOrActor.temporaryId || specOrActor.id || data.id || data._id;
    const type = normalizeActorType(specOrActor.type || data.type);
    if (!id || !isAssetActorType(type)) return null;

    const metadata = this.buildAcquisitionMetadata(options);
    return {
      id,
      uuid: String(id).startsWith('Actor.') ? id : `Actor.${id}`,
      name: data.name || 'Purchased Asset',
      type,
      img: data.img || 'icons/svg/mystery-man.svg',
      source: 'store',
      role: type === 'droid' ? 'droid' : 'vehicle',
      transactionId: metadata.transactionId,
      acquiredAt: metadata.acquiredAt,
      ownerActorId: metadata.ownerActorId,
      notes: metadata.gmNotes || ''
    };
  }

  static buildRelationshipEntry(specOrActor = {}, options = {}) {
    const link = this.buildOwnerLinkEntry(specOrActor, options);
    if (!link) return null;
    const typeLabel = link.type === 'droid' ? 'asset-droid' : 'asset-vehicle';
    return {
      uuid: link.uuid,
      id: link.id,
      name: link.name,
      img: link.img,
      type: typeLabel,
      notes: link.notes || 'Store-acquired asset',
      source: 'store',
      transactionId: link.transactionId,
      acquiredAt: link.acquiredAt
    };
  }

  static buildOwnerLinkPlan(ownerActor, actorSpecs = [], options = {}) {
    if (!ownerActor || !Array.isArray(actorSpecs) || actorSpecs.length === 0) return null;

    const links = actorSpecs
      .map(spec => this.buildOwnerLinkEntry(spec, options))
      .filter(Boolean);
    if (links.length === 0) return null;

    const relationships = actorSpecs
      .map(spec => this.buildRelationshipEntry(spec, options))
      .filter(Boolean);

    const existingOwned = Array.isArray(ownerActor.system?.ownedActors)
      ? clone(ownerActor.system.ownedActors)
      : [];
    const existingRelationships = Array.isArray(ownerActor.system?.relationships)
      ? clone(ownerActor.system.relationships)
      : [];

    return {
      set: {
        'system.ownedActors': dedupeById([...existingOwned, ...links]),
        'system.relationships': dedupeByUuid([...existingRelationships, ...relationships])
      }
    };
  }

  static buildExistingAssetUpdate(assetActor, options = {}) {
    if (!assetActor || !isAssetActorType(assetActor.type)) return {};

    const metadata = this.buildAcquisitionMetadata(options);
    const ownership = this.buildActorOwnership(options.ownerActor, {
      ownerUserId: metadata.ownerUserId,
      includeCurrentGM: true
    });

    return {
      ownership,
      [`flags.${SYSTEM_ID}.storeAcquisition`]: {
        ...metadata,
        approvedFromDraft: true
      },
      [`flags.-=${SYSTEM_ID}.pendingApproval`]: null,
      [`flags.-=${SYSTEM_ID}.draftOnly`]: null,
      [`flags.-=${SYSTEM_ID}.ownerPlayerId`]: null,
      'system.ownedByActorId': metadata.ownerActorId,
      'system.ownedByActorName': metadata.ownerActorName,
      'system.storeAcquisition': {
        transactionId: metadata.transactionId,
        source: metadata.source,
        acquiredAt: metadata.acquiredAt
      }
    };
  }

  static summarizeAssetSpecs(actorSpecs = [], options = {}) {
    return actorSpecs
      .map(spec => this.buildOwnerLinkEntry(spec, options))
      .filter(Boolean)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        type: entry.type,
        img: entry.img,
        transactionId: entry.transactionId
      }));
  }

  static log(message, data = {}) {
    SWSELogger.debug?.(`StoreAcquisitionService: ${message}`, data);
  }
}
