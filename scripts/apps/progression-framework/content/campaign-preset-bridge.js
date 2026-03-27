/**
 * Campaign Preset Bridge — Phase 8 Step 5
 *
 * Connects packaged build library to campaign-specific starter packages.
 * Allows campaigns to curate build selections without modifying progression.
 */

export class CampaignPresetBridge {
  /**
   * Campaign preset definitions (maps campaigns to recommended build sets).
   */
  static CAMPAIGN_PRESETS = {
    'rebel-alliance': {
      name: 'Rebel Alliance Campaign',
      description: 'Focus on squad-based tactics and galactic rebellion',
      recommendedBuilds: [
        { buildId: 'soldier-tank', reason: 'Front-line squad anchor' },
        { buildId: 'soldier-gunner', reason: 'Long-range fire support' },
        { buildId: 'scoundrel-charmer', reason: 'Diplomat and face' },
        { buildId: 'jedi-knight', reason: 'Force-using protector' },
      ],
      specialRules: ['squad-coordination', 'faction-benefits'],
      startingCredits: 2500,
      factionBenefit: 'Rebel Access',
    },
    'sith-empire': {
      name: 'Sith Empire Campaign',
      description: 'Embrace the dark side in service to the Empire',
      recommendedBuilds: [
        { buildId: 'soldier-striker', reason: 'Imperial soldier' },
        { buildId: 'scoundrel-infiltrator', reason: 'Imperial agent' },
        { buildId: 'tech-engineer', reason: 'Imperial military tech' },
        { buildId: 'jedi-knight', reason: 'Fallen Jedi path' },
      ],
      specialRules: ['dark-side-benefits', 'imperial-hierarchy'],
      startingCredits: 3000,
      factionBenefit: 'Imperial Commission',
    },
    'trading-consortium': {
      name: 'Trading Consortium Campaign',
      description: 'Mercantile ventures and profit-driven adventure',
      recommendedBuilds: [
        { buildId: 'scoundrel-charmer', reason: 'Merchants and negotiators' },
        { buildId: 'tech-hacker', reason: 'System access and cargo tracking' },
        { buildId: 'soldier-gunner', reason: 'Security and protection' },
        { buildId: 'tech-engineer', reason: 'Equipment and logistics' },
      ],
      specialRules: ['trade-network', 'profit-sharing'],
      startingCredits: 2000,
      factionBenefit: 'Trade Routes Access',
    },
    'bounty-hunters-guild': {
      name: 'Bounty Hunters Guild Campaign',
      description: 'Hunt targets across the galaxy for credits',
      recommendedBuilds: [
        { buildId: 'soldier-gunner', reason: 'Ranged specialist' },
        { buildId: 'scoundrel-infiltrator', reason: 'Target tracking' },
        { buildId: 'soldier-striker', reason: 'Close combat specialist' },
        { buildId: 'scoundrel-gadgeteer', reason: 'Trap and gear specialist' },
      ],
      specialRules: ['bounty-contracts', 'guild-reputation'],
      startingCredits: 1500,
      factionBenefit: 'Guild Contracts',
    },
    'jedi-order': {
      name: 'Jedi Order Campaign',
      description: 'Serve the light side as Jedi peacekeepers',
      recommendedBuilds: [
        { buildId: 'jedi-knight', reason: 'Combat-focused Jedi' },
        { buildId: 'jedi-consular', reason: 'Support and diplomacy' },
        { buildId: 'jedi-sentinel', reason: 'Perception and investigation' },
        { buildId: 'soldier-defender', reason: 'Force-augmented protector' },
      ],
      specialRules: ['jedi-code', 'force-tradition'],
      startingCredits: 1000,
      factionBenefit: 'Jedi Temple Access',
    },
    'rouge-exploration': {
      name: 'Rogue Exploration Campaign',
      description: 'Frontier explorers seeking fortune and discovery',
      recommendedBuilds: [
        { buildId: 'soldier-gunner', reason: 'Self-reliant gunslinger' },
        { buildId: 'tech-engineer', reason: 'Equipment repair and innovation' },
        { buildId: 'scoundrel-infiltrator', reason: 'Wilderness scout' },
        { buildId: 'scoundrel-charmer', reason: 'Negotiator with locals' },
      ],
      specialRules: ['frontier-law', 'discovery-rewards'],
      startingCredits: 2000,
      factionBenefit: 'Explorer\'s Guild Access',
    },
  };

