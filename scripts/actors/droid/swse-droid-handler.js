import { ProgressionEngine } from "./scripts/progression/engine/progression-engine.js";
/**
 * Droid-specific functionality
 */

export class SWSEDroidHandler {

  static async applyDroidChassis(actor, chassisItem) {
    const chassis = chassisItem.system;

    // Prepare updates for ability scores, size, speed, HP, and system slots
    const updates = {
      'system.abilities': {
        str: { base: chassis.str || 10, racial: 0, temp: 0 },
        dex: { base: chassis.dex || 10, racial: 0, temp: 0 },
        con: { base: chassis.con || 10, racial: 0, temp: 0 },
        int: { base: chassis.int || 10, racial: 0, temp: 0 },
        wis: { base: chassis.wis || 10, racial: 0, temp: 0 },
        cha: { base: chassis.cha || 10, racial: 0, temp: 0 }
      },
      'system.size': chassis.size || 'medium',
      'system.speed': parseInt(chassis.speed) || 6,
      'system.hp.max': chassis.hp || 10,
      'system.hp.value': chassis.hp || 10, // Set current HP to max
      'system.systemSlots': {
        max: chassis.systemSlots || 0,
        used: 0
      }
    };

    // Clear incompatible items (organic-only equipment)
    const itemsToDelete = [];
    for (const item of actor.items) {
      // Remove organic-only items like Force powers (droids can't use the Force naturally)
      if (item.type === 'forcepower') {
        itemsToDelete.push(item.id);
      }
      // Remove biological equipment if flagged
      if (item.system.organicOnly) {
        itemsToDelete.push(item.id);
      }
    }

    if (itemsToDelete.length > 0) {
      await actor.deleteEmbeddedDocuments('Item', itemsToDelete);
      ui.notifications.info(`Removed ${itemsToDelete.length} incompatible item(s) from ${actor.name}`);
    }

    // Apply updates
    await actor.update(updates);

    // Add chassis item if not already present
    const existingChassis = actor.items.find(i => i.type === 'chassis');
    if (existingChassis) {
      await actor.deleteEmbeddedDocuments('Item', [existingChassis.id]);
    }
    await actor.createEmbeddedDocuments('Item', [chassisItem.toObject()]);

    // Create chat message
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor}),
      content: `<div class="swse chassis-applied">
        <h3>Droid Chassis Applied</h3>
        <p><strong>${actor.name}</strong> is now using the <strong>${chassisItem.name}</strong> chassis.</p>
        <ul>
          <li>System Slots: ${chassis.systemSlots || 0}</li>
          <li>Size: ${chassis.size || 'medium'}</li>
          <li>Speed: ${chassis.speed || 6} squares</li>
          <li>Hit Points: ${chassis.hp || 10}</li>
        </ul>
      </div>`
    });

    ui.notifications.info(`${actor.name} chassis set to ${chassisItem.name}`);
  }

  /**
   * Check if droid has available system slots
   */
  static hasAvailableSlots(actor) {
    const slots = actor.system.systemSlots;
    if (!slots) return false;
    return slots.used < slots.max;
  }

  /**
   * Install a droid system/upgrade
   */
  static async installSystem(actor, systemItem) {
    const slots = actor.system.systemSlots;
    const slotsRequired = systemItem.system.slotsRequired || 1;

    if (!slots || (slots.used + slotsRequired) > slots.max) {
      ui.notifications.error(`Not enough system slots! Need ${slotsRequired}, have ${slots.max - slots.used} available.`);
      return false;
    }

    // Add item and update slot usage
    await actor.createEmbeddedDocuments('Item', [systemItem.toObject()]);
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: actor.update({
      'system.systemSlots.used': slots.used + slotsRequired
    });
actor.update({
      'system.systemSlots.used': slots.used + slotsRequired
    });
/* ORIGINAL: actor.update({
      'system.systemSlots.used': slots.used + slotsRequired
    }); */


    ui.notifications.info(`Installed ${systemItem.name} (uses ${slotsRequired} slot(s))`);
    return true;
  }

  /**
   * Uninstall a droid system/upgrade
   */
  static async uninstallSystem(actor, systemItem) {
    const slots = actor.system.systemSlots;
    const slotsRequired = systemItem.system.slotsRequired || 1;

    await actor.deleteEmbeddedDocuments('Item', [systemItem.id]);
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: actor.update({
      'system.systemSlots.used': Math.max(0, slots.used - slotsRequired)
    });
actor.update({
      'system.systemSlots.used': Math.max(0, slots.used - slotsRequired)
    });
/* ORIGINAL: actor.update({
      'system.systemSlots.used': Math.max(0, slots.used - slotsRequired)
    }); */


    ui.notifications.info(`Uninstalled ${systemItem.name} (freed ${slotsRequired} slot(s))`);
    return true;
  }
}
