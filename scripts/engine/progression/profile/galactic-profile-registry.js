/**
 * GalacticProfileRegistry — the ONE loader for Galactic Profiles v3.
 *
 * Replaces TemplateRegistry for profile data. Two independently cached, in-flight-coalesced loads:
 *
 *   loadCatalog()  27 KB generated browse catalog — what the picker renders (no per-card document fetches)
 *   loadProfiles() full runtime document, validated once against the single schema; invalid or duplicate
 *                  records are quarantined (never offered, never compiled) while valid ones keep working
 *
 * A rejected load clears its promise (retryable) but never discards previously cached good data.
 * Evidence (`galactic-profiles.evidence.json`) is deliberately never loaded here.
 */
import { validate } from './json-schema-lite.js';

export const PROFILE_BASE_PATH = 'systems/foundryvtt-swse/data/galactic-profiles/v3/';
export const PROFILE_FILES = Object.freeze({
  profiles: 'galactic-profiles.json',
  catalog: 'galactic-profiles.catalog.json',
  schema: 'galactic-profiles.schema.json'
});

async function defaultFetchJson(file) {
  const response = await fetch(`${PROFILE_BASE_PATH}${file}`);
  if (!response.ok) throw new Error(`Galactic Profiles: failed to load ${file}: HTTP ${response.status}`);
  return response.json();
}

export class GalacticProfileRegistry {
  static _catalog = null;
  static _catalogPromise = null;
  static _loaded = null;
  static _loadPromise = null;

  /** @returns {Promise<object[]>} catalog entries (display contract, one definition for all subtypes) */
  static async loadCatalog({ fetchJson = defaultFetchJson } = {}) {
    if (this._catalog) return this._catalog;
    if (!this._catalogPromise) {
      this._catalogPromise = fetchJson(PROFILE_FILES.catalog)
        .then(doc => {
          if (!Array.isArray(doc?.profiles)) throw new Error('Galactic Profiles: malformed catalog');
          this._catalog = doc.profiles;
          return this._catalog;
        })
        .finally(() => { this._catalogPromise = null; });
    }
    return this._catalogPromise;
  }

  /**
   * @returns {Promise<{byId:Map<string,object>, quarantined:{profileId:string,errors:string[]}[], total:number}>}
   */
  static async loadProfiles({ fetchJson = defaultFetchJson } = {}) {
    if (this._loaded) return this._loaded;
    if (!this._loadPromise) {
      this._loadPromise = Promise.all([fetchJson(PROFILE_FILES.profiles), fetchJson(PROFILE_FILES.schema)])
        .then(([doc, schema]) => {
          this._loaded = this.validateDocument(doc, schema);
          return this._loaded;
        })
        .finally(() => { this._loadPromise = null; });
    }
    return this._loadPromise;
  }

  /** Pure: validate a whole document record-by-record. Exposed for tests and tooling. */
  static validateDocument(doc, schema) {
    if (doc?.schemaVersion !== 3 || doc?.format !== 'swse.galactic-profiles.v3' || !Array.isArray(doc.profiles)) {
      throw new Error('Galactic Profiles: unsupported document header');
    }
    const byId = new Map();
    const quarantined = [];
    for (const profile of doc.profiles) {
      const id = profile?.profileId ?? '(missing id)';
      const errors = validate(schema.$defs.profile, profile, schema, `/${id}`);
      if (byId.has(id)) errors.push(`/${id} duplicate profileId`);
      if (errors.length) quarantined.push({ profileId: id, errors });
      else byId.set(id, profile);
    }
    return { byId, quarantined, total: doc.profiles.length };
  }

  /** @returns {Promise<object|null>} the validated profile, or null (unknown or quarantined) */
  static async getProfile(profileId, options) {
    return (await this.loadProfiles(options)).byId.get(profileId) ?? null;
  }

  /** Catalog entries filtered by EXACT subtype (the session's subtype); `subtype` is required. */
  static async listCatalog({ subtype, classKey = null } = {}, options) {
    if (!subtype) return [];
    const all = await this.loadCatalog(options);
    return all.filter(e => e.subtype === subtype && (!classKey || e.classKey === classKey));
  }

  static _clearCache() {
    this._catalog = null; this._catalogPromise = null; this._loaded = null; this._loadPromise = null;
  }
}
