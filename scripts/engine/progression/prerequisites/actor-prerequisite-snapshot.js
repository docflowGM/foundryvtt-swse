// ============================================
// FILE: scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js
// Actor Prerequisite Snapshot — Phase 1
// ============================================
//
// Normalized actor-state layer for prerequisite checks.
//
// Instead of every prerequisite path independently scanning raw
// actor.items, flags, and pending data, callers build ONE snapshot
// and query it through stable, tolerant APIs.
//
// The snapshot is read-only, pure, and safe to build from incomplete
// or stale actor data (missing items/flags produce empty defaults).
//
// Reuses existing repo helpers wherever possible:
//   - TalentTreeDB / normalizeTalentTreeId  (talent tree identity)
//   - DSPEngine                              (dark side score)
//   - FeatChoiceResolver                     (scoped feat choices)
//   - legacy-prereq-registry helpers         (name normalization, droid detection)
//   - ActorAbilityBridge                     (registry-backed item access)
//
// Phase 1 scope: build + light integration into prerequisite-checker.
// Does NOT replace all prerequisite checking or rewrite public APIs.
// ============================================

import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { normalizeTalentTreeId } from "/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { FeatChoiceResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js";
import {
  actorIsDroidLike,
  getActorSpeciesNames,
  namesMatchLoosely,
  normalizePendingSkillKeys,
  resolveCanonicalFeatName,
  resolveCanonicalSkillKey,
  resolveCanonicalTalentName,
} from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/legacy-prereq-registry.js";
import { isForceSensitivityName } from "/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

// ── Internals ────────────────────────────────────────────────────

/** Normalize a string for loose set membership. */
function looseKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[‘’‛′']/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Safely iterate an actor's embedded items (handles Map, Array, or missing). */
function safeItems(actor) {
  if (!actor?.items) return [];
  const raw = actor.items.contents || actor.items;
  return Array.isArray(raw) ? raw : Array.from(raw || []);
}

/** Coerce a pending entry to a usable item-like shape. */
function coercePendingEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { name: entry };
  return entry;
}

/** Coerce an array of pending entries. */
function coercePendingArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(coercePendingEntry).filter(Boolean);
}

/** Extract base feat name (before parenthesized choice). */
function baseFeatName(value) {
  const text = String(value ?? '').trim();
  const idx = text.indexOf('(');
  return idx > 0 ? text.slice(0, idx).trim() : text;
}

/** Extract parenthesized choice from a feat name. */
function extractChoice(value) {
  const text = String(value ?? '').trim();
  const open = text.indexOf('(');
  const close = text.lastIndexOf(')');
  if (open > 0 && close > open) return text.slice(open + 1, close).trim();
  return '';
}

// ── Talent tree resolution (reuses TalentTreeDB) ────────────────

function resolveTalentTreeKey(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const tree = TalentTreeDB.get?.(raw)
    || TalentTreeDB.bySourceId?.(raw)
    || TalentTreeDB.byName?.(raw);
  if (tree?.id) return tree.id;
  return normalizeTalentTreeId(raw.replace(/\s*Talent\s+Tree$/i, ''));
}

function getTalentTreeKeys(talent) {
  if (!talent) return [];
  const keys = new Set();
  const addTree = (v) => { const k = resolveTalentTreeKey(v); if (k) keys.add(k); };

  [
    talent?.treeId, talent?.talentTree, talent?.talentTreeId,
    talent?.treeName, talent?.system?.treeId, talent?.system?.talentTreeId,
    talent?.system?.talent_tree, talent?.system?.talentTree, talent?.system?.tree,
    talent?.sourceTreeName, talent?.sourceTreeId,
    talent?.flags?.swse?.treeId, talent?.flags?.swse?.talentTreeId,
  ].forEach(addTree);

  // SSOT inverse lookup via TalentTreeDB
  [talent?.id, talent?._id, talent?.flags?.swse?.id, talent?.name]
    .forEach((id) => addTree(TalentTreeDB.getTreeForTalent?.(id)));

  return Array.from(keys);
}

// ── Choice extraction (reuses FeatChoiceResolver) ────────────────

