#!/usr/bin/env node
/**
 * Ensures every full-path Handlebars partial referenced by templates/*.hbs is
 * included in the runtime template preload list used by index.js:
 * scripts/load-templates.js.
 *
 * This catches Foundry runtime failures like:
 *   The partial systems/foundryvtt-swse/templates/... could not be found
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const SYSTEM_PREFIX = "systems/foundryvtt-swse/";
const TEMPLATE_PREFIX = `${SYSTEM_PREFIX}templates/`;
const LOADER_PATH = path.join(REPO_ROOT, "scripts", "load-templates.js");
const TEMPLATES_DIR = path.join(REPO_ROOT, "templates");

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "out", "coverage"]);
const LOADER_TEMPLATE_RE = /['"]systems\/foundryvtt-swse\/(templates\/[^'"]+?\.hbs)['"]/g;
const PARTIAL_RE = /\{\{\s*>\s+(['"])(systems\/foundryvtt-swse\/templates\/[^'"]+?\.hbs)\1/g;

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...await walk(full));
      continue;
    }
    if (entry.isFile()) files.push(full);
  }

  return files;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

async function readPreloadSet() {
  const source = await fs.readFile(LOADER_PATH, "utf8");
  const preload = new Set();
  let match;

  while ((match = LOADER_TEMPLATE_RE.exec(source)) !== null) {
    preload.add(match[1]);
  }

  return preload;
}

async function main() {
  const preload = await readPreloadSet();
  const templateFiles = (await walk(TEMPLATES_DIR)).filter((file) => file.endsWith(".hbs"));
  const issues = [];

  for (const fullFile of templateFiles) {
    const relFile = toPosix(path.relative(REPO_ROOT, fullFile));
    const source = await fs.readFile(fullFile, "utf8");
    let match;

    while ((match = PARTIAL_RE.exec(source)) !== null) {
      const fullPartialPath = match[2];
      const relPartialPath = fullPartialPath.slice(SYSTEM_PREFIX.length);
      const diskPath = path.join(REPO_ROOT, relPartialPath);
      const line = lineNumberAt(source, match.index);

      if (!await exists(diskPath)) {
        issues.push(`${relFile}:${line} references missing partial file ${fullPartialPath}`);
        continue;
      }

      if (!preload.has(relPartialPath)) {
        issues.push(`${relFile}:${line} references ${fullPartialPath}, but scripts/load-templates.js does not preload it`);
      }
    }
  }

  for (const preloadPath of preload) {
    if (!preloadPath.startsWith("templates/") || !preloadPath.endsWith(".hbs")) {
      issues.push(`scripts/load-templates.js contains invalid preload path ${preloadPath}`);
      continue;
    }
    const diskPath = path.join(REPO_ROOT, preloadPath);
    if (!await exists(diskPath)) {
      issues.push(`scripts/load-templates.js preloads missing file ${preloadPath}`);
    }
  }

  if (issues.length) {
    console.error(`SWSE runtime template preload check failed: ${issues.length} issue(s)`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(`SWSE runtime template preload check passed: ${preload.size} preload entries, ${templateFiles.length} template files scanned.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
