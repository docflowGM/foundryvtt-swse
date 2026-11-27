import { warnIfMixedTracks } from "/systems/foundryvtt-swse/scripts/utils/hardening.js";
import { getNpcMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
/**
 * Level split utilities (Heroic vs Nonheroic)
 *
 * Policy:
 * - In progression mode, heroic-derived scaling uses HEROIC levels only.
 * - In statblock mode for NPCs, we preserve legacy behavior by using total level for half-level.
 */

export function getLevelSplit(actor) {
  const classes = actor?.items?.filter((i) => i.type === 'class') ?? [];

  const heroicLevel = classes
    .filter((c) => c?.system?.isNonheroic !== true)
    .reduce((sum, c) => sum + (Number(c?.system?.level) || 0), 0);

  const nonheroicLevel = classes
    .filter((c) => c?.system?.isNonheroic === true)
    .reduce((sum, c) => sum + (Number(c?.system?.level) || 0), 0);

  const totalLevel = heroicLevel + nonheroicLevel;

  warnIfMixedTracks(actor, 'getLevelSplit');

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
 * Get level in a specific class by classId
 * Uses system.classId (stable identifier), not name-based detection
 *
 * @param {Actor} actor - The actor
 * @param {string} classId - Normalized class ID (e.g., "jedi", "noble", "sith_apprentice")
 * @returns {number} Level in that class (0 if not present)
 */
export function getClassLevel(actor, classId) {
  if (!actor) return 0;

  const classItem = actor.items.find(i =>
    i.type === "class" && i.system?.classId === classId
  );

  return classItem?.system?.level ?? 0;
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
 * 3N-DC: ONE level authority, three distinct rules (Core Rulebook, Combat chapter; owner directive):
 *   - SKILLS            use one-half CHARACTER level (heroic + nonheroic)       -> getHalfCharacterLevel
 *   - PERSONAL DAMAGE   uses one-half HEROIC level                              -> getHalfHeroicLevel
 *   - DEFENSES          use HEROIC level (getHeroicLevel, applied by DefenseCalculator)
 * Statblock NPCs keep the published total (system.level) for both halves. An actor with no class items at all (sparse/legacy data) falls back to
 * system.level rather than silently to zero.
 */
function isStatblockNpc(actor) {
  return actor?.type === 'npc' && getNpcMode(actor) !== 'progression';
}

function sparseTotal(actor) {
  return Number(actor?.system?.level) || 1;
}

/** One-half CHARACTER level, rounded down: the skill-check half level. */
export function getHalfCharacterLevel(actor) {
  if (isStatblockNpc(actor)) return Math.floor(sparseTotal(actor) / 2);
  const { totalLevel } = getLevelSplit(actor);
  return Math.floor((totalLevel > 0 ? totalLevel : sparseTotal(actor)) / 2);
}

/** One-half HEROIC level, rounded down: the personal-weapon-damage half level. Nonheroic levels never count. */
export function getHalfHeroicLevel(actor) {
  if (isStatblockNpc(actor)) return Math.floor(sparseTotal(actor) / 2);
  const { heroicLevel, totalLevel } = getLevelSplit(actor);
  if (totalLevel <= 0) return Math.floor(sparseTotal(actor) / 2);
  return Math.floor(heroicLevel / 2);
}

/**
 * Core system “soft cap” policy helper.
 * Epic override is opt-in via world setting.
 */

export function getPlannedHeroicLevel(actor, pendingData = {}) {
  const planned = Number(pendingData?.plannedHeroicLevel ?? pendingData?.newHeroicLevel ?? pendingData?.newLevel);
  if (Number.isFinite(planned) && planned > 0) {return planned;}
  return null;
}

// Epic-override reads live in scripts/settings/epic-override.js (HouseRuleService-backed); the duplicate here had no importers (F-SET-001).
