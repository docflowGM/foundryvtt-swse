/**
 * Store State Emitter
 *
 * Listens to store state changes (open/close, pricing changes) and emits into Holonet.
 * Hooks into store management system.
 *
 * Preference checks and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { StoreSource } from '../sources/store-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class StoreStateEmitter {
  static #initialized = false;
  static #previousStoreState = {
    isOpen: false,
    priceModifier: 1.0
  };

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Hook into store open/close events (exact hook name TBD based on store implementation)
    // For now, these are placeholders that should be wired to actual store hooks
    Hooks.on('swseStoreStateChanged', (data) => {
      this.onStoreStateChanged(data).catch(err => {
        console.error('[Holonet] Store state emitter failed:', err);
      });
    });

    Hooks.on('swseStorePriceChanged', (data) => {
      this.onStorePriceChanged(data).catch(err => {
        console.error('[Holonet] Store price emitter failed:', err);
      });
    });

    console.log('[Holonet] Store state emitter initialized');
  }

  /**
   * Emit when store opens or closes
   *
   * @param {Object} data
   */
  static async onStoreStateChanged(data) {
    const { isOpen } = data;

    // Skip if state hasn't actually changed
    if (isOpen === this.#previousStoreState.isOpen) return;

    this.#previousStoreState.isOpen = isOpen;

    const dedupeKey = `store-state-${isOpen}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.STORE,
      categoryId: HolonetPreferences.CATEGORIES.STORE,
      dedupeKey,
      skipDedupe: true, // Store opens/closes are significant events
      createRecord: () => {
        let record;

        if (isOpen) {
          record = StoreSource.createStoreOpenedNotification({
            body: 'The store is now open for business.'
          });
        } else {
          record = StoreSource.createStoreClosedNotification({
            body: 'The store is now closed.'
          });
        }

        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Store state emitted: ${isOpen ? 'opened' : 'closed'}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit store state:', result.reason);
    }
  }

  /**
   * Emit when store pricing changes (sale, tax, etc.)
   *
   * @param {Object} data
   */
  static async onStorePriceChanged(data) {
    const { newModifier, previousModifier, reason } = data;

    // Skip if no actual change
    if (newModifier === this.#previousStoreState.priceModifier) return;

    this.#previousStoreState.priceModifier = newModifier;

    const dedupeKey = `store-price-${newModifier}`;

    // Determine if this is a sale or tax increase
    const isSale = newModifier < previousModifier;
    const isTax = newModifier > previousModifier;

    const changePercent = Math.abs(((newModifier - previousModifier) / previousModifier) * 100);

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.STORE,
      categoryId: HolonetPreferences.CATEGORIES.STORE,
      dedupeKey,
      skipDedupe: true, // Each price change is significant
      createRecord: () => {
        let record;

        if (isSale && reason?.includes('sale')) {
          record = StoreSource.createStoreSaleNotification({
            previousModifier,
            newModifier,
            discountPercent: changePercent,
            body: `A sale has begun! Store prices reduced by ${Math.round(changePercent)}%.`
          });
        } else if (isTax && reason?.includes('tax')) {
          record = StoreSource.createStoreTaxedNotification({
            previousModifier,
            newModifier,
            increasePercent: changePercent,
            body: `New taxes applied. Store prices increased by ${Math.round(changePercent)}%.`
          });
        } else {
          record = StoreSource.createStorePriceChangeNotification({
            previousModifier,
            newModifier,
            reason: reason ?? 'unknown',
            body: `Store pricing has been updated.`
          });
        }

        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Store price change emitted: ${reason ?? 'unknown'}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit store price change:', result.reason);
    }
  }
}
