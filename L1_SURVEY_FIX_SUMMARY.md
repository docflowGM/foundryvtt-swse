# L1 Survey Fixes - Complete Implementation

## Overview
Fixed critical state management bugs in the L1 Survey step where class changes didn't invalidate survey answers, player answers couldn't be modified, and survey bias poisoned downstream recommendations. Also improved visual presentation and added translation animation.

## Problems Solved

### BAD 1: L1 Survey Not Class-Scoped ✅
**Problem**: When a player changed their class (e.g., Jedi → Scout), old survey answers and mentor bias persisted, driving incorrect recommendations.

**Solution**: Added class-scope detection in `onStepEnter()`:
- Track `_activeSurveyClassKey` to detect class changes
- Automatically call `_resetSurveyForClassChange()` when class differs
- Clear all survey data, bias, session selections, and committed state
- Diagnostics logged when reset occurs

**Files Modified**:
- `l1-survey-step.js`: Added class change detection and reset logic

---

### BAD 2: Cannot Change Survey Answers ✅
**Problem**: Once an answer was selected and moved to response phase, there was no way to change it. Players were locked into their choices.

**Solution**: Added three new player actions:

1. **Change Answer** (response phase)
   - Visible on response/detail screen
   - Deletes current answer for that question
   - Returns to question phase for same question
   - Allows player to select different answer

2. **Previous Question** (completion phase)
   - Visible on completion screen
   - Navigates back to last answered question for review
   - Allows player to change answers before finalizing

3. **Retake Survey** (completion phase)
   - Visible on completion screen
   - Clears all survey answers
   - Clears bias and session data
   - Returns to intro for clean restart

**Files Modified**:
- `l1-survey-step.js`: Added action handlers `_changeCurrentAnswer()`, `_goToPreviousQuestion()`, `_retakeSurvey()`
- `l1-survey-work-surface.hbs`: Added buttons for all three actions with appropriate labels

---

### BAD 3: Back Navigation Blocked in Chargen ✅
**Problem**: Player couldn't navigate backward from L1 Survey or other steps, getting blocked by minimum step index logic.

**Solution**: Implemented direction-aware exit handling:

1. **Pass direction context to onStepExit**:
   - `_onNextStep` calls `onStepExit(shell, { direction: 'forward' })`
   - `_onPreviousStep` calls `onStepExit(shell, { direction: 'backward' })`

2. **Only finalize on forward exit**:
   - Backward exit preserves draft survey answers
   - Bias and commitment only happen on forward navigation
   - Allows seamless back-and-forth without locking bias

3. **Back navigation always allowed in chargen**:
   - No minimum step index blocking in chargen mode
   - Forward navigation still validates blockers
   - Backward navigation freely allowed

**Files Modified**:
- `progression-shell.js`: Updated `_onNextStep()` and `_onPreviousStep()` to pass direction context
- `l1-survey-step.js`: Updated `onStepExit()` to check direction and only finalize on forward

---

### UGLY 1: Mentor Portrait Hologram Styling ✅
**Problem**: Mentor images appeared as normal color photographs, not holo projections.

**Solution**: Enhanced CSS filters and styling:

1. **Image Filter Chain**:
   - `grayscale(0.85)` - Desaturate to black & white
   - `saturate(0.65)` - Further reduce color
   - `contrast(1.15)` - Boost contrast for clarity
   - `brightness(0.94)` - Slightly dim for ethereal feel
   - `hue-rotate(200deg)` - Add blue/cyan tint

2. **Frame Enhancement**:
   - Stronger border with `oklch(var(--sheet-accent-primary) / 0.45)`
   - Increased glow with multiple box-shadow layers
   - Inset shadow for depth

3. **Overlay Effects**:
   - Horizontal scanlines with repeating gradient
   - Blue diagonal gradient overlay
   - Soft inset glow
   - Creates layered hologram appearance

**Files Modified**:
- `l1-survey-step.css`: Updated mentor image and portrait styling

---

### UGLY 2: Mentor Image Size ✅
**Problem**: Unused vertical space above dialogue panel; mentor portrait was too small.

**Solution**: Responsive sizing with CSS clamps:

1. **Mentor Frame Height**:
   - From: `min-height: 300px`
   - To: `min-height: clamp(340px, 32vh, 420px)`
   - Scales with viewport while maintaining bounds

