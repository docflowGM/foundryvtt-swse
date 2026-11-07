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

## EQ-001 — Action cost of changing a drawn weapon between EQUIPPED, READIED or other appendages

| Field | Content |
|---|---|
| Rules domain | Equipment posture (weapon draw / stow / ready) |
| Feature | Moving a weapon that is already drawn between the EQUIPPED (held) and READIED (wielded, combat-ready) postures, or changing which appendages hold it |
| Source | Not located. The existing project authority `resolveActionCost('drawOrHolsterWeapon')` prices only drawing from, and holstering to, the stowed state (Move Action; Swift with Quick Draw per existing feat metadata) |
| Evidence | The legacy single drawn/stowed boolean never distinguished EQUIPPED from READIED, so no existing implementation or cited source prices a change between two drawn states. The clean-break posture model (E3-A4) introduced the distinction |
| Confirmed behavior | STOWED -> drawn and drawn -> STOWED use the existing draw/holster cost authority |
| Unresolved question | Whether, and at what action cost, a drawn weapon may be moved between EQUIPPED, READIED or different appendages |
| Options | None supported by a located source |
| Recommended ruling | None |
| Implementation impact | `equipment-state-coordinator.js` returns `DEFERRED_RULES_REVIEW` (decision id EQ-001) for any intent that changes a drawn weapon to another drawn configuration; nothing is written or spent. Stowing first and drawing again is the only supported path |
## V-P2-01 — Spendable Emplacement Points of a canonical hull

| Field | Content |
|---|---|
| Rules domain | Vehicle modification (Shipyard) |
| Feature | Spendable Emplacement Points of a canonical hull |
| Source | Published vehicle records `modifications.emplacementPointsTotal` (3 of 429: kotor-amalgamated-hyperdyne-578-r-space-transport = 4, kotor-arakyd-industries-lethisk-class-armed-freighter = 3, kotor-corellia-stardrive-quartermaster-class-supply-carrier = 2); special-rule text on unused/unspent Emplacement Points for sotg-corellian-yt-1300-transport, sotg-sorosuub-cutlass-9-patrol-fighter, sotg-kuat-systems-engineering-firespray-31-patrol-craft. |
| Evidence | The other 426 records state no Emplacement Point figure. Three state a figure labelled a total. Three Starships of the Galaxy entries mention unused/unspent Emplacement Points in special-rule text. |
| Confirmed behavior | A few hulls publish an EP figure or mention unused EP. |
| Unresolved question | Whether a published `emplacementPointsTotal` is the points available to spend or the hull's total including stock equipment; how to treat the 426 hulls with no published figure. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | `DEFAULT_VEHICLE_INSTALLATION_RULES.resolveEpBudget` denies every install (`EP_BUDGET_UNKNOWN`). No canonical hull can be modified until ruled. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION` for the vehicle-modification rules text (EP formula by size) plus a policy question for hulls with no figure. |
| Decision authority | Project owner |
| Resolution | |

## V-P2-02 — Provenance of data/vehicle-modifications catalog

| Field | Content |
|---|---|
| Rules domain | Vehicle modification (Shipyard) |
| Feature | Provenance of data/vehicle-modifications catalog |
| Source | `data/vehicle-modifications/*.json` (187 rows: id, category, emplacementPoints, availability, sizeRestriction, cost, costType, effect text). |
| Evidence | No row carries a book or printed page. Pricing includes `base`, `flat`, `multiplier` and `modifier` cost types; effects are free text. |
| Confirmed behavior | Rows exist with EP, availability and size restrictions. |
| Unresolved question | Which rows match a published source and are certified; how `base`/`multiplier`/`modifier` cost types resolve to credits; whether size restrictions such as bare 'Colossal' include frigate/cruiser/station hulls. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Planner requires a `certification` block (MECHANIC_SPECIFIED, book, page) on a row, accepts only `flat` costs, and returns SIZE_AMBIGUOUS for the bare-Colossal/subtype cases. No row currently qualifies. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION` (row-by-row certification) and `DEFERRED_RULES_REVIEW` (size subtype and cost-type policy). |
| Decision authority | Project owner |
| Resolution | |

## V-P2-03 — Removal refund, install procedure and stat effects

| Field | Content |
|---|---|
| Rules domain | Vehicle modification (Shipyard) |
| Feature | Removal refund, install procedure and stat effects |
| Source | Legacy `vehicle-system-definitions.js` uses an uncertified 0.5 resale multiplier and fixed stat deltas; D-001 covers the install/removal procedure for items. |
| Evidence | No certified source for vehicle resale value, install time/DC, or how a modification's effect stacks with printed values. |
| Confirmed behavior | None. |
| Unresolved question | Refund on uninstall; install time/DC/failure; stacking and bonus type for effects on defenses, speed, damage reduction and shields. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Uninstall moves no credits and reports `refundPolicyDecided:false`; effects are not applied to effective stats (only EP/cost are tracked). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION`, linked to D-001. |
| Decision authority | Project owner |
| Resolution | |

## V-P2-04 — Evidence required to certify a physical mount

| Field | Content |
|---|---|
| Rules domain | Vehicle weapon installation |
| Feature | Evidence required to certify a physical mount |
| Source | Printed firing groups carry `mountKeys: []` and 'Physical mounting, weapon bindings and firing arcs NOT CERTIFIED'. |
| Evidence | Stock weapon mount identity, arc, battery membership and operator are unpublished or unreviewed for these records. |
| Confirmed behavior | Printed attack groups are reference-only. |
| Unresolved question | What evidence suffices for a mount (the planner currently requires mountKey, arc, operatorRole and book/page evidence) and whether a purchased weapon may be executable at all. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Weapon installs are denied without mount evidence; even with it the ledger entry is `executable:false`. Enabling execution is P4-D. |
| Status | `RESOLVED_OWNER_RULING` |
| Review classification | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | Owner ruling 2026-11-02: a GM may certify the physical mount and assign the firing arc of a NEWLY INSTALLED starship weapon. The mount stores its identity, arc, operator, GM approval and audit provenance, and is recorded as GM-adjudicated (never as published/printed evidence). The weapon's mechanics (damage, EP, cost, availability, size) must still be independently source-verified. Existing stock attack groups remain reference-only and gain no authorization. A GM-approved mount is necessary but not sufficient: every other attack validation still applies. |

## V-P4-01 — Vehicle size modifier on top of printed Initiative

