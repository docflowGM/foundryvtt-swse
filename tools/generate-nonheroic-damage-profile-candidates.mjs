#!/usr/bin/env node
/**
 * Bulk candidate generator for nonheroic weapon damage profiles.
 *
 * Report-first. Extracts candidate attack rows ONLY from clean, structured
 * printed-statblock fields already present in actor pack flags:
 *   - packs/nonheroic.db, packs/npc.db: flags.swse.import.raw["Melee Weapons"]
 *     / ["Ranged Weapons"] (semicolon/comma-joined "Name +N (dice, ...)" rows)
 *   - packs/beasts.db: flags.swse.beastData.melee / .ranged
 *
 * It intentionally does NOT treat embedded actor.items, possessions text, or
 * free-form prose statblocks (e.g. data/nonheroic/nonheroic_units.json's
 * wiki-mirrored "Protocol Format" droid text) as source authority, since
 * those are exactly the noisy sources that produced misleading "covered: 4"
 * results in the broad PR #903 coverage audit. Only rows with a printed
 * attack bonus AND a dice damage expression are extracted as candidates;
 * everything else (possession counts, "By Weapon +N", non-damage maneuver
 * rows) is silently excluded, not miscounted as a candidate.
 *
 * This script never writes to canonical profile files, actor packs,
 * compendium packs, or runtime code. With --write-candidates it writes only
 * to data/nonheroic/generated/, a staging area for human review/promotion.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE_CANDIDATES = process.argv.includes('--write-candidates');

const OUTPUT_JSON = 'docs/audits/generated/nonheroic-damage-profile-candidates.json';
const OUTPUT_MD = 'docs/audits/generated/nonheroic-damage-profile-candidates.md';
const CANDIDATE_DIR = 'data/nonheroic/generated';

const PACK_DIR = 'packs';
const PROFILE_DIR = 'data/nonheroic';
const PROFILE_PREFIX = 'nonheroic-weapon-damage-profiles.';

const ACTOR_SOURCES = [
  { file: 'packs/nonheroic.db', kind: 'nonheroic-pack-raw-statblock' },
  { file: 'packs/npc.db', kind: 'npc-pack-raw-statblock' }
];
const BEAST_SOURCE = { file: 'packs/beasts.db', kind: 'beast-pack-beastdata' };

const CUSTOM_ROW_KIND_WORDS = /\b(unarmed|claw|claws|bite|gore|slam|sting|tail|horn|natural)\b/i;
const SPECIAL_MODE_WORDS = /\b(autofire|rapid shot|burst|splash|cone|area|grenade|explosive|missile|rocket|flame|flamethrower|mine|mortar|torpedo)\b/i;
// "Stun" is deliberately excluded: in this dataset it always denotes the
// Stun *damage type* (e.g. "2d6+3 (Stun)"), which is ordinary typeOverride
// metadata already handled by existing profile precedent (see nh4's
// vagaari-infiltrator-stun-baton), not a rider/status effect requiring
// manual review. Genuine status-effect words remain here.
const RIDER_WORDS = /\b(poison|disease|paraly[sz]e|condition track|persistent condition|trip|knockdown|blind(?:ed)?|deafen(?:ed)?)\b/i;
// Special attack-mode / feat / attack-count / variant suffixes on an
// otherwise-ordinary weapon row (e.g. "Lightsaber +7 (3d8+6) with Rapid
// Strike"). The weapon itself may have an exact compendium match with an
// obviously-derived formula, but the row is expressing a mode/feat/
// attack-count/variant behavior that needs human review or explicit variant
// modeling -- it is not a safe Lane A bulk-promotion row. Checked only after
// an exact single compendium weapon match is found (see classifyRow), so it
// never overrides the earlier natural/unarmed, rider, or true
// area/autofire/grenade/special (SPECIAL_MODE_WORDS) classifications above.
// "autofire" and "burst fire" are listed here for completeness, but in
// practice those rows are already caught by SPECIAL_MODE_WORDS earlier in
// classifyRow and never reach this check. Uses \b word boundaries throughout
// (same "blast" inside "Blaster" bug class this file already guards against
// elsewhere).
const SPECIAL_ATTACK_MODE_WORDS = /\b(rapid shot|rapid strike|double attack|triple attack|dual attack|multiattack|trigger work|mighty swing|power attack|charging|charge|cleave|whirlwind|burst fire|autofire|brace|aimed shot|sniper)\b/i;

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeText(relPath, text) {
  fs.mkdirSync(path.dirname(path.join(ROOT, relPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, relPath), text);
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function parseJsonLines(relPath) {
  if (!exists(relPath)) return [];
  return readText(relPath)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Weapon pack index (mirrors tools/audit-nonheroic-profile-weapon-uuids.mjs)
// ---------------------------------------------------------------------------

const CATCH_ALL_PACK = 'weapons';

function normalizeWeaponName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function loadWeaponPacks() {
  const files = fs.readdirSync(path.join(ROOT, PACK_DIR)).filter(f => /^weapons.*\.db$/.test(f)).sort();
  const items = [];
  for (const file of files) {
    const packName = path.basename(file, '.db');
    for (const doc of parseJsonLines(path.join(PACK_DIR, file))) {
      if (doc.type !== 'weapon') continue;
      const sys = doc.system || {};
      items.push({
        id: doc._id,
        name: doc.name,
        normalizedName: normalizeWeaponName(doc.name),
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
    if (!byNormalizedName.has(item.normalizedName)) byNormalizedName.set(item.normalizedName, []);
    byNormalizedName.get(item.normalizedName).push(item);
  }
  return byNormalizedName;
}

function resolveCandidates(candidates) {
  const distinctIds = new Set(candidates.map(c => c.id));
  if (distinctIds.size !== 1) return candidates;
  const nonCatchAll = candidates.filter(c => c.pack !== CATCH_ALL_PACK);
  return nonCatchAll.length > 0 ? [nonCatchAll[0]] : [candidates[0]];
}

function findWeaponMatches(printedName, index) {
  const raw = index.get(normalizeWeaponName(printedName)) || [];
  if (raw.length === 0) return [];
  return resolveCandidates(raw);
}

function parseSimpleDice(formula) {
  if (typeof formula !== 'string') return null;
  const m = formula.trim().match(/^(\d+)d(\d+)(?:\+(\d+))?$/i);
  if (!m) return null;
  return { count: Number(m[1]), die: Number(m[2]), flat: m[3] ? Number(m[3]) : 0 };
}

function classifyDelta(baseFormula, printed) {
  if (typeof baseFormula !== 'string' || typeof printed !== 'string') return null;
  if (baseFormula.trim() === printed.trim()) return { mode: 'base', delta: null };
  const base = parseSimpleDice(baseFormula);
  const top = parseSimpleDice(printed);
  if (!base || !top) return null;
  if (top.count === base.count && top.die === base.die && top.flat !== base.flat) {
    const diff = top.flat - base.flat;
    return diff > 0 ? { mode: 'base-plus-delta', delta: `+${diff}` } : null;
  }
  if (top.die === base.die && top.count > base.count) {
    const extraDice = top.count - base.count;
    const diff = top.flat - base.flat;
    const delta = diff > 0 ? `+${extraDice}d${top.die}+${diff}` : `+${extraDice}d${top.die}`;
    return { mode: 'base-plus-dice', delta };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Existing-profile "already covered" index
// ---------------------------------------------------------------------------

function profileFiles() {
  if (!exists(PROFILE_DIR)) return [];
  return fs.readdirSync(path.join(ROOT, PROFILE_DIR))
    .filter(f => f.startsWith(PROFILE_PREFIX) && f.endsWith('.json') && !f.endsWith('.schema.json'))
    .sort()
    .map(f => path.join(PROFILE_DIR, f));
}

function loadExistingProfileMatchers() {
  const matchers = [];
  for (const relPath of profileFiles()) {
    const data = JSON.parse(readText(relPath));
    for (const record of data.records || []) {
      const actorSlugs = (record.match?.actorSlugs || []).map(slugify).filter(Boolean);
      const rawIncludes = (record.match?.rawIncludes || []).map(v => clean(v).toLowerCase()).filter(Boolean);
      if (!actorSlugs.length || !rawIncludes.length) continue;
      matchers.push({ file: relPath, slug: record.slug, actorSlugs, rawIncludes });
    }
  }
  return matchers;
}

function findAlreadyProfiled(actorSlug, rawText, matchers) {
  const normalizedRaw = clean(rawText).toLowerCase();
  return matchers.find(m => m.actorSlugs.includes(actorSlug) && m.rawIncludes.some(marker => normalizedRaw.includes(marker)));
}

// ---------------------------------------------------------------------------
// Clause splitting / parsing: "Name +N (dice, annotation) with Suffix"
// ---------------------------------------------------------------------------

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);

    if (depth === 0 && (ch === ',' || ch === ';')) {
      parts.push(current);
      current = '';
      i++;
      continue;
    }
    if (depth === 0 && text.slice(i, i + 5) === ' and ') {
      parts.push(current);
      current = '';
      i += 5;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim()) parts.push(current);
  return parts.map(p => p.trim()).filter(Boolean);
}

function findMatchingParen(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const DICE_RE = /(\d+)d(\d+)(?:\s*[x×]\s*\d+)?(?:\s*[+-]\s*\d+)?/i;
const BONUS_RE = /([+-]\d+)(\*{0,2})\s*\(/;

function parseAttackClause(clause) {
  const bonusMatch = BONUS_RE.exec(clause);
  if (!bonusMatch) return null;

  const name = clean(clause.slice(0, bonusMatch.index));
  if (!name) return null;

  const bonusText = bonusMatch[1];
  const bonus = Number(bonusText);
  const hasAsterisk = !!bonusMatch[2];

  const openIdx = bonusMatch.index + bonusMatch[0].length - 1;
  const closeIdx = findMatchingParen(clause, openIdx);
  if (closeIdx === -1) return null;

  const inner = clause.slice(openIdx + 1, closeIdx);
  const suffix = clean(clause.slice(closeIdx + 1));

  const segments = splitTopLevel(inner).length ? splitTopLevel(inner) : [inner];
  const first = segments[0] ?? '';
  const diceMatch = DICE_RE.exec(first);
  if (!diceMatch) return null;

  const damageFormula = clean(diceMatch[0]).replace(/\s+/g, '');
  const annotations = segments.slice(1).map(clean).filter(Boolean);

  // Any nested parenthetical left in the first segment after the dice match
  // (e.g. "3d6+7 ( Fire )") is captured as an annotation too, verbatim.
  const remainderOfFirst = clean(first.slice(diceMatch.index + diceMatch[0].length));
  const nestedAnnotation = /^\(([^()]+)\)$/.exec(remainderOfFirst);
  if (nestedAnnotation) annotations.unshift(clean(nestedAnnotation[1]));

  // If a second, different dice expression shows up inside an annotation
  // (e.g. "1d6 (2d6 Stun)" -- garbled/duplicated import text), the printed
  // damage is genuinely ambiguous. Flag it rather than silently trusting
  // whichever dice pattern happened to match first.
  const ambiguousDice = annotations.some(a => DICE_RE.test(a));

  return {
    printedName: name,
    attackBonusText: `${bonus >= 0 ? '+' : ''}${bonus}${hasAsterisk ? '*' : ''}`,
    attackBonus: bonus,
    damageFormula,
    annotations,
    suffix: suffix || null,
    raw: clean(clause),
    ambiguousDice
  };
}

function extractClauses(fieldText) {
  if (!fieldText) return [];
  return splitTopLevel(fieldText)
    .map(parseAttackClause)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Row classification
// ---------------------------------------------------------------------------

function classifyRow(clause, attackKind, weaponIndex, existingMatchers, actorSlug, actorName) {
  const combinedText = `${clause.printedName} ${clause.annotations.join(' ')} ${clause.suffix ?? ''}`;

  const already = findAlreadyProfiled(actorSlug, clause.raw, existingMatchers);
  if (already) {
    return { status: 'already-profiled', detail: `matches existing profile record "${already.slug}" in ${already.file}.`, matches: [] };
  }

  if (clause.ambiguousDice) {
    return { status: 'formula-unclear', detail: `printed row contains more than one dice expression (e.g. a duplicated/garbled damage value in an annotation); "${clause.damageFormula}" was extracted but is not treated as unambiguous.`, matches: [] };
  }

  if (CUSTOM_ROW_KIND_WORDS.test(clause.printedName)) {
    return { status: 'natural-or-unarmed', detail: 'printed weapon/action name indicates a natural or unarmed attack.', matches: [] };
  }

  if (SPECIAL_MODE_WORDS.test(combinedText)) {
    return { status: 'area-autofire-grenade-special', detail: 'row text indicates autofire/rapid-shot/area/grenade/explosive delivery.', matches: [] };
  }

  if (RIDER_WORDS.test(combinedText)) {
    return { status: 'rider-or-condition', detail: 'row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.', matches: [] };
  }

  const rawMatches = findWeaponMatches(clause.printedName, weaponIndex);
  if (rawMatches.length === 0) {
    return { status: 'no-compendium-match', detail: `no compendium weapon item found with normalized name "${normalizeWeaponName(clause.printedName)}".`, matches: [] };
  }
  if (rawMatches.length > 1) {
    return { status: 'ambiguous-compendium-match', detail: `${rawMatches.length} distinct compendium items share this normalized name.`, matches: rawMatches };
  }

  const item = rawMatches[0];

  if (SPECIAL_ATTACK_MODE_WORDS.test(combinedText)) {
    return {
      status: 'ordinary-weapon-special-mode',
      detail: `exact match to "${item.name}" (${item.pack}); row text indicates a special attack mode/feat/attack-count/variant (e.g. rapid strike, double attack, power attack, trigger work) rather than a plain base weapon damage row, so it is excluded from Lane A bulk promotion and routed to manual/variant review.`,
      matches: [item],
      delta: classifyDelta(item.damage, clause.damageFormula)
    };
  }

  const delta = classifyDelta(item.damage, clause.damageFormula);
  if (!delta) {
    return { status: 'formula-unclear', detail: `matched "${item.name}" (${item.pack}, base ${item.damage}); printed formula "${clause.damageFormula}" is not a simple/obvious base or base+delta/base+dice relationship.`, matches: [item] };
  }

  if (delta.mode === 'base') {
    return { status: 'safe-ordinary-weapon-candidate', detail: `exact match to "${item.name}" (${item.pack}); printed formula equals compendium base.`, matches: [item], delta };
  }
  return { status: 'safe-ordinary-weapon-with-delta', detail: `exact match to "${item.name}" (${item.pack}); printed formula classified as ${delta.mode}.`, matches: [item], delta };
}

// ---------------------------------------------------------------------------
// Extraction from actor packs
// ---------------------------------------------------------------------------

function extractFromNonheroicStylePack(sourcePath, sourceKind) {
  const rows = [];
  for (const actor of parseJsonLines(sourcePath)) {
    const raw = actor?.flags?.swse?.import?.raw;
    if (!raw || typeof raw !== 'object') continue;
    const actorName = clean(actor.name);
    if (!actorName) continue;
    const actorSlug = slugify(actorName);

    for (const [field, attackKind] of [['Melee Weapons', 'melee'], ['Ranged Weapons', 'ranged']]) {
      const fieldText = raw[field];
      if (!fieldText || typeof fieldText !== 'string') continue;
      for (const clause of extractClauses(fieldText)) {
        rows.push({ actorName, actorSlug, attackKind, sourcePath, sourceKind, sourceBook: 'Unknown / missing source', clause });
      }
    }
  }
  return rows;
}

function extractFromBeastPack(sourcePath, sourceKind) {
  const rows = [];
  for (const actor of parseJsonLines(sourcePath)) {
    const beastData = actor?.flags?.swse?.beastData;
    if (!beastData || typeof beastData !== 'object') continue;
    const actorName = clean(beastData.name ?? actor.name);
    if (!actorName) continue;
    const actorSlug = slugify(actorName);

    for (const [field, attackKind] of [['melee', 'melee'], ['ranged', 'ranged']]) {
      const fieldText = beastData[field];
      if (!fieldText || typeof fieldText !== 'string') continue;
      for (const clause of extractClauses(fieldText)) {
        rows.push({ actorName, actorSlug, attackKind, sourcePath, sourceKind, sourceBook: 'Unknown / missing source', clause });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Candidate JSON (staging shape, close to but not identical to NH-2 records)
// ---------------------------------------------------------------------------

function toCandidateRecord(row, result) {
  const item = result.matches?.[0] ?? null;
  const slug = `${row.actorSlug}-${slugify(row.clause.printedName)}`;
  return {
    slug,
    name: row.clause.printedName,
    status: result.status,
    source: {
      book: row.sourceBook,
      status: 'generated-candidate; page and confidence review required',
      page: null,
      generatedFrom: row.sourcePath
    },
    actor: {
      name: row.actorName,
      slugs: [row.actorSlug]
    },
    match: {
      actorSlugs: [row.actorSlug],
      // A reusable marker (weapon/action name only, matching the convention
      // used by hand-authored NH profiles), not the full clause with its
      // specific attack bonus/damage numbers -- those live in printedAttack
      // and formula.printed instead, and would make the marker too narrow
      // to match this actor's row again if the exact digits ever changed.
      rawIncludes: [row.clause.printedName.toLowerCase()]
    },
    weapon: {
      printedName: row.clause.printedName,
      rowKind: row.attackKind,
      uuid: item ? item.uuid : null,
      baseSlug: item ? item.id : null,
      basePack: item ? item.pack : null,
      baseFormula: item ? item.damage : null,
      baseType: item ? item.damageType : null,
      baseFormulaPolicy: item ? 'uuid' : 'none'
    },
    printedAttack: {
      text: row.clause.attackBonusText,
      bonus: row.clause.attackBonus,
      bonuses: [row.clause.attackBonus],
      source: 'printed-statblock',
      hydratePolicy: 'metadata-only'
    },
    formula: {
      mode: result.delta ? result.delta.mode : 'custom',
      printed: row.clause.damageFormula,
      delta: result.delta ? result.delta.delta : null,
      deltaSource: 'printed-statblock'
    },
    annotations: row.clause.annotations,
    suffix: row.clause.suffix,
    confidence: 'manualRequired',
    reviewRequired: true
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const weaponItems = loadWeaponPacks();
  const weaponIndex = buildNameIndex(weaponItems);
  const existingMatchers = loadExistingProfileMatchers();

  const rawRows = [];
  for (const source of ACTOR_SOURCES) {
    if (!exists(source.file)) continue;
    rawRows.push(...extractFromNonheroicStylePack(source.file, source.kind));
  }
  if (exists(BEAST_SOURCE.file)) {
    rawRows.push(...extractFromBeastPack(BEAST_SOURCE.file, BEAST_SOURCE.kind));
  }

  const results = rawRows.map(row => {
    const result = classifyRow(row.clause, row.attackKind, weaponIndex, existingMatchers, row.actorSlug, row.actorName);
    return { row, result };
  });

  const buckets = {
    'already-profiled': [],
    'safe-ordinary-weapon-candidate': [],
    'safe-ordinary-weapon-with-delta': [],
    'ordinary-weapon-special-mode': [],
    'no-compendium-match': [],
    'ambiguous-compendium-match': [],
    'natural-or-unarmed': [],
    'area-autofire-grenade-special': [],
    'rider-or-condition': [],
    'formula-unclear': []
  };
  for (const r of results) (buckets[r.result.status] ||= []).push(r);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: WRITE_CANDIDATES ? 'write-candidates' : 'report-only',
    weaponPackItemCount: weaponItems.length,
    existingProfileRecordCount: existingMatchers.length,
    sourceFilesScanned: ACTOR_SOURCES.map(s => s.file).concat(exists(BEAST_SOURCE.file) ? [BEAST_SOURCE.file] : []),
    candidateRowsExtracted: results.length,
    counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
    sourceBookNote: 'All candidate rows are generated from actor-pack raw statblock fields, which carry no book/page attribution in this repository (matches the finding already documented in the PR #903 coverage audit and every prior NH batch). source.book is set to "Unknown / missing source" and confidence is manualRequired for every candidate rather than gating generation on a source-missing bucket that would otherwise swallow ~100% of rows.'
  };

  let writtenFiles = [];
  if (WRITE_CANDIDATES) {
    const safeBySource = new Map();
    for (const status of ['safe-ordinary-weapon-candidate', 'safe-ordinary-weapon-with-delta']) {
      for (const { row, result } of buckets[status]) {
        const packLabel = path.basename(row.sourcePath, '.db');
        if (!safeBySource.has(packLabel)) safeBySource.set(packLabel, []);
        safeBySource.get(packLabel).push(toCandidateRecord(row, result));
      }
    }
    for (const [packLabel, records] of safeBySource) {
      const outPath = path.join(CANDIDATE_DIR, `nonheroic-weapon-damage-candidates.${packLabel}.json`);
      const doc = {
        generatedAt: summary.generatedAt,
        generatedBy: 'tools/generate-nonheroic-damage-profile-candidates.mjs',
        note: 'Staging candidates only. NOT a canonical profile file, NOT wired into the hydrator. Human review required before promoting any row into data/nonheroic/nonheroic-weapon-damage-profiles.*.json.',
        sourcePack: `packs/${packLabel}.db`,
        recordCount: records.length,
        records
      };
      writeText(outPath, JSON.stringify(doc, null, 2) + '\n');
      writtenFiles.push(outPath);
    }
  }
  summary.writtenFiles = writtenFiles;

  writeText(OUTPUT_JSON, JSON.stringify({ summary, results: results.map(r => ({ ...r.row, clause: r.row.clause, status: r.result.status, detail: r.result.detail, matches: r.result.matches?.map(m => ({ uuid: m.uuid, damage: m.damage, damageType: m.damageType })) })) }, null, 2) + '\n');
  writeText(OUTPUT_MD, renderMarkdown(summary, buckets));

  console.log(JSON.stringify(summary, null, 2));
}

function renderMarkdown(summary, buckets) {
  const lines = [];
  lines.push('# Nonheroic Damage Profile Bulk Candidate Report');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Mode: ${summary.mode}`);
  lines.push('');
  lines.push('This report extracts candidate weapon-damage profile rows only from clean,');
  lines.push('structured printed-statblock fields on actor packs (`flags.swse.import.raw`');
  lines.push('`Melee Weapons`/`Ranged Weapons` on nonheroic.db/npc.db, and');
  lines.push('`flags.swse.beastData.melee`/`.ranged` on beasts.db). It does not use');
  lines.push('embedded actor.items, possessions text, or free-form prose statblocks as');
  lines.push('source authority, unlike the broad PR #903 coverage audit. It never writes');
  lines.push('to canonical profile files, actor packs, compendium packs, or runtime code.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Weapon compendium items scanned: ${summary.weaponPackItemCount}`);
  lines.push(`- Existing profile records (already-profiled index): ${summary.existingProfileRecordCount}`);
  lines.push(`- Source files scanned: ${summary.sourceFilesScanned.join(', ')}`);
  lines.push(`- Candidate rows extracted: ${summary.candidateRowsExtracted}`);
  lines.push(`- Candidate files written: ${summary.writtenFiles.length ? summary.writtenFiles.join(', ') : 'none (report-only mode)'}`);
  lines.push('');
  lines.push(`> ${summary.sourceBookNote}`);
  lines.push('');
  for (const [status, count] of Object.entries(summary.counts)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');

  const sectionTitles = {
    'already-profiled': 'Already Profiled (matches an existing NH profile record)',
    'safe-ordinary-weapon-candidate': 'Safe Ordinary Weapon Candidates (exact compendium match, printed formula = base)',
    'safe-ordinary-weapon-with-delta': 'Safe Ordinary Weapon Candidates With Delta (exact compendium match, obvious base+delta/base+dice)',
    'ordinary-weapon-special-mode': 'Ordinary Weapon, Special Attack Mode (exact compendium match, but row expresses a mode/feat/attack-count/variant -- manual review lane)',
    'no-compendium-match': 'No Compendium Match',
    'ambiguous-compendium-match': 'Ambiguous Compendium Match',
    'natural-or-unarmed': 'Natural / Unarmed Rows (manual review lane)',
    'area-autofire-grenade-special': 'Area / Autofire / Grenade / Special Mode Rows (manual review lane)',
    'rider-or-condition': 'Rider / Condition Rows (manual review lane)',
    'formula-unclear': 'Formula Unclear (compendium matched but dice do not obviously derive)'
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
    const sample = rows.slice(0, 40);
    for (const { row, result } of sample) {
      lines.push(`- \`${row.sourcePath}\` :: ${row.actorName} — "${row.clause.raw}" — ${result.detail}`);
    }
    if (rows.length > sample.length) {
      lines.push(`- _(${rows.length - sample.length} more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

main();
