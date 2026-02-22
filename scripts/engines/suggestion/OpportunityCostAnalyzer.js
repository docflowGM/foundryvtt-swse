/**
 * OpportunityCostAnalyzer
 *
 * Identifies hidden costs of choices (prestige delay, locked trees, stat conflicts).
 * Enables regret-prevention warnings without blocking suggestions.
 *
 * Phase 1C: Full implementation with gated prestige delay, attribute conflict, path lockout.
 * Does NOT infer intent. Only warns when cost is credible and anchor is present.
 */

import { SWSELogger } from '../utils/logger.js';
import { PRESTIGE_SIGNALS } from './BuildIntent.js';
import { BuildIdentityAnchor } from './BuildIdentityAnchor.js';

export class OpportunityCostAnalyzer {

  /**
   * Compute opportunity cost of a suggestion
   * Locked Gates: level ≤ 3, no anchor, or prestige intent < 2-of-3 → return 0
   *
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object} { cost: 0-0.3, reasons: [strings] }
   */
  static computeCost(item, actor) {
    try {
      // Phase 1: Exclude powers
      if (item.type === 'power') {
        return { cost: 0, reasons: [] };
      }

      // --- Apply Gating Rules ---

      // Gate 1: Early level silence
      if (actor.system?.level <= 3) {
        return { cost: 0, reasons: [] };
      }

      // Gate 2: No anchor detected
      const anchor = BuildIdentityAnchor.getAnchor(actor, 'primary');
      if (!anchor || !anchor.detected) {
        return { cost: 0, reasons: [] };
      }

      // Gate 3: Prestige intent detection (2-of-3 required)
      const prestigeIntent = this._detectPrestigeIntent(item, actor);
      if (prestigeIntent.signals < 2) {
        // Not enough prestige intent signals - silence on opportunity cost
        return { cost: 0, reasons: [] };
      }

      // --- Calculate Individual Costs ---

      const reasons = [];
      let totalCost = 0;

      // Prestige Delay Cost (primary)
      const prestigeCost = this._checkPrestigeLock(item, actor, prestigeIntent.prestigeClass);
      if (prestigeCost.cost > 0) {
        totalCost += prestigeCost.cost;
        reasons.push(...prestigeCost.reasons);
      }

      // Attribute Conflict Cost
      const attrCost = this._checkAttributeConflict(item, actor);
      if (attrCost.cost > 0) {
        totalCost += attrCost.cost;
        reasons.push(...attrCost.reasons);
      }

      // Path Lockout Cost
      const pathCost = this._checkPathLockout(item, actor);
      if (pathCost.cost > 0) {
        totalCost += pathCost.cost;
        reasons.push(...pathCost.reasons);
      }

      // Cap at 0.3
      const finalCost = Math.min(0.3, totalCost);

      return {
        cost: finalCost,
        reasons: reasons.length > 0 ? reasons : []
      };
    } catch (err) {
      SWSELogger.error('[OpportunityCostAnalyzer] Error computing cost:', err);
      return { cost: 0, reasons: [] };
    }
  }

