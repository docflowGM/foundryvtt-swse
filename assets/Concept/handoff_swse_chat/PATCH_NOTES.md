# GM Datapad Visual Redesign — Patch Notes

Design principle: **GM effectiveness over immersion**.
Every change prioritizes fast information retrieval and operational clarity.

---

## FILES TO COPY INTO REPO

### 1. CSS Patch (append, do not replace)
```
handoff_swse_chat/gm-datapad-css-patch.css
→ APPEND to: styles/apps/gm-datapad.css
```

### 2. Templates (replace)
```
handoff_swse_chat/templates/home.hbs
→ REPLACE: templates/apps/gm-datapad/surfaces/home.hbs

handoff_swse_chat/templates/factions.hbs
→ REPLACE: templates/apps/gm-datapad/surfaces/factions.hbs

handoff_swse_chat/templates/dock.hbs
→ REPLACE: templates/apps/gm-datapad/partials/dock.hbs
```

### 3. JS Patch (one small addition to gm-datapad.js)
In `_prepareContext`, add `urgentApps` to the returned context object:

```js
// After: const apps = this._getAppCards(appCounts);
const urgentApps = apps.filter(app =>
  app.statusTone === 'crit' && Number(app.badgeCount ?? 0) > 0
);

// In the mergeObject return, add:
urgentApps,
```

No other JS changes required.

---

## DESIGN CHANGES BY SURFACE

### HOME (home.hbs — REPLACED)
- **Before**: flat grid of large icon cards
- **After**: two-column cluster layout (Operations | Economy+Holonet+Config)
- New: `gm-home-urgent-rail` — critical strip at top showing only crit-tone apps with badges
- App cards are now compact rows (`gm-app-row`) with code | icon | label+desc | badge
- Clusters use `appClusters` (already built by `_buildAppClusters`)
- All `data-app-card` hooks preserved

### DOCK (dock.hbs — REPLACED)
- Added `gm-dock-readiness-label` sub-label showing actionable state
- Tone class on dock-status propagates crit/warn to readiness text color
- All `data-nav-to` hooks unchanged

### FACTIONS (factions.hbs — REPLACED)
- Registry cards: added `gm-faction-score-chip` with `.positive/.negative/.neutral` color class
  - Uses `{{this.scoreClass}}` already provided by `GMFactionRelationshipSurfaceService`
  - Green = positive score, Red = negative, Amber = zero/neutral
- Relationship rows: added `gm-faction-rel-badge {{lowercase this.relationshipType}}`
  - Ally=green, Patron=cyan, Neutral=amber, Rival=red-pink, Enemy=red, Member=blue
- Compact header layout shows badge + score side-by-side in registry cards
- All existing form fields, `data-gm-faction-*` hooks, filter attributes unchanged

### ALL OTHER SURFACES (CSS patch only, no template changes)

**Bulletin**: `.bulletin-record-card.published/draft/archived/breaking` border states.
Chip classes `.bulletin-chip.published/draft/archived/breaking/urgent` for state display.