function getChoiceLabels(entry) {
  const labels = [];
  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v) || v instanceof Set) { for (const n of v) push(n); return; }
    const label = FeatChoiceResolver.getChoiceLabel?.(v) || (typeof v === 'string' ? v : '');
    if (label) labels.push(label);
  };

  push(entry?.system?.selectedChoice);
  push(entry?.system?.selectedChoices);
  push(entry?.selectedChoice);
  push(entry?.selectedChoices);
  push(entry?.choice);
  push(entry?.choiceValue);

  const fromName = extractChoice(entry?.name);
  if (fromName) labels.push(fromName);

  return labels;
}

// ── BAB calculation (mirrors prerequisite-checker logic) ─────────

function calculateBab(actor) {
  if (!actor) return 0;

  const directBab = Number(
    actor.system?.bab
    ?? actor.system?.derived?.bab?.total
    ?? actor.system?.derived?.baseAttackBonus
    ?? actor.system?.combat?.bab?.total
    ?? 0
  );

  let classBab = 0;
  const items = safeItems(actor);
  for (const item of items) {
    if (item?.type !== 'class') continue;
    const sys = item.system || {};
    const level = Number(sys.level ?? item.level ?? 1) || 1;
    const lp = sys.levelProgression || sys.level_progression || [];
    if (Array.isArray(lp) && lp.length > 0) {
      const ld = lp.find((e) => Number(e?.level) === level);
      const bab = Number(ld?.bab ?? ld?.baseAttackBonus);
      if (Number.isFinite(bab)) { classBab += bab; continue; }
    }
    const prog = String(sys.babProgression || sys.bab_progression || '').toLowerCase();
    if (prog === 'fast' || prog === 'full') { classBab += level; }
    else if (prog === 'slow' || prog === 'poor') { classBab += Math.floor(level * 0.5); }
    else if (prog === 'medium' || prog === 'average') { classBab += Math.floor(level * 0.75); }
    else {
      const cn = String(item.name || sys.class_name || sys.classId || '').toLowerCase();
      classBab += /^(jedi|soldier)$/.test(cn) ? level : Math.floor(level * 0.75);
    }
  }

  return Math.max(Number.isFinite(directBab) ? directBab : 0, classBab);
}

// ── Snapshot sections ────────────────────────────────────────────

function buildFeatsSection(actor, pending) {
  const items = [];
  const names = new Set();
  const slugs = new Set();
  const sourceIds = new Set();
  const uuids = new Set();
  const baseNames = new Set();
  const choices = new Map(); // baseName(looseKey) → Set of choice labels (looseKey)

  const ingest = (entry) => {
    if (!entry) return;
    items.push(entry);
    const name = entry.name || '';
    if (name) names.add(looseKey(name));
    const slug = entry.system?.slug || entry.slug || '';
    if (slug) slugs.add(looseKey(slug));
    const sid = entry.flags?.core?.sourceId || '';
    if (sid) sourceIds.add(sid);
    const uuid = entry.uuid || entry.id || entry._id || '';
    if (uuid) uuids.add(uuid);
    const bName = baseFeatName(name);
    if (bName) baseNames.add(looseKey(bName));

    // Index choices
    const choiceLabels = getChoiceLabels(entry);
    if (bName && choiceLabels.length) {
      const bKey = looseKey(bName);
      if (!choices.has(bKey)) choices.set(bKey, new Set());
      for (const label of choiceLabels) {
        choices.get(bKey).add(looseKey(label));
      }
    }
  };

  // Actor owned feats
  for (const item of safeItems(actor)) {
    if (item?.type === 'feat') ingest(item);
  }

  // Pending feats
  for (const entry of coercePendingArray(pending?.selectedFeats)) ingest(entry);
  for (const entry of coercePendingArray(pending?.grantedFeats)) ingest(entry);
  for (const entry of coercePendingArray(pending?.grantedProficiencies)) ingest(entry);

  // Progression state feats (some actors store them here)
  for (const entry of coercePendingArray(actor?.system?.progression?.feats)) ingest(entry);
  for (const entry of coercePendingArray(actor?.system?.progression?.startingFeats)) ingest(entry);

  return {
    items,
    names,
    slugs,
    sourceIds,
    uuids,
    baseNames,
    choices,

    /** Check if actor has a feat by name, slug, sourceId, or uuid. */
    has(nameOrKey) {
      if (!nameOrKey) return false;
      const key = looseKey(nameOrKey);
      return names.has(key) || slugs.has(key) || baseNames.has(key)
        || sourceIds.has(nameOrKey) || uuids.has(nameOrKey);
    },

    /** Check if actor has a scoped feat with a specific choice. */
    hasChoice(baseFeat, choice) {
      if (!baseFeat || !choice) return false;
      const bKey = looseKey(baseFeat);
      const cKey = looseKey(choice);
      const set = choices.get(bKey);
      return set ? set.has(cKey) : false;
    },

    /** Check if actor has ANY choice for a given base feat. */
    hasAnyChoice(baseFeat) {
      if (!baseFeat) return false;
      const bKey = looseKey(baseFeat);
      const set = choices.get(bKey);
      return set ? set.size > 0 : false;
    },
  };
}

