# Phase 3D — Weapon Canonical Authority: Global Verification and Freeze

Status: **WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN**. Authority-only. Production mutation is **not** authorized. `packs/weapons.db` and `template.json` are unchanged (SHA-256 `70bd1216ef51…` / `3ba287ec84f8…`).

Built by `tools/build-item-weapons-phase-3d-global-freeze.mjs` (`--check` proves byte-stability). Every figure below is recomputed from the committed Phase 1/2/3A/3B/3C artifacts and the live production pack; the builder throws on drift.

## Frozen counts

| Item | Count |
| --- | ---: |
| Certified source claims | 209 |
| Canonical identities | 203 (197 one-claim, 6 two-claim = the six 3A cross-publication identities) |
| Repo present / missing identities | 151 / 52 |
| 3C dispositions | CREATE 52, UPDATE 149, MERGE 2, KEEP 0, RENAME-only 0, REVIEW_PRECEDENCE 0 |
| Live weapon records covered exactly once | 186 (151 canonical-mapped + 35 repo-only) |
| Repo-only cleanup records | 35 (2 MERGE_INTO_CANONICAL, 33 REMOVE_UNSUPPORTED), all 35 dependency-gated, none executed |
| Non-weapon records in `packs/weapons.db` (out of scope, 0-3G) | 4 |
| Source-unresolved fields | 25 across 21 identities |
| Unresolved cross-publication contradictions | 0 |
| Schema-gap capability groups | 26 |

Traceability: each of the 209 claims is joined Phase 1 text -> Phase 2 mechanics -> v2.9 ammo overlay -> Phase 3B identity -> Phase 3C disposition (see `claimTrace` in the JSON, with SHA-256 per link). Identity keys are unchanged through 3C and the freeze.

## Combat Gloves Table 8-3 visual check

Status: **CONFIRMED_WEARER_SIZE**.

Evidence: Core Rulebook printed p.123, Table 8-3: Melee Weapons Continued, section UNARMED:

- Unarmed, Small character: Combat gloves — 150 cr / +1 / 0.4 kg
- Unarmed, Medium character: Combat gloves — 250 cr / +1 / 0.5 kg

Visual primary-source verification supplied by the planner. Rows are keyed to character/wearer size, not weapon-size headings; the p.121 Human -> Tiny example is consistent. variantsByWearerSize and sizeRule two_sizes_smaller_than_wearer are correct; no Phase 2A/3B/3C correction is required. Current representation: variantsByWearerSize: Small 150 cr / 0.4 kg, Medium 250 cr / 0.5 kg (sizeRule two_sizes_smaller_than_wearer). Shockboxing Gloves: Unchanged: wearer-size interpretation previously confirmed.

## Cleanup gates (all blocked pending migration, none executed)

