# Talent/Feat Pass 3B — Exact Mechanic Convergence (discovery, report-only)

## Dashboard

```
Combined corpus: 1540
  Feats: 353
  Talents: 1187

Shared vocabulary: 187

Hard implication violations: 0
Unknown/retired tag records: 0

Mechanic families scanned: 15 (106 detectors, 14 cross-domain bundles)

Records where mechanic wording and the compared tag co-occur (count only; not adjudicated): 3965

Owner-review candidates: 258
  record-level (P1 136 / P2 96): 232
  tag-definition (P3): 12
  tag-convention questions (P3; 236 untagged matches listed, not individually flagged): 14

Findings decided by explicit owner rulings (approved / no change): 114
Prior-ruling / intentional-divergence matches: 11
Tags carried by only one domain (count only; no ruling made): 34

Ontology-gap candidates: 2
Evidence-only (not owner review): low-confidence 270; no cross-domain comparator 33
```

**Authority boundary:** this report contains evidence only. It makes no equivalence, intentional-divergence, domain-specificity, tag-meaning or ontology decision, proposes no tag change, and applies nothing to production. Groups organize evidence and do not imply that records must converge. Every new discrepancy is `PASS3B_OWNER_REVIEW`.

## Hard shared invariants (literal checks of owner-certified implication rules)

Zero violations across the combined corpus.

- `reroll -> reliability`
- `reaction -> action_economy`
- `swift_action -> action_economy`
- `move_action -> action_economy`
- `standard_action -> action_economy`
- `force_point_spend -> resource_spend`
- `condition_removal -> recovery`
- `use_the_force -> force`
- `force_power_synergy -> force`
- `ally_support -> support`


## Reusable precedent rules (already ruled; not reopened)

- Prerequisite inheritance is not semantic inheritance.
- Martial Arts I `attack_of_opportunity` does not propagate to Martial Arts II / III.
- Residual Pin / Crush / Throw / Trip tag-set asymmetry is intentional; Power Attack / Powerful Charge / Bantha Rush, the ranged precision family and the Tech Specialist family are intentional divergences.
- Generic skill mechanics remain `skills`; a specific mechanically targeted skill gets its exact skill tag.
- Skill exclusions and examples inside a generic skill rule do not create positive exact-skill tags.
- Crew-role "pilot" is not the Pilot skill.
- Movement-mode Climb Speed / Swim Speed is not the Climb / Swim skill; "jump to lightspeed" / "hyperspace jump" is not the Jump skill.
- A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Treat Injury as an explicit recovery/removal mechanism may justify `treat_injury` without implying `medical`, `medicine`, `healing` or `condition_removal`.
- `use_the_force -> force`; generic "use the Force" prose is not the Use the Force skill.
- A referenced DC from another skill (for example Treat Injury DC) is not an exact-skill interaction.

## Mechanic families

| Family | Detectors | Feats involved | Talents involved | Detections | Convergent | Review P1 | Review P2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A. Action economy | 6 | 50 | 454 | 1002 | 975 | 2 | 0 |
| B. Rerolls / reliability | 5 | 33 | 104 | 155 | 148 | 0 | 0 |
| C. Resource mechanics | 5 | 51 | 303 | 512 | 488 | 0 | 0 |
| D. Damage mechanics | 7 | 50 | 121 | 211 | 113 | 0 | 0 |
| E. Critical mechanics | 2 | 5 | 33 | 45 | 36 | 0 | 0 |
| F. Targeting / setup | 6 | 23 | 129 | 183 | 97 | 33 | 0 |
| G. Battlefield control | 8 | 35 | 81 | 145 | 119 | 0 | 0 |
| H. Reactive combat | 3 | 24 | 62 | 86 | 68 | 0 | 0 |
| I. Defense | 9 | 74 | 265 | 373 | 244 | 3 | 9 |
| J. Recovery / medicine | 9 | 27 | 107 | 194 | 146 | 5 | 12 |
| K. Support / command | 7 | 39 | 280 | 388 | 289 | 0 | 71 |
| L. Technology | 9 | 18 | 78 | 163 | 145 | 3 | 0 |
| M. Vehicle / space | 4 | 33 | 97 | 179 | 132 | 29 | 0 |
| N. Force mechanics | 10 | 32 | 288 | 639 | 464 | 9 | 3 |
| O. Weapon / combat mode | 16 | 92 | 312 | 582 | 501 | 52 | 1 |

### A. Action economy

Tags expected: `action_economy`, `move_action`, `reaction`, `standard_action`, `swift_action`. Records with evidence text: 1540; feats involved 50; talents involved 454; detections 1002; already convergent 975; owner review 2.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| A.cost_reaction | `reaction` | HIGH | 20/119 | 20/116 | 0/3 | 0.978 |
| A.cost_swift | `swift_action` | HIGH | 11/177 | 10/174 | 1/3 | 0.979 |
| A.cost_move | `move_action` | HIGH | 4/23 | 2/22 | 2/1 | 0.889 |
| A.cost_standard | `standard_action` | HIGH | 10/130 | 10/126 | 0/4 | 0.971 |
| A.grants_action | `action_economy` | MEDIUM | 1/10 | 1/10 | 0/0 | 1 |
| A.any_action_cost | `action_economy` | HIGH | 49/448 | 41/443 | 8/5 | 0.974 |

Owner-review groups (mechanic → candidate tag):

- **bundle:reaction_defensive_benefit>defense** → `defense` (P1): 2 record(s) [1 feat / 1 talent]; e.g. Dive for Cover (`2866d953b4b6245d`); Reactive Stealth (`810160a476804e61`)

