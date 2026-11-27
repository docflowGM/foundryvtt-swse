import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 3N-DC semantic guards: cheap source-level tripwires so the duplicate-application defects fixed in the P0 tranche cannot be silently reintroduced.
// (Behavioral fixtures live in tests/derived-*.test.mjs; these only catch the structural shape of a regression.)
const files = [];
(function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })('scripts');
const src = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\/|(^|[^:\\])\/\/.*$/gm, '$1');

test_('the ambiguous getEffectiveHalfLevel has exactly one live caller (the Block house rule, DC-RULE-001)', () => {
  const users = [...src].filter(([f, t]) => f !== 'scripts/actors/derived/level-split.js' && /\bgetEffectiveHalfLevel\b/.test(uncomment(t))).map(([f]) => f);
  assert.deepEqual(users, ['scripts/houserules/houserule-block-mechanic.js']);
});
test_('nothing monkey-patches DerivedCalculator.computeAll (Skill Focus is one calculation)', () => {
  // The two dev/validation harnesses below swap computeAll temporarily and restore it in the same function; they are not runtime patches.
  const harnesses = new Set(['scripts/engine/combat/damage-engine-test.js', 'scripts/governance/mutation/batch-1-validation.js']);
  const bad = [...src].filter(([f, t]) => !harnesses.has(f) && /DerivedCalculator\.computeAll\s*=[^=]/.test(uncomment(t))).map(([f]) => f);
  assert.deepEqual(bad, []);
});
test_('ModifierEngine does not emit condition-track modifiers onto defense targets (DefenseCalculator applies it once)', () => {
  const t = uncomment(src.get('scripts/engine/effects/modifiers/ModifierEngine.js'));
  const m = t.match(/static _getConditionModifiers\(actor\) \{[\s\S]*?\n  \}\n/);
  assert.ok(m, 'collector found');
  assert.ok(!/defense\.(fortitude|reflex|will)/.test(m[0]), 'no defense targets in the condition collector');
});
test_('the skill pass does not re-read actor/derived armor check penalty (ModifierEngine/armor-usage-resolver is the one source)', () => {
  const t = uncomment(src.get('scripts/actors/derived/derived-calculator.js'));
  assert.ok(!/system\.derived\?*\.armor\?*\.checkPenalty|system\.armor\?*\.checkPenalty/.test(t));
});
test_('the derived HP mirror has no truthy value-or-max fallback', () => {
  const t = uncomment(src.get('scripts/actors/derived/derived-calculator.js'));
  assert.ok(!/hp\?\.value\s*\|\|\s*actor\.system\.hp\?\.max/.test(t));
});
test_('derived overrides never read only the dotted key for object-valued derived data', () => {
  const t = uncomment(src.get('scripts/engine/abilities/passive/derived-override-engine.js'));
  assert.ok(/resolveDerivedSlot/.test(t) && !/updates\[updateKey\]\s*\?\?\s*10/.test(t));
});
console.log('derived-authority-semantic-guards: ok');
function test_(name, fn) { try { fn(); console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL ${name}`); throw e; } }
