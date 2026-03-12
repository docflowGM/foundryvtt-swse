/**
 * SuggestionScorer
 *
 * Scoring engine for feat/talent suggestions based on:
 * - Tag alignment with archetype preferences
 * - Ability synergy
 * - Feat/talent chain continuation
 * - Mentor bias alignment
 * - Level-based scaling bonuses
 * - Species conditional opportunity bonuses (chargen-only)
 *
 * Replaces tier-based filtering with comprehensive scoring.
 *
 * ─────────────────────────────────────────────────────────────────
 * ARCHITECTURAL NOTES & DESIGN DEBT
 * ─────────────────────────────────────────────────────────────────
 *
 * CURRENT STATE:
 * This module implements tag-based scoring with simple additive bonuses.
 * It evaluates ~6 mechanical signals (tags, chains, abilities, mentor, scaling).
 *
 * DESIGN CONTRACT (LOOKAHEAD_ARCHITECTURE_CONTRACT.md):
 * A 3-Horizon model (Immediate/Short-Term/Identity with 0.6/0.25/0.15 weights)
 * has been designed but NOT YET IMPLEMENTED. Current scoring does not follow
 * the 3-Horizon formula.
 *
 * KNOWN LIMITATIONS:
 * 1. Missing mechanical signals: multiattack, defense stacking, action economy,
 *    BAB breakpoints, skill cap scaling, prestige proximity (soft), talent tree depth,
 *    Force synergy (tagged only), equipment affinity
 * 2. Conditional boost assumes feat properties (grantedSkills) that may not exist
 *    on all feat/talent objects - partially mitigated with _extractGrantedSkills()
 * 3. PrestigeAffinityEngine computes affinities but output doesn't influence scoring
 * 4. No explicit Immediate/Short-Term/Identity score normalization
 * 5. Equipment affinity computed in IdentityEngine but never used by SuggestionScorer
 *
 * PHASE 6 PRIORITY:
 * Implement full 3-Horizon model as designed:
 * - Compute Immediate Score (0-1 normalized current synergy)
 * - Compute Short-Term Score (0-1 lookahead to +3 levels)
 * - Compute Identity Score (0-1 trajectory projection)
 * - Apply formula: FINAL = (Immediate × 0.6) + (ShortTerm × 0.25) + (Identity × 0.15)
 * - Integrate PrestigeAffinityEngine output into Short-Term evaluation
 * - Add BAB breakpoint detection, prestige proximity, talent tree analysis
 * - Add equipment affinity signal flow
 *
 * Until 3-Horizon is implemented, this scoring system remains functional but
 * incomplete compared to the architecture specification.
 * ─────────────────────────────────────────────────────────────────
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
    lateGameScaling: 0,
    conditionalBonus: 0
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

  // ─────────────────────────────────────────────────────────────
  // 8. SPECIES CONDITIONAL OPPORTUNITY BOOST (Chargen Only)
  // ─────────────────────────────────────────────────────────────

  const actor = options.actor;
  if (actor && _isChargenContext(actor, options)) {
    const conditionalBonus = _computeSpeciesConditionalBonus(candidate, actor);
    if (conditionalBonus > 0) {
      breakdown.conditionalBonus = conditionalBonus;
      score += conditionalBonus;
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

  if (breakdown.conditionalBonus > 0) {
    reasons.push(`Unlocks a species conditional opportunity`);
  }

  return reasons;
}

/**
 * Check if current context is chargen (level 1 or explicit flag)
 * @private
 */
function _isChargenContext(actor, options = {}) {
  if (options.context === 'chargen') return true;
  if (actor.system?.flags?.chargen === true) return true;
  if (actor.system?.level === 1) return true;
  return false;
}

/**
 * Get unresolved species conditional rules
 * @private
 */
function _getUnresolvedSpeciesConditionals(actor) {
  const unresolved = [];
  const species = actor.system?.species;

  if (!species) return unresolved;

  const bonusFeats = species.bonusFeats || [];
  const selectedFeats = (actor.system?.selectedFeats || []).map(f =>
    typeof f === 'string' ? f : f.id
  );
  const trainedSkills = (actor.system?.skills || {});

  for (const bonusFeat of bonusFeats) {
    const rules = bonusFeat.rules || [];

    for (const rule of rules) {
      if (rule.type === 'featGrant' && rule.when) {
        // Check if condition is already satisfied
        const isSatisfied = _isConditionalSatisfied(rule.when, selectedFeats, trainedSkills);
        if (!isSatisfied) {
          unresolved.push(rule);
        }
      }
    }
  }

  return unresolved;
}

