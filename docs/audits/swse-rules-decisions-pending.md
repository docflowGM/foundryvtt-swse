# SWSE Rules Decisions Register

**This file holds two independent append-only registers.** Species-migration entries (`SPECIES-RD-###`, this part) come first; the modification-system register (`D-###`, machine-parsed by `tools/lib/modification-runtime.mjs`) follows under its own heading, unchanged. Neither register edits or renumbers the other's entries.

**Append-only.** Entries are never edited or removed once added; a resolution is recorded in the entry's *Resolution* block with the date and implementing commit, and the original question is preserved.

**Decision authority:** project owner. **Claude's recommended ruling:** none unless explicitly requested. See `CLAUDE.md` (Rules Authority Addendum).

**Status vocabulary** (tracked independently per feature): `SOURCE_VERIFIED`, `DATA_RECONCILED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED`, `OFFLINE_TESTED`, `FOUNDRY_TESTED`, `DEFERRED_RULES_REVIEW`.

Source research referenced here is the local-only Phase 4-B species audit (source profile ids such as `UR-2B-04`); it is not committed. Evidence below is paraphrased.

---

## SPECIES-RD-001 — Default publication for species printed in more than one book

| Field | |
|---|---|
| Rules domain | Species / source selection |
| Feature | Which publication a species record represents by default |
| Source | Multi-publication species: Barabel (Scum and Villainy p.155; Galaxy at War p.11), Bith (Galaxy of Intrigue p.11; Threats of the Galaxy p.26), Chadra-Fan (Unknown Regions p.11-12; Legacy Era p.211), Chagrian (Legacy Era p.11; Clone Wars p.159), Chiss (Unknown Regions; Legacy Era p.12; Force Unleashed), Krevaaki (Unknown Regions p.13; Jedi Academy Training Manual p.111), Neimoidian (Core p.285; Galaxy of Intrigue p.18), Yuuzhan Vong (Core p.285; Legacy Era p.16) |
| Evidence | The audit records no authorized player-default publication for any of these species. Publications differ materially in places: Chadra-Fan ability modifiers (+2 Dex/-2 Wis vs -2 Wis/+2 Cha), Bith (+2 Cha, Scent in one book only), Neimoidian (-2 Str/+2 Int/+2 Wis/Pak Pak vs -2 Str/+2 Cha), Krevaaki Fortitude/Carapace typing (see RD-003). |
| Confirmed behavior | Each publication is retained as its own complete snapshot variant (`completeSnapshot`), selectable explicitly. A snapshot never inherits another publication's traits. Existing legacy "alternate" variants are untouched. |
| Unresolved question | Which publication, if any, is the default when a player does not explicitly select one; and whether the species picker should require an explicit publication choice instead of offering a default. |
| Options | None derivable from the sources; this is a project policy decision. |
| Recommended ruling | None |
| Implementation impact | The base (unselected) record of each multi-publication species is still a legacy, unreconciled record. Only grants absent from every audited publication were removed from it. No base record was re-pointed to a publication except as stated in RD-002. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-002 — Yuuzhan Vong base record was re-pointed to Core without authorization

| Field | |
|---|---|
| Rules domain | Species / source selection |
| Feature | Yuuzhan Vong base record (`species-yuuzhan-vong`) |
| Source | Core Rulebook p.285; Legacy Era Campaign Guide p.16 |
| Evidence | The two books print different "Technophobic" traits: Core is a -5 penalty on attack rolls and skill checks made with mechanical weapons or tools; Legacy Era suppresses class-granted starting proficiency in heavy weapons, pistols and rifles. The previous base record mixed the Legacy-style suppression (named "Primitive") with an unprinted "Biotech Proficiency" and a sidecar "Living Technology" restriction. |
| Confirmed behavior | Core p.285 prints Force Immunity (Will-targeting Force effects), Technophobic (-5), Weapon Familiarity (amphistaff with simple-weapon proficiency). Legacy p.16 prints Force Immunity, a starting-proficiency Technophobic, and amphistaffs counting as simple weapons. Neither prints "Biotech Proficiency" or "Living Technology". |
| Unresolved question | **Claude chose Core as the base record in commit `9b6091c` without authorization** (it matched the Core page reference recorded for this species ID). Whether the base should be Core, Legacy, or neither is a source-selection ruling that belongs to the project owner. The Legacy Era profile is available as the snapshot variant `yuuzhan-vong-leg-2c-07`. |
| Options | Core p.285 as base; Legacy p.16 as base; no default (see RD-001). |
| Recommended ruling | None |
| Implementation impact | Default Yuuzhan Vong characters currently are not Primitive (Core). Reverting is a data-only change. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-003 — Krevaaki Carapace: Fortitude bonus type and stacking

| Field | |
|---|---|
| Rules domain | Species / defenses / bonus typing |
| Feature | Carapace (`UR-3B-04-F02`, `JATM-3J-04-F01`) |
| Source | The Unknown Regions p.13; Jedi Academy Training Manual p.111 |
| Evidence | Unknown Regions: +1 natural armor bonus to Reflex Defense and +1 natural armor bonus to Fortitude Defense, each stacking with armor bonus. Jedi Academy Training Manual: +1 natural armor bonus to Reflex and +1 bonus to Fortitude Defense, with the Fortitude bonus type not stated. |
| Confirmed behavior | Both books grant +1 to Reflex and +1 to Fortitude, unconditionally. |
| Unresolved question | The bonus type of the Fortitude bonus in the Jedi Academy Training Manual (natural armor vs unspecified), and whether either bonus stacks with armor bonuses as the Unknown Regions text states. |
| Options | The two printed typings above. |
| Recommended ruling | None |
| Implementation impact | Carapace is **not automated** in either Krevaaki snapshot (text only). The legacy base record keeps its pre-existing Reflex +1 untouched. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-004 — Chagrian Radiation Resistance: bonus type and qualifying attacks

| Field | |
|---|---|
| Rules domain | Species / defenses / conditional bonuses |
| Feature | Radiation Resistance (`LEG-3C-01-F03`, `CW-3H-11-F02`) |
| Source | Legacy Era Campaign Guide p.11; The Clone Wars Campaign Guide p.159 |
| Evidence | Legacy Era: +5 to Fortitude Defense against attacks that inflict radiation damage (no bonus type printed). Clone Wars: +5 species bonus to Fortitude Defense versus radiation damage. |
| Confirmed behavior | A +5 Fortitude Defense bonus that applies only against radiation damage. It is not an unconditional bonus. |
| Unresolved question | The bonus type (untyped vs species), and what qualifies as "attacks that inflict radiation damage" (how the damage type is established for a defense roll). |
| Options | The two printed wordings above. |
| Recommended ruling | None |
| Implementation impact | Not automated. A prose-parsing path had converted the Clone Wars wording into an unconditional +5 Fortitude; audited snapshots no longer automate anything from prose (commit in this batch). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-005 — Bith Evolved Intellect: conflicting mechanics

| Field | |
|---|---|
| Rules domain | Species / Force points / skill checks |
| Feature | Evolved Intellect (`GOI-3G-01-F03`, `TOG-3K-01-F01`) |
| Source | Galaxy of Intrigue p.11; Threats of the Galaxy p.26 |
| Evidence | Galaxy of Intrigue: whenever the Bith spends any Force Point, a temporary Force Point is granted that may be added to an Intelligence-based skill check. Threats of the Galaxy: once per encounter, an Intelligence check's die result may be replaced by 20. |
| Confirmed behavior | Both are Bith traits. They describe different mechanics. Other differences: Galaxy of Intrigue also prints +2 Cha and Scent; Threats of the Galaxy prints Heightened Awareness. |
| Unresolved question | Which mechanic governs when both books are in play, or whether they are alternative publications of the species (see RD-001). |
| Options | Treat as two separate publications (current behavior); other precedence rulings. |
| Recommended ruling | None |
| Implementation impact | Evolved Intellect is not automated in either snapshot. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-006 — Krevaaki base record language token

| Field | |
|---|---|
| Rules domain | Species / languages |
| Feature | Automatic language of the Krevaaki base record |
| Source | The Unknown Regions p.13; Jedi Academy Training Manual p.111 |
| Evidence | Both books print the automatic languages as Basic and Dromnyr. The base record lists Basic and "Kreva". Both "Kreva" and "Dromnyr" exist in the language compendium; the origin of "Kreva" is not documented. |
| Confirmed behavior | The audited snapshots carry Basic and Dromnyr. |
| Unresolved question | Whether the base record's "Kreva" should be replaced by "Dromnyr", kept, or supplemented. |
| Options | Replace; keep; add. |
| Recommended ruling | None |
| Implementation impact | Base record unchanged. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-007 — Small-size Stealth bonus authority (Ewok and other Small species)

| Field | |
|---|---|
| Rules domain | Size rules / skills |
| Feature | Small-size Stealth bonus |
| Source | Not a printed Ewok species trait in the audited Core profile (CORE-2A-05). Present only in the repository's name-keyed species sidecar. |
| Evidence | `DefenseCalculator` applies the Small-size Reflex modifier itself. No common size rule applies a Small-size Stealth bonus; Ewok receives +5 Stealth only from its sidecar entry. |
| Confirmed behavior | Ewok's sidecar +5 Stealth is still applied (kept deliberately). The duplicate species +1 Reflex clause was removed because the calculator already applies the size modifier (technical double count). |
| Unresolved question | Which source establishes size modifiers to skills for Small actors, and whether the Ewok sidecar entry should remain once a common rule exists. Other Small species may lack the same published benefit. |
| Options | None derivable without the size table source. |
| Recommended ruling | None |
| Implementation impact | A cross-species size rule is not implemented. No species-specific workaround should be added. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-008 — Automatic Basic language when a species language line omits it

