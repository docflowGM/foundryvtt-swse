/**
 * SWSE Wishlist Engine
 * Manages character goals and objectives for feat/talent acquisition
 * Tracks wishlisted items and integrates with suggestion engine
 */

import { SWSELogger } from '../utils/logger.js';
import { PrerequisiteRequirements } from '../progression/feats/prerequisite_engine.js';

export class WishlistEngine {
  /**
   * Add an item (feat or talent) to the character's wishlist
   * @param {Actor} actor - The character actor
   * @param {Object} item - The feat or talent document
   * @param {string} itemType - 'feat' or 'talent'
   * @returns {Promise<boolean>} Success status
   */
  static async addToWishlist(actor, item, itemType = 'feat') {
    try {
      if (!actor || !item) return false;

      const wishlist = this._getWishlist(actor);
      const itemId = item._id || item.id;

      // Check if already wishlisted
      const key = itemType === 'feat' ? 'feats' : 'talents';
      if (wishlist[key].some(w => w.id === itemId)) {
        SWSELogger.warn(`[WISHLIST] ${item.name} already on wishlist`);
        return false;
      }

      // Add to wishlist with metadata
      wishlist[key].push({
        id: itemId,
        name: item.name,
        type: itemType,
        addedAt: new Date().toISOString(),
        progress: 0  // 0-1, how many prerequisites are met
      });

      await actor.setFlag('swse', 'wishlist', wishlist);
      SWSELogger.log(`[WISHLIST] Added "${item.name}" to wishlist`);
      return true;
    } catch (err) {
      SWSELogger.error('[WISHLIST] Failed to add to wishlist:', err);
      return false;
    }
  }

  /**
   * Remove an item from the wishlist
   * @param {Actor} actor - The character actor
   * @param {string} itemId - Item ID
   * @param {string} itemType - 'feat' or 'talent'
   * @returns {Promise<boolean>} Success status
   */
  static async removeFromWishlist(actor, itemId, itemType = 'feat') {
    try {
      const wishlist = this._getWishlist(actor);
      const key = itemType === 'feat' ? 'feats' : 'talents';

      const index = wishlist[key].findIndex(w => w.id === itemId);
      if (index === -1) return false;

      const removed = wishlist[key].splice(index, 1)[0];
      await actor.setFlag('swse', 'wishlist', wishlist);
      SWSELogger.log(`[WISHLIST] Removed "${removed.name}" from wishlist`);
      return true;
    } catch (err) {
      SWSELogger.error('[WISHLIST] Failed to remove from wishlist:', err);
      return false;
    }
  }

  /**
   * Get all wishlisted items for an actor
   * @param {Actor} actor - The character actor
   * @returns {Object} Wishlist object { feats: [], talents: [] }
   */
  static getWishlist(actor) {
    return this._getWishlist(actor);
  }

  /**
   * Check if an item is wishlisted
   * @param {Actor} actor - The character actor
   * @param {string} itemId - Item ID
   * @param {string} itemType - 'feat' or 'talent'
   * @returns {boolean}
   */
  static isWishlisted(actor, itemId, itemType = 'feat') {
    const wishlist = this._getWishlist(actor);
    const key = itemType === 'feat' ? 'feats' : 'talents';
    return wishlist[key].some(w => w.id === itemId);
  }

  /**
   * Analyze prerequisite fulfillment for an item
   * Shows which prerequisites are met and which aren't
   * @param {Actor} actor - The character actor
   * @param {Object} item - Feat or talent document
   * @returns {Object} Prerequisite analysis with fulfilled/unfulfilled breakdown
   */
  static analyzePrerequisiteFulfillment(actor, item) {
    const unmetReqs = PrerequisiteRequirements.getUnmetRequirements(actor, item);
    const allReqs = this._extractAllRequirements(item);

    const analysis = {
      total: allReqs.length,
      fulfilled: [],
      unfulfilled: [],
      fulfillmentPercent: 0,
      isFullyMet: unmetReqs.length === 0
    };

    // Categorize each requirement
    for (const req of allReqs) {
      const isMet = !unmetReqs.some(u => u.toLowerCase().includes(req.toLowerCase()));

      if (isMet) {
        analysis.fulfilled.push(req);
      } else {
        analysis.unfulfilled.push(req);
      }
    }

    // Calculate fulfillment percentage
    if (analysis.total > 0) {
      analysis.fulfillmentPercent = Math.round((analysis.fulfilled.length / analysis.total) * 100);
    }

    return analysis;
  }

