/**
 * Skill Focus identity for the derived skill calculation (3N-DC, moved verbatim from the former force-suite runtime wrapper).
 * Pure: does the actor own a Skill Focus feat whose selected choice is this skill? Leaf module (no imports).
 */
function normalizeName(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\(\d+\)\s*$/, '');
}

function normalizeChoiceKey(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function actorHasSkillFocusForSkill(actor, skillKey) {
  const wanted = normalizeChoiceKey(skillKey);
  if (!wanted) return false;
  for (const item of actor?.items ?? []) {
    if (item?.type !== 'feat') continue;
    if (normalizeName(item?.name) !== 'skill focus') continue;
    const choices = [
      item?.system?.selectedChoice,
      item?.flags?.swse?.selectedChoice,
      item?.flags?.['foundryvtt-swse']?.selectedChoice,
      item?.system?.choice,
      item?.system?.focusedSkill,
      item?.system?.skill
    ];
    for (const choice of choices) {
      if (!choice) continue;
      if (typeof choice === 'string') {
        if (normalizeChoiceKey(choice) === wanted) return true;
        continue;
      }
      const choiceValues = [choice.id, choice.key, choice.value, choice.slug, choice.label, choice.name, choice.skill, choice.target];
      if (choiceValues.some(value => normalizeChoiceKey(value) === wanted)) return true;
    }
  }
  return false;
}
