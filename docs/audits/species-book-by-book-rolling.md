# SWSE Species — Rolling Book-by-Book Canonical Audit

**Status:** 13 sourcebooks screened for non-droid species rules; Scavenger's Guide to Droids excluded. No production species files changed.
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

**Book completion and scope**
- Books 1–9: Core, Rebellion Era, KOTOR, Force Unleashed, Clone Wars, Scum and Villainy, Jedi Academy, Galaxy at War, Legacy Era — COMPLETED.
- Book 10: Threats of the Galaxy (organic races only) — COMPLETED.
- Book 11: Galaxy of Intrigue — NEXT.
- Book 12: The Unknown Regions — PENDING.
- Scavenger's Guide to Droids and all droid races/chassis — OUT OF SCOPE by user direction.

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

Core, Rebellion Era, KOTOR and Force Unleashed book entries have not been overwritten. There are now **50 distinct species records** in the rolling JSON. **Next: Jedi Academy Training Manual**, then Galaxy at War, Galaxy at War, Legacy Era, Scavenger's Guide to Droids, and the remaining supplements.

---

## Book 6 — Scum and Villainy

**Primary source:** Chapter I, printed pp. 6–13 (**8 species**); Point Nadir, Other Species, pp. 154–156 (**4 species**). The PDF is image-based, and the original pages were rendered and read directly rather than treating noisy transcription as authority.

### Results

| Check | Result |
|---|---:|
| Published species reviewed | **12** |
| Foundry pack identities present | **12/12** |
| Published ability adjustments, size and walking speed | **12/12 `NO_CHANGE`** |
| Species with `CHANGE_REQUIRED` finding | **7** |
| Species with `REVIEW_REQUIRED` finding only | **5** |
| Species completely `NO_CHANGE` after sidecar review | **0** |
| Individual confirmed correction candidates | **9** |
| Individual additional source/runtime reviews | **23** |
| Total tracked findings | **32** |

**Interpretation:** Every species gets an explicit field-level `NO_CHANGE` for the verified base chassis. A species with a clean chassis can still have incorrect sidecar mechanics and therefore an overall `CHANGE_REQUIRED` or `REVIEW_REQUIRED`. The absence of an overall clean species in this pass is **not** a claim that its base species data is wrong.

### Per-species dispositions

| Species | Source page(s) | Section | Published base statistics | Overall status | Finding count |
|---|---|---|---|---|---:|
| Balosar | 154 | Point Nadir | `NO_CHANGE` | `CHANGE_REQUIRED` | 4 |
| Barabel | 155 | Point Nadir | `NO_CHANGE` | `CHANGE_REQUIRED` | 4 |
| Blood Carver | 6-7 | Chapter I | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Clawdite | 7 | Chapter I | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Falleen | 8 | Chapter I | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Gand | 9 | Chapter I | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Houk | 155-156 | Point Nadir | `NO_CHANGE` | `REVIEW_REQUIRED` | 3 |
| Jawa | 10 | Chapter I | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Ryn | 11 | Chapter I | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Toydarian | 12 | Chapter I | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Ubese | 13 | Chapter I | `NO_CHANGE` | `REVIEW_REQUIRED` | 2 |
| Wroonian | 156 | Point Nadir | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |

### Rolling surgical correction queue

Each finding has a published source location, exact target selector, existing declaration, published mechanic, and proposed minimal action. All 32 are recorded with `applied:false` in JSON; nothing here is an implemented production patch. `REVIEW_REQUIRED` does not justify deleting a trait before checking other books/variants.

| Species | Finding ID | Status | Issue | Target field or sidecar | Current state | Printed source | Proposed correction / proof |
|---|---|---|---|---|---|---|---|
| Balosar | `SV-09-01` | `CHANGE_REQUIRED` | Antennapalps reroll overbroad | `packs/species.db: Balosar.system.canonicalTraits[heightened-awareness]` | Reroll any Perception check when extended | Printed reroll only Perception involving SOUND, must accept second roll; free retract/extend to appear human | Restrict to sound checks; preserve concealment/disguise state. |
| Balosar | `SV-09-02` | `REVIEW_REQUIRED` | Poison vs toxic atmosphere | `packs/species.db: Balosar.system.canonicalTraits[toxic-resistance]` | +5 Fortitude versus poisons and toxic atmospheres | Printed Poison Resistance only states +5 Fortitude against poisons | Check other source before extending bonus. |
| Balosar | `SV-09-03` | `REVIEW_REQUIRED` | Extra Toxic Breath activation | `data/species-traits.json: Balosar.activatedAbilities[Toxic Breath]` | Standard action adjacent enemy -2 attack | Printed Balosar species traits do not grant Toxic Breath | Confirm source/variant before executing. |
| Balosar | `SV-09-04` | `REVIEW_REQUIRED` | Extra skill bonus | `packs/species.db: Balosar.system.skillBonuses` | +2 Deception | Printed Moral Ambiguity instead gives +2 Will against Deception/Persuasion checks | Check source and active consumer. |
| Barabel | `SV-10-01` | `CHANGE_REQUIRED` | Wrong/missing natural weapons | `packs/species.db: Barabel.system.naturalWeapons` | Claws 1d4 slashing; Bite 1d6 piercing; Tail absent | Printed Claws 1d6 slashing, Bite 1d6 piercing, Tail 1d6 bludgeoning, always armed | Correct 3 modes once in canonical weapon generation; test attacks and item grants. |
| Barabel | `SV-10-02` | `CHANGE_REQUIRED` | Radiation resistance publication conflict | `packs/species.db: Barabel.system.canonicalTraits[radiation-resistance]` | +5 Fortitude and no persistent radiation condition | Scum p155 explicitly prints +2 Fortitude against radiation without no-persistent clause | Resolve cross-book source precedence before changing production; track this publication conflict. |
| Barabel | `SV-10-03` | `REVIEW_REQUIRED` | Extra Stun Resistance | `packs/species.db: Barabel.system.canonicalTraits[stun-resistance]` | +5 Damage Threshold to resist stun | This printed species block has no Stun Resistance trait | Search other book/variant source. |
| Barabel | `SV-10-04` | `CHANGE_REQUIRED` | Reptilian Ferocity always-on leak | `data/species-traits-migrated.json: Barabel.conditionalTraits[Reptilian Ferocity].rules` | +2 melee damage when:always, though prose says at or below half HP | Not among printed base traits; sidecar's own conditional trigger also contradicts always-on rule | Block automatic bonus; source-check distinct conditional before enabling. |
| Blood Carver | `SV-01-01` | `REVIEW_REQUIRED` | Battle Rage sidecar | `data/species-traits-migrated.json: Blood Carver.conditionalTraits[Battle Rage].rules` | +2 melee damage when:always; own text says only after taking damage | Printed innate traits: Conditional Bonus Feat (Acrobatics) and Deathstrike, not Battle Rage | Check later source and gate after receiving damage before accepting this optional bonus. |
| Blood Carver | `SV-01-02` | `REVIEW_REQUIRED` | Deathstrike runtime | `packs/species.db: Blood Carver.canonicalTraits[deathstrike]` | Pack prose correct; attack execution not inspected | On successful melee attack vs enemy denied DEX to Reflex, add one damage die | Test targeted extra damage die and eligibility; preserve text. |
| Clawdite | `SV-02-01` | `REVIEW_REQUIRED` | Extra unprinted skill fields | `packs/species.db: Clawdite.system.skillBonuses` | +2 Deception and +2 Stealth | Shapeshift instead grants +10 Deception to disguise, plus full-round appearance change without penalty | Verify source and runtime effect; no generic skill-grant inference. |
| Clawdite | `SV-02-02` | `REVIEW_REQUIRED` | Potential duplicated shapeshift | `data/species-traits.json: Clawdite.activatedAbilities[Shapeshifter]` | Another full-round appearance change as any Medium humanoid | Printed Shapeshift uses same-size form; changing size requires Metamorph | Check double ability and preserve printed size/Deception restrictions. |
| Falleen | `SV-03-01` | `CHANGE_REQUIRED` | Wrong activated pheromones | `data/species-traits.json: Falleen.activatedAbilities[Pheromones]` | -2 Will Defense to all living creatures within 6 squares for encounter | Printed pheromones target ONE adjacent nonhostile creature with level+CHA vs Fortitude; move -1 CT on hit, poison breathing rules, 24-hour immunity on failed attack | Retire incorrect second activation or align with canonical adjacent Fortitude/condition-track workflow. |
| Falleen | `SV-03-02` | `REVIEW_REQUIRED` | Extra flat skill modifiers | `packs/species.db: Falleen.system.skillBonuses` | +2 Persuasion and +2 Stealth | Only Hold Breath, Pheromones, and Pheromone Acclimation printed; no general skill bonus | Source-check extra bonuses before retaining. |
| Gand | `SV-04-01` | `REVIEW_REQUIRED` | Extra weapon familiarity | `packs/species.db: Gand.system.canonicalTraits[weapon-familiarity]` | Treat Gand weapons as non-exotic | Printed Gand list has Darkvision, Hardy, Special Equipment, Limb Regeneration; no extra weapon familiarity | Check other published equipment rules before treating as innate. |
| Gand | `SV-04-02` | `REVIEW_REQUIRED` | Special equipment runtime proof | `packs/species.db: Gand.system.canonicalTraits[special-equipment]` | Correct description; no actual builder/materialization test | Free breathing apparatus, filters and transliterator, with suffocation/translation restriction if missing | Test actual first-level grants and breathing/language rule without changing valid text. |
| Houk | `SV-11-01` | `REVIEW_REQUIRED` | Powerful Arms sidecar | `data/species-traits-migrated.json: Houk.structuralTraits[Powerful Arms].rules` | +2 melee attack always | Printed only +1 natural armor Reflex and Strength-for-Charisma on Persuasion/intimidation | Check alternate source, avoid unconditional melee attack bonuses. |
| Houk | `SV-11-02` | `REVIEW_REQUIRED` | Extra Endurance bonus | `packs/species.db: Houk.system.skillBonuses` | +2 Endurance | No flat Endurance bonus among printed abilities | Check source and runtime. |
| Houk | `SV-11-03` | `REVIEW_REQUIRED` | Language alias | `packs/species.db: Houk.system.languages` | Basic, Houkese | Printed Basic and Houk | Normalize only if invalid alias confirmed. |
| Jawa | `SV-05-01` | `CHANGE_REQUIRED` | Scavenger semantics wrong | `data/species-traits-migrated.json: Jawa.structuralTraits[Scavenger].rules` | +5 Mechanics repairing/jury-rigging, when:always | Printed Scavenger adds half Jawa level as ION damage on hits using ion weapon against droid or vehicle | Replace incorrect skill passive with correctly target-gated ion damage rider; avoid dual application. |
| Jawa | `SV-05-02` | `REVIEW_REQUIRED` | Extra flat skill bonuses | `packs/species.db: Jawa.system.skillBonuses` | +2 Perception and +2 Mechanics | Printed Mechanics always class skill plus must-accept reroll; no unconditional +2 | Check source and consumption. |
| Jawa | `SV-05-03` | `REVIEW_REQUIRED` | Language naming | `packs/species.db: Jawa.system.languages` | Jawaese; the Jawa Trade Language | Printed automatic names Jawa, Jawa Trade Language | Verify language aliases and normalize only if necessary. |
| Ryn | `SV-06-01` | `CHANGE_REQUIRED` | Invalid Perform skill passive | `data/species-traits-migrated.json: Ryn.structuralTraits[Natural Performer].rules` | +5 Perform always | Printed Musical Beak rerolls Deception to convey deceptive information (keep better) and permits Swift Action diversion via sounds within 10 squares; Perform is not a SWSE skill | Remove unsupported Perform passive; implement/preserve specific Deception conditions. |
| Ryn | `SV-06-02` | `REVIEW_REQUIRED` | Extra flat skill bonuses | `packs/species.db: Ryn.system.skillBonuses` | +2 Deception, +2 Use Computer | Printed traits Musical Beak, Connections and Prehensile Tail have no general +2 fields | Check variant source and avoid treating reroll as flat bonus. |
| Ryn | `SV-06-03` | `REVIEW_REQUIRED` | Optional sabacc procedure | `Scum and Villainy p11 boxed sidebar` | No innate racial record for sabacc fortune telling | Ryn sabacc fortune telling allows untrained Use the Force Search Your Feelings via one minute card ritual even in Force-suppressed areas | Track as separate optional procedure; do not automatically confer Force Sensitivity. |
| Toydarian | `SV-07-01` | `CHANGE_REQUIRED` | Force Resistance unconditional | `data/species-traits-migrated.json: Toydarian.structuralTraits[Force Resistance].rules` | +5 Will against all effects, when:always | Printed +5 species Will Defense ONLY against mind-affecting Use the Force checks | Scope by UTF and mind-affecting descriptor; regression vs all other Will effects. |
| Toydarian | `SV-07-02` | `REVIEW_REQUIRED` | Extra skill/defense fields | `packs/species.db: Toydarian.system.skillBonuses` | +2 Will and +2 Deception | Conditional trained Deception yields Skill Focus (Deception); Force Resistance narrow +5 Will, not blanket +2 | Check runtime effect and source. |
| Toydarian | `SV-07-03` | `REVIEW_REQUIRED` | Flight ceilings and hover | `packs/species.db: Toydarian.system.canonicalTraits[flight] / sidecar Wings` | Fly 6 present, but altitude cap/hover not structurally certified | Printed walk 4, fly 6, can hover, maximum flight altitude 2 squares | Test altitude and hover; preserve legal fly speed. |
| Ubese | `SV-08-01` | `REVIEW_REQUIRED` | Extra Survivalist passive | `data/species-traits-migrated.json: Ubese.structuralTraits[Survivalist].rules` | +2 Endurance always (prose adds +2 Survival) | Printed Survival Instinct permits must-accept Survival reroll, not flat modifier | Verify distinct source; ensure no automatic extra bonus. |
| Ubese | `SV-08-02` | `REVIEW_REQUIRED` | Extra skill fields | `packs/species.db: Ubese.system.skillBonuses` | +2 Stealth and +2 Survival | Printed traits charge Aggressive, Perception conditional feat, Survival reroll and Special Equipment | Check source, and test free suit plus suffocation. |
| Wroonian | `SV-12-01` | `CHANGE_REQUIRED` | Elongated Reach attack leak | `data/species-traits-migrated.json: Wroonian.structuralTraits[Elongated Reach].rules` | +2 melee attackRoll always, despite sidecar prose +2 grapple | Printed only +2 Will Defense and must-accept Persuasion reroll, not extra attack or grapple | Disable unauthorized unconditional attack modifier; separate valid grappling feats if any. |
| Wroonian | `SV-12-02` | `REVIEW_REQUIRED` | Trait title provenance | `packs/species.db: Wroonian.system.canonicalTraits[iron-will,soothing-voice]` | Iron Will; Soothing Voice | Printed titles Free Spirit and Skills; effects match +2 Will and must-accept Persuasion reroll | Keep rules; normalize display labels if desired. |

### Source interpretation and collision guardrails

**Toydarian, p.12 — defensive scope.** Published Force Resistance applies +5 Will **only against Use the Force checks with a mind-affecting descriptor**. A migrated passive rule currently uses `when:always`, so the sidecar must not be interpreted as a blanket Will Defense grant. Published walk 4, fly 6, hover, and maximum altitude of 2 squares should be checked as separate movement constraints.

**Falleen, p.8 — attack/effect identity.** The canonical pheromone attack uses a **standard action against a single adjacent nonhostile creature**, level+CHA against Fortitude, condition track changes, and immunity/timing/poison restrictions. The sidecar's wide-area Will Defense debuff is a *different ability*, not a safe presentation shorthand.

**Jawa, p.10 — mechanic category.** Scavenger adds **half level in ion damage** against a droid/vehicle when the Jawa hits with an ion weapon. Its sidecar instead emits an unconditional Mechanics modifier. Printed Tinkerer separately grants Mechanics class-skill access and a must-accept Mechanics reroll. Preserve all distinct traits rather than replacing one with another.

