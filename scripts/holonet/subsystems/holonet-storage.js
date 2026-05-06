/**
 * Holonet Storage Service
 *
 * Persistence boundary for Holonet records and threads.
 *
 * Added Phase 3:
 * - Record indexing and caching to avoid repeated full-scan operations
 * - Thread indexing and caching
 * - Archive and cleanup helpers (non-destructive by default)
 * - Batch thread save support
 */

import { hydrateHolonetRecord, hydrateHolonetThread } from '../contracts/record-factory.js';

export class HolonetStorage {
  static NS = 'foundryvtt-swse';
  static FLAG_KEY = 'holonet_records';
  static THREADS_FLAG_KEY = 'holonet_threads';

  // ─── Phase 3: Indexing and caching ─────────────────────────────────────
  static #recordIndex = null;  // Map<recordId, record>
  static #recipientIndex = null;  // Map<recipientId, recordId[]>
  static #intentIndex = null;  // Map<intent, recordId[]>
  static #sourceFamilyIndex = null;  // Map<sourceFamily, recordId[]>
  static #unreadIndex = null;  // Map<recipientId, recordId[]> — unread by that recipient
  static #allRecords = null;  // cached hydrated records array

  static #threadIndex = null;  // Map<threadId, thread>
  static #allThreads = null;  // cached hydrated threads array

  static #lastSettingsRead = 0;
  static #lastThreadsSettingsRead = 0;

  static async saveRecord(record) {
    if (!game.user?.isGM) {
      console.warn('Only GM can save Holonet records');
      return false;
    }
    try {
      const rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      const serialized = record.toJSON?.() ?? record;
      const index = rawRecords.findIndex(r => r.id === serialized.id);
      if (index >= 0) rawRecords[index] = serialized;
      else rawRecords.push(serialized);
      await game.settings.set(this.NS, this.FLAG_KEY, rawRecords);
      this.invalidateCache();
      return true;
    } catch (err) {
      console.error('Failed to save Holonet record:', err);
      return false;
    }
  }

  static async getRecord(recordId) {
    try {
      const rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      const found = rawRecords.find(r => r.id === recordId);
      return hydrateHolonetRecord(found);
    } catch (err) {
      console.error('Failed to load Holonet record:', err);
      return null;
    }
  }

  static async getAllRecords() {
    try {
      const rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      return rawRecords.map(hydrateHolonetRecord).filter(Boolean);
    } catch (err) {
      console.warn('Could not load Holonet records:', err);
      return [];
    }
  }

  static async getRecordsByState(state) {
    const records = await this.getAllRecords();
    return records.filter(r => r.state === state);
  }

  static async getRecordsForRecipient(recipientId, states = null) {
    const records = await this.getAllRecords();
    return records.filter(r => {
      const hasRecipient = r.recipients?.some(rec => rec.id === recipientId);
      if (!hasRecipient) return false;
      if (states && !states.includes(r.state)) return false;
      return true;
    });
  }

  /**
   * Batch-save multiple records in a single settings write.
   * More efficient than calling saveRecord() in a loop.
   *
   * @param {HolonetRecord[]} records
   * @returns {Promise<boolean>}
   */
  static async saveRecords(records) {
    if (!game.user?.isGM) {
      console.warn('Only GM can save Holonet records');
      return false;
    }
    if (!records?.length) return true;
    try {
      const rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      for (const record of records) {
        const serialized = record.toJSON?.() ?? record;
        const index = rawRecords.findIndex(r => r.id === serialized.id);
        if (index >= 0) rawRecords[index] = serialized;
        else rawRecords.push(serialized);
      }
      await game.settings.set(this.NS, this.FLAG_KEY, rawRecords);
      this.invalidateCache();
      return true;
    } catch (err) {
      console.error('Failed to batch-save Holonet records:', err);
      return false;
    }
  }

  static async deleteRecord(recordId) {
    if (!game.user?.isGM) return false;
    try {
      let rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      rawRecords = rawRecords.filter(r => r.id !== recordId);
      await game.settings.set(this.NS, this.FLAG_KEY, rawRecords);
      this.invalidateCache();
      return true;
    } catch (err) {
      console.error('Failed to delete Holonet record:', err);
      return false;
    }
  }

  static async saveThread(thread) {
    if (!game.user?.isGM) return false;
    try {
      const rawThreads = await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
      const serialized = thread.toJSON?.() ?? thread;
      const index = rawThreads.findIndex(t => t.id === serialized.id);
      if (index >= 0) rawThreads[index] = serialized;
      else rawThreads.push(serialized);
      await game.settings.set(this.NS, this.THREADS_FLAG_KEY, rawThreads);
      this.#threadIndex = null;
      this.#allThreads = null;
      return true;
    } catch (err) {
      console.error('Failed to save Holonet thread:', err);
      return false;
    }
  }

