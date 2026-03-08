/**
 * ACTIVE Migration Validator
 *
 * Identifies abilities that should be migrated to ACTIVE execution model
 * and validates migration candidates.
 *
 * Usage:
 * - Scan existing abilities for legacy patterns
 * - Suggest ACTIVE migration
 * - Validate migration results
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActiveContractValidator } from "./active-contract.js";
import { ACTIVE_SUBTYPES } from "./active-types.js";

export class ActiveMigrationValidator {

  /**
   * Scan an ability to determine if it's a migration candidate
   * @param {Object} ability - Ability item to scan
   * @returns {Object} Assessment report
   */
  static assessMigrationCandidate(ability) {
    const report = {
      name: ability.name,
      type: ability.type,
      currentModel: ability.system?.executionModel || 'UNKNOWN',
      isMigrationCandidate: false,
      reasons: [],
      suggestedSubtype: null,
      actionItems: []
    };

    // ── Check if already ACTIVE ────────────────────────────────────────────
    if (ability.system?.executionModel === 'ACTIVE') {
      report.reasons.push('Already migrated to ACTIVE model');
      return report;
    }

    // ── Check for legacy action patterns ────────────────────────────────────
    const hasActionType = ability.system?.abilityMeta?.activation?.actionType
      || ability.system?.actionType
      || ability.system?.action;

    const hasCost = ability.system?.abilityMeta?.cost
      || ability.system?.cost?.forcePoints
      || ability.system?.resourceCost;

    const hasEffect = ability.system?.abilityMeta?.effect
      || ability.system?.effect
      || ability.system?.damageRoll;

    const hasFrequency = ability.system?.abilityMeta?.frequency
      || ability.system?.frequency
      || ability.system?.usesPerDay;

    const isToggleable = ability.system?.abilityMeta?.modeEffect
      || ability.system?.isMode
      || ability.system?.toggle;

    // ── Determine if migration candidate ─────────────────────────────────────
    if (hasActionType || hasCost || hasEffect || hasFrequency) {
      report.isMigrationCandidate = true;
      report.reasons.push('Has action-economy or cost metadata');

      if (isToggleable) {
        report.suggestedSubtype = ACTIVE_SUBTYPES.MODE;
        report.reasons.push('Appears to be toggle-able → MODE subtype');
      } else if (hasEffect || hasCost) {
        report.suggestedSubtype = ACTIVE_SUBTYPES.EFFECT;
        report.reasons.push('Has activatable effects/cost → EFFECT subtype');
      }
    }

    // ── Identify action items ───────────────────────────────────────────────
    if (report.isMigrationCandidate) {
      report.actionItems.push(
        `Set executionModel to "ACTIVE"`
      );

      if (report.suggestedSubtype) {
        report.actionItems.push(
          `Set subType to "${report.suggestedSubtype}"`
        );
      }

      if (hasActionType) {
        report.actionItems.push(
          `Normalize activation.actionType (ensure it matches ACTIVE schema)`
        );
      }

      if (hasCost) {
        report.actionItems.push(
          `Normalize cost (should be under abilityMeta.cost)`
        );
      }

      if (hasEffect) {
        report.actionItems.push(
          `Normalize effect (should be under abilityMeta.effect or abilityMeta.modeEffect)`
        );
      }

      if (hasFrequency) {
        report.actionItems.push(
          `Normalize frequency (should be under abilityMeta.frequency)`
        );
      }

      report.actionItems.push(
        `Run validation: ActiveContractValidator.assert(ability)`
      );
    }

    return report;
  }

  /**
   * Scan all items of a given type for migration candidates
   * @param {Array<Object>} items - Array of ability items
   * @returns {Object} Summary of candidates found
   */
  static scanItems(items) {
    const summary = {
      totalScanned: items.length,
      candidates: [],
      bySubtype: {
        [ACTIVE_SUBTYPES.EFFECT]: [],
        [ACTIVE_SUBTYPES.MODE]: []
      },
      summary: ''
    };

    for (const item of items) {
      const assessment = this.assessMigrationCandidate(item);

      if (assessment.isMigrationCandidate) {
        summary.candidates.push(assessment);

        if (assessment.suggestedSubtype) {
          summary.bySubtype[assessment.suggestedSubtype].push(assessment.name);
        }
      }
    }

    // Generate summary text
    const totalCandidates = summary.candidates.length;
    const effectCount = summary.bySubtype[ACTIVE_SUBTYPES.EFFECT].length;
    const modeCount = summary.bySubtype[ACTIVE_SUBTYPES.MODE].length;

    if (totalCandidates === 0) {
      summary.summary = `✅ No migration candidates found (all ${items.length} items OK)`;
    } else {
      summary.summary =
        `Found ${totalCandidates} migration candidates:` +
        `\n  - ${effectCount} EFFECT candidates` +
        `\n  - ${modeCount} MODE candidates`;
    }

    return summary;
  }

  /**
   * Validate a migrated ability
   * @param {Object} ability - Ability that should be ACTIVE
   * @returns {Object} Validation result
   */
  static validateMigration(ability) {
    const result = {
      name: ability.name,
      isValid: false,
      errors: [],
      warnings: []
    };

    // ── Check execution model ───────────────────────────────────────────────
    if (ability.system?.executionModel !== 'ACTIVE') {
      result.errors.push('executionModel not set to "ACTIVE"');
    }

    // ── Check subType ───────────────────────────────────────────────────────
    if (!ability.system?.subType) {
      result.errors.push('subType not set (must be EFFECT or MODE)');
    } else if (!Object.values(ACTIVE_SUBTYPES).includes(ability.system.subType)) {
      result.errors.push(
        `subType "${ability.system.subType}" is invalid (must be ${Object.values(ACTIVE_SUBTYPES).join(' or ')})`
      );
    }

    // ── Validate contract ───────────────────────────────────────────────────
    try {
      ActiveContractValidator.assert(ability);
    } catch (err) {
      result.errors.push(`Contract validation failed: ${err.message}`);
    }

    // ── Check for common issues ────────────────────────────────────────────
    const meta = ability.system?.abilityMeta;

    if (ability.system?.subType === ACTIVE_SUBTYPES.EFFECT) {
      if (!meta?.activation) {
        result.errors.push('EFFECT missing activation field');
      }
      if (!meta?.effect) {
        result.errors.push('EFFECT missing effect field');
      }

      // Warn about default frequency
      if (!meta?.frequency) {
        result.warnings.push('No frequency specified (defaults to unlimited)');
      }
    }

    if (ability.system?.subType === ACTIVE_SUBTYPES.MODE) {
      if (!meta?.modeEffect) {
        result.errors.push('MODE missing modeEffect field');
      }

      if (!meta?.activation) {
        result.warnings.push('MODE has no activation cost (usually swift or free)');
      }
    }

    // ── Final validity ──────────────────────────────────────────────────────
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Generate migration guide for an ability
   * @param {Object} ability - Ability to migrate
   * @returns {String} Migration guide text
   */
  static generateMigrationGuide(ability) {
    const assessment = this.assessMigrationCandidate(ability);

    if (!assessment.isMigrationCandidate) {
      return `${ability.name} does not appear to be an ACTIVE candidate.`;
    }

    let guide = `# Migration Guide: ${ability.name}\n\n`;

    guide += `**Current Status:** ${assessment.currentModel}\n`;
    guide += `**Suggested Target:** ${assessment.suggestedSubtype || 'EFFECT (default)'}\n\n`;

    guide += `## Action Items\n\n`;
    assessment.actionItems.forEach((item, idx) => {
      guide += `${idx + 1}. ${item}\n`;
    });

    guide += `\n## Example Schema\n\n`;

    if (assessment.suggestedSubtype === ACTIVE_SUBTYPES.MODE) {
      guide += `\`\`\`javascript\n`;
      guide += `{\n`;
      guide += `  executionModel: "ACTIVE",\n`;
      guide += `  subType: "MODE",\n`;
      guide += `  abilityMeta: {\n`;
      guide += `    activation: { actionType: "swift" },\n`;
      guide += `    modeEffect: {\n`;
      guide += `      modifier: "ac_bonus",\n`;
      guide += `      value: 2\n`;
      guide += `    }\n`;
      guide += `  }\n`;
      guide += `}\n`;
      guide += `\`\`\`\n`;
    } else {
      guide += `\`\`\`javascript\n`;
      guide += `{\n`;
      guide += `  executionModel: "ACTIVE",\n`;
      guide += `  subType: "EFFECT",\n`;
      guide += `  abilityMeta: {\n`;
      guide += `    activation: { actionType: "standard" },\n`;
      guide += `    effect: {\n`;
      guide += `      type: "damageRoll",\n`;
      guide += `      diceFormula: "3d6",\n`;
      guide += `      bonusModifier: "str"\n`;
      guide += `    }\n`;
      guide += `  }\n`;
      guide += `}\n`;
      guide += `\`\`\`\n`;
    }

    guide += `\n## Validation\n\n`;
    guide += `Once migrated, run:\n\n`;
    guide += `\`\`\`javascript\n`;
    guide += `const validator = require('./active-migration-validator');\n`;
    guide += `const result = validator.validateMigration(ability);\n`;
    guide += `if (!result.isValid) console.error(result.errors);\n`;
    guide += `\`\`\`\n`;

    return guide;
  }

  /**
   * Log migration statistics to console
   * @param {Array<Object>} items - Items to scan
   */
  static logMigrationStats(items) {
    const summary = this.scanItems(items);

    console.group('ACTIVE Migration Report');
    console.log(`Total items scanned: ${summary.totalScanned}`);
    console.log(summary.summary);

    if (summary.candidates.length > 0) {
      console.group('EFFECT Candidates');
      summary.bySubtype[ACTIVE_SUBTYPES.EFFECT].forEach(name => {
        console.log(`  • ${name}`);
      });
      console.groupEnd();

      console.group('MODE Candidates');
      summary.bySubtype[ACTIVE_SUBTYPES.MODE].forEach(name => {
        console.log(`  • ${name}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}
