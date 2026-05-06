/**
 * Holonet Emission Service
 *
 * Centralizes common emitter behavior so Store, Approvals, Progression, Mentor/System,
 * and future emitters do not each reinvent:
 *   - preference checks
 *   - in-memory dedupe
 *   - record creation via callback
 *   - audience / recipient normalization
 *   - metadata merging
 *   - publish call + error handling
 *
 * Usage:
 *
 *   const result = await HolonetEmissionService.emit({
 *     sourceFamily:  SOURCE_FAMILY.STORE,
 *     categoryId:    HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS,
 *     dedupeKey:    `trans-${transaction.id}-ok`,
 *     createRecord: () => StoreSource.createTransactionNotification({ ... }),
 *     metadata:     { transactionId: transaction.id }
 *   });
 *
 *   if (result.ok)      console.log('emitted', result.record.id);
 *   else if (result.skipped) { ... }   // preference or dedupe
 *   else               console.error('failed:', result.reason);
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetPreferences } from '../holonet-preferences.js';

export class HolonetEmissionService {
  /** In-memory dedupe cache: dedupeKey → timestamp of last successful emit */
  static #dedupeCache = new Map();
  static #lastCleanup = Date.now();
  static #CLEANUP_INTERVAL_MS = 60_000;
  static #MAX_CACHE_AGE_MS = 300_000; // 5 minutes

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Emit a Holonet record through the standard preference → dedupe → publish pipeline.
   *
   * @param {Object}   opts
   * @param {string}   [opts.sourceFamily]           SOURCE_FAMILY key (used for logging)
   * @param {string}   [opts.categoryId]             HolonetPreferences.CATEGORIES key for preference check
   * @param {string}   [opts.intent]                 Intent hint (unused here but kept for future extension)
   * @param {Object}   [opts.audience]               Overrides record.audience if record lacks one
   * @param {Object[]} [opts.recipients]             Overrides record.recipients if record lacks them
   * @param {string}   [opts.dedupeKey]              String key for in-memory deduplication
   * @param {number}   [opts.dedupeWindowMs=30000]   Dedupe window in ms
   * @param {Function} [opts.createRecord]           Callback returning a HolonetRecord (preferred)
   * @param {Object}   [opts.record]                 Pre-built HolonetRecord (alternative to createRecord)
   * @param {Object}   [opts.metadata]               Extra metadata merged into record.metadata
   * @param {boolean}  [opts.skipPreferenceCheck]    Skip HolonetPreferences check
   * @param {boolean}  [opts.skipDedupe]             Skip in-memory dedupe check
   * @param {Object}   [opts.publishOptions]         Options forwarded to HolonetEngine.publish
   *
   * @returns {Promise<{ok: boolean, record: HolonetRecord|null, skipped?: boolean, reason?: string}>}
   */
  static async emit({
    sourceFamily,
    categoryId,
    intent,
    audience,
    recipients,
    dedupeKey,
    dedupeWindowMs = 30_000,
    createRecord,
    record,
    metadata,
    skipPreferenceCheck = false,
    skipDedupe = false,
    publishOptions = {}
  } = {}) {
    // 1. Preference check
    if (!skipPreferenceCheck && categoryId) {
      if (!this.shouldEmit({ categoryId })) {
        return { ok: false, record: null, skipped: true, reason: 'preference_disabled' };
      }
    }

    // 2. In-memory dedupe check
    if (!skipDedupe && dedupeKey) {
      if (this.#isRecentDuplicate(dedupeKey, dedupeWindowMs)) {
        return { ok: false, record: null, skipped: true, reason: 'duplicate' };
      }
    }

    // 3. Build or accept record
    let targetRecord = record ?? null;
    if (!targetRecord && typeof createRecord === 'function') {
      try {
        targetRecord = createRecord();
      } catch (err) {
        console.error('[HolonetEmissionService] createRecord() threw:', err);
        return { ok: false, record: null, reason: 'create_failed' };
      }
    }

    if (!targetRecord) {
      console.warn('[HolonetEmissionService] No record provided and createRecord not supplied');
      return { ok: false, record: null, reason: 'no_record' };
    }

    // 4. Apply audience/recipients if record does not already have them
    if (audience && !targetRecord.audience) {
      targetRecord.audience = audience;
    }
    if (Array.isArray(recipients) && !targetRecord.recipients?.length) {
      targetRecord.recipients = recipients;
    }

    // 5. Merge extra metadata
    if (metadata && typeof metadata === 'object') {
      targetRecord.metadata = { ...(targetRecord.metadata ?? {}), ...metadata };
    }

    // 6. Publish
    try {
      const ok = await HolonetEngine.publish(targetRecord, publishOptions);
      if (!ok) {
        return { ok: false, record: targetRecord, reason: 'publish_failed' };
      }
      // Record dedupe timestamp only on success
      if (dedupeKey) this.#recordDedupeKey(dedupeKey);
      return { ok: true, record: targetRecord };
    } catch (err) {
      console.error(`[HolonetEmissionService] publish error (${sourceFamily ?? 'unknown'}):`, err);
      return { ok: false, record: targetRecord, reason: 'publish_error' };
    }
  }

  /**
   * Check whether an emission is allowed by HolonetPreferences.
   *
   * @param {Object} opts
   * @param {string} [opts.categoryId]
   * @returns {boolean}
   */
  static shouldEmit({ categoryId } = {}) {
    if (!categoryId) return true;
    return HolonetPreferences.shouldEmit(categoryId);
  }

  /**
   * Build merged metadata. Simple helper for emitters that need to combine base + extra.
   *
   * @param {Object} base
   * @param {Object} extra
   * @returns {Object}
   */
  static buildMetadata(base = {}, extra = {}) {
    return { ...base, ...extra };
  }

  // ─── Internal dedupe helpers ────────────────────────────────────────────────

  /** @private */
  static #isRecentDuplicate(dedupeKey, windowMs) {
    this.#maybePruneCache();
    const ts = this.#dedupeCache.get(dedupeKey);
    return Boolean(ts && (Date.now() - ts) < windowMs);
  }

  /** @private */
  static #recordDedupeKey(dedupeKey) {
    this.#dedupeCache.set(dedupeKey, Date.now());
    this.#maybePruneCache();
  }

  /** @private — prune stale entries periodically to prevent unbounded growth */
  static #maybePruneCache() {
    const now = Date.now();
    if (now - this.#lastCleanup < this.#CLEANUP_INTERVAL_MS) return;
    this.#lastCleanup = now;
    for (const [key, ts] of this.#dedupeCache) {
      if (now - ts > this.#MAX_CACHE_AGE_MS) this.#dedupeCache.delete(key);
    }
  }
}
