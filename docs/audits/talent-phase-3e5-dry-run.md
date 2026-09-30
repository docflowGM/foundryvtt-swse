# Phase 3E-5b — text-defect repair dry-run

Status: **DRY_RUN_CERTIFIED** · 16 records · 32 leaf changes · 0 changes outside the targets · 7 second-wave records left untouched. **No pack has been written.**

Regenerate: `node tools/apply-talent-phase-3e5.mjs --report`. Only PDF_VERIFIED manifest entries are projected.

## Verification

- PASS manifest builds (every entry locates exactly once)
- PASS every PDF_VERIFIED edit applies cleanly (exact pre-image)
- PASS target records = the PDF-verified records (16)
- PASS zero changes outside the target records
- PASS only text leaves change (prerequisites, benefit, description, summary) and only the fields each entry lists
- PASS every target record actually changes
- PASS no id / name / tree / source / page / tag / flag / effect change
- PASS description shape preserved (string stays string, {value} stays {value})
- PASS benefit and description stay mirrors where they mirrored before
- PASS Share Talent prerequisite left as certified (print differs only by its terminal period)
- PASS no known defect string survives anywhere in the canonical pack after the repair
- PASS second-wave (PDF_REQUIRED) records are untouched by this repair
- PASS second run is a zero diff
- PASS serialization is surgical: only 16 lines of packs/talents.db change

## Exact mutation set

### Bring Them Back (`aeb8d3e495605f71`) — TD-10

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …mber of rounds equal to one-ha[I]f your heroic level. | …mber of rounds equal to one-ha[l]f your heroic level. |
| `system.description.value` | …mber of rounds equal to one-ha[I]f your heroic level. | …mber of rounds equal to one-ha[l]f your heroic level. |
| `system.summary` | …mber of rounds equal to one-ha[I]f your heroic level. | …mber of rounds equal to one-ha[l]f your heroic level. |

### Cover Fire (`049820827d7ef32b`) — TD-01

| Leaf | Before | After |
|---|---|---|
| `system.prerequisites` | Batt[i]e Analysis. | Batt[l]e Analysis. |

### Difficult to Sense (`8c47c02ec74fa858`) — TD-09

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | … attempts to sense other Force[]users, keeping the better resu… | … attempts to sense other Force[-]users, keeping the better resu… |
| `system.description.value` | … attempts to sense other Force[]users, keeping the better resu… | … attempts to sense other Force[-]users, keeping the better resu… |

### Drain Force (`2056998b5afa4e00`) — TD-08, TD-18

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …action when you damage a Force[sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and co]vert it to personal power, reg… | …action when you damage a Force[-sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and con]vert it to personal power, reg… |
| `system.description.value` | …action when you damage a Force[sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and co]vert it to personal power, reg… | …action when you damage a Force[-sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and con]vert it to personal power, reg… |
| `system.summary` | …action when you damage a Force[sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and co]vert it to personal power, reg… | …action when you damage a Force[-sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and con]vert it to personal power, reg… |

### Hotwired Processor (`e9a5fe40ce95a053`) — TD-11

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …mber of rounds equal to one-ha[I]f your level (rounded down). W… | …mber of rounds equal to one-ha[l]f your level (rounded down). W… |
| `system.description.value` | …mber of rounds equal to one-ha[I]f your level (rounded down). W… | …mber of rounds equal to one-ha[l]f your level (rounded down). W… |

