// ============================================
// FILE: scripts/engine/progression/prerequisites/prerequisite-evaluator.js
// Prerequisite Evaluator — Phase 3
// ============================================
//
// Evaluates Phase 2 normalized requirement records against a Phase 1 actor
// prerequisite snapshot.
//
// This is the canonical evaluation layer — it knows how to answer "does this
// actor satisfy this requirement?" given a structured requirement and a snapshot.
//
// Inputs:
//   snapshot    — from ActorPrerequisiteSnapshot.from() / buildActorPrerequisiteSnapshot()
//   requirements — from PrerequisiteNormalizer.normalize()
//
// Output:
//   { passed, hardPassed, missing, unresolved, satisfied, warnings, results }
//
// Key behaviors:
//   - Scoped feats (Skill Focus (Stealth)) checked via snapshot.feats.hasChoice()
//   - Talent tree counts checked via snapshot.talents.countInTrees()
//   - Unknown/table_state → advisory (NOT silently satisfied, NOT hard fail)
//   - No crashes on missing/malformed data
//   - No console spam in normal play (SWSELogger.debug only)
//
// Reuses:
//   - Phase 1 snapshot API (feats.has, feats.hasChoice, talents.countInTrees, etc.)
//   - DSPEngine for dynamic DSP checks
//   - namesMatchLoosely / normalizeLooseLookupKey from legacy-prereq-registry
//   - FeatChoiceResolver for weapon-group choice matching
//
// Phase 3 scope: evaluator + integration into prerequisite-checker.js.
// Does NOT replace public checker APIs or rewrite progression steps.
// ============================================

import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import {
  namesMatchLoosely,
  normalizeLooseLookupKey,
  resolveCanonicalFeatName,
} from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/legacy-prereq-registry.js";
import { FeatChoiceResolver, normalizeFeatChoiceKey } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

// ── Internal helpers ─────────────────────────────────────────────

/** Safe string normalization for loose comparison. */
function looseKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Check if two string values loosely match. */
function loosely(a, b) {
  return namesMatchLoosely(a, b);
}

/**
 * Check if a snapshot feat index has a specific scoped feat choice.
 * Uses the snapshot's pre-built choice index.
 *
 * @param {Object} snapshot
 * @param {string} baseFeatName - e.g. "Skill Focus"
 * @param {Object} choice - { kind, key, name } from Phase 2 normalizer
 * @returns {boolean}
 */
function snapshotHasScopedFeat(snapshot, baseFeatName, choice) {
  if (!snapshot?.feats?.hasChoice) return false;
  // Try by choice name, then by choice key
  return (
    snapshot.feats.hasChoice(baseFeatName, choice.name) ||
    snapshot.feats.hasChoice(baseFeatName, choice.key)
  );
}

// ── Individual requirement evaluators ────────────────────────────

/** Evaluate a feat requirement (plain or scoped). */
function evalFeat(snapshot, req, opts) {
  const featName = req.name || req.key || '';
  const choice = req.choice;

  if (choice && (choice.name || choice.key)) {
    // Scoped feat: must match BOTH base feat AND choice
    const passed = snapshotHasScopedFeat(snapshot, featName, choice)
      || houseruleHasFeat(opts.houseruleFeats, featName);
    const label = choice.name || choice.key;
    return {
      passed,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: passed ? '' : `Requires ${featName} (${label})`,
    };
  }

  // Plain feat
  const has = snapshot.feats.has(featName)
    || houseruleHasFeat(opts.houseruleFeats, featName);
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires feat: ${featName}`,
  };
}

/** Evaluate a talent requirement. */
function evalTalent(snapshot, req, opts) {
  const talentName = req.name || req.key || '';
  const has = snapshot.talents.has(talentName);
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires talent: ${talentName}`,
  };
}

/** Evaluate a talent-count requirement across specified trees. */
function evalTalentCount(snapshot, req, opts) {
  const required = Number(req.count) || 1;
  const trees = Array.isArray(req.trees) ? req.trees : [];

  let actual;
  let treeLabel;

  if (trees.length === 0) {
    // No specific trees specified — count all owned talents
    actual = Array.isArray(snapshot.talents.items) ? snapshot.talents.items.length : 0;
    treeLabel = 'any tree';
  } else {
    // Resolve tree identifiers: use key if available, fall back to name
    const treeKeys = trees.map((t) => t.key || t.name || '').filter(Boolean);
    actual = snapshot.talents.countInTrees(treeKeys);
    treeLabel = trees.map((t) => t.name || t.key).join(', ');
  }

  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${required} talent(s) from ${treeLabel} (you have ${actual})`,
  };
}

/** Evaluate a force-talent-count requirement. */
function evalForceTalentCount(snapshot, req, opts) {
  const required = Number(req.count) || 1;
  // Check snapshot force section
  const forceTalents = Array.isArray(snapshot.talents?.items)
    ? snapshot.talents.items.filter((t) => {
        return (
          t?.system?.isForce === true ||
          (Array.isArray(t?.system?.tags) && t.system.tags.includes('force'))
        );
      })
    : [];
  const actual = forceTalents.length;
  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${required} Force talent(s) (you have ${actual})`,
  };
}

