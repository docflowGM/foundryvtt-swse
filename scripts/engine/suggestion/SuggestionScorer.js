/**
 * SuggestionScorer — Phase 6: 3-Horizon Implementation
 *
 * STRATEGIC FORESIGHT ARCHITECTURE
 * ═════════════════════════════════════════════════════════════════
 *
 * Implements the finalized 3-Horizon Foresight Model:
 * - Horizon 1 (Immediate): Current state synergy, identity-weighted (60%)
 * - Horizon 2 (Short-Term): Proximity & breakpoints within +1 to +3 levels (25%)
 * - Horizon 3 (Identity Projection): Non-punitive trajectory alignment (15%)
 *
 * Formula: FINAL_SCORE = (Immediate × 0.6) + (ShortTerm × 0.25) + (Identity × 0.15) + ConditionalBonus
 *
 * Signals Evaluated: 125+ mechanical signals via IdentityEngine weighting
 * Authority Boundaries: IdentityEngine, BuildIntent, PrestigeAffinityEngine all read-only
 * Performance: <1ms per option, <100ms batch ceiling
 * Determinism: 5-tier tie-breaking (score → immediate → short-term → identity → alphabetical)
 *
 * ═════════════════════════════════════════════════════════════════
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { projectBAB } from "/systems/foundryvtt-swse/scripts/engine/suggestion/prestige-delay-calculator.js";
import { generateAdvisory } from "/systems/foundryvtt-swse/scripts/engine/suggestion/AdvisoryEngine.js";
import { ChainRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/chain-registry.js";
import { calculateMentorBias, applyMentorBias } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-bias.js";
import { getMentorForClass } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";

// ─────────────────────────────────────────────────────────────────
// DEBUG MODE CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const DEBUG_MODE = () => {
  try {
    return game?.settings?.get?.('foundryvtt-swse', 'debug-suggestion-scoring') || false;
  } catch {
    return false; // Graceful fallback if settings unavailable
  }
};

// ─────────────────────────────────────────────────────────────────
// STATIC CACHES (Precomputed at Boot)
// ─────────────────────────────────────────────────────────────────

const BAB_NONHEROIC = [0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15];
const BAB_BREAKPOINTS = { 7: true, 12: true };
const FEAT_PATTERN_CACHE = {};

/**
 * Normalize identity bias to 0-1 range
 * IdentityEngine values are additive, unbounded (can exceed 1.0 from stacked layers)
 * @param {number} rawBias - Raw bias value from IdentityEngine
 * @param {number} maxValue - Normalization ceiling (default 2.0)
 * @returns {number} Normalized 0-1 score
 */
function normalizeMetricScore(rawBias, maxValue = 2.0) {
  return Math.min(Math.max(rawBias, 0) / maxValue, 1.0);
}

/**
 * Get effective tags for a candidate (Phase 2F: Tag Inheritance)
 * Returns allTags if enriched with context, otherwise candidate.tags
 * This ensures tree-inherited tags are used in scoring without breaking compatibility
 * @param {Object} candidate - Candidate item
 * @returns {Array<string>} Array of tags
 */
function getCandidateTags(candidate) {
  // Phase 2F: Use enriched allTags if available (from tag inheritance)
  if (candidate?.context?.allTags) {
    return candidate.context.allTags;
  }
  // Fallback to candidate's own tags for backward compatibility
  return candidate?.tags || candidate?.system?.tags || [];
}

/**
 * Check if candidate has a tag (Phase 2F: Tag Inheritance aware)
 * Uses enriched context if available, falls back to direct tag check
 * @param {Object} candidate - Candidate item
 * @param {string} tag - Tag to check
 * @returns {boolean}
 */
function candidateHasTag(candidate, tag) {
  return getCandidateTags(candidate).includes(tag);
}

/**
 * Main scoring function — 3-Horizon Model
 *
 * @param {Object} candidate - Feat or talent to score
 * @param {Object} actor - Character performing the evaluation
 * @param {Object} buildIntent - BuildIntent analysis (themes, prestige, signals)
 * @param {Object} options - Additional context (identity bias, chargen flag, slotContext, etc.)
 * @returns {Object} {immediateScore, shortTermScore, identityScore, conditionalBonus, finalScore, breakdown}
 */
