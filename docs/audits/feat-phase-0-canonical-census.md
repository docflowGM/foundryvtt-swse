SWSE Feat Canonicalization — Rolling Authority

Status: PHASE 0 COMPLETE — canonical census frozen; authority corrected after persistence readback
Version: 1.1 — Phase 0 complete, persistence-readback corrections applied
Updated: 2026-10-02
Repository: docflowGM/foundryvtt-swse
Post-Talent-Phase-12 baseline: 4159f29f83b45c83a8b3c0eaecd36466614b0f8d
Feat audit branch: audit/feat-phase-0-enumeration

Persistence-readback authority corrections

These corrections repair the authority representation discovered when Claude persisted Phase 0. They do not change any frozen Phase 0 census value or source ruling.

• Extra Rage repo ID corrected from truncated c01f64239af7705 to c01f64239af7705d.
• Pin repo ID corrected from truncated c238f3f722689a3 to c238f3f722689a3a.
• All 48 Rebellion Era Species Feats now carry their unique current catalog repoId.
• All 20 Galaxy at War Martial Arts/Team records that were previously name-only now carry their unique current catalog repoId.
• Display encoding normalized for Flèche, Teräs Käsi Training, and the “Long Haft Form” cross-reference note.
• The stale Phase 0K/ACTIVE header has been replaced with the Phase 0 complete/frozen status.

Frozen acceptance values remain: 353 canonical identities, 352 unique normalized names, 355 publications, 2 reprints, 390 current repo records, 351 represented canonical identities, 2 missing identities, 39 outside-corpus records = 6 implementation derivatives + 33 noncanonical/wrong-domain/legacy.

Operating model

ChatGPT plans and audits. Claude Code executes repository mutations.

• This document and the companion JSON are the rolling authority we will feed to Claude.
• ChatGPT updates the plan, source findings, owner rulings, acceptance gates, and unresolved questions here.
• Claude executes only explicit repository work derived from this authority and the current command.
• Claude must not silently expand scope, resolve source conflicts by guesswork, or rewrite historical audit evidence.
• The Phase 0 branch was already created before this division of labor was clarified; Claude should reuse it.

End goal

Every canonical SWSE feat should end with independently certified:

1. Identity — exact published feat, including same-name distinctions, tier, scope, and repeatability.
2. Canonical rules content — description/benefit from the published source.
3. Prerequisite legality — printed prerequisite and live acquisition authority agree.
4. Provenance — correct book and printed page.
5. Player summary — short derived player-facing explanation.
6. Semantic tags — source-grounded mechanical semantics, not structural shortcuts.
7. Mechanical implementation provenance — where Foundry implements the rule and whether automation is complete.
8. Archetype connections — curated canonical-ID recommendations plus semantic affinity.

Source authority hierarchy

1. Published sourcebook TXT — fast searchable primary-source layer.
2. Published PDF — final authority when OCR, page, layout, category, or same-name identity is ambiguous.
3. User-supplied wiki list — enumeration seed/checklist only.
4. Current repository — comparison target after source enumeration; never defines canon by itself.

The wiki distinction between general feats and specialization feats is classification only. Both belong to one canonical feat corpus. Source-defined categories such as Species Feats, Team Feats, Martial Arts Feats, and Skill Challenge Feats are retained as publication metadata, not separate universes and not automatic semantic tags. Starships of the Galaxy is a specific exception to the earlier provisional wording: its printed “Starship Feats” heading is a rules-application section explaining how existing Core feats work at starship scale; it is not a feat subtype and does not create new identities.

Current repository baseline

• data/feat-catalog.json — production feat SSOT.
• packs/feats.db — generated feat pack.
• Prior integrity audit count: 390 records with catalog/pack parity.
• packs/feat-catalog.db — orphaned historical artifact. Do not use it as feat authority or recovery source.

Phase 0 — Enumeration

Wiki seed

• Parsed wiki seed: 285 feat rows.
• Includes Core, 13 published books, and 2 Web Enhancement entries.
• The JSON companion contains every seed row with its wiki prerequisite and short benefit.

|Source                                    |Wiki rows|
|------------------------------------------|--------:|
|Clone Wars Campaign Guide                 |21       |
|Force Unleashed Campaign Guide            |21       |
|Galaxy at War                             |21       |
|Galaxy of Intrigue                        |26       |
|Jedi Academy Training Manual              |5        |
|Knights of the Old Republic Campaign Guide|21       |
|Legacy Era Campaign Guide                 |19       |
|Rebellion Era Campaign Guide              |12       |
|Saga Edition Core Rulebook                |64       |
|Scavenger’s Guide to Droids               |17       |
|Scum and Villainy                         |27       |
|Starships of the Galaxy                   |4        |
|Threats of the Galaxy                     |4        |
|Unknown Regions                           |21       |
|Web Enhancements                          |2        |

Known source-defined feat groups omitted from the wiki main tables

• Rebellion Era Species Feats: 48 names currently captured from the source-side subgroup.
• Galaxy at War Martial Arts + Team Feats: 20 names currently captured from the source-side subgroups.
• These 68 records are feats in the same canonical corpus; their category is metadata.

Historical Phase 0 working counts — superseded by the frozen closeout below

• Wiki seed: 285 claims.
• Wiki + the 68 known subgroup feats: 353 working claims.
• Current TXT section parser: 360 candidate publication claims / 352 unique names.
• Historical note: 360 was the provisional parser-claim count before source-context adjudication. The frozen result is 353 canonical identities / 355 full publications, as certified in Phase 0-QA below.

TXT/OCR misses from the 285-row wiki seed

These are not invalid findings. They are candidates for PDF escalation or better OCR matching:

• Saga Edition Core Rulebook: Martial Arts III
• Scum and Villainy: Close Combat Escape
• Scum and Villainy: Deadly Sniper
• Scum and Villainy: Deceptive Drop
• Scum and Villainy: Desperate Gambit
• Scum and Villainy: Hasty Modification
• Scum and Villainy: Hideous Visage
• Scum and Villainy: Staggering Attack
• Scum and Villainy: Wicked Strike
• Jedi Academy Training Manual: Long Haft Strike
• Scavenger’s Guide to Droids: Ion Shielding

High-priority Phase 0 findings

1. Recall — likely prior domain-guard false negative

• The Force Unleashed feat list/source presents Recall as a feat: prerequisite Trained in Knowledge (Any); benefit is a Knowledge reroll keeping the better result.
• Current data/feat-validity-registry.json and scripts/data/feat-domain-guard.js classify Recall as talent-domain-only, and the current 390-record feat catalog therefore has no Recall feat.
• A separate Rebellion Era talent named Recall also exists. That same-name collision likely caused the bad domain ruling.
• Phase 0 must source-certify both identities and plan an identity-safe correction; do not delete or rename the legitimate talent.

2. Staggering Attack — same-name feat identity collision

• The working source seed contains Staggering Attack in both Scum and Villainy and Galaxy at War with different prerequisites/benefits.
• Current catalog contains only the Galaxy at War record.
• Both source definitions must be TXT/PDF certified. If both are genuine, the feat system must support same-name distinct canonical IDs rather than name-only uniqueness.

3. Additional duplicate-publication candidates

Current TXT section parsing surfaced these same-name cross-source candidates. They are review candidates, not yet certified republications:

• Coordinated Attack — Clone Wars Campaign Guide; Saga Edition Core Rulebook
• Echani Training — Galaxy at War; Knights of the Old Republic Campaign Guide
• Staggering Attack — Galaxy at War; Scum and Villainy
• Combat Reflexes — Galaxy of Intrigue; Saga Edition Core Rulebook
• Point-Blank Shot — Galaxy of Intrigue; Legacy Era Campaign Guide; Saga Edition Core Rulebook
• Force Training — Jedi Academy Training Manual; Saga Edition Core Rulebook
• Charging Fire — Knights of the Old Republic Campaign Guide; Saga Edition Core Rulebook

