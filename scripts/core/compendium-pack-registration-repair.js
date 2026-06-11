/**
 * Compendium Pack Registration Diagnostics
 *
 * Formerly a "repair" that tried to construct and inject missing packs into
 * `game.packs` at runtime. That strategy is unsafe and has been removed:
 *
 *   - `game.packs` is empty at `init` by design, so every pack looks "missing"
 *     during init and the old code spammed false failures.
 *   - Foundry v13 server-hydrates pack metadata (folders, sortable fields, etc.).
 *     Calling `new CompendiumCollection(metadata)` from outside Foundry's own
 *     boot sequence throws `Cannot read properties of undefined (reading 'sort')`
 *     because the manually-built metadata lacks those server fields.
 *   - There is no safe way to register a pack Foundry itself skipped.
 *
 * This module therefore only DIAGNOSES. It snapshots watched packs at each boot
 * phase and, at `ready`, emits a single focused warning for any pack that is
 * declared in the manifest (`game.system.packs`) but absent from `game.packs`.
 * All `SWSE.debug.*` helpers are preserved.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

/**
 * The only pack currently known to be skipped by Foundry under certain corrupt
 * LevelDB states. Watched as a problem pack so the ready-time warning can call
 * out the FeatRegistry fallback caveat explicitly. LFP/heroic/nonheroic were
 * confirmed to register natively and are intentionally not treated as problems.
 */
const PROBLEM_PACKS = [
  {
    name: "feats",
    label: "Feats",
    type: "Item",
    path: "packs/feats.db"
  }
];

/** Names used for the hook-level snapshot diagnostic (informational only). */
const WATCH_PACKS = [
  "foundryvtt-swse.feats",
  "foundryvtt-swse.lightsaberformpowers",
  "foundryvtt-swse.heroic",
  "foundryvtt-swse.nonheroic"
];

let registered = false;
let diagnosticRuns = [];

// ---------------------------------------------------------------------------
// Debug gate
// ---------------------------------------------------------------------------

function _isDebug() {
  if (globalThis.SWSE_DEBUG_COMPENDIUMS === true) return true;
  try { return game?.settings?.get?.("foundryvtt-swse", "debugMode") === true; } catch (_e) { return false; }
}

function _dlog(...args) {
  if (!_isDebug()) return;
  console.log("[SWSE-COMPENDIUM-REG]", ...args);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _systemId() {
  return game?.system?.id || "foundryvtt-swse";
}

function _collectionKey(spec, systemId = _systemId()) {
  return `${systemId}.${spec.name}`;
}

function _allPackKeys() {
  try {
    return Array.from(game?.packs?.keys?.() || []);
  } catch (_err) {
    return [];
  }
}

function _hasPack(key) {
  try {
    return Boolean(game?.packs?.get?.(key));
  } catch (_err) {
    return false;
  }
}

/** The manifest declaration for a pack name, if present in game.system.packs. */
function _manifestEntry(name) {
  const packs = game?.system?.packs;
  if (!Array.isArray(packs)) return null;
  return packs.find((p) => p?.name === name) || null;
}

// ---------------------------------------------------------------------------
// Diagnostic snapshot helpers
// ---------------------------------------------------------------------------

/**
 * Build a metadata snapshot for a single pack for diagnostic output.
 */
function _packMetaSnapshot(pack) {
  if (!pack) return null;
  const meta = pack.metadata || {};
  let indexSize = null;
  try {
    // index may be a Map, Collection, or Array depending on load state
    const idx = pack.index;
    if (idx != null) indexSize = Number(idx?.size ?? idx?.length ?? 0);
  } catch (_e) { /* not yet loaded */ }
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
    indexSize
  };
}

/**
 * Log a full hook-phase snapshot of all watched packs and total pack count.
 * Snapshot only — never warns, never mutates. Gated behind the debug flag.
 */
function _logHookSnapshot(phase) {
  if (!_isDebug()) return;
  const totalPacks = game?.packs?.size ?? "?";
  const snapshots = WATCH_PACKS.map((key) => {
    const pack = game?.packs?.get?.(key);
    return {
      key,
      present: Boolean(pack),
      meta: _packMetaSnapshot(pack)
    };
  });

  console.group(`[SWSE-COMPENDIUM-REG] Hook snapshot @ ${phase} — game.packs.size=${totalPacks}`);
  for (const s of snapshots) {
    if (s.present) {
      console.log(`  ✅ ${s.key}`, s.meta);
    } else {
      console.log(`  ⛔ ${s.key} — not (yet) in game.packs`);
    }
  }
  const ourKeys = _allPackKeys().filter(k => k.includes(_systemId()));
  console.log(`  System pack keys in game.packs (${ourKeys.length}):`, ourKeys);
  console.groupEnd();
}

/**
 * At ready, emit ONE focused warning per problem pack that is declared in the
 * manifest but absent from game.packs. Returns the list of missing pack keys.
 */
