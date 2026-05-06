# Holonet: SWSE Communication Spine

Holonet is the first-class communication and notification subsystem for the SWSE Foundry VTT implementation. It handles all in-game messaging, notifications, approvals, level-up announcements, mentor dialogs, system alerts, and store/transaction notifications through a unified, architected spine.

## What Is Holonet?

Holonet provides:
- **Direct messaging** between players and NPCs  
- **Notifications** for game events (progression, transactions, approvals)  
- **Bulletins** and announcements broadcast to all players  
- **Mentor dialogs** from system mentors or NPC advisors  
- **Unified delivery routing** — records are delivered to per-recipient UI surfaces  
- **Thread support** for conversation continuity  
- **Read state tracking** per recipient  
- **Indexing and caching** to avoid repeated full-scans  

## Primary Publish Flow

```
HolonetManager or HolonetEngine.publish()
  ↓
HolonetEngine._publishAsGm()
  ├─ Apply lifecycle (timestamps, state → PUBLISHED)
  ├─ Resolve recipients (expand audiences to concrete recipient IDs)
  ├─ Apply projections (which UI surfaces the record appears in)
  ├─ Persist to storage (HolonetStorage via game.settings)
  ├─ Notify local recipient (show toast if recipient is current player)
  └─ Emit hooks (swseHolonet:recordPublished, swseHolonetUpdated)
```

## Core Services

### HolonetManager (Phase 3)
**Stable developer-facing API** for sending records without needing to understand internal sources or constructors.

```javascript
// Send a direct message
await HolonetManager.sendMessage({
  from: 'actor:my-actor-id',
  to: 'persona:mentor:npc-id',
  title: 'Question',
  body: 'How do I improve?'
});

// Send a system notice to all players
await HolonetManager.systemNotice({
  audience: 'all-players',
  title: 'Event Alert',
  body: 'The invasion has begun!'
});

// Send a mentor dialog
await HolonetManager.mentorNotice({
  actor: 'persona:mentor:npc-id',
  title: 'Mentor Advice',
  body: 'Consider training your Force skills.'
});

// Mark all unread records as read
await HolonetManager.markAllRead('player:user-id');
```

### HolonetEngine
**Central dispatch** for all publish, read-state, and retrieval operations.

- `publish(record, options)` — Publish a record (internal or via socket to GM)  
- `markRead(recordId, recipientId)` — Mark single record as read  
- `markManyRead(recordIds, recipientId)` — Mark multiple records as read in one write  
- `getRecord(recordId)` — Get a single record by ID  
- `getRecordsForRecipient(recipientId, states)` — Get records for a recipient  
- `getRecordsByIntent(intent)` — Get records by intent (now index-backed)  
- `getUnreadCountsForRecipient(recipientId, options)` — Unread count summary  

### HolonetBus (Phase 1)
**Thin facade** over socket transport and Hooks-based events.

- `request(action, data)` — Send a request to GM  
- `sync(typeOrData, extraData)` — Broadcast a sync update to all clients  
- `emitLocal(type, payload)` — Fire a local Foundry Hook (both typed and compat)  
- `on(type, handler)` — Register a typed hook listener  

### HolonetEmissionService (Phase 2)
**Shared emission pipeline** with preference checking, deduplication, and record creation.

```javascript
const result = await HolonetEmissionService.emit({
  sourceFamily: 'mentor',
  categoryId: HolonetPreferences.CATEGORIES.MENTOR_ADVICES,
  dedupeKey: `mentor-advice-${actor.id}-${questId}`,
  createRecord: () => MentorSource.createAdviceNotification({ actor, quest }),
  metadata: { questId }
});

if (result.ok) console.log('Emitted', result.record.id);
```

### HolonetStorage (Phase 3 Enhanced)
**Persistence boundary** with indexing/caching for efficient queries.

**Core methods (backwards compatible):**
- `getRecord(recordId)` — Get single record  
- `getAllRecords()` — Get all records  
- `getRecordsForRecipient(recipientId, deliveryStates)` — Get records for recipient  
- `saveRecord(record)` — Save single record  
- `saveRecords(records)` — Batch-save records  
- `getThread(threadId)` — Get single thread  
- `getAllThreads()` — Get all threads  
- `saveThread(thread)` — Save single thread  

**Phase 3 New Index-backed methods:**
- `getRecordIndex({ force = false })` — Build/get primary index  
- `getRecordById(recordId)` — Lookup by ID (index-backed)  
- `getRecordsByRecipient(recipientId, deliveryStates)` — Lookup by recipient (index-backed)  
- `getUnreadRecordsForRecipient(recipientId, options)` — Lookup unread by recipient (index-backed)  
- `getRecordsByIntent(intent, options)` — Lookup by intent (index-backed)  
- `getRecordsBySourceFamily(sourceFamily, options)` — Lookup by source family (index-backed)  
- `getThreadsIndex({ force = false })` — Build/get thread index  
- `getThreadById(threadId)` — Lookup thread by ID (index-backed)  
- `saveThreads(threads)` — Batch-save threads  

