import { ItemCustomizationWorkbench } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js";

const SYSTEM_ID = "foundryvtt-swse";

export function resolveCustomizationCategory(item, fallback = null) {
  if (fallback) return normalizeCategory(fallback);
  if (!item) return null;
  const subtype = String(item.system?.subtype || item.system?.weaponCategory || item.system?.category || '').toLowerCase();
  const type = String(item.type || '').toLowerCase();
  if (type === 'lightsaber' || subtype === 'lightsaber') return 'lightsaber';
  if (type === 'blaster' || type === 'weapon') return 'weapons';
  if (type === 'armor' || type === 'bodysuit') return 'armor';
  if (type === 'gear' || type === 'equipment' || type === 'tool' || type === 'tech') return 'gear';
  return null;
}

export function normalizeCategory(category) {
  const value = String(category || '').toLowerCase();
  if (value === 'weapon' || value === 'weapons' || value === 'blaster' || value === 'melee') return 'weapons';
  if (value === 'armor' || value === 'bodysuit') return 'armor';
  if (value === 'gear' || value === 'equipment' || value === 'tool' || value === 'tech') return 'gear';
  if (value === 'lightsaber' || value === 'saber') return 'lightsaber';
  return category || null;
}

export function isCustomizableItem(item) {
  if (!item) return false;
  return ItemCustomizationWorkbench.supportsItem(item);
}

function isDocumentLike(value) {
  return !!value && typeof value === 'object' && (value.documentName || value.uuid || value.id || value._id);
}

async function resolveActorReference(actorRef) {
  if (!actorRef) return null;
  if (actorRef?.documentName === 'Actor' || actorRef?.items) return actorRef;
  if (typeof actorRef === 'string') {
    try {
      const byUuid = actorRef.includes('.') ? await fromUuid(actorRef) : null;
      if (byUuid?.documentName === 'Actor' || byUuid?.items) return byUuid;
    } catch (err) {
      console.warn('[CustomizationRouter] Actor UUID resolution failed', actorRef, err);
    }
    return game.actors?.get?.(actorRef) || null;
  }
  return null;
}

async function resolveItemReference(actor, itemRef, options = {}) {
  if (options.sourceItem) return options.sourceItem;
  if (!itemRef) {
    const itemId = options.itemId;
    return itemId && actor?.items?.get ? actor.items.get(itemId) : null;
  }
  if (typeof itemRef === 'string') {
    const owned = actor?.items?.get?.(itemRef);
    if (owned) return owned;
    try {
      const byUuid = itemRef.includes('.') ? await fromUuid(itemRef) : null;
      if (byUuid) return byUuid;
    } catch (err) {
      console.warn('[CustomizationRouter] Item UUID resolution failed', itemRef, err);
    }
    return null;
  }
  if (isDocumentLike(itemRef) || typeof itemRef === 'object') return itemRef;
  return null;
}

function openResolvedItemCustomization(actor, item = null, options = {}) {
  if (!actor) {
    ui?.notifications?.warn?.('No actor selected for customization.');
    return null;
  }

  try {
    const sourceItem = options.sourceItem || item || null;
    const category = resolveCustomizationCategory(sourceItem, options.initialCategory || options.category);
    const itemId = sourceItem?.id || sourceItem?._id || options.itemId || null;

    if (sourceItem && !ItemCustomizationWorkbench.supportsItem(sourceItem)) {
      ui?.notifications?.warn?.(`No customization available for ${sourceItem.type}`);
      return null;
    }

    return new ItemCustomizationWorkbench(actor, {
      itemId,
      category: category || 'weapons',
      mode: options.mode || options.inventoryMode || (category === 'lightsaber' && !sourceItem ? 'construct' : 'owned'),
      sourceItem,
      applyMode: options.applyMode,
      onStage: options.onStage
    }).render(true);
  } catch (error) {
    console.error('[CustomizationRouter] Failed to open customization UI', error);
    ui?.notifications?.error?.('Failed to open customization interface');
    return null;
  }
}

/**
 * Open the one true item customization workbench.
 *
 * This is the public route for character sheets, item sheets, store staging,
 * compatibility wrappers, and shell launchers. It accepts live documents for
 * the normal V2 path and delegates string UUID/ID inputs to the async reference
 * helper so older callers do not resurrect retired workbench UIs.
 *
 * @param {Actor|string} actor
 * @param {Item|Object|string|null} item
 * @param {Object} options
 * @returns {ApplicationV2|Promise<ApplicationV2|null>|null}
 */
export function openItemCustomization(actor, item = null, options = {}) {
  if (typeof actor === 'string' || typeof item === 'string') {
    return openItemCustomizationByReference(actor, item, options);
  }
  return openResolvedItemCustomization(actor, item, options);
}

export async function openItemCustomizationByReference(actorRef, itemRef = null, options = {}) {
  const actor = await resolveActorReference(actorRef);
  if (!actor) {
    ui?.notifications?.error?.('Actor not found for customization.');
    return null;
  }
  const item = await resolveItemReference(actor, itemRef, options);
  return openResolvedItemCustomization(actor, item, options);
}

export function openLightsaberWorkbench(actor, item = null, options = {}) {
  return openItemCustomization(actor, item, {
    ...options,
    initialCategory: 'lightsaber',
    mode: options.mode || (item ? 'owned' : 'construct')
  });
}

export function openWorkbenchForCategory(actor, category = 'weapons', options = {}) {
  return openItemCustomization(actor, null, {
    ...options,
    initialCategory: normalizeCategory(category) || 'weapons'
  });
}

export async function openCustomizationWorkbench(actorRef, itemRef = null, category = null, options = {}) {
  return openItemCustomizationByReference(actorRef, itemRef, {
    ...options,
    initialCategory: normalizeCategory(category || options.initialCategory || options.category)
  });
}

export function installCustomizationLauncherGlobals() {
  CONFIG[`${SYSTEM_ID}.CustomizationWorkbench`] = ItemCustomizationWorkbench;
  CONFIG.SWSE = CONFIG.SWSE || {};
  CONFIG.SWSE.openItemCustomization = openItemCustomization;
  CONFIG.SWSE.openCustomizationWorkbench = openCustomizationWorkbench;
  window.openItemCustomization = openItemCustomization;
  window.openCustomizationWorkbench = openCustomizationWorkbench;
}

export default {
  openItemCustomization,
  openItemCustomizationByReference,
  openLightsaberWorkbench,
  openWorkbenchForCategory,
  openCustomizationWorkbench,
  installCustomizationLauncherGlobals,
  isCustomizableItem,
  resolveCustomizationCategory,
  normalizeCategory
};
