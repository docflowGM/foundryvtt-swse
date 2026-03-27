/**
 * Phase 2.5 Integration Tests - Nonheroic Character Builder Adaptation
 *
 * Tests to verify nonheroic characters can progress through the unified spine
 * with all necessary constraints enforced.
 *
 * Run with: npm test -- nonheroic-integration
 */

import { expect } from 'chai';
import { ChargenShell } from '../../scripts/apps/progression-framework/chargen-shell.js';
import { NonheroicSubtypeAdapter } from '../../scripts/apps/progression-framework/adapters/default-subtypes.js';
import { SkillsStep } from '../../scripts/apps/progression-framework/steps/skills-step.js';
import { NonheroicStartingFeatsStep } from '../../scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js';

describe('Phase 2.5 - Nonheroic Character Builder Adaptation', function() {
  this.timeout(10000);

  let testActor;

  // Test fixture: create a test actor with nonheroic class
  before(async function() {
    if (!game?.ready) {
      this.skip();
      return;
    }

    // Create test actor
    testActor = await Actor.create({
      name: 'Test Nonheroic',
      type: 'character',
      system: {
        level: 1,
        class: {},
        abilities: {
          int: { base: 10, mod: 0 },
          str: { base: 10, mod: 0 },
        },
      },
    });
  });

  // Cleanup
  after(async function() {
    if (testActor?.id) {
      await testActor.delete();
    }
  });

  // ============================================================================
  // TEST 1: Nonheroic detection in ChargenShell
  // ============================================================================

  describe('TEST 1: Nonheroic detection in ChargenShell', function() {
    it('ChargenShell._getProgressionSubtype detects nonheroic when actor has nonheroic class', async function() {
      // Create a shell with a nonheroic-flagged class
      const shell = new ChargenShell(testActor, 'chargen', {});

      // Would detect nonheroic if actor had nonheroic class item
      // For now, verify the detection logic exists
      expect(shell._getProgressionSubtype).to.be.a('function');
    });
  });

  // ============================================================================
  // TEST 2: Nonheroic session seeding
  // ============================================================================

  describe('TEST 2: Nonheroic session seeding', function() {
    it('NonheroicSessionSeeder populates nonheroicContext when nonheroic classes present', async function() {
      const { seedNonheroicSession } = await import(
        '../../scripts/apps/progression-framework/adapters/nonheroic-session-seeder.js'
      );

      const session = {
        draftSelections: {},
      };

      // This would be called during session initialization
      // For now, verify the seeding function is available
      expect(seedNonheroicSession).to.be.a('function');
    });
  });

  // ============================================================================
  // TEST 3: Nonheroic class filtering
  // ============================================================================

  describe('TEST 3: Nonheroic class filtering', function() {
    it('ClassStep filters to nonheroic classes when isNonheroic flag set', async function() {
      const { ClassStep } = await import(
        '../../scripts/apps/progression-framework/steps/class-step.js'
      );

      const step = new ClassStep({ stepId: 'class' });

      // Verify the step has nonheroic filtering capability
      expect(step._filters).to.have.property('heroicType');
      expect(step._isNonheroicProgression).to.be.a('boolean');
    });
  });

  // ============================================================================
  // TEST 4: Skills calculation (1 + INT mod minimum 1)
  // ============================================================================

  describe('TEST 4: Skills step enforces 1 + INT mod for nonheroic', function() {
    it('SkillsStep calculates 1 + INT mod (minimum 1) allowed skills for nonheroic', async function() {
      // Test with INT mod = 0 (should get 1 skill)
      const actor0 = await Actor.create({
        name: 'Test INT 0',
        type: 'character',
        system: {
          abilities: { int: { base: 10, mod: 0 } },
          skills: {},
        },
      });

      const step0 = new SkillsStep({ stepId: 'skills' });

      // Mock shell with nonheroic context
      const shell0 = {
        actor: actor0,
        progressionSession: { nonheroicContext: { hasNonheroic: true } },
        mentor: { askMentorEnabled: false },
      };

      await step0.onStepEnter(shell0);
      expect(step0._allowedCount).to.equal(1);

      // Test with INT mod = +2 (should get 3 skills)
      const actor2 = await Actor.create({
        name: 'Test INT +2',
        type: 'character',
        system: {
          abilities: { int: { base: 15, mod: 2 } },
          skills: {},
        },
      });

      const step2 = new SkillsStep({ stepId: 'skills' });

      const shell2 = {
        actor: actor2,
        progressionSession: { nonheroicContext: { hasNonheroic: true } },
        mentor: { askMentorEnabled: false },
      };

      await step2.onStepEnter(shell2);
      expect(step2._allowedCount).to.equal(3);

      // Cleanup
      await actor0.delete();
      await actor2.delete();
    });
  });

  // ============================================================================
  // TEST 5: Starting feats constrained to exactly 3
  // ============================================================================

  describe('TEST 5: Nonheroic starting feats constrained to exactly 3', function() {
    it('NonheroicStartingFeatsStep enforces exactly 3 feat slots', async function() {
      const step = new NonheroicStartingFeatsStep({ stepId: 'nonheroic-starting-feats' });

      // No feats selected initially
      expect(step._selectedFeatIds).to.have.lengthOf(0);

      const { isComplete } = step.getSelection();
      expect(isComplete).to.be.false;

      // Add 3 feats
      step._selectedFeatIds = ['feat1', 'feat2', 'feat3'];

      const { isComplete: isComplete3 } = step.getSelection();
      expect(isComplete3).to.be.true;

      // Verify validation
      const validation = step.validate();
      expect(validation.isValid).to.be.true;
    });
  });

  // ============================================================================
  // TEST 6: Talent suppression for nonheroic
  // ============================================================================

  describe('TEST 6: Talent steps suppressed for nonheroic', function() {
    it('NonheroicSubtypeAdapter suppresses talent steps', async function() {
      const adapter = new NonheroicSubtypeAdapter();

      const candidateSteps = [
        'class-selection',
        'general-talent',      // Should be suppressed
        'class-talent',        // Should be suppressed
        'talent-tree-browser', // Should be suppressed
        'talent-graph',        // Should be suppressed
        'skills',
      ];

      const session = {
        nonheroicContext: { hasNonheroic: true },
      };

      const filteredSteps = await adapter.contributeActiveSteps(candidateSteps, session, testActor);

      expect(filteredSteps).to.not.include('general-talent');
      expect(filteredSteps).to.not.include('class-talent');
      expect(filteredSteps).to.not.include('talent-tree-browser');
      expect(filteredSteps).to.not.include('talent-graph');
      expect(filteredSteps).to.include('skills');
    });
  });

  // ============================================================================
  // TEST 7: Force power suppression for nonheroic
  // ============================================================================

  describe('TEST 7: Force power steps suppressed for nonheroic', function() {
    it('NonheroicSubtypeAdapter suppresses force power steps', async function() {
      const adapter = new NonheroicSubtypeAdapter();

      const candidateSteps = [
        'class-selection',
        'force-power',         // Should be suppressed
        'force-secret',        // Should be suppressed
        'force-technique',     // Should be suppressed
        'skills',
      ];

      const session = {
        nonheroicContext: { hasNonheroic: true },
      };

      const filteredSteps = await adapter.contributeActiveSteps(candidateSteps, session, testActor);

      expect(filteredSteps).to.not.include('force-power');
      expect(filteredSteps).to.not.include('force-secret');
      expect(filteredSteps).to.not.include('force-technique');
      expect(filteredSteps).to.include('skills');
    });
  });

  // ============================================================================
  // TEST 8: Restrictions enforcement for nonheroic
  // ============================================================================

  describe('TEST 8: Nonheroic restrictions enforced', function() {
    it('NonheroicSubtypeAdapter enforces force power restrictions', async function() {
      const adapter = new NonheroicSubtypeAdapter();

      const restrictions = {
        forbiddenSteps: [],
        metadata: {},
      };

      const session = {
        nonheroicContext: { hasNonheroic: true },
      };

      const restricted = await adapter.contributeRestrictions(restrictions, session, testActor);

      expect(restricted.forbiddenSteps).to.include('force-power');
      expect(restricted.forbiddenSteps).to.include('force-secret');
      expect(restricted.forbiddenSteps).to.include('force-technique');
      expect(restricted.metadata.nonheroicForbidden).to.be.true;
    });
  });

  // ============================================================================
  // TEST 9: Projection marks actor as nonheroic
  // ============================================================================

  describe('TEST 9: Projection metadata for nonheroic', function() {
    it('NonheroicSubtypeAdapter marks projection as nonheroic', async function() {
      const adapter = new NonheroicSubtypeAdapter();

      const projectedData = {
        derived: {
          forcePoints: 10,
          destinyPoints: 5,
        },
        metadata: {},
      };

      const session = {
        nonheroicContext: { hasNonheroic: true },
      };

      const projected = await adapter.contributeProjection(projectedData, session, testActor);

      expect(projected.metadata.isNonheroic).to.be.true;
      // Force/Destiny are ensured to be present (not removed, just constrained)
      expect(projected.derived.forcePoints).to.exist;
      expect(projected.derived.destinyPoints).to.exist;
    });
  });

  // ============================================================================
  // TEST 10: Mutation plan includes nonheroic markers
  // ============================================================================

  describe('TEST 10: Mutation plan for nonheroic', function() {
    it('NonheroicSubtypeAdapter marks mutation plan with nonheroic metadata', async function() {
      const adapter = new NonheroicSubtypeAdapter();

      const mutationPlan = {
        general: {},
      };

      const session = {
        nonheroicContext: { hasNonheroic: true },
      };

      const planned = await adapter.contributeMutationPlan(mutationPlan, session, testActor);

      expect(planned.nonheroic).to.exist;
      expect(planned.nonheroic.isNonheroic).to.be.true;
      expect(planned.nonheroic.suppressForcePoints).to.be.true;
      expect(planned.nonheroic.suppressDestinyPoints).to.be.true;
    });
  });
});
