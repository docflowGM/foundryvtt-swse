// ============================================
// FILE: rolls/dice.js
// ============================================
export async function rollDice(formula, data = {}, label = "Roll") {
  try {
    const roll = await new Roll(formula, data).evaluate({async: true});
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: label
    });
    return roll;
  } catch (err) {
    ui.notifications.error(`Dice roll failed: ${err.message}`);
    console.error(err);
    return null;
  }
}