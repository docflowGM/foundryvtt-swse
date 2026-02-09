# FoundryVTT SWSE - Comprehensive Refactoring Roadmap

**Date:** 2025-11-21
**Status:** Ready for Implementation
**Priority:** High (addresses critical organizational and maintenance issues)

---

## Executive Summary

This roadmap addresses organizational improvements, import correctness, and code maintainability for the FoundryVTT SWSE system. Phase 1 (Quick Cleanup) is **COMPLETE**. This document provides detailed guidance for Phase 2 and beyond.

### What's Been Done (Phase 1) ✅

- ✅ **4 orphaned/redundant files deleted** (templates/apps/store/*.js, wrapper files)
- ✅ **2 broken test imports fixed** (calc-defenses.js, calc-skills.js)
- ✅ **14 documentation files organized** into `/docs` directory
- ✅ **Import paths updated** in index.js to remove wrapper indirection
- ✅ **Comprehensive audits completed**:
  - Repository structure audit (686 lines) → `docs/REPOSITORY_STRUCTURE_AUDIT.txt`
  - Hook registration analysis (1,528 lines across 3 files) → `docs/HOOK_*.md`

### Overall Repository Health

| Category | Status | Notes |
|----------|--------|-------|
| **Import Correctness** | ✅ 99% | All imports verified, no circular dependencies |
| **File Organization** | ⚠️ 7/10 | Improved, but 6 large files need splitting |
| **Hook Management** | ⚠️ 5/10 | 48+ hooks scattered across 25+ files |
| **Test Coverage** | ❌ 2/10 | Only 242 lines of tests for 34,000+ line codebase |
| **Documentation** | ✅ 9/10 | Now organized in `/docs` directory |

---

## 🚨 Critical Issues Requiring Immediate Attention

### 1. Hook Registration Race Conditions (CRITICAL)

**File:** See `docs/HOOK_ANALYSIS.md` for full details

**Problem:** Multiple handlers registered for the same hooks without coordination:
- `combatTurn` - **5+ handlers** across different files
- `preUpdateActor` - **4+ handlers** (some with ability capture dependencies)
- `deleteCombat` - **3 handlers** (potential cleanup order issues)

**Risk:** Race conditions, duplicate dialogs, initialization order bugs

**Solution:** Centralized hook registry system (see Section 4 below)

**Priority:** CRITICAL - Can cause runtime bugs

---

### 2. Large Monolithic Files (HIGH PRIORITY)

Six files exceed 900 lines and mix concerns:

| File | Lines | Main Issue | Recommended Split |
|------|-------|------------|-------------------|
| `mentor-dialogues.js` | 1,152 | 92% dialogue data | Extract to JSON + JS module |
| `talent-tree-visualizer.js` | 1,150 | UI + logic mixed | Separate rendering from logic |
| `chargen-droid.js` | 1,084 | Complex generation | Split by responsibility |
| `swse-character-sheet.js` | 1,060 | Monolithic sheet | Extract tab handlers |
| `enhanced-combat-system.js` | 973 | Combat mechanics | Modularize like vehicle/ |
| `levelup-main.js` | 915 | Large dialog | Extract phase handlers |

**Priority:** HIGH - Impacts maintainability

---

## 📋 Phase 2: Structural Improvements

### Task 1: Centralized Hook Registration System

**Effort:** 4-6 hours
**Impact:** HIGH - Eliminates race conditions, improves visibility
**Files Affected:** 25+ files

#### Implementation Steps

1. **Create Hook Registry Structure**

```bash
mkdir -p scripts/hooks
```

**File:** `scripts/hooks/hooks-registry.js`

```javascript
/**
 * Centralized Hook Registration System
 * Single source of truth for all FoundryVTT hooks
 */

export class HooksRegistry {
    static #registered = new Map();

    /**
     * Register a hook with metadata
     * @param {string} hookName - The Foundry hook name
     * @param {Function} handler - The handler function
     * @param {Object} options - Registration options
     */
    static register(hookName, handler, options = {}) {
        const {
            id = `${hookName}-${Date.now()}`,
            priority = 0,  // Lower numbers execute first
            once = false,
            enabled = true,
            description = '',
            category = 'general'
        } = options;

        const registration = {
            hookName,
            handler,
            id,
            priority,
            once,
            enabled,
            description,
            category,
            registered: false
        };

        this.#registered.set(id, registration);

        console.log(`[HooksRegistry] Registered ${hookName} (${id}) - ${description}`);

        return id;
    }

    /**
     * Activate all registered hooks (call during init)
     */
    static activateAll() {
        // Sort by priority
        const sorted = Array.from(this.#registered.values())
            .filter(r => r.enabled && !r.registered)
            .sort((a, b) => a.priority - b.priority);

        for (const registration of sorted) {
            const method = registration.once ? 'once' : 'on';
            Hooks[method](registration.hookName, registration.handler);
            registration.registered = true;

            console.log(`[HooksRegistry] Activated ${registration.hookName} (priority ${registration.priority})`);
        }
    }

    /**
     * Debug: List all registered hooks
     */
    static listAll() {
        return Array.from(this.#registered.values()).map(r => ({
            id: r.id,
            hook: r.hookName,
            priority: r.priority,
            category: r.category,
            description: r.description,
            enabled: r.enabled,
            active: r.registered
        }));
    }
}

