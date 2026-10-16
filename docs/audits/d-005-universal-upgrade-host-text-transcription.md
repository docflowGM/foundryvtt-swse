# D-005 — Universal-upgrade host text: source-backed findings (T1)

**Status: primary-source findings supplied by project rules review; documentation reconciliation only.** Not a register resolution, blocker lift, specification record, host evaluator or executable contract. D-005 stays at 35 blocked typed definitions; runtime selectability stays at zero; `EXECUTOR_NOT_CERTIFIED` is unaffected.
**Date:** 2026-10-16. **Baseline:** `main` at `6ecbed3efcb020ce2b23963c2f207014ca32cfad`.
**Scope:** the 15 *Scum and Villainy* Table 2-3 universal-upgrade parents behind the 35 D-005 typed definitions (component `hostPrerequisites`, `PENDING_SOURCE_VERIFICATION`). `sv-droidification` is excluded scope (0 typed definitions).

## 1. Source and provenance

| Item | Content |
|---|---|
| Publication | *Star Wars Saga Edition — Scum and Villainy* |
| Source PDF SHA-256 | `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399` (matches the hash already documented in the repository) |
| Printed p. 40 | Table 2-3 (Universal Upgrades); universal-upgrade introduction; Cheater; Cloaked |
| Printed p. 41 | Dual Gear through Secret Compartment |
| Printed p. 42 | Secret Compartment (continuation); Silverplate; Spring Loaded; Storage Capacity |
| Provenance of the findings below | Supplied to this author by the project rules review of the owner's original PDF, printed pp. 40–42. **This author did not view the pages**; the entries are recorded as supplied and are paraphrases, not quotations. The earlier OCR-based leads in the first revision of this file have been removed. |
| Introduction (p. 40) | Universal upgrades generally apply across equipment categories; individual entries can carry extra restrictions or special behavior when applied to armor or weapons. Usage examples are not to be turned into exclusive host restrictions. |

## 2. Repository discrepancies (recorded, not corrected)

1. **Registry page reference.** All 15 parents carry `printedTablePage: 41` in the immutable registry. The source places Table 2-3 on printed **p. 40** (and individual entries on pp. 40–42). The registry is **not edited** here; this is a separately tracked reconciliation requirement for a versioned registry change.
2. **Register wording.** `swse-rules-decisions-pending.md` D-005 cites "for example p. 41 for Cheater"; Cheater is on p. 40. The register is not edited in this task.
3. **Stacking policy.** The registry records `stackingPolicy: UNVERIFIED` and `maxPerHost: null` for all 15. The source makes Extra Power Source explicitly repeatable and states that the basic and advanced Memory Upgrades do not stack. Reconciling these belongs to a separately approved step; nothing is changed here.
4. **Registry summaries.** The registry's `display.summary` strings make unsourced host claims (for example "device-only", "applicability to weapons/armor unlikely"). They are engineering notes and are not evidence.
5. **Count reconciliation.** 15 parents; 35 typed IDs (equipment 15, weapon 11, armor 9). The register's "16 upgrades" includes Droidification (out of scope). All 35 are also in the D-015-lifted set; D-015 does not touch hosts.
6. **No conflict** was found between the supplied typed-domain scope for each parent and the 35 existing D-005 typed IDs.

## 3. Concepts kept separate

- **Eligible host** — which kinds of item may receive the upgrade.
- **Functional prerequisite** — a condition the particular host must meet (Intelligence score, power source, activation function, containment space, one-handed use, size/weight).
- **Conditional effect** — what the upgrade does on one kind of host versus another (not eligibility).
- **Stacking / repeatability / maximum per host** — recorded as printed, else `NOT SPECIFIED BY SOURCE`. Silence is not a prohibition and no numeric maximum is invented.
- **Slot accounting** — already table-verified; out of scope for D-005.

Verdict vocabulary: **SUPPORTED** = the source supports the current typed domain; **CONDITIONALLY SUPPORTED** = supported only where the individual host meets the stated functional prerequisite. A verdict is recorded only for the existing typed domains; no host/domain combination is added.

