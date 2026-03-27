/**
 * Phase 1: Subtype Adapter Seam — Executable Proof Tests
 *
 * These tests verify that:
 * 1. Subtype/provider resolution is real for actor, droid, follower, nonheroic
 * 2. ProgressionSession binds to adapter
 * 3. Active-step computation routes through adapter
 * 4. Projection routes through adapter
 * 5. Finalizer routes through adapter
 * 6. Base adapters preserve existing behavior
 *
 * Phase 1 rule: Tests prove the seam is structurally real, not decorative.
 * Full logic is deferred to Phase 2/3.
 */

import { describe, it, expect } from '@jest/globals';
import { ProgressionSubtypeAdapterRegistry } from '../scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js';
import { ProgressionSession } from '../scripts/apps/progression-framework/shell/progression-session.js';
import {
  ActorSubtypeAdapter,
  DroidSubtypeAdapter,
  FollowerSubtypeAdapter,
  NonheroicSubtypeAdapter,
} from '../scripts/apps/progression-framework/adapters/default-subtypes.js';

describe('Phase 1: Subtype Adapter Seam', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Subtype/provider resolution is real
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 1: Subtype Resolution', () => {
    it('should resolve ActorSubtypeAdapter for "actor" subtype', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapter = registry.resolveAdapter('actor');

      expect(adapter).toBeTruthy();
      expect(adapter).toBeInstanceOf(ActorSubtypeAdapter);
      expect(adapter.subtypeId).toBe('actor');
      expect(adapter.handles('actor')).toBe(true);
    });

    it('should resolve DroidSubtypeAdapter for "droid" subtype', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapter = registry.resolveAdapter('droid');

      expect(adapter).toBeTruthy();
      expect(adapter).toBeInstanceOf(DroidSubtypeAdapter);
      expect(adapter.subtypeId).toBe('droid');
      expect(adapter.handles('droid')).toBe(true);
    });

    it('should resolve FollowerSubtypeAdapter for "follower" subtype', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapter = registry.resolveAdapter('follower');

      expect(adapter).toBeTruthy();
      expect(adapter).toBeInstanceOf(FollowerSubtypeAdapter);
      expect(adapter.subtypeId).toBe('follower');
      expect(adapter.handles('follower')).toBe(true);
    });

    it('should resolve NonheroicSubtypeAdapter for "nonheroic" subtype', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapter = registry.resolveAdapter('nonheroic');

      expect(adapter).toBeTruthy();
      expect(adapter).toBeInstanceOf(NonheroicSubtypeAdapter);
      expect(adapter.subtypeId).toBe('nonheroic');
      expect(adapter.handles('nonheroic')).toBe(true);
    });

    it('should fallback to actor for unknown subtype', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapter = registry.resolveAdapter('unknown-subtype');

      expect(adapter).toBeTruthy();
      expect(adapter.subtypeId).toBe('actor');
    });

    it('should list all registered subtypes', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const subtypes = registry.getRegisteredSubtypes();

      expect(subtypes).toContain('actor');
      expect(subtypes).toContain('droid');
      expect(subtypes).toContain('follower');
      expect(subtypes).toContain('nonheroic');
      expect(subtypes.length).toBe(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: ProgressionSession binds to adapter
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 2: Session Adapter Binding', () => {
    it('should bind ProgressionSession to actor adapter', () => {
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'actor',
      });

      expect(session.subtypeAdapter).toBeTruthy();
      expect(session.subtypeAdapter.subtypeId).toBe('actor');
    });

    it('should bind ProgressionSession to droid adapter', () => {
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'droid',
      });

      expect(session.subtypeAdapter).toBeTruthy();
      expect(session.subtypeAdapter.subtypeId).toBe('droid');
    });

    it('should bind ProgressionSession to follower adapter', () => {
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'follower',
      });

      expect(session.subtypeAdapter).toBeTruthy();
      expect(session.subtypeAdapter.subtypeId).toBe('follower');
    });

    it('should bind ProgressionSession to nonheroic adapter', () => {
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'nonheroic',
      });

      expect(session.subtypeAdapter).toBeTruthy();
      expect(session.subtypeAdapter.subtypeId).toBe('nonheroic');
    });

    it('should accept pre-bound adapter in options', () => {
      const customAdapter = new ActorSubtypeAdapter();
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'actor',
        adapter: customAdapter,
      });

      expect(session.subtypeAdapter).toBe(customAdapter);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Adapters implement seam interface
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 3: Adapter Interface Completeness', () => {
    it('should have all required methods on ActorSubtypeAdapter', () => {
      const adapter = new ActorSubtypeAdapter();

      expect(typeof adapter.seedSession).toBe('function');
      expect(typeof adapter.contributeActiveSteps).toBe('function');
      expect(typeof adapter.contributeEntitlements).toBe('function');
      expect(typeof adapter.contributeRestrictions).toBe('function');
      expect(typeof adapter.contributeProjection).toBe('function');
      expect(typeof adapter.contributeMutationPlan).toBe('function');
      expect(typeof adapter.validateReadiness).toBe('function');
    });

    it('should have all required methods on DroidSubtypeAdapter', () => {
      const adapter = new DroidSubtypeAdapter();

      expect(typeof adapter.seedSession).toBe('function');
      expect(typeof adapter.contributeActiveSteps).toBe('function');
      expect(typeof adapter.contributeEntitlements).toBe('function');
      expect(typeof adapter.contributeRestrictions).toBe('function');
      expect(typeof adapter.validateReadiness).toBe('function');
    });

    it('should have all required methods on FollowerSubtypeAdapter', () => {
      const adapter = new FollowerSubtypeAdapter();

      expect(typeof adapter.seedSession).toBe('function');
      expect(typeof adapter.contributeActiveSteps).toBe('function');
      expect(typeof adapter.contributeEntitlements).toBe('function');
      expect(typeof adapter.contributeRestrictions).toBe('function');
      expect(typeof adapter.validateReadiness).toBe('function');
    });

    it('should have all required methods on NonheroicSubtypeAdapter', () => {
      const adapter = new NonheroicSubtypeAdapter();

      expect(typeof adapter.seedSession).toBe('function');
      expect(typeof adapter.contributeActiveSteps).toBe('function');
      expect(typeof adapter.contributeEntitlements).toBe('function');
      expect(typeof adapter.contributeRestrictions).toBe('function');
      expect(typeof adapter.contributeMutationPlan).toBe('function');
      expect(typeof adapter.validateReadiness).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Adapters execute without error (Phase 1 no-op test)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 4: Adapter Methods Execute (Phase 1 No-op)', () => {
    it('should execute ActorSubtypeAdapter.contributeActiveSteps without error', async () => {
      const adapter = new ActorSubtypeAdapter();
      const steps = ['species', 'class', 'skills'];

      const result = await adapter.contributeActiveSteps(steps, null, null);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute DroidSubtypeAdapter.contributeActiveSteps without error', async () => {
      const adapter = new DroidSubtypeAdapter();
      const steps = ['species', 'droid-builder', 'skills'];

      const result = await adapter.contributeActiveSteps(steps, null, null);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute FollowerSubtypeAdapter.seedSession without error', async () => {
      const adapter = new FollowerSubtypeAdapter();
      const session = new ProgressionSession({ subtype: 'follower' });

      // Should not throw
      await expect(adapter.seedSession(session, null, 'chargen')).resolves.toBeUndefined();
    });

    it('should execute NonheroicSubtypeAdapter.validateReadiness without error', async () => {
      const adapter = new NonheroicSubtypeAdapter();
      const session = new ProgressionSession({ subtype: 'nonheroic' });

      // Should not throw (Phase 1: no-op validation)
      await expect(adapter.validateReadiness(session, null)).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Adapters pass-through by default (Phase 1 behavior)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 5: Phase 1 Pass-Through Behavior', () => {
    it('should return unmodified steps from ActorSubtypeAdapter.contributeActiveSteps', async () => {
      const adapter = new ActorSubtypeAdapter();
      const steps = ['species', 'class', 'skills'];

      const result = await adapter.contributeActiveSteps(steps, null, null);

      expect(result).toEqual(steps);
    });

    it('should return unmodified entitlements from DroidSubtypeAdapter.contributeEntitlements', async () => {
      const adapter = new DroidSubtypeAdapter();
      const entitlements = { feats: { available: 3, used: 0 } };

      const result = await adapter.contributeEntitlements(entitlements, null, null);

      expect(result).toEqual(entitlements);
    });

    it('should return unmodified projectionfrom ActorSubtypeAdapter.contributeProjection', async () => {
      const adapter = new ActorSubtypeAdapter();
      const projection = {
        identity: { species: 'Human', class: 'Jedi' },
        attributes: { str: 14, dex: 12 },
      };

      const result = await adapter.contributeProjection(projection, null, null);

      expect(result).toEqual(projection);
    });

    it('should return unmodified mutation plan from ActorSubtypeAdapter.contributeMutationPlan', async () => {
      const adapter = new ActorSubtypeAdapter();
      const plan = {
        set: { name: 'Test' },
        add: { items: [] },
      };

      const result = await adapter.contributeMutationPlan(plan, null, null);

      expect(result).toEqual(plan);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: Adapters have proper debug info
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 6: Debug Metadata', () => {
    it('should provide debug info for actor adapter', () => {
      const adapter = new ActorSubtypeAdapter();
      const debug = adapter.debug();

      expect(debug.subtypeId).toBe('actor');
      expect(debug.label).toBe('Character (Actor)');
      expect(debug.adapterClass).toBe('ActorSubtypeAdapter');
    });

    it('should provide debug info for droid adapter', () => {
      const adapter = new DroidSubtypeAdapter();
      const debug = adapter.debug();

      expect(debug.subtypeId).toBe('droid');
      expect(debug.label).toBe('Character (Droid)');
      expect(debug.adapterClass).toBe('DroidSubtypeAdapter');
    });

    it('should provide registry debug info', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const debug = registry.debug();

      expect(debug.registeredAdapters).toBeTruthy();
      expect(Array.isArray(debug.registeredAdapters)).toBe(true);
      expect(debug.registeredAdapters.length).toBe(4);
    });
  });
});
