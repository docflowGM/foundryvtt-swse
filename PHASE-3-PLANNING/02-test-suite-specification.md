# Phase 3B: Test Suite Specification

Five deterministic tests that lock execution order and dependency integrity.

---

## Test Suite: Phase 3 Architecture Locks

Location: `tests/phase-3/phase-3-architecture.test.js`

---

## TEST 1: Character Attack Execution Order

**Test ID:** `attack-execution-order-character-melee`

**Purpose:** Verify character melee attack follows exact order: Roll → Modifiers → Hit → HP → Threshold → UI

**Implementation:**

```javascript
describe('Phase 3: Combat Execution Order', () => {
  describe('Character Melee Attack', () => {
    test('Character attack executes in correct order: Roll → Modifiers → HP → Threshold → UI', async () => {
      // Setup
      const attacker = createMockCharacter({ hp: 100, bonus: 5 });
      const target = createMockCharacter({ hp: 50, defense: 12 });
      const weapon = createMockWeapon({ damage: '2d6', type: 'melee' });

      // Instrumentation: record order of operations
      const executionLog = [];

      // Mock each phase
      const originalSafeRoll = RollEngine.safeRoll;
      RollEngine.safeRoll = jest.fn(async (formula) => {
        executionLog.push('roll');
        return { total: 16, dice: [1, 5, 4] };
      });

      const originalComputeBonus = computeAttackBonus;
      computeAttackBonus = jest.fn(() => {
        executionLog.push('modifiers');
        return 5;
      });

      const originalApplyDamage = DamageEngine.applyDamage;
      DamageEngine.applyDamage = jest.fn(async (actor, damage) => {
        executionLog.push('hp');
        actor.system.hp -= damage;
        return { remaining: actor.system.hp };
      });

      const originalThresholdEngine = ThresholdEngine.applyResult;
      ThresholdEngine.applyResult = jest.fn(async (result) => {
        executionLog.push('threshold');
        return result;
      });

      const originalUIAdapter = CombatUIAdapter.handleAttackResult;
      CombatUIAdapter.handleAttackResult = jest.fn(async (result) => {
        executionLog.push('ui');
        return result;
      });

      // Execute attack
      const result = await CombatEngine.resolveAttack({
        attacker,
        target,
        weapon,
        attackRoll: { total: 16, dice: [1, 5, 4] }
      });

      // Assert execution order
      expect(executionLog).toEqual([
        'roll',
        'modifiers',
        'hp',
        'threshold',
        'ui'
      ]);

      // Assert no shield phase (character vs character)
      expect(executionLog).not.toContain('shield');

      // Assert target actually took damage
      expect(target.system.hp).toBeLessThan(50);

      // Restore mocks
      RollEngine.safeRoll = originalSafeRoll;
      computeAttackBonus = originalComputeBonus;
      DamageEngine.applyDamage = originalApplyDamage;
      ThresholdEngine.applyResult = originalThresholdEngine;
      CombatUIAdapter.handleAttackResult = originalUIAdapter;
    });

    test('Miss (attack roll fails) skips damage phase', async () => {
      const attacker = createMockCharacter();
      const target = createMockCharacter({ defense: 20 });
      const weapon = createMockWeapon();

      const executionLog = [];

      // Mock attack roll as miss (4 vs defense 20)
      RollEngine.safeRoll = jest.fn(async () => {
        executionLog.push('roll');
        return { total: 4, dice: [1, 3] };
      });

      DamageEngine.applyDamage = jest.fn(() => {
        executionLog.push('hp');
        throw new Error('Should not be called on miss');
      });

      ThresholdEngine.applyResult = jest.fn(() => {
        executionLog.push('threshold');
        throw new Error('Should not be called on miss');
      });

      // Execute
      const result = await CombatEngine.resolveAttack({
        attacker,
        target,
        weapon,
        attackRoll: { total: 4, dice: [1, 3] }
      });

      // Verify: roll happens but damage skipped
      expect(result.hit).toBe(false);
      expect(executionLog).toEqual(['roll']);
      expect(executionLog).not.toContain('hp');
      expect(executionLog).not.toContain('threshold');
    });
  });
});
```

---

## TEST 2: Vehicle Ranged Attack Execution Order

**Test ID:** `attack-execution-order-vehicle-ranged`

**Purpose:** Verify vehicle attack includes shield phase BEFORE HP: Roll → Modifiers → Hit → Shield → HP → Threshold → Subsystem → UI

**Implementation:**

