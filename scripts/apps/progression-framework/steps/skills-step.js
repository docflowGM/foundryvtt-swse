/**
 * SkillsStep plugin
 *
 * Handles skill selection and training during character generation.
 * Integrates with existing skill registry and training logic.
 * Includes suggested skill selections from SuggestionService (Phase 10).
 *
 * Data:
 * - trainedSkills: Map<skillKey, {trained: boolean, focus?: boolean, misc?: number}>
 * - trainedCount: number (current count)
 * - allowedCount: number (max allowed for this character)
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { normalizeSkills } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SkillRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';
import { ClassesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { BeastSubtypeAdapter } from '../adapters/beast-subtype-adapter.js';
import { resolveClassModel, resolveSelectedClassFromShell, getClassSkills } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';

export class SkillsStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State
    this._trainedSkills = new Map();      // skillKey → {trained, focus, misc}
    this._allSkills = [];                 // Full skill list from registry
    this._availableSkills = [];           // Filtered list (constrained for Beast/Droid)
    this._trainedCount = 0;
    this._allowedCount = 1;               // Updated on enter from character data
    this._suggestedSkills = [];           // Suggested skills from SuggestionService
    this._isBeast = false;                // Beast constraint flag
    this._isDroid = false;                // Droid constraint flag
    this._beastSkillList = null;          // Beast skill list if applicable
    this._focusedSkillId = null;          // focused skill for details rail

    this._skillDerivation = {
      mode: 'fallback-full-chart',
      fallbackReason: 'uninitialized',
      classSkillRefs: 0,
      classSkillMatches: 0,
      backgroundSkillRefs: 0,
      backgroundSkillMatches: 0,
      trainedSelectionMatches: 0,
      skills: [],
    };

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    const character = shell.actor?.system || {};

    // Phase 2.7: Check if this is Beast progression
    this._isBeast = shell.progressionSession?.beastContext?.isBeast === true;

    // Phase 3.1: Check if this is Droid progression
    this._isDroid = shell.progressionSession?.droidContext?.isDroid === true;

    // Phase 2.5: Check if this is nonheroic progression
    const isNonheroic = shell.progressionSession?.nonheroicContext?.hasNonheroic === true;

    if (isNonheroic) {
      // Nonheroic characters get 1 + INT mod (minimum 1) skill slots
      const intMod = character.abilities?.int?.mod || 0;
      this._allowedCount = Math.max(1, 1 + intMod);
      swseLogger.log('[SkillsStep] Nonheroic progression - allowed skills:', {
        intMod,
        allowedCount: this._allowedCount,
        isBeast: this._isBeast
      });
    } else {
      // Load allowed skills count from canonical class + INT + species bonus when possible
      this._allowedCount = this._resolveAllowedSkillCount(shell, character);
    }

    // Load existing skill selections from canonical progression state first.
    // In chargen we intentionally do NOT seed from actor.system.skills because
    // base actor documents may contain default skill keys that would make every
    // skill appear legal or preselected.
    this._seedExistingSkills(shell, character);

    // Count current trained
    this._trainedCount = Array.from(this._trainedSkills.values())
      .filter(s => s.trained)
      .length;


// Load full skill list from registry
try {
  if (!SkillRegistry.isBuilt && typeof SkillRegistry.build === 'function') {
    await SkillRegistry.build();
  }
  let rawSkills = [];
  if (typeof SkillRegistry.list === 'function') {
    rawSkills = SkillRegistry.list();
  } else {
    const skillRegistry = SkillRegistry.getInstance?.() || SkillRegistry;
    rawSkills = await skillRegistry.getSkills?.() || [];
  }
  this._allSkills = (rawSkills || []).map((skill) => this._normalizeSkillRecord(skill)).filter(Boolean);
} catch (err) {
  swseLogger.warn('[SkillsStep] Failed to load skill registry:', err);
  this._allSkills = [];
}

    // Phase 2.7: Filter to Beast skill list if applicable
    if (this._isBeast) {
      this._beastSkillList = BeastSubtypeAdapter.getBeastClassSkills();
      this._availableSkills = this._allSkills.filter(skill => {
        const skillName = skill.name || skill.label || skill.id || '';
        return this._beastSkillList.includes(skillName);
      });
      swseLogger.log('[SkillsStep] Beast progression - skills constrained to Beast list:', {
        totalSkills: this._allSkills.length,
        availableSkills: this._availableSkills.length,
        beastSkillList: this._beastSkillList
      });
    } else {
      const derivation = this._deriveAvailableSkills(shell);
      this._skillDerivation = derivation;
      this._availableSkills = derivation.skills
        .slice()
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      swseLogger.log('[SkillsStep] Skill availability resolved', {
        mode: derivation.mode,
        totalRegistrySkills: this._allSkills.length,
        classSkillRefs: derivation.classSkillRefs,
        classSkillMatches: derivation.classSkillMatches,
        backgroundSkillRefs: derivation.backgroundSkillRefs,
        backgroundSkillMatches: derivation.backgroundSkillMatches,
        trainedSelectionMatches: derivation.trainedSelectionMatches,
        availableSkills: derivation.skills.length,
        fallbackReason: derivation.fallbackReason || null,
      });
    }

    // Phase 3.1: Filter out "Use the Force" for Droids (droid constraint: cannot use/train Force skill)
    if (this._isDroid) {
      const beforeCount = this._availableSkills.length;
      this._availableSkills = this._availableSkills.filter(skill => {
        const skillKey = skill.key || skill.id || '';
        const skillName = skill.name || skill.label || '';
        // Exclude "Use the Force" (checked by key and name for safety)
        return !(
          skillKey.toLowerCase() === 'usetheforce' ||
          skillName.toLowerCase() === 'use the force'
        );
      });
      const filtered = beforeCount - this._availableSkills.length;
      if (filtered > 0) {
        swseLogger.debug('[SkillsStep] Droid progression - "Use the Force" excluded from available skills', {
          beforeCount,
          afterCount: this._availableSkills.length,
          filtered
        });
      }
    }

    // Get suggested skills from SuggestionService
    await this._getSuggestedSkills(shell.actor, shell);

    // Enable Ask Mentor
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire skill checkboxes
    const skillCheckboxes = shell.element.querySelectorAll('.skills-step-skill-checkbox');
    skillCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.preventDefault();
        const skillKey = checkbox.dataset.skill;
        const checked = checkbox.checked;

        this._toggleSkill(skillKey, checked);
        shell.render();
      }, { signal });
    });

    const trainButtons = shell.element.querySelectorAll('.skills-step-train-btn');
    trainButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const skillKey = btn.dataset.skill;
        this._trainSkill(skillKey);
        shell.render();
      }, { signal });
    });

    const untrainButtons = shell.element.querySelectorAll('.skills-step-untrain-btn');
    untrainButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const skillKey = btn.dataset.skill;
        this._untrainSkill(skillKey);
        shell.render();
      }, { signal });
    });

    const resetBtn = shell.element.querySelector('.skills-step-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._resetAllSkills();
        shell.render();
      }, { signal });
    }
  }

  async onStepExit(shell) {
    // PHASE 1: Normalize and commit to canonical session
    const trainedList = Array.from(this._trainedSkills.entries())
      .filter(([_, data]) => data.trained)
      .map(([key, _]) => key);  // Just the keys for normalized format

    const normalizedSkills = normalizeSkills(trainedList);

    if (normalizedSkills && shell) {
      // Commit to canonical session (also updates buildIntent for backward compat)
      await this._commitNormalized(shell, 'skills', normalizedSkills);
    }
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const { suggestedIds, hasSuggestions } = this.formatSuggestionsForDisplay(this._suggestedSkills);
    return {
      trainedSkills: Object.fromEntries(this._trainedSkills),
      trainedCount: this._trainedCount,
      allowedCount: this._allowedCount,
      allSkills: this._availableSkills.map(s => this._formatSkillCard(s, suggestedIds)),
      hasSuggestions,
      suggestedSkillIds: Array.from(suggestedIds),
      isBeast: this._isBeast,
      isDroid: this._isDroid,
      focusedSkillId: this._focusedSkillId,
      availableSkillCount: this._availableSkills.length,
      skillSourceMode: this._skillDerivation?.mode || 'fallback-full-chart',
      fallbackReason: this._skillDerivation?.fallbackReason || null,
      isFallbackFullChart: (this._skillDerivation?.mode || 'fallback-full-chart') === 'fallback-full-chart',
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];
    const warnings = [];

    // No hard requirement to train all slots, but warn if not used
    if (this._trainedCount === 0 && this._allowedCount > 0) {
      warnings.push(`You have ${this._allowedCount} skill training slot(s) available. Consider selecting skills!`);
    }

    if (this._trainedCount > this._allowedCount) {
      errors.push(`Too many skills trained (${this._trainedCount}/${this._allowedCount}). Untrain some skills.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getSelection() {
    const trainedList = Array.from(this._trainedSkills.entries())
      .filter(([_, data]) => data.trained)
      .map(([key, _]) => key);

    return {
      selected: trainedList,
      count: this._trainedCount,
      isComplete: this._trainedCount <= this._allowedCount,
    };
  }

  getBlockingIssues() {
    const validation = this.validate();
    return validation.errors;
  }

  // ---------------------------------------------------------------------------
  // Skill Management
  // ---------------------------------------------------------------------------

  _toggleSkill(skillKey, trained) {
    const targetSkill = this._availableSkills.find(skill => skill.key === skillKey || skill.id === skillKey || skill._id === skillKey);
    if (trained && targetSkill && targetSkill.canTrain === false) {
      ui.notifications.warn('Only class or background skills can be trained at this time.');
      return;
    }

    // Phase 3.1: For Droid, enforce droid skill constraint (no "Use the Force")
    if (trained && this._isDroid) {
      const skillKeyLower = (skillKey || '').toLowerCase();
      if (skillKeyLower === 'usetheforce' || skillKeyLower === 'use the force') {
        ui.notifications.warn('Droids cannot use or train the Force skill.');
        return;
      }
    }

    // Phase 2.7: For Beast, enforce Beast skill list constraint
    if (trained && this._isBeast) {
      const isValidBeastSkill = this._availableSkills.some(skill => {
        const skillName = skill.name || skill.label || skill.id || '';
        return skillName === skillKey || skill.id === skillKey;
      });

      if (!isValidBeastSkill) {
        ui.notifications.warn(`${skillKey} is not in the Beast skill list. Only Beast skills can be trained.`);
        return;
      }
    }

    if (!this._trainedSkills.has(skillKey)) {
      this._trainedSkills.set(skillKey, {});
    }

    const skillData = this._trainedSkills.get(skillKey);

    if (trained && this._trainedCount >= this._allowedCount) {
      ui.notifications.warn(`You can only train ${this._allowedCount} skill(s). Untrain another skill first.`);
      return;
    }

    skillData.trained = trained;
    this._trainedCount = Array.from(this._trainedSkills.values())
      .filter(s => s.trained)
      .length;

    swseLogger.log(`[SkillsStep] Skill "${skillKey}" toggled to ${trained}, count: ${this._trainedCount}/${this._allowedCount}`);
  }

  _trainSkill(skillKey) {
    const targetSkill = this._availableSkills.find(skill => skill.key === skillKey || skill.id === skillKey || skill._id === skillKey);
    if (targetSkill && targetSkill.canTrain === false) {
      ui.notifications.warn('Only class or background skills can be trained at this time.');
      return;
    }

    // Phase 3.1: For Droid, enforce droid skill constraint (no "Use the Force")
    if (this._isDroid) {
      const skillKeyLower = (skillKey || '').toLowerCase();
      if (skillKeyLower === 'usetheforce' || skillKeyLower === 'use the force') {
        ui.notifications.warn('Droids cannot use or train the Force skill.');
        return;
      }
    }

    // Phase 2.7: For Beast, enforce Beast skill list constraint
    if (this._isBeast) {
      const isValidBeastSkill = this._availableSkills.some(skill => {
        const skillName = skill.name || skill.label || skill.id || '';
        return skillName === skillKey || skill.id === skillKey;
      });

      if (!isValidBeastSkill) {
        ui.notifications.warn(`${skillKey} is not in the Beast skill list. Only Beast skills can be trained.`);
        return;
      }
    }

    if (!this._trainedSkills.has(skillKey)) {
      this._trainedSkills.set(skillKey, {});
    }

    const skillData = this._trainedSkills.get(skillKey);

    if (!skillData.trained && this._trainedCount >= this._allowedCount) {
      ui.notifications.warn(`You can only train ${this._allowedCount} skill(s). Untrain another skill first.`);
      return;
    }

    skillData.trained = true;
    this._trainedCount = Array.from(this._trainedSkills.values())
      .filter(s => s.trained)
      .length;

    swseLogger.log(`[SkillsStep] Skill "${skillKey}" trained, count: ${this._trainedCount}/${this._allowedCount}`);
  }

  _untrainSkill(skillKey) {
    if (this._trainedSkills.has(skillKey)) {
      this._trainedSkills.get(skillKey).trained = false;
      this._trainedCount = Array.from(this._trainedSkills.values())
        .filter(s => s.trained)
        .length;
      swseLogger.log(`[SkillsStep] Skill "${skillKey}" untrained, count: ${this._trainedCount}/${this._allowedCount}`);
    }
  }

  _resetAllSkills() {
    this._trainedSkills.forEach(skillData => {
      skillData.trained = false;
    });
    this._trainedCount = 0;
    swseLogger.log(`[SkillsStep] All skills reset`);
    ui.notifications.info('All skill selections have been reset.');
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/skills-work-surface.hbs',
      data: stepData,
    };
  }


renderDetailsPanel(focusedItem) {
  const skill = this._resolveFocusedSkill(focusedItem);
  if (!skill) return this.renderDetailsPanelEmptyState();

  return {
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/skill-details.hbs',
    data: {
      skill,
      skillName: skill.name,
      abilityLabel: skill.abilityLabel || 'Unknown',
      category: skill.category || null,
      isClassSkill: !!skill.isClassSkill,
      isBackgroundSkill: !!skill.isBackgroundSkill,
      trained: !!this._getSkillSelectionState(skill)?.trained,
    },
  };
}

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'skills');
    if (customGuidance) return customGuidance;

    // Phase 2.7: Beast-specific guidance
    if (this._isBeast) {
      return 'As a creature, your instincts guide your capabilities. Choose skills from those natural to your kind.';
    }

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return 'Choose skills that reflect your background and training. They will define what you excel at.';
    } else if (this.isLevelup(shell)) {
      return 'As you gain experience, you refine your skills. Invest in areas that matter to your journey.';
    }

    return 'Choose your skills wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested skills from SuggestionService
   * Recommendations based on class, background, and other selections
   * @private
   */
  async _getSuggestedSkills(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      // NOTE: Domain is 'skills_l1' per canonical domain registry (not 'skills')
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'skills_l1',
        available: this._allSkills,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      const rankedSuggestions = SuggestionService.sortBySuggestion((suggested || []))
        .filter(skill => (skill?.suggestion?.tier ?? skill?.tier ?? 0) > 0);

      this._suggestedSkills = rankedSuggestions.slice(0, 3);
    } catch (err) {
      swseLogger.warn('[SkillsStep] Suggestion service error:', err);
      this._suggestedSkills = [];
    }
  }

  /**
   * Extract character data from shell for suggestion engine
   * Allows suggestions to understand what choices have been made so far
   * @private
   */
  _buildCharacterDataFromShell(shell) {
    if (!shell?.buildIntent) {
      return {};
    }

    return shell.buildIntent.toCharacterData();
  }




  _seedExistingSkills(shell, character) {
    this._trainedSkills = new Map();

    const rawSelection =
      shell?.progressionSession?.draftSelections?.skills
      ?? shell?.progressionSession?.getSelection?.('skills')
      ?? shell?.committedSelections?.get?.('skills')
      ?? shell?.buildIntent?.getSelection?.('skills')
      ?? null;

    const seededKeys = new Set(this._extractTrainedSkillKeys(rawSelection));

    if (!this.isChargen(shell)) {
      const actorSkills = character?.skills || {};
      for (const [key, skillData] of Object.entries(actorSkills)) {
        if (skillData?.trained === true) {
          seededKeys.add(key);
        }
      }
    }

    for (const key of seededKeys) {
      this._trainedSkills.set(key, { trained: true });
    }
  }

  _extractTrainedSkillKeys(rawSelection) {
    const normalized = normalizeSkills(rawSelection);
    if (!normalized?.trained || !Array.isArray(normalized.trained)) {
      return [];
    }

    const unique = new Map();
    for (const key of normalized.trained) {
      const normalizedKey = this._skillLookupKey(key);
      if (!normalizedKey || unique.has(normalizedKey)) continue;
      unique.set(normalizedKey, key);
    }

    return Array.from(unique.values());
  }

  _resolveAllowedSkillCount(shell, character) {
    const classModel = resolveSelectedClassFromShell(shell) || this._resolveSelectedClassData(
      shell?.progressionSession?.getSelection?.('class')
      || shell?.committedSelections?.get?.('class')
      || null
    );

    const classTrainedSkills = Number(
      classModel?.trainedSkills
      ?? classModel?.skillPoints
      ?? classModel?.system?.trainedSkills
      ?? classModel?.system?.skillPoints
      ?? 0
    ) || 0;

    const attributeSelection =
      shell?.progressionSession?.getSelection?.('attributes')
      || shell?.committedSelections?.get?.('attributes')
      || shell?.buildIntent?.toCharacterData?.()?.abilityIncreases
      || null;

    const selectedInt = Number(
      attributeSelection?.values?.int
      ?? attributeSelection?.int
      ?? character?.abilities?.int?.base
      ?? character?.abilities?.int?.value
      ?? character?.abilities?.int?.total
      ?? character?.attributes?.int?.value
      ?? 10
    ) || 10;

    const speciesSelection =
      shell?.progressionSession?.getSelection?.('species')
      || shell?.committedSelections?.get?.('species')
      || shell?.buildIntent?.toCharacterData?.()?.species
      || null;

    const speciesAbilityScores = speciesSelection?.abilityScores || speciesSelection?.system?.abilityScores || {};
    const speciesIntBonus = Number(
      speciesAbilityScores.int
      ?? speciesAbilityScores.Intelligence
      ?? speciesAbilityScores.intelligence
      ?? 0
    ) || 0;

    const finalIntScore = selectedInt + speciesIntBonus;
    const intMod = Math.floor((finalIntScore - 10) / 2);

    const speciesName = String(
      speciesSelection?.name
      ?? speciesSelection?.label
      ?? speciesSelection?.id
      ?? character?.species
      ?? character?.details?.species
      ?? ''
    ).trim().toLowerCase();

    const humanBonus = (
      speciesName === 'human'
      || speciesName === 'nearhuman'
      || speciesName === 'near_human'
      || speciesName === 'near-human'
    ) ? 1 : 0;

    return Math.max(1, classTrainedSkills + intMod + humanBonus);
  }

  _deriveAvailableSkills(shell) {
    const classSelection =
      shell?.progressionSession?.getSelection?.('class')
      || shell?.committedSelections?.get?.('class')
      || null;

    const classModel = this._resolveSelectedClassData(classSelection);

    const classSkillRefs = classModel ? getClassSkills(classModel) : [];
    const classSkillMatches = this._matchSkillsFromRefs(classSkillRefs);
    const backgroundSkillRefs = this._getBackgroundSkillRefs(shell);
    const backgroundSkillMatches = this._matchSkillsFromRefs(backgroundSkillRefs);
    const trainedSelectionMatches = this._matchSkillsFromRefs(
      Array.from(this._trainedSkills.entries())
        .filter(([_, state]) => state?.trained)
        .map(([key]) => key)
    );

    const classIds = new Set(classSkillMatches.map(skill => skill.id));
    const backgroundIds = new Set(backgroundSkillMatches.map(skill => skill.id));
    const trainedIds = new Set(trainedSelectionMatches.map(skill => skill.id));
    const allowedIds = new Set([...classIds, ...backgroundIds, ...trainedIds]);

    const allowedSkillMap = new Map();
    for (const skill of this._allSkills) {
      if (!allowedIds.has(skill.id)) continue;
      allowedSkillMap.set(skill.id, {
        ...skill,
        isClassSkill: classIds.has(skill.id),
        isBackgroundSkill: backgroundIds.has(skill.id),
        available: true,
        canTrain: classIds.has(skill.id) || backgroundIds.has(skill.id) || trainedIds.has(skill.id),
        alwaysVisible: true,
      });
    }

    const skills = Array.from(allowedSkillMap.values())
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    if (!classModel || classSkillMatches.length === 0 || skills.length === 0) {
      return {
        mode: 'fallback-full-chart',
        fallbackReason: !classModel
          ? 'selected-class-unresolved'
          : (classSkillMatches.length === 0
            ? 'selected-class-produced-zero-skill-matches'
            : 'allowed-skill-set-empty-after-filter'),
        classSkillRefs: classSkillRefs.length,
        classSkillMatches: classSkillMatches.length,
        backgroundSkillRefs: backgroundSkillRefs.length,
        backgroundSkillMatches: backgroundSkillMatches.length,
        trainedSelectionMatches: trainedSelectionMatches.length,
        skills,
      };
    }

    return {
      mode: 'legal-class-background',
      fallbackReason: null,
      classSkillRefs: classSkillRefs.length,
      classSkillMatches: classSkillMatches.length,
      backgroundSkillRefs: backgroundSkillRefs.length,
      backgroundSkillMatches: backgroundSkillMatches.length,
      trainedSelectionMatches: trainedSelectionMatches.length,
      skills,
    };
  }


  _resolveSelectedClassData(classSelection) {
    if (!classSelection) return null;

    // PHASE 3: Use canonical class resolution helper for consistent behavior
    const classModel = resolveClassModel(classSelection);

    if (!classModel) {
      swseLogger.warn('[SkillsStep] Failed to resolve class from selection:', classSelection);
      return null;
    }

    return classModel;
  }

  _getBackgroundSkillRefs(shell) {
    const rawCommitted = shell?.committedSelections?.get?.('background');
    const rawBackgrounds = Array.isArray(rawCommitted?.backgrounds) ? rawCommitted.backgrounds : [];

    if (rawBackgrounds.length > 0) {
      return rawBackgrounds.flatMap(bg => ([
        ...(bg.trainedSkills || bg.system?.trainedSkills || []),
        ...(bg.relevantSkills || bg.system?.relevantSkills || []),
        ...(bg.skills || bg.system?.skills || []),
        ...(bg.grants?.skills || []),
      ])).filter(Boolean);
    }

    const canonicalBackground =
      shell?.progressionSession?.getSelection?.('background')
      || rawCommitted
      || null;

    return [
      ...(canonicalBackground?.grants?.skills || []),
      ...(canonicalBackground?.trainedSkills || []),
      ...(canonicalBackground?.relevantSkills || []),
      ...(canonicalBackground?.skills || []),
    ].filter(Boolean);
  }

  _matchSkillsFromRefs(refs = []) {
    const seen = new Set();
    const matches = [];

    for (const ref of refs || []) {
      const resolvedSkills = this._resolveSkillsFromRef(ref);
      for (const skill of resolvedSkills) {
        if (!skill || seen.has(skill.id)) continue;
        seen.add(skill.id);
        matches.push(skill);
      }
    }

    return matches;
  }

  _resolveSkillsFromRef(ref) {
    if (!ref) return [];

    const rawValue = typeof ref === 'object'
      ? (ref.name || ref.label || ref.key || ref.id || ref._id || '')
      : ref;

    const raw = String(rawValue).trim();
    if (!raw) return [];

    const simplified = raw
      .replace(/\[(.*?)\]/g, '')
      .replace(/\((.*?)\)/g, '')
      .replace(/\ball skills, taken individually\b/gi, '')
      .trim();

    const rawKey = this._skillLookupKey(raw);
    const simpleKey = this._skillLookupKey(simplified);
    const isKnowledgeWildcard = /knowledge\s*\(\s*(any|all)\s*\)/i.test(raw) || simpleKey === 'knowledge';

    if (isKnowledgeWildcard) {
      return this._allSkills.filter(skill => /^knowledge/i.test(String(skill.name || '')));
    }

    const match = this._allSkills.find(skill => {
      const skillId = String(skill.id || skill._id || '').toLowerCase();
      const skillNameKey = this._skillLookupKey(skill.name || '');
      const skillKey = this._skillLookupKey(skill.key || '');

      return (
        skillId === raw.toLowerCase()
        || skillId === simplified.toLowerCase()
        || skillNameKey === rawKey
        || skillNameKey === simpleKey
        || skillKey === rawKey
        || skillKey === simpleKey
      );
    });

    return match ? [match] : [];
  }


  
