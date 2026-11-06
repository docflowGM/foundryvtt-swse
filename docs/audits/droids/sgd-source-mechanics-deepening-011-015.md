# SWSE Droid Source Mechanics — Deepening Sprint 011–015 (M7)

**Date:** 2026-11-02  
**Repository:** `docflowGM/foundryvtt-swse`  
**Audit branch:** `audit/droid-publication-census-2026-10-29`  
**Source:** *Scavenger's Guide to Droids*, printed **pp.88–97** (PDF indices 88–97; one-based PDF pages 89–98), all ten printed pages rendered and reviewed.

## Certification and scope

This is a detailed second source-mechanical pass of **SGD-DROID-011 through SGD-DROID-015**. It adds source-scoped alternative configurations, action economy, resource requirements, PC build distinctions and printed contradictions; it does **not** replace or certify the underlying V2 runtime trait/weapon/combat algorithms.

| Metric | M7 (011–015) | M5–M7 (001–015) |
|---|---:|---:|
| Models deep source-reviewed | 5 | **15** |
| Variant modification claims | **10** | **38** |
| Protocol/action claims | **19** | **60** |
| New player-creation route claims | **3** | **8** |
| Source-only model-specific constraints | **10** | **25** |
| Newly flagged contradictions | **3** | **7** |
| Printed pages visually reviewed | 10 | **30** |

Within the first 15 records, **8 unresolved contradiction entries total** are presently recorded (including the preexisting A9G Archive Processor contradiction). The separate SGD source structural hydration remains **46/46 complete**. Strict source-mechanical certification is **0/46 SGD** and **0/234 entire 14-book census**; Foundry runtime certification is zero.

## SGD-DROID-011 — Duelist Elite Training Droid, pp.88–89

The base printed droid retains its rapier possession, not an inferred lightsaber. Three optional variants were added as separate, nonfactory `publishedNonFactoryChanges`:

- **Lightsaber Sparring Partner:** Printed 1,000-credit module, DC 11 Use Computer; *replace* Weapon Proficiency (pistols) with Weapon Proficiency (lightsabers). No additional feat slot or automatically equipped lightsaber.
- **Sith Weapon Master:** Remove safety program via Use Computer against droid Will Defense; alter preferred-weapon training via DC 25 Mechanics, 30 minutes. This programming **reverts after the droid shuts down/restarts**.
- **Stiletto:** Secret weapon/command and concealed activation: DC 20 Mechanics, 1 hour for concealed weapon; programming requires 30 minutes and Use Computer versus Will Defense, with +10 DC to hide the command's origin. Detection contests use the higher of the install Mechanics result or droid Will. The **first** covertly triggered attack treats target as flat-footed, not every attack.

Printed protocol actions now separately capture Fencing Assistance (+2 to assisted actor), First Aid (adjacent Treat Injury DC 15, once/day per recipient) and Rapier Thrust as source-only alternatives. Heroic droid use is allowed, but the published soldier 1 statblock does **not** automatically grant heroic class or feats.

## SGD-DROID-012 — E522 Assassin Droid, pp.90–91

PC hero eligibility remains **prohibited**. The single **Heavy Weapon Support** configuration explicitly replaces needler/ion weapons, relocates a missile launcher to shoulder, installs opposite shoulder launcher, storage and new linked heavy repeating blasters, and reprograms proficiencies. Its DC 25 Use Computer, 2-hour fire-link allows **one standard action** for simultaneous twin-blaster fire with **−2 attack**, not two free attacks.

Protocol Cover Fire is conditional on a successful ranged hit, grants +1 Reflex to allies within 6 squares for the stated duration; Paralyze Opponent applies neurotoxin **only after a needler hit against a living target** and must defer to canonical poison mechanics; Rapid Shot supports printed alternate blaster/ion attacks. The six hunter-seeker missiles are a limited resource; an active launched missile attacks each round until it strikes or **five consecutive misses**, not a fabricated five-round absolute lifetime. Physical shoulder mounts and weapon/poison ownership remain uncertified.

## SGD-DROID-013 — EI-9 Network Security Droid, pp.92–93

Two optional variants are source-recorded:

- **Electromagnetic Pulse:** DC 25 Mechanics, 4,000 credits, 3 days to install. Published radius **6 squares**, attack **1d10 + base attack bonus versus Fortitude**; example object Fortitude scores 10 for typical unshielded electronics and 25 for military/heavy-duty objects. Successful hit causes one-round shutdown and requires a **one-round recharge**. This is a special action affecting appropriate electronics, not unrestricted organic attack damage.
- **Slicer Tracker:** DC 30 Use Computer, 4,000 credits of software, 2 hours. Tracks a detected remote slicer using separately established opposed Use Computer/program authorization or accesses local network sensor feeds with a DC 25 check. Do not grant unrestricted map vision or remote control.

