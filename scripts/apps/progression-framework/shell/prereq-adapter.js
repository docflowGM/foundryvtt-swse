/**
 * PrereqAdapter — 3N-PRG D2
 *
 * Builds the plain-data actor context that recovery/reconciliation steps hand to PrerequisiteChecker for a HISTORICAL character level.
 * Contract (docs/architecture/v2-contracts/PRG-mannequin-preparation.md):
 *  - Class levels at the evaluation level are RECONSTRUCTED from the finalizer's own ledger (`system.progression.classLevelHistory`) and the actor's
 *    current class items; nothing is estimated. When the history cannot be reconstructed the context says so (`historicalBab.resolved === false`).
 *  - Historical BAB comes from the canonical BABCalculator over those class levels (async seam: `buildHistoricalEvaluationContext`).
 *  - Items acquired AFTER the evaluation level, or with no acquisition provenance while the evaluation level is below the actor's current level, are
 *    never credited (they are listed in `historicalUnresolvedItems`); canonical identity (never the display name) decides duplicates.
 *  - A failed build never falls back to the live actor: the context carries `historicalContextError`, which the checker turns into an explicit
 *    "could not be evaluated" result.
 * The previous projected-context builder (`buildEvaluationContext`, no callers) was retired with its name/Math.max-based merging.
 */

import { swseLogger } from '../../../utils/logger.js';
import { ensureDerivedState } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js';
import { sourceIdentityOf } from '/systems/foundryvtt-swse/scripts/data/talent-source-identity.js';
import { canonicalFeatUuidOf } from '/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/canonical-prerequisite-index.js';

export class PrereqAdapter {
  /**
   * Class levels the actor had at `targetLevel`, reconstructed (never estimated).
   * Sources: the actor's CURRENT class items plus `system.progression.classLevelHistory` (one entry per level-up, characterLevel >= 2, written by the
   * finalizer). The level-1 class is whichever class holds exactly one level more than the ledger attributes to it. Anything inconsistent or incomplete
   * returns `{ resolved:false, reason }`.
   * @returns {{resolved:boolean, levels:{class:string, classId:string, level:number}[], reason?:string}}
   */
  static reconstructClassLevelsAt(actorSnapshot, targetLevel) {
    const rawItems = actorSnapshot?.items?.contents || actorSnapshot?.items || [];
    const classItems = (Array.isArray(rawItems) ? rawItems : Array.from(rawItems || [])).filter((i) => i?.type === 'class');
    const current = classItems
      .map((item) => ({
        class: item.name || item.system?.className || item.system?.classId || '',
        classId: this._normalizeKey(item.system?.classId || item.name || ''),
        level: this._coercePositiveInt(item.system?.level ?? item.system?.levels ?? 0, 0),
      }))
      .filter((c) => c.classId && c.level > 0);
    const currentTotal = current.reduce((sum, c) => sum + c.level, 0);
    if (currentTotal <= 0) return { resolved: false, levels: [], reason: 'the actor has no class levels to reconstruct from' };
    if (targetLevel >= currentTotal) return { resolved: true, levels: current };

    const history = Array.isArray(actorSnapshot?.system?.progression?.classLevelHistory) ? actorSnapshot.system.progression.classLevelHistory : [];
    const byCharLevel = new Map();
    for (const entry of history) {
      const characterLevel = this._coercePositiveInt(entry?.characterLevel, 0);
      const classId = this._normalizeKey(entry?.classId || entry?.className || '');
      if (characterLevel >= 2 && classId) byCharLevel.set(characterLevel, classId);
    }
    for (let level = 2; level <= currentTotal; level += 1) {
      if (!byCharLevel.has(level)) return { resolved: false, levels: [], reason: `no class-level history for character level ${level}` };
    }
    const ledgerCount = new Map();
    for (const classId of byCharLevel.values()) ledgerCount.set(classId, (ledgerCount.get(classId) ?? 0) + 1);
    const byClass = new Map(current.map((c) => [c.classId, c]));
    for (const classId of ledgerCount.keys()) {
      if (!byClass.has(classId)) return { resolved: false, levels: [], reason: `history names a class the actor does not hold (${classId})` };
    }
    const firstClasses = current.filter((c) => c.level - (ledgerCount.get(c.classId) ?? 0) === 1);
    const consistent = current.every((c) => {
      const remainder = c.level - (ledgerCount.get(c.classId) ?? 0);
      return remainder === 0 || remainder === 1;
    });
    if (!consistent || firstClasses.length !== 1) return { resolved: false, levels: [], reason: 'class-level history does not account for the actor\'s class levels' };

    const counts = new Map([[firstClasses[0].classId, 1]]);
    for (const [characterLevel, classId] of byCharLevel) {
      if (characterLevel <= targetLevel) counts.set(classId, (counts.get(classId) ?? 0) + 1);
    }
    return {
      resolved: true,
      levels: current.filter((c) => counts.has(c.classId)).map((c) => ({ class: c.class, classId: c.classId, level: counts.get(c.classId) })),
    };
  }

