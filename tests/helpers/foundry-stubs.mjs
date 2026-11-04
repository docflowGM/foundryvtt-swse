import { existsSync, readFileSync } from 'node:fs';
// Permissive Foundry global stubs so engine/sheet modules can be imported in Node.
// Only for loading modules and exercising pure paths; any behavior a test depends on must
// be set explicitly (game.actors, game.user, ...).
const make = (own = {}) => new Proxy(function () {}, {
  get: (t, k) => (k in own ? own[k] : k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : make()),
  apply: () => make(), construct: () => make(), set: () => true
});
export function installFoundryStubs() {
  const g = globalThis;
  const deepClone = v => (v === undefined ? v : structuredClone(v));
  const utils = { deepClone, duplicate: deepClone, randomID: () => Math.random().toString(36).slice(2, 10),
    mergeObject: (a, b) => Object.assign(a, b), getProperty: (o, p) => p.split('.').reduce((x, k) => x?.[k], o),
    setProperty: () => true, isEmpty: o => !o || !Object.keys(o).length };
  g.foundry ??= make({ utils });
  g.Hooks ??= { on() {}, once() {}, off() {}, call() {}, callAll() {} };
  g.ui ??= { notifications: { warn() {}, error() {}, info() {} } };
  g.CONST ??= { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } };
  g.Handlebars ??= make(); g.Roll ??= make(); g.Actor ??= class {}; g.Item ??= class {}; g.Combat ??= class {};
  g.Application ??= class {}; g.ChatMessage ??= make(); g.Dialog ??= make(); g.canvas ??= make({ grid: { size: 100, type: 1 } }); g.CONFIG ??= make();
  g.window ??= g;
  g.game ??= { user: { id: 'u1', isGM: false }, actors: { contents: [], get: () => null }, users: new Map(), settings: { get: () => undefined }, i18n: { localize: k => k, format: k => k }, system: { id: 'foundryvtt-swse' } };
  g.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  // The system serves data files by relative URL ("systems/foundryvtt-swse/data/..."); in Node those resolve to the repository's data/ directory.
  if (!g.__swseFetchStubbed) {
    g.__swseFetchStubbed = true;
    const realFetch = g.fetch;
    g.fetch = async (url, ...rest) => {
      const m = /^systems\/foundryvtt-swse\/(data\/[^?#]+\.json)$/.exec(String(url));
      if (m && existsSync(m[1])) return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(m[1], 'utf8')) };
      if (typeof realFetch === 'function') return realFetch(url, ...rest);
      throw new Error('fetch unavailable');
    };
  }
}
