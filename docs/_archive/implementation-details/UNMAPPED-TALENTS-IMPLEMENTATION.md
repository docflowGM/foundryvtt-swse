# Unmapped Talents Implementation Plan
**Status:** Analysis Complete - Ready for Phase 1 Implementation
**Date:** January 1, 2026
**Total Talents:** 161

---

## Executive Summary

The 161 unmapped talents have been analyzed and categorized by implementation complexity. They can be implemented in 5 phases following the "easy wins first" principle:

| Phase | Category | Count | Complexity | Timeline |
|-------|----------|-------|-----------|----------|
| 1 | Passive Bonuses | 9 | Low | Phase 1 |
| 2 | Skill Substitutions | 7 | Low | Phase 1 |
| 3 | Simple Conditional | 25 | Medium | Phase 2 |
| 4 | Once-Per-Encounter | 40 | Medium | Phase 2 |
| 5 | Complex Conditional | 56 | High | Phase 3 |
| 6 | Complex Mechanics | 24 | Very High | Phase 4 |

---

## PHASE 1: PASSIVE BONUSES (9 talents) - EASY WINS

These talents provide straightforward numeric bonuses that can be implemented as simple Active Effects or actor system modifications.

### Tier 1A: Active Effect Bonuses (can be automated)
```
Expert Grappler - Gain +2 on opposed grapple checks
  → Changes: Add +2 to grapple opposition rolls

Penetrating Attack - Reduce opponent's DR by 5 with a single weapon group
  → Changes: Add -5 to opponent's DR when using weapon group
  → Note: Weapon-specific, needs weapon group detection

Devastating Attack - Reduce opponent's damage threshold by 5 with a single weapon group
  → Changes: Reduce opponent's threshold by 5
  → Note: Weapon-specific, needs weapon group detection
```

### Tier 1B: System Modifications (requires code/special handling)
```
Juggernaut - Armor does not reduce speed or distance moved
  → Modify: system.armor.reduceSpeed = false
  → Must integrate with armor/speed calculation system

Great Shot - Reduce range penalties by one category
  → Modify: Range penalty reduction
  → Needs integration with range penalty calculation

Keen Shot - Ignore penalties against opponents with concealment
  → Modify: Concealment penalty handling
  → Needs target inspection logic

Closed Mind - Mind-affecting effects against you are rolled twice, take lower result
  → Modify: Mind-affecting effect calculation
  → Complex: Requires roll modification hook

Master Advisor - Ally you aid gains a Force Point before end of encounter
  → Action: Grant Force Point when Skilled Advisor succeeds
  → Complex: Needs roll success detection and FP granting

Connections - Acquire equipment worth CL×1000 credits, reduce black market multiplier by 1
  → This is more narrative/game mechanic
  → Could be a toggle with market modifications
```

**Implementation Notes:**
- Expert Grappler: Simple active effect, +2 bonus
- Juggernaut: Needs armor system hook
- Keen Shot: Needs conditional bonus logic
- Great Shot: Needs range calculation integration
- Closed Mind: Requires roll modification
- Master Advisor: Requires success detection
- Penetrating Attack: Needs weapon group context
- Devastating Attack: Needs weapon group context
- Connections: Narrative/economy system

---

## PHASE 2: SKILL SUBSTITUTIONS (7 talents)

These talents allow using one skill in place of another.

```
Advantageous Positioning - Opponent you flank is treated as flat-footed
  → Type: Positioning bonus
  → Implementation: Combat position check + flat-footed status

Armored Spacer - Treat armor proficiency as Armor Proficiency (heavy)
  → Type: Armor classification
  → Implementation: Modify armor proficiency classification

Defensive Measures - Use Will Defense instead of flat-footed
  → Type: Defense substitution
  → Implementation: Replace flat-footed calculation

Exotic Weapons Master - Use weapon group with Weapon Focus (exotic melee)
  → Type: Weapon group classification
  → Implementation: Modify weapon group classification

Force Fortification - Use Will in place of Fortitude Defense
  → Type: Defense substitution
  → Implementation: Override defense type

Rifle Master - Pistol class weapon counts as rifle for talents requiring rifles
  → Type: Weapon classification
  → Implementation: Modify weapon type classification

Take Them Alive - Use opposed Persuasion instead of opposed combat
  → Type: Attack substitution
  → Implementation: Use Persuasion for target capture/knockout
```

