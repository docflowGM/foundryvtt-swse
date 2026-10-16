# Legacy Era Campaign Guide — Phase 2B Checkpoint 1 (10 ships)

**Status:** 10/39 primary-PDF source close reads; 29 remaining; **0/39 strict mechanical certificates**. This document, associated JSON, and validators are audit-only; no runtime, pack, compendium or source-identities changed.

## Scope and authority

- Original scanned book: `Star Wars Saga Edition - Legacy Era Campaign Guide.pdf`, SHA-256 `344d172e21daa7fdb3e0b032671e6833122f95d1175cf943bb1bb4a8110c561d`.
- Source-of-truth pages: printed **83–91** (with descriptive/context material p82 and YX deck plan p90; viewed neighboring pp81,92). Page mapping: physical PDF zero-based page index equals printed page number.
- Phase 1 provenance: GitHub blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; immutable roster of **39** identities, sorted by printed statblock page (then original key), 10 reviewed. Branch at starting point `e7236c21513e221a36b8b0a87f0932aa908159d0`.
- The provided DJVU TXT is navigation convenience only; statements were visually checked against the original scanned PDF.
- Printed weapon attack rows do **not** independently establish physical weapon count, hardpoint count, firing arc, or battery composition. None of the ten qualifies for complete field-and-mount certification.

## Source-verified tranche

| Printed page | Original publication identity | Attack groups | Key source findings |
|---|---|---:|---|
| 83 | Besh-Type Personal Starfighter | 1 | Fire-linked S-foil lasers and shield SR 20; cannot count barrels by S-foil prose. |
| 84 | Phoebos-class Starfighter | 1 | SR 30, hyperdrive x0.5, licensed civilian-sport ship with actual double light laser cannons. |
| 85 | R-28 Starfighter | 2 | Separate medium laser and medium ion groups; both autofire/fire-link as printed. |
| 86 | X-83 TwinTail Starfighter | 2 | Enhanced heavy lasers and proton torpedoes; 16 torpedoes are payload, not hardware; astromech conditional +13 skill modifiers. |
| 87 | Gladius-class Light Freighter | 1 | Dorsal quad laser weapon; station is pilot, hardware/mount count unresolved. |
| 87 | GPE-7300 Space Transport | 1 | Heavy laser group, x2 drive, characteristic vertical landing orientation is not an arc. |
| 88 | Helot-class Medium Transport | 1 | Prose expressly says stock vessel has **no shields**; copilot medium laser +6. |
| 89 | J-1 Shuttle | 1 | **SOURCE CONFLICT**: Ranged double laser **+4** vs weapon row **+6** (+1 autofire); retain both. Carries one X-83. |
| 89 | MC-24a Light Shuttle | 1 | Regains **10 points SR** when recharging shields; no printed hyperdrive line, which remains source-silent. |
| 91 | YX-1980 Space Transport | 1 | Copilot medium lasers, SR 40, **-5 Mechanics** to install/upgrade systems; deck plan p90; distinct from named *The Grinning Liar* p219. |

**Total attack groups:** 12. One preserved published conflict (J-1). The stock Helot shieldless condition is prose-confirmed, not treated as unknown. All 39 original identities are separate, including stock YX-1980 and later named *The Grinning Liar*, and stock Helot versus later named *The Mynock*.

## Detailed mechanics and blockers

- **Besh-type:** Fire-link is an attack option. The prose describes weapons mounted at the tips of S-foils but does not certify a complete mounting topology.
- **Phoebos:** Published private sport-ship identity is not a restriction to disarm it; its shield, gun and hyperdrive remain printed facts.
- **R-28:** The main Ranged line has `or` between medium laser and ion groups. Do not collapse into a single simultaneous attack.
- **X-83:** The astromech is hardwired in the narrative. The asterisk explicitly makes the altered Mechanics and Use Computer modifiers conditional; the 16-torpedo ammunition line is not a count of launchers.
- **Gladius:** Narrative calls its quad laser dorsal-mounted. The row names one weapon attack group, not a certified count of physical mounts/barrels.
- **GPE-7300:** Landing under its ventral thrusters and the cockpit's different gravity orientation convey configuration evidence, not any laser arc.
- **Helot:** Narrative explicitly states no stock shielding, despite the statblock lacking an `SR` value. Preserve unlike an unexplained missing field.
- **J-1:** The printed main Ranged line shows +4; the shaded weapon row +6. Neither was corrected or resolved from outside authority. Despite saying *most Jedi shuttles are unarmed*, its actual printed sample is armed.
- **MC-24a:** The footnote on SR 20 specifies 10 points of SR restored when taking recharge-shields action; do not discard it. A short-range description is **not proof** that its absent hyperdrive line indicates no physical hyperdrive.
- **YX-1980:** Mechanics -5 for installing/upgrading systems is narrative rules text on p91. The p90 deck plan is navigational evidence only, not sufficient evidence of physical firing arcs.

## Deliverables and continuation

1. `data/audits/vehicles/swse-phase2b-legacy-era-cp1-per-entry-source-review-ledger.json` — all 39 identities, 10 source reviews, detailed fields and weapon groups.
2. `data/audits/vehicles/swse-phase2b-legacy-era-cp1-weapon-mount-backlog.json` — 39 ship statuses and 12 weapon groups; physical mounts remain unresolved.
3. `data/audits/vehicles/swse-phase2c-legacy-era-cp1-schema-discovery.json` — 16 discovery-only pressure cases, unrelated to production schema freeze.
4. `tools/audits/vehicles/check_legacy_era_phase2b_cp1.py` — structural/book/PDF/Phase1 continuity gate.
5. This report.

The next tranche of 10 begins with **YZ-2500 Heavy Transport (printed p91)**, followed by printed pp142–147 through **Scarlet Star**, preserving separate Crix-class and modified-ship variants.

**Push policy:** Book-level commit/push after all 39 close reads, not during Checkpoint 1. No production files changed.
