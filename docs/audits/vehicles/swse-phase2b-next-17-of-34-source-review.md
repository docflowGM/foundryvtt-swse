# SWSE Vehicle Phase 2B — Next 17 of 34 — Combined Handoff

## Result

- **17 of 17 requested ship source reviews completed**: Scum and Villainy **11/11** (book Phase1 inventory closure) and Core Rulebook **6/10** (checkpoint, four pending).
- Original project census: **299/316 reviewed** (previous 282/316 + 17); **17 Phase1 identities pending**.
- These are publication-specific claims; the 316 denominator is a historical fixed Phase1 roster, not an independently proven book-wide exhaustive count.
- **No strict mechanical certificates** were newly issued. Source close-read is distinct from production field/mount/arc certification.
- **No repo push**, branch mutation, Phase1 rewrite, or production compendium changes occurred.

| Area | Scum and Villainy | Core Rulebook, checkpoint 1 | Tranche |
|---|---:|---:|---:|
| Existing Phase1 ships | 11 | 10 | 21 |
| New source-reviewed ships | 11 | 6 | **17** |
| Still pending in covered books | 0 | 4 | 4 |
| Source-checked weapon attack groups | 21 | 15 | **36** |
| Discovery-only schema cases | 32 | 23 | **55** |
| Published source conflict records | 1 | 2 | **3** |
| Additional complete statblock not in Phase1 | 1 | 0 | **1** |
| Strict certificates | 0 | 0 | 0 |

## High-priority findings

1. **Census discovery**: Tenloss Corporation **Hornet-class Interceptor, printed p. 125, CL 12** has its own complete starship statblock in *Scum and Villainy* but is absent from the immutable 11-entry Scum Phase 1 roster. Record it as a discovery-only reconciliation candidate. Do not silently add it to the production set or mark it strict-certified.
2. **Clutch Ugly Fighter, Scum p.67**: main Ranged line prints ion cannons **+7**, detailed ion cannon weapon line prints **+5**. Preserve both, require source-conflict decision.
3. **ARC-170, Core pp.180–181**: main Ranged/details say **heavy laser cannons**; Atk Options instead says **medium laser cannons**. Preserve both labels.
4. **Droid Tri-Fighter, Core p.181**: main Ranged/details say **laser cannon** while Atk Options says **medium laser cannon**. Preserve both labels.
5. **Variant guardrails**: Three distinct Scum Ugly statblocks (C-wing/Clutch/X-TIE); X-ceptor is a narrative variant without separate CL block. Core X-wing, YT-1300, and Imperial I are separate publication identities from other book versions.
6. **Conditionals**: Eta-2 booster-ring hyperdrive is not intrinsic. Astromech conditional skill values must not be flattened into unconditional bonuses. Weapon battery crew counts are not independent-mount or arc proof.

## Reviews in this tranche

| Book | Printed page(s) | Ship | Attack groups |
|---|---:|---|---:|
| Scum and Villainy | 66 | C-wing Ugly Fighter | 3 |
| Scum and Villainy | 67 | Clutch Ugly Fighter | 2 |
| Scum and Villainy | 64 | Corellian Engineering Corporation YT-1250 Transport | 1 |
| Scum and Villainy | 66 | Corellian Engineering Corporation YT-1930 Transport | 1 |
| Scum and Villainy | 62 | CorelliaSpace Gymsnor-3 Light Freighter | 1 |
| Scum and Villainy | 128 | Errant Venture | 5 |
| Scum and Villainy | 126 | Kaloth-style Battlecruiser | 3 |
| Scum and Villainy | 62 | Kazellis Corporation Light Freighter | 1 |
| Scum and Villainy | 64 | Surronian Conqueror-class Assault Ship | 2 |
| Scum and Villainy | 67 | X-TIE Ugly Fighter | 1 |
| Scum and Villainy | 127 | Y164 Thalassian Slave Transport | 1 |
| Core Rulebook | 180/181 | ARC-170 Starfighter | 3 |
| Core Rulebook | 182/183 | Corellian YT-1300 Transport | 1 |
| Core Rulebook | 181 | Droid Tri-Fighter | 3 |
| Core Rulebook | 180 | Eta-2 Actis Interceptor | 2 |
| Core Rulebook | 183 | Imperial I-class Star Destroyer | 4 |
| Core Rulebook | 178 | Incom T-65B X-wing Starfighter | 2 |

## Deferred / still open

**Next Core Rulebook entries (four):** Koensayr Y-wing Starfighter p.178; TIE Fighter p.179; TIE Interceptor p.179; Vulture-class Droid Starfighter p.180.
Other remaining books in the historical Phase1 roster: Galaxy at War (5), Galaxy of Intrigue (6), Jedi Academy Training Manual (1), Threats of the Galaxy (1); Scavenger's Guide to Droids has no Phase1 ship record. Total remaining **4+5+6+1+1=17**.

## Sources and baseline

- GitHub: `docflowGM/foundryvtt-swse`, branch `audit/vehicle-phase-0-1-canonical-foundation`.
- Remote HEAD checked at start: `49fabf107f287b8147a59b75a9dd09e49ed7426f`; branch identical to its baseline.
- Phase1 provenance Git blob SHA: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`.
- Scum and Villainy source PDF SHA-256: `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`.
- Core source PDF SHA-256: `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`.
- PDF pages rendered from the original scans and visually read. The accompanying DJVU text was not treated as authoritative where corrupted.

## Repository-relative package files

- Three source audit JSON files per book (ledger, mount backlog, discovery-only schema cases).
- One Markdown audit report per book.
- This consolidated handoff report.
- One focused Python validation script.
- No other repository-relative modifications or production changes.

## Validate

```bash
python tools/audits/vehicles/check_scum_core_phase2b_17.py --repo-root . --sav-pdf "/path/to/SAGA EDITION - Scum and Villainy.pdf" --core-pdf "/path/to/Star Wars Saga Edition.pdf"
```
With `--zip-file <path>`, the validator additionally checks the archive contains exactly the intended changed files and passes CRC.
Use optional `--phase1` to verify against the complete Phase1 provenance JSON; in this standalone source run, its Git blob contents were accessed and projected but not embedded into the archive.

