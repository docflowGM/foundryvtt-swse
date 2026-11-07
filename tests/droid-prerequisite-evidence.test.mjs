import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();
const { actorMeetsDroidSystemRequirement, collectActorDroidSystemParts } = await import('../scripts/domain/droids/droid-part-schema.js');

// Clean-break F2: completed actors satisfy droid-system prerequisites ONLY from
// confirmed ledger records; creation drafts satisfy them only via the explicit
// draft; nothing is synthesized (no implied Heuristic Processor).
const HEURISTIC = { type: 'droid_system', system: 'heuristic', label: 'Heuristic Processor' };
const droid = (system = {}, extra = {}) => ({ type: 'droid', name: 'D', items: [], flags: {}, system, ...extra });
const ok = (actor, pending) => actorMeetsDroidSystemRequirement(actor, HEURISTIC, pending).met;

// 1. No processor at all -> no synthetic Heuristic Processor.
assert.equal(ok(droid({})), false, 'a completed droid with no processor does not gain a Heuristic Processor');
assert.equal(ok(droid({ droidSystems: { size: 'medium' } })), false);
assert.equal(ok({ type: 'npc', system: { species: 'Droid' }, items: [], flags: {} }), false, 'species text is not evidence');

// 2. Mirror-only / Item-only / stock snapshot are present, never prerequisite evidence.
assert.equal(ok(droid({ droidSystems: { processor: { id: 'heuristic-processor', name: 'Heuristic Processor' } } })), false, 'mirror only');
assert.equal(ok(droid({}, { items: [{ id: 'i1', name: 'Heuristic Processor', type: 'equipment', system: { droidPart: { id: 'heuristic-processor', enabled: true } } }] })), false, 'Item only');

// 3. Confirmed ledger record -> satisfied.
assert.equal(ok(droid({ installedSystems: { 'heuristic-processor': { id: 'heuristic-processor', installed: true } } })), true, 'confirmed ledger');
assert.equal(ok(droid({ installedSystems: { 'heuristic-processor': { id: 'heuristic-processor', installed: false } } })), false, 'ledger installed:false');

// 4. Creation draft satisfies only through the explicit draft context.
assert.equal(ok(droid({}), { droidSystems: { processor: { id: 'heuristic-processor' } } }), true, 'explicit creation draft');
assert.equal(ok(droid({}), {}), false, 'no draft, no evidence');
assert.equal(ok(droid({}), { droidSystems: { processor: { id: 'basic-processor' } } }), false, 'a different processor draft is not Heuristic');

// 5. Parts list contains no synthesized entry.
assert.equal(collectActorDroidSystemParts(droid({})).length, 0);

console.log('Droid prerequisite evidence tests passed.');