### Hunter's Mark (`74fb6b37af983a4c`) — TD-05

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | If you aim before making [ranged attack (see Aim, page 154), you 4 target -1 step along the condition track if the ateam] hits (see Conditions, page 14… | If you aim before making [a ranged attack (see Aim, page 154), you move the target -1 step along the condition track if the attack] hits (see Conditions, page 14… |
| `system.description.value` | If you aim before making [ranged attack (see Aim, page 154), you 4 target -1 step along the condition track if the ateam] hits (see Conditions, page 14… | If you aim before making [a ranged attack (see Aim, page 154), you move the target -1 step along the condition track if the attack] hits (see Conditions, page 14… |
| `system.summary` | If you aim before making [ranged attack , you 4 target -1 step along the condition track if the ateam hits ]. | If you aim before making [a ranged attack, you move the target -1 step along the condition track if the attack hits]. |

### Influential Friends (`471f4294820ce5ec`) — TD-12

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …l modifier equal to 5 + one-ha[I]f your heroic level. Contactin… | …l modifier equal to 5 + one-ha[l]f your heroic level. Contactin… |
| `system.description.value` | …l modifier equal to 5 + one-ha[I]f your heroic level. Contactin… | …l modifier equal to 5 + one-ha[l]f your heroic level. Contactin… |

### Power Boost (`eb503c1c3fb945a6`) — TD-13

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …mber of rounds equal to one-ha[I]f your level (rounded down). A… | …mber of rounds equal to one-ha[l]f your level (rounded down). A… |
| `system.description.value` | …mber of rounds equal to one-ha[I]f your level (rounded down). A… | …mber of rounds equal to one-ha[l]f your level (rounded down). A… |

### Power Surge (`77d09ca0a54f4c36`) — TD-14

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …mber of rounds equal to one-ha[I]f your level (rounded down). A… | …mber of rounds equal to one-ha[l]f your level (rounded down). A… |
| `system.description.value` | …mber of rounds equal to one-ha[I]f your level (rounded down). A… | …mber of rounds equal to one-ha[l]f your level (rounded down). A… |

### Primitive Block (`d043a3c0494345ac`) — TD-02

| Leaf | Before | After |
|---|---|---|
| `system.prerequisites` | E[n]power Weapon | E[m]power Weapon |

### Relentless (`7bc10cb88a6a0c92`) — TD-03

| Leaf | Before | After |
|---|---|---|
| `system.prerequisites` | …unter's Mark, Hunter's Target.[ P] | …unter's Mark, Hunter's Target.[] |

### Seyugi Cyclone (`cc90a9fc255f4dc4`) — TD-19

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …e Point even if you do not pos[]ess the Whirlwind Attack feat.… | …e Point even if you do not pos[s]ess the Whirlwind Attack feat.… |
| `system.description` | …e Point even if you do not pos[]ess the Whirlwind Attack feat.… | …e Point even if you do not pos[s]ess the Whirlwind Attack feat.… |
| `system.summary` | …e Point even if you do not pos[]ess the Whirlwind Attack feat. | …e Point even if you do not pos[s]ess the Whirlwind Attack feat. |

### Share Talent (`2f00c50f3bf6bf5a`) — TD-15

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …alent must be from the Lightsa[-ber Combat talent tree, the Duel-ist talent tree, or the Lightsaber Forms talen … ce skill can gain the benefits of the shared talent. A Twi'Ler Jeo! INsTRUCTOR. ]You can take this talent multi… | …alent must be from the Lightsa[ber Combat talent tree, the Duelist talent tree, or the Lightsaber Forms talent  … trained in the Use the Force skill can gain the benefits of the shared talent.⏎⏎]You can take this talent multi… |
| `system.description.value` | …alent must be from the Lightsa[-ber Combat talent tree, the Duel-ist talent tree, or the Lightsaber Forms talen … ce skill can gain the benefits of the shared talent. A Twi'Ler Jeo! INsTRUCTOR. ]You can take this talent multi… | …alent must be from the Lightsa[ber Combat talent tree, the Duelist talent tree, or the Lightsaber Forms talent  … trained in the Use the Force skill can gain the benefits of the shared talent.⏎⏎]You can take this talent multi… |

### Shift Defense I (`cb981391d4d16c59`) — TD-04

| Leaf | Before | After |
|---|---|---|
| `system.prerequisites` | [Shift Defense 1, Shift Defense Il] | [] |

### Vital Encouragement (`1215e1c464a087b0`) — TD-16

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …it points equal to 10 + one-ha[If your heroic level. Damage is subtracted from bonus hit points first, and any  … belong to the Sense talent tree (see page 101 of the Saga Edition core rulebook)] | …it points equal to 10 + one-ha[lf your heroic level. Damage is subtracted from bonus hit points first, and any bonus hit points remaining at the end of the encounter are lost.] |
| `system.description` | …it points equal to 10 + one-ha[If your heroic level. Damage is subtracted from bonus hit points first, and any  … belong to the Sense talent tree (see page 101 of the Saga Edition core rulebook)] | …it points equal to 10 + one-ha[lf your heroic level. Damage is subtracted from bonus hit points first, and any bonus hit points remaining at the end of the encounter are lost.] |

### Wrong Decision (`463ae052e705eaf3`) — TD-06

| Leaf | Before | After |
|---|---|---|
| `system.benefit` | …urs the penalty once per turn.[⏎⏎Executive Leadership⏎⏎As aswift action, as many times an encounter equal to ha … quares, a +2 morale bonus to attack rolls, or a +2 morale bonus to all defenses.] | …urs the penalty once per turn.[] |
| `system.description.value` | …urs the penalty once per turn.[⏎⏎Executive Leadership⏎⏎As aswift action, as many times an encounter equal to ha … quares, a +2 morale bonus to attack rolls, or a +2 morale bonus to all defenses.] | …urs the penalty once per turn.[] |

## Embedded actor items

104 embedded actor items point at these records; none is modified. Items whose benefit is a verbatim copy of the pre-repair production text would now lag behind (see 3E-4 for the same policy):

| Item | Embedded items | Verbatim copies of pre-repair production |
|---|---|---|
| Hunter's Mark | 42 | 0 |
| Cover Fire | 32 | 0 |
| Shift Defense I | 16 | 0 |
| Wrong Decision | 2 | 0 |
| Drain Force | 6 | 0 |
| Influential Friends | 4 | 0 |
| Difficult to Sense | 2 | 0 |
