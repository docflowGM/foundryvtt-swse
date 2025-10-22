Star Wars Saga Edition (SWSE) – Rules Implementation
📖 Purpose
This document defines how the rules of Star Wars Saga Edition are expressed, automated, and constrained in this VTT system. It ensures consistency across development and gives GMs/players clarity about which parts are automated vs. manual.
🎯 Design Goals
Automate core mechanics: dice rolls, skill checks, combat, condition track, Force use.
Provide tooling and modifiers for rules-heavy features (talents, feats, powers).
Allow manual overrides: GM should always be able to fudge rolls or override calculations.
Keep rules modular: items define rules effects, actors apply them, rolls reference them.
🧩 Core Mechanics
Ability Scores
6 abilities: STR, DEX, CON, INT, WIS, CHA.
Modifiers auto-calculated as (score - 10) / 2 | floor.
Stored in actor data model under system.abilities.
Skills
Each skill is an object: { trained, ability, miscMods }.
Rolls pull from:
Base ability modifier.
Trained bonus (+5).
Misc modifiers from feats/talents/equipment.
Skill-specific rules (e.g., Use the Force can replace Reflex Defense with special abilities) are implemented as talent/feat effects.
Defenses
Three defenses: Fortitude, Reflex, Will.
### Defense Ability Selection
Per SWSE rules, characters may use alternate ability modifiers for defenses in certain situations:
- **Fortitude**: Normally uses CON, but can use STR (e.g., some talents/feats)
- **Reflex**: Normally uses DEX, but can use INT (e.g., Combat Expertise)
- **Will**: Normally uses WIS, but can use CHA (e.g., certain Force users)

The character sheet allows selecting which ability modifier to use via dropdowns on each defense.
Default values: Fort=CON, Ref=DEX, Will=WIS

Defense calculation:
10 + ability mod + class bonus + misc + heroic level (for some features)
Automated recalculation when ability, class, or feat changes.
Stored in system.defenses.
Initiative
Roll: 1d20 + Dex mod + misc.
Tracked in initiative.js.
Used by Foundry’s combat tracker.
Hit Points & Threshold
HP = sum of class hit dice + CON mod per level.
Damage Threshold = Fort Defense score.
On damage ≥ threshold → condition track moves down 1 step.
Managed in damage.js + condition.js.
Condition Track
Condition track stored as system.condition.track.
Standard states: Normal → -1 → -2 → -5 → -10 → Unconscious.
**Important**: Condition penalties do NOT apply to defenses (Fort/Ref/Will) unless the character is Helpless.
Condition penalties DO apply to attack rolls and skill checks.
UI: condition indicator on character sheet with expanded dropdown for clarity.
⚔️ Combat Rules
Attacks
Attack roll formula:
1d20 + base attack bonus + ability mod + feat/talent/item mods
Criticals: nat 20 triggers critical, confirm optional (GM setting).
Roll output: chat card with hit/miss + “Apply Damage” button.
Damage
Weapons/items define damage string (e.g. 2d8).
Roll includes modifiers (talent bonuses, point-blank shot, etc.).
Damage applied to HP; threshold checked.
For starships, shields soak damage before hull.
Conditions
Conditions (stunned, grappled, prone, etc.) implemented as effects.
Conditions reduce defenses, limit actions, or apply penalties.
Conditions stack with condition track penalties.
🌌 Force Rules
Use the Force Skill
Stored as a skill linked to WIS.
Rolls use:
1d20 + skill modifiers + misc
Context-dependent: resist mind trick, activate powers, sense surroundings.
Force Powers
Each power = item with: effect, DCs, scaling table, usage.
Roll flow:
Player rolls Use the Force.
Compare vs. DCs in scaling table.
Apply highest valid result.
Powers can be expended per encounter → toggle tracked in item sheet.
Force Points
Stored in system.forcePoints.
Usage triggered in roll dialog.
When spent → reroll/add d6 depending on GM settings.
Destiny Points
Stored in system.destinyPoints.
Uses: auto-crit, survive fatal blow, narrative GM fiat.
Always requires manual confirmation dialog.
🚀 Starship Rules
Starship Stats
Hull points, damage threshold, shield quadrants.
Weapons as separate items with arcs + damage.
Starship Combat
Initiative: starship + pilot.
Attacks: gunners roll with base attack + proficiency.
Damage: shields absorb before hull; threshold check applied.
🎒 Feats & Talents
Feats
Stored as items.
Define: prerequisites, benefits, modifiers.
On acquisition → system validates prerequisites, applies passive bonuses.
Talents
Linked to class talent trees.
Provide active (roll-modifying) or passive (defense, skill, attack bonus) benefits.
Validation: must meet class + prior tree prerequisites.
🧰 Equipment Rules
Weapons/armor provide bonuses to attack, defense, and skills.
Encumbrance optional (toggle in system settings).
Cybernetics as special equipment items.
🎲 Dice Automation
Supported Rolls
Ability check.
Skill check.
Attack roll.
Damage roll.
Saving throw.
Force check.
Dice Expressions
Standard Foundry dice expressions.
Inline modifiers added via helper functions.
⚙️ GM Tools
Override toggle (GM can edit defenses, HP, etc. manually).
Apply conditions manually.
Force rerolls or apply situational modifiers.
🛠️ Settings
System settings (configurable in Foundry):
Critical confirmation (on/off).
Condition track enforcement (on/off).
Encumbrance tracking (on/off).
Destiny point automation (auto vs. manual).
🔮 Future Rule Modules
Destiny subsystem expansion.
Lightsaber Forms (Talent Trees) automation.
Mass Combat (SWSE supplement rules).
Force Techniques & Secrets as expanded item types.

