# SWSE Chat Concept — Developer Handoff

Target codebase: **foundryvtt-swse** (Foundry VTT v13, Handlebars + vanilla JS + CSS)

The companion file `SWSE Chat Concept.html` is a static reference — it shows
the *intended* look and behaviour. **Do not ship the HTML.** Implement the
patterns inside the existing repo using the existing pipelines listed below.

---

## What you're building

Four families of chat messages, all driven by data the engines already
produce. No new roll math, no new ledger, no parallel chat pipeline.

| Family | Visual | Driven by | Files |
|---|---|---|---|
| **Roll cards** (skill, ability, attack, damage, save, force power, initiative) | Unified `.swse-chat-card` + category modifier + clickable total | `SWSEChat.postRoll` → `SWSERollEngine.buildHoloRollData` → `holo-roll.hbs` | Existing — extend |
| **Combat reaction strip** | Defender-only row of reaction buttons inside the attack card | `ReactionRegistry` + `swseDeriveChatReactions` (already in roll engine) + `chat-interaction-bridge.js` | Existing — extend |
| **Holonet transmission card** | Clickable transmission card → opens Messenger surface | `swseHolonet:recordPublished` + `SWSEChat.postHTML` (whispered) | New helper + template |
| **Store / credit receipt** | Receipt card with before / delta / after ledger | `swseStoreTransactionComplete`, `swseCreditTransferComplete`, `swseCreditGrantComplete`, `swseCustomPurchaseApproved`, `swseCustomPurchaseDenied`, `swseApprovalResolved` | New helper + template |

---

## Visual language (commitments)

These commitments determine which CSS variable drives the `--rail` token
on a card. The rail token then tints the chip, ribbon, total glow,
buttons, and any per-card flourishes via `color-mix()`.

- **Skill cards & ability cards** inherit the governing ability's color.
  Already authoritative in the repo as `--swse-ability-{str,dex,con,int,wis,cha}`
  (see `styles/system/secondary-surfaces.css`).
- **Attack cards & damage cards** inherit the **player's chosen weapon
  color** end-to-end. `WeaponVisualProfileResolver.colorHex` already produces
  this — just promote it from the beam pill to the card root.
- **Force power cards** inherit the descriptor color: dark (red), light
  (cyan), telekinetic (purple), mind-affecting (amber), form (pink).
  Tokens defined in the new section of `chat-card.css` (see below).
- **Saves** = success green. **Initiative** = warning amber. **Dialogue** =
  neutral text-secondary, no rail. **Narration** = single italic line,
  chromeless.
- **Holonet** = transmission-cyan by default, overridable per
  `data-priority` and `data-source`.
- **Receipts** = colored by `data-store-source-type`; the big delta number
  is colored independently by `data-store-delta-direction`.

---

## Files you'll touch

### Modify

1. **`styles/system/chat-surfaces.css`** — append the production CSS block
   from `proposed/styles/chat-card.css`. (Or merge as a new file
   `styles/system/chat-card.css` and add to `system.json`.)

2. **`templates/chat/holo-roll.hbs`** — three additions, no removals.
   See `proposed/templates/holo-roll.hbs`. Adds:
   - `style="--rail: …"` on card root when `weaponVisual.colorHex` is set
   - `data-ability="{{context.abilityKey}}"` on skill/ability cards
   - `data-descriptor="{{context.forceDescriptor}}"` on force cards
   - `data-category="{{category}}"` so CSS modifiers can target categories
   - A `.body` wrapper that contains a clickable `.total` button and a
     hidden `.breakdown`. The breakdown holds the existing parts list.
   - Conditional `{{#if context.reactionContext}}` block for the defender
     reactions strip — feeds from the existing `swseDeriveChatReactions`
     helper inside the roll engine.

3. **`scripts/engine/rolls/swse-roll-engine.js`** — `buildHoloRollData`
   already returns most of what we need. Surface three extra fields:
   ```js
   abilityKey: (context.abilityKey ?? context.ability ?? '').toLowerCase() || null,
   forceDescriptor: context.forceDescriptor ?? null,   // 'light' | 'dark' | 'tk' | 'mind' | 'form'
   weaponColorHex: weaponVisual?.colorHex ?? null,
   reactionContext: this._buildReactionContext(actor, context) // optional, only for attacks
   ```
   `_buildReactionContext` is a thin wrapper around the existing
   `swseDeriveChatReactions(payload)` already defined in the same file.

4. **`scripts/core/load-templates.js`** — register the two new
   templates:
   ```js
   'systems/foundryvtt-swse/templates/chat/holonet-card.hbs',
   'systems/foundryvtt-swse/templates/chat/store-receipt.hbs',
   ```

