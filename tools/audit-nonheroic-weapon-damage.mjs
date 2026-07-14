#!/usr/bin/env node
/**
 * NH-0 nonheroic weapon damage audit.
 *
 * Audit-only. This script reads nonheroic/beast/droid NPC source data and actor
 * packs, inventories weapon-like statblock entries, and classifies the damage
 * fields that must be source-verified before later correction phases.
 *
 * It intentionally does not mutate packs or data files.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_JSON = 'docs/audits/generated/nonheroic-weapon-damage-audit.json';
const OUTPUT_MD = 'docs/audits/generated/nonheroic-weapon-damage-audit.md';

const ACTOR_PACKS = [
  'packs/nonheroic.db',
  'packs/droids.db',
  'packs/beasts.db',
  'packs/npc.db'
];

const JSON_SOURCES = [
  { path: 'data/nonheroic/nonheroic_templates.json', kind: 'nonheroic-statblock-json' },
  { path: 'data/nonheroic-templates.json', kind: 'starter-template-json' }
];

const SOURCEBOOK_ORDER = [
  'Saga Edition Core Rulebook',
  'Threats of the Galaxy',
  'Scum and Villainy',
  'Galaxy of Intrigue',
  'Galaxy at War',
  'Clone Wars Campaign Guide',
  'Force Unleashed Campaign Guide',
  'Knights of the Old Republic Campaign Guide',
  'Jedi Academy Training Manual',
  'Scavenger\'s Guide to Droids',
  'The Unknown Regions',
  'Starships of the Galaxy',
  'Web Enhancements',
  'Unknown / missing source'
];

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function parseJsonFile(relPath) {
  return JSON.parse(readText(relPath));
}

function parseJsonLines(relPath) {
  if (!exists(relPath)) return [];
  return readText(relPath)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return { __parseError: err.message, __line: index + 1, __raw: line };
      }
    });
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function splitSourceList(value) {
  const text = clean(value);
  if (!text) return [];
  const out = [];
  let current = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if ((char === ';' || char === ',') && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function extractReferenceBook(value = '') {
  const text = String(value ?? '');
  const match = text.match(/Reference Book:\s*([^\n\r]+)/i);
  if (!match) return 'Unknown / missing source';
  return clean(match[1]).replace(/^Star Wars Saga Edition\s+/i, '') || 'Unknown / missing source';
}

function normalizeBook(book) {
  const value = clean(book);
  if (!value) return 'Unknown / missing source';
  if (/core rulebook/i.test(value)) return 'Saga Edition Core Rulebook';
  if (/threats of the galaxy/i.test(value)) return 'Threats of the Galaxy';
  if (/scum and villainy/i.test(value)) return 'Scum and Villainy';
  if (/galaxy of intrigue/i.test(value)) return 'Galaxy of Intrigue';
  if (/galaxy at war/i.test(value)) return 'Galaxy at War';
  if (/clone wars/i.test(value)) return 'Clone Wars Campaign Guide';
  if (/force unleashed/i.test(value)) return 'Force Unleashed Campaign Guide';
  if (/old republic/i.test(value)) return 'Knights of the Old Republic Campaign Guide';
  if (/jedi academy/i.test(value)) return 'Jedi Academy Training Manual';
  if (/scavenger/i.test(value) && /droid/i.test(value)) return 'Scavenger\'s Guide to Droids';
  if (/unknown regions/i.test(value)) return 'The Unknown Regions';
  if (/starships of the galaxy/i.test(value)) return 'Starships of the Galaxy';
  if (/web enhancement|preview/i.test(value)) return 'Web Enhancements';
  return value;
}

function extractDamageText(entry) {
  const parens = [...String(entry ?? '').matchAll(/\(([^)]*)\)/g)].map(match => clean(match[1]));
  return parens.find(text => /\d+d\d+|\b\d+\b/i.test(text) && !/^flat-footed/i.test(text)) ?? '';
}

function inferDamageType(entry = '') {
  const text = slugify(entry);
  const types = [];
  if (/lightsaber|lightfoil/.test(text)) types.push('energy');
  if (/blaster|laser|plasma|flame|fire|electro|shock|arc-welder|welder|torch/.test(text)) types.push('energy');
  if (/ion/.test(text)) types.push('ion');
  if (/stun/.test(text)) types.push('stun');
  if (/slugthrower|projectile|bow|rifle-butt|pistol-whip/.test(text)) types.push('kinetic');
  if (/club|staff|baton|slam|tail-slam|punch|unarmed|hammer|mace/.test(text)) types.push('bludgeoning');
  if (/claw|saw|blade|knife|sword|vibro|axe/.test(text)) types.push('slashing');
  if (/bite|sting|spear|pike|probe|horn|gore/.test(text)) types.push('piercing');
  return [...new Set(types)];
}

function classifyWeapon(entry, source = {}) {
  const raw = clean(entry);
  const damageText = extractDamageText(raw);
  const inferredTypes = inferDamageType(raw);
  const flags = [];

  if (!damageText) flags.push('missing-damage-formula');
  if (damageText && /by weapon/i.test(damageText)) flags.push('by-weapon-placeholder');
  if (damageText && /special/i.test(damageText)) flags.push('special-damage');
  if (damageText && /\+\s*Str|\+\s*Dex|\+\s*Con/i.test(damageText)) flags.push('symbolic-ability-token');
  if (damageText && !/\d+d\d+|\b\d+\b/i.test(damageText)) flags.push('non-roll-damage-text');
  if (inferredTypes.length === 0) flags.push('missing-damage-type');
  if (inferredTypes.length > 1) flags.push('multi-type-or-mode-review');
  if (/autofire/i.test(raw)) flags.push('autofire-review');
  if (/grenade|explosive|blast|burst|area|cone|line/i.test(raw)) flags.push('area-or-explosive-review');
  if (/poison|disease|condition track|moves? -\d steps?/i.test(raw)) flags.push('rider-review');
  if (/\*/.test(raw)) flags.push('footnote-modifier-review');

  const severity = flags.includes('missing-damage-formula') || flags.includes('missing-damage-type')
    ? 'needs-correction'
    : flags.some(flag => flag.endsWith('-review') || flag === 'symbolic-ability-token' || flag === 'multi-type-or-mode-review')
      ? 'needs-review'
      : 'candidate-verified';

  return {
    actor: source.actor,
    actorSlug: slugify(source.actor),
    sourcePath: source.sourcePath,
    sourceKind: source.sourceKind,
    sourceBook: source.sourceBook,
    attackKind: source.attackKind,
    raw,
    damageText,
    inferredDamageTypes: inferredTypes,
    flags,
    severity
  };
}

