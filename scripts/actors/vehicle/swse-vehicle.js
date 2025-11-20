import { SWSECharacterSheet } from '../character/swse-character-sheet.js';
import { SWSELogger } from '../../utils/logger.js';
import { SWSEVehicleHandler } from './swse-vehicle-handler.js';
import { CombatActionsMapper } from '../../combat/utils/combat-actions-mapper.js';

export class SWSEVehicleSheet extends SWSECharacterSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "vehicle"],
      template: "systems/swse/templates/actors/vehicle/vehicle-sheet.hbs",
      width: 750,
      height: 700,
      resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
      dragDrop: [{
        dragSelector: '.item-list .item',
        dropSelector: null
      }]
    });
  }

  getData() {
    const context = super.getData();

    // Ensure system object exists before accessing properties
    if (!context.system) {
      context.system = {};
    }

    // Initialize vehicle-specific properties safely
    if (!context.system.weapons) context.system.weapons = [];
    if (!context.system.crewPositions) {
      context.system.crewPositions = {
        pilot: null, copilot: null, gunner: null,
        engineer: null, shields: null, commander: null
      };
    }

    // Normalize crew positions for backwards compatibility
    // Convert old string format to new object format
    const positions = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
    for (const pos of positions) {
      const crewData = context.system.crewPositions[pos];
      if (crewData && typeof crewData === 'string') {
        // Old format - just a name string
        context.system.crewPositions[pos] = {
          name: crewData,
          uuid: null
        };
      }
    }
    if (!context.system.shields) context.system.shields = { value: 0, max: 0 };
    if (!context.system.hull) context.system.hull = { value: 0, max: 0 };
    if (!context.system.tags) context.system.tags = [];

    // Ensure attributes exist with calculated values
    if (!context.system.attributes) {
      context.system.attributes = {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      };
    }

    // Add ship combat actions by crew position
    context.shipActions = CombatActionsMapper.getAllShipActionsByPosition();

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    html.find('.weapon-add').click(this._onAddWeapon.bind(this));
    html.find('.weapon-remove').click(this._onRemoveWeapon.bind(this));
    html.find('.weapon-roll').click(this._onRollWeapon.bind(this));
    html.find('.crew-slot').on('drop', this._onCrewDrop.bind(this));
    html.find('.crew-slot').on('click', this._onCrewClick.bind(this));

    // Crew skill rolls
    html.find('.crew-skill-roll').click(this._onCrewSkillRoll.bind(this));

    // Ship combat actions toggle
    html.find('.crew-actions-toggle').click(this._onCrewActionsToggle.bind(this));
  }

  /**
   * Handle crew position combat actions toggle
   */
  _onCrewActionsToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const position = button.dataset.position;
    const container = button.closest('.crew-position');
    const panel = container?.querySelector('.crew-actions-panel');
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
   * Handle dropping items onto the vehicle sheet
   * Handles both vehicle templates and individual weapons
   */
  async _onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      SWSELogger.error('SWSE | Failed to parse drop data:', err);
      return false;
    }
    
    // Handle Item drops
    if (data.type === 'Item') {
      const item = await fromUuid(data.uuid);
      if (!item) {
        SWSELogger.warn('SWSE | Could not find dropped item');
        return false;
      }
      
      SWSELogger.log('SWSE | Item dropped on vehicle:', item.name, item.type);
      
      // Check if this is a weapon Item
      if (item.type === 'weapon') {
        return await this._handleWeaponDrop(item);
      }
      
      // Check if this is a vehicle template
      if (SWSEVehicleHandler.isVehicleTemplate(item)) {
        const confirmed = await Dialog.confirm({
          title: 'Apply Vehicle Template',
          content: `<p>Apply <strong>${item.name}</strong> template to this vehicle?</p>
                    <p><em>This will replace current vehicle statistics.</em></p>`
        });
        
        if (confirmed) {
          return await SWSEVehicleHandler.applyVehicleTemplate(this.actor, item);
        }
        return false;
      }
    }
    
    // Let parent handle other drops
    return super._onDrop(event);
  }

  /**
   * Handle dropping a weapon Item onto the vehicle
   * Converts weapon Item to vehicle weapon format and adds to array
   */
  async _handleWeaponDrop(weaponItem) {
    SWSELogger.log('SWSE | Adding weapon to vehicle:', weaponItem.name);
    
    const weapons = [...(this.actor.system.weapons || [])];
    
    // Convert weapon Item to vehicle weapon format
    const vehicleWeapon = {
      name: weaponItem.name,
      arc: 'Forward',  // Default arc
      bonus: this._formatAttackBonus(weaponItem.system.attackBonus || 0),
      damage: weaponItem.system.damage || '0d0',
      range: weaponItem.system.range || 'Close'
    };
    
    // Add to weapons array
    weapons.push(vehicleWeapon);
    
    await this.actor.update({ 'system.weapons': weapons });
    
    ui.notifications.info(`${weaponItem.name} added to vehicle weapons`);
    return true;
  }

  /**
   * Format attack bonus with +/- sign
   */
  _formatAttackBonus(bonus) {
    const num = Number(bonus) || 0;
    return num >= 0 ? `+${num}` : `${num}`;
  }

  async _onAddWeapon(event) {
    event.preventDefault();
    const weapons = this.actor.system.weapons || [];
    weapons.push({ 
      name: "New Weapon", 
      arc: "Forward", 
      bonus: "+0", 
      damage: "0d0", 
      range: "Close" 
    });
    await this.actor.update({ "system.weapons": weapons });
  }

  async _onRemoveWeapon(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const weapons = [...(this.actor.system.weapons || [])];
    if (index >= 0 && index < weapons.length) {
      weapons.splice(index, 1);
      await this.actor.update({ "system.weapons": weapons });
    }
  }

  async _onRollWeapon(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const weapon = this.actor.system.weapons?.[index];
    
    if (!weapon) return;
    
    // Roll attack
    const attackRoll = new Roll(`1d20${weapon.bonus}`, this.actor.getRollData());
    await attackRoll.evaluate({async: true});
    
    await attackRoll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `<strong>${weapon.name}</strong> Attack Roll`,
      rollMode: game.settings.get('core', 'rollMode')
    });
    
    // Ask if hit
    const hit = await Dialog.confirm({
      title: 'Roll Damage?',
      content: `<p>Did the attack hit?</p>`
    });
    
    if (hit) {
      const damageRoll = new Roll(weapon.damage, this.actor.getRollData());
      await damageRoll.evaluate({async: true});
      
      await damageRoll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: `<strong>${weapon.name}</strong> Damage`,
        rollMode: game.settings.get('core', 'rollMode')
      });
    }
  }
  
  async _onCrewDrop(event) {
    event.preventDefault();
    const slot = event.currentTarget.dataset.slot;
    try {
      const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type === 'Actor') {
        const actor = await fromUuid(data.uuid);
        if (actor) {
          await this.actor.update({
            [`system.crewPositions.${slot}`]: {
              name: actor.name,
              uuid: actor.uuid
            }
          });
          ui.notifications.info(`${actor.name} assigned to ${slot} position`);
        }
      }
    } catch (error) {
      SWSELogger.warn('SWSE | Failed to assign crew member:', error.message);
    }
  }

  async _onCrewClick(event) {
    event.preventDefault();
    const slot = event.currentTarget.dataset.slot;
    const currentCrew = this.actor.system.crewPositions?.[slot];
    if (currentCrew) {
      // Handle both old string format and new object format for backwards compatibility
      const crewName = typeof currentCrew === 'string' ? currentCrew : currentCrew?.name;
      if (crewName) {
        const confirm = await Dialog.confirm({
          title: "Remove Crew Member",
          content: `<p>Remove <strong>${crewName}</strong> from ${slot} position?</p>`
        });
        if (confirm) {
          await this.actor.update({ [`system.crewPositions.${slot}`]: null });
          ui.notifications.info(`Removed ${crewName} from ${slot} position`);
        }
      }
    }
  }

  /**
   * Map skill names from ship combat actions to actual skill keys
   */
  _mapSkillNameToKey(skillName) {
    const skillMap = {
      'Pilot': 'pilot',
      'Mechanics': 'mechanics',
      'Use Computer': 'use_computer',
      'Perception': 'perception',
      'Persuasion': 'persuasion',
      'Knowledge (Tactics)': 'knowledge_tactics'
    };
    return skillMap[skillName] || skillName.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Roll a skill check for a crew member in a specific position
   */
  async _onCrewSkillRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const position = button.dataset.position;
    const skillName = button.dataset.skill;
    const actionName = button.dataset.actionName;
    const dc = button.dataset.dc ? parseInt(button.dataset.dc) : null;

    // Map skill name to key
    const skillKey = this._mapSkillNameToKey(skillName);

    // Get crew member from position
    const crewData = this.actor.system.crewPositions?.[position];
    if (!crewData) {
      ui.notifications.warn(`No crew member assigned to ${position} position`);
      return;
    }

    // Get crew member UUID (handle backwards compatibility)
    const crewUuid = typeof crewData === 'string' ? null : crewData.uuid;
    if (!crewUuid) {
      ui.notifications.error(`Crew member data is outdated. Please re-assign crew member to ${position} position.`);
      return;
    }

    // Load crew member actor
    const crewMember = await fromUuid(crewUuid);
    if (!crewMember) {
      ui.notifications.error(`Cannot find crew member actor`);
      return;
    }

    // Import the roll handler
    const { SWSERoll } = await import('../../combat/rolls/enhanced-rolls.js');

    // Roll the skill check using crew member's skills
    await SWSERoll.rollSkillCheck(crewMember, skillKey, {
      dc: dc,
      actionName: actionName,
      vehicleName: this.actor.name,
      positionName: position
    });
  }

  // Stub methods to prevent errors from parent class
  async _onAddFeat(event) { }
  async _onRemoveFeat(event) { }
  async _onAddTalent(event) { }
  async _onRemoveTalent(event) { }
  async _onAddForcePower(event) { }
  async _onRemoveForcePower(event) { }
  async _onRollForcePower(event) { }
  async _onRefreshForcePowers(event) { }
  async _onReloadForcePower(event) { }
  async _onAddSkill(event) { }
  async _onRemoveSkill(event) { }
  async _onLevelUp(event) { }
  async _onSecondWind(event) { }
  async _onOpenStore(event) { }
}
