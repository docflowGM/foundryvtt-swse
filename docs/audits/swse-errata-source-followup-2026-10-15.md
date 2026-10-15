# SWSE V2 — Errata provenance and direct sourcebook follow-up (2026-10-15)

**Status: independent source-research note, NOT a component certificate, register lift, mechanical ruling, or implementation authorization.**
**Scope:** Q-003, E-Q1–E-Q3, D-008, D-009, D-012, D-015 and KOTOR Improved Energy Cell; additive follow-up to the errata audit in merged PR #1048. No original publisher-hosted January 2009 errata page was authenticated in this pass. No immutable registry, ledger, specification record, runtime, Phase 1a contract, or game behavior may change because of this note alone.

## Evidence taxonomy (deliberately not interchangeable)

1. **BOOK_PAGE_VISUALLY_VERIFIED** — visually read directly from the Project Owner's uploaded scan of the published SWSE sourcebook, using its printed page number. This certifies what that *printing* says, including contradictions and errors; it does not certify that a later erratum has been adopted.
2. **MIRRORED_PUBLISHER_PAGE_CANDIDATE** — an indexed third-party-hosted PDF that visibly advertises a Wizards of the Coast original URL and an April 2010 print timestamp. The URL/footer and matching transcription strengthen provenance but do **not** establish authenticated publisher-original custody. No replacement text from this artifact is adopted here.
3. **SECONDARY_ERRATA_TRANSCRIPTION** — third-party text reproducing a purported official correction. Locates a correction candidate only.
4. **ENGINEERING_IMPACT_INFERENCE** — consequences for current repository contracts if an authenticated correction is adopted, not a source-derived rule.

## Source artifacts and reproducibility

