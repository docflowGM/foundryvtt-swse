// ============================================
// FILE: scripts/engine/progression/prerequisites/prerequisite-normalizer.js
// Prerequisite Normalizer — Phase 2
// ============================================
//
// Converts raw prerequisite data (strings, arrays, structured objects,
// prestige-prerequisites entries) into canonical, structured prerequisite
// records with stable keys and explicit identity.
//
// This is the normalization layer ONLY — it does not evaluate prerequisites.
// Evaluation remains in prerequisite-checker.js.
//
// Builds on Phase 1's ActorPrerequisiteSnapshot (actor-state normalization)
// by normalizing the *requirements* side of the equation.
//
// Reuses existing repo helpers:
//   - toStableKey                (deterministic key generation)
//   - TalentTreeDB               (talent tree identity resolution)
//   - normalizeTalentTreeId      (talent tree key normalization)
//   - legacy-prereq-registry     (canonical name resolution, species, droid detection)
//   - FeatChoiceResolver         (choice kind classification)
//   - PRESTIGE_PREREQUISITES     (prestige class data)
//   - CANONICAL_SKILL_DEFS       (skill key validation)
//
// Phase 2 scope: normalize + light integration into prerequisite-checker.
// Does NOT replace the checker's public APIs or legacy parsing entirely.
// ============================================

import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { normalizeTalentTreeId } from "/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js";
import { PRESTIGE_PREREQUISITES } from "/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js";
import { CANONICAL_SKILL_DEFS } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import {
  resolveCanonicalFeatName,
  resolveCanonicalTalentName,
  resolveCanonicalSkillKey,
  resolveCanonicalSpeciesName,
  namesMatchLoosely,
  normalizeLooseLookupKey,
} from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/legacy-prereq-registry.js";
import { isForceSensitivityName } from "/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
// Phase 5: canonical tree metadata for sourceId enrichment
import { getTalentTreeMetadata } from "/systems/foundryvtt-swse/scripts/data/talent-tree-metadata.js";
// Phase 5A: feat prerequisite authority for isScopedChoice / choiceKind metadata
import { FEAT_PREREQUISITE_AUTHORITY } from "/systems/foundryvtt-swse/scripts/data/authority/feat-prerequisite-authority.js";

// ── Key helpers ──────────────────────────────────────────────────

/** Generate a stable key, falling back to loose normalization. */
function stableKey(value) {
  if (!value) return '';
  return toStableKey(value) || normalizeLooseLookupKey(value) || '';
}

// ── Ability map ──────────────────────────────────────────────────

const ABILITY_MAP = {
  str: 'str', strength: 'str',
  dex: 'dex', dexterity: 'dex',
  con: 'con', constitution: 'con',
  int: 'int', intelligence: 'int',
  wis: 'wis', wisdom: 'wis',
  cha: 'cha', charisma: 'cha',
};

// ── Scoped feat families ─────────────────────────────────────────
//
// Phase 5: upgraded from a plain Set to a Map with identity metadata.
// Each entry carries: key (stable), name (canonical), choiceKind.
// The Set alias SCOPED_FEAT_BASES is preserved for any legacy callers.

/**
 * Canonical scoped feat families.
 * Key: normalizeLooseLookupKey(baseName) → { key, name, choiceKind }
 */
const SCOPED_FEAT_FAMILIES = new Map([
  ['skill training',             { key: 'skill-training',             name: 'Skill Training',             choiceKind: 'skill' }],
  ['skill focus',                { key: 'skill-focus',                name: 'Skill Focus',                choiceKind: 'skill' }],
  ['weapon focus',               { key: 'weapon-focus',               name: 'Weapon Focus',               choiceKind: 'weapon-group' }],
  ['greater weapon focus',       { key: 'greater-weapon-focus',       name: 'Greater Weapon Focus',       choiceKind: 'weapon-group' }],
  ['weapon specialization',      { key: 'weapon-specialization',      name: 'Weapon Specialization',      choiceKind: 'weapon-group' }],
  ['greater weapon specialization', { key: 'greater-weapon-specialization', name: 'Greater Weapon Specialization', choiceKind: 'weapon-group' }],
  ['weapon proficiency',         { key: 'weapon-proficiency',         name: 'Weapon Proficiency',         choiceKind: 'weapon-group' }],
  ['double attack',              { key: 'double-attack',              name: 'Double Attack',              choiceKind: 'weapon-group' }],
  ['triple attack',              { key: 'triple-attack',              name: 'Triple Attack',              choiceKind: 'weapon-group' }],
  ['exotic weapon proficiency',  { key: 'exotic-weapon-proficiency',  name: 'Exotic Weapon Proficiency',  choiceKind: 'weapon-group' }],
]);

/** Backward-compat alias: Set of lowercase base names. */
const SCOPED_FEAT_BASES = new Set(SCOPED_FEAT_FAMILIES.keys());

/**
 * Look up scoped feat family metadata by base name.
 * Returns null if not a known scoped family.
 */
function getScopedFeatFamily(baseName) {
  if (!baseName) return null;
  const key = normalizeLooseLookupKey(baseName);
  // Try family map first
  const fromFamily = SCOPED_FEAT_FAMILIES.get(key);
  if (fromFamily) return fromFamily;
  // Fall back to feat authority for isScopedChoice entries
  const authorityKey = key.replace(/\s+/g, '_');
  const authEntry = FEAT_PREREQUISITE_AUTHORITY[authorityKey];
  if (authEntry?.isScopedChoice) {
    return { key: toStableKey(authEntry.name) || key, name: authEntry.name, choiceKind: authEntry.choiceKind || 'unknown' };
  }
  return null;
}

