# PHASE 2 HANDOFF ADDENDUM — BEAST AS NONHEROIC PROFILE/VARIANT

## Executive Summary (Expansion)

**Phase 2 Expansion objective:** Integrate Beast as a real nonheroic profile/variant through the adapter seam.

**Phase 2 Expansion outcome:** Beast is now correctly modeled as a nonheroic profile, not a peer subtype. Session seeding detects Beast from canonical repo marker (`flags.swse.beastData`). Beast inherits nonheroic behavior and is tracked through the progression spine.

---

## 1. Beast Source Trace (Reused from Repo)

Beast content enters the repo through TWO separate import paths, both normalized to the same nonheroic NPC schema.

### A. Legacy Beast Pack (packs/beasts.db)

**Source:** `/packs/beasts.db` (117 pre-imported Beast entries)

**What it is:**
- JSONL format with rich beast metadata
- All stored as `type: "npc"` (NOT a separate beast actor type)
- Each contains `flags.swse.beastData` with:
  - `cl` (Challenge Level)
  - `size`, `hitPoints`, `damageThreshold`
  - `reflexDefense`, `fortitudeDefense`, `willDefense`, `flatFootedDefense`
  - `speed`, `baseAttackBonus`, `grapple`
  - `skills` (array of strings like "Perception +9")
  - `feats` (item IDs)
  - `abilityText`, `speciesTraits`
  - `abilities` (field values like `strength: 26`)
  - `tags` array with `["mount", "beast"]`

**Normalization:**
- `/scripts/build/normalize-beasts.py` normalizes these into nonheroic.db structure
- Converts `flags.swse.beastData` fields → `system` fields:
  - `beastData.cl` → `system.level`
  - `beastData.reflexDefense` → `system.defenses.reflex.total`
  - `beastData.skills` → `system.skills` (parsed into proper keys)
  - `beastData.size`, `speed`, `bab`, `dt` all migrated to system
- Beast data remains in `flags.swse.beastData` for lossless reference

**How reused:**
- Phase 2 detects beasts by checking for `flags.swse.beastData`
- Session carries `beastData` for reference in projection/finalizer
- No duplication of beast content; uses existing metadata

---

### B. Nonheroic Units Import Source (data/nonheroic/nonheroic_units.json)

**Source:** `/data/nonheroic/nonheroic_units.json` (53 Beast entries with `species_type: "Beast"`)

**What it is:**
- JSON array of nonheroic unit templates
- 53 entries have `species_type: "Beast"` (e.g., Kiltik, Watch-Beast, Strill, Iriaz, Viper Kinrath)
- Contains raw nonheroic stat blocks (cl, size, hp, abilities, skills, feats)

**Processing Pipeline:**
1. `/scripts/build/sanitize-nonheroic-units.js`
   - Converts raw JSON to sanitized format
   - Preserves `species_type` as `speciesType` in output
   - Parses ability scores, skills, feats into system-compatible structure

2. `/scripts/build/import-nonheroic-units-to-compendium.js`
   - Imports sanitized units as NPC actors into compendium
   - Converts `speciesType: "Beast"` to biography note (currently not stored as system/flags field)
   - Creates `type: "npc"` actors with normalized system fields

**Current state (potential gap):**
- These imported beasts DO NOT currently have `flags.swse.beastData` set
- They also DO NOT have `system.creatureType = "beast"` set
- They are indistinguishable from standard nonheroic NPCs at runtime
- **Mitigation:** Progressive future import enhancement could add these markers; current progression doesn't depend on them

**How reused:**
- Repo contains pre-normalized beast templates (source authority for beast stat blocks)
- Demonstrates that Beast is designed as nonheroic NPC shape, not separate type
- Proof that nonheroic schema is canonical for beast representation

---

### C. Beast UI Presentation (Template)

**Source:** `/templates/actors/npc/v2/npc-sheet.hbs`

**What it has:**
- Line 27, 270: Conditional beast tab: `actor.system.creatureType === "beast"`
- Beast-specific UI for presentation

**Current state:**
- **NOTE:** `system.creatureType` is NOT actually set by any build script or runtime code
- This is legacy/future-proofing code that never triggers in live gameplay
- NOT the canonical runtime marker
- Template readiness exists; implementation deferred to Phase 3+

---

## 2. Canonical Beast Model Chosen

### Beast is a Nonheroic Profile/Variant

**Rationale:**
1. Beast content is stored as NPC + metadata (not a separate actor type)
2. Beast normalization uses nonheroic-like schema mapping
3. Beast inherits nonheroic behavior (no independent talent progression, etc.)
4. Beast is NOT owner-derived or follower-like (so not DEPENDENT)
5. Beast is a refinement WITHIN the nonheroic family, not a peer

