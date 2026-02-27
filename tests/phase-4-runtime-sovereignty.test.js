/**
 * Phase 4: Runtime Sovereignty Tests
 *
 * Validates:
 * 1. AbilityExecutionRouter rejects invalid requests (bad abilityId, bad executionType, no actor)
 * 2. ActivationLimitEngine blocks an ability after maxUses reached (encounter scope)
 * 3. ActivationLimitEngine blocks after 1 round use, resets on resetRoundLimits()
 * 4. AbilityExecutionRouter: limitBlocked=true when limit exceeded; success=true when within limit
 * 5. ActivationLimitEngine.resetEncounterLimits() re-enables blocked ability
 * 6. AbilityExecutionRouter.execute() dispatches without direct actor.system writes
 * 7. Two actors tracked independently (no cross-actor bleed)
 * 8. UNLIMITED limit type always allows activation (never blocks)
 */

import { ActivationLimitEngine, LimitType } from '../scripts/engine/abilities/ActivationLimitEngine.js';
import { AbilityExecutionRouter, ExecutionType } from '../scripts/engine/abilities/AbilityExecutionRouter.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockActor(overrides = {}) {
  const id = overrides.id ?? `actor-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: overrides.name ?? 'Test Actor',
    type: 'character',
    items: overrides.items ?? [],
    system: overrides.system ?? {},
    ...overrides
  };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

afterEach(() => {
  // Reset all activation limits between tests to keep tests isolated
  ActivationLimitEngine.resetAllEncounterLimits();
});

// ─── TEST 1: AbilityExecutionRouter rejects malformed requests ───────────────

describe('TEST 1: AbilityExecutionRouter input validation', () => {
  test('returns failure when abilityId is missing', async () => {
    const actor = createMockActor();
    const result = await AbilityExecutionRouter.execute({
      executionType: ExecutionType.GENERAL,
      actor
    });
    expect(result.success).toBe(false);
    expect(result.limitBlocked).toBe(false);
    expect(result.reason).toMatch(/abilityId/i);
  });

  test('returns failure when executionType is unknown', async () => {
    const actor = createMockActor();
    const result = await AbilityExecutionRouter.execute({
      abilityId: 'test-ability',
      executionType: 'INVALID_TYPE',
      actor
    });
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/executionType|Unknown/i);
  });

  test('returns failure when actor is null', async () => {
    const result = await AbilityExecutionRouter.execute({
      abilityId: 'test-ability',
      executionType: ExecutionType.GENERAL,
      actor: null
    });
    expect(result.success).toBe(false);
  });

  test('returns failure when actor has no id', async () => {
    const result = await AbilityExecutionRouter.execute({
      abilityId: 'test-ability',
      executionType: ExecutionType.GENERAL,
      actor: { name: 'No Id Actor' }
    });
    expect(result.success).toBe(false);
  });
});

// ─── TEST 2: Per-encounter limit blocks after maxUses ────────────────────────

describe('TEST 2: ActivationLimitEngine — encounter scope blocking', () => {
  test('canActivate returns true when usage is below maxUses', () => {
    const actor = createMockActor();
    const result = ActivationLimitEngine.canActivate(actor, 'inspire-confidence', LimitType.ENCOUNTER, 1);
    expect(result.allowed).toBe(true);
  });

  test('canActivate returns false after maxUses exceeded', () => {
    const actor = createMockActor();
    ActivationLimitEngine.recordActivation(actor, 'inspire-confidence', LimitType.ENCOUNTER);
    const result = ActivationLimitEngine.canActivate(actor, 'inspire-confidence', LimitType.ENCOUNTER, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/inspire-confidence|used.*time/i);
  });

  test('usage count increases with each recordActivation call', () => {
    const actor = createMockActor();
    expect(ActivationLimitEngine.getUsageCount(actor, 'willpower', LimitType.ENCOUNTER)).toBe(0);
    ActivationLimitEngine.recordActivation(actor, 'willpower', LimitType.ENCOUNTER);
    expect(ActivationLimitEngine.getUsageCount(actor, 'willpower', LimitType.ENCOUNTER)).toBe(1);
    ActivationLimitEngine.recordActivation(actor, 'willpower', LimitType.ENCOUNTER);
    expect(ActivationLimitEngine.getUsageCount(actor, 'willpower', LimitType.ENCOUNTER)).toBe(2);
  });

  test('maxUses=2 allows two activations then blocks on third', () => {
    const actor = createMockActor();
    ActivationLimitEngine.recordActivation(actor, 'multi-use', LimitType.ENCOUNTER);
    ActivationLimitEngine.recordActivation(actor, 'multi-use', LimitType.ENCOUNTER);
    expect(ActivationLimitEngine.canActivate(actor, 'multi-use', LimitType.ENCOUNTER, 2).allowed).toBe(false);
  });
});

// ─── TEST 3: Per-round limit — blocks within round, resets on resetRoundLimits ─

describe('TEST 3: ActivationLimitEngine — round scope blocking', () => {
  test('round-scoped ability blocks after 1 use within same round', () => {
    const actor = createMockActor();
    ActivationLimitEngine.recordActivation(actor, 'block', LimitType.ROUND);
    const check = ActivationLimitEngine.canActivate(actor, 'block', LimitType.ROUND, 1);
    expect(check.allowed).toBe(false);
  });

  test('resetRoundLimits re-enables round-scoped ability', () => {
    const actor = createMockActor();
    ActivationLimitEngine.recordActivation(actor, 'deflect', LimitType.ROUND);
    expect(ActivationLimitEngine.canActivate(actor, 'deflect', LimitType.ROUND, 1).allowed).toBe(false);

    ActivationLimitEngine.resetRoundLimits(actor);
    expect(ActivationLimitEngine.canActivate(actor, 'deflect', LimitType.ROUND, 1).allowed).toBe(true);
  });

  test('resetRoundLimits does not affect encounter limits', () => {
    const actor = createMockActor();
    ActivationLimitEngine.recordActivation(actor, 'force-haze', LimitType.ENCOUNTER);
    ActivationLimitEngine.resetRoundLimits(actor);
    // Encounter limit should still be consumed
    expect(ActivationLimitEngine.canActivate(actor, 'force-haze', LimitType.ENCOUNTER, 1).allowed).toBe(false);
  });
});

// ─── TEST 4: AbilityExecutionRouter — limitBlocked flag and success flag ─────

describe('TEST 4: AbilityExecutionRouter limit integration', () => {
  test('first activation succeeds (success=true, limitBlocked=false)', async () => {
    const actor = createMockActor();
    const result = await AbilityExecutionRouter.execute({
      abilityId: 'battle-analysis',
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1
    });
    expect(result.success).toBe(true);
    expect(result.limitBlocked).toBe(false);
  });

  test('second activation is blocked (success=false, limitBlocked=true)', async () => {
    const actor = createMockActor();
    // First activation should succeed
    await AbilityExecutionRouter.execute({
      abilityId: 'battle-analysis',
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1
    });
    // Second should be blocked
    const result = await AbilityExecutionRouter.execute({
      abilityId: 'battle-analysis',
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1
    });
    expect(result.success).toBe(false);
    expect(result.limitBlocked).toBe(true);
  });

  test('convenience executeReaction blocks on second use (per-round)', async () => {
    const actor = createMockActor();
    const first = await AbilityExecutionRouter.executeReaction(actor, 'block-reaction');
    expect(first.success).toBe(true);
    const second = await AbilityExecutionRouter.executeReaction(actor, 'block-reaction');
    expect(second.success).toBe(false);
    expect(second.limitBlocked).toBe(true);
  });
});

// ─── TEST 5: resetEncounterLimits re-enables blocked ability ─────────────────

describe('TEST 5: Encounter reset re-enables abilities', () => {
  test('resetEncounterLimits allows previously blocked encounter ability', async () => {
    const actor = createMockActor();
    // Use up the limit
    await AbilityExecutionRouter.execute({
      abilityId: 'inspire-confidence',
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1
    });
    // Verify blocked
    const blocked = await AbilityExecutionRouter.execute({
      abilityId: 'inspire-confidence',
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1
    });
    expect(blocked.limitBlocked).toBe(true);

    // Reset encounter
    ActivationLimitEngine.resetEncounterLimits(actor);

    // Now allowed again
    const allowed = await AbilityExecutionRouter.execute({
      abilityId: 'inspire-confidence',
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1
    });
    expect(allowed.success).toBe(true);
  });

  test('resetAllEncounterLimits clears limits for all actors', () => {
    const actor1 = createMockActor({ id: 'actor-aaa' });
    const actor2 = createMockActor({ id: 'actor-bbb' });
    ActivationLimitEngine.recordActivation(actor1, 'surge', LimitType.ENCOUNTER);
    ActivationLimitEngine.recordActivation(actor2, 'surge', LimitType.ENCOUNTER);
    ActivationLimitEngine.resetAllEncounterLimits();
    expect(ActivationLimitEngine.canActivate(actor1, 'surge', LimitType.ENCOUNTER, 1).allowed).toBe(true);
    expect(ActivationLimitEngine.canActivate(actor2, 'surge', LimitType.ENCOUNTER, 1).allowed).toBe(true);
  });
});

// ─── TEST 6: AbilityExecutionRouter does not write to actor.system ───────────

describe('TEST 6: AbilityExecutionRouter does not mutate actor', () => {
  test('execute() does not modify actor.system', async () => {
    const actor = createMockActor({ system: { hp: 30 } });
    const systemBefore = JSON.stringify(actor.system);

    await AbilityExecutionRouter.execute({
      abilityId: 'force-haze',
      executionType: ExecutionType.FORCE_POWER,
      actor,
      limitType: LimitType.UNLIMITED
    });

    const systemAfter = JSON.stringify(actor.system);
    expect(systemAfter).toBe(systemBefore);
  });

  test('execute() does not call actor.update', async () => {
    const actor = createMockActor();
    let updateCallCount = 0;
    actor.update = async () => { updateCallCount++; };

    await AbilityExecutionRouter.execute({
      abilityId: 'temporal-awareness',
      executionType: ExecutionType.REACTION,
      actor,
      limitType: LimitType.ROUND,
      maxUses: 1
    });

    expect(updateCallCount).toBe(0);
  });
});

// ─── TEST 7: Two actors tracked independently ────────────────────────────────

describe('TEST 7: Per-actor isolation in ActivationLimitEngine', () => {
  test('actor A usage does not affect actor B', () => {
    const actorA = createMockActor({ id: 'isolation-actor-A' });
    const actorB = createMockActor({ id: 'isolation-actor-B' });

    ActivationLimitEngine.recordActivation(actorA, 'juke', LimitType.ENCOUNTER);

    // actorA is blocked
    expect(ActivationLimitEngine.canActivate(actorA, 'juke', LimitType.ENCOUNTER, 1).allowed).toBe(false);
    // actorB is NOT blocked
    expect(ActivationLimitEngine.canActivate(actorB, 'juke', LimitType.ENCOUNTER, 1).allowed).toBe(true);
  });

  test('resetEncounterLimits for actor A does not clear actor B', () => {
    const actorA = createMockActor({ id: 'reset-actor-A' });
    const actorB = createMockActor({ id: 'reset-actor-B' });

    ActivationLimitEngine.recordActivation(actorA, 'knack', LimitType.ENCOUNTER);
    ActivationLimitEngine.recordActivation(actorB, 'knack', LimitType.ENCOUNTER);

    ActivationLimitEngine.resetEncounterLimits(actorA);

    expect(ActivationLimitEngine.canActivate(actorA, 'knack', LimitType.ENCOUNTER, 1).allowed).toBe(true);
    expect(ActivationLimitEngine.canActivate(actorB, 'knack', LimitType.ENCOUNTER, 1).allowed).toBe(false);
  });
});

// ─── TEST 8: UNLIMITED limit type never blocks ───────────────────────────────

describe('TEST 8: UNLIMITED limit type always allows activation', () => {
  test('UNLIMITED canActivate returns true regardless of usage count', () => {
    const actor = createMockActor();
    // Record many activations
    for (let i = 0; i < 50; i++) {
      ActivationLimitEngine.recordActivation(actor, 'force-push', LimitType.UNLIMITED);
    }
    const check = ActivationLimitEngine.canActivate(actor, 'force-push', LimitType.UNLIMITED, 1);
    expect(check.allowed).toBe(true);
  });

  test('AbilityExecutionRouter with UNLIMITED fires successfully on repeated calls', async () => {
    const actor = createMockActor();
    for (let i = 0; i < 5; i++) {
      const result = await AbilityExecutionRouter.execute({
        abilityId: 'move-object',
        executionType: ExecutionType.FORCE_POWER,
        actor,
        limitType: LimitType.UNLIMITED
      });
      expect(result.success).toBe(true);
      expect(result.limitBlocked).toBe(false);
    }
  });

  test('executeForcePower convenience uses UNLIMITED by default', async () => {
    const actor = createMockActor();
    const r1 = await AbilityExecutionRouter.executeForcePower(actor, 'surge');
    const r2 = await AbilityExecutionRouter.executeForcePower(actor, 'surge');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});
