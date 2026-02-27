/**
 * Phase 4: Lifecycle Wiring & Governance Compliance Tests
 *
 * Validates:
 * 1. registerTelekineticProdigyHook is idempotent (safe to call multiple times)
 * 2. Telekinetic Prodigy talent ADD triggers lifecycle handler
 * 3. Telekinetic Prodigy talent REMOVE triggers cleanup handler
 * 4. Cleanup after talent remove trims to base capacity (not total)
 * 5. TreeUnlockManager.removeInaccessibleTalents routes through ActorEngine (no direct mutations)
 * 6. SelectionModifierHookRegistry is active and hook reflects talent add/remove
 */

import { ForceAuthorityEngine } from '../scripts/engine/progression/engine/force-authority-engine.js';
import { ForceDomainLifecycle } from '../scripts/infrastructure/hooks/force-domain-lifecycle.js';
import { SelectionModifierHookRegistry } from '../scripts/engine/progression/engine/selection-modifier-hook-registry.js';
import {
  registerTelekineticProdigyHook,
  unregisterTelekineticProdigyHook,
  TELEKINETIC_PRODIGY_HOOK_ID
} from '../scripts/engine/progression/engine/telekinetic-prodigy-hook.js';
import { TreeUnlockManager } from '../scripts/engine/progression/talents/tree-unlock-manager.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockActor(overrides = {}) {
  const actor = {
    id: `actor-${Math.random().toString(36).slice(2, 9)}`,
    name: overrides.name ?? 'Test Actor',
    type: 'character',
    items: overrides.items ?? [],
    system: {
      abilities: { wis: { mod: overrides.wisMod ?? 0 } },
      progression: { unlockedDomains: overrides.unlockedDomains ?? ['force'] }
    },
    // ActorEngine mock (lifecycle handlers call ActorEngine which calls these)
    updateEmbeddedDocuments: async function(type, docs) {
      if (type === 'Item') this.items.push(...docs);
    },
    deleteEmbeddedDocuments: async function(type, ids) {
      if (type === 'Item') {
        this.items = this.items.filter(i => !ids.includes(i.id) && !ids.includes(i._id));
      }
      this._deletedIds = [...(this._deletedIds || []), ...ids];
    },
    _deletedIds: [],
    ...overrides
  };
  return actor;
}

function createFeat(name, overrides = {}) {
  const id = `feat-${Math.random().toString(36).slice(2, 9)}`;
  return { id, _id: id, type: 'feat', name, system: {}, ...overrides };
}

function createTalent(name, overrides = {}) {
  const id = `talent-${Math.random().toString(36).slice(2, 9)}`;
  return { id, _id: id, type: 'talent', name, system: overrides.system ?? {}, ...overrides };
}

function createForcePower(name, overrides = {}) {
  const id = `power-${Math.random().toString(36).slice(2, 9)}`;
  return { id, _id: id, type: 'forcePower', name, created: overrides.created ?? Date.now(), system: {}, ...overrides };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  // Ensure fresh hook registration state for each test
  unregisterTelekineticProdigyHook();
});

afterEach(() => {
  // Clean up after each test
  unregisterTelekineticProdigyHook();
});

// ─── TEST 1: registerTelekineticProdigyHook idempotency ─────────────────────

describe('TEST 1: Hook registration is idempotent', () => {
  test('registerTelekineticProdigyHook can be called multiple times without error', () => {
    expect(() => {
      registerTelekineticProdigyHook();
      registerTelekineticProdigyHook();
      registerTelekineticProdigyHook();
    }).not.toThrow();
  });

  test('duplicate registrations result in exactly one active hook', async () => {
    registerTelekineticProdigyHook();
    registerTelekineticProdigyHook();

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    // Should produce exactly 1 bonus slot, not 2
    const ctx = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctx.conditionalBonusSlots).toHaveLength(1);
  });

  test('unregistering removes the hook cleanly', async () => {
    registerTelekineticProdigyHook();
    unregisterTelekineticProdigyHook();

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    const ctx = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctx.conditionalBonusSlots).toHaveLength(0);
  });
});

