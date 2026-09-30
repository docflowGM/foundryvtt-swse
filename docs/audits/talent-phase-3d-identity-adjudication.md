# Phase 3D-2 — Identity Adjudication

Manifest: `data/audits/talent-phase-3d-dispositions.json` · Checker: `tools/check-talent-phase-3d-dispositions.mjs` ·
Tests: `tests/talent-phase-3d-review-extras.test.mjs` · Census: `talent-phase-3d-production-extras-census.md`.
**No production data has been modified.** Nothing here touches any of the 1,180 Phase 3C canonical records
(`PHASE_3C_CANONICAL_RECORD_TOUCHED`: none).

## Progress

| Bucket | Records | Status |
|---|---|---|
| Review extras (Notorious, Teräs Käsi Basics) | 2 | **Adjudicated** (this checkpoint) |
| SOURCE_VERIFIED_SPECIAL_TREE | 10 | **Adjudicated** (3 KEEP, 3 REMOVE_CONTAMINATION, 4 blocked on homebrew policy) |
| Missing trees (Embrace Dark Side, Force Meld) | 2 | **Adjudicated** (1 MERGE_DUPLICATE, 1 blocked on homebrew policy) |
| Same-name / sourcebook-hit candidates | — | **Adjudicated** (see §5) |
| Actor-referenced | — | **Adjudicated** (only Trigger Work, Hard Target, Stolen Form carry actor references among the remaining 78; all keep their references) |
| No credible publication evidence | — | **Adjudicated** (owner-policy blocked, see §5) |

All 92 have a disposition; the 51 `REVIEW_REQUIRED` records each carry a named `reviewRequiredReason`.

## 1. `a7d8c4da96eacad4` — Notorious (Infamy) → `REMOVE_CONTAMINATION`

**Answers to the Phase 3D questions**

1. *Is Infamy an older/wrong name for canonical Notorious?* No.
2. *Is it a distinct talent?* No.
3. *Is one production record simply a duplicate?* Not of Notorious — see below.
4. *Does it carry runtime metadata that must be migrated?* No.

**What it actually is.** Its benefit is the concatenation of three *other* published talents, with import-scraper residue
(`Reference Book: … Scum and Villainy`, `Prerequisites: ,`):

| Text segment | Real talent | Source | Canonical production ID |
|---|---|---|---|
| "When your Minions invoke your name, others take note…" | Shared Notoriety | Core TXT line 19846 (p. 210) | `9491f34aad83dfb1` |
| "When you make a successful Persuasion check, you can immediately make a second…" | Master Manipulator | Unknown Regions TXT lines 2914–2921 | `32fb42ce3ee46e6d` |
| "You can call in a small favor from someone who owes you…" | Small Favor | Unknown Regions TXT line 2923 | `81e423a476c377fa` |

It has no source/page, empty prerequisites, and `class`/`category` = Bounty Hunter while sitting in the Crime Lord Infamy tree.
The real Notorious entries are clean in the TXT and already canonical:

| Canonical identity | Text | Production ID |
|---|---|---|
| Core \| Infamy \| Notorious (p. 210, "Your reputation as a crime lord…", TXT 19944) | reroll Persuasion to intimidate, keep the better | `09744041cdcc9e22` |
| Core \| Bounty Hunter \| Notorious (p. 209, "Your skill as a bounty hunter…", TXT 19654) | same mechanic | `c67cbd59abd1cc53` (created in Phase 3C) |

**Why not `MERGE_DUPLICATE`.** The record carries no Notorious text; merging would launder three other talents' text into Notorious, and
there is no single survivor because two canonical Notorious identities exist. PDF not required: the TXT segmentation is unambiguous.

**Metadata.** Nothing valid is lost. `abilityMeta` is generic T26 scaffolding and its only card carries the corrupted text; `09744041`
already has the correct `notorious-infamy` card. *Optional follow-up (not part of this disposition):* give `c67cbd59` the same reference
card — that would touch a Phase 3C-created record and must then be flagged `PHASE_3C_CANONICAL_RECORD_TOUCHED`.