/** Evaluate a class (with optional minLevel) requirement. */
function evalClass(snapshot, req, opts) {
  const className = req.name || req.key || '';
  const minLevel = Number(req.minLevel ?? req.min ?? 1);

  if (!snapshot.classes.has(className)) {
    return {
      passed: false,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: `Requires ${className} (level ${minLevel})`,
    };
  }

  const actualLevel = snapshot.classes.getLevel(className);
  const passed = actualLevel >= minLevel;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${className} level ${minLevel} (you have level ${actualLevel})`,
  };
}

/** Evaluate a character level requirement. */
function evalLevel(snapshot, req, opts) {
  const required = Number(req.min ?? req.minimum ?? 1);
  const actual = snapshot.classes.totalLevel;
  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires character level ${required} (you are level ${actual})`,
  };
}

/** Evaluate a BAB requirement. */
function evalBab(snapshot, req, opts) {
  const required = Number(req.min ?? req.minimum ?? 0);
  const actual = snapshot.classes.bab;
  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires BAB +${required} (you have +${actual})`,
  };
}

/** Evaluate a trained-skill requirement. */
function evalSkill(snapshot, req, opts) {
  const skillKey = req.key || req.name || '';
  const requiresTrained = req.trained !== false; // default: require trained
  const requiredRanks = typeof req.ranks === 'number' ? req.ranks : 0;

  let passed;
  let message;

  if (requiredRanks > 0) {
    const actualRanks = snapshot.skills.getRanks(skillKey);
    passed = actualRanks >= requiredRanks;
    message = passed
      ? ''
      : `Requires ${requiredRanks} ranks in ${req.name || skillKey} (you have ${actualRanks})`;
  } else if (requiresTrained) {
    passed = snapshot.skills.hasTrained(skillKey);
    message = passed
      ? ''
      : `Requires training in ${req.name || skillKey}`;
  } else {
    passed = true;
    message = '';
  }

  return { passed, advisory: false, unresolved: false, requirement: req, message };
}

/** Evaluate a Force Sensitive requirement. */
function evalForceSensitive(snapshot, req, opts) {
  // Droids cannot satisfy Force Sensitive
  if (snapshot.species.isDroid) {
    return {
      passed: false,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: 'Droids cannot acquire or satisfy Force Sensitivity prerequisites',
    };
  }

  const has = snapshot.force.forceSensitive
    || houseruleHasFeat(opts.houseruleFeats, 'Force Sensitivity')
    || houseruleHasFeat(opts.houseruleFeats, 'Force Sensitive');
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : 'Requires Force Sensitivity',
  };
}

/** Evaluate a species requirement. */
function evalSpecies(snapshot, req, opts) {
  const speciesName = req.name || req.key || '';
  const has = snapshot.species.has(speciesName);
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires species: ${speciesName}`,
  };
}

/** Evaluate a droid requirement. */
function evalDroid(snapshot, req, opts) {
  if (!snapshot.species.isDroid) {
    return {
      passed: false,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: 'Requires being a Droid',
    };
  }

  // Degree check
  if (req.degree) {
    const snapshotDegree = String(snapshot.species.droidDegree || '').toLowerCase();
    const reqDegree = String(req.degree).toLowerCase();
    const degreePassed = snapshotDegree === reqDegree || snapshotDegree.includes(reqDegree);
    if (!degreePassed) {
      return {
        passed: false,
        advisory: false,
        unresolved: false,
        requirement: req,
        message: `Requires ${req.degree}-degree Droid`,
      };
    }
  }

  return { passed: true, advisory: false, unresolved: false, requirement: req, message: '' };
}

/** Evaluate a non-droid requirement. */
function evalNonDroid(snapshot, req, opts) {
  const passed = !snapshot.species.isDroid;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed ? '' : 'Cannot be a Droid',
  };
}

