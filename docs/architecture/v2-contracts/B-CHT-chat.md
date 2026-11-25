# B-CHT — chat (gameplay chat output and chat cards)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/chat.json`. **Facts:** 15 files, 7 runtime modules (6 reachable, 1 orphan), 1,365 SLOC.

## 1. Purpose and boundaries

Owns the single gameplay-chat authority required by A-05 (APPROVED, ARCHITECTURE §II/§VI): `SWSEChat` (`scripts/chat/swse-chat.js`, 97 importers) with `postRoll`, `postHTML`, `postDialogue`, `postNarration`, Holonet/store-receipt/combat-status cards; plus card registrars for store receipts and Holonet records, notice cards and action chat. Must **not** own: roll execution (ROL), damage packets (combat), credit movement (A-10 — receipts only render TransactionEngine outcomes).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-CHT-01 | Gameplay chat posting API | `scripts/chat/swse-chat.js` · `SWSEChat` | APPROVED (A-05) · OBSERVED | test-verified (`tests/swse-chat-no-phantom-postmessage.test.mjs`) | `scripts/chat/swse-chat.js:291`, `:353`, `:341` |
| R-CHT-02 | Store/credit receipt cards (hook-driven) | `scripts/chat/store-receipt-chat.js` · `registerStoreReceiptChatCards` | OBSERVED | source-inspected | `scripts/chat/store-receipt-chat.js:410-417` |
| R-CHT-03 | Holonet record cards | `scripts/chat/holonet-chat-card.js` | OBSERVED | source-inspected | `scripts/chat/holonet-chat-card.js:71` |
| R-CHT-04 | Roll card model (delegated renderer) | `scripts/engine/rolls/swse-roll-engine.js` (ROL) | OBSERVED | dependency-traced | `scripts/chat/swse-chat.js:4` |
| R-CHT-05 | Persistence primitive | `scripts/core/document-api-v13.js` · `createChatMessage` (INF) | OBSERVED | behavior-code-verified | `scripts/core/document-api-v13.js:252`, `scripts/chat/swse-chat.js:3` |

## 3. Authorities

Chat output: SWSEChat (APPROVED · CONFLICT — 43 direct `ChatMessage.create` sites in 23 live modules per P-A05, **plus 31 direct `createChatMessage(...)` calls in 17 live modules** that the probe does not count, F-CHT-001).

## 4. Public interfaces

| Symbol | path:line | Importers | Contract |
|---|---|---:|---|
| `SWSEChat.postRoll` | `scripts/chat/swse-chat.js:291` | 97 | roll + context → card via SWSERollEngine |
| `SWSEChat.postHTML` | `scripts/chat/swse-chat.js:353` | 97 | |
| `SWSEChat.postStoreReceipt` | `scripts/chat/swse-chat.js:588` | 97 | receipt view only |
| `SWSEChat.postCombatStatusCard` | `scripts/chat/swse-chat.js:644` | 97 | |
| `postNoticeCard` | `scripts/chat/notice-card.js` | 2 | |

## 5. Dependencies

Allowed: infrastructure (document facade), ROL card model, ui-shell roll companion (presentation). Prohibited: chat → combat/feat mechanics. Observed: 6-file static cycle `swse-chat → swse-roll-engine → damage-packet-builder → skill-feat-runtime-patches → skill-feat-resolver → swse-chat/roll-engine → swse-chat` (F-CHT-002).

## 6. Integration points and lifecycle

Hooks: `swseStoreTransactionComplete`, `swseStoreSaleComplete/Denied`, `swseCreditTransferComplete`, `swseCreditGrantComplete`, `swseCreditAdjustmentComplete`, `swseCustomPurchaseApproved/Denied` (`store-receipt-chat.js:410-417`), `swseHolonet:recordPublished` (`holonet-chat-card.js:71`). `SWSEChat.postRoll` is monkey-patched at load by `scripts/patches/combat-ui-behavior-hotfix.js:282` (F-PAT-001).

## 7. Failure behavior and invariants

A-05 is the domain invariant. A-09: the authority's main method is wrapped by a hotfix.

## 8. Level C subsystem contracts

None.

## 9. Tests and certification

`tests/swse-chat-no-phantom-postmessage.test.mjs`. Foundry acceptance: card rendering and whisper/roll modes — FOUNDRY_ACCEPTANCE_REQUIRED.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-CHT-01 | ARCHITECTURE.md §II "Sheets and engines may not create ChatMessage directly" | 74 bypass sites (43 `ChatMessage.create` + 31 `createChatMessage`) in live modules across species, combat, feats, ui-shell, force, progression, talents, customization, skills, rolls |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-CHT-001 | high | confirmed | A-05 bypassed at 74 live sites; probe misses the `createChatMessage` wrapper route |
| F-CHT-002 | medium | confirmed | 6-file chat ⇄ roll ⇄ damage-packet cycle via a feat patch module |
| F-CHT-003 | low | confirmed | `chat-commands.js` orphan registers a `chatMessage` hook nobody loads |
| F-CHT-004 | medium | confirmed | `SWSEChat.postRoll` wrapped by a hotfix |

## 12. Unimplemented, deferred, acceptance-required

U-CHT-01: chat commands (`/…` parser) never loaded — owner decides wire or delete. No rules items.
