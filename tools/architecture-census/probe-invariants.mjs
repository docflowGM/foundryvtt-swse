#!/usr/bin/env node
/**
 * Architecture census — invariant conformance probes (Phase 1/2).
 * READ-ONLY: reads the census outputs and source files, writes only
 * data/audits/architecture-census/contracts/invariant-probes.json.
 *
 * Each probe measures one APPROVED Level-A invariant (see
 * docs/architecture/v2-contracts/A-global-invariants.md). A probe hit is a
 * candidate violation: Phase 2 classifies each as violation, legitimate
 * exception, or false positive.
 *
 * Usage: node tools/architecture-census/probe-invariants.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
// --census-dir <dir>: read a census produced by `build-census.mjs --current --out <dir>` and write the
// probe result inside it (never touches the committed baseline).
const cdIdx = process.argv.indexOf('--census-dir');
const CUSTOM = cdIdx >= 0 ? path.resolve(process.argv[cdIdx + 1]) : null;
const CENSUS = CUSTOM || path.join(ROOT, 'data', 'audits', 'architecture-census');
const OUT = path.join(CENSUS, 'contracts', 'invariant-probes.json');
const CHECK = process.argv.includes('--check');
let acorn, walk;
for (const c of [ROOT, '/opt/node-tools', process.env.NODE_TOOLS || '']) { try { const r = createRequire(path.join(c, 'x.js')); acorn = r('acorn'); walk = r('acorn-walk'); break; } catch { /* next */ } }
if (!acorn) { console.error('acorn/acorn-walk required'); process.exit(2); }