/** Classify the choice kind for a scoped feat base name. */
function classifyChoiceKind(baseName) {
  const family = getScopedFeatFamily(baseName);
  if (family) return family.choiceKind;
  const k = normalizeLooseLookupKey(baseName);
  if (k === 'skill focus') return 'skill';
  if (/weapon\s*(proficiency|focus|specialization)/.test(k)) return 'weapon-group';
  if (/greater\s*weapon/.test(k)) return 'weapon-group';
  return 'unknown';
}

// ── Individual normalizers ───────────────────────────────────────

/**
 * Parse a scoped feat string like "Skill Focus (Stealth)" into
 * base name + choice. Returns null if not scoped.
 */
function parseScopedFeat(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  // Parenthesized form: "Skill Focus (Stealth)"
  const parenOpen = text.indexOf('(');
  const parenClose = text.endsWith(')') ? text.length - 1 : -1;
  if (parenOpen > 0 && parenClose > parenOpen) {
    const baseName = text.slice(0, parenOpen).trim();
    const choice = text.slice(parenOpen + 1, parenClose).trim();
    if (baseName && choice && SCOPED_FEAT_BASES.has(normalizeLooseLookupKey(baseName))) {
      return { baseName, choice };
    }
  }
  // Colon form: "Skill Focus: Stealth"
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0) {
    const baseName = text.slice(0, colonIdx).trim();
    const choice = text.slice(colonIdx + 1).trim();
    if (baseName && choice && SCOPED_FEAT_BASES.has(normalizeLooseLookupKey(baseName))) {
      return { baseName, choice };
    }
  }
  return null;
}

const SCOPED_CHOICE_REQUIREMENT_TYPES = Object.freeze({
  'weapon proficiency': 'weapon_proficiency',
  'exotic weapon proficiency': 'weapon_proficiency',
  'weapon focus': 'weapon_focus',
  'greater weapon focus': 'greater_weapon_focus',
  'weapon specialization': 'weapon_specialization',
  'greater weapon specialization': 'greater_weapon_specialization',
  'skill training': 'skill_training',
  'skill focus': 'skill_focus',
  'double attack': 'double_attack_weapon',
  'triple attack': 'triple_attack_weapon',
});

function isPlaceholderChoice(value) {
  const key = stableKey(value);
  return [
    'chosen-weapon',
    'selected-weapon',
    'selected-weapon-group',
    'chosen-weapon-group',
    'chosen-skill',
    'selected-skill',
    'chosen-option',
    'selected-option',
    'particular-weapon',
    'one-weapon',
    'one-skill',
  ].includes(key);
}

function buildScopedChoiceRequirement(scoped, source) {
  if (!scoped) return null;
  const baseKey = normalizeLooseLookupKey(scoped.baseName);
  const reqType = SCOPED_CHOICE_REQUIREMENT_TYPES[baseKey];
  if (!reqType) return null;
  const family = getScopedFeatFamily(scoped.baseName);
  const canonBase = family?.name || resolveCanonicalFeatName(scoped.baseName) || scoped.baseName;
  const placeholder = isPlaceholderChoice(scoped.choice);
  const choiceKey = placeholder ? null : stableKey(scoped.choice);
  const choiceName = placeholder ? null : scoped.choice;
  return {
    type: reqType,
    key: choiceKey,
    name: choiceName,
    baseName: canonBase,
    baseKey: family?.key || stableKey(canonBase),
    choice: {
      kind: family?.choiceKind || classifyChoiceKind(scoped.baseName),
      key: choiceKey,
      name: choiceName,
    },
    source,
    optional: false,
  };
}

/**
 * Normalize a single feat requirement.
 * @param {string|Object} value - Feat name string or structured prereq
 * @param {string} [source='unknown'] - Where this requirement came from
 * @returns {Object} Normalized feat prerequisite record
 */
export function normalizeFeatRequirement(value, source = 'unknown') {
  if (!value) return null;

  const rawName = typeof value === 'string' ? value : (value?.name || value?.featName || '');
  if (!rawName) return null;

  // Check for Force Sensitive
  if (isForceSensitivityName(rawName)) {
    return { type: 'force_sensitive', required: true, source };
  }

  // Check for scoped feat/choice requirement
  const scoped = parseScopedFeat(rawName);
  if (scoped) {
    const semantic = buildScopedChoiceRequirement(scoped, source);
    if (semantic) return semantic;

    const canonBase = resolveCanonicalFeatName(scoped.baseName) || scoped.baseName;
    // Phase 5: prefer stable key from SCOPED_FEAT_FAMILIES over re-deriving from string
    const family = getScopedFeatFamily(scoped.baseName);
    return {
      type: 'feat',
      key: family?.key || stableKey(canonBase),
      name: canonBase,
      choice: {
        kind: family?.choiceKind || classifyChoiceKind(scoped.baseName),
        key: stableKey(scoped.choice),
        name: scoped.choice,
      },
      source,
      optional: false,
    };
  }

  // Plain feat
  const canonName = resolveCanonicalFeatName(rawName) || rawName;
  return {
    type: 'feat',
    key: stableKey(canonName),
    name: canonName,
    source,
    optional: false,
  };
}

/**
 * Normalize a talent requirement.
 */
export function normalizeTalentRequirement(value, source = 'unknown') {
  if (!value) return null;
  const rawName = typeof value === 'string' ? value : (value?.name || value?.talentName || '');
  if (!rawName) return null;
  const canonName = resolveCanonicalTalentName(rawName) || rawName;
  return {
    type: 'talent',
    key: stableKey(canonName),
    name: canonName,
    source,
    optional: false,
  };
}

/**
 * Resolve a talent tree name/id/sourceId to a canonical { key, name, sourceId? }.
 * Phase 5: enriched with sourceId from TALENT_TREE_METADATA when available.
 * Priority: TalentTreeDB (runtime, SSOT) → TALENT_TREE_METADATA (static, with sourceId) → normalizeTalentTreeId (fallback)
 */
