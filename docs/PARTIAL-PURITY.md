# SWSE Handlebars Partials: The Purity Rule

This document defines the single behavioral rule that keeps SWSE character sheets and CharGen stable in Foundry v13+.

## The Rule

> **Partials must be pure functions. No logic. No JS side effects.**

A partial is either:

1. A **dumb template** that renders given data (✓ good)
2. A **computed template** where logic happens in JavaScript (✓ good)

A partial is never:

1. A **smart component** that fetches its own data (✗ bad)
2. A **side-effect container** with `<script>` tags (✗ bad)
3. A **conditional nightmare** with 5+ `{{#if}}` branches (✗ bad)

---

## Why This Matters

Foundry v2 renders in **batches**. If a partial has state or side effects:

- Render A: Partial fetches data
- Render B: System batches the next render
- **Partial still has old data** ← **Silent failure**

The sheet looks correct at first. Then you scroll, click a tab, or change a value, and stale data appears.

Pure partials eliminate this:

- Data comes from `_prepareContext()` (single source of truth)
- Partial just renders what it receives
- Every render is consistent

---

## Practical Patterns

### ✗ DON'T: Logic in the Partial

```handlebars
{{! BAD: Conditional with data logic }}
<div class='skill-row'>
  {{#if (gt system.skills.acrobatics.bonus 10)}}
    <span class='high-skill'>★★★</span>
  {{else}}
    <span class='normal-skill'>★</span>
  {{/if}}
</div>
```

**Why it's bad:**

- The partial decides what to render based on data
- If data doesn't come from `_prepareContext()`, it's stale

### ✓ DO: Pass the Computed Value

```handlebars
{{! GOOD: Partial just renders what it's given }}
<div class='skill-row {{skillRating}}'>
  <span class='skill-stars'>{{stars}}</span>
</div>
```

```javascript
// In _prepareContext()
async _prepareContext(options) {
  const acrobaticsBonus = this.actor.system.skills.acrobatics.bonus;
  const skillRating = acrobaticsBonus > 10 ? 'high-skill' : 'normal-skill';
  const stars = acrobaticsBonus > 10 ? '★★★' : '★';

  return {
    skillRating,
    stars,
    // ... rest of context
  };
}
```

**Why it's good:**

- Partial is stateless
- Logic is in JavaScript where you can debug it
- Data flows from `_prepareContext()` (testable, cacheable)

---

## Common Violations & Fixes

### Violation 1: Partial Calls a Helper with Side Effects

```handlebars
{{! BAD: Helper fetches data }}
{{getActorSkills actor}}
```

```javascript
// In helpers/handlebars/skill-helpers.js
Handlebars.registerHelper('getActorSkills', actor => {
  // ✗ Fetching live data from actor
  return actor.items.filter(i => i.type === 'skill');
});
```

**Fix:** Pass pre-filtered data from `_prepareContext()`:

```handlebars
{{!-- GOOD: Partial receives prepared data --}}
{{#each skills}}
  {{> skill-action-card this}}
{{/each}}
```

```javascript
async _prepareContext(options) {
  const actor = this.document;
  const skills = actor.items.filter(i => i.type === 'skill');

  return {
    skills, // Pre-computed
    // ... rest of context
  };
}
```

### Violation 2: Partial Has Inline Logic for "Optimization"

```handlebars
{{! BAD: Multiple branches in partial }}
<div class='talent'>
  {{#if isForceUser}}
    {{#if forcePowerAvailable}}
      <button>Use Force Power</button>
    {{else}}
      <button disabled>No Power</button>
    {{/if}}
  {{else}}
    <span>Not a Force User</span>
  {{/if}}
</div>
```

**Fix:** Pre-compute the button state:

```javascript
async _prepareContext(options) {
  const actor = this.document;
  const isForceUser = actor.system?.class?.name === 'Force User';
  const forcePowerAvailable = isForceUser && (actor.system?.forcePoints ?? 0) > 0;
  const buttonDisabled = !forcePowerAvailable;

  return {
    isForceUser,
    forcePowerAvailable,
    buttonDisabled,
    // ... rest of context
  };
}
```