Representative evidence (facts only): **Dive for Cover** (FEAT, Galaxy at War p.23, FEAT_CANONICAL_RULES_SHAPE) — "Once per turn, as a reaction to being targeted by a ranged attack, make a horizontal Jump check. If you land in a square providing cover from the attacker, ga…". Tags: `jump`, `reaction`, `action_economy`, `movement`, `mobility`, `cover`, `ranged_defense`, `evasion`; compared tag `defense` absent. Comparison records carrying it: Beloved (TALENT) [`once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`]; Dumb Luck (TALENT) [`once-per-encounter`, `standard_action`, `action_economy`, `melee`, `ranged`, `defense`, `evasion`, `mobility`, `movement`, `positioning`, `precision`, `setup`]; Ride the Current (TALENT) [`force`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`, `concealment`, `evasion`, `defense`, `recovery`, `healing`, `survivability`].

### B. Rerolls / reliability

Tags expected: `reliability`, `reroll`, `skill_mastery`. Records with evidence text: 1540; feats involved 33; talents involved 104; detections 155; already convergent 148; owner review 0.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| B.reroll | `reroll` | HIGH | 19/78 | 19/77 | 0/1 | 0.99 |
| B.roll_twice_keep | `reliability` | MEDIUM | 7/22 | 6/22 | 1/0 | 0.966 |
| B.take_10_20 | `reliability` | MEDIUM | 8/13 | 4/12 | 4/1 | 0.762 |
| B.automatic_success | `reliability` | MEDIUM | 4/4 | 4/4 | 0/0 | 1 |
| B.skill_mastery | `skill_mastery` | MEDIUM | 0/0 | 0/0 | 0/0 | — |

No owner-review items in this family.

### C. Resource mechanics

Tags expected: `force_capacity`, `force_point_spend`, `once-per-encounter`, `resource_recovery`, `resource_spend`. Records with evidence text: 1540; feats involved 51; talents involved 303; detections 512; already convergent 488; owner review 0.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| C.force_point_spend | `force_point_spend` | HIGH | 15/134 | 15/122 | 0/12 | 0.919 |
| C.resource_spend | `resource_spend` | MEDIUM | 13/122 | 13/119 | 0/3 | 0.978 |
| C.resource_recovery | `resource_recovery` | MEDIUM | 1/14 | 1/9 | 0/5 | 0.667 |
| C.once_per_encounter | `once-per-encounter` | HIGH | 33/173 | 33/170 | 0/3 | 0.985 |
| C.force_capacity | `force_capacity` | MEDIUM | 2/5 | 1/5 | 1/0 | 0.857 |

No owner-review items in this family.

### D. Damage mechanics

Tags expected: `burst_damage`, `damage`, `damage_bonus`, `damage_threshold`, `precision`, `precision_damage`, `sustained_damage`. Records with evidence text: 1540; feats involved 50; talents involved 121; detections 211; already convergent 113; owner review 0.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| D.damage_bonus | `damage_bonus` | MEDIUM | 26/29 | 23/28 | 3/1 | 0.927 |
| D.burst_damage | `burst_damage` | MEDIUM | 4/7 | 1/3 | 3/4 | 0.364 |
| D.sustained_damage | `sustained_damage` | MEDIUM | 1/1 | 0/1 | 1/0 | 0.5 |
| D.precision | `precision` | HIGH | 0/2 | 0/1 | 0/1 | 0.5 |
| D.precision_damage | `precision_damage` | MEDIUM | 0/0 | 0/0 | 0/0 | — |
| D.damage_threshold | `damage_threshold` | HIGH | 15/31 | 15/28 | 0/3 | 0.935 |
| D.damage_generic | `damage` | LOW | 15/80 | 7/6 | 8/74 | 0.137 |

No owner-review items in this family.

### E. Critical mechanics

Tags expected: `critical_hit`, `critical_success`. Records with evidence text: 1540; feats involved 5; talents involved 33; detections 45; already convergent 36; owner review 0.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| E.critical_hit | `critical_hit` | HIGH | 3/20 | 3/20 | 0/0 | 1 |
| E.natural_20 | `critical_success` | HIGH | 3/19 | 2/11 | 1/8 | 0.591 |

No owner-review items in this family.

### F. Targeting / setup

Tags expected: `ambush`, `ambush_defense`, `setup`, `surprise_round`, `target-designation`, `targeting`. Records with evidence text: 1540; feats involved 23; talents involved 129; detections 183; already convergent 97; owner review 33.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| F.designate | `target-designation` | HIGH | 5/69 | 2/41 | 3/28 | 0.581 |
| F.targeting | `targeting` | LOW | 4/5 | 0/3 | 4/2 | 0.333 |
| F.setup | `setup` | LOW | 1/2 | 1/1 | 0/1 | 0.667 |
| F.ambush | `ambush` | MEDIUM | 12/46 | 5/22 | 7/24 | 0.466 |
| F.ambush_defense | `ambush_defense` | MEDIUM | 1/20 | 1/5 | 0/15 | 0.286 |
| F.surprise_round | `surprise_round` | HIGH | 2/16 | 2/14 | 0/2 | 0.889 |

Owner-review groups (mechanic → candidate tag):

- **F.designate** → `target-designation` (P1): 31 record(s) [3 feat / 28 talent]; e.g. Signature Device (`313095ada7504547`); Hijkata Training (`6dcb59b199dba6a1`); Logic Upgrade: Tactician (`a75d5d6b3ce5bc6f`)
- **F.surprise_round** → `surprise_round` (P1): 2 record(s) [0 feat / 2 talent]; e.g. Reset Initiative (`97eeb67b9428f0eb`); Commander's Prerogative (`d18f6de464dc42cf`)

Representative evidence (facts only): **Signature Device** (FEAT, Scum and Villainy p.24, FEAT_CANONICAL_RULES_SHAPE) — "Designate one weapon, armor, vehicle, or other item as your signature item. You may Take 10 on Mechanics checks to modify it. It may have t…". Tags: `tech`, `mechanics`, `modification`, `equipment`, `reliability`; compared tag `target-designation` absent. Comparison records carrying it: Band Together (TALENT) [`ally_support`, `support`, `teamwork`, `leadership`, `target-designation`, `damage_bonus`, `will_defense`, `persuasion`, `social`, `mind-affecting`, `control`, `swift_action`, `action_economy`, `once-per-encounter`, `sustained_damage`]; Mark the Target (TALENT) [`ranged`, `swift_action`, `action_economy`, `ally_support`, `support`, `teamwork`, `target-designation`, `targeting`, `setup`, `ambush`, `precision`]; Soften the Target (TALENT) [`ranged`, `swift_action`, `action_economy`, `ally_support`, `support`, `teamwork`, `target-designation`, `targeting`, `damage_reduction`, `shields`, `setup`].

### G. Battlefield control

Tags expected: `battlefield_control`, `grab`, `grapple`, `mobility`, `movement`, `positioning`, `pursuit`, `restrain`. Records with evidence text: 1540; feats involved 35; talents involved 81; detections 145; already convergent 119; owner review 0.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| G.grab | `grab` | HIGH | 8/10 | 5/7 | 3/3 | 0.667 |
| G.grapple | `grapple` | HIGH | 14/9 | 10/7 | 4/2 | 0.739 |
| G.restrain | `restrain` | HIGH | 3/6 | 3/3 | 0/3 | 0.667 |
| G.forced_movement | `battlefield_control` | MEDIUM | 11/10 | 9/9 | 2/1 | 0.857 |
| G.speed_change | `movement` | MEDIUM | 5/17 | 5/14 | 0/3 | 0.864 |
| G.mobility | `mobility` | MEDIUM | 8/38 | 7/34 | 1/4 | 0.891 |
| G.pursuit | `pursuit` | HIGH | 0/2 | 0/2 | 0/0 | 1 |
| G.positioning | `positioning` | MEDIUM | 3/1 | 3/1 | 0/0 | 1 |

No owner-review items in this family.

### H. Reactive combat

Tags expected: `attack_of_opportunity`, `counterattack`, `overwatch`. Records with evidence text: 1540; feats involved 24; talents involved 62; detections 86; already convergent 68; owner review 0.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| H.attack_of_opportunity | `attack_of_opportunity` | HIGH | 22/59 | 22/45 | 0/14 | 0.827 |
| H.counterattack | `counterattack` | HIGH | 2/1 | 0/1 | 2/0 | 0.333 |
| H.overwatch | `overwatch` | HIGH | 0/2 | 0/0 | 0/2 | 0 |

No owner-review items in this family.

### I. Defense

Tags expected: `concealment`, `cover`, `damage_reduction`, `defense`, `evasion`, `melee_defense`, `ranged_defense`, `resilience`, `survivability`. Records with evidence text: 1540; feats involved 74; talents involved 265; detections 373; already convergent 244; owner review 12.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| I.defense_generic | `defense` | LOW | 63/185 | 45/90 | 18/95 | 0.544 |
| I.melee_defense | `melee_defense` | MEDIUM | 0/3 | 0/1 | 0/2 | 0.333 |
| I.ranged_defense | `ranged_defense` | MEDIUM | 1/1 | 0/1 | 1/0 | 0.5 |
| I.damage_reduction | `damage_reduction` | HIGH | 1/16 | 1/14 | 0/2 | 0.882 |
| I.cover | `cover` | MEDIUM | 11/33 | 10/27 | 1/6 | 0.841 |
| I.concealment | `concealment` | HIGH | 4/25 | 4/24 | 0/1 | 0.966 |
| I.evasion | `evasion` | MEDIUM | 2/5 | 1/5 | 1/0 | 0.857 |
| I.resilience | `resilience` | LOW | 0/1 | 0/0 | 0/1 | 0 |
| I.survivability_hp | `survivability` | LOW | 0/22 | 0/21 | 0/1 | 0.955 |

Owner-review groups (mechanic → candidate tag):

- **I.concealment** → `concealment` (P1): 1 record(s) [0 feat / 1 talent]; e.g. Stealthy Withdrawal (`c483676cb3c07cb3`)
- **I.damage_reduction** → `damage_reduction` (P1): 2 record(s) [0 feat / 2 talent]; e.g. Akk Dog Trainer's Actions (`ad7fd3e1a2b04c30`); Sith Alchemy (`eb4f3e8660bc476589d0323d4cc00845`)
- **I.cover** → `cover` (P2): 7 record(s) [1 feat / 6 talent]; e.g. Tech Specialist (`42e2404790756700`); Lead From the Front (`a67a1a657fe5665c`); Seek and Destroy (`adacf682b6ccf21c`)
- **I.evasion** → `evasion` (P2): 1 record(s) [1 feat / 0 talent]; e.g. Targeted Area (`9c904590c02fb30a`)
- **I.ranged_defense** → `ranged_defense` (P2): 1 record(s) [1 feat / 0 talent]; e.g. Sniper Shot (`94fc90a53d747f84`)

Representative evidence (facts only): **Stealthy Withdrawal** (TALENT, Legacy Era Campaign Guide p.42, TALENT_CERTIFIED_PACK_BENEFIT_TEXT) — "When an ally withdraws as a result of your Hasty Withdrawal talent and ends its withdraw action with cover or concealment from any enemy target, that ally can make an immediate Stealth check to sneak as a free action.". Tags: `ally_support`, `support`, `teamwork`, `stealth`, `skills`, `infiltration`, `evasion`, `mobility`, `movement`, `action_economy`; compared tag `concealment` absent. Comparison records carrying it: Knife Trick (FEAT) [`attack_of_opportunity`, `stealth`, `concealment`, `equipment`, `action_economy`]; Flash and Clear (FEAT) [`ranged`, `concealment`, `defense`, `setup`]; Deep Sight (FEAT) [`senses`, `detection`, `concealment`, `awareness`].

### J. Recovery / medicine

Tags expected: `condition_removal`, `healing`, `medical`, `medicine`, `poison`, `recovery`, `repair`, `self_repair`, `treat_injury`. Records with evidence text: 1540; feats involved 27; talents involved 107; detections 194; already convergent 146; owner review 17.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| J.healing | `healing` | MEDIUM | 10/29 | 8/24 | 2/5 | 0.821 |
| J.recovery | `recovery` | MEDIUM | 15/24 | 14/20 | 1/4 | 0.872 |
| J.condition_removal | `condition_removal` | MEDIUM | 1/28 | 0/8 | 1/20 | 0.276 |
| J.medical | `medical` | MEDIUM | 1/8 | 1/8 | 0/0 | 1 |
| J.medicine | `medicine` | MEDIUM | 3/9 | 3/0 | 0/9 | 0.25 |
| J.treat_injury | `treat_injury` | HIGH | 7/32 | 7/31 | 0/1 | 0.974 |
| J.poison | `poison` | HIGH | 1/10 | 1/9 | 0/1 | 0.909 |
| J.self_repair | `self_repair` | MEDIUM | 0/2 | 0/2 | 0/0 | 1 |
| J.repair | `repair` | HIGH | 2/12 | 2/8 | 0/4 | 0.714 |

Owner-review groups (mechanic → candidate tag):

- **J.poison** → `poison` (P1): 1 record(s) [0 feat / 1 talent]; e.g. Force Treatment (`181da7f36b9fba9d`)
- **J.repair** → `repair` (P1): 4 record(s) [0 feat / 4 talent]; e.g. Power Surge (`77d09ca0a54f4c36`); Preserving Shot (`a594f0b9ff786a6c`); Hotwired Processor (`e9a5fe40ce95a053`)
- **J.healing** → `healing` (P2): 7 record(s) [2 feat / 5 talent]; e.g. Resurgence (`005e922d0430d86b`); Forceful Recovery (`627b92fefdc552d2`); Aggressive Surge (`147f70a2b815f34e`)
- **J.recovery** → `recovery` (P2): 5 record(s) [1 feat / 4 talent]; e.g. Pinpoint Accuracy (`47c92eae6c1a0b84`); Aggressive Surge (`147f70a2b815f34e`); Share Force Technique (`7d02251f13fd5645`)

Representative evidence (facts only): **Force Treatment** (TALENT, Saga Edition Core Rulebook p.214, TALENT_CERTIFIED_PACK_BENEFIT_TEXT) — "…eck instead (subject to the same circumstances and limitations). In addition, you can administer First Aid, Treat Disease, Treat Poison, and Treat Radiation without the requisite Medical Kit or Medpac.". Tags: `force`, `use_the_force`, `treat_injury`, `medicine`, `medical`, `skills`, `skill_substitution`, `reroll`, `reliability`, `healing`, `recovery`, `support`; compared tag `poison` absent. Comparison records carrying it: Poison Resistance (FEAT) [`poison`, `defense`, `damage_reduction`, `resilience`, `survivability`].

### K. Support / command

Tags expected: `ally_support`, `command`, `followers`, `leadership`, `minion`, `morale`, `teamwork`. Records with evidence text: 1540; feats involved 39; talents involved 280; detections 388; already convergent 289; owner review 71.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| K.ally | `ally_support` | MEDIUM | 25/208 | 13/169 | 12/39 | 0.781 |
| K.teamwork | `teamwork` | MEDIUM | 22/35 | 18/29 | 4/6 | 0.825 |
| K.leadership | `leadership` | MEDIUM | 0/8 | 0/1 | 0/7 | 0.125 |
| K.command | `command` | MEDIUM | 0/0 | 0/0 | 0/0 | — |
| K.morale | `morale` | MEDIUM | 10/54 | 0/33 | 10/21 | 0.516 |
| K.followers | `followers` | HIGH | 0/16 | 0/16 | 0/0 | 1 |
| K.minion | `minion` | HIGH | 0/10 | 0/10 | 0/0 | 1 |

Owner-review groups (mechanic → candidate tag):

- **K.ally** → `ally_support` (P2): 51 record(s) [12 feat / 39 talent]; e.g. Wary Sentries (`0053d97632b02e4a`); Mounted Regiment (`0e9aa3d941f4eb80`); Ascension Specialists (`125c328c4573890a`)
- **K.morale** → `morale` (P2): 10 record(s) [10 feat / 0 talent]; e.g. Logic Upgrade: Self-Defense (`191aacaecaa92ce1`); Ample Foraging (`223a5c14f2ea4737`); Hideous Visage (`2956acfbfd27967d`)
- **K.teamwork** → `teamwork` (P2): 10 record(s) [4 feat / 6 talent]; e.g. Tech Specialist (`42e2404790756700`); Superior Tech (`a717435c8094e7fb`); Starship Designer (`e9147ce66a783fbb`)

Representative evidence (facts only): **Wary Sentries** (FEAT, Galaxy at War p.30, FEAT_CANONICAL_RULES_SHAPE) — "Gain +3 competence on Perception checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, take 10 on Perception checks even wh…". Tags: `teamwork`, `perception`, `awareness`, `scaling`, `reliability`; compared tag `ally_support` absent. Comparison records carrying it: Supervising Droid (TALENT) [`droid`, `ally_support`, `support`, `teamwork`, `skills`, `standard_action`, `swift_action`, `action_economy`, `once-per-encounter`, `reliability`]; Force Warning (TALENT) [`force`, `initiative`, `ally_support`, `support`, `teamwork`, `reroll`, `reliability`, `ambush_defense`, `surprise_round`, `scaling`, `awareness`]; Band Together (TALENT) [`ally_support`, `support`, `teamwork`, `leadership`, `target-designation`, `damage_bonus`, `will_defense`, `persuasion`, `social`, `mind-affecting`, `control`, `swift_action`, `action_economy`, `once-per-encounter`, `sustained_damage`].

### L. Technology

Tags expected: `crafting`, `jury_rig`, `mechanics`, `modification`, `power_systems`, `sensors`, `slicing`, `tech`, `use_computer`. Records with evidence text: 1540; feats involved 18; talents involved 78; detections 163; already convergent 145; owner review 3.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| L.tech_generic | `tech` | LOW | 11/36 | 8/28 | 3/8 | 0.766 |
| L.mechanics_skill | `mechanics` | HIGH | 12/34 | 12/33 | 0/1 | 0.978 |
| L.use_computer | `use_computer` | HIGH | 5/18 | 5/18 | 0/0 | 1 |
| L.crafting | `crafting` | MEDIUM | 1/8 | 1/8 | 0/0 | 1 |
| L.modification | `modification` | HIGH | 5/13 | 5/10 | 0/3 | 0.833 |
| L.jury_rig | `jury_rig` | HIGH | 0/5 | 0/5 | 0/0 | 1 |
| L.slicing | `slicing` | HIGH | 0/1 | 0/1 | 0/0 | 1 |
| L.sensors | `sensors` | HIGH | 1/6 | 1/6 | 0/0 | 1 |
| L.power_systems | `power_systems` | MEDIUM | 0/7 | 0/4 | 0/3 | 0.571 |

Owner-review groups (mechanic → candidate tag):

- **L.modification** → `modification` (P1): 3 record(s) [0 feat / 3 talent]; e.g. Infuse Weapon (`0df15b0ea7721c50`); Power of the Dark Side (`627bd3abd30b973f`); Scripted Routines (`8d0657e7ade688bd`)

Representative evidence (facts only): **Infuse Weapon** (TALENT, Force Unleashed Campaign Guide p.93, TALENT_CERTIFIED_PACK_BENEFIT_TEXT) — "…on, its damage reduction is doubled, and lightsabers do not ignore the weapon's damage reduction. When you spend a Force Point to modify the attack roll of an infused weapon, you also add 2 x the Force Point's result to the damage roll if the attack is a success.". Tags: `force`, `force_point_spend`, `resource_spend`, `empowerment`, `weapon_empowerment`, `equipment`, `melee`, `damage_reduction`, `durability`, `damage_bonus`, `sustained_damage`; compared tag `modification` absent. Comparison records carrying it: Signature Device (FEAT) [`tech`, `mechanics`, `modification`, `equipment`, `reliability`]; Tech Specialist (FEAT) [`tech`, `mechanics`, `modification`, `equipment`, `armor`, `droid`, `vehicle`, `ability_enhancement`, `durability`, `defense`, `skills`, `mobility`, `shields`, `weapon_empowerment`, `precision`, `damage_bonus`]; Superior Tech (FEAT) [`tech`, `mechanics`, `modification`, `equipment`, `armor`, `droid`, `vehicle`, `ability_enhancement`, `durability`, `defense`, `perception`, `skills`, `sensors`, `shields`, `mobility`, `weapon_empowerment`, `precision`, `damage_bonus`].

### M. Vehicle / space

Tags expected: `pilot`, `shields`, `space`, `vehicle`. Records with evidence text: 1540; feats involved 33; talents involved 97; detections 179; already convergent 132; owner review 29.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| M.vehicle | `vehicle` | HIGH | 28/83 | 19/67 | 9/16 | 0.775 |
| M.space | `space` | MEDIUM | 8/20 | 4/7 | 4/13 | 0.393 |
| M.pilot_skill | `pilot` | HIGH | 5/18 | 5/18 | 0/0 | 1 |
| M.shields | `shields` | HIGH | 4/13 | 4/8 | 0/5 | 0.706 |

Owner-review groups (mechanic → candidate tag):

- **M.shields** → `shields` (P1): 5 record(s) [0 feat / 5 talent]; e.g. Force Cloak (`2c18952e0c014127`); Dedicated Guardian (`562148487d7aa43c`); Device Jammer (`5db4343762664d95`)
- **M.vehicle** → `vehicle` (P1): 24 record(s) [8 feat / 16 talent]; e.g. Burst Fire (`0d4d7c147c48cdab`); Zero Range (`0dbd1d12c0b99725`); Power Attack (`3f76464c43c73f84`)

Representative evidence (facts only): **Force Cloak** (TALENT, Saga Edition Core Rulebook p.107, TALENT_CERTIFIED_PACK_BENEFIT_TEXT) — "As a swift action, you can surround yourself with an invisible bubble of Force power that shields you and anything you're carrying from electronic surveillance. The bubble also blocks all electronic sensors and communications.…". Tags: `force`, `swift_action`, `action_economy`, `concealment`, `stealth`, `infiltration`, `tech`, `sensors`, `network`; compared tag `shields` absent. Comparison records carrying it: Droid Shield Mastery (FEAT) [`shields`, `resource_recovery`, `reliability`, `swift_action`, `action_economy`, `endurance`]; Vehicle Systems Expertise (FEAT) [`vehicle`, `mechanics`, `shields`, `power_systems`, `swift_action`, `action_economy`, `once-per-encounter`, `resource_recovery`]; Shield Surge (FEAT) [`vehicle`, `shields`, `damage_reduction`, `durability`, `reaction`, `action_economy`, `resource_spend`, `power_systems`].

### N. Force mechanics

Tags expected: `anti-force`, `dark_side`, `dark_side_score`, `force`, `force_defense`, `force_power`, `force_power_synergy`, `force_training`, `light_side`, `use_the_force`. Records with evidence text: 1540; feats involved 32; talents involved 288; detections 639; already convergent 464; owner review 12.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| N.use_the_force_skill | `use_the_force` | HIGH | 4/119 | 4/114 | 0/5 | 0.959 |
| N.force_power | `force_power` | HIGH | 5/89 | 3/2 | 2/87 | 0.053 |
| N.force_power_synergy | `force_power_synergy` | MEDIUM | 0/25 | 0/19 | 0/6 | 0.76 |
| N.force_defense | `force_defense` | MEDIUM | 1/7 | 1/4 | 0/3 | 0.625 |
| N.force_training | `force_training` | MEDIUM | 4/6 | 2/1 | 2/5 | 0.3 |
| N.anti_force | `anti-force` | MEDIUM | 0/3 | 0/2 | 0/1 | 0.667 |
| N.light_side | `light_side` | HIGH | 0/5 | 0/5 | 0/0 | 1 |
| N.dark_side | `dark_side` | HIGH | 1/36 | 1/32 | 0/4 | 0.892 |
| N.dark_side_score | `dark_side_score` | HIGH | 1/19 | 1/14 | 0/5 | 0.75 |
| N.force_generic | `force` | LOW | 32/282 | 10/249 | 22/33 | 0.825 |

Owner-review groups (mechanic → candidate tag):

- **N.dark_side** → `dark_side` (P1): 4 record(s) [0 feat / 4 talent]; e.g. Dark Scourge (`08fc3247755c5ebe`); Force Harmony (`5b949c8cd8e78ee8`); Attuned (`bd797d3f83d0f61f`)
- **N.dark_side_score** → `dark_side_score` (P1): 5 record(s) [0 feat / 5 talent]; e.g. Focused Attack (`2fc019fa8c4108a7`); Resist the Dark Side (`3331d4b2b88e446f`); Sith Reverence (`81b2b88df9600ca7`)
- **N.force_defense** → `force_defense` (P2): 3 record(s) [0 feat / 3 talent]; e.g. Reap Retribution (`902c2cef66cf4df6`); Akk Dog Master (`b265aa9dd35c4c5b`); Inspire Fear I (`cf4b1e5b126a2a7e`)

Representative evidence (facts only): **Dark Scourge** (TALENT, Saga Edition Core Rulebook p.223, TALENT_CERTIFIED_PACK_BENEFIT_TEXT) — "…Jedi, and your hatred of them knows no bounds. Against Jedi characters (that is, characters belonging to The Jedi), you gain a +1 Dark Side bonus on attack rolls.". Tags: `precision`, `targeting`, `melee`, `ranged`; compared tag `dark_side` absent. Comparison records carrying it: Pall of the Dark Side (FEAT) [`dark_side`, `dark_side_score`, `use_the_force`, `force`, `stealth`, `detection`, `force_defense`, `anti-force`].

### O. Weapon / combat mode

Tags expected: `double_weapon`, `dual_wield`, `exotic_weapon`, `fighting_defensively`, `flanking`, `full_attack`, `heavy_weapon`, `improvised_weapon`, `lightsaber`, `martial_arts`, `melee`, `nonlethal`, `pistol`, `ranged`, `stun`, `unarmed`. Records with evidence text: 1540; feats involved 92; talents involved 312; detections 582; already convergent 501; owner review 53.

| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |
| --- | --- | --- | --- | --- | --- | ---: |
| O.melee | `melee` | HIGH | 35/139 | 30/129 | 5/10 | 0.914 |
| O.ranged | `ranged` | HIGH | 28/109 | 26/100 | 2/9 | 0.92 |
| O.unarmed | `unarmed` | HIGH | 22/29 | 20/29 | 2/0 | 0.961 |
| O.martial_arts | `martial_arts` | HIGH | 3/0 | 3/0 | 0/0 | 1 |
| O.lightsaber | `lightsaber` | HIGH | 5/67 | 2/60 | 3/7 | 0.861 |
| O.pistol | `pistol` | HIGH | 4/17 | 1/14 | 3/3 | 0.714 |
| O.heavy_weapon | `heavy_weapon` | HIGH | 4/5 | 0/2 | 4/3 | 0.222 |
| O.improvised_weapon | `improvised_weapon` | HIGH | 1/2 | 1/2 | 0/0 | 1 |
| O.exotic_weapon | `exotic_weapon` | HIGH | 9/16 | 1/4 | 8/12 | 0.2 |
| O.double_weapon | `double_weapon` | HIGH | 3/5 | 3/5 | 0/0 | 1 |
| O.dual_wield | `dual_wield` | MEDIUM | 4/8 | 4/7 | 0/1 | 0.917 |
| O.full_attack | `full_attack` | HIGH | 9/20 | 8/20 | 1/0 | 0.966 |
| O.fighting_defensively | `fighting_defensively` | HIGH | 2/6 | 2/6 | 0/0 | 1 |
| O.flanking | `flanking` | HIGH | 0/11 | 0/10 | 0/1 | 0.909 |
| O.stun | `stun` | HIGH | 3/15 | 1/10 | 2/5 | 0.611 |
| O.nonlethal | `nonlethal` | HIGH | 0/1 | 0/1 | 0/0 | 1 |

Owner-review groups (mechanic → candidate tag):

- **O.full_attack** → `full_attack` (P1): 1 record(s) [1 feat / 0 talent]; e.g. Rapid Assault (`4be60753991eec43`)
- **O.lightsaber** → `lightsaber` (P1): 10 record(s) [3 feat / 7 talent]; e.g. Flurry (`0536f81eff886234`); Improved Rapid Strike (`cb6aea7e256e4c8c`); Weapon Proficiency (`ecc2471ac96ec2d4`)
- **O.melee** → `melee` (P1): 15 record(s) [5 feat / 10 talent]; e.g. Knife Trick (`61c053191d05d0a2`); Charging Fire (`a945e2f5ffb5a7ed`); Precise Shot (`c180eee7d3bc29b2`)
- **O.pistol** → `pistol` (P1): 6 record(s) [3 feat / 3 talent]; e.g. Sport Hunter (`8778b4271420f789`); Disabler (`94023012303ad257`); Weapon Proficiency (`ecc2471ac96ec2d4`)
- **O.ranged** → `ranged` (P1): 11 record(s) [2 feat / 9 talent]; e.g. Tool Frenzy (`203f7fa521105d0b`); Dive for Cover (`2866d953b4b6245d`); Visionary Defense (`153f4b3c6510023d`)
- **O.stun** → `stun` (P1): 7 record(s) [2 feat / 5 talent]; e.g. Ion Shielding (`43a4b873d9a9984d`); Droid Hunter (`5d17898fc9652370`); Sudden Storm (`c101826c205debf2`)
- **O.unarmed** → `unarmed` (P1): 2 record(s) [2 feat / 0 talent]; e.g. Triple Crit (`3d4a4e93ced26712`); Weapon Focus (`c41814601364b643`)
- **O.dual_wield** → `dual_wield` (P2): 1 record(s) [0 feat / 1 talent]; e.g. Synchronized Fire (`388f30468a80f221`)

Representative evidence (facts only): **Rapid Assault** (FEAT, Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE) — "…Double Attack still apply. You cannot make more than two attacks through Rapid Assault regardless of how many attacks your normal Full Attack could produce. This is an official optional rule, not a mandatory Core rule. Spend a Force Point to make exactly two attacks as a…". Tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`; compared tag `full_attack` absent. Comparison records carrying it: Flurry of Blows (TALENT) [`unarmed`, `martial_arts`, `melee`, `full_attack`, `sustained_damage`, `scaling`, `precision`]; Multiattack Proficiency (heavy weapons) (TALENT) [`heavy_weapon`, `full_attack`, `sustained_damage`, `precision`, `weapon_training`]; Flanking Fire (TALENT) [`pistol`, `ranged`, `dual_wield`, `flanking`, `full_attack`, `standard_action`, `action_economy`, `sustained_damage`, `positioning`].

## Tag-convention questions (detector tagged-rate below 50%)

Reporting rule (measurable): when a detector's tagged-rate is below 50%, its untagged matches are listed once per tag instead of as one owner-review item per record. No record is dropped; IDs are in the JSON.

| Mechanic | Tag | Detected | Carrying | Untagged (F/T) | Question |
| --- | --- | ---: | ---: | --- | --- |
| D.burst_damage | `burst_damage` | 11 | 4 | 3/4 | Detector D.burst_damage matches 11 record(s); 4 (36%) carry `burst_damage` and 7 do not. Owner: what does `burst_damage` mark? Records are listed, not individually flagged. |
| F.ambush | `ambush` | 58 | 27 | 7/24 | Detector F.ambush matches 58 record(s); 27 (47%) carry `ambush` and 31 do not. Owner: what does `ambush` mark? Records are listed, not individually flagged. |
| F.ambush_defense | `ambush_defense` | 21 | 6 | 0/15 | Detector F.ambush_defense matches 21 record(s); 6 (29%) carry `ambush_defense` and 15 do not. Owner: what does `ambush_defense` mark? Records are listed, not individually flagged. |
| H.counterattack | `counterattack` | 3 | 1 | 2/0 | Detector H.counterattack matches 3 record(s); 1 (33%) carry `counterattack` and 2 do not. Owner: what does `counterattack` mark? Records are listed, not individually flagged. |
| H.overwatch | `overwatch` | 2 | 0 | 0/2 | Detector H.overwatch matches 2 record(s); 0 (0%) carry `overwatch` and 2 do not. Owner: what does `overwatch` mark? Records are listed, not individually flagged. |
| I.melee_defense | `melee_defense` | 3 | 1 | 0/2 | Detector I.melee_defense matches 3 record(s); 1 (33%) carry `melee_defense` and 2 do not. Owner: what does `melee_defense` mark? Records are listed, not individually flagged. |
| J.condition_removal | `condition_removal` | 29 | 8 | 1/20 | Detector J.condition_removal matches 29 record(s); 8 (28%) carry `condition_removal` and 21 do not. Owner: what does `condition_removal` mark? Records are listed, not individually flagged. |
| J.medicine | `medicine` | 12 | 3 | 0/9 | Detector J.medicine matches 12 record(s); 3 (25%) carry `medicine` and 9 do not. Owner: what does `medicine` mark? Records are listed, not individually flagged. |
| K.leadership | `leadership` | 8 | 1 | 0/7 | Detector K.leadership matches 8 record(s); 1 (13%) carry `leadership` and 7 do not. Owner: what does `leadership` mark? Records are listed, not individually flagged. |
| M.space | `space` | 28 | 11 | 4/13 | Detector M.space matches 28 record(s); 11 (39%) carry `space` and 17 do not. Owner: what does `space` mark? Records are listed, not individually flagged. |
| N.force_power | `force_power` | 94 | 5 | 2/87 | Detector N.force_power matches 94 record(s); 5 (5%) carry `force_power` and 89 do not. Owner: what does `force_power` mark? Records are listed, not individually flagged. |
| N.force_training | `force_training` | 10 | 3 | 2/5 | Detector N.force_training matches 10 record(s); 3 (30%) carry `force_training` and 7 do not. Owner: what does `force_training` mark? Records are listed, not individually flagged. |
| O.exotic_weapon | `exotic_weapon` | 25 | 5 | 8/12 | Detector O.exotic_weapon matches 25 record(s); 5 (20%) carry `exotic_weapon` and 20 do not. Owner: what does `exotic_weapon` mark? Records are listed, not individually flagged. |
| O.heavy_weapon | `heavy_weapon` | 9 | 2 | 4/3 | Detector O.heavy_weapon matches 9 record(s); 2 (22%) carry `heavy_weapon` and 7 do not. Owner: what does `heavy_weapon` mark? Records are listed, not individually flagged. |

## Cross-domain mechanic bundles (Channel 2)

| Bundle | Feats | Talents | Compared-tag carriage (feat carrying/members; talent carrying/members) | Mismatches |
| --- | ---: | ---: | --- | ---: |
| Reroll with keep-better / roll-twice | 5 | 13 | `reroll` 5/5; 13/13 · `reliability` 5/5; 13/13 | 0 |
| Explicit reroll | 19 | 78 | `reroll` 19/19; 77/78 · `reliability` 19/19; 77/78 | 2 |
| Persistent condition removed by Treat Injury | 1 | 8 | `treat_injury` 1/1; 8/8 | 0 |
| Force Point expenditure + attack modifier | 2 | 21 | `force_point_spend` 2/2; 20/21 · `resource_spend` 2/2; 20/21 | 2 |
| Reaction + defensive benefit | 2 | 4 | `reaction` 2/2; 3/4 · `action_economy` 2/2; 4/4 · `defense` 1/2; 3/4 | 3 |
| Grapple attack + forced movement | 4 | 2 | `grapple` 1/4; 0/2 · `battlefield_control` 4/4; 2/2 · `movement` 3/4; 2/2 | 1 |
| Natural 20 + resource recovery | 1 | 3 | `critical_success` 1/1; 2/3 · `resource_recovery` 1/1; 1/3 | 3 |
| Attack of opportunity generation / modification | 22 | 59 | `attack_of_opportunity` 22/22; 45/59 | 14 |
| Second wind | 10 | 14 | `healing` 8/10; 13/14 · `recovery` 10/10; 13/14 | 0 |
| Condition track movement | 16 | 79 | `recovery` 4/16; 21/79 · `condition_removal` 4/16; 20/79 · `healing` 1/16; 7/79 | 0 |
| Skill / modifier substitution | 7 | 17 | `skill_substitution` 4/7; 14/17 | 0 |
| Ally-triggered benefit | 1 | 15 | `ally-trigger` 1/1; 6/15 · `ally_support` 0/1; 10/15 | 0 |
| Damage threshold manipulation | 15 | 31 | `damage_threshold` 15/15; 28/31 | 3 |
| Prone / knock-down | 9 | 9 | `battlefield_control` 5/9; 6/9 · `control` 7/9; 6/9 | 0 |

## Tag-definition reverse audit (Channel 3)

P3 owner-review items are broad tags or tags whose co-tag profile differs strongly between domains. Full per-tag samples are in the JSON.

| Tag | State | Feats | Talents | Co-tag cosine | Note |
| --- | --- | ---: | ---: | ---: | --- |
| `alchemy` | USED_BY_ONE_DOMAIN_ONLY | 0 | 6 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `battlefield_control` | PASS3B_OWNER_REVIEW | 32 | 166 | 0.895 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `beast_companion` | USED_BY_ONE_DOMAIN_ONLY | 0 | 6 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `block` | USED_BY_ONE_DOMAIN_ONLY | 0 | 16 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `command` | USED_BY_ONE_DOMAIN_ONLY | 0 | 11 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `control` | PASS3B_OWNER_REVIEW | 46 | 208 | 0.875 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `deflect` | USED_BY_ONE_DOMAIN_ONLY | 0 | 17 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `empowerment` | PASS3B_OWNER_REVIEW | 2 | 37 | — | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `flanking` | USED_BY_ONE_DOMAIN_ONLY | 0 | 11 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `followers` | USED_BY_ONE_DOMAIN_ONLY | 0 | 23 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `force_control` | USED_BY_ONE_DOMAIN_ONLY | 0 | 2 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `force_offense` | USED_BY_ONE_DOMAIN_ONLY | 0 | 23 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `force_power_synergy` | USED_BY_ONE_DOMAIN_ONLY | 0 | 82 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `illusion` | USED_BY_ONE_DOMAIN_ONLY | 0 | 5 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `jury_rig` | USED_BY_ONE_DOMAIN_ONLY | 0 | 8 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `light_side` | USED_BY_ONE_DOMAIN_ONLY | 0 | 8 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `meditation` | USED_BY_ONE_DOMAIN_ONLY | 0 | 2 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `minion` | USED_BY_ONE_DOMAIN_ONLY | 0 | 13 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `morale` | USED_BY_ONE_DOMAIN_ONLY | 0 | 35 | — | Carried only by talents; 10 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `offense_melee` | USED_BY_ONE_DOMAIN_ONLY | 0 | 10 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `offense_ranged` | USED_BY_ONE_DOMAIN_ONLY | 0 | 16 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `opposed_check` | USED_BY_ONE_DOMAIN_ONLY | 0 | 25 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `overwatch` | USED_BY_ONE_DOMAIN_ONLY | 0 | 5 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `planning` | USED_BY_ONE_DOMAIN_ONLY | 0 | 5 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `precision` | PASS3B_OWNER_REVIEW | 68 | 174 | 0.895 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `precision_damage` | USED_BY_ONE_DOMAIN_ONLY | 0 | 7 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `precognition` | USED_BY_ONE_DOMAIN_ONLY | 0 | 15 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `pursuit` | USED_BY_ONE_DOMAIN_ONLY | 0 | 30 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `recon` | USED_BY_ONE_DOMAIN_ONLY | 0 | 31 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `reliability` | PASS3B_OWNER_REVIEW | 33 | 142 | 0.897 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `resources` | PASS3B_OWNER_REVIEW | 14 | 46 | 0.739 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `search_your_feelings` | USED_BY_ONE_DOMAIN_ONLY | 0 | 5 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `self_repair` | USED_BY_ONE_DOMAIN_ONLY | 0 | 3 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `setup` | PASS3B_OWNER_REVIEW | 28 | 149 | 0.889 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `spellcasting` | USED_BY_ONE_DOMAIN_ONLY | 0 | 1 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `support` | PASS3B_OWNER_REVIEW | 21 | 285 | 0.911 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `survivability` | PASS3B_OWNER_REVIEW | 22 | 149 | 0.758 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `talisman` | USED_BY_ONE_DOMAIN_ONLY | 0 | 8 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `target-designation` | PASS3B_OWNER_REVIEW | 3 | 75 | — | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `targeting` | PASS3B_OWNER_REVIEW | 30 | 123 | 0.896 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `tech` | PASS3B_OWNER_REVIEW | 12 | 55 | 0.806 | Owner-named broad tag; cross-domain usage evidence supplied for the owner. |
| `telekinesis` | USED_BY_ONE_DOMAIN_ONLY | 0 | 13 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `telepath` | USED_BY_ONE_DOMAIN_ONLY | 0 | 2 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `telepathy` | USED_BY_ONE_DOMAIN_ONLY | 0 | 10 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `trap` | USED_BY_ONE_DOMAIN_ONLY | 0 | 10 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |
| `visions` | USED_BY_ONE_DOMAIN_ONLY | 0 | 23 | — | Carried only by talents; 0 feat record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made. |

## Ontology-gap screen

Literal wording screen only: it reports recurring wording and the tags those records already carry. It does not conclude that a tag is needed; the owner decides.

| Wording | Feats | Talents | Most-carried tags, feats (rate) | Most-carried tags, talents (rate) | State |
| --- | ---: | ---: | --- | --- | --- |
| Condition Track movement | 16 | 79 | `resilience` 0.375, `survivability` 0.313, `action_economy` 0.25 | `action_economy` 0.519, `control` 0.418, `battlefield_control` 0.316 | PASS3B_ONTOLOGY_GAP_CANDIDATE |
| Second wind | 10 | 14 | `recovery` 1, `healing` 0.8, `action_economy` 0.2 | `healing` 0.929, `recovery` 0.929, `survivability` 0.786 | NOT_FLAGGED |
| Bonus / temporary hit points | 0 | 22 | — | `durability` 1, `scaling` 1, `survivability` 0.955 | NOT_FLAGGED |
| Destiny Points | 1 | 2 | `empowerment` 1, `resource_spend` 1, `resources` 1 | `action_economy` 0.5, `awareness` 0.5, `force` 0.5 | NOT_FLAGGED |
| Free action | 12 | 65 | `action_economy` 0.5, `control` 0.417, `movement` 0.417 | `action_economy` 0.954, `melee` 0.446, `ranged` 0.277 | NOT_FLAGGED |
| Full-round action | 9 | 47 | `action_economy` 0.222, `climb` 0.222, `damage_threshold` 0.222 | `action_economy` 0.872, `force` 0.383, `equipment` 0.362 | PASS3B_ONTOLOGY_GAP_CANDIDATE |
| Prone / knocked down | 9 | 9 | `control` 0.778, `battlefield_control` 0.556, `melee` 0.556 | `battlefield_control` 0.667, `control` 0.667, `positioning` 0.556 | NOT_FLAGGED |
| Dodge bonus | 2 | 8 | `defense` 1, `evasion` 1, `mobility` 0.5 | `defense` 1, `evasion` 0.75, `action_economy` 0.625 | NOT_FLAGGED |
| Size category comparison | 2 | 11 | `martial_arts` 1, `melee` 1, `unarmed` 1 | `control` 0.636, `battlefield_control` 0.455, `positioning` 0.455 | NOT_FLAGGED |
| Aid Another | 13 | 22 | `support` 0.769, `ally_support` 0.692, `teamwork` 0.692 | `teamwork` 1, `support` 0.955, `ally_support` 0.818 | NOT_FLAGGED |
| Persistent condition | 1 | 11 | `action_economy` 1, `control` 1, `damage` 1 | `action_economy` 0.818, `once-per-encounter` 0.727, `treat_injury` 0.727 | NOT_FLAGGED |
| Daze / stun / paralysis conditions | 0 | 1 | — | `action_economy` 1, `battlefield_control` 1, `control` 1 | NOT_FLAGGED |

No tag is added by this pass.

## Previously ruled matches

11 candidate(s) matched an already-issued owner ruling and carry the state that ruling implies (listed in the JSON).
