/**
 * Compendium Diagnostics
 *
 * Runtime diagnostic helpers for auditing compendium pack registration and
 * sidebar visibility. Exposed on SWSE.debug.
 *
 * Key questions these helpers answer:
 *   A. Is the pack's data accessible through SWSE registries/progression?
 *   B. Is the pack registered in game.packs?
 *   C. Is the pack visible in the CompendiumDirectory sidebar DOM?
 *   D. Can the pack be rendered with pack.render(true)?
 *
 * Usage (Foundry browser console):
 *   window.SWSE_DEBUG_COMPENDIUMS = true        // enable verbose logging
 *   SWSE.debug.compendiumDiagnostics()           // full table for all system packs
 *   SWSE.debug.traceCompendiumPack("feats")      // deep trace for one pack
 *   SWSE.debug.traceCompendiumPack("lightsaberformpowers")
 */

// ---------------------------------------------------------------------------
// Debug gate
// ---------------------------------------------------------------------------

function _isDebug() {
  if (globalThis.SWSE_DEBUG_COMPENDIUMS === true) return true;
  try { return game?.settings?.get?.("foundryvtt-swse", "debugMode") === true; } catch (_e) { return false; }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _systemId() {
  return game?.system?.id || "foundryvtt-swse";
}

/**
 * Resolve a pack by short name ("feats") or full collection id ("foundryvtt-swse.feats").
 */
function _resolvePack(nameOrId) {
  const raw = String(nameOrId ?? "").trim();
  if (!raw) return null;
  // Try direct lookup first
  const direct = game?.packs?.get?.(raw);
  if (direct) return direct;
  // Try as short name under current system id
  const bySystem = game?.packs?.get?.(`${_systemId()}.${raw}`);
  if (bySystem) return bySystem;
  // Try as short name under canonical swse id
  const byCanonical = game?.packs?.get?.(`foundryvtt-swse.${raw}`);
  if (byCanonical) return byCanonical;
  // Fuzzy: scan by metadata.name
  return Array.from(game?.packs?.values?.() || []).find(p => {
    const name = p.metadata?.name || p.collection?.split(".")?.pop?.();
    return name === raw;
  }) || null;
}

/**
 * Find the system.json manifest entry for a pack by name.
 */
function _manifestEntry(packName) {
  return (game?.system?.packs || []).find(p => p.name === packName) || null;
}

/**
 * Get index size without throwing.
 */
async function _indexSize(pack) {
  if (!pack) return null;
  try {
    const idx = await pack.getIndex();
    return Number(idx?.size ?? idx?.length ?? 0);
  } catch (err) {
    return `ERROR: ${err?.message}`;
  }
}

/**
 * Snapshot metadata for a pack.
 */
function _metaSnapshot(pack) {
  if (!pack) return null;
  const meta = pack.metadata || {};
  let currentIndexSize = null;
  try {
    const idx = pack.index;
    if (idx != null) currentIndexSize = Number(idx?.size ?? idx?.length ?? 0);
  } catch (_e) {}
  return {
    collection: pack.collection ?? null,
    label: meta.label ?? null,
    type: meta.type ?? null,
    name: meta.name ?? null,
    packageName: meta.packageName ?? meta.package ?? null,
    path: meta.path ?? null,
    ownership: meta.ownership ?? null,
    private: meta.private ?? null,
    locked: pack.locked ?? null,
    documentName: meta.documentName ?? meta.type ?? null,
    currentIndexSize
  };
}

/**
 * Check whether a pack's collection id appears in the CompendiumDirectory sidebar DOM.
 */
function _packInSidebarDom(collectionId) {
  if (!collectionId) return null;
  const shortName = collectionId.split(".").pop();
  const selectors = [
    `[data-pack="${collectionId}"]`,
    `[data-pack-id="${collectionId}"]`,
    `[data-collection="${collectionId}"]`,
    `[data-collection-id="${collectionId}"]`,
    `[data-pack="${shortName}"]`,
    `[data-pack-id="${shortName}"]`
  ];
  for (const sel of selectors) {
    if (document.querySelector(sel)) return { found: true, selector: sel };
  }
  // Fallback: label text match inside compendium sidebar
  const sidebar = document.querySelector('#compendium, .compendium-sidebar, [data-tab="compendium"]');
  if (sidebar) {
    const textEls = sidebar.querySelectorAll('.pack-title, .entry-name, .document-name, .name, label, a, span, h3, h4');
    for (const el of textEls) {
      const text = (el.textContent || "").trim();
      const meta = game?.packs?.get?.(collectionId)?.metadata;
      if (meta?.label && text === meta.label) return { found: true, selector: `text:"${text}"` };
    }
  }
  return { found: false, selector: null };
}

// ---------------------------------------------------------------------------
// Public: compendiumDiagnostics()
// ---------------------------------------------------------------------------

/**
 * Print a diagnostic table for all packs registered in system.json.
 * Columns: manifest entry, game.packs presence, label, type, index size, sidebar DOM, render-safe.
 *
 * @returns {Object[]} Array of row objects (also printed to console).
 */
export async function compendiumDiagnostics() {
  const systemId = _systemId();
  const manifestPacks = game?.system?.packs || [];

  console.group(`[SWSE-COMPENDIUM-DIAG] compendiumDiagnostics() — ${manifestPacks.length} manifest entries — game.packs.size=${game?.packs?.size ?? "?"}`);

  const rows = [];

  for (const entry of manifestPacks) {
    const collectionId = `${systemId}.${entry.name}`;
    const pack = game?.packs?.get?.(collectionId);
    const inGamePacks = Boolean(pack);
    const domResult = _packInSidebarDom(collectionId);
    const inDom = domResult?.found ?? false;

    let idxSize = null;
    if (pack) {
      idxSize = await _indexSize(pack);
    }

    const row = {
      name: entry.name,
      collectionId,
      inGamePacks,
      label: pack?.metadata?.label ?? entry.label ?? null,
      type: pack?.metadata?.type ?? entry.type ?? null,
      path: entry.path ?? null,
      indexSize: idxSize,
      inSidebarDom: inDom,
      domSelector: domResult?.selector ?? null,
      locked: pack?.locked ?? null,
      packageName: pack?.metadata?.packageName ?? null
    };
    rows.push(row);

    const status = !inGamePacks ? "❌ NOT in game.packs" : !inDom ? "⚠️  in game.packs but NOT in sidebar DOM" : "✅";
    console.log(
      `${status.padEnd(42)} ${collectionId.padEnd(45)} idx=${String(idxSize ?? "–").padStart(5)}  locked=${pack?.locked ?? "–"}`
    );
  }

  // Highlight the two problem packs explicitly
  console.group("Problem pack summary:");
  for (const name of ["feats", "lightsaberformpowers"]) {
    const row = rows.find(r => r.name === name);
    if (!row) { console.warn(`  ${name}: not in system.json manifest`); continue; }
    console.log(`  ${name}:`, {
      inGamePacks: row.inGamePacks,
      inSidebarDom: row.inSidebarDom,
      indexSize: row.indexSize,
      path: row.path
    });
  }
  console.groupEnd();
  console.groupEnd();

  return rows;
}

// ---------------------------------------------------------------------------
// Public: traceCompendiumPack(nameOrId)
// ---------------------------------------------------------------------------

/**
 * Deep diagnostic trace for a single pack.
 *
 * @param {string} nameOrId  Short name ("feats") or full id ("foundryvtt-swse.feats")
 * @returns {Object} Trace result object
 */
export async function traceCompendiumPack(nameOrId) {
  const systemId = _systemId();
  const shortName = String(nameOrId ?? "").replace(/^.*\./, "").trim();
  const collectionId = nameOrId.includes(".") ? nameOrId : `${systemId}.${shortName}`;

  console.group(`[SWSE-COMPENDIUM-DIAG] traceCompendiumPack("${nameOrId}")`);

  const result = {
    input: nameOrId,
    shortName,
    collectionId,
    // A — SWSE registry awareness
    swseRegistryAware: null,
    // B — game.packs registration
    inGamePacks: false,
    packMeta: null,
    // C — Sidebar DOM visibility
    inSidebarDom: false,
    domSelector: null,
    // D — Render test
    renderResult: null,
    renderError: null,
    // Other
    manifestEntry: null,
    indexSize: null,
    sampleIndexEntries: [],
    errors: []
  };

  // --- Manifest entry ---
  const manifestEntry = _manifestEntry(shortName);
  result.manifestEntry = manifestEntry;
  if (manifestEntry) {
    console.log("  [Manifest]  ✅ Found in game.system.packs:", manifestEntry);
  } else {
    console.warn("  [Manifest]  ❌ NOT found in game.system.packs for name=", shortName);
  }

  // --- SWSE registry awareness (A) ---
  // For feats: check FeatRegistry; for lightsaberformpowers: check ForceRegistry
  try {
    if (shortName === "feats") {
      // Dynamic import to avoid hard dependency
      const { FeatRegistry } = await import("/systems/foundryvtt-swse/scripts/registries/feat-registry.js");
      const count = FeatRegistry?._entries?.length ?? FeatRegistry?._byId?.size ?? null;
      result.swseRegistryAware = count !== null ? `FeatRegistry has ${count} entries` : "FeatRegistry loaded but count unknown";
      console.log("  [A - SWSE Registry]  ✅", result.swseRegistryAware);
    } else if (shortName === "lightsaberformpowers") {
      const { ForceRegistry } = await import("/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js");
      const allPowers = ForceRegistry?._powers ?? ForceRegistry?._entries ?? null;
      const lfpCount = allPowers
        ? Array.from(allPowers.values?.() || []).filter(e => e?.category === "lightsaber-form").length
        : null;
      result.swseRegistryAware = lfpCount !== null
        ? `ForceRegistry has ${lfpCount} lightsaber-form entries`
        : "ForceRegistry loaded but LFP count unknown";
      console.log("  [A - SWSE Registry]  ✅", result.swseRegistryAware);
    } else {
      result.swseRegistryAware = "not checked (no specific registry for this pack)";
      console.log("  [A - SWSE Registry]  (no specific check for this pack)");
    }
  } catch (err) {
    result.swseRegistryAware = `ERROR: ${err?.message}`;
    result.errors.push({ phase: "registry-check", message: err?.message, stack: err?.stack });
    console.warn("  [A - SWSE Registry]  ⚠️  Could not check registry:", err?.message);
  }

  // --- game.packs registration (B) ---
  const pack = _resolvePack(nameOrId);
  result.inGamePacks = Boolean(pack);
  result.packMeta = _metaSnapshot(pack);

  if (pack) {
    console.log("  [B - game.packs]  ✅ Pack found:", result.packMeta);
  } else {
    console.warn("  [B - game.packs]  ❌ Pack NOT in game.packs");
    console.log("    Tried:", collectionId, `/ foundryvtt-swse.${shortName}`);
    console.log("    Total system packs in game.packs:", Array.from(game?.packs?.keys?.() || []).filter(k => k.startsWith(systemId)));
  }

  // --- Index size + sample entries ---
  if (pack) {
    try {
      const idx = await pack.getIndex({ fields: ["name", "type", "_id"] });
      result.indexSize = Number(idx?.size ?? idx?.length ?? 0);
      result.sampleIndexEntries = Array.from(idx?.values?.() || idx || []).slice(0, 5);
      console.log(`  [Index]  size=${result.indexSize}`, result.sampleIndexEntries.length ? "— first 5 entries:" : "— EMPTY");
      if (result.sampleIndexEntries.length) {
        for (const e of result.sampleIndexEntries) {
          console.log(`    _id=${e._id}  name="${e.name}"  type="${e.type ?? "–"}"`);
        }
      } else {
        console.warn("  [Index]  ⚠️  Index is empty (0 entries) — pack content missing at runtime");
      }
    } catch (err) {
      result.indexSize = `ERROR: ${err?.message}`;
      result.errors.push({ phase: "getIndex", message: err?.message, stack: err?.stack });
      console.error("  [Index]  ❌ getIndex() threw:", err?.message, err?.stack || err);
    }
  }

  // --- Sidebar DOM visibility (C) ---
  const domResult = _packInSidebarDom(collectionId);
  result.inSidebarDom = domResult?.found ?? false;
  result.domSelector = domResult?.selector ?? null;

  if (result.inSidebarDom) {
    console.log("  [C - Sidebar DOM]  ✅ Pack element found via selector:", result.domSelector);
  } else {
    console.warn("  [C - Sidebar DOM]  ❌ Pack NOT visible in CompendiumDirectory sidebar DOM");
    console.log("    This means Foundry's sidebar is not rendering a row for this pack.");
    console.log("    Possible causes: pack not in game.packs, pack filtered by ownership/private, sidebar not yet rendered.");

    // Extra check: is the compendium sidebar tab even open/rendered?
    const sidebarEl = document.querySelector('#compendium, .compendium-sidebar, [data-tab="compendium"]');
    console.log("    CompendiumDirectory sidebar element present in DOM:", Boolean(sidebarEl));
    if (sidebarEl) {
      const allPackEls = sidebarEl.querySelectorAll('[data-pack],[data-pack-id],[data-collection],[data-collection-id]');
      console.log(`    Pack elements in sidebar DOM (${allPackEls.length}):`);
      const idsInDom = Array.from(allPackEls).map(el =>
        el.dataset.pack || el.dataset.packId || el.dataset.collection || el.dataset.collectionId
      ).filter(Boolean);
      console.log("    IDs:", idsInDom);
    }
  }

  // --- Render test (D) ---
  if (pack) {
    console.log("  [D - Render]  Attempting pack.render(true)...");
    try {
      await pack.render(true);
      result.renderResult = "success";
      console.log("  [D - Render]  ✅ pack.render(true) resolved without error");
    } catch (renderErr) {
      result.renderResult = "error";
      result.renderError = { message: renderErr?.message, stack: renderErr?.stack };
      result.errors.push({ phase: "render", message: renderErr?.message, stack: renderErr?.stack });
      console.error("  [D - Render]  ❌ pack.render(true) threw:", renderErr?.message, renderErr?.stack || renderErr);
    }
  } else {
    result.renderResult = "skipped-no-pack";
    console.log("  [D - Render]  (skipped — pack not in game.packs)");
  }

  console.log("  ─── Summary ───");
  console.log(`  A (SWSE registry): ${result.swseRegistryAware}`);
  console.log(`  B (game.packs):    ${result.inGamePacks ? "✅ registered" : "❌ NOT registered"}`);
  console.log(`  C (sidebar DOM):   ${result.inSidebarDom ? "✅ visible" : "❌ NOT visible"}`);
  console.log(`  D (render):        ${result.renderResult}`);
  console.log(`  Index size:        ${result.indexSize}`);
  console.groupEnd();

  return result;
}

// ---------------------------------------------------------------------------
// Registration on SWSE.debug
// ---------------------------------------------------------------------------

export function registerCompendiumDiagnostics() {
  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.compendiumDiagnostics = () => compendiumDiagnostics();
  globalThis.SWSE.debug.traceCompendiumPack = (nameOrId) => traceCompendiumPack(nameOrId);
}

export default registerCompendiumDiagnostics;
