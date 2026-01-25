import { SWSECharacterSheet } from '../character/swse-character-sheet.js';
import { SWSELogger } from '../../utils/logger.js';

// ============================================
// FILE: module/actors/swse-npc.js
// NPC actor sheet
// ============================================

export class SWSENPCSheet extends SWSECharacterSheet {
  /**
   * Prevent non-npc actors from using this sheet
   */
  static canUserUseSheet(user, sheet, actor) {
    // Only NPCs should use this sheet
    if (actor?.type && actor.type !== "npc") {
      return false;
    }
    return super.canUserUseSheet(user, sheet, actor);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "npc", "swse-app"],
      template: "systems/foundryvtt-swse/templates/actors/npc/npc-sheet.hbs",
      width: 800,
      height: 720,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }]
    });
  }

  getData() {
    const context = super.getData();
    // Add NPC-specific data here
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Only add listeners if not read-only
    if (!this.options.editable) return;

    // Add NPC-specific listeners here
    SWSELogger.log("SWSE | NPC sheet listeners activated");
  }

  // ============================================
  // INHERITED METHOD STUBS
  // These prevent errors when parent tries to call them
  // ============================================

}
