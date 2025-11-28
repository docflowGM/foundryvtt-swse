import { SWSELogger } from '../utils/logger.js';
/**
 * Base Actor Sheet
 * Provides common functionality for all SWSE actor sheets
 */

import { CombatActionsMapper } from '../combat/utils/combat-actions-mapper.js';
import { CustomItemDialog } from '../apps/custom-item-dialog.js';

export class SWSEActorSheetBase extends ActorSheet {
  
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor'],
      width: 720,
      height: 680,
      resizable: true,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }],
      dragDrop: [{dragSelector: '.item-list .item', dropSelector: null}],
      scrollY: ['.sheet-body']
    });
  }
  
  async getData() {
    const context = super.getData();
    const actor = this.actor;
    const system = actor.system;
    
    // Add actor data
    context.actor = actor;
    context.system = system;
    
    // Organize items by type
    this._prepareItems(context);
    
    // Enrich biography (using non-deprecated API)
    const TextEditorImpl = foundry.applications?.ux?.TextEditor?.implementation || TextEditor;
    context.enrichedBiography = await TextEditorImpl.enrichHTML(
      system.biography || '',
      {
        async: true,
        secrets: actor.isOwner,
        relativeTo: actor
      }
    );
    
    // Convert string numbers to actual numbers to prevent toFixed errors
    this._ensureNumericTypes(context);
    
    // Add useful calculated values
    context.halfLevel = Math.floor((system.level || 1) / 2);
    context.conditionPenalty = actor.conditionPenalty || 0;

    // Add combat actions mapped by skill
    context.skillActions = CombatActionsMapper.getAllActionsBySkill();

    return context;
  }
  
  /**
   * Ensure all numeric fields are actual numbers, not strings
   * Prevents "value.toFixed is not a function" errors in templates
   */
  _ensureNumericTypes(context) {
    if (!context.system) return;
    
    const system = context.system;
    
    // Helper to safely convert to number
    const toNumber = (val, defaultVal = 0) => {
      if (val === null || val === undefined || val === '') return defaultVal;
      const num = Number(val);
      return isNaN(num) ? defaultVal : num;
    };
    
    // Convert top-level numeric fields
    const numericFields = [
      'level', 'experience', 'credits',
      'currentHP', 'maxHP', 'temporaryHP',
      'darkSideScore', 'forcePoints', 'destinyPoints'
    ];
    
    numericFields.forEach(field => {
      if (field in system) {
        system[field] = toNumber(system[field]);
      }
    });
    
    // Handle nested objects with value properties
    const nestedObjects = ['destinyPoints', 'forcePoints', 'darkSideScore'];
    nestedObjects.forEach(obj => {
      if (system[obj] && typeof system[obj] === 'object') {
        if ('value' in system[obj]) {
          system[obj].value = toNumber(system[obj].value);
        }
        if ('max' in system[obj]) {
          system[obj].max = toNumber(system[obj].max);
        }
      }
    });
    
    // Convert ability scores
    if (system.abilities) {
      for (const [key, ability] of Object.entries(system.abilities)) {
        if (ability && typeof ability === 'object') {
          ability.value = toNumber(ability.value, 10);
          ability.mod = toNumber(ability.mod, 0);
        }
      }
    }
    
    // Convert skills
    if (system.skills) {
      for (const [key, skill] of Object.entries(system.skills)) {
        if (skill && typeof skill === 'object') {
          skill.value = toNumber(skill.value, 0);
          skill.mod = toNumber(skill.mod, 0);
          skill.bonus = toNumber(skill.bonus, 0);
        }
      }
    }
    
    // Convert defenses
    if (system.defenses) {
      for (const [key, defense] of Object.entries(system.defenses)) {
        if (defense && typeof defense === 'object') {
          defense.total = toNumber(defense.total, 10);
          defense.base = toNumber(defense.base, 10);
          defense.armor = toNumber(defense.armor, 0);
          defense.ability = toNumber(defense.ability, 0);
          defense.classBonus = toNumber(defense.classBonus, 0);
          defense.misc = toNumber(defense.misc, 0);
        }
      }
    }
    
    // Convert attack bonuses
    if (system.attacks) {
      for (const [key, attack] of Object.entries(system.attacks)) {
        if (attack && typeof attack === 'object') {
          attack.value = toNumber(attack.value, 0);
          attack.bonus = toNumber(attack.bonus, 0);
        }
      }
    }
    
    // Convert condition track
    if (system.condition) {
      system.condition = toNumber(system.condition, 0);
    }
    
    // Convert vehicle/starship stats
    if (system.shields) {
      system.shields.value = toNumber(system.shields.value, 0);
      system.shields.max = toNumber(system.shields.max, 0);
    }
    if (system.hull) {
      system.hull.value = toNumber(system.hull.value, 0);
      system.hull.max = toNumber(system.hull.max, 0);
    }
    if (system.speed) {
      system.speed = toNumber(system.speed, 0);
    }
  }
  
  _prepareItems(context) {
    // Initialize categories
    const items = {
      weapons: [],
      armor: [],
      equipment: [],
      feats: [],
      talents: [],
      classes: [],
      species: null,
      forcePowers: []
    };
    
    // Categorize items
    for (const item of context.items) {
      const type = item.type;
      
      if (type === 'species') {
        items.species = item;
      } else if (type === 'forcepower') {
        items.forcePowers.push(item);
      } else if (items[type + 's']) {
        items[type + 's'].push(item);
      } else if (items[type]) {
        items[type].push(item);
      }
    }
    
    // Sort items
    for (const category of ['weapons', 'armor', 'feats', 'talents', 'classes', 'forcePowers']) {
      items[category].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    Object.assign(context, items);
  }
  
  activateListeners(html) {
    super.activateListeners(html);

    // Event delegation pattern
    html.on('click', '[data-action]', this._onAction.bind(this));

    // Item controls
    html.on('click', '.item-control', this._onItemControl.bind(this));

    // Rollable elements
    html.on('click', '.rollable', this._onRoll.bind(this));

    // Skill actions toggle
    html.on('click', '.skill-actions-toggle', this._onSkillActionsToggle.bind(this));

    // Skill use rollable
    html.on('click', '.skill-use-rollable', this._onRollSkillUse.bind(this));

    // Editable elements (if owner)
    if (this.isEditable) {
      // Item quantity/equipped changes
      html.on('change', '.item-quantity', this._onItemQuantity.bind(this));
      html.on('change', '.item-equipped', this._onItemEquipped.bind(this));
    }
  }
  
  /**
   * Handle action buttons using data-action attribute
   */
  async _onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;

    // Skip if this is an item-control action (handled by _onItemControl)
    if (button.classList.contains('item-control')) {
      return;
    }

    // Dispatch to specific handler
    const handlerName = `_on${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const handler = this[handlerName];

    if (typeof handler === 'function') {
      return handler.call(this, event);
    } else {
      SWSELogger.warn(`No handler found for action: ${action}`);
    }
  }
  
  /**
   * Handle item controls (edit, delete, toggle)
   */
  async _onItemControl(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const li = button.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    
    switch(action) {
      case 'create':
        return this._onItemCreate(button);
      case 'edit':
        return item?.sheet.render(true);
      case 'delete':
        return this._onItemDelete(item);
      case 'toggle':
        return item?.update({'system.equipped': !item.system.equipped});
      case 'quantity-up':
        return item?.update({'system.quantity': (item.system.quantity || 1) + 1});
      case 'quantity-down':
        return item?.update({'system.quantity': Math.max(0, (item.system.quantity || 1) - 1)});
    }
  }
  
  /**
   * Create new item
   */
  async _onItemCreate(button) {
    const type = button.dataset.type;

    // Use custom dialog for supported types
    const customTypes = ['weapon', 'armor', 'equipment', 'feat', 'talent', 'forcepower', 'force-power'];
    if (customTypes.includes(type)) {
      const created = await CustomItemDialog.create(this.actor, type);
      if (created) {
        ui.notifications.info(`Created custom ${type}: ${created.name}`);
        return created.sheet?.render(true);
      }
      return;
    }

    // Default creation for other types
    const name = `New ${type.capitalize()}`;

    const itemData = {
      name: name,
      type: type,
      system: {}
    };

    const created = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    return created[0]?.sheet.render(true);
  }
  
  /**
   * Delete item with confirmation
   */
  async _onItemDelete(item) {
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: `Delete ${item.name}?`,
      content: `<p>Are you sure you want to delete <strong>${item.name}</strong>?</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      return item.delete();
    }
  }
  
  /**
   * Handle rolls
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.roll) {
      const label = dataset.label || 'Roll';

      // Special handling for initiative rolls
      if (label.toLowerCase().includes('initiative')) {
        // Check if there's an active combat
        if (!game.combat) {
          ui.notifications.warn("No active combat encounter. Create a combat first.");
          return;
        }

        // Add actor to combat tracker if not already in combat
        const existingCombatant = game.combat.combatants.find(c => c.actor?.id === this.actor.id);

        if (!existingCombatant) {
          const tokens = this.actor.getActiveTokens();
          const tokenId = tokens.length > 0 ? tokens[0].id : null;
          const sceneId = game.combat.scene?.id || game.scenes.current?.id || null;

          if (!sceneId) {
            ui.notifications.warn("No active scene found for combat tracking.");
            return;
          }

          await game.combat.createEmbeddedDocuments('Combatant', [{
            actorId: this.actor.id,
            sceneId: sceneId,
            tokenId: tokenId,
            hidden: tokens.length === 0 // Hide combatant if no token on scene
          }]);
        }

        // Roll initiative for all combatants of this actor
        const combatants = game.combat.combatants.filter(c => c.actor?.id === this.actor.id);
        if (combatants.length > 0) {
          await game.combat.rollInitiative(combatants.map(c => c.id));
        }
      } else if (dataset.skill) {
        // Skill roll - open dialog
        await this._openSkillRollDialog(dataset.skill, label);
      } else {
        // Normal roll
        const roll = new Roll(dataset.roll, this.actor.getRollData());
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({actor: this.actor}),
          flavor: label
        });
      }
    }
  }

  /**
   * Handle roll attack - opens dialog with attack calculation
   */
  async _onRollAttack(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const weapon = this.actor.items.get(itemId);

    if (!weapon) {
      ui.notifications.error("Weapon not found!");
      return;
    }

    await this._openAttackDamageDialog(weapon);
  }

  /**
   * Handle roll damage - opens dialog with damage calculation
   */
  async _onRollDamage(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const weapon = this.actor.items.get(itemId);

    if (!weapon) {
      ui.notifications.error("Weapon not found!");
      return;
    }

    await this._openAttackDamageDialog(weapon, true);  // damageOnly = true
  }

  /**
   * Open attack/damage dialog with all modifiers
   */
  async _openAttackDamageDialog(weapon, damageOnly = false) {
    const actor = this.actor;
    const level = actor.system.level?.heroic || actor.system.level || 1;
    const halfLevel = Math.floor(level / 2);
    const bab = actor.system.bab || 0;

    // Get ability modifiers
    const abilities = {
      str: actor.system.attributes?.str?.mod || 0,
      dex: actor.system.attributes?.dex?.mod || 0,
      con: actor.system.attributes?.con?.mod || 0,
      int: actor.system.attributes?.int?.mod || 0,
      wis: actor.system.attributes?.wis?.mod || 0,
      cha: actor.system.attributes?.cha?.mod || 0
    };

    // Determine default ability (STR for melee, DEX for ranged)
    const weaponType = weapon.system?.weaponType || weapon.system?.type || '';
    const defaultAbility = weaponType.toLowerCase().includes('melee') ? 'str' : 'dex';

    const content = `
      <form class="attack-damage-dialog">
        <h3>${weapon.name}</h3>

        ${!damageOnly ? `
        <div class="form-group">
          <h4>Attack Roll Components</h4>
          <div class="attack-breakdown">
            <div class="component-row">
              <label>Base (d20):</label>
              <span>1d20</span>
            </div>
            <div class="component-row">
              <label>BAB:</label>
              <span>${bab >= 0 ? '+' : ''}${bab}</span>
            </div>
            <div class="component-row">
              <label>Half Level:</label>
              <span>+${halfLevel}</span>
            </div>
            <div class="component-row">
              <label>Ability Modifier:</label>
              <select name="attackAbility" id="attack-ability">
                <option value="str" ${defaultAbility === 'str' ? 'selected' : ''}>STR (${abilities.str >= 0 ? '+' : ''}${abilities.str})</option>
                <option value="dex" ${defaultAbility === 'dex' ? 'selected' : ''}>DEX (${abilities.dex >= 0 ? '+' : ''}${abilities.dex})</option>
                <option value="con" >CON (${abilities.con >= 0 ? '+' : ''}${abilities.con})</option>
                <option value="int">INT (${abilities.int >= 0 ? '+' : ''}${abilities.int})</option>
                <option value="wis">WIS (${abilities.wis >= 0 ? '+' : ''}${abilities.wis})</option>
                <option value="cha">CHA (${abilities.cha >= 0 ? '+' : ''}${abilities.cha})</option>
              </select>
            </div>
            <div class="component-row">
              <label>Misc Bonus:</label>
              <input type="number" name="attackMisc" value="0" style="width: 60px;"/>
            </div>
            <div class="component-row total-row">
              <label><strong>Total Attack Bonus:</strong></label>
              <span id="attack-total">${bab + halfLevel + abilities[defaultAbility] >= 0 ? '+' : ''}${bab + halfLevel + abilities[defaultAbility]}</span>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="form-group">
          <h4>Damage Roll Components</h4>
          <div class="damage-breakdown">
            <div class="component-row">
              <label>Base Damage:</label>
              <input type="text" name="baseDamage" value="${weapon.system?.damage || '1d6'}" style="width: 80px;"/>
            </div>
            <div class="component-row">
              <label>Level Bonus:</label>
              <span>+${level}</span>
            </div>
            <div class="component-row">
              <label>Misc Bonus:</label>
              <input type="number" name="damageMisc" value="0" style="width: 60px;"/>
            </div>
          </div>
        </div>

        <style>
          .attack-damage-dialog {
            padding: 10px;
          }
          .attack-damage-dialog h3 {
            margin-top: 0;
            color: #0af;
            border-bottom: 2px solid #0af;
            padding-bottom: 8px;
          }
          .attack-damage-dialog h4 {
            color: #9ed0ff;
            margin: 12px 0 8px 0;
          }
          .component-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            border-bottom: 1px solid rgba(0, 170, 255, 0.2);
          }
          .component-row label {
            font-weight: normal;
            color: #9ed0ff;
          }
          .component-row span, .component-row select {
            color: #0af;
            font-weight: bold;
          }
          .total-row {
            margin-top: 8px;
            border-top: 2px solid #0af;
            border-bottom: 2px solid #0af;
            padding: 8px 0;
          }
          .total-row label {
            font-size: 1.1em;
          }
          .total-row span {
            font-size: 1.2em;
          }
        </style>
      </form>
    `;

    // Show dialog
    new Dialog({
      title: `${weapon.name} - Attack & Damage`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: damageOnly ? "Roll Damage" : "Roll Attack & Damage",
          callback: async (html) => {
            const form = html[0].querySelector('form');
            const attackAbility = form.querySelector('[name="attackAbility"]')?.value || defaultAbility;
            const attackMisc = parseInt(form.querySelector('[name="attackMisc"]')?.value || 0);
            const baseDamage = form.querySelector('[name="baseDamage"]')?.value || '1d6';
            const damageMisc = parseInt(form.querySelector('[name="damageMisc"]')?.value || 0);

            const abilityMod = abilities[attackAbility];
            const attackBonus = bab + halfLevel + abilityMod + attackMisc;

            // Roll attack
            let attackRoll, damageRoll;
            if (!damageOnly) {
              attackRoll = await new Roll(`1d20 + ${attackBonus}`).evaluate();
            }

            // Roll damage
            const damageFormula = `${baseDamage} + ${level} + ${damageMisc}`;
            damageRoll = await new Roll(damageFormula).evaluate();

            // Create chat message
            let chatContent = `
              <div class="swse-attack-card">
                <h3>${weapon.name}</h3>
                ${!damageOnly ? `
                <div class="attack-roll">
                  <h4>Attack Roll</h4>
                  <div class="dice-roll">
                    <div class="dice-result">${attackRoll.total}</div>
                    <div class="dice-formula">
                      1d20 (${attackRoll.dice[0].total}) + ${bab} (BAB) + ${halfLevel} (½ Level) + ${abilityMod} (${attackAbility.toUpperCase()}) ${attackMisc !== 0 ? `+ ${attackMisc} (Misc)` : ''}
                    </div>
                  </div>
                </div>
                ` : ''}
                <div class="damage-roll">
                  <h4>Damage Roll</h4>
                  <div class="dice-roll">
                    <div class="dice-result">${damageRoll.total}</div>
                    <div class="dice-formula">
                      ${baseDamage} + ${level} (Level) ${damageMisc !== 0 ? `+ ${damageMisc} (Misc)` : ''} = ${damageFormula}
                    </div>
                  </div>
                </div>
              </div>
              <style>
                .swse-attack-card {
                  background: linear-gradient(135deg, #0a0f1a 0%, #0f1f35 100%);
                  border: 2px solid #0af;
                  border-radius: 8px;
                  padding: 12px;
                  color: #9ed0ff;
                }
                .swse-attack-card h3 {
                  margin: 0 0 12px 0;
                  color: #0af;
                  border-bottom: 2px solid #0af;
                  padding-bottom: 6px;
                }
                .swse-attack-card h4 {
                  margin: 8px 0 4px 0;
                  color: #9ed0ff;
                  font-size: 14px;
                }
                .dice-roll {
                  background: rgba(0, 20, 40, 0.5);
                  border-radius: 4px;
                  padding: 8px;
                  margin: 4px 0;
                }
                .dice-result {
                  font-size: 24px;
                  font-weight: bold;
                  color: #0af;
                  text-align: center;
                  margin-bottom: 4px;
                }
                .dice-formula {
                  font-size: 11px;
                  color: #6a9dcd;
                  text-align: center;
                }
              </style>
            `;

            ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({actor: this.actor}),
              content: chatContent,
              sound: CONFIG.sounds.dice
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "roll",
      render: (html) => {
        // Update total when ability or misc changes
        const updateTotal = () => {
          const form = html[0].querySelector('form');
          const attackAbility = form.querySelector('[name="attackAbility"]')?.value || defaultAbility;
          const attackMisc = parseInt(form.querySelector('[name="attackMisc"]')?.value || 0);
          const abilityMod = abilities[attackAbility];
          const total = bab + halfLevel + abilityMod + attackMisc;

          const totalSpan = html[0].querySelector('#attack-total');
          if (totalSpan) {
            totalSpan.textContent = `${total >= 0 ? '+' : ''}${total}`;
          }
        };

        html.find('[name="attackAbility"]').on('change', updateTotal);
        html.find('[name="attackMisc"]').on('input', updateTotal);
      }
    }).render(true);
  }

  /**
   * Handle skill actions toggle
   */
  _onSkillActionsToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const skillKey = button.dataset.skill;
    const container = button.closest('.skill-row-container');
    const panel = container?.querySelector('.skill-actions-panel');
    const icon = button.querySelector('i');

    if (panel) {
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';

      // Toggle icon
      if (icon) {
        icon.classList.toggle('fa-chevron-down', !isHidden);
        icon.classList.toggle('fa-chevron-up', isHidden);
      }
    }
  }

  /**
   * Open skill roll dialog with customizable modifiers
   */
  async _openSkillRollDialog(skillKey, skillLabel) {
    const actor = this.actor;
    const skill = actor.system.skills?.[skillKey];

    if (!skill) {
      ui.notifications.error(`Skill ${skillKey} not found on ${actor.name}`);
      return;
    }

    const level = actor.system.level?.heroic || actor.system.level || 1;
    const halfLevel = Math.floor(level / 2);

    // Get ability modifiers
    const abilities = {
      str: actor.system.attributes?.str?.mod || 0,
      dex: actor.system.attributes?.dex?.mod || 0,
      con: actor.system.attributes?.con?.mod || 0,
      int: actor.system.attributes?.int?.mod || 0,
      wis: actor.system.attributes?.wis?.mod || 0,
      cha: actor.system.attributes?.cha?.mod || 0
    };

    const selectedAbility = skill.selectedAbility || skill.ability || 'cha';
    const abilityMod = abilities[selectedAbility] || 0;
    const trained = skill.trained ? 5 : 0;
    const focused = skill.focused ? 5 : 0;
    const miscMod = skill.miscMod || 0;
    const armorPenalty = skill.armorPenalty || 0;
    const conditionPenalty = actor.system.conditionPenalty || 0;

    // Build dialog content
    const content = `
      <form class="skill-roll-dialog">
        <div class="form-group">
          <label>Skill: <strong>${skillLabel}</strong></label>
        </div>
        <div class="form-group">
          <label>Ability:</label>
          <select name="skillAbility" style="width: 100%;">
            <option value="str" ${selectedAbility === 'str' ? 'selected' : ''}>STR (${abilities.str >= 0 ? '+' : ''}${abilities.str})</option>
            <option value="dex" ${selectedAbility === 'dex' ? 'selected' : ''}>DEX (${abilities.dex >= 0 ? '+' : ''}${abilities.dex})</option>
            ${actor.system.isDroid ? '' : `<option value="con" ${selectedAbility === 'con' ? 'selected' : ''}>CON (${abilities.con >= 0 ? '+' : ''}${abilities.con})</option>`}
            <option value="int" ${selectedAbility === 'int' ? 'selected' : ''}>INT (${abilities.int >= 0 ? '+' : ''}${abilities.int})</option>
            <option value="wis" ${selectedAbility === 'wis' ? 'selected' : ''}>WIS (${abilities.wis >= 0 ? '+' : ''}${abilities.wis})</option>
            <option value="cha" ${selectedAbility === 'cha' ? 'selected' : ''}>CHA (${abilities.cha >= 0 ? '+' : ''}${abilities.cha})</option>
          </select>
        </div>
        <div class="form-group">
          <label>½ Level:</label>
          <input type="number" name="halfLevel" value="${halfLevel}" style="width: 100%;"/>
        </div>
        <div class="form-group">
          <label>Trained Bonus:</label>
          <input type="number" name="trained" value="${trained}" style="width: 100%;"/>
        </div>
        <div class="form-group">
          <label>Skill Focus Bonus:</label>
          <input type="number" name="focused" value="${focused}" style="width: 100%;"/>
        </div>
        <div class="form-group">
          <label>Misc Modifier:</label>
          <input type="number" name="miscMod" value="${miscMod}" style="width: 100%;"/>
        </div>
        <div class="form-group">
          <label>Armor Penalty:</label>
          <input type="number" name="armorPenalty" value="${armorPenalty}" style="width: 100%;"/>
        </div>
        <div class="form-group">
          <label>Condition Penalty:</label>
          <input type="number" name="conditionPenalty" value="${conditionPenalty}" style="width: 100%;"/>
        </div>
        <div class="form-group">
          <label>Situational Modifier:</label>
          <input type="number" name="situational" value="0" style="width: 100%;"/>
        </div>
        <hr/>
        <div class="form-group">
          <label>Total Modifier: <span id="skill-total" style="font-weight: bold; font-size: 1.2em;">${skill.total >= 0 ? '+' : ''}${skill.total}</span></label>
        </div>
      </form>
    `;

    new Dialog({
      title: `Roll ${skillLabel}`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Roll",
          callback: async (html) => {
            const form = html[0].querySelector('form');
            const formAbility = form.querySelector('[name="skillAbility"]').value;
            const formHalfLevel = parseInt(form.querySelector('[name="halfLevel"]').value || 0);
            const formTrained = parseInt(form.querySelector('[name="trained"]').value || 0);
            const formFocused = parseInt(form.querySelector('[name="focused"]').value || 0);
            const formMisc = parseInt(form.querySelector('[name="miscMod"]').value || 0);
            const formArmor = parseInt(form.querySelector('[name="armorPenalty"]').value || 0);
            const formCondition = parseInt(form.querySelector('[name="conditionPenalty"]').value || 0);
            const formSituational = parseInt(form.querySelector('[name="situational"]').value || 0);

            const abilityValue = abilities[formAbility] || 0;
            const total = formHalfLevel + abilityValue + formTrained + formFocused + formMisc + formArmor + formCondition + formSituational;

            const roll = new Roll(`1d20 + ${total}`);
            await roll.evaluate({async: true});

            // Build breakdown
            const parts = [];
            parts.push(`½ Level +${formHalfLevel}`);
            parts.push(`${formAbility.toUpperCase()} ${abilityValue >= 0 ? '+' : ''}${abilityValue}`);
            if (formTrained > 0) parts.push(`Trained +${formTrained}`);
            if (formFocused > 0) parts.push(`Focus +${formFocused}`);
            if (formMisc !== 0) parts.push(`Misc ${formMisc >= 0 ? '+' : ''}${formMisc}`);
            if (formArmor !== 0) parts.push(`Armor ${formArmor >= 0 ? '+' : ''}${formArmor}`);
            if (formCondition !== 0) parts.push(`Condition ${formCondition >= 0 ? '+' : ''}${formCondition}`);
            if (formSituational !== 0) parts.push(`Situational ${formSituational >= 0 ? '+' : ''}${formSituational}`);

            const messageContent = `
              <div class="swse-skill-roll">
                <div class="roll-header">
                  <h3><i class="fas fa-dice-d20"></i> ${skillLabel}</h3>
                </div>
                <div class="roll-result">
                  <h4 class="dice-total">${roll.total}</h4>
                </div>
                <div class="roll-breakdown">
                  <div class="modifiers">${parts.join(', ')}</div>
                </div>
              </div>
            `;

            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({actor: actor}),
              content: messageContent,
              roll: roll,
              sound: CONFIG.sounds.dice
            });

            if (game.dice3d) {
              await game.dice3d.showForRoll(roll, game.user, true);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "roll",
      render: (html) => {
        // Update total when values change
        const updateTotal = () => {
          const form = html[0].querySelector('form');
          const formAbility = form.querySelector('[name="skillAbility"]').value;
          const formHalfLevel = parseInt(form.querySelector('[name="halfLevel"]').value || 0);
          const formTrained = parseInt(form.querySelector('[name="trained"]').value || 0);
          const formFocused = parseInt(form.querySelector('[name="focused"]').value || 0);
          const formMisc = parseInt(form.querySelector('[name="miscMod"]').value || 0);
          const formArmor = parseInt(form.querySelector('[name="armorPenalty"]').value || 0);
          const formCondition = parseInt(form.querySelector('[name="conditionPenalty"]').value || 0);
          const formSituational = parseInt(form.querySelector('[name="situational"]').value || 0);

          const abilityValue = abilities[formAbility] || 0;
          const total = formHalfLevel + abilityValue + formTrained + formFocused + formMisc + formArmor + formCondition + formSituational;

          const totalSpan = html[0].querySelector('#skill-total');
          if (totalSpan) {
            totalSpan.textContent = `${total >= 0 ? '+' : ''}${total}`;
          }
        };

        html.find('select, input').on('change input', updateTotal);
      }
    }, {
      width: 400
    }).render(true);
  }

  /**
   * Handle skill use roll
   */
  async _onRollSkillUse(event) {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;
    const skillKey = element.dataset.skill;
    const actionName = element.dataset.actionName;
    const dc = element.dataset.dc;
    const dcType = element.dataset.dcType;
    const outcome = element.dataset.outcome;
    const whenCondition = element.dataset.when;
    const effect = element.dataset.effect;

    if (!skillKey) {
      ui.notifications.error('Skill not found for this action');
      return;
    }

    const actor = this.actor;
    const skill = actor.system.skills?.[skillKey];

    if (!skill) {
      ui.notifications.error(`Skill ${skillKey} not found on ${actor.name}`);
      return;
    }

    // Get skill label
    const skillLabels = {
      acrobatics: 'Acrobatics',
      climb: 'Climb',
      deception: 'Deception',
      endurance: 'Endurance',
      gatherInformation: 'Gather Information',
      initiative: 'Initiative',
      jump: 'Jump',
      knowledge: 'Knowledge',
      mechanics: 'Mechanics',
      perception: 'Perception',
      persuasion: 'Persuasion',
      pilot: 'Pilot',
      ride: 'Ride',
      stealth: 'Stealth',
      survival: 'Survival',
      swim: 'Swim',
      treatInjury: 'Treat Injury',
      useComputer: 'Use Computer',
      useTheForce: 'Use the Force'
    };

    const skillLabel = skillLabels[skillKey] || skillKey;

    // If there's a DC and it's a number, roll against it
    if (dc && !isNaN(dc)) {
      const dcValue = parseInt(dc);

      // Perform the roll
      const formula = `1d20 + ${skill.total}`;
      const roll = new Roll(formula);
      await roll.evaluate({async: true});

      const success = roll.total >= dcValue;
      const d20Result = roll.terms[0].results[0].result;

      // Build breakdown
      const level = actor.system.level?.heroic || actor.system.level || 1;
      const halfLevel = Math.floor(level / 2);
      const abilities = {
        str: actor.system.attributes?.str?.mod || 0,
        dex: actor.system.attributes?.dex?.mod || 0,
        con: actor.system.attributes?.con?.mod || 0,
        int: actor.system.attributes?.int?.mod || 0,
        wis: actor.system.attributes?.wis?.mod || 0,
        cha: actor.system.attributes?.cha?.mod || 0
      };
      const selectedAbility = skill.selectedAbility || skill.ability || 'cha';
      const abilityMod = abilities[selectedAbility] || 0;

      const parts = [];
      parts.push(`½ Level +${halfLevel}`);
      parts.push(`${selectedAbility.toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`);
      if (skill.trained) parts.push('Trained +5');
      if (skill.focused) parts.push('Focus +5');
      if (skill.miscMod) parts.push(`Misc ${skill.miscMod >= 0 ? '+' : ''}${skill.miscMod}`);
      if (skill.armorPenalty) parts.push(`Armor ${skill.armorPenalty >= 0 ? '+' : ''}${skill.armorPenalty}`);
      if (actor.system.conditionPenalty) parts.push(`Condition ${actor.system.conditionPenalty >= 0 ? '+' : ''}${actor.system.conditionPenalty}`);

      // Build message content
      const messageContent = `
        <div class="swse-skill-use-roll ${success ? 'success' : 'failure'}">
          <div class="roll-header">
            <h3><i class="fas fa-dice-d20"></i> ${actionName}</h3>
            <div class="skill-name">${skillLabel} Check</div>
          </div>
          <div class="roll-result">
            <h4 class="dice-total">${roll.total}</h4>
            <div class="dc-target">DC ${dcValue}</div>
            <div class="result ${success ? 'success' : 'failure'}">
              ${success ? '✓ SUCCESS' : '✗ FAILURE'}
            </div>
          </div>
          <div class="roll-breakdown">
            <div class="dice-rolls">d20: ${d20Result}</div>
            <div class="modifiers">${parts.join(', ')}</div>
          </div>
          ${success && (outcome || effect) ? `
            <div class="action-outcome">
              <strong>Effect:</strong> ${outcome || effect}
            </div>
          ` : ''}
          ${whenCondition ? `
            <div class="action-condition">
              <em>${whenCondition}</em>
            </div>
          ` : ''}
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: actor}),
        content: messageContent,
        roll: roll,
        sound: CONFIG.sounds.dice,
        flags: {
          swse: {
            type: 'skill-use-check',
            actionName: actionName,
            skillKey: skillKey,
            dc: dcValue,
            success: success
          }
        }
      });

      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }
    } else {
      // No DC or non-numeric DC - output narrative
      const messageContent = `
        <div class="swse-skill-use-narrative">
          <div class="narrative-header">
            <h3><i class="fas fa-book"></i> ${actionName}</h3>
          </div>
          <div class="narrative-content">
            <p><strong>${actor.name}</strong> is ${actionName.toLowerCase()}.</p>
            ${effect ? `<div class="narrative-effect"><em>${effect}</em></div>` : ''}
            ${dc ? `<div class="narrative-dc"><strong>DC:</strong> ${dc}</div>` : ''}
            ${whenCondition ? `<div class="narrative-when"><em>${whenCondition}</em></div>` : ''}
          </div>
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: actor}),
        content: messageContent,
        flags: {
          swse: {
            type: 'skill-use-narrative',
            actionName: actionName,
            skillKey: skillKey
          }
        }
      });
    }
  }

  /**
   * Handle Force Point actions
   */
  async _onSpendForcePoint(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type;

    switch(type) {
      case 'reroll':
        return this.actor.rollForcePoint('reroll');
      case 'avoid-death':
        return this.actor.avoidDeathWithForcePoint();
      case 'reduce-dark':
        return this.actor.reduceDarkSideScore();
      default:
        return this.actor.rollForcePoint('general use');
    }
  }

  /**
   * Handle quantity changes
   */
  async _onItemQuantity(event) {
    const input = event.currentTarget;
    const li = input.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    const quantity = parseInt(input.value) || 0;
    
    return item?.update({'system.quantity': quantity});
  }
  
  /**
   * Handle equipped checkbox
   */
  async _onItemEquipped(event) {
    const checkbox = event.currentTarget;
    const li = checkbox.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    
    return item?.update({'system.equipped': checkbox.checked});
  }
  
  /**
   * Handle drag start
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if (event.target.classList.contains('content-link')) return;
    
    const item = this.actor.items.get(li.dataset.itemId);
    if (!item) return;
    
    const dragData = item.toDragData();
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }
  
  /**
   * Handle drop
   */
  async _onDrop(event) {
    const TextEditorImpl = foundry.applications?.ux?.TextEditor?.implementation || TextEditor;
    const data = TextEditorImpl.getDragEventData(event);
    const actor = this.actor;
    
    // Handle different drop types
    switch (data.type) {
      case 'Item':
        return this._onDropItem(event, data);
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
    }
    
    return super._onDrop(event);
  }
  
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();
    
    // Handle item pile (if from compendium or another actor)
    if (this.actor.uuid === item.parent?.uuid) {
      return this._onSortItem(event, itemData);
    }

    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  /**
   * Handle creating a new item from a button click
   */
  async _onCreateItem(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type;

    if (!type) {
      SWSELogger.warn("CreateItem action requires data-type attribute");
      return;
    }

    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type
    };

    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  /**
   * Handle setting the condition track
   */
  async _onSetConditionTrack(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const step = parseInt(button.dataset.step);

    if (isNaN(step)) {
      SWSELogger.warn("SetConditionTrack action requires data-step attribute");
      return;
    }

    return this.actor.update({'system.conditionTrack.current': step});
  }

  /**
   * Improve condition track by one step
   */
  async _onImproveCondition(event) {
    event.preventDefault();
    const current = this.actor.system.conditionTrack?.current || 0;
    const newStep = Math.max(0, current - 1);
    return this.actor.update({'system.conditionTrack.current': newStep});
  }

  /**
   * Worsen condition track by one step
   */
  async _onWorsenCondition(event) {
    event.preventDefault();
    const current = this.actor.system.conditionTrack?.current || 0;
    const max = 5; // Maximum condition track steps (0-5)
    const newStep = Math.min(max, current + 1);
    return this.actor.update({'system.conditionTrack.current': newStep});
  }
}