| Field | |
|---|---|
| Rules domain | Species / languages |
| Feature | Automatic languages of audited snapshots |
| Source | Chiss: The Unknown Regions, Legacy Era Campaign Guide p.12, The Force Unleashed Campaign Guide (all three print Cheunh only); Bith: Threats of the Galaxy p.26 (Bith only) |
| Evidence | The audit records the printed automatic languages exactly. Those lines do not list Basic. Other audited species list Basic explicitly (e.g. Chadra-Fan, Bith in Galaxy of Intrigue, Krevaaki). |
| Confirmed behavior | The snapshots grant exactly the printed languages. A snapshot Chiss (all three books) and snapshot Bith (Threats of the Galaxy) therefore do not receive Basic automatically. |
| Unresolved question | Whether a character is intended to know Basic when the printed species language line omits it, and by what authority. |
| Options | None derivable from the sources. |
| Recommended ruling | None |
| Implementation impact | No Basic is added to those snapshots. The legacy Chiss base record lists Cheunh and Basic and is unchanged. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-009 — Chiss base record lists a Charisma penalty that no audited book prints

| Field | |
|---|---|
| Rules domain | Species / ability modifiers |
| Feature | Chiss ability modifiers (`species-chiss`) |
| Source | The Unknown Regions; Legacy Era Campaign Guide p.12; The Force Unleashed Campaign Guide |
| Evidence | All three audited publications print +2 Intelligence and no other modifier. The base record is +2 Int, -2 Cha. |
| Confirmed behavior | The three publication snapshots carry +2 Int only. |
| Unresolved question | Whether the base record's -2 Cha should be removed, retained, or the base record re-pointed (see RD-001). Ability modifiers are Phase 2 authority and affect character creation. |
| Options | Remove; retain. |
| Recommended ruling | None |
| Implementation impact | Base record left unchanged. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## SPECIES-RD-010 — Krevaaki Conditional Bonus Feat (Unknown Regions p.13): condition not machine-extractable

| Field | |
|---|---|
| Rules domain | Species / bonus feats |
| Feature | Conditional Bonus Feat (`UR-3B-04-F01`) |
| Source | The Unknown Regions p.13 |
| Evidence | The audit states: with Climb trained, the character gains Skill Focus (Climb) as a bonus feat (structured: condition trainedSkill Climb, feat Skill Focus (Climb)). |
| Confirmed behavior | The grant and its condition are explicit in the source. |
| Unresolved question | None about the rule itself. This is recorded because the existing ledger could not extract the structured requirement from the audited paraphrase; the finalizer therefore defers the grant (does not auto-grant) rather than assuming it. Listed so the deferral is not silent. |
| Options | n/a |
| Recommended ruling | None |
| Implementation impact | Not automated in the Unknown Regions Krevaaki snapshot; the description is displayed. Requires a structured feat-grant rule, not a rules ruling. |
| Status | `DEFERRED_RULES_REVIEW` (technical; no rules question) |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-001 — RESOLUTION (appended; the original question above is preserved unchanged)

| Field | |
|---|---|
| Decision | **Approved by the project owner, 2026-10-14:** when a player selects a species that has multiple published species profiles, the V2 character-creation UI presents the verified versions and the player chooses one explicitly. The system never silently selects a sourcebook. |
| Rules as ruled | (1) Each verified version is displayed with its publication/variant name. (2) Differences in racial abilities, traits, languages, movement and other relevant mechanics are shown so the choice is informed. (3) When multiple published profiles exist, an explicit selection is required before creation proceeds; no silent default. (4) A selected version loads that publication's complete profile and inherits nothing from other versions. (5) A species with a single valid profile needs no extra selection. (6) The selected version's stable id is preserved on the actor so leveling, reopening creation and later calculations use the same rules. (7) Existing actors and their configurations are preserved; nothing is migrated or auto-changed. (8) Existing variant ids are preserved. (9) Publication variants are distinct from choices within a profile (e.g. selectable ability modifiers); both are supported and within-profile choices appear after the version. (10) Unverified legacy variants are not presented as authoritative published versions but remain for existing-actor compatibility until their provenance is resolved. (11) The requirement is respected by every species assignment path, including drag-and-drop and character creation. |
| Scope note | RD-002 (the earlier unauthorized Yuuzhan Vong base-record change) remains a separate open compatibility/reconciliation item. This resolution makes no default-publication decision and forces no existing-actor migration. |
| Implementation | Single policy module `scripts/species/species-publication-selection.js`; enforced centrally in `buildPendingSpeciesContext` (every assignment path), surfaced in the existing V2 species step (selector, comparison, confirm gate, restore on reopen), the drag-and-drop handler (version prompt before any plan is built) and the template adapter (a template without a version leaves the species for the player). Followers fail closed (no silent sourcebook). Verified versions exist for: Bith, Chadra-Fan, Chagrian, Chiss, Krevaaki, Neimoidian (Core, Galaxy of Intrigue) and Yuuzhan Vong (Core, Legacy Era). Barabel's two publications are held (natural attacks) so it still has no verified version. |
| Tests | `tests/species-publication-selection.test.mjs` |
| Implementing commit | recorded in the next appended line |
| Status | `OFFLINE_TESTED`; not `FOUNDRY_TESTED` |

**SPECIES-RD-001 — implementing commit:** `1633d8c245e6a7beca188fdfa0f028e6c52a18cc` (RD-001 resolution above; recorded after the commit existed, per the append-only rule).

---

## SPECIES-RD-011 — Legacy overlay variants: publication difference or choice within one profile?

