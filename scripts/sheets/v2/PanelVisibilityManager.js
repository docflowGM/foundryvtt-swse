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
      overview: ['portraitPanel', 'biographyPanel', 'healthPanel', 'defensePanel', 'secondWindPanel', 'resourcesPanel', 'languagesPanel'],
      abilities: ['abilitiesPanel'],
      skills: ['skillsPanel'],
      combat: ['healthPanel', 'defensePanel', 'secondWindPanel', 'resourcesPanel'],
      talents: ['talentPanel', 'featPanel', 'racialAbilitiesPanel'],
      force: ['forcePowersPanel'],
      gear: ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'],
      biography: ['biographyPanel', 'languagesPanel', 'darkSidePanel'],
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
      },
      // Defensive — vehicles already never reach this panel-building path
      // today (the sheet's vehicle-mode context short-circuits before
      // PanelContextBuilder is instantiated), but this documents intent
      // explicitly and guards against a future refactor merging that path
      // back into the standard concept-context flow. Not gated on Force
      // sensitivity — Dark Side Score is not limited to Force-sensitive
      // actors.
      darkSidePanel: {
        condition: (actor) => actor?.type !== 'vehicle' && actor?.system?.isVehicle !== true,
        reason: 'vehicle actors do not use Dark Side Score'
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
      ability: ['abilitiesPanel', 'racialAbilitiesPanel'],
      combat: ['darkSidePanel', 'secondWindPanel', 'resourcesPanel'],
      resources: ['resourcesPanel'],
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
