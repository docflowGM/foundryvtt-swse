/**
 * Support Tracker — Phase 6 Work Package G
 *
 * Explicit support level tracking for all progression domains.
 * Honest about what is and isn't complete.
 * Prevents partial-support from masquerading as full support.
 *
 * Support Levels:
 * - FULL: Complete implementation, tested, ready for production
 * - PARTIAL: Core features work, edge cases incomplete
 * - STRUCTURAL: Architecture in place, not yet integrated
 * - UNSUPPORTED: Not implemented, no roadmap
 *
 * Domains:
 * - Actor (chargen, levelup, templates)
 * - Droid (chassis, systems)
 * - NPC (quick builds)
 * - Follower (packaged)
 * - Nonheroic (simplified)
 * - Vehicles/Ships (future)
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class SupportTracker {
  /**
   * Define support levels for all progression domains.
   * Locked: Phase 6 Step 6
   *
   * @returns {Object} Support matrix indexed by domain/feature
   */
  static getSupportMatrix() {
    return {
      chargen: {
        actor: {
          level: 'FULL',
          description: 'Complete character generation',
          features: {
            species: 'FULL',
            class: 'FULL',
            background: 'FULL',
            attributes: 'FULL',
            skills: 'FULL',
            feats: 'FULL',
            talents: 'FULL',
            languages: 'FULL',
            forcePowers: 'FULL',
            forceTechniques: 'FULL',
            forceSecrets: 'FULL',
          },
          tested: true,
          readyForProduction: true,
        },

        droid: {
          level: 'PARTIAL',
          description: 'Droid chargen with limitations',
          features: {
            chassis: 'FULL',
            customizationSystems: 'FULL',
            attributeModifications: 'FULL',
            skillSelection: 'FULL',
            prestigeAccess: 'STRUCTURAL', // Not yet enabled
          },
          limitations: [
            'Prestige droid paths not yet supported',
            'Some force power restrictions TBD',
            'Complex multi-system interactions partially tested',
          ],
          tested: true,
          readyForProduction: true, // Core works
          nextSteps: ['Enable prestige droid paths', 'Complete force droid edge cases'],
        },

        npc: {
          level: 'STRUCTURAL',
          description: 'NPC quick-build templates only',
          features: {
            quickBuildTemplates: 'FULL',
            customProgression: 'UNSUPPORTED',
            levelUpPath: 'UNSUPPORTED',
          },
          limitations: [
            'No custom NPC progression yet',
            'Templates only; manual chargen unsupported',
            'Class restrictions TBD',
          ],
          tested: false,
          readyForProduction: false,
          nextSteps: ['Design NPC custom progression', 'Define class restrictions'],
        },

        follower: {
          level: 'STRUCTURAL',
          description: 'Follower packaged builds only',
          features: {
            packagedBuilds: 'PARTIAL',
            customization: 'UNSUPPORTED',
          },
          limitations: [
            'Not yet integrated into chargen shell',
            'No customization of packaged builds',
            'Level-up not yet supported',
          ],
          tested: false,
          readyForProduction: false,
          nextSteps: ['Integrate into chargen shell', 'Add follower customization'],
        },

        nonheroic: {
          level: 'STRUCTURAL',
          description: 'Simplified nonheroic rules structure',
          features: {
            simplifiedAttributes: 'STRUCTURAL',
            limitedClasses: 'STRUCTURAL',
            reducedChoices: 'STRUCTURAL',
          },
          limitations: [
            'Not yet integrated into chargen shell',
            'Rules simplifications not fully specified',
            'Testing incomplete',
          ],
          tested: false,
          readyForProduction: false,
          nextSteps: ['Define nonheroic rules', 'Integrate into chargen shell'],
        },
      },

      levelup: {
        actor: {
          level: 'FULL',
          description: 'Complete level-up progression',
          features: {
            attributeBoosts: 'FULL',
            featSelection: 'FULL',
            talentSelection: 'FULL',
            forcePowerGrants: 'FULL',
          },
          tested: true,
          readyForProduction: true,
        },

        droid: {
          level: 'PARTIAL',
          description: 'Droid level-up with gaps',
          features: {
            systemUpgrades: 'PARTIAL',
            attributeModifications: 'FULL',
            abilityGrants: 'PARTIAL',
          },
          limitations: [
            'Complex system interactions partially supported',
            'Some upgrade paths TBD',
          ],
          tested: true,
          readyForProduction: true,
          nextSteps: ['Complete system upgrade paths'],
        },

        npc: {
          level: 'UNSUPPORTED',
          description: 'NPC level-up not yet designed',
          features: {},
          tested: false,
          readyForProduction: false,
          nextSteps: ['Design NPC advancement rules'],
        },
      },

      templates: {
        actor: {
          level: 'FULL',
          description: 'Complete template system for actors',
          features: {
            fastBuild: 'FULL',
            validation: 'FULL',
            nodeLocking: 'FULL',
            overrides: 'FULL',
            reconciliation: 'FULL',
            advisory: 'FULL',
          },
          tested: true,
          readyForProduction: true,
        },

        droid: {
          level: 'PARTIAL',
          description: 'Droid templates with limitations',
          features: {
            fastBuild: 'FULL',
            validation: 'FULL',
            nodeLocking: 'FULL',
          },
          limitations: [
            'Some droid-specific validations incomplete',
            'Prestige templates not supported',
          ],
          tested: true,
          readyForProduction: true,
          nextSteps: ['Add prestige droid templates'],
        },

        npc: {
          level: 'FULL',
          description: 'NPC quick-build templates',
          features: {
            packagedBuilds: 'FULL',
            fastApply: 'FULL',
          },
          tested: true,
          readyForProduction: true,
        },
      },

      advisory: {
        suggestions: {
          level: 'FULL',
          description: 'Suggestion ranking and scoring',
          features: {
            legality: 'FULL',
            forecast: 'FULL',
            synergy: 'FULL',
            targeting: 'PARTIAL', // Some target paths TBD
          },
          tested: true,
          readyForProduction: true,
          nextSteps: ['Complete prestige path modeling'],
        },

        mentorContext: {
          level: 'FULL',
          description: 'Mentor dialogue and context',
          features: {
            mentorBias: 'FULL',
            styleHints: 'FULL',
            templateAwareness: 'FULL',
          },
          tested: true,
          readyForProduction: true,
        },

        signals: {
          level: 'FULL',
          description: 'Build signal extraction and normalization',
          features: {
            explicitSignals: 'FULL',
            inferredSignals: 'FULL',
            archetype: 'FULL',
            role: 'FULL',
            targets: 'PARTIAL', // Some prestige targets TBD
          },
          tested: true,
          readyForProduction: true,
          nextSteps: ['Complete prestige target modeling'],
        },
      },

      prerequisites: {
        feats: {
          level: 'FULL',
          description: 'Feat prerequisite checking',
          tested: true,
          readyForProduction: true,
        },

        talents: {
          level: 'FULL',
          description: 'Talent prerequisite checking',
          tested: true,
          readyForProduction: true,
        },

        forcePowers: {
          level: 'FULL',
          description: 'Force power requirement checking',
          tested: true,
          readyForProduction: true,
        },

        multiclass: {
          level: 'PARTIAL',
          description: 'Multiclass edge cases',
          limitations: [
            'Some class combination rules TBD',
            'Prestige multiclass paths incomplete',
          ],
          tested: true,
          readyForProduction: true,
          nextSteps: ['Complete prestige multiclass rules'],
        },

        prestige: {
          level: 'PARTIAL',
          description: 'Prestige class requirements',
          limitations: [
            'Some prestige classes not yet defined',
            'Target path modeling incomplete',
          ],
          tested: false,
          readyForProduction: false,
          nextSteps: ['Define remaining prestige classes', 'Model target paths'],
        },
      },

      domains: {
        vehicles: {
          level: 'UNSUPPORTED',
          description: 'Vehicle/starship progression',
          roadmap: 'Phase 8+',
        },

        companions: {
          level: 'STRUCTURAL',
          description: 'Follower/companion progression',
          roadmap: 'Phase 7',
        },

        prestige: {
          level: 'PARTIAL',
          description: 'Prestige class system',
          coverage: 'Basic paths defined, advanced paths TBD',
          roadmap: 'Phase 7-8',
        },
      },
    };
  }

  /**
   * Get overall support summary.
   *
   * @returns {Object} Summary of support across all domains
   */
  static getSupportSummary() {
    const matrix = this.getSupportMatrix();
    const summary = {
      timestamp: new Date().toISOString(),
      categories: {
        full: [],
        partial: [],
        structural: [],
        unsupported: [],
      },
      stats: {
        fullCount: 0,
        partialCount: 0,
        structuralCount: 0,
        unsupportedCount: 0,
      },
    };

    // Flatten and categorize
    const flattenFeatures = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (value.level) {
          const level = value.level;
          summary.categories[level.toLowerCase()].push({
            path: currentPath,
            description: value.description,
            readyForProduction: value.readyForProduction !== false,
            nextSteps: value.nextSteps || [],
          });
          summary.stats[`${level.toLowerCase()}Count`]++;
        }

        if (value.features) {
          flattenFeatures(value.features, currentPath);
        }
      }
    };

    flattenFeatures(matrix);

    summary.stats.total = Object.values(summary.stats).reduce((a, b) => a + b, 0) - 1; // Subtract total

    return summary;
  }

  /**
   * Generate support report for display/documentation.
   *
   * @returns {string} Formatted report
   */
  static generateSupportReport() {
    const summary = this.getSupportSummary();
    const lines = [];

    lines.push('# PROGRESSION SYSTEM SUPPORT MATRIX');
    lines.push('');
    lines.push(`**Generated:** ${summary.timestamp}`);
    lines.push('');

    lines.push('## Support Summary');
    lines.push(`- ✅ Full: ${summary.stats.fullCount}`);
    lines.push(`- 🟡 Partial: ${summary.stats.partialCount}`);
    lines.push(`- 🔵 Structural: ${summary.stats.structuralCount}`);
    lines.push(`- ❌ Unsupported: ${summary.stats.unsupportedCount}`);
    lines.push('');

    lines.push('## Full Support (Production Ready)');
    for (const item of summary.categories.full) {
      lines.push(`- ✅ **${item.path}**: ${item.description}`);
    }
    lines.push('');

    lines.push('## Partial Support (Known Gaps)');
    for (const item of summary.categories.partial) {
      lines.push(`- 🟡 **${item.path}**: ${item.description}`);
      if (item.nextSteps.length > 0) {
        for (const step of item.nextSteps) {
          lines.push(`  - [ ] ${step}`);
        }
      }
    }
    lines.push('');

    lines.push('## Structural (Not Yet Integrated)');
    for (const item of summary.categories.structural) {
      lines.push(`- 🔵 **${item.path}**: ${item.description}`);
      if (item.nextSteps.length > 0) {
        for (const step of item.nextSteps) {
          lines.push(`  - [ ] ${step}`);
        }
      }
    }
    lines.push('');

    lines.push('## Unsupported (No Roadmap)');
    for (const item of summary.categories.unsupported) {
      lines.push(`- ❌ **${item.path}**: ${item.description}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Check if a feature is production-ready.
   *
   * @param {string} featurePath - e.g., 'chargen.actor.forcePowers'
   * @returns {Object} { ready: boolean, level: string, nextSteps: [] }
   */
  static checkProductionReadiness(featurePath) {
    const matrix = this.getSupportMatrix();
    const parts = featurePath.split('.');

    let current = matrix;
    for (const part of parts) {
      if (!current[part]) {
        return { ready: false, error: `Unknown feature: ${featurePath}` };
      }
      current = current[part];
    }

    return {
      ready: current.readyForProduction !== false,
      level: current.level,
      description: current.description,
      nextSteps: current.nextSteps || [],
      tested: current.tested,
    };
  }

  /**
   * Get all features needing attention (partial or structural).
   *
   * @returns {Array<Object>} Features needing work
   */
  static getFeaturesNeedingAttention() {
    const summary = this.getSupportSummary();

    return [
      ...summary.categories.partial,
      ...summary.categories.structural,
    ]
      .filter((item) => item.nextSteps.length > 0)
      .sort((a, b) => a.path.localeCompare(b.path));
  }
}