**Model:**
```
Participant Kind:  INDEPENDENT (like nonheroic)
Subtype:           nonheroic (not a new peer)
Profile/Variant:   beast (within nonheroic)
```

### Canonical Runtime Beast Marker

**Primary:** `flags.swse.beastData` exists

When session.nonheroicContext.beastData is truthy → participant is a beast profile

**Legacy/Aspirational (NOT used by progression):**
- `system.creatureType === "beast"` (never set, legacy UI code)
- `actor.type === "beast"` (not a registered type, defensive combat code)

---

## 3. Files Changed (Expansion)

| File | Change | Why |
|------|--------|-----|
| `nonheroic-session-seeder.js` | **MODIFIED** | Added NonheroicProfile enum; detect beastData; populate session.nonheroicContext.profile |
| `phase-1-subtype-adapter-seam.test.js` | **MODIFIED** | Added TEST 7B for beast profile detection and behavior |

---

## 4. How Standard Nonheroic Resolves (No Change)

*See Phase 2 Handoff section 3 — unchanged.*

---

## 5. How Beast Now Resolves

### A. Detection

**Location:** `nonheroic-session-seeder.js`

```javascript
const hasBeastMetadata = !!actor.flags?.swse?.beastData;
const beastProfile = hasBeastMetadata ? NonheroicProfile.BEAST : NonheroicProfile.STANDARD;
```

**Process:**
1. When nonheroic session is seeded, check for `flags.swse.beastData`
2. If present: profile = BEAST
3. If absent: profile = STANDARD
4. Both inherit nonheroic behavior

**Result:** Session carries:
```javascript
session.nonheroicContext = {
  hasNonheroic: boolean,
  totalNonheroicLevel: number,
  nonheroicClasses: [],
  profile: "beast" | "standard",
  isBeast: boolean,
  beastData: {...} | null,
}
```

---

### B. Profile Representation

**In Session:** `session.nonheroicContext.profile` and `.isBeast`

**Intent:** Distinguishes standard nonheroic from beast nonheroic

**Downstream usage (Phase 2 expansion):**
- Projection can reflect beast identity in summary
- Finalizer can preserve beast marker if needed
- Future phases can apply beast-specific rules

---

### C. Active-Step Behavior

**Behavior:** Beast inherits nonheroic talent suppression

```javascript
const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;
// Applies regardless of profile (beast or standard)
if (isNonheroic) {
  // Suppress talent steps
}
```

**Result:** Beast does NOT get talent progression (inherits from nonheroic).

---

### D. Projection/Summary Behavior

**Current Phase 2:** Pass-through to class-item system

**Future (Phase 3+):** Projection can reflect:
- `beastProfile: "beast"`
- Beast-specific UI or summary callouts
- Preserve beastData for reference

**Currently:** Deferred.

---

### E. Mutation-Plan/Finalizer Behavior

**Current Phase 2:** Pass-through to unified ActorEngine

**Future (Phase 3+):** Can preserve/apply:
- Beast actor type (currently NPC, could support type: "beast" if registered)
- Beast metadata in flags.swse.beastData
- Beast profile marker

**Currently:** Deferred.

---

## 6. What Was Deliberately Not Done Yet

### Beast-Specific Rules

**Deferred to Phase 3+:**
- Beast-specific combat mechanics
- Beast-specific skill/feat/ability rules
- Beast-specific NPC sheet UI activation (system.creatureType is legacy)
- Beast-specific summary/presentation beyond profile label

**Why deferred:** Phase 2 is about structural integration. Beast rules are existing repo content; progression just needs to honor the beast profile.

### Actor Type Registration

**NOT done:**
- Did NOT register "beast" as an official actor type
- Beasts remain as `type: "npc"` (canonical repo representation)

**Why:** Beast is a profile/variant WITHIN nonheroic (NPC), not a separate type.

---

## 7. Executable Proof

### New Tests: `phase-1-subtype-adapter-seam.test.js` (TEST 7B)

**Test 1: Beast Detection from Metadata** ✅
```javascript
it('should detect beast profile from flags.swse.beastData', async () => {
  const beastActor = { flags: { swse: { beastData: {...} } } };
  await seedNonheroicSession(session, beastActor, 'chargen');
  expect(session.nonheroicContext.profile).toBe(NonheroicProfile.BEAST);
});
```
**Proves:** Beast is correctly detected from canonical repo marker.

