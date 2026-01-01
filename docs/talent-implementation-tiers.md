# Talent Implementation Tiers

**Date:** January 1, 2026
**Total Talents Analyzed:** 106 (from talent-granted-abilities.json)
**Goal:** Pragmatic implementation strategy focusing on easy wins vs. manual cards

---

## TIER 1: PASSIVE TALENTS (Automatic Engine Implementation)

These talents are "set and forget" - they should be implemented as Active Effects that automatically apply bonuses and effects without player interaction.

### A. Simple Stat/Bonus Talents (Always Active)
These provide flat bonuses or passive effects that apply all the time.

#### Defense Bonuses
- **Lightsaber Defense** - +1 Reflex Defense when wielding lightsaber
- **Armored Defense** - +1 Reflex Defense when wearing armor
- **Evasion** - Take no damage on Reflex Defense miss instead of half
- **Uncanny Dodge I** - Retain Dex bonus to Reflex when flat-footed
- **Uncanny Dodge II** - Cannot be flanked, sneak attack resistance
- **Elusive Target** - +2 Reflex Defense when fighting defensively
- **Force Warning** - Cannot be surprised, always act in surprise round

#### Damage/Combat Bonuses
- **Weapon Specialization** - +2 damage with selected weapon group (variable)
- **Greater Weapon Specialization** - +2 additional damage (stacks with above)
- **Melee Smash** - Add half level to damage with one-handed/unarmed
- **Keen Shot** - +1 attack rolls with ranged within 6 squares
- **Trigger Work** - Negate -2 penalty from Rapid Shot
- **Multiattack Proficiency** - Reduce multi-attack penalty by 2 (variable)
- **Controlled Burst** - Reduce autofire penalty by 2 (or remove if braced)

#### Movement/Mobility
- **Long Stride** - Increase base speed by 2 squares
- **Improved Stealth** - Move at full speed while using Stealth with no penalty
- **Hide in Plain Sight** - Hide while being observed without cover

#### Stealth/Awareness
- **Total Concealment** - +5 Stealth checks when hidden, 50% miss chance
- **Acute Senses** - Can reroll Perception checks
- **Sneak Attack** - Deal +1d6 extra damage vs. targets denied Dex bonus (triggered condition)

#### Skill Substitutions & Replacements
- **Force Persuasion** - Use Force skill instead of Persuasion
- **Force Intuition** - Use Force skill instead of Initiative
- **Presence** - Use Persuasion instead of Deception for feints

#### Tech/Craft Bonuses
- **Master Slicer** - +5 competence bonus to Use Computer
- **Droidcraft** - 50% reduction to droid creation time, +5 to droid repair/modification
- **Fringe Savant** - +5 competence bonus to selected trained skill (variable)

#### Armor & Protection
- **Juggernaut** - Reduce non-area damage by armor's Reflex bonus when in heavy armor
- **Second Skin** - Increase armor's maximum Dexterity bonus by +1

#### Vehicle Combat
- **Vehicular Evasion** - No damage on Reflex Defense miss when piloting

### B. Triggered Passive Talents (Auto-Apply on Condition)
These automatically apply effects when specific conditions are met during combat.

#### Damage Triggers (When hitting with conditions)
- **Sneak Attack** - +1d6 damage vs. targets without Dex bonus (triggers per round)
- **Skirmisher** - +1d6 when hitting a target you didn't attack last turn
- **Dastardly Strike** - Move enemy -1 on condition track when hitting denied Dex bonus
- **Hunters Mark** - Move target -1 on condition track when you aim then hit
- **Debilitating Shot** - Move target -1 on condition track when you aim then hit (ranged)
- **Knockdown Shot** - Knock target prone when you aim then hit with ranged
- **Devastating Attack** - +1 die damage when hitting with focused melee weapon (once/encounter)

#### Lightsaber Combat
- **Severing Strike** - Sever a limb instead of moving target down condition track (triggered on killing blow with lightsaber)
- **Shii-Cho** - +1 attack & damage per additional opponent beyond first adjacent

#### Status Condition Triggers
- **Stunning Strike** - Move target -1 on condition track when melee damage exceeds DT
- **Hunters Target** - +2 damage to your designated Familiar Foe target (requires Familiar Foe selection)
- **Vaapad** - Move target -1 on condition track on critical hit with lightsaber

