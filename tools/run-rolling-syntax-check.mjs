#!/usr/bin/env node

/**
 * run-rolling-syntax-check.mjs — repo-wide `node --check` sweep for CI
 * (Phase 5 rolling-system alignment).
 *
 * Same walk logic as the project's existing tools/ci-smoke-check.mjs
 * (scripts/, tools/, tests/, skipping .bak-style suffixes), but parsing every
 * file with an unambiguous module goal (see checkFile). There is no exclusion
 * list: every discovered source file is checked, and any parse failure fails
 * the run. This script does not replace ci-smoke-check.mjs.
 */

import { readdirSync, statSync } from "node:fs";
import { join, extname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ROOTS = ["scripts", "tools", "tests"];
const ALLOWED_EXT = new Set([".js", ".mjs"]);
const SKIP_SUFFIXES = [".bak", ".phase1bak", ".phase2bak", ".phase2v2bak", ".phase3bak", ".phase4bak", ".phase5bak", ".phase8bak", ".phase11bak", ".pre_phase_b", ".pre_phase_f", ".pre_phase_h2"];

function shouldSkip(path) {
  return SKIP_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { yield* walk(full); continue; }
    if (!ALLOWED_EXT.has(extname(full))) continue;
    if (shouldSkip(full)) continue;
    yield full;
  }
}

/**
 * Parse one file and report whether it is syntactically valid.
 *
 * `node --check <file>` alone is not a reliable gate for this repo: for a .js
 * file that Node has to guess the module goal for, a file containing an ESM-only
 * syntax error can still exit 0. Every file under scripts/ here is an ES module,
 * so anything using ESM syntax is re-checked explicitly with
 * `--input-type=module` over stdin, which parses with a single, unambiguous goal.
 *
 * @param {string} file - Absolute path.
 * @returns {{status: number, stderr: string}}
 */
export function checkFile(file) {
  let source = null;
  try {
    source = readFileSync(file, "utf8");
  } catch (_err) {
    source = null;
  }

  if (source !== null && /^\s*(?:import|export)[\s{]/m.test(source)) {
    return spawnSync(process.execPath, ["--input-type=module", "--check"], {
      encoding: "utf8",
      input: source,
    });
  }

  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}

/**
 * Sweep every discovered source file under ROOTS.
 *
 * @returns {{checked: number, checkedFiles: string[], failures: Array<{file: string, stderr: string}>}}
 */
export function runSyntaxSweep() {
  const failures = [];
  const checkedFiles = [];

  for (const root of ROOTS) {
    try {
      for (const file of walk(join(ROOT, root))) {
        const rel = relative(ROOT, file).replaceAll("\\", "/");
        checkedFiles.push(rel);
        const result = checkFile(file);
        if (result.status !== 0) {
          failures.push({ file: rel, stderr: (result.stderr || "").trim() });
        }
      }
    } catch (_err) {
      // Missing root is acceptable in partial environments.
    }
  }

  return { checked: checkedFiles.length, checkedFiles, failures };
}

function main() {
  console.log("=".repeat(72));
  console.log("  ROLLING-SYSTEM SYNTAX CHECK (node --check)");
  console.log("=".repeat(72));
  console.log("");

  const { checked, failures } = runSyntaxSweep();

  console.log(`Checked ${checked} file(s).\n`);

  if (failures.length) {
    console.error(`FAILURES (${failures.length}):`);
    for (const failure of failures) {
      console.error(`\n[${failure.file}]\n${failure.stderr}`);
    }
    console.log("\n" + "=".repeat(72));
    process.exit(1);
  }

  console.log(`All ${checked} discovered source file(s) pass node --check.`);
  console.log("=".repeat(72));
  process.exit(0);
}

// Only run when executed directly — see run-rolling-tests.mjs's identical
// guard comment for why importing this module must not trigger a full run.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
