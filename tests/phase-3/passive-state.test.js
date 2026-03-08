/**
 * PASSIVE/STATE Predicate Tests
 *
 * Tests all state-dependent predicates in isolation and in combination.
 * Ensures predicates are pure functions with no side effects.
 */

import {
  PASSIVE_STATE_PREDICATES,
  evaluateStatePredicates,
  evaluateStatePredicatesNumeric,
  getAvailablePredicates,
  isValidPredicate,
  getPredicatesInCategory
} from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";

import {
  createMockCharacter,
  testAssertions
} from "./test-utils.js";

// ============================================
// DEFENSE PREDICATES
// ============================================

describe("PASSIVE/STATE - Defense Predicates", () => {
  let actor;
  const defenseContext = { defenseType: 'reflex', attackType: 'ranged' };

  beforeEach(() => {
    actor = createMockCharacter();
  });

  test("defense.against-ranged returns true for ranged attacks", () => {
    const result = evaluateStatePredicates(actor, ['defense.against-ranged'], { attackType: 'ranged' });
    if (!result) throw new Error("Should return true for ranged attack");
  });

  test("defense.against-ranged returns false for melee attacks", () => {
    const result = evaluateStatePredicates(actor, ['defense.against-ranged'], { attackType: 'melee' });
    if (result) throw new Error("Should return false for melee attack");
  });

  test("defense.against-melee returns true for melee attacks", () => {
    const result = evaluateStatePredicates(actor, ['defense.against-melee'], { attackType: 'melee' });
    if (!result) throw new Error("Should return true for melee attack");
  });

  test("defense.against-melee returns false for ranged attacks", () => {
    const result = evaluateStatePredicates(actor, ['defense.against-melee'], { attackType: 'ranged' });
    if (result) throw new Error("Should return false for ranged attack");
  });

  test("defense.fortitude returns true only for fortitude defense", () => {
    const result1 = evaluateStatePredicates(actor, ['defense.fortitude'], { defenseType: 'fortitude' });
    const result2 = evaluateStatePredicates(actor, ['defense.fortitude'], { defenseType: 'reflex' });
    if (!result1) throw new Error("Should return true for fortitude defense");
    if (result2) throw new Error("Should return false for non-fortitude defense");
  });

  test("defense.reflex returns true only for reflex defense", () => {
    const result1 = evaluateStatePredicates(actor, ['defense.reflex'], { defenseType: 'reflex' });
    const result2 = evaluateStatePredicates(actor, ['defense.reflex'], { defenseType: 'fortitude' });
    if (!result1) throw new Error("Should return true for reflex defense");
    if (result2) throw new Error("Should return false for non-reflex defense");
  });

  test("defense.will returns true only for will defense", () => {
    const result1 = evaluateStatePredicates(actor, ['defense.will'], { defenseType: 'will' });
    const result2 = evaluateStatePredicates(actor, ['defense.will'], { defenseType: 'reflex' });
    if (!result1) throw new Error("Should return true for will defense");
    if (result2) throw new Error("Should return false for non-will defense");
  });
});

// ============================================
// ATTACK PREDICATES
// ============================================

describe("PASSIVE/STATE - Attack Predicates", () => {
  let actor;

  beforeEach(() => {
    actor = createMockCharacter();
  });

  test("attack.when-hit returns true only when attack hits", () => {
    const result1 = evaluateStatePredicates(actor, ['attack.when-hit'], { hitResult: true });
    const result2 = evaluateStatePredicates(actor, ['attack.when-hit'], { hitResult: false });
    if (!result1) throw new Error("Should return true when attack hits");
    if (result2) throw new Error("Should return false when attack misses");
  });

  test("attack.when-miss returns true only when attack misses", () => {
    const result1 = evaluateStatePredicates(actor, ['attack.when-miss'], { hitResult: false });
    const result2 = evaluateStatePredicates(actor, ['attack.when-miss'], { hitResult: true });
    if (!result1) throw new Error("Should return true when attack misses");
    if (result2) throw new Error("Should return false when attack hits");
  });

  test("attack.with-melee returns true for melee weapons", () => {
    const weapon = { system: { attackAttribute: 'str' } };
    const result1 = evaluateStatePredicates(actor, ['attack.with-melee'], { weapon });
    const result2 = evaluateStatePredicates(actor, ['attack.with-melee'], { weapon: { system: { attackAttribute: 'dex' } } });
    if (!result1) throw new Error("Should return true for melee (str) weapon");
    if (result2) throw new Error("Should return false for ranged (dex) weapon");
  });

  test("attack.with-ranged returns true for ranged weapons", () => {
    const weapon = { system: { attackAttribute: 'dex' } };
    const result1 = evaluateStatePredicates(actor, ['attack.with-ranged'], { weapon });
    const result2 = evaluateStatePredicates(actor, ['attack.with-ranged'], { weapon: { system: { attackAttribute: 'str' } } });
    if (!result1) throw new Error("Should return true for ranged (dex) weapon");
    if (result2) throw new Error("Should return false for melee (str) weapon");
  });
});

