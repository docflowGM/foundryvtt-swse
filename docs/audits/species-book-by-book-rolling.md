# SWSE Species — Rolling Book-by-Book Canonical Audit

**Status:** Core, Rebellion Era, KOTOR, Force Unleashed and Clone Wars audited. No production species data changed.  
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
3. Knights of the Old Republic Campaign Guide — 12/12 species baseline and sidecar audit

**Pending sourcebooks**
5. Clone Wars Campaign Guide — COMPLETED
6. Scum and Villainy
7. Jedi Academy Training Manual
8. Galaxy at War
9. Legacy Era Campaign Guide
10. Scavenger's Guide to Droids
11. Threats of the Galaxy / Galaxy of Intrigue / The Unknown Regions / other source supplements where species mechanics are actually printed

For every subsequent book: inventory species entries, variants, feats that modify traits, and any corrected/reprinted rules; append a provenance-linked decision for every affected species and explicit `NO_CHANGE` for every species entry reviewed without an edit. Respect publication/variant specificity. Keep a rolling JSON + MD together.

## Next correction strategy

After each book, make a **small, separately approved corrective commit** for source-proven changes only, with exact before/after fields, regression tests and ID stability. Do not batch speculative supplements or start a new species SSOT. This branch remains a **read-only audit** until those changes are explicitly authorized.


---

## Book 3 — Knights of the Old Republic Campaign Guide

**Published source:** Chapter 1, Species, pp. 10–20 (table p. 10; individual species entries pp. 11–20).

**Corpus:** 12 species/lineages: Arkanian, Arkanian Offshoot, Cathar, Draethos, Feeorin, Khil, Kissai, Massassi, Miraluka, Rakata, Selkath, Snivvian.

**Read-only findings:** `12` species checked; `9` flagged `CHANGE_REQUIRED`, `3` flagged `REVIEW_REQUIRED`, `0` overall `NO_CHANGE`. Exactly `10` individual correction candidates and `13` review entries were logged. Importantly, **all 12 have `NO_CHANGE` for basic printed ability score modifiers, size, and base speed**, while many have other fields needing correction.

**Authority verification:** KOTOR printed PDF species chapter visually mapped from PDF pages 11–21 to printed pp. 10–20, with rendered full-page spot checks for Cathar p.12, Feeorin p.14 and Rakata p.18, and checked against the uploaded DJVU text transcription. No mechanical changes made; no Foundry runtime testing performed. Any supplementary sidecar trait outside KOTOR's native trait list remains explicitly tagged for further-book source proof before deletion.

### Species-by-species dispositions

| Species | Printed page | Base stats / size / speed | Species overall status | Findings |
|---|---|---|---|---:|
| Arkanian | p. 11-12 | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Arkanian Offshoot | p. 12 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Cathar | p. 12 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Draethos | p. 13 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Feeorin | p. 14 | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Khil | p. 15 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Kissai | p. 16 | `NO_CHANGE` | `REVIEW_REQUIRED` | 1 |
| Massassi | p. 16 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Miraluka | p. 17 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Rakata | p. 18 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Selkath | p. 19 | `NO_CHANGE` | `REVIEW_REQUIRED` | 1 |
| Snivvian | p. 20 | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |

### Source-backed corrections and review queue

Each row has an **exact target selector** and a proposed surgical action. `CHANGE_REQUIRED` means discrepancy against the printed KOTOR rule or an unmistakably malformed pack value; `REVIEW_REQUIRED` means the effect is not justified by this book and must be source/variant checked against other publications before removal. No row reports an applied fix.

