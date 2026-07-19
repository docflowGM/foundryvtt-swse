#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK_PATH = path.join(ROOT, 'packs', 'forcepowers.db');
const TEMPLATE_PATH = path.join(ROOT, 'template.json');
const REPORT_JSON = path.join(ROOT, 'docs', 'audits', 'generated', 'force-power-resolution-schema-audit.json');
const REPORT_MD = path.join(ROOT, 'docs', 'audits', 'generated', 'force-power-resolution-schema-audit.md');
const WRITE = process.argv.includes('--write');

const EXPLICIT_TYPES = [
  ['electricity', /\b(?:lightning|electric(?:al|ity)?)\b/i],
  ['ion', /\bion(?:ize|ized|ization)?\b/i],
  ['fire', /\b(?:fire|flame|burn(?:ing)?)\b/i],
  ['cold', /\b(?:cold|freeze|freezing|cryokinesis)\b/i],
  ['sonic', /\b(?:sonic|sound)\b/i],
  ['acid', /\bacid\b/i],
  ['kinetic', /\b(?:kinetic|telekinetic impact|slam(?:med)?|hurled object|crush(?:ing)?)\b/i]
];

const DAMAGE_PROFILE_TYPE = new Map([
  ['force lightning', 'electricity'],
  ['lightning burst', 'electricity'],
  ['combustion', 'fire'],
  ['convection', 'fire'],
  ['ionize', 'ion'],
  ['force slam', 'kinetic'],
  ['ballistakinesis', 'kinetic']
]);

const NON_HP_NAMES = new Set(['force thrust', 'force stun', 'negate energy', 'energy resistance', 'force shield']);

function text(value) {
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(text).join(' ');
  return String(value ?? '');
}

