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

function displaySkill(skill) {
  return String(skill || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, m => m.toUpperCase());
}

function extractSpeciesSkillBonuses(species) {
  const raw = [
    ...(Array.isArray(species?.skillBonuses) ? species.skillBonuses : []),
    ...(Array.isArray(species?.system?.skillBonuses) ? species.system.skillBonuses : []),
    ...(Array.isArray(species?.canonicalStats?.skillBonuses) ? species.canonicalStats.skillBonuses : []),
  ];
  const result = [];
  for (const entry of raw) {
    const text = String(entry?.name || entry?.label || entry?.skill || entry || '').trim();
    if (!text) continue;
    const match = text.match(/(?:\+\d+\s*)?(.+)$/);
    const skill = match?.[1]?.trim();
    if (skill) result.push(skill.replace(/^to\s+/i, '').trim());
  }
  return Array.from(new Set(result));
}

function hasUsefulMechanicalText(background) {
  const text = [
    background?.specialAbility,
    background?.mechanicalEffect?.description,
    ...(Array.isArray(background?.specialAbilities) ? background.specialAbilities.map(a => a?.description || a?.name) : [])
  ].filter(Boolean).join(' ').toLowerCase();
  return /bonus|reroll|choose|language|class skill|trained|untrained|competence|may/i.test(text);
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
      species: pendingData?.selectedSpecies || pendingData?.species || actor?.system?.species || null,
      speciesSkillBonuses: extractSpeciesSkillBonuses(pendingData?.selectedSpecies || pendingData?.species || actor?.system?.species || null)
    };
  }

  static _scoreBackground(background, profile) {
    const skillList = toSkillList(background);
    const normalizedSkills = skillList.map((s) => norm(s));
    const reasons = [];
    let score = 0;

    // 1) Last-class-skill window: reward backgrounds that open important skills the class lacks.
    const expansionPairs = skillList
      .map((skill, index) => ({ raw: skill, key: normalizedSkills[index] }))
      .filter((entry) => entry.key && !profile.classSkillKeys.has(entry.key));
    if (expansionPairs.length > 0) {
      score += expansionPairs.length * 1.35;
      reasons.push(`Adds novel class-skill access your class does not already provide: ${expansionPairs.slice(0, 3).map(e => displaySkill(e.raw)).join(', ')}.`);
    }

    // 2) Survey-intended skills: the heaviest direct bias.
    const surveySkillNames = [];
    const surveySkillHits = skillList.reduce((sum, skill) => {
      const weight = Number(profile.intendedSkills[norm(skill)] || 0);
      if (weight > 0) surveySkillNames.push(displaySkill(skill));
      return sum + Math.max(0, weight);
    }, 0);
    if (surveySkillHits > 0) {
      score += surveySkillHits * 1.8;
      reasons.push(`Matches the skill interests from your L1 survey: ${Array.from(new Set(surveySkillNames)).slice(0, 3).join(', ')}.`);
    }

    // 3) Prestige path readiness via required skills.
    const prestigeSkillNames = [];
    const prestigeHits = skillList.reduce((sum, skill) => {
      const tags = getSkillPrestigeTags(skill);
      const hits = tags.filter((tag) => profile.prestigeTargets.has(String(tag).replace(/^Prereq_/, '')));
      if (hits.length) prestigeSkillNames.push(displaySkill(skill));
      return sum + hits.length;
    }, 0);
    if (prestigeHits > 0) {
      score += prestigeHits * 1.6;
      reasons.push(`Helps preserve future prestige path options through ${Array.from(new Set(prestigeSkillNames)).slice(0, 3).join(', ')}.`);
    }

    // 4) Attribute synergy through the actual skills the background supports.
    const abilityHits = [];
    const abilitySynergy = skillList.reduce((sum, skill) => {
      const ability = getSkillAbility(skill);
      const weight = Number(profile.planningProfile.abilityWeights?.[ability] || 0);
      if (weight > 0) abilityHits.push(`${displaySkill(skill)} (${String(ability).toUpperCase()})`);
      return sum + weight;
    }, 0);
    if (abilitySynergy > 0) {
      score += Math.min(2.5, abilitySynergy / 4);
      reasons.push(`Its skills lean on your stronger attribute plan: ${Array.from(new Set(abilityHits)).slice(0, 3).join(', ')}.`);
    }

    // 5) Species skill synergy only matters when the class does not already cover that skill.
    const speciesSkillHits = (profile.speciesSkillBonuses || [])
      .filter(skill => normalizedSkills.includes(norm(skill)) && !profile.classSkillKeys.has(norm(skill)));
    if (speciesSkillHits.length > 0) {
      score += speciesSkillHits.length * 1.2;
      reasons.push(`Your species boosts ${speciesSkillHits.slice(0, 3).map(displaySkill).join(', ')}, and this background can make that skill lane legal.`);
    }

    // 6) Species/narrative fit remains soft, never dominant.
    if (profile.species && this._isSpeciesBackground(background, profile.species?.name || profile.species)) {
      score += 0.35;
      reasons.push('The background is narratively coherent with your species.');
    }

    // 7) Bonus language / utility remains mild but visible.
    if (background?.bonusLanguage || background?.languages?.length) {
      score += 0.25;
      reasons.push('It also contributes a background language or language option.');
    }

    // 8) Mechanical bonus text can reinforce forecast lanes.
    const bonusText = [
      background?.specialAbility,
      background?.mechanicalEffect?.description,
      background?.description,
      background?.narrativeDescription
    ].filter(Boolean).join(' ').toLowerCase();

    if ((bonusText.includes('stealth') && profile.intendedSkills.stealth) ||
        (bonusText.includes('knowledge') && Object.keys(profile.intendedSkills).some((k) => k.includes('knowledge')))) {
      score += 1.0;
      reasons.push('Its bonus text lines up with a stated build lane.');
    }
    if (hasUsefulMechanicalText(background)) {
      score += 0.45;
      reasons.push('It has an extra mechanical hook such as a bonus, reroll, language, or class-skill benefit.');
    }

    // Tier derivation.
    let tier = UNIFIED_TIERS.AVAILABLE;
    if (score >= 5.5) tier = UNIFIED_TIERS.PRESTIGE_PREREQUISITE;
    else if (score >= 4.0) tier = UNIFIED_TIERS.PATH_CONTINUATION;
    else if (score >= 2.5) tier = UNIFIED_TIERS.CATEGORY_SYNERGY;
    else if (score >= 1.2) tier = UNIFIED_TIERS.ABILITY_SYNERGY;
    else if (score > 0) tier = UNIFIED_TIERS.THEMATIC_FIT;

    const tierMetadata = getTierMetadata(tier);
    const uniqueReasons = Array.from(new Set(reasons)).slice(0, 5);
    return {
      tier,
      score,
      icon: tierMetadata.icon,
      color: tierMetadata.color,
      label: tierMetadata.label,
      reason: uniqueReasons[0] || tierMetadata.description,
      reasons: uniqueReasons,
      reasonBullets: uniqueReasons,
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
