# Campaign Domain Contracts

Authoritative reference for what every campaign-management domain (Faction, Contact, Location, Job, Intel, Actor/Transaction, and the coordinator that sequences them) is allowed to know, own, mutate, reference, and derive. This document is normative: new campaign-management work is expected to conform to it, and a violation found during review is a defect, not a style preference.

This document exists because the PRE-8D-4 Faction/Contact identity hardening (`docs/audits/gm-datapad-ecosystem-redesign.md` §204, ten independent review rounds) kept finding the same shape of bug in different places: something that was not the canonical owner of a fact nonetheless got to decide that fact, usually by reading a display string instead of an id. That work is the reference implementation for §3–5 below. This document generalizes the lesson before the next domains (Job, Location-as-a-participant, Intel, the future coordinator) get large enough that fixing it later means another ten rounds.

## 1. Core principle

> One fact has one canonical owner. Other systems may reference it, cache presentation data when necessary, or derive from it, but they do not become co-authorities.

Restated for this codebase specifically:

> Authorities own facts. References carry IDs. Views present facts. Generators propose facts. Coordinators sequence facts. No layer silently becomes another layer's authority.

Every section below is a specific consequence of this one rule.

## 2. Authority matrix

This table is frozen — a normative statement of who owns what, not a survey of what currently exists. `JobEngine` and `CampaignMutationCoordinator` are named here even though they are largely aspirational; when they exist, they must conform to this row.

| Domain | Canonical authority | Owns | Does **not** own |
|---|---|---|---|
| Actor | `ActorEngine` | Actor state, embedded Items, ActiveEffects | Faction metadata, Jobs, Locations |
| Faction | `FactionRegistryService` | Faction identity + metadata + lifecycle status | Actor stats, Job state |
| Contact | `FactionRegistryService` | Contact identity + dossier metadata + lifecycle status | Promoted Actor mechanics |
| Location | `LocationRegistryService` | Location identity, hierarchy, world facts, lifecycle status | Faction existence, Jobs |
| Job | future `JobEngine` | Job lifecycle, canonical Job state, completion history | Credits, Faction records, Intel |
| Intel | `HolonetIntelService` | Intel lifecycle/content/links | Faction/Location records |
| Credits / trade | `TransactionEngine` | Financial/store transactions | Actor/faction narrative metadata |
| Holonet | transport/presentation | publication/sync/display | Canonical domain facts |
| Generator | none | Draft proposals | Any canonical mutation |
| Coordinator | future `CampaignMutationCoordinator` | Sequencing multi-domain outcomes | Domain semantics |

If a new feature wants to do something like "update a Contact's location from JobEngine," the authority matrix answers it immediately: JobEngine does not own Contact location, so it must issue a command to the Faction/Contact authority (directly, or via the coordinator for a multi-domain outcome) rather than writing the field itself.

## 3. Identity is not presentation

PRE-8D-4 spent ten review rounds establishing this one rule for Factions and Contacts. It generalizes without modification:

```text
id != name != label != title
```

Canonical references store IDs. Names are display information. For any canonical entity:

```js
{
  id: "immutable-canonical-id",
  name: "Black Sun",
  // ...
}
```

`job.issuer.factionId` is authoritative. `job.issuer.factionName` is either a presentation snapshot (see §8) or derived at render time — it must never independently decide which Faction the Job points to. Display text never decides canonical sameness, anywhere, for any domain.

## 4. Reference field semantics

A plain string field is dangerous, because `factionId`, `factionName`, and `factionDraftId` mean very different things and a caller that conflates them can silently corrupt identity (this is exactly what PRE-8D-4 rounds 5–10 kept finding and fixing). Every reference field in every domain must be classified as exactly one of the following four types, and must resolve according to that type's rule — never a caller-invented fifth behavior.