  /**
   * Plain-data actor context for a historical character level (synchronous, no BAB computation: `historicalBab.resolved` is false with reason
   * "not computed"). Use `buildHistoricalEvaluationContext` when BAB-dependent prerequisites will be evaluated. Never throws and never returns the
   * live actor: a failure is carried as `system.progression.historicalContextError`.
   */
  static buildHistoricalEvaluationBase(actorSnapshot, recoveryContext = {}, options = {}) {
    const targetLevel = this._coercePositiveInt(
      recoveryContext?.characterLevel
      ?? recoveryContext?.sourceCharacterLevel
      ?? recoveryContext?.level
      ?? actorSnapshot?.system?.level
      ?? actorSnapshot?.system?.details?.level
      ?? 1,
      1
    );
    try {
      const mockActor = this._cloneActorForEvaluation(actorSnapshot);
      mockActor.flags = this._plainClone(actorSnapshot?.flags || {});
      mockActor.system = this._plainClone(mockActor.system || {});
      mockActor.system.level = targetLevel;
      mockActor.system.details = { ...(mockActor.system.details || {}), level: targetLevel };
      const currentLevel = this._currentCharacterLevel(actorSnapshot);

      const classes = this.reconstructClassLevelsAt(actorSnapshot, targetLevel);
      const unresolvedItems = [];
      const known = this._filterItemsForHistoricalLevel(mockActor.items || [], targetLevel, currentLevel, unresolvedItems);
      // Class items are rebuilt from the reconstructed levels (a class not yet taken is absent); with no reconstruction there are no class items
      // rather than the CURRENT ones.
      const classTemplate = new Map((mockActor.items || []).filter((i) => i?.type === 'class').map((i) => [this._normalizeKey(i.system?.classId || i.name || ''), i]));
      const rebuiltClasses = classes.resolved
        ? classes.levels.map((c) => {
          const base = this._plainItemForEvaluation(classTemplate.get(c.classId));
          return { ...base, system: { ...(base?.system || {}), level: c.level } };
        })
        : [];
      mockActor.items = [...known.filter((i) => i?.type !== 'class'), ...rebuiltClasses];
      mockActor.items = this._appendHistoricalDraftItems(mockActor.items, options?.draftSelections, targetLevel);

      const classLevelsView = classes.resolved ? classes.levels.map((c) => ({ class: c.class, classId: c.classId, level: c.level, classLevel: c.level })) : [];
      mockActor.system.progression = {
        ...(mockActor.system.progression || {}),
        historicalEvaluation: true,
        recoveryContext: this._plainClone(recoveryContext || {}),
        classLevels: classLevelsView,
        feats: mockActor.items.filter((i) => i?.type === 'feat').map((i) => i?.name || i?.id || i?._id).filter(Boolean),
        talents: mockActor.items.filter((i) => i?.type === 'talent').map((i) => i?.name || i?.id || i?._id).filter(Boolean),
        historicalClassLevels: { resolved: classes.resolved, reason: classes.reason ?? null, levels: classLevelsView },
        historicalBab: { resolved: false, reason: 'not computed (synchronous context)' },
        historicalUnresolvedItems: unresolvedItems,
      };
      mockActor.system.classes = classLevelsView;
      // The live actor's BAB must never leak into a historical evaluation.
      mockActor.system.bab = 0;
      mockActor.system.baseAttackBonus = 0;
      mockActor.system.attack = { ...(mockActor.system.attack || {}), bab: 0, baseAttackBonus: 0 };
      if (mockActor.system.derived) ensureDerivedState(mockActor.system, { ...mockActor.system.derived, bab: 0, baseAttackBonus: 0 });
      if (mockActor.system.combat) mockActor.system.combat = { ...mockActor.system.combat, bab: 0, baseAttackBonus: 0 };
      return mockActor;
    } catch (err) {
      swseLogger.error('[PrereqAdapter] Historical evaluation context failed:', err);
      return {
        id: actorSnapshot?.id || null,
        name: actorSnapshot?.name || 'Draft Character',
        type: actorSnapshot?.type || 'character',
        items: [],
        flags: {},
        system: { level: targetLevel, progression: { historicalEvaluation: true, historicalContextError: err?.message || 'historical context could not be built' } },
      };
    }
  }

