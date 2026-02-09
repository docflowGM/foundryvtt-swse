/**
 * SnapshotBuilder
 *
 * Constructs a canonical snapshot of rule-relevant character state
 * for suggestion calculation and cache invalidation.
 *
 * The snapshot answers one question:
 * "Given this character state and focus, what suggestions apply?"
 *
 * Key properties:
 * - Flat, boring structure (no nested objects except where necessary)
 * - Deterministic serialization (sorted arrays, stable keys)
 * - Single source of truth for "what affects suggestions?"
 * - Testable in isolation
 * - Never includes UI state, mentor data, or ephemeral fields
 *
 * Snapshot shape:
 * {
 *   charLevel: number,
 *   speciesId: string,
 *   classIds: string[],
 *   attributes: { str, dex, con, int, wis, cha },
 *   trainedSkills: string[],
 *   selectedFeats: string[],
 *   selectedTalents: string[],
 *   selectedPowers: string[],
 *   proficiencies: string[],
 *   focus: string | null,
 *   pending: {
 *     selectedClass: string | null,
 *     selectedFeats: string[],
 *     selectedTalents: string[],
 *     selectedSkills: string[],
 *     selectedPowers: string[]
 *   }
 * }
 */

import { SWSELogger } from '../utils/logger.js';

export class SnapshotBuilder {
  /**
   * Build a canonical snapshot from an actor and focus
   * @param {Actor} actor - Foundry Actor document
   * @param {string|null} focus - Current progression focus (feats, talents, classes, etc.)
   * @param {Object} pendingData - Pending selections during chargen/levelup
   * @returns {Object} Canonical snapshot object
   */
  static build(actor, focus = null, pendingData = null) {
    if (!actor || typeof actor !== 'object') {
      return this._emptySnapshot(focus);
    }

    return {
      // ─ Structural Identity
      charLevel: actor.system?.level ?? 1,
      speciesId: this._extractSpeciesId(actor),
      classIds: this._extractClassIds(actor),

      // ─ Attributes (final values, alphabetically ordered)
      attributes: {
        cha: actor.system?.abilities?.cha?.value ?? 0,
        con: actor.system?.abilities?.con?.value ?? 0,
        dex: actor.system?.abilities?.dex?.value ?? 0,
        int: actor.system?.abilities?.int?.value ?? 0,
        str: actor.system?.abilities?.str?.value ?? 0,
        wis: actor.system?.abilities?.wis?.value ?? 0
      },

      // ─ Trained / Selected Choices (always sorted)
      trainedSkills: this._extractTrainedSkills(actor).sort(),
      selectedFeats: this._extractFeats(actor).sort(),
      selectedTalents: this._extractTalents(actor).sort(),
      selectedPowers: this._extractPowers(actor).sort(),

      // ─ Permanent Flags
      proficiencies: this._extractProficiencies(actor).sort(),

      // ─ Progression Context
      focus: focus ?? null,

      // ─ Pending Selections (in-progress chargen/levelup)
      pending: this._buildPendingSnapshot(pendingData)
    };
  }

  /**
   * Serialize snapshot to deterministic JSON string
   * Keys are sorted alphabetically at each level
   * @param {Object} snapshot - Snapshot object
   * @returns {string} Stable JSON representation
   */
  static serialize(snapshot) {
    return JSON.stringify(snapshot, this._stableKeyOrder);
  }

  /**
   * Compute a hash from a snapshot
   * Uses simple but stable hash function (no crypto needed)
   * @param {Object} snapshot - Snapshot object
   * @returns {string} Hash string (hex)
   */
  static hash(snapshot) {
    const serialized = this.serialize(snapshot);
    return this._hashString(serialized);
  }

  /**
   * Compute hash directly from actor + focus (convenience)
   * @param {Actor} actor
   * @param {string|null} focus
   * @param {Object} pendingData
   * @returns {string} Hash string
   */
  static hashFromActor(actor, focus = null, pendingData = null) {
    const snapshot = this.build(actor, focus, pendingData);
    return this.hash(snapshot);
  }

  /**
   * Compare two snapshots (for debugging)
   * @param {Object} snap1
   * @param {Object} snap2
   * @returns {Object} Diff report
   */
  static diff(snap1, snap2) {
    const diffs = {};

    for (const key of Object.keys(snap1)) {
      const v1 = snap1[key];
      const v2 = snap2[key];

      if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        diffs[key] = { before: v1, after: v2 };
      }
    }