```javascript
  describe('Vehicle Ranged Attack', () => {
    test('Vehicle attack executes in correct order: Subsystem Check → Roll → Shield → HP → Threshold → Subsystem Escalation → UI', async () => {
      // Setup
      const attacker = createMockVehicle({
        speed: 400,
        weapons: { subsystemDamage: 0 }
      });
      const target = createMockVehicle({
        hp: 200,
        defense: 14,
        shields: { front: 30, aft: 15 },
        subsystems: { weapons: 'functional' }
      });
      const weapon = createMockWeapon({ damage: '4d6+5', type: 'vehicle-cannon' });

      const executionLog = [];

      // Mock subsystem check
      SubsystemEngine.getSubsystemStatus = jest.fn(() => {
        executionLog.push('subsystem-check');
        return 'functional';
      });

      // Mock roll
      RollEngine.safeRoll = jest.fn(async () => {
        executionLog.push('roll');
        return { total: 18, dice: [3, 2, 5, 6] };
      });

      // Mock shield absorption
      EnhancedShields.applyDamageToZone = jest.fn(async (vehicle, zone, damage) => {
        executionLog.push('shield');
        const absorbed = Math.min(damage, vehicle.shields[zone]);
        vehicle.shields[zone] -= absorbed;
        return { absorbed, remaining: damage - absorbed };
      });

      // Mock HP damage
      DamageEngine.applyDamage = jest.fn(async (actor, damage) => {
        executionLog.push('hp');
        actor.system.hp -= damage;
        return { remaining: actor.system.hp };
      });

      // Mock threshold
      ThresholdEngine.applyResult = jest.fn(async (result) => {
        executionLog.push('threshold');
        if (result.damageExceedsThreshold) {
          SubsystemEngine.escalate(result.target);
        }
        return result;
      });

      // Mock subsystem escalation
      SubsystemEngine.escalate = jest.fn(async (vehicle) => {
        executionLog.push('subsystem-escalation');
        vehicle.subsystems.random = 'damaged';
        return { escalated: true };
      });

      // Mock UI
      CombatUIAdapter.handleAttackResult = jest.fn(async (result) => {
        executionLog.push('ui');
        return result;
      });

      // Execute
      const result = await CombatEngine.resolveAttack({
        attacker,
        target,
        weapon,
        attackRoll: { total: 18, dice: [3, 2, 5, 6] }
      });

      // Assert execution order (CRITICAL: shield before hp)
      expect(executionLog).toEqual([
        'subsystem-check',
        'roll',
        'shield',
        'hp',
        'threshold',
        'subsystem-escalation',
        'ui'
      ]);

      // Assert shield was damaged
      expect(target.shields.front).toBeLessThan(30);

      // Assert subsystem was checked
      expect(SubsystemEngine.getSubsystemStatus).toHaveBeenCalled();
    });

    test('Vehicle with disabled weapons subsystem cannot attack', async () => {
      const attacker = createMockVehicle({
        subsystems: { weapons: 'disabled' }
      });
      const target = createMockVehicle();
      const weapon = createMockWeapon();

      SubsystemEngine.getSubsystemStatus = jest.fn(() => 'disabled');

      // Execute - should block
      const result = await CombatEngine.resolveAttack({
        attacker,
        target,
        weapon,
        attackRoll: { total: 15, dice: [1, 4, 2] }
      });

      expect(result.hit).toBe(false);
      expect(result.reason).toContain('weapons subsystem');
    });
  });
});
```

---

## TEST 3: Dogfighting Execution Order

**Test ID:** `attack-execution-order-dogfighting`

**Purpose:** Verify dogfighting follows Pilot skill opposed roll ONLY, no HP mutations

**Implementation:**

```javascript
  describe('Dogfighting', () => {
    test('Dogfighting initiates with opposed Pilot rolls, no HP damage', async () => {
      const attacker = createMockVehicle({
        token: createMockToken(),
        pilot: { skills: { pilot: 8 } }
      });
      const defender = createMockVehicle({
        token: createMockToken(),
        pilot: { skills: { pilot: 6 } }
      });

      const executionLog = [];

      // Mock range check
      measureSquares = jest.fn(() => {
        executionLog.push('range-check');
        return 4; // Within 6 squares
      });

      // Mock attacker pilot roll
      RollEngine.safeRoll = jest.fn(async (formula) => {
        if (formula.includes('8')) {
          executionLog.push('attacker-pilot-roll');
          return { total: 14, dice: [1, 5] };
        } else if (formula.includes('6')) {
          executionLog.push('defender-pilot-roll');
          return { total: 11, dice: [2, 3] };
        }
      });

      // Mock tailing effect
      ActorEngine.applyActiveEffect = jest.fn(async () => {
        executionLog.push('apply-tailing-effect');
        return {};
      });

      // Mock UI notification
      createChatMessage = jest.fn(async () => {
        executionLog.push('ui-notification');
        return {};
      });

      // Execute dogfight
      const result = await VehicleDogfighting.initiateDogfight(
        attacker,
        defender
      );

      // Assert execution: range → rolls → effect → UI
      expect(executionLog).toEqual([
        'range-check',
        'attacker-pilot-roll',
        'defender-pilot-roll',
        'apply-tailing-effect',
        'ui-notification'
      ]);

      // CRITICAL: verify NO HP damage
      expect(DamageEngine.applyDamage).not.toHaveBeenCalled();
      expect(ThresholdEngine.applyResult).not.toHaveBeenCalled();

      // Assert attacker won (14 > 11)
      expect(result.winner).toBe('attacker');
      expect(result.tailingApplied).toBe(true);
    });

    test('Dogfighting aborts if range > 6 squares', async () => {
      const attacker = createMockVehicle({ token: createMockToken() });
      const defender = createMockVehicle({ token: createMockToken() });

      measureSquares = jest.fn(() => 8); // Out of range

      const result = await VehicleDogfighting.initiateDogfight(
        attacker,
        defender
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('range');
      // Verify no rolls occurred
      expect(RollEngine.safeRoll).not.toHaveBeenCalled();
    });
  });
});
```

