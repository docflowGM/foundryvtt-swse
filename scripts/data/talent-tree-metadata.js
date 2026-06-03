// ============================================
// FILE: scripts/data/talent-tree-metadata.js
// Canonical Talent Tree Identity Table — Phase 5
// ============================================
//
// Static authority table for known talent trees.
//
// Each entry carries:
//   key      — normalized slug (normalizeTalentTreeId convention: lowercase underscore)
//   name     — canonical display name
//   aliases  — alternative names / "Talent Tree" suffix variants
//   sourceId — Foundry compendium item _id (from talent_trees pack)
//
// sourceIds are sourced from class-prereq-normalizer.js TALENT_TREE_IDS.
// This table is the SSOT for tree identity during normalization.
//
// Usage:
//   import { getTalentTreeMetadata, TALENT_TREE_METADATA } from '.../talent-tree-metadata.js';
//   const meta = getTalentTreeMetadata('awareness');
//   // → { key: 'awareness', name: 'Awareness', sourceId: '1c48d1cd9ab1f5c8', aliases: [...] }
//
// Consumers: prerequisite-normalizer.js, prerequisite-identity-audit.js
// ============================================

/** @type {Record<string, {key: string, name: string, sourceId: string, aliases: string[]}>} */
export const TALENT_TREE_METADATA = {
  awareness: {
    key: 'awareness',
    name: 'Awareness',
    sourceId: '1c48d1cd9ab1f5c8',
    aliases: ['Awareness Talent Tree'],
  },
  armor_specialist: {
    key: 'armor_specialist',
    name: 'Armor Specialist',
    sourceId: '17cec542331cb4e4',
    aliases: ['Armor Specialist Talent Tree'],
  },
  brawler: {
    key: 'brawler',
    name: 'Brawler',
    sourceId: '67fdd8dce9abd6c1',
    aliases: ['Brawler Talent Tree'],
  },
  camouflage: {
    key: 'camouflage',
    name: 'Camouflage',
    sourceId: '3926d582d2077489',
    aliases: ['Camouflage Talent Tree'],
  },
  commando: {
    key: 'commando',
    name: 'Commando',
    sourceId: '798ed0945cbdac1c',
    aliases: ['Commando Talent Tree'],
  },
  dark_side_devotee: {
    key: 'dark_side_devotee',
    name: 'Dark Side Devotee',
    sourceId: '96ef43a3054dcb58',
    aliases: ['Dark Side Devotee Talent Tree'],
  },
  disgrace: {
    key: 'disgrace',
    name: 'Disgrace',
    sourceId: 'e91cc675fbf9ba6e',
    aliases: ['Disgrace Talent Tree'],
  },
  force_adept: {
    key: 'force_adept',
    name: 'Force Adept',
    sourceId: 'e35ee41362604227',
    aliases: ['Force Adept Talent Tree'],
  },
  force_item: {
    key: 'force_item',
    name: 'Force Item',
    sourceId: '01e443d93e47f9c4',
    aliases: ['Force Item Talent Tree'],
  },
  fortune: {
    key: 'fortune',
    name: 'Fortune',
    sourceId: 'cee9b9398682b7d0',
    aliases: ['Fortune Talent Tree'],
  },
  influence: {
    key: 'influence',
    name: 'Influence',
    sourceId: '8375b9b26b679901',
    aliases: ['Influence Talent Tree'],
  },
  leadership: {
    key: 'leadership',
    name: 'Leadership',
    sourceId: '5964237d22681dc0',
    aliases: ['Leadership Talent Tree'],
  },
  lineage: {
    key: 'lineage',
    name: 'Lineage',
    sourceId: 'b5bb4154688c66ab',
    aliases: ['Lineage Talent Tree'],
  },
  mercenary: {
    key: 'mercenary',
    name: 'Mercenary',
    sourceId: '4007fa87192b5884',
    aliases: ['Mercenary Talent Tree'],
  },
  misfortune: {
    key: 'misfortune',
    name: 'Misfortune',
    sourceId: '67b59e020c1660eb',
    aliases: ['Misfortune Talent Tree'],
  },
  smuggling: {
    key: 'smuggling',
    name: 'Smuggling',
    sourceId: '9f7ca12cc084737a',
    aliases: ['Smuggling Talent Tree'],
  },
  spacer: {
    key: 'spacer',
    name: 'Spacer',
    sourceId: '5ea8c79492d40713',
    aliases: ['Spacer Talent Tree'],
  },
  spy: {
    key: 'spy',
    name: 'Spy',
    sourceId: '7c42882a1347ef18',
    aliases: ['Spy Talent Tree'],
  },
  survivor: {
    key: 'survivor',
    name: 'Survivor',
    sourceId: '9b06340233eb3cdd',
    aliases: ['Survivor Talent Tree'],
  },
  veteran: {
    key: 'veteran',
    name: 'Veteran',
    sourceId: '96c390430d7a4975',
    aliases: ['Veteran Talent Tree'],
  },
  weapon_specialist: {
    key: 'weapon_specialist',
    name: 'Weapon Specialist',
    sourceId: '2e9265a596cc43f7',
    aliases: ['Weapon Specialist Talent Tree'],
  },
};

// ── Internal lookup maps ──────────────────────────────────────────

/** Reverse map: name (lowercase) → metadata */
const _byName = new Map();
/** Reverse map: sourceId → metadata */
const _bySourceId = new Map();
/** Reverse map: alias (lowercase) → metadata */
const _byAlias = new Map();

for (const meta of Object.values(TALENT_TREE_METADATA)) {
  _byName.set(meta.name.toLowerCase(), meta);
  if (meta.sourceId) _bySourceId.set(meta.sourceId, meta);
  for (const alias of meta.aliases || []) {
    _byAlias.set(alias.toLowerCase(), meta);
  }
}

/**
 * Look up canonical talent tree metadata by key, name, alias, or sourceId.
 *
 * Resolution order: key → sourceId → name → alias
 *
 * @param {string} value - Key, name, alias, or sourceId
 * @returns {{ key: string, name: string, sourceId: string, aliases: string[] } | null}
 */
export function getTalentTreeMetadata(value) {
  if (!value) return null;
  const raw = String(value).trim();

  // Key lookup (direct)
  if (TALENT_TREE_METADATA[raw]) return TALENT_TREE_METADATA[raw];

  // sourceId lookup
  const bySourceId = _bySourceId.get(raw);
  if (bySourceId) return bySourceId;

  // Name lookup (case-insensitive, strip "Talent Tree" suffix)
  const cleaned = raw.replace(/\s*Talent\s+Tree$/i, '').trim();
  const byName = _byName.get(cleaned.toLowerCase());
  if (byName) return byName;

  // Alias lookup
  const byAlias = _byAlias.get(raw.toLowerCase());
  if (byAlias) return byAlias;

  // Normalized key lookup (underscore form)
  const normalized = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (TALENT_TREE_METADATA[normalized]) return TALENT_TREE_METADATA[normalized];

  return null;
}

/**
 * Get all known talent trees as an array.
 * @returns {Array<{key: string, name: string, sourceId: string, aliases: string[]}>}
 */
export function getAllTalentTreeMetadata() {
  return Object.values(TALENT_TREE_METADATA);
}