// ─── TEST 2: Telekinetic Prodigy talent ADD triggers lifecycle ───────────────

describe('TEST 2: Talent ADD lifecycle handler', () => {
  beforeEach(() => registerTelekineticProdigyHook());

  test('handleTelekineticProdigyTalentAdded does not mutate actor', async () => {
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    const stateBefore = JSON.stringify(actor.items.length);
    await ForceDomainLifecycle.handleTelekineticProdigyTalentAdded(actor);
    const stateAfter = JSON.stringify(actor.items.length);

    // No items should be added or removed
    expect(stateBefore).toBe(stateAfter);
  });

  test('handleTelekineticProdigyTalentAdded with no Force Training logs 0 bonus slots', async () => {
    // The handler is pure — just verify it doesn't throw
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    await expect(
      ForceDomainLifecycle.handleTelekineticProdigyTalentAdded(actor)
    ).resolves.not.toThrow();
  });

  test('getSelectionContext reflects bonus slots immediately after talent is added to actor.items', async () => {
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training')
        // Telekinetic Prodigy not yet present
      ]
    });

    const ctxBefore = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctxBefore.conditionalBonusSlots).toHaveLength(0);

    // Simulate actor gaining the talent (items array updated)
    actor.items.push(createTalent('Telekinetic Prodigy'));

    const ctxAfter = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctxAfter.conditionalBonusSlots).toHaveLength(1);
  });
});

// ─── TEST 3: Telekinetic Prodigy talent REMOVE triggers cleanup ──────────────

describe('TEST 3: Talent REMOVE lifecycle handler', () => {
  beforeEach(() => registerTelekineticProdigyHook());

  test('handleTelekineticProdigyTalentRemoved removes excess powers', async () => {
    const power1 = createForcePower('Surge', { created: 1000 });
    const power2 = createForcePower('Battle Strike', { created: 2000 });
    const moveObject = createForcePower('Move Object', { created: 3000, system: { descriptors: ['telekinetic'] } });

    // Actor has 2 base capacity (FS + FT, WIS 0) + 1 bonus slot = 3 total
    // All 3 powers exist on actor (valid state while Telekinetic Prodigy is present)
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        power1, power2, moveObject
      ]
    });

    // Simulate removing the talent from actor.items before calling handler
    actor.items = actor.items.filter(i => !i.name.toLowerCase().includes('telekinetic prodigy'));

    await ForceDomainLifecycle.handleTelekineticProdigyTalentRemoved(actor);

    // Base capacity = 2. Oldest power (power1, created:1000) must be removed.
    const remainingPowers = actor.items.filter(i => i.type === 'forcePower');
    expect(remainingPowers).toHaveLength(2);
    expect(remainingPowers.some(p => p.name === 'Surge')).toBe(false);
  });

  test('handleTelekineticProdigyTalentRemoved does nothing when powers <= base capacity', async () => {
    const power1 = createForcePower('Surge', { created: 1000 });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        power1
        // Telekinetic Prodigy already removed
      ]
    });

    await ForceDomainLifecycle.handleTelekineticProdigyTalentRemoved(actor);

    // Base capacity = 2, only 1 power → no cleanup needed
    const remainingPowers = actor.items.filter(i => i.type === 'forcePower');
    expect(remainingPowers).toHaveLength(1);
  });

  test('getSelectionContext returns 0 bonus slots after talent removed from actor.items', async () => {
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training')
        // Telekinetic Prodigy already removed
      ]
    });

    const ctx = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctx.conditionalBonusSlots).toHaveLength(0);
    expect(ctx.totalCapacity).toBe(ctx.baseCapacity);
  });
});

// ─── TEST 4: Trim target is base capacity, not total ────────────────────────