---

## TEST 4: Vehicle Collision Execution Order

**Test ID:** `attack-execution-order-collision`

**Purpose:** Verify collision/ramming: Damage Calc → Collision Notice → Shield → HP → Threshold → Subsystem → UI

**Implementation:**

```javascript
  describe('Vehicle Collision (Ramming)', () => {
    test('Collision executes in correct order: Damage Calc → Shield → HP → Threshold → Subsystem Escalation → UI', async () => {
      const rammer = createMockVehicle({
        speed: 600,
        size: 'Medium'
      });
      const target = createMockVehicle({
        hp: 120,
        shields: { front: 25 },
        subsystems: { hull: 'functional' }
      });

      const executionLog = [];

      // Mock damage calculation
      VehicleCollisions._computeCollisionDamage = jest.fn(() => {
        executionLog.push('damage-calc');
        return 30; // 600/2 = 300... scaled down
      });

      // Mock collision notice
      createChatMessage = jest.fn(async () => {
        executionLog.push('collision-notice');
        return {};
      });

      // Mock shield absorption
      EnhancedShields.applyDamageToZone = jest.fn(async (vehicle, zone, damage) => {
        executionLog.push('shield');
        const absorbed = Math.min(damage, vehicle.shields[zone]);
        vehicle.shields[zone] -= absorbed;
        return { absorbed, remaining: damage - absorbed };
      });

      // Mock HP damage
      DamageEngine.applyDamage = jest.fn(async (actor, damage) => {
        executionLog.push('hp');
        actor.system.hp -= damage;
        return { remaining: actor.system.hp };
      });

      // Mock threshold
      ThresholdEngine.evaluateThreshold = jest.fn(async () => {
        executionLog.push('threshold');
        return { exceedsThreshold: true };
      });

      // Mock subsystem escalation
      SubsystemEngine.escalate = jest.fn(async () => {
        executionLog.push('subsystem-escalation');
        return {};
      });

      // Execute collision
      const result = await VehicleCollisions.ram(rammer, target);

      // Assert execution order
      expect(executionLog).toEqual([
        'damage-calc',
        'collision-notice',
        'shield',
        'hp',
        'threshold',
        'subsystem-escalation',
        'ui'  // handled by damage engine
      ]);

      // Assert target health decreased
      expect(target.system.hp).toBeLessThan(120);

      // Assert shield was hit
      expect(target.shields.front).toBeLessThan(25);
    });

    test('Mutual damage if both vehicles take collision', async () => {
      const vehicle1 = createMockVehicle({ speed: 400 });
      const vehicle2 = createMockVehicle({ speed: 200 });

      // Execute collision with mutual damage enabled
      const result = await VehicleCollisions.ram(vehicle1, vehicle2, {
        mutualDamage: true
      });

      // Both should have taken damage
      expect(result.vehicle1Damage).toBeGreaterThan(0);
      expect(result.vehicle2Damage).toBeGreaterThan(0);

      // Verify different damage amounts
      expect(result.vehicle1Damage).not.toEqual(result.vehicle2Damage);
    });
  });
});
```

---

## TEST 5: Dependency Integrity & Circular Detection

**Test ID:** `dependency-integrity-no-cycles`

**Purpose:** Verify no circular dependencies exist and layering is maintained

**Implementation:**

