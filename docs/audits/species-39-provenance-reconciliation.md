# SWSE — Supplemental Species Provenance Reconciliation (39 Records)

**Audit date:** 13 October 2026  
**Repository:** `docflowGM/foundryvtt-swse`  
**Branch:** `audit/species-book-by-book-canonical`  
**Scope:** The 39 non-droid species identities present in `packs/species.db` but missing from the preceding 121-identity species source audit.

## Canonical-compendium cleanup decision — 17 marked for removal

**Project decision (October 13, 2026):** All 17 species records attributed to fan/community-created playable SWSE mechanics are now **`MARKED_FOR_REMOVAL`** from the official/canonical player-selectable species compendium. This is a planned controlled removal, **not an executed deletion**. Before removal, verify contrary official evidence, resolve actor/compendium/sidecar dependencies, archive originals and test saved-character compatibility. The 6 official primary records, 5 official-source leads and 11 special/unresolved records are **not** marked for removal. See the [overall audit and next steps](species-audit-overall-roadmap.md).

## Official Clone Wars versus fan-sourcebook cross-check

The [Clone Wars source recheck](species-clone-wars-canonical-vs-fan-recheck.md) inspected the **actual 2009 Wizards hardcover** and differentiated it from the Fandom site's **Clone Wars Saga Edition Fan Sourcebook**. Koorivar, Mustafarian, Muun and Ortolan have the latter's fan-published playable rules; their setting mentions do not certify their rules. No standalone playable traits block was found for any of the 17 marked-for-removal records in the Wizards hardcover. **All 17 removal flags remain; no data has been deleted.**

## Result

| Evidence class | Records | Interpretation |
|---|---:|---|
| Original official SWSE source inspected | **6** | Primary racial rules block or official conversion table located |
| Wizards web-enhancement attribution; primary copy pending | **5** | Strong publication lead, not yet static rules certification |
| Community/fan conversion attribution | **17** | Not evidence of official SWSE publication; usable only by homebrew policy |
| Ambiguous, non-playable or unverified origin | **11** | No independently confirmed official player species block yet |
| **Total** | **39** | No production records removed or modified |

An original book sweep limited to species chapters is insufficient: published SWSE race rules also occur alongside NPC entries and in separate Wizards PDFs and web enhancements. A verified **alternate published profile** must not be blended with another official race profile just because the race has the same name.

## Six directly verified official source locations