  /**
   * Get all prerequisites for an item that are on the wishlist
   * Useful for showing related goals
   * @param {Actor} actor - The character actor
   * @param {Object} item - Feat or talent document
   * @returns {Array} Prerequisites that are wishlisted
   */
  static getWishlistedPrerequisites(actor, item) {
    const wishlist = this._getWishlist(actor);
    const allItems = [...wishlist.feats, ...wishlist.talents];
    const unmetReqs = PrerequisiteRequirements.getUnmetRequirements(actor, item);

    // Extract feat/talent names from unmet requirements
    const prereqNames = unmetReqs
      .filter(req => req.toLowerCase().includes('feat') || req.toLowerCase().includes('talent'))
      .map(req => req.replace(/.*(?:feat|talent)\s+/i, '').trim());

    // Find which prerequisites are wishlisted
    return allItems.filter(w =>
      prereqNames.some(pn => pn.toLowerCase().includes(w.name.toLowerCase()))
    );
  }

  /**
   * Calculate how close a wishlisted item is to being available
   * Returns a "path completion" score
   * @param {Actor} actor - The character actor
   * @param {string} itemId - Item ID
   * @param {string} itemType - 'feat' or 'talent'
   * @param {Object} item - The actual item document
   * @returns {Object} Path analysis with steps and progress
   */
  static analyzePathToWishlist(actor, itemId, itemType, item) {
    const unmetReqs = PrerequisiteRequirements.getUnmetRequirements(actor, item);
    const analysis = this.analyzePrerequisiteFulfillment(actor, item);

    return {
      itemId,
      itemType,
      itemName: item.name,
      stepsRemaining: unmetReqs.length,
      progressPercent: analysis.fulfillmentPercent,
      fulfilledPrereqs: analysis.fulfilled,
      unfulfilledPrereqs: analysis.unfulfilled,
      estimatedLevels: this._estimateLevelsToCompletion(unmetReqs),
      nextMilestones: this._findNextMilestones(unmetReqs, actor)
    };
  }

  /**
   * Get wishlisted items sorted by completion progress
   * Useful for showing "closest to achieving" items
   * @param {Actor} actor - The character actor
   * @param {Array} allItems - All feats or all talents
   * @returns {Array} Sorted wishlisted items with progress
   */
  static getWishlistProgress(actor, allItems = []) {
    const wishlist = this._getWishlist(actor);
    const progress = [];

    // Analyze each wishlisted item
    for (const wishedItem of [...wishlist.feats, ...wishlist.talents]) {
      const item = allItems.find(i => i._id === wishedItem.id || i.id === wishedItem.id);
      if (!item) continue;

      const analysis = this.analyzePrerequisiteFulfillment(actor, item);
      progress.push({
        ...wishedItem,
        fulfillmentPercent: analysis.fulfillmentPercent,
        fulfilled: analysis.fulfilled,
        unfulfilled: analysis.unfulfilled,
        isComplete: analysis.isFullyMet
      });
    }

    // Sort by completion (closest first)
    return progress.sort((a, b) => b.fulfillmentPercent - a.fulfillmentPercent);
  }

