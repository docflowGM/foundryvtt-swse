// ============================================
// FILE: rolls/skills.js
// ============================================
import { halfLevel } from "./utils.js";

export async function rollSkill(actor, skillKey) {
  const skill = actor.system.skills?.[skillKey];
  if (!skill) {
    ui.notifications.warn(`Skill ${skillKey} not found`);
    return null;
  }
  
  const mod = actor.getSkillMod(skill);
  const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${skill.label || skillKey} Check`
  });
  return roll;
}