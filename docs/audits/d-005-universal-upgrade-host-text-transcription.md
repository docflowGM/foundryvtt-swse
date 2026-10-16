# D-005 — Universal-upgrade host text: transcription worksheet (T1)

**Status: RESEARCH SKELETON — PAGE-IMAGE VERIFICATION PENDING. Documentation only.** Not a source certification, register resolution, blocker lift, specification record or executable contract. D-005 stays at 35 blocked typed definitions; runtime selectability stays at zero.
**Date:** 2026-10-16. **Baseline:** `main` at `6ecbed3efcb020ce2b23963c2f207014ca32cfad`.
**Scope:** the 15 *Scum and Villainy* Table 2-3 universal-upgrade parents behind the 35 D-005 typed definitions (`hostPrerequisites`, `PENDING_SOURCE_VERIFICATION`). `sv-droidification` is excluded scope (0 typed definitions).

## 1. Evidence status — read first

| Evidence | Status |
|---|---|
| Printed-page images of S&V pp. 40–42 | **Not available to this author.** The owner's message said they would be attached, but nothing arrived in the execution environment. No finding below is page-verified. |
| Owner's page map (Table 2-3 and intro on p. 40; Dual Gear to Secret Compartment on p. 41; Secret Compartment continuation, Silverplate, Spring Loaded, Storage Capacity on p. 42) | Taken from the owner's examination of the PDF scans. Used for the page column only. |
| Repository OCR `reference/sourcebooks/Scum and Villainy_djvu.txt` (SHA-256 `3621af76a89cbc5070d4516a243cb7e4520e9c26ce9a8ca8749b6ac4df86414e`) | **OCR only, badly garbled in this region.** Used solely to produce hedged "OCR leads". It is not published-rule evidence and is not authority under the source-authority rules. |
| Registry / generated runtime | Used for IDs and current assignments only. Its `display.summary` text is an engineering note, not source. |

Consequence: every classification below is `PENDING_IMAGE_VERIFICATION`. Nothing here should be copied into the register, ledger or specification records.

## 2. Discrepancies found without needing the images

1. **Printed-page reference.** The registry records `printedTablePage: 41` for all 15 parents. The owner's page map places Table 2-3 and its introduction on p. 40, individual descriptions on pp. 40–42. The registry value is therefore likely wrong or is being used to mean something else. **Not corrected here**; the immutable registry changes only through a separately approved, versioned reconciliation.
2. **Register wording.** `swse-rules-decisions-pending.md` D-005 cites "for example p. 41 for Cheater". By the owner's map Cheater is on p. 40.
3. **Registry summaries assert host claims without a source.** Examples: Cheater "applicability to weapons/armor unlikely"; Memory Upgrade "device-only". These must not be used as evidence for or against any domain.
4. **Counts reconcile.** 15 parents, 35 typed IDs (equipment 15, weapon 11, armor 9), all also in the D-015 set. The register's "16 upgrades" includes Droidification, which is out of scope.
5. **General introduction (lead, to confirm from p. 40).** The OCR of the "Universal Upgrades" introduction is partly legible and appears to say universal upgrades suit a wide range of gear, with most applicable to any type of equipment, though some have extra restrictions when applied to armor or weapons. If confirmed, it makes per-upgrade restrictions the deciding text; it does not by itself make any host eligible.

## 3. Concepts to keep separate while transcribing

- **Eligible host:** which kinds of item may receive the upgrade.
- **Conditional effect:** what the upgrade does on one kind of host versus another (this is not eligibility).
- **Stacking / repeatability:** whether it can be taken more than once on one host.
- **Slot accounting:** already table-verified; out of scope for D-005.

## 4. Per-parent worksheet

Fields 1–8 are those requested for T1. "OCR lead" text is hedged and is never to be promoted without the printed page.

### Cheater (`sv-cheater`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Cheater. Owner-reported printed page: **40** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-cheater`; D-005 typed IDs (1): `sv-cheater::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW): Description is a small gambling-cheat device; OCR of the host sentence is unreadable. Registry/equipment-only assignment cannot be assessed from OCR. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images.  |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: equipment. D-005 blocks: equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Gambling-device modification; applicability to weapons/armor unlikely.") is an engineering note, not source. |

### Cloaked (`sv-cloaked`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Cloaked. Owner-reported printed page: **40** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-cloaked`; D-005 typed IDs (3): `sv-cloaked::weapon`, `sv-cloaked::armor`, `sv-cloaked::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW-MEDIUM): OCR suggests effects are described separately for weapons and for armor (e.g. a Stealth/Perception effect), i.e. a conditional effect per host type. Which hosts are eligible is not recoverable. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: differences between weapon, armor and other-equipment effects. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Obscures evidence of the item; armor-specific effect differs.") is an engineering note, not source. |

