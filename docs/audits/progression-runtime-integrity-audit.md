# Progression Runtime Integrity Audit

**Date:** 2026-07-10  
**Type:** Structural audit / reporting only  
**Runtime status:** Static source inspection only. No Foundry runtime was executed.

## Scope

This audit reviews whether the progression engine has a coherent and safe runtime structure for:

- chargen
- level-up
- multiclassing
- prestige entry
- reconciliation
- rollback-facing finalization risks
- class/species/feat/talent/Force grants
- droid progression
- nonheroic, beast, and follower subtype paths

No runtime code was intentionally changed. The only code added is report-only tooling: `tools/check-progression-integrity.mjs`.

## Method

Static inspection focused on these authority seams:

- `scripts/engine/progression/registries/progression-node-definitions.js`
- `scripts/apps/progression-framework/registries/node-descriptor-mapper.js`
- `scripts/apps/progression-framework/shell/active-step-computer.js`
- `scripts/apps/progression-framework/steps/step-plugin-base.js`
- `scripts/apps/progression-framework/steps/*.js`
- `scripts/apps/progression-framework/shell/progression-finalizer.js`
- `scripts/engine/progression/utils/levelup-entitlement-manifest.js`
- `scripts/engine/progression/utils/levelup-finalization-audit.js`
- `scripts/engine/progression/prerequisites/*`
- droid/nonheroic subtype guards and adapters where statically visible

The audit separates:

```txt
static proof        = code path and authority seam exists
static risk         = code shape can drift or hide failures
runtime proof       = Foundry smoke test confirms real user flow
```

Nothing in this report should be treated as runtime verification.

## Authority map

| Authority | Owns | Static verdict |
|---|---|---|
| `PROGRESSION_NODE_REGISTRY` | Candidate node list, modes, subtypes, dependencies, invalidation metadata | Strong SSOT |
| `node-descriptor-mapper.js` | Node ID to step plugin class mapping | Strong explicit seam |
| `ActiveStepComputer` | Active step derivation and applicability filtering | Strong but high-impact risk point |
| `ProgressionStepPlugin` | Step contract for selection, commit, validation, rendering | Strong contract |
| Concrete step plugins | Domain UI state, list hydration, local selection state, commit behavior | Mixed; requires step-by-step runtime coverage |
| `buildLevelUpEntitlementManifest` | Read-only level-up obligations | Strong B |
| `ProgressionFinalizer` | Canonical draftSelections -> mutation plan -> ActorEngine | Strong B |
| `levelup-finalization-audit.js` | Required-choice and receipt verification after level-up | Strong B for level-up |
| `ActorEngine` | Mutation gateway | Already hardened by architecture PR |

## Progression lifecycle diagram

```txt
PROGRESSION_NODE_REGISTRY
  -> ActiveStepComputer.computeActiveSteps(actor, mode, session, subtype)
      -> mode/subtype candidate filter
      -> activation policy
      -> applicability checks
      -> subtypeAdapter.contributeActiveSteps(...)
      -> final node ordering
  -> node-descriptor-mapper maps node IDs to ProgressionStepPlugin classes
  -> concrete step plugins hydrate options and draftSelections
  -> step validation / blocking issues gate UI navigation
  -> summary or levelup-review dry run
  -> ProgressionFinalizer validates readiness
  -> ProgressionFinalizer compiles mutation plan from progressionSession.draftSelections only
  -> subtypeAdapter contributes mutation plan if present
  -> mutation plan validation
  -> ActorEngine applies set/add/update/delete
  -> level-up finalization audit checks receipts
```

## Step state matrix

See `docs/audits/progression-runtime-integrity-status.json` and refresh it with:

```bash
node tools/check-progression-integrity.mjs
```

Static conclusions:

- The base step contract is strong: concrete plugins are expected to implement `getSelection`, `onItemCommitted`, `validate`, and `getBlockingIssues`.
- The canonical node registry uses `selectionKey` to identify where each node writes in `progressionSession.draftSelections`.
- The centralized mapper explicitly wires node IDs to plugin classes.
- Major choice steps hydrate from `draftSelections`, but many also maintain local committed state for UI responsiveness.

Risk:

- Local step state plus canonical draft state is not inherently wrong, but it is where backtracking, rapid-clicking, and re-render timing bugs tend to appear.
- Survey, summary, review, and null/confirmation-style plugins do not behave like ordinary pickers and need to be excluded from simple "missing commit" interpretations.

## Entitlement matrix

`buildLevelUpEntitlementManifest` covers these level-up obligations:

