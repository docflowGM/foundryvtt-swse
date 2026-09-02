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

# ECOSYSTEM REDESIGN — PHASE 4: JOB BOARD AS THE "WHAT / MISSION" HUB

## 1. Phase 4 verdict

**PHASE 4 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP.** No live Foundry
client is available in this environment. Every claim below is verified by
direct source reading and by executing the real production code
(`GMJobBoardSurfaceService.buildViewModel`, the real
`HolonetMessengerService._normalizeJobSourceLocation()`, the real
`GMJobBoardSurfaceController` click-delegation branches, the real
`GMDatapad.navigateToSurface()` contract from Phase 2) under the repo's
Foundry-shim Node harness.

## 2. Job authority map (4A)

Read in full: `scripts/ui/shell/gm/GMJobBoardSurfaceService.js`,
`scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js`,
`scripts/ui/shell/gm/FactionJobBridgeService.js`,
`scripts/ui/shell/gm/LocationJobBridgeService.js`,
`scripts/holonet/subsystems/holonet-messenger-service.js` (job-related
methods: `createJobPosting`/`_gmCreateJobPosting`/`transitionJobStatus`/
`threadAction`/`duplicateArchivedAsDraft`/`_normalizeJobIssuer`/
`_normalizeJobClient`), `templates/apps/gm-datapad/surfaces/jobs/*.hbs`.

The canonical Job authority is a Holonet thread
(`threadType: 'job'`, `HolonetStorage`-backed) carrying a `job` metadata
object. Field-authority table:

| Field | Classification |
|---|---|
| `threadId`, `title`, `status`, `objectives[]`, `briefing`, `rewardCredits`/`rewardXp`/`rewardItems`/`rewardAssetActorIds`, `statusHistory`, `createdAt`/`updatedAt`/`postedAt`/`archivedAt`/`paidAt`/`failedAt`, `lifecycleShelf` | CANONICAL_JOB_DATA |
| `issuer.factionId`, `issuer.contactId`, `issuer.contactActorId`/`contactActorUuid` | CANONICAL_JOB_DATA — real stable ids, already written at creation time for every known-issuer-driven creation path (see §5) |
| `issuer.factionName`, `issuer.contactName`, `issuer.name`, `client.name`/`factionName` | LEGACY_COMPATIBILITY — display snapshots, kept for old records and human-readable summaries; never deleted |
| `factionConsequences` (`factionName`, `successDelta`/`failureDelta`, `additionalConsequences[]` incl. `type: 'rival'`) | CANONICAL_JOB_DATA — a Job-specific narrative/consequence relationship. `factionConsequences.factionName`/`additionalConsequences[].factionName` are LEGACY_COMPATIBILITY name fields; `factionId` on a consequence entry (when present) is CANONICAL_JOB_DATA |
| `sourceLocation.locationId`/`locationName` | **NEW this phase** — CANONICAL_JOB_DATA (see §5 — this field did not exist before Phase 4) |
| Job ↔ Intel | EXTERNAL_AUTHORITY — Intel stores the relationship (`intel.linkedJobThreadId`), the Job does not; resolved by scanning `HolonetIntelService`, mirroring how Faction↔Intel was resolved in Phase 3 |
| Job ↔ Location (pre-Phase-4) | **Was UNCLEAR/absent** — see §5, now CANONICAL_JOB_DATA |
| Settlement/payout mechanics (`HolonetMessengerService.threadAction` action names: `job-payout`, `job-payout-distribution`, `job-xp-payout`, `award-job-items`, `award-job-asset-access`, `set-job-status`/`override-job-status`, `upsert-job-objective`, `set-job-objective-status`, `upsert-job-consequence`) | EXTERNAL_AUTHORITY (owned by `HolonetMessengerService`) — untouched by this phase |

## 3. Job identity contract (4B/4C)

**Manually-created/known-issuer-selected Jobs already write canonical
identity at creation time**, confirmed by direct reading of
`GMJobBoardSurfaceController._wireCreateForms()`'s submit handler and
`FactionJobBridgeService.buildKnownIssuerOptions()` (already sets real
`factionId`/`contactId` on every known-issuer `<option>`, since Phase 1/2)
— this was NOT something Phase 4 needed to build; it already existed.
`HolonetMessengerService._normalizeJobIssuer()` normalizes `issuer.factionId`/
`contactId`/`contactActorId`/`contactActorUuid` alongside the legacy name
fields, which are retained unconditionally.

**The one real gap found by this audit**: `LocationJobBridgeService
.buildDraftFromLocation()` already produced a `draft.location` (with a
real `locationId`), but nothing between wizard prefill and job creation
ever persisted it — the create-form had no field for it, and
`_gmCreateJobPosting()`'s job metadata object had no field to store it in.
A Job created from a Location lost its Location relationship the instant
it was created. Fixed narrowly (§5), not by inventing a parallel schema.

Presentation-time (never-written-back) legacy resolution: `resolveIssuerFaction()`
in `GMJobBoardSurfaceService.js` tries `issuer.factionId` first
(`resolutionKind: 'canonical-id'`); for a legacy Job with only
`factionName`, it matches against the real `FactionRegistryService`
registry and reports `resolutionKind: 'legacy-name-unique'` only when the
name matches exactly one Faction, `'ambiguous'` when it matches more than
one (Faction Registry names are **not** guaranteed unique by storage —
`FactionRegistryService.upsertFaction()` merges by name at write time, but
nothing prevents two hand-seeded/imported records from sharing a name), and
`'unresolved'`/`'missing'` otherwise. No arbitrary id is ever chosen.

## 4. Legacy compatibility result (4V)

Old Jobs with only `factionName` (no `factionId`) still resolve their
Faction relationship correctly whenever that name is unique, verified by an
executed test (§19). Every legacy display field (`factionName`,
`clientLabel`, `issuerLabel`, etc.) is untouched and still renders exactly
as before.

## 5. Creation-path audit (4T/4U/4K, per source)

- **From Faction** (`make-job-faction`) / **From Contact** (`make-job-contact`):
  `FactionJobBridgeService.buildDraftFromFaction()`/`buildDraftFromContact()`
  already set `issuer.factionId`/`contactId` — canonical identity already
  present pre-Phase-4. Unchanged.
- **From Previous Client** (`FactionJobBridgeService.buildDraftFromPreviousClient()`):
  carries forward whatever identity the prior job already had (canonical if
  the prior job had it, name-only otherwise). Unchanged.
- **From Location** (`create-job` on Locations →
  `LocationJobBridgeService.buildDraftFromLocation()`/`buildDraftFromAtlasFact()`):
  **THE GAP THIS PHASE FIXES.** The bridge already correctly keeps Location
  context (`draft.location`, `draft.issuer.locationId`/`locationName`) and
  Faction issuer context (`draft.issuer.factionId`, resolved independently
  via `FactionRegistryService.findFaction(location.controllingFactionId)`)
  as two INDEPENDENT fields — **the Phase 4K anti-pattern (treating a
  Location's name as its client Faction) was never present**; this bridge
  already got that right. What was missing was persistence: added a
  `sourceLocationId`/`sourceLocationName` hidden field pair to the contract
  wizard (prefilled from `jobBoard.creation.prefill.location.id`/`.name`,
  the exact field `LocationJobBridgeService`'s `_normalizeDraft()` already
  produces), read them in the create-form submit handler, and threaded a
  new `sourceLocation` parameter through `HolonetMessengerService
  .createJobPosting()` → `_gmCreateJobPosting()` → the stored `job.sourceLocation`
  field (via a new `_normalizeJobSourceLocation()` helper, `null` when no
  real id exists — never fabricated). `duplicateArchivedAsDraft` (repost/
  clone) now also carries `sourceLocation` forward.
- **From Atlas Lead**: routes through the same `buildDraftFromAtlasFact()` →
  `buildDraftFromLocation()` path — same fix applies automatically.
- **Manual** (no known issuer selected): no Faction/Contact/Location
  context exists to carry; correctly produces `resolutionKind: 'missing'`/
  no `relationships.locations` entries, not a fabricated relationship.

## 6. Selected Job ecosystem VM (4D)

Unlike Factions (no single "selected" concept — see the Phase 3 audit),
the Job Board already has a clear `jobBoard.selectedJob` singleton. The
ecosystem groups (`identity`/`currentSituation`/`relationships`/`mission`/
`world`) are computed **only for `selectedJob`**, once, in
`GMJobBoardSurfaceService.buildViewModel()` — never for every job card in
the list (see §18 performance). Every legacy flat field on `selectedJob`
(`threadId`, `clientLabel`, `objectives`, `rewards`, `consequenceEntries`,
…) is preserved verbatim via object spread; the new groups are added
alongside them, never replacing them. None of these group names are
written to canonical Job storage.

## 7. Current Situation result (4F)

`currentSituation` reports real, already-derived state: `status`/
`statusLabel` (existing), `settlementState` (ready-to-pay/paid/failed/
not-ready, derived from the real `status` value, not a new lifecycle),
`payoutState` (payable/paid/none, from the existing `rewards.hasPayableRewards`),
`partyRelevance` (is this Job in an actionable status), `locationReady`
(a real, non-missing Location relationship exists), `currentPartyAtMissionLocation`
(truthful — only true when the resolved mission Location's own
`activeForParty` is true), `intelCount`, `factionConsequenceCount`. No
fabricated "3 Active Jobs"-style overclaiming (per the Phase 3F anti-pattern
this phase explicitly avoided too).

## 8. Mission core result (4G)

`mission.objective` (the real primary-tier objective title, falling back to
the first objective), `mission.briefing`/`instructions` (the existing
`briefingBody`/`briefingInstructions`), `mission.reward` (the existing,
untouched `rewards` summary object). No new reward computation — reused
verbatim.

## 9. Faction result (4H)

See §3. `relationships.issuerFaction = { id, name, resolved, resolutionKind }`.
Click → the **pre-existing** `data-job-open-faction` action (unchanged,
already using the correct real `issuerFactionId` when present) — not
re-wired to `navigateToSurface()` this phase, matching the "no unrelated
cleanup" / Phase 3 precedent (Faction → Location was left as-is for the
same reason).

## 10. Contact/Actor result (4I)

`relationships.contact` distinguishes three real shapes: `kind: 'contact'`
(resolved via `FactionRegistryService.findFactionContact()` against the
resolved issuer Faction), `kind: 'actor'` (a linked world/compendium Actor
via `issuerContactActorUuid`/`issuerContactActorId` — never collapsed with
a Faction contact), `kind: 'unresolved'` (a legacy `contactName` with
neither). Click → the **pre-existing** `data-job-open-issuer-actor` action
(unchanged, already resolves the real Actor and opens its own sheet, the
same conservative pattern established in Phase 2/3).

## 11. Location result (4J/4K/4Q)

`relationships.locations[]` resolves from the Job's own real
`sourceLocation.locationId` (§5) via `LocationRegistryService.findLocation()`
— an array per the spec, even though only one primary source Location is
currently modeled. A stale/deleted Location renders `missing: true`
(`"Missing Location"`, no nav control) rather than crashing or silently
dropping the relationship. `currentPartyPresence` is derived from the
resolved Location's own `activeForParty`/`revealState` — never inferred
from briefing text. Click → the new `open-location` action →
`navigateToSurface('locations', {statePatch:{selectedLocationId}})`.

## 12. Intel result (4L)

`relationships.intel[]` resolves via the real Holonet Intel authority
(`HolonetIntelService.getAllIntel()`/`getIntelMetadata()`, filtered by the
real `intel.linkedJobThreadId === job.threadId` — the same
Intel-owns-the-link direction Faction↔Intel already used in Phase 3).
Click → the new `open-intel` action →
`navigateToSurface('intel', {statePatch:{selectedRecordId}})`.

## 13. Consequence result (4M/4N)

`factionConsequenceEntries()` (pre-existing, **unmodified**) still derives
`consequenceEntries` exactly as before — numeric `successDelta`/
`failureDelta` effects are byte-for-byte untouched. This phase adds one
presentation-only pass, `resolveConsequenceFactions()`, threading each
entry's `factionName`/`factionId` against the real Faction Registry for
navigation (`resolvedFactionId`, `resolutionKind`) — never mutating the
stored numeric effects. A Job's `rival` consequence entry (`isRival: true`)
is explicitly documented as a Job-scoped narrative relationship, not proof
the Faction Registry itself stores a rivalry (confirmed absent in the
Phase 3 audit — §2 of that phase). `relationships.rivalFactions` is the
filtered subset where `isRival === true`.

## 14. Settlement result (4P/4AH)

**No settlement/status-transition mechanics were touched.** All mutation
continues to flow through the pre-existing `HolonetMessengerService
.threadAction()`/`transitionJobStatus()` methods, called exactly as
before from the controller's status/objective/consequence/payout form
handlers — none of those handlers were modified. The only change to
`holonet-messenger-service.js` is one new optional parameter
(`sourceLocation = null`, defaulting to a complete no-op for every existing
call site) threaded through `createJobPosting()`/`_gmCreateJobPosting()`/
`duplicateArchivedAsDraft()` — verified by direct reading that no other
logic in those methods was altered. No dedicated executed settlement test
suite exists in this repo to re-run (confirmed by search); the real
consequence-derivation path (`factionConsequenceEntries()`, unmodified) is
exercised end-to-end by the Job ecosystem VM test (§19), which is the
closest existing executable coverage of that mechanism.

## 15. Navigation result (4Y/4AE)

| Flow | Status |
|---|---|
| Job → Faction | Pre-existing, unchanged, already using real `issuerFactionId` |
| Job → Contact/Actor | Pre-existing, unchanged, already using real ids |
| Job → Location | **New**, `navigateToSurface('locations', {statePatch:{selectedLocationId}})` |
| Job → Intel | **New**, `navigateToSurface('intel', {statePatch:{selectedRecordId}})` |

All navigation uses stable ids only; no text/name-based destination
matching was introduced. No new routing helper — both new flows use the
Phase 2 `GMDatapad.navigateToSurface()` contract directly.

## 16. Broken reference result (4X)

A stale `sourceLocation.locationId` renders as a local `missing: true` row
("Missing Location", no nav control) rather than crashing or navigating to
a false destination. A stale `issuerFactionId` (Faction deleted) reports
`resolutionKind: 'missing'`. No mutation of any Job record happens during
render in either case.

## 17. Action integrity (4AI)

`tests/gm-datapad-action-integrity-contract.test.mjs` (pre-existing,
unmodified) reports the same **244/141/22/81/0** totals before and after
this phase. This is a known, pre-existing scanner characteristic, not a
regression: its template scan (`DATA_ATTR_RE`) only recognizes
literal-valued `data-x="value"` attributes; the Job Board's whole family
of bare-presence action attributes (`data-job-open-faction`,
`data-job-open-issuer-actor`, `data-job-filter-issuer`,
`data-job-followup-contract`, and now the two new
`data-job-open-location`/`data-job-open-intel`) has never been visible to
this scanner, before or after this phase — verified directly (`surfaces.jobs
.controls` contains neither the old nor the new bare-attribute controls).
Real proof for the two new controls instead comes from an executed test
(`tests/gm-job-context-navigation-controller.test.mjs`, §19) driving the
actual controller wiring end to end — stronger proof than the static
scanner provides for this attribute family. `tests/gm-datapad-no-duplicate-handler-regression.test.mjs`
(pre-existing, unmodified) also still passes.

## 18. Performance result (4AB)

The ecosystem resolution helpers (`resolveIssuerFaction`,
`resolveIssuerContact`, `resolveJobLocations`, `resolveJobIntel`,
`resolveConsequenceFactions`) run exactly once, only for the selected Job,
inside `buildSelectedJobEcosystemGroups()` — never per-row inside a
template loop, never for the full `jobs[]` list. `resolveJobIntel()` is the
one added authority scan (all Intel records, same cost class as Faction's
pre-existing `_loadIntelRows()` in Phase 3); no new index/cache was built,
and no generic caching framework was introduced.

## 19. Tests (4AC/4AD/4AE/4AF/4AG)

- `tests/gm-job-ecosystem-view-model.test.mjs` (executed) — a pure
  additive design contract for `identity`/`currentSituation`/`mission`/
  `world` (none existed before this phase), and a bug-category regression
  proof for `relationships.locations` (the creation-path gap, §5). Covers:
  a canonical Job resolving `issuerFaction`/`contact`/`locations`/`intel`
  with real ids; a legacy Job with only a unique `factionName` resolving
  `legacy-name-unique`; two same-named Factions producing `ambiguous` with
  no arbitrary id chosen; a bare Job with no context resolving honest empty
  relationships. Verified via `git stash` to fail against the pre-Phase-4
  source and pass after.