function resolveTreeIdentity(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Try TalentTreeDB first (runtime SSOT — most accurate when DB is built)
  const tree = TalentTreeDB.get?.(raw)
    || TalentTreeDB.bySourceId?.(raw)
    || TalentTreeDB.byName?.(raw);
  if (tree) {
    const meta = getTalentTreeMetadata(tree.id || tree.name || raw);
    return {
      key: tree.id || normalizeTalentTreeId(tree.name || raw),
      name: tree.name || raw,
      ...(meta?.sourceId ? { sourceId: meta.sourceId } : {}),
    };
  }

  // Phase 5: Try static metadata table (works at parse time before DB is built)
  const meta = getTalentTreeMetadata(raw);
  if (meta) {
    return {
      key: meta.key,
      name: meta.name,
      sourceId: meta.sourceId,
    };
  }

  // Fallback: normalize directly (no sourceId available)
  const cleaned = raw.replace(/\s*Talent\s+Tree$/i, '');
  return {
    key: normalizeTalentTreeId(cleaned),
    name: cleaned,
  };
}

/**
 * Normalize a talent-tree count requirement.
 * @param {Object} talentReq - { count, trees, specific, forceTalentsOnly }
 * @param {string} [source='unknown']
 * @returns {Object[]} Array of normalized prerequisite records
 */
export function normalizeTalentTreeRequirement(talentReq, source = 'unknown') {
  if (!talentReq) return [];
  const results = [];

  // Specific named talents
  if (talentReq.specific && Array.isArray(talentReq.specific)) {
    for (const name of talentReq.specific) {
      const rec = normalizeTalentRequirement(name, source);
      if (rec) results.push(rec);
    }
  }

  // Tree-count requirement
  if (talentReq.trees && Array.isArray(talentReq.trees)) {
    const trees = talentReq.trees.map(resolveTreeIdentity).filter(Boolean);
    results.push({
      type: 'talent_count',
      count: talentReq.count || 1,
      trees,
      source,
    });
  } else if (talentReq.forceTalentsOnly) {
    results.push({
      type: 'force_talent_count',
      count: talentReq.count || 1,
      source,
    });
  } else if (talentReq.count && !talentReq.trees && !talentReq.specific) {
    // Generic talent count (no specific trees)
    results.push({
      type: 'talent_count',
      count: talentReq.count,
      trees: [],
      source,
    });
  }

  return results;
}

/**
 * Normalize a skill requirement.
 */
export function normalizeSkillRequirement(value, source = 'unknown') {
  if (!value) return null;
  const rawName = typeof value === 'string' ? value : (value?.skill || value?.skillName || value?.name || '');
  if (!rawName) return null;
  const canonKey = resolveCanonicalSkillKey(rawName);
  // Validate against known skills
  const name = (canonKey && CANONICAL_SKILL_DEFS[canonKey])
    ? CANONICAL_SKILL_DEFS[canonKey].label || rawName
    : rawName;
  return {
    type: 'skill',
    key: canonKey || stableKey(rawName),
    name,
    trained: true,
    source,
  };
}

/**
 * Normalize a BAB requirement from various string forms.
 */
export function normalizeBabRequirement(value, source = 'unknown') {
  if (value == null) return null;
  if (typeof value === 'number') {
    return { type: 'bab', min: value, source };
  }
  const text = String(value).trim();
  const match = text.match(/(?:bab|base\s*attack\s*bonus)\s*\+?\s*(\d+)|(\d+)\s*(?:bab|base\s*attack\s*bonus)/i);
  if (match) {
    return { type: 'bab', min: parseInt(match[1] || match[2], 10), source };
  }
  const numOnly = parseInt(text, 10);
  if (Number.isFinite(numOnly) && numOnly > 0) {
    return { type: 'bab', min: numOnly, source };
  }
  return null;
}

/**
 * Normalize a Dark Side Score / DSP requirement.
 */
export function normalizeDarkSideRequirement(value, source = 'unknown') {
  if (value == null) return null;

  // String "wisdom" means DSP must equal Wisdom score
  if (typeof value === 'string' && /wisdom/i.test(value)) {
    return { type: 'dark_side', min: 'wisdom', source };
  }

  if (typeof value === 'number') {
    return { type: 'dark_side', min: value, source };
  }

  const text = String(value).trim();
  const match = text.match(/(?:dark\s*side\s*(?:score|points?)?|dsp)\s*(\d+)\+?/i);
  if (match) {
    return { type: 'dark_side', min: parseInt(match[1], 10), source };
  }

  const numOnly = parseInt(text, 10);
  if (Number.isFinite(numOnly) && numOnly >= 0) {
    return { type: 'dark_side', min: numOnly, source };
  }

  return null;
}

/**
 * Normalize a species requirement.
 */
export function normalizeSpeciesRequirement(value, source = 'unknown') {
  if (!value) return null;
  const rawName = typeof value === 'string' ? value : (value?.name || value?.species || '');
  if (!rawName) return null;
  const canonName = resolveCanonicalSpeciesName(rawName) || rawName;
  return {
    type: 'species',
    key: stableKey(canonName),
    name: canonName,
    source,
  };
}

/**
 * Normalize a droid requirement.
 */
export function normalizeDroidRequirement(prereq, source = 'unknown') {
  const rec = { type: 'droid', required: true, source };
  if (prereq?.degree) rec.degree = prereq.degree;
  if (prereq?.chassis) rec.chassis = prereq.chassis;
  return rec;
}

/**
 * Normalize a Force Sensitive requirement.
 */
export function normalizeForceSensitiveRequirement(value, source = 'unknown') {
  return { type: 'force_sensitive', required: true, source };
}

