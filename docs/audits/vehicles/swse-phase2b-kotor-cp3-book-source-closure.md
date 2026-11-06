# Knights of the Old Republic Campaign Guide — Phase 2B Checkpoint 3: Book Source-Review Closure

**Status: 32/32 publication-specific ship PDF close reads complete; strict full-field and physical-mount mechanical certificates 0/32.**

## Provenance and immutable source identity

- Original visual source: `SAGA EDITION - Knights of the Old Republic Campaign Guide.pdf`; SHA-256 `fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419`.
- Primary verification: rendered/scanned pages from original uploaded PDF, where zero-based PDF page index equals the page number printed on the sheet and PDF ordinal = printed page + 1. Pre-existing DJVU TXT used as a navigation tool, **not** as the authority for contradictory print.
- Phase 1 identity authority: `data/audits/vehicles/swse-phase1-vehicle-provenance.json`, Git blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4` on `audit/vehicle-phase-0-1-canonical-foundation`.
- Remote branch HEAD verified identical to `49fabf107f287b8147a59b75a9dd09e49ed7426f` at audit commencement. **No GitHub writes or pushes occurred.**
- All 32 Phase 1 `sourceEntryKey` values, printed titles, Phase 1 page mappings and entry order are unchanged. The Stinger is a preserved Phase 1 locator discrepancy, not a rewritten identity: Phase 1 maps statblock p95 but the actual statblock starts printed p96.
- CP1 (10) and CP2 (10) completed source-review entries, mount-backlog rows, and the existing 54 schema-discovery cases are preserved semantically unchanged; only the final 12 entries are populated in CP3.
- This is a source-derived evidence inventory and **not** a production ship/compendium update, engine implementation, mount-count certification or Phase 0B defect cleanup.

## Book-level measured closeout

| Measure | Result |
|---|---:|
| Published KOTOR ship identities | 32 |
| Primary PDF close reads | 32 / 32 |
| Primary PDF close reads outstanding | 0 |
| Attack-detail weapon groups inventoried | 69 |
| Separate schema-discovery cases, non-production | 84 |
| Source internal conflict rows, preserved | 7 |
| Preserved Phase 1 printed-statblock page discrepancy | 1 |
| Strict full-field AND physical weapon mount certificates | 0 / 32 |
| Outstanding mechanical certificates | 32 |

## CP3: final twelve publication-specific ship statblocks

| Book page | Source identity | Printed CL | Weapon-detail attack groups | Source close-read / configuration insight |
|---|---|---:|---:|---|
| 184 | Rendili Hyperworks Hammerhead-class Cruiser | 18 | 4 | Synchronized Systems substitutes Use Computer +12 only while Inexpugnable-link criteria hold; Tactical Fire grants +2 versus commander-selected Ref or Fort. |
| 185 | Rendili Hyperworks Inexpugnable-class Tactical Command Vessel | 19 | 4 | Tactical Fire permits one allied ship square of movement at the start of its turn in the 2-square support area; separate combat and carried-craft capacities retained. |
| 204 | Davaab-type Starfighter | 8 | 2 | Laser OR missile attack profiles, 3 medium concussion missiles, fire-link/autofire assigned only to laser cannons. |
| 205 | Shaadlar-type Troopship | 15 | 3 | Missile attack +14 in Ranged vs +10 in detailed row; 50 **medium** payload missiles vs **light** missile battery terminology retained as two conflicts. |
| 205 | Teroch-type Fast Attack Gunship | 10 | 1 | Gunner-controlled double laser cannons; space-transport type remains unchanged. |
| 206 | Jehavey'ir-type Assault Ship | 18 | 3 | Tactical Fire imposes -1 to both enemy Reflex and Fortitude Defenses in adjacent squares; original attack group count unstated. |
| 206 | Kyramud-type Battleship | 20 | 4 | Tactical Fire gives +2 circumstance bonus for allied attack runs vs targets in 2-square area; ion weapons, capital batteries and troopship capacity preserved. |
| 207 | Kandosii-type Dreadnaught | 20 | 4 | Tactical Fire grants conditional missile/torpedo bonus and removes secondary attack penalty for locked-on missiles. Fission warheads are narrative, not automatic stock arms. |
| 220 | Ebon Hawk | 8 | 3 | Printed Colossal* transport conditionally treated as Gargantuan starfighter for 3 named combat purposes. Docking blaster is **character scale only**. Printed Grp +6 preserved. |
| 220 | Koros Spaceworks CX-133 Chaos Fighter | 7 | 1 | Volatile-fuel collision damage 8d6 instead of 4d6; no printed SR or hyperdrive numeric field. |
| 221 | Koros Spaceworks Supremacy-class Attack Ship | 17 | 4 | Tactical Fire reduces allied engineers' reroute-power action to one swift, not stackable with other action reductions. Fighting space prints “2 squares,” not 2x2. |
| 222 | Eleaor Propulsion Starscape-class Yacht | 13 | 2 | Stygium cloak total concealment persists after detection. Weapon bonuses +10/+8 swap between main Ranged and detailed medium/light lines; preserved as two conflicts. |

### Full source-identity / review-status inventory

Every Phase 1 source identity is preserved in the cumulative ledger. The checkpoint review boundaries were:

- **CP1:** Stinger, Star Saber XC-01, 578-R transport, G-Type shuttle, Lethisk freighter, Quartermaster carrier, Pelagia gunship, Praetorian frigate, Baronial yacht, Star Forge Interdictor warship.
- **CP2:** Centurion battlecruiser, Derriphan battleship, Herald shuttle, Sith interceptor, S-250 Chela, Aurek fighter, Conductor landing craft, Ministry shuttle, Foray blockade runner, KT-400 carrier.
- **CP3:** Twelve ships in table above.

## Seven source-conflict records retained without correction

| Ship | Printed location | Source tension | Disposition |
|---|---|---|---|
| Derriphan-class Battleship | p163 | Ranged line says point-defense medium blaster cannon battery; weapon detail says point-defense laser cannon battery. | Keep both descriptions; no synthetic canonical gun type. |
| Ministry-class Orbital Shuttle | p182 | Header Initiative -1 vs Skills Initiative +0. | Keep both modifiers. |
| Ministry-class Orbital Shuttle | p182 | Main Ranged names medium laser cannons, details name double laser cannons. | Keep exact descriptions; do not silently combine into double-medium mount. |
| Shaadlar-type Troopship | p205 | Ranged missile +14 vs detailed missile attack +10. | Preserve both attack bonuses. |
| Shaadlar-type Troopship | p205 | Payload “50 medium concussion missiles” vs firing group “point-defense light concussion missile battery.” | Preserve both caliber descriptors as possible source/editorial incompatibility. |
| Starscape-class Yacht | p222 | Ranged light battery +10 vs detailed light battery +8. | Preserve both. |
| Starscape-class Yacht | p222 | Ranged medium battery +8 vs detailed medium battery +10. | Preserve both. |

Additional non-contradictory unresolved details: Ebon Hawk’s printed Grp +6, rather than independently recalculated grapple; Stinger’s p95 Phase 1 map versus p96 actual block; and source silence on various shields, hyperdrives, weapon arcs or full mount architecture. These are **not** silently corrected.

## Mount-architecture and special-rule boundaries

The 69 attack rows represent printed detailed weapon **firing/attack groups**, **not** 69 distinct physical guns or certified mount objects. Even when the Ranged line prints battery counts (e.g. 5 double turbolaser batteries), the book does not fully specify constituent individual mounts, location, firing arcs, gunnery station permissions for each individual emplacement, or every overlapping battery capability. This blocks strict certification without additional explicit evidence.

- Stygium cloak, exceptional Ebon Hawk scale, conditional command-vessel Use Computer, missile lock-on, collisions and Tactical Fire are preserved as source findings. They are **not** implemented into Foundry automation by this audit.
- No unconditional hyperdrive or shield numeric default is inferred from absent lines, and no adjacent narrative variation is promoted to a new Phase 1 identity.
- The 84 Phase 2C discoveries are tracked independently, remain unfrozen, and must not mutate the authoritative production schema.
- The prior 12 Phase 0B invalid fixtures / 2,112 blank-unclassified positions have not been certified as fixed by this book review; repository-wide test suite not implied.

## Validation and continuation

Run the checkpoint’s book-level gate:

```bash
python tools/audits/vehicles/check_kotor_phase2b_cp3.py \
  --repo-root . \
  --source-pdf "SAGA EDITION - Knights of the Old Republic Campaign Guide.pdf"
```

Optional: `--cp2-root <prior-checkpoint-root>` validates all twenty CP1/CP2 reviewed ledger/backlog rows and first 54 discovery cases unchanged. `--phase1-full <original-phase1.json>` verifies the complete JSON’s original Git blob and exact 32 KOTOR source identities. `--phase1-projection <32-entry-projection.json>` validates an extracted roster projection without misrepresenting that projection as the full original Git blob. `--zip-file <zip>` verifies changed-files-only file contents and CRC.

The gate checks all 32 identities, field-group evidence states, source PDF SHA-256, all numerical count invariants, all seven preserved source conflicts, the Stinger page-correction exception, source-group-to-backlog consistency, CP2 preservation where provided, 84 discovery cases and strict-certification safety. **No full-system Foundry regression or automatic independent re-reading of the PDF is asserted by these structural checks.**

**Outcome:** KOTOR Phase 2B source-review book closure complete. Next sourcebook in the 316-entry census may begin its own primary-source review, independently of a later strict mechanical-certification phase.
