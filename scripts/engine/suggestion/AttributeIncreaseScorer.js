/**
 * Attribute Increase Scorer - Phase 2E
 *
 * Scores and recommends attribute point allocations.
 * Returns scored allocations with mentor-style advisories.
 *
 * Honors immersion principle: No numeric scores shown to player,
 * only ⭐ badges and explanatory reasons.
 */

import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { AttributeIncreaseHandler } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/attribute-increase-handler.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Score attribute increase allocations
 * @param {Object} actor - Actor document
 * @param {Object} buildIntent - Build intent (for identity alignment)
 * @returns {Promise<Array>} Array of scored allocations [{allocation, reasons, isRecommended}]
 */
export async function scoreAttributeAllocations(actor, buildIntent = {}) {
  if (!actor) {
    return [];
  }

  const currentLevel = actor.system?.level || 1;

  // Check if this level qualifies for attribute increase
  if (!AttributeIncreaseHandler.qualifiesForIncrease(currentLevel)) {
    SWSELogger.log(`[AttributeIncreaseScorer] Level ${currentLevel} does not qualify for attribute increase`);
    return [];
  }

  // Get available points
  const heroicLevel = AttributeIncreaseHandler._getHeroicLevel(actor);
  const availablePoints = heroicLevel > 0 ? 2 : 1;

  SWSELogger.log(`[AttributeIncreaseScorer] Scoring allocations: ${availablePoints} points available (heroic: ${heroicLevel > 0})`);

  // Get current ability scores
  // Phase 3A: Canonical path is .base, but support legacy .value for migration
  const abilities = actor.system?.abilities || {};
  const currentScores = {
    str: abilities.str?.base ?? abilities.str?.value ?? 10,
    dex: abilities.dex?.base ?? abilities.dex?.value ?? 10,
    con: abilities.con?.base ?? abilities.con?.value ?? 10,
    int: abilities.int?.base ?? abilities.int?.value ?? 10,
    wis: abilities.wis?.base ?? abilities.wis?.value ?? 10,
    cha: abilities.cha?.base ?? abilities.cha?.value ?? 10
  };

  // Generate allocation candidates
  const candidates = _generateAllocations(availablePoints);

  // Score each allocation
  const scored = [];
  for (const allocation of candidates) {
    const score = await _scoreAllocation(actor, allocation, currentScores, buildIntent);
    if (score) {
      scored.push({
        allocation,
        ...score
      });
    }
  }

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Mark top allocation as recommended (⭐)
  if (scored.length > 0) {
    scored[0].isRecommended = true;
  }

  SWSELogger.log(`[AttributeIncreaseScorer] Scored ${scored.length} allocations`);

  return scored;
}

/**
 * Generate possible allocations for available points
 * @private
 */
function _generateAllocations(availablePoints) {
  const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const allocations = [];

  if (availablePoints === 2) {
    // Option 1: +2 to one ability
    for (const ability of abilities) {
      const alloc = {};
      alloc[ability] = 2;
      allocations.push(alloc);
    }

    // Option 2: +1 to two different abilities
    for (let i = 0; i < abilities.length; i++) {
      for (let j = i + 1; j < abilities.length; j++) {
        const alloc = {};
        alloc[abilities[i]] = 1;
        alloc[abilities[j]] = 1;
        allocations.push(alloc);
      }
    }
  } else if (availablePoints === 1) {
    // Option: +1 to one ability
    for (const ability of abilities) {
      const alloc = {};
      alloc[ability] = 1;
      allocations.push(alloc);
    }
  }

  return allocations;
}

/**
 * Score a single allocation
 * @private
 */
