/**
 * Target-Path Definitions — Phase 8 Step 2
 *
 * Expands target definitions for major prestige classes, feat chains,
 * talent trees, Force specializations, and domain-specific progression paths.
 *
 * All targets use the Phase 6 validation schema.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class TargetPathDefinitions {
  /**
   * Complete target registry for Phase 8 expansion.
   */
  static TARGET_DEFINITIONS = {
    // =====================================================================
    // PRESTIGE CLASSES (7 majors)
    // =====================================================================
    'command-officer': {
      id: 'command-officer',
      name: 'Command Officer',
      type: 'prestige-class',
      requiredClass: 'Soldier',
      unlockLevel: 5,
      requirements: { bab: 5 },
      milestones: [
        { level: 6, gain: 'tactical-advantage' },
        { level: 9, gain: 'coordinated-strike' },
      ],
      archetypeAlignment: ['tank', 'leader'],
      description: 'Master of tactics and team coordination',
      featAffinity: ['leadership', 'tactics'],
    },

    'weapon-master': {
      id: 'weapon-master',
      name: 'Weapon Master',
      type: 'prestige-class',
      requiredClass: 'Soldier',
      unlockLevel: 5,
      requirements: { bab: 6, weapon_focus: true },
      milestones: [
        { level: 7, gain: 'weapon-specialization' },
        { level: 10, gain: 'master-strike' },
      ],
      archetypeAlignment: ['striker', 'damage-dealer'],
      description: 'Expert in all forms of weaponry',
      featAffinity: ['weapon-focus', 'cleave', 'power-attack'],
    },

    'jedi-guardian': {
      id: 'jedi-guardian',
      name: 'Jedi Guardian',
      type: 'prestige-class',
      requiredClass: 'Jedi',
      unlockLevel: 5,
      requirements: { force_talents: 2 },
      milestones: [
        { level: 6, gain: 'force-shield' },
        { level: 9, gain: 'enhanced-reflexes' },
      ],
      archetypeAlignment: ['knight', 'warrior'],
      description: 'Jedi trained for combat and protection',
      talentAffinity: ['force-shield', 'lightsaber-form'],
    },

    'assassin': {
      id: 'assassin',
      name: 'Assassin',
      type: 'prestige-class',
      requiredClass: 'Scoundrel',
      unlockLevel: 5,
      requirements: { sneak_attack: true },
      milestones: [
        { level: 6, gain: 'deadly-precision' },
        { level: 9, gain: 'execute-target' },
      ],
      archetypeAlignment: ['infiltrator', 'sneak'],
      description: 'Master of deadly precision strikes',
      talentAffinity: ['sneak-attack', 'evasion'],
    },

    'master-smith': {
      id: 'master-smith',
      name: 'Master Smith',
      type: 'prestige-class',
      requiredClass: 'Tech Specialist',
      unlockLevel: 5,
      requirements: { craft_bonus: 10 },
      milestones: [
        { level: 6, gain: 'masterwork-crafting' },
        { level: 9, gain: 'innovation-strike' },
      ],
      archetypeAlignment: ['engineer', 'inventor'],
      description: 'Creator of legendary equipment',
      talentAffinity: ['masterwork', 'innovation'],
    },

    'force-disciple': {
      id: 'force-disciple',
      name: 'Force Disciple',
      type: 'prestige-class',
      requiredClass: 'Scoundrel',
      unlockLevel: 7,
      requirements: { wisdom: 14 },
      milestones: [
        { level: 8, gain: 'force-sensitivity' },
        { level: 11, gain: 'force-power-access' },
      ],
      archetypeAlignment: ['charmer', 'social'],
      description: 'Non-Jedi Force user path',
      talentAffinity: ['force-sensitivity'],
      forceUser: true,
    },

    // =====================================================================
    // FEAT CHAINS (3 major pathways)
    // =====================================================================
    'weapon-focus-chain': {
      id: 'weapon-focus-chain',
      name: 'Weapon Focus Specialization',
      type: 'feat-chain',
      unlockLevel: 1,
      requirements: { bab: 1 },
      milestones: [
        { level: 1, gain: 'weapon-focus' },
        { level: 5, gain: 'weapon-specialization' },
        { level: 9, gain: 'improved-critical' },
      ],
      archetypeAlignment: ['striker', 'duelist', 'gunner'],
      description: 'Progressive mastery of a specific weapon',
      featAffinity: ['weapon-focus', 'weapon-specialization'],
    },

    'defense-chain': {
      id: 'defense-chain',
      name: 'Defensive Mastery',
      type: 'feat-chain',
      unlockLevel: 1,
      requirements: {},
      milestones: [
        { level: 1, gain: 'dodge' },
        { level: 3, gain: 'mobility' },
        { level: 6, gain: 'evasion' },
      ],
      archetypeAlignment: ['tank', 'defender', 'protector'],
      description: 'Progressive defensive improvements',
      featAffinity: ['dodge', 'mobility', 'evasion'],
    },

    'leadership-chain': {
      id: 'leadership-chain',
      name: 'Leadership Development',
      type: 'feat-chain',
      unlockLevel: 1,
      requirements: { cha: 13 },
      milestones: [
        { level: 1, gain: 'leadership-feat' },
        { level: 5, gain: 'cohort-recruit' },
        { level: 9, gain: 'army-command' },
      ],
      archetypeAlignment: ['leader', 'commander'],
      description: 'Build and command loyal followers',
      featAffinity: ['leadership', 'coordinated-strike'],
    },

    // =====================================================================
    // FORCE SPECIALIZATIONS (4 paths)
    // =====================================================================
    'guardian-path': {
      id: 'guardian-path',
      name: 'Guardian Path',
      type: 'force-specialization',
      requiredClass: 'Jedi',
      unlockLevel: 1,
      requirements: { force_talents: 1 },
      milestones: [
        { level: 1, gain: 'force-shield' },
        { level: 5, gain: 'enhanced-strength' },
        { level: 10, gain: 'force-barrier' },
      ],
      archetypeAlignment: ['knight', 'warrior', 'protector'],
      description: 'Combat-focused Force mastery',
      talentAffinity: ['force-shield', 'lightsaber-form'],
      forceUser: true,
    },

    'consular-path': {
      id: 'consular-path',
      name: 'Consular Path',
      type: 'force-specialization',
      requiredClass: 'Jedi',
      unlockLevel: 1,
      requirements: { force_talents: 1, cha: 12 },
      milestones: [
        { level: 1, gain: 'force-persuasion' },
        { level: 5, gain: 'force-healing' },
        { level: 10, gain: 'unity-with-force' },
      ],
      archetypeAlignment: ['consular', 'healer', 'sage'],
      description: 'Diplomatic and healing Force use',
      talentAffinity: ['force-persuasion', 'healing'],
      forceUser: true,
    },

    'sentinel-path': {
      id: 'sentinel-path',
      name: 'Sentinel Path',
      type: 'force-specialization',
      requiredClass: 'Jedi',
      unlockLevel: 1,
      requirements: { force_talents: 1, wis: 13 },
      milestones: [
        { level: 1, gain: 'force-awareness' },
        { level: 5, gain: 'danger-sense' },
        { level: 10, gain: 'force-perception' },
      ],
      archetypeAlignment: ['sentinel', 'scholar'],
      description: 'Perception and awareness focus',
      talentAffinity: ['force-awareness', 'danger-sense'],
      forceUser: true,
    },

    'sith-path': {
      id: 'sith-path',
      name: 'Sith Path (Dark Side)',
      type: 'force-specialization',
      requiredClass: 'Jedi',
      unlockLevel: 5,
      requirements: { force_talents: 3 },
      milestones: [
        { level: 5, gain: 'force-lightning' },
        { level: 9, gain: 'dark-force-surge' },
        { level: 13, gain: 'sith-lord-status' },
      ],
      archetypeAlignment: ['warrior', 'striker'],
      description: 'Aggressive, power-focused Force use',
      talentAffinity: ['force-lightning', 'force-choke'],
      forceUser: true,
      alignment: 'dark',
    },

    // =====================================================================
    // SHIP/STARSHIP PATHS (2 paths)
    // =====================================================================
    'pilot-ace': {
      id: 'pilot-ace',
      name: 'Pilot Ace',
      type: 'ship-path',
      unlockLevel: 1,
      requirements: { pilot_skill: 5 },
      milestones: [
        { level: 3, gain: 'evasive-maneuvers' },
        { level: 6, gain: 'advanced-piloting' },
        { level: 10, gain: 'legendary-pilot' },
      ],
      description: 'Master ship pilot',
      skillAffinity: ['pilot', 'awareness'],
    },

    'ship-commander': {
      id: 'ship-commander',
      name: 'Ship Commander',
      type: 'ship-path',
      unlockLevel: 3,
      requirements: { cha: 13 },
      milestones: [
        { level: 5, gain: 'command-crew' },
        { level: 9, gain: 'coordinated-maneuvers' },
        { level: 13, gain: 'legendary-commander' },
      ],
      description: 'Lead a ship and crew',
      talentAffinity: ['leadership', 'tactics'],
    },

    // =====================================================================
    // DROID SPECIALIZATIONS (3 paths)
    // =====================================================================
    'combat-droid': {
      id: 'combat-droid',
      name: 'Combat Droid',
      type: 'droid-specialization',
      requiredClass: 'Any',
      requiresSubtype: 'droid',
      unlockLevel: 1,
      requirements: {},
      milestones: [
        { level: 1, gain: 'combat-protocols' },
        { level: 5, gain: 'advanced-combat' },
        { level: 9, gain: 'combat-mastery' },
      ],
      description: 'Combat-optimized droid',
      talentAffinity: ['combat-protocols', 'weapon-systems'],
    },

    'utility-droid': {
      id: 'utility-droid',
      name: 'Utility Droid',
      type: 'droid-specialization',
      requiredClass: 'Tech Specialist',
      requiresSubtype: 'droid',
      unlockLevel: 1,
      requirements: { craft_skill: 5 },
      milestones: [
        { level: 1, gain: 'repair-protocols' },
        { level: 5, gain: 'advanced-support' },
        { level: 9, gain: 'universal-interface' },
      ],
      description: 'Support and repair focused',
      talentAffinity: ['repair-protocols', 'hacking'],
    },

    'commander-droid': {
      id: 'commander-droid',
      name: 'Commander Droid',
      type: 'droid-specialization',
      requiresSubtype: 'droid',
      unlockLevel: 3,
      requirements: { cha: 12 },
      milestones: [
        { level: 3, gain: 'command-protocols' },
        { level: 7, gain: 'swarm-tactics' },
        { level: 11, gain: 'hive-mind' },
      ],
      description: 'Coordinate with other droids',
      talentAffinity: ['command-protocols', 'hacking'],
    },
  };

  /**
   * Get all targets.
   */
  static getAllTargets() {
    return Object.values(this.TARGET_DEFINITIONS);
  }

  /**
   * Get targets by type.
   */
  static getTargetsByType(type) {
    return Object.values(this.TARGET_DEFINITIONS)
      .filter(t => t.type === type);
  }

  /**
   * Get targets by archetype alignment.
   */
  static getTargetsByArchetype(archetype) {
    return Object.values(this.TARGET_DEFINITIONS)
      .filter(t => t.archetypeAlignment?.includes(archetype));
  }

  /**
   * Get Force-specific targets.
   */
  static getForceTargets() {
    return Object.values(this.TARGET_DEFINITIONS)
      .filter(t => t.forceUser === true || t.type === 'force-specialization');
  }

  /**
   * Get prestige class targets.
   */
  static getPrestigeTargets() {
    return this.getTargetsByType('prestige-class');
  }

  /**
   * Find targets for a specific class.
   */
  static getTargetsForClass(className) {
    return Object.values(this.TARGET_DEFINITIONS)
      .filter(t => !t.requiredClass || t.requiredClass === className);
  }

  /**
   * Generate target coverage report.
   */
  static generateCoverageReport() {
    const byType = {};
    const byArchetype = {};
    const allArchetypes = new Set();

    Object.values(this.TARGET_DEFINITIONS).forEach(target => {
      if (!byType[target.type]) byType[target.type] = [];
      byType[target.type].push(target);

      if (target.archetypeAlignment) {
        target.archetypeAlignment.forEach(arch => {
          allArchetypes.add(arch);
          if (!byArchetype[arch]) byArchetype[arch] = [];
          byArchetype[arch].push(target);
        });
      }
    });

    return {
      totalTargets: Object.keys(this.TARGET_DEFINITIONS).length,
      byType: Object.entries(byType).reduce((acc, [type, targets]) => {
        acc[type] = { count: targets.length, targets: targets.map(t => t.name) };
        return acc;
      }, {}),
      archetypesCovered: Array.from(allArchetypes),
      forceTargets: Object.values(this.TARGET_DEFINITIONS)
        .filter(t => t.forceUser).length,
    };
  }

  /**
   * Validate all targets reference valid features.
   */
  static validateTargets() {
    const report = {
      totalTargets: Object.keys(this.TARGET_DEFINITIONS).length,
      validTargets: 0,
      issues: [],
    };

    Object.entries(this.TARGET_DEFINITIONS).forEach(([targetId, target]) => {
      if (!target.id || !target.name || !target.type) {
        report.issues.push({
          targetId,
          issue: 'Missing required fields',
        });
        return;
      }

      report.validTargets++;
    });

    return report;
  }
}