4. 39 repo records still outside the working publication-side seed

After adding the 68 known subgroup feats to the wiki seed, 39 current catalog records remain unmatched. Do not call them invalid yet. Each must be checked against the actual source text/PDF.

The Force Unleashed Campaign Guide (10)

Forceful Strike, Forceful Throw, Forceful Will, Forceful Saber Throw, Forceful Grip, Forceful Slam, Forceful Telekinesis, Forceful Weapon, Forceful Stun, Forceful Vitality

Galaxy at War (9)

Low Profile, Reactive Awareness, Triple Crit Specialist, Reactive Stealth, Headstrong, Resilient Reflexes, Conditioned, Surgical Precision, Resilient Will

Saga Edition Core Rulebook (15)

Saber Throw, Stealthy, Weapon Proficiency (Simple Weapons), Heavy Weapon Proficiency, Improved Grapple, Trustworthy, Weapon Proficiency (Rifles), Weapon Proficiency (Heavy Weapons), Two-Weapon Fighting, Fast Talk, Great Fortitude, Frightful Presence, Lightning Reflexes, Advanced Melee Weapon Proficiency, Weapon Proficiency (Pistols)

Jedi Academy Training Manual (2)

Keen Force Mind, Intuitive Initiative

Galaxy of Intrigue (3)

Intimidating Presence, Frightening Presence, Resilient Talent

Phase 0A — Saga Edition Core Rulebook — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Canonical Core feat identities: 64.
• Publication category: 64 GENERAL feats; Core does not introduce a separate feat subcategory in the Chapter V feat definitions.
• Full feat definitions occupy printed pages 82–89.
• TXT was used as the searchable layer and the uploaded Core PDF was visually checked for the feat-definition pages and printed page mapping.
• For this source, the inspected feat range maps as PDF page = printed page + 1.
• The wiki Core seed also contains 64 rows, so the wiki enumeration is complete for the Core publication-side census.

Canonical page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|82          |8              |
|83          |5              |
|84          |8              |
|85          |10             |
|86          |8              |
|87          |6              |
|88          |12             |
|89          |7              |
|**Total**   |**64**         |

Repository reconciliation

The current repository contains all 64 Core feat identities by name, so Phase 0A found 0 wholly missing Core identities. However, the provenance metadata is badly drifted:

• Exact canonical source and printed page: 12 / 64.
• Canonical Core feat records with wrong source attribution: 8.
• Canonical Core feat records with wrong printed page: 52 / 64 total.
• Of those page mismatches, 44 still say Core but have the wrong page; the other 8 also have the wrong source.
• Current records attributed to Core: 74.
• Records attributed to Core that are not part of the 64 printed Core feat identities: 18.

The eight canonical Core identities currently attributed to another source are:

|Feat            |Canonical|Current repo attribution               |
|----------------|---------|---------------------------------------|
|Acrobatic Strike|Core p.82|Galaxy at War p.23                     |
|Bantha Rush     |Core p.82|Galaxy at War p.23                     |
|Charging Fire   |Core p.82|Galaxy at War p.24                     |
|Crush           |Core p.83|The Force Unleashed Campaign Guide p.34|
|Deadeye         |Core p.84|Galaxy at War p.24                     |
|Mighty Swing    |Core p.86|Galaxy at War p.26                     |
|Sniper          |Core p.88|Galaxy at War p.27                     |
|Triple Crit     |Core p.89|Galaxy at War p.27                     |

These later-book occurrences are references/prerequisites/statblock use, not replacement publication authority for the Core feat identity.

The 18 repo records currently attributed to Core but outside the Core census

They divide into three different classes and must not be bulk-deleted as one category.

6 derived scope/alias records — not separate publication identities

• Weapon Proficiency (Simple Weapons)
• Weapon Proficiency (Rifles)
• Weapon Proficiency (Heavy Weapons)
• Weapon Proficiency (Pistols)
• Advanced Melee Weapon Proficiency
• Heavy Weapon Proficiency — additionally appears to duplicate/alias the heavy-weapons scope

The printed Core rule is one repeatable Weapon Proficiency feat. Each selection chooses one weapon group. The printed groups are advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, and simple weapons. The existing per-scope records are implementation derivatives and must not inflate the canonical feat count. Their final representation belongs to the later scope/family structural audit.

3 canonical feats whose current source is wrong

• Tech Specialist → Saga Edition Web Enhancement 1
• Mounted Combat → Unknown Regions
• Natural Leader → The Force Unleashed Campaign Guide

9 noncanonical / wrong-domain / legacy records

• Saber Throw — no feat definition; Core publishes Lightsaber Throw as a Jedi talent.
• Stealthy — old d20 feat terminology; Saga conversion maps it to Skill Focus (Stealth).
• Improved Grapple — no published SWSE feat definition found; Core grapple feat set uses Pin/Crush/Throw/Trip.
• Trustworthy — old d20 feat terminology; Saga conversion maps it to Skill Focus (Persuasion) or Skill Focus (Gather Information).
• Two-Weapon Fighting — old d20 feat; Saga conversion maps it to Dual Weapon Mastery II.
• Fast Talk — no published feat heading found; do not confuse with the later Fast Talker talent.
• Great Fortitude — old feat/species-trait label; Saga conversion maps the old feat to Improved Defenses.
• Frightful Presence — old d20 feat; Saga conversion gives no direct Saga feat equivalent.
• Lightning Reflexes — old feat/species-trait label; Saga conversion maps the old feat to Improved Defenses.

Core structural families identified for later Phase 1C

Printed tier/family structures:

• Armor Proficiency: Light → Medium → Heavy
• Dual Weapon Mastery I → II → III
• Martial Arts I → II → III

Scoped/repeatable families requiring explicit structural authority later include:

• Double Attack
• Exotic Weapon Proficiency
• Force Training
• Improved Damage Threshold
• Linguist
• Skill Focus
• Skill Training
• Triple Attack
• Triple Crit
• Weapon Focus
• Weapon Proficiency

Phase 0A ruling

The Saga Edition Core Rulebook canonical feat census is frozen at 64 published feat identities.

This freezes publication identity only. It does not authorize production changes to descriptions, prerequisites, source/page, tags, automation, or derived scope records yet. The exact 64-record page/repository map is stored in the companion JSON.

Next subphase: Phase 0B — Starships of the Galaxy.

Phase 0B — Starships of the Galaxy — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Wiki Starships seed: 4 rows.
• Full feat definitions printed in Starships of the Galaxy: 4.
• New canonical feat identities contributed by the book: 3.
• Full reprints of an earlier canonical feat identity: 1 — Tech Specialist.
• The actual NEW FEATS definitions occupy printed pages 20–21.
• TXT was used as the searchable layer and the uploaded PDF was visually checked for the section boundary and printed pages.
• For the certified range, PDF page = printed page + 1.

|Published definition|Printed page|Identity ruling                                     |
|--------------------|-----------:|----------------------------------------------------|
|Starship Designer   |20          |New Starships canonical identity                    |
|Starship Tactics    |20          |New Starships canonical identity                    |
|Tactical Genius     |21          |New Starships canonical identity                    |
|Tech Specialist     |21          |Full reprint of the earlier Web Enhancement identity|

Important section-boundary ruling: STARSHIP FEATS is not a new feat category

Printed page 19 contains a STARSHIP FEATS section, but it does not publish a new feat subtype. It explains how already-published Core feats function at starship scale. It therefore creates 0 new feat identities.

The section discusses these 16 existing Core feat identities:

