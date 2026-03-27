/**
 * Bridge to Starting Equipment — Phase 8 Step 5
 *
 * Connects packaged build output to starting equipment/loadout selection.
 * Consumes completed build, suggests equipment without mutating core progression.
 */

export class BridgeToStartingEquipment {
  /**
   * Starting equipment loadouts by archetype and class.
   */
  static LOADOUT_TEMPLATES = {
    'soldier-tank': {
      primary: 'heavy-blaster-rifle',
      armor: 'medium-armor',
      accessories: ['combat-shield', 'medpack'],
      specialty: 'reinforced-armor-mods',
    },
    'soldier-striker': {
      primary: 'vibroblade',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['ammo-bandolier', 'medpack'],
      specialty: 'melee-focus',
    },
    'soldier-gunner': {
      primary: 'sniper-rifle',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['targeting-scope', 'ammunition'],
      specialty: 'precision-ammo',
    },
    'soldier-defender': {
      primary: 'shield-generator',
      secondary: 'blaster-pistol',
      armor: 'heavy-armor',
      accessories: ['medical-supplies', 'extra-power-cells'],
      specialty: 'defensive-protocols',
    },
    'scoundrel-charmer': {
      primary: 'blaster-pistol',
      secondary: 'datapad',
      armor: 'light-armor',
      accessories: ['comlink', 'false-id-kit'],
      specialty: 'social-tools',
    },
    'scoundrel-infiltrator': {
      primary: 'vibroblade',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['stealth-suit', 'lockpick-kit'],
      specialty: 'stealth-gear',
    },
    'scoundrel-gadgeteer': {
      primary: 'tech-kit',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['hacking-device', 'tool-kit'],
      specialty: 'tech-gadgets',
    },
    'scoundrel-swashbuckler': {
      primary: 'vibroblade',
      secondary: 'vibroblade',
      armor: 'light-armor',
      accessories: ['rope', 'grappling-hook'],
      specialty: 'mobility-gear',
    },
    'jedi-knight': {
      primary: 'lightsaber',
      secondary: 'blaster-pistol',
      armor: 'jedi-robes',
      accessories: ['comlink', 'medpack'],
      specialty: 'force-focus',
    },
    'jedi-sentinel': {
      primary: 'lightsaber',
      secondary: 'blaster-pistol',
      armor: 'jedi-robes',
      accessories: ['awareness-kit', 'lockpick-kit'],
      specialty: 'perception-gear',
    },
    'jedi-scholar': {
      primary: 'lightsaber',
      secondary: 'datapad',
      armor: 'jedi-robes',
      accessories: ['research-kit', 'comlink'],
      specialty: 'knowledge-tools',
    },
    'jedi-consular': {
      primary: 'lightsaber',
      secondary: 'medpack',
      armor: 'jedi-robes',
      accessories: ['healing-supplies', 'comlink'],
      specialty: 'support-gear',
    },
    'tech-engineer': {
      primary: 'tech-kit',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['tool-kit', 'spare-parts'],
      specialty: 'crafting-supplies',
    },
    'tech-hacker': {
      primary: 'hacking-device',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['portable-terminal', 'security-kit'],
      specialty: 'hacking-tools',
    },
    'tech-droid-master': {
      primary: 'droid-interface',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['repair-kit', 'droid-protocol-suite'],
      specialty: 'droid-tools',
    },
    'tech-inventor': {
      primary: 'innovation-kit',
      secondary: 'blaster-pistol',
      armor: 'light-armor',
      accessories: ['tool-kit', 'prototype-materials'],
      specialty: 'invention-supplies',
    },
  };

  /**
   * Get starting loadout for a completed build.
   * @param {Object} completedBuild - Build output from ProgressionSession
   * @returns {Object} Suggested starting equipment
   */
  static getStartingLoadoutFromBuild(completedBuild) {
    if (!completedBuild) return null;

    const archetype = completedBuild.archetype || completedBuild.suggestedArchetype;
    const loadout = this.LOADOUT_TEMPLATES[archetype];

    if (!loadout) {
      return this._getDefaultLoadout(completedBuild.className);
    }

    return {
      archetype,
      loadout,
      reason: `Loadout optimized for ${archetype} playstyle`,
      canCustomize: true,
      customizationPoints: this._getCustomizationPoints(archetype),
    };
  }

