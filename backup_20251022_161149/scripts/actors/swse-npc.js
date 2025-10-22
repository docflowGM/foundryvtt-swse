// ============================================
// FILE: scripts/actors/swse-npc.js
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";

export class SWSENPCSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "npc"],
      template: "systems/swse/templates/actors/npc-sheet.hbs"
    });
  }

  getData() {
    const data = super.getData();
    data.labels = data.labels || {};
    data.labels.sheetTitle = game.i18n.localize("SWSE.SheetLabel.npc") || "NPC";
    
    // NPC-specific data processing
    data.roleTypes = {
      minion: "Minion",
      standard: "Standard",
      elite: "Elite",
      boss: "Boss"
    };
    
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Quick action buttons for NPCs
    html.find('.quick-attack').click(this._onQuickAttack.bind(this));
    html.find('.quick-save').click(this._onQuickSave.bind(this));
    html.find('.import-statblock').click(this._onImportStatBlock.bind(this));
  }

  async _onQuickAttack(event) {
    event.preventDefault();
    // Quick attack roll for NPCs
    const bab = this.actor.system.bab || 0;
    const mod = this.actor.system.abilities?.str?.mod || 0;
    const roll = new Roll(`1d20 + ${bab + mod}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "Quick Attack"
    });
  }

  async _onQuickSave(event) {
    event.preventDefault();
    const defense = event.currentTarget.dataset.defense;
    const def = this.actor.system.defenses?.[defense];
    if (!def) return;
    
    ui.notifications.info(`${this.actor.name} ${defense} defense: ${def.total}`);
  }

  async _onImportStatBlock(event) {
    event.preventDefault();
    ui.notifications.warn("Stat block import not yet implemented");
  }
}