/**
 * Normalize an ability score requirement.
 */
export function normalizeAbilityRequirement(value, source = 'unknown') {
  if (!value) return null;
  let abilityKey, minimum;

  if (typeof value === 'object') {
    const raw = String(value.ability || value.attribute || '').toLowerCase();
    abilityKey = ABILITY_MAP[raw] || raw;
    minimum = Number(value.minimum ?? value.min ?? value.value ?? 10);
  } else {
    const text = String(value).trim();
    const match = text.match(/(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)/i);
    if (!match) return null;
    abilityKey = ABILITY_MAP[match[1].toLowerCase()] || match[1].toLowerCase();
    minimum = parseInt(match[2], 10);
  }

  if (!abilityKey) return null;
  return { type: 'ability', ability: abilityKey, min: minimum, source };
}

/**
 * Normalize an unknown/table-state/advisory requirement.
 */
export function normalizeUnknownRequirement(rawText, source = 'unknown') {
  const text = String(rawText ?? '').trim();
  if (!text) return null;

  // Detect table-state patterns
  const isTableState = /^(?:gamemaster|game\s*master|gm)'?s?\s+approval$/i.test(text)
    || /^must\s+(?:be\s+a\s+member|belong)/i.test(text)
    || /^have\s+a\s+destiny$/i.test(text)
    || /^must\s+construct/i.test(text)
    || /^you\s+must/i.test(text)
    || /organization/i.test(text);

  // Detect droid equipment/accessory advisories
  const isDroidEquipment = /^(?:basic processor|shield generator|droid with|locomotion|appendages)/i.test(text)
    || /locomotion/i.test(text);

  const severity = (isTableState || isDroidEquipment) ? 'advisory' : 'unknown';

  return {
    type: isTableState ? 'table_state' : 'unknown',
    key: stableKey(text) || 'unresolved',
    raw: text,
    source,
    severity,
  };
}

// ── High-level normalizers ───────────────────────────────────────

/**
 * Normalize prerequisites from a feat document.
 *
 * @param {Object} feat - Feat item document or { name, system }
 * @param {Object} [options={}]
 * @returns {Object} { raw, normalized: Object[] }
 */
export function normalizeFeatPrerequisites(feat, options = {}) {
  if (!feat) return { raw: '', normalized: [] };
  const raw = feat.system?.prerequisite || feat.system?.prerequisites || '';
  const structured = feat.system?.prerequisitesStructured;

  if (structured) {
    return {
      raw: typeof raw === 'string' ? raw : '',
      normalized: normalizeStructuredArray(structured, 'structured'),
    };
  }

  if (typeof raw === 'string' && raw.trim() && raw.trim().toLowerCase() !== 'none') {
    return {
      raw,
      normalized: normalizePrerequisiteString(raw, 'legacy-string'),
    };
  }

  if (raw?.parsed) {
    return {
      raw: raw.raw || '',
      normalized: normalizeStructuredArray(raw.parsed, 'item-normalizer'),
    };
  }

  return { raw: '', normalized: [] };
}

/**
 * Normalize prerequisites from a talent document.
 */
export function normalizeTalentPrerequisites(talent, options = {}) {
  if (!talent) return { raw: '', normalized: [] };
  const raw = talent.system?.prerequisites || talent.system?.prerequisite || '';
  const structured = talent.system?.prerequisitesStructured;

  if (structured) {
    return {
      raw: typeof raw === 'string' ? raw : '',
      normalized: normalizeStructuredArray(structured, 'structured'),
    };
  }

  if (typeof raw === 'string' && raw.trim() && raw.trim().toLowerCase() !== 'none') {
    return {
      raw,
      normalized: normalizePrerequisiteString(raw, 'legacy-string'),
    };
  }

  if (raw?.parsed) {
    return {
      raw: raw.raw || '',
      normalized: normalizeStructuredArray(raw.parsed, 'item-normalizer'),
    };
  }

  return { raw: '', normalized: [] };
}

/**
 * Normalize prerequisites from a prestige class entry.
 *
 * @param {string|Object} classNameOrEntry - Prestige class name or PRESTIGE_PREREQUISITES entry
 * @param {Object} [options={}]
 * @returns {Object} { className, normalized: Object[] }
 */
