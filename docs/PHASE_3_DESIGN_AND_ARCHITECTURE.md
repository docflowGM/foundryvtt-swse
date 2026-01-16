# Phase 3: Design & Architecture Lock

**Commitment Level:** Architecture frozen. UI implementation proceeds with locked vision.

**Target Audience:** Mentors and players building Star Wars Saga Edition characters over campaign progression.

---

## I. Purpose & Strategic Shift

### Phase 2 → Phase 3: From Explainability to Identity

**Phase 2** built the engine's learning capacity:
- Detects player archetype from behavior
- Identifies build pivots and explorations
- Generates context-aware one-sentence explanations

**Phase 3** shifts focus to *character relationship*:
- Mentor recognizes player's identity through dialogue
- Suggests aligned with revealed archetypal identity
- Reacts to pivots with natural mentorship language
- Creates sense of mentor "knowing" the player over time

### Why This Matters

Early game: "I have ideas for your character."
Mid game: "I see where you're going—this fits perfectly."
Late game: "I've watched you develop into a formidable [Archetype]. Here's my advice."

The mentor becomes *a character who has observed the player*, not a system that scores options.

---

## II. Mentor Tone Evolution

### Early Game (Levels 1-4): Exploratory Guide

**Anchor State:** None or Proposed
**Mentor Voice:** "Let me help you explore"

```
"Power Attack is a strong opening move for any combatant."
"Weapon Finesse could let you use dexterity in fights—interesting choice."
"Force Sensitivity opens Force paths if you're interested in exploring that direction."
```

**Characteristics:**
- Permissive and encouraging of variety
- Acknowledges all choices as viable
- No strong opinion yet (mentor is learning alongside player)
- One option per level (simple, not overwhelming)

**Design Goal:** Build trust. Never judge early exploration.

---

### Mid Game (Levels 5-9): Mentor with Insight

**Anchor State:** Proposed or Locked
**Mentor Voice:** "I'm seeing a pattern here"

```
"You've been building a strong melee character. Cleave fits naturally."
"I notice you're drawn to Force abilities. Let me suggest something that deepens that."
"Your focus is becoming clear: a battlefield leader. Here's something that builds on that."
```

**Characteristics:**
- Acknowledges detected archetype explicitly
- Provides suggestions aligned with identity
- May note departures from established pattern
- Still permissive if player diverges
- Customized suggestions (reflects actual history)

**Design Goal:** Mentor recognition creates emotional investment.

---

### Late Game (Levels 10+): Trusted Advisor

**Anchor State:** Locked (possibly with active pivots)
**Mentor Voice:** "As your advisor, I recommend"

```
"You're a masterful [Archetype]. This choice deepens that mastery."
"I know your strengths are in [Domain]. This could be interesting if you pivot."
"You've built a solid foundation. This takes it further."
```

**Characteristics:**
- Treats player as established identity
- Offers strategic advice based on arc
- Acknowledges late-game pivots with context
- More sophisticated language (assumes player understanding)
- Warns about opportunity cost in late game

**Design Goal:** Mentor feels like a campaign-long companion.

---

## III. Player Controls: What/Why/Why Not

### The Mentor Never Tells, Only Suggests

**Core Rule:** The mentor operates within these boundaries:

1. **What the mentor DOES:**
   - Suggest one option per level-up
   - Explain how it fits the detected archetype
   - Acknowledge exploration/pivoting with understanding
   - Soften language when player is exploring
   - Add warnings when choices conflict with established identity (level 5+)

2. **What the mentor DOES NOT:**
   - Prevent player choices (no enforcement)
   - Express disappointment at divergence
   - Lock player into a single build path
   - Use mathematical language ("0.7 confidence", "synergy score")
   - Suggest multiple competing options (analysis paralysis)

3. **What players CONTROL:**
   - Every build choice (the mentor advises, not mandates)
   - When to accept or reject suggestions
   - Whether to explore or specialize
   - When to pivot to new archetype
   - How much to trust the mentor

### Why This Philosophy

The mentor is a *fellow traveler*, not a *gatekeeper*. This preserves:
- Player agency (no invisible rails)
- Character agency (player owns their build)
- Mentor credibility (earned through accuracy, not enforcement)

---

## IV. Dialogue Philosophy

