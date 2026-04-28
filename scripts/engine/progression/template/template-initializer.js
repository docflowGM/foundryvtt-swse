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
 *
 * V2 COMPLIANCE: Template selection is session-only/draft-only. No actor mutations occur
 * until confirmation through ProgressionFinalizer → ActorEngine.
 */

import { TemplateSelectionDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/template-selection-dialog.js';
import { TemplateRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-registry.js';
import { TemplateAdapter } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-adapter.js';
import { TemplateValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-validator.js';
import { ProgressionSession } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-session.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { DroidBuilderAdapter } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/droid-builder-adapter.js';

export class TemplateInitializer {
  /**
   * Resolve progression subtype for chargen based on actor and options.
   * Used to determine which templates are eligible for filtering.
   *
   * @param {Actor} actor - Actor being created
   * @param {Object} options - Options that may specify subtype
   * @returns {string} Subtype: 'actor' (heroic), 'droid', 'nonheroic', 'beast', 'follower'
   * @private
   */
  static _resolveChargenSubtype(actor, options = {}) {
    // Explicit subtype override
    if (options.subtype) {
      return options.subtype;
    }

    if (!actor) {
      return 'actor';
    }

    // Check if droid context is active (droid builder should be used)
    if (DroidBuilderAdapter.shouldUseDroidBuilder(actor.system || {})) {
      return 'droid';
    }

    // Check for nonheroic context
    if (actor.flags?.swse?.beastData || actor.system?.isDroid === false) {
      return 'nonheroic';
    }

    return 'actor';
  }

  /**
   * Initialize chargen with optional template selection.
   * Blocks until user makes a choice or cancels.
   * Template selection is the ONLY entry point; no re-selection during progression.
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
      // Resolve chargen subtype for filtering
      const subtype = this._resolveChargenSubtype(actor, options);

      swseLogger.log('[TemplateInitializer] Starting chargen initialization', {
        actorName: actor.name,
        actorType: actor.type,
        subtype,
      });

      // Step 1: Show template selection dialog with subtype awareness
      const templateId = await TemplateSelectionDialog.showChoiceDialog(actor, { subtype });

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

      // V2 COMPLIANCE GUARD: Ensure template data is session-only (not persisted to actor)
      if (session && !session.isTemplateSession) {
        swseLogger.warn('[TemplateInitializer] Template session not marked as template-session');
      }

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