**Ryn, p.11 — skill authority.** A passive bonus to `Perform` cannot represent the printed Musical Beak; SWSE has no separate Perform skill. Musical Beak is a constrained Deception reroll and an action-based diversion. The sabacc fortune-telling sidebar is a separate special procedure, not automatic Force Sensitivity or innate Force Training.

**Balosar, p.154 — sensory gating.** Antennapalp rerolls are limited to **Perception involving sound** with must-accept new roll. The existing generalized Perception-reroll prose is overbroad. The printed poison resistance +5 applies to poison, not automatically all atmosphere hazards. Toxic Breath requires independent source proof.

**Barabel, p.155 — mixed published identities.** The printed Scum species block grants **1d6 claws, 1d6 bite, and 1d6 tail** (slashing/piercing/bludgeoning), but the pack lists claws as 1d4 and omits tail. It prints **+2 Fortitude against radiation**, while the pack currently has **+5 and an additional persistent-condition exemption**. The latter is explicitly a **cross-publication reconciliation gate**: compare Rebellion-era or other source/variants before rewriting an existing valid expansion. The sidecar Reptilian Ferocity says it depends on low HP but its structured damage rule applies always. That unconditional modifier is unsafe regardless of eventual provenance.

**Wroonian and Houk, pp.155–156 — extra attacks.** The printed Wroonian gains +2 Will and a Persuasion reroll; its sidecar instead adds +2 to **all melee attacks** under the pretense of a grapple bonus. The printed Houk gets natural armor and Strength-for-Charisma intimidation; the migrated sidecar adds +2 all melee attacks without source authority. These must not slip into generic attack modifiers without proof.

**Clawdite, p.7; Ubese, p.13; Gand, p.9 — retain correct foundational traits.** Shapeshift/Startle, suit/suffocation, and Gand life-support/transliterator requirements are present in pack descriptions. Their actual actor grants and action timing are **not runtime-certified**, and unsourced extra sidecar skills must not replace them.

### Verified operational scope

- All twelve current species identity records are present; **no** new species creation or deletion indicated by this printed book.
- The original Core, Rebellion, KOTOR, Force Unleashed, and Clone Wars findings remain separate in the ledger. No prior source claims were overwritten.
- Supplemental traits absent from Scum's printed species blocks are marked for **source provenance review**, not automatically removed.
- No Foundry V13 scene/actor runtime smoke tests or full rolling suite were executed.
- No production race records, sidecars, compendium packs, generators, or consumers were modified.

**Next book:** *Galaxy at War*. Continue the same rolling JSON and Markdown files, with per-source `NO_CHANGE` records even where no edit is necessary.

---

## Book 7 — Jedi Academy Training Manual

**Printed pages:** Shard p. **79** (Chapter IV Iron Knights), Celegian p. **106**, Vultan p. **107**, Krevaaki p. **111** (Chapter V Holocron Lessons, within NPC profiles). Source PDF pages **80, 107, 108, 112** respectively were rendered at high resolution and directly visually reviewed. The uploaded searchable transcription was a navigation aid, not a replacement for the printed rules.

### Audit scope and totals

| Measure | Result |
|---|---:|
| Published playable-species rules blocks found | **4** |
| Existing Foundry species records | **4/4** |
| Species with `CHANGE_REQUIRED` issues | **3** |
| Species with only `REVIEW_REQUIRED` issues | **0** |
| Species entirely `NO_CHANGE` for printed data | **1** |
| Specific source-backed correction candidates | **8** |
| Additional source/variant/runtime review items | **6** |
| Explicit clean-field `NO_CHANGE` decisions | **13** |
| Foundry runtime tests performed | **None** |
| Production species files changed | **None** |

**Source-coverage guardrail:** A named NPC being an unusual species does not by itself establish a published playable-species trait block. Only the four explicit racial-stat/rules blocks are included. The Iron Knight affiliation/tradition is not a racial starting class or automatic Jedi Knight prestige qualification for all Shards.

### Full per-species disposition

| Species | Printed p. | Overall outcome | Corrections | Reviews | Clean fields |
|---|---:|---|---:|---:|---:|
| Celegian | 106 | `CHANGE_REQUIRED` | 3 | 2 | 3 |
| Krevaaki | 111 | `CHANGE_REQUIRED` | 3 | 3 | 3 |
| Shard | 79 | `CHANGE_REQUIRED` | 2 | 1 | 3 |
| Vultan | 107 | `NO_CHANGE` | 0 | 0 | 4 |

**Vultan is `NO_CHANGE`.** Its +2 INT/-2 WIS, Medium/6 movement, Basic/Dromnyr automatic languages, one extra first-level trained class skill, and conditional Skill Focus for an already trained Knowledge skill match the printed p. 107 box. The existing species-grant ledger builder recognizes a generic trained-skill choice and conditional feat identity by canonical trait IDs. Live entitlement and actor finalization were not run, so this is **source-data parity**, not full functional certification.

### Full source-backed correction / review inventory

All findings appear in the rolling JSON as `entries[*].jediAcademy.findings`, with current state, printed rule, exact file/field selector, proposed surgical action, printed PDF page, and `applied:false`. No patch is authorized by recording an item.

| Species | Finding | Classification | Kind | Exact target | Published authority | Proposed surgical handling |
|---|---|---|---|---|---|---|
| Celegian | `JATM-02-01` | `CHANGE_REQUIRED` | UNAUTHORIZED_FORCE_TRAINING_FEAT | `data/species-traits-migrated.json: Celegian.structuralTraits[Force Adaptation].rules[featGrant]` | Broadcast Telepath permits ONLY the Telepathy application of Use the Force untrained without Force Sensitivity; willing within 60 squares LOS auto succeeds; does not grant Force Training | Remove/unwire unconditional Force Training entitlement; preserve only scope-limited Telepathy and no extra powers. |
| Celegian | `JATM-02-02` | `CHANGE_REQUIRED` | UNPUBLISHED_LAND_SPEED | `packs/species.db: Celegian.system.speed / movement.walk; canonicalStats.speed/movement.walk` | Printed Speed: fly 6 squares (hover), swim 10 squares; no walking speed is granted | Represent no ordinary walking capability (using schema-supported null/zero after runtime study). Preserve fly/hover 6 and swim 10. |
| Celegian | `JATM-02-03` | `CHANGE_REQUIRED` | LANGUAGE_COMPREHENSION_VS_SPEECH | `packs/species.db: Celegian.system.languages and communication permissions` | Printed Languages: Basic (understand only); Broadcast Telepath supplies their communication with willing targets | Encode comprehension-only language semantics without assuming Celegians speak Basic; preserve Broadcast Telepath and no automatic Force feat. |
| Celegian | `JATM-02-04` | `REVIEW_REQUIRED` | FLIGHT_HEAVY_LOAD_TEXT | `packs/species.db: Celegian.system.canonicalTraits[flight].description` | Printed block only says fly 6 (hover), swim 10; does not independently establish a heavy-load flight limitation | Check general burden/flight rules before removing; avoid treating apparent cross-species boilerplate as a printed Celegian trait. |
| Celegian | `JATM-02-05` | `REVIEW_REQUIRED` | CYANOGEN_LIFE_SUPPORT_RUNTIME | `packs/species.db: Celegian.system.canonicalTraits[special-equipment], actor equipment/hazards` | Printed Cyanogen Breather: Celegians suffocate without special environmental chamber; NPC Ooroo's chamber grants additional benefits as equipped item, not default species abilities | Verify breathable environment, starting gear entitlement and hazard condition; do not auto-grant Ooroo-specific chamber bonus/fly increase. |
| Krevaaki | `JATM-04-01` | `CHANGE_REQUIRED` | UNPUBLISHED_CONDITIONAL_SKILL_FOCUS | `packs/species.db: Krevaaki.system.canonicalTraits[conditional-bonus-feat] plus data/species-traits*.json` | Printed species box lists only Carapace, Stoic and Grasping Tentacles, without any Conditional Bonus Feat | Identify if a separately published optional species variant supplies it; otherwise remove noncanonical grant from default profile and sidecar. The existing alternate profile may reflect printed three traits. |
| Krevaaki | `JATM-04-02` | `CHANGE_REQUIRED` | CARAPACE_FORTITUDE_BONUS_TYPE | `packs/species.db: Krevaaki.system.canonicalTraits[carapace].description and derived bonus consumer` | Printed Carapace: Reflex +1 NATURAL ARMOR and Fortitude +1 BONUS (not identified as Natural Armor) | Keep natural armor type on Reflex only; grant the printed +1 Fortitude with correctly supported bonus-type semantics and no double-count. |
| Krevaaki | `JATM-04-03` | `CHANGE_REQUIRED` | GRASPING_TENTACLES_ADDS_GRAB | `packs/species.db: Krevaaki.system.canonicalTraits[grasping-tentacles].description / consumer` | Printed Grasping Tentacles grants +2 Climb and +2 GRAPPLE; no bonus to initiating a Grab is printed | Keep Climb/Grapple only unless published rules establish Grab equivalence; regression check difference. |
| Krevaaki | `JATM-04-04` | `REVIEW_REQUIRED` | LANGUAGE_SOURCE_CONTRADICTION | `packs/species.db: Krevaaki.system.languages and variants[krevaaki-alternate].languages` | Printed species box lists Basic and Dromnyr, while the adjacent Vodo-Siosk Baas NPC knows Basic, Kreva and Tchuukthese, potentially a source typo or character-specific languages | Record exact apparent contradiction and seek erratum/other book; do not silently replace language based only on NPC stats. |
| Krevaaki | `JATM-04-05` | `REVIEW_REQUIRED` | STOIC_PERCEPTION_APPLICATION | `packs/species.db: Krevaaki.system.canonicalTraits[stoic].description and passive consumer` | Printed Stoic imposes -5 on Sense Motive application of Perception; equivalence to current named applications not certified | Check Core Sense Motive alias/subapplications and ensure correct trigger, not a blanket Perception penalty. |
| Krevaaki | `JATM-04-06` | `REVIEW_REQUIRED` | ALTERNATE_PROFILE_PROVENANCE | `packs/species.db: Krevaaki.system.variants[krevaaki-alternate]` | Jedi Academy box itself lists only three racial abilities, without naming an alternate profile | After validating other books, reconcile default/alternate publication authority, preserving variant IDs until controlled patch. |
| Shard | `JATM-01-01` | `CHANGE_REQUIRED` | MISSING_CANONICAL_REACTION | `packs/species.db: Shard.system.canonicalTraits[Silicon Mind]` | Silicon Mind: spend Force Point as reaction for +CHA modifier (minimum +1) to Will Defense against ALL Use the Force checks until end of next turn | Append distinct canonical Silicon Mind trait and wire reaction choice and expiry only through correct existing trait authority; do not grant permanent Will bonus. |
| Shard | `JATM-01-02` | `CHANGE_REQUIRED` | INCOMPLETE_DROID_SHELL_IMMUNITY | `packs/species.db: Shard.system.canonicalTraits[droid-shell].description and canonicalStats.traits` | Droid Shell explicitly grants immunity to poison, DISEASE, radiation, noncorrosive atmospheric hazards and vacuum | Correct the canonical description/structured immunities. Legacy Crystalline Body already claims disease immunity; reconcile once-only, never add double immunities. |
| Shard | `JATM-01-03` | `REVIEW_REQUIRED` | DROID_SHELL_RUNTIME_SCOPE | `Shard.system.droidBuilder / SpeciesGrantLedgerBuilder / species runtime` | Printed shell: retain CON, mandatory maintenance, Mechanics Repair Droid only unless Force Repair, cybernetic ion interaction, accessory allowlist and x1 cost, Basic/Binary speech only with computer/vocabulator | Verify CharGen shell restrictions, prohibited natural healing, proper healing/ion/maintenance and player communication gates with representative actor; no broad droid rewrite. |

### Explicit NO_CHANGE field-level rulings

| Species | Field / feature | Status | Verification |
|---|---|---|---|
| Celegian | `system.abilityMods, size` | `NO_CHANGE` | Exact published race (NPC Ooroo is Large as an individual, not default race) |
| Celegian | `system.movement.fly/hover/swim` | `NO_CHANGE` | Exact published modes |
| Celegian | `canonicalTraits.broadcast-telepath and expert-swimmer text` | `NO_CHANGE` | Text matches printed benefits |
| Krevaaki | `system.abilityMods, size, speed` | `NO_CHANGE` | Exact printed chassis |
| Krevaaki | `canonicalTraits.grasping-tentacles Climb and Grapple parts` | `NO_CHANGE` | Match printed components; Grab addition flagged separately |
| Krevaaki | `canonicalTraits.carapace Reflex part` | `NO_CHANGE` | Correct printed armor component |
| Shard | `system.abilityMods, size` | `NO_CHANGE` | Exact printed profile |
| Shard | `system.languages` | `NO_CHANGE` | Exact named automatic languages |
| Shard | `bonus-trained-skill authority` | `NO_CHANGE` | Correct printed fixed skill; grant builder recognizes this named skill, pending live smoke |
| Vultan | `system.abilityMods, size, speed` | `NO_CHANGE` | Exact printed chassis |
| Vultan | `system.languages` | `NO_CHANGE` | Exact published languages |
| Vultan | `canonicalTraits.bonus-trained-skill` | `NO_CHANGE` | Correct book text; generic class-skill choice recognized by existing grant builder |
| Vultan | `canonicalTraits.conditional-bonus-feat` | `NO_CHANGE` | Correct published conditional feat text; grant choice must be runtime-tested |

### High-impact corrections

**Shard — p. 79.** The book grants a distinct **Silicon Mind** reaction *below* the boxed species-trait text: spend a Force Point as a reaction for a bonus to Will Defense equal to CHA modifier (minimum +1) against **all Use the Force checks** until the end of the following turn. This published racial feature is absent from the pack's canonical traits. The Shard Droid Shell description also omits **disease immunity** from its printed list, although a legacy `Crystalline Body` sidecar mentions it. Reconcile into one accurate immunity authority; do not duplicate bonuses or replace the droid-builder implementation.

**Celegian — p. 106.** Printed **Broadcast Telepath** allows a *specific application* (Telepathy) of Use the Force **untrained** without Force Sensitivity, with automatic success to willing targets in line of sight within 60 squares. The migrated sidecar instead automatically **grants Force Training**, which is a fundamentally different entitlement and must be corrected. The printed movement is **fly 6 (hover), swim 10**; the current pack additionally invents **walk 6**. Printed language is **Basic (understand only)**, not speaking Basic. The adjacent Ooroo NPC is *Large* with enhanced equipment but the species default is **Medium** and does not inherit his personal chamber benefits. Existing Flight text's heavy-load restriction needs separate general-rules verification.

**Krevaaki — p. 111.** Printed inherent features are **Carapace, Stoic, Grasping Tentacles**. The pack additionally inserts a Conditional Bonus Feat (Skill Focus [Climb]) absent from this printed list; check for another explicit optional profile before deleting or applying it. Carapace is **+1 natural armor to Reflex and +1 bonus to Fortitude**; the repository describes a Natural Armor bonus for both, which is not how the Fortitude wording is printed. Grasping Tentacles grant **+2 Climb and +2 grapple**, not an independently printed +2 to initiating grabs. Printed automatic languages are **Basic and Dromnyr**, while the pack says **Basic and Kreva**; importantly, the adjacent Vodo-Siosk Baas NPC is shown knowing Kreva, so source reconciliation/errata checking is needed before automatically replacing an apparently contradictory printed language. Stoic is printed against the **Sense Motive application of Perception**, which needs mapping to the exact system consumer without broadening the effect.

**Vultan — p. 107.** No published-data correction. Do not modify its feat/skill entitlements merely because `bonusTrainedSkills` numeric projection equals zero; the species-grant ledger classifies the canonical `bonus-trained-skill` record and maintains a player choice. Validate grant finalization as a later runtime test rather than changing valid racial data.

### Roll-forward rules