## 4. Per-parent findings

### 01. Cheater (`sv-cheater`)

| Field | Content |
|---|---|
| Source | Printed p. 40. |
| IDs | Parent `sv-cheater`; D-005 typed IDs (1): `sv-cheater::equipment`. |
| Published description (paraphrase) | A handheld gambling-cheat device, generally concealed in or built into another functional item. Printed examples include small equipment such as credit chips, comlinks and a modified sabacc card. Effectiveness and concealment depend on the device and circumstances of use. |
| Host finding | Equipment incorporating or concealing the cheating device. The examples are not an exhaustive list. |
| Functional prerequisites | A suitable functional host that can incorporate or conceal the device. |
| Conditional effects | Effectiveness and concealment depend on the device and circumstances. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `equipment`: **SUPPORTED** — for a suitable functional host |
| Notes | Weapons and armor are not stated to be categorically prohibited; their broader eligibility is simply not established by this entry. No typed domain is added. |

### 02. Cloaked (`sv-cloaked`)

| Field | Content |
|---|---|
| Source | Printed p. 40. |
| IDs | Parent `sv-cloaked`; D-005 typed IDs (3): `sv-cloaked::weapon`, `sv-cloaked::armor`, `sv-cloaked::equipment`. |
| Published description (paraphrase) | Conceals an item's detectable signatures, noise and appearance and allows more inconspicuous storage. Detection penalties differ while the item is in use. Weapons remain more recognizable while in use. Cloaked armor has a separate interaction involving a deceptive appearance. |
| Host finding | General equipment, weapons and armor, with domain-specific effects. |
| Functional prerequisites | None stated beyond the domain-specific effects. |
| Conditional effects | Detection penalties differ in use; weapons stay more recognizable in use; armor has a separate deceptive-appearance interaction. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **SUPPORTED**; `armor`: **SUPPORTED**; `equipment`: **SUPPORTED** |
| Notes | Different effects per host type are conditional effects, not different eligibility rules. |

### 03. Dual Gear (`sv-dual-gear`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-dual-gear`; D-005 typed IDs (1): `sv-dual-gear::equipment`. |
| Published description (paraphrase) | One piece of equipment is incorporated into another. The added item cannot be larger than the item receiving it. The combined item keeps both functions, but normal use does not permit operating both components simultaneously. The added equipment's full purchase price must be paid. |
| Host finding | A combination of two physically compatible pieces of equipment, subject to the size restriction. |
| Functional prerequisites | Size restriction: the added item may not be larger than the receiving item. |
| Conditional effects | Both functions retained; no simultaneous operation in normal use; full price of the added item. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE (no explicit general repeatability permission established) |
| Domain verdicts (existing typed scope) | `equipment`: **SUPPORTED** — subject to the printed size restriction |
| Notes | No new typed definitions are created and weapons are not declared categorically excluded: the printed examples include equipment with weapon functionality. |

### 04. Electrograpple Handle (`sv-electrograpple-handle`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-electrograpple-handle`; D-005 typed IDs (2): `sv-electrograpple-handle::weapon`, `sv-electrograpple-handle::equipment`. |
| Published description (paraphrase) | A magnetized equipment component that works with an attuned electrograpple gauntlet. The gauntlet allows retrieval of the fitted item at range and can help free an item being held or restrained. Weapons are described as the most common application. |
| Host finding | A compatible piece of equipment fitted with the specialized handle. The required gauntlet is part of using the functionality. |
| Functional prerequisites | The attuned gauntlet is needed to use the upgrade's function. |
| Conditional effects | Retrieval at range / helping free held equipment, via the gauntlet. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **SUPPORTED**; `equipment`: **SUPPORTED** |
| Notes | "Most common on a weapon" is not "weapons only". No armor prohibition is introduced from the example. |

