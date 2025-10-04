export async function rollSave(actor, type) {
  const saveBonus = actor.system.defenses[type]?.class || 0;
  const roll = await new Roll(`1d20 + ${saveBonus}`).evaluate({async: true});
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} rolls a ${type} save`
  });
  return roll;
}
