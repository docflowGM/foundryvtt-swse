# Mentor Suggestion Integration Plan

## Overview
Wire the mentor system into the suggestion system so mentors provide contextual, voiced suggestions with random flavor text. Additionally, add a post-class survey to help the suggestion engine understand player intent and character design philosophy.

## Architecture

### System Components

#### 1. Mentor Suggestion Voice System (`mentor-suggestion-voice.js`)
**Purpose**: Generate mentor-voiced suggestions with 5 random sayings per context

**Key Classes**:
- `MentorSuggestionVoice`: Main class that generates voiced suggestions
  - `generateSuggestionIntro(mentor, context)` - 5 random intro lines per mentor/context
  - `generateSuggestionExplanation(mentor, suggestion, context)` - Why this suggestion is good
  - `rankSuggestions(suggestions, mentor)` - Sort by tier with mentor flavor

**Mentor Voice Personalities**:
- Miraj (Jedi): Philosophical, Force-centric, balanced
- Lead (Scout): Tactical, field-experienced, practical
- Breach (Mandalorian): Direct, action-focused, discipline-oriented
- Ol' Salty (Pirate): Colorful, irreverent, adventure-seeking
- J0-N1 (Protocol Droid): Formal, efficient, protocol-minded

**Context Types**:
- `feat_selection` - When selecting feats
- `talent_selection` - When selecting talents
- `class_selection` - When selecting classes
- `ability_increase` - When increasing abilities
- `skill_training` - When training skills
- `force_option` - When selecting Force options

**Output Format**:
```javascript
{
  mentorName: "Ol' Salty",
  introduction: "Har har! Ye be makin' fine choices, me buccaneer!",
  suggestions: [
    {
      item: { name: "Quick Draw", tier: 5 },
      explanation: "Proven synergy with yer roguish combat style, mark me words!",
      applyLabel: "Apply Suggestion"
    }
  ]
}
```

#### 2. Mentor BuildIntent Survey (`mentor-survey.js`)
**Purpose**: Ask post-class questions in mentor voice to populate BuildIntent biases

**Key Classes**:
- `MentorSurvey`: Manages survey workflow
  - `promptSurvey(actor, mentor)` - Shows dialog asking if player wants survey
  - `showSurveyQuestions(actor, mentor, classKey)` - Renders survey in mentor voice
  - `processSurveyAnswers(answers, classKey)` - Converts answers to BuildIntent biases
  - `applyBiasesToBuildIntent(actor, biases)` - Stores biases on actor

**Survey Data Structure**:
- CLASS_QUESTIONS with mentor voice variants
- Each mentor personalizes questions and answers
- Questions map to BuildIntent signals with small bias weights (0.1-0.3)

**Example - Miraj Jedi Survey**:
```
"The Force calls to each Jedi differently. Tell me, young one—when conflict breaks out,
how does your connection to the Force guide your contribution?"
- Options in Force-philosophical language
```

**Example - Ol' Salty Scoundrel Survey**:
```
"Har har! Every rogue needs an edge, me hearty. What be yer Scoundrel's biggest advantage?"
- Options in pirate dialect
```

#### 3. Mentor Suggestion Dialog UI (`mentor-suggestion-dialog.js`)
**Purpose**: Display top suggestion with mentor voice and apply button

**Key Classes**:
- `MentorSuggestionDialog`: Custom Foundry Dialog
  - Renders mentor portrait + voice intro
  - Shows top 1-3 suggestions
  - Has "Apply Suggestion" button that applies choice and closes
  - Styled to match rest of levelup UI

**Styling**: Uses existing mentor.css + levelup.hbs theme
- Gradient mentor panel (matches existing)
- Suggestion cards with tier icons
- Cyan/blue accent colors
- Smooth button interactions

#### 4. Integration Points

##### In SWSELevelUpEnhanced (levelup-main.js)
1. After class selection (`_onSelectClass`)
   - Check if first class selection (level 1)
   - If yes, offer survey dialog
   - Store BuildIntent biases on actor

2. In feat/talent/class dialogs
   - Add "Ask Mentor" button alongside standard buttons
   - On click: Call `MentorSuggestionDialog.show()`
   - Returns selected item or null if dismissed

3. In mentor guidance panel
   - Update when BuildIntent biases change
   - Reflect stored player intent in guidance text

##### In BuildIntent.js
1. Add `getMentorBiases(actor)` method
   - Reads stored biases from actor data
   - Applies to theme calculations
   - Weights player intent alongside detected patterns

2. Update `analyzeIntent()`
   - Include mentor survey biases in calculations
   - Store final weighted scores

##### In SuggestionEngine.js & ClassSuggestionEngine.js
1. Add mentor voice layer
   - When called, generate mentor intro via `MentorSuggestionVoice`
   - Format suggestions with explanations
   - Return with mentor personality

2. Integration point in suggestion methods:
   ```javascript
   const voicedSuggestions = await MentorSuggestionVoice
     .generateSuggestionIntro(mentor, context);
   ```

