import { warnIfMixedTracks } from "../../utils/hardening.js";
/**
 * Level split utilities (Heroic vs Nonheroic)
 *
 * Policy:
 * - In progression mode, heroic-derived scaling uses HEROIC levels only.
 * - In statblock mode for NPCs, we preserve legacy behavior by using total level for half-level.
 */

export function getLevelSplit(actor) {
  const classes = actor?.items?.filter((i) => i.type === "class") ?? [];

  const heroicLevel = classes
    .filter((c) => c?.system?.isNonheroic !== true)
    .reduce((sum, c) => sum + (Number(c?.system?.level) || 0), 0);

  const nonheroicLevel = classes
    .filter((c) => c?.system?.isNonheroic === true)
    .reduce((sum, c) => sum + (Number(c?.system?.level) || 0), 0);

  const totalLevel = heroicLevel + nonheroicLevel;

  warnIfMixedTracks(actor, "getLevelSplit");

  return { heroicLevel, nonheroicLevel, totalLevel };
}

export function getHeroicLevel(actor) {
  return getLevelSplit(actor).heroicLevel;
}

export function getNonheroicLevel(actor) {
  return getLevelSplit(actor).nonheroicLevel;
}

export function getTotalLevel(actor) {
  return getLevelSplit(actor).totalLevel;
}

/**
 * Epic = heroic level progression beyond 20 (planned or current).
 * By policy, epic play is "tolerated" (technical) but not mechanically recommended.
 */
export function isEpicActor(actor, plannedHeroicLevel = null) {
  const heroic = Number(plannedHeroicLevel) || getHeroicLevel(actor) || 0;
  return heroic > 20;
}

export function getHeroicHalfLevel(actor) {
  const { heroicLevel } = getLevelSplit(actor);
  return Math.floor((Number(heroicLevel) || 0) / 2);
}

/**
 * Half-level for calculations that should respect:
 * - NPC statblock mode: use actor.system.level (legacy / printed)
 * - NPC progression mode: heroic levels only
 * - PCs: heroic levels (normally equals total)
 */
export function getEffectiveHalfLevel(actor) {
  const totalLevel = Number(actor?.system?.level) || 1;
  const type = actor?.type;

  if (type === "npc") {
    const mode = actor.getFlag?.("swse", "npcLevelUp.mode") ?? "statblock";
    if (mode !== "progression") return Math.floor(totalLevel / 2);
    return getHeroicHalfLevel(actor);
  }

  const { heroicLevel, totalLevel: sumTotal } = getLevelSplit(actor);
  const effective = (heroicLevel > 0 ? heroicLevel : (sumTotal > 0 ? sumTotal : totalLevel));
  return Math.floor((Number(effective) || 0) / 2);
}

/**
 * Core system “soft cap” policy helper.
 * Epic override is opt-in via world setting.
 */

export function getPlannedHeroicLevel(actor, pendingData = {}) {
  const planned = Number(pendingData?.plannedHeroicLevel ?? pendingData?.newHeroicLevel ?? pendingData?.newLevel);
  if (Number.isFinite(planned) && planned > 0) return planned;
  return null;
}

export function isEpicOverrideEnabled() {
  return game.settings?.get("foundryvtt-swse", "epicOverride") === true;
}
