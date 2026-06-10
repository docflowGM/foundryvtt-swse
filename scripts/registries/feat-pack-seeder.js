/**
 * Feat Pack Seeder
 *
 * Controlled recovery path for the v13 pack-migration seam where the system
 * compendium key exists but its migrated LevelDB store is empty. The sanitized
 * feat catalog is served from data/feat-catalog.json, then written through
 * Foundry's own compendium API so the server creates/updates the LevelDB pack.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const FEAT_PACK_NAME = "feats";
const FEAT_CATALOG_PATH = "data/feat-catalog.json";
const DEFAULT_BATCH_SIZE = 50;

export class FeatPackSeeder {
    static _catalogCache = null;
    static _seedInProgress = null;

    static getCatalogUrl(systemId = game?.system?.id || "foundryvtt-swse") {
        return `/systems/${systemId}/${FEAT_CATALOG_PATH}`;
    }

    static resolvePack(systemId = game?.system?.id || "foundryvtt-swse") {
        const packs = game?.packs;
        if (!packs) return null;
        return packs.get(`${systemId}.${FEAT_PACK_NAME}`)
            || packs.get(`foundryvtt-swse.${FEAT_PACK_NAME}`)
            || Array.from(packs.values()).find((pack) => {
                const meta = pack?.metadata || {};
                const owner = meta.packageName || meta.package || pack?.collection?.split?.(".")?.[0];
                return (owner === systemId || owner === "foundryvtt-swse") && meta.name === FEAT_PACK_NAME;
            })
            || null;
    }

    static async loadCatalog({ force = false } = {}) {
        if (this._catalogCache && !force) return this._catalogCache;

        const systemId = game?.system?.id || "foundryvtt-swse";
        const url = `${this.getCatalogUrl(systemId)}?swseFeatCatalog=${Date.now()}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Unable to fetch ${FEAT_CATALOG_PATH}: HTTP ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const docs = Array.isArray(data) ? data : Array.isArray(data?.documents) ? data.documents : [];
        this._catalogCache = docs.filter((doc) => doc?.name && (doc.type || "feat") === "feat");
        return this._catalogCache;
    }

    static async inspectPack(pack = this.resolvePack()) {
        if (!pack) return { exists: false, indexSize: 0, collection: null, metadata: null };
        const index = await pack.getIndex({ fields: ["name", "type", "img", "system.slug", "system.iconPath"] });
        return {
            exists: true,
            indexSize: Number(index?.size ?? index?.length ?? 0),
            collection: pack.collection || pack.metadata?.id || null,
            locked: Boolean(pack.locked),
            metadata: pack.metadata || null
        };
    }

    static async seedIfEmpty(options = {}) {
        if (this._seedInProgress) return this._seedInProgress;
        this._seedInProgress = this._seedIfEmpty(options).finally(() => {
            this._seedInProgress = null;
        });
        return this._seedInProgress;
    }

    static async _seedIfEmpty({ pack = null, force = false, reason = "manual", batchSize = DEFAULT_BATCH_SIZE } = {}) {
        pack ||= this.resolvePack();
        const before = await this.inspectPack(pack);
        const summary = {
            ok: false,
            reason,
            status: "unknown",
            collection: before.collection,
            indexBefore: before.indexSize,
            attempted: 0,
            created: 0,
            errors: []
        };

        if (!pack) {
            summary.status = "missing-pack";
            SWSELogger.warn("[FeatPackSeeder] Cannot seed feats because foundryvtt-swse.feats is not registered.", summary);
            return summary;
        }

        if (before.indexSize > 0 && !force) {
            summary.ok = true;
            summary.status = "already-populated";
            SWSELogger.log(`[FeatPackSeeder] Feats pack already contains ${before.indexSize} entries; seed skipped.`);
            return summary;
        }

        if (!game?.user?.isGM) {
            summary.status = "requires-gm";
            SWSELogger.warn("[FeatPackSeeder] Feats pack is empty, but only a GM client can seed the system compendium.", summary);
            return summary;
        }

        const catalogDocs = await this.loadCatalog();
        summary.attempted = catalogDocs.length;
        if (!catalogDocs.length) {
            summary.status = "empty-catalog";
            SWSELogger.warn("[FeatPackSeeder] Served feat catalog is empty; nothing to seed.", summary);
            return summary;
        }

        const collection = pack.collection || before.collection || `${game?.system?.id || "foundryvtt-swse"}.${FEAT_PACK_NAME}`;
        const ItemDocument = globalThis.Item || CONFIG?.Item?.documentClass;
        if (!ItemDocument?.createDocuments) {
            summary.status = "missing-item-document-class";
            SWSELogger.warn("[FeatPackSeeder] Item document class is unavailable; cannot seed feats.", summary);
            return summary;
        }

        const wasLocked = Boolean(pack.locked);
        try {
            await this._setPackLocked(pack, false);

            if (force && before.indexSize > 0) {
                const ids = Array.from(await pack.getIndex()).map((entry) => entry?._id || entry?.id).filter(Boolean);
                for (let i = 0; i < ids.length; i += batchSize) {
                    await ItemDocument.deleteDocuments(ids.slice(i, i + batchSize), { pack: collection });
                }
            }

            const prepared = catalogDocs.map((doc) => this._prepareDocument(doc));
            for (let i = 0; i < prepared.length; i += batchSize) {
                const chunk = prepared.slice(i, i + batchSize);
                const created = await ItemDocument.createDocuments(chunk, {
                    pack: collection,
                    keepId: true,
                    keepEmbeddedIds: true
                });
                summary.created += Number(created?.length || 0);
            }

            const after = await this.inspectPack(pack);
            summary.ok = after.indexSize > 0;
            summary.status = summary.ok ? "seeded" : "seeded-but-index-empty";
            summary.indexAfter = after.indexSize;
            SWSELogger.log("[FeatPackSeeder] Feats pack seed result:", summary);
            return summary;
        } catch (err) {
            summary.status = "failed";
            summary.error = err?.message || String(err);
            summary.errors.push({ message: summary.error, stack: err?.stack || null });
            SWSELogger.error("[FeatPackSeeder] Failed to seed feats pack:", err, summary);
            return summary;
        } finally {
            if (wasLocked) await this._setPackLocked(pack, true).catch(() => {});
        }
    }

    static async repairIconsFromCatalog({ pack = this.resolvePack(), docs = null, reason = 'manual icon repair', batchSize = DEFAULT_BATCH_SIZE } = {}) {
        const summary = {
            ok: false,
            reason,
            status: 'unknown',
            collection: pack?.collection || pack?.metadata?.id || null,
            inspected: 0,
            attempted: 0,
            updated: 0,
            errors: []
        };

        if (!pack) {
            summary.status = 'missing-pack';
            return summary;
        }

        if (!game?.user?.isGM) {
            summary.status = 'requires-gm';
            return summary;
        }

        const catalogDocs = await this.loadCatalog();
        if (!catalogDocs.length) {
            summary.status = 'empty-catalog';
            return summary;
        }

        docs ||= await pack.getDocuments();
        summary.inspected = docs.length;

        const byId = new Map();
        const byName = new Map();
        for (const doc of catalogDocs) {
            const prepared = this._prepareDocument(doc);
            if (prepared._id) byId.set(String(prepared._id), prepared);
            if (prepared.name) byName.set(String(prepared.name).toLowerCase(), prepared);
        }

        const updates = [];
        for (const doc of docs || []) {
            const id = String(doc?._id || doc?.id || '');
            const name = String(doc?.name || '').toLowerCase();
            const source = byId.get(id) || byName.get(name);
            const sourceImg = String(source?.img || '').trim();
            if (!sourceImg) continue;

            const currentImg = String(doc?.img || '').trim();
            const currentSystemIcon = String(doc?.system?.iconPath || '').trim();
            if (currentImg === sourceImg && currentSystemIcon === sourceImg) continue;

            updates.push({
                _id: doc.id || doc._id,
                img: sourceImg,
                'system.iconPath': sourceImg
            });
        }

        summary.attempted = updates.length;
        if (!updates.length) {
            summary.ok = true;
            summary.status = 'no-icon-repair-needed';
            return summary;
        }

        const collection = pack.collection || `${game?.system?.id || 'foundryvtt-swse'}.${FEAT_PACK_NAME}`;
        const ItemDocument = globalThis.Item || CONFIG?.Item?.documentClass;
        if (!ItemDocument?.updateDocuments) {
            summary.status = 'missing-item-document-class';
            return summary;
        }

        const wasLocked = Boolean(pack.locked);
        try {
            await this._setPackLocked(pack, false);
            for (let i = 0; i < updates.length; i += batchSize) {
                const chunk = updates.slice(i, i + batchSize);
                const updated = await ItemDocument.updateDocuments(chunk, { pack: collection });
                summary.updated += Number(updated?.length || 0);
            }
            summary.ok = true;
            summary.status = 'icons-repaired';
            SWSELogger.log('[FeatPackSeeder] Feat pack icon repair result:', summary);
            return summary;
        } catch (err) {
            summary.status = 'failed';
            summary.error = err?.message || String(err);
            summary.errors.push({ message: summary.error, stack: err?.stack || null });
            SWSELogger.error('[FeatPackSeeder] Failed to repair feat pack icons:', err, summary);
            return summary;
        } finally {
            if (wasLocked) await this._setPackLocked(pack, true).catch(() => {});
        }
    }

    static _prepareDocument(doc) {
        const clone = foundry?.utils?.deepClone ? foundry.utils.deepClone(doc) : JSON.parse(JSON.stringify(doc));
        clone.type = clone.type || "feat";
        clone.system ||= {};
        const sourceImg = String(clone.img || clone.system?.img || clone.system?.iconPath || clone.system?.assetIcon || 'icons/svg/upgrade.svg').trim();
        clone.img = sourceImg || 'icons/svg/upgrade.svg';
        clone.system.iconPath = clone.img;
        clone.effects = Array.isArray(clone.effects) ? clone.effects : [];
        clone.flags ||= {};
        clone.ownership ||= { default: 0 };
        delete clone._key;
        delete clone.id;
        return clone;
    }

    static async _setPackLocked(pack, locked) {
        if (!pack) return;
        if (pack.locked === locked) return;
        if (typeof pack.configure === "function") {
            await pack.configure({ locked });
        } else {
            pack.locked = locked;
        }
    }
}

export async function seedFeatPackIfEmpty(options = {}) {
    return FeatPackSeeder.seedIfEmpty(options);
}

export async function loadFeatCatalogDocuments(options = {}) {
    return FeatPackSeeder.loadCatalog(options);
}
