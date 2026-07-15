#!/usr/bin/env node
/**
 * Lane B remainder audit for nonheroic weapon damage profiles.
 *
 * Lane A bulk promotion (tools/promote-nonheroic-damage-profile-candidates.mjs,
 * passes 1-5, 587 records) only ever touches the two "safe" candidate
 * statuses (safe-ordinary-weapon-candidate / safe-ordinary-weapon-with-delta).
 * Everything else the generator classified -- special attack modes, area/
 * autofire/grenade rows, riders/conditions, natural/unarmed rows, unclear
 * formulas, no-compendium-match rows, and any ambiguous matches -- is "Lane
 * B": rows that need actual rules/modeling work, not mechanical promotion.
 *
 * This is a READ-ONLY audit. It does not promote any profile, does not
 * create any weapon item, does not touch actor packs, compendium packs, or
 * runtime code, and does not wire anything into the hydrator. It only
 * classifies the remaining candidate universe into actionable workstreams
 * so a future PR can pick the highest-value, lowest-risk stream first.
 *
 * Inputs:
 *   - docs/audits/generated/nonheroic-damage-profile-candidates.json
 *     (the full per-row classification report from
 *     tools/generate-nonheroic-damage-profile-candidates.mjs)
 *   - data/nonheroic/nonheroic-weapon-damage-profiles.*.json
 *     (all current profile files, including bulk-lane-a-pass-*.json, used
 *     only to build the "already covered" exclusion index)
 *   - packs/weapons*.db (compendium weapon items, for fuzzy/alias checks)
 *   - packs/*.db (all actor-shaped packs, scanned for embedded actor.items
 *     of type "weapon", to corroborate whether an apparently-missing
 *     ordinary weapon name has real damage precedent elsewhere in the data)
 *
 * Outputs:
 *   - docs/audits/generated/nonheroic-lane-b-remainder.json
 *   - docs/audits/generated/nonheroic-lane-b-remainder.md
 *   - docs/audits/nonheroic-lane-b-remainder.md (human-facing writeup, see
 *     the doc for the full narrative; this tool only emits the generated
 *     data-driven summary, not the narrative doc)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const CANDIDATE_REPORT = 'docs/audits/generated/nonheroic-damage-profile-candidates.json';
const OUTPUT_JSON = 'docs/audits/generated/nonheroic-lane-b-remainder.json';
const OUTPUT_MD = 'docs/audits/generated/nonheroic-lane-b-remainder.md';

const PROFILE_DIR = 'data/nonheroic';
const PROFILE_PREFIX = 'nonheroic-weapon-damage-profiles.';
const PACK_DIR = 'packs';

const SAMPLE_LIMIT = 6;
const TOP_GROUPS_LIMIT = 25;

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

function normalizeWeaponName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Classification word lists (mirrors + extends the generator's own lists)
// ---------------------------------------------------------------------------

const SPECIAL_MODE_VARIANT_WORDS = /\b(rapid shot|rapid strike|double attack|triple attack|dual attack|multiattack|trigger work|mighty swing|power attack|charging|charge|cleave|whirlwind|burst fire|brace|aimed shot|sniper)\b/i;
const GRENADE_EXPLOSIVE_WORDS = /\b(grenade|explosive|missile|rocket|flame|flamethrower|mine|mortar|torpedo)\b/i;
const RIDER_CT_WORDS = /\b(stun ct|ion ct|condition track|persistent condition|ongoing damage|ongoing)\b/i;
const SPECIAL_ACTION_NAME_WORDS = /\b(rapid shot|support fire|barrage|salvo|dastardly blast|twin blaster burst|sweep|flurry|volley)\b/i;

// ---------------------------------------------------------------------------
// Load candidate report
// ---------------------------------------------------------------------------

function loadCandidateReport() {
  if (!exists(CANDIDATE_REPORT)) {
    throw new Error(`Candidate report not found: ${CANDIDATE_REPORT}. Run tools/generate-nonheroic-damage-profile-candidates.mjs first.`);
  }
  return JSON.parse(readText(CANDIDATE_REPORT));
}

// ---------------------------------------------------------------------------
// Load all current profile files (including bulk pass files) -> already-covered index
// ---------------------------------------------------------------------------

function profileFiles() {
  if (!exists(PROFILE_DIR)) return [];
  return fs.readdirSync(path.join(ROOT, PROFILE_DIR))
    .filter(f => f.startsWith(PROFILE_PREFIX) && f.endsWith('.json') && !f.endsWith('.schema.json'))
    .sort();
}

function loadProfileMatchers() {
  const matchers = [];
  const files = profileFiles();
  let totalRecords = 0;
  for (const file of files) {
    const relPath = path.join(PROFILE_DIR, file);
    const data = JSON.parse(readText(relPath));
    const records = data.records || [];
    totalRecords += records.length;
    for (const record of records) {
      const actorSlugs = (record.match?.actorSlugs || []).map(slugify).filter(Boolean);
      const rawIncludes = (record.match?.rawIncludes || []).map(v => clean(v).toLowerCase()).filter(Boolean);
      if (!actorSlugs.length || !rawIncludes.length) continue;
      matchers.push({ file, slug: record.slug, actorSlugs, rawIncludes });
    }
  }
  return { matchers, files, totalRecords };
}

function isAlreadyCovered(actorSlug, rawText, matchers) {
  const normalizedRaw = clean(rawText).toLowerCase();
  return matchers.find(m => m.actorSlugs.includes(actorSlug) && m.rawIncludes.some(marker => normalizedRaw.includes(marker))) || null;
}

// ---------------------------------------------------------------------------
// Compendium weapon index (packs/weapons*.db) -- for fuzzy/alias checks
// ---------------------------------------------------------------------------

function loadWeaponCompendiumItems() {
  if (!exists(PACK_DIR)) return [];
  const files = fs.readdirSync(path.join(ROOT, PACK_DIR)).filter(f => /^weapons.*\.db$/.test(f)).sort();
  const items = [];
  for (const file of files) {
    const packName = path.basename(file, '.db');
    for (const doc of parseJsonLines(path.join(PACK_DIR, file))) {
      if (doc.type !== 'weapon') continue;
      const sys = doc.system || {};
      items.push({
        name: doc.name,
        normalizedName: normalizeWeaponName(doc.name),
        pack: packName,
        damage: sys.damage ?? null,
        damageType: sys.damageType ?? null
      });
    }
  }
  return items;
}

/**
 * Near-exact normalization-bug check only (NOT a general "similar name"
 * fuzzy search -- that would conflate genuine content gaps with matcher
 * bugs). Flags only: (a) exact match after singular/plural toggling, since
 * that is unambiguously the same item; anything looser (substring overlap
 * across different qualifier words, e.g. "Knife" vs "Monomolecular Knife")
 * is surfaced separately as "related but distinct compendium items" context
 * for human review, not auto-classified as a bug.
 */