- `tests/gm-job-source-location-identity.test.mjs` (executed) — a
  bug-category regression proof for the exact creation-path gap in §5:
  `HolonetMessengerService._normalizeJobSourceLocation()` executed
  directly, plus static wiring assertions pinning every hop (wizard hidden
  fields → controller submit → `createJobPosting`/`_gmCreateJobPosting` →
  stored `job.sourceLocation`, and `duplicateArchivedAsDraft` preservation)
  — the full `createJobPosting()` call chain is not exercised end-to-end
  (it triggers live thread-creation/messaging side effects this repo's
  Node harness does not shim), matching this codebase's established
  precedent for un-instantiable call chains (`gm-surface-render-seams
  .test.mjs`). Verified via `git stash` to fail against the pre-Phase-4
  source and pass after.
- `tests/gm-job-context-navigation-controller.test.mjs` (executed) — a
  bug-category regression proof (no such navigation existed at all before
  this phase). Drives the real `GMJobBoardSurfaceController
  ._wireRelationshipButtons()` delegated listeners through `open-location`/
  `open-intel`, proving the shell navigation call happens exactly once with
  the correct surface and real identity field, and that an empty/missing
  id never navigates. Verified via `git stash` to fail against the
  pre-Phase-4 source and pass after.
- `tests/gm-datapad-action-integrity-contract.test.mjs`,
  `tests/gm-datapad-no-duplicate-handler-regression.test.mjs`,
  `tests/gm-datapad-wizard-contract.test.mjs` (all pre-existing,
  unmodified) — re-verified green (§17).
- Every Phase 1-3 ecosystem/navigation test (`gm-locations-*`,
  `gm-faction-*`, `gm-datapad-context-navigation-contract`,
  `gm-datapad-navigation-destination-selection`) — re-verified green,
  unchanged (§22).

## 20. Live Foundry checklist (not run — no live client available)

1. Open GM Datapad → Job Board, select an active Job. PASS = identity/
   status clear, objective immediately visible, issuer/location
   understandable.
2. Click the issuer Faction link. PASS = exact Faction selected. Return to
   the Job.
3. Click the issuer Contact/Actor link. PASS = correct Faction/contact or
   Actor destination opens (unchanged from before this phase).
4. Click the Job's Location relationship row. PASS = Locations opens with
   that exact Location selected, no search.
5. If the party is currently at that Location: PASS = "Party Here"/
   truthful party-at-mission-location state shown; otherwise absent.
6. Click a linked Intel row. PASS = Intel opens with that exact record
   selected.
7. Open an old Job lacking a canonical `issuer.factionId`. PASS = still
   resolves the Faction relationship when the name is unique; shows an
   honest ambiguous/unresolved state otherwise.
8. Test a Job with a since-deleted Faction/Location/Intel reference. PASS =
   Job Board remains usable, the missing relation renders locally, no
   crash.
9. Create a Job from a Faction. PASS = `factionId` retained. Create one
   from a Contact. PASS = `factionId`+`contactId` retained. Create one from
   a Location (via a Location's "Create Job" action). PASS = the new
   Location relationship row appears on the created Job, and the Location
   is never treated as the issuing Faction.
10. Complete/fail a Job using the existing status-transition controls.
    PASS = status correct, faction consequences apply exactly as before
    this phase, reward flow unchanged. Settle/pay if applicable. PASS =
    existing semantics preserved.
11. Resize the Datapad window narrow → wide with a Job selected. PASS =
    Job detail remains readable, no horizontal clipping, no nested scroll
    trap (reuses the shell's existing `container-type: inline-size`
    established in Phase 2/3 — no new breakpoint work needed here).

If no live client exists: DO NOT CLAIM LIVE VALIDATION. (None exists in
this environment — see §1.)

## 21. Deferred issues

- **Job → Faction and Job → Contact/Actor were not migrated to the Phase 2
  `navigateToSurface()` contract** — they already worked correctly via the
  older two-call `patchSurfaceState`+`_navigateTo` composition
  `navigateToSurface()` itself wraps, and touching working, unrelated code
  was out of scope ("no unrelated cleanup"). A future cleanup pass could
  unify every Job Board navigation call site onto the named contract for
  consistency; purely cosmetic, no behavior change.
- **The action-integrity scanner's bare-attribute blind spot** (§17) is
  pre-existing and was not fixed — out of scope for this phase, and fixing
  a shared dev-tooling scanner was not requested. Documented so it is not
  mistaken for a regression by a future audit.
- **No dedicated executed settlement/payout test suite exists** in this
  repo (§14) — none was added this phase beyond the consequence-derivation
  coverage the ecosystem VM test already provides, since no settlement
  mechanics were touched and building a full `createJobPosting()`-to-payout
  integration harness under the Node shim would be a much larger,
  out-of-scope undertaking. Flagged as a good candidate for a future,
  dedicated settlement-regression pass.

## 22. Phase 5 recommendation

**INTEL AS THE "WHAT IS KNOWN" HUB** — the next natural expansion, now
that Locations, Factions, and Job Board all resolve and navigate to Intel
using the same real `HolonetIntelService` authority and the same Phase 2
navigation contract. **Not started, per explicit instruction.**

# ECOSYSTEM REDESIGN — PHASE 5: INTEL AS THE "WHAT IS KNOWN" HUB

## 1. Phase 5 verdict

**PHASE 5 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP.** No live Foundry
client is available in this environment. Every claim below is verified by
direct source reading and by executing the real production code
(`HolonetIntelService.createIntelDraft`/`normalizeLinks`,
`GMIntelSurfaceService.buildViewModel`, the real
`GMIntelSurfaceController` click-delegation branches, the real
`GMDatapad.navigateToSurface()` contract from Phase 2) under the repo's
Foundry-shim Node harness.

## 2. Intel authority audit (5A)

Read in full: `scripts/holonet/subsystems/holonet-intel-service.js` (1223
lines), `scripts/ui/shell/gm/GMIntelSurfaceService.js`,
`scripts/ui/shell/gm/controllers/GMIntelSurfaceController.js`,
`scripts/ui/shell/gm/LocationIntelBridgeService.js`,
`scripts/ui/shell/gm/FactionIntelBridgeService.js`,
`templates/apps/gm-datapad/surfaces/intel.hbs`,
`scripts/ui/shell/gm/LocationSceneBridgeService.js`.

Intel is modeled as metadata (`record.metadata.intel`) on an existing
Holonet record, not a parallel storage system — the outer record's
`title`/`body` are presentation projections; the intel object under
`INTEL_METADATA_KEY` is the real data. `normalizeIntelMetadata()` is the
single normalization function for every write path (create/update/
archive/destroy/decryption-state changes) and returns an explicit
whitelist object literal — no generic passthrough field of any kind.
Field-authority table:

| Field | Classification |
|---|---|
| `id`, `title`, `kind`, `classification`, `status`, `persistence`, `revealState`, `summary`, `gmNotes`, `publicBody`/`redactedBody`/`fullBody`, `tags`, `visibility`, `skillGate`, `lockbox`, `delivery`, `dossierCommit`, `createdAt`/`updatedAt`/`readyAt`/`releasedAt`/`archivedAt`/`destroyedAt` | CANONICAL_INTEL_DATA |
| `linkedFactionId`, `linkedContactId`, `linkedActorUuid`, `linkedJobThreadId`, `linkedSceneUuid`, `linkedItemUuid`, `linkedUuids` | RELATIONSHIP_ID — pre-existing, all already correctly whitelisted in `normalizeLinks()` |
| `linkedLocationId`, `sourceFactId` | **RELATIONSHIP_ID — NEW this phase.** Confirmed absent from `normalizeLinks()` before this phase (see §3) |
| `record.title`/`record.body`/`record.sourceFamily`/`record.sourceId`/`record.intent` | DERIVED_PRESENTATION — written by `applyIntelToRecord()` from the intel object, never independently authoritative |
| Decryption/lockbox subsystem (`skillGate`, `lockbox`, `HolonetDecryptionService`) | EXTERNAL_AUTHORITY — layered mechanics, untouched this phase |
| Delivery/reveal mechanics (`deliverAsSecretNote`/`deliverAsMessengerMessage`/`deliverAsBulletin`/`releaseToDossier`, `getPlayerIntel`) | EXTERNAL_AUTHORITY — the real reveal/publication pipeline, untouched this phase (see §14) |
| A `metadata: {...}` object on data passed into `createIntelDraft`/`updateIntel` | **UNCLEAR → confirmed dead** — `normalizeIntelMetadata()` never reads a `data.metadata` field at all (see §3) |

## 3. Knowledge-concept distinction (5B)

Confirmed via source reading, not assumed: **Atlas Fact**, **Atlas Lead**,
**Intel**, **Job Briefing**, and **Faction Description** are five
architecturally separate concepts with no auto-conversion between them.

- **Atlas Fact** — `location.atlasFacts[]`, a per-Location array
  (`{id, title, teaser, body, category, skill, dc, onReveal}`). Owned by
  `LocationRegistryService`; there is no global Fact registry. A Fact's
  `onReveal` can point at creating a Job draft or an Intel draft, but the
  Fact itself always remains on the Location.
- **Atlas Lead** — an actor-flag-based discovery record
  (`LocationRegistryService.getAtlasLeadDiscoveries()`,
  `ATLAS_ACTOR_FLAG`), produced when a PC actor succeeds a Gather
  Information-style check against a Fact. A Lead references a Fact
  (`factId`) and a Location (`locationId`) by id; it is not itself Intel or
  a Fact copy.
  - `LocationsSurfaceController._createIntelFromLead()` (pre-existing,
    unchanged this phase) already turns a resolved Lead into a real Intel
    draft via `LocationIntelBridgeService.createIntelDraftFromFact()` —
    the exact bridge this phase fixed the identity bug in (§4). This
    remains the only Lead→Intel conversion path; a Lead is never itself
    treated as Intel.
- **Intel** — the canonical knowledge-record authority audited in §2. May
  *link to* a Location/Faction/Job/Actor/Scene/source-Fact by stable id,
  never copy their data.
- **Job Briefing** — `job.briefing*` fields on a Job Board thread, owned
  by `HolonetMessengerService`/Job Board. Distinct from Intel even when a
  Job's briefing text is narratively similar to an Intel summary; no
  shared storage, no conversion.
- **Faction Description** — `faction.description`/`faction.publicSummary`
  fields owned by `FactionRegistryService`. Distinct from any Intel that
  happens to be *about* that Faction.

No code changes were made to blur these boundaries; this phase only adds
Intel-side *links* (ids) to Location/Job/Faction/Actor/Scene, never copies
of their content.

## 4. Creation-path identity audit — the confirmed bug (5C, 5H, 5M, 5T)

**The one real gap found by this audit**, in the same shape as the Phase 4
Job/Location gap: `LocationIntelBridgeService.buildDraftDataFromLocation()`/
`buildDraftDataFromFact()` built a `metadata: {locationId, locationName,
locationChain, factId, factTitle}` object on the draft data passed to
`HolonetIntelService.createIntelDraft()` — but `normalizeIntelMetadata()`/
`normalizeLinks()` never read a `data.metadata` field at all.
**Every Intel record ever created from a Location or an Atlas Fact lost
that relationship completely at the moment it was saved — not even a
display name survived.** `linkedFactionId` (from
`location.controllingFactionId`) and `linkedSceneUuid` (from
`location.map.sceneUuid`) did survive, since those were already passed as
top-level fields `normalizeLinks()` actually reads.

A full-repo grep confirmed zero other consumers of `metadata.locationId`/
`metadata.factId`/`.locationChain` anywhere in `scripts/` — no legacy
reader depends on the dead shape, so the fix needed no compatibility shim.

**Fix**, narrow and additive, following Intel's own existing flat
`linked*` convention rather than reviving a nested `metadata` object:

1. `HolonetIntelService.normalizeLinks()` gained two new fields:
   `linkedLocationId` and `sourceFactId` (the Location this Intel is
   *about*, and — when drafted from a specific Atlas Fact — that Fact's
   own id, scoped to `linkedLocationId` since Facts live per-Location, not
   in a global registry).
2. `LocationIntelBridgeService.buildDraftDataFromLocation()`/
   `buildDraftDataFromFact()` now write `linkedLocationId`/`sourceFactId`
   as top-level draft fields instead of the dead `metadata` object (which
   was removed, not merely supplemented).

`FactionIntelBridgeService` was read in full and confirmed to **not** have
this bug — it already passes `linkedFactionId`/`linkedContactId`/
`linkedActorUuid` as top-level fields via
`HolonetIntelService.buildDraftFromFaction`/`buildDraftFromContact`. Its
private `#linkIntelToContact()` reverse-link (writing the new Intel's id
onto `contact.linkedIntelIds` after creating Intel from a Contact) is a
real, pre-existing, correct mechanism — preserved untouched.

Locations' own reverse relationship (`location.linkedIntelIds[]`, a
GM-maintained field on the Location, resolved via
`GMLocationsSurfaceService.resolveIntelRow()`) is a separate, independent,
already-working mechanism in the *other* direction (Location→Intel) —
distinct from, and not replaced by, the new Intel→Location link this phase
adds. Neither direction infers the other.

Bug-category regression proof: `tests/gm-intel-location-fact-identity.test.mjs`
(§19).

## 5. Selected Intel ecosystem VM (5C)

Like Job Board (and unlike Factions, which has no single-selected-detail
concept — Phase 3 audit), Intel already has a clear
`intelManager.selectedCard` singleton (`GMIntelSurfaceService
.buildViewModel()`'s `selectedRecordId`/`selectedRecord`/`selectedCard`
chain, pre-existing). The ecosystem groups (`identity`/`currentSituation`/
`relationships`/`knowledge`/`world`) are computed **only for
`selectedCard`**, once, in the new `buildSelectedIntelEcosystemGroups()` —
mirroring Job Board's `buildSelectedJobEcosystemGroups()` exactly, never
for every card in the list (see §17 performance). Every legacy flat field
on `selectedCard` (`title`, `summary`, `linkLabel`, `visibilityLabel`, …)
is preserved verbatim via object spread; the new groups are added
alongside them. None of these group names are written to canonical Intel
storage.

## 6. Current Situation result (5F)

`currentSituation` reports real, already-derived state: `revealState`/
`revealStateLabel` (existing), `visibilityMode`, `dossierCommit`,
`hasLockbox`, `skillGateEnabled`, `isReleased` (`status ===
INTEL_STATUS.RELEASED`), and `currentPartyAtLocation` — truthful, derived
only from the resolved Location relationship's own `activeForParty`/
`revealState`, mirroring Job Board's identical
`currentPartyAtMissionLocation` derivation (Phase 4F) rather than
inventing a second "is the party here" concept.

## 7. Knowledge core result (5G/5N)

`knowledge` groups the actual content fields — `summary`, `publicBody`,
`redactedBody`, `fullBody`, `gmNotes`, `persistence`/`persistenceLabel`,
`lockboxSummary` — as a single presentation group, never a copy (these are
the same underlying `intel.*` fields the legacy VM already exposed,
regrouped, not duplicated).

## 8. Player visibility / reveal model (5H/5AH)

No second reveal/visibility mechanism was built. `currentSituation`
surfaces the *existing* `intel.visibility.mode`/`dossierCommit`/
`revealState` fields read-only; the real reveal transitions remain
entirely owned by `deliverAsSecretNote`/`deliverAsMessengerMessage`/
`deliverAsBulletin`/`releaseToDossier`/`getPlayerIntel` in
`HolonetIntelService`, none of which this phase edited (confirmed by
source diff — the only edited function in that file is `normalizeLinks()`,
§4). No dedicated pre-existing test suite exercised these delivery
methods to regress against; their exact source text is unchanged, which is
the strongest available proof under this repo's Node harness (these
methods drive live thread/messenger side effects the shim does not
model, same limitation noted for Job's `createJobPosting()` in Phase 4).

## 9. Location relationship result (5H/5J)

`resolveIntelLocation()` resolves `intel.linkedLocationId` via the real
`LocationRegistryService.findLocation()` — `resolutionKind: 'canonical-id'`
when found, `'missing'` when the id is stale/broken (§13), `null` when
unlinked. Never a name-based guess. Proven with real Location fixtures in
`tests/gm-intel-ecosystem-view-model.test.mjs` (§19).

