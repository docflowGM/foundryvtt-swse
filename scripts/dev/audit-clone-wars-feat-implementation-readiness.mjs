#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const backlogPath = path.join(root, 'data/feat-implementation/clone-wars-feat-implementation-backlog.json');
const reviewPath = path.join(root, 'data/feat-implementation/clone-wars-feat-implementation-review-list.json');
const expectedNames = [
  'Anointed Hunter','Artillery Shot','Coordinated Barrage','Droid Hunter','Droidcraft','Experienced Medic','Expert Droid Repair','Flash and Clear','Flood of Fire','Grand Army of the Republic Training','Gunnery Specialist','Jedi Familiarity','Leader of Droids','Overwhelming Attack','Pall of the Dark Side','Separatist Military Training','Spray Shot','Trench Warrior','Unwavering Resolve','Wary Defender'
];
const allowedStatuses = new Set(['implemented_correct','implemented_partial','implemented_incorrect','not_implemented','metadata_correct','source_review_required']);
const allowedBuckets = new Set(['Combat','Weapon & Armor','Force','Skills','Droid','Starship & Vehicle','Recovery & Survival','Social & Intrigue','Leadership & Allies']);
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const errors = [];
const warnings = [];
if (!fs.existsSync(backlogPath)) errors.push(`Missing backlog: ${backlogPath}`);
if (!fs.existsSync(reviewPath)) errors.push(`Missing review list: ${reviewPath}`);
let backlog = { feats: [] };
let review = { entries: [] };
if (!errors.length) {
  backlog = json(backlogPath);
  review = json(reviewPath);
  const names = new Set(backlog.feats.map(f => f.name));
  for (const name of expectedNames) if (!names.has(name)) errors.push(`Missing Clone Wars feat backlog entry: ${name}`);
  for (const feat of backlog.feats) {
    if (!feat.description || feat.description.length < 10) errors.push(`${feat.name}: missing useful description`);
    if (!allowedStatuses.has(feat.implementationStatus)) errors.push(`${feat.name}: invalid status ${feat.implementationStatus}`);
    if (!allowedBuckets.has(feat.proposedBucket)) errors.push(`${feat.name}: invalid proposed bucket ${feat.proposedBucket}`);
    if (!feat.proposedSubbucket) errors.push(`${feat.name}: missing proposed subbucket`);
    if (!feat.implementationMode) errors.push(`${feat.name}: missing implementation mode`);
    if (!feat.expectedRuleShape) errors.push(`${feat.name}: missing expected rule shape`);
    if (!feat.observedImplementation) errors.push(`${feat.name}: missing observed implementation`);
    if (!feat.accuracyFinding) errors.push(`${feat.name}: missing accuracy finding`);
    if (feat.name === 'Pall of the Dark Side' && feat.proposedBucket !== 'Force') errors.push('Pall of the Dark Side should remain Force/Dark Side context, not generic skill metadata.');
    if (feat.name === 'Jedi Familiarity' && feat.implementationStatus === 'implemented_correct') errors.push('Jedi Familiarity cannot be correct until ally Force target trigger and temporary Force Point lifecycle are proven.');
    if (feat.name === 'Artillery Shot' && feat.implementationStatus === 'implemented_correct') errors.push('Artillery Shot cannot be correct until areaBonusSquares is consumed by targeting/template logic.');
    if (feat.name === 'Spray Shot' && feat.implementationStatus === 'implemented_correct') errors.push('Spray Shot cannot be correct until autofireAreaSquares/default-area suppression is consumed.');
    if (feat.implementationStatus === 'implemented_correct') {
      const meta = feat.currentAbilityMeta || {};
      const hasKnownConsumer = meta.hasAttackOptionRules || meta.hasSkillCheckBonuses;
      if (!hasKnownConsumer) errors.push(`${feat.name}: marked correct without a known consumed metadata path`);
    }
  }
  const reviewNames = new Set(review.entries.map(e => e.name));
  for (const feat of backlog.feats) {
    if (feat.implementationStatus !== 'implemented_correct' && !reviewNames.has(feat.name)) {
      errors.push(`${feat.name}: non-correct feat missing from review list`);
    }
  }
  if (backlog.feats.length !== expectedNames.length) errors.push(`Expected ${expectedNames.length} feats, found ${backlog.feats.length}`);
}
const report = {
  phase: 'phase-9i-clone-wars-implementation-accuracy',
  checkedAt: new Date().toISOString(),
  strict,
  summary: backlog.summary || {},
  reviewCount: review.entries?.length || 0,
  errors,
  warnings
};
const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'clone-wars-feat-implementation-readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Clone Wars Campaign Guide Feat Implementation Readiness Report',
  '',
  `Checked: ${report.checkedAt}`,
  '',
  '## Summary',
  '',
  `- Feats audited: ${backlog.summary?.totalFeatsAudited ?? 0}`,
  `- Review entries: ${review.entries?.length ?? 0}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  '## Status Counts',
  '',
  ...Object.entries(backlog.summary?.counts ?? {}).map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Review Queue',
  '',
  ...(review.entries ?? []).map(entry => `- ${entry.name}: ${entry.currentObservedStatus} — ${entry.implementationAccuracyConcern}`),
  '',
  '## Errors',
  '',
  ...(errors.length ? errors.map(e => `- ${e}`) : ['- None']),
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.map(w => `- ${w}`) : ['- None'])
];
fs.writeFileSync(path.join(outDir, 'clone-wars-feat-implementation-readiness-report.md'), lines.join('\n') + '\n');
if (errors.length || (strict && warnings.length)) {
  console.error(`Clone Wars feat implementation audit failed: ${errors.length} errors, ${warnings.length} warnings.`);
  process.exit(1);
}
console.log(`Clone Wars feat implementation audit: ${backlog.feats.length} feats, ${warnings.length} warnings, ${errors.length} errors.`);