function collectFromStatblock(statblock, source) {
  const weapons = [];
  const actor = clean(statblock.name ?? statblock.Name ?? source.actor ?? 'Unknown');
  const sourceBook = normalizeBook(source.sourceBook ?? extractReferenceBook(statblock.notes ?? statblock.Notes ?? statblock.description ?? ''));

  for (const [field, attackKind] of [['Melee Weapons', 'melee'], ['Ranged Weapons', 'ranged']]) {
    for (const entry of splitSourceList(statblock[field])) {
      weapons.push(classifyWeapon(entry, { ...source, actor, sourceBook, attackKind }));
    }
  }

  for (const [field, attackKind] of [['Melee', 'melee'], ['Ranged', 'ranged']]) {
    for (const entry of splitSourceList(statblock[field])) {
      weapons.push(classifyWeapon(entry, { ...source, actor, sourceBook, attackKind }));
    }
  }

  const possessions = clean(statblock.possessions ?? statblock.Possessions ?? '');
  if (possessions && !weapons.length) {
    for (const entry of splitSourceList(possessions)) {
      if (/blaster|pistol|rifle|carbine|club|baton|grenade|lightsaber|knife|vibro|claw|bite|slam|saw|torch|welder|probe|weapon/i.test(entry)) {
        weapons.push(classifyWeapon(entry, { ...source, actor, sourceBook, attackKind: 'possession-only' }));
      }
    }
  }

  return weapons;
}