5. **`scripts/core/init.js`** (or wherever chat subsystems are bootstrapped
   — likely `scripts/bootstrap/holo-init.js`) — import and initialise the
   two new helpers:
   ```js
   import { ChatCardToggle } from '/systems/foundryvtt-swse/scripts/chat/chat-card-toggle.js';
   import { HolonetChatCard } from '/systems/foundryvtt-swse/scripts/chat/holonet-chat-card.js';
   import { StoreReceiptChat } from '/systems/foundryvtt-swse/scripts/chat/store-receipt-chat.js';
   Hooks.once('ready', () => {
     ChatCardToggle.install();
     HolonetChatCard.install();
     StoreReceiptChat.install();
   });
   ```

### Create

| Path | Purpose |
|---|---|
| `scripts/chat/chat-card-toggle.js` | Click delegation: toggle `[data-expanded]` on `.swse-chat-card` when `.total` is clicked. Restores from `flags.swse.chatExpanded` if set so refresh preserves state. |
| `scripts/chat/store-receipt-chat.js` | Subscribes to the store/credit hooks, builds a receipt payload from each event, renders `store-receipt.hbs`, posts via `SWSEChat.postHTML` whispered to the actor's owners. |
| `scripts/chat/holonet-chat-card.js` | Subscribes to `swseHolonet:recordPublished` for message-type records. Renders `holonet-card.hbs`, whispers to recipients, wires click delegation to call `ShellHost.setSurface('messenger', { threadId })`. |
| `templates/chat/holonet-card.hbs` | Holonet transmission card template. |
| `templates/chat/store-receipt.hbs` | Store / credit receipt template. |

Drop-in stubs for all of the above are in `proposed/`. They are starting
points, not the final code — adapt to the repo's conventions.

---

## Data-attribute contract

These attributes drive the CSS and click handlers. Keep them stable —
any future telemetry, automation, or external module integration will key
off them.

### Roll cards (`.swse-chat-card.swse-roll-card`)

| Attribute | Values | Source |
|---|---|---|
| `data-swse-chat-surface` | `"roll"` | constant |
| `data-category` | `"skill"`, `"ability"`, `"attack"`, `"damage"`, `"save"`, `"initiative"`, `"force"`, `"dialogue"` | `holoData.category` |
| `data-ability` | `"str"\|"dex"\|"con"\|"int"\|"wis"\|"cha"` | `holoData.abilityKey` |
| `data-descriptor` | `"light"\|"dark"\|"tk"\|"mind"\|"form"` | `holoData.forceDescriptor` |
| `data-expanded` | `"true"\|"false"` | runtime; persisted in `flags.swse.chatExpanded` |
| `style="--rail: <hex>"` | weapon blade hex | `weaponVisual.colorHex` (inline) |

### Holonet cards (`.swse-holonet-card`)

| Attribute | Values |
|---|---|
| `data-holonet-record-id` | record UUID |
| `data-holonet-thread-id` | thread UUID |
| `data-holonet-action` | `"open-thread"` |
| `data-priority` | `"urgent"\|"alert"\|"secure"` (optional) |
| `data-source` | `"gm"\|"npc"` |
| `data-direction` | `"outgoing"` for sender's own copy |

### Receipt cards (`.swse-receipt-card`)

| Attribute | Values |
|---|---|
| `data-swse-chat-type` | `"store-receipt"` |
| `data-store-transaction-id` | transaction UUID |
| `data-store-source-type` | `"purchase"\|"approval"\|"denial"\|"credit-transfer"\|"credit-grant"\|"refund"\|"party-fund"` |
| `data-store-delta-direction` | `"positive"\|"negative"\|"neutral"` |

### Reaction buttons (`.reaction-btn`)

| Attribute | Notes |
|---|---|
| `data-swse-reaction-key` | One of `ReactionRegistry` keys: `block`, `deflect`, `counterattack`, `forceReflection`, `evasion`. Also accepts `forcePoint` for the universal FP negate. |

The existing `scripts/ui/chat/chat-interaction-bridge.js` already
delegates `data-swse-reaction-key` clicks to `ReactionEngine.resolve()` —
no new click handler needed.

---

## Privacy model

- **Holonet messages** are posted with
  `whisper: record.recipients.map(r => userIdFor(r))`. Non-recipients
  never see the card at all. The "redacted" variant in the concept is a
  *visual fallback only* — production should not render it.
- **Store receipts** are whispered to
  `actor.ownership` users (`OWNER` permission). Transfers whisper to
  both parties.
