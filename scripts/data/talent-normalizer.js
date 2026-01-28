// ============================================
// FILE: scripts/data/talent-normalizer.js
// Talent Data Normalizer (PURE / READ-ONLY)
// ============================================
//
// Contract:
// - NEVER mutate live Foundry Documents
// - NEVER return live Document-owned references (effects, flags, system, etc.)
// - SSOT membership comes ONLY from TalentTreeDB (talentId -> treeId)
//

/**
 * Deep clone helper that avoids returning live document-owned references.
 * Uses structuredClone when available, falls back to foundry.utils.duplicate.
 */
function deepClone(value) {
  if (value == null) return value;
  try {
    // eslint-disable-next-line no-undef
    return structuredClone(value);
  } catch (_err) {
    // Foundry fallback (present in core)
    // eslint-disable-next-line no-undef
    return foundry?.utils?.duplicate ? foundry.utils.duplicate(value) : JSON.parse(JSON.stringify(value));
  }
}

/**
 * Normalize prerequisite data into a consistent array form.
 */
function parsePrerequisites(prereqValue) {
  if (!prereqValue) return [];
  if (Array.isArray(prereqValue)) return deepClone(prereqValue);
  if (typeof prereqValue === "object") return [deepClone(prereqValue)];
  if (typeof prereqValue === "string") return [{ type: "text", value: prereqValue }];
  return [];
}

/**
 * Normalize a raw talent Item document into a plain object snapshot.
 *
 * @param {Item} rawTalent - Live Item document from the talents compendium.
 * @param {object|null} talentTreeDB - TalentTreeDB (SSOT owner) or null.
 * @returns {object} plain talent snapshot
 */
export function normalizeTalent(rawTalent, talentTreeDB = null) {
  const source = rawTalent?.toObject ? rawTalent.toObject() : (rawTalent ?? {});
  const id = rawTalent?.id ?? source?._id ?? source?.id ?? null;

  const name = source?.name ?? rawTalent?.name ?? "Unknown Talent";
  const sys = source?.system ?? {};

  const treeId = talentTreeDB?.getTreeForTalent?.(id) ?? null;
  const treeName = treeId ? (talentTreeDB?.get?.(treeId)?.name ?? null) : null;

  // IMPORTANT: snapshot effects + flags (no live refs)
  const effects = Array.isArray(source?.effects) ? deepClone(source.effects) : [];
  const scope = game?.system?.id;
  const flags = deepClone(source?.flags?.[scope] ?? source?.flags?.swse ?? {});

  return {
    id,
    sourceId: id,
    name,

    treeId,
    treeName,

    prerequisites: parsePrerequisites(sys.prerequisites),
    benefit: sys.benefit ?? "",
    special: sys.special ?? "",

    effects,

    description: sys.description ?? "",
    img: source?.img ?? rawTalent?.img ?? "icons/svg/item-bag.svg",

    flags
  };
}

/**
 * Validate a normalized talent definition.
 * NOTE: Tree membership invariants are enforced in TalentDB.
 */
export function validateTalent(normalizedTalent) {
  const missing = [];
  if (!normalizedTalent?.id) missing.push("id");
  if (!normalizedTalent?.name) missing.push("name");

  if (missing.length) {
    console.error(
      `[TalentNormalizer] Invalid talent definition – missing fields: ${missing.join(", ")}`,
      normalizedTalent
    );
    return false;
  }

  return true;
}

/**
 * Get talents belonging to a specific talent tree.
 */
export function getTalentsByTree(treeId, allTalents) {
  if (!treeId || !Array.isArray(allTalents)) return [];
  return allTalents.filter((t) => t.treeId === treeId);
}

/**
 * Check whether a talent's prerequisites are met.
 * (Stub — full logic belongs to progression engine.)
 */
export function checkTalentPrerequisites(talent, actor) {
  if (!talent?.prerequisites?.length) return true;
  return actor != null;
}

/**
 * Filter talents by role via their talent tree.
 */
export function filterTalentsByRole(talents, role, talentTreeDB) {
  if (!role || !talentTreeDB?.get) return talents;

  return talents.filter((t) => {
    if (!t.treeId) return false;
    const tree = talentTreeDB.get(t.treeId);
    return tree?.role === role;
  });
}
