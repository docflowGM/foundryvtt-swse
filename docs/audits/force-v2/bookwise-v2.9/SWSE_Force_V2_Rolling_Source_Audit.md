# SWSE Foundry v13 — Force System V2 Source Audit (Rolling, Offline)

**Status:** Working source-reconciliation and architecture document; **no GitHub changes**.  
**Revision:** 2026-11-17 - v1.3 (full clean-room architecture and Claude design handoff); fourteen book checkpoints, 212 counted new Force/Regimen/Maneuver/Unleashed definition claims: Core 28 + JATM Regimens 12 + SotG Maneuvers 27 + KOTOR 20 + TFU 31 + Clone Wars 19 + Galaxy at War 0 + Galaxy of Intrigue 0 + Legacy Era 18 + JATM other Force 57. Source/identity only; runtime not certified.  
**Books source-reviewed / source-section-screened:** All 14 uploaded printed SWSE core and supplements; item-by-item audits for the publications with new Force definitions, targeted TOC/text-section screens for zero-identity books, and cross-domain dependencies recorded separately. See JATM-N1, the final five-supplement screen, and the cross-book census.  
**Implementation comparison:** `docflowGM/foundryvtt-swse`, `main`, snapshot reviewed 2026-11-17.  
**Project direction (v1.3 supersedes earlier implementation proposals):** Wholesale clean-room REPLACEMENT of all Force-owned mechanics, catalogs, selection adapters, runtime and presentation, with a single V2 clean cutover. Shared ActorEngine, RollCore, FP/DP, damage, conditions, action economy, entitlement and vehicle sovereignty remain the boundary; no migration layers, shims, double-running authorities, or semantic-tag-driven mechanics. No GitHub implementation in this audit.

> **Reading rule:** `SOURCE` denotes an assertion checked against the relevant uploaded printed book PDF (with matching DJVU TXT as search aid); `PACK` is a direct reading of the GitHub production compendium; `RUNTIME` is a direct reading of named JS source; `PLAN` is proposed design, not established fact. A source-verified item is **not** automatically runtime-certified. Printed page numbers below are the numbers actually printed in the book. PDF page indices and the book's printed page numbers can differ; the printed page number is the source authority. For Core, a previously observed extraction/index offset requires special care. For Jedi Academy pp.24-37 the PDF index matched the printed page labels.

## 0. Operating contract and book sequence

1. Audit one sourcebook at a time, beginning with Core; certify identity, printed provenance, exact mechanical rule shape, readable summary, current pack identity, and divergence before proposing final schema.
2. Keep **publication identity** separate from **canonical ability identity**. Later reprints and enhancements may amend or expand a Core identity; do not blindly create another item.
3. Preserve external V2 sovereign boundaries: class and progression grants, feat identity and entitlement service, ActorEngine, Force Point coordinator, RollCore, action economy, defenses, condition track, damage packet, and V2 equipment readiness. The existing Force registry is REPLACED under the v1.3 clean-room decision; only its sound Form Powers share-suite design is retained. The audit does not authorize parallel mechanical authorities.
4. Preserve stable pack `_id` values unless an identity reconciliation explicitly authorizes a change. Do not use display names or semantic tags as execution discriminators.
5. Do not add hand-authored automation claims to content until the source, effect shape, target, timing, and transaction contract are certified.
6. Keep all work offline in this Markdown and its referenced design artifacts until Claude receives the approved handoff. **No implementation or repository commits in this phase.**

**Book checkpoint state:** The printed definition source census has reached all **14 uploaded principal books**, with **212 counted published claims**, **173/173 current Force compendium records source-compared**, **27 Maneuvers**, and **11 Force Unleashed overlays** separately inventoried. The additional five sourcebook screens were targeted **negative-definition scans**, not every-page mechanical certifications. Cross-book identity checkpoint 1, the new proposed strict v2 schema, runtime ownership matrix, 83-case acceptance suite and Claude master handoff are now attached or appended. **The schema is proposed and not yet user-approved; there are no executed Foundry runtime certifications.**

## 1. Core census and verified status

| Core domain | Printed Core entries | Matching production pack records | Missing Core records | Verified source pages | Pack metadata observations |
|---|---:|---:|---:|---|---|
| Force Powers | **16** | **16** | **0** | pp. 96–100 | 10 wrong printed page values, 2 missing page values, 4 correct; several rule-text / damage / targeting mismatches |
| Force Techniques | **7** | **7** | **0** | pp. 102–103 | All 7 use `sourcebook: "Core"`, `page: 0`, rather than book citation and printed page |
| Force Secrets | **5** | **5** | **0** | p. 103 | All 5 use `sourcebook: "Core"`, `page: 0`; choices are described in text but not uniformly typed as executable options |
| Force Regimens | **0** | N/A | N/A | Not in Core | Audit in Jedi Academy Training Manual |
| Starship Maneuvers | **0** | N/A | N/A | Not in Core | Audit in Starships of the Galaxy |

**Scope is 28 published item identities**, plus Core acquisition/recovery/descriptor rules and related feat/talent dependencies. The current pack has 65 Force Powers, 57 Techniques and 15 Secrets across *all* publications; those are **not** the Core counts. Pack `_id` below is the currently observed stable identifier, not a proposed replacement.

### Key pre-existing authority defect

`data/force/force-power-source-reconciliation.json` contains 12 `sourceVerified: true` Core power claims, **not all 16**. Its 12 prior claims cannot be adopted without reconciling the source *again*: several have printed-page offsets, and **Force Lightning's purported source-approved tiered damage is contradicted by the printed 8d6 rule**. The four Core power identities absent from that reconciliation file are **Dark Rage, Mind Trick, Negate Energy, Sever Force**. This rolling document replaces neither that existing file nor any runtime; it flags corrections for the eventual canonical clean cutover.

## 2. Core Force Powers — one record per printed power

Each short description below is a faithful **paraphrase** of the uploaded source, not a wholesale copy of published rules. Numeric DCs, durations, target constraints, action costs, and resource riders are retained because they control legality. `D` = published descriptor; `none` means no bracketed descriptor printed (telekinesis may still be a descriptive category).

### CORE-FP-01 — Battle Strike

- **SOURCE:** p. **96**; swift action; self; **D: none**. Use the Force DC 15 / 20 / 25 grants **+1 Force bonus on the next attack** and **+1d6 / +2d6 / +3d6** damage if it hits. A Force Point adds a further **+2d6** damage on the next attack. **Summary:** Empower the next attack with accuracy and check-tiered bonus damage.
- **PACK:** `_id: f177dc6d65f76de9`; `page: 94`; claims next *melee* attack gets +1d6 Force damage that bypasses DR. Missing printed tiers / +1 attack / FP rider; added unsupported melee-only, Force-damage, DR-bypass assertions.
- **RUNTIME:** `phase4-force-modifier-automation.js` implements next-attack intent but uses **wrong DC thresholds**: 10→1d6, 15→2d6, 20→3d6 (source: 15/20/25). Source-phase audit also has `page:97`. **Critical data + runtime correction.**
- **PLAN:** `checkTiers`, `nextQualifyingAttack` consumption, separate accuracy and bonus-damage packets, optional precommitted FP rider, correct failure and expiry; no name-based `Force Strike` alias.

### CORE-FP-02 — Dark Rage

- **SOURCE:** p. **96**; swift action; self; **D: Dark Side**. UtF DC 15 / 20 / 25 gives rage bonus **+2 / +4 / +6** to *melee attack and damage* until end of user's turn; while raging cannot use skills or patient/concentration activities. Spend FP to last through encounter. Dark-side descriptor has Core DSS/FP restriction rules.
- **PACK:** `_id: fp_darkrage` (preserve or deliberately reconcile); `page: null`; basic bonus tiers and FP extension present, but full activation and description need certified V2 fields.
- **RUNTIME:** Absent from the 12-claim reviewed Core reconciliation list; no per-power execution-certification established in this pass.
- **PLAN:** Typed `rageBonus` on melee attacks/damage, duration switch, permitted-actions constraint, dark-side consequence via single descriptor authority.

### CORE-FP-03 — Farseeing

- **SOURCE:** p. **96**; full-round action; one **known/met creature**, potentially remote; **D: none**. UtF versus target Will: on failure learn nothing, cannot try *that target* again for 24 h; on success learn limited current status/surroundings/activity/emotions; dead target uses Will 30. Optional FP for clear surrounding image.
- **PACK:** `_id: 0419ecb55f011f81`; `page:95`; broad remote-place observation, unlimited-range pseudo-camera, misleading concentration wording.
- **RUNTIME:** `phase3-force-power-corrections.js` provides an assisted information plan but explicitly does **not** enforce 24-h same-target lock. Older reconciliation claims `page:97` (printed 96).
- **PLAN:** `target.identity`, `targetKnown`, `targetWill`, info disclosure by GM, per-target failed-attempt timestamp. Never show unrestricted remote vision from a pack summary.

### CORE-FP-04 — Force Disarm

- **SOURCE:** p. **97**; standard action; one creature within six squares and line of sight; **D: none**. UtF **replaces the normal disarm attack roll**; normal disarm adjudication otherwise applies; can catch disarmed object with a free hand; feats improving disarm do **not** apply. FP declared **before roll** can damage the weapon for UtF result on a successful disarm.
- **PACK:** `_id: 18f33f87a1ebee74`; `page:96`; erroneously describes opposed Strength/Will check and simple drop. `descriptor:["Telekinetic"]` is *not* a printed bracketed descriptor.
- **RUNTIME:** Phase3 supplies an **assisted** attack-substitution record rather than full combat resolution; its `page:98` is offset from printed p97.
- **PLAN:** Route through canonical disarm/attack rules; explicit `freeHand`, targeted held item, FP pre-declaration, item-damage application. Separate descriptive `telekinetic` family tag from printed descriptor.

### CORE-FP-05 — Force Grip

- **SOURCE:** p. **97**; standard action; one target within six squares **or** line of sight; **D: none**. UtF DC 15/20/25 inflicts **2d6/4d6/6d6**; additionally, if UtF meets target Fortitude, target may take **only one swift action** on its next turn. Maintain each round using another standard action and **new UtF roll**. FP adds 2d6.
- **PACK:** `_id: b318fc3d5dadd9f3`; **page omitted**, no structured target/DC tiers; description only mentions choke/standard-action restriction. `Telekinetic` misfiled as formal descriptor.
- **RUNTIME:** `force-power-final-integration.js` returns assisted sustained-damage plan (no supported claim here that all actions/damage are automatically committed). Prior reconciliation `page:98` wrong.
- **PLAN:** Damage-tier and Fortitude/action-restriction outcomes separate, maintain-by-new-check transaction; no generic permanent immobilized flag.

### CORE-FP-06 — Force Lightning

- **SOURCE:** p. **97**; standard action; one visible target within six squares; **D: Dark Side**. ONE UtF roll versus **Reflex Defense**; hit: **8d6 Force damage** and target **−1 condition-track step**; miss: **half damage**, **no** CT movement. FP on successful hit adds another **−1 CT step**. This is **not** DC-tiered damage and is **not** electrical-type damage.
- **PACK:** `_id: 0a422b939edfad56`; `page:96`; invented DC 15/20/25/30 **2d6/4d6/6d6/8d6 lightning** progression and fictional stunned statuses.
- **RUNTIME:** `phase6-force-direct-damage.js` **also uses 2d6/4d6/6d6/8d6 tiers**, does not compare the check against the target's Reflex in `resolveForceLightning`, and unconditionally sends a `hit:true` damage packet upon qualifying tier. `data/force/force-power-source-reconciliation.json` incorrectly asserts its tiers were source-confirmed. **Highest-priority provenance correction.**
- **PLAN:** `defenseVsRoll(reflex)` → 8d6 Force packet with hit/full or miss/half; typed conditional track movement; dark-side consequence, FP rider; no invented stun.

### CORE-FP-07 — Force Slam

- **SOURCE:** p. **97**; standard action; **all targets within visible six-square cone**; **D: none**. ONE UtF check against **each** Fortitude; on hit **4d6 Force damage + prone**, on miss **half damage, not prone**. FP adds **2d6** damage against affected targets.
- **PACK:** `_id: 462a6c23e00c4dfc`; `page:97` correct; falsely describes a **single target** slammed into a surface, with no cone/Fortitude/half-on-miss model. `Telekinetic` is a contextual tag only.
- **RUNTIME:** `phase6-force-direct-damage.js` models cone/Fortitude and half miss; geometry/target-admission and damage packet need separate integration tests. Source-phase `page:98` is wrong.
- **PLAN:** Area geometry provided by scene validator, all targets evaluated independently with same roll; apply prone after successful target-resolution, immunity/mitigation via typed systems.

### CORE-FP-08 — Force Stun

- **SOURCE:** p. **98**; standard action; one target within six squares or line of sight; **D: none**. UtF vs Will; success moves target **−1 CT**, plus another **−1 per 5 points of success margin**; FP adds another −1 CT. This is *not* a timed `stunned` condition.
- **PACK:** `_id: a214d4f56b4abe11`; `page:97`; incorrectly describes Will save vs a one-round stun effect.
- **RUNTIME:** `force-power-final-integration.js` calls `buildForceStunPlan`/`applyForceStunPlan`, uses existing CT engine. Check whether class immunity, actor state and end-to-end mutation are guarded in the in-flight class PR stack. Source-phase `page:99` wrong.
- **PLAN:** Typed CT step outcome, exact success-margin formula, pre-commit FP option and immunity checks; no synthetic condition effect.

### CORE-FP-09 — Force Thrust

- **SOURCE:** p. **98**; standard action; one object/character within **12 squares** and line of sight; **D: none**. Opposed UtF versus target Strength check **with size modifier** and stability bonus; pushes **1 square + one extra per 5 points of margin**. Collision with larger object yields **1d6**, plus another **2d6** if FP option; FP also inflicts −5 on the resisting Strength check.
- **PACK:** `_id: d51bf85903366b6b`; `page:97`; invents six-square target range, automatic six-square push/knockdown and 2d6 damage, different collision scaling.
- **RUNTIME:** `force-power-final-integration.js` creates assisted movement/collision plan. Printed page in source-phase registry is 98 (matches actual p98); use `page:98` consistently here.
- **PLAN:** Opposed-check model with actor size/stability and scene collision validation, FP pre-choice and delayed damage packet; never silently teleport/push on wrong geometry.

### CORE-FP-10 — Mind Trick

- **SOURCE:** pp. **98–99** (entry begins p98); standard action; one **Intelligence 3+** creature, line of sight, within **12 squares**; **D: Mind-Affecting**. UtF vs Will allows **one of four** chosen modes: distraction that enables Stealth, feint that denies Dex to Reflex for next attack, reasonable suggestion, or fear-driven flight up to one minute (fear mode negated when target level ≥ user level; stops if wounded). FP can improve attitude when using *suggestion*, scaling with success margin.
- **PACK:** `_id: e6649f366d6c5737`; `page:98` correct; generic suggestion, erroneous six-square range, no four-mode resolution or Int threshold; exposes `Mind-Affecting` descriptor.
- **RUNTIME:** This power was **omitted** from the 12-item source-review registry. `force-executor.js` has Mind Trick-related handling, but complete mode/immune/FP correctness is **not certified** here.
- **PLAN:** Explicit four-mode picker and typed mode outcome (`fear` flag ONLY for fear mode), Mind-Affecting target preflight, range/Int guard and Will resolution. Integrate the Force Disciple Indomitable class feature without name matching.

### CORE-FP-11 — Move Object

- **SOURCE:** pp. **98–99** (begins p98); standard action; object/creature within **six squares OR line of sight**, move by up to six squares. **D: none.** UtF DC **15/20/25/30/35** permits Medium/Large/Huge/Gargantuan/Colossal mass, potential thrown-object/creature damage **2d6/4d6/6d6/8d6/10d6**; resisting creature uses Will Defense and second impacted target uses Reflex. Maintenance: standard action each round. Hovering/flying target may oppose with grapple. FP and DP expand size and damage under printed caps.
- **PACK:** `_id: 289013a32bd179ad`; `page:98` correct; erroneously lists 12-square range, substitutes unsupported **weight-based** tier and omits printed damage tiers/opposed modes. `Telekinetic` is not a printed descriptor.
- **RUNTIME:** Core final integration returns **assisted multi-mode** plan. Do not pretend forced movement, mass, target selection and damage are automated until tested.
- **PLAN:** Declarative modes (`lift/move`, `hurl`, `maintain`, `flying-target`), independent size and damage data, target1 Will/target2 Reflex, FP/DP branch, scene-assistance receipt.

### CORE-FP-12 — Negate Energy

- **SOURCE:** p. **99**; **reaction**, targets **one energy-weapon attack against the user**, requires user be aware/not flat-footed; **D: none**. UtF versus **damage of incoming attack**, negate completely if meets/exceeds; otherwise damage normally. After successful negation, FP permits healing up to damage prevented/full normal HP cap.
- **PACK:** `_id: be1ae263c498af3b`; `page:99` correct; invents **energy resistance 20** for user/ally on energy attacks. No source-based ER20 effect exists here.
- **RUNTIME:** `force-power-final-integration.js` has instant-reaction negation and separate optional healing; runtime side effects and out-of-order attacker/damage receipt require certification. Missing from the original 12-claim source registry.
- **PLAN:** Hook into pending incoming attack/damage event **before** application, commit negation transaction and optional FP healing; do not create lingering resistance ActiveEffect.

### CORE-FP-13 — Rebuke

- **SOURCE:** p. **100**; reaction; targets **one Force power directed at user**; **D: none**. UtF versus originating power's UtF: meet → negate; exceed by ≥5 → optionally reflect on creator. Re-reflection can affect both parties; optional FP in the specific twice-rebuked interaction prevents own harm.
- **PACK:** `_id: 390074b44aedfa2a`; `page:99`; incorrectly describes an offensive daze against a Force-sensitive creature.
- **RUNTIME:** Phase3 assisted reaction plan, no full proven event-driven reflection chain; source-phase page100 is correct.
- **PLAN:** Trigger on actual pending Force-power transaction, compare check receipts, bounce-count / causal ID, legal reaction & FP spends. No free-standing attack cast.

### CORE-FP-14 — Sever Force

- **SOURCE:** p. **100**; standard action; within 12 squares and line of sight; one Force-using target with **Dark Side Score ≥1**; **D: Light Side**. UtF must meet Will *and* DC 25/30/35. DC25 blocks spending FP for **hours equal to target DSS**; DC30 adds −1 CT whenever target uses Force power during window; DC35 raises to −2. FP doubles duration, or DP changes hours to **days equal to DSS**; DSS0 immune.
- **PACK:** `_id: b52769dd11b4e52c`; `page:99`; **wrongly asserts permanent loss of all Force abilities**, self-contradictory `special` claims a cruel Dark Side power awarding 3 DSS, and uses a saving throw model. This is dangerous player-facing misinformation.
- **RUNTIME:** Original 12-claim source-review file omitted this power. Automated activation/FP block, time expiry and CT riders **not certified**.
- **PLAN:** Typed conditional **Force Point spending gate** and per-power-use CT rider with DSS-locked duration; explicit Light Side descriptor and DSS0 exclusion. Must integrate resource authority, not add arbitrary `canUseForce=false` flag.

### CORE-FP-15 — Surge

- **SOURCE:** p. **100**; **swift action**, self; **D: none**. UtF DC **10/15/20** grants **+10/+20/+30 Force bonus to Jump** and **+2/+4/+6 squares speed** until **start of next turn**; FP adds +10 Jump and +2 speed.
- **PACK:** `_id: 1ac1084ca8f07114`; `page:99`; wrong **free-action extra move action** description.
- **RUNTIME:** Phase3 typed correction does represent Jump/speed tiers but uses generic `{type:'turns',value:1}` without proven exact start-of-next-turn expiration; older `force-power-effects-engine.js` includes a misleading `Surge` damage handler (installation precedence must be established). `source-phase page:100` is correct.
- **PLAN:** Source-owned action cost + relative-turn expiration, Jump speed integration, explicit FP modification; avoid old name handler.

### CORE-FP-16 — Vital Transfer

- **SOURCE:** p. **100**; standard action; **touch one other living creature**; **D: Light Side**. UtF DC **15/20/25** heals **2×/3×/4× target's character level HP**; user takes **half the HP healed** as damage, rounded down. FP prevents the self-damage. DP moves target **+5 steps on CT** in addition to healing normally.
- **PACK:** `_id: 00b65e47a4dd7d76`; `page:99`; fictional 2d6/4d6/6d6/8d6 healing and condition-removal tiers; omits cost to caster.
- **RUNTIME:** `phase5-force-healing-mitigation.js` and `force-power-outcome-service.js` do source-shaped healing/self-damage; runtime transaction safety and failure/refund conditions still require scenario tests. Original source-phase page100 correct.
- **PLAN:** Explicit target-level scaling, separate self-damage and heal receipts, prevent self-target, FP avoidance and DP CT add-on, all via ActorEngine + canonical damage/health systems.

### Power pack/page metadata reconciliation

| Source printed page | Powers | Current pack page errors |
|---|---|---|
| 96 | Battle Strike; Dark Rage; Farseeing | Battle Strike 94; Dark Rage missing; Farseeing 95 |
| 97 | Force Disarm; Force Grip; Force Lightning; Force Slam | Disarm 96; Grip missing; Lightning 96; Slam **correct 97** |
| 98 | Force Stun; Force Thrust; Mind Trick (start); Move Object (start) | Stun 97; Thrust 97; Mind Trick **correct 98**; Move Object **correct 98** |
| 99 | Negate Energy | Negate Energy **correct 99** |
| 100 | Rebuke; Sever Force; Surge; Vital Transfer | All four set to 99 |

*Source citations are authoritative printed pages; source claims may include additional continuation pages for Mind Trick and Move Object. Page locations were visually inspected against the mounted printed PDF; the OCR/TXT corpus alone was not used to establish them.*

## 3. Core Force Techniques — seven records

The following technique descriptions and specific semantics were verified against **printed pp. 102–103**. All seven GitHub pack records exist but have `sourcebook:'Core'`, `page:0` (not acceptable production provenance).

| Key / Source p. | Technique and current pack ID | Source-faithful description and typed rule | Structural finding / expected behavior |
|---|---|---|---|
| CORE-FT-01 / **102** | **Force Point Recovery** — `056ab39b3ab9df10` | At encounter end, regain **one FP spent during that encounter**; **explicitly repeatable**, each acquisition restores one more spent FP. | **Confirmed mismatch:** `ForcePlanBuilder` defaults `forceTechniques.allowDuplicates:false` and only exempts Force Power Mastery. An earned repeated Force Point Recovery acquisition risks being discarded. Need repeatable count plus grant provenance and encounter-spend cap. |
| CORE-FT-02 / **102** | **Force Power Mastery** — `07cea7e3e8b21d69` | Choose one specific known Force power; can **take 10 on its activation UtF** while distracted/threatened. Repeatable for a **different** chosen Force power each time. | V2 step has a scoped choice model; finalizer deliberately exempts chosen Mastery from no-duplicate rule. Keep and test identity by **canonical target power ID** and select-once-per-distinct-power. Lightsaber Form inclusion setting requires separate source/house-rule ruling. |
| CORE-FT-03 / **102** | **Improved Force Trance** — `93b96db5b560e14a` | While in Force trance, heal **2 × character level HP per hour**. | Passive modifier to **Use the Force skill application**, not a spendable Force Power or standalone force-trance spell. Hours/rest context must be authoritative. |
| CORE-FT-04 / **103** | **Improved Move Light Object** — `c406600924a7780e` | Use **move light object** UtF application as **swift** (normally move); firing it as a projectile becomes **move** (normally standard). | Affects two distinct action costs; target must be registered UtF *application*, not fake learned Force Power. |
| CORE-FT-05 / **103** | **Improved Sense Force** — `ad67b8f3959860f2` | Sense Force UtF application becomes **move action** (normally full-round). | Action override on typed UtF application, not acquired `force-power` Item. |
| CORE-FT-06 / **103** | **Improved Sense Surroundings** — `4955b5076ca5da89` | Sense Surroundings UtF application becomes **free action** (normally swift). | Action override on application. |
| CORE-FT-07 / **103** | **Improved Telepathy** — `53cfa2d1e4fe25ba` | On telepathy UtF application, **reroll and keep better**. | Trigger-scoped reroll on skill check, with actual second result and no unsourced global advantage. |

**Important distinction:** `Force Point Recovery` is an explicitly repeatable **technique**, not the similarly named Core **Force Recovery** talent. `Force Power Mastery` has a *choice instance*, and improving Sense Force / telepathy / trance concerns **UtF applications**, which are not interchangeable with Force Power suite cards. Avoid generating pseudo-powers simply because a technique names a skill application.

## 4. Core Force Secrets — five records

All five are on **printed p. 103** and present in `packs/forcesecrets.db`; every Core secret's book page is incorrectly `0` and source book is abbreviated `Core`. The printed secret rule says a secret costs either FP or DP (as specified), and ordinary per-round resource-spend restrictions remain in force. Source does **not** grant unlimited use or duplicate learned picks automatically.

| Key | Secret and current pack ID | Source-faithful description | Typed gating / implementation contract |
|---|---|---|---|
| CORE-FS-01 | **Devastating Power** — `996848a2e0c0ac4f` | On an eligible Force power that **deals damage**: FP increases number of damage dice by **50%**, or DP **doubles** damage dice. | Validate power actually has damage dice; alter dice count **before** canonical packet resolution, no doubling flat bonuses. Define integer rounding by published general rules or mark unresolved. |
| CORE-FS-02 | **Distant Power** — `43f9645eabce838e` | For a Force power with **numeric range**, FP **×10 range**; DP gives anywhere within the **same star system**, **without lifting line of sight**. | Requires typed `range.kind`; explicit LOS check always retained. |
| CORE-FS-03 | **Multitarget Power** — `af908ace9a361603` | FP adds **one additional target** to a single-target Force power; DP permits **one target per four character levels**. | Determine eligible target count at activation, not area-effect fallback; track each independent defense result. Source does not specify rounding here: use general game rounding authority, not assumptions. |
| CORE-FS-04 | **Quicken Power** — `52bf7b9a1a41de2b` | For a Force power normally activated with **standard or move action**, FP changes to **swift**, or DP to **reaction**. | Source-action guard before modifying action economy; preserve legal reaction timing and resource receipt. |
| CORE-FS-05 | **Shaped Power** — `d687b624feb2d351` | For **cone** Force power, FP changes to **1-square-wide line** of length **5× cone length**; DP allows chosen targets within cone-length squares of caster. | Typed cone geometry and target selectors; do not apply to non-cone power or bypass visibility/target eligibility. |

**Potential UX/progression contract conflict:** `force-secret-step.js` shows a **"Choose This Secret Again"** action and maintains per-secret counts, while `ForcePlanBuilder` configures `forceSecrets.allowDuplicates:false`. The *Core* text does not explicitly authorize repeat-acquiring every secret; settle canonical repeatability **per publication/rules** and make picker, budget and finalizer agree rather than adding a blanket duplicate allowance. This is a verified **source-code disagreement**, not proof that duplicate secrets should be legal.

## 5. Core Force suite and acquisition mechanics (not item definitions)

| Source | Canonical Core rule / obligation | System owner and test |
|---|---|---|
| **p. 85** | **Force Sensitivity:** non-droid prerequisite; enables UtF and access to qualifying Force talents; being Force-sensitive alone does not hand the character a Force Power suite. | Feat authority + class skills and UtF validation. Do not grant powers directly through tags. |
| **p. 85, p.95** | **Force Training:** requires Force Sensitivity **and trained UtF**; initial grant is **1 + Wisdom modifier (min 1)**; duplicate Force Power selections are legal; a permanent Wisdom modifier increase adds **one known power for each Force Training acquisition**. | Existing `FeatGrantEntitlementResolver` → V2 Force Power step → ForcePlanBuilder. Preserve ordered per-feat acquisition count and pending-feat instances. |
| **p. 85 editorial note** | The printed Force Training **Special** repeats acquisition wording as "equal to your Wisdom modifier" while **Benefit**, p95 explanation, minimum and examples support the normal **1 + Wis (min 1)** formula. | Record exact intra-book ambiguity; do not silently change resolver. Check official errata and printed examples when building final canonical claim. |
| **pp. 95–96** | Each power use **discards** that occurrence from active suite even when UtF fails. Same power can appear multiple times. After combat and **one-minute rest**, recover all spent powers; a **natural 20 on UtF** recovers all spent powers **at end of user's turn**; reaction FP spend can regain one spent power. | One suite lifecycle owner and deterministic receipts; do not grant at combat deletion or double-trigger 20s. |
| **p. 96** | `[dark side]` power raises Dark Side Score by **one**, and FP cannot modify UtF activation of a Dark Side power. `[light side]` power cannot have its UtF modified by FP if user's DSS ≥1. `[mind-affecting]` cannot affect mindless/immune targets. | Typed, *source-certified* descriptor field. Use dedicated DSS, resource and immunity services. Never infer official descriptors from semantic tags or names. |
| **p. 85** | **Force Boon:** extra **3 Force Points at each level**, not a Force Training pick. | FP-pool authority only; never interpret as three power cards. |
| **p. 101** | **Telekinetic Power:** on natural 20 for specified Force powers, may immediately use it again as free action. **Telekinetic Savant:** conditional swift action returns one specified TK power to suite without FP, with repeatable talent count. | Talents remain separate authorities. Wire suite events from canonical talent grants; do not write extra power definitions. |
| **p. 101** | **Force Focus:** full-round DC15 UtF to recover one spent Force Power. **Swift Power:** once/day action reduction on eligible Force power (dark-side tree prerequisite). | Typed talent-granted recovery/action hooks; do not conflate with Force Point Recovery technique or Quicken Power secret. |
| **p. 102** | **Visions** talent modifies *Farseeing* to inspect past/future at FP cost and swift action; requires Force Perception + Farseeing. | Source feat/talent authority grants optional mode; do not hardcode into base Farseeing definition. |
| **pp. 102–103** | Technique/secret picks are granted by *classes* at their defined levels; selecting one is irrevocable under ordinary advancement. Secret cost uses FP/DP per general resource limits. | Existing canonical `packs/classes.db` progression features and entitlement manifest. Do not compute extra picks inside ability executor. |

### Descriptor audit

**Official bracketed Core descriptors:** Dark Rage = Dark Side; Force Lightning = Dark Side; Mind Trick = Mind-Affecting; Sever Force = Light Side; Vital Transfer = Light Side. Other 11 Core powers have **no printed bracketed descriptor**. Descriptive effect family (`telekinetic`, `movement`, `fear`, `healing`) may be stored independently, but is **not** an official descriptor. `Mind Trick` is Mind-Affecting as a whole; its *fear* outcome is specifically the fourth mode. This separation is essential for Force Disciple Indomitable and Jedi/Sith Fearless.

## 6. Source-to-production reconciliation: confirmed discrepancies and boundaries

### Source-certification corrections (must fix **before** schema approval)

- **P0-A — Force Lightning**: Printed Core p97 **8d6 vs Reflex with half miss/−1 CT hit** conflicts with **both** its `dcChart` and `PHASE6_FORCE_DAMAGE_RULES` tiered formula. Also the old audit wrongly marks those tiers source-verified. Fix original source claim first; all later runtime designs must consume it.
- **P0-B — Sever Force**: Pack says permanent Force removal and Dark Side/DSS gain, directly contradicting printed time-limited **Light Side** suppression of FP spending against a DSS≥1 target. Do not display current description as RAW.
- **P0-C — Rebuke / Negate Energy**: Pack contains **different powers** (offensive daze / ally ER20) instead of printed reactive negation. These demand incoming-event contracts, not ordinary cast paths.
- **P0-D — Suite semantics**: Power usage/discard, out-of-combat **one-minute** rest, natural-20 **end-turn** recovery, FP reaction recovery, and repeat instances are shared rules with no per-power copy.
- **P0-E — Force Point Recovery repeat**: Source explicitly permits repeat selections, but finalizer's generic Force Technique dedupe does not. This is a source-proven progression contract conflict.
- **P1-A — Battle Strike**: Compendium wrong +1 attack/tiers; phase4 typed next-attack service has **wrong DC cutoffs**. Correct both, and verify the bonus attack rolls can be non-melee if printed text imposes no restriction.
- **P1-B — Force Slam/Force Grip/Stun/Thrust/Move Object**: Keep already-correct assisted/planned runtime portions but align source targeting, defenses, movement, damage, and timing. Never assume runtime patches automatically certify the pack.
- **P1-C — Metadata**: In 16 Core power records, **10 printed pages wrong and 2 missing**, leaving 4 correct. All 12 Core Technique/Secret records are `page:0` with abbreviated book title. Prior reconciliation has shifted printed pages on some powers.
- **P1-D — Mind Trick**: Int3+, 12 squares, four modes, per-mode fear eligibility, FP suggestion rider absent from pack. Standard Mind-Affecting immunity on all modes.
- **P1-E — Force Point / Destiny Point semantics**: Spend once through central authority. Preflight printed eligibility and descriptors before committing resources; receipt-based class features (especially Temptation) must never respond to rolled-back spends.

### Existing code worth **preserving**, not rewriting blindly

- `scripts/engine/force/force-power-final-integration.js` installs phases 3/4/5/6 via `scripts/infrastructure/hooks/force-power-hooks.js`; classifies Force Stun as CT and Thrust/Grip/Move Object as assisted. **Installation is statically referenced, not runtime smoke-tested here.**
- `scripts/engine/force/phase3-force-power-corrections.js` contains corrected Surge, Rebuke, Disarm and Farseeing resolution plans. It is **not** the source-of-truth data for final V2 once canonical records exist.
- `scripts/engine/force/phase5-force-healing-mitigation.js` and `force-power-outcome-service.js` implement structured Vital Transfer; keep useful validated operations and reconcile transaction boundaries.
- `scripts/engine/force/phase6-force-direct-damage.js` contains a usable Force Slam area-vs-Fortitude pattern, but the Lightning path is provably source-wrong.
- `scripts/apps/progression-framework/steps/force-technique-step.js` already supports chosen power identity for Force Power Mastery; test per-choice persistence rather than replacing the picker.
- `scripts/apps/progression-framework/shell/mutation/force-plan-builder.js` already writes acquisition/progression flags and session markers. Extend them with **canonical source/acquisition instance** if needed; keep duplicate rules per-ability, not per-domain blanket behavior.
- Class Force PRs #1134 (6U), #1149 (6V), #1150 (6W) are **open stacked drafts** at last verified checkpoint and touch immunity, Force Point receipts / Temptation serialization. Do not alter/cherry-pick their files without rechecking merge/base state and planning ownership.

## 7. Provisional schema after the Core source census (not implementation instructions)

**Do not finalize until all sourcebooks are reviewed.** The Core rules already demand distinguishing item definitions, owned learn instances, activation receipts, sustained effects and progression entitlements.

```text
CanonicalAbilityDefinition
  canonicalId              # stable identity across books/reprints, never display-name key
  kind                     # force-power | lightsaber-form-power | force-technique | force-secret | force-regimen | starship-maneuver
  displayName
  originClaim              # bookId, printedPage, entryHeading, sourceVerified, reviewEvidence
  publicationClaims[]      # reprints, errata, explicitly reconciled changes; no silent overwrites
  rawDescription           # exact approved rules text / licensed source transcription when supplied
  playerSummary            # independently written short source-faithful summary
  printedDescriptors[]     # ONLY published descriptors; do not infer from taxonomy
  searchTags[]             # suggestions/navigation, never mechanic authority
  prerequisites            # typed predicates with explicit owning authority
  activation               # timing, eligibility, reaction event, target selection, action cost
  check                    # skill, DC tier / opposed defense / contest / substituted attack
  targeting                # creature/object/attack, range, LOS, cone/line, max targets, eligibility
  outcomes[]               # typed effect variants, hit/miss margin, damage, CT, movement, healing
  resourceOptions[]        # FP or DP alternatives, choice timing, typed receipts and restrictions
  duration                 # instantaneous / until-start-next-turn / through-encounter / sustained, clock owner
  repeatability            # source rule, max repeats, choice-scoped uniqueness
  integrationContracts[]   # spell, attack, condition, damage, Force point, action, GM adjudication
  certification            # source | data | progression | runtime | Foundry13 independent statuses

OwnedAbilityAcquisition
  canonicalId              # points to definition
  sourcePackId             # stable existing pack _id where appropriate
  acquisitionInstanceId    # feat/class-grant/level-up/GM grant receipt, unique
  grantProvenance          # feat instance, class level, selection event, session ID
  choiceBindings          # e.g. Force Power Mastery -> canonical force-power ID
  knownIndex              # duplicates preserved as distinct learned-use instances where permitted

ForceAbilityActivationReceipt
  actorId; canonicalId; learnedInstanceId; sourceDefinitionVersion
  actionReceipt; checkReceipt; targetsAndTargetChecks
  resourceSpendReceipts; sourceDescriptorConsequences
  plannedOutcomes; committedOutcomes; refundOrFailureState
  activationEventId; combatId; turnId; sequenceId

ForceSuiteState
  learnedInstances[]        # same power can be known several times
  spentInstances[]          # spent on use regardless of check success
  recoveries[]              # one-minute rest, nat20 end-turn, FP reaction, feat/talent triggers
  ongoingEffects[]          # independent lifetime, subject to source-specific effect rules
```

**Schema decisions still open:** Whether catalog definitions live in compendium Item `system.resolution` vs a generated sidecar (prefer one compiled canonical runtime authority), cross-book same-name variants and errata precedence, reaction prompts in Foundry v13, source-text transcription license/layout, built-in damage packet version, and application of GM-assisted outcomes. A proposed shape is **not** a second parallel database.

### Per-kind ownership contract

| Kind | Core example | Learning / selection owner | Runtime effect owner | Important limit |
|---|---|---|---|---|
| Power | Force Lightning | Force Training feat entitlement + Force Power step | UtF/Force executor and canonical combat/effects services | Multiple learned instances possible; one use discards one instance |
| Form power | None in Core | Same learning rules only when source grants eligible form power | Force executor **plus** equipment/lightsaber readiness where required | Do not invent Core form entries |
| Technique | Force Power Mastery | Prestige class `force_technique_choice` + technique step | Typed modification of eligible power/skill/resource events | Repeatability **per technique**, chosen target binding |
| Secret | Quicken Power | Prestige class `force_secret_choice` + secret step | Optional power activation modifier with FP/DP receipt | Must preflight eligible power/action |
| Regimen | None in Core | Force Regimen Mastery feat + regimen step | Regimen 24-hour lifecycle (Jedi Academy source next) | Not Force Power suite; do not infer Core timings |
| Maneuver | None in Core | Starship Tactics feat + maneuver step | Crew/vehicle maneuver owner (SotG source later) | Not Force Power execution, independent recovery clock |

## 8. Core regression acceptance ledger (draft)

**Rules/provenance:**

- [ ] `core-force-census`: exactly 16/7/5 matching stable IDs; each has source **printed** page, book identity, source review and player summary.
- [ ] `core-source-vs-pack`: validate every Tier/DC/damage/action/target/descriptor against **source claims**, not current pack `dcChart`.
- [ ] `core-pages`: p96 Battle/Dark Rage/Farseeing; p97 Disarm/Grip/Lightning/Slam; p98 Stun/Thrust/Mind Trick/Move Object; p99 Negate; p100 Rebuke/Sever/Surge/Vital; p102–103 techniques; p103 secrets.
- [ ] `core-no-false-descriptor`: telekinetic *search family* does not become printed descriptor; only source bracketed descriptors influence DSS/immunity.
- [ ] `core-lightning`: source 8d6 vs Reflex, half on miss, −1 CT hit only, extra −1 with FP, Dark Side point applied through typed authority. **Fails current source pack AND phase6 code.**
- [ ] `core-sever`: DSS0 immune; DSS≥1 eligibility, Will plus DC tiers, FP spend blocked for correct duration, CT on future power-use, FP/DP duration alternatives; never permanent disable.
- [ ] `core-negate`: reaction targets one energy attack against self, aware/not-flat-footed, check versus pending damage, no ER20/ally-target assertion, FP healing capped.
- [ ] `core-rebuke`: reactive Force power intercept, exact check comparison, reflect margin5, re-rebuke and optional FP double-rebound rule.
- [ ] `core-battle-strike`: DC15/20/25 grants +1 attack and correct 1/2/3d6; optional FP+2d6; next attack only; no fabricated melee-only/DR bypass.
- [ ] `core-dark-rage`: DC15/20/25, +2/4/6 melee, skills/concentration constraint, encounter extension and one DSS typed award.
- [ ] `core-farseeing`: known creature / dead target Will30 / failed target 24h block / FP image, no remote camera.
- [ ] `core-disarm`: canonical disarm attack substitution, no Improved Disarm bonus, optional free-hand catch, FP predeclared weapon damage.
- [ ] `core-grip`: damage tier and Fortitude action restriction independent, maintain new standard action + new check, FP+2d6.
- [ ] `core-slam`: visible cone, one roll vs each Fort, miss half but not prone, FP+2d6 and multi-target no duplicate mutation.
- [ ] `core-stun`: Will & margin-based CT −1 per 5, FP +1, not a generic stunned status; immunity preflight.
- [ ] `core-thrust`: 12-square target, Strength/size/stability contest, legal movement, only collision damage, FP option.
- [ ] `core-mind-trick`: Int≥3, 12 squares/LOS, four distinct modes, target level cancels fear mode, FP suggestion modifier, typed mind/fear immunity.
- [ ] `core-move-object`: DC sizes and dice, 6-square-or-LOS eligibility, target resistance, flying target grapple, second target Reflex, sustained cost, FP/DP alternate.
- [ ] `core-surge`: swift, tiered Jump+speed, until **start** next turn, FP increase, no bonus move action.
- [ ] `core-vital-transfer`: target-level 2/3/4× HP, caster half-heal damage, FP avoid cost, DP +5 CT, other living creature only; no invented dice/condition cures.

**Selection, duplicate and cross-system events:**

- [ ] Force Training acquired twice in same progression session retains **two feat acquisition instances** and corresponding learned power slots even if display names identical.
- [ ] Permanent Wisdom modifier increase grants +1 power **per Force Training acquisition**; temporary buffs do not persistently grant items. Explicit settings/house rules do not spill into Regimens or Starship Tactics.
- [ ] Power duplicate learn creates distinct spent-use instances; one activation discards precisely one; source recovery events restore exactly appropriate uses.
- [ ] Natural 20 UtF recovery occurs **end of turn**, not immediate; one-minute post-combat recovery requires legal rest, not merely deleting a Combat document.
- [ ] Force Point Recovery technique selected twice: both legal learned acquisitions committed with stable grant provenance, end-of-encounter receipt restores up to two **actually spent in that encounter**; no fabricated pool gains.
- [ ] Force Power Mastery twice with distinct bound power IDs commits two legal records; same bound target cannot be chosen twice; take10 applied only to chosen activation, including proper eligibility when distracted.
- [ ] Improved Move Light Object, Sense Force, Sense Surroundings, Trance, Telepathy affect **named UtF applications**, without creating fake Power cards or modifying unrelated checks.
- [ ] Five Core secrets modify only eligible power activation with **one central FP/DP spend receipt**, legal action and scene target semantics; no silent stacking of skipped choices.
- [ ] Class PR #1134 immunity, #1149 Turn Order, #1150 Temptation receipt serialization remain intact; refunded/failed spends never trigger class Temptation.
- [ ] Every assisted execution returns an explicit unresolved plan/decision and does not report mechanical effects committed when scene or GM validation is pending.
- [ ] Rendered Foundry v13 character/ship actions and sheet cards reflect **canonical description + short summary**, not obsolete pack wording.

**Status of checklist:** These are **acceptance requirements**, not executed green tests. No local repository or Foundry test runtime is available in this session, and no tests were run.

## 9. Next book handoff, without implementation

**Next publication: Jedi Academy Training Manual**. Inspect all 12 current regimen pack records and source pages, time to perform, participants, UtF thresholds, tier-exclusive effects, duration, target changes, one-benefit-in-24h rule, failed-regimen lock, feat learning/extra Wisdom grants, talent `Regimen Aptitude`/related names, casting vs performance distinctions, and existing V2 regimen actor state. The correct 12-item list and pack IDs must be source-verified independently; the fact that 12 records exist does not prove that the book's 12 are the correct 12. The provisional Core schema should only be frozen once Regimens + SotG Maneuvers expose all clock and ownership variants.

## 10. GitHub evidence index (read-only)

- `https://github.com/docflowGM/foundryvtt-swse/blob/main/packs/forcepowers.db` — current Core records (16 of 65 total).
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/packs/forcetechniques.db` — current Core records (7 of 57).
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/packs/forcesecrets.db` — current Core records (5 of 15).
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/data/force/force-power-source-reconciliation.json` — prior 12 source-verified claims (some incorrect).
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/force/phase6-force-direct-damage.js` — incorrect Force Lightning tiers and hit path.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/force/phase4-force-modifier-automation.js` — incorrect Battle Strike threshold mapping.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/force/phase3-force-power-corrections.js` — assisted Farseeing/Rebuke/Disarm and Surge source-shaped correction.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/force/phase5-force-healing-mitigation.js` — Vital Transfer healing integration.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/force/force-power-final-integration.js` — final wrapper and assisted outcome plans.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/apps/progression-framework/shell/mutation/force-plan-builder.js` — Force-domain duplicate policy and grant flags.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/apps/progression-framework/steps/force-technique-step.js` — repeatable selection / Force Power Mastery scope.
- `https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/apps/progression-framework/steps/force-secret-step.js` — secret picker counts and contradictory repeat label.
- **Private source:** uploaded `Star Wars Saga Edition.pdf`, inspected printed pages 85, 95–100, 101–103; searchable aid `Core Rulebook_djvu.txt` (OCR fallible, especially multi-column fragments). Do not publish these book scans into GitHub.

---

**Rolling audit control:** Next edits should **append** a dated book section or make visible versioned corrections to an existing section, updating counts and unresolved rulings. Do **not** convert unreviewed fields to `sourceVerified`, `runtimeReady`, or `legal` automatically. This document is a design / provenance audit, not a repository patch or implementation plan Claude may run blindly.

---

# BOOK 2 — Jedi Academy Training Manual: Force Regimens

**Added:** 2026-11-17, source pass v0.3.  
**Publication:** *Jedi Academy Training Manual* (2009); printed **pp. 10–14** (regimen chapter), **p. 23** (Force Regimen Mastery feat).  
**Source inspection:** PDF pages 11–15 show the actual printed pp. 10–14; searchable TXT was a locating aid.  
**Scope:** The complete Force Regimen catalog: **12 of 12** verified against the book and matched by name to **12 of 12** existing records in `data/force-regimens.json` and `packs/forceregimens.db`. All twelve have stable existing pack IDs; no new regimen identities are necessary. No runtime certification is implied.

## JATM-1. Global RAW regimen contract

**Source, printed p. 10:** A regimen is a training ritual performed during downtime, **not** a conventional Force Power. Benefits last **24 hours** and **only one regimen's benefits** may be active in that time. Repeating performances for story purposes is permitted but does not create additional benefits. If a regimen is **failed**, its benefits cannot be obtained for 24 hours, though a **different known regimen** may still be attempted. A known regimen can be attempted when the character has the required spare time; there is no mandatory morning or rest trigger.

**Source, printed p. 23:** **Force Regimen Mastery** feat requires Force Sensitivity and trained Use the Force. Each acquisition learns **max(1, 1 + permanent Wisdom modifier)** regimens. The feat is repeatable. A permanent **increase in Wisdom modifier** immediately grants **one additional regimen per acquisition** of the feat. This is **not** the configurable Force Training ability score and must be an independent entitlement.

**Source, Jedi Academy Jedi talents:** **Regimen Aptitude** (the printed name) grants a **+5 Force bonus** on skill checks to perform a Force regimen, prerequisite Force Regimen Mastery. Do not silently treat a database talent named **Regimen Mastery** as the same canonical identity until the existing talent-identity audit adjudication is read. No bonuses to ordinary Use the Force power activation are implied.

### Four independent regimen state clocks

1. **Learned**: permanent legal acquisition via repeatable feat; selecting the *same regimen twice* is not explicitly a second distinct benefit under these Core regimen rules. Confirm duplicate-selection policy from source and feat entitlement, not from the UI's button text.
2. **Performance**: preparation requirements satisfied, elapsed **1–3 hours**, UtF roll recorded; `performing` is not `active benefit`. Time passes before benefit is earned and may require GM time adjudication.
3. **Failed specific regimen**: failure ledger `{regimenId, failedAt, unlockAt=failedAt+24h}`; only the same regimen is blocked from *benefit* during window; other known regimens remain eligible. An implementation may permit narrative performance but must not grant prohibited benefits.
4. **Benefit window**: once the first valid regimen benefit takes effect, ledger `{beneficiary/performer, sourceRegimen, benefitStartedAt, expiresAt=+24h, chosenTier}`. Ending the visualization or a temporary effect early **must not reset the eligibility window**. A long rest does not override 24h expiry unless the printed rule permits it (it does not).

**Source interpretation note:** The phrase *first one performed* occurs alongside an explicit permission to try a different regimen after failure. The safe implementation model is to consume the *one active benefit entitlement* only on the first **successful benefit**. Preserve this as a reviewed interpretation, and require an owner adjudication if literal chronology is disputed. Do not let any alternative interpretation reset the 24-hour timer after an early manual end.

## JATM-2. Per-regimen source ledger and production IDs

`Pack status` for all 12: they are present and have structured `dcTiers`, target, requirements, time and summary. **All 12 lack a printed-page `system.page` field**, and all still carry `automation.status:'metadata_only_until_regimen_activation_ui_exists'` even though a subsequent runtime executor exists; this metadata is outdated and cannot certify execution. Each `dcTiers[].structuredBenefits` is a candidate tier-specific source representation; the top-level `structuredBenefits` array is a **flattened concatenation of all tiers** and must **never** be applied as a single grant.

| Key / printed p. | Regimen (existing pack `_id`) | Performance time / target / prerequisites | Source-verified result, tier by tier | Typed effect contract and cautions |
|---|---|---|---|---|
| **JATM-FR-01 / 10** | **Awaken Force Sensitivity** `cde43e7157df476d` | **1h**; willing ally **without** Force Sensitivity; participant meditation | DC **13** performer gains Gauge Force Potential talent benefit if not already known; **18** adds 24h *untrained* UtF access for ally as if Force Sensitive; **23** gives ally +1 Force bonus to UtF; **28** gives ally +2 instead of +1. | **Split target:** performer's temporary *talent effect* and ally's temporary *skill eligibility*, NOT a permanent Feat grant. Do not add Force Training powers, trained UtF, or grant eligibility to unwilling/already-sensitive target. `DC28` does not stack +1 and +2. |
| **JATM-FR-02 / 10–11** | **Eyes of the Force** `bdba46ed4636d50a` | **1h**; self; image display **and assistant** | DC **13** +1 Force bonus on UtF **Telepathy application**; **18** +2; **23** +2 and GM-mediated information on target's surface emotions/stray thoughts after successful Telepathy versus **unwilling** target. | Not +1/+2 to all UtF. No automatic telepathy mind-read without a successful interaction; discretionary info uses GM assistance. |
| **JATM-FR-03 / 11** | **Oxygen Bottle** `686327b2225da2ca` | **1h**; self; glass bottle **with vac-seal stopper** | DC **26** +2 Force bonus to **Fortitude** against *inhaled poisons and non-corrosive atmospheric hazards*; **32** +5 same; **38** immunity to exactly those hazards. | Tier-exclusive scoped modifier OR scoped immunity. No global poison immunity, corrosion protection, atmospheric immunity or addition of +2/+5. |
| **JATM-FR-04 / 11** | **Quiet the Mind** `38f6154fe8cdc96f` | **1h**; self; meditative practice | DC **13** adds **one Farseeing use to suite**, **cannot be recovered by any means** once used; **18** adds one Farseeing use normally; **23** adds one Farseeing use and temporary **Visions talent benefit** if not already known. | `temporaryPowerUse` must carry **non-recoverable at low tier** flag; high tier grants benefit of a talent, not permanent learned Talent Item. Cross-link to canonical Core Farseeing power and Visions talent by ID. |
| **JATM-FR-05 / 11** | **Telekinetic Practice** `041c4d81adcb7519` | **1h**; self; deep bowl and polished stone orb | DC **18** **1 restricted temporary FP** used on UtF to activate a `[telekinetic]` power; **23** **2** same; **28** **2** with additional option to reroll such an activation check, **must take second result even if worse**. | FP tokens require **source-restricted spend routing** and expire; no contribution to permanent FP pool. This text explicitly refers to `[telekinetic]` descriptor—cross-book descriptor provenance must be reconciled; Core printed entries do not themselves show that bracketed descriptor. |
| **JATM-FR-06 / 11–12** | **Sparring Practice** `a3ea7a0f9fc5bde5` | **2h**; self; lightsaber/training lightsaber **and sparring partner** | DC **18** can FP-boost UtF **Block** talent activation without consuming usual *one FP/round* allowance; **23** adds **1 temporary FP** usable only on Block; **28** adds **2** Block-only temporary FP. | Explicit per-round FP-cap exception only for the named Block context; do not grant Block talent or general FP unlimited. Equipment/partner preparation required. |
| **JATM-FR-07 / 12** | **Training Remote** `423d14082ad3e307` | **1h**; self; lightsaber, **training remote**, blast-shield helmet | DC **18** can FP-boost UtF **Deflect** talent activation outside one-FP-per-round cap; **23** adds **1 Deflect-only temp FP**; **28** adds **2**. | Identical shape to Sparring with **Deflect**, not Block; item-specific preparation and separate restricted FP tokens. |
| **JATM-FR-08 / 12** | **Vo'ren's First Cadence** `6157c6dc7eacc7a6` | **1h**; self; lightsaber, **19 wax cylinders, 190 ball bearings** | UtF check suffers **penalty equal to Dark Side Score**. DC **13** +1 Force bonus **Will Defense**; **18** +2; **23** +2 and temporary **Severing Strike** talent benefit if not already known. | Apply DSS penalty **to performance check** (not all attacks). Typed Will Defense bonus with 24h expiry. Temporary talent entitlement must not create permanent owned talent. |
| **JATM-FR-09 / 12–13** | **Vo'ren's Second Cadence** `dd67e37a0d053863` | **2h**; self; lightsaber, **72 wax cylinders, 2,701 ball bearings** | UtF −DSS. DC **18** +1 Force bonus on **lightsaber attack vs flanking creatures**; **23** +2; **28** +2 and temporary **Whirlwind Attack** feat benefit if not already known. | Attack bonus only while actually flanked by attack target's team/creature context; source feat benefit (not permanent feat ownership); no unconditional lightsaber attack bonus. |
| **JATM-FR-10 / 13** | **Vo'ren's Third Cadence** `c151071d0bb89220` | **3h**; self; lightsaber, **180 wax cylinders, 16,290 ball bearings** | UtF −DSS. DC **23** +1 Force bonus on **Redirect Shot ranged attack rolls**; **28** +2; **33** +2 plus FP can modify **Block/Deflect UtF checks on other turns** and those spends do **not** count toward normal FP-per-round limit. | Must distinguish Redirect Shot as ranged attack vs Block/Deflect UtF modifiers; check off-turn reaction receipts, do not grant global out-of-turn FP spending. |
| **JATM-FR-11 / 13** | **Vo'ren's Fourth Cadence** `de0e704bb5da65b3` | **3h**; self; lightsaber and **360 wax cylinders** | UtF −DSS. DC **26** +1 Force bonus on UtF to **maintain a Force power after taking damage**; **32** +2; **38** +2 and may spend FP as **reaction** to **avoid a new maintenance UtF check** when damaged. | Scope is *damage-triggered maintenance*, not initial activation or unrelated concentration. The high-tier bypass is reaction + FP; wire to actual maintenance interruption before its check. |
| **JATM-FR-12 / 13–14** | **Vo'ren's Fifth Cadence** `10814108c41a823f` | **3h**; self; lightsaber, wielded telekinetically **without touching** | UtF −DSS. DC **31** +1 bonus on UtF **Move Light Object application**; **37** +2; **43** +2 plus one temporary **Kinetic Combat** Force Power suite use and FP reroll of `[telekinetic]` power activation UtF **keeping better**. | Printed bonus wording lacks explicit *Force* type; do **not** invent type without checking contextual/errata authority. `Kinetic Combat` cross-source reference is *Knights of the Old Republic Campaign Guide* **p. 51**; link its canonical power instead of copying a new record. Reroll differs from Telekinetic Practice (better vs second-even-worse). |

**Data parity finding:** Names, twelve stable pack IDs, performance times, target categories, most material requirements and all tier-threshold bands agree with the printed source. The **data descriptions** are substantially better source-aligned than the Core power pack's old descriptions. Their **automation claim is not current**, and several effects cannot work merely as metadata.

### Specific mechanical cases that cannot be flattened

- **Awaken**: one regimen splits **caster and ally benefits**. A self-only active effect is insufficient; the ally's transient permission to use UtF must be typed and removed after 24 hours. A temporary *as if possessing Force Sensitivity* permission must not bypass permanent feat-training prerequisites elsewhere.
- **Quiet the Mind**: first tier creates a **nonrecoverable** Force Power use, second and third create a normally recoverable use. This is a suite-instance property, not just extra text.
- **Telekinetic Practice / Sparring / Training Remote**: temporary restricted Force Points and exemptions need **one** central resource ledger. Do not increment general `forcePoints.max` or let these tokens trigger unrelated abilities. Track whether optional FP has been *actually spent* and whether Temptation can trigger only when applicable under printed source and real receipt.
- **Cadences 1–5**: all impose a **Dark Side Score penalty on the performance UtF roll**; do not make this a global modifier to every Use the Force roll. Their high-tier perks are heterogeneous: temporary talent/feat benefit; FP-exception; maintenance reaction; cross-book temporary power and reroll.
- **Bonus stacking**: A +1 result and a +2 result are **alternatives** at different check tiers, not cumulative +3. The current top-level aggregate `structuredBenefits` is a union of all tier contributions and **cannot be executed directly**.
- **Requirement adjudication**: The specific cylinders/ball bearings are narrative/physical requirements. Whether they are consumed or merely present must be source-exact; do not invent purchases, equipment damage or consumption. A generic `lightsaberEquipped:true` does not prove material or partner availability. Reuse V2 equipment readiness for readiness checks **only if explicitly required for the particular outcome**; performing a three-hour cadence should not be equated with a ready-to-attack combat state.

## JATM-3. Existing regimen runtime vs. printed lifecycle

| Source contract | Current observed implementation | Status / required structural change |
|---|---|---|
| One benefit per 24h window | `force-regimen-executor.js` checks current `actor.system.activeEffects` for `source:'forceRegimen'` but has no durable 24h eligibility ledger. | **Verified gap:** ending/removing effect cannot confer permission to start another benefit. |
| Effect duration is 24h | `durationText` is descriptive `24 hours / until long rest` and `clearForLongRest()` calls `endRegimen()`. | **Verified mismatch:** long rest is not a source-authorized replacement for strict 24h; use measured game/world-time owner and idempotent expiry. |
| Ending an effect does not reset a daily benefit | `endRegimen()` clears `system.spent` and `system.discarded` on related owned items immediately. | **Verified exploitable lifecycle:** manual End exposes regimen for reuse before 24h. Separate spent/performed/window/ongoing-effect states. |
| Failed regimen same-name lock for 24h | `executeRegimen()` sets `system.failedRegimen:true` but its upfront gate checks only `system.spent` and `system.discarded`. | **Verified gap:** a failure marker without per-regimen lock expiry cannot enforce 24h. Ending or resetting spent status may permit reattempt. |
| Performance takes 1–3h and materials/assistance | Executor rolls immediately; description includes `system.time` and `requirements` strings, but there is no confirmed preflight for time or participants. | **Verified static gap / GM-assisted requirement:** record elapsed-time and preparation assertions; offer GM confirmation if world-time cannot be automatically advanced. |
| Tier-specific benefit applied to correct target and event | `useRegimen()` writes a descriptive `system.activeEffects` entry on **performer's actor**, retaining tier metadata but no general rule-specific engine commits. | **Verified partial:** cannot count this as automatic +Will / temporary FP / ally permission / reaction exception. Split outcome handlers by typed event and beneficiary. |
| Regimen feat uses Wisdom, not Force Training setting | `FeatGrantEntitlementResolver.getForceRegimenSlotsPerInstance()` calls `getForceTrainingAbilityModifier()`. | **Verified calculation bug:** change to dedicated **permanent Wisdom modifier** authority. Keep Force Training's optional house-rule setting isolated to Force Training. |
| Regimen source fidelity and deployment | `data/force-regimens.json` and `packs/forceregimens.db` retain `implementationStatus:'details_backfilled_activation_pending'` / metadata-only automation even though Phase22 added executor. | **Confirmed stale provenance metadata:** audit/label actual capabilities individually; don't automatically call runtime fully implemented. |
| Repeat acquisitions and distinct learned choices | Regimen picker offers **"Learn This Regimen Again"**, but `ForcePlanBuilder.forceRegimens.allowDuplicates:false`. | **Confirmed UI/finalizer contract conflict:** resolve source repeatability and learned-regimen uniqueness. **Do not** interpret repeated feat acquisition as permission to duplicate *the same* regimen benefit during a day. |

### Regimen V2 specialization (extends Section 7; not a separate runtime authority)

```text
RegimenDefinition <: CanonicalAbilityDefinition
  performance: { timeHours, requiredItems[], requiredParticipants[], targetPolicy,
                 check: 'useTheForce', checkPenaltyRule?: 'darkSideScore' }
  thresholds[]: [ { minimumCheck, outcomes[], beneficiary: caster|ally|both } ]
  failure: { sameRegimenBenefitLockHours: 24 }
  dailyBenefit: { maxActiveBenefitsPerPerformer: 1, benefitWindowHours: 24 }
  grantSource: { feat: 'Force Regimen Mastery', perInstanceFormula: max(1,1+permanentWisMod) }

RegimenPerformanceReceipt
  performedBy; chosenRegimenId; targetActorId; startAt; completeAt
  preparationConfirmed; rollReceipt; successTier; failureCooldownUntil
  outcomePlan; sourcePage; performerDssAtCheck

RegimenBenefitWindow
  performerId; regimenId; activationReceiptId; startedAt; expiresAt
  tier; beneficiaryEffectIds[]; restrictedResourceTokenIds[]
  eligibilityConsumed: true             # persists even after 'End Effect'

TemporaryGrantedBenefit
  ownerActorId; sourceRegimenWindowId; canonicalTalentFeatPowerId
  kind: talent-benefit|feat-benefit|power-use|skill-permission|conditional-bonus|immunity
  expiresAt; recoveryPolicy; restrictedUsePolicy

TemporaryForcePointToken
  sourceRegimenWindowId; ownerActorId; amount; eligibleTriggerTypes[]
  bypassNormalPerRoundLimit: boolean; refundAndExpirationPolicy
```

No `regimen` effect may apply its unconditional aggregate `structuredBenefits`, and no expired benefit should destroy an independently possessed permanent feat/talent/power. These are **time-bound projections**, not item-acquisition authority.

## JATM-4. Regression requirements before a clean cutover

- [ ] Exactly 12 regimen identities and twelve stable pack IDs match source headings; printed source pages p10–14 and feat p23 recorded for every claim; book title canonicalized.
- [ ] Single feat acquisition grants `max(1,1+permanent WIS mod)` distinct learned regimen selections; two acquisitions count separately; temporary/house-rule Charisma never changes Regimen slots.
- [ ] Permanent Wisdom modifier increase adds **one new regimen per previously acquired Regimen Mastery feat**; no duplicate entitlement after failed/undone session.
- [ ] Regimen Aptitude +5 Force bonus applies to **performance check only** and survives correct talent identity adjudication.
- [ ] A completed regimen records elapsed 1/2/3 hours, validated equipment/assistant/partner, correct UtF bonus/penalty, selected result tier and beneficiary.
- [ ] First successful benefit prevents additional different-regimen benefits for full 24h; `endRegimen`, deletion, long rest or combat end cannot bypass.
- [ ] Failure marks **specific regimen** benefit ineligible for 24h; another regimen remains available if no first benefit window is active; legal narrative performance vs benefit is explicit.
- [ ] Exactly one tier's effect set applies, with correct lower-bound threshold and non-stacking; aggregated `structuredBenefits` is never an activation input.
- [ ] Awaken ally-only temporary UtF permission expires and does not grant a permanent feat, trained skill, or learned Force Powers; caster Gauge Force Potential benefit independent.
- [ ] Quiet the Mind DC13 Farseeing use cannot recover via any source event, but DC18/23 use follows appropriate suite recovery; temporary Visions behavior expires.
- [ ] Temp FP from Telekinetic Practice has 1/2 use, descriptor restriction and **second-roll-must-stand** option at highest tier.
- [ ] Sparring/Training Remote temporary FP tokens target only Block / Deflect respectively and have exact special FP/round exception and preparation requirements.
- [ ] First cadence Will bonus +1/+2 typed as Force; Severing Strike temporary talent benefit doesn't become permanent.
- [ ] Second cadence attack bonus applies **only versus flanking attackers**; temporary Whirlwind Attack benefit does not grant feat ownership.
- [ ] Third cadence Redirect Shot bonus applies to qualifying ranged attacks, and Block/Deflect FP exception works off turn only at DC33 tier.
- [ ] Fourth cadence bonus only maintenance-after-damage; DC38 optional **reaction + FP** bypass, not unlimited auto-maintenance.
- [ ] Fifth cadence Move Light Object-only bonus (proper printed type), Kinetic Combat temporary source link and correct **keep better** FP reroll; no permanent KOTOR power cloning.
- [ ] Target/clock restrictions use actor/scene/world time receipts and rollback only committed resources/effects. Exactly-once result despite UI double-click/concurrent attempts.
- [ ] V2 sheet shows performed/benefit/remaining time/cooldown/GM adjudication rather than only a single "spent" flag.

**JATM book disposition:** **Source census complete (12/12)**; **source-to-pack threshold/text comparison complete at high level**; structural changes required in time-window, target, resource, feat entitlement and tier execution; **Foundry runtime behavior not certified**. Do **not** implement from this alone without final cross-book schema reconciliation.

**Next sourcebook to audit:** *Starships of the Galaxy* — full Starship Tactics / Starship Maneuver source census, printed pages, action activation, recovery clock, trained Pilot and Gunnery Specialist exception, operator-versus-vehicle ownership and the class/feat V2 grant contract.

---

# Book 3 — *Starships of the Galaxy* (2007): Starship Tactics and Maneuvers

**SOTG checkpoint, 2026-11-17.** SOURCE: uploaded *Starships of the Galaxy* printed PDF, Chapter 1 feat p.20 and Chapter 2 starship maneuver rules and entries pp.23–30. TXT was the searchable index; the corresponding printed PDF pages were visually checked. DATA: GitHub `main`, `data/source/starship-maneuvers.json` (27 definitions), `scripts/utils/starship-maneuver-manager.js` (a *different* hard-coded pool of 27). No Starship Maneuver content pack is registered in `system.json`; `template.json` does define Item type `maneuver`. **A definition in `data/source` must not be assumed to be a live production compendium or certified execution contract.**

## SOTG-1. Published general rules, provenance and entitlement

| Contract | Printed authority and source-faithful interpretation | Observed system impact |
|---|---|---|
| **Starship Tactics feat** | *SotG* p.20; prerequisites Vehicular Combat and trained Pilot. Adds **max(1,1 + permanent Wisdom modifier)** maneuver uses per feat acquisition; the **same maneuver can be selected multiple times**. Permanent Wisdom modifier increases add one new maneuver use **per owned Starship Tactics feat**. | `FeatGrantEntitlementResolver.getStarshipTacticsSlotsPerInstance()` computes Wisdom, but `countFormula`/`ability` provenance incorrectly says configurable Force Training ability. Record true source WIS only and grant provenance *per feat instance*. Feat repository identity is recorded as `376d805d1b73f7e6` in existing feat audit manifests (reconfirm on canonical feat cutover). |
| **Tactical Genius feat** | *SotG* p.20. Same prerequisites plus Starship Tactics. When **any** attack roll is a natural 20, recover **all spent** maneuver uses **at the end of that round**. | This is a distinct typed attack-roll-receipt trigger, not a natural-20 Pilot check and not an immediate refresh. Existing feat audit identity `da8e272f5dae09b9`; final owner must use committed attack event, current combat/round identity and one recover transaction. |
| **Who can use a maneuver** | *SotG* p.23. Pilot maneuvers normally require operating a **starfighter or airspeeder**. A gunner-tagged maneuver can be activated by a gunner aboard other vehicles; printed **combat thrusters** modification p.40 is a separate vehicle-class exception. | Cannot treat all vehicle actors as valid pilot maneuver carriers. Validate **operator actor**, station/role, craft subtype, modifications and ownership; no blanket starship eligibility. |
| **Learning and suite ownership** | *SotG* p.23. Maneuvers are learned **by the character**, not inherently by a vehicle. Two copies of Corellian Slip represent two separate usable suite entries. Multiple feat acquisitions and Wis modifier gains increase slots; no independent free grant merely from sitting in a ship. | The character/progression owns learned instances. Vehicle presentation projects authorized crew instances into current station. One canonical item/instance authority, not parallel vehicle-only and legacy `system.starshipManeuverSuite` stores. |
| **Normal use and failure** | *SotG* p.23. Typically make a Pilot check; **five `[gunner]` maneuvers instead require an attack roll**, and `[Force]` Target Sense requires UtF. Pick any eligible **lesser** outcome when tiered. Failure to reach minimum still **spends the maneuver and wastes the action**. | `rollKind` must be data-driven (`pilot`, `attack`, `useTheForce`), and `tiers[]` must preserve every threshold and optional lesser-tier choice. One use spent at declared activation, including rolled failure. |
| **Recovery** | *SotG* p.23. After combat, **1 minute of rest** restores all. Natural 20 specifically on **Pilot check to activate a maneuver** restores all **at end of that turn**. Force Point **reaction** restores exactly one spent maneuver **immediately**. Other powers/feats may add new triggers. | End-of-combat event alone does not prove 1-minute rest. Separate recover-all end-turn Pilot trigger from Tactical Genius end-round any-attack trigger. Spend FP via existing FP coordinator and apply selected-**instance** restore. |
| **Attack Pattern descriptor** | *SotG* p.23. **One active attack pattern at a time**. Lasts until end of encounter unless deactivated/superseded. Activating another replaces earlier benefit but **does not refund either spent use**. | Single per-operator/vehicle attack-pattern effect state, source use ledger and explicit replacement/expiry independent of used/spent state. Always typed, not tag-matched. |
| **Dogfight descriptor** | *SotG* p.23. Only usable while engaged in an actual dogfight. Some reaction maneuvers require a precise window **before** an opposed check or **after** an attack has resolved. | Typed dogfight relation plus trigger window and target identity at preflight; do not activate from ordinary range/flying. |
| **Force descriptor** | *SotG* p.23. Requires trained Use the Force and the activation counts as **using the Force**. | Target Sense receives actual printed `[Force]` descriptor, uses **Use the Force**, and participates in genuine Force-use restrictions/receipts. It is still a **Starship Maneuver**, not a Force Power; do not invoke Force Power suite recovery/grant rules. |
| **Gunner descriptor** | *SotG* p.23. Pilot with pilot-controlled weapon **or** actual gunner on ship may activate; ordinary pilot-only maneuvers are different. | Typed crew-station/effective-weapon access. The five printed gunner entries currently lack this descriptor in `data/source`. Source attack roll and attacker identity must be the gunner/operator, not auto-filled pilot. |
| **GM generic-crew optional allotment** | *SotG* p.29 sidebar: skilled crews can be given 1 maneuver (+1 gunner), expert 2 (+2), ace 4 (+4); untrained/normal none. **These are optional GM crew-quality allocations**, not ordinary character Starship Tactics feat slots. | Optional crew-template entitlement type, governed by GM rule enabling; do not fake owning Starship Tactics feats or include in regular feat formula. |

**Important book-specific note:** These feats have *two different natural-20 triggers* with **different roll categories and recovery times**. Do not merge them into a generic `onNatural20=>unspendAll` listener.

## SOTG-2. Full published maneuver identity and mechanical census

The following **27/27 published maneuver headings** match names in `data/source/starship-maneuvers.json`. The `id` is that file's present source-definition key, **not** a Foundry compendium `_id`. Printed page(s) are from the book, and the summaries are source-based paraphrases. `DATA` compares the current `maneuver.pilotCheck` / `maneuver.descriptors` fields, **not certified runtime**. `[AP]` = `[attack pattern]`; `[DF]` = `[dogfight]`; `[G]` = `[gunner]`; `[F]` = `[Force]` **as printed**, not semantic tags.

| Claim / printed page | Canonical maneuver (`data/source` key), action and descriptor | Source-faithful, player-readable effect and resolution | Source-to-data disposition |
|---|---|---|---|
| SOTG-SM-01 / **p24** | **Ackbar Slash** `ackbarSlash`; **reaction** | Following a missed adjacent attack against you, redirect the original shot toward another adjacent enemy; Pilot DC **20/25/30/35** chooses redirected attack bonus **+0/+1/+2/+5**; compare **original attack** against substitute target Reflex. No further Ackbar redirection of that redirected attack. | `allOrNothing:true` loses all four tiers, replacement attack-roll provenance, adjacency and recursion lock. |
| SOTG-SM-02 / **p25** | **Afterburn** `afterburn`; **full-round** | Free all-out-movement action with defensive Pilot bonus against dogfight initiation: DC **15/20/25/30** gives **+1/+2/+5/+10**. | `allOrNothing:true` loses four result tiers, all-out movement transaction and narrow opposed-check modifier. |
| SOTG-SM-03 / **p25** | **Angle Deflector Shields** `angleDeflectorShields`; **swift [AP]** | Pilot **DC15**; choose source vehicle/station: **double effective SR** against its attacks, **halve SR** vs all other sources; change designated source with swift action, requires SR≥5. | **CRITICAL FALSE MECHANIC:** source file invents tiered +1/+2/+3 shield bonuses at DC15/20/25. This is NOT the printed result. Correct this before any automated shield math. |
| SOTG-SM-04 / **p25** | **Attack Formation Zeta Nine** `attackFormationZetaNine`; **swift [AP]** | Pilot **DC20**, requires own SR≥5; subtract **1 weapon damage die** in exchange for **+20 SR**, applies during active pattern; may deactivate swift while use stays spent. | `allOrNothing` is a reasonable resolution family **only if** DC20, weapon-die change, typed SR and state/deactivation rules are added. No effect automation proved. |
| SOTG-SM-05 / **p25** | **Attack Pattern Delta** `attackPatternDelta`; **swift [AP]** | Pilot **DC20**, own vehicle +1 **maneuver bonus Reflex** when adjacent to allied starfighter/airspeeder, increases to +2 if adjacent ally also uses same pattern. | Data's generic single-check flag lacks conditional adjacency/allied pattern linkage. |
| SOTG-SM-06 / **pp25–26** | **Corellian Slip** `corellianSlip`; **full-round** | Straight-line move through eligible fighter/airspeeder within 2×speed, then swift attack; Pilot DC **15/20/25/30/35** progresses collision avoidance conditional on destroying target, attack bonus **+0/+1/+1/+2/+2**, and damage dice **+0/0/+1/+1/+2**. Failure causes collision, no attack and no avoidance Pilot check for performer. | `allOrNothing:true` loses five tiers, dangerous collision/failure rule and required movement/attack sequence. |
| SOTG-SM-07 / **p26** | **Counter** `counter`; **reaction [DF]** | After dogfight opponent's attack against you resolves, Pilot DC **20/25/30** grants immediate **swift/move/standard** action respectively; initiative unchanged. | `allOrNothing` loses three distinct reaction action grants and order of operations. |
| SOTG-SM-08 / **p26** | **Darklighter Spin** `darklighterSpin`; **standard** | Makes **one 2×2-square starship-scale autofire area attack** with an autofire-capable vehicle weapon; Pilot DC **25/30/35** modifies attack penalty **−5/−2/0**. | Existing `scalingTiers: [15,25]` and effects "hit two/three targets" are **invented/incorrect**. Need autofire, 2×2 area, proper DC tiers and penalty. |
| SOTG-SM-09 / **p26** | **Devastating Hit** `devastatingHit`; **standard [G]** | Weapon **attack roll** vs vehicle Reflex; margin **0–4/5–9/≥10** adds **+1/+2/+3 weapon damage dice** to normal hit. | Missing printed `[gunner]`; schema incorrectly uses `pilotCheck.allOrNothing`. Must resolve **attack margin**, not Pilot DC. |
| SOTG-SM-10 / **p26** | **Engine Hit** `engineHit`; **reaction [G]** | When **your preceding attack** caused critical or damage ≥ target DT, attack-margin vs Reflex **0–4/5–9/≥10** applies target speed −**1/2/3** until encounter; DC **20/25/30 Mechanics** repair as appropriate. | Missing `[gunner]`; wrong `pilotCheck` resolution; must preserve qualifying attack receipt, reduced speed and per-tier engineer repair. |
| SOTG-SM-11 / **p26** | **Evasive Action** `evasiveAction`; **move [DF]** | Immediate no-action disengagement attempt, Pilot DC **15/20/25/30** gives **+2/+5/+10/+20** on opposed Pilot check. | `allOrNothing:true` loses four tiers and source dogfight-disengage action rules. |
| SOTG-SM-12 / **pp26–27** | **Explosive Shot** `explosiveShot`; **reaction [G]** | Triggers when qualifying attack destroys a vehicle by reducing it to 0 HP with damage ≥ DT. For every adjacent victim, compare attack roll vs its Reflex, margin **0–4/5–9/≥10** deals **3d10×2/4d10×2/5d10×2**. | Missing `[gunner]`; incorrect Pilot-check flag; area target/trigger/multiple defenses and starship-scale explosive damage omitted. |
| SOTG-SM-13 / **p27** | **Howlrunner Formation** `howlrunnerFormation`; **swift [AP]** | Pilot **DC20**; +1 maneuver attack bonus with ship weapons while next to allied fighter/airspeeder; +2 if adjacent ally uses same pattern. | `allOrNothing` shape valid, but needs DC20 and live ally+shared-pattern relation, not unconditional modifier. |
| SOTG-SM-14 / **p27** | **I Have You Now** `iHaveYouNow`; **swift** | Adjacent target; when damaged later this turn, compare the qualifying **attack roll to Fortitude** for −1 CT; Pilot DC **15/20/25/30** grants this rider, then attack bonus **+0/+1/+2/+5**. | `allOrNothing` loses tiered attack bonus, attack roll vs **Fortitude** and same-turn damage precondition. |
| SOTG-SM-15 / **p27** | **Intercept** `intercept`; **reaction** | Enemy fighter/airspeeder approaches within 2 squares; Pilot DC **20/25/30/35** may initiate dogfight as AoO, gains **+0/+1/+2/+5** on opposed Pilot; move 1 square toward target on success. | `allOrNothing` loses four grades, arrival event trigger, AoO legality, opposed result and movement. |
| SOTG-SM-16 / **p27** | **Overwhelming Assault** `overwhelmingAssault`; **swift [AP]** | Pilot **DC20**; designate one enemy; choose attack penalty **−N** and damage modifier **+2N before multiplier** on weapons vs that target, with attack penalty lasting until next turn. Can change target swift. | Must model typed target-bound attack/damage tradeoff and pre-multiplier order, not ordinary unconditional "damage up" bonus. |
| SOTG-SM-17 / **p28** | **Segnor's Loop** `segnorsLoop`; **reaction** | After ending turn farther from target than when turn began, make attack run as reaction; Pilot DC **20/25/30/35** imposes own Reflex penalty **−10/−5/−2/−1** respectively. | `allOrNothing:true` loses four **including negative/worse** tiers and start/end relative distance event. |
| SOTG-SM-18 / **p28** | **Shield Hit** `shieldHit`; **standard [G]** | Normal damage applies first against DR/SR; on vehicle weapon attack vs Reflex, margin **0–4/5–9/≥10** reduces shield SR by **5/10/15**, plus normal −5 SR if damage exceeds SR. Engineering recharge is normal. | Missing `[gunner]` and attack-margin resolution; SR reduction must happen **after** canonical damage pipeline, avoid duplicate normal shield degradation. |
| SOTG-SM-19 / **p28** | **Skim the Surface** `skimTheSurface`; **full-round** | Fly through size **Colossal (frigate)+** ship/station fighting space, attack ignoring SR; Pilot DC **20/25/30/35** gives own attack penalty **−10/−5/−2/−1**. Pilot result below 20 causes unavoidable performer collision. Readied gunner attacks can share SR bypass and penalty with correct initiative move. | `allOrNothing` loses four attack-penalty tiers, collision, target-size, movement/position and coordinated gunner readiness. |
| SOTG-SM-20 / **p28** | **Skywalker Loop** `skywalkerLoop`; **reaction [DF]** | In dogfight, after enemy fails its opposed Pilot attack against you, your **DC20 Pilot** enables attack of opportunity against opponent. | `allOrNothing` shape possible, but trigger is **failed opposed dogfight attack**, and reaction/AoO rules, not a free generic attack. |
| SOTG-SM-21 / **p29** | **Snap Roll** `snapRoll`; **reaction** | Before incoming attack resolved/damage rolled, use Pilot result as vehicle Reflex until next turn **only if not worse** than normal Reflex (may keep normal). | `allOrNothing` wrongly implies fixed success test; outcome is a **dynamic defense replacement** with trigger timing, actor choice and exact duration. |
| SOTG-SM-22 / **p29** | **Strike Formation** `strikeFormation`; **swift [AP]** | Pilot **DC20**; +1 die on ship-weapon damage rolls, at cost **−2 vehicle Reflex** while pattern active; deactivate swift still spent. | Pattern must update weapon attack-derived damage **and** vehicle defense; one always-on generic damage buff is insufficient. |
| SOTG-SM-23 / **p29** | **Tallon Roll** `tallonRoll`; **reaction [DF]** | After disengage announced **before** opposed Pilot roll: DC **20/25/30/35** enables AoO if target fails disengagement and applies target opposed-Pilot penalty **0/−1/−2/−5**. | `allOrNothing` loses four escalating results, pre-opposed-reaction timing and failed-disengage condition. |
| SOTG-SM-24 / **p30** | **Target Lock** `targetLock`; **standard [DF]** | Target in same dogfight; Pilot DC **15/20/25/30/35** grants opposed-Pilot bonus **+1/+2/+2/+5/+5** and attack bonus **+1/+1/+2/+2/+5**. Benefit ends on successful disengagement even if dogfight subsequently resumes. | `allOrNothing` loses five **two-axis** tiers and target-specific expiry relation. |
| SOTG-SM-25 / **p30** | **Target Sense** `targetSense`; **swift [F]** | **Use the Force**, not Pilot: DC **20** substitute character **Charisma bonus** for vehicle Intelligence bonus on ship-weapon attacks through next turn; **25/30** add **+2/+5 maneuver attack bonus**. Explicitly stacks with Battle Strike. | `pilotCheck.allOrNothing` is wrong skill and lacks three tiers, trained UtF, vehicle INT substitution and cross-domain Battle Strike stacking contract. |
| SOTG-SM-26 / **p30** | **Thruster Hit** `thrusterHit`; **reaction [G]** | After critical/damage ≥ DT on attacked vehicle, attack margin vs Reflex **0–4/5–9/≥10** gives enemy penalty **−1/−2/−5** to Reflex, Initiative and Pilot for encounter; top tier also forces straight-line-only travel. | Missing `[gunner]`, wrong `pilotCheck`, misses attack qualifying event, cross-roll debuff, and high-tier directional movement restriction. |
| SOTG-SM-27 / **p30** | **Wotan Weave** `wotanWeave`; **swift** | While fighting defensively or using total defense, halve speed, Pilot DC **15/20/25** grants **+1/+2/+5 vehicle Reflex** until next turn; fails if halving speed would make speed 0. | `allOrNothing` loses three tiers, required defense posture, speed tradeoff and zero-speed failure. |

**Census count:** 27 published identities matched to 27 `data/source` names. No duplicate or missing *name* found. This is **NOT 27 runtime-certified maneuvers**. The source file lacks a per-entry printed citation, most specific targeting/trigger data and correct typed resolution details. **All 27 entries need final content-schema replacement or recertification against these claims, not a mere rename.**

### Definite misrepresentations in existing source definitions

1. **False numerical mechanics:** Angle Deflector Shields (invented +1/+2/+3 shield) and Darklighter Spin (wrong 15/25 thresholds and hit-two/hit-three effect) are incontrovertibly **source-inaccurate**, even before runtime analysis. These entries must never become SSOT rules automatically.
2. **Lost scaling/penalties:** Ackbar Slash, Afterburn, Corellian Slip, Counter, Evasive Action, I Have You Now, Intercept, Segnor's Loop, Skim the Surface, Tallon Roll, Target Lock and Wotan Weave have meaningful multi-tier effects that `allOrNothing:true` cannot represent.
3. **Attack-roll maneuvers miscast as Pilot checks:** Devastating Hit, Engine Hit, Explosive Shot, Shield Hit and Thruster Hit are **printed `[gunner]`** and use attack-roll margin vs Reflex. The GitHub source file's `maneuver.descriptors` omits `[Gunner]` for **all five** and `pilotCheck` incorrectly describes a pass/fail roll. The older manager hard-coded list tags these as `gunner`, but tags on a competing list are **not** authoritative provenance.
4. **Force maneuver incorrect roll type:** Target Sense is `[Force]` / **Use the Force**, not Pilot; must track trained UtF eligibility and Force-use trigger, while still spending/recovering a **maneuver** use, not a Force Power use.
5. **Incomplete one-time/permanent state:** All active attack patterns (six printed patterns) use only one effect at once, last encounter or until specific deactivation/replacement; their spent uses remain spent. Recovering the suite does **not** by itself erase an ongoing pattern unless a printed duration event also occurs.
6. **Misleading current file status:** `data/source/starship-maneuvers.json` is a useful **inventory**, not per-entry certified rules. `StarshipManeuverManager._getAllManeuverDefinitions()` returns its own separate static 27-entry list. Neither gives a persistent canonical citation or complete source-specified result model. The clean cutover should preserve **one** content-definition authority and remove the other after reachability audit.

## SOTG-3. Existing progression and activation boundaries (verified in repository)

| Current source | Verified behavior | Disposition for later design/cutover |
|---|---|---|
| `scripts/apps/progression-framework/steps/starship-maneuver-step.js` | Uses per-ID count maps, expressly advertises repeated maneuver picks, and first loads actor-owned maneuver items, then falls back to `StarshipManeuverManager` static definitions if there are none. | **Keep UI count concept, replace source authority**. Picker must browse canonical all-27 **definition catalog**, not limit itself to already-owned items when levelling. |
| `scripts/engine/progression/engine/maneuver-authority-engine.js` | `getManeuverCapacity` prefers feat grants but legacy fallback reads `actor.system.abilities.wis` before canonical `system.attributes.wis`. `validateManeuverSelection` requires each proposed selected ID already on actor; explicitly refuses duplicates. | **Verified printed-rule contradiction**: source permits duplicate same maneuver and *new* definitions. Replace validator with selected **definition IDs** + per-instance counts and exact slot/grant ownership; remove legacy ability priority on clean cutover. |
| `scripts/engine/progression/engine/starship-maneuver-engine.js` | `applySelected` stores `system.starshipManeuverSuite.maneuvers` as a **Set** after collecting owned actor maneuvers. | **Verified risk/contract mismatch**: Set loses per-maneuver repeated uses, and additional suite ledger competes with owned instance state. Do not assume this path is active without call-site reachability check. |
| `scripts/utils/starship-maneuver-manager.js` | Hard-coded names/short descriptions (27). `getAvailableManeuvers` filters out names already learned; dialog uses checkboxes; it can directly create owned items and compute capacity independently. | Cannot learn the same maneuver twice from this UI even though printed rule permits it. Replace with canonical V2 picker/entitlement and disable independent direct grant owner after cutover. |
| `scripts/engine/StarshipManeuversEngine.js` | Vehicle sheet reads maneuver items from vehicle or linked crew, recognizes several legacy item types; `useManeuver` and `regainManeuver` toggle `system.spent` via ActorEngine. | Separate **projection/readiness state** from mechanical activation legality and authoritative character instance. A spent toggle alone cannot adjudicate Pilot/DC/damage/action or receipt. |
| `scripts/infrastructure/hooks/starship-maneuver-hooks.js` | Feat added hook invokes legacy `handleStartshipTactics`; ability hook reads `actor.system.abilities`; `deleteCombat` immediately resets spent maneuvers. | **Verified timing violation**: source requires 1-minute rest after combat, not simply `deleteCombat`. Eliminate competing grant hooks after ensuring single progression authority owns all feat/Wis entitlement events. |
| `scripts/engine/progression/feats/feat-grant-entitlement-resolver.js` | `getStarshipTacticsSlotsPerInstance` uses Wisdom, but emitted grant metadata incorrectly labels `countFormula`/`ability` as Force Training settings. | Preserve one feat grant resolver but correct provenance metadata, permanent-score source and **multiple feat acquisition instance** reconciliation. |

### Provisional maneuver-specific V2 contracts

```text
StarshipManeuverDefinition <: CanonicalAbilityDefinition
  source: { book: 'Starships of the Galaxy', printedPages: [24..30], verified: true }
  canonicalId; displayName; printedDescriptors[]
  action: { kind: reaction|swift|move|standard|fullRound, triggerWindow? }
  operatorPolicy: { role: pilot|gunner|either, trainedSkills[], craftEligibility,
                    crewStationRequired, controlledWeaponRequired? }
  execution: { rollKind: pilotSkill|useTheForceSkill|vehicleWeaponAttack,
               opposedDefense?, resolveAttackBeforeEffect?, checkTiers[] }
  targetPolicy: { eligibleCraftTypes[], range?, relation?, geometry?, adjacency? }
  conditionalEffects[]; failureEffects[]; resourceOptions[]
  attackPattern?: { occupiesSinglePatternSlot: true, duration: encounter,
                    replaceExisting: true, deactivationAction: swift }
  sourceCrossReferences[]

ManeuverSuiteEntry
  instanceId; canonicalDefinitionId; ownerCharacterActorId; provenanceGrantInstanceId
  acquiredCharacterLevel; spent; spentReceiptId?; lastRecoveryReceiptId?

ManeuverActivationReceipt
  actorOperatorId; operatorCrewRole; vehicleActorId; controlledWeaponId?
  maneuverInstanceId; actionReceipt; rollReceipt; selectedResultTier
  targetActorIds[]; hitOrMissOrMargin; effectPlan; spentUseReceipt
  forceUseDescriptor: boolean  # only when source explicitly [Force]

ManeuverRecoveryReceipt
  ownerCharacterActorId; recoveredInstanceIds[]; trigger:
    oneMinuteRestAfterCombat | natural20ManeuverPilotAtEndTurn |
    tacticalGeniusAnyAttackNatural20AtEndRound | forcePointReactionSingle |
    specialPrintedAbility
  sourceEventReceiptId; eventClock; FPSpendReceiptId?

AttackPatternInstance
  maneuverInstanceId; actorOperatorId; vehicleActorId; designatedTargetId?
  activeFrom; expiresEndEncounter; replacesPatternInstanceId?
  bonusProjectionOrWeaponTradeoff[]
```

`tags` and secondary categories continue to support discovery, filtering, recommendations and descriptions only. `printedDescriptors` and type-specific `execution` fields are **mechanical source authorities**, bound to source-verified canonical IDs. Do **not** execute all `[Force]` maneuvers with Force Power actions; do not give `[gunner]` maneuvers a fabricated Pilot skill roll.

## SOTG-4. Required source and runtime acceptance tests

- [ ] Exactly **27** printed SotG maneuver names resolve to one canonical definition each with page, type, action, printed descriptor, summary, skill/attack roll method, tier thresholds, failure, and eligibility; no pack-name-based guessing.
- [ ] Source data parser rejects **Angle Deflector Shields +1/+2/+3 shield bonus** and **Darklighter Spin DC15/two-target/three-target** as invalid against printed claim. Reconcile every 27 source draft records before a runtime release.
- [ ] `Devastating Hit`, `Engine Hit`, `Explosive Shot`, `Shield Hit`, `Thruster Hit` retain printed `[gunner]`, use a real **attack roll**, compare margin against Reflex, accept legal gunner operator, and trigger proper special timing.
- [ ] `[Force]` Target Sense requires trained UtF, rolls UtF DC20/25/30, substitutes **Charisma** for **vehicle Intelligence** on attacks, and stacks its printed bonus with Battle Strike; descriptor affects Force-use listeners but **not Force Power suite resource ownership**.
- [ ] One Starship Tactics feat with Wisdom 12 yields **two** maneuver uses; two feat instances with Wisdom 12 yield **four**. Same name can appear **twice** as **two distinct spent/readied instances**; one expended does not expend the other.
- [ ] Permanent Wisdom score +1 without **modifier** increase grants nothing; a modifier increase of +1 with 2 feat acquisitions grants exactly **two** more uses; temporary equipment/Force enhancement may **not** grant extra known maneuvers.
- [ ] Spent use remains spent on failed Pilot check, failed attack or GM-assisted maneuver resolution; no double-spend on redraw/reaction retry; optional lesser result tier can be chosen by user.
- [ ] Normal Pilot natural 20 to **activate a maneuver** restores all at **end of turn**, not mid-attack; natural 20 on unrelated Pilot checks does not trigger.
- [ ] Tactical Genius natural 20 on **any attack roll** restores all at **end of round**, only with feat, including attack rolls unrelated to maneuvers; deduplicate multiple natural20 receipts in the same round.
- [ ] FP reaction restores **one selected spent instance immediately** and exactly one FP, through canonical FP spend; rollback failed transaction and reconcile actor/vehicle crew projection.
- [ ] After combat, 0 seconds or deletion of Combat document alone **does not** restore any maneuvers. 1 minute **actual rest** does; different extra-combat events and GM clocks are explicit.
- [ ] Pilot maneuver on a capital ship / transport without printed combat-thrusters exception is blocked, but legal `[gunner]` role can still activate qualifying gunner maneuvers; vehicle type/role and controlled weapon checked independently.
- [ ] One Attack Pattern per operator/vehicle, second activation replaces prior bonus, first and second use both remain spent. Effects expire at encounter end; manually deactivated pattern remains spent.
- [ ] Angle shields double SR vs nominated source, halve against others, after **single DC15** Pilot check; targeting change/swift and SR≥5 eligibility enforced. No scalar +1/+2/+3 shield modifier.
- [ ] Attack Formation Zeta Nine adds **+20 SR** at cost of **−1 weapon damage die** on legal attacks; Strike Formation adds **+1 damage die** while lowering Reflex by **2**, both executed through one damage/defense authority.
- [ ] Source-level positional events (Ackbar redirect, Corellian Slip collision, Segnor distance change, Skim-through-shields, Intercept AoO) use scene/target legality; GM-assisted outcomes are explicit and not silently assigned generic damage.
- [ ] Gunner `Shield Hit` applies normal DR/SR damage first, then tiered additional SR reduction without inventing a second DR/SR damage authority.
- [ ] NPC generic crew-quality maneuver allotments require explicit GM enablement, do not falsely create Starship Tactics feat, and preserve each vessel's pilot/gunner station context.
- [ ] Multi-actor maneuver sheets show only legitimate operator's known copies and spent states, with correct crew ownership; deleting/changing a linked crew actor cannot leave vehicle-only phantom maneuvers.

**SOTG book disposition:** **Source identity census 27/27 complete; printed p20 and pp23–30 checked; source-to-existing-definition mismatch ledger complete at item level.** All 27 current source definitions require typed-rule reconciliation; *especially* DC tables, `[gunner]` tags, roll method, and timed recovery. **No V2 runtime certification or cutover implementation was performed.**

**Following sourcebook:** *Knights of the Old Republic Campaign Guide* (Force content including cross-source Kinetic Combat referenced in Jedi Academy); next step after revising cross-book source identity/provenance matrix. Additional *Scum and Villainy*, *Clone Wars*, *Force Unleashed*, *Legacy*, *Rebellion*, *Galaxy of Intrigue*, *Unknown Regions* and *Galaxy at War* remain in the queue, as applicable.

---

# Book 4 — *Knights of the Old Republic Campaign Guide* (2008)

**Audit revision:** v0.5, 2026-11-17. **Authority:** printed sourcebook, Chapter IV, "The Force," printed pp. 50–54 (inspected from the supplied PDF; OCR/DJVU TXT used as search aid). **Pack comparison:** GitHub `main`, `packs/forcepowers.db`, `packs/forcetechniques.db`, and downstream `data/force-powers.json`, `data/combat/damage-profiles.force-power.json`, `scripts/apps/progression-framework/steps/force-technique-step.js` (read-only).

## KOTOR-1. Publication identity census and citation convention

| Domain | New identities printed | Unique existing pack matches | Printed pages | Outcome |
|---|---:|---:|---|---|
| Force Powers | **10** | **10** | 50–52 | Identity census complete; mechanics need reconciliation |
| Force Techniques | **10** | **10** | 53–54 | Identity census complete; acquisition-vs-usage semantics need correction |
| Force Secrets | **0** | N/A | No new secret entries in chapter | Existing Core secrets appearing in NPC blocks are **not** new KOTOR identities |
| Force Regimens | **0** | N/A | No entries | JATM remains primary regimen source |
| Starship Maneuvers | **0** | N/A | No entries | SotG remains primary maneuver source |
| Lightsaber Form Powers | **0** | N/A | No distinct catalog | Do not infer from uses of a lightsaber or Kinetic Combat |

**Page mapping:** printed page 50 = supplied PDF page 51; printed 51 = PDF 52; printed 52 = PDF 53; printed 53 = PDF 54; printed 54 = PDF 55. All 10 pack Power records identify the correct sourcebook but **nine have `page:null`**, while *Force Scream* incorrectly says `page:88`. All 10 Technique records say `page:0`, which is not a publication locator. All existing `_id` values below are **preservation candidates**, not new IDs.

**Editorial control:** The chapter introduces 10 Force Powers and 10 Force Techniques even though its introduction broadly mentions Force Secrets. Later NPC stat blocks listing Core Secrets (for example, Multitarget Power, Quicken Power) are **references**, not new KOTOR secret definitions. Do not create duplicate records to match NPC inventory.

## KOTOR-2. Printed Force Powers — 10 individually reconciled identities

**Status labels:** `SOURCE` = printed source mechanics; `PACK` = observed current pack; `PLAN` = schema/engine requirements, not implemented or certified. Each short description is an independently written mechanical paraphrase, rather than a reproduction of the book's prose. The user's printed pages, rather than the PDF's ordinal, are the provenance authority.

### KOTOR-FP-01 — Energy Resistance

- **SOURCE:** printed **p.50**, **no bracketed descriptor**; standard action, self. UtF **DC 20/25/30/35** grants **DR 5/10/15/20 against energy damage** (including relevant sonic, fire, cold, and electrical sources) until the beginning of the next turn. FP changes activation to **swift**. Maintain with a swift action each later round; after taking damage while maintaining, succeed on UtF **DC 15 + damage taken** or lose maintenance. **Description:** Layer a maintained Force-based reduction over incoming energy damage.
- **PACK:** `_id: fp_energyresistance`, `page:null`; correct tier values and maintenance prose but no typed damage-category gate, maintenance receipts, or checked activation-action override. `tags` contains `ally_support` despite this being **self-only unless an external ability changes targeting**.
- **PLAN:** `typedDamageMitigation(kind:DR, allowedFamily:energy, tierValue)` with duration and maintenance event; FP action override; allow **Improved Energy Resistance** to substitute an ally within 6 squares *only when owned*. Avoid treating the source's energy DR as generic `damageResistance` against all damage.

### KOTOR-FP-02 — Fear

- **SOURCE:** printed **p.50**, descriptors **[Dark Side] [Mind-Affecting]**; **swift** action; one creature within **12 squares and line of sight**. UtF must first meet/exceed **Will Defense**, then DC **15/20/25/30** limits the target next turn to only **one standard / one move / one swift / no actions**, respectively. This is a **Fear effect**. FP on success gives target **−2 to all Defenses** until start of caster's next turn. **Description:** Briefly constrain a creature's next-turn actions through an explicitly fearful mind effect.
- **PACK:** `_id: fp_fear`, `page:null`; main tier values survive in `dcChart`; `tags` includes **`area`** and **`standard_action`**, both wrong (one target, swift). A four-tier `dcChart` alone does not represent mandatory Will comparison, fear immunity, typed Mind-Affecting suppression, or FP modifier expiry.
- **PLAN:** Combined `defenseGate(Will) + resultTier` using the **same UtF roll**, typed `Fear` and `Mind-Affecting` mechanical descriptors, turn-scoped action restriction, Dark Side descriptor admission and consequence; preserve Jedi Master/Sith Lord Fearless and Force Disciple Indomitable (current PR protection stack) at typed effect-admission boundary.

### KOTOR-FP-03 — Force Scream

- **SOURCE:** printed **p.50**, descriptor **[Dark Side]**; **standard** action, affects **all creatures within 12 squares who can hear the caster**. Compare a single UtF result against each target's **Fortitude Defense**, with printed **size adjustments** (Large +5, Huge +10, Gargantuan +20, Colossal +50). On hit, DC **15/20/25/30** deals **1d6/2d6/3d6/4d6 Force damage** and reduces **damage threshold by 5** until end of caster's next turn. FP enlarges the damage-threshold reduction to **10**, not the damage dice. **Description:** Harm audible nearby creatures while temporarily lowering their ability to withstand injury.
- **PACK:** `_id: 64d987296e6bb054`; **`page:88` incorrect**; fabricated **6-square cone**, Fortitude **save**, and **one-round stunned** outcome; omitted Force-damage tiers, hearing condition, size adjustment, damage-threshold penalty, and FP rider. `data/combat/damage-profiles.force-power.json` also has a *non-verified* Force Scream damage profile with an inferred **sonic** damage hypothesis; printed damage is **Force**, and the sound/hearing requirement does **not** license changing damage type to sonic. `force-card-summaries.js` also claims it can stun.
- **PLAN:** `area: audibleRadius(12)`, hearing-sense gate (not a 6-square cone), per-target Fortitude adjusted for size, tier damage packet `type:force`, time-limited `damageThresholdModifier`, separate FP rider and multiple-target receipt. **Critical data drift; no generic stun.**

### KOTOR-FP-04 — Force Whirlwind

- **SOURCE:** printed **p.51**, descriptor **[Telekinetic]**, **standard** action; one creature/droid within **12 squares, line of sight**. UtF vs **Fortitude + size adjustment**; on hit, target is **immobilized** until next turn, takes **−5 to attack rolls and skill checks**, is **prone when effect ends**, and takes tiered **1d6/2d6/3d6/4d6 Force damage (DC 15/20/25/30)** at **end of caster's turn**. FP changes attack/skill penalty to **−10**. Maintain by **move action + new UtF check every round**, plus concentration check after damage (DC 15 + damage). **Premature termination** if caster/allies attack or otherwise damage target or move it down CT.
- **PACK:** `_id: fp_forcewhirlwind`, `page:null`; retains rough dice/penalty/maintenance prose but `dcChart` is not a full conditional effect graph; missing typed timing and special early termination.
- **PLAN:** Stateful maintained per-target effect: initial defense gate, chosen tier, **end-of-turn damage**, condition expiry/prone, owner maintenance/roll receipts, and source-triggered cancellation. Effect suppression must occur **before** condition and damage mutation.

### KOTOR-FP-05 — Ionize

- **SOURCE:** printed **p.51**, **no bracketed descriptor**, **standard** action; one target within **6 squares, line of sight**. UtF must meet/exceed **Reflex Defense**. On hit, DC **20/25/30** deals **4d6/5d6/6d6 ion damage**, and optional FP adds **2d6 ion**. **Description:** Overload a nearby target with ion damage, particularly relevant to droids and equipment.
- **PACK:** `_id: fp_ionize`, `page:null`; printed dice tiers/FP addend essentially preserved in string chart, but lacks explicit mandatory Reflex check and typed canonical ion consequences. `data/combat/damage-profiles.force-power.json` has an **inferred**, not source-certified, ion profile; the ion-type category agrees with source, but profile confidence does not confer runtime certification.
- **PLAN:** Explicit `attackSkill:useTheForce`, `defense:Reflex`, threshold tiers with **no damage on miss**; typed `ion` damage packet through canonical damage/condition rules, appropriate size/electronics eligibility as printed elsewhere; **Improved Ionize** FP option resolves its ion-halving exception and must be reconciled with the basic +2d6 FP option and per-round FP constraints.

### KOTOR-FP-06 — Kinetic Combat

- **SOURCE:** printed **p.51**, descriptor **[Telekinetic]**, **standard** action; initial **UtF DC 20** animates **one held one-handed melee weapon**, which may move to **12 squares** and attack; weapon is treated as wielded by user while remote. Use **BAB + Charisma** for its attack and normal weapon dice **+ half heroic level + Charisma in place of Strength** for damage. Weapon threatens squares adjacent to its location and can make AoOs attributed to wielder; otherwise weapon-enhancing talents/feats do **not** transfer automatically (e.g., Mighty Swing or Power Attack). Maintain as a **swift** action; with a subsequent **standard** action, move the weapon **up to 6 squares**, attack once, stay within 12; damage to caster triggers UtF maintenance DC **15 + damage**. FP grants **+1 to these weapon attack rolls**. **Description:** Wield and threaten from a remotely hovering one-handed melee weapon, replacing Strength with Charisma for its attacks.
- **PACK:** `_id: fp_kineticcombat`, `page:null`; broad mechanics in prose but no typed weapon eligibility, range/origin, separately clocked attack action, legal AoO, exclusions, or equipment-readiness integration. Tags assert `swift_action` despite **standard** initial activation.
- **PLAN:** `remoteWeaponControl` state with stable **weapon item reference**, effective held posture on activation, remote position and attack origin, **one-weapon attack** using canonical weapon/damage math with **Charisma substitution**, no invented free attacks or weapon talents, persistent concentration. **Improved Kinetic Combat** permits up to **three** weapons but still moving/attacking only one as a standard action; this does **not** grant three attacks. Prevent a parallel Force Power damage engine from conflicting with V2 weapon occupancy/readiness.

### KOTOR-FP-07 — Resist Force

- **SOURCE:** printed **p.51**, **no bracketed descriptor**, **standard** action, self. UtF **DC 15/20/25** grants **+1/+2/+5** to **one selected Defense** against **Force Powers only** until start of next turn. FP expands coverage to **two selected Defenses**. Maintain each instance by **swift** action per round; damage while maintaining requires UtF DC **15 + damage**; **multiple independently activated instances may coexist** if each receives its own maintenance action. **Description:** Maintain one or more limited, Force-Power-only defense wards.
- **PACK:** `_id: fp_resistforce`, `page:null`; **DC 25 recorded as +3 rather than +5** (confirmed wrong); pack describes maintenance but not multiple separate instances or FP two-defense choice. Tag `reaction` is not printed activation timing.
- **PLAN:** Tier `[15:+1,20:+2,25:+5]`, recipient `self` except **Improved Resist Force** ally-substitution, type-scoped defense projection `appliesOnlyTo:forcePower`, `selectedDefenses[]`, per-instance maintenance action/clock; preserve independent use entries and their action cost.

### KOTOR-FP-08 — Slow

- **SOURCE:** printed **p.52**, descriptor **[Telekinetic]**, **standard** action; one creature/droid within **12 squares and line of sight**. UtF vs **Fortitude + size adjustment**. On hit and DC **15/20/25/30**, reduce speed **1/2/3/4 squares** until start of caster's next turn, and encumber the target as by a heavy load (**−10** on **Acrobatics, Climb, Endurance, Initiative, Jump, Stealth, Swim**). FP inflicts **−5 to target Fortitude for this activation**. **Description:** Telekinetically impair speed and impose heavy-load skill restrictions.
- **PACK:** `_id: fp_slow`, `page:null`; speed tiers and brief special retained but target Fortitude, **size adjustment**, heavy-load skill penalty, and FP pre-check gate lack typed rule fields.
- **PLAN:** Defense gate before effect, flat speed alteration with lower-limit policy from shared movement rules, typed skill-penalty set, one-round expiry, **precheck** FP defense modification not a later unconditional debuff.

### KOTOR-FP-09 — Valor

- **SOURCE:** printed **p.52**, descriptor **[Light Side]**, **standard** action, **one ally within 12 squares and line of sight**. UtF DC **15/20/25/30** grants ally **+1/+2/+5/+10 Will Defense** against **Mind-Affecting and Fear effects** until start of caster's next turn. FP broadens benefit to **all Will-targeting effects**, but does not change numerical tier. Maintain with **swift** action per instance; after caster damage, UtF DC **15 + damage**; **multiple Valor instances on different allies** each need separate action/use. **Description:** Sustain protective Will-defense bonuses for one or more allies.
- **PACK:** `_id: fp_valor`, `page:null`; correct tier values, but no typed conditional-defense scope, active-effect recipient ownership, multiple-instance maintenance, or source-FP broadened condition.
- **PLAN:** Per-target active benefit with `applicability:mindAffectingOrFear` switched to `allWillEffects` only on paid FP receipt. **Improved Valor** also benefits caster while **same** activation affects nominated ally; do not create an extra free power use.

### KOTOR-FP-10 — Wound

- **SOURCE:** printed **p.52**, descriptor **[Dark Side]**, **standard** action, one creature within **6 squares and line of sight**. One UtF roll vs **Fortitude + size adjustment**; success causes **4d6 Force damage**, independent of a fixed skill DC 15; FP adds **2d6 Force**. If the target moves at least one step down CT, that condition becomes **persistent** until treated by **DC 20 Treat Injury surgery**. **Description:** Injure a creature and potentially leave persistent condition-track harm.
- **PACK:** `_id: fp_wound`, `page:null`; `dcChart[0].dc:15` implies **false fixed DC gate**; otherwise damage and narrative persistent-CT/surgery text exists. Source uses target Fortitude as success authority; do not deny a successful attack because a fabricated baseDC is unmet or award damage solely by meeting DC15.
- **PLAN:** `targetFortitude+size` opposed gate; `onHit:4d6 Force` (+2d6 on FP); condition track only if canonical damage/threshold engine emits actual CT movement; decorate that **resulting** step persistent and require typed surgery to clear, without creating extra CT steps on every hit.

### KOTOR Power pack metadata disposition

| Printed page | Entries (all currently in `packs/forcepowers.db`) | Pack page issue |
|---|---|---|
| **50** | Energy Resistance, Fear, Force Scream | 2 null; Force Scream says **88** |
| **51** | Force Whirlwind, Ionize, Kinetic Combat, Resist Force | all null |
| **52** | Slow, Valor, Wound | all null |

**10/10 exact-name pack matches; 0/10 currently have correct printed page.** All 10 describe the same general source concepts but **none should be marked content-and-runtime mechanically certified** from the current pack alone. Prior Core corrections intentionally handled certain Core powers without rewriting their pack metadata; do not use the existence of those runtime modules as evidence that these KOTOR outcomes are wired.

## KOTOR-3. Printed Force Techniques — 10 individually reconciled identities

**Source-wide acquisition note:** The printed KOTOR Force Techniques section says Force Techniques become available through qualifying class progression and can be chosen from the Core or KOTOR lists. **None of the ten KOTOR entries prints a separate `Prerequisite:` qualification line.** Phrases such as "when using Mind Trick" are **activation/benefit conditions** and references to another ability, **not necessarily prerequisite rules for learning the technique**. Every pack entry currently has `system.prerequisite` text naming its associated Power or UtF application; source **does not print this as a hard acquisition prerequisite**. Treat those fields as **unverified hard gates** until formally reconciled with printed rules and official errata. It is valid to own a technique whose benefit cannot currently fire without its related ability, unless another printed rule explicitly bars acquiring it.

### KOTOR-FT-01 — Dominate Mind

- **SOURCE:** printed **p.53**. When Mind Trick's UtF roll exceeds target **Will Defense by at least 10**, control what **standard action** it takes on its next turn. **Summary:** Upgrade a sufficiently successful Mind Trick to direct the target's next standard action.
- **PACK:** `_id: 3b4c12c89a49177d`, `page:0`; benefit text source-aligned, but `prerequisite` ties it to Mind Trick (`[e6649f366d6c5737]`) without a printed KOTOR selection prerequisite.
- **PLAN:** Typed **Mind Trick** post-hit margin trigger and chosen action order; do not make this a separate Force Power use; ownership gate is Force Technique selection entitlement, not derived from `relatedPower` tag.

### KOTOR-FT-02 — Improved Energy Resistance

- **SOURCE:** printed **p.53**. On Energy Resistance activation, choose **one ally within 6 squares instead of the caster** as recipient. **Summary:** Redirect the energy DR protection to a nearby ally.
- **PACK:** `_id: f78e87147f481618`, `page:0`; benefit accurate, `prerequisite: Energy Resistance` not independently printed as an acquisition requirement.
- **PLAN:** Mutate eligible target set **before activation/DR application**, with no additional free activation, while energy mitigation remains owned by the underlying Power.

### KOTOR-FT-03 — Improved Force Stun

- **SOURCE:** printed **p.54**. A **successful** Force Stun also immobilizes the target for **one round**. **Summary:** Add a short immobilization rider when a target is affected by Force Stun.
- **PACK:** `_id: 23fdea7dfde5f293`, `page:0`; benefit text accurate, hard-coded related `Force Stun` prerequisite not separately printed in KOTOR.
- **PLAN:** Apply on **successful canonical Force Stun** (Will/CT margin), not regardless of hit; typed immobilized effect with separate one-round expiry and proper immunity admission.

### KOTOR-FT-04 — Improved Force Slam

- **SOURCE:** printed **p.54**. Convert Force Slam activation from its usual time to a **full-round action** to affect a **2-square-radius burst centered on the user**; optional FP increases radius to **4 squares**. **Summary:** Trade action economy for an enlarged, self-originating Force Slam.
- **PACK:** `_id: 1e72f9eadd438d77`, `page:0`; benefit and radius survive; pack `prerequisite` attaches to Core Force Slam without explicit printed KOTOR prerequisite.
- **PLAN:** Cost and area substitution **before** roll and targets; use Core Force Slam **actual Fortitude/Force-damage/prone** outcomes on each target. Do not silently stack cone and burst, roll an unrelated attack, or bypass action economy.

### KOTOR-FT-05 — Improved Ionize

- **SOURCE:** printed **p.54**. Spend FP when using Ionize to make target take **full ion damage**, rather than normal half damage after damage-threshold comparison. **Summary:** Bypass the normal ion-damage halving procedure for this Ionize use.
- **PACK:** `_id: c588db8cfb8b0ca3`, `page:0`; benefit text correct; `prerequisite: Ionize` not printed as a selection gate.
- **PLAN:** Scoped *Ionize-only* option in canonical ion damage processing; do not implement as unrestricted generic `ignoreDamageResistance`, and reconcile basic Ionize's **other** FP +2d6 option with once-per-round FP rules.

### KOTOR-FT-06 — Improved Kinetic Combat

- **SOURCE:** printed **p.54**. Kinetic Combat may control **up to three weapons simultaneously**, but moving and attacking with **one** weapon remains a **standard action**. **Summary:** Sustain additional telekinetic weapons without earning three free attacks.
- **PACK:** `_id: ffacc2db39746f66`, `page:0`; benefit text accurate; `prerequisite: Kinetic Combat` not independently printed as acquisition requirement.
- **PLAN:** Increase `maxControlledWeaponRefs` from one to three; preserve **one standard-action move-and-attack**, remote threat/AoO attribution, canonical equipment item identity and V2 weapon posture.

### KOTOR-FT-07 — Improved Resist Force

- **SOURCE:** printed **p.54**. On Resist Force activation, **one ally within 6 squares** may receive protection **instead of the caster**. **Summary:** Redirect a selected-Defense Force-Power ward to an ally.
- **PACK:** `_id: 5d7fede4c47f077c`, `page:0`; benefit text accurate; `prerequisite: Resist Force` has no explicit printed KOTOR prerequisite line.
- **PLAN:** Recipient substitution retains the underlying **+1/+2/+5** tier and qualified-Force-Powers-only applicability; no extra ward, no free power use.

### KOTOR-FT-08 — Improved Valor

- **SOURCE:** printed **p.54**. When Valor is activated on its ally, **the caster also gains that power's benefits**. **Summary:** Share the same Valor benefit between ally and caster.
- **PACK:** `_id: 9c5e507547e0eb72`, `page:0`; benefit correct; `prerequisite: Valor` is not separately printed as an acquisition requirement.
- **PLAN:** Dual-recipient effect projection from **one power instance**, distinct target actor IDs with common activation receipt, correct condition-limited Will defense; avoid duplicating spends or maintenance action.

### KOTOR-FT-09 — Improved Vital Transfer

- **SOURCE:** printed **p.54**. May use Core Vital Transfer on a target **within 6 squares and line of sight** instead of touch. **Summary:** Extend the reach of an otherwise unchanged healing power.
- **PACK:** `_id: 980608560ffefe9c`, `page:0`; benefit correctly described, `prerequisite` references Core Vital Transfer but selection prerequisite not printed in KOTOR.
- **PLAN:** Modify **targeting contract**, not healing amount, caster self-damage or treatment riders; consume correct Core source-verified Vital Transfer mechanics, not the still-inaccurate healing-dice pack.

### KOTOR-FT-10 — Language Absorption

- **SOURCE:** printed **p.54**. Use **Telepathy (Use the Force skill application)** to learn a creature's language, with **UtF vs Will Defense** when unwilling; spoken/understood language persists **24 hours**. **Summary:** Acquire time-limited language comprehension through telepathy.
- **PACK:** `_id: d36c0240ac48c171`, `page:0`; benefit text accurate, but `prerequisite: Telepathy` conflates **a skill application** with a selectable Force Power/feat prerequisite.
- **PLAN:** Trigger a **Use the Force Telepathy** skill application, store temporary language entitlement with recipient/caster and 24h expiry; no permanent actor-language mutation, no fictitious learned `Telepathy` Force Power; same-mind immunity and willing-target logic from skill authority.

### KOTOR Technique pack metadata disposition

| Printed page | Entries | Pack source status |
|---|---|---|
| **53** | Dominate Mind; Improved Energy Resistance | correct book name, `page:0` |
| **54** | Improved Force Stun; Improved Force Slam; Improved Ionize; Improved Kinetic Combat; Improved Resist Force; Improved Valor; Improved Vital Transfer; Language Absorption | correct book name, `page:0` |

**10/10 name matches, 0/10 correct printed pages.** There are no KOTOR-source Force Secrets. The KOTOR Techniques' current associated-power references are useful `appliesToAbilityId` **effect conditions**, but must not be automatically promoted into printed *acquisition* prerequisites without authoritative text.

## KOTOR-4. Confirmed repository ownership and discrepancies (no implementation changes)

| Repository file | Verified behavior/finding | Consequence |
|---|---|---|
| `packs/forcepowers.db` | Ten exact published names, all sourcebook labeled; all printed pages absent/wrong. *Force Scream* incorrect area, damage, status; *Resist Force* DC25 incorrect; *Wound* contains fictive fixed DC15 gate; all KOTOR Power records mark `executionModel:'FORCE_POWER'` despite varying automation readiness. | Replace printed claims in pack only **after** certified content source record is accepted; don't infer runtime certification from the execution model string. |
| `packs/forcetechniques.db` | Ten exact names, ten `page:0`; corresponding `system.prerequisite` values often duplicate `system.relatedPower` or `prerequisite_id`. | Distinguish **eligibility to select** from **ability needed to activate effect**. |
| `scripts/apps/progression-framework/steps/force-technique-step.js:660–678,1123–1155` | Before AbilityEngine, `_assessTechniqueAvailability` blocks related-power techniques when related power not currently in the actor's Force suite. `AbilityEngine` also evaluates technique `system.prerequisite` through feat prerequisite checker. | **Verified current picker gate not supplied by these printed KOTOR technique entries**; review class entitlement and source-specific selection law before adopting this restriction. |
| `data/force-powers.json` | Parallel 65-definition JSON catalog has KOTOR entries including tags; carries `Fear` misleading `area`/`standard_action`, Kinetic Combat `swift_action`. | Treat as derived/catalog evidence, not a second independent RAW authority; reachability audit before cutover. |
| `data/combat/damage-profiles.force-power.json` | Includes unverified Force Scream profile: its notes hypothesize sonic damage despite printed Force damage; Ionize typed-ion profile remains `confidence:inferred`. | Mark Force Scream's published damage type as **Force** with source reference; source-certify ion profile before accepting its CT/hit rules. |
| `scripts/engine/force/force-card-summaries.js` | Force Scream summary asserts it can **stun**. | Correct human-facing summary to printed damage + threshold effect; keep summary separate from mechanics. |
| `scripts/engine/force/force-power-final-integration.js` / phase 3–6 | Verified integration registers selected earlier Core correction handlers, but KOTOR names do not appear as source-certified dedicated runtime outcomes in that file. | **Do not assert functional automatic KOTOR execution** without complete effect-runtime audit and test. Existing general code may provide partial behavior; runtime status is **not certified**. |

### Cross-book and cross-domain rules dependencies

1. **Core + KOTOR:** Improved Vital Transfer upgrades Core Vital Transfer's targeting; Improved Force Stun upgrades Core Force Stun's verified CT effect; Improved Force Slam changes Core cone to burst and retains actual hit/miss damage logic; Dominate Mind upgrades Core Mind Trick. These are **technique modifiers of existing powers**, never new aliases or duplicate power IDs.
2. **KOTOR + Jedi Academy:** JATM *Vo'ren's Fifth Cadence* may grant temporary Kinetic Combat uses/related benefits; the KOTOR power and its attack math must remain the single mechanic owner.
3. **KOTOR + equipment/combat:** Kinetic Combat is a telekinetically **wielded real weapon**; preserve weapon identity, legal equipment posture, existing canonical attack/damage authority, controlled weapon origin, and special non-applicability of certain weapon feats/talents.
4. **KOTOR + Force descriptor admission:** Fear is both **Mind-Affecting** and **Fear**, so class immunity must preflight at the typed effect boundary; Force Scream is merely **Dark Side** and must **not** acquire an implicit Mind-Affecting/Fear immunity by its name/sound effects.
5. **KOTOR + damage:** Ionize's special ion halving/CT semantics, Force Scream's damage-threshold decrease, and Wound's **persistent** CT demand distinct, typed rules. There must be one canonical damage packet, not a new KOTOR-specific damage engine.
6. **KOTOR + talents/feat dependencies (references only):** The chapter includes *Force Flow* (temporary FP from natural 1), *Force Suppression* (Rebuke modifier), *Telepathic Link*, *Illusion*, and related Force talent trees. These are **existing talent-audit territory** and must be cross-linked at runtime integration, not recast as additional KOTOR Force Power/Technique identities. Ordinary talent names in the chapter are not additional forcepowers.
7. **KOTOR + progression:** Printed KOTOR general section permits choosing techniques from both Core and KOTOR lists when a class grants a Force Technique. The specific class slot source stays `packs/classes.db` / entitlement manifest; no content item or semantic tag may award its own prestige-class selection slot.

## KOTOR-5. Schema requirements *newly forced by this book*

These refine Section 7 of the rolling document. They are **not** a code patch, hard schema commitment or replacement of current authorities.

```text
ForcePowerDefinition.extensions:
  source: { bookKey:'knights-of-the-old-republic-campaign-guide',
            printedPage:50|51|52, sourceVerified:true }
  check: { roll:'useTheForce', defense:'fortitude|reflex|will'|null,
           successRule:'meetsOrExceeds', sizeDefenseModifier?:true,
           requireThresholdTierAfterSuccess?:true }
  target: { shape:'single|audible-radius|burst|self|ally',
            rangeSquares?:number, lineOfSight?:boolean,
            mustHearCaster?:boolean, allowsDroid?:boolean }
  results: { damagePacket?:{type:'force|ion', diceFormula,
                              perTarget:true, onHit:true },
             damageThresholdModifier?:{amount,expireAt},
             defenseModifier?:{defenses[],value,appliesToEffectDescriptors[]},
             movementPenalty?:{squares,skillPenalties[]},
             nextTurnActionRestriction?:{tier,typesAllowed[]},
             persistentConditionTrackOnActualMove?:{clearTreatment,DC} }
  maintainedInstance?: { owner, recipients[], actionCost,
                         newSkillCheckEachRound?, concentrationOnDamage,
                         breakOnExternalAttackOrDamage?, endEffectOnBreak }
  remoteWeaponControl?: { weaponItemIds[], maxConcurrent, remotePositions[],
                          attackStat:'cha', damageStat:'cha', attackCost,
                          threatRangeFromWeapon, featTalentExclusions[],
                          maxMoveSquaresPerMaintainedAttack:6 }

ForceTechniqueDefinition.extensions:
  appliesTo: { powerCanonicalId?:string, skillApplicationId?:string }
  grantsOnAcquisition: 'class-force-technique-choice'  # entitlement source, NOT item effect
  acquisitionPrerequisites: []  # only source-printed conditions, distinct from appliesTo
  effectModification: { trigger:'activation|on-success|on-hit|post-check|pre-check',
                        changesTargets?|changesArea?|changesActionCost?|
                        changesDamageTreatment?|addsEffect?|extendsDuration?,
                        conditionalMargin?:number, resourceOption?:... }

TemporalForceEffectInstance:
  sourcePowerInstanceId; ownerActorId; beneficiaryActorIds[];
  receiptId; startTurn; expiresAtTurnOrElapsedTime;
  maintainedByActionPerRound; concentrationCheckDcExpression?;
  selectedResultTier; prePaidResourceReceiptId?; typedEffectCategories[]
```

**Schema invariants:** `printedDescriptors` drive immunity and other mechanical classification; tags remain discoverability only. `sourceVerified` on the definition is not a declaration of production-executor readiness. `forceSecret`, `forceTechnique` and `forcePower` still have distinct acquisition and execution semantics. All times/ranges and numerical effects must be source-driven, not inferred from English in tags or power names.

## KOTOR-6. Required acceptance tests

- [ ] Published inventory: **10 Powers + 10 Techniques**, one canonical record per printed identity, precise source book and **printed** page; no new secrets, regimens, maneuvers, or Lightsaber Form Powers invented from this chapter.
- [ ] Every KOTOR pack row displays correct printed page, short accurate summary, descriptor, action, targets, check, tier, FP/DP rider, maintenance and special end condition; **all 20** can be reconciled without altering stable identity `_id` values.
- [ ] Force Scream: 12-square **audible radius**, not 6-square cone; hearing check per target, Fortitude + size, 1d6–4d6 **Force** damage and **−5 threshold** (−10 with FP), **no stun**. Large/+5 versus medium/+0; other sizes exactly as printed.
- [ ] Fear: swift, single visible creature 12 squares, both typed Fear and Mind-Affecting admission, Will check first then DC tier limiting next turn, FP −2 all defenses correctly timed. Class Fearless/Indomitable suppress before mutation and without guessing from power name.
- [ ] Energy Resistance: DR 5/10/15/20 only for eligible energy damage; FP activation swift; maintain swift with DC15+damage concentration; Improved Energy Resistance selects **one ally within 6** instead of caster, not in addition.
- [ ] Force Whirlwind: Fort+size gate, 1d6–4d6 end-turn Force damage, −5 (FP −10) attack/check penalties, immobilized until end, prone upon exit; maintain **move+new UtF**; allied attack/damage/CT movement breaks effect immediately. No double damage or wrong-turn expiry.
- [ ] Ionize: UtF against Reflex, DC20/25/30 ion 4d6/5d6/6d6; FP +2d6; Improved Ionize with paid FP bypasses **normal ion-damage halving**, never generic DR/SR; no free double-FP spend.
- [ ] Kinetic Combat: initial DC20, standard action, valid one-handed real weapon, BAB+CHA to-hit, dice+half heroic level+CHA damage, one remote AoO attributed to owner, 12-square tether, subsequent swift upkeep and standard move 6+single attack. Improved Kinetic Combat up to **3 held weapons** but **no three free attacks**.
- [ ] Resist Force: DC25 **+5**, not +3; only counters Force Powers, FP chooses 2 defenses; multiple instances each require their own swift upkeep; Improved Resist Force redirects one instance to ally within 6.
- [ ] Slow: Fort + size gate; each tier speed −1/−2/−3/−4 and heavy load −10 exactly on seven skills; FP −5 Fort **for this check only**, not global defense write.
- [ ] Valor: DC15/20/25/30 grants +1/+2/+5/+10 Will against **Fear/Mind-Affecting**, not all Will; FP expands applicability; maintained instances for distinct allies each charge swift/action. Improved Valor also projects the same effect to caster **without double activation**.
- [ ] Wound: uses **Fortitude defense**, no fabricated DC15; on hit 4d6 Force (6d6 with FP); persistent CT only **if real damage moves the track**, clear after DC20 Treat Injury surgery as printed.
- [ ] Dominate Mind: Mind Trick success by Will margin **≥10** unlocks directed standard action next turn, respecting the typed Mind-Affecting immunity and original Mind Trick receipt.
- [ ] Improved Force Stun: immobilize **only on successful Core Force Stun** for exactly one round, without altering its CT move formula.
- [ ] Improved Force Slam: optional full-round **self-origin burst radius 2** vs Core default cone; FP radius4, never both area shapes; original target Fortitude + damage/prone applies per target.
- [ ] Improved Vital Transfer: power targets one creature **within 6 and line of sight** using **Core canonical healing/caster cost**, rather than the false Core compendium healing dice.
- [ ] Language Absorption: unwilling creature UtF Telepathy vs Will, 24-hour temporary language use; do not produce permanent language grant, require fabricated `Telepathy` Power item, or silently award a new Force Power.
- [ ] Technique eligibility: KOTOR `appliesTo` metadata **does not become a hard acquisition prerequisite** unless separately printed or officially amended; owner may learn via class selection despite a future-use-only dependent power, while activation remains unavailable until its needed trigger exists.
- [ ] Per-power source-verification and execution-certification statuses kept separate. No script shall promote `page:0`/`page:null`, tags, derived short summaries, or `executionModel:'FORCE_POWER'` into a `sourceVerified:true` rules claim.

**KOTOR checkpoint:** **20/20 printed identities reconciled against GitHub pack identities, pp.50–54 visually checked; source-derived mechanical summary, exact book/page and pack ID recorded for each.** This is a **content/source reconciliation checkpoint**, not Foundry execution certification. All proposed schema fields remain provisional pending the rest of the book census. No GitHub mutations or commits.

**Next sourcebook proposed:** *The Force Unleashed Campaign Guide*, including any new Force Powers, Techniques, Secrets, talent/feat references, and era-specific restrictions. Keep publication attribution distinct from NPC references or Core reprints.

---

# The Force Unleashed Campaign Guide — force content and Unleashed ability source checkpoint

**Offline audit addition:** 2026-11-17. **Scope:** published Force Powers, Force Techniques, Force Secrets, the *Unleashed* feat, all Force Unleashed abilities and closely related ordinary Unleashed actions. **Authority:** uploaded *The Force Unleashed Campaign Guide* (printed pp.35-39, 85-91; TXT used for search and rendered print-PDF pages for verification). **Repository comparison:** `docflowGM/foundryvtt-swse`, `main`, inspected read-only. **Implementation:** none. **Status:** source-reconciliation and proposed contracts; not runtime certification.

## TFU-0. Identity and inventory accounting

| Printed source family | Printed claims | Production identity reconciliation | Treatment |
|---|---:|---|---|
| New regular Force Powers | **5** | 5 existing pack rows | Preserve IDs; correct content, source pages and runtime plans. |
| Reprinted Force Power, *Kinetic Combat* | **1 reprint claim** | Same KOTOR record `fp_kineticcombat` | Add publication evidence; **not** a new canonical power. |
| Force Techniques | **10** | 9 correspond to correct Force Unleashed pack rows; `Improved Force Storm` is missing as a *separate publication-specific identity* | Create one new certified identity only after cross-publication adjudication, keep JATM identity intact. |
| Force Secrets | **5** | All 5 present | Correct source pages and typed option/cost rules. |
| Force Unleashed abilities | **11** | None demonstrated as separate canonical Unleashed definitions in inspected content; plain base-power rows are not equivalents | **NEW DOMAIN FAMILY: context-triggered Unleashed overlays, not learnable Force Power items.** |
| General Unleashed abilities | **15**, Chapter 2 | Separate feat/talent/combat action dependencies | Shared Unleashed availability + DP transaction contract; actual combat actions stay owned by their domains. |
| `Unleashed` feat | **1** | Certified feat identity `bcc7f3fe56008a28` | Feat provides capability; does not award learned powers or special slots. |

**Count convention:** 5 + 10 + 5 = **20 new regular Force-domain publication claims** (19 currently have the correct matching production identity; one missing exact *Improved Force Storm* identity). Add **11 distinct Force-Unleashed ability definitions** for a total of **31 new Force-related rule definitions** in this book. The one Kinetic Combat reprint and 15 general Unleashed effects are tracked separately and must not inflate the count of new Force Power records. The five regular Force Secrets are not conflated with Unleashed variants.

**Printed pages:** *Unleashed* feat p.35; general Unleashed rules and options pp.37-39; regular Force Powers pp.85-87; Force Techniques pp.88-89; Force Secrets pp.89; Force Unleashed ability definitions pp.89-91. PDF physical page indices differ from printed page labels; examples: rendered PDF p.90 = printed p.89, PDF p.91 = printed p.90, PDF p.92 = printed p.91. Do not reuse PDF physical page as the `source.page`.

## TFU-1. Printed acquisition and execution rules — distinct domains

**Force Powers:** Characters with Force Sensitivity may learn the five new powers through ordinary Force Training selections, using the same Force suite and its normal once-per-use/recovery economy. The *Kinetic Combat* text is also printed in this book but already has a KOTOR canonical source identity. A reprint is a source claim, not a second learnable power.

**Force Techniques:** Available from qualifying prestige-class feature slots, not from owning a related Power. A technique's relationship to a base Power describes where its benefit applies; it should **not** silently become an acquisition prerequisite unless the actual printed text states one. A technique does not grant a second Force Power item.

**Force Secrets:** Qualifying prestige class gains the slot; the secret modifies a Force Power activation by spending a Force Point **or** Destiny Point as described. Resource budgets and sequencing remain the single canonical FP/DP authority's responsibility.

**The *Unleashed* feat (p.35) and optional Unleashed abilities (pp.37-39):** The feat requires a selected destiny/secret destiny; Unleashed abilities are an optional GM-approved subsystem. Use costs a **Destiny Point**. Unlike acquiring feats or Force Powers, individual Unleashed abilities **are not selected or learned in advance**; the player invokes whichever is legal at the moment. Force-related Unleashed effects additionally require Force Sensitivity and the printed associated Power/talent prerequisite. A character with Unleashed but **without** Force Sensitivity can still qualify for ordinary (non-Force) Unleashed abilities. Depending on campaign policy, the GM may restrict access to *Unleashed* until a relevant special destiny is completed; this is campaign adjudication, not an unconditional system gate.

**Consequence for the V2 architecture:** An Unleashed definition is neither a suite member nor another Force Technique, Force Secret, or Force Regimen. It is a typed **conditional activation overlay** consumed by the applicable existing Power/talent/combat action runtime, gated by feat + Force Sensitivity (Force only) + base prerequisite + destiny + permitted GM configuration and paid by a single committed Destiny Point receipt.

## TFU-2. New Force Powers — five source-to-pack records

| Printed claim | Printed page | Existing stable pack `_id` | Source-derived mechanics / disposition |
|---|---:|---|---|
| **Corruption** `[Dark Side]` | 85-86 | `fp_corruption` | Standard; visible target within 12; UtF vs Fortitude **with target-size adjustment** before tier. DC15/20/25/30: 2d6/3d6/4d6/5d6 Force damage on success, plus the specified delayed half-damage episode. FP option affects qualifying adjacent secondary targets for half initial damage **without** delayed recurrence. **Unleashed Corruption extends subsequent half-damage to five rounds, and only on successful damage.** The pack stores damage tiers but not the complete Fort + size/recurring-damage contract and has null page. |
| **Force Blast** | 86 | `fp_forceblast` | Standard; one target within 12 and sight; UtF vs Reflex, tiers DC15/20/25/30 for 2d6/3d6/4d6/5d6 damage; FP +half heroic level as a damage bonus. **Unleashed Force Blast doubles the resulting damage.** Do not infer damage type from name alone. Current pack has null page and source text in prose only. |
| **Force Shield** `[Telekinetic]` | 86 | `fp_forceshield` | Reaction self; DC15/20/25/30 grants SR5/10/15/20 until beginning of next turn; FP adds 5 SR; standard-action continuation; ends if SR reduced to zero. Must pass through canonical shield/damage mediation; no permanent armor/ship shield record. Pack has tiers and text but null printed page; its `sourceVerified` status is not established by existence of `dcChart`. |
| **Force Storm** `[Dark Side, Telekinetic]` — **FUCG publication identity** | 86 | `0707cdeac3391953`, stored display name `Force Storm (FUCG)` | Standard self, persistent adjacent vortex dealing **2d6 at end of caster's turn**; UtF DC20/25/30/35 determines duration 2/4/6/8 rounds; FP adds 2d6. **Unleashed Force Storm uses 8d6 against adjacent targets during this power's duration.** It does **not** apply to JATM's separate Force Storm acid-rain/area version `_id aef6dad242fd225b`. No printed page in current FUCG pack row. |
| **Repulse** `[Telekinetic]` | 87 | `fp_repulse` | Standard targets **all adjacent**; UtF opposed by each target's Strength + BAB + size + stability; on success move 1 square +1/5 margin; collision 1d6. FP imposes -5 Strength and adds 2d6 on qualifying collision. **Unleashed Repulse strips positive size bonus (retains penalties), doubles distance, and changes collision damage to 1d6 per square moved.** Existing pack metadata's generic `DC20` tier obscures actual opposed-check gate; source page null. |

**Cross-publication reprint, not a sixth new power:** *Kinetic Combat* appears on printed p.86. Existing canonical `_id fp_kineticcombat` claims KOTOR origin. Verify both publications' effect text and retain one authoritative power identity; append Force Unleashed p.86 as a reprint/publication claim. No Unleashed Kinetic Combat ability appears in the printed Force Unleashed ability list.

**Force Storm hard collision:** JATM Power `_id aef6dad242fd225b` has different target, area, damage and concentration. FUCG Power `_id 0707cdeac3391953` is the `Unleashed Force Storm` prerequisite and must be selected by immutable definition ID. Display labels alone are unsafe.

## TFU-3. Force Techniques — ten printed claims and the missing split identity

Techniques generally do not have independent action/cost: they modify the timing, targeting, maintenance, or resolution of an existing Power. `appliesTo.powerId` is distinct from `acquisitionPrerequisites`.

| Technique (printed pp.88-89) | Existing matching pack ID | Source-faithful rule and reconciliation |
|---|---|---|
| **Improved Battle Strike** | `023c5310a099cd41` | May apply the Battle Strike attack/damage bonuses to **all attacks of a full attack**, not only next attack. Depends on corrected Core Battle Strike. Source page currently `0`. |
| **Improved Dark Rage** | `b10cf49890093fab` | Remove Dark Rage patience/concentration skill restriction; can activate even when surprised. Source page `0`; do not globally turn off rage restrictions unless owned. |
| **Improved Force Disarm** | `770bbe7f101d98bc` | Optional full-round Force Disarm causes enemy to forgo ordinary +10 disarm Reflex bonus; resolve actual disarm, not merely drop held weapon. Source page `0`. |
| **Improved Force Thrust** | `369b9fc50f50eb03` | Optional full-round + FP converts Force Thrust to 6-square self-origin cone, preserves opposed movement and collision. Source page `0`. |
| **Improved Force Grip** | `e854adf7a0029daa` | FP as free action maintains Force Grip **one extra round** without concentration; cannot resume concentration afterward. **Confirmed broken `prerequisite_id` `f41a957f71e98a6a`; real Core Force Grip ID is `b318fc3d5dadd9f3`.** Same stale ID also appears in JATM *Extended Force Grip*. Source page `0`. |
| **Improved Force Lightning** | `ccc959a2d0f81f3d` | Optional full-round changes target movement resolution: opposed Strength + BAB + size/stability; success pushes, collision 1d6. Must compose with corrected Core Force Lightning **8d6 vs Reflex** rather than the old invalid tier table. Source page `0`. |
| **Improved Force Storm** — **Force Unleashed version** | **MISSING EXACT PUBLICATION-SPECIFIC IDENTITY** | Source: **swift action to end active FUCG Force Storm, dealing 4d6 to all targets within 2 squares of caster.** Current lone `Improved Force Storm` `_id c11b3c4336c125d5` belongs to **Jedi Academy Training Manual**, modifies its other Force Storm and has a **different 3d6/6d6** effect. Preserve JATM record, create a distinct FUCG-sourced technique, link **only FUCG Force Storm `0707cdeac3391953`**, disambiguate UI names. No name merge. |
| **Improved Mind Trick** | `4f645cbc4babfa9d` | Optional full-round converts Mind Trick to 6-square cone; FP extends to 12-square cone. Mind-Affecting admission before roll/effect; one activation receipt. Source page `0`. |
| **Improved Rebuke** | `eb43970e8b1ccebb` | Ally within 12 squares and sight can be protected by your Rebuke as though targeted; original opposing Force check and reaction economy are preserved. Source page `0`. |
| **Improved Repulse** | `a964958ffb2daa9a` | Optional full-round converts default adjacency to 2-square radius burst, or 4-square radius if FP spent. Preserve each target's opposed Strength and collision outcome. Source page `0`. |

**Verified structural defect:** 9 correctly identified Force Unleashed technique records have pack `page:0`; the tenth, FUCG Improved Force Storm, is absent as its own source identity. The `ForcePlanBuilder`'s name-based dedupe and registry name lookup are unsafe for two identically named *Improved Force Storm* techniques. **Do not replace JATM `_id c11b3c4336c125d5`.** Canonical identity must be publication-specific, while UI labels may be qualified.

## TFU-4. Force Secrets — five matching pack identities

All five existing secrets display `sourcebook:'Force Unleashed Campaign Guide'` but `page:0`. Printed section is p.89. Exact special effects must be an activation-time option with printed FP/DP alternatives, not passive modifiers.

| Secret | Pack `_id` | Printed scope and effect |
|---|---|---|
| **Corrupted Power** | `46a7fa6fae582cd4` | When DS score equals Wisdom score and source Power is **not Light Side**, FP grants Dark Side descriptor for this activation, and foes whose DS score is lower take -2 to all defenses against it; DP branch raises penalty to -5. Descriptor must be scoped to this instance, not write to permanent Power definition. |
| **Debilitating Power** | `2d663aa3b9ce2d7d` | After a damage-dealing Power meets printed conditions, FP causes an additional -1 CT step (check meets target DT as printed); alternate DP -3 CT steps. Must use actual damage / CT mutation receipt, not text tag. |
| **Enlarged Power** | `c4b6636d851bfac0` | Area Power FP doubles cone/radius reach; DP multiplies reach by 5. Change spatial intent *before* target enumeration. |
| **Pure Power** | `77631069d53b2887` | Only DS score **0**, and not on source Dark Side Power: FP gives Light Side descriptor this activation and targets with DS>=1 take -2 defenses; DP increases penalty to -5. No permanent descriptor rewrite. |
| **Remote Power** | `419f761881a9b7f8` | For self-origin cone/line/radius, FP can relocate effect origin within 6 squares; DP permits an origin anywhere in line of sight; orientation still selected as if at remote origin. Must distinguish origin from caster position and target legality. |

**Composition issue:** A Force Secret may itself spend FP or DP. An Unleashed overlay also requires DP. Their coexistence must be checked against canonical resource spending restrictions before confirming both; never commit both optimistically and refund one later. No special second resource subsystem.

## TFU-5. Eleven Force Unleashed abilities — complete printed inventory

**Printing note:** *Unleashed Battle Meditation* starts on **p.89**; *Battle Strike, Corruption, Dark Rage* are on **p.90**; the remaining seven are on **p.91**. Each **Unleashed** ability requires the Unleashed feat (`bcc7f3fe56008a28`), a destiny and GM-enabled optional rule; each of these eleven additionally requires Force Sensitivity and the named Power/talent. The feat is one unlock; none of these eleven are purchased as additional feats, learned as extra Powers or consumed as Force Secret selections. All costs are **one Destiny Point per triggered Unleashed ability**.

| Canonical proposed definition key | Printed page | Base dependency (existing identity) | Typed change to existing execution |
|---|---:|---|---|
| `unleashed-battle-meditation` | 89 | **Battle Meditation talent**, canonical talent ID to resolve from talent authority | When using Battle Meditation, expand qualifying allies from normal area to **same star system** for the benefit. No independent Power. Requires campaign/GM adjudication of scope. |
| `unleashed-battle-strike` | 90 | **Battle Strike** Power `f177dc6d65f76de9` | When the next melee attack succeeds, move that target **-2 additional CT steps**, **regardless of whether damage exceeds damage threshold**. Use the normal attack hit result; no direct pre-hit CT mutation. |
| `unleashed-corruption` | 90 | **Corruption** Power `fp_corruption` | After successful damaging activation, its additional half-damage repeats **each round for five rounds rather than one**. Persistent per-target timer; avoid reapplying the initial damage as the repeated amount. |
| `unleashed-dark-rage` | 90 | **Dark Rage** Power `fp_darkrage` | Replace normal rage bonus with **+10** on melee attack and damage for the remainder of **the encounter**, subject to rage constraints and subsequent improvements. |
| `unleashed-force-blast` | 91 | **Force Blast** `fp_forceblast` | Multiply successful Force Blast damage **by 2**. One canonical damage packet with the final multiplied amount, once per affected target. |
| `unleashed-force-grip` | 91 | **Force Grip** `b318fc3d5dadd9f3` | On success, maintain without concentration or action for **half Charisma modifier rounds, minimum one**; taking damage **still** requires the printed maintenance UtF check. Do not set infinite free maintenance. |
| `unleashed-force-lightning` | 91 | **Force Lightning** `0a422b939edfad56` | Convert targeting to **6-square cone originating at caster**, then resolve printed Core Force Lightning against each legal target. Does **not** justify keeping false old damage tiers. |
| `unleashed-force-storm` | 91 | **Force Storm (FUCG)** `0707cdeac3391953` **only** | Damage to adjacent targets is **8d6** for the original storm's duration; not +8d6 and **not** the JATM acid-rain storm `aef6dad242fd225b`. |
| `unleashed-force-thrust` | 91 | **Force Thrust** `d51bf85903366b6b` | Remove **positive** size modifiers on targets' opposed Strength checks (retain negative size penalties); **double** forced movement; when collision condition applies, **1d6 per square moved** as stated. Must resolve geometry and opposed movement first. |
| `unleashed-move-object` | 91 | **Move Object** `289013a32bd179ad` | In its existing **hurl one object/creature into another** mode, double damage. Does not double unrelated Move Object handling or grant extra modes. |
| `unleashed-repulse` | 91 | **Repulse** `fp_repulse` | As Unleashed Force Thrust: suppress target's **positive** size modifiers but retain penalties, **double** resulting push distance, and **1d6 per square moved** on collision. Use Repulse's actual adjacent multi-target opposition. |

**Result:** There are **10 Power overlays + 1 talent overlay**, not 11 additional learnable Force Powers. Each proposed definition needs `{id, sourceBook, printedPage, baseAuthorityId, triggerPhase, exactEligibility, DP cost, typedChange, effectDuration, humanSummary, sourceVerified}`. Modifier execution belongs to the underlying Power/talent action authority; source catalog is a reusable read-only definition pool.

## TFU-6. General Unleashed abilities — shared gating, different owners

The source also publishes **15 non-Force** Unleashed abilities in Chapter 2 (printed pp.37-39), which use the **same** optional-Unleashed + feat + destiny + Destiny Point mechanic but do **not** universally require Force Sensitivity. They must be inventoried for the shared feature contract, while their actual effects stay in feat, talent, species or attack/combat engines:

`Unleashed Bantha Rush`, `Unleashed Charge`, `Unleashed Cleave`, `Unleashed Devastating Attack`, `Unleashed Extreme Effort`, `Unleashed Firepower`, `Unleashed Ignite Fervor`, `Unleashed Keen Shot`, `Unleashed Mighty Swing`, `Unleashed Penetrating Attack`, `Unleashed Rage`, `Unleashed Skirmisher`, `Unleashed Sneak Attack`, `Unleashed Strafe`, `Unleashed Whirlwind Attack`.

**Architecture boundary:** The Force refactor owns the **ten Force-Power overlays and one Battle Meditation talent overlay definition**, plus integration with the **shared** feat/DP/unleashed activation gating. It does **not** absorb Bantha Rush, Strafe, Rage or other non-Force combat implementations. A single future optional Unleashed Ability registry may enumerate both families without routing non-Force effects through ForceExecutor.

## TFU-7. Repository-evidence findings and implementation status

| Evidence location | Verified observation | Required next action / severity |
|---|---|---|
| `packs/forcepowers.db` | All five new Power identities exist; **printed pages null/missing**, some critical behaviors lack complete structured checks/targets and typed duration. Kinetic Combat exists with KOTOR provenance, as expected for a reprint. | **P1 source correction:** backfill exact pages and complete source-resolution records before runtime wiring. |
| `packs/forcetechniques.db` | Nine FUCG records exist with `page:0`. Only `Improved Force Storm` record is JATM and affects the **wrong** Force Storm for FUCG's printed technique. | **P0 canonical split:** new FUCG technique identity; keep JATM record; registry/picker source disambiguation. |
| `packs/forcetechniques.db` | `Improved Force Grip` points to missing `f41a957f71e98a6a` instead of canonical Core Grip `b318fc3d5dadd9f3`; JATM `Extended Force Grip` points to same stale ID. | **P0 referential integrity:** two reference repairs, regression tests preserving original IDs. |
| `packs/forcesecrets.db` | Five FUCG secret rows present with `page:0`. | **P1:** source pages and typed FP-vs-DP activation choices. |
| `docs/audits/feat-phase-1a-canonical-identity-manifest.md` | Certified Unleashed feat `_id bcc7f3fe56008a28`, publication page **35**. | Reuse feat identity; do not invent duplicate. |
| `docs/design/force-unleashed-feat-implementation-fit.md`, `docs/audits/feat-implementation-readiness-force-unleashed.md` | Prior repository architecture expressly labels **Unleashed** as capability metadata / a **future Destiny Point + Unleashed Ability subsystem**, not implemented-correct. | **P0 design scope:** Force V2 must include the new typed Unleashed overlays and reuse feat/DP authorities. This is stronger evidence than just absent search hits. |
| `scripts/engine/force/` directory | Contains base Force runtime, phase3–6 core corrections, regimen/runtime repair, but no named Unleashed activation service in the inspected directory. | Dedicated eligibility/overlay boundary must be audited for any existing external hook before code; **not runtime-certified**. |
| `scripts/apps/progression-framework/steps/force-technique-step.js` + `ForcePlanBuilder` | Step resolves `relatedPower`/`prerequisite_id` for acquisition; plan builder dedupes techniques by normalized **name**, with a Force Power Mastery-specific exception. | **P0** separate technical `appliesTo` from genuine acquire prerequisite; robust publication identity for same-name Force Storm techniques; no duplicate suppressions. |
| `data/combat/damage-profiles.force-power.json` | Source metadata explicitly says some Force damage profiles remain inference/manual; no proof newer FUCG damage/effect is auto-correct. | No automatic certificate from a data row, tags, or a `FORCE_POWER` field. |

**Source review status != execution status**: All printed rules above are source-grounded. **The presence and/or behavior of a complete working Unleashed runtime has not been certified**; older repository documents explicitly call it unimplemented as a dedicated subsystem, and this pass has not executed Foundry v13 UI/E2E tests.

## TFU-8. Provisional V2 Unleashed contract — source-driven, no implementation yet

```text
UnleashedDefinition (not necessarily a Foundry Item document):
  id: canonicalStableId                         # one for each of 11 Force abilities
  name; family: 'unleashed-force'|'unleashed-general'
  source: { book:'Force Unleashed Campaign Guide', printedPage:89|90|91,
            sourceVerified:true }
  access:
    requiredFeatCanonicalId: 'bcc7f3fe56008a28' # feat Unleashed p35
    requiresDestiny: true
    forceSensitivityRequired: true               # Force family ONLY
    requiredBaseAbility: { domain:'force-power'|'talent', canonicalId }
    gmOptionalRuleEnabled: true
    gmDestinyCompletionRestriction?: 'adjudication'
  invocation:
    trigger: 'on-base-activation'|'after-base-success'|'after-damage'|'during-maintenance'
    basePowerUseMustBeAvailable: true             # never a free additional suite use
    destinyPointCost: 1
    resourceOwner: 'canonical-FP-DP-ActorEngine-coordinator'
    transaction: 'single-committed-resource-receipt'
    timing: 'normal-base-power-action-except-explicitly-modified'
  modifications: TypedEffectModification[]       # source-specific, NEVER tags or names
  appliesToDefinitionId; publicationKey; summary

UnleashedActivationIntent:
  actorId; baseAbilityCanonicalId; ownedBaseItemId;
  selectedUnleashedId; sourceSessionId?;
  associatedTechniqueIds[]; associatedSecretIds[];
  selectedTargets[]; originSquare; optionReceiptIds[];
  preflightResult; selectedTransformations[];
  rollIntent; committedBaseUseReceiptId?; committedDestinyReceiptId?;
  authoritativeOutcome; adjudicationStatus:'automatic'|'assisted'|'gm-required'
```

**Processing order — MUST be explicit and idempotent:**

1. Verify campaign Unleashed option and actor eligibility (`Unleashed` feat / destiny / Force Sensitivity / base power or talent). Resolve every identity by canonical ID, especially dual Force Storm.
2. Build the normal base-power activation and verify the owned use is ready. Enforce action/targets/prereqs, Light/Dark side, feat/talent/class immunity, and resource ceiling **without changing state**.
3. Apply any permitted technique/secret/Unleashed typed alterations in a **defined, source-adjudicated order** (target changes must occur before target enumeration, on-hit and on-damage effects after actual results). Reject mutually exclusive options or illegal combined resource spending preflight.
4. Charge action + base suite use + **one** DP through existing authoritative transactional/receipt infrastructure; do not invent an Unleashed currency ledger or double-charge a normal DP rider.
5. Resolve original Power with modified execution context. Use **one** canonical RollCore/attack/damage/CT/maintenance authority as applicable; never call a second power resolver that rolls twice.
6. Record time-bounded effects per target, e.g., five Corruption pulses, free Grip maintenance window, storm duration, Battle Strike next-hit CT. If outcome needs GM geometry, mark assisted and do not fabricate automation.
7. Provide GM/player chat audit using base Power, Unleashed overlay ID, committed receipt, effects, and explicit overrides. Never grant permanent Unleashed items or extras in the Force Power Suite.

**Do not commit to concrete state paths before V2 architecture review.** This is a source-typed interface sketch, not an alternate mechanic owner. Avoid migrations, shims, crosswalks and legacy name fallbacks when the clean-cutover architecture is implemented.

## TFU-9. Additional Force Unleashed cross-book dependencies

1. **Core:** Unleashed Battle Strike, Dark Rage, Force Grip, Force Lightning, Force Thrust and Move Object extend Core powers. Core pack errors must first be reconciled against printed source (especially Force Lightning and Battle Strike), otherwise Unleashed compounds bad mechanics.
2. **Jedi Academy:** Force Storm and Improved Force Storm have **two separate publication meaning/identity pairs**, despite identical printed names. Treat as a high-priority identity collision rather than `improvedForceStorm: true` on whichever actor Power name matches.
3. **KOTOR:** Earlier Kinetic Combat is reprinted at Force Unleashed p86. Preserve primary KOTOR ID and add a reprint claim. Do not count as sixth newly granted Power or add to the Force Unleashed Unleashed list.
4. **Force talent authority:** Battle Meditation is a **talent** as printed. The Unleashed modifier affects the existing talent engine, not a new Power or secret. Resolve correct canonical talent ID from talent pack before publication-specific wiring.
5. **Feat authority:** `Unleashed` is a feat, but the printed eleven Unleashed abilities are **not additional feats**. Ability access derives from one owned feat and destiny/FS, not tags and not eleven progression selections.
6. **FP/DP and Sith Lord Temptation:** Unleashed spends a **Destiny Point** (DP). Sith Lord Temptation must observe only properly committed canonical spend receipts and honor existing classified FP/DP rules; tests must include rejected/rolled-back Unleashed preflight. Protect in-flight 6U/6V/6W class PR stack before implementation.
7. **Action economy / equipment / vehicle:** Unleashed Force Blast explicitly threatens vehicles/starships in flavor and potentially damage math; only canonical damage/targeting authority decides legal vehicle damage. Forced movement and remotely manipulated weapons must preserve equipment posture, physical weapon data and vehicle domains. No standalone Force damage pipeline.
8. **Dark Side optional temptation rule, printed p85:** Separately from Unleashed, the book includes optional spending a FP to temporarily obtain a Dark Side Power use or talent with special recovery/loss rules and DSC increases. Inventory this as an **adjacent optional Force acquisition overlay** for future book-wide completion; do not confuse the two optional rule systems or build it into permanent Force Training slots.

## TFU-10. High-priority acceptance tests

- [ ] Source: five new FUCG powers, one KOTOR Power reprint, ten FUCG techniques including **unique FUCG Improved Force Storm**, five secrets, eleven on-demand Force Unleashed abilities, fifteen separate general Unleashed abilities, and one Unleashed feat. Record sourcebook and printed pages individually.
- [ ] Dual Force Storm: FUCG `0707cdeac3391953` and JATM `aef6dad242fd225b` coexist. JATM Improved Force Storm `_id c11b3c4336c125d5` preserved. FUCG Improved Force Storm defined separately and cannot select/modify JATM Storm; GUI shows clear published disambiguation.
- [ ] All preexisting stable IDs preserved; Force Grip stale pointers repaired for **Improved Force Grip** (FUCG) and **Extended Force Grip** (JATM) to Core `_id b318fc3d5dadd9f3`.
- [ ] `Unleashed` feat `_id bcc7f3fe56008a28` alone does not add suite powers or eleven forced choices. Acquiring Unleashed without Force Sensitivity still permits the **fifteen general Unleashed** options if other printed prerequisites and campaign policy are met.
- [ ] Force Unleashed options inaccessible without selected destiny, the feat, FS or base Power/talent; lack of required DP blocks **before** action and use are consumed. Configurable GM optional-rule gate fails closed if explicitly disabled.
- [ ] User can choose an Unleashed option at the moment of valid activation; no duplicate permanent Power/feat/technique Item is created. Unleashed overlay does not bypass original suite ready/spent state, action cost or class Light/Dark restriction.
- [ ] Unleashed Battle Meditation uses the existing **talent**, star-system scope requires GM adjudication, and DP is charged exactly once.
- [ ] Unleashed Battle Strike adds exactly **2 CT steps on a successfully hit next melee target** regardless of DT; no CT movement for failed attack; base Battle Strike source-correct damage and attack bonuses remain.
- [ ] Unleashed Corruption follows **five timed half-damage subsequent pulses** on successful initial damage, no stacking five immediate hits, no renewal beyond printed timing.
- [ ] Unleashed Dark Rage yields **+10 melee attack/damage for encounter**, respects ordinary rage restrictions unless Improved Dark Rage applies, and never stacks with the base rage tier as +10 plus old bonus.
- [ ] Unleashed Force Blast **doubles actual damage** once, without re-rolling base Force Power; no invented `force` type or separate independent attack domain.
- [ ] Unleashed Force Grip free maintenance **floor(CHA modifier/2), min1** only while printed duration applies; any damage still triggers maintenance check; no infinite effect.
- [ ] Unleashed Force Lightning uses 6-square cone, the printed **Core lightning check vs Reflex and fixed 8d6 Force damage**, and retains one DP receipt regardless of target count. Nothing clones one Power use per target.
- [ ] Unleashed FUCG Force Storm does **8d6**, not 2d6+8d6, against adjacent targets for storm's remaining source-defined duration and never touches JATM storm.
- [ ] Unleashed Force Thrust / Repulse: suppress positive size bonus but preserve negative penalties, double actual calculated movement, collision **1d6 per square moved** where printed; do not double damage twice with ordinary FP riders.
- [ ] Unleashed Move Object doubles **hurl collision damage only**, preserves primary/secondary target defense, size-tier, area and physical collision adjudication and does not multiply non-collision modes.
- [ ] Force Secrets (Corrupted / Pure / Remote / Enlarged / Debilitating) combine with Unleashed only if FP/DP legal and in correct phase; one source determines descriptor, target origin, damage, and CT, with at most one committed receipt per purchased option.
- [ ] Print-backed content assertions (page/description/target/activation/DC/descriptor/source) and separate live Foundry v13 execution assertions. No `sourceVerified` promotion by token matching, wiki tag or placeholder `page:0`.

**FORCE UNLEASHED CHECKPOINT:** New regular abilities: **5 powers + 10 techniques + 5 secrets = 20**; matched to correct existing identities: **19/20**; one confirmed missing variant `Improved Force Storm`. Reprint: **Kinetic Combat (1)**. Unleashed Force ability definitions: **11 (10 power overlays + 1 talent overlay)**, designated as part of the V2 Force overhaul. The shared **15 general Unleashed** abilities remain an adjacent dependency owned by feat/talent/combat. This completes the **source inventory and architectural classification**, **not** runtime certification. No changes to GitHub; no implementation.

**Next book queue:** Continue source-first with other books (e.g. Clone Wars Campaign Guide, Scum and Villainy, Legacy and Rebellion), always comparing publication claims against existing canonical records before locking shared schema. **Do not change the previous four book sections or merge Force Storm identities to satisfy name-only deduplication.**

---

# Book 6 — *The Clone Wars Campaign Guide* (2009): Force source audit

**Audit checkpoint:** v0.7, 2026-11-17. **Authority:** uploaded `SAGA EDITION - Clone Wars Campaign Guide.pdf`, printed **pp. 50–55**, inspected page-by-page against `Clone Wars Campaign Guide_djvu.txt` as a search aid. This PDF's ordinal page **51** bears printed page **50**; do **not** use the PDF ordinal as the rules citation. **Production comparison:** read-only GitHub `main`, `packs/forcepowers.db`, `packs/forcetechniques.db`, `packs/forcesecrets.db`, plus the existing Clone Wars talent Phase 2 audit. No source-data or implementation writes to GitHub.

## CW-0. Complete new-item census and scope boundary

| Published domain | Printed new items | Matching pack identities | Printed pages | Source pass |
|---|---:|---:|---|---|
| Force Powers | **8** | **8** | 50–52 | Printed rule shapes checked; pack mechanics require corrections |
| Force Techniques | **8** | **8** | 54 | All eight in pack; `page:0` invalid and related-power prereq claims suspect |
| Force Secrets | **3** | **3** | 55 | All three in pack; cost/compatibility must be explicit |
| Force Regimens | **0** | — | — | No new regimen catalog here |
| Starship Maneuvers | **0** | — | — | No new maneuver catalog here |
| Lightsaber Form Powers | **0** | — | — | None printed in this chapter; ordinary lightsaber/Force references are not new Form powers |

**New counted Force-definition claims: 19.** Separately, printed p. **53** introduces **10 Force talents** (adjacent interactions, *not* additions to the 19 Force item total), and the feat section adds **Jedi Familiarity** plus **Gunnery Specialist**, which modifies the *Starship Tactics* prerequisite/available-maneuver filter. Those belong to existing feat/talent SSOT systems and are recorded as execution dependencies below.

**Pack page quality:** the Powers have **six null pages**, plus `Cloak.page=95` and `Malacia.page=98`; none match their actual printed p. 50–52. Every Technique and Secret uses `page:0`. All 19 pack *names* match without missing publication identity. This does **not** establish that mechanics, progression legality, and runtime are correct.

## CW-1. Force Powers — printed rules, source-backed summaries, pack identities, deviations

### CW-FP-01 — Cloak

- **SOURCE:** printed **p. 50**, no bracketed descriptor; **standard action, self**. UtF **DC 15/20/25/30** yields total concealment against others, with Stealth **+0/+2/+3/+5 Force bonus** respectively, until the beginning of next turn. Maintain by another **standard action and fresh UtF roll**; damage taken while maintaining requires UtF **DC 15 + damage**. Optional FP increases the check-derived Stealth bonus by **+5**. **Summary:** Hide behind bent light and optionally strengthen the Stealth benefit; re-check to sustain.
- **PACK:** `_id 18e79be8d48946ba`, `page:95` (wrong; must be **50**); core tiers mostly correct and no printed descriptor. No verified typed distinction between total concealment, Stealth bonus, and maintenance/FP spend in V2 execution.
- **PLAN:** `selfConcealment(total)` + `stealthForceBonus(tier,optionalFP)` + maintaining roll and incoming-damage interruption. Verify invisibility/concealment in the **existing visibility/targeting authority**, not a generic `invisible` item flag that bypasses sense rules.

### CW-FP-02 — Levitate

- **SOURCE:** printed **p. 50**, descriptor **[Telekinetic]**, **move action, self**. UtF **DC 15/20/25** gives fly speed **2/4/6 squares, vertical movement only**; move during activation, may step one square onto a horizontally adjacent surface. Fall on following turn if not supported. FP permits **reaction activation when falling** and reduces falling distance by the granted fly speed; zero remaining distance means safe feet-first landing. Maintain by **move action**, with UtF **DC 15 + damage taken** when hurt or immediately fall on failure. **Summary:** Vertical Force-powered ascent/descent with optional reaction fall interception.
- **PACK:** `_id fp_levitate`, `page:null`; three speeds and optional fall reaction included in prose, but no durable distinction between vertical-only movement, floor support, reaction interrupt, and maintained concentration.
- **PLAN:** typed `temporaryVerticalFlySpeed`, vertical-only geometry and support-state guard; reaction trigger `falling`; one FP receipt; fall damage and landing authority reuse; on maintenance failure revoke flight and resolve fall through existing movement engine.

### CW-FP-03 — Malacia

- **SOURCE:** printed **p. 51**, descriptor **[Light Side]**, **standard action**, one **living** creature within **6 squares and line of sight**. UtF **versus Fortitude**; on success target moves **−1 CT** and receives **−5 damage threshold** until end of its next turn. FP enhances the damage-threshold penalty to **−10**. The **threshold penalty only** can be maintained with a new **standard action and UtF check**; after incoming damage to caster, concentration needs UtF **DC 15 + damage**. **Summary:** Impair a living target's condition and briefly lower injury threshold; extend its threshold penalty by concentration.
- **PACK:** `_id 68353e70defb7efa`, `page:98` (wrong; **51**). **CRITICAL CONTENT ERROR:** pack describes a **Fortitude save against nausea lasting one round per level**, invented effect/duration; no actual −1 CT or DT penalty. `useTheForce:20` misleading as unconditional DC; source uses target's Fortitude.
- **PLAN:** `defenseGate(fortitude)` → `conditionTrackDelta(-1)` **once on initial success** + independent `targetDamageThresholdPenalty(−5|−10,expiring/maintainable)`; maintain must **not reapply** initial −1 CT. Observe explicit Light Side descriptor; enforce living target and immunity before mutation.

### CW-FP-04 — Morichro

- **SOURCE:** printed **p. 51**, no bracketed descriptor; **standard action**; one **living creature already grabbed or grappled**. UtF versus **Fortitude**; initial and successful subsequent maintained rounds move target **−1 CT each**. At bottom CT, caster chooses **kill** or put target into a **Force trance even if unwilling**; already-unconscious target may count as willing for trance purpose. Maintain via **standard action + new opposed-defense UtF roll**. Taking damage while maintaining invokes UtF **DC 15 + damage**, and loss of grab/grapple terminates subsequent maintenance. **Summary:** Sustained physical-contact suppression of a living target that can end in death or forced Force trance.
- **PACK:** `_id fp_morichro`, `page:null`; incorrectly uses `useTheForce:20` and a flat `dcChart` DC20 despite source's **target Fortitude** resolution. `target` says grabbed only, omitting **grappled**; kill/trance choice and physical-grapple lifecycle not structured.
- **PLAN:** grappling/hold status from canonical combat, repeated `defenseGate(fortitude)` + CT mutation, **explicit GM/user decision** for final kill/trance instead of silent death, maintenance break on grapple loss. No direct ability to kill a full-HP creature without printed bottom-CT state.

### CW-FP-05 — Phase

- **SOURCE:** printed **p. 51**, no bracketed descriptor; **move action, self**. UtF **DC 25/30/35/40** provides phasing speed **2/4/6/8 squares**, never exceeding base speed, through occupied and obstructed spaces **but must end in a legal unoccupied space**. May travel this distance on activation, persists to beginning of next turn. FP adds **+2 phasing squares** subject to printed speed limit. Maintain by **move action** plus UtF **DC 15 + damage** if hurt. **Summary:** Pass through obstacles without ending illegally inside one.
- **PACK:** `_id fp_phase`, `page:null`; main speed tiers present; no evidence of enforced scene passability, base-speed cap, or end-space legality. `Improved Phase` later changes a single **move-action** endpoint, not the end-of-turn restriction.
- **PLAN:** `movementMode:phasing` with `maxEffectiveSpeed = min(baseSpeed, tier+FP)`, terrain bypass, legal final square, temporary occupancy allowed only where the printed technique permits, and maintenance-time expiry. Mark geometry-assisted when collision and wall topology cannot be resolved.

### CW-FP-06 — Rend

- **SOURCE:** printed **p. 52**, descriptor **[Dark Side]**, **standard action**, one creature or object within **6 squares and sight**. UtF **versus Reflex**; on hit deal **3d6 damage**; **natural 20 on UtF** doubles damage as a critical hit. If reducing target to **0 HP**, target is torn apart (living target killed). FP on successful check adds **2d6** damage. **Summary:** Tear apart a single target with opposed Force-driven physical damage; special critical and terminal-destruction rules.
- **PACK:** `_id fp_rend`, `page:null`; declares an invented **fixed DC15 tier**, although printed defense is **Reflex**. Missing natural-20 critical/0-HP rule in structured outcomes; damage/FP rider partially in prose.
- **PLAN:** resolve one UtF vs Reflex roll, true d20 natural result, canonical damage/critical packet, zero-HP special disposition after damage. `Improved Rend` extends range to 12 and ignores DR **for this activation**; preserve the Dark Side rules.

### CW-FP-07 — Shatterpoint

- **SOURCE:** printed **p. 52**, no bracketed descriptor; **swift action, self**. UtF **DC 25/30/35/40** reduces target damage threshold by **5/10/15/20** **against the next attack that hits before encounter end**. FP on activation additionally ignores target's DR against that attack. **Summary:** Prepare a one-hit weakness exploit affecting damage threshold and optionally DR.
- **PACK:** `_id fp_shatterpoint`, `page:null`; correct tiers, but `duration:Until end of encounter` risks incorrectly applying to **every hit** in an encounter. Printed effect is single-use-on-next-hit (with encounter expiry), not a persistent DT aura.
- **PLAN:** `armedNextSuccessfulAttack` trigger with a **one-hit** consumption receipt, one target's DT lower only for threshold evaluation, optional DR bypass in canonical damage packet. `Improved Shatterpoint` may make any CT movement triggered by that affected attack persistent (FP), but must not create a CT step by itself.

### CW-FP-08 — Technometry

- **SOURCE:** printed **p. 52**, no bracketed descriptor; **standard action**; touch **one droid or electronic device**. UtF **versus target Will**. On success, learn **one information item** according to Use Computer access-information rules; each **+5 success margin** reveals one more. If target is a **droid**, choose **instead** one of three alternatives: jam its senses to enable Stealth until end of next turn; deny Dex to Reflex for caster's next attack before end of next turn; or force it to **flee at top speed for next two turns**. FP gives **two additional information items OR one extra round** for a chosen droid rider. **Summary:** Read machine memory or temporarily disrupt a droid's perception or conduct.
- **PACK:** `_id fp_technometry`, `page:null`; incorrectly invents `DC 20=read device` and `DC 25=control droid` as a fixed DC ladder. Actual droid control is an **alternative chosen on success vs Will**, not a second 25 threshold.
- **PLAN:** `defenseGate(Will)` + mutually exclusive `informationMode` / `droidMode`, success-margin reveals, valid droid selection, timed statuses with source and target IDs, and one FP option on the chosen branch. Do not conflate real droids with arbitrary machines, or allow the memory-reading mode to double-grant control.

## CW-2. Force Techniques — eight source-verified publications

**Important printed rule:** the section states that when a class grants a technique, the character may choose from Core or this book; once learned, the choice cannot be changed. These eight **do not individually print prerequisite powers or feats**. Their associated Power is the *trigger for using the benefit*, not proof that an owned matching Power is a **hard acquisition prerequisite**. Current pack records add `system.prerequisite` and player-facing `<strong>Prerequisites:</strong>` text to each, with no matching declaration in the eight printed entries. Reconcile legality against printed rules; do not silently block class-granted technique picks based solely on `relatedPower`.

| Identity / printed p. **54** | Stable production `_id` | Source-faithful description; V2 contract | Pack concern |
|---|---|---|---|
| **Advanced Vital Transfer** | `6541b54a92f4a9ed` | While using Vital Transfer, may spend **one Destiny Point** to **fully heal target HP** and remove all its debilitating conditions. Healing/condition removal are two distinct authoritative outcomes; never stack false Core healing dice. | `page:0`; pack falsely sets hard prerequisites `Improved Vital Transfer, Vital Transfer` absent from printed technique. |
| **Improved Cloak** | `c3feb409cb7b57bf` | Maintain Cloak as a **move action** rather than standard; modifies a sustaining action, not initial activation. | `page:0`; pack asserts acquisition prerequisite `Cloak`. |
| **Improved Levitate** | `cbe485f3896fe74e` | When involuntarily forced over an edge, spend FP to reactively activate Levitate and **stop at last safe square before edge**. Normal Levitate fall-reaction ability does not itself grant this forced-movement interruption. | `page:0`; pack asserts `Levitate` prerequisite. Requires correct event/interrupt order vs Force Thrust/Bantha Rush. |
| **Improved Malacia** | `76abae492239e38c` | Maintain **only the Malacia damage-threshold penalty** as **swift** rather than standard action. Does **not** add CT damage each maintain round. | `page:0`; `prerequisite_id 68353e70defb7efa` is stable, but should be **related-power trigger** unless a true source prerequisite exists. |
| **Improved Phase** | `141ef00eb1ffc34c` | A **single move action** with Phase may end in an occupied space, but actor must **still end its turn** in legal unoccupied space. | `page:0`; pack asserts acquisition prerequisite; geometry needs separate move-end and turn-end validation. |
| **Improved Rend** | `cc09cb779cbf91e3` | Rend may reach **12 squares**; target's DR may be ignored. A context-bound power enhancement, not a persistent DR removal from target. | `page:0`; pack asserts `Rend` prerequisite. |
| **Improved Shatterpoint** | `0268b55082ae8253` | If an attack benefiting from Shatterpoint moves the target down CT, spend FP to make **that CT condition persistent**, removable by surgery or repair depending on target. | `page:0`; pack implies hard `Shatterpoint` prereq; must observe **actual** CT movement, not fabricated steps. |
| **Improved Technometry** | `956df621e64afd34` | Change Technometry activation to **full-round action**, targeting **all droids within a 6-square cone from actor's square**. Each target requires its own Will comparison; non-droid objects not affected by this alternate mode. | `page:0`; pack asserts `Technometry` prerequisite; area mode must not be generic hardware control. |

**Required separation:** `relatedPower: CanonicalForcePowerId | null` means "this technique modifies that Power when activated". `acquisitionPrerequisites: []` remains empty for these eight unless an independently printed rule provides a hard prerequisite; `activationConditions` encode actual triggered context. **Advanced Vital Transfer** is especially high-risk: the pack requires *Improved Vital Transfer* and *Vital Transfer* as acquisition prerequisites, despite the printed paragraph giving none. A *nonfunctional* technique choice before knowing the Power can be legal under the book's technique selection rule; the interface may advise but should not invent exclusion.

## CW-3. Force Secrets — three source-verified publications

The printed general rule says secrets are granted by qualifying prestige progression, are irreversible choices, and activate at FP or DP cost **as specified by the individual secret**. These are three **canonical modifier/execution events**, not standalone Force Powers; source description, applicability and spending constraints have to survive.

### CW-FS-01 — Extend Power

- **SOURCE:** printed **p. 55**. A Force Power allowing concentration can be sustained as a **swift action** instead of a standard action for **rounds equal to the caster's Charisma modifier**, at the cost of a **Force Point**. This modifies *maintenance*, not the initial activation or ordinary action economy.
- **PACK:** `_id c9fd689c1c451180`, `page:0`; summary matches but duration counter and eligibility scope are not structured. The text does not state a minimum of one round when Charisma modifier is zero or negative; no invented minimum should enter the authority.
- **PLAN:** typed `maintenanceActionOverride` with `durationRoundsFromChaModifier`, FP receipt, source-bound counter and compatibility with other maintenance improvements. Any resulting nonpositive duration must be source-/GM-adjudicated, not silently extended forever.

### CW-FS-02 — Linked Power

- **SOURCE:** printed **p. 55**. Spend a Force Point to link **two selected Force Powers**: one is used **now**, the other resolves **as a free action at start of the user's next turn**. **Neither of the two powers may be altered** by Force Techniques, Force Secrets, or spending additional Force Points. This is not an instant double activation or duplicate free suite copy.
- **PACK:** `_id 70f35597163d5735`, `page:0`; basic description correctly mentions the incompatibility, but no verified ability-level transactional enforcement, delayed event or slot-readiness checkpoint.
- **PLAN:** typed `deferredPowerActivation` with frozen source IDs, first/second suite item identity, start-of-next-turn clock, exactly-one FP receipt, legal unaltered activation plans. **Reject** linked use that also applies techniques/secrets/FP power riders; do not assume optional Unleashed DP overlay is compatible with an explicitly unalterable linked Power. Preserve consequences of interrupted turn, defeated actor, or missing second use as source-assisted/GM review rather than invent free activation.

### CW-FS-03 — Unconditional Power

- **SOURCE:** printed **p. 55**. On activating a power that **targets only self**, ignore condition-track penalties to the **Use the Force activation check**. The individual paragraph does **not explicitly state a Force Point or Destiny Point spend**, though the chapter's general secret introduction says activation costs FP or DP "as noted in its description." This is a printed-source ambiguity rather than permission to infer a cost from adjacent secrets.
- **PACK:** `_id 9c1474ec2c898ad0`, `page:0`; introduces `<strong>Cost:</strong> Force Point` even though no such line is printed within the entry.
- **PLAN:** classify **cost as `SOURCE_AMBIGUOUS` pending rules/errata adjudication**, not `forcePoint:1` by assumption. Apply only to **activation-check CT penalties**, not to all penalties, skill modifiers, roll disadvantages, attack rolls or other non-self powers. Do not consume FP unless a certified published basis/explicit table ruling exists.

## CW-4. Ten cross-system Force talents (printed p. 53): references, not additional Force items

These published abilities already belong to the talent SSOT. Their canonical printed descriptions have been recorded separately by `data/audits/talent-phase-2-clone-wars-campaign-guide-content.json`, which was directly checked as source-comparison evidence. **Do not mint parallel Force Power, Technique, or Secret entries** for them.

| Published talent | Correct book-specific interaction to retain | Required existing owner |
|---|---|---|
| **Aversion (Alter)** | Swift action and FP: enemies treat radius-two squares around actor as **difficult terrain** for encounter; **Mind-Affecting** typed effect. | Talents + movement terrain + typed immunity. |
| **The Will To Resist (Control)** | Once/turn reaction: replace Will Defense with a **Use the Force check** against Will-targeting effects; then −5 to *all UtF checks* until end of actor's next turn. | Talent and defensive-reaction roll authority; must apply post-reaction penalty. |
| **Consumed by Darkness (Dark Side)** | Swift action: −5 Will Defense for +2 Force bonus on attacks until next turn. Access to Dark Side tree conditional on DSS. | Talent state, typed attack/defense modifier, DSS tree eligibility. |
| **At Peace (Light Side)** | FP: +2 Force to all defenses until encounter end **or the actor attacks**, whichever first. Light Side tree ownership gated by DSS=0. | Talents + FP spends + attack-event termination. |
| **Attuned (Light Side)** | Natural 20 *attack roll* against DSS≥1 target triggers immediate free activation of one **[Light Side]** Force Power. Requires Focused Attack talent. | Critical attack-receipt event + talent prerequisites + Force Power suite use. |
| **Focused Attack (Light Side)** | Spend FP to reroll an attack against a DSS≥1 creature and **keep better**. | Scoped attack reroll + spend coordinator. |
| **Surge of Light (Light Side)** | Once/encounter swift action recover one **[Light Side]** power without FP; repeatable talent gains one extra use per selection. | Suite recovery + talent acquisition-instance accounting. |
| **Heightened Awareness (Sense)** | FP adds **CHA bonus** to one Perception check; each repeatable talent instance adds CHA bonus another time. | Skill roll context + repeat-instance talent grants. |
| **Psychometry (Sense)** | *Farseeing* may target a **held object** instead of creature; examine past **up to 5 years × character level**, mediated through prior holder's emotions/thoughts. Requires Force Perception and Farseeing. | Typed optional Farseeing targeting mode; existing talent prereq/provenance and GM information disclosure. |
| **Shift Sense (Sense)** | FP grants **low-light vision** for 1 minute or remainder of encounter, whichever longer. | Perception/senses and clock authority. |

**Additional Force adjacent feats in this book:**

- **Gunnery Specialist (printed feat section, preceding Force chapter):** BAB +1 prereq. Its special text expressly satisfies **Starship Tactics prerequisite qualification**. Without **both Pilot trained and Vehicular Combat feat**, its maneuver choices are restricted to printed **[gunner]** maneuvers. This is a **legality exception**, not a second grant of Starship Tactics or all maneuvers. Integrate with source-correct `[gunner]` descriptors identified during SotG book audit.
- **Jedi Familiarity (same feat section):** once/encounter when a **beneficial allied** Force Power/Talent targets or affects actor, grants **one temporary FP**, expiring encounter end. Suppressed when the effect damages or moves target down CT. Reuse existing temporary resource and receipt authority; no unconditional benefit for all Force activations.

## CW-5. Structural implications for shared V2 schema

1. **Acquisition vs activation vs maintenance vs aftermath:** the source text repeatedly separates a Power's initial Use the Force result from subsequent maintenance checks, per-round damage/CT, expiry and termination. Each must be independently scheduled; there cannot be a single undifferentiated `effect.duration` or `dcChart` placeholder.
2. **Check models:** `fixed-dc-tier` (Cloak/Levitate/Phase/Shatterpoint); `target-defense` (Malacia vs Fortitude, Morichro vs Fortitude, Rend vs Reflex, Technometry vs Will); many combine defense and separate result tiers. `system.useTheForce` numeric must never silently replace a printed target-defense comparison.
3. **Typed target categories:** living organism, droid, electronic device, held/grappled living target, object, self, area of *droids only*, valid floor or temporary phasing occupancy; source targets must be validated by shared V2 target authority (and vehicle/droid ownership where applicable).
4. **Condition-track paths:** Malacia initial −1; Morichro −1 on each maintained successful round; Rend 0-HP death aftermath; Shatterpoint **does not itself add CT**, but improved technique can turn existing step persistent. Do not rewrite general CT service.
5. **Interrupt windows:** Levitate fall reaction and Improved Levitate edge interception, The Will To Resist defensive reaction, Attuned nat20 free Force activation. These are distinct event clocks. Commit FP and suite use once and guard action economy.
6. **Different modification layers:** Techniques modify named-power actions/ranges/targeting/outcomes; Secrets modify activation/maintenance and resource phases. `Linked Power` explicitly forbids concurrent modification on either linked Power. Avoid a generic "all bonuses stack" power pipeline. Unleashed cross-book interaction requires **preflight incompatibility**, not hidden combining.
7. **Source/identity link:** add printed `book`, `page`, official `[descriptor]`, `relatedPowerCanonicalId`, `acquisitionPrerequisites` (source-backed only), and source-specific choices. `tags` may help browsing but not mechanical rule execution. Preserve all 19 existing pack IDs.
8. **Regimen + maneuver shared authority:** Clone Wars talent/feat grants must feed the already-selected canonical Force-suite and Starship maneuver systems, particularly Gunnery Specialist's exceptional `[gunner]` selection. No new store, migration shim, alias table or secondary resource ledger.
9. **One-roll identity and pending plan:** a Force activation may produce a base result, a maintenance check later, and a conditional technique/secret rider. All should reference one stable owned power/definition ID, original roll receipt, actor/target ID, action cost and source-trigger receipts; avoid repeat-cost, extra reroll, or name-collision execution.
10. **Content fidelity:** a printed `sourceVerified` claim must be attached to the *correct rule shape*, not just matching item names or author-provided hints. Preserve source contradiction for Unconditional Power as a tracked adjudication rather than silently editing RAW.

### Suggested typed subcontracts — provisional, not new engine owners

```text
ForcePowerDefinition.resolution = {
  checkMode: 'fixedTier' | 'againstDefense' | 'againstDefenseWithTiers',
  ability: 'useTheForce', targetDefense?: 'fortitude'|'reflex'|'will',
  tiers?: [{minimum:number, outcomeIds:[] }],
  targetEligibility: {living?:boolean,droid?:boolean,device?:boolean,
                      grabbedOrGrappled?:boolean,heldObject?:boolean},
  activation: {action:'standard'|'move'|'swift',reactionWindow?:string},
  maintenance?: {action, requiresNewCheck:boolean, afterDamageDC:'15+damage',
                 endsWhen?:['lost-grapple','invalid-space','failed-concentration']},
  outcomes: TypedForceOutcome[],
  resourceOptions: TypedSourceActionRiders[],
  source: {book, printedPage, verifiedClaimIds:[]}
}

ForceTechniqueDefinition = {
  canonicalId, relatedPowerCanonicalId, acquisitionPrerequisites:[],
  activationTrigger, typedPowerTransformations[], source
}

ForceSecretDefinition = {
  canonicalId, trigger, abilityScope, costPolicy:'verified'|'SOURCE_AMBIGUOUS',
  compatibility: {forbidsOtherPowerModifications?:boolean},
  typedPowerTransformations[], source
}
```

## CW-6. Regression acceptance matrix

- [ ] All **8 powers / 8 techniques / 3 secrets** have unique stable identities with printed page locators **50–55** and source-matching summaries. No source page `null`, `0`, `95` or `98` survives for Clone Wars entries in finalized production source data.
- [ ] `Cloak`: DC 15/20/25/30 total concealment with correct Stealth Force bonuses, +5 FP option and one standard maintenance action/check; concealment is not an unconditional "unseen" override to all senses.
- [ ] `Levitate`: move-action **vertical-only** speed, support/fall checks, FP falling-reaction and full printed maintenance failure consequences; immediate falling/landing does not double-charge.
- [ ] `Malacia`: one living visible target, UtF **vs Fortitude**, initial **−1 CT**, **−5/−10 DT penalty** and maintain only DT. No nausea or level-scaled duration.
- [ ] `Morichro`: only grabbed/grappled living target, UtF vs Fortitude on each round, initial and sustained CT steps, bottom-track kill/trance choice, no maintenance if grapple ends.
- [ ] `Phase`: DC progression, base-speed cap, legal turn endpoint; Improved Phase may only relax a single move-action endpoint, never permit ending turn in solid rock.
- [ ] `Rend`: UtF vs Reflex (not DC15); 3d6 with natural-20 critical and printed 0-HP outcome; FP +2d6; Improved Rend extends range and ignores target DR for this power.
- [ ] `Shatterpoint`: correctly calculated DT reduction on **one next hit**, expires encounter end, FP DR bypass, and Improved Shatterpoint requires **actual** CT decline before persistence.
- [ ] `Technometry`: UtF vs Will (not fixed 20/25) and exactly one choice of information or eligible droid control; +5 success margin yields information increments; FP modes do not grant both outputs.
- [ ] All eight Technique choices remain legally available **according to actual class grants and printed prerequisites**, not blockers derived solely from `relatedPower` or production `system.prerequisite` text.
- [ ] Advanced Vital Transfer DP uses canonical Vital Transfer healing, restores all HP and removes all qualifying conditions once; no cost leak to inactive technique.
- [ ] Improved Cloak/Malacia maintenance action substitutions occur only when the named Power is being maintained; do not affect every Force power globally.
- [ ] Improved Levitate edge interrupt works under Force Thrust and Bantha Rush and never generates duplicate turns, equipment changes, or FP receipts.
- [ ] Improved Technometry only affects droids inside a valid 6-square cone, each with its own Will threshold, and leaves non-droid machines untouched in that area mode.
- [ ] Linked Power schedules second **unmodified** ready Power for start of next turn with single FP cost; rejects combinations with Force Techniques, Secrets, FP riders and any incompatible Unleashed overlay at preflight.
- [ ] Extend Power lasts printed CHA-modifier rounds; no free extra rounds on zero/negative modifier, and no unrelated power upkeep is accelerated.
- [ ] Unconditional Power only ignores CT penalties on self-only power **UtF activation check**. FP cost is **not assumed certified** without additional primary source or documented erratum adjudication.
- [ ] Attuned natural-20/Surge of Light/Psychometry operate on **real** source descriptors and real owned Force suite copies; no creation of talents as powers.
- [ ] Gunnery Specialist qualifies for Starship Tactics by printed exception; without Pilot training + Vehicular Combat limits selections to published `[gunner]` maneuvers, but does not grant a free second feat or duplicated maneuvers.
- [ ] Jedi Familiarity: exactly one qualifying ally-beneficial effect per encounter grants temporary FP, unusable beyond encounter; damaging/CT-lowering ally effects do not trigger.
- [ ] Retain and regression-test canonical ActorEngine mutations, centralized FP/DP spends, RollCore UtF, typed class feature immunity, action economy, vehicle/droid target authority, and receipt-verified Sith Lord Temptation. No new runtime paths introduced in this source-audit stage.

**CLONE WARS CHECKPOINT:** **19/19** new five-domain definitions identified and pack-matched. **10/10** adjacent Force talents cross-referenced to the existing Clone Wars talent Phase 2 source certification. **2** major printed feat interactions noted (Gunnery Specialist and Jedi Familiarity). Multiple source-vs-pack contradictions confirmed, notably Malacia, Technometry, Morichro and Rend. `Unconditional Power` cost left unresolved as a transparent **primary-source ambiguity**. No runtime certification, no GitHub modification, no implementation. **Cumulative unique counted claims: 118 + 19 = 137, across six books** (the 10 adjacent talents are *not* double-counted).

**Next sourcebook to inspect:** *Galaxy at War* for new Force abilities and cross-system interactions. The *Jedi Academy* non-regimen Powers/Techniques, including Lightsaber Form powers, remain a required dedicated full audit after general campaign-guide census; completion of its **12 regimens** does **not** certify the rest of that sourcebook.

---

# Book 7 — *Galaxy at War* (2009): zero-new-Force-definition checkpoint

**Audit checkpoint:** v0.8, 2026-11-17. **Evidence:** uploaded `SW_Saga_Galaxy_at_War.pdf` plus `Galaxy At War_djvu.txt` (book sections and printed index); read-only `main` production Force packs and prior certified Talent Phase 2 ledger `data/audits/talent-phase-2-galaxy-at-war-content.json`. This is a **source-inventory checkpoint for the five Force domains**, not a re-certification of the book's complete feat, species or talent system.

## GAW-0. Publication census

**No new abilities are published in the five catalog categories** (*Force Powers, Lightsaber Form Powers, Force Techniques, Force Secrets, Force Regimens, Starship Maneuvers*) in this book's ability material. The current production `packs/forcepowers.db`, `packs/forcetechniques.db`, and `packs/forcesecrets.db` likewise have **zero** records sourced to *Galaxy at War*. That is **not** a missing-record defect; **do not create empty ability placeholders or rename Force feats/talents as Powers**.

| Domain | New counted definitions | Correct treatment |
|---|---:|---|
| Force Powers / Lightsaber Form Powers / Techniques / Secrets | **0** | Refer to existing canonical power definitions where talents, feats, or NPCs invoke them. |
| Force Regimens / Starship Maneuvers | **0** | No new selection domain or new maneuvers. |
| Force-related talents / feats / species | **Adjacent only** | Existing talent/feat/species authorities; inspect event contracts below. |

## GAW-1. Published cross-system interactions

| Source identity | Printed provenance | Source-shaped mechanic; integration owner |
|---|---|---|
| **Cover Escape** (Jedi Guardian talent) | **p. 18** | When Block/Deflect successfully negates an adjacent ally's melee attack using a Force Point, that ally can move **2 squares as free action** without AoO. Needs valid `negatedAttack` receipt, event-proven adjacent ally, Force Point spend and movement event. Existing talent SSOT owns acquisition; do not treat as a Force Power or new suite use. |
| **Prime Targets** (Jedi Sentinel talent) | **p. 18** | Lightsaber successful attack deals **+1 damage die** if that target has not been attacked since end of actor's previous turn. Needs combat action history and typed lightsaber attack, not always-on weapon damage. |
| **Tactical Savvy** (Leadership talent) | **p. 19** | A visible ally who spends a FP **to enhance an attack roll** receives **INT modifier bonus to the Force Point roll**, not to the attack roll itself. Source-certified prereq Born Leader in the existing talent ledger. Needs scoped FP spend/roll event, ally visibility and no double add. |
| **Mission Specialist** (feat) | **p. 24** | Choose one trained skill; nearby allies untrained in that skill obtain +2 competence. **Use the Force recipient must also have Force Sensitivity**; do not give every untrained ally a legal UtF benefit from this feat. Feat choice/source and skill context SSOT. |
| **Force of Personality** (feat) | Feat chapter, printed **p. 23** (check against print before canonicalizing page in production) | Uses **CHA or WIS modifier for Will Defense** only; does not change which ability supplies Force Training or Force Regimen Mastery slot counts. Existing feat/defense authority. |
| **Forceful Blast** (feat) | Feat chapter, printed **p. 23** (check against print before canonicalizing page in production) | Grenade/thermal-detonator knockback on Fortitude comparison. **The name does not denote a Force Power**. Combat/throwing owner, not Force registry. |
| **Dashade Force Resistance** (species) | Species section (printed-page reconciliation deferred to species authority) | Species bonus to Fortitude and Will against relevant **Use the Force checks**; source-defined scope must apply to target-defense context, not just named powers. No general Force-skill bonus. |

**Catalog boundary:** The original Force refactor must consume incoming typed attack/FP/target events for **Cover Escape, Tactical Savvy, Prime Targets** without moving their implementation into a new Force-power executor. This book demonstrates why the source census must include both **new definitions** and **source-published modifiers of existing abilities**.

**Acceptance:** zero Galaxy-at-War powers created; Cover Escape only after a truly negated attack and paid FP, Prime Targets checks target attack history, Tactical Savvy modifies FP **die** once, Force of Personality never changes WIS-based feat-entitlement grants, and Forceful Blast is kept in the grenade combat domain.

**GALAXY AT WAR CHECKPOINT:** **0 new Force-domain identities**; **7** important adjacent interaction examples recorded, with some cross-domain printed pages specifically flagged for later verification. **Cumulative counted new-definition claims remain 137.** No implementation or GitHub changes.

---

# Book 8 — *Galaxy of Intrigue* (2010): contextual Force use, no new Force-domain records

**Audit checkpoint:** v0.8, 2026-11-17. **Evidence:** uploaded `Galaxy of Intrigue.pdf`, `Galaxy of Intrigue_djvu.txt`, and matching GitHub `main` Force packs checked for publication-specific records. Full campaign-location and skill-challenge execution is **not** implemented or certified by this audit.

## GOI-0. Publication census

**Zero** new published Force Power, Technique, Secret, Regimen, Lightsaber Form Power, or Starship Maneuver definitions found in the relevant book material. GitHub's three Force packs contain **zero** records with *Galaxy of Intrigue* publication attribution. NPC references to *Farseeing, Force Thrust, Rebuke, Battle Strike, Mind Trick* and `Force Power Mastery` are **reuses** and should not generate new definitions or duplicated source identities.

## GOI-1. New relevance: Force Powers inside skill challenges

The book's **"Using Force Powers"** section establishes a contextual resolution rule: a player who invokes an *existing* published power during a skill challenge must expend its **normal suite use** and obey the power's ordinary rule conditions; a successful ordinary use can count as a skill-challenge success. A creatively proposed Force activity with no directly applicable Power/Talent can instead be adjudicated through a **Use the Force skill check** against the challenge's chosen DC, with GM discretion.

**Schema consequence:** `invocationContext:'skill-challenge'` may wrap a normal Power execution and report its outcome to the skill-challenge engine, but **must not** create a generic free Mind Trick, bypass the Power's suite spent state, or conflate a narrative UtF check with acquisition of an actual Power. Skill-challenge success/failure ledger remains the skill-challenge engine's property; Force RollCore and suite remain authoritative for the underlying Force action.

## GOI-2. Forceful Recovery feat (printed p. 27)

**SOURCE:** Prerequisites **Force Sensitivity + Force Training**. Whenever actor catches a **second wind**, choose **one expended Force Power** and return that instance to the suite.

**Mechanics:** `onSuccessfulSecondWind` event → verify learned feat by canonical ID → offer one **spent owned power instance** → canonical suite recovery → receipt; cannot create an unlearned Power, increase Power grants, or recover every copy of a repeatedly selected Power. Distinguish this **feat** from the similarly named **Force Point Recovery** *technique* (which restores a Force Point after an encounter) and from Force Focus talent.

**Repo note:** Prior cross-book feature audit flags Forceful Recovery as not yet proven runtime-implemented. This source review does not certify its live hook. Test once per legitimate second wind event and idempotent recovery on duplicate event dispatch.

## GOI-3. Nyriaan atmospheric Force interference — optional environmental modifier, not an intrinsic Power defect

**SOURCE:** The planetary Nyriaan section explicitly treats Force use **through the atmosphere** as ineffective (including long-range Farseeing, sense Force and telepathy), while ordinary Force abilities **within/near** the planet may work with an **environment-dependent power DC increase**: **0** calm, **+5** inclement conditions, **+10** strong storms, **+15** strongest tempests. These are adventure-location rules that do not change the universal definition of Farseeing or other powers.

**Schema/owner:** environmental `zoneEffect` or `scenarioRule` evaluated *before the activation check*, with clear geographic endpoints and a GM-selected weather band. A Force power crossing the named atmospheric boundary **fails**; local activation may require source-assigned check modifier; do not infer universally that every opposed Will/Fortitude/Reflex becomes +15 without a clear rules contract. If rules use a defense-gated check rather than fixed DC, the conversion of the printed environmental "DC +N" must be explicitly adjudicated or marked assisted, not blindly applied to both sides.

**Important separation:** the book also offers location-specific consumables such as Nyriaan spice (conditional Farseeing bonus with a later penalty). These belong to the **equipment/consumable/effect** authority and are **not new Force Powers**. Temporary Wisdom modifiers from equipment/conditions must not create extra permanent Force Training/Regimen/Tactics learned slots.

## GOI-4. Cross-domain regressions

- [ ] No new Galaxy of Intrigue Force-domain compendium items are minted simply because a printed NPC has familiar powers or a region affects Force checks.
- [ ] In a skill challenge, activating Mind Trick still consumes **the same owned suite copy** and observes normal targeting/Will/descriptor eligibility, then emits one result to the skill challenge; narrative freeform Use the Force checks do **not** consume a nonexistent Power use.
- [ ] Forceful Recovery feat returns exactly **one spent known Force Power** following a legitimate second-wind event. Distinct from Force Point Recovery technique and free suite recharge rules.
- [ ] Nyriaan cross-atmosphere activation is blocked when its scenario rule applies. Local 0/+5/+10/+15 bands are applied contextually, once; no global contamination of power source definitions or other planets.
- [ ] Scene/weather/target geography stays authoritative for location effects; actor/Force registry and event receipts remain SSOT for Power use.

**GALAXY OF INTRIGUE CHECKPOINT:** **0 new Force-domain identities**, with a **skill-challenge wrapper**, **Forceful Recovery feat**, and **Nyriaan scenario-specific Force interference** cataloged as adjacent authority contracts. Publication-page verification for the two environmental/skill-challenge section boundaries remains a follow-up task; no false printed page has been canonized. **Cumulative counted new-definition claims remain 137 across eight book checkpoints.** No GitHub writes and no implementation.

**Next book order:** *Scum and Villainy* / *Rebellion Era Campaign Guide* / *Legacy Era Campaign Guide* / *The Unknown Regions*, then **dedicated full Jedi Academy Training Manual** audit of all its other Force Powers, Lightsaber Form Powers, Force Techniques and Force Secrets. Do not treat the earlier regimen-only JATM checkpoint as whole-book certification.

---

# Book 9 — *Legacy Era Campaign Guide* (2008): Power and Technique census

**Checkpoint:** v0.9, 2026-11-17. **Authority:** uploaded `Star Wars Saga Edition - Legacy Era Campaign Guide.pdf`, printed **pp.53–56** checked against `Legacy Era Campaign Guide_djvu.txt`; GitHub `main` Force packs read-only. Unlike some other book PDFs, PDF **zero-based index 53 is printed p.53** for this section; page locators are based on visible printed marginal numbers, not file indices. Full runtime execution is **not** certified by this source pass.

## LEG-0. Publication inventory and reprint differentiation

| Domain | Published claims | Unique new identities | Pack match | Printed pages |
|---|---:|---:|---:|---|
| Force Powers | **10** | **9** | 9/9; one reprint | 53–54 |
| Force Techniques | **9** | **9** | 9/9 | 55–56 |
| Force Secrets | **0** | **0** | — | None in chapter |
| Force Regimens / Starship Maneuvers / Lightsaber Form Powers | **0** | **0** | — | None in chapter |

**Reprint:** *Force Shield* appears here on printed **p.54** and already exists as `packs/forcepowers.db` **`_id fp_forceshield`** attributed to *The Force Unleashed Campaign Guide*. Retain this item as **one canonical Power identity with two publication claims**. Do **not** count or duplicate it as a Legacy-origin new Power. The **Improved Force Shield** technique is genuinely **new** in Legacy and must reference that same earlier Power ID.

All nine Legacy-origin Power records currently have `system.page:null`, while all nine Technique records have `page:0`. Sourcebook string identity alone is insufficient source provenance. All nine new Power names and nine Techniques are in their correct packs; meaningful mechanical corrections are still required.

## LEG-1. Nine new Force Powers — source-to-pack ledger

### LEG-FP-01 — Ballistakinesis

- **SOURCE:** printed **p.53**, descriptor **[Telekinetic]**; **standard action**; all targets in a **2×2 area**, entirely within 12 squares and line of sight. One UtF check **vs each target's Reflex Defense**. On hit **3d8** caster-selected **bludgeoning / piercing / slashing** damage and **−2 to target attack rolls** until beginning of caster's next turn. Optional FP gives **half damage on missed targets**. Source classifies as an area attack. **Summary:** Propel debris across a small area, degrading hit targets' accuracy.
- **PACK:** `_id fp_ballistakinesis`, `page:null`; fake `dcChart:[{dc:15,3d8}]` despite source using **Reflex** on each target. Missing typed damage-type choice, −2 attack duration and FP miss rule.
- **PLAN:** `area2x2`, `perTargetDefense:reflex`, one shared UtF roll, per-target outcome damage type chosen **once**, hit debuff and conditional FP half-on-miss. Consider object/DR/cover through existing damage engine; no invented force damage.

### LEG-FP-02 — Combustion

- **SOURCE:** printed **p.53**, no bracketed descriptor, **standard action**; 2×2 area within 12 squares/line of sight. UtF **vs each target's Fortitude Defense**. Hit: **4d6 fire damage** and **catches fire**; miss: **half fire damage, no ignition**. The UtF roll becomes **the fire's attack bonus** for later burning rounds. FP may move **one target hit** −1 CT. **Summary:** Ignite a cluster with pyrokinetic fire, leaving ongoing burning hazards on hit.
- **PACK:** `_id fp_combustion`, `page:null`; false flat `dcChart:DC15`, neither multiple per-target Fortitude tests nor continuing fire roll / FP CT rider structurally represented.
- **PLAN:** per-target hit/miss damage + burning-status subservice with originating UtF roll as fire attack bonus; cap one selected hit target for optional FP CT. Fire damage must retain **fire** type, not assumed Force.

### LEG-FP-03 — Dark Transfer

- **SOURCE:** printed **p.53**, **[Dark Side]**, **standard action**, **one other living ally touched**. UtF **DC15/20/25/30** heals **1×/2×/3×/4× user's character level**. **Every use** applies **−1 persistent CT to the caster** and **+1 Dark Side Point**; the persistent CT needs **8 hours rest** to remove. Spending one FP avoids the self-CT loss, **not** the Dark Side consequence. **Summary:** Heal another living ally at a lasting personal cost.
- **PACK:** `_id fp_darktransfer`, `page:null`; healing tiers aligned, but `target:one living creature` should explicitly exclude self and require ally where printed; special mentions CT/FP but neglects required 8-hour recovery and +1 DSS. **Critical missing drawback.**
- **PLAN:** target admission + healing transaction + guaranteed typed caster persistent CT/DSS mutation, FP prevents only CT; use one existing ActorEngine/CT/DSS authority. `Improved Dark Transfer` replaces healing with recent-death revivification under a new check.

### LEG-FP-04 — Detonate

- **SOURCE:** printed **p.53**, **[Telekinetic]**, **standard action**, one **unattended object** within 12 squares and sight. UtF **DC20/25/30/35** applies **4d6/6d6/8d6/10d6** damage to that object. FP gives **+2d6 damage**. **Summary:** Fracture an unattended object through focused pressure.
- **PACK:** `_id fp_detonate`, `page:null`; tier values aligned but `special` is truncated to merely spending FP without specifying **+2d6**. Targeting must fail closed against creatures or held items, and no incidental creature splash exists without Improved Detonate.
- **PLAN:** unattended-object type guard + canonical object damage; FP additive damage dice. `Improved Detonate` introduces per-enemy area rider based on **damage actually sustained by the object**.

### LEG-FP-05 — Enlighten

- **SOURCE:** printed **p.54**, **[Light Side] [Mind-Affecting]**, **swift action OR reaction**, **one ally within 12 squares and line of sight**. UtF **check result itself** can replace **one** of that ally's attack rolls, skill checks, opposed checks, **or one Defense** before start of caster's next turn. FP prolongs eligibility to end of caster's next turn. **Summary:** Share foresight so one allied result can be replaced by the caster's UtF result.
- **PACK:** `_id fp_enlighten`, `page:null`; wrongly models `useTheForce:15` / `dcChart:DC15` as a threshold, although printed rule is a **stored roll replacement**, not a fixed DC success test. Both official descriptors are present.
- **PLAN:** one stored result receipt linked to eligible ally and expiring at printed boundary; explicit **one-use selection** among attack/skill/opposed/defense; reaction admission and typed Mind-Affecting immunity/class feature admission. FP extends window only; no static defense buff.

### LEG-FP-06 — Lightning Burst

- **SOURCE:** printed **p.54**, **[Dark Side]**, **standard action** affecting **all enemies adjacent to user**. UtF **vs each Reflex Defense**. Hit **3d6 Force damage and −1 CT**; miss **half damage, no CT**. FP adds **2d6**. May maintain for later rounds by **standard action + new UtF roll**, but **only if caster has not moved since activation**. **Summary:** Sustained self-centered lightning zone with typed force injury and condition-track decline.
- **PACK:** `_id fp_lightningburst`, `page:null`; false `dcChart:DC20`, while printed resolution uses enemy Reflex; maintenance movement restriction only in prose.
- **PLAN:** dynamically re-enumerate adjacent enemies every maintenance round, one check vs each target, source-verified Force damage (not electricity inferred by name), per-target hit-only CT, one shared FP option, caster movement invalidates upkeep.

### LEG-FP-07 — Obscure

- **SOURCE:** printed **p.54**, **[Mind-Affecting]**, **reaction** when one enemy within 12 squares and sight **has just made an attack roll**. UtF **vs target's Will Defense**; on success apply **−5 to that triggering attack roll**. If the modified roll misses, may instead force a new attack against **another creature adjacent to the attacker**, also at −5. FP applies the −5 penalty to **all that enemy's attacks until start of its next turn**. **Summary:** Reactively sabotage an enemy's aim and potentially redirect a miss.
- **PACK:** `_id fp_obscure`, `page:null`; false `dcChart:DC15`; no verified event window, Will, optional redirected attack, or once-activation FP-wide penalty. Repackaging as passive `−5 attacks` would be wrong.
- **PLAN:** `afterAttackRollBeforeOutcome` reaction, compute modified roll vs original target, conditional secondary real attack with adjacent eligible new creature, no arbitrary target swapping, Mind-Affecting admission and timeboxed FP rider.

### LEG-FP-08 — Prescience

- **SOURCE:** printed **p.54**, no descriptor, **swift action**, **one visible enemy**. UtF **DC15/20/25** gives **+1/+2/+3 insight** to caster **all defenses vs this enemy's attacks/effects** and **attack rolls vs the same enemy** until end of caster's next turn. FP may add **one other visible enemy**. **Summary:** Short-range foresight bound to one or two specific hostile identities.
- **PACK:** `_id fp_prescience`, `page:null`; correct tiers but `target:one target` too broad, source is **visible enemy**. Do not issue an unscoped all-defenses buff or unscoped attack bonus.
- **PLAN:** effect ledger stores the **enemy source/target IDs** and expiration clock. Mods are limited to attacks/from and attacks/against those exact IDs; no global inferred bonus from name.

### LEG-FP-09 — Stagger

- **SOURCE:** printed **p.54**, **[Telekinetic]**, **swift action**, **one adjacent enemy**. UtF **vs Fortitude Defense**; on success **2d6 Force damage**, push **one square away**, no AoO. FP widens scope to **all adjacent enemies**, per-target Fortitude comparisons. **Summary:** Short Force shove that harms one or all adjacent enemies.
- **PACK:** `_id fp_stagger`, `page:null`; false `dcChart:DC15`, typed push/geometry absent. `target:one target adjacent` lacks enemy constraint; FP mass-target option only in prose.
- **PLAN:** targeted or adjacent-enemy AoE options, shared UtF roll vs Fortitude per target, typed Force damage and **only-on-hit** movement one square, no AoO, legal-square and collision guard. Improved Stagger FP option increases displacement **to two** without double-spend ambiguity.

### Reprint — Force Shield, not a new tenth Legacy power

- **SOURCE:** reprinted **p.54**, descriptor **[Telekinetic]**, **reaction self**, DC15/20/25/30→SR5/10/15/20, optional FP adds 5 SR; may maintain as **standard action**; ends if SR reaches **0**. This exists before the Legacy book in Force Unleashed.
- **PACK:** `_id fp_forceshield`, sourcebook `Force Unleashed Campaign Guide`; correct direction for canonical identity but no two-publication list. Preserve stable identifier and record the Legacy source as a **reprint claim**.
- **PLAN:** `sourceClaims[]` separate from definition ownership. `Improved Force Shield` extends targets (adjacent allies via FP or occupied vehicle via DP); the vehicle SR must not stack with existing vehicle SR.

## LEG-2. Nine Force Techniques — publication claims and relationships

Printed **pp.55–56**. The introduction again grants these via qualifying prestige-class advancement and **does not print power-ownership as an acquisition prerequisite** for these nine entries. `relatedPowerCanonicalId` determines when each technique's benefit works; do not read the pack's added `prerequisite` text as independent RAW eligibility.

| Technique (printed page) | Current `_id` | Source-shaped transformation and required engine operation |
|---|---|---|
| **Detoxify Poison** (55) | `0e59f5761f3d479c` | Instead of Vital Transfer healing, compare UtF result against **poison's DC** and remove poison using Treat Injury equivalent. Mutually exclusive base-mode replacement, not heal plus poison cure. |
| **Improved Ballistakinesis** (55) | `e4a22dc082282bf4` | Optional FP changes targeted **2×2 to 3×3**; re-run area geometry/target enumeration before damage, without cloning suite use. |
| **Improved Dark Transfer** (55) | `45b8b39a3225a1b0` | FP to revive a creature dead since **end of previous turn**, UtF **DC25**. Success leaves target **unconscious and zero additional healed HP**; not ordinary Dark Transfer heal + resurrection. Respect printed Dark Side and caster-cost boundaries; explicit target time-of-death check. |
| **Improved Detonate** (56) | `2b99e97855e5f320` | Enemies **within two squares of the damaged object** test vs Reflex using same UtF; hit gets **slashing damage equal to half damage object actually suffered**. Area attack emanates from **object**, not caster; requires object packet committed before secondary target amounts known. |
| **Improved Enlighten** (56) | `ff4ddecb458e604c` | FP adds **one additional ally** to Enlighten at invocation; each consumes own one eligible roll replacement, no generic group buff. |
| **Improved Lightning Burst** (56) | `2a15d6c28e351f14` | Also compare same UtF to **Fortitude**. Target meeting **both** Reflex and Fortitude gets pushed one square and knocked prone, without AoO; failed second defense must not undo primary Force damage on Reflex hit. |
| **Improved Obscure** (56) | `aa17a16957b98653` | FP adds **+5 Force bonus to activation UtF check**; option changes chance to beat target Will in the triggered reaction, not an always-on UtF bonus. |
| **Improved Force Shield** (56) | `c0439657bb9803f3` | FP expands Force Shield SR coverage to self and **all adjacent allies**; alternatively DP protects **one vehicle occupied by caster** regardless of size, with **no stacking** with vehicle's existing SR. Two mutually exclusive options with different resource costs, authoritative occupant/vehicle lookup and vehicle shielding read; no second SR service. |
| **Improved Stagger** (56) | `f0408bd4fe0f3dda` | FP changes successful Stagger push from **one to two squares**; do not auto-hit, auto-prone, or apply double FP spending by stacking baseline/technique alternatives. |

**PACK:** all nine exist with correct names and distinct `_id` but use `page:0` and `system.prerequisite` linking to the Power. These should be split into **source-proven acquisition prerequisites** vs **related-power runtime applicability**. `Improved Force Shield` must reference the **Force Unleashed** canonical Power identity, even though the technique belongs to Legacy.

## LEG-3. Talent, consumable and cross-system Force consequences

- **Move Massive Object (Alter talent, p.55):** requires Telekinetic Power talent + Move Object; on moving Large+ object, FP allows **size-dependent area attack 2×2/3×3/4×4/6×6**, same UtF vs each Reflex, half damage on miss. This modifies the existing canonical Move Object *mode* and existing scene geometry/vehicle targets, not a new Power item.
- **Telekinetic Stability (Control talent, p.55):** spend FP to **negate involuntary movement** (Force Thrust, Stagger, Bantha Rush etc). Needs pre-mutation forced-movement interception and canonical FP spend. It must not cancel unrelated damage unless source says so.
- **Dark Preservation (Dark Side talent, p.55):** spend FP **and gain +1 DSS** to negate otherwise-occurring CT movement; requires Power of the Dark Side. Typed CT admission boundary, not condition-track rewind after unrelated trigger.
- **Death sticks (sidebar, p.56):** drug imposes **−10 UtF and prohibits Force Point spending** during its effect, among other non-Force medical/status rules. Consumable owner supplies condition; Force activation/FP preflight must honor inability to spend FP without granting/deleting permanent Force Power knowledge.
- **Disciples of Twilight** and **Ember of Vahl** tradition talents (later chapter): specialized mind-affecting/concealment/Force events must stay in the existing talent/Force tradition authority. Do not treat a named tradition talent as an additional Force Technique or a second class-grant engine.

## LEG-4. Shared V2 schema consequences

1. **Defense-gated check vs fixed DC:** Ballistakinesis (Reflex), Combustion (Fortitude), Lightning Burst (Reflex), Obscure (Will), Stagger (Fortitude) are currently filed with **fabricated fixed DC** charts. Correct to typed target defenses; retain one shared UtF result and per-target target-specific hit/miss.
2. **Damage type is printed, not inferred from name:** Ballistakinesis player chooses physical bludgeoning/piercing/slashing; Combustion is fire; Lightning Burst and Stagger explicitly Force. No generic Force damage tag inference, no electricity type solely because spell says Lightning.
3. **Reaction and delayed events:** Obscure modifies an *already-made* attack before result; Enlighten prepares a single later check/Defense replacement; Lightning Burst maintenance rechecks adjacent target set; Improved Dark Transfer checks target death time. Need typed events and clocks, no generic persistent modifier to unrelated rolls.
4. **Cross-actor personal drawbacks:** Dark Transfer self persistent CT + DSS per use, separate from ally heal transaction, with a narrow FP CT-waiver. It must not bypass class-feature immunity or refund on error without atomic planning.
5. **Conditional terrain/vehicle ownership:** Detonate targets unattended object and secondary objects' neighbors; Improved Force Shield DP uses **occupied vehicle** and nonstacking SR; never overlay generic personal shields onto a vehicle or mutate `vehicle.system.sr` from Force metadata without existing vehicle authority.
6. **Techniques modify execution not acquisition:** all nine technique entries have *usage* associations; adding relatedPower as hard prerequisite is unsupported unless separately certified. Resolve by canonical ID, not display name.
7. **Source variants and reprints:** print source claims as `{publicationKey,printedPage,claimKind:'origin'|'reprint'}` while maintaining one canonical `Force Shield` ID. Distinguish from **FUCG vs JATM Force Storm** where the printed same name describes genuinely **different abilities** that require separate identities.
8. **Force Secrets/Unleashed compatibility:** modifications to range, area, timing, damage, resource and targets must be planned before the one authoritative resource/roll receipt. Do not allow Linked Power forbidden modifications or silent double FP/DP charges.

## LEG-5. Acceptance and negative tests

- [ ] Source census exactly **nine new Legacy Force Powers + nine new Techniques**; Force Shield printed reprint does **not** become another definition. All nine Powers get printed page 53/54; nine Techniques get 55/56; no `null`/`page:0` in final publication data.
- [ ] Ballistakinesis/Combustion/Lightning Burst/Obscure/Stagger each use **per-target printed defense**, not fake fixed DC15/20; capture single roll, correct hit and miss consequences.
- [ ] Ballistakinesis choose physical damage type and apply FP half-damage on miss, without penalty on missed target.
- [ ] Combustion ignites **only hits**, half damage on miss; ongoing fire uses originating UtF roll as printed fire attack bonus; optional FP applies CT to **one hit target**.
- [ ] Dark Transfer cannot target caster, heals only printed allowed living ally, +1 DSS and −1 persistent CT to caster on every use unless FP prevents **only** CT; cannot erase drawback with routine short rest.
- [ ] Detonate only unattended object; full tiered damage and FP +2d6; Improved Detonate uses **object's suffered damage** as secondary area-half source and filters enemies within two squares.
- [ ] Enlighten only eligible ally within sight and range, replaces **one chosen attack/skill/opposed/Defense** per source and in window; FP extends to end of next turn; correct Light Side/Mind-Affecting admission.
- [ ] Lightning Burst uses all **currently adjacent enemies**, half Force damage on miss, hit CT −1, and cannot maintain if caster moved since activation.
- [ ] Obscure reaction handles check vs Will, −5 to triggering attack and optional genuine redirected attack against other adjacent creature on miss; no synthetic always-on debuff.
- [ ] Prescience targeted enemy-specific +1/+2/+3 insight modifiers expire end of next turn; optional FP adds one **visible enemy**, not all combatants.
- [ ] Stagger self-adjacent enemy Fortitude and push geometry, no AoO; optional FP all-adjacent and Improved Stagger double distance handled as source-permitted nonduplicated options.
- [ ] Improved Dark Transfer revives only within exact recent-death window on DC25 and leaves **unconscious, no heal**; source drawback and FP cost adjudicated explicitly.
- [ ] Improved Lightning Burst needs **both Reflex and Fortitude** for push/prone, while base damage/CT remains conditional on Reflex alone.
- [ ] Improved Force Shield can use FP adjacent-allies protection or DP occupied-vehicle protection, no stacking SR; integrate vehicle crew/station/occupancy SSOT.
- [ ] Talent Move Massive Object size-scaled area modes and Telekinetic Stability preflight keep base owned Force Power legal; Dark Preservation CT suppression only on committed FP/DSS alteration.
- [ ] Death-stick condition disables FP spend during effect, but does not erase owned Power suite/items or change feat entitlement calculations.
- [ ] No direct independent damage, shield, FP, DP, condition, movement or item-persistence authorities introduced by this source audit. Stage deterministic Foundry v13 runtime tests only after schema and authority decisions are approved.

**LEGACY ERA CHECKPOINT:** New publication **9 Powers + 9 Techniques = 18 unique identities**. Both packs match all eighteen identities. **1 Force Shield reprint** preserved as cross-book publication claim; **0 new Secrets, Regimens, Maneuvers or Lightsaber Form Powers**. The 18 records need major source-bound data and runtime alignment, particularly currently fake DC tiers and Improved Force Shield vehicle integration. Cumulative uniquely counted definition claims **137 + 18 = 155** across **nine** book checkpoints. No implementation or GitHub writes.

**Next:** Remaining sourcebooks *Scum and Villainy*, *Rebellion Era*, *The Unknown Regions*, and **the full Jedi Academy Training Manual non-regimen Force Powers/Techniques/Secrets and Lightsaber Form Powers**. The latter is a substantial outstanding domain and cannot be treated as complete solely because its 12 Force Regimens were checked.

---

# Rolling pack-wide crosscheck - definition census (current v1.1)

This is a **direct GitHub `main` compendium census** plus individual printed-source book checks; **source comparison is not executable runtime certification**.

| Current production domain | Current records | Printed/book identity source checked | Remaining identity findings |
|---|---:|---:|---|
| `packs/forcepowers.db` | **65** | **65/65**: Core 16, KOTOR 10, FUCG 5, Clone Wars 8, Legacy 9, JATM 17 | Major rules/metadata differences, no pack identities missing from these books |
| `packs/forcetechniques.db` | **57** | **57/57**: Core 7, KOTOR 10, FUCG 9, Clone Wars 8, Legacy 9, JATM 14 | One *additional printed FUCG Improved Force Storm variant* is **missing** as a separate ability |
| `packs/forcesecrets.db` | **15** | **15/15**: Core 5, FUCG 5, Clone Wars 3, JATM 2 | Many costs, ownership, target and timing/expiry rules need typed plans |
| `packs/forceregimens.db` | **12** | **12/12**, JATM pp10-14 | Ledger/preparation and regimen-copy count rules not mechanically certified |
| `packs/lightsaberformpowers.db` | **24** | **24/24**, JATM pp29-36 | 24/24 missing descriptors/pages, several wrong mechanics; all in same Force suite |
| `data/source/starship-maneuvers.json` | **27** | **27/27** Starships of the Galaxy | Non-compendium list with duplicate runtime owner; pilot/gunner and recovery issues |

**Current Force pack total: 173/173 records directly matched to their book's printed definition identities.** **212 counted published claims** in this document include the above source identities, the 27 maneuvers and 11 Unleashed ability overlays, but **not the missing additional FUCG Improved Force Storm variant as an already-present pack record**. The count is a rolling source-claim accounting device and is not a claim of 212 implemented/valid active runtime features.

**Source-screen boundary:** The five additional books reviewed in the v1.1 supplement section add zero identifiable new Force-domain definition sections, but character talents, species entitlements, artifacts, NPC suite copies and environmental rules still affect gameplay. An unlisted printed-page sidebar found on a future exhaustive read would require a new source claim; do not infer perfect global completeness from compendium counts alone.

**Next after source comparison:** identity freeze (especially FUCG/JATM Force Storm), strict printed provenance, mechanics content correction, acquisition versus usage gates, typed activation/transaction schemas, machine-checkable per-ability regression manifest and only then Claude implementation with the user's approval. See JATM-N7 and the final source-screen acceptance list.

---

# Jedi Academy Training Manual - non-regimen Force source certification, v1.0

**Method / scope:** Consulted the supplied image-PDF *SW Saga - Jedi Academy Training Manual (optimized).pdf*, printed pp. **24-37**, and used *Jedi Academy Training Manual_djvu.txt* as a searchable transcription aid. Reviewed current GitHub `main` `packs/forcepowers.db`, `packs/lightsaberformpowers.db`, `packs/forcetechniques.db`, `packs/forcesecrets.db`, `data/lightsaber-form-powers.json`, and `scripts/engine/registries/force-registry.js`. Already reviewed pp. 10-14 Regimens remain separate. The 57 below are the **source-identified non-regimen Jedi Academy entries**, not 57 mechanically certified implementations. Preserve pack IDs shown. The printed PDF page labels correspond to the page numbers below (e.g., PDF index 29 bears printed 29).

## JATM-N1. Printed and pack census

| Domain | Printed original entries | Current pack identity matches | Source pages | Blocking observations |
|---|---:|---:|---|---|
| Force Powers | **17** | 17/17 | 24-28 | Severe pack effect substitution in Drain Energy, Force Track, Inspire; non-verified timing/check differences elsewhere. |
| Lightsaber Form Powers | **24** | 24/24 | 29-36 | Every record's `descriptor` is empty; all 24 lack `system.page`; **Circle of Shelter** omits source tiers and form-talent rider; at least two tier sets wrong. |
| Force Techniques | **14** | 14/14 | 36-37 | Every record `page:0`; related Power often mislabeled as printed acquisition prerequisite; two techniques have malformed Force Grip pointer. |
| Force Secrets | **2** | 2/2 | 37 | Both `page:0`; FP grant plus optional DP prolongation encoded as apparent alternative payment; special lifetime/recipient rules need structured execution. |
| **New item identities** | **57** | **57** | **24-37** | No JATM identity omitted from these four pack populations; **mechanical parity is not established**. |

**Book-wide published mechanics:** The 24 Lightsaber Form Powers are part of the **same Force Power suite and Force Training allocations** as other powers, not a new suite with separate entitlement. Their printed `[lightsaber form]` descriptor is *mandatory* to use rules; user **must wield an activated lightsaber** to activate them. An associated form **talent is NOT a purchase/acquisition prerequisite**; instead, owning it grants a conditional extra effect. Lightsaber Form Powers normally **cannot be Rebuked**; **Draw Closer and Pushing Slash** are the two explicit exceptions. Source form prerequisites that require *two* lightsabers, adjacent target, free hand, terrain, charge, opponent attack trigger or one of the named form talents must be applied at the right stage. Do not convert editorial `discipline` or loose `tags` into executable descriptors.

## JATM-N2. Force Powers (17 published; 17 pack identities)

Every entry carries a **source / current identity / correction contract**. `p` = the number printed in Jedi Academy, not a PDF byte position. `PACK` issues are observed data; optional mechanics that are simply in prose require a runtime test before labeling functional. Summary clauses are derived and intentionally not full reproduced book text.

1. **Blind** - **p24**, `_id=fp_blind`; swift; one visible creature within 12 squares; `[telekinetic]`. Make **one UtF roll against target Reflex**; on success target is flat-footed to all others and grants concealment to others until start of next turn, with sightless creatures immune. FP changes activation to free. **PACK:** hardcodes `useTheForce:15` and DC15 flat-footed tier instead of the governing **opposed Reflex** test. **FIX/TEST:** model roll-vs-Reflex, concealment, immunities, reaction/no free-action default; FP timing override.
2. **Convection** - **p24**, `_id=fp_convection`; swift, self; DC15/20/25/30 grants +1/+2/+3/+4d6 **fire** to *unarmed melee* attacks until start of next turn, causes targets taking fire damage to catch fire. FP makes unarmed/grappling attackers suffer burn damage while active; swift to maintain **and reroll UtF every round**, concentration DC15+damage on damage taken. **PACK:** primary tiers largely aligned; `descriptor:[]` correct (not inherently Dark Side); `page:null`. **FIX/TEST:** use existing fire/ongoing-damage owner and contingent FP/reactive rider, not always-on unarmed enhancement.
3. **Crucitorn** - **p24**, `_id=fp_crucitorn`; reaction to attack or Force power, self; DC15/20/25/30 provides +5/+10/+15/+20 **Force bonus to damage threshold for that event only**. FP adds +5. **PACK:** tiers broadly aligned; no printed page. **FIX/TEST:** DT change must be included in the attack/Force-power damage-threshold evaluation before CT adjudication; no persistent full-encounter DT increment.
4. **Cryokinesis** - **p25**, `_id=285e0ea06e20c38a`; standard, one **unattended object** within 12 squares and sight; DC20/25/30/35 reduces DR by 5/10/15/20 until end of next turn; powered/mechanical object **also immediately** -1 CT. FP increases DR penalty +5. Swift maintain **without new UtF check**; no additional CT steps on maintenance; damaged caster concentration DC15+damage. **PACK:** marks `maintainable:true` but explicitly says new roll on each maintain - **WRONG**; object + powered-device CT rules must coexist. **Improved Cryokinesis** alone permits occupied vehicles; base cannot. **TEST:** maintenance extends DR without reroll / repeated CT damage; rejects ordinary attended item unless technique allows eligible occupied vehicle.
5. **Drain Energy** - **p25**, `_id=d5d13cf231f71929`; standard, one **powered weapon/object** within 6 and sight; DC20/25/30/35 drains power from maximum size **Small/Medium/Large/Huge** respectively; huge tier can exhaust an attached generator; unusable until energy source replaced. FP allows +1 size category (to Gargantuan). **PACK CRITICAL:** invents 2d6/4d6/6d6/8d6 **energy-damage tiers**, droid/vehicle target restriction and Dark Side claim, all unsupported by printed entry. `page:95` is wrong. **FIX/TEST:** equipment resource state, generator distinction, proper size, no automatic HP damage/CT or descriptor-induced DSS.
6. **Fold Space** - **p25**, `_id=fp_foldspace`; full-round; held/unattended object within 6/sight **or vehicle you occupy**; DC20/25/30/35/40 moves up to Medium/Large/Huge/Gargantuan/Colossal object 6/12/18/24/30 squares. Transports all contents/occupants together. FP either +2 size categories (up to Colossal cruiser) **or** double distance. **PACK:** approximate tiers, provenance missing. **FIX/TEST:** occupancy/container transaction, vehicle movement authority, no splitting occupants; **Improved Fold Space** adds sight-based FP mode and same-star-system DP mode (see p37).
7. **Force Light** - **p26**, `_id=fp_forcelight`; standard, centered self; affects only creatures **DSS 1+** beginning turn within 6 squares through end of next turn; DC20/25/30/35 inflicts **1/2/3/4d6 Force** damage and -1 attack penalty (area effect). FP +1d6. Standard maintain with new UtF and DC15+damage concentration. **PACK:** `duration` says *until start* of next turn rather than printed **end of next turn**; many effect components only in tier text/prose. **FIX/TEST:** triggered beginning-of-target-turn tick, DSS gate, maintained spatial checks, no damage to DSS0.
8. **Force Storm (JATM)** - **p26**, `_id=aef6dad242fd225b`; standard; `[dark side]`; designated 3x3/4x4/5x5/6x6 squares within 12/LOS at DC20/25/30/35; **2d6 acid** to entrants/beginning-of-turn occupants, concealment and -5 to listen Perception; ends end of next turn unless standard-maintained/rechecked, FP +2d6. **PACK:** contains correct basic acid-area concept, but missing printed concealment/Perception in tier overview and source `page:97` wrong. **IDENTITY:** this is **not** The Force Unleashed's self-centered *Force Storm (FUCG)*, and its `Improved Force Storm` must point only here. Distinct `publicationKey`/canonical IDs, not name-only joining.
9. **Force Track** - **p26**, `_id=2466fc76adef817b`; swift, **target self**; choose a creature **whose trail is in sight**, follow that recent track using Force instead of Survival for up to **one hour**. DC15/20/25/30 permits trail age <1 minute / 10 minutes / 1 hour / 1 day. FP permits tracking **two** quarry targets simultaneously. **PACK CRITICAL:** currently describes *touch-marking a creature for 24 h* with a **Will save to notice** and persistent direction reporting - all absent from print. `page:97` wrong. **FIX/TEST:** terrain/trail/time preflight and self-centered tracking, never persistent target status marker.
10. **Hatred** - **p27**, `_id=fp_hatred`; standard, self-centered 6-square area, `[dark side]`; DC15/20/25/30 causes **1/2/3/4d6 Force damage** and -1 **all defenses** to **any creature** starting its turn there (not merely enemies), through end of next turn. FP +1d6; swift maintain with fresh UtF and concentration. **PACK:** basic tiers present; provenance missing. **FIX/TEST:** area-friendly-fire and time-trigger, not immediate single burst; maintain once per round.
11. **Inertia** - **p27**, `_id=fp_inertia`; move, self; DC15/20/25/30 traverses **walls** at half-speed/full-speed/speed+2/speed+4, falls normally when unsupported at movement end. FP +2 squares. **PACK:** high-level tiers match; provenance missing. **FIX/TEST:** wall-bound path validation, fall/movement authority, no permanent flight or persistent movement mode.
12. **Inspire** - **p27**, `_id=dc331021badb59ed`; swift, `[light side]`, **all allies within 6 squares and LOS**; DC20/25/30 grants **+2/+5/+10 Force to Will vs fear/mind-affecting**, DC35 instead grants **immunity** to those effects. Expires end of next turn, swift maintained with fresh UtF. FP grants **2d6 bonus hit points to each target** on first activation, not ordinary healing. **PACK CRITICAL:** one-ally attack-roll buff, `useTheForce:15`, no tiers, and `page:98` - incorrect behavior, acquisition card and source. **FIX/TEST:** source-targeted ally set, defense/immunity tier, non-healing bonus HP, expiry, maintained re-selection and FP rider.
13. **Intercept** - **p27**, `_id=fp_intercept`; reaction, `[telekinetic]`, against incoming ranged attack. UtF vs attacker attack roll negates; Move Light Object/Move Object projectile uses opposing **UtF check** instead, cancels ongoing Move Object on successful intercept; FP permits autofire mitigation (half damage on hit, none on miss). **PACK:** generic `useTheForce:15` and DC15 negate attack incorrectly suggest no opposed-roll boundary. **FIX/TEST:** distinguish normal projectile, telekinetic thrown object, autofire area, timing and incoming attack metadata.
14. **Memory Walk** - **p27**, `_id=fp_memorywalk`; standard, `[dark side, mind-affecting]`, Int3+ creature within 6/LOS; DC20/25/30/35 **and UtF >= Will** yields 2d6 Force plus loss of swift/move/standard/standard+swift on next turn. FP +2d6; standard maintain with new check. **PACK:** tiers broadly track action loss but must enforce **Will** in addition to threshold, target intelligence and action-loss sequence. **FIX/TEST:** no penalty on failing Will, action window next target turn; descriptor immunities.
15. **Mind Shard** - **p28**, `_id=fp_mindshard`; standard, `[mind-affecting]`; one target 12/LOS; DC15/20/25/30 **and UtF >= Will** deals 2/3/4/5d8 Force, -1 CT, and prohibits **self-initiated condition improvement** through end of caster's next turn (allies may still aid). FP +2d8. **PACK:** tiers mention damage/CT but omit explicit recovery veto and Will gate from compact chart. **FIX/TEST:** condition-recovery restriction is targeted and time-limited, does not stop allied assistance.
16. **Plant Surge** - **p28**, `_id=fp_plantsurge`; standard, one within 12/sight; **plant adjacent to target required**; UtF vs Fortitude sets speed zero until end of next turn; standard escape grapple opposed to original UtF; FP gives -10 to target's escape checks; swift maintained with reroll and concentration. **PACK:** fixed DC15 row is misleading; require Fortitude comparison and terrain/plant validator. **Improved Plant Surge** changes targeting area with FP/DP.
17. **Thought Bomb** - **p28**, `_id=fp_thoughtbomb`; standard, `[mind-affecting]`, all **enemies** within 2 squares; one UtF vs **individual Will** results; on each hit 2d6 Force and no swift action on target's next turn; area effect; FP +2d6. **PACK:** fixed DC20 `useTheForce`/tier is not a published floor; targets' Will controls success. **FIX/TEST:** individual Will, area, mind-affecting immunity and separately targeted FP/DP area from technique.

**JATM Power adjudication:** An OCR mention of `DARK SIDE` in an old pack or an inferred technology/telekinetic tag is **not** a published descriptor. Official bracketed source descriptors in this book include **Blind/Intercept [telekinetic], Force Light/Inspire [light side], Force Storm/Hatred [dark side], Memory Walk [dark side,mind-affecting], Mind Shard/Thought Bomb [mind-affecting]**. `Convection`, `Cryokinesis`, `Drain Energy` and the rest without printed brackets must not inherit one from a guessed discipline. The source mixes minimum **fixed DC + defense comparison** and pure defense comparisons; a single fabricated `system.useTheForce` fixed number is not sufficient to express either.

## JATM-N3. Lightsaber Form Powers (24 published; 24 pack identities)

**Universal PACK discrepancy:** `packs/lightsaberformpowers.db` holds all 24 correct IDs but all `system.page` are null and all `system.descriptor=[]`. The pack already contains `system.form`, `bonusTalent`, `formBonus`, and `canRebuke` for most. They are content claims, not evidence of runtime execution. `forcePointCost:0` on all 24 is **not** an authority that optional Force Point riders are free: every optional FP must go through the canonical spend coordinator; verify actual caller before marking a bug. The original `data/lightsaber-form-powers.json` and a registry fallback currently coexist with the compendium: eventual **clean cutover should choose the registered compendium** as production source, not leave a second authored definition table.

| Printed power / source / pack `_id` | Form talent and source-derived base mechanic | Source-only modifiers and observed pack action |
|---|---|---|
| **Assured Strike** p29 `e6aa37dec22c4de1` | Juyo; standard single attack, roll twice keep better; damage penalties **-5/-2/-1/0** at DC15/20/25/30. | With Juyo if both miss, do **not** expend. FP permits three attack rolls. PACK tiers align broadly; must preserve suite non-consumption conditional. |
| **Barrier of Blades** p29 `4e72c40339df4765` | Shien; swift, self; substitute UtF result for Reflex versus **non-area ranged** attacks until start next turn. | Shien redirects one missed blaster bolt; FP extends to autofire with half hit/zero miss. PACK prose contains concept, needs defense-roll hook and optional redirect timing. |
| **Circle of Shelter** p29 `0501a8a8a69641c4` | Soresu; standard, **self + all adjacent allies**; DC20/25/30 gives **+1/+2/+5 deflection to Reflex** until end of next turn. | Soresu adds bonus to Block/Deflect UtF checks; FP adds bonus to adjacent allies' **Fortitude**. **PACK CRITICAL:** target wrongly `One target`, `dcChart:[]`, `bonusTalent:''`, `formBonus:''`, and `special:''`. This is a partial identity placeholder, not runnable source description. |
| **Contentious Opportunity** p29 `6ddbe69b83154ded` | Makashi; **free action at time of an attack of opportunity**, on *successful AoO* add +1/+2/+3/+4 **weapon damage dice** at **DC20/25/30/35**. | Makashi +2 Force to AoOs through end next turn. On hit FP speed -2 until **end of target's next turn**. **PACK CRITICAL:** fabricated DC15/20/25/30; rewrites as a new *single extra attack* rather than an AoO damage modifier; FP target expiry says *start*. |
| **Deflecting Slash** p30 `7ca4bee2a7ca4272` | Soresu; reaction to non-area ranged attack; UtF>=incoming attack halves damage, then single lightsaber counterattack. DC15/20/25/30 gives +0/+1/+3/+5 fixed counterattack damage. | Soresu may spend FP to Redirect Shot to another target within 6; generic FP can fully negate incoming damage. Must not spawn unrelated bonus attacks or ignore source attack history. |
| **Disarming Slash** p30 `b098c651ff8e467f` | Shii-Cho; standard; if actual lightsaber strike **deals damage**, replace disarm attack with UtF; target Reflex extra disarm defense **+10/+5/+2/+0** at DC15/20/25/30. | Successful disarm may drop weapon or pull it into free hand; Shii-Cho allows reaction on adjacent incoming melee; FP may damage disarmed weapon for same damage as struck target. **PACK CRITICAL:** wrong bonuses **+5/+2/+0/-5** (one full tier too strong), and omits disarm's initial +10 base. |
| **Draw Closer** p30 `c191d3d40fd14115` | Niman; standard; one eligible sighted enemy within 6; DC15/20/25/30 pulls up to Medium/Large/Huge/Gargantuan to adjacent legal unoccupied square, then lightsaber attack; target must not be grabbed/grappled. | Niman extends range 12; FP selects any legal adjacent destination; **[telekinetic]**, one of only two Rebuke-eligible form powers. Pack `canRebuke:true` is correct; `descriptor:[]` is not. |
| **Falling Avalanche** p31 `490de3538d814186` | Djem So; standard lightsaber strike vs foe at most one size larger; hit pushes 1/2/3/4 squares at DC15/20/25/30, user follows, no AoO, not vs grabbed/grappled. | Djem So yields a temporary FP **restricted to its talent** on activation, expiring encounter; FP rider prone after push. Actor-specific temporary-resource scope required, not ordinary FP balance. |
| **Fluid Riposte** p31 `f978615581ad4b27` | Djem So; reaction to adjacent incoming **melee**; compare UtF vs attack, halve incoming on success and counterattack after resolving damage. | Djem So limited temporary FP on success; FP treats attacker flat-footed for riposte. Model reaction/attack-commit order. |
| **Hawk-Bat Swoop** p31 `04bb0e72c31c4af6` | Ataru; standard; leap 2/4/6/8 squares without AoO at DC15/20/25/30, then single lightsaber attack if in reach. | Ataru grants extra post-attack 2-square reposition no AoO; FP +2 dice on strike. PACK tiers broadly present; verify collision/path and distinct pre/post movement. |
| **High Ground Defense** p32 `ea4a95709b854053` | Sokan; swift; while on low object/difficult terrain, adjacent movement provokes AoO; +0/+1/+2/+5 Force to AoOs at DC15/20/25/30. | Sokan +1 **damage die** on AoO; FP shifts one square after each AoO. Require square-state and AoO reaction authority. |
| **Makashi Riposte** p32 `1cba4c5e03e04c1f` | Makashi; reaction to adjacent melee, UtF vs attack, halve received damage; post-resolution melee riposte **deals half damage on miss**. | Makashi makes further attacks by target provoke AoO within reach through end next turn; FP cancels damage on successful reaction. Retain half-miss rules. |
| **Pass the Blade** p32 `26f2539dad094dc0` | Trakata; standard attack, weakens target's **Block** UtF check by **-2/-5/-10/automatic denial** at DC15/20/25/30. | Trakata ignores Lightsaber Defense deflection; FP +2d6 on hit. Target-side defense modifier must apply only to this attack. |
| **Pushing Slash** p33 `82fd64dfe76e420e` | Niman; standard lightsaber attack, then UtF vs target **Fortitude** to push 2/3/4/5 squares at DC15/20/25/30; no AoO, not grabbed/grappled. | Niman additionally pushes other adjacent enemies 1 square on independent Fortitude comparisons (**area**); FP prone after push; **[telekinetic]**, second Rebuke exception. |
| **Rising Whirlwind** p33 `78d033a5a124451d` | Jar'Kai; standard **two different targets**, one attack each; both hit => **10/15/20/25 bonus HP** at DC15/20/25/30 until encounter end. | **Two activated lightsabers** required; Jar'Kai allows 2-square inter-attack movement; FP +1d6 per hit. Do not treat bonus HP as healing. |
| **Saber Swarm** p34 `230f01f3948f46d2` | Ataru; standard **two attacks against same enemy**, each -5/-2/-1/0 at DC20/25/30/35. | Ataru forces -5 to opponent Block/Makashi Riposte UtF checks; FP grants 2-square pre- or post-movement no AoO. One activation, two attack outcomes. |
| **Sarlacc Sweep** p34 `1592f10bfdc343fb` | Shii-Cho; standard; attack main foe and secondary adjacent foe; secondary takes **5 / 5+1d6 / 5+2d6 / 5+3d6** if primary hits at DC15/20/25/30. | Shii-Cho enables charge-attack substitution and Powerful Charge initial effect; FP permits two secondary targets. Requires attack-target distinction. |
| **Shien Deflection** p34 `06796f6ae7f54bad` | Shien; reaction to **non-area** incoming ranged attack; UtF>=attack means half incoming damage, move speed/speed+2/+4/+6 toward attacker at DC15/20/25/30 then melee strike in reach. | Shien suspends cumulative Deflect penalties until next turn; FP can cancel incoming damage entirely on successful UtF. PACK broad tiers present; defend-then-move-then-attack ordering essential. |
| **Swift Flank** p35 `f6d39deb2c014105` | Vaapad; standard, move half/full/+2/+4 at DC20/25/30/35, no AoO, then lightsaber attack; moving origin and destination can create flank. | Vaapad renders target flat-footed against user until end turn; FP +2 movement. No fake flanking state granted unless geometry passes. |
| **Tempered Aggression** p35 `1f33aa00c537456c` | Vaapad; `[dark side, lightsaber form]`; standard attack; UtF DC30/35/40 and attack beats Reflex by **10/5/2** => critical hit. | Vaapad talent suppresses **only for this actor** the `[dark side]` descriptor; FP +2 extra damage dice *after critical doubling*. PACK has `dark-side` tag but `descriptor:[]`. Wrong descriptor would affect DSS and light/dark restrictions. |
| **Twin Strike** p35 `73edecc720b74ede` | Jar'Kai; standard, **two lightsabers required**, make **one** attack; hit adds the **base damage dice** of offhand saber; DC15/25/30 gives +0/+1/+2 Force to hit. | Jar'Kai triples existing Lightsaber Defense deflection rather than doubles through end next turn; FP +1 damage die. No second attack and no offhand modifier duplication. |
| **Unbalancing Block** p35 `20cbf0beae6a4f62` | Trakata; reaction to incoming adjacent melee; UtF vs incoming attack halves damage on hit and UtF vs attacker Will makes it flat-footed to end next turn. | Trakata increases **first next-turn** attack by +2 damage dice; FP may fully negate incoming damage. Requires two different comparisons from one roll. |
| **Unhindered Charge** p36 `6e1e408116fb4bdc` | Sokan; standard, ignore difficult terrain and low obstacles for speed/speed+2/+4/+6 at DC15/20/25/30, then attack if within reach. | Sokan +5 Reflex versus movement AoO; FP +2 more squares. Must not disable all AoO unless another power says so. |
| **Vornskr's Ferocity** p36 `ad3d03c603384434` | Juyo; `[dark side, lightsaber form]`; standard attack +1/+2/+3/+4 damage dice at DC20/25/30/35. | Juyo suppresses dark-side descriptor for its owner; FP permits this power at end of a charge. Pack has `dark-side` tag but no authoritative printed descriptor. |

**Important form tier-order defects verified by direct printed comparison:**

- `Circle of Shelter`: **source DC20/25/30** vs no compendium `dcChart` at all; lost targets, form bonus, and FP Fortitude option. This must block any "all form powers mechanically complete" sign-off.
- `Contentious Opportunity`: **source DC20/25/30/35**, existing pack **DC15/20/25/30** and incorrectly frames a new attack, rather than modifying a triggering attack of opportunity. This is a genuine resource/combat action violation.
- `Disarming Slash`: **source target Reflex +10/+5/+2/+0**, existing **+5/+2/+0/-5**. The attack must actually deal damage before the disarm check; cannot allow automatic +5 easier-than-printed at highest tier.
- Published `[lightsaber form]` descriptor applies to **24/24**; `[telekinetic]` additionally to Draw Closer and Pushing Slash; `[dark side]` additionally to Tempered Aggression and Vornskr's Ferocity. Current `system.descriptor: []` on **24/24**, though some tags approximate this information; tags do not certify mechanics. Ability display should render both default descriptor(s) and conditional actor-specific suppression for Vaapad/Juyo.
- `Rising Whirlwind` and `Twin Strike` explicitly demand two lightsabers; `Pass the Blade`/Trakata uses deliberate blade deactivation in its attack but requires an activated lightsaber when initiating the power. Do not impose a form-talent prerequisite on other users.

## JATM-N4. Force Techniques (14 published; 14 pack identities)

**Published acquisition rule p36:** Force techniques are gained through eligible class-level feature entitlements, not automatically from knowing the Power mentioned in the text. The technique's associated Power is a **usage dependency**. Do not silently interpret each `system.prerequisite` in this pack as an official acquisition prerequisite. Preserve explicit mechanical requirements of the effect itself. All 14 records currently `page:0`.

| Published technique / page / current `_id` | Printed effect (derived paraphrase) | Pack comparison / required execution |
|---|---|---|
| **Cure Disease** p36 `e7b5e988e305e2cf` | Vital Transfer against a diseased target; if UtF >= Treat Injury disease DC, may spend FP to cure. | Stored `relatedPower:Vital Transfer` and bracketed pointer. Healing event must produce disease-cure branch, not heal+free cure. |
| **Extended Blind** p36 `c152de01ea34e982` | Base Blind range becomes **18** instead of 12. | Correct benefit; modifier applies to Blind only. Do not require prior Blind ownership to learn unless separate printed class prerequisite is established. |
| **Extended Force Disarm** p36 `c883cd4adee97196` | Base Force Disarm range to 18. | Correct benefit; must use source-specific base power ID and preserve disarm rules. |
| **Extended Force Grip** p36 `6cced906971cc03e` | Base Force Grip range to 18. | **Dangling `prerequisite_id=f41a957f71e98a6a`** rather than actual Core `Force Grip _id=b318fc3d5dadd9f3`; direct reference validation needed. |
| **Extended Force Thrust** p36 `1fcb60caf63bc0f1` | Base Force Thrust range to 18. | Correct benefit; no global range bonus or blanket telekinetic upgrade. |
| **Extended Move Object** p36 `be320ea699405714` | Base Move Object range to 18. | Correct benefit; not a Move Light Object skill upgrade. |
| **Improved Convection** p36 `fb8aaef7f92ee63c` | Convection-caused ongoing fire uses user's **BAB** as attack bonus rather than standard **+5**, attacks Fortitude. | Pack text close; fire attack owner must accept source-specific BAB value, not repeated direct heat packets. |
| **Improved Crucitorn** p37 `e20361353ef86276` | If incoming attack/power damage **still exceeds DT**, Crucitorn use **remains in Force suite** instead of spent. | Conditional post-resolution non-consumption; do not refund if the triggering attack *failed* to exceed DT. |
| **Improved Cryokinesis** p37 `f65237526f3017ad` | Allows otherwise barred **occupied vehicles** within range; CT moves only if UtF >= **vehicle Fortitude**. | Changes *target gate* plus one condition; base unoccupied-object DR remains and must use vehicle condition owner. |
| **Improved Fold Space** p37 `bb3f1f5adcb3fcf0` | FP sends object to anywhere in **line of sight**; **alternatively DP** sends it anywhere in the **same star system**. | Pack `benefit` contains FP mode **only**; DP alternative missing from current benefit. Check full `description`/source before syncing certified field. Cross-sector teleport remains prohibited. |
| **Improved Force Light** p37 `bfe968d89f970bf5` | FP causes Force Light damaged victims to **grant concealment to others** until end of their next turn; DP upgrades to **total concealment**. | `benefit` stores FP, DP alternative absent from `benefit`; requires target-local delayed status and DP option. |
| **Improved Force Storm (JATM)** p37 `c11b3c4336c125d5` | FP adds targeted **Force lightning** inside *this book's acid-storm zone*, UtF vs one victim's Reflex on activate or maintain => **3d6 Force**; optional DP upgrades to **6d6**. | Existing pointer correctly targets JATM `aef6dad242fd225b`. **Not** FUCG's different Improved Force Storm technique: that printed variant is still missing its own identity. Do not make name-keyed global storm enhancer. |
| **Improved Plant Surge** p37 `7dd564fffb4fe1a1` | FP expands plant surge to enemies in **5x5** region; **alternatively DP** makes **10x10** region. | `benefit` stores FP area, DP alternative not represented in main benefit. Plant adjacency and Fortitude still apply to each target. |
| **Improved Thought Bomb** p37 `91afabf997a947a2` | FP extends from within 2 to **5-square** enemy radius; **alternatively DP** targets **all enemies in line of sight**. | `benefit` stores FP radius but not DP line-of-sight mode; target-list expansion, not new damage. |

**Repeated high-severity data normalization issue:** 14/14 techniques use printed `page:0` rather than 36/37. At least **five** technique descriptions/effects contain high-impact FP-vs-DP branch alternatives that cannot safely be collapsed into `benefit` (Fold Space, Force Light, Storm, Plant Surge, Thought Bomb). All 14 have valid separate pack IDs; don't merge their authoring identities with their related Power. The Force Grip pointer defect is real and also occurs in FUCG's `Improved Force Grip` (reported earlier); fix through one canonical ID authority after auditing both.

## JATM-N5. Force Secrets (2 published; 2 pack identities)

**Force Secrets general rule p37:** Spending a Force Point or Destiny Point must respect canonical **per-round resource limitations**. A secret's individual choices can involve *an FP to initiate and optional DP to extend*, which is NOT interchangeable as `cost: "Force Point or Destiny Point"`.

1. **Holocron Loremaster**, printed **p37**, pack `_id=d573b20c7ef3b99b`. Whenever the owner activates a Power, **spend FP** to temporarily add to *owner's Force suite* one use of **any Force Power known by any ally within 12** (no need for owner to know it). This borrowed power **cannot be recovered by any means** after use, vanishes at end of **owner's next turn** if unused; **optional DP** prolongs availability to end of encounter. Separate story/equipment function: can add owner's knowledge to a possessed holocron and create gatekeeper in own image, per p67 artifact procedure. **PACK:** metadata benefit covers FP/lifetime, description covers DP; `cost:'Force Point or Destiny Point'` is misleading as a choice to activate. Needs transient **nonrecoverable suite-instance identity** with origin/expiry and no permanent known-power grant; holocron interaction is a distinct equipment/campaign operation.
2. **Mentor**, printed **p37**, pack `_id=9b1346beabbd68bd`. Whenever owner activates a Power, **spend FP** to grant one temporary use of **that same Power** to one visible ally within 12. Granted use **cannot be recovered by any means** and expires end of **recipient ally's next turn** if unused. **Owner OR recipient may spend DP** to extend expiry to end of encounter. Actual **printed acquisition prerequisite**: successfully trained an apprentice to knighthood (or equivalent Force-tradition rank). **PACK:** prerequisite text correct; main benefit omits DP branch represented in description; `cost:'Force Point or Destiny Point'` falsely suggests optional DP can replace the FP initiating cost. Separate owner vs recipient transactions and expiration clocks mandatory.

**Force Secret negative tests:** (a) do not add permanent actor Force Training slots; (b) no recovery via Force Point, natural-20 or rest; (c) use unique token instance even when its canonical Power appears elsewhere in suite; (d) expire at correct **owner** vs **ally** next turn; (e) DP is an *extension*, not alternative initiation payment; (f) no transfer of entire power inventory or infinite duplication; (g) enforce Mentor's printed apprenticing prerequisite, but do not infer unrelated campaign requirements for Holocron Loremaster.

## JATM-N6. Verified repository integration blockers and preservation boundaries

1. **Single suite already intended:** `scripts/engine/registries/force-registry.js` lines ~238-245 loads `lightsaberformpowers` as `type:'power'` into the same Force Power domain; `scripts/apps/progression-framework/steps/force-power-step.js` has separate display categories but same entitlement path. **Retain this correct intent**, not a new Form Power entitlement pool.
2. **Dual-definition fallback:** `force-registry.js` lines ~260-271, 332-371 loads **a second `data/lightsaber-form-powers.json`** if a compendium pack is unavailable. This is directly observable **compatibility behavior**, contrary to requested strict V2 final cutover. Plan: certify pack availability, remove this fallback at the agreed implementation phase, fail clearly if canonical pack missing; don't silently swap to synthesized IDs for legal progression.
3. **Name-only uniqueness risk:** `force-registry.js` `_indexEntry` lines ~298-316 stores `type:name:` uniqueness and returns early on same normalized name, even if source/ID differs. Current packs use distinct display `Force Storm` vs `Force Storm (FUCG)` and therefore are **not proven currently discarded**, but an innocent display-name canonicalization would cause one published variant to disappear. Replace identity with canonical source/content ID and separate publication variant discriminator; store search/display aliases without legal dedup.
4. **Descriptors and activation:** `system.descriptor` is empty across all 24 Form Powers, despite 24 printed `[lightsaber form]` and four additional specialized descriptors. The registry injects `lightsaber-form` **tags** on pack load, but this is not equivalent to an authoritative descriptor and its rules (active weapon, Rebuke policy, moral consequences). Decide typed `descriptors` as primary mechanical authority with certified values; show the named talent conditional suppression.
5. **Critical data vs renderer:** `Circle of Shelter` empty `dcChart`, missing Soresu and FP rider; `Contentious Opportunity` wrong DC thresholds/trigger; `Disarming Slash` wrong defense bonuses; all 24 `page:null`. Treat these as high-priority **source data remediation** before claiming macro/engine bugs. Downstream automation must consume corrected canonical fields, not hardcoded per-power patch maps.
6. **Attack integration:** Form Powers can contain one attack, two attacks, one triggered AoO, defense reaction then attack, free-action on a trigger, bonus HP or restricted temporary FP. The V2 action/attack authority must receive a single activation receipt and typed ordered events. **Do not implement a parallel lightsaber damage/CT/defense resource owner.**
7. **Force Points and Destiny Points:** Special options across powers, techniques, secrets and Unleashed need **one intent preview** and **one commit** through existing FP/DP authorities. `system.forcePointCost:0` on Form Powers cannot be accepted as a general 'optional effects are free' rule without caller tracing. Exclude disallowed action/secret combinations (e.g., Clone Wars Linked Power cannot apply further FP-based modifications).
8. **Equipment and talents:** Source says *activated lightsaber*, not just having one on actor sheet. Check wielded/equipped state via canonical V2 weapon readiness; two-weapon powers enforce **two distinct active lightsabers**; form talent bonus uses certified talent identity and current actor feature state without falsely blocking selection for heroes who have not bought the talent.
9. **Temporal windows:** Rebuke exceptions checked at activation; `Barrier of Blades` substitution vs incoming attacks; multiattack/charge triggers and AoO; per-target next-turn expirations; Form Power consumption/recovery and temporary nonrecoverable grant semantics. No name-keyed or tag-inferred runtime side effects.

## JATM-N7. Tests for the implementation handoff (not executed)

- [ ] Printed census **17 Powers / 24 Form Powers / 14 Techniques / 2 Secrets**, plus previously counted 12 Regimens. Exact 57 IDs in original compendiums preserved; no new duplicate normal suites or form-specific entitlement balance.
- [ ] All 57 carry **printed p24-37** in source/provenance and correct target/action/descriptor; every Form Power `[lightsaber form]`; two `[telekinetic]`; two `[dark side]`; Juyo/Vaapad optional talent-specific suppression.
- [ ] `Drain Energy` *does not roll damage*; follows DC20/25/30/35 size and powered-cell/gen states, FP size upgrade.
- [ ] `Force Track` *does not mark* any actor or create 24-hour tracking flag; correct sighted trail-age DC and one-hour track, FP two trails.
- [ ] `Inspire` targets all eligible visible allies, DC20/25/30 Will bonuses and DC35 immunity, expiring end next turn; FP gives **2d6 bonus HP/ally**, not healing or accuracy.
- [ ] `Cryokinesis` maintenance has no new UtF roll or repeated object CT; `Improved Cryokinesis` allows occupied vehicle with source Fortitude gate.
- [ ] `Force Light`/`Hatred` tick each qualifying target at start of *their* turns, not immediately at caster activation; Light DSS gate and Hatred friendly fire.
- [ ] `Plant Surge` requires adjacent plant, opposes Fortitude not fixed DC; `Mind Shard` uses Will and conditional self-recovery veto; `Intercept` uses attack roll or Move Object UtF as required.
- [ ] `Circle of Shelter` p29 restores DC20/25/30 defense tiers, self+adjacent allies, Soresu Block/Deflect rider and optional FP Fortitude.
- [ ] `Contentious Opportunity` p29 activates on actual AoO only, no extra attack, DC20/25/30/35; `Disarming Slash` p30 checks initial damage and Reflex+10/+5/+2/+0; no fake easiest -5 tier.
- [ ] With active lightsaber but **without any matching form talent**, each Form Power is selectable/usable and applies base effect; matching talent grants exactly named extra rider, never entitlement.
- [ ] Without **active wielded lightsaber**, all 24 cannot be *activated*; merely owned in inventory insufficient. Twin Strike/Rising Whirlwind require two separate lightsabers.
- [ ] Rebuke fails against 22 Form Powers, succeeds when normal prerequisites hold against **Draw Closer and Pushing Slash only**; reject semantic-tag-only `Telekinetic` Rebuke exceptions.
- [ ] `Assured Strike` Juyo double-miss retains suite use; `Falling Avalanche` Djem So temp FP talent-locked; `Twin Strike` one attack adding second blade's **base dice**; `Rising Whirlwind` two targets required for bonus HP.
- [ ] Reaction powers process incoming attack result, prevention then counterattack in printed order; ranged area/autofire exceptions are per power; no generalized one-size reaction template.
- [ ] Source technique variants of FP/DP (`Improved Fold Space/Force Light/Force Storm/Plant Surge/Thought Bomb`) are available as distinct options with DP resource checks; not silently excluded by `benefit` string.
- [ ] Force Grip technique pointer resolves the **real** Core power ID; neither FUCG nor JATM uses stale `f41a...`; acquisition eligibility separately from ability usability.
- [ ] Holocron Loremaster / Mentor temporary granted power copies expire on exact correct turn/encounter, never recover, and DP extends *after* FP initiation; Mentor can only be selected with explicit apprenticeship achievement.
- [ ] Registry uniqueness by source identity not plain display name; two *different published Force Storm* powers coexist; pack-missing fallback no longer generates alternate ability IDs after agreed cutover.
- [ ] All execution paths consume existing V2 action economy, FP/DP, RollCore, weapon readiness, damage/CT, visibility, target and vehicle authorities. **No runtime test or production change is claimed by this source audit.**

**JATM non-regimen checkpoint:** **57/57 current JATM identity matches** with printed/source mechanics compared, across pp24-37; **17+24+14+2 new audited definition claims**. Previously source-reviewed **12/12** JATM Regimens remain separately certified as source claims, not as automation. Cumulative counted published definition claims **155 + 57 = 212** across the same nine book checkpoints. **All 173 current Force compendium records now have a source-book identity pass (65 Powers + 57 Techniques + 15 Secrets + 12 Regimens + 24 Form Powers)**, but **published-identity omissions from other books are not yet excluded** and mechanical implementation remains unverified. FUCG Improved Force Storm missing distinct printed variant is a known exception *outside* current records.

---

# Final five-supplement source-section sweep (v1.1)

**Evidence class:** `SOURCE SECTION SCREEN` - checked the **actual uploaded printed PDF tables of contents** and used matching book DJVU text indexes to search for `Force Power(s)`, `Force Techniques`, `Force Secrets`, `Force Regimens`, `Lightsaber Form Powers`, `Starship Maneuvers`, and other rules headings; checked the direct GitHub production pack publication groups earlier in this document. This is a targeted search for **new published Force-domain definitions absent from current packs**, not an assertion that every one of these large books has been proofread line by line or all its cross-system feat/talent rules certified. Existing NPC stat blocks and equipment-based ability grants must not be counted as new Force Power definitions.

| Additional printed sourcebook | Printed section and TXT screening | New Force/Regimen/Form/Maneuver identities found | Relevant cross-system or context follow-up |
|---|---|---:|---|
| **Scum and Villainy** | Printed contents p3: character options pp4-36; outlaw tech, fringe campaigns, elements, mini-adventures; source TXT mentions `Force Powers Known` on existing NPC blocks, no dedicated new Force rules section. | **0 identified** | No newly printed Force domain definitions; preserve Force-related NPC abilities in the respective actor/statblock authorities, not source compendium additions. |
| **Rebellion Era Campaign Guide** | Printed contents p3: heroic traits pp8-37, feats and species feats, Jedi talent expansions; no new Powers/Techniques/Secrets section. TXT mentions Force Power recovery and Force Training as **talent/feat effects**. | **0 identified** | **Recall** Jedi Consular talent (Jedi chapter, approximately p22): when spending a FP to restore an expended Force Power, restore **two instead of one**. **Jedi Heritage** species feat **p34**: Twi'lek + Force Sensitivity, treat Wisdom **4 higher only to calculate Force Training powers** (+2 per Force Training instance). **Gradual Resistance** and **Reap Retribution** Jedi Sentinel talents are keyed to having taken damage from an identified Force Power; not new Powers. |
| **The Unknown Regions** | Printed contents p3: character options pp8-33, force tradition *The Blazing Chain*, Sorcerers of Rhand and campaign threats; no authored Force power chapter; TXT power/technique/secret hits are mostly NPC known-ability listings. | **0 identified** | **Sorcerer of Rhand** source p143+ grants Force Sensitivity and one **Force Training** via species/template-style traits; at least half selected powers under that specific bonus feat must have `[dark side]`, and none `[light side]`. **Mask of Darth Nihilus** adventure p220+: while worn grants Force Sensitivity/Force Training or two Force Training feats depending on user type; at least half those powers must be Dark Side; each Power use or FP spend adds a Dark Side Point, and volume of Power uses creates persistent CT drawback. These are effect-granted feat and suite grants with artifact exposure/expiry, **not permanent new Force Powers**. |
| **Threats of the Galaxy** | Printed contents p3 consists mainly of published characters, creatures, and droids; TXT `Force Powers Known`, `Force Techniques`, and `Force Secrets` are NPC stat block **known selections** (reprints), not entries introducing rule definitions. | **0 identified** | NPC creation/progression engine must identify referenced abilities by canonical ID. The stat block's duplicate power use counts are *suite copies*, not duplicate source identities. Do not import NPC descriptions as authoritative rules text. |
| **Scavenger's Guide to Droids** | Printed contents p3 concentrates on droid heroes, allies, equipment and droid catalog; TXT contains no dedicated Force Powers/Techniques/Secrets/Regimens/Form/Maneuver sections. | **0 identified** | Droid-equipment, feat and nonstandard eligibility remain subject to existing V2 droid and Force Sensitivity ownership; no new source Force ability identities evidenced. |

## Cross-system acceptance requirements from these source screens

1. **Rebellion `Jedi Heritage`** requires the existing **feat entitlement** authority to alter **only the per-instance Force Training learned-power count**, not actor Wisdom, Wisdom-based skill rolls, regimen slots, starship maneuver slots, or Force Point calculations. Preserve feat source/identity. Test Twi'lek+Force Sensitivity prerequisite and exactly +2 for every Force Training instance, including later feat selection and permanent Wis-mod changes.
2. **Rebellion `Recall`** intercepts a **Force Point recovery transaction**. Normal FP recovery one expended suite copy becomes **two** when applicable, with eligibility and available distinct/copy instances properly chosen. Do not duplicate the recovery charge or restore sealed Mentor/Holocron granted copies that explicitly cannot be recovered.
3. **Rebellion `Gradual Resistance`** uses **per-source Power identity and per-encounter tracking** so a hit from one Force Power does not grant an indiscriminate bonus against *all* Force Powers. `Reap Retribution` similarly ties damage to the particular offending actor; use existing damage receipts.
4. **Unknown Regions Sorcerer of Rhand** demonstrates that **Power-suite grant filtering can be attached to the origin of a feat**, not merely to actor-level class/race eligibility; source-specific selection must enforce the Dark Side subset and exclude Light Side for *that instance*, not all future normal Force Training selections.
5. **Unknown Regions Mask of Darth Nihilus** requires **item-scoped temporary feat/power entitlements**. Removing the mask must undo only its derived access and obey persistent conditions/DSS consequences appropriately without corrupting unrelated permanent class/feat progress. Every power cast and FP spend should be audited as separate source-defined triggers without double-counting a FP spent as part of the same Power use unless printed rule interpretation is explicitly adjudicated. Do not hide any such unresolved overlap.
6. **Threats NPCs** often list the same power multiple times: those are legal multiple **suite copy instances**, reinforcing why identity and `instanceId` must be separate in V2, as already shown in Core and Jedi Academy.
7. None of these five screens authorizes inventing a new Force domain record. If a later printed-page audit finds an overlooked power-definition block, add its **source evidence and canonical identity** before implementation, with no name-based assumptions.

**Book queue checkpoint:** The **14 uploaded principal SWSE rulebooks/supplements** now each have at least a targeted Force-definition *source section* checkpoint in this rolling audit: Core, KOTOR, Force Unleashed, Clone Wars, Jedi Academy, Legacy Era, Starships of the Galaxy, Galaxy at War, Galaxy of Intrigue, Scum and Villainy, Rebellion Era, Unknown Regions, Threats of the Galaxy, and Scavenger's Guide to Droids. All **173 current registered Force pack records** received the source identity/mechanics comparison for their book, and **27 Starship Maneuvers** plus **11 Unleashed overlays** were inventoried separately. Counted source definition claims remain **212**, with the important **missing distinct FUCG Improved Force Storm** exception known from a printed source identity. The five additional books add **zero verified new definitions**, not five completed all-mechanics certification passes.

## Requirements before declaring global canonical schema final

- [ ] **Source identity closure:** adjudicate FUCG vs JATM same-name/near-name variants, particularly **Improved Force Storm**, and uniqueness for other same-name records. No automatic name-only dedupe, and no undocumented production ID changes.
- [ ] **Content certification:** repair source pages, text, descriptors, tier-vs-defense resolution, target/time/area/weapon requirements; distinguish printed immutable RAW, derived quick summary, and typed execution contracts. Keep provenance on both origin and reprint claims.
- [ ] **Acquisition versus application:** techniques' related powers not automatically acquisition prerequisites; Force Training and Form Power copies share the same slots; feat-derived additional entitlements, class/progression grants, and item-scoped grants remain distinct.
- [ ] **Activation authority:** unify FP/DP, Unleashed overlays, secrets, linked effects, tier choices, weapon readiness, damage/CT, status/defense, time windows and vehicle interactions into V2 transaction receipts; never reuse pack text as executable rule logic.
- [ ] **No duplicate source lists:** evaluate and retire the Force Registry's `data/lightsaber-form-powers.json` fallback after the approved cutover; preserve the Foundry-registered pack and intentional display categories.
- [ ] **Regression/certification plan:** deterministic source-driven tests for all 212 source claims, plus a complete matrix for 173 current pack records and 1 printed missing variant. Separate data parity, acquisition legality, roll/result, resource transactions, and Foundry v13 UI tests. Tests have **not** been executed during this audit.

**Next phase, still without code changes:** cross-book canonical identity freeze, source corrections ledger with exact final fields, final V2 typed schema and execution compatibility matrix, then Claude-ready phased implementation plan reviewed by the user. Do not prematurely implement based on this working Markdown.


---

# Cross-book reconciliation checkpoint 1

# SWSE Force V2 — Cross-Book Identity Reconciliation, Checkpoint 1

**Status:** Source/identity adjudication complete for the known conflicts; implementation architecture and runtime certification are not approved or complete. Offline design artifact only.  
**Repository:** `docflowGM/foundryvtt-swse`, `main`, SHA `7cc9f5fbc6a36a0e2e82a45efaf0354a4ca1f7d5` (queried 2026-11-17).  
**Rules baseline:** The 14-sourcebook `/mnt/data/SWSE_Force_V2_Rolling_Source_Audit.md`, version 1.1, including physically checked Force Unleashed p.88 and Jedi Academy p.37. PDF/print provenance takes priority over indexed TXT; the existing catalog is evidence, not an alternative source of RAW.  
**Change policy:** NO GitHub writes, no migration, no compatibility shim, no implementable changes before user approves the schema and plan. The following `DECISION` entries are source-backed **proposed canonical content adjudications** for approval. `OBSERVED` entries identify current repository behavior, not proof of execution in Foundry.

## 1. Count and identity invariants

| Item | Current | Target after source-identity correction | Meaning |
|---|---:|---:|---|
| Registered Force-domain compendium documents | 173 | **174** | 65 Force Powers + 57 Techniques + 15 Secrets + 12 Regimens + 24 Form Powers today; add **one missing FUCG technique** only. |
| Starship Maneuver source definitions | 27 | **27** | Currently `data/source/starship-maneuvers.json`, **not a registered content pack**; do not invent 27 extra powers. |
| Force-related Unleashed on-demand definitions | 11 | **11** | Ten Power modifiers + one Battle Meditation talent modifier; neither known powers nor technique acquisitions. |
| Unique printed Force-domain definition claims | **212** | **212** | This ledger already counts the missing FUCG *Improved Force Storm*: 174 + 27 + 11. Do not count the Kinetic Combat and Force Shield reprints again. |
| Existing record IDs duplicated across the five force packs | 0 | 0 | Verified across all 173 current records. New FUCG technique needs a new stable ID. |
| Existing normalized names duplicated across the five force packs | 0 | **Expected printed-name ambiguity** | Current FUCG Force Storm already has an editorial suffix; the yet-missing FUCG *Improved Force Storm* must be discoverable alongside JATM. Name uniqueness is not canonical identity. |
| Explicit `prerequisite_id` references tested | 19 | **0 dangling** | Exactly two non-resolving references currently; see Section 3. This is an ID-pointer census for that field, not a complete typed-prerequisite semantic certification. |
| Missing/null/zero page values across five packs | **152/173** | **0** | 44 powers + 57 techniques + 15 secrets + 12 regimens + 24 Form Powers. A populated page can still be wrong; every page must be compared with print. |

Identity is **not** a display name, keyword, flavor category, actor-owned Item `_id`, or generated UI slug. One canonical definition may have multiple printed *publication claims* (reprint), while two publications using the same printed name can establish two distinct canonical definitions when mechanics are different.

## 2. Publication collision and reprint decision matrix

### CBR-01 — Force Storm: two distinct base powers (DECISION, source checked)

| Attribute | Jedi Academy Training Manual | The Force Unleashed Campaign Guide |
|---|---|---|
| Printed origin | JATM **p.26** | FUCG **p.86** |
| Existing `_id` | `aef6dad242fd225b` | `0707cdeac3391953` |
| Current pack label | `Force Storm` | `Force Storm (FUCG)` |
| Mechanic | Place and maintain a selected multi-square **acid-rain zone** (2d6 acid to eligible creatures at printed triggers); size scales by UtF DC. | Create a **self-centered adjacent** telekinetic vortex (2d6 damage at the end of caster's turn); UtF DC determines duration. |
| Identity ruling | Keep separate definition | Keep separate definition |
| Proposed content key | `force-power/jatm/force-storm` | `force-power/fucg/force-storm` |

**Acceptance:** Two separate source-backed power cards must be learnable within the same Force suite, can coexist on an actor, have independent spent-use instances and effect clocks, and target different geometries. `Unleashed Force Storm` (FUCG p.91) binds **only to `0707cdeac3391953`** and increases its storm damage to **8d6**, not an additional +8d6 and not the JATM storm.

### CBR-02 — Improved Force Storm: two distinct techniques (DECISION, printed pages checked)

| Attribute | JATM | FUCG |
|---|---|---|
| Printed source | **p.37** | **p.88** |
| Pack record | Existing `c11b3c4336c125d5` | **Missing** separate compendium record |
| Applies only to | JATM base Storm `aef6dad242fd225b` | FUCG base Storm `0707cdeac3391953` |
| Source mechanics | FP adds lightning targeting **one creature inside the JATM storm** when activating or maintaining it; vs Reflex for **3d6 Force**; optional DP branch **6d6**. | A **swift action** ends an active FUCG storm and inflicts **4d6** to creatures within **2 squares of the caster**. |
| Proposed content key | `force-technique/jatm/improved-force-storm` | `force-technique/fucg/improved-force-storm` |
| Pack-ID policy | **Preserve** existing ID | Assign new deterministic stable pack ID **only when implementation is authorized**; never recycle JATM ID. |

**Acceptance:** Source-specific technique options modify only the matching active power definition. Both techniques can be independently owned (if progression grants legal slots), selected, displayed, and persisted; qualified display strings are encouraged, but printed names are preserved separately. An attempt to invoke the FUCG technique against a JATM acid-storm effect must fail without consuming resources/action; vice versa.

### CBR-03 — Kinetic Combat: reprint, NOT two powers (DECISION)

**Origin:** KOTOR **p.51**, existing Power `_id fp_kineticcombat`; **reprint:** FUCG **p.86**. Treat FUCG as a `publicationClaim(kind='reprint')` of the *same power*, subject to careful source text comparison and errata precedence if a later substantive difference is demonstrated. Do not award two selectable power names, two separate source authorities, or a second copy merely because two books print it. Existing related KOTOR technique *Improved Kinetic Combat* remains separate.

### CBR-04 — Force Shield: reprint and cross-book technique, NOT a second power (DECISION)

**Origin:** FUCG **p.86**, Power `_id fp_forceshield`; **reprint:** Legacy **p.54**. Keep one Power definition. Legacy **Improved Force Shield** (Legacy p.56; `_id c0439657bb9803f3`) points **to FUCG `fp_forceshield`**, with its adjacent-ally FP option and occupied-vehicle DP option. Vehicle shielding comes from the existing vehicle/damage authority, with the printed **nonstacking** rule; never write a second global shield service.

### CBR-05 — Book-specific modifier graph (DECISION)

These are **applies-to** edges, not acquisition prerequisites:

```text
Force Storm [JATM]  aef6dad242fd225b
  <- Improved Force Storm [JATM]  c11b3c4336c125d5

Force Storm [FUCG]  0707cdeac3391953
  <- Improved Force Storm [FUCG]  NEW_PACK_ID_PENDING_APPROVAL
  <- Unleashed Force Storm  unleashed-force-storm (on-demand DP overlay)

Force Grip [Core]  b318fc3d5dadd9f3
  <- Improved Force Grip [FUCG]  e854adf7a0029daa
  <- Extended Force Grip [JATM]  6cced906971cc03e
  <- Unleashed Force Grip  unleashed-force-grip

Force Shield [FUCG]  fp_forceshield
  <- Improved Force Shield [Legacy]  c0439657bb9803f3
  <- Legacy p.54  reprint claim only

Kinetic Combat [KOTOR]  fp_kineticcombat
  <- Improved Kinetic Combat [KOTOR]  ffacc2db39746f66
  <- FUCG p.86  reprint claim only
```

### CBR-06 — Other cross-system identities must not be silently reclassified (DECISION)

- **Lightsaber Form Powers**: 24 JATM entries are Force Power suite selections and use Force Training power slots. Source descriptor `[lightsaber form]` is not optional, despite 24/24 pack `descriptor: []`. `discipline`, `form`, `bonusTalent`, `searchTags` do **not** constitute an acquisition requirement. Owning the named form talent adds its **optional rider** at activation. Some also have Dark Side or Telekinetic descriptors. Only **Draw Closer** and **Pushing Slash** are Rebuke-eligible; all require an activated, wielded lightsaber and special entries may require two.
- **Regimens**: 12 JATM definitions, independent regimen mastery/preparation and 24-hour benefit/loss clock. Do not turn a regimen into a Force Power suite use.
- **Starship Maneuvers**: 27 SotG definitions, selected **multiple copies permitted** by Starship Tactics. Named `[gunner]` maneuvers use a weapon attack, `[Force]` Target Sense uses trained UtF, others generally Pilot; none are Force Power uses. Current catalog and separate manager duplicate source ownership; this is an implementation decision, not an identity merge.
- **Unleashed**: 11 on-demand Force overlays, each requires a DP plus feat/destiny/campaign authorization and base Power/talent. **Not** an additional 11 Force Power pack records or Force Training choices. General Unleashed actions (15) remain adjacent combat/feat/talent jurisdiction.
- **Technique vs talent vs skill application**: `Force Point Recovery` is a repeatable Core **technique**, not the `Force Recovery` talent. `Improved Telepathy`, `Improved Sense Force`, and similar Core techniques modify **Use the Force skill applications** without generating pseudo-Powers. The JATM **Mentor** Force Secret is not the character creator's Mentor NPC role.

## 3. Source linkage, prerequisite, and repeatability repair

### CBR-07 — Dangling ID references and false prerequisites (OBSERVED + DECISION)

Current exact metadata scan: **19** nonblank `system.prerequisite_id` values in the five force packs; **17** resolve to one of the 173 existing pack `_id` values, **2** do not:

| Current document | `_id` | Broken reference | Correct base Power `_id` |
|---|---|---|---|
| JATM `Extended Force Grip` | `6cced906971cc03e` | `f41a957f71e98a6a` | `b318fc3d5dadd9f3` |
| FUCG `Improved Force Grip` | `e854adf7a0029daa` | `f41a957f71e98a6a` | `b318fc3d5dadd9f3` |

**Do not simply replace `prerequisite_id` with the correct power ID as a mechanical gate.** The printed techniques use a named Power as the **subject of the modification**, not necessarily a condition to *acquire the technique*. Split fields:

```text
acquisitionPrerequisites[]   # only a printed requirement or class/slot/choice gate
appliesTo[]                  # canonical specific Power, technique, or UtF application
selectionBindings[]          # if the printed feature demands choosing a known Power
```

`ForceTechniqueStep._assessTechniqueAvailability()` currently refuses techniques whose related Power is not present, even though source-specific technique acquisition is not generally contingent on owning that Power. Its `_getTechniqueRelatedPower()` also tries `prerequisite_id`, raw prerequisite text, and a name prefix as if interchangeable. Both that UI prefilter and `AbilityEngine.evaluateAcquisition()` must consume **only certified acquisition predicates**, while activation uses `appliesTo`. This requires refactoring the reading model and any downstream validation; do not bypass class-granted technique-slot authority.

**The relevant confirmed code locations** (snapshot SHA above):
- `scripts/apps/progression-framework/steps/force-technique-step.js:1077-1155` (`relatedPower`, `prerequisite_id`, and owned-base-Power filter); `:660-680` calls `AbilityEngine.evaluateAcquisition` after the filter.
- `scripts/apps/progression-framework/shell/mutation/force-plan-builder.js:207-243` (`forcePowers.allowDuplicates: true`, techniques and secrets false; non-power dedupe by `item.type + lowercased name`).
- `scripts/engine/registries/force-registry.js:298-310` discards entries when same type/name exists; `:499-511` provides singular name-based lookup/resolve.
- `scripts/apps/progression-framework/shell/progression-finalizer.js:3418-3471` contains an additional name-key dedupe path; both mutation paths must agree after the cutover.
- `scripts/engine/progression/engine/maneuver-authority-engine.js:150-185` checks proposed maneuver IDs against owned items and rejects duplicates, in direct conflict with *Starships of the Galaxy*.

### CBR-08 — Per-definition repeatability and copied uses (DECISION)

| Feature | Correct identity/selection model | Current implementation risk |
|---|---|---|
| Force Training Power acquisitions | Same `definitionId` can have multiple **owned use instances**, each independently spendable/recoverable. | Defining catalog uniqueness by name must **not** block suite duplicates. |
| Starship Tactics maneuver acquisitions | Same maneuver definition can be learned in multiple use instances. | ManeuverAuthorityEngine rejects duplicate IDs, manager filters existing names, and a suite `Set` collapses copies. |
| Core `Force Point Recovery` technique | Reacquisition is **explicitly repeatable** for increased allowance. | Technique global `allowDuplicates:false` and name-key finalization may suppress printed legal repeats. |
| Core `Force Power Mastery` technique | Repeat with **different** chosen known Power; choice keyed by immutable Power ID, not name/slug. | Existing Mastery special case stores a `slug`; name normalization strips trailing `(FUCG)`, so dual Force Storm choices could collide without ID binding. |
| Other techniques and Force Secrets | **Do not declare globally repeatable** absent printed source permission. | UI has generic repeat-selection affordances for secrets but builder normally rejects duplicate names; resolve per-item rules during schema/content pass. |
| Mentor/Holocron granted Power copy | Transient, **nonrecoverable** copy with source-specific next-turn/encounter expiry; this is not another permanent learned definition. | Do not allow FP recovery, one-minute rest, or feat-granted suite expansion to preserve expired borrowed instances. |

A single `AcquisitionInstanceId` must track grant source, choice bindings, owned use number, and provenance separately from `DefinitionId` and the Foundry actor-owned Item's random `_id`.

## 4. Canonical V2 catalog identity contract — proposed schema, not implemented

```text
ForceCatalogDefinition
  definitionId              immutable, namespace-qualified, exact publication identity;
                            unique across all domains, not a display/name/slug key
  kind                      force-power | lightsaber-form-power | force-technique |
                            force-secret | force-regimen | starship-maneuver |
                            unleashed-overlay
  printedName               as printed by the originating publication
  displayLabel              optional readable source qualifier; cannot be used as identity
  registeredContent         packKey + stable packDocumentId (_id), or approved source
                            authority for maneuvers/overlays during cutover
  origin                    bookId + printedPage + entry heading + audit evidence
  publicationClaims[]       later reprints / approved errata, with canonical precedence
  publishedDescriptors[]    rules authority, independent of searchTags
  searchTags[]              non-authoritative discovery / suggestions only
  sourceRulesSummary        derived player summary, kept separate from RAW/citation
  acquisitionPrerequisites[] source-supported prerequisites only, plus owning class/
                            feat entitlement check
  appliesTo[]               referenced exact definitionId or typed UtF application;
                            NOT a selection prerequisite by default
  selectionBindings[]       explicit choose-known-Power / chosen feature cases only
  repeatability             per definition and context (e.g., power copies, mastery)
  activation               actor, action kind, trigger event and deadline,
                            equipment/craft/crew readiness, eligible targets
  check                     fixed tier | defense-gated | opposed | attack-roll |
                            tier+defense; one authoritative roll receipt
  modifiers[]               optional technique/secret/talent/Unleashed mode options
  effectPlan[]              damage/condition/target/area/vehicle/status effects through
                            existing V2 combat and actor/vehicle authorities
  resourceOptions[]         FP/DP costs, transaction timing, per-round limits
  durationAndRecovery       spent-use vs active-effect vs regimen/maneuver clocks
  certification             sourceReview, packParity, acquisition, execution,
                            regression, Foundry13 acceptance independently tracked

ForceOwnedUseInstance
  definitionId; instanceId; ownerActorId; acquiredFromGrantId
  choiceBindings; eligibilityAtGrant; spent; borrowedOrTemporary; recoverable
  issuedAt; expiresAtEvent; lastActivationReceiptId; lastRecoveryReceiptId
```

**Content source-of-truth direction:** Correct the registered canonical pack documents for the 174 Force-domain definitions, not a second competing JSON runtime catalog. The existing JATM `data/lightsaber-form-powers.json` is a duplicate fallback; after audit/reachability gates, retire the fallback and make startup fail clearly if the required canonical pack is missing. The 27 Maneuvers require an explicit one-owner publishing decision because no maneuver pack is registered; their source file must not compete with a second hard-coded manager. The 11 Unleashed definitions should be runtime-accessible **conditional overlays**, not grantable Power Items. No migration tables, backward-compatibility alias bridges or silently merged names.

**Identity lookup behavior:** by immutable `definitionId`/registered pack ID for every grant, activation and modifier relation. `searchByPrintedName()` may return **multiple candidates** for display. Name-only `getByName()` must never select a mechanically ambiguous record. A request that resolves to two `Improved Force Storm` techniques is an explicit disambiguation, not first-match or last-write-wins. Also prevent accidental `Force Storm` collisions when UI slug normalization strips `(FUCG)`.

**Activation transaction ordering, provisional:** (1) exact owned use/definition lookup, (2) class/feat/destiny/equipment/crew and trigger admission, (3) printed descriptor and immunity restrictions, (4) choose legal modifiers and targets/geometry, (5) preflight FP/DP/action and round limits, (6) commit one authoritative spend/action/use receipt, (7) roll once with correct tier/defense gates, (8) apply typed damage/CT/equipment/vehicle/condition mutations, (9) schedule expiry, maintenance and recovery without duplicative triggers. Failed skill checks still spend the Power/maneuver use as printed, while **invalid preflight** must not. This is an acceptance architecture, not a claim it exists today.

## 5. Cross-book test gates — deterministic and source driven

| ID | Setup / action | Expected result |
|---|---|---|
| `CBR-ID-001` | Load all current five force packs | Exactly 173 distinct current document IDs; no duplicates or silently suppressed entries. |
| `CBR-ID-002` | Add approved missing FUCG *Improved Force Storm* | 174 Force definitions; preexisting 173 IDs unchanged; 212 overall source claims including 27 maneuvers and 11 overlays. |
| `CBR-ID-003` | Query printed name `Force Storm` | JATM and FUCG are both returned with publication labels; no default canonical execution target. |
| `CBR-ID-004` | Query printed name `Improved Force Storm` | JATM and FUCG distinct techniques both returned; selecting both under valid slots succeeds. |
| `CBR-ID-005` | Use FUCG *Improved Force Storm* while only JATM storm active | Reject modifier, preserve active JATM effect, action and resources. |
| `CBR-ID-006` | Use JATM *Improved Force Storm* while only FUCG storm active | Reject modifier and preserve resources; FUCG use remains unchanged. |
| `CBR-ID-007` | Activate FUCG Unleashed storm overlay | Affects only FUCG storm; 8d6 damage, not +8d6, not acid-rain. Requires permitted Unleashed/DP. |
| `CBR-ID-008` | Import/reprint Kinetic Combat from FUCG | Adds publication claim to KOTOR `fp_kineticcombat`, no second Power definition. |
| `CBR-ID-009` | Import/reprint Force Shield from Legacy | Adds reprint to FUCG `fp_forceshield`, no new Power definition. |
| `CBR-ID-010` | Apply Legacy *Improved Force Shield* to occupied vehicle | Only FUCG base Power can be modified; nonstacking SR through vehicle authority. |
| `CBR-ID-011` | Validate every nonblank `prerequisite_id` | No dangling ID; related-power edges no longer create unsourced acquisition locks. |
| `CBR-ID-012` | Technique grant without knowing relevant base Power | Allowed when class slot and actual printed acquisition requirements satisfied; applying technique without base is inapplicable. |
| `CBR-ID-013` | Acquire same Power twice via two legal slots | Two owned use instances; using one does not spend the other. |
| `CBR-ID-014` | Select 2 copies of same SotG maneuver | Two use instances permitted and survive progression finalization and vehicle projection. |
| `CBR-ID-015` | Acquire Force Point Recovery twice | Both legal repeatable selections persist and calculate correct limit. |
| `CBR-ID-016` | Acquire Force Power Mastery for each Force Storm | Separate selected definition IDs; no slug collapse; same target cannot be selected again contrary to printed restriction. |
| `CBR-ID-017` | Load all 24 Form Powers | 24/24 have `[lightsaber form]`, exact other printed descriptors, correct page, legal activated-lightsaber gate, only two Rebuke exceptions. |
| `CBR-ID-018` | Borrow Power with Mentor or Holocron | Temporary and nonrecoverable; FP needed to issue, DP can extend lifespan under correct rule, expiry removes use. |
| `CBR-ID-019` | Source provenance validation over new canonical force pack | Every entry has correct **printed** page, sourcebook, origin/reprint claims, distinct player summary and mechanics shape; zero page=0/null. |
| `CBR-ID-020` | Try to stack incompatible modifiers, including Linked Power | Illegal combinations rejected before action/FP/DP/use is committed; one resource and state receipt per accepted activation. |
| `CBR-ID-021` | FP cost and DP overlay present on same turn | Consult source-defined per-round constraints in single FP/DP authority; reject invalid combo without partial writes. |
| `CBR-ID-022` | Force Power Mastery or UI lookup by ambiguous unqualified Storm name | No first-match fallback; use exact definition ID or ask user to choose among labeled variants. |
| `CBR-ID-023` | All published technique-to-power links | Reference closure for JATM/FUCG storms, Core Grip, FUCG Shield, KOTOR Kinetic and all ordinary related-power edges. |
| `CBR-ID-024` | Character has Force Sensitivity but no Force Training suite | No invented known powers or techniques; acquisition routed solely through feat/class grants. |

**Tests are specified, not run.** Relevant number and metadata scans were performed with read-only connector data; no Foundry runtime, app lifecycle, actor mutation, or CLI regression suite was exercised.

## 6. Proposed implementation order after user review — NO implementation authorization implied

1. **P0 / Identity authority:** Approve split/reprint rulings and canonical ID contract; add exactly one missing technique in source/pack plan; preserve all 173 existing IDs. Replace name-keyed catalog suppression and lookup, including any ambiguous Force Power Mastery choices. Verify no other source-authored alternate definitions are missing. **Gate:** ID-001–012, ID-022–023.
2. **P0 / Printed data parity:** Correct the 152 absent/zero pages plus wrong positive pages, descriptors, sourcebook aliases, human summaries, tier-vs-defense and text drift. Stop treating existing `dcChart`/`benefit` as RAW-certified. **Gate:** ID-017, ID-019 and per-book source tests (especially Core Force Lightning, Sever Force, JATM Drain Energy/Track/Inspire, Clone Wars Malacia/Technometry, Legacy defenses).
3. **P0 / Acquisition and owned instances:** Split `appliesTo` from acquisition prerequisites. Preserve the existing feat/class entitlement authority. Refactor finalizer duplicate policy to be per definition/choice and allow legal Power/Maneuver duplicates. Eliminate conflicting legacy writer paths after reachability proof. **Gate:** ID-012–016, ID-024 and Starship Tactics/Wis provenance.
4. **P1 / Activation and resource compatibility:** Connect techniques, secrets, lightsaber readiness, Unleashed overlays, regimens and maneuvers to their existing V2 mechanical owners; one atomic FP/DP/action/roll/effect clock. No parallel damage, CT, shielding, aircraft or equipment subsystem. **Gate:** ID-005–007, ID-010, ID-018, ID-020–021 and full per-book regression matrix.
5. **P1 / Foundry v13 end-to-end acceptance:** Chargen, L1, multiclass, prestige, NPC builder, item acquisition, encounter turn sequencing, player sheet, combat actions and vehicle/gunner station testing. Verify no duplicate registry and no fallback reintroduces deleted authority; after acceptance, remove dead shims/managers (clean cutover). **Gate:** smoke, deterministic source tests, failure roll receipts, regression and performance.

### Explicit open decisions before final schema freeze

- Confirm adoption of immutable `definitionId` + registered pack `_id` as **two separate responsibilities** (not a migration crosswalk). Exact new FUCG technique `_id` should be assigned only with approval.
- Select canonical Maneuver content authority / publishing representation (single validated source file or registered compendium), ensuring no second manager-owned 27-entry list remains active.
- Resolve per-technique/secret **repeatability** beyond explicitly printed Core Force Point Recovery and choice-bound Force Power Mastery; do not silently generalize.
- Select implementation storage for player-readable published text and legal excerpt rights; derived `summary` remains independently authored. Page references and structured source rules are always required.
- Run current V2 reachability and effect-owner matrix before declaring complete runtime cutover, because read-only static-source inspections do not certify execution or call paths.

**Checkpoint outcome:** The known cross-book source collisions and reprints are adjudicated, a typed identity contract and 24 acceptance cases are drafted, and critical current code blockers are located. This is **cross-book reconciliation checkpoint 1**, not declaration of finished refactor or permission to modify production.


## 7. Machine-readable decision file

The paired offline file `SWSE_Force_V2_Identity_Decision_Manifest_v1.json` records the known high-risk source identity decisions, links, test IDs and count contract. No new active catalog or runtime implementation is introduced.


# Reconciliation checkpoint 2 - v1.3 clean-room rebuild (supersedes previous incremental implementation plan)

**User direction:** Rebuild the SWSE Force subsystem from scratch rather than layer fixes over existing Force-specific code. This decision **replaces the incremental implementation order** stated in earlier checkpoints. It does **not** invalidate printed source reviews, identity adjudications, existing source counts, or external V2 sovereign services.

**Design deliverables prepared in this run (offline only):**

- `SWSE_Force_V2_Clean_Room_Rebuild_Master_Handoff.md` - complete greenfield architecture, seven implementation phases, code-level keep/replace/delete owner matrix, acquisition/activation/receipt/clock design, failure boundaries and strict Claude work order.
- `SWSE_Force_V2_Clean_Room_Definition_Schema_v2.json` - a structurally validated draft 2020-12 JSON Schema for source-aware definitions, typed check stages, effects, descriptors, repeatability and modifiers. **Draft only; not deployed.**
- `SWSE_Force_V2_Clean_Cutover_Regression_Manifest_v1.json` - 83 specified acceptance cases: catalog 12; acquisition 16; activation 23; resources 16; end-to-end 16. **Tests not executed.**
- Existing cross-book identity handoff and decision manifest remain binding source-analysis inputs for the implementation review.

## Revised ownership decision

The entire Force-owned code layer is replaced, including legacy `ForceExecutor`, named effect dispatch, phase-3 through phase-6 wrapper installers, inferred v1 resolution, string-based registry/dedup, additional independent Force roll APIs, Force provenance migration, hardcoded maneuver catalogs, missing descriptor handling, and Force-specific hook/picker/finalizer adapters. Build one unactivated new domain, certify it, then make one atomic *runtime-selection* cutover (not a claim of atomic cross-document mutations) and physically retire old runtime code after reachability verification. **No active dual runtime. No adapters to legacy Force data. No migration.**

The new domain MUST still consume shared V2 actor mutation, resource, RollCore, action economy, damage, condition, equipment, droid, vehicle, feat/class grant and progression authorities. These shared owners are not all defective and must not be wholesale duplicated. The new domain may require targeted corrections at their owners: `Force Regimen Mastery` slot calculation must be Wisdom; `Starship Tactics` entitlement metadata must agree with its Wisdom computation; maneuver duplicate-selection policy must track instance IDs rather than ban multiple legal copies of one definition.

## Scope invariant and source-authority boundary

| Definition group | Target |
|---|---:|
| Standard Force Powers + JATM Lightsaber Form Powers | 65 + 24 |
| Force Techniques | 58 (57 existing + FUCG Improved Force Storm) |
| Force Secrets | 15 |
| Force Regimens | 12 |
| Starship Maneuvers | 27 |
| On-demand Unleashed Force overlays | 11 |
| **Total counted definitions** | **212** |

Retain original 173 existing Force pack identifiers as **published definition identifiers only** wherever possible; this does not make old actor-owned Force instance formats valid. The sourcebook screens for five books without new definitions remain targeted screens, not all-page, all-Feat/Talent execution certification. Each compiled definition must undergo new typed mechanics source/certification pass. Existing actors require a separate deliberate rebuild of Force selections if no migration is authorized; **never silently convert** their old Force items.

## Runtime issues confirmed during architecture pass

- Force Registry `scripts/engine/registries/force-registry.js:298-310` suppresses same-name definitions even where publication identities differ; `:332-372` falls back to separate JATM JSON mechanics.
- Force Technique Step `scripts/apps/progression-framework/steps/force-technique-step.js:1123-1155` treats related base Power as an acquisition gate, including cases without printed prerequisites.
- Force mutation plan `scripts/apps/progression-framework/shell/mutation/force-plan-builder.js:203-287` and `progression-finalizer.js:3416-3480` de-duplicate Techniques/Secrets by name, hiding legitimate source-specific variants.
- ForceExecutor `scripts/engine/force/force-executor.js:184-391` has generic DC success and another effect pass; `force-power-final-integration.js:239-295` installs special name-based wrappers; `phase6-force-direct-damage.js:7-37` uses wrong DC-based tier dice for printed Core Force Lightning.
- Force Power Effects Engine `scripts/engine/force/force-power-effects-engine.js:106-206` has substring dispatch for typed mechanics; `force-power-resolution-schema.js:33-109` accepts inferred legacy behavior.
- Regimen executor `scripts/engine/force/force-regimen-executor.js:98-275` uses its own active-effect/long-rest-shaped state that must be replaced with source-specific clocks.
- StarshipManeuverManager `scripts/utils/starship-maneuver-manager.js:296-326` hardcodes another complete maneuver list; StarshipManeuverStep `:140-185` loads it as a fallback; maneuver owner `maneuver-authority-engine.js:180-188` blocks duplicate IDs even where source allows legal duplicate copies.
- Feat entitlement resolver `scripts/engine/progression/feats/feat-grant-entitlement-resolver.js:326-331` uses configured Force Training stat for Regimen slots although source requires Wisdom. `:424-440` Starship Tactics metadata disagrees with its actual Wisdom calculation.

**Scope note:** These are source-code verified *design blockers*. Their exact boot/lifecycle reachability, end-to-end mutation effects and concurrency cannot be certified without Foundry v13 execution. Do not mark them fully runtime-proven or automatically delete shared modules merely because their filename contains 'force'.

## Approval and handoff status

The requested one-pass architecture, source-aware schema draft, code-owner dispositions, clean-break plan and regression suite are **prepared**, not implemented. No file was pushed to GitHub, no package was built, no Foundry v13 actor was mutated and the 83 tests are **not passing or failing yet** because they have not been run. User approval of the resulting schema and deployment consequences remains the gate before Claude implementation.

## Phase 0 Bookwise Definitions — Core Rulebook v0.2 (official errata integrated)

**Canonical priority:** October 2008 WotC official errata and clarifications supersede contradictory first-print rules. This v0.2 checkpoint replaces v0.1 first-print-only mechanics. The catalog includes 28 Core Force records, 23 published fixed-DC tiers, 32 typed operation kinds, 23 cross-domain influence claims, and 87 source-driven tests specified (NOT run).

**Critical errata:** Force Grip range 12 AND LOS, Fort failure half damage/no sustain, plus size and concentration rules; Force Stun vs Fort not Will; Force Thrust opposing BAB; Move Object range 12 AND LOS and sustain recheck; Surge free action + DP jump; Battle Strike next-turn expiry; Telekinetic descriptor and cover/concealment, all descriptor-based talents; Force Point Recovery NOT repeatable; Force Training multiple feats each 1+Wis.

**Critical official clarifications:** Printed Force Disarm feat-exclusion sentence DELETED (but melee-attack-only feat bonuses still require an explicit bridge to UTF); Rebuke re-reflection and original check; Sever Force DC35 as DC25; Vital Transfer can heal less and never self; Force Pilot trained Pilot generally.

**Pending design rulings:** Devastating Power odd damage dice rounding; Multitarget DP target count; Force Grip FP extra dice ordering vs half damage; Combined Feat (KOTOR) specific Force Disarm interaction to be certified in its own book.

**Files:** `SWSE_Force_V2_Core_Canonical_Definitions_and_DC_Tables_v0.2.json`, `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.2.json`, `SWSE_Force_V2_Core_Cross_Domain_Influence_Graph_v0.2.json`, `SWSE_Force_V2_Core_Influence_Graph_Schema_v2.2.json`, `SWSE_Force_V2_Core_Definition_Acceptance_Cases_v0.2.json`, `SWSE_Force_V2_Core_Book_1_Definitions_Editorial_Review_v0.2.md`.

**Next book:** Starships of the Galaxy (27 published maneuvers); investigate any publication errata BEFORE certifying records.


## Force V2 Bookwise Canonical Rebuild — Book 2: Starships of the Galaxy (schema v2.3.0)

**Status: offline source-backed definitions complete, runtime unverified; read-only.** Detailed handoff: `SWSE_Force_V2_Starships_Book_2_Definitions_Editorial_Review_v0.1.md`. GitHub main verified at `7cc9f5fbc6a36a0e2e82a45efaf0354a4ca1f7d5` (17 November 2026).

**Book 2:** 27/27 named Starship Maneuvers (21 Pilot, 5 weapon attack vs Reflex, 1 Use the Force), 6 attack patterns, 61 fixed DC rows, 15 attack-margin rows, 1 no-fixed-DC substitution (`Snap Roll`). Strict 2.3.0 typed schema extends Book 1 from 32 to 65 operation kinds; 27 Book 2 and all 28 Core records pass JSON Schema. 15 new cross-domain source relationships; all 23 Core relationships revalidated. 253 source-oriented acceptance cases drafted but **not executed**.

**Authoritative differences:** Gunner attacks use triggering/selected weapon attack vs Reflex rather than an invented Pilot check; Target Sense uses UTF; Snap Roll substitutes Pilot for Reflex with no fixed DC; Corellian Slip's follow-up attack uses free action under WotC errata; Squadron Tactics cannot confer attack patterns; fighter-group rules end personal attack patterns on group formation. Failed activation may cause collision. FP recovery, natural-20 timing, Tactical Genius end-of-round and suite slots are captured as separately typed rules.

**Cross-book count:** 55 / 212 published definition claims now have rebuilt, strict bookwise data (Core 28 + Starships 27). This does not mean 55 live compendium entries or runtime certification. New source-sensitive gaps: Starship maneuver definition source-vs-hardcoded pool duplicates; unresolved 1-die Zeta minimum; SR degradation coordination; collision GM/vehicle authority; attack penalty choices; target-sense stat bonus semantics.

**Next:** *Knights of the Old Republic Campaign Guide* 20 claims. Evolve schema when a published interaction requires it; revalidate the earlier 55 definitions and 38 influence edges. No implementation/migration/legacy bridges/commits.


## Force V2 Bookwise Canonical Rebuild — Book 3: Knights of the Old Republic Campaign Guide (schema v2.4.0)

**Status:** rebuilt, PDF-verified source definitions complete; 20/20 KOTOR records, 31 fixed-DC rows, five dual fixed/defense checks, one defense-only power, 19 typed influence relationships, 125 proposed (not run) acceptance cases. No GitHub edits.

**Schema evolution:** definition operation kinds 65 → 82, influence graph v2.4, new distinct rolls / multi-gate DCs / size Fort / damage concentration / maintained effects / shared resource triggers. All 28 Core and 27 Starships definitions revalidated under v2.4, plus their 23 and 15 influence edges.

**Source corrections:** printed *Resist Force* DC25 +5 (pack +3); *Wound* against Fort (no fabricated fixed DC15), its damage-caused condition step persistent under Jan 2009 clarification; *Force Scream* has published DC15/20/25/30 tier damage (pack lacks chart). *Kinetic Combat* succeeds on UTF DC20 then uses a distinct BAB+Cha weapon attack; its Improved technique increases available weapons not attack count. Techniques modify powers; they do not independently fire Force checks.

**Source limitation:** primary printed KOTOR PDF pp39, 50–54; online preserved Jan 2009 WotC errata transcription for Wound/Taint. Interactions are mapped for identified rule dependencies, not exhaustive all feat/talent/item identity proof; five open integration interpretations listed in editorial report.

**Cumulative** 75/212 published claims rebuilt (Core 28 + Starships 27 + KOTOR 20), 57 cumulative typed influences. Offline structural JSON Schema checks passed. No runtime claims or commits.

**Artifacts:** `SWSE_Force_V2_KOTOR_Book_3_Definitions_Editorial_Review_v0.1.md`, `SWSE_Force_V2_KOTOR_Book_3_Canonical_Definitions_and_DC_Tables_v0.1.json`, `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.4.json`, `SWSE_Force_V2_KOTOR_Book_3_Cross_Domain_Influence_Graph_v0.1.json`, `SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.4.json`, `SWSE_Force_V2_KOTOR_Book_3_Acceptance_Cases_v0.1.json`.

**Next book:** *Force Unleashed Campaign Guide*.

## Force V2 Bookwise Canonical Rebuild — Book 4: The Force Unleashed Campaign Guide (schema v2.5.0)

**Status:** 31/31 new publication definitions rebuilt and checked against printed FUCG pp. 85–91, Unleashed feat p. 35; offline JSON schema validation succeeded for all books 1–4; no Foundry tests or GitHub mutations.

**New definitions:** 5 Force Powers (Corruption, Force Blast, Force Shield, Force Storm, Repulse), 10 Force Techniques (including distinct absent FUCG *Improved Force Storm*), 5 Force Secrets, and 11 Unleashed overlay conditions. Existing KOTOR *Kinetic Combat* on FUCG p86 is a **reprint**, not a new source identity. 16 fixed DC rows, 33 source-backed influence edges, 220 proposed but not executed acceptance cases.

**Schema:** v2.4 → v2.5 operation kinds 119. New types include Unleashed linked overlay with prerequisite and DP gate, recurring/half delayed damage, personal SR, dual DC+defense, controlled duration, forced movement with positive-size-only suppression, resource-exclusive secrets, and Storm duration tiers. All earlier 28 Core, 27 Starships, 20 KOTOR definitions and their 23+15+19 typed influence edges revalidated. Four-book total **106/212**; cumulative influence edges **90**.

**High-impact corrections:** *Force Blast* requires strictly exceeding Reflex plus meeting damage DC; *Force Storm* DC20/25/30/35 controls 2/4/6/8-round duration only; *Repulse* is opposed UTF vs Strength + BAB + size/stability with no fixed DC; *Force Shield* grants SR that cannot be recharged; *Unleashed Force Storm* overrides pulse dice to 8d6; Force Secrets are FP/DP alternate choices, not separate power rolls. Distinct FUCG Storm uses `fucg/force-power/force-storm`, JATM Storm remains separate. FUCG *Improved Force Storm* `fucg/force-technique/improved-force-storm` requires new record; do not reuse JATM same-named technique. Broken *Improved Force Grip* bracket prerequisite ID remains invalid; canonical source power is `core/force-power/force-grip`.

**Editorial blockers:** ambiguous *Corruption* half-damage clause, threshold condition for *Debilitating Power* DP choice, odd Charisma fractional rounds for Unleashed Grip, FP and DP Storm damage interaction, chaining different Force Grip extension modes. Proposed defaults are **not approvals**; do not silently implement. Refer to the Book 4 editorial ledger for detail.

**Artifacts:** `SWSE_Force_V2_Force_Unleashed_Book_4_Definitions_Editorial_Review_v0.1.md`, `SWSE_Force_V2_Force_Unleashed_Book_4_Canonical_Definitions_and_DC_Tables_v0.1.json`, `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.5.json`, `SWSE_Force_V2_Force_Unleashed_Book_4_Cross_Domain_Influence_Graph_v0.1.json`, `SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.5.json`, `SWSE_Force_V2_Force_Unleashed_Book_4_Acceptance_Cases_v0.1.json`, `SWSE_Force_V2_Force_Unleashed_Book_4_Validation_Ledger_v0.1.json`.

**Next book:** Clone Wars Campaign Guide — 19 definitions. No source pack edits or runtime claims.

**Final printed-page check:** Unleashed Battle Meditation starts on p89; Battle Strike, Corruption and Dark Rage are on p90; Force Blast, Force Grip, Force Lightning, Force Storm, Force Thrust, Move Object and Repulse are on p91. The source does not explicitly state a damage type for FUCG Force Blast or Force Storm; the canonical definitions use `unspecified-in-printed-entry` and do not fabricate Force damage.


## Force V2 Bookwise Canonical Rebuild — Book 5: The Clone Wars Campaign Guide (schema v2.6.0)

**Status:** 19/19 new publication Force records rebuilt from printed CWCG pp.50–55 (8 Powers, 8 Techniques, 3 Secrets). All 15 published fixed DC tiers encoded, all other Power outcomes use defense comparisons rather than invented DC ladders. Clone Wars publisher errata p40 Focused Force Talisman recover-all correction incorporated into cross-domain influence graph. 20 typed influence edges; 157 proposed tests (not run).

**Schema:** v2.5 → v2.6, 119 → 144 typed mechanical operations; expands exclusive device/droid outcome choice, maintained CT tracks, vertical falling, phasing, Morichro grapples/trance/death, Rend UTF natural20, deferred linked power exclusion rules, and source-specific resource recovery. 106 prior definitions and 90 prior influences pass backwards-compatible strict schema revalidation. 125/212 definitions; 110 total influence edges.

**Critical source rulings:** Cloak DC15/20/25/30 concealment with +0/+2/+3/+5 Stealth; Levitate DC15/20/25 fly 2/4/6 vertical and 1-FP falling reaction; Malacia UTF vs Fort, CT -1 once and DT -5 (-10 FP); Morichro initial >=Fort, maintained >Fort and grapple gate; Phase DC25/30/35/40 2/4/6/8 speed capped by base; Rend UTF vs Reflex 3d6, skill natural20 doubles, FP +2d6; Shatterpoint DC25/30/35/40 DT -5/-10/-15/-20 on next attack; Technometry UTF vs Will, memory fact margin +5 and exclusive droid control choice.

**Mechanics not settled:** Linked Power delayed roll timing and invalid target states; Unconditional Power cost not explicitly listed in its own entry despite Force Secret preface; Extend Power at 0/negative CHA; Rend FP with critical double; other items in Book 5 editorial review. Claude must not decide them.

**Artifacts:** `SWSE_Force_V2_Clone_Wars_Book_5_Definitions_Editorial_Review_v0.1.md`, `SWSE_Force_V2_Clone_Wars_Book_5_Canonical_Definitions_and_DC_Tables_v0.1.json`, `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.6.json`, `SWSE_Force_V2_Clone_Wars_Book_5_Cross_Domain_Influence_Graph_v0.1.json`, `SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.6.json`, `SWSE_Force_V2_Clone_Wars_Book_5_Acceptance_Cases_v0.1.json`, `SWSE_Force_V2_Clone_Wars_Book_5_Validation_Ledger_v0.1.json`.

**Next book:** Jedi Academy Training Manual, 69 source claims. No production changes.


## Force V2 Bookwise Canonical Rebuild — Book 6: Jedi Academy Training Manual (schema v2.7.0)

**Status:** JATM 69/69 source identities represented by a strict, source-indexed **design-stage** manifest: 17 ordinary Force Powers, 24 Lightsaber Form Powers, 12 Regimens, 14 Techniques, 2 Secrets. Includes 167 published fixed-DC rows, 52 typed influence edges (24 specifically typed Form Power riders), and 472 proposed acceptance scenarios. Not executed in Foundry. No GitHub implementation changes.

**Rider decision (SOURCE vs PROJECT):** JATM printed p29 grants a Form Power rider **if the character has the matching form talent** and requires the character to wield an **activated lightsaber** to use the power. Project rule additionally requires the matching Lightsaber Form stance to be **active** before the rider applies, as requested by the user. These are distinct gates; possessing a form talent does **not** mean its stance is active. This is clearly labeled as an added project rule rather than a published requirement. The Form Power remains learnable and its base effect remains usable without the named form talent. Twin Strike/Rising Whirlwind require two wielded active lightsabers. Only Draw Closer/Pushing Slash normally allow Rebuke among the 24 Form Powers.

**Existing state authority confirmed:** `scripts/engine/talent/lightsaber-form-engine.js` lines 137-210 exposes `LightsaberFormEngine.getActiveForm/isActiveForm/setActiveForm/clearActiveForm`; the activated form is stored on the actor flag `swse.activeLightsaberForm` as a slug-bearing record, and only one form can be active at once. The v2.7 data contract explicitly specifies this authority's persisted flag **shape** without requiring preservation of legacy Force resolution mechanics or inventing a second stance store. No new activation action cost invented.

**Source and schema corrections:** Printed JATM source opening headings verified in PDF pp24–28; Force Light begins on p25, Hatred p26, Intercept and Memory Walk p27 (the previous source page ledger used p26/p27/p28 continuation-page values). Vo'ren Fifth Cadence DC43 is printed in the p14 continuation not fully captured by source TXT. JATM Force Storm (acid-area p26) and FUCG Force Storm (vortex) remain separate identities; JATM Improved Force Storm is not FUCG's same-named missing technique. Cryokinesis can be maintained without a fresh power check, unlike many sustained effects in the book. Drain Energy drains item charges rather than dealing an invented damage attack.

**Schema evolution:** v2.6 -> v2.7 adds domain `lightsaber-form-power`, finite per-form rider contracts, explicit published-versus-project gate, `swse.activeLightsaberForm` state authority, regimen clocks, source-linked technique applications and temporary-secret grants, and a typed-but-still-not-fully-executable JATM tier metric. Five prior definition packages (125 identities) and five previous influence packages (110 edges) revalidated under the new contracts. Crossbook current total **194 / 212** definitions and **162** influence edges without canonical identity collisions.

**Remaining design blockers before Claude implementation:** 167 tier records carry source-backed scalar effects, but composite damage, multi-target, duration, action, and condition outcomes are not yet all decomposed into atomic executable V2 operations. FP descriptions with no certified implementation remain source prose, not fictitious effect operations. Printed-vs-project active-form gate and stance UX/action cost, exact regimen retry windows, and any unconfirmed JATM errata remain in editorial ledger. Structural JSON validation and declared acceptance cases are not mechanical runtime certification.

**Artifacts:** `SWSE_Force_V2_JATM_Book_6_Source_Package_v0.1.zip`, `SWSE_Force_V2_JATM_Book_6_Editorial_Review_v0.1.md`, `SWSE_Force_V2_JATM_Book_6_Canonical_Definitions_and_DC_Tables_v0.1.json`, `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.7.json`, `SWSE_Force_V2_JATM_Book_6_Cross_Domain_Influence_Graph_v0.1.json`, `SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.7.json`, `SWSE_Force_V2_JATM_Book_6_Acceptance_Cases_v0.1.json`, `SWSE_Force_V2_JATM_Book_6_Validation_Ledger_v0.1.json`.

**Next:** Legacy Era Campaign Guide (remaining 18 claims in current 212-count plan). No implementation or commits.


## Book 6 JATM Form Power Rider RAW Correction (v2.8; 2026-11-17)

**Supersedes the previous extra active-form rider gate.** JATM printed p29 and the individual Form Power rider texts require possessing the matching Lightsaber Form talent, not separately activating a stance. Owning that talent and executing a legal Form Power activation are sufficient to trigger its individual rider, subject to its printed trigger. An activated lightsaber is still required for the base power; qualifying two-lightsaber powers require two. `swse.activeLightsaberForm` remains independent form-stance state and MUST NOT gate Form Power riders. All 24 definition records, 24 influence edges and associated test expectations were corrected. Schemas v2.8.0 validate 194 definitions and 162 influence edges across six books. Superseded Book 6 v0.1 files should not be handed to Claude; use Book 6 v0.2. Foundry acceptance cases still not executed.


## Book 7 Legacy Era Canonical Rebuild (schema v2.9; 2026-11-17)

**Source:** Legacy Era Campaign Guide, printed p53–56, PDF physical p54–57 rendered and visually compared to Legacy TXT. Official book errata not independently authenticated. **18 new canonical entries = 9 Force Powers + 9 Techniques**; Legacy Force Shield p54 is a reprint of FUCG p86, not a duplicate. **11 fixed DC rows** (4 Dark Transfer, 4 Detonate, 3 Prescience), and no fake fixed DC ladders for defense-checked powers.

**Validation:** v2.9 strict schema: all 212 definition identities in 7 packages and all 178 influence edges pass structural revalidation, with source IDs stable and no collisions. Book 7 contributes 16 influence edges and 166 specified-not-run tests. No live Foundry execution, repo edits, or GitHub commits.

**New mechanics:** on-attempt recurring persistent costs and dark-side consequences, area half-on-miss with per-target defense, fire attack bonus sourced from initial UTF check, action alternatives, finite roll/defense substitutions, follow-up redirected attacks, additional Reflex+Fortitude gates, half of actual damage on Detonate object to nearby foes, widened Force Shield vehicle/adjacent coverage without SR stacking, global event-triggered talent effects, and Death Sticks -10 UTF/+1 morale attack and defense/no-FP restrictions.

**RAW preservation:** JATM Form Power talent-ownership riders remain independent of active stance (v2.8 correction). Prior book data are not modified, but revalidated derivatives ship in Book 7 ZIP.

**Open:** Explicit cases LEG-001–010 are blocking or review. The 212/212 count exhausts the initial inventory only; implementation still requires source-corpus gap scan, atomic actor effect plans, resolution of semantic blockers, and actual Foundry tests.

**Artifacts:** `SWSE_Force_V2_Legacy_Era_Book_7_Source_Package_v0.1.zip`, `SWSE_Force_V2_Legacy_Era_Book_7_Editorial_Review_v0.1.md`, `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.9.json`, and Book 7 source definitions / influence graph / acceptance / validation files.