```javascript
  describe('Dependency Integrity', () => {
    test('No circular dependencies in engine/combat domain', () => {
      // Build dependency graph
      const graph = buildDependencyGraph('scripts/engine/combat');

      // Detect cycles using DFS
      const cycles = detectDependencyCycles(graph);

      // Assert no cycles found
      expect(cycles).toHaveLength(0);
    });

    test('Proper layering: CombatEngine → Subsystems → ActorEngine (no reverse)', () => {
      const combatEngineDeps = getDirectImports('scripts/engine/combat/CombatEngine.js');
      const damageEngineDeps = getDirectImports('scripts/engine/combat/damage-engine.js');
      const actorEngineDeps = getDirectImports('scripts/actors/engine/actor-engine.js');

      // CombatEngine can depend on subsystems
      expect(combatEngineDeps).toContain(expect.stringContaining('DamageEngine'));

      // DamageEngine can depend on ActorEngine
      expect(damageEngineDeps).toContain(expect.stringContaining('ActorEngine'));

      // But NOT reverse
      expect(actorEngineDeps).not.toContain(expect.stringContaining('CombatEngine'));
      expect(damageEngineDeps).not.toContain(expect.stringContaining('CombatEngine'));
    });

    test('UI domain only depends on engine (one-way)', () => {
      const uiAdapterDeps = getDirectImports('scripts/engine/combat/ui/CombatUIAdapter.js');
      const engineDeps = getDirectImports('scripts/engine/combat/CombatEngine.js');

      // CombatUIAdapter can import from engine
      expect(uiAdapterDeps).toContain(expect.stringContaining('document-api'));

      // But engine does NOT import from ui
      expect(engineDeps).not.toContain(expect.stringContaining('CombatUIAdapter'));
    });

    test('Engine domain does not import from legacy domain (except temporary vehicle utils)', () => {
      const engineFiles = getFilesInPath('scripts/engine/combat', { recursive: true });
      const vehicleUtilsException = [
        'scripts/combat/systems/vehicle/vehicle-calculations.js',
        'scripts/combat/systems/vehicle/vehicle-shared.js'
      ];

      for (const file of engineFiles) {
        const imports = getDirectImports(file);

        for (const importPath of imports) {
          if (!importPath.includes('../combat/')) continue;

          // If it's from legacy domain, must be in exception list
          const isException = vehicleUtilsException.some(exc =>
            importPath.includes(exc)
          );

          expect(isException).toBe(true);
        }
      }
    });
  });
});
```

---

## Test Utilities

Create helper functions in `tests/phase-3/test-utils.js`:

```javascript
/**
 * Build dependency graph from directory
 */
function buildDependencyGraph(dirPath) {
  const graph = {};
  const files = getAllJsFiles(dirPath);

  for (const file of files) {
    const imports = getDirectImports(file);
    graph[file] = imports.map(resolveImportPath);
  }

  return graph;
}

/**
 * Detect cycles in dependency graph using DFS
 */
function detectDependencyCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(node, path) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Cycle found
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart).concat(neighbor));
      }
    }

    recursionStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Parse imports from file
 */
function getDirectImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content))) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Create mock character for testing
 */
function createMockCharacter(overrides = {}) {
  return {
    type: 'character',
    system: {
      hp: overrides.hp ?? 50,
      threshold: overrides.threshold ?? 15,
      skillBonus: overrides.skillBonus ?? 0,
      ...overrides.system
    },
    ...overrides
  };
}

/**
 * Create mock vehicle for testing
 */
function createMockVehicle(overrides = {}) {
  return {
    type: 'vehicle',
    system: {
      hp: overrides.hp ?? 200,
      vehicle: {
        speed: overrides.speed ?? 400,
        size: overrides.size ?? 'Medium'
      },
      ...overrides.system
    },
    shields: overrides.shields ?? { front: 30, aft: 20 },
    subsystems: overrides.subsystems ?? { weapons: 'functional', engines: 'functional' },
    ...overrides
  };
}
```

---

## Running Tests

```bash
# Run all Phase 3 tests
npm run test -- tests/phase-3/

# Run specific test
npm run test -- tests/phase-3/phase-3-architecture.test.js -t "Character Melee Attack"

# Run with coverage
npm run test -- tests/phase-3/ --coverage

# Watch mode during development
npm run test:watch -- tests/phase-3/
```

---

## Summary

| Test | Purpose | Scenarios | Status |
|------|---------|-----------|--------|
| Character Melee | Roll → HP → Threshold | Hit / Miss | Locked |
| Vehicle Ranged | Subsystem → Shield → HP → Subsystem Escalation | Functional / Disabled | Locked |
| Dogfighting | Opposed Pilot Roll (no HP) | Win / Loss / Out of Range | Locked |
| Collision | Damage Calc → Shield → HP → Subsystem | Mutual / One-way | Locked |
| Dependencies | No cycles, proper layering | Engine → Subsystems → ActorEngine | Locked |

These five tests **freeze execution order and dependency integrity** for Phase 3.
