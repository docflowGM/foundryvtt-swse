# Starships of the Galaxy — CP20 Tranche 03 Source-Fidelity Certification

**Audit-only publication-fidelity evidence; not physical mounts or Foundry stock attacks.**

- Branch: `audit/sotg-strict-certification-cp17`; parent HEAD before this work: `0e776c102140ab3024919ae862a2dfda08d1a001`.
- Owner-approved policy: `SOTG-CP18-D01`.
- Queue positions: **46–60**; certificates added **15**; printed attack rows reconstructed **38**.
- Cumulative source-fidelity status: **45/100**, with **55 remaining**.
- Original strict mechanical backlog: **100**, unchanged; original four stronger strict certificates unchanged.
- New physical-mount certificates, trusted runtime attacks, production hydration and universal v0.6 schema freeze: **none**.
- Original source PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- Source evidence: preserved CP16, CP17, CP18 and CP19 immutable snapshots; new independently validated CP20 projection.

## Certified publication identities

| Queue | Printed ship | Statblock p. | Attack rows | Audit corrections | Scoped unresolved status |
|---:|---|---:|---:|---|---|
| 46 | Hapes Nova Cruiser | 94 | 3 | None | None |
| 47 | Telgorn Corp Gamma-class Assault Shuttle | 95 | 3 | None | None |
| 48 | Kuat Drive Yards Imperial II-class Star Destroyer | 96 | 4 | None | REPRESENTATION_SCOPE_UNRESOLVED |
| 49 | Rendili StarDrive Victory II-class Star Destroyer | 98 | 4 | None | None |
| 50 | Vindicator-class Heavy Cruiser | 101 | 5 | None | None |
| 51 | J-Type Star Skiff | 103 | 1 | None | None |
| 52 | Sienar Fleet Systems Lambda-class Shuttle | 106 | 3 | None | None |
| 53 | Kuat Drive Yards Lancer-class Frigate | 108 | 1 | None | None |
| 54 | Feethan Ottraw Scalable Industries Mankvim-814 Light Interceptor | 109 | 1 | None | None |
| 55 | Gallofree GR-75 Medium Transport | 111 | 1 | None | None |
| 56 | Olanji/Charubah Miy'til Fighter | 112 | 2 | None | None |
| 57 | Olanji/Charubah Miy'til Assault Bomber | 113 | 2 | None | None |
| 58 | Mon Calamari MC80 Star Cruiser | 114 | 3 | None | None |
| 59 | Home One | 115 | 3 | None | REPRESENTATION_SCOPE_UNRESOLVED |
| 60 | Theed Palace Space Vessel Engineering Corps N-1 Royal Starfighter | 118 | 2 | None | None |

## Evidence scope and safeguards

Every original printed field state, complete statblock-fact projection, raw weapon subrow, page-key presence, source-silence state and CP19 source-review classification remains reconstructible. Physical hardware totals, arcs, battery membership and executable station rights must not be inferred from gunners, batteries, payloads, figures or nearby prose. Stock/modified identities and conditional tactical rules remain separate.

### Unresolved publication representation scopes

- **Imperial II, pp. 96–97:** narrative counts of twenty turbolaser batteries and ten tractor generators are preserved alongside differently grouped attack statblock rows. No implied 1:1 map to individual physical mounts or firing permissions.
- **Home One, pp. 114–115:** its distinct MC80-subclass statistics are retained; applicability of general MC80 shield-recharge/tactical rules remains an explicitly unresolved scoped rule question.
- The first position is the **Hapes Nova Cruiser**, as certified by the CP17 work queue; the earlier handoff's paraphrased first ship name was not authoritative.

## Machine gates

- `data/audits/vehicles/swse-sotg-cp20-tranche03-source-fidelity-certificates.json`
- `data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche03.schema.json`
- `tools/audits/vehicles/check_sotg_cp20_tranche03.py`
- `.github/workflows/sotg-strict-certification-cp17.yml`

The validator checks immutable Git blobs, exact queue/ledger/CP18/CP19 lineage, all original rows, approved correction scope, source silence, field states, certificates, anti-overlap, no permissions and hostile authority-escalation examples. Historical CP16↔CP15 continuity is intentionally not asserted because the CP15 input is missing on this branch.
