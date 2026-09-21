/**
 * Armor / Energy Shield active-use effects — shared authority.
 *
 * Math Integrity Freeze, Batch 2A. Before this module existed, ordinary body
 * armor's Armor Check Penalty (ACP) was computed independently (and wrongly)
 * in ModifierEngine._getItemModifiers() and the dead armor-rule.js, while
 * Energy Shields were excluded from that computation entirely, from
 * resolveAttackBonus() (which never applied ANY armor/shield ACP), and from
 * DefenseCalculator's Reflex math (which only ever modeled body armor).
 *
 * SWSE RAW contract this module implements:
 *
 *   Ordinary body armor, when worn:
 *     proficient:     ACP on attacks/skills = 0
 *     not proficient: ACP = the armor's own listed value (category default
 *                     -2/-5/-10 for light/medium/heavy only when the item
 *                     itself carries no listed value)
 *
 *   Personal Energy Shield:
 *     inactive: no ACP, no Max Dex restriction, no Reflex penalty, no speed
 *               penalty, Dex retained normally, regardless of proficiency
 *     active, proficient:     listed ACP always applies; Max Dex restriction
 *                             applies; no Reflex penalty; positive Dex
 *                             retained subject to Max Dex; no speed penalty
 *     active, not proficient: listed ACP STILL applies (exactly once, same
 *                             value as the proficient case -- proficiency
 *                             never suppresses an active shield's ACP);
 *                             Max Dex restriction applies; Reflex -5;
 *                             positive Dex bonus to Reflex denied; no speed
 *                             penalty
 *
 * Body armor and an Energy Shield are separate layers, not alternatives: a
 * character may wear both. This resolver returns each contribution
 * separately so attack/skill/defense consumers combine them without
 * recreating either rule.
 *
 * Energy Shields never reduce speed (see the "Energy Shields never reduce
 * speed" regression coverage) -- this resolver never emits a shield speed
 * contribution regardless of what a shield item's own (possibly stale)
 * speedPenalty field says.
 */

import {
  isEnergyShieldItem,
  resolveArmorData,
  actorHasArmorProficiencyForArmor,
  getArmorProficiencyPenalty
} from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

// The SWSE RAW-affected-skill list for armor/shield Armor Check Penalty.
// Do not invent another affected-skill list -- every ACP consumer in this
// codebase must use exactly this set.
export const ACP_AFFECTED_SKILLS = Object.freeze([
  'acrobatics', 'climb', 'endurance', 'initiative', 'jump', 'stealth', 'swim'
]);

function normalizePenalty(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 0;
  return n > 0 ? -n : n;
}

function actorItems(actor) {
  return Array.from(actor?.items ?? []);
}

function resolveBodyArmorContribution(actor) {
  const item = actorItems(actor).find(i => i?.type === 'armor' && i?.system?.equipped && !isEnergyShieldItem(i));
  if (!item) return null;

  const data = resolveArmorData(item);
  const proficient = actorHasArmorProficiencyForArmor(actor, item);
  const listedPenalty = normalizePenalty(data.armorCheckPenalty);
  const categoryDefault = normalizePenalty(getArmorProficiencyPenalty(data.armorType));
  const acp = proficient ? 0 : (listedPenalty || categoryDefault);

  return {
    item,
    data,
    proficient,
    active: true,
    armorType: data.armorType,
    acp,
    maxDexCap: Number.isFinite(Number(data.maxDexBonus)) ? Number(data.maxDexBonus) : null
  };
}

