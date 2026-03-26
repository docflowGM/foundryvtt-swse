# SWSE Character Sheet Stabilization Pass
## Remediation Plan (2026-03-24)

This is a **stabilization/remediation pass**, not a feature or polish pass.
Focus: Function before cosmetics. Restore usability of the normal character sheet only.

---

## BRIEF DIAGNOSIS

### Primary Regressions Identified

**SHELL/WINDOW (BLOCKER)**
- `.swse-sheet { overflow: hidden; }` in unified-sheets.css (line 25) prevents vertical scrolling
- Window fixed at 900x950 (hard-coded) with no scroll capability
- Form element needs to allow content overflow

**TAB STRUCTURE**
- Record tab is redundant visual failure
- Record and Biography should merge into single Biography tab
- Need to remove Record tab and update nav

**OVERVIEW TAB**
- HP current/max fields not editable (need event binding)
- Condition track buttons don't match visible track
- Defenses positioning broken inside SVG frames
- Level Up / Store / Mentor buttons dead (action wiring broken)

**ABILITIES TAB**
- Visually acceptable but not interactive
- Roll click handler missing

**SKILLS TAB**
- Vertical compression/crunching (row height issue)
- Trained/Focus click handlers not wired
- Trained should add +5 to total
- Focus should add +5 only when Trained is active
- Focus clickability conditional on Trained state

**TALENTS TAB**
- Tab includes both feats and talents but named "Talents" only
- Need to rename tab or restructure content to match intent
- SVG frame sizing/position broken

**GEAR TAB**
- Completely blank/non-functional
- No add/manage item UI visible
- Likely mount or content regression

---

## REMEDIATION ROADMAP

### PHASE A — SHELL / WINDOW / SCROLL REPAIR
**Goal:** Restore window expansion and vertical scrolling

**Files to modify:**
- `styles/sheets/unified-sheets.css` — Remove `overflow: hidden` from `.swse-sheet`
- `styles/sheets/v2-sheet.css` — Ensure form/shell allow scroll
- `scripts/sheets/v2/character-sheet.js` — Check height constraints

**Expected changes:**
- Change `.swse-sheet { overflow: hidden; }` to `overflow: auto;` or remove
- Ensure sheet-body has `flex: 1; min-height: 0;` (already present)
- Verify tab container allows `overflow-y: auto`

**Success criteria:**
- Window can be resized larger/smaller
- Content scrolls when sheet is taller than viewport
- Header and nav stay fixed while body scrolls

---

### PHASE B — TAB STRUCTURE REPAIR
**Goal:** Merge Record into Biography; remove weak tab

**Files to modify:**
- `templates/actors/character/v2/character-sheet.hbs` — Remove Record tab nav and section
- `templates/actors/character/v2/partials/biography-log-panel.hbs` — Add Record content
- `scripts/sheets/v2/character-sheet.js` — Update context/data mapping

**Expected changes:**
- Remove `<a class="item" data-tab="record">Record</a>` from nav
- Remove Record `<section class="tab" data-tab="record">` from body
- Merge Record panels (portrait, record-header, bio-profile, notes) into Biography
- Consider 3-column layout for merged content

**Success criteria:**
- Biography tab contains all identity, bio, and narrative content
- Record tab no longer exists
- No content loss from merge

---

### PHASE C — OVERVIEW FUNCTION REPAIR
**Goal:** Restore HP editing, condition track, defenses, button wiring

**Files to modify:**
- `templates/actors/character/v2/partials/hp-condition-panel.hbs` — Add event handlers
- `templates/actors/character/v2/partials/defenses-panel.hbs` — Fix positioning in frame
- `scripts/sheets/v2/character-sheet.js` — Wire action handlers

**Expected changes:**
- Add `data-action` handlers to HP current/max inputs
- Align condition track buttons with visible track visualization
- Fix defenses panel SVG frame alignment
- Re-wire Level Up, Store, Mentor button handlers

**Success criteria:**
- HP current/max are editable
- Condition track buttons align with visual
- Defenses render correctly within SVG frame
- Action buttons trigger their respective dialogs/apps

---

### PHASE D — ABILITIES / SKILLS FUNCTION REPAIR
**Goal:** Restore editing, rolls, trained/focus logic

**Files to modify:**
- `templates/actors/character/v2/partials/abilities-panel.hbs` — Add roll handlers
- `templates/actors/character/v2/partials/skills-panel.hbs` — Fix layout/compression
- `scripts/sheets/v2/character-sheet.js` — Add ability/skill event handlers

**Expected changes:**
- Add click handlers for ability rolls
- Fix skills table layout (row height, column widths)
- Implement Trained click → +5 to total
- Implement Focus click → +5 only if Trained active
- Prevent Focus activation unless Trained is active
- Fix "Ability click reveals skill" regression

**Success criteria:**
- Skills render with proper row height
- Trained/Focus buttons functional and wired
- Ability rolls work from click
- No vertical crunching in skills table

---

### PHASE E — TALENTS / GEAR REPAIR
**Goal:** Correct structure and restore Gear management UI

**Files to modify:**
- `templates/actors/character/v2/character-sheet.hbs` — Rename Talents tab or restructure
- `templates/actors/character/v2/partials/talents-panel.hbs` or split into talents + feats
- `templates/actors/character/v2/partials/equipment-ledger-panel.hbs` — Restore Gear UI

**Expected changes:**
- If merging feats+talents: rename tab to "Talents & Feats" or "Special Abilities"
- If separating: create Feats tab and Talents tab separately
- Restore equipment ledger with add/remove buttons
- Fix frame sizing for talent/feat/gear rows

**Success criteria:**
- Talents tab content matches tab name (or renamed appropriately)
- Feats and talents visually separated or clearly labeled as combined
- Gear tab has visible add/manage item controls
- Frames render at correct size

---

### PHASE F — SVG RECONCILIATION
**Goal:** Re-tighten SVG mounts after usability restored

**Files to check:**
- `styles/ui/character-sheet-svg-panels.css`
- Individual panel SVG mounts

**Approach:**
- Only after Phases A-E complete
- If SVG mount is breaking usability, simplify/loosen it
- Don't chase fidelity before function

**Success criteria:**
- SVG frames render correctly after layout fixes
- No functional regressions from tightening

---

## IMPLEMENTATION ORDER

1. **Phase A first** — Unblock scrolling (highest priority)
2. **Phase B second** — Merge Record/Biography (structural cleanup)
3. **Phase C** — Restore Overview functions
4. **Phase D** — Restore Abilities/Skills
5. **Phase E** — Fix Talents/Gear
6. **Phase F** — SVG polish (only if no breakage)

---

## IMPLEMENTATION RULES

1. **Fix function before cosmetics** — Always
2. **If SVG breaks usability, loosen the mount** — Don't force broken fidelity
3. **Don't preserve bad splits** — Merge Record/Bio cleanly
4. **Restore v2 authority model** — Use existing action binding system
5. **Re-check layout contract after every structural fix**
6. **Keep changes surgical and documented**

---

## REPORT FORMAT (at end)

```
Created:
- ...

Modified:
- ...

Tab structure changes:
- ...

Window/scroll fixes:
- ...

Interactivity fixes:
- ...

Authority/wiring fixes:
- ...

SVG mounts simplified/retained/reworked:
- ...

Remaining known issues:
- ...
```