function collectStarterTemplates() {
  const records = [];
  if (!exists('data/nonheroic-templates.json')) return records;
  const data = parseJsonFile('data/nonheroic-templates.json');
  for (const template of asArray(data.templates)) {
    const actor = clean(template.name ?? template.id ?? 'Unknown starter template');
    for (const weapon of asArray(template.beastData?.naturalWeapons)) {
      const raw = `${weapon.name ?? 'Natural Weapon'} (${weapon.damage ?? ''})`;
      const row = classifyWeapon(raw, {
        actor,
        sourcePath: 'data/nonheroic-templates.json',
        sourceKind: 'starter-template-json',
        sourceBook: template.isBeast ? 'The Unknown Regions / Saga Edition Core Rulebook natural weapon rules' : 'Unknown / missing source',
        attackKind: 'natural'
      });
      if (weapon.type && !row.inferredDamageTypes.includes(weapon.type)) row.inferredDamageTypes.push(weapon.type);
      row.explicitTemplateType = weapon.type ?? null;
      row.critical = weapon.critical ?? null;
      records.push(row);
    }
    if (!template.beastData?.naturalWeapons?.length && template.isNonheroic === true) {
      records.push({
        actor,
        actorSlug: slugify(actor),
        sourcePath: 'data/nonheroic-templates.json',
        sourceKind: 'starter-template-json',
        sourceBook: 'Unknown / missing source',
        attackKind: 'template-equipment',
        raw: '',
        damageText: '',
        inferredDamageTypes: [],
        flags: ['no-weapon-data-on-template'],
        severity: 'informational'
      });
    }
  }
  return records;
}

function collectJsonStatblocks() {
  const records = [];
  for (const source of JSON_SOURCES) {
    if (!exists(source.path) || source.path === 'data/nonheroic-templates.json') continue;
    const data = parseJsonFile(source.path);
    for (const statblock of asArray(data)) {
      records.push(...collectFromStatblock(statblock, {
        sourcePath: source.path,
        sourceKind: source.kind,
        actor: statblock.name
      }));
    }
  }
  return records;
}

function actorSourceKind(actor, packPath) {
  const profileKind = actor.system?.npcProfile?.kind ?? actor.system?.npcType ?? actor.flags?.swse?.import?.templateType ?? actor.flags?.['foundryvtt-swse']?.templateType;
  if (profileKind) return String(profileKind);
  if (/beasts\.db$/.test(packPath)) return 'beast-pack';
  if (/droids\.db$/.test(packPath)) return 'droid-pack';
  if (/nonheroic\.db$/.test(packPath)) return 'nonheroic-pack';
  return 'npc-pack';
}

function collectActorPacks() {
  const records = [];
  for (const packPath of ACTOR_PACKS) {
    for (const actor of parseJsonLines(packPath)) {
      if (actor.__parseError) {
        records.push({
          actor: `Parse error line ${actor.__line}`,
          actorSlug: `parse-error-${actor.__line}`,
          sourcePath: packPath,
          sourceKind: 'parse-error',
          sourceBook: 'Unknown / missing source',
          attackKind: 'parse-error',
          raw: actor.__raw,
          damageText: '',
          inferredDamageTypes: [],
          flags: ['pack-json-parse-error'],
          severity: 'needs-correction'
        });
        continue;
      }

      const sourceKind = actorSourceKind(actor, packPath);
      const rawStatblock = actor.flags?.swse?.import?.raw ?? actor.flags?.['foundryvtt-swse']?.originalStatblock ?? null;
      if (rawStatblock && typeof rawStatblock === 'object') {
        records.push(...collectFromStatblock(rawStatblock, {
          sourcePath: packPath,
          sourceKind,
          actor: actor.name
        }));
      }

      for (const item of asArray(actor.items)) {
        if (item?.type !== 'weapon') continue;
        const system = item.system ?? {};
        const raw = clean(item.flags?.swse?.import?.raw ?? system.description ?? item.name);
        const row = classifyWeapon(raw || item.name, {
          sourcePath: packPath,
          sourceKind,
          actor: actor.name,
          sourceBook: normalizeBook(actor.system?.source?.book ?? actor.flags?.swse?.sourceBook ?? extractReferenceBook(JSON.stringify(rawStatblock ?? {}))),
          attackKind: system.weaponType ?? system.category ?? 'embedded-weapon'
        });
        row.embeddedItemName = item.name;
        row.systemDamage = system.damage ?? system.damageFormula ?? system.damage?.formula ?? null;
        row.systemDamageType = system.damageType ?? system.damage?.type ?? null;
        if (!row.systemDamage) row.flags.push('embedded-weapon-missing-system-damage');
        if (!row.systemDamageType) row.flags.push('embedded-weapon-missing-system-damage-type');
        row.severity = row.flags.includes('embedded-weapon-missing-system-damage') || row.flags.includes('embedded-weapon-missing-system-damage-type')
          ? 'needs-correction'
          : row.severity;
        records.push(row);
      }
    }
  }
  return records;
}

