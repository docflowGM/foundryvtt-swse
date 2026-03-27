/**
 * Template Personalization Engine — Phase 8 Step 6
 *
 * Adds controlled variation to packaged builds, reducing generic feel.
 * Creates template variants based on archetype and chosen traits.
 */

export class TemplatePersonalizationEngine {
  /**
   * Personalization options for each archetype.
   */
  static PERSONALIZATION_VARIANTS = {
    'soldier-tank': [
      {
        variant: 'shield-focus',
        label: 'Shield Mastery',
        description: 'Prioritize shield talents and defensive feats',
        modifiers: {
          featBonus: 'shield-focus',
          talentPreference: ['shield-talents', 'defensive-stance'],
          equipmentSwap: 'shield-generator-upgrade',
        },
        unlockLevel: 1,
      },
      {
        variant: 'unarmed-focus',
        label: 'Martial Arts',
        description: 'Unarmed combat with armor synergy',
        modifiers: {
          featBonus: 'unarmed-combat',
          talentPreference: ['martial-arts', 'armor-mastery'],
          equipmentSwap: 'reinforced-gloves',
        },
        unlockLevel: 3,
      },
    ],
    'soldier-striker': [
      {
        variant: 'melee-master',
        label: 'Sword Master',
        description: 'Specialize in single melee weapon',
        modifiers: {
          featBonus: 'weapon-focus',
          talentPreference: ['lightsaber-form', 'melee-mastery'],
          equipmentSwap: 'masterwork-weapon',
        },
        unlockLevel: 1,
      },
      {
        variant: 'dual-wield',
        label: 'Dual Wielder',
        description: 'Fight with two weapons for mobility',
        modifiers: {
          featBonus: 'dual-wield-combat',
          talentPreference: ['two-weapon-fighting', 'mobility'],
          equipmentSwap: 'paired-weapons',
        },
        unlockLevel: 5,
      },
    ],
    'soldier-gunner': [
      {
        variant: 'sniper-specialist',
        label: 'Sniper',
        description: 'Precision long-range shooting from cover',
        modifiers: {
          featBonus: 'precise-shot',
          talentPreference: ['range-mastery', 'positioning'],
          equipmentSwap: 'sniper-rifle-advanced',
        },
        unlockLevel: 1,
      },
      {
        variant: 'rapid-fire',
        label: 'Gunslinger',
        description: 'Fast shooting with multiple weapons',
        modifiers: {
          featBonus: 'rapid-fire',
          talentPreference: ['quick-draw', 'burst-fire'],
          equipmentSwap: 'blaster-pistol-pair',
        },
        unlockLevel: 3,
      },
    ],
    'scoundrel-charmer': [
      {
        variant: 'politician',
        label: 'Diplomat',
        description: 'Negotiation and influence-focused',
        modifiers: {
          featBonus: 'leadership',
          talentPreference: ['persuasion', 'insight'],
          equipmentSwap: 'elegant-attire',
        },
        unlockLevel: 1,
      },
      {
        variant: 'con-artist',
        label: 'Trickster',
        description: 'Deception and quick thinking',
        modifiers: {
          featBonus: 'deceptive-talents',
          talentPreference: ['deception', 'improvisation'],
          equipmentSwap: 'false-id-kit-advanced',
        },
        unlockLevel: 3,
      },
    ],
    'scoundrel-infiltrator': [
      {
        variant: 'ghost-assassin',
        label: 'Assassin',
        description: 'Maximize stealth and lethal strikes',
        modifiers: {
          featBonus: 'deadly-precision',
          talentPreference: ['stealth-mastery', 'sneak-attack'],
          equipmentSwap: 'silenced-weapon',
        },
        unlockLevel: 1,
      },
      {
        variant: 'scout',
        label: 'Scout',
        description: 'Reconnaissance and positioning',
        modifiers: {
          featBonus: 'surveillance',
          talentPreference: ['awareness', 'tracking'],
          equipmentSwap: 'detection-kit',
        },
        unlockLevel: 3,
      },
    ],
    'jedi-knight': [
      {
        variant: 'guardian',
        label: 'Guardian',
        description: 'Combat focus with Force defense',
        modifiers: {
          featBonus: 'force-shield',
          talentPreference: ['lightsaber-form', 'combat-force'],
          equipmentSwap: 'lightsaber-defensive',
        },
        unlockLevel: 1,
      },
      {
        variant: 'aggressor',
        label: 'Aggressor',
        description: 'Offensive Force use with melee',
        modifiers: {
          featBonus: 'force-strike',
          talentPreference: ['force-lightning', 'aggressive-forms'],
          equipmentSwap: 'lightsaber-aggressive',
        },
        unlockLevel: 5,
      },
    ],
    'jedi-consular': [
      {
        variant: 'healer',
        label: 'Healer',
        description: 'Support and restoration focus',
        modifiers: {
          featBonus: 'force-healing',
          talentPreference: ['healing-talents', 'protective-force'],
          equipmentSwap: 'healing-focus-pendant',
        },
        unlockLevel: 1,
      },
      {
        variant: 'diplomat',
        label: 'Diplomat',
        description: 'Persuasion through Force and charisma',
        modifiers: {
          featBonus: 'force-persuasion',
          talentPreference: ['mind-influence', 'negotiation'],
          equipmentSwap: 'force-affinity-crystal',
        },
        unlockLevel: 3,
      },
    ],
  };

