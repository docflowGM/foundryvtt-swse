# SWSE droid ERRATA-SGD-HOST-002 — Source host and corrected weight scope

**Reviewed:** November 3, 2026. **Scope:** 15 previously pending identities in *Scavenger's Guide to Droids*. **Authority:** Original supplied SGD PDF, printed p51 (chassis vs possessions), pp52, 54–62 (component descriptions and Tables 3-1/3-2), plus the official Wizards of the Coast *Saga Edition Errata and Official Clarifications* correction to Core p186.

Machine source: `data/audits/droids/droid-component-sgd-errata-host-002.json`. Numeric acceptance expectations: `data/audits/droids/droid-component-sgd-errata-host-002-fixtures.json`. Reproducible validator: `tools/audits/droids/verify_droid_component_sgd_errata_host_002.mjs`.

## Results

**15/15 host/scope reviews completed.** Ten items are source-supported droid-integrated accessories to which the official Small-or-smaller accessory-weight correction applies; three remain **Locomotion** by the SGD printed classification and do not get relabeled as accessories; two retain a host/variant-specific **HOLD**. This closes the *review task*, not the remaining two source-scope questions.

| Identity | SGD table class | Physical host / ownership | Errata-weight decision | Small example mass |
|---|---|---|---|---|
| Burrower Drive | LOCOMOTION | INTEGRATED LOCOMOTION DRIVE | Locomotion; retain printed size factor | 100 kg |
| Gyroscopic Stabilizers | LOCOMOTION | INTEGRATED LOCOMOTION STABILITY | Locomotion; retain printed size factor | 8 kg |
| Underwater Drive | LOCOMOTION | INTEGRATED SWIM DRIVE | Locomotion; retain printed size factor | 20 kg |
| Laminanium Plating | ARMOR | CHASSIS BUILT IN ARMOR | Apply to integrated accessory | 15 kg |
| Collapsible Construction | ACCESSORY | CHASSIS INTEGRATED FRAME | Apply to integrated accessory | 10 kg |
| Courier Compartments | ACCESSORY | CHASSIS EMBEDDED STORAGE | Apply to integrated accessory | 2 kg |
| Electric Defense Grid | ACCESSORY | ARMOR OR OUTER SHELL INSTALLED GRID | Apply to integrated accessory | 100 kg |
| Hidden Holster | ACCESSORY | EMBEDDED LEG HOUSING | Apply to integrated accessory | 2 kg |
| Holographic Image Disguiser | ACCESSORY | CHASSIS PROCESSOR AND PROJECTORS | Apply to integrated accessory | 20 kg |
| Internal Defenses | ACCESSORY | CHASSIS ACCESS PANEL DEFENSES | Apply to integrated accessory | 1 kg |
| Internal Grapple Gun | ACCESSORY | CHASSIS INTERNAL GRAPPLE REEL | Apply to integrated accessory | 2 kg |
| Radiant Heat Element | ACCESSORY | TORSO INTEGRATED HEATER | Apply to integrated accessory | 20 kg |
| Silence-Bubble Generator | ACCESSORY | DROID CENTERED GENERATOR HOUSING UNSPECIFIED | Hold pending host/variant proof | HOLD |
| Shield Expansion Module | SHIELD_GENERATOR | CHASSIS INSTALLED SHIELD PROJECTOR | Apply to integrated accessory | 10 kg |
| Micro Shield | ACCESSORY | APPENDAGE ATTACHED OR HANDHELD | Hold pending host/variant proof | HOLD |

For a factor-multiplied droid accessory:
- **Credits:** unchanged published size cost factor (Fine 20, Diminutive 10, Tiny 5, Small 2, Medium 1, Large 2, Huge 5, Gargantuan 10, Colossal 20).
- **Weight:** Fine ×0.1, Diminutive ×0.2, Tiny ×0.4, Small ×1, Medium ×1, Large ×2, Huge ×5, Gargantuan ×10, Colossal ×20. These come from official Core errata's `2 / cost factor` for Small and smaller.
- **Flat listed masses:** unchanged. **Unlisted weights:** remain unlisted.
- **Initial chassis systems excluded from starting carrying-capacity computation:** separate official errata rule; do not confuse this with the physical weight of a post-creation modification.

## Corrected source examples

| Configuration | Printed credit rule | Correct source mass |
|---|---:|---:|
| Small Shield Expansion Module, SR5 | 50 × 5 × 2 = **500 cr** | 2 × 5 × 1 = **10 kg** |
| Small Electric Defense Grid | 3,000 × 2 = **6,000 cr** | 100 × 1 = **100 kg** |
| Tiny Courier Compartments | **200 cr flat** | 2 × (2 ÷ 5) = **0.8 kg** |
| Small Underwater Drive | 20 × 2 × selected speed² | 10 × 2 = **20 kg** (locomotion, not accessory) |

The corresponding old direct-factor mass for a Small SR5 expansion module was 20kg, which is not the corrected **accessory** mass. These are formula expectations, **not** evidence of completed transactions or eligible installation in every size. The expansion module itself requires a Small-or-larger droid with a fitted shield generator.

## Two unresolved cases (remain fail-closed)

**Silence-Bubble Generator.** The SGD accessory table lists 3,500cr and 20 × size factor kg. The narrative specifies a droid-centered three-square bubble but does not identify a physical mounting location. If installed as a qualifying droid accessory on a Small droid, the errata-weight result would be 20kg; applying the literal uncorrected factor would produce 40kg. The source does not prove that all offered generators are chassis-integrated. Do **not** promote either interpretation to a universal quote until host ownership/installation is resolved.

**Micro Shield.** The source explicitly describes an appendage-attached model and a distinct handheld model for 400cr. Under SGD p51, equipment merely attached to an appendage or carried is a possession, not a chassis-integrated droid system. The table's installed-model mass is 10 × factor, but the handheld version's separate mass is not printed. Applying the corrected accessory factor to the possession variant requires a separate category/host determination. Do **not** insert either variant into `system.installedSystems` automatically, sell the handheld model with guessed installed-model weight, or interpret the table's unspecified variant as all configurations.

## Cross-application acceptance

The packet supplies **119 source-value specifications**: 108 accessory variant-and-size arithmetic cases, nine three-size locomotion cases, and two deliberately blocked-host cases. None was executed against the Garage, PC chargen, follower builder, Store, actor persistence, or Foundry V13.

The independent Node validator verifies all 15 frozen source identities, matches the 15 names in official errata's pending-SGD work queue, checks the 10/3/2 classification split, validates printed page mappings, and checks 119 fixtures against independent base inputs. It remains a *repository structural validator*; GitHub source readback is not a substitute for actually running Node or Foundry.

**Existing certification ledger:** 122 identities reviewed; 99 historical base-book PASS, 23 source-mechanical HOLD, 0 production/application/Foundry certifications. **No existing HOLD was promoted** by this host/weight classification. The historical 99 must still be interpreted through the official errata precedence layer.

**Next:** Apply the now-authoritative cost and weight paths in a separately approved V2 migration, with physical host permissions and carried-versus-installed ledger segregation; then test exact quote/debit/rollback across Garage, PC chargen, follower builder, Store, and Foundry. Meanwhile resolve the two host/variant questions with printed supplementary authority, without guessing.