**References that must be resolved before deletion (all enumerated in the manifest)**

- `packs/talent_trees.db` — Infamy `c1be604242cb328f` (`talentIds` and one of the two `Notorious` name entries).
- `data/{generated,fixes}/talent-trees.registry.json` — regenerate with `tools/build-talent-tree-registry.mjs`, never by hand.
- `data/{generated,fixes}/talents.fixed.json` — remove the entry (producer to be confirmed in 3D-3).
- **32 embedded actor items** (`flags.core.sourceId = Compendium.foundryvtt-swse.talents.a7d8c4da96eacad4`): heroic 13, nonheroic 3, npc 16 (16 distinct actors,
  mirrored in `npc`). Deterministic repoint by the actor's class string: **20 → `09744041cdcc9e22`** (Crime Lord/Lord: Rodian Black Sun Vigo, Rav, Booster Terrik, Liash Keane,
  Dool Pundar, Hondo Ohnaka, Prince Xizor, Hutt Crime Lord, Black Sun Vigo, Tyber Zann) and **12 → `c67cbd59abd1cc53`** (Hunter: Calo Nord, Jango Fett, Dob and Del Moomo,
  Solvek, Sisla, Boba Fett). Both targets are mechanically identical, so the repoint is rules-neutral. These actor items are also stale snapshots of the corrupted text;
  3D-4 must refresh their benefit/description as well, not only `sourceId`.
- Tests: `tests/talent-phase-3c-migration-flow.test.mjs`, `tests/talent-tree-membership-review-extras.test.mjs`; the membership audit's review-extra exemption becomes obsolete.
- Historical audit/doc references (`data/audits/*`, `docs/audits/*`, `docs/talent-martial-underworld-prestige-cleanup-phase-t12.json`) need no action.

**Expected final:** record removed; Infamy keeps `09744041` as its sole Notorious (12 members); class access unchanged.

## 2. `222327492c484b4a` — Teräs Käsi Basics (Master of Teräs Käsi) → `MERGE_DUPLICATE` into `67bddb17ae2770f3`

**Proof.** Same name (accented), same tree `ba726f623e42f849`, same prerequisite (Martial Arts I), same benefit (identical except capital "Unarmed"), identical
`abilityMeta.rules`. The certified canonical identity is *Threats of the Galaxy | Master of Teräs Käsi | Teräs Käsi Basics* (p. 53). Phase 3B kept `67bddb17` because it carries
`flags.swse.id = swse.talent.teras_kasi_basics`, source, page and summary; the duplicate has none of them. The tree's canonical roster has exactly one Basics.

**Field diff (duplicate vs survivor):** capitalisation of "Unarmed"; empty `class`/`category`; extra auto-derived tags (`action_economy`, `controller`, `damage_reduction`, `defender`,
`sustained_damage`); missing `source`/`page`/`summary`/`swse.id`; different migration timestamp. **Metadata to migrate: none** — the extra tags are not rules data
(and `damage_reduction` is misleading for this talent), so they are deliberately not transferred.

**Progression relationship** is unaffected: Basics is a prerequisite (by name) of Ignore Damage Reduction, Teräs Käsi Mastery, Unarmed Counterstrike and Unarmed Parry.

**Evidence limit.** Threats of the Galaxy TXT does not contain the tree text (Galaxy at War TXT corroborates the tree name). The canonical p. 53 entry rests on the already-certified
Phase 3B authority; this disposition does not re-open it and creates no new publication claim.

**References to resolve:** `packs/talent_trees.db` (`talentIds`; the tree keeps 5 members); registries (regenerate); **2 embedded actor items** on *Mynock Man* (heroic + npc) →
`67bddb17ae2770f3` (plus refresh of their stale snapshot text); `tools/fix-compendium-issues.js:44` (legacy one-shot map keyed by the duplicate ID with a non-existent tree ID
`f96cb0f2a46b4dd1` — retire the entry); `tests/talent-tree-membership-review-extras.test.mjs`; exemption in the membership audit. Historical audit/doc references need no action.

