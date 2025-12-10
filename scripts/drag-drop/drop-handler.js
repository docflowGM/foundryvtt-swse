import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * Centralized Drag-Drop Handler for SWSE
 * Handles dropping Items onto Actors with automatic stat application
 */

import { ProficiencySelectionDialog } from '../apps/proficiency-selection-dialog.js';

export class DropHandler {

  static async handleItemDrop(actor, data) {
    // Handle NPC Template drops (custom data type)
    if (data.type === 'npc-template') {
      return this.handleNPCTemplateDrop(actor, data);
    }

    if (data.type !== 'Item') return;

    const item = await Item.implementation.fromDropData(data);
    if (!item) return;

    switch (item.type) {
      case 'species':
        return this.handleSpeciesDrop(actor, item);
      case 'class':
        return this.handleClassDrop(actor, item);
      case 'feat':
        return this.handleFeatDrop(actor, item);
      case 'talent':
        return this.handleTalentDrop(actor, item);
      case 'forcepower':
        return this.handleForcePowerDrop(actor, item);
      case 'droid-chassis':
        return this.handleDroidChassisDrop(actor, item);
      case 'vehicle-template':
        return this.handleVehicleTemplateDrop(actor, item);
      default:
        return this.handleDefaultDrop(actor, item);
    }
  }

  static async handleNPCTemplateDrop(actor, data) {
    // Apply NPC template to actor
    // This replaces the actor's stats with the template data

    if (actor.type !== 'npc') {
      ui.notifications.warn('NPC templates can only be applied to NPC actors!');
      return false;
    }

    const template = data.templateData;
    if (!template) {
      ui.notifications.error('Invalid NPC template data');
      return false;
    }

    const confirm = await Dialog.confirm({
      title: 'Apply NPC Template?',
      content: `<p>This will replace <strong>${actor.name}</strong>'s stats with the <strong>${template.name}</strong> template.</p>
                <p><strong>This cannot be undone!</strong></p>`
    });

    if (!confirm) return false;

    // Build update object
    const updates = {
      'name': template.name
    };

    // Update abilities
    if (template.abilities) {
      for (const [key, value] of Object.entries(template.abilities)) {
        updates[`system.abilities.${key}.base`] = value.base;
        updates[`system.abilities.${key}.total`] = value.total;
      }
    }

    // Update defenses
    if (template.defenses) {
      for (const [key, value] of Object.entries(template.defenses)) {
        updates[`system.defenses.${key}.total`] = value.total;
      }
    }

    // Update HP
    if (template.hp) {
      updates['system.hp.max'] = template.hp.max;
      updates['system.hp.value'] = template.hp.value;
    }

    // Update other stats - ensure all numeric values are proper integers
    if (template.level) updates['system.level'] = parseInt(template.level) || 1;
    if (template.challengeLevel) updates['system.challengeLevel'] = parseInt(template.challengeLevel) || 1;
    if (template.size) updates['system.size'] = template.size;
    if (template.speed !== undefined) updates['system.speed'] = parseInt(template.speed) || 6;
    if (template.bab !== undefined) updates['system.bab'] = parseInt(template.bab) || 0;
    if (template.initiative !== undefined) updates['system.initiative'] = parseInt(template.initiative) || 0;
    if (template.damageThreshold) updates['system.damageThreshold'] = parseInt(template.damageThreshold) || 10;
    if (template.perception !== undefined) updates['system.perception'] = parseInt(template.perception) || 0;
    if (template.senses) updates['system.senses'] = template.senses;

    // Update condition track
    if (template.conditionTrack) {
      updates['system.conditionTrack'] = template.conditionTrack;
    }

    // Apply updates
    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);

    // Create embedded items for feats, talents, etc.
    // Try to find matching items in compendiums first
    const itemsToCreate = [];