function buildTalentsSection(actor, pending) {
  const items = [];
  const names = new Set();
  const slugs = new Set();
  const sourceIds = new Set();
  const uuids = new Set();
  const treeKeys = new Set();
  const byTree = new Map(); // treeKey → [talent, ...]

  const ingest = (entry) => {
    if (!entry) return;
    items.push(entry);
    const name = entry.name || '';
    if (name) names.add(looseKey(name));
    const slug = entry.system?.slug || entry.slug || '';
    if (slug) slugs.add(looseKey(slug));
    const sid = entry.flags?.core?.sourceId || '';
    if (sid) sourceIds.add(sid);
    const uuid = entry.uuid || entry.id || entry._id || '';
    if (uuid) uuids.add(uuid);

    const trees = getTalentTreeKeys(entry);
    for (const tk of trees) {
      treeKeys.add(tk);
      if (!byTree.has(tk)) byTree.set(tk, []);
      byTree.get(tk).push(entry);
    }
  };

  for (const item of safeItems(actor)) {
    if (item?.type === 'talent') ingest(item);
  }
  for (const entry of coercePendingArray(pending?.selectedTalents)) ingest(entry);
  for (const entry of coercePendingArray(pending?.grantedTalents)) ingest(entry);
  for (const entry of coercePendingArray(actor?.system?.progression?.talents)) ingest(entry);

  return {
    items,
    names,
    slugs,
    sourceIds,
    uuids,
    treeKeys,
    byTree,

    has(nameOrKey) {
      if (!nameOrKey) return false;
      const key = looseKey(nameOrKey);
      return names.has(key) || slugs.has(key)
        || sourceIds.has(nameOrKey) || uuids.has(nameOrKey);
    },

    /**
     * Count how many talents the actor has from any of the given trees.
     * Each talent counts once even if it appears under multiple tree aliases.
     * @param {string[]} treeNamesOrKeys - Tree names or normalized keys
     * @returns {number}
     */
    countInTrees(treeNamesOrKeys) {
      if (!Array.isArray(treeNamesOrKeys) || treeNamesOrKeys.length === 0) return 0;
      const resolvedKeys = treeNamesOrKeys.map(resolveTalentTreeKey).filter(Boolean);
      if (resolvedKeys.length === 0) return 0;

      // Use a Set of item references to avoid double-counting a talent that
      // appears under multiple tree aliases.
      const seen = new Set();
      for (const tk of resolvedKeys) {
        const talents = byTree.get(tk) || [];
        for (const t of talents) {
          // Identity key: prefer stable id, fall back to name
          const identity = t?.id || t?._id || t?.name || t;
          seen.add(identity);
        }
      }
      return seen.size;
    },

    /**
     * Get all talents from a specific tree.
     * @param {string} treeNameOrKey
     * @returns {Array}
     */
    getFromTree(treeNameOrKey) {
      const tk = resolveTalentTreeKey(treeNameOrKey);
      return tk ? (byTree.get(tk) || []) : [];
    },
  };
}