| Species | ID | Disposition | Target field / consumer | Current data | KOTOR source authority | Suggested action |
|---|---|---|---|---|---|---|
| Arkanian | `KOTOR-01-01` | `REVIEW_REQUIRED` | `system.skillBonuses` | +2 Mechanics, +2 Use Computer | Flash of Genius is a once/encounter +5 circumstance choice, not unconditional +2 to these skills | Check other sourcebook authority and actor bonus consumption |
| Arkanian | `KOTOR-01-02` | `REVIEW_REQUIRED` | `Arkanian.sidecar.Genetic Memory` | +2 Knowledge (Life Sciences) always | Printed innate traits: Darkvision, Intellectual Reputation, Flash of Genius | Seek source provenance before retaining passive |
| Arkanian Offshoot | `KOTOR-02-01` | `CHANGE_REQUIRED` | `system.languages` | Basic; 'Arkanian (albeit with a distinct accent' | Automatic: Arkanian and Basic | Repair malformed Arkanian token without replacing original two languages |
| Arkanian Offshoot | `KOTOR-02-02` | `REVIEW_REQUIRED` | `system.skillBonuses / Resilient Physiology` | +2 Endurance and +2 Fortitude | Offshoot innate traits are Conditional Bonus Feat and Determination | Seek separate publication, otherwise remove extraneous passives |
| Cathar | `KOTOR-03-01` | `CHANGE_REQUIRED` | `system.naturalWeapons.Claws.damage and migrated Claws.rules.damage` | 1d4 slashing | 1d6 slashing Cathar natural weapons | Use 1d6 in both pack and sidecar; verify actor claw creation |
| Cathar | `KOTOR-03-02` | `REVIEW_REQUIRED` | `system.skillBonuses / Feline Agility` | +2 Perception, +2 Stealth, +2 Reflex | Cathar Instincts grants Climb and Stealth as CLASS SKILLS, not numeric bonus | Identify later variant/source before any modifier applies |
| Draethos | `KOTOR-04-01` | `CHANGE_REQUIRED` | `system.languages` | Draethos and Basic for everyone | Draethos always; only exiled Draethos gain Basic | Make Basic conditional on exiled background/profile |
| Draethos | `KOTOR-04-02` | `REVIEW_REQUIRED` | `Resilient Hide sidecar` | +2 Fortitude | Species grants natural armor +1 Reflex, Natural Telepath, advanced-melee proficiency, low-light | Check any expansion before retaining extra Fortitude |
| Feeorin | `KOTOR-05-01` | `CHANGE_REQUIRED` | `canonicalTraits.Stronger by Age.description` | +1/+2 bonus to Strength and Constitution SCORES | Middle/old age +1/+2 species bonus to Strength OR Constitution CHECKS | Correct to check modifier; preserve source age exception |
| Feeorin | `KOTOR-05-02` | `CHANGE_REQUIRED` | `system.languages` | Basic only | Automatic: Feeorin and Basic | Add Feeorin once |
| Feeorin | `KOTOR-05-03` | `REVIEW_REQUIRED` | `system.skillBonuses / Intimidating Presence` | +2 Endurance, +5 Persuasion (Intimidate) | Printed innate feats do not grant either unconditional skill bonus | Confirm external source or retire passive |
| Khil | `KOTOR-06-01` | `CHANGE_REQUIRED` | `Khil.sidecar.Force Sensitivity.rules` | featGrant Force Sensitivity always | Khil traits are Dependable Worker, Cooperative Spirit, Hullepi, without this feat grant | Remove unconditional grant after cross-book variant review |
| Khil | `KOTOR-06-02` | `REVIEW_REQUIRED` | `canonicalTraits.Self-Sustaining runtime` | environmental exemption recorded as text | Hullepi prevents starvation except sterile environments | Verify structured starvation/environment handler |
| Kissai | `KOTOR-07-01` | `REVIEW_REQUIRED` | `Kissai.sidecar.Dark Ritualist.rules` | +2 Use the Force always (source sidecar describes dark-side powers) | KOTOR grants Inspired, Warrior's Awareness, lanvarok familiarity; no +2 Force bonus | Find other authority and add conditional gate if valid |
| Massassi | `KOTOR-08-01` | `CHANGE_REQUIRED` | `system.languages` | Sith, 'Sith as well' | Automatic: Sith only | Remove duplicate malformed language value |
| Massassi | `KOTOR-08-02` | `REVIEW_REQUIRED` | `Massassi.sidecar.Brutal Strength / Dark Side Affinity` | +2 melee damage and +2 Use the Force always | KOTOR innate grants conditional Survival feat, Duty Bound, Primitive, Warrior's Awareness, lanvarok familiarity | Require explicit alternate printed grant to retain these modifiers |
| Miraluka | `KOTOR-09-01` | `CHANGE_REQUIRED` | `Miraluka.sidecar.Force Sensitivity.rules` | featGrant Force Sensitivity always | KOTOR gives Force Sight and conditional Force Training IF Use the Force is trained | Remove automatic Force Sensitivity grant; preserve conditional Force Training |
| Miraluka | `KOTOR-09-02` | `REVIEW_REQUIRED` | `system.skillBonuses` | +2 Use the Force | Force Sight has non-generic perception/Sense Surroundings exceptions, not blanket bonus | Check additional source/variant |
| Rakata | `KOTOR-10-01` | `CHANGE_REQUIRED` | `Rakata.sidecar.Dark Side Mastery.rules` | automatic +2 Use the Force; sidecar claims auto-trained | Force Blind forbids taking Force Sensitivity and printed Ancient Knowledge lists only technological skill exceptions | Source-check then remove any automatic +2/trained Force rule |
| Rakata | `KOTOR-10-02` | `REVIEW_REQUIRED` | `system.canonicalTraits.Weapon Familiarity / system.skillBonuses` | Rakata weapons lose Exotic; +2 Use the Force | Neither listed in the KOTOR p18 innate trait list | Check separate published authority before accepting |
| Selkath | `KOTOR-11-01` | `REVIEW_REQUIRED` | `system.skillBonuses / Aquatic Adaptation` | +2 Endurance, +2 Swim, +2 Fortitude | Expert Swimmer grants reroll and Take 10; Breathe Underwater is innate; no static +2 bonuses printed | Verify later supplement; keep valid swim 4 / Able Healer |
| Snivvian | `KOTOR-12-01` | `CHANGE_REQUIRED` | `system.skillBonuses` | +2 Negotiation (not a SWSE skill) | Observant substitutes Perception for Deception or Persuasion once/encounter, not +2 Negotiation | Remove unsupported field; do not turn it into +2 Persuasion |
| Snivvian | `KOTOR-12-02` | `REVIEW_REQUIRED` | `Snivvian.sidecar.Craven / Opportunistic` | -2 Will and +2 Deception always | KOTOR innate traits only Observant and Cold Resistance | Find supplemental/variant source before allowing modifiers |

### High-impact conclusions

