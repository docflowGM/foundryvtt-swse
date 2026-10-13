# SWSE Species Canonicalization — Overall Audit and Remediation Roadmap

**As of:** 2026-10-13  
**Repository:** `docflowGM/foundryvtt-swse`  
**Audit branch:** `audit/species-book-by-book-canonical`  
**Disposition:** SOURCE AUDIT DOCUMENTED / PROVENANCE IN PROGRESS / PRODUCTION NOT YET CORRECTED

## Executive assessment

The SWSE species compendium contains both **canonical-data defects** and **uncertain source authority**. The 13-book non-droid screen plus supplemental official source search show that many apparent omissions are tucked away in NPC chapters, official Wizards web PDFs, conversion guides, or the Dawn of Defiance campaign. A separate cluster of 17 playable race profiles is attributed to fan/community rules. **Per project decision, all 17 are MARKED FOR REMOVAL from the canonical selectable species compendium, pending a final original-source and dependency check.** No production file is deleted by this documentation action.

## Verified counts and what they mean

| Metric | Count | Qualification |
|---|---:|---|
| Production species pack records | **161** | Includes Replica Droid, two non-genetic species/profiles, and fan-attributed records |
| Published book titles scanned for biological species | **13 / 14** | Scavenger's Guide to Droids was intentionally excluded |
| Source-audited identities in the canonical rolling JSON | **121** | 119 ordinary non-droid species, 2 special non-genetic profiles |
| Previously unattributed non-droid identities searched separately | **39** | Reconciled in the supplemental matrix, not automatically merged into the rolling JSON |
| Additional official primary published species sources found | **6** | Have source locations, still need full static/sidecar claim entry and tests |
| Official web-only publication leads awaiting primary text | **5** | Attribution only; no official text-certified mechanical claim yet |
| Fan/community-attributed playable species | **17** | **Marked for removal**; deletion not executed |
| Other special / unresolved records | **11** | Do not delete without identifying source or classification |
| Existing documented species audit findings | **302** | 97 CHANGE_REQUIRED; 204 REVIEW_REQUIRED; 1 NO_CHANGE |
| Findings applied / Foundry runtime certified | **0 / 0** | Audit is read-only |

The four provenance categories (6+5+17+11) partition the original 39 identities. They must not be added to the 121 rolling ledger count until the newly verified publications have been reconciled into that ledger. The number of `CHANGE_REQUIRED` findings is a count of source discrepancies, not of defective species actors.

## Six published source recoveries

| Species | Published rules location | Current implication |
|---|---|---|
| Noghri | The Force Unleashed Campaign Guide p.185 | Race block hidden with Imperial/Noghri NPC material; pack source hint and flat skill bonuses require review |
| Geonosian | Official Saga Edition Conversion Guide, Table 1 p.3 | Alternate official ability/flight profile conflicts with pack; do not merge conflicting sources |
| Tusken Raider | Official Saga Edition Conversion Guide, Table 1 p.3 | Base chassis matches; clarify Stealth reroll restrictions |
| Stereb | Dawn of Defiance IX: Sword of the Empire, p.12 | Full official racial block in separate adventure; pack core abilities appear aligned |
| Arcona | Planet Hoppers: Cona, p.2 | Source confirms base bonuses and Scent; extra pack flat skills unproven |
| Nazren | University of Sanbra: The Nazren, printed p.4 | Published ability modifiers and Resilience align with pack |

**Other official web leads:** Amani, Pau'an, Phindian, Polis Massan, Skakoan. These require the original article/PDF racial statistics and a new source-specific comparison; an attributed wiki page is not equivalent to primary text.

## Canonical-compendium removal queue: 17 fan-attributed profiles

**Decision:** `MARKED_FOR_REMOVAL` means remove this playable implementation from the *canonical selectable* species list in a future validated cleanup. It does **not** mean the underlying Star Wars species does not exist, and it does **not** authorize deleting an existing player's actor or replacing it with another species. Preserve an export/archival copy and references first.