  static async getAllThreads() {
    try {
      const rawThreads = await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
      return rawThreads.map(hydrateHolonetThread).filter(Boolean);
    } catch (err) {
      console.warn('Could not load Holonet threads:', err);
      return [];
    }
  }

  static async getThread(threadId) {
    try {
      const rawThreads = await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
      const found = rawThreads.find(t => t.id === threadId);
      return hydrateHolonetThread(found);
    } catch (err) {
      console.error('Failed to load Holonet thread:', err);
      return null;
    }
  }

  static async getThreadsForParticipant(participantId) {
    const threads = await this.getAllThreads();
    return threads.filter(t => t.participants?.some(p => p.id === participantId));
  }

  static async deleteThread(threadId) {
    if (!game.user?.isGM) return false;
    try {
      let rawThreads = await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
      rawThreads = rawThreads.filter(t => t.id !== threadId);
      await game.settings.set(this.NS, this.THREADS_FLAG_KEY, rawThreads);
      this.#threadIndex = null;
      this.#allThreads = null;
      return true;
    } catch (err) {
      console.error('Failed to delete Holonet thread:', err);
      return false;
    }
  }

  static async clearAll() {
    if (!game.user?.isGM) return false;
    await game.settings.set(this.NS, this.FLAG_KEY, []);
    await game.settings.set(this.NS, this.THREADS_FLAG_KEY, []);
    this.invalidateCache();
    return true;
  }

  // ─── Phase 3: Indexing and caching methods ─────────────────────────────
  /**
   * Invalidate all caches. Called after any write operation.
   */
  static invalidateCache() {
    this.#recordIndex = null;
    this.#recipientIndex = null;
    this.#intentIndex = null;
    this.#sourceFamilyIndex = null;
    this.#unreadIndex = null;
    this.#allRecords = null;
    this.#threadIndex = null;
    this.#allThreads = null;
  }

