/**
 * Faction Kit Bridge — Phase 8 Step 5
 *
 * Applies faction-specific benefits to packaged builds.
 * Enhances completed builds with faction perks without mutating core progression.
 */

export class FactionKitBridge {
  /**
   * Faction benefit definitions (bonuses tied to faction membership).
   */
  static FACTION_KITS = {
    'rebel-alliance': {
      name: 'Rebel Alliance',
      description: 'Resistance fighters opposing Imperial tyranny',
      benefits: {
        credits: 500,
        equipment: ['rebel-encryption-key', 'safe-house-access'],
        talents: ['squad-tactics', 'guerrilla-training'],
        skills: { 'stealth': 2, 'survival': 1 },
      },
      buildModifiers: {
        'soldier-*': {
          talentBonus: 'coordinated-tactics',
          creditBonus: 200,
        },
        'scoundrel-*': {
          talentBonus: 'infiltration-tactics',
          creditBonus: 150,
        },
      },
      restrictions: ['sith-path'],
      trainingRequired: { alignment: 'any' },
    },
    'sith-empire': {
      name: 'Sith Empire',
      description: 'Servants of the dark side and Imperial rule',
      benefits: {
        credits: 800,
        equipment: ['imperial-credentials', 'imperial-equipment-access'],
        talents: ['imperial-discipline', 'dark-force-training'],
        skills: { 'intimidation': 2, 'command': 1 },
      },
      buildModifiers: {
        'soldier-*': {
          talentBonus: 'imperial-command',
          creditBonus: 300,
        },
        'jedi-*': {
          talentBonus: 'sith-conversion',
          creditBonus: 200,
        },
      },
      restrictions: ['jedi-order'],
      trainingRequired: { alignment: 'dark' },
    },
    'jedi-order': {
      name: 'Jedi Order',
      description: 'Peacekeepers and protectors guided by the Force',
      benefits: {
        credits: 250,
        equipment: ['jedi-robes', 'lightsaber-training-scope'],
        talents: ['force-attunement', 'jedi-meditation'],
        skills: { 'insight': 2, 'perception': 1 },
      },
      buildModifiers: {
        'jedi-*': {
          talentBonus: 'jedi-mastery',
          creditBonus: 300,
        },
        'soldier-*': {
          talentBonus: 'jedi-martial-training',
          creditBonus: 100,
        },
      },
      restrictions: ['sith-path', 'dark-force-powers'],
      trainingRequired: { alignment: 'light' },
    },
    'trading-consortium': {
      name: 'Interstellar Trading Consortium',
      description: 'Commercial interests spanning known space',
      benefits: {
        credits: 1000,
        equipment: ['merchant-credentials', 'cargo-manifest-access'],
        talents: ['merchant-network', 'trade-route-knowledge'],
        skills: { 'knowledge-trade': 2, 'persuasion': 1 },
      },
      buildModifiers: {
        'scoundrel-*': {
          talentBonus: 'merchant-cunning',
          creditBonus: 250,
        },
        'tech-*': {
          talentBonus: 'trade-tech-specialist',
          creditBonus: 200,
        },
      },
      restrictions: [],
      trainingRequired: { alignment: 'any' },
    },
    'bounty-hunters-guild': {
      name: 'Bounty Hunters Guild',
      description: 'Professional trackers and hunters for hire',
      benefits: {
        credits: 600,
        equipment: ['guild-credentials', 'bounty-network-access'],
        talents: ['hunter-instinct', 'contract-knowledge'],
        skills: { 'investigation': 2, 'awareness': 1 },
      },
      buildModifiers: {
        'soldier-*': {
          talentBonus: 'tactical-pursuit',
          creditBonus: 150,
        },
        'scoundrel-*': {
          talentBonus: 'stealth-tracking',
          creditBonus: 150,
        },
      },
      restrictions: [],
      trainingRequired: { alignment: 'any' },
    },
    'independent': {
      name: 'Independent Operator',
      description: 'Unaffiliated adventurers charting their own course',
      benefits: {
        credits: 0,
        equipment: [],
        talents: ['self-reliance', 'opportunism'],
        skills: { 'survival': 1 },
      },
      buildModifiers: {},
      restrictions: [],
      trainingRequired: { alignment: 'any' },
    },
  };

  /**
   * Get all available factions.
   * @returns {Array} Faction summaries
   */
  static getAvailableFactions() {
    return Object.entries(this.FACTION_KITS).map(([id, kit]) => ({
      id,
      name: kit.name,
      description: kit.description,
      benefitsCount: Object.keys(kit.benefits).length,
      restricted: kit.restrictions.length > 0,
    }));
  }

  /**
   * Get faction kit details.
   * @param {String} factionId - Faction identifier
   * @returns {Object} Faction kit definition
   */
  static getFactionKit(factionId) {
    return this.FACTION_KITS[factionId] || null;
  }

  /**
   * Apply faction kit to a completed build.
   * @param {Object} completedBuild - Character build output
   * @param {String} factionId - Faction identifier
   * @returns {Object} Augmented build with faction benefits
   */
  static applyFactionKitToBuild(completedBuild, factionId) {
    const kit = this.getFactionKit(factionId);
    if (!kit) {
      return {
        success: false,
        error: `Faction '${factionId}' not found`,
      };
    }

    // Check restrictions
    const restrictionViolation = this._checkRestrictions(completedBuild, kit);
    if (restrictionViolation) {
      return {
        success: false,
        error: `This build violates faction restrictions: ${restrictionViolation}`,
        restriction: restrictionViolation,
      };
    }

    // Check training requirements
    const trainingViolation = this._checkTrainingRequirements(completedBuild, kit);
    if (trainingViolation) {
      return {
        success: false,
        error: `This build doesn't meet faction requirements: ${trainingViolation}`,
        requirement: trainingViolation,
      };
    }

    // Apply benefits
    const augmentedBuild = {
      ...completedBuild,
      faction: factionId,
      factionKit: kit,
      appliedBenefits: {
        credits: kit.benefits.credits || 0,
        equipment: kit.benefits.equipment || [],
        talents: kit.benefits.talents || [],
        skills: kit.benefits.skills || {},
      },
      buildSpecificBonus: this._getBuildSpecificBonus(completedBuild, kit),
    };

    return {
      success: true,
      build: augmentedBuild,
      benefitSummary: this._generateBenefitSummary(augmentedBuild),
    };
  }

