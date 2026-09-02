# GM Datapad Ecosystem Redesign — audit continuation

Phase 0 through Ecosystem Redesign Phase 2 history (the Locations
functional-recovery stages, Ecosystem Redesign Phase 1, and Phase 2's
context-preserving cross-surface navigation contract) remains in
`docs/audits/gm-locations-phase-0-functional-recovery.md`. That document is
becoming semantically too Locations-specific for further ecosystem-wide
work, so this file continues the audit trail starting with **Ecosystem
Redesign Phase 3 — Factions as the "Who" Hub**.

# ECOSYSTEM REDESIGN — PHASE 3: FACTIONS AS THE "WHO" HUB

## 1. Phase 3 verdict

**PHASE 3 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP.** No live Foundry
client is available in this environment, as in every prior phase. Every
claim below is verified by direct source reading and by executing the real
production services (`GMFactionRelationshipSurfaceService.buildViewModel`,
the real `GMFactionRelationshipSurfaceController` click-delegation
branches, the real `GMDatapad.navigateToSurface()`/`_navigateTo()`
contract from Phase 2) under the repo's Foundry-shim Node harness.

## 2. Faction authority map (2A audit)

Read in full: `scripts/allies/faction-registry-service.js`,
`scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js`,
`scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js`,
`scripts/ui/shell/gm/FactionJobBridgeService.js`,
`templates/apps/gm-datapad/surfaces/factions.hbs`, plus the relevant CSS
(`styles/apps/gm-datapad.css`, `styles/apps/gm-holopad-concept-phase2.css`)
and the GM Approvals surface's read-only faction-suggestion listing
(`scripts/ui/shell/gm/GMApprovalsSurfaceService.js`).

**Field-authority table** (canonical `FactionRegistryService` record,
`gmFactionRegistry` world setting):

| Field | Classification |
|---|---|
| `id`, `name`, `type`, `status`, `source` | CANONICAL_FACTION_DATA |
| `planetSystem`, `scale`, `leader`, `image` | CANONICAL_FACTION_DATA |
| `score`, `startingScore` | CANONICAL_FACTION_DATA (party-wide "standing" display; distinct from per-actor relationship score below) |
| `benefits`, `notes`, `gmNotes`, `history` | CANONICAL_FACTION_DATA |
| `jobDefaults.*` (incl. `rivalFactionName` — a free-text string, not a relationship id) | CANONICAL_FACTION_DATA (Job Board draft-prefill defaults only) |
| `contacts[]` (id, name, role, disposition, revealState, knownToPlayers, actorId/actorUuid, linkedIntelIds, jobDefaults, ...) | CANONICAL_FACTION_DATA, stored directly on the Faction record |
| Faction ↔ Location (`controllingFactionId`, `factionIds`, `factionPresence[]`) | EXTERNAL_AUTHORITY — stored on the **Location** record (`LocationRegistryService`), not the Faction. Faction presents this relationship, never owns it. |
| Faction ↔ Job ("offered by" / "rival stakes") | EXTERNAL_AUTHORITY — derived by matching a Job Board thread's own `issuer`/`client`/`factionConsequences` against the Faction's id/name (`FactionJobBridgeService.filterJobsByIssuer`/`normalizeJobIssuer`), never stored on the Faction. |
| Faction ↔ Intel | EXTERNAL_AUTHORITY — derived from `HolonetIntelService`'s own `intel.linkedFactionId`/`linkedContactId` metadata, never stored on the Faction. |
| Actor ↔ Faction personal relationship (`alliesFactionRelationships` actor flag: `relationshipType` known/member/enemy/patron/founder/ally/neutral/other, `score`, `benefits`, `notes`, `history`) | RELATIONSHIP_ID — a PER-ACTOR standing record, resolved via `FactionRegistryService.getActorRelationships(actor)`/`getAllActorRelationshipRows()`. This is NOT a Faction-vs-Faction relationship; it is the Allies app's PC/NPC-to-Faction standing ledger, already rendered by the existing "Actor Faction Relationships" panel on the Factions surface. |
| Player-suggested Faction (`factions` legacy actor flag, `pending_approval`/`suggested`/`pending` status) | RELATIONSHIP_ID / approval workflow — `suggestFaction`/`getPendingSuggestions`/`approveSuggestedFaction`/`rejectSuggestedFaction`, all real, all pre-existing, untouched by this phase. |
| **Faction ↔ Faction** (ally/rival/enemy/neutral as a structured, id-based relationship) | **UNCLEAR / NOT PRESENT.** No canonical storage exists anywhere in this codebase (confirmed by a full-repo grep for `relatedFactionId`/`alliedFaction`/`rivalFactionId`/`factionRelationType`/`interFaction` — zero matches). The only adjacent field is `jobDefaults.rivalFactionName`, a free-text string used purely for Job Board reward/consequence flavor, not an id-addressable relationship. **Not implemented this phase — deferred with reason, not invented.** |

