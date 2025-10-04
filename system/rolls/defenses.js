import { getAbilityMod, fullLevel } from "./utils.js";

export function calculateDefense(actor, type) {
  const def = actor.system.defenses[type];
  if (!def) return 10;

  const base = 10;
  const lvl = fullLevel(actor.system.level || 1);
  const ability = getAbilityMod(actor.system.abilities[def.ability]?.base ?? 10);
  const armor = def.armor || 0;
  const misc = def.modifier || 0;
  const cls = def.class || 0;

  return base + lvl + ability + armor + cls + misc;
}
