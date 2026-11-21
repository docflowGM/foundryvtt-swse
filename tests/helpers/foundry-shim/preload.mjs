// Preload for tests whose production modules use Foundry-absolute `/systems/foundryvtt-swse/...` imports and are
// imported STATICALLY by the test (so the path loader must exist before the module graph is resolved):
//   node --import ./tests/helpers/foundry-shim/preload.mjs tests/<name>.test.mjs
// Registers the path loader and the minimal Foundry globals/application API shims. Nothing is mocked beyond those.
import { registerFoundryPathLoader } from './register.mjs';
import { installFoundryShimGlobals } from './globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