| Entitlement | Source | Finalizer/audit handling | Bucket |
|---|---|---|---|
| General feat | Character level cadence | `validateLevelUpRequiredSelections` checks count | B |
| Heroic talent | Talent cadence engine | `validateLevelUpRequiredSelections` checks talent count | B |
| Ability increases | Character level 4/8/12/16/20 cadence | Finalizer checks allocation exactly | B |
| Multiclass starting feat | New base class + house rule | Finalizer checks selected starting feat | B |
| Class feat choices | Level progression features | Finalizer checks class-feat selection count | B |
| Force powers | Force suite / class/feat grants | Finalizer checks choice count and receipt | B/C |
| Force techniques | Prestige class level features | Finalizer checks choice count and receipt | B/C |
| Force secrets | Prestige class level features | Finalizer checks choice count and receipt | B/C |
| Medical secrets | Class feature choice | Finalizer checks choice count and receipt | B/C |
| Starship maneuvers | Starship maneuver choice | Finalizer checks choice count and receipt | B/C |
| Automatic class features | Level progression features | Finalizer materializes locked class-feature item | B/C |
| Class skills | Class model/class items | Post-finalization audit checks class-skill receipt | B/C |

Key finding:

The entitlement model is good, but entitlement correctness depends on the active-step layer actually surfacing every required choice step. If applicability filtering suppresses a step with required choices, the finalizer should block, but the user may be left unable to satisfy the requirement without a reconciliation/repair path.

## Prerequisite enforcement matrix

| Domain | Display/filter | Commit layer | Finalization layer | Static verdict |
|---|---|---|---|---|
| Class/prestige | `evaluateClassEligibility` in class step | Class step blocks unavailable commits | Finalizer validates selected class indirectly through manifest/context | B, runtime verify illegal prestige |
| Feats | Feat step + AbilityEngine path | Feat step legality filtering/commit guard | Required counts checked; per-feat legality should be smoke-tested | B/C |
| Talents | Talent step + tree access | Expected commit guard | Required count checked; per-talent legality should be smoke-tested | B/C |
| Force powers | Force step / Force suite | Expected commit guard | Count/receipt checked | B/C |
| Force techniques | Force suite resolution + AbilityEngine | Commit guard expected | Count/receipt checked | B/C, high runtime priority |
| Force secrets | Force suite resolution + AbilityEngine | Commit guard expected | Count/receipt checked | B/C, high runtime priority |
| Droid restrictions | Droid guards | Partial UI filtering | `_validateDroidForbiddenSelections` fail-closes before mutation | B |
| Nonheroic restrictions | Node subtype + dedicated step | Dedicated starting-feats path | Needs runtime confirmation | C |

## Finalizer and mutation map

Strong signals:

- `ProgressionFinalizer` documents itself as the single authoritative seam for converting session state into an ActorEngine mutation plan.
- Finalizer requires `sessionState.progressionSession` and reads from `progressionSession.draftSelections`.
- For level-up, it builds a manifest from selected class and checks required choices before mutation.
- Droid forbidden selections are checked before mutation.
- Document type mismatch is fail-closed.
- Actor mutation is routed through ActorEngine.

Risk:

- The finalizer logs that ActorEngine failure can happen after mutation begins; rollback/restore must be smoke-tested.
- Single-step finalization has a separate mutation-plan compiler and should be smoke-tested separately from full progression finalization.
- Chargen readiness checks are less exhaustive than level-up checks. They validate required class/attributes/credits/droid state, but not every picker domain with the same manifest-style precision.

## Force progression findings

Force progression is structurally present and better than prior bug reports implied, but it remains a high-priority runtime target.

Evidence:

- `force-technique-step.js` resolves entitlements through `force-suite-resolution.js`.
- It builds pending state with class grants for prerequisite evaluation.
- It has special identity handling for Force Power Mastery as a choice-bearing/repeatable technique.
- Level-up manifest and finalization audit both know about `forceTechniqueChoices` and `forceSecretChoices`.

Risks:

- The Force technique step has complex local selection maps and special IDs for Force Power Mastery; this is exactly where duplicate choices and detail-rail hydration bugs can hide.
- Jedi Knight, Jedi Master, Sith Apprentice, Sith Lord, Force Adept, and Force Disciple should all be runtime-smoked because they combine class progression, Force prerequisites, and special item types.

## Droid / nonheroic / follower findings

Strong signals:

