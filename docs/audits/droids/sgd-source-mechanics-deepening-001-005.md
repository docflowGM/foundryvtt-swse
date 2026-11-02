# SGD Droid Source Mechanics — Deepening Sprint 001–005 (M5)

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Source:** *Scavenger's Guide to Droids*, printed **pp.68–77** (PDF one-based 69–78). All ten pages were rendered locally at 1.65x; all five two-page pairs visually inspected and verified against local embedded PDF text. TXT is an index only.

**Status:** **5** published model entries received a second, detailed *source-mechanics* pass. **46/46 SGD source records remain structurally hydrated, 0/46 strict source-mechanically certified, and 0 Foundry runtime certified.** This is not a promotion to `certified` or a release authorization.

## Work performed and verified

Updated exactly SGD-DROID-001 through SGD-DROID-005 in `data/canonical/droids/source-books/sgd.json`, preserving the other **41** source identities and all published source names, numbers and existing component identities. No production `packs/`, scripts, UI or actors were edited.

| New typed source evidence | Count |
|---|---:|
| Model records inspected | **5** |
| Printed pages visually inspected | **10** |
| Named nonfactory modification variants | **15** |
| Source-scoped action / protocol claims | **19** |
| Added heroic-PC construction claims | **4** |
| Installation / transformation constraints | **6** |
| Added physical weapon/firing delegation guard | **1** |
| Newly recorded printed contradiction | **1** |
| Previously known contradiction retained in this tranche | **1** |
| Strict full mechanical certifications awarded | **0** |

Machine-readable per-record blocker and evidence summary: `data/audits/droids/sgd-source-mechanics-sprint-001-005.json`.

## Printed evidence by record

### SGD-DROID-001 — 8D Smelter Droid (pp.68–69)

* **Heat resistant** in the published statblock limits fire/extreme-heat damage and avoids condition-track movement under that effect; the separate heroic-PC guidance says **buy the duravlex shell** to get the special quality, not receive a free chassis-wide innate immunity.
* **Damage Control:** increased speed 6; retrain skills; tools and fire extinguisher; fully modified starship repairs can restore **2d8 ship HP and +2 condition steps**. This is a ship repair variant, not a generic droid healing action.
* **Master's Decoy:** replace claws with hands, disguise and reprogram voice/Deception. At least **3 squares** distant, reroll Deception twice and keep the highest of three results.
* **Survivalist:** **1,000 credits, DC 20 Mechanics, 4 hours**; retune skills/feat, reroll Survival; with duravlex, automatically succeeds on Endure Extreme Temperatures without a field kit.
* **Protocol:** Mighty Swing **one swift action once/turn** increases next melee attack damage by one die in the same round. No additional independent melee attack is implied.

### SGD-DROID-002 — A9G-Series Archive Droid (pp.70–71)

* **Existing unresolved conflict preserved:** Archive Processor described as a **full-round action** in main prose, **two swift actions** in protocol; both permit skill reroll with mandatory second result. `SGD-002-ARCHIVE-PROCESSOR-ACTION-COST` remains unresolved.
* **Heroic creation:** stock protocol chassis and scoundrel suggested; Archive Processor is gained **in lieu of** a translator unit (not alongside a free translator).
* **Field Medic:** local life-sciences database narrows archive rerolls to Knowledge (life sciences); replace skill training and code cylinder with medical kit. Optional head scanner **DC 20 Mechanics, 2 hours** and **+2 Treat Injury** stacks with medkit's **+2 first aid** as specifically printed. Two extra medpacs require taking the scanner out of the medkit.
* **Reconnaissance:** recorder installation **DC 20 Mechanics, 2 hours** and related sensor/storage/skill substitutions; no auto-Stealth grant.
* **Slicer's Computer:** portable-computer installation **DC 20 Mechanics, 1 hour**; optional sync also needs **DC 20 Mechanics + DC 20 Use Computer + 2 hours**, granting the **participating slicer** a once/encounter reroll keeping the better Use Computer result. It is not a bonus on the droid itself.
* Additional protocol actions (Improve Access, Issue Routine Command, Translator) remain source-only.

### SGD-DROID-003 — AD-Series Weapons Maintenance Droid (pp.72–73)

* **Police:** replace built-in tool kit with law-enforcement storage **DC 20 Mechanics, 20 minutes**; skill substitution **DC 20 Use Computer, 30 minutes**; weapon choices include optional integrated blaster or carried carbine, not inherent printed attacks.
* **Sniper:** tailor toolkit for **one chosen weapon**, **DC 20 Mechanics, 1 hour**. **+2 with exact selected weapon, −2 with every other weapon**, including the same model. Optional skill retuning needs **DC 25 Use Computer, 30 minutes**. Do not grant global +2 to weapon attacks.
* **Speakeasy:** intimidatory vocabulator upgrade **DC 20 Mechanics, 30 minutes**; Persuasion and Skill Focus; separate pattern-recognition upgrade **DC 20 Mechanics, 30 minutes** yields Skill Focus (Perception); weapon detector is **optional**, not stock.
* **Protocol actions:** Avoid Surprise (free), Disable Device and Improve Access (two swift each), Patrol Duty (one swift) explicitly source-only. **Tool appendages are not identical to the separately printed tool kit.**