- Keep prior **Core, Rebellion Era, KOTOR, Force Unleashed, Clone Wars and Scum and Villainy** findings unchanged. These remain separately attributable published claims.
- `NO_CHANGE` means no correction to the **source-data comparison in scope**, not a promise of live Foundry behavior.
- Keep new finding states `applied:false`; do not edit `packs/species.db`, both sidecars, runtime consumers, species IDs, or versions during this read-only phase.
- Optional/variant claims and possible sourcebook contradictions remain in **`REVIEW_REQUIRED`**, not destructive remediation.
- If work proceeds to surgical fixes, adjust generator/authority first, apply minimal corrections, prove no duplicates, and run precise CharGen, actor, condition, Force, defense, and movement tests.

**Next book: Scavenger's Guide to Droids.**

---

## Book 8 — Galaxy at War

**Printed source:** *Galaxy at War*, Chapter 1, *New Species*, printed pp. **10–18**; ability adjustment Table 1-1 on printed p.10. **Nine** published species entries: Barabel, Dashade, Lurmen, Taung, Thakwaash, Trianii, Yevetha, Yuzzem, and Zygerrian. Source PDF pages 11–19 were rendered and visually checked, with the uploaded searchable transcription used for direct rules-text comparison.

### Audit results

| Audit measure | Result |
|---|---:|
| Species entries printed | **9** |
| Foundry pack identities present | **9/9** |
| New distinct species added to the rolling ledger | **8** |
| Previously audited species revisited | **1 (Barabel)** |
| Basic ability scores, size, speed `NO_CHANGE` | **9/9** |
| Species with `CHANGE_REQUIRED` | **7** |
| Species with only `REVIEW_REQUIRED` | **2** |
| Confirmed source-backed individual correction candidates | **8** |
| Additional source/runtime review items | **17** |
| Total new recorded findings | **25** |
| Older source-ambiguity findings clarified | **2** |
| Runtime tests | **Not run** |
| Production mutations | **None** |

### Every printed species, including no-change decisions

| Species | Printed p. | Book-to-ledger identity | Basic chassis | Species-wide disposition | Findings |
|---|---:|---|---|---|---:|
| Barabel | 11 | Revisited | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Dashade | 12 | New in rolling ledger | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Lurmen | 13 | New in rolling ledger | `NO_CHANGE` | `REVIEW_REQUIRED` | 3 |
| Taung | 14 | New in rolling ledger | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Thakwaash | 15 | New in rolling ledger | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Trianii | 16 | New in rolling ledger | `NO_CHANGE` | `CHANGE_REQUIRED` | 2 |
| Yevetha | 16 | New in rolling ledger | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Yuzzem | 17 | New in rolling ledger | `NO_CHANGE` | `CHANGE_REQUIRED` | 3 |
| Zygerrian | 18 | New in rolling ledger | `NO_CHANGE` | `REVIEW_REQUIRED` | 3 |

Seven species have at least one source-backed correction candidate. Lurmen and Zygerrian have review-only findings. Every species has explicit `NO_CHANGE` for published ability modifiers, size, walking speed, and automatic language names. This is NOT a claim of live runtime functionality.

### Exact rolling correction and review ledger

All findings have `applied:false` in the JSON. `CHANGE_REQUIRED` identifies a printed rule or hard mismatch; `REVIEW_REQUIRED` means source provenance, variant authority, or runtime behavior is unresolved. A legacy sidecar being absent from one book does **not** on its own authorize deletion.

| Species | Finding ID | Status | Discrepancy | Exact target selector | Source rule | Minimum surgical action |
|---|---|---|---|---|---|---|
| Barabel | `GAW-01-01` | `CHANGE_REQUIRED` | Natural attack records | `packs/species.db: Barabel.system.naturalWeapons` | Claws, bite and tail 1d6, respectively slashing/piercing/bludgeoning, always armed | Correct claw formula and add missing tail in authoritative output; avoid duplicate attacks. |
| Barabel | `GAW-01-02` | `REVIEW_REQUIRED` | Unproven Reptilian Ferocity rule | `data/species-traits-migrated.json: Barabel.conditionalTraits[Reptilian Ferocity].rules` | Not in Galaxy at War printed Barabel traits | Check variants; block always-on damage if no printed entitlement. |
| Barabel | `GAW-01-03` | `REVIEW_REQUIRED` | Flat skill bonuses | `packs/species.db: Barabel.system.skillBonuses` | Printed grants Intimidate Persuasion reroll instead | Review alternate provenance and active runtime. |
| Dashade | `GAW-02-01` | `CHANGE_REQUIRED` | Force Resistance missing Fortitude | `packs/species.db: Dashade.system.canonicalTraits[force-resistance]` | Printed +5 Fortitude AND +5 Will vs all Use the Force checks | Complete published bonus; narrow both to UTF targeting. |
| Dashade | `GAW-02-02` | `CHANGE_REQUIRED` | Incorrect Reflex passive | `data/species-traits-migrated.json: Dashade.structuralTraits[Force Resistance].rules` | No Reflex bonus; +5 Fort/Will conditional on UTF | Remove/replace Reflex, verify no generic passive or double grant. |
| Dashade | `GAW-02-03` | `REVIEW_REQUIRED` | Stealth bonus and printed name | `packs/species.db: Dashade.system.skillBonuses / canonicalTraits[frightening-visage]` | No generic Stealth bonus; printed Fearsome Reputation rerolls Intimidate and keeps better | Source-check skill bonus; normalize player-facing alias without altering reroll. |
| Lurmen | `GAW-03-01` | `REVIEW_REQUIRED` | Extra Will bonus | `data/species-traits-migrated.json: Lurmen.structuralTraits[Pacifist Resolve].rules` | Printed Mender, Primitive, Roller and Take 10 Climb; no flat +2 Will | Require independent source before enabling. |
| Lurmen | `GAW-03-02` | `REVIEW_REQUIRED` | Extra skill bonuses | `packs/species.db: Lurmen.system.skillBonuses` | Printed Climb Take 10 and conditional Treat Injury DC reduction, not static skill modifiers | Review printed provenance and consumers. |
| Lurmen | `GAW-03-03` | `REVIEW_REQUIRED` | Roller and Mender execution | `packs/species.db: Lurmen.system.canonicalTraits[roller,mender]` | Roller swift +4 speed with severe action restrictions; Mender reduces DC by trained healer's WIS modifier | Test action gates/duration and conditional Treat Injury DC, no data rewrite. |
| Taung | `GAW-04-01` | `CHANGE_REQUIRED` | Warrior Culture melee attack leak | `data/species-traits-migrated.json: Taung.structuralTraits[Warrior Culture].rules` | Warrior Culture rerolls Knowledge (Tactics), must accept new roll | Replace invalid meleeCultureBonus with scoped skill reroll. |
| Taung | `GAW-04-02` | `REVIEW_REQUIRED` | Armor and three defenses runtime | `packs/species.db: Taung.system.canonicalTraits[armor-training,superior-defenses]` | +1 Max DEX of worn armor; +1 species to all three defenses | Test stacking and capped DEX, retain pack authority. |
| Thakwaash | `GAW-05-01` | `CHANGE_REQUIRED` | Dual Brains false passive defenses | `data/species-traits-migrated.json: Thakwaash.structuralTraits[Dual Brains].rules` | Printed Multiple Personalities negates/removes mind-affecting effect at start of turn, free action once/encounter; +1 Reflex natural armor is separate | Remove/disable unsourced +2 defenses; preserve the printed timed ability. |
| Thakwaash | `GAW-05-02` | `REVIEW_REQUIRED` | Extra Survival skill field | `packs/species.db: Thakwaash.system.skillBonuses` | Not among printed traits | Check separate source and consumer. |
| Thakwaash | `GAW-05-03` | `REVIEW_REQUIRED` | Multiple Personalities behavior | `packs/species.db: Thakwaash.system.canonicalTraits[irrepressible-mind]` | Once/encounter free action at START of turn remove/negate any mind-affecting effect | Runtime-test window, expiration and charges; label can be aligned later. |
| Trianii | `GAW-06-01` | `CHANGE_REQUIRED` | Missing structured claws | `packs/species.db: Trianii.system.naturalWeapons` | 1d6 slashing claws, always armed | Trace producer and grant exactly one natural-weapon profile. |
| Trianii | `GAW-06-02` | `REVIEW_REQUIRED` | Feline Instincts extra passive | `data/species-traits-migrated.json: Trianii.structuralTraits[Feline Instincts].rules` | Printed Acrobatics reroll, natural claws, prehensile tail; no bonus Initiative | Check distinct published source before retaining. |
| Yevetha | `GAW-07-01` | `CHANGE_REQUIRED` | Missing structured retractable claws | `packs/species.db: Yevetha.system.naturalWeapons` | 1d6 slashing retractable claws, always armed | Ensure one natural-weapon attack from generator/materializer. |
| Yevetha | `GAW-07-02` | `REVIEW_REQUIRED` | Militaristic Culture extra passive | `data/species-traits-migrated.json: Yevetha.structuralTraits[Militaristic Culture].rules` | Printed Mechanical Aptitude, claws and Xenophobia; no flat Initiative | Seek variant/book provenance. |
| Yevetha | `GAW-07-03` | `REVIEW_REQUIRED` | Racial choice and Xenophobia runtime | `packs/species.db: Yevetha.system.canonicalTraits[mechanical-aptitude,xenophobia]` | Natural-20 Mechanics once/encounter; +2 Will only against attitude-improving Persuasion from different species | Test once-only roll and narrow social defense. |
| Yuzzem | `GAW-08-01` | `CHANGE_REQUIRED` | Missing 1d8 bite/claws profiles | `packs/species.db: Yuzzem.system.naturalWeapons` | 1d8 piercing bite, 1d8 slashing claws, always armed | Ensure two distinct 1d8 natural attacks in authorized producer, once only. |
| Yuzzem | `GAW-08-02` | `REVIEW_REQUIRED` | Rage sidecar provenance | `data/species-traits-migrated.json: Yuzzem.conditionalTraits[Rage].rules` | Published trait block has no Rage | Check other publication and verify gating; do not auto-grant. |
| Yuzzem | `GAW-08-03` | `REVIEW_REQUIRED` | Legacy skill bonuses | `packs/species.db: Yuzzem.system.skillBonuses` | Printed Climb reroll and Scent scope, not flat bonuses | Review source and actual passive. |
| Zygerrian | `GAW-09-01` | `REVIEW_REQUIRED` | Dominating Presence sidecar | `data/species-traits-migrated.json: Zygerrian.structuralTraits[Dominating Presence].rules` | Printed bonus Martial Arts I, +2 Will, CHA replaces WIS for Will; no Persuasion bonus | Source-check supplemental variant before granting. |
| Zygerrian | `GAW-09-02` | `REVIEW_REQUIRED` | Martial Arts I start grant runtime | `packs/species.db: Zygerrian.system.canonicalTraits[bonus-feat]` | Printed grants Martial Arts I automatically at 1st level | Test species-grant builder/finalizer once-only; do not alter valid text solely due to counter. |
| Zygerrian | `GAW-09-03` | `REVIEW_REQUIRED` | Will CHA substitution runtime | `packs/species.db: Zygerrian.system.canonicalTraits[strength-of-conviction]` | CHA replaces WIS (not added to it) for Will, alongside separate +2 species Iron Will | Test derived Will modifiers and stacking. |

### Explicit NO_CHANGE decisions

| Species | Field | Status | Source verification |
|---|---|---|---|
| Barabel | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Barabel | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Barabel | `canonicalTraits[radiation-resistance]` | `NO_CHANGE` | GAW p11 confirms +5 Fortitude vs radiation and no persistent radiation condition; Scum variant differs. |
| Barabel | `canonicalTraits[stun-resistance]` | `NO_CHANGE` | GAW p11 explicitly grants +5 stun Damage Threshold. |
| Dashade | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Dashade | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Lurmen | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Lurmen | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Taung | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Taung | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Thakwaash | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Thakwaash | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Trianii | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Trianii | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Yevetha | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Yevetha | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Yuzzem | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Yuzzem | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Zygerrian | `system.abilityMods / system.size / system.speed` | `NO_CHANGE` | Matches published source table and profile. |
| Zygerrian | `system.languages` | `NO_CHANGE` | Matches printed Automatic Languages. |
| Zygerrian | `canonicalTraits[bonus-feat,iron-will,strength-of-conviction]` | `NO_CHANGE` | All 3 printed racial benefits described accurately; runtime certification is distinct. |

### Cross-book reconciliation: Barabel

Earlier *Scum and Villainy*, p.155, printed **+2 Fortitude against radiation** and did not include *Stun Resistance* in its species block. The current species pack instead contains **+5 Fortitude against radiation**, no persistent radiation condition, and **+5 damage threshold against stun**.

**Galaxy at War p.11 explicitly publishes the current pack's stronger radiation rules and Stun Resistance.** Consequently:

- Prior finding `SV-10-02` (radiation publication conflict) is now linked in JSON to `RECONCILED_NO_PRODUCTION_CHANGE`. **Do not change the pack from +5 down to +2 just to match the older Scum block.**
- Prior finding `SV-10-03` (Stun Resistance not printed in Scum) is now linked to `CONFIRMED_NO_CHANGE`: the trait is published in Galaxy at War.
- The older source claims and finding IDs remain in the ledger as historical evidence; a new `galaxyAtWar.crossBookResolutions` field records the updated resolution. No earlier audit entry was erased or rewritten.
- The **unresolved** Barabel natural-weapon error remains: claws 1d4 in structured pack vs 1d6 printed, with no structured tail. A sidecar also declares Reptilian Ferocity `when:always` despite its own conditional benefit; source verification is still required.

### Additional material findings

**Dashade, p.12:** Printed Force Resistance gives **+5 Fortitude and +5 Will** against **Use the Force checks**, not unconditional Reflex. Current pack only describes Will, and an executable migrated sidecar incorrectly grants unconditional +5 Reflex. Two targeted mechanical corrections are required.

**Taung, p.14:** The book grants *Warrior Culture* as a must-accept reroll to Knowledge (Tactics). An executable sidecar grants +2 to **every melee attack** instead; this must be surgically removed/replaced. The pack's other printed traits, *Armor Training* and *Superior Defenses*, should be runtime-tested, not rewritten.

**Thakwaash, p.15:** Printed *Multiple Personalities* allows once/encounter free action at start of turn to negate/remove mind-affecting effects, alongside +1 natural armor Reflex. Sidecar instead grants +2 Will Defense (and its prose also promises +2 Reflex). Never replace an active timed effect with static defenses.

**Trianii, p.16; Yevetha, p.16; Yuzzem, p.17:** Printed natural weapons are **Trianii 1d6 claws**, **Yevetha 1d6 retractable claws**, and **Yuzzem 1d8 bite or 1d8 claws**. Their pack descriptions mention them but all three `system.naturalWeapons` arrays are empty. Trace the existing weapon grant/materialization process before adding structured forms; duplicate attacks are not acceptable.

**Lurmen, p.13:** Printed *Mender* and *Roller* semantics already match the pack. An extra sidecar +2 Will and generic +2 Acrobatics/Stealth skill fields have no support from this book; these are review items pending separate provenance, not approved deletions. The distinctive Roller action restriction deserves a live check.

**Zygerrian, p.18:** The pack correctly describes Martial Arts I bonus feat, +2 species Will Defense, and replacing Wisdom with Charisma for Will. Its numeric `bonusFeats:0` projection alone does not prove the feat is missing, since the grant builder parses the canonical feat entitlement. Verify grant and substitution through real actor progression. A sidecar +2 Persuasion is not printed and remains `REVIEW_REQUIRED`.

### Audit boundaries

- The original Core, Rebellion Era, KOTOR, Force Unleashed, Clone Wars, Scum and Villainy, and Jedi Academy chapters remain unchanged in both files.
- This book revisits Barabel but does not create a duplicate species identity; the global rolling ledger now contains **74 distinct species records**.
- The same status vocabulary applies: `NO_CHANGE` is allowed for clean fields or whole species after source comparison; it does not certify runtime. `REVIEW_REQUIRED` never means automatic deletion.
- No production species packs, sidecars, runtime source, or generators were changed; all **25** new findings remain `applied:false`.

**Next book: Legacy Era Campaign Guide.** Continue the same append-only source rulings and rolling JSON/Markdown. Verify existing variants and name collisions separately from innate species grants.

---

