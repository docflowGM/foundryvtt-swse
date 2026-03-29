/**
 * scripts/sheets/v2/npc/NPCPanelVisibilityManager.js
 *
 * NPC-specific visibility manager subclass
 * Defines which panels appear on which tabs, conditional panel logic,
 * and type-based invalidation for NPC sheets
 */

import { PanelVisibilityManager as BasePanelVisibilityManager } from '../shared/PanelVisibilityManager.js';

export class NPCPanelVisibilityManager extends BasePanelVisibilityManager {
  constructor(sheetInstance) {
    super(sheetInstance);

    // NPC-SPECIFIC TAB LAYOUT
    // Different from character sheet: fewer tabs, NPC-focused sections
    this.tabPanels = {
      overview: ['portraitPanel', 'npcBiographyPanel', 'healthPanel', 'defensePanel'],
      abilities: ['abilitiesPanel'],
      skills: ['skillsPanel'],
      inventory: ['inventoryPanel'],
      talents: ['talentPanel'],
      feats: ['featPanel'],
      languages: ['languagesPanel'],
      combat: ['combatPanel'],
      notes: ['npcCombatNotesPanel']
    };

    // CONDITIONAL PANELS
    // Panels that only build under certain conditions
    this.conditionalPanels = {
      forcePowersPanel: {
        condition: (actor) => actor.system?.forceSensitive === true,
        reason: 'not force sensitive'
      }
    };

    // Initialize visibility state after setting mappings
    this._initializePanelState();

    // Set default tab for NPC sheet
    this.currentTab = 'overview';
  }

  /**
   * NPC-SPECIFIC INVALIDATION MAP
   * Maps data change types to affected panels
   *
   * Override this to customize invalidation for NPC sheet type
   * @param {string} type - Type of change (item, talent, feat, etc.)
   */
  invalidateByType(type) {
    const invalidationMap = {
      // Item changes affect inventory
      item: ['inventoryPanel'],

      // Talent changes affect talent panel (and possibly skills if NPC talents modify skills)
      talent: ['talentPanel'],

      // Feat changes affect feat panel
      feat: ['featPanel'],

      // Skill changes affect skills panel
      skill: ['skillsPanel'],

      // Ability score changes affect abilities and derived stats
      ability: ['abilitiesPanel', 'healthPanel', 'defensePanel'],

      // Health changes
      health: ['healthPanel'],

      // Defense changes
      defense: ['defensePanel'],

      // Language changes
      language: ['languagesPanel'],

      // Combat changes
      combat: ['combatPanel', 'skillsPanel'],

      // Force sensitivity changes
      force: ['forcePowersPanel']
    };

    const panelsToInvalidate = invalidationMap[type] || [];
    for (const panelName of panelsToInvalidate) {
      this.invalidatePanel(panelName);
    }
  }
}