---

## PHASE 3: SIMPLE CONDITIONAL TALENTS (25 talents)

These have straightforward conditional triggers and effects.

```
EXAMPLES:

Blowback - If you exceed target's threshold, push target 1 square
  → Trigger: Damage exceeds threshold
  → Effect: Push 1 square
  → Implementation: On-hit conditional movement

Bunker Blaster - If adjacent to cover providing cover to target, aim as move action
  → Trigger: Adjacent to cover
  → Effect: Aim as move action
  → Implementation: Position check + action economy modification

Close Contact - Point-blank range increased by 5 squares; short range begins 5 squares later
  → Type: Range modification
  → Effect: Modify range categories
  → Implementation: Range table modification

Breach Cover - Ignore cover when firing/throwing burst or splash weapons
  → Trigger: Using burst/splash weapons
  → Effect: Ignore cover
  → Implementation: Cover negation for specific weapon types

Breaching Explosive - Ignore door/wall thresholds with mines/non-grenade explosives
  → Trigger: Using mine/explosive
  → Effect: Ignore structural thresholds
  → Implementation: Threshold negation for explosives
```

**Total: 25 talents with similar conditional structures**

---

## PHASE 4: ONCE-PER-ENCOUNTER ABILITIES (40 talents)

These grant limited-use special abilities that reset at encounter end.

```
EXAMPLES:

Avert Disaster - Once per encounter, turn critical hit against you into normal hit
  → Trigger: Critical hit received
  → Effect: Negate critical
  → Uses: 1 per encounter
  → Implementation: Toggle ability, auto-consume on crit vs you

Aggressive Surge - Once per encounter, make free charge when taking Second Wind
  → Trigger: Second Wind used
  → Effect: Free charge action
  → Uses: 1 per encounter
  → Implementation: Detect Second Wind use, grant charge

Cleanse Mind - Once per turn, remove ongoing mind-affecting effect from ally in LoS
  → Trigger: Reaction
  → Effect: Remove condition
  → Uses: 1 per turn (not per encounter)
  → Implementation: Toggle ability to remove effect

Dirty Fighting - Once per encounter, when you miss, deal half damage
  → Trigger: Attack misses
  → Effect: Half damage instead of miss
  → Uses: 1 per encounter
  → Implementation: On-miss modifier

Entreat Aid - Once per encounter, adjacent ally gains +2 attack until end of turn
  → Trigger: Activation
  → Effect: Bonus to nearby ally
  → Uses: 1 per encounter
  → Implementation: Toggle with automatic expiration
```

**Total: 40 talents with this structure**
- Most need toggle mechanics
- Most need encounter reset
- Many have specific triggers (critical hits, misses, ally actions)

---

## PHASE 5: COMPLEX CONDITIONAL TALENTS (56 talents)

These have multiple conditions or complex mechanical interactions.

```
EXAMPLES:

Advanced Intel - If not surprised, use Spotter in surprise round
  → Condition: Not surprised
  → Effect: Use Spotter ability in surprise round
  → Implementation: Surprise round detection + ability unlock

Aversion - Until end of encounter, squares within 2 squares are difficult terrain for enemies
  → Type: Aura effect
  → Duration: Encounter
  → Effect: Difficult terrain
  → Implementation: Dynamic aura system

Assault Tactics - DC 15 Tactics check designate creature; allies deal +d6 damage
  → Requirement: Successful Tactics check
  → Effect: Damage bonus to allies
  → Duration: Until end of encounter?
  → Implementation: Conditional bonus with check requirement

Beast Trick - Use Mind Trick on beasts with Int 2 or less
  → Condition: Target is beast, Int ≤ 2
  → Effect: Mind Trick application
  → Implementation: Conditional skill use

Competitive Edge - When not surprised, allies equal to Cha mod benefit from bonuses
  → Condition: Not surprised
  → Effect: Distribute bonus to multiple allies
  → Implementation: Selective ally buffing
```