2. **Mentor Portrait Width**:
   - From: `width: min(240px, 42vw)`
   - To: `width: clamp(260px, 28vw, 340px)`
   - Proportionally larger, responsive sizing

**Files Modified**:
- `l1-survey-step.css`: Updated mentor frame and portrait sizing

---

### UGLY 3: Translation Animation for Survey Text ✅
**Problem**: L1 Survey text appeared as static text; mentor rail (which handles translation) was hidden for this step.

**Solution**: Inline translation animation wired directly into survey surface:

1. **Import MentorTranslationIntegration**:
   - Available in `/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js`
   - Provides `render()` method for custom elements

2. **Wrap Survey Text**:
   - Added `data-l1-survey-dialogue-text` attribute to all dialogue text elements
   - Covers intro, question, response, and completion phases

3. **Apply Translation in onDataReady**:
   - New method `_renderInlineSurveyTranslation()` finds wrapped elements
   - Calls `MentorTranslationIntegration.render()` for each
   - Tracks applied translations to avoid re-running
   - Gracefully degrades if translation fails (keeps plain English)

**Files Modified**:
- `l1-survey-step.js`: Added import, translation method, and tracking state
- `l1-survey-work-surface.hbs`: Added `data-l1-survey-dialogue-text` attributes

---

### UGLY 4: Font Readability ✅
**Problem**: Survey text was difficult to read; fonts were too small.

**Solution**: Increased font sizes by 20-25% using responsive clamps:

1. **Dialogue Text**: `15px` → `clamp(16px, 1.8vw, 20px)`
2. **Choice Labels**: `13px` → `clamp(14px, 1.6vw, 17px)`
3. **Response Choice**: `14px` → `clamp(15px, 1.7vw, 18px)`
4. **Read Notes**: `12px` → `clamp(13px, 1.5vw, 16px)`

All sizes scale responsively while maintaining minimum and maximum bounds.

**Files Modified**:
- `l1-survey-step.css`: Updated all text size declarations

---

## Files Changed

### Core State Management
- **scripts/apps/progression-framework/steps/l1-survey-step.js**
  - Added `_activeSurveyClassKey` tracking
  - Added `_lastInlineTranslationKey` tracking
  - Added class change detection in `onStepEnter()`
  - Made `onStepExit()` direction-aware
  - Added 4 new action handlers (change answer, previous question, retake, reset)
  - Added translation rendering method
  - Improved diagnostics logging

### Navigation & Direction
- **scripts/apps/progression-framework/shell/progression-shell.js**
  - Updated `_onNextStep()` to pass `direction: 'forward'` to `onStepExit()`
  - Updated `_onPreviousStep()` to call `onStepExit()` with `direction: 'backward'`

### Template & UI
- **templates/apps/progression-framework/steps/l1-survey-work-surface.hbs**
  - Added "Change Answer" button in response phase
  - Added "Review Previous Answer" and "Retake Survey" buttons in completion phase
  - Added `data-l1-survey-dialogue-text` attributes to all dialogue text elements

### Styling
- **styles/progression-framework/steps/l1-survey-step.css**
  - Increased mentor frame height to `clamp(340px, 32vh, 420px)`
  - Increased mentor portrait width to `clamp(260px, 28vw, 340px)`
  - Enhanced mentor image filters with grayscale, saturation, contrast, brightness, hue-rotate
  - Enhanced mentor portrait overlay with scanlines and blue gradient
  - Increased dialogue text sizes by ~20%
  - Increased choice/response/note text sizes by ~20-25%

---

## Acceptance Tests

### A. Class Change Reset
1. Start chargen
2. Choose Jedi
3. Complete L1 Survey (answer all questions)
4. Go back to Class step
5. Choose Scout
6. Go forward to L1 Survey

**Expected**:
- Survey is completely reset for Scout
- No Jedi answers remain
- Progress dots reset to empty
- No Jedi bias drives Scout recommendations
- Console logs "Class changed from 'jedi' to 'scout' - resetting survey"

### B. Answer Modification
1. Start the survey
2. Answer question 1
3. On response/detail page, click "Change Answer"

**Expected**:
- Return to question 1
- Can select different answer
- New answer replaces old answer
- Can proceed with new selection

