/**
 * Template Adapter — Phase 5 Work Package B
 *
 * Converts existing template data into canonical progression session state.
 * Bridges template package format into Phase 1-3 progression infrastructure.
 *
 * Entry point:
 *   const session = await TemplateAdapter.initializeSessionFromTemplate(template, actor);
 *
 * Flow:
 *   Template → Adapter → progressionSession with populated draftSelections
 *            → normalized to Phase 1 format
 *            → ready for projection pipeline
 *
 * Not mutations; not actor mutation:
 *   - Template data goes into progressionSession, NOT into actor
 *   - Will be mutated via MutationPlan when player confirms
 *   - Projection shows what the character would look like
 *   - Advisory integrates template package metadata as build signals
 *
 * Template data formats supported:
 *   - ID-based references (compendium IDs, UUIDs)
 *   - Name-based fallbacks
 *   - Ability values (preset scores)
 *   - Skill lists
 *   - Feat/talent/power IDs
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
// TODO: ARCHITECTURE SEAM - engine/apps layering.
// This engine file currently imports from the apps/progression UI layer:
//  - ProgressionSession (session class)
//  - step-normalizers (data transformation utilities)
// Deferred intentionally: Extracting data transformation into engine layer requires careful refactoring.
// Do not expand this dependency; move pure logic into scripts/engine/progression in a later pass.
import { ProgressionSession } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-session.js';
import {
  normalizeSpecies,
  normalizeClass,
  normalizeBackground,
  normalizeAttributes,
  normalizeSkills,
  normalizeFeats,
  normalizeTalents,
  normalizeLanguages,
  normalizeSurvey,
} from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/step-normalizers.js';

export class TemplateAdapter {
  /**
   * Initialize a progression session from a template.
   *
   * @param {Object} template - Template data (from character-templates.json)
   * @param {Actor} actor - Actor being created/progressed
   * @param {Object} options - Override/configuration options
   * @param {string} options.mode - Session mode ('chargen', 'levelup', 'template'); default 'chargen'
   * @param {string} options.subtype - Actor subtype ('actor', 'droid', 'npc'); default 'actor'
   * @returns {Promise<ProgressionSession>} Session with template data populated
   */
  static async initializeSessionFromTemplate(template, actor, options = {}) {
    if (!template) {
      throw new Error('[TemplateAdapter] No template provided');
    }
    if (!actor) {
      throw new Error('[TemplateAdapter] No actor provided');
    }

    // Phase 2.6: Detect nonheroic templates and route to nonheroic subtype
    let { mode = 'chargen', subtype = actor.type === 'droid' ? 'droid' : 'actor' } = options;

    if (template.isNonheroic === true) {
      subtype = 'nonheroic';
    }

    try {
      // Step 1: Create blank session
      const session = new ProgressionSession({
        actor,
        mode,
        subtype,
      });

      swseLogger.debug('[TemplateAdapter] Creating session from template', {
        templateId: template.id,
        templateName: template.name,
        mode,
        subtype,
      });

      // Step 2: Populate draftSelections from template
      await this._populateDraftSelections(session, template);

      // Phase 2.6: Enforce nonheroic constraints if template is nonheroic
      if (template.isNonheroic === true) {
        await this._enforceNonheroicConstraints(session, template);
      }

      // Step 3: Mark template-provided nodes as locked/auto-resolved
      this._markTemplateProvidedNodesLocked(session, template);

      // Step 4: Extract build signals from template
      this._extractTemplateSignals(session, template);

      // Step 5: Validate template data through prerequisite authority
      // (Will be done in Phase 5 Step 4: TemplateValidator)
      // For now, just mark the session as template-sourced
      session.isTemplateSession = true;
      session.templateId = template.id;
      session.templateName = template.name;

      swseLogger.log('[TemplateAdapter] Session initialized from template', {
        templateId: template.id,
        selectionsLoaded: Object.keys(session.draftSelections).filter(
          (k) => session.draftSelections[k] !== null
        ),
      });

      return session;
    } catch (err) {
      swseLogger.error('[TemplateAdapter] Error initializing from template:', err);
      throw err;
    }
  }

  /**
   * Populate draftSelections from template data.
   * Converts template format to canonical Phase 1 schema.
   *
   * @private
   */
  static async _populateDraftSelections(session, template) {
    // Species (canonical: speciesId object with pack, id, name)
    if (template.speciesId) {
      session.draftSelections.species = normalizeSpecies({
        id: template.speciesId.id,
        name: template.speciesId.name,
      });
    }

    // Class (canonical: classId object with pack, id, name)
    if (template.classId) {
      session.draftSelections.class = normalizeClass({
        classId: template.classId.id,
        className: template.classId.name,
      });
    }

    // Background (canonical: backgroundId object or null)
    if (template.backgroundId) {
      session.draftSelections.background = normalizeBackground({
        backgroundId: template.backgroundId.id,
        backgroundName: template.backgroundId.name,
      });
    }

    // Ability Scores (abilityScores, abilities, abilityValues)
    if (template.abilityScores || template.abilities) {
      const scoreMap = template.abilityScores || template.abilities;
      session.draftSelections.attributes = normalizeAttributes({
        str: scoreMap.str,
        dex: scoreMap.dex,
        con: scoreMap.con,
        int: scoreMap.int,
        wis: scoreMap.wis,
        cha: scoreMap.cha,
      });
    }

    // Skills (trainedSkills, skills, skillIds)
    if (template.trainedSkills || template.skills || template.skillIds) {
      const skillList = template.trainedSkills || template.skills || template.skillIds || [];
      session.draftSelections.skills = normalizeSkills(skillList);
    }

    // Feats (canonical: feats array of objects with pack, id, name, type)
    if (Array.isArray(template.feats) && template.feats.length > 0) {
      session.draftSelections.feats = normalizeFeats(template.feats);
    }

    // Talents (canonical: talents array of objects with pack, id, name, type)
    if (Array.isArray(template.talents) && template.talents.length > 0) {
      session.draftSelections.talents = normalizeTalents(template.talents);
    }

    // Languages (canonical: array of language names or IDs)
    if (Array.isArray(template.languages) && template.languages.length > 0) {
      session.draftSelections.languages = normalizeLanguages(template.languages);
    }

    // Force Powers (canonical: array of objects with pack, id, name, type)
    if (Array.isArray(template.forcePowers) && template.forcePowers.length > 0) {
      session.draftSelections.forcePowers = template.forcePowers.map((p) =>
        typeof p === 'string' ? { id: p, name: p } :
        { id: p.id, name: p.name }
      );
    }

    // Droid (for droid templates)
    if (template.droid || template.droidId) {
      session.draftSelections.droid = {
        id: template.droidId || template.droid,
        name: template.droidName || template.droid,
      };
    }

    // Survey answers (if template specifies preferred archetype, role, mentor, etc.)
    if (template.mentor || template.archetype) {
      session.draftSelections.survey = normalizeSurvey({
        mentorChoice: template.mentor || null,
        archetypeChoice: template.archetype || null,
        roleChoice: template.role || null,
      });
    }

    swseLogger.debug('[TemplateAdapter] Draft selections populated', {
      selections: Object.keys(session.draftSelections).filter(
        (k) => session.draftSelections[k] !== null
      ),
    });
  }

  /**
   * Mark nodes as locked/auto-resolved based on template.
   * Template-provided selections cannot be overridden by player during traversal.
   *
   * @private
   */
  static _markTemplateProvidedNodesLocked(session, template) {
    // Initialize locked nodes set if needed
    if (!session.lockedNodes) {
      session.lockedNodes = new Set();
    }

    // Mark template-provided nodes as locked (canonical schema uses single-source fields)
    // Player can see them, but they cannot be changed

    if (template.speciesId) {
      session.lockedNodes.add('species');
    }

    if (template.classId) {
      session.lockedNodes.add('class');
    }

    if (template.backgroundId) {
      session.lockedNodes.add('background');
    }

    if (template.abilityScores && Object.keys(template.abilityScores).length > 0) {
      session.lockedNodes.add('attribute');
    }

    if (Array.isArray(template.trainedSkills) && template.trainedSkills.length > 0) {
      session.lockedNodes.add('skills');
    }

    if (Array.isArray(template.feats) && template.feats.length > 0) {
      session.lockedNodes.add('feats');
    }

    if (Array.isArray(template.talents) && template.talents.length > 0) {
      session.lockedNodes.add('talents');
    }

    if (Array.isArray(template.languages) && template.languages.length > 0) {
      session.lockedNodes.add('languages');
    }

    if (Array.isArray(template.forcePowers) && template.forcePowers.length > 0) {
      session.lockedNodes.add('force-powers');
    }

    swseLogger.debug('[TemplateAdapter] Template nodes marked locked', {
      lockedCount: session.lockedNodes.size,
      lockedNodes: Array.from(session.lockedNodes),
    });
  }

  /**
   * Extract build signals from template metadata.
   * Populates advisory context with template-declared preferences.
   *
   * @private
   */
  static _extractTemplateSignals(session, template) {
    // Initialize template signals if needed
    if (!session.templateSignals) {
      session.templateSignals = {
        explicit: {
          archetypeTags: [],
          roleTags: [],
          targetTags: [],
          mentorTags: [],
        },
        inferred: {
          archetypeTags: [],
          roleTags: [],
          combatStyleTags: [],
        },
      };
    }

    // Archetype from template (explicit intent)
    if (template.archetype) {
      session.templateSignals.explicit.archetypeTags.push(template.archetype);
    }

    // Role from template (if specified)
    if (template.role) {
      session.templateSignals.explicit.roleTags.push(template.role);
    }

    // Mentor from template (explicit choice)
    if (template.mentor) {
      session.templateSignals.explicit.mentorTags.push(template.mentor);
      // Store in advisory context for mentor renderer
      session.advisoryContext.mentorId = template.mentor;
    }

    // Prestige target (if template is geared toward specific prestige class)
    if (template.prestigeTarget) {
      session.templateSignals.explicit.targetTags.push(template.prestigeTarget);
    }

    // Inferred archetype from class (canonical: classId object)
    if (template.classId?.name) {
      const className = template.classId.name;
      const inferredArchetype = this._inferArchetypeFromClassName(className);
      if (inferredArchetype) {
        session.templateSignals.inferred.archetypeTags.push(inferredArchetype);
      }
    }

    swseLogger.debug('[TemplateAdapter] Build signals extracted', {
      explicitSignals: session.templateSignals.explicit,
      inferredSignals: session.templateSignals.inferred,
    });
  }

  /**
   * Infer archetype from class name.
   * Used to populate build signals for advisory system.
   *
   * @private
   */
  static _inferArchetypeFromClassName(className) {
    // Simple mapping; can be enhanced with ArchetypeRegistry in Phase 5 Step 5
    const map = {
      Soldier: 'Warrior',
      Scout: 'Rogue',
      Scoundrel: 'Rogue',
      Jedi: 'Force User',
      'Force Adept': 'Force User',
      Smuggler: 'Rogue',
      Diplomat: 'Diplomat',
      Gunslinger: 'Gunslinger',
    };

    return map[className] || null;
  }

  /**
   * Enforce nonheroic constraints when seeding from a nonheroic template.
   * Phase 2.6: Even template-seeded nonheroic characters must obey nonheroic rules.
   *
   * @private
   */
  static async _enforceNonheroicConstraints(session, template) {
    swseLogger.log('[TemplateAdapter] Enforcing nonheroic constraints on template seeding', {
      templateId: template.id,
    });

    // CONSTRAINT 1: Remove talents if present (nonheroic never have talents)
    if (session.draftSelections.talents) {
      delete session.draftSelections.talents;
      swseLogger.log('[TemplateAdapter] Removed talents from nonheroic template (not allowed)');
    }

    // CONSTRAINT 2: Remove force powers if present (nonheroic never have Force)
    if (session.draftSelections.forcePowers) {
      delete session.draftSelections.forcePowers;
      swseLogger.log('[TemplateAdapter] Removed Force powers from nonheroic template (not allowed)');
    }

    // CONSTRAINT 3: Mark that nonheroic rules apply
    // The NonheroicSubtypeAdapter will enforce skill count and feat restrictions later
    if (!session.nonheroicContext) {
      session.nonheroicContext = {
        hasNonheroic: true,
        isTemplateSeeded: true,
        templateId: template.id,
      };
    }

    swseLogger.log('[TemplateAdapter] Nonheroic constraints enforced', {
      constraintsApplied: 'talents removed, force powers removed, nonheroic context set',
    });
  }

  /**
   * Check if a template can be applied to an actor.
   * Validates basic compatibility (type, level).
   *
   * @param {Object} template - Template to check
   * @param {Actor} actor - Target actor
   * @returns {Object} { canApply: boolean, issues: [string] }
   */
  static validateTemplateCompatibility(template, actor) {
    const issues = [];

    // Check actor type compatibility
    if (template.requiresType) {
      if (actor.type !== template.requiresType) {
        issues.push(
          `Template requires actor type "${template.requiresType}", but actor is "${actor.type}"`
        );
      }
    }

    // Check level compatibility
    if (template.minLevel && actor.system?.details?.level < template.minLevel) {
      issues.push(
        `Template requires minimum level ${template.minLevel}, but actor is level ${actor.system?.details?.level}`
      );
    }

    return {
      canApply: issues.length === 0,
      issues,
    };
  }
}
