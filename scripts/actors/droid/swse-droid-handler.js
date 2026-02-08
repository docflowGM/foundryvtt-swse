/**
 * Droid-specific rules handler
 * Star Wars Saga Edition – RAW compliant
 * FVTT v13+ / v15 safe
 */

export class SWSEDroidHandler {

  // =========================================================================
  // APPLY DROID CHASSIS
  // =========================================================================
  static async applyDroidChassis(actor, chassisItem) {
    if (!actor || !chassisItem) {return;}

    const chassis = foundry.utils.deepClone(chassisItem.system ?? {});

    // -----------------------------
    // Abilities (NO CON)
    // -----------------------------
    const abilities = {};
    for (const key of ['str', 'dex', 'int', 'wis', 'cha']) {
      abilities[key] = {
        base: Number(chassis[key]) || 10,
        racial: 0,
        temp: 0
      };
    }

    // Constitution disabled
    abilities.con = {
      base: null,
      disabled: true,
      substitute: 'str'
    };

    // -----------------------------
    // Core chassis update
    // -----------------------------
    await actor.update({
      'system.attributes': abilities,
      'system.size': chassis.size ?? 'medium',
      'system.speed': Number(chassis.speed) || 6,

      // HP = chassis + level only
      'system.hp.base': Number(chassis.hp) || 10,
      'system.hp.max': Number(chassis.hp) || 10,
      'system.hp.value': Number(chassis.hp) || 10,

      'system.systemSlots.max': Number(chassis.systemSlots) || 0,
      'system.systemSlots.used': 0,

      // Droid identity rules
      'system.traits.isDroid': true,
      'system.traits.useStrInsteadOfCon': true,
      'system.traits.noAbilityHpBonus': true,

      // Initialize subsystems
      'system.locomotion': [],
      'system.appendages': [],
      'system.processor': {
        quality: abilities.int.base,
        behavioralInhibitors: true
      }
    });

    // Remove organic-only items
    const toDelete = actor.items
      .filter(i => i.system?.organicOnly === true || i.type === 'forcepower')
      .map(i => i.id);

    if (toDelete.length) {
      await actor.deleteEmbeddedDocuments('Item', toDelete);
    }

    // Replace existing chassis
    const existing = actor.items.find(i => i.type === 'chassis');
    if (existing) {
      await actor.deleteEmbeddedDocuments('Item', [existing.id]);
    }

    const chassisData = chassisItem.toObject();
    chassisData._id = undefined;
    await actor.createEmbeddedDocuments('Item', [chassisData]);

    ui.notifications.info(`${actor.name} chassis applied: ${chassisItem.name}`);
  }

  // =========================================================================
  // LOCOMOTION SYSTEMS
  // =========================================================================
  static async installLocomotion(actor, locomotionItem) {
    const current = actor.system.locomotion ?? [];
    const index = current.length;

    // Cost scaling handled in item UI; store metadata only
    current.push({
      name: locomotionItem.name,
      baseSpeed: locomotionItem.system.baseSpeed,
      restricted: locomotionItem.system.restricted ?? false,
      restrictionType: locomotionItem.system.restrictionType ?? null
    });

    await actor.update({ 'system.locomotion': current });
    this._warnIfRestricted(locomotionItem);
  }

  // =========================================================================
  // PROCESSOR SYSTEM
  // =========================================================================
  static async installProcessor(actor, processorItem) {
    const sys = processorItem.system ?? {};

    await actor.update({
      'system.processor': {
        quality: actor.system.attributes.int.base,
        behavioralInhibitors: sys.behavioralInhibitors !== false,
        inhibitorNotes: sys.inhibitorNotes ?? ''
      }
    });

    this._warnIfRestricted(processorItem);
  }

  // =========================================================================
  // APPENDAGES
  // =========================================================================
  static async installAppendage(actor, appendageItem) {
    const appendages = actor.system.appendages ?? [];

    // Validate appendage type
    const appendageType = appendageItem.system.type ?? 'generic';
    if (!appendageType) {
      SWSELogger.warn(`Appendage ${appendageItem.name} missing type field, using default`);
    }

    appendages.push({
      name: appendageItem.name,
      type: appendageType, // probe, tool, claw, hand, etc.
      locomotion: appendageItem.system.locomotion ?? false,
      balance: appendageItem.system.balance ?? false,
      unarmedDamageType: appendageItem.system.unarmedDamageType ?? null
    });

    await actor.update({ 'system.appendages': appendages });
  }

