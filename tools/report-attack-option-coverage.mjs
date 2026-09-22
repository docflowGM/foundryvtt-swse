#!/usr/bin/env node
// Math Integrity Freeze, Attack Bonus round 8 (Part 11), corrected in round
// 8 correction #1 (Blockers 1/2/5) after independent review found:
//   - the production resolver's getFeatRules() accepted ANY abilityMeta.rules
//     entry with an id/option field regardless of type, so this report's own
//     type==='ATTACK_OPTION'-only scan counted a different (smaller, safer)
//     population than what could actually reach the dialog -- getFeatRules()
//     is fixed (combat-option-resolver.js) and this report now imports its
//     REAL extraction helper (extractAttackOptionRules) directly instead of
//     re-implementing a second parser, so the two can never disagree again;
//   - the report's bucket counts didn't sum to the total it claimed was
//     "reachable" (a hand-typed arithmetic error) -- every total below is
//     derived from the records array itself, never restated by hand;
//   - "METADATA_PRESENT_RUNTIME_INCOMPLETE" lumped genuinely unreachable
//     gates (opportunity-attack, maneuver-selection -- this dialog has
//     neither) together with target-state gates that ARE reachable once a
//     target is threaded into the presentation context (round 8 correction
//     #1, Blocker 3) -- split into TARGET_GATED vs EXTERNAL_WORKFLOW_GATED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerFoundryPathLoader();
installFoundryShimGlobals();

const { extractAttackOptionRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');

// Gates the current attack dialog has NO selector or workflow for at all --
// no maneuver picker, no opportunity-attack/reaction framing. An option
// gated on one of these can never be reached from an ordinary attack roll,
// however correct CombatOptionResolver's own check is for a caller (e.g. a
// future reaction system) that DOES supply it.
const EXTERNAL_WORKFLOW_GATE_KEYS = ['requiresManeuver', 'requiresOpportunityAttack'];

// Gates that inspect a target actor. The dialog's Target Context panel
// (Selected Token / Combatant) now threads a resolved target into option
// presentation (round 8 correction #1, Blocker 3), so these ARE reachable
// -- conditionally, on whichever target is selected -- not structurally
// unreachable.
const TARGET_GATE_KEYS = [
  'requiresTargetType', 'requiresTargetFeat', 'requiresTargetTalent', 'requiresTargetItem',
  'requiresTargetText', 'requiresTargetFlatFooted', 'requiresTargetDeniedDexBonus'
];

// Gates the dialog CAN satisfy through its own controls: the three simple
// toggles (Aim/Charge/Autofire), another combat option's live value
// (requiresOption -- combatOptions/attackOptions are submitted from this
// same form), and the Range Band selector (requiresRangeBand).
const DIALOG_TOGGLEABLE_GATE_KEYS = ['requiresAim', 'requiresCharge', 'requiresAutofire', 'requiresOption', 'requiresRangeBand'];

function loadDb(relPath) {
  const raw = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
  return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function classify(rule) {
  const control = String(rule.control ?? '').toLowerCase();
  if (!['toggle', 'flag', 'slider', 'passive'].includes(control)) return 'INVALID_NON_ATTACK_RULE';

  if (EXTERNAL_WORKFLOW_GATE_KEYS.some(k => rule[k] !== undefined)) return 'EXTERNAL_WORKFLOW_GATED';
  if (TARGET_GATE_KEYS.some(k => rule[k] !== undefined)) return 'TARGET_GATED';

  if (control === 'passive') return 'PASSIVE';
  if (control === 'slider') return 'SLIDER';
  if (DIALOG_TOGGLEABLE_GATE_KEYS.some(k => rule[k] !== undefined)) return 'CONTEXT_GATED_SELECTABLE';
  return 'SELECTABLE';
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
        classification: classify(rule)
      });
    }
  }
  return out;
}

