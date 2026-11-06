# Starships of the Galaxy — CP20 Tranche 04 Source-Fidelity Certification

**Audit-only publication-fidelity evidence; not physical mounts or Foundry stock attacks.**

- Branch: `audit/sotg-strict-certification-cp17`; parent HEAD before this work: `0e776c102140ab3024919ae862a2dfda08d1a001`.
- Owner-approved policy: `SOTG-CP18-D01`.
- Queue positions: **61–75**; certificates added **15**; printed attack rows reconstructed **37**.
- Cumulative source-fidelity status: **60/100**, with **40 remaining**.
- Original strict mechanical backlog: **100**, unchanged; original four stronger strict certificates unchanged.
- New physical-mount certificates, trusted runtime attacks, production hydration and universal v0.6 schema freeze: **none**.
- Original source PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- Source evidence: preserved CP16, CP17, CP18 and CP19 immutable snapshots; new independently validated CP20 projection.

## Certified publication identities

| Queue | Printed ship | Statblock p. | Attack rows | Audit corrections | Scoped unresolved status |
|---:|---|---:|---:|---|---|
| 61 | Nebula-class Star Destroyer | 119 | 5 | SOTG-CP20-C04 | None |
| 62 | Kuat Drive Yards Nebulon-B Frigate | 120 | 3 | None | None |
| 63 | Buuper Torsckil Abbey Devices Porax-38 Starfighter | 121 | 1 | None | None |
| 64 | Predator-class Starfighter | 122 | 1 | None | None |
| 65 | Rebel Assault Frigate Prototype | 123 | 3 | None | None |
| 66 | Rebel Assault Frigate Mk I | 124 | 3 | None | None |
| 67 | Rebel Assault Frigate Mk II | 125 | 3 | None | None |
| 68 | Sienar Fleet Systems Scimitar Assault Bomber | 127 | 2 | None | None |
| 69 | Modified Republic Sienar Systems Armored Star Courier | 128 | 1 | None | None |
| 70 | Sith Interceptor | 130 | 1 | None | None |
| 71 | Sienar Fleet Systems GAT-12h | 131 | 4 | None | FIELD_SEMANTICS_UNRESOLVED |
| 72 | SoroSuub Cutlass-9 Patrol Fighter | 132 | 2 | None | None |
| 73 | Kuat Drive Yards Star Galleon | 133 | 2 | None | None |
| 74 | MandalMotors StarViper Assault Fighter | 134 | 2 | None | None |
| 75 | Loronar Corporation Strike-class Medium Cruiser | 135 | 4 | None | None |

## Evidence scope and safeguards

Every original printed field state, complete statblock-fact projection, raw weapon subrow, page-key presence, source-silence state and CP19 source-review classification remains reconstructible. Physical hardware totals, arcs, battery membership and executable station rights must not be inferred from gunners, batteries, payloads, figures or nearby prose. Stock/modified identities and conditional tactical rules remain separate.

### Approved correction and outstanding semantics

- **Nebula-class Star Destroyer, p. 119:** approved `SOTG-CP20-C04` changes only the certified audit projection of heavy ion cannon battery damage at original row 2 from `11d10x5 ion` to printed `3d10x5 ion`. CP16 source record remains unchanged.
- **Skipray Blastboat, p. 131:** preserve the printed **−20 penalty** and **−15 resulting attack** separately; retain CP16's ambiguous `againstSmallerThanColossal: -20` pending interpretation, with no automatic normalization or attack authority.
- Scimitar Assault Bomber and Sith Infiltrator are distinct sources; prototype, Mk I and Mk II Rebel Assault Frigates are distinct source identities.

## Machine gates

- `data/audits/vehicles/swse-sotg-cp20-tranche04-source-fidelity-certificates.json`
- `data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche04.schema.json`
- `tools/audits/vehicles/check_sotg_cp20_tranche04.py`
- `.github/workflows/sotg-strict-certification-cp17.yml`

The validator checks immutable Git blobs, exact queue/ledger/CP18/CP19 lineage, all original rows, approved correction scope, source silence, field states, certificates, anti-overlap, no permissions and hostile authority-escalation examples. Historical CP16↔CP15 continuity is intentionally not asserted because the CP15 input is missing on this branch.
