import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static architectural guard for the Phase 1 modifier total/breakdown parity
// fix. See tests/modifier-breakdown-builder.test.mjs for the executable
// numeric proof that sum(breakdown) === total for any partition of an
// `applied` array; this test proves RollCore actually wires both from the
// same resolution instead of recomputing the breakdown independently.

const rollCore = await readFile(new URL('../scripts/engine/roll/roll-core.js', import.meta.url), 'utf8');
const modifierEngine = await readFile(new URL('../scripts/engine/effects/modifiers/ModifierEngine.js', import.meta.url), 'utf8');

// The old bug: _buildModifierBreakdown(allModifiers, domain) accepted domain
// but never filtered by it, and was fed a domain-blind modifier list built
// separately from whatever produced modifierTotal. That method must be gone.
assert.doesNotMatch(rollCore, /_buildModifierBreakdown/);

// RollCore.execute() must resolve modifierTotal and modifierBreakdown from
// ONE call per branch, not two independently-filtered computations.
assert.match(rollCore, /ModifierEngine\.resolveTarget\(actor, domain, \{ context \}\)/);
assert.match(rollCore, /resolution\.total/);
assert.match(rollCore, /resolution\.breakdown/);

// The skipStaticModifiers branch must build its breakdown from the exact
// same filtered+stacked `applied` list used for modifierTotal (both derive
// from `domainFiltered`/`applied`), not from the raw allModifiers.
assert.match(rollCore, /ModifierUtils\.filterModifiers\(contextualModifiers, domain, true\)/);
assert.match(rollCore, /ModifierUtils\.resolveStacking\(domainFiltered\)/);
assert.match(rollCore, /buildSourceBreakdown\(applied\)/);

// ModifierEngine must expose the single-pass resolver and it must build the
// breakdown from the resolved `applied` array (not from unfiltered input).
assert.match(modifierEngine, /static async resolveTarget\(actor, target, options = \{\}\)/);
assert.match(modifierEngine, /static _resolveFromModifierList\(actor, allModifiers, target, context = \{\}\)/);
assert.match(modifierEngine, /const breakdown = buildSourceBreakdown\(applied\);/);
assert.match(modifierEngine, /const ledger = buildModifierLedger\(applied, suppressed, target\);/);

// Target(domain) filtering must happen before breakdown/ledger construction,
// i.e. only modifiers matching the requested domain ever reach the resolved
// `applied`/`breakdown` — this is what stops an unrelated-domain modifier
// (e.g. defense.reflex) from leaking into a skill.acrobatics breakdown.
assert.match(modifierEngine, /mod && mod\.target === target/);

console.log('Modifier total/breakdown single-resolution-pass guards passed.');
