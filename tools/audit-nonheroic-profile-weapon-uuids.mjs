#!/usr/bin/env node
/**
 * Mechanical UUID/base-metadata audit for nonheroic weapon damage profile
 * records (data/nonheroic/nonheroic-weapon-damage-profiles.*.json).
 *
 * This script matches weapon.printedName against the weapon compendium
 * packs (packs/weapons*.db) and reports (or, with --write, applies) safe
 * identity metadata: weapon.uuid/baseSlug/basePack/baseFormula/baseType.
 *
 * It is a pure identity-matching tool. It does not read sourcebooks, does
 * not change formula.printed, does not hydrate attack bonuses, and does
 * not touch confidence. See docs/audits/generated/
 * nonheroic-profile-weapon-uuid-audit.md for the written report and
 * docs/nonheroic-weapon-uuid-metadata.md for the policy note.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

const OUTPUT_JSON = 'docs/audits/generated/nonheroic-profile-weapon-uuid-audit.json';
const OUTPUT_MD = 'docs/audits/generated/nonheroic-profile-weapon-uuid-audit.md';

const PROFILE_GLOB_PREFIX = 'nonheroic-weapon-damage-profiles.';
const PROFILE_DIR = 'data/nonheroic';
const PACK_DIR = 'packs';

const CUSTOM_ROW_KINDS = new Set(['natural', 'unarmed', 'special']);
const CUSTOM_CATEGORIES = new Set(['natural', 'unarmed']);
const CUSTOM_TAGS = new Set(['natural-weapon', 'unarmed', 'special']);

/**
 * A row is treated as intentionally-custom (never auto-matched to a
 * compendium UUID) if any signal on the record says so, not just
 * weapon.rowKind -- some rows have rowKind "melee" but delivery/category/
 * tags of natural or unarmed (e.g. an "Unarmed" row filed under rowKind
 * "melee" with delivery "unarmed"). rowKind is kept as the leading /
 * reported signal since it drives result.rowKind for the report.
 */