| Field | |
|---|---|
| Rules domain | Species / variant classification |
| Feature | 16 legacy (non-snapshot) variants on 15 species — see `docs/audits/swse-species-variant-audit.md` (e.g. Devaronian Female, Gand Force-Sensitive/Non-Force-Sensitive, Nautolan, Quarren, Pau'an, Jawa/Kaminoan/Noghri/Umbaran alternates) |
| Source | Not mapped to a source profile in the repository data (several carry only a label such as "Canonical alternate species traits"); page references unverified |
| Evidence | The variants override some base fields and inherit the rest from the base record. The repository does not record whether each one is a separate publication or a choice printed inside one profile. |
| Confirmed behavior | Existing actors that recorded these variant ids keep resolving them (legacy overlay). They are never offered as authoritative publication versions (RD-001). |
| Unresolved question | For each variant: is it (a) a within-profile choice that should stay selectable in the existing variant UI, (b) a distinct publication that should be hydrated as a verified snapshot, or (c) unsupported? Not classified here, and nothing is auto-certified. |
| Options | Per-variant classification (a)/(b)/(c) against the audited source profiles, once the owner supplies or confirms the mapping. |
| Recommended ruling | None |
| Implementation impact | Species with 0 verified snapshots keep the existing variant selector and legacy overlay behavior unchanged (Devaronian preserved). Species that also have verified snapshots (Bith, Chadra-Fan, Krevaaki, Neimoidian, Yuuzhan Vong) hide the legacy variant from new selections. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-012 — Barabel: two audited publications, none implementable

| Field | |
|---|---|
| Rules domain | Species / publication coverage |
| Feature | Barabel |
| Source | Scum and Villainy (profile SV-2F-10) and Galaxy at War (profile GAW-2I-01); page evidence in the local-only audit bundle |
| Evidence | Both audited publications present Barabel as a standard playable profile. Neither is hydrated because each carries natural-weapon features the hydration tool does not yet compile. |
| Confirmed behavior | Two publications exist. The existing base record is neither of them verified. |
| Unresolved question | None about the rules; this is a technical hold. Recorded because RD-001 forbids assigning an unverified default to a new character. |
| Options | Hydrate both once natural-weapon support exists; until then selection is blocked. |
| Recommended ruling | None |
| Implementation impact | `knownPublications` on the Barabel record marks it `MULTIPLE_NOT_IMPLEMENTED`: new selection (step, drag-drop, template, follower) is blocked with a message; existing Barabel actors keep working. |
| Status | `DEFERRED_RULES_REVIEW` (technical hold) |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-013 — Skill reroll whose printed text does not say which result to use

| Field | |
|---|---|
| Rules domain | Species / skill reroll |
| Feature | Pa'lowick — Swim reroll (Galaxy of Intrigue, profile GOI-2G-10); Ishi Tib — Swim reroll (The Unknown Regions, UR-2B-03, held for natural weapons) |
| Source | Page references in the local-only audit bundle (GOI-2G-10 / UR-2B-03) |
| Evidence | The audited trait lets the character reroll Swim checks (with a take-10 exception) and the audit records that the block does not state whether the original or the rerolled result must be used. |
| Confirmed behavior | A reroll of Swim checks exists; take 10 on Swim is permitted while distracted or threatened. |
| Unresolved question | Which result is kept. The previous repository data automated "keep the better result"; no audited source supports that. |
| Options | (a) must accept the reroll; (b) keep the better result; (c) player's choice — none is supported by the printed text. |
| Recommended ruling | None |
| Implementation impact | Pa'lowick's Swim reroll is display-only in the snapshot (the earlier unsupported automation is removed). Ishi Tib remains held. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-014 — Basic omitted from the printed language line (additional species)

| Field | |
|---|---|
| Rules domain | Species / languages |
| Feature | Draethos (Knights of the Old Republic, KOTOR-2D-04) and Pa'lowick (Galaxy of Intrigue, GOI-2G-10) automatic languages |
| Source | Page references in the local-only audit bundle |
| Evidence | The audited language lines list only the species' own language. Earlier repository data also granted Basic. This is the same question as SPECIES-RD-008 (Chiss, Bith). |
| Confirmed behavior | The species language is automatic. |
| Unresolved question | Whether Basic is implicitly known when the line omits it (see RD-008). |
| Options | See RD-008. |
| Recommended ruling | None |
| Implementation impact | Snapshots grant only the printed language; Basic is not added. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-012 — RESOLUTION NOTE (appended; the original entry above is preserved unchanged)

| Field | |
|---|---|
| Nature | The Barabel hold was a technical blocker, not a rules question. |
| Resolution | Both audited publications are now verified snapshots (`barabel-sv-2f-10`, `barabel-gaw-2i-01`). Their printed natural attacks are granted through the existing species natural-weapon item path (ledger → `species-natural-weapon` weapon items); the selection policy now requires an explicit version through the existing selector. |
| Tests | `tests/species-natural-weapons.test.mjs`, `tests/species-profile-invariants.test.mjs` |
| Status | `OFFLINE_TESTED`; not `FOUNDRY_TESTED` |

---

## SPECIES-RD-015 — Lugubraa natural attacks: damage types are not printed

| Field | |
|---|---|
| Rules domain | Species / natural weapons |
| Feature | Lugubraa — barbed tentacles (1d6) and teeth (1d4) (The Unknown Regions, UR-2B-13, printed p.135) |
| Source | The Unknown Regions p.135 (page evidence in the local-only audit bundle) |
| Evidence | The audit records die size for both attacks and records the damage type as not printed. |
| Confirmed behavior | Two natural attacks with the stated dice exist. |
| Unresolved question | The damage type of each attack. The natural-weapon item path would otherwise default a type. |
| Options | None supported by the printed text. |
| Recommended ruling | None |
| Implementation impact | The Lugubraa profile is held (not hydrated); the legacy base record is unchanged. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-011 — PROGRESS NOTE (appended; the original entry above is preserved unchanged)

| Field | |
|---|---|
| Nature | Provenance was established from the printed profiles in the Phase 4-B audit instead of asking for per-variant rulings. |
| Result | 14 of 16 legacy variants classified from evidence (see `docs/audits/swse-species-variant-audit.md`): 2 duplicates, 2 near-duplicates (language differences only; RD-006/RD-008), 1 within-profile choice (Devaronian, now the existing ability choice inside its verified profile), 9 matching no printed profile (no longer offered for new selections; ids preserved). |
| Still open | Elom and Pau'an are not in the audit inventory, so their variants cannot be verified; they are left unchanged. This is a coverage gap, not a rules question. |
| Decision needed from the owner | None for classification. The owner may veto hiding any "no matching profile" variant from new selections. |
| Status | `OFFLINE_TESTED`; not `FOUNDRY_TESTED` |

---

## SPECIES-RD-016 — Dashade automatic languages: the traits block has no language line

| Field | |
|---|---|
| Rules domain | Species / languages |
| Feature | Dashade (Galaxy at War, GAW-2I-02, printed p.12) |
| Source | Galaxy at War p.12 |
| Evidence | The Species Traits block lists no Automatic Languages entry; nearby narrative text names Dashadi as the Dashade language. |
| Confirmed behavior | Ability modifiers, size, speed and the three printed traits are explicit. |
| Unresolved question | What the automatic languages are: none, Dashadi, or Basic and Dashadi. The audit records this as unresolved, not as none. |
| Options | (a) Dashadi from the narrative text; (b) none, because the traits block lists none. Neither is stated as the species rule. |
| Recommended ruling | None |
| Implementation impact | The Dashade profile is held; the legacy base record is unchanged. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-017 — Republic Clone: "+2 to one score" versus the repository's two +1 increases

| Field | |
|---|---|
| Rules domain | Species / ability generation |
| Feature | Republic Clone (The Clone Wars Campaign Guide, CW-2H-10, printed p.91) |
| Source | The Clone Wars Campaign Guide p.91 |
| Evidence | The printed array is Str 15, Dex 13, Con 10, Int 12, Wis 10, Cha 8, and a clone player may choose one ability score to increase by 2 at creation. The existing record instead lets the player distribute two +1 increases like the level-4 step (`allocationMode: level-4-two-abilities`, `maxPerAbility: 1`), flagged for GM approval on override; a separate attribute-step mode `allow_stacked_two` allows +2 to one score. |
| Confirmed behavior | The fixed array and the single choice of +2 are printed. |
| Unresolved question | Whether the repository's default of two +1 increases is an approved house ruling or should follow the printed +2 to one score. |
| Options | (a) printed: +2 to one score; (b) existing default: two +1 increases (house rule); (c) existing `allow_stacked_two` setting. |
| Recommended ruling | None |
| Implementation impact | The profile is held; the existing record and attribute step are unchanged. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-018 — Celegian: no land speed printed

| Field | |
|---|---|
| Rules domain | Species / movement |
| Feature | Celegian (Jedi Academy Training Manual, JATM-2J-02, printed p.106) |
| Source | Jedi Academy Training Manual p.106 |
| Evidence | The block prints fly 6 squares (hover) and swim 10 squares and no land speed. |
| Confirmed behavior | Fly 6 and swim 10. |
| Unresolved question | Whether a Celegian has no land speed or a default one; the audit says not to default it. |
| Options | None supported by the printed text. |
| Recommended ruling | None |
| Implementation impact | The profile is held; snapshot speed requires an explicit finite number. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-019 — Killik: size varies by individual and is GM-defined

| Field | |
|---|---|
| Rules domain | Species / size |
| Feature | Killik (The Unknown Regions, UR-2B-12, printed p.131) |
| Source | The Unknown Regions p.131 |
| Evidence | Typical sizes are Small, Medium, Large and Huge (extremes Fine and Colossal); the printed baseline modifiers apply to Medium Killiks, and size-specific modifiers need an instance-specific profile. |
| Confirmed behavior | Medium baseline modifiers, speed 6, natural armor +1 Reflex, 1d6 slashing claws. |
| Unresolved question | How size is chosen at creation and which modifiers and speed changes apply to other sizes. |
| Options | None stated as a creation rule. |
| Recommended ruling | None |
| Implementation impact | The profile is held; hydrating only the Medium baseline would present a partial species. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

---

## SPECIES-RD-017 — PROGRESS NOTE (appended; the original entry above is preserved unchanged)

| Field | |
|---|---|
| Result | Republic Clone is now a verified profile (`republic-clone-cw-2h-10`) carrying the printed fixed array (Str 15, Dex 13, Con 10, Int 12, Wis 10, Cha 8) and the printed single +2 (`bonusValue: 2`). |
| Behavior kept | How the attribute step lets the player spend the bonus is the repository's existing, documented behavior (`docs/species-phase4-special-attribute-rules.md`: two +1 increases, one per ability by default, with the `allow_stacked_two` mode available). Its allocation fields are carried over from the existing record unchanged. No ruling record approving it as a house rule was found, so the default is not changed here. |
| Still needed from the owner | Whether the attribute step's default for new Republic Clone characters should follow the printed "+2 to one score". |
| Status | `DEFERRED_RULES_REVIEW` (default allocation only); profile `OFFLINE_TESTED` |

---

## SPECIES-RD-019 — RESOLUTION NOTE (appended; the original entry above is preserved unchanged)

| Field | |
|---|---|
| Result | The Unknown Regions prints a separate "Killiks of Medium size" block (p.131). It is hydrated as `killik-ur-2b-12`; its description states that other sizes are GM-defined and not automated. |
| Still open | Size-specific modifiers and speed for other sizes (the book directs the GM to Table 16-2 and the Creature Generator) are not implemented and need a design decision, not a rules invention. |
| Status | Medium profile `OFFLINE_TESTED`; other sizes `DEFERRED_RULES_REVIEW` |

---

## SPECIES-RD-018 — ENGINEERING NOTE (appended; the original entry above is preserved unchanged)

| Field | |
|---|---|
| Finding | The derived character speed reads `system.speed` and falls back to 6 when it is absent; `system.speciesMovement` (fly, swim) is stored but not consumed by derived movement. A species without a printed land speed therefore cannot be represented without either inventing a walking speed or changing derived movement. |
| Decision | Celegian stays held. Needed: derived movement that consumes fly/swim/hover, and an explicit "no land speed printed" state. Language comprehension (Basic understood, not spoken) has no schema either. |
| Status | `DEFERRED_RULES_REVIEW` plus a technical movement-schema gap |

---

## SPECIES-RD-018 — SECOND ENGINEERING NOTE (appended; earlier entries preserved unchanged)

| Field | |
|---|---|
| Investigation | The only place a missing land speed could be handled is the shared derived-speed code (`scripts/actors/v2/character-actor.js` `baseSpeed`, used by every character): with no `system.speed` it yields the generic default 6; with 0 it yields an immobile walk speed. Neither is stated by the book. |
| Question for the owner | For a species printed with fly and swim speeds but no land speed, should the derived Walk speed be shown as absent ("—"), 0, or should the character use another printed mode as its primary speed? This changes shared movement display, so it is a design decision, not a data fix. |
| Engineering that is ready once decided | Snapshot `speed: null` with an explicit "land speed not printed" marker; apply/revoke of the printed fly/swim/hover modes; a derived-speed branch for the marker. |
| Status | `DEFERRED_RULES_REVIEW` |

---

## SPECIES-RD-017 — PROJECT OWNER RULING (appended; the original question and progress note above are preserved unchanged)

| Field | |
|---|---|
| Decision | **Option A, approved by the project owner:** Republic Clone characters follow the published Clone Wars Campaign Guide rule — the fixed array Str 15, Dex 13, Con 10, Int 12, Wis 10, Cha 8 plus exactly +2 to ONE chosen ability score. Splitting that bonus into two +1 increases is not permitted under the canonical rule. |
| Scope | Default for new Republic Clone characters. Existing characters keep their stored ability scores (nothing is recomputed). The earlier two-separate-+1 allocation remains available only as the explicitly labelled optional house rule `republicCloneAbilityAllocation = two_different_plus_one` (GM house-rule setting). |
| Verification of `allow_stacked_two` | `allow_stacked_two` is the global level-up setting `abilityIncreaseAllocationMode`; it permits either +2 to one ability or +1 to two, so it cannot express the canonical rule. Raising `maxPerAbility` to 2 alone would still accept a split. The canonical mode therefore adds `singleScore: true`. |
| Implementation | Snapshot `republic-clone-cw-2h-10` abilityChoice: `allocationPoints 2`, `maxPerAbility 2`, `singleScore true`, with `houseRuleAllocation` naming the optional setting. The existing Attribute step enforces it (`_resolveSpeciesAllocation`, `_canAdjustSpeciesFixed`, completion requires one score); no new UI. The house rule is registered in `houserule-settings.js`, `houserules-manifest.js` and `settings-defaults.js`. |
| Tests | `tests/species-republic-clone-allocation.test.mjs` (canonical default, every score a legal single choice, no split, stepping back, house-rule mode, existing characters untouched; mutation-checked) and `tests/species-source-pinned.test.mjs` |
| Implementing commit | recorded in the next appended line |
| Status | `OFFLINE_TESTED`; not `FOUNDRY_TESTED` |

**SPECIES-RD-017 — implementing commit:** `c8e6b64f4d691041c347fa1e2b98e28cd0f9b027` (ruling above; recorded after the commit existed, per the append-only rule).

---

## SPECIES-RD-018 — PROGRESS NOTE: movement and language infrastructure (appended; earlier entries preserved unchanged)

| Field | |
|---|---|
| Result | The shared movement authority (`scripts/species/species-movement.js`) now represents "land speed not printed" as its own state: `system.speed = null` with `system.speciesLandSpeedUnspecified = true`, printed fly/swim/hover modes in `system.speciesMovement`, derived `speed.walk/base/total = null` (never 0, never 6) with the printed modes exposed, and the speed-modifier engine no longer adjusts a walk speed that does not exist. The ledger's generic initial walk speed of 6 is overridden by the explicit marker. Ordinary walking species are unchanged. Replacement, A-B-A and idempotent re-application are tested. |
| Languages | `languageRestrictions` (`understand-only`) is now first-class data on snapshots and Core base records (Celegian, Wookiee and Gamorrean Basic), stored in `flags.swse.speciesLanguageRestrictions`, revoked with the species, queryable through `scripts/species/species-languages.js`. Other audited restrictions (speak only, sign language only) are not modelled and remain display text. |
| Profile | Celegian is hydrated as `celegian-jatm-2j-02` (Jedi Academy Training Manual p.106: "Speed: Fly 6 squares (hover), swim 10 squares"; "Basic (understand only)"). |
| Still for the owner | How gameplay should treat a character with no walk speed beyond the displayed modes (for example, whether a "move" action uses the primary printed mode, and what the sheet/token speed shows). Nothing here decides that: the sheet shows the printed modes and no walk speed. No new owner ruling is recorded. |
| Related finding | `flags.swse.speciesLanguages` was never populated (the pending context copies `ledger.languages` only when it is an array; it is an object). Not changed here because the language step reads the ledger directly. |
| Status | Infrastructure and profile `OFFLINE_TESTED`; gameplay semantics `DEFERRED_RULES_REVIEW` |

---

## SPECIES-RD-015 — SOURCE SEARCH NOTE (appended; earlier entries preserved unchanged)

| Field | |
|---|---|
| Evidence searched | The Unknown Regions Lugubraa species traits (printed p.135): "barbed tentacles (1d6 points of damage) and dangerous teeth (1d4 points of damage)"; the Lugubraa stat block lists "Melee barbed tentacle +13 (1d6+1)". Every other sourcebook text searched has no Lugubraa entry. No damage type is printed anywhere in the supplied text. |
| Result | The hold stands. No default type is assigned. |
| Status | `DEFERRED_RULES_REVIEW` |

---

## SPECIES-RD-016 — SOURCE REVIEW NOTE (appended; earlier entries preserved unchanged)

| Field | |
|---|---|
| Evidence | Galaxy at War's Dashade sidebar line reads "Languages: Dashadi"; the species traits block has no Automatic Languages line. In the same book, the sidebar "Languages" line and the traits-block "Automatic Languages" line are different things: Lurmen's sidebar names only Lurmen while its automatic languages are Basic and Lurmese; Taung and Zygerrian have both lines. Dashade is the only profile in the book with the sidebar line and no traits-block line. |
| Distinction | A sidebar language is what the species speaks (narrative); an automatic language is a creation-time grant. The book gives no rule connecting the two. |
| Result | The hold stands. Neither Dashadi nor Basic is granted automatically without an owner ruling. |
| Status | `DEFERRED_RULES_REVIEW` |

---

## SPECIES-RD-020 — Near-Human trait mechanism (O'reenian, generic Near-Human)

| Field | |
|---|---|
| Decision ID | SPECIES-RD-020 |
| Rules domain | Species creation — near-Human generation system |
| Feature | O'reenian (and the generic "Near-Human" pack record) |
| Source | Unknown Regions, "Creating Near-Humans" with Table 1-4 (Near-Human Traits) and Table 1-5 (Near-Human Variants) in Chapter 1, and the O'reenian entry in the Unknown Regions gazetteer (text-file lines 1452-1700 and 18910; printed page numbers are not recoverable from the text export and need PDF confirmation) |
| Evidence | The system starts from the Human species and says to select one trait from Table 1-4, "replacing either the bonus trained skill or the bonus feat that Humans normally receive", then one to three cosmetic variants from Table 1-5. The O'reenian entry says O'reenians "have the following traits and variations: Heightened Awareness, Persistent, Eye Variation (black irises), and Skin Color (orange)" and that their native tongue is based on a very old dialect of Bocce. |
| Confirmed behavior | Table 1-4 describes Heightened Awareness as "Can reroll a Perception check" and Persistent as "Can reroll an Endurance check". |
| Unresolved question | (1) Two traits are listed for O'reenians although the generation text replaces one Human feature per selected trait choice; the book does not say whether both Human features (bonus trained skill and bonus feat) are replaced. (2) No Automatic Languages line is printed for O'reenians and none is given for the near-Human system, so whether Basic is granted is not printed. (3) Whether a generic near-Human selector (choose trait and variants) should exist as a playable species is a product decision. |
| Options (source-supported) | For (1): replace both Human features, or replace one and keep the other. For (2): the Human species' printed Basic, or no automatic language line. |
| Recommended ruling | none |
| Implementation impact | O'reenian stays as an unhydrated pack record (no complete snapshot). No near-Human mechanism is implemented. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | (blank until approved) |

---

## SPECIES-RD-021 — "speak only" language restriction (Ewok)

| Field | |
|---|---|
| Decision ID | SPECIES-RD-021 |
| Rules domain | Species languages |
| Feature | Ewok Automatic Languages |
| Source | Core Rulebook, Ewok Species Traits (text-file line 2017; "Automatic Languages: Ewokese (speak only)"); printed page needs PDF confirmation |
| Evidence | The line grants Ewokese with the parenthetical "speak only". Wookiee prints "Basic (cannot speak)" and Celegian prints "Basic (understand only)", both of which have first-class restriction data. |
| Confirmed behavior | Ewoks have Ewokese as their only printed automatic language. |
| Unresolved question | Which abilities "speak only" withholds: reading and writing only, understanding (it is not the same as "cannot read"), or something else. The Core text excerpt does not define the term. |
| Options (source-supported) | None can be chosen from the text: no rule in the local text defines "speak only". |
| Recommended ruling | none |
| Implementation impact | Ewok keeps Ewokese as a plain language with no restriction data; the printed qualifier is not represented. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | (blank until approved) |

---

## SPECIES-RD-022 — Neimoidian (Galaxy of Intrigue) Deception conditional feat: "trained feat" wording

| Field | |
|---|---|
| Decision ID | SPECIES-RD-022 |
| Rules domain | Species conditional bonus feats |
| Feature | Neimoidian, Galaxy of Intrigue Species Traits, "Conditional Bonus Feats" (text-file line 1402; printed page needs PDF confirmation) |
| Evidence | The text reads that a Neimoidian "with Deception as a trained feat" gains Skill Focus (Deception), and that a Neimoidian trained in Persuasion gains Skill Focus (Persuasion). The Phase 4-B audit records the Deception wording as probably a typographical error and says not to rewrite it as settled errata. The Core Rulebook profile of the same species (separate publication) prints Deception only. |
| Confirmed behavior | The Persuasion grant is worded as a trained-skill condition. |
| Unresolved question | Whether "trained feat" for Deception should be applied as "trained skill" (an unauthorized reading of a printed wording). |
| Options (source-supported) | Apply the Deception grant as printed-but-read-as-trained-skill; apply only the Persuasion grant; apply neither until errata is confirmed. |
| Recommended ruling | none |
| Implementation impact | The GOI snapshot keeps both grants as display-only text; the Core snapshot's Deception grant is unaffected. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | (blank until approved) |

---

## SPECIES-RD-023 — Chagrian (Clone Wars): "breathe normally in water" versus "can't drown"

| Field | |
|---|---|
| Decision ID | SPECIES-RD-023 |
| Rules domain | Species environmental traits |
| Feature | Chagrian Breathe Underwater, Clone Wars Campaign Guide (text-file line 15149) versus Legacy Era Campaign Guide (text-file line 725) |
| Evidence | The Legacy Era text prints "As amphibious creatures, Chagrians can't drown in water" (the same wording Core uses for other amphibious species, which the engine maps to the drowning immunity). The Clone Wars text prints "Chagrians can breathe normally in water". |
| Confirmed behavior | Both publications print a Breathe Underwater trait. |
| Unresolved question | Whether the Clone Wars wording carries the same drowning immunity as the "can't drown" wording. |
| Options (source-supported) | Treat the two wordings as equivalent; or keep the Clone Wars trait as text only. |
| Recommended ruling | none |
| Implementation impact | The Legacy Era snapshot applies the drowning immunity; the Clone Wars snapshot does not (display-only), so the publications stay independent. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | (blank until approved) |

---

## SPECIES-RD-015 — CLOSEOUT NOTE (appended; earlier entries preserved unchanged)

| Field | |
|---|---|
| Source re-check | Unknown Regions Lugubraa traits (text-file area around the species entry; printed p.135) still print "barbed tentacles (1d6 points of damage) and dangerous teeth (1d4 points of damage)" with no damage type; the stat block "Melee barbed tentacle +13 (1d6+1)" prints none either. No other local book mentions Lugubraa attacks. There is no canonical answer in the text. |
| Action | The profile `UR-2B-13` is now hydrated as the sole Lugubraa snapshot with the two natural attacks left as display text: no weapon item, no ledger natural weapon, no damage type. Ability modifiers, Lugubraal, the Improved Damage Threshold bonus feat and the other traits are unaffected. The exception is limited to this profile by an explicit allowlist in the hydrator (`DISPLAY_ONLY_UNTYPED_NATURAL_ATTACKS`) and pinned by `tests/species-held-profiles.test.mjs`. |
| Still for the owner | Which damage type(s) the barbed tentacles and teeth deal (or whether the printed absence means the type is chosen elsewhere). Until then the attacks are not automated. |
| Status | Profile `OFFLINE_TESTED`; the two natural attacks `DEFERRED_RULES_REVIEW` |

---

## SPECIES-RD-016 — CLOSEOUT NOTE: smallest decision (appended; earlier entries preserved unchanged)

| Field | |
|---|---|
| Evidence | Galaxy at War Dashade species traits (GAW-2I-02, printed p.12) have no Automatic Languages line; the sidebar prints "Languages: Dashadi". In the same book the other species' sidebar and Automatic Languages lines are separate and the traits-block line is the creation grant. The existing species record applies `["Dashadi"]` (legacy data, no Basic) and no complete snapshot exists. |
| Smallest decision | What should a new Dashade character receive automatically? (A) Dashadi only — exactly what the legacy record does today; (B) Basic and Dashadi; (C) none. |
| Recommended resolution (requested by the project owner) | (A): it changes nothing for existing or new characters, matches the only printed language statement, and invents no Basic grant. |
| Not done | No snapshot is created and no language is changed until the owner answers. Pinned by `tests/species-held-profiles.test.mjs` (never Basic). |
| Status | `DEFERRED_RULES_REVIEW` |

---

# SWSE Rules Decisions — Pending Register

**Append-only.** Entries are never deleted or overwritten. When the project owner rules, the original question is preserved and the ruling, date and implementing commit are added under **Resolution**.
**Authority:** the project owner decides every entry. **Recommended ruling is "None" unless the owner explicitly asks for one.** An entry is a deferral, not a decision, and nothing in it authorizes any implementation.
**Status of every open entry:** an open entry carries one or both of two review statuses (revision 2, 2026-10-14; entry IDs and original text are unchanged):

- `PENDING_SOURCE_VERIFICATION` — the published rules text for the question has not yet been fully examined and certified. This is a research gap, not a rules ambiguity. Incomplete registry coverage never implies that the published rules are ambiguous. The work is source examination (reading the cited pages and recording exact publication identity, printed page and evidence). It does not need an owner ruling.
- `DEFERRED_RULES_REVIEW` — the source *has* been examined and a genuine ambiguity, contradiction between authorities, or a policy decision remains. Only this status needs the project owner. It may be reached for an entry only after that entry's source examination is complete, and the examination result is recorded here.

An entry may carry both statuses (for example, part of the question is a research gap while another part is already a policy question). Moving an entry from `PENDING_SOURCE_VERIFICATION` to `DEFERRED_RULES_REVIEW`, to resolved, or to closed is done by appending to **Resolution**, never by rewriting history. The classification row added to each entry below is an addition; the original `Status` rows are retained as written (they predate the distinction and are superseded by the classification row).
**Evidence rule:** each entry records only what the merged v1.5 registry (`data/audits/modification-rolling-authority-v1.5.json`, SHA-256 `7be42741…3d00`), the merged Phase 0/1a/1b documents, or the owner's rulings establish. Page numbers are the registry's printed pages. Where a fact is the registry's claim and not independently re-verified here, the entry says so.

Seeded 2026-10-14 from the modification-system work (Phases 0–1b, G1 and the V2 replacement design package).

---

## D-001 — Installing and removing an upgrade

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor, equipment) |
| Feature | Installing and removing an upgrade (registry procedure `sv-install-remove-upgrade`) |
| Source | *Scum and Villainy* p. 39 |
| Evidence | Registry status `RULES_OUTLINE_REVIEWED`. The registry's description: Mechanics DC, time, scratch-built costs, install failure, removal and failure consequences "depend on source table". |
| Confirmed behavior | An install/remove procedure exists and has a DC, a time, a cost basis, and failure and removal consequences. |
| Unresolved question | The exact DC, time, scratch-built cost, failure consequence and removal consequence values and conditions are not certified in the registry. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Any V2 install/remove flow that rolls, charges time or cost, or applies failure outcomes; the rules content of the install service. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* p. 39 (and the cross-referenced table text) and record the DC, time, scratch-built cost basis, install-failure and removal consequences with page evidence. The registry only records that these values "depend on source table"; it records no ambiguity. Becomes `DEFERRED_RULES_REVIEW` only if the examined text is itself ambiguous or conflicts with another authority. |
| Ledger scope | component=installProcedure; definitions=ALL |
| Source examination log | 2026-10-14: OCR layer of the cited pages examined; shape of the procedure confirmed, numeric values illegible, PDF page image needed. Still open; blocker not lifted. See `docs/audits/d-001-install-remove-source-examination.md`. |
| Source examination log (PDF) | 2026-10-14: printed page 39 image supplied by the independent reviewer (SHA-256 `fa4c7131829212cec52bb8fd887402aafbdb4b0a9cb6cdfaa246db0d79ca9fc1`) inspected directly; Table 2-2 and the Installing Upgrades / removal text transcribed and reconciled in `docs/audits/d-001-install-remove-pdf-verification.md`. The earlier OCR note is preserved unchanged. |
| Blocker lifted | source=Scum and Villainy printed page 39 (Table 2-2: Upgrade Installation and the Installing Upgrades text), verified against the page image; evidence=docs/audits/d-001-install-remove-pdf-verification.md sections 3-6 and the 76 installProcedure specification records in data/modifications/specification-records-v1.json |
| Resolution (source) | The installation DC and time table, the scratch-built cost rule, the failure and retry rule, ordinary and expedited removal, and slot recovery are verified from the printed page. The page governs Scum and Villainy Tables 2-3/2-4/2-5 upgrade options with a fixed printed upgrade-point value (76 typed definitions). The installation procedure of every other typed definition is tracked by D-013; the points the page leaves undefined are tracked by D-014. This is a source resolution, not an owner ruling. |
| Decision authority | Project owner |
| Resolution | |

