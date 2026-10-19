// Shared bootstrap for the TI-0 reproduction scripts. Read-only evidence: nothing here is a CI test and nothing writes to the repository.
// The scripts run against ANY SWSE source tree: `SWSE_ROOT=<worktree> node <script>` (default: the current directory). The tree's own Foundry shim and
// path loader are used, so the same script demonstrates a defect on `main` and shows whether a branch corrects it.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = path.resolve(process.env.SWSE_ROOT ?? process.cwd());
globalThis.window = globalThis.window || {};
const reg = await import(pathToFileURL(path.join(ROOT, 'tests/helpers/foundry-shim/register.mjs')).href);
const glob = await import(pathToFileURL(path.join(ROOT, 'tests/helpers/foundry-shim/globals.mjs')).href);
reg.registerFoundryPathLoader();
glob.installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
export const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const results = [];
/** Print one evidence line. `reproduced === true` means the defect is PRESENT in the tree under test. */
export function report(id, reproduced, claim, evidence = '') {
  results.push({ id, reproduced });
  console.log(`${reproduced ? 'REPRODUCED    ' : 'NOT REPRODUCED'}  ${id}  ${claim}${evidence ? `\n                 evidence: ${evidence}` : ''}`);
}
export function header(title) {
  console.log(`\n== ${title}\n   tree: ${ROOT}`);
}

/**
 * The offline shim swaps `actor-engine.js` for a FAKE (tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs). To exercise the REAL Force Point
 * methods, load the real module by file URL and graft its spendForcePoints / gainForcePoints onto the fake the production modules import. Their
 * only dependency on the engine object is `this.updateActor`, which the caller supplies (an in-memory write).
 * @returns {Promise<{fake: object, real: object}>}
 */
export async function graftRealForcePointMethods(updateActor) {
  const fake = (await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js')).ActorEngine;
  const real = (await import(pathToFileURL(path.join(ROOT, 'scripts/governance/actor-engine/actor-engine.js')).href)).ActorEngine;
  fake.updateActor = updateActor;
  fake.spendForcePoints = real.spendForcePoints;
  fake.gainForcePoints = real.gainForcePoints;
  return { fake, real };
}
export const setPath = (o, p, v) => { const parts = p.split('.'); let n = o; for (let i = 0; i < parts.length - 1; i++) n = (n[parts[i]] ??= {}); n[parts.at(-1)] = JSON.parse(JSON.stringify(v)); };
