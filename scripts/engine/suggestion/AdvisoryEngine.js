/**
 * Advisory Engine — Phase 7: Explanation Layer
 *
 * Translates mechanical state into player-facing explanations.
 *
 * Architectural Rule:
 * - Read-only interpretation pass
 * - No rule computation
 * - No scoring mutation
 * - No simulation
 * - Only formatting + context interpretation
 *
 * Consumes:
 * - Candidate (feat, talent, class, attribute)
 * - Scoring horizons (immediate, shortTerm, identity)
 * - PrestigeDelayCalculator results (delay, riskTags, projection)
 * - BuildIntent (context for specialization/prestige fit)
 *
 * Returns:
 * {
 *   pros: [string],       // Mechanical advantages
 *   cons: [string],       // Mechanical limitations
 *   identityFit: [string],// Thematic/build alignment
 *   riskLevel: string     // "low" | "medium" | "high"
 * }
 */

export function generateAdvisory(candidate, context) {
  if (!candidate || !context) {
    return {
      pros: [],
      cons: [],
      identityFit: [],
      riskLevel: "low"
    };
  }

  const { horizons = {}, prestigeForecast = {}, riskTags = [], buildIntent = {} } = context;

  const advisories = {
    pros: [],
    cons: [],
    identityFit: [],
    riskLevel: "low"
  };

  // ─────────────────────────────────────────────────────────────────
  // CLASS ADVISORY
  // ─────────────────────────────────────────────────────────────────

  if (candidate.type === "class") {
    // BAB breakpoint advantage
    if (riskTags?.includes("BAB_BREAKPOINT_REACHED")) {
      advisories.pros.push("Reaches BAB breakpoint earlier");
    }

    // Prestige delay (primary prestige target)
    if (buildIntent.primaryPrestige && prestigeForecast?.delay > 0) {
      advisories.cons.push(
        `Delays ${buildIntent.primaryPrestige} entry by ${prestigeForecast.delay} level`
      );
    }

    // Bonus feat or class features
    const bonusFeatLevels = candidate.system?.bonusFeats || [];
    if (bonusFeatLevels.length > 0) {
      advisories.pros.push("Grants bonus feat(s) at early levels");
    }

    // Horizon emphasis: short-term advantage
    if (horizons.shortTerm && horizons.immediate && horizons.shortTerm > horizons.immediate + 0.15) {
      advisories.identityFit.push("Accelerates long-term progression");
    }

    // Horizon emphasis: immediate synergy
    if (horizons.immediate && horizons.immediate > 0.8) {
      advisories.identityFit.push("Strong synergy with current build");
    }

    // Risk level mapping
    if (riskTags?.includes("PRESTIGE_DELAY_MAJOR")) {
      advisories.riskLevel = "high";
    } else if (riskTags?.includes("PRESTIGE_DELAY_MINOR")) {
      advisories.riskLevel = "medium";
    } else {
      advisories.riskLevel = "low";
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // TALENT ADVISORY
  // ─────────────────────────────────────────────────────────────────

  if (candidate.type === "talent") {
    const category = candidate.system?.talentCategory?.toUpperCase();

    // Categorized mechanical effects
    if (category === "OFFENSIVE") {
      advisories.pros.push("Improves damage scaling");
    } else if (category === "DEFENSIVE") {
      advisories.pros.push("Improves survivability");
    } else if (category === "CONTROL") {
      advisories.pros.push("Improves battlefield control");
    } else if (category === "UTILITY") {
      advisories.pros.push("Provides out-of-combat utility");
    }

    // Action economy warning
    if (candidate.system?.actionType === "reaction") {
      advisories.cons.push("Uses reaction (limits other reactions)");
      advisories.riskLevel = "medium";
    }

    // Talent tree prerequisites
    if (riskTags?.includes("PREREQ_CHAIN_INCOMPLETE")) {
      advisories.cons.push("Requires prerequisite talent unlocks");
    }

    // Tree specialization fit
    if (candidate.system?.tree && buildIntent.talentTreeFocus) {
      if (candidate.system.tree === buildIntent.talentTreeFocus) {
        advisories.identityFit.push(`Deepens ${buildIntent.talentTreeFocus} specialization`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // FEAT ADVISORY
  // ─────────────────────────────────────────────────────────────────

  if (candidate.type === "feat") {
    // Prerequisite warning
    if (riskTags?.includes("PREREQ_CHAIN_INCOMPLETE")) {
      advisories.cons.push("Requires additional feat investment");
      advisories.riskLevel = "medium";
    }

    // Equipment requirements
    if (candidate.system?.requiresGear?.length > 0) {
      advisories.cons.push("Requires specific equipment");
    }

    // Feat chain commitment
    if (candidate.system?.chainTheme) {
      advisories.identityFit.push(
        `Commits toward ${candidate.system.chainTheme} specialization`
      );
    }

    // Combat style alignment
    if (candidate.system?.combatStyle && buildIntent.primaryThemes?.length > 0) {
      const styleMatches = buildIntent.primaryThemes.some(
        t => t.toLowerCase().includes(candidate.system.combatStyle.toLowerCase())
      );
      if (styleMatches) {
        advisories.identityFit.push("Reinforces primary combat style");
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // ATTRIBUTE ADVISORY
  // ─────────────────────────────────────────────────────────────────

  if (candidate.type === "attribute") {
    const { current, nextMod, currentMod } = candidate.meta || {};

    // Modifier improvement
    if (nextMod && currentMod && nextMod > currentMod) {
      advisories.pros.push(`Reaches +${nextMod} modifier`);
    } else if (nextMod && currentMod && nextMod === currentMod) {
      advisories.cons.push(`Does not change modifier (+${currentMod})`);
    }

    // Ability-specific benefits
    const attributeName = candidate.system?.name?.toUpperCase();
    if (attributeName === "STRENGTH") {
      advisories.identityFit.push("Improves melee damage and carry capacity");
    } else if (attributeName === "DEXTERITY") {
      advisories.identityFit.push("Improves AC, ranged attacks, and initiative");
    } else if (attributeName === "CONSTITUTION") {
      advisories.identityFit.push("Improves hit points and fortitude saves");
    } else if (attributeName === "INTELLIGENCE") {
      advisories.identityFit.push("Improves skill knowledge and technical ability");
    } else if (attributeName === "WISDOM") {
      advisories.identityFit.push("Improves perception, insight, and Force sensitivity");
    } else if (attributeName === "CHARISMA") {
      advisories.identityFit.push("Improves persuasion and social influence");
    }

    advisories.riskLevel = "low";
  }

  // ─────────────────────────────────────────────────────────────────
  // ENFORCE CAPS (prevent advisory bloat)
  // ─────────────────────────────────────────────────────────────────

  advisories.pros = advisories.pros.slice(0, 3);
  advisories.cons = advisories.cons.slice(0, 3);
  advisories.identityFit = advisories.identityFit.slice(0, 2);

  return advisories;
}

/**
 * Generate advisories for batch of candidates
 *
 * Useful for parallel advisory generation without blocking score computation
 *
 * @param {Array<Object>} candidates - Feat/talent/class/attribute items
 * @param {Object} context - Shared context (horizons, buildIntent, etc.)
 * @returns {Map<string, Object>} Map of candidate.id → advisories
 */
export function generateAdvisoryBatch(candidates, context) {
  const advisoriesMap = new Map();

  for (const candidate of candidates) {
    const candidateId = candidate.id || candidate.name;
    advisoriesMap.set(candidateId, generateAdvisory(candidate, context));
  }

  return advisoriesMap;
}