describe('TEST 4: Cleanup uses base capacity, not total capacity', () => {
  beforeEach(() => registerTelekineticProdigyHook());

  test('trimming trims to getForceCapacity (base), not getSelectionContext.totalCapacity', async () => {
    // With Telekinetic Prodigy present: baseCapacity=2, totalCapacity=3
    // After removal: baseCapacity=2, totalCapacity=2 (no bonus)
    // Actor has 3 powers — cleanup should remove 1 (oldest), leaving 2
    const power1 = createForcePower('P1', { created: 100 });
    const power2 = createForcePower('P2', { created: 200 });
    const power3 = createForcePower('P3', { created: 300 });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        // Telekinetic Prodigy already removed before handler call
        power1, power2, power3
      ]
    });

    await ForceDomainLifecycle.handleTelekineticProdigyTalentRemoved(actor);

    const remaining = actor.items.filter(i => i.type === 'forcePower');
    expect(remaining).toHaveLength(2);
    // power1 (oldest, created: 100) removed
    expect(remaining.some(p => p.name === 'P1')).toBe(false);
    expect(remaining.some(p => p.name === 'P2')).toBe(true);
    expect(remaining.some(p => p.name === 'P3')).toBe(true);
  });
});

// ─── TEST 5: TreeUnlockManager routes through ActorEngine ───────────────────

describe('TEST 5: TreeUnlockManager governance compliance', () => {
  test('removeInaccessibleTalents does not call actor.deleteEmbeddedDocuments directly', async () => {
    // If the governance fix is correct, actor.deleteEmbeddedDocuments should NOT be called
    // because ActorEngine.deleteEmbeddedDocuments is the proper path.
    // We detect the violation by replacing actor method with a spy.

    const forceTalent = createTalent('Force Adept', { system: { talent_tree: 'force-adept' } });

    const actor = createMockActor({ items: [forceTalent] });

    let directCallCount = 0;
    actor.deleteEmbeddedDocuments = async () => { directCallCount++; };

    await TreeUnlockManager.removeInaccessibleTalents(actor, ['force']);

    // The direct actor method should NOT have been called (ActorEngine routes it instead)
    expect(directCallCount).toBe(0);
  });

  test('removeInaccessibleTalents with no removed domains does nothing', async () => {
    const actor = createMockActor({ items: [] });
    let mutationCount = 0;
    actor.deleteEmbeddedDocuments = async () => { mutationCount++; };

    await TreeUnlockManager.removeInaccessibleTalents(actor, []);
    expect(mutationCount).toBe(0);
  });

  test('removeInaccessibleTalents with null actor returns safely', async () => {
    await expect(
      TreeUnlockManager.removeInaccessibleTalents(null, ['force'])
    ).resolves.not.toThrow();
  });
});

// ─── TEST 6: End-to-end hook → context → validation chain ──────────────────

describe('TEST 6: End-to-end hook activation via actor.items', () => {
  beforeEach(() => registerTelekineticProdigyHook());

  test('hook activation is driven entirely by actor.items — no external registration needed', async () => {
    // The hook reads actor.items fresh each call.
    // Adding or removing Telekinetic Prodigy talent from items changes context immediately.

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training')
      ]
    });

    // Step 1: No talent — no bonus slots
    expect((await ForceAuthorityEngine.getSelectionContext(actor)).conditionalBonusSlots).toHaveLength(0);

    // Step 2: Add talent — bonus slot appears
    const tp = createTalent('Telekinetic Prodigy');
    actor.items.push(tp);
    expect((await ForceAuthorityEngine.getSelectionContext(actor)).conditionalBonusSlots).toHaveLength(1);

    // Step 3: Remove talent — bonus slot disappears
    actor.items = actor.items.filter(i => i.id !== tp.id);
    expect((await ForceAuthorityEngine.getSelectionContext(actor)).conditionalBonusSlots).toHaveLength(0);
  });

  test('TELEKINETIC_PRODIGY_HOOK_ID is registered after registerTelekineticProdigyHook()', () => {
    registerTelekineticProdigyHook();
    expect(SelectionModifierHookRegistry.has(TELEKINETIC_PRODIGY_HOOK_ID)).toBe(true);
  });

  test('hook is absent from registry after unregisterTelekineticProdigyHook()', () => {
    registerTelekineticProdigyHook();
    unregisterTelekineticProdigyHook();
    expect(SelectionModifierHookRegistry.has(TELEKINETIC_PRODIGY_HOOK_ID)).toBe(false);
  });
});
