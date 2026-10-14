# SWSE Rules Decisions Register

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
