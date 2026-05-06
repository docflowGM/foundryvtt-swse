/**
 * Holonet Badge Renderer
 *
 * Utility for rendering badge HTML and CSS classes for UI components.
 * Separates badge visual logic from service logic.
 */

import { HolonetBadgeService } from '../services/holonet-badge-service.js';

export class HolonetBadgeRenderer {
  /**
   * Render a badge chip (for notice center, filters, etc.)
   * Returns HTML string: <span class="holonet-badge-chip" data-badge-key="...">
   *
   * @param {Object} badge Badge object from HolonetBadgeService
   * @param {number} unreadCount Number to display
   * @returns {string} HTML
   */
  static renderBadgeChip(badge, unreadCount = 0) {
    if (!badge) return '';

    const countHtml = unreadCount > 0 ? `<span class="badge-count">${unreadCount}</span>` : '';
    const title = unreadCount > 0 ? `${unreadCount} unread ${badge.label}` : badge.label;

    return `
      <span
        class="holonet-badge-chip holonet-badge-${badge.key}"
        data-badge-key="${badge.key}"
        data-tone="${badge.tone}"
        title="${title}"
      >
        <i class="badge-icon ${badge.icon}"></i>
        <span class="badge-label">${badge.label}</span>
        ${countHtml}
      </span>
    `;
  }

  /**
   * Render a badge label (for notification cards, list items)
   * Returns HTML string: <span class="holonet-badge-label" data-badge-key="...">
   *
   * @param {Object} badge Badge object from HolonetBadgeService
   * @returns {string} HTML
   */
  static renderBadgeLabel(badge) {
    if (!badge) return '';

    return `
      <span
        class="holonet-badge-label holonet-badge-${badge.key}"
        data-badge-key="${badge.key}"
        data-tone="${badge.tone}"
      >
        <i class="badge-icon ${badge.icon}"></i>
        <span class="badge-text">${badge.label}</span>
      </span>
    `;
  }

  /**
   * Render a badge row (for datapad home grid)
   * Shows all badge families with unread counts
   * Returns HTML string: <div class="holonet-badge-row">
   *
   * @param {Object} unreadCounts { [familyKey]: count, ... }
   * @returns {string} HTML
   */
  static renderBadgeRow(unreadCounts = {}) {
    const badges = HolonetBadgeService.getAllBadges(unreadCounts);
    const chips = badges
      .filter(b => b.unreadCount > 0) // Only show badges with unread items
      .map(b => this.renderBadgeChip(b, b.unreadCount))
      .join('');

    return `<div class="holonet-badge-row">${chips}</div>`;
  }

  /**
   * Get CSS class string for a badge
   * Useful for adding to elements without full HTML rendering
   *
   * @param {Object} badge Badge object
   * @returns {string} CSS classes
   */
  static getBadgeClasses(badge) {
    if (!badge) return 'holonet-badge-system';
    return `holonet-badge-${badge.key} holonet-badge-tone-${badge.tone}`;
  }

  /**
   * Extract badge key from a record
   * Shorthand for common pattern
   *
   * @param {HolonetRecord} record
   * @returns {string} badge key
   */
  static getBadgeKey(record) {
    const badge = HolonetBadgeService.getBadge(record);
    return badge?.key || 'system';
  }
}