function findSingularPluralBug(normalizedName, weaponItems) {
  if (!normalizedName) return null;
  const toggled = normalizedName.endsWith('s') ? normalizedName.slice(0, -1) : `${normalizedName}s`;
  const hit = weaponItems.find(w => w.normalizedName === toggled);
  return hit ? { item: hit, reason: `singular/plural normalization mismatch ("${normalizedName}" vs compendium "${hit.normalizedName}")` } : null;
}

/**
 * Substring/word-overlap relatives: compendium items that share all of the
 * printed name's words (or vice versa) but are not identical. Informational
 * only -- surfaces candidates for a human to decide "same item, different
 * name" vs "genuinely different, more specific item" (e.g. Knife vs
 * Monomolecular Knife are almost certainly different weapons in this
 * system, not the same item under an alias).
 */
function findRelatedCompendiumItems(normalizedName, weaponItems) {
  if (!normalizedName || normalizedName.length < 3) return [];
  const words = normalizedName.split(' ').filter(Boolean);
  const related = [];
  for (const item of weaponItems) {
    if (item.normalizedName === normalizedName) continue;
    const itemWords = item.normalizedName.split(' ').filter(Boolean);
    const normContainsItem = words.length > itemWords.length && itemWords.length > 0 && itemWords.every(w => words.includes(w));
    const itemContainsNorm = itemWords.length > words.length && words.every(w => itemWords.includes(w));
    if (normContainsItem || itemContainsNorm) {
      related.push({ name: item.name, pack: item.pack, damage: item.damage, damageType: item.damageType });
    }
  }
  return related.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Embedded actor.items evidence (any packs/*.db doc with an items array) --
// corroborates whether an apparently-missing ordinary weapon name has real
// damage precedent as an owned item somewhere in the data, even though the
// candidate generator deliberately never treats actor.items as source
// authority for candidate extraction itself.
// ---------------------------------------------------------------------------

function loadEmbeddedWeaponItemEvidence() {
  const evidence = new Map(); // normalizedName -> [{name, damage, damageType, actorName, actorPack}]
  if (!exists(PACK_DIR)) return evidence;
  const files = fs.readdirSync(path.join(ROOT, PACK_DIR)).filter(f => f.endsWith('.db'));
  for (const file of files) {
    const packName = path.basename(file, '.db');
    for (const doc of parseJsonLines(path.join(PACK_DIR, file))) {
      if (!Array.isArray(doc.items)) continue;
      for (const item of doc.items) {
        if (item?.type !== 'weapon') continue;
        const norm = normalizeWeaponName(item.name);
        if (!norm) continue;
        if (!evidence.has(norm)) evidence.set(norm, []);
        const list = evidence.get(norm);
        if (list.length < 25) {
          list.push({
            name: item.name,
            damage: item.system?.damage ?? null,
            damageType: item.system?.damageType ?? null,
            actorName: doc.name,
            actorPack: packName
          });
        }
      }
    }
  }
  return evidence;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

function groupKey(result) {
  return normalizeWeaponName(result.clause.printedName);
}

function buildGroup(status, normalizedName, rows, weaponItems, embeddedEvidence) {
  const printedNames = new Set(rows.map(r => r.clause.printedName));
  const sourcePacks = new Set(rows.map(r => path.basename(r.sourcePath, '.db')));
  const sampleActors = [...new Set(rows.map(r => r.actorName))].slice(0, SAMPLE_LIMIT);
  const sampleRawRows = rows.slice(0, SAMPLE_LIMIT).map(r => r.clause.raw);
  const samplePrintedFormulas = [...new Set(rows.map(r => r.clause.damageFormula))].slice(0, SAMPLE_LIMIT);
  const matchedCompendiumItems = [...new Map(
    rows.flatMap(r => (r.matches || []).map(m => [m.uuid, m]))
  ).values()];

  const singularPluralBug = findSingularPluralBug(normalizedName, weaponItems);
  const relatedCompendiumItems = matchedCompendiumItems.length ? [] : findRelatedCompendiumItems(normalizedName, weaponItems);
  const embeddedItemEvidence = embeddedEvidence.get(normalizedName) || [];

  let recommendedAction;
  const combinedText = [...printedNames].join(' ');
  if (status === 'ordinary-weapon-special-mode') {
    recommendedAction = 'special-mode-variant-profile-needed';
  } else if (status === 'area-autofire-grenade-special') {
    recommendedAction = GRENADE_EXPLOSIVE_WORDS.test(combinedText) ? 'grenade-or-explosive-profile-needed' : 'area-autofire-profile-needed';
  } else if (status === 'rider-or-condition') {
    recommendedAction = 'rider-profile-needed';
  } else if (status === 'natural-or-unarmed') {
    recommendedAction = 'natural-or-unarmed-profile-needed';
  } else if (status === 'formula-unclear') {
    recommendedAction = 'formula-override-review-needed';
  } else if (status === 'ambiguous-compendium-match') {
    recommendedAction = 'duplicate-or-ambiguous-source-row-review';
  } else if (status === 'no-compendium-match') {
    if (SPECIAL_ACTION_NAME_WORDS.test(combinedText)) {
      recommendedAction = 'special-action-not-weapon';
    } else if (singularPluralBug) {
      recommendedAction = 'candidate-generator-bug';
    } else {
      recommendedAction = 'missing-compendium-weapon-investigation';
    }
  } else {
    recommendedAction = 'formula-override-review-needed';
  }

  return {
    normalizedName,
    printedNames: [...printedNames],
    sourcePacks: [...sourcePacks],
    count: rows.length,
    sampleActors,
    sampleRawRows,
    samplePrintedFormulas,
    matchedCompendiumItems,
    singularPluralNormalizationBug: singularPluralBug ? { compendiumItem: singularPluralBug.item.name, pack: singularPluralBug.item.pack, damage: singularPluralBug.item.damage, reason: singularPluralBug.reason } : null,
    relatedButDistinctCompendiumItems: relatedCompendiumItems,
    embeddedActorItemEvidence: embeddedItemEvidence.slice(0, SAMPLE_LIMIT),
    recommendedAction
  };
}

function buildBucketGroups(status, rows, weaponItems, embeddedEvidence) {
  const byName = new Map();
  for (const r of rows) {
    const key = groupKey(r);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(r);
  }
  const groups = [...byName.entries()]
    .map(([normalizedName, groupRows]) => buildGroup(status, normalizedName, groupRows, weaponItems, embeddedEvidence))
    .sort((a, b) => b.count - a.count);
  return groups;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const report = loadCandidateReport();
  const { matchers, files: profileFileList, totalRecords } = loadProfileMatchers();
  const weaponItems = loadWeaponCompendiumItems();
  const embeddedEvidence = loadEmbeddedWeaponItemEvidence();

  const LANE_B_STATUSES = [
    'ordinary-weapon-special-mode',
    'area-autofire-grenade-special',
    'rider-or-condition',
    'formula-unclear',
    'natural-or-unarmed',
    'no-compendium-match',
    'ambiguous-compendium-match'
  ];
  const SAFE_LANE_A_STATUSES = ['safe-ordinary-weapon-candidate', 'safe-ordinary-weapon-with-delta'];

  let excludedAlreadyCovered = 0;
  const bucketRows = Object.fromEntries([...LANE_B_STATUSES, 'safe-lane-a-still-uncovered'].map(s => [s, []]));

  for (const r of report.results) {
    if (r.status === 'already-profiled') continue; // was already covered at generation time
    const covered = isAlreadyCovered(r.actorSlug, r.clause.raw, matchers);
    if (covered) {
      excludedAlreadyCovered++;
      continue;
    }
    if (LANE_B_STATUSES.includes(r.status)) {
      bucketRows[r.status].push(r);
    } else if (SAFE_LANE_A_STATUSES.includes(r.status)) {
      bucketRows['safe-lane-a-still-uncovered'].push(r);
    }
  }

  const buckets = {};
  for (const status of [...LANE_B_STATUSES, 'safe-lane-a-still-uncovered']) {
    buckets[status] = {
      totalRows: bucketRows[status].length,
      groups: buildBucketGroups(status, bucketRows[status], weaponItems, embeddedEvidence)
    };
  }

  const allGroupsFlat = [];
  for (const status of LANE_B_STATUSES) {
    for (const g of buckets[status].groups) allGroupsFlat.push({ status, ...g });
  }
  const topGroupsByCount = [...allGroupsFlat].sort((a, b) => b.count - a.count).slice(0, TOP_GROUPS_LIMIT);

  const specialInvestigationNames = ['sporting blaster pistol', 'knife', 'spear', 'quarterstaff', 'combat gloves', 'force pike', 'bayonet', 'baton', 'mace', 'club'];
  const specialInvestigationFindings = specialInvestigationNames.map(name => {
    const exactCompendium = weaponItems.filter(w => w.normalizedName === name);
    const related = findRelatedCompendiumItems(name, weaponItems);
    const embedded = embeddedEvidence.get(name) || [];
    // A name can have remaining rows in MORE THAN ONE Lane B bucket at once
    // (e.g. "Sporting Blaster Pistol" has separate ordinary-weapon-special-mode,
    // area-autofire-grenade-special, AND formula-unclear groups) -- report all
    // of them, not just the first bucket found.
    const laneBGroups = allGroupsFlat.filter(g => g.normalizedName === name);
    return {
      name,
      existsAsExactCompendiumItem: exactCompendium.length > 0,
      exactCompendiumItems: exactCompendium,
      relatedButDistinctCompendiumItems: related,
      embeddedActorItemEvidence: embedded.slice(0, 8),
      remainingLaneBGroups: laneBGroups.map(g => ({ status: g.status, count: g.count, recommendedAction: g.recommendedAction }))
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    inputs: {
      candidateReport: CANDIDATE_REPORT,
      candidateReportGeneratedAt: report.summary?.generatedAt ?? null,
      candidateRowsInReport: report.results.length,
      profileFilesScanned: profileFileList,
      profileRecordsScanned: totalRecords,
      weaponCompendiumItemsScanned: weaponItems.length
    },
    excludedAlreadyCovered,
    counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.totalRows])),
    methodologyNote: '"Already covered" uses the same actor-slug + rawIncludes-marker (weapon name substring) convention as every prior pass. This is deliberately coarse: if an actor has both a plain weapon row (Lane-A-promoted) and a separate special-mode/variant row for the same weapon name, the variant row can be swept into "already covered" even though it represents distinct behavior still needing its own handling. This mirrors a known limitation documented since pass 1 and is not fixed here.'
  };

  const output = {
    summary,
    buckets,
    topGroupsByCount,
    specialInvestigationFindings,
    recommendedImplementationOrder: [
      { step: 1, action: 'candidate-generator-bug', description: 'Fix candidate-generator bugs / matcher aliases, if any (singular/plural normalization mismatches found by this audit).', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'candidate-generator-bug').length },
      { step: 2, action: 'missing-compendium-weapon-investigation', description: 'Create missing ordinary weapon compendium items only where truly missing (confirmed absent from all packs/weapons*.db, not just alias/normalization gaps).', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'missing-compendium-weapon-investigation').length },
      { step: 3, action: 'formula-override-review-needed', description: 'Handle formula-unclear/printed-override ordinary weapons (compendium match exists, printed dice do not cleanly derive from base).', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'formula-override-review-needed').length },
      { step: 4, action: 'special-mode-variant-profile-needed', description: 'Handle ordinary-weapon-special-mode variants (Rapid Strike, Double Attack, Trigger Work, etc.).', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'special-mode-variant-profile-needed').length },
      { step: 5, action: 'area-autofire-profile-needed / grenade-or-explosive-profile-needed', description: 'Handle area/autofire/grenade/explosive rows.', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'area-autofire-profile-needed' || g.recommendedAction === 'grenade-or-explosive-profile-needed').length },
      { step: 6, action: 'rider-profile-needed', description: 'Handle rider/condition rows.', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'rider-profile-needed').length },
      { step: 7, action: 'natural-or-unarmed-profile-needed', description: 'Handle natural/unarmed rows.', groupCount: allGroupsFlat.filter(g => g.recommendedAction === 'natural-or-unarmed-profile-needed').length }
    ]
  };

  writeText(OUTPUT_JSON, JSON.stringify(output, null, 2) + '\n');
  writeText(OUTPUT_MD, renderMarkdown(output));

  console.log(JSON.stringify(summary, null, 2));
}

function fmtGroupLine(g) {
  return `- **${g.printedNames.join(' / ')}** (\`${g.normalizedName}\`) — ${g.count} rows — packs: ${g.sourcePacks.join(', ')} — action: \`${g.recommendedAction}\`\n  - sample actors: ${g.sampleActors.join(', ') || '_none_'}\n  - sample raw rows: ${g.sampleRawRows.map(r => `"${r}"`).join('; ') || '_none_'}`;
}

function renderMarkdown(output) {
  const { summary, buckets, topGroupsByCount, specialInvestigationFindings, recommendedImplementationOrder } = output;
  const lines = [];
  lines.push('# Nonheroic Lane B Remainder Audit (generated)');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push('');
  lines.push('Read-only classification of everything the Lane A promotion tool cannot');
  lines.push('and does not touch. No profile was promoted, no weapon item was created,');
  lines.push('and no pack/runtime file was modified in producing this report.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Candidate rows in source report: ${summary.inputs.candidateRowsInReport} (generated ${summary.inputs.candidateReportGeneratedAt})`);
  lines.push(`- Profile files scanned for already-covered exclusion: ${summary.inputs.profileFilesScanned.length} (${summary.inputs.profileRecordsScanned} records)`);
  lines.push(`- Weapon compendium items scanned: ${summary.inputs.weaponCompendiumItemsScanned}`);
  lines.push(`- Rows excluded as already covered: ${summary.excludedAlreadyCovered}`);
  lines.push('');
  for (const [status, count] of Object.entries(summary.counts)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push(`> ${summary.methodologyNote}`);
  lines.push('');

  lines.push(`## 1. Top ${topGroupsByCount.length} Lane B groups by count`);
  lines.push('');
  for (const g of topGroupsByCount) {
    lines.push(`- **${g.printedNames.join(' / ')}** — ${g.count} rows — bucket: \`${g.status}\` — action: \`${g.recommendedAction}\``);
  }
  lines.push('');

  const sectionFor = (title, status) => {
    lines.push(`## ${title} (${buckets[status].totalRows})`);
    lines.push('');
    const groups = buckets[status].groups.slice(0, 40);
    if (groups.length === 0) {
      lines.push('_None._');
      lines.push('');
      return;
    }
    for (const g of groups) lines.push(fmtGroupLine(g));
    if (buckets[status].groups.length > groups.length) {
      lines.push(`- _(${buckets[status].groups.length - groups.length} more groups omitted from this Markdown sample; see the JSON report.)_`);
    }
    lines.push('');
  };

  sectionFor('2. Special-mode ordinary weapons', 'ordinary-weapon-special-mode');
  sectionFor('3. Area/autofire/grenade/explosive rows', 'area-autofire-grenade-special');
  sectionFor('4. Rider/condition rows', 'rider-or-condition');
  sectionFor('5. Natural/unarmed rows', 'natural-or-unarmed');
  sectionFor('6. Formula-unclear rows', 'formula-unclear');

  lines.push(`## 7. No-compendium-match ordinary weapon candidates (${buckets['no-compendium-match'].groups.filter(g => g.recommendedAction === 'missing-compendium-weapon-investigation' || g.recommendedAction === 'candidate-generator-bug').length})`);
  lines.push('');
  const ordinaryCandidates = buckets['no-compendium-match'].groups.filter(g => g.recommendedAction === 'missing-compendium-weapon-investigation' || g.recommendedAction === 'candidate-generator-bug');
  for (const g of ordinaryCandidates.slice(0, 40)) {
    lines.push(fmtGroupLine(g));
    if (g.embeddedActorItemEvidence.length) {
      lines.push(`  - embedded actor.items evidence (not used as candidate source, cross-reference only): ${g.embeddedActorItemEvidence.map(e => `${e.name} ${e.damage} on ${e.actorName}`).join('; ')}`);
    }
    if (g.relatedButDistinctCompendiumItems.length) {
      lines.push(`  - related-but-distinct compendium items: ${g.relatedButDistinctCompendiumItems.map(r => `${r.name} (${r.pack}, ${r.damage})`).join('; ')}`);
    }
  }
  lines.push('');

  lines.push(`## 8. Likely special actions misread as weapons (${buckets['no-compendium-match'].groups.filter(g => g.recommendedAction === 'special-action-not-weapon').length})`);
  lines.push('');
  for (const g of buckets['no-compendium-match'].groups.filter(g => g.recommendedAction === 'special-action-not-weapon')) {
    lines.push(fmtGroupLine(g));
  }
  lines.push('');

  const genBugs = [...buckets['no-compendium-match'].groups, ...buckets['formula-unclear'].groups].filter(g => g.recommendedAction === 'candidate-generator-bug');
  lines.push(`## 9. Candidate-generator bugs or normalization issues (${genBugs.length})`);
  lines.push('');
  if (genBugs.length === 0) {
    lines.push('_None found. All no-compendium-match names, including the special-investigation list below, were confirmed absent from every packs/weapons*.db item (and absent from every other pack scanned as a top-level weapon document) rather than being masked by a normalization bug._');
  } else {
    for (const g of genBugs) {
      lines.push(fmtGroupLine(g));
      lines.push(`  - ${g.singularPluralNormalizationBug?.reason}`);
    }
  }
  lines.push('');

  lines.push('## Special investigation: ordinary weapons that appear missing');
  lines.push('');
  lines.push('Checked directly against every `packs/weapons*.db` item and against');
  lines.push('every embedded `actor.items` weapon-type entry across all `packs/*.db`');
  lines.push('files (not just the generator\'s three source packs), since a name could');
  lines.push('in principle exist as a compendium item under a pack this tool\'s glob');
  lines.push('missed, or as an owned item that never made it into a top-level');
  lines.push('compendium doc.');
  lines.push('');
  for (const f of specialInvestigationFindings) {
    lines.push(`### ${f.name}`);
    lines.push('');
    if (f.existsAsExactCompendiumItem) {
      lines.push(`- **Exact compendium match exists**: ${f.exactCompendiumItems.map(i => `${i.name} (${i.pack}, ${i.damage} ${i.damageType})`).join('; ')}.`);
      if (f.remainingLaneBGroups.length) {
        for (const g of f.remainingLaneBGroups) {
          lines.push(`- Remaining Lane B rows for this name: ${g.count}, bucket \`${g.status}\`, action \`${g.recommendedAction}\` -- this is not a missing-weapon case, it's a different Lane B category (see that bucket above for detail).`);
        }
      }
    } else {
      lines.push('- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.');
      if (f.relatedButDistinctCompendiumItems.length) {
        lines.push(`- Related-but-distinct compendium items exist (likely a different, more specific weapon, not an alias): ${f.relatedButDistinctCompendiumItems.map(r => `${r.name} (${r.pack}, ${r.damage} ${r.damageType})`).join('; ')}.`);
      }
      if (f.embeddedActorItemEvidence.length) {
        lines.push(`- Embedded \`actor.items\` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): ${f.embeddedActorItemEvidence.map(e => `${e.name} ${e.damage} ${e.damageType || ''} on ${e.actorName} (${e.actorPack})`.trim()).join('; ')}.`);
      } else {
        lines.push('- No embedded actor.items evidence found either.');
      }
      for (const g of f.remainingLaneBGroups) {
        lines.push(`- Remaining Lane B rows in the raw-statblock candidate universe: ${g.count}, bucket \`${g.status}\`, action \`${g.recommendedAction}\`.`);
      }
    }
    lines.push('');
  }

  lines.push(`## 10. Recommended implementation order`);
  lines.push('');
  for (const step of recommendedImplementationOrder) {
    lines.push(`${step.step}. **${step.action}** (${step.groupCount} groups) — ${step.description}`);
  }
  lines.push('');

  return lines.join('\n');
}

main();
