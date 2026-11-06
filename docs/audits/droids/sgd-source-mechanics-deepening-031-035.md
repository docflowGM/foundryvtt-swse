# SGD Source Mechanical Deepening — M11 (Droids 031–035)

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Printed pages:** 128–137; **PDF pages:** 129–138; visually inspected as page renders.

## Audit boundary

Detailed second-pass review of **five** existing source identities: **22 protocol actions**, **13 nonfactory modifications**, **16 source constraints**, **4 heroic-construction notes**, plus **one newly flagged effect divergence**. Retains the previously recorded **RWW Mimic conflict**. No rules are promoted to gameplay or strict source-mechanical certification: **46/46 SGD hydrated; 0/46 certified**, out of 234 source identities project-wide.

## 031 R8-Series Astromech Droid (pp.128–129)

Five source protocol actions: Copilot, Issue Routine Command, Navigation Charts, Recharge Shields, Regulate Power. Navigation Charts main prose allows calculating a hyperspace course as a **standard** rather than full-round action and avoids −5 Use Computer without HoloNet. Protocol calls chart access **one swift**; these are separately scoped claims, not a granted swift completion of the entire navigation check. Shields restore five SR, no unprinted DC added.

**Smuggler's Assistant** adds up to 5kg scattered hidden compartments (DC30 Perception each), spring-loaded storage for a *possessed* blaster, and Perception-to-Deception retraining; locked access and defense grid are optional. **Signal Hub** adds a sensor countermeasure, optionally a communications countermeasure, and a DC25 Mechanics/2-hour alteration granting **5 minutes of double comlink signal range once/day**. Skill Focus retraining remains optional.

Hero uses stock astromech chassis, trades default darkvision/2kg storage/six tools for four tools and Navigation Charts, and **buys** sensors instead of inheriting them.

## 032 RWW-Series Protocol Droid (pp.130–131)

Three protocols: Databank, Mimic, Translator. Existing `SGD-032-MIMIC-EFFECT-CONFLICT` remains: main prose **reroll Deception, forced second result**, versus protocol **+2 Deception to deceptive appearance**. No automatic stacking or arbitration.

**Combat Training Opponent** installs jump servos DC20 Mechanics, 2 hours, adding **+4 STR for melee combat only**, swaps skill-focused feats for actual weapon proficiencies and requires purchased armor/weapon/helmet/targeting scope. **Espionage Droid** adds communications, optional sensors and recorder, and optional internal reverse-polarity restraining bolt, DC15 Mechanics in 10 minutes, which defeats only **one** bolt; stealth detection via DC30 Perception. **Medical Assistant** exchanges skills and feats for life sciences, Treat Injury, Surgical Expertise and a newly installed sensor package. None are factory baselines.

Hero uses stock protocol chassis replacing hardwired design with Mimic; data cards/cylinder/pad are optional purchased possessions.

## 033 RX-Series Pilot Droid (pp.132–133)

Five protocols: Engage the Enemy, Hot-Shot Pilot, Increase Vehicle Speed, Recharge Shields, Regulate Power. Hot-Shot Pilot can reroll collision checks and once/encounter evade missile/torpedo via **Pilot check ≥ attack roll**; speed increase requires DC20 Pilot, scaling +1 square per five margin.

**Astrogation Droid** installs buffer (minimum 2 slots, 5–6 recommended), optional compatible scomp and hypertransceiver, and swaps Skill Focus to Use Computer. **Communications Droid** adds comlink terminal; hypertransceiver long-range option DC25/2 days or DC35/2 hours, failed rush destroys the hardware. **Tactical Systems Droid** replaces claw with hand **or** installs compatible scomp link, adds improved sensor package DC15 Mechanics/1 hour, retrains Perception and **removes Hot-Shot Pilot**. This is a replacement, never an additive always-on benefit.

Hero uses stock probe chassis with prescribed replacements, not inherited factory nonheroic levels.

## 034 S19 Astromech Droid (pp.134–135)

Five protocols: Focused Repairs, Jury-Rig, Recharge Shields, Regulate Power, Run Diagnostics. **Focused Repairs has two printed different effects**: main special quality reduces repair time by **2 minutes per DC margin**, minimum 10; protocol gives master's Mechanics reroll that **must keep second**. Flagged `SGD-034-FOCUSED-REPAIRS-EFFECT-DIVERGENCE` as unresolved identity/coexistence question, not necessarily an irreconcilable contradiction.

**Gravity Well Projector** hardens frame x2, removes **all** other parts/possessions except heuristic processor and tracked locomotion, installs by DC30 Mechanics/2 days, projects **4×4 squares** up to **12 squares**, repositioned by full-round; ranged attack through well rerolls and keeps **lower**. **Mobile Shield Generator** is tiered replacement, not additive: SR10 requires removal of buffer/holorecorder; SR15 also removes diagnostics/comlink; SR20 also removes four tools/toolkit. Emits **5×5 shield** centered on droid; active mobility only one move if standard is surrendered, otherwise stationary. **Trailblazer** swaps tracked for hovering, buffer for automap, Skill Focus to Perception.

Hero uses separate astromech chassis with tracked locomotion and prescribed starting substitutions, and purchases toolkit/holorecorder.

## 035 SD-9-Series Battle Droid (pp.136–137)

Four protocols: Defense Mode, Delay Damage, Heavy Repeating Blaster Attack, Plasma Burst Cannon Attack. Defense Mode is a **target designation** with **once/encounter reaction attack**. Delay Damage postpones a specific effect until end of next turn, not immunity. Protocol autofire blaster **+5** and main printed statblock **+15** are retained in their source-specific contexts, not assumed to yield identical attack resolution or extra attack permission. Plasma burst cannon is 1-square splash and adds heat die ONLY on threshold exceedance.

**Assault Unit** replaces armor with neutronium and repeating blaster with E-Web, then DC20 Use Computer/1,000 credits/1 day software grants **+2 attack and damage only when a combat-unit member is within 6 squares**. **Backseat Driver** builds partial Medium-or-smaller passenger seat, DC20 Mechanics/500 credits/4 hours; rider can make own attacks and droid **usually** gains +2 Perception with rider's warning. Additional mounted weapons/sensors are optional and not created by this modification.

SD-9 remains expressly **hero-prohibited**. Factory **SR15 applies only to ion**, with separate DR4 and printed armor bonuses; integrated weapon mounts and full-attack choices remain uncertified.

## Verification and limits

Five IDs/name/page positions matched; all 46 source identities retained; 22 protocols/13 variants/16 constraints citation-bearing and source-only; existing RWW Mimic conflict retained, one S19 divergence added; all original attack groups non-executable, no certified droids. Checks performed are **focused in-memory integrity guards** followed by GitHub readback, not original Python Draft202012 schema validation, comprehensive SWSE feat/weapon/vehicle graph or Foundry runtime. No production compendium/scripts or concurrent component-refactor files changed.

**Manifest:** `data/audits/droids/sgd-source-mechanics-sprint-031-035.json`.  
**Next:** 036–040.
