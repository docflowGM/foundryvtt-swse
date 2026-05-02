/**
 * Background Suggestion Engine for Character Generation
 *
 * Strongly weights backgrounds that:
 * - expand class-skill access at the last meaningful chargen window
 * - reinforce survey-declared intended skills and archetype goals
 * - support prestige prerequisites and future build lanes
 * - provide ability synergy without ignoring species/class context
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { UNIFIED_TIERS, getTierMetadata } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import { resolveClassModel, getClassSkills } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js";
import { getSkillAbility, buildAttributePlanningProfile } from "/systems/foundryvtt-swse/scripts/engine/suggestion/attribute-planner.js";
import { getPrestigeTargets, getSkillPrestigeTags } from "/systems/foundryvtt-swse/scripts/engine/suggestion/prestige-path-signals.js";

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function toSkillList(background) {
  return [
    ...(background?.relevantSkills || []),
    ...(background?.trainedSkills || []),
    ...(background?.classSkillsGranted || [])
  ].filter(Boolean);
}

export class BackgroundSuggestionEngine {
  static async suggestBackgrounds(backgrounds, actor, pendingData = {}) {
    if (!Array.isArray(backgrounds) || backgrounds.length === 0) return [];

    try {
      const profile = this._buildCharacterProfile(actor, pendingData);
      const suggested = backgrounds.map((background) => ({
        ...background,
        suggestion: this._scoreBackground(background, profile)
      }));

      suggested.sort((a, b) => {
        if ((b.suggestion?.tier || 0) !== (a.suggestion?.tier || 0)) {
          return (b.suggestion?.tier || 0) - (a.suggestion?.tier || 0);
        }
        return (b.suggestion?.score || 0) - (a.suggestion?.score || 0);
      });

      return suggested;
    } catch (err) {
      SWSELogger.error('BackgroundSuggestionEngine | Error suggesting backgrounds:', err);
      return backgrounds;
    }
  }

  static _buildCharacterProfile(actor, pendingData) {
    const mentorBiases = pendingData?.mentorBiases || actor?.system?.swse?.mentorBuildIntentBiases || {};
    const planningProfile = buildAttributePlanningProfile({ actor, pendingData });
    const classSelection = pendingData?.selectedClass || pendingData?.classes?.[0] || null;
    const classModel = resolveClassModel(classSelection);
    const classSkillRefs = getClassSkills(classModel);
    const classSkillKeys = new Set(classSkillRefs.map((ref) => norm(ref?.name || ref?.label || ref?.id || ref)));
    const trainedSkills = new Set(
      (pendingData?.selectedSkills || pendingData?.trainedSkills || []).map((entry) => norm(entry?.name || entry?.label || entry?.key || entry))
    );

    return {
      classModel,
      classSkillKeys,
      trainedSkills,
      mentorBiases,
      planningProfile,
      prestigeTargets: new Set(getPrestigeTargets({ mentorBiases })),
      intendedSkills: mentorBiases?.skillBiasWeights || {},
      intendedAttributes: mentorBiases?.attributeBiasWeights || {},
      featBiasWeights: mentorBiases?.featBiasWeights || {},
      talentBiasWeights: mentorBiases?.talentBiasWeights || {},
      species: pendingData?.species || actor?.system?.species || null
    };
  }

  static _scoreBackground(background, profile) {
    const skillList = toSkillList(background);
    const normalizedSkills = skillList.map((s) => norm(s));
    const reasons = [];
    let score = 0;

    // 1) Last-class-skill window: reward backgrounds that open important skills the class lacks.
    const expansionSkills = normalizedSkills.filter((skill) => !profile.classSkillKeys.has(skill));
    if (expansionSkills.length > 0) {
      score += expansionSkills.length * 1.35;
      reasons.push('Expands your class-skill access');
    }

    // 2) Survey-intended skills: the heaviest direct bias.
    const surveySkillHits = skillList.reduce((sum, skill) => {
      const weight = Number(profile.intendedSkills[norm(skill)] || 0);
      return sum + Math.max(0, weight);
    }, 0);
    if (surveySkillHits > 0) {
      score += surveySkillHits * 1.8;
      reasons.push('Supports the skills you said you want to build around');
    }

    // 3) Prestige path readiness via required skills.
    const prestigeHits = skillList.reduce((sum, skill) => {
      const tags = getSkillPrestigeTags(skill);
      return sum + tags.filter((tag) => profile.prestigeTargets.has(String(tag).replace(/^Prereq_/, ''))).length;
    }, 0);
    if (prestigeHits > 0) {
      score += prestigeHits * 1.6;
      reasons.push('Builds toward a declared prestige path');
    }

    // 4) Attribute synergy through the actual skills the background supports.
    const abilitySynergy = skillList.reduce((sum, skill) => {
      const ability = getSkillAbility(skill);
      return sum + Number(profile.planningProfile.abilityWeights?.[ability] || 0);
    }, 0);
    if (abilitySynergy > 0) {
      score += Math.min(2.5, abilitySynergy / 4);
      reasons.push('Matches your strongest or planned attributes');
    }

    // 5) Species/narrative fit remains soft, never dominant.
    if (profile.species && this._isSpeciesBackground(background, profile.species?.name || profile.species)) {
      score += 0.35;
      reasons.push('Narratively coherent with your species');
    }

    // 6) Bonus language / utility remains mild.
    if (background?.bonusLanguage) {
      score += 0.1;
    }

    // 7) Mechanical bonus text can reinforce forecast lanes.
    const bonusText = [
      background?.specialAbility,
      background?.mechanicalEffect?.description,
      background?.description,
      background?.narrativeDescription
    ].filter(Boolean).join(' ').toLowerCase();

    if ((bonusText.includes('stealth') && profile.intendedSkills.stealth) ||
        (bonusText.includes('knowledge') && Object.keys(profile.intendedSkills).some((k) => k.includes('knowledge')))) {
      score += 1.0;
      reasons.push('Its bonus text lines up with your stated build lane');
    }

    // Tier derivation.
    let tier = UNIFIED_TIERS.AVAILABLE;
    if (score >= 5.5) tier = UNIFIED_TIERS.PRESTIGE_PREREQUISITE;
    else if (score >= 4.0) tier = UNIFIED_TIERS.PATH_CONTINUATION;
    else if (score >= 2.5) tier = UNIFIED_TIERS.CATEGORY_SYNERGY;
    else if (score >= 1.2) tier = UNIFIED_TIERS.ABILITY_SYNERGY;
    else if (score > 0) tier = UNIFIED_TIERS.THEMATIC_FIT;

    const tierMetadata = getTierMetadata(tier);
    return {
      tier,
      score,
      icon: tierMetadata.icon,
      color: tierMetadata.color,
      label: tierMetadata.label,
      reason: reasons.length ? Array.from(new Set(reasons)).join('; ') : tierMetadata.description
    };
  }

  static _isSpeciesBackground(background, species) {
    const narrative = `${background?.name || ''} ${background?.narrativeDescription || ''} ${background?.description || ''}`.toLowerCase();
    const speciesName = String(species || '').toLowerCase();
    if (!speciesName) return false;
    if (narrative.includes(speciesName)) return true;
    const soft = {
      twilek: ['slave', 'dancer', 'smuggler', 'diplomat'],
      miraluka: ['force', 'mystic', 'seeker'],
      wookiee: ['tribe', 'honor', 'warrior'],
      droid: ['mechanic', 'service', 'program']
    };
    return (soft[norm(species)] || []).some((entry) => narrative.includes(entry));
  }

  static sortBySuggestion(backgrounds) {
    return backgrounds.sort((a, b) => ((b.suggestion?.tier || 0) - (a.suggestion?.tier || 0)) || ((b.suggestion?.score || 0) - (a.suggestion?.score || 0)));
  }
}

export default BackgroundSuggestionEngine;
