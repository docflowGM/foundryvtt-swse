# SVG-BACKED PARTIAL STANDARD

**How to Design and Implement SVG Art-Backed Panels and Subpartials**

---

## QUICK REFERENCE

SVG-backed panels use art (SVG images) as the primary visual layer, with interactive controls socketed into declared anchor points.

**Pattern:**
```
SVG File (frame layer - non-interactive art)
├─ Content Layer (interactive content in safe area)
└─ Overlay Layer (controls socketed at anchors)
```

**Context Contract:**
```javascript
svgPanel = {
  imagePath: 'path/to/art.svg',
  dimensions: {width: 300, height: 400},
  safeArea: {x: 50, y: 50, width: 200, height: 300},
  anchors: {
    'anchor-name': {x: 10, y: 10, size: {width: 30, height: 30}}
  },
  layers: {...}
}
```

---

## SVG PANEL DESIGN PHILOSOPHY

SVG-backed panels differ from standard panels:

| Aspect | Standard Panel | SVG-Backed Panel |
|--------|---|---|
| **Visual Layer** | HTML/CSS/Grid | SVG Art File |
| **Layout System** | CSS Flexbox/Grid | SVG Coordinate Space |
| **Control Placement** | Flow/Positioning | Anchor Points |
| **Safe Area** | Not needed | Required (avoid art hotspots) |
| **Responsive** | Yes (CSS media queries) | Limited (SVG ratio-based) |
| **Use Cases** | Forms, lists, grids | Character portraits, vehicle HUDs, droid visualizers |

---

## PART 1: DESIGNING THE SVG PANEL LAYER

### Rule SV-1.1: Frame/Content/Overlay Structure

Every SVG-backed panel uses three explicit layers:

```xml
<svg id="portrait-svg" width="300" height="400" viewBox="0 0 300 400">
  <!-- Layer 1: FRAME (Background art, non-interactive) -->
  <g id="frame">
    <image x="0" y="0" width="300" height="400" href="droid-base.png"/>
    <path class="frame-border" d="..."/>
  </g>

  <!-- Layer 2: CONTENT (Interactive content, constrained to safe area) -->
  <g id="content" clip-path="url(#safe-area-clip)">
    <!-- Health bars, status displays, etc. -->
    <rect class="health-bar" x="50" y="350" width="200" height="20"/>
  </g>

  <!-- Layer 3: OVERLAY (Top-level controls, socketed at anchors) -->
  <g id="overlay">
    <!-- Socketed controls attached at anchor points -->
    <g id="status-badge-anchor" x="280" y="10" width="30" height="30"/>
    <g id="restriction-anchor" x="10" y="10" width="50" height="50"/>
  </g>

  <!-- Clipping path for safe area -->
  <defs>
    <clipPath id="safe-area-clip">
      <rect x="50" y="50" width="200" height="300"/>
    </clipPath>
  </defs>
</svg>
```

**Why three layers?**
- **Frame**: Protects art integrity; can't be overwritten by content
- **Content**: Holds interactive data display (health bars, etc.) within safe area
- **Overlay**: Top-level controls that must appear above all other layers

### Rule SV-1.2: Define Safe Area

Safe area is the region where content won't obscure or conflict with art:

```javascript
// Example: Droid portrait
safeArea = {
  x: 50,           // Left margin from SVG origin
  y: 50,           // Top margin from SVG origin
  width: 200,      // Usable width
  height: 300,     // Usable height
  description: 'Central droid body area, excluding head and arms'
}

// Example: Character portrait
safeArea = {
  x: 75,
  y: 100,
  width: 150,
  height: 250,
  description: 'Character face and torso, safe from background foliage'
}
```

**Safe area rules:**
- Must not overlap important art features
- Should be documented with description of why boundaries chosen
- Used to clip content layers (see clip-path in SVG above)
- Template/builder enforces: no content outside safe area

### Rule SV-1.3: Declare Anchor Points

Anchor points are where socketed controls attach:

```javascript
anchors = {
  'status-badge': {
    x: 280,                              // X position in SVG coords
    y: 10,                               // Y position in SVG coords
    rotation: 0,                         // Rotation in degrees
    size: {width: 30, height: 30},       // Allocated space
    allowedSubpartials: ['droid-status-badge-subpartial'],
    required: true                       // Must have content
  },

  'restriction-display': {
    x: 10,
    y: 390,
    rotation: 0,
    size: {width: 280, height: 10},
    allowedSubpartials: ['restriction-label-subpartial'],
    required: false                      // Optional content
  },

  'vehicle-interior': {
    x: 50,
    y: 50,
    rotation: 0,
    size: {width: 200, height: 300},
    allowedSubpartials: ['vehicle-interior-subpartial'],
    required: false
  }
}
```

