# Registry v1.5 correction addendum — Scum and Villainy Table 2-3 page references (D-005)

**Status: AUDIT EVIDENCE ONLY. Documentation only.** This is not a runtime override, an alternative registry or a new rules authority. Nothing in `data/` is changed and nothing patches the registry during generation or loading. The corrections below require a separately authorized registry migration (potentially v1.6).
**Date:** 2026-10-16. **Prepared under:** owner decision 1 for D-005 T2.

## 1. Snapshot identity

| Item | Value |
|---|---|
| Registry file | `data/audits/modification-rolling-authority-v1.5.json` |
| Registry version | 1.5 (immutable; manifest status `research-snapshot-not-runtime`) |
| SHA-256 | `7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00` (recomputed from the file; matches the manifest) |
| Byte length | 960,022 |
| Manifest | `data/audits/modification-rolling-authority-v1.5.manifest.json` |
| Source PDF | *Scum and Villainy*, SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399` |

## 2. Confirmed discrepancy

Every registry definition whose `source.tableId` is `2-3` (16 definitions: the 15 D-005 parents and `sv-droidification`) records `source.printedTablePage: 41`. The supplied primary-source findings place Table 2-3 on printed **p. 40** and the individual entries on pp. 40–42. `source.rulesPage` is `null` for all 16.

## 3. Exact proposed future corrections (not applied)

| Definition | Current `printedTablePage` | Proposed `printedTablePage` | Entry description page (informational; not a proposed `rulesPage` value, see §4) |
|---|---|---|---|
| `sv-cheater` | 41 | 40 | 40 |
| `sv-cloaked` | 41 | 40 | 40 |
| `sv-droidification` | 41 | 40 | (out of D-005 scope; same table) |
| `sv-dual-gear` | 41 | 40 | 41 |
| `sv-electrograpple-handle` | 41 | 40 | 41 |
| `sv-environmental-sealing` | 41 | 40 | 41 |
| `sv-extra-power-source` | 41 | 40 | 41 |
| `sv-memory-upgrade` | 41 | 40 | 41 |
| `sv-memory-upgrade-advanced` | 41 | 40 | 41 |
| `sv-miniaturized` | 41 | 40 | 41 |
| `sv-recognition-system` | 41 | 40 | 41 |
| `sv-remote-activation` | 41 | 40 | 41 |
| `sv-secret-compartment` | 41 | 40 | 41 |
| `sv-silverplate` | 41 | 40 | 42 |
| `sv-spring-loaded` | 41 | 40 | 42 |
| `sv-storage-capacity` | 41 | 40 | 42 |

Droidification is the excluded-scope entry (0 typed definitions). Its table-page value belongs to the same Table 2-3 correction; its own entry page was not covered by the supplied findings and is **not asserted**.

## 4. Meaning of `rulesPage` (resolved by the owner, 2026-10-16)

`docs/audits/modification-rolling-authority-v1.5.md` separates the two locators: it says `rulesPage=null` means **not yet certified** and directs researchers to retain `printedTablePage` plus the actual `rulesPage`. The owner has confirmed the reading:

- `source.printedTablePage` — the printed page that contains the source table.
- `source.rulesPage` — the certified printed page that contains the entry's detailed published rules.
- `rulesPage: null` — the detailed rules page has not been certified in that registry snapshot.

Consequences recorded here:

- **v1.5:** `rulesPage` stays `null` everywhere. Nothing is populated.
- **Future migration:** a Table 2-3 location correction (`printedTablePage` 41 → 40) and detailed-rules-page certification are distinct changes and must be handled as such. Verifying D-005 host-prerequisite facts does not by itself justify populating `rulesPage` for every entry; full registry certification of rules pages is a separate process.
- The "Entry description page" column in §3 is source information (where each entry's text sits), **not** a proposed `rulesPage` value.

## 5. Related, separately tracked reconciliations (recorded, not corrected)

- Registry `eligibility.stackingPolicy` is `UNVERIFIED` and `maxPerHost` is `null` for these entries, while the source makes Extra Power Source explicitly repeatable and states that basic and advanced Memory Upgrade benefits do not stack. Owner decision 3 keeps the registry values; the facts are carried in specification-record behavior text.
- `docs/audits/swse-rules-decisions-pending.md` D-005 cites "p. 41 for Cheater"; Cheater is on p. 40. The register is append-only and is not edited by this addendum.

## 6. Non-effects

No change to the registry, manifest, companion markdown, specification records, ledger, generated runtime, tests or register. Registry SHA-256 and all counts (186 parents, 232 typed definitions) are unchanged.
