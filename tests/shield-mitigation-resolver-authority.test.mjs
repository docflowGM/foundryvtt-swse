import assert from 'node:assert/strict';
import { ShieldMitigationResolver } from '../scripts/engine/combat/resolvers/shield-mitigation-resolver.js';

// V2 combat runtime convergence, Phase 2 (Shields + Damage Reduction).
//
// docs/audits/phase-3b-shield-dr-design.md claims Shield SR was "verified
// end-to-end against the real ShieldMitigationResolver" (dmg<SR unchanged,
// dmg>SR overflow+degrade, repeated hits persist, recharge +5 caps, force
// shields no phantom persistence). docs/audits/v2-remaining-work.md's
// Phase 0 re-verification confirmed the *code* is correct by inspection,
// but found no test file anywhere in the repo actually exercises
// ShieldMitigationResolver — a repo-wide grep for its name returns zero
// hits under tests/. This file closes that gap directly: the resolver is
// a pure, stateless class (no Foundry dependency), so it's testable with
// no shim at all.

function actorWithShield({ current, max = current, source = 'Energy Shield' } = {}) {
  return { system: { derived: { shield: { current, max, source, stored: true } } } };
}

// ── damage <= SR: fully absorbed, no degradation ──

{
  const result = ShieldMitigationResolver.resolve({ damage: 10, actor: actorWithShield({ current: 15 }) });
  assert.equal(result.damageAfter, 0);
  assert.equal(result.srApplied, 10);
  assert.equal(result.srDegraded, 0);
  assert.equal(result.srRemaining, 15, 'SR is unchanged when damage does not exceed it');
  assert.equal(result.mitigated, true);
}

{
  // Exactly equal to SR: still RAW "not exceeding," so no degradation.
  const result = ShieldMitigationResolver.resolve({ damage: 15, actor: actorWithShield({ current: 15 }) });
  assert.equal(result.damageAfter, 0);
  assert.equal(result.srDegraded, 0);
  assert.equal(result.srRemaining, 15);
}

// ── damage > SR: overflow passes through, SR degrades by exactly 5 ──

{
  const result = ShieldMitigationResolver.resolve({ damage: 22, actor: actorWithShield({ current: 15 }) });
  assert.equal(result.srApplied, 15, 'SR absorbs its full current value before overflow');
  assert.equal(result.damageAfter, 7, 'overflow (22-15) must pass through to HP');
  assert.equal(result.srDegraded, 5, 'RAW: SR degrades by exactly 5 per hit that exceeds it');
  assert.equal(result.srRemaining, 10);
}

// ── repeated hits: degradation compounds correctly hit over hit ──

{
  let shield = actorWithShield({ current: 15, max: 15 });
  const first = ShieldMitigationResolver.resolve({ damage: 22, actor: shield });
  assert.equal(first.srRemaining, 10);

  shield = actorWithShield({ current: first.srRemaining, max: 15 });
  const second = ShieldMitigationResolver.resolve({ damage: 12, actor: shield });
  assert.equal(second.srApplied, 10, 'second hit absorbs the degraded SR value, not the original max');
  assert.equal(second.damageAfter, 2);
  assert.equal(second.srDegraded, 5, 'a second hit exceeding the now-lower SR degrades it again');
  assert.equal(second.srRemaining, 5);
}

// ── SR degradation never goes below 0 ──

{
  const result = ShieldMitigationResolver.resolve({ damage: 10, actor: actorWithShield({ current: 3 }) });
  assert.equal(result.srDegraded, 5);
  assert.equal(result.srRemaining, 0, 'degradation clamps at 0, never negative');
}

// ── no shield (SR 0 or absent): damage passes through entirely untouched ──

{
  const result = ShieldMitigationResolver.resolve({ damage: 10, actor: actorWithShield({ current: 0 }) });
  assert.deepEqual(result, { damageBefore: 10, damageAfter: 10, srApplied: 0, srDegraded: 0, srRemaining: 0, mitigated: false });
}

{
  const result = ShieldMitigationResolver.resolve({ damage: 10, actor: { system: { derived: {} } } });
  assert.equal(result.damageAfter, 10);
  assert.equal(result.mitigated, false, 'an actor with no derived.shield at all must be treated as having no SR');
}

// ── invalid input fails closed, never throws ──

{
  assert.equal(ShieldMitigationResolver.resolve({ damage: 10, actor: null }).damageAfter, 10);
  assert.equal(ShieldMitigationResolver.resolve({ damage: -5, actor: actorWithShield({ current: 10 }) }).damageAfter, -5);
  assert.equal(ShieldMitigationResolver.resolve({ damage: 'ten', actor: actorWithShield({ current: 10 }) }).mitigated, false);
}

// ── transient (non-stored) Force Shield still absorbs damage the same way ──
// (persistence of degradation is ActorEngine's job via the `stored` guard,
// not this resolver's -- it is a pure calculator regardless of provenance)

{
  const actor = { system: { derived: { shield: { current: 8, max: 8, source: 'Force Shield', stored: false } } } };
  const result = ShieldMitigationResolver.resolve({ damage: 5, actor });
  assert.equal(result.damageAfter, 0);
  assert.equal(result.srApplied, 5);
}

// ── getCurrentSR / getMaxSR / getSRSource informational accessors ──

{
  const actor = actorWithShield({ current: 12, max: 20, source: 'Deflector Shield Generator' });
  assert.equal(ShieldMitigationResolver.getCurrentSR(actor), 12);
  assert.equal(ShieldMitigationResolver.getMaxSR(actor), 20);
  assert.equal(ShieldMitigationResolver.getSRSource(actor), 'Deflector Shield Generator');
  assert.equal(ShieldMitigationResolver.getCurrentSR(null), 0);
  assert.equal(ShieldMitigationResolver.getMaxSR(null), 0);
  assert.equal(ShieldMitigationResolver.getSRSource(null), '');
}

console.log('shield-mitigation-resolver-authority: all assertions passed');
