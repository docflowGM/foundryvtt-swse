/**
 * GlobalValidator - Cross-Step Constraint Checking
 */

import { swseLogger } from '../../../utils/logger.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';

export class GlobalValidator {
  static async validate(shell, options = {}) {
    const { strict = false } = options;
    const result = { isValid: true, errors: [], warnings: [], conflicts: [], suggestions: [] };

    if (!shell?.buildIntent) {
      result.errors.push('Build intent not available for validation');
      result.isValid = false;
      return result;
    }

    await ProgressionContentAuthority.initialize();
    const buildIntent = shell.buildIntent;

    await this._validateBackgroundCompatibility(buildIntent, result);
    await this._validateFeatLegality(shell, buildIntent, result);
    await this._validateTalentCoherence(shell, buildIntent, result);
    await this._validateSkillEntitlements(shell, buildIntent, result, shell.actor);
    this._validateAttributeValidity(buildIntent, result);
    await this._validateLanguageConstraints(buildIntent, result);

    result.isValid = strict ? (result.errors.length === 0 && result.warnings.length === 0) : result.errors.length === 0;

    swseLogger.debug('[GlobalValidator] Validation complete', {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      conflictCount: result.conflicts.length,
    });

    return result;
  }

  static async _validateBackgroundCompatibility(buildIntent, result) {
    const species = buildIntent.getSelection('species');
    const charClass = buildIntent.getSelection('class');
    const backgroundSelection = buildIntent.getSelection('background');

    if ((species || charClass) && !backgroundSelection) {
      result.warnings.push('Background not yet selected. This provides important mechanical benefits.');
      return;
    }
    if (!backgroundSelection) return;

    const background = await ProgressionContentAuthority.resolveBackground(backgroundSelection);
    if (!background) {
      result.errors.push('Selected background could not be resolved from BackgroundRegistry.');
      return;
    }

    const relevantSkills = await ProgressionContentAuthority.getBackgroundRelevantSkillNames(background);
    if (relevantSkills.length === 0 && !background.specialAbility && !background.mechanicalEffect) {
      result.warnings.push(`Background "${background.name}" has no mechanical data attached.`);
    }
  }

  static async _validateFeatLegality(shell, buildIntent, result) {
    const charClass = buildIntent.getSelection('class');
    const feats = buildIntent.getSelection('feats') || [];

    if (!charClass) {
      if (feats.length > 0) result.warnings.push('Feats selected but class not yet chosen. Class may restrict feat selection.');
      return;
    }
    if (feats.length === 0) {
      result.suggestions.push('Consider selecting feats to enhance your build.');
      return;
    }

    for (const featRef of feats) {
      const feat = ProgressionContentAuthority.resolveFeat(featRef);
      if (!feat) {
        result.errors.push(`Selected feat could not be resolved: ${featRef?.name || featRef?.id || featRef}`);
        continue;
      }
      try {
        const assessment = AbilityEngine.evaluateAcquisition(shell.actor, feat, shell.buildIntent.toCharacterData?.() || {});
        if (!assessment?.legal) {
          result.conflicts.push(`Feat no longer legal: ${feat.name}`);
        }
      } catch (err) {
        result.warnings.push(`Unable to fully validate feat prerequisites for ${feat.name}.`);
      }
    }
  }

  static async _validateTalentCoherence(shell, buildIntent, result) {
    const charClass = buildIntent.getSelection('class');
    const talents = buildIntent.getSelection('talents') || [];

    if (!charClass) {
      if (talents.length > 0) result.warnings.push('Talents selected but class not yet chosen. Class determines talent availability.');
      return;
    }
    if (talents.length === 0) {
      result.suggestions.push("Consider selecting talents to define your character's expertise.");
      return;
    }

    const classModel = ProgressionContentAuthority.resolveClass(charClass);
    const allowedTrees = new Set((classModel?.talentTreeIds || []).map((value) => String(value || '').toLowerCase()));

    for (const talentRef of talents) {
      const talent = ProgressionContentAuthority.resolveTalent(talentRef);
      if (!talent) {
        result.errors.push(`Selected talent could not be resolved: ${talentRef?.name || talentRef?.id || talentRef}`);
        continue;
      }
      try {
        const assessment = AbilityEngine.evaluateAcquisition(shell.actor, talent, shell.buildIntent.toCharacterData?.() || {});
        if (!assessment?.legal) {
          result.conflicts.push(`Talent no longer legal: ${talent.name}`);
        }
      } catch {
        result.warnings.push(`Unable to fully validate talent prerequisites for ${talent.name}.`);
      }
      if (allowedTrees.size > 0 && talent.talentTree && !allowedTrees.has(String(talent.talentTree).toLowerCase())) {
        result.warnings.push(`Talent ${talent.name} is not in the selected class talent trees.`);
      }
    }
  }