function _warnMissingProblemPacks(phase) {
  const missing = [];
  const systemId = _systemId();

  for (const spec of PROBLEM_PACKS) {
    const key = _collectionKey(spec, systemId);
    if (_hasPack(key)) continue;

    const manifest = _manifestEntry(spec.name);
    const declared = Boolean(manifest);
    if (!declared) {
      // Not declared in system.json and not in game.packs — nothing to warn about.
      continue;
    }

    missing.push(key);

    const lines = [
      `[SWSE] Pack "${key}" is declared in system.json but was NOT registered by Foundry.`,
      `  Manifest entry: ${JSON.stringify({
        name: manifest.name,
        label: manifest.label,
        type: manifest.type,
        path: manifest.path
      })}`,
      `  Expected LevelDB path: packs/${spec.name}/`,
      `  LevelDB directory exists: (cannot check from client)`,
      `  .db file exists: (cannot check from client)`,
      `  Recommendation: Inspect packs/${spec.name}/ on disk. Foundry may have skipped`,
      `    it due to a corrupted or unexpected LevelDB state.`
    ];

    if (spec.name === "feats") {
      lines.push(
        `  Note: FeatRegistry fallback (data/feat-catalog.json) is active, so chargen/`,
        `    progression can still see feats. This does NOT mean the native Feats`,
        `    compendium is healthy — the sidebar browser remains broken until the pack`,
        `    registers. Do not run SWSE.debug.seedFeatsPack() until the pack appears in`,
        `    game.packs; seeding cannot fix registration.`
      );
    }

    SWSELogger.warn(lines.join("\n"));
    console.warn(lines.join("\n"));
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Diagnostic entry point
// ---------------------------------------------------------------------------

/**
 * Diagnose (never repair) critical compendium pack registration.
 *
 *  - init / setup: snapshot only (game.packs is empty/partial by design here).
 *  - ready: snapshot + one focused warning per missing problem pack.
 *
 * Retains the historical export name so docs and SWSE.debug.* keep working, but
 * it no longer constructs, registers, or mutates anything.
 */
export function repairCriticalCompendiumPacks(phase = "manual") {
  _logHookSnapshot(phase);

  const totalPacks = game?.packs?.size ?? null;
  const evaluate = phase === "ready" || phase === "manual";
  const missing = evaluate ? _warnMissingProblemPacks(phase) : [];

  const snapshot = {
    phase,
    packCount: totalPacks,
    problemPacks: PROBLEM_PACKS.map((spec) => {
      const key = _collectionKey(spec);
      return {
        key,
        declaredInManifest: Boolean(_manifestEntry(spec.name)),
        registered: _hasPack(key),
        indexSize: _packMetaSnapshot(game?.packs?.get?.(key))?.indexSize ?? null
      };
    }),
    missing
  };

  diagnosticRuns.push(snapshot);

  if (missing.length) {
    // Warning already emitted above; keep the structured log quiet at WARN level.
    SWSELogger.warn("[CompendiumPackRegistrationDiagnostics] Missing problem pack(s) after " + phase, snapshot);
  } else {
    SWSELogger.log("[CompendiumPackRegistrationDiagnostics] Problem packs healthy @ " + phase, snapshot.problemPacks);
  }

  _dlog(`diagnose phase="${phase}" packCount=${totalPacks} missing=${missing.length}`);
  return snapshot;
}

export function registerCompendiumPackRegistrationRepair() {
  if (registered) return;
  registered = true;

  const run = (phase) => {
    try {
      return repairCriticalCompendiumPacks(phase);
    } catch (err) {
      SWSELogger.warn("[CompendiumPackRegistrationDiagnostics] Diagnostic run failed", err);
      console.error("[SWSE-COMPENDIUM-REG] Diagnostic run threw:", err?.message, err?.stack || err);
      return null;
    }
  };

  // At init game.packs is empty by design — snapshot only, never evaluate.
  run("init");
  Hooks.once("setup", () => run("setup"));
  Hooks.once("ready", () => run("ready"));

  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  // Preserved name for backward compatibility; now diagnostic-only (no mutation).
  globalThis.SWSE.debug.repairCriticalCompendiumPacks = () => run("manual");
  globalThis.SWSE.debug.criticalCompendiumPackStatus = () => ({
    runs: diagnosticRuns,
    keys: _allPackKeys(),
    problem: PROBLEM_PACKS.map((spec) => {
      const key = _collectionKey(spec);
      return {
        key,
        declaredInManifest: Boolean(_manifestEntry(spec.name)),
        registered: _hasPack(key),
        metadata: game?.packs?.get?.(key)?.metadata || null,
        indexSize: _packMetaSnapshot(game?.packs?.get?.(key))?.indexSize ?? null
      };
    })
  });
  globalThis.SWSE.debug.logCompendiumHookSnapshot = (phase = "manual") => _logHookSnapshot(phase);
}

export default registerCompendiumPackRegistrationRepair;