## 3. Faction ecosystem relationship map (3B)

```
FACTION
  ├── LOCATIONS        — real (Location's own controllingFactionId/factionIds/factionPresence)
  ├── PEOPLE            — real (Faction's own contacts[]; NPC/world Actor links via contact.actorId/actorUuid)
  ├── JOBS              — real (Job Board thread issuer/client/factionConsequences matching)
  ├── INTEL             — real (Holonet Intel linkedFactionId/linkedContactId)
  └── OTHER FACTIONS    — NOT PRESENT as structured data. Deferred.
```

Only the first four categories were implemented, matching what current
authorities can prove.

## 4. Prototype-to-production mapping (3C)

| Design section | Production authority | Stable id | Phase 3 status |
|---|---|---|---|
| Faction Identity | `FactionRegistryService` | `factionId` | Reused (header markup pre-existing; unchanged) |
| Current Situation | Derived (Location/Job/Intel filters) | — | ADDED (extended the pre-existing intel-chip strip) |
| Locations / Presence | `LocationRegistryService` | `locationId` | Reused (pre-existing `locationRows`/`open-location` action, unchanged) |
| Contacts & NPCs | `FactionRegistryService` (`contacts[]`) | `contactId` / `actorUuid` | Reused (pre-existing, unchanged) |
| Jobs | `HolonetStorage` (Job Board threads) | `threadId` | ADDED (new `relationships.jobs[]` + `open-faction-job` navigation) |
| Intel | `HolonetIntelService` | `intelId` | ADDED (new `relationships.intel[]` + `open-faction-intel` navigation) |
| Faction Relationships | — | — | **DEFER_WITH_REASON** — no canonical authority (see §2) |
| GM Notes / Deep Detail | `FactionRegistryService` | `factionId` | Reused (pre-existing edit-details `<details>` block, unchanged) |

## 5. Selected Faction VM (3D)

**Architectural finding that shaped this section:** unlike Locations
(single selected-record detail panel + a separate registry list), the
Factions surface renders **every** Faction as its own fully-expanded
accordion card in one scrollable list — `isFocused` only toggles a
highlight class, it does not filter to a single "selected" record. There is
no `factionManager.selected` concept to extend, so the ecosystem grouping
was added **per row** on `factionManager.registry[]`, not as a new
top-level singleton — the additive, non-redesigning choice consistent with
the surface's actual existing architecture.

Each row gained (in `GMFactionRelationshipSurfaceService.js`), fully
additive — every pre-existing flat field untouched:

```js
{
  ...record,          // every pre-existing field, unchanged
  ...                  // every pre-existing computed field (locationRows,
                        // jobStats, recentJobs, contactCount, isFocused,
                        // searchText, ...), unchanged
  identity: { id, name, image, type, status, planetSystem, scale, leader, scoreLabel, scoreClass },
  currentSituation: {
    controlledLocationCount, presenceLocationCount, contactCount,
    linkedJobCount, activeJobCount, intelCount, currentPartyLocationPresence
  },
  relationships: { locations, contacts, jobs, intel, factions: [] },
  world: { notes, gmNotes, benefits, jobDefaults, history }
}
```

`relationships.factions` is always `[]` by design (§2/§3) — never
fabricated.

## 6. Current Situation (3F)

Extended the pre-existing `.gm-faction-card-intel-grid` chip strip (already
a compact live-campaign summary: Jobs/Open/Active/Payout/Contacts/Known
NPCs/GM Only/Intel/Locations) with two additive, real-data-only chips:

- **Controls** — `currentSituation.controlledLocationCount` (locations
  where `controllingFactionId === faction.id`, never presence-only).
