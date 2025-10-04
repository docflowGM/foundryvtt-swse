export async function rollInitiative(actor) {
  const dex = actor.system.abilities.dex.base || 0;
  const roll = await new Roll(`1d20 + ${dex}`).evaluate({async: true});
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} rolls initiative!`
  });
  return roll;
}