function buildClassesSection(actor, pending) {
  const items = [];
  const names = new Set();
  const slugs = new Set();
  const sourceIds = new Set();
  const uuids = new Set();
  const levelsByClass = new Map(); // looseKey(className) → level

  const ingest = (entry) => {
    if (!entry) return;
    items.push(entry);
    const name = entry.name || '';
    const key = looseKey(name);
    if (name) names.add(key);
    const slug = entry.system?.slug || entry.slug || '';
    if (slug) slugs.add(looseKey(slug));
    const sid = entry.flags?.core?.sourceId || '';
    if (sid) sourceIds.add(sid);
    const uuid = entry.uuid || entry.id || entry._id || '';
    if (uuid) uuids.add(uuid);
    const level = Number(entry.system?.level ?? entry.level ?? 1) || 1;
    if (key) {
      levelsByClass.set(key, (levelsByClass.get(key) || 0) + level);
    }
  };

  for (const item of safeItems(actor)) {
    if (item?.type === 'class') ingest(item);
  }

  // Pending class selection (single class being added)
  const pendingClass = pending?.selectedClass || pending?.classDoc;
  if (pendingClass) {
    const entry = coercePendingEntry(pendingClass);
    if (entry) ingest(entry);
  }

  const totalLevel = actor?.system?.level ?? Array.from(levelsByClass.values()).reduce((a, b) => a + b, 0) || 1;
  const bab = calculateBab(actor);

  return {
    items,
    names,
    slugs,
    sourceIds,
    uuids,
    levelsByClass,
    totalLevel,
    bab,

    has(nameOrKey) {
      if (!nameOrKey) return false;
      const key = looseKey(nameOrKey);
      return names.has(key) || slugs.has(key)
        || sourceIds.has(nameOrKey) || uuids.has(nameOrKey);
    },

    /** Get the level in a specific class. */
    getLevel(className) {
      if (!className) return 0;
      return levelsByClass.get(looseKey(className)) || 0;
    },
  };
}

function buildSpeciesSection(actor, pending) {
  const speciesNames = getActorSpeciesNames(actor, pending);
  const names = new Set(speciesNames.map(looseKey));
  const keys = new Set(speciesNames.map(looseKey)); // same normalization for now
  const isDroid = actorIsDroidLike(actor, pending || {});

  // Droid metadata
  let droidDegree = null;
  let droidChassis = null;
  if (isDroid) {
    droidDegree = actor?.system?.droidDegree || actor?.system?.degree || pending?.droidDegree || null;
    droidChassis = actor?.system?.droidChassis || actor?.system?.chassis || pending?.droidChassis || null;
  }

  return {
    names,
    keys,
    isDroid,
    droidDegree,
    droidChassis,

    has(nameOrKey) {
      if (!nameOrKey) return false;
      return names.has(looseKey(nameOrKey));
    },
  };
}

