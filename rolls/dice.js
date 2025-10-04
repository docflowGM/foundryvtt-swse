export async function rollDice(formula, data = {}, label = "Roll") {
  try {
    const r = new Roll(formula, data);
    await r.evaluate({ async: true });
    r.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: label
    });
    return r;
  } catch (err) {
    ui.notifications.error(`Dice roll failed: ${err.message}`);
    console.error(err);
  }
}
