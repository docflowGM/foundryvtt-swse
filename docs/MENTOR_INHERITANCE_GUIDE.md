# Mentor Inheritance Chain (Fix 2)

Optional mentor system enhancement that provides CSS-like cascade resolution for character archetypes, factions, prestige classes, and Force paths.

---

## Overview

**When to use:**
- Prestige class transitions want different mentor tone
- Archetypes (Jedi Guardian vs. Jedi Consular) should have different mentors
- Force-sensitive vs. non-sensitive characters should have different mentors
- Dark Side users want Sith mentors, Light Side users want Jedi mentors
- Character reaches faction rank and switches mentors

**Example resolution chain:**
```
Character: Jedi Knight, Guardian archetype, Republic faction
  1. Try: Guardian archetype mentor → Jedi ✓ (found)
  2. If not found: Try faction mentor → Republic → Jedi ✓
  3. If not found: Try class mentor → Jedi ✓
  4. If not found: Default → Ol' Salty
```

---

## How It Works

### The Inheritance Hierarchy (in priority order)

1. **Prestige Class** (highest priority)
   - When character takes a prestige class
   - Examples: `Elite Trooper → Soldier`, `Assassin → Scoundrel`

2. **Archetype**
   - Subtype within a class with distinct personality
   - Examples: `Guardian`, `Consular`, `Sentinel` within Jedi
   - Or: `Commando`, `Duelist`, `Rifleman` within Soldier

3. **Special Path**
   - Force-related, alignment-based, or philosophical paths
   - Examples: `dark-side`, `light-side`, `force-adept`

4. **Faction**
   - Organizational alignment
   - Examples: `republic`, `sith-empire`, `underworld`

5. **Base Class** (fallback level)
   - The character's primary class
   - Examples: `Jedi`, `Soldier`, `Scoundrel`

6. **Default** (ultimate fallback)
   - Ol' Salty

---

## Usage Examples

### Simple Class-Based (No Inheritance)

```javascript
// Basic usage - just use the class mentor
const mentor = MentorResolver.resolveFor(actor, { phase: 'levelup' });
```

### With Archetype (Enhanced)

```javascript
// Prestige Jedi Guardian -> wants Guardian mentor (still Jedi voice, but refined)
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: 'Jedi',
  archetype: 'guardian'
});

// Result: Jedi mentor (since Guardian archetype maps to Jedi)
```

### With Prestige Class

```javascript
// Character takes Assassin prestige class -> wants Assassin mentor tone
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: 'Scoundrel',
  prestigeClass: 'assassin'
});

// Result: Scoundrel mentor (Assassin maps to Scoundrel)
```

### With Dark Side Path

```javascript
// Character embraces Dark Side -> mentor becomes Sith
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: 'Jedi',
  path: 'dark-side'
});

// Result: Sith mentor (overrides Jedi class mentor)
```

### With Multiple Options (Full Chain)

```javascript
// Prestige character, faction-affiliated, Force-sensitive
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: 'Jedi',              // Base
  prestigeClass: 'jedi-master',   // Prestige
  archetype: 'guardian',          // Archetype
  faction: 'republic',            // Faction
  path: 'light-side'              // Path
});

// Resolution order:
// 1. Prestige → jedi-master → Jedi ✓
// (stops here, found)
```

---

## Current Taxonomy

### Archetypes

**Jedi:**
- `guardian` → Jedi
- `consular` → Jedi
- `sentinel` → Jedi

**Sith:**
- `sith-warrior` → Sith
- `sith-sorcerer` → Sith

**Soldier:**
- `commando` → Soldier
- `duelist` → Soldier
- `rifleman` → Soldier

**Scoundrel:**
- `scoundrel-smuggler` → Scoundrel
- `scoundrel-pirate` → Scoundrel
- `scoundrel-con-artist` → Scoundrel

### Factions

- `republic` → Jedi
- `sith-empire` → Sith
- `force-sensitive` → Jedi
- `non-force` → Scoundrel
- `military` → Soldier
- `underworld` → Scoundrel

### Prestige Classes

- `elite-trooper` → Soldier
- `gunslinger` → Scoundrel
- `assassin` → Scoundrel
- `bounty-hunter` → Soldier
- `sith-apprentice` → Sith
- `sith-lord` → Sith
- `imperial-knight` → Jedi
- `force-master` → Jedi
- `jedi-master` → Jedi

### Paths

- `dark-side` → Sith
- `light-side` → Jedi
- `force-adept` → Jedi
- `droid-specialist` → Scout

---

## Integration Points

### 1. Levelup Phase (Prestige Class Taking)

When character gains a prestige class:

```javascript
// In levelup progression hook
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: actor.baseClass,
  prestigeClass: newPrestigeClass  // e.g., 'elite-trooper'
});

showMentorGreeting(mentor, levelUp, actor);
```

### 2. Force Sensitivity Change

When character embraces Dark Side or learns Force:

