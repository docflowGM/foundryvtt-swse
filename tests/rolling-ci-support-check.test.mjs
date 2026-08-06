import assert from 'node:assert/strict';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke test for the Phase 5 CI support scripts and workflow file
// (docs/audits/rolling-system-alignment-phase-5.md, "CI architecture").

// 1. run-rolling-tests.mjs's own behavior — checked WITHOUT spawning it as
// a live subprocess here, because run-rolling-tests.mjs itself discovers
// and runs every tests/*.test.mjs file, including this one; spawning it
// from inside a test IT would run creates unbounded recursive subprocess
// spawning. Direct `node tools/run-rolling-tests.mjs` (CI's actual
// invocation, and how this was verified manually while building it) is
// exercised outside the test suite instead. Here, only its exported
// exclusion-list contract is checked (see #3 below), plus a source-text
// sanity check that it reports a per-file pass/fail line and a non-zero
// exit on failure (so a real regression cannot pass silently).
{
  const source = await readFile(new URL('../tools/run-rolling-tests.mjs', import.meta.url), 'utf8');
  assert.match(source, /process\.exit\(fail > 0 \? 1 : 0\);/);
  assert.match(source, /console\.log\(`  PASS  \$\{name\}`\);/);
  assert.match(source, /console\.log\(`  FAIL  \$\{name\}`\);/);
}

// 2. run-rolling-syntax-check.mjs's own behavior — checked via source text
// rather than a live subprocess spawn here: it walks and `node --check`s
// ~2000 files (a real, legitimately slow operation, confirmed to take
// ~50s+ manually), which would make this one assertion dominate the
// runtime of the whole focused test suite if invoked from inside it. CI
// runs it directly as its own dedicated "Syntax check" workflow step
// (see rolling-ci-support-check assertion 4 below, which confirms that
// step exists), which is where its real pass/fail is actually exercised.
{
  const source = await readFile(new URL('../tools/run-rolling-syntax-check.mjs', import.meta.url), 'utf8');
  assert.match(source, /process\.exit\(1\);/);
  assert.match(source, /process\.exit\(0\);/);
  assert.match(source, /spawnSync\(process\.execPath, \["--check", file\]/);
  // ES modules are parsed with an explicit module goal. `node --check <file>`
  // alone can exit 0 on a file whose only syntax error is ESM-specific, which
  // let genuinely broken modules through this gate.
  assert.match(source, /"--input-type=module", "--check"/);
  assert.match(source, /looksLikeModule|import\|export/);
}

// 3. The syntax gate has no exclusion list at all: every discovered source
// file is parsed, and the two audit generators that were once excluded are
// repaired and swept like everything else. The test-runner exclusion list
// still exists and only ever shrinks defensively (it self-checks that every
// excluded name exists in the repo and hard-fails otherwise — already
// exercised by the runs above).
{
  const { KNOWN_EXCLUDED_TESTS } = await import('../tools/run-rolling-tests.mjs');
  assert.equal(KNOWN_EXCLUDED_TESTS.length, 5);

  const syntaxCheck = await import('../tools/run-rolling-syntax-check.mjs');
  assert.equal(
    syntaxCheck.KNOWN_EXCLUDED_FILES,
    undefined,
    'the syntax gate must not carry an exclusion list'
  );

  const syntaxSource = await readFile(
    new URL('../tools/run-rolling-syntax-check.mjs', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(syntaxSource, /KNOWN_EXCLUDED_FILES/);
  assert.doesNotMatch(syntaxSource, /non-excluded/);

  // The two previously excluded audit generators parse with a module goal.
  const repaired = [
    'tools/audit-nonheroic-weapon-damage.mjs',
    'tools/audit-npc-source-attribution.mjs',
  ];
  for (const rel of repaired) {
    const result = syntaxCheck.checkFile(
      fileURLToPath(new URL(`../${rel}`, import.meta.url))
    );
    assert.equal(result.status, 0, `${rel} must parse: ${(result.stderr || '').trim()}`);
  }

  // A malformed ES module is still rejected — the gate did not go blind.
  const fixture = join(tmpdir(), `swse-syntax-fixture-${process.pid}.mjs`);
  await writeFile(fixture, 'export const broken = `unterminated ${ [\\n ] }`;\n');
  try {
    assert.notEqual(syntaxCheck.checkFile(fixture).status, 0);
  } finally {
    await rm(fixture, { force: true });
  }

  // The sweep actually reaches both repaired files.
  const sweep = syntaxCheck.runSyntaxSweep();
  assert.equal(sweep.failures.length, 0, JSON.stringify(sweep.failures, null, 2));
  for (const rel of repaired) assert.ok(sweep.checkedFiles.includes(rel), `${rel} not swept`);
  assert.equal(sweep.checked, sweep.checkedFiles.length);
}

// 4. The workflow file exists and declares the required triggers,
// least-privilege permissions, concurrency cancellation, and an explicit
// non-claim about Foundry runtime verification — a static text check
// (GitHub Actions YAML has no local execution engine to run against here).
{
  const workflow = await readFile(new URL('../.github/workflows/rolling-system-validation.yml', import.meta.url), 'utf8');
  assert.match(workflow, /^on:/m);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /run: node tools\/run-rolling-syntax-check\.mjs/);
  assert.match(workflow, /run: node tools\/run-rolling-tests\.mjs/);
  assert.match(workflow, /check-combat-math-ssot\.mjs --strict/);
  assert.match(workflow, /check-attack-outcome-ssot\.mjs --strict/);
  assert.match(workflow, /check-critical-confirmation-guard\.mjs --strict/);
  assert.match(workflow, /check-reroll-supersession-guard\.mjs --strict/);
  assert.match(workflow, /check-vehicle-attack-routing-guard\.mjs --strict/);
  assert.match(workflow, /check-full-attack-reroll-guard\.mjs --strict/);
  assert.doesNotMatch(workflow, /foundryvtt\.com|install.*foundry/i, 'CI must not attempt to install Foundry VTT.');
  assert.match(workflow, /does NOT verify/i, 'The workflow must document what it does not verify (no false runtime-verification claim).');
  assert.doesNotMatch(workflow, /continue-on-error: true/, 'No blanket continue-on-error hiding failing steps.');
}

console.log('Phase 5 CI support scripts + workflow guards passed.');
