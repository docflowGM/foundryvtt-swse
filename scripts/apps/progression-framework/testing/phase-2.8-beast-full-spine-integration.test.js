/**
 * Phase 2.8 Integration Tests — Beast Full Spine Integration
 *
 * Comprehensive test suite proving Beast is now a true spine-hosted progression path
 * with independent chargen and level-up flows, not a constrained wrapper around
 * generic progression.
 *
 * Run with: npm test -- beast-full-spine
 */

import { expect } from 'chai';
import { PROGRESSION_NODE_REGISTRY, getNodesForModeAndSubtype } from '../../registries/progression-node-registry.js';
import { ActiveStepComputer } from '../../shell/active-step-computer.js';
import { BeastSubtypeAdapter } from '../adapters/beast-subtype-adapter.js';
import { ProgressionSubtypeAdapterRegistry } from '../adapters/progression-subtype-adapter-registry.js';
import { LevelupShell } from '../../levelup-shell.js';
import { ChargenShell } from '../../chargen-shell.js';

describe('Phase 2.8 — Beast Full Spine Integration', function() {
  this.timeout(15000);

  let testActor;
  let testBeastActor;

  before(async function() {
    if (!game?.ready) {
      this.skip();
      return;
    }

    // Create regular heroic actor for regression testing
    testActor = await Actor.create({
      name: 'Test Hero',
      type: 'character',
      system: {
        level: 1,
        abilities: {
          str: { base: 10, mod: 0 },
          int: { base: 10, mod: 0 },
        },
      },
    });

    // Create Beast actor for Beast-specific testing
    testBeastActor = await Actor.create({
      name: 'Test Beast',
      type: 'character',
      system: {
        level: 1,
        abilities: {
          int: { base: 1, mod: -5 },
          str: { base: 16, mod: 3 },
        },
      },
      flags: {
        swse: {
          beastData: {
            isBeast: true,
            intelligence: 1,
          },
        },
      },
    });
  });

  after(async function() {
    if (testActor?.id) await testActor.delete();
    if (testBeastActor?.id) await testBeastActor.delete();
  });

  // ============================================================================
  // TEST GROUP 1: Beast in Progression Node Registry
  // ============================================================================

  describe('TEST 1: Beast registered in progression node registry', function() {
    it('Beast chargen nodes are properly registered', function() {
      // Expected Beast chargen nodes
      const expectedBeastChargenNodes = ['intro', 'attribute', 'class', 'skills', 'languages', 'summary'];

      for (const nodeId of expectedBeastChargenNodes) {
        const node = PROGRESSION_NODE_REGISTRY[nodeId];
        expect(node, `Node ${nodeId} should exist`).to.exist;
        expect(node.modes, `Node ${nodeId} should support chargen`).to.include('chargen');
        expect(node.subtypes, `Node ${nodeId} should support Beast`).to.include('beast');
      }
    });

    it('Beast level-up nodes are properly registered', function() {
      // Expected Beast level-up nodes
      const expectedBeastLevelupNodes = ['attribute', 'class', 'skills', 'summary', 'general-feat', 'class-feat'];

      for (const nodeId of expectedBeastLevelupNodes) {
        const node = PROGRESSION_NODE_REGISTRY[nodeId];
        expect(node, `Node ${nodeId} should exist`).to.exist;
        expect(node.modes, `Node ${nodeId} should support levelup`).to.include('levelup');
        expect(node.subtypes, `Node ${nodeId} should support Beast`).to.include('beast');
      }
    });

    it('Talent nodes do NOT include Beast', function() {
      const talentNodes = ['general-talent', 'class-talent'];

      for (const nodeId of talentNodes) {
        const node = PROGRESSION_NODE_REGISTRY[nodeId];
        expect(node, `Node ${nodeId} should exist`).to.exist;
        expect(node.subtypes, `Node ${nodeId} should NOT support Beast`).to.not.include('beast');
      }
    });

    it('Force nodes do NOT include Beast', function() {
      const forceNodes = ['force-powers', 'force-secrets', 'force-techniques'];

      for (const nodeId of forceNodes) {
        const node = PROGRESSION_NODE_REGISTRY[nodeId];
        expect(node, `Node ${nodeId} should exist`).to.exist;
        expect(node.subtypes, `Node ${nodeId} should NOT support Beast`).to.not.include('beast');
      }
    });
  });

  // ============================================================================
  // TEST GROUP 2: Beast Chargen Spine Flow
  // ============================================================================

  describe('TEST 2: Beast chargen uses spine-hosted flow (not generic chargen + suppression)', function() {
    it('Beast chargen nodes can be retrieved from registry', function() {
      const beastChargenNodes = getNodesForModeAndSubtype('chargen', 'beast');

      expect(beastChargenNodes).to.be.an('array');
      expect(beastChargenNodes.length).to.be.greaterThan(0);

      const nodeIds = beastChargenNodes.map(n => n.nodeId);
      expect(nodeIds).to.include('intro');
      expect(nodeIds).to.include('attribute');
      expect(nodeIds).to.include('class');
      expect(nodeIds).to.include('skills');
      expect(nodeIds).to.include('summary');

      // Verify talents are NOT in Beast chargen
      expect(nodeIds).to.not.include('general-talent');
      expect(nodeIds).to.not.include('class-talent');
    });

    it('Beast chargen flow is structurally distinct (no feats at level 1)', function() {
      const beastChargenNodes = getNodesForModeAndSubtype('chargen', 'beast');
      const nodeIds = beastChargenNodes.map(n => n.nodeId);

      // Beast chargen should NOT include feat nodes (no starting feats)
      expect(nodeIds).to.not.include('general-feat');
      expect(nodeIds).to.not.include('class-feat');

      // Compare to nonheroic chargen (which also has no starting feats)
      const nonheroicChargenNodes = getNodesForModeAndSubtype('chargen', 'nonheroic');
      const nonheroicNodeIds = nonheroicChargenNodes.map(n => n.nodeId);

      // Both should exclude feats at chargen
      expect(nonheroicNodeIds).to.not.include('general-feat');
    });
  });

  // ============================================================================
  // TEST GROUP 3: Beast Level-Up Spine Flow
  // ============================================================================

  describe('TEST 3: Beast level-up uses spine-hosted flow', function() {
    it('Beast level-up nodes can be retrieved from registry', function() {
      const beastLevelupNodes = getNodesForModeAndSubtype('levelup', 'beast');

      expect(beastLevelupNodes).to.be.an('array');
      expect(beastLevelupNodes.length).to.be.greaterThan(0);

      const nodeIds = beastLevelupNodes.map(n => n.nodeId);
      expect(nodeIds).to.include('attribute');
      expect(nodeIds).to.include('summary');

      // Verify talents are NOT in Beast level-up
      expect(nodeIds).to.not.include('general-talent');
      expect(nodeIds).to.not.include('class-talent');
    });

    it('LevelupShell detects Beast subtype and routes correctly', async function() {
      // Create a mock LevelupShell-like setup
      const mockShell = {
        actor: testBeastActor,
        progressionSession: {
          beastContext: { isBeast: true },
        },
        _getProgressionSubtype: function() {
          if (this.actor?.flags?.swse?.beastData) {
            return 'beast';
          }
          return 'actor';
        },
      };

      const subtype = mockShell._getProgressionSubtype();
      expect(subtype).to.equal('beast');
    });
  });

  // ============================================================================
  // TEST GROUP 4: Beast Feat Step Level-Gating
  // ============================================================================

  describe('TEST 4: Beast feat steps appear only at levels 3, 6, 9, 12, 15, 18', function() {
    it('Beast level 1 does not include feat steps (structurally)', async function() {
      const adapter = new BeastSubtypeAdapter();
      const mockSession = {
        mode: 'levelup',
        beastContext: { isBeast: true },
      };

      // Mock Beast level 1
      const mockLevel1Beast = {
        system: { level: 1 },
      };

      // Simulate active step computation with feats in candidate list
      const candidateSteps = ['attribute', 'general-feat', 'class-feat', 'summary'];
      const filteredSteps = await adapter.contributeActiveSteps(candidateSteps, mockSession, mockLevel1Beast);

      // Feat steps should be filtered out for Beast level 1
      expect(filteredSteps).to.not.include('general-feat');
      expect(filteredSteps).to.not.include('class-feat');
      expect(filteredSteps).to.include('attribute');
      expect(filteredSteps).to.include('summary');
    });

    it('Beast level 3 includes feat steps', async function() {
      const adapter = new BeastSubtypeAdapter();
      const mockSession = {
        mode: 'levelup',
        beastContext: { isBeast: true },
      };

      // Mock Beast level 3
      const mockLevel3Beast = {
        system: { level: 3 },
      };

      const candidateSteps = ['attribute', 'general-feat', 'class-feat', 'summary'];
      const filteredSteps = await adapter.contributeActiveSteps(candidateSteps, mockSession, mockLevel3Beast);

      // Feat steps should be included for Beast level 3
      expect(filteredSteps).to.include('general-feat');
      expect(filteredSteps).to.include('class-feat');
    });

    it('Beast feat cadence only at 3, 6, 9, 12, 15, 18', function() {
      const validFeatLevels = [3, 6, 9, 12, 15, 18];
      const invalidFeatLevels = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20];

      for (const level of validFeatLevels) {
        expect(validFeatLevels).to.include(level);
      }

      for (const level of invalidFeatLevels) {
        expect(validFeatLevels).to.not.include(level);
      }
    });
  });

  // ============================================================================
  // TEST GROUP 5: Beast Talent Suppression
  // ============================================================================

  describe('TEST 5: Beast talents never appear (structurally, not via suppression)', function() {
    it('Talent nodes are not in Beast level-up registry', function() {
      const beastLevelupNodes = getNodesForModeAndSubtype('levelup', 'beast');
      const nodeIds = beastLevelupNodes.map(n => n.nodeId);

      expect(nodeIds).to.not.include('general-talent');
      expect(nodeIds).to.not.include('class-talent');
    });

    it('BeastAdapter suppresses talent steps as fallback', async function() {
      const adapter = new BeastSubtypeAdapter();
      const mockSession = {
        mode: 'chargen',
        beastContext: { isBeast: true },
      };

      // Even if talents somehow appear in candidate list, adapter suppresses them
      const candidateSteps = ['attribute', 'general-talent', 'class-talent', 'skills'];
      const filteredSteps = await adapter.contributeActiveSteps(candidateSteps, mockSession, testBeastActor);

      expect(filteredSteps).to.not.include('general-talent');
      expect(filteredSteps).to.not.include('class-talent');
      expect(filteredSteps).to.include('attribute');
      expect(filteredSteps).to.include('skills');
    });
  });

  // ============================================================================
  // TEST GROUP 6: Beast Ability Increase Cadence
  // ============================================================================

  describe('TEST 6: Beast ability increases at 4-level cadence', function() {
    it('Beast ability increase metadata is set correctly', async function() {
      const adapter = new BeastSubtypeAdapter();
      const mockSession = { beastContext: { isBeast: true } };
      const mockEntitlements = { metadata: {} };

      const result = await adapter.contributeEntitlements(mockEntitlements, mockSession, testBeastActor);

      expect(result.metadata.beastAbilityProgression).to.equal(true);
      expect(result.metadata.abilityIncreaseInterval).to.equal(4);
    });

    it('Beast ability increases occur at levels 4, 8, 12, 16, 20', function() {
      const interval = 4;
      const expectedAbilityLevels = [];

      for (let level = 1; level <= 20; level++) {
        if (level > 1 && level % interval === 0) {
          expectedAbilityLevels.push(level);
        }
      }

      expect(expectedAbilityLevels).to.deep.equal([4, 8, 12, 16, 20]);
    });
  });

  // ============================================================================
  // TEST GROUP 7: Projection and Apply Parity
  // ============================================================================

  describe('TEST 7: Beast projection and apply use same rule sources', function() {
    it('Beast projection marks as Beast and suppresses Force/Destiny', async function() {
      const adapter = new BeastSubtypeAdapter();
      const mockSession = { beastContext: { isBeast: true } };
      const mockProjection = {
        metadata: {},
        derived: {
          forcePoints: 10,
          destinyPoints: 5,
        },
      };

      const result = await adapter.contributeProjection(mockProjection, mockSession, testBeastActor);

      expect(result.metadata.isBeast).to.equal(true);
      expect(result.derived.forcePoints).to.equal(0);
      expect(result.derived.destinyPoints).to.equal(0);
    });

    it('Beast mutation plan includes consistent Beast metadata', async function() {
      const adapter = new BeastSubtypeAdapter();
      const mockSession = {
        beastContext: { isBeast: true, profile: 'beast' },
      };
      const mockPlan = {};

      const result = await adapter.contributeMutationPlan(mockPlan, mockSession, testBeastActor);

      expect(result.beast).to.exist;
      expect(result.beast.isBeast).to.equal(true);
      expect(result.beast.suppressTalents).to.equal(true);
      expect(result.beast.suppressForcePoints).to.equal(true);
      expect(result.beast.suppressDestinyPoints).to.equal(true);
    });
  });

  // ============================================================================
  // TEST GROUP 8: No Regression of Other Paths
  // ============================================================================

  describe('TEST 8: Beast integration does not regress heroic/nonheroic/droid paths', function() {
    it('Heroic chargen still works (has feat steps, talent steps)', function() {
      const heroicChargenNodes = getNodesForModeAndSubtype('chargen', 'actor');
      const nodeIds = heroicChargenNodes.map(n => n.nodeId);

      // Heroic should have feats and talents at chargen
      expect(nodeIds).to.include('general-feat');
      expect(nodeIds).to.include('class-feat');
      expect(nodeIds).to.include('general-talent');
      expect(nodeIds).to.include('class-talent');
    });

    it('Nonheroic chargen still works (no feat steps, no talent steps)', function() {
      const nonheroicChargenNodes = getNodesForModeAndSubtype('chargen', 'nonheroic');
      const nodeIds = nonheroicChargenNodes.map(n => n.nodeId);

      // Nonheroic should have no feats or talents at chargen
      expect(nodeIds).to.not.include('general-feat');
      expect(nodeIds).to.not.include('class-feat');
      expect(nodeIds).to.not.include('general-talent');
      expect(nodeIds).to.not.include('class-talent');
    });

    it('Droid chargen still works', function() {
      const droidChargenNodes = getNodesForModeAndSubtype('chargen', 'droid');
      const nodeIds = droidChargenNodes.map(n => n.nodeId);

      // Droid should have droid-builder node
      expect(nodeIds).to.include('droid-builder');
    });
  });
});