export function normalizePrestigePrerequisites(classNameOrEntry, options = {}) {
  let className, prereqs;

  if (typeof classNameOrEntry === 'string') {
    className = classNameOrEntry;
    prereqs = PRESTIGE_PREREQUISITES[classNameOrEntry];
  } else if (classNameOrEntry && typeof classNameOrEntry === 'object') {
    className = classNameOrEntry.name || '';
    prereqs = PRESTIGE_PREREQUISITES[className] || classNameOrEntry;
  }

  if (!prereqs) return { className: className || '', normalized: [] };

  const source = 'prestige-prerequisites';
  const normalized = [];

  // Level
  if (prereqs.minLevel) {
    normalized.push({ type: 'level', min: prereqs.minLevel, source });
  }

  // BAB
  if (prereqs.minBAB) {
    normalized.push({ type: 'bab', min: prereqs.minBAB, source });
  }

  // isDroid
  if (prereqs.isDroid === true) {
    normalized.push(normalizeDroidRequirement({}, source));
  }

  // Skills
  if (prereqs.skills) {
    for (const skill of prereqs.skills) {
      const rec = normalizeSkillRequirement(skill, source);
      if (rec) normalized.push(rec);
    }
  }

  // Feats (all required)
  if (prereqs.feats) {
    for (const feat of prereqs.feats) {
      const rec = normalizeFeatRequirement(feat, source);
      if (rec) normalized.push(rec);
    }
  }

  // Feats (any one of)
  if (prereqs.featsAny) {
    const options = prereqs.featsAny.map((f) => normalizeFeatRequirement(f, source)).filter(Boolean);
    if (options.length) {
      normalized.push({
        type: 'or',
        conditions: options,
        source,
      });
    }
  }

  // Talents
  if (prereqs.talents) {
    const talentRecs = normalizeTalentTreeRequirement(prereqs.talents, source);
    normalized.push(...talentRecs);
  }

  // Force Powers
  if (prereqs.forcePowers) {
    for (const power of prereqs.forcePowers) {
      normalized.push({
        type: 'force_power',
        key: stableKey(power),
        name: power,
        source,
      });
    }
  }

  // Force Techniques
  if (prereqs.forceTechniques) {
    normalized.push({
      type: 'force_technique_count',
      count: prereqs.forceTechniques.count || 1,
      source,
    });
  }

  // Dark Side Score
  if (prereqs.darkSideScore) {
    const rec = normalizeDarkSideRequirement(prereqs.darkSideScore, source);
    if (rec) normalized.push(rec);
  }

  // Species
  if (prereqs.species) {
    for (const sp of prereqs.species) {
      const rec = normalizeSpeciesRequirement(sp, source);
      if (rec) normalized.push(rec);
    }
  }

  // Droid Systems
  if (prereqs.droidSystems) {
    normalized.push({
      type: 'droid_systems',
      systems: prereqs.droidSystems,
      source,
    });
  }

  // Special / table-state
  if (prereqs.special) {
    normalized.push(normalizeUnknownRequirement(prereqs.special, source));
  }

  return { className: className || '', normalized: normalized.filter(Boolean) };
}

/**
 * Normalize prerequisites from a class document (delegates to prestige if applicable).
 */
export function normalizeClassPrerequisites(classEntry, options = {}) {
  if (!classEntry) return { className: '', normalized: [] };
  const name = classEntry.name || '';
  if (PRESTIGE_PREREQUISITES[name]) {
    return normalizePrestigePrerequisites(name, options);
  }
  // Base classes typically have no prerequisites
  const raw = classEntry.system?.prerequisites || '';
  if (typeof raw === 'string' && raw.trim()) {
    return {
      className: name,
      normalized: normalizePrerequisiteString(raw, 'class-prerequisites'),
    };
  }
  return { className: name, normalized: [] };
}

// ── String parser ────────────────────────────────────────────────

/**
 * Parse a raw prerequisite string into normalized records.
 * Handles comma/semicolon/AND separation and OR groups.
 *
 * @param {string} raw - Raw prerequisite string
 * @param {string} [source='legacy-string']
 * @returns {Object[]} Array of normalized prerequisite records
 */
export function normalizePrerequisiteString(raw, source = 'legacy-string') {
  if (!raw || typeof raw !== 'string') return [];

  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.toLowerCase() === 'none') return [];

  // Tree-count talent requirements: "Any 2 Talents from the Awareness or Camouflage Talent Trees"
  const treeCountMatch = cleaned.match(
    /^Any\s+(?:(\d+|one|two|three)\s+)?Talents?\s+from\s+(?:the\s+)?(.+?)\s+Talent\s+Trees?(?:\s*$|[,;])/i
  );
  if (treeCountMatch) {
    const countWord = String(treeCountMatch[1] || '1').toLowerCase();
    const countMap = { one: 1, two: 2, three: 3 };
    const count = Number(countWord) || countMap[countWord] || 1;
    const treeText = treeCountMatch[2].replace(/\s+or\s+/gi, ',').replace(/\s+and\s+/gi, ',');
    const trees = treeText.split(',').map((t) => t.trim()).filter(Boolean).map(resolveTreeIdentity).filter(Boolean);
    return [{ type: 'talent_count', count, trees, source }];
  }

  // OR groups
  const hasOr = /\s+or\s+/i.test(cleaned);
  if (hasOr) {
    const orGroups = cleaned.split(/\s+or\s+/i).map((s) => s.trim()).filter(Boolean);
    const parsedGroups = orGroups.map((group) => {
      const parts = group.split(/[,;]|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
      return parts.map((p) => normalizeSinglePart(p, source)).filter(Boolean);
    });
    return [{ type: 'or', groups: parsedGroups, source }];
  }

  // AND parts (comma/semicolon/and separated)
  const parts = cleaned.split(/[,;]|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => normalizeSinglePart(p, source)).filter(Boolean);
}

/**
 * Normalize a single prerequisite part string.
 * This is the core single-requirement parser.
 */