## 3. Bucket: the 10 `SOURCE_VERIFIED_SPECIAL_TREE` records

**The registry label is not evidence.** Of ten records carrying it, three are real published talents, three are malformed records whose text belongs to other talents,
and four are self-labelled homebrew. Every disposition below rests on the committed TXT, not on the registry status.

| ID | Record | Tree | Disposition | Basis |
|---|---|---|---|---|
| `192279eaa0b61d36` | Dark Preservation | Dark Side | **KEEP_CANONICAL_ADDITIONAL_PUBLICATION** | Real LECG talent (TXT 4862, prereq Power of the Dark Side). Production omits the Force Point cost. Used in a printed stat block (TXT 20498). Referenced by 1 heroic + 1 npc actor item — stays valid. |
| `208e1e15e989323f` | Telekinetic Stability | Control | **KEEP_CANONICAL_ADDITIONAL_PUBLICATION** | Real LECG talent (TXT 4852). Production omits the Force Point cost. |
| `62d461ae3b0fcfa9` | Move Massive Object | Alter | **KEEP_CANONICAL_ADDITIONAL_PUBLICATION** | Real LECG talent (TXT 4815-4828, prereqs Telekinetic Power + move object). Production omits the Force Point cost and the printed damage rule. |
| `57c770c7924e4241` | "Cloak of Shadows" | Disciple of Twilight | **REMOVE_CONTAMINATION** | Text = Shadow Armor (TXT 5123) + Shadow Vision (5133), both already canonical (`4916dbbae0f18ee1`, `66b3278292626e27`). Real Cloak of Shadow (TXT 5077) is canonical as `b3fe6f7659b40a55`. |
| `714c38c0498a4eaf` | "Empowered Weapon" | Ember of Vahl | **REMOVE_CONTAMINATION** | Text = Vahl's Brand (TXT 5205) + Vahl's Flame (5211), canonical as `a5f8ec365ef2b699` / `8ba6abad84c6d9ef`. No talent of this name exists in the tree. |
| `f123e0682ef74583` | "Reference Book: Star Wars Saga Edition Starships of the Galaxy" | Sense | **REMOVE_CONTAMINATION** | Name and benefit are the scraper string; not a talent. |
| `4d7d5a38d0394e4c` | Force Bond | Alter | REVIEW_REQUIRED — `HOMEBREW_POLICY_OWNER_DECISION` | Benefit ends "Homebrew Reference Book: Legacy of the Force Sourcebook"; not in any TXT. |
| `f785208aa6774cd7` | Dark Side Maelstrom | Dark Side | REVIEW_REQUIRED — `HOMEBREW_POLICY_OWNER_DECISION` | Ends "Homebrew Reference Book: Dathomir Field Guide". |
| `9319584186ce4228` | Dathomiri Hunter | Dathomiri Witch | REVIEW_REQUIRED — `HOMEBREW_POLICY_OWNER_DECISION` | Self-labelled homebrew (Energy Bow / Sense Surroundings). |
| `e09d40421ade49e8` | Binding Sickle | Dathomiri Witch | REVIEW_REQUIRED — `HOMEBREW_POLICY_OWNER_DECISION` | Ends "Homebrew Reference Book: Dathomir Field Guide". |

**The three KEEP records are a Phase 3B ownership-model gap, not a Phase 3C canonical edit.** They are LECG "new talents expand the X tree" entries that no canonical identity
covers. Nothing here touches one of the 1,180. Making them canonical means a *new* identity through the Phase 2 → canonical → manifest chain (`requiredFollowUp.kind = CANONICAL_CORPUS_ADDITION`
in the manifest, with the printed text); the printed page numbers need a PDF look. Until then they are preserved untouched. The three REMOVE records have **no actor-pack references**; their structural handling
(tree `talentIds`/`talentNames`, registries) and the `combat-action-ability-cards-phase-t13.json` mentions are enumerated per record in the manifest.

