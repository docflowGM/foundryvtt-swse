import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { slugify, stableJsonId } from "/systems/foundryvtt-swse/scripts/utils/stable-id.js";

/**
 * LanguageRegistry
 *
 * Languages are authored in JSON (data/languages.json) but also shipped as a
 * compendium pack (foundryvtt-swse.languages). Runtime prefers pack records for
 * canonical IDs/UUIDs, then merges the JSON catalog so a partial or degraded
 * LevelDB pack cannot silently shrink the available language list.
 */
export class LanguageRegistry {
  static _loaded = false;
  static _byName = new Map();
  static _byId = new Map();

  static async ensureLoaded() {
    if (this._loaded) return;
    this._loaded = true;
    this._byName.clear();
    this._byId.clear();

    let packCount = 0;

    // Prefer compendium documents where they exist so IDs and UUIDs remain
    // canonical, but do not return early: the JSON catalog fills any missing
    // records when a migrated pack is absent, empty, or only partially seeded.
    try {
      const systemId = game?.system?.id || 'foundryvtt-swse';
      const packKey = `${systemId}.languages`;
      const pack = game?.packs?.get(packKey);
      if (pack) {
        const idx = await pack.getIndex({ fields: ['name', 'img', 'system'] });
        for (const e of idx) {
          const sys = e.system || {};
          const cleanName = String(e.name || '').trim();
          if (!cleanName) continue;
          const slug = sys.slug || sys.id || slugify(cleanName);
          const id = e._id;
          const uuid = `Compendium.${pack.collection}.${id}`;
          const record = {
            _id: id,
            uuid,
            name: cleanName,
            img: e.img,
            ...sys,
            id: sys.id || slug,
            slug,
            internalId: id,
          };
          this._byName.set(cleanName, record);
          this._byId.set(id, record);
          packCount += 1;
        }
        SWSELogger.log(`LanguageRegistry: loaded ${packCount} canonical records from pack ${packKey}`);
      }
    } catch (e) {
      SWSELogger.warn('LanguageRegistry: failed to load language pack; continuing with JSON catalog', e);
    }

    let jsonCount = 0;
    let jsonAdded = 0;

    // Merge the complete authoring catalog. Existing pack-backed names are kept,
    // while their stable JSON IDs are also mapped to the same canonical record.
    try {
      const resp = await fetch('systems/foundryvtt-swse/data/languages.json');
      if (!resp.ok) {
        SWSELogger.warn('LanguageRegistry: failed to load languages.json');
      } else {
        const data = await resp.json();
        const categories = data?.categories || {};
        const localSet = new Set((data?.localLanguages || []).map((n) => String(n || '').trim()).filter(Boolean));
        const descriptions = data?.descriptions || {};
        const seen = new Set();

        const addLanguage = (name, categoryKey) => {
          const cleanName = String(name || '').trim();
          if (!cleanName || seen.has(cleanName)) return;
          seen.add(cleanName);
          jsonCount += 1;

          const slug = slugify(cleanName);
          const internalId = stableJsonId('language', slug);
          const existing = this._byName.get(cleanName);

          if (existing) {
            if (!existing.category) existing.category = categoryKey || null;
            if (!existing.description) existing.description = descriptions[cleanName] || '';
            if (existing.isLocal === undefined) existing.isLocal = localSet.has(cleanName);
            existing.jsonInternalId = internalId;
            this._byId.set(internalId, existing);
            return;
          }

          const record = {
            name: cleanName,
            slug,
            id: slug,
            category: categoryKey || null,
            description: descriptions[cleanName] || '',
            isLocal: localSet.has(cleanName),
            internalId,
            _id: internalId,
            uuid: null,
          };
          this._byName.set(cleanName, record);
          this._byId.set(internalId, record);
          jsonAdded += 1;
        };

        for (const [key, cat] of Object.entries(categories)) {
          for (const name of cat?.languages || []) addLanguage(name, key);
        }
      }
    } catch (e) {
      SWSELogger.error('LanguageRegistry: error loading languages.json', e);
    }

    SWSELogger.log('LanguageRegistry: catalog ready', {
      packCount,
      jsonCount,
      jsonAdded,
      total: this._byName.size,
    });
  }

  static async getByName(name) {
    await this.ensureLoaded();
    return this._byName.get(String(name || '').trim()) || null;
  }

  static async getById(id) {
    await this.ensureLoaded();
    return this._byId.get(String(id || '').trim()) || null;
  }

  static async getBySlug(slug) {
    await this.ensureLoaded();
    const normalized = String(slug || '').trim().toLowerCase();
    for (const record of this._byId.values()) {
      if (String(record?.slug || '').trim().toLowerCase() === normalized) return record;
    }
    return null;
  }

  static async resolve(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return (await this.getById(ref)) || (await this.getByName(ref)) || (await this.getBySlug(ref));
    }
    return (await this.getById(ref._id || ref.internalId || ref.id))
      || (await this.getByName(ref.name || ref.label))
      || (await this.getBySlug(ref.slug || ref.id));
  }

  static async all() {
    await this.ensureLoaded();
    return Array.from(this._byName.values());
  }
}
