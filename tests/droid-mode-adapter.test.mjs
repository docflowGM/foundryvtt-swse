import assert from 'node:assert/strict';
import {
  isDroidStatblockMode,
  isStockImportedDroid,
  buildConvertDroidToPlayableModeUpdate,
  computeStatblockDerivedOverrides
} from '../scripts/actors/droid/droid-mode-adapter.js';

// Phase 3 — Droid Authority Consolidation. A stock-imported droid has no
// class levels, so the normal derived pipeline would compute BAB 0 and base
// (10) defenses and silently replace the published statblock's displayed
// totals on every sheet render. isDroidStatblockMode()/shouldSkipDerivedData()
// stop that recalculation from running at all; computeStatblockDerivedOverrides()
// supplies the actual published values the sheet should show instead.

function statblockDroid(overrides = {}) {
  return {
    type: 'droid',
    flags: { swse: { stockDroidImport: { importMode: 'statblock', sourceId: 'abc', ...overrides } } }
  };
}

// isDroidStatblockMode

{
  assert.equal(isDroidStatblockMode(statblockDroid()), true);
}

{
  const playable = statblockDroid({ importMode: 'playable' });
  assert.equal(isDroidStatblockMode(playable), false);
}

{
  // Non-droid actor types are never statblock-mode droids, even with the flag present.
  const npc = statblockDroid();
  npc.type = 'npc';
  assert.equal(isDroidStatblockMode(npc), false);
}

{
  // A droid follower (chargen/follower-creator built) never has the stock
  // import flag at all, so it is never mistaken for a frozen statblock.
  const follower = { type: 'droid', flags: {} };
  assert.equal(isDroidStatblockMode(follower), false);
}

{
  assert.equal(isDroidStatblockMode(null), false);
  assert.equal(isDroidStatblockMode(undefined), false);
}

// isStockImportedDroid — true regardless of current mode, false if never imported

{
  assert.equal(isStockImportedDroid(statblockDroid()), true);
  assert.equal(isStockImportedDroid(statblockDroid({ importMode: 'playable' })), true);
  assert.equal(isStockImportedDroid({ type: 'droid', flags: {} }), false);
}

// buildConvertDroidToPlayableModeUpdate

{
  const actor = statblockDroid();
  const update = buildConvertDroidToPlayableModeUpdate(actor);
  assert.equal(update.set['flags.swse.stockDroidImport.importMode'], 'playable');
  assert.equal(typeof update.set['flags.swse.stockDroidImport.convertedAt'], 'number');
}

{
  // Refuses to build a conversion update for an actor that isn't currently
  // in statblock mode (already converted, not a droid, or never imported).
  assert.throws(() => buildConvertDroidToPlayableModeUpdate(statblockDroid({ importMode: 'playable' })));
  assert.throws(() => buildConvertDroidToPlayableModeUpdate({ type: 'droid', flags: {} }));
  assert.throws(() => buildConvertDroidToPlayableModeUpdate(null));
}

// computeStatblockDerivedOverrides

{
  const system = {
    bab: 4,
    defenses: {
      fortitude: { total: 15 },
      reflex: { total: 13 },
      will: { total: 12 },
      flatFooted: { total: 11 }
    },
    damageThreshold: 20
  };
  const overrides = computeStatblockDerivedOverrides(system);
  assert.equal(overrides.bab, 4);
  assert.deepEqual(overrides.defenses, { fortitude: 15, reflex: 13, will: 12, flatFooted: 11 });
  assert.equal(overrides.damageThreshold, 20);
}

{
  // Falls back to baseAttackBonus when bab itself is missing.
  const overrides = computeStatblockDerivedOverrides({ baseAttackBonus: 7, defenses: {} });
  assert.equal(overrides.bab, 7);
}

{
  // Missing/non-numeric fields are omitted (null for scalars, absent key
  // for defenses) rather than defaulting to 0 — a caller must not mistake
  // "no published value" for "published value of zero".
  const overrides = computeStatblockDerivedOverrides({});
  assert.equal(overrides.bab, null);
  assert.deepEqual(overrides.defenses, {});
  assert.equal(overrides.damageThreshold, null);
}

{
  // Partial defenses: only the ones with a finite total are included.
  const overrides = computeStatblockDerivedOverrides({
    defenses: { fortitude: { total: 15 }, reflex: { total: 'not-a-number' } }
  });
  assert.deepEqual(overrides.defenses, { fortitude: 15 });
}

{
  // Pure: does not mutate its input.
  const system = { bab: 4, defenses: { fortitude: { total: 15 } }, damageThreshold: 20 };
  const before = JSON.parse(JSON.stringify(system));
  computeStatblockDerivedOverrides(system);
  assert.deepEqual(system, before);
}

console.log('Droid mode adapter (statblock/playable) guards passed.');
