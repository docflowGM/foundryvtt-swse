/**
 * Purchase and checkout functionality for SWSE Store
 * UI-only module: Coordinates with StoreEngine for all business logic
 *
 * ARCHITECTURE:
 * - Cart management (transient UI state)
 * - Inventory lookup (via engine-provided store.itemsById, with finalCost pre-calculated)
 * - Business logic (ALL delegated to StoreEngine)
 */

import { storeItemDocumentData, hydrateStoreListings } from "/systems/foundryvtt-swse/scripts/engine/store/store-catalog.js";
import { StoreEngine } from "/systems/foundryvtt-swse/scripts/engine/store/store-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { evaluateVehicleMerchantPurchase } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-store-eligibility.js";
import { getRandomDialogue } from "/systems/foundryvtt-swse/scripts/apps/store/store-shared.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { beginStoreDroidConstruction } from "/systems/foundryvtt-swse/scripts/engine/store/store-droid-construction.js";
import { launchNewProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { isStoreItemPurchasable } from "/systems/foundryvtt-swse/scripts/engine/store/policy-service.js";



function positiveCreditsOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

/**
 * The merchant's current offer for one vehicle condition. Strict: only the explicit conditions 'new' and 'used'
 * have a price, each from its own published-price-derived final cost. There is no fallback between conditions,
 * no fallback to base prices, and an unspecified condition never defaults to 'new'.
 */
function getVehicleConditionCost(vehicleTemplate, condition) {
    if (condition === 'used') return positiveCreditsOrNull(vehicleTemplate?.finalCostUsed);
    if (condition === 'new') return positiveCreditsOrNull(vehicleTemplate?.finalCostNew);
    return null;
}

function isValidVehicleConditionCost(value) {
    return positiveCreditsOrNull(value) !== null;
}

function storeI18n(key, data = {}) {
  try {
    return game.i18n?.format?.(key, data) ?? game.i18n?.localize?.(key) ?? key;
  } catch (_err) {
    return key;
  }
}

function storeApprovalSuffix(requiresApproval) {
  return requiresApproval ? storeI18n('SWSE.Store.Notifications.GmApprovalRequiredSuffix') : '';
}

/**
 * Add item to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} itemId - ID of item to add
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addItemToCart(store, itemId, updateDialogueCallback, options = {}) {
    if (!itemId) {
        ui.notifications.warn(storeI18n('SWSE.Store.Notifications.InvalidItemSelection'));
        SWSELogger.error('SWSE Store | addItemToCart called with empty itemId');
        return;
    }

    // Exact catalog identity only: world Items, `_id` aliases and generated ids are not retail stock.
    const item = store.itemsById.get(itemId);
    if (!item || item.type === 'vehicle' || item.type === 'droid') {
        ui.notifications.error(storeI18n('SWSE.Store.Notifications.ItemNotFound', { id: itemId }));
        SWSELogger.error(`SWSE Store | Listing not found in the store catalog: ${itemId}`);
        return;
    }

    const policyCheck = isStoreItemPurchasable(item, { allowApprovalRequired: true });
    if (!policyCheck.ok) {
        ui.notifications.warn(policyCheck.reason || storeI18n('SWSE.Store.Notifications.ListingCannotPurchase'));
        return;
    }

    // Engine provides finalCost already calculated, after GM policy overrides.
    // Customized purchases are unavailable until a certified modification lane can supply an authoritative quote
    // (Modification V2 registry: no certified selectable modifications). A client-computed customization price is never accepted.
    if (options.stagedCustomization || options.costOverride !== undefined) {
        ui.notifications.warn('Customized purchases are unavailable: no certified modification quote exists for them yet.');
        return;
    }
    const stagedCustomization = null;
    const finalCost = normalizeCredits(item.finalCost);

    // Add to cart
    store.cart.items.push({
        id: itemId,
        name: options.nameOverride || item.name,
        img: options.imgOverride || item.img,
        cost: finalCost,
        item: item,
        stagedCustomization,
        requiresApproval: policyCheck.requiresApproval === true
    });

    ui.notifications.info(storeI18n('SWSE.Store.Notifications.ItemAddedToCart', { name: item.name, approval: storeApprovalSuffix(policyCheck.requiresApproval) }));

    // Update Rendarr's dialogue
    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * Add droid to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} actorId - ID of droid actor
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addDroidToCart(store, actorId, updateDialogueCallback) {
    if (!actorId) {
        ui.notifications.warn(storeI18n('SWSE.Store.Notifications.InvalidDroidSelection'));
        return;
    }

    // ENGINE: Lookup from store inventory (which has finalCost pre-calculated)
    let droidTemplate = store.itemsById.get(actorId);

    if (!droidTemplate) {
        ui.notifications.error(storeI18n('SWSE.Store.Notifications.DroidNotFound'));
        SWSELogger.error('SWSE Store | Droid not found:', { actorId });
        return;
    }

    const policyCheck = isStoreItemPurchasable(droidTemplate, { allowApprovalRequired: true });
    if (!policyCheck.ok) {
        ui.notifications.warn(policyCheck.reason || storeI18n('SWSE.Store.Notifications.DroidCannotPurchase'));
        return;
    }

    // Engine provides finalCost, after GM policy overrides.
    const finalCost = normalizeCredits(droidTemplate.finalCost);

    // Add to cart
    store.cart.droids.push({
        id: actorId,
        name: droidTemplate.name,
        cost: finalCost,
        actor: droidTemplate,
        requiresApproval: policyCheck.requiresApproval === true
    });

    ui.notifications.info(storeI18n('SWSE.Store.Notifications.ItemAddedToCart', { name: droidTemplate.name, approval: storeApprovalSuffix(policyCheck.requiresApproval) }));

    // Update Rendarr's dialogue
    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * Add vehicle to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} actorId - ID of vehicle actor
 * @param {string} condition - "new" or "used"
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addVehicleToCart(store, templateId, condition, updateDialogueCallback) {
    if (!templateId) {
        ui.notifications.warn(storeI18n('SWSE.Store.Notifications.InvalidVehicleSelection'));
        return;
    }

    // ENGINE: Vehicles have both finalCost (new) and finalCostUsed (used) pre-calculated
    const vehicleTemplate = store.itemsById?.get(templateId);

    if (!vehicleTemplate || vehicleTemplate.type !== 'vehicle') {
        ui.notifications.error(storeI18n('SWSE.Store.Notifications.VehicleTemplateNotFound'));
        return;
    }

    const policyCheck = isStoreItemPurchasable(vehicleTemplate, { allowApprovalRequired: true });
    if (!policyCheck.ok) {
        ui.notifications.warn(policyCheck.reason || storeI18n('SWSE.Store.Notifications.VehicleCannotPurchase'));
        return;
    }

    // Engine provides both prices, after GM policy overrides.
    const finalCost = getVehicleConditionCost(vehicleTemplate, condition);
    if (!isValidVehicleConditionCost(finalCost)) {
        ui.notifications.warn(storeI18n('SWSE.Store.Notifications.VehicleCannotPurchase'));
        return;
    }

    store.cart.vehicles.push({
        id: templateId,
        name: vehicleTemplate.name,
        cost: finalCost,
        condition: condition,
        template: vehicleTemplate,
        requiresApproval: policyCheck.requiresApproval === true
    });

    ui.notifications.info(storeI18n('SWSE.Store.Notifications.VehicleAddedToCart', { condition: condition === 'used' ? storeI18n('SWSE.Store.Notifications.UsedCondition') : storeI18n('SWSE.Store.Notifications.NewCondition'), name: vehicleTemplate.name, approval: storeApprovalSuffix(policyCheck.requiresApproval) }));

    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * P1-2: Re-validate cart items at final purchase time
 * Checks that:
 * - All items still exist in inventory
 * - Prices haven't changed significantly
 * - Actor still has sufficient credits
 *
 * @param {Object} store - Store instance
 * @param {Object} actor - Purchasing actor
 * @param {Number} originalTotal - Total from checkout
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function revalidateCart(store, actor, originalTotal) {
    try {
        // Re-check that actor still exists and has current state
        const freshActor = game.actors.get(actor.id);
        if (!freshActor) {
            return {
                valid: false,
                error: 'Your character was deleted. Please refresh and try again.'
            };
        }

        const currentCredits = LedgerService.getCurrentCredits(freshActor);

        // Re-check sufficient credits
        if (currentCredits < originalTotal) {
            return {
                valid: false,
                error: `Insufficient credits at purchase time. You have ${currentCredits}, but items cost ${originalTotal}.`
            };
        }

        // Re-validate each item in cart still exists
        for (const item of store.cart.items) {
            const currentItem = store.itemsById?.get(item.id);
            if (!currentItem) {
                return {
                    valid: false,
                    error: `Item "${item.name}" is no longer available in the store.`
                };
            }

            const policyCheck = isStoreItemPurchasable(currentItem, { allowApprovalRequired: true });
            if (!policyCheck.ok) {
                return {
                    valid: false,
                    error: `Item "${item.name}" cannot be purchased: ${policyCheck.reason}`
                };
            }

            // Exact match required (no tolerance); customized lines never reach here (refused earlier).
            const expectedCost = item.cost;
            if (item.stagedCustomization || normalizeCredits(currentItem.finalCost) !== normalizeCredits(expectedCost)) {
                return {
                    valid: false,
                    error: `Price of "${item.name}" changed from ${expectedCost} to ${currentItem.finalCost} credits. Please review your cart.`
                };
            }
        }

        // Re-validate droids can be created
        for (const droid of store.cart.droids ?? []) {
            if (!droid.name) {
                return {
                    valid: false,
                    error: 'One or more droids in cart is missing a name. Cannot purchase.'
                };
            }
        }

        // Re-validate vehicles still available and prices OK
        for (const vehicle of store.cart.vehicles ?? []) {
            const vehicleTemplate = store.itemsById?.get(vehicle.id);
            if (!vehicleTemplate) {
                return {
                    valid: false,
                    error: `Vehicle "${vehicle.name}" is no longer available in the store.`
                };
            }

            const policyCheck = isStoreItemPurchasable(vehicleTemplate, { allowApprovalRequired: true });
            if (!policyCheck.ok) {
                return {
                    valid: false,
                    error: `Vehicle "${vehicle.name}" cannot be purchased: ${policyCheck.reason}`
                };
            }

            // Check price for condition (P1-4)
            const currentPrice = getVehicleConditionCost(vehicleTemplate, vehicle.condition);
            if (!isValidVehicleConditionCost(currentPrice)) {
                return {
                    valid: false,
                    error: `Vehicle "${vehicle.name}" has no valid ${vehicle.condition || 'new'} store price.`
                };
            }

            // Vehicles are charged exactly the price the player reviewed: any drift
            // (no tolerance) sends the cart back for review.
            if (currentPrice !== vehicle.cost) {
                return {
                    valid: false,
                    error: `Price of ${vehicle.condition} "${vehicle.name}" changed. Please review your cart.`
                };
            }
        }

        return { valid: true, error: null };
    } catch (err) {
        // Fail closed: a cart that cannot be verified is never purchased.
        SWSELogger.error('StoreCheckout: Cart re-validation failed; purchase blocked', {
            error: err?.message
        });
        return {
            valid: false,
            error: 'Your cart could not be verified, so nothing was purchased and no credits were charged.',
            diagnostic: String(err?.message ?? err)
        };
    }
}

/**
 * Launch custom starship builder
 * @param {Object} actor - Actor building the starship
 * @param {Function} closeCallback - Callback to close the store
 */
export async function createCustomStarship(actor, closeCallback) {
    // Custom starships are a funded project handled by the existing Ship Designer and
    // CustomVehicleConstructionService (GM approval, funding, design time, delivery).
    // The Store only launches it; it never prices or delivers a custom ship itself.
    if (!actor) {
        ui.notifications.warn('Open a character actor before designing a starship.');
        return null;
    }
    const designer = await import('/systems/foundryvtt-swse/scripts/ui/shell/construction-designer-ui.js');
    const result = await designer.openShipDesigner(actor);
    if (result?.success && typeof closeCallback === 'function') closeCallback();
    return result;
}

/**
 * Remove item from cart by ID
 * @param {Object} cart - Shopping cart object
 * @param {string} type - Type of item ("item", "droid", "vehicle")
 * @param {string} itemId - ID of the item to remove
 */
export function removeFromCartById(cart, type, itemId) {
    const t = String(type || '').toLowerCase();
    const norm = t.endsWith('s') ? t.slice(0, -1) : t;

    if (norm === 'item') {
        const index = cart.items.findIndex(item => item.id === itemId);
        if (index !== -1) {cart.items.splice(index, 1);}
        return;
    }

    if (norm === 'droid') {
        const index = cart.droids.findIndex(droid => droid.id === itemId);
        if (index !== -1) {cart.droids.splice(index, 1);}
        return;
    }

    if (norm === 'vehicle') {
        const index = cart.vehicles.findIndex(vehicle => vehicle.id === itemId);
        if (index !== -1) {cart.vehicles.splice(index, 1);}
    }
}

/**
 * Clear entire cart
 * @param {Object} cart - Shopping cart object
 */
export function clearCart(cart) {
    cart.items = [];
    cart.droids = [];
    cart.vehicles = [];
}

/**
 * Calculate total cost of items in cart
 * @param {Object} cart - Shopping cart object
 * @returns {number} Total cost
 */
export function calculateCartTotal(cart) {
    let total = 0;
    for (const item of cart.items) {total += item.cost;}
    for (const droid of cart.droids) {total += droid.cost;}
    for (const vehicle of cart.vehicles) {total += vehicle.cost;}
    return normalizeCredits(total);
}


function validateCartQuantities(store) {
  const counts = new Map();
  const names = new Map();
  const add = (entry) => {
    if (!entry?.id) return;
    counts.set(entry.id, (counts.get(entry.id) || 0) + 1);
    if (!names.has(entry.id)) names.set(entry.id, entry.name || 'Unknown listing');
  };

  for (const item of store.cart.items || []) add(item);
  for (const droid of store.cart.droids || []) add(droid);
  for (const vehicle of store.cart.vehicles || []) add(vehicle);

  for (const [id, count] of counts.entries()) {
    const storeItem = store.itemsById?.get(id);
    const policy = storeItem?.storePolicy;
    if (!policy?.trackQuantity || !Number.isFinite(policy.quantity)) continue;
    if (count > policy.quantity) {
      return {
        ok: false,
        error: `${names.get(id)} has only ${policy.quantity} in stock. Remove ${count - policy.quantity} from your cart.`
      };
    }
  }

  return { ok: true, error: null };
}

/**
 * HARDENING 4: Revalidate cart before checkout
 * Do NOT trust stored cart item costs.
 * Re-resolve each item from store index and recalculate prices.
 *
 * @param {Object} store - Store instance
 * @returns {Object} { totalRevalidated, removed, recalculated }
 */
function revalidateCartItems(store) {
  const report = { totalRevalidated: 0, removed: [], recalculated: [] };

  // Revalidate regular items
  for (let i = store.cart.items.length - 1; i >= 0; i--) {
    const cartItem = store.cart.items[i];
    const storeItem = store.itemsById.get(cartItem.id);
    if (!storeItem) {
      report.removed.push({ type: 'item', name: cartItem.name });
      store.cart.items.splice(i, 1);
    } else {
      const policyCheck = isStoreItemPurchasable(storeItem, { allowApprovalRequired: true });
      if (!policyCheck.ok) {
        report.removed.push({ type: 'item', name: `${cartItem.name} (${policyCheck.reason})` });
        store.cart.items.splice(i, 1);
        continue;
      }
      if (cartItem.stagedCustomization) {   // fail closed: customization prices are not verifiable
        report.removed.push({ type: 'item', name: `${cartItem.name} (customized purchases are unavailable)` });
        store.cart.items.splice(i, 1);
        continue;
      }
      const recalculated = normalizeCredits(storeItem.finalCost);
      if (recalculated !== cartItem.cost) {
        report.recalculated.push({
          type: 'item',
          name: cartItem.name,
          old: cartItem.cost,
          new: recalculated
        });
        cartItem.cost = recalculated;
      }
      report.totalRevalidated += recalculated;
    }
  }

  // Revalidate droids
  for (let i = store.cart.droids.length - 1; i >= 0; i--) {
    const cartDroid = store.cart.droids[i];
    const storeItem = store.itemsById.get(cartDroid.id);
    if (!storeItem) {
      report.removed.push({ type: 'droid', name: cartDroid.name });
      store.cart.droids.splice(i, 1);
    } else {
      const policyCheck = isStoreItemPurchasable(storeItem, { allowApprovalRequired: true });
      if (!policyCheck.ok) {
        report.removed.push({ type: 'droid', name: `${cartDroid.name} (${policyCheck.reason})` });
        store.cart.droids.splice(i, 1);
        continue;
      }
      const recalculated = normalizeCredits(storeItem.finalCost);
      if (recalculated !== cartDroid.cost) {
        report.recalculated.push({
          type: 'droid',
          name: cartDroid.name,
          old: cartDroid.cost,
          new: recalculated
        });
        cartDroid.cost = recalculated;
      }
      report.totalRevalidated += recalculated;
    }
  }

  // Revalidate vehicles
  for (let i = store.cart.vehicles.length - 1; i >= 0; i--) {
    const cartVehicle = store.cart.vehicles[i];
    const storeItem = store.itemsById.get(cartVehicle.id);
    if (!storeItem) {
      report.removed.push({ type: 'vehicle', name: cartVehicle.name });
      store.cart.vehicles.splice(i, 1);
    } else {
      const policyCheck = isStoreItemPurchasable(storeItem, { allowApprovalRequired: true });
      if (!policyCheck.ok) {
        report.removed.push({ type: 'vehicle', name: `${cartVehicle.name} (${policyCheck.reason})` });
        store.cart.vehicles.splice(i, 1);
        continue;
      }
      const recalculated = getVehicleConditionCost(storeItem, cartVehicle.condition);
      if (!isValidVehicleConditionCost(recalculated)) {
        report.removed.push({ type: 'vehicle', name: `${cartVehicle.name} (invalid ${cartVehicle.condition || 'new'} price)` });
        store.cart.vehicles.splice(i, 1);
        continue;
      }
      if (recalculated !== cartVehicle.cost) {
        report.recalculated.push({
          type: 'vehicle',
          name: cartVehicle.name,
          old: cartVehicle.cost,
          new: recalculated
        });
        cartVehicle.cost = recalculated;
      }
      report.totalRevalidated += recalculated;
    }
  }

  if (report.recalculated.length > 0 || report.removed.length > 0) {
    SWSELogger.info('SWSE Store | Cart revalidated', {
      recalculated: report.recalculated.length,
      removed: report.removed.length
    });
  }

  return report;
}

/**
 * PHASE 1: Compile regular items into MutationPlan
 * Returns plans instead of mutating directly.
 * @param {Array} cartItems - Items from cart
 * @returns {Array<Object>} MutationPlans
 */
export function createItemPlans(cartItems) {
  if (!cartItems || cartItems.length === 0) return [];

  const itemsToCreate = cartItems.map(cartItem => {
    if (cartItem.stagedCustomization) throw new Error(`Customized purchase "${cartItem.name ?? cartItem.id}" has no authoritative quote; purchase refused.`);
    // the compendium record itself (canonical identity, effects, full system data) -- never the normalized store listing
    const data = storeItemDocumentData(cartItem.item);
    if (!data) throw new Error(`Store item "${cartItem.name ?? cartItem.id}" has no source document; purchase refused.`);
    return data;
  });

  if (itemsToCreate.length === 0) return [];

  // Return MutationPlan, don't apply it
  return [{
    add: {
      items: itemsToCreate
    }
  }];
}

/**
 * PHASE 7: Compile droids into MutationPlans using DroidFactory
 * Returns plans instead of mutating directly.
 * @param {Array} cartDroids - Droids from cart
 * @returns {Array<Object>} MutationPlans
 */
export async function createDroidPlans(cartDroids) {
  // Import DroidFactory dynamically to avoid circular deps
  const { DroidFactory } = await import('/systems/foundryvtt-swse/scripts/engine/droids/droid-factory.js');

  const plans = [];

  for (const droid of cartDroids) {
    // PHASE 7: Use DroidFactory to build MutationPlan
    try {
      const plan = DroidFactory.buildMutationPlan({
        droidActor: droid.actor,
        name: droid.name
      });
      plans.push(plan);
    } catch (err) {
      SWSELogger.error('SWSE Store | DroidFactory failed:', err);
      throw err;
    }
  }

  return plans;
}

/**
 * PHASE 5: Compile vehicles into MutationPlans using VehicleFactory
 * Returns plans instead of mutating directly.
 * @param {Array} cartVehicles - Vehicles from cart
 * @param {Map} itemsById - Store inventory map
 * @returns {Array<Object>} MutationPlans
 */
export async function createVehiclePlans(cartVehicles, itemsById) {
  // Import VehicleFactory dynamically to avoid circular deps
  const { VehicleFactory } = await import('/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-factory.js');
  const { VehiclePackDataLoader } = await import('/systems/foundryvtt-swse/scripts/core/vehicle-pack-data-loader.js');
  const index = await VehiclePackDataLoader.loadVehicleIndex();
  const { getVehicleRuntimeProjection } = await import('/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js');

  const plans = [];

  for (const vehicle of cartVehicles) {
    const template = vehicle.template || itemsById?.get(vehicle.id);
    if (!template) {
      throw new Error(`Vehicle template not found for id=${vehicle.id}`);
    }

    // A store card is a catalog view, not a source Actor. Resolve by exact
    // publication identity and hydrate the one owning canonical pack.
    const key = template.sourceEntryKey ?? template.system?.vehicleSourceEntryKey ??
      template.raw?.system?.vehicleSourceEntryKey ??
      template.doc?.system?.vehicleSourceEntryKey ??
      template.template?.system?.vehicleSourceEntryKey;
    // Exact publication identity only: a listing without its sourceEntryKey is refused.
    const matches = key ? index.filter(entry => entry.sourceEntryKey === key) : [];
    if (matches.length !== 1)
      throw new Error('UNIVERSAL_VEHICLE_STORE_SOURCE_IDENTITY_REQUIRED: ' + String(vehicle.id));
    const canonicalActor = await VehiclePackDataLoader.loadVehicleDocument(matches[0]);
    if (!canonicalActor)
      throw new Error('UNIVERSAL_VEHICLE_STORE_DOCUMENT_UNAVAILABLE: ' + matches[0].sourceEntryKey);
    const projection = getVehicleRuntimeProjection(canonicalActor);
    if (projection.kind !== 'canonical')
      throw new Error('UNIVERSAL_VEHICLE_STORE_NOT_CANONICAL: ' + matches[0].sourceEntryKey);
    // Re-evaluate source eligibility for THIS condition under the transaction: the
    // published price state must allow it (used needs a published used price) and
    // the store's offer must be a positive price. No GM override is wired here.
    // The charge must equal the Store's own policy-applied offer for this item (looked up
    // by id in the merchant index), never just a cart value the client holds.
    const merchantItem = itemsById?.get(vehicle.id) ?? template;
    const condition = vehicle.condition;   // evaluateVehicleMerchantPurchase refuses anything but 'new' | 'used'
    const verdict = evaluateVehicleMerchantPurchase(canonicalActor.toObject().flags.swse.universalVehicleSource.source, {
      condition,
      merchantPrice: getVehicleConditionCost(merchantItem, condition),
      cartPrice: vehicle.cost ?? null
    });
    if (!verdict.ok)
      throw new Error('UNIVERSAL_VEHICLE_STORE_NOT_ELIGIBLE: ' + matches[0].sourceEntryKey + ': ' + verdict.reasons.join(','));

    try {
      const plan = VehicleFactory.buildMutationPlan({
        template: canonicalActor,
        condition: vehicle.condition
      });
      plans.push(plan);
    } catch (err) {
      SWSELogger.error('SWSE Store | VehicleFactory failed:', err);
      throw err;
    }
  }

  return plans;
}

/**
 * Flatten cart into single array for validation and purchase
 * @param {Object} cart - Shopping cart
 * @returns {Array} Flattened cart items with normalized costs
 */
function flattenCartForPurchase(cart) {
    const flattened = [];

    // Add items
    for (const item of cart.items || []) {
        flattened.push({
            id: item.id,
            name: item.name,
            type: 'item',
            finalCost: normalizeCredits(item.cost)
        });
    }

    // Add droids
    for (const droid of cart.droids || []) {
        flattened.push({
            id: droid.id,
            name: droid.name,
            type: 'droid',
            finalCost: normalizeCredits(droid.cost)
        });
    }

    // Add vehicles
    for (const vehicle of cart.vehicles || []) {
        flattened.push({
            id: vehicle.id,
            name: vehicle.name,
            type: 'vehicle',
            finalCost: normalizeCredits(vehicle.cost),
            condition: vehicle.condition
        });
    }

    return flattened;
}


function hasStoreApprovalRequirement(entry = {}) {
    const explicitApproval = entry?.requiresApproval === true
        || entry?.storePolicy?.requiresApproval === true
        || entry?.item?.storePolicy?.requiresApproval === true
        || entry?.actor?.storePolicy?.requiresApproval === true
        || entry?.template?.storePolicy?.requiresApproval === true;
    if (explicitApproval) return true;

    const requireApproval = SettingsHelper.getSafe('store.requireGMApproval', false) === true;
    if (!requireApproval) return false;

    const threshold = Number(SettingsHelper.getSafe('storeApprovalThreshold', 5000)) || 0;
    if (!(threshold > 0)) return true;

    const cost = normalizeCredits(entry?.cost ?? entry?.finalCost ?? entry?.item?.finalCost ?? entry?.actor?.finalCost ?? entry?.template?.finalCost ?? 0);
    return cost >= threshold;
}

function serializeApprovalSourceData(source = {}) {
    const data = source?.toObject ? source.toObject(false) : cloneStoreCheckoutData(source || {});
    return stripDocumentIdentity(data || {});
}

function serializeStoreApprovalEntry(entry = {}, bucket = 'item') {
    const source = entry.item || entry.actor || entry.template || {};
    const itemData = serializeApprovalSourceData(source);
    const type = bucket === 'droids' ? 'droid' : bucket === 'vehicles' ? 'vehicle' : (itemData.type || entry.item?.type || 'equipment');
    const name = entry.name || itemData.name || 'Store item';
    const cost = normalizeCredits(entry.cost ?? entry.finalCost ?? itemData.finalCost ?? itemData.system?.cost ?? 0);
    return {
        id: entry.id || source?.id || source?._id || itemData._id || null,
        policyId: entry.id || source?.id || source?._id || null,
        name,
        type,
        sourceBucket: bucket,
        cost,
        finalCost: cost,
        condition: entry.condition || null,
        img: entry.img || itemData.img || source?.img || '',
        // Source data is carried only for customizations (their own authority, S7). Everything else is rebuilt
        // from the exact canonical listing when the GM approves; a player-written record is a request, not a quote.
        itemData: { name, type, img: entry.img || itemData.img || '' },
        sourceUuid: entry.item?.sourceUuid ?? entry.actor?.sourceUuid ?? entry.template?.sourceUuid ?? null
    };
}

function collectStoreApprovalEntries(cart = {}) {
    const entries = [];
    const collect = (bucketName, bucket = []) => {
        for (let index = 0; index < bucket.length; index += 1) {
            const entry = bucket[index];
            if (!hasStoreApprovalRequirement(entry)) continue;
            entries.push({ bucketName, index, approvalItem: serializeStoreApprovalEntry(entry, bucketName) });
        }
    };
    collect('items', cart.items || []);
    collect('droids', cart.droids || []);
    collect('vehicles', cart.vehicles || []);
    return entries;
}

function removeApprovedRequestEntriesFromCart(cart = {}, entries = []) {
    const byBucket = new Map();
    for (const entry of entries) {
        if (!byBucket.has(entry.bucketName)) byBucket.set(entry.bucketName, []);
        byBucket.get(entry.bucketName).push(entry.index);
    }
    for (const [bucketName, indexes] of byBucket.entries()) {
        const bucket = cart[bucketName] || [];
        indexes.sort((a, b) => b - a).forEach(index => bucket.splice(index, 1));
    }
}

async function submitStoreItemApprovalRequest(actor, approvalItems = []) {
    if (!actor || !approvalItems.length) {
        return { success: false, error: 'No approval items were supplied.' };
    }

    const costCredits = approvalItems.reduce((sum, item) => sum + normalizeCredits(item.finalCost ?? item.cost ?? 0), 0);
    const label = approvalItems.length === 1 ? approvalItems[0].name : `${approvalItems.length} store items`;
    const pendingRecord = {
        id: `pending_store_item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        type: 'store-item',
        approvalKind: 'store-policy-item',
        approvalItems,
        ownerPlayerId: game.user?.id ?? null,
        ownerActorId: actor.id,
        ownerActorName: actor.name,
        costCredits,
        requestedAt: Date.now(),
        draftData: {
            name: label,
            type: 'store-item',
            cost: costCredits,
            details: approvalItems.map(item => `${item.name} — ${normalizeCredits(item.finalCost ?? item.cost ?? 0).toLocaleString()} cr`).join('\n'),
            description: `GM approval requested for ${label}`
        }
    };

    const pendingPurchases = SettingsHelper.getArray('pendingCustomPurchases', []);
    pendingPurchases.push(pendingRecord);
    await SettingsHelper.set('pendingCustomPurchases', pendingPurchases);
    Hooks.callAll?.('swseStoreApprovalRequested', { approval: pendingRecord, actor });
    return { success: true, approval: pendingRecord };
}

/**
 * Checkout and purchase all items in cart
 * @param {Object} store - Store instance
 * @param {Function} animateNumberCallback - Callback to animate numbers
 * @returns {Promise<Object>} { success: boolean, transactionId?: string, total?: number, error?: string }
 */
const purchasesInFlight = new Set();

/** One checkout/vehicle purchase per wallet actor at a time (double-click / concurrent clients). */
async function withPurchaseLock(actorId, work, onBusy) {
    const key = String(actorId ?? '');
    if (!key || purchasesInFlight.has(key)) return onBusy();
    purchasesInFlight.add(key);
    try { return await work(); } finally { purchasesInFlight.delete(key); }
}

export async function checkout(store, animateNumberCallback) {
    return withPurchaseLock(store?.actor?.id, () => checkoutUnguarded(store, animateNumberCallback), () => {
        ui.notifications.warn('A purchase is already in progress.');
        return { success: false, error: 'purchase-in-progress' };
    });
}

async function checkoutUnguarded(store, animateNumberCallback) {
    const actor = store.actor;
    if (SettingsHelper.getSafe('storeOpen', true) !== true) {
        ui.notifications.warn(storeI18n('SWSE.Store.Notifications.StoreClosed'));
        return { success: false, error: 'store-closed' };
    }
    const credits = LedgerService.getCurrentCredits(actor);

    // Revalidate cart before checkout (re-price all items)
    const revalidationReport = revalidateCartItems(store);
    if (revalidationReport.removed.length > 0) {
        ui.notifications.warn(storeI18n('SWSE.Store.Notifications.CartItemsRemoved', { count: revalidationReport.removed.length }));
    }
    // A changed quote invalidates the player's confirmation: the cart now shows the
    // current price, nothing is charged, and the player must review and confirm again.
    if (revalidationReport.recalculated.length > 0 || revalidationReport.removed.length > 0) {
        await store._persistCart?.();
        const changed = revalidationReport.recalculated.map(r => `${r.name}: ${r.old} -> ${r.new} cr`).join('; ');
        const error = revalidationReport.recalculated.length > 0
            ? `Prices changed since you added these to your cart (${changed}). Review your cart and check out again; no credits were charged.`
            : 'Some cart items are no longer available. Review your cart; no credits were charged.';
        ui.notifications.warn(error);
        return { success: false, error, priceReviewRequired: true };
    }

    const quantityValidation = validateCartQuantities(store);
    if (!quantityValidation.ok) {
        ui.notifications.warn(quantityValidation.error);
        return { success: false, error: quantityValidation.error };
    }

    // The catalog is index-first: load the full canonical source record of every purchased listing now,
    // before any approval request or debit. A listing whose source cannot be verified is never sold.
    try {
        await hydrateStoreListings([
            ...(store.cart.items || []).map(entry => entry.item),
            ...(store.cart.droids || []).map(entry => entry.actor)
        ]);
    } catch (err) {
        const error = `A product in your cart could not be verified against its source record, so nothing was purchased (${err?.message ?? err}).`;
        ui.notifications.error(error);
        return { success: false, error };
    }

    const approvalEntries = collectStoreApprovalEntries(store.cart);
    if (approvalEntries.length > 0) {
        const approvalItems = approvalEntries.map(entry => entry.approvalItem);
        const approvalResult = await submitStoreItemApprovalRequest(actor, approvalItems);
        if (!approvalResult.success) {
            ui.notifications.error(approvalResult.error || storeI18n('SWSE.Store.Notifications.ApprovalFailed'));
            return { success: false, error: approvalResult.error || 'GM approval request failed.' };
        }
        removeApprovedRequestEntriesFromCart(store.cart, approvalEntries);
        await store._persistCart?.();
        ui.notifications.info(storeI18n('SWSE.Store.Notifications.ApprovalRequested', { count: approvalItems.length, plural: approvalItems.length === 1 ? '' : 's' }));
    }

    // Calculate total using revalidated costs after approval-gated items have been queued.
    const total = calculateCartTotal(store.cart);

    if (total === 0) {
        clearCart(store.cart);
        store.cartTotal = 0;
        await store._persistCart?.();
        return { success: true, pendingApproval: approvalEntries.length > 0, total: 0 };
    }

    // Check eligibility
    const eligible = StoreEngine.canPurchase({
        actor,
        items: flattenCartForPurchase(store.cart),
        totalCost: total
    });

    if (!eligible.canPurchase) {
        ui.notifications.warn(eligible.reason || storeI18n('SWSE.Store.Notifications.CannotCompletePurchase'));
        return { success: false, error: eligible.reason || storeI18n('SWSE.Store.Notifications.CannotCompletePurchase') };
    }

    try {
        // Re-validate cart before final purchase
        const cartValidation = await revalidateCart(store, actor, total);
        if (!cartValidation.valid) {
            ui.notifications.error(cartValidation.error);
            return { success: false, error: cartValidation.error };
        }

        // Compile source-backed vehicle plans before the transactional debit.
        // A stale cart view, unknown source price, or incomplete canonical
        // Actor cannot fail only AFTER the character has spent credits.
        const stagedVehiclePlans = store.cart.vehicles?.length > 0
            ? await createVehiclePlans(store.cart.vehicles, store.itemsById)
            : [];

        // Execute engine transaction
        const result = await StoreEngine.purchase({
            actor,
            items: flattenCartForPurchase(store.cart),
            totalCost: total,
            transactionContext: 'store-purchase',
            itemGrantCallback: async (purchasingActor, cartItems) => {
                // Compile all MutationPlans
                const plans = [];

                // Compile item plans
                plans.push(...createItemPlans(store.cart.items));

                // Compile droid plans
                if (store.cart.droids?.length > 0) {
                    plans.push(...(await createDroidPlans(store.cart.droids)));
                }

                // Vehicle plans were source-verified before debiting credits.
                plans.push(...stagedVehiclePlans);

                return plans;
            }
        });

        if (!result.success) {
            ui.notifications.error(storeI18n('SWSE.Store.Notifications.PurchaseFailed', { error: result.error }));
            return { success: false, error: result.error };
        }

        // Animate credit reconciliation
        const newCredits = LedgerService.getCurrentCredits(actor);
        await store.animateCreditReconciliation(credits, newCredits, 600);

        ui.notifications.info(storeI18n('SWSE.Store.Notifications.PurchaseComplete', { total: total.toLocaleString() }));

        // Purchase history is a read projection of the TransactionEngine ledger; nothing is mirrored here.

        // Clear cart only on success
        const purchasedItems = {
            items: [...(store.cart.items || [])],
            droids: [...(store.cart.droids || [])],
            vehicles: [...(store.cart.vehicles || [])]
        };
        clearCart(store.cart);
        store.cartTotal = 0;
        await store._persistCart?.();

        await store._handleCheckoutCompletion?.({
            total,
            purchasedItems,
            creditsBefore: credits,
            creditsAfter: newCredits
        });

        return {
            success: true,
            transactionId: result.transactionId,
            total
        };
    } catch (err) {
        SWSELogger.error('SWSE Store | Checkout failed:', err);
        ui.notifications.error(storeI18n('SWSE.Store.Notifications.PurchaseFailedConsole'));
        return { success: false, error: err.message };
    }
}

function cloneStoreCheckoutData(value) {
    if (value === undefined || value === null) return value;
    if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
    try { return structuredClone(value); } catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function stripDocumentIdentity(data = {}) {
    delete data._id;
    delete data.id;
    return data;
}

/**
 * Store-originated custom droid construction.
 *
 * Lifecycle (see engine/store/store-droid-construction.js): this button issues a one-shot launch authorization and opens
 * the EXISTING progression Droid Builder (single-step). On confirm the finalizer verifies that authorization, reduces the
 * build to component identities, re-quotes it with the shared construction-quote authority (the same one the builder's own
 * totals use) and queues a pending request. The GM approves the re-quoted amount; debit, droid creation and owner link are
 * one commerce transaction. Nothing is created or charged at this step.
 */
export async function buildDroidWithBuilder(actor, closeCallback) {
    if (!actor) {
        ui.notifications.error(storeI18n('SWSE.Store.Notifications.NoActorForDroid'));
        return null;
    }
    if (actor.isOwner !== true) {
        ui.notifications.warn('You can only start a droid build for a character you own.');
        return null;
    }
    const token = beginStoreDroidConstruction(actor, game.user?.id);
    if (typeof closeCallback === 'function') closeCallback();
    try {
        ui.notifications.info('Design your droid. Its price is quoted from its components when you confirm; the GM approves the quote and nothing is charged before that.');
        return await launchNewProgression({
            actorType: 'droid',
            subtype: 'droid',
            isDroid: true,
            name: 'Custom Droid',
            source: 'store-custom-droid',
            currentStep: 'droid-builder',
            targetStep: 'droid-builder',
            singleStep: true,
            singleStepDomain: 'droidBuilder',
            storeConstructionToken: token
        });
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to launch progression droid builder:', err);
        ui.notifications.error(storeI18n('SWSE.Store.Notifications.FailedOpenDroidBuilder'));
        return null;
    }
}

