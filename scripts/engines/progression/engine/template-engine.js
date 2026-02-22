import { PROGRESSION_RULES } from '../../data/progression-data.js';
import { SWSEProgressionEngine } from '../../engine/progression.js';
import { swseLogger } from '../../utils/logger.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

/**
 * TemplateEngine.applyTemplate(actor, templateId, options)
 *
 * Refactored to use SWSEProgressionEngine as the single source of truth.
 * All character creation flows through the progression engine for consistency.
 *
 * Behavior:
 *  - Creates an SWSEProgressionEngine in 'chargen' mode
 *  - Applies template choices through engine.doAction() calls
 *  - Finalizes through engine.finalize() to ensure hooks fire properly
 *  - Records applied template packages under flags.swse.appliedTemplatePackages for audit
 */
export class TemplateEngine {
  /**
   * Apply a character template to an actor using the progression engine
   * @param {Actor} actor - The actor to apply the template to
   * @param {string} templateId - The template identifier
   * @param {Object} options - Optional overrides (e.g., background)
   */
  static async applyTemplate(actor, templateId, options = {}) {
    const templates = PROGRESSION_RULES.templates || {};
    const tpl = templates[templateId];
    if (!tpl) {throw new Error(`Unknown template: ${templateId}`);}

    swseLogger.log(`TemplateEngine: Applying template "${templateId}" to ${actor.name}`);

    // Create progression engine in chargen mode
    const engine = new SWSEProgressionEngine(actor, 'chargen');

    try {
      // Step 1: Apply species if specified
      if (tpl.species) {
        await engine.doAction('confirmSpecies', {
          speciesId: tpl.species,
          abilityChoice: tpl.speciesAbilityChoice || null // For Human +2 choice
        });
        swseLogger.log(`TemplateEngine: Applied species "${tpl.species}"`);
      }

      // Step 2: Apply background if specified (or use options override)
      const backgroundId = options.background || tpl.background;
      if (backgroundId) {
        await engine.doAction('confirmBackground', {
          backgroundId: backgroundId
        });
        swseLogger.log(`TemplateEngine: Applied background "${backgroundId}"`);
      }

      // Step 3: Apply abilities if specified
      if (tpl.abilities && Object.keys(tpl.abilities).length > 0) {
        // Convert flat ability values to the expected format
        const abilityValues = {};
        for (const [ability, value] of Object.entries(tpl.abilities)) {
          abilityValues[ability] = { value: value };
        }
        await engine.doAction('confirmAbilities', {
          method: 'preset',
          values: abilityValues
        });
        swseLogger.log(`TemplateEngine: Applied preset abilities`);
      }

      // Step 4: Apply class(es)
      // Handle single class from template
      if (tpl.class) {
        await engine.doAction('confirmClass', {
          classId: tpl.class,
          skipPrerequisites: true // Templates are pre-validated
        });
        swseLogger.log(`TemplateEngine: Applied class "${tpl.class}"`);
      }

      // Handle explicit classLevels array (for multi-level templates)
      if (Array.isArray(tpl.classLevels) && tpl.classLevels.length > 0) {
        for (const classLevel of tpl.classLevels) {
          // Apply each class level
          const levelsToApply = classLevel.level || 1;
          for (let i = 0; i < levelsToApply; i++) {
            await engine.doAction('confirmClass', {
              classId: classLevel.class,
              skipPrerequisites: true
            });
          }
          swseLogger.log(`TemplateEngine: Applied ${levelsToApply} level(s) of "${classLevel.class}"`);
        }
      }

      // Step 5: Apply skills if specified
      if (Array.isArray(tpl.skills) && tpl.skills.length > 0) {
        await engine.doAction('confirmSkills', {
          skills: tpl.skills
        });
        swseLogger.log(`TemplateEngine: Applied skills [${tpl.skills.join(', ')}]`);
      }

      // Step 6: Apply feats if specified
      const allFeats = [
        ...(tpl.feats || []),
        ...(tpl.providedFeats || [])
      ];
      if (allFeats.length > 0) {
        await engine.doAction('confirmFeats', {
          featIds: allFeats
        });
        swseLogger.log(`TemplateEngine: Applied feats [${allFeats.join(', ')}]`);
      }

      // Step 7: Apply talents if specified
      const allTalents = [
        ...(tpl.talents || []),
        ...(tpl.providedTalents || [])
      ];
      if (allTalents.length > 0) {
        await engine.doAction('confirmTalents', {
          talentIds: allTalents
        });
        swseLogger.log(`TemplateEngine: Applied talents [${allTalents.join(', ')}]`);
      }

      // Step 8: Finalize through the progression engine
      // This handles:
      // - Creating all items (class, feats, talents)
      // - Calculating HP, BAB, defenses
      // - Triggering force power grants
      // - Emitting completion hooks (language module, etc.)
      const success = await engine.finalize();

      if (!success) {
        throw new Error('Template application failed during finalization');
      }

      // Record template application for audit
      const pkgs = actor.getFlag('foundryvtt-swse', 'appliedTemplatePackages') || [];
      pkgs.push({
        templateId,
        templateName: tpl.name || templateId,
        appliedAt: new Date().toISOString()
      });
      await actor.setFlag('foundryvtt-swse', 'appliedTemplatePackages', pkgs);

      // Apply any explicit item grants that aren't handled by progression
      if (Array.isArray(tpl.items) && tpl.items.length > 0) {
        await this._applyExplicitItems(actor, tpl.items);
      }

      swseLogger.log(`TemplateEngine: Successfully applied template "${templateId}" to ${actor.name}`);

      // Hook for additional system-specific behavior (optional)
      try {
        Hooks.callAll('swse.templateApplied', actor, templateId, tpl, options);
      } catch (e) {
        swseLogger.warn('TemplateEngine: hook swse.templateApplied threw:', e);
      }

    } catch (err) {
      swseLogger.error(`TemplateEngine: Failed to apply template "${templateId}":`, err);
      throw err;
    }
  }