**Anchor point rules:**
- **Position (x, y)**: Exact coordinates in SVG space
- **Size**: Fixed width/height; subpartials must fit or be clipped
- **Rotation**: Applied to socketed content (0° = no rotation)
- **Required**: If true, missing content is a contract violation
- **AllowedSubpartials**: List of subpartials allowed at this anchor
- **Description**: Why this anchor exists and what it typically contains

---

## PART 2: BUILDING SVG PANEL CONTEXT

### Rule SV-2.1: Panel Builder Output

SVG panel builder must produce complete context:

```javascript
function buildDroidPortraitPanel(actor) {
  return {
    // SVG metadata
    imagePath: 'modules/foundryvtt-swse/assets/droid-portraits/base.svg',
    dimensions: {width: 300, height: 400},
    safeArea: {
      x: 50,
      y: 50,
      width: 200,
      height: 300,
      description: 'Central droid body, excluding head and arms'
    },

    // Layer configuration
    layers: {
      frame: {opacity: 1.0, zIndex: 1},
      content: {opacity: 1.0, zIndex: 2},
      overlay: {opacity: 0.9, zIndex: 3}
    },

    // Anchor points for socketed controls
    anchors: {
      'status-badge': {
        x: 280,
        y: 10,
        rotation: 0,
        size: {width: 30, height: 30},
        allowedSubpartials: ['droid-status-badge-subpartial'],
        required: true
      },
      'restriction-display': {
        x: 10,
        y: 390,
        rotation: 0,
        size: {width: 280, height: 10},
        allowedSubpartials: ['restriction-label-subpartial'],
        required: false
      }
    },

    // Content for content layer
    statusText: 'Operational',
    healthPercent: 85,

    // Permissions
    canEdit: false,
    canRotate: false
  };
}
```

### Rule SV-2.2: SVG Panel Validator

Validate SVG metadata structure:

```javascript
function validateDroidPortraitPanel(portraitPanel) {
  const errors = [];

  // Required SVG metadata
  if (!portraitPanel.imagePath) {
    errors.push('Missing imagePath');
  }
  if (!portraitPanel.dimensions) {
    errors.push('Missing dimensions');
  }
  if (!portraitPanel.safeArea) {
    errors.push('Missing safeArea definition');
  }

  // Validate dimensions
  if (portraitPanel.dimensions) {
    if (typeof portraitPanel.dimensions.width !== 'number') {
      errors.push('dimensions.width must be number');
    }
    if (typeof portraitPanel.dimensions.height !== 'number') {
      errors.push('dimensions.height must be number');
    }
  }

  // Validate safe area
  if (portraitPanel.safeArea) {
    const {x, y, width, height} = portraitPanel.safeArea;
    if (typeof x !== 'number' || typeof y !== 'number') {
      errors.push('safeArea must have x, y as numbers');
    }
    if (typeof width !== 'number' || typeof height !== 'number') {
      errors.push('safeArea must have width, height as numbers');
    }
    if (width <= 0 || height <= 0) {
      errors.push('safeArea width and height must be positive');
    }
  }

  // Validate anchors
  if (portraitPanel.anchors && typeof portraitPanel.anchors === 'object') {
    for (const [anchorName, anchor] of Object.entries(portraitPanel.anchors)) {
      if (typeof anchor.x !== 'number' || typeof anchor.y !== 'number') {
        errors.push(`Anchor "${anchorName}" missing x/y coordinates`);
      }
      if (!anchor.size) {
        errors.push(`Anchor "${anchorName}" missing size definition`);
      }
    }
  }

  return {valid: errors.length === 0, errors};
}
```

---

## PART 3: SVG PANEL TEMPLATES

### Rule SV-3.1: Template Structure

SVG panel template must render three explicit layers:

```handlebars
<div class="swse-panel--portrait-svg" data-svg-id="droid-portrait">
  <!-- SVG Container -->
  <svg class="svg-art-layer"
       viewBox="0 0 {{dimensions.width}} {{dimensions.height}}"
       width="{{dimensions.width}}"
       height="{{dimensions.height}}"
       data-safe-area="{{safeArea.x}},{{safeArea.y}},{{safeArea.width}},{{safeArea.height}}">

    <!-- LAYER 1: Frame (art) -->
    <g id="frame">
      <image x="0" y="0"
             width="{{dimensions.width}}"
             height="{{dimensions.height}}"
             href="{{imagePath}}" />
    </g>

    <!-- LAYER 2: Content (interactive display within safe area) -->
    <g id="content" class="svg-content-layer">
      <rect class="safe-area-visual" x="{{safeArea.x}}" y="{{safeArea.y}}"
            width="{{safeArea.width}}" height="{{safeArea.height}}"
            style="fill: none; stroke: rgba(0,0,0,0); stroke-width: 1;"/>

      {{#if statusText}}
        <text class="status-text" x="{{safeArea.x}}" y="{{add safeArea.y 20}}">
          {{statusText}}
        </text>
      {{/if}}

      {{#if healthPercent}}
        <rect class="health-bar"
              x="{{safeArea.x}}" y="{{add safeArea.y safeArea.height -30}}"
              width="{{multiply safeArea.width (divide healthPercent 100)}}"
              height="20" />
      {{/if}}
    </g>

    <!-- LAYER 3: Overlay (socketed controls) -->
    <g id="overlay" class="svg-overlay-layer">
      {{#each anchors}}
        <g id="{{@key}}-anchor"
           data-anchor-name="{{@key}}"
           x="{{this.x}}"
           y="{{this.y}}"
           data-size="{{this.size.width}},{{this.size.height}}"
           class="svg-anchor-point">
          <!-- Subpartial will be inserted here -->
        </g>
      {{/each}}
    </g>

  </svg>

  <!-- Socketed Subpartials (rendered outside SVG for positioning) -->
  <div class="svg-socketed-subpartials">
    {{#if anchors.status-badge}}
      <div class="socketed-at-status-badge" style="position: absolute; left: {{anchors.status-badge.x}}px; top: {{anchors.status-badge.y}}px;">
        {{>droid-status-badge-subpartial portraitPanel.statusBadge}}
      </div>
    {{/if}}

    {{#if anchors.restriction-display}}
      <div class="socketed-at-restriction-display" style="position: absolute; left: {{anchors.restriction-display.x}}px; top: {{anchors.restriction-display.y}}px; width: {{anchors.restriction-display.size.width}}px;">
        {{>restriction-label-subpartial portraitPanel.restrictionLabel}}
      </div>
    {{/if}}
  </div>
</div>
```

### Rule SV-3.2: CSS for SVG Panels

```css
/* SVG Panel Container */
.swse-panel--portrait-svg {
  position: relative;
  display: inline-block;
  width: 300px;
  height: 400px;
}

/* SVG Layer Structure */
.svg-art-layer {
  display: block;
  width: 100%;
  height: 100%;
}

#frame {
  /* Frame is always opaque, non-interactive */
}

#content {
  /* Content clipped to safe area */
}

#overlay {
  /* Overlay is top layer */
  pointer-events: none; /* Let clicks pass through to content */
}

/* Anchor Points */
.svg-anchor-point {
  pointer-events: auto;
}

/* Socketed Subpartials (outside SVG) */
.svg-socketed-subpartials {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.socketed-at-status-badge,
.socketed-at-restriction-display {
  position: absolute;
  pointer-events: auto;
}

/* Status Badge Example */
.droid-status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  font-size: 12px;
  color: white;
}
```

---

## PART 4: SVG SOCKETED SUBPARTIALS

### Rule SV-4.1: Subpartial Design for SVG Anchors

A subpartial that sockets into an anchor:
1. Respects anchor size constraints
2. Uses absolute/fixed positioning (not flow)
3. Declares anchor assumptions

Example: `droid-status-badge-subpartial.hbs`

```handlebars
<!--
  SVG Anchor: status-badge
  Expected Size: 30×30px
  Rotation: 0°
  Content: Status icon + optional label
-->
<div class="droid-status-badge" style="width: 30px; height: 30px;">
  <svg viewBox="0 0 30 30" width="30" height="30">
    <!-- Circular background -->
    <circle r="15" cx="15" cy="15" class="status-background {{statusClass}}"/>

    <!-- Status icon (operational, warning, error) -->
    <text x="15" y="15" text-anchor="middle" dominant-baseline="central"
          class="status-icon {{statusClass}}">
      {{icon}}
    </text>
  </svg>
</div>
```

CSS:
```css
.droid-status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.status-background {
  fill: rgba(0, 0, 0, 0.5);
}

.status-background.operational {
  fill: rgba(0, 200, 0, 0.7);
}

.status-background.warning {
  fill: rgba(255, 200, 0, 0.7);
}

.status-background.error {
  fill: rgba(255, 0, 0, 0.7);
}
```