## Book 9 — Legacy Era Campaign Guide

**Primary source:** *Legacy Era Campaign Guide*, printed species chapter pp. **10–17** (8 playable races) plus five **New Species** sidebars: **Vahla p.59**, **Advozse p.199**, **Sakiyan p.204**, **Chadra-Fan p.211**, and **Devaronian p.214**. The original scanned PDF was rendered for printed page comparisons (PDF page = printed page +1), with the uploaded searchable transcription used for fast lookup. **Sakiyan was missing from the text transcription and recovered from the original printed PDF on p.204**, preventing a false incomplete census.

### Book-level result

| Check | Count |
|---|---:|
| Published species blocks audited | **13** |
| Chapter I species | 8 |
| Additional later-chapter sidebars | 5 |
| Existing Foundry species identities found | **13/13** |
| Species previously reviewed in another book | **1** (Chagrian) |
| New distinct species appended to rolling ledger | 12 |
| Published size and speed correct | **13/13** |
| Overall `NO_CHANGE` | **1** (Zeltron) |
| Species with `CHANGE_REQUIRED` | 6 |
| Species with only `REVIEW_REQUIRED` | 6 |
| Source-backed correction candidates | **13** |
| Additional source/variant/runtime reviews | **19** |
| Total tracked new findings | **32** |

**Interpretation:** This is a read-only, static source/sidecar audit. All 13 have explicit `NO_CHANGE` decisions on published size/base speed; ten have matching ability score modifiers, while **Chiss, Chadra-Fan, and Devaronian** require profile reconciliation. A source-data `NO_CHANGE` does not certify runtime.

### Full species index

| Species | Printed page | Location | Existing audit history | Overall disposition | Findings |
|---|---:|---|---|---|---:|
| Chagrian | 11 | Ch. I | Previously reviewed | `CHANGE_REQUIRED` | 2 |
| Chiss | 12 | Ch. I | New to rolling ledger | `CHANGE_REQUIRED` | 5 |
| Codru-Ji | 13 | Ch. I | New to rolling ledger | `CHANGE_REQUIRED` | 3 |
| Klatooinian | 14 | Ch. I | New to rolling ledger | `REVIEW_REQUIRED` | 1 |
| Nagai | 15 | Ch. I | New to rolling ledger | `REVIEW_REQUIRED` | 2 |
| Weequay | 16 | Ch. I | New to rolling ledger | `REVIEW_REQUIRED` | 2 |
| Yuuzhan Vong | 17 | Ch. I | New to rolling ledger | `CHANGE_REQUIRED` | 3 |
| Zeltron | 17 | Ch. I | New to rolling ledger | `NO_CHANGE` | 0 |
| Vahla | 59 | Sidebar | New to rolling ledger | `REVIEW_REQUIRED` | 3 |
| Advozse | 199 | Sidebar | New to rolling ledger | `REVIEW_REQUIRED` | 2 |
| Sakiyan | 204 | Sidebar | New to rolling ledger | `REVIEW_REQUIRED` | 2 |
| Chadra-Fan | 211 | Sidebar | New to rolling ledger | `CHANGE_REQUIRED` | 3 |
| Devaronian | 214 | Sidebar | New to rolling ledger | `CHANGE_REQUIRED` | 4 |

### Complete surgical correction and source-review inventory

Every entry has a stable issue ID and exact selector. All `applied:false`. `CHANGE_REQUIRED` means this publication directly contradicts data in the current representation; `REVIEW_REQUIRED` defers a possibly valid later source, a variant, or an untested consumer. Do not delete optional traits merely because one printed base-race entry omits them.

| Species | ID | State | Discrepancy | Source file / selector | Printed authority | Proposed minimum action |
|---|---|---|---|---|---|---|
| Chagrian | `LEG-01-01` | `CHANGE_REQUIRED` | Foreign Codru-Ji anatomy contaminates Chagrian species | `packs/species.db: Chagrian.system.canonicalTraits[all-codru-ji-possess-six-limbs] and canonicalStats.traits` | Legacy p11 prints only Breathe Underwater, Low-Light Vision and Radiation Resistance; the Codru-Ji description belongs to the next race. | Remove only imported Codru-Ji trait and derived projection through canonical source/generator; preserve Chagrian IDs and real traits. |
| Chagrian | `LEG-01-02` | `REVIEW_REQUIRED` | Extra Endurance skill bonus | `packs/species.db: Chagrian.system.skillBonuses` | Legacy p11 species traits do not grant unconditional Endurance bonus. | Check other source/variant; no generic passive without evidence. |
| Chiss | `LEG-02-01` | `CHANGE_REQUIRED` | Incorrect Chiss ability score and missing canonical modifiers provenance | `packs/species.db: Chiss.system.abilityMods / abilities` | Legacy p12 grants +2 Intelligence, no Charisma penalty. | Correct Legacy-authoritative race data or introduce a sourced variant if required; preserve record identity. |
| Chiss | `LEG-02-02` | `CHANGE_REQUIRED` | Missing published first-level bonus trained skill | `packs/species.db: Chiss.system.canonicalTraits / bonusTrainedSkills` | Legacy p12: choose one additional trained skill from first-level class skill list. | Add typed canonical bonus-trained-skill choice and validate finalizer/actor selection once. Do not conflate with fixed class skill. |
| Chiss | `LEG-02-03` | `CHANGE_REQUIRED` | Chiss darkvision instead of Low-Light Vision | `data/species-traits-migrated.json: Chiss.structuralTraits[Darkvision].rules + pack vision traits` | Legacy p12 grants Low-Light Vision: ignore concealment but NOT total concealment caused by darkness. | Use correct low-light sense on canonical authority and stop darkvision; verify vision in actor/token. |
| Chiss | `LEG-02-04` | `CHANGE_REQUIRED` | Extra automatic Basic language | `packs/species.db: Chiss.system.languages` | Legacy p12 Automatic Languages: Cheunh only. | Preserve Basic as learnable language; remove unproven automatic grant or model separate sourced variant. |
| Chiss | `LEG-02-05` | `REVIEW_REQUIRED` | Unprinted Tactical Training and Initiative bonuses | `data/species-traits-migrated.json: Chiss.structuralTraits[Tactical Training].rules; packs/species.db: Chiss.system.skillBonuses` | Legacy p12 printed Chiss base traits include bonus trained skill and Low-Light Vision; no +2 Initiative. | Look for a separate sourcebook/variant; prevent unsupported passive addition until proven. |
| Codru-Ji | `LEG-03-01` | `CHANGE_REQUIRED` | Skilled Grappler extended beyond grab attacks | `packs/species.db: Codru-Ji.system.canonicalTraits[skilled-grappler]` | Legacy p13 Skilled Grappler grants +5 species bonus to GRAB attacks; no independent Grapple bonus. | Limit to published Grab attack checks; verify rules engine treats Grab/Grapple separately. |
| Codru-Ji | `LEG-03-02` | `CHANGE_REQUIRED` | Quad-Limbed sidecar injects melee attack bonus | `data/species-traits-migrated.json: Codru-Ji.structuralTraits[Quad-Limbed].rules` | Legacy p13 has Extra Arms (carry four items, no extra attacks) and Skilled Grappler +5 grab attacks; never +2 all melee. | Remove/disable invented melee damageModifier and preserve Extra Arms/Grab semantics. |
| Codru-Ji | `LEG-03-03` | `REVIEW_REQUIRED` | Conditional Dual Weapon Mastery feat grant timing | `packs/species.db: Codru-Ji.system.canonicalTraits[conditional-bonus-feat] / advancement` | Legacy p13 grants Dual Weapon Mastery if its printed prerequisites (DEX 13 and BAB +1) are met. | Test grant becomes available exactly when prerequisites are met, not automatically to ineligible level-one actor or permanently skipped. |
| Klatooinian | `LEG-04-01` | `REVIEW_REQUIRED` | Unprinted Hard Laborer passive | `data/species-traits-migrated.json: Klatooinian.structuralTraits[Hard Laborer].rules` | Legacy p14 only prints Iron Will +2 Will plus base chassis; no innate Endurance bonus. | Check other printed source/variant before retaining as automatic species modifier. |
| Nagai | `LEG-05-01` | `REVIEW_REQUIRED` | Cold Adaptation sidecar applied unconditionally | `data/species-traits-migrated.json: Nagai.structuralTraits[Cold Adaptation].rules` | Legacy p15 inherent traits: Lightning Reflexes, Soothing Voice, tehk'la blade familiarity. No extra Fortitude. | Seek source and if a valid cold-specific trait exists, gate to cold environment rather than always. |
| Nagai | `LEG-05-02` | `REVIEW_REQUIRED` | Unprinted flat skills | `packs/species.db: Nagai.system.skillBonuses` | Legacy p15 Soothing Voice is a Persuasion reroll, not flat skill bonus. | Source/variant check and verify passive pipeline consumption. |
| Weequay | `LEG-06-01` | `REVIEW_REQUIRED` | Unprinted Will Defense sidecar | `data/species-traits-migrated.json: Weequay.structuralTraits[Stoic Resolve].rules` | Legacy p16 lists Endurance-trained Skill Focus, +1 natural armor Reflex, and 20-square tribal pheromones, not +2 Will. | Seek source-specific authorization and prevent generic Will bonus if absent. |
| Weequay | `LEG-06-02` | `REVIEW_REQUIRED` | Flat Endurance score instead of conditional feat | `packs/species.db: Weequay.system.skillBonuses` | Published grants Skill Focus (Endurance) only IF Endurance trained. | Check other source and ensure numeric field does not supplant trained-skill prerequisite. |
| Yuuzhan Vong | `LEG-07-01` | `CHANGE_REQUIRED` | Malformed automatic Force immunity matcher | `data/species-traits-migrated.json: Yuuzhan Vong.structuralTraits[Force Immunity].rules` | Legacy p17 grants immunity to Force effects TARGETING Will, plus ban Force Sensitivity, Use the Force checks, Force Points. | Replace meaningless marker with typed scope-limited Will-targeting Force-effect immunity; test that attacks against Reflex/Fortitude are NOT blanket immune. |
| Yuuzhan Vong | `LEG-07-02` | `CHANGE_REQUIRED` | Sidecar forbids all non-organic gear | `data/species-traits-migrated.json: Yuuzhan Vong.structuralTraits[Living Technology].rules` | Printed Technophobic withholds starting Heavy/Pistol/Rifle proficiency; it does not mechanically prohibit handling all inorganic equipment. | Remove/unwire absolute inorganic equipment ban unless another rules source explicitly creates enforceable restriction; preserve cultural description and starting proficiency suppression. |
| Yuuzhan Vong | `LEG-07-03` | `REVIEW_REQUIRED` | Biotech Proficiency extra beyond Legacy trait list | `packs/species.db: Yuuzhan Vong.system.canonicalTraits[biotech-proficiency]` | Legacy p17 inherent traits only Force Immunity, Technophobic, Amphistaff familiarity. | Verify separate printed biotech weapon rules/variant before removing or conferring an extra proficiency. |
| Vahla | `LEG-09-01` | `REVIEW_REQUIRED` | Dark Side Affinity passive unsourced and ungated | `data/species-traits-migrated.json: Vahla.conditionalTraits[Dark Side Affinity].rules` | Legacy p59 grants Dark Side Stigma, bonus Force Sensitivity feat and Cartilaginous Skeleton Acrobatics reroll; no generic +2 Use the Force. | Source-check any tradition/feat/optional bonus. If valid require dark-side-power context, never always-on. |
| Vahla | `LEG-09-02` | `REVIEW_REQUIRED` | Cartilaginous Skeleton player-facing trait label | `packs/species.db: Vahla.system.canonicalTraits[heightened-agility].name` | Legacy p59 calls this Cartilaginous Skeleton. | Consider non-destructive display name/alias correction; preserve existing identity and mechanics. |
| Vahla | `LEG-09-03` | `REVIEW_REQUIRED` | Dark Side Stigma cost and bonus feat runtime | `Vahla species grant ledger and Force Point/Dark Side adjustment consumers` | Legacy p59 doubles Force Point redemption cost, and grants Force Sensitivity as a bonus feat at creation. | Verify one-time feat grant and double cost without silently giving a flat +2 UTF. |
| Advozse | `LEG-10-01` | `REVIEW_REQUIRED` | Unsupported Silver Tongue skill bonus and reroll | `data/species-traits-migrated.json: Advozse.structuralTraits[Silver Tongue] / conditionalTraits[Silver Tongue (Reroll)]` | Legacy p199 prints Perception reroll, Low-Light Vision, +1 natural armor Reflex, not Persuasion traits. | Find variant or later book source; do not substitute for actual Perception reroll. |
| Advozse | `LEG-10-02` | `REVIEW_REQUIRED` | Flat Perception bonus separate from reroll | `packs/species.db: Advozse.system.skillBonuses` | Printed Heightened Awareness is a reroll with mandatory second result; no flat +2. | Validate independent source and avoid double-count. |
| Sakiyan | `LEG-11-01` | `REVIEW_REQUIRED` | Aerial Hunter extra Initiative passive | `data/species-traits-migrated.json: Sakiyan.conditionalTraits[Aerial Hunter].rules` | Legacy p204 printed Sakiyan has Darkvision, conditional Skill Focus (Perception), +2 Reflex, and no species Flight. | Check alternate source/feat before retaining; never apply flying-only bonus to nonflying Sakiyan. |
| Sakiyan | `LEG-11-02` | `REVIEW_REQUIRED` | Flat Perception field rather than feat | `packs/species.db: Sakiyan.system.skillBonuses` | Book offers Skill Focus (Perception) IF already trained; not an unconditional +2. | Source-check and verify conditional grant exactly once. |
| Chadra-Fan | `LEG-12-01` | `CHANGE_REQUIRED` | Default ability profile disagrees with printed and alternate is correct | `packs/species.db: Chadra-Fan.system.abilityMods and variants[chadra-fan-alternate]` | Legacy p211 gives +2 Charisma and -2 Wisdom. | Reconcile authority: make the published Legacy profile selectable/default as justified, preserving other genuinely sourced variants without silently erasing them. |
| Chadra-Fan | `LEG-12-02` | `CHANGE_REQUIRED` | Default misses complete Tinkerer and class-skill access | `packs/species.db: Chadra-Fan.system.canonicalTraits[heightened-awareness,quality-repairs] and variants[chadra-fan-alternate]` | Legacy p211 Tinkerer gives Mechanics reroll must accept, extra 1d8 HP repair/jury-rig, and always class skill. | Ensure Legacy racial profile has all three Tinkerer benefits; preserve other printed variant separately. |
| Chadra-Fan | `LEG-12-03` | `REVIEW_REQUIRED` | Extra unsourced +2 skills | `packs/species.db: Chadra-Fan.system.skillBonuses` | Legacy p211 grants Mechanics reroll and class skill, not flat +2. | Check alternate publication/variant and live consumer before granting. |
| Devaronian | `LEG-13-01` | `CHANGE_REQUIRED` | Male Devaronian stat choice unavailable | `packs/species.db: Devaronian.system.abilityMods` | Legacy p214 male receives +2 DEX, -2 WIS, -2 CHA. | Implement canonical male profile or mandatory sex-based selection, without using a zero-adjustment fallback. |
| Devaronian | `LEG-13-02` | `CHANGE_REQUIRED` | Female Devaronian variant stats incorrect | `packs/species.db: Devaronian.system.variants[devaronian-female].abilityMods` | Legacy p214 female receives +2 INT, +2 WIS, -2 DEX. | Fix published female profile in source/selector; preserve choice identity and test final actor modifiers. |
| Devaronian | `LEG-13-03` | `REVIEW_REQUIRED` | Extra automatic Force Resistance bonus | `data/species-traits-migrated.json: Devaronian.structuralTraits[Force Resistance].rules` | Legacy p214 only grants trained Deception conditional Skill Focus and Natural Curiosity action, not Force Resistance. | Check another book/variant for legitimate resistance; do not grant unsourced Will bonus. |
| Devaronian | `LEG-13-04` | `REVIEW_REQUIRED` | Unprinted skill bonuses and Natural Curiosity runtime | `packs/species.db: Devaronian.system.skillBonuses / canonicalTraits[natural-curiosity]` | Legacy p214 grants Deception-trained Skill Focus, once/encounter standard-action Perception vs DC15/Stealth for +1 insight attacks vs target. | Source-check flat skills, and regression-test targeting, limit and nonstacking of insight bonus. |

