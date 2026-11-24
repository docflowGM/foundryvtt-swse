#!/usr/bin/env node
/**
 * Phase 1 assembler — validates domain contract sidecars and generates the
 * cross-domain matrices, ledgers and coverage report.
 * READ-ONLY for the system. Writes only:
 *   data/audits/architecture-census/contracts/{contract-index,authority-matrix,dependency-matrix,
 *     traceability,unresolved-ledger,contradictions,phase1-coverage,validation}.json
 *   docs/architecture/v2-contracts/{authority-matrix,dependency-matrix,traceability,
 *     unresolved-ledger,phase1-coverage}.md
 * Usage: node tools/architecture-census/assemble-contracts.mjs [--check]
 *   --check  exit 1 if validation fails or any output is stale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = path.join(ROOT, 'data', 'audits', 'architecture-census');
const CD = path.join(C, 'contracts');
const DOCS = path.join(ROOT, 'docs', 'architecture', 'v2-contracts');
const CHECK = process.argv.includes('--check');
const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const baseline = J(path.join(C, 'census-baseline.json'));
const AUDITED = baseline.auditedCommit;
const tax = J(path.join(C, 'taxonomy.json')).domains;
const reg = []; for (const f of fs.readdirSync(path.join(C, 'registry'))) if (f !== 'index.json') reg.push(...J(path.join(C, 'registry', f)).files);
const by = new Map(reg.map(e => [e.path, e]));
const graph = J(path.join(C, 'import-graph.json'));

// file line counts at the AUDITED commit (evidence must exist there)
const lineCache = new Map();
function linesAt(p) {
  if (lineCache.has(p)) return lineCache.get(p);
  let n = null;
  try { n = execFileSync('git', ['show', `${AUDITED}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 27, stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').length; } catch { n = null; }
  lineCache.set(p, n); return n;
}
const NEW_PREFIXES = ['docs/architecture/v2-contracts/', 'data/audits/architecture-census/', 'docs/audits/architecture-census/', 'tools/architecture-census/'];
function checkRef(ref) {
  const m = String(ref).trim().match(/^([A-Za-z0-9_@.\/()\- ]+?\.[A-Za-z0-9]+)(?::(\d+)(?:-(\d+))?)?(?:\s|$)/);
  if (!m) return { ok: true, skipped: true };
  const [, p, l1, l2] = m;
  if (NEW_PREFIXES.some(x => p.startsWith(x))) return { ok: fs.existsSync(path.join(ROOT, p)), path: p };
  const n = linesAt(p);
  if (n === null) return { ok: false, path: p, reason: 'missing-at-audited-commit' };
  const hi = Number(l2 || l1 || 0);
  if (hi && hi > n) return { ok: false, path: p, reason: `line ${hi} > ${n}` };
  return { ok: true, path: p };
}

// ---------- domain codes and non-runtime dispositions ----------
const CODES = { 'actor-core': 'ACT', 'abilities-effects': 'ABL', progression: 'PRG', classes: 'CLS', species: 'SPC', skills: 'SKL', feats: 'FEA', talents: 'TAL', force: 'FRC', combat: 'CMB', rolls: 'ROL', equipment: 'EQP', customization: 'CUS', 'store-economy': 'STO', vehicles: 'VEH', droids: 'DRD', 'npc-followers': 'NPC', 'mentor-suggestion': 'MEN', 'galactic-profiles': 'GAL', holonet: 'HOL', games: 'GAM', houserules: 'HRL', chat: 'CHT', 'ui-shell': 'UIS', governance: 'GOV', 'settings-config': 'SET', 'data-registries': 'DAT', infrastructure: 'INF', migration: 'MIG', 'compat-patches': 'PAT' };
const NON_RUNTIME = {
  'dev-tooling': 'Tooling, not a runtime authority. Governed by A-13 (offline evidence only) and by the rule that tools never write production data unless explicitly scoped. Contract: none beyond A-level; individual tools are attributed to the domain they audit.',
  testing: 'Test infrastructure. Tests establish only the behaviour they exercise (A-13). CI runs top-level tests/*.test.mjs only; nested tests are not run.',
  documentation: 'Evidence and history. Authoritative documents are indexed in docs/architecture/v2-contracts/README.md; consolidation candidates are listed in Phase 2 (no deletions in Phases 0–2).',
  assets: 'Static assets consumed by templates/styles/data. Owned by the referencing domain; unreferenced assets are listed in reachability.json.',
  'compendium-packs': 'Pack sources declared in system.json. Content ownership follows the item domain (feats, talents, …); manifest mismatches are CR-12.',
  localization: 'lang/*.json declared in system.json. No mechanical authority.',
  'repo-config': 'Manifest, template.json schema, CI workflows. template.json is the actor/item data-shape authority (schema changes are out of scope for Phases 0–2).',
};
const LAYERS = { // PROPOSED (A-P1)
  infrastructure: 0, 'settings-config': 0, 'data-registries': 0, chat: 0, governance: 0,
  'actor-core': 1, 'abilities-effects': 1, rolls: 1,
  classes: 2, species: 2, skills: 2, feats: 2, talents: 2, force: 2, combat: 2, equipment: 2, customization: 2, 'store-economy': 2, vehicles: 2, droids: 2, 'npc-followers': 2, houserules: 2,
  progression: 3, 'mentor-suggestion': 3, 'galactic-profiles': 3, holonet: 3, games: 3,
  'ui-shell': 4, migration: 5, 'compat-patches': 5,
};

// ---------- load sidecars ----------
const SD = path.join(CD, 'domains');
const sidecars = fs.existsSync(SD) ? fs.readdirSync(SD).filter(f => f.endsWith('.json')).map(f => ({ file: f, data: J(path.join(SD, f)) })) : [];
const errors = []; const warnings = [];
const ids = new Map();
const evidenceChecked = { total: 0, failed: [] };
const reqArrays = ['responsibilities', 'publicInterfaces', 'contradictions', 'unimplemented', 'findings'];
for (const { file, data } of sidecars) {
  if (data.schema !== 'swse.v2-contract.domain/1') errors.push(`${file}: schema`);
  if (!CODES[data.domain]) errors.push(`${file}: unknown domain ${data.domain}`);
  for (const k of reqArrays) if (!Array.isArray(data[k])) errors.push(`${file}: missing array ${k}`);
  const mdName = `B-${CODES[data.domain]}-${data.domain}.md`;
  if (!fs.existsSync(path.join(DOCS, mdName))) errors.push(`${file}: missing ${mdName}`);
  const reg1 = (id, where) => { if (!id) { errors.push(`${file}: missing id in ${where}`); return; } if (ids.has(id)) errors.push(`duplicate id ${id} (${file}, ${ids.get(id)})`); else ids.set(id, file); };
  for (const r of data.responsibilities || []) { reg1(r.id, 'responsibility'); for (const e of r.evidence || []) { evidenceChecked.total++; const c = checkRef(e); if (!c.ok) evidenceChecked.failed.push({ file, id: r.id, ref: e, reason: c.reason }); } }
  for (const r of data.contradictions || []) reg1(r.id, 'contradiction');
  for (const r of data.unimplemented || []) reg1(r.id, 'unimplemented');
  for (const r of data.subsystemContracts || []) reg1(r.id, 'subsystem');
  for (const f of data.findings || []) {
    reg1(f.id, 'finding');
    for (const e of f.evidence || []) { evidenceChecked.total++; const c = checkRef(e); if (!c.ok) evidenceChecked.failed.push({ file, id: f.id, ref: e, reason: c.reason }); }
    for (const p of f.affectedFiles || []) { const c = checkRef(p); if (!c.ok) evidenceChecked.failed.push({ file, id: f.id, ref: p, reason: c.reason }); }
    for (const k of ['category', 'severity', 'status', 'title', 'observed', 'proposedSolution']) if (!f[k]) warnings.push(`${f.id}: missing ${k}`);
  }
}

// ---------- global contradictions from the register ----------
const regMd = fs.readFileSync(path.join(DOCS, 'contradiction-register.md'), 'utf8');
const globalCR = [...regMd.matchAll(/^\| \*\*(CR-\d+)\*\* \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/gm)].map(m => ({ id: m[1], existingSource: m[2], observed: m[3], evidence: m[4], decisionNeeded: m[5], domain: 'global', status: 'CONFLICT' }));
for (const c of globalCR) if (ids.has(c.id)) errors.push(`duplicate id ${c.id}`); else ids.set(c.id, 'contradiction-register.md');

// ---------- matrices ----------
const authority = [];
for (const { data } of sidecars) for (const r of data.responsibilities || []) authority.push({ id: r.id, domain: data.domain, responsibility: r.responsibility, owner: r.owner, status: r.status, verification: r.verification, tests: r.tests || [] });
const domEdges = graph.domainEdges;
const depRows = [];
for (const [k, n] of Object.entries(domEdges)) {
  const [a, b] = k.split(' -> ');
  const la = LAYERS[a], lb = LAYERS[b];
  const kind = la === undefined || lb === undefined ? 'unlayered' : (lb > la ? 'upward' : (lb === la && la === 2 ? 'peer' : 'downward-or-same'));
  depRows.push({ from: a, to: b, edges: n, proposedLayerFrom: la, proposedLayerTo: lb, kind });
}
const declared = {};
for (const { data } of sidecars) declared[data.domain] = data.dependencies || {};
for (const r of depRows) {
  const d = declared[r.from];
  if (d?.prohibited?.includes(r.to)) r.declaredProhibited = true;
  if (d?.allowed?.length) r.declaredAllowed = d.allowed.includes(r.to);
}

// ---------- traceability ----------
const trace = authority.map(a => {
  const ownerEntry = a.owner?.path ? by.get(a.owner.path) : null;
  return { requirement: a.id, domain: a.domain, responsibility: a.responsibility, status: a.status, code: a.owner?.path ? `${a.owner.path}${a.owner.symbol ? ' :: ' + a.owner.symbol : ''}` : null,
    codeReachability: ownerEntry?.runtimeReachability ?? null, namedTests: a.tests, ownerDirectTests: ownerEntry?.tests?.direct?.length ?? 0, ownerCiTests: ownerEntry?.tests?.ciTestCount ?? 0,
    testGap: !(a.tests?.length) && !(ownerEntry?.tests?.direct?.length), foundry: 'not live-verified' };
});
const levelA = fs.readFileSync(path.join(DOCS, 'A-global-invariants.md'), 'utf8');
const aRows = [...levelA.matchAll(/^\| \*\*(A-\d+)\*\* \| (.+?) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/gm)].map(m => ({ requirement: m[1], statement: m[2].replace(/\*\*/g, ''), source: m[3], status: m[4], probe: m[5], observed: m[6] }));