**Job Board**: `.job-card-reward` → green (#7dffb2). `.job-card-penalty` → red (#ff8b8b).
`.job-board-chip.attention/payout/review` for queue chips.

**Store — Transactions**: `.transactions-table td.amount.positive` → green.
`.transactions-table td.amount.negative` → red.
Apply classes in `transactions-tab.hbs`: add `positive` class when `this.amount > 0`,
`negative` when `this.amount < 0`.

**Trade**: `.trade-diagnostic-block.failed` for failed settlement panel.
`.trade-amount-gain/.trade-amount-loss` for directional credit display.

**Healing**: `.combat-recovery-card.droid` dims droid cards (opacity .78).
`.combat-recovery-hpbar span.hp-high/mid/low/empty` for HP bar color.
`.combat-recovery-chip.stable/warning/critical/info/muted` for status chips.
`.combat-recovery-stat-row strong.condition-healthy/wounded/disabled/dying` for condition.

**House Rules**: `.rule-category` card wrapper. `.rule-category-header` group label.
`.rule-entry` single-rule row. `.rule-name/.rule-description` text classes.
`.rule-entry.high-impact` warning variant (add class in template when rule has a warning flag).

**Workspace**: `.gm-actor-type-chip.pc/npc/droid/vehicle/beast` for actor type badges.

---

## SEMANTIC NUMBER CLASSES (use everywhere directional numbers appear)

```css
/* Add to any element showing a number with direction */
.swse-num-positive   /* green  — gains, positive rep, received credits */
.swse-num-negative   /* red    — losses, negative rep, spent credits   */
.swse-num-neutral    /* amber  — zero, no change, +0                   */

/* Pill chip variants (for ledger rows) */
.swse-ledger-gain    /* green chip  */
.swse-ledger-loss    /* red chip    */
.swse-ledger-flat    /* amber chip  */
```

Apply in templates wherever credit amounts, faction scores, or reputation deltas appear.

---

## TEMPLATES THAT NEED MINOR CLASS ADDITIONS (not replaced, just add classes)

These templates are structurally fine; they just need the new semantic classes added to
numeric elements. No data hooks or form fields change.

| Template | Change needed |
|---|---|
| `surfaces/jobs/kanban-and-detail.hbs` | Add `swse-num-positive` to reward credit amounts in `.job-card-reward` and `.job-reward-summary` spans |
| `surfaces/jobs/review-payout-queues.hbs` | Add `swse-ledger-gain` to payout amounts |
| `surfaces/store/transactions-tab.hbs` | Add `positive` or `negative` class to `<td class="amount ...">` based on sign |
| `surfaces/trade/trade-board.hbs` | Add `trade-amount-gain/loss` to credit movement values |
| `surfaces/healing/party-board.hbs` | Add `hp-high/mid/low` to `.combat-recovery-hpbar span` based on percent, add `droid` class to droid actor cards |
| `surfaces/bulletin/events-panel.hbs` | State and priority chip classes already in template; new CSS handles colors automatically |
| `surfaces/house-rules.hbs` | Add `high-impact` class to `.rule-entry` for rules flagged as high-impact by service |

---

## ACCEPTANCE CHECKS

- [ ] `data-app-card` on all home cards → routing intact
- [ ] `data-nav-to` on all buttons → navigation intact
- [ ] `data-gm-faction-*` on all faction form elements → service intact
- [ ] All `data-gm-faction-filter` and `data-gm-faction-search` attrs → controller intact
- [ ] `data-bulletin-section`, `data-bulletin-form`, `data-action` on bulletin → controller intact
- [ ] `data-job-select`, `data-job-status-action`, `data-job-objective-action` → intact
- [ ] `data-store-tab`, `data-store-transaction-filter`, `data-action` → intact
- [ ] `data-trade-select`, `data-trade-action` → intact
- [ ] `data-action` on all approval buttons → intact
- [ ] `data-combat-recovery-action`, `data-combat-actor-action` → intact
- [ ] `data-rule-key`, `data-rule-type` on house rule inputs → intact
- [ ] No new parallel services, apps, or ledgers created
- [ ] No hardcoded credit values or fake data introduced
- [ ] Score colors in factions match service `scoreClass` values
- [ ] Droid cards in healing show repair actions only (already in party-board.hbs logic)

---

## KNOWN RISKS

1. **`lowercase` Handlebars helper**: `factions.hbs` uses `{{lowercase this.relationshipType}}`
   to map the badge class. Verify this helper is registered in the system (it appears in
   `transactions-tab.hbs` already, so it should be available).

2. **`urgentApps` context addition**: If `_buildAppClusters` ordering changes in future,
   `home.hbs` uses `lookup appClusters 0` for the first cluster (Operations). This is
   safe as long as Operations remains the first cluster — which it currently is.

3. **`gm-faction-rel-badge` class**: Uses `{{lowercase this.relationshipType}}` as the
   CSS class. If `relationshipType` values contain spaces or special characters, the class
   won't match. Verify service output values are single-word lowercase-safe strings.

4. **HP bar color classes**: `combat-recovery-hpbar span.hp-high/mid/low` requires
   adding the class in `party-board.hbs` based on `this.hpPercent`. The existing
   `style="width:{{this.hpPercent}}%"` is already there; just add the color class
   alongside it (e.g. `{{#if (gt this.hpPercent 50)}}hp-high{{else if (gt this.hpPercent 25)}}hp-mid{{else}}hp-low{{/if}}`).
   This requires Handlebars `gt` helper — confirm it is available.
