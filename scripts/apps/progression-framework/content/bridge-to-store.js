/**
 * Bridge to Store — Phase 8 Step 5
 *
 * Connects packaged builds to store system for recommended starting purchases.
 * Suggests gear progressions and purchase priorities without modifying progression state.
 */

export class BridgeToStore {
  /**
   * Purchase recommendations by archetype (ranked by priority).
   */
  static PURCHASE_RECOMMENDATIONS = {
    'soldier-tank': [
      {
        item: 'reinforced-armor-plating',
        priority: 1,
        cost: 500,
        reason: 'Increases AC by +2 for tank role',
        synergies: ['shield-talents', 'combat-armor'],
      },
      {
        item: 'combat-shield-upgrade',
        priority: 2,
        cost: 300,
        reason: 'Boosts shield effectiveness',
        synergies: ['shield-talents', 'defensive-stance'],
      },
      {
        item: 'medkit-advanced',
        priority: 3,
        cost: 250,
        reason: 'Extended healing in combat',
        synergies: ['survival-skills', 'camp-management'],
      },
    ],
    'soldier-striker': [
      {
        item: 'weapon-masterwork-upgrade',
        priority: 1,
        cost: 600,
        reason: '+1 damage and critical threat',
        synergies: ['weapon-focus', 'power-attack'],
      },
      {
        item: 'combat-enhancement-serum',
        priority: 2,
        cost: 400,
        reason: '+2 STR for burst damage',
        synergies: ['melee-focus', 'strength-talents'],
      },
      {
        item: 'light-armor-upgrade',
        priority: 3,
        cost: 200,
        reason: 'AC without slowing you down',
        synergies: ['mobility-focus'],
      },
    ],
    'soldier-gunner': [
      {
        item: 'targeting-scope-advanced',
        priority: 1,
        cost: 550,
        reason: '+2 ranged attack and critical range',
        synergies: ['weapon-focus', 'ranged-tactics'],
      },
      {
        item: 'precision-ammunition',
        priority: 2,
        cost: 300,
        reason: '+1d6 damage per shot',
        synergies: ['ranged-focus', 'marksman-feats'],
      },
      {
        item: 'evasion-gear',
        priority: 3,
        cost: 250,
        reason: 'AC boost without weight penalty',
        synergies: ['evasion', 'mobility-feats'],
      },
    ],
    'soldier-defender': [
      {
        item: 'shield-generator-tier2',
        priority: 1,
        cost: 700,
        reason: '+3 AC and damage reduction',
        synergies: ['shield-focus', 'protection-feats'],
      },
      {
        item: 'heavy-armor-masterwork',
        priority: 2,
        cost: 400,
        reason: '+2 AC, -1 ACP penalty',
        synergies: ['heavy-armor-prof', 'tank-focus'],
      },
      {
        item: 'resistance-crystal',
        priority: 3,
        cost: 300,
        reason: 'Energy damage reduction',
        synergies: ['defensive-talents'],
      },
    ],
    'scoundrel-charmer': [
      {
        item: 'presence-enhancement',
        priority: 1,
        cost: 400,
        reason: '+2 CHA for social encounters',
        synergies: ['charisma-focus', 'leadership'],
      },
      {
        item: 'false-identity-kit-advanced',
        priority: 2,
        cost: 300,
        reason: 'Better deception tools',
        synergies: ['deception-skills', 'bluff'],
      },
      {
        item: 'light-armor-masterwork',
        priority: 3,
        cost: 250,
        reason: '+1 AC at no weight cost',
        synergies: ['evasion-focus'],
      },
    ],
    'scoundrel-infiltrator': [
      {
        item: 'stealth-suit-advanced',
        priority: 1,
        cost: 500,
        reason: '+3 stealth, improved concealment',
        synergies: ['stealth-focus', 'sneak-attack'],
      },
      {
        item: 'lockpick-masterwork-kit',
        priority: 2,
        cost: 300,
        reason: 'Never gets stuck on doors/traps',
        synergies: ['infiltration-talents'],
      },
      {
        item: 'silencer-attachment',
        priority: 3,
        cost: 200,
        reason: 'Weapons don\'t alert enemies',
        synergies: ['sneak-attack', 'assassination'],
      },
    ],
    'jedi-knight': [
      {
        item: 'lightsaber-tuning-kit',
        priority: 1,
        cost: 600,
        reason: '+1 damage and better force synergy',
        synergies: ['lightsaber-form', 'force-talents'],
      },
      {
        item: 'force-channeling-robes',
        priority: 2,
        cost: 400,
        reason: '+1 force power DC',
        synergies: ['force-shield', 'force-talents'],
      },
      {
        item: 'meditation-chamber-access',
        priority: 3,
        cost: 500,
        reason: 'Meditate for force power recovery',
        synergies: ['force-focus', 'wisdom-talents'],
      },
    ],
    'jedi-consular': [
      {
        item: 'healing-focus-pendant',
        priority: 1,
        cost: 400,
        reason: '+1 healing talent effectiveness',
        synergies: ['healing-talents', 'support-focus'],
      },
      {
        item: 'force-persuasion-enhancement',
        priority: 2,
        cost: 300,
        reason: '+2 force persuasion checks',
        synergies: ['force-talents', 'charisma-focus'],
      },
      {
        item: 'medkit-advanced',
        priority: 3,
        cost: 250,
        reason: 'Backup healing resources',
        synergies: ['healing-focus'],
      },
    ],
    'tech-engineer': [
      {
        item: 'tool-kit-masterwork',
        priority: 1,
        cost: 550,
        reason: '+2 crafting bonus',
        synergies: ['craft-focus', 'masterwork-talents'],
      },
      {
        item: 'rare-materials-cache',
        priority: 2,
        cost: 400,
        reason: 'Better components for crafting',
        synergies: ['innovation-focus', 'crafting-talents'],
      },
      {
        item: 'workshop-portable',
        priority: 3,
        cost: 300,
        reason: 'Craft anywhere',
        synergies: ['mobile-crafting'],
      },
    ],
    'tech-hacker': [
      {
        item: 'hacking-suite-advanced',
        priority: 1,
        cost: 600,
        reason: '+3 hacking checks, new exploit access',
        synergies: ['hacking-focus', 'security-talents'],
      },
      {
        item: 'portable-terminal-tier2',
        priority: 2,
        cost: 400,
        reason: 'More processing power for complex systems',
        synergies: ['hacking-talents', 'tech-focus'],
      },
      {
        item: 'encryption-breaker',
        priority: 3,
        cost: 350,
        reason: 'Bypass standard security',
        synergies: ['hacking-expertise'],
      },
    ],
  };