  /**
   * Detect prestige intent using 2-of-3 signals
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {Object} { signals: 0-3, prestigeClass: string|null }
   */
  static _detectPrestigeIntent(item, actor) {
    try {
      const ownedFeats = new Set(
        actor.items
          .filter(i => i.type === 'feat')
          .map(f => f.name)
      );
      const ownedTalents = new Set(
        actor.items
          .filter(i => i.type === 'talent')
          .map(t => t.system?.tree?.toLowerCase() || t.name.toLowerCase())
      );
      const abilities = actor.system?.attributes || {};

      // Get top 2 abilities
      const abilityScores = [];
      for (const [key, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total || abilityData?.value || 10;
        abilityScores.push({ ability: key.toLowerCase(), score });
      }
      abilityScores.sort((a, b) => b.score - a.score);
      const topAbilities = new Set(abilityScores.slice(0, 2).map(a => a.ability));

      // Check each prestige class against the 3 signals
      let bestMatch = { signals: 0, prestigeClass: null };

      for (const [prestigeName, prestigeData] of Object.entries(PRESTIGE_SIGNALS)) {
        let signalCount = 0;

        // Signal 1: Prereq Progress (has any prerequisite feat)
        const hasPrereqFeat = prestigeData.feats?.some(f => ownedFeats.has(f));
        if (hasPrereqFeat) {signalCount++;}

        // Signal 2: Talent Clustering (has any talent tree from prestige)
        const hasTalentCluster = prestigeData.talentTrees?.some(t =>
          ownedTalents.has(t.toLowerCase())
        );
        if (hasTalentCluster) {signalCount++;}

        // Signal 3: Attribute Alignment (top 2 abilities match prestige abilities)
        const topAbilityMatch = prestigeData.abilities?.some(a =>
          topAbilities.has(a.toLowerCase())
        );
        if (topAbilityMatch) {signalCount++;}

        // Keep the prestige class with strongest signal
        if (signalCount >= 2 && signalCount > bestMatch.signals) {
          bestMatch = { signals: signalCount, prestigeClass: prestigeName };
        }
      }

      return bestMatch;
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error detecting prestige intent:', err);
      return { signals: 0, prestigeClass: null };
    }
  }

  /**
   * Check if suggestion delays prestige class entry
   * Cost: 0.10–0.15 if prestige is near and item doesn't contribute
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @param {string|null} targetPrestige
   * @returns {Object} { cost: 0-0.15, reasons: [] }
   */
  static _checkPrestigeLock(item, actor, targetPrestige) {
    try {
      if (!targetPrestige) {
        return { cost: 0, reasons: [] };
      }

      const prestigeData = PRESTIGE_SIGNALS[targetPrestige];
      if (!prestigeData) {
        return { cost: 0, reasons: [] };
      }

      const itemName = item.name;

      // Check if item contributes to prestige prerequisites
      const contributes =
        prestigeData.feats?.includes(itemName) ||
        prestigeData.talents?.includes(itemName) ||
        (item.type === 'talent' && prestigeData.talentTrees?.some(t =>
          t.toLowerCase() === item.system?.tree?.toLowerCase()
        ));

      if (contributes) {
        // Item advances prestige - no delay cost
        return { cost: 0, reasons: [] };
      }

      // Item doesn't contribute. How close is the actor to prestige?
      // (Simple heuristic: check missing prerequisites)
      const ownedFeats = new Set(
        actor.items.filter(i => i.type === 'feat').map(f => f.name)
      );
      const missingFeatCount = prestigeData.feats?.filter(f => !ownedFeats.has(f)).length || 0;

      // If very few prerequisites remain, this is a delay
      if (missingFeatCount <= 2 && missingFeatCount > 0) {
        return {
          cost: 0.15,
          reasons: [`Delays entry into ${targetPrestige} by requiring non-prerequisite choices`]
        };
      } else if (missingFeatCount > 2) {
        // Prestige still fa-regular away - softer warning
        return {
          cost: 0.08,
          reasons: [`Slightly diverts from ${targetPrestige} path (${missingFeatCount} prereqs remain)`]
        };
      }

      return { cost: 0, reasons: [] };
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error checking prestige lock:', err);
      return { cost: 0, reasons: [] };
    }
  }

  /**
   * Check if suggestion causes attribute conflicts (MAD risk)
   * Cost: 0.04–0.10 based on conflict severity
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {Object} { cost: 0-0.10, reasons: [] }
   */
  static _checkAttributeConflict(item, actor) {
    try {
      // Get item's attribute requirements
      const itemRequiredAttrs = item.system?.requirements?.attributes || [];

      if (!itemRequiredAttrs || itemRequiredAttrs.length === 0) {
        // No attribute requirements - no conflict
        return { cost: 0, reasons: [] };
      }

      // Get actor's ability snapshot (current only)
      const abilities = actor.system?.attributes || {};
      const abilityScores = [];

      for (const [key, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total || abilityData?.value || 10;
        abilityScores.push({
          ability: key.toLowerCase(),
          score: score
        });
      }

      abilityScores.sort((a, b) => b.score - a.score);
      const topAbilities = new Set(abilityScores.slice(0, 3).map(a => a.ability));

      // Check for conflicts
      let conflictCount = 0;
      for (const attr of itemRequiredAttrs) {
        if (!topAbilities.has(attr.toLowerCase())) {
          conflictCount++;
        }
      }

      if (conflictCount === 0) {
        return { cost: 0, reasons: [] };
      }

      // Classify conflict severity
      const dumpStat = abilityScores[abilityScores.length - 1]?.ability;
      const isScalingOnDump = itemRequiredAttrs.some(a =>
        a.toLowerCase() === dumpStat
      );

      if (isScalingOnDump) {
        // Scaling on dump stat = strong conflict
        return {
          cost: 0.10,
          reasons: [`Scales off ${dumpStat.toUpperCase()}, your lowest ability`]
        };
      } else if (conflictCount === itemRequiredAttrs.length) {
        // All requirements outside top 3 = soft conflict
        return {
          cost: 0.06,
          reasons: [`Requires abilities outside your primary focus`]
        };
      } else {
        // Partial conflict
        return {
          cost: 0.04,
          reasons: [`Uses secondary abilities`]
        };
      }
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error checking attribute conflict:', err);
      return { cost: 0, reasons: [] };
    }
  }

  /**
   * Check if suggestion locks out alternative paths
   * Cost: 0.05–0.10 if explicit lockout detected
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {Object} { cost: 0-0.10, reasons: [] }
   */
  static _checkPathLockout(item, actor) {
    try {
      // Check explicit item data first
      const conflicts = item.system?.conflicts || [];
      const exclusiveWith = item.system?.exclusiveWith || [];

      if (conflicts.length > 0 || exclusiveWith.length > 0) {
        // Check if actor already has any conflicting items
        const ownedItems = new Set(actor.items.map(i => i.name));

        const lockedOut = [];
        for (const conflict of conflicts) {
          const conflictName = typeof conflict === 'string' ? conflict : conflict.name;
          if (ownedItems.has(conflictName)) {
            lockedOut.push(conflictName);
          }
        }

        if (lockedOut.length > 0) {
          return {
            cost: 0.10,
            reasons: [`Conflicts with: ${lockedOut.join(', ')}`]
          };
        }
      }

      // Minimal hardcoded rules: mutually exclusive talent trees
      // (This is rare, and should be in compendium data)
      if (item.type === 'talent') {
        const itemTree = item.system?.tree?.toLowerCase();

        // Example: Dark Side and Jedi trees are mutually exclusive
        const mutuallyExclusive = {
          'dark side': ['jedi mind tricks', 'lightsaber combat (jedi)'],
          'jedi mind tricks': ['dark side']
        };

        const exclusions = mutuallyExclusive[itemTree] || [];
        const ownedTalentTrees = new Set(
          actor.items
            .filter(i => i.type === 'talent')
            .map(t => t.system?.tree?.toLowerCase())
        );

        for (const exclusion of exclusions) {
          if (ownedTalentTrees.has(exclusion)) {
            return {
              cost: 0.10,
              reasons: [`Locks out ${exclusion} talent tree`]
            };
          }
        }
      }

      return { cost: 0, reasons: [] };
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error checking path lockout:', err);
      return { cost: 0, reasons: [] };
    }
  }

  /**
   * Check if suggestion delays prestige class entry
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object} { delaysPrestige: boolean, prestigeName: string|null, delayLevels: number }
   */
  static checkPrestigeLock(item, actor) {
    try {
      const result = this._detectPrestigeIntent(item, actor);
      if (result.prestigeClass) {
        const prestigeLock = this._checkPrestigeLock(item, actor, result.prestigeClass);
        return {
          delaysPrestige: prestigeLock.cost > 0,
          prestigeName: result.prestigeClass,
          delayLevels: prestigeLock.cost > 0.12 ? 2 : 1
        };
      }
      return {
        delaysPrestige: false,
        prestigeName: null,
        delayLevels: 0
      };
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error checking prestige lock:', err);
      return { delaysPrestige: false, prestigeName: null, delayLevels: 0 };
    }
  }

  /**
   * Check if suggestion causes stat conflicts
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object} { hasConflict: boolean, conflicts: [{ stat, reason }] }
   */
  static checkStatConflict(item, actor) {
    try {
      const result = this._checkAttributeConflict(item, actor);
      return {
        hasConflict: result.cost > 0,
        conflicts: result.reasons.map(reason => ({
          stat: 'attribute',
          reason: reason
        }))
      };
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error checking stat conflict:', err);
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * Check if suggestion locks out alternative paths
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object} { locksOut: [alternatives], severity: 0-1 }
   */
  static checkPathLockout(item, actor) {
    try {
      const result = this._checkPathLockout(item, actor);
      // Extract alternative names from reasons
      const locksOut = result.reasons.length > 0
        ? result.reasons[0].split(': ')[1]?.split(', ') || []
        : [];
      return {
        locksOut: locksOut,
        severity: result.cost / 0.1 // Normalize to 0-1
      };
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error checking path lockout:', err);
      return { locksOut: [], severity: 0 };
    }
  }

  /**
   * Get human-readable cost warnings
   * @param {Object} costAnalysis - From computeCost()
   * @returns {Array} Array of warning messages
   */
  static getWarningMessages(costAnalysis) {
    try {
      if (!costAnalysis?.reasons || costAnalysis.reasons.length === 0) {
        return [];
      }
      return costAnalysis.reasons;
    } catch (err) {
      SWSELogger.warn('[OpportunityCostAnalyzer] Error getting warning messages:', err);
      return [];
    }
  }
}

export default OpportunityCostAnalyzer;
