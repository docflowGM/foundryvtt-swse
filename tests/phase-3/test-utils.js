/**
 * Phase 3 Test Utilities
 * Mock factories and helpers for execution order testing
 */

/**
 * Create mock character for testing
 */
export function createMockCharacter(overrides = {}) {
  return {
    id: `char-${Math.random().toString(36).slice(2, 9)}`,
    type: 'character',
    name: overrides.name ?? 'Test Character',
    system: {
      hp: overrides.hp ?? 50,
      threshold: overrides.threshold ?? 15,
      bonus: overrides.bonus ?? 5,
      defense: overrides.defense ?? 12,
      skillBonus: overrides.skillBonus ?? 0,
      ...overrides.system
    },
    ...overrides,
    update: async (updates) => {
      Object.assign(this.system, updates['system'] || {});
    }
  };
}

/**
 * Create mock vehicle for testing
 */
export function createMockVehicle(overrides = {}) {
  return {
    id: `veh-${Math.random().toString(36).slice(2, 9)}`,
    type: 'vehicle',
    name: overrides.name ?? 'Test Vehicle',
    system: {
      hp: overrides.hp ?? 200,
      defense: overrides.defense ?? 14,
      vehicle: {
        speed: overrides.speed ?? 400,
        size: overrides.size ?? 'Medium'
      },
      ...overrides.system
    },
    shields: overrides.shields ?? { front: 30, aft: 20, port: 20, starboard: 20 },
    subsystems: overrides.subsystems ?? {
      weapons: 'functional',
      engines: 'functional',
      shields: 'functional',
      hull: 'functional'
    },
    ...overrides,
    update: async (updates) => {
      Object.assign(this.system, updates['system'] || {});
    }
  };
}

/**
 * Create mock weapon for testing
 */
export function createMockWeapon(overrides = {}) {
  return {
    id: `wpn-${Math.random().toString(36).slice(2, 9)}`,
    type: 'weapon',
    name: overrides.name ?? 'Test Weapon',
    system: {
      damage: overrides.damage ?? '1d6',
      damageType: overrides.damageType ?? 'physical',
      weaponType: overrides.weaponType ?? 'melee',
      bonus: overrides.bonus ?? 0,
      ...overrides.system
    },
    ...overrides
  };
}

/**
 * Create mock token for testing
 */
export function createMockToken() {
  return {
    id: `tok-${Math.random().toString(36).slice(2, 9)}`,
    x: Math.floor(Math.random() * 10) * 50,
    y: Math.floor(Math.random() * 10) * 50,
    document: {
      object: null
    }
  };
}

/**
 * Execution order tracker for tests
 */
export class ExecutionTracker {
  constructor() {
    this.log = [];
    this.marks = {};
  }

  mark(phase) {
    this.log.push(phase);
    this.marks[phase] = this.log.length;
  }

  verify(expectedOrder) {
    return JSON.stringify(this.log) === JSON.stringify(expectedOrder);
  }

  toString() {
    return this.log.join(' → ');
  }

  reset() {
    this.log = [];
    this.marks = {};
  }
}

/**
 * Mock for RollEngine.safeRoll()
 */
export function mockSafeRoll(total, dice = []) {
  return {
    total: total || 15,
    dice: dice || [1, 2, 3],
    formula: '1d20'
  };
}

/**
 * Assertion helpers
 */
export const testAssertions = {
  executionOrderIs(tracker, expected) {
    if (tracker.log.length !== expected.length) {
      throw new Error(
        `Execution order length mismatch: got ${tracker.log.length}, expected ${expected.length}\n` +
        `Got: ${tracker.toString()}\n` +
        `Expected: ${expected.join(' → ')}`
      );
    }

    for (let i = 0; i < expected.length; i++) {
      if (tracker.log[i] !== expected[i]) {
        throw new Error(
          `Execution order mismatch at phase ${i + 1}:\n` +
          `Got: ${tracker.log[i]}\n` +
          `Expected: ${expected[i]}\n` +
          `Full order: ${tracker.toString()}`
        );
      }
    }
  },

  includesPhases(tracker, phases) {
    const missing = phases.filter(p => !tracker.log.includes(p));
    if (missing.length > 0) {
      throw new Error(
        `Missing phases in execution: ${missing.join(', ')}\n` +
        `Got: ${tracker.toString()}`
      );
    }
  },

  excludesPhases(tracker, phases) {
    const found = phases.filter(p => tracker.log.includes(p));
    if (found.length > 0) {
      throw new Error(
        `Unexpected phases in execution: ${found.join(', ')}\n` +
        `Got: ${tracker.toString()}`
      );
    }
  },

  damageAppliedTo(target, originalHp) {
    if (target.system.hp === originalHp) {
      throw new Error(`No damage applied to target. HP still ${target.system.hp}`);
    }

    const damageAmount = originalHp - target.system.hp;
    if (damageAmount < 0) {
      throw new Error(`Target HP increased (healing?): ${originalHp} → ${target.system.hp}`);
    }

    return damageAmount;
  },

  shieldAbsorbed(target, originalShield, zone = 'front') {
    if (target.shields[zone] === originalShield) {
      throw new Error(`No shield absorption occurred. Shield still at ${originalShield}`);
    }

    const absorbed = originalShield - target.shields[zone];
    if (absorbed < 0) {
      throw new Error(`Shield increased (invalid): ${originalShield} → ${target.shields[zone]}`);
    }

    return absorbed;
  }
};
