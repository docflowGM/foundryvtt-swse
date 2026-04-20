#!/usr/bin/env node
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const ROOTS = ["scripts", "tools", "tests"];
const ALLOWED_EXT = new Set([".js", ".mjs"]);
const SKIP_SUFFIXES = [".bak", ".phase1bak", ".phase2bak", ".phase2v2bak", ".phase3bak", ".phase4bak", ".phase5bak", ".phase8bak", ".phase11bak", ".pre_phase_b", ".pre_phase_f", ".pre_phase_h2"];
const failures = [];

function shouldSkip(path) {
  return SKIP_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
      continue;
    }
    if (!ALLOWED_EXT.has(extname(full))) continue;
    if (shouldSkip(full)) continue;
    yield full;
  }
}

for (const root of ROOTS) {
  try {
    for (const file of walk(root)) {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      if (result.status !== 0) {
        failures.push({ file, stderr: (result.stderr || "").trim() });
      }
    }
  } catch (_err) {
    // Missing root is acceptable in partial environments.
  }
}

if (failures.length) {
  console.error(`CI smoke check found ${failures.length} syntax issue(s):`);
  for (const failure of failures) {
    console.error(`\n[${failure.file}]\n${failure.stderr}`);
  }
  process.exit(1);
}

console.log("CI smoke check passed.");
