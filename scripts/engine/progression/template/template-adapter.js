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
import { buildPendingSpeciesContext } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { buildPendingBackgroundContext } from '/systems/foundryvtt-swse/scripts/engine/progression/backgrounds/background-pending-context-builder.js';
import { SkillRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';
import { getClassAutoGrants } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/autogrants/class-autogrants.js';
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
      await this._populateDraftSelections(session, template, actor);

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
  static async _populateDraftSelections(session, template, actor = null) {
    let pendingSpeciesContext = null;
    let pendingBackgroundContext = null;

    // Species (canonical: species object plus the real Species Grant Ledger context)
    if (template.speciesId) {
      pendingSpeciesContext = await this._buildTemplateSpeciesContext(actor, template.speciesId);
      const speciesPayload = {
        id: pendingSpeciesContext?.identity?.id || template.speciesId.id,
        name: pendingSpeciesContext?.identity?.name || template.speciesId.name,
        speciesData: pendingSpeciesContext?.identity?.doc || template.speciesId,
        pendingContext: pendingSpeciesContext,
      };
      session.draftSelections.species = normalizeSpecies(speciesPayload);
      session.draftSelections.pendingSpeciesContext = pendingSpeciesContext;
    }

    // Class (canonical: classId object with pack, id, name)
    if (template.classId) {
      session.draftSelections.class = normalizeClass({
        classId: template.classId.id,
        className: template.classId.name,
      });
    }

    // Background (canonical: background object plus Background Grant Ledger context)
    if (template.backgroundId) {
      pendingBackgroundContext = await this._buildTemplateBackgroundContext(template.backgroundId);
      session.draftSelections.background = normalizeBackground({
        backgroundId: template.backgroundId.id,
        backgroundName: template.backgroundId.name,
        ledger: pendingBackgroundContext?.ledger || null,
        pendingContext: pendingBackgroundContext,
      });
      session.draftSelections.pendingBackgroundContext = pendingBackgroundContext;
      session.draftSelections.backgroundLedger = pendingBackgroundContext?.ledger || null;
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

    // Feats (canonical: feats array of objects with pack, id, name, type).
    // Archetype/template feats are reconciled against class auto-grants and
    // species conditional grants before locking traversal. This keeps class and
    // species rules authoritative while only leaving player-choice debt visible.
    const rawTemplateFeats = Array.isArray(template.feats) ? template.feats : [];
    const featReconciliation = this._reconcileTemplateFeats(rawTemplateFeats, template, {
      actor,
      pendingSpeciesContext,
      skills: session.draftSelections.skills,
      attributes: session.draftSelections.attributes,
      classSelection: session.draftSelections.class,
    });
    session.templateReconciliation = {
      ...(session.templateReconciliation || {}),
      feats: featReconciliation,
      speciesGrantedFeatReplacements: featReconciliation.speciesGrantedFeatReplacements,
      classAutoGrantFeatRemovals: featReconciliation.classAutoGrantFeatRemovals,
      unresolvedFeatSlots: featReconciliation.unresolvedFeatSlots,
      requiresGeneralFeatReplacement: featReconciliation.requiresGeneralFeatReplacement,
    };
    session.draftSelections.feats = normalizeFeats(featReconciliation.reconciledFeats) || [];

    // Talents (canonical: talents array of objects with pack, id, name, type)
    if (Array.isArray(template.talents) && template.talents.length > 0) {
      session.draftSelections.talents = normalizeTalents(template.talents);
    }

    // Languages in templates are historical full-known-language snapshots.
    // The progression Languages step stores only player-selectable bonus picks;
    // automatic species/background languages are re-materialized from ledgers.
    // Preserve only template language entries that are not automatic grants.
    const bonusLanguages = this._filterTemplateBonusLanguages(template.languages, {
      pendingSpeciesContext,
      pendingBackgroundContext,
    });
    session.draftSelections.languages = normalizeLanguages(bonusLanguages) || [];

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

    // Survey answers are preserved only as metadata/advisory signals. Archetype
    // sessions should not display the normal L1 survey because the selected
    // template itself is the L1 intent answer.
    if (template.mentor || template.archetype) {
      session.draftSelections.survey = normalizeSurvey({
        mentorChoice: template.mentor || null,
        archetypeChoice: template.archetype || null,
        roleChoice: template.role || null,
        completed: true,
        source: 'template',
      });
    }

    swseLogger.debug('[TemplateAdapter] Draft selections populated', {
      selections: Object.keys(session.draftSelections).filter(
        (k) => session.draftSelections[k] !== null
      ),
      templateReconciliation: session.templateReconciliation || null,
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

    const feats = Array.isArray(session.draftSelections?.feats) ? session.draftSelections.feats : [];
    const talents = Array.isArray(session.draftSelections?.talents) ? session.draftSelections.talents : [];
    const forcePowers = Array.isArray(session.draftSelections?.forcePowers) ? session.draftSelections.forcePowers : [];
    const unresolvedFeatSlots = Number(session.templateReconciliation?.unresolvedFeatSlots || 0);

    // The selected Galactic Profile/archetype is the L1 survey answer. Never
    // show the normal survey track for template sessions.
    session.lockedNodes.add('l1-survey');

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

    // Lock the actual node ids used by the progression spine. The old synthetic
    // 'feats'/'talents' locks are kept for backward-compatible UI hints only.
    if (feats.length > 0) {
      session.lockedNodes.add('feats');
      session.lockedNodes.add('class-feat');
      if (unresolvedFeatSlots <= 0) {
        session.lockedNodes.add('general-feat');
      }
    }

    if (talents.length > 0) {
      session.lockedNodes.add('talents');
      session.lockedNodes.add('general-talent');
      session.lockedNodes.add('class-talent');
    }

    // Do not lock Languages merely because the template carried Basic/native
    // languages. Those are automatic grants. If a real bonus language debt exists,
    // the normal Languages step should still appear.

    if (forcePowers.length > 0) {
      session.lockedNodes.add('force-powers');
    }

    swseLogger.debug('[TemplateAdapter] Template nodes marked locked', {
      lockedCount: session.lockedNodes.size,
      lockedNodes: Array.from(session.lockedNodes),
      unresolvedFeatSlots,
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

  static async _buildTemplateSpeciesContext(actor, speciesRef) {
    if (!speciesRef) return null;
    try {
      if (!SpeciesRegistry.isInitialized?.()) {
        await SpeciesRegistry.initialize();
      }
      const identity = SpeciesRegistry.getById?.(speciesRef.id)
        || SpeciesRegistry.getByName?.(speciesRef.name)
        || speciesRef;
      return await buildPendingSpeciesContext(actor, identity, { source: 'template' });
    } catch (err) {
      swseLogger.warn('[TemplateAdapter] Failed to build template species context; falling back to raw species selection', {
        species: speciesRef?.name || speciesRef?.id,
        error: err?.message || String(err),
      });
      return null;
    }
  }

  static async _buildTemplateBackgroundContext(backgroundRef) {
    if (!backgroundRef) return null;
    try {
      return await buildPendingBackgroundContext(backgroundRef.id || backgroundRef.name || backgroundRef, {
        multiMode: false,
        source: 'template',
      });
    } catch (err) {
      swseLogger.warn('[TemplateAdapter] Failed to build template background context; falling back to raw background selection', {
        background: backgroundRef?.name || backgroundRef?.id,
        error: err?.message || String(err),
      });
      return null;
    }
  }

  static _reconcileTemplateFeats(rawTemplateFeats = [], template = {}, context = {}) {
    const classAutoGrantNames = this._getUnconditionalClassAutoGrantNames(template.classId?.name || context.classSelection?.name);
    const speciesGrantNames = this._getSatisfiedSpeciesBonusFeatGrantNames(context.pendingSpeciesContext, {
      skills: context.skills,
      attributes: context.attributes,
      actor: context.actor,
    });
    const classAutoGrantKeys = new Set(classAutoGrantNames.map(name => this._normalizeChoiceKey(name)));
    const speciesGrantKeys = new Set(speciesGrantNames.map(name => this._normalizeChoiceKey(name)));
    const seenTemplateChoiceKeys = new Set();

    const reconciledFeats = [];
    const classAutoGrantFeatRemovals = [];
    const speciesGrantedFeatReplacements = [];

    for (const feat of rawTemplateFeats || []) {
      const featName = this._readChoiceName(feat);
      const featKey = this._normalizeChoiceKey(featName || this._readChoiceId(feat));
      if (!featKey) continue;

      if (classAutoGrantKeys.has(featKey)) {
        classAutoGrantFeatRemovals.push({
          featName,
          reason: 'Provided by class auto-grants',
          className: template.classId?.name || context.classSelection?.name || null,
        });
        continue;
      }

      if (speciesGrantKeys.has(featKey)) {
        speciesGrantedFeatReplacements.push({
          featName,
          reason: 'Provided by satisfied species bonus-feat rule',
          species: context.pendingSpeciesContext?.identity?.name || template.speciesId?.name || null,
        });
        continue;
      }

      if (seenTemplateChoiceKeys.has(featKey)) continue;
      seenTemplateChoiceKeys.add(featKey);
      reconciledFeats.push(feat);
    }

    const featsRequired = Math.max(0, Number(context.pendingSpeciesContext?.entitlements?.featsRequired ?? 1) || 0);
    const chosenFeatCount = reconciledFeats.length;
    const unresolvedFeatSlots = Math.max(0, featsRequired - chosenFeatCount);

    return {
      originalFeatCount: rawTemplateFeats.length,
      reconciledFeats,
      chosenFeatCount,
      featsRequired,
      unresolvedFeatSlots,
      requiresGeneralFeatReplacement: unresolvedFeatSlots > 0,
      classAutoGrantFeatRemovals,
      speciesGrantedFeatReplacements,
      classAutoGrantNames,
      speciesGrantNames,
    };
  }

  static _getUnconditionalClassAutoGrantNames(className) {
    if (!className) return [];
    return (getClassAutoGrants(className) || [])
      .filter((name) => !String(name || '').trim().endsWith('*'))
      .map((name) => String(name || '').trim())
      .filter(Boolean);
  }

  static _getSatisfiedSpeciesBonusFeatGrantNames(pendingSpeciesContext, context = {}) {
    if (!pendingSpeciesContext) return [];
    const out = [];
    const traits = Array.isArray(pendingSpeciesContext.traits) ? pendingSpeciesContext.traits : [];
    for (const trait of traits) {
      if (trait?.classification !== 'grant' || trait?.source !== 'bonusFeat') continue;
      for (const grant of trait.grants || []) {
        if (grant?.grantType !== 'feat' || !grant?.target) continue;
        const requirementResult = this._evaluateTemplateGrantRequirements(grant.requirements || [], context);
        const hasStructuredRequirements = Array.isArray(grant.requirements) && grant.requirements.length > 0;
        const hasFreeformOnly = grant.condition && !hasStructuredRequirements;
        if (hasFreeformOnly) continue;
        if (!requirementResult.met) continue;
        out.push(grant.target);
      }
    }
    return Array.from(new Set(out));
  }

  static _evaluateTemplateGrantRequirements(requirements = [], context = {}) {
    if (!requirements || requirements.length === 0) return { met: true };
    for (const req of requirements) {
      const type = String(req?.type || '').trim();
      if (type === 'skillTrained') {
        if (!this._templateHasTrainedSkill(context.skills, req.skill)) return { met: false };
      } else if (type === 'attributeMin') {
        const key = this._normalizeAbilityKey(req.ability || req.attribute || req.key);
        const min = Number(req.value ?? req.minimum ?? req.min);
        if (!key || !Number.isFinite(min)) return { met: false };
        const score = this._readTemplateAbilityScore(context.attributes, key);
        if (!Number.isFinite(score) || score < min) return { met: false };
      } else if (type === 'baseAttackMin') {
        // BAB is not trustworthy until class/species/template reconciliation has
        // fully applied, so leave those grants unresolved for runtime review.
        return { met: false };
      } else {
        return { met: false };
      }
    }
    return { met: true };
  }

  static _templateHasTrainedSkill(skillsSelection, requiredSkill) {
    const requiredKey = this._normalizeSkillKey(requiredSkill);
    if (!requiredKey) return false;
    const entries = this._extractTemplateSkillEntries(skillsSelection);
    return entries.some((entry) => {
      const candidates = [entry?.key, entry?.id, entry?._id, entry?.name, entry?.label, entry?.skill]
        .map(value => this._normalizeSkillKey(value))
        .filter(Boolean);
      return candidates.includes(requiredKey);
    });
  }

  static _extractTemplateSkillEntries(skillsSelection) {
    if (!skillsSelection) return [];
    if (Array.isArray(skillsSelection)) return skillsSelection;
    if (Array.isArray(skillsSelection.trained)) return skillsSelection.trained;
    if (Array.isArray(skillsSelection.skills)) return skillsSelection.skills;
    return [];
  }

  static _normalizeSkillKey(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const lower = raw.toLowerCase();
    const knownSkillIds = {
      '2b9e43f710664b31': 'usetheforce',
      '43c5941072ec78af': 'perception',
      'c9bf381579013b18': 'gatherinformation',
      '426945d1fc765a5d': 'endurance',
      '35df8faa4878f2c5': 'survival',
      '745a5686d6f21e8c': 'mechanics',
      '6d2ac22d9fcf402f': 'stealth',
      '8f5e21f92d6d976b': 'usecomputer',
      'f77c3576d22552fe': 'treatinjury',
      'cb5493f65f0bdb62': 'initiative',
      'knowledgelifesciences': 'knowledgelifesciences',
      'knowledgephysicalsciences': 'knowledgephysicalsciences',
      'knowledgetechnology': 'knowledgetechnology',
      'knowledgegalacticlore': 'knowledgegalacticlore',
    };
    if (knownSkillIds[lower]) return knownSkillIds[lower];

    try {
      const fromRegistry = SkillRegistry.getById?.(raw) || SkillRegistry.get?.(raw) || SkillRegistry.byKey?.(raw);
      if (fromRegistry?.key || fromRegistry?.name) {
        return this._normalizeSkillKey(fromRegistry.key || fromRegistry.name);
      }
    } catch (_err) {
      // SkillRegistry may not be available in some test harnesses; fall through.
    }

    return lower.replace(/[^a-z0-9]+/g, '');
  }

  static _normalizeAbilityKey(value) {
    const key = String(value || '').toLowerCase();
    const map = {
      strength: 'str', str: 'str',
      dexterity: 'dex', dex: 'dex',
      constitution: 'con', con: 'con',
      intelligence: 'int', int: 'int',
      wisdom: 'wis', wis: 'wis',
      charisma: 'cha', cha: 'cha',
    };
    return map[key] || '';
  }

  static _readTemplateAbilityScore(attributesSelection, abilityKey) {
    if (!attributesSelection || !abilityKey) return NaN;
    const values = attributesSelection.values && typeof attributesSelection.values === 'object'
      ? attributesSelection.values
      : attributesSelection;
    const raw = values?.[abilityKey]?.score
      ?? values?.[abilityKey]?.base
      ?? values?.[abilityKey]?.value
      ?? values?.[abilityKey];
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  static _filterTemplateBonusLanguages(templateLanguages = [], context = {}) {
    if (!Array.isArray(templateLanguages) || templateLanguages.length === 0) return [];
    const automatic = new Set();
    const addLanguage = (value) => {
      const key = this._normalizeChoiceKey(value?.name || value?.label || value?.id || value);
      if (key) automatic.add(key);
    };

    const speciesLanguages = context.pendingSpeciesContext?.entitlements?.languages
      || context.pendingSpeciesContext?.identity?.doc?.languages
      || context.pendingSpeciesContext?.identity?.baseDoc?.languages
      || context.pendingSpeciesContext?.identity?.doc?.canonicalStats?.languages
      || [];
    speciesLanguages.forEach(addLanguage);

    const bgFixed = context.pendingBackgroundContext?.languages?.fixed || [];
    const bgEntitlements = context.pendingBackgroundContext?.languages?.entitlements || [];
    bgFixed.forEach(addLanguage);
    bgEntitlements.forEach(addLanguage);
    addLanguage('Basic');

    return templateLanguages.filter((lang) => {
      const key = this._normalizeChoiceKey(lang?.name || lang?.label || lang?.id || lang);
      return key && !automatic.has(key);
    });
  }

  static _readChoiceName(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    return entry.displayName || entry.name || entry.label || entry.title || entry.id || '';
  }

  static _readChoiceId(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    return entry.id || entry._id || entry.slug || entry.uuid || '';
  }

  static _normalizeChoiceKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
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
