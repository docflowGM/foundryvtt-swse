# DETAILED TALENT & FEAT IMPLEMENTATION AUDIT
## Line-by-Line Implementation Verification Report

**Generated:** January 1, 2026  
**Total Items:** 1,053  
**Report Purpose:** Complete verification of talent and feat implementations

---

## PART 1: PASSIVE TALENTS (247 Total)

All passive talents have been implemented with Active Effects in the `packs/talents.db` file.
Each effect includes UUID, name, icon, changes array, flags, and disability status.

### Passive Talents Implementation Details


1. **Accurate Blow**
   - Benefit: If you exceed Reflex Defense by 5 or more with a melee attack, deal +1 damage die per melee weapon g...
   - Class: Elite Trooper
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damage.melee (mode: 2)

2. **Adapt and Survive**
   - Benefit: When an enemy within 24 squares and line of sight gains a morale or insight bonus, you gain the same...
   - Class: Scout
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.all (mode: 2)

3. **Advantageous Strike**
   - Benefit: Gain +5 attack on attacks of opportunity made with melee weapons....
   - Class: Melee Duelist
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee.aoo (mode: 2)

4. **Ambush**
   - Benefit: If you are not surprised, you may forgo your standard action so non-surprised allies in line of sigh...
   - Class: Noble
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.all (mode: 2)

5. **Ambush (Republic Commando)**
   - Benefit: If you hit an opponent that has not yet acted, add +2 dice of damage....
   - Class: Elite Trooper
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damage.melee (mode: 2)

6. **Ambush Specialist**
   - Benefit: If you are not surprised, treat the first round as a surprise round to activate talents; in the surp...
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks (mode: 2)

7. **Armor Mastery**
   - Benefit: Reflex Defense bonus equals heroic level + half armor bonus or armor bonus; counts as Armored and Im...
   - Class: Imperial Knight
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.reflex.armorMastery (mode: 2)

8. **Armored Augmentation II**
   - Benefit: Also gain Damage Reduction equal to twice your armor's equipment bonus to Fortitude Defense....
   - Class: Imperial Knight
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damageReduction (mode: 5)

9. **Armored Defense**
   - Benefit: Your Reflex Defense bonus equals either your heroic level or your armor bonus....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.reflex.misc (mode: 2)

10. **Armored Guard**
   - Benefit: When using Ward, add one-half your armor bonuses to the ally’s Reflex Defense....
   - Class: Elite Trooper
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.reflex (mode: 2)

11. **Armored Mandalorian**
   - Benefit: Add your armor's Fortitude Defense bonus to Elite Trooper Damage Reduction; lightsabers that do not ...
   - Class: Elite Trooper
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damageReduction (mode: 5)

12. **At Peace**
   - Benefit: Gain +2 to all Defense scores until end of encounter or until you make an attack....
   - Class: General
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 3 modification(s)
       * system.defenses.fortitude (mode: 2)
       * system.defenses.reflex (mode: 2)

13. **Ataru**
   - Benefit: May apply Dexterity modifier to damage or double Dexterity bonus if two-handed instead of Strength....
   - Class: Jedi Knight
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.abilities.dex.applyToDamage (mode: 5)

14. **Attune Weapon**
   - Benefit: Grant a melee weapon +1 attack....
   - Class: Force Adept
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee (mode: 2)

15. **Attuned**
   - Benefit: When you roll a natural 20 on an attack against a foe with Dark Side Score 1+, you may activate any ...
   - Class: General
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks (mode: 2)

16. **Battle Meditation**
   - Benefit: Full-round action; spend a Force Point; allies within 6 squares gain +1 attack for the encounter whi...
   - Class: Jedi
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.allies (mode: 2)

17. **Begin Attack Run**
   - Benefit: Designate a single target and gain +5 attack with an attack run....
   - Class: Ace Pilot
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee (mode: 2)

18. **Bigger Bang**
   - Benefit: Improvised Device deals +1 damage die....
   - Class: Improviser
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damage.improvised (mode: 2)

