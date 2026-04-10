# Phase 1 — Character Sheet CSS Governance Map

**Created:** 2026-04-10  
**Status:** Phase 1 Analysis Complete  
**Next:** Phase 2 — Consolidate Authority

---

## Section 1 — Critical Chain Definition

The normal SWSE character sheet layout is governed by a single vertical flex chain from the ApplicationV2 window frame down to the content scroll owner.

This chain must be preserved exactly for the sheet to function. Any breakage at any node causes layout collapse, scroll hijacking, or height constraint failure downstream.

### The Critical Chain

```
.application.swse-character-sheet
  ↓ [ApplicationV2 frame, height: 950px]
.window-content
  ↓ [Flex container, min-height: 0 required]
.swse-character-sheet-wrapper
  ↓ [Transparent pass-through, display: contents]
form.swse-character-sheet-form
  ↓ [Primary flex column, flex: 1, min-height: 0]
.sheet-shell
  ↓ [Secondary flex column, flex: 1, min-height: 0]
.sheet-body
  ↓ [Tab container, flex: 1, min-height: 0, MUST NOT scroll]
.sheet-body > .tab
  ├─ .tab.active
  │  ↓ [SOLE VERTICAL SCROLL OWNER, overflow-y: auto]
  │  Content (scrolls as needed)
  │
  └─ .tab:not(.active)
     ↓ [Hidden, display: none]
```

### Node Roles

**`.window-content`**  
Bounded container from ApplicationV2 frame. Must preserve flex chain from frame to form. The min-height: 0 override is critical—without it, the entire chain collapses because AppV2 does not guarantee flex-safe height.

**`.swse-character-sheet-wrapper`**  
Transparent structural wrapper (display: contents). Acts as pass-through for flex chain. Not a flex container itself. Architectural requirement from AppV2 template structure.

**`form.swse-character-sheet-form`**  
Primary flex column. Directly receives flex: 1 to fill available space. Must not be a scroll owner (overflow is not auto). Constrains height via min-height: 0 to allow internal flex items to shrink.

**`.sheet-shell`**  
Secondary flex column. Internal layout container. Flex: 1, min-height: 0. Passes space to sheet-body.

**`.sheet-body`**  
Tab container. Flex: 1, min-height: 0. Arranges inactive/active tabs vertically. CRITICAL: overflow: hidden. If sheet-body scrolls, the contract is broken.

**`.sheet-body > .tab.active`**  
Sole vertical scroll owner. overflow-y: auto. Only element allowed to scroll. Content inside this tab scrolls as needed. All other tabs are hidden (display: none).

**`.sheet-body > .tab:not(.active)`**  
Inactive tabs. display: none. Removed from layout entirely. Prevents hidden content from consuming layout space.

---

## Section 2 — Rule Inventory

### By Node

#### Node: .window-content

**Rule 01**  
File: `styles/sheets/v2-sheet.css`  
Line: 16  
Selector: `.window-content`  
Specificity: `(0,1,0)`  
Properties: `min-height: 0 !important`  
Match Type: Exact-match  
Classification: CONTRACT  

**Rule 02**  
File: `styles/sheets/character-sheet.css`  
Line: 163  
Selector: `.window-content`  
Specificity: `(0,1,0)`  
Properties: `min-height: 0 !important`  
Match Type: Exact-match  
Classification: ILLEGAL_OR_CONFLICTING (duplicate ownership)  

**Rule 03**  
File: `styles/sheets/character-sheet.css`  
Lines: 167-173  
Selector: `.application.swse-character-sheet > .window-content`  
Specificity: `(0,3,0)`  
Properties: `display: flex; flex-direction: column; min-height: 0 !important; overflow: hidden`  
Match Type: Exact-match  
Classification: CONTRACT  

#### Node: .swse-character-sheet-wrapper

**Rule 04**  
File: `styles/sheets/character-sheet.css`  
Lines: 181-185  
Selector: `.application.swse-character-sheet > .window-content > div.swse-character-sheet-wrapper`  
Specificity: `(0,4,1)`  
Properties: `display: contents`  
Match Type: Exact-match  
Classification: CONTRACT (transparent pass-through)  

#### Node: form.swse-character-sheet-form

**Rule 05**  
File: `styles/sheets/v2-sheet.css`  
Lines: 28-36  
Selector: `.application.swse-character-sheet > .window-content > form.swse-character-sheet-form`  
Specificity: `(0,4,1)`  
Properties: `display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; overflow: hidden`  
Match Type: Exact-match  
Classification: CONTRACT  