  /**
   * Build or return the record index and secondary indexes.
   * Records are indexed by ID, recipient, intent, sourceFamily, and unread status.
   *
   * @param {Object} [options]
   * @param {boolean} [options.force] Force rebuild instead of returning cached index
   * @returns {Promise<Map<string, HolonetRecord>>}
   */
  static async getRecordIndex({ force = false } = {}) {
    if (this.#recordIndex && !force) return this.#recordIndex;

    // Fetch and hydrate records once
    const rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
    this.#allRecords = rawRecords.map(hydrateHolonetRecord).filter(Boolean);

    // Build primary index
    this.#recordIndex = new Map();
    this.#recipientIndex = new Map();
    this.#intentIndex = new Map();
    this.#sourceFamilyIndex = new Map();
    this.#unreadIndex = new Map();

    for (const record of this.#allRecords) {
      // Primary index by ID
      this.#recordIndex.set(record.id, record);

      // Index by recipient
      for (const recipient of (record.recipients ?? [])) {
        if (!this.#recipientIndex.has(recipient.id)) {
          this.#recipientIndex.set(recipient.id, []);
        }
        this.#recipientIndex.get(recipient.id).push(record.id);

        // Unread index per recipient
        if (record.isUnreadBy?.(recipient.id)) {
          if (!this.#unreadIndex.has(recipient.id)) {
            this.#unreadIndex.set(recipient.id, []);
          }
          this.#unreadIndex.get(recipient.id).push(record.id);
        }
      }

      // Index by intent
      if (record.intent) {
        if (!this.#intentIndex.has(record.intent)) {
          this.#intentIndex.set(record.intent, []);
        }
        this.#intentIndex.get(record.intent).push(record.id);
      }

      // Index by sourceFamily
      if (record.sourceFamily) {
        if (!this.#sourceFamilyIndex.has(record.sourceFamily)) {
          this.#sourceFamilyIndex.set(record.sourceFamily, []);
        }
        this.#sourceFamilyIndex.get(record.sourceFamily).push(record.id);
      }
    }

    return this.#recordIndex;
  }

  /**
   * Get a single record by ID using the index (calls getRecordIndex to build if needed).
   *
   * @param {string} recordId
   * @returns {Promise<HolonetRecord|null>}
   */
  static async getRecordById(recordId) {
    const index = await this.getRecordIndex();
    return index.get(recordId) ?? null;
  }

  /**
   * Get records for a recipient, optionally filtered by delivery states.
   * Uses the recipient index for efficient lookup.
   *
   * @param {string} recipientId
   * @param {string[]} [deliveryStates] Optional state filter
   * @returns {Promise<HolonetRecord[]>}
   */
  static async getRecordsByRecipient(recipientId, deliveryStates = null) {
    const index = await this.getRecordIndex();
    const recordIds = this.#recipientIndex.get(recipientId) ?? [];
    const records = recordIds.map(id => index.get(id)).filter(Boolean);

    if (!deliveryStates) return records;
    return records.filter(r => deliveryStates.includes(r.state));
  }

  /**
   * Get unread records for a recipient using the unread index.
   *
   * @param {string} recipientId
   * @param {Object} [options]
   * @param {string[]} [options.deliveryStates] Optional state filter
   * @returns {Promise<HolonetRecord[]>}
   */
  static async getUnreadRecordsForRecipient(recipientId, { deliveryStates = null } = {}) {
    await this.getRecordIndex();
    const recordIds = this.#unreadIndex.get(recipientId) ?? [];
    const index = this.#recordIndex;
    const records = recordIds.map(id => index.get(id)).filter(Boolean);

    if (!deliveryStates) return records;
    return records.filter(r => deliveryStates.includes(r.state));
  }

  /**
   * Get records by intent using the intent index.
   *
   * @param {string} intent
   * @param {Object} [options]
   * @param {string[]} [options.deliveryStates] Optional state filter
   * @returns {Promise<HolonetRecord[]>}
   */
  static async getRecordsByIntent(intent, { deliveryStates = null } = {}) {
    const index = await this.getRecordIndex();
    const recordIds = this.#intentIndex.get(intent) ?? [];
    const records = recordIds.map(id => index.get(id)).filter(Boolean);

    if (!deliveryStates) return records;
    return records.filter(r => deliveryStates.includes(r.state));
  }

  /**
   * Get records by source family using the sourceFamily index.
   *
   * @param {string} sourceFamily
   * @param {Object} [options]
   * @param {string[]} [options.deliveryStates] Optional state filter
   * @returns {Promise<HolonetRecord[]>}
   */
  static async getRecordsBySourceFamily(sourceFamily, { deliveryStates = null } = {}) {
    const index = await this.getRecordIndex();
    const recordIds = this.#sourceFamilyIndex.get(sourceFamily) ?? [];
    const records = recordIds.map(id => index.get(id)).filter(Boolean);

    if (!deliveryStates) return records;
    return records.filter(r => deliveryStates.includes(r.state));
  }

  /**
   * Get or rebuild thread index.
   *
   * @param {Object} [options]
   * @param {boolean} [options.force] Force rebuild instead of returning cached index
   * @returns {Promise<Map<string, HolonetThread>>}
   */
  static async getThreadsIndex({ force = false } = {}) {
    if (this.#threadIndex && !force) return this.#threadIndex;

    const rawThreads = await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
    this.#allThreads = rawThreads.map(hydrateHolonetThread).filter(Boolean);

    this.#threadIndex = new Map();
    for (const thread of this.#allThreads) {
      this.#threadIndex.set(thread.id, thread);
    }

    return this.#threadIndex;
  }

  /**
   * Get a single thread by ID using the index.
   *
   * @param {string} threadId
   * @returns {Promise<HolonetThread|null>}
   */
  static async getThreadById(threadId) {
    const index = await this.getThreadsIndex();
    return index.get(threadId) ?? null;
  }

  /**
   * Batch-save multiple threads in a single settings write.
   * More efficient than calling saveThread() in a loop.
   *
   * @param {HolonetThread[]} threads
   * @returns {Promise<boolean>}
   */
  static async saveThreads(threads) {
    if (!game.user?.isGM) {
      console.warn('Only GM can save Holonet threads');
      return false;
    }
    if (!threads?.length) return true;
    try {
      const rawThreads = await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
      for (const thread of threads) {
        const serialized = thread.toJSON?.() ?? thread;
        const index = rawThreads.findIndex(t => t.id === serialized.id);
        if (index >= 0) rawThreads[index] = serialized;
        else rawThreads.push(serialized);
      }
      await game.settings.set(this.NS, this.THREADS_FLAG_KEY, rawThreads);
      this.#threadIndex = null;
      this.#allThreads = null;
      return true;
    } catch (err) {
      console.error('Failed to batch-save Holonet threads:', err);
      return false;
    }
  }

  /**
   * Archive a single record (non-destructive, marks metadata).
   * Preserves the record but marks it archived.
   *
   * @param {string} recordId
   * @param {Object} [options]
   * @param {string} [options.archivedBy] User/system identifier who archived it
   * @param {string} [options.reason] Reason for archival
   * @returns {Promise<boolean>}
   */
  static async archiveRecord(recordId, { archivedBy = null, reason = null } = {}) {
    if (!game.user?.isGM) return false;
    const record = await this.getRecord(recordId);
    if (!record) return false;

    record.archive();
    if (archivedBy || reason) {
      record.metadata = record.metadata ?? {};
      if (archivedBy) record.metadata.archivedBy = archivedBy;
      if (reason) record.metadata.archiveReason = reason;
    }
    this.invalidateCache();
    return this.saveRecord(record);
  }

  /**
   * Archive multiple records in a single operation.
   *
   * @param {string[]} recordIds
   * @param {Object} [options]
   * @param {string} [options.archivedBy]
   * @param {string} [options.reason]
   * @returns {Promise<boolean>}
   */
  static async archiveRecords(recordIds, { archivedBy = null, reason = null } = {}) {
    if (!game.user?.isGM || !recordIds?.length) return false;
    try {
      const records = [];
      for (const recordId of recordIds) {
        const record = await this.getRecord(recordId);
        if (!record) continue;
        record.archive();
        if (archivedBy || reason) {
          record.metadata = record.metadata ?? {};
          if (archivedBy) record.metadata.archivedBy = archivedBy;
          if (reason) record.metadata.archiveReason = reason;
        }
        records.push(record);
      }
      if (records.length) {
        this.invalidateCache();
        return this.saveRecords(records);
      }
      return true;
    } catch (err) {
      console.error('Failed to archive records:', err);
      return false;
    }
  }

  /**
   * Prune old records based on age or count.
   * Non-destructive by default (dryRun = true).
   * Does not remove archived records unless includeArchived = true.
   *
   * @param {Object} [options]
   * @param {number} [options.olderThan] Age in milliseconds (e.g., 30 days = 30*24*60*60*1000)
   * @param {number} [options.maxRecords] Keep only this many most recent records
   * @param {boolean} [options.includeArchived] If false, skip archived records
   * @param {boolean} [options.dryRun] If true, report what would be deleted; don't actually delete
   * @returns {Promise<{removed: string[], remaining: number, dryRun: boolean}>}
   */
  static async pruneRecords({
    olderThan = null,
    maxRecords = null,
    includeArchived = false,
    dryRun = true
  } = {}) {
    if (!game.user?.isGM) return { removed: [], remaining: 0, dryRun };

    try {
      const records = await this.getAllRecords();
      const now = Date.now();
      const cutoff = olderThan ? now - olderThan : null;

      let candidates = records;
      if (!includeArchived) {
        const ARCHIVED_STATE = 'ARCHIVED';  // assumes DELIVERY_STATE.ARCHIVED = 'ARCHIVED'
        candidates = candidates.filter(r => r.state !== ARCHIVED_STATE);
      }

      // Identify records to remove
      const toRemove = [];
      if (cutoff) {
        for (const record of candidates) {
          const createdTime = new Date(record.createdAt).getTime();
          if (createdTime < cutoff) {
            toRemove.push(record.id);
          }
        }
      }
      if (maxRecords && candidates.length > maxRecords) {
        const sorted = [...candidates]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(maxRecords)
          .map(r => r.id);
        toRemove.push(...sorted);
      }

      if (!dryRun && toRemove.length) {
        let rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
        rawRecords = rawRecords.filter(r => !toRemove.includes(r.id));
        await game.settings.set(this.NS, this.FLAG_KEY, rawRecords);
        this.invalidateCache();
      }

      return {
        removed: toRemove,
        remaining: records.length - toRemove.length,
        dryRun
      };
    } catch (err) {
      console.error('[HolonetStorage] pruneRecords failed:', err);
      return { removed: [], remaining: 0, dryRun };
    }
  }

  /**
   * Compact records by removing null/invalid entries.
   * Only removes entries with obviously bad data when dryRun = false.
   *
   * @param {Object} [options]
   * @param {boolean} [options.dryRun] If true, report what would be removed; don't actually remove
   * @returns {Promise<{removed: string[], dryRun: boolean}>}
   */
  static async compactRecords({ dryRun = true } = {}) {
    if (!game.user?.isGM) return { removed: [], dryRun };

    try {
      const rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      const toRemove = [];

      for (const record of rawRecords) {
        // Remove null, undefined, or records missing an id
        if (!record || !record.id) {
          toRemove.push(record?.id ?? 'null');
        }
      }

      if (!dryRun && toRemove.length) {
        const filtered = rawRecords.filter(r => r && r.id && !toRemove.includes(r.id));
        await game.settings.set(this.NS, this.FLAG_KEY, filtered);
        this.invalidateCache();
      }

      return { removed: toRemove, dryRun };
    } catch (err) {
      console.error('[HolonetStorage] compactRecords failed:', err);
      return { removed: [], dryRun };
    }
  }
}
