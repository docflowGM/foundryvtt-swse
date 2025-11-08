import { SWSECharacterSheet } from '../character/swse-character-sheet.js';

// ============================================
// FILE: module/actors/swse-droid.js
// Droid actor sheet
// ============================================

export class SWSEDroidSheet extends SWSECharacterSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "droid"],
      template: "systems/swse/templates/actors/droid/droid-sheet.hbs",
      width: 800,
      height: 720
    });
  }

  getData() {
    const context = super.getData();
    // Add droid-specific data here
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Only add listeners if not read-only
    if (!this.options.editable) return;

    // Add droid-specific listeners here
    console.log("SWSE | Droid sheet listeners activated");
  }

  // ============================================
  // INHERITED METHOD STUBS
  // These prevent errors when parent tries to call them
  // ============================================

}
