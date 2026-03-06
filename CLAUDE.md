SWSE SYSTEM — CLAUDE EXECUTION PROTOCOL

(Global Governance Directive — Applies to ALL Tasks)

Claude, you are operating inside the SWSE V2 Foundry v13 system.

You must comply with all architectural, governance, and CSS isolation rules below.

You are not permitted to improvise outside this framework.

🧠 I. ARCHITECTURAL MODEL (NON-NEGOTIABLE)
Authority Model

Rules live in:

scripts/actors/v2/*

Derived state lives in:

actor.system.derived

Sheets are:

Pure view layers (ApplicationV2 only)

Mutation gatekeeper:

scripts/actors/engine/actor-engine.js

Chat output:

scripts/chat/swse-chat.js

No other layer may mutate gameplay state or produce gameplay output.

🔒 II. V2 GOVERNANCE COMPLIANCE

You MUST NOT:

Call ChatMessage.create() from sheets

Call ui.notifications.* from sheets

Call Hooks.call() from sheets

Call actor.update() directly outside ActorEngine

Call item.update() directly outside ActorEngine

Mutate DOM outside ApplicationV2 lifecycle

Use jQuery

Extend ApplicationV2 directly (must extend BaseSWSEAppV2)

All state mutations must route through the engine layer.

⚙️ III. FOUNDARY V13 COMPLIANCE

You MUST:

Use async Roll evaluation:

await roll.evaluate({ async: true });

Avoid deprecated Roll APIs

Avoid private Foundry internals

Avoid modifying Foundry CSS layers

Avoid overriding core layout classes

You MUST NOT:

Modify .app

Modify .window-content

Modify .sidebar

Modify .directory

Modify .tab

Modify #sidebar-tabs

You may style only namespaced SWSE classes.

🎨 IV. XCSS (STRICT CSS GOVERNANCE)

CSS MUST follow these rules:

Allowed
.swse-*
.sheet-*
.component-*
Forbidden
button { ... }
* { ... }
.tab { ... }
.tabs { ... }
.app { ... }
.window-content { ... }
::before global overrides
::after global overrides

No:

height: 100% at root

position: fixed at root

Global overflow

CSS @layer declarations

CSS resets affecting core UI

All CSS must be fully namespaced.

📦 V. ABSOLUTE IMPORT DISCIPLINE

All imports MUST use absolute system paths:

import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

Never use relative imports like:

../../chat/swse-chat.js

Never change existing absolute imports.

Never mass-rewrite imports without explicit instruction.

🧩 VI. CHAT OUTPUT GOVERNANCE

All chat output must route through:

SWSEChat service

No direct roll.toMessage() calls.
No direct ChatMessage.create() outside the service layer.

All roll output must be centralized.

🛠 VII. MUTATION SURFACE DISCIPLINE

Before introducing new features, you MUST:

Audit existing mutation surfaces.

Confirm no duplicate patterns exist.

Avoid introducing parallel pipelines.

Avoid expanding mutation surface without consolidation.

If chat, rolls, or engine mutations are inconsistent:
Refactor first. Then build.

🧪 VIII. STABILITY PHASING RULE

Never build multiple UI systems at once.

Correct order:

Consolidate architecture

Verify Sentinel health

Introduce visual layer

Introduce animation layer

Introduce new UI systems

Stop after each phase for validation.

🧠 IX. SENTINEL INTEGRATION RULE

You must:

Preserve Sentinel monitoring

Not disable enforcement layers

Not bypass runtime contract checks

Not introduce containment mutations

Not alter CSS in a way that triggers sidebar state change

If Sentinel reports degradation, stop and audit before proceeding.

🧰 X. APPLICATIONV2 DISCIPLINE

All new UI must:

Extend BaseSWSEAppV2

Respect render lifecycle

Avoid DOM mutation outside _renderHTML

Avoid attaching to <body>

Avoid root-level wrappers

Avoid full-screen overlays without governance

No sidebar injection.
No boot-time DOM insertion.
No CSS injection via <link> tags at runtime unless explicitly approved.

🧮 XI. DATA FLOW DISCIPLINE

All visual components must derive from:

actor.system.derived

Never compute percentages or game math in templates.
Never compute gameplay math in CSS.

Engine owns math.
Sheet owns rendering.

🧭 XII. MIGRATION SAFETY

When modifying:

Roll systems

Actor derived data

Chat services

Engine mutations

You must:

Preserve backward compatibility

Avoid breaking saved data

Avoid altering schema without migration path

🧨 XIII. WHAT YOU MUST NEVER DO

Never:

Add global CSS resets

Add root-level flex containers

Add overflow: hidden globally

Inject into sidebar tabs

Replace Foundry CSS

Use @layer without explicit instruction

Silence Sentinel warnings

Disable governance checks

🧠 XIV. OUTPUT REQUIREMENTS

When implementing changes:

Provide diff-level summary.

List files modified.

Confirm governance compliance.

Confirm no new mutation surfaces introduced.

Confirm CSS isolation compliance.

Stop after phase completion.

🧾 XV. EXECUTION PHILOSOPHY

You are building a long-lived system.

Prioritize:

Determinism

Single source of truth

Centralized mutation

Explicit data flow

Strict isolation

Incremental expansion

Never optimize for speed over architecture.

END DIRECTIVE

All future Claude commands must comply with this protocol.

If a requested feature violates these rules, you must pause and request clarification before proceeding.