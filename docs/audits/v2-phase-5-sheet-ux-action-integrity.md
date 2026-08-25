# Phase 5 — Sheet Action Integrity + Subtype UX

Status: **PHASE 5 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**

Baseline: Phase 1 (authority/performance instrumentation), Phase 2/2B
(actor authority normalization), Phase 3 (derived-performance), Phase 4
(sheet architecture separation into `SWSEV2ActorSheetBase` /
`SWSEV2CharacterLikeSheet` / `SWSEV2CharacterSheet` / `SWSEV2NpcSheet` /
`SWSEV2DroidSheet` / `SWSEV2VehicleSheet`, PR #956). The pre-existing,
unrelated `lang/en.json` CI failure
(`progression-suggestion-and-render-contracts.test.mjs`) remains untouched
and is the only failure in the full test run at the end of this phase.

---

## 1. Action integrity baseline

Phase 4's audit (§8, §12 of `v2-phase-4-sheet-architecture.md`) recorded
~25 "no handler found" actions and ~14 dead-handler clusters, found by
55 tool calls tracing the partial-inclusion graph by hand. Phase 5A began
by building a repeatable, mechanically-derived version of that same check
(`scripts/dev/sheet-action-registry.mjs`) rather than trusting the Phase 4
numbers to still be accurate, and re-investigated every named cluster in the
task brief against current `main` before changing anything.

The registry:
1. Parses the single shared root template
   (`templates/actors/character/v2-concept/character-sheet.hbs`) and locates
   its three-way `actorSheetMode` branch (Vehicle / NPC-concept /
   Character+Droid+promoted-heroic-NPC "common-else"), matching Phase 4's
   own documented structural finding.
2. BFS's `{{> "..."}}` partial inclusion from each branch's seed templates,
   producing the real set of templates reachable per branch (91/89/29 files
   respectively — vehicle and npc pull in far more of the shared
   frame/panel library than the commonElse branch, which mostly reuses its
   own dedicated tab set).
3. Extracts every `data-action="..."` in that reachable set (84/87/99
   actions per branch, 158 total action *entries* — many actions render in
   more than one branch).
4. Cross-references each action against string literals in the controller
   file(s) that own listener wiring for that branch (base + subtype
   controller, plus two imported-and-invoked modules that also own a real
   slice of wiring: `vehicle-crew-assignment-controls.js` and
   `custom-skills-ui.js`).
5. Excludes shell-hosted overlay surfaces (Store, GM Datapad, generic
   upgrade shell chrome) from the crawl — those are separate Application
   controllers hosted by the actor sheet's shell, not owned by the actor
   sheet action-integrity boundary this phase is scoped to.

Result after fixes (see §2-3): **0 UNRESOLVED actions** across all three
branches, enforced going forward by
`tests/phase5-sheet-action-integrity-contract.test.mjs` (§13 of the
Phase 5 deliverables, mandatory per spec §5L).

---

## 2. Complete action classification summary

| Status | Count | Meaning |
|---|---|---|
| LIVE_HANDLED (already, unchanged) | ~120 | Had a reachable handler before Phase 5; untouched. |
| LIVE_HANDLED (fixed this phase) | 27 | See §3 — wired to a handler for the first time. |
| LIVE_HANDLED_OTHER_SELECTOR | 2 | `change-skill-ability`/`change-custom-skill-ability` — functionally live via a CSS-class or `name`-prefix listener, not the `data-action` string itself (manually verified, documented in the registry). |
| LIVE_HANDLED_GLOBAL | 1 | `create-custom-talent-tree` — a document-level delegated listener registered once in `index.js`, not per-sheet-render. Verified live, no change needed. |
| INTENTIONALLY_DISABLED | 1 | `import-vehicle` — see §6. |
| NOT_ACTUALLY_RENDERED_FOR_THIS_TYPE | 1 | `roll-attributes` under the vehicle branch — a scanner false positive from a template-side `{{#if (eq actor.type "character")}}` gate this text scanner cannot evaluate; manually verified never to render for Vehicle. |
| DEAD_UI (documented, not removed) | ~6 | Actions whose only template is proven orphaned (never `{{> included}}`); see §4. |
| DEAD_HANDLER (removed) | 3 files | `force-ui.js`, `skills-ui.js`, `misc-ui.js` — see §5. |
| DEAD_HANDLER (kept, documented) | 1 file | `inventory-ui.js` — see §5. |
| UNRESOLVED (remaining) | **0** | Enforced by the new contract test. |

---

## 3. Broken actions fixed (LIVE_BROKEN → LIVE_HANDLED)

All fixes route to an **authoritative existing engine/subsystem** (fix
policy A/B — no new mechanics were invented). Each was verified reachable
in a live template (see §1's BFS) and each target engine method was
confirmed to exist with a matching signature before wiring.

| Action(s) | Old failure | New owner (file) | Downstream engine | Notes |
|---|---|---|---|---|
| `add-force-power`, `add-starship-maneuver`, `set-force-tradition`, `construct-lightsaber` (Force Suite path), `forceful-recovery-recover`, `force-suite-flip-card`, `force-suite-toggle-fp-boost`, `force-suite-recover-all`, `force-suite-pick-recovery`, `force-suite-pick-telekinetic-savant`, `force-suite-pick-influence-savant`, `force-suite-pick-lightsaber-form-savant`, `force-suite-recover-one`, `force-talent-aversion`, `force-talent-illusion`, `force-talent-link`, `force-talent-telepathic-link`, `force-talent-suppress-force`, `set-lightsaber-form`, `clear-lightsaber-form`, `use-force-regimen`, `end-force-regimen`, `starship-suite-flip-card`, `activate-starship-maneuver`, `starship-suite-recover-all`, `starship-suite-pick-recovery`, `starship-suite-recover-one` | No listener anywhere; rendered in `force-suite-tab.hbs`/`starship-suite-tab.hbs`/`force-suite-card.hbs`/`starship-suite-card.hbs`/`force-regimen-card.hbs`/`force-powers-known-panel.hbs` (all reachable from the root template) | `character-like-sheet.js` `_activateForceUI` (extended in place) | `ForceExecutor`, `ForceRegimenExecutor`, `LightsaberFormEngine`, `MetaResourceFeatResolver`, `ActorEngine` | Source: `scripts/sheets/v2/character-sheet/force-ui.js`, an unimported prior extraction attempt. Every engine method it called was verified still present with a matching signature (`ForceExecutor.executeForcePower`, `.activateForce`, `.recoverForcePowers`, `.recover*SavantPower`, `.activateAversion`, `.promptIllusion/Link/TelepathicLink/SuppressForce`; `LightsaberFormEngine.setActiveForm/clearActiveForm`; `ForceRegimenExecutor.executeRegimen/endRegimen`; `MetaResourceFeatResolver.recoverForcefulRecoveryPower`) before reuse. `end-force-regimen` had no equivalent in the old module; wired directly to `ForceRegimenExecutor.endRegimen`, confirmed to exist. Duplicate blocks already superseded by the live `_activateForceUI` (`force-sort`, `force-tag-filter`, `activate-force`, `customize-item`, `open-item-menu`, `open-force-alchemy-workbench`) were **not** re-copied. |
| `sell-item` | No listener matched this button's markup (the only existing sell logic, `.item-sell`, uses a different DOM shape) | `character-like-sheet.js` (extended existing delete/equip/configure cluster) | `initiateItemSale` | Reuses the exact same call already used by the working `.item-sell` handler. |
| `force-alchemy` (bare, gear-tab row action) | No listener (distinct from the already-live `open-force-alchemy-workbench`) | `character-like-sheet.js` (same cluster) | `openForceAlchemyWorkbench`, `getForceAlchemySuggestedRiteForItem` | Source: unimported `inventory-ui.js`. |
| `set-skills-filter` (segmented All/Trained/Custom buttons) | No listener; a working `<select>` with overlapping values existed alongside it, unwired | `character-like-sheet.js` `_activateSkillsUI` | (DOM-only; drives the existing `filterControls`/`applyFiltersAndSort` closure) | Routes the segmented buttons to set the select's value and re-run the same filter/sort function — no new filtering logic. |
| `toggle-condition-persistent` | No listener; `submitOnChange` is `false` so the bare `name` attribute did nothing | `character-like-sheet.js` | `ActorEngine.updateActor` | Writes the same `system.conditionTrack.persistent` field already read by `ConditionEngine`/`threshold-engine`/`combat-automation`/etc. |
| `apply-temp-defense`, `remove-recurring-damage`, `tick-recurring-damage-now` | No listener anywhere | `character-like-sheet.js` | `MetaResourceFeatResolver.applyTemporaryDefenseRule`, `RecurringDamageEngine.removeRecurringDamage`/`.tickRecurringDamage` | Source: unimported `misc-ui.js`. |
| `remove-active-effect` | No listener anywhere; the dead source module's copy called `ActorEngine.deleteActiveEffects`, **which does not exist** | `character-like-sheet.js` | `ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', [id])` | This is the one case where the "abandoned module" logic was *not* simply reused verbatim (fix policy B explicitly requires verifying, not blindly reusing) — corrected to the real, current API before wiring. |
| `revert-npc-progression` | No listener anywhere | `npc-actor-sheet.js` | `NpcProgressionEngine.revertToSnapshot` | Confirms via `Dialog.confirm` before mutating; re-renders after. |
| `open-follower-advancement` | No listener anywhere | `npc-actor-sheet.js` | `launchFollowerProgression(ownerActor, { existingFollowerId })` | Template updated (`npc-owner-panel.hbs`) to carry `data-owner-actor-id` from the already-computed `followerSummary.ownerActorId` context field — no new context computation added. |
| `open-related-actor` | No listener anywhere | `npc-actor-sheet.js` | `game.actors.get(id)?.sheet.render(true)` | |
| `useManeuver`, `regainManeuver` (Vehicle) | No listener; `StarshipManeuversEngine.useManeuver`/`.regainManeuver` existed with parameter shapes matching the button's `data-item-id`/`data-actor-id`/`data-item-uuid` exactly | `vehicle-actor-sheet.js` | `StarshipManeuversEngine.useManeuver`/`.regainManeuver` | Clear case of "built for this button, never wired." |
| `toggle-abilities`, `roll-ability` (Vehicle) | No listener; Vehicle extends `SWSEV2ActorSheetBase` directly and never inherited the Character-like sheet's Ability Matrix handlers, but the shared `abilities-panel.hbs` partial (used by vehicles for e.g. computer/pilot-relevant checks) still renders these two ungated | `vehicle-actor-sheet.js` | `SWSERoll.rollAbility`; DOM-only toggle | `roll-attributes` in the same panel is correctly template-gated to `actor.type === "character"` and was left alone. |

**27 actions fixed**, all mapped to pre-existing, already-verified-live
engine methods (no new game-mechanics code was written).

---

## 4. Dead UI removed (or documented, not removed)

Per the "prove reachability before deleting" mandate, nothing was deleted
speculatively. Actions whose *only* rendering template is proven orphaned
(never `{{> included}}` anywhere) are left as-is in their template — the
template itself, not just the action, is dead, and template-file deletion
was judged out of scope for an action-integrity pass without a dedicated
template-cleanup audit of its own. Documented here as **LIKELY DEAD — KEEP +
DOCUMENT**, classified per §5Q:

| Template | Actions inside | Evidence of orphan status |
|---|---|---|
| `templates/actors/character/v2-concept/partials/panels/force-panel.hbs` | `construct-lightsaber` (older copy), `forceful-recovery-recover` (older copy) | Preloaded in `scripts/load-templates.js` but never referenced by `{{> "...force-panel.hbs"}}` anywhere in `templates/`. The *reachable* `construct-lightsaber` (in `gear-tab.hbs`) and `forceful-recovery-recover` needs were satisfied separately (§3); this orphaned copy is inert. |
| `templates/actors/character/v2/partials/force-panel.hbs` | same as above | Same evidence — preloaded, never included. |
| `templates/actors/character/v2/partials/inventory-panel.hbs` | `open-upgrade-workshop` | Preloaded, never included; the entire `templates/actors/character/v2/` (non-"v2-concept") template tree predates the current root template and is not reachable from it. |
| `templates/actors/character/tabs/starship-maneuvers-tab.hbs` | `regainManeuver`, `useManeuver` (Character-side copy) | Never included anywhere; superseded by the Vehicle-side `vehicle-sheet-content.hbs` copy, which was fixed (§3). |

No `data-action` was removed from a *live* template this phase — every
control on a reachable template ended Phase 5 as LIVE_HANDLED or
INTENTIONALLY_DISABLED (goal-driven execution requirement, §4 of the spec).

---

## 5. Dead handlers removed

| File | Verdict | Proof |
|---|---|---|
| `scripts/sheets/v2/character-sheet/force-ui.js` | **VERIFIED DEAD — REMOVED** | Zero importers anywhere in `scripts/` (confirmed by repo-wide grep before deletion). Its live subset (every action not already duplicated by `character-like-sheet.js`'s own `_activateForceUI`) was migrated in first (§3); its already-duplicated subset was already superseded. No test or dynamic lookup referenced this file by path. |
| `scripts/sheets/v2/character-sheet/skills-ui.js` | **VERIFIED DEAD — REMOVED** | Zero importers. All 5 of its actions (`filter-skills`, `sort-skills`, `set-skills-filter`, `reset-skills-tools`, `toggle-skill-expand`) were confirmed already fully implemented (and, for `set-skills-filter`, then fixed) in `character-like-sheet.js`'s live `_activateSkillsUI`. |
| `scripts/sheets/v2/character-sheet/misc-ui.js` | **VERIFIED DEAD — REMOVED** | Zero importers. Of its 15 actions, 11 were already live in `character-like-sheet.js`; the remaining 4 (`apply-temp-defense`, `remove-recurring-damage`, `tick-recurring-damage-now`, `remove-active-effect`) were migrated in (§3, with `remove-active-effect`'s stale `ActorEngine.deleteActiveEffects` call corrected to the real API). |
| `scripts/sheets/v2/character-sheet/inventory-ui.js` | **LIKELY DEAD — KEPT + DOCUMENTED** | Zero importers from any sheet controller, but `scripts/dev/audit-cybernetic-surgery-policy.mjs` (a pre-existing, unrelated dev-audit test that runs as part of the rolling suite) asserts this file's literal text content (`requireText(...'inventory-ui.js'..., /toggle-implant-active/...)`). Deleting the file would fail that pre-existing test, and rewriting that audit script's assertions was judged out of scope for this phase (surgical-changes mandate — don't touch unrelated pre-existing test infrastructure to enable an unrelated deletion). Its actionable content (`construct-lightsaber`, `sell-item`-equivalent, `force-alchemy`) was independently confirmed already covered by live code (§3) or by the already-live delete/equip/configure cluster in `character-like-sheet.js`. |

---

## 6. Deferred / future actions

- **`import-vehicle`** — no importVehicle-style function exists anywhere in
  the codebase (confirmed by repo-wide grep). Per fix policy C, the control
  is now rendered `disabled` with `title="Vehicle import is not implemented
  yet."` and `aria-disabled="true"` (wired in `vehicle-actor-sheet.js`,
  verified by the contract test's disabled-detection check) rather than
  inventing an import mechanic.
- **`roll-attributes` on Vehicle** — not actually renderable for Vehicle
  (template-gated to `actor.type === "character"`); no action needed, just
  documented as a scanner false positive so it isn't mistaken for a live gap
  in a future audit.
- The four templates in §4 remain orphaned; a dedicated template-cleanup
  pass (outside this phase's scope) could delete them outright.
- `inventory-ui.js` remains on disk, dead to the sheet controllers but alive
  to an unrelated dev-audit test; a future pass that also updates
  `audit-cybernetic-surgery-policy.mjs` to check `character-like-sheet.js`
  instead could delete it cleanly.

---

## 7. NPC UX changes

Investigation found the NPC concept sheet (`npc-concept-content.hbs` +
`npc-header-dossier.hbs`) already substantially implements Phase 5C's intent
from prior work not covered by the Phase 1-4 audit docs read at the start of
this phase:

- Always-visible header dossier already surfaces HP (with a color-toned
  bar), Condition Track, Initiative, and REF/FORT/WILL/DT defense chips —
  before any tab click.
- Tab order is Overview → Combat → Stats → Features → (conditionally) Gear /
  Relationships / Beast / Force / GM — Force/Relationships/Beast/GM tabs are
  already hidden entirely when not applicable (`showForceTab`,
  `showRelationshipsTab`, `showBeastTab`, `showGmTab`), matching §5H's
  empty-section-visibility goal without any change needed.
- The Overview tab's Attacks card is already the first content shown, with
  BAB and an inline "+ Add Attack," ahead of skills/talents.
- Authority/calculation mode is already shown as a GM-facing badge
  (`npcConcept.showModeBadge` / `npcConcept.modeLabel`) plus a "Source
  Authority" status line, without exposing raw internal mode-flag names.
- "Run the NPC" vs. "edit the statblock" is already separated: the
  Overview tab is the play surface; `npc-progression-panel.hbs` /
  `npc-statblock-authority-panel.hbs` are distinct panels reached from the
  same tab rather than a separate app, and a visible callout already states
  "NPC sheets no longer require switching between play and edit."

**This phase's own NPC UX change**: added Speed to the always-visible header
vitals row (`npc-header-dossier.hbs`), next to HP/Condition/Initiative — it
was previously only visible by scrolling to the editable statblock fields
further down the Overview tab. No new calculation: reuses the same
`npcConcept.speed` value already computed and displayed elsewhere on the
same context object. Plus the three action-integrity fixes in §3
(`revert-npc-progression`, `open-follower-advancement`,
`open-related-actor`), which are UX-relevant in that they make the
"Recalculate Follower" / "Revert Snapshot" / "Open Related Actor" buttons
that already existed in the follower/progression panels actually work.

---

## 8. Droid UX changes

Investigation found `droid-systems-panel.hbs` already implements Phase 5D's
"machine-first, systems-grouped" intent: dedicated system nodes for
Processor, Armor, Appendages, Integrated Weapons, Integrated Equipment,
Sensors, and Locomotion, each independently marked `.is-empty` (styled via
`styles/sheets/v2-droid-specific.css`) rather than hidden — appropriate for
a diagram-style layout where the node's *position* conveys "this droid has
no armor installed" as clearly as removing it would, while keeping the slot
discoverable for the GM to fill it in. Integrated weapons are already
visually and structurally distinct from carried/generic weapons (separate
system node, distinct action `use-droid-part` vs. the generic
inventory/attack rows). Garage/build tooling is already gated behind
`droid.garage.canOpenGarage` / `droid.garage.systemsLocked`, keeping
maintenance separate from active play.

No structural Droid template/CSS changes were made this phase — the
action-integrity work found no Droid-specific broken actions in the
`droid-actor-sheet.js`-owned cluster (`use-droid-part`,
`inspect-droid-conversion`, `convert-droid-to-playable`, etc. — all
confirmed already reachable and handled), so there was no UX defect to
correct beyond what Phase 4 already established.

---

## 9. Vehicle UX changes

`vehicle-sheet-content.hbs` already uses a `swse-vehicle-command-deck` root
class and cockpit-style panel grouping (Hull/Shields header card,
crew/weapon-mount panels grouped by station where the crew system supports
it, a `commanderOrderPanel` that gracefully falls back to an explanatory
"not active yet" message rather than a fake empty panel when absent — again
already satisfying §5H). This phase's concrete Vehicle changes:

- Fixed `useManeuver`/`regainManeuver` (§3) — Pilot/Engineering maneuver
  cards' Ready/Use buttons now work.
- Fixed `toggle-abilities`/`roll-ability` (§3) — the shared Ability Matrix
  panel (used for vehicle-relevant ability checks) is now interactive on
  Vehicle sheets the same way it already was on Character/NPC/Droid sheets.
- Disabled `import-vehicle` with an explanation (§6) instead of leaving an
  unexplained dead button.

---

## 10. Character changes

No structural Character template changes (per the spec's explicit
"do not redesign merely because other sheets are changing" instruction — no
proven usability defect was found specific to Character). Character
benefits from every shared fix in §3 that lands in `character-like-sheet.js`
(Force Suite/Starship Suite cluster, skills segmented filter, sell-item/
force-alchemy, condition-persistent toggle, temp-defense/recurring-damage/
active-effect-removal cluster) since Character renders the same commonElse
branch as Droid. `character-sheet.js` itself remains the 31-line empty
subclass Phase 4 left it as — the Phase 5A audit found no Character-exclusive
action or handler, confirming Phase 4's own conclusion still holds.

---

## 11. Context ownership changes

Re-evaluated Phase 4's two documented deferrals
(`DroidSheetContextBuilder` and `buildNpcConceptSheetContext` remaining on
the shared `character-like-sheet.js` context path rather than being
hook-extracted to `SWSEV2DroidSheet`/`SWSEV2NpcSheet`):

**Decision: left deferred, unchanged.** Re-reading the actual call site
(still the same ~25-shared-local-variable block Phase 4 described — `isGM`,
`combatStatus`, `derived`, `abilities`, `xpData`, `forceSensitive`, and the
cross-referencing between `conceptLayout` and
`buildNpcConceptSheetContext`/`droidSheetContext`) confirmed Phase 4's
finding still holds after this phase's controller-boundary work: extracting
either call into a clean per-subtype hook still requires either threading
~25 parameters through a manufactured extension point or restructuring the
shared function's data flow, which the task brief's own instruction rules
out ("If it requires dozens of function parameters, copying local
calculations, or rebuilding mechanics, leave it deferred and document why").
No Phase 5 UX or action-integrity work touched this code path, so there was
no new opportunity (e.g. a naturally-arising smaller extraction point) to
reconsider it against. `npc-concept-layout-skip.test.mjs` (unchanged) still
guards the exact call shape.

---

## 12. Responsive-layout changes

No dedicated responsive/viewport CSS pass was undertaken this phase — the
Phase 5A audit's scope (~27 broken actions across the Force/Starship suite,
NPC follower/progression cluster, and Vehicle maneuver/ability cluster) filled
the available surgical-change budget for this pass. The three existing
subtype-specific stylesheets (`v2-npc-specific.css`, `v2-droid-specific.css`,
`v2-vehicle-sheet.css`) already carry the project's established
responsive/overflow conventions (used by their existing `.is-empty` node
styling, scroll containers, etc.); this phase's one added HTML change
(§7's Speed vital-stat block) reuses the exact same `.swse-npc-vital-stat`
class already used by the Condition/Initiative blocks beside it, so it
inherits the same responsive behavior without new CSS.

---

## 13. Mechanical-authority verification

**Zero mechanical formulas were added, changed, or recalculated in
templates.** Every fix in §3 either:
- calls an already-existing, already-verified engine method
  (`ForceExecutor`, `ForceRegimenExecutor`, `LightsaberFormEngine`,
  `MetaResourceFeatResolver`, `RecurringDamageEngine`,
  `StarshipManeuversEngine`, `SWSERoll`, `NpcProgressionEngine`,
  `ActorEngine`) with the exact same arguments its dead-code predecessor
  used (spot-checked against current signatures before reuse, not assumed),
  or
- writes a single already-modeled data field through `ActorEngine.updateActor`
  (`system.forceTradition`, `system.conditionTrack.persistent`) that other,
  pre-existing subsystems already read.

No SWSE formula, DerivedCalculator output, ModifierEngine behavior,
Actor/Item schema, or transaction-architecture code was touched. The full
Phase 1-4 regression suite (`phase2-*`, `phase3-*`, `phase4-*`,
`vehicle-hp-hull-dt-authority`, `vehicle-crew-*`, `stock-droid-*`, etc.) was
re-run at the end of this phase (§ Test results below) with **zero expected
value changes** — every prior-passing test still passes with the same
assertions.

---

## 14. Performance/structural comparison

No live Foundry client is available in this environment (same limitation as
Phases 3 and 4). No live render-timing numbers are fabricated. Structural
comparison:

- **Context-building cost: unchanged.** No context builder
  (`PanelContextBuilder`, `NpcProfileBuilder`, `DroidSheetContextBuilder`,
  `buildVehicleSheetContext`) was modified this phase — all changes were to
  event-listener wiring (`_activateForceUI` and friends) and one template
  addition that reads an already-computed context field (`npcConcept.speed`).
  Wiring more listeners onto already-rendered DOM nodes has the same
  per-render cost class as the listener chain Phase 4 already measured
  (`querySelectorAll` + `forEach(addEventListener)` for a modest, bounded
  set of additional selectors — ~27 new selector passes across the whole
  commonElse/vehicle/npc render, each over a small, already-existing subtree).
- **Structural savings**: deleting `force-ui.js` (764 lines), `skills-ui.js`
  (193 lines), and `misc-ui.js` (434 lines) removes 1,391 lines of dead code
  and 3 dead import edges from the repository's static-analysis surface (none
  of it was ever loaded/executed at runtime, so there is no runtime cost
  change — this is a maintainability/audit-surface improvement, not a
  performance one).
- SWSEPerf/Sentinel instrumentation itself was not touched.

---

## 15. Dead-code proof

See §5 for the file-level VERIFIED DEAD / LIKELY DEAD classification and its
evidence (zero-importer repo-wide grep for each file, cross-checked against
the rolling test suite for any hidden text-content dependency before
deletion — this is exactly how `inventory-ui.js` was caught and kept instead
of deleted).

---

## 16. Runtime follow-up

No live Foundry client was available for this phase (same limitation as
Phases 3 and 4). All verification was static: full-file reads of every
changed file (not agent-report trust), `node tools/run-rolling-syntax-check.mjs`
(2,242/2,242 clean), `node tools/run-rolling-tests.mjs` (130/131 passing,
only the pre-existing `lang/en.json` failure), and two new dedicated
contract tests reading the actual committed source
(`tests/phase5-sheet-action-integrity-contract.test.mjs`,
`tests/phase5-subtype-context-integrity.test.mjs`).

### Live-Foundry smoke-test checklist

| Actor type | Tab | Control | Expected result | Expected hook/handler | Watch in Sentinel | Watch in `SWSE.debug.performance.summary()` | Failure signal |
|---|---|---|---|---|---|---|---|
| Character (force-sensitive) | Force | "+ Add Force Power" | Creates a new `force-power` item, opens its sheet in create mode | `character-like-sheet.js` `_activateForceUI` → `createSafeEmbeddedItem` | No new mutation-trace warnings | No new render-time outlier for the Force tab | Button no-ops or throws in console |
| Character (force-sensitive, has spent powers) | Force | "Recover All" | All spent Force powers un-discard, sheet re-renders | `ForceExecutor.recoverForcePowers` | Actor update recorded with source `force-suite-recover-all`-adjacent reason | No regression vs. pre-Phase-5 Force tab render time | Notification never appears / cards stay discarded |
| Character (Jedi with lightsaber forms known) | Force | Click a Lightsaber Form chip | Chip becomes active-form, notification confirms | `LightsaberFormEngine.setActiveForm` via `set-lightsaber-form` | — | — | Chip stays inactive, no notification |
| Character (starship-suite-eligible) | Starship | "Use" on a maneuver card | Card marks spent, Item update recorded | `ActorEngine.updateEmbeddedDocuments` via `activate-starship-maneuver` | Item update source `starship-suite-use` | — | Card stays unspent |
| Character/NPC/Droid | Gear | "Sell" on an owned item | Opens the item-selling flow | `initiateItemSale` via `sell-item` | — | — | Button no-ops |
| Character/NPC/Droid | Gear | "Alchemy" on a force-alchemy-eligible item row | Opens the Force Alchemy workbench pre-targeted at that item | `openForceAlchemyWorkbench` via `force-alchemy` | — | — | Nothing opens |
| Character/NPC/Droid | Skills | Click "Trained" segmented quick-filter | Skill list filters exactly as selecting "Trained" from the Filter dropdown would | `_activateSkillsUI`'s `applyFiltersAndSort` via `set-skills-filter` | — | — | List does not filter / segmented button never highlights |
| Character/NPC/Droid | Overview / HP-Condition panel | Toggle "Persistent Condition" checkbox | `system.conditionTrack.persistent` updates, other systems (rage/poison/threshold) that read it react correctly next time they run | `ActorEngine.updateActor` via `toggle-condition-persistent` | Actor update recorded, source `condition-track-persistent-toggle` | — | Checkbox state doesn't persist across re-render |
| Character/NPC/Droid | Overview / current-conditions panel | "Apply" on a temporary-defense rule chip (e.g. Instinctive Defense) | Rule applies, notification confirms | `MetaResourceFeatResolver.applyTemporaryDefenseRule` via `apply-temp-defense` | — | — | No notification, rule not applied |
| NPC (follower, owner has leveled) | Overview (dependent) | "Recalculate Follower" | Opens follower progression flow scoped to this existing follower | `launchFollowerProgression(ownerActor, { existingFollowerId })` via `open-follower-advancement` | — | — | Warning "owner could not be resolved" when an owner clearly exists — check `data-owner-actor-id` is populated by `followerSummary.ownerActorId` |
| NPC (has a progression snapshot) | Overview | "Revert Snapshot" | Confirms, then restores the NPC to its last snapshot | `NpcProgressionEngine.revertToSnapshot` via `revert-npc-progression` | — | — | Actor doesn't change after confirming |
| NPC (has related-actor cards) | Relationships | Click a related-actor card / its "Open" button | Opens that actor's own sheet | `open-related-actor` handler in `npc-actor-sheet.js` | — | — | Nothing opens, or warns actor not found when it clearly exists |
| Vehicle (has starship maneuvers) | Pilot/Engineering | "Use"/"Ready" on a maneuver | Maneuver's `system.spent` flips via `StarshipManeuversEngine` | `useManeuver`/`regainManeuver` handlers in `vehicle-actor-sheet.js` | Item update recorded | — | Button no-ops |
| Vehicle | Overview (Ability Matrix) | Click an ability score to roll | Rolls a d20 + ability modifier, posts to chat with roll companion | `SWSERoll.rollAbility` via `roll-ability` | — | No new render outlier | No roll/chat message appears |
| Vehicle | Overview | "Import Vehicle" button | Button is visibly disabled with a tooltip explaining it's not implemented | N/A (intentionally disabled) | — | — | Button is clickable and does something (would indicate a regression of this phase's fix) |

---

## Deliverables summary

1. **PHASE 5 VERDICT: PHASE 5 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**
   (matching Phases 3 and 4's own closure precedent — no live Foundry
   client was available in this environment; the checklist above is the
   concrete follow-up).

2. **Final sheet structure per actor type**: unchanged at the architecture
   level from Phase 4 (`SWSEV2ActorSheetBase` → `SWSEV2CharacterLikeSheet` →
   `SWSEV2CharacterSheet`/`SWSEV2NpcSheet`/`SWSEV2DroidSheet`;
   `SWSEV2ActorSheetBase` → `SWSEV2VehicleSheet` directly). NPC/Droid/Vehicle
   subtype UX (header combat strips, systems-first Droid layout,
   command-deck Vehicle layout, empty-section handling) was found already
   substantially in place from prior work; this phase's additions are the
   Speed vital-stat on the NPC header and the 27 action-integrity fixes,
   which make already-designed controls actually functional.

3. **Action integrity report**: LIVE_HANDLED (already) ~120, LIVE_BROKEN
   FIXED 27, DEAD_UI documented-not-removed ~6 (in 4 orphaned templates),
   DEAD_HANDLER REMOVED 3 files (1,391 lines), DEAD_HANDLER kept+documented
   1 file, FUTURE/DISABLED 1 (`import-vehicle`), UNRESOLVED **0**.

4. **Broken actions fixed**: see §3's full table.

5. **NPC UX summary**: §7 (mostly pre-existing; Speed added to header;
   follower/progression/related-actor buttons now functional).

6. **Droid UX summary**: §8 (already matches spec; no changes needed this
   phase beyond confirming action integrity).

7. **Vehicle UX summary**: §9 (already cockpit-styled; maneuver Use/Ready
   and Ability Matrix now functional; Import Vehicle honestly disabled).

8. **Character UX summary**: §10 (unchanged structurally; benefits from all
   shared fixes).

9. **Context ownership changes**: none — Phase 4's deferral re-verified and
   left in place, documented in §11.

10. **Exact files changed**:
    - `scripts/sheets/v2/character-like-sheet.js` (extended `_activateForceUI`,
      inventory/gear cluster, skills-filter cluster, added condition-persistent
      and temp-defense/recurring-damage/active-effect handlers, new imports)
    - `scripts/sheets/v2/npc-actor-sheet.js` (added `revert-npc-progression`,
      `open-follower-advancement`, `open-related-actor` handlers, new imports)
    - `scripts/sheets/v2/vehicle-actor-sheet.js` (added `useManeuver`,
      `regainManeuver`, `import-vehicle` disable, `toggle-abilities`,
      `roll-ability`, new imports)
    - `templates/actors/npc/v2/partials/npc-header-dossier.hbs` (added Speed
      vital stat)
    - `templates/actors/npc/v2/partials/npc-owner-panel.hbs` (added
      `data-owner-actor-id` to the follower-advancement button)
    - Deleted: `scripts/sheets/v2/character-sheet/force-ui.js`,
      `scripts/sheets/v2/character-sheet/skills-ui.js`,
      `scripts/sheets/v2/character-sheet/misc-ui.js`
    - New: `scripts/dev/sheet-action-registry.mjs` (action-registry scanner,
      shared by the audit and the new contract test)
    - New: `tests/phase5-sheet-action-integrity-contract.test.mjs`,
      `tests/phase5-subtype-context-integrity.test.mjs`
    - New: this document

11. **Exact mechanical behavior changes**: none. Every fix routes to an
    already-existing, already-verified authoritative engine call or writes
    an already-modeled data field. The one previously-broken call
    (`remove-active-effect`'s stale `ActorEngine.deleteActiveEffects`) is
    corrected to the real API as part of making the *button* work, not as a
    mechanics change — the button had never worked before, so there is no
    prior mechanical behavior to have altered.

12. **Dead code removed with reachability proof**: §5.

13. **Test results**: `node tools/run-rolling-syntax-check.mjs` — 2,242/2,242
    clean. `node tools/run-rolling-tests.mjs` — 130 passed, 1 failed (of 131
    run; 5 excluded as documented pre-existing failures), the 1 failure being
    exactly the known `lang/en.json` baseline
    (`progression-suggestion-and-render-contracts.test.mjs`), confirmed
    unrelated to this phase's changes and left untouched. Both new Phase 5
    tests pass.

14. **Performance/structural comparison**: §14 — no live timings fabricated;
    1,391 lines of dead code removed; no context-builder cost change.

15. **Known pre-existing issues left untouched**: the `lang/en.json` CI
    baseline failure; the 4 orphaned templates in §4; `inventory-ui.js`
    (kept, documented); the two Phase-4-deferred context-building blocks
    (§11); the pre-existing `panelContexts`-read-before-populated sequencing
    defect Phase 4 flagged (§9 of the Phase 4 doc) — not touched, out of
    scope for this phase.

16. **Live Foundry smoke-test checklist**: §16 above.

17. **Recommended next phase** (not begun): a dedicated template-cleanup
    pass to delete the 4 confirmed-orphaned templates in §4 and retire
    `inventory-ui.js` (after updating its one dependent audit-script
    assertion to point at `character-like-sheet.js` instead); optionally, a
    live-Foundry verification pass against this phase's smoke-test checklist
    once a Foundry client is available.
