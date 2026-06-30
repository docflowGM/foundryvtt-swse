#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const backlogPath = path.join(ROOT, "data/feat-implementation/force-unleashed-feat-implementation-backlog.json");
const reviewPath = path.join(ROOT, "data/feat-implementation/force-unleashed-feat-implementation-review-list.json");
const phase10aOverridesPath = path.join(ROOT, "data/feat-implementation/phase10a-runtime-status-overrides.json");
const strict = process.argv.includes("--strict");
const EXPECTED_TOTAL = 31;
const ALLOWED_STATUSES = new Set(["implemented_correct", "implemented_partial", "implemented_incorrect", "not_implemented", "metadata_correct", "source_review_required"]);
const errors = [];
const warnings = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function loadPhase10aOverrides(sourcebook) {
  if (!fs.existsSync(phase10aOverridesPath)) return new Map();
  const payload = readJson(phase10aOverridesPath);
  const overrides = Array.isArray(payload.overrides) ? payload.overrides : [];
  const byName = new Map();
  for (const override of overrides) {
    if (normalizeKey(override.sourcebook) !== normalizeKey(sourcebook)) continue;
    if (!override.name) {
      warnings.push("Phase 10A override missing name; skipped.");
      continue;
    }
    byName.set(override.name, override);
  }
  return byName;
}

function applyPhase10aOverride(entry, override) {
  if (!override) return entry;
  return {
    ...entry,
    expected: {
      ...(entry.expected ?? {}),
      mode: override.implementationMode ?? entry.expected?.mode,
      home: Array.isArray(override.runtimeHome) ? override.runtimeHome.join("; ") : entry.expected?.home
    },
    observed: {
      ...(entry.observed ?? {}),
      phase10aRuntimeHome: Array.isArray(override.runtimeHome) ? override.runtimeHome : [],
      phase10aObservedImplementation: override.observedImplementation ?? null
    },
    accuracy: {
      ...(entry.accuracy ?? {}),
      status: override.status ?? entry.accuracy?.status,
      confidence: override.confidence ?? entry.accuracy?.confidence,
      rationale: override.reason ?? entry.accuracy?.rationale,
      correctiveAction: override.accuracyFinding ?? entry.accuracy?.correctiveAction
    },
    phase10aOverride: {
      phase: "phase-10a-runtime-status-overrides",
      reason: override.reason ?? "",
      runtimeHome: Array.isArray(override.runtimeHome) ? override.runtimeHome : []
    }
  };
}

if (!fs.existsSync(backlogPath)) errors.push(`Missing backlog: ${backlogPath}`);
if (!fs.existsSync(reviewPath)) errors.push(`Missing review list: ${reviewPath}`);

const rawBacklog = fs.existsSync(backlogPath) ? readJson(backlogPath) : { entries: [] };
const review = fs.existsSync(reviewPath) ? readJson(reviewPath) : { entries: [] };
const overrides = loadPhase10aOverrides("The Force Unleashed Campaign Guide");
const backlog = {
  ...rawBacklog,
  entries: (rawBacklog.entries || []).map(entry => applyPhase10aOverride(entry, overrides.get(entry.name)))
};
const appliedOverrides = (backlog.entries || []).filter(entry => entry.phase10aOverride).map(entry => entry.name);

if (!Array.isArray(backlog.entries)) errors.push("Backlog entries must be an array.");
if (!Array.isArray(review.entries)) errors.push("Review-list entries must be an array.");
if ((backlog.entries || []).length !== EXPECTED_TOTAL) errors.push(`Expected ${EXPECTED_TOTAL} TFUCG feats; found ${(backlog.entries || []).length}.`);

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
  if (status === "implemented_correct" && /not proven|partial|incorrect|metadata only|missing/i.test(entry.accuracy?.rationale || "")) {
    errors.push(`${entry.name} is marked implemented_correct but rationale sounds uncertain.`);
  }
  if (entry.expected?.mustNotBeFlatStaticBonus !== true) errors.push(`${entry.name} missing mustNotBeFlatStaticBonus guard.`);
  if (entry.name === "Advantageous Attack" && status !== "implemented_incorrect") {
    errors.push("Advantageous Attack must remain implemented_incorrect until the wrong attack-bonus metadata is corrected to a damage rider.");
  }
  if (/^Forceful (Grip|Saber Throw|Slam|Stun|Throw|Weapon)$/.test(entry.name) && !/scoped_force_power_activation_bonus/.test(entry.expected.mode)) {
    errors.push(`${entry.name} must be scoped_force_power_activation_bonus.`);
  }
}

const backlogNames = new Set((backlog.entries || []).map(e => e.name));
for (const item of review.entries || []) {
  if (!item.name || !item.description || !item.proposedBucket || !item.proposedSubbucket || !item.proposedImplementationMode || !item.whyUnsureOrNeedsReview) {
    errors.push(`Review-list entry is incomplete: ${JSON.stringify(item)}`);
  }
  if (!backlogNames.has(item.name)) errors.push(`Review-list entry not found in backlog: ${item.name}`);
}

const counts = (backlog.entries || []).reduce((acc, entry) => {
  const status = entry.accuracy?.status || "unknown";
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});

console.log(`Force Unleashed feat implementation audit: ${(backlog.entries || []).length} feats.`);
console.log(JSON.stringify({ counts, reviewQueue: (review.entries || []).length, phase10aOverridesApplied: appliedOverrides, warnings: warnings.length, errors: errors.length }, null, 2));
if (warnings.length) console.warn(warnings.map(w => `WARN: ${w}`).join("\n"));
if (errors.length) console.error(errors.map(e => `ERROR: ${e}`).join("\n"));
if (strict && errors.length) process.exit(1);