- Droid builder is modeled as a species-equivalent identity path.
- Finalizer intentionally skips biological species materialization for droids.
- Droid forbidden selections are validated before mutation.
- Nonheroic has its own `nonheroic-starting-feats` node.
- Registry coverage includes actor, npc, droid, follower, nonheroic, and beast subtypes across relevant nodes.

Risks:

- Subtype adapters can modify active steps after the canonical applicability pass; this is powerful but must be smoke-tested per subtype.
- Nonheroic and beast/follower flows can inherit player/heroic assumptions if not tested.
- Droid class conversion surcharge is step-local/draft-selection sensitive and needs a runtime smoke pass.

## Top systemic risks

1. **Applicability-filter false negatives**: ActiveStepComputer can hide a required step before the user can satisfy finalizer requirements.
2. **Dual state surfaces**: Step-local committed state plus canonical draftSelections can drift during backtracking, re-rendering, or rapid clicking.
3. **Force choice identity complexity**: Force Power Mastery and repeatable Force techniques need runtime duplicate/receipt checks.
4. **Subtype adapter second-pass changes**: Adapters can suppress or add steps after registry filtering.
5. **Single-step vs full-finalizer drift**: Sheet/Holonet single-step jobs use a separate compile path.
6. **Rollback uncertainty**: Finalizer validates before mutation, but ActorEngine failure can still be after partial application.
7. **Chargen validation is coarser than level-up validation**: Level-up has a manifest/audit receipt model; chargen should eventually have equivalent coverage.

## Fastest wins

1. Run the runtime smoke checklist below before broad implementation.
2. Use `tools/check-progression-integrity.mjs` as a baseline report and inspect any HIGH rows manually.
3. Add targeted runtime harness/logging around active step lists vs finalizer required-choice manifest.
4. Smoke-test Jedi Knight/Jedi Master/Sith Apprentice/Sith Lord/Force Adept/Force Disciple Force choices.
5. Smoke-test single-step finalization for feats, talents, Force techniques, Force secrets, and attributes.
6. Add a developer-only diagnostic panel/log that prints: active steps, owed manifest choices, draft selection counts, and finalizer validation errors.

## Recommended implementation batches

### Batch 1 — Runtime smoke and instrumentation

- Add temporary/dev diagnostics for active steps vs owed choices.
- Run the full smoke checklist.
- Fix any false-negative applicability cases before content automation work.

### Batch 2 — Force progression hardening

- Verify Force technique/secret step visibility for all Force prestige classes.
- Confirm detail rail hydration and choose buttons.
- Confirm Force Power Mastery repeatable choice identity/deduping.

### Batch 3 — Droid/nonheroic/follower hardening

- Verify droid standard model surcharge.
- Verify forbidden organic-only selections block before finalization.
- Verify nonheroic starting feat constraints.
- Verify follower/beast active steps are not inheriting irrelevant actor steps.

### Batch 4 — Rollback and single-step parity

- Compare full progression finalization to single-step finalization for the same domain.
- Verify rollback restore under dev/strict mutation enforcement.

### Batch 5 — Optional strict static gate

- Once the audit baseline is accepted, consider enabling `tools/check-progression-integrity.mjs --strict` as a local/dev guard.

## Runtime smoke checklist

1. Level 1 chargen for Jedi, Noble, Scoundrel, Scout, and Soldier.
2. Multiclass into a second base class.
3. Attempt an illegal prestige class; confirm it cannot commit and cannot finalize.
4. Enter a legal prestige class.
5. Jedi Knight gaining Force Technique.
6. Jedi Master / Sith Lord / Force Disciple gaining Force Secret.
7. Force Adept gaining Force Technique.
8. Force Training selecting powers and updating force-power counts.
9. Force Power Mastery chosen more than once with distinct powers.
10. Human species bonus feat path.
11. Species with natural weapon creates usable weapon/attack.
12. Standard-model droid heroic class surcharge.
13. Droid attempts forbidden organic-only Force/feat/talent option.
14. Nonheroic chargen starting feats.
15. Nonheroic level-up.
16. Follower or beast progression if currently exposed.
17. Progression rollback after partially completed level-up.
18. Backtrack through class -> skills -> feats -> talents, change class, and confirm invalid downstream picks clear/recompute.
19. Rapid-click through mentor dialogue and step confirmations.
20. Roll attack, damage, and skill after finalization to confirm derived recalculation.

## Limitations

- No Foundry runtime was executed.
- Static grep/source-shape checks can miss dynamic access.
- The report-only script is intentionally conservative and may flag display-only steps that do not need finalizer consumers.
- This audit does not prove compendium data correctness; it only evaluates progression structure.