### Rule SV-4.2: Anchor Constraint Rules

Subpartials MUST:
- ✅ Stay within anchor size
- ✅ Respect rotation if declared
- ✅ Use contained layout (not overflow)
- ✅ Not reposition themselves

Subpartials MUST NOT:
- ✗ Grow beyond anchor size
- ✗ Modify their position on the page
- ✗ Assume content below anchor still visible
- ✗ Use dynamic sizing based on content

---

## PART 5: VALIDATION AND ASSERTIONS

### Rule SV-5.1: Post-Render Assertions for SVG Panels

SVG panels should declare DOM assertions:

```javascript
// PANEL_REGISTRY entry
{
  name: 'portraitPanel',
  type: 'svg',
  postRenderAssertions: [
    {
      selector: '.swse-panel--portrait-svg',
      expectation: (el) => el.querySelector('svg.svg-art-layer') !== null,
      errorMessage: 'SVG panel missing SVG element'
    },
    {
      selector: 'svg#frame',
      expectation: (el) => el.querySelector('image') !== null,
      errorMessage: 'SVG frame missing image'
    },
    {
      selector: 'svg#content',
      expectation: (el) => el !== null,
      errorMessage: 'SVG content layer missing'
    },
    {
      selector: 'svg#overlay',
      expectation: (el) => Object.keys(portraitPanel.anchors).length === el.querySelectorAll('[data-anchor-name]').length,
      errorMessage: 'SVG overlay missing anchor points'
    }
  ]
}
```

### Rule SV-5.2: Validator for SVG Panels

```javascript
function validatePortraitPanel(portraitPanel) {
  const errors = [];

  // Check SVG metadata
  if (!portraitPanel.imagePath) {
    errors.push('Missing imagePath');
  }

  // Check dimensions
  if (!portraitPanel.dimensions ||
      typeof portraitPanel.dimensions.width !== 'number' ||
      typeof portraitPanel.dimensions.height !== 'number') {
    errors.push('Invalid dimensions');
  }

  // Check safe area
  if (!portraitPanel.safeArea ||
      typeof portraitPanel.safeArea.x !== 'number' ||
      typeof portraitPanel.safeArea.y !== 'number') {
    errors.push('Invalid safeArea');
  }

  // Check anchors exist and are valid
  if (!portraitPanel.anchors || typeof portraitPanel.anchors !== 'object') {
    errors.push('Invalid anchors object');
  } else {
    for (const [name, anchor] of Object.entries(portraitPanel.anchors)) {
      if (typeof anchor.x !== 'number' || typeof anchor.y !== 'number') {
        errors.push(`Anchor "${name}" missing coordinates`);
      }
    }
  }

  return {valid: errors.length === 0, errors};
}
```

---

## SUMMARY CHECKLIST

When designing an SVG-backed panel:

```
SVG Design
  ☐ SVG file has three explicit layers (frame, content, overlay)
  ☐ Safe area defined and documented
  ☐ Anchor points defined with size/rotation constraints
  ☐ Frame layer is background art (non-interactive)
  ☐ Content layer is clipped to safe area
  ☐ Overlay layer holds socketed controls

Builder
  ☐ buildXxxPanel() returns complete context
  ☐ imagePath, dimensions, safeArea, anchors, layers all present
  ☐ All anchor points have required metadata
  ☐ Content data computed for content layer

Validator
  ☐ validateXxxPanel() checks all SVG metadata
  ☐ Validates dimensions, safe area, anchors
  ☐ Returns {valid, errors}

Template
  ☐ Template renders SVG with three layers
  ☐ Content layer clipped to safe area
  ☐ Overlay layer renders anchor points
  ☐ Socketed subpartials positioned absolutely

CSS
  ☐ SVG panel positioned relative
  ☐ Socketed subpartials positioned absolute
  ☐ Anchor sizes enforced via overflow: hidden
  ☐ Layer z-index correct (frame < content < overlay)

Subpartials
  ☐ Subpartials respect anchor size
  ☐ Subpartials use fixed/absolute positioning
  ☐ Subpartials declare anchor assumptions
  ☐ Subpartials don't overflow anchor bounds

Post-Render
  ☐ SVG element exists and has correct id
  ☐ Three layers (frame, content, overlay) present
  ☐ Anchor points exist for each declared anchor
  ☐ Safe area clipping active
```

---

**Version:** 1.0
**Last Updated:** 2026-03-29