  /**
   * Get recommendations to reach a wishlisted item
   * Suggests next steps based on wishlisted item requirements
   * @param {Actor} actor - The character actor
   * @param {Object} item - The wishlisted feat/talent
   * @returns {Array} Ordered recommendations
   */
  static getWishlistRecommendations(actor, item) {
    const unmetReqs = PrerequisiteRequirements.getUnmetRequirements(actor, item);
    const recommendations = [];

    for (const req of unmetReqs) {
      // Feature prerequisites (feats/talents)
      if (req.toLowerCase().includes('feat') || req.toLowerCase().includes('talent')) {
        const featMatch = req.match(/(?:feat|talent)\s+(?:the\s+)?(.+?)(?:\s|$)/i);
        if (featMatch) {
          recommendations.push({
            type: 'feature',
            subType: req.toLowerCase().includes('feat') ? 'feat' : 'talent',
            name: featMatch[1].trim(),
            reason: `Required for: ${item.name}`,
            priority: 'high'
          });
        }
      }

      // Ability requirements
      if (req.includes('Requires') && (req.includes('STR') || req.includes('DEX') || req.includes('CON') ||
          req.includes('INT') || req.includes('WIS') || req.includes('CHA'))) {
        const abilityMatch = req.match(/(\w{3})\s+(\d+)/i);
        if (abilityMatch) {
          recommendations.push({
            type: 'ability',
            ability: abilityMatch[1].toUpperCase(),
            required: parseInt(abilityMatch[2]),
            reason: `Required for: ${item.name}`,
            priority: 'high'
          });
        }
      }

      // BAB requirements
      if (req.includes('BAB')) {
        const babMatch = req.match(/\+(\d+)/);
        if (babMatch) {
          recommendations.push({
            type: 'bab',
            required: parseInt(babMatch[1]),
            reason: `Required for: ${item.name}`,
            priority: 'high'
          });
        }
      }

      // Level requirements
      if (req.includes('Character Level') || req.includes('level')) {
        const levelMatch = req.match(/(\d+)/);
        if (levelMatch) {
          recommendations.push({
            type: 'level',
            required: parseInt(levelMatch[1]),
            reason: `Required for: ${item.name}`,
            priority: 'high'
          });
        }
      }

      // Skill training
      if (req.includes('trained in')) {
        const skillMatch = req.match(/trained in\s+(.+)/i);
        if (skillMatch) {
          recommendations.push({
            type: 'skill',
            skill: skillMatch[1].trim(),
            reason: `Required for: ${item.name}`,
            priority: 'medium'
          });
        }
      }
    }

    return recommendations;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────

  static _getWishlist(actor) {
    const wishlist = actor?.getFlag('swse', 'wishlist');
    return wishlist || { feats: [], talents: [] };
  }

  static _extractAllRequirements(item) {
    const reqs = [];
    const prereq = item.system?.prerequisites || item.system?.prerequisite || '';

    if (typeof prereq === 'string' && prereq.trim()) {
      const parts = prereq.split(/[,;]|(?:\s+and\s+)/i);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed && trimmed !== 'null') {
          reqs.push(trimmed);
        }
      }
    } else if (Array.isArray(prereq)) {
      reqs.push(...prereq.map(p => String(p).trim()).filter(p => p && p !== 'null'));
    }

    return reqs;
  }

  static _estimateLevelsToCompletion(unmetReqs) {
    let levels = 0;

    for (const req of unmetReqs) {
      if (req.includes('BAB')) {
        const match = req.match(/\+(\d+)/);
        if (match) levels = Math.max(levels, Math.ceil(parseInt(match[1]) / 0.75));
      }

      if (req.includes('Character Level')) {
        const match = req.match(/(\d+)/);
        if (match) levels = Math.max(levels, parseInt(match[1]));
      }

      // Assume 1 level for feat/talent/skill prerequisites (can be selected next level-up)
      if ((req.toLowerCase().includes('feat') || req.toLowerCase().includes('talent') ||
           req.toLowerCase().includes('trained')) && !req.includes('BAB') && !req.includes('Level')) {
        levels = Math.max(levels, 1);
      }
    }

    return levels;
  }

  static _findNextMilestones(unmetReqs, actor) {
    const milestones = [];

    // Immediate selections (next level)
    const selections = unmetReqs.filter(r =>
      (r.toLowerCase().includes('feat') || r.toLowerCase().includes('talent') ||
       r.toLowerCase().includes('trained')) &&
      !r.includes('BAB') && !r.includes('Level')
    );
    if (selections.length > 0) {
      milestones.push({
        level: actor.system.level + 1,
        action: 'Select',
        items: selections
      });
    }

    // Level-based milestones
    const levelReqs = unmetReqs.filter(r => r.includes('Character Level'));
    for (const req of levelReqs) {
      const match = req.match(/(\d+)/);
      if (match) {
        milestones.push({
          level: parseInt(match[1]),
          action: 'Reach Level',
          items: [req]
        });
      }
    }

    return milestones;
  }
}

export default WishlistEngine;