- **Cathar claws:** The book grants **1d6 slashing** natural attacks (p. 12). `packs/species.db` and the migrated sidecar both supply **1d4**. Repair both in one surgical change and verify the resulting actor weapon once-only.
- **Feeorin age trait:** `Stronger by Age` modifies **Strength or Constitution checks**, not the underlying Strength or Constitution scores (p. 14). This is a real mechanical distinction and should not trigger unintended derived-stat changes.
- **Miraluka:** Force Sight plus **conditional Force Training** for characters trained in Use the Force does not itself grant **Force Sensitivity** (p. 17). A migrated sidecar has an unconditional feat-grant rule that could bypass the prerequisite system. Source-check later variants before correction, and preserve the actual conditional Force Training.
- **Khil:** A migrated sidecar grants **Force Sensitivity** to every Khil, absent from the published traits (p. 15). This is a high-priority grant-legality check.
- **Rakata:** Printed **Force Blind** forbids taking Force Sensitivity (p. 18), whereas a sidecar advertises automatic trained Use the Force and an unconditional +2 species modifier. These authorities must not be conflated.
- **Language data:** Arkanian Offshoot has a truncated language token; Massassi has a duplicate invented Sith-language token; Feeorin lacks its named native language; Draethos has Basic unconditionally, while the printed text grants Basic to *exiled* Draethos.
- **Snivvian:** `+2 Negotiation` is not a valid standalone SWSE skill grant; it does not replace Observant's once/encounter Perception-for-Deception/Persuasion substitution.
- **Twelve-way basic statistics:** All printed species-table ability adjustments and size/speed checks match the existing pack; **do not rewrite the base species chassis.**
- **Feat separation:** KOTOR's canonical feat identity manifest currently contains **21 GENERAL feats and zero SPECIES_FEAT** records. This is a corpus classification check; it does not imply feats from other books become species starting grants.

### Status and continuation guardrails

Every KOTOR species is recorded, including **`NO_CHANGE` on the verified base-stat subset for all 12**. None of the KOTOR species is labelled overall `NO_CHANGE`, because each has at least one separate trait/sidecar discrepancy or unresolved rule-provenance question. This is not a claim that all 12 have an incorrect published base stat.

Do not overwrite any earlier Core or Rebellion findings; they remain independent book-specific records. Do not turn unverified sidecar traits into automatic species grants. Where later books explicitly support a variant, create a separate source-linked rule rather than silently replacing the KOTOR default. Apply no production patches on this branch until the relevant book/variant source is certified and a narrowly scoped correction is authorized.

**Next book:** *The Clone Wars Campaign Guide*. Its new species and any reprinted/expanded species mechanics should be appended with the same one-entry-per-species `NO_CHANGE` / `CHANGE_REQUIRED` / `REVIEW_REQUIRED` discipline.


---

## Book 4 — The Force Unleashed Campaign Guide

**Source:** Chapter 1, Species, printed pp. 11–20; species ability adjustment table 1-1 printed p.12. The source PDF was rendered and source pages visually reviewed; the user-supplied searchable transcription was used for trait language.

**Scope:** Aleena, Caamasi, Felucian, Gran, Nosaurian, Talz, Togorian, Togruta, Whiphid, Yarkora. All ten are already in `packs/species.db`. This is a **read-only** audit and **not** a live Foundry V13 verification or a separate feat implementation audit.

### Results

| Metric | Count |
|---|---:|
| Species in this book | **10** |
| Species already in pack | **10/10** |
| Ability adjustment, size and base speed match printed species data | **10/10 — NO_CHANGE** |
| Automatic languages match publication | **9/10 — NO_CHANGE** |
| Overall `NO_CHANGE` | **0** |
| Overall `CHANGE_REQUIRED` | **7 species** |
| Overall `REVIEW_REQUIRED` | **3 species** |
| Confirmed correction candidates | **7** |
| Additional source/runtime review entries | **19** |
| Explicit source-legal sidecar `NO_CHANGE` ruling | **1** |

All ten receive an explicit **`NO_CHANGE` field-level decision for their basic published statistics**, even though other traits need work. No blanket rewrite of base species data is justified.

### Every species, including clean fields

| Species | Printed page(s) | Size / speed / abilities | Languages | Overall species decision | Issues |
|---|---|---|---|---|---:|
| Aleena | 13-14 | `NO_CHANGE` | `CHANGE_REQUIRED` | `CHANGE_REQUIRED` | 2 |
| Caamasi | 14-15 | `NO_CHANGE` | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Felucian | 15 | `NO_CHANGE` | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Gran | 16 | `NO_CHANGE` | `NO_CHANGE` | `REVIEW_REQUIRED` | 3 |
| Nosaurian | 16-17 | `NO_CHANGE` | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Talz | 17-18 | `NO_CHANGE` | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Togorian | 18 | `NO_CHANGE` | `NO_CHANGE` | `REVIEW_REQUIRED` | 3 |
| Togruta | 18-19 | `NO_CHANGE` | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Whiphid | 19-20 | `NO_CHANGE` | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Yarkora | 20 | `NO_CHANGE` | `NO_CHANGE` | `REVIEW_REQUIRED` | 3 |

### Exact append-only correction/review ledger