function resolveActiveShieldContribution(actor, item) {
  const data = resolveArmorData(item);
  if (!data.activated) return null;

  const proficient = actorHasArmorProficiencyForArmor(actor, item);
  const shieldRequiredType = data.proficiencyRequired || 'light';
  const listedPenalty = normalizePenalty(data.armorCheckPenalty);
  const categoryDefault = normalizePenalty(getArmorProficiencyPenalty(shieldRequiredType));
  // The listed ACP applies once an Energy Shield is active, regardless of
  // proficiency -- proficiency changes only the Reflex consequences below.
  const acp = listedPenalty || categoryDefault;

  return {
    item,
    data,
    proficient,
    active: true,
    armorType: shieldRequiredType,
    acp,
    maxDexCap: Number.isFinite(Number(data.maxDexBonus)) ? Number(data.maxDexBonus) : null,
    reflexPenalty: proficient ? 0 : -5,
    denyPositiveDexToReflex: !proficient
  };
}

/**
 * Resolve every player-visible effect of worn body armor and active Energy
 * Shields for one actor, as a single provenance-carrying authority.
 *
 * @param {Actor} actor
 * @returns {{
 *   bodyArmor: object|null,
 *   activeEnergyShields: object[],
 *   attackCheckPenalty: number,
 *   skillCheckPenalty: number,
 *   maxDexCap: number|null,
 *   reflexPenalty: number,
 *   denyPositiveDexToReflex: boolean,
 *   parts: object[]
 * }}
 */
export function resolveArmorUsageEffects(actor) {
  const parts = [];

  const bodyArmor = resolveBodyArmorContribution(actor);
  if (bodyArmor && bodyArmor.acp !== 0) {
    parts.push({
      semanticKey: 'bodyArmor.acp',
      sourceId: bodyArmor.item.id,
      sourceName: bodyArmor.item.name || 'Armor',
      value: bodyArmor.acp,
      effect: 'attackAndSkillCheckPenalty',
      active: true,
      proficient: bodyArmor.proficient
    });
  }

  const shieldItems = actorItems(actor).filter(i => i?.type === 'armor' && i?.system?.equipped && isEnergyShieldItem(i));
  const activeEnergyShields = [];
  for (const shieldItem of shieldItems) {
    const contribution = resolveActiveShieldContribution(actor, shieldItem);
    if (!contribution) continue;
    activeEnergyShields.push(contribution);

    if (contribution.acp !== 0) {
      parts.push({
        semanticKey: 'shield.acp',
        sourceId: shieldItem.id,
        sourceName: `${shieldItem.name || 'Energy Shield'} (Armor Check Penalty)`,
        value: contribution.acp,
        effect: 'attackAndSkillCheckPenalty',
        active: true,
        proficient: contribution.proficient
      });
    }
    if (contribution.reflexPenalty !== 0) {
      parts.push({
        semanticKey: 'shield.reflexNonproficiency',
        sourceId: shieldItem.id,
        sourceName: `${shieldItem.name || 'Energy Shield'} (Nonproficiency)`,
        value: contribution.reflexPenalty,
        effect: 'reflexPenalty',
        active: true,
        proficient: contribution.proficient
      });
    }
  }

  const attackCheckPenalty = (bodyArmor?.acp || 0) + activeEnergyShields.reduce((sum, c) => sum + c.acp, 0);
  // Same authority, same value: the rule contract applies one ACP number to
  // both attack rolls and the affected skill list, not two independently
  // derived numbers.
  const skillCheckPenalty = attackCheckPenalty;

  const maxDexCandidates = [bodyArmor?.maxDexCap, ...activeEnergyShields.map(c => c.maxDexCap)]
    .filter(value => Number.isFinite(value));
  const maxDexCap = maxDexCandidates.length ? Math.min(...maxDexCandidates) : null;

  const reflexPenalty = activeEnergyShields.reduce((sum, c) => sum + (c.reflexPenalty || 0), 0);
  const denyPositiveDexToReflex = activeEnergyShields.some(c => c.denyPositiveDexToReflex);

  return {
    bodyArmor,
    activeEnergyShields,
    attackCheckPenalty,
    skillCheckPenalty,
    maxDexCap,
    reflexPenalty,
    denyPositiveDexToReflex,
    parts
  };
}

export default { resolveArmorUsageEffects, ACP_AFFECTED_SKILLS };
