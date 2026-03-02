import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { slugify, stableJsonId } from "/systems/foundryvtt-swse/scripts/utils/stable-id.js";

/**
 * LanguageRegistry
 *
 * Languages are authored in JSON (data/languages.json) but also shipped as a
 * compendium pack (foundryvtt-swse.languages). Runtime prefers the pack so
 * `_id` and `uuid` are canonical and stable.
 */
export class LanguageRegistry {
  static _loaded = false;
  static _byName = new Map();
  static _byId = new Map();

  static async ensureLoaded() {
    if (this._loaded) {return;}
    this._loaded = true;

    // Prefer compendium pack at runtime.
    try {
      const systemId = game?.system?.id || 'foundryvtt-swse';
      const packKey = `${systemId}.languages`;
      const pack = game?.packs?.get(packKey);
      if (pack) {
        const idx = await pack.getIndex({ fields: ['name', 'img', 'system'] });
        for (const e of idx) {
          const sys = e.system || {};
          const cleanName = String(e.name || '').trim();
          if (!cleanName) {continue;}
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
            internalId: id
          };
          this._byName.set(cleanName, record);
          this._byId.set(id, record);
        }
        SWSELogger.log(`LanguageRegistry: loaded ${this._byName.size} from pack ${packKey}`);
        return;
      }
    } catch (e) {
      SWSELogger.warn('LanguageRegistry: failed to load pack, falling back to JSON', e);
    }

    // Fallback: JSON authoring data.
    try {
      const resp = await fetch('systems/foundryvtt-swse/data/languages.json');
      if (!resp.ok) {
        SWSELogger.warn('LanguageRegistry: failed to load languages.json');
        return;
      }
      const data = await resp.json();
      const categories = data?.categories || {};
      const localSet = new Set((data?.localLanguages || []).map((n) => String(n || '').trim()).filter(Boolean));

      const seen = new Set();
      const addLanguage = (name, categoryKey) => {
        const cleanName = String(name || '').trim();
        if (!cleanName) {return;}
        if (seen.has(cleanName)) {return;}
        seen.add(cleanName);

        const slug = slugify(cleanName);
        const internalId = stableJsonId('language', slug);
        const record = {
          name: cleanName,
          slug,
          id: slug,
          category: categoryKey || null,
          isLocal: localSet.has(cleanName),
          internalId,
          _id: internalId,
          uuid: null
        };
        this._byName.set(cleanName, record);
        this._byId.set(internalId, record);
      };

      for (const [key, cat] of Object.entries(categories)) {
        const langs = cat?.languages || [];
        for (const name of langs) {addLanguage(name, key);}
      }

      SWSELogger.log(`LanguageRegistry: loaded ${this._byName.size} from JSON`);
    } catch (e) {
      SWSELogger.error('LanguageRegistry: error loading languages.json', e);
    }
  }

  static async getByName(name) {
    await this.ensureLoaded();
    return this._byName.get(String(name || '').trim()) || null;
  }

  static async getById(id) {
    await this.ensureLoaded();
    return this._byId.get(String(id || '').trim()) || null;
  }

  static async all() {
    await this.ensureLoaded();
    return Array.from(this._byName.values());
  }
}