```javascript
// Character spent dark side points -> switch to Sith mentor
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: actor.class,
  path: actor.darkSideScore > 50 ? 'dark-side' : 'light-side'
});

showMentorGuidance(mentor, 'force-decision');
```

### 3. Faction Join

When character joins a faction:

```javascript
// Character becomes Jedi Knight -> mentor reflects Republic allegiance
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: actor.class,
  faction: actor.faction  // e.g., 'republic'
});

showMentorGuidance(mentor, 'faction-joined');
```

### 4. Archetype Selection (Optional Chargen Enhancement)

If system tracks archetypes during chargen:

```javascript
// Jedi player selects Guardian archetype
const mentor = MentorResolver.resolveWithInheritance(actor, {
  className: 'Jedi',
  archetype: selectedArchetype  // e.g., 'guardian'
});

updateNarrator(mentor);
```

---

## Debug Features

### Get the Full Resolution Chain

Useful for understanding why a particular mentor was chosen:

```javascript
const chain = MentorResolver.getInheritanceChain(actor, {
  className: 'Jedi',
  prestigeClass: 'jedi-master',
  archetype: 'guardian',
  faction: 'republic'
});

console.log(chain);
// Output:
// [
//   { level: 'prestige', value: 'jedi-master', mentor: {...} },
//   { level: 'faction', value: 'republic', mentor: {...} },
//   { level: 'class', value: 'Jedi', mentor: {...} },
//   { level: 'default', value: 'Scoundrel', mentor: {...} }
// ]
```

### Inspect Taxonomy

See all current associations:

```javascript
const taxonomy = MentorResolver.getTaxonomy();
console.log(taxonomy.archetypes);    // All archetype mentors
console.log(taxonomy.factions);      // All faction mentors
console.log(taxonomy.prestigeClasses); // All prestige mentors
```

---

## Extending the System

### Add a Custom Archetype

```javascript
// Register that 'duelist' archetype uses 'Duelist' mentor
MentorResolver.registerMentorAssociation('archetype', 'duelist', 'Duelist');

// Now when resolving with archetype: 'duelist', it will find the Duelist mentor
```

### Add a Custom Faction

```javascript
// Create a new faction with its own mentor
MentorResolver.registerMentorAssociation('faction', 'bounty-hunters-guild', 'Bounty Hunter');

// Characters in that faction get Bounty Hunter mentor
```

### Add a Custom Prestige Class

```javascript
// New prestige class wants a specific mentor
MentorResolver.registerMentorAssociation('prestige', 'force-lord', 'Jedi');

// Elite Force Lords get Jedi mentor (or could be custom)
```

---

## When NOT to Use Inheritance

**Use simple resolve() if:**
- You just have a class name
- You don't need archetype/prestige logic
- You want the fastest resolution (minimal lookups)

**Use resolveWithInheritance() if:**
- Character has prestige class
- You want archetype-specific dialogue
- You want faction-aware mentors
- You want Force path support
- You're building advanced UI features

---

## Performance Considerations

- **Simple resolve()**: O(1) - direct class lookup
- **resolveWithInheritance()**: O(n) - checks up to 6 levels
  - Still very fast (nanoseconds), negligible for gameplay
  - Cache mentor if calling repeatedly

---

## Example: Prestige Class Mentor Transition

Complete example of using inheritance for prestige transitions:

```javascript
// In progression.js when character takes prestige class
async onPrestigeClassTaken(actor, prestigeClassName) {
  // Get new mentor using inheritance chain
  const mentor = MentorResolver.resolveWithInheritance(actor, {
    className: actor.baseClass,
    prestigeClass: prestigeClassName
  });

  // Show mentor portrait and new dialogue
  const greeting = getMentorGreeting(mentor, actor.system.level, actor);

  // Display with special effect for prestige moment
  await showMentorDialogue(mentor, greeting, {
    prestige: true,
    transition: true
  });

  // Update actor's active mentor to new one
  await setMentorOverride(actor, mentorKey);
}
```

---

## Aliases

The `resolveWithInheritance()` method is also available as:

```javascript
// All equivalent:
MentorResolver.resolveWithInheritance(actor, options);
MentorInheritance.resolve(actor, options);  // Direct call
```

Use whichever reads best in your context.

---

## Summary

**Fix 2 provides:**
- ✅ CSS-like cascade for mentor selection
- ✅ Support for prestige classes, archetypes, factions, paths
- ✅ Intelligent fallback (doesn't need all options)
- ✅ Debug utilities (chain inspection)
- ✅ Extension API (register custom associations)
- ✅ Optional use (Fix 1 + Fix 3 still work independently)

**Use it when:**
- Building prestige class transitions
- Want archetype-specific dialogue
- Character choices should change mentor
- Want faction mentorship
- Building advanced mentor UI

**It's optional because:**
- Base class mentor works fine most of the time
- Simple resolution is faster
- Not all games need this level of mentor detail