function normalizeSinglePart(part, source) {
  if (!part) return null;
  part = part.trim();
  const lower = part.toLowerCase();

  // Force Sensitive / Force Sensitivity
  // NOTE: "Force Training" is a distinct FEAT — do NOT match it here.
  if (/force\s+sensiti/i.test(part)) {
    return { type: 'force_sensitive', required: true, source };
  }

  // Force Training is a FEAT — must not be confused with Force Sensitive.
  // Explicit check before the generic feat registry path ensures clean identity.
  if (/^force\s+training$/i.test(part)) {
    return normalizeFeatRequirement('Force Training', source);
  }

  // Force power count: "3 Force powers", "at least 2 Force powers", "knows a Force power"
  const forcePowerCountMatch = part.match(
    /^(?:knows?\s+)?(?:at\s+least\s+)?(\d+|one|two|three|a)\s+(?:or\s+more\s+)?force\s+powers?$/i
  );
  if (forcePowerCountMatch) {
    const word = forcePowerCountMatch[1].toLowerCase();
    const wordMap = { one: 1, two: 2, three: 3, a: 1 };
    const min = Number(word) || wordMap[word] || 1;
    return { type: 'force_power_count', min, source };
  }

  // Force technique count from raw string: "1 Force technique", "a Force technique"
  const forceTechCountMatch = part.match(
    /^(?:knows?\s+)?(?:at\s+least\s+)?(\d+|one|a)\s+(?:or\s+more\s+)?force\s+techniques?$/i
  );
  if (forceTechCountMatch) {
    const word = forceTechCountMatch[1].toLowerCase();
    const min = word === 'a' ? 1 : (Number(word) || { one: 1 }[word] || 1);
    return { type: 'force_technique_count', count: min, source };
  }

  // Force secret count from raw string
  const forceSecretCountMatch = part.match(
    /^(?:knows?\s+)?(?:at\s+least\s+)?(\d+|one|a)\s+(?:or\s+more\s+)?force\s+secrets?$/i
  );
  if (forceSecretCountMatch) {
    const word = forceSecretCountMatch[1].toLowerCase();
    const min = word === 'a' ? 1 : (Number(word) || { one: 1 }[word] || 1);
    return { type: 'force_secret_count', count: min, source };
  }

  // Force tradition / organizational membership: "Must be a member of The Jedi"
  const forceTraditionMatch = part.match(
    /^(?:must\s+be\s+(?:a\s+)?member\s+of\s+(?:the\s+)?|member\s+of\s+(?:the\s+)?)(.+)$/i
  );
  if (forceTraditionMatch) {
    const tradName = forceTraditionMatch[1].trim();
    return { type: 'force_tradition', key: stableKey(tradName), name: tradName, source };
  }

  // Armor Proficiency
  const armorProfMatch = part.match(/^(?:armor\s+proficiency|proficiency\s+with)\s*(?:\(\s*(light|medium|heavy)\s*\)|[-: ]\s*(light|medium|heavy)|\s+(light|medium|heavy)\s+armor)$/i);
  if (armorProfMatch) {
    const tier = (armorProfMatch[1] || armorProfMatch[2] || armorProfMatch[3]).toLowerCase();
    return { type: 'armor_proficiency', tier, source };
  }

  // Weapon Proficiency with placeholder
  if (/^(?:proficient|proficiency)\s+with\s+(?:the\s+)?(?:selected|chosen)\s+weapon/i.test(part)) {
    return { type: 'weapon_proficiency', key: null, name: null, source };
  }

  // Explicit Weapon Proficiency
  const wpMatch = part.match(/^(?:weapon\s+proficiency|proficient\s+with)\s*(?:\(([^)]+)\)|[-: ]\s*(.+))$/i);
  if (wpMatch) {
    const group = (wpMatch[1] || wpMatch[2] || '').trim();
    return normalizeFeatRequirement(`Weapon Proficiency (${group})`, source);
  }

  // Scoped choice feats: Skill Focus (X), Weapon Focus (X), etc.
  const scoped = parseScopedFeat(part);
  if (scoped && SCOPED_FEAT_BASES.has(normalizeLooseLookupKey(scoped.baseName))) {
    return normalizeFeatRequirement(part, source);
  }

  // Ability score: "Dex 13", "Strength 15"
  const abilityMatch = part.match(/^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)/i);
  if (abilityMatch) {
    return normalizeAbilityRequirement(part, source);
  }

  // BAB
  const babMatch = part.match(/(?:bab|base\s*attack\s*bonus)\s*\+?\s*(\d+)|(\d+)\s*(?:bab|base\s*attack\s*bonus)/i);
  if (babMatch) {
    return { type: 'bab', min: parseInt(babMatch[1] || babMatch[2], 10), source };
  }

  // Character level
  const levelMatch = part.match(/(?:character\s+)?level\s+(\d+)|(\d+)(?:st|nd|rd|th)?\s+level/i);
  if (levelMatch) {
    return { type: 'level', min: parseInt(levelMatch[1] || levelMatch[2], 10), source };
  }

  // Dark Side Score
  const dspMatch = part.match(/^dark\s*side\s*(?:score|points?)?\s*(\d+)\+?$/i)
    || part.match(/^dsp\s*(\d+)\+?$/i);
  if (dspMatch) {
    return { type: 'dark_side', min: parseInt(dspMatch[1], 10), source };
  }

  // Droid / Non-Droid
  if (/^droid$/i.test(part)) return normalizeDroidRequirement({}, source);
  if (/^non[-\s]?droid$/i.test(part)) return { type: 'non_droid', source };

  // Species trait: "Rage Species Trait"
  const speciesTraitMatch = part.match(/^(.+?)\s+species\s+trait$/i);
  if (speciesTraitMatch) {
    return { type: 'species_trait', trait: speciesTraitMatch[1].trim(), source };
  }

  // Trained in skill
  const trainedMatch = part.match(/^trained\s+in\s+(.+)$/i);
  if (trainedMatch) {
    return normalizeSkillRequirement(trainedMatch[1].trim(), source);
  }

  // Bare canonical skill name (e.g. "Jump", "Ride")
  const bareSkillKey = resolveCanonicalSkillKey(part);
  if (bareSkillKey && CANONICAL_SKILL_DEFS[bareSkillKey]) {
    return normalizeSkillRequirement(part, source);
  }

  // Skill ranks: "Knowledge (Tactics) 5 ranks"
  const rankMatch = part.match(/^(.+?)\s+(\d+)\s+ranks?$/i);
  if (rankMatch) {
    const rec = normalizeSkillRequirement(rankMatch[1].trim(), source);
    if (rec) {
      rec.trained = false;
      rec.ranks = parseInt(rankMatch[2], 10);
    }
    return rec;
  }

  // Class level: "Jedi level 7", "Scout 3"
  const classLevelMatch = part.match(/^([A-Za-z\s]+?)\s+(?:level\s+)?(\d+)$/i);
  if (classLevelMatch) {
    const className = classLevelMatch[1].trim();
    // Only treat as class if it looks like one (exists in PRESTIGE_PREREQUISITES or is a known base class)
    const baseClasses = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier', 'Beast', 'Officer'];
    if (className in PRESTIGE_PREREQUISITES || baseClasses.some((c) => namesMatchLoosely(c, className))) {
      return {
        type: 'class',
        key: stableKey(className),
        name: className,
        minLevel: parseInt(classLevelMatch[2], 10),
        source,
      };
    }
  }

  // Scoped choice placeholders
  if (/^weapon\s+focus\s+(?:with\s+)?(?:selected|chosen)\s+weapon/i.test(part)) {
    return { type: 'weapon_focus', key: null, name: null, source };
  }
  if (/^greater\s+weapon\s+focus\s+(?:with\s+)?(?:selected|chosen)\s+weapon/i.test(part)) {
    return { type: 'greater_weapon_focus', key: null, name: null, source };
  }
  if (/^weapon\s+specialization\s+(?:with\s+)?(?:selected|chosen)\s+weapon/i.test(part)) {
    return { type: 'weapon_specialization', key: null, name: null, source };
  }
  if (/^greater\s+weapon\s+specialization\s+(?:with\s+)?(?:selected|chosen)\s+weapon/i.test(part)) {
    return { type: 'greater_weapon_specialization', key: null, name: null, source };
  }
  if (/^skill\s+training\s+(?:with\s+)?(?:selected|chosen)\s+skill/i.test(part)) {
    return { type: 'skill_training', key: null, name: null, source };
  }
  if (/^skill\s+focus\s+(?:with\s+)?(?:selected|chosen)\s+skill/i.test(part)) {
    return { type: 'skill_focus', key: null, name: null, source };
  }

  // Lightsaber construction — explicit table_state with canonical key
  if (/(?:construct|build|craft|made?)\s+(?:own|their|a)\s+lightsaber/i.test(part)
      || /lightsaber\s+(?:construct|creat|craft|build)/i.test(part)) {
    return {
      type: 'table_state',
      key: 'constructed-own-lightsaber',
      raw: part,
      source,
      severity: 'advisory',
    };
  }

  // GM approval / table-state
  if (/^(?:gamemaster|game\s*master|gm)'?s?\s+approval$/i.test(part)
    || /^have\s+a\s+destiny$/i.test(part)) {
    return normalizeUnknownRequirement(part, source);
  }

  // Droid equipment advisories
  if (/^(?:basic processor|shield generator|droid with|locomotion|appendages)/i.test(part)
    || /locomotion/i.test(part)) {
    return normalizeUnknownRequirement(part, source);
  }

  // Try as canonical feat name via registry
  const canonFeat = resolveCanonicalFeatName(part);
  if (canonFeat && normalizeLooseLookupKey(canonFeat) !== normalizeLooseLookupKey(part) && canonFeat !== part) {
    return normalizeFeatRequirement(canonFeat, source);
  }

  // Try as canonical talent name via registry
  const canonTalent = resolveCanonicalTalentName(part);
  if (canonTalent && normalizeLooseLookupKey(canonTalent) !== normalizeLooseLookupKey(part) && canonTalent !== part) {
    return normalizeTalentRequirement(canonTalent, source);
  }

  // If registry found a match (same normalized key but confirms existence), use it
  if (canonFeat && canonFeat === part) {
    // Registry confirmed this is a feat
    return normalizeFeatRequirement(canonFeat, source);
  }
  if (canonTalent && canonTalent === part) {
    // Registry confirmed this is a talent
    return normalizeTalentRequirement(canonTalent, source);
  }

  // Unknown — do NOT silently convert to a satisfied requirement
  SWSELogger.debug(`[PrereqNormalizer] Unrecognized prerequisite: "${part}" — marking as unknown`);
  return normalizeUnknownRequirement(part, source);
}

