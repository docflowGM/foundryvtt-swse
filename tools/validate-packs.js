#!/usr/bin/env node
/**
 * Validate Foundry .db compendium packs (line-delimited JSON).
 *
 * Usage:
 *   node tools/validate-packs.js
 *   node tools/validate-packs.js --fix
 *
 * --fix writes normalized copies to packs/.validated/ without modifying originals.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(ROOT, "packs");
const OUT_DIR = path.join(PACKS_DIR, ".validated");
const FIX = process.argv.includes("--fix");

function listDbFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listDbFiles(p));
    else if (ent.isFile() && p.endsWith(".db")) out.push(p);
  }
  return out;
}

function validateLine(obj, file, lineNo) {
  const errs = [];
  if (!obj || typeof obj !== "object") errs.push("not an object");
  if (!obj?._id) errs.push("missing _id");
  if (!obj?.name) errs.push("missing name");
  if (!obj?.type) errs.push("missing type");
  if (errs.length) {
    return { ok: false, msg: `${file}:${lineNo} -> ${errs.join(", ")}` };
  }
  return { ok: true };
}

function main() {
  if (!fs.existsSync(PACKS_DIR)) {
    console.error(`packs/ directory not found at ${PACKS_DIR}`);
    process.exit(2);
  }
  const dbFiles = listDbFiles(PACKS_DIR);
  if (!dbFiles.length) {
    console.log("No .db files found under packs/");
    return;
  }

  if (FIX) fs.mkdirSync(OUT_DIR, { recursive: true });

  let bad = 0;
  for (const file of dbFiles) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);

    const normalized = [];
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const raw = lines[i];
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        bad++;
        console.warn(`INVALID JSON: ${rel}:${lineNo} -> ${e.message}`);
        continue;
      }

      const v = validateLine(obj, rel, lineNo);
      if (!v.ok) {
        bad++;
        console.warn(`INVALID DOC: ${v.msg}`);
        continue;
      }
      normalized.push(JSON.stringify(obj));
    }

    if (FIX) {
      const outFile = path.join(OUT_DIR, path.basename(file));
      fs.writeFileSync(outFile, normalized.join("\n") + (normalized.length ? "\n" : ""), "utf8");
    }
  }

  if (bad) {
    console.log(`Validation complete: ${bad} problem(s) found.`);
    process.exitCode = 1;
  } else {
    console.log("Validation complete: no problems found.");
  }
}

main();