#### Lightsaber Form Abilities (Complex)
- **Ataru** - +2 attack when making acrobatic maneuvers, -2 Reflex Defense (toggleable)
- **Juyo** - +2 damage when making full attack, -2 to all defenses (toggleable)
- **Makashi** - +2 attack vs. melee weapon wielders when using one-handed lightsaber
- **Soresu** - Once per round, free Block or Deflect without using reaction
- **Niman** - Make single lightsaber attack as swift action after using Force power as standard
- **Shien** - Automatic redirect of deflected ranged attack at attacker (cost: Force Point)

#### Armor & Defense Forms
- **Improved Armored Defense** - Enhance armored defense bonus to +2
- **Improved Evasion** - Take half damage on Reflex Defense hit instead of full (requires Evasion)

#### Action Economy
- **Rapid Reaction** - Gain one additional swift action per round

### C. Passive Talents with Special Actions (Can be cards OR passive effects)
These are mostly passive but have special action options available.

- **Force Focus** - +half level to Use the Force (passive), can regain Force power once/encounter (swift action)
- **Improve Dark Rage** (modifier) - Spend Force Point to gain bonuses while dark raging

---

## TIER 2: ACTIVE TALENTS (Activation Card Implementation)

These talents require the player to manually activate them as part of combat. They should be implemented as cards in the chat that players can click to use.

### A. Standard Action Abilities
These take a standard action to use.

#### Diplomacy/Social
- **Adept Negotiator** - Persuasion vs Will, move enemy -1 on condition track if success
- **Master Negotiator** (modifier) - Enhanced version moving target -2 instead of -1
- **Draw Fire** - Persuasion vs Will, force target to attack you if able
- **Weaken Resolve** - Persuasion vs Will, -2 to all defenses until your next turn
- **Demand Surrender** - Persuasion vs Will, target surrenders if below half HP and succeed by 5+
- **Barter** - Persuasion check to reduce goods cost by 10%

#### Knowledge/Sensing
- **Gauge Force Potential** - Use the Force check to determine if creature is Force-sensitive, their level, and dark side score
- **Dark Side Sense** - Use the Force check to sense dark side presence within 100m/level
- **Force Treatment** - Use the Force instead of Treat Injury skill

#### Combat Attacks
- **Lightsaber Throw** - Ranged attack with lightsaber within 6 squares, returns to hand
- **Unbalancing Attack** (free action) - After hitting with melee, attempt to knock target prone as free action

#### Tech
- **Electronic Sabotage** - Use Computer to sabotage electronics, cause penalties or disable system
- **Trace** - Use Computer to trace remote users on a system

#### Support
- **Skilled Advisor** - Full-round action, grant one ally +5 (or +10 with Force Point) to next skill check

#### Area Effects
- **Force Haze** - Spend Force Point as standard action, creatures in 6 squares must save or be dazed

### B. Swift Action Abilities
These take a swift action to use (can be used in addition to standard action).

#### Targeting/Selection
- **Familiar Foe** - Designate a target, gain +1 insight bonus to attacks against them until end of encounter
- **Inspire Confidence** - Grant all allies in LoS +1 morale to attacks/skills for encounter (once/encounter)
- **Bolster Ally** - Move one ally +1 on condition track

#### Leadership
- **Willpower** - Grant allies in LoS +2 morale to Will Defense (once/encounter)
- **Ignite Fervor** - Grant ally bonus to next damage equal to their level (triggered after you hit)

#### Combat
- **Battle Analysis** - Knowledge (tactics) check DC 15, grant allies in 6 squares +1 insight to attacks for round
- **Starship Tactics** - Grant all gunners on starship +2 to attacks until your next turn
- **Surge of Power** - Spend Force Point to add heroic level to next Force power damage this turn

#### Mobility
- **Full Throttle** - Increase vehicle speed by 1 square per round
- **Temporal Awareness** (reaction) - When attacked, move up to speed as immediate reaction before attack resolves (once/encounter)

#### Versatile Choice
- **Beloved** - Choose from: (1) Swift - ally +2 Reflex Defense, (2) Immediate - ally free attack, (3) Reaction - allies within 6 can move

### C. Reaction Abilities
These trigger automatically as reactions when conditions are met.