**Rule 06**  
File: `styles/sheets/character-sheet.css`  
Lines: 187-195  
Selector: `.swse-character-sheet.swse-sheet form.swse-character-sheet-form` (narrower variant)  
Specificity: `(0,4,2)` (narrower due to .actor.character context)  
Properties: `display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; overflow: visible`  
Match Type: Exact-match (narrower selector)  
Classification: ILLEGAL_OR_CONFLICTING (contradictory overflow property)  

#### Node: .sheet-shell

**Rule 07**  
File: `styles/sheets/v2-sheet.css`  
Lines: 981-988  
Selector: `.swse-sheet .sheet-shell`  
Specificity: `(0,2,0)`  
Properties: `display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0`  
Match Type: Exact-match  
Classification: CONTRACT  

**Rule 08**  
File: `styles/sheets/v2-sheet.css`  
Lines: 990-995  
Selector: `.swse-sheet .sheet-shell` (same selector, duplicate)  
Specificity: `(0,2,0)`  
Properties: `display: flex; flex-direction: column; flex: 1; min-height: 0`  
Match Type: Exact-match  
Classification: ILLEGAL_OR_CONFLICTING (duplicate, conflicting flex shorthand)  

#### Node: .sheet-body

**Rule 09**  
File: `styles/sheets/v2-sheet.css`  
Lines: 47-53  
Selector: `.swse-sheet .sheet-body`  
Specificity: `(0,2,0)`  
Properties: `display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0`  
Match Type: Exact-match  
Classification: CONTRACT  

**Rule 10**  
File: `styles/sheets/v2-sheet.css`  
Lines: 191-198  
Selector: `form.swse-sheet-ui .sheet-body`  
Specificity: `(0,2,0)`  
Properties: `flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden`  
Match Type: Exact-match (variant)  
Classification: CONTRACT  

**Rule 11**  
File: `styles/sheets/character-sheet.css`  
Lines: 206-213  
Selector: `.swse-character-sheet.swse-sheet .sheet-body`  
Specificity: `(0,3,0)`  
Properties: `display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; overflow: hidden`  
Match Type: Exact-match (narrower)  
Classification: ILLEGAL_OR_CONFLICTING (duplicate ownership)  

**Rule 12**  
File: `styles/swse-core.css`  
Lines: 130-136  
Selector: `.swse-sheet .sheet-body`  
Specificity: `(0,2,0)`  
Properties: `flex: 1; background: var(--swse-bg-panel); padding: 0.75rem; overflow: hidden`  
Match Type: Exact-match  
Classification: FRAMEWORK (theme foundation)  

**Rule 13**  
File: `styles/layout/sheet-layout.css`  
Lines: 33-37  
Selector: `.swse-sheet .sheet-body`  
Specificity: `(0,2,0)`  
Properties: `flex: 1; overflow: auto; min-height: 0`  
Match Type: Exact-match  
Classification: FRAMEWORK (overridden by v2-sheet.css)  

#### Node: .tab.active (and .tab)

**Rule 14**  
File: `styles/sheets/v2-sheet.css`  
Lines: 201-209  
Selector: `form.swse-sheet-ui .sheet-body > .tab`  
Specificity: `(0,2,1)`  
Properties: `flex: 1; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; padding-right: 2px`  
Match Type: Exact-match  
Classification: CONTRACT  

**Rule 15**  
File: `styles/sheets/character-sheet.css`  
Lines: 215-221  
Selector: `.swse-character-sheet.swse-sheet .sheet-body > .tab`  
Specificity: `(0,3,1)`  
Properties: `flex: 1 1 auto; min-height: 0; min-width: 0; overflow-y: auto !important; overflow-x: hidden`  
Match Type: Exact-match (narrower)  
Classification: ILLEGAL_OR_CONFLICTING (duplicate ownership, adds !important)  

**Rule 16**  
File: `styles/layout/sheet-layout.css`  
Lines: 300-301  
Selector: `.application.sheet .tab.active`  
Specificity: `(0,2,1)`  
Properties: `display: block`  
Match Type: Broader-match  
Classification: FRAMEWORK (overridden by v2-sheet.css flex)  

**Rule 17**  
File: `styles/sheets/v2-sheet.css`  
Lines: 212-214  
Selector: `form.swse-sheet-ui .sheet-body > .tab:not(.active)`  
Specificity: `(0,2,2)`  
Properties: `display: none`  
Match Type: Exact-match  
Classification: CONTRACT  

