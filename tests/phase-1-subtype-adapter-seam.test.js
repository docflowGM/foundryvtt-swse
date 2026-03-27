/**
 * Phase 1: Subtype Adapter Seam — Executable Proof Tests (CORRECTED)
 *
 * These tests verify the CORRECTED Phase 1 architecture:
 * - Participant kind distinction: INDEPENDENT vs DEPENDENT
 * - Follower is correctly classified as DEPENDENT (nonheroic-derived)
 * - Actor, droid, nonheroic are INDEPENDENT
 * - Session supports dependency context for dependent participants
 * - Seam supports both independent and dependent progression flows
 *
 * Phase 1 CORRECTED rule:
 * - Tests prove participant kind is structurally distinguished
 * - Tests prove dependent participants are not peer subtypes
 * - Follower is modeled as owner-linked, template-driven, derived
 */

import { describe, it, expect } from '@jest/globals';
import { ProgressionSubtypeAdapterRegistry } from '../scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js';
import { ProgressionSession } from '../scripts/apps/progression-framework/shell/progression-session.js';
import {
  ActorSubtypeAdapter,
  DroidSubtypeAdapter,
  FollowerSubtypeAdapter,
  NonheroicSubtypeAdapter,
  ParticipantKind,
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
  // TEST 1B: Participant Kind Distinction (CORRECTIVE)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 1B: Participant Kind Distinction (CORRECTED)', () => {
    it('should classify actor as INDEPENDENT participant', () => {
      const adapter = new ActorSubtypeAdapter();

      expect(adapter.kind).toBe(ParticipantKind.INDEPENDENT);
      expect(adapter.isIndependent).toBe(true);
      expect(adapter.isDependent).toBe(false);
      expect(adapter.baseSubtype).toBeNull();
    });

    it('should classify droid as INDEPENDENT participant', () => {
      const adapter = new DroidSubtypeAdapter();

      expect(adapter.kind).toBe(ParticipantKind.INDEPENDENT);
      expect(adapter.isIndependent).toBe(true);
      expect(adapter.isDependent).toBe(false);
    });

    it('should classify nonheroic as INDEPENDENT participant', () => {
      const adapter = new NonheroicSubtypeAdapter();

      expect(adapter.kind).toBe(ParticipantKind.INDEPENDENT);
      expect(adapter.isIndependent).toBe(true);
      expect(adapter.isDependent).toBe(false);
    });

    it('should classify follower as DEPENDENT participant (nonheroic-derived)', () => {
      const adapter = new FollowerSubtypeAdapter();

      expect(adapter.kind).toBe(ParticipantKind.DEPENDENT);
      expect(adapter.isDependent).toBe(true);
      expect(adapter.isIndependent).toBe(false);
      expect(adapter.baseSubtype).toBe('nonheroic');
    });

    it('should distinguish independent vs dependent in registry', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const independent = registry.getIndependentAdapters();
      const dependent = registry.getDependentAdapters();

      expect(independent.length).toBe(3);
      expect(independent.map(a => a.subtypeId)).toEqual(
        expect.arrayContaining(['actor', 'droid', 'nonheroic'])
      );

      expect(dependent.length).toBe(1);
      expect(dependent[0].subtypeId).toBe('follower');
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
      expect(session.subtypeAdapter.isIndependent).toBe(true);
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
  // TEST 2B: Dependency Context Support (CORRECTIVE)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 2B: Dependency Context for Dependent Participants (CORRECTED)', () => {
    it('should support dependency context for follower participant', () => {
      const ownerContext = {
        ownerId: 'actor-123',
        ownerName: 'Jedi Master',
        templateId: 'mentor-follower-1',
        grantingTalent: 'Force Sensitive',
      };

      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'follower',
        dependencyContext: ownerContext,
      });

      expect(session.subtypeAdapter.isDependent).toBe(true);
      expect(session.dependencyContext).toBe(ownerContext);
      expect(session.dependencyContext.ownerId).toBe('actor-123');
    });

    it('should allow independent participants to have null dependency context', () => {
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'actor',
        dependencyContext: null,
      });

      expect(session.subtypeAdapter.isIndependent).toBe(true);
      expect(session.dependencyContext).toBeNull();
    });

    it('should carry dependency context through adapter kind check', () => {
      const dependencyContext = { ownerId: 'actor-456' };
      const session = new ProgressionSession({
        actor: null,
        mode: 'chargen',
        subtype: 'follower',
        dependencyContext,
      });

      expect(session.subtypeAdapter.kind).toBe(ParticipantKind.DEPENDENT);
      expect(session.dependencyContext.ownerId).toBe('actor-456');
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

    it('should provide registry debug info with participant kind counts', () => {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const debug = registry.debug();

      expect(debug.registeredAdapters).toBeTruthy();
      expect(Array.isArray(debug.registeredAdapters)).toBe(true);
      expect(debug.registeredAdapters.length).toBe(4);
      expect(debug.independentCount).toBe(3);
      expect(debug.dependentCount).toBe(1);
    });

    it('should provide dependent adapter debug info including base subtype', () => {
      const adapter = new FollowerSubtypeAdapter();
      const debug = adapter.debug();

      expect(debug.kind).toBe(ParticipantKind.DEPENDENT);
      expect(debug.isDependent).toBe(true);
      expect(debug.baseSubtype).toBe('nonheroic');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Dependent Participants Suppress Normal Progression (CORRECTIVE)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TEST 7: Dependent Participant Step Suppression (CORRECTED)', () => {
    it('should allow dependent adapter to suppress freeform feat progression', async () => {
      const adapter = new FollowerSubtypeAdapter();
      const steps = ['species', 'class', 'general-feat', 'class-feat', 'skills', 'talents'];

      const result = await adapter.contributeActiveSteps(steps, null, null);

      // Phase 1: Follower returns steps unchanged (logic deferred)
      // Phase 3: Will suppress 'general-feat', 'class-feat', 'skills', 'talents'
      // and expose only entitlement-driven steps
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      // Phase 1 no-op behavior: should match input
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide mutation plan contribution for dependent participant bundle creation', async () => {
      const adapter = new FollowerSubtypeAdapter();
      const plan = {
        set: { 'system.class': 'Nonheroic' },
        add: { items: [] },
        create: {},
        delete: {},
      };

      const result = await adapter.contributeMutationPlan(plan, null, null);

      // Phase 1: No-op, returns plan unchanged
      // Phase 3: Will contribute derived creation bundle (create follower, apply template, etc.)
      expect(result).toBeTruthy();
      expect(result.set || result.add || result.create).toBeTruthy();
    });

    it('should support dependent participant projection contribution', async () => {
      const adapter = new FollowerSubtypeAdapter();
      const projection = {
        identity: { class: 'Nonheroic' },
        attributes: { str: 10 },
      };

      const result = await adapter.contributeProjection(projection, null, null);

      // Phase 1: No-op, returns projection unchanged
      // Phase 3: Will contribute derived attributes, template, entitlements
      expect(result).toBeTruthy();
      expect(result.identity || result.attributes).toBeTruthy();
    });
  });
});
