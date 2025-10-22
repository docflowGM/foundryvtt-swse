// ============================================
// FILE: scripts/swse-npc.js
// SWSE NPC Sheet with proper integration
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";

export class SWSENPCSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "npc", "npc-sheet"],
      template: "systems/swse/templates/actors/npc-sheet.hbs",
      width: 800,
      height: 700
    });
  }

  getData() {
    const context = super.getData();
    
    // Add NPC-specific data
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.feats = this.actor.items.filter(i => i.type === "feat");
    context.talents = this.actor.items.filter(i => i.type === "talent");
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Quick actions
    html.find('.quick-attack').click(this._onQuickAttack.bind(this));
    html.find('.quick-save').click(this._onQuickSave.bind(this));
    html.find('.import-statblock').click(this._onImportStatBlock.bind(this));

    // Weapon management
    html.find('.add-weapon').click(this._onAddWeapon.bind(this));
    html.find('.remove-weapon').click(this._onRemoveWeapon.bind(this));
    html.find('.roll-weapon').click(this._onRollWeapon.bind(this));
  }

  async _onQuickAttack(event) {
    event.preventDefault();
    
    const bab = this.actor.system.bab || 0;
    const level = this.actor.system.level || 1;
    const dexMod = this.actor.system.abilities?.dex?.mod || 0;
    
    const attackBonus = Math.floor(level / 2) + bab + dexMod;
    const roll = new Roll(`1d20 + ${attackBonus}`);
    
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "Quick Attack"
    });
  }

  async _onQuickSave(event) {
    event.preventDefault();
    
    const defense = event.currentTarget.dataset.defense;
    if (!defense) return;
    
    const defenseValue = this.actor.system.defenses?.[defense]?.total || 10;
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<strong>${defense.toUpperCase()} Defense:</strong> ${defenseValue}`
    });
  }

  async _onImportStatBlock(event) {
    event.preventDefault();
    
    const statBlock = this.actor.system.statBlock || "";
    
    if (!statBlock || statBlock.trim() === "") {
      ui.notifications.warn("No stat block text to import!");
      return;
    }
    
    ui.notifications.info("Stat block import feature coming soon!");
    // TODO: Parse stat block and update actor
  }

  async _onAddWeapon(event) {
    event.preventDefault();
    
    // Check if using system weapons array or Items
    if (this.actor.system.weapons && Array.isArray(this.actor.system.weapons)) {
      const weapons = foundry.utils.duplicate(this.actor.system.weapons);
      weapons.push({ 
        name: "New Weapon", 
        damage: "1d8", 
        attackAttr: "str",
        modifier: 0
      });
      await this.actor.update({ "system.weapons": weapons });
    } else {
      await this.actor.createEmbeddedDocuments("Item", [{
        name: "New Weapon",
        type: "weapon",
        system: { damage: "1d8", attackBonus: 0 }
      }]);
    }
  }

  async _onRemoveWeapon(event) {
    event.preventDefault();
    
    const index = event.currentTarget.closest('[data-index]')?.dataset.index;
    const itemId = event.currentTarget.closest('[data-item-id]')?.dataset.itemId;
    
    if (index !== undefined) {
      const weapons = foundry.utils.duplicate(this.actor.system.weapons);
      weapons.splice(Number(index), 1);
      await this.actor.update({ "system.weapons": weapons });
    } else if (itemId) {
      const item = this.actor.items.get(itemId);
      if (item) await item.delete();
    }
  }

  async _onRollWeapon(event) {
    event.preventDefault();
    
    const index = event.currentTarget.closest('[data-index]')?.dataset.index;
    const itemId = event.currentTarget.closest('[data-item-id]')?.dataset.itemId;
    
    if (index !== undefined) {
      // System weapon array
      const weapon = this.actor.system.weapons?.[Number(index)];
      if (!weapon) return;
      
      const abs = this.actor.system.abilities || {};
      const halfLevel = this.actor.getHalfLevel();
      const bab = this.actor.system.bab || 0;
      const atkMod = halfLevel + bab + (abs[weapon.attackAttr]?.mod || 0) + (weapon.modifier || 0);
      
      const atkRoll = await new Roll(`1d20 + ${atkMod}`).evaluate({async: true});
      await atkRoll.toMessage({ 
        speaker: ChatMessage.getSpeaker({actor: this.actor}), 
        flavor: `${weapon.name} Attack` 
      });
      
      const dmgRoll = await new Roll(weapon.damage).evaluate({async: true});
      await dmgRoll.toMessage({ 
        speaker: ChatMessage.getSpeaker({actor: this.actor}), 
        flavor: `${weapon.name} Damage` 
      });
    } else if (itemId) {
      // Item document
      const weapon = this.actor.items.get(itemId);
      if (!weapon) return;
      
      const bab = this.actor.system.bab || 0;
      const halfLevel = Math.floor(this.actor.system.level / 2);
      const abilityMod = weapon.system.ability ? 
        this.actor.system.abilities[weapon.system.ability]?.mod || 0 : 0;
      const attackBonus = weapon.system.attackBonus || 0;
      
      const total = bab + halfLevel + abilityMod + attackBonus;
      
      const attackRoll = new Roll(`1d20 + ${total}`);
      const damageRoll = new Roll(weapon.system.damage || "1d6");
      
      attackRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${weapon.name} - Attack Roll`
      });
      
      damageRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${weapon.name} - Damage Roll`
      });
    }
  }
}