| Field type | Meaning | Resolution rule |
|---|---|---|
| **Canonical id field** | References an existing canonical entity, alone or paired with an empty sibling name field | Exact-id-only, case-sensitive. Unresolved is a stale/missing reference — fails outright, never rescued by a name search. |
| **Explicit name field** | A structured display-name field, genuinely separate from its sibling id field, consulted only once that id field is empty | Unique-name-only, case-insensitive, never tried as an id. A record whose real canonical id happens to equal the intended record's display name can never steal the resolution (PRE-8D-4 round 10, finding 2). |
| **Draft id field** (e.g. `factionDraftId`) | References an uncommitted proposal, not a canonical entity (see §7) | Never resolves against the canonical authority's id space. A draft id and a canonical id are different id spaces and must never be compared to each other. |
| **Genuinely combined id-or-name input** | One free-text string that may be either, kept **only** where a real current caller genuinely has just one such field (a legacy/free-text UI input, not two structured fields collapsed by the caller) | Exact canonical id first, case-insensitive unique-name match only if no exact id matched, refusing to guess among 2+ candidates at either stage. |

A caller with two genuinely separate fields (`factionId` and `factionName`) must never collapse them into one string (`factionId || factionName`) before resolving — that silently converts a canonical-id-field-plus-explicit-name-field pair into a combined-input field, and reintroduces exactly the shadowing bug PRE-8D-4 closed at every layer it found. If you have two fields, resolve them as two fields.