function summarize(records) {
  const by = (selector) => records.reduce((acc, row) => {
    const key = selector(row) || 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const flagCounts = {};
  for (const row of records) {
    for (const flag of row.flags ?? []) flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
  }

  const sourceBookCounts = by(row => row.sourceBook);
  const sortedBooks = Object.fromEntries(Object.entries(sourceBookCounts).sort((a, b) => {
    const ai = SOURCEBOOK_ORDER.indexOf(a[0]);
    const bi = SOURCEBOOK_ORDER.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a[0].localeCompare(b[0]);
  }));

  return {
    totalWeaponRows: records.length,
    bySeverity: by(row => row.severity),
    bySourceKind: by(row => row.sourceKind),
    bySourceBook: sortedBooks,
    byAttackKind: by(row => row.attackKind),
    flagCounts: Object.fromEntries(Object.entries(flagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  };
}

function mdTable(rows, columns) {
  if (!rows.length) return '_None._';
  const header = `|${columns.map(c => c.label).join('|')}|`;
  const sep = `|${columns.map(() => '---').join('|')}|`;
  const body = rows.map(row => `|${columns.map(c => clean(c.value(row)).replace(/\|/g, '\\|')).join('|')}|`);
  return [header, sep, ...body].join('\n');
}

function writeOutputs(records) {
  const summary = summarize(records);
  fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT_JSON)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUTPUT_JSON), JSON.stringify({ generatedAt: new Date().toISOString(), summary, records }, null, 2));

  const topProblems = records
    .filter(row => row.severity !== 'candidate-verified')
    .slice(0, 60);

  const md = `# NH-0 Nonheroic Weapon Damage Audit\n\nGenerated by \`node tools/audit-nonheroic-weapon-damage.mjs\`.\n\nThis is an audit-only report. It inventories nonheroic, droid, beast, and generic NPC weapon-like entries so later phases can correct damage formulas and damage types with sourcebook authority.\n\n## Summary\n\n- Total weapon-like rows: **${summary.totalWeaponRows}**\n- Needs correction: **${summary.bySeverity['needs-correction'] ?? 0}**\n- Needs review: **${summary.bySeverity['needs-review'] ?? 0}**\n- Candidate verified: **${summary.bySeverity['candidate-verified'] ?? 0}**\n- Informational/template-only: **${summary.bySeverity['informational'] ?? 0}**\n\n## By source kind\n\n${mdTable(Object.entries(summary.bySourceKind).map(([k, v]) => ({ k, v })), [\n  { label: 'Source kind', value: r => r.k },\n  { label: 'Rows', value: r => r.v }\n])}\n\n## By source book\n\n${mdTable(Object.entries(summary.bySourceBook).map(([k, v]) => ({ k, v })), [\n  { label: 'Source book', value: r => r.k },\n  { label: 'Rows', value: r => r.v }\n])}\n\n## Flag counts\n\n${mdTable(Object.entries(summary.flagCounts).map(([k, v]) => ({ k, v })), [\n  { label: 'Flag', value: r => r.k },\n  { label: 'Rows', value: r => r.v }\n])}\n\n## First rows needing correction/review\n\n${mdTable(topProblems, [\n  { label: 'Actor', value: r => r.actor },\n  { label: 'Book', value: r => r.sourceBook },\n  { label: 'Attack', value: r => r.attackKind },\n  { label: 'Raw', value: r => r.raw || '(none)' },\n  { label: 'Damage', value: r => r.damageText || '(missing)' },\n  { label: 'Inferred type(s)', value: r => (r.inferredDamageTypes ?? []).join(', ') || '(missing)' },\n  { label: 'Flags', value: r => (r.flags ?? []).join(', ') }\n])}\n\n## Recommended next batches\n\n1. Scum and Villainy / droid-heavy nonheroics.\n2. Galaxy of Intrigue nonheroics.\n3. Threats of the Galaxy nonheroics and droids.\n4. The Unknown Regions beasts and mounts.\n5. Remaining web/homebrew/unknown-source rows, which should stay manual until source authority is recovered.\n`;
  fs.writeFileSync(path.join(ROOT, OUTPUT_MD), md);
  return { summary, outputJson: OUTPUT_JSON, outputMd: OUTPUT_MD };
}

const records = [
  ...collectJsonStatblocks(),
  ...collectStarterTemplates(),
  ...collectActorPacks()
];

const result = writeOutputs(records);
console.log(JSON.stringify(result, null, 2));
