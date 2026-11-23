# Data-quality audit: eight Force Point claims in `data/talent-granted-abilities.json` (2026-11-23)

**Status update (same day, after the owner's direction to run a targeted correction pass):** the correction below WAS applied to `data/talent-granted-abilities.json` only (no pack, code or contract change). Original metadata remains recoverable from git history (parent of the correction commit) and is summarized in the table. Provenance is preserved: every row cites its source. Certification status for all rows: `SOURCE_VERIFIED` only where a repo canonical record **and** the independent reviewer's PDF reading (PR #1171 comment 7108031600, relayed; not re-verified by me against the PDF) agree; nothing here is `MECHANIC_SPECIFIED`, `IMPLEMENTED` or `FOUNDRY_TESTED`.

## How the data is used
`TalentActionLinker` loads the file to build combat-action cards. Nothing reads `cost.forcePoints` as a payment (matrix §13), so none of these entries debits a Force Point. The defect is **player-visible misleading card text**, not a charge.

## Classification
States: `CONFIRMED_BAD_METADATA`, `SOURCE_VERIFIED_SPEND_CANDIDATE`, `UNVERIFIED_IDENTITY`.

| Entry (json id) | Metadata says | Repo canonical record (`packs/`) | Reviewer's printed-source reading | State |
| --- | --- | --- | --- | --- |
| Regain via Force Point (`force-focus`, tree "Jedi Consular") | swift action, 1 FP, regain a power, plus passive half-level UtF bonus and once/encounter regain | `talents.db` Force Focus: full-round action, DC 15 Use the Force, regain one spent power; no tree | Core p.101 same; Core p.96 separately: generic FP expenditure as a reaction regains one Force power | `CONFIRMED_BAD_METADATA` (talent benefits invented). General p.96 FP recovery is a `SOURCE_VERIFIED_SPEND_CANDIDATE` **as its own generic rule, not as this talent**. |
| Acrobatic Recovery | reaction, 1 FP, stand as a free action | `talents.db`: DC 20 Acrobatics check to remain on feet when an effect would knock prone | Core p.40 same | `CONFIRMED_BAD_METADATA` (no FP cost exists) |
| Force Haze | standard action, 1 FP; all creatures within 6 squares make a Will save (DC 15 + Cha) or are dazed | `talents.db`: spend a Force Point as a standard action to create a "Haze" hiding you and allies | Core pp.40-41: 1 FP, standard action, conceal up to class-level creatures, Use the Force vs observers' Will Defense, up to 1 game minute, ends when a hidden creature attacks | Cost/action `SOURCE_VERIFIED_SPEND_CANDIDATE`; effect text `CONFIRMED_BAD_METADATA`. Duration is a measured game-time duration (GM-authoritative clock) if ever automated. |
| Severing Strike | critical hit with a lightsaber, 1 FP reaction, sever a limb | `talents.db`: when lightsaber damage equals or exceeds both current HP and damage threshold, deal half damage... | Core p.218 same; no FP charge | `CONFIRMED_BAD_METADATA` |
| Shien | swift activation, 1 FP, exclusive active form | `talents.db`: +5 ranged attack roll when redirecting a deflected blaster bolt with Redirect Shot | Core p.218 same | `CONFIRMED_BAD_METADATA` (no activation or cost) |
| Enhanced Recovery (`force-point-recovery`, tree "Jedi Master") | once/day reaction after spending a Force Point; spend a second FP to regain 2 | `forcetechniques.db` Force Point Recovery: at end of an encounter, automatically recover 1 Force Point spent during it | Core p.102 same | `CONFIRMED_BAD_METADATA`; also a misclassified tree (a Force technique, not a Jedi Master talent) |
| Improved Dark Rage | when using Dark Rage, spend 1 FP for +2 attack/damage/Fortitude | `forcetechniques.db`: when you use Dark Rage you ignore the restriction on using skills or performing certain actions (text truncated in this read) | Force Unleashed Campaign Guide TXT agrees; **exact printed PDF page not yet visually verified** | `CONFIRMED_BAD_METADATA` against the repo's own canonical record; printed page `UNVERIFIED` |
| Surge of Power | swift, 1 FP, add heroic level to damage of next Force power | **no canonical record found** in `packs/talents.db`, `packs/forcetechniques.db` | no matching published rule found in the searched TXT corpus (absence of evidence, not proof) | `UNVERIFIED_IDENTITY` |

## Decisions
- **No automated Force Point spending is enabled from this metadata for any of the eight.** No contract is added.
- Later canonical implementation candidates (only via proper rules, verified owned identities, typed V2 receipts, tests, GM-authoritative time): generic Core p.96 reaction regain; Force Haze (Core pp.40-41).
- The other six need corrected identities/rules or owner adjudication first.

## Correction applied (2026-11-23)
For the seven entries with a canonical record: `description` is now the canonical pack text verbatim (HTML stripped); `cost`, `trigger`, `alternativeAction`, `specialAction`, `uses`, `roll`, `modifies`, the Shien form-activation fields and `effects` were removed; `actionType` is `passive`; Force-Point/reaction/swift/standard tags were dropped; each carries `metadataAudit.state = CORRECTED_FROM_CANONICAL` with its canonical record and printed source. `linkedAction` ids are preserved (the action linker's mapping lives in `data/talent-action-links.json`, untouched). Surge of Power has no canonical record: its cost, effects and rules text were removed and the card is `UNVERIFIED_IDENTITY` ("UNVERIFIED ... no automation"). **Talent-tree labels were NOT changed** (see open question 2). Guard: `tests/talent-granted-abilities-metadata-guard.test.mjs` fails if any entry carries a Force Point cost outside an (empty) allow-list, if a corrected card diverges from its canonical record, or if Surge of Power regains a cost/effect; mutation-checked. No bonus previously reached a roll from these entries (`Force Focus` `skillBonus` had a non-numeric value the linker ignores), so no computed value changed.

## Open questions for the project owner
1. ~~Approve replacing the cards' text/effects~~ — applied per the owner's correction-pass direction; confirm the result.
2. Reclassify "Force Point Recovery" from a Jedi Master talent card to the Force technique it is?
3. Is `Surge of Power` an intentional house rule or imported/invented metadata?
