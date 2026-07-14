# Nonheroic Damage Profile Bulk Candidate Report

Generated: 2026-07-14T13:17:36.369Z
Mode: write-candidates

This report extracts candidate weapon-damage profile rows only from clean,
structured printed-statblock fields on actor packs (`flags.swse.import.raw`
`Melee Weapons`/`Ranged Weapons` on nonheroic.db/npc.db, and
`flags.swse.beastData.melee`/`.ranged` on beasts.db). It does not use
embedded actor.items, possessions text, or free-form prose statblocks as
source authority, unlike the broad PR #903 coverage audit. It never writes
to canonical profile files, actor packs, compendium packs, or runtime code.

## Summary

- Weapon compendium items scanned: 372
- Existing profile records (already-profiled index): 28
- Source files scanned: packs/nonheroic.db, packs/npc.db, packs/beasts.db
- Candidate rows extracted: 4352
- Candidate files written: data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json

> All candidate rows are generated from actor-pack raw statblock fields, which carry no book/page attribution in this repository (matches the finding already documented in the PR #903 coverage audit and every prior NH batch). source.book is set to "Unknown / missing source" and confidence is manualRequired for every candidate rather than gating generation on a source-missing bucket that would otherwise swallow ~100% of rows.

- already-profiled: 10
- safe-ordinary-weapon-candidate: 154
- safe-ordinary-weapon-with-delta: 1667
- no-compendium-match: 514
- ambiguous-compendium-match: 0
- natural-or-unarmed: 1138
- area-autofire-grenade-special: 549
- rider-or-condition: 9
- formula-unclear: 311

## Already Profiled (matches an existing NH profile record) (10)

- `packs/nonheroic.db` :: Vagaari Infiltrator — "Stun Baton +9 (2d6+4 ( Stun ))" — matches existing profile record "vagaari-infiltrator-stun-baton" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json.
- `packs/nonheroic.db` :: Vagaari Infiltrator — "Blaster Pistol +7 (3d6+1)" — matches existing profile record "vagaari-infiltrator-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json.
- `packs/nonheroic.db` :: Vagaari Infiltrator — "Hold-Out Blaster Pistol +7 (3d4+1)" — matches existing profile record "vagaari-infiltrator-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json.
- `packs/npc.db` :: Vagaari Infiltrator — "Stun Baton +9 (2d6+4 ( Stun ))" — matches existing profile record "vagaari-infiltrator-stun-baton" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json.
- `packs/npc.db` :: Vagaari Infiltrator — "Blaster Pistol +7 (3d6+1)" — matches existing profile record "vagaari-infiltrator-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json.
- `packs/npc.db` :: Vagaari Infiltrator — "Hold-Out Blaster Pistol +7 (3d4+1)" — matches existing profile record "vagaari-infiltrator-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json.
- `packs/beasts.db` :: Vindinax — "Bite +7* (1d6+8)" — matches existing profile record "vindinax-bite" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json.
- `packs/beasts.db` :: Vindinax — "Claws (2) +7* (1d4+8)" — matches existing profile record "vindinax-claw" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json.
- `packs/beasts.db` :: Reyko — "Gore +11 (1d8+7)" — matches existing profile record "reyko-gore" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json.
- `packs/beasts.db` :: Reyko — "Gore +13 ((1d8+10)x2) with Battering Rush" — matches existing profile record "reyko-gore" in data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json.

## Safe Ordinary Weapon Candidates (exact compendium match, printed formula = base) (154)

- `packs/nonheroic.db` :: Goon — "Heavy Blaster Pistol +5 (3d8)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Imperial Informant — "Hold-Out Blaster Pistol +1 (3d4)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Medic — "Blaster Carbine +5 (3d8)" — exact match to "Blaster Carbine" (weapons-rifles); printed formula equals compendium base.
- `packs/nonheroic.db` :: Medic — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Scout Trooper — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Ugnaught Worker — "Blaster Pistol +4 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Imperial Army Trooper — "Blaster Pistol +3 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Peace Brigade Thug — "Vibrodagger +2 (2d4)" — exact match to "Vibrodagger" (weapons-simple); printed formula equals compendium base.
- `packs/nonheroic.db` :: Peace Brigade Thug — "Blaster Pistol +2 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Clone Naval Officer — "Blaster Pistol +6 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Elite Republic Trooper — "Blaster Pistol +8 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Elite Wing Security Guard — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: CSA Security Guard — "Blaster Carbine +6 (3d8)" — exact match to "Blaster Carbine" (weapons-rifles); printed formula equals compendium base.
- `packs/nonheroic.db` :: CSA Security Guard — "Blaster Pistol +6 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: CompForce Trooper — "Heavy Blaster Pistol +6 (3d8)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Imperial Navy Trooper — "Blaster Pistol +3 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Black Sun Thug — "Heavy Blaster Pistol +6 (3d8)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Ugnaught Rigger — "Heavy Blaster Pistol +4 (3d8)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Mon Calamari Resistance Member — "Blaster Pistol +4 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Bureaucrat — "Blaster Pistol +2 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Espo Trooper — "ESPO 500 Riot Gun +4 (3d8)" — exact match to "ESPO 500 Riot Gun" (weapons-rifles); printed formula equals compendium base.
- `packs/nonheroic.db` :: Krath Warrior — "Heavy Blaster Pistol +4 (3d8)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Swoop Gang Member — "Vibrodagger +3 (2d4)" — exact match to "Vibrodagger" (weapons-simple); printed formula equals compendium base.
- `packs/nonheroic.db` :: Swoop Gang Member — "Blaster Pistol +4 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Wing Security Guard — "Blaster Pistol +4 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Wookiee Warrior — "Bowcaster +6 (3d10)" — exact match to "Bowcaster" (weapons-rifles); printed formula equals compendium base.
- `packs/nonheroic.db` :: Sith Spy — "Blaster Pistol +8 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Sith Spy — "Hold-Out Blaster Pistol +8 (3d4)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Hired Muscle — "Blaster Pistol +3 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Devaronian Drifter — "Hold-Out Blaster Pistol +4 (3d4)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Death Star Trooper — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Elite Rebel Trooper — "Blaster Pistol +6 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Thug — "Blaster Pistol +1 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Consortium Troubleshooter — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Wookiee Berserker — "Bowcaster +7 (3d10)" — exact match to "Bowcaster" (weapons-rifles); printed formula equals compendium base.
- `packs/nonheroic.db` :: Geonosian Warrior — "Sonic Rifle +2 (2d8 ( Sonic ))" — exact match to "Sonic Rifle" (weapons-rifles); printed formula equals compendium base.
- `packs/nonheroic.db` :: Security Personnel — "Blaster Pistol +6 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Animated Corpse — "Blaster Pistol +8 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Field Medic — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- `packs/nonheroic.db` :: Police Officer — "Blaster Pistol +5 (3d6)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula equals compendium base.
- _(114 more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_

## Safe Ordinary Weapon Candidates With Delta (exact compendium match, obvious base+delta/base+dice) (1667)

- `packs/nonheroic.db` :: Theelin Bodyguard — "Vibroblade +5 (2d6+3)" — exact match to "Vibroblade" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Dark Jedi — "Lightsaber +9 (2d8+6)" — exact match to "Lightsaber" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Dark Jedi — "Lightsaber +7 (3d8+6) with Rapid Strike" — exact match to "Lightsaber" (weapons-simple); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Rodian Black Sun Vigo — "Heavy Blaster Pistol +15 (3d8+9)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Rodian Black Sun Vigo — "Heavy Blaster Pistol +10 (3d8+9)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Rodian Black Sun Vigo — "Heavy Blaster Pistol +10 (3d8+9) with Double Attack" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Krath Commander — "Stun Baton +5 (2d6+3 ( Stun ))" — exact match to "Stun Baton" (weapons-simple); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Krath Commander — "Blaster Pistol +7 (3d6+3)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Notorious Outlaw — "Vibroblade +9 (2d6+6)" — exact match to "Vibroblade" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Notorious Outlaw — "Vibroblade +7 (3d6+6) with Rapid Strike" — exact match to "Vibroblade" (weapons-simple); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Notorious Outlaw — "Blaster Pistol +9 (3d6+4)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Notorious Outlaw — "Blaster Pistol +9 (4d6+4) with Trigger Work" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Imperial Detention Guard — "Blaster Pistol +5 (3d6+2)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Soldier Commander — "Blaster Pistol +10 (3d6+2)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Star Destroyer Officer — "Blaster Pistol +5 (3d6+2)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Clone Shadow Trooper — "Vibrodagger +9 (2d4+3)" — exact match to "Vibrodagger" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Clone Shadow Trooper — "Blaster Carbine +10 (3d8+2)" — exact match to "Blaster Carbine" (weapons-rifles); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Clone Shadow Trooper — "Blaster Carbine +11 (4d8+2) with Deadeye" — exact match to "Blaster Carbine" (weapons-rifles); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Con Artist — "Hold-Out Blaster Pistol +4 (3d4+1)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Dug Fringer — "Blaster Pistol +4 (3d6+1)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Black Sun Lieutenant — "Heavy Blaster Pistol +8 (3d8+3)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Black Sun Lieutenant — "Heavy Blaster Pistol +8 (4d8+3) with Deadeye" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Gambler — "Hold-Out Blaster Pistol +5 (3d4+2)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Elite Death Star Trooper — "Blaster Pistol +10 (3d6+4)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Trandoshan Slaver — "Hold-Out Blaster Pistol +7 (3d4+2)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Imperial Royal Guard — "Heavy Blaster Pistol +12 (3d8+4)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Imperial Sovereign Protector — "Heavy Blaster Pistol +18 (3d8+6)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Sith Mage — "Hold-Out Blaster Pistol +6 (3d4+4)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Bothan Spy — "Vibrodagger +1 (2d4+5)" — exact match to "Vibrodagger" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Bothan Spy — "Blaster Pistol +8 (3d6+4)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Core Fleet Covert Agent — "Stun Baton +3 (2d6+2 ( Stun ))" — exact match to "Stun Baton" (weapons-simple); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Core Fleet Covert Agent — "Heavy Blaster Pistol +4 (3d8+2)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Core Fleet Covert Agent — "Hold-Out Blaster Pistol +4 (3d4+2)" — exact match to "Hold-Out Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Heavy Blaster Pistol +9 (3d8+1)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Jedi Commander — "Lightsaber +9 (2d8+5)" — exact match to "Lightsaber" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Jedi Commander — "Lightsaber +7 (3d8+5) with Rapid Strike" — exact match to "Lightsaber" (weapons-simple); printed formula classified as base-plus-dice.
- `packs/nonheroic.db` :: Red Fury Pirate — "Vibroblade +10 (2d6+4)" — exact match to "Vibroblade" (weapons-simple); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Red Fury Pirate — "Heavy Blaster Pistol +9 (3d8+1)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Clone Fighter Pilot — "Blaster Pistol +8 (3d6+2)" — exact match to "Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- `packs/nonheroic.db` :: Rodian Thief — "Heavy Blaster Pistol +10 (3d8+4)" — exact match to "Heavy Blaster Pistol" (weapons-pistols); printed formula classified as base-plus-delta.
- _(1627 more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_

## No Compendium Match (514)

- `packs/nonheroic.db` :: Goon — "Knife +2 (1d4)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Rodian Black Sun Vigo — "Gun Club +11 (1d6+7)" — no compendium weapon item found with normalized name "gun club".
- `packs/nonheroic.db` :: Imperial Detention Guard — "Baton +3 (1d6)" — no compendium weapon item found with normalized name "baton".
- `packs/nonheroic.db` :: Ewok Scout — "Small Axe +4 (1d6+3)" — no compendium weapon item found with normalized name "small axe".
- `packs/nonheroic.db` :: Ewok Scout — "Knife +4 (1d4+3)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Ewok Scout — "Small Axe -1 (1d6+3)" — no compendium weapon item found with normalized name "small axe".
- `packs/nonheroic.db` :: Ewok Scout — "Knife -1 (1d4+3)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Ewok Scout — "Small Axe +4 (1d6+2)" — no compendium weapon item found with normalized name "small axe".
- `packs/nonheroic.db` :: Soldier Commander — "Knife +8 (1d4+2)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Con Artist — "Knife +2 (1d4)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Medic — "Knife +5 (1d4)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Black Sun Lieutenant — "Knife +6 (1d4+4)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Elite Death Star Trooper — "Baton +8 (1d6+3)" — no compendium weapon item found with normalized name "baton".
- `packs/nonheroic.db` :: Imperial Royal Guard — "Force Pike +14* (2d8+7)" — no compendium weapon item found with normalized name "force pike".
- `packs/nonheroic.db` :: Imperial Sovereign Protector — "Double Vibroblade +18* (2d10+14)" — no compendium weapon item found with normalized name "double vibroblade".
- `packs/nonheroic.db` :: Imperial Sovereign Protector — "Double Vibroblade +16* (2d10+11)" — no compendium weapon item found with normalized name "double vibroblade".
- `packs/nonheroic.db` :: Imperial Sovereign Protector — "Double Vibroblade +16* (2d10+11)" — no compendium weapon item found with normalized name "double vibroblade".
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Combat Gloves +9 (1d4+4)" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Felucian Shaman — "Felucian Skullblade +8 (2d6+1)" — no compendium weapon item found with normalized name "felucian skullblade".
- `packs/nonheroic.db` :: Militia Soldier — "Bayonet +7 (1d8+1)" — no compendium weapon item found with normalized name "bayonet".
- `packs/nonheroic.db` :: SpecForce Elite Soldier — "Knife +13 (1d4+7)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Detention Block Guard — "Baton +5 (1d6+1)" — no compendium weapon item found with normalized name "baton".
- `packs/nonheroic.db` :: Felucian Scout — "Felucian Skullblade +6 (2d6+2)" — no compendium weapon item found with normalized name "felucian skullblade".
- `packs/nonheroic.db` :: Felucian Scout — "Felucian Skullblade +6 (3d6+2) with Mighty Swing" — no compendium weapon item found with normalized name "felucian skullblade".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Knife +11 (1d4+8)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Combat Gloves +11 (1d6+9)" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Combat Gloves +11 (2d6+9 ( Stun )) with Unarmed Stun" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Combat Gloves +6 (1d6+9)" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Combat Gloves +6 (1d6+9) with Double Attack" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Combat Gloves +6 (2d6+9 ( Stun ))" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Noghri Infiltrator — "Combat Gloves +6 (2d6+9 ( Stun )) with Double Attack" — no compendium weapon item found with normalized name "combat gloves".
- `packs/nonheroic.db` :: Ugnaught Worker — "Hydrospanner +6 (1d6+2)" — no compendium weapon item found with normalized name "hydrospanner".
- `packs/nonheroic.db` :: Imperial Dungeoneer — "Neuronic Whip (2-Square Reach ) +11 (2d8+5 ( Stun ))" — no compendium weapon item found with normalized name "neuronic whip 2 square reach".
- `packs/nonheroic.db` :: Trandoshan Elite Mercenary — "Knife +15 (1d4+7)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Mystic — "Quarterstaff +5 (1d6)" — no compendium weapon item found with normalized name "quarterstaff".
- `packs/nonheroic.db` :: Krath Adept — "Short Sword +3 (1d6+2)" — no compendium weapon item found with normalized name "short sword".
- `packs/nonheroic.db` :: Tribal Shaman — "Knife +5 (1d4+4)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Tribal Shaman — "Knife +4 (1d4+4)" — no compendium weapon item found with normalized name "knife".
- `packs/nonheroic.db` :: Trandoshan Marauder — "Vibro-Axe +12* (2d10+31)" — no compendium weapon item found with normalized name "vibro axe".
- `packs/nonheroic.db` :: Trandoshan Marauder — "Vibro-Axe +14* (2d10+31) with Flurry" — no compendium weapon item found with normalized name "vibro axe".
- _(474 more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_

## Ambiguous Compendium Match (0)

_None._

## Natural / Unarmed Rows (manual review lane) (1138)

- `packs/nonheroic.db` :: Theelin Bodyguard — "Unarmed +5 (1d4+3)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: EduCorps Worker — "Unarmed +4 (1d4-1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Elite Stormtrooper — "Unarmed +12 (1d4+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Notorious Outlaw — "Unarmed +9 (1d4+6)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Imperial Informant — "Unarmed +2 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Star Destroyer Officer — "Unarmed +6 (1d4+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Clone Shadow Trooper — "Unarmed +9 (1d4+3)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Byss Elite Stormtrooper Squad — "Unarmed +16 (1d6+7, Area Attack )" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Dug Fringer — "Unarmed +3 (1d3+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Black Sun Lieutenant — "Unarmed +6 (1d4+4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Gambler — "Unarmed +2 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Trandoshan Slaver — "Unarmed +10 (1d8+8)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Trandoshan Slaver — "Unarmed +6* (1d8+12)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Trandoshan Slaver — "Unarmed +10 (2d8+8) with Mighty Swing" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Imperial Royal Guard — "Unarmed +14 (1d6+6)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Imperial Sovereign Protector — "Unarmed +18 (1d8+6)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Veteran Stormtrooper — "Unarmed +10 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Felucian Shaman — "Unarmed +8 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Veteran Heavy Stormtrooper — "Unarmed +11 (1d4+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Clone Trooper Veteran — "Unarmed +8 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Jedi Commander — "Unarmed +8 (1d4+4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Red Fury Pirate — "Unarmed +9 (1d4+4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Clone Fighter Pilot — "Unarmed +6 (1d4+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Militia Soldier — "Unarmed +7 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Rodian Thief — "Unarmed +10 (1d4+4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Whiphid Tracker — "Unarmed +7 (1d6+3)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Whiphid Tracker — "Unarmed +7 (2d6+3) with Mighty Swing" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: SpecForce Elite Soldier — "Unarmed +13 (1d6+7)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Detention Block Guard — "Unarmed +5 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Storm Commando — "Unarmed +11 (1d6+4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Chiss Mercenary — "Unarmed +8 (1d4+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: SpecForce Officer — "Unarmed +8 (1d6+4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Felucian Scout — "Unarmed +6 (1d4+2)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Core Craft Tech — "Unarmed +6 (1d4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: ISB Tactical Agent — "Unarmed +10 (1d6+6)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: AgriCorps Worker — "Unarmed +6 (1d4+1)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Scout Trooper — "Unarmed +4 (1d4)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Jedi Sentinel Master — "Unarmed +15 (1d4+8)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Dark Jedi Master — "Unarmed +19 (1d4+10)" — printed weapon/action name indicates a natural or unarmed attack.
- `packs/nonheroic.db` :: Imperial Shadow Guard Initiate — "Unarmed +13 (1d6+6)" — printed weapon/action name indicates a natural or unarmed attack.
- _(1098 more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_

## Area / Autofire / Grenade / Special Mode Rows (manual review lane) (549)

- `packs/nonheroic.db` :: Elite Stormtrooper — "Blaster Rifle +11 (4d8+3) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Elite Stormtrooper — "Blaster Rifle +8 (5d8+3) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Elite Stormtrooper — "Frag Grenade (1) +12 (4d6+1, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Clone Shadow Trooper — "Frag Grenade (1) +10 (4d6+2, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Byss Elite Stormtrooper Squad — "Blaster Rifle +20 (3d8+5, 1-Square Splash )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Byss Elite Stormtrooper Squad — "Blaster Rifle +17 (3d8+5, 1-Square Splash )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Byss Elite Stormtrooper Squad — "Blaster Rifle +17 (3d8+5, 1-Square Splash ) with Double Attack" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Byss Elite Stormtrooper Squad — "Frag Grenade (2) +17 (4d6+5, 2-Square Burst , 1-Square Splash )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Medic — "Stun Grenade (2) +5 (4d6 ( Stun ), 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Dug Fringer — "Blaster Pistol +2 (4d6+1) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Stormtrooper — "Blaster Rifle +6 (5d8) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Stormtrooper — "Frag Grenade (1) +10 (4d6, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Heavy Repeating Blaster +10 (3d10+3, 2-Square Autofire )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Heavy Repeating Blaster +5 (5d10+3) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Heavy Repeating Blaster ( Braced ) +8 (3d10+3, 2-Square Autofire )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Heavy Repeating Blaster ( Braced ) +8 (5d10+3) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Heavy Weapons Specialist — "Missile Launcher +10 (6d6+3, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Heavy Stormtrooper — "Light Repeating Blaster +6 (3d8, 2-Square Autofire )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Heavy Stormtrooper — "Light Repeating Blaster +6 (5d8) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Heavy Stormtrooper — "Light Repeating Blaster ( Braced ) +9 (3d8, 2-Square Autofire )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Heavy Stormtrooper — "Light Repeating Blaster ( Braced ) +9 (5d8) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Veteran Heavy Stormtrooper — "Frag Grenade (1) +10 (4d6, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Clone Fighter Pilot — "Blaster Pistol +6 (4d6+2) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Militia Soldier — "Rail Detonator Gun +9 (3d8, 1-Square Splash )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Rodian Thief — "Heavy Blaster Pistol +8 (4d8+4) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Elite Soldier — "Blaster Rifle +14 (4d8+8) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Storm Commando — "Thermal Detonator (1) +12 (8d6+3, 4-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Chiss Mercenary — "Blaster Pistol +6 (4d6+1) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Chiss Mercenary — "Heavy Blaster Rifle +7 (4d10+2) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Chiss Mercenary — "Heavy Blaster Rifle +4 (5d10+2) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: SpecForce Officer — "Frag Grenade (1) +8 (4d6+3, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: ISB Tactical Agent — "Blaster Carbine +7 (5d8+4) with Burst Fire" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Scout Trooper — "Frag Grenade (1) +5 (4d6, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Imperial Dungeoneer — "Stun Grenade (1) +9 (4d6+2 ( Stun ), 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Trandoshan Elite Mercenary — "Blaster Carbine +15 (5d8+9) with Controlled Burst" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Sith Trooper — "Frag Grenade (1) +3 (4d6, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: 181st Imperial Pilot — "Hold-Out Blaster Pistol +11 (4d4+6) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: CSA Trooper — "Blaster Rifle +5 (4d8) with Rapid Shot" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: Imperial Army Trooper — "Frag Grenade (1) +3 (4d6, 2-Square Burst )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- `packs/nonheroic.db` :: First Order Specialist — "Subrepeating Blaster +3 (3d6+1, 2-Square Autofire )" — row text indicates autofire/rapid-shot/area/grenade/explosive delivery.
- _(509 more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_

## Rider / Condition Rows (manual review lane) (9)

- `packs/nonheroic.db` :: Yuuzhan Vong Advance Agent — "Amphistaff (Spear Form) +5 (1d8 ( Amphistaff Poison))" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/nonheroic.db` :: Yuuzhan Vong Advance Agent — "Amphistaff (Whip Form) +5* (1d4 ( Amphistaff Poison))" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/npc.db` :: Jango Fett — "Saberdart Launcher +17 (1d4+7 ( Saberdart Poison ))" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/npc.db` :: Captain Panaka — "S-5 Heavy Blaster Pistol +17 (1d2+5) plus Paralytic Poison" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/npc.db` :: Yuuzhan Vong Advance Agent — "Amphistaff (Spear Form) +5 (1d8 ( Amphistaff Poison))" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/npc.db` :: Yuuzhan Vong Advance Agent — "Amphistaff (Whip Form) +5* (1d4 ( Amphistaff Poison))" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/npc.db` :: Shimrra Jamaane, Supreme Overlord — "Sceptre of Power +30 (2d10+28 ( Amphistaff Poison)) with Mighty Swing" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/npc.db` :: Shimrra Jamaane, Supreme Overlord — "Sceptre of Power (Whip Form) +28 (1d8+21 ( Amphistaff Poison))" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.
- `packs/beasts.db` :: Brintak — "Tentacle +19 (1d8+7) plus Poison" — row text indicates a poison/disease/condition-track/maneuver rider rather than plain damage.

## Formula Unclear (compendium matched but dice do not obviously derive) (311)

- `packs/nonheroic.db` :: Theelin Bodyguard — "Blaster Rifle +6 (3d8+1)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+1" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Elite Stormtrooper — "Blaster Rifle +13 (3d8+3)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+3" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Engineer — "Stun Baton +2 (1d6 (2d6 Stun ))" — printed row contains more than one dice expression (e.g. a duplicated/garbled damage value in an annotation); "1d6" was extracted but is not treated as unambiguous.
- `packs/nonheroic.db` :: Soldier Commander — "Blaster Rifle +10 (3d8+2)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+2" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Veteran Stormtrooper — "Blaster Rifle +11 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Sith Mage — "Sith Sword +5 (1d8+3)" — matched "Sith Sword" (weapons-simple, base 2d8); printed formula "1d8+3" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Clone Trooper Veteran — "Blaster Rifle +8 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: SpecForce Elite Soldier — "Blaster Rifle +16 (3d8+8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: SpecForce Elite Soldier — "Blaster Rifle +15 (3d8+8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: SpecForce Elite Soldier — "Blaster Rifle +15 (3d8+8) with Double Attack" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Chiss Mercenary — "Heavy Blaster Rifle +9 (3d10+2)" — matched "Heavy Blaster Rifle" (weapons-rifles, base 3d12); printed formula "3d10+2" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: SpecForce Officer — "Blaster Rifle +8 (3d8+3)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+3" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Scout Trooper — "Blaster Rifle +5 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Undercover Clone Trooper — "Blaster Rifle +5 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Pirate Captain — "Blaster Pistol +8 (3d8+3)" — matched "Blaster Pistol" (weapons-pistols, base 3d6); printed formula "3d8+3" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Pirate Captain — "Hold-Out Blaster Pistol +8 (3d6+5)" — matched "Hold-Out Blaster Pistol" (weapons-pistols, base 3d4); printed formula "3d6+5" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Sith Trooper — "Blaster Rifle +3 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Trandoshan Mercenary — "Heavy Blaster Rifle +4 (3d10)" — matched "Heavy Blaster Rifle" (weapons-rifles, base 3d12); printed formula "3d10" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: CSA Trooper — "Blaster Rifle +7 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Imperial Army Trooper — "Blaster Rifle +3 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Elite Republic Trooper — "Blaster Rifle +9 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: New Republic Commando — "Blaster Rifle +6 (3d8+2)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+2" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Commando Strike Leader — "Blaster Rifle +7 (3d8+1)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+1" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: CSA Commando — "Blaster Rifle +8 (3d8+4)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+4" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: CompForce Trooper — "Blaster Rifle +6 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Massassi Abomination — "Massassi Lanvarok +11* (1d8+23)" — matched "Massassi Lanvarok" (weapons-exotic, base 3d4); printed formula "1d8+23" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Black Sun Thug — "Blaster Rifle +6 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Elite Senate Guard — "Heavy Blaster Rifle +13 (3d10+3)" — matched "Heavy Blaster Rifle" (weapons-rifles, base 3d12); printed formula "3d10+3" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Elite Senate Guard — "Heavy Blaster Rifle +12 (4d10+3) with Deadeye" — matched "Heavy Blaster Rifle" (weapons-rifles, base 3d12); printed formula "4d10+3" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Core Fleet Commando — "Blaster Rifle +13 (3d8+5)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+5" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Enforcer — "Heavy Blaster Rifle +8 (3d10+2)" — matched "Heavy Blaster Rifle" (weapons-rifles, base 3d12); printed formula "3d10+2" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Rebel Marksman — "Blaster Rifle +7 (3d8+1)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+1" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Commando — "Blaster Rifle +13 (3d8+2)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+2" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Novatrooper — "Blaster Rifle +7 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Galactic Alliance Trooper — "Blaster Rifle +7 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Blackguard Minion — "Blaster Rifle +3 (3d8)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Clone Jet Trooper — "Blaster Rifle +8 (3d8+1)" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "3d8+1" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Clone Jet Trooper — "Blaster Rifle +8 (4d8+1) with Deadeye" — matched "Blaster Rifle" (weapons-rifles, base 3d10); printed formula "4d8+1" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Trandoshan Bounty Hunter — "Heavy Blaster Rifle +5 (3d10+2)" — matched "Heavy Blaster Rifle" (weapons-rifles, base 3d12); printed formula "3d10+2" is not a simple/obvious base or base+delta/base+dice relationship.
- `packs/nonheroic.db` :: Royal Handmaiden — "Sporting Blaster Pistol +6 (3d4+3)" — matched "Sporting Blaster Pistol" (weapons-pistols, base 2d6); printed formula "3d4+3" is not a simple/obvious base or base+delta/base+dice relationship.
- _(271 more rows in this bucket omitted from the Markdown sample; see the JSON report for the full list.)_