#### Lightsaber Combat
- **Block** - Use the Force check vs. melee attack, negate damage if you succeed
- **Deflect** - Use the Force check vs. ranged attack, negate damage if you succeed
- **Redirect Shot** - After Deflecting, redirect attack at new target within 6 squares (can spend Force Point for auto-hit)
- **Djem So** - After Block or Deflect, make immediate counterattack
- **Shien** - After Deflect, spend Force Point to automatically redirect at attacker

#### Defensive
- **Acrobatic Recovery** - When knocked prone, spend Force Point to stand up as free action
- **Juke** - When vehicle attacked, add heroic level to vehicle Reflex Defense (once/encounter)
- **Force Point Recovery** - After spending a Force Point, immediately regain 1 FP (can spend 1 FP to regain 2 instead) (once/day)

### D. Free/Immediate Actions (Can be cards)
These are bonus actions that don't take up your action.

- **Lucky Shot** - After attack roll, reroll and take better result (once/day)
- **Fortune's Favor** - After any d20 roll, add +1d6 (once/day)
- **Knack** - When making skill check, treat as if you rolled 20 (once/day)

---

## TIER 3: CONDITIONAL/COMPLEX TALENTS

These talents have conditions or complexity that might make them better as cards initially, but could move to passive with more development.

### Conditional on Specific Situations
- **Acute Senses** - Can reroll any Perception check (passive mechanically, but might want card for UX)
- **Keep Them at Bay** (modifier) - Increases suppression penalty from -2 to -5 (modifier)

### Force Power Interaction
- **Force Focus** (HYBRID) - Passive skill bonus + special action to regain powers
- **Improved Dark Rage** (HYBRID) - Modifier to enhance dark rage when activated

---

## TIER 4: MODIFIERS (Enhance Other Talents)

These talents modify or enhance other talents. Implementation approach:
- If the base talent is implemented, automatically enable this modifier
- Chain modifiers properly (Greater → Master → Ultimate chains)

- **Greater Weapon Specialization** - Modifies Weapon Specialization (+2 more damage)
- **Master Negotiator** - Modifies Adept Negotiator (-2 condition track instead of -1)
- **Keep Them at Bay** - Modifies Suppress ability (increase penalty)
- **Improved Dark Rage** - Modifies Dark Rage (Force Point enhancement)
- **Improved Evasion** - Modifies Evasion (half damage on hit instead of full)
- **Improved Armored Defense** - Modifies Armored Defense (+2 instead of +1)
- **Improved Stealth** - Modifies Stealth (full movement penalty removal)

---

## TIER 5: FOLLOWER/MINION TALENTS

**Finding:** Of the 106 talents with defined mechanics, none explicitly grant permanent followers or minions that would trigger the follower generator.

### Potential Candidates (from full 853 talent list):
These would typically appear in talent trees like:
- Bounty Hunter (may have follower abilities)
- Officer (command abilities)
- Droid Specialist (droid companions)
- Pilot (crew management)

**Recommendation:** Review the full talent list to identify which talents grant followers. When found, implement them to:
1. Trigger follower generator when talent is acquired
2. Store follower relationship in actor flags
3. Display followers on character sheet

---

## IMPLEMENTATION PRIORITY RANKING

### PHASE 1: EASY PASSIVE WINS (2-3 days)
Implement as Active Effects - straight bonuses with minimal conditions:

**High Priority (10 talents):**
1. Weapon Specialization (+2 damage) - Variable selection
2. Lightsaber Defense (+1 Reflex)
3. Keen Shot (+1 ranged attack within 6)
4. Melee Smash (+half level damage)
5. Evasion (no damage on miss)
6. Hide in Plain Sight (stealth enhancement)
7. Long Stride (+2 speed)
8. Master Slicer (+5 Use Computer)
9. Elusive Target (+2 Reflex when defensive)
10. Armored Defense (+1 Reflex when armored)

### PHASE 2: TRIGGERED PASSIVE (3-4 days)
Implement as hooks that apply effects when conditions met:

**Damage Triggers (5 talents):**
1. Sneak Attack (+1d6 vs denied Dex)
2. Skirmisher (+1d6 vs new targets)
3. Devastating Attack (+1 die once/encounter)
4. Hunters Mark (-1 condition track when aiming)
5. Debilitating Shot (-1 condition track ranged)

