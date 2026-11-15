# Content Status, Conflicts, Missing Artifacts and Blockers

Updated per phase. Evidence date 2026-11-15. "Approved" means the upstream documents record explicit owner approval of that wording; a drafting pass is never approval.

## 1. Content families and approval state

### Level 1 (source v0.19)

| Family | Count | Editorial status | Mechanical status |
|---|---:|---|---|
| Mentor stage intros (Q1–Q5 × 5 Mentors) | 25 | J0-N1 ×5 approved (earlier context; Q3 lines flagged for rewrite); other 20 draft | n/a |
| Q1 class-development answers | 30 (6/class) | Jedi ×6 **approved**; 24 draft | mappings uncertified |
| Q2 universal career answers | 97 | first 25 endorsed examples; 72 draft | n/a |
| Q2 class-specific career variants | 485 | draft | n/a |
| Q2 class anchors (20) | 20 | approved layout | IDs verified vs `data/archetypes.json` in tests |
| Q3 class situations / replies | 30 / 150 | draft | `editorialFocus` untrusted; P0 gate (blocked) |
| Q4 parent situations / child replies / method backfills | 97 / 200 / 485 | draft (architecture **locked**) | tags unassigned |
| Q5 long-term ambition | 25 | draft (Noble prototype liked) | tags unassigned |
| Player-response display contract | — | **approved** | — |

### Multiclass (source v0.11)

| Family | Count | Editorial status |
|---|---:|---|
| Mentor transition intros | 18 | draft ("owner-approved lines: none yet") |
| Q1 origin-keyed discovery answers | 100 (+ neutral) | draft |
| Q2 mechanical-bias × destination answers | 625 | draft |
| Q3 depth (`dip/dive/swim/undecided`) + detail rails | 4 | **approved** |
| Q4 scenarios | 250 (1,250 methods + 250 neutral) | architecture approved; text draft; 36 families mapped to all 100 Q1 routes |
| Q5 milestone templates | 500 proposed | **proposal only**, not approved |
| Q6 Pass A clause variants / Pass B corrections | 170 / library | draft (authoring complete) |

### Prestige (source v0.26 / Q2 v0.8 / Q3 v0.1 / Q4 / Q5 / Q6 handoff)

| Family | Count | Editorial status |
|---|---:|---|
| Q1 class-discovery libraries | 32 classes, 1,293 route IDs | draft; slate policy unapproved |
| Q2 synthesis | 32 classes | direction endorsed; prose not approved |
| Q3 scenarios / options | 160 / 800 | Ace Pilot approved; 31 classes draft |
| Q4 depth intros + 4 shared answers | 32 | shared 4-answer pattern **approved**; Ace Pilot/Mayu approved; 31 draft |
| Q5 purposes | 224 options, 64 intros, 32 secondary | architecture approved; Ace Pilot's 7 lines accepted; 31 classes draft |
| **Q6 prestige-specific dialogue** | 0 | **MISSING** (see §3) |

## 2. Spec conflicts and their disposition

| ID | Conflict | Disposition |
|---|---|---|
| C-01 | Directive labels L1 Q3/Q4 "First/Second Career Situation"; locked v0.18 defines Q3 = class situation (Q1-keyed), Q4 = parent-career situation (Q2-keyed) | Follow locked v0.18 (consistent with every behavioral invariant in the directive). Naming is not player-visible. Flagged for owner confirmation only |
| C-02 | Prestige v0.26 §39.1(2) says Q2 "teaches and validates newly available class abilities"; Q2 v0.8 + directive say Q2 synthesizes verified existing strengths and must not repeat Q1 class-feature education | **Resolved by the directive** (explicit owner instruction): Q2 = synthesis of verified existing strengths. §39.1(2) superseded |
| C-03 | Prestige §1–7 retrospective Q1 vs §8 class-discovery Q1 | Resolved by §8/§39.1 (documented owner direction) |
| C-04 | Multiclass Q2: "125 bias × class" vs earlier sizing proposals | Later "top-four existing-scores contract" + 625 library prevails |
| C-05 | Multiclass Q4 counts 36 → 150–250 | 250 prevails; the companion JSON is not committed (see §3) |

## 3. Missing source artifacts

| Artifact | Needed for | Finding |
|---|---|---|
| Prestige Q6 dialogue package (32 Mentors; openings, closings, conditional branches, A–E, NOT/AM text) | PR-11 | Searched every remote branch. Only `SWSE_Prestige_Q6_Fresh_Chat_Handoff_2026-11-15.md` exists, and it assigns Q6 as the *next, undone* task. **Blocker; not reconstructed** |
| `SWSE_Q4_250_Scenario_Library_LOCAL.json` | MC Q4 machine-readable catalog | Not committed anywhere. The 250 scenarios exist in the committed markdown (`SWSE_Multiclass_Survey_Rolling_Design.md`, lines 2178–5987); the build tool parses the markdown |
| `SWSE_L1_Q2_Class_Specific_Career_Responses_Combined_97x5_v0.4….json` | L1 Q2 | Not committed. The markdown companion is committed and parsed |
| `SWSE_Q6_Archetype_Identity_Index_LOCAL.tsv` | MC Q6 Pass A | Local-only; replaced at runtime by `ArchetypeRegistry` (the cited authority) |
| L1 Q3 certified response→tag map (P0) | L1 Q4 personalization | Does not exist; out of scope (tag boundary) |