**Total: 56 talents with varied conditions**

---

## PHASE 6: COMPLEX MECHANICS (24 talents)

These require special systems or significant code integration.

```
EXAMPLES:

Black Market Buyer - Automatically locate black market merchant
  → Type: Game mechanic
  → Effect: Merchant availability
  → Implementation: Campaign mechanic, likely narrative

Bring Them Back - Revive target that died within N rounds (N = half heroic level)
  → Type: Revive mechanic
  → Requirements: Dead target within time limit
  → Effect: Return to life
  → Implementation: Special resurrection logic, conflict with death rules

Call Weapon - Call and ignite lightsaber within line of sight as free action
  → Type: Object manipulation
  → Effect: Teleport weapon
  → Implementation: Special item interaction

Cause Mutation - Transform creature into Sith Abomination/Chrysalis Beast
  → Type: Creature transformation
  → Requirements: Days-long process
  → Effect: Change creature type
  → Implementation: Complex transformation system

Channel Energy - Convert energy from Negate Energy to activate power in suite
  → Type: Force power modification
  → Requirements: Negate Energy active
  → Effect: Power substitution
  → Implementation: Force power system integration

Empower Weapon - Increase weapon damage die by 1 size category
  → Type: Weapon modification
  → Requirements: Sustained action
  → Effect: Damage scaling
  → Implementation: Dynamic weapon modification

Force Chain - Extend Force power range through chain of allies
  → Type: Force power modification
  → Effect: Range extension through network
  → Implementation: Complex targeting system

Feel the Force - Use Force skill in place of attack rolls
  → Type: Attack substitution
  → Effect: Replace attack with skill
  → Implementation: Combat mechanic modification

Fringe Savant - Use 2 different class skills for one Misc skill
  → Type: Skill substitution
  → Effect: Multiple skill options
  → Implementation: Class skill system

Immovable - Cannot be moved by abilities, powers, or objects
  → Type: Movement negation
  → Effect: Prevent displacement
  → Implementation: Movement system hook

Jury Rig - Combine abilities from two talents for one action
  → Type: Talent combination
  → Effect: Multiple talent application
  → Implementation: Complex ability stacking

Lethal Momentum - Deal double damage if target was moved this turn
  → Type: Conditional damage
  → Requirements: Target movement tracking
  → Effect: Damage multiplier
  → Implementation: Turn state tracking

Mercy Kill - Kill unconscious target as free action
  → Type: Special action
  → Effect: Instant defeat
  → Implementation: Special action type

Mind Over Matter - Use Intelligence instead of Strength or Dexterity
  → Type: Ability substitution
  → Effect: Replace ability modifier
  → Implementation: Ability modifier override

Mobile Combatant - Move as free action after attacking
  → Type: Action economy
  → Effect: Movement grant
  → Implementation: Action economy modification

Myoflex Enhancers - +2 damage with melee weapons
  → Type: Damage bonus
  → Effect: Weapon damage increase
  → Implementation: Simple bonus (could be Active Effect)

Noble Fencing Style - Use Charisma instead of Strength with light melee/lightsaber
  → Type: Ability substitution
  → Effect: Replace ability modifier
  → Implementation: Weapon-based ability override

Rapid Reload - Reload weapon as free action
  → Type: Action economy
  → Effect: Free reload
  → Implementation: Action economy modification

Ricochet Throw - Throw weapon and have it return after hitting
  → Type: Weapon behavior
  → Effect: Auto-return weapon
  → Implementation: Item mechanics modification

Scholar - Gain bonus feats for Class Ability points
  → Type: Character progression
  → Effect: Modify feat allocation
  → Implementation: Character sheet system

Shaping - Increase range and area of personal Force powers by 2 squares
  → Type: Force power modification
  → Effect: Area/range scaling
  → Implementation: Force power system integration

Situational Awareness - Use Awareness instead of Perception
  → Type: Skill substitution
  → Effect: Replace perception check
  → Implementation: Check type override

Take Cover - Use Stealth in place of defensive movement
  → Type: Action substitution
  → Effect: Replace action with different skill
  → Implementation: Combat mechanic modification

Uncanny Luck - Spend Force Point to reroll any d20
  → Type: Reroll mechanic
  → Requirements: Force Point spent
  → Effect: Dice modification
  → Implementation: Reroll system hook

Vaapad - Lightsaber Form style with special mechanics
  → Type: Combat form
  → Effect: Form-specific bonuses
  → Implementation: Lightsaber form system

Visions - Use Force instead of certain perception checks
  → Type: Sense substitution
  → Effect: Replace perception with Force check
  → Implementation: Check type override

Vital Encouragement - Grant temporary HP to ally
  → Type: Healing ability
  → Effect: Temp HP grant
  → Implementation: Status effect system

Ward - Protect ally with damage reduction
  → Type: Protection ability
  → Effect: Temporary DR grant
  → Implementation: Status effect system

Watch This - Force enemy to watch your attack
  → Type: Condition
  → Effect: Apply watched condition
  → Implementation: Condition system

Weak Point - Reveal weakness in defenses
  → Type: Defense debilitation
  → Effect: Reduce defense
  → Implementation: Defense modification

Zone of Recuperation - Allies in area heal extra during Second Wind
  → Type: Healing modification
  → Effect: Enhanced healing
  → Implementation: Second Wind hook
```

