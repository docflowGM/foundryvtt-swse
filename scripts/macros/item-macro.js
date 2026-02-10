/**
 * Item Macro functionality for SWSE
 * Creates macros from item drops on the hotbar
 */

/**
 * Create a macro from an item drop
 * @param {Object} data - The drop data containing item UUID
 * @param {number} slot - The hotbar slot number
 */
export async function createItemMacro(data, slot) {
  if (!data.uuid) {return;}

  const item = await fromUuid(data.uuid);
  if (!item) {return;}

  // Create the macro command
  const command = `
    const item = await fromUuid("${data.uuid}");
    if (item) {
      if (item.actor) {
        item.actor.useItem(item);
      } else {
        ui.notifications.warn("This item is not owned by an actor.");
      }
    }
  `;

  let macro = game.macros.find(m =>
    (m.name === item.name) && (m.command === command)
  );

  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'swse.itemMacro': true }
    });
  }

  game.user.assignHotbarMacro(macro, slot);
}
