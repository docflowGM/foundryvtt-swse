/**
 * ProgressionContentAuthority
 *
 * Canonical read seam for progression-facing content families.
 *
 * SSOT map:
 * - classes: ClassesRegistry / ClassesDB
 * - species: SpeciesRegistry
 * - feats: scripts/registries/feat-registry.js
 * - talents: scripts/registries/talent-registry.js
 * - backgrounds: BackgroundRegistry
 * - skills: SkillRegistry
 * - languages: LanguageRegistry
 * - force powers / techniques / secrets: ForceRegistry
 */

import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
import { BackgroundRegistry } from "/systems/foundryvtt-swse/scripts/registries/background-registry.js";
import { LanguageRegistry } from "/systems/foundryvtt-swse/scripts/registries/language-registry.js";
import SkillRegistry from "/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { MedicalSecretRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/medical/medical-secret-registry.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const toLower = (v) => String(v ?? '').trim().toLowerCase();

function uniqueBy(entries, keyFn = (entry) => entry?.id ?? entry?.name) {
  const out = [];
  const seen = new Set();
  for (const entry of entries || []) {
    if (!entry) continue;
    const key = keyFn(entry);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export class ProgressionContentAuthority {
  static _initialized = false;

  static async initialize() {
    if (this._initialized) return true;

    await Promise.allSettled([
      ClassesRegistry.initialize?.(),
      SpeciesRegistry.initialize?.(),
      FeatRegistry.initialize?.(),
      TalentRegistry.initialize?.(),
      BackgroundRegistry.ensureLoaded?.(),
      LanguageRegistry.ensureLoaded?.(),
      SkillRegistry.build?.(),
      ForceRegistry.initialize?.(),
      MedicalSecretRegistry.initialize?.(),
    ]);

    this._initialized = true;
    return true;
  }

  static resolveClass(ref) {
    return ClassesRegistry.resolveModel?.(ref) || null;
  }

  static resolveSpecies(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return SpeciesRegistry.getById(ref) || SpeciesRegistry.getByName(ref);
    }
    return (
      SpeciesRegistry.getById(ref.id || ref._id || ref.internalId || ref.sourceId) ||
      SpeciesRegistry.getByName(ref.name || ref.speciesName)
    );
  }

  static async resolveBackground(ref) {
    await BackgroundRegistry.ensureLoaded?.();
    if (!ref) return null;
    if (typeof ref === 'string') {
      return (await BackgroundRegistry.getById?.(ref)) || (await BackgroundRegistry.getBySlug?.(ref)) || null;
    }
    return (
      await BackgroundRegistry.getById?.(ref._id || ref.internalId || ref.id)
    ) || (
      await BackgroundRegistry.getBySlug?.(ref.slug || ref.id || ref.backgroundId || ref.name)
    ) || null;
  }

  static resolveSkill(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return SkillRegistry.get(ref) || SkillRegistry.getById?.(ref) || SkillRegistry.byKey?.(ref) || null;
    }
    return (
      SkillRegistry.getById?.(ref.id || ref._id || ref.internalId) ||
      SkillRegistry.byKey?.(ref.key) ||
      SkillRegistry.get(ref.name || ref.label)
    );
  }

  static async resolveLanguage(ref) {
    await LanguageRegistry.ensureLoaded?.();
    if (!ref) return null;
    if (typeof ref === 'string') {
      return (await LanguageRegistry.getById?.(ref)) || (await LanguageRegistry.getByName?.(ref)) || null;
    }
    return (
      await LanguageRegistry.getById?.(ref._id || ref.internalId || ref.id)
    ) || (
      await LanguageRegistry.getByName?.(ref.name || ref.label)
    ) || null;
  }

  static resolveFeat(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return FeatRegistry.getById?.(ref) || FeatRegistry.getByName?.(ref) || null;
    }
    return FeatRegistry.getById?.(ref.id || ref._id || ref.internalId) || FeatRegistry.getByName?.(ref.name || ref.label) || null;
  }

  static resolveTalent(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return TalentRegistry.getById?.(ref) || TalentRegistry.getByName?.(ref) || null;
    }
    return TalentRegistry.getById?.(ref.id || ref._id || ref.internalId) || TalentRegistry.getByName?.(ref.name || ref.label) || null;
  }

  static resolveForce(ref, expectedType = null) {
    if (!ref) return null;
    const entry = typeof ref === 'string'
      ? (ForceRegistry.getById?.(ref) || ForceRegistry.getByName?.(ref))
      : (ForceRegistry.getById?.(ref.id || ref._id || ref.internalId) || ForceRegistry.getByName?.(ref.name || ref.label));
    if (!entry) return null;
    if (expectedType && entry.type !== expectedType) return null;
    return entry;
  }

  static resolveMedicalSecret(ref) {
    if (!ref) return null;
    return MedicalSecretRegistry.resolveEntry?.(ref) || null;
  }

  static getAllSpecies() {
    return SpeciesRegistry.getAll?.() || [];
  }

  static async getAllBackgrounds() {
    await BackgroundRegistry.ensureLoaded?.();
    return BackgroundRegistry.getAll?.() || BackgroundRegistry.all?.() || [];
  }

  static getAllFeatEntries() {
    return FeatRegistry.getAll?.() || [];
  }

  static getAllTalentEntries() {
    return TalentRegistry.getAll?.() || [];
  }

  static getAllSkillEntries() {
    return SkillRegistry.list?.() || [];
  }

  static getAllForceEntries(expectedType = null) {
    const all = ForceRegistry.getAll?.() || [];
    return expectedType ? all.filter((entry) => entry.type === expectedType) : all;
  }

  static getAllMedicalSecretEntries() {
    return MedicalSecretRegistry.getAll?.() || [];
  }

  static async getSpeciesDocument(ref) {
    return SpeciesRegistry.getDocumentByRef?.(ref) || null;
  }

  static async getBackgroundDocument(ref) {
    return BackgroundRegistry.getDocumentByRef?.(ref) || null;
  }

  static async getFeatDocument(ref) {
    const entry = this.resolveFeat(ref);
    if (entry?.id) return FeatRegistry.getDocumentById?.(entry.id) || null;
    if (typeof ref === 'string') return FeatRegistry.getDocumentByName?.(ref) || null;
    return null;
  }

  static async getTalentDocument(ref) {
    const entry = this.resolveTalent(ref);
    if (entry?.id) return TalentRegistry.getDocumentById?.(entry.id) || null;
    if (typeof ref === 'string') return TalentRegistry.getDocumentByName?.(ref) || null;
    return null;
  }

  static async getSkillDocument(ref) {
    const entry = this.resolveSkill(ref);
    return entry?.document || null;
  }

  static async getForceDocument(ref, expectedType = null) {
    return ForceRegistry.getDocumentByRef?.(ref, expectedType) || null;
  }

  static async getMedicalSecretDocument(ref) {
    return MedicalSecretRegistry.getDocumentByRef?.(ref) || null;
  }

  static getClassSkillNames(classSelection) {
    const classModel = this.resolveClass(classSelection);
    const names = Array.isArray(classModel?.classSkills) ? classModel.classSkills : [];
    return names.map((skill) => String(skill || '').trim()).filter(Boolean);
  }

  static getClassSkillAllowance(classSelection, attributes = null, actor = null) {
    const classModel = this.resolveClass(classSelection);
    const base = Number(classModel?.trainedSkills ?? classSelection?.grants?.trainedSkills ?? 0);
    const intMod = Number(attributes?.int?.modifier ?? attributes?.int?.mod ?? attributes?.int?.score ? Math.floor(((attributes?.int?.score ?? 10) - 10) / 2) : actor?.system?.abilities?.int?.mod ?? actor?.system?.attributes?.int?.mod ?? 0);
    return Math.max(1, base + Math.max(0, intMod));
  }

  static async getBackgroundRelevantSkillNames(backgroundSelection) {
    const background = await this.resolveBackground(backgroundSelection);
    const raw = background?.relevantSkills || background?.grants?.skills || background?.skills || [];
    return Array.isArray(raw) ? raw.map((skill) => String(skill || '').trim()).filter(Boolean) : [];
  }

  static async getGrantedSkillEntries({ classSelection = null, backgroundSelection = null } = {}) {
    const classSkillEntries = this.getClassSkillNames(classSelection).map((name) => this.resolveSkill(name)).filter(Boolean);
    const bgNames = await this.getBackgroundRelevantSkillNames(backgroundSelection);
    const backgroundEntries = bgNames.map((name) => this.resolveSkill(name)).filter(Boolean);
    return uniqueBy([...classSkillEntries, ...backgroundEntries]);
  }

  static async getGrantedLanguageEntries({ speciesSelection = null, backgroundSelection = null } = {}) {
    const species = this.resolveSpecies(speciesSelection);
    const speciesLanguages = Array.isArray(species?.languages) ? species.languages : [];
    const background = await this.resolveBackground(backgroundSelection);
    const backgroundLanguages = Array.isArray(background?.languages)
      ? background.languages
      : Array.isArray(background?.grants?.languages)
        ? background.grants.languages
        : [];

    const resolved = [];
    for (const lang of [...speciesLanguages, ...backgroundLanguages]) {
      const entry = await this.resolveLanguage(lang);
      if (entry) resolved.push(entry);
    }
    return uniqueBy(resolved);
  }

  static normalizeSelectionList(kind, rawValues) {
    const values = Array.isArray(rawValues) ? rawValues : [];
    const resolver = {
      feat: (value) => this.resolveFeat(value),
      talent: (value) => this.resolveTalent(value),
      forcePower: (value) => this.resolveForce(value, 'power'),
      forceTechnique: (value) => this.resolveForce(value, 'technique'),
      forceSecret: (value) => this.resolveForce(value, 'secret'),
      medicalSecret: (value) => this.resolveMedicalSecret(value),
    }[kind];

    const out = [];
    for (const value of values) {
      const resolved = resolver ? resolver(value) : null;
      if (resolved) {
        out.push({
          id: resolved.id,
          name: resolved.name,
          source: 'registry',
          category: resolved.category || null,
          tags: Array.isArray(resolved.tags) ? [...resolved.tags] : [],
          description: resolved.description || '',
          pack: resolved.pack || null,
          choiceMeta: resolved.system?.choiceMeta || null,
        });
        continue;
      }

      if (typeof value === 'string') {
        out.push({ id: value, name: value, source: 'selection' });
      } else if (value && typeof value === 'object') {
        out.push({
          id: value.id || value._id || value.name,
          name: value.name || value.id || value._id,
          source: value.source || 'selection',
          category: value.category || value.featType || value.type || null,
          tags: Array.isArray(value.tags) ? [...value.tags] : [],
          description: value.description || value.system?.description?.value || value.system?.description || '',
          choiceMeta: value.choiceMeta || value.system?.choiceMeta || null,
        });
      }
    }
    return out;
  }

  static async normalizeLanguageSelection(rawValues) {
    const values = Array.isArray(rawValues) ? rawValues : [];
    const out = [];
    for (const value of values) {
      const entry = await this.resolveLanguage(value);
      if (entry) {
        out.push({ id: entry.id || entry._id || entry.internalId || entry.slug || entry.name, name: entry.name, source: 'registry' });
        continue;
      }
      if (typeof value === 'string') {
        out.push({ id: value, name: value, source: 'selection' });
      } else if (value && typeof value === 'object') {
        out.push({ id: value.id || value._id || value.name, name: value.name || value.id, source: value.source || 'selection' });
      }
    }
    return uniqueBy(out);
  }

  static normalizeSkillSelection(skillsSelection) {
    const trained = Array.isArray(skillsSelection?.trained)
      ? skillsSelection.trained
      : Array.isArray(skillsSelection)
        ? skillsSelection
        : Object.keys(skillsSelection || {}).filter((key) => skillsSelection?.[key]?.trained);

    const resolved = trained.map((skill) => this.resolveSkill(skill)).filter(Boolean);
    const normalized = resolved.map((entry) => ({
      id: entry.id || entry._id || entry.key || entry.name,
      key: entry.key || entry.system?.key || String(entry.name || '').toLowerCase().replace(/\s+/g, '').replace(/[()]/g, ''),
      name: entry.name || entry.label || entry.id,
      ability: entry.ability || entry.system?.ability || null,
      source: 'selection',
    }));

    if (normalized.length === 0 && trained.length > 0) {
      swseLogger.debug('[ProgressionContentAuthority] Skill selection fell back to raw values', { trained });
      return trained.map((skill) => ({ id: skill, key: String(skill || '').toLowerCase(), name: String(skill || ''), source: 'selection' }));
    }

    return uniqueBy(normalized, (entry) => entry.key || entry.id);
  }

  static getStartingCredits({ classSelection = null, backgroundSelection = null } = {}) {
    const classModel = this.resolveClass(classSelection);
    const classCredits = Number(classModel?.startingCredits ?? classSelection?.credits ?? classSelection?.system?.startingCredits ?? 0) || 0;
    const backgroundCredits = Number(backgroundSelection?.credits ?? backgroundSelection?.system?.credits ?? 0) || 0;
    return classCredits + backgroundCredits;
  }
}
