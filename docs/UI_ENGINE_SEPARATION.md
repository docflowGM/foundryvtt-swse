# UI/Engine Separation — Phase 9

## The Principle

**UI is a dumb terminal. Engines are the source of truth.**

```
        ┌─────────────────────────────┐
        │      USER INTERACTION       │
        │  (Click, Type, Navigate)    │
        └──────────────┬──────────────┘
                       │
                       ↓
        ┌─────────────────────────────┐
        │      UI LAYER (Dumb)        │
        │  • Display view model       │
        │  • Send commands            │
        │  • Never mutate data        │
        │  • Never calculate          │
        │  • Never derive values      │
        └──────────────┬──────────────┘
                       │
                    (Command)
                       │
                       ↓
        ┌─────────────────────────────┐
        │   ENGINE LAYER (Smart)      │
        │  • Execute command          │
        │  • Validate action          │
        │  • Update actor             │
        │  • Calculate totals         │
        │  • Enforce rules            │
        └──────────────┬──────────────┘
                       │
                    (Event)
                       │
                       ↓
        ┌─────────────────────────────┐
        │    ACTOR (Source of Truth)  │
        │  • System data              │
        │  • Derived data             │
        │  • Flags                    │
        └──────────────┬──────────────┘
                       │
                    (Update)
                       │
                       ↓
        ┌─────────────────────────────┐
        │   HYDRATION (Refresh)       │
        │  • Build view model         │
        │  • Re-render UI             │
        └──────────────┬──────────────┘
                       │
                       ↓
        ┌─────────────────────────────┐
        │   UI DISPLAYS (Dumb Again)  │
        │  • Receives fresh vm        │
        │  • Renders to user          │
        └─────────────────────────────┘
```

---

## The Rules

### UI IS FORBIDDEN FROM

❌ Calling `actor.update()` directly
❌ Modifying `actor.system.*` directly
❌ Performing calculations
❌ Deciding game rules
❌ Mutating arrays (feats, skills, etc.)
❌ Holding logic state
❌ Caching derived values

### UI MAY ONLY

✅ Send commands to CommandBus
✅ Display view model (vm)
✅ Handle user interaction
✅ Trigger animations/focus
✅ Be completely stateless (except display)

### ENGINE MUST

✅ Handle all mutations
✅ Perform all calculations
✅ Enforce all rules
✅ Trigger actor updates
✅ Validate commands

---

## CommandBus: The Bridge

### Pattern: Direct Mutation (FORBIDDEN)

```javascript
// ❌ WRONG - UI mutating actor
input.addEventListener('change', async (e) => {
  this.actor.system.hp.value = Number(e.target.value);
  this.render(false);
});
```

Problems:
- UI decides logic
- No validation
- No rules enforcement
- Mutations leak everywhere
- Impossible to audit

### Pattern: CommandBus (CORRECT)

```javascript
// ✅ CORRECT - UI sends request
import { CommandBus } from './scripts/engine/core/CommandBus.js';

input.addEventListener('change', async (e) => {
  await CommandBus.execute('SET_HP', {
    actor: this.actor,
    value: Number(e.target.value)
  });
  // No render() - hydration listener handles it
});
```

Benefits:
- UI purely presentational
- Engine enforces validation
- All mutations logged
- Audit trail clear
- Easy to test

---

## Example: Feat Selection

### Before (Wrong)

```javascript
// ❌ BAD - UI handles logic
async selectFeat(featId) {
  // UI directly mutates
  const feats = this.actor.system.feats || [];
  
  // UI checks prerequisites (logic!)
  if (!this.checkPrerequisites(featId)) {
    ui.notifications.error('Cannot select feat');
    return;
  }
  
  // UI mutates array
  feats.push(featId);
  this.actor.system.feats = feats;
  
  // UI calculates new stats
  const bonusAC = this.calculateACBonus();
  
  this.render(false);
}
```

Problems:
- Logic scattered in UI
- Hard to reuse
- Impossible to test independently
- Validation happens in UI
- Calculations in UI

### After (Correct)

```javascript
// ✅ GOOD - Engine handles logic
async selectFeat(featId) {
  await CommandBus.execute('SELECT_FEAT', {
    actor: this.actor,
    featId: featId
  });
  
  // UI does nothing else
  // Engine handles:
  // - Prerequisite checking
  // - Array mutation
  // - Calculation
  // - Actor update
  // - Hydration
}
```

Engine implementation (scripts/engine/core/commands/ActorCommands.js):

```javascript
static async selectFeat({ actor, featId }) {
  // Engine validates
  const feat = FeatRegistry.getById(featId);
  if (!feat) throw new Error('Feat not found');
  
  // Engine checks prerequisites
  if (!AbilityEngine.checkPrerequisites(actor, feat)) {
    throw new Error('Prerequisite not met');
  }
  
  // Engine mutates
  return await UpdatePipeline.addToArray(
    actor,
    'system.feats',
    featId
  );
  
  // ModifierEngine recalculates automatically via listener
}
```

---

## Example: Character Sheet Edit

### Before (Wrong)