- **Party** (conditional, only rendered when true) —
  `currentSituation.currentPartyLocationPresence`, derived as "does any
  Location this Faction controls or has presence at also have
  `activeForParty === true`" — the same canonical "where is the party right
  now" flag Locations Phase 1 established. No new stored field; no
  inference beyond what the two real relationships already prove.

`activeJobCount` uses `jobStats.activeTotal` (open + active + review +
payout), a real, already-computed status rollup — not a raw linked-id
count mislabeled as "active" (the anti-pattern explicitly flagged in the
Phase 3 spec).

## 7. Location footprint result (3G)

**Controlled**, **presence**, and **current-party-context** are all real
and resolved. `relationships.locations[]` reuses the exact same filter the
pre-existing `locationRows` already used
(`controllingFactionId`/`factionIds`/`factionPresence`), adding one
additive field: `roleLabel` ("Controls" when this Faction is the
controller, else the real `factionPresence[].influence` value title-cased,
else "Present"). Navigation reuses the **pre-existing** `open-location`
action (present before Phase 3, already using the Phase 2
`patchSurfaceState('locations', {selectedLocationId})` +
`_navigateTo('locations')` pattern) — no new action needed, since the new
`relationships.locations[]` rows carry the same `id` field the existing
button already reads.

## 8. Contact/NPC result (3H/3I)

Untouched. The existing Contacts & NPCs panel already distinguishes
Faction-registry contacts from linked world Actors
(`contact.actorId`/`actorUuid`), already resolves each via stable id, and
already exposes real, verified actions (`open-contact-actor`,
`promote-contact`, `hide-contact`/`reveal-contact`, `delete-contact`,
`make-job-contact`, `view-jobs-contact`, `create-intel-contact`,
`view-locations-contact`, `create-location-contact`,
`send-contact-message`) — all pre-existing, all confirmed reachable by the
GM Datapad action-integrity scanner, none touched by this phase.

## 9. Job result (3J/3K)

`relationships.jobs[]` resolves from the real Job Board authority
(`HolonetStorage`-backed threads, loaded via the pre-existing
`_loadJobRows()` — never `LocationJobBridgeService`), filtered with
`FactionJobBridgeService.filterJobsByIssuer()` (the same proven matching
`jobStats`/`recentJobs` already used, here uncapped so every linked Job is
reachable, not only the 4 most recent). Each row carries the real
`threadId`, `title`, real status/`statusLabel`, and a derived `roleLabel`
("Client" when this Faction is the job's primary issuer, "Rival Stakes"
when it only appears in the job's `factionConsequences.additionalConsequences`
rival-stakes list — both are real, already-resolved fields, not invented).
Click → `GMFactionRelationshipSurfaceController`'s new `open-faction-job`
action → `host.navigateToSurface('jobs', { hostPatch: { selectedJobThreadId } })`.
**Create Job from Faction was already implemented before this phase**
(`make-job-faction`/`make-job-contact`, via `FactionJobBridgeService`) and
was left untouched.

## 10. Intel result (3L)

`relationships.intel[]` resolves from the real Holonet Intel authority
(`HolonetIntelService`, loaded via the pre-existing `_loadIntelRows()` —
never `LocationIntelBridgeService`), filtered by `linkedFactionId ===
faction.id`. Each row carries the real `intelId`, `title`,
`status`/`statusLabel`. Click → the new `open-faction-intel` action →
`host.navigateToSurface('intel', { statePatch: { selectedRecordId } })`.
Intel has one real surface mode; no dossier/bulletin split existed to
choose between (same finding as Phase 2's Locations→Intel navigation).

## 11. Faction-relationship result (3M)

**Deferred, not implemented — no canonical authority.** See §2/§3. The
template renders an honest, permanently-informational (not a normal empty
state) message explaining why, per §14 below, rather than a misleading
"no relationships yet, add one" empty state with no real add action behind
it.

## 12. Navigation flows / cross-surface navigation result (3Q/3Z)

All three implemented flows use the Phase 2 `GMDatapad.navigateToSurface()`
contract — no new routing helper was added:

- **Faction → Location**: pre-existing `open-location` action (unchanged),
  `patchSurfaceState('locations', {selectedLocationId})` +
  `_navigateTo('locations')`.
- **Faction → Job**: new `open-faction-job` action,
  `navigateToSurface('jobs', {hostPatch: {selectedJobThreadId}})`.
- **Faction → Intel**: new `open-faction-intel` action,
  `navigateToSurface('intel', {statePatch: {selectedRecordId}})`.
- **Faction → Faction**: not implemented — no relationship rows exist to
  click (§11).
- **Contact/Actor**: unchanged from its pre-existing, already-conservative
  behavior (`open-contact-actor` opens the linked Actor's own sheet
  directly; `promote-contact` creates one if none exists yet) — exactly the
  Phase 2 precedent this pattern was modeled on.

All three implemented flows were proven, executed, to call
`navigateToSurface` **exactly once** with the correct surface id and the
correct real identity field
(`tests/gm-faction-context-navigation-controller.test.mjs`), and to fail
safe (no navigation call) when the id is missing.

## 13. Broken reference result (3P)

`relationships.locations`/`.jobs`/`.intel` are built by **filtering** real
data (a stale/deleted reference simply never matches, so it never appears
as a row) rather than resolving-then-rendering-"Missing"; this differs from
Locations' Phase 1 pattern (which resolves a stored id and can render a
"Missing Job"/"Missing Intel" placeholder) because Factions has no stored
id list to resolve — its relationships are entirely computed by scanning
the other authorities for a match. A deleted Location/Job/Intel record
simply stops matching and stops appearing; there is no "broken reference"
state to render for these three categories, by construction. The
pre-existing Contacts panel's own missing/unresolved-Actor handling (via
`hasActorLink`) is untouched.

