# Nonheroic Profile Promotion -- Pass 1

Generated: 2026-07-14T16:46:45.803Z
Mode: write
Result: OK

This is a conservative, allowlist-driven promotion of reviewed Lane A
candidates into a staged canonical profile file. It never bulk-promotes
all Lane A rows -- only the exact rows named in the allowlist file are
eligible, and only if they resolve to exactly one candidate with an
allowed status. All promoted records keep `confidence: "manualRequired"`.

## Summary

- Allowlist file: `data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-2.json` (25 entries, cap 25)
- Target profile file: `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json`
- Candidate pool size: 1556
- Existing profile records scanned for already-covered check: 92
- Write outcome: no-new-records
- Promoted: 0
- Skipped (already covered): 25
- Errors: 0

## Per-entry results

- **skipped-already-covered** — Blaster Pistol +3 (3d6) [Imperial Army Trooper, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "imperial-army-trooper-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Pistol +6 (3d6) [Clone Naval Officer, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "clone-naval-officer-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Pistol +8 (3d6) [Elite Republic Trooper, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "elite-republic-trooper-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Pistol +7 (3d6+3) [Krath Commander, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "krath-commander-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Pistol +9 (3d6+4) [Notorious Outlaw, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "notorious-outlaw-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Pistol +5 (3d6+2) [Imperial Detention Guard, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "imperial-detention-guard-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Heavy Blaster Pistol +6 (3d8) [CompForce Trooper, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "compforce-trooper-heavy-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Heavy Blaster Pistol +4 (3d8) [Ugnaught Rigger, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "ugnaught-rigger-heavy-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Heavy Blaster Pistol +8 (3d8+3) [Black Sun Lieutenant, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "black-sun-lieutenant-heavy-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Heavy Blaster Pistol +12 (3d8+4) [Imperial Royal Guard, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "imperial-royal-guard-heavy-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Hold-Out Blaster Pistol +4 (3d4) [Devaronian Drifter, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "devaronian-drifter-hold-out-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Hold-Out Blaster Pistol +1 (3d4) [Rebel Cell Member, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "rebel-cell-member-hold-out-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Hold-Out Blaster Pistol +4 (3d4+1) [Con Artist, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "con-artist-hold-out-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Carbine +4 (3d8) [Brute, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "brute-blaster-carbine" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Carbine +2 (3d8) [Stormtrooper Recruit, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "stormtrooper-recruit-blaster-carbine" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Blaster Carbine +10 (3d8+2) [Clone Shadow Trooper, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "clone-shadow-trooper-blaster-carbine" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Vibrodagger +1 (2d4+5) [Bothan Spy, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "bothan-spy-vibrodagger" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Vibrodagger +18 (2d4+15) [Trandoshan Marauder, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "trandoshan-marauder-vibrodagger" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Vibrodagger +12 (2d4+4) [Commando, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "commando-vibrodagger" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Vibroblade +4 (2d6) [Soldier, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "soldier-vibroblade" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Vibroblade +5 (2d6+3) [Theelin Bodyguard, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "theelin-bodyguard-vibroblade" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Vibroblade +10 (2d6+4) [Red Fury Pirate, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "red-fury-pirate-vibroblade" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Bowcaster +6 (3d10) [Wookiee Warrior, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "wookiee-warrior-bowcaster" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Bowcaster +3 (3d10+1) [Wookiee Slaver, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-with-delta] — matches existing profile record "wookiee-slaver-bowcaster" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json
- **skipped-already-covered** — Sonic Rifle +2 (2d8) [Geonosian Warrior, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "geonosian-warrior-sonic-rifle" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json

## Excluded statuses (never promoted by this tool)

- `ordinary-weapon-special-mode`
- `area-autofire-grenade-special`
- `rider-or-condition`
- `formula-unclear`
- `natural-or-unarmed`
- `no-compendium-match`
- `ambiguous-compendium-match`
- `already-profiled`
