# SWSE Architecture Audit — Independent Verification of Phase 1–3 Refactor

> **RESOLUTION (Phase 4).** This document is a point-in-time audit. The runtime
> monkey-patch stack it describes as *active* has since been removed: the seven
> `…-finalizer-patch.js` files were folded directly into `ProgressionFinalizer` and
> deleted, `squad-actions-init.js` no longer activates them, the dead
> `ProgressionMetadataPlanBuilder` was fixed (its missing import repointed) and wired
> in, and the divergent `ClassPlanBuilder` is documented as intentionally not wired
> (class stays inline). See `docs/architecture/progression-architecture.md` for the
> current design. The findings below are retained as the historical record that
> motivated that work — treat them as *addressed*, not current.

**Scope:** Adversarial verification of the Phase 1 (schema authority), Phase 2 (combat
math SSOT), and Phase 3 (ProgressionFinalizer decomposition) work on branch
`claude/swse-architecture-audit-elqhfu`.

**Posture:** Attempt to disprove quality. Every claim below is anchored to a file/line.

**Headline verdict:** Phase 2 is genuinely good. Phase 1 is mostly honored in the write
path but leaves a schema-level competing authority. **Phase 3 is not a decomposition — it
is an additive runtime-redirection layer built on top of an untouched monolith.** Two of
eight builders are dead code, activation is coupled to an unrelated talent macro, and the
original logic was never removed.

---

## Method

- Read all eight plan builders and all seven finalizer patches.
- Traced the import graph for activation (who registers the patches).
- Diffed `main..HEAD` to measure what was actually removed vs. added.
- Grepped the finalizer for retained inline copies of each "extracted" domain.
- Verified the ActorEngine apply boundary and the combat-math delegation.

---

## Quantitative smoking gun

A real decomposition removes logic from the monolith. This one does not:

| Artifact | Before (`main`) | After (`HEAD`) | Delta |
|---|---|---|---|
| `progression-finalizer.js` | 3270 lines | 3331 lines | **+63 / −2** |
| New builders (8 files) | — | 1711 lines | pure addition |
| Whole refactor | — | — | +25,652 / −1,567 |

The "giant ProgressionFinalizer" **grew** during its own decomposition (`git diff --stat
main..HEAD -- .../progression-finalizer.js` → 63 insertions, 2 deletions). The builders are
1,711 lines layered *beside* an untouched 3,331-line monolith that still contains every
domain it supposedly gave up.

---

## Phase 1 — Schema Authority

**Mostly honored, one real gap.**

- **Good:** `ActorEngine` treats `system.abilities.*` as a *read-only compatibility mirror
  rebuilt from `system.attributes` on every derive*
  (`scripts/governance/actor-engine/actor-engine.js:4200`, `:4232`, `:4152–4163`). Reads
  fall back attributes → abilities; writes go to `system.attributes.*.base`. Derived totals
  live on `system.derived.attributes.*`. A guardrail exists
  (`tools/check-ability-schema-authority.mjs`) and it flags new legacy write sites.
- **Weakness (Medium):** `template.json` still declares a **full writable** `system.abilities`
  schema — `base`, `racial`, `temp`, `total`, `mod` for all six abilities
  (`template.json:48–91`) — sitting alongside the canonical `system.attributes`
  (`template.json:92–129`). Two writable persisted `.base` fields for the same concept is a
  competing authority *at the persistence layer*. The guardrail explicitly allowlists
  `template.json` (`check-ability-schema-authority.mjs` `ALLOWLIST: /^template\.json$/`), so
  the one place the duplication still lives is the one place the check refuses to look.
  "Single persistent authority" is currently enforced by *convention + derive-rebuild*, not
  by schema. A raw `update({'system.abilities.str.base': …})` is still schema-valid.

**Verdict:** No live writable drift in system code, but the duplicate schema is real and the
guardrail's own allowlist hides it.

---

## Phase 2 — Combat Math SSOT

**Genuinely good. This is the strongest part of the work.**

- `computeAttackBonus` → `resolveAttackBonus(...).total`
  (`scripts/combat/utils/combat-utils.js:48–51`).
- `computeDamageBonus` → `resolveDamageBonus(...).total`
  (`scripts/combat/utils/combat-utils.js:235–237`).
- Both are thin, truly-delegating compatibility wrappers — no retained parallel math.
- Roll sites consume the canonical resolvers directly: `attacks.js:226,381,450,453`,
  `damage.js:180`. Canonical math lives in one place
  (`scripts/engine/combat/combat-roll-math.js:336,426`).
- A guardrail (`tools/check-combat-math-ssot.mjs`) backs it.

