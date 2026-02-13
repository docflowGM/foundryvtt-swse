#!/usr/bin/env node
/**
 * Dev tool: generate static Handlebars partial manifest for Foundry VTT.
 *
 * Usage:
 *   node tools/generate-partials-manifest.mjs
 *   node tools/generate-partials-manifest.mjs --check
 *
 * Notes:
 * - This is build-time only. Do NOT run this inside Foundry.
 * - Runtime registration must remain static (no directory crawling).
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const PARTIALS_AUTO_PATH = path.join(REPO_ROOT, "helpers", "handlebars", "partials-auto.js");
const SYSTEM_JSON_PATH = path.join(REPO_ROOT, "system.json");

const MARKER_START = "/* PARTIALS_MANIFEST_START */";
const MARKER_END = "/* PARTIALS_MANIFEST_END */";

function toPosix(p) {
  return p.split(path.sep).join("/");
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walk(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

function extractPartialRefs(hbsText) {
  // {{> "systems/<id>/.../file.hbs"}} or {{> 'systems/<id>/.../file.hbs'}}
  const refs = new Set();
  const re = /\{\{\s*>\s*(?:"([^"]+)"|'([^']+)'|([^\s}]+))/g;
  let m;
  while ((m = re.exec(hbsText)) !== null) {
    const token = m[1] ?? m[2] ?? m[3];
    if (token) refs.add(token);
  }
  return refs;
}

async function buildManifest(systemId) {
  const manifest = new Set();

  const globs = [
    path.join(REPO_ROOT, "templates", "actors", "character", "v2", "partials"),
    path.join(REPO_ROOT, "templates", "actors", "droid", "v2", "partials"),
    path.join(REPO_ROOT, "templates", "actors", "vehicle", "v2", "partials"),
    path.join(REPO_ROOT, "templates", "partials"),
  ];

  for (const dir of globs) {
    if (!(await fileExists(dir))) continue;
    const files = await walk(dir);
    for (const f of files) {
      if (f.endsWith(".hbs")) {
        const rel = toPosix(path.relative(REPO_ROOT, f));
        manifest.add(`systems/${systemId}/${rel}`);
      }
    }
  }

  // Parse {{> ...}} usage and include any full-path partial refs.
  const templatesRoot = path.join(REPO_ROOT, "templates");
  if (await fileExists(templatesRoot)) {
    const files = await walk(templatesRoot);
    for (const f of files) {
      if (!f.endsWith(".hbs")) continue;
      const text = await fs.readFile(f, "utf-8");
      for (const ref of extractPartialRefs(text)) {
        if (ref.startsWith(`systems/${systemId}/`) && ref.endsWith(".hbs")) {
          manifest.add(ref);
        }
      }
    }
  }

  return [...manifest].sort();
}

function renderManifestLines(paths) {
  return paths.map(p => `  "${p}",`).join("\n");
}

function replaceBetweenMarkers(source, newLines) {
  const startIdx = source.indexOf(MARKER_START);
  const endIdx = source.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Could not find manifest markers in ${PARTIALS_AUTO_PATH}`);
  }

  const before = source.slice(0, startIdx + MARKER_START.length);
  const after = source.slice(endIdx);
  return `${before}\n${newLines}\n  ${after}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");

  const systemJson = await readJson(SYSTEM_JSON_PATH);
  const systemId = systemJson.id;
  if (!systemId) throw new Error("system.json missing 'id'");

  const manifest = await buildManifest(systemId);
  const newLines = renderManifestLines(manifest);

  const current = await fs.readFile(PARTIALS_AUTO_PATH, "utf-8");
  const updated = replaceBetweenMarkers(current, newLines);

  if (checkOnly) {
    if (current === updated) {
      console.log("OK: manifest up to date");
      return;
    }
    console.error("Manifest is out of date. Run: node tools/generate-partials-manifest.mjs");
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(PARTIALS_AUTO_PATH, updated, "utf-8");
  console.log(`Updated manifest with ${manifest.length} entries`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
