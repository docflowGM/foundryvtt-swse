# Holonet Badge UX Integration Guide

## Overview

The Holonet Badge system provides a lightweight visual layer for notification classification. Badges help players quickly identify notification types without reading full content.

## Components

### HolonetBadgeService
**Location:** `scripts/holonet/services/holonet-badge-service.js`

Core service for badge resolution and metadata.

```javascript
import { HolonetBadgeService } from '...holonet/services/holonet-badge-service.js';

// Get badge for a record
const badge = HolonetBadgeService.getBadge(record);
// Returns: { key, label, icon, glyph, tone }

// Get unread counts by badge family
const counts = HolonetBadgeService.getUnreadCounts(records);
// Returns: { messages: 2, store: 1, ship: 3, ... }

// Get all badge families with counts
const badges = HolonetBadgeService.getAllBadges(counts);
// Returns: [{ key, label, icon, ..., unreadCount }, ...]
```

### HolonetBadgeRenderer
**Location:** `scripts/holonet/ui/holonet-badge-renderer.js`

Helper for rendering badge HTML in UI components.

```javascript
import { HolonetBadgeRenderer } from '...holonet/ui/holonet-badge-renderer.js';

// Render badge chip (notice center, filters)
const chipHtml = HolonetBadgeRenderer.renderBadgeChip(badge, 3);
// <span class="holonet-badge-chip holonet-badge-store">
//   <i class="badge-icon fas fa-coins"></i>
//   <span class="badge-label">STORE</span>
//   <span class="badge-count">3</span>
// </span>

// Render badge label (notification cards)
const labelHtml = HolonetBadgeRenderer.renderBadgeLabel(badge);
// <span class="holonet-badge-label holonet-badge-ship">
//   <i class="badge-icon fas fa-ship"></i>
//   <span class="badge-text">SHIP</span>
// </span>

// Render badge row (home grid)
const rowHtml = HolonetBadgeRenderer.renderBadgeRow(counts);
// <div class="holonet-badge-row">
//   <span class="holonet-badge-chip holonet-badge-messages">...</span>
//   <span class="holonet-badge-chip holonet-badge-store">...</span>
//   ...
// </div>

// Get CSS classes (for programmatic styling)
const classes = HolonetBadgeRenderer.getBadgeClasses(badge);
// "holonet-badge-ship holonet-badge-tone-tech"
```

## Integration Points

### 1. Datapad Home Grid Badge Row

**File:** `templates/apps/gm-datapad.hbs`

Add badge row above notification list:

```handlebars
<div class="datapad-notifications">
  <!-- Badge row showing unread counts -->
  <div class="notifications-badge-row" id="notification-badges">
    <!-- Rendered by JS: HolonetBadgeRenderer.renderBadgeRow(counts) -->
  </div>

  <!-- Notification cards below -->
  <div class="notifications-list">
    {{#each records}}
      <div class="notification-card" data-record-id="{{this.id}}">
        <!-- Badge label at top of card -->
        <div class="card-badge"><!-- Rendered by JS --></div>
        <div class="card-content">
          {{this.title}}
          {{this.body}}
        </div>
      </div>
    {{/each}}
  </div>
</div>
```

**Script:** `scripts/apps/gm-datapad.js`

```javascript
import { HolonetBadgeRenderer } from '../holonet/ui/holonet-badge-renderer.js';
import { HolonetBadgeService } from '../holonet/services/holonet-badge-service.js';

// In _getAppCards() or similar:
async _loadNotificationsContext() {
  const records = await HolonetStorage.getPlayerNotifications(game.user.id);
  
  // Get unread counts for badge row
  const unreadCounts = HolonetBadgeService.getUnreadCounts(records);
  
  return {
    records,
    unreadCounts,
    badgeRowHtml: HolonetBadgeRenderer.renderBadgeRow(unreadCounts)
  };
}

// In _onRender() or similar:
_renderNotifications(root) {
  const badgeRowElement = root.querySelector('#notification-badges');
  if (badgeRowElement) {
    badgeRowElement.innerHTML = this.badgeRowHtml;
  }

  // Add badge labels to each card
  for (const record of this.records) {
    const cardElement = root.querySelector(`[data-record-id="${record.id}"]`);
    if (cardElement) {
      const badge = HolonetBadgeService.getBadge(record);
      const badgeHtml = HolonetBadgeRenderer.renderBadgeLabel(badge);
      cardElement.querySelector('.card-badge').innerHTML = badgeHtml;
    }
  }
}
```