  /**
   * Get loadout variants for build (e.g., "heavy focus" vs "mobility focus").
   * @param {Object} completedBuild - Build output
   * @returns {Array} Alternative loadout options
   */
  static getLoadoutVariants(completedBuild) {
    const archetype = completedBuild.archetype || completedBuild.suggestedArchetype;
    const baseLoadout = this.LOADOUT_TEMPLATES[archetype];

    if (!baseLoadout) return [];

    return [
      {
        variant: 'balanced',
        loadout: baseLoadout,
        description: 'Standard loadout for this archetype',
      },
      {
        variant: 'offensive',
        loadout: this._modifyForOffense(baseLoadout),
        description: 'Extra damage and offensive tools',
      },
      {
        variant: 'defensive',
        loadout: this._modifyForDefense(baseLoadout),
        description: 'Extra armor and defensive tools',
      },
    ];
  }

  /**
   * Get individual equipment recommendations by slot.
   * @param {Object} completedBuild - Build output
   * @returns {Object} Equipment by slot with reasoning
   */
  static getEquipmentBySlot(completedBuild) {
    const loadout = this.getStartingLoadoutFromBuild(completedBuild);
    if (!loadout) return null;

    return {
      primary: {
        item: loadout.loadout.primary,
        reason: this._getWeaponReason(completedBuild, loadout.loadout.primary),
      },
      secondary: {
        item: loadout.loadout.secondary || 'none',
        reason: 'Backup weapon or tool',
      },
      armor: {
        item: loadout.loadout.armor,
        reason: this._getArmorReason(completedBuild, loadout.loadout.armor),
      },
      accessories: loadout.loadout.accessories.map(acc => ({
        item: acc,
        reason: this._getAccessoryReason(archetype, acc),
      })),
    };
  }

  /**
   * Get default loadout by class.
   */
  static _getDefaultLoadout(className) {
    const defaults = {
      Soldier: this.LOADOUT_TEMPLATES['soldier-tank'],
      Scoundrel: this.LOADOUT_TEMPLATES['scoundrel-charmer'],
      Jedi: this.LOADOUT_TEMPLATES['jedi-knight'],
      'Tech Specialist': this.LOADOUT_TEMPLATES['tech-engineer'],
    };
    return defaults[className] || defaults.Soldier;
  }

  /**
   * Get customization points (feats/talents that let you swap equipment).
   */
  static _getCustomizationPoints(archetype) {
    return [
      'Primary weapon choice',
      'Armor type (within weight class)',
      'Accessory selection',
      'Specialty focus',
    ];
  }

  /**
   * Modify loadout for offensive focus.
   */
  static _modifyForOffense(baseLoadout) {
    return {
      ...baseLoadout,
      accessories: [
        ...baseLoadout.accessories.filter(a => a !== 'medpack'),
        'extra-ammunition',
        'damage-boosters',
      ],
    };
  }

  /**
   * Modify loadout for defensive focus.
   */
  static _modifyForDefense(baseLoadout) {
    return {
      ...baseLoadout,
      accessories: [
        ...baseLoadout.accessories,
        'extra-armor-plating',
        'medical-supplies',
      ],
    };
  }

  /**
   * Get reasoning for weapon choice.
   */
  static _getWeaponReason(completedBuild, weapon) {
    const strengths = completedBuild.suggestedAbilities || [];
    if (strengths.includes('strength') || strengths.includes('melee')) {
      return 'Matches your melee focus';
    }
    if (strengths.includes('dexterity') || strengths.includes('ranged')) {
      return 'Matches your ranged focus';
    }
    return 'Optimal for your archetype';
  }

  /**
   * Get reasoning for armor choice.
   */
  static _getArmorReason(completedBuild, armor) {
    const constitution = completedBuild.suggestedAbilities?.includes('constitution');
    if (constitution) {
      return 'Supports your durability focus';
    }
    return 'Balances mobility and protection';
  }

  /**
   * Get reasoning for accessory.
   */
  static _getAccessoryReason(archetype, accessory) {
    const reasons = {
      'medpack': 'Healing in field',
      'ammo-bandolier': 'Extended firepower',
      'stealth-suit': 'Evasion enhancement',
      'lockpick-kit': 'Infiltration tools',
      'hacking-device': 'Tech access',
      'force-focus': 'Force channeling',
    };
    return reasons[accessory] || 'Supports your playstyle';
  }
}
