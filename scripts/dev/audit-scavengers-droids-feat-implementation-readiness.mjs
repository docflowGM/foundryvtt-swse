#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const backlogPath = path.join(ROOT, "data/feat-implementation/scavengers-droids-feat-implementation-backlog.json");
const reviewPath = path.join(ROOT, "data/feat-implementation/scavengers-droids-feat-implementation-review-list.json");
const strict = process.argv.includes("--strict");
const EXPECTED_TOTAL = 17;
const ALLOWED_STATUSES = new Set(["implemented_correct", "implemented_partial", "not_implemented", "metadata_correct", "source_review_required"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const errors = [];
const warnings = [];
const ok = [];

if (!fs.existsSync(backlogPath)) errors.push(`Missing backlog: ${backlogPath}`);
if (!fs.existsSync(reviewPath)) errors.push(`Missing review list: ${reviewPath}`);

const backlog = fs.existsSync(backlogPath) ? readJson(backlogPath) : { entries: [] };
const review = fs.existsSync(reviewPath) ? readJson(reviewPath) : { entries: [] };

if (!Array.isArray(backlog.entries)) errors.push("Backlog entries must be an array.");
if (!Array.isArray(review.entries)) errors.push("Review-list entries must be an array.");
if ((backlog.entries || []).length !== EXPECTED_TOTAL) errors.push(`Expected ${EXPECTED_TOTAL} SGtD feats; found ${(backlog.entries || []).length}.`);

const names = new Set();
for (const entry of backlog.entries || []) {
  if (!entry.name) errors.push("Backlog entry missing name.");
  if (names.has(entry.name)) errors.push(`Duplicate backlog entry: ${entry.name}`);
  names.add(entry.name);
  if (!entry.description) errors.push(`${entry.name} missing description.`);
  if (!entry.taxonomy?.bucket || !entry.taxonomy?.subbucket) errors.push(`${entry.name} missing proposed bucket/subbucket.`);
  if (!entry.expected?.mode || !entry.expected?.home) errors.push(`${entry.name} missing expected mode/home.`);
  const status = entry.accuracy?.status;
  if (!ALLOWED_STATUSES.has(status)) errors.push(`${entry.name} has invalid accuracy status: ${status}`);
  if (status === "implemented_correct" && /partial|not proven|metadata only/i.test(entry.accuracy?.rationale || "")) {
    errors.push(`${entry.name} is marked implemented_correct but rationale sounds uncertain.`);
  }
  if (entry.expected?.shouldBeStaticFlatBonus === true) errors.push(`${entry.name} incorrectly claims a static flat-bonus implementation.`);
  ok.push(`${entry.name}: ${status}`);
}

for (const item of review.entries || []) {
  if (!item.name || !item.description || !item.proposedBucket || !item.proposedSubbucket || !item.proposedImplementationMode) {
    errors.push(`Review-list entry is incomplete: ${JSON.stringify(item)}`);
  }
}

const counts = (backlog.entries || []).reduce((acc, entry) => {
  const status = entry.accuracy?.status || "unknown";
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});

console.log(`Scavenger's Guide to Droids feat implementation audit: ${(backlog.entries || []).length} feats.`);
console.log(JSON.stringify({ counts, reviewQueue: (review.entries || []).length, ok: ok.length, warnings: warnings.length, errors: errors.length }, null, 2));
if (warnings.length) console.warn(warnings.map(w => `WARN: ${w}`).join("\n"));
if (errors.length) console.error(errors.map(e => `ERROR: ${e}`).join("\n"));
if (strict && errors.length) process.exit(1);
