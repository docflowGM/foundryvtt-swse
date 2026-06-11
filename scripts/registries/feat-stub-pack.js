/**
 * Feat Stub Pack (fallback compendium)
 *
 * FALLBACK ONLY. When Foundry cannot be made to register the native
 * `foundryvtt-swse.feats` LevelDB compendium (corrupted/skipped pack state),
 * this module populates a separate, freshly-named compendium —
 * `foundryvtt-swse.feats-stub` — so a browsable Feats compendium exists in the
 * sidebar again.
 *
 * Hard rules (mirrored from the design brief):
 *  - `data/feat-catalog.json` remains the single source of truth. This module
 *    does NOT introduce a second feat data source; it seeds the stub pack from
 *    the same catalog the native seeder uses.
 *  - The stub is only populated when the native feats pack is ABSENT from
 *    game.packs. If native feats registers, the stub is left untouched.
 *  - Seeded documents are fully-hydrated Item documents (the catalog already is
 *    a list of complete Item docs), but every doc also carries a stable
 *    reference back to its canonical feat record (`_id`, `system.slug`, and
 *    `flags.swse.featCatalogId` / `flags.swse.featSlug`).
 *  - On drop onto an actor, a stub feat is intercepted and re-hydrated from
 *    FeatRegistry (the SSOT) by that stable reference, so the actor always
 *    receives canonical feat data regardless of stub-doc completeness.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatPackSeeder } from "/systems/foundryvtt-swse/scripts/registries/feat-pack-seeder.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";

const NATIVE_PACK_NAME = "feats";
const STUB_PACK_NAME = "feats-stub";
const DEFAULT_BATCH_SIZE = 50;

function _isDebug() {
  if (globalThis.SWSE_DEBUG_COMPENDIUMS === true) return true;
  try { return game?.settings?.get?.("foundryvtt-swse", "debugMode") === true; } catch (_e) { return false; }
}

function _dlog(...args) {
  if (!_isDebug()) return;
  console.log("[SWSE-FEAT-STUB]", ...args);
}

export class FeatStubPack {
  static _activateInProgress = null;
  static _hydrationRegistered = false;

  static _systemId() {
    return game?.system?.id || "foundryvtt-swse";
  }

  static _packKeys(name, systemId = this._systemId()) {
    return Array.from(new Set([`${systemId}.${name}`, `foundryvtt-swse.${name}`]));
  }

  /** True when Foundry never registered the native feats compendium. */
  static isNativeFeatsMissing() {
    return !this._packKeys(NATIVE_PACK_NAME).some((key) => Boolean(game?.packs?.get?.(key)));
  }

  static resolveStubPack() {
    const packs = game?.packs;
    if (!packs) return null;
    for (const key of this._packKeys(STUB_PACK_NAME)) {
      const pack = packs.get(key);
      if (pack) return pack;
    }
    return Array.from(packs.values()).find((pack) => {
      const meta = pack?.metadata || {};
      const owner = meta.packageName || meta.package || pack?.collection?.split?.(".")?.[0];
      return (owner === this._systemId() || owner === "foundryvtt-swse") && meta.name === STUB_PACK_NAME;
    }) || null;
  }

  /**
   * Prepare a fully-hydrated stub Item document from a catalog record, stamped
   * with a stable reference back to the canonical feat.
   */
  static _prepareStubDoc(raw) {
    // Reuse the native seeder's normalization so icons/system shape stay identical.
    // Documents are fully hydrated (preferred), but every doc also carries the
    // deterministic reference keys used to match back to the canonical record.
    const doc = FeatPackSeeder._prepareDocument(raw);
    const catalogId = String(raw?._id || doc?._id || "").trim() || null;
    const slug = String(raw?.system?.slug || doc?.system?.slug || "").trim() || null;
    const canonicalUuid = FeatRegistry.canonicalUuidForSlug?.(slug) || (slug ? `swse.feat.${slug}` : null);
    doc.flags = doc.flags || {};
    doc.flags.swse = {
      ...(doc.flags.swse || {}),
      featStub: true,
      canonicalUuid,      // primary match authority (swse.feat.<slug>)
      featSlug: slug,     // secondary match authority
      featCatalogId: catalogId
    };
    return doc;
  }

  /**
   * Populate the stub pack from the catalog — but only if the native feats pack
   * is missing. Returns a structured summary.
   */
  static async activateIfNeeded(options = {}) {
    if (this._activateInProgress) return this._activateInProgress;
    this._activateInProgress = this._activateIfNeeded(options).finally(() => {
      this._activateInProgress = null;
    });
    return this._activateInProgress;
  }

  static async _activateIfNeeded({ force = false, reason = "auto", batchSize = DEFAULT_BATCH_SIZE } = {}) {
    const summary = { ok: false, reason, status: "unknown", attempted: 0, created: 0, errors: [] };

    // Fallback-only gate: never touch the stub while native feats is healthy.
    if (!force && !this.isNativeFeatsMissing()) {
      summary.ok = true;
      summary.status = "native-healthy-skipped";
      _dlog("Native feats pack is registered; stub activation skipped.");
      return summary;
    }

    const pack = this.resolveStubPack();
    if (!pack) {
      summary.status = "stub-pack-not-registered";
      SWSELogger.warn(
        `[FeatStubPack] Native feats missing AND the fallback "${STUB_PACK_NAME}" pack is also not registered. ` +
        `Confirm system.json declares packs/${STUB_PACK_NAME}.db and reload.`
      );
      return summary;
    }

    summary.collection = pack.collection || pack.metadata?.id || null;

    let indexSize = 0;
    try {
      const index = await pack.getIndex();
      indexSize = Number(index?.size ?? index?.length ?? 0);
    } catch (err) {
      summary.errors.push({ message: err?.message || String(err), phase: "getIndex" });
    }
    summary.indexBefore = indexSize;

    if (indexSize > 0 && !force) {
      summary.ok = true;
      summary.status = "already-populated";
      _dlog(`Stub pack already has ${indexSize} entries; nothing to do.`);
      return summary;
    }

    if (!game?.user?.isGM) {
      summary.status = "requires-gm";
      SWSELogger.warn("[FeatStubPack] Native feats missing; a GM must log in to populate the fallback Feats compendium.");
      return summary;
    }

    let catalogDocs;
    try {
      catalogDocs = await FeatPackSeeder.loadCatalog();
    } catch (err) {
      summary.status = "catalog-load-failed";
      summary.errors.push({ message: err?.message || String(err), phase: "loadCatalog" });
      SWSELogger.error("[FeatStubPack] Failed to load feat catalog for stub seeding:", err);
      return summary;
    }
    summary.attempted = catalogDocs.length;

    if (!catalogDocs.length) {
      summary.status = "empty-catalog";
      SWSELogger.warn("[FeatStubPack] Feat catalog returned 0 documents; nothing to seed.");
      return summary;
    }

    const collection = pack.collection || summary.collection || `${this._systemId()}.${STUB_PACK_NAME}`;
    const ItemDocument = globalThis.Item || CONFIG?.Item?.documentClass;
    if (!ItemDocument?.createDocuments) {
      summary.status = "missing-item-document-class";
      return summary;
    }

    const wasLocked = Boolean(pack.locked);
    try {
      await FeatPackSeeder._setPackLocked(pack, false);

      if (force && indexSize > 0) {
        const ids = Array.from(await pack.getIndex()).map((e) => e?._id || e?.id).filter(Boolean);
        for (let i = 0; i < ids.length; i += batchSize) {
          await ItemDocument.deleteDocuments(ids.slice(i, i + batchSize), { pack: collection });
        }
      }

      const prepared = catalogDocs.map((doc) => this._prepareStubDoc(doc));
      for (let i = 0; i < prepared.length; i += batchSize) {
        const chunk = prepared.slice(i, i + batchSize);
        try {
          const created = await ItemDocument.createDocuments(chunk, {
            pack: collection,
            keepId: true,
            keepEmbeddedIds: true
          });
          summary.created += Number(created?.length || 0);
        } catch (batchErr) {
          summary.errors.push({ message: batchErr?.message || String(batchErr), batchStart: i });
          SWSELogger.error(`[FeatStubPack] Stub seed batch starting at ${i} failed:`, batchErr);
        }
      }

      let afterSize = 0;
      try {
        const afterIndex = await pack.getIndex();
        afterSize = Number(afterIndex?.size ?? afterIndex?.length ?? 0);
      } catch (_e) { /* ignore */ }

      summary.indexAfter = afterSize;
      summary.ok = afterSize > 0;
      summary.status = summary.ok ? "stub-seeded" : "seeded-but-index-empty";
      SWSELogger.warn(
        `[FeatStubPack] Native feats pack missing — populated fallback "${collection}" with ${summary.created} feats ` +
        `from data/feat-catalog.json. The native Feats compendium is still unhealthy; this is a stopgap.`
      );
      return summary;
    } catch (err) {
      summary.status = "failed";
      summary.errors.push({ message: err?.message || String(err), stack: err?.stack || null });
      SWSELogger.error("[FeatStubPack] Failed to populate stub feats pack:", err);
      return summary;
    } finally {
      if (wasLocked) await FeatPackSeeder._setPackLocked(pack, true).catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // Drop-time hydration
  // -------------------------------------------------------------------------

  /** Does this incoming item data originate from the stub fallback pack? */
  static _isStubFeatData(item, data) {
    const type = data?.type || item?.type;
    if (type !== "feat") return false;
    const swseFlags = data?.flags?.swse || item?.flags?.swse || {};
    if (swseFlags.featStub === true) return true;
    const source = String(
      data?._stats?.compendiumSource ||
      data?.flags?.core?.sourceId ||
      item?._stats?.compendiumSource || ""
    );
    return new RegExp(`\\.${STUB_PACK_NAME}\\.`).test(source);
  }

  /**
   * preCreateItem hook. When a stub feat is dropped onto an actor, replace its
   * source with the canonical record from FeatRegistry (the SSOT) by stable
   * reference. Synchronous: Foundry does not await preCreate hooks, so all
   * mutation goes through item.updateSource() before the document is created.
   */
  static onPreCreateItem(item, data, _options, _userId) {
    try {
      // Only hydrate feats being embedded on an Actor (a drop), not world/pack items.
      const parent = item?.parent;
      if (!parent || parent.documentName !== "Actor") return;
      if (!this._isStubFeatData(item, data)) return;

      const swseFlags = data?.flags?.swse || item?.flags?.swse || {};
      const canonicalUuid = swseFlags.canonicalUuid || null;
      const slug = swseFlags.featSlug || data?.system?.slug || null;
      const name = data?.name || item?.name || null;
      const catalogId = swseFlags.featCatalogId || data?._id || item?._id || null;

      // Resolution priority (per design brief):
      //   1. canonical UUID (swse.feat.<slug>) — primary authority
      //   2. stable slug — secondary authority
      //   3. name — diagnostic fallback only
      const canonical =
        (canonicalUuid ? FeatRegistry.getCanonicalItemData?.(canonicalUuid) : null) ||
        (slug ? FeatRegistry.getCanonicalItemData?.(slug) : null) ||
        (name ? FeatRegistry.getCanonicalItemData?.(name) : null);

      if (!canonical) {
        // No canonical record found; leave the (already-hydrated) stub as-is but
        // clear the stub marker so it is not re-processed.
        item.updateSource({ "flags.swse.featStub": false });
        _dlog(`No FeatRegistry match for stub feat "${name}" (uuid=${canonicalUuid}, slug=${slug}, id=${catalogId}); left as-is.`);
        return;
      }

      const update = {
        name: canonical.name,
        img: canonical.img,
        system: canonical.system,
        "flags.swse.featStub": false,
        "flags.swse.hydratedFromCatalog": true,
        "flags.swse.canonicalUuid": canonical.canonicalUuid || canonicalUuid,
        "flags.swse.featSlug": canonical.slug || slug,
        "flags.swse.featCatalogId": canonical.id || catalogId
      };
      // Only override effects when the canonical record actually carries them and
      // the incoming data does not, so we never strip a fully-hydrated stub.
      const incomingEffects = Array.isArray(data?.effects) ? data.effects : [];
      if (canonical.effects?.length && !incomingEffects.length) {
        update.effects = canonical.effects;
      }

      item.updateSource(update);
      _dlog(`Hydrated stub feat "${name}" from FeatRegistry SSOT.`);
    } catch (err) {
      SWSELogger.warn("[FeatStubPack] onPreCreateItem hydration failed; allowing original drop:", err);
    }
  }

  static registerHydrationHook() {
    if (this._hydrationRegistered) return;
    this._hydrationRegistered = true;
    Hooks.on("preCreateItem", (item, data, options, userId) => this.onPreCreateItem(item, data, options, userId));
  }
}

export default FeatStubPack;
