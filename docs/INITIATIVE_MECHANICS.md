# Initiative System Documentation

## Overview

The SWSE Initiative system has been updated to correctly implement Star Wars Saga Edition rules for Initiative checks, Feint combat mechanics, and Saber Lock interactions.

## Initiative Formula

**Base Formula: 1d20 + Initiative Skill Total [+ Vehicle Size Modifier]**

### Components

1. **d20 Roll** - Random 1-20
2. **Initiative Skill** - DEX-based skill (characters trained or untrained)
3. **Vehicle Size Modifier** - Applied only when piloting vehicles

### Vehicle Size Modifiers

| Size | Modifier |
|------|----------|
| Colossal | -10 |
| Gargantuan | -5 |
| Huge | -2 |
| Large | -1 |
| Medium, Small, Tiny | 0 |

**Example:** A Huge starfighter pilot rolls 1d20 + Initiative total (-2) because the ship's size imposes a -2 penalty to Initiative.

### Rules Notes

- You can **Take 10** on Initiative checks (but not Take 20)
- Initiative result remains the same for all rounds unless modified by special actions (Delay, Ready)
- When two combatants tie, the character with the highest Initiative modifier acts first
- If still tied, roll an additional Initiative check

## Feint Mechanics

### Core Rules

**Action:** Standard Action (or Full-Round if Trained in Deception for multiple targets)

**Resolution:**
1. You make a **Deception check** that sets a **DC**
2. Target rolls **Initiative check** to oppose
3. If your Deception check DC > target's Initiative roll = target is **Flat-Footed** against your first attack next round

### Feint Modifiers

#### Basic Penalties

| Condition | Modifier |
|-----------|----------|
| Non-humanoid creature | -5 |
| Target has INT < 3 | -5 |
| Each additional target (beyond 1st) | -5 each |

#### Deception Check Bonuses

| Circumstance | Bonus |
|--------------|-------|
| Target humanoid with INT ≥ 3 | +0 |
| Simple/believable feint | +5 |
| Difficult feint | -5 |

### Multiple Target Feinting

**Requirements:**
- Must be **Trained in Deception**
- Targets must be clearly visible
- All targets must be within **6 squares**

**Action:** Full-Round Action

**Mechanics:**
- You roll **once** to set the DC
- Each target beyond the first imposes **-5 penalty** on your single Deception check
- Any target whose Initiative you beat is Flat-Footed against your first attack next round

**Example:** Feinting 3 enemies
- Base Deception check: +5 (trained bonus)
- Additional targets: -5 (target 2) -5 (target 3) = -10 total
- Final Deception DC: rolled 1d20 + 5 - 10

### Vehicle Feinting

**When:** You are the Pilot of a Vehicle

**Deception Check Modifier:**
- Add vehicle's **size modifier**
- Add **DEX modifier**
- Subtract **5 if not Trained in Pilot**

