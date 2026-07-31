/**
 * Registers the Foundry-path resolve hook (path-loader.mjs) exactly once
 * per process. Must be called, and awaited if it returns a promise is not
 * needed here since `register()` itself is synchronous, before any
 * dynamic `import()` of a `/systems/foundryvtt-swse/...` specifier — the
 * hook only affects module resolution that happens after registration.
 *
 * Usage (inside a test file, NOT via static top-level import of anything
 * Foundry-absolute):
 *   import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
 *   import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
 *   registerFoundryPathLoader();
 *   installFoundryShimGlobals();
 *   const { inspectReconciliation } = await import(
 *     '/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-service.js'
 *   );
 */

import { register } from 'node:module';

let registered = false;

export function registerFoundryPathLoader() {
  if (registered) return;
  register('./path-loader.mjs', import.meta.url);
  registered = true;
}