// ---------- unresolved ledger ----------
const ledger = [];
for (const { data } of sidecars) {
  for (const u of data.unimplemented || []) ledger.push({ kind: 'UNIMPLEMENTED', domain: data.domain, id: u.id, item: u.item, source: u.source });
  for (const d of data.deferredRules || []) ledger.push({ kind: 'DEFERRED_RULES_REVIEW', domain: data.domain, id: d.registerRef || null, item: d.item, source: 'docs/audits/swse-rules-decisions-pending.md' });
  for (const f of data.foundryAcceptance || []) ledger.push({ kind: 'FOUNDRY_ACCEPTANCE_REQUIRED', domain: data.domain, id: null, item: f.item, source: f.source });
}

// ---------- coverage ----------
const covered = new Set(sidecars.map(s => s.data.domain));
const coverage = Object.keys(tax).map(d => ({ domain: d, kind: tax[d].kind, files: tax[d].files, runtimeModules: tax[d].runtimeFiles,
  disposition: covered.has(d) ? `contract B-${CODES[d]}` : (NON_RUNTIME[d] ? 'non-runtime disposition' : (CODES[d] ? 'MISSING CONTRACT' : 'no runtime code')),
  note: covered.has(d) ? null : NON_RUNTIME[d] ?? null,
  responsibilities: sidecars.find(s => s.data.domain === d)?.data.responsibilities?.length ?? 0,
  findings: sidecars.find(s => s.data.domain === d)?.data.findings?.length ?? 0 }));