  // =========================================================================
  // SYSTEM SLOT CHECK
  // =========================================================================
  static hasAvailableSlots(actor, cost = 1) {
    const slots = actor.system.systemSlots;
    return (slots.used + cost) <= slots.max;
  }

  // =========================================================================
  // GENERIC SYSTEM INSTALL
  // =========================================================================
  static async installSystem(actor, item) {
    const cost = Number(item.system?.slotsRequired ?? 1);

    if (!this.hasAvailableSlots(actor, cost)) {
      ui.notifications.error('Not enough system slots.');
      return false;
    }

    const data = item.toObject();
    data._id = undefined;

    await actor.createEmbeddedDocuments('Item', [data]);
    await actor.update({
      'system.systemSlots.used': actor.system.systemSlots.used + cost
    });

    this._warnIfRestricted(item);
    return true;
  }

  // =========================================================================
  // BUILT-IN DROID ARMOR
  // =========================================================================
  static async installDroidArmor(actor, armorItem) {
    const sys = armorItem.system ?? {};

    await actor.update({
      'system.droidArmor': {
        installed: true,
        name: armorItem.name,
        category: sys.category ?? 'Light',
        armorBonus: sys.armorBonus ?? 0,
        maxDex: sys.maxDex ?? null,
        armorCheckPenalty: sys.armorCheckPenalty ?? 0,
        runMultiplierOverride: sys.runMultiplierOverride ?? null,
        availability: sys.availability ?? {}
      }
    });

    this._warnIfRestricted(armorItem);
  }

  // =========================================================================
  // SHIELDS
  // =========================================================================
  static async installShieldGenerator(actor, shieldItem) {
    const sys = shieldItem.system ?? {};
    const sr = sys.sr ?? 0;  // Shield Rating from the system data

    if (!this._meetsSizeRequirement(actor.system.size, sys.sizeMinimum)) {
      ui.notifications.error('Droid is too small for this shield generator.');
      return false;
    }

    await actor.update({
      'system.shields': {
        value: sr,    // Current shield rating
        max: sr,      // Maximum shield rating
        rating: sr,   // Display rating (same as max when fully charged)
        installed: true,
        shieldRatingMax: sr,
        shieldRatingCurrent: sr,
        sizeMinimum: sys.sizeMinimum
      }
    });

    this._warnIfRestricted(shieldItem);
    return true;
  }

  // =========================================================================
  // HARDENED SYSTEMS
  // =========================================================================
  static async applyHardenedSystems(actor, item) {
    if (!this._meetsSizeRequirement(actor.system.size, 'large')) {
      ui.notifications.error('Hardened Systems require Large or larger droids.');
      return false;
    }

    await actor.update({
      'system.hardenedSystems': {
        multiplier: item.system.multiplier,
        hpBonusBase: 10,
        dtBonusBase: 5,
        availability: item.system.availability
      }
    });

    this._warnIfRestricted(item);
    return true;
  }

  // =========================================================================
  // INSTALL DISPATCHER
  // =========================================================================
  static async install(actor, item) {
    switch (item.type) {
      case 'locomotion':
        return this.installLocomotion(actor, item);
      case 'processor':
        return this.installProcessor(actor, item);
      case 'appendage':
        return this.installAppendage(actor, item);
      case 'droidArmor':
        return this.installDroidArmor(actor, item);
      case 'shieldGenerator':
        return this.installShieldGenerator(actor, item);
      case 'hardenedSystems':
        return this.applyHardenedSystems(actor, item);
      default:
        return this.installSystem(actor, item);
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================
  static _meetsSizeRequirement(actorSize, minimum) {
    const order = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
    return order.indexOf(actorSize) >= order.indexOf(minimum);
  }

  static _warnIfRestricted(item) {
    const avail = item.system?.availability;
    if (!avail) {return;}

    if (
      avail.includes('Restricted') ||
      avail.includes('Illegal') ||
      avail.includes('Military')
    ) {
      ui.notifications.warn(`${item.name} is ${avail}.`);
    }
  }
}