  /**
   * Apply explicit item grants from template (equipment, etc.)
   * @private
   */
  static async _applyExplicitItems(actor, items) {
    if (!items || items.length === 0) {return;}

    const itemsToCreate = [];

    for (const item of items) {
      if (typeof item === 'string') {
        // Item name - try to find in compendiums
        const itemDoc = await this._findItemInCompendiums(item);
        if (itemDoc) {
          itemsToCreate.push(itemDoc.toObject());
        } else {
          swseLogger.warn(`TemplateEngine: Could not find item "${item}" in compendiums`);
        }
      } else if (typeof item === 'object' && item.name) {
        // Item data object - create directly
        itemsToCreate.push(item);
      }
    }

    if (itemsToCreate.length > 0) {
      // PHASE 3: Route through ActorEngine
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
      swseLogger.log(`TemplateEngine: Created ${itemsToCreate.length} explicit item(s)`);
    }
  }

  /**
   * Search compendiums for an item by name
   * @private
   */
  static async _findItemInCompendiums(itemName) {
    // Search common compendiums for items
    const compendiumNames = [
      'foundryvtt-swse.equipment',
      'foundryvtt-swse.weapons',
      'foundryvtt-swse.armor',
      'foundryvtt-swse.items'
    ];

    for (const packName of compendiumNames) {
      const pack = game.packs.get(packName);
      if (!pack) {continue;}

      try {
        if (!pack.indexed) {
          await pack.getIndex();
        }
        const entry = pack.index.find(e => e.name === itemName);
        if (entry) {
          return await pack.getDocument(entry._id);
        }
      } catch (e) {
        swseLogger.warn(`TemplateEngine: Error searching compendium "${packName}":`, e);
      }
    }

    return null;
  }
}