// Global debug helper
window.SWSEHooks = HooksRegistry;
```

2. **Create Category-Specific Hook Files**

**File:** `scripts/hooks/combat-hooks.js`

```javascript
import { HooksRegistry } from './hooks-registry.js';

/**
 * Combat Lifecycle Hooks
 * All combat-related hook handlers consolidated here
 */

export function registerCombatHooks() {
    // Combat turn - ability capture (MUST RUN FIRST)
    HooksRegistry.register('combatTurn', handleAbilityCapture, {
        id: 'combat-turn-ability-capture',
        priority: 0,  // Lowest number = runs first
        description: 'Capture pre-turn ability scores for round-based bonuses',
        category: 'combat'
    });

    // Combat turn - active effects
    HooksRegistry.register('combatTurn', handleActiveEffects, {
        id: 'combat-turn-active-effects',
        priority: 10,
        description: 'Process active effects at turn start',
        category: 'combat'
    });

    // Combat turn - condition recovery
    HooksRegistry.register('combatTurn', handleConditionRecovery, {
        id: 'combat-turn-condition-recovery',
        priority: 20,
        description: 'Process condition recovery rolls',
        category: 'combat'
    });

    // Combat turn - automation
    HooksRegistry.register('combatTurn', handleCombatAutomation, {
        id: 'combat-turn-automation',
        priority: 30,
        description: 'Run combat automation (ongoing damage, etc.)',
        category: 'combat'
    });

    // Combat deletion cleanup
    HooksRegistry.register('deleteCombat', handleCombatCleanup, {
        id: 'delete-combat-cleanup',
        priority: 0,
        description: 'Clean up combat state and temporary effects',
        category: 'combat'
    });
}

function handleAbilityCapture(combat, updateData, updateOptions) {
    // Implementation from combat-integration.js or houserule-mechanics.js
    // CRITICAL: This must run before any effects that depend on pre-turn abilities
}

function handleActiveEffects(combat, updateData, updateOptions) {
    // Implementation from active-effects-manager.js
}

function handleConditionRecovery(combat, updateData, updateOptions) {
    // Implementation - consolidate duplicates
}

function handleCombatAutomation(combat, updateData, updateOptions) {
    // Implementation from combat-automation.js
}

function handleCombatCleanup(combat, options, userId) {
    // Consolidate from multiple files
}
```

**File:** `scripts/hooks/actor-hooks.js`

```javascript
import { HooksRegistry } from './hooks-registry.js';

export function registerActorHooks() {
    HooksRegistry.register('preUpdateActor', handleActorPreUpdate, {
        id: 'actor-pre-update-main',
        priority: 0,
        description: 'Main actor update handler',
        category: 'actor'
    });

    HooksRegistry.register('updateActor', handleActorUpdate, {
        id: 'actor-update-main',
        priority: 0,
        description: 'Process actor updates',
        category: 'actor'
    });
}