### 05. Environmental Sealing (`sv-environmental-sealing`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-environmental-sealing`; D-005 typed IDs (3): `sv-environmental-sealing::weapon`, `sv-environmental-sealing::armor`, `sv-environmental-sealing::equipment`. |
| Published description (paraphrase) | Protects an item against specified environmental hazards using seals, protective coatings and related materials. The entry addresses vacuum, water, particulate contamination, corrosive conditions, temperatures, ordinary fire and radiation. |
| Host finding | General equipment applicability. |
| Functional prerequisites | None stated. |
| Conditional effects | Protections apply to the upgraded item. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **SUPPORTED**; `armor`: **SUPPORTED**; `equipment`: **SUPPORTED** |
| Notes | The protections apply to the upgraded item and are not to be translated into protection for the person wearing or carrying it. |

### 06. Extra Power Source (`sv-extra-power-source`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-extra-power-source`; D-005 typed IDs (3): `sv-extra-power-source::weapon`, `sv-extra-power-source::armor`, `sv-extra-power-source::equipment`. |
| Published description (paraphrase) | The host must operate on energy cells or power packs. The upgrade increases its available power supply. The publication expressly allows installing the modification multiple times, adding another power supply each time. |
| Host finding | Any equipment that actually uses the qualifying power sources. |
| Functional prerequisites | Host uses energy cells or power packs. |
| Conditional effects | Adds a power supply per installation. |
| Stacking / repeatability / max per host | EXPLICITLY REPEATABLE (each installation adds another power supply). No numeric maximum is printed; none is invented. Normal upgrade-point accounting remains a separate restriction. |
| Domain verdicts (existing typed scope) | `weapon`: **CONDITIONALLY SUPPORTED** — host must use energy cells or power packs; `armor`: **CONDITIONALLY SUPPORTED** — host must use energy cells or power packs; `equipment`: **CONDITIONALLY SUPPORTED** — host must use energy cells or power packs |
| Notes | None. |

### 07. Memory Upgrade (`sv-memory-upgrade`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-memory-upgrade`; D-005 typed IDs (1): `sv-memory-upgrade::equipment`. |
| Published description (paraphrase) | The host must be a device with an Intelligence score. The basic version increases Intelligence by 2 and doubles data storage. The publication expressly excludes installation on droids, including equipment converted into droids. |
| Host finding | Intelligence-bearing, nondroid devices. |
| Functional prerequisites | The device has an Intelligence score (prerequisite, not merely an example). Not a droid, including equipment converted into a droid. |
| Conditional effects | Intelligence +2; data storage doubled. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE (no printed permission for repeatedly accumulating Intelligence increases was established) |
| Domain verdicts (existing typed scope) | `equipment`: **CONDITIONALLY SUPPORTED** — host needs an Intelligence score and must not be a droid |
| Notes | None. |

### 08. Memory Upgrade, Advanced (`sv-memory-upgrade-advanced`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-memory-upgrade-advanced`; D-005 typed IDs (1): `sv-memory-upgrade-advanced::equipment`. |
| Published description (paraphrase) | The advanced version increases Intelligence by 4 and multiplies storage capacity by five. Its benefits replace those of the standard Memory Upgrade. The same Intelligence-bearing, nondroid requirements apply. |
| Host finding | Intelligence-bearing, nondroid devices. |
| Functional prerequisites | Intelligence score; not a droid (same as the basic version). |
| Conditional effects | Intelligence +4; storage x5; replaces the basic version's benefits. |
| Stacking / repeatability / max per host | Basic and advanced benefits do not stack (advanced replaces basic). Otherwise NOT SPECIFIED BY SOURCE. |
| Domain verdicts (existing typed scope) | `equipment`: **CONDITIONALLY SUPPORTED** — host needs an Intelligence score and must not be a droid |
| Notes | No requirement that the basic upgrade be installed first is recorded: the printed text describes a replacement of benefits, not a prerequisite purchase. |

