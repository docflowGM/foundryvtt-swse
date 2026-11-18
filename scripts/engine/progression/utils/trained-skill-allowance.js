/**
 * Trained-skill allowance for chargen (heroic and Nonheroic).
 *
 * Single formula authority, extracted unchanged from SkillsStep so the step,
 * the Nonheroic readiness check and finalization all agree:
 *   max(1, class trained skills + INT modifier + Human bonus + species bonus skill)
 *
 * INT is read from the PENDING session attribute selection first (what the GM/
 * player just assigned), plus the pending species INT adjustment; the actor's
 * stored ability record is only a last-resort fallback when no attribute
 * selection exists.
 */

export function abilityModifierFromScore(score) {
  const safe = Number(score);
  return Math.floor(((Number.isFinite(safe) ? safe : 10) - 10) / 2);
}

export function resolveTrainedSkillAllowance({
  classModel = null,
  attributeSelection = null,
  speciesSelection = null,
  pendingSpeciesContext = null,
  character = {},
} = {}) {
  const classTrainedSkills = Number(
    classModel?.trainedSkills
    ?? classModel?.skillPoints
    ?? classModel?.system?.trainedSkills
    ?? classModel?.system?.skillPoints
    ?? 0
  ) || 0;

  const selectedInt = Number(
    attributeSelection?.values?.int
    ?? attributeSelection?.int
    ?? character?.abilities?.int?.base
    ?? character?.abilities?.int?.value
    ?? character?.abilities?.int?.total
    ?? character?.attributes?.int?.value
    ?? 10
  ) || 10;

  const speciesAbilityScores = speciesSelection?.abilityScores || speciesSelection?.system?.abilityScores || {};
  const speciesIntBonus = Number(
    speciesAbilityScores.int
    ?? speciesAbilityScores.Intelligence
    ?? speciesAbilityScores.intelligence
    ?? 0
  ) || 0;

  const intMod = abilityModifierFromScore(selectedInt + speciesIntBonus);

  const speciesName = String(
    speciesSelection?.name
    ?? speciesSelection?.label
    ?? speciesSelection?.id
    ?? character?.species
    ?? character?.details?.species
    ?? ''
  ).trim().toLowerCase();

  const humanBonus = (
    speciesName === 'human'
    || speciesName === 'nearhuman'
    || speciesName === 'near_human'
    || speciesName === 'near-human'
  ) ? 1 : 0;

  // Phase 10A: species with a player-chosen bonus trained skill (Altiri, Vultan,
  // Republic Clone, Mandalorian (Human Variant)...). Human is covered above.
  const hasBonusTrainedSkillChoiceTrait = humanBonus === 0 && (pendingSpeciesContext?.traits || []).some(
    t => t.classification === 'grant'
      && t.source === 'bonusTrainedSkill'
      && (t.grants || []).some(g => g.grantType === 'trainedSkill' && g.frequency === 'choice')
  );
  const speciesBonusSkill = hasBonusTrainedSkillChoiceTrait ? 1 : 0;

  return Math.max(1, classTrainedSkills + intMod + humanBonus + speciesBonusSkill);
}