function handleActorPreUpdate(actor, updateData, options, userId) {
    // Consolidate from index.js and houserule-mechanics.js
}

function handleActorUpdate(actor, updateData, options, userId) {
    // Consolidate from multiple locations
}
```

3. **Update index.js to Use Registry**

**Before:**
```javascript
// Scattered throughout index.js
Hooks.on('combatTurn', ...);
Hooks.on('preUpdateActor', ...);
// etc.
```

**After:**
```javascript
import { HooksRegistry } from './scripts/hooks/hooks-registry.js';
import { registerCombatHooks } from './scripts/hooks/combat-hooks.js';
import { registerActorHooks } from './scripts/hooks/actor-hooks.js';
import { registerForcePowerHooks } from './scripts/hooks/force-power-hooks.js';

// Register all hooks
registerCombatHooks();
registerActorHooks();
registerForcePowerHooks();
// ... other categories

// Activate hooks once registration is complete
Hooks.once('init', () => {
    HooksRegistry.activateAll();
});
```

4. **Testing & Validation**

```javascript
// In browser console after loading
SWSEHooks.listAll();
// Should show all hooks with priorities and descriptions

// Verify execution order
Hooks.on('combatTurn', () => console.log('TEST HOOK'));
// Your hooks should execute before or after this based on priority
```

#### Benefits

- ✅ **Execution order guaranteed** through priority system
- ✅ **All hooks visible** in one place (or organized by category)
- ✅ **Race conditions eliminated**
- ✅ **Easier debugging** with hook metadata
- ✅ **Conditional enabling** via enabled flag

---

### Task 2: Split mentor-dialogues.js

**Effort:** 2-3 hours
**Impact:** MEDIUM - Improves maintainability, enables easier translation
**Files Affected:** 1 source file, 4 import locations

#### Why Split?

- **92% of file is static dialogue data** (1,055 lines)
- **Only 8% is logic** (89 lines of helper functions)
- Data changes don't require code review
- JSON is easier to translate/localize

#### Implementation Plan

**Step 1: Create JSON data file**

```bash
mkdir -p data
```

**File:** `data/mentors.json`

```json
{
  "mentors": {
    "Jedi": {
      "name": "Miraj",
      "title": "Jedi Master",
      "description": "A wise Jedi Master who encourages you to continue on your journey",
      "portrait": "systems/swse/assets/mentors/miraj.webp",
      "levelGreetings": {
        "1": "Young one, I sense great potential within you...",
        "2": "You have taken your first steps into a larger world...",
        ...
        "20": "You have become a beacon of the Force..."
      },
      "classGuidance": "The Force guides you to new understanding...",
      "talentGuidance": "Each talent is a manifestation...",
      "abilityGuidance": "As your body and mind grow stronger...",
      "skillGuidance": "Knowledge and skill are tools of a Jedi...",
      "multiclassGuidance": "A diverse path you walk...",
      "hpGuidance": "Your vitality increases..."
    },
    "Scout": { ... },
    "Scoundrel": { ... }
    // ... all 31 mentors
  }
}
```

**Special Case:** For dynamic greetings (Medic, Elite Trooper), use string placeholders:

```json
{
  "Medic": {
    "levelGreetings": {
      "1": "{{DYNAMIC:medic_level1}}"
    }
  }
}
```

**Step 2: Create mentor system module**

**File:** `modules/mentor-system.js`

```javascript
/**
 * Mentor System - Dialogue and Guidance Module
 */

let mentorsCache = null;

/**
 * Dynamic greeting generators
 */
