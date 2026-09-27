# PHASE 2 - Scum and Villainy Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 8

## Scope

Source certification covers **110 talent identities**:

- **55 origin talents** across **9** Scum and Villainy-origin trees.
- **55 expansion talents** across **14** pre-existing trees.

The preliminary Phase 1D population was 111. Phase 2 corrected two structural claims: one identity replacement and one false membership removal, leaving 110 real talent publications.

No production talent records are modified.

## Machine authority

- `data/audits/talent-phase-2-scum-and-villainy-content.json`
- `data/audits/talent-phase-2-scum-and-villainy-discrepancy-manifest.json`

## Source handling

The supplied Scum and Villainy DJVU text is materially noisier than the other sourcebooks. For this book:

1. DJVU was used only for discovery.
2. Relevant talent pages were rendered from the PDF.
3. A bounded OCR pass was used as a transcription aid.
4. Printed PDF hierarchy and visible rule text were treated as final authority.
5. Ambiguous parent/action boundaries were resolved visually.

## Phase 1D structural corrections

### Inspiration - Beloved

Printed p. 14 publishes **Beloved** as the new Inspiration talent.

`Bolster Ally` appears beneath Beloved as a prerequisite. It is not the new Scum publication.

Correction:

`Scum / Inspiration / Bolster Ally -> Scum / Inspiration / Beloved`

### Disgrace - Draw Fire

The Disgrace tree on printed pp. 13-14 contains six talents:

- Ambush
- Castigate
- Dirty Tactics
- Misplaced Loyalty
- Two-Faced
- Unreadable

`Draw Fire` is not a Disgrace talent. Misplaced Loyalty merely says it cannot be used in the same round as the Soldier's Draw Fire talent.

The repository Disgrace tree-membership claim for Draw Fire is therefore cross-tree reference contamination.

## Census

| Measure | Count |
|---|---:|
| Origin trees | **9** |
| Origin talents | **55** |
| Expansion targets | **14** |
| Expansion talents | **55** |
| Total certified identities | **110** |
| Correct-tree repo records mapped | **104** |
| Missing correct-tree records | **6** |

## Missing correct-tree records

The six missing identities are:

- GenoHaradan -> Deadly Repercussions
- GenoHaradan -> Manipulating Strike
- GenoHaradan -> Improved Manipulating Strike
- GenoHaradan -> Pulling the Strings
- Piracy -> Keep Them Reeling
- Pistoleer -> Flanking Fire

The four GenoHaradan items exist only beneath the obsolete malformed `Genohardan` split-tree identity. They are therefore not counted as correct-tree records.

`Keep Them Reeling` has a same-name Ambusher record and must not be reused by name.

`Flanking Fire` has no same-name talent item record in the current mirror.

## Same-name boundaries

Several valid Scum identities coexist with same-name talents in other trees. Examples include:

- Fringer -> Keep it Together vs Expert Pilot -> Keep It Together
- Assassin -> Ruthless vs Mercenary -> Ruthless
- Outlaw -> Seize the Moment vs Provocateur -> Seize the Moment

These are protected by tree/source identity rather than global name matching.

## Confirmed high-impact content defects

### Beloved

The repository summary reverses the **Guardian** beneficiary. The source gives **you** +2 Reflex while you remain within 6 squares of the chosen ally. It does not grant that ally +2 Reflex.

### Cunning Strategist

The repository changes **Vicious Attack**. The source makes **your two attack rolls at -5** against two opponents within 2 squares of one another. It does not impose a -5 attack penalty on those opponents.

### Murderous Arts II

The source grants **one additional die of damage** against a marked target. The repository changes this to **+1d6**, which is not equivalent for weapons with other damage dice.

### Keep it Together

The Fringer benefit field is broadly source-aligned, but the player-facing description says the vehicle simply avoids moving down the condition track once per encounter. The source instead changes the normal jury-rig end-of-encounter -5 movement into **-2 persistent steps**.

## Prerequisite fidelity

The machine manifest identifies prerequisite mismatches against the printed entries. Confirmed examples include abbreviated/missing prerequisites on talents such as:

- Experienced Brawler
- Shadow Striker
- Swift Strider
- Findsman Ceremonies
- Bodyguard III
- Cunning Strategist
- Virus

The canonical prerequisite strings are retained in the source content dataset.

## Content fidelity

Most mapped repo records use shortened benefit/description text. Phase 2 does not infer that every abbreviation is a mechanics defect; instead it publishes the source-backed full rule text and distinguishes:

- exact/full canonical text where present;
- abbreviated or missing full text;
- prerequisite mismatches;
- confirmed mechanics/description errors.

That preserves a deterministic repair target without overstating what an automated text diff proves.

## Structural totals after correction

The two Scum corrections offset in the aggregate canonical-membership total:

- Beloved adds one unique canonical Inspiration membership.
- Disgrace Draw Fire removes one false canonical membership.

Therefore:

- expansion publication claims remain **272**;
- aggregate canonical memberships remain **1,184**;
- canonical membership gaps remain **274**;
- extra repo membership claims remain **74**;
- trees with a structural membership difference become **105** because Disgrace now exposes the repository's contaminated Draw Fire membership.

## Stop gate

- [x] 9 origin trees / 55 origin talents certified.
- [x] 55 expansion talents certified.
- [x] 110 real source identities page-mapped.
- [x] Beloved identity corrected.
- [x] Disgrace Draw Fire contamination corrected.
- [x] 104 correct-tree item records mapped.
- [x] 6 missing correct-tree identities isolated.
- [x] GenoHaradan split-tree records protected from unsafe name matching.
- [x] Full normalized source rules text recorded.
- [x] Printed prerequisites recorded.
- [x] Multi-action talents preserved as parent talents, not exploded into false identities.
- [x] No production/runtime changes.

# Verdict

**Scum and Villainy Phase 2 content certification is complete.**
