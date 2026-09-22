# Attack Option Coverage Report

Generated: 2026-09-22T20:12:52.865Z

Scope: every `type: "ATTACK_OPTION"` rule in `system.abilityMeta.rules` across `packs/feats.db` and `packs/talents.db`, classified against how `scripts/engine/combat/combat-option-resolver.js` and the live attack dialog (`scripts/rolls/roll-config.js`) actually consume it today.

This is an inventory audit, not a certification that every listed mechanic is fully wired end-to-end for every downstream consumer (chat cards, damage packets, AI, etc.) -- see Math Integrity Freeze, Attack Bonus round 8 in the ledger for what this round did and did not certify.

## Summary

- Total ATTACK_OPTION records: 136 (feats: 88, talents: 48)
- SELECTABLE (renders as a toggle/flag checkbox in the current attack dialog, no unmet context dependency): 56
- PASSIVE (a real, always-active modifier surfaced by CombatOptionResolver -- not a player checkbox): 33
- CONTEXT-GATED SELECTABLE (a toggle/flag gated on Aim/Charge/Autofire -- the dialog CAN satisfy this gate; renders disabled-with-reason until it is): 17
- SLIDER/VALUE (a numeric slider control, e.g. Power Attack): 3
- METADATA PRESENT BUT RUNTIME INCOMPLETE (a real ATTACK_OPTION record with a gate -- maneuver, target state, opportunity-attack, area-attack, or another option -- that the CURRENT attack dialog never supplies; CombatOptionResolver's gate logic is correct, but no invocation of THIS dialog can ever satisfy it today): 27
- NOT IMPLEMENTED (no usable option id, or a control type optionCard()/hydrateOption() does not know how to render): 0

## SELECTABLE (56)

- [feat] Flurry (`flurry`, control: toggle)
- [feat] Saber Throw (`saberThrow`, control: flag)
- [feat] Zero Range (`zeroRange`, control: toggle)
- [feat] Grazing Shot (`grazingShot`, control: flag)
- [feat] Staggering Attack (`staggeringAttackMinor`, control: toggle)
- [feat] Staggering Attack (`staggeringAttackMajor`, control: toggle)
- [feat] Wrruushi Training (`wrruushiFortitudeStrike`, control: toggle)
- [feat] Tool Frenzy (`toolFrenzy`, control: toggle)
- [feat] Separatist Military Training (`separatistMilitaryTraining`, control: toggle)
- [feat] Running Attack (`runningAttack`, control: flag)
- [feat] Attack Combo (Fire and Strike) (`attackComboFireAndStrike`, control: toggle)
- [feat] Attack Combo (Melee) (`attackComboMelee`, control: toggle)
- [feat] Overwhelming Attack (`overwhelmingAttack`, control: toggle)
- [feat] Rapid Shot (`rapidShot`, control: toggle)
- [feat] Sniper Shot (`sniperShot`, control: toggle)
- [feat] Slammer (`slammer`, control: toggle)
- [feat] K'thri Training (`kthriSwiftUnarmedAttack`, control: flag)
- [feat] Attack Combo (Ranged) (`attackComboRanged`, control: toggle)
- [feat] Angled Throw (`angledThrow`, control: flag)
- [feat] Precise Shot (`preciseShot`, control: flag)
- [feat] Forceful Blast (`forcefulBlast`, control: flag)
- [feat] Improved Rapid Strike (`improvedRapidStrike`, control: toggle)
- [feat] Rapid Strike (`rapidStrike`, control: toggle)
- [feat] Hobbling Strike (`hobblingStrike`, control: flag)
- [feat] Critical Strike (`criticalStrike`, control: toggle)
- [feat] Mighty Swing (`mightySwing`, control: toggle)
- [feat] Echani Training (`echaniSingleUnarmedStrike`, control: toggle)
- [talent] Weapon Shift (`weapon-shift-ranged-as-melee`, control: flag)
- [talent] Hailfire (`hailfire-pistol-autofire`, control: flag)
- [talent] Strength of the Empire (`strength-of-the-empire-active`, control: flag)
- [talent] Mandalorian Glory (`mandalorian-glory-next-attack`, control: flag)
- [talent] Cantina Brawler (`cantinaBrawlerFlanked`, control: toggle)
- [talent] Hammerblow (`hammerblow`, control: toggle)
- [talent] Praetoria Vonil (`praetoria-vonil-mobile-two-handed-lightsaber`, control: flag)
- [talent] Nonlethal Tactics (`nonlethal-tactics-stun`, control: flag)
- [talent] Target Acquisition (`target-acquisition`, control: flag)
- [talent] Curved Throw (`curved-throw`, control: flag)
- [talent] Power Surge (`power-surge-melee`, control: flag)
- [talent] Stinging Jab (`stingingJab`, control: toggle)
- [talent] Set for Stun (`set-for-stun`, control: flag)
- [talent] Reap Retribution (`reap-retribution-damage`, control: flag)
- [talent] Hunter's Target (`hunters-target`, control: flag)
- [talent] Make Do (`makeDo`, control: flag)
- [talent] Mandalorian Ferocity (`mandalorian-ferocity-multiattack-damage`, control: flag)
- [talent] Manipulating Strike (`manipulating-strike`, control: flag)
- [talent] Ambush (`disgrace-ambush-target-not-acted`, control: flag)
- [talent] Silent Takedown (`silent-takedown`, control: flag)
- [talent] Gun Club (`gun-club-ranged-as-melee`, control: flag)
- [talent] Ambush (Republic Commando) (`republic-commando-ambush`, control: flag)
- [talent] Knowledge is Power (`knowledge-is-power`, control: flag)
- [talent] Sentinel Strike (`sentinel-strike-flat-footed-lightsaber`, control: flag)
- [talent] Devastating Melee Smash (`devastatingMeleeSmash`, control: toggle)
- [talent] Knowledge is Strength (`knowledge-is-strength`, control: flag)
- [talent] Tangle Up (`tangle-up`, control: flag)
- [talent] Master of the Great Hunt (`master-of-the-great-hunt-beast`, control: flag)
- [talent] Invisible Attacker (`invisible-attacker`, control: flag)

## PASSIVE (33)

- [feat] Justice Seeker (`justiceSeeker`, control: passive)
- [feat] Anointed Hunter (`anointedHunterThrownMove`, control: passive)
- [feat] Blaster Barrage (`blasterBarrage`, control: passive)
- [feat] Sniper (`sniper`, control: passive)
- [feat] Flood of Fire (`floodOfFire`, control: passive)
- [feat] Swarm (`swarm`, control: passive)
- [feat] Tae-Jitsu Training (`taeJitsuCritical`, control: passive)
- [feat] Crossfire (`crossfire`, control: passive)
- [feat] Deadly Sniper (`deadlySniper`, control: passive)
- [feat] Trench Warrior (`trenchWarrior`, control: passive)
- [feat] Stava Training (`stavaTrainingChargeGrab`, control: passive)
- [feat] Sport Hunter (`sportHunterSlugthrowerPistolPointBlank`, control: passive)
- [feat] Sport Hunter (`sportHunterSportingBlasterRifleAim`, control: passive)
- [feat] Bantha Herder (`banthaHerder`, control: passive)
- [feat] Advantageous Attack (`advantageousAttack`, control: passive)
- [feat] Flash and Clear (`flashAndClear`, control: passive)
- [feat] Heavy Hitter (`heavyHitter`, control: passive)
- [feat] Teräs Käsi Training (`terasKasiThreshold`, control: passive)
- [feat] Far Shot (`farShot`, control: passive)
- [feat] Mechanical Martial Arts (`mechanicalMartialArts`, control: passive)
- [feat] Momentum Strike (`momentumStrike`, control: passive)
- [feat] Pistoleer (`pistoleerHoldOut`, control: passive)
- [feat] Bowcaster Marksman (`bowcasterMarksman`, control: passive)
- [feat] Prime Shot (`primeShot`, control: passive)
- [feat] Cornered (`cornered`, control: passive)
- [feat] Artillery Shot (`artilleryShot`, control: passive)
- [talent] Great Shot (`great-shot`, control: passive)
- [talent] Starship Raider (`starship-raider`, control: passive)
- [talent] Vaapad (`vaapad`, control: passive)
- [talent] Expert Gunner (`expert-gunner`, control: passive)
- [talent] Rifle Master (`rifle-master-short-range`, control: passive)
- [talent] Heavy-Duty Actuators (`heavy-duty-actuators`, control: passive)
- [talent] Greater Weapon Focus (Fira) (`greater-weapon-focus-fira`, control: passive)

## CONTEXT_GATED_SELECTABLE (17)

- [feat] Spray Shot (`sprayShot`, control: flag)
- [feat] Improved Charge (`improvedCharge`, control: flag)
- [feat] Burst Fire (`burstFire`, control: toggle)
- [feat] Flèche (`fleche`, control: toggle)
- [feat] Maniacal Charge (`maniacalCharge`, control: flag)
- [feat] Careful Shot (`carefulShot`, control: toggle)
- [feat] Deadeye (`deadeye`, control: toggle)
- [feat] Aiming Accuracy (`aimingAccuracy`, control: toggle)
- [feat] Steadying Position (`steadyingPosition`, control: flag)
- [feat] Charging Fire (`chargingFire`, control: flag)
- [feat] Autofire Assault (`autofireAssault`, control: toggle)
- [feat] Powerful Charge (`powerfulCharge`, control: toggle)
- [feat] Strafe (`strafe`, control: flag)
- [feat] Autofire Sweep (`autofireSweep`, control: flag)
- [talent] Hunter's Mark (`hunters-mark`, control: flag)
- [talent] Precision Fire (`precision-fire`, control: flag)
- [talent] Takedown (`takedown-charge-prone`, control: flag)

## SLIDER_VALUE (3)

- [feat] Melee Defense (`meleeDefense`, control: slider)
- [feat] Power Attack (`powerAttack`, control: slider)
- [feat] Power Blast (`powerBlast`, control: slider)

## METADATA_PRESENT_RUNTIME_INCOMPLETE (27)

- [feat] K'tara Training (`ktaraFlatFootedStrike`, control: toggle) -- unsupplied gate(s): requiresTargetFlatFooted
- [feat] K'tara Training (`ktaraMuteStrike`, control: toggle) -- unsupplied gate(s): requiresTargetDeniedDexBonus
- [feat] Destructive Force (`destructiveForce`, control: passive) -- unsupplied gate(s): requiresTargetType
- [feat] Opportunistic Shooter (`opportunisticShooter`, control: passive) -- unsupplied gate(s): requiresOpportunityAttack
- [feat] Improved Grapple (`improvedGrapple`, control: passive) -- unsupplied gate(s): requiresManeuver
- [feat] Wicked Strike (`wickedStrike`, control: flag) -- unsupplied gate(s): requiresOption
- [feat] Droid Hunter (`droidHunterDamage`, control: passive) -- unsupplied gate(s): requiresTargetType
- [feat] Droid Hunter (`droidHunterIonDamage`, control: passive) -- unsupplied gate(s): requiresTargetType
- [feat] Knife Trick (`knifeTrick`, control: passive) -- unsupplied gate(s): requiresOpportunityAttack
- [feat] Mandalorian Training (`mandalorianTrainingChargingFire`, control: passive) -- unsupplied gate(s): requiresOption
- [feat] Hijkata Training (`hijkataCounterattack`, control: toggle) -- unsupplied gate(s): requiresOpportunityAttack
- [feat] Halt (`halt`, control: toggle) -- unsupplied gate(s): requiresOpportunityAttack
- [feat] Opportunistic Trickery (`opportunisticTrickery`, control: flag) -- unsupplied gate(s): requiresOpportunityAttack
- [feat] Cunning Attack (`cunningAttack`, control: passive) -- unsupplied gate(s): requiresTargetFlatFooted
- [feat] Targeted Area (`targetedArea`, control: toggle) -- unsupplied gate(s): requiresAreaAttack
- [feat] Rebel Military Training (`rebelMilitaryTraining`, control: flag) -- unsupplied gate(s): requiresOption
- [feat] Improved Opportunistic Trickery (`improvedOpportunisticTrickery`, control: flag) -- unsupplied gate(s): requiresOpportunityAttack
- [feat] Improved Disarm (`improvedDisarm`, control: toggle) -- unsupplied gate(s): requiresManeuver
- [talent] Jedi Hunter (`jedi-hunter-force-sensitive`, control: flag) -- unsupplied gate(s): requiresTargetFeat
- [talent] Controlled Burst (`controlled-burst`, control: passive) -- unsupplied gate(s): requiresOption
- [talent] Sucker Punch (`suckerPunch`, control: toggle) -- unsupplied gate(s): requiresTargetDeniedDexBonus
- [talent] Expert Grappler (`expertGrappler`, control: passive) -- unsupplied gate(s): requiresManeuver
- [talent] Twin Shot (`twin-shot`, control: passive) -- unsupplied gate(s): requiresOption
- [talent] Breach Cover (`breach-cover`, control: passive) -- unsupplied gate(s): requiresAreaAttack
- [talent] Opportunity Fire (`opportunity-fire-rifle`, control: passive) -- unsupplied gate(s): requiresOpportunityAttack
- [talent] Shellshock (`shellshock-area-unaware`, control: flag) -- unsupplied gate(s): requiresAreaAttack
- [talent] Higher Yield (`higher-yield`, control: flag) -- unsupplied gate(s): requiresAreaAttack

