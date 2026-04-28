/**
 * Holonet Storage Service
 *
 * Persistence boundary for Holonet records.
 * Stores records in world flags.
 */

export class HolonetStorage {
  static NS = 'foundryvtt-swse';
  static FLAG_KEY = 'holonet_records';
  static THREADS_FLAG_KEY = 'holonet_threads';

  /**
   * Save a record
   */
  static async saveRecord(record) {
    if (!game.user?.isGM) {
      console.warn('Only GM can save Holonet records');
      return false;
    }

    try {
      const records = await this.getAllRecords();
      const index = records.findIndex(r => r.id === record.id);

      if (index >= 0) {
        records[index] = record.toJSON?.() ?? record;
      } else {
        records.push(record.toJSON?.() ?? record);
      }

      await game.settings.set(this.NS, this.FLAG_KEY, records);
      return true;
    } catch (err) {
      console.error('Failed to save Holonet record:', err);
      return false;
    }
  }

  /**
   * Load a record by ID
   */
  static async getRecord(recordId) {
    try {
      const records = await this.getAllRecords();
      return records.find(r => r.id === recordId) ?? null;
    } catch (err) {
      console.error('Failed to load Holonet record:', err);
      return null;
    }
  }

  /**
   * Get all records
   */
  static async getAllRecords() {
    try {
      return await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
    } catch (err) {
      console.warn('Could not load Holonet records:', err);
      return [];
    }
  }

  /**
   * Get records by state
   */
  static async getRecordsByState(state) {
    const records = await this.getAllRecords();
    return records.filter(r => r.state === state);
  }

  /**
   * Get records for a recipient
   */
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
   * Delete a record
   */
  static async deleteRecord(recordId) {
    if (!game.user?.isGM) return false;

    try {
      let records = await this.getAllRecords();
      records = records.filter(r => r.id !== recordId);
      await game.settings.set(this.NS, this.FLAG_KEY, records);
      return true;
    } catch (err) {
      console.error('Failed to delete Holonet record:', err);
      return false;
    }
  }

  /**
   * Save a thread
   */
  static async saveThread(thread) {
    if (!game.user?.isGM) return false;

    try {
      const threads = await this.getAllThreads();
      const index = threads.findIndex(t => t.id === thread.id);

      if (index >= 0) {
        threads[index] = thread.toJSON?.() ?? thread;
      } else {
        threads.push(thread.toJSON?.() ?? thread);
      }

      await game.settings.set(this.NS, this.THREADS_FLAG_KEY, threads);
      return true;
    } catch (err) {
      console.error('Failed to save Holonet thread:', err);
      return false;
    }
  }

  /**
   * Get all threads
   */
  static async getAllThreads() {
    try {
      return await game.settings.get(this.NS, this.THREADS_FLAG_KEY) ?? [];
    } catch (err) {
      console.warn('Could not load Holonet threads:', err);
      return [];
    }
  }

  /**
   * Get a thread by ID
   */
  static async getThread(threadId) {
    try {
      const threads = await this.getAllThreads();
      return threads.find(t => t.id === threadId) ?? null;
    } catch (err) {
      console.error('Failed to load Holonet thread:', err);
      return null;
    }
  }

  /**
   * Get threads for a participant
   */
  static async getThreadsForParticipant(participantId) {
    const threads = await this.getAllThreads();
    return threads.filter(t =>
      t.participants?.some(p => p.id === participantId)
    );
  }

  /**
   * Delete a thread
   */
  static async deleteThread(threadId) {
    if (!game.user?.isGM) return false;

    try {
      let threads = await this.getAllThreads();
      threads = threads.filter(t => t.id !== threadId);
      await game.settings.set(this.NS, this.THREADS_FLAG_KEY, threads);
      return true;
    } catch (err) {
      console.error('Failed to delete Holonet thread:', err);
      return false;
    }
  }

  /**
   * Clear all records (development/testing only)
   */
  static async clearAll() {
    if (!game.user?.isGM) return false;
    await game.settings.set(this.NS, this.FLAG_KEY, []);
    await game.settings.set(this.NS, this.THREADS_FLAG_KEY, []);
    return true;
  }
}