  /**
   * Get all factions compatible with a build.
   * @param {Object} completedBuild - Character build output
   * @returns {Array} Compatible faction options
   */
  static getCompatibleFactions(completedBuild) {
    return this.getAvailableFactions().filter(faction => {
      const kit = this.getFactionKit(faction.id);
      return !this._checkRestrictions(completedBuild, kit) &&
             !this._checkTrainingRequirements(completedBuild, kit);
    });
  }

  /**
   * Get faction recommendation for a build.
   * @param {Object} completedBuild - Character build output
   * @returns {Object} Best faction match and reasoning
   */
  static getRecommendedFaction(completedBuild) {
    const compatible = this.getCompatibleFactions(completedBuild);
    if (compatible.length === 0) return null;

    const buildArchetype = completedBuild.archetype || '';
    const scores = compatible.map(faction => {
      const kit = this.getFactionKit(faction.id);
      const score = this._calculateAffinityScore(buildArchetype, kit);
      return { faction, score };
    });

    const best = scores.sort((a, b) => b.score - a.score)[0];
    return {
      factionId: best.faction.id,
      name: best.faction.name,
      reason: this._getAffinityReason(buildArchetype, best.faction.id),
      score: best.score,
    };
  }

  /**
   * Get faction restrictions (what builds it conflicts with).
   * @param {String} factionId - Faction identifier
   * @returns {Array} Restricted build paths
   */
  static getFactionRestrictions(factionId) {
    const kit = this.getFactionKit(factionId);
    return kit?.restrictions || [];
  }

  /**
   * Check if a build violates faction restrictions.
   */
  static _checkRestrictions(completedBuild, kit) {
    const buildId = completedBuild.id || completedBuild.buildId || '';
    const chosenPath = (completedBuild.chosenFeats || [])
      .concat(completedBuild.chosenTalents || [])
      .map(f => f.toLowerCase());

    for (const restriction of kit.restrictions) {
      if (buildId.includes(restriction) || chosenPath.some(p => p.includes(restriction))) {
        return restriction;
      }
    }
    return null;
  }

  /**
   * Check if a build meets faction training requirements.
   */
  static _checkTrainingRequirements(completedBuild, kit) {
    const requirements = kit.trainingRequired;

    if (requirements.alignment && requirements.alignment !== 'any') {
      const buildAlignment = completedBuild.alignment || 'neutral';
      if (buildAlignment !== requirements.alignment) {
        return `Alignment must be ${requirements.alignment}`;
      }
    }

    return null;
  }

  /**
   * Get build-specific bonus for archetype.
   */
  static _getBuildSpecificBonus(completedBuild, kit) {
    const archetype = completedBuild.archetype || '';
    const modifiers = kit.buildModifiers || {};

    for (const [pattern, bonus] of Object.entries(modifiers)) {
      if (this._patternMatches(archetype, pattern)) {
        return bonus;
      }
    }

    return null;
  }

  /**
   * Check if archetype matches pattern (e.g., 'soldier-*').
   */
  static _patternMatches(archetype, pattern) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$', 'i');
    return regex.test(archetype);
  }

  /**
   * Calculate affinity score between archetype and faction.
   */
  static _calculateAffinityScore(archetype, kit) {
    let score = 0.5; // Base score

    // Check build modifiers for direct matches
    for (const pattern of Object.keys(kit.buildModifiers || {})) {
      if (this._patternMatches(archetype, pattern)) {
        score += 0.5;
        break;
      }
    }

    return score;
  }

  /**
   * Get affinity reasoning.
   */
  static _getAffinityReason(archetype, factionId) {
    const reasons = {
      'rebel-alliance': 'Soldiers and rogues fight for the Rebellion',
      'sith-empire': 'The Empire rewards strength and power',
      'jedi-order': 'The Jedi seek balance and peace',
      'trading-consortium': 'Merchants and traders profit from opportunity',
      'bounty-hunters-guild': 'Hunters thrive on credits and reputation',
      'independent': 'Independents chart their own course',
    };
    return reasons[factionId] || 'Suitable for this faction';
  }

  /**
   * Generate human-readable benefit summary.
   */
  static _generateBenefitSummary(augmentedBuild) {
    const benefits = augmentedBuild.appliedBenefits;
    const lines = [];

    if (benefits.credits > 0) {
      lines.push(`+${benefits.credits} starting credits`);
    }

    if (benefits.equipment.length > 0) {
      lines.push(`Equipment: ${benefits.equipment.join(', ')}`);
    }

    if (benefits.talents.length > 0) {
      lines.push(`Access to: ${benefits.talents.join(', ')}`);
    }

    if (augmentedBuild.buildSpecificBonus) {
      lines.push(`Archetype Bonus: ${augmentedBuild.buildSpecificBonus.talentBonus}`);
      if (augmentedBuild.buildSpecificBonus.creditBonus) {
        lines.push(`+${augmentedBuild.buildSpecificBonus.creditBonus} bonus credits`);
      }
    }

    return lines;
  }
}