**The four homebrew records are a policy question, not an evidence question.** `KEEP_NONBOOK_SUPPORTED` requires official material (none found) and `REMOVE_CONTAMINATION`
would delete content the project owner may have added on purpose. They stay `REVIEW_REQUIRED` with a named reason and are *not* counted as unresolved evidence gaps. The 38 `REPO_ONLY_NONCANONICAL_HOMEBREW`
records will raise the same question, so one owner ruling (keep out of the authoritative pack / move to a separate homebrew pack / delete) resolves the whole class.

## 4. Bucket: the 2 "missing tree" records

**Finding: the "missing tree" flag is a false alarm.** Both records *are* members of real trees (Dark Side Devotee `96ef43a3054dcb58`, Jedi Guardian `10c843cef8ce2798`) through the tree's `talentIds`.
Only their legacy `system.treeId` slug (`dark-side-devotee`, `jedi-guardian`) is not a pack ID. The same stale slug appears on **~80 talent records, including canonical ones**
(e.g. every Jedi Guardian and lightsaber-forms member). Membership is carried by `talent_trees.talentIds`, so nothing is broken, but `system.treeId` is not a reliable key on those records.
*Observation for a later cleanup (out of Phase 3D scope, not touched here).*

| ID | Record | Disposition | Basis |
|---|---|---|---|
| `3cc9552cfab59676` | Embrace Dark Side | **MERGE_DUPLICATE** → `8e1ee6d1c756450f96d4d5eaa9657e47` | Core TXT 20232: same benefit and prerequisites as canonical *Embrace the Dark Side* (Core p.213); name shortened. Same tree. Duplicate has an incomplete `prerequisitesStructured` (omits Channel Aggression) — not migrated; nothing valid is lost. Retire its entries in `tools/fix-compendium-issues.js:29` and `tools/verify-compendium-fixes.js:22`. No actor references. |
| `816ac9cc1e6c413b` | Force Meld | REVIEW_REQUIRED — `HOMEBREW_POLICY_OWNER_DECISION` | Ends "Homebrew Reference Book: Legacy of the Force Sourcebook"; in no TXT. `tests/talent-membership-and-pack-completion.test.mjs` pins its existence (lines 131, 149). |

## 5. Remaining buckets and the full disposition table

Every one of the 92 now has a disposition and a concrete reason; **none is left unexamined**.

| Final disposition | Count |
|---|---|
| REMOVE_CONTAMINATION | 16 |
| MERGE_DUPLICATE | 19 |
| REVIEW_REQUIRED / UNSOURCED_OWNER_POLICY | 42 |
| KEEP_CANONICAL_ADDITIONAL_PUBLICATION | 5 |
| REVIEW_REQUIRED / HOMEBREW_POLICY_OWNER_DECISION | 8 |
| CORRECT_IDENTITY | 1 |
| REVIEW_REQUIRED / PDF_LOOKUP_REQUIRED_DEFINITION_NOT_IN_TXT | 1 |
| **Total** | **92** |

**Derived (not a target) production count if applied as adjudicated today:** 35 deletions (19 MERGE_DUPLICATE + 16 REMOVE_CONTAMINATION) → 1,272 − 35 = **1,237** talent records, provided the 51 blocked records are all kept; every one of those 51 removed would give 1,186. The final number depends on the two owner decisions below.

### Owner decisions needed (no evidence gap remains for these)