**Total: 24 talents requiring complex systems**

---

## Implementation Priority by Effort/Benefit

### Quick Wins (Start Here)
1. **Passive numeric bonuses** (Expert Grappler, etc.) - 15 min each
2. **Simple Conditional** (Blowback, Close Contact, etc.) - 20 min each
3. **Skill Substitutions** - 25 min each

### Medium Effort
1. **Once-Per-Encounter abilities** with toggle mechanics - 30 min each
2. **Simple Complex Conditionals** (Advanced Intel, Aversion, etc.) - 45 min each

### High Effort
1. **Complex mechanics** requiring system integration
2. **Force power integrations** (Channel Energy, Shaping)
3. **Combat mechanic modifications** (Mobile Combatant, Mercy Kill)

---

## Next Steps

### Immediate (Phase 1)
- [ ] Implement 9 passive bonuses
- [ ] Test Active Effect application
- [ ] Create data structure for complex bonuses

### Short-term (Phase 2)
- [ ] Implement 7 skill substitutions
- [ ] Create talent-specific conditional system
- [ ] Build toggle mechanics for limited-use abilities

### Medium-term (Phase 3)
- [ ] Implement 40 once-per-encounter abilities
- [ ] Create encounter reset mechanism
- [ ] Build ability activation UI

### Long-term (Phase 4)
- [ ] Implement 56 complex conditionals
- [ ] Build position/aura system
- [ ] Create conditional effect engine

### Future (Phase 5)
- [ ] Implement 24 complex mechanics
- [ ] Integrate with Force power system
- [ ] Build special transformation/resurrection systems

---

## Statistics

| Category | Count | % | Est. Implementation |
|----------|-------|---|-------------------|
| Passive Bonuses | 9 | 5.6% | 2-3 hours |
| Skill Substitutions | 7 | 4.3% | 3 hours |
| Simple Conditional | 25 | 15.5% | 8 hours |
| Once-Per-Encounter | 40 | 24.8% | 20 hours |
| Complex Conditional | 56 | 34.8% | 40 hours |
| Complex Mechanics | 24 | 14.9% | 30 hours |
| **TOTAL** | **161** | **100%** | **~100 hours** |

---

## Notes

This implementation should be done in phases as time allows. The "easy wins" of passive bonuses and skill substitutions can be completed quickly and provide immediate value. The more complex mechanics can be tackled after those foundations are in place.

Each implementation should follow the pattern:
1. Create data structure for the mechanic type
2. Add to talent-granted-abilities.json with effect definition
3. Create Active Effect or special code hook
4. Test with sample talents
5. Document the pattern for similar talents
