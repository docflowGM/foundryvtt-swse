// scripts/core/galactic-records-category-registry.js
/**
 * Galactic Records Category Registry
 * Configuration for all template categories in the system
 * Tracks which are supported, which are coming soon
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class GalacticRecordsCategoryRegistry {
  /**
   * Get all registered categories
   * @returns {Array<Object>} Array of category objects
   */
  static getCategories() {
    return [
      {
        id: 'heroic',
        label: 'Heroic',
        description: 'Pre-built profiles for heroic-tier NPCs and adversaries',
        icon: 'fa-crown',
        supported: true,
        dataLoader: 'loadHeroicTemplates',
        importer: 'importHeroicTemplate',
        count: 405
      },
      {
        id: 'nonheroic',
        label: 'Nonheroic',
        description: 'Profiles for common soldiers, guards, workers, and civilians',
        icon: 'fa-users',
        supported: true,
        dataLoader: 'loadNonheroicTemplates',
        importer: 'importNonheroicTemplate',
        count: 434
      },
      {
        id: 'beast',
        label: 'Beast',
        description: 'Creature and mount profiles from the galactic fauna registry',
        icon: 'fa-dragon',
        supported: true,
        dataLoader: 'loadBeastTemplates',
        importer: 'importBeastTemplate',
        count: 117
      },
      {
        id: 'droid',
        label: 'Droid',
        description: 'Droid and automaton profiles',
        icon: 'fa-robot',
        supported: false,
        dataLoader: null,
        importer: null,
        unavailableReason: 'Droid import system not yet available. Coming in a future update.',
        count: 0
      }
    ];
  }

  /**
   * Get a specific category by ID
   * @param {string} categoryId - Category ID
   * @returns {Object|null} Category object or null
   */
  static getCategory(categoryId) {
    const categories = this.getCategories();
    return categories.find(c => c.id === categoryId) || null;
  }

  /**
   * Get all supported categories
   * @returns {Array<Object>} Supported categories only
   */
  static getSupportedCategories() {
    return this.getCategories().filter(c => c.supported);
  }

  /**
   * Get all unsupported categories
   * @returns {Array<Object>} Unsupported categories only
   */
  static getUnsupportedCategories() {
    return this.getCategories().filter(c => !c.supported);
  }

  /**
   * Check if a category is supported
   * @param {string} categoryId - Category ID
   * @returns {boolean}
   */
  static isSupported(categoryId) {
    const category = this.getCategory(categoryId);
    return category ? category.supported : false;
  }

  /**
   * Get the data loader function name for a category
   * @param {string} categoryId - Category ID
   * @returns {string|null} Function name or null if unsupported
   */
  static getDataLoaderName(categoryId) {
    const category = this.getCategory(categoryId);
    return category ? category.dataLoader : null;
  }

  /**
   * Get the importer function name for a category
   * @param {string} categoryId - Category ID
   * @returns {string|null} Function name or null if unsupported
   */
  static getImporterName(categoryId) {
    const category = this.getCategory(categoryId);
    return category ? category.importer : null;
  }

  /**
   * Get unavailable reason for unsupported category
   * @param {string} categoryId - Category ID
   * @returns {string|null} Reason or null if supported
   */
  static getUnavailableReason(categoryId) {
    const category = this.getCategory(categoryId);
    return category && !category.supported ? (category.unavailableReason || 'Not available') : null;
  }
}

export default GalacticRecordsCategoryRegistry;
