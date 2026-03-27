# PHASE 3 HANDOFF — FOLLOWER CONSUMPTION THROUGH SUBTYPE SEAM

**Phase 3 Status:** Core infrastructure complete. Dependent participant pattern established. Heroic-level parity architecture in place. Build Follower UI entry point and full progression-spine integration deferred to Phase 3.5+.

**Completion Date:** 2026-03-27

---

## 1. Follower Rule Sources Reused (Audit + Reuse Strategy)

### A. Follower Creation & Stats (FollowerCreator)

**Source:** `/scripts/apps/follower-creator.js`

**Reused:**
- `createFollowerFromData()` - Template-driven follower actor construction
- `_buildFollowerActor()` - stat calculation (HP, defenses, BAB, abilities)
- `_calculateFollowerDefenses()` - defense formula: `10 + ability mod + owner heroic level`
- `_applySpecies()` - species item application via ActorEngine
- `_applyTemplateFeats()` - feat application from template
- `_applyTemplateSkills()` - skill training from template

**Phase 3 Enhancement:**
- Fixed heroic level bug: Changed from `owner.system.level` to `getHeroicLevel(owner)`
- All formulas now correctly use **owner's heroic level**, not total level
- Enables proper heroic-level parity for followers

**Not duplicated:**
- Follower actor creation still uses FollowerCreator helpers
- Template instantiation still reuses existing logic
- No shadow follower builder in progression

---

### B. Follower Entitlement & Slots (follower-hooks.js)

**Source:** `/scripts/infrastructure/hooks/follower-hooks.js`

**Reused:**
- `_getSlots()` - reads `flags.swse.followerSlots` from owner actor
- Slot structure: `{ id, talentName, talentItemId, templateChoices, createdActorId, createdAt }`
- Talent-based entitlement tracking
- Slot cleanup on talent loss (provenance-safe)

**Phase 3 Integration:**
- New `follower-session-seeder.js` validates entitlements by checking slots
- `validateFollowerEntitlement()` - guards against unauthorized follower creation
- `getAvailableFollowerSlots()` - lists unfilled slots for owner

**Canonical Entitlement Flow:**
1. Owner gains follower-granting talent → slot created in `flags.swse.followerSlots`
2. Owner clicks "Build Follower" from Relationships tab
3. Progression shell seeded with owner context and slot ID
4. Follower adapter validates entitlement against slot
5. If valid, proceeds; if not, throws error

---

### C. Follower Templates (follower-templates.json)

**Source:** `/data/follower-templates.json`

**Three templates reused:**
1. **Aggressive:** Str/Con focus, Fortitude bonus, high BAB progression
2. **Defensive:** Dex/Wis focus, Reflex bonus, moderate BAB progression
3. **Utility:** Int/Cha focus, Will bonus, choice skills/feats, moderate BAB

**Phase 3 Reuse:**
- Template selection step deferred (UI entry point not yet wired)
- Template BAB progression table used in `follower-advancer.js` for level-by-level advancement
- Template ability bonuses, defense bonuses, feats, skills all preserved

---

### D. Follower Talent Config (follower-talent-config.js)

**Source:** `/scripts/engine/crew/follower-talent-config.js`

**Reused:**
- `FOLLOWER_TALENT_CONFIG` - defines which talents grant followers
- Currently: "Reconnaissance Team Leader" and "Inspire Loyalty" (3 slots each)
- Template choices per talent
- Additional feats/skills per talent configuration

**Phase 3 Integration:**
- Config drives entitlement validation
- Slot creation/destruction driven by talent add/remove through hooks

---

## 2. Canonical Follower Model Chosen

### Participant Classification

**Kind:** DEPENDENT (not INDEPENDENT)

**Subtype:** follower (not peer with actor/droid/nonheroic)

**Base:** nonheroic (followers are explicitly nonheroic, template-driven)

**Canonical Markers:**
- **Primary (Progression-facing):** `session.dependencyContext.ownerActorId`
- **Actor marker (Legacy):** `system.isFollower: true`, `system.followerType: template name`
- **Linkage (Legacy):** `flags.swse.follower.ownerId`, `flags.swse.follower.templateType`

### Heroic-Level Parity Architecture

**Core Rule:** Follower target level = Owner's **heroic level** (not total level)

**Examples:**
- Owner Scout 4 (heroic only) → Follower target level 4
- Owner Scout 3 / Expert 2 (heroic + nonheroic) → Follower target level 3 (heroic only)
- Owner Scout 5 with existing Follower 3 → Follower advanced from 3 → 5

