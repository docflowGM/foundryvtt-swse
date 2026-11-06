#!/usr/bin/env node
/**
 * audit-droid-actor-classification-sites.mjs -- READ-ONLY census (U-0).
 *
 * Counts every place in scripts/ that decides "is this actor a droid?" and
 * groups it by IDIOM and by AREA, so the Droid convergence work (U-1) has a
 * measurable before/after instead of a prose claim. It changes nothing and is
 * report-only: it never fails the build. `--json` prints machine-readable
 * output; `--list=<idiom>` prints the file:line sites for one idiom.
 *
 * Idioms (a line is assigned to exactly one, in this order):
 *   EXTENDED_HEURISTIC  type test PLUS a name/species/draft-presence inference
 *                       (/droid/ regex, droidSystems presence, pending draft)
 *   TYPE_OR_FLAG        actor.type === 'droid' OR system.isDroid / droid flags
 *   TYPE_ONLY           actor.type === 'droid' / !== 'droid' with no flag
 *   FLAG_ONLY           system.isDroid / flag test with no type test
 *
 * Areas: RULES (engine, actors, governance, domain, data, items, utils) are
 * where classification changes mechanics; UI (sheets, apps, ui, holonet) is
 * presentation and routing; OTHER is everything else. Vehicle-domain files are
 * excluded (vehicles have their own authority).
 *
 * Heuristic by design: a regex census is evidence of WHERE to look, not a
 * proof of behavior. Each RULES / TYPE_ONLY site must still be read before it
 * is changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'scripts');

const TYPE_TEST = /[Tt]ype\s*(?:===|!==|==|!=)\s*['"]droid['"]/;
const FLAG_TEST = /\bisDroid\b|\bdroidState\b|foundryvtt-swse'\]?\??\.isDroid|speciesActsAsDroid/;
const EXTENDED = /\/droid\/\.test|\/droid\/i?\.test|\.test\(species\)|looksDroid|\bdroidSystems\b.*\|\||\|\|.*\bdroidSystems\b/;

const AREA_RULES = ['engine', 'actors', 'governance', 'domain', 'data', 'items', 'utils', 'core'];
const AREA_UI = ['sheets', 'apps', 'ui', 'holonet', 'patches', 'dev', 'debug'];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

function areaOf(rel) {
  const top = rel.split(path.sep)[1];
  if (AREA_RULES.includes(top)) return 'RULES';
  if (AREA_UI.includes(top)) return 'UI';
  return 'OTHER';
}

function idiomOf(line) {
  const type = TYPE_TEST.test(line);
  const flag = FLAG_TEST.test(line);
  if (EXTENDED.test(line) && (type || flag)) return 'EXTENDED_HEURISTIC';
  if (type && flag) return 'TYPE_OR_FLAG';
  if (type) return 'TYPE_ONLY';
  if (flag) return 'FLAG_ONLY';
  return null;
}

export function censusDroidClassificationSites() {
  const sites = [];
  for (const file of walk(SCRIPTS).sort()) {
    const rel = path.relative(ROOT, file);
    if (/vehicle/i.test(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, index) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      const idiom = idiomOf(text);
      if (idiom) sites.push({ file: rel, line: index + 1, area: areaOf(rel), idiom });
    });
  }
  return sites;
}

export function summarize(sites) {
  const table = {};
  for (const s of sites) {
    table[s.area] ??= {};
    table[s.area][s.idiom] = (table[s.area][s.idiom] ?? 0) + 1;
  }
  return table;
}

function main() {
  const sites = censusDroidClassificationSites();
  const table = summarize(sites);
  const listArg = process.argv.find(a => a.startsWith('--list='));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ total: sites.length, table, sites }, null, 2));
    return;
  }
  if (listArg) {
    const [, spec] = listArg.split('=');
    const [area, idiom] = spec.split(':');
    for (const s of sites.filter(x => (!area || x.area === area) && (!idiom || x.idiom === idiom))) console.log(`${s.file}:${s.line}  ${s.area} ${s.idiom}`);
    return;
  }
  console.log('DROID ACTOR-CLASSIFICATION SITE CENSUS (read-only, heuristic)');
  console.log(`total sites: ${sites.length}`);
  for (const area of ['RULES', 'UI', 'OTHER']) {
    const row = table[area] ?? {};
    console.log(`  ${area.padEnd(6)} ${['TYPE_ONLY', 'TYPE_OR_FLAG', 'FLAG_ONLY', 'EXTENDED_HEURISTIC'].map(k => `${k}=${row[k] ?? 0}`).join('  ')}`);
  }
  console.log('Use --json for detail or --list=RULES:TYPE_ONLY for the file:line sites.');
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) main();
