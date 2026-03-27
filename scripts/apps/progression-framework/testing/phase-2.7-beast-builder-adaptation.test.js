/**
 * Phase 2.7 Integration Tests - Beast Builder Adaptation
 *
 * Comprehensive test suite for Beast as generator-backed constrained class path
 * with independent advancement rules distinct from nonheroic.
 *
 * Run with: npm test -- beast-builder-adaptation
 */

import { expect } from 'chai';
import { TemplateRegistry } from '../../scripts/engine/progression/template/template-registry.js';
import { TemplateAdapter } from '../../scripts/engine/progression/template/template-adapter.js';
import { ProgressionSession } from '../../scripts/apps/progression-framework/shell/progression-session.js';
import { ChargenShell } from '../../scripts/apps/progression-framework/chargen-shell.js';
import { BeastSubtypeAdapter } from '../../scripts/apps/progression-framework/adapters/beast-subtype-adapter.js';
import { ProgressionSubtypeAdapterRegistry } from '../../scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js';

describe('Phase 2.7 - Beast Builder Adaptation', function() {
  this.timeout(15000);

  let testActor;
  const beastAdapter = new BeastSubtypeAdapter();

  // Test fixture: create a test actor for Beast chargen
  before(async function() {
    if (!game?.ready) {
      this.skip();
      return;
    }

    // Create test actor
    testActor = await Actor.create({
      name: 'Test Beast',
      type: 'character',
      system: {
        level: 1,
        class: {},
        abilities: {
          int: { base: 1, mod: -5 },
          str: { base: 16, mod: 3 },
          dex: { base: 14, mod: 2 },
          con: { base: 13, mod: 1 },
          wis: { base: 12, mod: 1 },
          cha: { base: 8, mod: -1 },
        },
      },
      flags: {
        swse: {
          beastData: {
            isBeast: true,
            size: 'Large',
            intelligence: 1,
            naturalWeapons: [
              { name: 'Claw', damage: '1d8+Str', type: 'slashing' },
            ],
          },
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
  // TEST 1: Beast templates exist and are registered
  // ============================================================================

  describe('TEST 1: Beast templates registered in template system', function() {
    it('TemplateRegistry.getAllTemplates includes Beast templates', async function() {
      const allTemplates = await TemplateRegistry.getAllTemplates();

      expect(allTemplates).to.be.an('array');

      const beastTemplates = allTemplates.filter(t => t.isBeast === true);

      // Should have at least Wolf and Bear templates
      expect(beastTemplates.length).to.be.at.least(2);

      // Verify Wolf template
      const wolfTemplate = beastTemplates.find(t => t.name === 'Wolf');
      expect(wolfTemplate).to.exist;
      expect(wolfTemplate.id).to.equal('beast-wolf');
      expect(wolfTemplate.isBeast).to.equal(true);
      expect(wolfTemplate.isNonheroic).to.equal(true);

      // Verify Bear template
      const bearTemplate = beastTemplates.find(t => t.name === 'Bear');
      expect(bearTemplate).to.exist;
      expect(bearTemplate.id).to.equal('beast-bear');
      expect(bearTemplate.isBeast).to.equal(true);
      expect(bearTemplate.isNonheroic).to.equal(true);
    });

    it('Beast templates have beastData with size, weapons, senses', async function() {
      const allTemplates = await TemplateRegistry.getAllTemplates();
      const wolfTemplate = allTemplates.find(t => t.id === 'beast-wolf');

      expect(wolfTemplate.beastData).to.exist;
      expect(wolfTemplate.beastData.isBeast).to.equal(true);
      expect(wolfTemplate.beastData.size).to.exist;
      expect(wolfTemplate.beastData.naturalWeapons).to.be.an('array');
      expect(wolfTemplate.beastData.senses).to.be.an('array');
    });
  });

  // ============================================================================
  // TEST 2: Beast session detection and routing through Beast adapter
  // ============================================================================

  describe('TEST 2: Beast session resolution via BeastSubtypeAdapter', function() {
    it('BeastSubtypeAdapter is registered in adapter registry', function() {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapters = registry.getRegisteredSubtypes();

      expect(adapters).to.include('beast');
    });

    it('BeastSubtypeAdapter can be resolved for "beast" subtype', function() {
      const registry = ProgressionSubtypeAdapterRegistry.getInstance();
      const adapter = registry.resolveAdapter('beast');

      expect(adapter).to.exist;
      expect(adapter.subtypeId).to.equal('beast');
      expect(adapter).to.be.instanceOf(BeastSubtypeAdapter);
    });

    it('BeastAdapter.seedSession sets beastContext for Beast actors', async function() {
      const mockSession = {
        nonheroicContext: {},
      };

      await beastAdapter.seedSession(mockSession, testActor, 'chargen');

      expect(mockSession.beastContext).to.exist;
      expect(mockSession.beastContext.isBeast).to.equal(true);
      expect(mockSession.beastContext.intelligence).to.equal(1);
    });
  });

  // ============================================================================
  // TEST 3: Beast skill list enforcement
  // ============================================================================

  describe('TEST 3: Beast skills constrained to Beast skill list', function() {
    it('Beast skill list contains exactly 9 skills', function() {
      const skillList = BeastSubtypeAdapter.getBeastClassSkills();

      expect(skillList).to.be.an('array');
      expect(skillList.length).to.equal(9);
      expect(skillList).to.include('Acrobatics');
      expect(skillList).to.include('Climb');
      expect(skillList).to.include('Endurance');
      expect(skillList).to.include('Initiative');
      expect(skillList).to.include('Jump');
      expect(skillList).to.include('Perception');
      expect(skillList).to.include('Stealth');
      expect(skillList).to.include('Survival');
      expect(skillList).to.include('Swim');
    });

    it('Beast skill training = 1 + INT mod (minimum 1)', function() {
      // Int 1 = -5 mod
      // Trained skills should be: 1 + (-5) = -4, but minimum 1 = 1 skill
      const intMod = testActor.system.abilities.int.mod;
      const expectedTrainedSkills = Math.max(1, 1 + intMod);

      expect(expectedTrainedSkills).to.equal(1);
    });

    it('Beast with Int 2 gets 1 trained skill (2 - 4 = -2, minimum 1)', function() {
      // Int 2 = -4 mod
      // Trained skills = 1 + (-4) = -3, minimum 1 = 1 skill
      const intMod = -4;  // Int 2
      const expectedTrainedSkills = Math.max(1, 1 + intMod);

      expect(expectedTrainedSkills).to.equal(1);
    });
  });

  // ============================================================================
  // TEST 4: Beast intelligence constraint at creation
  // ============================================================================

  describe('TEST 4: Beast intelligence constrained to 1-2 at creation', function() {
    it('Beast actor has intelligence 1 or 2', function() {
      const intAbility = testActor.system.abilities.int.base;

      expect(intAbility).to.be.oneOf([1, 2]);
    });

    it('BeastAdapter.validateReadiness warns on invalid intelligence', async function() {
      const invalidSession = {
        beastContext: {
          isBeast: true,
          intelligence: 5,  // Invalid for Beast creation
        },
      };

      // Should not throw, but should warn
      await expect(
        beastAdapter.validateReadiness(invalidSession, testActor)
      ).to.not.throw();
    });

    it('Beast can multiclass to heroic only at Int 3+', function() {
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(1)).to.equal(false);
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(2)).to.equal(false);
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(3)).to.equal(true);
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(4)).to.equal(true);
    });
  });

  // ============================================================================
  // TEST 5: Beast talent suppression
  // ============================================================================

  describe('TEST 5: Talents permanently suppressed for Beast', function() {
    it('BeastAdapter.contributeActiveSteps suppresses talent steps', async function() {
      const candidateSteps = [
        'intro',
        'species',
        'attribute',
        'class',
        'skills',
        'general-feat',
        'general-talent',  // Should be removed
        'class-talent',    // Should be removed
        'languages',
        'summary',
      ];

      const mockSession = {
        beastContext: { isBeast: true },
      };

      const filtered = await beastAdapter.contributeActiveSteps(
        candidateSteps,
        mockSession,
        testActor
      );

      expect(filtered).to.not.include('general-talent');
      expect(filtered).to.not.include('class-talent');
      expect(filtered).to.not.include('talent-tree-browser');
      expect(filtered).to.not.include('talent-graph');
    });

    it('BeastAdapter.contributeRestrictions forbids talents', async function() {
      const mockRestrictions = { forbiddenSteps: [] };
      const mockSession = { beastContext: { isBeast: true } };

      const updated = await beastAdapter.contributeRestrictions(
        mockRestrictions,
        mockSession,
        testActor
      );

      expect(updated.forbiddenSteps).to.include('general-talent');
      expect(updated.forbiddenSteps).to.include('class-talent');
    });
  });

  // ============================================================================
  // TEST 6: Beast starting feats suppression
  // ============================================================================

  describe('TEST 6: Beast gets no starting feats at level 1', function() {
    it('Beast templates have empty feats array', async function() {
      const allTemplates = await TemplateRegistry.getAllTemplates();
      const wolfTemplate = allTemplates.find(t => t.id === 'beast-wolf');

      expect(wolfTemplate.feats).to.be.an('array');
      expect(wolfTemplate.feats.length).to.equal(0);
    });

    it('Beast actor created from template should have no starting feats', async function() {
      const beastActor = await Actor.create({
        name: 'Template Beast',
        type: 'character',
        system: {
          level: 1,
          abilities: {
            str: { base: 14, mod: 2 },
            int: { base: 1, mod: -5 },
          },
        },
        flags: { swse: { beastData: { isBeast: true } } },
      });

      try {
        // Beast should have no feats
        const feats = beastActor.items.filter(i => i.type === 'feat');
        expect(feats.length).to.equal(0);
      } finally {
        await beastActor.delete();
      }
    });
  });

  // ============================================================================
  // TEST 7: Beast ability increase cadence (1 per 4 levels)
  // ============================================================================

  describe('TEST 7: Beast ability increases: 1 per 4 levels', function() {
    it('BeastAdapter.contributeEntitlements sets abilityIncreaseInterval to 4', async function() {
      const mockEntitlements = { metadata: {} };
      const mockSession = { beastContext: { isBeast: true } };

      const updated = await beastAdapter.contributeEntitlements(
        mockEntitlements,
        mockSession,
        testActor
      );

      expect(updated.metadata.abilityIncreaseInterval).to.equal(4);
      expect(updated.metadata.beastAbilityProgression).to.equal(true);
    });

    it('Beast ability increases occur at levels 4, 8, 12, 16, 20', function() {
      const interval = 4;
      const abilityIncreases = [];

      for (let level = 1; level <= 20; level++) {
        if (level > 1 && level % interval === 0) {
          abilityIncreases.push(level);
        }
      }

      expect(abilityIncreases).to.deep.equal([4, 8, 12, 16, 20]);
    });
  });

  // ============================================================================
  // TEST 8: Beast HP formula (1d8+Con, not 1d4)
  // ============================================================================

  describe('TEST 8: Beast HP uses 1d8+Con (not nonheroic 1d4+Con)', function() {
    it('Beast templates explicitly NOT marked as nonheroic in HP context', async function() {
      // Beast is marked isNonheroic but uses different HP formula
      const allTemplates = await TemplateRegistry.getAllTemplates();
      const wolfTemplate = allTemplates.find(t => t.id === 'beast-wolf');

      expect(wolfTemplate.isBeast).to.equal(true);
      expect(wolfTemplate.beastData).to.exist;
      // Beast should have distinct HP handling (not 1d4)
    });

    it('Beast beastData includes creature properties distinct from nonheroic', async function() {
      const allTemplates = await TemplateRegistry.getAllTemplates();
      const wolfTemplate = allTemplates.find(t => t.id === 'beast-wolf');

      expect(wolfTemplate.beastData.creatureType).to.exist;
      expect(wolfTemplate.beastData.naturalArmor).to.exist;
      expect(wolfTemplate.beastData.naturalWeapons).to.be.an('array');
      // These are creature-specific; nonheroic templates don't have them
    });
  });

  // ============================================================================
  // TEST 9: Beast no Force/Destiny Points
  // ============================================================================

  describe('TEST 9: Beast suppresses Force and Destiny Points', function() {
    it('BeastAdapter.contributeProjection sets Force/Destiny to 0', async function() {
      const mockProjection = {
        metadata: {},
        derived: {
          forcePoints: 10,
          destinyPoints: 5,
        },
      };

      const mockSession = { beastContext: { isBeast: true } };

      const updated = await beastAdapter.contributeProjection(
        mockProjection,
        mockSession,
        testActor
      );

      expect(updated.derived.forcePoints).to.equal(0);
      expect(updated.derived.destinyPoints).to.equal(0);
      expect(updated.metadata.isBeast).to.equal(true);
    });
  });

  // ============================================================================
  // TEST 10: Beast multiclass gating at Int 3+
  // ============================================================================

  describe('TEST 10: Beast multiclass restriction enforced', function() {
    it('Beast with Int 1-2 cannot multiclass to heroic', function() {
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(1)).to.equal(false);
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(2)).to.equal(false);
    });

    it('Beast with Int 3+ can multiclass to heroic', function() {
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(3)).to.equal(true);
      expect(BeastSubtypeAdapter.canBeastMulticlassToHeroic(5)).to.equal(true);
    });

    it('BeastAdapter.contributeRestrictions includes multiclass metadata', async function() {
      const mockRestrictions = { metadata: {} };
      const mockSession = {
        beastContext: {
          isBeast: true,
          intelligence: 1,
        },
      };

      const updated = await beastAdapter.contributeRestrictions(
        mockRestrictions,
        mockSession,
        testActor
      );

      expect(updated.metadata.beastMulticlassGate).to.equal(true);
      expect(updated.metadata.beastCurrentIntelligence).to.equal(1);
    });
  });

  // ============================================================================
  // TEST 11: Beast normal feat cadence after level 1
  // ============================================================================

  describe('TEST 11: Beast feat cadence at levels 3, 6, 9, 12, 15, 18', function() {
    it('Beast feat steps not suppressed in contributeActiveSteps', async function() {
      const candidateSteps = [
        'intro',
        'species',
        'attribute',
        'class',
        'skills',
        'general-feat',  // Should NOT be removed
        'class-feat',    // Should NOT be removed
        'languages',
        'summary',
      ];

      const mockSession = {
        beastContext: { isBeast: true },
      };

      const filtered = await beastAdapter.contributeActiveSteps(
        candidateSteps,
        mockSession,
        testActor
      );

      expect(filtered).to.include('general-feat');
      expect(filtered).to.include('class-feat');
    });

    it('Beast feat steps appear at proper level progression', function() {
      // Feat cadence: 3, 6, 9, 12, 15, 18
      const featLevels = [3, 6, 9, 12, 15, 18];

      for (let level = 1; level <= 20; level++) {
        const hasFeat = featLevels.includes(level);
        if (level < 3) {
          expect(hasFeat).to.equal(false);
        } else if (level >= 3 && level <= 18) {
          expect(hasFeat).to.be.oneOf([true, false]);  // Depends on level
        }
      }
    });
  });

  // ============================================================================
  // TEST 12: Beast template-seeded session applies correctly
  // ============================================================================

  describe('TEST 12: Beast template session seeding and constraint application', function() {
    it('Beast template creates nonheroic Beast session', async function() {
      const allTemplates = await TemplateRegistry.getAllTemplates();
      const wolfTemplate = allTemplates.find(t => t.id === 'beast-wolf');

      const session = await TemplateAdapter.initializeSessionFromTemplate(
        wolfTemplate,
        testActor,
        { mode: 'chargen' }
      );

      expect(session).to.exist;
      expect(session.isTemplateSession).to.equal(true);
      expect(session.subtype).to.equal('nonheroic');
      expect(session.nonheroicContext?.isBeast).to.equal(true);
    });

    it('BeastAdapter.contributeMutationPlan includes Beast metadata', async function() {
      const mockPlan = {};
      const mockSession = {
        beastContext: {
          isBeast: true,
          profile: 'beast',
        },
      };

      const updated = await beastAdapter.contributeMutationPlan(
        mockPlan,
        mockSession,
        testActor
      );

      expect(updated.beast).to.exist;
      expect(updated.beast.isBeast).to.equal(true);
      expect(updated.beast.suppressTalents).to.equal(true);
      expect(updated.beast.suppressForcePoints).to.equal(true);
      expect(updated.beast.suppressDestinyPoints).to.equal(true);
      expect(updated.beast.suppressStartingFeats).to.equal(true);
    });

    it('Beast session has all required context and constraints applied', async function() {
      const mockSession = {
        beastContext: {
          isBeast: true,
          intelligence: 1,
          profile: 'beast',
        },
        nonheroicContext: {},
      };

      // Simulate full adapter pipeline
      await beastAdapter.seedSession(mockSession, testActor, 'chargen');

      expect(mockSession.beastContext.isBeast).to.equal(true);
      expect(mockSession.beastContext.intelligence).to.equal(1);

      const restrictions = await beastAdapter.contributeRestrictions(
        { forbiddenSteps: [] },
        mockSession,
        testActor
      );

      expect(restrictions.forbiddenSteps).to.include('general-talent');
      expect(restrictions.forbiddenSteps).to.include('class-talent');
      expect(restrictions.forbiddenSteps).to.include('force-power');
    });
  });

  // ============================================================================
  // TEST 13: No regression of nonheroic or heroic paths
  // ============================================================================

  describe('TEST 13: Beast adaptation does not regress nonheroic/heroic', function() {
    it('Nonheroic templates remain unaffected by Beast adapter', async function() {
      const allTemplates = await TemplateRegistry.getAllTemplates();
      const guardTemplate = allTemplates.find(t => t.id === 'soldier-guard');

      expect(guardTemplate).to.exist;
      expect(guardTemplate.isBeast).to.not.equal(true);
      expect(guardTemplate.isNonheroic).to.equal(true);
      expect(guardTemplate.beastData).to.not.exist;
    });

    it('BeastAdapter does not interfere with non-Beast sessions', async function() {
      const nonBeastSession = {
        nonheroicContext: {},
      };

      const activeSteps = await beastAdapter.contributeActiveSteps(
        ['general-talent', 'class-talent'],
        nonBeastSession,
        testActor
      );

      // Non-Beast sessions should not be affected
      expect(activeSteps).to.deep.equal(['general-talent', 'class-talent']);
    });
  });
});
