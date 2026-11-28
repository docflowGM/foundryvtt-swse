#!/usr/bin/env node
/**
 * Architecture census — per-domain fact packs (input to Phase 1 contracts and
 * Phase 2 reconciliation). READ-ONLY: reads census + probe outputs, writes
 * data/audits/architecture-census/contracts/domain-facts/<domain>.json.
 * Usage: node tools/architecture-census/domain-facts.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = path.join(ROOT, 'data', 'audits', 'architecture-census');
const OUT = path.join(C, 'contracts', 'domain-facts');
const CHECK = process.argv.includes('--check');
const J = p => JSON.parse(fs.readFileSync(path.join(C, p), 'utf8'));
const tax = J('taxonomy.json');
const reg = []; for (const f of fs.readdirSync(path.join(C, 'registry'))) if (f !== 'index.json') reg.push(...J('registry/' + f).files);
const by = new Map(reg.map(e => [e.path, e]));
const graph = J('import-graph.json');
const probes = J('contracts/invariant-probes.json').probes;
const mech = J('mechanical-authority-census.json').responsibilities;
const dup = J('duplication.json');
const regs = J('registrations.json');
const isRt = e => e.imports && (e.path === 'index.js' || e.path.startsWith('scripts/')) && !/^scripts\/(dev|build|debug)\//.test(e.path) && !['node-tool', 'node-script', 'tool-only-import'].includes(e.runtimeReachability);
const outputs = new Map();
for (const [dom, meta] of Object.entries(tax.domains)) {
  const files = reg.filter(e => e.primarySystem === dom);
  const rt = files.filter(isRt);
  const inDom = new Set(rt.map(e => e.path));
  const edgesOut = {}, edgesIn = {};
  for (const [a, b] of graph.edges) {
    const da = by.get(a)?.primarySystem, db = by.get(b)?.primarySystem;
    if (/^(tests|tools)\//.test(a) || da === db) continue;
    if (da === dom) edgesOut[db] = (edgesOut[db] || 0) + 1;
    if (db === dom) edgesIn[da] = (edgesIn[da] || 0) + 1;
  }
  const probeHits = probes.map(p => {
    const list = (p.sites || p.edges || []).filter(s => inDom.has(s.path));
    return list.length ? { probe: p.id, invariant: p.invariant, count: list.reduce((s, x) => s + (x.count || 1), 0), sites: list.slice(0, 60) } : null;
  }).filter(Boolean);
  const mechanics = mech.map(m => { const s = m.siteList.filter(x => x.domain === dom && x.reachable && x.lines >= 4); return s.length ? { responsibility: m.responsibility, otherDomains: m.domains.filter(d => d !== dom), sites: s.map(x => `${x.path}:${x.line} ${x.name}`) } : null; }).filter(Boolean);
  const clones = dup.exactFunctionClones.filter(c => c.sites.some(s => inDom.has(s.path))).map(c => ({ tokens: c.tokens, sites: c.sites.map(s => `${s.path}:${s.line}${s.name ? ' ' + s.name : ''}`) }));
  const dupNames = dup.duplicateSymbolNames.filter(d => d.files.some(f => inDom.has(f)));
  const hooks = regs.hooks.map(h => ({ name: h.name, sites: h.sites.filter(s => inDom.has(s.path) && s.reachable).map(s => `${s.path}:${s.line}`) })).filter(h => h.sites.length);
  const pack = {
    schema: 'swse.architecture-census.domain-facts/1', auditedCommit: J('census-baseline.json').auditedCommit, domain: dom, ...meta,
    counts: { files: files.length, runtimeModules: rt.length, runtimeSloc: rt.reduce((s, e) => s + (e.sloc || 0), 0),
      reachability: rt.reduce((o, e) => (o[e.runtimeReachability] = (o[e.runtimeReachability] || 0) + 1, o), {}),
      nonRuntimeByRole: files.filter(e => !isRt(e)).reduce((o, e) => (o[e.role] = (o[e.role] || 0) + 1, o), {}) },
    topModulesByConsumers: rt.filter(e => e.runtimeReachability.startsWith('reachable')).sort((a, b) => b.consumerCount - a.consumerCount).slice(0, 25).map(e => ({ path: e.path, consumers: e.consumerCount, sloc: e.sloc, role: e.role, exports: e.exports.slice(0, 12), writes: e.stateWrites.total, actorEngineCalls: e.actorEngineCalls, ciTests: e.tests.ciTestCount })),
    largestModules: rt.sort((a, b) => b.sloc - a.sloc).slice(0, 10).map(e => ({ path: e.path, sloc: e.sloc, reach: e.runtimeReachability })),
    unreachableModules: rt.filter(e => ['orphan-unreferenced', 'unreachable-importers-only', 'test-only-import', 'string-referenced-only'].includes(e.runtimeReachability)).map(e => ({ path: e.path, reach: e.runtimeReachability, confidence: e.unreachableConfidence, sloc: e.sloc, tests: e.tests.direct.length })),
    dependsOnDomains: Object.fromEntries(Object.entries(edgesOut).sort((a, b) => b[1] - a[1])),
    dependedOnByDomains: Object.fromEntries(Object.entries(edgesIn).sort((a, b) => b[1] - a[1])),
    probeHits, mechanicalResponsibilities: mechanics, exactClones: clones, duplicateSymbolNames: dupNames, liveHooks: hooks,
    nonRuntimeEvidence: files.filter(e => !isRt(e) && /^(docs|data\/audits)\//.test(e.path)).map(e => e.path).slice(0, 200),
    tests: files.filter(e => e.top === 'tests').map(e => e.path),
  };
  outputs.set(`${dom}.json`, JSON.stringify(pack, null, 1) + '\n');
}
if (CHECK) { let bad = 0; for (const [n, t] of outputs) { const p = path.join(OUT, n); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== t) bad++; } console.log(bad ? `${bad} stale` : 'domain facts up to date'); process.exit(bad ? 1 : 0); }
fs.mkdirSync(OUT, { recursive: true });
for (const [n, t] of outputs) fs.writeFileSync(path.join(OUT, n), t);
console.log(`wrote ${outputs.size} domain fact packs`);
