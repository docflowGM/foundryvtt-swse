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
// silently defaulted their type to 'normal' via swse-actor-base.js's
// `options.damageType || options.type || 'normal'` fallback, even though
// Affliction's own chat flavor text says "(Force damage)". These are all
// live, sheet-wired Dark Side power effects (dark-side-powers-init.js),
// not dead code, so the dropped type was a real mitigation-accuracy bug
// (e.g. Force-immune targets would have incorrectly taken full damage).
//
// This is a source-pattern regression test in the same style as
// tests/dsp-no-inline-writers.test.mjs: it does not execute DarkSidePowers.js
// (which needs a full Foundry runtime — RollEngine, chat, combat state) but
// asserts each known call site still passes an explicit type.

const here = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(here, '..', 'scripts', 'talents', 'DarkSidePowers.js');

test('Wrath of the Dark Side damage carries an explicit Force type', async () => {
  const src = await readFile(filePath, 'utf8');
  assert.match(
    src,
    /await actor\.applyDamage\(dmg\.damage,\s*\{\s*type:\s*'force'/,
    'Wrath damage must pass an explicit type instead of relying on the normal-damage default'
  );
});

test('Channel Aggression damage carries an explicit Force type', async () => {
  const src = await readFile(filePath, 'utf8');
  assert.match(
    src,
    /await targetToken\.actor\.applyDamage\(damageAmount,\s*\{\s*type:\s*'force'/,
    'Channel Aggression damage must pass an explicit type instead of relying on the normal-damage default'
  );
});

test('Affliction damage carries an explicit Force type', async () => {
  const src = await readFile(filePath, 'utf8');
  assert.match(
    src,
    /await targetActor\.applyDamage\(damageAmount,\s*\{\s*type:\s*'force'/,
    'Affliction damage must pass an explicit type instead of relying on the normal-damage default'
  );
});