const missing = coverage.filter(c => c.disposition === 'MISSING CONTRACT');
if (missing.length) warnings.push(`domains without contract: ${missing.map(m => m.domain).join(', ')}`);
if (evidenceChecked.failed.length) errors.push(`${evidenceChecked.failed.length} evidence reference(s) do not resolve at ${AUDITED.slice(0, 7)}`);

// ---------- outputs ----------
const outs = new Map();
const putJ = (n, o) => outs.set(path.join(CD, n), JSON.stringify(o, null, 1) + '\n');
const putM = (n, s) => outs.set(path.join(DOCS, n), s);
const H = { auditedCommit: AUDITED, generator: 'tools/architecture-census/assemble-contracts.mjs' };
putJ('contract-index.json', { schema: 'swse.v2-contract.index/1', ...H, levelA: aRows.map(a => a.requirement), contracts: sidecars.map(({ data }) => ({ contractId: data.contractId, domain: data.domain, doc: `docs/architecture/v2-contracts/B-${CODES[data.domain]}-${data.domain}.md`, sidecar: `data/audits/architecture-census/contracts/domains/${data.domain}.json`, responsibilities: data.responsibilities.length, subsystemContracts: (data.subsystemContracts || []).length, contradictions: data.contradictions.length, unimplemented: data.unimplemented.length, findings: data.findings.length })) });
putJ('authority-matrix.json', { schema: 'swse.v2-contract.authority-matrix/1', ...H, rows: authority });
putJ('dependency-matrix.json', { schema: 'swse.v2-contract.dependency-matrix/1', ...H, proposedLayers: LAYERS, note: 'Layers are PROPOSED (A-P1). Edge counts are runtime import edges between primary domains.', rows: depRows.sort((a, b) => b.edges - a.edges) });
putJ('traceability.json', { schema: 'swse.v2-contract.traceability/1', ...H, levelA: aRows, domainRequirements: trace });
putJ('unresolved-ledger.json', { schema: 'swse.v2-contract.unresolved-ledger/1', ...H, counts: ledger.reduce((o, x) => (o[x.kind] = (o[x.kind] || 0) + 1, o), {}), items: ledger });
putJ('contradictions.json', { schema: 'swse.v2-contract.contradictions/1', ...H, global: globalCR, domain: sidecars.flatMap(({ data }) => (data.contradictions || []).map(c => ({ ...c, domain: data.domain }))) });
putJ('phase1-coverage.json', { schema: 'swse.v2-contract.phase1-coverage/1', ...H, domains: coverage, missingContracts: missing.map(m => m.domain) });
putJ('validation.json', { schema: 'swse.v2-contract.validation/1', ...H, sidecars: sidecars.length, uniqueIds: ids.size, evidenceRefsChecked: evidenceChecked.total, evidenceFailures: evidenceChecked.failed, errors, warnings });