- **Directly inspected published pages:** *Scum and Villainy* printed pp. **24, 37, 41, 42, 44, 48**; *Knights of the Old Republic Campaign Guide* printed **p. 75**. Both sourcebook scans are in the Project Owner's supplied PDF collection. These pages were rendered to images and inspected, not accepted as OCR-only text.
- **S&V purported Wizards webpage capture, Jan 2009 update (mirrored):** [three-page PDF](https://files.spawningpool.net/docs/Vault2.0.-.TTRPG-Gamebooks/Star%20Wars%20%5Bmulti%5D/SWD20/Saga/SWD20%20%28Saga%29%20-%20Scum%20and%20Villainy%20-%20Errata.pdf). Indexed text contains the original URL `http://www.wizards.com/default.asp?x=starwars/article/SnVerrata,0` and a **15 Apr 2010** print timestamp. A live publisher-hosted or independently archived copy was **not retrieved/authenticated**; mirrored PDF's exact bytes and SHA-256 were **not obtained**. Its January 2009 date is the *document's claimed revision date*, not the third-party site's upload date.
- **S&V and KOTOR secondary transcription:** [RPG Fandom, Saga Edition Official Errata](https://rpg.fandom.com/wiki/Star_Wars_Saga_Edition_Official_Errata).
- **KOTOR errata reproduction:** [Scribd document](https://www.scribd.com/doc/62546575/Star-Wars-Saga-Edition-Knights-of-the-Old-Republic). KOTOR publisher-original provenance **not established** here.
- **Core Saga Edition earlier publisher-page capture:** [October 2008 Core errata PDF](https://www.swse.xphilesrealm.com/Errata/SWRGP-Errata.pdf), showing original `wizards.com/default.asp?x=starwars/article/sagaederrata` in the capture. It is also third-party-hosted.

No copy of an unauthenticated errata artifact is checked into the repository. A link, indexed snippet or fan transcription must not be promoted to source-authenticated status by a generator or implementer.

## Findings and precise conclusions

### F-01 — Armor stock upgrade-slot rule is internally contradictory *before* errata

**Book pages:** S&V p. 37 (Upgrade Slots); p. 44 (Armor Upgrades introduction); both BOOK_PAGE_VISUALLY_VERIFIED.

- Page **37** says one stock upgrade slot for equipment generally and then specifies two slots for medium armor and three for heavy armor.
- Page **44** explicitly says ordinary armor has one free upgrade slot and powered armor has two free slots, without an armor-weight-class progression. The armor chapter therefore contradicts the p. 37 medium/heavy sentence **within the same printing**.
- The mirrored January 2009 S&V errata candidate reports that the **second sentence** of p. 37's upgrade-slots paragraph is replaced with a powered-armor two-slot exception and a name/description-based definition of powered armor.
- **Reading if authenticated:** because the second p. 37 sentence is the medium/heavy progression, replacing rather than appending it would leave **ordinary stock armor = 1 free slot regardless of light/medium/heavy**, and **powered armor = 2**. This inference also reconciles the printed p. 44 statement. It is NOT an adopted correction yet.
- **ENGINEERING_IMPACT_INFERENCE:** Phase 1a `scripts/engine/customization/modification-slot-authority.js` currently carries `armor:light=1`, `armor:medium=2`, `armor:heavy=3`. This may require a reviewed Phase 1a contract amendment with source-authentication evidence and regression tests, **not just a D-012 exception for powered armor**. A trust/powered flag alone does not fix an incorrect non-powered baseline.
- **Open:** Authenticate the errata original; verify precise replacement and powered classification and reconcile named exceptional armor such as beskar'gam. Do not replace the stock-capacity table or lift D-012 in this PR.

### F-02 — Tech Specialist additional device slot is already PRINTED in S&V

**Book page:** S&V **p. 48**, Tech Specialist sidebar (BOOK_PAGE_VISUALLY_VERIFIED).

The sidebar establishes that Tech Specialist can add **one upgrade slot to a device**, **once**. For purposes of the feat, **weapons, armor and vehicles are devices; droids are characters**. The device can also benefit from the printed category applicability clarifications. This is *direct published book evidence*, not merely a January 2009 errata candidate.

- **Correction to research scope:** In the PR #1048 errata audit, the extra-device-slot option is appropriately absent from the current 232 typed definitions, and an unrelated `sog-tech-improved-accuracy::weapon` flag was identified as incorrect; those conclusions remain. However, the *rule itself* does not require errata authentication as its only evidence: S&V p. 48 should be the primary citation for D-008's extra-slot authority.
- **ENGINEERING_IMPACT_INFERENCE:** `tech_device_upgrade_slot` already exists in the separate Tech Specialist service. Correct handling still requires trusted host classification, unique application, certified slot projection, relevant consumer mapping, specification and blocker-lift review. Droid/vehicle procedures are outside this equipment-modifications V2 scope.
- **Not concluded:** that the service implementation is correct, that a Tech Specialist trait automatically becomes a canonical registry typed-definition entry, or that D-008 can be lifted now.

### F-03 — Superior Protective Armor printed +1, corrected +2 is still errata-dependent

**Book page:** S&V **p. 24**, Table 1-5 Superior Tech (BOOK_PAGE_VISUALLY_VERIFIED).

The printed table's Protective Armor benefit is **+1**; the S&V January 2009 mirrored errata and fan transcription both identify a change to **+2** armor bonus to Reflex Defense.

- The current specialized service's `superior_armor_protective` has a +2 trait, but this is **not** proof that the erratum has been authenticated.
- This trait is **outside** the 232-definition canonical registry (D-009), so there is no per-typed-ID CSV row to change. D-009 remains open.
- Full Superior Tech trait set needs separate provenance and application checks.

### F-04 — KOTOR Improved Energy Cell printed slot 2; errata-candidate slot 1

**Book page:** KOTOR **p. 75**, Table 5-6 (BOOK_PAGE_VISUALLY_VERIFIED).

Printed Improved Energy Cell consumes **2 upgrade slots**; KOTOR's January 2009 *secondary reproduction* identifies **1 slot** as a correction. The published text explicitly describes the accessory slot costs as used with the S&V gear-enhancement system. That connection alone does not establish Table 2-2 installation applicability (Q-027 remains unruled).

- `kotor-accessory-improved-energy-cell::weapon` is the one affected canonical typed-definition.
- Keep immutable registry v1.5 and live cost claims unchanged pending authenticated KOTOR errata + separately authorized versioned reconciliation.
- Do **not** silently rewrite the 2-slot published-printing claim to 1 or infer a 0-slot accessory.

### F-05 — Dual Gear and Silverplate / Spring Loaded

**Book pages:** S&V **pp. 41–42** (BOOK_PAGE_VISUALLY_VERIFIED).

- Printed Dual Gear joins equipment but does not state the explicit independent-power-sources restriction. The S&V January 2009 mirrored errata says combined powered items must retain separate power sources. This is an **errata-dependent host constraint candidate** for `sv-dual-gear::equipment`.
- Printed Silverplate's last sentence deals with Quick Draw while Spring Loaded appears to lack it; the mirrored errata says move that final sentence from Silverplate to Spring Loaded. This is a **description and effect assignment candidate**, affecting Silverplate's three domain definitions and Spring Loaded's two.
- Neither candidate authorizes changes to the ledger or automation in this PR.

### F-06 — Core Mechanics errata adds a narrow assistance exception

**Source:** October 2008 Core errata *mirrored original-page capture*, p. 1 of 8; original Core book Mechanics pp. 68–70 remain primary for its base skill rules.

The Core errata states that a character **untrained in Mechanics may still use Aid Another** on Mechanics checks. This is an important caveat for D-015; it does **not** demonstrate that an untrained character can personally make a Trained Only equipment-installation check. The Core errata also has corrections under Mechanics/Jury-Rig that warrant full separate Q-003 search.

Do not use this sentence to waive installation training; no skill-check executor is certified.

## Actionable reconciliation order — no implementation authorization

1. Obtain and authenticate a historically preserved *publisher* version or independently verified facsimile of **both** January 2009 errata notices, recording publisher URL, document revision, pagination, original wording, correction operation (replace/add/move), and evidence hash. Where authentication fails, retain `ERRATA_CANDIDATE`.
2. Reconcile F-01 p. 37 replacement against S&V p. 44 and against the Phase 1a stock-capacity contract; run explicit powered/nonpowered and light/medium/heavy cases in a **separate proposed amendment PR** before runtime use.
3. Route **F-02** to D-008's printed-source examination without using the misattached CSV flag and without adding a 233rd typed definition.
4. Treat F-03 through F-05 as candidate corrections to distinct services, typed IDs and descriptions; do not adopt old fan compilations as canonical.
5. Finish the Q-003 errata coverage matrix, including whether original publisher errata change S&V p. 39 Table 2-2, Table 2-3, Core Mechanics rules, and any other title feeding V2. The sources retrieved so far **do not justify a negative completeness claim**.
6. Continue per-definition Q-018–Q-020 component certification under the normal ledger/specification/lift mechanism, separate from this source research.

## Governance and non-effects

- This note is not `SOURCE_VERIFIED` in the **repository component-status** sense: book-page visual checks are research evidence, not completed specification rows.
- **No blocker lift** (including D-008, D-009, D-012, D-013, D-014, D-015); **no changes** to registry v1.5, runtime/ledger, schema, spec records, generator, workbench, Foundry actor/items, or Phase 1a baseline.
- Existing owner-policy decisions for Q-021–Q-024, Q-026, Q-029 and template/canonical-only handling remain in effect, not affected by this source note.
- No G4–G9 or G6 executor implementation authorized. No merge authorization.
