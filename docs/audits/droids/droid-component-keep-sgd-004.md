# Droid component KEEP-004 — Scavenger's Guide source rules

**Date:** November 2, 2026. **Branch:** `audit/droid-publication-census-2026-10-29`. **Scope:** twelve existing component rule records from printed pp. 52-60 (PDF pages 53-61), including Table 3-2. Source read through rendered PDF images; OCR served as navigation only. **No production implementation authorized.**

Machine packet: `data/audits/droids/component-keep-source-facts-sgd-004.json`.

## Source facts and catalog presence

| Published component | Printed page(s) | Price | Weight | Availability | Repository layer |
|---|---|---|---|---|---|
| Gyroscopic Stabilizers | 52, 59 | 2 * costFactor * speedSquares^2 | 4 * costFactor kg | - | RAW_AND_OVERLAY |
| Magnetic Hands | 52, 59 | 2 * selected appendage cost | 2 * costFactor kg | - | RAW_AND_OVERLAY |
| Quick-Release Coupling | 52, 53, 59 | tool 10*CF; appendage 50*CF | tool 2*CF kg; appendage 5*CF kg | - | RAW_ONLY |
| Remote Limb Control | 53, 59 | prose basic 1500 / deluxe 6000; table 2 * appendage cost | table dash (weight not specified) | Restricted | RAW_ONLY |
| Rocket Arm | 53, 59 | prose 2000; table 4 * appendage cost | 2 * costFactor kg | Illegal | RAW_AND_OVERLAY |
| Specialized Subprocessor | 53, 54, 59 | 1000 | 2 kg | - | RAW_AND_OVERLAY |
| Tactician Battle Computer | 54, 59 | 5000 | 10 kg | Restricted | RAW_AND_OVERLAY |
| Audio Enhancers | 55, 58 | 2000 | 1 kg | - | OVERLAY_ONLY |
| Audio-Radial Stunner | 55, 58 | 5000 | 3 kg | Restricted | OVERLAY_ONLY |
| Automap | 55, 58 | 1000 | 2 kg | - | OVERLAY_ONLY |
| Blaster Recharge Interface | 55, 58 | 300 | 1 kg | Licensed | OVERLAY_ONLY |
| Multifunction Apparatus | 58, 60 | 80 * costFactor | 15 * costFactor kg | - | RAW_AND_OVERLAY |

## High-priority findings

- **Four zero-cost default-path risks:** Audio Enhancers (2,000 credits/1kg), Audio-Radial Stunner (5,000/3kg, Restricted), Automap (1,000/2kg), and Blaster Recharge Interface (300/1kg, Licensed) are overlay-only; no raw cost/weight definitions. The shared default cost/weight helpers can return zero. No completed purchase is claimed.
- **Printed price conflicts:** Remote Limb Control prose gives Basic 1,500 credits and Deluxe 6,000, but Table 3-2 says twice the selected appendage price. Rocket Arm prose gives 2,000 credits, while the table says four times appendage price. Preserve both; hold authoritative quote pending adjudication.
- **Magnetic Hands:** Table price is twice cost of the *selected appendage*; raw system uses 200×cost factor. A Medium Hand costs 50, so the table implies 100 credits versus raw 200 credits. With Magnetic Feet grants +2 Climb and +5 defense against being knocked from a spacecraft hull. Hands cannot attack or manipulate while active.
- **Gyroscopic Stabilizers:** Cost 2×factor×speed² credits, weight 4×factor kg. Raw source implements cost but omits published weight, so default weight can be zero.
- **Tactician Battle Computer:** Table says Restricted, raw says '-' (unrestricted). Requires weapon transceivers; standard-action analysis grants +2 on next eligible ranged attack for Int modifier (minimum 1) allies, expiring at end next ally turn. Use of unmatched weapon disables until DC20 Mechanics.
- **Rocket Arm:** Printed 3d8 detonation with one-square splash; raw separately says 1d8 splash, not supported on reviewed source page. Illegal, DC20 Mechanics to install, failure can cause explosion.

## Mechanical and physical authority

Quick-Release Coupling has Tool (10×factor credits, 2×factor kg) and Appendage (50×factor credits, 5×factor kg) variants. Tool swap takes two standard actions; appendage swap takes two full-round actions. Both pieces must have compatible couplings, and a droid swapping its own parts needs another manipulating appendage. No Mechanics check for coupling exchange.

Remote Limb Control Basic handles one detached limb (up to six-square hover, 24-square control range); Deluxe operates max(1, 1+Int modifier) limbs. The printed weight column is a dash, so raw variant weights are unverified.

Audio Enhancers provides a better-of-two Perception reroll for eavesdropping/distant/ambient listening, not general Perception. Audio-Radial Stunner is standard-action activated and tests each adjacent creature **starting its turn** during the active window against Endurance DC20 for -1 condition step. Automap scans 12 squares but cannot reveal objects behind solid walls or closed doors. Blaster Recharge Interface uses a swift action and costs actual droid HP equal to the blaster's damage die type, such as 8 HP for a 3d8 weapon.

Specialized Subprocessor grants one extra swift per turn only for a chosen skill, maximum one installed. Multifunction Apparatus costs 80×factor credits and 15×factor kg; three mounted tools/weapons maximum, one active, switch via swift action. Raw Tool-only host restriction is not established by inspected paragraph.

## Certification and validation

**12** printed rule rows reviewed, **17** issue groups recorded. Prior source-fact row total 62, now **74** (KEEP track now 47); these counts include variant and previously present records, not unique mechanically certified KEEP identities. There are **zero full mechanical certificates, production migrations, parity tests, and Foundry runtime certifications**.

In-memory structural assertions verified 12 unique identities, all printed/PDF page offsets, four overlay-only price gaps, two price conflicts, and zero certification promotions. A Node validator is included but has not been executed in Foundry or as a local Node test:

```sh
node tools/audits/droids/verify_component_keep_source_facts_sgd_004.mjs
```

Next component batch: remaining SGD accessory, sensor, communications, shield and processor KEEP families. Canonical migration will require a single shared cost authority and explicit physical-host/size/availability/action tests for Garage, PC chargen, follower builder and Store.
