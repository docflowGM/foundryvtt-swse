#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'packs', 'forcepowers.db');
const REVIEW = path.join(ROOT, 'data', 'force', 'force-power-source-reconciliation.json');
const OUT_JSON = path.join(ROOT, 'docs', 'audits', 'generated', 'force-power-source-reconciliation-audit.json');
const OUT_MD = path.join(ROOT, 'docs', 'audits', 'generated', 'force-power-source-reconciliation-audit.md');

const slugify = value => String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const docs = fs.readFileSync(PACK, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const reviewed = JSON.parse(fs.readFileSync(REVIEW, 'utf8')).records ?? {};

const inventory = docs.map(doc => {
  const slug = slugify(doc.name);
  const review = reviewed[slug] ?? null;
  return {
    id: doc._id,
    slug,
    name: doc.name,
    sourcebook: review?.sourcebook ?? doc.system?.sourcebook ?? doc.system?.source ?? null,
    page: review?.page ?? doc.system?.page ?? null,
    sourceVerified: review?.sourceVerified === true,
    driftSeverity: review?.driftSeverity ?? 'unreviewed',
    primaryBehavior: review?.primaryBehavior ?? 'unclassified',
    secondaryBehaviors: review?.secondaryBehaviors ?? [],
    resolutionMethod: review?.resolutionMethod ?? 'unclassified',
    implementationPhase: review?.implementationPhase ?? null,
    currentPackFinding: review?.currentPackFinding ?? null,
    runtimeFinding: review?.runtimeFinding ?? null,
    requiredCorrections: review?.requiredCorrections ?? [],
    currentFields: Object.keys(doc.system ?? {}).sort()
  };
});

const missingReviewedRecords = Object.entries(reviewed)
  .filter(([slug]) => !inventory.some(row => row.slug === slug))
  .map(([slug, record]) => ({ slug, name: record.name, issue: 'review record has no exact pack match' }));

const severityOrder = ['critical', 'major', 'moderate', 'minor', 'none', 'unreviewed'];
const counts = Object.fromEntries(severityOrder.map(level => [level, inventory.filter(row => row.driftSeverity === level).length]));
const report = {
  generatedAt: new Date().toISOString(),
  totalPackPowers: inventory.length,
  reviewedPowers: inventory.filter(row => row.sourceVerified).length,
  unreviewedPowers: inventory.filter(row => !row.sourceVerified).length,
  counts,
  missingReviewedRecords,
  inventory: inventory.sort((a, b) => {
    const ai = severityOrder.indexOf(a.driftSeverity);
    const bi = severityOrder.indexOf(b.driftSeverity);
    return ai - bi || a.name.localeCompare(b.name);
  })
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
const rows = report.inventory.map(row => `| ${row.name} | ${row.sourcebook ?? '—'} | ${row.page ?? '—'} | ${row.driftSeverity} | ${row.primaryBehavior} | ${row.resolutionMethod} | ${row.implementationPhase ?? '—'} |`).join('\n');
const missing = missingReviewedRecords.map(row => `- ${row.name} (\`${row.slug}\`): ${row.issue}`).join('\n') || '- None';
fs.writeFileSync(OUT_MD, `# Force Power Source Reconciliation Audit\n\nGenerated: ${report.generatedAt}\n\n## Coverage\n\n- Pack powers: **${report.totalPackPowers}**\n- Source reviewed: **${report.reviewedPowers}**\n- Awaiting source review: **${report.unreviewedPowers}**\n- Critical drift: **${counts.critical}**\n- Major drift: **${counts.major}**\n\n## Review-record mismatches\n\n${missing}\n\n## Inventory\n\n| Power | Source | Page | Drift | Primary behavior | Resolution | Implementation phase |\n|---|---|---:|---|---|---|---:|\n${rows}\n\n## Policy\n\nUnreviewed rows are inventory entries only. They are not rules-authoritative and must not be migrated to automation-ready resolution data until checked against the printed source.\n`);
console.log(JSON.stringify({ total: report.totalPackPowers, reviewed: report.reviewedPowers, unreviewed: report.unreviewedPowers, counts, missingReviewedRecords }, null, 2));
if (missingReviewedRecords.length) process.exitCode = 1;
