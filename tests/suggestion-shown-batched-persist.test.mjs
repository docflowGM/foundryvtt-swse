import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Finding F-MEN-006 (3K): recording 'suggestions shown' awaited one actor flag write per suggestion (up to 8). One write per batch now.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { id: 'u', isGM: true } };
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const writes = []; ActorEngine.updateActorFlags = async (...a) => { writes.push(a); };
const { SuggestionService } = await import('/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js');
const actor = { id: 'a1', uuid: 'Actor.a1', name: 'A', system: { level: 3 } };
const suggestions = Array.from({ length: 8 }, (_, i) => ({ id: `f${i}`, name: `Feat ${i}`, type: 'feat', suggestion: { tier: 2, confidence: 0.9 } }));
await SuggestionService._recordSuggestionsShown(actor, 'levelup', suggestions, {});
assert.equal(actor.system.suggestionEngine.history.recent.length, 8, 'all 8 suggestions are recorded in the history');
assert.equal(writes.length, 1, 'one persisted flag write for the batch');
assert.equal(writes[0][3].length, 8, 'the single write carries the whole history');
await SuggestionService._recordSuggestionsShown(actor, 'sheet', suggestions, {});   // passive context: no recording, no write
assert.equal(writes.length, 1, 'passive contexts still write nothing');
console.log('suggestion-shown-batched-persist: ok');
