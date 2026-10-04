# Phase 3 — Final Owner Rulings (applied)

Status: `OWNER_FINAL_RULINGS_APPLIED_AUDIT_ONLY`. Audit authority only; production untouched.

Ontology: 187 → **190** (added `condition_track`, `full_round_action`, `ion`, `resource_gain`; retired `force-point`). New hard implication: `full_round_action` → `action_economy`. Owner policy added: `EXACT_SKILL_POLICY`.

## Former unresolved findings (196)

- ADD: **70**; NO_CHANGE: **126**; REMOVE: 0; SOURCE_EVIDENCE_BLOCKER: 0.

| Tag | ADD | NO_CHANGE |
| --- | --- | --- |
| `ally_support` | 5 | 46 |
| `concealment` | 1 | 0 |
| `cover` | 4 | 3 |
| `damage_reduction` | 2 | 0 |
| `dark_side` | 0 | 3 |
| `dark_side_score` | 5 | 0 |
| `defense` | 1 | 1 |
| `evasion` | 0 | 1 |
| `force_defense` | 1 | 2 |
| `healing` | 0 | 7 |
| `lightsaber` | 2 | 1 |
| `melee` | 8 | 3 |
| `modification` | 0 | 3 |
| `morale` | 6 | 4 |
| `pistol` | 2 | 1 |
| `poison` | 1 | 0 |
| `ranged` | 5 | 2 |
| `ranged_defense` | 0 | 1 |
| `recovery` | 0 | 5 |
| `repair` | 0 | 4 |
| `shields` | 0 | 4 |
| `surprise_round` | 0 | 2 |
| `target-designation` | 16 | 15 |
| `teamwork` | 7 | 3 |
| `vehicle` | 4 | 15 |

### ADD decisions