## 14. Approval regression result (3V/3AA)

Untouched and re-verified: `approve-suggestion` → `FactionRegistryService.approveSuggestedFaction`,
`reject-suggestion` → `rejectSuggestedFaction`, `remove-relationship` →
`removeActorRelationship`, `promote-contact` →
`promoteFactionContactToActor`, `hide-contact`/`reveal-contact` →
`FactionRegistryService.upsertFactionContact`. All confirmed present and
correctly wired by the pre-existing, unmodified
`tests/gm-datapad-no-duplicate-handler-regression.test.mjs` (its regex
assertions anchor directly on `case 'approve-suggestion':` /
`case 'reject-suggestion':` / `case 'remove-relationship':` calling the
real `FactionRegistryService` methods) — this test already constitutes
dedicated Faction-approval regression coverage, so no duplicate test was
added. The separate GM Approvals surface's read-only faction-suggestion
listing (`GMApprovalsSurfaceService.js`) was not touched.

## 15. Mutation authority result (3W)

No direct `document.update()`/`actor.update()`/`game.settings.set()` calls
were added. The two new controller branches
(`open-faction-job`/`open-faction-intel`) perform navigation only — no
mutation at all, matching "Phase 3 is primarily presentation/navigation."
All pre-existing mutations continue to route through
`FactionRegistryService`/`mutateShellOnly`, unchanged.

## 16. Action integrity (3AB)

`tests/gm-datapad-action-integrity-contract.test.mjs` (pre-existing,
unmodified — its generic scanner picked up both new
`data-gm-faction-action` values automatically): **244 controls across 15
entries, 141 action-value / 22 dynamic-action-value / 81 attribute-name, 0
unresolved** (was 242/139/22/81/0 before this phase — the delta is exactly
the two new actions).

## 17. Performance (3X)

`relationships.locations`/`.jobs`/`.intel` reuse the SAME already-loaded,
already-once-per-render arrays (`locationRows`, `jobs`, `intelRows`) the
pre-existing per-faction computation (`factionLocationRows`, `jobStats`,
`factionIntelCount`) already iterated — no additional authority scan, no
new index, no caching framework. `FactionJobBridgeService.filterJobsByIssuer`
is a single additional `.filter()` pass over the already-loaded `jobs`
array per faction (same cost class as the pre-existing `jobStats`
computation it sits beside). Not turned into a general performance pass,
per instruction.

## 18. Tests (3Y/3Z/3AA/3AB/3AC)

- `tests/gm-faction-ecosystem-view-model.test.mjs` (executed) — a **pure
  additive design contract** (no prior bug; pre-Phase-3 source has no
  `identity`/`currentSituation`/`relationships`/`world` fields at all).
  Proves `identity.id`, `currentSituation.*`, `relationships.locations[]`
  (with real `roleLabel`), `.contacts[]` (real `contactId`), `.jobs[]`
  (real canonical `threadId`, real `roleLabel`), `.intel[]` (real
  `intelId`), `.factions === []` (correctly deferred, not fabricated), and
  every pre-existing legacy flat field surviving untouched. Verified via
  `git stash` to fail against the pre-Phase-3 source and pass after.