    // Helper function to find item in compendiums
    const findInCompendiums = async (itemName, itemType) => {
      // Search all world and compendium items
      const packs = game.packs.filter(p => p.documentName === 'Item');

      for (const pack of packs) {
        // Search by name (case-insensitive)
        const index = await pack.getIndex();
        const entry = index.find(i =>
          i.name.toLowerCase() === itemName.toLowerCase() &&
          (!itemType || i.type === itemType)
        );

        if (entry) {
          const item = await pack.getDocument(entry._id);
          return item ? item.toObject() : null;
        }
      }

      // Also search world items
      const worldItem = game.items.find(i =>
        i.name.toLowerCase() === itemName.toLowerCase() &&
        (!itemType || i.type === itemType)
      );

      return worldItem ? worldItem.toObject() : null;
    };

    // Add feats
    if (template.feats && template.feats.length > 0) {
      for (const featName of template.feats) {
        const existingFeat = await findInCompendiums(featName, 'feat');
        if (existingFeat) {
          itemsToCreate.push(existingFeat);
        } else {
          // Create placeholder if not found
          itemsToCreate.push({
            name: featName,
            type: 'feat',
            system: { description: `From ${template.name} template (placeholder - not found in compendium)` }
          });
        }
      }
    }

    // Add talents
    if (template.talents && template.talents.length > 0) {
      for (const talentName of template.talents) {
        const existingTalent = await findInCompendiums(talentName, 'talent');
        if (existingTalent) {
          itemsToCreate.push(existingTalent);
        } else {
          // Create placeholder if not found
          itemsToCreate.push({
            name: talentName,
            type: 'talent',
            system: { description: `From ${template.name} template (placeholder - not found in compendium)` }
          });
        }
      }
    }

    // Parse and add equipment from the equipment string
    if (template.equipment) {
      const equipmentItems = template.equipment.split(',').map(e => e.trim()).filter(e => e.length > 0);
      for (const equipName of equipmentItems.slice(0, 10)) { // Limit to first 10 items
        // Try to find equipment in compendiums
        const existingEquip = await findInCompendiums(equipName, 'equipment');
        if (existingEquip) {
          itemsToCreate.push(existingEquip);
        }
        // Don't create placeholder equipment - just skip if not found
      }
    }

    // Create all items at once
    if (itemsToCreate.length > 0) {
      await actor.createEmbeddedDocuments('Item', itemsToCreate);
    }

    // Add notes to biography if available
    if (template.skillsText || template.equipment || template.abilitiesText) {
      let bioNotes = '<h2>Template Notes</h2>';
      if (template.skillsText) bioNotes += `<h3>Skills</h3><p>${template.skillsText}</p>`;
      if (template.equipment) bioNotes += `<h3>Equipment</h3><p>${template.equipment}</p>`;
      if (template.abilitiesText) bioNotes += `<h3>Special Abilities</h3><p>${template.abilitiesText}</p>`;
      if (template.speciesTraits) bioNotes += `<h3>Species Traits</h3><p>${template.speciesTraits}</p>`;

      await globalThis.SWSE.ActorEngine.updateActor(actor, {
        'system.biography': (actor.system.biography || '') + bioNotes
      });
    }

