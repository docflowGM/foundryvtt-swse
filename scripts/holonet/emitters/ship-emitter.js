/**
 * Ship Emitter
 *
 * Listens to vehicle/ship damage and repair events and emits into Holonet.
 * Hooks into actor update to detect ship HP changes.
 *
 * Preference checks and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { ShipSource } from '../sources/ship-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class ShipEmitter {
  static #initialized = false;
  static #previousState = new Map(); // Track all ship subsystem states

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    Hooks.on('updateActor', (actor, changes, options, userId) => {
      this.onUpdateActor(actor, changes, options, userId).catch(err => {
        console.error('[Holonet] Ship emitter failed:', err);
      });
    });

    console.log('[Holonet] Ship emitter initialized');
  }

  static async onUpdateActor(actor, changes, options, userId) {
    // Only process vehicles/ships
    if (actor.type !== 'vehicle' && !actor.system?.isVehicle) return;

    // Skip non-owned ships (only notify players of ships attached to them)
    const ownerUser = game.users?.find(u => u.character?.id === actor.system?.attachedTo);
    if (!ownerUser) return;

    // Skip if no relevant system data changed
    const systemChanged = changes['system.hp']?.value || changes['system.hp']?.max ||
                          changes['system.shields']?.value || changes['system.shields']?.max ||
                          changes['system.hyperdrive_class'] || changes['system.conditionTrack']?.current;
    if (!systemChanged && !Object.keys(changes).some(k => k.startsWith('system.'))) return;

    const shipId = actor.id;
    const prevState = this.#previousState.get(shipId) || this.#buildShipState(actor);
    const currState = this.#buildShipState(actor);

    this.#previousState.set(shipId, currState);

    // Detect and emit changes
    await this.#detectAndEmitChanges(actor, ownerUser, prevState, currState);
  }

  /**
   * Build current ship state snapshot
   */
  static #buildShipState(actor) {
    return {
      hp: actor.system?.hp?.value ?? 0,
      maxHp: actor.system?.hp?.max ?? 100,
      shields: actor.system?.shields?.value ?? 0,
      maxShields: actor.system?.shields?.max ?? 0,
      hyperdriveClass: actor.system?.hyperdrive_class || null,
      backupClass: actor.system?.backup_class || null,
      conditionTrack: actor.system?.conditionTrack?.current ?? 0,
      conditionPenalty: actor.system?.conditionTrack?.penalty ?? 0
    };
  }

  /**
   * Detect subsystem changes and emit notifications
   */
  static async #detectAndEmitChanges(actor, ownerUser, prevState, currState) {
    // Check Hull (HP)
    if (currState.hp !== prevState.hp) {
      await this.#emitHullChange(actor, ownerUser, prevState.hp, currState.hp);
    }

    // Check Shields
    if (currState.shields !== prevState.shields) {
      await this.#emitShieldChange(actor, ownerUser, prevState.shields, currState.shields, prevState.maxShields, currState.maxShields);
    }

    // Check Hyperdrive
    if (currState.hyperdriveClass !== prevState.hyperdriveClass) {
      await this.#emitHyperdriveChange(actor, ownerUser, prevState.hyperdriveClass, currState.hyperdriveClass);
    }

    // Check Condition Track
    if (currState.conditionTrack !== prevState.conditionTrack) {
      await this.#emitConditionChange(actor, ownerUser, prevState.conditionTrack, currState.conditionTrack);
    }
  }

  /**
   * Emit hull damage/repair notification
   */
  static async #emitHullChange(actor, ownerUser, previousHp, currentHp) {
    const isRepair = currentHp > previousHp;
    const change = Math.abs(currentHp - previousHp);

    const dedupeKey = `ship-hull-${actor.id}-${currentHp}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.SHIP,
      categoryId: HolonetPreferences.CATEGORIES.SHIP,
      dedupeKey,
      dedupeWindowMs: 5000,
      createRecord: () => {
        const record = isRepair
          ? ShipSource.createShipRepairNotification({
            shipId: actor.id,
            shipName: actor.name,
            actorId: actor.system?.attachedTo,
            playerUserId: ownerUser.id,
            previousHp,
            newHp: currentHp,
            body: `${actor.name} was repaired. Hull: ${previousHp} → ${currentHp} (+${change})`
          })
          : ShipSource.createShipDamageNotification({
            shipId: actor.id,
            shipName: actor.name,
            actorId: actor.system?.attachedTo,
            playerUserId: ownerUser.id,
            previousHp,
            newHp: currentHp,
            body: `${actor.name} sustained hull damage. Hull: ${previousHp} → ${currentHp} (-${change})`
          });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Ship hull ${isRepair ? 'repair' : 'damage'}: ${actor.name}`);
    }
  }

  /**
   * Emit shield damage/restoration notification
   */
  static async #emitShieldChange(actor, ownerUser, previousShields, currentShields, prevMaxShields, currMaxShields) {
    const isRestoration = currentShields > previousShields;
    const change = Math.abs(currentShields - previousShields);

    const dedupeKey = `ship-shields-${actor.id}-${currentShields}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.SHIP,
      categoryId: HolonetPreferences.CATEGORIES.SHIP,
      dedupeKey,
      dedupeWindowMs: 5000,
      createRecord: () => {
        const record = isRestoration
          ? ShipSource.createShieldRestorationNotification({
            shipId: actor.id,
            shipName: actor.name,
            actorId: actor.system?.attachedTo,
            playerUserId: ownerUser.id,
            previousShields,
            newShields: currentShields,
            body: `${actor.name} shields were restored. Shields: ${previousShields} → ${currentShields} (+${change})`
          })
          : ShipSource.createShieldDamageNotification({
            shipId: actor.id,
            shipName: actor.name,
            actorId: actor.system?.attachedTo,
            playerUserId: ownerUser.id,
            previousShields,
            newShields: currentShields,
            body: `${actor.name} shields were damaged. Shields: ${previousShields} → ${currentShields} (-${change})`
          });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Ship shields ${isRestoration ? 'restoration' : 'damage'}: ${actor.name}`);
    }
  }

  /**
   * Emit hyperdrive damage/repair notification
   */
  static async #emitHyperdriveChange(actor, ownerUser, previousClass, currentClass) {
    // Skip if hyperdrive went from null to null
    if (!previousClass && !currentClass) return;

    const isDamaged = previousClass && !currentClass;
    const isRepaired = !previousClass && currentClass;

    // If neither damaged nor repaired, it's just a class change (less important)
    if (!isDamaged && !isRepaired) return;

    const dedupeKey = `ship-hyperdrive-${actor.id}-${currentClass}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.SHIP,
      categoryId: HolonetPreferences.CATEGORIES.SHIP,
      dedupeKey,
      dedupeWindowMs: 5000,
      createRecord: () => {
        const record = isRepaired
          ? ShipSource.createHyperdriveRepairNotification({
            shipId: actor.id,
            shipName: actor.name,
            actorId: actor.system?.attachedTo,
            playerUserId: ownerUser.id,
            previousClass,
            newClass: currentClass,
            body: `${actor.name} hyperdrive has been repaired and is operational.`
          })
          : ShipSource.createHyperdriveDamageNotification({
            shipId: actor.id,
            shipName: actor.name,
            actorId: actor.system?.attachedTo,
            playerUserId: ownerUser.id,
            previousClass,
            newClass: currentClass,
            body: `${actor.name} hyperdrive has been damaged and is no longer functional.`
          });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Ship hyperdrive ${isRepaired ? 'repair' : 'damage'}: ${actor.name}`);
    }
  }

  /**
   * Emit condition track change notification
   */
  static async #emitConditionChange(actor, ownerUser, previousCondition, currentCondition) {
    const worsened = currentCondition > previousCondition;
    const change = Math.abs(currentCondition - previousCondition);

    const dedupeKey = `ship-condition-${actor.id}-${currentCondition}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.SHIP,
      categoryId: HolonetPreferences.CATEGORIES.SHIP,
      dedupeKey,
      dedupeWindowMs: 5000,
      createRecord: () => {
        const record = ShipSource.createConditionChangeNotification({
          shipId: actor.id,
          shipName: actor.name,
          actorId: actor.system?.attachedTo,
          playerUserId: ownerUser.id,
          previousCondition,
          newCondition: currentCondition,
          worsened,
          body: `${actor.name} condition has ${worsened ? 'worsened' : 'improved'}. Condition: ${previousCondition} → ${currentCondition}`
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Ship condition ${worsened ? 'worsened' : 'improved'}: ${actor.name}`);
    }
  }

  /**
   * Clear state on actor deletion
   */
  static onDeleteActor(actor, options, userId) {
    this.#previousState.delete(actor.id);
  }
}
