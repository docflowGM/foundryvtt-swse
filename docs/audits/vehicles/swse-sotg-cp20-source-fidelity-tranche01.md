# Starships of the Galaxy — CP20 controlled corrections and source-fidelity certification tranche 1

**Status: first 15 individually reviewed publication-fidelity records (queue positions 16–30) certified for audit use only.** Four source-backed corrections accepted into an independent correction overlay. Neither installed weapon-mount certification nor runtime combat trust was granted.

## Authority and boundaries

- Original scanned *Starships of the Galaxy* PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0` (verified from locally supplied original sourcebook).
- Owner-approved two-layer source-fidelity policy: `SOTG-CP18-D01`. The certificate validates **published evidence** including explicitly verified silence and published uncertainties; it is not an executable stock vehicle declaration.
- Source of truth remains the original CP16 ledger, and the CP18 observed-source state ledger remains immutable. The original CP17 100-ship queue and CP19 seven-tranche closeout are untouched.
- This checkpoint does **not** freeze universal v0.6, hydrate compendia, enable trusted stock attacks, alter CP9C combat integration or enter the Pure/Modified refactor.

## Corrections accepted (audit projection, not CP16 mutation)

| Ship and source page | Old CP16 observation | Verified printed claim | Treatment |
|---|---|---|---|
| Acclamator II, p.57 | heavy proton torpedo row `hardwareCount: SOURCE_SILENT_CONFIRMED` | two heavy proton torpedo tubes | Apply **2** only to the source-fidelity audit projection; preserve unknown firing arc. |
| Slave I, p.85 | concussion mine damage `10d10x2` | `8d10x2` | Accepted candidate for its future certificate; original CP16 unchanged. |
| Hapan Battle Dragon, p.93 | mass-pulse-tube count source-silent | four mass-pulse tubes | Accepted candidate for its future certificate; arcs unresolved. |
| Nebula-class Star Destroyer, p.119 | heavy ion battery `11d10x5 ion` | `3d10x5 ion` | Accepted candidate for its future certificate; original CP16 unchanged. |

The CP19 closeout used an inaccurate shorthand identity for Acclamator II. CP20 anchors that correction to the **actual original stable sourceEntryKey** `sotg-rothana-heavy-engineering-acclamator-ii-class-transgalactic-military-assault-ship`. Its old shorthand remains recorded as historical mismatch evidence, not a new identity.

Additional typed evidence: the TIE/In (p.142) is explicitly **without a hyperdrive in narrative prose**, although no `Hyperdrive None` line is printed in the statblock. This is source-narrative absence, not numeric zero. The Skipray p.131 `−20` size-penalty versus `−15` resultant attack still requires separately scoped field-semantics adjudication; neither was silently changed.

## First certification cohort: 15 source-fidelity certificates

The **39 published attack-group rows** for CP17 queue 16–30 were reconstructed with their original values and a separate corrected source-fidelity view. Each certificate includes exact printed facts, 19 source-field groups, source identity, page references, original versus effective weapon observations, published rule notes, CP19 primary PDF review link and CP18 original source-state evidence.

| Queue | Ship | Certification finding |
|---:|---|---|
| 16 | Acclamator I | Printed battery counts and tactical-fire scope preserved; physical barrel counts/arcs remain unknown. |
| 17 | Acclamator II | Two printed torpedo tubes incorporated from p.57; other physical mounts/arcs remain unknown. |
| 18 | Delta-7 Aethersprite | Historical row-level sourcePage key remains absent; independently verified p.60 is supplemental page provenance, not a forged ledger key. |
| 19 | Archaic Heavy Cruiser | Sample/template boundary and modern-target penalty preserved. |
| 20 | Banking Clan Munificent | Published five weapon families and jamming description retained without invented mounted jammer. |
| 21 | B-wing | Pilot-operated exclusive alternate weapon modes preserved. |
| 22 | B-wing Shuttle | Distinct two-attack loadout, no copied standard proton torpedo row. Family-rule inheritance ambiguity retained unresolved. |
| 23 | B-wing/E2 | Pilot laser AND one gunner option; reused laser label does not represent duplicated physical guns. Family-rule inheritance ambiguity retained unresolved. |
| 24 | Carrack-class | Three distinct battery families and carried craft scope preserved. |
| 25 | Chiss Clawcraft | Early/late navigation variant preserved without fabricated onboard hyperdrive. |
| 26 | Citadel-class | Two source-backed ion cannons retained; remaining geometry unknown. |
| 27 | CloakShape | Optional drive and maneuver jets remain optional. |
| 28 | Coralskipper | Organic dovin basal mechanics and swift-action modes preserved; not a conventional shield generator. |
| 29 | CR90 Corvette | Upgrade from CR70 remains optional; maximum load configurations not combined. |
| 30 | Dreadnaught Heavy Cruiser | Tactical redirection rule includes p.77 continuation; no generic Reflex-defense substitution. |

**Result:** 15 newly issued source-fidelity audit certificates; 85 remaining uncertified by this new tier. Historical four strict field/weapon-mount certificates remain unchanged, and the original **100 mechanical backlog items remain unresolved** under the stronger physical-mount gate. New runtime stock attack authorization = **zero**.

## Reproducible independent validation

`python3 tools/audits/vehicles/check_sotg_cp20_source_fidelity.py --repo .` verifies the pinned source Git blob SHA-1s, applies only the four explicitly printed correction candidates to their expected original values, validates the certificate JSON schema, reconstructs every original weapon row and field fact from CP16/CP18/CP19, preserves the missing historical row-page key, and rejects forged operational/physical certificates. When run locally with `--source-pdf`, it checks the original PDF SHA-256.

The historical CP16 continuity comparator remains separately skipped due to its missing genuine CP15 predecessor artifact; that skipped check is not represented as green.

**Next:** Batch two should certify positions 31–45 against individually reviewed source and typed evidence, using one rolling JSON per batch and controlled corrections for Slave I and Hapan Battle Dragon. Continue until all 100 source-fidelity candidates are individually tested; physical/operational certification remains separately blocked pending supported geometry.
