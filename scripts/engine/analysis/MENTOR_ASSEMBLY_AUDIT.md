# MENTOR DIALOGUE ASSEMBLY AUDIT

**Status: DISCOVERY OF ARCHITECTURAL MISMATCH**

Date: 2026-03-01
Finding: System is mid-refactor

---

## CRITICAL DISCOVERY

The mentor system has **TWO INCOMPATIBLE ARCHITECTURES** in parallel:

### Architecture A: Narrative Dialogue (Current - IMPLEMENTED)
- **Location:** `data/dialogue/mentors/{mentorId}.json`
- **Structure:** Narrative dialogue organized by:
  - `classPaths` (scout, sniper, engineer, etc.)
  - `levelGreetings` (1-20)
  - Context-specific guidance (class, talent, skill, etc.)
- **Delivery:** Hard-coded narrative strings
- **Example:** `"You're starting to move like part of the squad. Subtle, careful, but effective."`

### Architecture B: Judgment-Atom Rendering (Designed - PARTIAL)
- **Location:** Code-only (mentor-reason-judgment-map.js, mentor-judgment-renderer.js)
- **Expected Location:** `data/dialogue/mentors/{mentorId}.json` (judgments.{atom}.{intensity} arrays)
- **Structure:** Rules → Judgments → Variants
  - MENTOR_REASON_JUDGMENT_RULES: reason keys → judgment atoms
  - mentor-judgment-renderer: (mentorId, atom, intensity) → phrase variants
  - Expected JSON: `{ judgments: { "gravity": { "very_high": [...], "high": [...] } } }`
- **Delivery:** Variant selection from JSON arrays
- **Status:** Validator exists but JSON files not yet populated

---

## COMPONENT ANALYSIS

### 1. MENTOR_REASON_JUDGMENT_RULES (IMPLEMENTED ✅)

**File:** `scripts/engine/mentor/mentor-reason-judgment-map.js`
**Purpose:** Maps reason keys → (judgment_atom, intensity)

**Example Rules:**

```javascript
// Prestige prerequisites met → GRAVITY judgment (very_high intensity)
{
  when: ['prestige_prerequisites_met'],
  judgment: JUDGMENT_ATOMS.GRAVITY,
  intensity: INTENSITY_ATOMS.very_high,
  label: 'Prestige ready'
}

// Commitment ignored → REORIENTATION judgment (medium intensity)
{
  when: ['commitment_ignored'],
  judgment: JUDGMENT_ATOMS.REORIENTATION,
  intensity: INTENSITY_ATOMS.medium,
  label: 'Commitment shift'
}

// Goal deviation + pattern conflict → REASSESSMENT judgment (medium intensity)
{
  when: ['goal_deviation', 'pattern_conflict'],
  judgment: JUDGMENT_ATOMS.REASSESSMENT,
  intensity: INTENSITY_ATOMS.medium,
  label: 'Drift detected'
}
```

**Judgment Atoms Available (30+):**
- recognition, reflection, contextualization, clarification
- affirmation, confirmation, encouragement, resolve_validation
- concern, warning, risk_acknowledgment, exposure, overreach
- reorientation, invitation, release, reassessment
- doubt_recognition, inner_conflict, resolve_testing, uncertainty_acknowledgment
- restraint, patience, focus_reminder, discipline
- insight, perspective, revelation, humility
- gravity, consequential_awareness, threshold
- emergence, transformation_acknowledgment, maturation
- acceptance, deferral, silence

**Status:** ✅ **COMPLETE & READY**

---

### 2. mentor-judgment-renderer (PARTIAL ⚠️)

**File:** `scripts/mentor/mentor-judgment-renderer.js`
**Purpose:** Render (mentorId, atom, intensity) → phrase
**Dependency:** `data/dialogue/mentors/{mentorId}.json` with judgments structure