Defense in Depth, Improve Access and Issue Routine Command are recorded as source-only protocol actions. A **hidden core** attempts restoration **1d12 minutes** after memory loss/reprogramming, then **hourly** on unsuccessful attempts; it is not always instant or automatic. Heroic PC guidance uses a **service chassis** and explicit processor/appendage/data-port choices, without unearned printed talents.

## SGD-DROID-014 — EV-Series Supervisor Droid, pp.94–95

The **Quartermaster** transformation installs video recording and charging equipment. A recipient can reroll the **first attack or skill check with a particular issued item each encounter** only if EV maintained that item **≥8 hours during the previous 24 hours**; do not project to all the actor's gear.

The **Technician** transformation **replaces** the internal comlink with a Diagnostics Package, retrains Persuasion and its Skill Focus toward Perception, optionally swaps a hand for a multifunction tool appendage, and may add a scope granting **+2 equipment Mechanics ONLY on repairs**. Purchases and source physical locations remain distinct.

The five protocol alternatives record Bully, Coordinated Attack, Demand Surrender, Improve Access and Issue Routine Command, all source-only. **New unresolved printed contradiction** `SGD-014-BULLY-EFFECT-CONFLICT`:
- Main prose: EV rerolls **its own** Persuasion and keeps better.
- Protocol: successful swift-action attempt grants **master +2 circumstance Persuasion**.
Both claims are retained with separate printed citations; no controlling variant chosen.

Optional heroic EV construction uses **stock protocol chassis**, suggested noble, and replaces the stock translator choice with **heuristic processor and Bully special quality**; it is not the printed NPC's full starting grants.

## SGD-DROID-015 — FLTCH-Series Battle Droid, pp.96–97

The printed baseline has separate claw, customized handheld heavy blaster rifle, built-in arm rifle, **single-missile** built-in launcher and demountable jetpack. The source warns ordinary non-customized weapons suffer a **−5 attack penalty** due to claws. It remains **PC-prohibited**.

**Ammo Boost** installs a droid link (DC 20 Mechanics, 500 credits) **and** modifies the particular handheld blaster (DC 20 Mechanics, 100 credits), taking two hours total. A linked shot can consume **two power units instead of one** for **+1d6 on successful hit**—not free ammunition or permanent damage.

**Mercenary Rental Unit** requires DC 25 Use Computer and one day; optional locator DC 20 Mechanics. Rental conditions govern orders, owner return, and anti-tampering; no universal credit price inferred.

The Claw, Heavy Rifle, Missile, Nightmare and Zero-Range protocol actions are captured independently. **Two newly recorded unresolved contradictions**:

- `SGD-015-NIGHTMARE-ACTION-CONFLICT`: main Nightmare allows free-action intimidation with simultaneous melee attack once/encounter; protocol demands **two swift actions**.
- `SGD-015-ZERO-RANGE-ACTION-CONFLICT`: main Zero-Range grants immediate built-in rifle attack after successful grab/grapple without specifying extra cost/limit; protocol specifies **two swift actions once per encounter** for the grab-then-rifle sequence.

Neither interpretation is granted as executable. Weapon mount/grip identity and power consumption require the existing equipment and combat authorities.

## Quality gates and intentional nonclaims

The complete `data/canonical/droids/source-books/sgd.json` was checked after these commits:

- Custom JS recursive draft schema shape/type/enum/required/`$ref` review: **46/46 PASS**.
- Custom `fieldStates` explicit-null and empty-array semantics: **46/46 PASS**.
- Frozen SGD census / backlog identity, name, printed page: **46/46 PASS**.
- Printed attack groups remain `source-only`: **46/46 PASS**.
- First 15 variant-source records all have published PDF citation and source-only execution statuses; no unexpected promotion to strict certification.
- **Not run:** original Python `jsonschema.Draft202012Validator` against live remote ledger; repository-wide tests; Foundry V13 runtime; production weapons or published-vehicle integration.
- **No production `packs/`, scripts, Store, Garage, chargen, world actors or `main` merge changed.**

The M7 source-mechanics ledger updates were split into two commits: 011–013 then 014–015. The exact ledger was fetched again after each commit to confirm remote readback. All previously committed M5, M6 source entries and the concurrently authored **droid-component catalog** work were preserved.

## Forward path

With SGD 001–015 enriched, continue **SGD-DROID-016 through SGD-DROID-030** in similar batches, using printed paired pages, model-specific nonfactory variants, protocol action economy, physical installed vs carried weapons and PC/vehicle constraints.

**Separate higher-rigor source certification phase remains necessary:** link every printed class, feat, talent, skill parameter and attack alternative to canonical SWSE rules; independently prove mount ownership, live ammo/power resources and source contradictions before awarding `mechanicalStatus: certified`. The component catalog and Garage/chargen/Store migration is a separate delegated workstream; source records must never silently redefine its rules.

**Machine manifest:** `data/audits/droids/sgd-source-mechanics-sprint-011-015.json`  
**Prior checkpoint:** `docs/audits/droids/sgd-source-mechanics-deepening-006-010.md`
