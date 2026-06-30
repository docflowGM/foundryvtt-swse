#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const backlogPath = path.join(root, 'data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json');
const reviewPath = path.join(root, 'data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json');
const expectedNames = [
  'Acrobatic Strike','Assured Attack','Autofire Assault','Bantha Herder','Bantha Rush','Battering Attack','Burst of Speed','Charging Fire','Conditioned','Deadeye','Delay Damage','Destructive Force','Disabler','Dive for Cover','Fight Through Pain','Force of Personality','Fortifying Recovery','Friendly Fire Avoidance','Grappling Strike','Headstrong','Low Profile','Mighty Swing','Mission Specialist','Never Surrender','Officer Candidacy Training','Opportunistic Shooter','Pistoleer','Predictive Defense','Reactive Awareness','Reactive Stealth','Reckless Charge','Resilient Reflexes','Resilient Strength','Resilient Will','Riflemaster','Risk Taker','Savage Attack','Scavenger','Slippery Maneuver','Sniper','Sport Hunter','Staggering Attack','Steadying Position','Surgical Precision','Triple Crit','Triple Crit Specialist','Wounding Strike'
];
const allowedStatuses = new Set(['implemented_correct','implemented_partial','implemented_incorrect','not_implemented','metadata_correct','source_review_required']);
const allowedBuckets = new Set(['Combat','Weapon & Armor','Force','Skills','Tech & Equipment','Droid','Cybernetics & Implants','Starship & Vehicle','Recovery & Survival','Social & Intrigue','Species & Origin','Leadership & Allies','Character','GM / Metadata']);
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fail = [];
const warn = [];

for (const p of [backlogPath, reviewPath]) {
  if (!fs.existsSync(p)) fail.push(`Missing required file: ${path.relative(root, p)}`);
}

let backlog = null;
let review = null;
if (!fail.length) {
  backlog = json(backlogPath);
  review = json(reviewPath);
  const names = new Set((backlog.feats || []).map(f => f.name));
  if ((backlog.feats || []).length !== expectedNames.length) fail.push(`Expected ${expectedNames.length} Galaxy at War feats, found ${(backlog.feats || []).length}.`);
  for (const name of expectedNames) if (!names.has(name)) fail.push(`Missing Galaxy at War feat in backlog: ${name}`);

  for (const feat of backlog.feats || []) {
    if (!feat.name) fail.push('Backlog entry missing name.');
    if (!allowedStatuses.has(feat.implementationStatus)) fail.push(`${feat.name}: invalid implementationStatus ${feat.implementationStatus}`);
    if (!allowedBuckets.has(feat.proposedBucket)) fail.push(`${feat.name}: invalid proposedBucket ${feat.proposedBucket}`);
    for (const field of ['description','implementationMode','expectedRuleShape','observedImplementation','accuracyFinding']) {
      if (!String(feat[field] || '').trim()) fail.push(`${feat.name}: missing ${field}`);
    }
    if (feat.name?.toLowerCase().includes('force') && feat.proposedBucket === 'Force') {
      warn.push(`${feat.name}: Force bucket should be source-justified, not name-keyword driven.`);
    }
  }

  const nonCorrect = new Set((backlog.feats || []).filter(f => f.implementationStatus !== 'implemented_correct').map(f => f.name));
  const reviewNames = new Set((review.entries || []).map(e => e.name));
  for (const name of nonCorrect) if (!reviewNames.has(name)) fail.push(`${name}: non-correct feat missing from review list.`);
  for (const entry of review.entries || []) {
    for (const field of ['name','description','proposedBucket','proposedSubbucket','proposedImplementationMode','currentObservedStatus','implementationAccuracyConcern','expectedRuleShape','observedImplementation']) {
      if (!String(entry[field] || '').trim()) fail.push(`${entry.name || '(unknown)'}: review entry missing ${field}`);
    }
  }

  const counts = (backlog.feats || []).reduce((acc, feat) => {
    acc[feat.implementationStatus] = (acc[feat.implementationStatus] || 0) + 1;
    return acc;
  }, {});
  const hasIncorrect = counts.implemented_incorrect > 0;
  if (hasIncorrect) warn.push('There are wrong-shape implementations requiring correction before broad feat automation.');
}

const report = {
  ok: fail.length === 0,
  warnings: warn,
  errors: fail,
  summary: backlog?.summary ?? null,
  generatedAt: new Date().toISOString()
};
const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'galaxy-at-war-feat-implementation-readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'galaxy-at-war-feat-implementation-readiness-report.md'), `# Galaxy at War Feat Implementation Readiness Report\n\n- OK: ${report.ok}\n- Errors: ${fail.length}\n- Warnings: ${warn.length}\n- Total feats audited: ${backlog?.summary?.totalFeatsAudited ?? 0}\n- Review list count: ${backlog?.summary?.reviewListCount ?? 0}\n\n## Counts\n\n${Object.entries(backlog?.summary?.counts ?? {}).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n## Errors\n\n${fail.length ? fail.map(e => `- ${e}`).join('\n') : '- None'}\n\n## Warnings\n\n${warn.length ? warn.map(w => `- ${w}`).join('\n') : '- None'}\n`);

if (fail.length) {
  console.error(`Galaxy at War feat implementation audit failed with ${fail.length} error(s).`);
  for (const e of fail) console.error(`- ${e}`);
  process.exit(1);
}
if (strict && warn.length) {
  console.warn(`Galaxy at War feat implementation audit completed with ${warn.length} warning(s).`);
  for (const w of warn) console.warn(`- ${w}`);
}
console.log(`Galaxy at War feat implementation audit: ${backlog?.summary?.totalFeatsAudited ?? 0} feats, ${warn.length} warnings, ${fail.length} errors.`);
