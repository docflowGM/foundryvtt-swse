import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// V2 combat runtime convergence, Phase 1 (damage packet / mitigation authority).
//
// Regression guard for a real defect found while re-verifying the "damage
// packet" domain (docs/audits/v2-remaining-work.md): three Dark Side Devotee
// damage call sites in DarkSidePowers.js — Wrath of the Dark Side, Channel
// Aggression, and Affliction — called `actor.applyDamage(amount)` with no
// options, so the canonical packet chokepoint (canonical-damage-packet.js)
// silently dropped their Force-origin context and defaulted to 'normal' via
// swse-actor-base.js's `options.damageType || options.type || 'normal'`
// fallback, even though Affliction's own chat flavor text says "(Force
// damage)". These are all live, sheet-wired Dark Side power effects
// (dark-side-powers-init.js), not dead code, so the dropped context was a
// real mitigation-accuracy bug.
//
// Independent review clarified the framing here: 'force' is not an ordinary
// D4A damage type on par with energy/ion/fire — combat code distinguishes
// Force-origin context (used e.g. for Yuuzhan Vong Force-suppression checks)
// from the canonical damage-type set that ordinary damage-type immunity is
// restricted to. This fix preserves Force-originated damage context through
// the canonical packet rather than letting it silently collapse to
// untyped/normal; it does not newly make 'force' behave like an ordinary
// D4A damage type.
//
// This is a source-pattern regression test in the same style as
// tests/dsp-no-inline-writers.test.mjs: it does not execute DarkSidePowers.js
// (which needs a full Foundry runtime — RollEngine, chat, combat state) but
// asserts each known call site still preserves that Force-origin context.

const here = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(here, '..', 'scripts', 'talents', 'DarkSidePowers.js');

test('Wrath of the Dark Side damage preserves Force-originated damage context', async () => {
  const src = await readFile(filePath, 'utf8');
  assert.match(
    src,
    /await actor\.applyDamage\(dmg\.damage,\s*\{\s*type:\s*'force'/,
    'Wrath damage must preserve its Force-origin context instead of relying on the normal-damage default'
  );
});

test('Channel Aggression damage preserves Force-originated damage context', async () => {
  const src = await readFile(filePath, 'utf8');
  assert.match(
    src,
    /await targetToken\.actor\.applyDamage\(damageAmount,\s*\{\s*type:\s*'force'/,
    'Channel Aggression damage must preserve its Force-origin context instead of relying on the normal-damage default'
  );
});

test('Affliction damage preserves Force-originated damage context', async () => {
  const src = await readFile(filePath, 'utf8');
  assert.match(
    src,
    /await targetActor\.applyDamage\(damageAmount,\s*\{\s*type:\s*'force'/,
    'Affliction damage must preserve its Force-origin context instead of relying on the normal-damage default'
  );
});
