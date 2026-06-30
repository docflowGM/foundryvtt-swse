import fs from 'node:fs';

const failOnWarnings = process.argv.includes('--strict');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = readJson('data/feat-catalog.json');
const pack = fs.readFileSync('packs/feats.db', 'utf8').trim().split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
const taxonomy = readJson('data/feat-taxonomy/expanded-feat-bucket-taxonomy.json');
const sourceReview = readJson('data/feat-taxonomy/feat-taxonomy-source-review-list.json');

const errors = [];
const warnings = [];
const ok = [];
const bucketDefs = taxonomy.buckets || {};
const validBuckets = new Set(Object.keys(bucketDefs));
const validSubbuckets = new Map(Object.entries(bucketDefs).map(([bucket, subs]) => [bucket, new Set(subs)]));
const catalogByName = new Map(catalog.map((feat) => [feat.name, feat]));
const packByName = new Map(pack.map((feat) => [feat.name, feat]));

if (catalog.length !== pack.length) errors.push(`Catalog/pack feat count mismatch: ${catalog.length} catalog vs ${pack.length} pack.`);
else ok.push(`Catalog and pack both contain ${catalog.length} feats.`);

const bucketCounts = new Map();
const subbucketCounts = new Map();

for (const feat of catalog) {
  const system = feat.system || {};
  const taxonomyBlock = system.taxonomy || {};
  const bucket = system.bucket || taxonomyBlock.bucket;
  const subbucket = system.subbucket || taxonomyBlock.subbucket;

  if (!bucket) errors.push(`${feat.name}: missing primary bucket.`);
  if (!subbucket) errors.push(`${feat.name}: missing primary subbucket.`);
  if (bucket && !validBuckets.has(bucket)) errors.push(`${feat.name}: invalid bucket "${bucket}".`);
  if (bucket && subbucket && !validSubbuckets.get(bucket)?.has(subbucket)) errors.push(`${feat.name}: invalid subbucket "${subbucket}" for bucket "${bucket}".`);
  if (!system.taxonomyConfidence) errors.push(`${feat.name}: missing taxonomyConfidence.`);
  if (typeof system.taxonomyReviewed !== 'boolean') errors.push(`${feat.name}: missing boolean taxonomyReviewed.`);
  if (system.taxonomyConfidence === 'source_review_required' && !system.sourceReviewReason && !taxonomyBlock.sourceReviewReason) {
    errors.push(`${feat.name}: source-review feat is missing sourceReviewReason.`);
  }
  if (bucket === 'GM / Metadata' && !system.sourceReviewReason && !taxonomyBlock.sourceReviewReason) {
    errors.push(`${feat.name}: GM / Metadata feat needs an explicit manual/source-reference reason.`);
  }

  if (bucket) bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
  if (bucket && subbucket) {
    const key = `${bucket} / ${subbucket}`;
    subbucketCounts.set(key, (subbucketCounts.get(key) || 0) + 1);
  }

  const packFeat = packByName.get(feat.name);
  if (!packFeat) errors.push(`${feat.name}: missing from packs/feats.db.`);
  else {
    const ps = packFeat.system || {};
    if (ps.bucket !== bucket || ps.subbucket !== subbucket) {
      errors.push(`${feat.name}: catalog/pack taxonomy mismatch (${bucket} / ${subbucket} vs ${ps.bucket} / ${ps.subbucket}).`);
    }
  }
}

for (const [name, packFeat] of packByName) {
  if (!catalogByName.has(name)) errors.push(`${name}: present in pack but missing from catalog.`);
}

for (const [key, count] of subbucketCounts) {
  if (count < 2) errors.push(`${key}: active subbucket has only ${count} feat; minimum is 2.`);
  else ok.push(`${key}: ${count} feats.`);
}

const notForceNames = ['Forceful Blast', 'Force of Personality', 'Destructive Force', 'Fast Surge', 'Crush'];
for (const name of notForceNames) {
  const feat = catalogByName.get(name);
  if (feat?.system?.bucket === 'Force') errors.push(`${name}: should not be Force bucket from title keyword alone.`);
  else ok.push(`${name}: not classified as Force by keyword alone.`);
}

const reviewNames = new Set(sourceReview.items.map((item) => item.name));
for (const feat of catalog.filter((f) => f.system?.taxonomyConfidence === 'source_review_required')) {
  if (!reviewNames.has(feat.name)) errors.push(`${feat.name}: marked source-review but missing from source review list.`);
}
for (const item of sourceReview.items) {
  if (!catalogByName.has(item.name)) errors.push(`${item.name}: source-review item not found in catalog.`);
  if (!item.description || !item.proposedBucket || !item.proposedSubbucket) errors.push(`${item.name}: source-review item lacks description/proposed bucket/subbucket.`);
}
ok.push(`Source-review list contains ${sourceReview.items.length} feats.`);

const result = { ok: ok.length, warnings: warnings.length, errors: errors.length };
console.log(`Feat taxonomy application audit: ${result.ok} ok, ${result.warnings} warnings, ${result.errors} errors`);
for (const line of warnings) console.warn(`WARN: ${line}`);
for (const line of errors) console.error(`ERROR: ${line}`);

if (errors.length || (failOnWarnings && warnings.length)) process.exit(1);
