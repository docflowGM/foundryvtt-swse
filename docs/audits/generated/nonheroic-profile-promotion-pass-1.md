# Nonheroic Profile Promotion -- Pass 1

Generated: 2026-07-14T16:09:13.501Z
Mode: write
Result: OK

This is a conservative, allowlist-driven promotion of reviewed Lane A
candidates into a staged canonical profile file. It never bulk-promotes
all Lane A rows -- only the exact rows named in the allowlist file are
eligible, and only if they resolve to exactly one candidate with an
allowed status. All promoted records keep `confidence: "manualRequired"`.

## Summary

- Allowlist file: `data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-1.json` (10 entries, cap 10)
- Target profile file: `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json`
- Candidate pool size: 1556
- Existing profile records scanned for already-covered check: 67
- Write outcome: no-new-records
- Promoted: 0
- Skipped (already covered): 10
- Errors: 0

## Per-entry results

- **skipped-already-covered** — Heavy Blaster Pistol +5 (3d8) [Goon, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "goon-heavy-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Hold-Out Blaster Pistol +1 (3d4) [Imperial Informant, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "imperial-informant-hold-out-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Blaster Carbine +5 (3d8) [Medic, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "medic-blaster-carbine" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Blaster Pistol +5 (3d6) [Scout Trooper, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "scout-trooper-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Vibrodagger +2 (2d4) [Peace Brigade Thug, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "peace-brigade-thug-vibrodagger" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Blaster Pistol +4 (3d6) [Ugnaught Worker, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "ugnaught-worker-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Blaster Carbine +6 (3d8) [CSA Security Guard, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "csa-security-guard-blaster-carbine" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Heavy Blaster Pistol +6 (3d8) [Black Sun Thug, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "black-sun-thug-heavy-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Vibrodagger +3 (2d4) [Swoop Gang Member, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "swoop-gang-member-vibrodagger" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
- **skipped-already-covered** — Hold-Out Blaster Pistol +8 (3d4) [Sith Spy, data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, safe-ordinary-weapon-candidate] — matches existing profile record "sith-spy-hold-out-blaster-pistol" in data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json

## Excluded statuses (never promoted by this tool)

- `ordinary-weapon-special-mode`
- `area-autofire-grenade-special`
- `rider-or-condition`
- `formula-unclear`
- `natural-or-unarmed`
- `no-compendium-match`
- `ambiguous-compendium-match`
- `already-profiled`