## D-002 — Stripping an item feature for a slot

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor) |
| Feature | Stripping an item (registry procedure `sv-stripping-item`) |
| Source | *Scum and Villainy* pp. 37–38 |
| Evidence | Registry status `RULES_OUTLINE_REVIEWED`: "Strip allowed significant feature to gain a slot with certified drawbacks; not free numeric bonus." The merged Phase 1a contract (section 6, D16) records that the general rules restrict repeating a method for gaining slots unless an exception permits it. |
| Confirmed behavior | Stripping a significant feature can gain a slot, with drawbacks, and is not a free bonus. |
| Unresolved question | Which features on which individual weapons or armor qualify; what the drawbacks are; whether more than one strip may count; no per-host feature evidence exists in the registry. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Any strip grant. Phase 1a already fails closed (a recorded strip is `unresolved`, never `+1`); the V2 structural service and any host-evidence input are blocked. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* pp. 37–38 for which features qualify, the stated drawbacks, and the repeat-method restriction already noted from the Phase 1a contract. No ambiguity is recorded in the registry. Phase 1a D16 (fail closed) stays in force until certification. |
| Decision authority | Project owner |
| Resolution | Interim: Phase 1a D16 (fail closed). Not a final ruling. |

## D-003 — Increasing an item's size

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor) |
| Feature | Increase size (registry procedure `sv-increase-size`) |
| Source | *Scum and Villainy* pp. 38–39 |
| Evidence | Registry status `RULES_OUTLINE_REVIEWED`: "Increase size for slot grant and published restrictions; the effect applies once unless explicit exception." |
| Confirmed behavior | A size increase grants a slot; it applies once unless an explicit exception exists; published restrictions exist. |
| Unresolved question | Exactly what a size increase changes on weapons versus armor (for example whether armor weight class changes), and the published restrictions' content. The repository's two writers disagree: one rewrites the armor class, the other only records the flag (Phase 0 audit). |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | The V2 structural service and the armor stock-class derivation. Phase 1a counts a canonical size increase once (verified `+1`) and leaves armor stock class unrecoverable without trusted input. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* pp. 38–39 for what a size increase changes on weapons and on armor and for the published restrictions. The disagreement between the repository's two writers is an engineering inconsistency (resolved by the replacement, not by a rules ruling) unless the printed text itself is ambiguous. |
| Decision authority | Project owner |
| Resolution | |