### 09. Miniaturized (`sv-miniaturized`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-miniaturized`; D-005 typed IDs (3): `sv-miniaturized::weapon`, `sv-miniaturized::armor`, `sv-miniaturized::equipment`. |
| Published description (paraphrase) | Halves the equipment's weight and reduces its size by one category. Miniaturized melee weapons suffer a reduction in damage die size. |
| Host finding | General equipment applicability, including weapons. |
| Functional prerequisites | None stated. |
| Conditional effects | Melee-weapon damage-die reduction. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **SUPPORTED**; `armor`: **SUPPORTED**; `equipment`: **SUPPORTED** |
| Notes | The melee-weapon damage reduction is a conditional effect, not a restriction against installing the upgrade on melee weapons. |

### 10. Recognition System (`sv-recognition-system`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-recognition-system`; D-005 typed IDs (3): `sv-recognition-system::weapon`, `sv-recognition-system::armor`, `sv-recognition-system::equipment`. |
| Published description (paraphrase) | The upgraded equipment recognizes its owner and prevents unauthorized use. The publication gives a Use Computer procedure for bypassing the recognition system. The owner can deactivate it when necessary, including to transfer use to another character. |
| Host finding | Equipment whose functionality can meaningfully be restricted to an authorized user. |
| Functional prerequisites | The item's actual functionality must be restrictable to an authorized user. No additional biometric hardware prerequisite is recorded. |
| Conditional effects | Use Computer bypass; owner deactivation. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **SUPPORTED** — at the category level, subject to the item's actual functionality; `armor`: **SUPPORTED** — at the category level, subject to the item's actual functionality; `equipment`: **SUPPORTED** — at the category level, subject to the item's actual functionality |
| Notes | None. |

### 11. Remote Activation (`sv-remote-activation`)

| Field | Content |
|---|---|
| Source | Printed p. 41. |
| IDs | Parent `sv-remote-activation`; D-005 typed IDs (3): `sv-remote-activation::weapon`, `sv-remote-activation::armor`, `sv-remote-activation::equipment`. |
| Published description (paraphrase) | An upgraded item can be activated remotely through an appropriate communications signal. Explosives and security systems are common examples, not exclusive hosts. The source describes activation through a communications device, including the relevant action and security considerations. |
| Host finding | Equipment with a function capable of being activated. |
| Functional prerequisites | The item has a function that remote activation can meaningfully target. Not every item has one. |
| Conditional effects | Activation via a communications device; action and security considerations. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **CONDITIONALLY SUPPORTED** — where remote activation has a meaningful target function; `armor`: **CONDITIONALLY SUPPORTED** — where remote activation has a meaningful target function; `equipment`: **CONDITIONALLY SUPPORTED** — where remote activation has a meaningful target function |
| Notes | None. |

### 12. Secret Compartment (`sv-secret-compartment`)

| Field | Content |
|---|---|
| Source | Printed p. 41-42. |
| IDs | Parent `sv-secret-compartment`; D-005 typed IDs (3): `sv-secret-compartment::weapon`, `sv-secret-compartment::armor`, `sv-secret-compartment::equipment`. |
| Published description (paraphrase) | Creates a concealed compartment inside equipment. The compartment can hold one item at least one actual size category smaller than the host. The publication separately gives detection difficulties for observing its use and for locating it by close inspection. |
| Host finding | Equipment physically capable of containing the smaller object. |
| Functional prerequisites | Containment: the host can contain an item at least one actual size category smaller. |
| Conditional effects | Detection difficulty for observing use and for close inspection. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **CONDITIONALLY SUPPORTED** — subject to the containment requirement; `armor`: **CONDITIONALLY SUPPORTED** — subject to the containment requirement; `equipment`: **CONDITIONALLY SUPPORTED** — subject to the containment requirement |
| Notes | One contained item is a compartment-capacity rule. It is not a published maximum of one Secret Compartment upgrade per host. |

### 13. Silverplate (`sv-silverplate`)

