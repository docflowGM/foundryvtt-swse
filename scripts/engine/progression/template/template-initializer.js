/**
 * Template Initializer — Phase 5 Step 6
 *
 * Orchestrates template selection and progression session initialization.
 * Called at the start of chargen to:
 *   1. Show template selection dialog
 *   2. If template chosen, seed session with template data
 *   3. Return initialized session or null for freeform
 *
 * Entry point:
 *   const session = await TemplateInitializer.initializeForChargen(actor, options);
 *   // session is ProgressionSession with template data populated, or null if freeform
 */

import { TemplateSelectionDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/template-selection-dialog.js';
import { TemplateRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-registry.js';
import { TemplateAdapter } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-adapter.js';
import { TemplateValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-validator.js';
import { ProgressionSession } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-session.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class TemplateInitializer {
  /**
   * Initialize chargen with optional template selection.
   * Blocks until user makes a choice or cancels.
   *
   * @param {Actor} actor - Actor being created
   * @param {Object} options - Initialization options
   * @param {boolean} options.allowSkip - Allow skipping template dialog (default: false)
   * @returns {Promise<ProgressionSession|null>}
   *   - ProgressionSession with template data if user chooses template
   *   - null if user chooses freeform chargen
   *   - null if user cancels or on error
   */
  static async initializeForChargen(actor, options = {}) {
    const { allowSkip = false } = options;

    if (!actor) {
      swseLogger.error('[TemplateInitializer] No actor provided');
      return null;
    }

    try {
      swseLogger.log('[TemplateInitializer] Starting chargen initialization', {
        actorName: actor.name,
        actorType: actor.type,
      });

      // Step 1: Show template selection dialog
      const templateId = await TemplateSelectionDialog.showChoiceDialog(actor);

      // User cancelled (false) or chose freeform (null)
      if (templateId === false) {
        swseLogger.log('[TemplateInitializer] User cancelled chargen');
        return null;
      }

      if (templateId === null) {
        swseLogger.log('[TemplateInitializer] User chose freeform chargen');
        return null;
      }

      // Step 2: Load chosen template
      const template = await TemplateRegistry.getTemplate(templateId);
      if (!template) {
        swseLogger.error('[TemplateInitializer] Template not found', { templateId });
        ui?.notifications?.error?.(
          `Template "${templateId}" not found. Starting freeform chargen instead.`
        );
        return null;
      }

      swseLogger.log('[TemplateInitializer] Template loaded', {
        templateId: template.id,
        templateName: template.name,
      });

      // Step 3: Create and populate session from template
      const session = await TemplateAdapter.initializeSessionFromTemplate(
        template,
        actor,
        { mode: 'chargen' }
      );

      // Step 4: Validate template selections
      const validation = await TemplateValidator.validateTemplateSelections(session, actor);

      if (!validation.valid) {
        swseLogger.warn('[TemplateInitializer] Template validation issues', {
          templateId: template.id,
          conflicts: validation.conflicts.length,
          invalid: validation.invalid.length,
        });

        // Template is still usable, but show warning
        ui?.notifications?.warn?.(
          `Template "${template.name}" has some validation issues. ` +
          `You may need to make adjustments during progression.`
        );
      }

      swseLogger.log('[TemplateInitializer] Template session initialized successfully', {
        templateId: template.id,
        templateName: template.name,
        valid: validation.valid,
      });

      return session;
    } catch (err) {
      swseLogger.error('[TemplateInitializer] Error during initialization:', err);
      ui?.notifications?.error?.(
        'An error occurred during template initialization. Starting freeform chargen instead.'
      );
      return null;
    }
  }

  /**
   * Check if a session is template-seeded.
   * Useful for determining which UI paths to take.
   *
   * @param {ProgressionSession} session - Session to check
   * @returns {boolean} True if session is template-seeded
   */
  static isTemplateSession(session) {
    return session?.isTemplateSession === true;
  }

  /**
   * Get template metadata from a session (if template-seeded).
   *
   * @param {ProgressionSession} session - Session to query
   * @returns {Object|null} Template metadata or null if not a template session
   */
  static getTemplateMetadata(session) {
    if (!this.isTemplateSession(session)) {
      return null;
    }

    return {
      templateId: session.templateId,
      templateName: session.templateName,
      isTemplateSession: true,
    };
  }
}
