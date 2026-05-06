/**
 * Holonet Projection Router
 *
 * Routes records to their target surfaces (Home feed, Bulletin, Messenger, etc.)
 */

import { SURFACE_TYPE } from '../contracts/enums.js';
import { HolonetIntentRegistry } from '../contracts/holonet-intent-registry.js';
import { HolonetProjectionSurface } from '../contracts/holonet-projection-surface.js';

/**
 * Built-in projection rules.
 * Each rule is a function (record) => string[] of additional SURFACE_TYPE values.
 * Returning an empty array means the rule adds nothing for this record.
 */
const BUILTIN_RULES = {
  /** Message records always project to MESSENGER_THREAD */
  'builtin:messenger-thread': (record) => {
    if (record.type === 'message' && record.threadId) {
      return [SURFACE_TYPE.MESSENGER_THREAD];
    }
    return [];
  },
  /** Records with metadata.urgent = true also get a notification bubble */
  'builtin:urgent-bubble': (record) => {
    if (record.metadata?.urgent === true) {
      return [SURFACE_TYPE.NOTIFICATION_BUBBLE];
    }
    return [];
  },
  /** Mentor source-family records include MENTOR_NOTICE */
  'builtin:mentor-notice': (record) => {
    if (record.sourceFamily === 'mentor' || String(record.intent ?? '').startsWith('mentor.')) {
      return [SURFACE_TYPE.MENTOR_NOTICE];
    }
    return [];
  },
  /** Store / approval records aimed at GM include GM_DATAPAD_APPROVALS */
  'builtin:gm-approvals': (record) => {
    if (
      record.sourceFamily === 'approvals' &&
      record.audience?.type === 'gm_only'
    ) {
      return [SURFACE_TYPE.GM_DATAPAD_APPROVALS];
    }
    return [];
  },
  /** Store notices include STORE_NOTICE surface */
  'builtin:store-notice': (record) => {
    if (record.sourceFamily === 'store') {
      return [SURFACE_TYPE.STORE_NOTICE];
    }
    return [];
  }
};

export class HolonetProjectionRouter {
  /** @type {Map<string, Function>} Custom projection rules: key → (record) => string[] */
  static #customRules = new Map();

  /**
   * Register a projection rule.
   * The handler receives the record and returns an array of SURFACE_TYPE strings to add.
   *
   * @param {string}   key      Unique rule key (allows later unregistration)
   * @param {Function} handler  (record: HolonetRecord) => string[]
   */
  static registerRule(key, handler) {
    if (typeof handler !== 'function') return;
    this.#customRules.set(key, handler);
  }

  /**
   * Unregister a previously registered projection rule.
   * @param {string} key
   */
  static unregisterRule(key) {
    this.#customRules.delete(key);
  }

  /**
   * Determine surfaces for a record.
   * Order: intent defaults → built-in rules → custom rules → deduplication.
   *
   * @param {HolonetRecord} record
   * @returns {HolonetProjectionSurface[]}
   */
  static resolveSurfaces(record) {
    const seen = new Set();
    const surfaces = [];

    const addSurface = (surfaceType) => {
      if (!surfaceType || seen.has(surfaceType)) return;
      seen.add(surfaceType);
      surfaces.push(new HolonetProjectionSurface({ surfaceType, recordId: record.id }));
    };

    // 1. Intent-based defaults (now uses getIntentMeta fallback internally)
    const defaultSurfaces = HolonetIntentRegistry.getDefaultSurfaces(record.intent);
    for (const st of defaultSurfaces) addSurface(st);

    // 2. Built-in rules
    for (const handler of Object.values(BUILTIN_RULES)) {
      try {
        const extra = handler(record);
        for (const st of (extra ?? [])) addSurface(st);
      } catch { /* safe skip */ }
    }

    // 3. Custom rules registered at runtime
    for (const handler of this.#customRules.values()) {
      try {
        const extra = handler(record);
        for (const st of (extra ?? [])) addSurface(st);
      } catch { /* safe skip */ }
    }

    // Guarantee at least one surface so no record is silently dropped
    if (surfaces.length === 0) {
      addSurface(SURFACE_TYPE.HOME_FEED);
    }

    return surfaces;
  }

  /**
   * Check if a record should be projected to a specific surface
   */
  static shouldProject(record, surfaceType) {
    const surfaces = this.resolveSurfaces(record);
    return surfaces.some(s => s.surfaceType === surfaceType);
  }

  /**
   * Add a record to a specific surface
   */
  static addToSurface(record, surfaceType) {
    if (!record.projections) {
      record.projections = [];
    }

    const exists = record.projections.some(p => p.surfaceType === surfaceType);
    if (!exists) {
      record.projections.push(new HolonetProjectionSurface({
        surfaceType,
        recordId: record.id
      }));
    }
  }

  /**
   * Remove a record from a specific surface
   */
  static removeFromSurface(record, surfaceType) {
    if (!record.projections) return;
    record.projections = record.projections.filter(p => p.surfaceType !== surfaceType);
  }

  /**
   * Pin/unpin a record on a surface
   */
  static setPinned(record, surfaceType, isPinned) {
    const projection = record.projections?.find(p => p.surfaceType === surfaceType);
    if (projection) {
      projection.isPinned = isPinned;
    }
  }
}