  /**
   * Get all available campaign presets.
   * @returns {Array} Campaign preset summaries
   */
  static getAvailableCampaigns() {
    return Object.entries(this.CAMPAIGN_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      buildCount: preset.recommendedBuilds.length,
    }));
  }

  /**
   * Get full preset for a campaign.
   * @param {String} campaignId - Campaign identifier
   * @returns {Object} Campaign preset with all details
   */
  static getPresetForCampaign(campaignId) {
    return this.CAMPAIGN_PRESETS[campaignId] || null;
  }

  /**
   * Get recommended builds for a campaign.
   * @param {String} campaignId - Campaign identifier
   * @returns {Array} Recommended builds for campaign
   */
  static getPresetBuildsForCampaign(campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    if (!preset) return [];

    return preset.recommendedBuilds.map(build => ({
      ...build,
      campaign: campaignId,
      campaignName: preset.name,
    }));
  }

  /**
   * Get special rules for a campaign.
   * @param {String} campaignId - Campaign identifier
   * @returns {Array} Special rules active in campaign
   */
  static getSpecialRulesForCampaign(campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    if (!preset) return [];

    return preset.specialRules || [];
  }

  /**
   * Get starting credits for a campaign.
   * @param {String} campaignId - Campaign identifier
   * @returns {Number} Starting credits for new characters
   */
  static getStartingCreditsForCampaign(campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    return preset?.startingCredits || 2500;
  }

  /**
   * Get faction benefit for a campaign.
   * @param {String} campaignId - Campaign identifier
   * @returns {String} Faction benefit description
   */
  static getFactionBenefitForCampaign(campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    return preset?.factionBenefit || null;
  }

  /**
   * Filter builds compatible with campaign.
   * @param {String} campaignId - Campaign identifier
   * @param {Array} allBuilds - Available builds
   * @returns {Array} Recommended and compatible builds
   */
  static filterBuildsForCampaign(campaignId, allBuilds) {
    const preset = this.getPresetForCampaign(campaignId);
    if (!preset) return allBuilds;

    const recommendedIds = new Set(preset.recommendedBuilds.map(b => b.buildId));

    return allBuilds.map(build => ({
      ...build,
      isRecommended: recommendedIds.has(build.id),
      campaignReason: preset.recommendedBuilds.find(b => b.buildId === build.id)?.reason,
    }));
  }

  /**
   * Generate campaign-specific onboarding text.
   * @param {String} campaignId - Campaign identifier
   * @returns {Object} Onboarding context and flavor
   */
  static getCampaignOnboarding(campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    if (!preset) return null;

    const flavorText = {
      'rebel-alliance': 'You join the fight against the Empire. Your skills serve the cause of freedom.',
      'sith-empire': 'You serve the Sith Empire. Strength and power are your only guides.',
      'trading-consortium': 'Business is opportunity. Profit awaits those bold enough to seize it.',
      'bounty-hunters-guild': 'Every target has a price. Every price has a hunter willing to pay it.',
      'jedi-order': 'The Force flows through you. Protect those who cannot protect themselves.',
      'rouge-exploration': 'The frontier waits for no one. Claim your fortune among the stars.',
    };

    return {
      campaign: preset.name,
      tagline: flavorText[campaignId] || preset.description,
      factionBenefit: preset.factionBenefit,
      startingCredits: preset.startingCredits,
      recommendedRoles: preset.recommendedBuilds.map(b => b.buildId),
      nextSteps: [
        'Review recommended builds for your campaign',
        'Choose your archetype and specialization',
        'Customize your build with feats and talents',
        'Select starting equipment appropriate to your role',
      ],
    };
  }

  /**
   * Check if a completed build fits a campaign theme.
   * @param {Object} completedBuild - Character build output
   * @param {String} campaignId - Campaign identifier
   * @returns {Boolean} Whether build fits campaign
   */
  static isBuildCompatibleWithCampaign(completedBuild, campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    if (!preset) return true;

    const buildId = completedBuild.id || completedBuild.buildId;
    const recommendedIds = preset.recommendedBuilds.map(b => b.buildId);

    return recommendedIds.includes(buildId);
  }

  /**
   * Get campaign recommendation score for a build.
   * @param {Object} completedBuild - Character build output
   * @param {String} campaignId - Campaign identifier
   * @returns {Object} Score and reasoning
   */
  static getCampaignRecommendationScore(completedBuild, campaignId) {
    const preset = this.getPresetForCampaign(campaignId);
    if (!preset) return { score: 0.5, reason: 'Campaign not found' };

    const buildId = completedBuild.id || completedBuild.buildId;
    const match = preset.recommendedBuilds.find(b => b.buildId === buildId);

    if (match) {
      return {
        score: 1.0,
        reason: `Recommended for this campaign: ${match.reason}`,
        matchType: 'perfect',
      };
    }

    // Check if archetype matches any recommended build
    const completedArchetype = completedBuild.archetype;
    const archetypeMatches = preset.recommendedBuilds.filter(b =>
      b.buildId.includes(completedArchetype)
    );

    if (archetypeMatches.length > 0) {
      return {
        score: 0.7,
        reason: `Similar archetype to campaign recommendations`,
        matchType: 'archetype',
      };
    }

    return {
      score: 0.4,
      reason: 'Less common for this campaign (still playable)',
      matchType: 'uncommon',
    };
  }
}
