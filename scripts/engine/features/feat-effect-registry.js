/**
 * FeatEffectRegistry
 *
 * Source of truth for the MECHANICAL effect definitions that were formerly
 * stored as embedded ActiveEffects inside feat compendium documents.
 *
 * Architectural contract:
 *   - FeatRegistry        owns *what feats exist* (feat identity).
 *   - FeatEffectRegistry  owns *what feats do mechanically* (effect definitions).
 *
 * This registry deliberately does NOT enumerate or own feat identity. It maps a
 * feat (resolved by id / stable key / name) to its mechanical effect templates,
 * cross-referencing FeatRegistry only to canonicalize a name when needed.
 *
 * Definitions are loaded from data/feat-effects.json via a static JSON import
 * (NOT a runtime fetch of any pack DB).
 */

import FEAT_EFFECTS from "/systems/foundryvtt-swse/data/feat-effects.json" with { type: "json" };
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * @typedef {Object} FeatEffectDefinition
 * @property {string} featId    Stable compendium _id of the source feat.
 * @property {string} featName  Human-readable feat name.
 * @property {string} featKey   Stable slug key (e.g. "improved-defenses").
 * @property {Array<Object>} effects  ActiveEffect templates (changes/flags/duration/etc.).
 */

export class FeatEffectRegistry {
    static _initialized = false;
    static _byKey = new Map();     // slug -> definition
    static _byFeatId = new Map();  // feat _id -> definition
    static _byName = new Map();    // lowercase feat name -> definition

    /**
     * Build indexes from the imported definitions. Idempotent.
     */
    static initialize() {
        if (this._initialized) return;

        this._byKey.clear();
        this._byFeatId.clear();
        this._byName.clear();

        const defs = FEAT_EFFECTS?.definitions || {};
        for (const [key, def] of Object.entries(defs)) {
            if (!def) continue;
            this._byKey.set(key, def);
            if (def.featId) this._byFeatId.set(def.featId, def);
            if (def.featName) this._byName.set(String(def.featName).toLowerCase(), def);
        }

        this._initialized = true;
        SWSELogger.log(
            `[FeatEffectRegistry] Initialized: ${this._byKey.size} feat effect definitions, ${this.effectCount()} effects`
        );
    }

    static _slug(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Resolve a feat reference to its effect definition.
     * @param {Object|string} ref  A feat Item/document, or an _id / name / slug string.
     * @returns {FeatEffectDefinition|null}
     */
    static getForFeat(ref) {
        if (!this._initialized) this.initialize();
        if (!ref) return null;

        if (typeof ref === 'string') {
            const direct = this._byFeatId.get(ref)
                || this._byKey.get(this._slug(ref))
                || this._byName.get(ref.toLowerCase());
            if (direct) return direct;
            return this._resolveViaFeatRegistry(ref);
        }

        const id = ref._id || ref.id || ref.system?.id;
        const name = ref.name;
        const byId = id && this._byFeatId.get(id);
        if (byId) return byId;
        const byName = name && this._byName.get(String(name).toLowerCase());
        if (byName) return byName;
        const bySlug = name && this._byKey.get(this._slug(name));
        if (bySlug) return bySlug;
        return name ? this._resolveViaFeatRegistry(name) : null;
    }

    /**
     * Cross-reference FeatRegistry (feat identity SSOT) to canonicalize a name/id
     * before re-attempting the effect lookup. Never enumerates feats here.
     * @private
     */
    static _resolveViaFeatRegistry(nameOrId) {
        try {
            const entry = FeatRegistry?.getById?.(nameOrId) || FeatRegistry?.getByName?.(nameOrId);
            if (!entry) return null;
            return this._byFeatId.get(entry.id)
                || (entry.name && this._byName.get(String(entry.name).toLowerCase()))
                || null;
        } catch {
            return null;
        }
    }

    /** @returns {boolean} */
    static has(ref) {
        return !!this.getForFeat(ref);
    }

    /** @returns {Array<Object>} effect templates for a feat (empty if none). */
    static getEffects(ref) {
        return this.getForFeat(ref)?.effects || [];
    }

    /** @returns {FeatEffectDefinition[]} all definitions. */
    static getAll() {
        if (!this._initialized) this.initialize();
        return Array.from(this._byKey.values());
    }

    /** @returns {number} total number of effect templates across all definitions. */
    static effectCount() {
        let n = 0;
        for (const def of this._byKey.values()) n += def.effects?.length || 0;
        return n;
    }

    /** @returns {boolean} */
    static isInitialized() {
        return this._initialized;
    }
}