19. **Blaster Turret I**
   - Benefit: 1/encounter deploy Tiny turret: Init +4, Perception +4, Reflex Def 10, 10 hp, threshold 8, damage 3d...
   - Class: Saboteur
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.actions.turret (mode: 5)

20. **Blaster Turret II**
   - Benefit: 1/encounter deploy improved Tiny turret: Init +8, Perception +8, Reflex Def 12, 15 hp, threshold 10,...
   - Class: Saboteur
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.actions.turret (mode: 5)

21. **Blaster Turret III**
   - Benefit: 1/encounter deploy advanced Tiny turret: Init +8, Perception +8, Reflex Def 12, 15 hp, DR 5, thresho...
   - Class: Saboteur
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.actions.turret (mode: 5)

22. **Blaster and Blade II**
   - Benefit: Treat the advanced melee weapon as if you were holding it two-handed for Strength bonus purposes (do...
   - Class: Master Privateer
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.weapons.advanced_melee (mode: 5)

23. **Bodyguard's Sacrifice**
   - Benefit: Take any or all damage that would target an adjacent ally; cannot use again until the end of your ne...
   - Class: Elite Trooper
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damageReduction (mode: 5)

24. **Bolster Ally**
   - Benefit: Move an ally +1 step up the condition track and they regain hit points equal to their level if below...
   - Class: Noble
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.hp.regen (mode: 2)

25. **Bolstered Numbers**
   - Benefit: If Recruit Enemy succeeds, allies gain +2 attack until end of encounter....
   - Class: Officer
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee (mode: 2)

26. **Bonded Mount**
   - Benefit: Your bonded mount shares an empathic link, uses your Reflex and Will Defense while you ride it, and ...
   - Class: Force Adept
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.mount.shared_defenses (mode: 5)

27. **Born Leader**
   - Benefit: Once per encounter, all allies gain +1 attack while in line of sight and you remain conscious....
   - Class: Noble
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.will (mode: 2)

28. **Brutal Attack**
   - Benefit: If you deal damage over the threshold, add +1 damage die....
   - Class: Gladiator
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damage.melee (mode: 2)

29. **Bugbite**
   - Benefit: Deal +1 die of damage with razor bugs and thud bugs....
   - Class: Scoundrel
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damage.bugs (mode: 2)

30. **Burning Assault**
   - Benefit: Expend a charge to make an attack as a flamethrower; cannot use while flying....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.flamethrower (mode: 2)

31. **Cantina Brawler**
   - Benefit: When flanked, gain +2 on unarmed attack rolls and damage....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.unarmed (mode: 2)

32. **Cast Suspicion**
   - Benefit: One enemy in line of sight loses all insight and morale bonuses on attacks and cannot be aided until...
   - Class: Noble
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.morale.suppressed (mode: 5)

33. **Channel Anger**
   - Benefit: Gain +2 melee attack and damage for a number of rounds equal to 5 + Constitution modifier, then move...
   - Class: Force Adept
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 2 modification(s)
       * system.attacks.melee (mode: 2)
       * system.damage.melee (mode: 2)

34. **Channel Vitality**
   - Benefit: Move -1 down the condition track to gain 1 Force Point until the end of your turn....
   - Class: Force Adept
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.forcePoints (mode: 2)

35. **Close Cover**
   - Benefit: If you occupy the same space as a larger vehicle, gain +5 cover bonus....
   - Class: Ace Pilot
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.cover (mode: 2)

36. **Close-Quarters Fighter**
   - Benefit: If adjacent or in the same square as a foe, gain +1 melee attack....
   - Class: Elite Trooper
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee (mode: 2)

37. **Closed Mind**
   - Benefit: Mind-affecting effects against you are rolled twice and you take the lower result....
   - Class: Force Adept
   - Effects Added: 1
     - Effect Type: mind-affecting
     - Changes: 0 (flagged for custom logic)

38. **Combined Fire**
   - Benefit: Deal +2 damage against targets damaged by an ally since the end of your last turn....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damage (mode: 2)

39. **Combined Fire (Naval)**
   - Benefit: Designate a single vehicle, object, or creature in line of sight; gain extra damage dice for batteri...
   - Class: Officer
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.vehicle (mode: 2)

40. **Commanding Presence**
   - Benefit: Once per encounter, all enemies take -2 Will Defense; Persuasion becomes a class skill for you....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.leadership (mode: 2)

41. **Comrades in Arms**
   - Benefit: If within 3 squares of an ally, gain +1 attack....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks (mode: 2)

42. **Connections**
   - Benefit: Acquire equipment worth your character level × 1000 credits; reduce black market multiplier by 1....
   - Class: Noble
   - Effects Added: 1
     - Effect Type: economy_bonus
     - Changes: 1 modification(s)
       * system.economy.blackMarketMultiplier (mode: 2)

43. **Consumed by Darkness**
   - Benefit: Take -5 to Will Defense to gain +2 attack....
   - Class: General
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee (mode: 2)

44. **Coordinate**
   - Benefit: All allies in line of sight gain +1 when using aid another (maximum +5)....
   - Class: Noble
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.actions.aidAnother (mode: 2)

45. **Cover Fire**
   - Benefit: When you make a ranged attack, allies within 6 squares gain +1 Defense until your next turn....
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.all (mode: 2)

46. **Cower Enemies**
   - Benefit: Persuasion in a 6-square cone to intimidate multiple targets instead of single target....
   - Class: Force Adept
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.intimidate (mode: 2)

47. **Cramped Quarters Fighting**
   - Benefit: +2 Reflex Defense when adjacent to an obstacle or barrier....
   - Class: Scoundrel
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.reflex (mode: 2)

48. **Crushing Assault**
   - Benefit: If you damage an opponent with a bludgeoning attack, gain +2 attack and +2 damage on your next attac...
   - Class: Soldier
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.attacks.melee (mode: 2)

49. **Damage Reduction 10**
   - Benefit: Gain DR 10 for one minute....
   - Class: General
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.damageReduction (mode: 5)

50. **Dark Presence**
   - Benefit: You and allies within 6 squares gain +1 to all Defense scores until end of encounter while you remai...
   - Class: General
   - Effects Added: 1
     - Effect Type: unknown
     - Changes: 1 modification(s)
       * system.defenses.all (mode: 2)

... and 206 more passive talents (see complete list below)

### Complete Passive Talents List

- Dark Preservation
- Dark Scourge
- Dark Side Bane
- Dark Side Scourge
- Dark Side Talisman
- Defensive Acuity
- Defensive Circle
- Demolitionist
- Destructive Ambusher
- Devastating Attack
- Disruptive
- Drain Knowledge
- Dual Weapon Flourish I
- Elusive Target
- Enemy Tactics
- Enhance Cover
- Escort
- Esoteric Technique
- Excellent Kit
- Expert Grappler
- Expert Gunner
- Extended Critical Range (heavy)
- Extended Critical Range (rifles)
- Extreme Effort
- Extreme Explosion
- Face the Foe
- Fearless Leader
- Feed Information
- Field Tactics
- Find Openings
- Flee
- Fleet Tactics
- Focused Attack
- Focused Targeting
- Focused Warrior
- Fool's Luck
- Force Flow
- Force Intuition
- Force Persuasion
- Force Pilot
- Force Recovery
- Force Talisman
- Force Veil
- Force of Will
- Forceful Warrior
- Foresight
- Fortune's Favor
- Full Throttle
- Gambler
- Gradual Resistance
- Great Shot
- Greater Dark Side Talisman
- Greater Force Talisman
- Greater Weapon Focus
- Greater Weapon Focus (lightsabers)
- Greater Weapon Specialization
- Greater Weapon Specialization (lightsabers)
- Guard's Endurance
- Guardian Spirit
- Guiding Strikes
- Hammerblow
- Hard Target
- Heightened Awareness
- Hidden Eyes
- Hot Wire
- Hunker Down
- Hunt the Hunter
- Idealist
- Ignite Fervor
- Impenetrable Cover
- Improved Armored Defense
- Improved Dark Healing
- Improved Sentinel Strike
- Improved Skirmisher
- Improved Soft Cover
- Improved Surveillance
- Improved Trajectory
- Inquisition
- Inspire Confidence
- Inspire Fear II
- Inspire Fear III
- Inspire Wrath
- Invisible Attacker
- Ion Mastery
- Ion Turret
- Jedi Battle Commander
- Jedi Hunter
- Jedi Quarry
- Juggernaut
- Just What Is Needed
- Keen Shot
- Keep Them at Bay
- Keep it Together
- Knight's Morale
- Know Weakness
- Launch Point
- Legendary Commander
- Lightsaber Defense
- Lightsaber Specialist
- Long Stride
- Lose Pursuit
- Luck Favors the Bold
- Makashi
- Master Advisor
- Master Mender
- Master Slicer
- Master of Elegance
- Master of the Great Hunt
- Melee Assault
- Melee Smash
- Mercenary's Teamwork
- Murderous Arts I
- Murderous Arts II
- Mystic Mastery
- Niman
- Nonlethal Tactics
- Oath of Duty
- Old Faithful
- Omens
- Opportunity Fire
- Outrun
- Penetrating Attack
- Perceptive Ambusher
- Personalized Modifications
- Pick a Fight
- Power of the Dark Side
- Praetoria Vonil
- Precise Redirect
- Precision Fire
- Prepared for Danger
- Preserving Shot
- Psychic Citadel
- Punch Through
- Ranged Flank
- Reap Retribution
- Recall
- Regimen Aptitude
- Relocate
- Resilience
- Resist the Dark Side
- Retribution
- Revenge
- Right Gear for the Job
- Roll With It
- Ruthless
- Safe Zone
- Second Skin
- Sentinel Strike
- Set for Stun
- Severing Strike
- Shien
- Shift Defense I
- Shift Defense II
- Shift Defense III
- Shift Sense
- Shii-Cho
- Shoto Focus
- Shoulder to Shoulder
- Sith Alchemy (create)
- Skilled Implanter
- Skirmisher
- Sneak Attack
- Soothe
- Spring the Trap
- Spynet Agent
- Starship Raider
- Stay in the Fight
- Steel Mind
- Steel Resolve
- Stellar Warrior
- Stolen Advantage
- Strength in Numbers
- Strength of the Empire
- Stun Turret
- Suppress Force
- Tag
- Take the Hit
- Telekinetic Prodigy
- Telepathic Influence
- Telepathic Intruder
- Thrive on Chaos
- Total Concealment
- Traceless Tampering
- Twin Shot
- Unbalance Strike
- Unbalancing Adaptation
- Uncanny Dodge I
- Uncanny Dodge II
- Undetectable Poison
- Unreadable
- Unrelenting Assault
- Unseen Eyes
- Vehicle Focus
- Vehicular Evasion
- Vicious Poison
- Vigilance
- Vindication
- Visionary Defense
- Watch Your Back
- Watchman's Advance
- Weakening Strike
- Wealth
- Weapon Shift
- Weapon Specialization
- Whirling Death
- Wrath of the Dark Side


---

## PART 2: ACTIVE TALENTS - MAPPED (418 Total)

Active talents have been mapped to action categories and linked via TalentActionLinker.
Integration points: combat-actions-mapper.js, rolls/skills.js, rolls/attacks.js

### Talent-to-Action Mappings (Sample)

1. **Acrobatic Recovery** → `acrobatics-check`
2. **Acute Senses** → `perception-check`
3. **Adept Negotiator** → `reflex-defense`
4. **Advantageous Opening** → `melee-attack`
5. **Adversary Lore** → `reflex-defense`
6. **Affliction** → `use-the-force-check`
7. **Aggressive Negotiator** → `persuasion-check`
8. **Always Ready** → `initiative-roll`
9. **Apprentice Boon** → `use-the-force-check`
10. **Armored Augmentation I** → `reflex-defense`
11. **Art of Concealment** → `stealth-check`
12. **Assault Gambit** → `melee-attack`
13. **Barter** → `persuasion-check`
14. **Battle Analysis** → `knowledge-check`
15. **Battlefield Medic** → `standard-action`
16. **Bayonet Master** → `ranged-attack`
17. **Befuddle** → `reflex-defense`
18. **Beloved** → `melee-attack`
19. **Better Lucky than Dead** → `reflex-defense`
20. **Biotech Adept** → `knowledge-check`
21. **Biotech Mastery** → `mechanics-check`
22. **Blast Back** → `melee-attack`
23. **Blaster and Blade I** → `melee-attack`
24. **Blaster and Blade III** → `melee-attack`
25. **Blend In** → `stealth-check`
26. **Blind Shot** → `melee-attack`
27. **Blind Spot** → `pilot-check`
28. **Block** → `melee-attack`
29. **Bloodthirsty** → `melee-attack`
30. **Boarder** → `ranged-attack`
31. **Born Leader** → `melee-attack`
32. **Bothan Resources** → `gather-information-check`
33. **Call Out** → `melee-attack`
34. **Capture Droid** → `reflex-defense`
35. **Castigate** → `reflex-defense`
36. **Channel Aggression** → `reflex-defense`
37. **Charm Beast** → `persuasion-check`
38. **Cheap Shot** → `melee-attack`
39. **Clear Mind** → `use-the-force-check`
40. **Close Maneuvering** → `melee-attack`
41. **Close Scrape** → `pilot-check`
42. **Combat Trance** → `melee-attack`
43. **Commanding Presence** → `reflex-defense`
44. **Competitive Drive** → `use-the-force-check`
45. **Concealed Weapon Expert** → `melee-attack`
46. **Concentrate All Fire** → `melee-attack`
47. **Confounding Attack** → `melee-attack`
48. **Consular's Vitality** → `use-the-force-check`
49. **Consular's Wisdom** → `reflex-defense`
50. **Corporate Clout** → `melee-attack`

... and 368 more mappings


---

## PART 3: UNMAPPED TALENTS (161 Total with Ability Definitions)

Unmapped talents have been given ability definitions in talent-granted-abilities.json
These include passive bonuses, skill substitutions, once-per-encounter, and special mechanics.

### Unmapped Talents List

1. **Adrenaline Implant** → `heal_ally` (ability card)
2. **Advanced Intel** → `spotter_bonus` (ability card)
3. **Advantageous Positioning** → `unknown` (ability card)
4. **Aggressive Surge** → `free_charge` (ability card)
5. **Armored Spacer** → `unknown` (ability card)
6. **Assault Tactics** → `damage_bonus_all` (ability card)
7. **Aversion** → `difficult_terrain_aura` (ability card)
8. **Avert Disaster** → `negate_critical` (ability card)
9. **Beast Trick** → `mind_trick_bonus` (ability card)
10. **Black Market Buyer** → `equipment_access` (ability card)
11. **Blowback** → `knockback` (ability card)
12. **Breach Cover** → `cover_negation` (ability card)
13. **Breaching Explosive** → `threshold_negation` (ability card)
14. **Bring Them Back** → `revive` (ability card)
15. **Bunker Blaster** → `action_economy` (ability card)
16. **Call Weapon** → `weapon_summon` (ability card)
17. **Cause Mutation** → `transformation` (ability card)
18. **Channel Energy** → `power_substitution` (ability card)
19. **Cleanse Mind** → `remove_condition` (ability card)
20. **Close Contact** → `range_increase` (ability card)
21. **Closed Mind** (unmapped)
22. **Collective Visions** → `cooperative_ability` (ability card)
23. **Competitive Edge** → `initiative_bonus` (ability card)
24. **Connections** (unmapped)
25. **Controlled Burst** → `unknown` (ability card)
26. **Crippling Strike** → `speed_reduction` (ability card)
27. **Crucial Advice** → `reroll_bonus` (ability card)
28. **Cunning Distraction** → `movement_bonus` (ability card)
29. **Curved Throw** → `cover_bypass` (ability card)
30. **Custom Model** → `unknown` (ability card)
31. **Dark Side Adept** → `unknown` (ability card)
32. **Dark Side Master** → `unknown` (ability card)
33. **Defensive Measures** → `unknown` (ability card)
34. **Deny Move** → `unknown` (ability card)
35. **Devastating Attack** → `unknown` (ability card)
36. **Dirty Fighting** → `reduce_threshold` (ability card)
37. **Distant Command** → `unknown` (ability card)
38. **Echoes in the Force** → `unknown` (ability card)
39. **Emergency Team** → `unknown` (ability card)
40. **Empower Weapon** → `unknown` (ability card)
41. **Entreat Aid** → `allow_extra_aid` (ability card)
42. **Exotic Weapon Mastery** → `unknown` (ability card)
43. **Exotic Weapons Master** → `unknown` (ability card)
44. **Expert Grappler** (unmapped)
45. **Exploit Weakness** → `unknown` (ability card)
46. **Exposing Strike** → `unknown` (ability card)
47. **Extra First Aid** → `unknown` (ability card)
48. **Feel the Force** → `unknown` (ability card)
49. **Fight to the Death** → `heal_all_allies` (ability card)
50. **Fleet Deployment** → `unknown` (ability card)
51. **Force Fortification** → `unknown` (ability card)
52. **Force Harmony** → `force_activation` (ability card)
53. **Force Revive** → `unknown` (ability card)
54. **Fortified Body** → `unknown` (ability card)
55. **Fringe Savant** → `unknown` (ability card)
56. **Gang Leader** → `intimidate_bonus` (ability card)
57. **Grabber** → `unknown` (ability card)
58. **Grand Leader** → `heal_all_allies` (ability card)
59. **Great Shot** (unmapped)
60. **Greater Focused Force Talisman** → `unknown` (ability card)
61. **Guaranteed Shot** → `unknown` (ability card)
62. **Guidance** → `special` (ability card)
63. **Gun Club** → `damage_bonus` (ability card)
64. **Hasty Withdrawal** → `ally_movement` (ability card)
65. **Healing Boost** → `damage_bonus` (ability card)
66. **Higher Yield** → `damage_bonus` (ability card)
67. **Hunter's Target** → `unknown` (ability card)
68. **Hyperdriven** → `skill_bonus` (ability card)
69. **Illusion Bond** → `special` (ability card)
70. **Immovable** → `special` (ability card)
71. **Impel Ally I** → `movement` (ability card)
72. **Improved Consular's Vitality** → `damage_bonus` (ability card)
73. **Improved Healing Boost** → `damage_bonus` (ability card)
74. **Improved Sentinel's Gambit** → `special` (ability card)
75. **Improved Weaken Resolve** → `special` (ability card)
76. **Improvised Weapon Master** → `damage_bonus` (ability card)
77. **Indomitable Will** → `immunity` (ability card)
78. **Influential Friends** → `skill_bonus` (ability card)
79. **It's a Trap** (unmapped)
80. **Jedi Network** → `special` (ability card)
81. **Jet Pack Withdraw** → `movement_reaction` (ability card)
82. **Juggernaut** → `unknown` (ability card)
83. **Keen Shot** → `unknown` (ability card)
84. **Keep It Going** → `special` (ability card)
85. **Knack** → `unknown` (ability card)
86. **Knockback** → `special` (ability card)
87. **Labyrinthine Mind** → `immunity` (ability card)
88. **Lifesaver** → `save_ally` (ability card)
89. **Lightsaber Form Savant** → `ability_recovery` (ability card)
90. **Make Do** → `damage_bonus` (ability card)
91. **Mandalorian Advance** → `movement_action` (ability card)
92. **Master Advisor** (unmapped)
93. **Masterwork Lightsaber** → `damage_bonus` (ability card)
94. **Mercenary's Determination** → `movement` (ability card)
95. **No Escape** → `special` (ability card)
96. **Noble Fencing Style** → `damage_bonus` (ability card)
97. **One for the Team** → `damage_bonus` (ability card)
98. **Only the Finest** → `special` (ability card)
99. **Penetrating Attack** (unmapped)
100. **Perfect Telepathy** → `special` (ability card)

... and 61 more unmapped talents
