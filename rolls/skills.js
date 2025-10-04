import { rollDice } from "./dice.js";
import { getAbilityMod, halfLevel } from "./utils.js";

export async function rollSkill(actor, skill) {
  const mod = skill.mod || 0;
  const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} makes a ${skill.name} check`
  });
  return roll;
}