```handlebars
{{!-- GOOD: Partial just renders flags --}}
<div class="talent">
  {{#if isForceUser}}
    <button {{#if buttonDisabled}}disabled{{/if}}>
      {{#if forcePowerAvailable}}Use Force Power{{else}}No Power{{/if}}
    </button>
  {{else}}
    <span>Not a Force User</span>
  {{/if}}
</div>
```

**Still not great** (too many branches), but better. Ideally:

```javascript
async _prepareContext(options) {
  // ...
  const talentButton = {
    isForceUser,
    isAvailable: forcePowerAvailable,
    isDisabled: !forcePowerAvailable,
    label: forcePowerAvailable ? 'Use Force Power' : 'No Power'
  };

  return {
    talentButton,
    // ... rest of context
  };
}
```

```handlebars
{{!-- CLEAN: Partial receives pre-computed state --}}
<div class="talent">
  {{#if talentButton.isForceUser}}
    <button {{#if talentButton.isDisabled}}disabled{{/if}}>
      {{talentButton.label}}
    </button>
  {{else}}
    <span>Not a Force User</span>
  {{/if}}
</div>
```

### Violation 3: Partial Uses `<script>` Tags

```handlebars
{{! BAD: Inline scripts }}
<div id='my-component'>
  {{data}}
</div>

<script>
  // ✗ This runs unpredictably document.getElementById('my-component').addEventListener('click', () => { // ... });
</script>
```

**Fix:** Attach listeners in `_onRender()`:

```handlebars
{{! GOOD: No inline scripts }}
<div id='my-component' data-component-id='{{componentId}}'>
  {{data}}
</div>
```

```javascript
async _onRender(context, options) {
  const component = this.element.querySelector('[data-component-id]');
  if (component) {
    component.addEventListener('click', () => {
      // ...
    });
  }
}
```

---

## The Audit Checklist

Before committing a new partial, ask:

- [ ] Does the partial contain `<script>` tags? → Remove them
- [ ] Does the partial have `{{#if}}` chains with 3+ branches? → Move logic to `_prepareContext()`
- [ ] Does the partial call a helper that fetches live data? → Pass pre-computed values instead
- [ ] Can this partial render the same way with the same input every time? → ✓ Pure
- [ ] Could the partial be blank/stale if data didn't come from `_prepareContext()`? → ✓ You found the bug

---

## Quick Reference: Where Logic Lives

| Location            | Purpose              | Pattern                                            |
| ------------------- | -------------------- | -------------------------------------------------- |
| `_prepareContext()` | Compute what renders | Pre-filter, pre-format, pre-compute flags          |
| Handlebars partial  | Render computed data | `{{#each}}`, `{{#if flag}}` only, repeat variables |
| `_onRender()`       | Attach listeners     | `querySelector`, `addEventListener`, read-only DOM |
| `_updateObject()`   | Persist changes      | Route updates through ActorEngine                  |

---

## Result: Zero Silent Failures

When partials are pure:

- ✓ Data always comes from `_prepareContext()`
- ✓ Renders are deterministic (same data → same output)
- ✓ Caching and memoization work
- ✓ v14 migration is trivial (no partial rewrite needed)
- ✓ Mobile layouts can reuse the same partials (only `_prepareContext()` changes)

---

## Examples in SWSE

These partials are pure by design:

- `partials/skill-row-static.hbs` – Receives pre-formatted skill data
- `partials/ability-block.hbs` – Renders computed ability info
- `partials/feat-actions-panel.hbs` – Displays feat list passed via context
- `partials/talent-abilities-panel.hbs` – Renders talent data from `_prepareContext()`

These are reference implementations. Copy their patterns when adding new partials.

---

**Last Updated:** 2026-02-04
**Applies To:** Foundry v13+, SWSE v1.2+
