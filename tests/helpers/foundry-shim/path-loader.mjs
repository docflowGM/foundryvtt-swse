/**
 * Foundry-Path Loader — PHASE 4 Foundry-shim test harness.
 *
 * Production code in this repo imports its own modules by Foundry's
 * runtime-mounted absolute path (`/systems/foundryvtt-swse/...`), which
 * plain Node cannot resolve on its own — the root cause of this repo's
 * "most files can't be unit tested under Node" limitation documented in
 * docs/audits/droid-stock-statblock-authority-phase-3.md and
 * docs/audits/droid-converted-system-reconciliation-phase-4.md. This is a
 * Node `module.register()` resolve hook (see
 * tests/helpers/foundry-shim/register.mjs) that rewrites that prefix to
 * the real file in this repo, so real production modules can be imported
 * under plain Node as long as their OWN runtime dependencies (Foundry
 * globals) are also satisfied — see globals.mjs for that half.
 *
 * A small, explicit override map redirects a handful of specific
 * specifiers to test-only fakes instead of their real file — currently
 * only scripts/governance/actor-engine/actor-engine.js, whose real
 * implementation transitively imports most of the engine layer and is far
 * too heavy for a narrow harness (see the audit's "Foundry-shim harness"
 * section for why). Every other absolute-path specifier — including
 * SnapshotManager, the droid mode adapter, the installed-component
 * resolver, the droid-part schema, and the conversion/reconciliation
 * services themselves — resolves to its real, unmodified file, so tests
 * built on this harness exercise real production code wherever feasible.
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const PREFIX = '/systems/foundryvtt-swse/';

const OVERRIDES = new Map([
  [
    '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js',
    new URL('./fakes/actor-engine.fake.mjs', import.meta.url).href
  ]
]);

export async function resolve(specifier, context, nextResolve) {
  if (OVERRIDES.has(specifier)) {
    return nextResolve(OVERRIDES.get(specifier), context);
  }
  if (specifier.startsWith(PREFIX)) {
    const relative = specifier.slice(PREFIX.length);
    const real = pathToFileURL(path.join(ROOT, relative)).href;
    return nextResolve(real, context);
  }
  return nextResolve(specifier, context);
}
