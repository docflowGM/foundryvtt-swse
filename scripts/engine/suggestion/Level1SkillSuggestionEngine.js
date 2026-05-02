/**
 * SWSE Level 1 Skill Suggestion Engine
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { extractAbilityScores } from "/systems/foundryvtt-swse/scripts/engine/suggestion/shared-suggestion-utilities.js";
import { UNIFIED_TIERS, getTierMetadata } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import { canonicalizeSkillKey } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import { getSkillAbility } from "/systems/foundryvtt-swse/scripts/engine/suggestion/attribute-planner.js";
import { getSkillPrestigeTags, getPrestigeTargets } from "/systems/foundryvtt-swse/scripts/engine/suggestion/prestige-path-signals.js";
import { getCoreClassSkillProfile, collectProfileBiasSkills } from "/systems/foundryvtt-swse/scripts/engine/suggestion/skill-class-profiles.js";

export const LEVEL1_SKILL_TIERS = {
  CORE_SYNERGY: UNIFIED_TIERS.CATEGORY_SYNERGY,
  ATTRIBUTE_MATCH: UNIFIED_TIERS.ABILITY_SYNERGY,
  CLASS_SKILL: UNIFIED_TIERS.THEMATIC_FIT,
  AVAILABLE: UNIFIED_TIERS.AVAILABLE
};

function getMentorBiases(actor, pendingData = {}) {
  return pendingData?.mentorBiases || actor?.system?.swse?.mentorBuildIntentBiases || {};
}

function normalizeTag(tag) {
  return String(tag || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function addWeight(map, key, amount, reason) {
  if (!key || !Number.isFinite(amount) || amount == 0) return;
  if (!map[key]) map[key] = { weight: 0, reasons: [] };
  map[key].weight += amount;
  if (reason) map[key].reasons.push(reason);
}

function extractIntentTags(pendingData = {}, mentorBiases = {}) {
  const tags = new Set();
  for (const source of [
    pendingData?.intentTags,
    pendingData?.survey?.intentTags,
    pendingData?.surveyBias?.intentTags,
    mentorBiases?.intentTags,
    pendingData?.archetype ? [pendingData.archetype] : [],
    pendingData?.declaredTargets,
    pendingData?.selectedSpeciesTags
  ]) {
    if (!source) continue;
    const arr = Array.isArray(source) ? source : Object.keys(source || {});
    arr.forEach((tag) => {
      const norm = normalizeTag(tag);
      if (norm) {
        tags.add(norm);
        norm.split(/\s+/).forEach((part) => part && tags.add(part));
      }
    });
  }
  return Array.from(tags);
}

function canonicalSkillList(list = []) {
  return Array.from(new Set((list || []).map((entry) => canonicalizeSkillKey(entry) || '').filter(Boolean)));
}

function extractBackgroundSignals(pendingData = {}) {
  const background = pendingData?.background || {};
  const skills = canonicalSkillList([
    ...(pendingData?.backgroundSkills || []),
    ...(background?.trainedSkills || []),
    ...(background?.relevantSkills || []),
    ...(background?.classSkills || [])
  ]);
  const tags = new Set();
  for (const raw of [background?.name, background?.category, background?.narrativeDescription, background?.specialAbility]) {
    const norm = normalizeTag(raw);
    if (!norm) continue;
    norm.split(/\s+/).forEach((part) => part && tags.add(part));
  }
  return { skills, tags: Array.from(tags) };
}

function extractSpeciesSignals(pendingData = {}) {
  const species = pendingData?.selectedSpecies || pendingData?.species || {};
  const tags = new Set((pendingData?.selectedSpeciesTags || []).map(normalizeTag).filter(Boolean));
  const texts = [
    species?.name,
    ...(species?.tags || []),
    ...(species?.abilities || []),
    species?.description,
    species?.specialQualities,
    species?.traits,
    species?.system?.traits,
    species?.system?.description
  ].flat().filter(Boolean).map((entry) => String(entry));

  const skillBiases = {};
  for (const raw of texts) {
    const lower = raw.toLowerCase();
    if (/underwater|aquatic|swim speed|expert swimmer|swimming|breathe underwater/.test(lower)) {
      addWeight(skillBiases, 'swim', 3.0, 'Species makes aquatic movement more practical');
      tags.add('aquatic');
      tags.add('swim');
    }
    if (/low-light vision|darkvision|keen senses|acute senses|perception/.test(lower)) {
      addWeight(skillBiases, 'perception', 1.5, 'Species traits reinforce battlefield awareness');
      tags.add('perception');
    }
    if (/stealth|camouflage|silent/.test(lower)) {
      addWeight(skillBiases, 'stealth', 1.5, 'Species traits support stealth play');
      tags.add('stealth');
    }
    if (/mechanic|technolog|shipwright|engineer|computer/.test(lower)) {
      addWeight(skillBiases, 'mechanics', 1.25, 'Species traits support technical skills');
      addWeight(skillBiases, 'useComputer', 1.0, 'Species traits support technical skills');
      tags.add('tech');
    }
    if (/pilot|fly|vehicle/.test(lower)) {
      addWeight(skillBiases, 'pilot', 1.25, 'Species traits support vehicle handling');
      tags.add('pilot');
    }
    if (/force|mystic|intuition/.test(lower)) {
      addWeight(skillBiases, 'useTheForce', 1.25, 'Species traits support Force attunement');
      tags.add('force');
    }
  }

  const rawSkillBonuses = {
    ...(species?.skillBonuses || {}),
    ...(species?.system?.skillBonuses || {}),
    ...(species?.bonuses?.skills || {}),
    ...(species?.system?.bonuses?.skills || {})
  };
  for (const [rawKey, value] of Object.entries(rawSkillBonuses)) {
    const key = canonicalizeSkillKey(rawKey);
    const num = Number(value || 0);
    if (!key || !Number.isFinite(num) || num == 0) continue;
    addWeight(skillBiases, key, Math.max(0.75, num / 2), 'Species provides a direct bonus here');
  }

  return { tags: Array.from(tags), skillBiases };
}

function computeAbilityWeight(score) {
  if (score <= 6) return -4.5;
  if (score <= 8) return -2.75;
  if (score <= 10) return -1.0;
  if (score <= 12) return 0.0;
  if (score <= 14) return 1.25;
  if (score <= 16) return 2.5;
  if (score <= 18) return 3.5;
  return 4.0;
}

function scoreToTier(score) {
  if (score >= 8.5) return LEVEL1_SKILL_TIERS.CORE_SYNERGY;
  if (score >= 5.0) return LEVEL1_SKILL_TIERS.ATTRIBUTE_MATCH;
  if (score >= 2.5) return LEVEL1_SKILL_TIERS.CLASS_SKILL;
  return LEVEL1_SKILL_TIERS.AVAILABLE;
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
      const classSkills = canonicalSkillList(pendingData?.classSkills || []);
      const mentorBiases = getMentorBiases(actor, pendingData);
      const skillBiasWeights = mentorBiases?.skillBiasWeights || {};
      const prestigeTargets = new Set(getPrestigeTargets({ mentorBiases }));
      const classProfile = getCoreClassSkillProfile(pendingData?.selectedClass || actor?.system?.details?.class || null);
      const intentTags = extractIntentTags(pendingData, mentorBiases);
      const backgroundSignals = extractBackgroundSignals(pendingData);
      const speciesSignals = extractSpeciesSignals(pendingData);
      const profileBiasSkills = new Set(collectProfileBiasSkills(classProfile, [
        ...intentTags,
        ...backgroundSignals.tags,
        ...speciesSignals.tags
      ]));
      const lockedSkills = new Set(classProfile?.locked || []);

      const suggestedSkills = availableSkills.map(skill => {
        const normalizedSkill = canonicalizeSkillKey(skill.key || skill.name) || this._normalizeSkillName(skill.key || skill.name);
        const reasons = [];
        let score = 0;

        if (classSkills.includes(normalizedSkill) || classSkills.includes(skill.key)) {
          score += 1.75;
          reasons.push('Class skill for your chosen class');
        }

        if (lockedSkills.has(normalizedSkill)) {
          score += 3.5;
          reasons.push('Foundational early skill for this class');
        } else if (profileBiasSkills.has(normalizedSkill)) {
          score += 2.0;
          reasons.push('Common early fit for this class path');
        }

        const matchingAttr = this._getAttributeForSkill(normalizedSkill);
        if (matchingAttr) {
          const abilityScore = Number(abilityScores?.[matchingAttr] || 10);
          const abilityWeight = computeAbilityWeight(abilityScore);
          score += abilityWeight;
          if (abilityWeight >= 2.0) {
            reasons.push(`Strong ${matchingAttr.toUpperCase()} support`);
          } else if (abilityWeight <= -2.5) {
            reasons.push(`Weak ${matchingAttr.toUpperCase()} makes this harder to leverage`);
          }
        }

        const surveyWeight = Number(skillBiasWeights[normalizedSkill] || 0);
        if (surveyWeight > 0) {
          score += Math.min(2.5, surveyWeight * 0.9);
          reasons.push('Matches your stated interests');
        }

        if (backgroundSignals.skills.includes(normalizedSkill)) {
          score += 2.25;
          reasons.push('Background choice suggests you value this skill');
        }

        const speciesWeight = speciesSignals.skillBiases[normalizedSkill]?.weight || 0;
        if (speciesWeight) {
          score += speciesWeight;
          reasons.push(...(speciesSignals.skillBiases[normalizedSkill]?.reasons || []));
        }

        const prestigeTags = getSkillPrestigeTags(skill.name || skill.key || normalizedSkill);
        const prestigeMatchCount = prestigeTags.filter(tag => prestigeTargets.has(String(tag).replace(/^Prereq_/, ''))).length;
        if (prestigeMatchCount > 0) {
          score += 2.5;
          reasons.push('Advances a declared prestige path');
        }

        const tier = scoreToTier(score);
        const tierMetadata = getTierMetadata(tier);
        const reason = reasons.length > 0 ? Array.from(new Set(reasons)).slice(0, 3).join('; ') : tierMetadata.description;
        return {
          ...skill,
          suggestion: {
            tier,
            score,
            reason,
            icon: tierMetadata.icon,
            color: tierMetadata.color,
            label: tierMetadata.label,
            surveyWeight,
            prestigeMatchCount
          },
          isSuggested: tier >= UNIFIED_TIERS.THEMATIC_FIT
        };
      });

      return suggestedSkills.sort((a, b) => {
        const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
        if (tierDiff !== 0) return tierDiff;
        const scoreDiff = (b.suggestion?.score ?? 0) - (a.suggestion?.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
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
    return getSkillAbility(skillName);
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
