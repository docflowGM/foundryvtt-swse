/**
 * Holonet Badge Service
 *
 * Resolves visual badge metadata from Holonet records.
 * Maps sourceFamily/intent/category → badge appearance (icon, label, tone, glyph).
 *
 * Usage:
 *   const badge = HolonetBadgeService.getBadge(record);
 *   // Returns: { key, label, icon, glyph, tone, unreadCount }
 */

import { HolonetIntentRegistry } from '../contracts/holonet-intent-registry.js';

export class HolonetBadgeService {
  /**
   * Badge families and their visual properties
   */
  static BADGE_FAMILIES = {
    messages: {
      key: 'messages',
      label: 'MESSAGES',
      icon: 'fas fa-envelope',
      glyph: 'holo-letter',
      tone: 'comms'
    },
    store: {
      key: 'store',
      label: 'STORE',
      icon: 'fas fa-coins',
      glyph: 'credit-symbol',
      tone: 'commerce'
    },
    mentor: {
      key: 'mentor',
      label: 'MENTOR',
      icon: 'fas fa-user-graduate',
      glyph: 'holo-bust',
      tone: 'training'
    },
    progression: {
      key: 'progression',
      label: 'LEVELS',
      icon: 'fas fa-chevron-up',
      glyph: 'level-pip',
      tone: 'advancement'
    },
    approvals: {
      key: 'approvals',
      label: 'APPROVALS',
      icon: 'fas fa-stamp',
      glyph: 'seal-badge',
      tone: 'official'
    },
    ship: {
      key: 'ship',
      label: 'SHIP',
      icon: 'fas fa-ship',
      glyph: 'navicomputer',
      tone: 'tech'
    },
    droid: {
      key: 'droid',
      label: 'DROID',
      icon: 'fas fa-robot',
      glyph: 'circuit-badge',
      tone: 'tech'
    },
    follower: {
      key: 'follower',
      label: 'CREW',
      icon: 'fas fa-users',
      glyph: 'squad-marker',
      tone: 'personal'
    },
    healing: {
      key: 'healing',
      label: 'HEALTH',
      icon: 'fas fa-heart-pulse',
      glyph: 'bacta-cross',
      tone: 'medical'
    },
    system: {
      key: 'system',
      label: 'SYSTEM',
      icon: 'fas fa-bell',
      glyph: 'alert-triangle',
      tone: 'alert'
    },
    bulletin: {
      key: 'bulletin',
      label: 'NEWS',
      icon: 'fas fa-newspaper',
      glyph: 'holonews',
      tone: 'info'
    }
  };

  /**
   * Get badge for a Holonet record
   * Resolves family from sourceFamily → intent → category → fallback
   *
   * @param {HolonetRecord} record
   * @returns {Object} { key, label, icon, glyph, tone }
   */
  static getBadge(record) {
    if (!record) return this._getFallbackBadge();

    // Priority: sourceFamily → intent category → record category → fallback
    let family = this._resolveBadgeFamily(record.sourceFamily || record.category);

    if (!family) {
      const intentMeta = HolonetIntentRegistry.getIntentMeta(record.intent);
      family = this._resolveBadgeFamily(intentMeta?.category);
    }

    if (!family) {
      family = this._resolveBadgeFamily(record.category);
    }

    return family || this._getFallbackBadge();
  }

  /**
   * Get badge counts grouped by family
   * Useful for datapad home grid badge counts
   *
   * @param {Array} records
   * @returns {Object} { [familyKey]: count, ... }
   */
  static getUnreadCounts(records = []) {
    const counts = {};

    for (const record of records) {
      if (record.unread) {
        const badge = this.getBadge(record);
        counts[badge.key] = (counts[badge.key] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Get all badge families (for badge row UI)
   *
   * @returns {Array} Array of badge family objects with unreadCount
   */
  static getAllBadges(unreadCounts = {}) {
    return Object.entries(this.BADGE_FAMILIES)
      .map(([key, badge]) => ({
        ...badge,
        unreadCount: unreadCounts[key] || 0
      }))
      .sort((a, b) => b.unreadCount - a.unreadCount);
  }

  /**
   * Resolve badge family from source family or category string
   * @private
   */
  static _resolveBadgeFamily(sourceOrCategory) {
    if (!sourceOrCategory) return null;

    const key = sourceOrCategory.toLowerCase();

    // Direct mapping: 'store' → store badge, 'mentor' → mentor badge, etc.
    if (this.BADGE_FAMILIES[key]) {
      return { ...this.BADGE_FAMILIES[key] };
    }

    // Alias mappings for common variations
    const aliases = {
      'gm_authored': 'bulletin',
      'authored': 'bulletin',
      'messenger': 'messages',
      'approvals': 'approvals',
      'progression': 'progression',
      'system': 'system',
      'mentor': 'mentor',
      'store': 'store',
      'ship': 'ship',
      'droid': 'droid',
      'follower': 'follower',
      'healing': 'healing'
    };

    const aliased = aliases[key];
    if (aliased && this.BADGE_FAMILIES[aliased]) {
      return { ...this.BADGE_FAMILIES[aliased] };
    }

    return null;
  }

  /**
   * Get fallback badge for unknown records
   * @private
   */
  static _getFallbackBadge() {
    return {
      key: 'system',
      label: 'UPDATE',
      icon: 'fas fa-circle-info',
      glyph: 'alert-triangle',
      tone: 'alert'
    };
  }
}