const DYNAMIC_GREETINGS = {
    'medic_level1': (actor) => {
        const startingClass = getLevel1Class(actor);
        if (startingClass === "Scout") {
            return "Ah, a new medic! Lead recommended you highly...";
        } else if (startingClass === "Soldier") {
            return "Welcome! Breach spoke very highly of you...";
        }
        return "Welcome to the medical corps...";
    },
    'elite_trooper_level1': (actor) => {
        const startingClass = getLevel1Class(actor);
        if (startingClass === "Soldier") {
            return "You're ready for elite training. I've watched you grow...";
        } else if (startingClass === "Scout") {
            return "Lead gave you a rare compliment...";
        }
        return "You want to be an elite trooper. Good...";
    }
};

/**
 * Load mentor data from JSON
 */
async function loadMentors() {
    if (mentorsCache) return mentorsCache;

    const response = await fetch('systems/swse/data/mentors.json');
    const data = await response.json();
    mentorsCache = data.mentors;
    return mentorsCache;
}

/**
 * Get mentor for a given class
 */
export async function getMentorForClass(className) {
    const mentors = await loadMentors();
    return mentors[className] || mentors.Scoundrel;
}

/**
 * Get mentor greeting for specific level
 */
export function getMentorGreeting(mentor, level, actor = null) {
    let greeting = mentor.levelGreetings[level] || mentor.levelGreetings[20];

    // Handle dynamic greetings
    if (greeting && greeting.startsWith('{{DYNAMIC:') && actor) {
        const dynamicKey = greeting.match(/{{DYNAMIC:(.+?)}}/)[1];
        if (DYNAMIC_GREETINGS[dynamicKey]) {
            greeting = DYNAMIC_GREETINGS[dynamicKey](actor);
        }
    }

    return greeting;
}

/**
 * Get mentor guidance for a specific choice type
 */
export function getMentorGuidance(mentor, choiceType) {
    const guidanceMap = {
        'class': mentor.classGuidance,
        'talent': mentor.talentGuidance,
        'ability': mentor.abilityGuidance,
        'skill': mentor.skillGuidance,
        'multiclass': mentor.multiclassGuidance,
        'hp': mentor.hpGuidance
    };
    return guidanceMap[choiceType] || "Make your choice wisely.";
}

/**
 * Get character's level 1 class
 */
export function getLevel1Class(actor) {
    const classItems = actor.items.filter(i => i.type === 'class');

    if (actor.system.level === 1 && classItems.length > 0) {
        return classItems[0].name;
    }

    const storedStartClass = actor.getFlag('swse', 'startingClass');
    if (storedStartClass) {
        return storedStartClass;
    }

    if (classItems.length > 0) {
        return classItems[0].name;
    }

    return 'Scoundrel';
}

/**
 * Set character's starting class
 */
export async function setLevel1Class(actor, className) {
    await actor.setFlag('swse', 'startingClass', className);
}
```

**Step 3: Update imports (4 files)**

Files to update:
- `scripts/apps/swse-levelup.js:10`
- `scripts/apps/levelup/levelup-class.js:7`
- `scripts/apps/levelup/levelup-main.js:12`
- `scripts/apps/chargen-narrative.js:9`

**Before:**
```javascript
import { getMentorForClass, getMentorGreeting } from '../mentor-dialogues.js';
```

**After:**
```javascript
import { getMentorForClass, getMentorGreeting } from '../../modules/mentor-system.js';
```

**Step 4: Test**

1. Load system in Foundry
2. Open level-up dialog
3. Verify mentor greetings display correctly
4. Test dynamic greetings (Medic, Elite Trooper from Scout/Soldier backgrounds)

#### Benefits

- ✅ **Reduced JS file size** from 1,152 to ~150 lines
- ✅ **Data separated from logic** - easier to maintain
- ✅ **Translation-ready** - JSON can be localized
- ✅ **Cached loading** - mentors loaded once, reused

---

### Task 3: Split enhanced-combat-system.js

**Effort:** 6-8 hours
**Impact:** HIGH - Modularizes complex combat logic
**Files Affected:** 1 source file (973 lines)

#### Current Structure Issues

- Mixes combat resolution, damage calculation, attack logic, and UI
- Single large file makes debugging difficult
- No clear separation of concerns

#### Recommended Split

```
scripts/combat/
├── enhanced-combat-system.js     (Main orchestrator, ~150 lines)
├── attack-resolution.js          (Attack rolls, defenses, ~200 lines)
├── damage-calculation.js         (Damage types, reduction, ~200 lines)
├── combat-modifiers.js           (Conditional bonuses, penalties, ~150 lines)
├── weapon-mechanics.js           (Weapon properties, ranges, ~150 lines)
└── combat-ui.js                  (Chat messages, roll displays, ~150 lines)
```

#### Implementation Pattern (use vehicle/ as reference)

**File:** `scripts/combat/enhanced-combat-system.js`

```javascript
/**
 * Enhanced Combat System - Main Orchestrator
 */