// ── Structured array normalizer ──────────────────────────────────

/**
 * Normalize an array of already-structured prerequisite objects.
 * These come from feat.system.prerequisitesStructured or item-normalizer output.
 */
function normalizeStructuredArray(arr, source) {
  if (!arr) return [];
  const items = Array.isArray(arr) ? arr : (arr.conditions || []);
  return items.map((item) => normalizeStructuredItem(item, source)).filter(Boolean);
}

function normalizeStructuredItem(item, source) {
  if (!item || !item.type) return null;

  switch (item.type) {
    case 'feat':
      return normalizeFeatRequirement(item, source);
    case 'talent':
      return normalizeTalentRequirement(item, source);
    case 'talentFromTree':
      return {
        type: 'talent_count',
        count: item.count || 1,
        trees: [resolveTreeIdentity(item.tree)].filter(Boolean),
        source,
      };
    case 'attribute':
      return normalizeAbilityRequirement(item, source);
    case 'skillTrained':
    case 'skill_trained':
      return normalizeSkillRequirement(item, source);
    case 'bab':
      return { type: 'bab', min: item.minimum ?? item.min ?? 0, source };
    case 'level':
      return { type: 'level', min: item.minimum ?? item.min ?? 1, source };
    case 'darkSideScore':
    case 'dark_side_score':
      return normalizeDarkSideRequirement(item.minimum ?? item.min ?? 0, source);
    case 'species':
      return normalizeSpeciesRequirement(item.name || item.species, source);
    case 'droidDegree':
      return normalizeDroidRequirement({ degree: item.minimum ?? item.min }, source);
    case 'isDroid':
      return normalizeDroidRequirement({}, source);
    case 'non_droid':
      return { type: 'non_droid', source };
    case 'forcePower':
    case 'force_power':
      return { type: 'force_power', key: stableKey(item.name), name: item.name, source };
    case 'force_power_count':
      return { type: 'force_power_count', min: item.min ?? item.minimum ?? item.count ?? 1, source };
    case 'forceTechnique':
    case 'force_technique':
      return { type: 'force_technique', key: stableKey(item.name), name: item.name, source };
    case 'forceTechniqueCount':
    case 'force_technique_count':
      return { type: 'force_technique_count', count: item.count ?? item.min ?? 1, source };
    case 'forceSecret':
    case 'force_secret':
      return { type: 'force_secret', key: stableKey(item.name), name: item.name, source };
    case 'force_secret_count':
      return { type: 'force_secret_count', count: item.count ?? item.min ?? 1, source };
    case 'force_sensitive':
      return { type: 'force_sensitive', required: true, source };
    case 'force_tradition':
      return { type: 'force_tradition', key: stableKey(item.name || item.tradition || ''), name: item.name || item.tradition || '', source };
    case 'force_discipline':
      return { type: 'force_discipline', key: stableKey(item.name || item.discipline || ''), name: item.name || item.discipline || '', source };
    case 'constructed_item':
      return { type: 'constructed_item', key: stableKey(item.item || item.name || ''), name: item.name || item.item || '', ownConstructionRequired: item.ownConstructionRequired ?? false, source };
    case 'weaponProficiency':
    case 'weapon_proficiency':
      return normalizeFeatRequirement(`Weapon Proficiency (${item.weaponGroup || item.group || ''})`, source);
    case 'weapon_focus':
      return normalizeFeatRequirement(`Weapon Focus (${item.weaponGroup || item.group || item.weapon || item.name || ''})`, source);
    case 'greater_weapon_focus':
      return normalizeFeatRequirement(`Greater Weapon Focus (${item.weaponGroup || item.group || item.weapon || item.name || ''})`, source);
    case 'weapon_specialization':
      return normalizeFeatRequirement(`Weapon Specialization (${item.weaponGroup || item.group || item.weapon || item.name || ''})`, source);
    case 'greater_weapon_specialization':
      return normalizeFeatRequirement(`Greater Weapon Specialization (${item.weaponGroup || item.group || item.weapon || item.name || ''})`, source);
    case 'skill_training':
    case 'trained_skill':
      return normalizeFeatRequirement(`Skill Training (${item.skill || item.skillKey || item.skillName || item.name || ''})`, source);
    case 'skill_focus':
      return normalizeFeatRequirement(`Skill Focus (${item.skill || item.skillKey || item.skillName || item.name || ''})`, source);
    case 'armor_proficiency':
      return { type: 'armor_proficiency', tier: item.armor || item.armorType || '', source };
    case 'class_level':
      return {
        type: 'class',
        key: stableKey(item.className),
        name: item.className,
        minLevel: item.minimum ?? item.min ?? 1,
        source,
      };
    case 'species_trait':
      return { type: 'species_trait', trait: item.trait, source };
    case 'featPattern':
      return { type: 'feat_pattern', pattern: item.pattern, count: item.count ?? 1, source };
    case 'or':
      return {
        type: 'or',
        conditions: (item.conditions || []).map((c) => normalizeStructuredItem(c, source)).filter(Boolean),
        source,
      };
    default:
      return normalizeUnknownRequirement(item.name || item.label || item.type, source);
  }
}

