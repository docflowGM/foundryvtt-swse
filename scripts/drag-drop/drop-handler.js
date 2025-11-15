/**
 * Centralized Drag-Drop Handler for SWSE
 * Handles dropping Items onto Actors with automatic stat application
 */

export class DropHandler {
  
  static async handleItemDrop(actor, data) {
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

    // Apply racial bonuses
    const abilityMods = species.system.abilityMods || species.system.bonuses || {};
    const updates = {
      'system.abilities.str.racial': abilityMods.str || 0,
      'system.abilities.dex.racial': abilityMods.dex || 0,
      'system.abilities.con.racial': abilityMods.con || 0,
      'system.abilities.int.racial': abilityMods.int || 0,
      'system.abilities.wis.racial': abilityMods.wis || 0,
      'system.abilities.cha.racial': abilityMods.cha || 0,
      'system.size': species.system.size || 'medium',
      'system.speed.base': species.system.speed || 6
    };

    await actor.update(updates);

    ui.notifications.info(game.i18n.format('SWSE.Notifications.Items.SpeciesApplied', {species: species.name, actor: actor.name}));
    return true;
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
      'system.speed.base': chassis.system.speed || 6
    };
    
    await actor.update(updates);
    
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
    
    await actor.update({
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