### One Sentence, Every Time

**Rule:** Every mentor suggestion is **exactly one sentence**.

Why?
- Respects player reading time at level-up
- Forces clarity (can't hide behind verbosity)
- Feels like natural conversation (mentor speaks one thought at a time)
- Mobile/console friendly (fits small screens)

### Conversational, Never Technical

**Mentor speaks as a character**, not as a system:

❌ "Force sensitivity synergizes with your established archetype (p=0.8)"
✓ "Force sensitivity opens new paths for you"

❌ "Opportunity cost identified: -15% melee effectiveness"
✓ "This trades away from your melee strength"

❌ "Confidence level: Suggested (0.65)"
✓ "This supports your developing direction"

### Acknowledge History, Not Stats

**Mentor remembers choices, not numbers:**

✓ "You've selected three melee feats—this continues that"
✓ "I've noticed you exploring both melee and Force"
✓ "Your Force abilities are shaping up nicely"

❌ "Theme consistency: 0.73"
❌ "Archetype match: 87%"
❌ "History bias: +0.12"

---

## V. Dialogue Examples

### Early Game Anchor Not Yet Detected

```
Level 2 | Player selects: "Dodge"
Mentor: "Dodge is a solid choice for staying alive in combat."

Level 3 | Player selects: "Weapon Focus (Lightsaber)"
Mentor: "Weapon Focus with a lightsaber—a strong commitment to melee."

Level 4 | Player selects: "Force Sensitivity"
Mentor: "Interesting—you're exploring Force paths too."
```

*Note: No judgment. Mentor is learning what this player values.*

---

### Mid Game Anchor Proposed → Locked

```
Level 5 | Anchor proposed: "melee"
Player selects: "Cleave"
Mentor: "You're building a strong melee character. Cleave fits naturally."

Level 6 | Anchor still proposed. Player selects: "Improved Defenses"
Mentor: "Defense is wise. That said, your melee strength is becoming clear."

Level 7 | Player confirms anchor (UI interaction)
Mentor: "I've seen your commitment to melee combat. Here's something to deepen that."
Player selects: "Great Cleave"
Mentor: "This caps off your melee mastery perfectly."
```

*Note: Mentor acknowledges pattern once locked, gives more targeted advice.*

---

### Pivot Detection & Acknowledgment

```
Level 8 | Anchor: "melee" (locked)
Player selects 3 Force abilities in a row
Pivot state transitions: STABLE → EXPLORATORY

Level 10 | Player selects "Force Burst"
Mentor: "I see you're exploring Force abilities—this could work well."

Level 11 | Player selects "Force Control"
Mentor: "Your Force potential is becoming interesting. This deepens it."

Level 12 | Pivot state transitions: EXPLORATORY → PIVOTING (Force as emerging theme)
Mentor: "You're shifting toward Force abilities. This continues that path."
```

*Note: Tone softens during exploration, acknowledges shift matter-of-factly during pivot.*

---

### Late Game: Established Identity + New Warnings

```
Level 14 | Anchor: "force_dps" (locked)
Player selects: "Skill Focus"
Mentor: "You're a master of Force combat. Skill Focus diverges from that strength."

Level 15 | Player selects: "Deception"
Mentor: "Social skills don't fit your Force expertise, though they could surprise an opponent."

Level 18 | Player selects: "Force Slam"
Mentor: "You've become formidable with Force abilities. This elevates that mastery."
```

*Note: Warnings are soft ("doesn't fit") not hard ("mistake"). Still permissive of exploration.*

---

### Transition Between Anchors (Pivot Complete)

```
Level 12 | Previous anchor: "melee" (locked)
Pivot state: PIVOTING (emerging theme: "force")
Player selects 5+ Force abilities

Level 15 | Detection system locks new anchor: "force_dps"
Old anchor released, new anchor confirmed
Mentor: "You've committed to the Force path. Here's something that deepens that."
Player selects: "Force Surge"
Mentor: "Perfect. This builds on your Force foundation."
```

*Note: Mentor treats new anchor as established, without apologizing for previous melee focus.*

---

## VI. System Architecture

### Core Classes (Phase 3 ES Modules)

All three classes are **framework-agnostic**, designed for testability:

#### `BuildIdentityAnchor`
```javascript
new BuildIdentityAnchor()
  .update(recentThemes)      // Detects archetype, manages state
  .confirm()                 // Player locks their identity
  .hasWeight()               // Is this anchor active?
  .hasEmergingPivot(theme)   // Potential pivot?
```

**States:** NONE → PROPOSED → LOCKED → WEAKENING → RELEASED

**Data Flow:** `recentThemes` (array) → state transitions → `archetype`, `consistency`

---

#### `PivotDetector`
```javascript
new PivotDetector(anchorArchetype)
  .update(recentThemes)      // Calculates divergence, manages state
  .confirmPivot(newArchetype) // Locks emerging pivot
  .isActive()                // Is exploration/pivoting happening?
  .hasEmergingTheme()        // Is there a clear new direction?
```

**States:** STABLE → EXPLORATORY → PIVOTING (or back to STABLE)

**Data Flow:** `recentThemes` + `anchorArchetype` → divergence score → state transitions

---

#### `SuggestionExplainer`
```javascript
SuggestionExplainer.explain(suggestion, context, reasons)
  // Generates one-sentence explanation
  // Input: { itemName, theme }
  // Context: { anchorState, archetypeName, pivotState, level }
  // Output: "This fits your [Archetype] direction."
```

**Tone Shifts:**
- `anchorState`: "locked" → confident, "proposed" → hopeful, null → permissive
- `pivotState`: "exploratory" → soft, "pivoting" → acknowledging
- `level`: 1-4 → encouraging, 5-9 → strategic, 10+ → advisory

---

### Integration Pattern: Foundry Adapter Layer

Phase 3 classes are **pure logic**. Integration with Foundry happens via thin adapter:

```javascript
// Phase 3 (pure logic, testable)
const anchor = new BuildIdentityAnchor();
anchor.update(recentThemes);

// Adapter (Foundry integration, thin)
actor.system.suggestionEngine.anchors.primary = {
  state: anchor.state,
  archetype: anchor.archetype,
  consistency: anchor.consistency,
  confirmed: anchor.confirmed
};
```

**Benefits:**
- Core logic has zero Foundry dependencies
- Easy to unit test without mocking actor
- Easy to port to other systems later
- Clear separation: logic vs. integration

---

## VII. Implementation Roadmap

### Phase 3A: Mentor Dialog UI
**Goal:** Display mentor explanation at level-up

**Deliverables:**
- Mentor dialog template (render context from locked anchor/pivot)
- One suggestion per level-up
- Player action: [Accept] [Reject] [Ask Why?]
- Visual indicator: archetype recognition (unlocks after anchor locks)

**No changes to logic**. Pure UI.

---

### Phase 3B: Mentor Reactions & Contextual Acknowledgment
**Goal:** Show mentor "reacting" to player choices over time

**Deliverables:**
- Mentor portrait/emote changes as anchor locks
- Dialogue variations based on anchor state progression
- Explicit text: "I see a pattern" when PROPOSED → "I see you've become..." when LOCKED
- Exploration acknowledgment: "I see you're exploring" when pivot enters EXPLORATORY

**Minor logic expansion:**
- Track "first time anchor locked" for dialogue variation
- Milestone markers (level thresholds for tone shifts)

---

### Phase 3C: Advanced Mentor Features
**Goal:** Deepen mentorship relationship across entire campaign

**Deliverables:**
- Mentor backstory/flavor text (conditional on player archetype)
- Dialogue that references specific feats/talents the player has selected
- "Remember when you first selected [item]? Look how far you've come."
- End-of-campaign "retrospective" mentor commentary
- Optional: Let mentor be "disappointed" or "proud" based on pivot/anchor behavior

**New features:**
- Mentor mood/relationship tracker
- Historical callback system
- Narrative branching (mentor tone shifts based on player decisions)

---

## VIII. Constraints & Decisions Locked

✅ **Locked:** One suggestion per level-up (no analysis paralysis)
✅ **Locked:** One sentence, every time (clarity & respect)
✅ **Locked:** Mentor never mandates (player controls all decisions)
✅ **Locked:** No math in dialogue (mentor speaks as character)
✅ **Locked:** Tone shifts with level (early/mid/late game)
✅ **Locked:** Phase 3 classes are framework-agnostic (testable)
✅ **Locked:** Foundry integration via thin adapter (clean separation)

---

## IX. Success Criteria

**Phase 3 succeeds when:**

1. **Mentor feels like a character** who learns the player over time
2. **Suggestions feel personalized** based on actual build history
3. **Dialogue feels conversational** (no system language, no math)
4. **Players feel "seen"** by the mentor (not judged, just observed)
5. **Pivots feel natural** (mentor acknowledges direction changes with understanding)
6. **Late-game advice feels strategic** (mentor treats player as established identity)

**Failure modes to avoid:**
- ❌ Mentor sounds like a system ("confidence level: 0.7")
- ❌ Mentor judges exploration ("why did you pick that?")
- ❌ Mentor gives multiple suggestions (analysis paralysis)
- ❌ Player feels railroaded ("the mentor wants me to do X")
- ❌ Dialogue feels generic (not rooted in actual history)

---

## X. Notes for Phase 3A UI Implementation

When building Phase 3A mentor dialog UI, remember:

1. **Mentor is a character**, not a system output
   - Consider tone of voice in UI (portrait, emotes, text color)
   - Mentor should feel alive, not mechanical

2. **Dialogue must be centered**, not squeezed into corners
   - This is the mentor's moment to speak
   - Give it visual weight

3. **Keep the suggestion simple**
   - Show suggested item name + archetype context
   - One sentence explanation
   - Accept/Reject buttons (optional: "Why?" for power users)

4. **Visual indicators should be clear**
   - Show when anchor locks (big moment for player)
   - Show pivot transitions (mentor acknowledges shift)
   - Don't overwhelm—UI should be clean

5. **Respect the one-per-level rule**
   - Never show multiple suggestions
   - If mentor has nothing to say this level, that's OK—show flavor text instead

---

## XI. Appendix: Theme-to-Archetype Mapping

```javascript
THEME_TO_ARCHETYPE = {
  'melee': ['Frontline Damage Dealer', 'Assassin / Stealth'],
  'force': ['Force DPS', 'Force Control'],
  'ranged': ['Sniper / Ranged', 'Assassin / Stealth'],
  'stealth': ['Assassin / Stealth', 'Sniper / Ranged'],
  'social': ['Face / Social Manipulator', 'Battlefield Controller'],
  'tech': ['Tech Specialist', 'Skill Monkey'],
  'leadership': ['Battlefield Controller', 'Face / Social Manipulator'],
  'support': ['Force Control', 'Battlefield Controller'],
  'combat': ['Frontline Damage Dealer', 'Battlefield Controller'],
  'exploration': ['Skill Monkey', 'Sniper / Ranged'],
  'vehicle': ['Sniper / Ranged', 'Tech Specialist'],
  'tracking': ['Sniper / Ranged', 'Skill Monkey']
};

ARCHETYPE_NAMES = {
  'frontline_damage': 'Frontline Damage Dealer',
  'force_dps': 'Force DPS',
  'force_control': 'Force Control',
  'sniper': 'Sniper / Ranged',
  'assassin': 'Assassin / Stealth',
  'face': 'Face / Social Manipulator',
  'controller': 'Battlefield Controller',
  'tech_specialist': 'Tech Specialist',
  'skill_monkey': 'Skill Monkey'
};
```

---

## XII. Commit Message

```
Phase 3: Architecture & Design Lock

Core vision locked for UI implementation:
- Mentor recognizes player identity through dialogue
- One suggestion per level-up (no analysis paralysis)
- Tone shifts with character level (early/mid/late game)
- Mentor acknowledges pivots naturally (not judgmentally)
- All dialogue is one sentence, conversational, in-character
- Phase 3 classes are framework-agnostic (testable)
- Foundry integration via thin adapter layer

Three clean ES modules:
- BuildIdentityAnchor: Detects & manages anchor lifecycle
- PivotDetector: Detects & manages build direction changes
- SuggestionExplainer: Generates contextual mentor dialogue

Design document captures tone evolution, dialogue philosophy,
and implementation roadmap through Phase 3C.

Ready for Phase 3A UI implementation with locked architecture.
```

---

**Status:** Architecture Frozen ✅
**Next Step:** Phase 3A - Mentor Dialog UI Implementation
**Condition:** No logic changes until Phase 3A UI is complete