**Why:** Rules text explicitly ties follower stats to owner's heroic level. Mixed heroic/nonheroic owners must use heroic level only, as per SWSE mechanics.

---

## 3. Files Changed

| File | Change | Why |
|------|--------|-----|
| `scripts/apps/follower-creator.js` | Fixed heroic level bug; added import | Critical: Followers must use owner heroic level, not total level |
| `scripts/apps/progression-framework/adapters/default-subtypes.js` | Implemented real FollowerSubtypeAdapter | Phase 3 core: follower is now real dependent participant in seam |
| `scripts/apps/progression-framework/adapters/follower-advancer.js` | **NEW** | Helper for level-by-level advancement and parity planning |
| `scripts/apps/progression-framework/adapters/follower-session-seeder.js` | **NEW** | Seed follower dependency context; validate entitlement; compute advancement plan |

---

## 4. How Follower Now Resolves Through the Spine

### A. Dependency Context Seeding

**Entry Point:** (Deferred) Build Follower button from Relationships tab

**Seeding Process:**
1. Relationships tab handler calls follower progression launcher
2. Launcher populates `session.dependencyContext` with:
   - `ownerActorId` - owner actor ID
   - `slotId` - follower slot being used
   - `slotTalentName` / `slotTalentItemId` - granting talent metadata
   - `templateChoices` - allowed templates for this slot
   - `existingFollowerId` - if advancing existing follower
   - (computed) `ownerHeroicLevel`, `targetFollowerLevel`, `levelsToApply`

**Current State:** Context structure defined in `follower-session-seeder.js`. UI entry point deferred.

---

### B. Session Seeding (Adapter)

**FollowerSubtypeAdapter.seedSession():**
1. Reads `session.dependencyContext.ownerActorId`
2. Loads owner actor
3. Calls `seedFollowerSession()` helper
4. Helper validates entitlement (owner has the slot)
5. Computes advancement plan from current level to target
6. Populates full `session.dependencyContext`

**Entitlement Validation:** Slot must exist in owner's `flags.swse.followerSlots`

**Failure Mode:** Throws error if no entitlement (prevents unauthorized creation)

---

### C. Active-Step Computation (Adapter)

**FollowerSubtypeAdapter.contributeActiveSteps():**

Suppresses all full-character progression steps:
- No class selection, leveling, or multiclass
- No freeform feats or talents
- No ability score increases
- No species/gender/background selection
- No force powers

**Result:** Empty step list for followers (progression skips to finalization)

**Rationale:** Followers are template-driven, not freeform builders. All choices are template-bound and predetermined.

---

### D. Projection/Summary (Adapter)

**FollowerSubtypeAdapter.contributeProjection():**

Adds metadata to projection:
- `isFollower: true`
- `followerOwnerHeroicLevel`
- `followerTargetLevel`
- `followerTemplate` (template type)
- `isNewFollower` (boolean)

**Future Enhancement:** Could show fully-advanced follower stats in summary preview (deferred to Phase 3.5)

---

### E. Mutation-Plan Compilation (Adapter)

**FollowerSubtypeAdapter.contributeMutationPlan():**

Compiles follower operation bundle:

**For new follower:**
```javascript
mutationPlan.follower = {
  operation: 'create',
  ownerActorId,
  templateType,
  targetHeroicLevel
}
```

**For advancing existing follower:**
```javascript
mutationPlan.follower = {
  operation: 'advance',
  followerId,
  templateType,
  currentLevel,
  targetLevel,
  levelsToApply: [4, 5]  // Example: levels to apply
}
```

**Finalization:** (Deferred) Mutation plan passed to ActorEngine for execution

---

### F. Finalizer/Apply Path

**Current State:** Partially deferred

What should happen (Phase 3.5+):
1. Mutation plan with `follower` bundle routed to ActorEngine
2. ActorEngine handles:
   - Create new follower actor (for 'create' operation)
   - Apply template species/feats/skills
   - Set initial stats
   - Link to owner (`flags.swse.follower.ownerId`)
   - Fill slot in owner's `flags.swse.followerSlots`
3. For 'advance' operation: apply level-by-level gains via `advanceFollowerToLevel()`
4. Entire flow still terminates in unified apply path (no separate engine)

**Deferred:** Full ActorEngine integration deferred to Phase 3.5

---