/** Evaluate a dark side score (DSP) requirement. */
function evalDarkSide(snapshot, req, opts) {
  const minimum = req.min ?? req.minimum;

  // Dynamic wisdom-based minimum
  if (minimum === 'wisdom') {
    const actor = snapshot.actor;
    const wisScore = actor?.system?.attributes?.wis?.base
      ?? actor?.system?.attributes?.wis?.value
      ?? 10;
    const actual = snapshot.darkSide.value;
    const passed = actual >= wisScore;
    return {
      passed,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: passed
        ? ''
        : `Dark Side Score must equal Wisdom (${wisScore}) (you have ${actual})`,
    };
  }

  const requiredScore = Number(minimum ?? 0);
  const passed = snapshot.darkSide.meetsThreshold(requiredScore);
  const actual = snapshot.darkSide.value;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Dark Side Score must be at least ${requiredScore} (you have ${actual})`,
  };
}

/** Evaluate an ability score requirement. */
function evalAbility(snapshot, req, opts) {
  const actor = snapshot.actor;
  const abilityKey = String(req.ability || req.attribute || '').toLowerCase();
  const required = Number(req.min ?? req.minimum ?? req.value ?? 10);

  if (!actor || !abilityKey) {
    return { passed: true, advisory: false, unresolved: false, requirement: req, message: '' };
  }

  // Droids have no CON
  if (snapshot.species.isDroid && abilityKey === 'con') {
    return {
      passed: false,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: `Droids do not have Constitution and cannot meet Constitution ${required} prerequisites`,
    };
  }

  const ability =
    actor.system?.attributes?.[abilityKey]?.total
    ?? actor.system?.attributes?.[abilityKey]?.value
    ?? actor.system?.abilities?.[abilityKey]?.value
    ?? 10;

  const passed = Number(ability) >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${abilityKey.toUpperCase()} ${required} (you have ${ability})`,
  };
}

/** Evaluate a Force Power requirement (specific named power). */
function evalForcePower(snapshot, req, opts) {
  const powerName = req.name || req.key || '';
  const has = snapshot.force.powers.has(looseKey(powerName));
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires Force Power: ${powerName}`,
  };
}

/**
 * Evaluate a Force Power COUNT requirement.
 * Distinct from knowing a SPECIFIC Force power.
 * Example: "requires 3 Force powers" → force_power_count { min: 3 }
 */
function evalForcePowerCount(snapshot, req, opts) {
  const required = Number(req.min ?? req.count ?? 1);
  const actual = snapshot.force.powerCount ?? snapshot.force.powers.size ?? 0;
  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${required} Force Power(s) known (you have ${actual})`,
  };
}

/**
 * Evaluate a Force Technique requirement (specific named technique).
 * NOTE: A Force technique does NOT satisfy a Force secret prerequisite.
 */
function evalForceTechnique(snapshot, req, opts) {
  const techName = req.name || req.key || '';
  const has = snapshot.force.techniques.has(looseKey(techName));
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires Force Technique: ${techName}`,
  };
}

/** Evaluate a Force Technique count requirement. */
function evalForceTechniqueCount(snapshot, req, opts) {
  const required = Number(req.count ?? req.min ?? 1);
  const actual = snapshot.force.techniques.size;
  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${required} Force Technique(s) (you have ${actual})`,
  };
}

/**
 * Evaluate a Force Secret requirement (specific named secret).
 * NOTE: A Force secret does NOT satisfy a Force technique prerequisite.
 */