| Field | Content |
|---|---|
| Source | Printed p. 42. |
| IDs | Parent `sv-silverplate`; D-005 typed IDs (3): `sv-silverplate::weapon`, `sv-silverplate::armor`, `sv-silverplate::equipment`. |
| Published description (paraphrase) | A protective surface treatment applicable to any piece of gear. It gives damage reduction to the upgraded object, up to the printed maximum. Armor has a distinct interaction: the armor's object protection does not automatically become personal damage reduction for the wearer. The entry also specifies a benefit involving Quick Draw. |
| Host finding | General equipment applicability, expressly including armor. |
| Functional prerequisites | None stated. |
| Conditional effects | Object DR to the printed maximum; armor interaction (no automatic wearer DR); a Quick Draw-related benefit. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **SUPPORTED**; `armor`: **SUPPORTED**; `equipment`: **SUPPORTED** |
| Notes | The wearer does not gain personal DR solely because their armor is silverplated. Unauthenticated publisher errata is not applied. |

### 14. Spring Loaded (`sv-spring-loaded`)

| Field | Content |
|---|---|
| Source | Printed p. 42. |
| IDs | Parent `sv-spring-loaded`; D-005 typed IDs (2): `sv-spring-loaded::weapon`, `sv-spring-loaded::equipment`. |
| Published description (paraphrase) | Equipment qualifies when it can be held and used in one hand. The upgrade allows rapid presentation of the item using the printed action. Pistols, grenades and datapads are examples. |
| Host finding | One-handed, handheld equipment. |
| Functional prerequisites | The item can be held and used in one hand (mandatory). Not every weapon or piece of equipment qualifies. |
| Conditional effects | Rapid presentation using the printed action. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **CONDITIONALLY SUPPORTED** — host must be one-handed handheld equipment; `equipment`: **CONDITIONALLY SUPPORTED** — host must be one-handed handheld equipment |
| Notes | Unauthenticated publisher errata is not applied. |

### 15. Storage Capacity (`sv-storage-capacity`)

| Field | Content |
|---|---|
| Source | Printed p. 42. |
| IDs | Parent `sv-storage-capacity`; D-005 typed IDs (3): `sv-storage-capacity::weapon`, `sv-storage-capacity::armor`, `sv-storage-capacity::equipment`. |
| Published description (paraphrase) | Lets equipment carry smaller items in an obvious compartment. Multiple items can be carried. Each contained item must be at least one actual size category smaller than the host, and their total weight must stay below the weight of the upgraded equipment. |
| Host finding | Equipment able to carry other items under the published size and weight conditions. |
| Functional prerequisites | Size: each item at least one actual size category smaller than the host. Weight: total contained weight below the host's weight. |
| Conditional effects | Multiple stored items permitted. |
| Stacking / repeatability / max per host | NOT SPECIFIED BY SOURCE |
| Domain verdicts (existing typed scope) | `weapon`: **CONDITIONALLY SUPPORTED** — subject to the size and weight conditions; `armor`: **CONDITIONALLY SUPPORTED** — subject to the size and weight conditions; `equipment`: **CONDITIONALLY SUPPORTED** — subject to the size and weight conditions |
| Notes | Multiple stored items are permitted; that does not establish that multiple Storage Capacity upgrades can be stacked on one host. |

## 5. Domain-verdict summary (all 35 typed definitions)