| Species | Finding ID | Status | Severity | Exact file selector / trait | Current declaration | Printed rule |
|---|---|---|---|---|---|---|
| Aleena | `TFU-01-01` | `CHANGE_REQUIRED` | HIGH | `system.languages` | ['Aleena','Basic Caamasi in: Species','Caamasi','Medium','6 more Caamasi 1 Edit'] | Automatic languages are Aleena and Basic. |
| Aleena | `TFU-01-02` | `REVIEW_REQUIRED` | LOW | `system.canonicalTraits[energy-surge / heightened-agility].name` | Energy Surge, Heightened Agility | Printed Aleena traits are Quick Energy and Nimble, with materially equivalent described effects. |
| Caamasi | `TFU-02-01` | `CHANGE_REQUIRED` | HIGH | `data/species-traits(-migrated).json :: Caamasi.Pacifist Insight` | Automatic +5 Initiative and additional Initiative reroll | Published traits are Adept Diplomat (Persuasion reroll keeping better), Pacifism, Memory Sharing; neither Initiative trait is granted. |
| Caamasi | `TFU-02-02` | `REVIEW_REQUIRED` | LOW | `system.canonicalTraits['silver-tongued'].name` | Silver Tongued | Printed feat/trait name is Adept Diplomat; description reproduces its choose-better Persuasion reroll. |
| Felucian | `TFU-03-01` | `CHANGE_REQUIRED` | HIGH | `system.primitive / system.suppressedClassProficiencies` | Suppresses only Heavy Weapons, Pistols and Rifles starting class grants | Printed Primitive: regardless of starting class, Felucians gain proficiency only with Simple Weapons; skullblade familiarity separately treats skullblade as Simple. |
| Felucian | `TFU-03-02` | `NO_CHANGE` | NONE | `data/species-traits-migrated.json :: Felucian.Force Sensitivity featGrant` | Unconditional Force Sensitivity featGrant | Printed Bonus Feat explicitly grants Force Sensitivity; this is an authorized grant unlike Khil/Miraluka. |
| Felucian | `TFU-03-03` | `REVIEW_REQUIRED` | MEDIUM | `system.canonicalTraits['force-blast'] / runtime activated ability` | Text includes once/encounter untrained Force Blast and replacement by free suite power for Force Training | Printed two modes require exclusion: no extra once/encounter blast once Force Training provides a suite use. |
| Gran | `TFU-04-01` | `REVIEW_REQUIRED` | HIGH | `data/species-traits-migrated.json :: Gran.Three-Eyed Vision` | Automatic +2 species Reflex Defense | Published Gran abilities are Darkvision, Target Awareness, Triple Vision (once/encounter single-swift aim), conditional Precise Shot with Point Blank Shot. No Reflex bonus is in this source. |
| Gran | `TFU-04-02` | `REVIEW_REQUIRED` | MEDIUM | `system.skillBonuses / system.socialTraits` | ['+2 Endurance','+2 Perception'] and Three-Eyed Vision sight-bonus text | Published Target Awareness removes distance penalties on noticing targets up to first 50 squares, not generic +2 Perception/Endurance. |
| Gran | `TFU-04-03` | `REVIEW_REQUIRED` | LOW | `system.canonicalTraits['innate-accuracy'].name` | Innate Accuracy | Printed equivalent single-swift aim trait is named Triple Vision. |
| Nosaurian | `TFU-05-01` | `CHANGE_REQUIRED` | HIGH | `system.naturalWeapons / natural weapon materialization` | Empty [] | Printed Natural Weapon grants horns 1d6 piercing, always armed. |
| Nosaurian | `TFU-05-02` | `REVIEW_REQUIRED` | MEDIUM | `data/species-traits(-migrated).json :: Nosaurian.Prehensile Tail` | Automatic +2 Acrobatics | Printed innate traits are Climber's Heritage (Climb class skill), 1d6 horns, Survival Instinct; no Prehensile Tail bonus in this entry. |
| Talz | `TFU-06-01` | `CHANGE_REQUIRED` | HIGH | `system.naturalWeapons / natural weapon materialization` | Empty [] | Printed Natural Weapon grants claws 1d6 slashing, always armed. |
| Talz | `TFU-06-02` | `REVIEW_REQUIRED` | MEDIUM | `data/species-traits-migrated.json :: Talz.Cold Adaptation` | Automatic +5 Fortitude against cold environments | Printed innate Talz abilities here: Darkvision, 1d6 claws, conditional Skill Focus (Mechanics); cold Fortitude modifier not in this species block. |
| Talz | `TFU-06-03` | `REVIEW_REQUIRED` | MEDIUM | `system.skillBonuses` | ['+2 Survival','+2 Perception'] | Printed traits have no general +2 to either skill. |
| Togorian | `TFU-07-01` | `REVIEW_REQUIRED` | HIGH | `system.naturalWeapons / data/species-traits-migrated.json :: Togorian.Claws` | Pack natural claws 1d4, sidecar description says 1d6 but rule 1d4 | Printed Force Unleashed Togorian traits list Feline Reflexes +1 Reflex, Low-Light Vision, Physical Intimidation; no natural-weapon attack in printed trait list despite narrative about claws. |
| Togorian | `TFU-07-02` | `REVIEW_REQUIRED` | MEDIUM | `system.skillBonuses` | ['+2 Survival'] | No unconditional +2 Survival in printed Force Unleashed species traits. |
| Togorian | `TFU-07-03` | `REVIEW_REQUIRED` | LOW | `system.canonicalTraits['physically-intimidating'].name` | Physically Intimidating | Printed trait name Physical Intimidation; mechanism uses STR instead of CHA on Persuasion-to-intimidate. |
| Togruta | `TFU-08-01` | `CHANGE_REQUIRED` | HIGH | `data/species-traits-migrated.json :: Togruta.Spatial Awareness.rules` | Sense blindsense range 6 squares | Printed Spatial Awareness: ignore all cover and concealment ONLY when making Perception checks to notice targets within 10 squares; not blanket 6-square blindsense. |
| Togruta | `TFU-08-02` | `REVIEW_REQUIRED` | MEDIUM | `data/species-traits-migrated.json :: Togruta.Pack Instincts` | Unconditional +2 Initiative | Printed Togruta traits Pack Hunter (+2 melee damage only vs flanked foe), Sneaky, Spatial Awareness. No automatic +2 Initiative. |
| Togruta | `TFU-08-03` | `REVIEW_REQUIRED` | MEDIUM | `system.skillBonuses / system.socialTraits` | ['+2 Perception','+2 Stealth'] and +2 Perception in enclosed spaces | Printed Sneaky gives a reroll for Stealth to sneak, and Spatial Awareness gives a specific perceptual exception, not generic +2 bonuses. |
| Whiphid | `TFU-09-01` | `CHANGE_REQUIRED` | HIGH | `system.naturalWeapons / natural weapon materialization` | Empty [] | Printed Natural Weapon grants claws 1d6 slashing, always armed. |
| Whiphid | `TFU-09-02` | `REVIEW_REQUIRED` | MEDIUM | `data/species-traits-migrated.json :: Whiphid.Arctic Hunter.rules` | Automatic +2 Stealth with when:always, description limits it to cold environments and Survival | Printed traits have Insulating Fur +5 Fortitude specifically for extreme cold, Natural Weapon, Scent; no generic Arctic Hunter in this species block. |
| Whiphid | `TFU-09-03` | `REVIEW_REQUIRED` | MEDIUM | `system.skillBonuses` | ['+2 Survival','+2 Perception'] | Printed Scent grants within-10-square tracking/Perception exceptions, not flat +2 to these skills. |
| Yarkora | `TFU-10-01` | `REVIEW_REQUIRED` | HIGH | `data/species-traits-migrated.json :: Yarkora.Brute Force` | Unconditional +2 melee damage | Printed traits Confusion (once/encounter Deception vs Will within 6), Deceptive reroll, Streetwise (Gather Information class skill); no melee damage bonus. |
| Yarkora | `TFU-10-02` | `REVIEW_REQUIRED` | MEDIUM | `system.skillBonuses` | ['+2 Deception','+2 Persuasion'] | Printed Deceptive gives must-accept reroll and Streetwise gives a class skill, not general +2 modifiers. |
| Yarkora | `TFU-10-03` | `REVIEW_REQUIRED` | MEDIUM | `system.canonicalTraits['confusion'] runtime` | Correct prose; no runtime proof collected | Published Confusion is once/encounter standard action, Deception vs multiple targets' Will, removes threatened squares through next turn, mind-affecting. |

