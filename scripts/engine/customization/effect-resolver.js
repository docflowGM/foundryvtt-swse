/**
 * Effect Resolution Engine
 *
 * Responsible for translating upgrade/template effect payloads into concrete item mutations.
 * This is the central authority for what customizations actually DO to items.
 *
 * Key principle: Effect meaning belongs in engines/catalogs, NOT in UI or templates.
 * All preview and apply operations use this single resolver to ensure parity.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';

export class EffectResolver {
  /**
   * Resolve effects from an upgrade definition into concrete item mutations
   * @param {Item} item - The item being customized
   * @param {Object} upgradeDef - The upgrade definition from catalog
   * @param {Object} context - Additional context (actor, source, etc)
   * @returns {Object} { success, preview, mutations, warnings, errors }
   */
  static resolveUpgradeEffects(item, upgradeDef, context = {}) {
    if (!item || !upgradeDef) {
      return { success: false, errors: ['Invalid item or upgrade definition'] };
    }

    const mutations = {};
    const preview = this.#previewItemState(item);
    const warnings = [];
    const errors = [];

    // Route to category-specific effect resolver
    const category = item.type || item.system?.category;

    try {
      switch (category) {
        case 'weapon':
        case 'blaster':
          this.#resolveWeaponUpgradeEffects(upgradeDef, item, preview, mutations, warnings);
          break;
        case 'armor':
          this.#resolveArmorUpgradeEffects(upgradeDef, item, preview, mutations, warnings);
          break;
        case 'gear':
          this.#resolveGearUpgradeEffects(upgradeDef, item, preview, mutations, warnings);
          break;
        default:
          return { success: false, errors: [`Unsupported category for effect resolution: ${category}`] };
      }

      return {
        success: errors.length === 0,
        preview,
        mutations: Object.keys(mutations).length > 0 ? mutations : null,
        warnings,
        errors
      };
    } catch (err) {
      SWSELogger.error('EffectResolver: Failed to resolve upgrade effects', err);
      return {
        success: false,
        errors: [err.message || 'Effect resolution failed']
      };
    }
  }

  /**
   * Resolve effects from a template definition into concrete item mutations
   * @param {Item} item - The item being customized
   * @param {Object} templateDef - The template definition from catalog
   * @param {Object} context - Additional context
   * @returns {Object} { success, preview, mutations, warnings, errors }
   */
  static resolveTemplateEffects(item, templateDef, context = {}) {
    if (!item || !templateDef) {
      return { success: false, errors: ['Invalid item or template definition'] };
    }

    const mutations = {};
    const preview = this.#previewItemState(item);
    const warnings = [];
    const errors = [];

    try {
      // Templates apply rarity, restriction, and cost modifications
      if (templateDef.rarity) {
        preview.rarity = true;
        mutations['system.rarity'] = 'rare';
      }

      if (templateDef.restriction && templateDef.restriction !== 'common') {
        preview.restriction = templateDef.restriction;
        mutations['system.restriction'] = templateDef.restriction;
      }

      if (templateDef.costModifier && templateDef.costModifier !== 1) {
        const baseCost = item.system?.cost ?? 0;
        const newCost = Math.round(baseCost * templateDef.costModifier);
        preview.cost = newCost;
        mutations['system.cost'] = newCost;
      }

      // Route to template-specific effect logic if available
      const templateCategory = templateDef.category || 'general';
      this.#resolveTemplateSpecificEffects(templateDef, item, preview, mutations, warnings);

      return {
        success: errors.length === 0,
        preview,
        mutations: Object.keys(mutations).length > 0 ? mutations : null,
        warnings,
        errors
      };
    } catch (err) {
      SWSELogger.error('EffectResolver: Failed to resolve template effects', err);
      return {
        success: false,
        errors: [err.message || 'Template effect resolution failed']
      };
    }
  }

  /**
   * Apply resolved mutations to an item's actual state
   * This is the canonical mutation point for customization effects.
   */
  static applyResolvedEffects(item, resolvedEffects) {
    if (!resolvedEffects?.mutations) {
      return { success: true, updatedItemData: {} };
    }

    const itemData = item.toObject?.() || foundry.utils.deepClone(item);
    const updates = foundry.utils.expandObject(resolvedEffects.mutations);

    // Deep merge into item data
    itemData.system = foundry.utils.mergeObject(itemData.system || {}, updates.system || {});
    itemData.flags = foundry.utils.mergeObject(itemData.flags || {}, updates.flags || {});

    return {
      success: true,
      updatedItemData: itemData,
      appliedMutations: resolvedEffects.mutations
    };
  }

  /**
   * Remove/revert effects from an upgrade instance
   * For stateless effects (metadata), this is a no-op.
   * For stateful effects, this reverts the mutations.
   */
  static removeResolvedEffects(item, upgradeInstance, originalUpgradeDef) {
    // For now, removals are handled by recalculating all active effects
    // A more sophisticated system would store the mutation delta per instance
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE EFFECT RESOLUTION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  static #previewItemState(item) {
    return {
      name: item.name,
      type: item.type,
      cost: item.system?.cost ?? 0,
      restriction: item.system?.restriction ?? 'common',
      rarity: item.system?.rarity === 'rare',
      stats: {}
    };
  }

  static #resolveWeaponUpgradeEffects(upgradeDef, item, preview, mutations, warnings) {
    // Weapon-specific effect resolution
    // Maps upgrade keys to concrete item stat changes

    const effectMap = {
      // Stability/handling upgrades: grant +1 Reflex bonus
      'bipod': () => this.#addBonusModifier(mutations, 'reflex', 1, 'Bipod stability'),
      'retractable_stock': () => this.#addBonusModifier(mutations, 'reflex', 1, 'Stock stability'),

      // Damage enhancement upgrades
      'beam_splitter': () => {
        this.#addBonusModifier(mutations, 'weaponDamage', 1, 'Beam splitter enhancement');
        preview.stats.damageDice = '+1 dice split';
      },
      'enhanced_energy_projector': () => {
        this.#addBonusModifier(mutations, 'weaponDamage', 1, 'Enhanced projector');
      },
      'improved_energy_cell': () => {
        mutations['system.ammo'] = (mutations['system.ammo'] ?? item.system?.ammo ?? 10) + 5;
        preview.stats.capacity = '+5 shots';
      },

      // Range/targeting upgrades: grant +1 bonus to ranged attacks
      'targeting_scope_standard': () => {
        this.#addBonusModifier(mutations, 'rangedAttack', 1, 'Standard scope');
      },
      'targeting_scope_low_light': () => {
        this.#addBonusModifier(mutations, 'rangedAttack', 2, 'Low-light scope');
      },
      'rangefinder_weapon': () => {
        this.#addBonusModifier(mutations, 'rangedAttack', 1, 'Rangefinder');
      },
      'computerized_interface_scope': () => {
        this.#addBonusModifier(mutations, 'rangedAttack', 2, 'Smart-linked scope');
      },
      'sniper_switch': () => {
        mutations['system.firingMode'] = 'precision';
        preview.stats.fireMode = 'Precision targeting enabled';
      },

      // Trigger upgrades: grant +1 crit range or quick action bonus
      'hair_trigger': () => {
        mutations['system.critRange'] = (mutations['system.critRange'] ?? item.system?.critRange ?? 20) - 1;
        preview.stats.critRange = 'Crit range improved';
      },
      'double_trigger': () => {
        mutations['system.fireMode'] = 'dual-stage';
        preview.stats.fireMode = 'Dual-stage trigger';
      },

      // Stealth upgrades
      'slinker': () => {
        this.#addBonusModifier(mutations, 'stealth', 2, 'Slinker silencer');
      },
      'flash_suppressor_silencer': () => {
        this.#addBonusModifier(mutations, 'stealth', 1, 'Flash suppressor');
      },

      // Power upgrades
      'pulse_charger': () => {
        mutations['system.ammo'] = (mutations['system.ammo'] ?? item.system?.ammo ?? 10) + 10;
        preview.stats.capacity = '+10 shots';
      },
      'overload_switch': () => {
        mutations['system.damageBonus'] = (mutations['system.damageBonus'] ?? 0) + 1;
        preview.stats.damage = '+1 damage (overheat risk)';
      },

      // Damage type conversion
      'ion_charger': () => {
        mutations['system.damageType'] = 'ion';
        preview.stats.damageType = 'Converts to ion damage';
      },
      'tremor_cell': () => {
        mutations['system.damageType'] = 'tremor';
        preview.stats.damageType = 'Converts to tremor damage';
      },

      // Durability
      'durasteel_bonding': () => {
        this.#addBonusModifier(mutations, 'durability', 2, 'Durasteel frame');
      },
      'neutronium_reinforcement': () => {
        this.#addBonusModifier(mutations, 'durability', 3, 'Neutronium reinforcement');
      },

      // Utility
      'bayonet_ring': () => {
        mutations['system.mountable'] = true;
        preview.stats.mount = 'Can mount bayonet';
      },
      'rapid_recycler': () => {
        mutations['system.rateOfFire'] = (mutations['system.rateOfFire'] ?? 1) + 1;
        preview.stats.rof = '+1 RoF';
      },

      // Tech Specialist modifications (weapon)
      'tech_improved_accuracy': () => {
        mutations['system.attackBonus'] = (mutations['system.attackBonus'] ?? item.system?.attackBonus ?? 0) + 1;
        preview.stats.accuracy = '+1 attack bonus';
      }
    };

    const resolver = effectMap[upgradeDef.key];
    if (resolver) {
      resolver();
    } else if (!this.#isUniversalUpgrade(upgradeDef)) {
      // Only warn for non-universal upgrades that lack effects
      warnings.push(`No effect mapping for weapon upgrade: ${upgradeDef.key}`);
    }
  }

  static #resolveArmorUpgradeEffects(upgradeDef, item, preview, mutations, warnings) {
    // Armor-specific effect resolution

    const effectMap = {
      // Defense upgrades
      'armorplast': () => {
        this.#addBonusModifier(mutations, 'fortitude', 1, 'Armorplast plating');
      },
      'armor_reinforcement': () => {
        this.#addBonusModifier(mutations, 'fortitude', 1, 'Reinforced shell');
      },
      'mesh_underlay': () => {
        this.#addBonusModifier(mutations, 'fortitude', 2, 'Mesh underlay');
      },
      'shockweb': () => {
        this.#addBonusModifier(mutations, 'fortitude', 1, 'Shockweb defense');
        preview.stats.reactive = 'Electrical reactive';
      },

      // Shield generators
      'shield_generator_sr5': () => {
        mutations['system.shieldRating'] = 5;
        preview.stats.shield = 'SR 5 shield';
      },
      'shield_generator_sr10': () => {
        mutations['system.shieldRating'] = 10;
        preview.stats.shield = 'SR 10 shield';
      },

      // Movement/mobility
      'jump_servos': () => {
        mutations['system.jumpCapacity'] = true;
        preview.stats.mobility = 'Jump servos enabled';
      },
      'gyro': () => {
        this.#addBonusModifier(mutations, 'acrobatics', 1, 'Stability gyro');
      },
      'repulsorlift_unit': () => {
        mutations['system.movement'] = (mutations['system.movement'] ?? item.system?.movement ?? 0) + 2;
        preview.stats.movement = '+2 movement speed';
      },

      // Strength/power
      'powered_exoskeleton': () => {
        mutations['system.strengthBonus'] = 2;
        this.#addBonusModifier(mutations, 'strength', 2, 'Powered assist');
      },
      'internal_generator': () => {
        mutations['system.powerReserve'] = true;
        preview.stats.power = 'Internal power supply';
      },

      // Stealth
      'holoshroud': () => {
        this.#addBonusModifier(mutations, 'stealth', 5, 'Holographic camouflage');
      },
      'shadowskin': () => {
        this.#addBonusModifier(mutations, 'stealth', 3, 'Shadowskin coating');
      },
      'reflec_shadowskin': () => {
        this.#addBonusModifier(mutations, 'stealth', 4, 'Reflec shadowskin');
      },

      // Environmental
      'environmental_systems': () => {
        mutations['system.environmentalSupport'] = true;
        preview.stats.environment = 'Full environmental support';
      },
      'radiation_shielding': () => {
        mutations['system.radiationProtection'] = true;
        preview.stats.protection = 'Radiation shielding';
      },
      'aquatic_adaptation': () => {
        mutations['system.aquaticSupport'] = true;
        preview.stats.environment = 'Underwater capable';
      },
      'vacuum_seals_standard': () => {
        mutations['system.vacuumSealed'] = true;
        preview.stats.environment = 'Vacuum-rated seals';
      },
      'vacuum_seals_improved': () => {
        mutations['system.vacuumSealed'] = true;
        mutations['system.vacuumQuality'] = 'improved';
        preview.stats.environment = 'Improved vacuum seals';
      },

      // Storage/integrated
      'integrated_equipment_1': () => {
        mutations['system.integratedStorage'] = (mutations['system.integratedStorage'] ?? 0) + 1;
        preview.stats.storage = '+1 slot integrated';
      },
      'integrated_equipment_2': () => {
        mutations['system.integratedStorage'] = (mutations['system.integratedStorage'] ?? 0) + 2;
        preview.stats.storage = '+2 slots integrated';
      },
      'integrated_equipment_5': () => {
        mutations['system.integratedStorage'] = (mutations['system.integratedStorage'] ?? 0) + 5;
        preview.stats.storage = '+5 slots integrated';
      },
      'integrated_equipment_10': () => {
        mutations['system.integratedStorage'] = (mutations['system.integratedStorage'] ?? 0) + 10;
        preview.stats.storage = '+10 slots integrated';
      },
      'ready_harness': () => {
        mutations['system.quickAccess'] = true;
        preview.stats.storage = 'Quick access harness';
      },

      // Sensors/utility
      'helmet_package': () => {
        mutations['system.helmetSuite'] = true;
        preview.stats.sensors = 'Full helmet suite';
      },
      'rangefinder_armor': () => {
        this.#addBonusModifier(mutations, 'perception', 2, 'Rangefinder package');
      },
      'night_vision_device': () => {
        mutations['system.nightVision'] = true;
        preview.stats.sensors = 'Night vision enabled';
      },
      'diagnostics_system': () => {
        mutations['system.diagnostics'] = true;
        preview.stats.utility = 'Self-diagnostics';
      },

      // Mobility/climbing
      'climbing_claws': () => {
        this.#addBonusModifier(mutations, 'climb', 2, 'Climbing claws');
      },

      // Mounting
      'weapon_mount_standard': () => {
        mutations['system.weaponMount'] = true;
        preview.stats.mount = 'Standard weapon mount';
      },

      // Tech Specialist modifications (armor)
      'tech_agile_armor': () => {
        mutations['system.maxDex'] = (mutations['system.maxDex'] ?? item.system?.maxDex ?? 0) + 1;
        preview.stats.maxDex = '+1 max dex bonus';
      },
      'tech_fortifying_armor': () => {
        this.#addBonusModifier(mutations, 'fortitude', 1, 'Fortifying armor');
      },
      'tech_protective_armor': () => {
        this.#addBonusModifier(mutations, 'reflex', 1, 'Protective armor');
      }
    };

    const resolver = effectMap[upgradeDef.key];
    if (resolver) {
      resolver();
    } else if (!this.#isUniversalUpgrade(upgradeDef)) {
      warnings.push(`No effect mapping for armor upgrade: ${upgradeDef.key}`);
    }
  }

  static #resolveGearUpgradeEffects(upgradeDef, item, preview, mutations, warnings) {
    // Gear-specific effect resolution

    const effectMap = {
      'storage_capacity': () => {
        mutations['system.capacity'] = (mutations['system.capacity'] ?? item.system?.capacity ?? 5) + 1;
        preview.stats.capacity = '+1 storage slot';
      },

      'extra_power_source': () => {
        mutations['system.powerReserve'] = true;
        preview.stats.power = 'Extra power reserve';
      },

      'remote_activation': () => {
        mutations['system.remoteControl'] = true;
        preview.stats.utility = 'Remote activation';
      }
    };

    const resolver = effectMap[upgradeDef.key];
    if (resolver) {
      resolver();
    } else if (!this.#isUniversalUpgrade(upgradeDef)) {
      warnings.push(`No effect mapping for gear upgrade: ${upgradeDef.key}`);
    }
  }

  static #resolveTemplateSpecificEffects(templateDef, item, preview, mutations, warnings) {
    // Template-specific effect logic beyond standard rarity/restriction/cost
    // Placeholder for future template-specific effects

    const effectMap = {
      // Quick Draw enables extra swift action
      'quick_draw_weapon': () => {
        mutations['system.quickDraw'] = true;
        preview.stats.special = 'Quick draw enabled';
      },

      // Eriadun grants armor-specific benefits
      'eriadun_armor': () => {
        mutations['system.eriadunCoating'] = true;
        this.#addBonusModifier(mutations, 'fortitude', 1, 'Eriadun coating');
      }
    };

    const resolver = effectMap[templateDef.key];
    if (resolver) {
      resolver();
    }
  }

  static #isUniversalUpgrade(upgradeDef) {
    return upgradeDef.category === 'universal';
  }

  static #addBonusModifier(mutations, fieldName, bonus, source) {
    // Creates or updates a bonus modifier on the item
    // These are typically used for attack/skill/defense bonuses
    const key = `system.${fieldName}Bonus`;
    mutations[key] = (mutations[key] ?? 0) + bonus;
  }
}