    ui.notifications.info(`Applied ${template.name} template to ${actor.name}`);
    return true;
  }
  
  static async handleSpeciesDrop(actor, species) {
    // Apply species bonuses:
    // - Ability score modifiers
    // - Size
    // - Speed
    // - Special abilities/features

    // Check if actor already has a species
    const existingSpecies = actor.items.find(i => i.type === 'species');
    if (existingSpecies) {
      const replace = await Dialog.confirm({
        title: game.i18n.localize('SWSE.Dialogs.ReplaceSpecies.Title'),
        content: game.i18n.format('SWSE.Dialogs.ReplaceSpecies.Content', {
          actor: actor.name,
          existing: existingSpecies.name,
          new: species.name
        })
      });

      if (!replace) return;
      await existingSpecies.delete();
    }

    await actor.createEmbeddedDocuments('Item', [species.toObject()]);

    // Parse racial ability bonuses from string format (e.g., "+2 Dex, -2 Con")
    const abilityMods = this._parseAbilityString(species.system.abilities || "None");

    const updates = {
      'system.attributes.str.racial': abilityMods.str || 0,
      'system.attributes.dex.racial': abilityMods.dex || 0,
      'system.attributes.con.racial': abilityMods.con || 0,
      'system.attributes.int.racial': abilityMods.int || 0,
      'system.attributes.wis.racial': abilityMods.wis || 0,
      'system.attributes.cha.racial': abilityMods.cha || 0,
      'system.size': species.system.size || 'Medium',
      'system.speed': parseInt(species.system.speed) || 6,
      'system.race': species.name  // Store species name for display
    };

    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);

    ui.notifications.info(game.i18n.format('SWSE.Notifications.Items.SpeciesApplied', {species: species.name, actor: actor.name}));
    return true;
  }

  /**
   * Parse ability string like "+2 Dex, -2 Con" or "+4 Str, +2 Con, -2 Int, -2 Cha"
   * @param {string} abilityString - Ability modifier string
   * @returns {Object} Map of ability keys to numeric bonuses
   */
  static _parseAbilityString(abilityString) {
    const bonuses = {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0
    };

    if (!abilityString || abilityString === "None" || abilityString === "none") {
      return bonuses;
    }

    // Map of ability name variations to keys
    const abilityMap = {
      'str': 'str', 'strength': 'str',
      'dex': 'dex', 'dexterity': 'dex',
      'con': 'con', 'constitution': 'con',
      'int': 'int', 'intelligence': 'int',
      'wis': 'wis', 'wisdom': 'wis',
      'cha': 'cha', 'charisma': 'cha'
    };

    // Split by comma and parse each part
    const parts = abilityString.split(',').map(p => p.trim());

    for (const part of parts) {
      // Match patterns like "+2 Dex", "-2 Con", "+4 Str"
      const match = part.match(/([+-]?\d+)\s*([a-zA-Z]+)/);
      if (match) {
        const value = parseInt(match[1]);
        const abilityName = match[2].toLowerCase();
        const abilityKey = abilityMap[abilityName];

        if (abilityKey) {
          bonuses[abilityKey] = value;
        }
      }
    }

    return bonuses;
  }
  
  static async handleClassDrop(actor, classItem) {
    // Add class level:
    // - Grant class features for this level
    // - Update BAB progression
    // - Update defense bonuses
    // - Add class skills
    
    // Check if this class already exists
    const existingClass = actor.items.find(i => 
      i.type === 'class' && i.name === classItem.name
    );
    
    if (existingClass) {
      ui.notifications.warn(game.i18n.format('SWSE.Notifications.Items.AlreadyHasClass', {actor: actor.name, class: classItem.name}));
      return false;
    }
    
    await actor.createEmbeddedDocuments('Item', [classItem.toObject()]);
    
    ui.notifications.info(`Added ${classItem.name} class to ${actor.name}`);
    return true;
  }
  
  static async handleDroidChassisDrop(actor, chassis) {
    // Apply droid chassis template:
    // - Replace ALL actor stats with chassis stats
    // - Set ability scores
    // - Set defenses
    // - Set HP
    // - Set speed
    // - Add system slots
    
    if (actor.type !== 'droid') {
      ui.notifications.warn('Droid chassis can only be applied to droid actors!');
      return false;
    }
    
    const confirm = await Dialog.confirm({
      title: 'Apply Droid Chassis?',
      content: `<p>This will replace <strong>${actor.name}</strong>'s stats with the ${chassis.name} chassis.</p>
                <p><strong>This cannot be undone!</strong></p>`
    });
    
    if (!confirm) return false;
    
    const updates = {
      'system.abilities.str.base': chassis.system.abilities?.str || 10,
      'system.abilities.dex.base': chassis.system.abilities?.dex || 10,
      'system.abilities.con.base': chassis.system.abilities?.con || 10,
      'system.abilities.int.base': chassis.system.abilities?.int || 10,
      'system.abilities.wis.base': chassis.system.abilities?.wis || 10,
      'system.abilities.cha.base': chassis.system.abilities?.cha || 10,
      'system.hp.max': chassis.system.hp || 30,
      'system.hp.value': chassis.system.hp || 30,
      'system.speed': parseInt(chassis.system.speed) || 6
    };

    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
    
    ui.notifications.info(`Applied ${chassis.name} droid chassis to ${actor.name}`);
    return true;
  }
  
  static async handleVehicleTemplateDrop(actor, template) {
    // Apply vehicle template:
    // - Replace ALL vehicle stats
    // - Set ship systems
    // - Set weapons
    // - Set crew requirements
    // - Set cargo capacity
    
    if (actor.type !== 'vehicle') {
      ui.notifications.warn('Vehicle templates can only be applied to vehicle actors!');
      return false;
    }
    
    const confirm = await Dialog.confirm({
      title: 'Apply Vehicle Template?',
      content: `<p>This will replace <strong>${actor.name}</strong>'s stats with the ${template.name} template.</p>
                <p><strong>This cannot be undone!</strong></p>`
    });
    
    if (!confirm) return false;

    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.vehicleType': template.system.vehicleType || 'starfighter',
      'system.shields': template.system.shields || 0,
      'system.hull': template.system.hull || 0,
      'system.speed': template.system.speed || 0
    });

    ui.notifications.info(`Applied ${template.name} vehicle template to ${actor.name}`);
    return true;
  }
  
  static async handleForcePowerDrop(actor, power) {
    // Add to known powers:
    // - Check prerequisites
    // - Add to Force Powers list
    // - Optionally add to active suite
    
    // Check if already known
    const existingPower = actor.items.find(i => 
      i.type === 'forcepower' && i.name === power.name
    );
    
    if (existingPower) {
      ui.notifications.warn(`${actor.name} already knows ${power.name}`);
      return false;
    }
    
    await actor.createEmbeddedDocuments('Item', [power.toObject()]);
    ui.notifications.info(`${actor.name} learned ${power.name}`);
    return true;
  }
  
  static async handleFeatDrop(actor, feat) {
    // Add feat:
    // - Check prerequisites
    // - Apply passive bonuses automatically
    // - Trigger recalculation

    // Check if this feat requires category selection (Weapon/Armor Proficiency, Weapon Focus, Weapon Specialization)
    const result = await ProficiencySelectionDialog.handleFeatWithCategorySelection(actor, feat);

    if (result === false) {
      // User cancelled or feat already exists
      return false;
    }

    if (result !== null) {
      // Category selection was handled, feat was created
      return true;
    }

    // No category selection needed, proceed with normal feat handling
    // Check if already has feat
    const existingFeat = actor.items.find(i =>
      i.type === 'feat' && i.name === feat.name
    );

    if (existingFeat) {
      ui.notifications.warn(`${actor.name} already has ${feat.name}`);
      return false;
    }

    await actor.createEmbeddedDocuments('Item', [feat.toObject()]);
    ui.notifications.info(`${actor.name} gained feat: ${feat.name}`);
    return true;
  }
  
  static async handleTalentDrop(actor, talent) {
    // Add talent:
    // - Check tree prerequisites
    // - Validate class access
    // - Apply bonuses
    
    // Check if already has talent
    const existingTalent = actor.items.find(i => 
      i.type === 'talent' && i.name === talent.name
    );
    
    if (existingTalent) {
      ui.notifications.warn(`${actor.name} already has ${talent.name}`);
      return false;
    }
    
    await actor.createEmbeddedDocuments('Item', [talent.toObject()]);
    ui.notifications.info(`${actor.name} gained talent: ${talent.name}`);
    return true;
  }
  
  static async handleDefaultDrop(actor, item) {
    // Standard item addition
    const created = await actor.createEmbeddedDocuments('Item', [item.toObject()]);
    
    if (created && created.length > 0) {
      ui.notifications.info(`Added ${item.name} to ${actor.name}`);
      return true;
    }
    
    return false;
  }
}
