/**
 * Force Enhancement Detector
 * Detects applicable Force Techniques and Force Secrets that can enhance a Force Power
 */

export class ForceEnhancementDetector {

  /**
   * Detect all applicable enhancements for a force power
   * @param {Actor} actor - The actor using the power
   * @param {Item} power - The force power being used
   * @returns {Object} Object containing applicable techniques and secrets
   */
  static detectEnhancements(actor, power) {
    if (!actor || !power) return { techniques: [], secrets: [] };

    const techniques = this._findApplicableTechniques(actor, power);
    const secrets = this._findApplicableSecrets(actor, power);

    return { techniques, secrets };
  }

  /**
   * Find force techniques that relate to the power
   * @param {Actor} actor
   * @param {Item} power
   * @returns {Array} Array of applicable technique items
   * @private
   */
  static _findApplicableTechniques(actor, power) {
    // Get all force techniques owned by the actor
    const techniques = actor.items.filter(i =>
      i.type === "feat" &&
      i.system.tags?.includes("force-technique")
    );

    // Filter techniques that relate to this power
    return techniques.filter(tech => {
      const relatedPower = tech.system.relatedPower;
      if (!relatedPower) return false;

      // Check if the technique's related power matches the power name
      return this._namesMatch(relatedPower, power.name);
    });
  }

  /**
   * Find force secrets applicable to the power
   * @param {Actor} actor
   * @param {Item} power
   * @returns {Array} Array of applicable secret items
   * @private
   */
  static _findApplicableSecrets(actor, power) {
    // Get all force secrets owned by the actor
    const secrets = actor.items.filter(i =>
      i.type === "feat" &&
      i.system.tags?.includes("force-secret")
    );

    // Filter secrets based on power properties
    return secrets.filter(secret => {
      return this._secretApplicable(secret, power, actor);
    });
  }

  /**
   * Check if a force secret can be applied to a power
   * @param {Item} secret - The force secret
   * @param {Item} power - The force power
   * @param {Actor} actor - The actor
   * @returns {boolean}
   * @private
   */
  static _secretApplicable(secret, power, actor) {
    const secretName = secret.name;
    const powerDesc = power.system.description || "";
    const powerEffect = power.system.effect || "";
    const combinedDesc = `${powerDesc} ${powerEffect}`.toLowerCase();

    switch (secretName) {
      case "Devastating Power":
        // Applicable to any power that deals damage
        return this._powerDealsDamage(power);

      case "Distant Power":
        // Applicable to powers with numeric range
        return this._powerHasNumericRange(power);

      case "Multitarget Power":
        // Applicable to single-target powers
        return this._powerIsSingleTarget(power);

      case "Quicken Power":
        // Applicable to powers requiring Standard or Move Action
        return this._powerRequiresStandardOrMove(power);

      case "Shaped Power":
        // Applicable to powers with Cone area effect
        return this._powerHasConeEffect(power);

      case "Corrupted Power":
        // Applicable to any power, but requires Dark Side Score >= Wisdom
        const darkSideScore = actor.system.darkSideScore || 0;
        const wisdom = actor.system.attributes?.wisdom?.score || 10;
        const hasLightSideDescriptor = this._powerHasDescriptor(power, "light side");
        return darkSideScore >= wisdom && !hasLightSideDescriptor;

      case "Debilitating Power":
        // Applicable to powers that deal damage
        return this._powerDealsDamage(power);

      case "Enlarged Power":
        // Applicable to powers with area effects (radius or cone)
        return this._powerHasAreaEffect(power);

      case "Pure Power":
        // Applicable to any power, but requires no Dark Side Score
        const actorDarkSide = actor.system.darkSideScore || 0;
        const hasDarkSideDescriptor = this._powerHasDescriptor(power, "dark side");
        return actorDarkSide === 0 && !hasDarkSideDescriptor;

      case "Remote Power":
        // Applicable to powers with Cone, line, or radius that originate from user
        return this._powerHasConeLineOrRadius(power);

      case "Extend Power":
        // Applicable to powers that allow concentration/maintenance
        return this._powerAllowsConcentration(power);

      case "Linked Power":
        // Applicable to any force power
        return true;

      case "Unconditional Power":
        // Applicable to powers that target only the user
        return this._powerTargetsSelf(power);

      case "Holocron Loremaster":
        // Applicable to any force power
        return true;

      case "Mentor":
        // Applicable to any force power
        return true;

      default:
        return false;
    }
  }

  /**
   * Helper methods to analyze power properties
   */