## D-004 — Retractable Stock slot cost

| Field | Content |
|---|---|
| Rules domain | Weapon upgrade |
| Feature | Retractable Stock (`sv-retractable-stock`) |
| Source | *Scum and Villainy* p. 42, Table 2-4 |
| Evidence | Registry slot cost is `conditional` with possible costs 0 or 1 and "Requires specific source-text examination"; mechanical certification `PENDING_RULES_TEXT`. |
| Confirmed behavior | The printed slot cost is conditional, zero or one. |
| Unresolved question | The condition that selects 0 versus 1. |
| Options | 0 or 1, as printed. No condition is certified. |
| Recommended ruling | None |
| Implementation impact | Slot accounting for this upgrade (never certified; remains unresolved). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* p. 42 and Table 2-4 for the condition selecting a slot cost of 0 or 1. The registry says only that specific source-text examination is required. |
| Ledger scope | component=cost; definitions=sv-retractable-stock |
| Decision authority | Project owner |
| Resolution | |

## D-005 — Universal upgrades: which hosts they attach to

| Field | Content |
|---|---|
| Rules domain | Universal upgrades (weapon, armor, equipment) |
| Feature | The 16 *Scum and Villainy* Table 2-3 universal upgrades: Cheater, Cloaked, Droidification (excluded scope), Dual Gear, Electrograpple Handle, Environmental Sealing, Extra Power Source, Memory Upgrade, Memory Upgrade, Advanced, Miniaturized, Recognition System, Remote Activation, Secret Compartment, Silverplate, Spring Loaded, Storage Capacity |
| Source | *Scum and Villainy* Table 2-3 (for example p. 41 for Cheater) |
| Evidence | For these 16 rows the registry marks domain applicability `CONDITIONAL_UNVERIFIED` for equipment (15 typed domains), weapon (11) and armor (9); mechanical certification `PENDING_RULES_TEXT`; audit blockers `RULES_TEXT_NOT_CERTIFIED`, `DOMAIN_APPLICABILITY_NOT_CERTIFIED`. |
| Confirmed behavior | Slot costs and prices are table-verified. |
| Unresolved question | Which of weapons, armor and equipment each universal upgrade may be installed on, and each upgrade's detail rules. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Accounting and installation of these 16 upgrades in any domain (per the Phase 1b contract they stay blocked). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine each Table 2-3 upgrade's printed text for permitted hosts and detail rules. No ambiguity is recorded; applicability is simply not yet certified. |
| Ledger scope | component=hostPrerequisites; definitions=sv-cheater,sv-cloaked,sv-dual-gear,sv-electrograpple-handle,sv-environmental-sealing,sv-extra-power-source,sv-memory-upgrade,sv-memory-upgrade-advanced,sv-miniaturized,sv-recognition-system,sv-remote-activation,sv-secret-compartment,sv-silverplate,sv-spring-loaded,sv-storage-capacity |
| Decision authority | Project owner |
| Resolution | |
| Source examination log (D-005 host text) | 2026-10-16: the project rules review examined the owner's original Scum and Villainy PDF (SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`), printed pp. 40-42, covering all 15 universal-upgrade parent definitions. Table 2-3 is on printed p. 40; the entry descriptions span pp. 40-42 (Cheater and Cloaked p. 40, Dual Gear through Secret Compartment p. 41, the Secret Compartment continuation, Silverplate, Spring Loaded and Storage Capacity p. 42). The approved findings are in `docs/audits/d-005-universal-upgrade-host-text-transcription.md` and the approved implementation plan is `docs/audits/d-005-t2-implementation-plan.md`. The review covers exactly 15 parents and the 35 existing typed definitions: 19 SUPPORTED and 16 CONDITIONALLY SUPPORTED category/domain verdicts, the published host restrictions and functional prerequisites, and the published stacking exceptions (Extra Power Source is explicitly repeatable; the advanced Memory Upgrade replaces the basic benefits); every other stacking and maximum-per-host value is NOT SPECIFIED BY SOURCE. The findings are recorded in the 35 `PUBLISHED_FACTS` `hostPrerequisites` specification records (`D005::<typedDefinitionId>`). Historical correction (append-only; the original Source row above is preserved): that row cites p. 41 for Cheater, but Cheater and Table 2-3 are on printed p. 40. The registry v1.5 `printedTablePage` value of 41 is likewise inaccurate and is left unchanged pending a separately approved, versioned registry reconciliation (see `docs/audits/modification-registry-v1.5-correction-addendum-d005.md`). |
| Blocker lifted | source=Scum and Villainy printed pages 40-42 (Table 2-3 and Universal Upgrades descriptions); evidence=docs/audits/d-005-universal-upgrade-host-text-transcription.md and docs/audits/d-005-t2-implementation-plan.md |
| Resolution (source) | The D-005 source-verification question is resolved for its exact 35 typed definitions. The published source establishes category-level applicability and the relevant functional host conditions, and those published facts are recorded in the existing 35 `PUBLISHED_FACTS` host-prerequisite specification records. This is a source-only resolution. It does not establish that any individual owned item is eligible, does not specify executable host evaluation, does not certify a complete host-prerequisite mechanic, does not resolve unverified stacking limits, does not supply missing effect mechanics (for example the Silverplate Quick Draw benefit or the Spring Loaded action), does not certify installation procedures (D-014 remains open), does not make any upgrade selectable, and does not authorize implementation or execution. |

