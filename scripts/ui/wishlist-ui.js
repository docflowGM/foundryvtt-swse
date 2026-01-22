/**
 * SWSE Wishlist UI
 * Handles UI interactions for the wishlist system
 */

import { SWSELogger } from '../utils/logger.js';
import { WishlistEngine } from '../engine/WishlistEngine.js';

export class WishlistUI {
  /**
   * Register wishlist UI handlers
   * Should be called during app initialization
   */
  static registerHandlers() {
    // Context menu for adding/removing from wishlist
    document.addEventListener('contextmenu', this._handleContextMenu.bind(this), true);

    // Wishlist buttons in UI
    document.addEventListener('click', this._handleWishlistClick.bind(this));
  }

  /**
   * Show prerequisite status tooltip
   * Displays fulfilled (green) vs unfulfilled (red) prerequisites
   * @param {HTMLElement} el - Element to attach tooltip to
   * @param {Object} actor - The character actor
   * @param {Object} item - Feat or talent document
   */
  static showPrerequisiteStatus(el, actor, item) {
    if (!actor || !item) return;

    const analysis = WishlistEngine.analyzePrerequisiteFulfillment(actor, item);

    let html = '<div class="prerequisite-status-tooltip">';
    html += `<div class="prereq-title">${item.name} Prerequisites</div>`;

    if (analysis.fulfilled.length > 0) {
      html += '<div class="prereq-fulfilled">';
      html += '<strong style="color: #4caf50;">✓ Met:</strong>';
      for (const prereq of analysis.fulfilled) {
        html += `<div style="color: #4caf50; font-size: 0.9em; margin-left: 1em;">✓ ${prereq}</div>`;
      }
      html += '</div>';
    }

    if (analysis.unfulfilled.length > 0) {
      html += '<div class="prereq-unfulfilled">';
      html += '<strong style="color: #ff5555;">✗ Not Met:</strong>';
      for (const prereq of analysis.unfulfilled) {
        html += `<div style="color: #ff5555; font-size: 0.9em; margin-left: 1em;">✗ ${prereq}</div>`;
      }
      html += '</div>';
    }

    html += `<div class="prereq-progress" style="margin-top: 0.5em;">`;
    html += `<strong>${analysis.fulfillmentPercent}% Complete</strong>`;
    html += `<div style="width: 100%; height: 6px; background: #333; margin-top: 0.3em; border-radius: 3px; overflow: hidden;">`;
    html += `<div style="height: 100%; width: ${analysis.fulfillmentPercent}%; background: linear-gradient(90deg, #4caf50, #45a049);"></div>`;
    html += `</div></div>`;
    html += '</div>';

    el.innerHTML = html;
    el.style.display = 'block';
  }

  /**
   * Show wishlist progress panel
   * @param {Object} actor - The character actor
   * @param {Array} allItems - All feats or talents
   * @returns {string} HTML for wishlist progress
   */
  static renderWishlistProgress(actor, allItems = []) {
    const progress = WishlistEngine.getWishlistProgress(actor, allItems);

    if (progress.length === 0) {
      return '<div class="wishlist-empty">No wishlisted items</div>';
    }

    let html = '<div class="wishlist-progress-list">';

    for (const item of progress) {
      const statusClass = item.isComplete ? 'wishlist-item-complete' : '';
      html += `<div class="wishlist-item ${statusClass}">`;
      html += `<div class="wishlist-item-name">${item.name}</div>`;

      // Progress bar
      html += `<div class="wishlist-item-progress">`;
      html += `<div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden; margin: 4px 0;">`;
      html += `<div style="height: 100%; width: ${item.fulfillmentPercent}%; background: linear-gradient(90deg, #00d9ff, #0088cc);"></div>`;
      html += `</div>`;
      html += `<span style="font-size: 0.85em; color: #aaa;">${item.fulfillmentPercent}% (${item.fulfilled.length}/${item.fulfilled.length + item.unfulfilled.length})</span>`;
      html += `</div>`;

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────

  static _handleContextMenu(event) {
    const target = event.target.closest('[data-feat-id], [data-talent-id]');
    if (!target) return;

    const featId = target.dataset.featId;
    const talentId = target.dataset.talentId;
    const itemType = featId ? 'feat' : 'talent';
    const itemId = featId || talentId;
    const itemName = target.querySelector('h4')?.textContent || 'Unknown';

    // Create custom context menu
    const menu = document.createElement('div');
    menu.className = 'wishlist-context-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${event.clientY}px;
      left: ${event.clientX}px;
      background: #1a1a2e;
      border: 1px solid #00d9ff;
      border-radius: 4px;
      padding: 4px;
      z-index: 10000;
      min-width: 180px;
    `;

    // Get actor
    const actor = game?.user?.character;
    if (!actor) return;

    const isWishlisted = WishlistEngine.isWishlisted(actor, itemId, itemType);

    const label = isWishlisted ? '✓ Remove from Wishlist' : '✦ Add to Wishlist';
    const menuItem = document.createElement('div');
    menuItem.className = 'wishlist-menu-item';
    menuItem.textContent = label;
    menuItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      color: ${isWishlisted ? '#4caf50' : '#00d9ff'};
      hover: {background: rgba(0, 217, 255, 0.2);}
    `;

    menuItem.addEventListener('click', async () => {
      if (isWishlisted) {
        await WishlistEngine.removeFromWishlist(actor, itemId, itemType);
        ui.notifications.info(`Removed "${itemName}" from wishlist`);
      } else {
        // Need to find the actual document
        const pack = itemType === 'feat'
          ? game.packs.get('foundryvtt-swse.feats')
          : game.packs.get('foundryvtt-swse.talents');

        if (pack) {
          const doc = await pack.getDocument(itemId);
          if (doc) {
            await WishlistEngine.addToWishlist(actor, doc, itemType);
            ui.notifications.info(`Added "${doc.name}" to wishlist`);
          }
        }
      }
      menu.remove();
    });

    menu.appendChild(menuItem);
    document.body.appendChild(menu);

    // Remove menu on click elsewhere
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);

    event.preventDefault();
  }

  static _handleWishlistClick(event) {
    const wishlistBtn = event.target.closest('[data-wishlist-action]');
    if (!wishlistBtn) return;

    const action = wishlistBtn.dataset.wishlistAction;
    const itemId = wishlistBtn.dataset.itemId;
    const itemType = wishlistBtn.dataset.itemType || 'feat';

    const actor = game?.user?.character;
    if (!actor) return;

    if (action === 'add') {
      // Implementation for add button
      SWSELogger.log('[WISHLIST-UI] Add button clicked:', itemId);
    } else if (action === 'remove') {
      WishlistEngine.removeFromWishlist(actor, itemId, itemType);
    }
  }
}

export default WishlistUI;