### Dual Gear (`sv-dual-gear`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Dual Gear. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-dual-gear`; D-005 typed IDs (1): `sv-dual-gear::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW): OCR suggests two pieces of equipment are built into one item and the full price of both is paid. The size and simultaneous-use limits the owner flagged are not legible. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: host-size and simultaneous-use restrictions. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: equipment. D-005 blocks: equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Combines two gear functions, limits to be checked.") is an engineering note, not source. |

### Electrograpple Handle (`sv-electrograpple-handle`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Electrograpple Handle. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-electrograpple-handle`; D-005 typed IDs (2): `sv-electrograpple-handle::weapon`, `sv-electrograpple-handle::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests it is attuned to an electrograpple glove and is "most often used on a weapon", with a throwing/disarm-related benefit. Whether "most often" is an eligibility rule or an example is the exact question to settle from the page. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: weapon examples vs. actual eligibility restrictions. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, equipment. D-005 blocks: weapon, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Magnetic attunement to an electrograpple glove.") is an engineering note, not source. |

### Environmental Sealing (`sv-environmental-sealing`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Environmental Sealing. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-environmental-sealing`; D-005 typed IDs (3): `sv-environmental-sealing::weapon`, `sv-environmental-sealing::armor`, `sv-environmental-sealing::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW-MEDIUM): OCR suggests it protects against environmental conditions and mentions fire-based weapons as a contrast. No legible host restriction. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images.  |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Environment-resistant item sealing; restrictions apply.") is an engineering note, not source. |

### Extra Power Source (`sv-extra-power-source`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Extra Power Source. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-extra-power-source`; D-005 typed IDs (3): `sv-extra-power-source::weapon`, `sv-extra-power-source::armor`, `sv-extra-power-source::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests the host must use energy cells or power packs, and that the modification can be taken more than once, adding another energy cell each time. Repeatability and its limit must be confirmed from the page. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: energy cell / power pack host requirement; repeatability. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Eligible energy-powered item receives extra energy.") is an engineering note, not source. |

### Memory Upgrade (`sv-memory-upgrade`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Memory Upgrade. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-memory-upgrade`; D-005 typed IDs (1): `sv-memory-upgrade::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests the host must have an Intelligence score (e.g. a computer), and that memory upgrades cannot be installed on droids. Both are leads only. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: Intelligence-score requirement and printed droid exclusion. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: equipment. D-005 blocks: equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Device Intelligence/memory operation; device-only.") is an engineering note, not source. |

### Memory Upgrade, Advanced (`sv-memory-upgrade-advanced`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Memory Upgrade, Advanced. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-memory-upgrade-advanced`; D-005 typed IDs (1): `sv-memory-upgrade-advanced::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW-MEDIUM): OCR suggests it is an advanced version that also adds to Intelligence, building on the basic upgrade. Whether it requires the basic upgrade is not legible. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: same Intelligence/droid questions as Memory Upgrade. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: equipment. D-005 blocks: equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Advanced tier of device-memory upgrade.") is an engineering note, not source. |

### Miniaturized (`sv-miniaturized`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Miniaturized. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-miniaturized`; D-005 typed IDs (3): `sv-miniaturized::weapon`, `sv-miniaturized::armor`, `sv-miniaturized::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests the item weighs half as much and is one size smaller, and that a melee weapon loses one damage step. A weapon-specific drawback is a conditional effect, not necessarily a host restriction. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images.  |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Size and weight change; weapon damage drawback may apply.") is an engineering note, not source. |

### Recognition System (`sv-recognition-system`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Recognition System. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-recognition-system`; D-005 typed IDs (3): `sv-recognition-system::weapon`, `sv-recognition-system::armor`, `sv-recognition-system::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW-MEDIUM): OCR suggests the item identifies its owner and a Use Computer check bypasses it; the owner can deactivate it with a swift action. No legible host restriction. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images.  |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Item user-lock; required item activation/security interface.") is an engineering note, not source. |

### Remote Activation (`sv-remote-activation`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Remote Activation. Owner-reported printed page: **41** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-remote-activation`; D-005 typed IDs (3): `sv-remote-activation::weapon`, `sv-remote-activation::armor`, `sv-remote-activation::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW-MEDIUM): OCR suggests activation by comlink or similar device, with a Use Computer check for code security. No legible host restriction. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images.  |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Remote activation for eligible devices with an activation mode.") is an engineering note, not source. |

