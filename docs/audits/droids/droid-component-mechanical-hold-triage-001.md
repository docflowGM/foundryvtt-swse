# Droid component mechanical HOLD adjudication — HOLD-001

**Date:** 2026-11-02. **Scope:** All 23 unresolved source-mechanical HOLD decisions in the 122-identity Core + SGD census. **Official rules precedence:** the Wizards of the Coast *Saga Edition Errata and Official Clarifications* must override original Core text; see `data/audits/droids/droid-component-official-errata-authority-001.json`.

## Result

**23 cases triaged, 0 promoted, 0 production code changed.** The triage separates *what printed facts are already usable in restricted configurations* from *what still lacks an authoritative numeric or action rule*. A partial usable configuration is not a full source mechanical certificate and is never permission to silently sell a conflicting variant.

| # | Component | Blocking class | Safe source-defined subset | Needed to clear HOLD |
|---:|---|---|---|---|
| 1 | Walking | PRICE_COMPOSITION | base locomotion first-system can use size-factor times speed squared; restricted additional-system combination not certified | Need published precedence or documented GM choice for restricted + nth-system surcharge |
| 2 | Wheeled | PRICE_COMPOSITION | unrestricted first system normal price is defined | Need published precedence or documented GM choice for restricted + nth-system surcharge |
| 3 | Tracked | PRICE_COMPOSITION | unrestricted first system normal price is defined | Need published precedence or documented GM choice for restricted + nth-system surcharge |
| 4 | Hovering | PRICE_COMPOSITION | unrestricted first system normal price is defined | Need published precedence or documented GM choice for restricted + nth-system surcharge |
| 5 | Flying | PRICE_COMPOSITION | unrestricted first system normal price is defined | Need published precedence or documented GM choice for restricted + nth-system surcharge |
| 6 | Self-Destruct System | SIZE_UNDEFINED | Small and larger printed blast-dice cases have defined maximum-damage-based price | Need canonical treatment for Tiny, Diminutive and Fine: no collateral damage dice printed |
| 7 | Climbing Claws | PROSE_TABLE_PRICE_CONFLICT | Movement effect and Walking prerequisite verified; purchasing quote remains blocked | Decide whether Core p189 descriptive Walking multiplier supersedes Table 11-5 appendage multiplier |
| 8 | Jump Servos | PROSE_TABLE_PRICE_CONFLICT | Jump effects and Walking prerequisite verified; quote blocked | Decide precedence of Core p189 Walking cost vs Table 11-5 appendage cost |
| 9 | Magnetic Feet | REFERENCE_BASE_UNSPECIFIED | Magnetic hull adhesion and eligible locomotion are defined; purchase price unresolved | Identify what appendage Table 11-5 means or published alternate price authority |
| 10 | Burrower Drive | SIZE_DEPENDENT_EFFECT_UNDEFINED | Small and larger drill damage can reference their self-destruct dice | Need Tiny/Diminutive/Fine drill damage authority, or explicit unsupported-size rule |
| 11 | Projectile Hand | PROSE_TABLE_PRICE_CONFLICT | Printed 2d8 nonlethal and disarm range remain source facts | Determine precedence of 250-credit descriptive installed price vs 2x selected appendage cost table |
| 12 | Remote Limb Control | PROSE_TABLE_PRICE_CONFLICT | Basic/Deluxe control limits are defined; no final quote | Resolve 1500/6000 descriptive prices vs 2x appendage Table 3-2, including tier distinction |
| 13 | Rocket Arm | PROSE_TABLE_PRICE_CONFLICT | Printed 3d8 explosive effect and installation check remain facts | Resolve prose 2000 cr vs 4x appendage price Table 3-2 |
| 14 | Personality Downloader | CUSTOM_BUILD_RANGE | Illegal external dataport tool can be modeled with minimum price only; not fixed retail | A configured build with actual agreed price >= 5000 and weight >=2 kg is required |
| 15 | Remote Receiver Jammer | NONNUMERIC_RANGE | Use Computer action and target defense comparison defined | A published numeric effective range or explicit GM map-range ruling is required before auto targeting |
| 16 | Remote Receiver Signal Booster | MULTIPLIER_COMPOSITION | Ordinary +50% range extension defined; enhanced combined range held | Determine if DC30 1-hour up-to-100% boost replaces or stacks with passive +50% |
| 17 | Concealed Item | COMPOSITE_PRICE_ORDER | Visibility/disguise benefits and deployment action are source facts | Select hosted weapon/tool plus appendage/storage, then resolve printed doubling grouping and GM adjustment |
| 18 | Droid Oil Bath | PROSE_TABLE_PRICE_CONFLICT | External equipment rather than installed chassis system established | Resolve fixed 500-cr table entry vs varying size-based descriptive prices |
| 19 | Earphone Binary-to-Basic Translator | UNPRICED_VARIANT | Basic version has printed entry; premium earbud variant not quoted | Official source or GM-established premium price and weight needed |
| 20 | Emergency Oxygen Supply | UNSPECIFIED_MASS_UNIT | Availability and function described; table weight label lacks unit | Printed-authority mass unit, not assumed kg, required for encumbrance |
| 21 | Interference Generator | UNPRICED_VARIANT | Base version has a printed price; Deluxe requires separate modeling | Printed source or GM-established Deluxe price and mass |
| 22 | Taser | MISSING_WEAPON_DAMAGE | Nonlethal/ion-like mode description preserved | Find explicit official weapon damage entry or rules cross-reference before damage automation |
| 23 | Video Screen | GEOMETRY_FOR_FORMULA | Published area-based price/weight formulas can be represented symbolically | Actual selected area in square millimeters must be supplied; 50-500 mm extent alone does not identify area |

