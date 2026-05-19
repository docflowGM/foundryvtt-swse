/**
 * Step Normalizers
 *
 * PHASE 1: Helper functions for normalizing step outputs into canonical schemas.
 *
 * Each major step (species, class, background, attributes, skills, feats, talents, languages)
 * has a normalizer function that:
 * 1. Takes step-specific raw data
 * 2. Validates against the canonical schema
 * 3. Returns normalized object for progressionSession.commitSelection()
 *
 * This allows steps to gradually transition from ad-hoc payloads to normalized schemas
 * without a massive rewrite.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Normalize species selection.
 *
 * Input: Raw species step commit data (legacy or new)
 * Output: Canonical species object: {id, name, grants, metadata}
 *
 * @param {Object} raw - Raw commit data from species-step
 * @returns {Object|null} Normalized species, or null if invalid
 */

export function normalizeSpecies(raw) {
  if (!raw) return null;

  try {
    const id = raw.speciesId || raw.id;
    const name = raw.speciesName || raw.name;
    const data = raw.speciesData || raw;

    if (!id || !name) {
      swseLogger.warn('[StepNormalizers] Invalid species data, missing id or name:', raw);
      return null;
    }

    return {
      id,
      name,
      abilityScores: raw.abilityScores || data.abilityScores || data.abilityMods || {},
      speciesData: data,
      grants: data.grants || {},
      nearHumanData: raw.nearHumanData || null,
      patch: raw.patch || null,
      // PHASE 2: Canonical pending context from ledger
      pendingContext: raw.pendingContext || null,
      metadata: {
        source: data.source || 'core',
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing species:', err);
    return null;
  }
}


/**
 * Normalize class selection.
 *
 * Input: Raw class step commit data
 * Output: Canonical class object: {id, sourceId, name, grants, metadata}
 *
 * PHASE 3: Preserve sourceId for downstream re-resolution from ClassesRegistry
 *
 * @param {Object} raw - Raw commit data from class-step
 * @returns {Object|null} Normalized class, or null if invalid
 */
export function normalizeClass(raw) {
  if (!raw) return null;

  try {
    const id = raw.classId || raw.id || raw.label;
    const sourceId = raw.sourceId || raw._id || id;  // Preserve original Foundry document ID
    const name = raw.className || raw.name || raw.label;

    if (!id) {
      swseLogger.warn('[StepNormalizers] Invalid class data, missing id:', raw);
      return null;
    }

    return {
      id,
      sourceId,  // PHASE 3: Added for canonical re-resolution
      name: name || id,
      grants: {
        hp: raw.hp || null,
        trainedSkills: raw.trainedSkills || 0,
        proficiencies: raw.proficiencies || [],
        startingFeats: raw.startingFeats || [],
        talentAccess: raw.talentAccess || [],
      },
      system: raw.system || {},
      metadata: {
        source: 'core',
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing class:', err);
    return null;
  }
}

/**
 * Normalize background selection.
 *
 * Input: Raw background step commit data
 * Output: Canonical background object: {id, name, grants, metadata}
 *
 * @param {Object} raw - Raw commit data from background-step
 * @returns {Object|null} Normalized background, or null if invalid
 */
export function normalizeBackground(raw) {
  if (!raw) return null;

  try {
    const id = raw.backgroundId || raw.id || raw.label;
    const name = raw.backgroundName || raw.name || raw.label;

    if (!id) {
      swseLogger.warn('[StepNormalizers] Invalid background data, missing id:', raw);
      return null;
    }

    return {
      id,
      name: name || id,
      category: raw.category || 'unknown', // 'occupation', 'planet', 'event'
      grants: {
        skills: raw.skills || [],
        feats: raw.feats || [],
        languages: raw.languages || [],
        traits: raw.traits || [],
      },
      backgroundIds: Array.isArray(raw.backgroundIds) ? [...raw.backgroundIds] : [id],
      backgrounds: Array.isArray(raw.backgrounds) ? [...raw.backgrounds] : [],
      ledger: raw.ledger || null,
      pendingContext: raw.pendingContext || null,
      metadata: {
        source: raw.source || 'core',
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing background:', err);
    return null;
  }
}

/**
 * Normalize attribute selection.
 *
 * Input: Raw attribute step data (ability scores)
 * Output: Canonical attributes object: {values, increases, metadata}
 *
 * @param {Object} raw - Raw commit data from attribute-step
 * @returns {Object|null} Normalized attributes, or null if invalid
 */
export function normalizeAttributes(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    // Normalize ability score keys (strength → str, dexterity → dex, etc.)
    const keyMap = {
      strength: 'str',
      dexterity: 'dex',
      constitution: 'con',
      intelligence: 'int',
      wisdom: 'wis',
      charisma: 'cha',
      str: 'str',
      dex: 'dex',
      con: 'con',
      int: 'int',
      wis: 'wis',
      cha: 'cha',
    };

    const values = {};
    for (const [key, value] of Object.entries(raw)) {
      const normalized = keyMap[key.toLowerCase()];
      if (normalized) {
        const numVal = typeof value === 'object' ? value.value : value;
        values[normalized] = Number.isFinite(Number(numVal)) ? Number(numVal) : null;
      }
    }

    return {
      values,
      increases: [], // Placeholder for ability increases during level-up
      metadata: {
        source: 'attribute-step',
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing attributes:', err);
    return null;
  }
}

/**
 * Normalize skills selection.
 *
 * Input: Raw skills step data (trained skill ids)
 * Output: Canonical skills object: {trained, source, metadata}
 *
 * @param {Array|Object} raw - Raw commit data from skills-step
 * @returns {Object|null} Normalized skills, or null if invalid
 */
export function normalizeSkills(raw) {
  if (!raw) return null;

  try {
    let trainedList = [];
    const addSkillRef = (value, fallbackKey = null) => {
      if (!value && !fallbackKey) return;
      if (typeof value === 'string') {
        trainedList.push(value);
        return;
      }
      if (value && typeof value === 'object') {
        trainedList.push(value.key || value.id || value.skill || value.name || fallbackKey);
        return;
      }
      if (fallbackKey) trainedList.push(fallbackKey);
    };

    const addExplicitMap = (map) => {
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      for (const [key, value] of Object.entries(map)) {
        if (value === true) {
          trainedList.push(key);
        } else if (value && typeof value === 'object' && value.trained === true) {
          addSkillRef(value, key);
        }
      }
    };

    if (Array.isArray(raw)) {
      raw.forEach(addSkillRef);
    } else if (typeof raw === 'object') {
      if (Array.isArray(raw.trained)) {
        raw.trained.forEach(addSkillRef);
      } else if (Array.isArray(raw.selected)) {
        raw.selected.forEach(addSkillRef);
      } else if (Array.isArray(raw.skills)) {
        raw.skills.forEach(addSkillRef);
      } else if (raw.trainedSkills && typeof raw.trainedSkills === 'object') {
        addExplicitMap(raw.trainedSkills);
      } else if (raw.trained && typeof raw.trained === 'object') {
        addExplicitMap(raw.trained);
      } else if (raw.selected && typeof raw.selected === 'object') {
        addExplicitMap(raw.selected);
      } else {
        // Last-resort legacy format. Only explicit boolean/flagged trained
        // values count; class-skill eligibility or display-only maps must not
        // become trained selections.
        addExplicitMap(raw);
      }
    }

    trainedList = Array.from(new Set(trainedList.filter(Boolean)));

    return {
      trained: trainedList,
      source: 'skills-step',
      metadata: {
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing skills:', err);
    return null;
  }
}

/**
 * Normalize feats selection.
 *
 * Input: Array of feat ids or feat objects
 * Output: Canonical feats array: [{id, source}, ...]
 *
 * @param {Array} raw - Array of feat ids or objects
 * @returns {Array|null} Normalized feats array, or null if invalid
 */
export function normalizeFeats(raw) {
  if (!Array.isArray(raw)) return null;

  try {
    return raw.map(feat => {
      if (typeof feat === 'string') {
        return { id: feat, source: 'general' };
      }
      if (typeof feat === 'object' && feat.id) {
        return {
          id: feat.id,
          source: feat.source || feat.slotType || 'general',
        };
      }
      return null;
    }).filter(Boolean);
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing feats:', err);
    return null;
  }
}

/**
 * Normalize talents selection.
 *
 * Input: Array of talent ids or talent objects
 * Output: Canonical talents array: [{id, treeId, source}, ...]
 *
 * @param {Array} raw - Array of talent ids or objects
 * @returns {Array|null} Normalized talents array, or null if invalid
 */
export function normalizeTalents(raw) {
  if (!Array.isArray(raw)) return null;

  try {
    return raw.map(talent => {
      if (typeof talent === 'string') {
        return { id: talent, treeId: null, source: 'general' };
      }
      if (typeof talent === 'object' && talent.id) {
        return {
          id: talent.id,
          treeId: talent.treeId || talent.tree || null,
          source: talent.source || talent.slotType || 'general',
        };
      }
      return null;
    }).filter(Boolean);
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing talents:', err);
    return null;
  }
}

/**
 * Normalize languages selection.
 *
 * Input: Array of language ids or language objects
 * Output: Canonical languages array: [{id, source}, ...]
 *
 * @param {Array} raw - Array of language ids or objects
 * @returns {Array|null} Normalized languages array, or null if invalid
 */
export function normalizeLanguages(raw) {
  if (!Array.isArray(raw)) return null;

  try {
    return raw.map(lang => {
      if (typeof lang === 'string') {
        return { id: lang, source: 'unknown' };
      }
      if (typeof lang === 'object' && lang.id) {
        return {
          id: lang.id,
          source: lang.source || 'unknown',
        };
      }
      return null;
    }).filter(Boolean);
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing languages:', err);
    return null;
  }
}

/**
 * Normalize survey/archetype data.
 *
 * Input: Raw survey step data
 * Output: Canonical survey object: {archetypeSignals, mentorSignals, preferences}
 *
 * @param {Object} raw - Raw survey data
 * @returns {Object|null} Normalized survey, or null if invalid
 */
export function normalizeSurvey(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    return {
      archetypeSignals: raw.archetypeSignals || [],
      mentorSignals: raw.mentorSignals || [],
      preferences: raw.preferences || {},
      skipped: raw.skipped || false,
      metadata: {
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing survey:', err);
    return null;
  }
}

/**
 * Normalize droid builder data.
 *
 * Input: Raw droid builder data
 * Output: Canonical droid object: {frame, systems, locomotion, creditsUsed, metadata}
 *
 * @param {Object} raw - Raw droid builder data
 * @returns {Object|null} Normalized droid, or null if invalid
 */
export function normalizeDroid(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    return {
      frame: raw.frame || null,
      systems: raw.systems || [],
      locomotion: raw.locomotion || null,
      creditsUsed: Number.isFinite(Number(raw.creditsUsed))
        ? Number(raw.creditsUsed)
        : 0,
      droidCredits: raw.droidCredits || {},
      buildState: raw.buildState || {},
      metadata: {
        createdAt: Date.now(),
      },
    };
  } catch (err) {
    swseLogger.error('[StepNormalizers] Error normalizing droid:', err);
    return null;
  }
}