export function scoreSuggestion(candidate, actor, buildIntent = {}, options = {}) {
  if (!candidate || !actor) {
    return { finalScore: 0, breakdown: {}, reasons: [] };
  }

  // Fallback if buildIntent missing
  buildIntent = buildIntent || { primaryThemes: [], prestigeAffinities: [], priorityPrereqs: [] };

  // Set primaryPrestige if not already set (used by advisory generation)
  if (!buildIntent.primaryPrestige && buildIntent.prestigeAffinities?.length > 0) {
    buildIntent.primaryPrestige = buildIntent.prestigeAffinities[0].className;
  }

  // Get identity bias (authoritative from IdentityEngine)
  let identityBias = options.identityBias || { mechanicalBias: {}, roleBias: {}, attributeBias: {} };

  // Get slot context (Phase 2A: used for domain-aware scoring)
  let slotContext = options.slotContext || null;

  // Extract prestige forecast for class candidates (if available in buildIntent)
  let prestigeForecast = {};
  let riskTags = [];
  if (candidate.type === "class" && buildIntent.prestigeDelays && buildIntent.primaryPrestige) {
    const candidateClassName = candidate.system?.classId || candidate.name;

    if (buildIntent.prestigeDelays.has(buildIntent.primaryPrestige)) {
      const classDelaysMap = buildIntent.prestigeDelays.get(buildIntent.primaryPrestige);
      if (classDelaysMap.has(candidateClassName)) {
        prestigeForecast = classDelaysMap.get(candidateClassName) || {};
        riskTags = prestigeForecast.riskTags || [];
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // HORIZON 1: IMMEDIATE SCORE (Current State Synergy)
  // ─────────────────────────────────────────────────────────────────

  const immediateResult = _computeImmediateScore(
    candidate,
    actor,
    identityBias,
    buildIntent,
    options,
    slotContext
  );

  // ─────────────────────────────────────────────────────────────────
  // HORIZON 2: SHORT-TERM SCORE (Proximity & Breakpoints)
  // ─────────────────────────────────────────────────────────────────

  const shortTermResult = _computeShortTermScore(
    candidate,
    actor,
    buildIntent,
    options
  );

  // ─────────────────────────────────────────────────────────────────
  // HORIZON 3: IDENTITY PROJECTION SCORE (Trajectory & Direction)
  // ─────────────────────────────────────────────────────────────────

  const identityResult = _computeIdentityProjectionScore(
    candidate,
    actor,
    buildIntent,
    identityBias,
    options
  );

  // ─────────────────────────────────────────────────────────────────
  // SPECIES CONDITIONAL OPPORTUNITY BOOST (Chargen Only)
  // ─────────────────────────────────────────────────────────────────

  const conditionalBonus = _computeSpeciesConditionalBonus(candidate, actor, options);

  // ─────────────────────────────────────────────────────────────────
  // FINAL SCORE COMPOSITION
  // ─────────────────────────────────────────────────────────────────

  let finalScore = Math.min(
    1.0,
    (immediateResult.score * 0.60) +
    (shortTermResult.score * 0.25) +
    (identityResult.score * 0.15) +
    conditionalBonus
  );

  // ─────────────────────────────────────────────────────────────────
  // MENTOR BIAS APPLICATION (Phase 2: Path Preference Integration)
  // ─────────────────────────────────────────────────────────────────
  // Apply soft mentor path preference if actor has committed to a path
  // This is a multiplier (not additive) to preserve score relationships

  try {
    const primaryClass = actor?.items?.find?.(i => i.type === 'class')?.name;
    if (primaryClass) {
      // Get mentor for this class (e.g., "Jedi" mentor for "Jedi" class)
      // mentorClass is the mentor key in the MENTORS object
      const mentorData = getMentorForClass(primaryClass);
      if (mentorData && mentorData.name) {
        // Use mentor name (e.g., "Miraj") as the ID for mentor memory lookup
        const mentorId = mentorData.name.toLowerCase();
        const suggestionType = candidate?.type || 'feat';

        const mentorBias = calculateMentorBias(actor, mentorId, suggestionType);

        // Apply bias multiplier to score (soft preference, not lock)
        // Only boost if bias is > 1.0 (committed to a path)
        if (mentorBias.totalBias > 1.0) {
          const biasedScore = applyMentorBias(finalScore, mentorBias, candidate);
          // Cap the boosted score at 1.0 to maintain reasonable relationships
          finalScore = Math.min(1.0, biasedScore);

          if (DEBUG_MODE()) {
            SWSELogger.log(
              `[SuggestionScorer] Applied mentor bias to ${candidate.name}: ` +
              `${finalScore.toFixed(3)} (bias multiplier: ${mentorBias.totalBias.toFixed(2)}x)`
            );
          }
        }
      }
    }
  } catch (err) {
    // Silently fail mentor bias application — errors here should not break suggestion scoring
    if (DEBUG_MODE()) {
      SWSELogger.warn('[SuggestionScorer] Mentor bias calculation failed:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DEBUG INSTRUMENTATION
  // ─────────────────────────────────────────────────────────────────

  let debugPayload = null;
  if (DEBUG_MODE()) {
    debugPayload = _assembleDebugPayload(
      candidate,
      immediateResult,
      shortTermResult,
      identityResult,
      conditionalBonus,
      finalScore
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // ADVISORY GENERATION (Read-only Explanation Layer)
  // ─────────────────────────────────────────────────────────────────

  const advisories = generateAdvisory(candidate, {
    actor,
    horizons: {
      immediate: immediateResult.score,
      shortTerm: shortTermResult.score,
      identity: identityResult.score
    },
    prestigeForecast,
    riskTags,
    buildIntent
  });

  // ─────────────────────────────────────────────────────────────────
  // RETURN STRUCTURED RESULT
  // ─────────────────────────────────────────────────────────────────

  const result = {
    finalScore,
    breakdown: {
      immediate: immediateResult.score,
      shortTerm: shortTermResult.score,
      identity: identityResult.score,
      conditionalBonus
    },
    horizons: {
      immediate: immediateResult,
      shortTerm: shortTermResult,
      identity: identityResult
    },
    advisories,
    reasons: _generateReasons(candidate, immediateResult, shortTermResult, identityResult)
  };

  if (debugPayload) {
    result.debug = debugPayload;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────
// HORIZON 1: IMMEDIATE SCORING
// ─────────────────────────────────────────────────────────────────

/**
 * Evaluate current state synergy (identity-weighted)
 * Considers: Force sync, damage alignment, ability alignment, role alignment, chains, equipment, skills, defense need
 * @param {Object} slotContext - (Optional) Slot context for domain-aware scoring
 */
function _computeImmediateScore(candidate, actor, identityBias, buildIntent, options, slotContext = null) {
  const metrics = {};
  let totalWeight = 0;
  let weightedSum = 0;

  // METRIC 1: Force Synergy
  if (candidateHasTag(candidate, 'force') || candidateHasTag(candidate, 'forcePower')) {
    const forceBias = Math.min(
      identityBias.mechanicalBias.forceSecret || 0,
      identityBias.mechanicalBias.forceDC || 0
    );
    const metricScore = normalizeMetricScore(forceBias);
    metrics.forceSynergy = metricScore;
    totalWeight += 0.15;
    weightedSum += metricScore * 0.15;
  }

  // METRIC 2: Damage Output Alignment
  if (candidateHasTag(candidate, 'damage') || candidateHasTag(candidate, 'combat') || candidateHasTag(candidate, 'weapon')) {
    const damageType = candidate.system?.damageType || 'melee';
    const damageKey = `${damageType}Damage`;
    const damageBias = identityBias.mechanicalBias[damageKey] || 0;
    const metricScore = normalizeMetricScore(damageBias);
    metrics.damageAlignment = metricScore;
    totalWeight += 0.15;
    weightedSum += metricScore * 0.15;
  }

  // METRIC 3: Ability Alignment
  if (candidate.system?.abilityScaling) {
    const scaling = candidate.system.abilityScaling; // 'str', 'dex', etc.
    const abilityScore = actor.system?.abilities?.[scaling]?.value || 10;
    const abilityBias = identityBias.attributeBias[scaling] || 0;
    const abilityModifier = (abilityScore - 10) / 10;
    const combined = (abilityBias + abilityModifier) / 2;
    const metricScore = Math.max(0, Math.min(combined, 1.0));
    metrics.abilityAlignment = metricScore;
    totalWeight += 0.15;
    weightedSum += metricScore * 0.15;
  }

  // METRIC 4: Role/Theme Alignment
  if (buildIntent?.primaryThemes?.length > 0) {
    const themeMatch = buildIntent.primaryThemes.some(t => candidateHasTag(candidate, t));
    let themeBias = 0;
    if (themeMatch) {
      themeBias = Math.max(...buildIntent.primaryThemes.map(t =>
        identityBias.mechanicalBias[t] || 0
      ));
    }
    const metricScore = normalizeMetricScore(themeBias);
    metrics.themeAlignment = metricScore;
    totalWeight += 0.15;
    weightedSum += metricScore * 0.15;
  }

  // METRIC 5: Feat Chain Continuation
  if (_isFeatChainContinuation(candidate, actor)) {
    metrics.chainContinuation = 0.5; // Moderate boost for chain continuation
    totalWeight += 0.15;
    weightedSum += 0.5 * 0.15;
  }

  // METRIC 6: Equipment Affinity (from IdentityEngine)
  if (candidateHasTag(candidate, 'weapon') || candidateHasTag(candidate, 'armor')) {
    const equipBias = identityBias.mechanicalBias.armorMastery ||
                      identityBias.mechanicalBias.weaponMastery || 0;
    const metricScore = normalizeMetricScore(equipBias);
    metrics.equipmentMatch = metricScore;
    totalWeight += 0.10;
    weightedSum += metricScore * 0.10;
  }

  // METRIC 7: Skill Synergy
  if (candidate.system?.prerequisite) {
    // Check if actor has relevant skill trained
    const prereqText = (candidate.system.prerequisite || '').toLowerCase();
    if (prereqText.includes('trained') || prereqText.includes('skill')) {
      const skillBias = identityBias.mechanicalBias.skillUtility || 0;
      const metricScore = normalizeMetricScore(skillBias);
      metrics.skillMatch = metricScore;
      totalWeight += 0.10;
      weightedSum += metricScore * 0.10;
    }
  }

  // METRIC 8: Defense Need (Phase 2C)
  if (candidateHasTag(candidate, 'defense')) {
    const defenseNeed = _computeDefenseNeedBoost(actor);
    if (defenseNeed > 0) {
      metrics.defenseNeed = defenseNeed;
      totalWeight += 0.10;
      weightedSum += defenseNeed * 0.10;
    }
  }

  // Compute final immediate score
  const immediateScore = totalWeight > 0 ? weightedSum / totalWeight : 0.3; // 0.3 baseline

  return {
    score: Math.min(immediateScore, 1.0),
    breakdown: metrics
  };
}

// ─────────────────────────────────────────────────────────────────
// HORIZON 2: SHORT-TERM SCORING
// ─────────────────────────────────────────────────────────────────

/**
 * Evaluate proximity and breakpoints within +1 to +3 levels
 * Considers: BAB breakpoints, feat chain completion, talent tree unlocks, prestige proximity
 */
function _computeShortTermScore(candidate, actor, buildIntent, options) {
  const breakdown = {};
  let shortTermScore = 0;

  const currentLevel = actor.system?.level || 1;
  const currentBAB = actor.system?.bab || 0;

  // FACTOR A: BAB Breakpoint Evaluation
  const babScore = _evaluateBABBreakpoint(candidate, currentBAB, currentLevel);
  if (babScore > 0) {
    breakdown.babBreakpoint = babScore;
    shortTermScore += babScore * 0.35; // Up to 0.35 of short-term
  }

  // FACTOR B: Feat Chain Completion (within +3 levels)
  const chainScore = _evaluateChainCompletion(candidate, actor, currentLevel);
  if (chainScore > 0) {
    breakdown.chainCompletion = chainScore;
    shortTermScore += chainScore * 0.25; // Up to 0.25 of short-term
  }

  // FACTOR C: Talent Tree Unlock (within +3 levels)
  const treeScore = _evaluateTalentTreeUnlock(candidate, actor, currentLevel);
  if (treeScore > 0) {
    breakdown.talentTreeUnlock = treeScore;
    shortTermScore += treeScore * 0.25; // Up to 0.25 of short-term
  }

  // FACTOR D: Prestige Proximity (via PrestigeAffinityEngine, capped at 0.25)
  const prestigeScore = _evaluatePrestigeProximity(candidate, actor, buildIntent, currentLevel);
  if (prestigeScore > 0) {
    breakdown.prestigeProximity = prestigeScore;
    shortTermScore += prestigeScore; // Already capped at 0.25
  }

  // FACTOR E: Equipment Affinity Continuation
  const equipContinScore = _evaluateEquipmentAffinityContinuation(candidate, actor);
  if (equipContinScore > 0) {
    breakdown.equipmentAffinity = equipContinScore;
    shortTermScore += equipContinScore * 0.15; // Up to 0.15 of short-term
  }

  // FACTOR F: Skill Cap Scaling (if skill has breakpoint at +1 to +3 levels)
  const skillCapScore = _evaluateSkillCapScaling(candidate, actor, currentLevel);
  if (skillCapScore > 0) {
    breakdown.skillCapScaling = skillCapScore;
    shortTermScore += skillCapScore * 0.10; // Up to 0.10 of short-term
  }

  return {
    score: Math.min(shortTermScore, 1.0), // Normalize to 0-1
    breakdown
  };
}

// ─────────────────────────────────────────────────────────────────
// HORIZON 3: IDENTITY PROJECTION SCORING
// ─────────────────────────────────────────────────────────────────

/**
 * Evaluate non-punitive trajectory alignment
 * Considers: Theme alignment, archetype consistency, prestige trajectory, identity flexibility
 * NON-PUNITIVE: No negative scoring, always neutral or positive
 */
/**
 * TIER 1 Enhancement: Identity Projection with Affinity + Chain Continuation
 *
 * Locked formula with adjusted caps:
 * - prestigeTrajectory: max 0.18 (was 0.25)
 * - archetypeAffinity: max 0.06 (new signal)
 * - chainContinuation: max 0.06 (new signal)
 * - total cap: 0.25
 *
 * All signals additive, identity-focused (no mechanical distortion)
 */
function _computeIdentityProjectionScore(candidate, actor, buildIntent, identityBias, options = {}) {
  // Ensure identityBias has required structure
  if (!identityBias) {
    identityBias = {
      mechanicalBias: {},
      roleBias: {},
      attributeBias: {}
    };
  }

  // Caps (locked per architecture review)
  const CAP_TOTAL = 0.25;
  const CAP_PRESTIGE = 0.18;
  const CAP_AFFINITY = 0.06;
  const CAP_CHAIN = 0.06;

  let score = 0;
  const breakdown = {};

  // Ensure actor has item ID set for O(1) lookups
  if (actor && !actor._itemIdSet) {
    actor._itemIdSet = new Set(actor.items.map(i => i.id));
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNAL 1: Prestige Trajectory Reinforcement
  // ─────────────────────────────────────────────────────────────
  const topPrestige = buildIntent?.prestigeAffinities?.[0];
  if (topPrestige?.confidence > 0) {
    const prestige = Math.min(CAP_PRESTIGE, topPrestige.confidence * 0.25);
    breakdown.prestigeTrajectory = prestige;
    score += prestige;
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNAL 2: Archetype Affinity Reinforcement (TIER 1)
  // ─────────────────────────────────────────────────────────────
  if (buildIntent?.primaryArchetypeId && buildIntent?.archetypeAffinityIndex) {
    const affinityEntry = buildIntent.archetypeAffinityIndex.get(candidate.id);

    if (affinityEntry && affinityEntry.confidence > 0.40) {
      const freq = Math.max(1, affinityEntry.archetypeFrequency || 1);
      const maxFreq = Math.max(1, buildIntent.maxArchetypeFrequency || 1);

      // Logarithmic frequency modifier
      const freqModifier = 1 + (Math.log(freq) / Math.log(maxFreq)) * 0.35;

      // Optional: contextual alignment
      const alignment = _computeAffinityAlignment(affinityEntry, identityBias);

      const baseAffinity = affinityEntry.confidence;
      const raw = baseAffinity * freqModifier * alignment;
      const affinityBoost = Math.min(CAP_AFFINITY, raw);

      breakdown.archetypeAffinity = affinityBoost;
      score += affinityBoost;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNAL 3: Chain Continuation Bonus (TIER 1, tier-weighted)
  // ─────────────────────────────────────────────────────────────
  const chainTheme = candidate.system?.chainTheme;
  const parentId = candidate.system?.upgradeOf || null;

  if (chainTheme && parentId && ChainRegistry.isValidTheme(chainTheme)) {
    const actorHasParent = actor?._itemIdSet?.has(parentId) || false;

    if (actorHasParent) {
      const tier = Math.max(1, candidate.system?.chainTier || 1);
      const tierWeight = Math.max(0.25, 1 / tier); // Floor at 0.25

      const themeAffinity = identityBias?.mechanicalBias?.[chainTheme] || 0;

      if (themeAffinity > 0.3) {
        const baseBonus = 0.10;
        const raw = baseBonus * themeAffinity * tierWeight;
        const continuation = Math.min(CAP_CHAIN, raw);

        breakdown.chainContinuation = continuation;
        score += continuation;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNAL 4: Identity Flexibility (existing, simplified)
  // ─────────────────────────────────────────────────────────────
  const flexibilityScore = 0.05; // Modest bonus
  breakdown.identityFlexibility = flexibilityScore;
  score += flexibilityScore;

  // ─────────────────────────────────────────────────────────────
  // FINAL CAP
  // ─────────────────────────────────────────────────────────────
  score = Math.min(CAP_TOTAL, score);

  return {
    score,
    breakdown
  };
}

// ─────────────────────────────────────────────────────────────────
// AFFINITY ALIGNMENT HELPER (contextual weighting)
// ─────────────────────────────────────────────────────────────────

function _computeAffinityAlignment(affinityEntry, identityBias) {
  // Default: neutral alignment
  if (!affinityEntry.roleAffinity) return 1.0;

  const roleBias = identityBias?.roleBias || {};
  let total = 0;
  let weight = 0;

  for (const [role, aff] of Object.entries(affinityEntry.roleAffinity)) {
    const b = roleBias[role] || 0;
    total += aff * b;
    weight += Math.abs(aff);
  }

  if (weight <= 0) return 1.0;

  // Normalize into friendly range, clamp [0.5, 1.25]
  return Math.max(0.5, Math.min(1.25, total / weight));
}

// ─────────────────────────────────────────────────────────────────
// PRESTIGE PROXIMITY EVALUATION (via PrestigeAffinityEngine)
// ─────────────────────────────────────────────────────────────────

function _evaluatePrestigeProximity(candidate, actor, buildIntent, currentLevel) {
  if (!buildIntent?.prestigeAffinities || buildIntent.prestigeAffinities.length === 0) {
    return 0;
  }

  let totalPrestigeScore = 0;

  // Evaluate top 3 prestige paths only
  for (const prestige of buildIntent.prestigeAffinities.slice(0, 3)) {
    // Check if option is in priority prereqs for this prestige
    const isPrereq = buildIntent.priorityPrereqs?.some(p =>
      p.forClass === prestige.className &&
      (p.name === candidate.name || p.name === candidate.system?.name)
    ) || false;

    if (!isPrereq) continue;

    // Calculate distance to prestige eligibility
    const minLevel = prestige.minLevel || 7;
    const distance = minLevel - currentLevel;

    if (distance > 3 || distance < 0) continue; // Outside +1 to +3 window

    // Compute proximity score weighted by prestige confidence
    const proximityScore = (1 - (distance / 3)) * prestige.confidence;
    totalPrestigeScore += proximityScore;
  }

  // ENHANCEMENT: If candidate is a class and we have prestige delay data,
  // use it to refine prestige proximity scoring
  if (candidate.type === "class" && buildIntent.prestigeDelays) {
    const candidateClassName = candidate.system?.classId || candidate.name;

    for (const [prestigeName, classDelaysMap] of buildIntent.prestigeDelays.entries()) {
      const delayData = classDelaysMap.get(candidateClassName);
      if (delayData && delayData.delay <= 3) {
        // Prestige is accessible within +6 levels
        // Bonus for early access (delay 0-1) penalty for later access
        const delayScore = Math.max(0, (3 - delayData.delay) / 3) * 0.15;
        totalPrestigeScore += delayScore;

        // If prestige delay includes BAB breakpoint, additional bonus
        if (delayData.riskTags?.includes("BAB_BREAKPOINT_REACHED")) {
          totalPrestigeScore += 0.1;
        }
      }
    }
  }

  // Hard cap prestige contribution at 0.25 (per contract)
  return Math.min(totalPrestigeScore, 0.25);
}

// ─────────────────────────────────────────────────────────────────
// BAB BREAKPOINT EVALUATION
// ─────────────────────────────────────────────────────────────────

function _evaluateBABBreakpoint(candidate, currentBAB, currentLevel) {
  // Check if option requires specific BAB threshold
  const prereqText = (candidate.system?.prerequisite || '').toLowerCase();

  // Look for "BAB +X" pattern
  const babMatch = prereqText.match(/bab\s*\+?(\d+)/i);
  if (!babMatch) return 0;

  const requiredBAB = parseInt(babMatch[1]);
  const distance = requiredBAB - currentBAB;

  // Only score if within +1 to +3 level window
  if (distance > 3 || distance <= 0) return 0;

  // Score: closer to breakpoint = higher score
  return 1 - (distance / 3);
}

// ─────────────────────────────────────────────────────────────────
// FEAT CHAIN COMPLETION EVALUATION
// ─────────────────────────────────────────────────────────────────

function _evaluateChainCompletion(candidate, actor, currentLevel) {
  if (!_isFeatChainContinuation(candidate, actor)) {
    return 0; // Not part of a chain
  }

  // If already in chain, next link is within +1 level
  return 0.5; // Moderate boost for chain continuation in short-term
}

// ─────────────────────────────────────────────────────────────────
// TALENT TREE UNLOCK EVALUATION
// ─────────────────────────────────────────────────────────────────

function _evaluateTalentTreeUnlock(candidate, actor, currentLevel) {
  const talentTree = candidate.system?.tree || candidate.system?.talent_tree;
  if (!talentTree) return 0;

  // Simplified: if candidate is a talent and actor is building toward prestige, evaluate tree depth
  // Full implementation would check TalentTreeDB for depth within +3 levels
  // For now, return modest bonus if talent supports a prestige path
  return 0.3; // Placeholder for tree unlock
}

// ─────────────────────────────────────────────────────────────────
// EQUIPMENT AFFINITY CONTINUATION EVALUATION
// ─────────────────────────────────────────────────────────────────

function _evaluateEquipmentAffinityContinuation(candidate, actor) {
  if (!candidateHasTag(candidate, 'weapon') && !candidateHasTag(candidate, 'armor')) {
    return 0;
  }

  // Simplified: check if actor already specializes in this equipment category
  // Full implementation would use equipmentAffinityBias from IdentityEngine
  return 0.15; // Placeholder
}

// ─────────────────────────────────────────────────────────────────
// SKILL CAP SCALING EVALUATION
// ─────────────────────────────────────────────────────────────────

function _evaluateSkillCapScaling(candidate, actor, currentLevel) {
  const prereqText = (candidate.system?.prerequisite || '').toLowerCase();

  if (!prereqText.includes('trained') && !prereqText.includes('skill')) {
    return 0;
  }

  // Simplified: skill cap breakpoints vary, but give modest bonus if skill training is benefit
  return 0.10; // Placeholder for skill cap scaling
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Check if candidate is part of an existing feat/talent chain
 */
function _isFeatChainContinuation(candidate, actor) {
  if (!candidateHasTag(candidate, 'feat-chain') && !candidateHasTag(candidate, 'talent-chain')) {
    return false;
  }

  if (candidate.system?.prerequisite) {
    const selectedFeats = (actor.system?.selectedFeats || []).map(f =>
      typeof f === 'string' ? f : f.id
    );
    const selectedTalents = (actor.system?.selectedTalents || []).map(t =>
      typeof t === 'string' ? t : t.id
    );

    const prereqNorm = (candidate.system.prerequisite || '').toLowerCase();
    const hasPrereq = selectedFeats.some(f =>
      (f || '').toLowerCase().includes(prereqNorm)
    ) || selectedTalents.some(t =>
      (t || '').toLowerCase().includes(prereqNorm)
    );

    return hasPrereq;
  }

  return false;
}

/**
 * Generate human-readable reason strings
 */
function _generateReasons(candidate, immediate, shortTerm, identity) {
  const reasons = [];

  if (immediate.breakdown.forceSynergy > 0.3) {
    reasons.push('Strong Force synergy with your build');
  }
  if (immediate.breakdown.damageAlignment > 0.3) {
    reasons.push('Aligns with your damage focus');
  }
  if (immediate.breakdown.themeAlignment > 0.3) {
    reasons.push('Reinforces your primary themes');
  }
  if (immediate.breakdown.chainContinuation > 0) {
    reasons.push('Continues an existing feat/talent chain');
  }
  if (shortTerm.breakdown.babBreakpoint > 0.3) {
    reasons.push('Unlocks a BAB breakpoint within +3 levels');
  }
  if (shortTerm.breakdown.prestigeProximity > 0.1) {
    reasons.push('Supporting your prestige class path');
  }
  if (identity.breakdown.themeAlignment > 0.2) {
    reasons.push('Supports your character trajectory');
  }

  if (reasons.length === 0) {
    reasons.push('Valid option for your build');
  }

  return reasons;
}

// ─────────────────────────────────────────────────────────────────
// DEBUG INSTRUMENTATION
// ─────────────────────────────────────────────────────────────────

function _assembleDebugPayload(candidate, immediate, shortTerm, identity, conditional, final) {
  return {
    optionId: candidate.id || candidate._id,
    optionName: candidate.name,
    horizons: {
      immediate: {
        score: immediate.score,
        breakdown: immediate.breakdown
      },
      shortTerm: {
        score: shortTerm.score,
        breakdown: shortTerm.breakdown
      },
      identity: {
        score: identity.score,
        breakdown: identity.breakdown
      }
    },
    conditionalBonus: conditional,
    finalScore: final,
    sortingData: {
      immediateRank: immediate.score,
      shortTermRank: shortTerm.score,
      identityRank: identity.score,
      alphabetical: candidate.name
    },
    timestamp: Date.now()
  };
}

// ─────────────────────────────────────────────────────────────────
// SPECIES CONDITIONAL OPPORTUNITY BOOST (Chargen Only)
// Preserved from Phase 5 implementation
// ─────────────────────────────────────────────────────────────────

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

    if (trainedSkills[skillId]?.trained === true) {
      return true;
    }

    if (trainedSkills instanceof Set) {
      return trainedSkills.has(skillId);
    }
    if (Array.isArray(trainedSkills)) {
      return trainedSkills.includes(skillId);
    }

    if (trainedSkills[skillId]) {
      return true;
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

  if (Array.isArray(candidate.grantedSkills)) {
    candidate.grantedSkills.forEach(s => granted.add(s));
  }

  if (candidate.system?.grantsBonuses?.skills) {
    Object.keys(candidate.system.grantsBonuses.skills).forEach(skillId => {
      granted.add(skillId);
    });
  }

  return granted;
}

/**
 * Check if an option resolves an unresolved conditional
 * @private
 */
function _doesOptionResolveConditional(candidate, rule) {
  if (rule.when.type === 'skillTrained') {
    const skillId = rule.when.skillId;
    const grantedSkills = _extractGrantedSkills(candidate);
    return grantedSkills.has(skillId);
  }

  if (rule.when.type === 'featTaken') {
    const featId = rule.when.featId;
    return candidate.id === featId || candidate._id === featId;
  }

  return false;
}

/**
 * Compute defense need boost (Phase 2C)
 * Returns boost (0-1) if actor's defenses are below expected baseline
 * @private
 */
function _computeDefenseNeedBoost(actor) {
  if (!actor) return 0;

  const defenses = actor.system?.defenses || {};
  const currentLevel = actor.system?.level || 1;

  // Baseline defensive values expected at this level (rough heuristic)
  // At level 1: baseline ~12, at level 10: baseline ~14, at level 20: baseline ~16
  const baselines = {
    reflex: 12 + Math.floor(currentLevel / 5),
    fortitude: 12 + Math.floor(currentLevel / 5),
    will: 11 + Math.floor(currentLevel / 5)
  };

  // Calculate average defense deficit
  const refDeficit = Math.max(0, (baselines.reflex - (defenses.reflex || 10)) / 10);
  const fortDeficit = Math.max(0, (baselines.fortitude - (defenses.fortitude || 10)) / 10);
  const willDeficit = Math.max(0, (baselines.will - (defenses.will || 9)) / 10);

  const avgDeficit = (refDeficit + fortDeficit + willDeficit) / 3;

  // Return normalized boost (0-1), capped at 0.8 to not overwhelm other metrics
  return Math.min(avgDeficit, 0.8);
}

/**
 * Compute species conditional opportunity bonus (chargen only)
 * @private
 */
function _computeSpeciesConditionalBonus(candidate, actor, options) {
  // Only in chargen context
  if (!_isChargenContext(actor, options)) {
    return 0;
  }

  const unresolved = _getUnresolvedSpeciesConditionals(actor);

  if (unresolved.length === 0) return 0;

  let totalBonus = 0;
  const baseBonus = 0.08;

  for (const rule of unresolved) {
    if (_doesOptionResolveConditional(candidate, rule)) {
      totalBonus += baseBonus;
    }
  }

  return Math.min(totalBonus, 0.12); // Cap at 0.12 per contract
}

// ─────────────────────────────────────────────────────────────────
// BATCH SCORING & SORTING
// ─────────────────────────────────────────────────────────────────

/**
 * Score all candidates and return sorted by deterministic 5-tier cascade
 * Tie-breaking: FinalScore → Immediate → ShortTerm → Identity → Alphabetical
 */
export function scoreAllCandidates(candidates, actor, buildIntent = {}, options = {}) {
  const scored = candidates.map(candidate => {
    const result = scoreSuggestion(candidate, actor, buildIntent, options);
    return {
      ...candidate,
      scoring: result
    };
  });

  // Sort with deterministic 5-tier tie-breaking
  return scored.sort((a, b) => {
    // Tier 1: Final score descending
    if (Math.abs(b.scoring.finalScore - a.scoring.finalScore) > 0.001) {
      return b.scoring.finalScore - a.scoring.finalScore;
    }

    // Tier 2: Immediate score descending
    const aImmediate = a.scoring.horizons.immediate.score;
    const bImmediate = b.scoring.horizons.immediate.score;
    if (Math.abs(bImmediate - aImmediate) > 0.001) {
      return bImmediate - aImmediate;
    }

    // Tier 3: Short-term score descending
    const aShortTerm = a.scoring.horizons.shortTerm.score;
    const bShortTerm = b.scoring.horizons.shortTerm.score;
    if (Math.abs(bShortTerm - aShortTerm) > 0.001) {
      return bShortTerm - aShortTerm;
    }

    // Tier 4: Identity score descending
    const aIdentity = a.scoring.horizons.identity.score;
    const bIdentity = b.scoring.horizons.identity.score;
    if (Math.abs(bIdentity - aIdentity) > 0.001) {
      return bIdentity - aIdentity;
    }

    // Tier 5: Alphabetical
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    return aName.localeCompare(bName);
  });
}

/**
 * Get top N suggestions from scored candidates
 */
export function getTopSuggestions(scoredCandidates, topN = 5) {
  return scoredCandidates.slice(0, topN);
}