const J = p => JSON.parse(fs.readFileSync(path.join(CENSUS, p), 'utf8'));
const baseline = J('census-baseline.json');
const HEAD = baseline.auditedCommit;
const reg = [];
for (const f of fs.readdirSync(path.join(CENSUS, 'registry'))) if (f !== 'index.json') reg.push(...J('registry/' + f).files);
const byPath = new Map(reg.map(e => [e.path, e]));
// Baseline mode reads source from the pinned audited commit (immutable); --census-dir mode reads the working tree.
const BASELINE_COMMIT = baseline.auditedCommit;
const _cache = new Map();
const read = CUSTOM ? (p => fs.readFileSync(path.join(ROOT, p), 'utf8')) : (p => {
  if (!_cache.has(p)) _cache.set(p, execFileSync('git', ['show', `${BASELINE_COMMIT}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }));
  return _cache.get(p);
});
const isRuntime = e => e.imports && (e.path === 'index.js' || e.path.startsWith('scripts/')) && !/^scripts\/(dev|build|debug)\//.test(e.path) && !['node-tool', 'node-script', 'tool-only-import'].includes(e.runtimeReachability);
const live = e => e.runtimeReachability.startsWith('reachable');
const runtime = reg.filter(isRuntime);
const sw = J('state-writers.json');
const cols = sw.siteColumns;
const sites = sw.sites.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
const DOC_CLASSES = new Set(['actor-like', 'item-or-doc-like', 'Actor(class)', 'Item(class)', 'effect-doc', 'token-doc', 'combat-doc']);
const DOC_METHODS = new Set(['update', 'setFlag', 'unsetFlag', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments', 'delete', 'create', 'updateDocuments', 'createDocuments', 'deleteDocuments']);
const AE_HOME = /^scripts\/governance\/actor-engine\//;
const lineAt = (text, idx) => text.slice(0, idx).split('\n').length;
const group = (arr, k) => arr.reduce((o, x) => ((o[k(x)] = o[k(x)] || []).push(x), o), {});
const summarizeSites = arr => Object.entries(group(arr, s => s.path)).map(([p, v]) => ({ path: p, domain: byPath.get(p)?.primarySystem, reach: byPath.get(p)?.runtimeReachability, count: v.length, lines: v.map(s => s.line).filter(Boolean).slice(0, 40) })).sort((a, b) => b.count - a.count);

const probes = [];
const add = (p) => probes.push(p);

// A-02 Mutation gate
{
  const hits = sites.filter(s => DOC_CLASSES.has(s.receiverClass) && DOC_METHODS.has(s.method) && !AE_HOME.test(s.path) && byPath.get(s.path) && isRuntime(byPath.get(s.path)));
  const liveHits = hits.filter(s => live(byPath.get(s.path)));
  add({ id: 'P-A02-direct-document-writes', invariant: 'A-02', description: 'update/setFlag/unsetFlag/*EmbeddedDocuments/create/delete on actor-, item-, effect-, token- or combat-like receivers outside scripts/governance/actor-engine/.', hits: hits.length, liveHits: liveHits.length, files: new Set(hits.map(s => s.path)).size, liveFiles: new Set(liveHits.map(s => s.path)).size,
    byMethod: Object.fromEntries(Object.entries(group(liveHits, s => s.method)).map(([k, v]) => [k, v.length])),
    byDomain: Object.fromEntries(Object.entries(group(liveHits, s => byPath.get(s.path).primarySystem)).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1])),
    sites: summarizeSites(liveHits) });
}
// A-03 derived state
{
  const hits = sites.filter(s => s.receiverClass === 'system.derived' && !/^scripts\/actors\//.test(s.path) && byPath.get(s.path) && isRuntime(byPath.get(s.path)) && live(byPath.get(s.path)));
  const inActors = sites.filter(s => s.receiverClass === 'system.derived' && /^scripts\/actors\//.test(s.path));
  add({ id: 'P-A03-derived-writes-outside-actor-classes', invariant: 'A-03', description: 'Assignments to *.system.derived.* in live runtime modules outside scripts/actors/** (the documented derived-state writers).', hits: hits.length, insideScriptsActors: inActors.length, files: new Set(hits.map(s => s.path)).size, sites: summarizeSites(hits) });
}
// A-04 presentation writes
{
  const pres = /^scripts\/(sheets|ui|apps|dialogs|components|applications)\//;
  const hits = sites.filter(s => pres.test(s.path) && DOC_CLASSES.has(s.receiverClass) && DOC_METHODS.has(s.method) && byPath.get(s.path) && live(byPath.get(s.path)));
  add({ id: 'P-A04-presentation-direct-writes', invariant: 'A-04', description: 'Direct document writes inside live presentation modules (scripts/sheets|ui|apps|dialogs|components|applications).', hits: hits.length, files: new Set(hits.map(s => s.path)).size, sites: summarizeSites(hits) });
}
// A-05 chat
{
  const hits = runtime.filter(e => e.chatMessageCreates && e.path !== 'scripts/chat/swse-chat.js' && live(e));
  const all = [];
  for (const e of hits) { const t = read(e.path); for (const m of t.matchAll(/ChatMessage\.create\s*\(/g)) all.push({ path: e.path, line: lineAt(t, m.index) }); }
  add({ id: 'P-A05-chat-outside-swse-chat', invariant: 'A-05', description: 'ChatMessage.create in live runtime modules other than scripts/chat/swse-chat.js.', hits: all.length, files: hits.length, sites: summarizeSites(all) });
}
// A-06 settings rule
{
  const all = [];
  for (const e of runtime.filter(e => e.path.startsWith('scripts/engine/') && e.path !== 'scripts/engine/system/HouseRuleService.js')) {
    const t = read(e.path); for (const m of t.matchAll(/game\.settings\.get\s*\(/g)) all.push({ path: e.path, line: lineAt(t, m.index), live: live(e) });
  }
  const allScripts = [];
  for (const e of runtime.filter(e => !e.path.startsWith('scripts/engine/') && !/^scripts\/(settings|houserules|core)\//.test(e.path))) {
    const t = read(e.path); const n = (t.match(/game\.settings\.get\s*\(/g) || []).length; if (n) allScripts.push({ path: e.path, count: n });
  }
  add({ id: 'P-A06-settings-get-in-engines', invariant: 'A-06', description: 'game.settings.get(...) inside scripts/engine/** other than HouseRuleService (ENGINE-ARCHITECTURE §3). Non-engine reads listed separately for context.', hits: all.filter(s => s.live).length, hitsIncludingUnreachable: all.length, files: new Set(all.filter(s => s.live).map(s => s.path)).size, sites: summarizeSites(all.filter(s => s.live)), nonEngineReadFiles: allScripts.length, nonEngineReads: allScripts.reduce((s, x) => s + x.count, 0) });
}
// A-07 dependency direction
{
  const g = J('import-graph.json');
  const ui = /^scripts\/(sheets|apps|ui|dialogs|components|applications)\//;
  const hits = g.edges.filter(([a, b]) => /^scripts\/engine\//.test(a) && ui.test(b) && byPath.get(a) && live(byPath.get(a))).map(([a, b, k]) => ({ path: a, target: b, kind: k }));
  add({ id: 'P-A07-engine-imports-ui', invariant: 'A-07', description: 'Live scripts/engine/** modules importing presentation modules (ENGINE-ARCHITECTURE §5 "Engine imports UI files").', hits: hits.length, files: new Set(hits.map(h => h.path)).size, edges: hits });
  add({ id: 'P-A07-static-cycles', invariant: 'A-07', description: 'Static import strongly connected components (runtime).', hits: g.staticImportCycles.length, files: g.staticImportCycles.reduce((s, c) => s + c.length, 0), cycles: g.staticImportCycles, domainCycleSize: g.domainCycles[0]?.length || 0 });
}
// A-08 no mutation during render / prepare
{
  const RENDER_FN = /^(_prepareContext|_preparePartContext|_onRender|_onFirstRender|getData|_renderHTML|_replaceHTML|_preRender|prepareData|prepareDerivedData|prepareBaseData|_prepareDerivedData)$/;
  const WRITE = /^(update|setFlag|unsetFlag|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments|updateSource)$/;
  const hits = [];
  for (const e of runtime.filter(live)) {
    const t = read(e.path); if (!/_prepareContext|_onRender|getData|prepareData|prepareDerivedData|prepareBaseData|_renderHTML/.test(t)) continue;
    let ast; try { ast = acorn.parse(t, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true, allowAwaitOutsideFunction: true, allowImportExportEverywhere: true }); } catch { continue; }
    walk.full(ast, n => {
      if (n.type !== 'MethodDefinition' || !RENDER_FN.test(n.key?.name || '')) return;
      walk.full(n.value.body, c => {
        if (c.type === 'CallExpression' && c.callee.type === 'MemberExpression' && WRITE.test(c.callee.property?.name || '')) {
          const recv = t.slice(c.callee.object.start, c.callee.object.end);
          if (/actor|item|document|doc|this\.document|token|effect/i.test(recv) && !/Map|Set|cache|state|this\._/i.test(recv)) hits.push({ path: e.path, line: c.loc.start.line, method: n.key.name, call: `${recv.slice(0, 60)}.${c.callee.property.name}` });
        }
      });
    });
  }
  add({ id: 'P-A08-writes-in-render-or-prepare', invariant: 'A-08', description: 'Document writes lexically inside render/prepare lifecycle methods of live modules (no mutation during render; no side effects in read-only phases).', hits: hits.length, files: new Set(hits.map(h => h.path)).size, sites: hits });
}
// A-09 clean cutover: compat/hotfix/monkey-patch layer
{
  const patchMods = runtime.filter(e => e.role === 'compat-patch').map(e => ({ path: e.path, reach: e.runtimeReachability, sloc: e.sloc }));
  const monkey = [];
  for (const e of runtime.filter(live)) {
    const t = read(e.path);
    for (const m of t.matchAll(/^\s*([A-Z][\w.]*\.prototype\.[\w$]+|CONFIG\.[\w.]+\.documentClass\.prototype\.[\w$]+|(?:foundry\.)?[\w.]*(Actor|Item|Application|ApplicationV2|ActorSheet|ItemSheet|ChatMessage|Combat|Token)\w*\.prototype\.[\w$]+)\s*=(?!=)/gm)) monkey.push({ path: e.path, line: lineAt(t, m.index), target: m[1] });
    if (/libWrapper\.register/.test(t)) monkey.push({ path: e.path, line: null, target: 'libWrapper.register' });
  }
  const deprecated = runtime.filter(e => live(e) && e.markers?.deprecated).map(e => ({ path: e.path, deprecatedMarkers: e.markers.deprecated }));
  add({ id: 'P-A09-compat-and-monkeypatch', invariant: 'A-09', description: 'Live compatibility/hotfix modules, prototype monkey-patches, and live modules carrying deprecation markers.', hits: patchMods.filter(p => p.reach.startsWith('reachable')).length + monkey.length, patchModules: patchMods, prototypePatches: monkey, liveDeprecatedModules: deprecated.length, deprecated });
}
// A-10 credits through TransactionEngine
{
  const hits = [];
  const TE = 'scripts/engine/store/transaction-engine.js';
  for (const e of runtime.filter(live)) {
    if (e.path === TE) continue;
    const t = read(e.path);
    for (const m of t.matchAll(/['"`]system\.credits['"`]\s*:|system\.credits\s*=(?!=)|credits\s*:\s*[^,}\n]*[-+]\s*\w/g)) hits.push({ path: e.path, line: lineAt(t, m.index), text: t.slice(m.index, m.index + 60).split('\n')[0] });
  }
  add({ id: 'P-A10-credit-writes-outside-transaction-engine', invariant: 'A-10', description: 'Live modules (other than TransactionEngine) that build "system.credits" update payloads, assign system.credits, or compute credits: x +/- y in a payload. Text heuristic.', hits: hits.length, files: new Set(hits.map(h => h.path)).size, sites: hits });
}
// A-14 unified actor shell
{
  const regs = J('registrations.json').sheets;
  add({ id: 'P-A14-actor-sheet-registrations', invariant: 'A-14', description: 'Actor sheet classes registered at runtime. Owner direction: character/droid/npc/vehicle -> SWSEV2CharacterSheet (unified shell).', hits: regs.filter(r => /Actors/.test(r.registrar) && !/SWSEV2CharacterSheet/.test(r.args)).length, registrations: regs });
}
// A-16 caches
{
  const hits = [];
  for (const e of runtime.filter(live)) {
    const t = read(e.path);
    const n = (t.match(/new (Map|WeakMap)\(\)/g) || []).length; const cacheWord = (t.match(/\bcache\b/gi) || []).length;
    if (n && cacheWord >= 3) hits.push({ path: e.path, maps: n, cacheMentions: cacheWord, hasInvalidate: /invalidat|clear(Cache)?\(|\.delete\(/.test(t) });
  }
  add({ id: 'P-A16-module-caches', invariant: 'A-16', description: 'Live modules that hold Map/WeakMap caches (>=3 "cache" mentions). hasInvalidate=false is a lead for unbounded or never-invalidated caches.', hits: hits.filter(h => !h.hasInvalidate).length, files: hits.length, sites: hits.sort((a, b) => b.cacheMentions - a.cacheMentions) });
}
// A-15 / A-17 owner authority presence
{
  const need = {
    ActorEngine: 'scripts/governance/actor-engine/actor-engine.js', TransactionEngine: 'scripts/engine/store/transaction-engine.js',
    ProgressionShell: 'scripts/apps/progression-framework/shell/progression-shell.js', ProgressionFinalizer: 'scripts/apps/progression-framework/shell/progression-finalizer.js',
    AbilityEngine: 'scripts/engine/abilities/AbilityEngine.js', ModifierEngine: 'scripts/engine/effects/modifiers/ModifierEngine.js', InventoryEngine: 'scripts/engine/inventory/InventoryEngine.js',
    HouseRuleService: 'scripts/engine/system/HouseRuleService.js',
  };
  const out = Object.entries(need).map(([k, p]) => ({ authority: k, path: p, exists: byPath.has(p), reach: byPath.get(p)?.runtimeReachability ?? null, consumers: byPath.get(p)?.consumerCount ?? null }));
  for (const name of ['ItemCustomizationWorkbench', 'CustomizationWorkflow', 'UpgradeSlotEngine', 'UpgradeService', 'CustomizationBayApp', 'ChargenShell', 'LevelupShell']) {
    const f = reg.find(e => e.classes?.includes(name) || e.exports?.includes(name));
    out.push({ authority: name, path: f?.path ?? null, exists: !!f, reach: f?.runtimeReachability ?? null, consumers: f?.consumerCount ?? null });
  }
  add({ id: 'P-A15-A17-named-authorities', invariant: 'A-15/A-17', description: 'Presence and reachability of owner-named authorities.', hits: out.filter(o => !o.exists || !String(o.reach).startsWith('reachable')).length, authorities: out });
}

const result = { schema: 'swse.architecture-census.invariant-probes/1', auditedCommit: HEAD, generator: 'tools/architecture-census/probe-invariants.mjs', note: 'Hits are candidate violations; Phase 2 classifies them.', probes };
const text = JSON.stringify(result, null, 1) + '\n';
if (CHECK) { const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text; console.log(ok ? 'probes up to date' : 'probes stale'); process.exit(ok ? 0 : 1); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
for (const p of probes) console.log(`${p.id.padEnd(48)} hits=${p.hits}${p.files !== undefined ? ` files=${p.files}` : ''}`);