### 2. Notice Center Chips

**File:** `scripts/holonet/subsystems/holonet-notice-center-service.js` (when implemented)

```javascript
// Replace plain text chips with badge chips
const chip = HolonetBadgeRenderer.renderBadgeChip(badge, unreadCount);
notificationCenter.addChip(chip);
```

### 3. Notification Cards in Messenger/Bulletin

**File:** `templates/holonet/notification-card.hbs` (when refactored)

```handlebars
<div class="holonet-notification-card" data-intent="{{intent}}">
  <!-- Badge label at top -->
  <div class="card-header">
    <div class="card-badge"><!-- Rendered with HolonetBadgeRenderer --></div>
    <div class="card-meta">
      <span class="timestamp">{{timestamp}}</span>
    </div>
  </div>

  <div class="card-body">
    {{title}}
    {{body}}
  </div>
</div>
```

## Badge Families & Visual Identity

| Family | Label | Icon | Tone | Use Case |
|--------|-------|------|------|----------|
| messages | MESSAGES | envelope | comms | Messenger, bulletin |
| store | STORE | coins | commerce | Store open/close, pricing |
| mentor | MENTOR | user-graduate | training | Mentor guidance, levels |
| progression | LEVELS | chevron-up | advancement | Level-ups, milestones |
| approvals | APPROVALS | stamp | official | Build approvals, trades |
| ship | SHIP | ship | tech | Ship damage, subsystems |
| droid | DROID | robot | tech | Droid status, repairs |
| follower | CREW | users | personal | Follower leveled, killed |
| healing | HEALTH | heart-pulse | medical | Healing, recovery |
| system | SYSTEM | bell | alert | Generic system events |
| bulletin | NEWS | newspaper | info | Announcements, articles |

## CSS Classes

All badge elements have automatic class names:
- `.holonet-badge-{family}` — e.g., `.holonet-badge-ship`, `.holonet-badge-store`
- `.holonet-badge-tone-{tone}` — e.g., `.holonet-badge-tone-tech`, `.holonet-badge-tone-comms`

Use these for custom styling or filtering:

```css
/* Style all tech-related badges */
[data-tone="tech"] {
  border-color: rgba(100, 200, 255, 0.8);
}

/* Style ship badges specifically */
.holonet-badge-ship {
  background: rgba(100, 200, 255, 0.2);
}
```

## Backwards Compatibility

Badges are **additive** — they enhance existing notification text labels without replacing them.

**Before (text-only):**
```
MSG 2
STORE 1
MENTOR 1
```

**After (with badges):**
```
✉ MESSAGES 2
₡ STORE 1
◇ MENTOR 1
```

All existing notification content remains; badges just provide visual shortcuts.

## Performance Notes

- **Service calls are O(1)**: Badge resolution uses direct lookups, not iteration
- **Renderer HTML is lazy**: Badge HTML is only generated when explicitly called
- **CSS is minimal**: Lightweight color/style definitions, no JavaScript animation
- **No DOM overhead**: Badges use native CSS classes, no special data structures

## Future Enhancements

Potential improvements (out of scope for current pass):

1. **Badge animations** — Pulse on new notification, fade on read
2. **Badge filters** — Click badge to filter notifications by family
3. **Badge grouping** — Collapse notifications by badge family
4. **Custom badges** — Plugin API for third-party badge types
5. **Badge persistence** — Remember user's badge preferences (minimized/expanded)

## Testing

Manual QA checklist:

- [ ] All badge families render with correct colors
- [ ] Unread counts display correctly
- [ ] Badges display on notification cards
- [ ] Badges display in home grid
- [ ] Hover effects work
- [ ] Mobile responsive (stacked on small screens)
- [ ] No console errors
- [ ] CSS loads without conflicts
