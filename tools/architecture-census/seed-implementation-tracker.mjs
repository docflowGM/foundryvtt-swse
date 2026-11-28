#!/usr/bin/env node
/**
 * Seeds data/audits/architecture-census/implementation/tracker.json from the
 * Phase 2 finding register. ONE-TIME: refuses to overwrite an existing tracker
 * (the tracker is hand-maintained after seeding; update it with
 * tools/architecture-census/tracker.mjs set ...).
 *
 * Original finding IDs are preserved. Statuses use the program vocabulary:
 *   OPEN, IMPLEMENTED, OFFLINE_TESTED, FOUNDRY_TESTED, PARTIALLY_COMPLETE_BLOCKED,
 *   OWNER_DECISION_REQUIRED, DEFERRED_RULES_REVIEW, INTENTIONALLY_RETAINED,
 *   NOT_REPRODUCED, SUPERSEDED, VERIFIED_NO_CHANGE_NEEDED
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'data', 'audits', 'architecture-census', 'implementation', 'tracker.json');
if (fs.existsSync(OUT)) { console.error('tracker.json exists; refusing to overwrite'); process.exit(1); }
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'audits', 'architecture-census', 'findings', 'finding-register.json'), 'utf8'));

const DOMAIN_PHASE = {
  'cross-cutting': '3A',
  force: '3B', 'store-economy': '3C',
  'actor-core': '3D', governance: '3D', infrastructure: '3D', 'settings-config': '3D', houserules: '3D', migration: '3D', 'data-registries': '3D',
  combat: '3E', rolls: '3E',
  feats: '3F', talents: '3F', 'abilities-effects': '3F',
  progression: '3G', classes: '3G', skills: '3G', species: '3G',
  'npc-followers': '3H', equipment: '3I', customization: '3I',
  vehicles: '3J', droids: '3J',
  'mentor-suggestion': '3K', 'galactic-profiles': '3K',
  holonet: '3L', games: '3L',
  'ui-shell': '3M', chat: '3M',
  'compat-patches': '3N',
};
// explicit overrides where the finding's work belongs to a different phase than its domain
const OVERRIDE = {
  'F-TAL-007': '3B', 'F-HOL-002': '3C', 'F-FRC-005': '3C', 'F-UIS-001': '3C', 'F-PRG-003': '3C', 'F-ABL-002': '3C', 'F-VEH-006': '3C', 'F-FRC-002': '3B', 'F-FRC-003': '3B',
  'F-INF-005': '3B', 'F-PAT-005': '3B',
};
const phaseOf = f => OVERRIDE[f.id] || (f.category === 'dead-code' && f.domain !== 'cross-cutting' ? '3O' : (DOMAIN_PHASE[f.domain] || '3N'));

const entries = reg.findings.map(f => ({
  id: f.id, domain: f.domain, severity: f.severity, category: f.category, title: f.title,
  auditStatus: f.status, wave: f.wave,
  plannedPhase: phaseOf(f),
  status: 'OPEN',
  ownerDecisionRequired: !!f.ownerDecisionRequired, rulesQuestion: !!f.rulesQuestion,
  requiredDecision: null,
  dependencies: f.dependencies || [],
  commits: [], tests: [], foundryAcceptance: 'NOT_RUN',
  notes: '',
}));
const doc = {
  schema: 'swse.implementation-tracker/1',
  baselineCommit: reg.auditedCommit,
  seededFrom: 'data/audits/architecture-census/findings/finding-register.json',
  statusVocabulary: ['OPEN', 'IMPLEMENTED', 'OFFLINE_TESTED', 'FOUNDRY_TESTED', 'PARTIALLY_COMPLETE_BLOCKED', 'OWNER_DECISION_REQUIRED', 'DEFERRED_RULES_REVIEW', 'INTENTIONALLY_RETAINED', 'NOT_REPRODUCED', 'SUPERSEDED', 'VERIFIED_NO_CHANGE_NEEDED'],
  phases: ['3A', '3B', '3C', '3D', '3E', '3F', '3G', '3H', '3I', '3J', '3K', '3L', '3M', '3N', '3O', '3P'],
  findings: entries,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
const byPhase = entries.reduce((o, e) => (o[e.plannedPhase] = (o[e.plannedPhase] || 0) + 1, o), {});
console.log(JSON.stringify({ seeded: entries.length, byPhase }, null, 1));
