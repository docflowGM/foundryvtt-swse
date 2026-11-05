/**
 * Shaper — Shaper Lore (Legacy Era Campaign Guide, Shaper prestige class).
 *
 * A Shaper receives half their Shaper CLASS level, rounded down, as a
 * situational bonus on Knowledge (Life Sciences) and Treat Injury checks
 * concerning biotech devices, regardless of device size or complexity.
 *
 * Biotech applicability is a GM/player-adjudicated check context, never
 * inferred from the actor's species, carried implants, or the skill name.
 * This helper is pure; the skill-roll authority owns the actual roll.
 */
const normalized = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,'');
const itemsOf = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);

export function shaperClassLevel(actor) {
  return itemsOf(actor)
    .filter(item => item?.type === 'class'
      && normalized(item?.system?.className || item?.system?.class_name || item?.name) === 'shaper')
    .reduce((max,item) => {
      const level = Number(item?.system?.level);
      return Number.isSafeInteger(level) && level > 0 ? Math.max(max,level) : max;
    },0);
}

export function isShaperLoreSkill(skillKey) {
  const key = normalized(skillKey);
  return key === 'knowledgelifesciences' || key === 'treatinjury';
}

export function shaperLoreBonus(actor,skillKey,{biotechDevice=false}={}) {
  if (biotechDevice !== true || !isShaperLoreSkill(skillKey)) return 0;
  return Math.min(5,Math.floor(shaperClassLevel(actor)/2));
}

export function canApplyShaperLore(actor,skillKey) {
  return isShaperLoreSkill(skillKey) && shaperClassLevel(actor)>=2;
}
