#!/usr/bin/env node
// Phase 5C-9/10: writes data/audits/phase-5c-authority-classification.json and docs/audits/phase-5c-authority-classification.md
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/canonical-weapons-shared.mjs';
import { buildClassification, CLASSIFICATION_FILE, OTHER_DOMAIN_DEFINITION, REFERENCE_BEARING_DEFINITION } from './lib/canonical-authority-classification.mjs';

const c = buildClassification();
if (c.unclassified.length) { console.error(`unclassified:\n${c.unclassified.join('\n')}`); process.exit(1); }
fs.writeFileSync(path.join(ROOT, CLASSIFICATION_FILE), `${JSON.stringify(c, null, 1)}\n`);
const nonAudit = c.entries.filter((e) => e.class !== 'HISTORICAL_AUDIT_EVIDENCE' || !e.path.startsWith('data/audits/'));
const md = [
  '# Phase 5C — Feat/Weapon Data Authority Classification', '',
  'Every feat/weapon data file under `data/` and `packs/` is classified exactly once. `tools/verify-canonical-production.mjs` fails on any unclassified or re-classified file.', '',
  '| Class | Files |', '|---|---|', ...Object.entries(c.counts).map(([k, v]) => `| ${k} | ${v} |`), '',
  'Dependency direction: audits (evidence) → canonical corpus → deterministic generators → Foundry packs, runtime registries, compatibility outputs. Nothing flows back.', '',
  'The seven authority-role classes describe feat/weapon authority. Two further classes cover files OUTSIDE that ownership boundary (approved by the planner with guardrails):', '',
  `* **${OTHER_DOMAIN_DEFINITION}**`, `* **${REFERENCE_BEARING_DEFINITION}**`, '',
  'Guardrail (enforced by `tools/verify-canonical-production.mjs`): neither class may be used for a file that defines canonical feat/weapon identity, rules or mechanics, overrides canonical identity, keeps another feat/weapon description/stat copy as truth, or exempts a parallel authority from the Phase 5C gate. A file that does so must be classified under a canonical/generated/migration/audit class or rejected.', '',
  '## Files (excluding `data/audits/*` evidence)', '', '| Path | Class | Source / note |', '|---|---|---|', ...nonAudit.map((e) => `| \`${e.path}\` | ${e.class} | ${e.note} |`), '',
  `Audit evidence files under \`data/audits/\` (${c.entries.filter((e) => e.path.startsWith('data/audits/')).length}) are all HISTORICAL_AUDIT_EVIDENCE; listed individually in the JSON.`, ''].join('\n');
fs.writeFileSync(path.join(ROOT, 'docs/audits/phase-5c-authority-classification.md'), md);
console.log(`classified ${c.entries.length} files ${JSON.stringify(c.counts)}`);
