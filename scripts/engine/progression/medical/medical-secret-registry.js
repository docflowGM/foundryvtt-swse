/**
 * MedicalSecretRegistry
 *
 * Canonical enumeration authority for Medic Medical Secrets. Mirrors the Force
 * registry's read-only shape but is intentionally scoped to the medical-secret
 * compendium so Treat Injury features can consume these selections cleanly.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class MedicalSecretRegistry {
  static _initialized = false;
  static _entries = [];
  static _byId = new Map();
  static _byName = new Map();
  static _byTag = new Map();

  static async initialize() {
    if (this._initialized) return true;
    this._entries = [];
    this._byId.clear();
    this._byName.clear();
    this._byTag.clear();

    const systemId = game?.system?.id || 'foundryvtt-swse';
    const packKey = `${systemId}.medicalsecrets`;
    const pack = game?.packs?.get(packKey);
    if (!pack) {
      swseLogger.warn(`[MedicalSecretRegistry] Compendium pack "${packKey}" not found.`);
      this._initialized = true;
      return false;
    }

    const docs = await pack.getDocuments();
    for (const doc of docs || []) {
      const entry = this._normalizeEntry(doc);
      this._entries.push(entry);
      this._byId.set(entry.id, entry);
      this._byName.set(entry.name.toLowerCase(), entry);
      for (const tag of entry.tags) {
        if (!this._byTag.has(tag)) this._byTag.set(tag, []);
        this._byTag.get(tag).push(entry);
      }
    }

    this._initialized = true;
    swseLogger.log(`[MedicalSecretRegistry] Initialized: ${this._entries.length} medical secrets`);
    return true;
  }

  static async init() { return this.initialize(); }
  static async ensureInitialized() { return this.initialize(); }

  static _normalizeEntry(doc) {
    const system = doc.system || {};
    const tags = Array.isArray(system.tags) ? system.tags.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean) : [];
    const description = system.description?.value || system.description || system.benefit || '';
    return {
      id: doc._id,
      uuid: doc.uuid || null,
      name: doc.name,
      type: 'medical_secret',
      category: system.category || 'treat_injury',
      tags,
      prerequisites: { raw: system.prerequisite || system.prerequisites || '' },
      description,
      source: system.sourcebook || system.source || 'Force Unleashed Campaign Guide',
      pack: doc.pack || 'unknown',
      system,
      img: doc.img,
    };
  }

  static getAll() { return [...this._entries]; }
  static list() { return this.getAll(); }
  static getById(id) { return this._byId.get(id) || null; }
  static getByName(name) { return this._byName.get(String(name || '').toLowerCase()) || null; }
  static byTag(tag) { return [...(this._byTag.get(String(tag || '').toLowerCase()) || [])]; }

  static resolveEntry(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') return this.getById(ref) || this.getByName(ref);
    return this.getById(ref.id || ref._id || ref.internalId) || this.getByName(ref.name || ref.label);
  }

  static async _getDocument(id) {
    const entry = this.resolveEntry(id) || this.getById(id);
    if (!entry?.pack || !entry?.id) return null;
    const pack = game?.packs?.get(entry.pack);
    if (!pack) return null;
    try {
      return await pack.getDocument(entry.id);
    } catch (err) {
      swseLogger.warn(`[MedicalSecretRegistry] Failed to fetch document ${entry.id} from ${entry.pack}:`, err);
      return null;
    }
  }

  static async getDocumentById(id) { return this._getDocument(id); }
  static async getDocumentByRef(ref) {
    const entry = this.resolveEntry(ref);
    return entry ? this._getDocument(entry.id) : null;
  }
}

export default MedicalSecretRegistry;