| Existing profile | Foundry species ID | Current evidence | Status |
|---|---|---|---|
| Aing-Tii | `species-aing-tii` | Fan-created Aing-Tii playable species; do not confuse with official Force tradition. | **MARKED_FOR_REMOVAL** |
| Anomid | `species-anomid` | Fan conversion from Ultimate Alien Anthology. | **MARKED_FOR_REMOVAL** |
| Anx | `species-anx` | Community species-conversion catalog; no matching published SWSE block checked. | **MARKED_FOR_REMOVAL** |
| Besalisk | `species-besalisk` | Fan conversion from Ultimate Alien Anthology. | **MARKED_FOR_REMOVAL** |
| Chevin | `species-chevin` | Community-listed homebrew playable species; an author credit alone does not confirm WotC publication. | **MARKED_FOR_REMOVAL** |
| Drall | `species-drall` | Fan conversion from Ultimate Alien Anthology. | **MARKED_FOR_REMOVAL** |
| Dressellian | `species-dressellian` | Community fan-sourcebook playable treatment. | **MARKED_FOR_REMOVAL** |
| Gree | `species-gree` | Community species-conversion list, distinct from official Gree lore/technology. | **MARKED_FOR_REMOVAL** |
| Jenet | `species-jenet` | Fan conversion from Ultimate Alien Anthology. | **MARKED_FOR_REMOVAL** |
| Kessurian | `species-kessurian` | Community-created species entry. | **MARKED_FOR_REMOVAL** |
| Kiffar | `species-kiffar` | Community near-Human species profile, not established by official mentions of Kiffar. | **MARKED_FOR_REMOVAL** |
| Koorivar | `species-koorivar` | Clone Wars Saga Edition Fan Sourcebook conversion. | **MARKED_FOR_REMOVAL** |
| Mirialan | `species-mirialan` | Community-authored Mirialan race block. | **MARKED_FOR_REMOVAL** |
| Mustafarian | `species-mustafarian` | Northern/southern Mustafarian fan-sourcebook variants. | **MARKED_FOR_REMOVAL** |
| Muun | `species-muun` | Fan conversion from Ultimate Alien Anthology. | **MARKED_FOR_REMOVAL** |
| Ortolan | `species-ortolan` | Fan New Republic Campaign Guide treatment. | **MARKED_FOR_REMOVAL** |
| Quermian | `species-quermian` | Fan conversion from Ultimate Alien Anthology. | **MARKED_FOR_REMOVAL** |

**Safety gate:** Before physical removal, search for an independently published Wizards SWSE playable *racial mechanics* block. If genuine contrary evidence appears, lift that candidate's removal designation. Then inventory existing world actors, compendium references, selected species IDs, aliases, sidecar rows, variant registries, starting equipment, and CharGen choices. Keep a reversible snapshot and run creation/loading regressions. Keep optional homebrew support, if desired, outside the canonical rules pack—not silently commingled with it.

## Other 11 unresolved cases

| Species | Current research disposition |
|---|---|
| Bardottan | Star Wars species exists; no standalone official Saga Edition playable race block verified |
| Elom | Distinguish Elom from Elomin and the planet name; racial source unproven |
| Gundark | Published beast NPC, not proof of a playable species |
| Hapan | Near-Human lore and modifiers require variant/construction policy |
| Hiss'sssi | Species identity/spelling and rules provenance uncertain |
| Kal-Dexar | Published playable profile not located |
| Kubaz | NPC/lore mentions without confirmed player race rules |
| Nerf (Uplifted) | Uplifted animal/constructed variant requires explicit policy |
| Sith (Pureblood) | Distinguish imported Sith Pureblood from KOTOR Massassi race rules |
| Theelin | Near-Human lore does not automatically authorize fixed modifiers |
| Vaathkree | Unknown Regions provenance claim not yet demonstrated as a published racial block |

Do not conflate **official Star Wars lore** with **official printed SWSE playable game rules**. These 11 are pending classification, *not* members of the 17 removal queue.

## Mechanical findings — examples of highest-risk defects

| Risk | Existing source finding | Why it matters |
|---|---|---|
| Unprinted movement | `GOI-12-01` Nyriaanan | Migrated sidecar grants flight speed that the printed profile does not have |
| Unprinted senses | `GOI-05-01` Gotal | Generic blindsense replaces limited action-based emotional detection |
| Invalid attack modifiers | `SWP-CORE-AQUALISH-01` Aqualish | Always-on +2 melee damage despite absent Core benefit and conditional sidecar text |
| Invalid defense | `SWP-CORE-HUTT-01` Hutt | Unprinted +5 Fortitude typed rule |
| Wrong ability adjustment | `THR-03-01` Mantellian Savrip | Sidecar applies -4 Dexterity where printed penalty is -2 |
| Wrong grant | `JATM-02-01` Celegian | Limited untrained Force telepathy converted into Force Training entitlement |
| Racial feat prerequisites | `UR-12-01` Ebruchi / `UR-17-01` Tof | One-time conditional feats can be improperly granted |
| Wrong data provenance | `GOI-08-01` Neimoidian | `speak` leaked into automatic-language array |
| Alien lore in traits | `UR-16-01` Ssi-Ruuk | Tof descriptive prose accidentally stored as Ssi-Ruuk racial trait |

