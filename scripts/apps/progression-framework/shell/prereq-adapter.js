/**
 * PrereqAdapter — Phase 3
 *
 * Converts projected character state into a mock actor context that
 * PrerequisiteChecker can use for legality evaluation.
 *
 * This allows legality checks to see the draft selections instead of just
 * the immutable actor snapshot.
 *
 * Usage:
 *   const mockActor = PrereqAdapter.buildEvaluationContext(
 *     projection,
 *     progressionSession,
 *     actorSnapshot
 *   );
 *   const assessment = AbilityEngine.evaluateAcquisition(mockActor, candidateFeat);
 *
 * The mock actor is a shallow copy of the snapshot with projected selections
 * reflected in actor.items and actor.system.
 */

import { swseLogger } from '../../../utils/logger.js';

export class PrereqAdapter {
  /**
   * Build a mock actor context for prerequisite evaluation.
   *
   * @param {Object} projection - Projected character from ProjectionEngine
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Actor} actorSnapshot - Immutable actor from start of progression
   * @returns {Object} Mock actor object safe for PrerequisiteChecker
   */
  static buildEvaluationContext(projection, progressionSession, actorSnapshot) {
    try {
      // Start with a shallow copy of the snapshot to preserve its baseline
      const mockActor = this._cloneActorForEvaluation(actorSnapshot);

      // Apply projected selections to the mock
      this._applyProjectedIdentity(mockActor, projection);
      this._applyProjectedAttributes(mockActor, projection);
      this._applyProjectedAbilities(mockActor, projection);
      this._applyProjectedSkills(mockActor, projection);

      swseLogger.debug('[PrereqAdapter] Evaluation context built:', {
        level: mockActor.system?.level,
        featsCount: mockActor.items?.filter(i => i.type === 'feat').length || 0,
        talentsCount: mockActor.items?.filter(i => i.type === 'talent').length || 0,
      });

      return mockActor;
    } catch (err) {
      swseLogger.error('[PrereqAdapter] Error building evaluation context:', err);
      // Return snapshot as fallback (safe degradation)
      return actorSnapshot;
    }
  }

  /**
   * Create a shallow copy of actor suitable for evaluation.
   * @private
   */
  static _cloneActorForEvaluation(actor) {
    if (!actor) {
      return { items: [], system: {} };
    }

    const rawItems = actor.items?.contents || actor.items || [];
    const items = Array.isArray(rawItems) ? [...rawItems] : Array.from(rawItems || []);

    // Shallow copy the actor and its system. Preserve Foundry collection-backed
    // embedded items; otherwise BAB/class prerequisite checks see an empty item
    // list and report +0 for valid level-up actors.
    const mockActor = {
      id: actor.id || null,
      name: actor.name || 'Draft Character',
      type: actor.type || 'character',
      system: {
        ...(actor.system || {}),
        // These may be overwritten by projected state
        level: actor.system?.level || 1,
        bab: actor.system?.bab || 0,
        skills: { ...(actor.system?.skills || {}) },
        progression: {
          ...(actor.system?.progression || {}),
          trainedSkills: [],
          feats: [],
          talents: [],
        },
      },
      items,
    };

    return mockActor;
  }

  /**
   * Apply projected identity (species, class, background) to mock actor.
   * @private
   */
  static _applyProjectedIdentity(mockActor, projection) {
    if (!projection?.identity) return;

    // Update actor name to reflect class selection if chargen
    if (projection.identity.class) {
      const className = this._extractName(projection.identity.class);
      // Don't overwrite name; just track it in system
      mockActor.system.projectedClass = className;
    }
  }

  /**
   * Apply projected attributes (level, BAB) to mock actor.
   * @private
   */
  static _applyProjectedAttributes(mockActor, projection) {
    if (!projection) return;

    const projectedLevel = Number(projection?.derived?.level ?? projection?.level);
    if (Number.isFinite(projectedLevel) && projectedLevel > 0) {
      mockActor.system.level = Math.max(Number(mockActor.system.level || 1), projectedLevel);
    }

    const projectedBab = this._coerceNumber(projection?.derived?.bab ?? projection?.derived?.baseAttackBonus ?? projection?.bab);
    if (projectedBab !== null) {
      const currentBab = this._coerceNumber(mockActor.system?.bab?.total ?? mockActor.system?.bab) ?? 0;
      mockActor.system.bab = Math.max(currentBab, projectedBab);
    }

    if (projection?.attributes) {
      // Projected attributes (str, dex, con, etc.) affect ability prerequisites.
      mockActor.system.projectedAttributes = { ...projection.attributes };
    }
  }