import { resolveAttack } from './attack-resolution.js';
import { calculateDamage } from './damage-calculation.js';
import { getCombatModifiers } from './combat-modifiers.js';
import { getWeaponMechanics } from './weapon-mechanics.js';
import { displayCombatResult } from './combat-ui.js';

export class EnhancedCombatSystem {
    /**
     * Main attack resolution flow
     */
    static async processAttack(attacker, target, weapon, options = {}) {
        const modifiers = getCombatModifiers(attacker, target, weapon);
        const weaponMechanics = getWeaponMechanics(weapon);

        const attackResult = await resolveAttack(attacker, target, weapon, modifiers);

        if (attackResult.hit) {
            const damageResult = await calculateDamage(
                attacker,
                target,
                weapon,
                weaponMechanics,
                attackResult
            );

            await displayCombatResult(attackResult, damageResult);
            return damageResult;
        }

        await displayCombatResult(attackResult);
        return null;
    }
}
```

**File:** `scripts/combat/attack-resolution.js`

```javascript
/**
 * Attack Resolution
 * Handles attack rolls, defense calculations, and hit determination
 */

export async function resolveAttack(attacker, target, weapon, modifiers) {
    // Extract attack roll logic from enhanced-combat-system.js
    // ~200 lines of pure attack resolution
}

export function calculateDefense(target, attackType, modifiers) {
    // Extract defense calculation logic
}

export function determineHit(attackRoll, defense, modifiers) {
    // Extract hit determination logic
}
```

**Benefits:**
- Each module has single responsibility
- Easier to test individual components
- Follows existing pattern (vehicle/ directory)
- Reduces cognitive load when debugging

---

### Task 4: Split talent-tree-visualizer.js

**Effort:** 5-6 hours
**Impact:** MEDIUM-HIGH
**Lines:** 1,150 → split into ~300 per module

#### Recommended Split

```
scripts/apps/talent-tree/
├── talent-tree-visualizer.js  (Main app class, ~300 lines)
├── tree-renderer.js           (Canvas drawing, layout, ~400 lines)
├── tree-data-model.js         (Tree structure, nodes, ~200 lines)
└── tree-interactions.js       (Click handling, tooltips, ~250 lines)
```

---

### Task 5: Add JSDoc Comments to Major Classes

**Effort:** 2-3 hours
**Impact:** HIGH - Improves IDE support and documentation
**Files:** All major classes

#### Template

```javascript
/**
 * Enhanced Combat System
 * Manages all combat mechanics for SWSE including attacks, damage, and special actions
 *
 * @class
 * @example
 * await EnhancedCombatSystem.processAttack(attacker, target, weapon);
 */