- `tests/gm-faction-context-navigation-controller.test.mjs` (executed) — a
  **bug-category regression proof** (before this fix, clicking a linked Job
  or Intel row had no way to navigate to it at all — the controls and
  branches did not exist). Drives the real
  `GMFactionRelationshipSurfaceController._wireButtons()` delegated click
  listener through `open-faction-job`/`open-faction-intel`, proving the
  shell navigation call happens exactly once with the correct surface and
  real identity field, and that an empty/missing id never navigates.
  Verified via `git stash` to fail against the pre-Phase-3 source and pass
  after. Includes a scan for prototype-shortcut navigation patterns (none
  found in the new code).
- `tests/gm-datapad-action-integrity-contract.test.mjs` (pre-existing,
  unmodified) — 0 unresolved controls, including the 2 new actions (§16).
- `tests/gm-datapad-no-duplicate-handler-regression.test.mjs` (pre-existing,
  unmodified) — Faction approval regex assertions still pass (§14).
- `tests/gm-datapad-wizard-contract.test.mjs`,
  `tests/gm-datapad-context-navigation-contract.test.mjs`,
  `tests/gm-datapad-navigation-destination-selection.test.mjs`,
  `tests/gm-locations-context-navigation-controller.test.mjs`,
  `tests/gm-locations-operational-ui-action-matrix.test.mjs` — all
  re-verified green, unchanged (Phase 2 regression).

## 19. Live Foundry checklist (not run — no live client available)

1. Open GM Datapad → Factions. Select/scroll to a populated Faction. PASS =
   identity clear, Current Situation chips (including Controls, and Party
   only when true) visible, no clipped layout.
2. Verify controlled vs. presence Locations in the "Operating Locations"
   footprint. Click one. PASS = Locations opens with that exact Location
   selected, no search, no generic first render.
3. Verify the Contacts list; open a linked world Actor. PASS = existing
   Actor-sheet-open behavior unchanged. Verify a suggested-Contact/Faction
   approval if one is pending. PASS = unchanged.
4. Open "Linked Jobs", click a row. PASS = Job Board opens with that exact
   Job selected, no title search.
5. Open "Linked Intel", click a row. PASS = Intel opens with that exact
   record selected.
6. Open "Faction Relationships". PASS = honest deferred-state message, no
   fake empty-state "add" action.
7. Select a Faction present at the party's current Location. PASS = the
   "Party" chip appears. Select an unrelated Faction. PASS = it does not.
8. Test with a stale Location/Job/Intel reference (delete the target after
   linking). PASS = the row simply no longer appears; Factions stays
   usable, no crash.
9. Resize the Datapad window narrow → wide with a populated Faction card
   visible. PASS = the new chips/linked-rows adapt to actual app width, no
   nested scroll trap.
10. Navigate Locations → Faction (pre-existing `view-locations-faction` /
    `open-faction` per-relationship reverse links from Phase 2) → back into
    Locations via a Job/Intel row added this phase. PASS = the two-way
    ecosystem path works end to end.
11. Exercise the Faction suggestion approve/reject workflow once. PASS = no
    regression from this phase's presentation changes.

If no live client exists: DO NOT CLAIM LIVE VALIDATION. (None exists in
this environment — see §1.)

## 20. Deferred work

- Faction ↔ Faction structured relationships (§2/§3/§11): no canonical
  authority exists. Building one (a new relationship-id field, storage,
  and UI) was explicitly out of scope this phase ("do not invent new
  canonical relations just because the diagram is useful") and is a
  candidate for a future phase if the campaign model needs it.
- Faction "selected single detail" view: the surface's own architecture
  (every Faction expanded inline in one list) was preserved rather than
  introduced fresh; a future phase could revisit whether a Locations-style
  select-one/detail-panel pattern would serve Factions better, but that
  was out of scope for "presentation additions to the existing
  architecture."

## 21. Phase 4 recommendation

**JOB BOARD AS THE "WHAT / MISSION" HUB** — the next natural expansion,
now that Locations, Factions, and Job Board all share one working
cross-surface navigation contract (Locations → Jobs, Factions → Jobs, and
Job Board's own pre-existing → Factions/Locations reverse links). **Not
started, per explicit instruction.**
