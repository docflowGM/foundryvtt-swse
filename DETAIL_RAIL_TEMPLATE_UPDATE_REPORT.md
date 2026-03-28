# Detail Rail Template Update Report

**Date:** 2026-03-28
**Phase:** Option A — Template Updates + Option C — Flow Review & Adjustments
**Status:** IN PROGRESS

## Executive Summary

All 13 detail panel templates are being refactored to consume the normalized detail-rail contract consistently. This ensures:

- ✅ Single source of truth per item type (via detail-rail-normalizer.js)
- ✅ Explicit fallback behavior ("No description available.", "None")
- ✅ Stable section ordering across all types
- ✅ Consistent label language
- ✅ Honest display of text-only prerequisites (no misleading "Met" checkmarks)
- ✅ Mentor prose only where canonical data exists

---

## Current State Analysis

### Templates Overview

| Template | Current Status | Issues | Priority |
|----------|---|---|---|
| species-details.hbs | Mixed (some normalized fields, some old) | Using old field access instead of normalized | HIGH |
| class-details.hbs | Mixed | No description section; mentor logic missing | HIGH |
| background-details.hbs | Clean | Minimal changes needed | MEDIUM |
| attribute-details.hbs | Problematic | Inline guidance instead of normalized mentorProse | HIGH |
| language-details.hbs | Clean | Minimal changes needed | MEDIUM |
| feat-details.hbs | **PROBLEM** | Misleading "Met" checkmark for text-only prereqs | CRITICAL |
| talent-details.hbs | Clean | Minor normalization | MEDIUM |
| force-power-details.hbs | Clean | Minor normalization | MEDIUM |
| force-technique-details.hbs | Clean | Minor normalization | MEDIUM |
| force-secret-details.hbs | Clean | Minor normalization | MEDIUM |
| starship-maneuver-details.hbs | Clean | Minor normalization | MEDIUM |
| empty-state.hbs | N/A | No changes needed | LOW |
| confirm-details.hbs | Unknown | TBD | LOW |

### Critical Issues

**Issue 1: feat-details.hbs (Line 47)**
```handlebars
<span class="prerequisite-status">
  <i class="fa-solid fa-circle-check met-icon"></i> Met
</span>
```
Shows a checkmark claiming prerequisites are "Met", but these are text-only prerequisites with no actual validation. **This must be removed immediately.**

**Issue 2: attribute-details.hbs (Lines 43-60)**
Inline guidance logic instead of using normalized mentorProse:
```handlebars
{{#eq ability "str"}}
  Strength affects melee combat effectiveness...
{{else if (eq ability "dex")}}
  Dexterity improves initiative...
{{/eq}}
```
This should consume normalized.mentorProse and normalized.metadataTags instead.

**Issue 3: species-details.hbs**
Reading from `species.description` and multiple old fields instead of normalized contract.

---

## Template Update Strategy

### Normalized Data Contract Shape

All templates will consume this consistent structure:

```javascript
{
  description,           // Canonical text or null
  prerequisites,         // "None" or text string
  metadataTags,         // Array of labels
  mentorProse,          // Prose only if canonical (null otherwise)
  fallbacks: {
    hasDescription,      // boolean
    hasPrerequisites,    // boolean
    hasMentorProse       // boolean
  },
  sourceNotes,          // { ... } metadata
  mechanics (skills)    // Skill-specific fields
}
```

### Stable Section Ordering

All templates will render sections in this order (where applicable):

1. **Header** — Item name, badges, source
2. **Description** — Canonical prose or "No description available."
3. **Metadata Tags** — Key information (size, speed, category, tier, etc.)
4. **Prerequisites** — Text or "None"; no misleading validation checkmarks
5. **Mentor Thought** — Only if canonical mentorProse exists; omit otherwise
6. **Type-Specific Sections** — Abilities, skills, bonuses, guidance, mechanics
7. **Actions** — Commit, Ask Mentor, etc.

### Fallback Rendering Rules

- **Description:**
  - If `normalized.description`: render it
  - If `!normalized.description`: render "No description available."
  - Use `normalized.fallbacks.hasDescription` to decide rendering

- **Prerequisites:**
  - If `normalized.prerequisites`: render text
  - If `!normalized.prerequisites`: render "None"
  - Use `normalized.fallbacks.hasPrerequisites` to decide rendering
  - **NEVER show validation checkmarks for text-only prerequisites**

- **Mentor Thought:**
  - Render only if `normalized.mentorProse` exists
  - If absent, omit section entirely
  - Use `normalized.fallbacks.hasMentorProse` to decide rendering

- **Metadata Tags:**
  - Render `normalized.metadataTags` array cleanly
  - Omit section if array is empty

---

## Template-by-Template Update Plan

### Priority 1: Critical Issues