- **GM-only approval/denial** chatter stays in GM whisper.
- **Combat reactions strip** uses Foundry's per-user template
  branching: render the strip only when the viewing user owns the
  defender. Easiest path: have the roll-engine populate
  `reactionContext` only when called from a per-defender re-render, or
  emit a separate whispered companion card with just the strip.

---

## Click-to-expand (math toggle)

The collapsed card shows only the actor / action / big total. Clicking
the `.total` button toggles `data-expanded="true"`, which reveals the
`.breakdown` (parts list including the d20 result). CSS already handles
the visual; you need:

1. `chat-card-toggle.js` — `pointerdown` delegation on the chat log.
2. Persist state on the `ChatMessage` via
   `message.update({ 'flags.swse.chatExpanded': true })` so re-renders
   (and other clients) stay consistent.
3. Wire the d20 chip move (already done in template — the `.total` no
   longer contains a `.d20`; the d20 result lives at the head of
   `.parts`).

---

## Reduced motion

All animations (head-tick pulse, holonet signal, receipt amount pop,
breakdown slide-in) wrap in `@media (prefers-reduced-motion: reduce)`
guards. Already in the CSS — verify with `data-motion-style="reduced"`
on `<html>` (the existing repo motion-style hook).

---

## Theming

Cards consume `--swse-text-primary`, `--swse-text-muted`,
`--swse-bg-mid`, `--swse-bg-dark`, `--swse-border-subtle`,
`--swse-success`, `--swse-danger`, `--swse-warning`, the
`--swse-ability-*` tokens (already in
`styles/system/secondary-surfaces.css`), and the new
`--swse-force-{light,dark,tk,mind,form}` tokens (added in
`chat-card.css`).

Every existing theme (holo, jedi, starship, high-republic, sand-people,
high-contrast) is automatically supported because all colors flow from
tokens. No theme-specific overrides needed.

---

## Suggested implementation order

1. **CSS only.** Drop in `chat-card.css`, add the new force-descriptor
   tokens, register the file. Existing cards will already look improved.
2. **Roll template.** Update `holo-roll.hbs` with the new data
   attributes + total/breakdown structure. Update `buildHoloRollData`
   with the three new fields. Verify all existing roll cards still
   work (skills, attacks, damage, saves, force, initiative).
3. **Click-to-expand.** Add `chat-card-toggle.js`.
4. **Reaction strip.** Verify `swseDeriveChatReactions` returns the
   data you need; render the strip block in the template; double-check
   the bridge picks up clicks.
5. **Holonet card.** Add helper + template + Messenger routing.
6. **Receipts.** Add helper + template + hook subscriptions.

You can ship after any of these phases — they don't depend on each other.

---

## Runtime-test checklist

When the implementation lands, validate:

- [ ] Roll a skill check — DEX skill renders teal, STR renders argent
- [ ] Roll an attack with a lightsaber that has a `system.color` set —
      whole card tints to the blade color
- [ ] Click the total — math drawer expands; click again — collapses
- [ ] Send a Holonet message GM → player — only the player sees a
      transmission card; click opens the Messenger to the thread
- [ ] Buy something in the store — buyer receives a purchase receipt
      whisper with correct before/delta/after
- [ ] GM approves a custom droid — both GM and player receive matching
      approval receipts
- [ ] Make an attack against a player with the Block talent — defender
      sees a Reaction strip with Block; non-defender players don't
- [ ] Toggle a theme — all card chrome retints; nothing hardcoded leaks
- [ ] Set `data-motion-style="reduced"` on `<html>` — all card
      animations stop, nothing visually broken
- [ ] Pop the chat log out to a wide window — cards expand to fill;
      head row shows timestamps; collapse sidebar — head row collapses
      to two columns (or use container queries — see CSS file notes)

---

## Files in this package

```
handoff_swse_chat/
├── README.md                          ← this file
├── SWSE Chat Concept.html             ← visual reference (do not ship)
└── proposed/                          ← starting-point drop-ins
    ├── styles/
    │   └── chat-card.css              ← production CSS (append or new file)
    ├── templates/
    │   ├── holo-roll.hbs              ← proposed updated roll template
    │   ├── holonet-card.hbs           ← new
    │   └── store-receipt.hbs          ← new
    └── scripts/
        └── chat/
            ├── chat-card-toggle.js    ← click-to-expand handler
            ├── holonet-chat-card.js   ← Holonet → chat bridge
            └── store-receipt-chat.js  ← Store hooks → receipt cards
```

All proposed files are starting points — adapt to repo conventions,
linting, and the actual signatures of the engines they reference.
