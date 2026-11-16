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
import { Q1_FOCUS, NEUTRAL_FOCUS, Q2_E, Q2_F } from './q1-focus-phrases.mjs';
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
/* ---------- q1_focus catalog (owner-authorized drafts), neutral focus and E/F (owner-approved) ---------- */
const mcPack = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/multiclass.json'), 'utf8'));
const directionIds = Object.entries(mcPack.q1).flatMap(([d, o]) => Object.entries(o).flatMap(([org, bank]) => bank.filter((a) => a.kind === 'direction').map((a) => a.id)));
const q1Focus = {};
for (const id of directionIds) {
  const key = id.replace(/^mc\./, '').replace('.q1.', '.');
  if (!Q1_FOCUS[key]) fail(`q1_focus phrase missing for ${id}`);
  q1Focus[id] = { id: `mc.q1focus.${key}`, text: Q1_FOCUS[key], editorialStatus: 'draft_text', basis: 'drafted from the authored Q1 answer text (owner-authorized editorial draft, MSV-RD-007)' };
}
if (Object.keys(q1Focus).length !== 100 || Object.keys(Q1_FOCUS).length !== 100) fail('q1_focus catalog must cover exactly 100 substantive Q1 answers');
const q1FocusNeutral = { id: 'mc.q1focus.neutral', text: NEUTRAL_FOCUS, editorialStatus: 'owner_approved_text', basis: 'owner ruling 2026-11-16: factual generic focus for an undecided Q1; no specialization inferred' };
const alternatives = {
  alternative: { id: 'mc.q2.alt', kind: 'alternative', text: Q2_E, editorialStatus: 'owner_approved_text', mechanicsStatus: 'none', ownerRuling: 'MSV-RD-007', note: 'records exploration only' },
  undecided: { id: 'mc.q2.undecided', kind: 'undecided', text: Q2_F, editorialStatus: 'owner_approved_text', mechanicsStatus: 'none', ownerRuling: 'MSV-RD-007', note: 'records no scored preference' },
};
const slotted = Object.values(destinations).flatMap((r) => Object.values(r)).filter((r) => r.needsQ1Focus).length;
writeJson(path.join(ROOT, 'data/mentor-survey/multiclass-q2.json'), {
  _meta: { survey: 'multiclass-q2', contentVersion: 1, sourceCommit: COMMIT, generatedBy: 'tools/mentor-survey/build-multiclass-q2-content.mjs', counts: { templates: 625, destinations: 5, keys: 125, templatesWithQ1FocusSlot: slotted },
    accessorAudit: { accessor: 'IdentityEngine.computeObservedBehaviorBias(actor).mechanicalBias', public: true, pure: true, observedOnly: true, inputs: 'owned item rules primitives, ability scores, skill training', requires: 'primitive registries initialized (returns {} with a warning otherwise)', emittedMechanicalKeys: 43, inCanonical125: 39, notCanonical: ['mobility', 'perception', 'techControl', 'forceConnection'], rule: 'keys outside the canonical 125 are ignored; ties break by key; no padding below four' },
    note: 'Verbatim import of the 625 templates. q1Focus (100 drafted noun phrases), the neutral focus and answers E and F were added under the owner rulings of 2026-11-16 (MSV-RD-007); draft phrases are preview only until reviewed.' },
  keys: canon, destinations,
  q1Focus, q1FocusNeutral, alternatives,
});
console.log('wrote data/mentor-survey/multiclass-q2.json', slotted);