### Explicit clean-field judgments

| Species | Reviewed source field | Status | Basis |
|---|---|---|---|
| Chagrian | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Chagrian | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Chagrian | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Chiss | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Codru-Ji | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Codru-Ji | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Codru-Ji | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Klatooinian | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Klatooinian | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Klatooinian | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Nagai | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Nagai | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Nagai | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Weequay | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Weequay | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Weequay | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Yuuzhan Vong | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Yuuzhan Vong | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Yuuzhan Vong | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Zeltron | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Zeltron | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Zeltron | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Zeltron | `system.canonicalTraits[empathy,soothing-pheromones]` | `NO_CHANGE` | Published scoped bonus CHA to sense deception/influence and +5 Persuasion to change attitude except Zeltrons match pack. |
| Vahla | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Vahla | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Vahla | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Vahla | `system.canonicalTraits[bonus-feat,dark-side-stigma,heightened-agility].description` | `NO_CHANGE` | Three effects described correctly: bonus Force Sensitivity, 2 FP DSP redemption, Acrobatics reroll. Name alias is review-only. |
| Advozse | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Advozse | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Advozse | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Sakiyan | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Sakiyan | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Sakiyan | `system.abilityMods` | `NO_CHANGE` | Published racial ability modifiers match pack. |
| Sakiyan | `system.canonicalTraits[darkvision,conditional-bonus-feat,lightning-reflexes]` | `NO_CHANGE` | Three published traits accurately present in pack. |
| Chadra-Fan | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Chadra-Fan | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |
| Devaronian | `system.size / system.speed` | `NO_CHANGE` | Published Medium/Small and base speed agree with pack. |
| Devaronian | `system.languages` | `NO_CHANGE` | Published automatic-language names match pack. |

### Priority source conclusions

**Chiss — p.12: multiple CharGen-critical discrepancies.** The book prints **+2 Intelligence only** (no Charisma penalty), **one extra first-level trained class skill**, **Low-Light Vision**, and **Cheunh only** as an automatic language. The current pack has `+2 INT/-2 CHA`, no pack canonical trait records or bonus-trained-skill choice, Cheunh and Basic, while a legacy sidecar grants **Darkvision** and an unsourced +2 Initiative. These are multiple independent corrections. Preserve the `species-chiss` identity; don't infer Chiss Force restrictions from surrounding flavor text.

**Devaronian — p.214: gender-dependent ability profiles.** Printed **male: +2 DEX, -2 WIS, -2 CHA** and **female: +2 INT, +2 WIS, -2 DEX**. The repo's default is six zero adjustments; the female variant instead has +2 WIS/-2 CHA. Correct both published options through a source-aware choice/profile without inventing zero-adjustment characters. Printed conditional Skill Focus (Deception) and once-per-encounter Natural Curiosity belong to **both**, and must be tested without adding the sidecar's unsupported +2 Will.

**Chadra-Fan — p.211: printed profile currently relegated to an alternate.** The printed species has **+2 CHA/-2 WIS**, Small/4, Darkvision, and **Tinkerer**: must-accept Mechanics reroll, extra 1d8 healing from repair/jury-rig, and Mechanics always a class skill. The current default has **+2 DEX/-2 WIS** and omits the reroll/class-skill portions; the alternate profile contains the complete printed package. **Do not simply delete the default variant** before its other published source is located; ensure the Legacy profile has correct explicit selection/default authority.

**Codru-Ji — p.13: melee exploit risk.** The printed species has Extra Arms (no bonus attacks), +5 species to **Grab attacks**, and conditional Dual Weapon Mastery when DEX 13/BAB +1 prerequisites are satisfied. The pack extends +5 to Grapple and the sidecar adds +2 to all melee attack rolls. Neither is justified by this printed base-race entry. Test Grab vs Grapple as separate actions and the conditional feat timing.

**Yuuzhan Vong — p.17: malformed immunity and over-restrictive equipment.** The printed Force Immunity forbids Force Sensitivity, Use the Force checks and Force Points, and protects against **Force effects that target Will Defense**, not all attacks with Force-related effects. The migrated sidecar's immunity matcher literally has `values:['t']`; a second rule categorically forbids inorganic equipment, while **Technophobic only withholds starting ranged weapon proficiencies**. Preserve permitted Amphistaff familiarity, and do not turn cultural aversion into an unconditional equipment prohibition.

**Chagrian — p.11: independently confirmed wrong-species import.** Printed only Breathe Underwater, Low-Light Vision and Radiation Resistance. The Codru-Ji six-limb/Wyrwulves anatomy in the pack is definitively misplaced. Existing Clone Wars issue `CW-11-01` remains open and is linked here as a second authoritative proof; **do not create a second Chagrian species record** or overwrite older findings.

**Vahla — p.59: legitimate Force Sensitivity grant, questionable passive bonus.** All Vahla explicitly gain Force Sensitivity; Dark Side Stigma doubles Force Point cost to reduce Dark Side Score, and Cartilaginous Skeleton grants the must-accept Acrobatics reroll. The pack describes all three correctly, though the latter trait is displayed as Heightened Agility. Sidecar `Dark Side Affinity` adds unconditional +2 Use the Force and is **not** an automatic printed Vahla grant. Verify provenance before any unconditional bonus.

**Advozse — p.199:** Base modifiers **-2 DEX/+2 CON/+2 WIS**, Perception reroll with mandatory second result, Low-Light Vision, and +1 natural armor Reflex all match. Sidecar introduces extra generic Persuasion bonuses/rerolls; verify printed source elsewhere. The +2 Perception legacy field must not replace the actual reroll.

**Sakiyan — p.204:** This printed species sidebar did not survive the uploaded text extraction. The PDF confirms size Medium/6, **no ability adjustments**, Darkvision, trained-Perception-conditional Skill Focus, and +2 species Reflex; pack matches these. Sidecar `Aerial Hunter` adds +2 Initiative `when:always` despite a description about flying, and **Sakiyan receives no innate flight in this book**. Preserve accurate canonical three-trait block; review bonus provenance.

**Zeltron — p.17: `NO_CHANGE`.** +2 CHA/-2 WIS, Basic, Empathy adding positive CHA to Perception Sense Deception/Influence, and +5 Persuasion to **change attitudes** excluding other Zeltrons are already correctly described. No replacement of those scoped abilities with unconditional +5 Persuasion. Runtime entitlement remains untested.

**Klatooinian, Nagai, Weequay:** Printed foundational chassis/traits match pack, but migrated sidecars inject extra Endurance, Will, or cold Fortitude bonuses not supported by these Legacy species blocks. These remain `REVIEW_REQUIRED` pending other publications, not automatic deletions.

### Cross-book and runtime boundaries

1. **Chagrian** joins the previously indexed record (from Clone Wars), with `legacyEra.crossBookNotes` linking earlier `CW-11-01`. Older source findings remain unchanged.
2. **Published race gender and alternate profiles** (Devaronian, Chadra-Fan) must be reviewed using source/variant identity, not overwritten by a name-based importer.
3. **Player-selected or conditional racial feats** (Chiss trained skill, Vahla Force Sensitivity, Codru-Ji conditional Dual Weapon Mastery) require a one-time level-up/CharGen entitlement test, not merely presence of English text.
4. **Source-specific force rules** (Vahla Dark Side Stigma, Yuuzhan Vong Force Immunity, Zeltron Empathy) must not become blanket modifiers or generic immunities.
5. All 32 new findings are **unapplied**. No species, sidecar, class, weapon, chargen code, schema or builder changed. No Foundry runtime tests performed.
6. The rolling JSON now includes **86 distinct species** across **9 books**.

**Next sourcebook:** *Threats of the Galaxy* (organic species only). **Scavenger's Guide to Droids and all droid races are out of scope.**

---

## Book 10 — Threats of the Galaxy (non-droid species only)

**Scope:** Four directly printed playable/sapient biological species entries: **Bith p.26**, **Chistori p.34**, **Mantellian Savrips as Heroes p.117**, **Utai p.127**. Source PDF pages with corresponding numbers were rendered at high resolution and reviewed visually; searchable source transcription was used only for navigation. Although this book also prints a **Replica Droid** character-species block, **droids are explicitly out of scope**. No droid species, chassis, construction, or droid abilities were audited or modified.

### Result

| Check | Count |
|---|---:|
| Non-droid printed species blocks reviewed | **4** |
| Existing Foundry species identities | **4/4** |
| New distinct records in rolling ledger | **4** |
| Whole species `NO_CHANGE` | **0** |
| Species with source-backed corrections | **1** |
| Species with review-only findings | **3** |
| Confirmed individual correction candidates | **2** |
| Additional source/runtime review items | **11** |
| Total findings | **13** |
| Explicit field-level `NO_CHANGE` decisions | **12** |
| Production files touched | **None** |
| Foundry runtime tests executed | **None** |

### Species-by-species outcomes

| Species | Printed page | Overall source audit status | Findings | NO_CHANGE decisions |
|---|---:|---|---:|---:|
| Bith | 26 | `REVIEW_REQUIRED` | 3 | 3 |
| Chistori | 34 | `REVIEW_REQUIRED` | 2 | 3 |
| Mantellian Savrip | 117 | `CHANGE_REQUIRED` | 5 | 3 |
| Utai | 127 | `REVIEW_REQUIRED` | 3 | 3 |

### Exact pending edits and source checks

All 13 findings have `applied:false` and a printed source in the JSON. A `REVIEW_REQUIRED` result may indicate another book/variant, an untested consumer, or a questionable extra sidecar—not an approved deletion.

| Species | Finding | Status | Rule issue | Exact target | Printed source | Recommended surgical action |
|---|---|---|---|---|---|---|
| Bith | `THR-01-01` | `REVIEW_REQUIRED` | Two different printed Bith versions | `system.abilityMods, system.languages` | Threats p26 lists +2 INT/-2 CON, language Bith. Later Galaxy of Intrigue prints +2 CHA and Basic+Bith, which supports current pack. | Preserve source versions; do not change pack until a definitive version/variant policy. |
| Bith | `THR-01-02` | `REVIEW_REQUIRED` | Incompatible Evolved Intellect | `canonicalTraits[evolved-intellect]` | Threats p26 gives one Intelligence-skill check treated as natural 20 each encounter. | Certify which published Bith profile is used; don't combine both versions. |
| Bith | `THR-01-03` | `REVIEW_REQUIRED` | Scent versus Heightened Awareness | `canonicalTraits[scent], legacy sidecar[Musical Savant,Fragile]` | Threats p26 grants Perception reroll, not Scent or flat modifiers; Galaxy of Intrigue instead prints Scent. | Source-version reconciliation, plus independent review of unsupported sidecar modifiers. |
| Chistori | `THR-02-01` | `REVIEW_REQUIRED` | Unprinted Brute Strength bonus | `data/species-traits-migrated.json: Chistori.structuralTraits[Brute Strength].rules` | Threats p34 grants +2 melee attack and damage ONLY while voluntarily Raging, once/day swift. | Require other-book provenance; never leave conditional Rage bonus always-on. |
| Chistori | `THR-02-02` | `REVIEW_REQUIRED` | Rage action/condition execution | `packs/species.db: Chistori.system.canonicalTraits[rage] / runtime` | 5+CON rounds after swift activation; concentration skill restrictions; -1 persistent CT until 10 minutes recovery. | Verify once/day timing, bonus and persistent condition in actor runtime. |
| Mantellian Savrip | `THR-03-01` | `CHANGE_REQUIRED` | Incorrect Dexterity modifier sidecar | `data/species-traits-migrated.json: Mantellian Savrip.structuralTraits[Ability Modifiers].rules` | Threats p117 gives -2 DEX; -4 penalties are INT, WIS, CHA. | Remove/correct duplicated or wrong -4 DEX typed rule, prove final actor has -2 only. |
| Mantellian Savrip | `THR-03-02` | `CHANGE_REQUIRED` | Natural weapon damage and duplicate claws | `data/species-traits-migrated.json: Mantellian Savrip.structuralTraits[Natural Weapons,Poison].rules; packs/species.db: system.naturalWeapons` | Threats p117 grants one 1d6 slashing +STR natural claw; poison is a rider on damaging a living target. | Implement single 1d6 claw form and separate on-hit poison rule, not a second weapon. |
| Mantellian Savrip | `THR-03-03` | `REVIEW_REQUIRED` | Poison trigger and attack | `packs/species.db: Mantellian Savrip.system.canonicalTraits[poison] / runtime` | After successful claw damage to living foe, 1d20+Savrip level vs Fort; -1 CT; end of CT immobilized not unconscious. | Test exact trigger, target and condition; do not add poisoning to nonclaw attacks. |
| Mantellian Savrip | `THR-03-04` | `REVIEW_REQUIRED` | Speak-only native language | `packs/species.db: Mantellian Savrip.system.languages` | Threats p117 says Savrip (speak only). | Model language capability without permitting automatic literacy if supported. |
| Mantellian Savrip | `THR-03-05` | `REVIEW_REQUIRED` | Primitive/Rage actor behavior | `packs/species.db: Mantellian Savrip.system.canonicalTraits[primitive,rage]` | Suppress Heavy/Pistols/Rifles initial feats, 1/day swift Rage, finite duration and persistent condition recovery. | Run first-level and actor combat/condition regression; preserve existing correct prose. |
| Utai | `THR-04-01` | `REVIEW_REQUIRED` | Darkvision in legacy sidecar | `data/species-traits.json: Utai.structuralTraits[Underground Adaptation]` | Threats p127 grants Low-Light Vision (no effect on Total Concealment). | Seek later source before upgrading vision; preserve printed base. |
| Utai | `THR-04-02` | `REVIEW_REQUIRED` | Wrong unconditional Perception bonus | `data/species-traits-migrated.json: Utai.structuralTraits[Underground Adaptation].rules` | Printed Utai has no +2 Perception: Animal Handler, Cooperative, Low-Light Vision only. | Check provenance; condition underground if authorized instead of always. |
| Utai | `THR-04-03` | `REVIEW_REQUIRED` | Animal Handler and Cooperative runtime | `packs/species.db: Utai.system.canonicalTraits[animal-handler,cooperative] / runtime` | Ride reroll must accept; Persuasion to shift undomesticated INT <=2 beasts; adjacent and audible auto-success Aid Another. | Verify action targets and reroll outcomes, no source-data rewrite. |

### Explicit clean-field records

| Species | Status | Correct source-aligned component |
|---|---|---|
| Bith | `NO_CHANGE` | Size Medium, speed 6 |
| Bith | `NO_CHANGE` | INT +2 and CON -2 |
| Bith | `NO_CHANGE` | Meditative Trance four hours |
| Chistori | `NO_CHANGE` | +2 STR/-2 DEX, Medium/6 |
| Chistori | `NO_CHANGE` | Cold-Blooded -5 Fort against extreme cold |
| Chistori | `NO_CHANGE` | DR 2 and correct Rage description; language Chistori |
| Mantellian Savrip | `NO_CHANGE` | Ability modifiers +4 STR/-2 DEX/+4 CON/-4 INT/-4 WIS/-4 CHA |
| Mantellian Savrip | `NO_CHANGE` | Large/8 movement, language Savrip |
| Mantellian Savrip | `NO_CHANGE` | Natural Armor +2, Primitive, and Rage prose |
| Utai | `NO_CHANGE` | +2 CON/-2 CHA, Small/4 |
| Utai | `NO_CHANGE` | Utapese automatic |
| Utai | `NO_CHANGE` | Animal Handler, Cooperative, Low-Light Vision source text |

### Key book-to-book rulings

