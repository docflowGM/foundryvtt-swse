# SWSE Species — Rolling Book-by-Book Canonical Audit

**Status:** Core reviewed; Rebellion Era species feats reconciled (identity only).  
**Branch:** `audit/species-book-by-book-canonical`  
**Machine ledger:** `data/audits/species-book-by-book-rolling.json`  
**Source of production truth:** existing `packs/species.db` / `SpeciesRegistry` with current supplementary rule consumers; these files have **not** been changed.

## Operating policy

1. Audit **one sourcebook at a time**, using uploaded TXT for search and the actual published PDF for ambiguous text/table rules.
2. **Every species examined gets its own record even when no edit is needed**; use `NO_CHANGE`. `NO_CHANGE` means no correction identified in the audited scope, **not** that Foundry runtime was tested.
3. Where a discrepancy is proven, record **the exact existing file, field/trait, published source, problem and proposed surgical change**. Corrections remain pending until applied and tested.
4. When an additional source expands a species, **append a new sourcebook claim** rather than replacing or silently invalidating the earlier Core claim. Reprint, erratum, variant, feat, and innate trait are separate categories.
5. Feats are **player-selectable feat records, not automatically acquired species abilities**. The existence of a feat with a species prerequisite must never make it an innate species trait.
6. Track separately: `CHANGE_REQUIRED` (confirmed issue), `REVIEW_REQUIRED` (source/variant/runtime gate outstanding), `NO_CHANGE` (clean audited scope), `NO_SPECIES_BASE_CHANGE` (supplement doesn't alter race baseline).
7. Preserve existing species IDs and the live registration/materialization architecture. No unsourced rewrite of packs or trait JSON sidecars.
8. Updating the rolling JSON must update the MD report **in the same commit**, with book totals and every species' status. Do not silently downgrade existing findings.

## Book 1 — Saga Edition Core Rulebook

**Printed source:** Chapter 2, species pp. 23–33.  
**Coverage:** 17/17 Core species. Species pack + both trait-sidecar declarations inspected; base ability/size data cross-checked to the preexisting 131-member reference. Original species mechanics compared against source descriptions. **No Foundry runtime tests run.**

<Summary — static source/consumer reconciliation>

| Finding | Count |
|---|---:|
| Core species individually reviewed | **17** |
| `NO_CHANGE` | **2** |
| `CHANGE_REQUIRED` | **5 species** |
| `REVIEW_REQUIRED` | **10 species** |
| Specific action/review entries | **24** |

`NO_CHANGE`: **Human, Duros**. These have no source-proven new correction in this pass, although their runtime still needs ordinary regression coverage.

The five `CHANGE_REQUIRED` species are **Gamorrean, Gungan, Ithorian, Twi'lek, Wookiee**. Some additional sidecar bonuses may originate in later books: the ledger preserves them as `REVIEW_REQUIRED` rather than ordering automatic deletion.

### Per-species rolling index

| Species | Core status | Core finding IDs | Rebellion Era species feats (optional) |
|---|---|---|---|
| Human | `NO_CHANGE` | None | None |
| Bothan | `REVIEW_REQUIRED` | CORE-bothan-01 | Bothan Will; Confident Success; Lasting Influence |
| Cerean | `REVIEW_REQUIRED` | CORE-cerean-01 | Binary Mind; Mind of Reason; Perfect Intuition |
| Duros | `NO_CHANGE` | None | Flawless Pilot; Spacer's Surge; Veteran Spacer |
| Ewok | `REVIEW_REQUIRED` | CORE-ewok-01 | Ample Foraging; Forest Stalker; Keen Scent |
| Gamorrean | `CHANGE_REQUIRED` | CORE-gamorrean-01, CORE-gamorrean-02, CORE-gamorrean-03 | Increased Resistance; Primitive Warrior; Quick Comeback |
| Gungan | `CHANGE_REQUIRED` | CORE-gungan-01, CORE-gungan-02 | Gungan Weapon Master; Perfect Swimmer; Warrior Heritage |
| Ithorian | `CHANGE_REQUIRED` | CORE-ithorian-01, CORE-ithorian-02 | Devastating Bellow; Nature Specialist; Strong Bellow |
| Kel Dor | `REVIEW_REQUIRED` | CORE-kel-dor-01 | Justice Seeker; Read the Winds; Scion of Dorin |
| Mon Calamari | `REVIEW_REQUIRED` | CORE-mon-calamari-01 | Fast Swimmer; Mon Calamari Shipwright; Sharp Senses |
| Quarren | `REVIEW_REQUIRED` | CORE-quarren-01 | Clawed Subspecies; Deep Sight; Shrewd Bargainer |
| Rodian | `REVIEW_REQUIRED` | CORE-rodian-01 | Fringe Benefits; Hunter's Instincts; Master Tracker |
| Sullustan | `REVIEW_REQUIRED` | CORE-sullustan-01 | Darkness Dweller; Disarming Charm; Sure Climber |
| Trandoshan | `REVIEW_REQUIRED` | CORE-trandoshan-01, CORE-trandoshan-02 | Pitiless Warrior; Regenerative Healing; Thick Skin |
| Twi'lek | `CHANGE_REQUIRED` | CORE-twi-lek-01, CORE-twi-lek-02 | Imperceptible Liar; Jedi Heritage; Survivor of Ryloth |
| Wookiee | `CHANGE_REQUIRED` | CORE-wookiee-01, CORE-wookiee-02, CORE-wookiee-03 | Bowcaster Marksman; Resurgent Vitality; Wroshyr Rage |
| Zabrak | `REVIEW_REQUIRED` | CORE-zabrak-01, CORE-zabrak-02 | Inborn Resilience; Instinctive Perception; Unwavering Focus |

### Exact pending Core correction/review ledger

This is the edit inventory; **no listed change has been applied yet**. Each is linked to a machine record with published source pages.

| Species | Classification | Issue | Target path / selector | Source-backed concern or required verification |
|---|---|---|---|---|
| Bothan | `REVIEW_REQUIRED` | Bothan Spy Network | `data/species-traits-migrated.json` — `Bothan.conditionalTraits` | supplementary conditional Gather Information reroll not in Core species traits; verify source before removing |
| Cerean | `REVIEW_REQUIRED` | Binary Brain / Binary Brain (Reroll) | `data/species-traits-migrated.json` — `Cerean.structuralTraits / conditionalTraits` | +2 species Will and a Knowledge reroll not in Core Cerean traits; verify other-book source and scope |
| Ewok | `REVIEW_REQUIRED` | Primitive Weapons | `data/species-traits.json` — `Ewok.structuralTraits` | sidecar claims primitive weapon proficiency separate from printed Primitive suppression; check whether this creates extra proficiency |
| Gamorrean | `REVIEW_REQUIRED` | Low Cunning (-2 Will) | `data/species-traits-migrated.json` — `Gamorrean.structuralTraits` | sidecar adds penalty absent from printed Core Gamorrean traits; verify other-book source |
| Gamorrean | `CHANGE_REQUIRED` | Brutal Charge trigger | `data/species-traits-migrated.json` — `Gamorrean.conditionalTraits[].rules[].when` | sidecar rule has when:always although its own text requires charging; source and entitlement also require verification |
| Gamorrean | `REVIEW_REQUIRED` | Weapon Familiarity (Arg'garok) | `packs/species.db` — `Gamorrean.system.canonicalTraits` | present in pack trait set but not Core racial traits; identify later source before changing |
| Gungan | `CHANGE_REQUIRED` | Amphibious unlimited underwater breathing | `data/species-traits-migrated.json` — `Gungan.structuralTraits['Amphibious']` | sidecar describes unlimited air/water breathing, whereas Core specifies Hold Breath (25 x Constitution score rounds) and endurance checks |
| Gungan | `REVIEW_REQUIRED` | Lucky | `data/species-traits.json` — `Gungan.activatedAbilities` | sidecar adds once-per-encounter generic reroll absent from Core; verify later source and feat/variant gate |
| Ithorian | `CHANGE_REQUIRED` | Sonic Bellow 1d6 adjacent | `data/species-traits.json` — `Ithorian.activatedAbilities['Sonic Bellow']` | sidecar says 1d6 to adjacent enemies, Core Bellow is 3d6 sonic in 6-square cone with Fortitude attack and condition track cost |
| Ithorian | `REVIEW_REQUIRED` | Nature Affinity +5 Knowledge (Life Sciences) | `data/species-traits-migrated.json` — `Ithorian.structuralTraits` | additional unconditional bonus not among Core innate traits; Core instead grants conditional Skill Focus in Life Sciences |
| Kel Dor | `REVIEW_REQUIRED` | Force Awareness +2 Use the Force | `data/species-traits-migrated.json` — `Kel Dor.structuralTraits` | sidecar all-use bonus differs from narrow Core Keen Force Sense reroll; source/variant check before execution |
| Mon Calamari | `REVIEW_REQUIRED` | Tech Savvy +2 Mechanics | `data/species-traits-migrated.json` — `Mon Calamari.structuralTraits` | sidecar modifier absent from Core innate traits; verify source before treating as automatic |
| Quarren | `REVIEW_REQUIRED` | Forceful Presence +2 Persuasion | `data/species-traits-migrated.json` — `Quarren.structuralTraits` | sidecar modifier absent from Core innate traits; verify supplemental source and intimidation-only scope |
| Rodian | `REVIEW_REQUIRED` | Keen Senses +2 Perception | `data/species-traits-migrated.json` — `Rodian.structuralTraits` | sidecar modifier absent from Core, which grants a Perception reroll |
| Sullustan | `REVIEW_REQUIRED` | Spatial Awareness +5 Pilot/Initiative | `data/species-traits-migrated.json` — `Sullustan.structuralTraits` | sidecar claims bonus absent from Core, with migrated rule only specifying Pilot; source-check and reconcile |
| Trandoshan | `REVIEW_REQUIRED` | Regeneration automatic HP restoration | `data/species-traits.json` — `Trandoshan.activatedAbilities['Regeneration']` | sidecar adds once-per-encounter healing, Core only grants limb regeneration; distinguish the separate Rebellion Regenerative Healing feat |
| Trandoshan | `REVIEW_REQUIRED` | Claws provenance and die mismatch | `packs/species.db + data/species-traits-migrated.json` — `Trandoshan.system.naturalWeapons / structuralTraits` | pack has 1d4 claws, sidecar description says 1d6 while structured rule says 1d4; Core species text does not list natural claw damage |
| Twi'lek | `CHANGE_REQUIRED` | Graceful +2 Reflex | `data/species-traits.json + data/species-traits-migrated.json` — `Twi'lek.structuralTraits['Graceful']` | Core gives Great Fortitude +2 Fortitude, not +2 Reflex; sidecar pseudo-passive risks extra unrelated defense bonus |
| Twi'lek | `CHANGE_REQUIRED` | Persuasion Training +5 Persuasion | `data/species-traits.json + data/species-traits-migrated.json` — `Twi'lek.structuralTraits['Persuasion Training']` | Core provides Deceptive Deception reroll, not this automatic bonus; verify later source before retaining |
| Wookiee | `CHANGE_REQUIRED` | Endurance +2 Fortitude | `data/species-traits.json + data/species-traits-migrated.json` — `Wookiee.structuralTraits['Endurance']` | Core gives CON +2 but no standalone +2 species Fortitude; sidecar can add unsupported extra defense modifier |
| Wookiee | `CHANGE_REQUIRED` | Rage trigger and duration | `data/species-traits-migrated.json` — `Wookiee.conditionalTraits['Rage']` | sidecar Rage triggers automatically below half HP for encounter, but Core Rage is chosen swift action, once/day, 5+CON mod rounds with persistent CT penalty |
| Wookiee | `REVIEW_REQUIRED` | Natural claws | `packs/species.db` — `Wookiee.system.naturalWeapons` | pack includes 1d6 claw weapon while Core species traits do not grant natural claw attacks; check source and how character uses claws |
| Zabrak | `REVIEW_REQUIRED` | Battle Hardened +2 Fortitude | `data/species-traits-migrated.json` — `Zabrak.structuralTraits` | sidecar adds independent +2 Fortitude not in Core; Core Superior Defenses +1 to all defenses |
| Zabrak | `REVIEW_REQUIRED` | Irrepressible | `data/species-traits.json` — `Zabrak.activatedAbilities` | sidecar one-per-encounter stun/daze ignore absent from Core racial traits; verify later source and eligibility |

### Priority rule-consumer conflicts

- **Twi'lek:** pack and Core give *Great Fortitude* (+2 Fortitude), while live sidecar adds **+2 Reflex** and **+5 Persuasion** without Core support. Confirm no later-book conditional source before surgically disabling these effects.
- **Wookiee:** sidecar grants extra **+2 Fortitude** and describes *Rage* as automatic at half HP until encounter end; Core *Rage* is a selectable swift action with time limit and persistent CT consequence. Actor runtime must use the printed trigger rather than sidecar prose.
- **Gungan:** sidecar `Amphibious` gives unlimited breathing, contradicting Core *Hold Breath*. Preserve swim speed and exact printed hold-breath endurance mechanic.
- **Ithorian:** sidecar `Sonic Bellow` suggests **1d6 adjacent** instead of canonical **3d6 in a 6-square cone** and CT cost. The existing Bellow engine already models much of the printed result; the sidecar is not safe as a replacement.
- **Gamorrean:** `Brutal Charge` rule currently contains `when:always`, despite its own text limiting it to charging; this is defective even before resolving whether the trait itself is an allowed publication/variant.

### Comparison limitations

No live actor, full test suite or manual Foundry build was executed. No claim is made that all 424 species trait blocks across 161 species are fully source-certified. The per-species Core status applies only to the Core comparison, not later sourcebooks.

## Book 2 — Rebellion Era Campaign Guide

**Printed source:** Heroic Traits, *Species Feats*, pp. 31–36.  
**Scope:** 48 **optional species feats**, three per each of 16 non-Human Core races. The book explicitly says that **none is a bonus feat for any class** merely because it belongs to this feat category. **Humans receive none** in this book.

### Reconciliation

| Finding | Result |
|---|---:|
| Eligible non-Human Core species | **16** |
| Feat names expected from source | **48** |
| Names with a unique matching Rebellion Era canonical feat identity | **48/48** |
| New/replacement Core innate species traits found in this section | **0** |
| Species-pack changes authorized by Rebellion Era feat list | **0** |
| Feat prerequisites/mechanical runtime independently recertified here | **No — remains within feat domain** |

Each of the 48 feat identities, canonical IDs, identity keys and printed pages is written in the rolling JSON under its appropriate species. **All 48 identities are present; this is identity parity, not executable-feat certification.**

### Important entitlement boundaries

- **Quarren / Clawed Subspecies** is a *feat*: Quarren do **not** get its claw attack just from species selection.
- **Trandoshan / Regenerative Healing** is a *feat* about improved healing behavior; it does not prove the preexisting species sidecar may automatically trigger HP regeneration.
- **Ithorian / Devastating Bellow and Strong Bellow** are optional feat modifications to Bellow, not default racial statistics.
- **Quarren / Deep Sight** is a *feat* granting darkvision; Core Quarren retain their printed low-light vision unless they select that feat.
- **Zabrak / Inborn Resilience** is a *feat* exchanging defense bonuses. It does not authorize an unconditional additional +2 Fortitude from `Battle Hardened`.
- **Human**: `NO_CHANGE` in this Rebellion species-feat scope.

There is no evidence from this section for rewriting Core baseline species records. A later book may contain published variant species traits outside this feat table; those must be entered separately under their own source, not inferred from feat names.

## Book order and continuation

**Completed**
1. Saga Edition Core Rulebook — 17 baseline species and targeted sidecar discrepancies
2. Rebellion Era Campaign Guide — 48 sourcebook species-feat identities reconciled

**Pending sourcebooks**
3. Knights of the Old Republic Campaign Guide
4. The Force Unleashed Campaign Guide
5. Clone Wars Campaign Guide
6. Scum and Villainy
7. Jedi Academy Training Manual
8. Galaxy at War
9. Legacy Era Campaign Guide
10. Scavenger's Guide to Droids
11. Threats of the Galaxy / Galaxy of Intrigue / The Unknown Regions / other source supplements where species mechanics are actually printed

For every subsequent book: inventory species entries, variants, feats that modify traits, and any corrected/reprinted rules; append a provenance-linked decision for every affected species and explicit `NO_CHANGE` for every species entry reviewed without an edit. Respect publication/variant specificity. Keep a rolling JSON + MD together.

## Next correction strategy

After each book, make a **small, separately approved corrective commit** for source-proven changes only, with exact before/after fields, regression tests and ID stability. Do not batch speculative supplements or start a new species SSOT. This branch remains a **read-only audit** until those changes are explicitly authorized.