### Secret Compartment (`sv-secret-compartment`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Secret Compartment. Owner-reported printed page: **41-42** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-secret-compartment`; D-005 typed IDs (3): `sv-secret-compartment::weapon`, `sv-secret-compartment::armor`, `sv-secret-compartment::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests it works like Storage Capacity: gear smaller than the host can be hidden inside, with Perception DCs (20 / 25) to find it. The relative-size rule is only partly legible. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: capacity and relative-size requirements. Spans pp. 41-42. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Hidden compartment, size-dependent storage.") is an engineering note, not source. |

### Silverplate (`sv-silverplate`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Silverplate. Owner-reported printed page: **42** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-silverplate`; D-005 typed IDs (3): `sv-silverplate::weapon`, `sv-silverplate::armor`, `sv-silverplate::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility LOW): OCR suggests a coating that gives DR, with wording that differs for armor vs. other gear. The details are unrecoverable from OCR. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: general-gear applicability vs. armor-specific effects. Errata candidate exists (unauthenticated; do not apply). |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Special coating; object DR and other item effects.") is an engineering note, not source. |

### Spring Loaded (`sv-spring-loaded`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Spring Loaded. Owner-reported printed page: **42** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-spring-loaded`; D-005 typed IDs (2): `sv-spring-loaded::weapon`, `sv-spring-loaded::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests it applies to equipment designed to be held in one hand, allowing it to be drawn as a swift action. Confirm the one-hand requirement and whether it is the only host condition. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: one-handed equipment requirement. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, equipment. D-005 blocks: weapon, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Handheld equipment deployment as swift; host restrictions.") is an engineering note, not source. |

### Storage Capacity (`sv-storage-capacity`)

| Field | Content |
|---|---|
| 1. Canonical name / printed page | Storage Capacity. Owner-reported printed page: **42** (not yet verified from page images by this author). Registry says `printedTablePage: 41`. |
| 2. IDs | Parent `sv-storage-capacity`; D-005 typed IDs (3): `sv-storage-capacity::weapon`, `sv-storage-capacity::armor`, `sv-storage-capacity::equipment`. |
| 3. Published host-eligibility language (paraphrase) | **NOT YET VERIFIED.** OCR lead (legibility MEDIUM): OCR suggests smaller gear can be carried in a compartment, with a size-relative limit (at least one size smaller / weight limit). Exact limits not legible. |
| 4. Explicit requirements / exclusions | NOT YET VERIFIED from page images. Owner-flagged: capacity and relative-size requirements. |
| 5. Stacking / repeatability / max per host | NOT YET VERIFIED. Registry: stacking `UNVERIFIED`, max per host `null` (neither is sourced). |
| 6. Cross-references / ambiguity | None recorded yet. |
| 7. Classification | **PENDING_IMAGE_VERIFICATION** (will become EXPLICIT / SILENT / AMBIGUOUS only from the printed page). |
| 8. Registry domain assignment | Registry typed domains: weapon, armor, equipment. D-005 blocks: weapon, armor, equipment. Registry value `CONDITIONAL_UNVERIFIED`. Support: **NOT ESTABLISHED** (pending images). Registry summary text ("Capacity for smaller equipment; host restrictions.") is an engineering note, not source. |

## 5. Completion criteria for the image-based pass

1. Open S&V pp. 40–42 (PDF SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`) and record rendered-page hashes, as #1051 did.
2. For each of the 15 parents, replace fields 3–8 with a paraphrase of the printed text and classify EXPLICIT, SILENT or AMBIGUOUS. Never infer a host from the word "universal", example devices or the registry summaries.
3. Confirm or correct the owner's page map and the registry `printedTablePage` discrepancy (§2.1) as a finding only.
4. Reconcile all 35 typed IDs: for each, state whether the registry domain is supported, contradicted or not established.
5. Keep ambiguities in this file for owner review; make no register entry, ledger, specification-record, generated-file or test change in this PR.
6. Do not authenticate or apply publisher errata (Dual Gear, Silverplate and Spring Loaded have unauthenticated candidates).

## 6. Non-effects

No registry, specification-record, status-ledger, generated-runtime, test, register or production change. D-005 remains 35 blocked; D-014/D-013 and `EXECUTOR_NOT_CERTIFIED` are unaffected; runtime-selectable count stays zero. No merge, retarget or G4–G9 authorization.
