/**
 * Phase 3.5: Talent Selection Infrastructure Tests
 *
 * Validates the SelectionModifierHook system, SelectionContext derivation,
 * Telekinetic Prodigy integration, and lifecycle safety.
 *
 * 8 required scenarios:
 * 1. Telekinetic Prodigy + 1 Force Training → 1 conditional bonus slot
 * 2. Telekinetic Prodigy + 2 Force Trainings → 2 conditional bonus slots (per-instance)
 * 3. Move Object not selected → selection at base capacity still valid (no bonus required)
 * 4. Removing Telekinetic Prodigy → overflow handled (powers trimmed to base capacity)
 * 5. Removing one Force Training → instance-aware (one bonus slot disappears, base also reduced)
 * 6. Suite reselection interaction → validator enforces conditional slots during reselection
 * 7. Descriptor restriction enforced → non-telekinetic power rejected for bonus slot
 * 8. No direct mutation bypass → ForceSlotValidator always gates mutation
 */

import { ForceAuthorityEngine } from '../scripts/engine/progression/engine/force-authority-engine.js';
import { ForceSlotValidator } from '../scripts/engine/progression/engine/force-slot-validator.js';
import { ForceDomainLifecycle } from '../scripts/infrastructure/hooks/force-domain-lifecycle.js';
import { SelectionModifierHookRegistry } from '../scripts/engine/progression/engine/selection-modifier-hook-registry.js';
import {
  registerTelekineticProdigyHook,
  unregisterTelekineticProdigyHook,
  TELEKINETIC_PRODIGY_HOOK_ID
} from '../scripts/engine/progression/engine/telekinetic-prodigy-hook.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockActor(overrides = {}) {
  const actor = {
    id: `actor-${Math.random().toString(36).slice(2, 9)}`,
    type: 'character',
    name: overrides.name ?? 'Test Actor',
    items: overrides.items ?? [],
    system: {
      abilities: {
        wis: { mod: overrides.wisMod ?? 0 },
        cha: { mod: overrides.chaMod ?? 0 }
      },
      progression: {
        unlockedDomains: overrides.unlockedDomains ?? ['force']
      },
      ...overrides.system
    },
    // Minimal ActorEngine mock stubs (lifecycle handlers call these via ActorEngine)
    updateEmbeddedDocuments: async function(type, docs) {
      if (type === 'Item') this.items.push(...docs);
    },
    deleteEmbeddedDocuments: async function(type, ids) {
      if (type === 'Item') {
        this.items = this.items.filter(i => !ids.includes(i.id) && !ids.includes(i._id));
      }
    },
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
  return { id, _id: id, type: 'talent', name, system: {}, ...overrides };
}