  static async _validateSkillEntitlements(shell, buildIntent, result, actor) {
    const charClass = buildIntent.getSelection('class');
    const skills = buildIntent.getSelection('skills') || {};

    if (!charClass) {
      if (Object.keys(skills).length > 0) result.warnings.push('Skills selected but class not yet chosen. Class determines skill entitlements.');
      return;
    }

    const normalizedSkills = ProgressionContentAuthority.normalizeSkillSelection(skills);
    const classAllowance = ProgressionContentAuthority.getClassSkillAllowance(charClass, buildIntent.getSelection('attributes')?.values ? buildIntent.getSelection('attributes') : null, actor);
    const backgroundNames = await ProgressionContentAuthority.getBackgroundRelevantSkillNames(buildIntent.getSelection('background'));
    const classSkillNames = new Set(ProgressionContentAuthority.getClassSkillNames(charClass).map((name) => String(name).toLowerCase()));
    const backgroundSkillNames = new Set(backgroundNames.map((name) => String(name).toLowerCase()));

    if (normalizedSkills.length === 0) {
      result.suggestions.push("Consider selecting skills to develop your character's expertise.");
      return;
    }

    if (normalizedSkills.length > classAllowance + backgroundSkillNames.size) {
      result.errors.push(`Too many trained skills selected (${normalizedSkills.length}). Class/background allowance is ${classAllowance + backgroundSkillNames.size}.`);
    }

    for (const skill of normalizedSkills) {
      if (!skill?.name) {
        result.errors.push('A selected skill could not be resolved from SkillRegistry.');
        continue;
      }
      const lower = String(skill.name).toLowerCase();
      if (!classSkillNames.has(lower) && !backgroundSkillNames.has(lower)) {
        result.warnings.push(`Skill ${skill.name} is not granted by class or selected background.`);
      }
    }
  }

  static _validateAttributeValidity(buildIntent, result) {
    const attributes = buildIntent.getSelection('attributes') || {};
    if (Object.keys(attributes).length === 0) {
      result.errors.push('Attributes not yet distributed. This is required before finalization.');
      return;
    }

    const values = attributes.values || attributes;
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const key of abilityKeys) {
      const score = Number(values?.[key] ?? values?.[key]?.score);
      if (!Number.isFinite(score)) {
        result.errors.push(`Missing or invalid ability score: ${key.toUpperCase()}`);
      }
    }
  }

  static async _validateLanguageConstraints(buildIntent, result) {
    const languages = buildIntent.getSelection('languages') || [];
    const background = buildIntent.getSelection('background');
    const species = buildIntent.getSelection('species');

    const normalized = await ProgressionContentAuthority.normalizeLanguageSelection(languages);
    for (const language of normalized) {
      if (!language?.name) {
        result.errors.push('A selected language could not be resolved from LanguageRegistry.');
      }
    }

    const granted = await ProgressionContentAuthority.getGrantedLanguageEntries({ speciesSelection: species, backgroundSelection: background });
    const grantedNames = new Set(granted.map((entry) => String(entry.name).toLowerCase()));
    const duplicateNames = new Set();
    for (const language of normalized) {
      const lower = String(language.name || '').toLowerCase();
      if (grantedNames.has(lower)) duplicateNames.add(language.name);
    }
    for (const name of duplicateNames) {
      result.warnings.push(`Language ${name} is already granted by species/background.`);
    }
  }
}
