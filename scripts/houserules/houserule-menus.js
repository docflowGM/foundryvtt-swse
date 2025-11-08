/**
 * SWSE Houserule Configuration Menus
 * FormApplication classes for complex houserule configuration
 */

// ==========================================
// CHARACTER CREATION MENU
// ==========================================
export class CharacterCreationMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-character-creation-menu",
      title: "Character Creation Rules",
      template: "systems/swse/templates/apps/houserules/character-creation.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "abilities"}]
    });
  }
  
  getData() {
    const data = game.settings.get("swse", "characterCreation");
    return {
      ...data,
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set("swse", "characterCreation", formData);
    ui.notifications.info("Character creation rules updated");
  }
}

// ==========================================
// ADVANCEMENT MENU
// ==========================================
export class AdvancementMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-advancement-menu",
      title: "Advancement Rules",
      template: "systems/swse/templates/apps/houserules/advancement.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "levelup"}]
    });
  }
  
  getData() {
    return {
      talentEveryLevel: game.settings.get("swse", "talentEveryLevel"),
      crossClassSkillTraining: game.settings.get("swse", "crossClassSkillTraining"),
      retrainingEnabled: game.settings.get("swse", "retrainingEnabled"),
      skillFocusRestriction: game.settings.get("swse", "skillFocusRestriction"),
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set("swse", "talentEveryLevel", formData.talentEveryLevel);
    await game.settings.set("swse", "crossClassSkillTraining", formData.crossClassSkillTraining);
    await game.settings.set("swse", "retrainingEnabled", formData.retrainingEnabled);
    await game.settings.set("swse", "skillFocusRestriction", {
      useTheForce: Number(formData["skillFocusRestriction.useTheForce"]),
      scaling: formData["skillFocusRestriction.scaling"]
    });
    ui.notifications.info("Advancement rules updated");
  }
}

// ==========================================
// COMBAT MENU
// ==========================================
export class CombatMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-combat-menu",
      title: "Combat Rules",
      template: "systems/swse/templates/apps/houserules/combat.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "damage"}]
    });
  }
  
  getData() {
    const deathSystem = game.settings.get("swse", "deathSystem");
    return {
      deathSystem: deathSystem,
      secondWindImproved: game.settings.get("swse", "secondWindImproved"),
      armoredDefenseForAll: game.settings.get("swse", "armoredDefenseForAll"),
      weaponRangeMultiplier: game.settings.get("swse", "weaponRangeMultiplier"),
      diagonalMovement: game.settings.get("swse", "diagonalMovement"),
      conditionTrackCap: game.settings.get("swse", "conditionTrackCap"),
      criticalHitVariant: game.settings.get("swse", "criticalHitVariant"),
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    // Parse death system settings
    const deathSystem = {
      system: formData["deathSystem.system"],
      strikesUntilDeath: Number(formData["deathSystem.strikesUntilDeath"]),
      returnToHP: Number(formData["deathSystem.returnToHP"]),
      strikeRemoval: formData["deathSystem.strikeRemoval"],
      displayStrikes: formData["deathSystem.displayStrikes"],
      deathAtNegativeCon: formData["deathSystem.deathAtNegativeCon"],
      massiveDamageThreshold: formData["deathSystem.massiveDamageThreshold"]
    };
    
    await game.settings.set("swse", "deathSystem", deathSystem);
    await game.settings.set("swse", "secondWindImproved", formData.secondWindImproved);
    await game.settings.set("swse", "armoredDefenseForAll", formData.armoredDefenseForAll);
    await game.settings.set("swse", "weaponRangeMultiplier", Number(formData.weaponRangeMultiplier));
    await game.settings.set("swse", "diagonalMovement", formData.diagonalMovement);
    await game.settings.set("swse", "conditionTrackCap", Number(formData.conditionTrackCap));
    await game.settings.set("swse", "criticalHitVariant", formData.criticalHitVariant);
    
    ui.notifications.info("Combat rules updated");
  }
}

// ==========================================
// FORCE MENU
// ==========================================
export class ForceMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-force-menu",
      title: "Force & Destiny Rules",
      template: "systems/swse/templates/apps/houserules/force.hbs",
      width: 600,
      height: "auto"
    });
  }
  
  getData() {
    return {
      forcePointRecovery: game.settings.get("swse", "forcePointRecovery"),
      darkSideTemptation: game.settings.get("swse", "darkSideTemptation"),
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set("swse", "forcePointRecovery", formData.forcePointRecovery);
    await game.settings.set("swse", "darkSideTemptation", formData.darkSideTemptation);
    ui.notifications.info("Force & Destiny rules updated");
  }
}

// ==========================================
// PRESETS MENU
// ==========================================
export class PresetsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-presets-menu",
      title: "Houserule Presets",
      template: "systems/swse/templates/apps/houserules/presets.hbs",
      width: 500,
      height: "auto"
    });
  }
  
  getData() {
    return {
      currentPreset: game.settings.get("swse", "houserulePreset"),
      isGM: game.user.isGM
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find('[data-action="apply-preset"]').click(this._onApplyPreset.bind(this));
    html.find('[data-action="export-settings"]').click(this._onExportSettings.bind(this));
    html.find('[data-action="import-settings"]').click(this._onImportSettings.bind(this));
  }
  
  async _onApplyPreset(event) {
    const preset = event.currentTarget.dataset.preset;
    
    const confirm = await Dialog.confirm({
      title: "Apply Preset?",
      content: `<p>This will overwrite all current houserule settings with the ${preset} preset. Continue?</p>`,
      defaultYes: false
    });
    
    if (!confirm) return;
    
    const presets = await import('./houserule-presets.js');
    await presets.applyPreset(preset);
    
    await game.settings.set("swse", "houserulePreset", preset);
    ui.notifications.info(`Applied ${preset} preset`);
    this.render();
  }
  
  async _onExportSettings(event) {
    const settings = game.settings.get("swse", "characterCreation");
    const blob = new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swse-houserules.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async _onImportSettings(event) {
    new Dialog({
      title: "Import Houserule Settings",
      content: `
        <form>
          <div class="form-group">
            <label>Select JSON file to import:</label>
            <input type="file" name="import-file" accept=".json"/>
          </div>
        </form>
      `,
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: async (html) => {
            const file = html.find('[name="import-file"]')[0].files[0];
            if (!file) return;
            
            const text = await file.text();
            const settings = JSON.parse(text);
            
            // Apply all settings
            for (const [key, value] of Object.entries(settings)) {
              await game.settings.set("swse", key, value);
            }
            
            ui.notifications.info("Settings imported successfully");
            this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "cancel"
    }).render(true);
  }
  
  async _updateObject(event, formData) {
    // This menu doesn't directly save settings
  }
}