function createForcePower(name, overrides = {}) {
  const id = `power-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id, _id: id,
    type: 'forcePower',
    name,
    created: overrides.created ?? Date.now(),
    system: overrides.system ?? {},
    ...overrides
  };
}

function createTelekineticPower(name = 'Move Object', overrides = {}) {
  return createForcePower(name, {
    system: { descriptors: ['telekinetic'] },
    ...overrides
  });
}

// ─── Test Setup / Teardown ───────────────────────────────────────────────────

beforeAll(() => {
  // Register Telekinetic Prodigy hook once for all tests
  registerTelekineticProdigyHook();
});

afterAll(() => {
  // Clean up hook after suite
  unregisterTelekineticProdigyHook();
});

// ─── SCENARIO 1 ──────────────────────────────────────────────────────────────

describe('SCENARIO 1: Telekinetic Prodigy + 1 Force Training → 1 bonus slot', () => {
  test('getSelectionContext returns 1 conditional bonus slot', async () => {
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    const ctx = await ForceAuthorityEngine.getSelectionContext(actor);

    // Base: 1 (FS) + 1*(1+0) (FT) = 2. Bonus: 1 (one FT instance).
    expect(ctx.baseCapacity).toBe(2);
    expect(ctx.conditionalBonusSlots).toHaveLength(1);
    expect(ctx.totalCapacity).toBe(3);
    expect(ctx.conditionalBonusSlots[0].sourceHookId).toBe(TELEKINETIC_PRODIGY_HOOK_ID);
    expect(ctx.conditionalBonusSlots[0].sourceFeatInstanceIndex).toBe(0);
    expect(ctx.conditionalBonusSlots[0].descriptorRestrictions).toContain('telekinetic');
  });

  test('bonus slot is absent when Telekinetic Prodigy talent is not present', async () => {
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training')
        // NO Telekinetic Prodigy
      ]
    });

    const ctx = await ForceAuthorityEngine.getSelectionContext(actor);

    expect(ctx.baseCapacity).toBe(2);
    expect(ctx.conditionalBonusSlots).toHaveLength(0);
    expect(ctx.totalCapacity).toBe(2);
  });
});

// ─── SCENARIO 2 ──────────────────────────────────────────────────────────────

describe('SCENARIO 2: Telekinetic Prodigy + 2 Force Trainings → 2 bonus slots (per-instance)', () => {
  test('getSelectionContext returns one bonus slot per Force Training feat', async () => {
    const actor = createMockActor({
      wisMod: 1,
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    const ctx = await ForceAuthorityEngine.getSelectionContext(actor);

    // Base: 1 + 2*(1+1) = 5. Bonus: 2 (one per FT instance).
    expect(ctx.baseCapacity).toBe(5);
    expect(ctx.conditionalBonusSlots).toHaveLength(2);
    expect(ctx.totalCapacity).toBe(7);

    // Each slot tracks its Force Training instance index
    expect(ctx.conditionalBonusSlots[0].sourceFeatInstanceIndex).toBe(0);
    expect(ctx.conditionalBonusSlots[1].sourceFeatInstanceIndex).toBe(1);
  });

  test('selecting base + 2 telekinetic powers passes validation', async () => {
    const power1 = createForcePower('Surge');
    const power2 = createForcePower('Battle Strike');
    const power3 = createForcePower('Force Slam');
    const power4 = createForcePower('Force Thrust');
    const power5 = createForcePower('Force Grip');
    const moveObject1 = createTelekineticPower('Move Object');
    const moveObject2 = createTelekineticPower('Telekinetic Reach');

    const actor = createMockActor({
      wisMod: 1,
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        power1, power2, power3, power4, power5,
        moveObject1, moveObject2
      ]
    });

    // totalCapacity = 7; select all 7 (5 base + 2 telekinetic bonus)
    const powerIds = [power1.id, power2.id, power3.id, power4.id, power5.id, moveObject1.id, moveObject2.id];
    const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

    expect(result.valid).toBe(true);
    expect(result.capacityUsed).toBe(7);
  });
});

// ─── SCENARIO 3 ──────────────────────────────────────────────────────────────

describe('SCENARIO 3: Move Object not selected → base-only selection still valid', () => {
  test('selecting fewer than totalCapacity with no bonus powers is valid', async () => {
    const power1 = createForcePower('Surge');
    const power2 = createForcePower('Battle Strike');

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        power1, power2
      ]
    });

    // totalCapacity = 3, selecting 2 (within base capacity 2, no bonus needed)
    const powerIds = [power1.id, power2.id];
    const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

    expect(result.valid).toBe(true);
    expect(result.capacityUsed).toBe(2);
  });

  test('selecting exactly baseCapacity non-telekinetic powers is valid', async () => {
    const powers = Array.from({ length: 2 }, (_, i) => createForcePower(`Power ${i + 1}`));

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        ...powers
      ]
    });

    const powerIds = powers.map(p => p.id);
    const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

    expect(result.valid).toBe(true);
  });
});

// ─── SCENARIO 4 ──────────────────────────────────────────────────────────────

describe('SCENARIO 4: Removing Telekinetic Prodigy → overflow handled', () => {
  test('powers beyond base capacity are removed when talent is removed', async () => {
    const power1 = createForcePower('Surge', { created: 1000 });
    const power2 = createForcePower('Battle Strike', { created: 2000 });
    const moveObject = createTelekineticPower('Move Object', { created: 3000 });

    // Actor has 2 base capacity (FS + FT, WIS 0) + 1 bonus slot
    // Total 3 powers selected (valid with Telekinetic Prodigy)
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        power1, power2, moveObject
      ]
    });

    // Remove Telekinetic Prodigy talent
    actor.items = actor.items.filter(i => !i.name.toLowerCase().includes('telekinetic prodigy'));

    await ForceDomainLifecycle.handleTelekineticProdigyTalentRemoved(actor);

    // Base capacity = 2 (FS + FT). Oldest power (power1, created:1000) must be removed.
    const remainingPowers = actor.items.filter(i => i.type === 'forcePower');
    expect(remainingPowers).toHaveLength(2);
    // power1 (oldest) removed; power2 and moveObject remain
    expect(remainingPowers.find(p => p.name === 'Surge')).toBeUndefined();
  });

  test('getSelectionContext returns 0 bonus slots after talent removed', async () => {
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

// ─── SCENARIO 5 ──────────────────────────────────────────────────────────────

describe('SCENARIO 5: Removing one Force Training → instance-aware recalculation', () => {
  test('removing one Force Training reduces both base capacity and bonus slot count', async () => {
    const actor = createMockActor({
      wisMod: 1,
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    // Before removal: base=5, bonus=2, total=7
    const ctxBefore = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctxBefore.baseCapacity).toBe(5);
    expect(ctxBefore.conditionalBonusSlots).toHaveLength(2);
    expect(ctxBefore.totalCapacity).toBe(7);

    // Remove one Force Training feat
    const ftIndex = actor.items.findIndex(
      i => i.type === 'feat' && i.name.toLowerCase().includes('force training')
    );
    actor.items.splice(ftIndex, 1);

    // After removal: base=3, bonus=1, total=4
    const ctxAfter = await ForceAuthorityEngine.getSelectionContext(actor);
    expect(ctxAfter.baseCapacity).toBe(3);
    expect(ctxAfter.conditionalBonusSlots).toHaveLength(1);
    expect(ctxAfter.totalCapacity).toBe(4);
  });

  test('lifecycle handler trims excess powers after Force Training removal', async () => {
    const powers = Array.from({ length: 5 }, (_, i) =>
      createForcePower(`Power ${i + 1}`, { created: (i + 1) * 1000 })
    );

    const actor = createMockActor({
      wisMod: 1,
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        ...powers
      ]
    });

    // Remove one Force Training feat (base drops from 5→3)
    const ftIndex = actor.items.findIndex(
      i => i.type === 'feat' && i.name.toLowerCase().includes('force training')
    );
    actor.items.splice(ftIndex, 1);

    await ForceDomainLifecycle.handleForceTrainingFeatRemoved(actor);

    // Base capacity is now 3 (FS + 1 FT, WIS 1). Oldest 2 powers trimmed.
    const remainingPowers = actor.items.filter(i => i.type === 'forcePower');
    expect(remainingPowers).toHaveLength(3);
    // Powers 1 and 2 (oldest) removed; Powers 3, 4, 5 remain
    expect(remainingPowers.some(p => p.name === 'Power 1')).toBe(false);
    expect(remainingPowers.some(p => p.name === 'Power 2')).toBe(false);
    expect(remainingPowers.some(p => p.name === 'Power 3')).toBe(true);
  });
});

// ─── SCENARIO 6 ──────────────────────────────────────────────────────────────

describe('SCENARIO 6: Suite reselection interaction', () => {
  test('ForceSlotValidator enforces conditional slots during reselection context', async () => {
    const basePower1 = createForcePower('Surge');
    const basePower2 = createForcePower('Battle Strike');
    const telekinPower = createTelekineticPower('Move Object');

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        basePower1, basePower2, telekinPower
      ]
    });

    // totalCapacity = 3; selecting all 3 (2 base + 1 telekinetic bonus)
    const powerIds = [basePower1.id, basePower2.id, telekinPower.id];
    const result = await ForceSlotValidator.validateBeforeApply(actor, powerIds);

    expect(result.valid).toBe(true);
    expect(result.capacityUsed).toBe(3);
    // selectionContext is exposed for reselection orchestrator
    expect(result.selectionContext).toBeDefined();
    expect(result.selectionContext.conditionalBonusSlots).toHaveLength(1);
    expect(result.selectionContext.totalCapacity).toBe(3);
  });

  test('ForceSlotValidator blocks over-total-capacity selection during reselection', async () => {
    const powers = Array.from({ length: 4 }, (_, i) => createForcePower(`Power ${i + 1}`));

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        ...powers
      ]
    });

    // totalCapacity = 3 but trying to select 4
    const powerIds = powers.map(p => p.id);
    const result = await ForceSlotValidator.validateBeforeApply(actor, powerIds);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('capacity');
  });
});

// ─── SCENARIO 7 ──────────────────────────────────────────────────────────────

describe('SCENARIO 7: Descriptor restriction enforced', () => {
  test('non-telekinetic power rejected when it would need to fill a bonus slot', async () => {
    const basePower1 = createForcePower('Surge');
    const basePower2 = createForcePower('Battle Strike');
    // This power has NO telekinetic descriptor
    const nonTelekinPower = createForcePower('Force Lightning', {
      system: { descriptors: ['dark-side'] }
    });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        basePower1, basePower2, nonTelekinPower
      ]
    });

    // baseCapacity = 2, totalCapacity = 3. Selecting 3, but the 3rd is not telekinetic.
    const powerIds = [basePower1.id, basePower2.id, nonTelekinPower.id];
    const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/descriptor restriction/i);
  });

  test('telekinetic-descriptor power (not Move Object by name) accepted for bonus slot', async () => {
    const basePower1 = createForcePower('Surge');
    const basePower2 = createForcePower('Battle Strike');
    // Different name but has the telekinetic descriptor
    const telekinPower = createForcePower('Telekinetic Reach', {
      system: { descriptors: ['telekinetic'] }
    });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        basePower1, basePower2, telekinPower
      ]
    });

    const powerIds = [basePower1.id, basePower2.id, telekinPower.id];
    const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

    expect(result.valid).toBe(true);
  });

  test('Move Object (by name) accepted for bonus slot without descriptor field', async () => {
    const basePower1 = createForcePower('Surge');
    const basePower2 = createForcePower('Battle Strike');
    // Name matches powerNameHint but has no descriptor field
    const moveObject = createForcePower('Move Object', { system: {} });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        basePower1, basePower2, moveObject
      ]
    });

    const powerIds = [basePower1.id, basePower2.id, moveObject.id];
    const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

    expect(result.valid).toBe(true);
  });
});

// ─── SCENARIO 8 ──────────────────────────────────────────────────────────────

describe('SCENARIO 8: No direct mutation bypass possible', () => {
  test('ForceSlotValidator blocks mutation when domain not unlocked', async () => {
    const power1 = createForcePower('Surge');

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        power1
      ],
      unlockedDomains: [] // Domain NOT unlocked
    });

    const result = await ForceSlotValidator.validateBeforeApply(actor, [power1.id]);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('ForceSlotValidator blocks mutation when bonus slot descriptor violated', async () => {
    const basePower1 = createForcePower('Surge');
    const basePower2 = createForcePower('Battle Strike');
    const nonTelekin = createForcePower('Force Lightning', {
      system: { descriptors: ['dark-side'] }
    });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        basePower1, basePower2, nonTelekin
      ]
    });

    const result = await ForceSlotValidator.validateBeforeApply(
      actor,
      [basePower1.id, basePower2.id, nonTelekin.id]
    );

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/descriptor restriction/i);
  });

  test('SelectionModifierHookRegistry pure derivation: getSelectionContext does not mutate actor', async () => {
    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy')
      ]
    });

    const stateBefore = JSON.stringify(actor);
    await ForceAuthorityEngine.getSelectionContext(actor);
    const stateAfter = JSON.stringify(actor);

    expect(stateBefore).toBe(stateAfter);
  });

  test('validateForceSelection does not mutate actor even with bonus slot logic', async () => {
    const power = createForcePower('Move Object', { system: { descriptors: ['telekinetic'] } });

    const actor = createMockActor({
      items: [
        createFeat('Force Sensitivity'),
        createFeat('Force Training'),
        createTalent('Telekinetic Prodigy'),
        power
      ]
    });

    const stateBefore = JSON.stringify(actor);
    await ForceAuthorityEngine.validateForceSelection(actor, [power.id]);
    const stateAfter = JSON.stringify(actor);

    expect(stateBefore).toBe(stateAfter);
  });
});