function isCustomRow(record) {
  const w = record.weapon || {};
  if (CUSTOM_ROW_KINDS.has(w.rowKind)) return true;
  if (CUSTOM_ROW_KINDS.has(record.delivery)) return true;
  if (CUSTOM_CATEGORIES.has(w.category)) return true;
  const tags = record.tags || [];
  if (tags.some(t => CUSTOM_TAGS.has(t))) return true;
  return false;
}

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeText(relPath, text) {
  fs.mkdirSync(path.dirname(path.join(ROOT, relPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, relPath), text);
}

/**
 * Matches the profile files' existing hand-authored convention: 2-space
 * indent, arrays of scalars printed inline (["a", "b"]), arrays of objects
 * and non-empty plain objects printed multi-line. Plain JSON.stringify
 * would expand every array multi-line and produce huge unrelated diff
 * noise across untouched records.
 */
function isScalar(v) {
  return v === null || (typeof v !== 'object');
}

function formatProfileJson(value, indent = 0) {
  const pad = '  '.repeat(indent);
  const padIn = '  '.repeat(indent + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every(isScalar)) {
      return `[${value.map(v => JSON.stringify(v)).join(', ')}]`;
    }
    const items = value.map(v => `${padIn}${formatProfileJson(v, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const entries = keys.map(k => `${padIn}${JSON.stringify(k)}: ${formatProfileJson(value[k], indent + 1)}`);
    return `{\n${entries.join(',\n')}\n${pad}}`;
  }

  return JSON.stringify(value);
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function packNameFromFile(filePath) {
  return path.basename(filePath, '.db');
}

function loadWeaponPacks() {
  const files = fs
    .readdirSync(path.join(ROOT, PACK_DIR))
    .filter(f => /^weapons.*\.db$/.test(f))
    .sort();

  const items = [];
  for (const file of files) {
    const packName = packNameFromFile(file);
    const relPath = path.join(PACK_DIR, file);
    const lines = readText(relPath)
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      let doc;
      try {
        doc = JSON.parse(line);
      } catch (err) {
        continue;
      }
      if (doc.type !== 'weapon') continue;
      const sys = doc.system || {};
      items.push({
        id: doc._id,
        name: doc.name,
        normalizedName: normalizeName(doc.name),
        pack: packName,
        uuid: `Compendium.foundryvtt-swse.${packName}.Item.${doc._id}`,
        damage: sys.damage ?? null,
        damageType: sys.damageType ?? null
      });
    }
  }
  return items;
}

function buildNameIndex(items) {
  const byNormalizedName = new Map();
  for (const item of items) {
    const key = item.normalizedName;
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, []);
    byNormalizedName.get(key).push(item);
  }
  const byId = new Map(items.map(i => [i.id, i]));
  const byUuid = new Map(items.map(i => [i.uuid, i]));
  return { byNormalizedName, byId, byUuid };
}

function loadProfileFiles() {
  return fs
    .readdirSync(path.join(ROOT, PROFILE_DIR))
    .filter(f => f.startsWith(PROFILE_GLOB_PREFIX) && f.endsWith('.json') && !f.endsWith('.schema.json'))
    .sort()
    .map(f => path.join(PROFILE_DIR, f));
}

function baseComponent(record) {
  const comps = record.components || [];
  return comps.find(c => c.key === 'base') || comps[0] || null;
}

function printedFormula(record) {
  if (record.formula && record.formula.printed) return record.formula.printed;
  const base = baseComponent(record);
  return base ? base.formula : null;
}

function parseSimpleDice(formula) {
  // Matches things like "3d6", "3d6+2", "2d6+4" -- NOT "varies"/"Special"/"4d10x2".
  if (typeof formula !== 'string') return null;
  const m = formula.trim().match(/^(\d+)d(\d+)(?:\+(\d+))?$/i);
  if (!m) return null;
  return { count: Number(m[1]), die: Number(m[2]), flat: m[3] ? Number(m[3]) : 0 };
}

function classifyDelta(baseFormula, printed) {
  if (typeof baseFormula !== 'string' || typeof printed !== 'string') return null;
  if (baseFormula.trim() === printed.trim()) {
    return { mode: 'base', delta: null };
  }
  const base = parseSimpleDice(baseFormula);
  const top = parseSimpleDice(printed);
  if (!base || !top) return null;

  if (top.count === base.count && top.die === base.die && top.flat !== base.flat) {
    const diff = top.flat - base.flat;
    if (diff > 0) {
      return { mode: 'base-plus-delta', delta: `+${diff}` };
    }
    return null;
  }

  if (top.die === base.die && top.count > base.count) {
    const extraDice = top.count - base.count;
    const diff = top.flat - base.flat;
    const delta = diff > 0 ? `+${extraDice}d${top.die}+${diff}` : `+${extraDice}d${top.die}`;
    return { mode: 'base-plus-dice', delta };
  }

  return null;
}

const CATCH_ALL_PACK = 'weapons';

function findCandidates(printedName, index) {
  const normalized = normalizeName(printedName);
  return index.byNormalizedName.get(normalized) || [];
}

/**
 * The "weapons" pack is a catalog mirror that duplicates items already
 * present in the category-specific packs (weapons-pistols, weapons-rifles,
 * etc.) under the same item id. When every name match resolves to the same
 * underlying item id, that is not a real ambiguity -- it is the same
 * compendium weapon reachable via two paths. Collapse to the
 * category-specific copy (matching existing curated precedent in
 * nh4-unknown-regions.json) instead of reporting it as ambiguous.
 */
function resolveCandidates(candidates) {
  const distinctIds = new Set(candidates.map(c => c.id));
  if (distinctIds.size !== 1) return candidates;
  const nonCatchAll = candidates.filter(c => c.pack !== CATCH_ALL_PACK);
  return nonCatchAll.length > 0 ? [nonCatchAll[0]] : [candidates[0]];
}

function auditRecord(record, index, fileLabel) {
  const w = record.weapon || {};
  const result = {
    file: fileLabel,
    slug: record.slug,
    printedName: w.printedName,
    rowKind: w.rowKind,
    status: null,
    detail: null,
    candidates: [],
    proposedWeaponPatch: null,
    proposedFormulaPatch: null
  };

  // Custom / natural / unarmed / special rows: never auto-match. Detected
  // from rowKind, delivery, weapon.category, or tags -- not rowKind alone,
  // since some rows (e.g. "Unarmed" filed under rowKind "melee") signal
  // custom status only through delivery/category/tags.
  if (isCustomRow(record)) {
    const signal = CUSTOM_ROW_KINDS.has(w.rowKind)
      ? `rowKind "${w.rowKind}"`
      : CUSTOM_ROW_KINDS.has(record.delivery)
        ? `delivery "${record.delivery}"`
        : CUSTOM_CATEGORIES.has(w.category)
          ? `weapon.category "${w.category}"`
          : `tags`;
    if (w.uuid) {
      result.status = 'inconsistent-custom-row';
      result.detail = `${signal} marks this as a custom row but weapon.uuid (${w.uuid}) is set; custom rows must not carry a compendium uuid.`;
    } else if (w.baseFormulaPolicy && w.baseFormulaPolicy !== 'custom' && w.baseFormulaPolicy !== 'none') {
      result.status = 'inconsistent-custom-row';
      result.detail = `${signal} marks this as a custom row but baseFormulaPolicy is "${w.baseFormulaPolicy}"; expected "custom" or "none".`;
    } else {
      result.status = 'skipped-custom';
      result.detail = `${signal} marks this as intentionally left unmatched.`;
    }
    return result;
  }

  // Existing UUID: verify it resolves and matches base metadata.
  if (w.uuid) {
    const item = index.byUuid.get(w.uuid);
    if (!item) {
      result.status = 'stale-uuid';
      result.detail = `uuid "${w.uuid}" does not resolve to any weapon in the scanned packs.`;
      return result;
    }
    const mismatches = [];
    if (w.baseFormula != null && w.baseFormula !== item.damage) {
      mismatches.push(`baseFormula "${w.baseFormula}" != compendium damage "${item.damage}"`);
    }
    if (w.baseType != null && w.baseType !== item.damageType) {
      mismatches.push(`baseType "${w.baseType}" != compendium damageType "${item.damageType}"`);
    }
    if (w.baseSlug != null && w.baseSlug !== item.id) {
      mismatches.push(`baseSlug "${w.baseSlug}" != compendium id "${item.id}"`);
    }
    if (w.basePack != null && w.basePack !== item.pack) {
      mismatches.push(`basePack "${w.basePack}" != compendium pack "${item.pack}"`);
    }
    if (mismatches.length) {
      result.status = 'formula-mismatch';
      result.detail = mismatches.join('; ');
      result.candidates = [item];
    } else {
      result.status = 'already-valid';
      result.detail = `uuid resolves to "${item.name}" (${item.pack}) with matching base metadata.`;
    }
    return result;
  }

  // No UUID yet: attempt exact-name match.
  const rawCandidates = findCandidates(w.printedName, index);
  if (rawCandidates.length === 0) {
    result.status = 'missing-match';
    result.detail = `no compendium weapon item found with normalized name "${normalizeName(w.printedName)}".`;
    return result;
  }
  const candidates = resolveCandidates(rawCandidates);
  if (candidates.length > 1) {
    result.status = 'ambiguous';
    result.detail = `${candidates.length} distinct compendium items share the normalized name "${normalizeName(w.printedName)}".`;
    result.candidates = candidates;
    return result;
  }

  const item = candidates[0];
  result.candidates = [item];

  const printed = printedFormula(record);
  const delta = classifyDelta(item.damage, printed);

  result.proposedWeaponPatch = {
    uuid: item.uuid,
    baseSlug: item.id,
    basePack: item.pack,
    baseFormula: item.damage,
    baseType: item.damageType,
    baseFormulaPolicy: 'uuid'
  };

  if (delta) {
    result.proposedFormulaPatch = {
      mode: delta.mode,
      delta: delta.delta,
      printed
    };
    result.status = 'safe-match';
    result.detail = `exact name match to "${item.name}" (${item.pack}); formula delta classified as ${delta.mode}.`;
  } else {
    result.status = 'safe-match-formula-unclear';
    result.detail = `exact name match to "${item.name}" (${item.pack}); printed formula "${printed}" vs base "${item.damage}" is not a simple/obvious delta and formula.mode is left untouched.`;
  }

  return result;
}

/**
 * Applies a safe-match patch by splicing the specific "weapon": {...} block
 * (and, if needed, a new "formula": {...} block) directly into the raw file
 * text, rather than re-serializing the whole document. The profile files
 * are hand-formatted with an inconsistent mix of inline and multi-line
 * arrays/objects; a full JSON.stringify round-trip would rewrite every
 * record's formatting and bury the real change in noise. Text-splicing
 * touches only the bytes that actually change.
 */
function lineIndent(text, index) {
  const lineStart = text.lastIndexOf('\n', index) + 1;
  const match = /^[ \t]*/.exec(text.slice(lineStart));
  return match[0];
}

function findWeaponBlock(text, slug) {
  const slugNeedle = `"slug": ${JSON.stringify(slug)}`;
  const slugIdx = text.indexOf(slugNeedle);
  if (slugIdx === -1) return null;
  const weaponKeyIdx = text.indexOf('"weapon":', slugIdx);
  if (weaponKeyIdx === -1) return null;
  const openIdx = text.indexOf('{', weaponKeyIdx);
  const closeIdx = text.indexOf('}', openIdx);
  if (openIdx === -1 || closeIdx === -1) return null;
  return { weaponKeyIdx, openIdx, closeIdx };
}

function patchWeaponBlockText(text, slug, weaponPatch) {
  const block = findWeaponBlock(text, slug);
  if (!block) return text;
  const { openIdx, closeIdx } = block;
  const indent = lineIndent(text, block.weaponKeyIdx);
  const inner = indent + '  ';
  const blockText = text.slice(openIdx, closeIdx + 1);
  const multiLine = blockText.includes('\n');

  const newFields = [
    ['uuid', weaponPatch.uuid],
    ['baseSlug', weaponPatch.baseSlug],
    ['basePack', weaponPatch.basePack],
    ['baseFormula', weaponPatch.baseFormula],
    ['baseType', weaponPatch.baseType],
    ['baseFormulaPolicy', weaponPatch.baseFormulaPolicy]
  ];

  let insertion;
  if (multiLine) {
    insertion = newFields.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
    insertion = `\n${insertion}`;
  } else {
    insertion = ', ' + newFields.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ');
  }

  // Insert right after the "rowKind" field so field order matches the
  // established convention (printedName, rowKind, uuid, baseSlug, ...).
  const rowKindMatch = /"rowKind":\s*"[^"]*",?/.exec(blockText);
  let patchedBlockText;
  if (rowKindMatch) {
    const cut = rowKindMatch.index + rowKindMatch[0].length;
    patchedBlockText = blockText.slice(0, cut) + insertion + blockText.slice(cut);
  } else {
    // Fallback: insert just before the closing brace.
    const closeRel = blockText.length - 1;
    patchedBlockText = blockText.slice(0, closeRel) + insertion + (multiLine ? '\n' + indent : '') + blockText.slice(closeRel);
  }

  return text.slice(0, openIdx) + patchedBlockText + text.slice(closeIdx + 1);
}

function patchFormulaBlockText(text, slug, formulaPatch, printed) {
  const block = findWeaponBlock(text, slug);
  if (!block) return text;
  const afterWeaponIdx = block.closeIdx + 1;
  const formulaKeyIdx = text.indexOf('"formula":', afterWeaponIdx);
  const deliveryKeyIdx = text.indexOf('"delivery":', afterWeaponIdx);

  const indent = lineIndent(text, block.weaponKeyIdx);

  if (formulaKeyIdx !== -1 && (deliveryKeyIdx === -1 || formulaKeyIdx < deliveryKeyIdx)) {
    // Existing formula block: only patch mode/delta in place.
    const openIdx = text.indexOf('{', formulaKeyIdx);
    let depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    if (closeIdx === -1) return text;
    let blockText = text.slice(openIdx, closeIdx + 1);
    blockText = blockText.replace(/"mode":\s*"[^"]*"/, `"mode": ${JSON.stringify(formulaPatch.mode)}`);
    blockText = blockText.replace(/"delta":\s*(null|"[^"]*")/, `"delta": ${JSON.stringify(formulaPatch.delta)}`);
    return text.slice(0, openIdx) + blockText + text.slice(closeIdx + 1);
  }

  // No formula block yet: insert one right after the weapon block, before
  // "delivery", matching the record's own field indentation.
  const formulaValue = {
    mode: formulaPatch.mode,
    printed,
    delta: formulaPatch.delta,
    deltaSource: 'printed-statblock',
    typeOverride: null,
    notes: []
  };
  const indentLevel = indent.length / 2;
  const rendered = formatProfileJson(formulaValue, indentLevel);
  const insertAt = block.closeIdx + 1; // right after the weapon block's closing "}"
  // The weapon block is followed by "," -- insert after that comma.
  const commaIdx = text[insertAt] === ',' ? insertAt + 1 : insertAt;
  const insertion = `\n${indent}"formula": ${rendered},`;
  return text.slice(0, commaIdx) + insertion + text.slice(commaIdx);
}

function applyWriteToText(text, slug, result) {
  if (result.status !== 'safe-match') return text;
  if (!result.proposedWeaponPatch) return text;

  text = patchWeaponBlockText(text, slug, result.proposedWeaponPatch);
  if (result.proposedFormulaPatch) {
    const printed = result.proposedFormulaPatch.printed ?? null;
    text = patchFormulaBlockText(text, slug, result.proposedFormulaPatch, printed);
  }
  return text;
}

function main() {
  const packItems = loadWeaponPacks();
  const index = buildNameIndex(packItems);
  const profileFiles = loadProfileFiles();

  const results = [];
  let writtenFiles = 0;
  let writtenRecords = 0;

  for (const relPath of profileFiles) {
    const raw = readText(relPath);
    let doc;
    try {
      doc = JSON.parse(raw);
    } catch (err) {
      console.error(`Failed to parse ${relPath}: ${err.message}`);
      process.exitCode = 1;
      continue;
    }

    let text = raw;
    let fileChanged = false;
    for (const record of doc.records || []) {
      const result = auditRecord(record, index, relPath);
      results.push(result);

      if (WRITE && result.status === 'safe-match') {
        const patched = applyWriteToText(text, record.slug, result);
        if (patched !== text) {
          text = patched;
          fileChanged = true;
          writtenRecords += 1;
        }
      }
    }

    if (WRITE && fileChanged) {
      // Validate the patched text is still well-formed JSON before writing.
      JSON.parse(text);
      writeText(relPath, text);
      writtenFiles += 1;
    }
  }

  const buckets = {
    'safe-match': [],
    'safe-match-formula-unclear': [],
    'already-valid': [],
    ambiguous: [],
    'missing-match': [],
    'stale-uuid': [],
    'formula-mismatch': [],
    'skipped-custom': [],
    'inconsistent-custom-row': []
  };
  for (const r of results) {
    (buckets[r.status] ||= []).push(r);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: WRITE ? 'write' : 'report-only',
    packItemCount: packItems.length,
    profileFileCount: profileFiles.length,
    recordCount: results.length,
    counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
    writtenFiles,
    writtenRecords
  };

  writeText(OUTPUT_JSON, JSON.stringify({ summary, results }, null, 2) + '\n');
  writeText(OUTPUT_MD, renderMarkdown(summary, buckets));

  console.log(JSON.stringify(summary, null, 2));

  if (buckets['inconsistent-custom-row'].length > 0 || results.length === 0) {
    process.exitCode = process.exitCode || 1;
  }
}

function renderMarkdown(summary, buckets) {
  const lines = [];
  lines.push('# Nonheroic Profile Weapon UUID Audit');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Mode: ${summary.mode}`);
  lines.push('');
  lines.push('This is a mechanical compendium identity audit only. It does not interpret');
  lines.push('sourcebooks, does not change `formula.printed`, and does not hydrate attack');
  lines.push('bonuses. See docs/nonheroic-weapon-uuid-metadata.md for the policy note.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pack weapon items scanned: ${summary.packItemCount}`);
  lines.push(`- Profile files scanned: ${summary.profileFileCount}`);
  lines.push(`- Records scanned: ${summary.recordCount}`);
  lines.push(`- Files written: ${summary.writtenFiles}`);
  lines.push(`- Records written: ${summary.writtenRecords}`);
  lines.push('');
  for (const [status, count] of Object.entries(summary.counts)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');

  const sectionTitles = {
    'safe-match': 'Applied / Applicable Safe Matches',
    'safe-match-formula-unclear': 'Safe UUID Matches with Unclear Formula Delta (metadata only, formula untouched)',
    'already-valid': 'Already-Valid UUIDs',
    ambiguous: 'Ambiguous Candidates',
    'missing-match': 'Missing Compendium Items',
    'stale-uuid': 'Stale / Invalid UUIDs',
    'formula-mismatch': 'Formula/Type Mismatches on Existing UUIDs',
    'skipped-custom': 'Custom / Natural / Unarmed / Special Rows (Intentionally Skipped)',
    'inconsistent-custom-row': 'Inconsistent Custom Rows (Needs Review)'
  };

  for (const [status, title] of Object.entries(sectionTitles)) {
    const rows = buckets[status] || [];
    lines.push(`## ${title} (${rows.length})`);
    lines.push('');
    if (rows.length === 0) {
      lines.push('_None._');
      lines.push('');
      continue;
    }
    for (const r of rows) {
      lines.push(`- \`${r.file}\` :: ${r.slug} (${r.printedName}) — ${r.detail}`);
      if (r.candidates && r.candidates.length > 1) {
        for (const c of r.candidates) {
          lines.push(`  - candidate: ${c.uuid} (${c.damage} ${c.damageType})`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

main();