### SGD-DROID-004 — Annihilator Droid (pp.74–75)

* **No PC creation:** printed statement expressly prohibits playing annihilator droids as heroic droids.
* **Exclusive locomotion:** a single swift move gives **walking 2**; **two swift actions** in the same turn are needed to transform to wheeled and move **10**. No unconditioned wheeled speed.
* **Weapon identity:** two printed laser cannons are treated as **blaster rifles** for attacks and mounted with **two tool appendages** in the protocol. Distinct physical weapon/mount identity and simultaneous fire execution still require proof. The robot has **remote receiver**, not automatically an onboard processor.
* **Source protocol options:** Blaster Barrage **two swift** for two attacks **+13 / 5d8+4**; Rapid Shot **one swift +18 / 4d8+4**; Twin Blaster Burst **one swift +20 / 3d8+4**; these are alternative source-only actions pending V2 weapon ownership certification.
* **Capital Ship Scrapper:** remove SR20 shield and install magnetic coupler; swap cannon to a **melee** welding-device attack and replace appendage with pincer; distinct **DC20 / DC25 / DC25 / DC30 Mechanics** procedures and installation times are preserved.
* **Cargo Hauler:** each pod holds **200 kg**, needs DC20 Mechanics and 1 hour, and penalizes **attack OR Reflex −1** as chosen upon installation, not both. Linking multiple droids costs **DC20 Use Computer per droid**, granting +4 on aiding another fire-linked droid, not +4 to every attack.
* **Space Sentry:** lateral thrusters are for **turning/targeting, not translating** the droid in space; DC30 Mechanics 2 hours, DC20 Use Computer (duration not given), and launcher replacement DC25 Mechanics 1 hour. No invented starship speed or free missile grant.

### SGD-DROID-005 — BLX Labor Droid (pp.76–77)

* **New unresolved contradiction:** Main Jack of All Trades special-quality prose: **standard action once/encounter**; protocol: **one swift action (one/turn, still once/encounter)**. ID `SGD-005-JACK-ACTION-COST-CONFLICT`; no selected authority.
* **Heroic stock labor build:** replace basic processor with heuristic, claws with hands, and normal labor heavy lifting special quality **with** Jack of All Trades. No simultaneous baseline free heavy lifting and Jack of All Trades; buy magnetic feet and 10 kg internal storage.
* **Attaché:** installing translator unit **removes** Jack of All Trades; retrains skills and Skill Focus. Do not retain its special quality after translator modification.
* **Long-Range Sensor:** **replace 10 kg internal storage** with sensor pack; two independent **DC15 Mechanics, 1-hour** installation steps for pack and booster; reprogram Skill Focus. Resulting **5 km** scanning range is **specific to this BLX transformation**, not a general sensor-booster range.
* **Portable Generator:** remove storage and magnetic feet; replace **heuristic with basic processor**; add shielding **1,000 credits, DC20 Mechanics, one day**. No original processor/slot persistence after conversion.
* **Jury-Rig** is protocol two swift / DC25 Mechanics and should use Core Mechanics rules rather than a new droid-only repair engine.

## Certification blockers and what not to infer

1. **Printed action conflicts:** A9G Archive Processor and BLX Jack of All Trades need an explicit controlling-source decision. Main prose and protocol rules are intentionally preserved as separate claims.
2. **Attack/mount and physical equipment proofs:** Annihilator cannons, AD police arms/blasters, and 8D physical claw replacement cannot become executable weapon states from mere possession/statblock mentions. The source data does not itself grant mount permissions.
3. **Trait identity and rule completeness:** Feats/talents, skill-trained options, passive stacking, and generated modifiers are not yet fully mapped to canonical V2 trait authorities for these five models.
4. **Model-specific variants are not universal products:** The BLX-specific 5 km sensor, 8D extreme heat resistance, AD-specific sniper fine-tuning, and A9G external slicer reroll have distinct host/rule predicates. Never silently install them in unmodified stock droids.
5. **Owner/runtime separation:** This source pass does not edit production Actors or compendiums, implement scripts, merge to main, or constitute post-merge Foundry testing. Claude remains responsible for the separately agreed runtime work.

## Verification and next source batch

All **46/46** records passed the custom recursive shape walk, **46/46** null/empty semantic state review, **46/46** frozen census name/page checks, and **46/46** attack non-execution guard. All new sourceRule evidence remains `source-only` with printed-page `pdf-visual` citations. A detected accidental empty `SGD-DROID-003/equipment/possessions` property was removed so absence stayed **unknown**, not asserted empty. The original repository Python `jsonschema.Draft202012Validator` **was not run against GitHub ledger** because connector content is not mounted as a checkout; Foundry V13 was not run.

**Next suggested deepening batch:** SGD-DROID-006 through SGD-DROID-010, covering Colicoid Infiltrator, CZ Secretary, **DP-2 as vehicle-primary**, Droideka Mark II and DT-16 Destructor; keep source-mechanical certification independent of runtime. Record variants, action conflicts, physical mount rules, and cross-domain DP-2 authority before any strict certificate.