export class EnhancedCombatSystem {
    /**
     * Process a complete attack sequence
     *
     * @param {Actor} attacker - The attacking actor
     * @param {Actor} target - The target actor
     * @param {Item} weapon - The weapon being used
     * @param {Object} options - Optional attack modifiers
     * @param {boolean} options.powerAttack - Whether to use power attack
     * @param {number} options.aimBonus - Bonus from aiming
     * @returns {Promise<Object>} Damage result object
     *
     * @example
     * const result = await processAttack(myActor, enemy, blaster, { aimBonus: 2 });
     */
    static async processAttack(attacker, target, weapon, options = {}) {
        // ...
    }
}
```

Priority files for JSDoc:
1. `enhanced-combat-system.js`
2. `swse-character-sheet.js`
3. `levelup-main.js`
4. `store-main.js`
5. `chargen-main.js`

---

## 📊 Phase 3: Testing & Quality (Ongoing)

### Expand Test Coverage

**Current:** 242 lines (3 test files)
**Goal:** 2,000+ lines covering critical systems

#### Priority Test Areas

1. **Combat System** (CRITICAL)
   - Attack resolution
   - Damage calculation
   - Range penalties
   - Full attack sequences

2. **Character Generation** (HIGH)
   - Ability score generation
   - Skill allocation
   - Feat selection
   - Validation logic

3. **Level Up System** (HIGH)
   - HP rolling
   - Class feature grants
   - Multiclassing rules
   - Talent tree validation

4. **Active Effects** (MEDIUM)
   - Effect application
   - Stacking rules
   - Duration tracking

#### Test Template

**File:** `tests/combat/test-attack-resolution.js`

```javascript
import { resolveAttack } from '../../scripts/combat/attack-resolution.js';
import { expect } from 'chai';

describe('Attack Resolution', () => {
    it('should correctly calculate attack bonus', () => {
        const attacker = mockActor({ bab: 5, dexMod: 3 });
        const weapon = mockWeapon({ attackBonus: 1 });

        const result = calculateAttackBonus(attacker, weapon);
        expect(result).to.equal(9); // 5 + 3 + 1
    });

    it('should apply range penalties correctly', () => {
        const weapon = mockWeapon({ range: 10 });
        const distance = 35; // Medium range

        const penalty = calculateRangePenalty(weapon, distance);
        expect(penalty).to.equal(-2); // Medium range = -2
    });
});
```

---

## 🎯 Implementation Timeline

### Week 1-2: Critical Fixes
- [ ] Create centralized hook registry
- [ ] Migrate combat hooks (5+ handlers)
- [ ] Test hook execution order
- [ ] Fix any race conditions found

### Week 3-4: File Splits (Part 1)
- [ ] Split enhanced-combat-system.js
- [ ] Split talent-tree-visualizer.js
- [ ] Update imports and test

### Week 5-6: File Splits (Part 2)
- [ ] Split mentor-dialogues.js (optional - already well-organized)
- [ ] Split swse-character-sheet.js
- [ ] Split levelup-main.js

### Week 7-8: Documentation & Testing
- [ ] Add JSDoc comments to all major classes
- [ ] Write integration tests for combat system
- [ ] Write unit tests for character generation
- [ ] Create developer guide

---

## 📁 Reference Documents

All analysis documents are in the `/docs` directory:

| Document | Purpose | Lines |
|----------|---------|-------|
| `REPOSITORY_STRUCTURE_AUDIT.txt` | Complete file inventory and issues | 686 |
| `HOOK_ANALYSIS.md` | Deep technical hook analysis | 887 |
| `HOOK_SUMMARY.md` | Quick reference tables | 339 |
| `HOOKS_AT_A_GLANCE.txt` | Critical issues highlight | 302 |
| `REFACTORING_ROADMAP.md` | This document | - |

---

## 🚀 Quick Start

To begin implementation:

1. **Read the critical issues** (Section 2 above)
2. **Start with hook registration** (highest impact, clear scope)
3. **Follow the implementation steps** for Task 1
4. **Test thoroughly** using browser console commands
5. **Move to file splits** once hooks are stable

---

## ✅ Definition of Done

For each refactoring task:

- [ ] Code follows existing patterns and conventions
- [ ] All imports updated and verified
- [ ] Functionality tested in Foundry
- [ ] No console errors
- [ ] Documentation updated
- [ ] Changes committed with descriptive messages
- [ ] Fellow developers can understand the changes

---

## 📞 Need Help?

- Refer to analysis documents in `/docs`
- Check existing modular implementations (e.g., `vehicle/` directory)
- Use browser console debugging: `SWSEHooks.listAll()`
- Test incrementally - don't refactor everything at once

---

**Last Updated:** 2025-11-21
**Next Review:** After Week 4 (re-assess priorities based on progress)