async function _scoreAllocation(actor, allocation, currentScores, buildIntent = {}) {
  let immediateScore = 0;
  let shortTermScore = 0;
  let identityScore = 0;
  const reasons = [];

  // Compute hypothetical ability scores with this allocation
  const hypotheticalScores = { ...currentScores };
  for (const [ability, increase] of Object.entries(allocation)) {
    hypotheticalScores[ability] = (currentScores[ability] || 10) + increase;
  }

  // ─────────────────────────────────────────────────────────────
  // IMMEDIATE: Breakpoint detection
  // ─────────────────────────────────────────────────────────────

  for (const [ability, increase] of Object.entries(allocation)) {
    const oldScore = currentScores[ability];
    const newScore = hypotheticalScores[ability];
    const oldMod = Math.floor((oldScore - 10) / 2);
    const newMod = Math.floor((newScore - 10) / 2);

    if (newMod > oldMod) {
      immediateScore += 0.3; // Breakpoint crossed
      const modChange = newMod - oldMod;
      reasons.push(`${ability.toUpperCase()} modifier: +${modChange} (${oldScore} → ${newScore})`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SHORT TERM: Prerequisite unlocks
  // ─────────────────────────────────────────────────────────────

  try {
    // Create hypothetical actor state for prerequisite checking
    const hypotheticalActor = _createHypotheticalActor(actor, hypotheticalScores);

    // Check for newly unlocked prerequisites
    const unlockedFeats = await _findUnlockedFeats(actor, hypotheticalActor);
    if (unlockedFeats.length > 0) {
      shortTermScore += 0.2;
      reasons.push(`Unlocks: ${unlockedFeats.slice(0, 2).join(', ')}${unlockedFeats.length > 2 ? '...' : ''}`);
    }
  } catch (err) {
    SWSELogger.debug(`[AttributeIncreaseScorer] Prerequisite check failed:`, err);
    // Continue without prerequisite boost
  }

  // ─────────────────────────────────────────────────────────────
  // IDENTITY: Build alignment
  // ─────────────────────────────────────────────────────────────

  if (buildIntent.primaryThemes && buildIntent.primaryThemes.length > 0) {
    identityScore = _getIdentityAlignment(allocation, buildIntent);
    if (identityScore > 0) {
      reasons.push(`Supports build direction (${buildIntent.primaryThemes[0]} focus)`);
    }
  }

  // Final score (0-1)
  const finalScore = Math.min(1.0, immediateScore * 0.6 + shortTermScore * 0.25 + identityScore * 0.15 + 0.05);

  return {
    score: finalScore,
    breakdown: {
      immediate: immediateScore,
      shortTerm: shortTermScore,
      identity: identityScore
    },
    reasons,
    isRecommended: false
  };
}

/**
 * Get identity alignment score for allocation
 * @private
 */
function _getIdentityAlignment(allocation, buildIntent = {}) {
  const themes = buildIntent.primaryThemes || [];
  const abilityThemeMap = {
    str: ['melee', 'combat', 'leadership'],
    dex: ['ranged', 'stealth', 'vehicle'],
    con: ['combat', 'durability'],
    int: ['tech', 'slicing'],
    wis: ['force', 'survival', 'medicine', 'investigation'],
    cha: ['social', 'leadership', 'influence']
  };

  let alignmentScore = 0;
  for (const [ability, increase] of Object.entries(allocation)) {
    const supportedThemes = abilityThemeMap[ability] || [];
    const matches = supportedThemes.filter(t => themes.includes(t));
    if (matches.length > 0) {
      alignmentScore += 0.1 * increase;
    }
  }

  return Math.min(0.25, alignmentScore);
}

/**
 * Create hypothetical actor with modified ability scores
 * @private
 */
function _createHypotheticalActor(actor, hypotheticalScores) {
  // Create a shallow copy with modified abilities
  // Phase 3A: Canonical ability path is .base, not deprecated .value
  const hypothetical = {
    ...actor,
    system: {
      ...actor.system,
      abilities: {
        str: { ...actor.system.abilities.str, base: hypotheticalScores.str },
        dex: { ...actor.system.abilities.dex, base: hypotheticalScores.dex },
        con: { ...actor.system.abilities.con, base: hypotheticalScores.con },
        int: { ...actor.system.abilities.int, base: hypotheticalScores.int },
        wis: { ...actor.system.abilities.wis, base: hypotheticalScores.wis },
        cha: { ...actor.system.abilities.cha, base: hypotheticalScores.cha }
      }
    }
  };

  return hypothetical;
}

/**
 * Find feats that would be unlocked by new ability scores
 * PHASE 2: Uses AbilityEngine for legality evaluation, not direct PrerequisiteChecker
 * @private
 */
async function _findUnlockedFeats(actor, hypotheticalActor) {
  const unlockedFeats = [];

  try {
    // Get all available feats from compendium
    const featPack = game.packs.get('foundryvtt-swse.feats');
    if (!featPack) return [];

    const allFeats = await featPack.getDocuments();

    for (const feat of allFeats) {
      // Check if feat is already owned
      const alreadyOwned = actor.items.some(i => i._id === feat._id || i.name === feat.name);
      if (alreadyOwned) continue;

      // PHASE 2: Check current prerequisite through AbilityEngine authority layer
      if (AbilityEngine.canAcquire(actor, feat)) continue; // Already qualifies

      // PHASE 2: Check hypothetical prerequisite through AbilityEngine authority layer
      if (AbilityEngine.canAcquire(hypotheticalActor, feat)) {
        unlockedFeats.push(feat.name);
      }
    }
  } catch (err) {
    SWSELogger.debug(`[AttributeIncreaseScorer] Error checking feat unlocks:`, err);
  }

  return unlockedFeats;
}

export default {
  scoreAttributeAllocations
};
