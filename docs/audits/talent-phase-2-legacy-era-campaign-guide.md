# PHASE 2 - Legacy Era Campaign Guide Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 10

## Scope

Legacy Era Phase 2 certifies **101 talent publication identities**:

- **88 origin talents** across **16** Legacy-origin trees.
- **13 expansion talents** across **7** pre-existing trees.

The hierarchy pass found **no Phase 1D structural correction** in this book. The preliminary 101-identity population is the final source population.

No production talent records or runtime code are modified.

## Machine authority

- `data/audits/talent-phase-2-legacy-era-campaign-guide-content.json`
- `data/audits/talent-phase-2-legacy-era-campaign-guide-discrepancy-manifest.json`

## Source handling

The Legacy Era PDF is image-only.

The certification therefore uses:

1. `Legacy Era Campaign Guide_djvu.txt` for searchable source wording.
2. Rendered PDF pages for final page/hierarchy authority.
3. Printed pp. **26-31** for heroic-class talents.
4. Printed pp. **40-47** for prestige-class talents.
5. Printed pp. **57-59** for the Disciple of Twilight and Ember of Vahl traditions.

OCR/layout debris was removed only where the rendered source established that it was not part of a talent.

## Census

| Measure | Count |
|---|---:|
| Origin trees | **16** |
| Origin talents | **88** |
| Expansion targets | **7** |
| Expansion talents | **13** |
| Total certified identities | **101** |
| Correct-tree repo records mapped | **91** |
| Missing correct-tree records | **10** |

## Missing correct-tree item records

All ten missing records are concentrated in two Force traditions.

### Disciple of Twilight - 5

- Cloak of Shadow
- Phantasm
- Revelation
- Shadow Armor
- Shadow Vision

### Ember of Vahl - 5

- Initiate of Vahl
- Reading the Flame
- Sword of Vahl
- Vahl's Brand
- Vahl's Flame

## Repository text fidelity

Of the **91 mapped** records:

- **4** already contain the full canonical source text in both the benefit and description fields.
- **87** have abbreviated, different, or incomplete full text compared with the source-backed certification.
- **91** lack the finalized source/page metadata contract.
- **91** lack the player-facing `system.summary` contract.

This does not mean every abbreviated record is mechanically wrong. Phase 2 separates simple text incompleteness from confirmed rules corruption.

## Confirmed same-name contamination

### Provocateur -> Seize the Moment

The correct Provocateur item has the Legacy Era benefit:

- when an enemy is reduced to 0 hit points or moves down the condition track, an ally can immediately take a second wind and gains additional hit points.

However, its current **description** is copied from the distinct **Outlaw -> Seize the Moment** talent:

- take a swift action as a reaction after an ally damages an opponent.

This is confirmed same-name description contamination. The two item identities must remain separate.

## Implant shared-rule omission

The source prints one shared rule for all five Implant talents:

- their benefits last until the end of the encounter;
- afterward, the recipient moves **-3 steps** down the condition track;
- that condition is persistent;
- it is removed only by 8 hours of rest or successful surgery.

The existing repository summaries for all five Implant talents omit that shared aftereffect.

The canonical dataset appends the shared paragraph to each individual Implant talent so each standalone Foundry item remains rules-complete.

## Same-name identity hazards

Three Legacy identities currently coexist with same-name repository talents in other trees:

- **Carbineer -> Multiattack Proficiency (rifles)** vs Weapon Master.
- **Knight's Armor -> Armor Mastery** vs Armor Specialist.
- **Provocateur -> Seize the Moment** vs Outlaw.

All are protected by canonical tree identity.

## Prerequisites

There are **7 true source-text prerequisite mismatches** among mapped records:

- Provocateur -> True Betrayal
- Protection -> Roll With It
- Knight's Armor -> Armored Augmentation I
- Knight's Armor -> Armored Augmentation II
- Knight's Resolve -> Praetoria Ishu
- Knight's Resolve -> Strength of the Empire
- Shaper -> Skilled Implanter

One additional apparent mismatch is normalization-only:

- Lightsaber Combat -> Cortosis Gauntlet Block

The source prints `Armor Proficiency (light, medium)`; the repository expands this to the two armor proficiency entries. Phase 2 records this separately rather than treating it as a mechanics defect.

## Content contract

For production repair:

```text
system.benefit
    = canonical published rules text

system.description.value
    = canonical full player-readable rules text

system.summary
    = concise derived player-facing summary

system.prerequisites
    = canonical printed prerequisite text

source/page
    = Legacy Era Campaign Guide + printed page
```

The quick summary is derived presentation text and is not mechanical authority.

## Stop gate

- [x] 16 origin trees certified.
- [x] 88 origin talents certified.
- [x] 13 expansion talents certified.
- [x] All 101 identities have printed-page attribution.
- [x] Full normalized source rules text recorded.
- [x] Printed prerequisite text recorded.
- [x] Implant shared-rule paragraph preserved.
- [x] 91 current correct-tree item records mapped.
- [x] 10 missing correct-tree records isolated.
- [x] Same-name identity hazards protected.
- [x] Provocateur/Outlaw Seize the Moment contamination documented.
- [x] Repository text fidelity classified.
- [x] No production/runtime changes.

# Verdict

**Legacy Era Campaign Guide Phase 2 content certification is complete.**
