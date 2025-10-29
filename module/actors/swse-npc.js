// ============================================
// FILE: module/actors/swse-npc.js
// NPC actor sheet
// ============================================

import { SWSEActorSheet } from "./swse-actor.js";

export class SWSENPCSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "npc"],
      template: "systems/swse/templates/actors/npc-sheet.hbs",
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
  
  async _onAddWeapon(event) {
    console.log("SWSE | _onAddWeapon not implemented for this sheet type");
  }
  
  async _onRemoveWeapon(event) {
    console.log("SWSE | _onRemoveWeapon not implemented for this sheet type");
  }
  
  async _onRollWeapon(event) {
    console.log("SWSE | _onRollWeapon not implemented for this sheet type");
  }
  
  async _onAddFeat(event) {
    console.log("SWSE | _onAddFeat not implemented for this sheet type");
  }
  
  async _onRemoveFeat(event) {
    console.log("SWSE | _onRemoveFeat not implemented for this sheet type");
  }
  
  async _onAddTalent(event) {
    console.log("SWSE | _onAddTalent not implemented for this sheet type");
  }
  
  async _onRemoveTalent(event) {
    console.log("SWSE | _onRemoveTalent not implemented for this sheet type");
  }
  
  async _onAddForcePower(event) {
    console.log("SWSE | _onAddForcePower not implemented for this sheet type");
  }
  
  async _onRemoveForcePower(event) {
    console.log("SWSE | _onRemoveForcePower not implemented for this sheet type");
  }
  
  async _onRollForcePower(event) {
    console.log("SWSE | _onRollForcePower not implemented for this sheet type");
  }
  
  async _onRefreshForcePowers(event) {
    console.log("SWSE | _onRefreshForcePowers not implemented for this sheet type");
  }
  
  async _onReloadForcePower(event) {
    console.log("SWSE | _onReloadForcePower not implemented for this sheet type");
  }
  
  async _onAddSkill(event) {
    console.log("SWSE | _onAddSkill not implemented for this sheet type");
  }
  
  async _onRemoveSkill(event) {
    console.log("SWSE | _onRemoveSkill not implemented for this sheet type");
  }
  
  async _onLevelUp(event) {
    console.log("SWSE | _onLevelUp not implemented for this sheet type");
  }
  
  async _onSecondWind(event) {
    console.log("SWSE | _onSecondWind not implemented for this sheet type");
  }
  
  async _onOpenStore(event) {
    console.log("SWSE | _onOpenStore not implemented for this sheet type");
  }

}
