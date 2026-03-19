/**
 * SKILL RESOLVER
 * Resolves skill references from class documents, handling naming variations and data drift.
 *
 * Strategies:
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Fuzzy match (for handling renamed/drift skills)
 * 4. Returns null if no match found
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class SkillResolver {
  /**
   * Resolve a skill name to a skill document
   * @param {string} skillRef - Skill name or ID from class document
   * @param {Array} allSkills - All skill documents available
   * @returns {Object|null} The resolved skill document, or null if not found
   */
  static resolve(skillRef, allSkills) {
    if (!skillRef || !allSkills || allSkills.length === 0) {
      return null;
    }

    // 1. Try exact match by name
    let match = allSkills.find(s => s.name === skillRef);
    if (match) {
      return match;
    }

    // 2. Try case-insensitive match
    const lower = String(skillRef).toLowerCase().trim();
    match = allSkills.find(s => s.name.toLowerCase() === lower);
    if (match) {
      SWSELogger.log(`[SkillResolver] Fuzzy match found: "${skillRef}" → "${match.name}"`);
      return match;
    }

    // 3. Try partial match (skill name contains the reference)
    match = allSkills.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()));
    if (match) {
      SWSELogger.log(`[SkillResolver] Partial match found: "${skillRef}" → "${match.name}"`);
      return match;
    }

    // 4. No match found
    SWSELogger.warn(`[SkillResolver] Could not resolve skill: "${skillRef}"`);
    return null;
  }

  /**
   * Validate class skills against available skills
   * @param {Array} classSkills - Array of skill references from class document
   * @param {Array} allSkills - All available skill documents
   * @returns {Object} { valid: Array<string>, invalid: Array<string> }
   */
  static validateClassSkills(classSkills, allSkills) {
    if (!Array.isArray(classSkills)) {
      return { valid: [], invalid: [] };
    }

    const valid = [];
    const invalid = [];

    for (const skillRef of classSkills) {
      const resolved = this.resolve(skillRef, allSkills);
      if (resolved) {
        valid.push(resolved.name);
      } else {
        invalid.push(skillRef);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get all skill names for validation
   * @param {Array} allSkills - All skill documents
   * @returns {Array<string>} Array of skill names
   */
  static getAllSkillNames(allSkills) {
    if (!Array.isArray(allSkills)) {
      return [];
    }
    return allSkills.map(s => s.name);
  }

  /**
   * Create a fuzzy match score (0-1) between two strings
   * @private
   */
  static _fuzzyScore(a, b) {
    const aLower = String(a).toLowerCase().trim();
    const bLower = String(b).toLowerCase().trim();

    if (aLower === bLower) return 1.0;

    // Count matching characters
    let matches = 0;
    for (const char of aLower) {
      if (bLower.includes(char)) matches++;
    }

    return matches / Math.max(aLower.length, bLower.length);
  }
}

export default SkillResolver;
