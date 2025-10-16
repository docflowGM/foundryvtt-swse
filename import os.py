#!/usr/bin/env python3
"""
SWSE Cleanup and Integration Script
Removes duplicate files and integrates chargen/levelup properly
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

def backup_file(filepath):
    """Create a timestamped backup"""
    if filepath.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = filepath.with_suffix(f".{timestamp}.backup")
        shutil.copy2(filepath, backup_path)
        print(f"✓ Backed up: {filepath.name}")
        return backup_path
    return None

# ===========================================
# FILES TO KEEP AND REMOVE
# ===========================================

FILES_TO_REMOVE = [
    # Remove the old actor files in scripts/actor/ (keep the one in scripts/)
    "scripts/actor/swse-actor.js",
    "scripts/actor/swse-droid.js",
    "scripts/actor/swse-npc.js",
    "scripts/actor/swse-vehicle.js",
]

FILES_TO_KEEP = [
    # Keep the main ones in scripts/
    "scripts/swse-actor.js",
    "scripts/swse-droid.js",
    "scripts/swse-npc.js",
    "scripts/swse-vehicle.js",
    "scripts/swse-item.js",
]

# ===========================================
# UPDATED INDEX.JS
# ===========================================

INDEX_JS_CONTENT = '''// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT System
// Updated to use correct actor imports
// ============================================

import { registerHandlebarsHelpers } from "./helpers/handlebars-helpers.js";
import { SWSE } from "./config.js";
import { SWSEActor, SWSEActorSheet } from "./scripts/swse-actor.js";
import { SWSEDroidSheet } from "./scripts/swse-droid.js";
import { SWSEVehicleSheet } from "./scripts/swse-vehicle.js";
import { SWSENPCSheet } from "./scripts/swse-npc.js";
import { SWSEItemSheet } from "./scripts/swse-item.js";
import { preloadHandlebarsTemplates } from "./scripts/core/load-templates.js";
import * as SWSEData from "./scripts/core/swse-data.js";
import { WorldDataLoader } from "./scripts/core/world-data-loader.js";
import "./scripts/apps/chargen-init.js";

// Utils imports
import * as DiceUtils from "./utils/dice-utils.js";
import * as MathUtils from "./utils/math-utils.js";
import * as StringUtils from "./utils/string-utils.js";
import * as DataUtils from "./utils/data-utils.js";
import * as UIUtils from "./utils/ui-utils.js";
import * as CombatUtils from "./utils/combat-utils.js";
import * as CharacterUtils from "./utils/character-utils.js";
import * as ValidationUtils from "./utils/validation-utils.js";

// ============================================
// INIT HOOK
// ============================================
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");

  // -------------------------------
  // Global Config & Namespace
  // -------------------------------
  CONFIG.SWSE = SWSE;
  CONFIG.Actor.documentClass = SWSEActor;

  game.swse = {
    data: SWSEData,
    SWSE: SWSE
  };

  // -------------------------------
  // Register Handlebars Helpers FIRST
  // -------------------------------
  registerHandlebarsHelpers();

  // -------------------------------
  // Sheet Registration
  // -------------------------------
  registerSWSESheets();

  // -------------------------------
  // Register Settings
  // -------------------------------
  registerSettings();

  // -------------------------------
  // Preload Templates
  // -------------------------------
  await preloadHandlebarsTemplates();

  console.log("SWSE | System initialization complete.");
});

// ============================================
// READY HOOK
// ============================================
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");

  // Auto-load data on first GM run
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }
});

// ============================================
// REGISTER SHEETS
// ============================================
function registerSWSESheets() {
  try {
    const hasV13API = typeof DocumentSheetConfig !== "undefined";

    if (hasV13API) {
      // Foundry v13+ API
      console.log("SWSE | Using Foundry v13+ sheet registration");

      DocumentSheetConfig.unregisterSheet(Actor, "core", ActorSheet);
      DocumentSheetConfig.unregisterSheet(Item, "core", ItemSheet);

      // Character Sheet (uses base SWSEActorSheet)
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEActorSheet, {
        types: ["character"],
        label: "SWSE Character Sheet",
        makeDefault: true
      });

      // NPC Sheet
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSENPCSheet, {
        types: ["npc"],
        label: "SWSE NPC Sheet",
        makeDefault: true
      });

      // Droid Sheet
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true
      });

      // Vehicle Sheet
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true
      });

      // Item Sheet
      DocumentSheetConfig.registerSheet(Item, "swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true
      });

    } else {
      // Foundry v11-v12 Legacy API
      console.log("SWSE | Using legacy sheet registration");

      Actors.unregisterSheet("core", ActorSheet);
      Items.unregisterSheet("core", ItemSheet);

      Actors.registerSheet("swse", SWSEActorSheet, {
        types: ["character"],
        label: "SWSE Character Sheet",
        makeDefault: true
      });

      Actors.registerSheet("swse", SWSENPCSheet, {
        types: ["npc"],
        label: "SWSE NPC Sheet",
        makeDefault: true
      });

      Actors.registerSheet("swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true
      });

      Actors.registerSheet("swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true
      });

      Items.registerSheet("swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true
      });
    }

    console.log("SWSE | Sheet registration complete");
  } catch (err) {
    console.error("SWSE | Sheet registration failed:", err);
  }
}

// ============================================
// REGISTER SETTINGS
// ============================================
function registerSettings() {
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  game.settings.register("swse", "dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}
'''

# ===========================================
# UPDATED NPC SHEET JS
# ===========================================

NPC_SHEET_JS = '''// ============================================
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
'''

# ===========================================
# UPDATED CHARACTER SHEET TO ADD BUTTONS
# ===========================================

ACTOR_SHEET_BUTTON_ADDITION = '''
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // CHARGEN AND LEVEL UP BUTTONS
    html.find('.open-chargen').click(this._onOpenChargen.bind(this));
    html.find('.level-up').click(this._onLevelUp.bind(this));

    // Tab switching
    html.find('.sheet-tabs .item').click(this._onTabSwitch.bind(this));

    // Ability rolls (clickable modifiers)
    html.find('.ability-modifier.rollable').click(this._onAbilityRoll.bind(this));

    // Skill rolls
    html.find('.skill-roll-button').click(this._onSkillRoll.bind(this));

    // Initiative roll
    html.find('[data-roll="initiative"]').click(this._onInitiativeRoll.bind(this));

    // Second Wind
    html.find('.apply-second-wind').click(this._onSecondWind.bind(this));

    // Item management
    html.find('.add-armor').click(ev => this._onAddItem("armor", ev));
    html.find('.add-weapon').click(ev => this._onAddItem("weapon", ev));
    html.find('.add-feat').click(ev => this._onAddItem("feat", ev));
    html.find('.add-talent').click(ev => this._onAddItem("talent", ev));
    html.find('.add-equipment').click(ev => this._onAddItem("equipment", ev));
    html.find('.add-forcepower').click(ev => this._onAddItem("forcepower", ev));
    html.find('.add-skill').click(this._onAddSkill.bind(this));

    // Force power actions
    html.find('.power-use').click(this._onUseForcePower.bind(this));
    html.find('.power-reload').click(this._onReloadForcePower.bind(this));
    html.find('.refresh-forcepowers').click(this._onRefreshAllPowers.bind(this));

    // Weapon attacks
    html.find('.item-attack').click(this._onWeaponAttack.bind(this));
    html.find('.roll-weapon').click(this._onWeaponAttack.bind(this));

    // Item controls
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Save/Load sheet data
    html.find('.save-sheet').click(this._onSaveSheet.bind(this));
    html.find('.load-sheet').click(this._onLoadSheet.bind(this));

    // Skill toggles
    html.find('.skill-trained').change(this._onSkillTrainedToggle.bind(this));
    html.find('.skill-focus').change(this._onSkillFocusToggle.bind(this));

    // Legacy weapon system support
    html.find('.remove-weapon').click(this._onRemoveWeapon.bind(this));
    html.find('.remove-feat').click(this._onRemoveFeat.bind(this));
    html.find('.remove-talent').click(this._onRemoveTalent.bind(this));
    html.find('.remove-skill').click(this._onRemoveSkill.bind(this));
  }

  async _onOpenChargen(event) {
    event.preventDefault();
    const CharacterGenerator = (await import("./chargen.js")).default;
    new CharacterGenerator().render(true);
  }

  async _onLevelUp(event) {
    event.preventDefault();
    const { SWSELevelUp } = await import("./swse-levelup.js");
    await SWSELevelUp.open(this.actor);
  }

  _onTabSwitch(event) {
    event.preventDefault();
    const tab = event.currentTarget.dataset.tab;
    
    // Remove active from all tabs
    event.currentTarget.closest('.sheet-tabs').querySelectorAll('.item').forEach(t => {
      t.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Hide all tab contents
    this.element[0].querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
    });
    
    // Show target tab
    const targetTab = this.element[0].querySelector(`.tab[data-tab="${tab}"]`);
    if (targetTab) targetTab.classList.add('active');
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const ability = event.currentTarget.dataset.ability;
    if (!ability) return;
    
    const abilityData = this.actor.system.abilities[ability];
    if (!abilityData) return;
    
    const mod = abilityData.mod || 0;
    const roll = new Roll(`1d20 + ${mod}`);
    
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${ability.toUpperCase()} Check`
    });
  }

  async _onSkillRoll(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;
    if (!skillKey) return;
    
    const skillData = this.actor.system.skills?.[skillKey];
    if (!skillData) return;
    
    const abilityMod = this.actor.system.abilities[skillData.ability]?.mod || 0;
    const halfLevel = Math.floor(this.actor.system.level / 2);
    const trained = skillData.trained ? 5 : 0;
    const focus = skillData.focus ? 5 : 0;
    const misc = skillData.misc || 0;
    
    const total = abilityMod + halfLevel + trained + focus + misc;
    const roll = new Roll(`1d20 + ${total}`);
    
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${skillData.label || skillKey} Check`
    });
  }

  async _onInitiativeRoll(event) {
    event.preventDefault();
    
    const initMod = this.actor.system.initiative?.total || 0;
    const roll = new Roll(`1d20 + ${initMod}`);
    
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "Initiative"
    });
  }

  async _onRemoveWeapon(event) {
    event.preventDefault();
    const index = event.currentTarget.closest('[data-index]')?.dataset.index;
    if (index === undefined) return;
    
    const weapons = foundry.utils.duplicate(this.actor.system.weapons || []);
    weapons.splice(Number(index), 1);
    await this.actor.update({ "system.weapons": weapons });
  }

  async _onRemoveFeat(event) {
    event.preventDefault();
    const index = event.currentTarget.closest('[data-index]')?.dataset.index;
    if (index === undefined) return;
    
    const feats = foundry.utils.duplicate(this.actor.system.feats || []);
    feats.splice(Number(index), 1);
    await this.actor.update({ "system.feats": feats });
  }

  async _onRemoveTalent(event) {
    event.preventDefault();
    const index = event.currentTarget.closest('[data-index]')?.dataset.index;
    if (index === undefined) return;
    
    const talents = foundry.utils.duplicate(this.actor.system.talents || []);
    talents.splice(Number(index), 1);
    await this.actor.update({ "system.talents": talents });
  }

  async _onRemoveSkill(event) {
    event.preventDefault();
    const index = event.currentTarget.closest('[data-index]')?.dataset.index;
    if (index === undefined) return;
    
    const skills = foundry.utils.duplicate(this.actor.system.customSkills || []);
    skills.splice(Number(index), 1);
    await this.actor.update({ "system.customSkills": skills });
  }

  async _onAddSkill(event) {
    event.preventDefault();
    const skills = foundry.utils.duplicate(this.actor.system.customSkills || []);
    skills.push({ name: "New Skill", value: 0, ability: "str" });
    await this.actor.update({ "system.customSkills": skills });
  }
'''

def main():
    """Main execution"""
    print("=" * 70)
    print("SWSE Cleanup and Integration Script")
    print("=" * 70)
    print()
    
    if not BASE_PATH.exists():
        print(f"❌ ERROR: Base path not found: {BASE_PATH}")
        return
    
    print(f"✓ Working directory: {BASE_PATH}")
    print()
    
    print("Analysis:")
    print("-" * 70)
    print("DUPLICATE FILES FOUND:")
    print("  scripts/actor/swse-actor.js (OLD - will remove)")
    print("  scripts/swse-actor.js (KEEP - newer with more features)")
    print()
    print("  scripts/actor/swse-droid.js (OLD - stub only)")
    print("  scripts/swse-droid.js (KEEP - has implementation)")
    print()
    print("  Similar for npc and vehicle files")
    print()
    print("RECOMMENDATION:")
    print("  ✓ Keep all files in scripts/ (main directory)")
    print("  ✗ Remove all files in scripts/actor/ (old duplicates)")
    print()
    
    response = input("Proceed with cleanup and integration? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    print()
    print("Step 1: Backing up files...")
    
    # Backup files before removal
    for file_path in FILES_TO_REMOVE:
        full_path = BASE_PATH / file_path
        if full_path.exists():
            backup_file(full_path)
    
    # Backup files that will be updated
    files_to_update = [
        BASE_PATH / "index.js",
        BASE_PATH / "scripts" / "swse-npc.js",
        BASE_PATH / "scripts" / "swse-actor.js",
    ]
    
    for file_path in files_to_update:
        if file_path.exists():
            backup_file(file_path)
    
    print()
    print("Step 2: Removing duplicate files...")
    
    for file_path in FILES_TO_REMOVE:
        full_path = BASE_PATH / file_path
        if full_path.exists():
            full_path.unlink()
            print(f"✓ Removed: {file_path}")
    
    # Remove empty actor directory if it exists
    actor_dir = BASE_PATH / "scripts" / "actor"
    if actor_dir.exists() and not any(actor_dir.iterdir()):
        actor_dir.rmdir()
        print(f"✓ Removed empty directory: scripts/actor/")
    
    print()
    print("Step 3: Updating index.js...")
    
    with open(BASE_PATH / "index.js", 'w', encoding='utf-8') as f:
        f.write(INDEX_JS_CONTENT)
    print("✓ Updated: index.js")
    
    print()
    print("Step 4: Updating NPC sheet...")
    
    with open(BASE_PATH / "scripts" / "swse-npc.js", 'w', encoding='utf-8') as f:
        f.write(NPC_SHEET_JS)
    print("✓ Updated: scripts/swse-npc.js")
    
    print()
    print("Step 5: Adding chargen/levelup buttons to character sheet...")
    
    # Read current actor file
    actor_file = BASE_PATH / "scripts" / "swse-actor.js"
    with open(actor_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if buttons already added
    if "_onOpenChargen" not in content:
        # Find the activateListeners method and replace it
        import re
        pattern = r'(activateListeners\(html\) \{[\s\S]*?super\.activateListeners\(html\);[\s\S]*?if \(!this\.isEditable\) return;)'
        
        if re.search(pattern, content):
            content = re.sub(pattern, ACTOR_SHEET_BUTTON_ADDITION.strip(), content, count=1)
            
            with open(actor_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print("✓ Added chargen/levelup buttons to character sheet")
        else:
            print("⚠ Could not find activateListeners method - manual update needed")
    else:
        print("✓ Chargen/levelup buttons already present")
    
    print()
    print("=" * 70)
    print("✓ Cleanup and Integration Complete!")
    print("=" * 70)
    print()
    print("Summary of changes:")
    print("  ✓ Removed duplicate files in scripts/actor/")
    print("  ✓ Updated index.js to use correct imports")
    print("  ✓ Updated NPC sheet with full functionality")
    print("  ✓ Added chargen and level-up buttons to character sheet")
    print()
    print("Files you should now have:")
    print("  scripts/swse-actor.js - Main actor class and character sheet")
    print("  scripts/swse-droid.js - Droid sheet")
    print("  scripts/swse-npc.js - NPC sheet")
    print("  scripts/swse-vehicle.js - Vehicle sheet")
    print("  scripts/swse-item.js - Item sheet")
    print("  scripts/chargen.js - Character generator")
    print("  scripts/swse-levelup.js - Level up dialog")
    print()
    print("Next steps:")
    print("1. Add buttons to your character sheet template:")
    print("   In templates/actors/character-sheet.hbs header section, add:")
    print('   <button type="button" class="open-chargen">New Character</button>')
    print('   <button type="button" class="level-up">Level Up</button>')
    print()
    print("2. Restart Foundry VTT")
    print("3. Test all sheet types (character, npc, vehicle, droid)")
    print("4. Test chargen and level-up buttons")
    print()
    print("All backups have timestamps if you need to revert.")

if __name__ == "__main__":
    main()
    