A non-empty selector of any of these types that fails to resolve — not found, or ambiguous among 2+ candidates — always fails outright (`null`/throw, or a documented soft-fail where the caller's own contract requires batch-safety). It is never silently substituted with a broader or different result. Only a genuinely **absent** selector may fall back to a broader, intentional default.

Canonical ids are exact-match, case-sensitive comparisons, full stop. Do not add a "case-insensitive id compatibility" stage on spec: PRE-8D-4 round 8/9 added one, and round 10 removed it again after finding zero real callers or persisted data that needed it (see §22, and the compatibility-burden rule it establishes generally).

## 5. Creation and mutation contract

Every authority follows the same create/update boundary:

```text
CREATE
no canonical id supplied
→ authority mints id

UPDATE
canonical id supplied
→ exact entity must already exist

UNKNOWN ID
→ failure

DELETE
exact canonical id
→ authority decides deletion/lifecycle semantics (see §12)
```

No exception: a caller-chosen id is never accepted for a record that does not yet exist. Minted ids must be structurally collision-safe (retry against a reserved-id set, not merely "astronomically unlikely to repeat") — `mintUniqueId()` in `faction-registry-service.js` is the reference implementation; reuse it rather than inventing a second one.

## 6. Existence is not visibility

A Sith Faction may exist without the players knowing it exists. A Contact may exist while hidden. Intel may exist but not be published. A Location fact may exist but not have been revealed. `exists` and `visibleToPlayers` must never be the same state:

```js
Contact {
  id,
  name,
  revealState: "hidden",
  knownToPlayers: false
}
```

Hiding a record does not delete it. Revealing a record does not create it. Once coordinators start creating cross-domain consequences, conflating these two states is an easy way to accidentally destroy or fabricate data as a side effect of a visibility change.

## 7. Draft and canonical are different universes

A generator creates proposals — `FactionDraft`, `ContactDraft`, `LocationDraft`, `JobDraft`, `NPCConceptDraft` — never canonical records. A draft may contain a `draftId` and may reference other drafts (`factionDraftId`, `locationDraftId`), but a draft does not become canonical just because another draft references it. Only an explicit commit does that.

```text
generate → review → edit/reroll → resolve → commit
```

Never `generate → secretly create canonical records`. The current generation architecture already leans this way; this section makes it a hard rule rather than an emergent property. A generator that calls a canonical authority's create method directly, outside an explicit user- or GM-driven commit step, is out of contract regardless of how convenient it is.

## 8. Derived data must never become a second authority

If a Job stores both `issuer.factionId` and `issuer.factionName`, decide — explicitly, in code and in the schema comment — which is authoritative. The answer is always the id:

```text
factionId = fact
factionName = presentation snapshot
```

If the Faction is renamed from "Black Sun" to "Black Sun Syndicate," the Job still points at the same `factionId`; presentation should resolve the *current* name at render time. If a snapshot is retained for narrative/historical fidelity (see §17), name it as a snapshot explicitly — `issuerSnapshot.factionName`, not a bare `factionName` sitting next to `factionId` implying live parity:

```js
issuerSnapshot: {
  factionName: "Black Sun"
}
```

Nobody may treat a snapshot field as authoritative for resolving identity. This applies uniformly: Actor name, Contact `actorName`, Location snapshot, Job issuer name, Intel source label.

## 9. Cross-domain mutation is sequenced, not scattered

If a Job completing should cause `+10,000 credits`, `+2 Faction reputation`, `Reveal Intel`, and `Location control changed`, `JobEngine` does not write all four domains directly. Each domain still owns its own validity decision — the coordinator sequences, it does not become a fifth authority that bypasses the other four's own rules:

```text
JobEngine
    ↓
JobCompleted event/result
    ↓
CampaignOutcomeResolver
    ↓
CampaignMutationCoordinator
    ↓
Actor/Transaction authority · Faction authority · Intel authority · Location authority
```

## 10. Commands and events are different contracts

A **command** says "do this":

```js
{ type: "FactionScoreDelta", factionId, actorId, delta: 2 }
```

An **event** says "this happened":

```js
{ type: "FactionScoreChanged", factionId, actorId, before: 1, after: 3 }
```

Never let an event secretly function as a mutation request, and never let a command pretend something already happened. Keep the vocabulary distinct at the type-name level so a reviewer can tell which contract a given payload is making without reading the handler.

## 11. Multi-domain operations must be idempotent

Sockets reconnect. Hooks fire twice. Users double-click. If a Job completion is processed twice, the result must not be `+10,000 credits` twice, or a duplicate Intel reveal, or a duplicate Bulletin. Use a stable operation/effect key (`effectId: "job:XYZ:completion:reward:credits"`) and have the authority or coordinator ledger check "already applied" before acting — this is far more robust than trying to make every individual mutation independently idempotent by accident.

## 12. Lifecycle, archival, and deletion are three different concepts

This section supersedes any earlier, simpler "deletion doesn't cascade" framing with the fuller model below; the earlier framing's conclusions (no implicit cascade-delete, unresolved-reference-not-deletion) still hold and are restated here as part of the complete rule.

**The core distinction:** "no longer active in the world" is not the same as "delete this record." Deletion means GM cleanup, or a record created by mistake, or a genuine intent to remove it from canonical history. Death, destruction, dissolution, and obsolescence are *campaign facts* and must remain addressable history, not be erased.

Each domain gets two separate, non-conflated concepts:

- **Lifecycle state** — "what is this thing's condition in the fictional world?"
- **Archive/display state** — "should this thing appear in my normal working lists?"

```js
{
  id: "contact-bail-organa",
  lifecycle: {
    status: "deceased",
    changedAt: "...",
    reason: "Killed in the destruction of Alderaan",
    sourceEventId: "event-alderaan-destruction"
  },
  archived: false
}
```

Bail is dead (`lifecycle.status`), but the GM may still want him visible in the Contact dossier because he mattered historically — `archived` is a separate, UI-clutter-only decision made later, independently.

**Per-domain lifecycle vocabularies are not shared verbatim.** `deceased` fits a Contact; `destroyed` fits a Location; `dissolved` fits a Faction; `disproven` fits Intel. Domains share the lifecycle *contract*, not one universal enum:

| Domain | Example lifecycle states | Normal behavior after a terminal state |
|---|---|---|
| Contact | active, missing, captured, deceased, retired, defected | Remains in history; excluded from active issuer/contact pickers by default |
| Faction | active, weakened, fractured, dissolved, destroyed, absorbed | Remains addressable; excluded from active faction generation/job issuing by default |
| Location | active, damaged, abandoned, occupied, destroyed, inaccessible | Remains in Atlas/history; may still be targetable as ruins/history |
| Intel | active, confirmed, disproven, obsolete, resolved, compromised, archived | Remains historical evidence; normally excluded from "current actionable intel" |

**Never invalidate the canonical id because the entity stopped operating.** A destroyed Faction's Jobs, Intel links, and Location-control history must all keep resolving by id forever. If the fiction produces a successor (the Red Knives get wiped out, "The Red Knives Survivors" emerge), the successor is a **new** canonical entity with its own minted id — do not resurrect the old record by renaming it. An optional `predecessorFactionId` link is fine; a general-purpose relationship graph is not (see the "no new frameworks" rule in the top-level project instructions — this document does not override it).

**Terminal state changes capability, and that must be expressed as authority-owned predicates, not ad hoc status checks scattered through the UI:**

```js
FactionRegistryService.isOperational(faction)
FactionRegistryService.canIssueJobs(faction)
FactionRegistryService.canActAsContactIssuer(contact)
LocationRegistryService.isAccessible(location)
HolonetIntelService.isActionable(intel)
```

(Not necessarily these exact names — the point is that the rest of the application asks the authority "can this entity currently perform this role?" instead of re-deriving the answer from a raw lifecycle enum in five different UI files. That is SSOT at the behavioral level, not merely the data level.)

**Record provenance on every lifecycle transition**, not just the resulting value:

```js
lifecycle: {
  status: "destroyed",
  changedAt: "...",
  reason: "Party eliminated the gang leadership and headquarters.",
  sourceKind: "job",
  sourceId: "job-red-knives-raid"
}
```

This is what lets a Faction dossier say "Destroyed during 'Break the Red Knives'" and a Job's history link back to the same transition, rather than the two independently drifting.

**Reactivation is always an explicit, deliberate authority command**, never an implicit side effect, and it should itself be recorded as another lifecycle transition rather than silently erasing the terminal one:

```text
Red Knives
  Active
  ↓ Destroyed — 3951 BBY
  ↓ Reformed — 3953 BBY
```

**The invariant (elevate this alongside §1 as one of the load-bearing rules of the whole document):**

> Terminal narrative states preserve identity. Death, destruction, dissolution, obsolescence, capture, abandonment, and similar campaign outcomes change an entity's lifecycle state; they do not delete its canonical record. Inactive entities remain resolvable for historical references, Jobs, Intel, Events, and dossier timelines. Active workflows exclude them by default according to domain-owned capability rules. Archival is a presentation/workspace concern, separate from fictional lifecycle state. Deletion is reserved for erroneous or intentionally removed canonical data, not narrative consequences.

**Baseline for actual `delete`, when it is genuinely a delete (GM error cleanup, not a narrative consequence):** deleting an entity does not implicitly cascade-delete unrelated domains' references to it. References become unresolved (`factionId: "ABC"`, `resolutionStatus: "missing"`), and the GM decides what to do next — see §13. Some domains may eventually prefer archival over even this kind of deletion; that is a domain-specific decision to make intentionally, not a default to assume.

## 13. Broken references must be representable

A campaign database should survive bad data without lying about it. If `job.issuer.factionId = "ABC"` and Faction `ABC` no longer resolves (deleted, corrupted import, whatever), the correct response is never "search for a similarly named Faction" — that is exactly the display-text-decides-identity bug this whole document exists to prevent. The correct response is:

```js
resolved: false
resolutionKind: "missing"
```

> Missing is a legitimate state. Wrong is not.

This mirrors PRE-8D-4's own rule (§4 above): an unresolved canonical-id-field selector fails outright rather than being silently rescued by a name match.

## 14. GM edits beat generators

Once a field becomes manually authored, future generator rerolls must not stomp it unless explicitly re-requested:

```text
generator-owned → GM edits → manual-owned
```

`publicDescription`'s existing "GM edit wins" behavior is the precedent; generalize it wherever a generator can reroll narrative content, using an explicit provenance marker rather than an implicit heuristic:

```js
fieldState: {
  source: "generated" | "manual"
}
```

This does not need to be tracked on every trivial field — only on generated narrative content where rerolls actually happen.

## 15. Events carry IDs, not whole mutable objects

Avoid:

```js
{ type: "FactionUpdated", faction: { /* entire mutable faction record */ } }
```

Prefer:

```js
{ type: "FactionUpdated", factionId, changedFields, revision }
```

Consumers query the authority for current state rather than holding a copy that can silently go stale. A snapshot may be included where genuinely useful (see §8, §17), but only ever labeled explicitly as a snapshot, never as the event's primary payload.

## 16. Revision/version semantics belong in the design now

Before the coordinator does substantial multi-domain commits, canonical records should carry a revision marker:

```js
revision: 7
```

so a command can assert `expectedRevision: 7` and be refused (or trigger a re-plan) if the record moved underneath it — e.g. a GM edited the Faction while a Job wizard was still open with a stale copy. Full optimistic-locking infrastructure is not required immediately; the seam for it must exist in the schema before the coordinator ships, not be retrofitted after "last writer silently wins" has already caused a real campaign-data incident.

## 17. The Historical Participation Invariant (Jobs and campaign history generally)

A completed Job is a canonical historical event owned by the Job domain. Factions, Contacts, Locations, Actors, and other domains do not keep independent copies of Job history — each keeps a reference into it. This is the same SSOT rule as §1, applied specifically to "an event that many dossiers want to display."

> A completed Job is a canonical historical event owned by the Job domain. Factions, Contacts, Locations, Actors, and other domains do not own independent copies of Job history. A Job records canonical references to every participating domain entity together with the semantic role that entity played in the Job. Other domains expose Job history through reverse lookup or rebuildable indexes over those canonical references. Historical display snapshots may be retained for narrative fidelity, but snapshots never determine canonical identity.

A representative completion record:

```js
{
  jobId: "job-4729",
  titleSnapshot: "Deliver Death Star Plans",

  lifecycle: {
    status: "completed",
    outcome: "success",
    completedAt: "..."
  },

  issuer: {
    factionId: "faction-rebel-alliance",
    contactId: "contact-r2d2",
    // historical presentation snapshots, NOT identity:
    factionNameSnapshot: "Rebel Alliance",
    contactNameSnapshot: "R2-D2"
  },

  locationRefs: [
    { locationId: "location-tatooine", role: "origin", nameSnapshot: "Tatooine" },
    { locationId: "location-alderaan", role: "destination", nameSnapshot: "Alderaan" }
  ],

  factionRefs: [
    { factionId: "rebel-alliance", role: "issuer" },
    { factionId: "galactic-empire", role: "opposition" }
  ],

  outcomeSummary: "The plans reached Alderaan successfully.",
  effectRefs: ["job-4729:success:rebel-reputation", "job-4729:success:credits"]
}
```

That record belongs to `JobEngine`. Every dossier — R2-D2's Contact dossier, the Rebel Alliance Faction dossier, the Tatooine and Alderaan Location dossiers — renders the *same* underlying record through a query (`show completed Jobs where issuer.contactId === X`), never by holding its own copy. One historical fact, many presentations, exactly per §1.

**Roles are a small, extensible vocabulary, not a free-text field and not an attempt to enumerate everything on day one.** Start small and grow it as real Jobs need new roles:

- Location roles: `origin`, `destination`, `objective`, `meeting-point`, `target`, `battle-site`, `employer-location`, `pickup`, `dropoff`, `escape-route`, `affected-location`
- Faction roles: `issuer`, `opposition`, and others added as needed
- Contact roles: `issuer`, `handler`, `target`, `informant`, `ally`, `rival`, `rescued`, `betrayer`, and others added as needed

**Naming stays live; history stays honest.** If R2-D2 is later renamed "R2-D2, Hero of Alderaan," the canonical `contactId` is unchanged and modern UI shows the new name — but the completion record's `contactNameSnapshot` still says what the record said at the time. `contactId` is canonical identity; `contactNameSnapshot` is historical presentation. Nobody is permitted to resolve identity from the snapshot (same rule as §3/§8, restated once more because this is exactly where "just this once" leaks would happen).

**Completed Jobs are effectively append-only.** A Job's lifecycle is `DRAFT → POSTED → ACTIVE → RESOLVED → ARCHIVED`; once it reaches `RESOLVED`, a durable `completion` outcome record is finalized. A GM may still correct it, but that must be an explicit, recorded correction operation, not an implicit rewrite by an unrelated subsystem.

**Do not put `completedJobs[]` on Faction/Contact/Location/Actor.** It is tempting, and it is wrong: it creates N copies of the same fact, and the moment a correction updates the Job but misses one of the N copies, you have exactly the SSOT failure this document exists to prevent (`Faction says SUCCESS`, `Location says FAILURE`, `Job says PARTIAL SUCCESS`). If lookup performance ever requires it, build a **rebuildable index**, explicitly marked as derived:

```js
JobHistoryIndex {
  byFactionId: { "faction-x": ["job-1", "job-8"] },
  byContactId: { "contact-y": ["job-8"] },
  byLocationId: { "location-z": ["job-3", "job-8"] }
}
```

If the index is deleted, it must be fully recoverable by rebuilding from the canonical Job records. It never contains authoritative facts of its own.

## 18. Campaign Effects

A Job outcome (or any other domain event) that changes state in another domain does so by producing explicit `CampaignEffect` records, routed through the coordinator (§9), never by the source domain writing the target domain directly:

```js
{
  effectId: "job-42:success:effect-3",
  source: { kind: "job", id: "job-42" },
  target: { kind: "faction", id: "red-knives" },
  operation: "set-status",
  before: "active",
  after: "destroyed",
  reason: "Leadership and headquarters eliminated.",
  status: "applied"
}
```

The coordinator does not interpret domain semantics — it hands each effect to its target's authority, which validates and applies it (or refuses it) according to its own rules. Rewards in the narrow sense (credits, items, XP) are a special case of this, not a separate concept:

```text
Rewards ⊂ Outcome Effects
```

Credits are an effect targeting the Transaction authority. Faction reputation is an effect targeting the Faction authority. A Contact's death is an effect targeting the Faction/Contact authority (and, if that Contact has been promoted to an Actor, a second, separate effect targeting `ActorEngine` — see §12's note on Contact-vs-Actor status; they mean different things and must not be forced to agree).