• Burst Fire
• Careful Shot
• Deadeye
• Coordinated Attack
• Dodge
• Double Attack
• Triple Attack
• Dual Weapon Mastery I
• Dual Weapon Mastery II
• Dual Weapon Mastery III
• Far Shot
• Point Blank Shot
• Rapid Shot
• Improved Defenses
• Triple Crit
• Weapon Focus

These starship-scale application notes are valuable later for mechanical implementation provenance, but they must not inflate the publication census or overwrite Core provenance.

Tech Specialist reprint ruling

The earlier Saga Edition Web Enhancement 1 explicitly publishes New Feat: Tech Specialist and states that those rules will later be featured in an upcoming sourcebook. Starships of the Galaxy then republishes the full feat on p.21.

Phase 0B ruling:

Tech Specialist = SAME_FEAT_FULL_REPRINT

• Primary canonical identity source: Saga Edition Web Enhancement 1.
• Starships reprint provenance: p.21.
• Canonical identity contribution from the Starships reprint: 0.
• Phase 0O will finish the Web Enhancement-side provenance certification.

Repository reconciliation

The current repository has all three new Starships identities, but all three have wrong page metadata:

|Feat             |Canonical     |Current repo  |Repo ID           |
|-----------------|--------------|--------------|------------------|
|Starship Designer|Starships p.20|Starships p.30|`e9147ce66a783fbb`|
|Starship Tactics |Starships p.20|Starships p.30|`376d805d1b73f7e6`|
|Tactical Genius  |Starships p.21|Starships p.30|`da8e272f5dae09b9`|

For the three genuinely new Starships identities:

• Present in repo: 3 / 3.
• Completely missing: 0.
• Correct source attribution: 3 / 3.
• Correct source and printed page: 0 / 3.
• Page mismatches: 3 / 3.
• Repo-only records attributed to Starships: 0.

Tech Specialist is also present in the repo (42e2404790756700), but it is currently misattributed to Saga Edition Core Rulebook p.88. That is not a Starships-missing-record problem; it is a cross-book provenance problem. Phase 0B establishes the Starships reprint at p.21, while Phase 0O will certify the Web Enhancement as the primary source.

Phase 0B ruling

Starships of the Galaxy contributes exactly 3 new canonical feat identities.

The book contains 4 full feat definitions because Tech Specialist is a reprint. Publication identity is therefore:

• 3 new identities
• 1 full reprint
• 0 missing new identities in the repo
• 0 repo-only Starships records
• 3 page corrections eventually required

This freezes Starships publication identity only. It does not authorize changes to source/page metadata, descriptions, prerequisites, tags, summaries, automation, or archetype relationships yet.

Next subphase: Phase 0C — Threats of the Galaxy.

Phase 0C — Threats of the Galaxy — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Wiki seed claims: 4.
• Canonical published feat identities: 4.
• Full feat definitions: 4.
• Reprints: 0.
• PDF-verified printed pages: 64, 91, and 127.
• All four identities already exist in the current repository.

|Feat            |Printed page|Publication category|Current repo page|Repo status  |
|----------------|-----------:|--------------------|----------------:|-------------|
|A Few Maneuvers |64          |GENERAL             |20               |PAGE_MISMATCH|
|Suppression Fire|91          |GENERAL             |21               |PAGE_MISMATCH|
|Momentum Strike |127         |RIDING_FEAT         |20               |PAGE_MISMATCH|
|Mounted Defense |127         |RIDING_FEAT         |20               |PAGE_MISMATCH|

Source/category rulings

• A Few Maneuvers is a genuine feat, printed in the Ace Pilot material as a NEW FEAT sidebar on p.64. It is not merely a statblock shorthand.
• Suppression Fire is a genuine NEW FEAT printed with the soldier material on p.91.
• Momentum Strike and Mounted Defense are explicitly grouped under the source heading NEW RIDING FEATS on p.127. RIDING_FEAT is therefore added to the publication-category vocabulary. This is publication metadata only and does not automatically create semantic tags.
• Threats contributes 4 new canonical identities and no full reprints.

Repository reconciliation

• Current records attributed to Threats: 4.
• Canonical Threats identities present somewhere in repo: 4 / 4.
• Missing: 0.
• Correct source: 4 / 4.
• Correct source + printed page: 0 / 4.
• Page mismatches: 4 / 4.
• Repo-only Threats-attributed records: 0.

Phase 0C ruling

Threats of the Galaxy is frozen at 4 canonical published feat identities.

This freezes publication identity/provenance only. No production correction is authorized yet.

Phase 0D — Knights of the Old Republic Campaign Guide — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Wiki seed claims: 21.
• Canonical published feat identities: 21.
• Full feat definitions: 21.
• Reprints within this source: 0.
• Full feat definitions occupy printed pages 32–35.
• TXT enumeration was visually certified against the uploaded PDF.

Canonical page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|32          |3              |
|33          |7              |
|34          |6              |
|35          |5              |
|**Total**   |**21**         |

Exact feat/page authority

p.32: Accelerated Strike; Conditioning; Critical Strike.
p.33: Echani Training; Force Readiness; Flurry; Gearhead; Implant Training; Improved Rapid Strike; Increased Agility.
p.34: Logic Upgrade: Self-Defense; Logic Upgrade: Tactician; Mandalorian Training; Poison Resistance; Power Blast; Quick Skill.
p.35: Republic Military Training; Sith Military Training; Sniper Shot; Tumble Defense; Withdrawal Strike.

Repository reconciliation

• Current records attributed specifically to KOTOR: 20.
• Canonical KOTOR identities present somewhere in repo: 21 / 21.
• Completely missing identities: 0.
• Exact source + printed page matches: 0 / 21.
• Page mismatches: 21 / 21.
• Source mismatches: 1 — Echani Training is currently stored as Star Wars Saga Edition, p.0 rather than KOTOR p.33.
• The other 20 use the correct KOTOR sourcebook but stale/wrong page values.
• Repo-only records attributed to KOTOR: 0.

Identity/parser rulings

• Echani Training is definitively published in KOTOR on p.33. Its later Galaxy at War occurrence remains a reprint candidate to compare during 0K/0-QA; do not create a second identity merely because the same name appears later.
• Charging Fire is not a KOTOR feat republication. The KOTOR TXT parser surfaced it from combined-feat/prerequisite references. That raw parser candidate is adjudicated REFERENCE_ONLY_NOT_REPRINT for KOTOR.
• Withdrawal Strike is structurally scoped: when the feat is taken, the character selects one exotic weapon or weapon group. That selection model belongs to the later scope/family structural audit and must not inflate publication identity count.

Phase 0D ruling

Knights of the Old Republic Campaign Guide is frozen at 21 canonical published feat identities.

This freezes publication identity/provenance only. No production correction is authorized yet.

Certified progress through Phase 0D

• Books certified: 4 (Core, Starships, Threats, KOTOR).
• Canonical identities certified across those book subphases: 92.
• Full feat definitions certified: 93.
• Full reprints certified: 1 (Tech Specialist in Starships).
• Final all-book canonical count remains unfrozen until 0A–0O and global 0-QA are complete.

Next subphase: Phase 0E — The Force Unleashed Campaign Guide.

Structural rules for the feat audit

• One canonical feat universe; wiki category does not split identity.
• Homebrew is outside the canonical census unless explicitly authorized later.
• Publication category is metadata; it is not automatic semantic tag authority.
• Semantic tags must never become hidden authority for prerequisite legality, scope, tier, proficiency, or identity.
• Same-name published abilities may be distinct canonical records.
• Scoped feats (for example Weapon Focus/Proficiency/Skill Focus/Double Attack variants) need explicit selection/scope metadata.
• Tiered feats printed separately retain separate published identities.

Planned phases

Phase 0 — Enumeration and frozen baseline

• complete source-side feat census
• publication categories
• same-name identity ledger
• repo reconciliation
• frozen counts