```javascript
// Character name input
nameInput.addEventListener('change', (e) => {
  // ❌ UI mutates directly
  this.actor.system.character.name = e.target.value;
  this.render(false);
});

// Class dropdown
classSelect.addEventListener('change', (e) => {
  // ❌ UI mutates and calculates
  const className = e.target.value;
  this.actor.system.class = className;
  
  // ❌ UI decides logic (wrong place!)
  const hpBonus = this.getHPBonusForClass(className);
  this.actor.system.hp.max += hpBonus;
  
  this.render(false);
});
```

### After (Correct)

```javascript
// Character name input
nameInput.addEventListener('change', async (e) => {
  await CommandBus.execute('SET_NAME', {
    actor: this.actor,
    name: e.target.value
  });
});

// Class dropdown
classSelect.addEventListener('change', async (e) => {
  await CommandBus.execute('SET_CLASS', {
    actor: this.actor,
    className: e.target.value
  });
  // Engine handles HP recalculation
});
```

Engine (scripts/engine/core/commands/ActorCommands.js):

```javascript
static async setClass({ actor, className }) {
  // Engine updates class
  const result = await UpdatePipeline.apply(
    actor,
    'system.class',
    className
  );
  
  // ModifierEngine listener automatically recalculates HP
  // through actor.on('update')
  
  return result;
}
```

---

## View Model: UI's Only Source of Data

### Wrong Pattern

```handlebars
{{! ❌ Directly accessing actor.system }}
<div>HP: {{actor.system.hp.value}} / {{actor.system.hp.max}}</div>
<div>AC: {{#if actor.system.ac}}{{actor.system.ac}}{{/if}}</div>
<div class="skill-total">{{5 + actor.system.abilities.dex.modifier + actor.system.skills.acrobatics.bonus}}</div>
```

Problems:
- UI accessing raw data
- UI infers missing fields
- UI calculates totals
- Inconsistent across templates
- Hard to maintain

### Correct Pattern

```handlebars
{{! ✅ Using view model only }}
<div>HP: {{vm.hp.value}} / {{vm.hp.max}}</div>
<div>AC: {{vm.ac.total}}</div>
<div class="skill-total">{{vm.skills.acrobatics.total}}</div>
```

View model builder (scripts/sheets/v2/character-sheet/context.js):

```javascript
export async function buildHealthViewModel(actor) {
  return {
    hp: {
      value: actor.system.hp.value,
      max: actor.system.hp.max,
      temp: actor.system.hp.temp
    }
  };
}

export async function buildACViewModel(actor) {
  return {
    ac: {
      total: ModifierEngine.calculateAC(actor),
      breakdown: ModifierEngine.getACBreakdown(actor)
    }
  };
}

export async function buildSkillsViewModel(actor) {
  return {
    skills: Object.entries(actor.system.skills).reduce((acc, [key, skill]) => {
      acc[key] = {
        trained: skill.trained,
        total: ModifierEngine.calculateSkillTotal(actor, key),
        breakdown: ModifierEngine.getSkillBreakdown(actor, key)
      };
      return acc;
    }, {})
  };
}
```

---

## Migration Checklist

### For Each Sheet/Component

- [ ] Search for `actor.update(` → convert to CommandBus
- [ ] Search for `actor.system.*=` → convert to CommandBus
- [ ] Search for calculations in listeners → move to engine
- [ ] Search for `this.render(false)` on input → remove it
- [ ] Ensure all data access is `vm.*` not `actor.*`
- [ ] Check for array mutations → use CommandBus
- [ ] Verify no logic in templates

### For Each Engine/Command

- [ ] Command exists for every UI mutation
- [ ] Command validates input
- [ ] Command uses UpdatePipeline
- [ ] Command is tested independently
- [ ] Command is documented

---

## Debugging Checklist

If UI still mutates:

```bash
# Find direct mutations
grep -r "actor\.system\." scripts/sheets --include="*.js" | grep "="
grep -r "actor\.update(" scripts/sheets --include="*.js"
grep -r "\.push\|\.splice\|\.pop" scripts/sheets --include="*.js"

# Find calculations in UI
grep -r "\+ \|\.length\|Math\." scripts/sheets --include="*.js"
```

If view model is wrong:

```bash
# Find raw actor access in templates
grep -r "{{actor\." templates --include="*.hbs"
grep -r "{{#if actor\." templates --include="*.hbs"
```

---

## The Payoff

After Phase 9:

✅ **Testable** — Test commands independently
✅ **Maintainable** — Logic in one place (engine)
✅ **Scalable** — Add new UI without changing logic
✅ **Auditable** — All mutations go through CommandBus
✅ **Correct** — Impossible to break rules
✅ **Professional** — Architecture that scales

---

## Success Criteria

When Phase 9 is complete:

- [ ] Zero `actor.system.*=` in UI code
- [ ] Zero `actor.update(` in UI code
- [ ] All mutations through CommandBus
- [ ] All data access through vm
- [ ] All logic in engines/commands
- [ ] All templates use `{{vm.*}}`
- [ ] No calculations in listeners
- [ ] No state held in UI
- [ ] CommandBus fully routed
- [ ] All commands tested

---

## The Hard Boundary

This is the line in the sand.

After this phase, your architecture becomes **self-enforcing**:

- UI cannot mutate (no methods to call)
- Engine cannot skip validation (all paths go through CommandBus)
- Data cannot drift (always from actor → engine → vm → ui)

**This is when you know you built it right.**
