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

import { SWSELogger } from '../../utils/logger.js';

/**
 * Score a candidate feat or talent based on multiple factors
 * @param {Object} candidate - Feat or talent object with tags[] array
 * @param {Object} characterSnapshot - Character state (level, class, selectedFeats, selectedTalents, abilities)
 * @param {Object} archetype - Archetype definition with preferredTags, secondaryTags, avoidTags
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

  // ─────────────────────────────────────────────────────────────
  // 1. PREFERRED TAG MATCHING (+5 per tag)
  // ─────────────────────────────────────────────────────────────

  const preferredTags = archetype.preferredTags || [];
  const candidateTags = candidate.tags || [];

  for (const tag of preferredTags) {
    if (candidateTags.includes(tag)) {
      breakdown.preferredTagMatches++;
      score += 5;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SECONDARY TAG MATCHING (+2 per tag)
  // ─────────────────────────────────────────────────────────────

  const secondaryTags = archetype.secondaryTags || [];
  for (const tag of secondaryTags) {
    if (candidateTags.includes(tag) && !preferredTags.includes(tag)) {
      breakdown.secondaryTagMatches++;
      score += 2;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. AVOID TAG MATCHING (-6 per tag)
  // ─────────────────────────────────────────────────────────────

  const avoidTags = archetype.avoidTags || [];
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