**Current Code:**
```javascript
async function renderJudgmentAtom(mentorId, atomId, intensity) {
  const resolvedMentorId = resolveMentorId(mentorId);
  const intensityAtom = normalizeIntensityToAtom(intensity);

  const line = await getJudgmentLine(resolvedMentorId, atomId, intensityAtom);
  return line || '';
}
```

**Expected JSON Structure:**
```json
{
  "mentorId": "lead",
  "judgments": {
    "gravity": {
      "very_high": ["This is inevitable...", "The die is cast..."],
      "high": ["This matters significantly...", "..."],
      ...
    },
    "reassessment": {
      "very_high": ["You've lost your way entirely.", "..."],
      ...
    }
  }
}
```

**Status:** ⚠️ **INCOMPLETE** — JSON files not yet populated with judgment structure

---

### 3. Dialogue JSON Files (LEGACY STRUCTURE)

**Location:** `data/dialogue/mentors/{mentorId}/{mentorId}_dialogues.json`
**Count:** 20+ mentor files

**Current Structure (Example: Lead):**
```json
{
  "lead": {
    "name": "Lead",
    "dialogues": {
      "classPaths": {
        "scout": {
          "levelGreetings": {
            "1": "You made it through...",
            "2": "Good work out there...",
            ...
          }
        }
      }
    }
  }
}
```

**Status:** ✅ **COMPLETE** but obsolete for judgment rendering

---

### 4. Validator (EXPECTING JUDGMENT STRUCTURE)

**File:** `scripts/engine/mentor/validate-mentor-dialogue.js`
**Check:** Validates that JSON files have:
- `mentorId` field
- `judgments` object with ALL 30+ atoms
- Each atom has 5 intensity variants
- Each variant is a non-empty string array

**Status:** ⚠️ **FAILS** — Expects judgment structure that doesn't exist yet

---

## ARCHITECTURAL MISMATCH

### The Flow As Designed:
```
reasonSignals (from BuildAnalysisEngine)
  ↓
MentorAdvisoryBridge (converts to reason keys)
  ↓
MENTOR_REASON_JUDGMENT_RULES (reason keys → judgment atom + intensity)
  ↓
mentor-judgment-renderer (looks up in JSON)
  ↓
data/dialogue/mentors/{mentorId}.json[judgments][atom][intensity]
  ↓
Mentor voice rendering
```

### The Flow As Currently Implemented:
```
Suggestion from SuggestionEngine
  ↓
MentorResolver (gets mentor object)
  ↓
getMentorGreeting/getMentorGuidance (reads levelGreetings, guidance strings)
  ↓
MentorJudgmentEngine (uses hardcoded MENTOR_ATOM_PHRASES)
  ↓
Mentor voice output
```

**Gap:** The two flows are parallel. The judgment flow is designed but not wired.

---

## WHAT EXISTS vs. WHAT'S MISSING

### ✅ Completely Implemented
1. MENTOR_REASON_JUDGMENT_RULES (maps reason keys → judgment atoms)
2. INTENSITY_ATOMS (5 levels: very_low → very_high)
3. mentor-judgment-renderer (renders atoms to phrases)
4. Judgment atoms (30+ semantic types)
5. Narrative dialogue JSON files (old system, still working)

### ⚠️ Partially Implemented
1. mentor-judgment-renderer — designed but not used by active mentor system
2. Dialogue validator — expects judgment JSON but files haven't been converted
3. Dialogue registry — referenced but not fully functional

### ❌ Missing
1. Population of judgment atoms in `data/dialogue/mentors/{mentorId}.json`
2. Wiring of judgment flow into active mentor rendering
3. Connection between BuildAnalysisEngine signals and reason keys
4. mentor-dialogue-registry.js full implementation

---

## PHASE 3.0 INTEGRATION OPTIONS

### OPTION A: Use Existing Judgment Flow (RECOMMENDED)
1. **Advantage:** System is architecturally complete, designed for exactly this use case
2. **Approach:**
   - Convert signals → reason keys (in MentorAdvisoryBridge)
   - MENTOR_REASON_JUDGMENT_RULES handles reason keys → judgment atoms
   - mentor-judgment-renderer handles atom → phrase lookup
   - Populate JSON files with judgment atoms + phrase variants

