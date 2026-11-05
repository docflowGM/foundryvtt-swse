#!/usr/bin/env node
/** Render data/audits/vehicles/p6b-deferred-work.json -> docs/audits/vehicles/p6b-deferred-work.md. --write | --check */
import fs from 'node:fs';
const SRC = 'data/audits/vehicles/p6b-deferred-work.json', OUT = 'docs/audits/vehicles/p6b-deferred-work.md';
const mode = process.argv[2];
if (!['--write', '--check'].includes(mode)) { console.error('usage: --write|--check'); process.exit(2); }
const d = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const errs = [], seen = new Set();
for (const i of d.items) {
  if (seen.has(i.id)) errs.push(`duplicate ${i.id}`); seen.add(i.id);
  if (!d.categories.includes(i.status)) errs.push(`${i.id}: bad status ${i.status}`);
  if (!d.severities.includes(i.severity)) errs.push(`${i.id}: bad severity ${i.severity}`);
  for (const k of ['component', 'source', 'reason', 'missing', 'impact', 'recommendedAction']) if (!i[k]) errs.push(`${i.id}: missing ${k}`);
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const open = d.items.filter(i => !i.resolution), resolved = d.items.filter(i => i.resolution);
const esc = s => String(s).replace(/\|/g, '\\|');
const rank = { BLOCKING: 0, IMPORTANT: 1, MINOR: 2 };
let md = `# P6B deferred work (side bucket)\n\nGenerated from \`${SRC}\` by \`tools/audits/vehicles/build-p6b-deferred-work.mjs\`; edit the JSON, not this file.\n\n${d.purpose}\n\n`;
md += `## Summary\n\n| Category | Count |\n|---|---|\n`;
for (const c of d.categories) md += `| ${c} | ${open.filter(i => i.status === c).length} |\n`;
md += `\nOpen items: ${open.length}. Resolved items: ${resolved.length} (listed at the end).\n`;
md += `\n## Items (by severity)\n\n| ID | Workstream | Component | Category | Severity | Owner ruling | Linked |\n|---|---|---|---|---|---|---|\n`;
for (const i of [...open].sort((a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id)))
  md += `| ${i.id} | ${i.workstream} | ${esc(i.component)} | ${i.status} | ${i.severity} | ${i.ownerRulingNeeded ? 'yes' : 'no'} | ${i.linkedDecisions.join(', ') || '-'} |\n`;
md += `\n## Details\n`;
for (const i of open) {
  md += `\n### ${i.id} - ${i.component}\n\n- **Source:** ${i.source}\n- **Category / severity:** ${i.status} / ${i.severity}\n- **Reason:** ${i.reason}\n- **Missing:** ${i.missing}\n`;
  md += `- **Owner ruling needed:** ${i.ownerRulingNeeded ? 'yes' : 'no'}${i.linkedDecisions.length ? ` (${i.linkedDecisions.join(', ')})` : ''}\n`;
  if (i.options.length) md += `- **Source-supported options:** ${i.options.join('; ')}\n`;
  md += `- **Impact:** ${i.impact}\n- **Recommended action:** ${i.recommendedAction}\n`;
}
if (resolved.length) {
  md += `\n## Resolved items\n`;
  for (const i of resolved) md += `\n### ${i.id} - ${i.component}\n\n- **Resolved:** ${i.resolution}\n- **Was:** ${i.reason}\n`;
}
if (mode === '--write') { fs.writeFileSync(OUT, md); console.log(`wrote ${OUT} (${d.items.length} items)`); }
else if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== md) { console.error(`${OUT} is stale; run --write`); process.exit(1); }
else console.log(`up to date (${d.items.length} items)`);