## D-006 — Modifications with no printed price

| Field | Content |
|---|---|
| Rules domain | Modification acquisition and pricing |
| Feature | Componentization (Basic and Deluxe); Excellent Kit purchased quality |
| Source | *Galaxy of Intrigue* p. 68 (Componentization); *Rebellion Era Campaign Guide* p. 43 (Excellent Kit) |
| Evidence | Registry price type `not_stated` for `goi-componentization-basic`, `goi-componentization-deluxe` and `reb-excellent-kit-purchased-quality`. The registry notes the existing catalogue value `0` is not a certified free price. Owner ruling: an unstated price is unknown, never zero. |
| Confirmed behavior | The price is not printed; it is unknown. |
| Unresolved question | How the V2 system should handle acquiring or installing a modification whose price is not printed (for example whether the owner or GM sets a price, or the item is not purchasable). |
| Options | None supported by source evidence. |
| Recommended ruling | None |
| Implementation impact | The purchase and install flow for these modifications. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `DEFERRED_RULES_REVIEW` — The source has been examined by the registry: the price is not printed, so it is unknown (owner ruling: never zero). The remaining question — how the V2 system handles acquiring or installing a modification whose price is not printed — is a policy decision, not a research gap. A fresh check that the cited pages indeed print no price may be recorded under Resolution but is not a prerequisite. |
| Ledger scope | component=cost; definitions=goi-componentization-basic,goi-componentization-deluxe,reb-excellent-kit-purchased-quality |
| Decision authority | Project owner |
| Resolution | Partial, prior: price is unknown, never `0` (owner ruling). The handling flow remains open. |

## D-007 — Computerized Interface Scope and Night Vision Device

| Field | Content |
|---|---|
| Rules domain | Weapon/equipment modification |
| Feature | Computerized Interface Scope; Night Vision Device |
| Source | Unverified. The compliance audit located a Computerized Interface Scope in the *Rebellion Era Campaign Guide* (OCR only: a 2,000 credit, 0.5 kg weapon-mounted scope); no source was located for Night Vision Device. |
| Evidence | Both exist in the repository catalog and effect map but have no definition in the v1.5 registry. |
| Confirmed behavior | None established by certified evidence. |
| Unresolved question | Whether each is a published modification, its slot cost, and its host. |
| Options | None. |
| Recommended ruling | None |
| Implementation impact | These two catalog entries. Owner ruling: neither is added nor deleted until the source is verified. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — A source has not been located for Night Vision Device and the *Rebellion Era Campaign Guide* entry for Computerized Interface Scope is OCR-only. Locate and verify the printed entries. Existing owner ruling (keep as is until verified) stands. |
| Decision authority | Project owner |
| Resolution | Interim: keep as is until verified (owner ruling). |

## D-008 — Tech Specialist device extra slot

| Field | Content |
|---|---|
| Rules domain | Tech Specialist |
| Feature | Trait `tech_device_upgrade_slot` ("Additional Upgrade Slot") in the Tech Specialist service |
| Source | *Starships of the Galaxy* p. 21 (Tech Specialist table) |
| Evidence | The registry states the service-only device extra slot is not certified by the printed table. |
| Confirmed behavior | None. |
| Unresolved question | Whether this trait exists in the published rules and whether it grants capacity. |
| Options | None. |
| Recommended ruling | None |
| Implementation impact | The trait's slot effect (Phase 1a treats it as `unverified`, never capacity). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine the *Starships of the Galaxy* p. 21 Tech Specialist table and surrounding text to establish whether the trait is published and what it grants. |
| Decision authority | Project owner |
| Resolution | |

## D-009 — Superior Tech traits

| Field | Content |
|---|---|
| Rules domain | Tech Specialist |
| Feature | The 14 in-scope "superior tier" traits in the Tech Specialist service (armor 6, device 4, weapon 4) |
| Source | Not certified in the registry |
| Evidence | The registry states Superior Tech is not certified and holds no definition for these traits (compliance audit D4). Owner ruling: uncertified Superior Tech traits are preserved and not expanded. |
| Confirmed behavior | None. |
| Unresolved question | Source certification of each trait. |
| Options | None. |
| Recommended ruling | None |
| Implementation impact | These traits in the V2 Tech Specialist consumer (preserved as is, not expanded, not newly automated). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Locate and certify the Superior Tech source text for each of the 14 traits. Existing owner ruling (preserve, do not expand) stands. |
| Decision authority | Project owner |
| Resolution | Interim: preserve, do not expand (owner ruling). |

## D-010 — Three Legacy Era templates: composition with other modifications

| Field | Content |
|---|---|
| Rules domain | Templates |
| Feature | `legacy-biotech-host-template`, `legacy-weapon-template-antiquated`, `legacy-weapon-template-refitted` |
| Source | *Legacy Era Campaign Guide* pp. 66, 100, 101 |
| Evidence | Registry stacking policy `SOURCE_CONSTRAINTS_FURTHER_COMPOSITION_TESTS_NEEDED` (the other 23 published templates carry the certified KOTOR governance, `KOTOR_TEMPLATE_ONE_NONEXEMPT_BY_DEFAULT`). |
| Confirmed behavior | Each template's printed price and effect text is recorded in the registry. |
| Unresolved question | How these three compose with other templates and upgrades. The registry flags that further source tests are needed and does not record the specific gap. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Applying these templates alongside any other template or upgrade. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Legacy Era Campaign Guide* pp. 66, 100, 101 and record the specific composition constraints. The registry flags that further source tests are needed but does not record a specific ambiguity. |
| Ledger scope | component=hostPrerequisites; definitions=legacy-biotech-host-template,legacy-weapon-template-antiquated,legacy-weapon-template-refitted |
| Decision authority | Project owner |
| Resolution | |