**Bith (p.26) — printed source variants, not an immediate pack defect.** *Threats* prints +2 INT / -2 CON, automatic Bith only, Evolved Intellect as **one Intelligence skill check treated as a natural 20 each encounter**, Heightened Awareness Perception reroll (must accept second), and Meditative Trance. **Galaxy of Intrigue** instead publishes the pack's +2 CHA in addition to +2 INT/-2 CON; Basic plus Bith languages; Scent; and a different Force Point-based *Evolved Intellect*. Those are genuine printed variant profiles. The latter source has already been located in its uploaded text for the coming book. Do not automatically delete +2 CHA or Scent just because the Threats profile differs; resolve final source precedence or expose a source-labelled variant. Sidecar unprinted `Perform +5` and `Fortitude -2` require independent provenance.

**Chistori (p.34) — baseline correct; sidecar suspect.** Ability modifiers (+2 STR/-2 DEX), Medium/6, Chistori-only automatic language, Cold-Blooded (-5 Fortitude against extreme cold), DR 2 and once/day Rage text agree with the book. The migrated sidecar instead proposes unconditional +2 melee damage under *Brute Strength*. It is not a replacement for +2 melee attack/damage **only during Rage**. Source-check before retaining; test Rage's Swift Action, duration and persistent condition.

**Mantellian Savrip (p.117) — serious typed-rule corrections.** The book explicitly allows **Savrip heroes** and grants +4 STR/-2 DEX/+4 CON/-4 INT/-4 WIS/-4 CHA, Large size, speed 8, natural armor +2, claws **1d6 slashing**, a conditional claw-hit poison rider, Primitive and Rage. The pack's base chassis is already correct, but the migrated sidecar writes an additional **-4 Dexterity** typed modifier, and two independent **1d4 claw weapons** (one incorrectly under Poison). These are **2 confirmed correction candidates** requiring minimal authority/consumer fixes and actor tests. Poison requires 1d20 + level against Fortitude *after damaging a living target with claws*, causing -1 condition track and immobilizing—not rendering unconscious—on the final CT step. Savrip automatic language is *speak only*; preserve that limitation if language capability supports it.

**Utai (p.127) — no baseline rewrite.** Published +2 CON/-2 CHA, Small/4, Utapese, Animal Handler, Cooperative and **Low-Light Vision** all match. Sidecar `Underground Adaptation` claims Darkvision and grants +2 Perception `when:always`, unsupported by this printed Utai block. Source-check before removal. Test conditional beast-interaction/automatic-adjacent Aid Another behavior separately.

### Guardrails and continuation

- This is a **race/species source audit only**; do not expand into droids, droid chassis or droid species despite the droid-themed book appearing earlier in the original order.
- Earlier Core, Rebellion Era, KOTOR, Force Unleashed, Clone Wars, Scum and Villainy, Jedi Academy, Galaxy at War and Legacy Era source claims are retained. The rolling file now tracks **90 distinct species** in **10 books**.
- The existing pack and both trait-sidecar consumers were compared read-only. No claim of live Foundry execution is made. All findings remain unapplied.
- **Next biological species source:** *Galaxy of Intrigue*. It will certify Bith's alternative printed profile and many additional playable species, including sidebars outside Chapter I. Then audit *The Unknown Regions*.

---

## Book 11 — Galaxy of Intrigue (non-droid species only)

**Primary source:** *Galaxy of Intrigue* PDF, printed pp.10-19 (main chapter), p.131 Pa'lowick, p.133 Elomin, p.144 Nyriaanan. PDF indices/page display are +1 relative to printed numbers. Uploaded `Galaxy of Intrigue_djvu.txt` used for text search; printed PDF and target page renders checked. No droid species audited.

### Results

| Measure | Count |
|---|---:|
| Printed non-droid species blocks | 12 |
| Main chapter / later sidebars | 9 / 3 |
| Foundry identities found | 12 / 12 |
| New unique species identities added to rolling ledger | 11 |
| Distinct species across all books | **101** |
| Whole-species `CHANGE_REQUIRED` | 11 |
| Whole-species `REVIEW_REQUIRED` | 1 |
| Confirmed source-data correction candidates | **12** |
| Further provenance/runtime review findings | **22** |
| Total individual findings | **34** |
| Field-level `NO_CHANGE` decisions | **24** |
| Production species files changed / live actor tests | 0 / 0 |

### Source inventory and outcomes

| Species | Printed page | Existing Foundry ID | Audit status | Findings |
|---|---:|---|---|---:|
| Bith | 11 | `species-bith` | `CHANGE_REQUIRED` | 3 |
| Defel | 12 | `species-defel` | `CHANGE_REQUIRED` | 3 |
| Fosh | 13 | `species-fosh` | `CHANGE_REQUIRED` | 3 |
| Givin | 13 | `species-givin` | `CHANGE_REQUIRED` | 3 |
| Gotal | 14 | `species-gotal` | `CHANGE_REQUIRED` | 3 |
| Herglic | 15 | `species-herglic` | `CHANGE_REQUIRED` | 3 |
| Mrlssi | 17 | `species-mrlssi` | `CHANGE_REQUIRED` | 2 |
| Neimoidian | 18 | `species-neimoidian` | `CHANGE_REQUIRED` | 3 |
| Umbaran | 19 | `species-umbaran` | `CHANGE_REQUIRED` | 3 |
| Pa'lowick | 131 | `species-pa-lowick` | `REVIEW_REQUIRED` | 2 |
| Elomin | 133 | `species-elomin` | `CHANGE_REQUIRED` | 4 |
| Nyriaanan | 144 | `species-nyriaanan` | `CHANGE_REQUIRED` | 2 |

### Findings — source comparison and proposed surgical action

All 34 findings are `applied:false`; `REVIEW_REQUIRED` is not permission to delete a possibly variant trait. Runtime is not certified. The exact same finding IDs, target files, printed pages, current values and proposed actions are stored in the JSON ledger.

| Finding | Status | Specific target / discrepancy | Minimum action |
|---|---|---|---|
| `GOI-01-01` Bith (p.11) | `CHANGE_REQUIRED` | Unpublished Musical Savant / Fragile typed modifiers: +5 Perform skill and -2 Fortitude always-on | Suspend the unsupported typed rules if no independent official source exists; preserve source-appropriate canonical traits. |
| `GOI-01-02` Bith (p.11) | `REVIEW_REQUIRED` | Printed Bith profiles disagree across books: Pack represents Galaxy of Intrigue race (+2 CHA, Basic+Bith, Scent and FP-based Evolved Intellect). | Record explicit book-profile provenance; do not merge incompatible abilities or overwrite the later profile automatically. |
| `GOI-01-03` Bith (p.11) | `REVIEW_REQUIRED` | Temporary Force Point needs runtime certification: Correct Galaxy of Intrigue benefit text; actor grant/spend behavior not tested. | Test one-time temp FP award, permitted spending, and encounter expiration; do not silently use Threats natural-20 variant. |
| `GOI-02-01` Defel (p.12) | `CHANGE_REQUIRED` | Shadow Blend sidecar understates printed concealment: Sidecar claims only ordinary concealment in low light/darker; migrated sidecar has no typed effect. | Reconcile alias with published Partial Invisibility rather than grant a weaker/generalized duplicate; preserve darkvision exception. |
| `GOI-02-02` Defel (p.12) | `REVIEW_REQUIRED` | Extraneous flat skill bonuses in pack: +2 Stealth and +2 Perception | Check provenance and whether this field executes; do not mistake size's +5 Stealth for an extra racial grant. |
| `GOI-02-03` Defel (p.12) | `REVIEW_REQUIRED` | Ultraviolet visor starting grant and blindness: Printed description; both sidecars lack equipmentGrants | Verify first-level inventory grant and conditional blindness in runtime before authorizing targeted implementation. |
| `GOI-03-01` Fosh (p.13) | `CHANGE_REQUIRED` | Unprinted Subtle Influence typed bonus: Unconditional +5 species bonus to Deception | Check supplemental provenance; do not stack automatic +5 atop published reroll. |
| `GOI-03-02` Fosh (p.13) | `REVIEW_REQUIRED` | Unprinted extra pack skills: +2 Acrobatics and +2 Perception | Check whether bonuses are implemented and whether any alternate official source supports them. |
| `GOI-03-03` Fosh (p.13) | `REVIEW_REQUIRED` | Reroll and Healing Glands execution: Source text correct; no migrated executable trait handlers present | Test both grant paths, equipment prerequisite substitution and reroll choice before runtime certification. |
| `GOI-04-01` Givin (p.13) | `CHANGE_REQUIRED` | Unprinted Analytical Mind typed skill bonus: +5 species Mechanics always; legacy sidecar also describes +5 Knowledge (physical sciences) | Source-check and remove unsupported executable bonus, preserving printed Deductive Reasoning reroll. |
| `GOI-04-02` Givin (p.13) | `REVIEW_REQUIRED` | Extraneous pack Mechanics modifier: +2 Mechanics | Trace pack skillBonus consumer and variant provenance; avoid double granting with Analytical Mind. |
| `GOI-04-03` Givin (p.13) | `REVIEW_REQUIRED` | Exoskeleton and Unique Physiology runtime: Mechanics expressed as three pack canonical entries, untested | Preserve effect-equivalent existing IDs unless player-facing canonical naming needs a surgical alias; test DR/defense/immunity and avoid double application. |
| `GOI-05-01` Gotal (p.14) | `CHANGE_REQUIRED` | Force Awareness makes unprinted general blindsense: General always-on blindsense 6 squares | Do not convert emotion reading into spatial blindsense; source-check alias then remove or scope unsupported sense rule. |
| `GOI-05-02` Gotal (p.14) | `REVIEW_REQUIRED` | Unprinted pack skill bonuses: +2 Perception and +2 Survival | Check another publication and exact actor use before deletion. |
| `GOI-05-03` Gotal (p.14) | `REVIEW_REQUIRED` | Emotional reading and Force skill exceptions: Correct prose; no executable implementations observed in sidecars | Test gating, action cost, challenge comparison, and untrained Force applications; never substitute blanket Force Sensitivity. |
| `GOI-06-01` Herglic (p.15) | `CHANGE_REQUIRED` | Unprinted Massive Build Strength check bonus: +5 always-on modifier with skillId 'str' | Require independent source; do not execute fabricated modifier (and do not treat STR as a skill ID). |
| `GOI-06-02` Herglic (p.15) | `REVIEW_REQUIRED` | Extraneous Endurance skill bonus: +2 Endurance | Validate other source and consumer before any patch. |
| `GOI-06-03` Herglic (p.15) | `REVIEW_REQUIRED` | Large size, Sturdy and conditional feat runtime: Printed benefit text but no live actor tests | Test derived size values and first-level feat condition; keep published Gather Information wording, seek rules resolution rather than inventing a feat prerequisite. |
| `GOI-07-01` Mrlssi (p.17) | `CHANGE_REQUIRED` | Unprinted Mercantile Instincts +5 trade rule: +5 Persuasion for trade / negotiation | Find provenance and remove unsupported executable bonus; do not replace conditional feat with permanent Persuasion boost. |
| `GOI-07-02` Mrlssi (p.17) | `REVIEW_REQUIRED` | Class skill, trained Knowledge and conditional feat entitlements: Text is present; sidecars have no chooser/grant rules | Test one-time selection and state prerequisites in new-character chargen; avoid converting choice to unrestricted training. |
| `GOI-08-01` Neimoidian (p.18) | `CHANGE_REQUIRED` | Malformed extraneous automatic-language token: ['speak','Basic','Neimoidian'] | Remove only the stray 'speak' language token; retain Basic/Neimoidian and stable identity. |
| `GOI-08-02` Neimoidian (p.18) | `CHANGE_REQUIRED` | Unprinted Cowardly and Mercantile Training modifiers: Always -2 Will and +5 trade Persuasion | Source-check alternate profiles then remove unsupported typed rules; do not add permanent debuff to all Neimoidians. |
| `GOI-08-03` Neimoidian (p.18) | `REVIEW_REQUIRED` | Conditional feat training language typo and runtime: Published description present, no actor entitlement probe | Verify each feat separately and only when its underlying skill is trained; preserve exact printed anomaly in provenance. |
| `GOI-09-01` Umbaran (p.19) | `CHANGE_REQUIRED` | Unprinted flat Deception and Perception skill bonuses: +2 Deception and +2 Perception | Check other-book provenance and whether skillBonuses executes; remove unsupported numeric projection surgically if it does. |
| `GOI-09-02` Umbaran (p.19) | `REVIEW_REQUIRED` | Stealthy published name versus Sneaky pack alias: Pack title 'Sneaky' but printed title 'Stealthy'; effect matches. | Use a display-name alias only if required for canonical presentation; avoid changing stable trait ID or introducing a duplicate effect. |
| `GOI-09-03` Umbaran (p.19) | `REVIEW_REQUIRED` | Darkvision and Gather Information feat runtime: Correct prose but runtime untested | Test precise vision rules and entitlement; do not conflate trained Gather Information with general Persuasion unless source authority resolves it. |
| `GOI-10-01` Pa'lowick (p.131) | `REVIEW_REQUIRED` | Extra Basic language beyond printed native: Basic and Lowickese | Check independent printed source/interpretation before dropping Basic; retain Lowickese. |
| `GOI-10-02` Pa'lowick (p.131) | `REVIEW_REQUIRED` | Swim, breath, and Primitive actor mechanics: Descriptions match source except pack reroll describes mandatory acceptance not explicitly stated in inset; no typed runtime rules. | Test each mechanic and core reroll default before normalizing acceptance wording; do not silently grant weapons. |
| `GOI-11-01` Elomin (p.133) | `CHANGE_REQUIRED` | Unprinted Frail Build and Technical Savant executable modifiers: -2 Fortitude always and +2 Mechanics always | Source-check any alternate profile before removing inappropriate typed mods; preserve mind-affecting-only bonus. |
| `GOI-11-02` Elomin (p.133) | `REVIEW_REQUIRED` | Unprinted Knowledge (Galactic Lore) pack bonus: +2 Knowledge (Galactic Lore) | Check provenance/consumer before deleting metadata. |
| `GOI-11-03` Elomin (p.133) | `REVIEW_REQUIRED` | Logical Mind label mismatch: Pack 'Driven' title on correct +5 Will vs mind-affecting text | Consider surgical display rename preserving ID and passive-rule ownership; do not change numeric effect. |
| `GOI-11-04` Elomin (p.133) | `REVIEW_REQUIRED` | Impose Order reactive ally move execution: Correct pack prose; migrated sidecar has no activated rule | Confirm action cost, ally targeting, reaction, movement limit and no automated token relocation without reliable authority. |
| `GOI-12-01` Nyriaanan (p.144) | `CHANGE_REQUIRED` | Unpublished Winged Glide creates flight speed: Always-on movement mode fly, speed 6, combatMovement true; text claims immunity to falling damage | Confirm no independent variant; surgically remove unsupported flying speed rule rather than alter canonical player-facing species. |
| `GOI-12-02` Nyriaanan (p.144) | `REVIEW_REQUIRED` | First-level bonus feat and Survival class skill consumers: Correct pack wording; both sidecars contain no structured grants | Verify class-skill hydration and one-time free feat grant in CharGen; do not double-grant or infer from bonusFeats numeric 0. |

### Source-aligned fields explicitly kept

