/* ============================================================================
   DISPLAY NORMALIZER
   Wraps DisplayContract for convenient use throughout system
   Ensures all entities conform to display contract automatically
   ============================================================================ */

import { DisplayContract } from '../contracts/DisplayContract.js';

/**
 * Normalize a single entity for display
 * @param {Object} entity - Raw entity data
 * @returns {Object} - Normalized entity
 */
export function normalizeForDisplay(entity) {
  return DisplayContract.enforce(entity);
}

/**
 * Normalize multiple entities for display
 * @param {Array} entities - Array of raw entities
 * @returns {Array} - Array of normalized entities
 */
export function normalizeMany(entities) {
  return DisplayContract.enforceMany(entities);
}

/**
 * Validate entity conforms to contract
 * @param {Object} entity - Entity to validate
 * @returns {boolean}
 */
export function isValidForDisplay(entity) {
  return DisplayContract.validate(entity);
}

/**
 * Apply UI overrides to normalized entity
 * Useful for per-instance customization (e.g., actor-specific rarity)
 * @param {Object} normalized - Entity after normalizeForDisplay()
 * @param {Object} overrides - UI overrides { icon, rarity, category, etc. }
 * @returns {Object} - Entity with overrides applied
 */
export function applyUIOverrides(normalized, overrides) {
  return DisplayContract.applyOverrides(normalized, overrides);
}

/**
 * Transform list of entities for view model
 * @param {Array} entities - Raw entities
 * @param {Object} options - Configuration options
 * @param {Function} options.filterFn - Optional filter function
 * @param {Function} options.mapFn - Optional additional mapping
 * @param {Object} options.overridesFn - Optional function to get per-entity overrides
 * @returns {Array} - Normalized entities ready for UI
 */
export function normalizeForViewModel(entities, options = {}) {
  let normalized = normalizeMany(entities);

  // Apply filter if provided
  if (typeof options.filterFn === 'function') {
    normalized = normalized.filter(options.filterFn);
  }

  // Apply per-entity overrides if function provided
  if (typeof options.overridesFn === 'function') {
    normalized = normalized.map(entity => {
      const overrides = options.overridesFn(entity);
      return overrides ? applyUIOverrides(entity, overrides) : entity;
    });
  }

  // Apply additional mapping if provided
  if (typeof options.mapFn === 'function') {
    normalized = normalized.map(options.mapFn);
  }

  return normalized;
}

/**
 * Group normalized entities by a field
 * @param {Array} entities - Normalized entities
 * @param {string} field - Field to group by (e.g., 'category', 'type')
 * @returns {Map} - Map of field value => entities
 */
export function groupNormalized(entities, field = 'category') {
  const groups = new Map();
  for (const entity of entities) {
    const value = entity[field] || 'unknown';
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value).push(entity);
  }
  return groups;
}

/**
 * Sort normalized entities by field
 * @param {Array} entities - Normalized entities
 * @param {string} field - Field to sort by (default: 'name')
 * @param {boolean} descending - Sort descending (default: false)
 * @returns {Array} - Sorted entities
 */
export function sortNormalized(entities, field = 'name', descending = false) {
  const sorted = [...entities].sort((a, b) => {
    const aVal = a[field] || '';
    const bVal = b[field] || '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return descending ? -cmp : cmp;
  });
  return sorted;
}

/**
 * Search normalized entities by text
 * @param {Array} entities - Normalized entities
 * @param {string} query - Search query
 * @param {Array} fields - Fields to search (default: ['name', 'description'])
 * @returns {Array} - Matching entities
 */
export function searchNormalized(entities, query, fields = ['name', 'description']) {
  if (!query) return entities;

  const q = String(query).toLowerCase();
  return entities.filter(entity => {
    return fields.some(field => {
      const val = entity[field];
      return val && String(val).toLowerCase().includes(q);
    });
  });
}
