#!/usr/bin/env node
/**
 * Phase 10L audit: AoO feat helper action-lane wiring.
 *
 * Verifies that the existing manual Attack of Opportunity action is enriched
 * with actor-owned AoO feat metadata without introducing spatial automation or
 * a separate AoO-per-round pool.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const files = {
  mapper: 'scripts/combat/utils/combat-actions-mapper.js',
  helper: 'scripts/engine/combat/attack-of-opportunity-feat-rules.js',
  npc: 'scripts/sheets/v2/npc/npc-sheet-helpers.js'
};

function read(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assert(name, condition, details = '') {
  results.push({ name, ok: Boolean(condition), details });
}

const results = [];
let mapper = '';
let helper = '';
let npc = '';

try {
  mapper = read(files.mapper);
  helper = read(files.helper);
  npc = read(files.npc);
} catch (err) {
  console.error(`[phase10l] ${err.message}`);
  process.exit(1);
}

assert(
  'CombatActionsMapper imports AttackOfOpportunityFeatRules',
  /import\s+\{\s*AttackOfOpportunityFeatRules\s*\}\s+from\s+["']\/systems\/foundryvtt-swse\/scripts\/engine\/combat\/attack-of-opportunity-feat-rules\.js["'];/.test(mapper)
);

assert(
  'getActionsForSkill accepts actor context',
  /static\s+getActionsForSkill\s*\(\s*skillKey\s*,\s*actor\s*=\s*this\.getSelectedActor\(\)\s*\)/.test(mapper)
);

assert(
  'getAllActionsBySkill accepts actor context',
  /static\s+getAllActionsBySkill\s*\(\s*actor\s*=\s*this\.getSelectedActor\(\)\s*\)/.test(mapper)
);

assert(
  'getAllActionsBySkill forwards actor to getActionsForSkill',
  /this\.getActionsForSkill\(\s*skillKey\s*,\s*actor\s*\)/.test(mapper)
);

assert(
  'getAllCombatActions accepts actor context',
  /static\s+getAllCombatActions\s*\(\s*actor\s*=\s*this\.getSelectedActor\(\)\s*\)/.test(mapper)
);

assert(
  '_normalizeAction accepts actor context',
  /static\s+_normalizeAction\s*\(\s*item\s*,\s*actor\s*=\s*null\s*\)/.test(mapper)
);

assert(
  '_normalizeAction enriches via AttackOfOpportunityFeatRules',
  /return\s+AttackOfOpportunityFeatRules\.enrichAction\(\s*base\s*,\s*actor\s*\)\s*;/.test(mapper)
);

assert(
  'NPC helper passes actor to CombatActionsMapper.getAllCombatActions',
  /CombatActionsMapper\.getAllCombatActions\?\.\(\s*actor\s*\)\s*\|\|\s*\[\]/.test(npc)
);

assert(
  'Helper models Combat Reflexes as reaction capacity',
  /reactionCapacity\s*\(\s*actor\s*\)/.test(helper) &&
    /hasCombatReflexes\s*\?\s*Math\.max\(\s*0\s*,\s*dexMod\s*\)\s*:\s*0/.test(helper) &&
    /base\s*\+\s*combatReflexesBonus/.test(helper)
);

assert(
  'Helper keeps spatial predicates manual/metadata',
  /spatialPredicatePolicy:\s*['"]metadata_manual['"]/.test(helper) &&
    /does\s+not\s+detect\s+threatened\s+squares/i.test(helper)
);

const combined = `${mapper}\n${helper}\n${npc}`;
const forbiddenPoolPatterns = [
  /aoo\s*per\s*round/i,
  /aooPerRound/,
  /attackOfOpportunityPool/,
  /opportunityAttackPool/,
  /separate\s+AoO\s+pool/i
];
assert(
  'No separate AoO-per-round resource is introduced',
  !forbiddenPoolPatterns.some(pattern => pattern.test(combined)),
  'AoO must consume the existing reaction resource; Combat Reflexes increases reaction capacity.'
);

const failed = results.filter(result => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.details ? ` - ${result.details}` : ''}`);
}

if (failed.length) {
  console.error(`\n[phase10l] ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log('\n[phase10l] AoO action-lane wiring audit passed.');
