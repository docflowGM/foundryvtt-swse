# Phase 3B: ESLint Rules Specification

Five critical rules to lock the combat domain architecture.

---

## Rule 1: Orchestration Lock

**Rule ID:** `@swse/combat-engine-authority`

**Purpose:** Prevent any attack resolution outside CombatEngine.resolveAttack()

**Implementation:**

```javascript
// .eslintrc.js - add to rules

'@swse/combat-engine-authority': [
  'error',
  {
    // Block direct damage application without orchestration
    forbiddenPatterns: [
      // ❌ actor.update() with hp changes
      {
        pattern: /actor\.update\s*\(\s*\{\s*["']?system["']?\s*:\s*\{.*["']?hp["']?\s*:/,
        message: 'HP mutations must route through ActorEngine, not actor.update(). Use DamageEngine.applyDamage() or CombatEngine.resolveAttack().',
        files: ['scripts/engine/combat/**/*.js']
      },
      // ❌ Direct system.hp mutation
      {
        pattern: /actor\.system\.hp\s*[+\-*/]?=/,
        message: 'Direct HP mutation forbidden. Route through ActorEngine.applyDamage().',
        files: ['scripts/engine/combat/**/*.js']
      },
      // ❌ Creating new attack resolution outside CombatEngine
      {
        pattern: /export\s+(?:async\s+)?(?:function|class)\s+\w*[Aa]ttack\w*\(.*\)\s*\{/,
        message: 'New attack resolution methods forbidden. Extend CombatEngine.resolveAttack() or use a hook.',
        files: ['scripts/combat/**/*.js', 'scripts/engine/combat/**/*.js']
      },
      // ❌ RollEngine used outside engine/combat
      {
        pattern: /import\s+.*RollEngine.*from/,
        message: 'RollEngine only available in scripts/engine/combat/ and SWSEInitiative.',
        files: ['scripts/**/*.js'],
        exclude: ['scripts/engine/combat/**/*.js', 'scripts/engine/combat/**/SWSEInitiative.js']
      }
    ]
  }
]
```

**Test Cases:**

```javascript
// ✅ PASS - Proper mutation through engine
DamageEngine.applyDamage(actor, 10);

// ✅ PASS - Orchestrated attack
await CombatEngine.resolveAttack({ attacker, target, weapon, roll });

// ❌ FAIL - Direct HP update
actor.update({ 'system.hp': actor.system.hp - 10 });

// ❌ FAIL - Direct system mutation
actor.system.hp -= 10;

// ❌ FAIL - New attack method in legacy domain
function handleMeleeAttack() { ... }
```

---

## Rule 2: Mutation Routing

**Rule ID:** `@swse/mutations-through-actor-engine`

**Purpose:** All actor/item state changes route through ActorEngine

**Implementation:**

```javascript
// .eslintrc.js

'@swse/mutations-through-actor-engine': [
  'error',
  {
    // Block direct mutations
    forbiddenMethods: [
      'actor.update()',
      'item.update()',
      'actor.system = ',
      'item.system = ',
      'actor.applyActiveEffect()'  // Use ActorEngine instead
    ],
    // Within engine/combat, require ActorEngine routing
    scope: 'scripts/engine/combat/**/*.js',
    allowedMutationAPIs: [
      'ActorEngine.applyDamage()',
      'ActorEngine.updateActor()',
      'ActorEngine.applyActiveEffect()',
      'ActorEngine.addCondition()',
      'ActorEngine.removeCondition()'
    ],
    message: 'Actor mutations must route through ActorEngine, not direct actor.update(). This maintains audit trail and consistency.'
  }
]
```

**Test Cases:**

```javascript
// ✅ PASS - Through ActorEngine
ActorEngine.applyDamage(actor, damage);

// ✅ PASS - Through ActorEngine
ActorEngine.addCondition(actor, 'stunned');

// ❌ FAIL - Direct update
actor.update({ 'system.hp': newValue });

// ❌ FAIL - Direct system assignment
actor.system.hp = newValue;

// ❌ FAIL - Direct effect application
actor.applyActiveEffect(effect);
```

---

## Rule 3: UI/Engine Separation

**Rule ID:** `@swse/ui-engine-separation`

**Purpose:** No UI frameworks or templates in engine/combat (except CombatUIAdapter)

**Implementation:**

```javascript
// .eslintrc.js

'@swse/ui-engine-separation': [
  'error',
  {
    scope: 'scripts/engine/combat/**/*.js',
    exclude: ['scripts/engine/combat/ui/**/*.js'],
    forbiddenImports: [
      // UI frameworks
      { pattern: /jquery|jq/, message: 'jQuery forbidden in engine layer' },
      { pattern: /gsap|anime/, message: 'Animation libraries forbidden in engine layer' },
      { pattern: /tinymce|quill/, message: 'Rich text editors forbidden in engine layer' },
      // UI templates
      { pattern: /\.hbs$/, message: 'Handlebars templates forbidden in engine layer' },
      { pattern: /\.html$/, message: 'HTML templates forbidden in engine layer' },
      // Foundry UI classes (except chat/dialog for direct messages)
      { pattern: /ApplicationV2|FormApplication|BaseDialog/, message: 'Foundry UI apps forbidden in engine layer' },
      // Inline HTML
      { pattern: /html\s*[`=<]|innerHTML/, message: 'Inline HTML strings forbidden in engine layer. Use createChatMessage().' }
    ],
    allowedUIAPIs: [
      'createChatMessage()',      // Async message creation only
      'game.user',                // Context info only
      'canvas.tokens'             // Token references only (no rendering)
    ]
  }
]
```

**Test Cases:**

```javascript
// ✅ PASS - Engine logic only
const damage = computeBaseDamage(weapon, strength);
const finalDamage = applyThreshold(damage, dt);