Phase 1A — Published feat census certification

• book-by-book canonical feat manifest
• page/source evidence
• scope/tier/family metadata

Phase 1B — Repository identity reconciliation

• canonical claim to repo ID map
• missing/repo-only/wrong-domain findings
• same-name identity repairs planned

Phase 1C — Scope/tier/family structural audit

• scoped choice authority
• tier chains
• repeatability rules
• class bonus-feat eligibility separation

Phase 2 — Canonical content certification

• full description
• benefit
• prerequisite text
• source/page
• book-by-book checkpoints

Phase 3A — Production authority convergence

• catalog/prerequisite authority parity
• deterministic SSOT relationship
• consumer boundary tests

Phase 3B — Apply canonical content

• production catalog updates
• pack rebuild
• mutation-boundary proof

Phase 4 — Player summaries

• short derived summary for every canonical feat
• family consistency QA

Phase 5A — Existing feat tag vocabulary census

• all current tags
• usage counts
• aliases
• dead tags
• structural-vs-semantic split

Phase 5B — Semantic tag adjudication

• complete source-grounded tag array per feat
• shared ontology where mechanically justified

Phase 5C — Global semantic QA

• cross-book family convergence
• zero untagged
• zero unknown tags
• no consumer misuse of semantic tags

Phase 6A — Existing archetype connection audit

• current explicit recommendations
• fuzzy mappings
• tag biases
• broken/missing links

Phase 6B — Canonical archetype connections

• ID-safe curated feat-to-archetype relationships
• relationship provenance
• CORE/STRONG/SUPPORTING/OPTIONAL semantics

Phase 6C — Semantic archetype affinity

• archetype semantic profiles
• tag-driven discovery distinct from explicit recommendation authority

Phase 7A — Mechanical implementation provenance

• implementation model per feat
• runtime consumer map
• manual-vs-automated classification

Phase 7B — RAW vs runtime verification

• AUTOMATED_VERIFIED/AUTOMATED_PARTIAL/MANUAL_BY_DESIGN/MISSING_AUTOMATION/BLOCKED_BY_SUBSYSTEM/IMPLEMENTATION_MISMATCH status per feat

Phase 8 — Global cross-corpus QA

• mechanical-family convergence
• prerequisite parity
• same-name distinction
• consumer independence tests

Phase 9 — Production certification and closeout

• 100% canonical certification
• catalog/pack parity
• final provenance coverage
• archetype coverage audit
• closeout docs

Feat-specific prerequisite rule

Prerequisites are part of canonical content certification, not an afterthought. For every feat we must prove parity among:

published prerequisite
    = canonical audit authority
    = data/feat-catalog.json display prerequisite
    = FEAT_PREREQUISITE_AUTHORITY / live acquisition prerequisite
    = AbilityEngine legality outcome

Any disagreement is a blocker for that feat.

Claude execution rules

• Do not infer scope from stale historical audits when this authority has a newer ruling.
• Do not mutate production during enumeration unless an explicit execution command authorizes it.
• For book-by-book phases, commit and push after each completed/certified book.
• Always perform local validation, push, and remote readback before claiming a checkpoint complete.
• Preserve audit history; add superseding authority instead of rewriting historical evidence.
• Report unexpected source conflicts rather than silently choosing a side.
• Semantic tags are recommendation/search metadata unless a specific consumer contract explicitly says otherwise; they are never implicit structural identity authority.
• Use canonical IDs for identity-sensitive relationships whenever available.

Immediate next planning work

• Begin Phase 0E — The Force Unleashed Campaign Guide.
• In 0E, resolve Recall as a legitimate TFU feat versus the separate Rebellion talent/domain-guard collision.
• In 0E, source-adjudicate the ten current Forceful X repo records attributed to TFU.
• Continue 0F–0N book-by-book, then 0O Web Enhancements.
• After 0A–0O, run Phase 0-QA for cross-book reprints, same-name distinct identities, scoped families, and remaining repo-only records.
• Freeze the final canonical feat identity count only after 0-QA.
• Only then generate the Claude Phase 0 execution command to persist certified manifests/audit docs in-repo.

Rolling-authority discipline

• Update this MD and the companion JSON after every major audit batch or owner ruling.
• The JSON is the machine-readable source for counts, record sets, statuses, and exact identifiers.
• The MD is the human-readable handoff for Claude and future chats.
• Never silently overwrite a prior ruling; record supersession explicitly.
• Do not freeze the canonical feat count until Phase 0 duplicate/reprint/repo-only adjudication is complete.

Phase 0E — The Force Unleashed Campaign Guide — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Canonical feat identities: 21.
• Full feat definitions: 21.
• Full reprints: 0.
• Publication category: 21 GENERAL feats.
• Definitions occupy printed pages 31–35.
• TXT was used for enumeration and rules-heading search; the uploaded PDF was visually checked across the feat-definition range.
• In the inspected range, PDF page = printed page + 1.

Canonical page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|31          |2              |
|32          |3              |
|33          |7              |
|34          |3              |
|35          |6              |
|**Total**   |**21**         |

Repository reconciliation

• Identities present somewhere in the repo: 20 / 21.
• Missing canonical identity: Recall.
• Exact canonical source and page among present identities: 4 / 20.
• Canonical TFU identities currently assigned to the wrong source: 3 — Natural Leader, Savage Attack, Scavenger.
• Present canonical identities with wrong page metadata: 16 / 20.
• Current records attributed to TFU: 31.
• Of those 31, only 17 are actually TFU feat identities; 14 are wrong-source or noncanonical records.

Recall — source-certified false negative

Recall is a genuine feat in The Force Unleashed Campaign Guide, printed p.35. It requires training in at least one Knowledge skill and allows a once-per-day reroll of a trained Knowledge check, keeping the better result.

The current repository domain guard denies the normalized name recall as a talent-only contaminant. That is incorrect because a separate Rebellion Era talent also named Recall exists. The proper model is two different canonical identities sharing a display name, not a name-level prohibition.

Phase 0E ruling: REAL_FEAT_FALSE_NEGATIVE. Later production work must restore the TFU feat without disturbing the Rebellion talent.

Ten noncanonical Forceful X records

The following current TFU-attributed feat records are not published feat identities in the Force Unleashed feat section, the complete TFU TXT, or the combined source corpus:

• Forceful Grip
• Forceful Saber Throw
• Forceful Slam
• Forceful Strike
• Forceful Stun
• Forceful Telekinesis
• Forceful Throw
• Forceful Vitality
• Forceful Weapon
• Forceful Will

The source does contain the Forceful Warrior talent, but that is unrelated. Older implementation metadata cannot override publication enumeration.

Four additional TFU-attribution errors

These are real feats, but not TFU feat publications:

• Crush — Core feat.
• Forceful Blast — Galaxy at War feat.
• Forceful Recovery — Galaxy of Intrigue feat.
• Unstoppable Force — Clone Wars feat.

────────

Phase 0F — Scum and Villainy — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Canonical feat identities: 27.
• Full feat definitions: 27.
• Full reprints: 0.
• Publication category: 27 GENERAL feats.
• Definitions occupy printed pages 21–25.
• Because the TXT OCR is degraded, the complete feat range was visually PDF-verified.
• In the inspected range, PDF page = printed page + 1.

Canonical page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|21          |10             |
|22          |2              |
|23          |7              |
|24          |6              |
|25          |2              |
|**Total**   |**27**         |

Repository reconciliation

• Canonical Scum identities present somewhere in the repo: 26 / 27.
• Missing distinct identity: Scum and Villainy Staggering Attack.
• Current records attributed to Scum and Villainy: 23.
• Exact canonical source and page: 2 / 26 present identities.
• Source mismatches: 3.
• Page mismatches among present identities: 24 / 26.
• Repo-only records currently attributed to Scum: 0.