| Species | Published source | Finding |
|---|---|---|
| Noghri | [The Force Unleashed Campaign Guide p.185](https://github.com/docflowGM/foundryvtt-swse) | Published species-traits sidebar in Imperial/Noghri material, outside the species chapter. |
| Geonosian | [Saga Edition Conversion Guide, table 1, p.3](https://www.swse.xphilesrealm.com/SWRPG_Saga_Conversion.pdf) | Official WotC conversion: different racial ability profile than current pack; preserve as an alternate source. |
| Tusken Raider | [Saga Edition Conversion Guide, table 1, p.3](https://www.swse.xphilesrealm.com/SWRPG_Saga_Conversion.pdf) | Official WotC race conversion; verify Stealth reroll wording before changing pack. |
| Arcona | [Planet Hoppers: Cona, p.2](https://swse.xphilesrealm.com/Planet%20Hoppers_%20Cona.pdf) | Original Wizards text: WIS -2, CHA +2; Medium; Fortitude +2; Scent within 10 sq; Basic+Arconese. Pack static profile matches; extra +2 Initiative/Perception still requires separate provenance. |
| Nazren | [The University of Sanbra Guide to Intelligent Life: The Nazren, printed p.4](https://www.swse.xphilesrealm.com/WizardsOfTheCoast/Univ_Sanbra_Nazren.pdf) | Original Wizards text: STR+2 CON+2 DEX-2 CHA-2, Medium/6, Basic+Nazren; once/encounter Resilience protects condition track by one step. Pack static fields match. |
| Stereb | [Dawn of Defiance IX: Sword of the Empire, p.12](https://swse.xphilesrealm.com/Dawn%20of%20Defiance/pdf/SW_DD_09_Sword_of_the_Empire.pdf) | Full published Stereb race sidebar in a free official adventure, outside supplied hardbacks. |

**Noghri:** The Force Unleashed p.185 prints Small, speed 4, DEX +2 / WIS +2 / CHA −4, Honoghran, conditional Running Attack, Primitive and Scent. The current pack largely matches, but its `source: Threats` hint and flat `+2 Stealth` / `+2 Survival` fields are not supported by that block. Flag for other-source/consumer review rather than deleting automatically.

**Geonosian:** The original Wizards *Saga Edition Conversion Guide* table lists STR +2 / INT −2 / WIS −2 / CHA −2 and fly speed 8; the pack lacks the WIS penalty and stores its flying trait differently. This is a **published-source conflict**, not an approved production correction.

**Tusken Raider:** The original conversion table supports CON +2 / INT −2 / WIS −2 and both Stealth and Survival rerolls. Check whether the pack's more restricted 'Stealth checks to sneak' wording is intentional or erroneous.

**Stereb:** The race block is in *Dawn of Defiance IX*, a separate Wizards PDF adventure; the pack contains its major stats and traits. No actor or trait-sidecar runtime proof is claimed.

## Five official web-source leads (original article still required)

| Species | Credited Wizards source | Index/evidence |
|---|---|---|
| Amani | Wizards Star Wars Miniatures Previews (Amani Scout / The Fringe) | [Reference](https://swse.fandom.com/wiki/Amani) |
| Pau'an | Wizards web enhancement: The Pau'ans (Rodney Thompson) | [Reference](https://swse.fandom.com/wiki/The_Pau%27ans) |
| Phindian | Planet Hoppers: Phindar (Eric Cagle) | [Reference](https://swse.fandom.com/wiki/Phindian) |
| Polis Massan | Clone Wars Enhancement 1: Polis Massan (Gary Astleford) | [Reference](https://swse.fandom.com/wiki/Polis_Massan) |
| Skakoan | Planet Hoppers: Skako (Eric Cagle) | [Reference](https://swse.fandom.com/wiki/Skakoan) |

These are **attributed** to Wizards-origin articles by the community index. For exact racial rules and reliable source certification, retrieve the original Wizards article, archival copy, or original downloadable rules file first. Do not treat a secondary wiki transcription as publisher-primary evidence.

## Seventeen community/fan-attributed playable profiles

| Species | Community provenance | Evidence |
|---|---|---|
| Aing-Tii | Fan-created Aing-Tii playable species; do not confuse with official Force tradition. | [Community attribution](https://swse.fandom.com/wiki/Aing-Tii) |
| Anomid | Fan conversion from Ultimate Alien Anthology. | [Community attribution](https://swse.fandom.com/wiki/Anomid) |
| Anx | Community species-conversion catalog; no matching published SWSE block checked. | [Community attribution](https://swse.fandom.com/wiki/Species) |
| Besalisk | Fan conversion from Ultimate Alien Anthology. | [Community attribution](https://swse.fandom.com/wiki/Besalisk) |
| Chevin | Community-listed homebrew playable species; an author credit alone does not confirm WotC publication. | [Community attribution](https://swse.fandom.com/wiki/Chevin) |
| Drall | Fan conversion from Ultimate Alien Anthology. | [Community attribution](https://swse.fandom.com/wiki/Drall) |
| Dressellian | Community fan-sourcebook playable treatment. | [Community attribution](https://swse.fandom.com/wiki/Species) |
| Gree | Community species-conversion list, distinct from official Gree lore/technology. | [Community attribution](https://swse.fandom.com/wiki/Species) |
| Jenet | Fan conversion from Ultimate Alien Anthology. | [Community attribution](https://swse.fandom.com/wiki/Jenet) |
| Kessurian | Community-created species entry. | [Community attribution](https://swse.fandom.com/wiki/Kessurian) |
| Kiffar | Community near-Human species profile, not established by official mentions of Kiffar. | [Community attribution](https://swse.fandom.com/wiki/Kiffar) |
| Koorivar | Clone Wars Saga Edition Fan Sourcebook conversion. | [Community attribution](https://swse.fandom.com/wiki/Koorivar) |
| Mirialan | Community-authored Mirialan race block. | [Community attribution](https://swse.fandom.com/wiki/Mirialan) |
| Mustafarian | Northern/southern Mustafarian fan-sourcebook variants. | [Community attribution](https://swse.fandom.com/wiki/Mustafarian%2C_Northern) |
| Muun | Fan conversion from Ultimate Alien Anthology. | [Community attribution](https://swse.fandom.com/wiki/Muun) |
| Ortolan | Fan New Republic Campaign Guide treatment. | [Community attribution](https://swse.fandom.com/wiki/Ortolan) |
| Quermian | Fan conversion from Ultimate Alien Anthology. | [Community attribution](https://swse.fandom.com/wiki/Quermian) |

These classifications concern the *specific racial mechanics currently imported*, not whether the species exists in Star Wars lore. **Per project policy, all 17 are marked for removal from the canonical player-selectable species compendium.** An optional homebrew archive may be retained separately only if desired; their continued appearance in the canonical list is not the target state.

## Eleven unresolved/special classifications

| Record | Why it is not yet a certified SWSE playable species |
|---|---|
| Bardottan | Known Star Wars species, but no official SWSE player racial block directly verified. |
| Elom | Elom species ≠ planet Elom ≠ Elomin; no independent Elom racial block located. |
| Gundark | Official beast/creature statistics do not confer playable species features. |
| Hapan | Galaxy of Intrigue discusses Hapan near-Human physiology; no standalone racial rules profile verified. |
| Hiss'sssi | Pack identity/spelling and original mechanical source remain unverified. |
| Kal-Dexar | No matching published playable racial block located in supplied sources. |
| Kubaz | Lore and NPC appearances not enough to certify a playable SWSE profile. |
| Nerf (Uplifted) | Uplifted animal profile requires explicit species-creation/homebrew provenance. |
| Sith (Pureblood) | Do not equate automatically with published Massassi racial profile. |
| Theelin | Near-Human lore/variant examples do not establish fixed packet of racial modifiers. |
| Vaathkree | Pack points to Unknown Regions, but independent full playable species block not verified. |

## Reconciliation and next gates

1. **Primary-source recovered:** 6 / 39. **Still lacking independently inspected official racial-rule text:** 33 / 39, of which 5 have especially promising publisher-web leads.
2. **Do not change production:** No `packs/species.db`, normal/migrated trait sidecars, CharGen or runtime code should be modified from this provenance research alone.
3. **Verify additional article texts:** Retrieve original Wizards files for the five remaining web leads; record exact printed/page/section locator and compare all pack fields and sidecars.
4. **Keep source-specific variants separate:** Geonosian is already an example. Reconcile the competing printed profiles before changing its race modifiers.
5. **Prepare removal:** All 17 fan-attributed playable conversions are `MARKED_FOR_REMOVAL`; check primary-source counterevidence and actor/sidecar/registry dependencies before actual removal. Distinguish near-Human variants, NPC creatures, and unresolved rules from this set.
6. **Runtime later:** Grant timing, conditions, vision, skill access, feats and movement still require actor tests after a surgical fix is authorized.

**Boundary:** This is a supplementary research/discovery report; it does not retroactively certify all 161 species records or close the existing unresolved sourcebook discrepancy findings.

**Primary PDF text verification addendum:** Arcona and Nazren were promoted from attributed-web leads after checking their original archived Wizards articles. Their race stat blocks agree with the pack's core species attributes. Source-PDF visual screenshot retrieval was unavailable, so this is a published-text comparison, not a visual-layout or runtime certification.

---

## Removal decision schema v2 (audit only)

**Decision:** All **17 fan-attributed playable SWSE profiles** remain `MARKED_FOR_REMOVAL` from the canonical selectable species compendium. **Zero removed.** The underlying species' existence in Star Wars lore is not disputed by this designation. The authoritative [39-record JSON matrix](../../data/audits/species-39-provenance-reconciliation.json) now has `schemaVersion: 2`, an explicit `removalDecisionSchema`, and a new `removalReadiness` object on **only** those 17 candidates.

| New field under `removalReadiness` | Initial value | Meaning |
|---|---|---|
| `sourceCountercheck` | `PENDING` | Last check for official WotC SWSE playable rules |
| `dependencyAudit` | `PENDING` | Check species pack, both sidecars, registries, references and actors |
| `existingActorPolicy` | `UNDECIDED` | Determine how existing player actors can continue loading |
| `archiveSnapshot` | `NOT_CREATED` | Verified backup and rollback contents |
| `implementationAuthorization` | `NOT_AUTHORIZED` | Distinguish a removal marking from permission to implement |
| `implementationCommit` | `null` | Future commit documenting the implemented change |
| `regressionVerification` | `NOT_RUN` | Future CharGen selection and saved-actor tests |
| `rollbackReference` | `null` | Future archive/ref for recovery |

**Retained existing fields:** `foundryId` (stable identity), `provenanceStatus`, `sourceOrLead`, `evidenceUrl`, `canonicalCompendiumDisposition`, `removalExecuted`, `removalScope`, `removalReason`, and `cloneWars2009SourceRecheck`. No existing evidence was replaced.

**Runtime boundary:** Current `SpeciesRegistry._loadFromCompendium()` enumerates every compendium document, and `SpeciesStep` obtains its choices through `SpeciesRegistry.getAll()`. These audit-only flags are not read there and therefore **do not hide or delete any species**. Do not modify `template.json` or create a new species registry merely to store cleanup decisions. A separately approved surgical production patch must handle selection filtering/removal and existing character compatibility.

**Validation invariants:** 39 matrix records; 17 candidates with community-attributed playable mechanics, 22 not marked; no record has `removalExecuted:true`; all 17 readiness statuses remain pending/not authorized; no species records or sidecar rule files modified.
