#!/usr/bin/env node
// Math Integrity Freeze, Attack Bonus round 8 (Part 11): programmatic
// classification of every ATTACK_OPTION rule shipped in packs/feats.db and
// packs/talents.db. This is an inventory/audit report, not a certification
// that every listed mechanic is fully wired end-to-end -- see the
// "classification meaning" section below and the round 8 ledger entry for
// what each bucket does and does not claim.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The context fields the live attack dialog (scripts/rolls/roll-config.js
// buildRollConfigModel()/rebuildAttackOptionsPanel()) actually ever supplies
// to CombatOptionResolver today: attackType (auto-derived), aim/charge/
// autofire (player toggles), combatOptions/attackOptions (submitted values).
// A gate keyed on anything else can never resolve to "available" from THIS
// dialog, however correctly CombatOptionResolver's own optionAllowedForWeapon()
// implements it for a caller that does supply it (e.g. a future maneuver- or
// target-aware invocation, or the reaction/opportunity-attack system).
const UNSUPPLIED_GATE_KEYS = [
  'requiresManeuver', 'requiresTargetType', 'requiresTargetFeat',
  'requiresTargetTalent', 'requiresTargetItem', 'requiresTargetText',
  'requiresTargetFlatFooted', 'requiresTargetDeniedDexBonus',
  'requiresOpportunityAttack', 'requiresAreaAttack', 'requiresOption'
];

