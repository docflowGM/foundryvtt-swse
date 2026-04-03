# Phase 8: Roll Routing, Engine Integration, and Chat Delivery Verification

**Status**: ✅ COMPLETE  
**Date**: 2026-04-03  
**Branch**: `claude/refactor-layout-systems-8pRgi`

## Executive Summary

Phase 8 completed a comprehensive audit and remediation of all character sheet roll entry points. The audit identified **two categories of broken code paths** and fixed them both:

1. **Dead handlers calling non-existent methods** (SWSERoll.rollWeaponAttack/rollWeaponDamage)
2. **Non-existent chat delivery methods** (SWSEChat.createMessage)

All verified roll entry points now correctly create chat messages and are end-to-end functional.

---

## Part 1: Broken Roll Handlers (FIXED ✅)

### Issue 1: Inventory Item Card Quick Rolls

**Problem**: Two event handlers in character-sheet.js were calling non-existent SWSERoll methods:

```javascript
// BROKEN:
await SWSERoll.rollWeaponAttack(this.actor, itemId);    // ❌ Doesn't exist
await SWSERoll.rollWeaponDamage(this.actor, itemId);    // ❌ Doesn't exist
```

**Root Cause**: Inventory item cards (inventory-item-card.hbs, inventory-weapon-card.hbs) had `data-action="roll-attack"` and `data-action="roll-damage"` attributes wired to these handlers, but the methods were never implemented.

**Affected Files**:
- `scripts/sheets/v2/character-sheet.js` (lines 2151-2187)
- `templates/actors/character/v2/partials/inventory-item-card.hbs` (lines 40, 44)
- `templates/actors/character/v2/partials/inventory-weapon-card.hbs` (line 9)

**Solution**: 
- Removed the broken handlers from character-sheet.js
- Removed redundant `data-action` attributes from templates
- Templates now use only the working class-based handlers (.attack-btn, .damage-btn)

**Why This Works**: The templates already have `.attack-btn` and `.damage-btn` buttons with proper handlers that show a modifier dialog and call working methods (SWSERoll.rollAttack, SWSERoll.rollDamage) which correctly create chat messages.

---

## Part 2: Broken Chat Delivery Methods (FIXED ✅)

### Issue 2: Non-Existent SWSEChat.createMessage()

**Problem**: Five calls to a non-existent method were preventing force power and combat executor messages from being posted to chat:

```javascript
// BROKEN:
await SWSEChat.createMessage({ actor, content, type: "force" });       // ❌ Doesn't exist
await SWSEChat.createMessage({ actor, content, type: "force-roll" });  // ❌ Doesn't exist
await SWSEChat.createMessage({ actor, content, type: "recovery" });    // ❌ Doesn't exist
await SWSEChat.createMessage({ actor, content, type: "attack" });      // ❌ Doesn't exist
await SWSEChat.createMessage({ actor, content, type: "initiative" });  // ❌ Doesn't exist
```

**Root Cause**: Code was calling an incorrectly named method. SWSEChat only provides:
- `postRoll()` - for rolls with SWSERollEngine structured data
- `postHTML()` - for HTML-based messages

**Affected Files**:
- `scripts/engine/force/force-executor.js` (3 calls)
- `scripts/engine/combat/combat-executor.js` (2 calls)

**Solution**: Replaced all calls with the correct method:

```javascript
// FIXED:
await SWSEChat.postHTML({ actor, content });
```

**Why This Works**: SWSEChat.postHTML() is the correct method for posting HTML-formatted messages to chat. It creates a ChatMessage with the provided HTML content and routes through the canonical message creation pipeline.

---

## Part 3: Verified Working Roll Paths (✅)

All character sheet roll entry points were traced end-to-end and verified to create chat messages:

### Direct Roll Actions (No Dialog)
| Button | Handler | Method Chain | Chat Output |
|--------|---------|--------------|------------|
| Ability name | roll-ability | SWSERoll.rollAbility() → createChatMessage() | ✅ Yes |
| Initiative button | roll-initiative | SWSEInitiative.rollInitiative() → roll.toMessage() | ✅ Yes |
| Take 10 | take10-initiative | SWSEInitiative.take10Initiative() → ChatMessage.create() | ✅ Yes |
| Skill name | roll-skill | SWSERoll.rollSkill() → createChatMessage() | ✅ Yes |
| Perception (combat stats) | roll-skill | SWSERoll.rollSkill() → createChatMessage() | ✅ Yes |

