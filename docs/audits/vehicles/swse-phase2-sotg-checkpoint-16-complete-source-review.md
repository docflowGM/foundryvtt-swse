# SWSE Vehicle Canonicalization - Starships of the Galaxy Phase 2B Checkpoint 16

**Status: FULL PUBLICATION-SPECIFIC SOURCE CLOSE-READ COMPLETE, NOT FULL BOOK MECHANICAL CERTIFICATION.** All 104 existing *Starships of the Galaxy* ship publication entries have been individually reviewed on primary scanned PDF pages; the 8 final records cover printed pp154-160 plus p157 YT-1300 stock deck plan. Four prior entries have strict full source-field/physical-mount certificates. **One hundred remain outside that strict gate.** No production/packs, schema freeze, Phase 3 hydration, or other sourcebook records are changed.

## Primary evidence and continuity

- Source authority: the original user-provided *Starships of the Galaxy* PDF, file hash embedded in the cumulative CP16 ledger. Printed page = zero-indexed PDF page for this copy. OCR-derived TXT is used for navigation only, not for certification.
- Earlier 96 source entries, earlier CP8-15 metadata, 104 source identities and their canonical statblock-start pages are unchanged. The close-read count is now **104/104**; unreviewed source claims **0**.
- A record with a full printed-page close read is **not** automatically certified for physical barrel/launcher counts, battery composition or firing arcs. The source frequently supplies a weapon-group attack row without these details, so `SOURCE_SILENT_CONFIRMED` remains a source-state marker rather than an assumed number, an absent weapon or a computed value.
- The earlier four strict full certificates remain: **Action VI Bulk Transport (p58), stock CR70 Corvette (p75), Ghtroc Industries Class 720 Freighter (p88), stock Consular-class Cruiser (p126)**.

## Eight final full source reviews

| Publication record | Source | Canonical fact distinctions and reconciliation |
|---|---|---|
| Corellian YT-1300 Transport | p154; stock deck plan p157 | CL6, Ref12, 120 HP, DR15, crew 2, 100 tons cargo, x2 hyperdrive, 4d10x2 gunner laser cannons. No shield rating printed. Every **stock** YT-series ship has **10 unused emplacement points**, not ten installed weapons. P157 deck plan is not evidence of external weapon firing arcs. |
| Corellian YT-2000 | p155 | CL8, 180 HP, SR30, crew 4, 115 tons, **two double laser cannons** in the Ranged line. Modifying/repairing the YT-2000 incurs a specific **-2 Mechanics penalty** that is not the printed +5 baseline skill total. Printed `Pilot + -2` is an odd-sign token; numeric value **-2** is retained. |
| Corellian YT-2400 | pp155-156 | CL10, 120 HP, SR30, 150 tons, crew 3, stock gunner laser group. P155 specifies **+5 Acrobatics to enter the cockpit escape pod if the ship is destroyed**. Printed p156 `Pilot + -1` means numeric **-1**, not +1. Do not borrow YT-2000's two double laser hardware or 180 HP. |
| *Millennium Falcon* | p156 | Unique CL12 modified **Colossal** ship: 180 HP, SR45, x0.5 hyperdrive, 2 quad laser cannons, 8 medium concussion missiles, and a special pilot-operated **3d12 character-scale-only** docking blaster. Effective **Gargantuan starfighter** category applies only for capital weapons targeting, dogfighting and starship maneuvers. Sensor-array computer **+2 already included**. Not interchangeable with stock YT-1300. |
| Koensayr BTL-S3 Y-wing | p158 | CL10, SR10, 120 HP, crew 2 plus astromech; laser, **two ion cannons**, 8 proton torpedoes. Pilot operates lasers; gunner operates ion and torpedoes. Printed attack combinations preserve shared ion fire. Astromech conditional Mechanics/Use Computer values **+13**, not baseline +6. |
| Koensayr BTL-A4 LP *Longprobe* | pp158-159 | CL10 one-pilot scout variant: all **three weapon families operated by pilot**; 220 kg cargo, one month supplies, x1/x12 drive, navicomputer. Sensor checks have **Use Computer +11** or **+18 with astromech**, distinct from normal +6/+13. No inherited second gunner. |
| Koensayr BTL-S3 *Courier* | p159 | CL8, **ion cannons removed** to add three passengers and storage; retains laser cannons and **four proton torpedoes**. Ejecting escape-pod cockpit can be boarded without an Acrobatics check, unlike YT-2400's separate +5 check modifier. Crew 2 plus astromech, 800 kg cargo and one month consumables. |
| Incom/Subpro Z-95 Headhunter | p160 | CL9, 120 HP, SR15, triple light blaster cannon group and **six medium concussion missiles**. Source prose **explicitly says stock Z-95 has no hyperdrive**. Later retrofit variants are not part of the printed stock statblock. Physical launchers and blaster barrel count not established by ammo or family label. |