**Condition Triggers (4 talents):**
1. Stunning Strike (-1 condition exceeding DT)
2. Dastardly Strike (-1 condition denied Dex)
3. Knockdown Shot (prone ranged)
4. Shii-Cho (+1 per adjacent opponent)

### PHASE 3: LIGHTSABER FORMS & ADVANCED PASSIVE (3-4 days)
Complex passive talents requiring state tracking:

1. Ataru (+2 attack/-2 Reflex in acrobatics, toggleable)
2. Juyo (+2 damage/-2 all defenses in full attack, toggleable)
3. Soresu (free Block/Deflect once/round)
4. Niman (free lightsaber attack after Force power)
5. Makashi (+2 vs melee wielders)
6. Shii-Cho (+1 per opponent)
7. Vaapad (-1 condition on critical hit)
8. Severing Strike (optional limb loss on killing blow)

### PHASE 4: ACTIVE ABILITIES AS CARDS (1-2 weeks)
Create card system for manual activation:

**Social/Diplomacy (5 cards):**
1. Adept Negotiator (standard action)
2. Master Negotiator (enhanced)
3. Draw Fire (standard action)
4. Weaken Resolve (standard action)
5. Demand Surrender (standard action)

**Combat Reactions (5 cards):**
1. Block (reaction)
2. Deflect (reaction)
3. Redirect Shot (reaction)
4. Djem So (reaction)
5. Shien (reaction)

**Support (5 cards):**
1. Inspire Confidence (standard, once/encounter)
2. Bolster Ally (standard)
3. Ignite Fervor (swift)
4. Willpower (swift, once/encounter)
5. Beloved (swift with choices)

**Remaining Active (20+ more cards):**
- Gauge Force Potential
- Force Treatment
- Lightsaber Throw
- Electronic Sabotage
- Trace
- Skilled Advisor
- Force Haze
- Battle Analysis
- Familiar Foe
- Starship Tactics
- Surge of Power
- Full Throttle
- Temporal Awareness
- Acrobatic Recovery
- Juke
- Force Point Recovery
- Lucky Shot
- Fortune's Favor
- Knack
- Barter

### PHASE 5: FOLLOWER TALENTS (When identified)
Once follower talents are identified from full list:
1. Create trigger to open follower generator
2. Store follower references
3. Display followers on sheet

---

## IMPLEMENTATION STATISTICS

| Category | Count | Implementation |
|----------|-------|-----------------|
| Simple Passive | 29 | Active Effects (2-3 days) |
| Triggered Passive | 16 | Combat Hooks (3-4 days) |
| Lightsaber Forms | 8 | Toggle/State System (3-4 days) |
| Active Abilities | 35+ | Activation Cards (1-2 weeks) |
| Modifiers | 7 | Chain with Base (1 day) |
| Followers | TBD | Follower Generator (TBD) |
| **TOTAL** | **106** | **2-3 weeks** |

---

## KEY IMPLEMENTATION NOTES

### Passive Talents
- Use Active Effects for stat bonuses
- Implement conditional logic where needed (e.g., "only when wielding lightsaber")
- Triggered passives need combat hooks to detect conditions and apply effects

### Active Abilities as Cards
- Display card in chat when talent is activated
- Include roll information (skill key, DC, vs. defense)
- Show effects/results
- Track uses if limited (once/encounter, once/day)
- Allow player to choose options (Beloved talent)

### Lightsaber Forms (Special)
- Implement as toggleable states
- Handle trade-offs (bonus to one stat, penalty to another)
- Only one form active at a time (per RAW)
- Some forms affect prerequisites (Shien requires Deflect)

### Force Point Costs
- Track Force points in actor data
- Spend/recover system for talents that use FP
- Show in activation card

### Modifiers
- Only appear if prerequisite talent is selected
- Automatically enhance base talent effects
- Stack properly with chains

---

## Recommendations

1. **Start with Phase 1:** 10 simple passive talents give quick wins and show progress
2. **Then Phase 2:** Triggered passives require more complex logic but still auto-apply
3. **Parallelize Phase 3 & 4:** While finishing triggered passives, start building card system
4. **Phase 5 Later:** Once follower talents identified, integrate with existing follower system
5. **Test Continuously:** Each phase should have playtest before moving to next

This approach delivers value quickly (passive bonuses working immediately) while building toward the card system for complex interactions.