## 10. Source Atlas Fact provenance result (5M)

`resolveIntelSourceFact()` resolves `intel.sourceFactId` **scoped to the
resolved Location** (`location.atlasFacts.find(f => f.id ===
sourceFactId)`) — presentation-only, resolved fresh on every render. The
Fact's own text is never copied onto the Intel record; only `{id, title,
teaser}` are surfaced for display. `resolutionKind: 'canonical-id'`/
`'missing'`, matching the Location relationship's convention.

## 11. Faction/Contact relationship result (5I)

Reused, unchanged: `findFaction()`/`findContact()` (pre-existing, already
used by `cardFromRecord()`). The ecosystem VM wraps their result in the
same `{id, name, resolved, resolutionKind}` shape as every other
relationship for consistency, without altering the underlying resolution
logic.

## 12. Job relationship result (5K)

`resolveIntelJob()` resolves `intel.linkedJobThreadId` via
`HolonetStorage.getThread()` plus `GMJobBoardSurfaceService`'s own
exported `jobForThread`/`jobStatus`/`statusLabel` — the exact same reuse
pattern already established by `GMLocationsSurfaceService.resolveJobRow()`
(that file's own comment explicitly documents this export existing "so
other real authorities... can reuse this service's own derivation instead
of duplicating it"). Intel never stores a copy of a job's title or status.

## 13. Actor/Scene relationship result (5L) and broken-reference result (5X)

`resolveIntelScene()`/`resolveIntelActor()` resolve `linkedSceneUuid`/
`linkedActorUuid` via the same synchronous world-collection-id technique
already established and documented in `GMLocationsSurfaceService
.resolveSceneRow()`/`parseWorldDocId()` (`Scene.<id>`/`Actor.<id>` via
`game.scenes.get`/`game.actors.get`; a `Compendium.*` uuid is reported
`resolutionKind: 'ambiguous', unverifiable: true` rather than falsely
"missing", since resolving it for real needs an async `fromUuid()` this
phase defers to click-time in the controller, exactly like Locations'
open-contact 'actor' branch and Job Board's `_resolveActorReference`).
A stale/broken `linkedLocationId`/`linkedJobThreadId`/`linkedSceneUuid`/
`linkedActorUuid` resolves honestly as `resolved: false,
resolutionKind: 'missing'` — never silently dropped, never fabricated.
Proven for Location/Job in `tests/gm-intel-ecosystem-view-model.test.mjs`
case 3 (§19); Scene/Actor honesty follows the identical, already-proven
Locations pattern being reused verbatim.

## 14. Job Board / party-location context (5P/5Q)

`intelManager.selectedCard.currentSituation.currentPartyAtLocation` is the
Intel-side answer to "is the party where this Intel is about" (§6). No new
party-location concept was introduced; it reads the same
`location.activeForParty`/`revealState` fields Job Board already reads
for its own `currentPartyAtMissionLocation` (Phase 4F). The user's own
broader observation (raised mid-Phase-5, see the Phase 6 discussion below)
that party-location currently has two representations
(`Location.activeForParty` vs. `HolonetStateService partyState.location`)
is real and was not resolved by this phase — Intel only reads the
Location-side representation, matching every other ecosystem-phase
surface built so far; normalizing the two representations is scoped to
Phase 6 (§21 below), not duplicated or guessed at here.

## 15. Intel list / knowledge queue / selected-survives-filters result (5R)

Confirmed structurally already correct before this phase, not rebuilt:
`GMIntelSurfaceService.buildViewModel()` resolves `selectedRecord`
directly via `HolonetIntelService.getIntelById(selectedRecordId)` — never
from the filtered `visibleCards` list — so a selected Intel record stays
selected (and its detail panel keeps rendering) even when the active
filters would hide it from the left-rail card list. This phase did not
change that resolution path; only appended the new ecosystem groups onto
the same `selectedCard`.

## 16. Navigation result (5Y)

`GMIntelSurfaceController._wireRelationshipButtons()` adds six branches —
`open-location`/`open-faction`/`open-contact`/`open-job`/`open-scene`/
`open-actor` — mirroring Job Board's `_wireRelationshipButtons()` name and
shape exactly. Location/Faction/Contact/Job route through the real
`navigateToSurface()` shell contract established in Phase 2
(`statePatch: {selectedLocationId}` / `{focusedFactionId}` /
`{focusedFactionId, focusedContactId}` / `hostPatch:
{selectedJobThreadId}`, each matching the exact destination-specific
contract already proven by Locations/Job Board's own identical branches).
Scene and Actor are **not** GM Datapad surfaces, so those two branches
resolve and open the real Foundry document directly (`scene.view()`/
`actor.sheet.render(true)`) instead of calling `navigateToSurface()` —
matching `LocationSceneBridgeService`'s own technique and
`GMLocationsSurfaceController`'s existing `open-contact` 'actor' branch,
never a newly-invented mechanic. An empty/missing id never navigates or
opens a document (fail-safe, proven in §19).

## 17. Performance result (5AC)

The six resolvers (`resolveIntelLocation`, `resolveIntelSourceFact`,
`resolveIntelJob`, `resolveIntelScene`, `resolveIntelActor`, plus the
reused `findFaction`/`findContact`) run exactly once, only for
`selectedCard`, inside `buildSelectedIntelEcosystemGroups()` — never
per-row inside `cardFromRecord()`'s list-building loop. `resolveIntelJob()`
is the one added authority read (`HolonetStorage.getThread()`, a single
lookup by id, not a full-thread scan) — same cost class as Job Board's
`resolveJobIntel()` full-scan in Phase 4, but cheaper since Intel already
holds the job's id directly. No new index/cache/generic caching framework
was introduced.

## 18. Mutation authority (5AJ)

No canonical Intel/Location/Faction/Job template is mutated by this
phase's VM code. `GMIntelSurfaceService.js`/`GMIntelSurfaceController.js`'s
existing lifecycle-mutation branches (`updateIntel`/`markReady`/
`releaseIntel`/`archiveIntel`/`destroyIntel`/deliver-*) are entirely
unchanged; the six new navigation branches only read and navigate, never
write.

## 19. Tests (5AD–5AH)

- `tests/gm-intel-location-fact-identity.test.mjs` (executed) — the
  bug-category regression proof for §4: draft-build round trip through the
  real `HolonetIntelService.createIntelDraft()`/`normalizeLinks()`,
  proving `linkedLocationId`/`sourceFactId` persist for real, and that an
  unrelated Intel record never fabricates either. Verified via `git stash`
  to fail against the pre-Phase-5 source and pass after.
- `tests/gm-intel-ecosystem-view-model.test.mjs` (executed) — a pure
  additive design contract for `identity`/`currentSituation`/
  `relationships`/`knowledge`/`world` (none existed on the Intel VM before
  this phase), executed against realistic fixtures across every real
  authority Intel now resolves through (`LocationRegistryService`,
  `FactionRegistryService`, `HolonetStorage`/`GMJobBoardSurfaceService`,
  `game.scenes`, `game.actors`). Covers: a fully-linked Intel record
  resolving all six relationships with real ids; an unlinked Intel record
  reporting every relationship as `null` (never fabricated); a Intel
  record with stale `linkedLocationId`/`linkedJobThreadId` resolving
  honestly as `missing` (§13/5X); no selected Intel at all producing no
  crash. Verified via `git stash` to fail against the pre-Phase-5 source
  (VM code) and pass after.
- `tests/gm-intel-context-navigation-controller.test.mjs` (executed) — a
  bug-category regression proof (no such navigation existed at all before
  this phase, mirroring `gm-job-context-navigation-controller.test.mjs`'s
  shape). Drives the real `GMIntelSurfaceController
  ._wireRelationshipButtons()` delegated listeners through all six
  branches, proving each calls the correct contract (or opens the correct
  real document) exactly once with the correct real-id patch, and that an
  empty/missing id never navigates or opens anything. Verified via `git
  stash` to fail against the pre-Phase-5 source and pass after.
- `tests/gm-intel-relationship-template-wiring.test.mjs` (executed) —
  static proof that `intel.hbs`'s new relationship markup actually emits
  the exact `data-intel-open-*` attributes the controller queries for,
  preventing silent template/controller drift. Verified via `git stash` to
  fail against the pre-Phase-5 source and pass after.
- `tests/gm-datapad-action-integrity-contract.test.mjs`,
  `tests/gm-datapad-no-duplicate-handler-regression.test.mjs`,
  `tests/gm-datapad-wizard-contract.test.mjs` (all pre-existing,
  unmodified) — re-verified green (§20).
- Every Phase 1-4 ecosystem/navigation/creation-identity test
  (`gm-locations-*`, `gm-faction-*`, `gm-job-*`,
  `gm-datapad-context-navigation-contract`,
  `gm-datapad-navigation-destination-selection`) — re-verified green,
  unchanged.

## 20. Action integrity (5AI)

`tests/gm-datapad-action-integrity-contract.test.mjs` (pre-existing,
unmodified) reports the same **244/141/22/81/0** totals before and after
this phase — the pre-existing bare-presence-attribute blind spot
documented in Phase 4 §17 (`DATA_ATTR_RE` only matches literal
`data-x="value"` attributes) applies identically to Intel's six new
`data-intel-open-*` controls, none of which carry a literal value on the
attribute itself. Not a regression, not newly introduced by this phase.
Real proof for the six new controls instead comes from the executed
`tests/gm-intel-context-navigation-controller.test.mjs` (§19) plus the
static `tests/gm-intel-relationship-template-wiring.test.mjs` (§19) —
together stronger proof than the static scanner provides for this
attribute family, matching the precedent set in Phase 4 §17.

## 21. Deferred issues / known missing canonical links

- **Party-location dual representation** (`Location.activeForParty` vs.
  `HolonetStateService partyState.location`) — real, pre-existing, not
  introduced or resolved by this phase. Intel reads only the
  Location-side representation, consistent with every prior
  ecosystem-phase surface. Normalizing this is explicitly scoped to
  Phase 6 (see the user's own Phase 6 spec, §6F).
- **Bulletin/Job/Faction/Skill-Challenge provenance/source ids** — audited
  only at the level needed to confirm Intel's own concept boundaries
  (§3); a full audit of those systems' own schemas is out of scope for
  Phase 5 and explicitly deferred to Phase 6 (`GMCampaignContextService`)
  and later dedicated phases per the user's own roadmap.
- **The action-integrity scanner's bare-attribute blind spot** (§20) is
  pre-existing and was not fixed this phase either — same reasoning as
  Phase 4 §17: fixing shared dev-tooling scanner behavior was not
  requested and is out of scope for a surface-level ecosystem phase.
- **Compendium-sourced Scene/Actor UUIDs** on Intel resolve as
  `unverifiable` rather than a real name in the ecosystem VM's synchronous
  resolution (§13) — same documented tradeoff as
  `GMLocationsSurfaceService.resolveSceneRow()`; opening them still works
  correctly at click-time via the controller's async `fromUuid()`
  fallback.

## 22. Phase 6 recommendation

Mid-Phase-5, the user requested and received a discussion of the broader
14-surface GM Datapad ecosystem (Home, Workspace, Healing, Bulletin, Skill
Challenges, Trade, Store, Approvals, House Rules, Settings, alongside the
four already-redesigned hubs). The agreed direction: **Phase 6 combines
(A) a new read-only `GMCampaignContextService` cross-authority resolution
layer with (B) rebuilding Home as the campaign Command/Attention Hub**,
per the user's formal Phase 6 specification. **Not started as of this
Phase 5 commit — begins next, per that specification's own start gate
(verify Phase 5's exact HEAD/CI state before proceeding).**

# ECOSYSTEM REDESIGN — PHASE 6: CAMPAIGN CONTEXT SERVICE + HOME COMMAND HUB

## 1. Phase 6 verdict

**PHASE 6 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP.** No live Foundry
client is available in this environment. Every claim below is verified by
direct source reading and by executing the real production code
(`GMCampaignContextService`'s six public methods, `GMCampaignTargetService`,
`GMDashboardSurfaceService`/Home's own `_buildGmHomeContext`/
`_wireHomeAttentionTargets` wiring) under the repo's Foundry-shim Node
harness, plus static source-wiring proof for the one call chain that
cannot be instantiated end-to-end (`GMDatapad` itself — see §19).

## 2. Start gate (verified before any Phase 6 code)

- Branch: `claude/locations-context-contract-i8tbp0`. PR: #963 (open, draft).
- Clean working tree confirmed before starting.
- Phase 5 HEAD at start: `7049cb407c44b2c7460564ab645e75bebf443e1b` (4
  commits: `5115d40`, `5fc405d`, `baa5644`, `7049cb4`).
- CI on that exact head: **green** (`Rolling system validation`,
  conclusion `success`), confirmed via the GitHub API before Phase 6 work
  began.
- Baseline `node tools/run-rolling-syntax-check.mjs`: 2279/2279.
- Baseline `node tools/run-rolling-tests.mjs`: 167/167 (163 Phase-1-4
  baseline + 4 Phase 5 test files).

## 3. Integration authority audit (6A)

Read in full or in the relevant part: `GMDashboardSurfaceService.js`,
`scripts/apps/gm-datapad.js` (`_prepareContext`, `_buildGmHomeContext`,
`_getHomeBadgeCounts`/`_getJobBadgeCounts`/`_getTradeBadgeCounts`,
`_loadPendingDroids`/`_loadStorePendingApprovals`, `_onRender`),
`gm-party-roster-service.js`, `holonet-state-service.js`,
`game-session-store.js`, `GMWorkspaceSurfaceService.js`,
`GMLocationsSurfaceService.js` (its `resolveJobRow`/`resolveIntelRow`
pattern), `GMJobBoardSurfaceService.js` (its exported `jobForThread`/
`jobStatus`/`statusLabel`), plus a dedicated research pass (quoted
verbatim into this audit's working notes, summarized in §5) covering
`GMTradeConsoleSurfaceService.js`, `GMStoreControlSurfaceService.js`,
`GMApprovalsSurfaceService.js`/`GMApprovalOperationsService.js`,
`GMHealingSurfaceService.js`/`GMCombatRecoveryService`/`GMHealingTrigger`,
and `SkillChallengeStore.js`/`SkillChallengeState.js`/
`GMSkillChallengeSurfaceService.js`.

Integration matrix (READ-only; the "Service should mutate?" column is
`NO` for every row, per the Phase 6N contract):

| Domain | Canonical authority | Stable id | Existing resolver | Existing summary API | Legacy fallback |
|---|---|---|---|---|---|
| Location | `LocationRegistryService` | `location.id` | `findLocation(id)` | `getRegistry()`/`summarizeForWorkspace()` | none needed |
| Faction | `FactionRegistryService` | `faction.id` | `findFaction(id)` | `getRegistry()`/`summarizeForWorkspace()` | name-match (existing surfaces only) |
| Job | `HolonetStorage` (thread, `threadType:'job'`) | `thread.id` | `getThread(id)` + `jobForThread`/`jobStatus`/`statusLabel` (exported by `GMJobBoardSurfaceService`) | `getAllThreads()` filtered | `factionName` (existing surfaces only) |
| Intel | `HolonetIntelService` | `intel.id`/`record.id` | `getIntelById(id)` | `getAllIntel(filters)` | none |
| Party | `GMPartyRosterService` + `Location.activeForParty` | actor id / location id | `getPartyActors()` | n/a | `HolonetStateService.getPartyState().location` (free text, no id — see §7) |
| Actor | Foundry `game.actors` | `actor.id`/`actor.uuid` | `game.actors.get(id)` | n/a | none |
| Trade | Holonet transfer records (`HolonetStorage`) | `record.id` (`recordId`) | `GMTradeConsoleSurfaceService.buildTradeConsoleVm()` | same | none |
| Approvals | Four independent sources (droid actor scan, `pendingCustomPurchases` setting, `GameSessionStore`, `FactionRegistryService.getPendingSuggestions()`) | composite `key` (`droid:<actorId>`, `custom:<index>`, `game:<sessionId>`, `faction:<actorId>:<recordId>`) | `GMApprovalsSurfaceService.buildViewModel()` (mutates `host.selectedApprovalKey` as a side effect — **not safely reusable read-only**, see §5) | same | none |
| Healing/Recovery | `GMCombatRecoveryService`/`GMHealingTrigger` | `actor.id` (`GMHealingTrigger`) / `actor.id`+`actor.uuid` (`GMCombatRecoveryService`) | `getHealingSummary()` | same | none |
| Skill Challenge | `SkillChallengeStore` | `challenge.id` | `getAll()` | same | none — **no `sourceJobThreadId`/`sourceLocationId` field exists at all** (confirmed, §12) |

## 4. Domain classification (Phase 6 addendum §A)

Per the user's own mid-Phase-6 addendum, connections are classified by
KIND, not flattened into one relationship graph:

- **Party/Player Operations** (subject matter is player Actors/party
  state/transactions, not player-accessible surfaces): Workspace,
  Healing, Trade, Store, Skill Challenges (partially).
- **Shared/Player Communication & Interaction** (GM-owned canonical state
  with a player-visible/interactive projection): Bulletin, Jobs, Intel,
  Skill Challenges.
- **GM Campaign Authority**: Locations, Factions, Approvals, House Rules.
- **Command layer**: Home — observes/summarizes/prioritizes/routes across
  the other three regions; owns no canonical campaign data itself.
- **Configuration** (outside the campaign graph): Settings, House Rules
  (policy/mechanical configuration, never a semantic campaign-object
  relationship unless a rule explicitly declares affected systems — none
  do today, confirmed by reading `GMHouseRulesSurfaceService.js`: no
  `affectedSystems`/`appliesTo`/`scope` field exists on a rule record).

## 5. `GMCampaignContextService` — role and non-authority contract (6B/6N)

File: `scripts/ui/shell/gm/GMCampaignContextService.js`. **Owns no
canonical campaign record; performs no mutation of any kind.** Confirmed
by an executed static-source scan (`tests/gm-campaign-context-read-only-
contract.test.mjs`, §19) that no mutation call site
(`game.settings.set`/`.update(`/`.create(`/`.delete(`/any `*RegistryService
.upsert*`/`HolonetIntelService.create*`/`TransactionEngine.*`/etc.) exists
anywhere in the file.

**One deliberate exception to "reuse the exact existing resolver"**: the
audit found `GMApprovalsSurfaceService.buildViewModel(host)` **mutates its
host as a side effect** (`host.selectedApprovalKey = ...`,
`host.approvalEditMode = false`, etc., lines 693-697) whenever the caller's
stored selection no longer matches the current request list — calling it
from a read-only context service would risk stomping the real GM
Datapad's selection state whenever `attentionItems()` runs on a render for
a *different* surface. `GMCampaignContextService.attentionItems()`
therefore independently re-derives the four approval sources
(droid-pending actor scan, `pendingCustomPurchases` setting, pending-GM
`GameSessionStore` sessions, `FactionRegistryService.getPendingSuggestions()`)
using the same raw authorities `GMApprovalsSurfaceService` itself reads
from, and reconstructs the **identical composite key scheme**
(`droid:<actorId>`, `custom:<index>`, `game:<sessionId>`,
`faction:<actorId>:<recordId>`) so that navigating via
`GMCampaignTargetService.approval(key)` lands on the exact same request
the real Approvals surface would show — proven by construction (the key
format is copied verbatim from `buildFactionSuggestionRequest`/etc.), not
merely assumed.

## 6. Public API result (6C)

Implemented exactly as specified: `party()`, `forLocation(locationId)`,
`forFaction(factionId)`, `forJob(threadId)`, `forIntel(intelId)`,
`forActor(actorRef)`, `attentionItems()`. All `static async`. No method
was made "enormous" — each delegates to small private per-domain
resolvers (`resolveIntelLocation`-style, one per relationship) inside the
same file, matching the Phase 4/5 established pattern rather than
inventing a new style.

## 7. Party context result (6F)

`party()` reports `partySize`, `onlinePlayers`, `totalPlayers`,
`currentLocation` (a real relationship row, resolved via
`Location.activeForParty` — **never** `HolonetStateService
.getPartyState().location`), `objective`/`situation`
(from `HolonetStateService`, display-only), `partyStateLocationText`, and
`inCombat`.

**Dual Location-authority finding, confirmed real**: `HolonetStateService
.getPartyState()` stores `{location, objective, situation, updatedAt,
updatedBy}` — `location` is a free-text display string with **no
`locationId` field at all** (confirmed by reading `savePartyState()`'s
full normalized shape). The only place a *stable id* for "the party's
current Location" exists is `Location.activeForParty` (a boolean on the
Location record). This phase does **not** rewrite `HolonetStateService`'s
schema — doing so safely would require auditing and updating every UI
that writes `partyState.location` (chiefly Bulletin's party-state editor),
which the Phase 6 spec explicitly scopes out ("do not add a large
Bulletin redesign here"). Per the spec's own fallback instruction ("if
this normalization is too risky in Phase 6: defer storage change but
document the dual representation explicitly"), `party()` reports a
`limitations` entry naming the dual representation whenever
`partyState.location` is set but doesn't match any `activeForParty`
Location, and resolves `currentLocation` from `Location.activeForParty`
only — the same source Job Board (`currentPartyAtMissionLocation`, Phase
4F) and Intel (`currentPartyAtLocation`, Phase 5F) already trust, so Home
now agrees with the rest of the ecosystem instead of introducing a third
opinion.

## 8. Location context result (6G)

`forLocation(locationId)` resolves `relationships.faction` (via
`location.controllingFactionId`), `relationships.jobs` (scanning job
threads for `job.sourceLocation.locationId === locationId` — the exact
Phase 4 field), `relationships.intel` (scanning Intel for
`intel.linkedLocationId === locationId` — the exact Phase 5 field), and
`party.currentPartyPresence`. Proven against real fixtures to resolve the
same real ids the Phase 1/4/5 VMs would (`tests/gm-campaign-context-
parity.test.mjs`, §19). This is a fresh, independent implementation
against the same authorities — not a literal import of
`GMLocationsSurfaceService`'s private `resolveJobRow`/`resolveIntelRow` —
per the Phase 6AI instruction not to churn the stable Phase 1 file; parity
is proven behaviorally (matching ids on identical fixtures), not by code
sharing.

## 9. Faction context result (6H)

`forFaction(factionId)` resolves `relationships.locations`
(`controllingFactionId` match), `relationships.jobs`
(`issuer.factionId` match), `relationships.intel` (`linkedFactionId`
match). `limitations` always includes the honest, unchanged Phase 3
finding: no canonical Faction-vs-Faction relationship storage exists
anywhere in this codebase — not fabricated here either.

## 10. Job context result (6I)

`forJob(threadId)` resolves `relationships.faction`/`contact` (issuer
identity, canonical-id only — this phase does not add the Phase 4
legacy-name-match fallback to the context service, since `forJob()`
always has the real thread and therefore the real `issuer.factionId`;
the legacy fallback remains Job Board's own VM's responsibility for
*display*, per Phase 6I's "do not move Job mutation or settlement
authority here"), `relationships.location` (`sourceLocation.locationId`),
`relationships.intel` (`linkedJobThreadId` scan), and
`party.currentPartyAtMissionLocation`.

## 11. Intel context result (6J)

`forIntel(intelId)` resolves `relationships.location`, `.faction`,
`.job`, and `party.currentPartyAtLocation` — the same real
`linkedLocationId`/`linkedFactionId`/`linkedJobThreadId` fields Phase 5
established. Source Atlas Fact provenance and Scene/Actor relationships
are deliberately **not** duplicated into the context service this phase:
`GMIntelSurfaceService`'s own Phase 5 resolvers already own that
presentation, and Phase 6's `forIntel()` is scoped to the campaign-graph
subset Home's attention items actually need (Location/Faction/Job).
Extending it further is a candidate for a later incremental-adoption pass
per Phase 6AI, not required now.

## 12. Actor context result (6K)

`forActor(actorRef)` resolves what can currently be proven, split by
Phase-6-addendum type: `relationships` (Faction Contact links via
`contact.actorUuid`, Job issuer/contact links via
`issuer.contactActorUuid`, Intel links via `linkedActorUuid` — all
CAMPAIGN RELATIONSHIP, canonical id only, never inferred from a name) and
`operations` (`trades` — Trade Console entries where the actor is
`fromActorId`/`toActorId`, and `recovery` — this actor's own
`GMHealingTrigger.getHealingSummary()` eligibility; both OPERATIONAL
CONTEXT per the addendum, the same subject viewed by a different system,
never modeled as a "relationship"). `party` reports
`isPartyMember`/`inCombat`/`inScene`. A Trade Console load failure is
caught and reported via `limitations`, never thrown (Phase 6AQ).

## 13. Trade context result (6L)

Reused directly: `GMTradeConsoleSurfaceService.buildTradeConsoleVm()`
already exposes real `recordId`/`threadId`/`fromActorId`/`toActorId` per
entry (confirmed the method tolerates a missing/`undefined` host — it only
reads `host?.selectedTradeRecordId`, so the context service can call it
safely with no host at all). No parallel trade ledger, no correlation by
amount/actor/timestamp anywhere in this phase's code.

## 14. Skill Challenge context result (6M)

**Confirmed absent, as predicted**: `SkillChallengeState.normalize()` has
no `sourceJobThreadId` and no `sourceLocationId` field; the only
location-adjacent field is a free-string `sceneId`. Participant identity
is `actorId` (plain Foundry Actor id), not `actorUuid` — already a stable
id, just not the same shape Job/Intel/Faction use elsewhere. **Not added
this phase.** Threading real `sourceJobThreadId`/`sourceLocationId` fields
through the Skill Challenge creation/editing paths (`GMSkillChallengeSurface
Controller`'s new/start/edit handlers) is real, non-trivial surface —
correctly classified `DEFER_TO_DEDICATED_PHASE` in §16's table rather than
attempted as a "small additive fix" here, matching the spec's own
instruction not to let this become a full Skill Challenge redesign.
`attentionItems()` still surfaces active Skill Challenges (by `status`,
the one real lifecycle field that does exist) with a real
`selectedChallengeId`-shaped target, via `GMCampaignTargetService
.skillChallenge(id)`.

## 15. Selection-contract audit result

Two incompatible selection-storage conventions were found to coexist:
direct `host.selectedX` properties (Trade's `selectedTradeRecordId`,
Approvals' `selectedApprovalKey`, both pre-existing) and the newer
`getSurfaceState(surfaceId)`/`patchSurfaceState()` bag (used by
Locations/Factions/Job Board/Intel since Phase 1-5, and independently by
Skill Challenges' own `selectedChallengeId`). `GMCampaignTargetService`
(§17) hides this split behind one small mapping function per destination
— exactly the repetition-avoidance the Phase 6T instruction anticipated.
Store and Healing have **no** selection concept at all today (confirmed);
Home's recovery attention items open the real Actor sheet directly
instead of inventing a new Healing surface-state field, matching the
established "open Actor" behavior every other surface (Locations'
open-contact 'actor' branch, Job Board's issuer-actor branch, Intel's
open-actor branch) already uses, and matching the spec's explicit
"do not redesign Healing" instruction.

## 16. Missing canonical link audit (Phase 6 addendum §E)

| Connection | Type | Stable source id? | Stable target id? | Status |
|---|---|---|---|---|
| Locations ↔ Factions ↔ Jobs ↔ Intel (core graph) | Campaign relationship | yes | yes | READY_NOW (Phases 1-5) |
| Workspace Actor ↔ Healing | Operational context | yes (`actor.id`) | n/a (no selection contract) | CONTEXT_SERVICE_ONLY — `forActor().operations.recovery`; Home/Workspace open the real Actor sheet rather than a Healing selection |
| Workspace Actor ↔ Trade | Operational context | yes (`actor.id`) | yes (`recordId`) | READY_NOW — `forActor().operations.trades`, `GMCampaignTargetService.trade()` |
| Workspace Actor ↔ Factions | Campaign relationship | yes (`actor.uuid`) | yes (`faction.id`) | READY_NOW — `forActor().relationships.factions` |
| Workspace Actor ↔ Jobs | Campaign relationship | yes (`actor.uuid`) | yes (`thread.id`) | READY_NOW — `forActor().relationships.jobs` |
| Workspace Actor ↔ Intel | Campaign relationship | yes (`actor.uuid`) | yes (`intel.id`) | READY_NOW — `forActor().relationships.intel` |
| Workspace Actor ↔ Skill Challenges | Operational context | yes (`actor.id`) | no (`participants[].actorId` exists but nothing resolves "which challenges include this actor" today) | SMALL_ADDITIVE_FIX candidate — not built this phase (Workspace itself is out of scope per 6AI) |
| Intel → Bulletin | Workflow handoff | n/a | n/a | DEFER_TO_DEDICATED_PHASE — zero `sourceIntelId`/`sourceJobThreadId`/`sourceLocationId`/`sourceFactionId` fields exist anywhere on a Bulletin record (confirmed by grep — zero matches in `GMBulletinSurfaceService.js`) |
| Job → Bulletin | Workflow handoff | n/a | n/a | DEFER_TO_DEDICATED_PHASE — same finding |
| Location → Bulletin | Workflow handoff | n/a | n/a | DEFER_TO_DEDICATED_PHASE — same finding |
| Faction → Bulletin | Workflow handoff | n/a | n/a | DEFER_TO_DEDICATED_PHASE — same finding |
| Job ↔ Skill Challenge | Campaign relationship (would-be) | n/a | n/a | DEFER_TO_DEDICATED_PHASE — no `sourceJobThreadId` field exists (§14) |
| Location ↔ Skill Challenge | Campaign relationship (would-be) | n/a | n/a | DEFER_TO_DEDICATED_PHASE — no `sourceLocationId` field exists (§14) |
| Actor ↔ Skill Challenge | Operational context | yes (`participants[].actorId`) | yes (`challenge.id`) | SMALL_ADDITIVE_FIX candidate — the id already exists, only a resolver is missing; deferred alongside the Skill Challenge phase for scope discipline |
| Store ↔ Approvals | Policy/workflow gate | index-based (`custom:<index>`), not the purchase record's own `id` | n/a | READY_NOW at the presentation layer (`attentionItems()` reuses the same index-based key Approvals itself uses) — the underlying **index-as-identity** is itself fragile (reordering `pendingCustomPurchases` would change every key) but is pre-existing, unrelated to this phase, and out of scope to fix here |
| Trade ↔ Approvals | Policy/workflow gate | yes (`recordId`) | n/a | READY_NOW — `attentionItems()`'s `trade-approval`/`trade-failed` rows already carry the real Trade `recordId` |
| Store ↔ Trade | Not a campaign relationship (would need a real correlation id) | `TransactionEngine` mints its own `tx_<...>` id; Trade Console entries use `recordId`/`transferId` (`HolonetStorage`-scoped) | — | DEFER_TO_DEDICATED_PHASE — no shared/correlation id confirmed between the two id schemes; explicitly not correlated by amount/actor/timestamp here or anywhere in this phase |
| House Rules → Store | Policy dependency | n/a | n/a | NOT_A_CAMPAIGN_RELATIONSHIP — confirmed no rule record declares `affectedSystems`/`appliesTo`; not fabricated |
| House Rules → Healing | Policy dependency | n/a | n/a | NOT_A_CAMPAIGN_RELATIONSHIP — same finding |

## 17. Target navigation result (6T)

**A new tiny target adapter was added**, justified by real, already-proven
repetition: four call sites (Locations/Factions/Job Board/Intel
controllers) already hard-code the exact same `navigateToSurface()`
argument shapes independently. `GMCampaignTargetService` (file:
`scripts/ui/shell/gm/GMCampaignTargetService.js`) provides
`location(id)`/`faction(id)`/`job(id)`/`intel(id)`/`skillChallenge(id)`/
`trade(id)`/`approval(key)`, each returning the exact
`{surfaceId, statePatch|hostPatch}` object those controllers already
construct by hand, plus a `resolve({kind, id})` dispatcher. It **never**
calls `navigateToSurface()` itself — callers still own the actual
navigation call, matching the Phase 6S instruction that the context/target
layer resolves data/addressing, the shell handles navigation. Actor is
deliberately unsupported (`resolve()` returns `null` for it) since no
surface anywhere treats Actor as a Datapad selection.

## 18. Home Campaign-Now / Action-Queue / exact-navigation result (6P-6AB)

Home's pre-existing structure (`gm-command-session`/`gm-command-action-
queue`/`gm-command-pulse`/`gm-command-quick-launch` in `home.hbs`) was
**not rewritten from scratch** — the spec's own instruction. Changed:

- `_buildGmHomeContext()` (in `scripts/apps/gm-datapad.js`) is now `async`
  and calls `GMCampaignContextService.party()` (for the current-Location
  session block) and `.attentionItems()` (for the action queue), replacing
  the previous badge-count-only, route-based `actionItems` array.
- Each action-queue row now carries `targetKind`/`targetId`/`targetUuid`
  (from the real `attentionItem.target`) plus a `fallbackRoute` (a plain
  app id, used only when no real target resolves — never silently
  no-op-ing a click). Store/Bulletin rows remain generic app-launch rows
  (§16 — no provenance/selection contract exists for either yet), rendered
  through the *same* pre-existing `data-app-card` path, unchanged.
- `home.hbs`'s current-Location block is now a real navigable control
  (`data-target-kind="location"`) when `GMCampaignContextService.party()`
  resolves a real Location, and a plain non-interactive block otherwise —
  never a fake/disabled button.
- A new `_wireHomeAttentionTargets(root, signal)` method (wired into the
  existing `_onRender()` listener-binding block, right after the
  pre-existing `data-app-card` wiring) resolves every `[data-target-kind]`
  control: an `actor` target opens the real Actor sheet directly
  (`actor.sheet.render(true)`), matching Workspace's/Locations'/Job
  Board's/Intel's own established behavior; every other kind resolves
  through `GMCampaignTargetService.resolve()` into the real
  `navigateToSurface()` call; an unresolvable target falls back to
  `_navigateTo(fallbackRoute)`, never throwing or silently doing nothing.

Exact-navigation coverage: Home → Job (review/payout), Home → Trade
(failed/approval), Home → Approval (droid/store/game/faction, via the
reconstructed composite key), Home → recovery Actor (opens the real
sheet), Home → Location (current-Location block), Home → Skill Challenge
(active challenges). Store/Bulletin remain generic, honestly (§16).

## 19. Tests (6AJ-6AN)

- `tests/gm-campaign-context-read-only-contract.test.mjs` (executed) —
  static source-scan proof of zero mutation call sites in
  `GMCampaignContextService.js`, plus presence of all seven required
  public methods.
- `tests/gm-campaign-context-parity.test.mjs` (executed) — `forLocation`/
  `forFaction`/`forJob`/`forIntel` resolve the same real ids the Phase
  1-5 VMs already resolve, against realistic fixtures reused across all
  four methods; plus honest `resolved:false`/`resolutionKind:'missing'`
  for a nonexistent Location/Job (never fabricated, Phase 6AR).
- `tests/gm-campaign-attention-items.test.mjs` (executed) — proves the
  minimum-required domains (Phase 6AL: Job, Trade, Approval,
  Actor/recovery — Location is covered via `forLocation()`'s own parity
  test and the `location-lead` attention-item source) each produce a real
  attention item with real target identity, plus severity-ordering
  (critical before warning) and a non-throwing empty queue when no
  campaign data exists.
- `tests/gm-campaign-target-adapter.test.mjs` (executed) — every real
  target kind maps to the exact stable per-surface selection contract
  (Phase 6AN); Actor/unknown-kind/empty-id all resolve to `null` rather
  than a broken navigation call.
- `tests/gm-home-attention-navigation-wiring.test.mjs` (executed, static
  source-wiring proof) — `scripts/apps/gm-datapad.js` (`GMDatapad`, an
  `ApplicationV2` subclass) cannot be imported under this repo's Node/
  Foundry shim (confirmed: throws "Cannot read properties of undefined
  (reading 'api')" — the shim does not provide
  `foundry.applications.api.ApplicationV2`), the same class of limitation
  already documented for `HolonetMessengerService.createJobPosting()` in
  Phase 4's `gm-job-source-location-identity.test.mjs`. This test proves
  every hop instead: `_buildGmHomeContext()` actually calls
  `GMCampaignContextService.party()`/`.attentionItems()`; each item maps
  to `targetKind`/`targetId`/`targetUuid`/`fallbackRoute`;
  `_wireHomeAttentionTargets()` is actually invoked from `_onRender()`
  and its Actor/`GMCampaignTargetService.resolve()`/fallback-route
  branches all exist; `home.hbs` renders the exact attributes the handler
  reads.
- All five new test files verified via `git stash` to fail against the
  pre-Phase-6 source and pass after.
- `tests/gm-datapad-action-integrity-contract.test.mjs` — re-verified
  green; totals moved from 244 to **245** controls (81→**82**
  attribute-name entries, 0 unresolved) — the scanner picked up the new
  `data-fallback-route`-style attribute-name control; no unresolved
  control was introduced.
- `tests/gm-datapad-no-duplicate-handler-regression.test.mjs`,
  `tests/gm-datapad-wizard-contract.test.mjs` — re-verified green,
  unchanged.
- Every Phase 1-5 ecosystem/navigation/creation-identity/Intel test —
  re-verified green, unchanged.

## 20. Failure isolation / broken-reference result (6AQ/6AR)

Every authority read inside `attentionItems()` is wrapped in its own
`try/catch` — a Skill Challenge Store failure, a Trade Console failure, an
Approvals-source failure, or a Healing-summary failure each independently
degrades to "skip that domain's items" rather than throwing and blanking
the whole queue; `SWSELogger`-style logging was intentionally omitted in
favor of silent skip only for `attentionItems()`'s per-domain try/catch
blocks (each domain's absence is self-evident from the queue simply
lacking that domain's rows — an explicit warning per skipped domain on
every single Home render was judged noisier than useful, unlike
`_buildGmHomeContext()`'s own top-level `.catch()` calls for `party()`/
`attentionItems()`, which do log via the existing `SWSELogger.warn`
convention). `forLocation`/`forFaction`/`forJob`/`forIntel`/`forActor` all
report `resolved:false, resolutionKind:'missing'` for a subject that
doesn't exist, never throwing and never guessing.

## 21. Performance result (6AP)

Every `forX()`/`attentionItems()` call loads each authority **once**
(`loadJobIndex()` loads all job threads once per call; Intel is scanned
once via `intelRowsWhere()`; Trade Console is built once per call) — no
per-relationship refetching, matching the spec's explicit BAD/GOOD example.
No persistent cache, no cache-invalidation hook, and no static campaign
snapshot is stored anywhere in `GMCampaignContextService` — confirmed by
the same read-only source scan (§19) doubling as a no-cache check (no
module-level mutable state exists in the file beyond `const` function
declarations).

## 22. Action integrity (6AO)

See §19/§18 — `gm-datapad-action-integrity-contract` totals moved from
244 to 245 (82 attribute-name entries, 0 unresolved); the increase is the
scanner recognizing the new home.hbs attribute-style controls, not a
regression. Real proof for the exact-navigation click paths comes from
the executed `gm-campaign-target-adapter`/`gm-campaign-context-*` tests
plus the static `gm-home-attention-navigation-wiring` wiring proof (§19),
matching the precedent set in Phase 4 §17 / Phase 5 §20 for control
families this scanner cannot fully verify on its own.

## 23. Files changed

New: `scripts/ui/shell/gm/GMCampaignContextService.js`,
`scripts/ui/shell/gm/GMCampaignTargetService.js`,
`tests/gm-campaign-context-read-only-contract.test.mjs`,
`tests/gm-campaign-context-parity.test.mjs`,
`tests/gm-campaign-attention-items.test.mjs`,
`tests/gm-campaign-target-adapter.test.mjs`,
`tests/gm-home-attention-navigation-wiring.test.mjs`.
Modified: `scripts/apps/gm-datapad.js` (`_prepareContext`,
`_buildGmHomeContext`, `_onRender`, new `_wireHomeAttentionTargets`),
`templates/apps/gm-datapad/surfaces/home.hbs` (action-queue rows,
current-Location block).

## 24. Live Foundry checklist (not run — no live client available)

1. Open GM Datapad → Home. PASS = campaign state visible immediately,
   action queue readable, app launcher secondary.
2. Set/verify current party Location (mark a Location `activeForParty`).
   Click the current-Location session block. PASS = exact Location opens.
3. Create/use a Job with a submitted objective. Click its Home action
   item. PASS = exact Job selected on first render.
4. Put a Job into `complete` (payout-ready) state. PASS = Home shows the
   actionable item; clicking opens the exact Job.
5. Create/use a failed or pending-GM Trade transfer. Click the Home item.
   PASS = exact Trade selected in the Trade Console.
6. Create/use a pending droid/store/game/faction-suggestion Approval.
   Click the Home item. PASS = exact Approval selected in Approvals.
7. Use a wounded/recovery-eligible party Actor. PASS = Home reflects it
   truthfully; clicking opens that Actor's real sheet.
8. Create an active Skill Challenge. PASS = Home shows it truthfully;
   clicking opens the exact Challenge.
9. Simulate one unavailable subsystem (e.g. a Skill Challenge Store read
   failure). PASS = Home remains usable; other domains still render.
10. Resize the Datapad narrow → wide with several action items queued.
    PASS = action queue remains usable, no overflow, no nested scroll trap
    (reuses the shell's existing `container-type: inline-size`).
11. Navigate Home → Location → Faction → Job → Intel → Home. PASS =
    context navigation still works, no duplicate handler behavior, no
    stale render exception.

If no live client exists: DO NOT CLAIM LIVE VALIDATION. (None exists in
this environment — see §2.)

## 25. Deferred issues

- **Workspace's own redesign** (Phase 7, per the user's roadmap) was
  explicitly not started — Workspace's `actorCard()`/party-roster logic
  was read for audit purposes only, never edited.
- **Skill Challenge `sourceJobThreadId`/`sourceLocationId`** — confirmed
  absent, classified `DEFER_TO_DEDICATED_PHASE` (§14/§16), not added.
- **Bulletin provenance ids** (`sourceIntelId`/`sourceJobThreadId`/
  `sourceLocationId`/`sourceFactionId`) — confirmed absent (zero matches
  anywhere in `GMBulletinSurfaceService.js`), classified
  `DEFER_TO_DEDICATED_PHASE`, not added — Bulletin was not redesigned.
  this phase, per the explicit instruction.
- **`forIntel()`'s Scene/Actor/source-Fact relationships** were not added
  to the context service this phase (§11) — `GMIntelSurfaceService`
  remains their sole owner; extending `forIntel()` is a candidate for a
  future incremental-adoption pass, not required by Phase 6's own success
  criteria.
- **Store's index-based approval identity** (`custom:<index>` into
  `pendingCustomPurchases`, rather than the purchase record's own `id`)
  is a pre-existing fragility (reordering the array changes every key) —
  not introduced by this phase, not fixed by this phase (Store was not
  redesigned), reused as-is for parity with the real Approvals surface.
- **Store↔Trade correlation** — no shared/correlation id confirmed
  between `TransactionEngine`'s `tx_<...>` ids and Trade Console's
  `HolonetStorage`-scoped `recordId`s; documented rather than guessed at
  via amount/actor/timestamp matching, per the explicit prohibition.

## 26. Phase 7 recommendation

**WORKSPACE AS THE PARTY/PEOPLE HUB** — the next natural expansion, using
`GMCampaignContextService.forActor()` (already built and proven this
phase) as its primary cross-authority integration seam: Workspace's
per-Actor cards can resolve Faction/Job/Intel relationships and Trade/
recovery operational context through the exact same service Home now
uses, rather than re-deriving them a third time. **Not started, per
explicit instruction.**

## 27. Holopad connection map result (Phase 6 addendum §H, item 33)

| Connection | Type | Ready now? | Service enough? | Schema needed? | Deferred phase |
|---|---|---|---|---|---|
| Locations↔Factions↔Jobs↔Intel | Campaign relationship | yes | yes | no | — |
| Actor↔Faction/Job/Intel | Campaign relationship | yes | yes | no | — |
| Actor↔Trade | Operational context | yes | yes | no | — |
| Actor↔Healing | Operational context | yes (opens Actor sheet) | yes | no (Healing selection deferred) | Phase 7 (Workspace) |
| Actor↔Skill Challenge | Operational context | no | no | resolver only, id already exists | Phase 7 / Skill Challenge phase |
| Job/Location↔Skill Challenge | Campaign relationship | no | no | yes (`sourceJobThreadId`/`sourceLocationId`) | dedicated Skill Challenge phase |
| Intel/Job/Location/Faction→Bulletin | Workflow handoff | no | no | yes (provenance ids) | dedicated Bulletin phase |
| Store↔Approvals | Policy/workflow gate | yes (index-based key reused) | yes | no | — |
| Trade↔Approvals | Policy/workflow gate | yes | yes | no | — |
| Store↔Trade | (rejected — no correlation) | no | no | a real correlation id, if one is ever added | dedicated Economy phase |
| House Rules→Store/Healing | Policy dependency | n/a | n/a | n/a | rejected as a campaign relationship |

**READY CONNECTIONS**: the core Location/Faction/Job/Intel graph (Phases
1-5) plus every `forActor()` relationship/operation this phase adds.
**CONTEXT-SERVICE CONNECTIONS**: Actor↔Healing (via sheet-open, not a
Healing selection contract), Store↔Approvals, Trade↔Approvals.
**MISSING CANONICAL LINKS**: Skill Challenge source ids, Bulletin
provenance ids, a Store↔Trade correlation id.
**WORKFLOW-PROVENANCE GAPS**: every Bulletin handoff (Intel/Job/Location/
Faction → Bulletin) — none exist yet, all correctly left unbuilt this
phase.
**POLICY-ONLY CONNECTIONS**: House Rules → Store/Healing — confirmed no
metadata exists to resolve them as relationships, correctly not
fabricated.
**CONNECTIONS REJECTED AS UNNECESSARY**: Healing↔Faction, House
Rules↔Intel, Settings↔Job — none built, matching the addendum's explicit
"prefer fewer truthful connections" instruction.

# PHASE 6 CORRECTION PASS — CONTEXT PARITY + EXACT-TARGET INTEGRITY

An independent review of Phase 6 (reviewed head
`2612845548aeeba7707169ac3d5a5788eee6b6e3`) confirmed the overall
architecture — `GMCampaignContextService` as the read-only resolution
layer, `GMCampaignTargetService` as a justified small adapter, Home's
exact-record attention routing — but found the first implementation was a
**narrower** interpretation of the campaign graph than the production
Phase 1-5 surfaces it was meant to unify, plus one real Home navigation
bug. This section documents the correction pass. It does not redesign
Phase 6; every fix below is scoped to the specific gap the review named.

## 1. Correction verdict

**PHASE 6 CORRECTIONS COMPLETE.** All 14 correction items were
implemented and independently proven (fail-before/pass-after where the
correction was a real defect; executed parity comparisons where the
correction was a completeness gap). Full test suite: 174/174 (172
pre-correction baseline + 2 new correction-specific test files; the
existing five Phase 6 test files were extended/rewritten in place, not
counted as new). Syntax: 2288/2288.

## 2. Home targetless-fallback result (Correction 1)

**Real bug, confirmed and fixed.** `attentionItems()`'s unresolved-Atlas-
leads item (`target: null`, intended fallback `locations`) fell through
`home.hbs`'s `{{#if this.targetKind}}` branch (empty `targetKind` on a
targetless item) into the generic `data-app-card="{{this.id}}"` branch —
navigating to the literal string `"location-leads:unresolved"` as if it
were a surface id, not `locations`. Fixed generically, not by
special-casing Atlas Leads: `_buildGmHomeContext()` now marks every
`attentionItems()`-derived row `isExact: true` unconditionally (target
present or not), and `home.hbs` branches on `isExact`, never on
`targetKind`. `tests/gm-home-attention-navigation-wiring.test.mjs` gained
both a static proof (the template branches on `isExact`, the old
`targetKind` branch condition is gone) and an executed simulation of the
real click-handler dispatch order for a targetless row, proving the final
navigation target is `locations`, never the item's own composite id.
Verified via `git stash` to fail against the pre-correction source.

## 3. Party Location authority result (Correction 2)

**Real bug, confirmed and fixed.** `currentPartyLocationResult()`
previously used `activeForParty || revealState === 'active'` — a Location
merely revealed as `'active'` (but explicitly `activeForParty: false`)
was wrongly treated as the party's current position. Confirmed against
the real authority: `LocationRegistryService.setPartyLocation()` sets
`activeForParty` on exactly one record; `GMLocationsSurfaceService`'s own
`isCurrent` is `Boolean(location.activeForParty)`, no `revealState`
fallback. Fixed to `activeForParty === true` exclusively. Also audited
for legacy/corrupt data carrying more than one `activeForParty:true`
record — that case now reports an honest `limitations` entry and
`currentLocation: null` rather than an arbitrary `.find()`-order pick.
`tests/gm-campaign-party-location-authority.test.mjs` (new) proves all
four cases (revealState-only never counts, exactly-one resolves, zero
resolves to null, more-than-one reports honest ambiguity). Verified via
`git stash`: the pre-correction source resolved the *wrong* Location
(`loc-a`, a `.find()` artifact) instead of the real one (`loc-b`).

## 4. Home current-Location result (Correction 3)

**Real UX defect, confirmed and fixed.** Home previously fell back to the
first `knownToPlayers`/`revealState:'known'` Location when no
`activeForParty` Location existed — misleading in a command hub (a merely
revealed planet would silently masquerade as "where the party is"). Fixed:
no `activeForParty` Location now means `currentLocation: null` /
`"Unassigned Location"`, honestly, with no substitute. Covered by the same
party-location-authority test (§3) plus the existing
`gm-home-attention-navigation-wiring` static proof of the
`currentLocationId` derivation.

## 5. Location context parity result (Correction 4)

**Completeness gap, confirmed and fixed.** `forLocation()` previously
resolved only `controllingFactionId` (missing `factionIds[]`/
`factionPresence[]`), had no Contacts/Actors/Leads/Scenes at all, and
resolved Jobs/Intel via reverse lookup only (missing the forward
`linkedJobIds`/`linkedIntelIds` arrays a GM may have hand-curated). Fixed:
`forLocation()` now resolves the full relationship set —

- **Factions**: union of `controllingFactionId` + `factionIds[]` +
  `factionPresence[].factionId`, each row carrying a `role`
  (`controlling`/`presence`) — mirrors
  `GMLocationsSurfaceService.factionRelationshipRows()` exactly.
- **Contacts**: `location.contactIds[]` resolved against every Faction's
  registered contacts (mirrors `contactRelationshipRows()`).
- **Actors**: `location.npcActorUuids[]` resolved via the same
  synchronous world-doc-id technique used everywhere else.
- **Jobs/Intel**: the **union** of the forward array
  (`linkedJobIds`/`linkedIntelIds`) and the reverse Phase 4/5 link
  (`job.sourceLocation.locationId`/`intel.linkedLocationId`),
  deduplicated by real id. A stored forward id that no longer resolves is
  a real `resolutionKind: 'missing'` row, never silently dropped.
- **Leads**: `LocationRegistryService.getAtlasLeadDiscoveries({locationId})`.
- **Scenes**: `location.map.sceneUuid` + `location.linkedSceneUuids[]`.

`tests/gm-campaign-context-parity.test.mjs`'s Location section invokes
the REAL `GMLocationsSurfaceService.buildViewModel()` against the same
fixture and asserts identical Faction/Contact id sets; for Jobs/Intel it
proves — and documents as an intentional, honest divergence rather than a
bug — that the production Locations VM itself is forward-only
(`location.linkedJobIds.map(resolveJobRow)`, confirmed by reading
`selectedVm()`), so `forLocation()`'s union is a genuine superset
improvement, not a competing interpretation. A dedicated Job-A/B/C and
Intel-A/B/C fixture set proves forward-only, reverse-only, and
both-linked cases all resolve to exactly one row each (no duplication).

## 6. Faction context parity result (Correction 5)

**Completeness gap, confirmed and fixed.** `forFaction()` previously
resolved Locations via `controllingFactionId` only (missing
`factionIds[]`/`factionPresence[]`), Jobs via `issuer.factionId` only
(missing legacy-name and consequence-Faction matches), and had no
Contacts/promoted-Actors at all. Fixed by reusing real, already-proven
authorities directly rather than re-deriving narrower rules:

- **Locations**: `LocationRegistryService.getLocationsForFaction(id)` —
  the Location Registry's own exported union method.
- **Jobs**: `FactionJobBridgeService.filterJobsByIssuer()` with the filter
  built by `FactionJobBridgeService.issuerFilterFromFaction(faction)` —
  the exact filter `GMFactionRelationshipSurfaceService`'s own
  `factionJobRelationshipRows()` passes, which is what actually enables
  the unique-legacy-name match path and includes rival/additional
  consequence-Faction Jobs, not just the canonical issuer.
- **Contacts vs. promoted Actors**: kept as two separate row lists
  (`contacts`, `contactActors`) — never merged into one opaque id.

`tests/gm-campaign-context-parity.test.mjs`'s Faction section invokes the
REAL `GMFactionRelationshipSurfaceService.buildViewModel()` against a
fixture with a controlling Location, a presence-only Location, an issuer
Job, and a rival-consequence Job, and asserts identical Location/Job/Intel
id sets between the production VM and `forFaction()`.

## 7. Job context result (Correction 6)

**Real bug + completeness gap, both confirmed and fixed.**

- **Real bug**: `forJob()` treated any `HolonetStorage.getThread(id)` hit
  as a resolved Job, without checking `thread.metadata.threadType ===
  'job'` — a Messenger/party/private thread could masquerade as a Job
  context. Fixed: non-Job threads now report `resolved: false,
  resolutionKind: 'missing'`, proven by an executed test with a real
  `threadType: 'message'` fixture.
- **Completeness gap**: `forJob()` re-derived issuer/location/intel
  resolution narrowly, missing the Phase 4 legacy-name fallback,
  Contact-vs-Actor distinction, and consequence-Faction resolution. Fixed
  by exporting and reusing Job Board's own resolvers directly —
  `resolveIssuerFaction`, `resolveIssuerContact`, `resolveJobLocations`,
  `resolveJobIntel`, `resolveConsequenceFactions`, `factionConsequenceEntries`
  (five `export` keywords added to `GMJobBoardSurfaceService.js`, zero
  logic changes) — rather than maintaining a second, narrower copy of the
  same compatibility rules. Those functions expect the job-board CARD's
  flat field shape (`issuerFactionId`, `factionName`, ...), not the raw
  Holonet job metadata object, so a small `jobResolverCard()` adapter
  mirrors the exact five field-extraction lines `_buildJobCard()` itself
  uses — trivial, stable reads, never resolution logic, so the actual
  matching RULES stay a single, reused implementation.

`tests/gm-campaign-context-parity.test.mjs`'s Job section invokes the
REAL `GMJobBoardSurfaceService.buildViewModel()` for a canonical-issuer
Job and asserts `forJob()`'s Faction resolution matches exactly, plus
dedicated legacy-unique-name and ambiguous-name fixtures proving those
classifications are honest, never a guess.

## 8. Intel context result (Correction 7)

**Completeness gap, confirmed and fixed.** `forIntel()` previously
resolved only Location/Faction/Job, explicitly omitting Contact/Actor/
Scene/source-Fact because Home didn't need them — the audit itself
called this out as intentional but conceded it was "the wrong abstraction
boundary for a shared campaign context service," and the reviewer agreed.
Fixed by exporting and reusing every one of Phase 5's own resolvers —
`resolveIntelLocation`, `resolveIntelSourceFact`, `resolveIntelJob`,
`resolveIntelScene`, `resolveIntelActor` (five `export` keywords added to
`GMIntelSurfaceService.js`, zero logic changes) — so `forIntel()` now
resolves the complete canonical link set: Location, source Atlas Fact
(presentation-only, never copied), Faction, Contact, Job, Scene, Actor.
Faction/Contact resolution also moved from the loose name-fallback
`findFaction`/`findContact` to the new exact-id-only `exactFaction`/
`exactContact` helpers (Correction 12), since `intel.linkedFactionId`/
`linkedContactId` are always meant to be ids.

`tests/gm-campaign-context-parity.test.mjs`'s Intel section invokes the
REAL `GMIntelSurfaceService.buildViewModel()` against a fixture exercising
all seven relationship fields and asserts every one matches exactly.

## 9. Actor context result (Correction 8)

**Real bug + conceptual conflation, both confirmed and fixed.**

- **Real bug**: `forActor('abc123')` (a plain Actor id string) failed to
  resolve — the old code only handled an `{uuid}`-shaped object or an
  `'Actor.<id>'`-prefixed string, treating a bare id as a malformed uuid.
  Fixed: a new `resolveActorByAnyRef()` handles an Actor object, a plain
  id, and an `'Actor.<id>'` uuid identically, proven by an executed test
  resolving the same real Actor all three ways.
- **Conceptual conflation**: `relationships.factions` previously meant
  only "this Actor backs a Faction Contact" — collapsing two genuinely
  different concepts. Fixed: `relationships.factions` is now the Actor's
  REAL standing ledger (`FactionRegistryService.getActorRelationships()`,
  score/relationshipType per Faction), and `relationships.factionContacts`
  is the separate Contact-association list, with explicit `factionId`/
  `contactId`/`actorUuid` fields — never one opaque `${factionId}:
  ${contactId}` composite id.
- Jobs now match via `FactionJobBridgeService.normalizeJobIssuer()`'s own
  alias reading (`contactActorUuid`/`contactActorId`), not a single
  hand-picked field.
- `recovery`/`trades` failures now report via `limitations` + a real
  `SWSELogger.warn` call (Correction 11) rather than a healing failure
  silently resembling a genuine `needsAttention: false` result.

`tests/gm-campaign-context-parity.test.mjs`'s Actor section proves all
three resolution paths, the real Faction ledger vs. Contact-association
split (including that the Contact-association row has no opaque `id`
field), and Jobs/Intel/Trade all resolving with real identity.

## 10. Approval target identity result (Correction 9)

**Real identity-stability gap, confirmed and fixed.** Store-created
pending-purchase records already carry their own persistent id
(`pending_droid_...`/`pending_vehicle_...`/`pending_store_item_...`), but
both `attentionItems()` and `GMApprovalsSurfaceService` addressed them
purely by array index (`custom:<index>`) — another request appearing,
being approved, or being removed before the GM clicked through could
silently repoint the selection at a different record. Fixed:
`GMApprovalsSurfaceService`'s two request builders now expose a
`stableKey` (`custom-id:<approval.id>`) alongside the existing index-based
`key`; `buildViewModel()`'s selection match accepts either.
`attentionItems()` now targets `custom-id:<id>` when a real id exists,
falling back to the legacy `custom:<index>` only for id-less legacy
records. Mutation (approve/deny) still reads `selectedApproval.key`
freshly on every render — untouched, per the correction's explicit
instruction not to make mutation depend on parsing the selection key.
`tests/gm-approvals-stable-target-identity.test.mjs` (new) proves the
exact scenario the reviewer specified: select request B by its stable id,
remove request A (B reindexes from position 1 to position 0), B remains
selected — an index-only selection would have lost it. Verified via `git
stash` to fail against the pre-correction source.

## 11. Home action count result (Correction 10)

**Real calculation bug, confirmed and fixed.** `actionCount` previously
summed only critical-tone exact rows, then added the generic Store/
Bulletin counts a second time on top (those were already inside
`actionItems`) — undercounting warning/info rows while double-counting
Store/Bulletin. Fixed: `actionCount = actionItems.reduce((sum, item) =>
sum + (item.count || 0), 0)` — every actionable row counted exactly once,
matching the "Actions Needed" label's own description ("critical reviews,
monitoring items, and pending GM decisions"). Proven by an executed
simulation in `tests/gm-home-attention-navigation-wiring.test.mjs`
(mixed-severity queue: corrected total 7 vs. the old formula's 2).

## 12. Failure isolation / logging result (Correction 11)

Every per-domain `try/catch` in `attentionItems()`/`forActor()` now calls
`SWSELogger.warn?.()` with the domain name and the real caught error,
instead of a comment-only silent skip — proven by an executed test that
injects a real thrown error into the Job Board domain and asserts a
matching `SWSELogger.warn` call, while a healthy empty-result run logs
nothing (no spam for ordinary absence). `forActor()`'s `recovery` result
is now `null` (plus a `limitations` entry) on a genuine Healing-subsystem
failure, never a false-negative `{needsAttention: false}` that would look
identical to "actually checked, actually ineligible."

## 13. Exact-id contract result (Correction 12)

Every direct canonical-path lookup inside `GMCampaignContextService.js`
now uses a new exact-id-only helper (`exactFaction`/`exactLocation`/
`exactContact`) instead of `FactionRegistryService.findFaction()`/
`LocationRegistryService.findLocation()`, which also match on display
name/slug — a canonical path must never label a name match
`resolutionKind: 'canonical-id'`. Reused resolver functions (Job Board's/
Intel's own, §7-§8) keep their own established, already-audited
compatibility branches (legacy-name-unique/ambiguous/missing) untouched —
this correction applies only to this file's own direct authority calls.

## 14. Parity test result (Correction 13)

`tests/gm-campaign-context-parity.test.mjs` was replaced in full. It now
invokes the REAL production `GMLocationsSurfaceService.buildViewModel()`
and `GMFactionRelationshipSurfaceService.buildViewModel()` against shared
fixtures and asserts identical relationship-id sets against
`GMCampaignContextService`'s output (genuine runtime parity, not a
hand-written expected value); for Job/Intel it compares against the real
`GMJobBoardSurfaceService.buildViewModel()`/`GMIntelSurfaceService
.buildViewModel()` output for the canonical-issuer/full-relationship
cases, and relies on (documents explicitly) the fact that `forJob()`/
`forIntel()` now call the exact same exported Phase 4/5 resolver
functions those production VMs call — parity by construction, not by
promise, for the branches a runtime comparison can't isolate as cleanly
(legacy-name/ambiguous classification, non-Job-thread rejection). Every
fixture set named in the correction spec is present: Location
factions/factionIds/factionPresence/contactIds/npcActorUuids/
linkedJobIds/linkedIntelIds; Job A/B/C and Intel A/B/C union-dedup cases;
Faction controller/presence/issuer/rival/contact/promoted-actor; Job
canonical/legacy/ambiguous/non-Job-thread; Intel's full seven-field
relationship set; Actor object/id/uuid + real ledger + Contact
association + Job/Intel/Trade.

## 15. Read-only contract result

Unchanged and re-verified: `tests/gm-campaign-context-read-only-contract
.test.mjs` still finds zero mutation call sites in
`GMCampaignContextService.js` after the correction pass (the new
`SWSELogger.warn` calls, exact-id helpers, and reused-resolver imports
introduce no writes).

## 16. Target service result

Unchanged: `GMCampaignTargetService` remains a pure `{kind,id} ->
{surfaceId, statePatch|hostPatch}` translator. It never calls
`navigateToSurface()` itself; Correction 9's `custom-id:` key format is
just a new string shape `GMCampaignTargetService.approval(id)` passes
through unchanged.

## 17. Files changed (this correction pass)

Modified: `scripts/ui/shell/gm/GMCampaignContextService.js` (near-total
rewrite of `forLocation`/`forFaction`/`forJob`/`forIntel`/`forActor`,
strict party-location resolution, exact-id helpers, logging),
`scripts/ui/shell/gm/GMJobBoardSurfaceService.js` (5 `export` keywords,
zero logic changes), `scripts/ui/shell/gm/GMIntelSurfaceService.js` (9
`export` keywords, zero logic changes), `scripts/ui/shell/gm/
GMApprovalsSurfaceService.js` (`stableKey` + broadened selection match),
`scripts/apps/gm-datapad.js` (`isExact`, Unassigned-Location fallback
removal, corrected `actionCount`), `templates/apps/gm-datapad/surfaces/
home.hbs` (`isExact` branch). Rewritten:
`tests/gm-campaign-context-parity.test.mjs`. New:
`tests/gm-campaign-party-location-authority.test.mjs`,
`tests/gm-approvals-stable-target-identity.test.mjs`. Extended in place:
`tests/gm-home-attention-navigation-wiring.test.mjs`,
`tests/gm-campaign-attention-items.test.mjs`.

## 18. Tests added/modified

See §17. Every new/rewritten test verified via `git stash` (or, for the
parity file, by confirming it throws against the pre-correction shape) to
fail against the pre-correction source and pass after.

## 19. Full test total / syntax total

174/174 tests passed (172 pre-correction-pass baseline + 2 net-new test
files; five existing files extended/rewritten in place). Syntax:
2288/2288.

## 20. Prior-phase regression result

Re-verified green, unchanged: every Phase 1-5 ecosystem/navigation/
creation-identity test (`gm-locations-*`, `gm-faction-*`, `gm-job-*`,
`gm-intel-*`), `gm-datapad-action-integrity-contract` (still 245
controls, 0 unresolved — the correction pass added no new home.hbs
controls), `gm-datapad-no-duplicate-handler-regression`,
`gm-datapad-wizard-contract`.

## 21. Live Foundry status

Not run — no live Foundry client is available in this environment, same
as every prior phase.

## 22. Overclaimed-language correction (Correction 14)

The pre-correction Phase 6 report claimed "parity with Phases 1-5 proven"
(true only after §14 above), "every Approval target has stable identity"
(true only after §10), and "current party Location resolves from
activeForParty" (true only after §3 — the implementation actually also
accepted `revealState === 'active'`). This section, the PR body, and the
final report below use only the corrected, now-truthful versions of these
claims.

## 23. Phase 7 gate

**READY FOR PHASE 7.** `GMCampaignContextService.forActor()` — the
integration seam Workspace's redesign is meant to depend on — now
resolves the Actor's real Faction relationship ledger (not just Contact
association), Contact association (kept separate), Jobs (via the same
alias-reading Job Board itself uses), Intel, Trade, and recovery, with
honest failure-isolation and exact-id resolution throughout, and every
Job/Location/Faction/Intel resolver it depends on is now the same
function the production Phase 1-5 surfaces call, not a second copy.
**Phase 7 (Workspace as the Party/People Hub) is not started, per explicit
instruction.**

# ECOSYSTEM REDESIGN — PHASE 7: WORKSPACE AS THE PARTY/PEOPLE HUB

Start gate re-verified independently before any Phase 7 code (per the
standing "verify actual current state, don't trust a prior report" rule):
branch `claude/locations-context-contract-i8tbp0`, clean working tree,
HEAD `38174c2765d8dbcf199d2463d8ab7e104b20a4a3`, all 5 Phase 6 correction
commits present in `git log`. Confirmed directly rather than assumed.

## 1. Workspace authority audit (7A)

Read `GMWorkspaceSurfaceService.js`, `GMWorkspaceSurfaceController.js`,
and `workspace.hbs` in full before writing any code. Confirmed Workspace
already delegates every mutation to a real existing authority and invents
none of its own: party membership → `GMPartyRosterService.setPartyMember`;
credits → `TransactionEngine.executeCreditAdjustment`; XP →
`applyXP`/`isXPEnabled`/`determineLevelFromXP`
(`engine/progression/xp-engine.js`); recovery →
`GMCombatRecoveryService.executeGroupAction`/`buildActorCard`; Force Point
restore → `actor.regainForcePoints`/`ActorEngine.updateActor`; Faction
relationships → `FactionRegistryService`. Phase 7 extends this surface,
it does not replace it, and adds no parallel service.

## 2. `GMCampaignContextService.forActor()` extensions (addenda C/D/E/F)

Per the addendum's explicit instruction — extend the one shared seam,
never build a second Workspace-only interpretation:

- **`relationships.locations`** (new): two genuinely distinct roles, never
  merged into one unexplained link. `role: 'direct-actor'` —
  `Location.npcActorUuids` literally contains this Actor.
  `role: 'faction-contact'` — this Actor backs a Faction Contact whose id
  is separately listed in `Location.contactIds`. Both rows can exist for
  the same Location simultaneously without collapsing into one. Actor
  Location is never inferred from Faction control, Job location, or party
  Location — `party.currentLocation` (still `Location.activeForParty`
  only) and `relationships.locations` are proven, by an executed test, to
  stay independent even when they name the same real Location.
- **`relationships.factions` enrichment**: each row now additionally
  carries `relationshipType`, `score`, `relationshipStatus`, `source`,
  `benefits` straight from `FactionRegistryService.getActorRelationships()`'s
  own record — the pre-existing common `{kind,id,label,status,resolved,
  resolutionKind}` contract is unchanged, these are additive fields, not a
  replacement.
- **`operations.trades` enrichment**: each row now carries `role`
  (`'sender'`/`'recipient'`) and the real resolved `counterpartyActorId`/
  `counterpartyActorName`, so a caller never has to re-run the Trade query
  merely to answer "who's on the other side of this."
- **`operations.recovery.injured`** (new, independent from `eligible`):
  `GMHealingTrigger.getHealingSummary()`'s `eligible` means "character
  type, not droid/vehicle, HP > 0" — it does **not** mean "injured." A
  full-HP character is still reported `eligible`. `injured` is computed
  directly from the Actor's own hp values (`hpMax > 0 && hpValue <
  hpMax`), confirmed by an executed test asserting a full-HP actor is
  `eligible:true, injured:false` and a wounded one is
  `eligible:true, injured:true`.

All four are additive; the pre-existing `factions`/`factionContacts`/
`jobs`/`intel`/`operations.recovery.eligible`/`operations.recovery
.ineligible` fields and every Phase 6 correction are unchanged.

## 3. `GMCampaignTargetService.workspaceActor()` (addendum G)

A new, genuinely distinct destination — `workspaceActor(id)` →
`{surfaceId:'workspace', statePatch:{selectedActorId:id}}` — and
`resolve({kind:'workspace-actor', id})` maps to the same target.
`resolve({kind:'actor', id})` is proven, by an executed test, to remain
`null` after this change: Phase 7 adds Workspace addressing, it does not
redefine what `'actor'` means anywhere else in the Datapad. Every other
existing surface's Actor link keeps opening the real Foundry sheet
directly.

## 4. Home recovery migration (addendum H) — scoped to recovery only

`GMCampaignContextService.attentionItems()`'s recovery row's target
changed from `{kind:'actor', ...}` (open-the-sheet) to
`{kind:'workspace-actor', ...}` (select this Actor in Workspace's
Recovery operations card). This is the **one** attention-item kind that
migrates; Job/Trade/Approval/Skill-Challenge/Location-lead targets are
untouched. The pre-existing `gm-campaign-attention-items.test.mjs`
assertion (`recovery.target.kind === 'actor'`) was updated in place to
assert `'workspace-actor'`, with a comment explaining this is a
deliberate, addendum-authorized contract change, not an accidental break.
No special-case handling was needed in `gm-datapad.js`'s
`_wireHomeAttentionTargets()` — it already falls through non-`'actor'`
kinds to `GMCampaignTargetService.resolve()` → `navigateToSurface()`.

## 5. Selection-state contract (7C, addendum N)

`GMWorkspaceSurfaceService.buildViewModel(host)` reads
`host.getSurfaceState('workspace').selectedActorId` — the single
canonical selection identity (`world Actor.id`, never a name/UUID-in-one-
place-id-in-another/DOM-index), matching the exact pattern
`GMLocationsSurfaceService.buildViewModel()` already uses for
`selectedLocationId`. Honest fallback rules, each covered by an executed
test:

- No explicit selection → falls back to the first current party member
  (same "default to the first visible record" convention Locations
  already uses) — an honest UX default, never a resolved-identity claim.
- An explicit `selectedActorId` that no longer resolves to a real Actor →
  `hasSelection:false` and a real `warning` string naming the broken id;
  it is never silently substituted for a different real Actor.
- No party members and no explicit selection → an honest `empty` state,
  never a warning about a nonexistent id.

## 6. Performance rule (7D)

`GMCampaignContextService.forActor()` is called **exactly once** per
Workspace render, only for the selected Actor — never once per roster
card. Proven by an executed test that monkey-patches `forActor()` with a
call counter, builds a 5-actor roster (3 in party), and asserts the
counter is `1` after `buildViewModel()` while confirming all 5 actors
were still built into `gmActors` (ruling out a coincidentally-tiny
roster as the reason for a low count).

## 7. Selected-Actor VM contract (7E)

`selection` (new `buildViewModel()` key) carries `identity` (reused
`actorCard()` fields — name/img/type/hp/condition/FP/credits/level/XP —
**no new actor-summarization logic**), `currentSituation` (hp/condition/
`injured`/`recoveryEligible`/`statusChips` from
`GMCombatRecoveryService.buildActorCard()`/party flags), `relationships`
(the corrected `forActor()` result, decorated only with a `roleLabel` for
Location rows), `operations` (`recovery`: the real
`GMCombatRecoveryService.buildActorCard()` — not a re-derived summary, so
Droid/Vehicle rest-legality rules are consumed verbatim, never
reimplemented; `trades`: `forActor()`'s enriched rows), `progression`
(XP/credits/FP fields lifted from `actorCard()`, no new mutation path),
and `limitations` (passed through from `forActor()`).

## 8. Visual/interaction design (7F/7K)

A new "Campaign Dossier" panel (`workspace.hbs`, `data-workspace-dossier`)
sits above the existing roster grid — a two-region layout (dossier +
roster), not a full rewrite of the existing panels. It deliberately does
**not** reproduce a second Actor sheet: no attacks/talents/feats/
equipment/full inventory (locked in by an executed regex assertion that
those never appear in the template). "Open Sheet" remains a single click
away in the dossier header. Clicking a roster card's new "Dossier" button
(`data-workspace-select-actor`) or a party member's small dossier icon
selects that Actor and re-renders Workspace in place — it does not
navigate away.

## 9. Relationship cards + exact navigation (7G, addendum D)

Faction Standing, Organization Role (Faction Contact), Locations, Jobs,
and Intel each render as clickable rows
(`data-dossier-target-kind`/`data-dossier-target-id`) that resolve
through the real `GMCampaignTargetService.resolve()` →
`navigateToSurface()` contract — the same pattern
`_wireHomeAttentionTargets()` established in Phase 6, now reused by a new
`GMWorkspaceSurfaceController._wireDossierTargets()` rather than
re-invented. An `'actor'` kind is handled defensively (opens the real
sheet) even though no dossier row currently emits one, for consistency
with Home's own dispatcher.

## 10. Operations cards (7H)

Recovery reuses `GMCombatRecoveryService.buildActorCard()`'s own
`statusChips`/`restEligible` fields directly in the template — Droid/
Vehicle actors never see a fake organic-rest control because the
template conditions on the real service's own `restEligible`, not a
re-derived guess. Trade renders `forActor()`'s enriched
role/counterparty rows. Neither card reimplements legality rules.

## 11. Progression/resources (7I)

XP/FP/credits are read straight from the existing `actorCard()` fields
already used by the roster grid and the pre-existing party-member modal
— no new mutation path, no new storage.

## 12. Creation vs. navigation (7J) / GM Actions

"Give Intel" (`data-party-open-intel`) and "Assign Job"
(`data-party-open-job`) remain object-creation actions (open the Intel/
Job wizard prefilled for this Actor) — distinct from the relationship
rows above, which are pure navigation. Both reuse the **same**
`GMWorkspaceSurfaceController` methods (`_openIntelForActor`,
`_openJobWizardForActor`) the pre-existing party-member modal already
calls — the dossier's GM Actions section is a second rendering surface
for the same controller methods, never a second implementation.

## 13. Inbound navigation (7L/7M)

Two proven inbound paths land on a selected Workspace Actor via
`{kind:'workspace-actor'}`:

1. **Home → Workspace**: the recovery attention item (§4 above).
2. **Factions → Workspace** (new, addendum requirement for "at least one
   other inbound path"): a Faction Contact's card gained an "Open in
   Workspace" button (`data-gm-faction-action="open-workspace-actor"`)
   alongside the pre-existing "Open Actor" (sheet) button —
   `GMFactionRelationshipSurfaceController` resolves the same real Contact
   Actor `resolveActorForContact()` already resolves, then calls
   `GMCampaignTargetService.workspaceActor(actor.id)` →
   `navigateToSurface()`. "Open Actor" (sheet) is untouched.

## 14. Outbound navigation (7N)

Every dossier relationship row (§9) navigates outward through
`GMCampaignTargetService` + `navigateToSurface()` using the subject's real
stable id — never a name or a DOM index.

## 15. Party-Location context (7O, addendum J)

`selection` does not expose a `relationships.locations` entry synthesized
from `party.currentLocation` — proven directly by the executed test in
§2 (a party member with `activeForParty` Location set but no real
Location link still reports `relationships.locations: []`). Party
Location context, where shown, is sourced from
`GMCampaignContextService.party()` exactly as Phase 6 established it.

## 16. Party-manager parity (7P, addendum L) — modal retained, not removed

The pre-existing party-member command modal (Full Health, Short Rest,
Full Rest, Restore FP, Give Intel, Assign Job, Open Sheet, XP form, XP
presets, Level-Up XP, Remove from Party) is **fully retained** — Phase 7
does not delete it. An executed test (`gm-workspace-dossier-wiring
.test.mjs`) asserts every one of those 11 controls is still present in
`workspace.hbs`, and separately asserts the new dossier's own action
buttons use the exact same `data-*` attributes (`data-actor-full-health`,
`data-party-actor-rest`, `data-party-restore-force`,
`data-party-open-intel`, `data-party-open-job`,
`data-workspace-party-toggle`) — both surfaces delegate to the same
`GMWorkspaceSurfaceController` methods, never two implementations.
**Parity is proven; removal of the old modal is explicitly deferred** —
the addendum requires proof before removal, not removal itself, and nothing
in the Phase 7 spec instructs deleting it this phase.

## 17. Duplicate Faction-admin UX in Workspace (7Q)

Audited, not touched: Workspace's existing Faction create/attach/delete
forms (`_wireFactionForms`/`_wireFactionActions`) remain exactly as they
were. They are pre-existing functionality, not something Phase 7 added or
promoted, and removing/relocating them was not required by this phase's
scope. Flagged here for a future phase's disposition rather than acted on
now, matching the addendum's "do not automatically delete working
functionality" instruction.

## 18. No new storage (7R)

Confirmed: `selection`/dossier state lives entirely in
`ShellSurfaceState` (`getSurfaceState('workspace').selectedActorId`), the
same mechanism every other surface's selection already uses. No new
Actor flag, no new setting, no new "player state" store was created.

## 19. Broken-reference honesty (7S)

Covered by §5's second bullet and its executed test — a stale
`selectedActorId` never silently substitutes a different Actor.

## 20. Assign Job persistence audit (addendum I) — REQUIRED FINDING

Traced the complete path from Workspace's "Assign Job" action to
canonical Job storage:
`GMWorkspaceSurfaceController._openJobWizardForActor()` → `pendingJobDraft`
(with `assignedActorId`/`assignedActorUuid`/`assignedActorName`) →
`jobs.hbs` wizard template → `GMJobBoardSurfaceController._wireCreateForms()`'s
FormData-driven submit handler → `HolonetMessengerService.createJobPosting()`.

**Finding: the three assigned-Actor fields do NOT survive.**
`jobs.hbs` never renders `assignedActorId`/`assignedActorUuid`/
`assignedActorName` as a form field; `_wireCreateForms()`'s submit
handler never reads any of the three (it reads `title`, `briefing`,
`instructions`, `primaryObjective`, `issuerFactionId`,
`issuerContactActorId`, etc., but not these); and
`createJobPosting()`'s own parameter list has no such field at all. The
only real effect of `_openJobWizardForActor()`'s draft is the
**title/briefing/instructions text prefill** already visible in the
wizard.

Per the addendum's option B: **Assign Job is a Job prefill only. No
persistent Actor↔Job assignment relationship exists anywhere in this
codebase**, and Workspace/`forActor()` make no such claim — `forActor()`'s
`relationships.jobs` resolves Jobs via the real issuer/contact-actor
matching Job Board itself uses (Correction 8's
`FactionJobBridgeService.normalizeJobIssuer()`), never via this
draft-only field. Locked in as a permanent executable regression guard
(`gm-job-assign-actor-persistence-audit.test.mjs`) — a future change that
threads a stable assigned-Actor identity through Job creation should
intentionally break this test and update it alongside a
`forActor()`/`forJob()` change, not by accident.

## 21. Action integrity / mutation authority (7T/7U)

Every new interactive control (`data-workspace-select-actor`,
`data-dossier-target-kind`, `data-gm-faction-action="open-workspace-
actor"`) is wired in its surface's real controller
(`GMWorkspaceSurfaceController`, `GMFactionRelationshipSurfaceController`)
using the codebase's established `querySelectorAll` + `{signal}` +
`type="button"` pattern — no new global listeners, no inline handlers.
`GMWorkspaceSurfaceController` remains the sole action owner for
Workspace; no `_grantXp`/`_runRecoveryActionForActor`/
`_restoreForcePoints`/`_openIntelForActor`/`_openJobWizardForActor`/
`_setPartyMembership` method was duplicated — the new dossier calls the
exact same methods via the same `data-*` attributes (§16).

## 22. Responsive/accessibility

New controls follow the established conventions: `type="button"` on every
new button, `.workspace-dossier-row` is a real `<button>` (keyboard-
activatable by default, not a `<div>` with a click handler), the new
`.workspace-dossier-columns` grid uses `repeat(auto-fit, minmax(...))`
(container-aware, no fixed-width overflow) with a `max-width:680px`
single-column fallback, and no new nested-scroll region was introduced.

## 23. Tests

Five new files, one existing file extended in place:

- `gm-campaign-context-actor-location-phase7.test.mjs` (new) — direct vs.
  Faction-Contact-derived Location presence kept distinct and coexistent,
  party Location never leaks into `relationships.locations`, Faction
  standing enrichment fields, Trade role/counterparty enrichment,
  `eligible` vs. `injured` independence. **Pure additive design contract**
  — `git stash`-verified to fail before (the fields/relationships didn't
  exist) and pass after.
- `gm-campaign-target-workspace-actor.test.mjs` (new) — `workspaceActor()`/
  `resolve('workspace-actor')` shape, `resolve('actor')` still `null`,
  missing-id guards. **Pure additive**, `git stash`-verified fail-before/
  pass-after.
- `gm-workspace-selected-actor-vm.test.mjs` (new) — fallback-to-first-
  party-member, honest missing-selection warning, honest empty state,
  `forActor()` called exactly once per render (not per card), full VM
  shape sanity. **Pure additive**, `git stash`-verified fail-before/
  pass-after.
- `gm-job-assign-actor-persistence-audit.test.mjs` (new) — the §20
  finding, locked in as a static regression guard. **Pure audit/
  authority-boundary finding, not a bug fix** — nothing in this phase
  changes Assign Job's behavior; this test only formalizes what was
  already true.
- `gm-workspace-dossier-wiring.test.mjs` (new) — dossier selection/target
  wiring, Workspace-is-not-a-second-sheet guard, full old-modal-action
  parity list (§16), Faction inbound path (§13). **Pure additive**,
  `git stash`-verified fail-before/pass-after (the wiring didn't exist).
- `gm-campaign-attention-items.test.mjs` (modified) — the one assertion
  changed by §4, with an explanatory comment distinguishing it from an
  accidental break.

## 24. Full test/syntax totals

Rolling test suite: **184 files run, 178 passed.** The 6 failures
(`force-power-final-integration`, `phase3-force-power-corrections`,
`phase4-force-modifier-automation`, `phase5-force-healing-mitigation`,
`phase6-force-direct-damage`, `rolling-ci-support-check`) are
**pre-existing and unrelated to this phase** — confirmed by `git stash`-
ing every Phase 7 change and re-running two of them directly: both fail
identically on the unmodified baseline (`force-power-final-integration`
with a pre-existing `ERR_MODULE_NOT_FOUND` for
`governance/actor-engine/actor-engine.js` that this phase never touches;
`rolling-ci-support-check` times out identically with or without this
phase's diff). Rolling syntax check: **1948/1948 passed, 0 failures.**

## 25. Prior-phase regression result

Re-verified via the same rolling test run: every Phase 1-6 GM Datapad
test (`gm-locations-*`, `gm-faction-*`, `gm-job-*`, `gm-intel-*`,
`gm-campaign-*`, `gm-home-*`, `gm-approvals-*`) still passes, including
the corrected Phase 6 parity suite (`gm-campaign-context-parity
.test.mjs`) and every Phase 6 correction-pass test — none were weakened
or reinterpreted to make Phase 7 pass.

## 26. Live Foundry status

Not run — no live Foundry client is available in this environment, same
as every prior phase.

## 27. Deferred / not done this phase

Documented honestly rather than silently skipped or fabricated as done:

- **Party-member modal removal** — parity is proven (§16), removal is
  not performed. Left for a future phase's explicit decision.
- **Duplicate Faction-admin UX in Workspace** — audited (§17), not
  relocated/reduced this phase.
- **Assign Job stable-identity persistence** — documented as a genuine
  gap (§20), not implemented; option A (threading a stable id through
  Job creation) is explicitly deferred, not attempted.
- **Live Foundry 36-step checklist** — not run (no live client
  available), same limitation as every prior phase.
- **Visual polish beyond a functional two-region layout** — the dossier
  panel is functional and follows the established `swse-ui-panel`/
  `gm-party-command-section` visual language; it was not given bespoke
  new styling beyond the responsive grid/row rules needed for it to work
  (§22).

## 28. Phase 8 gate (superseded by §29 — see below)

Recommended, not started: **Phase 8 (Duplicate Faction-admin UX
disposition in Workspace, and the Assign-Job stable-identity decision
from §20/§27) is a reasonable next scope**, but is explicitly not begun
here, per instruction.

# PHASE 7 INDEPENDENT REVIEW CORRECTION PASS — WORKSPACE / ACTOR CONTEXT
# INTEGRITY

An independent review of the Phase 7 head
(`e6b988dfab37bba91f442f5a4559decc904ff9e6`) found the overall Phase 7
architecture sound (single `forActor()` call per render, `workspace-actor`
kept distinct from `actor`, Location role separation preserved), but
identified 4 substantive correctness/context issues plus 2 smaller
cleanups. All 6 are corrected here. **These are bug fixes to semantic
drift Phase 7's own work introduced, not additive design contracts** —
each fail-before proof below is a real pre-correction defect, not a
missing-feature crash.

## 29. Correction 1 — recovery "eligible" is not "needs attention"

**The finding.** `GMHealingTrigger.isEligibleForHealing(actor)` means
"character type, not Droid/Vehicle, HP > 0" — it never checks HP < max.
Phase 7 itself proved this in a test (a full-HP PC is
`eligible:true, injured:false`), but the production code still used
`needsAttention: eligible` in `forActor()`, and `attentionItems()` still
iterated `GMHealingTrigger.getHealingSummary().eligibleActors` to build
Home's recovery queue. Net effect: a perfectly healthy, unimpaired PC
produced a Home `"Combat & Recovery" — "Eligible for natural
healing/recovery"` **warning**, inflating the Actions Needed count.

**The fix.** Both call sites now reuse
`GMCombatRecoveryService.buildActorCard(actor)` — the SAME real recovery
authority Workspace's own Recovery operations card already renders
verbatim — instead of re-deriving the legality expression a second time:

- `forActor().operations.recovery.needsAttention` is now
  `GMCombatRecoveryService.buildActorCard(actor).needsAttention` exactly
  (`wounded || downed || ctImpaired || conditionPersistent || swSpent ||
  poisons.length>0 || ongoingEffects.length>0`). `eligible`/`ineligible`
  (legality) and `injured` (hp-based) are unchanged and remain distinct
  concepts.
- `attentionItems()`'s recovery block now iterates
  `GMCombatRecoveryService.buildViewModel().combatRecovery.needsAttention`
  (the exact card array Combat & Recovery's own console filters to) —
  never `GMHealingTrigger.eligibleActors`. Severity is taken from the
  card's own `actionTone`, never re-derived. A new `recoveryAttentionDetail(card)`
  helper produces truthful, kind-aware wording — Droids/Vehicles get
  repair/condition language ("HK-Unit disabled — repair required."),
  never organic-rest language ("eligible for natural healing"), matching
  the correction spec's explicit Droid/Vehicle wording requirement.

**Proof.** `tests/gm-phase7-correction-pass.test.mjs` proves: a full-HP
unimpaired PC produces zero recovery attention items; a genuinely wounded
PC produces one with `target.kind:'workspace-actor'`; a full-HP but
CT-impaired PC still produces one (needsAttention is not HP-only); a
downed Droid produces truthful repair wording, never "eligible for
natural healing"; and `forActor(actor).operations.recovery.needsAttention`
agrees exactly with the real `GMCombatRecoveryService.buildActorCard(actor).needsAttention`
for both a wounded and a healthy fixture. `tests/gm-campaign-attention-items.test.mjs`'s
`WOUNDED_ACTOR` fixture was corrected from `hp:{value:12}` (no `max`,
so it never actually triggered `wounded` under the real authority) to
`hp:{value:8,max:12}` — the old fixture was only passing because the
pre-correction code used the wrong (eligibility-based) signal.
Git-stash fail-before proof: reverting all 8 correction-pass files
reproduces the exact bug — a "Healthy PC" attention item with detail
`"Eligible for natural healing/recovery."` and `severity:'warning'`.

## 30. Correction 2 — Workspace's canonical Condition Track field

**The finding.** `GMWorkspaceSurfaceService`'s `actorCard()` read
`actor.system?.conditionTrack?.value ?? actor.system?.condition?.track`
as its *primary* source. The canonical Actor schema stores CT at
`system.conditionTrack.current` — the exact field
`GMCombatRecoveryService.buildActorCard()` reads. An Actor at CT 2 could
show "CT normal" in the Workspace dossier while Combat & Recovery
correctly showed CT 2 for the same Actor.

**The fix.** `actorCard()` now reads `conditionTrack.current` first,
falling back to `.value`/`condition.track` only for legacy compatibility
— no data migration, no new CT model.

**Proof.** `tests/gm-phase7-correction-pass.test.mjs` proves a
`conditionTrack.current:2` fixture renders `"CT 2"` in the Workspace
selected-Actor VM, and that `.current` wins over a deliberately
conflicting stale `.value:0` on the same fixture.

## 31. Correction 3 — Faction "Open in Workspace" world-Actor truthfulness

**The finding.** A Faction Contact's `hasActorLink` is `true` whenever
`actorId || actorUuid` exists — including a Compendium-only UUID, which
`resolveActorForContact()` (via `fromUuid()`) can genuinely open as a
sheet. Workspace's `selectedActorId` contract, however, is explicitly a
WORLD Actor id resolved via `game.actors.get()`, which never resolves a
Compendium-only reference. Phase 7's "Open in Workspace" button rendered
for `hasActorLink`, so a Compendium-backed Contact advertised a
navigation that was guaranteed to land on an empty/broken Workspace
selection.

**The fix.** `contactVm()` now computes a separate,
world-Actor-only fact — `hasWorkspaceActorLink` / `workspaceActorId` —
via a new sync `resolveWorldActorForContact()` helper (`game.actors.get()`
by id, then by exact uuid match; deliberately never `fromUuid()`, never
an import). `factions.hbs` gates "Open in Workspace" on
`hasWorkspaceActorLink`, passing `workspaceActorId` (not the raw
`actorId`/`actorUuid`). The controller's `open-workspace-actor` case now
does a plain `game.actors.get()` lookup instead of
`resolveActorForContact()` — it can no longer silently resolve a
Compendium document that Workspace cannot select. "Open Actor" is
completely unaffected — it keeps resolving both world and Compendium
Actors exactly as before.

**Proof.** `tests/gm-phase7-correction-pass.test.mjs` builds a real
`GMFactionRelationshipSurfaceService.buildViewModel()` VM with one
world-Actor-backed Contact and one Compendium-uuid-only Contact: the
world Contact gets `hasWorkspaceActorLink:true` /
`workspaceActorId:'world-actor-1'`; the Compendium Contact keeps
`hasActorLink:true` (Open Actor still works) but gets
`hasWorkspaceActorLink:false` (Open in Workspace is not advertised).
`tests/gm-workspace-dossier-wiring.test.mjs` statically proves the
template gates the button on `hasWorkspaceActorLink` and the controller
never falls back to `resolveActorForContact()`.

## 32. Correction 4 — Organization Role preserves exact Contact focus

**The finding.** Workspace's dossier already resolves both `factionId`
AND `contactId` for each Faction Contact association
(`relationships.factionContacts`), but the Organization Role row
discarded `contactId` and navigated as a generic
`{kind:'faction', id:factionId}` — patching only `focusedFactionId`. The
Factions surface already supports a richer, pre-existing
`focusedContactId` selection contract (used by its own contact-focus
rows), so this was a real regression of the Phase 2 context-preserving
navigation principle: "open this exact NPC's organization role" silently
became "open their faction" with no contact focus at all.

**The fix.** Added `GMCampaignTargetService.factionContact(factionId, contactId)`
returning `{surfaceId:'factions', statePatch:{focusedFactionId, focusedContactId}}`,
and a `resolve({kind:'faction-contact', id:contactId, factionId})` case
that requires `factionId` (returns `null`, never a degraded target, if
it's missing). `GMCampaignTargetService.faction(id)` and
`resolve({kind:'faction', id})` are **completely unchanged** — a generic
Faction target still means only the Faction. Workspace's Organization
Role row now renders `data-dossier-target-kind="faction-contact"` with
both `data-dossier-target-id="{{contactId}}"` and
`data-dossier-target-faction-id="{{factionId}}"`; `_wireDossierTargets()`
reads the extra attribute and forwards it into `resolve()`.

**Proof.** `tests/gm-phase7-correction-pass.test.mjs` proves
`factionContact()`'s exact return shape, that `resolve('faction-contact')`
matches it, that a missing `factionId` returns `null` rather than
degrading, and that the plain `faction()`/`resolve('faction')` targets
are byte-for-byte unchanged. `tests/gm-workspace-dossier-wiring.test.mjs`
statically proves the template carries both ids and that the
pre-correction single-id pattern is gone.

## 33. Correction 5 — Trade empty-state truthfulness

**The finding.** `forActor().operations.trades` only ever reads
`GMTradeConsoleSurfaceService`'s `activeQueue`/`approvalQueue`/`failedQueue`
— it never reads the separately-exposed `recentCompleted` queue. The
Workspace dossier's empty state nonetheless said *"No active or recent
Trade activity,"* which is false for an Actor whose only Trade activity
was a recently completed transfer: the code never checked "recent"
activity at all.

**The fix (smallest truthful option, per the correction spec's own
preference).** The copy now reads *"No active, pending-approval, or
failed Trade activity"* — describing exactly what was actually checked.
`recentCompleted` integration is explicitly deferred (§34), not
implemented, since Phase 7 only established operational Trade state for
the dossier.

**Proof.** `tests/gm-phase7-correction-pass.test.mjs` statically confirms
the corrected copy is present and the false pre-correction copy is gone.

## 34. Correction 6 (optional) — Actor→Location lookup cleanup

Not a correctness bug — an efficiency cleanup the correction spec marked
optional. `forActor()`'s direct-Actor-presence check previously called
`resolveActorByAnyRef(uuid)` (a `game.actors` lookup/scan) for every
`npcActorUuids` entry on every Location. Since the selected Actor is
already known, this now builds a small reference set once
(`{actor.id, actor.uuid, 'Actor.'+actor.id}`) and does an O(1) exact
string-membership test per `npcActorUuids` entry instead — no semantic
broadening, still an exact match, never a name match. Covered by the
existing `tests/gm-campaign-context-actor-location-phase7.test.mjs`
direct-actor-presence assertions (unchanged pass/fail behavior, faster
implementation).

## 35. Regression / totals

- Full rolling test suite: **185/185 files run, 179/185 pass** (6
  pre-existing failures — `force-power-final-integration`,
  `phase3-force-power-corrections`, `phase4-force-modifier-automation`,
  `phase5-force-healing-mitigation`, `phase6-force-direct-damage`,
  `rolling-ci-support-check` — all unrelated to GM Datapad, present on
  the unmodified Phase 7 head, and confirmed via a git-stash baseline
  comparison; none newly broken by this pass).
- Syntax: **1948/1948** (`node --check` across every file in `scripts/`).
- All Phase 1-7 GM Datapad tests (`gm-*.test.mjs`) remain green,
  including every prior phase's own regression suite — none weakened to
  make this pass green.
- New test file: `tests/gm-phase7-correction-pass.test.mjs`. Modified:
  `tests/gm-campaign-attention-items.test.mjs` (WOUNDED_ACTOR fixture
  corrected to be genuinely wounded), `tests/gm-workspace-dossier-wiring.test.mjs`
  (faction-contact target + hasWorkspaceActorLink gating assertions).
- Live Foundry status: not run — no live client available, same
  limitation as every prior phase. Every claim above is static/Node-shim
  verified, not live-runtime verified.

## 36. Phase 8 gate (supersedes §28)

**PHASE 7 CORRECTIONS COMPLETE — READY FOR PHASE 8.** All 6 independently
reviewed issues are corrected with executed, git-stash fail-before-proven
regression tests (Correction 5, a pure copy change, and Correction 6, a
pure efficiency cleanup with no behavior change, are proven by static/
existing-test coverage rather than a fail-before proof, since neither
changes an observable pass/fail outcome). Deferred items from §27 are
still deferred and still not part of this pass, per its explicit
scope boundary ("DO NOT EXPAND THIS PASS"). Recommended next: Phase 8 —
Bulletin as the Player Communication Hub. Not started here, per
instruction.
