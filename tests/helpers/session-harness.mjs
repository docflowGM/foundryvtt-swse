/**
 * Loads the REAL ProgressionSession under Node. Only the import chain needs stubs (ApplicationV2 base classes,
 * window/document/localStorage); the session logic itself — commitSelection, merging, schema, normalization —
 * is the production code. Nothing here emulates session behaviour.
 */
import { registerFoundryPathLoader } from './foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis;
globalThis.document = globalThis.document || { addEventListener() {}, createElement() { return {}; } };
globalThis.localStorage = globalThis.localStorage || { getItem() { return null; }, setItem() {}, removeItem() {} };
class AppV2 { static DEFAULT_OPTIONS = {}; constructor(o) { this.options = o; } }
globalThis.foundry.applications = {
  api: { ApplicationV2: AppV2, HandlebarsApplicationMixin: B => class extends B {}, DialogV2: class {} },
  ux: {}, apps: {}, sheets: {}
};

export async function createSession(subtype = 'actor') {
  const { ProgressionSession } = await import('../../scripts/apps/progression-framework/shell/progression-session.js');
  return new ProgressionSession({ actor: null, subtype });
}