**Minor note (Low):** `attacks.js:226` adds fighting-defensively + situational modifiers on
top of `resolveAttackBonus().total` at the roll-invocation site. A tooltip that renders the
bare resolver total will differ from the actual d20 bonus by those roll-time situationals.
Defensible (they are per-invocation), but it means "tooltip math == roll math" is only true
before situational inputs.

---

## Phase 3 — ProgressionFinalizer "Decomposition"

This is where the audit fails the work. The technique is not extraction; it is
**runtime monkey-patching that clobbers the monolith's output while leaving the monolith
intact.** Two patterns are used.

### Pattern A — "clobber" (ability, species, skills, economy, metadata)
The patch wraps `_compileMutationPlan`, calls the **original** (which still computes the
whole domain inline), then **deletes those keys and reassigns from the builder**:

```js
const plan = await originalCompileMutationPlan.call(this, ...); // original STILL runs
removeInlineAbilitySetKeys(plan.set);   // throw its work away
Object.assign(plan.set, abilitySet);    // replace with builder's
```
(`ability-score-finalizer-patch.js:59–67`; identical shape in species/skills/economy/metadata.)

Consequence: the finalizer's inline implementation **still executes on every finalize**, its
output is computed and discarded, and the file still contains the full competing code
(`progression-finalizer.js:1111–1142` writes `system.attributes.*.base`,
`abilityIncreaseHistory`, `lastAbilityIncrease`; `_compileSingleStepAttributeSet` at `:466`
is a full duplicate that the patch shadows at `:70`). This is duplication + wasted
computation + divergence risk, not ownership transfer.

### Pattern B — "strip and merge" (feat/talent, force)
The patch strips its own selections, delegates the remainder to the original, and merges
(`feat-talent-finalizer-patch.js:63–79`). Cleaner, but the finalizer **still contains a
near-verbatim copy** of the grant loop it is bypassing: Block & Deflect expansion,
repeatable detection, acquisition metadata, session markers all still live inline at
`progression-finalizer.js:2842–3185` and duplicate `feat-talent-plan-builder.js` almost
line-for-line. Only the small helpers (`_isRepeatableTalentEntry`,
`_expandCombinedTalentGrantEntries`) are re-pointed to the builder; the main loop is a
duplicate.

### Per-builder findings

- **AbilityScorePlanBuilder** — Wired (clobber). Side-effect free. **But** the finalizer
  retains the full inline ability writer (`:1111–1142`, `:466–511`), so the domain is *not*
  owned — it is shadowed. Ability increase history/bookkeeping exists in both places.
  Regression risk below.
- **ClassPlanBuilder** — **DEAD CODE.** `class-plan-builder.js` exists (170 lines) but there
  is **no `class-finalizer-patch.js`**, and `ClassPlanBuilder` is imported nowhere
  (`grep -rn ClassPlanBuilder` → only its own file). Commit history confirms it was "added"
  but never "wired"/"registered" (contrast every other builder's paired Wire/Register
  commits). Class history, class levels, class item updates, and class grants are **still
  entirely owned by the finalizer** (`_buildClassLevelsAfterLevelUp`,
  `_compileClassAutoGrantItems`, `_compileClassStarterEquipmentItems` at `:967,1176,1376,1382`).
  The class domain was never decomposed.
- **FeatTalentPlanBuilder** — Wired. Side-effect free (reads compendia via
  `ProgressionContentAuthority`). Grant/repeatability/Block&Deflect/acquisition logic is
  **duplicated** with the retained finalizer copy (`:2842–3185`).
- **ForcePlanBuilder** — Wired (strip-and-merge on the *same* method feat/talent patches),
  covers powers/regimens/techniques/secrets and mastery helpers. Force logic still lives in
  the finalizer (bypassed, not removed). A **separate** third patch
  (`progression-finalizer-force-knowledge-patch.js`) also mutates force post-apply state —
  three layers now touch the force domain.
- **SkillsLanguagesPlanBuilder** — Wired (clobber). Canonical normalization, language
  merge, class-skill unlock, Skill Focus present. The finalizer's inline skill/language
  keys are stripped (`removeInlineSkillLanguageKeys`) but the producing code remains.
- **SpeciesBackgroundPlanBuilder** — Wired (clobber). Additionally has to *reverse-engineer
  and delete* the monolith's own species-granted natural-weapon items after the fact
  (`species-background-finalizer-patch.js:removeMatchingNaturalWeaponItems`) — a patch that
  exists purely to undo the untouched original's side output. Strong evidence the original
  was never removed.
- **ProgressionEconomyPlanBuilder** — Wired (clobber). HP/credits/force points/ledgers.
  Economy is *not* single-source: the finalizer still computes all economy keys, then the
  builder overwrites them (`progression-economy-finalizer-patch.js` `ECONOMY_SET_KEYS`).
