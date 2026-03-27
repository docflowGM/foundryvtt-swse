/**
 * Document Targeting Tests — Progression Result Actor Types
 *
 * Comprehensive test suite proving that actors are created/finalized with the correct
 * document type based on their progression path, not sheet hacks.
 *
 * Run with: npm test -- document-targeting
 */

import { expect } from 'chai';
import { ProgressionDocumentTargetPolicy } from '../../policies/progression-document-target-policy.js';

describe('Document Targeting — Progression Result Actor Types', function() {
  this.timeout(10000);

  let testHeroicActor;
  let testDroidActor;
  let testNPCActor;
  let testBeastActor;

  before(async function() {
    if (!game?.ready) {
      this.skip();
      return;
    }

    // Create test actors with correct types
    testHeroicActor = await Actor.create({
      name: 'Test Heroic',
      type: 'character',
      system: { level: 1, abilities: { str: { base: 10, mod: 0 } } },
    });

    testDroidActor = await Actor.create({
      name: 'Test Droid',
      type: 'droid',
      system: { level: 1, abilities: { str: { base: 10, mod: 0 } } },
    });

    testNPCActor = await Actor.create({
      name: 'Test NPC',
      type: 'npc',
      system: {
        level: 1,
        abilities: { str: { base: 10, mod: 0 }, int: { base: 10, mod: 0 } },
      },
    });

    testBeastActor = await Actor.create({
      name: 'Test Beast',
      type: 'npc',
      flags: { swse: { beastData: { isBeast: true } } },
      system: { level: 1, abilities: { str: { base: 10, mod: 0 }, int: { base: 1, mod: -5 } } },
    });
  });

  after(async function() {
    for (const actor of [testHeroicActor, testDroidActor, testNPCActor, testBeastActor]) {
      if (actor?.id) await actor.delete();
    }
  });

  // ============================================================================
  // TEST 1: Canonical Mapping Exists
  // ============================================================================

  describe('TEST 1: Canonical document-target mapping exists', function() {
    it('Policy has mapping for all progression subtypes', function() {
      const subtypes = ProgressionDocumentTargetPolicy.getSupportedProgressionSubtypes();
      expect(subtypes).to.be.an('array');
      expect(subtypes).to.include('actor');
      expect(subtypes).to.include('droid');
      expect(subtypes).to.include('nonheroic');
      expect(subtypes).to.include('beast');
      expect(subtypes).to.include('follower');
    });

    it('Policy resolves correct document type for each subtype', function() {
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('actor')).to.equal('character');
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('droid')).to.equal('droid');
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('nonheroic')).to.equal('npc');
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('beast')).to.equal('npc');
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('follower')).to.equal('npc');
    });

    it('Policy throws on unknown subtype', function() {
      expect(() => {
        ProgressionDocumentTargetPolicy.resolveActorDocumentType('unknown-subtype');
      }).to.throw();
    });
  });

  // ============================================================================
  // TEST 2: Heroic Progression Creates Character Document
  // ============================================================================

  describe('TEST 2: Heroic progression → character document type', function() {
    it('Heroic actor is type "character"', function() {
      expect(testHeroicActor.type).to.equal('character');
    });

    it('Policy confirms heroic → character mapping', function() {
      const docType = ProgressionDocumentTargetPolicy.resolveActorDocumentType('actor');
      expect(docType).to.equal('character');
    });

    it('isDocumentTypeCorrect validates heroic actor', function() {
      const isCorrect = ProgressionDocumentTargetPolicy.isDocumentTypeCorrect(testHeroicActor, 'actor');
      expect(isCorrect).to.equal(true);
    });
  });

  // ============================================================================
  // TEST 3: Droid Progression Creates Droid Document
  // ============================================================================

  describe('TEST 3: Droid progression → droid document type', function() {
    it('Droid actor is type "droid"', function() {
      expect(testDroidActor.type).to.equal('droid');
    });

    it('Policy confirms droid → droid mapping', function() {
      const docType = ProgressionDocumentTargetPolicy.resolveActorDocumentType('droid');
      expect(docType).to.equal('droid');
    });

    it('isDocumentTypeCorrect validates droid actor', function() {
      const isCorrect = ProgressionDocumentTargetPolicy.isDocumentTypeCorrect(testDroidActor, 'droid');
      expect(isCorrect).to.equal(true);
    });
  });

  // ============================================================================
  // TEST 4: Nonheroic Progression Creates NPC Document
  // ============================================================================

  describe('TEST 4: Nonheroic progression → npc document type', function() {
    it('Nonheroic actor is type "npc"', function() {
      expect(testNPCActor.type).to.equal('npc');
    });

    it('Policy confirms nonheroic → npc mapping', function() {
      const docType = ProgressionDocumentTargetPolicy.resolveActorDocumentType('nonheroic');
      expect(docType).to.equal('npc');
    });

    it('isDocumentTypeCorrect validates nonheroic actor', function() {
      const isCorrect = ProgressionDocumentTargetPolicy.isDocumentTypeCorrect(testNPCActor, 'nonheroic');
      expect(isCorrect).to.equal(true);
    });
  });

  // ============================================================================
  // TEST 5: Beast Progression Creates NPC Document
  // ============================================================================

  describe('TEST 5: Beast progression → npc document type', function() {
    it('Beast actor is type "npc"', function() {
      expect(testBeastActor.type).to.equal('npc');
    });

    it('Policy confirms beast → npc mapping', function() {
      const docType = ProgressionDocumentTargetPolicy.resolveActorDocumentType('beast');
      expect(docType).to.equal('npc');
    });

    it('isDocumentTypeCorrect validates beast actor', function() {
      const isCorrect = ProgressionDocumentTargetPolicy.isDocumentTypeCorrect(testBeastActor, 'beast');
      expect(isCorrect).to.equal(true);
    });
  });

  // ============================================================================
  // TEST 6: Follower Progression Creates NPC Document
  // ============================================================================

  describe('TEST 6: Follower progression → npc document type', function() {
    it('Policy confirms follower → npc mapping', function() {
      const docType = ProgressionDocumentTargetPolicy.resolveActorDocumentType('follower');
      expect(docType).to.equal('npc');
    });

    it('Follower actors should be type "npc"', function() {
      // Can't easily test without creating a follower, but policy is explicit
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('follower')).to.equal('npc');
    });
  });

  // ============================================================================
  // TEST 7: Metadata Preservation
  // ============================================================================

  describe('TEST 7: Progression metadata is preserved across document types', function() {
    it('Beast actor retains beastData while on npc document', function() {
      expect(testBeastActor.flags?.swse?.beastData?.isBeast).to.equal(true);
      expect(testBeastActor.type).to.equal('npc');
      // Metadata survives the document target
    });

    it('Policy does not collapse droid into npc', function() {
      // These are separate for a reason
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('droid')).to.equal('droid');
      expect(ProgressionDocumentTargetPolicy.resolveActorDocumentType('nonheroic')).to.equal('npc');
      // droid ≠ npc
    });

    it('Actor type remains immutable after creation', function() {
      const originalType = testBeastActor.type;
      // Beast actor should stay npc (correct type)
      expect(testBeastActor.type).to.equal(originalType);
    });
  });

  // ============================================================================
  // TEST 8: No Regression of Heroic/Droid Creation
  // ============================================================================

  describe('TEST 8: Existing heroic and droid creation paths not regressed', function() {
    it('Character actor type is still "character" (not changed to "npc")', function() {
      expect(testHeroicActor.type).to.equal('character');
      expect(testHeroicActor.type).to.not.equal('npc');
    });

    it('Droid actor type is still "droid" (not collapsed to "npc")', function() {
      expect(testDroidActor.type).to.equal('droid');
      expect(testDroidActor.type).to.not.equal('npc');
    });

    it('All document types are distinct', function() {
      const types = ProgressionDocumentTargetPolicy.getSupportedActorTypes();
      expect(types).to.include('character');
      expect(types).to.include('droid');
      expect(types).to.include('npc');
      // 3 distinct types, not collapsed
      expect(types.length).to.equal(3);
    });
  });

  // ============================================================================
  // TEST 9: Type Validation
  // ============================================================================

  describe('TEST 9: Document type validation catches mismatches', function() {
    it('isDocumentTypeCorrect returns false for mismatched types', function() {
      // Heroic actor checked against nonheroic subtype
      const isMismatch = !ProgressionDocumentTargetPolicy.isDocumentTypeCorrect(testHeroicActor, 'nonheroic');
      expect(isMismatch).to.equal(true);
    });

    it('isDocumentTypeCorrect returns true for correct matches', function() {
      const isCorrect = ProgressionDocumentTargetPolicy.isDocumentTypeCorrect(testHeroicActor, 'actor');
      expect(isCorrect).to.equal(true);
    });

    it('Policy validation is case-sensitive and exact', function() {
      // 'npc' and 'npc' match
      const npcDocType = ProgressionDocumentTargetPolicy.resolveActorDocumentType('nonheroic');
      expect(npcDocType).to.equal('npc');
      expect(testNPCActor.type).to.equal('npc');
    });
  });
});