  static _powerDealsDamage(power) {
    const desc = `${power.system.description || ""} ${power.system.effect || ""}`.toLowerCase();
    const hasDC = power.system.dcChart && power.system.dcChart.length > 0;

    // Check for damage keywords
    const damageKeywords = ['damage', 'hit points', 'hp', 'd6', 'd8', 'd10', 'd12'];
    const hasDamageKeyword = damageKeywords.some(keyword => desc.includes(keyword));

    // Check DC chart for damage effects
    const dcChartHasDamage = hasDC && power.system.dcChart.some(tier => {
      const effect = (tier.effect || "").toLowerCase();
      return damageKeywords.some(keyword => effect.includes(keyword));
    });

    return hasDamageKeyword || dcChartHasDamage;
  }

  static _powerHasNumericRange(power) {
    const range = power.system.range;
    if (!range) return false;

    // Check if range contains numbers (like "6 squares", "12 squares")
    return /\d+/.test(range) && range.toLowerCase() !== "personal" && range.toLowerCase() !== "touch";
  }

  static _powerIsSingleTarget(power) {
    const desc = `${power.system.description || ""} ${power.system.effect || ""} ${power.system.targets || ""}`.toLowerCase();

    // Look for single target indicators
    const singleTargetKeywords = ['one target', 'single target', 'the target', 'a target'];
    const hasSingleTarget = singleTargetKeywords.some(keyword => desc.includes(keyword));

    // Exclude area effect powers
    const areaKeywords = ['cone', 'radius', 'burst', 'all targets', 'all enemies', 'all creatures'];
    const hasAreaEffect = areaKeywords.some(keyword => desc.includes(keyword));

    return hasSingleTarget && !hasAreaEffect;
  }

  static _powerRequiresStandardOrMove(power) {
    const time = (power.system.activationTime || power.system.time || "").toLowerCase();
    return time.includes('standard') || time.includes('move action');
  }

  static _powerHasConeEffect(power) {
    const desc = `${power.system.description || ""} ${power.system.effect || ""} ${power.system.area || ""}`.toLowerCase();
    return desc.includes('cone');
  }

  static _powerHasAreaEffect(power) {
    const desc = `${power.system.description || ""} ${power.system.effect || ""} ${power.system.area || ""}`.toLowerCase();
    return desc.includes('cone') || desc.includes('radius') || desc.includes('burst');
  }

  static _powerHasConeLineOrRadius(power) {
    const desc = `${power.system.description || ""} ${power.system.effect || ""} ${power.system.area || ""}`.toLowerCase();
    const hasAreaType = desc.includes('cone') || desc.includes('line') || desc.includes('radius');
    const originatesFromUser = desc.includes('from you') || desc.includes('from your square') || desc.includes('originating from');
    return hasAreaType && (originatesFromUser || !desc.includes('target')); // Assume originates from user if not specified otherwise
  }

  static _powerAllowsConcentration(power) {
    const desc = `${power.system.description || ""} ${power.system.effect || ""} ${power.system.duration || ""}`.toLowerCase();
    return desc.includes('concentration') || desc.includes('maintain') || desc.includes('sustain');
  }

  static _powerTargetsSelf(power) {
    const targets = (power.system.targets || "").toLowerCase();
    const range = (power.system.range || "").toLowerCase();
    const desc = `${power.system.description || ""} ${power.system.effect || ""}`.toLowerCase();

    return range === "personal" ||
           targets === "you" ||
           targets === "self" ||
           (desc.includes('you gain') || desc.includes('you receive')) && !desc.includes('target');
  }

  static _powerHasDescriptor(power, descriptor) {
    const desc = `${power.system.description || ""} ${power.system.descriptor || ""} ${power.system.discipline || ""}`.toLowerCase();
    return desc.includes(descriptor.toLowerCase());
  }

  /**
   * Compare power names (handles variations like "Move Light Object" vs "Move Light Object")
   * @param {string} name1
   * @param {string} name2
   * @returns {boolean}
   * @private
   */
  static _namesMatch(name1, name2) {
    if (!name1 || !name2) return false;

    const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    return normalize(name1) === normalize(name2);
  }

  /**
   * Get a user-friendly description of what an enhancement does
   * @param {Item} enhancement - The technique or secret
   * @returns {string}
   */
  static getEnhancementDescription(enhancement) {
    if (!enhancement) return "";

    const description = enhancement.system.description || "";
    const cost = enhancement.system.cost || "";
    const special = enhancement.system.special || "";
    const alternativeCost = enhancement.system.alternativeCost || "";

    let result = description;

    if (cost) {
      result = `<strong>Cost:</strong> ${cost}<br><br>${result}`;
    }

    if (alternativeCost) {
      result += `<br><br>${alternativeCost}`;
    }

    if (special) {
      result += `<br><br><em>${special}</em>`;
    }

    return result;
  }

  /**
   * Check if the actor has any enhancements for the power
   * @param {Actor} actor
   * @param {Item} power
   * @returns {boolean}
   */
  static hasEnhancements(actor, power) {
    const { techniques, secrets } = this.detectEnhancements(actor, power);
    return techniques.length > 0 || secrets.length > 0;
  }
}