  static _coerceNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9+\-.]/g, '');
      if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.') return null;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    }
    return null;
  }

  /**
   * Apply projected abilities (feats, talents, force powers) to mock actor.
   * @private
   */
  static _applyProjectedAbilities(mockActor, projection) {
    if (!projection?.abilities) return;

    // Get current items of each type
    const currentFeats = mockActor.items?.filter(i => i.type === 'feat') || [];
    const currentTalents = mockActor.items?.filter(i => i.type === 'talent') || [];
    const currentPowers = mockActor.items?.filter(i => i.type === 'power') || [];

    // Convert projected feats to item-like objects and append
    if (projection.abilities.feats && Array.isArray(projection.abilities.feats)) {
      const projectedFeatItems = projection.abilities.feats
        .filter(f => !currentFeats.some(cf => cf.name === f.name || cf.id === f.id))
        .map(f => this._normalizeAbilityToItem('feat', f));
      mockActor.items.push(...projectedFeatItems);
    }

    // Convert projected talents to item-like objects and append
    if (projection.abilities.talents && Array.isArray(projection.abilities.talents)) {
      const projectedTalentItems = projection.abilities.talents
        .filter(t => !currentTalents.some(ct => ct.name === t.name || ct.id === t.id))
        .map(t => this._normalizeAbilityToItem('talent', t));
      mockActor.items.push(...projectedTalentItems);
    }

    // Convert projected force powers to item-like objects and append
    if (projection.abilities.forcePowers && Array.isArray(projection.abilities.forcePowers)) {
      const projectedPowerItems = projection.abilities.forcePowers
        .filter(p => !currentPowers.some(cp => cp.name === p.name || cp.id === p.id))
        .map(p => this._normalizeAbilityToItem('power', p));
      mockActor.items.push(...projectedPowerItems);
    }

    // Also add to progression arrays for pending legality checks
    if (projection.abilities.feats) {
      mockActor.system.progression.feats = projection.abilities.feats
        .map(f => f.name || f.id || f)
        .filter(f => typeof f === 'string');
    }

    if (projection.abilities.talents) {
      mockActor.system.progression.talents = projection.abilities.talents
        .map(t => t.name || t.id || t)
        .filter(t => typeof t === 'string');
    }
  }

  /**
   * Apply projected skills to mock actor.
   * @private
   */
  static _applyProjectedSkills(mockActor, projection) {
    if (!projection?.skills) return;

    // Add trained skills from projection to the progression.trainedSkills array
    const trained = projection.skills.trained || [];
    if (Array.isArray(trained)) {
      mockActor.system.progression.trainedSkills = trained
        .map(s => s.name || s.id || s)
        .filter(s => typeof s === 'string');
    }

    // Also add to actor.system.skills as trained for compatibility
    // (some prereq checks read from actor.system.skills)
    if (mockActor.system.skills && typeof mockActor.system.skills === 'object') {
      for (const skillKey of trained) {
        if (typeof skillKey === 'string') {
          // Normalize skill key to format used in actor.system.skills
          const normalizedKey = skillKey.toLowerCase().replace(/\s+/g, '');
          mockActor.system.skills[normalizedKey] = mockActor.system.skills[normalizedKey] || {};
          mockActor.system.skills[normalizedKey].trained = true;
        }
      }
    }
  }


  /**
   * Build an actor-shaped context for reconciliation recovery steps.
   *
   * Recovery steps resolve historical progression debt. A level 3 feat slot
   * must not evaluate prerequisites using a level 6 actor snapshot. This helper
   * caps the actor to the recovery level and exposes only prior/equal acquired
   * choices plus earlier draft selections. It intentionally remains plain-data
   * shaped so prerequisite evaluators cannot receive live App/Document graphs.
   */
  static buildHistoricalEvaluationContext(actorSnapshot, recoveryContext = {}, options = {}) {
    const targetLevel = this._coercePositiveInt(
      recoveryContext?.characterLevel
      ?? recoveryContext?.sourceCharacterLevel
      ?? recoveryContext?.level
      ?? actorSnapshot?.system?.level
      ?? actorSnapshot?.system?.details?.level
      ?? 1,
      1
    );
    const targetClassId = this._normalizeKey(recoveryContext?.classId || recoveryContext?.sourceClassId || '');
    const targetClassLevel = this._coercePositiveInt(
      recoveryContext?.classLevel
      ?? recoveryContext?.sourceClassLevel
      ?? 0,
      0
    );

    const mockActor = this._cloneActorForEvaluation(actorSnapshot);
    mockActor.flags = this._plainClone(actorSnapshot?.flags || {});
    mockActor.system = this._plainClone(mockActor.system || {});
    mockActor.system.level = targetLevel;
    mockActor.system.details = {
      ...(mockActor.system.details || {}),
      level: targetLevel,
    };
    mockActor.system.progression = {
      ...(mockActor.system.progression || {}),
      historicalEvaluation: true,
      recoveryContext: this._plainClone(recoveryContext || {}),
    };

    mockActor.items = this._filterItemsForHistoricalLevel(mockActor.items || [], targetLevel);
    mockActor.items = this._appendHistoricalDraftItems(mockActor.items, options?.draftSelections, targetLevel);

    mockActor.system.progression.feats = mockActor.items
      .filter(item => item?.type === 'feat')
      .map(item => item?.name || item?.id || item?._id)
      .filter(Boolean);
    mockActor.system.progression.talents = mockActor.items
      .filter(item => item?.type === 'talent')
      .map(item => item?.name || item?.id || item?._id)
      .filter(Boolean);

    mockActor.system.progression.classLevels = this._capClassLevels(
      mockActor.system.progression.classLevels || mockActor.system.classLevels || mockActor.system.classes,
      { targetClassId, targetClassLevel, targetLevel }
    );
    mockActor.system.classes = this._capClassLevels(
      mockActor.system.classes,
      { targetClassId, targetClassLevel, targetLevel }
    );

    const expectedBab = this._estimateHistoricalBab(actorSnapshot, recoveryContext, targetLevel);
    if (expectedBab !== null) {
      mockActor.system.bab = expectedBab;
      mockActor.system.baseAttackBonus = expectedBab;
      mockActor.system.attack = {
        ...(mockActor.system.attack || {}),
        bab: expectedBab,
        baseAttackBonus: expectedBab,
      };
    }

    swseLogger.debug('[PrereqAdapter] Historical evaluation context built', {
      actorId: actorSnapshot?.id || null,
      targetLevel,
      classId: recoveryContext?.classId || null,
      classLevel: recoveryContext?.classLevel || null,
      feats: mockActor.system.progression.feats.length,
      talents: mockActor.system.progression.talents.length,
      bab: mockActor.system.bab,
    });

    return mockActor;
  }

  static _filterItemsForHistoricalLevel(items = [], targetLevel = 1) {
    return (Array.isArray(items) ? items : Array.from(items || []))
      .filter(item => this._itemIsKnownByHistoricalLevel(item, targetLevel))
      .map(item => this._plainItemForEvaluation(item));
  }

  static _itemIsKnownByHistoricalLevel(item, targetLevel = 1) {
    if (!item) return false;
    const progression = item.flags?.swse?.progression || item.system?.progression || {};
    const acquisition = item.system?.acquisition || item.flags?.swse?.acquisition || {};
    const level = this._coercePositiveInt(
      progression.characterLevel
      ?? progression.sourceCharacterLevel
      ?? acquisition.characterLevel
      ?? acquisition.sourceCharacterLevel
      ?? item.system?.characterLevel
      ?? item.system?.sourceCharacterLevel
      ?? 0,
      0
    );
    // Legacy/manual actor items often predate the reconciliation ledger and do
    // not have provenance. Keep them visible as baseline knowledge rather than
    // hiding valid prerequisite chains from old actors.
    if (level <= 0) return true;
    return level <= targetLevel;
  }

  static _plainItemForEvaluation(item) {
    if (!item) return null;
    const plain = item.toObject?.() || item.toJSON?.() || item;
    return {
      id: plain.id || plain._id || item.id || item._id || null,
      _id: plain._id || plain.id || item._id || item.id || null,
      name: plain.name || item.name || 'Unnamed',
      type: plain.type || item.type || 'unknown',
      img: plain.img || item.img || null,
      system: this._plainClone(plain.system || item.system || {}),
      flags: this._plainClone(plain.flags || item.flags || {}),
    };
  }

  static _appendHistoricalDraftItems(items = [], draftSelections = {}, targetLevel = 1) {
    const out = [...(items || [])];
    const add = (type, entry) => {
      if (!entry) return;
      const level = this._coercePositiveInt(entry.characterLevel ?? entry.sourceCharacterLevel ?? entry.level ?? 0, 0);
      if (level > 0 && level > targetLevel) return;
      const id = entry.id || entry._id || entry.name;
      const name = entry.name || entry.label || id;
      if (!name) return;
      const exists = out.some(item => item?.type === type && (
        String(item?.id || item?._id || '') === String(id || '')
        || String(item?.name || '').toLowerCase() === String(name || '').toLowerCase()
      ));
      if (exists) return;
      out.push(this._normalizeAbilityToItem(type, entry));
    };
    for (const feat of Array.isArray(draftSelections?.feats) ? draftSelections.feats : []) add('feat', feat);
    for (const talent of Array.isArray(draftSelections?.talents) ? draftSelections.talents : []) add('talent', talent);
    for (const power of Array.isArray(draftSelections?.forcePowers) ? draftSelections.forcePowers : []) add('force-power', power);
    return out;
  }

  static _capClassLevels(value, { targetClassId = '', targetClassLevel = 0, targetLevel = 1 } = {}) {
    if (!value) return value;
    const capLevel = (entry, key = '') => {
      if (!entry || typeof entry !== 'object') return entry;
      const classKey = this._normalizeKey(entry.classId || entry.id || entry.key || entry.name || key);
      const level = this._coercePositiveInt(entry.level ?? entry.classLevel ?? entry.value ?? 0, 0);
      let capped = Math.min(level || targetLevel, targetLevel);
      if (targetClassId && classKey === targetClassId && targetClassLevel > 0) capped = Math.min(capped, targetClassLevel);
      return {
        ...entry,
        level: capped,
        classLevel: capped,
      };
    };
    if (Array.isArray(value)) return value.map((entry, index) => capLevel(entry, String(index)));
    if (typeof value === 'object') {
      const out = {};
      for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'number') {
          const keyNorm = this._normalizeKey(key);
          let capped = Math.min(entry, targetLevel);
          if (targetClassId && keyNorm === targetClassId && targetClassLevel > 0) capped = Math.min(capped, targetClassLevel);
          out[key] = capped;
        } else {
          out[key] = capLevel(entry, key);
        }
      }
      return out;
    }
    return value;
  }

  static _estimateHistoricalBab(actorSnapshot, recoveryContext = {}, targetLevel = 1) {
    const explicit = this._coerceNumber(
      recoveryContext?.bab
      ?? recoveryContext?.baseAttackBonus
      ?? recoveryContext?.expectedBab
      ?? null
    );
    if (explicit !== null) return explicit;

    const current = this._coerceNumber(
      actorSnapshot?.system?.bab?.total
      ?? actorSnapshot?.system?.bab
      ?? actorSnapshot?.system?.baseAttackBonus
      ?? actorSnapshot?.system?.attack?.bab
      ?? actorSnapshot?.system?.attack?.baseAttackBonus
      ?? null
    );
    const currentLevel = this._coercePositiveInt(actorSnapshot?.system?.level ?? actorSnapshot?.system?.details?.level ?? 0, 0);
    if (current !== null && currentLevel > 0 && targetLevel > 0) {
      return Math.max(0, Math.floor((current / Math.max(1, currentLevel)) * targetLevel));
    }
    return null;
  }

  static _coercePositiveInt(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
  }

  static _plainClone(value) {
    if (value === null || value === undefined) return value;
    try {
      return globalThis.foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value));
    } catch (_err) {
      try { return JSON.parse(JSON.stringify(value)); } catch (_err2) { return {}; }
    }
  }

  static _normalizeKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Convert a projected ability (from projection) to an item-like object.
   * @private
   */
  static _normalizeAbilityToItem(type, ability) {
    return {
      type,
      id: ability.id || ability.name || 'unknown',
      name: ability.name || ability.id || 'Unknown',
      system: {
        slug: this._slugify(ability.name || ability.id),
        ...((typeof ability === 'object' && ability.system) ? ability.system : {}),
      },
    };
  }

  /**
   * Extract name from identity object (which can be {id, name} or just string).
   * @private
   */
  static _extractName(identity) {
    if (!identity) return null;
    if (typeof identity === 'string') return identity;
    if (typeof identity === 'object') return identity.name || identity.id || null;
    return null;
  }

  /**
   * Convert a string to slug format.
   * @private
   */
  static _slugify(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
}