// ============================================
// MOVEMENT PREDICATES
// ============================================

describe("PASSIVE/STATE - Movement Predicates", () => {
  test("movement.while-moving returns true when movement >= 2", () => {
    const actor = createMockCharacter({
      system: {
        derived: { movement: { movementUsed: 3 } }
      }
    });
    const result = evaluateStatePredicates(actor, ['movement.while-moving'], {});
    if (!result) throw new Error("Should return true when moved 3 squares");
  });

  test("movement.while-moving returns false when movement < 2", () => {
    const actor = createMockCharacter({
      system: {
        derived: { movement: { movementUsed: 1 } }
      }
    });
    const result = evaluateStatePredicates(actor, ['movement.while-moving'], {});
    if (result) throw new Error("Should return false when moved < 2 squares");
  });

  test("movement.while-stationary returns true when movement = 0", () => {
    const actor = createMockCharacter({
      system: {
        derived: { movement: { movementUsed: 0 } }
      }
    });
    const result = evaluateStatePredicates(actor, ['movement.while-stationary'], {});
    if (!result) throw new Error("Should return true when stationary");
  });

  test("movement.while-stationary returns false when movement > 0", () => {
    const actor = createMockCharacter({
      system: {
        derived: { movement: { movementUsed: 2 } }
      }
    });
    const result = evaluateStatePredicates(actor, ['movement.while-stationary'], {});
    if (result) throw new Error("Should return false when moved");
  });
});

// ============================================
// PROXIMITY PREDICATES
// ============================================

describe("PASSIVE/STATE - Proximity Predicates", () => {
  test("proximity.count-allies-within-12 returns correct count", () => {
    const actor = createMockCharacter();
    const nearbyAllies = [
      createMockCharacter({ id: 'ally1' }),
      createMockCharacter({ id: 'ally2' })
    ];
    const context = {
      nearbyAllies,
      getDistance: () => 10 // All within 12
    };
    const count = evaluateStatePredicatesNumeric(actor, ['proximity.count-allies-within-12'], context);
    if (count !== 2) throw new Error(`Should count 2 allies, got ${count}`);
  });

  test("proximity.ally-nearby returns true when ally within 6", () => {
    const actor = createMockCharacter();
    const nearbyAllies = [createMockCharacter()];
    const context = {
      nearbyAllies,
      getDistance: () => 5 // Within 6
    };
    const result = evaluateStatePredicates(actor, ['proximity.ally-nearby'], context);
    if (!result) throw new Error("Should return true when ally within 6 squares");
  });

  test("proximity.ally-nearby returns false when no allies nearby", () => {
    const actor = createMockCharacter();
    const context = {
      nearbyAllies: [],
      getDistance: () => 0
    };
    const result = evaluateStatePredicates(actor, ['proximity.ally-nearby'], context);
    if (result) throw new Error("Should return false when no allies");
  });
});

// ============================================
// TURN/ROUND STATE PREDICATES
// ============================================

describe("PASSIVE/STATE - Turn/Round Predicates", () => {
  test("turn.on-current-turn returns true only on character's turn", () => {
    const actor1 = createMockCharacter({
      system: {
        derived: { isCurrentTurn: true }
      }
    });
    const actor2 = createMockCharacter({
      system: {
        derived: { isCurrentTurn: false }
      }
    });
    const result1 = evaluateStatePredicates(actor1, ['turn.on-current-turn'], {});
    const result2 = evaluateStatePredicates(actor2, ['turn.on-current-turn'], {});
    if (!result1) throw new Error("Should return true on current turn");
    if (result2) throw new Error("Should return false when not current turn");
  });

  test("turn.not-current-turn returns true when not on turn", () => {
    const actor = createMockCharacter({
      system: {
        derived: { isCurrentTurn: false }
      }
    });
    const result = evaluateStatePredicates(actor, ['turn.not-current-turn'], {});
    if (!result) throw new Error("Should return true when not on turn");
  });

  test("turn.once-per-round tracks usage correctly", () => {
    const actor = createMockCharacter();
    const context1 = { lastUsedRound: -1, currentRound: 1 };
    const context2 = { lastUsedRound: 1, currentRound: 1 };
    const context3 = { lastUsedRound: 1, currentRound: 2 };

    const result1 = evaluateStatePredicates(actor, ['turn.once-per-round'], context1);
    const result2 = evaluateStatePredicates(actor, ['turn.once-per-round'], context2);
    const result3 = evaluateStatePredicates(actor, ['turn.once-per-round'], context3);

    if (!result1) throw new Error("Should return true first use in round");
    if (result2) throw new Error("Should return false already used this round");
    if (!result3) throw new Error("Should return true in new round");
  });
});

