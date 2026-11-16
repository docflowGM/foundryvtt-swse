# Prestige Mentor Survey — Implementation Specification

**Source authority:** prestige rolling design v0.26 (§8 pivot, §39 gates), Q2 v0.8, Q3 v0.1, Q4/Q5 editorial, Q6 handoff (`228a7dc01`), shared v0.9 §9/§13. IDs `PR-nn`.

## 1. Meaning (PR-01)

A prestige class is an **earned milestone**, possibly the character's final desired identity, not necessarily a stepping stone. The survey never forces a further class goal, even at level 20 or in a short campaign. Q4 depth and Q5 future purpose are independent.

## 2. Questions

| Q | Name | Content |
|---|---|---|
| Q1 | The Journey | Class-discovery pivot (§8): a light conversation; the player says in first person which future class capability or vocation interests them. Not ownership. 32 class banks, 1,293 Q1 route IDs |
| Q2 | The Achievement | Synthesis of **verified** existing strengths from the actor evidence projection; not a talent-tree lecture, not a vote. 32 classes |
| Q3 | The Responsibility | One applied scenario per class (160 scenes; 5 per class selected by Q1 route; 800 first-person options); a hypothetical is never history |
| Q4 | The Commitment | `dip`, `dive`, `swim`, `undecided` (depth in *this* prestige class); no numeric level quotas; no `bridge` depth |
| Q5 | The Future | 7 class-specific first-person purposes (enduring calling, continued refinement, contribution, personal dream, another professional destination, active exploration, undecided); one primary + at most one optional secondary; no category titles shown; secondary has **no** weight; "another career" opens Discover → Explore → Affirm and declares a typed goal only on explicit affirmation |
| Q6 | The Mentor's Reflection | Shared engine; achieved-milestone framing |

## 3. Class → Mentor (PR-02, from the handoff roster; must equal the registry)

| # | Class | Mentor | # | Class | Mentor |
|---|---|---|---|---|---|
| 1 | Ace Pilot | Mayu | 17 | Independent Droid | Seraphim |
| 2 | Bounty Hunter | Kex Varon | 18 | Infiltrator | Delta |
| 3 | Crime Lord | Tío the Hutt | 19 | Master Privateer | The Captain |
| 4 | Elite Trooper | Breach | 20 | Medic | Kyber |
| 5 | Force Adept | Seeker Vera | 21 | Saboteur | Spark |
| 6 | Force Disciple | Riquis | 22 | Outlaw | Rogue |
| 7 | Gunslinger | Rajma | 23 | Droid Commander | General Axiom |
| 8 | Jedi Knight | Miraj | 24 | Military Engineer | Chief Engineer Rax |
| 9 | Jedi Master | Miraj | 25 | Vanguard | Shield Captain Theron |
| 10 | Officer | Admiral Korr | 26 | Martial Arts Master | Master Zhen |
| 11 | Sith Apprentice | Darth Malbada | 27 | Imperial Knight | Dezmin |
| 12 | Sith Lord | Darth Miedo | 28 | Shaper | Shaper Urza |
| 13 | Corporate Agent | Marl Skindar | 29 | Assassin | Delta |
| 14 | Gladiator | Pegar | 30 | Charlatan | Silvertongue Sela |
| 15 | Melee Duelist | Blade Master Kharjo | 31 | Improviser | Lucky Jack |
| 16 | Enforcer | Krag the Immovable | 32 | Pathfinder | Lead |

Shared-Mentor pairs (Miraj ×2, Delta ×2) have distinct relationship text per class. Unknown/unmapped class ⇒ survey withheld, never another Mentor.

## 4. Rules

* **Pending vs finalized tense** (PR-03): before the class is finalized, no title, feature, rank or identity is narrated as owned; use threshold/eligibility tense. Cancel leaves no persistent change.
* **Evidence** (PR-04): Q2/Q6 facts only from the finalized actor evidence projection; never fabricate feats, talents, training, missions or affiliations.
* **Q1** (PR-05): stores answer ID, text version, candidate class, Mentor and an evidence-snapshot pointer only. Never creates an acquired feat/talent/power or a goal event. Slate size/rotation/ordering is **not approved** (MSV-RD-005): implemented as a stable, deterministic, complete paged browse (five at a time, no repeats, all routes reachable) with no ranking claims.
* **Q4** (PR-06): depth is a self-report scoped to level/date; no prestige weighting/pruning; never an illegal level lock; Bridge is separate.
* **Q5** (PR-07): fulfillment of a declared typed goal is shown only if finalized state verifies it; a prior goal is never overwritten without a separate affirmative confirmation event; "undecided" and "no goal" are valid.
* **Multiple prestige classes** (PR-08): each acquisition is its own finalized event; earlier prestige identity and goals are never erased.
* **Level 20 / low remaining budget** (PR-09): no implied legal future advancement or obligation to complete the class (apex five-level classes Jedi Master, Sith Lord, Force Disciple per V2 rules).
* **Quarantine** (PR-10): any answer whose mechanical claim is `unverified_mechanic` is never offered as a mechanics-driven option. Known gates: Charlatan Fortune tree, Jedi Master/Sith Lord general Force trees, Assassin GenoHaradan tree ID, Independent Droid tree ID, Sith Dark Side Score RAW vs house rule, Gunslinger/Outlaw/martial-arts source identity cases (see `06`).
* **Q6** (PR-11): the 32-class prestige Q6 dialogue package is **not in Git** on any branch. That is not proof it was never written: the owner's editorial work may have produced it outside the repository, and the handoff in Git still lists Q6 as the next task. The shared engine is implemented and Prestige Q6 now runs on it with a neutral, unattributed frame. The per-class package is an **editorial source-artifact integration dependency (not an engine blocker)**: it must be brought into the repository by the owner, and it must not be reconstructed, regenerated or paraphrased from the handoff.

## 5. Release consequence

Prestige Q6 text is absent and only Ace Pilot Q3/Q4/Q5 wording is owner-approved; §39.5 requires explicit owner sign-off, an approved Q1 slate policy, and resolution of the mapping gates before player-facing enablement. Therefore every prestige scope is `withheld` in the release manifest at this commit; the legacy four-question survey is deleted and there is no fallback.

## 6. As built (D3)

Q1 to Q6 are implemented for all 32 classes on the shared components (superseding the earlier status that skipped Q1, Q2, Q3 and Q6). Q6 runs through the shared reflection with a neutral frame; the class-specific dialogue package is not in Git. The survey uses the pending-acquisition Mentor introductions. Q4 records `typed.declaredPrestigeDepth` (undecided records null). Q5 records `typed.primaryPurpose` and an optional `typed.secondaryPurpose` (no weight); the second purpose is an inner stage `q5b` (skipped for an undecided primary). No prestige answer declares a goal (`MSV-RD-010`). Independent tree-access audit ingested as a progress note on `MSV-RD-006`. Details and the manual acceptance procedure: `06-CONTENT-STATUS-AND-BLOCKERS.md` §9.