// ── Unified entry point ──────────────────────────────────────────

/**
 * Normalize any prerequisite input into canonical records.
 *
 * Accepts: raw strings, arrays, feat/talent docs, prestige class names,
 * structured prereq objects, or PRESTIGE_PREREQUISITES entries.
 *
 * @param {*} input - Any known prerequisite input shape
 * @param {Object} [options={}]
 * @param {string} [options.source] - Where the data came from
 * @param {string} [options.type] - 'feat', 'talent', 'class', 'prestige'
 * @returns {Object[]} Array of normalized prerequisite records
 */
export function normalizePrerequisites(input, options = {}) {
  if (!input) return [];
  const source = options.source || 'unknown';

  // String input
  if (typeof input === 'string') {
    // Could be a prestige class name
    if (PRESTIGE_PREREQUISITES[input]) {
      return normalizePrestigePrerequisites(input, options).normalized;
    }
    return normalizePrerequisiteString(input, source);
  }

  // Array of strings or structured objects
  if (Array.isArray(input)) {
    return input.flatMap((item) => {
      if (typeof item === 'string') return normalizePrerequisiteString(item, source);
      return [normalizeStructuredItem(item, source)].filter(Boolean);
    });
  }

  // Object with type field (structured prereq)
  if (input.type) {
    return [normalizeStructuredItem(input, source)].filter(Boolean);
  }

  // Object with parsed field (from existing prerequisite-normalizer)
  if (input.parsed) {
    return normalizeStructuredArray(input.parsed, source);
  }

  // Feat or talent document
  if (options.type === 'feat' || input.system?.prerequisite || input.system?.prerequisites) {
    if (options.type === 'talent') {
      return normalizeTalentPrerequisites(input, options).normalized;
    }
    return normalizeFeatPrerequisites(input, options).normalized;
  }

  return [];
}

/**
 * Class wrapper for callers that prefer PrerequisiteNormalizer.normalize().
 */
export class PrerequisiteNormalizer {
  static normalize(input, options = {}) {
    return normalizePrerequisites(input, options);
  }
  static normalizeFeatPrerequisites(feat, options = {}) {
    return normalizeFeatPrerequisites(feat, options);
  }
  static normalizeTalentPrerequisites(talent, options = {}) {
    return normalizeTalentPrerequisites(talent, options);
  }
  static normalizeClassPrerequisites(classEntry, options = {}) {
    return normalizeClassPrerequisites(classEntry, options);
  }
  static normalizePrestigePrerequisites(classNameOrEntry, options = {}) {
    return normalizePrestigePrerequisites(classNameOrEntry, options);
  }
}