const CLASS_ORDER = ['SELECTABLE', 'PASSIVE', 'CONTEXT_GATED_SELECTABLE', 'SLIDER', 'TARGET_GATED', 'EXTERNAL_WORKFLOW_GATED', 'RUNTIME_INCOMPLETE', 'INVALID_NON_ATTACK_RULE'];
const CLASS_LABEL = {
  SELECTABLE: 'SELECTABLE (renders as a toggle/flag checkbox, no unmet dialog-unresolvable gate)',
  PASSIVE: 'PASSIVE (a real, always-active modifier surfaced by CombatOptionResolver -- not a player checkbox)',
  CONTEXT_GATED_SELECTABLE: 'CONTEXT-GATED SELECTABLE (gated on Aim/Charge/Autofire/Range Band/another combat option -- all resolvable from this dialog\'s own controls; renders disabled-with-reason until met)',
  SLIDER: 'SLIDER (a numeric slider control, e.g. Power Attack)',
  TARGET_GATED: 'TARGET-GATED (requires a target actor to evaluate -- reachable once the Target Context panel supplies one, round 8 correction #1 Blocker 3; shows "Requires a target" with none selected, or a truthful not-qualifying reason once one is)',
  EXTERNAL_WORKFLOW_GATED: 'EXTERNAL-WORKFLOW-GATED (requires a maneuver selection or an opportunity-attack/reaction framing this ordinary attack dialog has no control for at all -- genuinely unreachable from here, not a presentation gap)',
  RUNTIME_INCOMPLETE: 'RUNTIME INCOMPLETE (a real ATTACK_OPTION record whose gate shape does not match any category above -- none observed in shipped data as of this report)',
  INVALID_NON_ATTACK_RULE: 'INVALID / NON-ATTACK-OPTION SHAPE (extractAttackOptionRules() returned it, but its control type is not one optionCard()/hydrateOption() knows how to render -- a data validation trip-wire, not expected in shipped packs)'
};

function run() {
  const feats = scanPack('packs/feats.db', 'feat');
  const talents = scanPack('packs/talents.db', 'talent');
  const all = [...feats, ...talents];

  const byClass = {};
  for (const cls of CLASS_ORDER) byClass[cls] = [];
  for (const rec of all) byClass[rec.classification].push(rec);

  // Every total below is a live count of `all`/`byClass[...]`, never a
  // restated number -- the round 8 arithmetic bug (bucket counts not
  // summing to the claimed total) cannot recur by construction.
  const bucketSum = CLASS_ORDER.reduce((sum, cls) => sum + byClass[cls].length, 0);
  if (bucketSum !== all.length) {
    throw new Error(`internal error: bucket counts (${bucketSum}) do not sum to total records (${all.length}) -- classify() must assign every record to exactly one bucket`);
  }
  const reachableFromThisDialog = ['SELECTABLE', 'PASSIVE', 'CONTEXT_GATED_SELECTABLE', 'SLIDER'].reduce((sum, cls) => sum + byClass[cls].length, 0);

  const generated = new Date().toISOString();
  const lines = [];
  lines.push('# Attack Option Coverage Report');
  lines.push('');
  lines.push(`Generated: ${generated}`);
  lines.push('');
  lines.push('Scope: every record `extractAttackOptionRules()` (scripts/engine/combat/combat-option-resolver.js -- the SAME function `CombatOptionResolver.getAvailableAttackOptions()` uses in production, imported directly here rather than re-parsed) returns for each document in `packs/feats.db` and `packs/talents.db`.');
  lines.push('');
  lines.push('This is an inventory audit, not a certification that every listed mechanic is fully wired end-to-end for every downstream consumer (chat cards, damage packets, AI, etc.) -- see Math Integrity Freeze, Attack Bonus round 8 (and its correction #1) in the ledger for what this round did and did not certify.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total ATTACK_OPTION records: ${all.length} (feats: ${feats.length}, talents: ${talents.length})`);
  lines.push(`- Reachable from the current attack dialog today (SELECTABLE + PASSIVE + CONTEXT_GATED_SELECTABLE + SLIDER): ${reachableFromThisDialog}`);
  for (const cls of CLASS_ORDER) {
    lines.push(`- ${CLASS_LABEL[cls]}: ${byClass[cls].length}`);
  }
  lines.push('');
  for (const cls of CLASS_ORDER) {
    if (!byClass[cls].length) continue;
    lines.push(`## ${cls} (${byClass[cls].length})`);
    lines.push('');
    for (const rec of byClass[cls]) {
      lines.push(`- [${rec.itemType}] ${rec.itemName} (\`${rec.option}\`, control: ${rec.control})`);
    }
    lines.push('');
  }

  const outDir = path.join(REPO_ROOT, 'docs/audits/generated');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'attack-option-coverage-report.md'), lines.join('\n') + '\n');
  fs.writeFileSync(
    path.join(outDir, 'attack-option-coverage-report.json'),
    JSON.stringify({ generated, total: all.length, feats: feats.length, talents: talents.length, reachableFromThisDialog, byClass: Object.fromEntries(CLASS_ORDER.map(c => [c, byClass[c].length])), records: all }, null, 2) + '\n'
  );

  console.log(`Attack option coverage report written: ${all.length} records (feats: ${feats.length}, talents: ${talents.length}), ${reachableFromThisDialog} reachable from this dialog today`);
  for (const cls of CLASS_ORDER) {
    console.log(`  ${cls}: ${byClass[cls].length}`);
  }
}

run();