- **Bith:** system.size / system.speed / system.abilityMods — Medium, 6 squares, -2 CON/+2 INT/+2 CHA all match the Galaxy of Intrigue version. system.languages / canonicalTraits[meditative-trance,scent,evolved-intellect] — Basic+Bith, four-hour trance, 10-square Scent limited to Perception/tracking, and temporary Intelligence-only Force Point all match Galaxy of Intrigue text.
- **Defel:** system.size / system.speed / system.abilityMods — Small, 6 squares, -2 STR/+2 INT agree. system.languages / canonicalTraits[partial-invisibility,special-equipment] — Basic+Defel and pack descriptions correctly identify total concealment in shadowy/darker illumination, darkvision exception, ultraviolet visor necessity.
- **Fosh:** system.abilityMods / system.size / system.speed — DEX +2/CON -2/CHA +2, Small, 6 squares match. system.languages / canonicalTraits[deceptive,healing-glands] — Basic+Fosh and exact core reroll/Treat Injury entitlements appear in pack.
- **Givin:** system.abilityMods / size / speed / languages — -2 STR/+2 INT, Medium/6, Basic+Givin agree. canonicalTraits[damage-reduction,great-fortitude,deductive-reasoning,vacuum-immunity] — Pack expresses DR 2, Fortitude +2, any Knowledge reroll with second result, immunity to vacuum/inhaled poison correctly; published names group these under Exoskeleton and Unique Physiology.
- **Gotal:** system.abilityMods / size / speed / languages — No modifiers, Medium/6, Basic+Gotal agree. canonicalTraits[energy-reading,low-light-vision,sensor-cones] — Pack text accurately records 6-square emotional sensing action, low-light vision, untrained Sense Force/Sense Surroundings.
- **Herglic:** system.abilityMods / size / speed / languages — +4 STR/-4 DEX, Large/6, Basic+Herglic agree. canonicalTraits[sturdy,conditional-bonus-feat] — Second Wind heals additional 5 + half level; trained Gather Information conditional Skill Focus is correctly described.
- **Mrlssi:** system.abilityMods / size / speed / languages — -2 STR/+2 INT/+2 CHA, Small/4, Basic+Mrlsstese agree. canonicalTraits[bonus-class-skill,scholarly-inclination,conditional-bonus-feat] — Mechanics always class skill, one Knowledge trained skill at 1st level, and conditional Skill Focus (Persuasion) correctly described.
- **Neimoidian:** system.abilityMods / size / speed — -2 STR/+2 CHA, Medium/6 agree. canonicalTraits[conditional-bonus-feats] — Conditional Deception and Persuasion Skill Focus feat text matches intended printed effect, despite a printed 'trained feat' typo.
- **Umbaran:** system.abilityMods / size / speed / languages — -2 CON/+2 DEX/+2 WIS, Medium/6, Basic+Umbarese agree. canonicalTraits[darkvision,sneaky,conditional-bonus-feat] — Darkvision, must-accept Stealth reroll and trained Gather Information conditional feat are effect-equivalent to printed traits.
- **Pa'lowick:** system.abilityMods / size / speed — -2 STR/+2 WIS, Medium/6 match printed sidebar. canonicalTraits[expert-swimmer,hold-breath,primitive] — Swim reroll/take 10, 25x CON rounds breath, and suppress initial pistols/rifles/heavy weapons starting feats all represented in pack.
- **Elomin:** system.abilityMods / size / speed / languages — +2 INT/-2 CHA, Medium/6, Basic+Elomin agree. canonicalTraits[impose-order,driven] effect text — Impose Order swift once/encounter and +5 species Will vs mind-affecting described correctly; book names latter 'Logical Mind' rather than pack 'Driven'.
- **Nyriaanan:** system.abilityMods / size / speed / languages — +2 WIS/-2 CHA, Medium/6, Nyriaanan language agree. canonicalTraits[bonus-class-skill,bonus-feat,low-light-vision] — Survival always class skill, free level-1 feat, low-light vision match printed sidebar.

### Bith cross-book reconciliation

**Bith — source variants, not a wholesale correction.** *Threats of the Galaxy* p.26 prints +2 INT/-2 CON, native Bith, Heightened Awareness and once-encounter Intelligence natural-20 Evolved Intellect. *Galaxy of Intrigue* p.11 prints -2 CON/+2 INT/+2 CHA, Basic+Bith, Scent (Perception within 10 squares), and a temporary Intelligence-skill-only Force Point after spending any Force Point. The current Foundry pack reflects the *Galaxy of Intrigue* profile. Preserve the previous `THR-01-01`, `THR-01-02` and `THR-01-03` findings as published-source history. Future remediation must select an explicit variant/provenance policy, not hybridize both.

### Priority concerns and audit boundaries

**Most dangerous sidecar:** Nyriaanan's `Winged Glide` typed rule currently describes always-on flight speed 6, unsupported by the printed near-Human race. Gotal's sidecar grants generic blindsense in place of an emotional reading check and specific untrained Force applications. Neimoidian has a stray `speak` in its language array and unprinted Will/Persuasion modifiers. Defel's `Shadow Blend` understates total concealment.

**Conditional entitlements must not be guessed:** Mrlssi's chosen Knowledge training, Neimoidian's independently trained-skill feats, Nyriaanan's free feat/Survival class skill, Defel's free visor, Fosh's Treat Injury exception, Herglic/Umbaran Gather Information feat wording and Elomin's ally reactions require live consumer tests, not arbitrary new engines.

**No production changes.** This is an append-only source-data audit. `packs/species.db`, `data/species-traits.json`, `data/species-traits-migrated.json`, registries, grant ledger and CharGen were not modified. Foundry actors have not been tested.

**Next book:** *The Unknown Regions* (playable non-droid species only).

---

## Book 12 — The Unknown Regions (non-droid species and selectable profiles)

**Primary source:** Original *The Unknown Regions* PDF and the searchable `Unknown Regions_djvu.txt` index. Relevant primary pages were rendered and visually inspected; PDF page = printed page +1. This pass searched Chapter 1 and the regional/planetary chapters, not just the table of contents.

### Profile/identity inventory

| Check | Count |
|---|---:|
| Non-droid species/racial/profile entries reviewed | **21** |
| Chapter 1 named species | 9 |
| Chapter 1 near-Human template | 1 |
| Later-chapter published profiles and reprints | 11 |
| Existing Foundry records found | 21/21 |
| New records added to rolling ledger (including classified templates/states) | **18** |
| Existing identities with new source claim | 3 (Chadra-Fan, Krevaaki, Chiss) |
| Total rolling species/profile identities | **119** |
| Whole-source NO_CHANGE profiles | 2 |
| Whole-source CHANGE_REQUIRED profiles | 9 |
| Whole-source REVIEW_REQUIRED profiles | 10 |
| Confirmed correction candidates | **12** |
| Source/variant/runtime review findings | **28** |
| Total findings | **40** |
| Explicit clean-field decisions | **42** |
| Production files modified / actor runtime tested | 0/0 |

### Species and source decisions

| Species/profile | Source page | Existing record ID | Audit status | Findings |
|---|---:|---|---|---:|
| Anzati | 11 | `species-anzati` | `REVIEW_REQUIRED` | 1 |
| Chadra-Fan | 12 | `species-chadra-fan` | `REVIEW_REQUIRED` | 2 |
| Ishi Tib | 12 | `species-ishi-tib` | `REVIEW_REQUIRED` | 2 |
| Krevaaki | 13 | `species-krevaaki` | `REVIEW_REQUIRED` | 2 |
| Nikto | 14 | `species-nikto` | `CHANGE_REQUIRED` | 2 |
| Shistavanen | 14 | `species-shistavanen` | `REVIEW_REQUIRED` | 2 |
| Sluissi | 15 | `species-sluissi` | `CHANGE_REQUIRED` | 2 |
| Squib | 16 | `species-squib` | `CHANGE_REQUIRED` | 2 |
| Verpine | 16 | `species-verpine` | `REVIEW_REQUIRED` | 2 |
| Near-Human | 17 | `species-near-human` | `REVIEW_REQUIRED` | 2 |
| Chiss | 126 | `species-chiss` | `REVIEW_REQUIRED` | 2 |
| Ebruchi | 127 | `species-ebruchi` | `CHANGE_REQUIRED` | 2 |
| Killik | 131 | `species-killik` | `REVIEW_REQUIRED` | 2 |
| Lugubraa | 135 | `species-lugubraa` | `CHANGE_REQUIRED` | 2 |
| Sorcerer of Rhand | 143 | `species-sorcerer-of-rhand` | `CHANGE_REQUIRED` | 3 |
| Ssi-Ruuk | 147 | `species-ssi-ruuk` | `CHANGE_REQUIRED` | 3 |
| Tof | 149 | `species-tof` | `CHANGE_REQUIRED` | 3 |
| Vagaari | 153 | `species-vagaari` | `CHANGE_REQUIRED` | 2 |
| Altiri | 163 | `species-altiri` | `NO_CHANGE` | 0 |
| Anarrian | 163 | `species-anarrian` | `NO_CHANGE` | 0 |
| O'reenian | 180 | `species-o-reenian` | `REVIEW_REQUIRED` | 2 |

### Exact pending findings

All new findings use printed source pages, exact production targets, current observed data, proposed minimal corrections and `applied:false`. Findings affecting previous species identities are appended under those same identities without replacing older book sections.

| Finding | Status | Source finding | Surgical direction |
|---|---|---|---|
| `UR-02-01` Chadra-Fan (p.12) | `REVIEW_REQUIRED` | **Extra unprinted flat skill bonuses:** +2 Perception, +2 Mechanics | Check cross-source provenance and whether pack field runs; keep earlier Legacy findings intact. |
| `UR-02-02` Chadra-Fan (p.12) | `REVIEW_REQUIRED` | **Tinkerer renamed Quality Repairs and runtime untested:** Correct extra 1d8 repair text under Quality Repairs name | Keep existing internal ID; test trigger once per repair action and compare Legacy source profile before display rename. |
| `UR-04-01` Krevaaki (p.13) | `REVIEW_REQUIRED` | **Conflicting printed native language:** Basic and Kreva | Preserve both book claims; do not automatically replace Kreva with Dromnyr until provenance/variant is resolved. |
| `UR-04-02` Krevaaki (p.13) | `REVIEW_REQUIRED` | **Stoic and Tentacles effect wording diverges:** Stoic imposes -5 to Sense Deception OR Sense Influence, tentacles +2 to Climb plus Grab and Grapple | Reconcile published skill terminology and previous Jedi Academy profile; prevent expansion of penalties or bonus types without authority. |
| `UR-11-01` Chiss (p.126) | `REVIEW_REQUIRED` | **Chiss source ability/language profiles differ:** Pack +2 INT/-2 CHA and Cheunh+Basic | Preserve both publication variants and earlier Legacy findings; determine explicit source precedence instead of overwriting pack. |
| `UR-11-02` Chiss (p.126) | `REVIEW_REQUIRED` | **Unprinted Initiative bonus and trait visibility:** Pack +2 Initiative and no canonical trait list in current output | Check other-book authority and runtime; ensure printed low-light and chosen training are not lost due to trait projection. |

### Explicitly clean source-data fields

- **Anzati** — ability/size/speed: No racial modifiers, Medium and land 6 agree. languages and traits: Anzat+Basic, Presence Sense, Mesmerize, Soup Drinking (pack Energy Drain), Hunter's Instincts (pack Bonus Class Skills), and Low-Light Vision have matching mechanical prose.
- **Chadra-Fan** — ability/size/speed/languages: +2 DEX/-2 WIS, Small/4, Basic+Chadra-Fan match. printed features: Darkvision, mandatory-result Perception reroll and +1d8 HP repaired by Mechanics match pack effects.
- **Ishi Tib** — ability and speeds: +2 INT, Medium, land 6 and swim 4 are represented in system.movement. published features: Basic+Tibranese, underwater breathing, reroll/take 10 Swim, Knowledge (life sciences) best-of-two, 1d6 piercing beak and low-light vision match pack text.
- **Krevaaki** — ability/size/speed: +2 WIS/-2 CHA, Medium, land 6 agree. defense / skill feat: +1 natural armor Reflex/Fort, conditional Skill Focus (Climb) correctly described.
- **Nikto** — ability/size/speed: +2 STR/-2 INT/-2 CHA, Medium/6 agree. great-fortitude/natural-armor/survival-instinct: +2 Fort, +2 natural armor Reflex and Survival reroll mandatory second agree mechanically.
- **Shistavanen** — ability/size/speed/language: +2 DEX/-2 INT/-2 CHA, Medium/6, Shistavanen match. published race effects: Claws 1d6 slashing, Initiative reroll, conditional Skill Focus (Perception), Survival class skill, and low-light vision agree.
- **Sluissi** — ability/size/speed: -2 DEX/+2 INT, Medium/6 agree. published abilities: Mechanics +10 when twice normal time, Tech Specialist when trained Mechanics, automatic running start and anti-Trip +5 stability described correctly.
- **Squib** — ability/size/speed/language: -2 STR/+2 DEX, Small/6, Basic+Squibbian agree. Natural Diplomat / Tech Savvy: Pack captures +5 haggling Persuasion and always-class-skill plus Knowledge (technology) reroll and untrained use.
- **Verpine** — ability/size/speed/language: No modifiers, Medium/6, Basic+Verpine agree. core printed skills/traits: +1 natural armor Reflex, Perception reroll, 1 km Verpine-to-Verpine mental communication, conditional Skill Focus Mechanics match pack effect.
- **Near-Human** — base Human chassis: Medium/6 and Basic are consistent with a Human-derived baseline. classification: The published text describes a flexible Human-derived construction system, not a single immutable racial stat block.
- **Chiss** — size/speed and INT: Medium/6 and +2 INT match shared portion. bonus trained skill: New trained class skill at level 1 matches printed Chiss source concept.
- **Ebruchi** — ability/size/speed/language: +2 STR/+2 CON/-2 WIS/-2 CHA, Medium/6, Ebruchese match. Iron Will / Unsettling: Pack +2 species Will and condition-track intimidation option text agree.
- **Killik** — Medium form ability and speed: +2 CON/-2 INT, Medium/6 align with the published typical Medium Killik profile. published abilities: Joiners, low-light, telepathic Hive Mind, four-limbed multiattack penalty reduction, natural armor and 1d6 slashing claws are text-represented.
- **Lugubraa** — ability/size/speed/languages: +2 STR/-2 DEX/+2 CON/-2 WIS, Medium/6, Lugubraal match. source traits: Free Improved Damage Threshold, echolocation darkvision, lockbite +5 Grapple and age-based INT cap/increase are described.
- **Sorcerer of Rhand** — size/speed/lang/Force grants: Medium/6, Basic, free Force Sensitivity and constrained Force Training are consistent with shared printed components. classification: Source says Sorcerers are united by a common condition, not a shared genetic code; this is an acquired identity profile.
- **Ssi-Ruuk** — ability/size/speed/language: +2 STR/-2 WIS, Medium/6, Ssi-ruuvi match. known race benefits: Force Blind, +2 natural armor Reflex, conditional Skill Focus (Persuasion) appear in pack.
- **Tof** — ability/size/speed/language: +2 STR/-2 DEX/-2 WIS/+2 CHA, Large/6, Tof match. initial bonus choice: A starting bonus Rapid Shot OR Rapid Strike is described.
- **Vagaari** — ability/size/speed/languages: +2 STR/-2 WIS, Medium/6, Vagaari+Sy Bisti match. Bioknowledge and conditional feat: Knowledge (life sciences)/Treat Injury mandatory second reroll, trained Deception Skill Focus match.
- **Altiri** — ability/size/speed/languages: Human-derived zero modifiers, Medium/6, Altirish+Basic match. published features: One extra trained class skill at level 1 and doubled positive CHA bonus for Persuasion on Humans/near-Humans are accurately described; both sidecars mirror pack.
- **Anarrian** — ability/size/speed/languages: Human-derived zero modifiers, Medium/6, Anarrese+Basic match. published features: A level-1 bonus feat and one-per-encounter Strength Surge alternate reroll/damage effect are accurately described in pack and sidecars.
- **O'reenian** — base chassis: Medium, land 6, no static ability modifiers match Human-derived base. variant options: Heightened Awareness and Persistent correspond to the two traits expressly named for O'reenians.

### Cross-book, classification and mechanics guardrails