**Rule 18**  
File: `styles/sheets/v2-sheet.css`  
Lines: 217-219  
Selector: `form.swse-sheet-ui .sheet-body > .tab:not(.active)` (duplicate)  
Specificity: `(0,2,2)`  
Properties: `display: none`  
Match Type: Exact-match  
Classification: ILLEGAL_OR_CONFLICTING (duplicate rule in same file)  

---

## Section 3 — Ownership Classification

### Summary Count

| Classification | Count | Examples |
|---|---|---|
| CONTRACT | 10 | Root flex chain, overflow rules, tab behavior |
| FRAMEWORK | 4 | Generic baseline from layout/sheet-layout.css, swse-core.css |
| ILLEGAL_OR_CONFLICTING | 4 | Duplicate min-height, conflicting overflow, duplicate selectors |
| CHARACTER_LAYOUT | 0 | (Not in critical chain, see character-sheet.css for internal rules) |

### High-Risk Classifications

**ILLEGAL_OR_CONFLICTING Rules (Ownership Ambiguity):**

1. `.window-content` min-height set in both v2-sheet.css and character-sheet.css
2. `form.swse-character-sheet-form` overflow: hidden (v2) vs. visible (character)
3. `.sheet-body` overflow: hidden in v2-sheet, character-sheet, swse-core, and layout/sheet-layout
4. `.sheet-shell` flex shorthand duplicated and conflicting in same file
5. `.tab` rules duplicated within same file
6. `.tab` rules duplicated across v2-sheet and character-sheet

**Result:** Authority is smeared. Cascading resolves conflicts, but governance is broken.

---

## Section 4 — Ownership Table

| Selector/Node | Intended Role | Allowed Owner File | Allowed Property Categories | Forbidden Property Categories | Current Owners | Status |
|---|---|---|---|---|---|---|
| `.window-content` | Frame boundary flex constraint | `v2-sheet.css` | display, flex, min-height, overflow | (none, exclusive owner) | v2-sheet, character-sheet | DUPLICATED |
| `.swse-character-sheet-wrapper` | Transparent pass-through | `v2-sheet.css` | display | (none, exclusive owner) | character-sheet | CONFLICTING (wrapper defined outside contract owner) |
| `form.swse-character-sheet-form` | Primary flex column | `v2-sheet.css` | display, flex, min-height, overflow | (none, exclusive owner) | v2-sheet, character-sheet | CONFLICTING (overflow property contradicts) |
| `.sheet-shell` | Secondary flex column | `v2-sheet.css` | display, flex, min-height | (none, exclusive owner) | v2-sheet (duplicated) | DUPLICATED |
| `.sheet-body` | Tab container, no scroll | `v2-sheet.css` | display, flex, min-height, overflow | (none, exclusive owner) | v2-sheet, character-sheet, swse-core, layout/sheet-layout | DUPLICATED & CONFLICTING |
| `.sheet-body > .tab` | Tab base (flex sizing) | `v2-sheet.css` | display, flex, min-height, overflow-y, overflow-x | (none, exclusive owner) | v2-sheet, character-sheet | DUPLICATED |
| `.sheet-body > .tab.active` | Sole scroll owner | `v2-sheet.css` | (subset: overflow-y) | (none, exclusive owner) | v2-sheet, character-sheet | DUPLICATED (character adds !important) |
| `.sheet-body > .tab:not(.active)` | Hidden tab | `v2-sheet.css` | display | (none, exclusive owner) | v2-sheet (duplicated in same file) | DUPLICATED |

---

## Section 5 — Conflict Ledger

### Conflict 01: Form Overflow Authority

**Node:** `form.swse-character-sheet-form`  
**Files Involved:**
- `styles/sheets/v2-sheet.css` (line 35)
- `styles/sheets/character-sheet.css` (line 194)

**Conflicting Properties:**
- v2-sheet.css: `overflow: hidden`
- character-sheet.css: `overflow: visible`

**Actual Winner:**
- character-sheet.css (narrower selector: `.swse-character-sheet.swse-sheet form.swse-character-sheet-form`)

**Why This Is Dangerous:**
- Contradictory authority on a root-chain node
- Makes scroll debugging ambiguous—form is not actually a scroll owner, but declarations are contradictory
- If cascade order changes or selector specificity is refactored, the wrong rule could win
- Violates single-authority principle for critical layout contracts

**Severity:** P1 Governance Risk

---

### Conflict 02: Sheet-Body Overflow Quadruple Definition