  /** Historical context with BAB from the canonical BABCalculator over the reconstructed class levels (UNRESOLVED when history or class data is missing). */
  static async buildHistoricalEvaluationContext(actorSnapshot, recoveryContext = {}, options = {}) {
    const mockActor = this.buildHistoricalEvaluationBase(actorSnapshot, recoveryContext, options);
    const progression = mockActor.system?.progression;
    if (!progression || progression.historicalContextError) return mockActor;
    const classes = progression.historicalClassLevels;
    if (!classes?.resolved) {
      progression.historicalBab = { resolved: false, reason: `class levels cannot be reconstructed: ${classes?.reason || 'unknown'}` };
      return mockActor;
    }
    try {
      const { BABCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/bab-calculator.js');
      const detailed = await BABCalculator.calculateDetailed(classes.levels.map((c) => ({ class: c.class, level: c.level })));
      if (detailed?.provenance?.certified !== true) {
        progression.historicalBab = { resolved: false, reason: 'class progression data for the reconstructed levels is estimated or not yet available', provenance: detailed?.provenance ?? null };
        return mockActor;
      }
      progression.historicalBab = { resolved: true, value: Number(detailed.total) || 0, provenance: detailed.provenance, classLevels: classes.levels };
      mockActor.system.bab = Number(detailed.total) || 0;
    } catch (err) {
      progression.historicalBab = { resolved: false, reason: `BABCalculator could not evaluate the reconstructed levels: ${err?.message || err}` };
    }
    return mockActor;
  }

  static _currentCharacterLevel(actorSnapshot) {
    const rawItems = actorSnapshot?.items?.contents || actorSnapshot?.items || [];
    const fromClasses = (Array.isArray(rawItems) ? rawItems : Array.from(rawItems || []))
      .filter((i) => i?.type === 'class')
      .reduce((sum, i) => sum + this._coercePositiveInt(i.system?.level ?? i.system?.levels ?? 0, 0), 0);
    return fromClasses || this._coercePositiveInt(actorSnapshot?.system?.level ?? actorSnapshot?.system?.details?.level ?? 0, 0);
  }

  static _filterItemsForHistoricalLevel(items = [], targetLevel = 1, currentLevel = 0, unresolvedOut = []) {
    const out = [];
    for (const item of (Array.isArray(items) ? items : Array.from(items || []))) {
      const verdict = this._historicalAcquisitionVerdict(item, targetLevel, currentLevel);
      if (verdict === 'known') out.push(this._plainItemForEvaluation(item));
      else if (verdict === 'unresolved') unresolvedOut.push({ type: item?.type || null, name: item?.name || null, id: item?.id || item?._id || null });
    }
    return out;
  }

  /** 'known' (acquired at/before the level, or evaluating the present), 'later' (acquired after), 'unresolved' (no provenance for an earlier level: not credited). */
  static _historicalAcquisitionVerdict(item, targetLevel = 1, currentLevel = 0) {
    if (!item) return 'later';
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
    if (level > 0) return level <= targetLevel ? 'known' : 'later';
    if (item.type === 'class') return 'known'; // class items are rebuilt from the reconstructed levels
    // No acquisition provenance: it is only safe to credit when evaluating the present state.
    return currentLevel > 0 && targetLevel >= currentLevel ? 'known' : 'unresolved';
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

  /** Plain copy of the actor's system plus its embedded items (Foundry collections included); never a live document. */
  static _cloneActorForEvaluation(actor) {
    if (!actor) return { items: [], system: {} };
    const rawItems = actor.items?.contents || actor.items || [];
    const items = Array.isArray(rawItems) ? [...rawItems] : Array.from(rawItems || []);
    return {
      id: actor.id || null,
      name: actor.name || 'Draft Character',
      type: actor.type || 'character',
      system: { ...(actor.system || {}), skills: { ...(actor.system?.skills || {}) } },
      items,
    };
  }

  /** Canonical source UUID of a feat/talent item or draft entry (null when it carries none; a display name is never an identity). */
  static _canonicalIdentity(type, entry) {
    if (!entry) return null;
    if (type === 'feat') return canonicalFeatUuidOf(entry);
    if (type === 'talent') return sourceIdentityOf(entry)?.uuid ?? null;
    return null;
  }

  static _appendHistoricalDraftItems(items = [], draftSelections = {}, targetLevel = 1) {
    const out = [...(items || [])];
    const add = (type, entry) => {
      if (!entry) return;
      const level = this._coercePositiveInt(entry.characterLevel ?? entry.sourceCharacterLevel ?? entry.level ?? 0, 0);
      if (level > 0 && level > targetLevel) return;
      const id = entry.id || entry._id || null;
      const name = entry.name || entry.label || id;
      if (!name) return;
      const identity = this._canonicalIdentity(type, entry);
      const exists = out.some((item) => {
        if (item?.type !== type) return false;
        const other = this._canonicalIdentity(type, item);
        if (identity && other) return identity === other;           // canonical identity decides
        if (identity || other) return false;                        // one side is canonical, the other is not: never conflate
        return !!id && String(item?.id || item?._id || '') === String(id); // neither is canonical: local id only, never the name
      });
      if (exists) return;
      out.push(this._normalizeAbilityToItem(type, entry));
    };
    for (const feat of Array.isArray(draftSelections?.feats) ? draftSelections.feats : []) add('feat', feat);
    for (const talent of Array.isArray(draftSelections?.talents) ? draftSelections.talents : []) add('talent', talent);
    for (const power of Array.isArray(draftSelections?.forcePowers) ? draftSelections.forcePowers : []) add('force-power', power);
    return out;
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
      // keep the canonical source link so identity (never the display name) survives into the evaluation context
      flags: this._withCanonicalSourceLink(type, ability),
      system: {
        slug: this._slugify(ability.name || ability.id),
        ...((typeof ability === 'object' && ability.system) ? ability.system : {}),
      },
    };
  }

  static _withCanonicalSourceLink(type, ability) {
    const flags = this._plainClone(ability?.flags || {});
    const identity = this._canonicalIdentity(type, ability);
    if (identity) flags.core = { ...(flags.core || {}), sourceId: identity };
    return flags;
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
