/**
 * sentinel-mall-cop.js — Passive monitoring layer for Store system health
 *
 * "The Mall Cop" watches the Store and reports issues through SentinelEngine.
 *
 * Monitors:
 * 1. Pack availability (are required packs present?)
 * 2. Document hydration (do items have required fields?)
 * 3. Data shape consistency (cost field ambiguity, missing categories)
 * 4. UI render health (empty stores, missing images/names)
 * 5. Cache age and validity
 * 6. Governance compliance (purchase paths use ActorEngine)
 *
 * Reports via SentinelEngine (no auto-fixes, no DOM mutation, dev-mode)
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export class SentinelMallCop {
  /**
   * Initialize the mall-cop layer
   * Called once during Foundry ready hook
   */
  static init() {
    // Register this layer with Sentinel
    SentinelEngine.registerLayer("mall-cop", {
      enabled: true,
      readOnly: true,
      description: "Store system health monitoring (read-only, passive)"
    });

    // Hook into Store loads
    Hooks.on("swse-store-inventory-loaded", (inventory, metadata) => {
      this.monitorStoreLoad(inventory, metadata);
    });

    // Hook into Store renders (if available)
    Hooks.on("swse-store-rendered", (storeApp) => {
      this.monitorStoreRender(storeApp);
    });

    console.log("[SWSE Sentinel] Mall-Cop layer initialized (passive monitoring enabled)");
  }

  /* ============================================================
     PACK AVAILABILITY MONITORING
  ============================================================ */

  /**
   * Validate that required compendium packs are present and accessible
   * @param {Array<string>} packNames - Pack names to check
   * @returns {Array<Object>} Array of pack status reports
   */
  static validatePackAvailability(packNames = null) {
    const DEFAULT_PACKS = [
      'foundryvtt-swse.weapons',
      'foundryvtt-swse.armor',
      'foundryvtt-swse.equipment',
      'foundryvtt-swse.droids'
    ];

    const packsToCheck = packNames || DEFAULT_PACKS;
    const reports = [];

    for (const packName of packsToCheck) {
      const pack = game.packs.get(packName);

      if (!pack) {
        const report = {
          aggregationKey: `mall-cop-missing-pack-${packName}`,
          severity: "ERROR",
          layer: "mall-cop",
          title: `Missing compendium pack: ${packName}`,
          details: {
            packName,
            present: false,
            reason: "Pack not found in game.packs"
          },
          timestamp: Date.now()
        };
        reports.push(report);
        continue;
      }

      // Check if pack is locked/hidden
      if (pack.locked || !pack.visible) {
        const report = {
          aggregationKey: `mall-cop-pack-locked-${packName}`,
          severity: "WARN",
          layer: "mall-cop",
          title: `Compendium pack unavailable: ${packName}`,
          details: {
            packName,
            locked: pack.locked,
            visible: pack.visible
          },
          timestamp: Date.now()
        };
        reports.push(report);
      }
    }

    // Report to Sentinel
    for (const report of reports) {
      SentinelEngine.report(report);
    }

    return reports;
  }

  /* ============================================================
     DOCUMENT HYDRATION MONITORING
  ============================================================ */

  /**
   * Validate that items have required fields (sampling-based)
   * @param {Array<Object>} items - Normalized store items
   * @param {number} sampleSize - How many items to check (default: 25)
   * @returns {Object} Validation results
   */
  static validateDocumentHydration(items, sampleSize = 25) {
    if (!items || items.length === 0) {
      SentinelEngine.report({
        aggregationKey: "mall-cop-empty-inventory",
        severity: "WARN",
        layer: "mall-cop",
        title: "Store inventory is empty",
        details: { itemCount: 0 },
        timestamp: Date.now()
      });
      return { validated: 0, errors: [] };
    }

    const sample = items.slice(0, Math.min(sampleSize, items.length));
    const requiredFields = ["name", "type", "img"];
    const optionalButWarn = ["cost", "category"];
    const errors = [];

    for (const item of sample) {
      // Check required fields
      for (const field of requiredFields) {
        if (!item[field] || (typeof item[field] === "string" && item[field].trim() === "")) {
          errors.push({
            itemId: item.id,
            itemName: item.name || "Unknown",
            field,
            value: item[field],
            type: "MISSING_REQUIRED"
          });
        }
      }

      // Warn on optional fields
      for (const field of optionalButWarn) {
        if (!item[field] || item[field] === null) {
          errors.push({
            itemId: item.id,
            itemName: item.name || "Unknown",
            field,
            value: item[field],
            type: "MISSING_OPTIONAL"
          });
        }
      }

      // Check data shape inconsistencies
      if (item.system) {
        const hasCost = item.system.cost !== undefined && item.system.cost !== null;
        const hasPrice = item.system.price !== undefined && item.system.price !== null;

        if (hasCost && hasPrice && item.system.cost !== item.system.price) {
          errors.push({
            itemId: item.id,
            itemName: item.name,
            field: "cost vs price mismatch",
            value: { cost: item.system.cost, price: item.system.price },
            type: "DATA_SHAPE_INCONSISTENCY"
          });
        }
      }
    }

    // Report aggregated errors
    const missingRequired = errors.filter(e => e.type === "MISSING_REQUIRED");
    if (missingRequired.length > 0) {
      SentinelEngine.report({
        aggregationKey: "mall-cop-missing-required-fields",
        severity: "WARN",
        layer: "mall-cop",
        title: `${missingRequired.length} items missing required fields`,
        details: {
          sampleSize: sample.length,
          totalItems: items.length,
          errors: missingRequired.slice(0, 5) // Limit to first 5
        },
        timestamp: Date.now()
      });
    }

    const inconsistent = errors.filter(e => e.type === "DATA_SHAPE_INCONSISTENCY");
    if (inconsistent.length > 0) {
      SentinelEngine.report({
        aggregationKey: "mall-cop-data-shape-inconsistent",
        severity: "WARN",
        layer: "mall-cop",
        title: `${inconsistent.length} items have cost/price mismatch`,
        details: {
          errors: inconsistent.slice(0, 5)
        },
        timestamp: Date.now()
      });
    }

    return {
      validated: sample.length,
      totalItems: items.length,
      errorCount: errors.length,
      errors
    };
  }

  /* ============================================================
     CACHE HEALTH MONITORING
  ============================================================ */

  /**
   * Monitor store cache age and validity
   * @param {Object} metadata - Store metadata (includes loadedAt timestamp)
   */
  static validateCacheHealth(metadata) {
    if (!metadata || !metadata.loadedAt) {
      SentinelEngine.report({
        aggregationKey: "mall-cop-cache-metadata-missing",
        severity: "WARN",
        layer: "mall-cop",
        title: "Store cache metadata missing",
        details: { metadata },
        timestamp: Date.now()
      });
      return;
    }

    const cacheAge = Date.now() - metadata.loadedAt;
    const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
    const CACHE_WARNING_THRESHOLD = 1000 * 60 * 60 * 12; // 12 hours

    if (cacheAge > CACHE_WARNING_THRESHOLD) {
      SentinelEngine.report({
        aggregationKey: "mall-cop-cache-stale",
        severity: "INFO",
        layer: "mall-cop",
        title: `Store cache is ${Math.round(cacheAge / 1000 / 60 / 60)} hours old`,
        details: {
          cacheAge: Math.round(cacheAge / 1000 / 60), // minutes
          ttl: Math.round(CACHE_TTL / 1000 / 60 / 60), // hours
          loadedAt: new Date(metadata.loadedAt).toISOString()
        },
        timestamp: Date.now()
      });
    }

    // Report cache stats
    SentinelEngine.report({
      aggregationKey: "mall-cop-cache-health",
      severity: "INFO",
      layer: "mall-cop",
      title: "Store cache health status",
      details: {
        age: Math.round(cacheAge / 1000 / 60), // minutes
        itemCount: metadata.itemCount || 0,
        actorCount: metadata.actorCount || 0,
        packsLoaded: metadata.packsUsed ? metadata.packsUsed.length : 0
      },
      timestamp: Date.now(),
      devOnly: true // Only show in dev mode
    });
  }

  /* ============================================================
     STORE RENDER MONITORING
  ============================================================ */

  /**
   * Monitor store render results for empty state
   * @param {SWSEStore} storeApp - Store application instance
   */
  static monitorStoreRender(storeApp) {
    if (!storeApp || !storeApp.element) return;

    // Check if store is empty
    const cards = storeApp.element.querySelectorAll(".store-card, .swse-store-card");
    const itemCount = cards.length;

    if (itemCount === 0) {
      const filterActive = storeApp.element.querySelector("[data-filter]")?.value;

      SentinelEngine.report({
        aggregationKey: `mall-cop-empty-store-${storeApp.constructor.name}`,
        severity: "WARN",
        layer: "mall-cop",
        title: "Store render resulted in zero items",
        details: {
          appClass: storeApp.constructor.name,
          filterActive,
          hasItems: (storeApp.storeInventory?.allItems?.length || 0)
        },
        timestamp: Date.now()
      });
    }

    // Check for missing images in cards (sample)
    const sample = Array.from(cards).slice(0, 10);
    const missingImages = sample.filter(card => {
      const img = card.querySelector("img");
      return !img || img.src.includes("mystery-man");
    });

    if (missingImages.length > 0) {
      SentinelEngine.report({
        aggregationKey: "mall-cop-missing-item-images",
        severity: "INFO",
        layer: "mall-cop",
        title: `${missingImages.length}/${sample.length} sampled cards missing images`,
        details: {
          sampleSize: sample.length,
          missingCount: missingImages.length,
          totalCards: itemCount
        },
        timestamp: Date.now()
      });
    }
  }

  /* ============================================================
     COMPREHENSIVE MONITORING
  ============================================================ */

  /**
   * Run full health check after store inventory loads
   * @param {Object} inventory - Store inventory object from engine
   * @param {Object} metadata - Load metadata
   */
  static monitorStoreLoad(inventory, metadata) {
    if (!inventory) return;

    // Check 1: Pack availability
    if (metadata?.packsUsed) {
      this.validatePackAvailability(metadata.packsUsed);
    }

    // Check 2: Cache health
    if (metadata) {
      this.validateCacheHealth(metadata);
    }

    // Check 3: Document hydration
    if (inventory.allItems) {
      this.validateDocumentHydration(inventory.allItems, 25);
    }

    // Check 4: Category distribution (detect miscategorized items)
    if (inventory.byCategory) {
      const categoryDistribution = {
        total: inventory.allItems?.length || 0,
        categorized: 0,
        byCategory: {}
      };

      for (const [cat, subMap] of inventory.byCategory.entries()) {
        let catCount = 0;
        for (const items of subMap.values()) {
          catCount += items.length;
        }
        categoryDistribution.byCategory[cat] = catCount;
        categoryDistribution.categorized += catCount;
      }

      const uncategorized = categoryDistribution.total - categoryDistribution.categorized;
      if (uncategorized > 0) {
        SentinelEngine.report({
          aggregationKey: "mall-cop-uncategorized-items",
          severity: "INFO",
          layer: "mall-cop",
          title: `${uncategorized} items missing category`,
          details: categoryDistribution,
          timestamp: Date.now()
        });
      }

      // Report category distribution
      SentinelEngine.report({
        aggregationKey: "mall-cop-store-composition",
        severity: "INFO",
        layer: "mall-cop",
        title: "Store inventory composition",
        details: categoryDistribution,
        timestamp: Date.now(),
        devOnly: true
      });
    }

    // Check 5: Type distribution
    if (inventory.byType) {
      const typeDistribution = {};
      for (const [type, items] of inventory.byType.entries()) {
        typeDistribution[type] = items.length;
      }

      SentinelEngine.report({
        aggregationKey: "mall-cop-type-distribution",
        severity: "INFO",
        layer: "mall-cop",
        title: "Store items by type",
        details: { types: typeDistribution, total: inventory.allItems?.length || 0 },
        timestamp: Date.now(),
        devOnly: true
      });
    }

    // Final summary
    SentinelEngine.report({
      aggregationKey: "mall-cop-store-load-complete",
      severity: "INFO",
      layer: "mall-cop",
      title: "Store inventory loaded successfully",
      details: {
        itemCount: inventory.allItems?.length || 0,
        categoryCount: inventory.byCategory?.size || 0,
        cacheAge: metadata ? Math.round((Date.now() - metadata.loadedAt) / 1000) : "unknown"
      },
      timestamp: Date.now(),
      devOnly: true
    });
  }

  /* ============================================================
     GOVERNANCE MONITORING (Future)
  ============================================================ */

  /**
   * Monitor purchase flow for governance violations
   * (This would be called from store-checkout.js)
   * @param {string} context - Purchase context
   */
  static monitorPurchase(context) {
    // planned: Intercept purchase calls and validate:
    // - Routes through ActorEngine (not direct actor.update)
    // - Uses SWSEChat for messages
    // - Tracks DSP/force point changes
  }
}

// Auto-init on Foundry ready
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    if (game.settings.get?.("foundryvtt-swse", "sentinelMallCop") ?? true) {
      SentinelMallCop.init();
    }
  });
}