1. **Chiss:** This book p.126 prints +2 INT only, Cheunh, Bonus Trained Skill and Low-Light Vision, conflicting with the Legacy Era-based pack +2 INT/-2 CHA and Basic+Cheunh. Preserve both publication claims; do not overwrite before variant policy.
2. **Krevaaki:** This book p.13 prints Basic+Dromnyr, Stoic against Sense Motive and +2 grapple, whereas the pack uses Basic+Kreva and broader/nonidentical descriptors. Keep earlier Jedi Academy claims and reconcile explicitly.
3. **Near-Humans:** p.17-18 is a HUMAN-DERIVED VARIANT GENERATOR, not a single innate 'Genetic Drift' species. The existing Near-Human record is audited as a non-droid selectable profile but not misrepresented as a unique biological species.
4. **Sorcerers of Rhand:** p.143 traits are from an ACQUIRED CONDITION, not a shared genetic code. The current selectable pack profile has three missing -2 ability modifiers and a fixed two Beastly Traits where one to three GM-approved Special Qualities are printed. Keep its classification flagged; do not silently convert all original races into Sorcerers.
5. **Ssi-ruuk:** The species record accidentally includes Tof campaign prose as a racial trait, and an ungated Persuasion reroll obscures Keen Smell's strict within-6-squares / same-area constraint. Force Blind also requires independent chargen validation.
6. **Ebruchi:** Improved Damage Threshold is conditional on CON 13, not unconditional. **Tof:** Mighty Swing also requires Martial Arts I, and printed Fearlessness has a once/encounter effect-ignore option absent from pack. **Vagaari:** Frightening Visage has disguise/failed-check and action-specific skill-training restrictions. **Lugubraa:** two natural weapons, tentacles 1d6 and teeth 1d4, must both exist.
7. **Published optional Nikto subraces and highly variable Killik forms** should remain variants/options; a default playable Medium profile does not authorize auto-granting every optional size or Creature Generator ability.
8. **Wroonian and Theelin** appear as examples of near-Humans, not stand-alone new racial rule blocks in this book. Do not duplicate source identities based on example art or story mentions.
9. **Runtime not certified:** sidecar prose without typed rules does not prove that a feat grant, skill unlock, condition-track ability, movement speed, reroll, or reaction executes. This audit changes neither species data nor infrastructure.

The ledger now contains **119 distinct non-droid species/profile identity records** after **12 completed sourcebooks**. Two new records in this book are explicitly flagged as a near-Human template and an acquired Sorcerer state rather than ordinary genetic species; the eventual biological-species census must separate them.

**Next step:** Final published-sourcebook coverage sweep, 161-pack reconciliation with droid/out-of-scope exclusions, and a source-based, runtime-aware surgical correction queue. No production mutation yet.

---

## Final source sweep — additional published species blocks (append-only reconciliation)

The final coverage scan reopened previously completed books for biological species rules outside their initial chapter scope. **Historical book row counts remain the originally published pass counts; these are additional certified source-specific appendices, not rewritten earlier records.** Source PDFs were rendered and compared with the existing pack and both sidecars. All corrections remain unapplied.

| Source and printed page | Species | Audit status | New rolling identity? |
|---|---|---|---|
| Core pp.284–285 | Aqualish | `CHANGE_REQUIRED` | Yes |
| Core pp.284–285 | Hutt | `CHANGE_REQUIRED` | Yes |
| Core p.285 | Neimoidian | `REVIEW_REQUIRED` | No (Galaxy of Intrigue) |
| Core p.285 | Yuuzhan Vong | `REVIEW_REQUIRED` | No (Legacy) |
| The Force Unleashed p.192 | Chiss | `REVIEW_REQUIRED` | No (Legacy/Unknown Regions) |

### Individual source decisions, exact targets and proposed surgical changes

**Aqualish** — existing identity `species-aqualish`, `CHANGE_REQUIRED` on printed p.284.
- `NO_CHANGE` system.abilityMods/size/speed: +2 CON/-2 WIS/-2 CHA, Medium/6 match source.
- `NO_CHANGE` canonicalTraits[bonus-feat,breathe-underwater,expert-swimmer]: Toughness, amphibious breathing and reroll Swim/take 10 effects correspond to source.
- `NO_CHANGE` system.languages: Aqualish and Basic agree.
- `SWP-CORE-AQUALISH-01` `CHANGE_REQUIRED` — Ferocity bonus violates conditional trigger. **Existing:** Always-on +2 melee damage typed rule despite sidecar text requiring half HP. **Printed:** Core p284 has NO Ferocity racial trait at all, only Toughness, breathe underwater, expert swimmer.. **Target:** `data/species-traits-migrated.json: Aqualish.conditionalTraits[Ferocity].rules`. **Action:** Verify other-book provenance; at minimum prevent unconditional +2 melee damage and ensure no unsupported automatic boost. Unapplied.
- `SWP-CORE-AQUALISH-02` `REVIEW_REQUIRED` — Extraneous Climb flat bonus. **Existing:** +2 Climb. **Printed:** Core Aqualish race block has no +2 Climb bonus.. **Target:** `packs/species.db: Aqualish.system.skillBonuses`. **Action:** Check other sources/consumer before any surgical deletion. Unapplied.
- `SWP-CORE-AQUALISH-03` `REVIEW_REQUIRED` — Bonus Toughness and Swim functionality not certified. **Existing:** Toughness and Swim text correct; actor untested. **Printed:** Toughness starts as racial feat and Swim reroll accepts second; Take 10 even under threat.. **Target:** `packs/species.db: Aqualish.system.canonicalTraits[bonus-feat,expert-swimmer] / grants`. **Action:** Test feat only once and Swim take-10/reroll through existing progression engine. Unapplied.

**Hutt** — existing identity `species-hutt`, `CHANGE_REQUIRED` on printed p.284.
- `NO_CHANGE` system.abilityMods/size/speed: +2 STR/-6 DEX/+2 CON/+2 INT, Large/2 agree; Hutt species block spans pp284–285.
- `NO_CHANGE` system.languages/canonicalTraits: Basic+Huttese, Force Resistance +5 Will vs Use the Force, immune prone/trip, better-result Persuasion reroll agree.
- `SWP-CORE-HUTT-01` `CHANGE_REQUIRED` — Unsupported Immense Bulk typed Fortitude +5. **Existing:** +5 species Fortitude always. **Printed:** Core Hutt p284–285 prints Large size effects, speed 2, Force Resistance, Supreme Stability and Persuasion reroll, no species +5 Fort.. **Target:** `data/species-traits-migrated.json: Hutt.structuralTraits[Immense Bulk].rules`. **Action:** Require independent published provenance; remove unsupported executable defense rule if unsourced. Unapplied.
- `SWP-CORE-HUTT-02` `REVIEW_REQUIRED` — Slow sidecar may duplicate already reduced speed. **Existing:** Pack land speed already 2; sidecar says speed reduced by 2 squares. **Printed:** Printed speed IS 2, not 6 reduced by additional 2 after creation.. **Target:** `data/species-traits.json: Hutt.structuralTraits[Slow] / packs/species.db Hutt.system.speed`. **Action:** Test movement derive to ensure speed is 2 with no further stacking; keep correct pack chassis. Unapplied.
- `SWP-CORE-HUTT-03` `REVIEW_REQUIRED` — Large size and Force Resistance scope. **Existing:** Correct descriptions; untested runtime. **Printed:** Large -1 Reflex/-5 Stealth/+5 DT; Will +5 only against a Use the Force check; prone/trip immunity.. **Target:** `packs/species.db: Hutt.system.size / canonicalTraits[force-resistance,supreme-stability]`. **Action:** Verify derived size, conditional defense and immunity in existing runtime. Unapplied.

**Neimoidian** — existing identity `species-neimoidian`, `REVIEW_REQUIRED` on printed p.285.
- `NO_CHANGE` size/speed: Medium/6 common to both Core and Galaxy of Intrigue variants.
- `NO_CHANGE` conditional Skill Focus (Deception): Core and Galaxy of Intrigue both grant Skill Focus (Deception) when trained.
- `SWP-CORE-NEIMOIDIAN-01` `REVIEW_REQUIRED` — Conflicting Core and Galaxy of Intrigue ability and language profiles. **Existing:** Current pack -2 STR/+2 CHA and Basic+Neimoidian plus erroneous 'speak' token. **Printed:** Core p285 prints +2 INT/+2 WIS/-2 STR, Basic+Neimoidian+Pak Pak; Galaxy of Intrigue p18 prints +2 CHA/-2 STR, Basic+Neimoidian.. **Target:** `packs/species.db: Neimoidian.system.abilityMods,system.languages`. **Action:** Keep both documented source profiles, choose source-specific precedence/variant deliberately; independently remove invalid 'speak' token under GOI finding. Unapplied.
- `SWP-CORE-NEIMOIDIAN-02` `REVIEW_REQUIRED` — Core Deception reroll absent from later pack profile. **Existing:** Current pack has conditional Skill Focus (Deception) and Persuasion but no Core Deception reroll. **Printed:** Core p285 explicitly allows a Deception reroll requiring second result; GOI p18 differs by adding conditional Persuasion Skill Focus.. **Target:** `packs/species.db: Neimoidian.system.canonicalTraits / sidecars`. **Action:** Store as distinct Core version, not a free extra trait stacked with later profile. Unapplied.

**Yuuzhan Vong** — existing identity `species-yuuzhan-vong`, `REVIEW_REQUIRED` on printed p.285.
- `NO_CHANGE` system.size/speed/abilityMods/languages: Medium/6 +2 STR/-2 WIS and Yuuzhan Vong language match Core source.
- `NO_CHANGE` canonicalTraits[force-immunity,weapon-familiarity]: Force prohibition/Will-target Force immunity and Amphistaff familiarity concepts match this source in part.
- `SWP-CORE-YUUZHANVONG-01` `REVIEW_REQUIRED` — Core Technophobic versus current Primitive/biotech version. **Existing:** Current profile suppresses standard weapon proficiencies and allows biotech use; no Core Technophobic entry. **Printed:** Core p285 prints -5 attack/skill with mechanical weapons/tools (Technophobic) and amphistaff Simple Weapon Familiarity; later source may have revised treatment.. **Target:** `packs/species.db: Yuuzhan Vong.system.canonicalTraits[primitive,biotech-proficiency]`. **Action:** Reconcile explicit publication priority; never silently stack primitive, penalty and biotech rules without checking later books. Unapplied.
- `SWP-CORE-YUUZHANVONG-02` `REVIEW_REQUIRED` — Core Force-immunity and sidecar typed effect scope. **Existing:** Typed immunity values ['t'] and blanket sidecar text. **Printed:** Core immunity only applies to Force effects that TARGET WILL defense; native cannot get Force Sensitivity/Use the Force/FP.. **Target:** `data/species-traits-migrated.json: Yuuzhan Vong.structuralTraits[Force Immunity].rules`. **Action:** Preserve narrow printed targeting (later Legacy finding); correct malformed rule in later surgical pass. Unapplied.

**Chiss** — existing identity `species-chiss`, `REVIEW_REQUIRED` on printed p.192.
- `NO_CHANGE` Medium/6 and +2 INT: All sources reviewed agree on shared speed, size and INT benefit.
- `NO_CHANGE` Force Unleashed/Unknown Regions low-light and skill grant: Force Unleashed p192 and Unknown Regions p126 agree on low-light, one trained class skill, Cheunh as native automatic language.
- `SWP-TFU-CHISS-01` `REVIEW_REQUIRED` — Two sources agree against Legacy-derived Chiss pack version. **Existing:** Current pack +2 INT/-2 CHA and Cheunh+Basic; flat +2 Initiative. **Printed:** TFU p192 grants +2 INT only, Cheunh only, trained class skill, Low-Light Vision; Unknown Regions p126 confirms these; Legacy Era publishes alternate profile.. **Target:** `packs/species.db: Chiss.system.abilityMods,system.languages`. **Action:** Preserve all three source claims. Two-book agreement does not override Legacy automatically; decide era/source precedence explicitly. Unapplied.
- `SWP-TFU-CHISS-02` `REVIEW_REQUIRED` — Chiss trained skill and vision need actor runtime test. **Existing:** No separate canonical trait projection in current pack output; no test completed. **Printed:** TFU p192 chooses one extra trained CLASS skill at level 1, Low-Light Vision.. **Target:** `packs/species.db: Chiss canonical and progression / species runtime`. **Action:** Test actual training options/grants and vision instead of assuming source labels guarantee behavior. Unapplied.

### Cross-source reconciliation

**Neimoidian:** Core p285 gives +2 INT/+2 WIS/-2 STR, Basic/Neimoidian/Pak Pak and Deception reroll; Galaxy of Intrigue p18 gives +2 CHA/-2 STR, Basic/Neimoidian and two trained-skill conditional feat choices. They are distinct published rules versions, not additive racial entitlements.

**Chiss:** Force Unleashed p192 and Unknown Regions p126 both give +2 INT, Low-Light Vision, one free trained class skill, and Cheunh. Legacy and current pack instead use +2 INT/-2 CHA; retain source-specific variants pending an explicit priority policy.

**Yuuzhan Vong:** Core p285 includes Technophobic and precise Will-target Force Immunity, while later profile includes Primitive / biotechnology rules. Preserve source variation, verify both published versions and restrict typed immunity to actual Will-targeting effects.

**Hutt and Aqualish** are FULL official Core published race blocks in 'Other Species' pages; omission from the original Core chapter-2 pass was a coverage miss. This addendum reconciles the audit without rewinding or erasing the original Core records.

**Elom correction:** An earlier preliminary text search matched the planet name 'Elom' and the different species 'Elomin' in Galaxy of Intrigue. It did **not** find an additional Elom playable racial rules block. No Elom species audit claim is invented from that false substring hit.

**Ledger after addendum:** **121** distinct species/profile identities over 12 books; no production file changes or live actor tests.

---

## Final 161-record species provenance reconciliation

Read the [Final Book-Sweep Health Report](species-final-health-report.md) and [machine-readable provenance census](../../data/audits/species-final-provenance-census.json). The 12-book audit and follow-up source appendices now cover **121 identities** (119 ordinary non-droid species, two special profiles). Of the 161 pack identities, 39 other non-droid records require provenance and Replica Droid remains excluded. Across the ledger, 302 findings remain `applied:false`; Foundry runtime has not been tested.

---

## Book 13 — Starships of the Galaxy (non-droid species source check)

**Outcome:** `SCREENED_NO_NON_DROID_SPECIES_RULES` — **0** new published non-droid species profiles, **0** source-based racial corrections, and **0** production edits. The [source-scope memo](species-starships-of-the-galaxy-source-scope.md) records the PDF/TXT inspection and distinguishes species-specific cockpit usage from innate racial grants (Geonosian Nantex p.86, human Ginivex p.87, Mon Calamari cruiser pp.114–115).

The source-audited ledger stays at **121 species/profile identities** and **302 existing unapplied findings**. In the **14-title project source set**, this finishes **13 in-scope book screenings**; the only other title, *Scavenger's Guide to Droids*, is intentionally excluded. **No eligible books remain**, but **39 existing non-droid pack records still lack independently verified species-rules provenance** and require a separate reconciliation.

---

## Community species removal queue — audit decision (October 13, 2026)

The 39-record [supplemental provenance matrix](../../data/audits/species-39-provenance-reconciliation.json) has **17 community/fan-attributed playable SWSE species records marked `MARKED_FOR_REMOVAL`** from the canonical player-selectable compendium. Their exact Foundry IDs, source-attribution evidence and reversible cleanup gates are listed in the matrix and the [overall audit/remediation roadmap](species-audit-overall-roadmap.md). This is an explicit removal queue, **not deletion**: production packs, both sidecars, actor references, registries and CharGen remain untouched. The 6 newly recovered official original sources, 5 official web leads and 11 special/ambiguous profiles are not in this removal queue. Historical ledger census (**121 identities, 302 unapplied findings**) is preserved until source audits are incorporated and tested.

---

## Clone Wars Fandom source-type recheck — official book vs fan sourcebook

See [the 17-species evidence memo](species-clone-wars-canonical-vs-fan-recheck.md). The printed Wizards 2009 *Clone Wars Campaign Guide* was rechecked against all **17** fan-community species profiles currently `MARKED_FOR_REMOVAL`. **No separate WotC playable racial rules block** was found for those 17 in this specific hardcover. Fandom's *Clone Wars Saga Edition Fan Sourcebook* is a distinct **homebrew** title and lists playable Koorivar, Mustafarian, Muun and Ortolan profiles. Kiffar appears in official content as near-Human NPC context, not a standalone printed species adjustment. Fandom also indexes Geonosian under CWCG although the uploaded book's main racial section lacks that traits block; this remains an official-source variant-provenance issue, **not a homebrew deletion finding**. Retain the 17 removal markers, but do not delete production data until evidence and saved-actor dependencies are checked. No species records, original counts or 302 findings changed.
