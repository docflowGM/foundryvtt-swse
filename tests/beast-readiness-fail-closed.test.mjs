import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

registerFoundryPathLoader();
const { BeastSubtypeAdapter, readBeastIntelligence } = await import('../scripts/apps/progression-framework/adapters/beast-subtype-adapter.js');
const adapter = new BeastSubtypeAdapter();
const session = (over = {}) => ({ subtype: 'beast', mode: 'chargen', beastContext: { isBeast: true, intelligence: 1 }, draftSelections: { attributes: { values: { int: 1 } } }, ...over });
const blocks = (s) => adapter.validateReadiness(s, { system: { abilities: { int: { base: 1 } } } });

test('valid beast creation: draft Int 1 or 2 passes', async () => {
  await assert.doesNotReject(blocks(session()));
  await assert.doesNotReject(blocks(session({ draftSelections: { attributes: { values: { int: 2 } } } })));
});

test('invalid Intelligence BLOCKS finalization (0, 3, non-integer, NaN)', async () => {
  for (const int of [0, 3, 10, 1.5, 'abc']) {
    await assert.rejects(blocks(session({ draftSelections: { attributes: { values: { int } } } })), /Beast Intelligence must be 1 or 2/, String(int));
  }
});

test('missing draft Intelligence blocks; it is never defaulted to a passing 1', async () => {
  await assert.rejects(blocks(session({ draftSelections: { attributes: { values: {} } } })), /not set in the draft/);
  await assert.rejects(blocks(session({ draftSelections: {} })), /not set in the draft/);
  assert.equal(readBeastIntelligence({ draftSelections: { attributes: { values: {} } } }), null);
});

test('the DRAFT is authoritative, not the stale actor/context value (actor Int 1 + draft Int 5 blocks)', async () => {
  await assert.rejects(adapter.validateReadiness(session({ draftSelections: { attributes: { values: { int: 5 } } } }), { system: { abilities: { int: { base: 1 } } } }), /draft Int 5/);
  // and the opposite: stale context Int 8, valid draft Int 2 passes
  await assert.doesNotReject(blocks(session({ beastContext: { isBeast: true, intelligence: 8 }, draftSelections: { attributes: { values: { int: 2 } } } })));
});

test('a beast session with NO beast context blocks (no silent skip)', async () => {
  await assert.rejects(blocks(session({ beastContext: undefined })), /no beast context/);
  await assert.rejects(blocks(session({ subtype: 'mount', beastContext: { isBeast: false } })), /no beast context/);
});

test('non-beast sessions are untouched; level-up does not re-apply the creation-only rule', async () => {
  await assert.doesNotReject(adapter.validateReadiness({ subtype: 'actor', mode: 'chargen', draftSelections: {} }, {}));
  await assert.doesNotReject(blocks(session({ mode: 'levelup', draftSelections: { attributes: { values: { int: 4 } } } })));
});