- **ProgressionMetadataPlanBuilder** — **DEAD CODE.**
  `progression-metadata-finalizer-patch.js` is imported **nowhere** (it is the only patch
  missing from `squad-actions-init.js:6–12`). Receipts, timestamps, completion flags, and
  session metadata are still produced solely by the finalizer's inline code. The Phase 3
  metadata builder never runs.

---

## Runtime Patch Audit — is it safe?

**No. Multiple hazards, one of them severe.**

1. **Activation is coupled to an unrelated feature (CRITICAL).** All six *live* finalizer
   patches are registered as an import side-effect of
   `scripts/talents/squad-actions-init.js:6–12` — a module whose stated job is "Exposes a
   macro menu for Squad Actions talent (followers)." The entire Phase 3 architecture turns
   on only because `index.js:60` imports that talent macro. Delete or refactor the Squad
   Actions feature and the whole progression decomposition silently deactivates — with no
   error, because the finalizer's retained inline logic takes over seamlessly. This is a
   hidden dependency of the worst kind.
2. **Dead registration (HIGH).** The metadata patch is not in that import list, so it never
   registers. `ClassPlanBuilder` has no patch at all. Two of eight builders are inert and
   nothing signals it.
3. **Ordering fragility (HIGH).** Five patches monkeypatch the *same* static method
   `_compileMutationPlan`; feat/talent + force patch the *same* `_compileProgressionAbilityItems`.
   Correctness depends on registration order (import order in `squad-actions-init.js`).
   Post-processing runs innermost-first, so which builder sees the entitlement manifest, and
   which builder's merge wins, is decided by an import ordering with no guard. Reorder the
   imports and behavior changes silently.
4. **Idempotency by ad-hoc flag.** Each patch guards with `__swse*Patch === PATCH_ID`. Fine
   until two module instances load (dev vs. `/systems/...` absolute paths already coexist in
   the codebase), at which point the guard can miss and double-wrap.
5. **No test coverage.** `package.json` has no test runner; there are no unit/spec files for
   any builder or patch. The only safety net is custom `tools/check-*.mjs` scripts, and
   **none of them know these patches exist** (`grep` for `finalizer-patch`/`metadata`/
   `squad-actions` in the boundary/integrity checkers → nothing). The dead-metadata and
   dead-class defects are invisible to CI.

**Would it survive future maintenance?** No. A maintainer touching Squad Actions, reordering
imports, or "cleaning up unused" `ClassPlanBuilder`/`ProgressionMetadataPlanBuilder` would
alter or silently disable finalization with zero test feedback.

---

## ProgressionFinalizer — remaining responsibilities

The finalizer still *owns* (not just orchestrates):

- The entire **class** domain (levels, history, auto-grants, starter equipment).
- **Metadata** (receipts, timestamps, completion flags) — builder is dead.
- A full retained **duplicate** of ability, skills, languages, species, economy, feat,
  talent, and force compilation (executed then clobbered/bypassed).
- Legitimate orchestration: session→selection normalization, single-step dispatch
  (`:436`), plan assembly, transactional apply (`_applyMutationPlan` → `ActorEngine`),
  and `_syncPostApplyState`.

Only the orchestration pieces *should* remain. Everything else is either duplicated dead
weight or an undelivered builder.

---

## ActorEngine Audit

- **Good:** No builder mutates actors, creates items, or updates documents — verified by
  grep across all `*plan-builder.js` (only doc-comment matches). Builders are pure
  `selection → plan fragment`.
- **Good:** The finalizer applies through `ActorEngine.applyMutationPlan`, transactional
  with rollback (`_applyMutationPlan`, `progression-finalizer.js:196–205`).
