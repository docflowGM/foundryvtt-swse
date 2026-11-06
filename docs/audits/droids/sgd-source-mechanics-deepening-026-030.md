# SGD Published Droid Mechanical Deepening — M10, records 026–030

**2026-11-02** | **Branch:** `audit/droid-publication-census-2026-10-29` | **Source:** *Scavenger's Guide to Droids*, printed pp.118–127 (PDF pp.119–128).

## Scope

Printed ten pages examined in rendered page images, with searchable text used for locating details. Five existing publication identities were deepened with **21 protocol actions, 10 published optional modifications, 16 source restrictions, 4 explicit heroic-route clarifications and 2 newly recorded source contradictions**. No production scripts/compendiums or component-refactor files changed. All new claims are `source-only` and contain printed/PDF page evidence.

## 026 — MK-Series Maintenance Droid (pp.118–119)

- **Three protocol actions:** Issue Routine Command (swift, friendly computer), Jury-Rig Repairs (two swift, Mechanics DC25 at published +17; +2 target condition steps and 1d8 HP), and Shake It Off (two swift, droid +1 condition step).
- **Saboteur variant:** first remove the harm restriction via DC25 Use Computer, 1 hour; then modify the integrated tool claws via DC25 Mechanics, 1 hour. One additional hour spent on the target converts its own components to a makeshift explosive charge under Core explosive-charge rules. No extra free explosives.
- **Existing unresolved printed contradiction is preserved:** the main statblock says **second-degree**; the protocol says **third-degree**. This checkpoint did not choose one. The installed claws count as carrying a tool kit; they do not add a separate purchased toolkit. Lateral Thinker upgrades only Force Point dice on Mechanics or Use Computer checks.
- **Hero creation:** separate stock mechanic chassis with recommended scout or scoundrel path; factory scout 1 and special-case feats are not automatically earned.

## 027 — Model 88-Series Administration Droid (pp.120–121)

- **Four protocol actions:** Improve Access, Issue Routine Command, Superior Analysis, Timely Observation. Superior Analysis requires an initially failed Knowledge check before an immediate Perception roll contributes half its result; Timely Observation requires a DC20 check ON the droid's own turn, once per encounter, and produces a narrow +1 next-action benefit.
- **Gambler's Friend:** DC25 Use Computer and 2,000 credits software; gives the aided gambler **+5 Wisdom vs house / +2 vs other characters**, only while gambler sees or hears droid and droid sees the full table. Hidden cheating may require Stealth/Deception.
- **Industrial Spy:** DC20 Mechanics plus DC25 Use Computer, 5,000 credits, hidden core and Stealth retraining. Once/day take 20 on Gather Information or Use Computer; separate once/day reroll on specific data search. Main personality is unaware of covert programming.
- **Heroic route:** the stock service chassis is overridden to **first-degree**, with heuristic processor replacing basic and tool mount removed. Noble-based progression and bought feats/skills are separate from the printed nonheroic 6/noble 3 template.

## 028 — PG-5 Gunnery Droid (pp.122–123)

- **Five protocols:** Battery Fire (two swift, **−1 per weapon in a single vehicle battery**), Improve Access, Jury-Rig, Recharge Shields (two swift, +5 SR to maximum; no DC stated in protocol), Sensor Sweep (requires vehicle-link).
- **Fire Control System:** requires synchronized circuits through processor and scomp, DC20 Mechanics and DC20 Use Computer in one day; converts Skill Focus (Mechanics) to Weapon Focus (heavy weapons), Mechanics to Knowledge (tactics), and **LOSES Superior Weapon Repair**. Only this optional variant can cancel the relevant battery penalty using new feat. Do not stack both traits.
- **Mechanic's Assistant:** replaces tool appendage with hand, adds 3kg storage for separately purchased repair tools, retrains Perception and Toughness.
- **Security System:** installs sensor booster and communications countermeasures; Skill Focus retraining to Perception, optional repulsorcams. No universal sensor-map authority.
- **Heroic creation:** stock astromech chassis; replace standard astrogation buffer/storage with Battery Fire and Superior Weapon Repair; purchase laser welder and scomp. Not an automatically crewed starship battery.

## 029 — PLNK-Series Power Droid (pp.124–125)

- **Five protocol actions:** Ammo Source, Failsafe Withdrawal (only first attack, move AFTER resolution), Power Charge (DC15, one blaster-pack shot per round), Recharge Shields (two swift, DC20), Regulate Power (two swift, DC20).
- **New contradiction `SGD-029-RECHARGE-SHIELDS-RATING-CONFLICT`:** the main Power Charge paragraph says **7 SR**, whereas protocol Recharge Shields says **5 SR**. Both kept; neither published source version was silently authorized as executable.
- **Observation Plunk:** encrypted internal comlink plus data-routing software (DC15 Mechanics, DC15 Use Computer), owner surveillance, basic observation programming (DC10 Use Computer) and detectability with DC25 Perception. Not factory equipment.
- **Supercharger:** 2 days, DC25 Mechanics, toolkit and 5,000 credits; halves charging time but doubles liquid-Tibanna consumption. Repeating-blaster +one-die damage use needs compatible external power feed. If power cable **exceeds 6 squares**, weapon needs tripod; after **200 shots** barrel fuses until DC20 Mechanics, 2 hours and half the weapon's price in parts. These dependencies must link to canonical resource/weapon ownership later.
- **Hero eligibility remains explicitly prohibited**.

## 030 — RO-D-Series Droid (pp.126–127)

- **Four protocol actions:** Instant Help (reaction once/encounter, movement and bounded aid), Pin (two swift, successful grapple and opposed check), Quick Fix, Stun Baton.
- **New contradiction `SGD-030-QUICK-FIX-ACTION-CONFLICT`:** narrative gives **standard action rather than full-round**; protocol says **one swift action once per encounter**. No interpretation promoted to runtime.
- **Escape Capsule:** requires sufficient internal compartment for an actual passenger, cramped space, transferred defense rules and inside-only control via DC15 Mechanics plus DC15 Use Computer. It does not create a separate free vehicle or unrestricted rider actions.
- **One Droid Band:** after hearing a voice/sound for three minutes, near-perfect replication; gives **+10 Deception to mimic voice**. Requires Persuasion training and DC30 Use Computer, or DC20 if independent droid prestige class levels. Other distraction effects have no invented numeric bonus.
- **Hero route:** stock labor chassis with scoundrel recommended; talents and feats are earned, not granted by the factory.

## Acceptance gates performed

- Five source IDs, names and printed pages matched existing SGD ledger, all **46** records retained.
- Added claims all contain source locator and `executionStatus: source-only`, and no existing 026 degree conflict was overwritten.
- No printed attack groups promoted from `source-only`; no `mechanicalStatus: certified` records created.
- The new PLNK and RO-D contradictions remain `unresolved`.
- **Not run:** canonical rules/weapon-mount graph, repository-wide test suite, original Python Draft 2020-12 JSON Schema validation or live Foundry V13.

**Machine-readable manifest:** `data/audits/droids/sgd-source-mechanics-sprint-026-030.json`.  
**Next:** 031–035. Source hydration remains 46/46, strict mechanical certification remains 0/46.
