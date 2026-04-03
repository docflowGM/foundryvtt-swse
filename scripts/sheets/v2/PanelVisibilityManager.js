/**
 * PanelVisibilityManager (Character Sheet Specific)
 *
 * Subclass of the shared PanelVisibilityManager that defines character-sheet-specific
 * tab/panel mappings and conditional logic.
 *
 * The shared base class is in: scripts/sheets/v2/shared/PanelVisibilityManager.js
 */

import { PanelVisibilityManager as BasePanelVisibilityManager } from './shared/PanelVisibilityManager.js';

export class PanelVisibilityManager extends BasePanelVisibilityManager {
  constructor(sheetInstance) {
    super(sheetInstance);

    // Character-specific: Define which panels appear on which tabs
    // These must match the tabs defined in character-sheet.hbs
    // Note: portraitPanel and biographyPanel are always visible (header), but built with overview for efficiency
    this.tabPanels = {
      overview: ['portraitPanel', 'biographyPanel', 'healthPanel', 'combatStatsPanel', 'secondWindPanel', 'defensePanel'],
      abilities: ['abilitiesPanel', 'racialAbilitiesPanel'],
      skills: ['skillsPanel'],
      combat: ['maneuverPanel', 'darkSidePanel'],
      talents: ['talentPanel', 'featPanel'],
      force: ['forcePowersPanel'],
      gear: ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'],
      biography: ['biographyPanel'],
      relationships: ['relationshipsPanel', 'languagesPanel'],
      notes: ['combatNotesPanel']
    };

    // Character-specific: Define which panels are conditional on actor properties
    this.conditionalPanels = {
      forcePowersPanel: {
        condition: (actor) => actor.system?.forceSensitive === true,
        reason: 'not force sensitive'
      },
      starshipManeuversPanel: {
        condition: (actor) => actor.type === 'vehicle' || actor.system?.isVehicle === true,
        reason: 'not a vehicle'
      }
    };

    // Character-specific: Initialize state after setting mappings
    this._initializePanelState();

    // Set default tab (matches default active tab in character-sheet.hbs)
    this.currentTab = 'overview';
  }

  /**
   * Character-specific: Map data change types to affected panels
   * Override of shared base method
   * @param {string} type - Type of change (item, talent, feat, etc.)
   */
  invalidateByType(type) {
    const invalidationMap = {
      item: ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'],
      talent: ['talentPanel'],
      feat: ['featPanel'],
      maneuver: ['maneuverPanel', 'starshipManeuversPanel'],
      force: ['forcePowersPanel'],
      relationship: ['relationshipsPanel'],
      language: ['languagesPanel'],
      ability: ['racialAbilitiesPanel'],
      combat: ['darkSidePanel', 'secondWindPanel'],
      health: ['healthPanel'],
      defense: ['defensePanel'],
      biography: ['biographyPanel'],
      portrait: ['portraitPanel']
    };

    const panelsToInvalidate = invalidationMap[type] || [];
    for (const panelName of panelsToInvalidate) {
      this.invalidatePanel(panelName);
    }
  }
}
