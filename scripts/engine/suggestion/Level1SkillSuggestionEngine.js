/**
 * SWSE Level 1 Skill Suggestion Engine
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { extractAbilityScores } from "/systems/foundryvtt-swse/scripts/engine/suggestion/shared-suggestion-utilities.js";
import { UNIFIED_TIERS, getTierMetadata } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import { canonicalizeSkillKey } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";

export const LEVEL1_SKILL_TIERS = {
  CORE_SYNERGY: UNIFIED_TIERS.CATEGORY_SYNERGY,
  ATTRIBUTE_MATCH: UNIFIED_TIERS.ABILITY_SYNERGY,
  CLASS_SKILL: UNIFIED_TIERS.THEMATIC_FIT,
  AVAILABLE: UNIFIED_TIERS.AVAILABLE
};

export const ATTRIBUTE_SKILL_MAP = {
  str: ['climb', 'jump', 'swim'],
  dex: ['acrobatics', 'initiative', 'pilot', 'stealth'],
  con: ['endurance'],
  int: ['mechanics', 'useComputer'],
  wis: ['perception', 'survival', 'treatInjury'],
  cha: ['deception', 'gatherInformation', 'persuasion', 'useTheForce']
};

export const CORE_SKILLS = new Set(['useTheForce', 'perception', 'mechanics', 'pilot', 'stealth', 'persuasion']);

function getMentorBiases(actor, pendingData = {}) {
  return pendingData?.mentorBiases || actor?.system?.swse?.mentorBuildIntentBiases || {};
}

export class Level1SkillSuggestionEngine {
  static async suggestLevel1Skills(availableSkills, actor, pendingData = {}) {
    try {
      const level = actor.system?.level || 0;
      if (level !== 0 && level !== 1) {
        const tierMetadata = getTierMetadata(UNIFIED_TIERS.AVAILABLE);
        return availableSkills.map(skill => ({ ...skill, suggestion: { tier: UNIFIED_TIERS.AVAILABLE, reason: 'Level 1 suggestions only', icon: tierMetadata.icon, color: tierMetadata.color, label: tierMetadata.label }, isSuggested: false }));
      }

      const abilityScores = extractAbilityScores(actor);
      const classSkills = pendingData?.classSkills || [];
      const mentorBiases = getMentorBiases(actor, pendingData);
      const skillBiasWeights = mentorBiases?.skillBiasWeights || {};

      const suggestedSkills = availableSkills.map(skill => {
        let tier = LEVEL1_SKILL_TIERS.AVAILABLE;
        const reasons = [];
        const normalizedSkill = canonicalizeSkillKey(skill.key || skill.name) || this._normalizeSkillName(skill.key || skill.name);

        if (CORE_SKILLS.has(normalizedSkill)) {
          const matchingAttr = this._getAttributeForSkill(normalizedSkill);
          if (matchingAttr && abilityScores[matchingAttr] >= 16) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CORE_SYNERGY);
            reasons.push(`Core skill with strong ${matchingAttr.toUpperCase()} synergy`);
          }
        }

        const matchingAttr = this._getAttributeForSkill(normalizedSkill);
        if (matchingAttr) {
          const abilityScore = abilityScores[matchingAttr];
          if (abilityScore >= 16) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CORE_SYNERGY);
            reasons.push(`Strong synergy with high ${matchingAttr.toUpperCase()}`);
          } else if (abilityScore >= 14) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.ATTRIBUTE_MATCH);
            reasons.push(`Good synergy with ${matchingAttr.toUpperCase()}`);
          } else if (abilityScore >= 12) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CLASS_SKILL);
            reasons.push(`Synergy with ${matchingAttr.toUpperCase()}`);
          }
        }

        if (classSkills.includes(normalizedSkill) || classSkills.includes(skill.key)) {
          tier = Math.max(tier, LEVEL1_SKILL_TIERS.CLASS_SKILL);
          if (!reasons.length) reasons.push('Class skill for your chosen class');
        }

        const surveyWeight = Number(skillBiasWeights[normalizedSkill] || 0);
        if (surveyWeight > 0) {
          if (surveyWeight >= 2) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CORE_SYNERGY);
          } else {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.ATTRIBUTE_MATCH);
          }
          reasons.push('Matches your stated survey interests');
        }

        const tierMetadata = getTierMetadata(tier);
        const reason = reasons.length > 0 ? Array.from(new Set(reasons)).join('; ') : tierMetadata.description;
        return { ...skill, suggestion: { tier, reason, icon: tierMetadata.icon, color: tierMetadata.color, label: tierMetadata.label, surveyWeight }, isSuggested: tier >= UNIFIED_TIERS.ABILITY_SYNERGY };
      });

      return suggestedSkills.sort((a, b) => {
        const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
        if (tierDiff !== 0) return tierDiff;
        const surveyDiff = (b.suggestion?.surveyWeight ?? 0) - (a.suggestion?.surveyWeight ?? 0);
        if (surveyDiff !== 0) return surveyDiff;
        return (a.name || '').localeCompare(b.name || '');
      });
    } catch (err) {
      SWSELogger.error('Level 1 skill suggestion failed:', err);
      const tierMetadata = getTierMetadata(UNIFIED_TIERS.AVAILABLE);
      return availableSkills.map(skill => ({ ...skill, suggestion: { tier: UNIFIED_TIERS.AVAILABLE, reason: tierMetadata.description, icon: tierMetadata.icon, color: tierMetadata.color, label: tierMetadata.label }, isSuggested: false }));
    }
  }

  static _normalizeSkillName(name) {
    if (!name) return '';
    return String(name).toLowerCase().replace(/\s+/g, '').replace(/['-]/g, '');
  }

  static _getAttributeForSkill(skillName) {
    const normalized = canonicalizeSkillKey(skillName) || this._normalizeSkillName(skillName);
    for (const [attr, skills] of Object.entries(ATTRIBUTE_SKILL_MAP)) {
      for (const skill of skills) {
        if ((canonicalizeSkillKey(skill) || this._normalizeSkillName(skill)) === normalized) return attr;
      }
    }
    return null;
  }

  static countByTier(suggestedSkills) {
    const counts = {};
    Object.values(LEVEL1_SKILL_TIERS).forEach(tier => { counts[tier] = 0; });
    suggestedSkills.forEach(skill => {
      const tier = skill.suggestion?.tier ?? 0;
      counts[tier] = (counts[tier] || 0) + 1;
    });
    return counts;
  }
}

export default Level1SkillSuggestionEngine;
