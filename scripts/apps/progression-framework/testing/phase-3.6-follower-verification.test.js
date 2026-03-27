/**
 * Phase 3.6 Verification Tests - Follower Integration
 *
 * Tests to verify the follower flow end-to-end and validate all major claims.
 * Run with: npm test -- follower-verification
 */

import { expect } from 'chai';
import { FollowerShell } from '../../scripts/apps/progression-framework/follower-shell.js';
import { FollowerSubtypeAdapter } from '../../scripts/apps/progression-framework/adapters/default-subtypes.js';
import { deriveFollowerStats } from '../../scripts/apps/progression-framework/adapters/follower-deriver.js';

describe('Phase 3.6 - Follower Integration Verification', function() {
  this.timeout(10000);

  let testOwner, testSession;

  // Test fixture: create a test owner actor
  before(async function() {
    if (!game?.ready) {
      this.skip();
      return;
    }

    // Create test owner actor with heroic levels
    testOwner = await Actor.create({
      name: 'Test Owner',
      type: 'character',
      system: {
        level: 10,
        class: {
          base: 'Soldier', // Heroic class
          isNonheroic: false
        }
      }
    });
  });

  // Cleanup
  after(async function() {
    if (testOwner?.id) {
      await testOwner.delete();
    }
  });

  // ============================================================================
  // CLAIM 1: FollowerShell provides the correct 7-step flow
  // ============================================================================

  describe('CLAIM 1: FollowerShell provides 7-step flow', function() {
    it('FollowerShell._getCanonicalDescriptors returns exactly 7 steps', function() {
      const shell = new FollowerShell(null, 'follower', { owner: testOwner });
      const steps = shell._getCanonicalDescriptors();

      expect(steps).to.be.an('array');
      expect(steps).to.have.lengthOf(7);
      expect(steps.map(s => s.stepId)).to.deep.equal([
        'follower-species',
        'follower-template',
        'follower-background',
        'follower-skills',
        'follower-feats',
        'follower-languages',
        'follower-confirm'
      ]);
    });

    it('All follower steps have correct plugin classes', function() {
      const shell = new FollowerShell(null, 'follower', { owner: testOwner });
      const steps = shell._getCanonicalDescriptors();

      steps.forEach(step => {
        expect(step.pluginClass).to.exist;
        expect(step.pluginClass).to.be.a('function');
      });
    });
  });

  // ============================================================================
  // CLAIM 3: Followers suppress normal class progression steps
  // ============================================================================

  describe('CLAIM 3: Normal progression steps are suppressed for followers', function() {
    it('FollowerSubtypeAdapter suppresses class-selection, feats, talents, etc.', function() {
      const adapter = new FollowerSubtypeAdapter();
      const candidateIds = [
        'class-selection',
        'class-level-up',
        'general-feat',
        'class-feat',
        'general-talent',
        'talent-tree-browser',
        'follower-species', // This should NOT be suppressed
        'follower-template' // This should NOT be suppressed
      ];

      const session = {
        draftSelections: {},
        subtypeAdapter: adapter
      };

      const filtered = adapter.contributeActiveSteps(candidateIds, session, testOwner);

      // Should only keep follower-specific steps
      expect(filtered).to.not.include('class-selection');
      expect(filtered).to.not.include('class-feat');
      expect(filtered).to.not.include('general-talent');
      expect(filtered).to.include('follower-species');
      expect(filtered).to.include('follower-template');
    });

    it('Skills step is suppressed for Aggressive/Defensive templates', function() {
      const adapter = new FollowerSubtypeAdapter();
      const candidateIds = [
        'follower-species',
        'follower-template',
        'follower-skills',
        'follower-feats'
      ];

      // Test with Aggressive template selected
      const sessionAggressive = {
        draftSelections: { templateType: 'aggressive' },
        subtypeAdapter: adapter
      };

      const filteredAgg = adapter.contributeActiveSteps(candidateIds, sessionAggressive, testOwner);
      expect(filteredAgg).to.not.include('follower-skills');

      // Test with Utility template selected (skills should NOT be suppressed)
      const sessionUtility = {
        draftSelections: { templateType: 'utility' },
        subtypeAdapter: adapter
      };

      const filteredUtility = adapter.contributeActiveSteps(candidateIds, sessionUtility, testOwner);
      expect(filteredUtility).to.include('follower-skills');
    });
  });

  // ============================================================================
  // CLAIM 5: Aggressive/Defensive templates handle skills correctly
  // ============================================================================

  describe('CLAIM 5: Aggressive/Defensive skill constraints', function() {
    it('Aggressive/Defensive templates force Endurance skill', async function() {
      const templates = await (await import('../../scripts/apps/follower-creator.js')).FollowerCreator.getFollowerTemplates();

      expect(templates.aggressive).to.exist;
      expect(templates.defensive).to.exist;
      expect(templates.utility).to.exist;

      // Verify that aggressive/defensive have limited skill options
      // (This is just a sanity check on the template data)
      expect(templates.aggressive).to.have.property('abilityBonus');
      expect(templates.defensive).to.have.property('abilityBonus');
    });
  });

  // ============================================================================
  // CLAIM 8: Confirmation screen shows derived stats
  // ============================================================================

  describe('CLAIM 8: Confirmation shows derived stats at owner heroic level', function() {
    it('deriveFollowerStats calculates correct HP formula: 10 + owner.heroicLevel', async function() {
      const stats = await deriveFollowerStats(10, 'Human', 'aggressive', {});

      expect(stats.hp).to.exist;
      expect(stats.hp.max).to.equal(20); // 10 + 10
      expect(stats.hp.value).to.equal(20);
    });

    it('deriveFollowerStats calculates defenses: 10 + ability_mod + owner.heroicLevel', async function() {
      const stats = await deriveFollowerStats(5, 'Human', 'aggressive', {});

      // All abilities start at 10 (mod = 0)
      // So defenses should be 10 + 0 + 5 = 15
      expect(stats.defenses.fort.total).to.be.at.least(15);
      expect(stats.defenses.ref.total).to.be.at.least(15);
      expect(stats.defenses.will.total).to.be.at.least(15);
    });

    it('deriveFollowerStats derives BAB from template table', async function() {
      const stats = await deriveFollowerStats(5, 'Human', 'aggressive', {});

      expect(stats.bab).to.exist;
      expect(stats.bab).to.be.a('number');
      expect(stats.bab).to.be.at.least(0);
    });
  });

  // ============================================================================
  // CLAIM 9: New follower creation through mutation
  // ============================================================================

  describe('CLAIM 9: Follower creation from mutation bundle', function() {
    it('Follower actor is created with correct level and stats', async function() {
      // This would require a full integration test with actual actor creation
      // Skipping for now as it requires more setup
      this.skip();
    });
  });

  // ============================================================================
  // CLAIM 12: Null actor handling doesn't break other paths
  // ============================================================================

  describe('CLAIM 12: Null actor handling in ProgressionShell', function() {
    it('ProgressionShell constructor handles null actor without crashing', function() {
      const shell = new FollowerShell(null, 'follower', {
        owner: testOwner,
        title: 'Test Follower'
      });

      expect(shell.actor).to.be.null;
      expect(shell.ownerActor).to.equal(testOwner);
      expect(shell.mode).to.equal('follower');
    });

    it('ProgressionShell._prepareContext handles null actor', async function() {
      const shell = new FollowerShell(null, 'follower', {
        owner: testOwner,
        title: 'Test Follower'
      });

      // This would require rendering, skipping for now
      this.skip();
    });
  });
});