// ============================================
// SKILL PREDICATES
// ============================================

describe("PASSIVE/STATE - Skill Predicates", () => {
  const testSkillPredicate = (predicateName, skillName) => {
    const actor = createMockCharacter();
    const result1 = evaluateStatePredicates(actor, [predicateName], { skillName });
    const result2 = evaluateStatePredicates(actor, [predicateName], { skillName: 'other' });
    if (!result1) throw new Error(`Should return true for ${skillName} skill`);
    if (result2) throw new Error(`Should return false for non-${skillName} skill`);
  };

  test("skill.pilot predicate works correctly", () => {
    testSkillPredicate('skill.pilot', 'pilot');
  });

  test("skill.perception predicate works correctly", () => {
    testSkillPredicate('skill.perception', 'perception');
  });

  test("skill.stealth predicate works correctly", () => {
    testSkillPredicate('skill.stealth', 'stealth');
  });

  test("skill.athletics predicate works correctly", () => {
    testSkillPredicate('skill.athletics', 'athletics');
  });

  test("skill.acrobatics predicate works correctly", () => {
    testSkillPredicate('skill.acrobatics', 'acrobatics');
  });

  test("skill.deception predicate works correctly", () => {
    testSkillPredicate('skill.deception', 'deception');
  });
});

// ============================================
// TARGET CONDITION PREDICATES
// ============================================

describe("PASSIVE/STATE - Target Condition Predicates", () => {
  test("target.is-flanked returns true only when target flanked", () => {
    const actor = createMockCharacter();
    const target1 = createMockCharacter({
      system: { derived: { isFlanked: true } }
    });
    const target2 = createMockCharacter({
      system: { derived: { isFlanked: false } }
    });

    const result1 = evaluateStatePredicates(actor, ['target.is-flanked'], { target: target1 });
    const result2 = evaluateStatePredicates(actor, ['target.is-flanked'], { target: target2 });

    if (!result1) throw new Error("Should return true when target flanked");
    if (result2) throw new Error("Should return false when target not flanked");
  });

  test("target.is-prone returns true only when target prone", () => {
    const actor = createMockCharacter();
    const proneTarget = createMockCharacter({
      system: { derived: { isProne: true } }
    });
    const standingTarget = createMockCharacter({
      system: { derived: { isProne: false } }
    });

    const result1 = evaluateStatePredicates(actor, ['target.is-prone'], { target: proneTarget });
    const result2 = evaluateStatePredicates(actor, ['target.is-prone'], { target: standingTarget });

    if (!result1) throw new Error("Should return true when target prone");
    if (result2) throw new Error("Should return false when target not prone");
  });

  test("target.is-stunned returns true only when target stunned", () => {
    const actor = createMockCharacter();
    const stunnedTarget = createMockCharacter({
      system: { derived: { isStunned: true } }
    });
    const normalTarget = createMockCharacter({
      system: { derived: { isStunned: false } }
    });

    const result1 = evaluateStatePredicates(actor, ['target.is-stunned'], { target: stunnedTarget });
    const result2 = evaluateStatePredicates(actor, ['target.is-stunned'], { target: normalTarget });

    if (!result1) throw new Error("Should return true when target stunned");
    if (result2) throw new Error("Should return false when target not stunned");
  });

  test("target.is-disabled returns true only when target has 0 or fewer HP", () => {
    const actor = createMockCharacter();
    const disabledTarget = createMockCharacter({ hp: 0 });
    const healthyTarget = createMockCharacter({ hp: 50 });

    const result1 = evaluateStatePredicates(actor, ['target.is-disabled'], { target: disabledTarget });
    const result2 = evaluateStatePredicates(actor, ['target.is-disabled'], { target: healthyTarget });

    if (!result1) throw new Error("Should return true when target disabled");
    if (result2) throw new Error("Should return false when target healthy");
  });
});

// ============================================
// VEHICLE PREDICATES
// ============================================