    return diffs;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE: EXTRACTION HELPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Extract species ID from actor
   * @private
   */
  static _extractSpeciesId(actor) {
    const speciesItem = actor.items?.find(i => i.type === 'species');
    return speciesItem?.id ?? null;
  }

  /**
   * Extract class IDs from actor (base + prestige)
   * @private
   */
  static _extractClassIds(actor) {
    return actor.items
      ?.filter(i => i.type === 'class')
      .map(c => c.id) ?? [];
  }

  /**
   * Extract trained skill IDs from actor
   * @private
   */
  static _extractTrainedSkills(actor) {
    const skillsObj = actor.system?.skills ?? {};
    return Object.entries(skillsObj)
      .filter(([_key, skill]) => skill?.trained === true)
      .map(([key, _skill]) => key);
  }

  /**
   * Extract feat IDs from actor
   * @private
   */
  static _extractFeats(actor) {
    return actor.items
      ?.filter(i => i.type === 'feat')
      .map(f => f.id) ?? [];
  }

  /**
   * Extract talent IDs from actor
   * @private
   */
  static _extractTalents(actor) {
    return actor.items
      ?.filter(i => i.type === 'talent')
      .map(t => t.id) ?? [];
  }

  /**
   * Extract force power IDs from actor
   * @private
   */
  static _extractPowers(actor) {
    return actor.items
      ?.filter(i => i.type === 'power' || i.type === 'forcePower')
      .map(p => p.id) ?? [];
  }

  /**
   * Extract proficiency IDs from actor
   * @private
   */
  static _extractProficiencies(actor) {
    const profs = actor.system?.proficiencies ?? [];
    return Array.isArray(profs) ? profs : [];
  }

  /**
   * Build pending selections snapshot
   * @private
   */
  static _buildPendingSnapshot(pendingData) {
    if (!pendingData || typeof pendingData !== 'object') {
      return {
        selectedClass: null,
        selectedFeats: [],
        selectedTalents: [],
        selectedSkills: [],
        selectedPowers: []
      };
    }

    return {
      selectedClass: pendingData.selectedClass?.id ?? null,
      selectedFeats: this._pendingIds(pendingData.selectedFeats).sort(),
      selectedTalents: this._pendingIds(pendingData.selectedTalents).sort(),
      selectedSkills: this._pendingIds(pendingData.selectedSkills).sort(),
      selectedPowers: this._pendingIds(pendingData.selectedPowers).sort()
    };
  }

  /**
   * Extract IDs from pending array (handles mixed object/string formats)
   * @private
   */
  static _pendingIds(items) {
    if (!Array.isArray(items)) {return [];}

    return items
      .map(item => {
        if (!item) {return null;}
        if (typeof item === 'string') {return item;}
        if (typeof item === 'object') {return item.id || item.name || null;}
        return null;
      })
      .filter(Boolean);
  }

  /**
   * Return empty snapshot for null/invalid actor
   * @private
   */
  static _emptySnapshot(focus) {
    return {
      charLevel: 1,
      speciesId: null,
      classIds: [],
      attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      trainedSkills: [],
      selectedFeats: [],
      selectedTalents: [],
      selectedPowers: [],
      proficiencies: [],
      focus: focus ?? null,
      pending: {
        selectedClass: null,
        selectedFeats: [],
        selectedTalents: [],
        selectedSkills: [],
        selectedPowers: []
      }
    };
  }

  /**
   * Replacer function for JSON.stringify to sort keys
   * @private
   */
  static _stableKeyOrder(key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted = {};
      const keys = Object.keys(value).sort();
      for (const k of keys) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  }

  /**
   * Simple stable hash function (FNV-1a style)
   * Not cryptographic, but stable and uniform
   * @private
   */
  static _hashString(str) {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash = hash ^ str.charCodeAt(i);
      hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
    }
    return ('0000000' + hash.toString(16)).slice(-8);
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS FOR CONVENIENCE
// ─────────────────────────────────────────────────────────────

export function buildSuggestionSnapshot(actor, focus = null, pendingData = null) {
  return SnapshotBuilder.build(actor, focus, pendingData);
}

export function hashSuggestionSnapshot(actor, focus = null, pendingData = null) {
  return SnapshotBuilder.hashFromActor(actor, focus, pendingData);
}
