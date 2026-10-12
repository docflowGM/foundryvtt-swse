# SWSE Species — Rolling Book-by-Book Canonical Audit

**Status:** Core reviewed; Rebellion Era species feats reconciled (identity only); KOTOR species reviewed against primary rules and live species sidecars.  
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

**Next book:** *The Force Unleashed Campaign Guide*. Its new species and any reprinted/expanded species mechanics should be appended with the same one-entry-per-species `NO_CHANGE` / `CHANGE_REQUIRED` / `REVIEW_REQUIRED` discipline.