## 5. Legacy Entry-Point Handling

### Current State

**FollowerCreator.createFollower()** remains the active UI entry point.

- Called directly from legacy Relationships/Notes tabs (not wired to progression yet)
- Creates followers outside the progression spine
- Still works via ActorEngine
- Not yet wrapped into the progression path

### Phase 3 Work

Created infrastructure to wrap this through progression:
- `follower-session-seeder.js` can prep context
- `FollowerSubtypeAdapter` can orchestrate through spine
- `follower-advancer.js` can compute level plans

### Phase 3.5+ Work

Will wire the UI:
1. Add "Build Follower" button to Relationships tab
2. Button launches follower progression shell with dependency context
3. Shell routes through FollowerSubtypeAdapter seam
4. Finalization calls through to ActorEngine (not duplicating logic)

**Design Principle:** Progression becomes the canonical orchestration path. Legacy helpers remain helpers (called by progression), not parallel builders.

---

## 6. What Was Deliberately Not Done Yet

### Phase 3.5: Build Follower UI Entry Point

**Deferred:**
- Add "Build Follower" button/action to Relationships tab
- Wire button to new follower progression launcher
- Create follower progression launcher that sets up dependency context

**Why:** Requires template selection UI and shell wiring. Core infrastructure complete; UI deferred.

### Phase 3.5: Full Progression-Spine Integration

**Deferred:**
- Hook follower progression output into ActorEngine
- Handle follower creation/advancement through unified apply
- Test full flow end-to-end
- Handle follower slot cleanup on progression completion

**Why:** Requires ActorEngine integration and comprehensive testing. Core logic complete.

### Phase 3.5+: Template-Specific Advancement Rules

**Deferred:**
- If templates have level-up choices (not yet defined in repo), expose them as steps
- Handle template-specific advancement variations
- Implement template-driven role/archetype selections

**Why:** Repo currently has uniform template rules. Advanced customization deferred.

### Follower Combat/Runtime Control

**Explicitly out of scope (not touched):**
- Follower AI/initiative behavior
- Follower action delegation in combat
- Follower vehicle/crew integration
- Follower command structures

These remain in their current runtime/governance locations.

---

## 7. Executable Proof (Tests)

**Status:** Core infrastructure tests deferred to Phase 3.5+

**Tests needed (not yet written):**

### Test 1: Follower detects as DEPENDENT
```
Follower adapter returns ParticipantKind.DEPENDENT
Follower is never mixed with independent paths
```

### Test 2: Follower session seeding validates entitlement
```
Owner with follower slot: seeding succeeds
Owner without follower slot: seeding throws error
```

### Test 3: Heroic-level parity computed correctly
```
Owner heroic level 4, new follower: target level = 4
Owner heroic level 5, follower level 3: advancement plan = [4, 5]
```

### Test 4: Active steps suppressed for follower
```
Follower gets no class/feat/talent steps
Follower step list is empty or contains only follower-specific steps
```

### Test 5: Mutation plan compiles for create and advance
```
New follower: mutationPlan.follower.operation === 'create'
Advancing: mutationPlan.follower.operation === 'advance' with levelsToApply
```

### Test 6: Existing actor/nonheroic/droid paths still pass
```
No regression in other participant types
```

---

## 8. Remaining Risks / Awkwardness

### Heroic-Level Parity Not Yet Enforced in Followers From Relationships Tab

**What:** If player uses legacy "Build Follower" button from Relationships tab directly (not through progression), follower created with `owner.system.level` (the bug we fixed in follower-creator).

**Impact:** Followers created via legacy path use total level, not heroic level.

**Mitigation:** Phase 3.5 wires the progression path, which uses fixed heroic level calculation.

**Bluntness:** This is a transitional issue. The fix is in place in follower-creator (uses heroic level). Legacy UI entry point will use it once wired through progression.

### Slot Filling Not Yet Integrated

**What:** When follower is created through progression, slot must be marked as filled (`createdActorId` set).

**Impact:** Player can currently create multiple followers from same slot.

**Mitigation:** Phase 3.5 ActorEngine integration handles slot cleanup.

**Bluntness:** This is a UI/finalization issue, not an architecture issue.

### Template Selection UI Not Implemented

**What:** Follower-specific template selection step doesn't exist yet in progression.

**Impact:** Templates currently hardcoded or selected in legacy dialog.

**Mitigation:** Phase 3.5 can expose template selection as progression step if needed.