### Published-book conflicts that must not be auto-merged

Bith (Threats versus Galaxy of Intrigue); Chiss (Force Unleashed/Unknown Regions versus Legacy); Neimoidian (Core versus Galaxy of Intrigue); Krevaaki (Jedi Academy versus Unknown Regions); Barabel (Scum and Villainy versus Galaxy at War); Chadra-Fan (Legacy versus Unknown Regions); and now Geonosian (the official 2007 conversion profile versus the current imported profile). Source-version/variant policy is required before changing these classes.

## Recommended ordered implementation

### Phase A — Finish provenance and classify canonical candidates

1. Fetch and certify the original five remaining Wizards web species sources. Record source, page/section, racial text, and field-by-field pack comparison.
2. Integrate all six newly verified official profiles into the append-only rolling species ledger (not just the discovery report). Audit both sidecars for each; retain printed version conflicts.
3. Review the eleven special/unresolved entries and decide one of: published playable race, printed near-Human/template, monster/NPC-only, explicit optional campaign homebrew, or genuinely unknown.
4. Keep the 17 fan/community-attributed records designated `MARKED_FOR_REMOVAL`. Check original sources one last time for false positives, then prepare a controlled removal manifest with exact IDs and dependencies.

### Phase B — Controlled removal from canonical selection

1. Inventory the 17 IDs in `packs/species.db`, `data/species-traits.json`, `data/species-traits-migrated.json`, species registries, CharGen choice lists, compendium cross-links, existing actor species references and downstream automation.
2. Back up full original records; do not break existing characters/active worlds. Decide whether old characters retain a compatibility shadow, a legacy category, or a GM-approved migration.
3. Remove **only those approved IDs** from default canonical new-character selection and corresponding generated data, using existing V2 authority. Do not delete droid entries, official identities, or unclassified records.
4. Assert removed candidates no longer appear in canonical species selection; retained source references still resolve for saved actors; pack counts/IDs are intentional; unaffected species still load.

### Phase C — Apply published-data fixes in small batches

Start with executable sidecar leaks that create wrong continuous stat bonuses or artificial movement/senses; then repair base stats/languages; then natural weapon damage; then conditional feats and once-per-encounter abilities. Require a published source citation and negative/positive regression test for each patch. No wholesale regenerate-the-pack operation.

### Phase D — Test the Foundry V13/V2 species pipeline

Verify species selection, variant choice, level-one bonus feats, class skills, trained skills, movement modes, vision, innate attacks, Force permissions, condition track effects, once-per-encounter budgets, and existing actor load/save. Reuse the species registry, grant ledger, progression and combat authorities already in the V2 migration. Fix only failing consumers.

### Phase E — Certify and merge

Build a final canonical roster report: each retained playable species has one exact source and page or explicitly approved edition/variant; every excluded fan record has a documented disposition; no duplicate ID or orphaned reference remains. Attach regression evidence to each commit, update ledger `applied` only for validated changes, then merge the audit branch into the planned V2 integration branch through reviewed PRs.

## Acceptance checklist

- `MARKED_FOR_REMOVAL` does not mean `REMOVED`; the initial audit commit must not edit `packs/species.db`.
- All 17 user-designated fan profiles have stable Foundry `_id` values in an explicit removal queue.
- Official/uncertain species are **not** accidentally placed in the removal queue.
- No saved actor breaks, no newly created actors can select a removed canonical species after removal phase, and no other racial entitlement regresses.
- Canonical data decisions must be backed by published SWSE mechanics rather than secondary lore descriptions.
- Historical source findings and source-version conflicts remain auditable.

**Recommendation:** Approve the proposed separation between source research, removal preparation, surgical data fixes, and runtime certification. The highest-risk mistake would be bulk deleting or automatically rewriting 161 species while the Foundry V2 migration is still converging.