## D-011 — Lightsaber accessory allowance and crystal pools

| Field | Content |
|---|---|
| Rules domain | Lightsabers |
| Feature | Lightsaber construction accessories and focusing crystals (registry procedure `jedi-saber-construction`; 10 accessory definitions with stacking policy `LIGHTSABER_ACCESSORY_ALLOWANCE_PENDING_RECONCILIATION`) |
| Source | *Jedi Academy Training Manual* pp. 54, 60 |
| Evidence | Procedure status `LEAD_PENDING_CERTIFICATION`: "Chassis+focusing crystal+special accessory allowance distinct from standard upgrade slots; do not assume stacking." The packaged `upgradeSlots = 1` on crystals and accessories is not proof of a general slot cost. |
| Confirmed behavior | These pools are distinct from standard upgrade slots. |
| Unresolved question | The accessory allowance count and its relation to Tech Specialist, and whether chassis capacity exists as a pool. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Any lightsaber pool accounting (Phase 1a never certifies a lightsaber) and the V2 lightsaber consumer. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Jedi Academy Training Manual* pp. 54 and 60 for the accessory allowance count, crystal pools and the Tech Specialist relation. May become `DEFERRED_RULES_REVIEW` if the printed text is ambiguous about stacking. |
| Ledger scope | component=cost; slotPools=lightsaber-primary-crystal,lightsaber-accessory |
| Decision authority | Project owner |
| Resolution | |

## D-012 — Powered armor stock slots

| Field | Content |
|---|---|
| Rules domain | Armor |
| Feature | Stock upgrade capacity of powered armor |
| Source | *Scum and Villainy* p. 37 |
| Evidence | The registry's outline text reads "medium and powered armor 2" and omits heavy armor; printed p. 37 gives light 1, medium 2, heavy 3 (reviewer-verified, the Phase 1a baseline). No shipped armor sets `isPoweredArmor`. |
| Confirmed behavior | Light 1, medium 2, heavy 3 (Phase 1a). |
| Unresolved question | Precedence between a powered armor's powered status and its weight class when they imply different stock capacity. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Capacity of powered armor (Phase 1a leaves it unresolved). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Re-examine *Scum and Villainy* p. 37 for what the printed text says about powered armor. The registry outline text omits heavy armor and differs from the printed baseline, which indicates an incomplete outline rather than an established ambiguity. Becomes `DEFERRED_RULES_REVIEW` only if the page gives no precedence rule between powered status and weight class. |
| Decision authority | Project owner |
| Resolution | |

## D-013 — Installation procedure of definitions not governed by Scum and Villainy page 39

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor, equipment) |
| Feature | Installation and removal of every typed definition, released family by family. The verified page-39 procedure governs 76 of them (released by the first Partial lift row); 156 remain |
| Source | Varies by definition. For the eight Knights of the Old Republic Table 5-6 accessories: *Knights of the Old Republic Campaign Guide* pp. 75-76 (OCR layer: "upgrade slot cost … for use with the gear enhancement system in Scum and Villainy"). Others: their own publications |
| Evidence | `docs/audits/d-001-install-remove-pdf-verification.md` section 6: Table 2-2 is keyed on upgrade points, the Upgrade Points column of Scum and Villainy Tables 2-3/2-4/2-5. Nothing on page 39 extends it to other publications' items. The registry ties the eight KOTOR accessories to the Scum procedure through `procedureRefs`, which is the registry's claim and is not independent verification. `sv-retractable-stock` is a Scum upgrade whose upgrade points are conditional (0 or 1), so its Table 2-2 row cannot be selected until D-004 is resolved |
| Confirmed behavior | None for these definitions beyond what each publication's own procedure (where the registry certifies one) states |
| Unresolved question | Which installation and removal procedure, if any, governs each of these definitions, and with which values |
| Options | None supported by certified evidence |
| Recommended ruling | None |
| Implementation impact | `installProcedure` stays unverified for the typed definitions not released by a **Partial lift** row (156 today); they cannot become runtime-selectable. A definition or certified family is released only by an appended `Partial lift` row naming the parent definitions with `source=` and `evidence=` (the evidence must cite an existing repository file); editing the pinned scope row, or the ledger alone, releases nothing |
| Status | `PENDING_SOURCE_VERIFICATION` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine each publication's own installation rules (for the KOTOR accessories, pp. 75-76 in the PDF) and record, per definition or certified family, whether the Scum page-39 procedure applies, releasing it through an appended `Partial lift` row. Becomes `DEFERRED_RULES_REVIEW` only if the examined text is ambiguous or conflicting |
| Ledger scope | component=installProcedure; definitions=ALL |
| Partial lift | definitions=sv-cheater,sv-cloaked,sv-dual-gear,sv-electrograpple-handle,sv-environmental-sealing,sv-extra-power-source,sv-memory-upgrade,sv-memory-upgrade-advanced,sv-miniaturized,sv-recognition-system,sv-remote-activation,sv-secret-compartment,sv-silverplate,sv-spring-loaded,sv-storage-capacity,sv-bayonet-ring,sv-bipod,sv-double-trigger,sv-ion-charger,sv-missile-load,sv-neutronium-reinforcement,sv-overload-switch,sv-pulse-charger,sv-rangefinder,sv-rapid-recycler,sv-slinker,sv-sniper-switch,sv-targeting-scope-standard,sv-targeting-scope-low-light,sv-aquatic-adaptation,sv-armorplast,sv-climbing-claws,sv-diagnostics-system,sv-environmental-systems,sv-gyro,sv-helmet-package,sv-holoshroud,sv-integrated-equipment-1-slot,sv-integrated-equipment-2-slots,sv-integrated-equipment-5-slots,sv-integrated-equipment-10-slots,sv-internal-generator,sv-jump-servos,sv-powered-exoskeleton,sv-radiation-shielding,sv-armor-rangefinder,sv-ready-harness,sv-repulsorlift,sv-shadowskin,sv-shadowskin-reflec,sv-shield-generator-sr5,sv-shield-generator-sr10,sv-shockweb,sv-vacuum-seals,sv-vacuum-seals-improved,sv-weapon-mount; source=Scum and Villainy printed page 39 (Table 2-2: Upgrade Installation and the Installing Upgrades text), verified against the page image; evidence=docs/audits/d-001-install-remove-pdf-verification.md section 6 (governance reconciliation) |
| Source examination log (KOTOR accessories) | 2026-10-15: *Knights of the Old Republic Campaign Guide* Weapon and Armor Accessories text (OCR layer; no page image available) examined for the eight Table 5-6 accessories. It gives their upgrade slot costs "for use with the gear enhancement system in Scum and Villainy" and states no installation or removal procedure, neither adopting nor excluding Table 2-2. No Partial lift proposed; the eight definitions stay blocked. See `docs/audits/d-013-kotor-accessories-source-examination.md`. |
| Decision authority | Project owner |
| Resolution | |

## D-014 — Points the printed installation and removal rules leave undefined

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor, equipment) |
| Feature | Gaps in the Scum and Villainy printed-page-39 installation and removal procedure (D-001) |
| Source | *Scum and Villainy* printed page 39, "Installing Upgrades" and Table 2-2 (examined: see `docs/audits/d-001-install-remove-pdf-verification.md` section 5) |
| Evidence | The page was examined directly. It states each rule below only as quoted; it does not define the listed points |
| Confirmed behavior | The explicit rules of section 5 of the verification document |
| Unresolved question | (1) What monetary cost an installation attempt has, so that a retry "costs half as much as the original attempt" has a basis. (2) Expedited removal when the table time is already the shortest increment (10 minutes), and the 1 week example the page does not print. (3) What "deactivated" means mechanically and whether a deactivated or failed-installation upgrade occupies a slot. (4) The state after a failed installation beyond "doesn't work properly". (Whether a skill-training, tool or workshop requirement applies is a source-research question, tracked separately as D-015) |
| Options | None supported by the page. Other publications' text could settle parts of (1)-(4); that would be research, not an owner decision |
| Recommended ruling | None |
| Implementation impact | A V2 executor must not implement retry pricing, expedited removal at the shortest increment, deactivation effects, or failed-installation state until these are resolved. **Machine-enforced:** the 76 governed typed definitions carry this entry as an open `installProcedure` blocker, so their `installProcedure` has verified published facts (`SOURCE_VERIFIED`) but is never `MECHANIC_SPECIFIED`, cannot take implementation evidence, and cannot become runtime-selectable until the entry is lifted (an owner ruling is required) |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `DEFERRED_RULES_REVIEW` — The source has been examined and is silent on items (1)-(4); they are genuine gaps in the printed rule |
| Ledger scope | component=installProcedure; definitions=sv-cheater,sv-cloaked,sv-dual-gear,sv-electrograpple-handle,sv-environmental-sealing,sv-extra-power-source,sv-memory-upgrade,sv-memory-upgrade-advanced,sv-miniaturized,sv-recognition-system,sv-remote-activation,sv-secret-compartment,sv-silverplate,sv-spring-loaded,sv-storage-capacity,sv-bayonet-ring,sv-bipod,sv-double-trigger,sv-ion-charger,sv-missile-load,sv-neutronium-reinforcement,sv-overload-switch,sv-pulse-charger,sv-rangefinder,sv-rapid-recycler,sv-slinker,sv-sniper-switch,sv-targeting-scope-standard,sv-targeting-scope-low-light,sv-aquatic-adaptation,sv-armorplast,sv-climbing-claws,sv-diagnostics-system,sv-environmental-systems,sv-gyro,sv-helmet-package,sv-holoshroud,sv-integrated-equipment-1-slot,sv-integrated-equipment-2-slots,sv-integrated-equipment-5-slots,sv-integrated-equipment-10-slots,sv-internal-generator,sv-jump-servos,sv-powered-exoskeleton,sv-radiation-shielding,sv-armor-rangefinder,sv-ready-harness,sv-repulsorlift,sv-shadowskin,sv-shadowskin-reflec,sv-shield-generator-sr5,sv-shield-generator-sr10,sv-shockweb,sv-vacuum-seals,sv-vacuum-seals-improved,sv-weapon-mount |
| Decision authority | Project owner |
| Resolution | |

