/**
 * Base Actor Sheet
 * Provides common functionality for all SWSE actor sheets
 */

import { CombatActionsMapper } from '../utils/combat-actions-mapper.js';
import { CustomItemDialog } from '../apps/custom-item-dialog.js';

export class SWSEActorSheetBase extends ActorSheet {
  
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor'],
      width: 720,
      height: 680,
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
    
    // Dispatch to specific handler
    const handlerName = `_on${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const handler = this[handlerName];
    
    if (typeof handler === 'function') {
      return handler.call(this, event);
    } else {
      console.warn(`No handler found for action: ${action}`);
    }
  }
  
  /**
   * Handle item controls (edit, delete, toggle)
   */
  async _onItemControl(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const li = button.closest('.item');
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
        // Add actor to combat tracker if not already in combat
        if (game.combat && !game.combat.combatants.find(c => c.actor?.id === this.actor.id)) {
          await game.combat.createEmbeddedDocuments('Combatant', [{
            actorId: this.actor.id,
            sceneId: game.combat.scene.id,
            tokenId: this.actor.token?.id
          }]);
        }

        // Roll initiative
        const tokens = this.actor.getActiveTokens();
        if (tokens.length > 0 && game.combat) {
          await game.combat.rollInitiative(tokens.map(t => t.id));
        } else {
          const roll = new Roll(dataset.roll, this.actor.getRollData());
          roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            flavor: label
          });
        }
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
    const li = input.closest('.item');
    const item = this.actor.items.get(li?.dataset.itemId);
    const quantity = parseInt(input.value) || 0;
    
    return item?.update({'system.quantity': quantity});
  }
  
  /**
   * Handle equipped checkbox
   */
  async _onItemEquipped(event) {
    const checkbox = event.currentTarget;
    const li = checkbox.closest('.item');
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
      console.warn("CreateItem action requires data-type attribute");
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
      console.warn("SetConditionTrack action requires data-step attribute");
      return;
    }

    return this.actor.update({'system.conditionTrack.current': step});
  }
}