/**
 * Check if a conditional rule is already satisfied
 * Handles multiple possible skill encoding paths
 * @private
 */
function _isConditionalSatisfied(whenCondition, selectedFeats, trainedSkills) {
  if (whenCondition.type === 'skillTrained') {
    const skillId = whenCondition.skillId;

    // Path 1: Standard training flag
    if (trainedSkills[skillId]?.trained === true) {
      return true;
    }

    // Path 2: trainedSkills might be a Set or array
    if (trainedSkills instanceof Set) {
      return trainedSkills.has(skillId);
    }
    if (Array.isArray(trainedSkills)) {
      return trainedSkills.includes(skillId);
    }

    // Path 3: Check if skill object exists and has trained property
    if (trainedSkills[skillId]) {
      return true; // If skill exists in trained skills, assume trained
    }

    return false;
  }

  if (whenCondition.type === 'featTaken') {
    const featId = whenCondition.featId;
    return selectedFeats.includes(featId) || selectedFeats.includes(whenCondition.featName);
  }

  return false;
}

/**
 * Extract skill grants from a feat/talent
 * Handles multiple possible property encodings
 * @private
 */
function _extractGrantedSkills(candidate) {
  const granted = new Set();

  if (!candidate) return granted;

  // Path 1: Direct grantedSkills property (if standardized)
  if (Array.isArray(candidate.grantedSkills)) {
    candidate.grantedSkills.forEach(s => granted.add(s));
  }

  // Path 2: grantsBonuses.skills structure
  if (candidate.system?.grantsBonuses?.skills) {
    Object.keys(candidate.system.grantsBonuses.skills).forEach(skillId => {
      granted.add(skillId);
    });
  }

  // Path 3: system.benefit text parsing (fallback only, minimal extraction)
  // Search for "training" or "trained" keywords to find skill references
  const benefit = candidate.system?.benefit || '';
  if (benefit.toLowerCase().includes('training') || benefit.toLowerCase().includes('trained')) {
    // This is a soft heuristic only - real skill grants use structured properties
    // Do not use this alone; it's a last-resort fallback
  }

  return granted;
}

/**
 * Check if an option resolves an unresolved conditional
 * @private
 */
function _doesOptionResolveConditional(candidate, rule) {
  if (rule.when.type === 'skillTrained') {
    // Check if candidate grants training in the required skill
    const skillId = rule.when.skillId;
    const grantedSkills = _extractGrantedSkills(candidate);
    return grantedSkills.has(skillId);
  }

  if (rule.when.type === 'featTaken') {
    // Check if candidate IS the required feat
    const featId = rule.when.featId;
    return candidate.id === featId || candidate._id === featId;
  }

  return false;
}

/**
 * Compute species conditional opportunity bonus (chargen only)
 * @private
 */
function _computeSpeciesConditionalBonus(candidate, actor) {
  const unresolved = _getUnresolvedSpeciesConditionals(actor);

  if (unresolved.length === 0) return 0;

  let totalBonus = 0;
  const baseBonus = 0.08;

  for (const rule of unresolved) {
    if (_doesOptionResolveConditional(candidate, rule)) {
      totalBonus += baseBonus;
    }
  }

  // Cap at 0.12 per contract
  return Math.min(totalBonus, 0.12);
}

/**
 * Score all candidates and return sorted by score
 * Tie-breaking: score → source priority → alphabetical name
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

  // Sort: score descending, then by source priority, then alphabetically
  return scored.sort((a, b) => {
    // Primary: score descending
    if (b.scoring.score !== a.scoring.score) {
      return b.scoring.score - a.scoring.score;
    }

    // Secondary: source priority (class feat > general feat > prestige)
    const sourceOrder = { 'class': 0, 'general': 1, 'prestige': 2, '': 3 };
    const aSourcePriority = sourceOrder[a.system?.source] ?? 99;
    const bSourcePriority = sourceOrder[b.system?.source] ?? 99;
    if (aSourcePriority !== bSourcePriority) {
      return aSourcePriority - bSourcePriority;
    }

    // Tertiary: alphabetical by name
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    return aName.localeCompare(bName);
  });
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
