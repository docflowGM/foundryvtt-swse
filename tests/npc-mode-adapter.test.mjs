import assert from 'node:assert/strict';
import {
  getNpcProfileState,
  resolveNpcCalculationMode,
  isNpcCalculationMode,
  isNpcStatblockMode,
  isNpcProgressionMode
} from '../scripts/actors/npc/npc-mode-adapter.js';

// Phase 2 — actor data-model authority normalization. resolveNpcCalculationMode()
// consolidates the existing kind/mode/sourceAuthority inference this file
// already performs (getNpcProfileState) into the one explicit
// 'progression' | 'statblock' | 'follower' enum
// docs/audits/v2-actor-authority-performance-phase-1.md §12 recommended.
// It adds no new inference — these tests lock in that it agrees with the
// underlying state it's built from, that an explicit stored field wins
// (matching the droid-mode-adapter.js precedent), and that follower/beast
// classification behaves as the Phase 2 investigation established live
// behavior actually supports.

function npcActor(overrides = {}) {
  return { type: 'npc', system: {}, flags: {}, items: [], ...overrides };
}

// ── explicit stored calculationMode wins outright (Test 1) ─────────────────

{
  const actor = npcActor({
    system: { npcProfile: { calculationMode: 'progression', sourceAuthority: 'statblock', kind: 'follower' } }
  });
  assert.equal(
    resolveNpcCalculationMode(actor),
    'progression',
    'an explicit, valid stored calculationMode must win even when inference would disagree'
  );
}

{
  const actor = npcActor({ system: { npcProfile: { calculationMode: 'not-a-real-mode' } } });
  assert.notEqual(
    resolveNpcCalculationMode(actor),
    'not-a-real-mode',
    'an invalid stored calculationMode must fall through to inference, not be trusted verbatim'
  );
}

// ── follower kind always resolves to 'follower' regardless of sourceAuthority (Test 2) ──

{
  const actor = npcActor({ system: { npcProfile: { kind: 'follower' }, isFollower: true } });
  assert.equal(resolveNpcCalculationMode(actor), 'follower');
  assert.equal(isNpcCalculationMode(actor, 'follower'), true);
  assert.equal(isNpcCalculationMode(actor, 'statblock'), false);
}

// ── progression mode/sourceAuthority resolves to 'progression' (Test 3) ────

{
  const actorByMode = npcActor({ system: { npcProfile: { mode: 'progression' }, className: 'Soldier' } });
  assert.equal(resolveNpcCalculationMode(actorByMode), 'progression');

  const actorBySourceAuthority = npcActor({ items: [{ type: 'class' }], className: 'Soldier' });
  // No raw import, has a class item -> inferMode() returns 'progression' directly.
  assert.equal(resolveNpcCalculationMode(actorBySourceAuthority), 'progression');
}

// ── default (imported/statblock template, no explicit field, not a follower,
// not progression) resolves to 'statblock' — matches buildImportProfile()'s
// shape in npc-template-importer-engine.js (Test 4) ─────────────────────────

{
  const actor = npcActor({
    system: {
      npcProfile: { kind: 'heroic', mode: 'play', sourceAuthority: 'statblock' }
    },
    flags: { swse: { import: { raw: 'Some Statblock Text' } } }
  });
  assert.equal(resolveNpcCalculationMode(actor), 'statblock');
  assert.equal(isNpcStatblockMode(actor), true);
  assert.equal(isNpcProgressionMode(actor), false);
}

// ── beast is not a calculationMode value — a beast NPC's mode is whichever of
// progression/statblock/follower actually governs it (Test 5) ─────────────

{
  const beastStatblock = npcActor({
    system: { npcProfile: { kind: 'beast' } },
    flags: { swse: { beastData: { size: 'Large' } } }
  });
  const mode = resolveNpcCalculationMode(beastStatblock);
  assert.ok(['statblock', 'progression', 'follower'].includes(mode), 'beast NPCs must still resolve to one of the three real calculationMode values');
  assert.notEqual(mode, 'beast');
}

// ── resolveNpcCalculationMode never returns a value outside the declared enum,
// for a range of inputs including a bare/blank actor (Test 6) ──────────────

{
  const inputs = [
    npcActor(),
    npcActor({ system: { npcProfile: {} } }),
    npcActor({ system: null }),
    { type: 'npc' },
  ];
  for (const actor of inputs) {
    const mode = resolveNpcCalculationMode(actor);
    assert.ok(['progression', 'statblock', 'follower'].includes(mode), `resolveNpcCalculationMode must always return a valid enum value, got "${mode}"`);
  }
}

// ── isNpcCalculationMode rejects an unknown mode string rather than throwing (Test 7) ──

{
  const actor = npcActor();
  assert.equal(isNpcCalculationMode(actor, 'beast'), false);
  assert.equal(isNpcCalculationMode(actor, 'nonsense'), false);
  assert.equal(isNpcCalculationMode(actor, undefined), false);
}

// ── none of these functions mutate the actor they're given (Test 8) ────────

{
  const actor = npcActor({ system: { npcProfile: { kind: 'follower' } } });
  const before = JSON.stringify(actor);
  resolveNpcCalculationMode(actor);
  isNpcCalculationMode(actor, 'follower');
  getNpcProfileState(actor);
  assert.equal(JSON.stringify(actor), before, 'resolving calculation mode must be read-only');
}

console.log('npc-mode-adapter.test.mjs: all assertions passed');
