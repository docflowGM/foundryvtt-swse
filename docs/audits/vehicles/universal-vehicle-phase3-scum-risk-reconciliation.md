# Universal vehicles Phase 3 — Scum and Villainy targeted risk reconciliation

**Bounded scope:** Existing `StarForge Station` and approved supplemental `Hornet-class Interceptor` publication identities only. Not a general 13-record audit, not new source staging, and not weapon-operational certification.

**Primary evidence:** Original scanned `SAGA EDITION - Scum and Villainy.pdf` SHA256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399` visually inspected on printed pp. 125 and 129–130 (physical pp. 126 and 130–131). Staged record and approved 318-supplement overlay compared with those pages.

## StarForge Station — SOURCE RECONCILED, printed contradictions retained

- Printed CL 20 `Colossal (station) space station`, distinct from the ancient Rakatan Star Forge. The book's p.129 sidebar explicitly disclaims identity with the historical Rakatan forge.
- Printed header: **Initiative −4; Perception +6**. Printed Skills list: **Initiative −5; Perception +5**. This is a contradiction in the source itself, not a migration defect. Both variants remain separately preserved. No new effective mechanical value is selected.
- Printed ranged line **five turbolaser batteries +12**; printed detailed attack **+12, −20 against targets smaller than Colossal; damage 7d10×5**. One source attack group is indexed. Five stated battery groups do **not** prove five independently executable Foundry mounts or their arc geometry.
- Narrative market/shipyard facts are distinct from typed executable systems.

**Open runtime questions:** original print's disputed header-versus-skill effective values; physical mount topology and arcs; typed handling of the special small-target restriction and trade/shipyard effects.

## Hornet — SOURCE RECONCILED, alternatives not simultaneously installed

- Printed p.125 CL 12 Gargantuan starfighter; one already approved supplemental source identity. Not a duplicate 111th new hull.
- Default advanced heavy lasers: **+6 (+1 autofire), 10d10×2**. Alternative medium lasers: **+6 (+1 autofire), 5d10×2**. The printed text is explicitly an **alternative configuration**, not an additional stock attack.
- Original advanced-heavy-laser option has a natural-1 malfunction (6d10×2 self-damage ignoring SR, destroying the cannons). The alternate medium-laser option is **not subject to this default overload**, consistent with the prior approved overlay.
- Hyperdrive is **unmentioned**, not explicitly unavailable. Cannon barrel counts and firing arcs remain unknown.

**Open runtime questions:** approved mutually exclusive stock configuration selection, physical counts/locations, and executable overload handler.

## Acceptance and protection

The two printed-source risk interpretations are checked against the primary PDF and covered by `tests/vehicle-universal-phase3-scum-risk.test.mjs`; the structured evidence is in `data/audits/vehicles/swse-universal-phase3-targeted-exceptions.json`. Their staging already correctly preserves these source distinctions, so **no source records were rewritten for this checkpoint**. This is deliberate: never introduce unnecessary changes to already source-reviewed ships.

The `429` census, `48/48` new-record PDF-field queue, existing production packs, physical mount absence, and Foundry V2 runtime remain unchanged. Both entries keep strict mount/runtime **pending**. Phase 4 canonical imports remain blocked by the known Initiative/unknown-preservation normalizer issue.