**Bluntness:** Low priority; current templates are simple enough. Future enhancement if needed.

### Advancement Plan Computed But Not Applied

**What:** `follower-advancer.js` computes which levels need to be applied, but level-by-level gains not yet applied during finalization.

**Impact:** Followers created at target level directly, not stepped through each level gain.

**Mitigation:** Phase 3.5 applies level-by-level gains through `advanceFollowerToLevel()`.

**Current Behavior:** Follower stats jumped to final level. No intermediate choices/gains.

**Bluntness:** Mechanically sound (final stats correct), but loses pedagogical value of showing level progression.

---

## 9. Heroic-Level Parity and Build Follower Entry Point

### Heroic-Level Calculation

**Formula:** `getHeroicLevel(actor) = sum of class levels where isNonheroic !== true`

**Source:** `/scripts/actors/derived/level-split.js` - authoritative.

**Used in:** follower-creator.js (fixed), follower-session-seeder.js (advancement planning)

**Example:**
- Scout 3 / Expert 2 → heroic = 3, total = 5
- Follower target level = 3 (heroic only)

### Build Follower Entry Point

**Planned Location:** Relationships tab (partial implementation exists at `/templates/actors/character/v2/partials/relationships-panel.hbs`)

**Not yet implemented:** Button/action to launch follower progression

**Wiring required (Phase 3.5):**
1. Add button in relationships panel: "Build Follower"
2. Button appears only when owner has available slots
3. Click → Open follower progression launcher
4. Launcher → Sets `dependencyContext`, opens ProgressionShell in 'follower' mode

### Follower Leveling Source

**Used:** `/data/follower-templates.json` - `babProgression` arrays

**How:** When advancing follower from level N to N+1, BAB from template progression table

**Example:**
- Aggressive template: `babProgression[3] = 4` (BAB at level 4)
- Defensive: `babProgression[3] = 3` (lower BAB, higher defense focus)

**Parity Advancement:**
1. Owner Scout 4 gains Scout 5 (heroic +1)
2. Existing Follower level 4 needs advancement to 5
3. Apply `template.babProgression[4]` to follower.system.baseAttackBonus
4. Set follower.system.level to 5

**Currently:** Computation logic exists in `follower-advancer.js`. Application deferred to Phase 3.5 ActorEngine integration.

---

## 10. Validation & Sign-Off

### Phase 3 Completion Checklist

- ✅ Follower identified as DEPENDENT participant (not peer subtype)
- ✅ Follower session seeder validates entitlement from owner slots
- ✅ Heroic-level parity architecture in place (getHeroicLevel integration)
- ✅ FollowerSubtypeAdapter implemented (real, not stub)
- ✅ Active-step suppression for template-driven nature
- ✅ Mutation-plan compilation for create/advance bundles
- ✅ Progression rule sources reused (not duplicated)
  - FollowerCreator: creation/stats
  - follower-hooks: entitlement/slots
  - follower-templates: template rules
  - follower-talent-config: talent grants
- ✅ Legacy code preserved (no rewrites)
- ✅ Heroic level bug fixed in follower-creator
- ✅ No new actor type registered (followers remain as character actors)

### Architecture Integrity (Phase 3)

- ✅ Single unified progression spine (no second follower engine)
- ✅ Follower correctly modeled as dependent, not independent
- ✅ Follower reuses existing entitlement/template/advancement logic
- ✅ Follower inherits nonheroic base semantics (where applicable)
- ✅ Follower bound to owner heroic level (not total level)
- ✅ Follower seeding validates entitlement (no unauthorized creation)

### Phase 3.5 Readiness

- 📋 Build Follower UI entry point (Relationships tab)
- 📋 Full progression-spine to ActorEngine integration
- 📋 Slot filling and cleanup on creation
- 📋 Level-by-level advancement application
- 📋 Comprehensive end-to-end testing

---

## 11. Next Phase: Phase 3.5

**Objectives:**
1. Wire follower progression launcher from Relationships tab
2. Integrate mutation plan through ActorEngine
3. Handle slot filling/cleanup
4. Apply level-by-level advancement
5. Full end-to-end testing

**Expected Outcome:** Followers can be created and advanced fully through the unified progression spine with proper heroic-level parity.

---

**Phase 3 Core Completion: 2026-03-27**

**Commit:** `379e94b` — Phase 3: Core follower integration infrastructure

**Ready for Phase 3.5:** Build Follower UI and ActorEngine integration

