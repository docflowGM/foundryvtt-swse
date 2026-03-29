/**
 * scripts/sheets/v2/droid/DroidPanelVisibilityManager.js
 *
 * Droid-specific visibility manager subclass
 * Defines which panels appear on which tabs for droid sheets
 * Handles droid-specific conditionals and invalidation
 */

import { PanelVisibilityManager as BasePanelVisibilityManager } from '../shared/PanelVisibilityManager.js';

export class DroidPanelVisibilityManager extends BasePanelVisibilityManager {
  constructor(sheetInstance) {
    super(sheetInstance);

    // DROID-SPECIFIC TAB LAYOUT
    // Different from character and NPC: focus on droid-specific systems
    this.tabPanels = {
      summary: ['portraitPanel', 'droidSummaryPanel'],
      attributes: ['abilitiesPanel', 'defensesPanel'],
      skills: ['skillsPanel'],
      systems: ['protocolsPanel', 'customizationsPanel', 'programmingPanel'],
      inventory: ['inventoryPanel'],
      combat: ['combatPanel'],
      notes: ['droidNotesPanel']
    };

    // CONDITIONAL PANELS
    // Panels that only build under certain conditions
    this.conditionalPanels = {
      forcePowersPanel: {
        condition: (actor) => actor.system?.forceSensitive === true,
        reason: 'droid is not force sensitive'
      },
      combatPanel: {
        condition: (actor) => {
          const droidType = actor.system?.droidType || '';
          return droidType !== 'utility' && droidType !== 'service';
        },
        reason: 'droid type cannot engage in combat'
      }
    };

    // Initialize visibility state after setting mappings
    this._initializePanelState();

    // Set default tab for droid sheet
    this.currentTab = 'summary';
  }

  /**
   * DROID-SPECIFIC INVALIDATION MAP
   * Maps data change types to affected panels
   *
   * Droid-specific: protocols modify skills, customizations affect stats
   * @param {string} type - Type of change
   */
  invalidateByType(type) {
    const invalidationMap = {
      // Item changes affect inventory
      item: ['inventoryPanel'],

      // Protocol changes affect both protocols panel AND skills (protocols modify skill bonuses)
      protocol: ['protocolsPanel', 'skillsPanel'],

      // Customization changes affect customizations panel and potentially defenses
      customization: ['customizationsPanel', 'defensesPanel'],

      // Programming/language changes
      programming: ['programmingPanel'],

      // Ability score changes affect abilities and derived stats
      ability: ['abilitiesPanel', 'defensesPanel', 'skillsPanel'],

      // Health changes
      health: ['droidSummaryPanel'],

      // Defense changes
      defense: ['defensesPanel'],

      // Skill changes
      skill: ['skillsPanel'],

      // Combat changes
      combat: ['combatPanel', 'skillsPanel'],

      // Droid type/restriction changes affect summary and potentially combat eligibility
      droidType: ['droidSummaryPanel', 'combatPanel'],

      // Force sensitivity changes
      force: ['forcePowersPanel']
    };

    const panelsToInvalidate = invalidationMap[type] || [];
    for (const panelName of panelsToInvalidate) {
      this.invalidatePanel(panelName);
    }
  }
}
