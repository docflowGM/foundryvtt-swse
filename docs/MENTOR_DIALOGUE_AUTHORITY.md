# Mentor Dialogue Authority Architecture

## Overview

This document defines the canonical architecture for mentor guidance across the SWSE Foundry chargen/progression system. It establishes **who owns what data** and **how to access it correctly**.

## The Rule

**INSTRUCTIONS come from dialogue JSON files. RECOMMENDATIONS come from the suggestion engine.**

Do not mix them. Do not hardcode either.

---

## 1. Mentor Dialogue Authority (Instructions)

### Source
- Directory: `data/dialogue/mentors/{mentor_id}/`
- Files: `{mentor_id}_dialogue.json` (or `{mentor_id}_dialogues.json`)
- Contains: Voice, character philosophy, guidance for each choice type

### Guidance Fields (Required)
All mentors MUST have these 11 guidance fields:
1. `species` - What species means to this mentor
2. `class` - How to pick a class
3. `background` - Perspective on character history
4. `talents` - How to select talents
5. `abilities` - Views on ability scores
6. `skills` - Importance of skills
7. `languages` - Value of communication
8. `multiclass` - Multi-classing philosophy
9. `forcePowers` - Force power selection
10. `hp` - Health/durability perspective
11. `summary` - Final confirmation philosophy

### Example
```json
{
  "mentor_id": {
    "guidance": {
      "species": "Your species shapes your potential...",
      "class": "Pick what feels right in your hands...",
      ...
    }
  }
}
```

### Access Pattern
```javascript
import { getStepGuidance } from './mentor-step-integration.js';

// In step plugin getMentorContext():
getMentorContext(shell) {
  return getStepGuidance(shell.actor, 'step-id') || 'Fallback text';
}

// Step IDs map to guidance fields via STEP_TO_CHOICE_TYPE:
const STEP_TO_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
  'background': 'background',
  'languages': 'languages',
  // ... see mentor-step-integration.js for complete mapping
};
```

---

## 2. Suggestion Engine + Advisory Stub (Recommendations)

### Components
1. **Suggestion Engine**: Logic that analyzes the actor's build and produces recommendations
   - Location: `scripts/engine/progression/` (various engine files)
   - Example: `ForcePowerEngine`, `TalentEngine`, etc.
   - Responsibility: Pure analysis and filtering logic

2. **Advisory Stub**: Templates that wrap recommendations in mentor voice
   - Location: `data/dialogue/mentors/{mentor_id}/{mentor_id}_advisory_stub.json`
   - Contains: Message templates with `{recommendation}` placeholders
   - Example: "Ah, I suggest {recommendation} - it suits your style."

### Access Pattern
```javascript
// Engine produces raw recommendation
const recommendation = engine.analyze(actor);

// Advisory stub wraps it in mentor voice
const message = mentorStub.format(recommendation);

// Display to user
await shell.mentorRail.speak(message, 'context');
```

### Never Do This
```javascript
// ❌ WRONG: Hardcoded "Ask Mentor" response
getMentorContext(shell) {
  return 'I recommend you pick the talent that makes you invisible.';
}

// ✓ RIGHT: Engine + template
const recommendation = talentEngine.suggestFor(actor);
const message = advisory.format(recommendation);
```

---

## 3. Step Plugin Compliance

### Required Pattern
Every step plugin MUST follow this pattern:

```javascript
// ✓ Import dialogue authority functions
import {
  getStepGuidance,
  handleAskMentor
} from './mentor-step-integration.js';

export class MyStep extends ProgressionStepPlugin {
  // ✓ getMentorContext uses getStepGuidance
  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'step-id')
      || 'Fallback for missing guidance';
  }

  // ✓ getMentorMode declares interaction style
  getMentorMode() {
    return 'context-only'; // or 'context-and-ask'
  }

  // ✓ Ask Mentor button calls handleAskMentor
  async onAskMentorClick(shell) {
    await handleAskMentor(shell.actor, 'step-id', shell);
  }
}
```

### Step Mode Declarations
- `context-only`: Mentor provides context/guidance only. No "Ask Mentor" button.
- `context-and-ask`: Mentor provides context + "Ask Mentor" button for recommendations.

---

## 4. Audit Checklist

### Mentor Dialogue Files
- [ ] All 33 mentors have all 11 guidance fields
- [ ] Each field uses the mentor's consistent voice
- [ ] No hardcoded step-specific logic in guidance

### Step Plugins (17 total)
Check each step plugin:
- [ ] Imports `getStepGuidance, handleAskMentor` from mentor-step-integration.js
- [ ] `getMentorContext()` uses `getStepGuidance(actor, 'step-id')`
- [ ] `getMentorMode()` is declared (context-only or context-and-ask)
- [ ] No hardcoded mentor text (except fallbacks)
- [ ] Ask Mentor button (if any) calls `handleAskMentor()`

### Auto-Generated Data Files
- [ ] `mentor-dialogues.data.js` exists and includes all guidance fields
- [ ] Regenerated after mentor dialogue updates

---

## 5. Maintenance

### When Adding a New Mentor
1. Create `data/dialogue/mentors/{new_id}/{new_id}_dialogue.json`
2. Include all 11 guidance fields with mentor-specific voice
3. Create `{new_id}_advisory_stub.json` for recommendations
4. Update `MENTORS` export in mentor-dialogues.js
5. Run `node scripts/maintenance/generate-mentor-dialogues-data.js`

### When Adding a New Step
1. Determine if it needs mentor guidance (usually yes)
2. Identify the step ID and add to STEP_TO_CHOICE_TYPE mapping
3. Import and use `getStepGuidance(actor, 'step-id')`
4. Declare `getMentorMode()`

### When Updating Mentor Guidance
1. Edit dialogue JSON files
2. Run `node scripts/maintenance/generate-mentor-dialogues-data.js`
3. Verify in `mentor-dialogues.data.js`

---

## 6. Validation

### Check All Mentors
```bash
node scripts/validation/check-mentor-guidance-fields.js
```

### Check All Step Plugins
```bash
node scripts/validation/check-step-mentor-compliance.js
```

---

## Status (2026-03-26)

### ✓ Complete
- All 33 mentors have all 11 guidance fields
- 8 step plugins follow correct pattern
- Mentor dialogue authority documented

### In Progress
- Update 9 remaining step plugins to use `getStepGuidance()`
- Create automated compliance validation

---

## References

- `scripts/apps/progression-framework/steps/mentor-step-integration.js` - Core integration functions
- `scripts/apps/progression-framework/steps/class-step.js` - Example of correct pattern
- `data/mentor-dialogues.json` - Central mentor data source
- `data/dialogue/mentors/*/` - Individual mentor dialogue files
