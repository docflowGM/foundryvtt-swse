/**
 * Roll a d20 check with a modifier, then send to chat.
 * @param {Actor} actor       The actor doing the roll
 * @param {string} label      A label for the roll (e.g. "Acrobatics")
 * @param {number} modifier   The numeric modifier to add
 * @param {object} rollData   The actor's roll data context
 */
export async function d20Check(actor, label, modifier, rollData={}) {
  // Build the formula and roll it
  const formula = `1d20 + ${modifier}`;
  const roll = await new Roll(formula, rollData).roll({async: true});
  
  // Send the result to chat
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `<strong>${label}</strong> (d20 + ${modifier})`
  });
}
