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

      // Track if we have split Knowledge skills
      let hasSplitKnowledgeSkills = false;

      for (const skillDoc of docs) {
        if (!skillDoc?.name) continue;

        // Skip the generic "Knowledge" skill if it exists in the compendium
        // We'll use the split Knowledge skills from data/skills.json instead
        if (skillDoc.name?.toLowerCase() === 'knowledge') {
          SWSELogger.debug('[SkillRegistry] Skipping generic "Knowledge" skill (will use split Knowledge skills)');
          continue;
        }

        const normalized = this._normalize(skillDoc);
        this.skills.set(normalized.name.toLowerCase(), normalized);
        this._byId.set(normalized.id, normalized);
        this._byKey.set(normalized.key, normalized);
      }

      // PHASE 2: Load split Knowledge skills from data/skills.json
      // This ensures individual Knowledge skills like Knowledge (Bureaucracy) are available
      try {
        const response = await fetch('/systems/foundryvtt-swse/data/skills.json');
        if (response.ok) {
          const splitSkills = await response.json();
          const knowledgeSkills = (splitSkills || []).filter(s =>
            s.key?.startsWith('knowledge') && s.key !== 'knowledge'
          );

          if (knowledgeSkills.length > 0) {
            for (const skillData of knowledgeSkills) {
              const normalized = {
                id: skillData.key,
                _id: skillData.key,
                name: skillData.name,
                key: skillData.key.toLowerCase().replace(/\s+/g, ''),
                ability: skillData.ability || 'int',
                system: { ability: skillData.ability || 'int', key: skillData.key },
                classes: {},
                pack: 'data/skills.json',
                document: null
              };
              this.skills.set(normalized.name.toLowerCase(), normalized);
              this._byId.set(normalized.id, normalized);
              this._byKey.set(normalized.key, normalized);
            }

            hasSplitKnowledgeSkills = true;
            SWSELogger.debug(`[SkillRegistry] Loaded ${knowledgeSkills.length} split Knowledge skills from data/skills.json`);
          }
        }
      } catch (err) {
        SWSELogger.warn('[SkillRegistry] Failed to load split Knowledge skills from data/skills.json:', err);
      }

      this.isBuilt = true;
      const logMsg = hasSplitKnowledgeSkills
        ? `SkillRegistry built: ${this.skills.size} skills loaded (including split Knowledge skills)`
        : `SkillRegistry built: ${this.skills.size} skills loaded`;
      SWSELogger.log(logMsg);
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
