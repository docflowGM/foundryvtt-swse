# Clone Wars droid source mechanics — Sprint 001–005 (M1)

**Book:** *Clone Wars Campaign Guide* | **Printed:** pp.66–69 | **PDF:** pages 67–70 | **Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`

## Purpose and authority

Start the **second, detailed source-mechanical pass** for the 40 published Clone Wars droid identities. Prior audit has already selected/visually compared 528 statblock fields and recorded 32 individual droids, 1 squad aggregation and 7 vehicle/starship-format claims. These 40 are not strictly mechanically certified.

The source section on pp.66–69 **does not contain separate model protocol-action lists or published optional-modification variants** comparable to SGD; therefore **zero protocols and zero variants** are recorded for the first five. Do not fabricate them. Instead, this sprint completes all printed Systems/appendage/possession lines and class, feats, skills, speed, bounded equipment facts.

| Source evidence | Added in this sprint |
|---|---:|
| Factory model records | 5 |
| Printed factory component instances | 38 |
| Physical appendages separately identified | 10 |
| Possession entries | 5 |
| Printed scoped feat instances | 21 |
| Printed skill entries | 24 |
| Bounded source-only constraints | 15 |
| Published alternative protocols | 0 |
| Published optional variants | 0 |
| Mechanically certified models | 0 |

### 001 — DD-13 Medical Assistant Droid, p.66

Printed **nonheroic 3**, CL1; cost **4,150 credits** as established by visible PDF, NOT incorrect OCR 4,950. Systems: walking, basic processor, two claws, improved sensors, 10kg internal storage and vocabulator. Surgery kit is a **possession**, not a component. Narrative says medical tools in upper two arms, but Systems line identifies only two claws: do not fabricate additional separate arm mounts or tools. Four individually scoped printed feat claims, including two distinct Skill Focus instances. **Hero creation prohibited.**

### 002 — EW-3 Midwife Droid, p.67

Printed nonheroic 2, CL0; **6-square hovering** with base repulsorlift, heuristic processor, two tool appendages, improved sensors, vocabulator. No printed possessions, medpac reservoir, or unique healing action. Printed maternal behavior is narrative and confers **no extra numerical medical/Persuasion bonus**. Hero eligible; stock feat identity not a legal PC starting grant.

### 003 — IM-6 Medical Droid, p.67

Printed nonheroic 3, CL1, hovering 6; heuristic processor, internal comlink, **two hands**, sensors, vocabulator. Surgery kit and **medpac reservoir equivalent to five medpacs** appear under **Possessions**, not factory Systems. Reservoir is **bounded**, not infinite healing; resource consumption must be implemented by canonical medpac authority. Printed feats include Cybernetic Surgery, two scoped Skill Focus, Skill Training (Use Computer), Surgical Expertise. Hero eligible but printed nonheroic 3 and medical feats are not automatically starting PC grants.

### 004 — SP-4 Analysis Droid, p.68

Printed nonheroic 3, CL1; **walking 4 squares**, two hands, heuristic processor, darkvision, improved sensors, internal comlink and vocabulator. No stock possessions. **Ranged by weapon +2** is a conditional printed attack row, not a possessed firearm or an installed mount. The statblock says **'Immune droid immunities'** and also 'Special Qualities droid traits': retain awkward literal print as editorial evidence, but do not invent an additional rules category or immunity. Hero eligible; analysis specialty conveyed by printed skills/feats rather than invented reroll abilities.

### 005 — LE Series Repair Droid, p.69

Printed nonheroic 3, CL1; walking 6, two hands, heuristic processor, **durasteel shell, integrated comlink, diagnostic package, improved sensor, translator unit DC15, vocabulator**. Holoprojector and holorecorder are separate **possessions**. No printed toolkit: diagnostics do **not** automatically confer a purchased toolkit or waive prerequisites. Hero eligible, actual Armor Proficiency (light) and scoped Mechanics/Knowledge feat claims require downstream canon reconciliation.

## Verification and nonclaims

- Exact first five frozen Clone Wars IDs/names/printed pages preserved and source-cited. Printed PDF pages 67–70 visually inspected; text OCR was auxiliary, and corrected DD-13 price 4,150 retained.
- 40 publication identities preserved; no vehicles or squad converted to character actors.
- Every added source rule remains `source-only`; printed attack groups remain non-executable; no mechanical certificate issued.
- **Not performed:** full original Draft202012 Python schema run, canonical feat/component identity or tool/medpac mechanical certification, repository-wide tests or Foundry V13 execution.
- **No production compendium, V2 scripts, Garage/Store/chargen or separate droid-component workstream changed.**

**Manifest:** `data/audits/droids/clone-source-mechanics-sprint-001-005.json`. **Next:** droids 006–010, printed pp.69–71.
