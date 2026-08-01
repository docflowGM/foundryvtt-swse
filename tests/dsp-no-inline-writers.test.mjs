import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// External review round 2 — the existing consolidation tests only checked
// a hand-curated list of files, which is exactly how three (verification
// found five) live DSP writers slipped through: they read
// actor.system.darkSide.value directly with a raw fallback and computed
// their own increment/decrement instead of delegating to
// DSPEngine.getValue()/getNextValue(). This test replaces the hand-curated
// list with an exhaustive WALK OF EVERY FILE under scripts/ (no file is
// skipped by name or location), flagging a file only when it BOTH
// (1) contains a raw read-with-fallback or direct arithmetic pattern AND
// (2) contains a literal write target for the canonical field — i.e. it's
// a file that computes its own write value from a raw read, not merely a
// read-only consumer (export/presentation/suggestion code, which naturally
// fails condition 2 and needs no allowlist entry).
//
// IMPORTANT SCOPE NOTE (external review round 3): this is an exhaustive
// FILE walk with TARGETED PATTERN detection, not an exhaustive SEMANTIC
// proof. The two regexes below match a specific, known shape of the bug
// (a `|| 0`/`?? 0`-guarded read or literal `+N`/`-N` arithmetic on
// `darkSide.value`, in the same file as a literal canonical write-key
// string) — they cannot detect an aliased reference (e.g. destructuring
// `system.darkSide` into a local first), a differently-formatted
// arithmetic expression, or a write routed through a helper in another
// file. This guard is a regression net for the exact defect class already
// found twice, meant to be paired with manual source review on any new
// DSP-mutating code — not a substitute for it.

const RAW_READ_PATTERN = /darkSide\??\.value\s*(\|\|\s*0|\?\?\s*0)/;
const RAW_ARITHMETIC_PATTERN = /darkSide\.value\s*[+-]\s*\d/;
const CANONICAL_WRITE_PATTERN = /['"]system\.darkSide\.value['"]/;

// Escape hatch for any genuine future exception — expected to start (and
// stay) empty. dsp-engine.js itself never calls ActorEngine.updateActor/
// .apply (pure evaluation, so condition 2 never fires there) and the
// migration's Number(persistedValue)-based parsing never matches
// condition 1, so neither needs an entry here.
const ALLOWLIST = new Set([]);

const scriptsRoot = fileURLToPath(new URL('../scripts', import.meta.url));

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = await walk(scriptsRoot);
const offenders = [];

for (const file of allFiles) {
  const relPath = path.relative(scriptsRoot, file).split(path.sep).join('/');
  if (ALLOWLIST.has(relPath)) continue;

  const src = await readFile(file, 'utf8');
  const hasRawRead = RAW_READ_PATTERN.test(src) || RAW_ARITHMETIC_PATTERN.test(src);
  const hasCanonicalWrite = CANONICAL_WRITE_PATTERN.test(src);

  if (hasRawRead && hasCanonicalWrite) {
    offenders.push(relPath);
  }
}

assert.deepEqual(
  offenders,
  [],
  `production files computing a canonical DSP write from a raw darkSide.value read (bypassing DSPEngine): ${JSON.stringify(offenders)}`
);

// Explicitly confirm the four files named in external review — plus the
// fifth found during independent verification — no longer trip the guard,
// so a regression that reintroduces the raw pattern in any of them is
// caught by name, not just by the aggregate empty-array assertion above.
const mustNotTrip = [
  'utils/force-points.js',
  'components/force-suite.js',
  'engine/talent/talent-effect-engine.js',
  'talents/DarkSidePowers.js'
];
for (const relPath of mustNotTrip) {
  const src = await readFile(path.join(scriptsRoot, relPath), 'utf8');
  const hasRawRead = RAW_READ_PATTERN.test(src) || RAW_ARITHMETIC_PATTERN.test(src);
  const hasCanonicalWrite = CANONICAL_WRITE_PATTERN.test(src);
  assert.equal(
    hasRawRead && hasCanonicalWrite,
    false,
    `${relPath} must not compute a canonical DSP write from a raw read`
  );
}

console.log('DSP no-inline-writers guard tests passed.');