**Node:** `.sheet-body`  
**Files Involved:**
- `styles/sheets/v2-sheet.css` (line 197)
- `styles/sheets/character-sheet.css` (line 212)
- `styles/swse-core.css` (line 135)
- `styles/layout/sheet-layout.css` (line 35)

**Conflicting Properties:**
- v2-sheet.css: `overflow: hidden` ✓
- character-sheet.css: `overflow: hidden` ✓
- swse-core.css: `overflow: hidden` ✓
- layout/sheet-layout.css: `overflow: auto` ✗

**Actual Winner:**
- `overflow: hidden` (v2-sheet.css loads after layout/sheet-layout.css)

**Why This Is Dangerous:**
- Excessive redundancy hides ownership boundaries
- If layout/sheet-layout.css cascade order changes, contract fails
- No single clear authority—looks like a committee decision, not a contract
- Makes maintenance impossible—which one is the source of truth?

**Severity:** P2 Governance Risk (functionally safe, but ownership is opaque)

---

### Conflict 03: Window-Content Min-Height Duplication

**Node:** `.window-content`  
**Files Involved:**
- `styles/sheets/v2-sheet.css` (line 16)
- `styles/sheets/character-sheet.css` (line 163)

**Conflicting Properties:**
- Both: `min-height: 0 !important`

**Actual Winner:**
- Doesn't matter—both declare same value

**Why This Is Dangerous:**
- Duplicate rule masks ownership confusion
- If one is later removed for "cleanup," the other is forgotten
- Looks defensive, but actually obfuscates contract

**Severity:** P3 Governance Risk (functionally safe, but violates DRY)

---

### Conflict 04: Sheet-Shell Flex Shorthand Conflict

**Node:** `.sheet-shell`  
**Files Involved:**
- `styles/sheets/v2-sheet.css` (lines 985 and 993 in same file)

**Conflicting Properties:**
- Line 985: `flex: 1 1 auto`
- Line 993: `flex: 1`

**Actual Winner:**
- Line 993 (cascades later)

**Why This Is Dangerous:**
- Duplicate selectors in same file
- No comment explaining why
- Makes code review impossible
- If either line is removed, behavior may silently change

**Severity:** P2 Governance Risk (same-file conflicts should never exist)

---

### Conflict 05: Tab Active Display Authority

**Node:** `.sheet-body > .tab.active`  
**Files Involved:**
- `styles/sheets/v2-sheet.css` (line 204: `display: flex`)
- `styles/layout/sheet-layout.css` (line 300: `display: block`)
- `styles/sheets/character-sheet.css` (line 219: `overflow-y: auto !important` override)

**Conflicting Properties:**
- layout/sheet-layout.css: `display: block` (Foundry baseline)
- v2-sheet.css: `display: flex` (character override)

**Actual Winner:**
- v2-sheet.css `display: flex` (more specific selector)

**Why This Is Dangerous:**
- Character sheet overrides Foundry baseline without comment
- If character-sheet-specific selectors are relaxed, Foundry baseline regresses to `display: block`
- Hides the override decision from maintainers

**Severity:** P2 Governance Risk (functional, but hidden contract override)

---

## Section 6 — Proposed Ownership Contract

### Target Authority Structure for Phase 1

Based on audit findings and repo evidence, the ownership target is:

#### `styles/sheets/v2-sheet.css` → Contract Owner

**Owns (exclusive authority):**
- `.window-content` flex safety for the sheet
- `form.swse-character-sheet-form` flex chain entry point
- `.sheet-shell` secondary flex container
- `.sheet-body` tab container and scroll constraint
- `.sheet-body > .tab` flex sizing and scroll owner definition
- `.sheet-body > .tab.active` active tab scroll behavior
- `.sheet-body > .tab:not(.active)` inactive tab hiding
- All contract-critical properties: `display`, `flex`, `min-height`, `overflow`

**Reasoning:**
- This file already contains the authoritative flex chain definition
- Already the most specific for most critical rules
- Cleanest single source of truth for root-chain layout

#### `styles/sheets/character-sheet.css` → Component Layout Owner

**Owns (exclusive authority):**
- Character-sheet header layout
- Skills grid layout
- HP/health bar layout
- Combat stats panel layout
- Gear rows and equipment layout
- Notes and biography layout
- Internal tab section arrangements (NOT root-chain behavior)

**Does NOT own:**
- `.window-content` properties
- `.swse-character-sheet-wrapper` properties
- `form.swse-character-sheet-form` root-chain properties (display, flex, overflow, min-height)
- `.sheet-body` root-chain properties
- `.sheet-body > .tab` scroll behavior or display contract