const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const st = s => Array.isArray(s) ? s.join(' · ') : (s || '');
putM('authority-matrix.md', `# Authority matrix (generated)\n\nOne row per domain responsibility (\`R-*\`). Source: domain sidecars. Generated by \`tools/architecture-census/assemble-contracts.mjs\` at \`${AUDITED.slice(0, 7)}\`; do not edit by hand.\n\n| ID | Domain | Responsibility | Owner | Status | Verification | Named tests |\n|---|---|---|---|---|---|---:|\n${authority.map(a => `| ${a.id} | \`${a.domain}\` | ${esc(a.responsibility)} | ${a.owner?.path ? `\`${esc(a.owner.path)}\`${a.owner.symbol ? ` ${esc(a.owner.symbol)}` : ''}` : '—'} | ${esc(st(a.status))} | ${esc(a.verification)} | ${a.tests.length} |`).join('\n')}\n`);
const depMd = depRows.filter(r => r.edges >= 3).map(r => `| \`${r.from}\` | \`${r.to}\` | ${r.edges} | ${r.proposedLayerFrom ?? '—'} → ${r.proposedLayerTo ?? '—'} | ${r.kind}${r.declaredProhibited ? ' · **declared prohibited**' : ''} |`).join('\n');
const upward = depRows.filter(r => r.kind === 'upward');
putM('dependency-matrix.md', `# Dependency matrix (generated)\n\nObserved runtime import edges between primary domains at \`${AUDITED.slice(0, 7)}\`, compared with the **PROPOSED** layering A-P1 (0 infrastructure/data/settings/chat/governance → 1 actor-core/abilities/rolls → 2 mechanical domains → 3 orchestrators and features → 4 presentation; 5 migration/patches). Domain-declared allowed/prohibited dependencies come from the domain contracts.\n\n- Domain pairs with edges: ${depRows.length}; upward pairs under A-P1: ${upward.length} (${upward.reduce((s, r) => s + r.edges, 0)} edges); peer pairs between layer-2 domains: ${depRows.filter(r => r.kind === 'peer').length}.\n- Today all 31 code-bearing domains form one strongly connected component (\`import-graph.json\` → \`domainCycles\`).\n\nPairs with at least 3 edges:\n\n| From | To | Edges | Layers (A-P1) | Kind |\n|---|---|---:|---|---|\n${depMd}\n`);
const gap = trace.filter(t => t.testGap);
putM('traceability.md', `# Requirement → code → test traceability (generated)\n\nLevel A invariants trace to probes (see \`A-global-invariants.md\`). Domain requirements trace to the owning module and its tests. **No requirement is live-Foundry-verified.** Generated at \`${AUDITED.slice(0, 7)}\`.\n\n- Domain requirements: ${trace.length}; with a named test or a direct test of the owner module: ${trace.length - gap.length}; **test gaps: ${gap.length}**.\n\n| Requirement | Domain | Code | Reachability | Named tests | Owner direct tests | Owner CI tests (transitive) |\n|---|---|---|---|---:|---:|---:|\n${trace.map(t => `| ${t.requirement}${t.testGap ? ' ⚠' : ''} | \`${t.domain}\` | ${t.code ? `\`${esc(t.code)}\`` : '—'} | ${t.codeReachability ?? '—'} | ${t.namedTests.length} | ${t.ownerDirectTests} | ${t.ownerCiTests} |`).join('\n')}\n`);
const lk = ledger.reduce((o, x) => (o[x.kind] = (o[x.kind] || 0) + 1, o), {});
putM('unresolved-ledger.md', `# Unimplemented and unresolved requirement ledger (generated)\n\nAggregated from domain contracts at \`${AUDITED.slice(0, 7)}\`. Counts: ${Object.entries(lk).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'}. Rules questions are never decided here; they belong in \`docs/audits/swse-rules-decisions-pending.md\`.\n\n| Kind | Domain | ID | Item | Source |\n|---|---|---|---|---|\n${ledger.map(x => `| ${x.kind} | \`${x.domain}\` | ${x.id ?? '—'} | ${esc(x.item)} | ${esc(x.source)} |`).join('\n')}\n`);
putM('phase1-coverage.md', `# Phase 1 coverage (generated)\n\nEvery taxonomy domain has a contract or an explicit disposition. Generated at \`${AUDITED.slice(0, 7)}\`. Validation: ${sidecars.length} sidecars, ${ids.size} unique IDs, ${evidenceChecked.total} evidence references checked against the audited commit, **${evidenceChecked.failed.length} unresolved**, ${errors.length} errors, ${warnings.length} warnings (\`data/audits/architecture-census/contracts/validation.json\`).\n\n| Domain | Kind | Files | Runtime modules | Disposition | Responsibilities | Findings |\n|---|---|---:|---:|---|---:|---:|\n${coverage.map(c => `| \`${c.domain}\` | ${c.kind} | ${c.files} | ${c.runtimeModules} | ${c.disposition}${c.note ? ` — ${esc(c.note)}` : ''} | ${c.responsibilities} | ${c.findings} |`).join('\n')}\n`);

if (CHECK) {
  let stale = 0; for (const [p, t] of outs) if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== t) { stale++; console.error('stale:', path.relative(ROOT, p)); }
  console.log(JSON.stringify({ errors, warnings: warnings.length, evidenceFailures: evidenceChecked.failed.length, stale }, null, 1));
  process.exit(errors.length || stale ? 1 : 0);
}
for (const [p, t] of outs) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); }
console.log(JSON.stringify({ sidecars: sidecars.length, ids: ids.size, evidenceRefs: evidenceChecked.total, evidenceFailures: evidenceChecked.failed.length, errors, warnings: warnings.slice(0, 20) }, null, 1));
