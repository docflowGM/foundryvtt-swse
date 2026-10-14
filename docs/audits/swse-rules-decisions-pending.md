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