**Effect:**
- On successful Feint, vehicle is considered Flat-Footed against only the **vehicle's first attack**
- **Gunners** on the vehicle do NOT benefit from the Feint (only the pilot's attack)

**Example:** Gargantuan starship pilot with +1 DEX modifier
- Deception check: 1d20 + Deception skill + (-5 for size) + (+1 for DEX) = 1d20 + skill - 4
- If not trained in Pilot: additional -5 penalty

### Flat-Footed Effect

**Duration:** Until the end of the target's next turn (covers current round + start of next)

**Defense:** Flat-Footed Defense = Reflex Defense - DEX modifier

**Stacking:** Can be Feinted multiple times; each creates a separate effect

## Saber Lock Mechanics

### Reference
*Star Wars Saga Edition Jedi Academy Training Manual*

### Triggering a Saber Lock

**Condition:** When a character with the **Block Talent** makes a Use the Force check to negate an attack and the result is **exactly equal** to the incoming attack roll.

**Resolution:**
1. Saber Lock is established
2. Both the blocker and attacker make **opposed Initiative checks**
3. Whoever wins makes an immediate **Unarmed attack** as a **Free Action**
4. Saber Lock then ends

### Saber Lock Mechanics

**Initiative Rolls:**
- Each character rolls: 1d20 + Initiative skill total
- No additional modifiers apply
- Winner = higher Initiative result

**Winner's Benefit:**
- Make **one** Unarmed attack as a Free Action against the loser
- Unarmed attack uses normal attack roll mechanics
- No additional restrictions or bonuses

**Loser's Status:**
- Can be damaged by the winner's free Unarmed attack
- Does not get to respond or attack back (it's a free action for the winner)

### Related Rules

**Block Talent Requirements:**
- Must be **Force Sensitive**
- Used as a **reaction** to negate melee attacks
- Use the Force check must equal or exceed attack roll to negate

**Lightsaber Damage:** Standard weapon damage on successful attack

## Delay Action

### Overview
You choose to act later than your normal Initiative count.

**Action Type:** Voluntary Initiative reduction

### How It Works

1. When your Initiative comes up, you **choose to Delay**
2. You **voluntarily reduce your Initiative** for the rest of the encounter
3. At a later point in the round, you act at your new Initiative count
4. Your new Initiative count becomes fixed at that point

### Strategic Uses

- Wait to see what allies/enemies do
- Coordinate attacks with other party members
- React to unexpected situations
- Set up tactical positioning

### Cost

- You **lose initiative** - the time spent waiting is gone
- Cannot recover lost Initiative for this encounter
- You never get back the initiative you gave up

### Mechanics

- Characters can Delay at any point during the round
- Your Initiative slot opens up (others can act in your spot)
- When you choose to act, you slot into the Initiative order at that point
- Only one Initiative count per encounter (can't delay multiple times)

### Example
- Your Initiative: 22
- Opponents' Initiative: 18, 14, 10
- You Delay at count 22
- At count 14, you see an opponent move into position
- You act at count 14, becoming Initiative 14 for rest of encounter
- You never regain your original count 22

## Ready Action

### Overview
You prepare to take an action in response to a specific trigger.

**Action Type:** Standard Action to set up, triggers a Reaction

### How It Works

1. As a **Standard Action**, specify:
   - The action you will take (Standard, Swift, or Move action)
   - The circumstances that trigger it
2. At any point **before your next turn**, if circumstances occur, you may take the Readied Action as a **Reaction**
3. If you reach your next turn and haven't used it, the Readied Action is lost

### Readied Action Types

- **Standard Action** (attack, ability use, etc.)
- **Move Action** (move, withdraw, etc.)
- **Swift Action** (bonus action, quick effect, etc.)

### Initiative Consequences

**If you use the Readied Action in this round:**
- Your new Initiative count = the count you acted on
- You do NOT get your regular action that turn
- You continue at this new Initiative count for remaining rounds

**If you reach your next turn without using it:**
- The Readied Action is wasted
- You can Ready the same action again if you want
- Initiative count does not change

### Example Scenario

**Setup (Count 14):**
- Kelko: Readies to attack first enemy within 1 square
- Sia-Lan: Readies to move and attack first foe reaching her

**Resolution (Count 7):**
- Enemy charges and Kelko's trigger activates
- Kelko shoots at count 7, now Initiative 7 for rest of encounter
- Enemy reaches Sia-Lan and her trigger activates
- Sia-Lan attacks at count 7, now Initiative 7 for rest of encounter

**After This Round:**
- Both Kelko and Sia-Lan act on Initiative 7
- They act before the enemies (count 7 vs count 7 from enemy charge)

### Advanced Rules

- Can Ready against multiple potential triggers (pick whichever happens first)
- Can specify "first attack against me" or similar broad triggers
- Multiple characters can Ready different actions
- Readied actions can be on the same Initiative count as other actions (resolve ties normally)

## System Implementation Files

| Feature | File | Class |
|---------|------|-------|
| Initiative Formula | scripts/combat/swse-combat.js | SWSECombatDocument |
| Feint Mechanics | scripts/combat/feint-mechanics.js | FeintMechanics |
| Saber Lock Mechanics | scripts/combat/saber-lock-mechanics.js | SaberLockMechanics |
| Houserules Data | scripts/houserules/houserules-data.js | HouserulesData |

## Usage Examples

### Using Feint Mechanics

```javascript
// In a chat command or macro:
const targets = canvas.tokens.placeables.filter(t => /* filter targets */);
const result = await SWSE.FeintMechanics.initiateFeint(game.user.character, targets);

if (result.success) {
  // Feint was rolled and results generated
  console.log(`Feint DC: ${result.deceptionDC}`);
  result.targets.forEach(t => {
    console.log(`${t.targetName}: ${t.success ? 'Flat-Footed' : 'Resisted'}`);
  });
}
```

### Checking for Saber Lock

```javascript
// In Block talent resolution when check result == attack roll:
const lockCheck = SWSE.SaberLockMechanics.checkSaberLock(
  blocker,
  blockCheckResult,
  attackRoll,
  attacker
);

if (lockCheck.locked) {
  const resolution = await SWSE.SaberLockMechanics.resolveSaberLock(
    blocker,
    attacker
  );
  console.log(`${resolution.winner} wins the Saber Lock!`);
}
```

## Related Rules References

- **Core SWSE Initiative:** Player's Handbook, Combat chapter
- **Feint:** Complete description in Deception skill (Skills chapter)
- **Vehicle Size Modifiers:** Vehicle Combat section
- **Saber Lock:** Jedi Academy Training Manual (Block talent)
- **Delay/Ready:** Special Initiative Actions (Combat chapter)

## Common Questions

**Q: Does Take 10 apply to Initiative?**
A: Yes, you can Take 10 on Initiative checks but NOT Take 20.

**Q: Can you feint the same target multiple times in one action?**
A: No, each Feint targets different opponents. You can only feint each opponent once per Feint action.

**Q: Does Feinting a vehicle affect the gunners?**
A: No, only the vehicle (pilot) gets the flat-footed benefit. Gunners do not.

**Q: What if you Delay and then the combat ends?**
A: Your delayed Initiative count is lost and only applies to that encounter. You start fresh in the next encounter.

**Q: Can you Ready an action while flat-footed?**
A: Yes, flat-footed only affects your Defense, not your ability to Ready.

**Q: What happens if a Saber Lock occurs and the blocker wins?**
A: The blocker makes an immediate Unarmed attack as a Free Action before anything else happens.