**Source-sign nuance:** the odd YT-2000 and YT-2400 tokens are preserved as printed evidence with negative numeric values. They are not silently replaced by favorable pilot bonuses. Neither is a second conflicting source value; the issue is printed typography.

## Book-wide certified state and outstanding evidence

| Gate | Result |
|---|---|
| Publication-specific ship identities | **104/104** |
| Complete statblock and adjacent-mechanics primary PDF close reads | **104/104** |
| Physical weapon/field strict certificates | **4/104** |
| Remaining strict certifications | **100** |
| Attack group rows in cumulative ledger | **258** |
| Physical hardware-count source-silent slots | **228** |
| Firing-arc source-silent slots | **251** |
| Legacy missing physical-count / arc / battery-count keys | **2 / 1 / 7** |
| v0.6 discovery-only schema cases | **155** |
| Production hydration approved | **No** |
| Universal vehicle schema frozen | **No** |

The **book-source-closure-mount-backlog** machine-readable manifest enumerates every one of the 104 source keys and their state, highlighting the 100 outstanding certificates, source-silent mount fields, and historical schema-shape exceptions. The counts above are the states observed in the ledger, **not** assertions that 228 physical weapons or 251 arcs are missing in the fictional ships.

### Technical judgment for the next pass

It is not valid to invent physical gun counts, firing arcs, magazine sizes, shield generators or station assignments to make a green audit. Many complete canonical SWSE statblocks deliberately describe **attack groups**, not full physical mount blueprints. The next mechanical-certification gate needs a policy for **source-confirmed silence that is representable in the V2 schema**. The audit should accept explicit source-silence where permitted by design, while still rejecting guesses, source conflicts, and actually missing mandatory published combat data. Source-silence is not the same as zero or unknown-by-neglect.

Prioritize reconciliation of physical weapon groups versus attack batteries, explicit counts, arcs and configuration-state-specific availability; preserve every printed conflict (for example the Interdictor gravity-well 4x4/3x3 wording and the Eclipse superlaser +7/+15 attack). Do not resolve those by inferred combat mathematics. Then harden the universal vehicle schema and enforce producer/consumer parity before any Foundry pack hydration.

## Validation and legacy blockers

All **15 SotG audit validators pass**, including the new CP16 integrity gate. That gate checks the primary PDF SHA, all 104 identities, every CP8-15 metadata checkpoint, all 96 prior reviewed records unchanged, the eight p154-160 additions, the four old strict certificates unmodified, the source-specific YT/Falcon/Y-wing/Z-95 sentinels, the **155 append-only schema-discovery cases**, and the 104-entry book-closure backlog. Validator results are structural: they do not themselves independently prove every printed number without rendered source inspection.

The separately run historical `phase0b_certification_gate.py` still fails with exit code 2: **12 fixture records violate schemaVersion**, and **2,112 null/empty positions are unclassified**. Do not call that gate green, change blank fields to guesses, or mark the old fixtures as certified. The resulting legacy gate log remains in working evidence, not part of the changed-files ZIP.

## Repository handling and package boundaries

No Foundry production records, compendia, or parallel vehicle engine have been modified. CP16 is a five-file audit delta:

1. `data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json`
2. `data/audits/vehicles/swse-phase2c-vehicle-v06-pressure-cases-cp16.json`
3. `data/audits/vehicles/swse-phase2b-sotg-cp16-book-source-closure-mount-backlog.json`
4. `tools/audits/vehicles/check_sotg_phase2b_cp16_certifications.py`
5. `docs/audits/vehicles/swse-phase2-sotg-checkpoint-16-complete-source-review.md`

**GitHub status is not implied by the ZIP:** previous local CP2-15 overlays are not on the known remote audit branch unless verified by a subsequent commit. No GitHub push should be claimed until the exact complete audit files are uploaded and read back. A separate consolidated complete-audit ZIP is supplied to simplify branch reconciliation and imports.

**Next work:** authoritatively reconcile the 100 outstanding mechanical certificates; validate schema-native source-silence representation; fix historical Phase 0B fixture/version/null-policy mismatches; then deliberate Phase 3 hydration. The *source-review tranche* for **this book** is finished, but the *mechanical-certification phase* has not passed its book completion gate.