### C. Completion Retake
1. Complete all survey questions
2. See completion screen with top matches
3. Click "Retake Survey"

**Expected**:
- All answers cleared
- Progress dots reset to empty
- Survey returns to intro
- New answers replace previous completion
- No stale bias applied

### D. Previous Question Review
1. Answer question 1
2. Continue to question 2
3. Answer question 2
4. Continue to completion
5. Click "Review Previous Answer"

**Expected**:
- Jump back to question 2's response phase
- Can change answer or continue forward
- No disruption to survey flow

### E. Back Navigation
1. Enter L1 Survey step
2. Click Back button

**Expected**:
- Returns to Class step smoothly
- No "Back-navigation blocked" message
- Draft survey answers preserved
- No bias injected on backward exit

### F. Visual Improvements
1. View L1 Survey at various screen sizes

**Expected**:
- Mentor portrait is larger, reads as blue hologram
- Scanlines visible across mentor image
- Text is noticeably larger and easier to read
- Responsive sizing works on mobile and desktop

### G. Translation Animation
1. Advance to first question

**Expected**:
- Dialogue text animates through Aurebesh translation effect
- Text becomes readable again
- Works in intro, question, response, and completion phases
- Degrades gracefully if translation is disabled

---

## Diagnostic Logging

Added targeted diagnostics for debugging:

```javascript
// Class change detection
console.log('[L1SurveyStep] Class changed from', previousClass, 'to', currentClass, '- resetting survey');

// Retake event
console.log('[L1SurveyStep] Retaking survey for', this._activeSurveyClassKey);

// Final survey commit
console.log('[L1SurveyStep] Survey finalized for', this._activeSurveyClassKey, 'with', answerCount, 'answers');

// Answer changes
console.log('[L1SurveyStep] Changed answer for question', questionId);

// Navigation direction
console.log('[L1SurveyStep] Moving backward - preserving survey answers without finalizing');
```

Enable with `game.settings.set('foundryvtt-swse', 'debugMode', true)` for more detailed trace logging.

---

## Behavior Changes

### Before Fixes
- Class change → Stale survey answers and bias continued affecting recommendations
- Answer selected → Locked in, no way to change without starting over
- Complete survey → Go back to Class → Return to L1 Survey → Same answers shown
- Player couldn't modify survey responses after selection
- No backward navigation allowed in chargen
- Mentor portrait appeared as normal photo, not hologram
- Text was small and hard to read
- Survey text had no animation/translation effect

### After Fixes
- Class change → Survey completely reset with new class scope
- Answer selected → Can immediately click "Change Answer" to modify
- Complete survey → Can click "Retake Survey" for clean restart
- Can review previous answers and modify them
- Backward navigation fully allowed in chargen
- Mentor portrait is larger, styled as blue hologram with scanlines
- Text is 20-25% larger and more readable
- Survey text animates through translation effect

---

## RAW Behavior Preserved

All fixes maintain RAW (Rules As Written) behavior:
- No auto-training or auto-selection
- Survey presents choices, player must explicitly answer
- Background skills presented as options, not auto-granted
- No gratuitous purging of unrelated selections
- Skills still recompute after class changes (as expected)

---

## Technical Implementation Notes

1. **State Isolation**: Each class gets its own isolated survey state; changing class doesn't carry forward answers from previous class.

2. **Bias Management**: Survey bias only injected on forward navigation (when finalizing), not on backward navigation or incomplete exits.

3. **Session Persistence**: Draft answers preserved across navigation layers via `_surveyAnswers` map; only committed when moving forward past complete phase.

4. **Translation Robustness**: Inline translation wraps in try-catch; failure degrades gracefully to plain English without breaking rendering.

5. **Responsive Sizing**: All dimension changes use CSS clamps for proper scaling across device sizes (mobile 380px to desktop 4K+).

---

## Implementation Quality

- ✅ Surgical changes - only touched necessary files
- ✅ Backward compatible - existing plugins handle new direction context
- ✅ Graceful degradation - translation and features fail safely
- ✅ Minimal performance impact - tracking variables only
- ✅ Clear diagnostics - targeted logging for debugging
- ✅ Accessible - font size improvements aid readability
- ✅ Responsive - clamp-based sizing works across all devices
