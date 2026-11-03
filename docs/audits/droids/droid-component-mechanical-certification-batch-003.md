# SWSE Droid MECH-003 – Source-Mechanical Evaluation

**25 evaluated:** 17 PASS, 8 HOLD. **Cumulative:** 61/122 source-mechanically certified; 14 total HOLD; 47 not yet mechanically reviewed.

Primary authority: Core Rulebook printed pp. 189, 190, 194, 195, 197 and Scavenger's Guide printed pp. 52–54, 56, 59. Rendered PDF pages inspected; TXT used only for navigation.

| Component | Decision | Printed price | Source issue |
|---|---|---|---|
| Climbing Claws | HOLD | p189: 2x Walking locomotion cost; Table 11-5 p194: 2x appendage cost | Printed prose and table disagree on price base |
| Extra Legs | PASS | 2x selected Walking locomotion price | Source specification complete |
| Jump Servos | HOLD | p189: 2x Walking locomotion cost; Table 11-5: 2x appendage cost | Printed prose and accessory table disagree on cost base |
| Magnetic Feet | HOLD | Table 11-5: 2x appendage cost; referenced appendage not specified | Table uses appendage-based pricing without identifying which appendage belongs to the foot hardware |
| Telescopic Appendage | PASS | 2x actual selected appendage base price | Source specification complete |
| Stabilized Mount | PASS | 5x Tool appendage cost | Source specification complete |
| Spring-Loaded Mechanism | PASS | 150 credits | Source specification complete |
| Locked Access | PASS | 50 credits | Source specification complete |
| Translator Unit | PASS | Select one of 4 source DC variants | Source specification complete |
| Burrower Drive | HOLD | 200 * Core size factor * chosen speed squared | Tiny and smaller have no published self-destruct collateral damage dice, so drill attack damage is unquantified for those sizes |
| Gyroscopic Stabilizers | PASS | 2 * size factor * selected speed squared | Source specification complete |
| Underwater Drive | PASS | 20 * size factor * selected speed squared | Source specification complete |
| Magnetic Hands | PASS | 2 * actual selected appendage cost | Source specification complete |
| Projectile Hand | HOLD | p52 250cr install; Table 3-2 p59 2x appendage cost | 250cr description and double appendage-cost table contradict for some chosen appendages |
| Quick-Release Coupling | PASS | Tool 10*factor; appendage 50*factor | Source specification complete |
| Remote Limb Control | HOLD | p53 basic 1500cr/deluxe 6000cr; table appendage cost x2 | Prose prices differ from table appendage-based price, and table does not specify basic/deluxe distinction |
| Rocket Arm | HOLD | p53 2000cr; Table 3-2 4x selected appendage cost | Printed 2000cr fixed price conflicts with four-times-appendage table |
| Droid Remote Control | PASS | 500 credits | Source specification complete |
| Hidden Core | PASS | 200cr standard, 400cr enhanced | Source specification complete |
| Personality Downloader | HOLD | Custom build 5000+ credits; exact price unspecified | Custom item has published minimum price/weight, not exact price or mass for a configured sale |
| Specialized Subprocessor | PASS | 1000 credits | Source specification complete |
| Tactician Battle Computer | PASS | 5000 credits | Source specification complete |
| Laminanium Plating | PASS | Light 3000*factor; heavy 20000*factor | Source specification complete |
| Communications Countermeasure System | PASS | 1000 credits | Source specification complete |
| Communications Jammer | PASS | 5000 credits | Source specification complete |

## Certification boundaries

PASS certifies the published rule specification, including legal hosts, selected price variants, action/resource timing and explicit unlisted weights. It does not assert correct Garage, character creation, follower, Store or Foundry implementation. HOLD retains published facts without guessing conflicting prices or undefined damage for a size.

## Source conflicts

Climbing Claws and Jump Servos: Core prose doubles Walking locomotion cost while Table 11-5 doubles appendage cost. Magnetic Feet: Table 11-5 gives an unspecified appendage cost as base. Projectile Hand, Remote Limb Control and Rocket Arm: SGD descriptive prices conflict with Table 3-2. Burrower Drive: Tiny and smaller Self-Destruct collateral damage dice undefined. Personality Downloader: custom minimum 5,000+ credits and 2+kg, no exact build price.

## Production defects preserved

Stabilized Mount raw price/weight mismatch; Telescopic selected-appendage callback mismatch; Magnetic Hands fixed vs selected appendage pricing; Tactician availability incorrectly unrestricted; separate Portable or External tools must not become droid chassis systems by default. No production code was edited.

## Verification

Machine JSON packet, separate independent fixture expectations, ledger delta and executable validator included. Standalone validator is run locally on these files. GitHub publication requires a separate successful connector write and exact branch readback.
