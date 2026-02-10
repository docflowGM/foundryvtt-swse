/**
 * Wishlist Helper Functions
 * Utilities for enriching items with wishlist data for template rendering
 */

import { WishlistEngine } from '../engine/WishlistEngine.js';

/**
 * Enrich a list of items with wishlist and prerequisite fulfillment data
 * @param {Array} items - Array of feat or talent documents
 * @param {Object} actor - The character actor
 * @returns {Array} Items enriched with prerequisite fulfillment data
 */
export function enrichItemsWithPrerequisiteStatus(items, actor) {
  if (!actor || !items || items.length === 0) {
    return items;
  }

  return items.map(item => {
    const isWishlisted = WishlistEngine.isWishlisted(actor, item._id || item.id, item.type || 'feat');
    const analysis = WishlistEngine.analyzePrerequisiteFulfillment(actor, item);

    return {
      ...item,
      isWishlisted,
      prereqAnalysis: {
        fulfilled: analysis.fulfilled,
        unfulfilled: analysis.unfulfilled,
        percentComplete: analysis.fulfillmentPercent,
        isFullyMet: analysis.isFullyMet,
        total: analysis.total
      }
    };
  });
}

/**
 * Render HTML for prerequisite status with color coding
 * @param {Array} fulfilled - Fulfilled prerequisites
 * @param {Array} unfulfilled - Unfulfilled prerequisites
 * @returns {string} HTML with color-coded prerequisites
 */
export function renderPrerequisiteStatus(fulfilled = [], unfulfilled = []) {
  let html = '<div class="prerequisite-status">';

  if (fulfilled.length > 0) {
    html += '<div class="fulfilled-prereqs">';
    for (const prereq of fulfilled) {
      html += `<div class="prereq-item fulfilled">✓ <span style="color: #4caf50;">${prereq}</span></div>`;
    }
    html += '</div>';
  }

  if (unfulfilled.length > 0) {
    html += '<div class="unfulfilled-prereqs">';
    for (const prereq of unfulfilled) {
      html += `<div class="prereq-item unfulfilled">✗ <span style="color: #ff5555;">${prereq}</span></div>`;
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * Format wishlist item for display
 * @param {Object} item - Wishlist item with progress data
 * @returns {Object} Formatted item data for template
 */
export function formatWishlistItem(item) {
  return {
    ...item,
    displayName: item.name,
    isComplete: item.fulfilled?.length > 0 && item.unfulfilled?.length === 0,
    progressPercent: item.fulfillmentPercent || 0,
    fulfilledCount: item.fulfilled?.length || 0,
    unfulfilledCount: item.unfulfilled?.length || 0,
    totalCount: (item.fulfilled?.length || 0) + (item.unfulfilled?.length || 0)
  };
}

/**
 * Get wishlist recommendations for display
 * @param {Object} actor - The character actor
 * @param {Array} wishlistedItems - Items on the wishlist
 * @param {Array} allItems - All available items
 * @returns {Array} Recommendations sorted by priority
 */
export function getWishlistRecommendations(actor, wishlistedItems = [], allItems = []) {
  const recommendations = [];

  for (const wishedItem of wishlistedItems) {
    // Find the actual item document
    const itemDoc = allItems.find(i => (i._id || i.id) === wishedItem.id);
    if (!itemDoc) {continue;}

    const itemRecommendations = WishlistEngine.getWishlistRecommendations(actor, itemDoc);
    recommendations.push({
      wishlistItem: wishedItem,
      recommendations: itemRecommendations
    });
  }

  return recommendations;
}

export default {
  enrichItemsWithPrerequisiteStatus,
  renderPrerequisiteStatus,
  formatWishlistItem,
  getWishlistRecommendations
};