function loadDb(relPath) {
  const raw = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
  return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function extractAttackOptionRules(record) {
  const rules = record?.system?.abilityMeta?.rules;
  if (!Array.isArray(rules)) return [];
  return rules.filter(r => String(r?.type ?? '').toUpperCase() === 'ATTACK_OPTION');
}

// Mirrors CombatOptionResolver's own id derivation exactly (hydrateOption():
// camelize(raw.option ?? raw.id ?? raw.key ?? raw.name)) -- most shipped
// records key their id under "id", not "option".
function classify(rule) {
  const control = String(rule.control ?? '').toLowerCase();
  const rawId = rule.option ?? rule.id ?? rule.key ?? rule.name;
  const hasOptionId = typeof rawId === 'string' && rawId.trim().length > 0;
  const unsuppliedGates = UNSUPPLIED_GATE_KEYS.filter(k => rule[k] !== undefined);
  const isToggleable = ['toggle', 'flag'].includes(control);
  const isContextGated = rule.requiresAim === true || rule.requiresCharge === true || rule.requiresAutofire === true;

  if (!hasOptionId || !['toggle', 'flag', 'slider', 'passive'].includes(control)) {
    return 'NOT_IMPLEMENTED';
  }
  if (unsuppliedGates.length > 0) {
    return 'METADATA_PRESENT_RUNTIME_INCOMPLETE';
  }
  if (control === 'passive') return 'PASSIVE';
  if (control === 'slider') return 'SLIDER_VALUE';
  if (isToggleable && isContextGated) return 'CONTEXT_GATED_SELECTABLE';
  if (isToggleable) return 'SELECTABLE';
  return 'NOT_IMPLEMENTED';
}

function scanPack(relPath, itemType) {
  const records = loadDb(relPath);
  const out = [];
  for (const record of records) {
    for (const rule of extractAttackOptionRules(record)) {
      out.push({
        source: relPath,
        itemType,
        itemName: record.name,
        option: rule.option ?? rule.id ?? rule.key ?? rule.name ?? null,
        control: rule.control ?? null,
        classification: classify(rule),
        unsuppliedGates: UNSUPPLIED_GATE_KEYS.filter(k => rule[k] !== undefined)
      });
    }
  }
  return out;
}

const CLASS_ORDER = ['SELECTABLE', 'PASSIVE', 'CONTEXT_GATED_SELECTABLE', 'SLIDER_VALUE', 'METADATA_PRESENT_RUNTIME_INCOMPLETE', 'NOT_IMPLEMENTED'];
const CLASS_LABEL = {
  SELECTABLE: 'SELECTABLE (renders as a toggle/flag checkbox in the current attack dialog, no unmet context dependency)',
  PASSIVE: 'PASSIVE (a real, always-active modifier surfaced by CombatOptionResolver -- not a player checkbox)',
  CONTEXT_GATED_SELECTABLE: 'CONTEXT-GATED SELECTABLE (a toggle/flag gated on Aim/Charge/Autofire -- the dialog CAN satisfy this gate; renders disabled-with-reason until it is)',
  SLIDER_VALUE: 'SLIDER/VALUE (a numeric slider control, e.g. Power Attack)',
  METADATA_PRESENT_RUNTIME_INCOMPLETE: 'METADATA PRESENT BUT RUNTIME INCOMPLETE (a real ATTACK_OPTION record with a gate -- maneuver, target state, opportunity-attack, area-attack, or another option -- that the CURRENT attack dialog never supplies; CombatOptionResolver\'s gate logic is correct, but no invocation of THIS dialog can ever satisfy it today)',
  NOT_IMPLEMENTED: 'NOT IMPLEMENTED (no usable option id, or a control type optionCard()/hydrateOption() does not know how to render)'
};

function run() {
  const feats = scanPack('packs/feats.db', 'feat');
  const talents = scanPack('packs/talents.db', 'talent');
  const all = [...feats, ...talents];

  const byClass = {};
  for (const cls of CLASS_ORDER) byClass[cls] = [];
  for (const rec of all) byClass[rec.classification].push(rec);

  const generated = new Date().toISOString();
  const lines = [];
  lines.push('# Attack Option Coverage Report');
  lines.push('');
  lines.push(`Generated: ${generated}`);
  lines.push('');
  lines.push('Scope: every `type: "ATTACK_OPTION"` rule in `system.abilityMeta.rules` across `packs/feats.db` and `packs/talents.db`, classified against how `scripts/engine/combat/combat-option-resolver.js` and the live attack dialog (`scripts/rolls/roll-config.js`) actually consume it today.');
  lines.push('');
  lines.push('This is an inventory audit, not a certification that every listed mechanic is fully wired end-to-end for every downstream consumer (chat cards, damage packets, AI, etc.) -- see Math Integrity Freeze, Attack Bonus round 8 in the ledger for what this round did and did not certify.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total ATTACK_OPTION records: ${all.length} (feats: ${feats.length}, talents: ${talents.length})`);
  for (const cls of CLASS_ORDER) {
    lines.push(`- ${CLASS_LABEL[cls]}: ${byClass[cls].length}`);
  }
  lines.push('');
  for (const cls of CLASS_ORDER) {
    if (!byClass[cls].length) continue;
    lines.push(`## ${cls} (${byClass[cls].length})`);
    lines.push('');
    for (const rec of byClass[cls]) {
      const gateNote = rec.unsuppliedGates.length ? ` -- unsupplied gate(s): ${rec.unsuppliedGates.join(', ')}` : '';
      lines.push(`- [${rec.itemType}] ${rec.itemName} (\`${rec.option}\`, control: ${rec.control})${gateNote}`);
    }
    lines.push('');
  }

  const outDir = path.join(REPO_ROOT, 'docs/audits/generated');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'attack-option-coverage-report.md'), lines.join('\n') + '\n');
  fs.writeFileSync(
    path.join(outDir, 'attack-option-coverage-report.json'),
    JSON.stringify({ generated, total: all.length, feats: feats.length, talents: talents.length, byClass: Object.fromEntries(CLASS_ORDER.map(c => [c, byClass[c].length])), records: all }, null, 2) + '\n'
  );

  console.log(`Attack option coverage report written: ${all.length} records (feats: ${feats.length}, talents: ${talents.length})`);
  for (const cls of CLASS_ORDER) {
    console.log(`  ${cls}: ${byClass[cls].length}`);
  }
}

run();