function buildForceSection(actor, pending) {
  // Force Sensitive detection — mirrors _checkForceSensitiveLegacy
  let forceSensitive = false;

  const items = safeItems(actor);

  // Check owned feats
  if (items.some((i) => i.type === 'feat' && isForceSensitivityName(i.name))) {
    forceSensitive = true;
  }
  // Check owned classes granting FS
  if (!forceSensitive && items.some((i) => i.type === 'class' && i.system?.forceSensitive === true)) {
    forceSensitive = true;
  }
  // Pending feats
  if (!forceSensitive) {
    for (const entry of coercePendingArray(pending?.selectedFeats)) {
      if (isForceSensitivityName(entry?.name || '')) { forceSensitive = true; break; }
    }
  }
  if (!forceSensitive) {
    for (const entry of coercePendingArray(pending?.grantedFeats)) {
      if (isForceSensitivityName(entry?.name || '')) { forceSensitive = true; break; }
    }
  }
  // Pending explicit flag
  if (!forceSensitive && pending?.forceSensitive === true) {
    forceSensitive = true;
  }
  // Pending class document granting FS
  if (!forceSensitive) {
    const pendingClass = pending?.selectedClass || pending?.classDoc;
    if (pendingClass?.system?.forceSensitive === true) forceSensitive = true;
  }

  // Droid suppression
  if (actorIsDroidLike(actor, pending || {})) {
    forceSensitive = false;
  }

  // Force Training count — used for force_power_count evaluation
  // (each Force Training feat grants access to more Force powers)
  let forceTrainingCount = 0;
  const isForceTraining = (name) => looseKey(name) === 'force training';

  // Force powers, techniques, secrets
  const powers = new Set();
  const techniques = new Set();
  const secrets = new Set();

  // Force traditions and disciplines — organizational/narrative state.
  // Populated from actor flags or custom item types when available.
  // Placeholder Sets exposed so the evaluator API is stable even when empty.
  const traditions = new Set();
  const disciplines = new Set();

  for (const item of items) {
    const t = item?.type || '';
    const name = looseKey(item?.name);
    if (t === 'force-power' || t === 'forcePower') {
      if (name) powers.add(name);
    } else if (t === 'forcetechnique' || t === 'force-technique') {
      if (name) techniques.add(name);
    } else if (t === 'feat') {
      if (item?.system?.tags?.includes('force_secret')) {
        if (name) secrets.add(name);
      }
      if (isForceTraining(item?.name)) {
        forceTrainingCount++;
      }
    } else if (t === 'force-tradition' || t === 'forceTradition') {
      if (name) traditions.add(name);
    } else if (t === 'force-discipline' || t === 'forceDiscipline') {
      if (name) disciplines.add(name);
    }
  }

  // Count pending Force Training grants
  for (const entry of coercePendingArray(pending?.selectedFeats)) {
    if (isForceTraining(entry?.name)) forceTrainingCount++;
  }
  for (const entry of coercePendingArray(pending?.grantedFeats)) {
    if (isForceTraining(entry?.name)) forceTrainingCount++;
  }

  // Actor flags may carry tradition/discipline memberships
  const flagTraditions = actor?.flags?.swse?.forceTraditions || actor?.system?.forceTraditions || [];
  const flagDisciplines = actor?.flags?.swse?.forceDisciplines || actor?.system?.forceDisciplines || [];
  if (Array.isArray(flagTraditions)) {
    for (const t of flagTraditions) { if (t) traditions.add(looseKey(t)); }
  }
  if (Array.isArray(flagDisciplines)) {
    for (const d of flagDisciplines) { if (d) disciplines.add(looseKey(d)); }
  }

  const powerCount = powers.size;

  return {
    forceSensitive,
    forceTrainingCount,
    powers,
    powerCount,
    techniques,
    secrets,
    traditions,
    disciplines,
  };
}

function buildDarkSideSection(actor) {
  const value = DSPEngine.getValue?.(actor) ?? 0;
  return {
    score: value,
    points: value,
    value,

    meetsThreshold(minimum) {
      return DSPEngine.meetsThreshold?.(actor, minimum) ?? (value >= minimum);
    },
  };
}