**Always store `before`/`after`, not just the resulting value.** This is what lets campaign history say "During 'Break the Red Knives,' the Red Knives changed from Active to Destroyed," and what lets a later GM-driven reversal (`destroyed → reformed`) be recorded as a new transition without losing the original one.

**Outcomes are not binary**, and effects should reflect that. A `FAILURE` might leave the Red Knives active with their reputation raised; a `PARTIAL SUCCESS` might produce `fractured` + `missing` + `contested` across three different effects. Model the actual outcome, not a boolean.

**Never auto-cascade a consequence just because two entities are related.** A destroyed Location does not imply every Contact whose `lastKnownLocation` points there is now dead — they might have escaped, might not have actually been there, might secretly still be alive. A destroyed Location's outcome resolution may *propose* a list of plausibly-affected Contacts; the GM approves which effects actually get created and applied. Automatic cascade here is a narrative-authority violation, not merely a data-modeling one.

## 19. Campaign Events

Some occurrences are larger than the single Job that triggered them (the Death Star's destruction of Alderaan is bigger than "the Job called *Deliver Death Star Plans* ended"). For that case only, a lightweight `CampaignEvent` may group multiple effects and reference the Job(s) involved:

```js
CampaignEvent {
  id: "event-alderaan-destruction",
  title: "Destruction of Alderaan",
  occurredAt: "...",
  relatedJobIds: ["job-42"],
  effectRefs: ["job-42:outcome:alderaan-destroyed", "job-42:outcome:bail-killed"]
}
```

```text
Job completion
      ↘
       Campaign Event
      ↙       ↓       ↘
 Alderaan    Bail    Rebel Alliance
```

Keep this modest. A `CampaignEvent` is a durable historical occurrence that may produce multiple domain effects — nothing more. Do not build a general-purpose relationship graph on top of it; that is exactly the kind of speculative framework the top-level project instructions already forbid.

## 20. Per-domain contracts (worked examples)

Every domain gets a short contract of this shape before substantial new work lands in it. Two are worked out fully here as the pattern to copy.

### Contact

```text
Authority: FactionRegistryService

Identity: contactId, immutable
Parent: exact factionId

Name: presentation only
Actor linkage: actorId/actorUuid reference only -- Contact does not own Actor mechanics
Location: locationLinks[] owns Contact<->Location relationship metadata; legacy scalar
          fields are derived mirrors, not a second source of truth

Visibility: separate from existence (revealState/knownToPlayers, per §6)
Lifecycle: separate from existence and from archival (per §12)

Creation: no id -> registry mints (per §5)
Update: existing exact contactId required (per §5)
Deletion: does not delete a promoted Actor; does not delete linked Intel;
          references become unresolved (per §13), never cascade-deleted
```

### Job

```text
Authority: future JobEngine

Identity: jobId

Issuer: Faction/Contact references by canonical IDs only (per §3-4) --
        never a collapsed id-or-name string on a caller that actually has
        two separate structured fields

Participants: factionRefs[]/contactRefs[]/locationRefs[], each an
              {id, role} pair (per §17) -- not a bare id array

Rewards: describes intended effects (per §18); does not directly own
         player credits, Faction reputation, or any other domain's state

Completion: RESOLVED status finalizes a durable completion/history record
            (per §17); produces CampaignEffects (per §18) that the
            CampaignMutationCoordinator routes to their owning authorities
            -- JobEngine never writes Faction/Location/Intel/Transaction
            state directly

Holonet: transport/presentation only, never a second copy of canonical
         Job state
```

Location, Intel, and the Actor/Transaction pair should each get an equivalent short contract, in this same shape, before their next substantial feature — see §22 for the order.

## 21. The required architectural test

For every domain, before shipping non-trivial new behavior in it, answer these two questions in the affirmative for "no":

> Can I mutate this domain without going through its authority?

> Can another domain silently create or reinterpret this entity?

Both must be **no**. Where the answer is currently "yes," that is a defect to close, not a known limitation to document around.

Beyond the single-domain test, maintain a standing set of cross-domain adversarial test scenarios and run them against every domain pairing that can reach each other:

```text
duplicate names
renames
deleted / lifecycle-transitioned references
stale IDs
retries (double-apply of the same effect/command)
double-clicks
partial commit (coordinator dies mid-sequence)
GM edit during workflow (revision mismatch, per §16)
hidden-but-existing records (per §6)
draft references before commit (per §7)
```

These adversarial tests catch more real architectural problems than a large happy-path suite — PRE-8D-4's ten review rounds are the empirical evidence for that claim in this specific codebase.

## 22. Compatibility posture

This codebase's campaign-management systems (Faction/Contact, and everything listed in §2 that has not yet shipped to a released, persisted user world) carry no real backward-compatibility obligation to an intermediate development revision's behavior. PRE-8D-4 round 10 established the operative rule, and it applies to every domain in §2, not only Faction/Contact:

> The burden of proof for keeping any compatibility or legacy-preservation seam is on demonstrating a concrete, currently-real caller or persisted-data dependency that needs it — not on demonstrating that removing it is safe.

Priority order when a compatibility question comes up: (1) clean canonical identity/lifecycle semantics, (2) minimum future technical debt, (3) the smallest number of resolver/authority contracts necessary, (4) compatibility only where a real currently-persisted datum or an actually-existing production caller requires it. Once any of these domains has shipped to a released user world and carries real persisted data, this section's default flips for that domain: at that point, migration-safety (per the existing `migrateLegacyIdentities()` pattern) becomes mandatory, not optional.

## 23. Rollout order

Apply this document to each domain in this order, because each later domain's contract depends on the previous ones already being solid:

```text
Faction/Contact → Location → Job → Intel → Actor/Transaction → Coordinator
```

Faction/Contact is the reference implementation (§4–5, and the ten-round correction history in `docs/audits/gm-datapad-ecosystem-redesign.md` §204). Job is the most important domain to do next: it is currently represented partly through Holonet/thread metadata rather than a clean canonical shape, and every other domain's "show me my history" view (§17) depends on Job's contract being resolved first. Before the coordinator consumes Jobs at all, its contract must answer plainly: what exactly is the canonical Job, who owns it, and who is allowed to change its lifecycle? Once that is answered, the coordinator (and by extension the work currently tracked as 8D-4) becomes much safer to build.