**Reasoning:**
- Component styles should not reach up to root chain
- Prevents cascading layout breaks from internal changes
- Keeps character-specific logic isolated

#### `styles/ui/character-sheet-overflow-contract.css` → Inner Guardrail Owner

**Owns (exclusive authority):**
- Anti-scroll rules for nested panels (prevent illegal inner scrollers)
- Restrictions on panel/container/body classes inside tabs
- Local overflow protection for content areas

**Does NOT own:**
- Root-chain flex definitions
- Root-chain min-height enforcement
- Tab-level display or scroll behavior

**Reasoning:**
- This file's purpose is to prevent inner panels from breaking the contract
- Should be defensive only, never redefine the contract itself

#### `styles/swse-core.css` → Theme Foundation (Non-Authoritative)

**Owns (non-binding defaults only):**
- Visual theme colors, backgrounds
- Font and typography defaults
- Shared spacing and padding conventions
- Generic .swse-sheet styling that is not character-specific

**Does NOT own:**
- Any root-chain property that affects layout
- Any property that defines character-sheet scroll behavior
- Anything that conflicts with character-sheet contract

**Reasoning:**
- Core file is a generic baseline, not the authority for character-sheet specifics
- Character-sheet-specific rules should always override core

#### `styles/layout/sheet-layout.css` → Foundry Generic Baseline (Non-Authoritative)

**Owns (non-binding Foundry defaults only):**
- Generic `.application.sheet` tab visibility baseline
- Generic tab layout conventions
- Foundry AppV2 structural defaults

**Does NOT own:**
- Character-sheet-specific root-chain behavior
- Character-sheet scroll ownership
- Any rule that should be overridden by v2-sheet.css

**Reasoning:**
- This file is a Foundry global, not character-sheet-specific
- Character sheet CSS should be allowed to override it
- If character sheet rules are removed, Foundry baseline should not become authoritative for character-specific behavior

---

## Section 7 — Selector/Property Protection List

### Protected Selectors (Critical Chain Nodes)

Only the designated contract owner (`styles/sheets/v2-sheet.css`) may set **protected properties** on these selectors:

```
.application.swse-character-sheet > .window-content
.application.swse-character-sheet > .window-content > .swse-character-sheet-wrapper
form.swse-character-sheet-form
.sheet-shell
.sheet-body
.sheet-body > .tab
.sheet-body > .tab.active
.sheet-body > .tab:not(.active)
```

### Protected Properties

Changes to these properties on protected selectors outside the contract owner file are governance violations:

```
display
flex
flex-grow
flex-shrink
flex-basis
height
min-height
max-height
overflow
overflow-x
overflow-y
```

### Non-Protected Properties (Allowed Elsewhere)

These properties may be set on protected selectors by other files without violating governance:

```
background
color
padding
margin
border
font-family
font-size
font-weight
text-align
opacity
transform
transition
```

### Governance Violation Examples

**VIOLATION:** `styles/sheets/character-sheet.css` sets `overflow: visible` on `form.swse-character-sheet-form`  
**Reason:** `overflow` is protected; contract owner is v2-sheet.css  
**Status:** Needs removal in Phase 2

**VIOLATION:** `styles/sheets/character-sheet.css` sets `min-height: 0` on `.window-content`  
**Reason:** `min-height` is protected; contract owner is v2-sheet.css  
**Status:** Needs removal in Phase 2

**VIOLATION:** `styles/layout/sheet-layout.css` sets `overflow: auto` on `.sheet-body`  
**Reason:** `overflow` is protected; contract owner is v2-sheet.css  
**Status:** Overridden by v2-sheet.css, but should be removed for clarity

**NOT A VIOLATION:** `styles/sheets/character-sheet.css` sets `background: #1a1a1a` on `.sheet-body`  
**Reason:** `background` is non-protected; component owner may set visual properties  
**Status:** OK

---

## Section 8 — Runtime Assumptions Note

The following assumptions are documented but not proven in Phase 1. Phase 2 testing may reveal deviations:

### Assumption 1: Wrapper is Display: Contents

**Assumption:**  
The `.swse-character-sheet-wrapper` element is intended to be transparent (display: contents) and does not participate in flex constraints.

**Evidence:**  
- Currently defined as `display: contents` in character-sheet.css
- AppV2 template structure requires a wrapper div
- No flex properties defined on it

