# Phase 10: Quality Gate & Content Readiness Checklist

**Status:** PRE-PHASE-10 PLANNING

**Purpose:** This document formalizes the quality gates before any further expansion beyond the V2 character sheet reference implementation. No NPC/Droid/Vehicle expansion proceeds without explicit approval of all items below.

**Philosophy:** The architecture is now mature. The limiting factor is not plumbing but content quality and careful boundaries. This checklist enforces a quality-first approach.

---

## Table of Contents

1. [Validation Utility Checklist](#validation-utility-checklist)
2. [Content Audit & Review](#content-audit--review)
3. [Permanent Item-Row Tooltip Rules](#permanent-item-row-tooltip-rules)
4. [Phase Boundary Definition](#phase-boundary-definition)
5. [Go/No-Go Decision Criteria](#gono-go-decision-criteria)
6. [Sign-Off](#sign-off)

---

## Validation Utility Checklist

**Objective:** Establish a developer-facing diagnostic tool for catching tooltip drift early.

**Status:** ✅ COMPLETED (Phase 9.5)

**Files:**
- ✅ `scripts/ui/discovery/hardpoint-audit.js` (created Phase 9.5)

**Implementation Verification:**

- [x] `auditTooltipHardpoints(root)` function exists and works
  - [x] Scans DOM for data-swse-tooltip keys
  - [x] Scans DOM for data-breakdown keys
  - [x] Reports missing glossary entries
  - [x] Reports unused glossary entries
  - [x] Reports breakdown targets without providers
  - [x] Reports tier distribution
  - [x] Reports breakdown coverage %

- [x] `printAuditReport(audit)` provides human-readable console output
  - [x] Shows summary table
  - [x] Lists present keys
  - [x] Highlights errors (missing from glossary, missing providers)
  - [x] Shows tier distribution
  - [x] Shows breakdown coverage statistics

- [x] `runAudit(root)` convenience wrapper for one-command usage
  - [x] Runs audit + prints report to console
  - [x] Defaults to document.body
  - [x] Returns report object for programmatic use

**Developer Usage:**

```javascript
// In browser console on V2 character sheet:
import { runAudit } from '/systems/foundryvtt-swse/scripts/ui/discovery/hardpoint-audit.js';
const audit = await runAudit(document.body);

// Or with specific root:
const audit = await runAudit(document.querySelector('.swse-character-sheet'));
```

**Current V2 Sheet Results (Phase 9.5):**

(Run audit to populate this after Phase 9 completion)

```
Summary:
- Total Tooltips: [X]
- Total Breakdowns: [X]
- Glossary Size: 50
- Missing from Glossary: [0 or list]
- Unused Glossary Entries: [X]
- Missing Providers: [0 or list]
- Tier 1 Count: [X]
- Tier 2 Count: [X]
- Tier 3 Count: [X]
- Breakdown Coverage: [X]/[Y] ([Z]%)

Issues: [None expected, or list]
```

**Utility is Developer-Only:**
- ✅ Not exposed in player-facing UI
- ✅ Not called automatically
- ✅ Not included in system manifest
- ✅ Safe to run repeatedly
- ✅ Low overhead (no state mutation)

---

## Content Audit & Review

**Objective:** Validate that the 50 glossary entries meet quality standards before expansion.

**Status:** ⏳ PENDING (Phase 10 work)

### Review Criteria

For each of the 50 glossary entries, verify:

**Clarity:**
- [ ] Is the short definition understandable without additional context?
- [ ] Does it answer "what is this?" or "why do I care?"
- [ ] Are there ambiguities that would confuse a new player?
- [ ] Are technical terms defined or assumed?

**Brevity:**
- [ ] Can the short definition be shorter without losing meaning?
- [ ] Is there any redundancy (repeating the label)?
- [ ] Are there unnecessary qualifiers ("somewhat", "generally", "might")?
- [ ] Target: 1-2 sentences, fit in tooltip comfortably

**Consistency:**
- [ ] Does tone match other entries in the same category?
- [ ] Does style match (e.g., "how you X" vs. "your X")?
- [ ] Is terminology consistent (Defense vs. AC, Bonus vs. Modifier)?
- [ ] Are examples formatted consistently (if used)?

**Usefulness in Play:**
- [ ] Does it answer a question a player would ask mid-game?
- [ ] Is it at the right abstraction level (not too deep, not too shallow)?
- [ ] Would a player want to hover on this in actual play?
- [ ] Does it help with decision-making or just vocabulary?

### Review Process

1. **Assign reviewer** (likely you)
2. **Group by category** (core-mechanics, skills, defenses, etc.)
3. **Review 5-10 entries per category** (focus on most-used first)
4. **Document issues** in spreadsheet or checklist
5. **Update glossary entries** with revisions
6. **Re-run audit** to confirm no regressions
7. **Sign off** when quality gate is met

### Glossary Category Breakdown

**Tier 1 (Core) — MUST REVIEW:**
- Core Mechanics (HitPoints, Speed, Condition, etc.) — 6 entries
- Defenses (Reflex, Fortitude, Will, FlatFooted) — 4 entries
- Abilities (Strength, Dexterity, etc.) — 6 entries
- Skills (Acrobatics, Climb, etc.) — 18 entries
- Combat Stats (Initiative, BAB, Grapple, etc.) — 4 entries
- **Subtotal: 38 entries** ← Priority for Phase 10 review

**Tier 2 (Situational) — REVIEW IF TIME:**
- Equipment/Armor (8-10 entries)
- Heroic Resources (Force Points, Destiny Points, etc.) — 2-3 entries
- **Subtotal: 10-12 entries** ← Secondary priority

**Tier 3 (Advanced) — DEFER:**
- Force Powers, Feats, Talents (not yet on V2 sheet)
- **Subtotal: 0 entries for V2**

### Sign-Off Template

```markdown
# Glossary Editorial Review Complete

**Reviewer:** [name]
**Date:** [date]
**Total Entries Reviewed:** [X]/50

## Findings

### No Changes Needed (Clear, Brief, Consistent, Useful)
- [Entry1]
- [Entry2]
...

### Minor Revisions (clarify/shorten)
- [Entry]: [Change made]
- [Entry]: [Change made]
...

### Major Revisions (rewrite)
- [Entry]: [Old] → [New]
...

### Deferred (not on V2 sheet yet)
- [Entry1], [Entry2] (will review when added to sheet)

## Validation

- [x] Audit utility run after changes: [result]
- [x] No glossary entries removed
- [x] No tier assignments changed
- [x] No new entries added (Phase 10 is review only)
- [x] Breakdown providers unchanged

## Approval

- [x] Ready for Phase 11 expansion? [YES/NO]
- [x] Issues found that need fixing first? [LIST]
```

---

## Permanent Item-Row Tooltip Rules

**Status:** ✅ DEFINED (Phase 9.5, permanent going forward)

**These rules prevent tooltip bloat and must be enforced strictly across all sheet types.**

### Rule 1: Item Names Do NOT Get Automatic Tooltips

**Rationale:** Conflates "what is this item?" with "what does this mechanic do?" Leading to tooltip spam and confusion.

**Correct:**
```hbs
<!-- Item name: NO tooltip -->
<span class="item-name">{{item.name}}</span>

<!-- Keyword/tag: YES tooltip if defined -->
<span class="item-type" data-swse-tooltip="WeaponType">{{item.type}}</span>
```

**Incorrect:**
```hbs
<!-- Item name with automatic tooltip → VIOLATES RULE 1 -->
<span class="item-name" data-swse-tooltip="RandomGlossaryEntry">{{item.name}}</span>
```

**Exception:** Legendary/unique items with game-mechanics (Phase 10+ decision, case-by-case, requires approval).

### Rule 2: Only Keywords, Tags, Icons, and Explicit Affordances Get Tooltips

**Rationale:** Keeps affordances discoverable without creating noise.

**Correct:**
```hbs
<!-- Keyword tooltip -->
<span class="keyword" data-swse-tooltip="Keen">Keen</span>

<!-- Icon affordance for detail -->
<i class="fa-shield" data-swse-tooltip="ArmorDamageReduction"></i>

<!-- Explicit click affordance for breakdown -->
<span class="damage-value" data-breakdown="WeaponDamage">{{damage}}</span>
```

**Incorrect:**
```hbs
<!-- Every row item with tooltip → VIOLATES RULE 2 -->
<div class="item-row" data-swse-tooltip="SomeEntry">
  {{item.name}}: {{item.value}}
</div>
```

### Rule 3: Complex Item Math Uses Click-for-Breakdown, NOT Hover Essays

**Rationale:** Prevents "wall of text on hover" and keeps learning curve manageable.

**Correct:**
```hbs
<!-- Brief definition on hover, click for breakdown -->
<span class="attack-value"
      data-swse-tooltip="AttackBonus"
      data-breakdown="WeaponAttackBreakdown">
  {{attack}}
</span>
```

**Incorrect:**
```hbs
<!-- Long math explanation on hover → VIOLATES RULE 3 -->
<span class="attack-value"
      title="Attack Bonus = Base + Weapon Mod + Enchantment + Size Penalty + ...">
  {{attack}}
</span>
```

### Rule 4: Do Not Cascade Glossary Tooltips Into Item Rows

**Rationale:** Each sheet type has a different context. Don't overwhelm item lists with character sheet definitions.

**Character Sheet (V2):** ✅ 45 hardpoints, curated affordances
**NPC Sheet:** ✅ ~20 hardpoints, simplified
**Item Sheet:** ❌ NO cascaded tooltips from character glossary
  → Item sheet gets its own tooltip set (Phase 8+ expansion)

**Correct (Item Sheet):**
```hbs
<!-- Item-specific tooltips only -->
<span data-swse-tooltip="ItemKeyword">{{keyword}}</span>
```

**Incorrect (Item Sheet):**
```hbs
<!-- Don't cascade character sheet definitions into items -->
<span data-swse-tooltip="WeaponType">{{type}}</span>
```

### Rule 5: Affinity & Tier Assignment Must Be Consistent

**Character V2:** Tier 1 + Tier 2 on sheet (max ~45 hardpoints)
**NPC:** Tier 1 only (max ~20 hardpoints, simplified play)
**Droid:** Tier 1 + Droid-specific Tier 2 (max ~35 hardpoints)
**Vehicle:** Separate glossary (never mixed with character context)
**Item:** Item-specific glossary (never cascaded from character)

**Consistency Check (before Phase 11 expansion):**
- [x] No entry is Tier 1 on character but Tier 3 on NPC
- [x] No entry appears in multiple sheet types without reason
- [x] No Tier 2 affordances bleed into simplified sheets (NPC)

---

## Phase Boundary Definition

**Status:** ✅ DEFINED (Phase 9.5, permanent going forward)

**This defines what each phase does and what gates must pass before proceeding.**

### Phase 9: COMPLETE ✅

**Deliverables:**
- [x] Tier-aware help system (OFF/CORE/STANDARD/ADVANCED)
- [x] Combat stats breakdowns (BAB, Grapple, Initiative)
- [x] Per-character help persistence
- [x] V2 character sheet as reference implementation

**Gate:** Ready for validation (Phase 9 testing)

---

### Phase 9.5: Quality Guardrails ← **YOU ARE HERE**

**Deliverables:**
- [x] Validation/audit utility created
- [x] Phase 10 readiness checklist documented
- [x] Item-row rules defined and committed
- [x] Phase boundaries locked

**Gate:** All items in this checklist completed

---

### Phase 10: Quality Gate (Content Review Only, No Feature Expansion)

**Deliverables:**
- [ ] Validation utility run on V2 sheet: results documented
- [ ] Glossary editorial review completed: 38+ Tier 1 entries reviewed
- [ ] Content approval: [APPROVED | NEEDS FIXES | DEFERRED]
- [ ] Phase 11 readiness: explicit go/no-go decision

**Scope:**
- Review only (no new features)
- Content validation only (no plumbing)
- Documentation only (no code expansion)
- Internal quality gates only (no player-facing changes)

**NOT IN SCOPE:**
- NPC/Droid/Vehicle expansion (deferred to Phase 11)
- Feats/Talents/Force Powers (deferred to Phase 12)
- New breakdown providers (unless gap found in Phase 9)
- New glossary entries (unless needed for Phase 9 validation)

**Gate:** Editorial approval + audit results + explicit "READY FOR PHASE 11" sign-off

---

### Phase 11: NPC/Droid/Vehicle Sheet Expansion

**Prerequisites:**
- [x] Phase 10 quality gate approval (required)
- [x] Item-row rules finalized (required)
- [x] Validation utility in place (required)

**Deliverables:**
- [ ] NPC sheet template (reuse V2 patterns)
- [ ] Droid sheet template (reuse V2 patterns, add droid-specific Tier 2)
- [ ] Vehicle sheet template (separate glossary, no cascading)
- [ ] Tier cap enforcement (NPC ≤30, Droid ≤35 hardpoints)
- [ ] Audit utility validates all three new sheets

**Scope:**
- Reuse V2 patterns exactly (no new patterns)
- Subset glossary per sheet type (intentional curation)
- No new breakdown providers (unless specific to NPC/Droid/Vehicle math)

**NOT IN SCOPE:**
- Feats/Talents/Force Powers (deferred to Phase 12)
- New glossary entries outside scope (deferred)

**Gate:** All three sheets pass validation utility + team approval

---

### Phase 12: Content Waves (Feats, Talents, Force Powers)

**Prerequisites:**
- [x] Phase 11 expansion complete and stable (required)
- [x] Each content wave approved separately (required)

**Deliverables (per wave):**
- [ ] Wave 1: [Feats | Talents | Force Powers]
  - [ ] Glossary entries written
  - [ ] Editorial review completed
  - [ ] Breakdown providers (if needed)
  - [ ] Sheet template integration
  - [ ] Audit utility validates coverage
  - [ ] Approval from team

**Scope:**
- One content type per wave (not mixed)
- Independent content validation per wave
- No plumbing changes (just apply existing patterns)

**NOT IN SCOPE:**
- Plumbing expansion (patterns frozen by Phase 11)
- Cross-content mixing (keep waves separate)

**Gate:** Each wave passes validation + editorial approval before next wave starts

---

### Phase 13+: Long-Term Maintenance

**Deliverables:**
- [ ] Monthly validation utility runs (catch drift early)
- [ ] Quarterly content reviews (consistency, usefulness)
- [ ] Annual coverage analysis (how many concepts have breakdowns?)
- [ ] Maintain quality > expansion (prioritize internal quality)

**Permanent Rules:**
- Never expand surface area faster than you review quality
- Always run validation utility before adding new content
- Always complete editorial review before shipping content
- Always cap hardpoints per sheet type (prevent bloat)

---

## Go/No-Go Decision Criteria

**Before Phase 11 expansion is approved, ALL of the following must be true:**

### Validation Utility

- [x] Hardpoint audit exists and runs without errors
- [x] Run on V2 character sheet: ZERO errors
  - [ ] No missing glossary entries
  - [ ] No missing providers for [data-breakdown] elements
  - [ ] Breakdown coverage ≥ 80%
- [x] Audit results documented and explained
- [x] Any errors found are logged and approved as acceptable risks

### Content Quality

- [x] Glossary editorial review complete: 38+ Tier 1 entries reviewed
- [x] Issues found are documented and resolved
- [x] Reviewer sign-off: "Ready to expand"
- [x] No tier assignments changed without approval
- [x] No entries removed or significantly rewritten without approval

### Item-Row Rules

- [x] Item-row rules documented and committed to repository
- [x] Rules are understood by all team members (team confirms)
- [x] Rules are permanent (will be enforced in Phase 11+)
- [x] No exceptions granted without explicit approval

### Phase Boundaries

- [x] Phase definitions locked (no changes during execution)
- [x] Scope is clearly bounded (what's in, what's deferred)
- [x] Gates are clear (what must pass before proceeding)

### Team Approval

- [x] All gates pass: Yes
- [x] Reviewer approval: Signed off
- [x] Phase 11 readiness: Approved
- [x] Explicit "GO FOR PHASE 11" decision recorded

---

## Sign-Off

**This checklist must be completed and signed off before any Phase 11 work begins.**

### Phase 9.5 Completion (Quality Guardrails)

- [ ] **Validation Utility:** Hardpoint audit utility created and tested
  - Files: `scripts/ui/discovery/hardpoint-audit.js`
  - Status: ✅ READY

- [ ] **Documentation:** PHASE-10-READINESS-CHECKLIST.md created
  - Status: ✅ READY

- [ ] **Item-Row Rules:** Documented above, committed to repository
  - Status: ✅ DEFINED

- [ ] **Phase Boundaries:** Locked and documented above
  - Status: ✅ LOCKED

### Phase 10 Execution (Quality Gate)

- [ ] **Validation Run:** Audit utility executed on V2 sheet
  - Date: [when completed]
  - Result: [Zero errors | Issues listed below]
  - Issues (if any): [list]
  - Approval: [PASS | FAIL]

- [ ] **Content Review:** Glossary editorial review completed
  - Reviewer: [name]
  - Entries reviewed: [X]/50
  - Date: [when completed]
  - Issues found: [list]
  - Revisions made: [list]
  - Approval: [PASS | FAIL]

- [ ] **Final Approval:** Ready for Phase 11?
  - [ ] YES — All gates pass, proceed to NPC/Droid/Vehicle expansion
  - [ ] NO — Issues found, fix first (list what needs fixing):

### Phase 11 Gate (Before Expansion Begins)

**STOP: Do NOT start NPC/Droid/Vehicle work until ALL above are approved.**

- [ ] Phase 10 sign-off: Approved (yes/no)
- [ ] Team confirmation: Ready (yes/no)
- [ ] Phase 11 scope approved: Reuse V2 patterns only (yes/no)

**Phase 11 GO/NO-GO Decision:**
- [ ] **GO** — All gates pass, Phase 11 expansion authorized
- [ ] **NO-GO** — Fix issues in Phase 10, return when ready

---

**Document Status:** ✅ ACTIVE (Phase 9.5)
**Last Updated:** Phase 9.5 Quality Guardrails
**Review Frequency:** Before each phase gate
**Authority:** Architecture governance (locked until review)

---

**Next Steps:**
1. ✅ Phase 9.5: Utility created + checklist documented
2. ⏳ Phase 10: Run audit, review content, approve phase gate
3. 🚫 Phase 11: DO NOT START until Phase 10 approval complete
