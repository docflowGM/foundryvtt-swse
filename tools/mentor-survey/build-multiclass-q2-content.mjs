#!/usr/bin/env node
/**
 * Build data/mentor-survey/multiclass-q2.json from the committed Q2 mechanical-bias x destination library (625 templates).
 *
 *   node tools/mentor-survey/build-multiclass-q2-content.mjs --source <dir with SWSE_Multiclass_Survey_Rolling_Design.md>
 *
 * Imported verbatim. Each template carries a {{q1_focus}} slot that the design says must be filled from a CERTIFIED short
 * noun phrase per Q1 answer. No such phrase is authored in the committed design, so `q1Focus` ships EMPTY and Q2 stays
 * unavailable until the owner supplies the 100 phrases (MSV-RD-007). The 125 keys are validated against
 * data/bias-keys-canonical.json (they are the legacy mechanical-bias vocabulary, not the 190-tag ontology).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoted, readLines, find, writeJson, fail } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const COMMIT = 'eb531a6b0fc5482edd62eedfea4dfebd312946ee'; const FILE = 'docs/design/SWSE_Multiclass_Survey_Rolling_Design.md';
const args = process.argv.slice(2); const src = args[args.indexOf('--source') + 1]; if (!src) fail('--source <dir> is required');
const L = readLines(path.join(src, 'SWSE_Multiclass_Survey_Rolling_Design.md'));
const canon = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/bias-keys-canonical.json'), 'utf8')).mechanicalBias);
const start = find(L, /^## Q2 — COMPLETE MECHANICAL-BIAS × DESTINATION-CLASS DIALOGUE LIBRARY/); if (start < 0) fail('Q2 library not found');
const end = find(L, /^### Validation and acceptance record/, start);
const DEST = { Noble: 'noble', Jedi: 'jedi', Scoundrel: 'scoundrel', Scout: 'scout', Soldier: 'soldier' };
const destinations = {};
for (let i = start; i < end; i++) {
  const h = /^### Destination: (Noble|Jedi|Scoundrel|Scout|Soldier) — 125 first-person Q2 candidates$/.exec(L[i]); if (!h) continue;
  const d = DEST[h[1]]; const rows = {};
  for (let j = i + 1; j < end && !/^### /.test(L[j]); j++) {
    const m = /^- \*\*`(\w+)`\*\* — (“.+”)$/.exec(L[j]); if (!m) continue;
    if (!canon.includes(m[1])) fail(`Q2 ${d}: key ${m[1]} is not in the canonical 125`);
    const text = quoted(m[2]);
    rows[m[1]] = { id: `mc.q2.${d}.${m[1].toLowerCase()}`, biasKey: m[1], text, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { commit: COMMIT, file: FILE, anchor: `Q2 library ${h[1]} ${m[1]}` }, kind: 'integration', needsQ1Focus: /\{\{q1_focus\}\}/.test(text) };
  }
  if (Object.keys(rows).length !== 125 || canon.some((k) => !rows[k])) fail(`Q2 ${d}: expected exactly the 125 canonical keys, got ${Object.keys(rows).length}`);
  destinations[d] = rows;
}
if (Object.keys(destinations).length !== 5) fail('Q2: expected 5 destinations');
const slotted = Object.values(destinations).flatMap((r) => Object.values(r)).filter((r) => r.needsQ1Focus).length;
writeJson(path.join(ROOT, 'data/mentor-survey/multiclass-q2.json'), {
  _meta: { survey: 'multiclass-q2', contentVersion: 1, sourceCommit: COMMIT, generatedBy: 'tools/mentor-survey/build-multiclass-q2-content.mjs', counts: { templates: 625, destinations: 5, keys: 125, templatesWithQ1FocusSlot: slotted },
    accessorAudit: { accessor: 'IdentityEngine.computeObservedBehaviorBias(actor).mechanicalBias', public: true, pure: true, observedOnly: true, inputs: 'owned item rules primitives, ability scores, skill training', requires: 'primitive registries initialized (returns {} with a warning otherwise)', emittedMechanicalKeys: 43, inCanonical125: 39, notCanonical: ['mobility', 'perception', 'techControl', 'forceConnection'], rule: 'keys outside the canonical 125 are ignored; ties break by key; no padding below four' },
    note: 'Verbatim import. q1Focus is intentionally empty: the design requires certified noun phrases per Q1 answer and none is authored. Answers E (alternate direction) and F (not sure) exist only as illustrative prototypes, not as a generic authored pair.' },
  keys: canon, destinations,
  q1Focus: {},
});
console.log('wrote data/mentor-survey/multiclass-q2.json', slotted);
