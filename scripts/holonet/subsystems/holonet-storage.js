/**
 * Holonet Storage Service
 *
 * Persistence boundary for Holonet records and threads.
 */

import { hydrateHolonetRecord, hydrateHolonetThread } from '../contracts/record-factory.js';

export class HolonetStorage {
  static NS = 'foundryvtt-swse';
  static FLAG_KEY = 'holonet_records';
  static THREADS_FLAG_KEY = 'holonet_threads';

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

  static async deleteRecord(recordId) {
    if (!game.user?.isGM) return false;
    try {
      let rawRecords = await game.settings.get(this.NS, this.FLAG_KEY) ?? [];
      rawRecords = rawRecords.filter(r => r.id !== recordId);
      await game.settings.set(this.NS, this.FLAG_KEY, rawRecords);
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
    return true;
  }
}