Three real Scum feats are currently sourced to later books despite no full feat definition there:

|Feat             |Canonical             |Current repo           |
|-----------------|----------------------|-----------------------|
|Burst of Speed   |Scum and Villainy p.21|Galaxy at War p.24     |
|Desperate Gambit |Scum and Villainy p.21|Galaxy of Intrigue p.24|
|Slippery Maneuver|Scum and Villainy p.24|Galaxy at War p.27     |

Staggering Attack — same name, distinct feat

The Scum feat on p.24 is now visually source-certified. It requires Sneak Attack or Rapid Shot or Rapid Strike and trades qualifying extra damage for additional flat damage plus forced movement.

The current repository contains only the Galaxy at War Staggering Attack record (192923f60db38831), whose prerequisites and mechanic are different.

Phase 0F ruling: SAME_NAME_DISTINCT_FEATS. The Scum identity is missing and must eventually receive its own canonical ID/source-safe record. Final source-side certification of the GAW version occurs during 0K.

Official errata captured for later content certification

These do not change Phase 0 enumeration counts, but must be applied when canonical feat text is certified:

• Collateral Damage, p.21 — add the once-per-turn-on-your-turn restriction to the second attack.
• Knife Trick, p.23 — add concealed-weapon threat behavior and clarify when the attack of opportunity is available.
• Superior Tech, p.24 — Superior Protective Armor increases armor bonus to Reflex Defense by 2.
• Wicked Strike, p.25 — add the once-per-turn-on-your-turn restriction to the immediate second attack.
• Bonus Feats, p.21 — official clarification supplies corrected class bonus-feat lists.

Phase 0 progress through 0F

|Subphase                              |Source                        |Certified unique feat identities|
|--------------------------------------|------------------------------|-------------------------------:|
|0A                                    |Core Rulebook                 |64                              |
|0B                                    |Starships of the Galaxy       |3 new + 1 reprint               |
|0C                                    |Threats of the Galaxy         |4                               |
|0D                                    |KOTOR Campaign Guide          |21                              |
|0E                                    |Force Unleashed Campaign Guide|21                              |
|0F                                    |Scum and Villainy             |27                              |
|**Unique identities certified so far**|                              |**140**                         |

Across 0A–0F we have inspected 141 full feat publications, including the one confirmed Tech Specialist reprint from Starships.

The previously unresolved repo-only enumeration queue is now down to 14 records: 9 currently attributed to Galaxy at War, 2 to Jedi Academy, and 3 to Galaxy of Intrigue.

────────

Phase 0G — Clone Wars Campaign Guide — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Canonical feat identities: 21.
• Full feat definitions: 21.
• Full reprints: 0.
• Publication category: 21 GENERAL feats.
• Definitions occupy printed pages 20–29.
• The feat section and its feat summary table independently enumerate the same 21 identities.

Canonical page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|20          |2              |
|21          |3              |
|22          |2              |
|23          |2              |
|24          |2              |
|25          |2              |
|26          |2              |
|27          |2              |
|28          |3              |
|29          |1              |
|**Total**   |**21**         |

Repository reconciliation

• Canonical Clone Wars identities present somewhere in the repo: 21 / 21.
• Missing canonical identities: 0.
• Current records attributed to Clone Wars: 20.
• Exact canonical source and page: 20 / 21.
• Source mismatches: 1.
• Page mismatches: 1.
• Repo-only records currently attributed to Clone Wars: 0.

Unstoppable Force — provenance correction

Unstoppable Force is source-certified as a Clone Wars Campaign Guide feat on p.28. The current repository record (0a6c87a410bee1f2) is incorrectly attributed to The Force Unleashed Campaign Guide p.35.

Phase 0G ruling: SOURCE_PAGE_MISMATCH. Later production convergence should retain the existing feat identity but correct its provenance to Clone Wars Campaign Guide p.28.

Structural notes

• Gunnery Specialist explicitly satisfies the prerequisite for Starship Tactics, but it remains its own Clone Wars feat identity.
• Jedi Familiarity and Pall of the Dark Side interact with Force mechanics but are not a separate publication category of “Force feats.”
• Anointed Hunter has a species prerequisite but is still published in the ordinary feat section; it is not part of Rebellion Era’s later Species Feat subcategory.

Phase 0 progress through 0G

|Subphase                              |Source                        |Certified unique feat identities|
|--------------------------------------|------------------------------|-------------------------------:|
|0A                                    |Core Rulebook                 |64                              |
|0B                                    |Starships of the Galaxy       |3 new + 1 reprint               |
|0C                                    |Threats of the Galaxy         |4                               |
|0D                                    |KOTOR Campaign Guide          |21                              |
|0E                                    |Force Unleashed Campaign Guide|21                              |
|0F                                    |Scum and Villainy             |27                              |
|0G                                    |Clone Wars Campaign Guide     |21                              |
|**Unique identities certified so far**|                              |**161**                         |

Across 0A–0G we have inspected 162 full feat publications, including the one confirmed Tech Specialist reprint from Starships.

The unresolved repo-only enumeration queue remains 14 records: 9 currently attributed to Galaxy at War, 2 to Jedi Academy, and 3 to Galaxy of Intrigue.

────────

Phase 0H — Legacy Era Campaign Guide — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

• Canonical feat identities: 19.
• Full feat definitions: 19.
• Full reprints: 0.
• Publication category: 19 GENERAL feats.
• Definitions occupy printed pages 34–37.
• The complete feat range was verified against the uploaded PDF; in this range PDF page = printed page + 1.

Canonical page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|34          |6              |
|35          |3              |
|36          |6              |
|37          |4              |
|**Total**   |**19**         |

Repository reconciliation

• Canonical Legacy identities present somewhere in the repo: 19 / 19.
• Missing canonical identities: 0.
• Current records attributed to Legacy Era: 18.
• Exact canonical source and page: 0 / 19.
• Source mismatches: 1.
• Page mismatches: 19 / 19.
• Correct source but wrong page: 18.
• Repo-only records currently attributed to Legacy Era: 0.

The current Legacy records use old page metadata in the p.15–23 range; the certified feat definitions are actually on printed pp.34–37.

Autofire Assault — feat/talent name collision

Autofire Assault is source-certified as a Legacy Era Campaign Guide feat on p.34. The current feat record (c973e43c85382068) is incorrectly attributed to Galaxy at War p.23.

The Galaxy at War source does contain Autofire Assault, but as a Weapon Specialist talent on p.22, not as this feat.

Phase 0H ruling: SAME_NAME_DIFFERENT_DOMAIN_IDENTITIES. The Legacy feat and Galaxy at War talent must coexist as separate canonical identities. Name-only domain or provenance inference is unsafe.

Structural notes

• Attack Combo (Melee), Attack Combo (Ranged), and Attack Combo (Fire and Strike) are three separate printed feat identities in one progression/family.
• Return Fire explicitly selects one exotic ranged weapon or weapon group and can be taken multiple times for different scopes. It remains one published feat identity with a repeatable acquisition scope.
• Biotech Specialist contains selectable modification traits; those options do not create additional feat identities.
• No source-defined feat subcategory is introduced by the Legacy feat section.

Phase 0 progress through 0H

|Subphase                              |Source                        |Certified unique feat identities|
|--------------------------------------|------------------------------|-------------------------------:|
|0A                                    |Core Rulebook                 |64                              |
|0B                                    |Starships of the Galaxy       |3 new + 1 reprint               |
|0C                                    |Threats of the Galaxy         |4                               |
|0D                                    |KOTOR Campaign Guide          |21                              |
|0E                                    |Force Unleashed Campaign Guide|21                              |
|0F                                    |Scum and Villainy             |27                              |
|0G                                    |Clone Wars Campaign Guide     |21                              |
|0H                                    |Legacy Era Campaign Guide     |19                              |
|**Unique identities certified so far**|                              |**180**                         |

