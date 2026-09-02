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