Proposed surgical action and additional-source gate for every finding are preserved in the matching JSON under `entries[*].forceUnleashed.findings`. Every finding is marked `applied: false`; it remains an audit item, not an implemented patch. **`REVIEW_REQUIRED` does not authorize deletion** of a purported expansion or variant without a verified later source.

### High-priority interpretation and rulings

- **Aleena:** The basic profile is correct, but `system.languages` contains scraped adjacent Caamasi/page editor text. The book gives **Aleena and Basic** only. The printed *Nimble* and *Quick Energy* names are represented as *Heightened Agility* and *Energy Surge* with substantially equivalent text; label/identity normalization is separate from the mechanical correction.
- **Caamasi:** The book grants *Adept Diplomat* (Persuasion reroll, keep better), *Pacifism*, and *Memory Sharing*. The sidecar adds an unsupported **+5 Initiative** passive and Initiative reroll. The pack's *Silver Tongued* corresponds to printed *Adept Diplomat* mechanically, though not by name.
- **Felucian:** **Important positive exception:** The migrated sidecar's `featGrant Force Sensitivity` is **correct and must be retained** because the printed Bonus Feat explicitly grants it. Contrast Khil and Miraluka from the KOTOR audit, where unconditional Force Sensitivity was unsupported. The book's *Primitive* rule gives **only Simple Weapons** as starting group proficiency regardless of class; pack's current suppression list only names Heavy Weapons, Pistols and Rifles. Check Advanced Melee/Lightsabers and other starting grants. *Force Blast* has a once/encounter untrained form or a free suite copy if Force Training is acquired; **not both**.
- **Gran:** *Triple Vision* once/encounter single-swift aim and *Target Awareness* suppressing distance-based noticing penalties are printed. The migrated sidecar's **+2 Reflex** from *Three-Eyed Vision* is not supported by that rules block, and unconditional `+2 Endurance/Perception` fields need separate source support.
- **Nosaurian:** Published horn attack is **1d6 piercing**, always armed. Pack describes the trait but has empty `naturalWeapons`. Sidecar adds `Prehensile Tail +2 Acrobatics` without this book's backing.
- **Talz:** Published claws are **1d6 slashing**, always armed. Pack `naturalWeapons` is empty although the canonical trait describes it. The automatic Cold Adaptation +5 Fortitude and +2 Survival/Perception are not sourced by this printed block; keep them flagged pending Clone Wars / other source check.
- **Togorian:** The printed *Feline Reflexes* (+1 Reflex), *Low-Light Vision*, and *Physical Intimidation* align with the pack. The pack additionally declares **1d4 claws** and the sidecar calls them **1d6** in prose while encoding **1d4** structurally. This book does **not** publish a natural-claw attack in its trait block; verify the alternative `Threats of the Galaxy` source before removing or changing claws.
- **Togruta:** Critical semantic mismatch: printed *Spatial Awareness* ignores cover and concealment **for Perception checks to notice targets within 10 squares**. Sidecar implements generic **blindsense 6 squares**, which is not an equivalent mechanic. Sidecar +2 Initiative and general skill bonuses require provenance; printed *Pack Hunter* applies only to melee attacks against **flanked** opponents.
- **Whiphid:** Printed **1d6 slashing claws** are not structured under `system.naturalWeapons`, despite correct pack trait text. Printed *Scent* is a scoped within-10-square Perception/tracking rule, not unconditional +2 to two skills. *Insulating Fur* +5 Fortitude applies against **extreme cold only**. The sidecar's `Arctic Hunter` has `when:always` despite its own cold-only prose, and is not a printed base trait here.
- **Yarkora:** Published *Confusion* (once/encounter, Deception vs Will within 6 squares, no threatened squares), *Deceptive* (reroll), and *Streetwise* (Gather Information class skill) are described in the pack. Neither the sidecar's **+2 melee damage** nor pack's generic +2 Deception/Persuasion is printed. Validate those against a distinct source before execution; test *Confusion* as an actual triggered multi-target effect.