**Risk if False:**  
If the wrapper should be a flex container instead, the entire chain must be redesigned.

**Phase 2 Action:**  
Contract enforcer should explicitly validate that wrapper is transparent.

---

### Assumption 2: Sheet-Body Must Not Scroll

**Assumption:**  
`.sheet-body` must have `overflow: hidden`. Only `.tab.active` is allowed to scroll vertically.

**Evidence:**  
- Contract enforcer explicitly checks for illegal nested scrollers
- Multiple files defensively set `overflow: hidden` on `.sheet-body`
- Tab scroll owner contract is documented in contract-enforcer.js

**Risk if False:**  
If sheet-body scrolls, scroll is ambiguous—unclear which element the user is actually scrolling.

**Phase 2 Action:**  
Contract enforcer should verify that sheet-body computed overflow is `hidden` at runtime.

---

### Assumption 3: Tab.active Is the Sole Scroll Owner

**Assumption:**  
`.sheet-body > .tab.active` must have `overflow-y: auto` and no other element in the chain should scroll vertically.

**Evidence:**  
- v2-sheet.css explicitly sets `overflow-y: auto` on tabs
- character-sheet.css adds `!important` reinforcement
- Contract enforcer scans for multiple scroll owners and reports violations

**Risk if False:**  
If multiple elements can scroll, scroll behavior is unpredictable and layout debugging is impossible.

**Phase 2 Action:**  
Contract enforcer should verify that exactly one element has `overflow-y: auto` or `overflow: auto`.

---

### Assumption 4: AppV2 Controls Outer Frame

**Assumption:**  
ApplicationV2 provides the outer `.application.swse-character-sheet` window container and controls its height (default 950px). The sheet CSS does not and should not resize this window.

**Evidence:**  
- character-sheet.js defines `height: 950` in defaultOptions
- ApplicationV2 is a Foundry core class, not character-sheet-specific

**Risk if False:**  
If the sheet CSS tries to control outer window size, it may conflict with Foundry's window management.

**Phase 2 Action:**  
No action needed. This is framework behavior, not sheet contract.

---

### Assumption 5: Min-Height: 0 Is Critical for Flex Shrinking

**Assumption:**  
All flex children in the chain require `min-height: 0` to allow them to shrink below their content height.

**Evidence:**  
- This is a Foundry flexbox contract, not character-sheet-specific
- Multiple files defensively set `min-height: 0` on all flex containers
- Without it, flex items expand to their content size instead of respecting the chain

**Risk if False:**  
If any flex item in the chain is missing `min-height: 0`, it will expand to content size and break the height constraint.

**Phase 2 Action:**  
Contract enforcer should validate that every flex child has `min-height: 0`.

---

## Section 9 — Summary of Findings

### Governance Status: BROKEN

The intended architecture is **correct and sound**. The implementation governance is **not strict enough** to protect the contract.

**Symptoms:**
- Multiple files can rewrite critical properties on the root chain
- Conflicting declarations exist on 5 critical nodes
- No written authority map (until now)
- No automated enforcement mechanism

**Risk Level:**  
**P1 — Code stability risk.** Any change to CSS load order, file paths, or selector specificity could cause cascading layout failure. Regressions are likely.

**Root Cause:**  
Ownership was never explicitly assigned. Multiple files defensively added the "right rules" without agreeing on who was responsible. This created redundancy that masks authority and makes debugging impossible.

**Solution:**  
Assign exclusive ownership of the root chain to v2-sheet.css. Strip duplicate/conflicting rules from other files. Enforce with static audit in CI.

---

## Acceptance Criteria

✅ Phase 1 is complete when:

1. ✅ Every critical-chain node has a complete rule inventory
2. ✅ Every critical rule has an ownership classification
3. ✅ Every meaningful conflict is logged in the conflict ledger
4. ✅ One proposed owner file is assigned for each protected selector/property area
5. ✅ The repo has a written governance map that Phase 2 can implement against
6. ✅ The document serves as the source of truth for CSS governance

---

## Next Steps → Phase 2

**Do not proceed to Phase 2 until Phase 1 document is reviewed and approved.**

Phase 2 will:
1. Consolidate all root-chain layout rules into v2-sheet.css
2. Remove conflicting root-chain declarations from character-sheet.css
3. Narrow character-sheet-overflow-contract.css to inner-panel enforcement only
4. Update contract-enforcer.js to explicitly validate wrapper transparency
5. Add static audit script that fails if non-contract files set protected properties

---

**End Phase 1 Document**
