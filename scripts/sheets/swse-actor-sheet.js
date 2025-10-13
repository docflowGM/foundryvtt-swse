// ============================================
// FILE: scripts/sheets/swse-actor-sheet.js
// Connects the HTML character sheet to Foundry VTT
// ============================================

export default class SWSEActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "character"],
      template: "systems/swse/templates/actors/character-sheet.hbs",
      width: 1200,
      height: 800,
      tabs: [{
        navSelector: ".tab",
        contentSelector: ".tab-content",
        initial: "armor"
      }],
      resizable: true,
      scrollY: [".tab-content"]
    });
  }

  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // Calculate derived values
    context.halfLevel = Math.floor(context.system.level / 2);
    
    // Calculate ability modifiers
    for (let [key, ability] of Object.entries(context.system.abilities)) {
      ability.mod = Math.floor((ability.total - 10) / 2);
      ability.label = key.toUpperCase();
    }
    
    // Calculate damage threshold
    context.damageThreshold = this._calculateDamageThreshold(context);
    
    // Calculate second wind healing
    if (context.system.secondWind) {
      const hpMax = context.system.hp.max || 1;
      const conMod = context.system.abilities.con.mod || 0;
      const misc = context.system.secondWind.misc || 0;
      context.system.secondWind.healing = Math.max(
        Math.floor(hpMax / 4),
        conMod
      ) + misc;
    }
    
    // Organize items by type
    context.armor = this.actor.items.filter(i => i.type === "armor");
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.forcePowers = this.actor.items.filter(i => i.type === "forcepower");
    context.feats = this.actor.items.filter(i => i.type === "feat");
    context.talents = this.actor.items.filter(i => i.type === "talent");
    context.equipment = this.actor.items.filter(i => i.type === "equipment");
    
    // Load available races for dropdown
    context.races = this._getRacesList();
    
    // Add skills
    context.skills = this._calculateSkills(context);
    
    return context;
  }

  _calculateDamageThreshold(context) {
    const fortDef = context.system.defenses?.fortitude?.total || 10;
    const misc = context.system.damageThresholdMisc || 0;
    return fortDef + misc;
  }

  _getRacesList() {
    // Return list of available species/races
    return {
      human: { name: "Human", bonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } },
      twilek: { name: "Twi'lek", bonuses: { dex: 2, cha: 2 } },
      wookiee: { name: "Wookiee", bonuses: { str: 4, con: 2, int: -2 } },
      zabrak: { name: "Zabrak", bonuses: { con: 2, wis: 2 } },
      bothan: { name: "Bothan", bonuses: { dex: 2, int: 2 } }
    };
  }

  _calculateSkills(context) {
    const skills = context.system.skills || {};
    const halfLevel = Math.floor(context.system.level / 2);
    const abilities = context.system.abilities;
    
    // Define SWSE skills with their key abilities
    const skillDefinitions = {
      acrobatics: { ability: "dex", label: "Acrobatics" },
      climb: { ability: "str", label: "Climb" },
      deception: { ability: "cha", label: "Deception" },
      endurance: { ability: "con", label: "Endurance" },
      gatherInfo: { ability: "cha", label: "Gather Information" },
      initiative: { ability: "dex", label: "Initiative" },
      jump: { ability: "str", label: "Jump" },
      knowledge_galacticLore: { ability: "int", label: "Knowledge (Galactic Lore)" },
      knowledge_bureaucracy: { ability: "int", label: "Knowledge (Bureaucracy)" },
      knowledge_lifeSciences: { ability: "int", label: "Knowledge (Life Sciences)" },
      knowledge_physicalSciences: { ability: "int", label: "Knowledge (Physical Sciences)" },
      knowledge_socialSciences: { ability: "int", label: "Knowledge (Social Sciences)" },
      knowledge_tactics: { ability: "int", label: "Knowledge (Tactics)" },
      knowledge_technology: { ability: "int", label: "Knowledge (Technology)" },
      mechanics: { ability: "int", label: "Mechanics" },
      perception: { ability: "wis", label: "Perception" },
      persuasion: { ability: "cha", label: "Persuasion" },
      pilot: { ability: "dex", label: "Pilot" },
      ride: { ability: "dex", label: "Ride" },
      stealth: { ability: "dex", label: "Stealth" },
      survival: { ability: "wis", label: "Survival" },
      swim: { ability: "str", label: "Swim" },
      treatInjury: { ability: "wis", label: "Treat Injury" },
      useComputer: { ability: "int", label: "Use Computer" },
      useTheForce: { ability: "cha", label: "Use the Force" }
    };
    
    const calculatedSkills = [];
    
    for (let [key, def] of Object.entries(skillDefinitions)) {
      const skillData = skills[key] || { trained: false, focus: false, misc: 0 };
      const abilityMod = abilities[def.ability]?.mod || 0;
      const trained = skillData.trained ? 5 : 0;
      const focus = skillData.focus ? 5 : 0;
      const misc = skillData.misc || 0;
      
      const total = abilityMod + halfLevel + trained + focus + misc;
      
      calculatedSkills.push({
        key: key,
        label: def.label,
        ability: def.ability.toUpperCase(),
        abilityMod: abilityMod,
        halfLevel: halfLevel,
        trained: skillData.trained,
        focus: skillData.focus,
        misc: misc,
        total: total
      });
    }
    
    return calculatedSkills;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Make sheet editable only for owner
    if (!this.isEditable) return;

    // Tab switching
    html.find('.tab[data-tab]').click(this._onTabClick.bind(this));

    // Ability score changes
    html.find('input[name^="system.abilities"]').change(this._onAbilityChange.bind(this));

    // Roll ability checks
    html.find('.ability-mod').click(this._onAbilityRoll.bind(this));

    // HP/Force Point changes
    html.find('input[name="system.hp.value"]').change(this._onHPChange.bind(this));
    html.find('input[name^="system.forcePoints"]').change(this._onForcePointChange.bind(this));

    // Second Wind
    html.find('.apply-second-wind').click(this._onSecondWind.bind(this));

    // Defense recalculations
    html.find('input[name^="system.defenses"]').change(this._onDefenseChange.bind(this));

    // Item management
    html.find('.add-armor').click(this._onAddItem.bind(this, "armor"));
    html.find('.add-weapon').click(this._onAddItem.bind(this, "weapon"));
    html.find('.add-feat').click(this._onAddItem.bind(this, "feat"));

    // Force power actions
    html.find('.roll-forcepower').click(this._onUseForcePower.bind(this));
    html.find('.reload-forcepower').click(this._onReloadForcePower.bind(this));
    html.find('.refresh-forcepowers').click(this._onRefreshAllPowers.bind(this));

    // Weapon attacks
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

    // Drag and drop
    this._activateDragDrop(html);
  }

  _onTabClick(event) {
    event.preventDefault();
    const target = event.currentTarget.dataset.tab;
    
    // Update active tab
    const tabs = event.currentTarget.closest('.tab-row').querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Show corresponding content
    const contents = event.currentTarget.closest('.tabs').querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));
    const targetContent = event.currentTarget.closest('.tabs').querySelector(`#${target}-tab`);
    if (targetContent) targetContent.classList.add('active');
  }

  async _onAbilityChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const abilityKey = element.name.split('.')[2]; // system.abilities.str.base
    
    // Recalculate total and mod
    const base = parseInt(element.value) || 10;
    const racial = this.actor.system.abilities[abilityKey].racial || 0;
    const temp = this.actor.system.abilities[abilityKey].temp || 0;
    const total = base + racial + temp;
    const mod = Math.floor((total - 10) / 2);
    
    await this.actor.update({
      [`system.abilities.${abilityKey}.base`]: base,
      [`system.abilities.${abilityKey}.total`]: total,
      [`system.abilities.${abilityKey}.mod`]: mod
    });
  }

  _onAbilityRoll(event) {
    event.preventDefault();
    const abilityKey = event.currentTarget.closest('.ability-row')?.querySelector('.ability-label')?.textContent.toLowerCase();
    
    if (!abilityKey) return;
    
    const ability = this.actor.system.abilities[abilityKey];
    if (!ability) return;
    
    const mod = ability.mod || 0;
    const roll = new Roll(`1d20 + ${mod}`);
    
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${abilityKey.toUpperCase()} Check`
    });
  }

  async _onHPChange(event) {
    event.preventDefault();
    const value = parseInt(event.currentTarget.value) || 0;
    const max = this.actor.system.hp.max;
    
    // Warn if HP drops to 0 or below
    if (value <= 0) {
      ui.notifications.warn(`${this.actor.name} has been reduced to 0 HP or below!`);
    }
    
    await this.actor.update({ "system.hp.value": Math.min(value, max) });
  }

  async _onForcePointChange(event) {
    event.preventDefault();
    // Update happens automatically via parent class
  }

  async _onSecondWind(event) {
    event.preventDefault();
    
    const currentHP = this.actor.system.hp.value;
    const maxHP = this.actor.system.hp.max;
    const uses = this.actor.system.secondWind.uses || 0;
    const healing = this.actor.system.secondWind.healing || 0;
    
    if (uses <= 0) {
      ui.notifications.warn("No Second Wind uses remaining!");
      return;
    }
    
    const newHP = Math.min(currentHP + healing, maxHP);
    
    await this.actor.update({
      "system.hp.value": newHP,
      "system.secondWind.uses": uses - 1
    });
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.actor.name} takes a Second Wind and recovers ${healing} HP!`
    });
  }

  async _onDefenseChange(event) {
    event.preventDefault();
    // Defenses recalculate automatically via getData
    this.render(false);
  }

  async _onAddItem(type, event) {
    event.preventDefault();
    
    const itemData = {
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type,
      system: {}
    };
    
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  async _onUseForcePower(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.forcepower-entry').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const currentUses = item.system.uses?.current || 0;
    
    if (currentUses <= 0) {
      ui.notifications.warn(`${item.name} has no uses remaining!`);
      return;
    }
    
    // Roll Use the Force check
    const utfSkill = this.actor.system.skills.useTheForce || {};
    const abilityMod = this.actor.system.abilities.cha.mod || 0;
    const halfLevel = Math.floor(this.actor.system.level / 2);
    const trained = utfSkill.trained ? 5 : 0;
    const focus = utfSkill.focus ? 5 : 0;
    const misc = utfSkill.misc || 0;
    const total = abilityMod + halfLevel + trained + focus + misc;
    
    const roll = new Roll(`1d20 + ${total}`);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${item.name} - Use the Force Check`
    });
    
    await item.update({ "system.uses.current": currentUses - 1 });
  }

  async _onReloadForcePower(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.forcepower-entry').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const currentFP = this.actor.system.forcePoints.value || 0;
    
    if (currentFP <= 0) {
      ui.notifications.warn("No Force Points remaining!");
      return;
    }
    
    const maxUses = item.system.uses?.max || 1;
    
    await Promise.all([
      item.update({ "system.uses.current": maxUses }),
      this.actor.update({ "system.forcePoints.value": currentFP - 1 })
    ]);
    
    ui.notifications.info(`${item.name} reloaded! (1 Force Point spent)`);
  }

  async _onRefreshAllPowers(event) {
    event.preventDefault();
    
    const powers = this.actor.items.filter(i => i.type === "forcepower");
    
    for (let power of powers) {
      const maxUses = power.system.uses?.max || 1;
      await power.update({ "system.uses.current": maxUses });
    }
    
    ui.notifications.info("All Force Powers refreshed!");
  }

  async _onWeaponAttack(event) {
    event.preventDefault();
    const weaponIndex = event.currentTarget.closest('.weapon-entry').dataset.index;
    const weapon = this.actor.system.weapons?.[weaponIndex];
    
    if (!weapon) return;
    
    const bab = this.actor.system.bab || 0;
    const halfLevel = Math.floor(this.actor.system.level / 2);
    const abilityMod = weapon.ability ? this.actor.system.abilities[weapon.ability].mod : 0;
    const attackBonus = weapon.attackBonus || 0;
    
    const total = bab + halfLevel + abilityMod + attackBonus;
    
    const attackRoll = new Roll(`1d20 + ${total}`);
    const damageRoll = new Roll(weapon.damage || "1d6");
    
    attackRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${weapon.name} - Attack Roll`
    });
    
    damageRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${weapon.name} - Damage Roll`
    });
  }

  async _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('[data-item-id]').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) item.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('[data-item-id]').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      const confirmed = await Dialog.confirm({
        title: "Delete Item",
        content: `<p>Delete ${item.name}?</p>`
      });
      
      if (confirmed) await item.delete();
    }
  }

  async _onSaveSheet(event) {
    event.preventDefault();
    
    // Save current sheet state to flags
    const sheetData = {
      abilities: this.actor.system.abilities,
      skills: this.actor.system.skills,
      hp: this.actor.system.hp,
      defenses: this.actor.system.defenses,
      timestamp: Date.now()
    };
    
    await this.actor.setFlag("swse", "savedSheet", sheetData);
    ui.notifications.info("Sheet data saved!");
  }

  async _onLoadSheet(event) {
    event.preventDefault();
    
    const savedData = this.actor.getFlag("swse", "savedSheet");
    
    if (!savedData) {
      ui.notifications.warn("No saved sheet data found!");
      return;
    }
    
    await this.actor.update({ "system": savedData });
    ui.notifications.info("Sheet data loaded!");
  }

  async _onSkillTrainedToggle(event) {
    const skillKey = event.currentTarget.dataset.skill;
    const trained = event.currentTarget.checked;
    
    await this.actor.update({
      [`system.skills.${skillKey}.trained`]: trained
    });
  }

  async _onSkillFocusToggle(event) {
    const skillKey = event.currentTarget.dataset.skill;
    const focus = event.currentTarget.checked;
    
    await this.actor.update({
      [`system.skills.${skillKey}.focus`]: focus
    });
  }

  _activateDragDrop(html) {
    const handler = ev => this._onDragStart(ev);
    html.find('.item').each((i, li) => {
      if (li.classList.contains("inventory-header")) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });
  }
}