## D-015 — Skill, tool and workshop requirements for installing upgrades

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor, equipment) |
| Feature | Who may make the Table 2-2 Mechanics check, and with what tools |
| Source | *Scum and Villainy* printed page 39 (Installing Upgrades); *Saga Edition Core Rulebook*, Mechanics skill (the registry's note cites printed page 68) |
| Evidence | Page 39 says only "make a Mechanics check" and mentions an "overheated workshop" descriptively. The OCR layer of the Core Rulebook (`reference/sourcebooks/Core Rulebook_djvu.txt`, lines 6833-6990, legible here) shows the Mechanics skill headed "Trained Only"; its listed uses (Disable Device, Handle Explosives, Jury-Rig, Modify Droid, Recharge Shields, Regulate Power, Repair, Repair Droid, Repair Object) do not include installing an equipment upgrade; "requires tool kit" is attached to Modify Droid, Repair and Repair Droid only; the skill's Retry paragraph says a Mechanics check can usually be retried. OCR is not the final authority |
| Confirmed behavior | None certified. Reading from OCR only: the Mechanics skill is Trained Only; neither source states a tool-kit or workshop requirement for Table 2-2 installation |
| Unresolved question | Whether the Core Rulebook's Trained Only property and any tool requirement apply to the Table 2-2 check, confirmed against the PDF page (and whether the Core Rulebook lists an upgrade use at all) |
| Options | None. This is a source-verification task, not an owner decision, unless the confirmed text conflicts with page 39 |
| Recommended ruling | None |
| Implementation impact | The executor must neither enforce nor waive a training or tool requirement until verified. **Machine-enforced:** the 76 governed typed definitions carry this entry as an open `installProcedure` blocker |
| Status | `PENDING_SOURCE_VERIFICATION` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Read the Core Rulebook Mechanics entry in the PDF and record the Trained Only property and every tool requirement verbatim, with printed page. Becomes `DEFERRED_RULES_REVIEW` only if the confirmed text is ambiguous or conflicts with page 39 |
| Ledger scope | component=installProcedure; definitions=sv-cheater,sv-cloaked,sv-dual-gear,sv-electrograpple-handle,sv-environmental-sealing,sv-extra-power-source,sv-memory-upgrade,sv-memory-upgrade-advanced,sv-miniaturized,sv-recognition-system,sv-remote-activation,sv-secret-compartment,sv-silverplate,sv-spring-loaded,sv-storage-capacity,sv-bayonet-ring,sv-bipod,sv-double-trigger,sv-ion-charger,sv-missile-load,sv-neutronium-reinforcement,sv-overload-switch,sv-pulse-charger,sv-rangefinder,sv-rapid-recycler,sv-slinker,sv-sniper-switch,sv-targeting-scope-standard,sv-targeting-scope-low-light,sv-aquatic-adaptation,sv-armorplast,sv-climbing-claws,sv-diagnostics-system,sv-environmental-systems,sv-gyro,sv-helmet-package,sv-holoshroud,sv-integrated-equipment-1-slot,sv-integrated-equipment-2-slots,sv-integrated-equipment-5-slots,sv-integrated-equipment-10-slots,sv-internal-generator,sv-jump-servos,sv-powered-exoskeleton,sv-radiation-shielding,sv-armor-rangefinder,sv-ready-harness,sv-repulsorlift,sv-shadowskin,sv-shadowskin-reflec,sv-shield-generator-sr5,sv-shield-generator-sr10,sv-shockweb,sv-vacuum-seals,sv-vacuum-seals-improved,sv-weapon-mount |
| Source examination log | 2026-10-15: Core Rulebook printed pages 68 and 70 inspected from supplied images (printed page 69 was not supplied; the page-68 image was uploaded twice). Verified: Mechanics is Trained Only; kit requirements attach to specific uses (security kit: Disable Device; tool kit: Modify Droid, Repair, Repair Droid); no listed use is installing an equipment upgrade; no source states a tool or workshop requirement for Table 2-2. Page 69 is OCR-only, so D-015 stays open and no lift is proposed. See `docs/audits/d-015-mechanics-requirements-source-examination.md`. |
| Decision authority | Project owner |
| Resolution | |
| Source examination log (complete PDF) | 2026-10-15: independent source reviewer re-opened the uploaded Core Rulebook PDF (printed pp. 60, 68, 69 and 70) and Scum and Villainy PDF (printed pp. 37-41), verified source and page hashes, and compared the exact Mechanics check and Table 2-2 text. Core p. 69 contains explosives procedures and no equipment-upgrade installation rule. The Core Mechanics check is Trained Only. Neither the Core listed use rules nor the S&V upgrade procedure impose a universal installation tool-kit or workshop prerequisite. Core taking 10 is conditional, and taking 20 fails the standard no-failure-penalty condition for this procedure. Independently verified details and citations are in docs/audits/d-015-mechanics-complete-visual-source-reconciliation.md. Optional GM take-10/20 and facility/tool adjustments are separately documented house-rule directions, not published mechanics. |
| Blocker lifted | source=Core Rulebook printed pages 60 and 68-70 (Mechanics) and Scum and Villainy printed pages 37-41 (Installing Upgrades and Table 2-2); evidence=docs/audits/d-015-mechanics-complete-visual-source-reconciliation.md and docs/audits/d-015-source-certification-release-acceptance-checklist.md |
| Resolution (source) | The D-015 source-verification question is answered for its exactly scoped 76 typed definitions. The installer performing Table 2-2 check is trained in Mechanics. The examined books do not state a universal tool kit or workshop prerequisite for that operation; requirements explicitly attached to other Mechanics uses are not silently transferred. General Core take-10/take-20 conditions remain source rules, distinct from optional GM house-rule overrides. This resolution does not specify a complete installation mechanic, lift D-014, certify prices/hosts/effects, make any definition selectable, or authorize G6. |

---

## Revision log

- **Revision 2 (2026-10-14):** introduced `PENDING_SOURCE_VERIFICATION` versus `DEFERRED_RULES_REVIEW`; added a *Review classification* row to D-001–D-012. Of the twelve entries, eleven are research gaps awaiting source examination; only D-006 (policy for unpriced modifications) is a decision for the owner today. No decision ID, original field, owner ruling or interim position was changed. No recommended ruling is made for any entry. Source examination is the next step for D-001 first, because it blocks the install procedure.
- **Revision 3 (2026-10-14, G2):** the status ledger (`data/modifications/status-ledger-v1.json`) now links typed domain definitions to register entries (D-001 install procedure for every typed definition; D-004, D-005, D-006, D-010, D-011 for their specific definitions). The generator checks that each linked register id exists and that the declared classification equals this register's classification row. D-002, D-003, D-007, D-008, D-009 and D-012 are not bound to registry definitions and have no ledger link. No ID, field, ruling or classification was changed; no recommended ruling was added. Source examination of D-001 (*Scum and Villainy* p. 39) has not been performed in this change.
- **Revision 4 (2026-10-14, G2 review corrections):** added a machine-readable **Ledger scope** row to D-001, D-004, D-005, D-006, D-010 and D-011 (which component and which typed definitions each open entry blocks). The generator now requires the ledger to carry the full scope of every open entry and rejects any omission. An entry's blocker is lifted only by an appended **Blocker lifted** row (`source=` and `evidence=` for `PENDING_SOURCE_VERIFICATION`; `owner-ruling=` for `DEFERRED_RULES_REVIEW`); no such row exists for any entry, so every scoped blocker is open. Entries without a Ledger scope row (D-002, D-003, D-007, D-008, D-009, D-012) block no registry definition directly. No ID, original field, ruling or classification changed.
- **Revision 5 (2026-10-14, D-001 PDF verification):** D-001 resolved from the printed page 39 image (appended source-examination, **Blocker lifted** and source-resolution rows; no existing row changed). New entries D-013 (installation procedure of the 156 typed definitions the page does not demonstrably govern; `PENDING_SOURCE_VERIFICATION`, ledger scope `ALL` except the 56 governed Scum definitions) and D-014 (points the printed procedure leaves undefined; `DEFERRED_RULES_REVIEW`, no ledger scope). No recommended ruling on any entry. D-003 (equipment size) is untouched.
- **Revision 6 (2026-10-14, PR #1043 review corrections; applied to entries this unmerged PR introduced, plus appended rows):** (a) D-013's base scope is now `ALL` and its 76 governed definitions are released by an appended evidence-bound **Partial lift** row instead of an `except=` list; the generator pins every Ledger scope row by SHA-256, so the scope cannot be altered without a reviewed code change, and a partial lift releases nothing unless it names existing parent definitions inside the scope with `source=` and `evidence=` (and `owner-ruling=` for deferred entries) citing an existing repository file. (b) D-014 now has a Ledger scope on the 76 governed definitions so its unresolved sub-flows are machine-enforced; its former item (5) moved to the new research entry **D-015** (`PENDING_SOURCE_VERIFICATION`, same scope). No recommended ruling on any entry.
