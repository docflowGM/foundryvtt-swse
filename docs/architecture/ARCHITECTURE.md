SWSE V2 ARCHITECTURE CONSTITUTION

Authoritative reference for where rules live, how execution works, what is forbidden, and what must never change.

SWSE V2 is a sovereign, engine-driven architecture.
This document defines its constitutional boundaries.

Legacy V1 actor sheets were permanently removed in Phase 3.3 and must not be reintroduced.

I. Architectural Philosophy

SWSE V2 is built on three principles:

Single Source of Truth (SSOT)

Deterministic Execution

Separation of Authority

The system must always remain:

Predictable

Deterministic

Extensible without core mutation

Free from inline logic drift

II. Authority Model
Rules Authority

All gameplay rules live exclusively in:

scripts/actors/v2/*

These classes:

Compute derived state

Apply rules

Evaluate progression

Determine mechanical outcomes

No other layer may compute gameplay rules.

Derived State

Derived state is written exclusively to:

actor.system.derived

Only v2 Actor classes may write to this namespace.

It is strictly read-only outside rules logic.

Sheets (Presentation Layer)

Location:

scripts/sheets/v2/*

Sheets are views only.

Sheets may:

Render prepared data

Emit UI events

Trigger engine calls

Display chat output via swse-chat

Sheets may NOT:

Perform rules math

Mutate actor state

Update owned items

Create ChatMessage directly

Items

Location:

scripts/items/*

Items are passive data containers.

They may:

Store structured rule data

Provide metadata

They may NOT:

Perform calculations

Mutate actors

Apply modifiers directly

Mutation Gatekeeper

All state mutation must pass through:

scripts/actors/engine/actor-engine.js

Direct mutation is forbidden.

Prohibited:

actor.update(...)

item.update(...) (owned items)

Direct system property assignment

All changes must flow through orchestrated mutation.

Gameplay Output

All gameplay chat output must pass through:

scripts/chat/swse-chat.js

Sheets and engines may not create ChatMessage directly.

III. Core Architectural Invariants

The following invariants must always remain true.

Violation of these invariants is a structural defect.

Authority Invariants

All derived stats are written exclusively by v2 Actor classes.

actor.system.derived may not be written outside v2 rule logic.

Sheets contain zero rules math.

Owned items are never updated directly.

All mutations pass through actor-engine.

All gameplay chat output routes through swse-chat.

Engines do not directly compute each other’s domain logic.

Execution order is deterministic.

Data Integrity Invariants

Removing an item removes all associated modifiers.

No duplicate modifier IDs may exist.

Derived totals must equal the sum of their breakdown.

No orphaned modifier references.

No stale progression state after mutation.

Flow Invariants

No mutation during render cycle.

No recalculation during sheet rendering.

No recursive engine invocation.

No side-effects in read-only phases.

IV. Execution Pipeline

Authoritative execution order:

Mutation request enters actor-engine.

State is validated.

Rule computation executes in v2 Actor classes.

Derived state is recalculated.

Ability and modifier systems re-register.

Sentinel validation pass runs (if enabled).

Actor re-renders.

Chat output dispatched (if applicable).

No layer may bypass this pipeline.

See:

docs/EXECUTION_PIPELINE.md

docs/ENGINE-ARCHITECTURE.md

V. Sentinel Enforcement

Sentinel exists to detect invariant violations.

Sentinel monitors:

Shadow writes to derived state

Unauthorized mutation

Duplicate modifiers

Engine cross-calls

Mutation during render

Non-deterministic recalculation

Sentinel modes:

Dev Mode: Hard error

Alpha Mode: Logged violation

Production Mode: Silent telemetry

Sentinel enforces invariants.
It does not compute rules.

VI. Forbidden Patterns

The following are strictly prohibited:

Rules math in sheets or templates

Direct actor.update() for gameplay changes

Direct item.update() for owned items

ChatMessage.create() outside swse-chat

Cross-engine compute invocation

Hidden side effects in getters

State mutation inside render methods

Introducing new rule logic outside v2 Actor classes

Any reintroduction of V1 patterns is unconstitutional.

VII. Extension Rules (Future-Proofing)

SWSE is:

Open for extension
Closed for modification

Extensions must:

Register through documented APIs

Use structured rule metadata

Respect authority boundaries

Avoid core mutation

Core files may not be modified for feature expansion unless architecture revision is formally approved.

See:

docs/MODDING_GUIDE.md

docs/HOOK_CONTRACTS.md

docs/SUGGESTION_ENGINE_API.md

VIII. Migration & Compatibility

Legacy systems are permanently retired.

Compatibility bridges must:

Adapt data

Not reintroduce legacy logic

Respect v2 invariants

See:

docs/MIGRATIONS_AND_COMPATIBILITY.md

docs/FOUNDRY_COMPAT.md

IX. Change Governance

Architectural changes require:

Invariant impact analysis

Sentinel impact review

Execution pipeline validation

Determinism audit

Minor features may not alter architectural invariants.

Structural refactors require explicit architectural revision documentation.

X. Architectural Doctrine

If something “works” but violates an invariant, it is wrong.

If something requires bypassing actor-engine, redesign it.

If something requires rules math in sheets, redesign it.

If something requires duplicate authority, redesign it.

Stability over speed.
Determinism over convenience.
Governance over improvisation.

XI. Canonical References

Engine Governance: docs/ENGINE-ARCHITECTURE.md

Mutation Rules: docs/ARCHITECTURE_MUTATION_RULES.md

Execution Pipeline: docs/EXECUTION_PIPELINE.md

Sentinel Architecture: docs/SENTINEL_ARCHITECTURE.md

Foundry Compatibility: docs/FOUNDRY_COMPAT.md

Actions Integration: docs/ACTIONS.md

Final Statement

SWSE V2 is a sovereign engine-driven architecture.

All gameplay authority is centralized.
All mutation is orchestrated.
All invariants are enforced.
All drift is rejected.

This document is the constitutional source of truth.
