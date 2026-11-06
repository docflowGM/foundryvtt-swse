# SWSE Droid Component Source-Mechanical Review — Batch 004

**2026-11-02** · 25 distinct SGD source identities · **18 PASS / 7 HOLD**

Source: original *Scavenger's Guide to Droids* PDF, printed pp.55–61 and Table 3-2 (p.58); pages rendered and visually reviewed. TXT used only for navigation. **No production changes, app parity testing, or Foundry runtime testing.**

## Per-component decisions

| Component | Decision | Printed price and physical mass |
|---|---|---|
| Remote Receiver Jammer | HOLD | 2000 credits |
| Remote Receiver Signal Booster | HOLD | 500 credits |
| Antitheft Comlink Locator | PASS | 100 credits |
| Audio Enhancers | PASS | 2000 credits |
| Audio-Radial Stunner | PASS | 5000 credits |
| Automap | PASS | 1000 credits |
| Blaster Recharge Interface | PASS | 300 credits |
| Collapsible Construction | PASS | 2000 × cost factor |
| Concealed Item | HOLD | See text, unresolved host/item combination |
| Courier Compartments | PASS | 200 credits |
| Droid Oil Bath | HOLD | Table: 500; description: variable by size |
| Earphone Binary-to-Basic Translator | HOLD | Basic: 20 cr; earbud price unlisted |
| Electric Defense Grid | PASS | 3000 × cost factor |
| Emergency Oxygen Supply | HOLD | 200 credits |
| Hidden Holster | PASS | 500 × cost factor |
| High-Speed Cutting Torch and Welder | PASS | 2500 credits |
| Holographic Game System | PASS | 300 credits |
| Holographic Image Disguiser | PASS | 20,000 × factor; advanced double |
| ID Dodge | PASS | 5000 credits |
| Improved Coordination Circuitry | PASS | 1000 credits |
| Interference Generator | HOLD | Basic: 2,500 cr; deluxe unlisted |
| Internal Defenses | PASS | 10 × cost factor |
| Internal Grapple Gun | PASS | 100 × cost factor |
| Mesh Tape Dispenser | PASS | 10 × factor |
| Micro Shield | PASS | Installed 600 × factor; handheld 400 cr |

## Seven explicit source holds

- **Remote Receiver Jammer:** Narrative says extremely short range but gives no numerical maximum, preventing deterministic range eligibility.
- **Remote Receiver Signal Booster:** Printed 50% passive extension and up-to-100% temporary extension lack explicit combination/precedence.
- **Concealed Item:** The composite cost expression has ambiguous multiplication grouping and may be adjusted by the GM; exact host/item price not certified.
- **Droid Oil Bath:** Printed Table 3-2 500-credit price conflicts with 100/1,000/5,000/10,000 size-price tiers in prose. External ownership also must be respected.
- **Earphone Binary-to-Basic Translator:** Text describes more expensive earbud version but prints no price or differentiated mass for that version.
- **Emergency Oxygen Supply:** Table 3-2 weight cell prints 20 without mass unit, and prose does not clarify. Cannot certify physical mass or burden.
- **Interference Generator:** Deluxe model expands protection to video/holo but does not have separately printed price/weight; no typed purchasable deluxe variant certified.

## Notable source-mechanical requirements

- **Audio-Radial Stunner:** Standard action; DC20 Endurance applies to each creature *starting* its turn adjacent through end of droid’s next turn. Not instant area stun.
- **Blaster Recharge Interface:** Swift action consumes droid HP equal to blaster damage die type (3d8 requires 8 HP), not a free recharge.
- **Collapsible Construction:** Shrinks one size category only *when shut down*; standard action reactivates.
- **Courier Compartments:** Torso accommodates 3 sizes smaller, arm/leg 4, head 5. Concealment DC equals droid Will+5; optional destructive toaster doubles compartment price.
- **Electric Defense Grid:** Automatic 5 energy damage only to qualifying damaging melee attackers; energy-based melee weapons exempt.
- **Hidden Holster:** Leg mount, weapon smaller than droid, BAB+1 for swift Quick Draw benefit; holster opens as free action.
- **High-Speed Torch:** Medium+ host, 500kg; 4d10 at 1 square; object DR/DT reduction only after two consecutive rounds.
- **Holographic Game System:** 15 initial games, DC15 Use Computer to add 10; separate holographic projector required.
- **Improved Coordination:** Matching keyed skill circuit and trained acting droid; successful Aid Another is +4 **total**.
- **Internal Defenses:** DC Fortitude reactive attack 1d20+5, 1d8 + half heroic level, maximum ten attack uses, disable DC25 Mechanics/one hour.
- **Micro Shield:** Installed vs handheld must be separate purchasable variants; swift +1 equipment Reflex, handheld requires energy cell for one hour.

## Checkpoint arithmetic

| Batch | Reviewed | PASS | HOLD |
|---|---:|---:|---:|
| 001 | 25 | 25 | 0 |
| 002 | 25 | 19 | 6 |
| 003 (local, not yet committed) | 25 | 17 | 8 |
| 004 (this local bundle) | 25 | 18 | 7 |
| **Combined after applying both** | **100** | **79** | **21** |

22 of the 122 identities remain without a full mechanical review; **43 not yet fully mechanically certified** (21 holds plus 22 unreviewed). The existing remote repository ledger remains at Batch 002 until pending batches are applied.

## Verification scope

Checks cover 25 unique canonical IDs, eight source dimensions, page offsets, prices and weights including printed omissions, and PASS/HOLD separation. Run `node tools/audits/droids/verify_component_mechanical_batch_004.mjs`.
No script, compendium, actor data, Garage, Store, chargen or follower runtime changes are authorized by these source certificates. Source-lawful installation and purchase exceptions require later actual app tests.