describe("PASSIVE/STATE - Vehicle Predicates", () => {
  test("vehicle.is-vehicle returns true only for vehicles", () => {
    const character = createMockCharacter();
    const vehicle = createMockCharacter({ type: 'vehicle' });

    const result1 = evaluateStatePredicates(character, ['vehicle.is-vehicle'], {});
    const result2 = evaluateStatePredicates(vehicle, ['vehicle.is-vehicle'], {});

    if (result1) throw new Error("Should return false for character");
    if (!result2) throw new Error("Should return true for vehicle");
  });

  test("vehicle.is-character returns true only for characters", () => {
    const character = createMockCharacter();
    const vehicle = createMockCharacter({ type: 'vehicle' });

    const result1 = evaluateStatePredicates(character, ['vehicle.is-character'], {});
    const result2 = evaluateStatePredicates(vehicle, ['vehicle.is-character'], {});

    if (!result1) throw new Error("Should return true for character");
    if (result2) throw new Error("Should return false for vehicle");
  });
});

// ============================================
// PREDICATE COMBINATIONS
// ============================================

describe("PASSIVE/STATE - Predicate Combinations (AND logic)", () => {
  test("All predicates must be true for modifier to apply", () => {
    const actor = createMockCharacter({
      system: {
        derived: {
          movement: { movementUsed: 3 },
          isCurrentTurn: true
        }
      }
    });

    // Both predicates true
    const result1 = evaluateStatePredicates(
      actor,
      ['movement.while-moving', 'turn.on-current-turn'],
      {}
    );
    if (!result1) throw new Error("Should be true when all predicates true");

    // One predicate false
    const result2 = evaluateStatePredicates(
      actor,
      ['movement.while-moving', 'turn.not-current-turn'],
      {}
    );
    if (result2) throw new Error("Should be false when any predicate false");
  });

  test("Empty predicates array returns true", () => {
    const actor = createMockCharacter();
    const result = evaluateStatePredicates(actor, [], {});
    if (!result) throw new Error("Empty predicates should always apply");
  });

  test("Invalid predicate name returns false", () => {
    const actor = createMockCharacter();
    const result = evaluateStatePredicates(actor, ['nonexistent.predicate'], {});
    if (result) throw new Error("Unknown predicate should return false");
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

describe("PASSIVE/STATE - Utility Functions", () => {
  test("getAvailablePredicates returns all predicates", () => {
    const predicates = getAvailablePredicates();
    if (!Array.isArray(predicates)) throw new Error("Should return array");
    if (predicates.length === 0) throw new Error("Should have predicates");
    if (!predicates.includes('defense.against-ranged')) throw new Error("Missing expected predicate");
  });

  test("isValidPredicate validates correctly", () => {
    const result1 = isValidPredicate('defense.against-ranged');
    const result2 = isValidPredicate('nonexistent.predicate');
    if (!result1) throw new Error("Should recognize valid predicate");
    if (result2) throw new Error("Should reject invalid predicate");
  });

  test("getPredicatesInCategory filters correctly", () => {
    const defensePredicates = getPredicatesInCategory('defense');
    const movementPredicates = getPredicatesInCategory('movement');

    if (!defensePredicates.includes('defense.against-ranged')) throw new Error("Missing defense predicate");
    if (!movementPredicates.includes('movement.while-moving')) throw new Error("Missing movement predicate");
    if (defensePredicates.includes('movement.while-moving')) throw new Error("Category filter failed");
  });
});

// ============================================
// PURITY CHECKS (NO MUTATIONS)
// ============================================

describe("PASSIVE/STATE - Purity Checks", () => {
  test("Predicates do not mutate actor", () => {
    const actor = createMockCharacter({
      system: {
        derived: { movement: { movementUsed: 3 } }
      }
    });

    const originalHP = actor.system.hp;
    const originalMovement = actor.system.derived.movement.movementUsed;

    evaluateStatePredicates(actor, ['movement.while-moving'], {});

    if (actor.system.hp !== originalHP) throw new Error("Predicate mutated actor HP");
    if (actor.system.derived.movement.movementUsed !== originalMovement) throw new Error("Predicate mutated movement");
  });

  test("Predicates do not mutate context", () => {
    const actor = createMockCharacter();
    const context = { attackType: 'ranged', custom: 'value' };
    const contextCopy = JSON.parse(JSON.stringify(context));

    evaluateStatePredicates(actor, ['defense.against-ranged'], context);

    if (JSON.stringify(context) !== JSON.stringify(contextCopy)) throw new Error("Predicate mutated context");
  });
});
