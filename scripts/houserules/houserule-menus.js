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
      template: "systems/foundryvtt-swse/templates/apps/houserules/character-creation.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "abilities"}]
    });
  }
  
  getData() {
    const data = game.settings.get('foundryvtt-swse', "characterCreation");
    return {
      ...data,
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set('foundryvtt-swse', "characterCreation", formData);
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
      template: "systems/foundryvtt-swse/templates/apps/houserules/advancement.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "levelup"}]
    });
  }
  
  getData() {
    return {
      talentEveryLevel: game.settings.get('foundryvtt-swse', "talentEveryLevel"),
      crossClassSkillTraining: game.settings.get('foundryvtt-swse', "crossClassSkillTraining"),
      retrainingEnabled: game.settings.get('foundryvtt-swse', "retrainingEnabled"),
      skillFocusRestriction: game.settings.get('foundryvtt-swse', "skillFocusRestriction"),
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set('foundryvtt-swse', "talentEveryLevel", formData.talentEveryLevel);
    await game.settings.set('foundryvtt-swse', "crossClassSkillTraining", formData.crossClassSkillTraining);
    await game.settings.set('foundryvtt-swse', "retrainingEnabled", formData.retrainingEnabled);
    await game.settings.set('foundryvtt-swse', "skillFocusRestriction", {
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
      template: "systems/foundryvtt-swse/templates/apps/houserules/combat.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "damage"}]
    });
  }
  
  getData() {
    const deathSystem = game.settings.get('foundryvtt-swse', "deathSystem");
    return {
      deathSystem: deathSystem,
      secondWindImproved: game.settings.get('foundryvtt-swse', "secondWindImproved"),
      armoredDefenseForAll: game.settings.get('foundryvtt-swse', "armoredDefenseForAll"),
      weaponRangeMultiplier: game.settings.get('foundryvtt-swse', "weaponRangeMultiplier"),
      diagonalMovement: game.settings.get('foundryvtt-swse', "diagonalMovement"),
      conditionTrackCap: game.settings.get('foundryvtt-swse', "conditionTrackCap"),
      criticalHitVariant: game.settings.get('foundryvtt-swse', "criticalHitVariant"),
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
    
    await game.settings.set('foundryvtt-swse', "deathSystem", deathSystem);
    await game.settings.set('foundryvtt-swse', "secondWindImproved", formData.secondWindImproved);
    await game.settings.set('foundryvtt-swse', "armoredDefenseForAll", formData.armoredDefenseForAll);
    await game.settings.set('foundryvtt-swse', "weaponRangeMultiplier", Number(formData.weaponRangeMultiplier));
    await game.settings.set('foundryvtt-swse', "diagonalMovement", formData.diagonalMovement);
    await game.settings.set('foundryvtt-swse', "conditionTrackCap", Number(formData.conditionTrackCap));
    await game.settings.set('foundryvtt-swse', "criticalHitVariant", formData.criticalHitVariant);
    
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
      template: "systems/foundryvtt-swse/templates/apps/houserules/force.hbs",
      width: 600,
      height: "auto"
    });
  }
  
  getData() {
    return {
      forcePointRecovery: game.settings.get('foundryvtt-swse', "forcePointRecovery"),
      darkSideTemptation: game.settings.get('foundryvtt-swse', "darkSideTemptation"),
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set('foundryvtt-swse', "forcePointRecovery", formData.forcePointRecovery);
    await game.settings.set('foundryvtt-swse', "darkSideTemptation", formData.darkSideTemptation);
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
      template: "systems/foundryvtt-swse/templates/apps/houserules/presets.hbs",
      width: 500,
      height: "auto"
    });
  }
  
  getData() {
    return {
      currentPreset: game.settings.get('foundryvtt-swse', "houserulePreset"),
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
    
    await game.settings.set('foundryvtt-swse', "houserulePreset", preset);
    ui.notifications.info(`Applied ${preset} preset`);
    this.render();
  }
  
  async _onExportSettings(event) {
    const settings = game.settings.get('foundryvtt-swse', "characterCreation");
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
              await game.settings.set('foundryvtt-swse', key, value);
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


// ==========================================
// SKILLS & FEATS MENU
// ==========================================
export class SkillsFeatsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-skills-feats-menu",
      title: "Skills & Feats Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/skills-feats.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "skills"}]
    });
  }
  
  getData() {
    return {
      feintSkill: game.settings.get('foundryvtt-swse', "feintSkill"),
      skillFocusVariant: game.settings.get('foundryvtt-swse', "skillFocusVariant"),
      skillFocusActivationLevel: game.settings.get('foundryvtt-swse', "skillFocusActivationLevel"),
      isGM: game.user.isGM
    };
  }
  
  async _updateObject(event, formData) {
    await game.settings.set('foundryvtt-swse', "feintSkill", formData.feintSkill);
    await game.settings.set('foundryvtt-swse', "skillFocusVariant", formData.skillFocusVariant);
    if (formData.skillFocusActivationLevel) {
      await game.settings.set('foundryvtt-swse', "skillFocusActivationLevel", Number(formData.skillFocusActivationLevel));
    }
    ui.notifications.info("Skills & Feats rules updated");
  }
}

// ==========================================
// SPACE COMBAT MENU
// ==========================================
export class SpaceCombatMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-space-combat-menu",
      title: "Space Combat Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/space-combat.hbs",
      width: 600,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "initiative"}]
    });
  }
  
  getData() {
    return {
      spaceInitiativeSystem: game.settings.get('foundryvtt-swse', "spaceInitiativeSystem"),
      initiativeRolePriority: game.settings.get('foundryvtt-swse', "initiativeRolePriority"),
      weaponsOperatorsRollInit: game.settings.get('foundryvtt-swse', "weaponsOperatorsRollInit"),
      isGM: game.user.isGM
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    // Drag and drop for role priority
    const list = html.find('.role-priority-list')[0];
    if (list) {
      this._setupDragAndDrop(list);
    }
  }
  
  _setupDragAndDrop(list) {
    let draggedElement = null;
    
    list.querySelectorAll('li').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedElement = item;
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
      });
      
      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = this._getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
          list.appendChild(draggedElement);
        } else {
          list.insertBefore(draggedElement, afterElement);
        }
      });
    });
  }
  
  _getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  async _updateObject(event, formData) {
    await game.settings.set('foundryvtt-swse', "spaceInitiativeSystem", formData.spaceInitiativeSystem);
    await game.settings.set('foundryvtt-swse', "weaponsOperatorsRollInit", formData.weaponsOperatorsRollInit);
    
    // Get role priority from list order
    const list = this.element.find('.role-priority-list')[0];
    if (list) {
      const roles = Array.from(list.querySelectorAll('li')).map(li => li.dataset.role);
      await game.settings.set('foundryvtt-swse', "initiativeRolePriority", roles);
    }
    
    ui.notifications.info("Space Combat rules updated");
  }
}

