import { SWSECharacterSheet } from '../character/swse-character-sheet.js';

// ============================================
// FILE: module/actors/swse-npc.js
// NPC actor sheet
// ============================================

export class SWSENPCSheet extends SWSECharacterSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "npc"],
      template: "systems/swse/templates/actors/npc/npc-sheet.hbs",
      width: 800,
      height: 720
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
    console.log("SWSE | NPC sheet listeners activated");
  }

  // ============================================
  // INHERITED METHOD STUBS
  // These prevent errors when parent tries to call them
  // ============================================

}