Across 0A–0H we have inspected 181 full feat publications, including the one confirmed Tech Specialist reprint from Starships.

The unresolved repo-only enumeration queue remains 14 records: 9 currently attributed to Galaxy at War, 2 to Jedi Academy, and 3 to Galaxy of Intrigue.

────────

Phase 0I — Jedi Academy Training Manual — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

The Jedi Academy feat section publishes exactly 5 canonical feat identities:

|Printed page|Feats                                                                     |
|-----------:|--------------------------------------------------------------------------|
|23          |Follow Through; Force Regimen Mastery; Long Haft Strike; Relentless Attack|
|24          |Unswerving Resolve                                                        |

The p.23/p.24 page mapping was visually verified against the uploaded PDF. The later equipment chapter internally calls Long Haft Strike the “Long Haft Form feat”; the actual feat heading is Long Haft Strike, so the heading controls identity.

Repository reconciliation

• Canonical JATM feat identities: 5.
• Present in repo: 5 / 5.
• Missing: 0.
• Exact source + page: 0 / 5.
• Source mismatches among the five canonical identities: 0.
• Page mismatches: 5 / 5.
• Records currently attributed to JATM: 8.
• Extra/misattributed JATM records: 3.

Those three are now adjudicated:

|Repo record         |ID                |Ruling                                                          |
|--------------------|------------------|----------------------------------------------------------------|
|Fast Surge          |`05d8053002347946`|Real feat, but **Rebellion Era p.29**, not JATM                 |
|Intuitive Initiative|`ae5c34d352d6dff7`|**Core Cerean species trait**, not a feat                       |
|Keen Force Mind     |`647d77a8f5ab9af3`|**No canonical SWSE feat definition found** in the source corpus|

────────

Phase 0J — Rebellion Era Campaign Guide — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

Rebellion Era publishes exactly 60 canonical feat identities:

• 12 GENERAL feats on printed pp.28–30.
• 48 SPECIES_FEAT identities on printed pp.31 and 33–36.

The book explicitly defines Species Feats as a new feat subcategory and states that it provides three species feats for every Core species except Humans. They remain part of the same canonical feat corpus; SPECIES_FEAT is publication metadata, not an automatic semantic tag.

Page distribution

|Printed page|Canonical feats|
|-----------:|--------------:|
|28          |2              |
|29          |5              |
|30          |5              |
|31          |10             |
|33          |6              |
|34          |19             |
|35          |5              |
|36          |8              |
|**Total**   |**60**         |

Repository reconciliation

• Present somewhere in repo: 60 / 60.
• Missing: 0.
• Exact source + page: 0 / 60.
• Source mismatches: 50 / 60.
• Page mismatches: 60 / 60.
• Repo records currently attributed to Rebellion Era: 10.
• Repo-only records attributed to Rebellion Era: 0.

The provenance drift has a very clear pattern:

1. All 48 Species Feats currently use generic source Star Wars Saga Edition, page 0.
2. Assured Attack (adc9cac4d22b3090) is incorrectly sourced to Galaxy at War p.23; canonical source is Rebellion Era p.28.
3. Fast Surge (05d8053002347946) is incorrectly sourced to Jedi Academy Training Manual p.30; canonical source is Rebellion Era p.29.
4. The other ten general Rebellion feats have the correct book but stale/incorrect page numbers.

This phase therefore proves that Rebellion has no missing feat identities, but it has one of the worst provenance drifts in the current catalog.

────────

Phase 0K — Galaxy at War — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

Galaxy at War contains 42 full feat publications across three printed groupings:

|Publication category|Full publications|
|--------------------|----------------:|
|GENERAL             |21               |
|MARTIAL_ARTS_FEAT   |8                |
|TEAM_FEAT           |13               |
|**Total**           |**42**           |

However, it contributes only 41 new canonical identities, because Echani Training is a full reprint/expanded presentation of the KOTOR p.33 feat.

Echani Training reprint ruling

KOTOR p.33 and Galaxy at War p.26 use the same prerequisites and the same core feat mechanic. Galaxy at War adds a Special interaction with the Echani Expertise talent.

Ruling: SAME_FEAT_FULL_REPRINT_WITH_ADDITIONAL_SPECIAL_CLAUSE. One canonical feat identity; KOTOR p.33 is the primary publication, Galaxy at War p.26 is reprint provenance.

Staggering Attack identity ruling — now complete on both sides

• Scum and Villainy p.24 publishes one Staggering Attack feat.
• Galaxy at War p.26 publishes another Staggering Attack feat with different prerequisites and a different mechanic.

Ruling: SAME_NAME_DISTINCT_FEATS_CONFIRMED. The feat database must permit both identities despite identical display names.

Repository reconciliation

• Galaxy at War full feat publications: 42.
• New identities contributed: 41.
• Full reprints: 1.
• Source-published identities represented in repo: 42 / 42.
• Missing source-published identities: 0.
• Current repo records attributed to Galaxy at War: 42.
• Canonical GAW publications currently sourced to GAW: 20 / 42.
• Exact source + page: 6 / 42.
• Source mismatches: 22 / 42.
• Page mismatches: 36 / 42.

The repo happens to contain 42 records attributed to Galaxy at War, but 22 of those are not Galaxy at War feat publications:

|Disposition                            |Count|Records                                                                                                                                                                                |
|---------------------------------------|----:|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Canonical feat from another book       |13   |Slippery Maneuver; Triple Crit; Acrobatic Strike; Sniper; Scavenger; Deadeye; Charging Fire; Savage Attack; Assured Attack; Autofire Assault; Burst of Speed; Mighty Swing; Bantha Rush|
|Wrong-domain record                    |1    |Reactive Stealth — actually a *Galaxy of Intrigue* talent                                                                                                                              |
|Old d20 feat with no Saga equivalent   |2    |Headstrong; Low Profile                                                                                                                                                                |
|No canonical SWSE feat definition found|6    |Reactive Awareness; Triple Crit Specialist; Resilient Reflexes; Conditioned; Surgical Precision; Resilient Will                                                                        |

The 13 legitimate cross-book feats must be retained but have their provenance corrected. The wrong-domain/noncanonical records are audit findings only at this stage; no deletion is authorized until Claude receives an explicit production command.

Source-defined subgroup provenance

The Martial Arts and Team feats are real published Galaxy at War feats, not optional wiki-only classifications. Most of those current repo records are flattened to generic Star Wars Saga Edition, page 0; later production convergence must restore Galaxy at War source/page while preserving the source-defined publication categories.

────────

Phase 0 progress through 0K

|Subphase                              |Source                        |Certified unique feat identities|
|--------------------------------------|------------------------------|-------------------------------:|
|0A                                    |Core Rulebook                 |64                              |
|0B                                    |Starships of the Galaxy       |3 new + 1 reprint               |
|0C                                    |Threats of the Galaxy         |4                               |
|0D                                    |KOTOR Campaign Guide          |21                              |
|0E                                    |Force Unleashed Campaign Guide|21                              |
|0F                                    |Scum and Villainy             |27                              |
|0G                                    |Clone Wars Campaign Guide     |21                              |
|0H                                    |Legacy Era Campaign Guide     |19                              |
|0I                                    |Jedi Academy Training Manual  |5                               |
|0J                                    |Rebellion Era Campaign Guide  |60                              |
|0K                                    |Galaxy at War                 |41 new + 1 reprint              |
|**Unique identities certified so far**|                              |**286**                         |

Across 0A–0K we have inspected 288 full feat publications, containing 286 unique canonical identities and 2 confirmed full reprints:

• Tech Specialist — primary Web Enhancement identity, reprinted in Starships of the Galaxy p.21.
• Echani Training — primary KOTOR p.33 identity, reprinted/expanded in Galaxy at War p.26.

The previously known unmatched repo-only queue has fallen from 14 to 3. The only remaining records in that queue are currently attributed to Galaxy of Intrigue:

• Intimidating Presence
• Frightening Presence
• Resilient Talent

Those are scheduled for Phase 0M.

────────

Phase 0L — Scavenger’s Guide to Droids — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

Scavenger’s Guide to Droids publishes exactly 17 canonical feat identities. The TXT enumeration was checked against the rendered PDF pages.

|Printed page|Canonical feat identities|
|-----------:|------------------------:|
|22          |8                        |
|24          |5                        |
|25          |4                        |
|**Total**   |**17**                   |

Printed p.23 is the feat summary table. The source says that some of these feats are available only to droids, but it does not define a separate publication category called “Droid Feats.” Therefore these remain publicationCategory: GENERAL; droid-only access belongs in prerequisites/scope, not publication identity.

Repository reconciliation

• Canonical identities: 17.
• Present in repo: 17 / 17.
• Missing: 0.
• Current records attributed to Scavenger’s Guide: 17.
• Repo-attributed extras: 0.
• Exact source + page: 5 / 17.
• Source mismatches: 0.
• Page mismatches: 12 / 17.

The five exact provenance matches are Logic Upgrade: Skill Swap, Pinpoint Accuracy, Sensor Link, Shield Surge, and Slammer. The other twelve records are legitimate identities with stale page metadata.

────────

Phase 0M — Galaxy of Intrigue — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

Galaxy of Intrigue publishes exactly 26 canonical feat identities:

• 23 GENERAL feats.
• 3 SKILL_CHALLENGE_FEAT identities: Skill Challenge: Catastrophic Avoidance, Skill Challenge: Last Resort, and Skill Challenge: Recovery.

|Printed page|Canonical feat identities|
|-----------:|------------------------:|
|25          |4                        |
|27          |7                        |
|28          |9                        |
|29          |6                        |
|**Total**   |**26**                   |

Printed p.26 is the feat summary table. The source explicitly groups the three Skill Challenge feats, so SKILL_CHALLENGE_FEAT is retained as publication metadata rather than inferred as a semantic tag.

Repository reconciliation

• Canonical identities: 26.
• Present in repo: 26 / 26.
• Missing: 0.
• Exact source + page: 0 / 26.
• Source mismatches: 1.
• Page mismatches: 26 / 26.
• Current records attributed to Galaxy of Intrigue: 29.
• Records attributed to Galaxy of Intrigue that are not Galaxy of Intrigue feat publications: 4.

Forceful Recovery (627b92fefdc552d2) is a real Galaxy of Intrigue feat on p.27 but is currently sourced to The Force Unleashed Campaign Guide p.34.

The four extra/misattributed Galaxy of Intrigue records are:

|Repo record          |ID                |Phase 0 disposition                                                                                                          |
|---------------------|------------------|-----------------------------------------------------------------------------------------------------------------------------|
|Desperate Gambit     |`8baf83743668f63a`|Real feat, but **Scum and Villainy p.21**, not Galaxy of Intrigue                                                            |
|Intimidating Presence|`83abd1c384b58c3c`|**No canonical SWSE feat definition found**; same-name corpus occurrence is a statblock special action, not a feat definition|
|Frightening Presence |`d612e7a708edf75b`|**No canonical SWSE feat definition found**                                                                                  |
|Resilient Talent     |`fda012e3b2b1e55f`|**No canonical SWSE feat definition found**                                                                                  |

This resolves the final three records in the previously open repo-only enumeration queue. Remaining unresolved repo-only enumeration records: 0.

────────

Phase 0N — Unknown Regions — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Source certification

Unknown Regions publishes exactly 21 canonical feat identities, all GENERAL publication identities.

|Printed page|Canonical feat identities|
|-----------:|------------------------:|
|24          |6                        |
|26          |5                        |
|27          |6                        |
|28          |4                        |
|**Total**   |**21**                   |

Printed p.25 is the feat summary table. Nikto Survival has a species prerequisite but is not published under the Rebellion-era SPECIES_FEAT category.

Mounted Combat provenance correction

Mounted Combat is source-certified as an Unknown Regions p.27 feat. The current repo record (af5caa92d8fc0e3a) is incorrectly attributed to the Saga Edition Core Rulebook p.88.

Phase 0N ruling: SOURCE_PAGE_MISMATCH; preserve the existing canonical identity and later correct its provenance to Unknown Regions p.27.

Repository reconciliation

• Canonical identities: 21.
• Present in repo: 21 / 21.
• Missing: 0.
• Current records attributed to Unknown Regions: 20.
• Repo-attributed extras: 0.
• Exact source + page: 1 / 21.
• Source mismatches: 1 — Mounted Combat.
• Page mismatches: 20 / 21.

The sole exact source/page match is Wilderness First Aid p.28.

────────

Phase 0 progress through 0N

|Subphase                                         |Source                        |Certified unique feat identities|
|-------------------------------------------------|------------------------------|-------------------------------:|
|0A                                               |Core Rulebook                 |64                              |
|0B                                               |Starships of the Galaxy       |3 new + 1 reprint               |
|0C                                               |Threats of the Galaxy         |4                               |
|0D                                               |KOTOR Campaign Guide          |21                              |
|0E                                               |Force Unleashed Campaign Guide|21                              |
|0F                                               |Scum and Villainy             |27                              |
|0G                                               |Clone Wars Campaign Guide     |21                              |
|0H                                               |Legacy Era Campaign Guide     |19                              |
|0I                                               |Jedi Academy Training Manual  |5                               |
|0J                                               |Rebellion Era Campaign Guide  |60                              |
|0K                                               |Galaxy at War                 |41 new + 1 reprint              |
|0L                                               |Scavenger’s Guide to Droids   |17                              |
|0M                                               |Galaxy of Intrigue            |26                              |
|0N                                               |Unknown Regions               |21                              |
|**Unique identities certified through all books**|                              |**350**                         |

Across 0A-0N we have inspected 352 full feat publications, containing 350 unique canonical identities and 2 confirmed full reprints:

1. Tech Specialist — earlier Web Enhancement identity, fully reprinted in Starships of the Galaxy p.21.
2. Echani Training — primary KOTOR p.33 identity, reprinted/expanded in Galaxy at War p.26.

The known repo-only enumeration queue is now fully adjudicated: 0 unresolved records.

Phase 0 is not closed yet. Remaining work:

1. 0O — Web Enhancements, including the primary Tech Specialist publication plus Dreadful Countenance and Rapid Assault.
2. 0-QA — global identity/reprint reconciliation, followed by a frozen canonical feat count.

Phase 0O — Web Enhancements / Official Web Rules — CERTIFIED

Status: SOURCE_CERTIFIED_REPO_RECONCILED
Production mutation: NOT authorized

Phase 0O certifies 3 canonical feat identities from official web-origin rules:

|Feat                |Primary authority                                    |Locator                       |Current repo        |Ruling                                                                                                                    |
|--------------------|-----------------------------------------------------|------------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------|
|Tech Specialist     |*Saga Edition Web Enhancement 1: The Tech Specialist*|p.3 of 7                      |Core p.88           |**Wrong source/page.** Web Enhancement is primary; *Starships of the Galaxy* p.21 is a full reprint.                      |
|Dreadful Countenance|*Behind the Threat: The Sith, Part 2 — The Becoming* |web article; archived p.4 of 4|Web Enhancements p.1|Identity is present; source family is broadly correct but article-level provenance/locator should be normalized.          |
|Rapid Assault       |*Saga Edition FAQ* official optional rules           |**E2**                        |Web Enhancements p.1|Identity is present. Preserve `OFFICIAL_OPTIONAL_RULE` metadata rather than flattening it into ordinary sourcebook status.|