function clean(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function diceFrom(value) {
  const match = clean(value).match(/\b\d+d\d+(?:\s*(?:\+|-)\s*(?:\d+d\d+|\d+))*(?:\s*[x×*]\s*\d+)?\b/i);
  return match ? match[0].replace(/\s+/g, '').replace(/×/g, 'x') : null;
}

function inferType(doc, haystack) {
  const named = DAMAGE_PROFILE_TYPE.get(clean(doc.name).toLowerCase());
  if (named) return { type: named, confidence: 'curated-profile' };
  for (const [type, pattern] of EXPLICIT_TYPES) {
    if (pattern.test(haystack)) return { type, confidence: 'explicit-text' };
  }
  return { type: null, confidence: 'manualRequired' };
}

function classifyModifier(haystack) {
  const modifiers = [];
  const patterns = [
    ['attack', 'all', /\b(?:bonus|penalty)\s+(?:on|to)\s+(?:all\s+)?attack rolls?\b/i],
    ['damage', 'all', /\b(?:bonus|penalty)\s+(?:on|to)\s+(?:all\s+)?damage rolls?\b/i],
    ['skill', 'useTheForce', /\b(?:bonus|penalty)\s+(?:on|to)\s+use the force checks?\b/i],
    ['skill', 'stealth', /\b(?:bonus|penalty)\s+(?:on|to)\s+stealth checks?\b/i],
    ['skill', 'perception', /\b(?:bonus|penalty)\s+(?:on|to)\s+perception checks?\b/i],
    ['defense', 'reflex', /\b(?:bonus|penalty)\s+(?:to|on)\s+reflex defense\b/i],
    ['defense', 'fortitude', /\b(?:bonus|penalty)\s+(?:to|on)\s+fortitude defense\b/i],
    ['defense', 'will', /\b(?:bonus|penalty)\s+(?:to|on)\s+will defense\b/i]
  ];
  for (const [category, target, pattern] of patterns) {
    if (pattern.test(haystack)) modifiers.push({ category, target, source: 'explicit-text' });
  }
  return modifiers;
}

function buildResolution(doc) {
  const system = doc.system ?? {};
  const dcChart = Array.isArray(system.dcChart) ? system.dcChart : [];
  const haystack = clean([
    doc.name,
    system.damage,
    system.effect,
    system.description,
    system.special,
    system.tags,
    system.descriptor,
    system.descriptors,
    dcChart
  ].map(text).join(' '));
  const tags = Array.isArray(system.tags) ? system.tags.map(String) : [];
  const lowerName = clean(doc.name).toLowerCase();
  const healing = tags.includes('healing') || /\bheal(?:ing|s|ed)?\b/i.test(haystack);
  const explicitDamageTag = tags.includes('damage');
  const systemDamageDice = diceFrom(system.damage);
  const damageTiers = dcChart
    .map(row => ({ dc: Number(row?.dc ?? 0) || 0, formula: diceFrom(`${row?.effect ?? ''} ${row?.description ?? ''}`), text: clean(row?.description ?? row?.effect ?? '') }))
    .filter(row => row.formula && /\bdamage\b/i.test(row.text));
  const explicitDamageText = /\b(?:takes?|deals?|suffers?|inflicts?)\b[^.]{0,80}\bdamage\b/i.test(haystack)
    || /\b\d+d\d+[^.]{0,40}\bdamage\b/i.test(haystack);
  const nonHpBoundary = NON_HP_NAMES.has(lowerName) || /\b(?:healing|shield rating|damage reduction|resistance|temporary hit points?)\b/i.test(haystack);
  const damageEnabled = !healing && !nonHpBoundary && Boolean(explicitDamageTag || systemDamageDice || damageTiers.length || explicitDamageText);
  const modifiers = classifyModifier(haystack);
  const typeInfo = damageEnabled ? inferType(doc, haystack) : { type: null, confidence: 'not-applicable' };
  const formulas = [...new Set([systemDamageDice, ...damageTiers.map(t => t.formula)].filter(Boolean))];
  const kind = damageEnabled ? 'damage'
    : healing ? 'healing'
      : modifiers.length ? 'modifier'
        : /\b(?:shield|resistance|negate|damage reduction)\b/i.test(haystack) ? 'mitigation'
          : /\b(?:push|pull|move|telekinetic|disarm|immobil|knock prone)\b/i.test(haystack) ? 'control'
            : 'utility';

  return {
    version: 1,
    kind,
    damage: {
      enabled: damageEnabled,
      delivery: damageEnabled ? 'force-power' : null,
      attackShape: damageEnabled ? (/\b(?:burst|cone|area|adjacent targets?|all targets?)\b/i.test(haystack) ? 'area' : 'single-target') : null,
      scale: damageEnabled ? 'character' : null,
      primaryType: typeInfo.type,
      typeConfidence: typeInfo.confidence,
      formulas,
      tiers: damageTiers,
      riders: []
    },
    healing: {
      enabled: healing,
      tiers: healing ? dcChart.map(row => ({ dc: Number(row?.dc ?? 0) || 0, formula: diceFrom(`${row?.effect ?? ''} ${row?.description ?? ''}`), text: clean(row?.description ?? row?.effect ?? '') })).filter(row => row.formula) : []
    },
    modifiers,
    source: {
      authority: 'forcepower-compendium',
      migratedFrom: ['system.damage', 'system.dcChart', 'system.tags', 'system.effect', 'system.description'],
      reviewRequired: damageEnabled && (!typeInfo.type || formulas.length === 0)
    }
  };
}

function validate(doc) {
  const r = doc.system?.resolution;
  const errors = [];
  if (!r || r.version !== 1) errors.push('missing resolution v1');
  if (r?.damage?.enabled) {
    if (r.kind !== 'damage') errors.push('damage enabled but kind is not damage');
    if (r.damage.delivery !== 'force-power') errors.push('damage delivery must be force-power');
    if (!Array.isArray(r.damage.formulas) || r.damage.formulas.length === 0) errors.push('damage power has no formula');
    if (r.damage.primaryType === 'force') errors.push('invalid damage type force');
  } else if ((r?.damage?.formulas?.length ?? 0) > 0 || (r?.damage?.tiers?.length ?? 0) > 0) {
    errors.push('non-damage power carries damage formulas/tiers');
  }
  if (r?.healing?.enabled && r?.damage?.enabled) errors.push('power cannot be both healing and damage without explicit hybrid review');
  return errors;
}

function ensureTemplateSchema() {
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  const force = template?.Item?.['force-power'];
  if (!force) throw new Error('template.json force-power type missing');
  force.resolution = {
    version: 1,
    kind: 'utility',
    damage: {
      enabled: false,
      delivery: null,
      attackShape: null,
      scale: null,
      primaryType: null,
      typeConfidence: 'not-applicable',
      formulas: [],
      tiers: [],
      riders: []
    },
    healing: { enabled: false, tiers: [] },
    modifiers: [],
    source: { authority: '', migratedFrom: [], reviewRequired: false }
  };
  if (WRITE) fs.writeFileSync(TEMPLATE_PATH, `${JSON.stringify(template, null, 2)}\n`);
}

ensureTemplateSchema();
const docs = fs.readFileSync(PACK_PATH, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const counts = {};
const findings = [];
for (const doc of docs) {
  doc.system ??= {};
  doc.system.resolution = buildResolution(doc);
  counts[doc.system.resolution.kind] = (counts[doc.system.resolution.kind] ?? 0) + 1;
  const errors = validate(doc);
  if (errors.length || doc.system.resolution.source.reviewRequired) {
    findings.push({ name: doc.name, kind: doc.system.resolution.kind, errors, resolution: doc.system.resolution });
  }
}

if (WRITE) fs.writeFileSync(PACK_PATH, `${docs.map(doc => JSON.stringify(doc)).join('\n')}\n`);
fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  total: docs.length,
  counts,
  damageEnabled: docs.filter(d => d.system.resolution.damage.enabled).length,
  healingEnabled: docs.filter(d => d.system.resolution.healing.enabled).length,
  modifierPowers: docs.filter(d => d.system.resolution.modifiers.length).length,
  reviewRequired: docs.filter(d => d.system.resolution.source.reviewRequired).length,
  invalid: findings.filter(f => f.errors.length).length,
  findings
};
fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
const rows = Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([kind,count]) => `| \`${kind}\` | ${count} |`).join('\n');
const reviewRows = findings.slice(0, 100).map(f => `| ${f.name} | ${f.kind} | ${f.resolution.damage.primaryType ?? '—'} | ${f.resolution.damage.formulas.join(', ') || '—'} | ${[...f.errors, ...(f.resolution.source.reviewRequired ? ['review required'] : [])].join('; ')} |`).join('\n');
fs.writeFileSync(REPORT_MD, `# Force Power Resolution Schema Audit\n\nGenerated: ${report.generatedAt}\n\n## Summary\n\n- Total powers: **${report.total}**\n- Damage-producing powers: **${report.damageEnabled}**\n- Healing powers: **${report.healingEnabled}**\n- Powers with explicit modifier targets: **${report.modifierPowers}**\n- Manual review required: **${report.reviewRequired}**\n- Schema-invalid records: **${report.invalid}**\n\n| Resolution kind | Count |\n|---|---:|\n${rows}\n\n## Review queue\n\n| Power | Kind | Damage type | Formula(s) | Finding |\n|---|---|---|---|---|\n${reviewRows || '| — | — | — | — | None |'}\n\n## Rules enforced\n\n- Non-damaging powers keep \`damage.enabled: false\` and cannot carry damage formulas or tiers.\n- Healing is represented separately from HP damage.\n- Attack, skill, defense, and damage bonuses use \`modifiers[]\`; they are not damage packets.\n- Force powers never default to a damage type named \`force\`.\n- Damage-producing powers require printed dice evidence; unresolved damage types remain review-required instead of guessed.\n`);
console.log(JSON.stringify({ write: WRITE, ...report }, null, 2));
if (report.invalid > 0) process.exitCode = 1;