1. **8 self-labelled homebrew** (`HOMEBREW_POLICY_OWNER_DECISION`) and **42 unsourced** records (`UNSOURCED_OWNER_POLICY`): none of the 14 committed sourcebooks prints their text or names them as talents, and no canonical identity matches them. Where I checked the web (B'omarr Monk, Smashball Pro trees), the trees exist on the community wiki swse.fandom.com; that wiki also hosts fan-made talents (one production record embeds "created by Wikia user LilLiteralist"), so wiki presence does not make them official. Options: keep them out of the authoritative pack (move to a separate homebrew pack), keep them as-is, or delete them. One ruling resolves the class. Some are system-authored placeholders (e.g. Calming Aura: "Resolve the exact Beastwarden attitude/aura effect at the table until the beast-attitude subsystem owns this context"; Animal Companion), which suggests the project itself generated part of this content.
2. **1 record needing the PDF** (`PDF_LOOKUP_REQUIRED_DEFINITION_NOT_IN_TXT`): *Stolen Form* (`f9352f317ad2f695`) — the name is official (printed stat block, Threats of the Galaxy TXT 8018) but its definition is not in any TXT; two actor items (Galen Marek) reference it.

### MERGE_DUPLICATE (19) — name/paraphrase variants of a canonical talent

| Duplicate | Name | Tree | Survivor |
|---|---|---|---|
| `222327492c484b4a` | Teräs Käsi Basics | Master of Teräs Käsi | → `67bddb17ae2770f3` Teräs Käsi Basics |
| `0e6854d8aacc48dc` | Stay in the Fight (Recruit) | Rebel Recruiter | → `6cf364c5b9556770` Stay in the Fight |
| `12e6b524fc6959b6` | Unbalance Strike | Brawler | → `e293cb03d35c2bff` Unbalance Opponent |
| `23852d30490fc1e4` | Combined Fire (Naval) | Naval Officer | → `17518b7669101122` Combined Fire |
| `271024ca2ac6c04b` | Multiattack Proficiency (exotic) | Gladiatorial Combat | → `66c8f9d94547b5e6` Multiattack Proficiency (exotic weapons) |
| `3cc9552cfab59676` | Embrace Dark Side | Dark Side Devotee | → `8e1ee6d1c756450f96d4d5eaa9657e47` Embrace the Dark Side |
| `433c2e9c0e71aceb` | Flanking Foe | Pistoleer | → `1f6b9d509a07f881` Flanking Fire |
| `4d6c2d2398c33ba7` | Sith Alchemy (craft) | Sith Alchemy | → `eb4f3e8660bc476589d0323d4cc00845` Sith Alchemy |
| `4dfad6e363c11acf` | Improvised Weapon Masteryy | Jedi Weapon Master | → `17cdb585c58c2f19` Improvised Weapon Master |
| `5644990a390a4178` | Hotwire | Specialized Droid | → `d2b9069670413a43` Hot Wire |
| `6021056231839e7c` | Multiattack Proficiency (advanced melee) | Privateer | → `d7ba5fb8b677a2f4` Multiattack Proficiency (advanced melee weapons) |
| `6f3641f0ff39fc90` | Escort | Wingman | → `7aa3eec9b7f748ef` Escort Pilot |
| `8a6fc1f368226b7b` | Sith Alchemy (create) | Sith | → `eeecb3737aabf789` Sith Alchemy |
| `a76198e5da0f6368` | Echoes of the Force | Jedi Investigator | → `e26abfa7fe650912` Echoes in the Force |
| `ab6efafd94ad044e` | Extended Critical Range (heavy) | Critical Master | → `04985a42930dff2a` Extended Critical Range (heavy weapons) |
| `b28f312432d79e77` | Keep Them Reeling (Piracy) | Piracy | → `9fe189e1376feec5` Keep Them Reeling |
| `cc938ba0542c97e4` | Unclouded Judgement | Jedi Investigator | → `4a0ed533e99848a8` Unclouded Judgment |
| `f0851e0e5a1ac771` | Multiattack Proficiency (advanced melee) | Melee Duelist | → `35375c6c9505e6f5` Multiattack Proficiency (advanced melee weapons) |
| `f5a4088480c005ae` | Dastardly Attack | Misfortune | → `9e4345faaaa94dd8` Dastardly Strike |

### REMOVE_CONTAMINATION (16) — fragments, conflations, stubs, non-talent rows

| ID | Name | Tree | Why |
|---|---|---|---|
| `a7d8c4da96eacad4` | Notorious | Infamy | a7d8c4da96eacad4 is a malformed legacy import: its benefit/description is the concatenation of THREE different published talents' text, none of which is Notorious. It is not an older name for Notorious and not a distinct talent. |
| `0c9b0788ad42450c` | Extended Critical Range | Bothan Spynet | "Extended Critical Range" in Bothan SpyNet is the tail of canonical Knowledge Is Power, not a talent. |
| `35350a8b3d2a4810` | Empowered | Force Item | "Empowered" in Force Item is the tail of canonical Primitive Block, not a talent. |
| `3faa4d16e28d43e4` | Weapon Proficiency (Simple Weapons) | Warrior | "Weapon Proficiency (Simple Weapons)" in Warrior is a stub whose benefit is its own name. |
| `57c770c7924e4241` | Cloak of Shadows | Disciple Of Twilight | "Cloak of Shadows" is a malformed record: the name is a plural misspelling of Cloak of Shadow, and the text is Shadow Armor + Shadow Vision concatenated. The real Cloak of Shadow is already canonical. |
| `585227ba15d24a37` | Inspire Fear | Infamy | "Inspire Fear" (bare name) in Infamy carries Terrify's rules text plus scraper residue. |
| `707dd4f0b5c744a6` | Special: | Jumptrooper | "Special:" in Jumptrooper is tree-level intro text scraped as a talent. |
| `714c38c0498a4eaf` | Empowered Weapon | Ember Of Vahl | "Empowered Weapon" in the Ember of Vahl tree is malformed: its text is Vahl's Brand + Vahl's Flame concatenated (with the "empowered weapon" phrase stripped out of the first sentence), under a name taken from a prerequisite reference. No talent named Empowered Weapon exists in this tree. |
| `85e348f24a144e1c` | Inspired | Inspiration | "Inspired" in Inspiration is the text of Inspire Confidence with a mangled name ("Once Inspired, your allies…"). |
| `893158dcfe246ad7` | Implant (general) | Implant | "Implant (general)" is the Implant tree's general rule paragraph, not a talent. |
| `8d70989dc42f4829` | Suktub Defender | Smashball Pro | "Suktub Defender" in Smashball Pro is an empty stub. |
| `96a833f805df1be1` | Regimen Mastery | Mystic | "Regimen Mastery" in Mystic is a copy of canonical Regimen Aptitude whose name was taken from its prerequisite (Force Regimen Mastery). |
| `c086c6265e224637` | Shedding of the Body | Bomarr Monk | "Shedding of the Body" in Bomarr Monk is an empty stub ("Prerequisite:" only). |
| `c6a65be235c34a6f` | Bolster | Inspiration | "Bolster" in Inspiration is the tail of canonical Bolster Ally. |
| `cb261592f68849a5` | Infused Weapon | Felucian Shaman | "Infused Weapon" conflates the tail of FUCG Infuse Weapon with a fan-made talent. |
| `f123e0682ef74583` | Reference Book: Star Wars Saga Edition Starships of the Galaxy | Sense | The record's NAME and benefit are the literal scraper string "Reference Book: Star Wars Saga Edition Starships of the Galaxy". It is not a talent. |

### KEEP / CORRECT_IDENTITY (6) — real talents the ownership model never captured

| ID | Name | Tree | Disposition |
|---|---|---|---|
| `192279eaa0b61d36` | Dark Preservation | Dark Side | KEEP_CANONICAL_ADDITIONAL_PUBLICATION |
| `208e1e15e989323f` | Telekinetic Stability | Control | KEEP_CANONICAL_ADDITIONAL_PUBLICATION |
| `62d461ae3b0fcfa9` | Move Massive Object | Alter | KEEP_CANONICAL_ADDITIONAL_PUBLICATION |
| `7f4edcb8aa830972` | Hard Target | Commando | KEEP_CANONICAL_ADDITIONAL_PUBLICATION |
| `86c10d63bba2d9c8` | Trigger Work | Gunslinger | KEEP_CANONICAL_ADDITIONAL_PUBLICATION |
| `d7870d0940a3ce0b` | Ranged Disarm | Warrior | CORRECT_IDENTITY (Warrior → Gunslinger) |

These are additions to the canonical corpus (`requiredFollowUp.kind = CANONICAL_CORPUS_ADDITION`), not edits of the 1,180. **Trigger Work** and **Ranged Disarm** (Core p.217) are notable: canonical *Damaging Disarm* already lists "Ranged Disarm" as its prerequisite while no canonical identity for it exists. That suggests Phase 3B modelled only the p.216 half of the Core Gunslinger tree; a PDF pass over Core pp.216–217 could find more (out of Phase 3D's inherited 92).

### Blocked records (51)

| ID | Name | Tree | Reason |
|---|---|---|---|
| `0cdd50aaa65e4360` | Voices | Midichlorian | UNSOURCED_OWNER_POLICY |
| `0de7338c2b984b96` | Droid Receptacle | Bomarr Monk | UNSOURCED_OWNER_POLICY |
| `125b5aa00f5a4d0a` | Morgukai Resolve | Morgukai Warrior | UNSOURCED_OWNER_POLICY |
| `14cc3ddc051f4ece` | Animal Companion | Beastwarden | UNSOURCED_OWNER_POLICY |
| `1bda3fdaa84240d3` | Mobility | Jumptrooper | UNSOURCED_OWNER_POLICY |
| `213d97c2cbbd4f81` | Not in the Face | Cowardice | UNSOURCED_OWNER_POLICY |
| `247b9ba1f8d34683` | Retrovirus | Cloner | UNSOURCED_OWNER_POLICY |
| `2c27842384e55cb2` | Mercenary's Grit | Mercenary | UNSOURCED_OWNER_POLICY |
| `2f6bdc483d8f4aa8` | Serene Courage | Bomarr Monk | UNSOURCED_OWNER_POLICY |
| `395daa7cd6f14b8f` | Rough Landings | Jumptrooper | UNSOURCED_OWNER_POLICY |
| `3df46d093b31411d` | Indomitable class feature | Force Adept | UNSOURCED_OWNER_POLICY |
| `4632b4bf79044752` | Nature Sense | Beastwarden | HOMEBREW_POLICY_OWNER_DECISION |
| `4d7d5a38d0394e4c` | Force Bond | Alter | HOMEBREW_POLICY_OWNER_DECISION |
| `588c176b47724734` | Feign Harmlessness | Cowardice | UNSOURCED_OWNER_POLICY |
| `5e4a7f98b1e74326` | Adept Spellcaster | Sorcerer Of Tund | UNSOURCED_OWNER_POLICY |
| `61c9413bde23411a` | Extended Sputters | Jumptrooper | UNSOURCED_OWNER_POLICY |
| `62e70280d08f43ec` | Allure | Influence | HOMEBREW_POLICY_OWNER_DECISION |
| `67a08d46f24c4fdd` | Crash Landings | Jumptrooper | UNSOURCED_OWNER_POLICY |
| `747458ee63cd4a2a` | Defensive Roll | Force Warrior | UNSOURCED_OWNER_POLICY |
| `77ab82670aa14f33` | Smashball Pass | Smashball Pro | UNSOURCED_OWNER_POLICY |
| `78955cbbe9504d7f` | Patient Builder | Mechanic | UNSOURCED_OWNER_POLICY |
| `7a58134276d64561` | Calming Aura | Beastwarden | UNSOURCED_OWNER_POLICY |
| `816ac9cc1e6c413b` | Force Meld | Jedi Guardian | HOMEBREW_POLICY_OWNER_DECISION |
| `81cd2a2473e248a0` | In Balance | Jedaii Ranger | UNSOURCED_OWNER_POLICY |
| `85e9699cee664641` | Identify Creature | Science | UNSOURCED_OWNER_POLICY |
| `9319584186ce4228` | Dathomiri Hunter | Dathomiri Witch | HOMEBREW_POLICY_OWNER_DECISION |
| `933240d6581843b9` | Lasting Ichor Item | Force Item | UNSOURCED_OWNER_POLICY |
| `9780298d28d64954` | Centerbreaker Charge | Smashball Pro | UNSOURCED_OWNER_POLICY |
| `a0c4b4b252ee4c96` | Cortosis Staff Block | Morgukai Warrior | UNSOURCED_OWNER_POLICY |
| `a1ef8440f49847f1` | Linebreaker Charge | Smashball Pro | UNSOURCED_OWNER_POLICY |
| `a36f9a2eb2424f86` | Amphistaff Block | Master Of The Amphistaff | UNSOURCED_OWNER_POLICY |
| `a4629f24bd571414` | Mercenary's Determination | Mercenary | UNSOURCED_OWNER_POLICY |
| `a9a84d42b75f4fb1` | Lesser Mark of Illumination | Chalactan Adept | UNSOURCED_OWNER_POLICY |
| `b1669310f65d42b7` | Engineering Savant | Mechanic | UNSOURCED_OWNER_POLICY |
| `b431ca7ea00947b9` | Delusion | Sorcerer Of Tund | UNSOURCED_OWNER_POLICY |
| `b9fce171cad543d7` | Clone Scientist | Cloner | UNSOURCED_OWNER_POLICY |
| `cc1cf3a694244618` | Diplomatic Poise | Galactic Senator | UNSOURCED_OWNER_POLICY |
| `cc78c981176d4fed` | Avoid Collisions | Jumptrooper | UNSOURCED_OWNER_POLICY |
| `d1418afeaa3f40ec` | Reflexive Tilting | Jumptrooper | UNSOURCED_OWNER_POLICY |
| `d49ca4c47e704a96` | Defensive Stance | Defensive Duelist | UNSOURCED_OWNER_POLICY |
| `d9cb414fe4734507` | Mass Cloning | Cloner | UNSOURCED_OWNER_POLICY |
| `e09d40421ade49e8` | Binding Sickle | Dathomiri Witch | HOMEBREW_POLICY_OWNER_DECISION |
| `e6055a514a784387` | Akk Dog Master | Exceptional Followers | UNSOURCED_OWNER_POLICY |
| `e9541e13afbb4a41` | Steady Strike | Defensive Duelist | UNSOURCED_OWNER_POLICY |
| `ea6ee6fad799491e` | Jedi Healer | Jedi Consular | HOMEBREW_POLICY_OWNER_DECISION |
| `ebc1d6e79fa543c9` | Steady Hands | Treatment | UNSOURCED_OWNER_POLICY |
| `f2df5596a9db40c1` | Blackguard Initiate | Blackguard Wilder | UNSOURCED_OWNER_POLICY |
| `f785208aa6774cd7` | Dark Side Maelstrom | Dark Side | HOMEBREW_POLICY_OWNER_DECISION |
| `f9352f317ad2f695` | Stolen Form | Sith | PDF_LOOKUP_REQUIRED_DEFINITION_NOT_IN_TXT |
| `fbaab00b6eab02a3` | Mercenary's Teamwork | Mercenary | UNSOURCED_OWNER_POLICY |
| `fd87928650da45fd` | Poisoncraft | Science | UNSOURCED_OWNER_POLICY |

## Validation

`node tools/check-talent-phase-3d-dispositions.mjs` — PASS (92 records, 2 adjudicated); `node tests/talent-phase-3d-review-extras.test.mjs` — 9/9.
The checker fails on missing/duplicate/unknown records, a nonexistent survivor or replacement, an unlisted or stale live actor reference on a deletion, and a KEEP record that no longer exists.