| Field | Content |
|---|---|
| Rules domain | Vehicle Initiative |
| Feature | `SWSECombatDocument._getVehicleSizeModifier` (Colossal -10, Gargantuan -5, Huge -2, Large -1) added to a vehicle's Initiative formula |
| Source | Published vehicle records `abilities.initiativePrinted` (all 429); the code table has no cited book/page |
| Evidence | Every record prints an Initiative modifier (e.g. Incom T-65B X-wing, *Core Rulebook* p. 178: +7). The code adds a size modifier on top of the actor's Initiative skill total; its origin is not cited. |
| Confirmed behavior | The printed Initiative is the vehicle's Initiative modifier. Implemented in P4-B: source-backed vehicles use it as the base in `SWSEInitiative` and `swse-combat`. |
| Unresolved question | Whether a size modifier applies in addition to the printed Initiative, and if so which table is authoritative. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | The existing size modifier is left unchanged and still applies to source-backed vehicles on top of the printed value. A ruling may remove or replace it. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION` — examine the vehicle Initiative text in the Core Rulebook. |
| Decision authority | Project owner |
| Resolution | |

## V-P5-01 — Emplacement point pool of a newly designed stock frame

| Field | Content |
|---|---|
| Rules domain | Custom starship construction |
| Feature | Emplacement point pool of a newly designed stock frame |
| Source | *Starships of the Galaxy*, Stock Ships (printed pp. 53-54) |
| Evidence | Each stock frame row lists an "Emplacement Points" figure (e.g. superiority fighter 5, frigate 50). The text uses that figure only in the rule for worsening a category (gain 10% of it per 25% worsened). |
| Confirmed behavior | Frames and their statistics are published; systems are added with the modification rules. |
| Unresolved question | Whether the frame figure is the pool available for added systems. |
| Options | Stated in the question; neither is a recommendation. |
| Recommended ruling | None |
| Implementation impact | `DEFAULT_CONSTRUCTION_RULES.resolveFrameEpPool` returns unknown; a design cannot add systems until ruled (a bare frame validates). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## EQ-002 — Identical weapons held together in one hand (held-together groups)

| Field | Content |
|---|---|
| Rules domain | Equipment posture / occupancy (modeling blocker) |
| Feature | Holding several identical small weapons (e.g. sticks, as in the existing `heldGroupOf` / `heldTogetherOptions` wielding-size feature) in a single hand |
| Source | Existing project feature in `scripts/items/weapon-runtime/wielding-size.js` and `fire-state-store.js` (`heldGroupOf`, `heldTogetherOptions`); no printed page was located for the underlying rule in this change |
| Evidence | The legacy implementation grouped identical weapons by a stored equipped flag and an `isOffhand` marker. The clean-break occupancy model (E3-A2) assigns each weapon its own appendage ids and has no representation of several weapons sharing one appendage |
| Confirmed behavior | None for the clean-break model. The legacy grouping depended on retired fields (equipped booleans, `isOffhand`) that WP5 forbids as authorities |
| Unresolved question | Whether and how several identical weapons may share one appendage, and how that is recorded in `system.weaponOccupancy` (a data-shape decision with rules content: group size, which member is the attacking weapon, and the per-member posture) |
| Options | None supported by a located source |
| Recommended ruling | None |
| Implementation impact | WP5 fails closed: `heldGroupOf` treats only the primary weapon as held and returns `member-not-equipped` for others; `heldTogetherOptions` offers no candidates. No grouped-hold bonus or penalty is computed from any inferred group. Held-together tests assert this documented fail-closed behavior |
## V-P5-02 — Starship Designer design time rounding

| Field | Content |
|---|---|
| Rules domain | Custom starship construction |
| Feature | Starship Designer design time rounding |
| Source | *Starships of the Galaxy*, feat "Starship Designer" |
| Evidence | Minimum 30 days and DC 25, adding 1 to the DC and 1 day for every additional 100,000 credits of final cost beyond the first 100,000. |
| Confirmed behavior | The 30-day/DC 25 base and the 100,000-credit step. |
| Unresolved question | Whether "every additional 100,000" counts full or started increments. |
| Options | Stated in the question; neither is a recommendation. |
| Recommended ruling | None |
| Implementation impact | `designTime` requires the rounding from the rules seam; without it the result is `DESIGN_TIME_ROUNDING_UNRULED`. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## EQ-003 — Weapons with no established hand-wielding class cannot be READIED (worn weapons, vehicle-scale weapons)

| Field | Content |
|---|---|
| Rules domain | Equipment posture / grip (modeling blocker) |
| Feature | Worn weapons (Combat Gloves, Shockboxing Gloves, Stunning Gauntlet, wrist weapons) and weapons whose canonical size gives no hand-wielding class for the wielder (e.g. Tactical Tractor Beam) |
| Source | Canonical weapon registry (`data/weapons/canonical-weapon-registry.json`) declarations for the named identities; no printed page was located that states how these are held, readied or kept "in hand" |
| Evidence | The grip resolver (E3-A3) leaves these weapons `indeterminate` (`worn-weapon-configuration-uncertified`, or no size classification), so the effective-posture resolver (E3-A5) never establishes READIED. The legacy boolean treated them as simply "equipped" |
| Confirmed behavior | Worn / unclassified weapons are never verified READIED. Mounted / worn certification was deferred by the project owner |
| Unresolved question | How a worn weapon or a weapon without a wielding class becomes ready (and therefore which rules keyed to a "wielded" weapon apply to it): categorical disarm protection of gloves and gauntlets, control maintenance for the tractor beam, reaction and effect eligibility |
| Options | None supported by a located source |
| Recommended ruling | None |
| Implementation impact | WP5 fails closed: such weapons are not ready, so effects with `application: 'equipped'`, reactions, weapon-control maintenance and disarm-protection checks keyed to a ready weapon do not apply to them. The declarations themselves (e.g. `cannotBeDisarmed`) are unchanged data. Tests assert the fail-closed behavior |
## V-P5-03 — Non-starship vehicles

| Field | Content |
|---|---|
| Rules domain | Vehicle modification and construction |
| Feature | Non-starship vehicles |
| Source | Searched all 14 sourcebook texts |
| Evidence | The modification chapter is for starships (cost modifiers start at Huge). One weapon (the discord missile launcher, *Threats of the Galaxy*) may be installed on "any vehicle or starship of Huge size or larger". No procedure for walkers, tanks or speeders was found. |
| Confirmed behavior | Starship modification and construction rules. |
| Unresolved question | Whether ground/air vehicles are supported at all, and if so only as GM homebrew. |
| Options | Stated in the question; neither is a recommendation. |
| Recommended ruling | None |
| Implementation impact | Hulls without a published cost modifier are refused (`HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER`). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## EQ-002 — Addendum 1 (2026-10-19, E4-C1 WP5-C1): source verification and reclassification

Append-only. The original EQ-002 entry above is unchanged.

| Field | Content |
|---|---|
| Published mechanic | `SOURCE_VERIFIED` — *Galaxy at War*, printed p. 36 (Darkstick): a character proficient with darksticks may hold several in one hand; the group counts as one weapon dealing 2d8 instead of 1d6; more than two add no damage. (Verified from the supplied sourcebook text extraction, not from a rendered PDF page.) |
| Implemented behavior | Not certified. No group is honoured |
| Model / design | Unresolved. The gap is a technical representation, not an absent printed rule |
| Temporary handling | Fail-closed remains in effect: `heldGroupOf` / `heldTogetherOptions` honour no group; the grouped profile is unselectable |
| Required model properties (not an approved schema) | A source-governed composite wielding group: explicit member Item identities; explicit chosen appendage and grouping; eligibility limited by canonical published equipment identity and proficiency; one effective weapon/attack source for the qualifying group; group-aware occupancy verification instead of arbitrary appendage sharing; no duplicate attack generation or damage/effect stacking; correct behavior when a member is dropped, thrown, transferred or removed. Not every collection of identical weapons may share a hand |
| Future acceptance tests | Required: `data/audits/equipment-acceptance-debt.json` item `EQ-002/darkstick-group` |
| Status | `SOURCE_VERIFIED` (mechanic) / `DEFERRED_RULES_REVIEW` → model certification pending |

## EQ-003 — Addendum 1 (2026-10-19, E4-C1 WP5-C1): source reconciliation

Append-only. The original EQ-003 entry above is unchanged. EQ-003 covers distinct published mechanisms, not one universal exemption.

| Item | Source (printed page) | Established behavior |
|---|---|---|
| Combat Gloves | *Saga Edition Core Rulebook* p. 121 | Worn; +1 damage on successful unarmed attacks; cannot be disarmed or dropped |
| Stunning Gauntlet | *Knights of the Old Republic Campaign Guide* p. 202 | Worn; converts the wearer's unarmed melee attacks to stun damage and adds +1 stun damage; cannot be disarmed or dropped |
| Tactical Tractor Beam | *Galaxy at War* p. 42 | May be mounted on a large droid or vehicle, or operated from a tripod (treated one size smaller for wielding; a Medium character operates that configuration with two hands); requires a power generator; normally a second adjacent crewman spends a standard action regulating power, otherwise attacks take -2 |

All three are `SOURCE_VERIFIED` from the supplied sourcebook text extractions (not rendered PDF pages). Implemented behavior: not certified. Model: unresolved. The earlier wording "no printed page was located" is superseded by this addendum for these three identities only.

**Required model distinctions (not an approved schema):** (1) ordinary handheld weapon posture; (2) verified worn equipment modifying an unarmed attack; (3) verified host-mounted equipment; (4) verified tripod-operated equipment; (5) source-specific operator, power and crew requirements. Worn-weapon protection must come from certified worn equipment state, not from the Item occupying an ordinary weapon grip. Tripod operation must evaluate its published effective-size and two-hand requirement, never receive unconditional ready status. Vehicle/droid mounting must rely on a separately established host/mount authority.

**Temporary handling (remains):** worn weapons are never READIED (no worn-equipment state is certified), so attacks, reactions and disarm/drop protection keyed to a ready weapon do not apply to them. The Tactical Tractor Beam is verified READIED only in its tripod configuration (owned `mounted` state, two hands, via the existing grip resolver); host-mounted operation, the generator and crew regulation are not certified. The fail-closed tests are temporary safety expectations, not assertions that the published mechanics are invalid. **Future acceptance tests (required):** `data/audits/equipment-acceptance-debt.json` items `EQ-003/combat-gloves`, `EQ-003/stunning-gauntlet`, `EQ-003/tactical-tractor-beam`.

## EQ-004 — Operator authorization and crew eligibility for vehicle-mounted weapon attacks

| Field | Content |
|---|---|
| Rules domain | Vehicle / starship weapon attacks (operator and crew authorization) |
| Feature | Whether a weapon owned by a vehicle may be fired by an actor that is not assigned to a crew station that operates it, and what evidence of installation, station assignment or crew eligibility the attack boundary must require |
| Source | Not located for this question by this checkpoint. The existing project authority is the attack-domain router (`attack-domain-router.js`) and `resolveVehicleAttackBonus`, which require a vehicle-type actor and a non-vehicle gunner actor; the crew-assignment services (`vehicle-crew-assignment-service.js`, `vehicle-weapon-station-service.js`) store station assignments and operator-station mappings but are not consulted at attack execution |
| Evidence | The WP5-C1 attack gate treated "a vehicle-type actor owns this very Item and the router accepted a vehicle domain" as a verified installation. That proves routing and ownership only. It does not prove physical installation, that the firing actor is assigned to the weapon's station, or crew eligibility |
| Confirmed behavior | Existing legitimate vehicle attacks route to the vehicle domain and are not subject to hand occupancy. Combat math for the gunner path already refuses a vehicle or missing actor as the gunner |
| Unresolved question | Whether firing a vehicle weapon requires the firing actor to be assigned to the weapon's operator station (or otherwise authorized), and which stored evidence establishes that. Requiring it would change which actors may attack; not requiring it permits any actor named as the gunner to fire |
| Options | None supported by a located source |
| Recommended ruling | None |
| Implementation impact | WP5-C2 relabels the attack-gate result `vehicle-routed-weapon` with `certification: 'routing-only'`, requires the exact vehicle-owned Item (identity), a distinct non-vehicle gunner (or the vehicle itself for the explicit abstract-crew path), and adds no mount, installation or operator flag. Station-assignment or crew-eligibility enforcement is NOT implemented and is not claimed. Vehicle mounted/worn equipment certification (EQ-003) remains open |
## V-P5-04 — Derived statistics that depend on crew quality

| Field | Content |
|---|---|
| Rules domain | Custom starship construction |
| Feature | Derived statistics that depend on crew quality |
| Source | Core Rulebook "Crew Quality" sidebar (printed p. 174) |
| Evidence | The sidebar text is not present in the OCR. *Starships of the Galaxy* says to determine Initiative, Perception, base attack, grapple, attacks, damage threshold and fighting space with the Core rules after choosing a crew quality, and gives no formula for Challenge Level. |
| Confirmed behavior | Reflex Defense, Fortitude Defense and damage threshold formulas (verified against the printed X-wing and 390 other records). |
| Unresolved question | Source gap, not a ruling: the crew-quality values must be read from the PDF. |
| Options | Stated in the question; neither is a recommendation. |
| Recommended ruling | None |
| Implementation impact | `previewFrame` lists these statistics under `pending` and derives none of them. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## Source examination log (2026-10-30)

Appended; no earlier entry was changed. Full evidence: `docs/audits/vehicles/universal-vehicle-p2-p5-rules-certification.md`. Pages are table-of-contents section ranges from the OCR text; the PDF is final authority.

| ID | Examination result | Status after examination |
|---|---|---|
| V-P2-01 | Spendable EP = *unused* emplacement points (*Starships of the Galaxy* p. 39: stock designs generally 1, Corellian Engineering Corporation 5, Table 3-2 lists 15 designs). Records state a figure for only 3 hulls plus 3 KotOR statblock lines whose meaning the text does not give. Install beyond unused EP is permitted with published penalties (p. 38). | Source answers the formula; the default for hulls with no stated figure and the shortfall policy remain `DEFERRED_RULES_REVIEW` (Q1, Q2). One Table 3-2 cell (J-Type transports) needs the PDF. |
| V-P2-02 | 187 catalog rows compared with the SotG movement/defense tables: 48 text-verified, 7 noisy, 1 differing (`armor-4`), 5 not in SotG tables, 126 in unparseable tables. Cost modifiers (Table 3-1) and the base/flat cost rule are published. | `PENDING_SOURCE_VERIFICATION` for 139 rows (PDF); certification threshold is Q3. |
| V-P2-03 | Install time, Mechanics DC, work force, failure outcomes, removal (half time, free) are published (pp. 38-40). Resale is conditional on a buyer. Effects are prose per system. | Procedure answered; resale policy and workflow automation `DEFERRED_RULES_REVIEW` (Q4, Q5); effects are an implementation backlog. |
| V-P2-04 | Damage/EP/availability/cost of installed weapons published; operator = pilot/copilot or a gunner (Core). No published firing-arc rule for installed weapons found in any searched book. | `DEFERRED_RULES_REVIEW` (Q6): the arc gate is a project policy. |
| V-P4-01 | Size modifier applies to occupants' Initiative and Pilot checks; vehicle Initiative uses the pilot's modifier; crew modifiers are already in statblock statistics (Core). Whether the printed value already includes size is not stated. The code's size table omits the Colossal subtypes (Table 10-1 prints -10 for each). | `DEFERRED_RULES_REVIEW` (Q7). |

## Source examination log, revision 6 (2026-10-30, PDF review and owner direction)

Appended. Records the project owner's PDF readings (`data/audits/vehicles/swse-p2-pdf-review.json`) and directions given in conversation on 2026-10-30. Earlier entries are unchanged; the originals above remain the record of the questions.

| ID | Addition |
|---|---|
| V-P2-01 | Owner direction: a standard stock design generally has 1 unused EP (exceptions apply); installs beyond the unused EP are permitted with the printed penalties. J-Type transports = 2 (Table 3-2, p. 39, PDF). Still open: the three KotOR statblock EP lines; the unmapped Table 3-2 names. |
| V-P2-02 | 8 movement/defense cells read from the PDF (Tables 3-3 p. 41, 3-4 p. 43); `armor-4` size restriction corrected to Colossal (cruiser) or larger. Weapon and accessory tables not yet PDF-reviewed. |
| V-P2-03 | Owner direction: implement the published installation and removal mechanics, and distinguish resale eligibility from a guaranteed refund. Implemented; the resale amount and whether play enforces the job procedure remain open. |
| V-P4-01 | Owner direction: do not double-apply crew or size modifiers. Evidence: Initiative = Dex modifier + size modifier + crew check modifier fits 343 of 375 published vehicles. Source-backed vehicles no longer receive the extra size modifier. |
| V-P5-01 | Owner direction: distinguish a frame's printed stock EP allocation from the unused EP of a constructed ship; a new design's spendable pool is the unused EP (general rule). |
| V-P5-04 | Closed: Core Rulebook p. 174 Crew Quality table read from the PDF. |

## Shipyard modification effects (2026-10-31)

Appended. Owner authorization: implement unambiguous published effects first (movement/defense); defer ambiguity. 39 of 56 certified rows now have implemented effects (armor x4, shields x19, maneuvering jets x3, hyperdrives x11, atmospheric thrusters x2). The rest stay `SOURCE_VERIFIED` and cannot be installed.

### V-P6-01 - Reinforced Bulkheads +10% / +20% / +30%

| Field | Value |
|---|---|
| Decision ID | V-P6-01 |
| Rules domain | Vehicle modifications |
| Feature | Reinforced Bulkheads +10% / +20% / +30% |
| Source | *Starships of the Galaxy*, Armor / Shields / Movement Systems sections and Tables 3-3 (p. 41) and 3-4 (p. 43) |
| Evidence | Prints that the improvement increases the starship's hit points by 10%, 20% or 30%, and that these improvements do not stack. |
| Confirmed behavior | A percentage increase; the three improvements do not stack with each other. |
| Unresolved question | How the increased hit-point total is rounded; the printed text does not say. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | `reinforced-bulkheads-10/20/30` stay SOURCE_VERIFIED and uninstallable. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## D-016 — Armor Reinforcement: matching "DR 2 versus piercing" to incoming damage

| Field | Content |
|---|---|
| Rules domain | Modification effects (armor accessory) / damage mitigation |
| Feature | Armor Reinforcement (`kotor-accessory-armor-reinforcement::armor`) |
| Source | *Knights of the Old Republic Campaign Guide* printed page 75 (Table 5-6, Weapon and Armor Accessories), as certified in the runtime catalog (`EFFECTS_CERTIFIED`; summary "Wearer DR 2 versus piercing") |
| Evidence | The certified effect is a grant of damage reduction 2 against the piercing damage type to the wearer |
| Confirmed behavior | DR 2 applies to piercing damage dealt to the wearer of armor carrying the accessory |
| Unresolved question | The damage pipeline cannot tell piercing damage apart: `normalizeDamageTypeKey` maps `piercing` (and `slashing`, `bludgeoning`) to `kinetic`, and the canonical weapon records carry `damageType` values `energy`, `kinetic`, `stun`, `sonic` and `fire` only; "piercing" appears only in description prose (for example the vibrolance, "piercing or slashing"). Wiring the grant through the existing typed-resistance stage would therefore reduce all kinetic damage, which is broader than the printed rule. Classifying weapons as piercing (and deciding how a "piercing or slashing" weapon is treated on a given attack) would be new rules data. Separately, the project's D4 decision routes typed applies-to DR to the typed-resistance stage (highest-only per type); whether a "DR versus a type" grant belongs there or in the DR resolver is part of the same question |
| Options | (a) Add a source-backed piercing/slashing/bludgeoning classification to weapon records and match on it. (b) Treat the grant as kinetic (broader than printed; not source-supported). No option is recommended |
| Recommended ruling | None |
| Implementation impact | Armor Reinforcement is NOT in the development set; it stays blocked in the workbench and contributes no mitigation. No weapon data or damage-type aliases were changed |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `DEFERRED_RULES_REVIEW` — The printed effect is clear; the open point is how the system decides that damage is piercing, which needs new rules data or an owner ruling |
| Decision authority | Project owner |
| Resolution | |
| Source examination log | 2026-10-28: project owner's independent review (PR #1086 comment) visually checked *Saga Edition Core Rulebook* printed p. 120, Weapon Qualities, Damage Type: "and" means both damage types at once; "or" means the wielder chooses one immediately before the attack roll; a double weapon can have a different type per end. *KotOR Campaign Guide* p. 75: Armor Reinforcement grants DR 2 against piercing damage; p. 72, Mixed Damage Types: one of several simultaneously dealt types can trigger a type-dependent ability |
| Direction (owner, 2026-10-28) | Do not broaden piercing to kinetic. Add source-backed physical damage subtype evidence (piercing / slashing / bludgeoning) to appropriate canonical weapon attack profiles, starting with one or two documented weapons; keep "and" versus "or" with the attack-time choice; thread the selected type through the damage-mitigation authority and apply DR 2 only when the selected or simultaneous types include piercing. Armor Reinforcement stays blocked until type evidence flows from attack to damage |
| Implementation (2026-10-28) | No weapon data added: the canonical weapon registry already carries source-backed subtypes on attack profiles (`damageType.mode` single / and / or with `types`), e.g. slugthrower pistol piercing, bowcaster energy and piercing, vibroblade slashing or piercing. `rollDamage` records the subtypes the selected form deals (`physicalDamageTypesOf`: single = its type, and = all, or = only the chosen type; an unrecorded "or" choice assumes none) in the workflow context, which survives the chat card to the apply step. The mitigation authority matches Armor Reinforcement's grant only against those recorded subtypes, in the applies-to (typed resistance) stage where project decision D4 places typed applies-to DR (highest-only there); kinetic is never broadened. Armor Reinforcement joins the GM development set. Tests: `tests/d016-physical-damage-type-flow.test.mjs` |
| Owner ruling (2026-10-28, PR #1086 comment) | Source-backed: *Saga Edition Core Rulebook* printed p. 158, Damage Reduction -- with several DR values a character uses the applicable one that most benefits it (by damage type); *KotOR* p. 75 grants Armor Reinforcement DR 2 **against** piercing (applies only to piercing; not "DR 2/piercing", which piercing bypasses). Armor Reinforcement therefore competes with generic and qualified DR in one highest-applicable selection per damage event (bypass and exceptions respected) and is never subtracted on top of another DR. This narrow correction supersedes the earlier implementation row's placement in the D4 typed-resistance stage for this source only; genuine typed resistances keep stacking with DR as before |
| Implementation (2026-10-28, ruling applied) | `DamageReductionResolver.getEventDamageReductionEntries` adds the worn armor's "against <type>" entries the event qualifies for (recorded physical types) to the single-total highest-only DR selection; the per-component path adds the same candidates to its one-per-event selection, reaching only kinetic-bearing, non-bypass-tagged components. The typed-resistance stage no longer sees them. Tests: `tests/d016-physical-damage-type-flow.test.mjs` (generic DR 5 + AR -> 5; DR 1 + AR -> 2; AR alone -> 2; slashing -> 0; or-selected piercing -> 2; DR 5/energy beats 2; DR 5/kinetic bypassed leaves 2; bypass-dr -> 0; multi-component 2 / 5) |

## D-017 — Mesh Underlay and the Nerve Reinforcement Implant: stacking against stun

| Field | Content |
|---|---|
| Rules domain | Modification effects (armor accessory) / damage threshold / bonus stacking |
| Feature | Mesh Underlay (`kotor-accessory-mesh-underlay::armor`) together with the Nerve Reinforcement Implant |
| Source | *Knights of the Old Republic Campaign Guide* printed page 76 (Mesh Underlay, Table 5-6 on page 75; certified in the runtime catalog as "+5 equipment bonus to wearer damage threshold against stun damage"). Nerve Reinforcement Implant: *Knights of the Old Republic Campaign Guide*, page not recorded in the repository records (`packs/equipment*.db` have `page: null`); the system implements it as an untyped "+5 damage threshold against stun damage" (`ImplantEffectRules`) |
| Evidence | Mesh Underlay's bonus is typed (equipment). The implant's bonus type is not recorded in the repository |
| Confirmed behavior | Mesh Underlay alone: +5 equipment bonus to the wearer's damage threshold against stun damage (implemented under the GM development workflow; worn armor only; equipment bonuses do not stack with each other) |
| Unresolved question | Whether the two bonuses stack. That depends on the implant's published bonus type, which has not been verified against the page |
| Options | If the implant's bonus is untyped or of another type, they stack (+10). If it is an equipment bonus, only the higher applies (+5). Requires source verification of the implant's printed text |
| Recommended ruling | None |
| Implementation impact | With both active, `ThresholdEngine.getDamageThreshold` applies only the implant (the pre-existing behavior) and the breakdown names this entry. Mesh Underlay alone applies normally |
| Status | `PENDING_SOURCE_VERIFICATION` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Read the Nerve Reinforcement Implant entry in the KotOR Campaign Guide and record its bonus type verbatim, with printed page. Becomes `DEFERRED_RULES_REVIEW` only if the text is ambiguous |
| Decision authority | Project owner |
| Resolution | |
| Source examination log | 2026-10-28: project owner's independent review (PR #1086 comment, RICR review of `9885fba`) visually checked the uploaded *Knights of the Old Republic Campaign Guide* printed pp. 75-76. Nerve Reinforcement Implant (p. 75): **+5 equipment bonus** to Damage Threshold against stun damage. Mesh Underlay (p. 76): **+5 equipment bonus** to the same statistic against stun damage while the armor is worn |
| Resolution (source) | Same bonus type: the normal non-stacking rule for bonuses of one type applies, so together they give +5, not +10. No owner rule or house rule was needed. Implemented in `ThresholdEngine.getDamageThreshold` (highest stun equipment bonus; the breakdown names the one that does not stack) and threaded into `evaluateThreshold` through `eventThresholdBonus`, so the damage resolver adjudicates the threshold with the same value it reports |

## D-018 — Tremor Cell: the stun setting it adds

| Field | Content |
|---|---|
| Rules domain | Modification effects (weapon accessory) / stun setting |
| Feature | Tremor Cell (`kotor-accessory-tremor-cell::weapon`) |
| Source | *Knights of the Old Republic Campaign Guide* printed page 76 (Table 5-6 on page 75), as certified in the runtime catalog (`EFFECTS_CERTIFIED`; "Adds swift-action stun setting dealing normal weapon damage as stun") |
| Evidence | Certified operation `weapon.capabilities.stunSetting` action-grant `{ action: swift, damage_dice: equal_normal, effect: stun }` |
| Confirmed behavior | The weapon gains a stun setting; switching to it is a swift action; it deals the weapon's normal damage dice as stun damage |
| Unresolved question | (1) Whether the standard stun-setting range limit that the canonical registry records for ranged weapons (6 squares) applies to a stun setting added by the cell. (2) What happens on a host that already has a stun setting with its own stun dice (e.g. a blaster pistol, 2d6 stun versus 3d6 normal): does the cell's "normal weapon damage as stun" replace it, and does its swift switch replace the host's switch cost? (3) Whether switching back from stun also costs an action (the existing persistent-setting model charges only the switch to stun). The certified data does not say; the page was not re-examined for this entry |
| Options | None recorded from source text yet. The existing runtime can express a persistent stun setting with a swift switch (as for Shockboxing Gloves) once (1)-(3) are settled |
| Recommended ruling | None |
| Implementation impact | Tremor Cell is NOT in the GM development set and is not automated; it stays listed as blocked in the workbench. No weapon stun data was changed |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `DEFERRED_RULES_REVIEW` — the printed effect is clear on the switch cost and damage; its interaction with the Core stun-setting rules and with hosts that already have one needs a ruling or the page's exact text |
| Decision authority | Project owner |
| Resolution | |

### V-P6-02 - Shield / hyperdrive / sublight drive on a hull that already has one

| Field | Value |
|---|---|
| Decision ID | V-P6-02 |
| Rules domain | Vehicle modifications |
| Feature | Shield / hyperdrive / sublight drive on a hull that already has one |
| Source | *Starships of the Galaxy*, Armor / Shields / Movement Systems sections and Tables 3-3 (p. 41) and 3-4 (p. 43) |
| Evidence | The tables list shields, hyperdrives and sublight drives as systems with a rating, class or speed; the Shields text calls shields a popular addition for ships that lack them. |
| Confirmed behavior | Installing shields on a hull printed with SR 0, or a hyperdrive on a hull printed without one, sets that value. |
| Unresolved question | Whether a new shield generator, hyperdrive or sublight drive replaces, adds to, or is capped by the hull's printed system; and, for sublight drives, the 'only military vessels' restriction. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Planner denies with SHIELD_REPLACEMENT_OR_ADDITION_UNRULED / HYPERDRIVE_REPLACEMENT_UNRULED; `sublight-drive-*` stay SOURCE_VERIFIED. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6-03 - Stacking of two systems of the same kind (armor, maneuvering jets, shields, hyperdrive, atmospheric thrusters)

| Field | Value |
|---|---|
| Decision ID | V-P6-03 |
| Rules domain | Vehicle modifications |
| Feature | Stacking of two systems of the same kind (armor, maneuvering jets, shields, hyperdrive, atmospheric thrusters) |
| Source | *Starships of the Galaxy*, Armor / Shields / Movement Systems sections and Tables 3-3 (p. 41) and 3-4 (p. 43); Core Rulebook equipment-bonus wording |
| Evidence | Bulkhead improvements are stated not to stack; no stacking text was found for armor, jets or atmospheric thrusters. |
| Confirmed behavior | Each system's own bonus when it is the only one of its kind. |
| Unresolved question | Whether and how two equipment bonuses of the same kind combine on one starship. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Planner denies a second system of the same effect group (EFFECT_STACKING_UNRULED). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6-04 - Starship Armor versus the pilot character-level substitution

| Field | Value |
|---|---|
| Decision ID | V-P6-04 |
| Rules domain | Vehicle modifications |
| Feature | Starship Armor versus the pilot character-level substitution |
| Source | *Starships of the Galaxy*, Armor / Shields / Movement Systems sections and Tables 3-3 (p. 41) and 3-4 (p. 43), Armor |
| Evidence | Armor is bought as an equipment bonus to the armor the ship adds to Reflex Defense; skilled pilots may use their character level in place of the ship's armor bonus. |
| Confirmed behavior | The equipment bonus adds to the ship's armor bonus; the static Reflex Defense shown includes it. |
| Unresolved question | Whether the equipment bonus still applies when a pilot substitutes character level for the ship's armor bonus. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | The sheet shows the static ship-armor-bonus basis only; no per-pilot substitution is applied. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6-05 - Effects needing roll or action integration (Jamming Suite/Array, Regenerating Shields, Combat Thrusters, Navicomputers, SLAM)

| Field | Value |
|---|---|
| Decision ID | V-P6-05 |
| Rules domain | Vehicle modifications |
| Feature | Effects needing roll or action integration (Jamming Suite/Array, Regenerating Shields, Combat Thrusters, Navicomputers, SLAM) |
| Source | *Starships of the Galaxy*, Armor / Shields / Movement Systems sections and Tables 3-3 (p. 41) and 3-4 (p. 43) |
| Evidence | The effects are bonuses or penalties to checks or actions rather than statistics. |
| Confirmed behavior | The printed bonuses and penalties. |
| Unresolved question | No rules question: engineering scope. The rows are not marked MECHANIC_SPECIFIED until roll/action integration exists. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Rows stay SOURCE_VERIFIED. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6-06 - Failed Starship Designer design check

| Field | Value |
|---|---|
| Decision ID | V-P6-06 |
| Rules domain | Vehicle construction |
| Feature | Starship Designer (designing a starship from scratch) |
| Source | *Starships of the Galaxy*, Starship Designer feat; Stock Ships section |
| Evidence | Designing takes a minimum of 30 days and a DC 25 Mechanics check, +1 DC and +1 day per additional 100,000 credits beyond the first 100,000; others may aid the check. The custom-modification paragraph gives a failure rule (half again time and money, +2) for custom modifications only. The Stock Ships section says a designer normally needs the aid of a shipyard to build the ship. |
| Confirmed behavior | Design time and design DC; aid another applies. |
| Unresolved question | What happens when the design Mechanics check fails (retry cost/time, bonus, or loss), and whether any build time follows the design time. |
| Options | None supported by the sources searched (the custom-modification failure rule is a different activity). |
| Recommended ruling | None |
| Implementation impact | A failed design check sets the project to CHECK_FAILED; no retry is automated; only a recorded GM adjudication delivers the ship. No build time beyond the design time is applied. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

Owner direction recorded 2026-10-31 (not a rules question): construction credits are charged when the GM approves and funds the project; approval does not complete construction.

## P6A component census (2026-10-31)

Appended. Evidence: `data/audits/vehicles/p6a/`.

### V-P6A-01 - Triple cannons

| Field | Value |
|---|---|
| Decision ID | V-P6A-01 |
| Rules domain | Vehicle weapons |
| Feature | Triple cannons |
| Source | *Starships of the Galaxy*, Weapon Systems, Cannon, Double/Quad |
| Evidence | Triple cannons are 'functionally identical to double cannons, using three cannons (with slightly less power individually)'. |
| Confirmed behavior | Same game statistics as a double cannon. |
| Unresolved question | Whether a triple cannon also uses the double cannon's cost multiplier and EP, or is only a description of an existing double cannon. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Recorded as an alias of `cannon-double`; no separate catalog row. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6A-02 - Armor-piercing concussion missiles

| Field | Value |
|---|---|
| Decision ID | V-P6A-02 |
| Rules domain | Vehicle weapons |
| Feature | Armor-piercing concussion missiles |
| Source | *Starships of the Galaxy*, Concussion Missiles |
| Evidence | Penetration 10 and -5 to attack; no cost, availability or EP printed. |
| Confirmed behavior | The effect. |
| Unresolved question | Price, availability and whether the variant is bought per missile. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Recorded as MISSING_FROM_CATALOG; not added. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6A-03 - Launcher capacity expansions

| Field | Value |
|---|---|
| Decision ID | V-P6A-03 |
| Rules domain | Vehicle weapons |
| Feature | Launcher capacity expansions |
| Source | *Starships of the Galaxy* (concussion, proton, shieldbuster, mines); *Galaxy at War* (chaff gun) |
| Evidence | Each additional missile/torpedo/mine/canister raises the launcher cost by 20% or 25% up to a maximum. |
| Confirmed behavior | Cost increase and maximum. |
| Unresolved question | Whether added capacity changes EP, and whether the percentage applies to the base or the size-modified launcher cost. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Recorded as MISSING_FROM_CATALOG; not added. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6A-04 - Galaxy at War weapons without availability

| Field | Value |
|---|---|
| Decision ID | V-P6A-04 |
| Rules domain | Vehicle weapons |
| Feature | Galaxy at War weapons without availability |
| Source | *Galaxy at War*, Vehicle and Starship Weapons |
| Evidence | The table prints Damage, Emplacement Points and Cost only; the text says a GM can add these weapons without the SotG system. |
| Confirmed behavior | EP and cost. |
| Unresolved question | What availability applies (the catalog had Common/Illegal with no source; now unknown). |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Availability set to unknown; the planner reports AVAILABILITY_UNKNOWN. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## P6A PDF source authority (2026-11-01)

Appended. Evidence: `data/audits/vehicles/p6a/print-verified-components-v2.json` (independent PDF review) and `pdf-reconciliation.json`.

### V-P6A-05 - Unusual printed accessory prices (stygium cloaking device, hangar bay, concealed hangar bay)

| Field | Value |
|---|---|
| Decision ID | V-P6A-05 |
| Rules domain | Vehicle modifications |
| Feature | Unusual printed accessory prices (stygium cloaking device, hangar bay, concealed hangar bay) |
| Source | *Starships of the Galaxy*, Table 3-7 Starship Accessories, p. 49 |
| Evidence | Printed: cloaking device (stygium) 100,000,000 credits base; hangar bay 10 credits base; concealed hangar bay 1,000 credits base. The catalog has 100,000 / 10,000 / 100,000. |
| Confirmed behavior | The printed cells (PDF visual review). |
| Unresolved question | Whether to adopt the printed values as published or treat them as misprints awaiting errata (no errata source is in the repository). |
| Options | (a) adopt the printed value; (b) keep the current catalog value pending published errata. Both are source-related; no recommendation. |
| Recommended ruling | None |
| Implementation impact | Reconciliation marks them ERRATA_CHECK_REQUIRED; catalog values unchanged; rows are not source-verified. |
| Status | `RESOLVED` |
| Decision authority | Project owner |
| Resolution | Owner ruling 2026-11-01: adopt the printed prices (100,000,000 / 10 / 1,000 credits base) as published rules as written; previous catalog values kept in legacy.p6a and p6aHistory. Implemented in the P6A errata checkpoint (data/audits/vehicles/p6a/owner-rulings.json). |

### V-P6A-06 - Emplacement-point accounting for ammunition printed with a dash

| Field | Value |
|---|---|
| Decision ID | V-P6A-06 |
| Rules domain | Vehicle modifications |
| Feature | Ion bomb; gravity mines (standard, magnetic); glowing defoliator shell |
| Source | *Starships of the Galaxy* Table 3-5 p. 47; *Legacy Era Campaign Guide* gravity-mine sidebar p. 191; *Galaxy at War* Table 2-7 p. 67 |
| Evidence | These rows print a dash in the Emplacement Points column, while missiles, torpedoes and space mines print 0. |
| Confirmed behavior | A dash is not a printed zero. |
| Unresolved question | Whether dash-EP ammunition consumes no emplacement points (like printed-0 ammunition) or is not separately installable. |
| Options | None supported by the sources searched. |
| Recommended ruling | None |
| Implementation impact | Catalog EP is null (unknown); the planner refuses them with EP_COST_UNKNOWN. |
| Status | `RESOLVED` |
| Decision authority | Project owner |
| Resolution | Owner ruling 2026-11-01: a printed dash is not numeric zero; dash-EP ammunition is consumable ammunition loaded into a compatible launcher, not an installed modification. Catalog: installationKind consumable-ammunition, EP null; planner refuses with CONSUMABLE_AMMUNITION_NOT_AN_INSTALLATION. Launcher compatibility, loading and firing remain gated. |

### V-P6A-07 - Scope of the gravity well area errata

| Field | Value |
|---|---|
| Decision ID | V-P6A-07 |
| Rules domain | Vehicle weapons |
| Feature | Gravity well projector area |
| Source | *Starships of the Galaxy* p. 45 (Gravity Well Projectors prose: 4x4-square area); p. 100 (Interdictor cruiser); Errata 1.0 (2008-01-29) |
| Evidence | The errata correct the Interdictor cruiser's area to 3x3 squares (starship scale). The generic component prose on p. 45 says 4x4. |
| Confirmed behavior | The Interdictor cruiser (p. 100) uses 3x3. |
| Unresolved question | Whether the correction also applies to the gravity well projector component (catalog row `gravity-well-projector`) or only to the Interdictor statblock. |
| Options | (a) Interdictor only (component keeps 4x4); (b) all gravity well projectors use 3x3. |
| Recommended ruling | None |
| Implementation impact | Catalog component text unchanged (4x4); the Interdictor publication-record change is recorded as a proposal, not applied. The component is not installable and not executable either way. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## P6A open vehicle rulings - blocker classification (2026-11-01)

Appended; the entries above are unchanged. Blocker: SOURCE = published evidence missing; AMBIGUITY = the printed rule admits more than one reading; ENGINEERING = rule is clear, implementation incomplete (not a rules question).

| ID | Topic | Blocker | Fail-closed behavior |
|---|---|---|---|
| V-P6-01 | Reinforced bulkheads HP rounding | AMBIGUITY | rows not installable |
| V-P6-02 | Replacing an existing shield/hyperdrive/sublight drive | AMBIGUITY | planner denies replacement |
| V-P6-03 | Stacking same-kind systems | AMBIGUITY | second system denied |
| V-P6-04 | Armor vs pilot-level substitution | AMBIGUITY | static ship armor basis only |
| V-P6-05 | Roll/action effects (jammers, regenerating shields, combat thrusters, navicomputers, SLAM) | ENGINEERING | rows not installable |
| V-P6-06 | Failed design check | SOURCE | GM adjudication only |
| V-P6A-01 | Triple cannon cost/EP | AMBIGUITY | alias only, no catalog row |
| V-P6A-02 | Armor-piercing concussion missile price | SOURCE | not in catalog |
| V-P6A-03 | Launcher capacity EP and cost basis | SOURCE / AMBIGUITY | not in catalog |
| V-P6A-04 | Galaxy at War weapon availability | SOURCE | availability unknown |
| V-P6A-07 | Gravity well errata scope | AMBIGUITY | generic component keeps 4x4 |
| V-P2-04 | Installed-weapon firing arcs | SOURCE | no executable weapon |

---

## Revision log

- **Revision 2 (2026-10-14):** introduced `PENDING_SOURCE_VERIFICATION` versus `DEFERRED_RULES_REVIEW`; added a *Review classification* row to D-001–D-012. Of the twelve entries, eleven are research gaps awaiting source examination; only D-006 (policy for unpriced modifications) is a decision for the owner today. No decision ID, original field, owner ruling or interim position was changed. No recommended ruling is made for any entry. Source examination is the next step for D-001 first, because it blocks the install procedure.
- **Revision 3 (2026-10-14, G2):** the status ledger (`data/modifications/status-ledger-v1.json`) now links typed domain definitions to register entries (D-001 install procedure for every typed definition; D-004, D-005, D-006, D-010, D-011 for their specific definitions). The generator checks that each linked register id exists and that the declared classification equals this register's classification row. D-002, D-003, D-007, D-008, D-009 and D-012 are not bound to registry definitions and have no ledger link. No ID, field, ruling or classification was changed; no recommended ruling was added. Source examination of D-001 (*Scum and Villainy* p. 39) has not been performed in this change.
- **Revision 4 (2026-10-14, G2 review corrections):** added a machine-readable **Ledger scope** row to D-001, D-004, D-005, D-006, D-010 and D-011 (which component and which typed definitions each open entry blocks). The generator now requires the ledger to carry the full scope of every open entry and rejects any omission. An entry's blocker is lifted only by an appended **Blocker lifted** row (`source=` and `evidence=` for `PENDING_SOURCE_VERIFICATION`; `owner-ruling=` for `DEFERRED_RULES_REVIEW`); no such row exists for any entry, so every scoped blocker is open. Entries without a Ledger scope row (D-002, D-003, D-007, D-008, D-009, D-012) block no registry definition directly. No ID, original field, ruling or classification changed.
- **Revision 5 (2026-10-14, D-001 PDF verification):** D-001 resolved from the printed page 39 image (appended source-examination, **Blocker lifted** and source-resolution rows; no existing row changed). New entries D-013 (installation procedure of the 156 typed definitions the page does not demonstrably govern; `PENDING_SOURCE_VERIFICATION`, ledger scope `ALL` except the 56 governed Scum definitions) and D-014 (points the printed procedure leaves undefined; `DEFERRED_RULES_REVIEW`, no ledger scope). No recommended ruling on any entry. D-003 (equipment size) is untouched.
- **Revision 6 (2026-10-14, PR #1043 review corrections; applied to entries this unmerged PR introduced, plus appended rows):** (a) D-013's base scope is now `ALL` and its 76 governed definitions are released by an appended evidence-bound **Partial lift** row instead of an `except=` list; the generator pins every Ledger scope row by SHA-256, so the scope cannot be altered without a reviewed code change, and a partial lift releases nothing unless it names existing parent definitions inside the scope with `source=` and `evidence=` (and `owner-ruling=` for deferred entries) citing an existing repository file. (b) D-014 now has a Ledger scope on the 76 governed definitions so its unresolved sub-flows are machine-enforced; its former item (5) moved to the new research entry **D-015** (`PENDING_SOURCE_VERIFICATION`, same scope). No recommended ruling on any entry.
- **Revision 4 (2026-10-17, E4-C1 WP3-A):** appended EQ-001 (action cost of changing a drawn weapon between drawn configurations). No existing entry was changed; no recommended ruling was added.
- **Revision 5 (2026-10-19, E4-C1 WP5):** appended EQ-002 (held-together groups of identical weapons are not representable in the occupancy model; fail-closed) and EQ-003 (worn weapons and weapons without a wielding class cannot be READIED; fail-closed). No existing entry was changed; no recommended ruling was added.
- **Revision 6 (2026-10-19, E4-C1 WP5-C1):** appended source-verification addenda to EQ-002 and EQ-003 (published mechanics SOURCE_VERIFIED from sourcebook text extractions; model/implementation unresolved; fail-closed handling unchanged; acceptance debt tracked). EQ-001 untouched. No recommended ruling was added.
- **Revision 7 (2026-10-19, E4-C1 WP5-C2):** appended EQ-004 (operator authorization and crew eligibility for vehicle weapon attacks are not established at the attack boundary; routing-only evidence is reported as such; no enforcement and no flag added). No existing entry was changed; no recommended ruling was added.
- **Revision 8 (2026-10-28, Modification V2 #1086):** appended D-016 (Armor Reinforcement "DR 2 versus piercing" cannot be matched: the pipeline has no piercing classification; blocked) and D-017 (Mesh Underlay with the Nerve Reinforcement Implant: stacking depends on the implant's unverified bonus type; only the implant applies when both are active). No existing entry was changed; no recommended ruling was added.
- **Revision 9 (2026-10-28, #1086 review):** appended to D-017 the owner's source examination (KotOR pp. 75-76: both bonuses are equipment bonuses) and its source resolution (non-stacking); appended to D-016 the owner's source examination (Core p. 120, KotOR pp. 72 and 75) and implementation direction. No existing row changed; no recommended ruling was added.
- **Revision 10 (2026-10-28, #1086):** appended an implementation row to D-016 (subtype recorded at damage-roll time, matched in the D4 applies-to stage; no weapon data or alias changed). No existing row changed; no recommended ruling was added.
- **Revision 11 (2026-10-28, #1086):** appended to D-016 the owner's source-backed stacking ruling (Core p. 158: highest applicable DR; Armor Reinforcement competes, never adds) and its implementation. No existing row changed; no recommended ruling was added.
- **Revision 12 (2026-10-28, #1086):** appended D-018 (Tremor Cell stun setting: range cap, hosts with an existing stun setting, switch-back cost). No existing entry was changed; no recommended ruling was added.

- **Revision 3 (2026-10-29):** appended V-P2-01 to V-P2-04 (vehicle Shipyard EP budget, catalog provenance, refund/effects, mount certification). No existing entry changed.
- **Revision 4 (2026-10-29):** appended V-P4-01 (vehicle size modifier vs printed Initiative). No existing entry changed.
- **Revision 5 (2026-10-30):** appended the source examination log for V-P2-01..04 and V-P4-01 and new entries V-P5-01..04. No existing entry was changed.
- **Revision 6 (2026-10-30):** appended PDF-review results and owner directions for V-P2-01/02/03, V-P4-01, V-P5-01 and V-P5-04. No existing entry was changed.
- **Revision 7 (2026-10-31):** appended V-P6-01..05 (Shipyard modification effects). No existing entry changed.
- **Revision 8 (2026-10-31):** appended V-P6-06 (failed design check) and the owner's construction-funding direction. No existing entry changed.
- **Revision 9 (2026-10-31):** appended V-P6A-01..04 (component census). No existing entry changed.
- **Revision 10 (2026-11-01):** appended V-P6A-05 and V-P6A-06 (PDF source authority). No existing entry changed.
- **Revision 11 (2026-11-01):** recorded the owner's resolutions of V-P6A-05 and V-P6A-06 (status and Resolution fields only; questions unchanged).
- **Revision 12 (2026-11-01):** appended V-P6A-07 (gravity well errata scope). No existing entry changed.
- **Revision 13 (2026-11-01):** appended the P6A blocker classification table. No existing entry changed.

## P6B vehicle rulings (2026-11-02)

Appended; the entries above are unchanged.

### V-P6B-01 - Limited navicomputer: astrogation bonus and third jump

| Field | Value |
|---|---|
| Decision ID | V-P6B-01 |
| Rules domain | Vehicle modifications |
| Feature | Navicomputer, Limited |
| Source | *Starships of the Galaxy*, Movement Systems, Navicomputer (p. 41) |
| Evidence | The limited navicomputer stores only two jumps' worth of information: enough to reach a destination and return. The standard navicomputer grants +5 on Use Computer checks to astrogate; the advanced one +10. |
| Confirmed behavior | Two stored jumps; 0 EP; 500 credits. |
| Unresolved question | Does the limited navicomputer grant the navicomputer's +5 astrogation bonus (always, only for its two stored jumps, or never), and what happens when a third jump is attempted? |
| Options | (a) storage limit only, no astrogation bonus; (b) +5 while astrogating one of its two stored jumps. |
| Recommended ruling | None |
| Implementation impact | `navicomputer-limited` stays SOURCE_VERIFIED and not installable (P6B-D-005). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### Engineering status note for V-P6-05 (not a ruling)

V-P6-05 was engineering scope, not a rules question. P6B-1 delivered the runtime consumers for regenerating shields (recharge shields action restores 10), the SubLight Accelerator Motor (+5/+10 Pilot to increase speed) and the standard/advanced navicomputers (+5/+10 astrogation). Jamming suite/array and combat thrusters remain undelivered (P6B-D-003, P6B-D-004). The V-P6-05 entry above is unchanged.

- **Revision 14 (2026-11-02):** appended V-P6B-01 and the V-P6-05 engineering status note. No existing entry changed.

### V-P6B-02 - Unit conversions for capacity accessories (cargo pods, extended range, smuggler compartments)

| Field | Value |
|---|---|
| Decision ID | V-P6B-02 |
| Rules domain | Vehicle modifications |
| Feature | Cargo Pods; Extended Range; Smuggler Compartments |
| Source | *Starships of the Galaxy*, Accessories (pp. 48-53) |
| Evidence | Cargo pods add (cost modifier) x 1/5/10 tons of cargo. Extended range improves consumables by 10% of the original value, rounded down, minimum 1 day, per installation. Smuggler compartments hold (cost modifier) x 200 kg, and no more than 5% of the original cargo capacity may be hidden. |
| Confirmed behavior | The arithmetic for hulls whose printed cargo is in tons and whose printed consumables are in days. |
| Unresolved question | (1) For hulls printing cargo in kg, may tons and kg be combined at 1 ton = 1,000 kg? (2) For consumables printed in weeks, months or years, is the 10% rounded down in days (and what day length is a month/year) or in the printed unit? |
| Options | (1) combine at 1,000 kg per ton / keep units separate and refuse; (2) convert to days then round down / round in the printed unit with a 1-day minimum. |
| Recommended ruling | None |
| Implementation impact | Planner refuses cargo pods on non-ton hulls (CARGO_UNIT_NOT_TONS) and extended range on non-day hulls (CONSUMABLES_UNIT_CONVERSION_UNRULED); smuggler compartments not installable (P6B-D-010). |
| Status | `RESOLVED_OWNER_RULING` |
| Decision authority | Project owner |
| Resolution | Owner ruling 2026-11-02 (calculation policy): 1 metric ton = 1,000 kg; 1 week = 7 days. Project gameplay convention (NOT a published SWSE calendar rule): 1 month = 30 days, 1 year = 365 days, unless an authoritative source gives a specific duration. Extended Range: convert the ORIGINAL printed consumables to days, take 10%, round down in days, minimum 1 day, per installation, never compounded. Published values and units are preserved in source data. Unusual annotated cargo quantities are not guessed; they are deferred individually. |

### V-P6B-03 - Slave circuits: rounding of the reduced crew requirement

| Field | Value |
|---|---|
| Decision ID | V-P6B-03 |
| Rules domain | Vehicle modifications |
| Feature | Slave Circuits (basic, advanced) |
| Source | *Starships of the Galaxy*, Accessories (pp. 48-53) |
| Evidence | Basic slave circuits reduce the crew requirement by 1/3, advanced by 2/3, never below 1; crew quality is based on the remaining crew. |
| Confirmed behavior | The fractions and the minimum of 1. |
| Unresolved question | How is a fractional crew requirement rounded (e.g. crew 10 reduced by 1/3)? |
| Options | Round the remaining crew up; round it down; round to nearest. |
| Recommended ruling | None |
| Implementation impact | Slave circuits not installable (P6B-D-013). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 15 (2026-11-02):** appended V-P6B-02 and V-P6B-03. No existing entry changed.

- **Revision 16 (2026-11-02):** recorded the owner's resolutions of V-P2-04 (GM-certified mount and arc for newly installed weapons) and V-P6B-02 (unit conversion calculation policy) in their Status and Resolution fields only; questions unchanged.

### V-P6B-04 - Damage type of starship laser cannons

| Field | Value |
|---|---|
| Decision ID | V-P6B-04 |
| Rules domain | Vehicle weapons |
| Feature | Laser cannons (light, medium, heavy) |
| Source | *Starships of the Galaxy*, Table 3-5 (p. 47); Core Rulebook, Vehicle Combat |
| Evidence | Table 3-5 prints "(Ion)" for ion weapons and no type for laser cannons. The Core vehicle damage rule is weapon damage x multiplier. |
| Confirmed behavior | Damage dice and multiplier. |
| Unresolved question | Is starship laser cannon damage typed (e.g. energy) for damage reduction and resistances, or untyped? |
| Options | Untyped (as printed); energy. |
| Recommended ruling | None |
| Implementation impact | Laser cannon damage is untyped (P6B-D-029). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 17 (2026-11-02):** appended V-P6B-04. No existing entry changed.

### Narrowing note for V-P6A-03 (2026-11-02; not a ruling)

The owner located the printed standard capacities (*Starships of the Galaxy* pp. 45-46): concussion missile launchers light 6 / medium 16 / heavy 30 (+20% cost per additional missile, up to double); proton torpedo launcher 3 (+25% per torpedo, up to 16); shieldbuster torpedo launcher 4 (+25%, up to 8); all mine launchers 6 (+25%, up to 12). These are recorded as source data in `scripts/domain/vehicles/vehicle-launcher-capacity.js`. What remains open in V-P6A-03 is only the optional EXPANSION: whether added capacity costs emplacement points and which cost the percentage applies to. The V-P6A-03 entry above is unchanged.

- **Revision 18 (2026-11-02):** appended the V-P6A-03 narrowing note. No existing entry changed.

### V-P6B-05 - Escape pod (lifeboat) size restriction: prose versus table

| Field | Value |
|---|---|
| Decision ID | V-P6B-05 |
| Rules domain | Vehicle modifications |
| Feature | Escape pod, small lifeboat; Escape pod, large lifeboat |
| Source | *Starships of the Galaxy*, Accessories (Escape Pods prose; accessories table) |
| Evidence | Prose: small lifeboats "can be installed on ships of Colossal (frigate) size or larger", one bay holds (cost modifier)/50 lifeboats; large lifeboats "Colossal (cruiser) size or larger", (cost modifier)/100 per bay. The catalog's table size cells read Colossal or larger and Colossal (frigate) or larger, where the per-bay count is fractional (5/50, 50/100). |
| Confirmed behavior | Capacity per bay, multiple bays allowed, life support figures. |
| Unresolved question | Which size restriction governs: the prose or the table cell? |
| Options | Prose (frigate+ / cruiser+); table (Colossal+ / frigate+, with a rounding rule for fractional bays). |
| Recommended ruling | None |
| Implementation impact | Escape pods not installable (P6B-D-011). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6B-06 - "Starship's size modifier" in Medical Suite and Passenger Conversion capacities

| Field | Value |
|---|---|
| Decision ID | V-P6B-06 |
| Rules domain | Vehicle modifications |
| Feature | Medical suite; Passenger seating / quarters |
| Source | *Starships of the Galaxy*, Accessories (Medical Suite; Passenger Conversion) |
| Evidence | Printed: a medical suite "includes (starship's size modifier)/5 medical beds and (starship's size modifier)/50 bacta tanks"; one section of passenger space holds "a number of passengers equal to the ship's size modifier". A starship's size modifier is negative (e.g. Colossal -10), so the literal text yields no usable count. Neighbouring accessories use the starship's cost modifier in the same pattern. |
| Confirmed behavior | Section/suite structure; steerage-quality accommodations; medical bed treated as medpac, medical kit and surgical kit. |
| Unresolved question | Is "size modifier" to be read as the cost modifier (Table 3-1), as the absolute size modifier, or otherwise? |
| Options | Cost modifier; absolute value of the size modifier. |
| Recommended ruling | None |
| Implementation impact | Medical suite and passenger rows not installable (P6B-D-012). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 19 (2026-11-02):** appended V-P6B-05 and V-P6B-06. No existing entry changed.

### Engineering status note: capital-ship attack penalty and trained-Pilot bonus (2026-11-02; not a ruling)

The project owner verified Core Rulebook printed p. 171 (PDF p. 172): a vehicle of Colossal (frigate) size or larger takes -20 on attack rolls against targets smaller than Colossal (point-defense weapons exempt), and a character trained in Pilot gains +2 on attacks with vehicle weapons crewed by the pilot. Both are published rules, implemented in the vehicle attack math (P6B-D-023, P6B-D-024). No decision register entry is affected.

- **Revision 20 (2026-11-02):** appended this status note. No existing entry changed.

## Published stock vehicle weapons (2026-11-02)

### V-P6C-01 - Firing arcs of published stock vehicle weapons

| Field | Value |
|---|---|
| Decision ID | V-P6C-01 |
| Rules domain | Vehicle weapons (published stock) |
| Feature | Firing arc of a published factory weapon group |
| Source | Canonical vehicle records (`armament.firingArcs`: "not-stated" or "not-yet-reviewed"); register V-P2-04 (no published firing-arc rule for vehicle weapons found in any searched book) |
| Evidence | Published statblocks do not state weapon firing arcs. The existing evidence policy (`vehicle-evidence-authority.js`) lets an arc-dependent attack proceed on a source-silent arc only with a per-attack GM adjudication and receipt. |
| Confirmed behavior | Stock weapon damage, operator and attack total are established for the executable groups; the arc is unstated. |
| Unresolved question | May a published stock weapon fire when the source states no arc? |
| Options | (a) Keep per-attack GM adjudication (current default, fail-closed). (b) A source-silent arc imposes no restriction (no published rule restricts it); targets, crew station, permissions and every other check still apply. (c) A GM sets the arc once per vehicle. |
| Recommended ruling | None |
| Implementation impact | World setting `vehicleStockSilentArcPolicy` selects (a) or (b); (c) is not implemented. |
| Status | `RESOLVED_OWNER_RULING` |
| Decision authority | Project owner |
| Resolution | Owner ruling 2026-11-03: approve (b) as the DEFAULT for source-verified stock weapons whose firing arc the source leaves unstated; an unstated arc is not a published 360-degree arc, it is the absence of a rule. Hierarchy: (1) a published arc the system understands is enforced; (2) a source-confirmed unstated arc imposes no automated restriction; (3) a published arc not yet interpreted is refused; (4) arc evidence not reviewed or contradictory stays refused; (5) certified aftermarket installations keep their certified mount and arc. Source evidence is never fabricated and canonical records are never rewritten. Implemented in `vehicle-stock-weapon-groups.js` (`determineStockArc`), `vehicle-stock-arc-policy.js` (default `unrestricted`; a world may choose `gm-per-attack`). The owner also noted that the statement "no sourcebook states firing-arc information" was too broad: Starships of the Galaxy p. 88 describes the Ghtroc 720's double laser cannon as fixed-forward rather than turret-mounted (enforced as a forward arc); five other groups state arcs the system cannot yet interpret (turret, articulated, axial, flank). |

- **Revision 21 (2026-11-02):** appended V-P6C-01. No existing entry changed.

- **Revision 22 (2026-11-03):** recorded the owner's resolution of V-P6C-01 (Status and Resolution fields only; the question is unchanged). Note: the V-P2-04 evidence line "no published firing-arc rule for installed weapons" remains true of installed weapons; stock groups can carry a published arc (see V-P6C-01).

### Engineering status note: stock attack totals (2026-11-03; not a ruling)

Investigation of the 564 groups whose printed attack total did not match crew Base Attack + vehicle Intelligence (P6B-D-033): a statblock's printed total is the generic crew's complete modifier, and its differences from the Core formula are explained by published rules in 274 executable groups (delta 0, or +2 on pilot-crewed groups = the Core p. 171 trained-Pilot bonus, owner-verified). Weapon batteries add +2 per gunner beyond the first (corroborated by the SotG fighter-group sentence); the Core p. 170 text is unreadable in the OCR. No register entry is affected and no rule was inferred beyond the owner-verified p. 171 bonus.

- **Revision 23 (2026-11-03):** appended this status note. No existing entry changed.

- **Revision 24 (2026-11-03):** correction to the revision 23 note: the executable count is 230 groups (laser, blaster and mass-driver cannons), not 274; finite-ammunition and ion-labelled groups were wrongly counted and are now denied. No existing entry changed.

### Engineering status note: omitted multiplier and capital-scale damage (2026-11-03; not a new ruling)

Owner ruling recorded in the P6C directive (no new register question): a published vehicle-weapon damage line with no
multiplier is x1, because a vehicle weapon is not a personal weapon and no x2 is invented. Printed multipliers (x1, x2, x5, x10)
are applied through the one damage authority as `(dice) * multiplier`; critical handling adds no second multiplier. The blanket
refusal of capital-scale x5 groups is replaced by a consistency check that a size-dependent figure on a capital ship equals the
printed figure minus the Core p. 171 -20 penalty. Result: 260 executable stock groups on 232 vehicles. No existing entry changed.

- **Revision 25 (2026-11-03):** appended this status note. No existing entry changed.

### V-P6C-02 - Number of identical weapons in a published weapon battery that prints only gunners

| Field | Value |
|---|---|
| Decision ID | V-P6C-02 |
| Rules domain | Vehicle weapons (weapon batteries) |
| Feature | Participating weapons of a published weapon battery ("battery (N gunners)") |
| Source | Core Rulebook, Vehicles, p. 170 (rule text verified by the project owner, 2026-11-03); Starships of the Galaxy battery statblocks (e.g. Krayt's Honor p. 91, Rendili Star Drive Light Corvette p. 102, Gamma-class Assault Shuttle p. 95); canonical vehicle records (`armament.firingGroups`, evidence key `hardwareCount`) |
| Evidence | Core p. 170: a battery is up to six identical weapons; every 3 points by which the attack roll exceeds the target's Reflex Defense adds another weapon that hits, up to the identical weapons actually participating. The canonical records print 104 weapon-battery groups with a gunner count ("battery (N gunners)"). Two of them also print the number of weapons: Krayt's Honor turbolaser battery (3 gunners; p. 91 narrative: three turbolasers) and the Rendili Light Corvette double laser cannon battery (6 gunners; p. 102: six double laser cannon turrets). The other 102 print gunners only (the source is confirmed silent on the weapon count). The Gamma-class Assault Shuttle's turbolasers (not a battery) are "two gunners operate four weapons". Of the 116 groups that print a gunner count, 108 have a printed attack total exactly equal to crew Base Attack + vehicle Intelligence modifier + 2 per assisting gunner. |
| Confirmed behavior | Assistance (+2 per assisting gunner), margin hits (1 per full 3 points over Reflex), the extra die per hit before the multiplier, the six-weapon limit and the rule that extra hits never exceed the participating weapons are implemented (`vehicle-weapon-battery.js`). A battery runs only when its gunner count and its weapon count are both printed and equal (2 groups; 1 passes every other gate). |
| Unresolved question | How many identical weapons does a published battery have when the source prints only its gunners? Equivalently: may the participating weapons of such a battery be taken as the printed gunner count, which caps the margin hits? |
| Options | (a) The weapon count equals the printed gunner count when only gunners are printed (both printed cases agree; the printed totals reflect the gunners). (b) The weapon count stays unestablished until a source prints it (current behavior; the gunners-versus-weapons mismatch of the Gamma-class shuttle shows the two are not always equal). |
| Recommended ruling | None |
| Implementation impact | 102 printed battery groups stay refused as `STOCK_BATTERY_WEAPON_COUNT_NOT_STATED`, many of which also carry other refusals (ion, point-defense, damage not printed). No code path infers the count. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6C-03 - Timing, duration and odd weapon counts of a battery aiding another battery

| Field | Value |
|---|---|
| Decision ID | V-P6C-03 |
| Rules domain | Vehicle weapons (weapon batteries) |
| Feature | A battery assisting another battery |
| Source | Core Rulebook, Vehicles, p. 170 (rule text verified by the project owner, 2026-11-03) |
| Evidence | The assisting gunner makes an attack roll against Reflex Defense 10; on a success the assisted battery gains +2 per two weapons in the assisting battery; the assisting weapons generate no margin hits. |
| Confirmed behavior | The arithmetic is implemented as a pure, tested function (`batteryAidsBattery`: success at 10 or more; +2 for each complete pair of weapons; no margin hits). It is not wired into any runtime. |
| Unresolved question | (1) How long the bonus lasts and which attack of the assisted battery receives it. (2) Whether the bonus stacks with the gunner assistance and with a second assisting battery. (3) How an odd number of weapons is counted (the helper counts complete pairs only; this is an engineering placeholder, not a ruling). |
| Options | None supported by the verified text. |
| Recommended ruling | None |
| Implementation impact | Battery-aids-battery is not offered at runtime (deferred item P6B-D-044). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 26 (2026-11-03):** appended V-P6C-02 and V-P6C-03. No existing entry changed.

### Engineering status note: weapon batteries (2026-11-03; not a ruling)

Core p. 170 (owner-verified) is implemented in `vehicle-weapon-battery.js` and wired into the stock gate, the attack roll and the damage authority. One published battery (Krayt's Honor turbolaser battery) is OFFLINE_EXECUTABLE; 102 printed batteries are refused until V-P6C-02 is ruled; named gunners on a battery are refused until a roster binding exists (P6B-D-043); the aid action is deferred (V-P6C-03). No existing entry changed.

- **Revision 27 (2026-11-03):** appended this status note. No existing entry changed.

### V-P6C-04 - Ion damage: ordering with shield rating and damage reduction, hit points 0, and ordinary organics

| Field | Value |
|---|---|
| Decision ID | V-P6C-04 |
| Rules domain | Combat (ion damage) |
| Feature | Ion damage against droids, vehicles, electronic devices, cybernetic creatures and ordinary organics |
| Source | Core Rulebook pp. 159-160 (rule text verified by the project owner, 2026-11-03) |
| Evidence | Roll ion damage; subtract HALF from hit points; compare the FULL (unhalved) ion damage to the damage threshold; at or above the threshold the target moves 2 condition-track steps; if the damage reduces hit points to 0 the target moves 5 steps and is disabled (unconscious for a creature). The extra effects apply to droids, vehicles, electronic devices and cybernetic creatures; ordinary organics take only the half-damage HP effect. The existing engine halves HP damage for ion, compares `thresholdDamageOverride` (the full ROLLED amount, before shield rating and damage reduction) to the threshold for ion and stun, and measures ordinary damage AFTER shield rating and damage reduction. |
| Confirmed behavior | Implemented on the existing authorities (`damage-packet-rules.js`, `damage-resolution-engine.js`, `threshold-engine.js`): half HP; full amount to the threshold; 2 steps at the threshold (`ION_THRESHOLD_CT_STEPS`); 5 steps and disabled at 0 HP as one outcome (not 5 + 2); ordinary organics half HP without the ion effects; the optional Ion Shielding cap of one step now has a two-step baseline to cap. |
| Unresolved question | (1) Is the "full" amount compared to the threshold the rolled amount before shield rating and damage reduction (current ion behavior) or the amount after them (the ordinary behavior)? (2) May an ion hit that both reaches the threshold and reduces hit points to 0 also destroy the target, or is it only disabled (implemented as disabled only, per the verified outcome)? (3) What threshold basis does an ordinary organic's half-damage hit use (implemented as the half damage actually dealt, the ordinary rule)? (4) How does the two-step ion baseline combine with the optional double-threshold house rule (implemented as the larger of the two, not additive)? |
| Options | None supported by the verified text beyond the readings named above. |
| Recommended ruling | None |
| Implementation impact | The 32 ion stock groups that pass every other gate are OFFLINE_EXECUTABLE with this ordering as implemented; a ruling on (1) or (2) may change results on shielded, damage-reduced or 0-HP targets (the p27 ORDERING and 0-HP tests pin today's behavior). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6C-05 - AAT-1 "takes double damage from ion weapons" and the R-28 ion naming

| Field | Value |
|---|---|
| Decision ID | V-P6C-05 |
| Rules domain | Vehicles (ion damage) |
| Feature | AAT-1 Ion Vulnerability (Core Rulebook p. 176); R-28 Starfighter medium ion cannons (Legacy Era Campaign Guide p. 85) |
| Source | Canonical records `core-aat-1` (`text.mechanicalNotes`) and `le-r-28-starfighter` |
| Evidence | The AAT-1 record preserves "Ion Vulnerability: takes double damage from ion weapons." It is the only published vehicle record carrying ion vulnerability or immunity text. The R-28's weapon is named "medium ion cannons" while its printed damage line reads 6d10x2 with no ion type. |
| Confirmed behavior | Neither is automated: no damage authority applies an ion vulnerability, and the R-28 weapon is refused (`STOCK_DAMAGE_ION_UNVERIFIED`). |
| Unresolved question | What the AAT-1 vulnerability doubles (the rolled ion damage before halving, the damage to hit points, or the amount compared to the threshold) and how it combines with shield rating and damage reduction; whether the R-28's cannons deal ion damage. |
| Options | None supported by the source text. |
| Recommended ruling | None |
| Implementation impact | AAT-1 receives no ion vulnerability; the R-28 ion cannons stay refused. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 28 (2026-11-03):** appended V-P6C-04 and V-P6C-05. No existing entry changed.

### Owner direction on V-P6C-02, and findings on V-P6C-04 / V-P6C-05 (2026-11-03; appended, nothing above is rewritten)

**V-P6C-02 - owner direction recorded.** The project owner directed that a battery's number of weapons must NOT be inferred from its number of gunners and that Core p. 170 establishes only "up to six identical weapons" (no equality with the gunners). The equality requirement written into the battery model in commit fc510fc was an invented restriction and is removed. Implemented: weapon quantities (total, available, participating) and gunner quantities are independent; FULL-BATTERY mode still requires a printed weapon count; INDEPENDENT-WEAPON mode (Core p. 170: a battery's weapons may fire independently without battery assistance) needs only the printed gunner count and removes exactly 2 x (gunners - 1) from the printed total when that arithmetic reconciles. The original question (how many weapons when only gunners are printed) is answered by the direction "do not guess; use independent firing". Status: `RESOLVED_OWNER_DIRECTION`. Implementation: `vehicle-weapon-battery.js`, `vehicle-stock-weapon-groups.js`, `vehicle-stock-weapon-items.js`; commit recorded in the revision note below.

**V-P6C-04 - findings after tracing the published text (status unchanged: `DEFERRED_RULES_REVIEW`).** Core pp. 159-160 (read from the OCR): "first subtract half of the ion damage from the target's hit points. Creatures that do not have cybernetic prosthetics are singed by the ion energy but suffer no other ill effects. Droids, vehicles, electronic devices, and cybernetically enhanced creatures may suffer additional effects": 0 HP -> -5 steps and unconscious/disabled; ion damage (before being halved) at or above the damage threshold -> -2 steps. Cybernetic Prosthesis (p. 137): a creature with cybernetic prosthetics "takes full damage" from ion attacks. Shield rating (p. 161): "reduce the damage by the SR; remaining damage is dealt to hit points, applying damage reduction normally" (shields first, then damage reduction). Generic Hit Points 0 and Damage Threshold sections (Combat chapter; "Falling Unconscious" is on p. 147): a droid, object or vehicle reduced to 0 HP is disabled, "however, if the damage that reduced it to 0 hit points equals or exceeds its damage threshold, the droid, object, or vehicle is destroyed instead" (a creature is killed). Settled and implemented: the three target kinds above; shields before damage reduction; 2 steps; 5 steps/disabled. NOT settled (reported at runtime through `ionRuleDeferred`, the reversible outcome applied): (1) whether the full ion amount compared to the threshold is the rolled amount (current engine reading for ion and stun) or the amount after shield rating and damage reduction (the ordinary reading) - the two coincide when the target has neither; (2) whether the generic destroyed/killed rule governs an ion hit that reaches 0 HP and the threshold (implemented: disabled only); (3) whether a creature with prosthetics counts as the "cybernetically enhanced" creature of the ion paragraph (read as the same set - prosthetics get full HP damage and the extra effects); (4) the combination of the two-step ion baseline with the optional double-threshold house rule (the larger, not additive). Recognition of prosthetics uses the structured equipment tags `cybernetic` + `prosthesis`; a prosthesis the actor does not own as an item is invisible to the rule.

**V-P6C-05 - findings (status unchanged: `DEFERRED_RULES_REVIEW`).** AAT-1 (Core p. 176): "Due to a design flaw, the AAT takes double damage from ion weapons." The source-backed vulnerability authority (`damage-vulnerability-authority.js`) reads this from the digest-verified record only and records it on the packet; it is NOT applied because the text does not order the doubling against ion halving, shield rating, damage reduction (the AAT-1 has DR 15 and no shield rating), the threshold comparison, the weapon multiplier or battery dice, and no combination is fully settled.

- **Revision 29 (2026-11-03):** appended the owner direction on V-P6C-02 and the findings on V-P6C-04 and V-P6C-05. No existing text changed.

### V-P6C-06 - Payload versus launcher capacity, and reloading, for vehicle launchers

| Field | Value |
|---|---|
| Decision ID | V-P6C-06 |
| Rules domain | Vehicle weapons (finite ammunition) |
| Feature | Ammunition supply and reloading of vehicle missile, torpedo, rocket, mine and grenade launchers |
| Source | Core Rulebook, Vehicles (statblock "Payload" line; Missiles and Torpedoes); Core Equipment (personal launchers: "holds four missiles... reloaded as a full-round action"); Starships of the Galaxy pp. 45-46 (launcher capacities) and Fire-Linked Weapons (ammunition consumption) |
| Evidence | The Core defines the statblock Payload as the vehicle's complement of grenades, rockets, missiles and torpedoes ("if the vehicle has no payload, this line is absent"). Starships of the Galaxy prints launcher capacities as separate figures (light concussion missile launcher 6, medium 16, heavy 30, proton torpedo launcher 3, shieldbuster 4, mine launchers 6) and says fire-linked missiles and torpedoes consume one shot per fire-linked launcher. 169 stock groups are ammunition-limited; 24 print a payload count; 33 are refused for ammunition alone. |
| Confirmed behavior | Nothing is enabled: a finite supply is never treated as unlimited. The existing `AmmoSystem` only tracks when the optional `trackBlasterCharges` house rule is on. |
| Unresolved question | (1) How does the printed payload relate to the launchers' loaded capacity (is the loaded count a share of the payload)? (2) What action reloads a vehicle launcher from the payload, and what does it cost? (3) Does each attack always spend one unit per launcher, including for a missed lock-on follow-up attack? |
| Options | None supported by the verified text beyond the figures above. |
| Recommended ruling | None |
| Implementation impact | The ammunition ledger (P6B-D-049) cannot be specified; area damage (P6B-D-048) and lock-on (P6B-D-047) are separate engineering items. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 30 (2026-11-04):** appended V-P6C-06. No existing entry changed.

### Owner addendum 2026-11-04: V-P6C-03, V-P6C-04, V-P6C-05 (appended; nothing above is rewritten)

**Decision hierarchy adopted by the owner:** A explicit published rule -> implement, no ruling; B existing system authority -> reuse; C explicit project interpretation -> implement and document as policy (not RAW); D genuine rules gap -> ask. Every decision is classified PUBLISHED_RULE / EXISTING_ENGINE_AUTHORITY / PROJECT_INTERPRETATION / SOURCE_UNRESOLVED.

**V-P6C-03 (battery aiding battery) - resolved by PUBLISHED_RULE.** Core Rulebook p. 170 (Aid Another, read from the OCR): "As a standard action, you can aid an ally's next skill check, ability or attack roll... A gunner can grant a +2 bonus on another character's attack roll by making an attack against a Reflex Defense of 10." Timing is the ally's next attack roll; the bonus is consumed once; no end-of-round expiry. Multiple assisting batteries and unusual stacking remain SOURCE_UNRESOLVED and stay unavailable. Status: `RESOLVED_PUBLISHED_RULE` for the ordinary single-aid case.

**V-P6C-04 (ion ordering) - resolved by PROJECT_INTERPRETATION.** Sequence: vulnerability -> shield rating -> damage reduction -> kept full amount -> hit-point halving -> threshold comparison on the kept amount; at 0 HP the specific ion disable (-5 steps, disabled/unconscious) governs the generic destroy rule for an ion-only hit, with no extra -2. The damage type stays ion for every target. Decision matrix: docs/audits/vehicles/ion-damage-decision-matrix.md. Status: `RESOLVED_PROJECT_INTERPRETATION`.

**V-P6C-05 (AAT-1) - resolved by PROJECT_INTERPRETATION for the AAT-1; R-28 remains `SOURCE_UNRESOLVED`.** The published x2 applies to the incoming ion damage after the weapon's own calculation and before shield rating, damage reduction and halving (worked example: 40 -> 80 -> DR 15 -> 65; HP 32; 65 vs threshold 33). The R-28's medium ion cannons print no ion type on the damage line (the narrative calls them nonlethal ion munitions); the canonical evidence is not edited, so the group stays refused.

**Starship-scale area attacks - PUBLISHED_RULE (Core, Vehicle Combat).** "Area attacks (including autofire, burst radius weapons, and splash weapons) are resolved as attacks on a single target in starship scale unless the weapon is specifically listed as having a starship-scale area attack." The encounter scale is character scale when characters on foot are involved and starship scale when the scene involves vehicles only (Core, Scale).

**Guided missiles - PUBLISHED_RULE (Core, Missiles and Torpedoes).** Aiming locks the weapon on; a missed missile or torpedo attacks again on the next turn at the same bonus with -5 and no action, then self-destructs; Reflex Defense 30, 10 hit points; one launch is one unit of ammunition.

**V-P6C-06 (ammunition) - partly PROJECT_INTERPRETATION.** Payload (the vehicle's complement), loaded ammunition, reserve and launcher capacity are separate quantities. Initial loading convention for a verified single-launcher configuration: loaded = min(payload, certified capacity), reserve = payload - loaded; not applied where the launcher allocation is ambiguous. Reload action costs are not inferred from personal launchers; a GM reload operation transfers reserve to loaded without creating ammunition.

- **Revision 31 (2026-11-04):** appended the owner addendum. No existing text changed.

### Engineering status note: ammunition ledger and guided projectiles (2026-11-04; implements the owner addendum, no new question)

Implemented as PUBLISHED_RULE (lock-on, Reflex 30 / 10 HP / -5, no second charge, starship-scale single-target splash) and PROJECT_INTERPRETATION (initial loading min(payload, capacity); exact-designation launcher identity; GM reload that creates nothing). No published group is a complete launcher family (none has a verified single launcher); 18 wait for a GM-certified allocation. V-P6C-06 stays recorded as a project interpretation, with the reload action cost explicitly NOT inferred.

- **Revision 32 (2026-11-04):** appended this status note. No existing entry changed.

### Complete Weapon Ecosystem addendum (2026-11-04): newly recorded questions V-P6C-07 .. V-P6C-10 (appended; nothing above is rewritten)

### V-P6C-07 - Miss damage of an area attack that resolves as a single-target attack at starship scale

| Field | Value |
|---|---|
| Decision ID | V-P6C-07 |
| Rules domain | Vehicle weapons (area attacks at starship scale) |
| Feature | Miss damage of an area attack that resolves as a single-target attack at starship scale |
| Source | Core Rulebook, Special Combat Rules: Area Attacks (p. 155) and Vehicle Combat: Scale; Rebellion Era Campaign Guide, Anti-Aircraft Flak Pod |
| Evidence | Core Area Attacks: "Creatures you hit take full damage, and creatures you miss take half damage." Splash weapons: the primary target takes full damage on a hit and half if the attack misses. Core Scale: "area attacks (including autofire, burst radius weapons, and splash weapons) are resolved as attacks on a single target in starship scale unless the weapon is specifically listed as having a starship-scale area attack." The flak pod, which IS listed as a starship-scale area attack, prints half damage on a miss. |
| Confirmed behavior | At starship scale an ordinary splash, burst or autofire attack is an attack on a single target (owner direction, PUBLISHED_RULE); the hit deals the ordinary damage. Implemented since P6C-3B. |
| Unresolved question | Whether the single target of such an attack takes half damage when the attack misses (the area-attack miss rule), or nothing (an ordinary single-target miss). Implemented behaviour is the ordinary single-target miss (no damage); it is the absence of an effect, not a chosen reading. |
| Options | Source text supports both: the area-attack miss rule (Area Attacks, splash weapons) and the single-target resolution (Scale). No other published text addresses it. |
| Recommended ruling | None |
| Implementation impact | Affects the 3 executable starship-scale-only stock groups, every future splash/torpedo/missile/ion-bomb group and starship-scale autofire. They stay OFFLINE_EXECUTABLE for the hit outcome; the miss outcome is pending this ruling. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6C-08 - Burst Fire feat on a vehicle weapon

| Field | Value |
|---|---|
| Decision ID | V-P6C-08 |
| Rules domain | Feats and vehicle weapons |
| Feature | Burst Fire feat on a vehicle weapon |
| Source | Core Rulebook, Feats (Burst Fire) and Special Combat Rules: Autofire |
| Evidence | Burst Fire (Strength 13, Weapon Proficiency (heavy weapons), proficient with the weapon): when using a ranged weapon with autofire capability in autofire mode, fire a short burst as a single attack against a single target at -5 for +2 dice of damage; expends five shots; not an area attack. Starships of the Galaxy lists the autofire-capable vehicle weapons (double, quad and fire-linked blaster cannons, laser cannons, light ion cannons and light turbolasers). |
| Confirmed behavior | Autofire is a swift-action mode of an autofire-capable vehicle weapon; Burst Fire is a feat of a character. |
| Unresolved question | Whether the feat applies when the gunner or pilot fires a vehicle weapon (and whether the feat's prerequisites and heavy-weapon proficiency are evaluated for the operating character), and what shots a vehicle weapon expends. |
| Options | None supported by the text. |
| Recommended ruling | None |
| Implementation impact | Burst Fire for vehicle weapons is not implemented (no automation is offered). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6C-09 - Whether an autoblaster has an autofire setting

| Field | Value |
|---|---|
| Decision ID | V-P6C-09 |
| Rules domain | Vehicle weapons (modifications) |
| Feature | Whether an autoblaster has an autofire setting |
| Source | Starships of the Galaxy, Weapon Systems: Autoblaster; Table 3-5 (p. 47) |
| Evidence | "Blaster cannons can be designed with a higher cyclic firing rate so long as they have sufficient cooling systems to keep the firing elements from overheating. Only single-mounted blasters are generally made into autoblasters, however." Table 3-5 prints no damage, +0 EP, Restricted, cost x2. The text names the autofire-capable vehicle weapons in the Double/Quad and Fire-Linked paragraphs and does not name the autoblaster there. |
| Confirmed behavior | Cost multiplier x2, availability Restricted, +0 emplacement points, applies to a single-mounted blaster cannon. |
| Unresolved question | Whether the higher cyclic rate gives the weapon an autofire setting (and how it interacts with the autofire rules for double, quad and fire-linked weapons), or has a different effect. |
| Options | None supported by the text. |
| Recommended ruling | None |
| Implementation impact | The autoblaster row stays SOURCE_VERIFIED and is not installable. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6C-10 - Combining double, quad, fire-linked and cannon-enhancement damage on one weapon

| Field | Value |
|---|---|
| Decision ID | V-P6C-10 |
| Rules domain | Vehicle weapons (configurations) |
| Feature | Combining double, quad, fire-linked and cannon-enhancement damage on one weapon |
| Source | Starships of the Galaxy, Weapon Systems: Cannon, Double/Quad; Cannon Enhancements; Fire-Linked Weapons; Table 3-5 (p. 47) |
| Evidence | Each configuration prints its own damage increase (+1d10 / +2d10), emplacement points and cost multiplier. Fire-linked weapons: "Weapons of any type that deal damage can be fire-linked"; double and quad cannons are "reciprocating multibarrel weapons"; enhancements "boost the damage output" of a blaster, a laser (but not a turbolaser) or an ion cannon. |
| Confirmed behavior | Each configuration individually; fire-linked turbolasers are not weapon batteries; triple cannons are functionally identical to double cannons. |
| Unresolved question | Whether (and how) the damage increases combine when a weapon carries more than one configuration (for example a fire-linked double cannon with enhancements), and the cost and emplacement-point arithmetic of a combination. |
| Options | None supported by the text. |
| Recommended ruling | None |
| Implementation impact | Combinations are refused when configurations are implemented; each configuration is applied alone. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 33 (2026-11-04):** appended V-P6C-07 .. V-P6C-10 (Complete Weapon Ecosystem addendum). No existing entry changed.

### V-P6C-11 - What the "x2 / x3 / x4 / x5" cost entries of Table 3-5 multiply

| Field | Value |
|---|---|
| Decision ID | V-P6C-11 |
| Rules domain | Vehicle weapons (configurations and the autoblaster) |
| Feature | Cost of the autoblaster (x2), double cannon (x3), quad cannon (x5), fire-linked weapon 2 (x2) and 4 (x4), cannon enhancements (x2) and advanced cannon enhancements (x5) |
| Source | Starships of the Galaxy, Table 3-5 (p. 47) and Weapon Systems: Cannon, Double/Quad; Fire-Linked Weapons |
| Evidence | The cost column prints a credit amount for most rows, "+4,000" / "+1,000" for the point-defense, docking-gun and optional fire-link rows (an explicit addition per weapon), and "x2", "x3", "x4", "x5" for the rows above. The Fire-Linked text says fire-linked weapons use up more space than a double or quad weapon "but costing less" (fire-linked 2 is x2 against x3 for double; fire-linked 4 is x4 against x5 for quad). The text does not define the multiplier. The repository has always refused these rows as COST_TYPE_NOT_RESOLVED_BY_PUBLISHED_RULES. |
| Confirmed behavior | Damage, emplacement points, availability and the weapons each applies to are printed (see V-P6C-10). |
| Unresolved question | Whether "xN" multiplies the cost of the base weapon to give the configured weapon's TOTAL cost (so retrofitting an installed weapon would cost the difference), or is a multiple charged IN ADDITION to the base weapon; and whether the multiplier applies before or after the nonstandard x5 modification. |
| Options | Both readings are consistent with the cost ordering in the Fire-Linked text. |
| Recommended ruling | None |
| Implementation impact | The configuration rows (double, triple, quad, fire-linked, enhancements) and the autoblaster cannot be priced and stay not installable. Point defense (an explicit "+4,000 per weapon") is unaffected and implemented. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 34 (2026-11-04):** appended V-P6C-11. No existing entry changed.

### V-P6C-12 - Range measurement convention and the Table 10-2 row of a stock group (implemented project convention, 2026-11-04)

| Field | Value |
|---|---|
| Decision ID | V-P6C-12 |
| Rules domain | Vehicle weapons (range) |
| Feature | How the distance between an attacking vehicle and its target is counted, and which Table 10-2 row a published stock group uses |
| Source | Core Rulebook, Vehicles, Vehicle Combat: Range Modifier and Table 10-2: Vehicle Weapon Ranges |
| Evidence | The Core gives the band penalties (point blank 0, short -2, medium -5, long -10) and the band limits per weapon type and scale, in squares. It does not define how squares are counted between tokens of different sizes, or how a statblock's weapon is matched to a table row. |
| Confirmed behavior | Band limits and penalties are printed and implemented exactly (data/vehicle-weapon-ranges.json, getRangePenalty). |
| Unresolved question | Not blocking: the implementation counts squares from the attacker's nearest square to the target's nearest square, diagonals as one square (Chebyshev), adjacent = 1, same square = 0, using each token's footprint; and it reads a stock group's row from the exact weapon words of its printed designation (laser cannon, blaster cannon, autoblaster, ion cannon, turbolaser, torpedo or missile, point-defense, tractor beam, gravity well), refusing a designation that names none or several. |
| Options | Center-to-center counting; hex grids (refused as unsupported). |
| Recommended ruling | None |
| Implementation impact | Five stock groups with no Table 10-2 designation became non-executable. The convention can be overridden by a ruling without changing the data. |
| Status | `IMPLEMENTED_PROJECT_CONVENTION` (owner may override) |
| Decision authority | Project owner |
| Resolution | |

- **Revision 35 (2026-11-04):** appended V-P6C-12. No existing entry changed.

### Owner rulings 2026-11-04 (appended; nothing above is rewritten): V-P6C-07, V-P6C-08, V-P6C-09, V-P6C-10, V-P6C-11

- **V-P6C-07 - `RESOLVED_PROJECT_INTERPRETATION`.** An ordinary splash or area weapon resolved against one target at starship scale keeps the Core area-attack miss rule (Core Special Combat Rules: Area Attacks, p. 155): a hit deals full damage, a miss deals HALF; Shield Rating, Damage Reduction and the other defenses apply afterwards through their existing authorities; starship scale restricts the NUMBER of targets, it does not replace the damage rule. Implemented: `ruleData.halfDamageOnMiss` is carried with the attack of every vehicle weapon that has a published ordinary area (aftermarket launchers and the executable stock splash groups); a natural 1 keeps the engine's existing no-damage rule; single-target weapons are unchanged; critical-hit doubling is unchanged (vehicle rule). Not implemented: the Vehicular Evasion talent and the character-scale multi-target area. Test: p36.
- **V-P6C-08 - `RESOLVED_PUBLISHED_RULE`.** Starships of the Galaxy, Starship Feats, authorizes Burst Fire with autofire-capable vehicle weapons (the TIE fighter laser-cannon example adds the extra dice before the vehicle multiplier). To be implemented in WE-5 for the actual operating character with verified feat evidence.
- **V-P6C-09 - `RESOLVED_PROJECT_INTERPRETATION`.** The autoblaster modification grants autofire capability to an eligible single-mounted blaster cannon (cost x2 total, +0 EP, Restricted); the base weapon's dice are unchanged; normal fire and autofire both remain available; no compatibility with double or quad configurations is inferred. To be implemented in WE-6.
- **V-P6C-11 - `RESOLVED_OWNER_RULING`.** The "x2 / x3 / x4 / x5" entries of Table 3-5 are TOTAL-cost multipliers of the base weapon (a 1,200-credit blaster cannon as a double cannon costs 3,600), not surcharges; rows marked "+" (point defense, docking gun, optional fire link) are additions. Emplacement-point adjustments apply separately; availability is the more restrictive. Combinations need a separately validated composition rule. To be implemented in WE-4.
- **V-P6C-10 - `RESOLVED_OWNER_RULING` (individual configurations).** Double (+1 die), triple (= double), quad (+2), fire-linked 2 (+1), fire-linked 4 (+2), cannon enhancement (+1) and advanced enhancement (+2) dice are added before the vehicle multiplier; double/triple/quad are alternatives, fire-linked 2/4 are alternatives, enhancements are alternatives, enhancements never apply to turbolasers, nothing stacks automatically; compatible combinations come later through a verified composition system.

- **Revision 36 (2026-11-04):** recorded the owner rulings above. No earlier text changed; the original questions stay as written.

### V-P6C-13 - Shieldbuster torpedoes: what "half damage against anything but shields" halves

| Field | Value |
|---|---|
| Decision ID | V-P6C-13 |
| Rules domain | Vehicle weapons (shieldbuster torpedoes) |
| Feature | Shieldbuster torpedo (T-33 type) |
| Source | Starships of the Galaxy, Weapon Systems: Shieldbuster Torpedoes |
| Evidence | "Against anything but shields, shieldbusters deal half damage. If an attack from a shieldbuster torpedo exceeds a target's SR, the target loses 10 points from its SR (rather than the normal 5)." |
| Confirmed behavior | The SR loss is 10 instead of 5 when the attack exceeds SR. A target with no shields takes half damage. |
| Unresolved question | Against a shielded target, whether the full damage is first compared with and reduced by SR and only the damage that reaches Hull is halved, or the damage is halved before SR is applied (which also changes whether the attack "exceeds SR" for the -10 rule). |
| Options | (a) SR is applied to the full damage, the remainder is halved. (b) The damage is halved, then SR is applied. Both readings are supported by the sentence. |
| Recommended ruling | None |
| Implementation impact | Shieldbuster torpedoes (aftermarket launcher row and stock launcher groups) stay unimplemented as a weapon family; the SR-loss amount is a one-line change once the ordering is ruled. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### V-P6C-14 - Gravity well projector: duration and removal of the interdiction field

| Field | Value |
|---|---|
| Decision ID | V-P6C-14 |
| Rules domain | Vehicle weapons (gravity well projectors) |
| Feature | Gravity well projector |
| Source | Starships of the Galaxy, Weapon Systems: Gravity Well Projectors |
| Evidence | Treated as an area attack: the operator chooses a 4x4-square (starship scale) area within range and attacks Reflex Defense 10. On success a hyperspace interdiction field is created in those squares; a starship that starts its turn in a covered square may not activate its hyperdrive that turn. |
| Confirmed behavior | Area size, the Reflex 10 attack, and the effect on a ship that starts its turn in the field. |
| Unresolved question | How long the field lasts, whether it can be moved, dropped or stacked, and whether the projector must keep operating it. The text states none of these. |
| Options | None supported by the text. |
| Recommended ruling | None |
| Implementation impact | Only the attack and the one-turn effect can be modelled; a persistent field object needs a duration. Not implemented. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 37 (2026-11-04):** appended V-P6C-13 and V-P6C-14. No existing entry changed.

- **V-P6C-13 - `RESOLVED_PROJECT_INTERPRETATION` (owner, 2026-11-04).** A shieldbuster meets Shield Rating at full strength; if it exceeds SR the target loses 10 SR instead of 5; what reaches the hull is halved; Damage Reduction follows. Against a target with no shield it deals half damage. Printed rule: Starships of the Galaxy, Shieldbuster Torpedoes. Sequencing is the project interpretation. Implemented in `shield-mitigation-resolver.js` (isShieldbuster, SR -10) and `damage-mitigation-manager.js` (hull halving before DR), flagged by the weapon authority via `ruleData.shieldbuster`.
- **Revision 38 (2026-11-04):** recorded the V-P6C-13 interpretation. The original question stays as written above.

### V-P6C-15 - Noticing a space mine: how the Stealth +5 forms the Perception DC

| Field | Value |
|---|---|
| Decision ID | V-P6C-15 |
| Rules domain | Vehicle weapons (space mines) |
| Feature | Space mine detection reaction |
| Source | Starships of the Galaxy, Space Mines |
| Evidence | "A space mine has a Stealth bonus of +5 (including size modifiers), which sets the DC to notice the space mine. Whenever a starship is about to enter the same square as a space mine, the pilot can make a Perception check as a reaction to notice the mine and choose a different square to move into instead. If the ship has a system operator, the system operator may make a Use Computer check as a reaction as well, using the ship's sensors to detect the mine." |
| Confirmed behavior | Deployment (swift action), detonation on entry, area attack on all ships in the square, full on a hit and half on a miss, IFF exemption and command detonation, the +5 / 7d10x2 and heavy +5 / 6d10x5 (-20 against targets smaller than Colossal) statistics, six mines per launcher. |
| Unresolved question | How a Stealth bonus of +5 becomes a DC (a fixed DC of 15, a Stealth check rolled by the mine's owner, or another formula), and whether a ship that has noticed a mine may be moved by the pilot mid-path by the system. |
| Options | None supported by the text. |
| Recommended ruling | None |
| Implementation impact | Mines detonate on entry; the noticing reaction is not automated (a GM may remove or detonate a mine). The advanced mine (+10, 9d10x2) has no launcher row and is not offered. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 39 (2026-11-04):** appended V-P6C-15.

### V-P6C-16 - Ion bombs: range and target of a dropped bomb

| Field | Value |
|---|---|
| Decision ID | V-P6C-16 |
| Rules domain | Vehicle weapons (ion bombs) |
| Feature | Ion bomb / ion bomb rack |
| Source | Starships of the Galaxy, Weapon Systems: Ion Bombs |
| Evidence | "Because of their primitive fin-stabilized guidance system, the bombs are usable only in an atmosphere, and attacks with them take a -5 penalty. Ion bombs may target a square directly beneath the ship that deploys them. On impact, they create a strong ion field that deals 5d10 points of ion damage within a 10-square radius. Ion bomb racks can hold up to four ion bombs." |
| Confirmed behavior | Atmosphere only (the repository already has the GM-set vehicle environment, which would be the gate), -5 attack, 5d10 ion damage, 10-square radius, rack capacity four. |
| Unresolved question | Whether "may target a square directly beneath the ship" limits the bomb to that square or only permits it among other targets (Table 10-2 has no bomb row, so no range band exists), what Reflex Defense or area rule applies to creatures in a 10-square radius at character scale, and whether the rack's cost/expansion beyond four is defined. |
| Options | None supported by the text. |
| Recommended ruling | None |
| Implementation impact | The ion bomb rack and stock "ion bomb" groups stay unimplemented; the shared launcher, ammunition, ion-damage and area machinery is ready once a range/target rule is ruled. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 40 (2026-11-04):** appended V-P6C-16.

### V-P6C-15 - OWNER RULING (appended 2026-11-05; the question above is preserved)

| Field | Value |
|---|---|
| Decision ID | V-P6C-15 |
| Status | `RESOLVED_PROJECT_INTERPRETATION` |
| Resolution | The mine's printed Stealth bonus (+5, size included) forms its detection DC as a Stealth check `1d20 + 5`, rolled ONCE when the mine is deployed and persisted with the mine (never rerolled per observer). Before a ship enters the mined square its pilot may make a Perception check as a reaction and a system operator a Use Computer check as a reaction (using the ship's sensors); a success lets the pilot choose a different square, a failure leaves the normal trigger. Movement that cannot be intercepted before entry uses a GM-mediated reaction workflow: nothing detonates before the published reaction opportunity. Mine entry follows the move's RECORDED path (Foundry's movement data) when it establishes one; otherwise only the destination is tested and the GM records a crossing explicitly (P6B-D-073). |
| Decision authority | Project owner |
| Implementation | commit 705623c (`vehicle-space-mine.js`, `vehicle-mine-service.js`: `deploy`, `onTokenMoved`, `adjudicateEntry`, `attemptNotice`, `resolveEntry`; sheet mine panel; test p48) |
| Engineering boundaries (not rules) | The reaction rolls use the existing skill-roll and sensor-check authorities and spend a reaction through ActionEconomyConsumption; there is no "system operator" crew station, so the operator is the crew actor the GM names (the selected token on the sheet); the recorded-path reader follows Foundry V13 movement data and is not live-verified. |

- **Revision 41 (2026-11-05):** recorded the V-P6C-15 owner ruling.

### V-P6C-16 - OWNER RULING (appended 2026-11-05; the question above is preserved)

| Field | Value |
|---|---|
| Decision ID | V-P6C-16 |
| Status | `RESOLVED_PROJECT_INTERPRETATION` |
| Resolution | An ion bomb may target the square directly beneath the deploying ship; this narrow reading is the project's ruling, not a rewrite of the printed rule. Atmosphere only, printed -5 attack, 5d10 ion damage, 10-square radius, four bombs per rack (the existing ammunition ledger), standard ion-damage and shared area-attack rules (full on a hit, half on a miss, existing Evasion interaction) for eligible targets. No Table 10-2 band, no distant or arbitrary target, no persistent field. If impact geometry cannot be established, the GM confirms an impact square inside the ship's footprint. |
| Decision authority | Project owner |
| Implementation | commit 705623c (`vehicle-ion-bomb.js`, `vehicle-ion-bomb-service.js`, `ion-bomb-rack` launcher; sheet panel; test p49) |
| Engineering boundaries (not rules) | The 10 squares are counted in the Scene's grid squares with no scale conversion; the deploying ship is not a target of its own bomb; atmosphere is the existing GM-set vehicle environment (unknown never allows it). Stock statblock groups that print ion bombs are not wired to the service and stay refused. |

- **Revision 42 (2026-11-05):** recorded the V-P6C-16 owner ruling.

### V-P6C-17 - Autofire mode switch cost for double / quad / fire-linked cannons (OWNER CORRECTION)

| Field | Value |
|---|---|
| Decision ID | V-P6C-17 |
| Rules domain | Vehicle weapons (autofire) |
| Source | Starships of the Galaxy, printed p. 45 |
| Confirmed behavior | A swift action is required to switch between normal and autofire modes for the listed double / quad and fire-linked cannons; the cost applies in both directions. |
| Status | `RESOLVED_PUBLISHED_RULE` |
| Resolution | The switch costs a swift action in both directions for aftermarket double / quad / fire-linked cannons, paid by the weapon's named operator; no other configuration is extended (an autoblaster and stock groups keep the one-way price of the Core "set to autofire"). Stock statblock groups are not classified by label as double/quad/fire-linked cannons. |
| Implementation | commit 705623c (`VehicleFireModeService.setMode`, `autofireSwitchBothWays` on the weapon authority, test p38) |

- **Revision 43 (2026-11-05):** recorded V-P6C-17.

### V-P6C-18 - Initial vehicle ammunition and ammunition purchasing (OWNER-APPROVED PROJECT HOUSE RULE, 2026-11-05)

| Field | Value |
|---|---|
| Decision ID | V-P6C-18 |
| Classification | Owner-approved project house rule, **not** an explicit universal RAW statement |
| Status | `RESOLVED_PROJECT_HOUSE_RULE` |
| Setting | World GM setting `initialVehicleAmmunitionIncluded` ("Initial Vehicle Ammunition Included"), default **On**, read only through `HouseRuleService` |
| On (default) | A newly created stock vehicle's launchers start with the published payload at no charge (a one-time creation benefit, not a refill). |
| Off | A new launcher starts empty; its initial ammunition is bought at the published per-round price. A GM may deliberately grant the published starting ammunition (no credit transaction, for example for an NPC vehicle), never above the published payload. |
| Always | A GM-configured payload is the GM's own certified allocation (independent of the setting). Installing a launcher grants no ammunition. Reloads / replacement ordnance pay the published price. Resync, replacement, a deleted Item, reopening a sheet, changing crew, updating the vehicle, restarting Foundry and flipping the setting never refill or change an existing ledger. A missing published payload is never invented (the GM specifies it). |
| Used vehicles | The GM determines the remaining ammunition (the GM grant tool and the GM-configuration tools). |
| Implementation | commit 9aa8ea7 -- ledger policy (`vehicle-ammunition-ledger.js`: `initialStockLedger`, `purchasedInitialLedger`, `planStockPurchase`, `planGmGrant`), `vehicle-stock-weapon-items.js` (issued marker `initialAmmunitionIssued`), `VehicleInstallationService.syncWeaponItems`, `VehicleAmmunitionService.gmGrantStartingAmmunition` / `deliverPurchased`; tests p50 |
| Engineering notes (not rules) | Today no published stock group carries a verified single launcher (all stock launchers are GM-configured), so the "included" payload applies to complete families and to future data; the rule is exercised on synthetic complete families in tests. The issued marker is backfilled for existing stock launchers on the first sync after this change. |

- **Revision 44 (2026-11-05):** recorded V-P6C-18.

### V-P6C-19 - Vehicle-sheet ammunition shortcuts and Party Fund purchases (OWNER-APPROVED WORKFLOW, 2026-11-05)

| Field | Value |
|---|---|
| Decision ID | V-P6C-19 |
| Classification | Owner-approved project workflow (not RAW) |
| Status | `RESOLVED_PROJECT_WORKFLOW` |
| Resolution | The Combat tab's Buy Ammunition button and each finite-ammunition weapon's Buy Ammo button open the existing SWSE Store in a vehicle-ammunition context (the weapon button preselects its launcher). Payment is Personal Credits (the existing TransactionEngine purchase, immediate) or, only when the existing world setting `holonetPartyFundEnabled` is on, the Party Fund as a REQUEST in the existing GM approval queue (`pendingCustomPurchases`, approvalKind `vehicle-ammunition-party-fund`): nothing is deducted or delivered until a GM approves and the settlement succeeds. Only a GM approves; an owner can request but never approve. Purchased ammunition goes to the launcher RESERVE and is never auto-loaded. |
| Integrity | Settlement: revalidate (fund enabled, requester still a recorded owner, launcher and published price unchanged, balance) -> persisted claim (pending -> settling) -> debit the Holonet Party Fund + ledger entry -> deliver through `VehicleAmmunitionService.deliverPurchased` -> approved. A failed delivery restores the fund (verified); an unprovable restore is preserved as `indeterminate` for GM reconciliation and never retried. Duplicate / concurrent approvals settle once. Disabled fund or insufficient balance leave the request pending. |
| Implementation | commit 9aa8ea7 -- `vehicle-ammunition-shop.js`, `vehicle-ammunition-purchase-service.js`, `PartyFundAccess` (messenger service), `store-vehicle-ammunition.js`, sheet shortcuts, GM approvals surface; tests p51 / p52 / p53 |
| Engineering notes (not rules) | A multi-line basket is bought line by line (each line atomic; checkout stops at the first refusal). There is no GM tool yet to resolve an `indeterminate` request beyond reconciling the fund ledger and the reserve by hand (P6B-D-074). |

- **Revision 45 (2026-11-05):** recorded V-P6C-19.

### V-P6C-20 - Ship logistics: fuel, consumables, docking, maintenance (OWNER-APPROVED INTERPRETATIONS AND PROJECT CONVENTIONS, 2026-11-05)

| Field | Value |
|---|---|
| Decision ID | V-P6C-20 |
| Source | Starships of the Galaxy, printed pp. 10 and 14 |
| Published (implemented as printed) | Fuel 50 cr per fuel-day for a Colossal or smaller starship, x100 per larger size (frigate 5,000; cruiser 500,000; station 50,000,000). One fuel-day is spent by a day of realspace or hyperspace travel, an hour of atmospheric flight or combat, or one jump to lightspeed. Restocking consumables costs 10 cr x living creatures aboard x days (droids are not living creatures for this formula). Docking about 20 cr/day, long-term storage 200 cr/month, routine maintenance (every 20 hyperspace jumps, four fuel-days) are reference prices. Simplified upkeep (p. 10) is an alternative method, never charged in addition. |
| Owner interpretation | The printed Consumables value is the ship's MAXIMUM endurance (source data); the remaining supply is mutable play state; a ship cannot hold more than its maximum (plus certified modifications, the existing Extended Range computation). Fuel and consumables are separate resources. |
| Project conventions | Calendar units use the existing V-P6B-02 policy (a month = 30 days, a year = 365); a fuel-tank capacity is not published, so it exists only as an explicit GM configuration (labeled GM_CONFIGURED) and is never derived from Consumables; consumables are initialized once at vehicle creation to the full printed endurance (an explicit project default, GM override); fuel is never invented (0 until the GM configures a tank); living occupants are the assigned living crew plus GM-recorded passengers, or a GM override -- none established means no purchase; the 10 cr/person/day price is applied at purchase time to the current occupants. |
| Not authorized / not implemented | Automatic docking, maintenance or simplified-upkeep billing; maintenance readiness tracking (no reliable hyperjump record exists); automatic consumable depletion (no dependable campaign clock; the GM adjusts); crew wages (GM-defined contracts, no published formula). |
| Status | `RESOLVED_PROJECT_INTERPRETATION` |
| Implementation | commit 737ecd7 (corrected by the acceptance-corrections commit that follows it) -- `vehicle-logistics.js` (domain), `VehicleLogisticsService` (the only writer of the guarded flag `shipLogistics`), the logistics kind of the Party Fund workflow, store modes `fuel` / `supplies`, the Ship Logistics section of the V2 sheet; tests p54 |

- **Revision 46 (2026-11-05):** recorded V-P6C-20.

- **Acceptance corrections to V-P6C-20 (2026-11-05):** (1) paid resource delivery (`deliverPurchased`) requires a GM caller and the persisted settlement record of that very request (state `settling`, same vehicle, resource, days and price) -- a pending, mismatched or finished request authorizes nothing; initialization has no system bypass: only a GM, or the creating user for a just-created vehicle (`initializeOnCreate`), and only once; (2) the supplies price per day and the basket total are computed by the services; (3) fuel event ids are service-issued (`fe_<clock>_<rand>`) and idempotency is permanent: a bounded window of recent ids plus a floor (the newest dropped id time) refuses any replay, however old.
- **Final integrity checks on V-P6C-20 (2026-11-05):** (a) a Party Fund settlement delivers fuel or consumables at most once, including repeated or concurrent calls while the request is still `settling`: the request id is recorded in the SAME write as the delivery (bounded window + floor by request time); (b) fuel-event idempotency, stated precisely: **no event id is ever processed twice**; ids are issued newer than everything the state has recorded (so a backward clock or the same millisecond never makes a new event look old); an id that was issued but never used is refused only if more than 200 later events have been processed since (reason `FUEL_EVENT_STALE_REISSUE`: issue a fresh id) -- it is never replayed and never a double spend.

### V-P6C-21 - Stock launchers: does a printed Payload line alone establish a canonical ammunition pool? (QUESTION, 2026-11-05)

| Field | Value |
|---|---|
| Decision ID | V-P6C-21 |
| Rules domain | Vehicle weapons (finite ammunition, stock statblocks) |
| Feature | Stock missile / torpedo / launcher groups with a printed Payload line |
| Source | Core Rulebook and Starships of the Galaxy statblocks ("Payload 12 medium concussion missiles", recorded as `armament.carriedPayloads`); Starships of the Galaxy pp. 45-46 (launcher capacities) |
| Evidence | The statblock prints how many missiles or torpedoes the vehicle carries (the Payload line) and names the ammunition. It prints NO launcher count and no magazine. The magazine sizes (for example a proton torpedo launcher holds three) are published as properties of the launchers a ship BUYS (SotG pp. 45-46); the stock statblocks do not state how many launchers a group has. |
| Confirmed behavior | The Payload is printed. The launcher is identified by its exact printed designation for the groups listed below (payload and identity are now reconciled from the record: 63 groups on 63 vehicles; 52 of them are blocked by nothing else). |
| Unresolved question | Whether a printed Payload alone defines the vehicle's ammunition pool for execution (every carried round may be launched, with no launcher count, magazine or reload step modeled), or whether the number of launchers must also be established before the ammunition ledger runs (the current behavior: a GM certifies the count, reported as GM_CONFIGURED_EXECUTABLE and never counted as canonical). |
| Options | (1) The Payload is the pool; no magazine / reload modeling for stock groups. (2) The launcher count is required (a GM certifies it; or a source prints it). Both are supported by the evidence above; neither is chosen here. |
| Recommended ruling | None |
| Implementation impact | Option 1 would make up to 63 stock groups executable canonically (52 with no other blocker); option 2 keeps them GM-configured. No code path changes until a ruling. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 47 (2026-11-05):** appended V-P6C-21 (with the payload / designation reconciliation that narrowed it to the single launcher-count fact).

### DROID-RD-001 - Stabilized Mount: base appendage instance, or a fitting on a tool appendage? (QUESTION, 2026-11-06)

| Field | Value |
|---|---|
| Decision ID | DROID-RD-001 |
| Rules domain | Droid systems (appendage classification) |
| Feature | Stabilized Mount (catalog id `mount`; a request for `stabilized-mount` resolves to it by name) |
| Source | Core Rulebook, droid appendages section (printed page 190 per the repository's earlier source review; this session read the OCR only: "For five times the listed cost and weight, a tool appendage can be stabilized so that it can hold a larger weapon ... as if wielded in two hands") |
| Evidence | The printed text describes the stabilized mount as something a TOOL appendage is given. The catalog (`scripts/data/droid-systems.js`, `appendages[]`) lists it among the BASE appendages with `canManipulate:false` and `canAttack:false`, and the E2A droid appendage projection (`droid-appendage-projection.js`) already reports every `slot:'appendage'` record as an appendage record. The catalog price and the component's Gate A source-review status (PASS) are not disputed here. |
| Confirmed behavior | The component is purchasable today; it never becomes a manipulator (`canManipulate:false`); it grants no extra attack or action. |
| Unresolved question | Whether a stabilized mount is (a) its own physical appendage instance, as the catalog files it, or (b) a fitting on an existing tool appendage (which would require a host appendage instance of kind `tool`, and would not be a limb or an appendage record at all). |
| Options | (a) Keep the catalog classification: a purchased mount mints a physical-appendage instance with `canManipulate:false`. (b) Reclassify it as a fitting that requires a `tool` host instance (`requiresAppendage: ['tool']`), stored in `droidSystems.appendageEnhancements`. Both readings are supported by the evidence above; neither is chosen. |
| Recommended ruling | None |
| Implementation impact | Gate C-1 follows the repository's existing classification (a) so that no behavior changes without a ruling; this is pinned by `tests/droid-gate-c1-appendage-instances.test.mjs` section 16b. Option (b) is a catalog change (`requiresAppendage`) plus removal of `mount` from the base-appendage predicate's reach. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### DROID-RD-002 - Telescopic Appendage: which appendages can it be fitted to? (QUESTION, 2026-11-06)

| Field | Value |
|---|---|
| Decision ID | DROID-RD-002 |
| Rules domain | Droid systems (appendage enhancements, host kinds) |
| Feature | Telescopic Appendage (Gate A source review: PASS) |
| Source | Core Rulebook, droid appendages (printed page 190 per the repository's source review) and the accessory price table ("Telescopic appendage: appendage cost x 2; weight (normal weight x 2) kg"); Scavenger's Guide to Droids and Galaxy at War stock droid statblocks print "telescopic appendage (1 hand)" and "2 telescopic tool appendages". OCR read this session; the PDF page was not inspected. |
| Evidence | The text says the droid "has an appendage that reaches farther from its body" with twice the normal reach for its size; the table prices it from the cost and weight of the appendage it is fitted to. Stock statblocks show it fitted to a hand and to tool appendages. No located source restricts the host kind. The catalog entry carries no `requiresAppendage`, and the shared quote authority needs the host appendage's price (`appendageBaseCost` / `appendageBaseWeight`) which no consumer supplies, so the component is currently fail-closed (unpurchasable). |
| Confirmed behavior | The price and weight are functions of the host appendage's price and weight; Reach is doubled. It does not add actions or attacks. |
| Unresolved question | Whether "an appendage" is unrestricted across every base-list appendage record (hand, claw, tool, instrument, probe, and the catalog's `mount`), or limited to some of them. |
| Options | Unrestricted across all base-list appendage records (the literal text); a restricted set (no source located that names one). |
| Recommended ruling | None |
| Implementation impact | Gate C-1 supplies the host binding (a ledger-derived `selectedAppendage`); wiring the host-priced quote for this component waits on this answer so a host kind is not invented. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### DROID-RD-003 - Upgrade Workshop hard-codes a 10-system cap on a droid's installed ledger (QUESTION, 2026-11-06)

| Field | Value |
|---|---|
| Decision ID | DROID-RD-003 |
| Rules domain | Droid systems (installation capacity) |
| Feature | `UpgradeService.getSlotUsage` for `droid-actor` records (`max: 10`) and its use in the Workshop's apply gate (`hasSlots`) |
| Source | Core Rulebook droid systems (pp. 188-197) as summarized by the repository's own source review (`docs/audits/droids/SWSE_Droid_Rules_to_Schema_v0_15.md` sections 1 and 5: "No generic numeric pool of droid system/component slots is established"; appendages: "any number", Core p. 190). OCR / repository review only. |
| Evidence | The Workshop counts every `system.installedSystems` entry against a constant 10 and disables applying an 11th. The Garage (`DroidCustomizationEngine`) enforces no such cap. Since Gate C-1 each physical appendage is its own ledger entry, so a droid with several appendages reaches the Workshop cap sooner. |
| Confirmed behavior | The repository's source review found no printed universal slot budget for droid systems and states that none should be invented. The cap is Workshop-only display/apply gating. |
| Unresolved question | Whether the Workshop's constant 10 should be removed for droid records (consistent with the source review) or retained as a project convention. |
| Options | Remove the cap for `droid-actor` records. Keep it as a deliberate project convention (it would then count physical components, as it now does). |
| Recommended ruling | None |
| Implementation impact | None until ruled; no code was changed for this. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 48 (2026-11-06):** appended DROID-RD-001, DROID-RD-002 and DROID-RD-003 (Gate C-1 appendage instance identity work).

### CF-RD-001 - Class features whose printed text could not be read (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-001 |
| Rules domain | Class features (non-Force contract, Wave A) |
| Feature | Tough as Durasteel (Martial Arts Master), Fugitive (Outlaw), Mark (Assassin), Score (Charlatan), No Tools Required (Improviser) |
| Source | Galaxy at War; Scum and Villainy; Rebellion Era Campaign Guide. Printed pages not verified. |
| Evidence | The repository OCR text has no legible rule text for these features. Only the registry paraphrase (`data/class-features.json` `sourceText`) exists, which is not a printed source. |
| Confirmed behavior | Feature names and owning classes only. |
| Unresolved question | The exact printed wording (levels, bonus values, action costs, scaling, limits). |
| Options | None. This is a source-access gap, not a ruling choice. |
| Recommended ruling | None |
| Implementation impact | All five blocked until the printed text is supplied. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-002 - Veteran Privateer: which attack rolls? (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-002 |
| Rules domain | Class features |
| Feature | Veteran Privateer (Master Privateer) |
| Source | Force Unleashed Campaign Guide (OCR). Page not verified. |
| Evidence | OCR says "When you make an attack roll, as a free action you can grant yourself a +2 competence bonus on that attack roll", uses per encounter = one-half class level, rounded down. The contract and registry say "melee attack roll". |
| Confirmed behavior | Free action, +2 competence, floor(class level/2) uses per encounter. |
| Unresolved question | Whether the bonus applies to all attack rolls (OCR) or only melee (contract/registry). |
| Options | All attack rolls (OCR wording); melee only (contract/registry wording). |
| Recommended ruling | None |
| Implementation impact | Attack-roll eligibility filter blocked. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-003 - Independent Spirit: scope of the reaction (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-003 |
| Rules domain | Class features |
| Feature | Independent Spirit (Independent Droid) |
| Source | Force Unleashed Campaign Guide (OCR). Page not verified. |
| Evidence | OCR: at 2nd level, once per encounter, as a reaction, a morale bonus to any defense score (your choice), equal to one-half class level rounded down. Registry adds "against a single skill check or attack roll". The OCR gives no duration. |
| Confirmed behavior | Once per encounter, reaction, morale bonus, any defense, floor(level/2). |
| Unresolved question | How long the bonus lasts and whether it is limited to one incoming check or attack. |
| Options | Limited to a single incoming roll (registry); duration unspecified in the printed text located. |
| Recommended ruling | None |
| Implementation impact | Bonus expiry blocked. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-004 - Unflinching: bonus size and uses (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-004 |
| Rules domain | Class features |
| Feature | Unflinching (Gladiator) |
| Source | Knights of the Old Republic Campaign Guide (OCR). Page not verified. |
| Evidence | OCR: at 2nd level, once per encounter, add gladiator level to Fortitude Defense (and damage threshold) or Will Defense until the start of your next turn, as a reaction; declare before the outcome is known; one additional use per encounter at each even-numbered level thereafter. Registry and contract say half-level uses and a half-level scaled bonus. |
| Confirmed behavior | Reaction, choice of Fortitude (with damage threshold) or Will, duration to start of next turn, declare before outcome. |
| Unresolved question | Bonus = full gladiator level (OCR) vs scaled (registry); use count rule (OCR "one additional use at each even level" vs registry "half level"). |
| Options | OCR wording; registry wording. |
| Recommended ruling | None |
| Implementation impact | Bonus value and uses blocked. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-005 - Surprise Attack: legibility of the bonus timing (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-005 |
| Rules domain | Class features |
| Feature | Surprise Attack (Vanguard) |
| Source | Clone Wars Campaign Guide (OCR). Page not verified. |
| Evidence | OCR is garbled: "first attack roll in 4 round against that target equal to one-half your class level". Registry reads "first attack roll in a round". |
| Confirmed behavior | Target unaware or denied Dex to Reflex; bonus = one-half class level. |
| Unresolved question | Confirm "in a round" from the printed page. |
| Options | None beyond reading the printed page. |
| Recommended ruling | None |
| Implementation impact | Round-reset logic blocked pending the printed wording. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-006 - Vehicle Dodge: stacking (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-006 |
| Rules domain | Class features |
| Feature | Vehicle Dodge (Ace Pilot) |
| Source | Core Rulebook (OCR). Page not verified. |
| Evidence | OCR: dodge bonus to Reflex Defense of any vehicle you pilot, one-half class level rounded down; Dex-bonus loss also loses dodge bonuses; "dodge bonuses stack with each other, unlike most other types of bonuses". The contract says "no double stacking". |
| Confirmed behavior | Bonus size, piloted vehicle, lost with Dex-bonus loss, dodge bonuses stack. |
| Unresolved question | Whether the contract's "no double stacking" means no duplicate application of the same feature, or contradicts the printed dodge-stacking rule. |
| Options | Dodge bonuses stack generally (printed); one instance of this feature only. |
| Recommended ruling | None |
| Implementation impact | Stacking policy blocked. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

- **Revision 49 (2026-11-07):** appended CF-RD-001 through CF-RD-006 (class-feature contract Wave A preflight).

### CF-RD-007 - Score: no "after the target has acted" requirement? (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-007 |
| Rules domain | Class features |
| Feature | Score (Charlatan) |
| Source | Scum and Villainy p.32, as summarized by the independent print review. Not re-read by the implementer (OCR unreadable). |
| Evidence | Familiar Foe and Targeted Suspect print "cannot use this ability until after your opponent has acted". The review's wording of Score gives a full-round observation of one target and Deception rerolls keeping the better result, with no such gate. |
| Confirmed behavior | Full-round action observing one target; Deception rerolls against that target through encounter end; keep the better result. |
| Unresolved question | Confirm from the printed page that Score has no "target has acted" requirement. |
| Options | No gate (the review's wording, implemented); the same gate as the other two observation features. |
| Recommended ruling | None |
| Implementation impact | `OBSERVATION_FEATURES['charlatan.score'].requiresActed` (one flag). |
| Status | `IMPLEMENTED_PER_PRINT_REVIEW` (owner confirmation requested; one-flag change if the printed page differs) |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-008 - Executive Leadership: which turn does "until the end of their turn" cover? (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-008 |
| Rules domain | Class features |
| Feature | Executive Leadership (Corporate Agent) |
| Source | Knights of the Old Republic Campaign Guide, Corporate Agent (OCR; page not verified) |
| Evidence | Swift action, as many times per encounter as half the Corporate Agent level; an ally within line of sight gains, until the end of their turn, one of: +2 squares base speed, +2 morale bonus on attack rolls, or +2 morale bonus to all defenses (the Agent's choice). |
| Confirmed behavior | Swift action; floor(level/2) uses per encounter; one of three listed benefits; morale bonuses; ally in line of sight. |
| Unresolved question | Which of the ally's turns the benefit covers when the Agent acts during the ally's own turn, after the ally's turn, or before it in the round. |
| Options | The ally's next turn; the ally's current turn if it has not ended; the remainder of the round. Only the printed phrase supports any of these; none is stated. |
| Recommended ruling | None |
| Implementation impact | Effect expiry for Executive Leadership is blocked; nothing is built. |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

### CF-RD-009 - Master of Movement under Athletics consolidation (QUESTION, 2026-11-07)

| Field | Value |
|---|---|
| Decision ID | CF-RD-009 |
| Rules domain | Class features / house rules |
| Feature | Master of Movement (Melee Duelist) |
| Source | Knights of the Old Republic Campaign Guide (OCR); the world setting that consolidates Jump/Acrobatics/Climb/Swim into Athletics |
| Evidence | The printed reroll applies to "a single Jump or Acrobatics check". With consolidation ON, requested Jump/Acrobatics rolls are executed as Athletics. |
| Confirmed behavior | Jump and Acrobatics checks qualify. |
| Unresolved question | Whether a roll made as a generic Athletics check (never requested as Jump or Acrobatics) qualifies. |
| Options | Only checks requested as Jump or Acrobatics (implemented, fail-closed); any Athletics check. |
| Recommended ruling | None |
| Implementation impact | `isMasterOfMovementRerollSkill` (one list). |
| Status | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |
