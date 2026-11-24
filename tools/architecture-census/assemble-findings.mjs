#!/usr/bin/env node
/**
 * Phase 2 assembler — builds the sortable finding register (execution backlog),
 * category reports, the dependency-ordered remediation roadmap and the updated
 * complexity baseline from the domain sidecars plus cross-cutting findings.
 * READ-ONLY for the system. Writes only data/audits/architecture-census/findings/*
 * and docs/audits/architecture-census/phase-2-*.md (generated tables).
 * Usage: node tools/architecture-census/assemble-findings.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = path.join(ROOT, 'data', 'audits', 'architecture-census');
const FD = path.join(C, 'findings');
const DOCS = path.join(ROOT, 'docs', 'audits', 'architecture-census');
const CHECK = process.argv.includes('--check');
const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const baseline = J(path.join(C, 'census-baseline.json'));
const AUDITED = baseline.auditedCommit;
const reg = []; for (const f of fs.readdirSync(path.join(C, 'registry'))) if (f !== 'index.json') reg.push(...J(path.join(C, 'registry', f)).files);
const by = new Map(reg.map(e => [e.path, e]));
const sidecars = fs.readdirSync(path.join(C, 'contracts', 'domains')).filter(f => f.endsWith('.json')).map(f => J(path.join(C, 'contracts', 'domains', f)));
const cross = fs.existsSync(path.join(C, 'contracts', 'cross-cutting-findings.json')) ? J(path.join(C, 'contracts', 'cross-cutting-findings.json')).findings : [];

const SEV = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const findings = [];
for (const s of sidecars) for (const f of s.findings) findings.push({ ...f, domain: s.domain, contract: s.contractId });
for (const f of cross) findings.push({ ...f, domain: f.domain || 'cross-cutting', contract: 'A/X' });

// normalise
for (const f of findings) {
  f.severity = (f.severity || 'info').toLowerCase(); if (!(f.severity in SEV)) f.severity = 'info';
  f.status = (f.status || 'suspected').toLowerCase();
  f.affectedSloc = (f.affectedFiles || []).reduce((s, p) => s + (by.get(String(p).split(':')[0])?.sloc || 0), 0);
}

// roadmap wave assignment (dependency order)
const CAT_WAVE = {
  documentation: 1, 'contract-contradiction': 1,
  'dead-code': 2, 'legacy-compat': 2,
  'bypass-engine': 3, 'ownership-violation': 3, 'presentation-rules': 3, 'unauthorized-persistence': 3, 'multiple-writers': 3,
  'duplicate-normalization': 3, 'wrapper-indirection': 3,
  'duplicate-authority': 4, 'duplicate-schema-interpretation': 4, 'conflicting-interface': 4, 'redundant-state': 4,
  dependency: 5, 'oversized-module': 5, consolidation: 5, performance: 5, unimplemented: 6,
};
const WAVES = {
  0: 'Guardrails: census/probe gates in CI (ratchet), no behaviour change',
  1: 'Owner decisions and documentation/contract corrections',
  2: 'Remove proven-dead and retired code (static proof; class C/D)',
  3: 'Reroute bypasses to existing authorities (ActorEngine, swse-chat, HouseRuleService, TransactionEngine)',
  4: 'Consolidate duplicate authorities and state (rules-sensitive; Foundry acceptance)',
  5: 'Structural simplification: cycles, layering, oversized modules, performance',
  6: 'Unimplemented integrations and deferred mechanics (owner/rules decisions first)',
};
for (const f of findings) {
  let w = f.wave ?? CAT_WAVE[f.category] ?? 5;
  if (f.ownerDecisionRequired && w > 1 && f.category !== 'unimplemented') f.blockedByOwnerDecision = true;
  if (f.rulesQuestion) f.blockedByRulesDecision = true;
  if (f.status === 'suspected' && w === 2) f.requiresRuntimeProof = true;
  f.wave = w;
}
findings.sort((a, b) => a.wave - b.wave || SEV[a.severity] - SEV[b.severity] || (a.status === 'confirmed' ? -1 : 1) - (b.status === 'confirmed' ? -1 : 1) || a.id.localeCompare(b.id));

const idDup = findings.length - new Set(findings.map(f => f.id)).size;
const count = (arr, k) => arr.reduce((o, x) => (o[k(x)] = (o[k(x)] || 0) + 1, o), {});
const pick = cats => findings.filter(f => cats.includes(f.category));
const deadConfirmedSloc = [...new Set(findings.filter(f => f.category === 'dead-code' && f.status === 'confirmed').flatMap(f => f.affectedFiles || []))].reduce((s, p) => s + (by.get(String(p).split(':')[0])?.sloc || 0), 0);
const deadAllSloc = [...new Set(findings.filter(f => f.category === 'dead-code').flatMap(f => f.affectedFiles || []))].reduce((s, p) => s + (by.get(String(p).split(':')[0])?.sloc || 0), 0);

const outs = new Map();
const H = { auditedCommit: AUDITED, generator: 'tools/architecture-census/assemble-findings.mjs' };
const put = (n, o) => outs.set(path.join(FD, n), JSON.stringify(o, null, 1) + '\n');
const COLS = ['id', 'domain', 'wave', 'severity', 'status', 'category', 'title', 'affectedFiles', 'evidence', 'observed', 'intendedOwnership', 'contractRef', 'proposedSolution', 'alternatives', 'dependencies', 'ownerDecisionRequired', 'rulesQuestion', 'regressionTests', 'foundryAcceptance', 'scope', 'simplificationBenefit', 'risk', 'perfImpact', 'affectedSloc'];
put('finding-register.json', { schema: 'swse.v2-audit.finding-register/1', ...H, columns: COLS, waves: WAVES, total: findings.length, duplicateIds: idDup,
  counts: { bySeverity: count(findings, f => f.severity), byStatus: count(findings, f => f.status), byCategory: count(findings, f => f.category), byWave: count(findings, f => f.wave), byDomain: count(findings, f => f.domain),
    ownerDecisionRequired: findings.filter(f => f.ownerDecisionRequired).length, rulesQuestions: findings.filter(f => f.rulesQuestion).length }, findings });
const csvCell = v => { const s = Array.isArray(v) ? v.join('; ') : String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
outs.set(path.join(FD, 'finding-register.csv'), [COLS.join(','), ...findings.map(f => COLS.map(c => csvCell(f[c])).join(','))].join('\n') + '\n');
put('ownership-conflicts.json', { ...H, findings: pick(['ownership-violation', 'bypass-engine', 'presentation-rules', 'unauthorized-persistence', 'contract-contradiction', 'conflicting-interface', 'dependency']) });
put('duplicate-authority.json', { ...H, findings: pick(['duplicate-authority', 'multiple-writers', 'redundant-state', 'duplicate-schema-interpretation']) });
put('dead-code-candidates.json', { ...H, confirmedSloc: deadConfirmedSloc, allCandidateSloc: deadAllSloc, findings: pick(['dead-code']) });
put('legacy-compat-inventory.json', { ...H, findings: pick(['legacy-compat', 'wrapper-indirection']) });
put('consolidation-register.json', { ...H, findings: pick(['consolidation', 'duplicate-normalization', 'oversized-module', 'wrapper-indirection']) });
put('performance-investigation.json', { ...H, note: 'Static-analysis hypotheses unless a finding says otherwise; no live Foundry measurement exists.', findings: pick(['performance']) });
put('documentation-candidates.json', { ...H, note: 'Candidates only. Phases 0–2 delete nothing.', findings: pick(['documentation']) });
put('unimplemented.json', { ...H, findings: pick(['unimplemented']) });
const roadmap = Object.entries(WAVES).map(([w, title]) => {
  const fs_ = findings.filter(f => f.wave === Number(w));
  return { wave: Number(w), title, findings: fs_.length, bySeverity: count(fs_, f => f.severity), ownerBlocked: fs_.filter(f => f.blockedByOwnerDecision || f.ownerDecisionRequired).length, items: fs_.map(f => ({ id: f.id, severity: f.severity, status: f.status, domain: f.domain, title: f.title, scope: f.scope, dependencies: f.dependencies || [], ownerDecisionRequired: !!f.ownerDecisionRequired })) };
});
put('remediation-roadmap.json', { schema: 'swse.v2-audit.roadmap/1', ...H, waves: roadmap });
put('complexity-baseline-updated.json', { schema: 'swse.v2-audit.complexity/1', ...H, phase0: baseline.complexity, phase0Js: { slocRuntime: baseline.js.slocRuntime, runtimeReachability: baseline.js.runtimeReachability }, phase0StateWrites: baseline.stateWrites,
  phase2: { findings: findings.length, confirmed: findings.filter(f => f.status === 'confirmed').length, confirmedDuplicateAuthorities: findings.filter(f => f.category === 'duplicate-authority' && f.status === 'confirmed').length,
    deadCodeCandidateSloc: deadAllSloc, deadCodeConfirmedSloc: deadConfirmedSloc, deadCodeConfirmedPctOfRuntime: +(100 * deadConfirmedSloc / baseline.js.slocRuntime).toFixed(2),
    legacyCandidates: pick(['legacy-compat', 'wrapper-indirection']).length, consolidationOpportunities: pick(['consolidation', 'duplicate-normalization', 'oversized-module']).length } });

const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const md = `# Phase 2 finding register (generated)\n\nSortable backlog: \`data/audits/architecture-census/findings/finding-register.json\` / \`.csv\`. Generated by \`tools/architecture-census/assemble-findings.mjs\` at \`${AUDITED.slice(0, 7)}\`; do not edit by hand. Ordered by roadmap wave, then severity, then confirmed-before-suspected.\n\nTotals: ${findings.length} findings · ${Object.entries(count(findings, f => f.severity)).map(([k, v]) => `${k} ${v}`).join(' · ')} · confirmed ${findings.filter(f => f.status === 'confirmed').length} / suspected ${findings.filter(f => f.status !== 'confirmed').length} · owner decision needed ${findings.filter(f => f.ownerDecisionRequired).length} · rules questions ${findings.filter(f => f.rulesQuestion).length}.\n\n${roadmap.map(w => `## Wave ${w.wave} — ${w.title} (${w.findings})\n\n| ID | Sev | Status | Domain | Category | Title | Scope | Owner? |\n|---|---|---|---|---|---|---|---|\n${findings.filter(f => f.wave === w.wave).map(f => `| ${f.id} | ${f.severity} | ${f.status} | \`${f.domain}\` | ${f.category} | ${esc(f.title)} | ${f.scope || ''} | ${f.ownerDecisionRequired ? 'yes' : ''} |`).join('\n') || '| — | | | | | | | |'}\n`).join('\n')}`;
outs.set(path.join(DOCS, 'phase-2-finding-register.md'), md);

if (CHECK) { let st = 0; for (const [p, t] of outs) if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== t) { st++; console.error('stale', path.relative(ROOT, p)); } console.log(st ? `${st} stale` : 'findings up to date'); process.exit(st || idDup ? 1 : 0); }
for (const [p, t] of outs) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); }
console.log(JSON.stringify({ findings: findings.length, duplicateIds: idDup, bySeverity: count(findings, f => f.severity), byWave: count(findings, f => f.wave), deadConfirmedSloc, deadAllSloc }, null, 1));