#### feat-details.hbs
**Status:** CRITICAL FIX REQUIRED
- **Issue:** Misleading "Met" checkmark for text-only prerequisites (line 47)
- **Fix:** Remove checkmark; show prerequisites as text-only, honestly
- **Change:** Remove lines 45-48 entirely; just render text in a neutral list
- **Details:**
  ```handlebars
  {{!-- Prerequisites (text-only, no validation) --}}
  {{#if normalized.fallbacks.hasPrerequisites}}
    <div class="feat-prerequisites-section">
      <h3>Prerequisites</h3>
      <p class="feat-prerequisites">{{normalized.prerequisites}}</p>
    </div>
  {{/if}}
  ```

#### attribute-details.hbs
**Status:** HIGH PRIORITY
- **Issue:** Inline guidance logic instead of normalized mentorProse
- **Fix:** Replace inline {{#eq}} logic with normalized mentorProse + metadataTags
- **Changes:**
  - Remove inline guidance block (lines 43-60)
  - Add normalized.mentorProse and normalized.metadataTags instead
  - Use "What This Affects" to render metadataTags (ability effects)

#### species-details.hbs
**Status:** HIGH PRIORITY
- **Issue:** Using `species.description` instead of `normalized.description`
- **Fix:** Consume normalized contract fields
- **Changes:**
  - Replace `species.description` with `normalized.description`
  - Use `normalized.fallbacks.hasDescription` for rendering decision
  - Add "No description available." fallback if needed

---

### Priority 2: Clean Templates (Minor Normalization)

#### class-details.hbs
- **Changes:**
  - Add description section if canonical description exists
  - Render `normalized.description` if available
  - Update "Your Guide" section to be consistent with other mentor prose handling

#### background-details.hbs
- **Changes:** Minimal; template is already clean
  - Ensure using normalized fields where available
  - Keep existing section structure

#### talent-details.hbs
- **Changes:**
  - Use `normalized.description` instead of passed `description`
  - Use `normalized.prerequisites` or "None"
  - Use `normalized.fallbacks` to decide section rendering
  - Keep existing structure

#### force-power-details.hbs, force-technique-details.hbs, force-secret-details.hbs
- **Changes:**
  - Use normalized fields consistently
  - Ensure prerequisites show honestly (no validation claims)
  - Keep existing structure

#### language-details.hbs
- **Changes:** Minimal normalization
  - Use `normalized.description` if available

#### starship-maneuver-details.hbs
- **Changes:**
  - Use `normalized.description`
  - Keep existing structure

---

## Skills Detail Panel

**Current State:** No skill-details.hbs template exists; skills are informational reference only.

**Decision:**
- Skills work surface (skills-work-surface.hbs) currently shows a generic right-panel guidance.
- If we need individual skill detail views in the future, create skill-details.hbs with:
  - Skill name + default ability icon
  - Description (from normalized.description/skill-short-descriptions.json)
  - Metadata tags (ability, training requirement, armor check penalty, other uses)
  - NO prerequisites, NO mentor prose (skills are informational)
  - Mechanics section displaying trained-only label, ACP label, other uses list

**For now:** Skills template work deferred pending flow testing. If users click on individual skills in work surface and need a detail view, we'll create it then.

---

## Template Updates Log

### ✅ COMPLETED

- (None yet)

### 🔄 IN PROGRESS

- feat-details.hbs (critical fix for "Met" checkmark)
- attribute-details.hbs (remove inline guidance)
- species-details.hbs (use normalized fields)

### ⏳ PENDING

- class-details.hbs
- background-details.hbs
- language-details.hbs
- talent-details.hbs
- force-power-details.hbs
- force-technique-details.hbs
- force-secret-details.hbs
- starship-maneuver-details.hbs

---

## Verification Checklist

After all templates are updated, verify:

- [ ] All templates read from normalized context, not raw item fields
- [ ] Explicit fallback text appears correctly ("No description available.", "None")
- [ ] No empty headers or dead whitespace
- [ ] Section ordering is stable across all types
- [ ] Mentor prose only appears where canonical
- [ ] Text-only prerequisites show honestly (no "Met" checkmarks)
- [ ] Skills render correctly as mechanics-oriented panels
- [ ] Ask Mentor preserved where expected
- [ ] All color/spacing correct
- [ ] Real flow testing confirms updates work end-to-end

---

## Related Files

- `/scripts/apps/progression-framework/detail-rail-normalizer.js` — Single source of truth
- `/scripts/apps/progression-framework/skills-mechanics-resolver.js` — Skill mechanics centralization
- `/data/skill-short-descriptions.json` — Canonical skill descriptions
- All step files — Already calling normalizeDetailPanelData()
- Template directory — `/templates/apps/progression-framework/details-panel/`

---

## Notes

- Do not fabricate missing data
- Use explicit fallback messaging
- Preserve honesty over prettiness
- Ask Mentor affordance preserved where supported
- No misleading validation indicators for text-only prerequisites
