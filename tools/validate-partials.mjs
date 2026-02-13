#!/usr/bin/env node
/**
 * SWSE CI Partial Discipline Validator
 *
 * Goal:
 * Fail CI if any Handlebars partial include uses a non-full-path key.
 *
 * We enforce:
 *   {{> "systems/foundryvtt-swse/templates/.../*.hbs" }}
 *
 * Allowed:
 *   - Inline partials defined in the same file (e.g. {{#*inline "foo"}})
 *   - Inline partial invocations (e.g. {{> foo}}) ONLY when defined in the same file
 *   - Explicit full-path partial includes ending in .hbs
 *
 * Disallowed:
 *   - {{> swse/assets-panel }}
 *   - {{> identity-strip }}
 *   - {{> "vehicle-image" }}
 *   - {{> partials/foo }}
 *   - Any include that is not a literal full-path string starting with:
 *       systems/foundryvtt-swse/templates/
 *
 * Optional strict mode (--strict):
 *   - Ensures every referenced full-path partial exists on disk
 *   - Ensures every referenced full-path partial appears in PARTIAL_PATHS
 *   - Ensures every PARTIAL_PATHS entry exists on disk
 *   - Bans dynamic/argument partial invocations (helpers, vars, hash args)
 *   - Enforces full-path includes end with ".hbs"
 *
 * Optional fix mode (--fix):
 *   - Best-effort rewrite of simple legacy short-name includes to a unique manifest match
 *   - Never runs in CI (CI should run check-only)
 *
 * Optional report mode (--report [path]):
 *   - Outputs JSON describing all {{> ...}} usage and classifications
 *   - Does not change the pass/fail behavior unless combined with --strict/--fix
 *
 * Node 18+.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const SYSTEM_ID = "foundryvtt-swse";
const VALID_PREFIX = `systems/${SYSTEM_ID}/templates/`;
const PARTIALS_AUTO_PATH = path.join(REPO_ROOT, "helpers", "handlebars", "partials-auto.js");

// Matches {{> ...}} capturing the body between ">" and "}}".
const PARTIAL_BLOCK_RE = /\{\{\s*>\s*([^}]+?)\s*\}\}/g;

// Matches inline partial definitions: {{#*inline "name"}}
const INLINE_DEF_RE = /\{\{\s*#\*inline\s+(?:"([^"]+)"|'([^']+)'|([^\s}]+))\s*\}\}/g;

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".idea",
  ".vscode",
]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      out.push(...(await walk(full)));
      continue;
    }
    out.push(full);
  }
  return out;
}

function buildLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function lineNumberAt(lineStarts, index) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = lineStarts[mid];
    const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.POSITIVE_INFINITY;
    if (index < start) hi = mid - 1;
    else if (index >= next) lo = mid + 1;
    else return mid + 1;
  }
  return 1;
}

function extractInlineNames(text) {
  const names = new Set();
  let m;
  while ((m = INLINE_DEF_RE.exec(text)) !== null) {
    const name = m[1] ?? m[2] ?? m[3];
    if (name) names.add(name);
  }
  return names;
}

function extractPartialBlocks(text) {
  const blocks = [];
  let m;
  while ((m = PARTIAL_BLOCK_RE.exec(text)) !== null) {
    const body = (m[1] ?? "").trim();
    if (!body) continue;
    blocks.push({ body, index: m.index });
  }
  return blocks;
}

function isValidFullPathLiteral(token) {
  return token.startsWith(VALID_PREFIX) && token.endsWith(".hbs");
}

function parseIncludeBody(body) {
  // Returns { kind, token, reason }.
  // kind: "full" | "invalid" | "dynamic"
  const trimmed = body.trim();

  // Ban helpers/expressions/args inside partial invocation.
  if (trimmed.includes("(") || trimmed.includes(")")) {
    return { kind: "dynamic", token: trimmed, reason: "dynamic expression in partial include" };
  }
  if (/[=]/.test(trimmed)) {
    return { kind: "dynamic", token: trimmed, reason: "hash/args in partial include" };
  }

  // Literal string include only.
  const m = trimmed.match(/^"([^"]+)"$/) || trimmed.match(/^'([^']+)'$/);
  if (m) {
    const token = m[1];
    if (!token.startsWith(VALID_PREFIX)) {
      return { kind: "invalid", token, reason: "non-full-path literal include" };
    }
    if (!token.endsWith(".hbs")) {
      return { kind: "invalid", token, reason: "full-path include must end with .hbs" };
    }
    return { kind: "full", token, reason: null };
  }

  // Unquoted token.
  if (/\s/.test(trimmed)) {
    return { kind: "dynamic", token: trimmed, reason: "non-literal include (contains whitespace)" };
  }
  return { kind: "invalid", token: trimmed, reason: "non-literal include (unquoted)" };
}

function stripSystemPrefix(fullPath) {
  const prefix = `systems/${SYSTEM_ID}/`;
  if (!fullPath.startsWith(prefix)) return null;
  return fullPath.slice(prefix.length);
}

async function readManifestSet() {
  if (!(await exists(PARTIALS_AUTO_PATH))) return null;

  const src = await fs.readFile(PARTIALS_AUTO_PATH, "utf-8");
  const strings = new Set();

  const prefixEsc = VALID_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`"(${prefixEsc}[^"]+?\\.hbs)"`, "g");
  let m;
  while ((m = re.exec(src)) !== null) {
    strings.add(m[1]);
  }
  return strings;
}

function buildFixIndex(manifestSet) {
  const index = new Map(); // legacyKey(lower) -> Set(fullPaths)

  function add(key, fullPath) {
    const k = key.toLowerCase();
    const set = index.get(k) ?? new Set();
    set.add(fullPath);
    index.set(k, set);
  }

  for (const fullPath of manifestSet) {
    const base = fullPath.split("/").pop() ?? "";
    const baseNoExt = base.endsWith(".hbs") ? base.slice(0, -4) : base;

    add(base, fullPath);
    add(baseNoExt, fullPath);
    add(`partials/${baseNoExt}`, fullPath);
    add(`swse/${baseNoExt}`, fullPath);
  }

  return index;
}

function parseReportArg(argv) {
  const idx = argv.indexOf("--report");
  if (idx === -1) return null;
  const next = argv[idx + 1];
  if (!next || next.startsWith("--")) return "stdout";
  return next;
}

async function validateAndMaybeFixFile(filePath, { strict, fix, manifestSet, fixIndex, reportEntries }) {
  const original = await fs.readFile(filePath, "utf-8");
  let text = original;

  const lineStarts = buildLineStarts(text);
  const inlineNames = extractInlineNames(text);
  const blocks = extractPartialBlocks(text);

  const violations = [];
  const referencedFullPaths = new Set();

  function addReport(kind, token, reason, blk) {
    if (!reportEntries) return;
    reportEntries.push({
      file: toPosix(path.relative(REPO_ROOT, filePath)),
      line: lineNumberAt(lineStarts, blk.index),
      kind,
      token,
      reason: reason ?? null,
    });
  }

  for (const blk of blocks) {
    const parsed = parseIncludeBody(blk.body);

    // Inline invocation allowed only if defined inline in the same file.
    if (parsed.kind === "invalid" && inlineNames.has(parsed.token)) {
      addReport("inline", parsed.token, null, blk);
      continue;
    }

    if (parsed.kind !== "full") {
      addReport(parsed.kind, parsed.token, parsed.reason, blk);
      violations.push({
        filePath,
        line: lineNumberAt(lineStarts, blk.index),
        token: parsed.token,
        reason: strict ? parsed.reason : undefined,
      });
      continue;
    }

    addReport("full", parsed.token, null, blk);
    referencedFullPaths.add(parsed.token);

    if (!strict) continue;

    const rel = stripSystemPrefix(parsed.token);
    if (rel) {
      const diskPath = path.join(REPO_ROOT, rel);
      if (!(await exists(diskPath))) {
        violations.push({
          filePath,
          line: lineNumberAt(lineStarts, blk.index),
          token: parsed.token,
          reason: "Missing file on disk",
        });
      }
    }

    if (manifestSet && !manifestSet.has(parsed.token)) {
      violations.push({
        filePath,
        line: lineNumberAt(lineStarts, blk.index),
        token: parsed.token,
        reason: "Not present in PARTIAL_PATHS",
      });
    }
  }

  if (!fix) {
    return { violations, changed: false, referencedFullPaths };
  }

  // --fix: rewrite only invalid legacy includes that map uniquely to a manifest entry.
  let changed = false;
  text = text.replace(PARTIAL_BLOCK_RE, (fullMatch, body) => {
    const parsed = parseIncludeBody(body);

    if (parsed.kind === "full") return fullMatch;
    if (parsed.kind === "dynamic") return fullMatch;

    if (inlineNames.has(parsed.token)) return fullMatch;

    const candidates = fixIndex?.get(parsed.token.toLowerCase());
    if (!candidates || candidates.size !== 1) return fullMatch;

    const [target] = [...candidates];
    if (!isValidFullPathLiteral(target)) return fullMatch;

    changed = true;
    return `{{> "${target}"}}`;
  });

  if (changed) {
    await fs.writeFile(filePath, text, "utf-8");
    // Re-run (no fix) for accurate results (also feeds reportEntries for new content on next run).
    return await validateAndMaybeFixFile(filePath, { strict, fix: false, manifestSet, fixIndex, reportEntries });
  }

  return { violations, changed: false, referencedFullPaths };
}

async function writeReport(reportPath, payload) {
  const json = JSON.stringify(payload, null, 2);
  if (reportPath === "stdout") {
    process.stdout.write(`${json}\n`);
    return;
  }
  await fs.writeFile(path.join(REPO_ROOT, reportPath), json, "utf-8");
}

async function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);

  const strict = args.has("--strict");
  const fix = args.has("--fix");
  const reportPath = parseReportArg(argv);

  const allFiles = await walk(REPO_ROOT);
  const hbsFiles = allFiles.filter((p) => p.endsWith(".hbs"));

  const manifestSet = strict || fix ? await readManifestSet() : null;
  if ((strict || fix) && !manifestSet) {
    console.error("SWSE | Could not read helpers/handlebars/partials-auto.js (required for --strict/--fix)");
    process.exit(1);
  }

  const fixIndex = fix && manifestSet ? buildFixIndex(manifestSet) : null;

  const allViolations = [];
  const referencedFullPaths = new Set();
  let changedFiles = 0;

  const reportEntries = reportPath ? [] : null;

  for (const f of hbsFiles) {
    const res = await validateAndMaybeFixFile(f, { strict, fix, manifestSet, fixIndex, reportEntries });
    allViolations.push(...res.violations);
    for (const p of res.referencedFullPaths) referencedFullPaths.add(p);
    if (res.changed) changedFiles += 1;
  }

  // Strict: validate manifest entries exist on disk and are well-formed full paths.
  if (strict && manifestSet) {
    for (const fullPath of manifestSet) {
      if (!isValidFullPathLiteral(fullPath)) {
        allViolations.push({
          filePath: PARTIALS_AUTO_PATH,
          line: 0,
          token: fullPath,
          reason: "Manifest entry must be a full-path ending with .hbs",
        });
        continue;
      }

      const rel = stripSystemPrefix(fullPath);
      if (!rel) continue;

      const diskPath = path.join(REPO_ROOT, rel);
      if (!(await exists(diskPath))) {
        allViolations.push({
          filePath: PARTIALS_AUTO_PATH,
          line: 0,
          token: fullPath,
          reason: "Manifest entry missing on disk",
        });
      }
    }
  }

  if (reportPath) {
    const counts = reportEntries.reduce(
      (acc, e) => {
        acc.total += 1;
        acc[e.kind] = (acc[e.kind] ?? 0) + 1;
        return acc;
      },
      { total: 0 }
    );

    const perFileMap = new Map();
    for (const e of reportEntries) {
      const rec =
        perFileMap.get(e.file) ??
        { file: e.file, total: 0, counts: { total: 0 }, uniqueTokens: new Set() };

      rec.total += 1;
      rec.counts.total += 1;
      rec.counts[e.kind] = (rec.counts[e.kind] ?? 0) + 1;
      if (e.token) rec.uniqueTokens.add(e.token);

      perFileMap.set(e.file, rec);
    }

    const perFile = [...perFileMap.values()]
      .map((r) => ({
        file: r.file,
        total: r.total,
        counts: r.counts,
        uniqueTokens: [...r.uniqueTokens].sort(),
      }))
      .sort((a, b) => a.file.localeCompare(b.file));

    await writeReport(reportPath, {
      systemId: SYSTEM_ID,
      generatedAt: new Date().toISOString(),
      strict,
      fix,
      scannedHbsFiles: hbsFiles.length,
      referencedFileBackedPartials: referencedFullPaths.size,
      counts,
      perFile,
      entries: reportEntries,
    });
  }
  }

  if (allViolations.length > 0) {
    console.error(`SWSE | Partial validation failed: ${allViolations.length} issue(s)`);
    for (const v of allViolations) {
      const rel = toPosix(path.relative(REPO_ROOT, v.filePath));
      const line = v.line && v.line > 0 ? v.line : "?";
      const reason = v.reason ? ` (${v.reason})` : "";
      console.error(`- ${rel}:${line} -> ${v.token}${reason}`);
    }
    process.exit(1);
  }

  const mode = strict ? "strict" : "discipline";
  const fixNote = fix ? `; --fix wrote ${changedFiles} file(s)` : "";
  console.log(
    `SWSE | OK (${mode}): ${hbsFiles.length} .hbs files scanned; ${referencedFullPaths.size} file-backed partial(s) referenced${fixNote}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("SWSE | Validator failed:", err);
  process.exit(1);
});