| Typed definition | Verdict | Condition |
|---|---|---|
| `sv-cheater::equipment` | SUPPORTED | for a suitable functional host |
| `sv-cloaked::weapon` | SUPPORTED | — |
| `sv-cloaked::armor` | SUPPORTED | — |
| `sv-cloaked::equipment` | SUPPORTED | — |
| `sv-dual-gear::equipment` | SUPPORTED | subject to the printed size restriction |
| `sv-electrograpple-handle::weapon` | SUPPORTED | — |
| `sv-electrograpple-handle::equipment` | SUPPORTED | — |
| `sv-environmental-sealing::weapon` | SUPPORTED | — |
| `sv-environmental-sealing::armor` | SUPPORTED | — |
| `sv-environmental-sealing::equipment` | SUPPORTED | — |
| `sv-extra-power-source::weapon` | CONDITIONALLY SUPPORTED | host must use energy cells or power packs |
| `sv-extra-power-source::armor` | CONDITIONALLY SUPPORTED | host must use energy cells or power packs |
| `sv-extra-power-source::equipment` | CONDITIONALLY SUPPORTED | host must use energy cells or power packs |
| `sv-memory-upgrade::equipment` | CONDITIONALLY SUPPORTED | host needs an Intelligence score and must not be a droid |
| `sv-memory-upgrade-advanced::equipment` | CONDITIONALLY SUPPORTED | host needs an Intelligence score and must not be a droid |
| `sv-miniaturized::weapon` | SUPPORTED | — |
| `sv-miniaturized::armor` | SUPPORTED | — |
| `sv-miniaturized::equipment` | SUPPORTED | — |
| `sv-recognition-system::weapon` | SUPPORTED | at the category level, subject to the item's actual functionality |
| `sv-recognition-system::armor` | SUPPORTED | at the category level, subject to the item's actual functionality |
| `sv-recognition-system::equipment` | SUPPORTED | at the category level, subject to the item's actual functionality |
| `sv-remote-activation::weapon` | CONDITIONALLY SUPPORTED | where remote activation has a meaningful target function |
| `sv-remote-activation::armor` | CONDITIONALLY SUPPORTED | where remote activation has a meaningful target function |
| `sv-remote-activation::equipment` | CONDITIONALLY SUPPORTED | where remote activation has a meaningful target function |
| `sv-secret-compartment::weapon` | CONDITIONALLY SUPPORTED | subject to the containment requirement |
| `sv-secret-compartment::armor` | CONDITIONALLY SUPPORTED | subject to the containment requirement |
| `sv-secret-compartment::equipment` | CONDITIONALLY SUPPORTED | subject to the containment requirement |
| `sv-silverplate::weapon` | SUPPORTED | — |
| `sv-silverplate::armor` | SUPPORTED | — |
| `sv-silverplate::equipment` | SUPPORTED | — |
| `sv-spring-loaded::weapon` | CONDITIONALLY SUPPORTED | host must be one-handed handheld equipment |
| `sv-spring-loaded::equipment` | CONDITIONALLY SUPPORTED | host must be one-handed handheld equipment |
| `sv-storage-capacity::weapon` | CONDITIONALLY SUPPORTED | subject to the size and weight conditions |
| `sv-storage-capacity::armor` | CONDITIONALLY SUPPORTED | subject to the size and weight conditions |
| `sv-storage-capacity::equipment` | CONDITIONALLY SUPPORTED | subject to the size and weight conditions |

Totals: 35 typed definitions — 19 SUPPORTED, 16 CONDITIONALLY SUPPORTED.

## 6. Unresolved items (left pending; not answered here)

1. Registry `printedTablePage` correction and stacking-policy reconciliation (§2.1, §2.3) need a separately approved, versioned registry reconciliation.
2. How a future host evaluator would express functional prerequisites (Intelligence score, power source, activation function, containment, one-handed use, size/weight) is an engineering design question and is not decided here.
3. The exact Quick Draw-related benefit of Silverplate and the exact action for Spring Loaded were not part of the supplied findings and are not paraphrased here; they remain to be recorded if needed.
4. Publisher errata for Dual Gear, Silverplate and Spring Loaded remain unauthenticated and are not applied.
5. Whether any unrepresented host/domain combination should ever become a typed definition is outside this task.
6. A source-backed verdict is not a D-005 lift: no `Blocker lifted` or `Partial lift` row, ledger edit or specification record is proposed here.

## 7. Non-effects

Documentation only. No change to the registry, specification records, status ledger, generated runtime, tests, `swse-rules-decisions-pending.md` or any production module. Invariants: 186 parents, 232 typed definitions, D-005 35 blocked, zero runtime-selectable, `EXECUTOR_NOT_CERTIFIED` enforced. No merge, retarget or G4–G9 authorization.