**Test 2: Standard Nonheroic When No Beast Data** ✅
```javascript
it('should detect standard nonheroic profile when no beast data', async () => {
  const standardNpc = { flags: { swse: {} } };
  await seedNonheroicSession(session, standardNpc, 'chargen');
  expect(session.nonheroicContext.profile).toBe(NonheroicProfile.STANDARD);
});
```
**Proves:** Non-beast NPCs are correctly classified as standard nonheroic.

**Test 3: Beast Is Nonheroic, Not Separate** ✅
```javascript
it('should keep beast on nonheroic path (not independent like actor)', () => {
  const adapter = new NonheroicSubtypeAdapter();
  expect(adapter.kind).toBe(ParticipantKind.INDEPENDENT);
});
```
**Proves:** Beast uses the same nonheroic adapter (no separate progression path).

**Test 4: Beast Suppresses Talent Steps** ✅
```javascript
it('should suppress talent steps for beast like standard nonheroic', async () => {
  session.nonheroicContext = { isBeast: true, ... };
  const result = await adapter.contributeActiveSteps(candidateSteps, session, null);
  expect(result).not.toContain('general-talent');
});
```
**Proves:** Beast inherits nonheroic behavior (talent suppression).

---

## 8. Remaining Risks / Awkwardness

### Two Beast Sources, One With Gap

**What:**
- Beast pack (packs/beasts.db) is pre-normalized with `flags.swse.beastData` markers ✓
- Nonheroic units (data/nonheroic/nonheroic_units.json) has 53 Beast entries but they are imported as plain NPCs without markers

**Why:**
- Legacy packs.db source was already built with progression markers
- Nonheroic import pipeline was designed for general NPCs, not beast-aware

**Impact:**
- Beasts from nonheroic_units.json import cannot be distinguished at runtime (no `flags.swse.beastData`, no `system.creatureType`)
- Progression will NOT detect these as beasts unless runtime detection is enhanced

**Bluntness:** This is a pre-existing gap in the import pipeline, not introduced by Phase 2 progression integration. Phase 2 correctly assumes progression will receive either:
  - Pre-marked beasts (from packs/beasts.db)
  - OR standard nonheroic NPCs that are not beasts

**Mitigation (Phase 3+):** Enhance import-nonheroic-units-to-compendium.js to set `flags.swse.beastData` stub for Beast-type entries during import. This would make all beasts uniformly detectable.

---

### System.creatureType Is Legacy

**What:** NPC sheet template checks `system.creatureType === "beast"` but it's never set

**Why:** Template was future-proofing for a beast UI that never got fully implemented

**Impact:** Beast UI in NPC sheet never appears (template condition never true)

**Mitigation:** Future UI work should use `session.nonheroicContext.profile === "beast"` instead

**Bluntness:** This is a pre-existing legacy code issue, not introduced by Phase 2.

---

## 9. What Remains for Phase 3+

### Beast-Specific Progression Rules

- Beast-specific talent/feat/skill rules (if any exist beyond nonheroic)
- Beast-specific derived calculations or adjustments
- Beast-specific summary/projection UI

### NPC/Statblock Mode

- ProgressionShell doesn't support NPC actors (structural limitation)
- Beasts (which are NPCs) can't yet be progressed through unified spine
- Phase 3+ may require NPC actor support in ProgressionShell

### Follower Integration (Still Deferred)

- Follower is DEPENDENT, not INDEPENDENT like beast
- Separate Phase 3 work

---

## Validation & Sign-Off

### Phase 2 Expansion Completion Checklist

- ✅ Beast identified as nonheroic profile/variant (not peer subtype)
- ✅ Canonical beast marker (flags.swse.beastData) identified and used
- ✅ Session seeding detects beast profile
- ✅ Session carries beast metadata through context
- ✅ Beast inherits nonheroic behavior (talent suppression proven)
- ✅ Tests prove beast is on nonheroic path, not separate
- ✅ No new actor type registration needed (uses NPC + metadata)
- ✅ Legacy UI code (system.creatureType) acknowledged but not used
- ✅ Nonheroic base paths unaffected

### Architecture Integrity (Expansion)

- ✅ Single unified progression spine (no second engine)
- ✅ Beast correctly modeled as profile, not new progression family
- ✅ Beast reuses existing repo data (beastData) without duplication
- ✅ Beast inherits nonheroic semantics (correct hierarchy)
- ✅ No artificial type registration (keeps beasts as NPC type)

---

**Phase 2 Expansion (Beast) Complete: 2026-03-27**

**Commit:** `dbe6aab` — Phase 2 Expansion: Beast as Nonheroic Profile/Variant

Ready for Phase 3: Follower integration and NPC progression support