| Repo record | Disposition | Target | References (files / total) |
| --- | --- | --- | --- |
| `lightsaber-chassis-double` | MERGE_INTO_CANONICAL | `weapon-double-bladed-lightsaber` | 4 / 7 |
| `lightsaber-chassis-standard` | MERGE_INTO_CANONICAL | `weapon-lightsaber` | 6 / 10 |
| `weapon-blast-cannon` | REMOVE_UNSUPPORTED | — | 7 / 13 |
| `weapon-charric` | REMOVE_UNSUPPORTED | — | 3 / 7 |
| `weapon-clone-dc15a-blaster-rifle` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-clone-dc15s-blaster-carbine` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-concussion-missile-launcher` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-cortosis-sword` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-electro-net` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-electro-whip` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-heavy-laser-cannon` | REMOVE_UNSUPPORTED | — | 6 / 12 |
| `weapon-hh-15-projectile-launcher` | REMOVE_UNSUPPORTED | — | 5 / 7 |
| `weapon-hold-out-blaster` | REMOVE_UNSUPPORTED | — | 9 / 25 |
| `weapon-ion-blaster` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-jedi-training-saber` | REMOVE_UNSUPPORTED | — | 4 / 7 |
| `weapon-laser-cannon` | REMOVE_UNSUPPORTED | — | 12 / 167 |
| `weapon-mandalorian-ripper` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-miniature-missile-launcher` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-monomolecular-knife` | REMOVE_UNSUPPORTED | — | 4 / 7 |
| `weapon-proton-torpedo-launcher` | REMOVE_UNSUPPORTED | — | 8 / 11 |
| `weapon-repeating-blaster` | REMOVE_UNSUPPORTED | — | 3 / 7 |
| `weapon-s-5-heavy-blaster-pistol` | REMOVE_UNSUPPORTED | — | 5 / 11 |
| `weapon-saberdart-launcher` | REMOVE_UNSUPPORTED | — | 5 / 9 |
| `weapon-sith-tremor-sword` | REMOVE_UNSUPPORTED | — | 9 / 26 |
| `weapon-sniper-rifle` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-stealth-blaster-carbine` | REMOVE_UNSUPPORTED | — | 8 / 20 |
| `weapon-stealth-carbine` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-trandoshan-repeater-rifle` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-tusken-cycler-rifle` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-verpine-shatter-pistol` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-verpine-shatter-rifle` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-verpine-sniper-rifle` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-wrist-laser` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-zabrak-combat-staff` | REMOVE_UNSUPPORTED | — | 3 / 6 |
| `weapon-zeltron-neural-whip` | REMOVE_UNSUPPORTED | — | 3 / 6 |

Vehicle/starship terms removed only from the character-weapon corpus are not a deletion from any future vehicle domain.

## Source-unresolved fields (production values may never become canonical)

- **Retrosaber** `canonicalStats.availability` — The certified sources publish no availability.
- **Retrosaber** `canonicalStats.costCredits` — The certified sources publish no cost.
- **Retrosaber** `canonicalStats.weightKg` — The certified sources publish no weight.
- **Czerka Adventurer** `canonicalStats.ammo` — slug ammunition capacity not specified by this book
- **Squib Battering Ram** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Bowcaster** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Bowcaster** `canonicalStats.range.profileId` — Core establishes Exotic identity, Wookiee rifle-proficiency substitution, ammunition and Accurate (errata) but does not assign the Bowcaster to a Table 8-5 range row; proficiency substitution is not range classification. Any rifles fallback is implementation policy, not canonical source fact.
- **CR-1 Blast Cannon** `canonicalStats.ammo` — This source claim does not establish a separate ammunition type/capacity in the certified authority.
- **Darter** `canonicalStats.ammo` — Description establishes dart + compressed-air delivery but does not publish magazine/canister shot capacity.
- **BlasTech DH-23 Outback Blaster Pistol** `canonicalStats.ammo` — ammunition source/capacity not specified by this book
- **BlasTech DLT-20A "Longbarrel" Blaster Rifle** `canonicalStats.ammo` — ammunition source/capacity not specified by this book
- **BlasTech DT-12 Heavy Blaster Pistol** `canonicalStats.ammo` — ammunition source/capacity not specified by this book
- **E-Web Repeating Blaster** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Electronet** `canonicalStats.range.profileId` — Electronet is ammunition that can only be fired from a grenade launcher; range is inherited from the launcher.
- **SoroSuub Firelance Blaster Rifle** `canonicalStats.ammo` — ammunition source/capacity not specified by this book
- **Electropole** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Light Concussion Missile Launcher** `canonicalStats.ammo` — Threats p.134 establishes one missile consumed per attack and the missile stat line, but does not state launcher loaded capacity or reload action.
- **Merr-Sonn Model 434 DeathHammer** `canonicalStats.ammo` — ammunition source/capacity not specified by this book
- **Neural Inhibitor** `canonicalStats.ammo` — Weapon is described as powered; ammunition/power capacity is not specified by this book.
- **Neural Inhibitor** `canonicalStats.range.profileId` — Book establishes Inaccurate but does not assign a pistol/rifle/heavy numeric range profile.
- **Sling** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Sonic Stunner** `canonicalStats.ammo` — Threats p.146 publishes no ammunition type, power source, shot capacity, or reload procedure for the Sonic Stunner.
- **Tactical Tractor Beam** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Targeting Laser** `canonicalStats.ammo` — Ammunition/power type is source-certified; loaded shot capacity is not stated by this source claim.
- **Wrist Rocket Launcher** `canonicalStats.range.profileId` — range-profile-not-specified-in-book

## Schema-gap inventory

| Capability | Identities | Production representation | Future V2 schema capability |
| --- | ---: | --- | --- |
| ammo-profiles | 4 | Production ammunition is one type/max pair. | Support multiple independent ammunition profiles. |
| area-geometry | 33 | Production has no structured area geometry. | Add area geometry per attack profile. |
| conditional-damage-and-qualities | 11 | Production has no conditional damage profile or conditional quality structures. | Add conditional damage/quality structures. |
| conditional-modifiers | 13 | Production has no conditional attack/damage modifier structures. | Add conditional modifier structures. |
| configuration-and-state | 10 | Production has no configuration/state-machine structures. | Add configuration/state structures. |
| construction-and-technology | 24 | Production has no construction/technology/delivery/durability/accessory structures. | Add those structures. |
| critical-effects | 3 | Production has no critical-effect structures. | Add critical effect structures. |
| damage-multiplier-and-range-rules | 3 | Production has no damage multiplier or conditional range rule structures. | Add those structures. |
| defensive-interactions | 7 | Production has no defensive-interaction structures. | Add defensive interaction structures. |
| firing-constraints | 27 | Production has no firing-constraint or prepared-attack structures. | Add firing constraint structures. |
| multi-type-damage | 71 | Production damageType is one string. | Support AND/OR/qualified/unspecified damage types. |
| multiple-attack-profiles | 36 | Production has one attack (one damage/range/quality set); canonical identities may carry several profiles or modes. | Add attack/mode profile structures. |
| non-dice-damage-model | 24 | Production damage is a single dice string. | Support none/special/modifier/inherited/alternate damage modes. |
| operating-resource-model | 46 | Production has no operating-resource (energy cell etc.) model for non-ammunition power. | Add operating resource structures. |
| payload-derived-damage | 9 | Production stores a launcher damage string; canonical launcher damage is owned by the loaded payload. | Resolve damage through payload profiles. |
| payload-profiles | 12 | Production has no delivery-system/payload separation. | Add payload profiles and a loaded-ammo reference model. |
| proficiency-rules | 10 | Production has one proficiency value. | Add conditional proficiency rule structures. |
| quality-parameters | 41 | Production traits are labels without parameters. | Add quality parameter structures (allowed bands, overrides). |
| range-band-restrictions | 34 | Production has a range profile only; no allowed bands, fixed maximum or cone/area range rules. | Add range restriction structures. |
| size-variant-pricing | 3 | Production has one cost/weight; canonical identity varies by size. | Add size-variant pricing structures. |
| structured-special-rules | 157 | Canonical operation rules (free-form source mechanics) have no production structure. | Add structured special-rule storage. |
| stun-model | 55 | Production has no stun setting / native stun model. | Add stun setting and native-stun structures. |
| summary-field | 203 | No production slot for the derived short player summary. | Add a summary field (or flag) to the weapon item schema. |
| triggered-effects | 17 | Production has no triggered-effect structures. | Add triggered effect structures. |
| weapon-size-field | 199 | Production weapons carry no weapon size. | Add a weapon size field. |
| wielding-rules | 15 | Production has no wielding/handedness rule structures. | Add wielding rule structures. |

Canonical authority already carries every capability above (3B, schema v2.9); the gap is in the production representation only.

## Inputs

- phase1WeaponsContent: `1cc37b41db8dba9579a025edc36d621e334ebc77ee742214a8b7d0d07d95be13`
- ammoOverlay: `1f319a7df3ab2ee71043743bce033b75a4bbb600ec27553c7ecb9f8d48aba65c`
- phase3a: `ed6adc356caa25371d5600ea6f104bfef9fb449dec7a015f9d2724cc32bd0222`
- phase3b: `5466e8a539918fba382368c6b73a2ae8a6f47472f4d2f35a72b39457135a7d56`
- phase3c: `1e748665c4f27278b9be10abddacf0d5cdcea20cffc308714955cbe19a352c60`
- phase01Weapons: `8082703831caf7f6a1679cbd3f6df4b5e88eb776a0e85d4c941be4af93d39d6b`
