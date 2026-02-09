import { SWSELogger } from '../utils/logger.js';
import { slugify, stableJsonId } from '../utils/stable-id.js';

/**
 * BackgroundRegistry
 *
 * Backgrounds are authored in JSON (data/backgrounds.json) but also shipped as
 * a compendium pack (foundryvtt-swse.backgrounds). Runtime prefers the pack so
 * `_id` and `uuid` are canonical and stable, while preserving slug/name for UI.
 */
export class BackgroundRegistry {
  static _loaded = false;
  static _bySlug = new Map();
  static _byId = new Map();

  static async ensureLoaded() {
    if (this._loaded) {return;}
    this._loaded = true;

    // Prefer compendium pack at runtime.
    try {
      const systemId = game?.system?.id || 'foundryvtt-swse';
      const packKey = `${systemId}.backgrounds`;
      const pack = game?.packs?.get(packKey);
      if (pack) {
        const idx = await pack.getIndex({ fields: ['name', 'img', 'system'] });
        for (const e of idx) {
          const sys = e.system || {};
          const slug = sys.slug || sys.id || slugify(e.name);
          const id = e._id;
          const uuid = `Compendium.${pack.collection}.${id}`;
          const record = {
            _id: id,
            uuid,
            name: e.name,
            img: e.img,
            ...sys,
            id: sys.id || slug,
            slug,
            internalId: id
          };
          this._bySlug.set(slug, record);
          this._byId.set(id, record);
        }
        SWSELogger.log(`BackgroundRegistry: loaded ${this._bySlug.size} from pack ${packKey}`);
        return;
      }
    } catch (e) {
      SWSELogger.warn('BackgroundRegistry: failed to load pack, falling back to JSON', e);
    }

    // Fallback: JSON authoring data.
    try {
      const resp = await fetch('systems/foundryvtt-swse/data/backgrounds.json');
      if (!resp.ok) {
        SWSELogger.warn('BackgroundRegistry: failed to load backgrounds.json');
        return;
      }
      const data = await resp.json();

      const flat = [];
      if (Array.isArray(data)) {
        flat.push(...data);
      } else if (data && typeof data === 'object') {
        for (const group of Object.values(data)) {
          if (!group) {continue;}
          if (Array.isArray(group)) {
            flat.push(...group);
          } else if (typeof group === 'object') {
            flat.push(...Object.values(group));
          }
        }
      }

      for (const bg of flat) {
        if (!bg) {continue;}
        const slug = bg.id || slugify(bg.name);
        const internalId = stableJsonId('background', slug);
        const record = {
          ...bg,
          id: slug,
          slug,
          internalId,
          _id: internalId,
          uuid: null
        };
        this._bySlug.set(slug, record);
        this._byId.set(internalId, record);
      }

      SWSELogger.log(`BackgroundRegistry: loaded ${this._bySlug.size} from JSON`);
    } catch (e) {
      SWSELogger.error('BackgroundRegistry: error loading backgrounds.json', e);
    }
  }

  static async getBySlug(slug) {
    await this.ensureLoaded();
    return this._bySlug.get(slug) || null;
  }

  static async getById(id) {
    await this.ensureLoaded();
    return this._byId.get(id) || null;
  }

  static async all() {
    await this.ensureLoaded();
    return Array.from(this._bySlug.values());
  }
}