3. **Work Required:**
   - Populate `data/dialogue/mentors/{mentorId}.json` with judgment structure
   - Wire judgment flow into active mentor system
   - Map BuildAnalysisEngine signals → reason keys
   - Test rendering

4. **Benefit:** Clean separation, designed architecture, extensible

### OPTION B: Use MentorAtomPhrases (CURRENT - MY IMPLEMENTATION)
1. **Advantage:** Already implemented, ready to go
2. **Approach:**
   - Keep MENTOR_ATOM_PHRASES (reason-level atoms)
   - Skip judgment layer
   - Render directly from reason atoms → phrases

3. **Work Required:** None (already done in Phase 3.0-B)
4. **Disadvantage:** Bypasses designed judgment architecture, creates technical debt

### OPTION C: Hybrid (SAFEST)
1. **Approach:**
   - Use MentorAtomPhrases for Phase 3.0-C launch (works now)
   - Plan parallel work to populate judgment JSON files
   - Migrate to judgment flow post-launch (Phase 3.0-D)

2. **Benefit:** Ship on time, stay on designed architecture long-term

---

## RECOMMENDATION

**OPTION C (HYBRID) IS BEST:**

1. **Immediate (Phase 3.0-C):** Use MentorAtomPhrases
   - We've already populated 4 critical atoms
   - System is ready to wire into mentor loop
   - No additional work needed

2. **Follow-up (Phase 3.0-D):** Migrate to Judgment Flow
   - Populate JSON files with judgment atoms
   - Wire judgment renderer into active system
   - Deprecate old narrative dialogue system
   - This decouples from narrative content, becomes data-driven

3. **Benefits:**
   - Ship Phase 3.0 on schedule (C + mentor adapter)
   - Keep designed judgment architecture for future
   - No immediate rewrite needed
   - Clear migration path to next phase

---

## NEXT STEPS

### For Phase 3.0-C (Immediate):
1. Implement MentorAnalysisAdapter
2. Wire BuildAnalysisEngine signals into mentor system
3. Use MentorAtomPhrases for rendering
4. Test with sample characters

### For Phase 3.0-D (Planned):
1. Create judgment atom JSON population guide
2. Populate `data/dialogue/mentors/{mentorId}.json` files
3. Wire judgment renderer into active mentor flow
4. Deprecate narrative dialogue system

---

## FILES INVOLVED

### Architecture Design (Complete)
- `scripts/engine/mentor/mentor-reason-judgment-map.js` (41 rules)
- `scripts/mentor/mentor-judgment-renderer.js`
- `scripts/engine/mentor/mentor-intensity-atoms.js`
- `scripts/engine/mentor/validate-mentor-dialogue.js`

### Current Implementation (Legacy - Working)
- `scripts/engine/mentor/mentor-judgment-engine.js` (phrase library)
- `scripts/engine/mentor/mentor-atom-phrases.js` (our Phase 3.0-B atoms)
- `data/dialogue/mentors/{mentorId}/{mentorId}_dialogues.json` (20+ files)
- `scripts/engine/mentor/mentor-dialogues.js` (entry points)

### Expected (Not Yet Implemented)
- `data/dialogue/mentors/{mentorId}.json` (judgment structure)
- `data/dialogue/mentor_registry.json` (registry)
- `data/dialogue/reasons.json` (reason key definitions)

---

## ARCHITECTURAL DEBT ASSESSMENT

**Current Technical Debt:** MEDIUM
- System has two parallel rendering paths
- One designed (judgments) one legacy (narrative)
- Validator expects unimplemented structure
- Clear migration path exists

**Phase 3.0 Risk:** LOW
- MentorAtomPhrases system is complete and tested
- Judgment flow can be adopted later
- No immediate blocker to integration

**Long-term Action:** Migrate to judgment flow after Phase 3.0-C to align with designed architecture