### Legality and identity boundary

Species source labels in the pack (for example `Gran: Rebellion`, `Togorian: Threats`, `Talz/Togruta: Clone Wars`) may reflect later publication or data origins. Those labels **do not supersede** the Force Unleashed primary source being audited. Follow up when the corresponding book is reached; do not conflate reprints, replacements and variants.

**No production class/weapon/species files, trait sidecars, or runtime consumers were edited.** The original Core, Rebellion and KOTOR audit decisions and the 48 certified Rebellion species-feat identities remain unchanged.

**Next book:** *Scum and Villainy*.

---

## Book 5 — The Clone Wars Campaign Guide

**Published locations:** species chapter pp. 10–17 (9 playable races), Republic Clone template p. 91, Chagrian NPC species block p. 159. Main sourcebook PDF pages are +1 over the printed pages. All 11 were identified directly from printed racial-rules sections, including the two sections outside the player species chapter.

**Field-by-field status:** `NO_CHANGE` for the pack's basic size and walking speed, and for the published ability-score adjustments (the Republic Clone fixed array is correctly separated as a choice structure). Some species-wide outcomes remain `REVIEW_REQUIRED` or `CHANGE_REQUIRED` because executable sidecars, trait descriptions or languages disagree with published mechanics.

### Summary

| Measure | Result |
|---|---:|
| Main player species chapter entries | 9 |
| Additional Republic Clone template | 1 |
| Additional Chagrian rules block | 1 |
| Total species/source templates audited | **11** |
| Existing Foundry species identities found | **11/11** |
| Basic species chassis requiring changes | **0** |
| Species `CHANGE_REQUIRED` | **6** |
| Species `REVIEW_REQUIRED` | **5** |
| Species `NO_CHANGE` overall | **0** |
| Confirmed correction items | **7** |
| Source/variant/runtime review items | **19** |
| Total findings | **26** |

### Per-species decisions

| Species or template | Source location | Size / land speed / basic ability data | Overall disposition | Findings |
|---|---|---|---|---:|
| Chagrian | p. 159 (NPC-personnel-section) | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Dug | p. 11 (main) | `NO_CHANGE` | `REVIEW_REQUIRED` | 1 |
| Gen'Dai | p. 12 (main) | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Iktotchi | p. 12 (main) | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Kaleesh | p. 13 (main) | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Kaminoan | p. 14 (main) | `NO_CHANGE` | `CHANGE_REQUIRED` | 4 |
| Kerkoiden | p. 15 (main) | `NO_CHANGE` | `REVIEW_REQUIRED` | 1 |
| Nautolan | p. 15-16 (main) | `NO_CHANGE` | `CHANGE_REQUIRED` | 5 |
| Nelvaanian | p. 16 (main) | `NO_CHANGE` | `REVIEW_REQUIRED` | 1 |
| Republic Clone | p. 91 (GM-section) | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Vurk | p. 17 (main) | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |

A species may be marked `NO_CHANGE` in the **verified field subset** despite having other mechanical findings. A whole-species `NO_CHANGE` would mean no correction or source issue was found in this book; none of the 11 meets that higher bar after inspecting both live sidecars.

### Complete correction and source-review ledger

The JSON contains for every finding its current value, exact selector, published effect, minimal surgical action, printed source page, `applied: false`, and whether further-book evidence is needed.

