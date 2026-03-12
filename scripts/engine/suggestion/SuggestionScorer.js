/**
 * SuggestionScorer
 *
 * Scoring engine for feat/talent suggestions based on:
 * - Tag alignment with archetype preferences
 * - Ability synergy
 * - Feat/talent chain continuation
 * - Mentor bias alignment
 * - Level-based scaling bonuses
 *
 * Replaces tier-based filtering with comprehensive scoring.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BiasTagProjection } from "/systems/foundryvtt-swse/scripts/engine/prestige/bias-tag-projection.js";

/**
 * Score a candidate feat or talent based on multiple factors
 * @param {Object} candidate - Feat or talent object with tags[] array
 * @param {Object} characterSnapshot - Character state (level, class, selectedFeats, selectedTalents, abilities)
 * @param {Object} archetype - Archetype definition with (preferredTags/secondaryTags/avoidTags) OR (mechanicalBias/roleBias/attributeBias)
 * @param {Object} options - Additional scoring options
 * @returns {Object} Scoring breakdown {score, breakdown, reasons}
 */
export function scoreSuggestion(candidate, characterSnapshot, archetype = {}, options = {}) {
  const breakdown = {
    preferredTagMatches: 0,
    secondaryTagMatches: 0,
    avoidTagMatches: 0,
    abilitySynergy: 0,
    chainContinuation: 0,
    mentorBiasAlignment: 0,
    lateGameScaling: 0
  };

  let score = 0;

  // Determine if archetype provides tags or bias fields
  const hasTags = archetype.preferredTags || archetype.secondaryTags || archetype.avoidTags;
  const hasBias = archetype.mechanicalBias || archetype.roleBias || archetype.attributeBias;

  // If archetype uses bias fields instead of tags, project to synthetic tags using BiasTagProjection
  let preferredTags, secondaryTags, avoidTags;

  if (hasBias && !hasTags) {
    // Use BiasTagProjection to convert bias vectors to tags (Phase 2)
    const projected = BiasTagProjection.project({
      mechanicalBias: archetype.mechanicalBias || {},
      roleBias: archetype.roleBias || {},
      attributeBias: archetype.attributeBias || {}
    });
    preferredTags = projected.preferredTags;
    secondaryTags = projected.secondaryTags;
    avoidTags = projected.avoidTags;
  } else {
    preferredTags = archetype.preferredTags || [];
    secondaryTags = archetype.secondaryTags || [];
    avoidTags = archetype.avoidTags || [];
  }

  const candidateTags = candidate.tags || [];

  // ─────────────────────────────────────────────────────────────
  // 1. PREFERRED TAG MATCHING (+5 per tag)
  // ─────────────────────────────────────────────────────────────

  for (const tag of preferredTags) {
    if (candidateTags.includes(tag)) {
      breakdown.preferredTagMatches++;
      score += 5;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SECONDARY TAG MATCHING (+2 per tag)
  // ─────────────────────────────────────────────────────────────

  for (const tag of secondaryTags) {
    if (candidateTags.includes(tag) && !preferredTags.includes(tag)) {
      breakdown.secondaryTagMatches++;
      score += 2;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. AVOID TAG MATCHING (-6 per tag)
  // ─────────────────────────────────────────────────────────────

  for (const tag of avoidTags) {
    if (candidateTags.includes(tag)) {
      breakdown.avoidTagMatches++;
      score -= 6;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ABILITY SYNERGY (+3 for top 2 abilities)
  // ─────────────────────────────────────────────────────────────

  if (options.abilityCheckFn && candidate.abilityScaling) {
    const abilitySynergyBonus = options.abilityCheckFn(candidate, characterSnapshot);
    if (abilitySynergyBonus) {
      breakdown.abilitySynergy = 3;
      score += 3;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. FEAT/TALENT CHAIN CONTINUATION (+4)
  // ─────────────────────────────────────────────────────────────

  if (_isFeatTalentChainContinuation(candidate, characterSnapshot)) {
    breakdown.chainContinuation = 4;
    score += 4;
  }

  // ─────────────────────────────────────────────────────────────
  // 6. MENTOR BIAS ALIGNMENT (+2)
  // ─────────────────────────────────────────────────────────────

  if (_matchesMentorBias(candidate, characterSnapshot)) {
    breakdown.mentorBiasAlignment = 2;
    score += 2;
  }

  // ─────────────────────────────────────────────────────────────
  // 7. LATE-GAME SCALING (+2 at level >= 8)
  // ─────────────────────────────────────────────────────────────

  if (characterSnapshot.level >= 8) {
    if (candidateTags.includes('scaling') || candidateTags.includes('late-game')) {
      breakdown.lateGameScaling = 2;
      score += 2;
    }
  }

  return {
    score,
    breakdown,
    reasons: _generateReasons(candidate, breakdown, archetype)
  };
}

/**
 * Check if candidate is a continuation of existing feat/talent chain
 * @private
 */
function _isFeatTalentChainContinuation(candidate, characterSnapshot) {
  if (!candidate.tags || !candidate.tags.includes('feat-chain') && !candidate.tags.includes('talent-chain')) {
    return false;
  }

  // Check if prerequisites (if any) are already selected
  if (candidate.prerequisite) {
    const selectedFeats = characterSnapshot.selectedFeats || [];
    const selectedTalents = characterSnapshot.selectedTalents || [];

    // Simple check: if prerequisite name appears in selected, it's a chain continuation
    const prereqNorm = (candidate.prerequisite || '').toLowerCase();
    const hasPrereq = selectedFeats.some(f => f.toLowerCase().includes(prereqNorm)) ||
                      selectedTalents.some(t => t.toLowerCase().includes(prereqNorm));

    return hasPrereq;
  }

  return false;
}

/**
 * Check if candidate matches mentor survey biases
 * @private
 */
function _matchesMentorBias(candidate, characterSnapshot) {
  const mentorBiases = characterSnapshot.mentorBiases || {};
  const candidateTags = candidate.tags || [];

  // Check if any candidate tag aligns with mentor biases
  for (const tag of candidateTags) {
    if (mentorBiases[tag]) {
      return true;
    }
  }

  return false;
}

/**
 * Generate human-readable reason strings for scoring breakdown
 * @private
 */
function _generateReasons(candidate, breakdown, archetype) {
  const reasons = [];

  if (breakdown.preferredTagMatches > 0) {
    reasons.push(
      `Matches ${breakdown.preferredTagMatches} preferred tag(s) for ${archetype.name || 'this build'}`
    );
  }

  if (breakdown.secondaryTagMatches > 0) {
    reasons.push(
      `Aligns with ${breakdown.secondaryTagMatches} secondary tag(s)`
    );
  }

  if (breakdown.avoidTagMatches > 0) {
    reasons.push(
      `Contains ${breakdown.avoidTagMatches} avoided tag(s) for this build`
    );
  }

  if (breakdown.abilitySynergy > 0) {
    reasons.push(`Scales well with your top ability scores`);
  }

  if (breakdown.chainContinuation > 0) {
    reasons.push(`Builds on an existing feat/talent you have`);
  }

  if (breakdown.mentorBiasAlignment > 0) {
    reasons.push(`Aligns with your mentor's guidance`);
  }

  if (breakdown.lateGameScaling > 0) {
    reasons.push(`Improves at higher levels, valuable for late-game`);
  }

  return reasons;
}

/**
 * Score all candidates and return sorted by score
 * @param {Array} candidates - Array of feat/talent objects
 * @param {Object} characterSnapshot - Character state
 * @param {Object} archetype - Archetype definition
 * @param {Object} options - Scoring options
 * @returns {Array} Candidates with scores, sorted descending
 */
export function scoreAllCandidates(candidates, characterSnapshot, archetype = {}, options = {}) {
  const scored = candidates.map(candidate => ({
    ...candidate,
    scoring: scoreSuggestion(candidate, characterSnapshot, archetype, options)
  }));

  // Sort by score descending
  return scored.sort((a, b) => b.scoring.score - a.scoring.score);
}

/**
 * Get top N suggestions from scored candidates
 * @param {Array} scoredCandidates - Candidates with scoring data
 * @param {number} topN - Number of top suggestions to return (default 5)
 * @returns {Array} Top N candidates
 */
export function getTopSuggestions(scoredCandidates, topN = 5) {
  return scoredCandidates.slice(0, topN);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5: 3-HORIZON LOOKAHEAD ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute immediate synergy score (Horizon 1)
 *
 * Evaluates current character state only.
 * Metrics weighted by IdentityEngine mechanicalBias.
 *
 * @param {Object} candidate - Feat/talent to evaluate
 * @param {Object} characterSnapshot - Current character state
 * @param {Object} identityBias - From IdentityEngine.computeTotalBias()
 * @returns {number} Immediate score (0-1)
 */
export function computeImmediateScore(candidate, characterSnapshot, identityBias = {}) {
  const mechanicalBias = identityBias.mechanicalBias || {};
  const scores = [];

  // Metric 1: Feat Chain (uses prerequisite match)
  const hasChain = _isChainContinuation(candidate, characterSnapshot) ? 0.2 : 0;
  scores.push(hasChain);

  // Metric 2: BAB Scaling (if BAB-dependent, rate by current BAB)
  let babScaling = 0;
  if (candidate.prerequisite?.includes('BAB')) {
    const currentBAB = characterSnapshot.bab || 0;
    const requiredBAB = parseInt(candidate.prerequisite?.match(/\+(\d+)/)?.[1] || 0);
    if (currentBAB >= requiredBAB) {
      babScaling = Math.min(0.2, (currentBAB - (requiredBAB - 1)) * 0.05);
      babScaling *= (mechanicalBias.melee || 0.5); // Weight by melee bias
    }
  }
  scores.push(babScaling);

  // Metric 3: Defense Impact (if defense tag present)
  const defenseImpact = (candidate.tags?.includes('defense') ||
                         candidate.tags?.includes('ac') ||
                         candidate.tags?.includes('saves')) ? 0.15 : 0;
  scores.push(defenseImpact * (1 + (mechanicalBias.defense || 0) * 0.5));

  // Metric 4: Skill Synergy (uses already-trained skill)
  let skillSynergy = 0;
  if (candidate.skillPrerequisite) {
    const trainedSkills = characterSnapshot.trainedSkills || [];
    const skillKey = candidate.skillPrerequisite.toLowerCase();
    if (trainedSkills.some(s => s.toLowerCase() === skillKey)) {
      skillSynergy = 0.15;
    }
  }
  scores.push(skillSynergy);

  // Metric 5: Force DC (if Force-based ability check)
  let forceDC = 0;
  if (candidate.tags?.includes('force') || candidate.tags?.includes('force-power')) {
    const forceBonus = mechanicalBias.force || 0;
    forceDC = Math.min(0.2, 0.15 + (forceBonus * 0.1));
  }
  scores.push(forceDC);

  // Metric 6: Action Economy (swift/immediate actions valued)
  let actionEconomy = 0;
  if (candidate.actionType === 'swift' || candidate.actionType === 'immediate') {
    actionEconomy = 0.15;
  } else if (candidate.actionType === 'standard') {
    actionEconomy = 0.05;
  }
  scores.push(actionEconomy);

  // Metric 7: Identity Alignment (matches current IdentityEngine bias)
  let identityAlignment = 0;
  if (candidate.tags && candidate.tags.length > 0) {
    // Rate alignment by which bias categories match candidate tags
    const candidateTags = candidate.tags.map(t => t.toLowerCase());
    if ((candidateTags.some(t => t.includes('force')) && mechanicalBias.force > 0.5) ||
        (candidateTags.some(t => t.includes('melee')) && mechanicalBias.melee > 0.5) ||
        (candidateTags.some(t => t.includes('ranged')) && mechanicalBias.ranged > 0.5) ||
        (candidateTags.some(t => t.includes('stealth')) && mechanicalBias.stealth > 0.5)) {
      identityAlignment = 0.25 * (1 + Math.max(...Object.values(mechanicalBias)) * 0.2);
    }
  }
  scores.push(identityAlignment);

  // Average all metrics (no penalties, all 0-1 range)
  const immediateScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(1.0, immediateScore);
}

/**
 * Compute short-term score (Horizon 2)
 *
 * Evaluates breakpoints and progression within +1 to +3 levels.
 * Uses proximity-based scoring (not binary).
 *
 * @param {Object} candidate - Feat/talent to evaluate
 * @param {Object} characterSnapshot - Current character state (includes level)
 * @param {Object} buildIntent - BuildIntent with prestige affinities
 * @returns {number} Short-term score (0-1)
 */
export function computeShortTermScore(candidate, characterSnapshot, buildIntent = {}) {
  const currentLevel = characterSnapshot.level || 1;
  const scores = [];

  // Component 1: Prerequisite Chain Completeness (proximity-based)
  let chainCompletion = 0;
  if (candidate.prerequisite) {
    const prereqNorm = candidate.prerequisite.toLowerCase();
    const selectedFeats = characterSnapshot.selectedFeats || [];
    const selectedTalents = characterSnapshot.selectedTalents || [];

    // Count how many prerequisites are satisfied
    const hasPrereq = selectedFeats.some(f => f.toLowerCase().includes(prereqNorm)) ||
                      selectedTalents.some(t => t.toLowerCase().includes(prereqNorm));

    if (hasPrereq) {
      chainCompletion = 0.25; // +0.25 for chain available soon
    } else {
      // Check if chain would be available within +3 levels (proximity score)
      const levelsAway = 1; // Assume 1 level for simplicity; could be enhanced
      if (levelsAway <= 3) {
        chainCompletion = Math.max(0, 0.2 - (levelsAway * 0.05)); // Decay with distance
      }
    }
  }
  scores.push(chainCompletion);

  // Component 2: Breakpoint Alignment (BAB, ability, level thresholds)
  let breakpointAlignment = 0;
  if (candidate.prerequisite?.includes('BAB')) {
    const currentBAB = characterSnapshot.bab || 0;
    const requiredBAB = parseInt(candidate.prerequisite?.match(/\+(\d+)/)?.[1] || 0);
    const babGap = requiredBAB - currentBAB;

    if (babGap <= 0) {
      breakpointAlignment = 0.15; // Already qualified
    } else if (babGap <= 3) {
      breakpointAlignment = 0.15 * (1 - (babGap / 3) * 0.5); // Proximity score
    }
  }
  scores.push(breakpointAlignment);

  // Component 3: Prestige Prerequisite (is this feat/talent on prestige path?)
  let prestigePrereq = 0;
  const prestigeAffinities = buildIntent.prestigeAffinities || [];

  if (prestigeAffinities.length > 0) {
    const topPrestige = prestigeAffinities[0]; // Highest affinity prestige class

    // Check if candidate appears in top prestige's prerequisite list
    // (This would require prestige data; for now, use simple heuristic)
    if (candidate.tags?.some(tag => topPrestige.className?.toLowerCase().includes(tag))) {
      prestigePrereq = 0.20 * Math.min(1, topPrestige.confidence * 1.5);
    }
  }
  scores.push(prestigePrereq);

  // Component 4: Talent Tree Eligibility (can player reach next tier?)
  let talentTreeEligibility = 0;
  if (candidate.talentTree) {
    const talentTrees = characterSnapshot.talentTrees || {};
    const currentDepth = talentTrees[candidate.talentTree] || 0;

    // If player has invested in tree, this option continues it
    if (currentDepth > 0) {
      talentTreeEligibility = 0.15;
    }
  }
  scores.push(talentTreeEligibility);

  // Average all components
  const shortTermScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(1.0, shortTermScore);
}

/**
 * Compute identity projection score (Horizon 3)
 *
 * Evaluates character trajectory hints based on BuildIntent.
 * Non-punitive: only positive or neutral, never negative.
 *
 * @param {Object} candidate - Feat/talent to evaluate
 * @param {Object} characterSnapshot - Current character state
 * @param {Object} buildIntent - BuildIntent with themes and signals
 * @returns {number} Identity projection score (0-1)
 */
export function computeIdentityProjectionScore(candidate, characterSnapshot, buildIntent = {}) {
  const scores = [];

  // If no BuildIntent, use neutral baseline (0.5)
  if (!buildIntent || Object.keys(buildIntent).length === 0) {
    return 0.5;
  }

  const primaryThemes = buildIntent.primaryThemes || [];
  const themes = buildIntent.themes || {};

  // Component 1: Theme Alignment (candidate theme matches primary themes)
  let themeAlignment = 0;
  const candidateTags = candidate.tags || [];

  if (primaryThemes.length > 0) {
    // Map candidate tags to themes (heuristic)
    const candidateTheme = candidateTags.map(tag => {
      if (tag.toLowerCase().includes('force')) return 'force';
      if (tag.toLowerCase().includes('melee')) return 'melee';
      if (tag.toLowerCase().includes('ranged')) return 'ranged';
      if (tag.toLowerCase().includes('stealth')) return 'stealth';
      if (tag.toLowerCase().includes('social')) return 'social';
      return null;
    }).filter(t => t)[0];

    if (candidateTheme && primaryThemes.includes(candidateTheme)) {
      themeAlignment = 0.15; // +0.15 for theme match
    }
  }
  scores.push(themeAlignment);

  // Component 2: Archetype Consistency (candidate doesn't contradict identity)
  let archetypeConsistency = 0;
  // If candidate is consistent with top theme, bonus
  if (primaryThemes.length > 0) {
    const topTheme = primaryThemes[0];
    const topThemeScore = themes[topTheme] || 0;

    if (topThemeScore > 0.3) {
      // Character has clear identity
      archetypeConsistency = 0.10; // Neutral baseline

      // Only bonus if matches; never penalize divergence
      if (candidateTags.some(tag => tag.toLowerCase().includes(topTheme))) {
        archetypeConsistency += 0.10;
      }
    }
  }
  scores.push(archetypeConsistency);

  // Component 3: Prestige Trajectory (candidate advances likely prestige path)
  let prestigeTrajectory = 0;
  const prestigeAffinities = buildIntent.prestigeAffinities || [];

  if (prestigeAffinities.length > 0) {
    const topPrestige = prestigeAffinities[0];

    // If candidate looks prestige-related, bonus
    if (candidate.tags?.some(tag => topPrestige.className?.toLowerCase().includes(tag))) {
      prestigeTrajectory = 0.15 * Math.min(1, topPrestige.confidence * 1.5);
    }
  }
  scores.push(prestigeTrajectory);

  // Component 4: Identity Flexibility (candidate keeps options open, doesn't lock path)
  let identityFlexibility = 0;
  // Bonus if candidate doesn't require specific future picks
  if (!candidate.prerequisite || candidate.prerequisite.length < 2) {
    identityFlexibility = 0.05; // +0.05 for maintaining flexibility
  }
  scores.push(identityFlexibility);

  // Average all components (all zero or positive, never negative)
  const identityScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(1.0, identityScore);
}

/**
 * Compute final lookahead score (3-horizon blend)
 *
 * FINAL_SCORE = (Immediate × 0.60) + (ShortTerm × 0.25) + (Identity × 0.15)
 *
 * @param {number} immediateScore - Horizon 1 (0-1)
 * @param {number} shortTermScore - Horizon 2 (0-1)
 * @param {number} identityScore - Horizon 3 (0-1)
 * @returns {number} Final lookahead score (0-1)
 */
export function computeLookaheadScore(immediateScore, shortTermScore, identityScore) {
  const lookaheadScore =
    (immediateScore * 0.60) +
    (shortTermScore * 0.25) +
    (identityScore * 0.15);

  return Math.min(1.0, lookaheadScore);
}

/**
 * Select winner between two tied candidates (deterministic tie-breaker)
 *
 * Cascade priority:
 * 1. Higher Immediate Score
 * 2. Higher Short-Term Score
 * 3. Higher Identity Score
 * 4. Alphabetical (stable fallback)
 *
 * @param {Object} candidateA - First candidate with horizon scores
 * @param {Object} candidateB - Second candidate with horizon scores
 * @returns {number} -1 if A wins, +1 if B wins, 0 if true tie
 */
export function selectTieBreaker(candidateA, candidateB) {
  // Extract horizon scores (if available)
  const aImmediate = candidateA.lookahead?.immediateScore || 0;
  const bImmediate = candidateB.lookahead?.immediateScore || 0;

  if (aImmediate !== bImmediate) {
    return aImmediate > bImmediate ? -1 : 1;
  }

  // Tie on Immediate, check Short-Term
  const aShortTerm = candidateA.lookahead?.shortTermScore || 0;
  const bShortTerm = candidateB.lookahead?.shortTermScore || 0;

  if (aShortTerm !== bShortTerm) {
    return aShortTerm > bShortTerm ? -1 : 1;
  }

  // Tie on Short-Term, check Identity
  const aIdentity = candidateA.lookahead?.identityScore || 0;
  const bIdentity = candidateB.lookahead?.identityScore || 0;

  if (aIdentity !== bIdentity) {
    return aIdentity > bIdentity ? -1 : 1;
  }

  // Complete tie, use alphabetical
  const aName = candidateA.name || '';
  const bName = candidateB.name || '';

  return aName.localeCompare(bName);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARGEN CONDITIONAL OPPORTUNITY BOOST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if we're in character generation context
 *
 * Returns true if:
 * - Actor level is 1, OR
 * - System flag indicates chargen mode, OR
 * - Context parameter explicitly passed as "chargen"
 *
 * @param {Object} actor - Actor object
 * @param {string} context - Optional context string ("chargen" or other)
 * @returns {boolean} True if in chargen mode
 */
export function isChargenContext(actor, context) {
  // Explicit context override
  if (context === 'chargen') {
    return true;
  }

  // Check actor level
  if (actor?.system?.details?.level === 1) {
    return true;
  }

  // Check system flag
  if (actor?.flags?.['foundryvtt-swse']?.chargenMode === true) {
    return true;
  }

  return false;
}

/**
 * Get unresolved species conditional feat grants
 *
 * Scans actor.system.species.bonusFeats for conditional rules
 * that are not yet satisfied.
 *
 * Returns array of {rule, bonusFeat} objects where condition
 * is not yet met by selected feats/skills.
 *
 * @param {Object} actor - Actor object
 * @returns {Array} Unresolved conditional rules
 */
export function getUnresolvedSpeciesConditionals(actor) {
  const unresolved = [];

  // No species = no conditionals
  if (!actor?.system?.species) {
    return unresolved;
  }

  const bonusFeats = actor.system.species.bonusFeats || [];
  const selectedFeats = (actor.system.traits?.selectedFeats || []).map(f => f.toLowerCase());
  const trainedSkills = (actor.system.skills?.trained || []).map(s => s.toLowerCase());

  for (const bonusFeat of bonusFeats) {
    const rules = bonusFeat.rules || [];

    for (const rule of rules) {
      // Only process feat grants with conditions
      if (rule.type !== 'featGrant' || !rule.when) {
        continue;
      }

      // Check if condition is satisfied
      let conditionMet = false;

      if (rule.when.type === 'skillTrained') {
        const skillId = (rule.when.skillId || '').toLowerCase();
        conditionMet = skillId && trainedSkills.some(s => s.includes(skillId));
      } else if (rule.when.type === 'featTaken') {
        const featId = (rule.when.featId || '').toLowerCase();
        conditionMet = featId && selectedFeats.some(f => f.includes(featId));
      }

      // Add to unresolved if condition not met
      if (!conditionMet) {
        unresolved.push({
          rule,
          bonusFeat,
          conditionType: rule.when.type
        });
      }
    }
  }

  return unresolved;
}

/**
 * Determine if an option resolves a specific conditional rule
 *
 * Checks if the option grants the skill or feat required
 * by the conditional rule's "when" clause.
 *
 * @param {Object} option - Feat/talent/skill option
 * @param {Object} conditionalRule - Rule object with .when field
 * @returns {boolean} True if option satisfies the condition
 */
export function doesOptionResolveConditional(option, conditionalRule) {
  if (!option || !conditionalRule?.when) {
    return false;
  }

  const whenCondition = conditionalRule.when;

  // Case 1: Skill training conditional
  if (whenCondition.type === 'skillTrained') {
    const requiredSkillId = (whenCondition.skillId || '').toLowerCase();
    if (!requiredSkillId) return false;

    // Check if option grants this skill
    const optionGrantsSkill =
      (option.skillGranted || '').toLowerCase().includes(requiredSkillId) ||
      (option.grantedSkill || '').toLowerCase().includes(requiredSkillId) ||
      (option.skillId || '').toLowerCase().includes(requiredSkillId);

    return optionGrantsSkill;
  }

  // Case 2: Feat taken conditional
  if (whenCondition.type === 'featTaken') {
    const requiredFeatId = (whenCondition.featId || '').toLowerCase();
    if (!requiredFeatId) return false;

    // Check if option is this feat
    const optionIsFeat =
      (option.id || '').toLowerCase().includes(requiredFeatId) ||
      (option.name || '').toLowerCase().includes(requiredFeatId) ||
      (option.featId || '').toLowerCase().includes(requiredFeatId);

    return optionIsFeat;
  }

  return false;
}

/**
 * Compute species conditional opportunity bonus
 *
 * If in chargen context and actor has unresolved species conditionals,
 * applies a small additive boost to options that resolve them.
 *
 * Boost is additive and capped at 0.12 (respecting Identity horizon weight).
 *
 * @param {Object} option - Feat/talent option
 * @param {Object} actor - Actor object
 * @param {string} context - Optional context ("chargen" or other)
 * @returns {number} Bonus (0 if not applicable, max 0.12)
 */
export function computeSpeciesConditionalBonus(option, actor, context) {
  // Not chargen = no bonus
  if (!isChargenContext(actor, context)) {
    return 0;
  }

  // Get unresolved conditionals
  const unresolvedConditionals = getUnresolvedSpeciesConditionals(actor);
  if (unresolvedConditionals.length === 0) {
    return 0;
  }

  // Check how many conditionals this option resolves
  let resolvedCount = 0;
  for (const unconditional of unresolvedConditionals) {
    if (doesOptionResolveConditional(option, unconditional.rule)) {
      resolvedCount++;
    }
  }

  // No resolutions = no bonus
  if (resolvedCount === 0) {
    return 0;
  }

  // Base boost per conditional: 0.08
  // Multiple conditionals: sum but cap at 0.12
  const baseBonus = 0.08;
  const totalBonus = resolvedCount * baseBonus;

  // Return capped bonus (max 0.12)
  return Math.min(totalBonus, 0.12);
}

/**
 * Apply conditional bonus to final lookahead score
 *
 * Blends 3-horizon lookahead score with conditional opportunity bonus,
 * respecting the 0.12 cap and ensuring final score ≤ 1.0.
 *
 * Formula:
 *   BaseScore = (Immediate × 0.60) + (ShortTerm × 0.25) + (Identity × 0.15)
 *   FinalScore = Math.min(1.0, BaseScore + ConditionalBonus)
 *
 * @param {number} immediateScore - Horizon 1 score (0-1)
 * @param {number} shortTermScore - Horizon 2 score (0-1)
 * @param {number} identityScore - Horizon 3 score (0-1)
 * @param {number} conditionalBonus - Bonus from species conditionals (0-0.12)
 * @returns {number} Final score (0-1)
 */
export function applyConditionalBonusToLookahead(immediateScore, shortTermScore, identityScore, conditionalBonus = 0) {
  const baseScore =
    (immediateScore * 0.60) +
    (shortTermScore * 0.25) +
    (identityScore * 0.15);

  return Math.min(1.0, baseScore + conditionalBonus);
}

/**
 * Compute complete lookahead score with conditional opportunity boost
 *
 * Full orchestration of 3-horizon lookahead + chargen conditional boost.
 * This is the unified entry point for advanced scoring.
 *
 * Returns breakdown with all components for debugging/UI display:
 * {
 *   immediateScore,
 *   shortTermScore,
 *   identityScore,
 *   conditionalBonus,
 *   finalScore,
 *   debug: { ... } (optional, dev mode only)
 * }
 *
 * @param {Object} option - Feat/talent option
 * @param {Object} actor - Actor object
 * @param {Object} characterSnapshot - Character state snapshot
 * @param {Object} identityBias - From IdentityEngine.computeTotalBias()
 * @param {Object} buildIntent - BuildIntent with themes/prestige affinities
 * @param {string} context - Optional context ("chargen" or other)
 * @returns {Object} Complete lookahead scoring breakdown
 */
export function computeCompleteLookaheadScore(
  option,
  actor,
  characterSnapshot,
  identityBias = {},
  buildIntent = {},
  context = null
) {
  // Compute all 3 horizons
  const immediateScore = computeImmediateScore(option, characterSnapshot, identityBias);
  const shortTermScore = computeShortTermScore(option, characterSnapshot, buildIntent);
  const identityScore = computeIdentityProjectionScore(option, characterSnapshot, buildIntent);

  // Compute conditional bonus (chargen-only)
  const conditionalBonus = computeSpeciesConditionalBonus(option, actor, context);

  // Apply bonus to final score
  const finalScore = applyConditionalBonusToLookahead(
    immediateScore,
    shortTermScore,
    identityScore,
    conditionalBonus
  );

  const result = {
    immediateScore,
    shortTermScore,
    identityScore,
    conditionalBonus,
    finalScore
  };

  // Optional debug output (dev mode only)
  if (typeof CONFIG !== 'undefined' && CONFIG.debug === true) {
    result.debug = {
      optionId: option.id || option.name,
      actor: actor?.name || 'unknown',
      isChargen: isChargenContext(actor, context),
      unresolvedConditionals: getUnresolvedSpeciesConditionals(actor).length,
      timestamp: new Date().toISOString()
    };
  }

  return result;
}