// ✅ PASS - Async message creation (allowed API)
await createChatMessage({ content: result });

// ❌ FAIL - jQuery in engine
import $ from 'jquery';
$('.target').addClass('hit');

// ❌ FAIL - Inline HTML
const card = `<div class="hit-card">${damage}</div>`;

// ❌ FAIL - Template import
import template from './attack-card.hbs';

// ❌ FAIL - UI framework
import { ApplicationV2 } from 'foundry/client';
```

---

## Rule 4: Legacy/Engine Containment

**Rule ID:** `@swse/no-legacy-imports-in-engine`

**Purpose:** Engine domain does not import from legacy combat domain

**Implementation:**

```javascript
// .eslintrc.js

'@swse/no-legacy-imports-in-engine': [
  'error',
  {
    scope: 'scripts/engine/combat/**/*.js',
    temporaryException: [
      // Vehicle utilities - Phase 4 will move these
      'scripts/combat/systems/vehicle/vehicle-calculations.js',
      'scripts/combat/systems/vehicle/vehicle-shared.js'
    ],
    forbiddenImports: [
      {
        pattern: /\.\.\/\.\.\/combat\/(?!systems\/vehicle\/)/,
        message: 'Engine domain cannot import from legacy combat domain (except vehicle utils which Phase 4 will relocate)'
      },
      {
        pattern: /from\s+['"]scripts\/combat\/(?!systems\/vehicle\/)/,
        message: 'Engine domain cannot import from legacy combat domain'
      }
    ]
  }
]
```

**Test Cases:**

```javascript
// ✅ PASS - Engine to engine
import { DamageEngine } from './damage-engine.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';

// ✅ PASS - Temporary vehicle utils (Phase 3 exception)
import { measureSquares } from '../../../combat/systems/vehicle/vehicle-shared.js';

// ❌ FAIL - Legacy mechanics import
import { AidAnother } from '../../../combat/aid-another.js';

// ❌ FAIL - Legacy utilities
import { DamageSystem } from '../../../combat/damage-system.js';

// ❌ FAIL - Cross-domain import (except vehicle utils)
import { multiAttackHelpers } from '../../../combat/multi-attack.js';
```

---

## Rule 5: Dependency Acyclicity

**Rule ID:** `@swse/no-circular-combat-deps`

**Purpose:** Prevent circular imports in combat domain

**Implementation:**

```javascript
// .eslintrc.js

'@swse/no-circular-combat-deps': [
  'error',
  {
    scope: [
      'scripts/engine/combat/**/*.js',
      'scripts/combat/**/*.js'
    ],
    // Detect cycles at build time
    checkOn: 'save',
    // Provide detailed cycle report
    detailed: true,
    message: 'Circular dependency detected: {cycle}. Break cycle by moving shared logic to utility file or using late binding.'
  }
]
```

**Test Cases:**

```javascript
// ✅ PASS - Unidirectional
// CombatEngine.js → DamageEngine.js → ActorEngine.js ✓

// ❌ FAIL - Cycle detected
// A.js → B.js → A.js (circular)

// ❌ FAIL - Deep cycle
// X.js → Y.js → Z.js → X.js
```

---

## Installation & Activation

**Step 1: Add rule definitions**

```javascript
// .eslintrc.js (root)

module.exports = {
  rules: {
    '@swse/combat-engine-authority': require('./eslint-rules/combat-engine-authority.js'),
    '@swse/mutations-through-actor-engine': require('./eslint-rules/mutations-through-actor-engine.js'),
    '@swse/ui-engine-separation': require('./eslint-rules/ui-engine-separation.js'),
    '@swse/no-legacy-imports-in-engine': require('./eslint-rules/no-legacy-imports-in-engine.js'),
    '@swse/no-circular-combat-deps': require('./eslint-rules/no-circular-combat-deps.js'),
  },
  overrides: [
    {
      files: ['scripts/engine/combat/**/*.js'],
      rules: {
        '@swse/combat-engine-authority': 'error',
        '@swse/mutations-through-actor-engine': 'error',
        '@swse/ui-engine-separation': 'error',
        '@swse/no-legacy-imports-in-engine': 'error',
        '@swse/no-circular-combat-deps': 'error'
      }
    },
    {
      files: ['scripts/combat/**/*.js'],
      rules: {
        '@swse/mutations-through-actor-engine': 'error',
        '@swse/no-circular-combat-deps': 'warn'
      }
    }
  ]
};
```

**Step 2: Run validation**

```bash
npm run lint -- --fix
```

---

## Summary

| Rule | Scope | Severity | Purpose |
|------|-------|----------|---------|
| `@swse/combat-engine-authority` | engine/combat | ERROR | Single orchestration point |
| `@swse/mutations-through-actor-engine` | engine/combat | ERROR | Mutation routing contract |
| `@swse/ui-engine-separation` | engine/combat | ERROR | UI framework isolation |
| `@swse/no-legacy-imports-in-engine` | engine/combat | ERROR | Domain separation |
| `@swse/no-circular-combat-deps` | both | ERROR | Dependency acyclicity |

These five rules collectively **lock the architecture against drift**.