_getSkillSelectionState(skillOrKey) {
  const candidates = typeof skillOrKey === 'string'
    ? [skillOrKey]
    : [skillOrKey?.key, skillOrKey?.id, skillOrKey?._id, skillOrKey?.name];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const direct = this._trainedSkills.get(candidate);
    if (direct) return direct;

    const normalizedCandidate = this._skillLookupKey(candidate);
    for (const [storedKey, state] of this._trainedSkills.entries()) {
      if (this._skillLookupKey(storedKey) === normalizedCandidate) {
        return state;
      }
    }
  }

  return null;
}

_skillLookupKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[()[\]{}]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

_normalizeSkillRecord(skill) {
  if (!skill) return null;
  const name = skill.name || skill.label || skill.id || skill._id || 'Unknown Skill';
  const key = String(skill.key || skill.slug || skill.system?.key || name)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const id = skill.id || skill._id || key;
  const ability = String(skill.system?.ability || skill.ability || '').toLowerCase();
  const abilityLabel = this._abilityLabel(ability);
  const classSkills = skill.system?.classes || skill.classes || {};
  const classSkill = Object.values(classSkills).some(Boolean);

  return {
    ...skill,
    id,
    _id: skill._id || id,
    key,
    name,
    ability,
    abilityLabel,
    category: skill.category || abilityLabel,
    alwaysVisible: skill.alwaysVisible ?? false,
    available: skill.available ?? false,
    classSkill,
    description: skill.system?.description || skill.description || '',
  };
}

_abilityLabel(ability) {
  const map = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  return map[ability] || 'General';
}

_resolveFocusedSkill(focusedItem) {
  const focusedId = focusedItem?.id || this._focusedSkillId;
  if (!focusedId) return null;
  return this._availableSkills.find((skill) => skill.id === focusedId || skill._id === focusedId || skill.key === focusedId) || null;
}

async onItemFocused(id, shell) {
  const skill = this._availableSkills.find((entry) => entry.id === id || entry._id === id || entry.key === id);
  if (!skill) return;
  this._focusedSkillId = skill.id;
  shell.focusedItem = { id: skill.id };
  shell.render();
}

_formatSkillCard(skill, suggestedIds = new Set()) {
  const normalized = this._normalizeSkillRecord(skill);
  const isSuggested = this.isSuggestedItem(normalized.id, suggestedIds) || this.isSuggestedItem(normalized.key, suggestedIds);
  return {
    ...normalized,
    isSuggested,
    badgeLabel: isSuggested ? 'Recommended' : null,
    badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
    canTrain: normalized.canTrain !== false,
    isTrained: !!this._getSkillSelectionState(normalized)?.trained,
  };
}

}