0O contribution: 3 unique canonical identities, 3 full web-rule publications, 0 missing repo names.

Tech Specialist is not a Core feat. The original Web Enhancement explicitly introduces it as a new feat and states that the rules would later be featured in an upcoming sourcebook; Starships of the Galaxy p.21 is that later full reprint.

────────

Phase 0-QA — GLOBAL IDENTITY RECONCILIATION — COMPLETE

Frozen canonical census

Phase 0 is now closed with the following source-certified identity authority:

|Metric                                                     |Frozen result|
|-----------------------------------------------------------|------------:|
|**Unique canonical feat identities**                       |**353**      |
|Unique normalized display names                            |**352**      |
|Full feat publications across all sources                  |**355**      |
|Confirmed full reprints                                    |**2**        |
|Current repo feat records                                  |**390**      |
|Canonical identities represented by current repo           |**351**      |
|Canonical identities missing from repo                     |**2**        |
|Repo records outside canonical identity corpus             |**39**       |
|Implementation-derived scope records among those 39        |**6**        |
|Noncanonical / wrong-domain / legacy records among those 39|**33**       |
|Unresolved repo-only enumeration records                   |**0**        |
|Unresolved cross-book reprint candidates                   |**0**        |

353 is the frozen canonical feat identity count. It is not yet the final Foundry document count, because Phase 1C still must decide whether the six current Weapon Proficiency-derived scope records remain generated implementation records or collapse into a structured scoped-acquisition model.

Primary-source identity breakdown

|Primary source                            |Canonical identities|
|------------------------------------------|-------------------:|
|Saga Edition Core Rulebook                |64                  |
|Starships of the Galaxy                   |3                   |
|Threats of the Galaxy                     |4                   |
|Knights of the Old Republic Campaign Guide|21                  |
|The Force Unleashed Campaign Guide        |21                  |
|Scum and Villainy                         |27                  |
|Clone Wars Campaign Guide                 |21                  |
|Legacy Era Campaign Guide                 |19                  |
|Jedi Academy Training Manual              |5                   |
|Rebellion Era Campaign Guide              |60                  |
|Galaxy at War                             |41                  |
|Scavenger’s Guide to Droids               |17                  |
|Galaxy of Intrigue                        |26                  |
|Unknown Regions                           |21                  |
|Official Web Rules / Web Enhancements     |3                   |
|**Total**                                 |**353**             |

Publication-category breakdown

|Publication category|Canonical identities|
|--------------------|-------------------:|
|GENERAL             |280                 |
|RIDING_FEAT         |2                   |
|SPECIES_FEAT        |48                  |
|MARTIAL_ARTS_FEAT   |7                   |
|TEAM_FEAT           |13                  |
|SKILL_CHALLENGE_FEAT|3                   |
|**Total**           |**353**             |

The Martial Arts publication count is 8, but only 7 primary identities are assigned to Galaxy at War because Echani Training is a KOTOR-primary reprint.

Confirmed full reprints

1. Tech Specialist — primary: Saga Edition Web Enhancement 1, p.3 of 7; full reprint: Starships of the Galaxy p.21.
2. Echani Training — primary: Knights of the Old Republic Campaign Guide p.33; full reprint/expanded presentation: Galaxy at War p.26.

No other parser-generated duplicate candidate survived source-context review as a second full reprint.

Same-name identity rules

Staggering Attack

There are two distinct canonical feats named Staggering Attack:

• Scum and Villainy p.24
• Galaxy at War p.26

Their prerequisites and mechanics differ. The canonical model therefore permits duplicate normalized display names when canonical identity/source proves they are distinct.

Cross-domain collisions

• Recall — TFU p.35 feat and a separate Rebellion Era talent.
• Autofire Assault — Legacy p.34 feat and a separate Galaxy at War talent.

Therefore normalized name alone may not determine feat/talent domain identity.

Two canonical identities missing from the 390-record repo

1. Recall — The Force Unleashed Campaign Guide p.35. It was falsely removed by the name-only TALENT_ONLY_FEAT_CONTAMINANTS guard and is incorrectly marked talent_domain_not_feat in the current validity registry.
2. Staggering Attack — Scum and Villainy p.24. The repo currently contains only the distinct Galaxy at War same-name feat.

Both will require new stable feat IDs when production identity repair is eventually authorized.

Exact 390-record reconciliation

The current repo decomposes exactly as:

351 canonical identity records represented
+ 6 implementation-derived Weapon Proficiency scope/alias records
+ 33 noncanonical / wrong-domain / legacy records
= 390 current feat records

The six implementation derivatives are:

• Weapon Proficiency (Simple Weapons)
• Weapon Proficiency (Rifles)
• Weapon Proficiency (Heavy Weapons)
• Weapon Proficiency (Pistols)
• Advanced Melee Weapon Proficiency
• Heavy Weapon Proficiency

They are not additional canonical feat identities. Phase 1C decides their final structural representation.

The 33 noncanonical/wrong-domain/legacy records are fully enumerated in the JSON authority under phase0.subphases["0-QA"].repoOutsideCanonicalCorpus with IDs, classifications, and rationales.

Cross-book false-positive resolution

The remaining broad-parser duplicate candidates are closed as follows:

• Coordinated Attack — Core only; later occurrences are references/statblocks/prerequisites.
• Combat Reflexes — Core only; later occurrences are references/prerequisites.
• Point Blank Shot — Core only; later occurrences are references/statblocks/prerequisites.
• Force Training — Core only; later occurrences are references/prerequisites.
• Charging Fire — Core only; KOTOR occurrence is reference/prerequisite only.
• Force Readiness — KOTOR only on the feat-publication side.
• Forceful Recovery — Galaxy of Intrigue p.27; current TFU provenance is wrong.
• Force Regimen Mastery — Jedi Academy only; later occurrences are references.
• Recall — TFU feat only on the feat side; the Rebellion collision is a talent.
• Tech Specialist — Web Enhancement primary + Starships full reprint.
• Echani Training — KOTOR primary + Galaxy at War full reprint.
• Staggering Attack — two distinct same-name feat identities, not a reprint.

Domain guard correction

The current TALENT_ONLY_FEAT_CONTAMINANTS set contains 13 normalized names. Recall is a confirmed false positive. More importantly, the underlying design is unsafe: a name collision does not prove a record belongs to the talent domain.

Later authority convergence must replace name-only domain exclusion with identity/domain-safe logic. The current validity-registry entry for Recall must also be corrected.

Phase 0 acceptance gate

PASS.

• Sourcebook census complete: 0A–0N.
• Web rules census complete: 0O.
• Canonical identity count frozen: 353.
• Full-publication count reconciled: 355.
• Reprints certified: 2.
• Same-name distinct feat identities certified.
• Cross-domain name collisions certified.
• Current 390-record repo fully classified.
• Missing canonical identities identified: 2.
• Repo-outside-canonical records identified: 39.
• Unresolved enumeration queue: 0.
• Production mutation: NOT authorized.

────────

Next phase after the Phase 0 Claude checkpoint

Phase 0 has already performed the publication census and repo identity reconciliation originally envisioned for old Phase 1A/1B. To avoid repeating work, the next planning phase is now:

• 1A — Canonical identity manifest and stable-ID design
• 1B — Deterministic repository reconciliation execution design
• 1C — Scope/tier/family structural audit

Claude should first persist the finalized Phase 0 authority into repository audit artifacts on audit/feat-phase-0-enumeration, run strict verification, commit, push, and report the resulting SHA. Claude should not mutate production feat records during that checkpoint.