  /**
   * Get recommended purchases for a completed build.
   * @param {Object} completedBuild - Build output
   * @returns {Object} Ranked purchase recommendations
   */
  static getRecommendedStartingPurchases(completedBuild) {
    if (!completedBuild) return null;

    const archetype = completedBuild.archetype || completedBuild.suggestedArchetype;
    const recommendations = this.PURCHASE_RECOMMENDATIONS[archetype] || [];

    return {
      archetype,
      recommendations: recommendations.map(rec => ({
        ...rec,
        buildApplies: this._checkBuildApplies(completedBuild, rec),
      })),
      budgetTiers: this._generateBudgetTiers(recommendations),
      totalOptimal: recommendations.reduce((sum, r) => sum + r.cost, 0),
    };
  }

  /**
   * Get purchases by budget tier.
   * @param {Object} completedBuild - Build output
   * @param {Number} budget - Starting credits available
   * @returns {Array} Items affordable within budget
   */
  static getAffordableItems(completedBuild, budget) {
    const recommendations = this.getRecommendedStartingPurchases(completedBuild);
    if (!recommendations) return [];

    return recommendations.recommendations
      .filter(rec => rec.cost <= budget)
      .sort((a, b) => a.priority - b.priority)
      .map(rec => ({
        item: rec.item,
        cost: rec.cost,
        reason: rec.reason,
        savings: budget - rec.cost,
      }));
  }

  /**
   * Get upgrade path (what to purchase later with gained credits).
   * @param {Object} completedBuild - Build output
   * @returns {Array} Planned purchases in order
   */
  static getUpgradePath(completedBuild) {
    const recommendations = this.getRecommendedStartingPurchases(completedBuild);
    if (!recommendations) return [];

    return recommendations.recommendations.map((rec, idx) => ({
      stage: idx + 1,
      item: rec.item,
      cost: rec.cost,
      reason: rec.reason,
      unlockLevel: 1 + (idx * 3), // Rough estimate
    }));
  }

  /**
   * Check if a purchase synergizes with build.
   */
  static _checkBuildApplies(completedBuild, recommendation) {
    if (!recommendation.synergies) return true;

    const chosenFeats = completedBuild.chosenFeats || [];
    const suggestedAbilities = completedBuild.suggestedAbilities || [];

    return recommendation.synergies.some(syn =>
      chosenFeats.some(f => f.toLowerCase().includes(syn)) ||
      suggestedAbilities.some(a => a.toLowerCase().includes(syn))
    );
  }

  /**
   * Generate purchase tiers by budget.
   */
  static _generateBudgetTiers(recommendations) {
    const tiers = [250, 500, 1000, 2000];
    return tiers.map(budget => ({
      budget,
      items: recommendations
        .filter(r => r.cost <= budget)
        .sort((a, b) => a.priority - b.priority),
      totalCost: recommendations
        .filter(r => r.cost <= budget)
        .reduce((sum, r) => sum + r.cost, 0),
    }));
  }
}
