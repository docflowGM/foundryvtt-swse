import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 4's full-attack/attack-sequence identity work
// (docs/audits/rolling-system-alignment-phase-4.md, "Full-attack reroll
// behavior"). Research this phase found TWO live full-attack orchestration
// paths with zero shared sequence identity:
//   - combat-feature-handlers.js#executeCombatFeatureMultiattack() — posts
//     one independently-flagged chat message PER attack (Phase 3 reroll
//     schema already applies to each).
//   - full-attack-executor.js#FullAttackExecutor.execute() — posts ONE
//     combined card for the whole sequence (suppressChat:true per attack).
// Both now thread a stable sequenceId + per-attack attackInstanceId through
// rollAttack() so sibling isolation is provable, not just incidental.

const handlers = await readFile(new URL('../scripts/engine/combat/features/combat-feature-handlers.js', import.meta.url), 'utf8');
const executor = await readFile(new URL('../scripts/engine/combat/full-attack-executor.js', import.meta.url), 'utf8');
const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');

// 1. combat-feature-handlers.js: one sequenceId generated ONCE per
// multiattack declaration (outside the per-attack loop), one distinct
// attackInstanceId per attack (derived from index, so guaranteed unique
// within the sequence), both threaded into every rollAttack() call.
const multiattackFn = handlers.slice(handlers.indexOf('export async function executeCombatFeatureMultiattack'), handlers.indexOf('export async function executeCombatFeatureAttackOption'));
const sequenceIdDecls = (multiattackFn.match(/const sequenceId = foundry\.utils\?\.randomID\?\.\(\)/g) || []).length;
assert.equal(sequenceIdDecls, 1, 'sequenceId must be generated exactly once per multiattack declaration, not once per attack.');
assert.match(multiattackFn, /const attackInstanceId = `\$\{sequenceId\}-\$\{index\}`;/);
assert.match(multiattackFn, /sequenceId,\s*\n\s*attackInstanceId,\s*\n\s*sequenceIndex: index,\s*\n\s*sequenceLength: plan\.attacks\.length,/);

// 2. attacks.js persists sequenceId/attackInstanceId onto the LIVE
// per-message flags.swse (rollAttack's own SWSEChat.postRoll call) and onto
// the returned attackResult — not just passed through and dropped.
const rollAttackBody = attacks.slice(attacks.indexOf('export async function rollAttack('), attacks.indexOf('export async function rollDamage('));
assert.match(rollAttackBody, /sequenceId: rollOptions\.sequenceId \?\? null,\s*\n\s*attackInstanceId: rollOptions\.attackInstanceId \?\? null,\s*\n\s*sequenceIndex: rollOptions\.sequenceIndex \?\? null,\s*\n\s*sequenceLength: rollOptions\.sequenceLength \?\? null\s*\n\s*\} \},/, 'rollAttack() must persist sequence identity onto the chat message flags.swse.');
assert.match(rollAttackBody, /sequenceId: rollOptions\.sequenceId \?\? null,\s*\n\s*attackInstanceId: rollOptions\.attackInstanceId \?\? null,\s*\n\s*sequenceIndex: rollOptions\.sequenceIndex \?\? null,\s*\n\s*sequenceLength: rollOptions\.sequenceLength \?\? null,\s*\n\s*targetEffectsOnHit/, 'rollAttack() must echo sequence identity onto the returned attackResult.');

// 3. FullAttackExecutor.execute(): sequenceId generated once for the whole
// declared sequence (not per attack), a distinct attackInstanceId per
// attack in the loop, and both recorded on the combined card's flags.swse
// (message-state schema foundation) rather than only living in memory.
const executeFn = executor.slice(executor.indexOf('static async execute(actor, options = {})'), executor.indexOf('static async '.repeat(1), executor.indexOf('static async execute(actor, options = {})') + 10));
assert.match(executor, /const sequenceId = foundry\.utils\?\.randomID\?\.\(\) \?\? `seq-/);
assert.match(executor, /attackInstanceId: `\$\{sequenceId\}-\$\{index\}`,\s*\n\s*sequenceIndex: index,/);
assert.match(executor, /async function _postCombinedCard\(actor, sequence, results, target, sequenceId = null\)/);
assert.match(executor, /flags: \{ swse: \{\s*\n\s*fullAttack: true,\s*\n\s*packageType: sequence\.packageType,\s*\n\s*sequenceId,\s*\n\s*attacks: attackEntries\s*\n\s*\} \},/);

// 4. Sequence penalties are declared once in the plan (buildFullAttackSequence
// / fallbackMultiAttackPlan) BEFORE the loop and passed as a literal number
// into each rollAttack() call — never recomputed inside the loop from a
// different declaration state. (Both live paths read step.finalPenalty /
// attack.finalPenalty, a precomputed plan field, not a fresh calculation.)
assert.match(multiattackFn, /sequencePenalty: Number\(step\.finalPenalty \?\? 0\) \+ Number\(options\.sequencePenalty \?\? 0\),/);
assert.match(executor, /sequencePenalty: attack\.finalPenalty,/);

// 5. Shared declaration cost (action economy) is spent at most once per
// sequence: combat-feature-handlers guards the spend with `if (!spend)`
// inside the loop (spent lazily on the first successful dialog confirm,
// never re-spent on subsequent iterations); FullAttackExecutor spends
// once before the loop entirely.
assert.match(multiattackFn, /if \(!spend\) \{\s*\n\s*spend = await ActionEconomyConsumption\.spend\(/);
const executeFullBody = executor.slice(executor.indexOf('static async execute(actor, options = {})'));
const spendIndex = executeFullBody.indexOf('_spendFullAttackEconomy(');
const loopIndex = executeFullBody.indexOf('for (const [index, attack] of sequence.attacks.entries())');
assert.ok(spendIndex >= 0 && loopIndex > spendIndex, 'FullAttackExecutor must spend action economy once, before the per-attack loop.');

console.log('Phase 4 full-attack sequence-identity guards passed.');
