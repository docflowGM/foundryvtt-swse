/**
 * scripts/utils/skill-resolver.js
 *
 * Resolves skill references in a backwards-compatible way.
 *
 * Accepts:
 * - Compendium Skill ID (hex16)
 * - Skill display name ("Use Computer")
 * - Skill system key ("useComputer")
 *
 * Returns:
 * - canonical system key for Actor.system.skills (camelCase)
 * - or canonical display name
 */

const HEX16 = /^[0-9a-f]{16}$/i;

export const SKILL_NAME_TO_KEY = {
  "Acrobatics": "acrobatics",
  "Climb": "climb",
  "Deception": "deception",
  "Endurance": "endurance",
  "Gather Information": "gatherInformation",
  "Initiative": "initiative",
  "Jump": "jump",
  "Knowledge (Bureaucracy)": "knowledgeBureaucracy",
  "Knowledge (Galactic Lore)": "knowledgeGalacticLore",
  "Knowledge (Life Sciences)": "knowledgeLifeSciences",
  "Knowledge (Physical Sciences)": "knowledgePhysicalSciences",
  "Knowledge (Social Sciences)": "knowledgeSocialSciences",
  "Knowledge (Tactics)": "knowledgeTactics",
  "Knowledge (Technology)": "knowledgeTechnology",
  "Mechanics": "mechanics",
  "Perception": "perception",
  "Persuasion": "persuasion",
  "Pilot": "pilot",
  "Ride": "ride",
  "Stealth": "stealth",
  "Survival": "survival",
  "Swim": "swim",
  "Treat Injury": "treatInjury",
  "Use Computer": "useComputer",
  "Use the Force": "useTheForce"
};

const KEY_TO_NAME_FALLBACK = Object.fromEntries(
  Object.entries(SKILL_NAME_TO_KEY).map(([name, key]) => [key, name])
);

let cachePromise = null;

async function loadSkillIdCache() {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    if (!game.ready) {
      await new Promise(resolve => Hooks.once("ready", resolve));
    }

    const idToName = new Map();
    const nameToId = new Map();

    try {
      const pack = game.packs?.get("foundryvtt-swse.skills");
      if (!pack) return { idToName, nameToId };
      const index = await pack.getIndex({ fields: ["name"] });
      for (const entry of index) {
        idToName.set(entry._id, entry.name);
        nameToId.set(String(entry.name).toLowerCase(), entry._id);
      }
    } catch (err) {
      console.warn("SWSE SkillResolver: failed to load skills compendium", err);
    }

    return { idToName, nameToId };
  })();
  return cachePromise;
}

export function isSkillId(ref) {
  return typeof ref === "string" && HEX16.test(ref);
}

export async function resolveSkillName(ref) {
  if (!ref) return null;
  const s = String(ref).trim();
  if (!s) return null;

  if (isSkillId(s)) {
    const { idToName } = await loadSkillIdCache();
    return idToName.get(s) ?? null;
  }

  // If it's already a display name
  if (SKILL_NAME_TO_KEY[s]) return s;

  // If it's a system key
  if (KEY_TO_NAME_FALLBACK[s]) return KEY_TO_NAME_FALLBACK[s];

  // Try case-insensitive name match
  const { nameToId, idToName } = await loadSkillIdCache();
  const id = nameToId.get(s.toLowerCase());
  return id ? idToName.get(id) ?? null : null;
}

export async function resolveSkillKey(ref) {
  if (!ref) return null;
  const s = String(ref).trim();
  if (!s) return null;

  // Direct system key
  if (KEY_TO_NAME_FALLBACK[s]) return s;

  // Compendium ID
  if (isSkillId(s)) {
    const name = await resolveSkillName(s);
    return name ? SKILL_NAME_TO_KEY[name] ?? null : null;
  }

  // Display name (exact)
  if (SKILL_NAME_TO_KEY[s]) return SKILL_NAME_TO_KEY[s];

  // Case-insensitive name match
  const name = await resolveSkillName(s);
  if (name && SKILL_NAME_TO_KEY[name]) return SKILL_NAME_TO_KEY[name];

  return null;
}

export async function resolveSkillId(ref) {
  if (!ref) return null;
  const s = String(ref).trim();
  if (!s) return null;
  if (isSkillId(s)) return s;
  const name = await resolveSkillName(s);
  if (!name) return null;
  const { nameToId } = await loadSkillIdCache();
  return nameToId.get(name.toLowerCase()) ?? null;
}
