#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backlogPath = path.join(root, 'data/feat-implementation/scum-and-villainy-feat-implementation-backlog.json');
const reviewPath = path.join(root, 'data/feat-implementation/scum-and-villainy-feat-implementation-review-list.json');
const expectedNames = ['Close Combat Escape','Collateral Damage','Cornered','Deadly Sniper','Deceptive Drop','Duck and Cover','Fleet-Footed','Friends in Low Places','Hasty Modification','Hideous Visage','Impersonate','Impetuous Move','Impulsive Flight','Knife Trick','Lightning Draw','Metamorph','Opportunistic Retreat','Resurgence','Signature Device','Stay Up','Superior Tech','Tactical Advantage','Wicked Strike'];
const allowedStatuses = new Set(['implemented_correct','implemented_partial','implemented_incorrect','not_implemented','metadata_correct','source_review_required']);
const allowedBuckets = new Set(['Combat','Weapon & Armor','Force','Skills','Tech & Equipment','Droid','Cybernetics & Implants','Starship & Vehicle','Recovery & Survival','Social & Intrigue','Species & Origin','Leadership & Allies','Character','GM / Metadata']);
const fail = [];
const warn = [];
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
for (const p of [backlogPath, reviewPath]) if (!fs.existsSync(p)) fail.push(`Missing required file: ${path.relative(root, p)}`);
if (!fail.length) {
  const backlog = json(backlogPath);
  const review = json(reviewPath);
  const feats = backlog.feats || [];
  const names = new Set(feats.map(f => f.name));
  if (feats.length !== expectedNames.length) fail.push(`Expected ${expectedNames.length} Scum and Villainy feats, found ${feats.length}.`);
  for (const name of expectedNames) if (!names.has(name)) fail.push(`Missing Scum and Villainy feat in backlog: ${name}`);
  for (const feat of feats) {
    if (!allowedStatuses.has(feat.implementationStatus)) fail.push(`${feat.name}: invalid implementationStatus ${feat.implementationStatus}`);
    if (!allowedBuckets.has(feat.proposedBucket)) fail.push(`${feat.name}: invalid proposedBucket ${feat.proposedBucket}`);
    for (const field of ['description','implementationMode','expectedRuleShape','observedImplementation','accuracyFinding']) {
      if (!String(feat[field] || '').trim()) fail.push(`${feat.name}: missing ${field}`);
    }
    if (feat.implementationStatus === 'implemented_correct' && !String(feat.observedImplementation || '').match(/CombatOptionResolver|consumer|runtime|ATTACK_OPTION/i)) {
      warn.push(`${feat.name}: implemented_correct should name the runtime support that makes it correct.`);
    }
    if (feat.implementationStatus === 'source_review_required' && !String(feat.accuracyFinding || '').match(/review|source|exact/i)) {
      fail.push(`${feat.name}: source_review_required requires explicit review/source reason.`);
    }
  }
  const reviewNames = new Set((review.entries || []).map(e => e.name));
  for (const feat of feats) {
    if (feat.implementationStatus !== 'implemented_correct' && !reviewNames.has(feat.name)) fail.push(`${feat.name}: non-correct feat missing from review list.`);
  }
  if ((backlog.summary?.totalFeatsAudited ?? 0) !== feats.length) fail.push('Backlog summary totalFeatsAudited does not match feats length.');
}
const report = { summary: { ok: fail.length === 0, errors: fail.length, warnings: warn.length }, errors: fail, warnings: warn };
const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'scum-and-villainy-feat-implementation-readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'scum-and-villainy-feat-implementation-readiness-report.md'), `# Scum and Villainy Feat Implementation Readiness Report\n\n- Errors: ${fail.length}\n- Warnings: ${warn.length}\n\n${fail.length ? fail.map(e => `- ERROR: ${e}`).join('\n') : 'No errors.'}\n`);
if (fail.length || (warn.length && process.argv.includes('--strict'))) {
  console.error(`Scum and Villainy feat implementation audit failed: ${fail.length} errors, ${warn.length} warnings.`);
  process.exit(1);
}
console.log(`Scum and Villainy feat implementation audit: ${expectedNames.length} feats, ${warn.length} warnings, ${fail.length} errors.`);