- **Weakness (High):** "ALL builders feed ONE mutation plan" is violated. After the
  transactional plan commits, `_syncPostApplyState` performs a **second, non-transactional**
  write via `engine.updateActor(actor, {...})`. It routes through ActorEngine (so "nothing
  bypasses ActorEngine" is technically intact), but force/post-apply ledgers land in a
  separate write outside the rollback boundary. If it fails, the first plan is already
  committed — the half-applied-character guarantee the transactional apply advertises is
  broken for post-apply state.

---

## Final Grade

### Strengths (genuinely improved)
- Combat math is a real SSOT with delegating wrappers and a guardrail (Phase 2).
- Ability write-path authority is canonical (`system.attributes`) with a read-only mirror.
- Builders are honestly side-effect-free and respect the "no direct document mutation" rule.
- The ActorEngine apply is transactional with rollback for the main plan.
- Guardrail tooling (`check-*.mjs`) exists for math, boundaries, integrity.

### Weaknesses
- Phase 3 removed essentially nothing from the monolith (+63/−2); it duplicated it.
- Activation coupled to `squad-actions-init.js` (unrelated talent macro).
- Ordering-dependent stacked monkeypatches on shared static methods.
- `template.json` retains a competing writable `system.abilities` schema; guardrail
  allowlists it.
- Post-apply state escapes the transactional boundary.
- Zero automated test coverage for the new architecture.

### Bugs
1. **Dead metadata builder** — `ProgressionMetadataPlanBuilder` never registers (patch
   imported nowhere). Phase 3 metadata decomposition does not run.
2. **Dead class builder** — `ClassPlanBuilder` never wired (no patch, no import). Phase 3
   class decomposition does not exist.
3. **Ability single-step regression (Plausible)** — Patched `_compileSingleStepAttributeSet`
   computes `mode='levelup'` when `attr.increases` is present
   (`ability-score-finalizer-patch.js:71`), but `AbilityScorePlanBuilder.buildSet` only takes
   the level-up branch when **also** `attr.mode === 'levelup-ability-increase'`
   (`ability-score-plan-builder.js:146`). A caller passing `increases` without that exact
   `mode` string falls through to `buildChargenSet` → empty set → `assertNonEmptyAbilitySet`
   throws "Choose at least one ability score increase." The original method accepted
   `increases` alone (`progression-finalizer.js:466`, `isIncreaseMode = … || !!attr?.increases`),
   so this is a behavioral regression for that call shape.

### Duplication (still present)
- Ability score compilation: builder + finalizer `:466–511`, `:1111–1142`.
- Feat/talent grant loop: builder + finalizer `:2842–3185`.
- Force compilation: builder + finalizer inline + force-knowledge patch (triple).
- Skills/languages, species, economy: builder + retained finalizer producers (clobbered).

### Suggested Improvements (prioritized)
- **Critical:** Move patch registration out of `squad-actions-init.js` into an explicit,
  ordered progression bootstrap module imported directly by `index.js`. Make order explicit.
- **Critical:** Either wire `ProgressionMetadataPlanBuilder` and `ClassPlanBuilder` (add
  their patches to the bootstrap) or delete them. Do not ship dead builders that imply
  coverage that does not exist.
- **High:** Actually delete the finalizer's inline domain code once each builder is proven
  canonical. Until the monolith shrinks, this is duplication, not decomposition. Replace the
  monkeypatch-and-clobber with the finalizer *calling* the builders directly.
- **High:** Bring `_syncPostApplyState` inside the transactional plan (single mutation plan)
  or document why post-apply is intentionally non-atomic.
- **High:** Add automated tests around plan compilation (at least: each builder registers;
  compiled plan matches golden fixtures for chargen + level-up).
- **Medium:** Reconcile `template.json` — reduce `system.abilities` to a non-writable/mirror
  shape or remove `.base`, and stop allowlisting it in the schema guardrail.
- **Medium:** Fix the ability single-step mode dispatch to accept `increases` alone.
- **Low:** Document the roll-time situational augmentation so tooltip parity is unambiguous.

### Grades
| Dimension | Grade | Basis |
|---|---|---|
| Architecture | **C−** | Good intent; delivered as redirection over an untouched monolith. |
| Maintainability | **D+** | Hidden activation coupling, ordering-dependent patches, no tests. |
| Extensibility | **C** | Builders are clean seams *if* they become the real owners. |
| Separation of Concerns | **C** | Builders pure and boundaried; monolith still owns everything. |
| Technical Debt | **D** | Debt increased: two implementations per domain + 2 dead builders. |

---

## Would I keep this architecture or redesign parts of it?

**Keep the target design; redesign the mechanism — and finish the job.**

The *intended* architecture (pure domain builders → one mutation plan → `ActorEngine`) is
correct and worth keeping. Phase 2 proves the team can execute a clean SSOT. But the Phase 3
*mechanism* — runtime clobber/strip monkeypatches activated as a side-effect of a talent
macro — must be replaced. The evidence is not speculative:

- The monolith grew during its own decomposition (+63/−2).
- `git grep ClassPlanBuilder` returns only its own file; the metadata patch is imported by
  nothing — two of eight builders are dead.
- Six live patches load only because `index.js:60` imports a Squad Actions macro.
- Every "extracted" domain still has its full implementation inside the finalizer, executed
  and thrown away, or bypassed and left in place.

Concretely I would: (1) convert the builders into direct dependencies the finalizer *calls*
(delete the patches), (2) delete the corresponding inline finalizer code so each domain has
exactly one implementation, (3) wire or remove the two dead builders, (4) pull post-apply
state into the transactional plan, and (5) add golden-fixture tests. Until steps 1–2 land,
this is a monolith with a redirection layer bolted on, and it carries *more* risk than the
code it was meant to clean up.