function evalForceSecret(snapshot, req, opts) {
  const secretName = req.name || req.key || '';
  const has = snapshot.force.secrets.has(looseKey(secretName));
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires Force Secret: ${secretName}`,
  };
}

/** Evaluate a Force Secret count requirement. */
function evalForceSecretCount(snapshot, req, opts) {
  const required = Number(req.count ?? req.min ?? 1);
  const actual = snapshot.force.secrets.size;
  const passed = actual >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed
      ? ''
      : `Requires ${required} Force Secret(s) (you have ${actual})`,
  };
}

/**
 * Evaluate a Force Tradition requirement.
 * Force traditions (Jedi, Sith, etc.) are organizational/campaign-state.
 * When the actor has known tradition membership (via flags or items), evaluate it.
 * If the tradition data is absent, surface as advisory rather than hard-fail.
 */
function evalForceTradition(snapshot, req, opts) {
  const tradKey = looseKey(req.name || req.key || '');
  if (!tradKey) {
    return evalUnknown(snapshot, req, opts);
  }

  // Check if tradition data is tracked in the snapshot
  if (snapshot.force.traditions.size > 0) {
    const has = snapshot.force.traditions.has(tradKey);
    return {
      passed: has,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: has ? '' : `Requires Force tradition: ${req.name || tradKey}`,
    };
  }

  // Tradition membership is not tracked in actor data — surface as advisory
  return {
    passed: false,
    advisory: true,
    unresolved: true,
    requirement: req,
    message: `Requires Force tradition membership: ${req.name || tradKey} (cannot be automatically verified — check with GM)`,
  };
}

/**
 * Evaluate a Force Discipline requirement.
 * Force disciplines are specialized Force sub-systems (Telekinetic Savant, etc.).
 * Treated as advisory when not tracked in actor data.
 */
function evalForceDiscipline(snapshot, req, opts) {
  const discKey = looseKey(req.name || req.key || '');
  if (!discKey) {
    return evalUnknown(snapshot, req, opts);
  }

  if (snapshot.force.disciplines.size > 0) {
    const has = snapshot.force.disciplines.has(discKey);
    return {
      passed: has,
      advisory: false,
      unresolved: false,
      requirement: req,
      message: has ? '' : `Requires Force discipline: ${req.name || discKey}`,
    };
  }

  return {
    passed: false,
    advisory: true,
    unresolved: true,
    requirement: req,
    message: `Requires Force discipline: ${req.name || discKey} (cannot be automatically verified)`,
  };
}

/**
 * Evaluate a constructed-item requirement (e.g. "must construct own lightsaber").
 * This is inherently campaign/table-state — always advisory.
 */
function evalConstructedItem(snapshot, req, opts) {
  const itemName = req.name || req.key || 'an item';
  return {
    passed: false,
    advisory: true,
    unresolved: true,
    requirement: req,
    message: `Requires: ${req.ownConstructionRequired ? 'must construct own ' : ''}${itemName} (cannot be automatically verified — check with GM)`,
  };
}

/** Evaluate an armor proficiency requirement via snapshot feat index. */
function evalArmorProficiency(snapshot, req, opts) {
  const tier = String(req.tier || req.armor || '').toLowerCase();
  if (!tier) return { passed: true, advisory: false, unresolved: false, requirement: req, message: '' };

  // Rank: light=1, medium=2, heavy=3
  const rankMap = { light: 1, medium: 2, heavy: 3 };
  const required = rankMap[tier] || 0;
  if (!required) return { passed: true, advisory: false, unresolved: false, requirement: req, message: '' };

  // Check snapshot feats for armor proficiency entries
  let highestRank = 0;
  for (const item of (snapshot.feats.items || [])) {
    const name = String(item?.name || '').toLowerCase();
    if (name.includes('armor proficiency') || name.includes('armored defense')) {
      if (name.includes('heavy')) highestRank = Math.max(highestRank, 3);
      else if (name.includes('medium')) highestRank = Math.max(highestRank, 2);
      else if (name.includes('light')) highestRank = Math.max(highestRank, 1);
    }
  }

  const passed = highestRank >= required;
  return {
    passed,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: passed ? '' : `Requires proficiency with ${tier} armor`,
  };
}

/**
 * Evaluate weapon proficiency/focus/specialization requirements.
 * Falls back to snapshot feat index when FeatChoiceResolver is unavailable.
 */
function evalWeaponChoice(snapshot, req, opts) {
  const actor = snapshot.actor;
  const pending = snapshot.pending;
  const reqType = req.type; // 'weapon_proficiency', 'weapon_focus', 'weapon_specialization'

  // No specific target (placeholder "chosen weapon") — check if any exists
  const target = req.key || req.name || null;
  if (!target) {
    // Check if any proficiency/focus/spec exists
    const baseName = reqType === 'weapon_proficiency'
      ? 'weapon proficiency'
      : reqType === 'weapon_focus' ? 'weapon focus' : 'weapon specialization';
    const hasAny = snapshot.feats.hasAnyChoice(baseName);
    return {
      passed: hasAny,
      advisory: !hasAny, // Advisory if we can't confirm
      unresolved: !hasAny,
      requirement: req,
      message: hasAny ? '' : `Requires a ${baseName} feat`,
    };
  }

  // Try FeatChoiceResolver if available (most accurate)
  try {
    if (actor) {
      let providers = [];
      if (reqType === 'weapon_proficiency' && FeatChoiceResolver.getWeaponProficiencyChoices) {
        providers = FeatChoiceResolver.getWeaponProficiencyChoices(actor, FeatChoiceResolver._registry || {}, pending);
      } else if (reqType === 'weapon_focus' && FeatChoiceResolver.getWeaponFocusChoices) {
        providers = FeatChoiceResolver.getWeaponFocusChoices(actor, pending);
      } else if (FeatChoiceResolver._getChoiceEntriesByKind) {
        providers = FeatChoiceResolver._getChoiceEntriesByKind(actor, reqType, pending);
      }

      if (providers.length > 0) {
        const targetKey = normalizeFeatChoiceKey(target);
        const has = providers.some((entry) => {
          const k = FeatChoiceResolver.getSelectedChoiceKey?.(entry);
          return k && k === targetKey;
        });
        return {
          passed: has,
          advisory: false,
          unresolved: false,
          requirement: req,
          message: has ? '' : `Requires ${req.type} (${target})`,
        };
      }
    }
  } catch (e) {
    SWSELogger.debug(`[PrereqEvaluator] FeatChoiceResolver error for ${reqType}: ${e?.message}`);
  }

  // Fallback: snapshot feat choice index
  const baseNames = {
    weapon_proficiency: 'weapon proficiency',
    weapon_focus: 'weapon focus',
    weapon_specialization: 'weapon specialization',
  };
  const baseName = baseNames[reqType] || reqType;
  const has = snapshot.feats.hasChoice(baseName, target);
  return {
    passed: has,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: has ? '' : `Requires ${baseName} (${target})`,
  };
}

/**
 * Evaluate an OR group — any condition that passes satisfies it.
 */
function evalOr(snapshot, req, opts) {
  const conditions = req.conditions || req.groups?.flat() || [];
  for (const cond of conditions) {
    const r = evaluatePrerequisite(snapshot, cond, opts);
    if (r.passed) {
      return { passed: true, advisory: false, unresolved: false, requirement: req, message: '' };
    }
  }
  const labels = conditions.map((c) => c.name || c.type || '').filter(Boolean).join(', ');
  return {
    passed: false,
    advisory: false,
    unresolved: false,
    requirement: req,
    message: labels
      ? `Requires one of: ${labels}`
      : 'Requires at least one of several prerequisites',
  };
}

/**
 * Evaluate an unknown or table-state requirement.
 *
 * These are explicitly NOT silently satisfied.
 * They are advisory (not a hard false) — the actor may in fact meet the
 * requirement but it cannot be automatically verified.
 */
function evalUnknown(snapshot, req, opts) {
  const text = req.raw || req.name || req.key || '';
  const display = text || String(req.type || 'Unknown requirement');
  return {
    passed: false,
    advisory: true,    // advisory — not a hard fail
    unresolved: true,  // cannot be auto-resolved
    requirement: req,
    message: `Requires: ${display} (cannot be automatically verified — check with GM)`,
  };
}

// ── Houserule helper ─────────────────────────────────────────────

/**
 * Check if a feat is granted by a houserule.
 * @param {string[]} houseruleFeats - Names from PrerequisiteChecker.getHouseruleGrantedFeats()
 * @param {string} featName
 * @returns {boolean}
 */
function houseruleHasFeat(houseruleFeats, featName) {
  if (!Array.isArray(houseruleFeats) || !featName) return false;
  return houseruleFeats.some((name) => namesMatchLoosely(name, featName));
}

// ── Dispatch table ───────────────────────────────────────────────

const EVALUATORS = {
  feat: evalFeat,
  talent: evalTalent,
  talent_count: evalTalentCount,
  force_talent_count: evalForceTalentCount,
  class: evalClass,
  level: evalLevel,
  bab: evalBab,
  skill: evalSkill,
  skill_trained: evalSkill,
  force_sensitive: evalForceSensitive,
  species: evalSpecies,
  droid: evalDroid,
  non_droid: evalNonDroid,
  dark_side: evalDarkSide,
  dark_side_score: evalDarkSide,
  ability: evalAbility,
  // ── Force-specific types (each is DISTINCT — no cross-satisfaction) ──
  force_power: evalForcePower,
  force_power_count: evalForcePowerCount,
  force_technique: evalForceTechnique,
  force_technique_count: evalForceTechniqueCount,
  force_secret: evalForceSecret,
  force_secret_count: evalForceSecretCount,
  force_tradition: evalForceTradition,
  force_discipline: evalForceDiscipline,
  constructed_item: evalConstructedItem,
  // ── Weapon/armor ──
  armor_proficiency: evalArmorProficiency,
  weapon_proficiency: evalWeaponChoice,
  weapon_focus: evalWeaponChoice,
  weapon_specialization: evalWeaponChoice,
  // ── Logic ──
  or: evalOr,
  // ── Unknown / advisory ──
  unknown: evalUnknown,
  table_state: evalUnknown,
};

// ── Public API ───────────────────────────────────────────────────

/**
 * Evaluate a single normalized prerequisite record against a snapshot.
 *
 * @param {Object} snapshot - Phase 1 actor prerequisite snapshot
 * @param {Object} requirement - Phase 2 normalized requirement record
 * @param {Object} [options={}]
 * @param {string[]} [options.houseruleFeats=[]] - Houserule-granted feat names
 * @returns {Object} RequirementResult { passed, advisory, unresolved, requirement, message }
 */
export function evaluatePrerequisite(snapshot, requirement, options = {}) {
  if (!requirement || typeof requirement !== 'object') {
    return { passed: true, advisory: false, unresolved: false, requirement, message: '' };
  }

  const opts = {
    houseruleFeats: Array.isArray(options.houseruleFeats) ? options.houseruleFeats : [],
    ...options,
  };

  const type = requirement.type;
  const evaluator = EVALUATORS[type];

  if (!evaluator) {
    // Unknown type — treat as unknown/advisory
    SWSELogger.debug(`[PrereqEvaluator] No evaluator for type "${type}", treating as advisory`);
    return evalUnknown(snapshot, requirement, opts);
  }

  try {
    return evaluator(snapshot, requirement, opts);
  } catch (e) {
    SWSELogger.debug(`[PrereqEvaluator] Error evaluating type "${type}": ${e?.message}`);
    return {
      passed: false,
      advisory: true,
      unresolved: true,
      requirement,
      message: `Evaluation error for ${type}: ${e?.message || 'unknown error'}`,
    };
  }
}

/**
 * Evaluate an array of normalized prerequisite records against a snapshot.
 *
 * All hard requirements must pass for `passed` to be true.
 * Advisory/unresolved requirements do NOT affect `passed`.
 *
 * @param {Object} snapshot - Phase 1 actor prerequisite snapshot
 * @param {Object[]} requirements - Array of Phase 2 normalized requirement records
 * @param {Object} [options={}]
 * @param {string[]} [options.houseruleFeats=[]] - Houserule-granted feat names
 * @returns {Object} EvaluationResult
 */
export function evaluatePrerequisites(snapshot, requirements, options = {}) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return {
      passed: true,
      hardPassed: true,
      advisoryPassed: true,
      missing: [],
      unresolved: [],
      satisfied: [],
      warnings: [],
      results: [],
    };
  }

  const results = requirements.map((req) =>
    evaluatePrerequisite(snapshot, req, options)
  );

  const missing = [];      // Hard failures
  const unresolved = [];   // Advisory / cannot-verify
  const satisfied = [];    // Passing requirements
  const warnings = [];     // Non-fatal issues

  for (const r of results) {
    if (r.passed) {
      if (r.message) satisfied.push(r.message);
    } else if (r.advisory || r.unresolved) {
      if (r.message) unresolved.push(r.message);
    } else {
      if (r.message) missing.push(r.message);
    }
  }

  const hardPassed = missing.length === 0;
  const advisoryPassed = unresolved.length === 0;

  return {
    passed: hardPassed,   // Only hard failures block
    hardPassed,
    advisoryPassed,
    missing,
    unresolved,
    satisfied,
    warnings,
    results,
  };
}

/**
 * Class wrapper for callers that prefer PrerequisiteEvaluator.evaluate().
 */
export class PrerequisiteEvaluator {
  /**
   * Evaluate normalized requirements against a Phase 1 snapshot.
   *
   * @param {Object} snapshot - from ActorPrerequisiteSnapshot.from()
   * @param {Object[]} requirements - from PrerequisiteNormalizer.normalize()
   * @param {Object} [options={}]
   * @returns {Object} EvaluationResult
   */
  static evaluate(snapshot, requirements, options = {}) {
    return evaluatePrerequisites(snapshot, requirements, options);
  }

  /**
   * Evaluate a single requirement against a snapshot.
   *
   * @param {Object} snapshot
   * @param {Object} requirement
   * @param {Object} [options={}]
   * @returns {Object} RequirementResult
   */
  static evaluateOne(snapshot, requirement, options = {}) {
    return evaluatePrerequisite(snapshot, requirement, options);
  }
}