## 4. Rules / design decisions required from the owner

Registered in `docs/audits/swse-rules-decisions-pending.md` under `MSV-RD-###`.

## 5. Phase B: canonical mechanical and Mentor certification (verified against `main` @ `8efa6808a`)

Printed-rule verification limit: `reference/sourcebooks/*.txt` are OCR exports, and the README makes the PDFs the final authority. The PDFs are not in the repository and the OCR for the relevant Charlatan page is unreadable, so printed tree access **could not be independently confirmed here**. Unverified mechanics fail closed.

| Review target | Finding on current `main` | Disposition |
|---|---|---|
| Kharjo missing from Mentor registry | **Confirmed.** `data/dialogue/mentor_registry.json` had 31 entries (ids `m01`…`m30`, `m32`; `m31` unused). `data/dialogue/mentors/kharjo/` exists | **Fixed**: `kharjo` / `m31` / "Blade Master Kharjo" added. Test: `mentor-survey-canonical-authority` |
| All 37 classes → Mentor | `MENTOR_PERSONALITIES[class].key` agrees with the owner roster for all 5 foundation + 32 prestige classes | **Verified**; routing table `data/mentor-survey/class-mentor-routes.json` is test-locked against registry and personalities. Lead (Scout, Pathfinder), Miraj (Jedi, Knight, Master), Delta (Infiltrator, Assassin), Breach (Soldier, Elite Trooper) are shared Mentors |
| Assassin GenoHaradan | **Confirmed defect.** `talent_trees` holds the display text `GenoHaradan`; `talentTreeSourceIds` holds the correct id `da7b731a3e434a7a` | **Not edited**: `packs/classes.db` is a frozen protected baseline (`tests/class-pack-protected-guard.test.mjs`, 37 records). Surveys read `talentTreeSourceIds` only. Owner of fix: protected-baseline process |
| Infiltrator Bothan SpyNet | **Confirmed defect.** Raw `Bothan SpyNet`; correct id `d20682671d035cef` | Same as above |
| Independent Droid tree identity | **Confirmed defect.** `talentTreeUuids[0]` uses a dashed uuid (`…9fe73a37-03fa-45fc-a628-fd43cae6bf7f`) that does not equal the tree `_id` (`9fe73a3703fa45fca628fd43cae6bf7f`, the only 32-hex tree id). Also: the pack lists three trees (Autonomy, Specialized Droid, Elite Droid) while `data/fixes/class-talent-tree-bindings.json` lists two | Id defect: same as above. Tree-set disagreement: **`MSV-RD-006`** (needs printed verification) |
| Charlatan Fortune-tree access | Pack and bindings list Disgrace + Trickery only; the `Fortune` tree exists (`cee9b9398682b7d0`) | Printed access unverifiable here: **`MSV-RD-006`**. Fortune-based Charlatan answers stay `unverified_mechanic` |
| Jedi Master / Sith Lord general Force trees | Pack/bindings list Duelist / Sith only | **`MSV-RD-006`**; general-Force-tree answers quarantined |
| Sith Dark Side Score | Already ruled by the project owner: house rule "Dark Side Score at least 1" (`docs/audits/class-phase-6f2-piracy-sith-adjudication.md`); ongoing class-feature suspension is open finding 6B-010 | Not re-decided. Surveys never narrate Sith eligibility or DSS thresholds |
| Gunslinger / Outlaw / martial-arts source identity (Teräs Käsi, Pistoleer titles, Fringer/Virus) | Design record marks them QUARANTINE (unreliable rule identity) | Content records referencing them are `unverified_mechanic`; never offered as mechanics-driven options |
| `scripts/engine/mentor/validate-mentor-dialogue.js` | Pre-existing: crashes on a wrong repo-root path and, if fixed, expects a flat per-mentor file layout the repo no longer uses | **Not touched** (stale legacy tool, unrelated to survey authorities) |

## 6. Phase C: shared infrastructure (landed, not yet wired to the progression shell)

New pure modules in `scripts/mentor/mentor-survey-v2/` (renamed over the legacy directory at the D-phase cutover): `contract`, `content-store`, `survey-session`, `intent-ledger`, `actor-evidence`, `reflection`, `tag-boundary`. 56 offline tests (`tests/mentor-survey-*.test.mjs`). These prove engine behavior only; none is a Foundry runtime test.

## 7. Phase D/E status

*(appended as phases complete)*
