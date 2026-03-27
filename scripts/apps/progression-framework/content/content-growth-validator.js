/**
 * Content Growth Validator — Phase 8 Step 7
 *
 * Prevents content drift as Phase 8 library grows.
 * Validates builds, targets, advisory profiles, and ecosystem bridges.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ContentGrowthValidator {
  /**
   * Validate entire build catalog.
   * @param {Object} buildRegistry - PackagedBuildRegistry
   * @returns {Object} Validation report
   */
  static validateBuildCatalog(buildRegistry) {
    const report = {
      totalBuilds: 0,
      validBuilds: 0,
      issues: [],
      warnings: [],
      coverage: {},
    };

    if (!buildRegistry?.getAllBuilds) {
      return { error: 'Invalid build registry provided' };
    }

    const builds = buildRegistry.getAllBuilds();
    report.totalBuilds = builds.length;

    for (const build of builds) {
      const validation = this._validateSingleBuild(build);
      if (validation.valid) {
        report.validBuilds++;
      } else {
        report.issues.push({
          buildId: build.id,
          problems: validation.errors,
        });
      }
      report.warnings.push(...validation.warnings);
    }

    // Coverage analysis
    const byClass = {};
    const byArchetype = {};
    builds.forEach(b => {
      byClass[b.className] = (byClass[b.className] || 0) + 1;
      b.archetypes?.forEach(a => {
        byArchetype[a] = (byArchetype[a] || 0) + 1;
      });
    });

    report.coverage = { byClass, byArchetype };
    report.success = report.issues.length === 0;

    return report;
  }

  /**
   * Validate single build object.
   */
  static _validateSingleBuild(build) {
    const errors = [];
    const warnings = [];

    if (!build.id) errors.push('Missing build ID');
    if (!build.name) errors.push('Missing build name');
    if (!build.className) errors.push('Missing class');
    if (!build.templateId) errors.push('Missing template reference');
    if (!Array.isArray(build.archetypes)) warnings.push('No archetypes defined');
    if (!build.supportLevel) warnings.push('No support level declared');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate target coverage.
   * @param {Object} targetRegistry - TargetPathDefinitions
   * @returns {Object} Coverage report
   */
  static validateTargetCoverage(targetRegistry) {
    const report = {
      totalTargets: 0,
      byType: {},
      archetypesCovered: new Set(),
      issues: [],
      gaps: [],
    };

    if (!targetRegistry?.getAllTargets) {
      return { error: 'Invalid target registry provided' };
    }

    const targets = targetRegistry.getAllTargets();
    report.totalTargets = targets.length;

    // Organize by type
    targets.forEach(target => {
      if (!report.byType[target.type]) {
        report.byType[target.type] = [];
      }
      report.byType[target.type].push(target);

      // Track archetypes
      target.archetypeAlignment?.forEach(a => report.archetypesCovered.add(a));

      // Validate target
      if (!target.id || !target.name) {
        report.issues.push(`Target missing id/name: ${target.id}`);
      }
      if (!target.unlockLevel) {
        report.issues.push(`Target ${target.id} has no unlock level`);
      }
    });

    // Identify gaps
    const expectedArchetypes = [
      'tank', 'striker', 'gunner', 'charmer', 'infiltrator',
      'knight', 'healer', 'engineer', 'hacker', 'leader'
    ];

    expectedArchetypes.forEach(arch => {
      if (!report.archetypesCovered.has(arch)) {
        report.gaps.push(`No targets for archetype: ${arch}`);
      }
    });

    report.archetypesCovered = Array.from(report.archetypesCovered);
    report.success = report.issues.length === 0 && report.gaps.length === 0;

    return report;
  }

  /**
   * Validate advisory profile coverage.
   * @param {Object} advisoryRegistry - AdvisoryDomainProfiles
   * @returns {Object} Coverage report
   */
  static validateAdvisoryCoverage(advisoryRegistry) {
    const report = {
      totalProfiles: 0,
      domains: [],
      issues: [],
      warnings: [],
    };

    if (!advisoryRegistry?.getAllProfiles) {
      return { error: 'Invalid advisory registry provided' };
    }

    const profiles = advisoryRegistry.getAllProfiles();
    report.totalProfiles = profiles.length;

    for (const profile of profiles) {
      report.domains.push(profile.domain);

      // Validate profile structure
      if (!profile.domain) report.issues.push('Profile missing domain');
      if (!profile.mentorBias) report.issues.push(`Profile ${profile.domain} missing mentorBias`);
      if (!Array.isArray(profile.prioritySignals) || profile.prioritySignals.length === 0) {
        report.warnings.push(`Profile ${profile.domain} has weak priority signals`);
      }
      if (!Array.isArray(profile.warningSignals) || profile.warningSignals.length === 0) {
        report.warnings.push(`Profile ${profile.domain} has no warning signals`);
      }
    }

    report.success = report.issues.length === 0;
    return report;
  }

  /**
   * Validate ecosystem bridge health.
   * @param {Object} equipmentBridge - BridgeToStartingEquipment
   * @param {Object} storeBridge - BridgeToStore
   * @param {Object} campaignBridge - CampaignPresetBridge
   * @param {Object} factionBridge - FactionKitBridge
   * @returns {Object} Bridge validation report
   */
  static validateEcosystemBridges(equipmentBridge, storeBridge, campaignBridge, factionBridge) {
    const report = {
      equipment: this._validateEquipmentBridge(equipmentBridge),
      store: this._validateStoreBridge(storeBridge),
      campaign: this._validateCampaignBridge(campaignBridge),
      faction: this._validateFactionBridge(factionBridge),
      overallHealth: true,
    };

    report.overallHealth = [
      report.equipment.valid,
      report.store.valid,
      report.campaign.valid,
      report.faction.valid,
    ].every(v => v);

    return report;
  }

  /**
   * Validate equipment bridge.
   */
  static _validateEquipmentBridge(bridge) {
    const report = { valid: true, issues: [], coverage: 0 };

    if (!bridge?.LOADOUT_TEMPLATES) {
      report.valid = false;
      report.issues.push('Missing LOADOUT_TEMPLATES');
      return report;
    }

    const loadouts = Object.keys(bridge.LOADOUT_TEMPLATES);
    report.coverage = loadouts.length;

    if (loadouts.length < 10) {
      report.issues.push(`Low loadout coverage: only ${loadouts.length} archetypes`);
    }

    return report;
  }

  /**
   * Validate store bridge.
   */
  static _validateStoreBridge(bridge) {
    const report = { valid: true, issues: [], coverage: 0 };

    if (!bridge?.PURCHASE_RECOMMENDATIONS) {
      report.valid = false;
      report.issues.push('Missing PURCHASE_RECOMMENDATIONS');
      return report;
    }

    const recommendations = Object.entries(bridge.PURCHASE_RECOMMENDATIONS);
    report.coverage = recommendations.length;

    for (const [arch, items] of recommendations) {
      if (!Array.isArray(items) || items.length === 0) {
        report.issues.push(`Archetype ${arch} has no purchase recommendations`);
      }
    }

    return report;
  }

  /**
   * Validate campaign bridge.
   */
  static _validateCampaignBridge(bridge) {
    const report = { valid: true, issues: [], campaigns: 0 };

    if (!bridge?.CAMPAIGN_PRESETS) {
      report.valid = false;
      report.issues.push('Missing CAMPAIGN_PRESETS');
      return report;
    }

    const campaigns = Object.keys(bridge.CAMPAIGN_PRESETS);
    report.campaigns = campaigns.length;

    if (campaigns.length < 3) {
      report.issues.push(`Low campaign coverage: only ${campaigns.length} presets`);
    }

    return report;
  }

  /**
   * Validate faction bridge.
   */
  static _validateFactionBridge(bridge) {
    const report = { valid: true, issues: [], factions: 0 };

    if (!bridge?.FACTION_KITS) {
      report.valid = false;
      report.issues.push('Missing FACTION_KITS');
      return report;
    }

    const factions = Object.keys(bridge.FACTION_KITS);
    report.factions = factions.length;

    for (const faction of factions) {
      const kit = bridge.FACTION_KITS[faction];
      if (!kit.name || !kit.description) {
        report.issues.push(`Faction ${faction} missing name/description`);
      }
    }

    return report;
  }

  /**
   * Generate comprehensive Phase 8 content audit.
   * @param {Object} registries - All registries to validate
   * @returns {Object} Full audit report
   */
  static generatePhase8Report(registries) {
    const report = {
      timestamp: new Date().toISOString(),
      phase: 8,
      overall: 'PENDING',
      sections: {},
    };

    if (registries.buildRegistry) {
      report.sections.builds = this.validateBuildCatalog(registries.buildRegistry);
    }

    if (registries.targetRegistry) {
      report.sections.targets = this.validateTargetCoverage(registries.targetRegistry);
    }

    if (registries.advisoryRegistry) {
      report.sections.advisory = this.validateAdvisoryCoverage(registries.advisoryRegistry);
    }

    if (registries.bridges) {
      report.sections.bridges = this.validateEcosystemBridges(
        registries.bridges.equipment,
        registries.bridges.store,
        registries.bridges.campaign,
        registries.bridges.faction
      );
    }

    // Determine overall status
    const allValid = Object.values(report.sections).every(s => s.success !== false);
    report.overall = allValid ? 'HEALTHY' : 'ISSUES_DETECTED';

    return report;
  }

  /**
   * Log validation results.
   */
  static logValidationResults(report) {
    swseLogger?.log({
      type: 'CONTENT_VALIDATION',
      report,
      timestamp: new Date().toISOString(),
    });
  }
}