##### In SWSEProgressionEngine.js
1. Hook into mentor guidance point (line 347)
2. Check if this is post-class
3. If yes and first level, trigger survey offer
4. Pass BuildIntent biases through finalization

#### 5. Data Storage on Actor
Store mentor survey responses on actor:
```javascript
actor.system.swse = {
  ...existing,
  mentorBuildIntentBiases: {
    // From survey answers
    combatStyle: 0.3,
    forceFocus: 0.2,
    // ... other biases
  },
  mentorSurveyCompleted: true,  // Flag to not re-ask
  surveyResponses: {
    // Cache of actual responses for potential future reference
    jedi_combat_role: "Engaging enemies directly with a lightsaber"
  }
}
```

## Implementation Steps

### Phase 1: Mentor Voice System Foundation
1. Create `scripts/apps/mentor-suggestion-voice.js`
   - Mentor voice data with 5 sayings per context
   - Methods to generate random selections
   - Explanation generation per mentor personality

2. Create `scripts/apps/mentor-suggestion-dialog.js`
   - Custom dialog class extending Foundry Dialog
   - Renders suggestion with mentor voice intro
   - "Apply Suggestion" button functionality
   - Styled with existing theme

3. Update `scripts/apps/mentor-dialogues.js`
   - Add getSuggestionVoiceData() method
   - Ensure all mentors have complete voice data

### Phase 2: Survey System
1. Create `scripts/apps/mentor-survey.js`
   - MentorSurvey class with survey logic
   - Dialog asking if player wants survey
   - Survey questions UI rendering in mentor voice
   - Answer processing to BuildIntent biases

2. Create `templates/apps/mentor-survey.hbs`
   - Survey dialog template
   - Matches levelup UI styling
   - Question/answer presentation
   - Progress indicator

3. Update `scripts/engine/BuildIntent.js`
   - Add getMentorBiases() method
   - Update analyzeIntent() to include survey biases
   - Weight mentor biases in final calculations

### Phase 3: Integration
1. Update `scripts/apps/levelup/levelup-main.js`
   - Add survey offer after class selection
   - Add "Ask Mentor" button to selection dialogs
   - Pass BuildIntent biases through flow

2. Update `scripts/engine/SuggestionEngine.js`
   - Add mentor voice layer to suggestion output
   - Call MentorSuggestionVoice for explanations

3. Update `scripts/engine/progression.js`
   - Wire mentor survey into post-class hook
   - Ensure biases stored and persisted

4. Update `styles/mentor.css`
   - Add styles for suggestion dialog
   - Add styles for survey questions
   - Ensure visual consistency

### Phase 4: Testing & Polish
1. Test complete workflow
   - Create level 1 character, verify survey offer
   - Complete survey, check BuildIntent updates
   - Select feat, test "Ask Mentor" button
   - Verify suggestions apply correctly

2. Test mentor voice variety
   - Run multiple times, verify 5 random sayings appear
   - Test all mentor personalities
   - Verify context-appropriate explanations

3. Edge cases
   - Multi-class progression (survey only at level 1)
   - Prestige class transitions
   - Manual mentor selection
   - BuildIntent without survey data

## File Structure

```
/scripts/apps/
├── mentor-suggestion-voice.js (NEW)
├── mentor-suggestion-dialog.js (NEW)
├── mentor-survey.js (NEW)
├── mentor-dialogues.js (UPDATE)
├── mentor-guidance.js (UPDATE)
├── levelup/
│   └── levelup-main.js (UPDATE)

/scripts/engine/
├── BuildIntent.js (UPDATE)
├── SuggestionEngine.js (UPDATE)
├── progression.js (UPDATE)

/styles/
└── mentor.css (UPDATE)

/templates/apps/
├── levelup.hbs (UPDATE - minor)
└── mentor-survey.hbs (NEW)
```

## Key Decisions & Rationale

1. **Survey on Level 1 Only**: Avoids survey fatigue. Player intent solidifies after first class.

2. **Small Bias Weights (0.1-0.3)**: Survey biases influence but don't override detected patterns. BuildIntent still respects actual feat/talent choices.

3. **Single Top Suggestion**: Advances player through levelup flow without paralysis of choice.

4. **Mentor Voice Variants**: 5 sayings per context ensures freshness across multiple playthroughs.

5. **BuildIntent Integration**: Player intent + detected patterns = coherent suggestions.

6. **No Locks/Restrictions**: Suggestions are guidance, never enforcement.

## Success Criteria

- [ ] Mentor survey appears after level 1 class selection
- [ ] Survey questions are in mentor voice
- [ ] BuildIntent biases are calculated and applied
- [ ] "Ask Mentor" button appears in feat/talent dialogs
- [ ] Mentor provides suggestion with 5 random voice variants
- [ ] "Apply Suggestion" button applies choice and advances
- [ ] Suggestions respect BuildIntent biases
- [ ] No UI issues or styling breaks
- [ ] Complete flow works for all base classes
- [ ] Works with prestige class transitions