  /**
   * Get personalization options for an archetype.
   * @param {String} archetype - Build archetype
   * @returns {Array} Available personalization variants
   */
  static getPersonalizationOptions(archetype) {
    return this.PERSONALIZATION_VARIANTS[archetype] || [];
  }

  /**
   * Apply a personalization variant to a template.
   * @param {Object} template - Build template
   * @param {String} archetype - Build archetype
   * @param {String} variantId - Variant identifier
   * @returns {Object} Personalized template
   */
  static applyPersonalizationVariant(template, archetype, variantId) {
    const options = this.getPersonalizationOptions(archetype);
    const variant = options.find(opt => opt.variant === variantId);

    if (!variant) return template;

    return {
      ...template,
      personalization: {
        variant: variant.variant,
        label: variant.label,
        description: variant.description,
      },
      suggestedFeatBonus: variant.modifiers.featBonus,
      talentPreferences: variant.modifiers.talentPreference,
      recommendedEquipmentSwap: variant.modifiers.equipmentSwap,
    };
  }

  /**
   * Recommend personalization variant based on build choices.
   * @param {Object} completedBuild - Character build
   * @returns {Object} Recommended variant with reasoning
   */
  static recommendPersonalizationVariant(completedBuild) {
    const archetype = completedBuild.archetype || '';
    const options = this.getPersonalizationOptions(archetype);

    if (options.length === 0) {
      return { recommendation: 'default', reason: 'No variants available' };
    }

    // Score each variant against chosen feats/talents
    const chosenFeats = (completedBuild.chosenFeats || []).map(f => f.toLowerCase());
    const chosenTalents = (completedBuild.chosenTalents || []).map(t => t.toLowerCase());

    const scores = options.map(variant => {
      let score = 0;
      const modFeats = (variant.modifiers.featBonus || '').toLowerCase();
      const modTalents = variant.modifiers.talentPreference.map(t => t.toLowerCase());

      if (chosenFeats.some(f => f.includes(modFeats))) score += 2;
      if (modTalents.some(t => chosenTalents.some(ct => ct.includes(t)))) score += 2;

      return { variant, score };
    });

    const best = scores.sort((a, b) => b.score - a.score)[0];
    return {
      recommendation: best.variant.variant,
      label: best.variant.label,
      description: best.variant.description,
      reason: `Matches your chosen ${best.score > 2 ? 'feats and talents' : 'playstyle'}`,
      score: best.score,
    };
  }

  /**
   * Generate personalization branching points during character creation.
   * @param {Object} template - Build template
   * @param {String} currentLevel - Character level for unlock checking
   * @returns {Array} Available branch decisions
   */
  static getPersonalizationBranchingPoints(template, currentLevel) {
    const archetype = template.archetype || '';
    const options = this.getPersonalizationOptions(archetype);

    return options
      .filter(opt => opt.unlockLevel <= currentLevel)
      .map(opt => ({
        level: opt.unlockLevel,
        decision: `Choose: ${opt.label}`,
        options: [
          {
            choice: opt.variant,
            label: opt.label,
            description: opt.description,
            preview: this._generateVariantPreview(opt),
          },
        ],
      }));
  }

  /**
   * Generate human-readable preview of a variant.
   */
  static _generateVariantPreview(variant) {
    const lines = [];
    lines.push(`**${variant.label}**`);
    lines.push(variant.description);
    lines.push(`Feat Bonus: ${variant.modifiers.featBonus}`);
    lines.push(`Talent Focus: ${variant.modifiers.talentPreference.join(', ')}`);
    lines.push(`Equipment Upgrade: ${variant.modifiers.equipmentSwap}`);
    return lines.join('\n');
  }
}
