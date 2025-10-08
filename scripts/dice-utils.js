// ============================================
// FILE: scripts/dice-utils.js
// ============================================
export async function d20Check(actor, label, modifier, rollData = {}) {
  const formula = `1d20 + ${modifier}`;
  const roll = await new Roll(formula, rollData).evaluate({async: true});
  
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `<strong>${label}</strong> (d20 + ${modifier})`
  });
  return roll;
}