function buildSkillsSection(actor, pending) {
  const trained = new Set();
  const focused = new Set();
  const ranks = new Map();

  // Actor system skills
  if (actor?.system?.skills) {
    for (const [key, data] of Object.entries(actor.system.skills)) {
      if (data?.trained) trained.add(key);
      if (data?.focus || data?.skillFocus) focused.add(key);
      const r = Number(data?.ranks ?? data?.rank ?? 0);
      if (r > 0) ranks.set(key, r);
    }
  }

  // Skill items
  for (const item of safeItems(actor)) {
    if (item?.type !== 'skill') continue;
    const key = resolveCanonicalSkillKey(item.name) || item.name;
    if (item.system?.trained) trained.add(key);
    if (item.system?.focus || item.system?.skillFocus) focused.add(key);
    const r = Number(item.system?.ranks ?? item.system?.rank ?? 0);
    if (r > 0) ranks.set(key, Math.max(ranks.get(key) || 0, r));
  }

  // Pending skills
  const pendingKeys = normalizePendingSkillKeys(pending?.selectedSkills);
  for (const key of pendingKeys) {
    if (key) trained.add(key);
  }

  // Pending progression trained skills
  const progressionSkills = actor?.system?.progression?.trainedSkills;
  if (Array.isArray(progressionSkills)) {
    for (const entry of progressionSkills) {
      const key = resolveCanonicalSkillKey(typeof entry === 'string' ? entry : entry?.name) || '';
      if (key) trained.add(key);
    }
  }

  // Skill Focus feats → focused set (Skill Focus entries from feat choice resolver)
  for (const item of safeItems(actor)) {
    if (item?.type !== 'feat') continue;
    const bn = looseKey(baseFeatName(item.name));
    if (bn !== 'skill focus') continue;
    const choiceLabels = getChoiceLabels(item);
    for (const label of choiceLabels) {
      const key = resolveCanonicalSkillKey(label);
      if (key) focused.add(key);
    }
  }
  // Also check pending Skill Focus feats
  for (const entry of coercePendingArray(pending?.selectedFeats)) {
    const bn = looseKey(baseFeatName(entry?.name || ''));
    if (bn !== 'skill focus') continue;
    const choiceLabels = getChoiceLabels(entry);
    for (const label of choiceLabels) {
      const key = resolveCanonicalSkillKey(label);
      if (key) focused.add(key);
    }
  }

  return {
    trained,
    focused,
    ranks,

    hasTrained(skillKey) {
      if (!skillKey) return false;
      const resolved = resolveCanonicalSkillKey(skillKey) || skillKey;
      return trained.has(resolved);
    },

    hasFocus(skillKey) {
      if (!skillKey) return false;
      const resolved = resolveCanonicalSkillKey(skillKey) || skillKey;
      return focused.has(resolved);
    },

    getRanks(skillKey) {
      if (!skillKey) return 0;
      const resolved = resolveCanonicalSkillKey(skillKey) || skillKey;
      return ranks.get(resolved) || 0;
    },
  };
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Build a normalized, read-only prerequisite snapshot of an actor's state.
 *
 * @param {Object} actor - Foundry actor document (or minimal actor-like object)
 * @param {Object} [pending={}] - Pending chargen/levelup selections
 * @param {Object} [options={}] - Reserved for future options
 * @returns {Object} Snapshot with feats, talents, classes, species, force, darkSide, skills sections
 */
export function buildActorPrerequisiteSnapshot(actor, pending = {}, options = {}) {
  if (!actor) {
    SWSELogger.debug('[ActorPrereqSnapshot] No actor provided, returning empty snapshot');
    return _emptySnapshot(null, pending);
  }

  pending = pending || {};

  return Object.freeze({
    actor,
    pending,
    feats: buildFeatsSection(actor, pending),
    talents: buildTalentsSection(actor, pending),
    classes: buildClassesSection(actor, pending),
    species: buildSpeciesSection(actor, pending),
    force: buildForceSection(actor, pending),
    darkSide: buildDarkSideSection(actor),
    skills: buildSkillsSection(actor, pending),
  });
}

/**
 * Class wrapper for callers that prefer `ActorPrerequisiteSnapshot.from(actor)`.
 */
export class ActorPrerequisiteSnapshot {
  static from(actor, pending = {}, options = {}) {
    return buildActorPrerequisiteSnapshot(actor, pending, options);
  }
}

// ── Empty snapshot (safe default) ────────────────────────────────

function _emptySnapshot(actor, pending) {
  const emptySet = new Set();
  const emptyMap = new Map();
  const noop = () => false;
  const noopNum = () => 0;

  return Object.freeze({
    actor: actor || null,
    pending: pending || {},
    feats: { items: [], names: emptySet, slugs: emptySet, sourceIds: emptySet, uuids: emptySet, baseNames: emptySet, choices: emptyMap, has: noop, hasChoice: noop, hasAnyChoice: noop },
    talents: { items: [], names: emptySet, slugs: emptySet, sourceIds: emptySet, uuids: emptySet, treeKeys: emptySet, byTree: emptyMap, has: noop, countInTrees: noopNum, getFromTree: () => [] },
    classes: { items: [], names: emptySet, slugs: emptySet, sourceIds: emptySet, uuids: emptySet, levelsByClass: emptyMap, totalLevel: 0, bab: 0, has: noop, getLevel: noopNum },
    species: { names: emptySet, keys: emptySet, isDroid: false, droidDegree: null, droidChassis: null, has: noop },
    force: { forceSensitive: false, forceTrainingCount: 0, powers: emptySet, powerCount: 0, techniques: emptySet, secrets: emptySet, traditions: emptySet, disciplines: emptySet },
    darkSide: { score: 0, points: 0, value: 0, meetsThreshold: noop },
    skills: { trained: emptySet, focused: emptySet, ranks: emptyMap, hasTrained: noop, hasFocus: noop, getRanks: noopNum },
  });
}