## Application requirements

**Base vs exceptional operation.** Walking, Wheeled, Tracked, Hovering, Flying can use their printed unrestricted *first system* prices. This does not authorize the undefined interaction between restricted-locomotion discount and a second-or-later locomotion surcharge. A quote API must accept intended purchase position, restriction mode, actual speed and size, and flag unresolved compositions.

**Price conflicts.** Rocket Arm, Projectile Hand, Remote Limb Control, Climbing Claws, Jump Servos and Droid Oil Bath have incompatible price formulations. Preserve the exact two claims in the source record. A GM override, if accepted, must be explicitly recorded as a GM decision, never presented as published canonical cost.

**Variant and host input.** Concealed Item, the premium earphone, Deluxe Interference Generator and custom Personality Downloader require a selected variant or custom configuration. Remote Receiver Jammer requires an explicit authorized range adjudication, not a made-up numeric radius. Video Screen needs selected area in square millimeters rather than a guessed diagonal or width.

**Effects and mass.** Self-Destruct and Burrower Drive require correct Small+ rules while Tiny/Diminutive/Fine edge cases remain unresolved. Taser needs an official damage source before attack dice are automated. Emergency Oxygen Supply's tabular weight has no proven unit: do not assume kilograms.

## Errata correction must be applied first

- Core p186 corrects Small-or-smaller **accessory weight factors** to `2 / sizeCostFactor` for weight, without changing credit price factor.
- Core p191 corrects **Synchronized Fire Circuits** to **+5 total**, replacing the original base-book +4. The previous audit's claim that the live +5 was a defect is withdrawn.
- Core p186 makes starting locomotion, appendages and accessories exempt from chargen carrying-capacity counting.
- Core p120 defines unarmed and natural weapons as light simple weapons for proficiency.

These are printed-authority corrections, not a reason to promote any of the 23 existing HOLDs.

## Verification

Machine triage: `data/audits/droids/droid-component-mechanical-hold-triage-001.json`; validator: `tools/audits/droids/verify_droid_component_mechanical_hold_triage_001.mjs`. The underlying canonical 122-identity coverage and MECH-001..005 evidence packets remain unchanged. The standalone Node validator is committed for reproducible checks; the in-memory record-count and exact-identity checks passed while preparing this document.

**State:** Historical 99 source PASS / 23 source HOLD (subject to official-errata precedence and pending SGD host-scope review); production definitions, cross-application parity and Foundry V13 certification remain zero.
