/**
 * SKILL REGISTRY
 * Canonical progression-facing authority for skills.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const SkillRegistry = {
  skills: new Map(),
  _byId: new Map(),
  _byKey: new Map(),
  isBuilt: false,

  async build() {
    try {
      const pack = game.packs.get('foundryvtt-swse.skills');
      if (!pack) {
        SWSELogger.warn('Skills compendium not found');
        return false;
      }

      const docs = await pack.getDocuments();
      this.skills.clear();
      this._byId.clear();
      this._byKey.clear();

      for (const skillDoc of docs) {
        if (!skillDoc?.name) continue;
        const normalized = this._normalize(skillDoc);
        this.skills.set(normalized.name.toLowerCase(), normalized);
        this._byId.set(normalized.id, normalized);
        this._byKey.set(normalized.key, normalized);
      }

      this.isBuilt = true;
      SWSELogger.log(`SkillRegistry built: ${this.skills.size} skills loaded`);
      return true;
    } catch (err) {
      SWSELogger.error('Failed to build SkillRegistry:', err);
      return false;
    }
  },

  _normalize(skillDoc) {
    const system = skillDoc.system || {};
    const key = String(system.key || skillDoc.name || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[()]/g, '');
    return {
      id: skillDoc.id || skillDoc._id || key,
      _id: skillDoc._id || skillDoc.id || key,
      name: skillDoc.name,
      key,
      uuid: skillDoc.uuid || null,
      ability: system.ability || null,
      system,
      classes: system.classes || {},
      pack: skillDoc.pack || null,
      document: skillDoc,
    };
  },

  get(name) { if (!name) return null; return this.skills.get(String(name).toLowerCase()) ?? this._byKey.get(String(name).toLowerCase()) ?? null; },
  getById(id) { if (!id) return null; return this._byId.get(id) ?? null; },
  byKey(key) { if (!key) return null; return this._byKey.get(String(key).toLowerCase()) ?? null; },
  has(name) { return !!this.get(name); },
  list() { return Array.from(this.skills.values()); },
  count() { return this.skills.size; },
  getByAbility(ability) { const normalized = String(ability || '').toLowerCase(); return this.list().filter((skill) => String(skill.ability || '').toLowerCase() === normalized); },
  getNames() { return this.list().map((doc) => doc.name); },
  getClassSkills(className) { if (!className) return []; return this.list().filter((skill) => Boolean(skill.classes?.[className])); },
  async getDocumentById(id) { const entry = this.getById(id); return entry?.document || null; },
  async getDocumentByRef(ref) { return this.getById(ref?.id || ref?._id || ref) || this.get(ref?.name || ref); },
  async rebuild() { this.skills.clear(); this._byId.clear(); this._byKey.clear(); this.isBuilt = false; return this.build(); },
  getStatus() { return { isBuilt: this.isBuilt, count: this.skills.size, skills: this.getNames() }; }
};

export default SkillRegistry;