**Phase 3 Archive/Cleanup (opt-in only):**
- `archiveRecord(recordId, { archivedBy, reason })` — Mark record archived  
- `archiveRecords(recordIds, options)` — Batch-archive records  
- `pruneRecords({ olderThan, maxRecords, includeArchived, dryRun })` — Remove old records (dryRun=true by default)  
- `compactRecords({ dryRun })` — Remove null/invalid records (dryRun=true by default)  
- `invalidateCache()` — Clear all indexes (called automatically after writes)  

### HolonetDeliveryRouter
**Routes records to concrete recipients** based on audience and delivery rules.

- `resolveRecipients(record)` — Expand record.audience to recipient list  
- `getCurrentRecipientId()` — Get current player/GM recipient ID  

### HolonetProjectionRouter
**Routes records to UI surfaces** (Home feed, notice center, messenger, etc.).

- `resolveSurfaces(record)` — Determine which surfaces a record projects to  

### HolonetMessengerService
**View-model builder** for direct messenger UI.

### HolonetNoticeCenterService
**View-model builder** for alert notifications and the notice center drawer.

- `getUnreadRecords(recipientId, limit)` — Get unread for notice center (now index-backed)  
- `buildCenterVm(options)` — Build complete notice center view-model  

### HolonetFeedService
**View-model builder** for timeline/feed surfaces.

- `getFeedForRecipient(recipientId, surfaceType, limit)` — Get feed records (now index-backed)  
- `getFeaturedItemsForRecipient(recipientId, surfaceType, limit)` — Get featured/pinned (now index-backed)  

## Stable Recipient ID Formats

When specifying a recipient, use these standard formats:

- `player:<userId>` — A specific player character  
- `gm:<userId>` — A specific GM  
- `gm` — All GMs collectively  
- `persona:<personaType>:<actorId>` — A specific NPC/actor persona  

Examples:
- `player:abc123def456`  
- `gm:xyz789`  
- `persona:mentor:npc-mentor-id`  

## Typed Hooks

Holonet events fire typed hooks that allow targeted listeners. All hooks also fire the legacy `swseHolonetUpdated` for backward compatibility.

- `swseHolonet:recordPublished` — A record was published  
  ```javascript
  Hooks.on('swseHolonet:recordPublished', ({ recordId, recipients }) => { ... });
  ```

- `swseHolonet:recordRead` — A record was marked read  
  ```javascript
  Hooks.on('swseHolonet:recordRead', ({ recordId, recipientId }) => { ... });
  ```

- `swseHolonet:recordsRead` — Multiple records were marked read  
  ```javascript
  Hooks.on('swseHolonet:recordsRead', ({ recordIds, recipientId }) => { ... });
  ```

- `swseHolonet:messageSent` — A direct message was sent  

- `swseHolonet:threadRead` — A thread was marked read  

- `swseHolonet:threadUpdated` — A thread was updated  

- `swseHolonet:stateUpdated` — Holonet state changed  

- `swseHolonetUpdated` — **Compatibility hook** fired alongside all above for backward compatibility  

## Storage Architecture (Phase 3)

Holonet stores records and threads in Foundry world settings as JSON arrays:
- Setting key: `foundryvtt-swse.holonet_records`  
- Setting key: `foundryvtt-swse.holonet_threads`  

**Phase 3 Enhancement:**
Records and threads are now **indexed and cached** in memory after first access. Subsequent queries use the indexes instead of rescanning the full array. Indexes are invalidated automatically after any write operation.

This approach:
- ✅ Preserves the existing settings storage backend (no migration needed)  
- ✅ Adds efficient querying via indexes  
- ✅ Allows lazy cache construction on first access  
- ✅ Maintains backward compatibility  
- ⚠️ Cache is cleared on server restart (acceptable for iteration)  

**Cleanup is opt-in:**
- No automatic destructive cleanup on startup  
- Call `HolonetStorage.pruneRecords({ dryRun: false })` explicitly to remove old records  
- Call `HolonetStorage.compactRecords({ dryRun: false })` to remove invalid entries  
- Use `archiveRecord/archiveRecords` to mark records as archived without deletion  

## Simple Example: System Notice

Send a notice to all players:

```javascript
const success = await HolonetManager.systemNotice({
  audience: 'all-players',
  title: 'Mission Briefing',
  body: 'You have been assigned a new priority mission in the outer rim.'
});

if (success) {
  console.log('Notice sent');
} else {
  console.error('Failed to send notice');
}
```

## Limitations and Future Work

- Records and threads are **stored in game.settings**, not a dedicated database (acceptable for now)  
- Read state is tracked per recipient in `record.deliveryStates` map, not a separate table  
- Archival is opt-in and non-destructive by design  
- Thread continuity is enforced by `HolonetThreadService`, not the engine  

## References

- **HolonetManager** — `scripts/holonet/holonet-manager.js`  
- **HolonetEngine** — `scripts/holonet/holonet-engine.js`  
- **HolonetStorage** — `scripts/holonet/subsystems/holonet-storage.js`  
- **Contracts** — `scripts/holonet/contracts/`  
- **Integration** — `scripts/holonet/integration/holonet-init.js`  
