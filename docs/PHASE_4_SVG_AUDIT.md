# Phase 4: SVG/Layout Contract - Audit Report

## Current SVG Panel Status

### SVG-Backed Panels in PANEL_REGISTRY
From registry definitions, these panels declare `svgBacked: true`:
1. **healthPanel** - HP bar, condition track
2. **defensePanel** - Defense breakdown display
3. **darkSidePanel** - Numbered point track

### Templates Currently Using SVG Structure

| Template | Structure Type | Frame | Content | Overlay | Status |
|----------|---|---|---|---|---|
| hp-condition-panel.hbs | frame + content + overlay | ✓ | ✓ | ✓ | **COMPLETE** |
| defenses-panel.hbs | frame + content + overlay | ✓ | ✓ | - | **COMPLETE** |
| dark-side-panel.hbs | frame + overlay | ✓ | - | ✓ | **INCOMPLETE** |
| armor-summary-panel.hbs | frame + content | ✓ | ✓ | - | **INCOMPLETE** |
| character-record-header.hbs | frame + content | ✓ | ✓ | - | **INCOMPLETE** |
| relationships-panel.hbs | frame + content | ✓ | ✓ | - | **INCOMPLETE** |
| special-combat-actions-panel.hbs | frame + content | ✓ | ✓ | - | **INCOMPLETE** |

### Issues Found

#### 1. Dark Side Panel - Missing Content Wrapper
**Current**: Frame + Overlay without Content layer
```html
<div class="swse-panel__frame"></div>
<div class="swse-panel__overlay">...</div>
```

**Problem**: Content not properly contained in content layer. Legacy code references (`darkSideSegments`) still present.

**Solution**: Wrap header + spectrum in `swse-panel__content`, migrate `darkSideSegments` to use `darkSidePanel.segments`.

#### 2. Dark Side Panel - Raw Context Read
**Line 29**: `{{#each darkSideSegments as |segment|}}`
**Problem**: Reading from raw context instead of `darkSidePanel.segments`
**Status**: Regression from Phase 2/3 - needs fixing

#### 3. Inconsistent Structure Pattern
**Current**:
- Some panels have content wrapper, some don't
- Some have overlay, some don't
- Naming varies (overlay vs frame vs content)

**Solution**: Standardize to universal pattern:
```html
<section class="swse-panel svg-framed">
  <!-- 1. Frame layer: SVG/graphics -->
  <div class="swse-panel__frame" aria-hidden="true"></div>

  <!-- 2. Content layer: normal flow -->
  <div class="swse-panel__content">
    [header, main content, text, inputs]
  </div>

  <!-- 3. Overlay layer: positioned elements -->
  <div class="swse-panel__overlay">
    [absolutely positioned controls, indicators]
  </div>
</section>
```

#### 4. No CSS Variables for Geometry
**Current**: Hard-coded values for spacing, sizes, aspect ratios
**Missing**: CSS custom properties for:
- Panel width/height
- Safe area padding
- Content area margins
- Overlay element sizing
- Frame aspect ratio

#### 5. No Layout Debug Tooling
**Current**: No visual aids for developers
**Missing**:
- Debug grid overlay
- Safe area indicators
- Positioning guides
- Boundary visualization

---

## Audit Summary

**SVG-Backed Panels**: 3 (healthPanel, defensePanel, darkSidePanel)
**Templates with SVG Structure**: 7
**Panels with Complete frame/content/overlay**: 1 (healthPanel only)
**Panels with Incomplete Structure**: 6
**Raw Context Reads (Regression)**: 1 (darkSidePanel)

---

## Phase 4 Action Items

### Phase 4.1: Fix Regressions & Audit ✅
- [x] Identify all SVG-backed panels
- [x] Document current structure patterns
- [x] Find template regressions
- [ ] Create universal structure spec

### Phase 4.2: Implement Universal Structure
- [ ] Fix dark-side-panel.hbs (migrate darkSideSegments, add content layer)
- [ ] Standardize all panels to frame/content/overlay
- [ ] Add overlay layer to panels that need positioned elements
- [ ] Update post-render assertions for structure validation

### Phase 4.3: Add Explicit Geometry
- [ ] Create CSS variables file (geometry.css)
- [ ] Document safe areas and margins
- [ ] Apply variables to all SVG panels
- [ ] Ensure aspect ratio consistency

### Phase 4.4: Layout Debug Tooling
- [ ] Create debug mode toggle (CONFIG.SWSE.layoutDebug)
- [ ] Implement grid overlay
- [ ] Add safe area indicators
- [ ] Add boundary visualization
- [ ] Create developer guide

### Phase 4.5: Critical DOM Assertions
- [ ] Update PostRenderAssertions for SVG structure
- [ ] Verify frame/content/overlay presence
- [ ] Check for properly positioned overlay elements
- [ ] Validate geometry constraints

---

## Regression Issue: Dark Side Panel

### Current Code (Line 29):
```handlebars
{{#each darkSideSegments as |segment|}}
```

### Should Be:
```handlebars
{{#each darkSidePanel.segments as |segment|}}
```

### Impact:
- Using raw `derived` data instead of panel context
- Violates Phase 2/3 contract
- Needs immediate fix
