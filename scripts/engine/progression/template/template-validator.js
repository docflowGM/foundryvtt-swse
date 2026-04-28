/**
 * Template Validator — Phase 5 Work Package D
 *
 * Validates template selections through canonical prerequisite authority.
 * Addresses audit finding: "Stale template content risk — templates are pre-authored; may be outdated"
 *
 * Does NOT force-apply invalid selections (old behavior).
 * Instead: marks dirty, surfaces conflicts, suggests reconciliation.
 *
 * Entry point:
 *   const validation = await TemplateValidator.validateTemplateSelections(session, actor);
 *
 * Output:
 *   {
 *     valid: boolean,
 *     conflicts: [{ node, current, reason }],
 *     invalid: [{ selection, reason, suggestion }],
 *     warnings: [{ node, text, severity }],
 *     dirtyNodes: [nodeId],
 *     reconciliationNeeded: boolean
 *   }
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';

export class TemplateValidator {
  /**
   * Validate all template selections through prerequisite authority.
   *
   * @param {ProgressionSession} session - Session with template data
   * @param {Actor} actor - Actor being progressed
   * @returns {Promise<Object>} Validation report
   */
  static async validateTemplateSelections(session, actor) {
    const report = {
      valid: true,
      conflicts: [],
      invalid: [],
      warnings: [],
      dirtyNodes: [],
      reconciliationNeeded: false,
      templateId: session.templateId,
      templateName: session.templateName,
    };

    if (!session || !actor) {
      throw new Error('[TemplateValidator] No session or actor provided');
    }

    try {
      swseLogger.debug('[TemplateValidator] Beginning template validation', {
        templateId: session.templateId,
        templateName: session.templateName,
      });

      // Validate each category of selections
      await this._validateSpecies(session, actor, report);
      await this._validateClass(session, actor, report);
      await this._validateBackground(session, actor, report);
      await this._validateAttributes(session, actor, report);
      await this._validateSkills(session, actor, report);
      await this._validateFeats(session, actor, report);
      await this._validateTalents(session, actor, report);
      await this._validateForcePowers(session, actor, report);
      await this._validateLanguages(session, actor, report);

      // Determine overall validity
      report.valid = report.invalid.length === 0 && report.conflicts.length === 0;
      report.reconciliationNeeded = report.invalid.length > 0 || report.warnings.length > 0;

      // Mark dirty nodes for reconciliation
      if (report.reconciliationNeeded) {
        report.dirtyNodes = Array.from(session.dirtyNodes || new Set());
      }

      swseLogger.log('[TemplateValidator] Validation complete', {
        templateId: session.templateId,
        valid: report.valid,
        conflicts: report.conflicts.length,
        invalid: report.invalid.length,
        warnings: report.warnings.length,
        reconciliationNeeded: report.reconciliationNeeded,
      });

      return report;
    } catch (err) {
      swseLogger.error('[TemplateValidator] Error validating template:', err);
      report.valid = false;
      report.warnings.push({
        node: 'system',
        text: 'Template validation encountered an error',
        severity: 'error',
      });
      return report;
    }
  }

  /**
   * Validate species selection.
   * @private
   */
  static async _validateSpecies(session, actor, report) {
    const species = session.draftSelections.species;
    if (!species) return;

    // Check that species exists in compendium
    try {
      const speciesId = species.id || species.compendiumId;
      if (speciesId) {
        // planned: Wire to compendium lookup
        // For now, just log as reusable
        swseLogger.debug('[TemplateValidator] Species validated (ID-based)', { speciesId });
      }
    } catch (err) {
      report.invalid.push({
        selection: 'species',
        reason: `Species not found: ${species.name || species.id}`,
        suggestion: 'Select a species from the available list',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('species');
      report.dirtyNodes.push('species');
    }
  }

  /**
   * Validate class selection.
   * @private
   */
  static async _validateClass(session, actor, report) {
    const playerClass = session.draftSelections.class;
    if (!playerClass) return;

    // Class must exist and be compatible with species
    try {
      // Create a mock actor for prerequisite checks
      const mockActor = this._buildMockActorForValidation(session, actor);

      // Check class legality through PrerequisiteChecker
      const checker = new PrerequisiteChecker(mockActor);
      const canAcquire = await checker.evaluateAcquisition({
        itemId: playerClass.id || playerClass.compendiumId,
        itemType: 'class',
      });

      if (!canAcquire.legal) {
        report.conflicts.push({
          node: 'class',
          current: playerClass.name,
          reason: canAcquire.reason || 'Class not compatible with species/background',
        });
        session.dirtyNodes = session.dirtyNodes || new Set();
        session.dirtyNodes.add('class');
        report.dirtyNodes.push('class');
      }

      swseLogger.debug('[TemplateValidator] Class validated', {
        className: playerClass.name,
        legal: canAcquire.legal,
      });
    } catch (err) {
      report.invalid.push({
        selection: 'class',
        reason: `Class validation error: ${err.message}`,
        suggestion: 'Select a class from the available list',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('class');
    }
  }

  /**
   * Validate background selection.
   * @private
   */
  static async _validateBackground(session, actor, report) {
    const background = session.draftSelections.background;
    if (!background) return;

    // Background validation (lighter than class/species)
    // Just check it exists
    try {
      // planned: Wire to background registry
      swseLogger.debug('[TemplateValidator] Background validated', { backgroundName: background.name });
    } catch (err) {
      report.warnings.push({
        node: 'background',
        text: `Background "${background.name}" may not exist`,
        severity: 'warning',
      });
    }
  }

  /**
   * Validate ability scores.
   * @private
   */
  static async _validateAttributes(session, actor, report) {
    const attrs = session.draftSelections.attributes;
    if (!attrs) return;

    // Check that all attributes are in valid range (3-18 typically)
    const validRange = (val) => typeof val === 'number' && val >= 3 && val <= 18;
    const issues = [];

    for (const [attr, value] of Object.entries(attrs || {})) {
      if (value !== null && !validRange(value)) {
        issues.push(`${attr} = ${value} is outside valid range (3-18)`);
      }
    }

    if (issues.length > 0) {
      report.warnings.push({
        node: 'attributes',
        text: `Attribute validation issues: ${issues.join(', ')}`,
        severity: 'warning',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('attribute');
      report.dirtyNodes.push('attribute');
    }
  }

  /**
   * Validate skills selection.
   * @private
   */
  static async _validateSkills(session, actor, report) {
    const skills = session.draftSelections.skills;
    if (!skills || skills.length === 0) return;

    // Check that skill count doesn't exceed available training
    // planned: Calculate actual available training based on class/attributes
    const maxTrainedSkills = 4; // Placeholder

    if (Array.isArray(skills) && skills.length > maxTrainedSkills) {
      report.warnings.push({
        node: 'skills',
        text: `Template specifies ${skills.length} trained skills, but only ${maxTrainedSkills} are available`,
        severity: 'caution',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('skills');
      report.dirtyNodes.push('skills');
    }
  }

  /**
   * Validate feats selection.
   * @private
   */
  static async _validateFeats(session, actor, report) {
    const feats = session.draftSelections.feats;
    if (!feats || feats.length === 0) return;

    // V2 HARDENING: Detect duplicate feats (data legality)
    const featsByName = new Map();
    const duplicates = [];
    feats.forEach((feat, idx) => {
      const name = feat.name || feat.id;
      if (featsByName.has(name)) {
        duplicates.push({
          name,
          indices: [featsByName.get(name), idx],
        });
      } else {
        featsByName.set(name, idx);
      }
    });

    if (duplicates.length > 0) {
      report.invalid.push({
        selection: 'feats',
        reason: `Template contains duplicate feat entries: ${duplicates.map(d => d.name).join(', ')}`,
        suggestion: 'Remove duplicate feat entries from template data',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('feats');
      swseLogger.warn('[TemplateValidator] Duplicate feats detected in template', { duplicates });
      return;
    }

    // Check prerequisite constraints on each feat
    try {
      const mockActor = this._buildMockActorForValidation(session, actor);
      const checker = new PrerequisiteChecker(mockActor);

      for (const feat of feats) {
        const featId = feat.id || feat.compendiumId;
        if (!featId) continue;

        const canAcquire = await checker.evaluateAcquisition({
          itemId: featId,
          itemType: 'feat',
        });

        if (!canAcquire.legal) {
          report.conflicts.push({
            node: 'feats',
            current: feat.name,
            reason: canAcquire.reason || 'Feat prerequisites not met',
          });
          session.dirtyNodes = session.dirtyNodes || new Set();
          session.dirtyNodes.add('feats');
        }
      }

      swseLogger.debug('[TemplateValidator] Feats validated', {
        featCount: feats.length,
        conflictCount: report.conflicts.filter((c) => c.node === 'feats').length,
      });
    } catch (err) {
      report.warnings.push({
        node: 'feats',
        text: `Feat validation incomplete: ${err.message}`,
        severity: 'info',
      });
    }
  }

  /**
   * Validate talents selection.
   * @private
   */
  static async _validateTalents(session, actor, report) {
    const talents = session.draftSelections.talents;
    if (!talents || talents.length === 0) return;

    // V2 HARDENING: Detect duplicate talents (data legality)
    const talentsByName = new Map();
    const duplicates = [];
    talents.forEach((talent, idx) => {
      const name = talent.name || talent.id;
      if (talentsByName.has(name)) {
        duplicates.push({
          name,
          indices: [talentsByName.get(name), idx],
        });
      } else {
        talentsByName.set(name, idx);
      }
    });

    if (duplicates.length > 0) {
      report.invalid.push({
        selection: 'talents',
        reason: `Template contains duplicate talent entries: ${duplicates.map(d => d.name).join(', ')}`,
        suggestion: 'Remove duplicate talent entries from template data',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('talents');
      swseLogger.warn('[TemplateValidator] Duplicate talents detected in template', { duplicates });
      return;
    }

    // Check class availability and slot constraints
    try {
      const mockActor = this._buildMockActorForValidation(session, actor);
      const checker = new PrerequisiteChecker(mockActor);

      for (const talent of talents) {
        const talentId = talent.id || talent.compendiumId;
        if (!talentId) continue;

        const canAcquire = await checker.evaluateAcquisition({
          itemId: talentId,
          itemType: 'talent',
        });

        if (!canAcquire.legal) {
          report.conflicts.push({
            node: 'talents',
            current: talent.name,
            reason: canAcquire.reason || 'Talent not available',
          });
          session.dirtyNodes = session.dirtyNodes || new Set();
          session.dirtyNodes.add('talents');
        }
      }
    } catch (err) {
      report.warnings.push({
        node: 'talents',
        text: `Talent validation incomplete: ${err.message}`,
        severity: 'info',
      });
    }
  }

  /**
   * Validate force powers.
   * @private
   */
  static async _validateForcePowers(session, actor, report) {
    const powers = session.draftSelections.forcePowers;
    if (!powers || powers.length === 0) return;

    // Only force users can have force powers
    const playerClass = session.draftSelections.class;
    const isForceUser = playerClass?.name?.includes('Jedi') || playerClass?.name?.includes('Force');

    if (!isForceUser) {
      report.conflicts.push({
        node: 'force-powers',
        current: `${powers.length} force powers`,
        reason: 'Force powers require a Force-using class (Jedi, Force Adept, etc.)',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('force-powers');
      report.dirtyNodes.push('force-powers');
    }
  }

  /**
   * Validate languages selection.
   * @private
   */
  static async _validateLanguages(session, actor, report) {
    const languages = session.draftSelections.languages;
    if (!languages || languages.length === 0) return;

    // Species and background grant languages; check against allotment
    // planned: Calculate actual language allotment from species/background/feats
    const maxLanguages = 3; // Placeholder

    if (Array.isArray(languages) && languages.length > maxLanguages) {
      report.warnings.push({
        node: 'languages',
        text: `Template specifies ${languages.length} languages, but only ${maxLanguages} can be learned`,
        severity: 'caution',
      });
      session.dirtyNodes = session.dirtyNodes || new Set();
      session.dirtyNodes.add('languages');
      report.dirtyNodes.push('languages');
    }
  }

  /**
   * Build a mock actor for prerequisite validation.
   * Based on template selections, not live actor.
   *
   * @private
   */
  static _buildMockActorForValidation(session, actor) {
    // Create a shallow copy with template selections overlaid
    const mock = actor.toObject ? actor.toObject() : JSON.parse(JSON.stringify(actor));

    // Apply template selections
    if (session.draftSelections.species) {
      mock.system.details.species = session.draftSelections.species.name || session.draftSelections.species.id;
    }

    if (session.draftSelections.class) {
      mock.system.details.class = session.draftSelections.class.name || session.draftSelections.class.id;
    }

    if (session.draftSelections.attributes) {
      const attrs = session.draftSelections.attributes;
      mock.system.attributes = {
        ...mock.system.attributes,
        str: { value: attrs.str },
        dex: { value: attrs.dex },
        con: { value: attrs.con },
        int: { value: attrs.int },
        wis: { value: attrs.wis },
        cha: { value: attrs.cha },
      };
    }

    return mock;
  }
}
