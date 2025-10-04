export async function rollDamage(actor, weapon) {
  const dmg = weapon.system.damage || "1d6";
  const roll = await new Roll(dmg).evaluate({async: true});
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} deals damage with ${weapon.name}`
  });
  return roll;
}