- Adept Negotiator (TALENT `7acc479dee2d3b10`): ADD `ally_support` — The ally (or allies) directly receives the protection/benefit/bonus the mechanic creates, not merely an ally-trigger or condition.
- Corporate Clout (TALENT `50073b86c51c52cd`): ADD `ally_support` — The ally (or allies) directly receives the protection/benefit/bonus the mechanic creates, not merely an ally-trigger or condition.
- Double Up (TALENT `3aeee38a6c7b7f12`): ADD `ally_support` — The ally (or allies) directly receives the protection/benefit/bonus the mechanic creates, not merely an ally-trigger or condition.
- Irregular Tactics (TALENT `2be9f49f9c675bfb`): ADD `ally_support` — The ally (or allies) directly receives the protection/benefit/bonus the mechanic creates, not merely an ally-trigger or condition.
- Ranged Flank (TALENT `a6e38142447c64a9`): ADD `ally_support` — The ally (or allies) directly receives the protection/benefit/bonus the mechanic creates, not merely an ally-trigger or condition.
- Stealthy Withdrawal (TALENT `c483676cb3c07cb3`): ADD `concealment` — The operative mechanic requires/depends on the Concealment state as part of how the effect resolves.
- Draw Fire (TALENT `f29d5c0628459c94`): ADD `cover` — The operative mechanic requires, moves to, or conditions its effect on the Cover state.
- Hide in Plain Sight (TALENT `f25d28252bade7d1`): ADD `cover` — The operative mechanic requires, moves to, or conditions its effect on the Cover state.
- Lead From the Front (TALENT `a67a1a657fe5665c`): ADD `cover` — The operative mechanic requires, moves to, or conditions its effect on the Cover state.
- Stealthy Withdrawal (TALENT `c483676cb3c07cb3`): ADD `cover` — The operative mechanic requires, moves to, or conditions its effect on the Cover state.
- Akk Dog Trainer's Actions (TALENT `ad7fd3e1a2b04c30`): ADD `damage_reduction` — The operative mechanic directly states how damage interacts with Damage Reduction (counts toward overcoming it or defines a weapon's DR).
- Sith Alchemy (TALENT `eb4f3e8660bc476589d0323d4cc00845`): ADD `damage_reduction` — The operative mechanic directly states how damage interacts with Damage Reduction (counts toward overcoming it or defines a weapon's DR).
- Attuned (TALENT `bd797d3f83d0f61f`): ADD `dark_side_score` — The operative mechanic depends on a Dark Side Score comparison/threshold.
- Dark Side Bane (TALENT `97a771d1f4627521`): ADD `dark_side_score` — The operative mechanic depends on a Dark Side Score comparison/threshold.
- Focused Attack (TALENT `2fc019fa8c4108a7`): ADD `dark_side_score` — The operative mechanic depends on a Dark Side Score comparison/threshold.
- Resist the Dark Side (TALENT `3331d4b2b88e446f`): ADD `dark_side_score` — The operative mechanic depends on a Dark Side Score comparison/threshold.
- Sith Reverence (TALENT `81b2b88df9600ca7`): ADD `dark_side_score` — The operative mechanic depends on a Dark Side Score comparison/threshold.
- Dive for Cover (FEAT `2866d953b4b6245d`): ADD `defense` — The operative mechanic directly changes whether an attack hits or is avoided.
- Inspire Fear I (TALENT `cf4b1e5b126a2a7e`): ADD `force_defense` — The operative mechanic directly defends against Force powers targeting the user.
- Flurry (FEAT `0536f81eff886234`): ADD `lightsaber` — The operative mechanic names lightsabers as a closed scope (wielding/with lightsabers, or how lightsabers interact with the effect).
- Infuse Weapon (TALENT `0df15b0ea7721c50`): ADD `lightsaber` — The operative mechanic names lightsabers as a closed scope (wielding/with lightsabers, or how lightsabers interact with the effect).
- Acrobatic Dodge (FEAT `cda6cb7b58f96a2f`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Knife Trick (FEAT `61c053191d05d0a2`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Beloved (TALENT `444c032c563c18a1`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Intimidating Defense (TALENT `de751f28fc269c85`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Praetoria Ishu (TALENT `16aa9efd54967320`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Primitive Block (TALENT `d043a3c0494345ac`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Thunderclap (TALENT `7f63f6f3fec96bf3`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Visionary Defense (TALENT `153f4b3c6510023d`): ADD `melee` — The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Ample Foraging (FEAT `223a5c14f2ea4737`): ADD `morale` — The operative mechanic grants, modifies or negates a morale bonus/penalty.
- Logic Upgrade: Self-Defense (FEAT `191aacaecaa92ce1`): ADD `morale` — The operative mechanic grants, modifies or negates a morale bonus/penalty.
- Mandalorian Training (FEAT `6723270208549f73`): ADD `morale` — The operative mechanic grants, modifies or negates a morale bonus/penalty.
- Resolute Stance (FEAT `63dbb0e9623f7fce`): ADD `morale` — The operative mechanic grants, modifies or negates a morale bonus/penalty.
- Shrewd Bargainer (FEAT `df58db54c4b53539`): ADD `morale` — The operative mechanic grants, modifies or negates a morale bonus/penalty.
- Warrior Heritage (FEAT `a9a59c85cddbda1f`): ADD `morale` — The operative mechanic grants, modifies or negates a morale bonus/penalty.
- Disabler (FEAT `94023012303ad257`): ADD `pistol` — The operative mechanic names pistols as a closed scope.
- Sport Hunter (FEAT `8778b4271420f789`): ADD `pistol` — The operative mechanic names pistols as a closed scope.
- Force Treatment (TALENT `181da7f36b9fba9d`): ADD `poison` — The operative mechanic directly treats poison.
- Dive for Cover (FEAT `2866d953b4b6245d`): ADD `ranged` — The operative scope is ranged attacks/ranged combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Champion (TALENT `a7aea0411eb4fbc0`): ADD `ranged` — The operative scope is ranged attacks/ranged combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Praetoria Ishu (TALENT `16aa9efd54967320`): ADD `ranged` — The operative scope is ranged attacks/ranged combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Shield Gauntlet Deflect (TALENT `da5096b45d174f36`): ADD `ranged` — The operative scope is ranged attacks/ranged combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Visionary Defense (TALENT `153f4b3c6510023d`): ADD `ranged` — The operative scope is ranged attacks/ranged combat as a named closed scope (CLOSED_SCOPE_POLICY).
- Hijkata Training (FEAT `6dcb59b199dba6a1`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Logic Upgrade: Tactician (FEAT `a75d5d6b3ce5bc6f`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Assault Gambit (TALENT `ea9a4f110f5d2d8d`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Competitive Edge (TALENT `4acfb3b5a7a402fd`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Demoralizing Defense (TALENT `4c7eb9c679ee43a8`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Droid Mettle (TALENT `e55e9497ecf6303d`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Enhance Cover (TALENT `1d50b01d5151c3eb`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Escort Fighter (TALENT `0991f4321b429bf5`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Feed Information (TALENT `f9a2bda9b63ad191`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Fleet Deployment (TALENT `d1c2e9bdbb58b715`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Force Warning (TALENT `0178e98b17ab2bcc`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Forward Patrol (TALENT `2b44b253e4174300`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Frighten (TALENT `50273d5ce8f84c31`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Slippery Strike (TALENT `a1a905019e7f17c0`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Stolen Advantage (TALENT `d137ae2e8be700b3`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Unwavering Ally (TALENT `5ea6368fd61de9f1`): ADD `target-designation` — The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).
- Sensor Link (FEAT `e95252c02d2ae129`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Starship Designer (FEAT `e9147ce66a783fbb`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Superior Tech (FEAT `a717435c8094e7fb`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Tech Specialist (FEAT `42e2404790756700`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Advantageous Positioning (TALENT `b2b2176b7d9360e0`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Backstabber (TALENT `367b23802f5f4d8b`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Channel Aggression (TALENT `ef3ec55015c60bda`): ADD `teamwork` — The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.
- Devastating Attack (TALENT `383915a7d11e1225`): ADD `vehicle` — The mechanic directly interacts with vehicle-specific rules (vehicle weapons, shielded vehicles, occupied vehicle), not a generic target list or exception.
- Field Detection (TALENT `700ec3d782794d11`): ADD `vehicle` — The mechanic directly interacts with vehicle-specific rules (vehicle weapons, shielded vehicles, occupied vehicle), not a generic target list or exception.
- Known Dissident (TALENT `e15adb60be0dda02`): ADD `vehicle` — The mechanic directly interacts with vehicle-specific rules (vehicle weapons, shielded vehicles, occupied vehicle), not a generic target list or exception.
- Penetrating Attack (TALENT `7d547902b8d9109e`): ADD `vehicle` — The mechanic directly interacts with vehicle-specific rules (vehicle weapons, shielded vehicles, occupied vehicle), not a generic target list or exception.

### NO_CHANGE decisions

- `ally_support`: Aquatic Specialists; Ascension Specialists; Covert Operatives; Jedi Familiarity; Justice Seeker; Mounted Regiment; Nimble Team; Separatist Military Training; Swarm; Unhindered Approach; Unified Squadron; Wary Sentries; Capture Droid; Cheap Shot; Comrades in Arms; Creeping Approach; Demand Surrender; Distress to Discord; Double Agent; Force Throw; Friend or Foe; Keep Together; Knight's Morale; Melee Assault; Melee Brute; Melee Opportunist; Misplaced Loyalty; Oath of Duty; Omens; Opportunistic Strike; Recruit Enemy; Retribution; Revelation; Revenge; Rising Anger; Rising Panic; Seize the Moment; Shoulder to Shoulder; Shunt Damage; Sith Reverence; Sly Combatant; Spring the Trap; Squad Brutality; Stick Together; Strength in Numbers; Strength of the Empire — The ally appears only as a trigger, condition, target of a self-only benefit, or the beneficiary is the user; no ally directly receives support.
- `concealment`: — — Concealment appears only as ordinary English/reference.
- `cover`: Tech Specialist; Fast Talker; Seek and Destroy — Cover appears only as ordinary English (cover story, trait tables) or as an incidental reference without operative dependence.
- `damage_reduction`: — — DR appears only as an abbreviation inside another rule without operative interaction.
- `dark_side`: Attuned; Dark Scourge; Force Harmony — Dark Side appears only as a bonus-type name or tree identity; no direct interaction with Dark Side powers/descriptors/alignment mechanics.
- `dark_side_score`: — — 
- `defense`: Reactive Stealth — The mechanic does not change whether an attack hits or is avoided.
- `evasion`: Targeted Area — Evasion appears only as a reference to the existing talent; the record does not avoid/negate an attack.
- `force_defense`: Akk Dog Master; Reap Retribution — The mechanic is not defense against Force powers (offense, self-targeting redirection).
- `healing`: Forceful Recovery; Resurgence; Aggressive Surge; Crippling Strike; Reduce Defense; Reduce Mobility; Soothe — The mechanic does not restore hit points ("healed" or second wind used only as a trigger/duration).
- `lightsaber`: Precision Fire — Lightsabers appear only as flavor.
- `melee`: Charging Fire; Precise Shot; Force Throw — Melee appears only as exclusion, comparison, or a state; not the operative scope.
- `modification`: Infuse Weapon; Power of the Dark Side; Scripted Routines — Ordinary-English "modify" with no item/device modification.
- `morale`: Dreadful Countenance; Hideous Visage; Suppression Fire; Unswerving Resolve — Morale/fear appears only as ordinary English or a fear effect; no morale bonus/penalty is modified.
- `pistol`: Blaster Turret I — The pistol is a stat reference for a device, not a pistol mechanic.
- `poison`: — — 
- `ranged`: Tool Frenzy; Bayonet Master — Ranged appears only as exclusion, reference, or an incidental weapon type.
- `ranged_defense`: Sniper Shot — No defense against ranged attacks is created.
- `recovery`: Pinpoint Accuracy; Aggressive Surge; Rising Panic; Share Force Technique; Unstoppable — The mechanic does not restore from injury/impairment (it blocks recovery, is triggered by second wind, or reduces steps moved).
- `repair`: Hotwired Processor; Power Boost; Power Surge; Preserving Shot — Repair appears only as the condition under which an existing penalty ends; the record does not restore functionality.
- `shields`: Dedicated Guardian; Force Cloak; Fortified Body; Harm's Way — Ordinary-English "shield" or a talent/action name; no interaction with shields or Shield Rating.
- `surprise_round`: Commander's Prerogative; Reset Initiative — Acts after the Surprise Round; no change during a Surprise Round.
- `target-designation`: Signature Device; Cycle of Harmony; Direct; Discblade Arc; Echoes in the Force; Force Exertion; Force Stabilize; Friend or Foe; Heavy Fire Zone; Illusion; Immerse Another; Inspire Competence; Liberate; Safe Zone; Squad Actions — Designation is equipment/option/area/form choice or an immediate one-time effect, not a continuing special target.
- `teamwork`: Cantina Brawler; Flanking Fire; Uncanny Dodge II — Flanking against the user or an unrelated reference; no cooperation or shared position is required/rewarded.
- `vehicle`: Burst Fire; Power Attack; Power Blast; Rapid Shot; Scavenger; Sniper Shot; Band Together; Boarder; Combined Fire; Deflect; Move Massive Object; Outsider's Eye; Piercing Hit; Ready and Willing; Signature Item — Vehicles appear only as an exception, generic target list, or incidental reference.

## Existing-tag compliance REMOVEs

- Perfect Telepathy (TALENT `2da74bc3f4d45d2d`): REMOVE `telepath` — Perfect Telepathy improves ordinary telepathic communication; telepath is only for deep probing/intrusion/mind reading and never for generic telepathic communication or tree identity.
- Flurry Attack (TALENT `9e2092257b53cd21`): REMOVE `exotic_weapon` — Flurry Attack lets the character choose "a single weapon group or exotic weapon": open generic weapon selection does not qualify.
- Greater Weapon Specialization (TALENT `e9820b341bf94de1`): REMOVE `melee` — Greater Weapon Specialization selects one exotic weapon or one of several weapon groups: open generic selection does not qualify.
- Greater Weapon Specialization (TALENT `e9820b341bf94de1`): REMOVE `ranged` — Greater Weapon Specialization selects one exotic weapon or one of several weapon groups: open generic selection does not qualify.
- Device Jammer (TALENT `5db4343762664d95`): REMOVE `power_systems` — Device Jammer names a "personal shield generator" only as an example of an electronic device; no direct power-system interaction.
- Greater Focused Force Talisman (TALENT `4ae840aaa4e0eba0`): REMOVE `recovery` — Greater Focused Force Talisman concerns recovering a Force power with a Force Point (expendable resource); recovery is not used for recovery of expendable resources.
- Confident Success (FEAT `139a80972fc3b8ee`): REMOVE `resource_recovery` — The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.
- Force Boon (FEAT `53444cc061d81627`): REMOVE `resource_recovery` — The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.
- Unswerving Resolve (FEAT `98d9c2c211a7a458`): REMOVE `resource_recovery` — The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.
- Instinctive Perception (FEAT `bf71e5f4171547ef`): REMOVE `resource_recovery` — The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.
- Spacer's Surge (FEAT `dd6ad0e712e9a314`): REMOVE `resource_recovery` — The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.
- Jedi Familiarity (FEAT `fc56de4d0d15c95c`): REMOVE `resource_recovery` — The mechanic restores no previously spent or expended resource; resource_recovery excludes creating a new temporary resource and increasing capacity.
- Skillful Recovery (TALENT `323cc243fef47675`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Telepathic Influence (TALENT `3b30ffbfc3e3270f`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Mystical Link (TALENT `45c4e72d74c44acb`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- WatchCircle Initiate (TALENT `ab9f1497d0b2d7c2`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Force Flow (TALENT `b0898acb0a19a3cd`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Channel Vitality (TALENT `cddfb9833c7d3344`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Fringe Savant (TALENT `d4a9f83d180934b5`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Master Advisor (TALENT `e6c4f05db6ac6c06`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Instrument of the Force (TALENT `f0ade00000000001`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Forceful Warrior (TALENT `f4b22e32d448b703`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.
- Stellar Warrior (TALENT `f92583cf04620d84`): REMOVE `force_capacity` — The mechanic grants a temporary spendable resource only; no persistent/additional Force-resource capacity is increased.

## `force-point` migration (9 records, final use 0)

| Record | Before | Final representation |
| --- | --- | --- |
| Confident Success (FEAT) | force-point, resource_recovery, resource_gain | resource_gain |
| Force Boon (FEAT) | force, force-point, resource_recovery, resources, force_capacity | resources, force_capacity |
| Unswerving Resolve (FEAT) | force-point, resource_recovery, resource_gain | resource_gain |
| Instinctive Perception (FEAT) | force-point, resource_recovery, resource_gain | resource_gain |
| Spacer's Surge (FEAT) | force-point, resource_recovery, resource_gain | resource_gain |
| Jedi Familiarity (FEAT) | force, force_support, force-point, resource_recovery, resource_gain | resource_gain |
| Skill Boon (TALENT) | force-point, force_point_spend, resource_spend, force_multiplier | force_point_spend, resource_spend, force_multiplier |
| Skillful Recovery (TALENT) | force-point, force_capacity, resources, resource_gain | resources, resource_gain |
| Reliable Boon (TALENT) | force-point, force_point_spend, resource_spend | force_point_spend, resource_spend |

## New-tag populations

| Tag | Matched | Newly added | Final records |
| --- | --- | --- | --- |
| `condition_track` | 81 | 81 | 81 |
| `full_round_action` | 60 | 60 | 60 |
| `ion` | 6 | 6 | 6 |
| `resource_gain` | 18 | 18 | 18 |

Hard-implication closure added 5 tag instances. Full lists are in the JSON.