### Dialog-Based Roll Actions (With Modifiers)
| Button | Handler | Method Chain | Chat Output |
|--------|---------|--------------|------------|
| ⚔ Attack btn | .attack-btn + dialog | SWSERoll.rollAttack() → createChatMessage() | ✅ Yes |
| 💥 Damage btn | .damage-btn + dialog | SWSERoll.rollDamage() → rollDamage() → SWSEChat.postRoll() | ✅ Yes |

### Dialog-Based Weapon Rolls
| Button | Handler | Method Chain | Chat Output |
|--------|---------|--------------|------------|
| "Roll Attack" | roll-weapon-attack | CombatRollConfigDialog → CombatEngine.rollAttack() → rollAttack() → SWSEChat.postRoll() | ✅ Yes |

### Force Power Actions
| Button | Handler | Method Chain | Chat Output |
|--------|---------|--------------|------------|
| Activate/Recover | activate-force | ForceExecutor.activateForce() → SWSEChat.postHTML() | ✅ Yes |

---

## Part 4: Roll Method Implementation Details

### SWSERoll Service (scripts/combat/rolls/enhanced-rolls.js)

**Verified Methods**:
- `rollAbility(actor, abilityKey, options)` - Creates chat via createChatMessage()
- `rollSkill(actor, skillKey, options)` - Creates chat via createChatMessage()
- `rollAttack(actor, weapon, options)` - Creates chat via createChatMessage()
- `rollDamage(actor, weapon, options)` - Calls rollDamage() from attacks.js
- **Missing**: rollWeaponAttack, rollWeaponDamage (not needed; covered by above)

### RollAttack Service (scripts/combat/rolls/attacks.js)

**Verified Methods**:
- `rollAttack(actor, weapon)` - Creates chat via SWSEChat.postRoll()
- `rollDamage(actor, weapon)` - Creates chat via SWSEChat.postRoll()

### Initiative Service (scripts/engine/combat/SWSEInitiative.js)

**Verified Methods**:
- `rollInitiative(actor, options)` - Creates chat via roll.toMessage()
- `take10Initiative(actor)` - Creates chat via ChatMessage.create()

### Force Service (scripts/engine/force/force-executor.js)

**Verified Methods** (FIXED):
- `activateForce(actor, powerId, recover)` - Creates chat via SWSEChat.postHTML() ✅ FIXED
- `recoverForcePowers(actor, powerIds)` - Creates chat via SWSEChat.postHTML() ✅ FIXED
- `executeForcePower(actor, powerId, options)` - Creates chat via SWSEChat.postHTML() ✅ FIXED

### CombatEngine (scripts/engine/combat/CombatEngine.js)

**Verified Methods**:
- `rollInitiative(actor, options)` - Delegates to SWSEInitiative.rollInitiative()
- `rollAttack(actor, actionKey, options)` - Calls rollAttack() from attacks.js

---

## Summary of Changes

### Commit 1: Remove Dead Roll Code Paths
**Hash**: `bc3da66`

Removed two non-existent handler methods and their template wiring:
- Deleted 36 lines of dead code from character-sheet.js
- Updated inventory-item-card.hbs to remove redundant data-action attributes
- Updated inventory-weapon-card.hbs weapon name button

### Commit 2: Fix Broken Chat Delivery
**Hash**: `eb94e4e`

Fixed 5 calls to non-existent SWSEChat.createMessage():
- Updated force-executor.js (3 methods)
- Updated combat-executor.js (2 methods)
- All now correctly use SWSEChat.postHTML()

---

## Verification Checklist

✅ All ability checks create chat messages  
✅ All skill checks create chat messages  
✅ All attack rolls create chat messages  
✅ All damage rolls create chat messages  
✅ All initiative rolls create chat messages  
✅ All take-10 actions create chat messages  
✅ All force power activations create chat messages  
✅ All force power recoveries create chat messages  
✅ Combat executor messages post correctly  
✅ No non-existent method calls remain  
✅ No dead code paths remain  
✅ All templates use working handlers  

---

## Outstanding Notes

### Not Covered (Out of Scope)

The following are in other actor types (vehicle, NPC, droid sheets) and use legacy global game.swse methods:
- Vehicle defense rolls (roll-defense in vehicle-sheet)
- Vehicle weapon rolls (roll-weapon in vehicle-sheet)
- NPC/Droid sheet equivalents

These are not part of the main character sheet audit but may warrant future review.

---

## Conclusion

**Phase 8 Complete**: All character sheet roll entry points are now functional and correctly create chat messages. The broken code paths have been removed, and the broken chat delivery methods have been fixed. The system has a single, canonical path for each roll type with no redundant or dead code.