| Species | Finding ID | Classification | Rule family | Source/consumer target | Printed authority |
|---|---|---|---|---|---|
| Chagrian | `CW-11-01` | `CHANGE_REQUIRED` | `foreign-species-trait-contamination` | `packs/species.db: Chagrian.system.canonicalTraits[all-codru-ji-possess-six-limbs] and canonicalStats.traits` | Published Chagrian block includes only Breathe Underwater, Radiation Resistance (+5 Fortitude vs radiation) and Low-Light Vision. |
| Chagrian | `CW-11-02` | `REVIEW_REQUIRED` | `unsourced-endurance-field` | `packs/species.db: Chagrian.system.skillBonuses` | Chagrian NPC sidebar grants +2 STR -2 DEX, swim-capable breathing, +5 Fortitude vs radiation, low-light; no flat Endurance bonus. |
| Dug | `CW-01-01` | `REVIEW_REQUIRED` | `supplementary-sidecar-skill` | `data/species-traits-migrated.json: Dug.structuralTraits[Reverse Jointed]` | Printed Dug species traits only grant Athletic rerolls and Take 10 on Climb/Jump, plus Small size modifiers. |
| Gen'Dai | `CW-02-01` | `CHANGE_REQUIRED` | `wrong-trigger-healing` | `data/species-traits-migrated.json: Gen'Dai.structuralTraits[Regeneration].rules[fastHealing]` | Printed Gen'Dai Surge heals 5 hp at the end of each turn ONLY after the Gen'Dai uses its Second Wind, until half HP, encounter end, or death. |
| Gen'Dai | `CW-02-02` | `REVIEW_REQUIRED` | `kill-only-damage-threshold` | `packs/species.db: Gen'Dai.system.canonicalTraits[resilient-physiology]` | Published Resilient Physiology doubles the threshold ONLY for determining death, not for ordinary condition-track movement. |
| Gen'Dai | `CW-02-03` | `REVIEW_REQUIRED` | `trait-title` | `packs/species.db: Gen'Dai.system.canonicalTraits[fast-healing].name` | Published name is Gen'Dai Surge; benefits otherwise correctly described in pack. |
| Iktotchi | `CW-03-01` | `REVIEW_REQUIRED` | `sidecar-initiative` | `data/species-traits(-migrated).json: Iktotchi.structuralTraits[Prescient Vision] / conditionalTraits[Prescient Vision (Reroll)]` | Printed Limited Precognition is once-per-encounter reaction granting +2 Reflex against ONE attack to self or piloted vehicle; no unconditional Initiative bonus or Initiative reroll. |
| Iktotchi | `CW-03-02` | `REVIEW_REQUIRED` | `unsourced-skill-fields` | `packs/species.db: Iktotchi.system.skillBonuses` | Printed Expert Pilot permits must-accept Pilot reroll; no flat +2 Pilot/Initiative in the species traits. |
| Kaleesh | `CW-04-01` | `REVIEW_REQUIRED` | `sidecar-persuasion` | `data/species-traits-migrated.json: Kaleesh.structuralTraits[Fearsome Reputation].rules` | Published Kaleesh racial list is Survival conditional bonus feat, Darkvision, Driven (+5 Will vs mind-affecting), Persistent (Endurance reroll). |
| Kaleesh | `CW-04-02` | `REVIEW_REQUIRED` | `extra-skill-fields` | `packs/species.db: Kaleesh.system.skillBonuses` | These flat modifiers are not in the published Clone Wars racial traits. |
| Kaminoan | `CW-05-01` | `CHANGE_REQUIRED` | `fortitude-conflicting-authority` | `packs/species.db: Kaminoan.system.canonicalTraits[resilient] + data/species-traits-migrated.json: Kaminoan.structuralTraits[Fragile].rules` | Published Resistant grants +2 SPECIES bonus to Fortitude Defense against all relevant effects, not +1 and not -2. |
| Kaminoan | `CW-05-02` | `REVIEW_REQUIRED` | `extra-skill-authorities` | `packs/species.db: Kaminoan.system.skillBonuses / sidecar Genetic Expertise` | Published conditional bonus feat is Skill Focus (Treat Injury) IF trained; no blanket +2/+5 skill bonuses. |
| Kaminoan | `CW-05-03` | `REVIEW_REQUIRED` | `alternate-species-variant` | `packs/species.db: Kaminoan.system.variants[kaminoan-alternate]` | Clone Wars default Kaminoan has +2 INT -2 WIS, and Resistant +2 Fortitude. |
| Kaminoan | `CW-05-04` | `REVIEW_REQUIRED` | `printed-trait-label` | `packs/species.db: Kaminoan.system.canonicalTraits[resilient].name` | Printed trait heading is Resistant. |
| Kerkoiden | `CW-06-01` | `REVIEW_REQUIRED` | `unsourced-sidecar-initiative` | `data/species-traits-migrated.json: Kerkoiden.structuralTraits[Military Training]` | Printed Predator's Heritage adds +2 damage against recently damaged targets; Social Cunning uses WIS instead of CHA on Deception/Persuasion. No unconditional initiative bonus. |
| Nautolan | `CW-07-01` | `CHANGE_REQUIRED` | `invalid-automatic-language-data` | `packs/species.db: Nautolan.system.languages` | Printed Automatic Languages: Basic and Nautila. |
| Nautolan | `CW-07-02` | `CHANGE_REQUIRED` | `wrong-swim-movement-rule` | `data/species-traits-migrated.json: Nautolan.structuralTraits[Aquatic].rules[movement]` | Printed Nautolan walking speed 6 and swim speed 4. Pack movement.swim=4 is already correct. |
| Nautolan | `CW-07-03` | `REVIEW_REQUIRED` | `unprinted-blindsense` | `data/species-traits-migrated.json: Nautolan.structuralTraits[Tactile Awareness].rules` | Printed Pheromonal Sensor grants a reroll on Perception to Sense Deception/Sense Influence, with keep-better underwater; it does not grant all-purpose blindsense. |
| Nautolan | `CW-07-04` | `REVIEW_REQUIRED` | `extra-skill-fields` | `packs/species.db: Nautolan.system.skillBonuses` | Printed Expert Swimmer grants must-accept reroll and Take 10; no flat skill bonuses specified. |
| Nautolan | `CW-07-05` | `REVIEW_REQUIRED` | `legacy-variant` | `packs/species.db: Nautolan.system.variants[nautolan-variant]` | Clone Wars default has +2 CON, -2 INT, -2 WIS; swim 4 and five innate traits. |
| Nelvaanian | `CW-08-01` | `REVIEW_REQUIRED` | `unsourced-initiative-sidecar` | `data/species-traits-migrated.json: Nelvaanian.structuralTraits[Feral Instincts].rules` | Published innate traits are Low-Light Vision, Primitive, Scent, and Shadow Swiftness (AoO movement rule). |
| Republic Clone | `CW-10-01` | `CHANGE_REQUIRED` | `incorrect-plus-two-choice-UI-metadata` | `packs/species.db: Republic Clone.system.abilityChoice.{allocationMode,maxPerAbility,helpText}` | Printed clone receives fixed 15/13/10/12/10/8 and ONE chosen ability +2 at creation. |
| Republic Clone | `CW-10-02` | `REVIEW_REQUIRED` | `choice-finalization-proof` | `scripts/engine/progression/helpers/build-pending-species-context.js: Republic Clone fixed-array/choice` | One selected ability must gain +2 and no other ability may rise from the choice. |
| Vurk | `CW-09-01` | `CHANGE_REQUIRED` | `wrong-swim-speed` | `data/species-traits-migrated.json: Vurk.structuralTraits[Powerful Swimmer].rules` | Printed base speed 6, swim speed 4; Extra movement beyond 4 not printed. |
| Vurk | `CW-09-02` | `REVIEW_REQUIRED` | `unprinted-skill-extras` | `packs/species.db: Vurk.system.skillBonuses / sidecar Powerful Swimmer` | Printed Nomads grants must-accept Survival reroll; Expert Swimmer grants Swim reroll and Take 10, no unconditional +2 bonuses. |
| Vurk | `CW-09-03` | `REVIEW_REQUIRED` | `printed-name` | `packs/species.db: Vurk.system.canonicalTraits[survival-instinct].name` | Printed Vurk trait is titled Nomads; identical must-accept Survival reroll mechanic. |

### Highest-priority source-backed corrections

- **Kaminoan, p. 14:** The printed trait **Resistant** gives **+2 species Fortitude Defense**. The pack currently says `Resilient +1 Fortitude`; another executable sidecar gives **-2 Fortitude** under `Fragile`. This is a direct conflict within the current authority and a stat-affecting priority repair. An existing alternate Kaminoan profile with different ability modifiers is a separate, source-dependent variant. Do not overwrite that variant while fixing the default.
- **Gen'Dai, p. 12:** **Gen'Dai Surge** grants 5 hp at the **end** of each turn after taking Second Wind, stopping at half HP, encounter end or death. The sidecar's generic unconditional start-of-turn healing of 1 and fire suppression does not match. **Regeneration** is separately for lost limbs (1d10 minutes); **Resilient Physiology** only doubles threshold for checking if killed, not general CT checks.
- **Nautolan, pp. 15–16:** The printed languages are **Basic, Nautila**, but the pack contains sentence fragments rather than language names. Published walking/swimming speed is **6/4**; the pack correctly has swim 4 but a migrated sidecar attempts to impose **swim 6**. **Pheromonal Sensor** is a conditional perception reroll, not blanket blindsense. The legacy species variant drops a printed Wisdom penalty and swim speed; provenance must be established.
- **Vurk, p. 17:** Printed **6 walking / 4 swimming**. The pack is correct, but the sidecar `Powerful Swimmer` overrides swim to **6**, and uses an `Athletics` skill bonus inconsistent with Saga's skill names. Printed **Nomads** gives a Survival reroll, not automatic flat +2.
- **Republic Clone, p. 91:** Published fixed array **15 STR / 13 DEX / 10 CON / 12 INT / 10 WIS / 8 CHA**, plus exactly **one ability +2**. The pack's fixed scores and `bonusValue:2` are correct, but the `allocationMode='level-4-two-abilities'`, `maxPerAbility:1`, and helper text instructing two +1 increases are not. Preserve published additional starting feat and additional trained class skill.
- **Chagrian, p. 159:** The actual printed species rules are **+2 STR/-2 DEX**, Medium/6, breathing underwater, **+5 Fortitude vs radiation**, low-light vision, languages Basic/Chagri. The pack contains an entirely unrelated Codru-Ji trait claiming Chagrians possess six limbs and have Wyrwulves juveniles. Remove **only** that foreign record from Chagrian authority; do not disturb Chagrian racial IDs or its correct innate traits.

### Additional review-only findings

Dug's unsourced `Reverse Jointed` +2 Acrobatics; Iktotchi's passive initiative and Pilot skill modifiers despite printed reroll/reaction structure; Kaleesh's unrelated intimidation and skill modifiers; Kaminoan's extra skill bonuses and alternate variant; Kerkoiden's initiative bonus; Nautolan's flat skill bonuses and generic blindsense; Nelvaanian's initiative bonus; Vurk's unsourced Survival/Athletics modifier; Chagrian's extra Endurance bonus. These remain `REVIEW_REQUIRED`, not approved for deletion, until any later book/variant source is checked.

**No independent Talz or Togruta player-race species-trait block was printed in this book's main species chapter.** Their existing `source='Clone Wars'` metadata in the species pack does **not** by itself prove that this sourcebook authorizes their traits. Their earlier *Force Unleashed* source-audit records remain unchanged, and source provenance should be revisited during final cross-book reconciliation.

**No Foundry smoke tests or production patches performed.** This is a read-only audit; changes above are proposals and remain `applied:false`.

### Rolling continuation

Core, Rebellion Era, KOTOR and Force Unleashed book entries have not been overwritten. There are now **50 distinct species records** in the rolling JSON. **Next: Scum and Villainy**, then Jedi Academy Training Manual, Galaxy at War, Legacy Era, Scavenger's Guide to Droids, and the remaining supplements.
