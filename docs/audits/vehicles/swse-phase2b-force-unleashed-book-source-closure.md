# Force Unleashed Campaign Guide - Phase 2B Book Source-Review Closure

**Status: 19 / 19 publication-specific ship statblocks reviewed against the original scanned PDF; strict mechanical certifications 0 / 19.**

## Provenance and audit scope

- GitHub repo: `docflowGM/foundryvtt-swse`; vehicle branch: `audit/vehicle-phase-0-1-canonical-foundation`. Verified HEAD at initialization: `49fabf107f287b8147a59b75a9dd09e49ed7426f` (unchanged from prior audit handoff).
- Immutable Phase 1 source identity authority: `data/audits/vehicles/swse-phase1-vehicle-provenance.json`, Git blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`. Exactly 19 existing Phase 1 keys and page locators retained; no extra narrative variant identities.
- Primary printed source: `SAGA EDITION - Force Unleashed Campaign Guide.pdf`; SHA-256 `0ef4b47b2bf55091c13c1960e4ea367675cb7d84a776f0b9f6dc8fc27c57840c`. Zero-based source PDF page index = printed page. Physical one-based PDF ordinal = printed page + 1.
- Visual reading: original scanned printed pages **114-121** and **204-211** were rendered and reviewed; DJVU TXT used as a searchable helper and checked against images where text was ambiguous. Raw searchable excerpts in JSON should not override scanned print.
- No repo or production compendium mutations, no GitHub writes or pushes, no source conflict resolutions, no Phase 2C schema freeze, and no invented launcher count, physical gun count, firing arc or battery architecture.

## Book closeout totals

| Audit | Result |
|---|---:|
| Phase 1 identities preserved | 19 / 19 |
| Primary PDF source close reads | 19 / 19 |
| Outstanding close reads | 0 |
| Printed weapon DETAIL attack-group rows | 41 |
| Phase 2C separate discovery cases | 39 |
| Preserved internal printed conflicts | 5 |
| Phase 1 start-page locator discrepancies | 0 |
| Strict full-field AND physical-mount certificates | 0 / 19 |
| Certification backlog | 19 |

> The 41 attack groups are detailed statblock firing/attack rows, **not** a declaration of 41 physical weapons. Printed battery count, underlying components, gunner roles and firing arcs must be distinguished before automated starship combat implementation.

## Per-ship close-read index

| Printed p. | Publication-specific ship | CL | Detailed attack groups | Important finding |
|---:|---|---:|---:|---|
| 204 | A-7 Hunter Interceptor | 6 | 1 | No SR or hyperdrive; do not substitute TIE Prototype shields or hyperdrive. |
| 207 | Escort Carrier | 14 | 2 | Tactical Fire (standard action, forgo all attacks): allied starfighters beginning turns in adjace... |
| 208 | Gladiator-class Star Destroyer | 16 | 4 | Tactical Fire: standard action forgo attacks; allied starships attacking targets in 2-square-radi... |
| 205 | Guardian-class Light Cruiser | 11 | 1 | Despite light-cruiser name, the printed type is Colossal space transport; laser battery details i... |
| 114 | H-60 Tempest Bomber | 7 | 2 | Two cockpit stations, four-person crew; missile launchers can fire linked at 9d10x2 or individual... |
| 118 | HWK-290 | 9 | 1 | Stock HWK has NO armaments; printed statblock instead includes two sets of retrofitted blaster ca... |
| 115 | M3-A Scyk Fighter | 7 | 1 | Stock has one laser mount; alternatives include ion, missile or torpedo launcher with six-missile... |
| 120 | Maka-Eekai L4000 Transport | 9 | 1 | Stock is two double laser cannons in port/starboard turrets; printed detail is one firing-group r... |
| 121 | Neutron Star Bulk Cruiser | 16 | 2 | Tactical Fire: standard action forgo attacks, allied Gargantuan-or-smaller ships in 2-square-radi... |
| 115 | NovaSword Space Superiority Fighter | 7 | 2 | One skilled crew with one additional passenger or copilot/commander/observer; extra seat is not a... |
| 116 | R-41 Starchaser | 9 | 3 | R-42 two-seat version has one gunner seat; separate named variant has no complete independent sta... |
| 206 | Rogue Shadow | 12 | 1 | Stygium cloak grants total concealment when activated; +5 equipment bonus on Perception and Use C... |
| 207 | Sentinel-class Landing Shuttle | 10 | 4 | Main attack line has alternative attack bundles: laser+ion OR 2 missiles+repeating blasters; avoi... |
| 209 | Tartan-class Patrol Cruiser | 15 | 1 | Power transfer/recharge shields each need one less swift action (typically two) than normal. |
| 205 | TIE Prototype | 6 | 2 | Unlike later stock TIE, prototype carries SR10, x2 hyperdrive with 2-jump memory and 2 medium mis... |
| 116 | Toscan 8-Q | 8 | 2 | Statblock header Init +1 conflicts with Skills Initiative +3; preserve both. |
| 210 | Venator-class Star Destroyer | 19 | 6 | Tactical Fire: standard action forgo attacks; allied Gargantuan-or-smaller ships within 2-square ... |
| 211 | Victory I-class Star Destroyer | 19 | 4 | Tactical Fire: standard action forgo attacks; allies targeting ships in 2-square-radius area gain... |
| 118 | Zebra Starfighter | 6 | 1 | Two linked heavy laser cannons are part of stock craft; no hyperdrive. |

## Five conflicting printed facts - retain both versions

| Ship and printed page | Printed main/header value | Different printed skills/weapon detail value |
|---|---|---|
| Gladiator-class Star Destroyer p.208 - light turbolaser attack bonus | Ranged 5 light turbolaser batteries +13 | Light turbolaser battery Atk +14 |
| Gladiator-class Star Destroyer p.208 - medium missile attack bonus | Ranged 2 medium concussion missile batteries +13 | Medium concussion missile battery Atk +14 |
| Gladiator-class Star Destroyer p.208 - tractor attack bonus | Ranged 3 tractor beam batteries +5 | Tractor beam battery Atk +8 |
| HWK-290 p.118 - blaster cannon attack bonus | Ranged 2 blaster cannons +2 | Blaster cannons (pilot, gunner) Atk +4 |
| Toscan 8-Q p.116 - Initiative | Init +1 | Skills Initiative +3 |

## High-priority source mechanics and configuration decisions

### True mechanical features needing downstream schema/engine representation

- **H-60 Tempest:** linked concussion launchers deliver the printed linked 9d10x2 damage; a single launch instead uses 8d10x2 and one missile. Four crew and two cockpit stations; aftermarket hyperdrive is not stock.
- **Scyk:** only the printed laser configuration is stock; alternative gun/launcher swaps and externally computed hyperspace jumps are conditional.
- **Rogue Shadow:** stygium cloak gives total concealment when engaged, sensors conditionally grant +5 equipment bonus, and the Colossal* hull is Gargantuan only for three explicitly named starship combat purposes.
- **Sentinel shuttle:** four printed detail attack groups, but the main attack line defines alternative bundles. Mount counts and concurrent firing rights cannot be inferred from the number of detail rows.
- **Escort Carrier / Neutron Star / Gladiator / Tartan / Venator / Victory I:** all have printed **Tactical Fire** with different shapes, targets and benefits. They are recorded as separate source rules, not collapsed into a generic bonus.
- **Tartan:** shield recharge and reroute-power require one fewer swift action. **Venator:** flight-deck cover while open is conditional; proton torpedo and ship complement information remain separate fields.
- **HWK-290:** the described original *stock* design is unarmed, but the printed statblock depicts a configuration retrofitted with two blaster cannon sets; preserve this distinction.
- **Maka-Eekai:** two stock side turrets share a single printed attack-detail row; optional aft ball turret is not stock. Cargo-to-passenger configuration has an explicit 10 tons-per-additional-passenger conversion limit.

### Narrative-only variants not promoted to new Phase 1 identities

- The **R-42 Starchaser** is a two-seat R-41 variant without its own full CL block.
- The **Broadside-class cruiser** is described as a modified Gladiator hull without a full independent printed statblock here.
- The **Victory II** engine upgrade is a speed-3 narrative variant, distinct from the CL 19 Victory I printed ship.
- The **Toscan 8-Q** section describes a simple original base model and a different 'typical' printed loadout; no new published CL identity is invented from these changes. Its actual *Init +1 / Skills Initiative +3* conflict remains unresolved.

## Outstanding strict-certification requirements

1. Verify individual full-field correctness against the original rendered statblocks, not just successful schema checks; close any printed contradiction with an explicit adjudication/errata policy.
2. Resolve physical mount topology, battery decomposition, gunner/station assignment, firing arc, and concurrent attack choices; treat unknown as source-silent, not zero.
3. Build supported variants as explicit conditional configurations only with appropriate schema authority; do not modify Phase 1 publication identities.
4. Implement and exercise source-specific Tactical Fire, cloak, linked missile, crew, and vehicle cover effects only in a separately authorized Foundry runtime phase.
5. Run repository-wide regressions on an integrated checkout. **This package provides a focused structural validator only.** It does not remediate earlier Phase 0B findings or mechanically certify any ship.

## Validation and packaging

```bash
python tools/audits/vehicles/check_force_unleashed_phase2b_book.py \
  --repo-root . \
  --source-pdf 'SAGA EDITION - Force Unleashed Campaign Guide.pdf'
```

Optionally use `--phase1-full <original-phase1.json>` to verify the original Git blob and all 19 exact source records; `--zip-file <changed-files.zip>` checks archive content and integrity against the five local outputs.

**Result: Force Unleashed Phase 2B book source review complete, not strict mechanical certification. Project-wide close-read tally becomes 270 / 316 claims across six completed books, leaving 46 published claims across the remaining sourcebooks.**
