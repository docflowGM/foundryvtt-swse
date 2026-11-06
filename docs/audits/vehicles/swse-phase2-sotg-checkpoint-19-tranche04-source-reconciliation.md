# Starships of the Galaxy — CP19 Tranche 04 (ships 46–60)

**Review result:** 15/15 source records inspected against the original scanned PDF; 17 printed pages (zero-index parity), 38 published attack-group rows and zero source-data corrections considered sufficiently supported. No new certificate or operational runtime authority.

- Original PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- Isolated branch: `audit/sotg-strict-certification-cp17`; initial HEAD `3830e77a4ee28c9474276a4b56f3353df9fe38a2`.
- CP18 authority: `SOTG-CP18-D01`. CP16 ledger and CP17 queue remain immutable.

## Individual source-review results

| Queue | Ship | Pages | Reconciliation finding |
|---:|---|---|---|
| 46 | Hapes Nova Cruiser | 94 | Printed five/two/two are battery families, not physical barrel counts or arcs. Stock CL17 and later CL19 variant must remain separate; the tactical-fire condition step is conditional on a successful ally attack reaching threshold. |
| 47 | Telgorn Corp Gamma-class Assault Shuttle | 95 | Two gunners operating four guns are not four extra attack actions. Third gunner's tractor and missiles share operating station; source publishes no per-mount arc. Gamma shield depletion differs from the default threshold-based model. |
| 48 | Kuat Drive Yards Imperial II-class Star Destroyer | 96, 97 | Preserve 5+5 printed combat battery declarations and p97 twenty-battery narrative separately; also preserve two tractor attack batteries versus ten generators. Neither page explains full mount-to-group cardinality or firing arcs. This is an unresolved aggregation/provenance question, not license to overwrite either. |
| 49 | Rendili StarDrive Victory II-class Star Destroyer | 98 | Interception role is not a printed gravity well weapon. No published payload line is a source-silence/row-absence state, not numeric zero; preserve no missile row without inventing launcher counts for either version. |
| 50 | Vindicator-class Heavy Cruiser | 101 | Original Vindicator retains its statblock and guns. No gravity-well capability should be borrowed from the distinct Immobilizer. The printed battery counts still cannot establish physical weapon number and firing geometry. |
| 51 | J-Type Star Skiff | 103 | CP16 already retains two physically linked lasers. Pair does not certify the arcs or independently operating weapons. Contextual effective size must not replace actual printed ship type. |
| 52 | Sienar Fleet Systems Lambda-class Shuttle | 106, 107 | Do not turn stock crew stations into independent physical cannons. The military ten-cannon configuration is a separate variant; passenger/cargo/troop conversions are alternatives, not stacked capacities. |
| 53 | Kuat Drive Yards Lancer-class Frigate | 108 | Four batteries times five gunners does not prove twenty physical guns. SR halving is localized and target-size gated, not permanent SR damage, and Fowler's drive is unique. |
| 54 | Feethan Ottraw Scalable Industries Mankvim-814 Light Interceptor | 109 | This is a droid-piloted cockpit ship, not Crew 0 autonomous virtual gunner craft. No missile attack group, barrel count or firing arc can be assumed. |
| 55 | Gallofree GR-75 Medium Transport | 111 | CP16 explicitly retains the four cannon count; a singular gunner weapon subrow does not establish individual stations, arcs or firing batteries. Rebel hospital and supply refits are not automatically installed. |
| 56 | Olanji/Charubah Miy'til Fighter | 112 | Do not import the command loadout or later R2 protection into baseline Fighter. Conditional astromech skill bonuses and missile physical launcher count remain separate from six-round ammunition. |
| 57 | Olanji/Charubah Miy'til Assault Bomber | 113 | Bomber is not an upgrade magically sharing stock Fighter one-pilot firing rights. Separate AND group semantics and gunner role are printed, but launcher number and arcs still lack evidence. |
| 58 | Mon Calamari MC80 Star Cruiser | 114, 115 | The MC80 shield recharge is not an unconditional every-round passive regeneration. Keep tactical aura contingent on surviving source shield, and retain four/five/one attack battery groups without inventing cannon counts or arcs. |
| 59 | Home One | 115 | Named Home One is a published subclass but is not interchangeable with stock MC80. Keep 6/6/1 vs 4/5/1 groups and 120 vs 36 fighters, and do not silently grant or deny MC80-class shield/tactical rule inheritance without scoped authority. |
| 60 | Theed Palace Space Vessel Engineering Corps N-1 Royal Starfighter | 118 | Ten proton torpedoes are payload, not installed launcher count. Fire-link is an attack option, not evidence for additional mounts; pilot/astromech skills and cover remain separately conditional. |

## Scoped evidence requiring later mechanical normalization

**Imperial II, pp.96–97:** Statblock lists five heavy plus five regular turbolaser battery groups and two tractor battery groups. Narrative refers to twenty turbolaser batteries and ten tractor beam generators. Preserve the prose and statblock as separately scoped published evidence; nothing in the printing establishes that all physical batteries, generators and attack groups have a one-to-one correspondence. Do not silently add mounts or auto-correct the canonical attack rows.

**Home One and MC80, pp.114–115:** Published unique Home One is identified as an MC80 subclass but has a different printed battery inventory and carried fighter count (120 vs 36). The adjacent generic MC80 shield recharge and Tactical Fire paragraphs should not silently be treated as full Home One stock rule text without scope review. Both identities remain separate.

**Gamma-class Shuttle, p.95:** The unusual shield-loss rule must not be substituted with standard conditional shield depletion. The third gunner operates a missile launcher and tractor beam, not extra stations.

**Miy'til Fighter/Bomber, pp.112–113:** Fighter pilot has exclusive OR attack modes and six missiles, while Assault Bomber has a separate gunner, AND-mode weapon roles, and 32 missiles. Later command fighter add-ons and R2 socket variants are not automatic stock fittings.

## Certification boundary and continuity

Tranches 1–4 total **60/100 reviewed**, **40 pending**. Tranche 4 has **38 attack-group rows** and **17 sourcebook pages**. Previously strict certified ships remain **4/104**; no new source-fidelity or physical-mount certificates, stock attack grants or production changes.

Every JSON review item records its original CP17 queue position and CP16 ledger index, exact original mount group values, printed page authority, scoped printed-rule observations, and fail-closed certification status. Neither alleged gunners nor batteries nor stored missile payloads automatically become installed mounts or firing arcs.

### Validation

CI runs `node --check tools/audits/vehicles/check_sotg_phase2b_cp19_tranche04.mjs` and `node tools/audits/vehicles/check_sotg_phase2b_cp19_tranche04.mjs` after CP17, CP18 and prior CP19 tranche checks. The validator independently reconstructs all 15 source record identities and 38 attack-group rows, verifies unchanged Git blob digests, enforces no overlap with previous tranches and requires unchanged certification and runtime gates. Sourcebook page rendering/inspection was done separately; CI is not an OCR proof.

Historical CP16 continuity checking remains explicitly skipped for absent CP15 comparison ledger; do not report it as passing.
