# Suggestion Engine Architecture Map

## System Overview

The Suggestion Engine provides intelligent, context-aware recommendations to players during character generation. The system flows from progression steps → SuggestionService → formatting & display → Mentor output.

---

## Part 1: Input Layer (13 Progression Steps with Suggestions)

```
PROGRESSION FRAMEWORK STEPS (Character Generation)
└─ These feed character data to SuggestionService
│
├─ 1. SPECIES SELECTION
│  │  Domain: 'species'
│  │  File: species-step.js
│  │  Available Options: All species from Compendium
│  │  Triggers Mentor: YES (when suggestions available)
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │              → _formatSpeciesCard(species, suggestedIds, confidenceMap)
│  │              → Template: species-work-surface.hbs
│  │
├─ 2. CLASS SELECTION
│  │  Domain: 'classes'
│  │  File: class-step.js
│  │  Available Options: Base + Prestige classes
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │              → _formatClassCard(classData, suggestedIds, confidenceMap)
│  │              → Template: class-work-surface.hbs
│  │
├─ 3. BACKGROUND SELECTION
│  │  Domain: 'backgrounds'
│  │  File: background-step.js
│  │  Available Options: Event/Occupation/Planet backgrounds
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │              → _formatCategoryGroups(filtered, suggestedIds, confidenceMap)
│  │              → Template: background-work-surface.hbs
│  │
├─ 4. ATTRIBUTES (Abilities)
│  │  Domain: 'attributes'
│  │  File: attribute-step.js
│  │  Available Options: 6 core abilities (STR/DEX/CON/INT/WIS/CHA)
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │              → _formatAbilityRows(suggestedIds, confidenceMap)
│  │              → Template: attribute-work-surface.hbs
│  │
├─ 5. LANGUAGES
│  │  Domain: 'languages'
│  │  File: language-step.js
│  │  Available Options: All available languages
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │              → availableLanguages array with isSuggested + confidenceLevel
│  │              → Template: language-work-surface.hbs
│  │
├─ 6. SKILLS
│  │  Domain: 'skills'
│  │  File: skills-step.js
│  │  Available Options: All skill options
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │
├─ 7. FEATS
│  │  Domain: 'feats'
│  │  File: feat-step.js
│  │  Available Options: Legal feats for character
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │
├─ 8. TALENTS
│  │  Domain: 'talents'
│  │  File: talent-step.js
│  │  Available Options: Available talent trees
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │
├─ 9. FORCE POWERS (Conditional - Force Users Only)
│  │  Domain: 'force-powers'
│  │  File: force-power-step.js
│  │  Available Options: Legal powers for class/level
│  │  Triggers Mentor: YES
│  │  └─ Formats via: formatSuggestionsForDisplay()
│  │              → _formatPowerCard(power, suggestedIds, confidenceMap)
│  │              → Template: force-power-work-surface.hbs
│  │
├─ 10. FORCE SECRETS (Conditional - Force Users Only)
│  │   Domain: 'force-secrets'
│  │   File: force-secret-step.js
│  │   Available Options: Legal secrets for class/level
│  │   Triggers Mentor: YES
│  │   └─ Formats via: formatSuggestionsForDisplay()
│  │               → _formatSecretCard(secret, suggestedIds, confidenceMap)
│  │               → Template: force-secret-work-surface.hbs
│  │
├─ 11. FORCE TECHNIQUES (Conditional - Force Users Only)
│  │   Domain: 'force-techniques'
│  │   File: force-technique-step.js
│  │   Available Options: Legal techniques for class/level
│  │   Triggers Mentor: YES
│  │   └─ Formats via: formatSuggestionsForDisplay()
│  │               → _formatTechniqueCard(technique, suggestedIds, confidenceMap)
│  │               → Template: force-technique-work-surface.hbs
│  │
├─ 12. DROID SYSTEMS (Conditional - Droid Characters Only)
│  │   Domain: 'droid-systems'
│  │   File: droid-builder-step.js
│  │   Available Options: Locomotion, Processor, Appendages, Accessories, Enhancements
│  │   Triggers Mentor: YES
│  │   └─ Formats via: formatSuggestionsForDisplay()
│  │               → _buildDroidPresentation(suggestedIds, confidenceMap)
│  │               → enhanceSystemsWithSuggestions() helper
│  │               → Template: droid-builder-work-surface.hbs
│  │
└─ 13. STARSHIP MANEUVERS (Conditional - Starship Captains Only)
   Domain: 'starship-maneuvers'
   File: starship-maneuver-step.js
   Available Options: Legal maneuvers for class/level
   Triggers Mentor: YES
   └─ Formats via: formatSuggestionsForDisplay()
                → _formatManeuverCard(maneuver, suggestedIds, confidenceMap)
                → Template: starship-maneuver-work-surface.hbs
```

---

## Part 2: Central Processing (SuggestionService)

```
SUGGESTION SERVICE
(scripts/engine/suggestion/SuggestionService.js)

Entry Point: static async getSuggestions(actorOrData, context='chargen', options={})
│
├─ Input Parameters:
│  ├─ actorOrData: Character document with current state
│  ├─ context: 'chargen' (character generation) or 'sheet'/'levelup'
│  └─ options:
│     ├─ domain: One of 13 domain types above
│     ├─ available: Array of options to suggest from
│     ├─ pendingData: In-progress selections from characterData
│     └─ persist: Whether to save suggestions to actor flags
│
├─ PROCESSING PIPELINE:
│  │
│  ├─ 1. SNAPSHOT & CACHE VALIDATION
│  │  │   SnapshotBuilder.hashFromActor(actor, focus, pendingData)
│  │  │   → Creates stable hash of actor state
│  │  │   → Checks cache: if hit, return cached suggestions
│  │  │   → Prevents duplicate computation during chargen workflow
│  │  │
│  ├─ 2. DOMAIN-SPECIFIC SUGGESTION ENGINE SELECTION
│  │  │   Based on options.domain, delegates to appropriate engine:
│  │  │
│  │  ├─ domain='species'             → SuggestionEngineCoordinator.suggestSpecies()
│  │  ├─ domain='classes'             → SuggestionEngineCoordinator.suggestClasses()
│  │  ├─ domain='backgrounds'         → SuggestionEngineCoordinator.suggestBackgrounds()
│  │  ├─ domain='attributes'          → SuggestionEngineCoordinator.suggestAttributeIncreases()
│  │  ├─ domain='languages'           → SuggestionEngineCoordinator.suggestLanguages()
│  │  ├─ domain='skills'              → SuggestionEngineCoordinator.suggestSkills()
│  │  ├─ domain='feats'               → SuggestionEngineCoordinator.suggestFeats()
│  │  ├─ domain='talents'             → SuggestionEngineCoordinator.suggestTalents()
│  │  ├─ domain='force-powers'        → SuggestionEngineCoordinator.suggestForceOptions()
│  │  ├─ domain='force-secrets'       → SuggestionEngineCoordinator.suggestForceOptions()
│  │  ├─ domain='force-techniques'    → SuggestionEngineCoordinator.suggestForceOptions()
│  │  ├─ domain='droid-systems'       → SuggestionEngineCoordinator.suggestDroidSystems()
│  │  └─ domain='starship-maneuvers'  → SuggestionEngineCoordinator.suggestManeuvers()
│  │
│  ├─ 3. SUGGESTION ENRICHMENT
│  │  │   _enrichSuggestions(actor, suggestions, options)
│  │  │   → Adds targetRef (pack+id) for item resolution
│  │  │   → Adds reasons/explanations (synergy analysis)
│  │  │   → Computes confidence scores (0.0-1.0)
│  │  │   → Normalizes suggestion structure
│  │  │
│  ├─ 4. FOCUS-BASED FILTERING
│  │  │   _filterReasonsByFocus(enriched, focus, options)
│  │  │   → Filters reasons by progression focus
│  │  │   → Visibility gating (not scoring change)
│  │  │   → Limits reasons to 3 per suggestion
│  │  │
│  ├─ 5. PERSISTENCE (OPTIONAL)
│  │  │   _persistSuggestionState(actor, context, suggestions)
│  │  │   → Saves minimal state to actor.flags.swse.suggestions
│  │  │   → Enables checkpoint recovery if chargen interrupted
│  │  │
│  └─ 6. CACHING & RETURN
│     → Validates suggestion DTO
│     → Implements LRU cache eviction (max 50 entries)
│     → Returns normalized suggestion array
│
└─ OUTPUT: Array of Suggestion Objects
   Each suggestion contains:
   {
     id: string,              // Item ID or unique identifier
     name: string,            // Display name
     suggestion: {
       confidence: 0.0-1.0,   // Confidence score
       reason: string,        // Primary reason text
       reasons: [{            // Array of explanation reasons
         domain: string,      // Reason category (e.g., 'archetype', 'synergy')
         text: string,        // Explanation text
         weight: 0.0-1.0      // Relevance weight
       }]
     }
   }
```

---

## Part 3: Display Layer (Step-Level Processing & Templates)

```
STEP PLUGIN BASE CLASS
(scripts/apps/progression-framework/steps/step-plugin-base.js)

Helper Methods for Suggestion Display:

1. formatSuggestionsForDisplay(suggestionsArray)
   │
   ├─ INPUT: Suggestion array from SuggestionService
   │
   ├─ PROCESSING:
   │  ├─ Extract IDs into Set: suggestedIds = {id1, id2, id3}
   │  ├─ Build confidenceMap for each suggestion:
   │  │  {
   │  │    id: {
   │  │      confidence: 0.75,           // Raw 0-1 score
   │  │      confidencePercent: 75,      // 0-100
   │  │      confidenceLabel: "75% match",
   │  │      confidenceLevel: "high"      // 'high'/'medium'/'low'
   │  │    }
   │  │  }
   │  │
   │  └─ Return formatted object:
   │     {
   │       suggestedIds: Set<string>,
   │       hasSuggestions: boolean,
   │       suggestions: Array,
   │       confidenceMap: Map<id, confidenceData>
   │     }
   │
   └─ OUTPUT: Formatted data ready for template

2. isSuggestedItem(itemId, suggestedIds)
   │ Simple utility to check if item is in suggested set
   │ Used in card formatting methods
   │
   └─ OUTPUT: boolean

3. _getConfidenceLevel(confidence)
   │ Maps 0.0-1.0 confidence to readable level
   │
   └─ OUTPUT: 'high' | 'medium' | 'low'


INDIVIDUAL STEP FORMATTING
Example: species-step.js

1. getStepData(context)
   │
   ├─ STEP 1: Call formatSuggestionsForDisplay()
   │  const { suggestedIds, hasSuggestions, confidenceMap }
   │    = this.formatSuggestionsForDisplay(this._suggestedSpecies);
   │
   ├─ STEP 2: Map suggestions through formatting method
   │  species: this._filteredSpecies.map(s
   │    => this._formatSpeciesCard(s, suggestedIds, confidenceMap))
   │
   └─ STEP 3: Return data to template
      {
        species: [
          {
            id: "humanoid",
            name: "Humanoid",
            isSuggested: true,
            badgeLabel: "Recommended (85% match)",  ← Confidence %
            confidenceLevel: "high",                ← CSS styling
            ...otherData
          }
        ],
        hasSuggestions: true,
        confidenceMap: { ... }
      }

2. _formatSpeciesCard(species, suggestedIds, confidenceMap)
   │
   ├─ Check if species is suggested
   ├─ Get confidence data from map
   ├─ Build badgeLabel with confidence percentage
   ├─ Include confidenceLevel for CSS styling
   │
   └─ OUTPUT: Card object with suggestion metadata


HANDLEBARS TEMPLATES
Example: species-work-surface.hbs

<button class="prog-species-row
               {{#if this.isSuggested}}
                 prog-species-row--suggested
                 prog-species-row--suggested-{{this.confidenceLevel}}
               {{/if}}"
        data-recommended="{{#if this.isSuggested}}true{{/if}}"
        data-confidence-level="{{this.confidenceLevel}}">

  <div class="prog-species-row__name">
    {{this.name}}
    {{#if this.badgeLabel}}
      <span class="swse-option-card__badge
                   swse-option-card__badge--recommended">
        {{this.badgeLabel}}  ← Shows "Recommended (85% match)"
      </span>
    {{/if}}
  </div>
</button>

CSS Classes Applied:
├─ prog-species-row--suggested (base suggested styling)
└─ prog-species-row--suggested-{{level}} (high/medium/low)
   ├─ high: rgba(34, 197, 94, 0.3) bright green border
   ├─ medium: rgba(34, 197, 94, 0.2) muted green border
   └─ low: rgba(34, 197, 94, 0.1) subtle border
```

---

## Part 4: Mentor Output Layer

```
MENTOR INTEGRATION
(scripts/apps/progression-framework/steps/mentor-step-integration.js)

Flow: When Player Asks Mentor (onAskMentor)

1. CHECK FOR SUGGESTIONS
   │
   if (hasSuggestions && suggestions.length > 0) {
     → Call handleAskMentorWithSuggestions()
   } else {
     → Call standard getStepGuidance()
   }

2. handleAskMentorWithSuggestions(actor, stepId, suggestions, shell, context)
   │
   ├─ INPUT:
   │  ├─ suggestions: Array from formatSuggestionsForDisplay()
   │  └─ shell.mentorRail: Mentor voice output system
   │
   ├─ STEP 1: Get mentor object
   │  const mentor = getStepMentorObject(actor)
   │  → Retrieves mentor tied to current class/archetype
   │
   ├─ STEP 2: Generate suggestion advisory
   │  const advisory = await MentorAdvisoryCoordinator.generateSuggestionAdvisory(
   │    actor,
   │    mentorId,
   │    suggestions,
   │    { stepId, domain, archetype, relatedGrowth }
   │  )
   │
   └─ STEP 3: Speak advisory with mentor voice
      const advisoryText = `${advisory.observation} ${advisory.impact} ${advisory.guidance}`
      await shell.mentorRail.speak(advisoryText, advisory.mood)

3. MentorAdvisoryCoordinator.generateSuggestionAdvisory()
   │
   ├─ Load advisory stub for mentor (from mentors.yml)
   │  Example: Yoda has templates like:
   │  {
   │    voice_profile: { ... },
   │    advisory_types: {
   │      strength_reinforcement: {
   │        very_low: { observation: "...", impact: "...", guidance: "..." },
   │        low: { ... },
   │        medium: { ... },
   │        high: { ... },
   │        very_high: { ... }
   │      }
   │    }
   │  }
   │
   ├─ MAP CONFIDENCE TO INTENSITY (0.0-1.0 → 5 levels)
   │  confidence >= 0.9 → 'very_high'  (0.9 intensity)
   │  confidence >= 0.7 → 'high'        (0.7 intensity)
   │  confidence >= 0.5 → 'medium'      (0.5 intensity)
   │  confidence >= 0.3 → 'low'         (0.3 intensity)
   │  confidence <  0.3 → 'very_low'    (0.1 intensity)
   │
   ├─ SELECT ADVISORY TEMPLATE
   │  advisoryScaffold = stub.advisory_types['strength_reinforcement'][intensity]
   │  → Retrieves mentor-specific language for this confidence level
   │
   ├─ SUBSTITUTE TEMPLATE VARIABLES
   │  Templates use placeholders:
   │  - {strength_area}        → "Force Jump" (the suggested item)
   │  - {archetype_or_role}    → "Jedi Knight" (character path)
   │  - {related_growth_area}  → "Force mastery"
   │
   │  Example mentor advisory structure:
   │  {
   │    observation: "I see {strength_area} aligns with {archetype_or_role}",
   │    impact: "This choice strengthens {strength_area} capability",
   │    guidance: "Consider {strength_area} for {related_growth_area}"
   │  }
   │
   ├─ MAP CONFIDENCE TO MENTOR MOOD
   │  confidence >= 0.8 → 'encouraging'   (Enthusiastic, emphatic delivery)
   │  confidence >= 0.6 → 'supportive'    (Positive, reassuring tone)
   │  confidence >= 0.4 → 'thoughtful'    (Measured, considered delivery)
   │  confidence <  0.4 → 'neutral'       (Balanced, information-only)
   │
   ├─ BUILD ADVISORY OBJECT
   │  {
   │    mentor: mentorId,
   │    type: 'selection_suggestion',
   │    intensity: 'high',          ← Confidence-based
   │    mood: 'encouraging',        ← Confidence-based
   │    observation: "...",         ← Templated + substituted
   │    impact: "...",
   │    guidance: "...",
   │    confidenceLabel: "85% confidence",
   │    voiceProfile: { ... }       ← Mentor's voice settings
   │  }
   │
   └─ OUTPUT: Complete advisory ready for voice synthesis

4. MENTOR VOICE SYNTHESIS
   │
   ├─ INPUT: advisoryText, mood
   │  "I see Force Jump aligns with your Jedi Knight path.
   │   This choice strengthens Force-based capability.
   │   Consider Force Jump for advanced Force mastery."
   │
   ├─ MOOD DETERMINES DELIVERY
   │  ├─ 'encouraging': Faster tempo, higher pitch, emphatic emphasis
   │  ├─ 'supportive': Warm tone, measured pace, reassuring
   │  ├─ 'thoughtful': Slower pace, contemplative pauses
   │  └─ 'neutral': Standard delivery, informational
   │
   ├─ VOICE SYNTHESIS
   │  await mentorRail.speak(advisoryText, mood)
   │  → Uses foundry-swse voice integration
   │  → Applies mood-based TTS parameters
   │  → Delivers personalized mentor feedback
   │
   └─ PLAYER HEARS: Mentor speaking personalized suggestion
      with confidence-appropriate tone and emphasis
```

---

## Complete Data Flow Example

```
PLAYER SELECTS SPECIES → MENTOR PROVIDES SUGGESTION

Step 1: Species Selection (species-step.js)
────────────────────────
Player sees: 10 species options in UI
- Some marked with badges: "Recommended (78% match)"
- CSS styling shows green border on high-confidence suggestions

Step 2: Player Asks Mentor "What should I choose?"
────────────────────────
UI triggers: onAskMentor() → checks hasSuggestions

Step 3: Suggestion Pipeline Execution
────────────────────────
species-step.js:onAskMentor()
  │
  ├─ this._suggestedSpecies = [
  │   { id: 'wookiee', suggestion: { confidence: 0.87, reason: "..." } }
  │ ]
  │
  ├─ Call handleAskMentorWithSuggestions(
  │   actor, 'species', suggestions, shell,
  │   { domain: 'species', archetype: 'Wookiee Warrior', ... }
  │ )
  │
  └─ MentorAdvisoryCoordinator processes:

     Map confidence 0.87 → intensity 'high'
     Select mentor advisory template for 'high' intensity
     Substitute variables:
       - {strength_area} = "Wookiee"
       - {archetype_or_role} = "your warrior path"

     Map confidence 0.87 → mood 'encouraging'

     Build advisory:
     "I sense Wookiee resonates with your warrior path.
      This species strengthens physical prowess and intimidation.
      Consider Wookiee for combat mastery and tribal leadership."

Step 4: Mentor Voice Output
────────────────────────
Mentor speaks with ENCOURAGING mood:
  - Faster, emphatic delivery
  - Confident, enthusiastic tone
  - High pitch emphasis on key words

Step 5: Player Sees/Hears Integrated Feedback
────────────────────────
UI: Badge shows "Recommended (87% match)" with green border
Mentor: Speaks personalized suggestion in appropriate voice
```

---

## Confidence Score Interpretation

```
CONFIDENCE LEVELS (0.0 - 1.0)

0.0 - 0.3:  Very Low Confidence
├─ Minimal synergy with character
├─ Mentor mood: Neutral/Thoughtful
├─ Visual: Subtle hint (low opacity green border)
└─ Badge shows: "Recommended (15% match)"

0.3 - 0.5:  Low-Medium Confidence
├─ Some synergy, minor overlap
├─ Mentor mood: Thoughtful
├─ Visual: Muted green border
└─ Badge shows: "Recommended (40% match)"

0.5 - 0.7:  Medium Confidence
├─ Good synergy, strong thematic fit
├─ Mentor mood: Supportive
├─ Visual: Medium green border
└─ Badge shows: "Recommended (60% match)"

0.7 - 0.85: High Confidence
├─ Strong synergy, excellent thematic fit
├─ Mentor mood: Encouraging
├─ Visual: Bright green border
└─ Badge shows: "Recommended (78% match)"

0.85 - 1.0: Very High Confidence
├─ Exceptional synergy, perfect fit
├─ Mentor mood: Encouraging
├─ Visual: Bright green border (maximum)
└─ Badge shows: "Recommended (95% match)"
```

---

## System Components Summary

```
File Structure:

INPUT LAYER
├─ scripts/apps/progression-framework/steps/
│  ├─ species-step.js
│  ├─ class-step.js
│  ├─ background-step.js
│  ├─ attribute-step.js
│  ├─ language-step.js
│  ├─ skills-step.js
│  ├─ feat-step.js
│  ├─ talent-step.js
│  ├─ force-power-step.js
│  ├─ force-secret-step.js
│  ├─ force-technique-step.js
│  ├─ droid-builder-step.js
│  └─ starship-maneuver-step.js

PROCESSING LAYER
├─ scripts/engine/suggestion/
│  ├─ SuggestionService.js          (Main entry point)
│  ├─ SuggestionEngineCoordinator.js (Domain router)
│  ├─ ConfidenceScoring.js          (Score calculation)
│  ├─ SuggestionExplainer.js        (Reason generation)
│  └─ SuggestionContextBuilder.js   (Character context)

FORMATTING LAYER
├─ scripts/apps/progression-framework/steps/
│  ├─ step-plugin-base.js           (formatSuggestionsForDisplay)
│  └─ mentor-step-integration.js    (Mentor handler)

MENTOR OUTPUT LAYER
├─ scripts/engine/mentor/
│  └─ mentor-advisory-coordinator.js (Advisory generation)

DISPLAY LAYER
├─ templates/apps/progression-framework/steps/
│  ├─ species-work-surface.hbs
│  ├─ class-work-surface.hbs
│  ├─ background-work-surface.hbs
│  ├─ attribute-work-surface.hbs
│  ├─ language-work-surface.hbs
│  ├─ force-power-work-surface.hbs
│  ├─ force-secret-work-surface.hbs
│  ├─ force-technique-work-surface.hbs
│  ├─ droid-builder-work-surface.hbs
│  └─ starship-maneuver-work-surface.hbs

STYLING
├─ styles/progression-framework/
│  └─ option-cards.css              (Confidence-level CSS)
```

---

## Key Design Principles

```
1. SEPARATION OF CONCERNS
   ├─ SuggestionService: Calculation only, no UI awareness
   ├─ Step plugins: Formatting only, no suggestion logic
   ├─ Templates: Display only, no business logic
   └─ Mentor: Output only, transforms data to voice

2. CONTEXT AWARENESS
   ├─ Each step knows its chargen context
   ├─ Suggestions account for accumulated selections
   ├─ Mentor adapts tone to confidence level
   └─ Voice delivery matches suggestion strength

3. PROGRESSIVE REVELATION
   ├─ Players see suggestions in UI (badges + highlighting)
   ├─ Players can ask mentor for explanation
   ├─ Mentor provides confidence-appropriate guidance
   └─ Reasons explain synergy and thematic fit

4. CONFIDENCE-DRIVEN FEEDBACK
   ├─ Scoring: 0.0-1.0 normalized confidence
   ├─ Display: Percentage badges + CSS styling
   ├─ Voice: Mood mapping to delivery style
   └─ Advisory: Intensity templates by confidence range

5. CACHE OPTIMIZATION
   ├─ Snapshot-based hashing for stable cache keys
   ├─ LRU eviction when cache exceeds 50 entries
   ├─ Fast re-computation prevented during workflow
   └─ Actor changes invalidate cache automatically
```

---

## Data Flow Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                  CHARACTER GENERATION WORKFLOW                  │
└─────────────────────────────────────────────────────────────────┘

[Step UI Renders]
      ↓
[Player Makes Selection]
      ↓
[Step.onStepEnter() Calls SuggestionService]
      ↓
    ╔════════════════════════════════════════════════════╗
    ║  SuggestionService.getSuggestions(actor, context)  ║
    ║  - Hashes actor state                              ║
    ║  - Checks cache                                    ║
    ║  - Routes to domain engine                         ║
    ║  - Enriches with confidence scores                 ║
    ║  - Filters by focus                                ║
    ║  - Returns suggestion array                        ║
    ╚════════════════════════════════════════════════════╝
      ↓
[Step formatSuggestionsForDisplay()]
      ├─→ Extract suggestedIds
      ├─→ Build confidenceMap (id → {confidence, level, label})
      └─→ Return formatted object
      ↓
[Step._formatXxxCard() for each option]
      ├─→ Check if suggested
      ├─→ Add confidence label to badge
      ├─→ Add confidence level for CSS styling
      └─→ Return enhanced card object
      ↓
[Template Renders with Confidence Data]
      ├─→ Shows badge: "Recommended (78% match)"
      ├─→ Applies CSS class: prog-xxx-suggested-high
      └─→ Sets data-confidence-level="high"
      ↓
[Player Asks Mentor]
      ↓
[handleAskMentorWithSuggestions()]
      ├─→ Gets mentor object
      └─→ Calls MentorAdvisoryCoordinator
      ↓
    ╔════════════════════════════════════════════════════╗
    ║  MentorAdvisoryCoordinator                         ║
    ║  - Maps confidence → intensity level               ║
    ║  - Loads mentor advisory template                  ║
    ║  - Substitutes template variables                  ║
    ║  - Maps confidence → mentor mood                   ║
    ║  - Returns complete advisory object                ║
    ╚════════════════════════════════════════════════════╝
      ↓
[Mentor speaks advisory text with mood-based voice]
      ↓
[Player receives integrated UI + Voice feedback]
```

---

## Example: Complete Species Suggestion Flow

```
SCENARIO: Player at Species Selection, Class=Jedi Knight

1. SuggestionService.getSuggestions(actor, 'chargen', {
     domain: 'species',
     available: [Humanoid, Wookiee, Bothan, ...]
   })

2. SuggestionEngineCoordinator analyzes species synergy:
   - Humanoid: 0.72 confidence (balanced, good force affinity)
   - Wookiee: 0.45 confidence (melee-focused, not optimal for force)
   - Bothan: 0.68 confidence (cunning, tactical synergy)

3. Returns:
   [
     { id: 'humanoid', name: 'Humanoid', suggestion: { confidence: 0.72, reason: '...' } },
     { id: 'bothan', name: 'Bothan', suggestion: { confidence: 0.68, reason: '...' } },
   ]

4. species-step.js formatSuggestionsForDisplay():
   Returns {
     suggestedIds: Set(['humanoid', 'bothan']),
     confidenceMap: {
       'humanoid': { confidence: 0.72, confidencePercent: 72,
                     confidenceLabel: '72% match', confidenceLevel: 'high' },
       'bothan': { confidence: 0.68, confidencePercent: 68,
                   confidenceLabel: '68% match', confidenceLevel: 'high' }
     }
   }

5. _formatSpeciesCard() for each species:
   Humanoid card:
   {
     id: 'humanoid',
     name: 'Humanoid',
     isSuggested: true,
     badgeLabel: 'Recommended (72% match)',
     confidenceLevel: 'high',
     ...
   }

6. Template renders:
   <button class="prog-species-row
                  prog-species-row--suggested
                  prog-species-row--suggested-high"
           data-confidence-level="high">
     Humanoid
     <span class="badge">Recommended (72% match)</span>
   </button>

7. CSS applies: bright green border, visual emphasis

8. Player asks mentor:

   MentorAdvisoryCoordinator.generateSuggestionAdvisory():
   - Confidence 0.72 → intensity 'high' (0.7)
   - Confidence 0.72 → mood 'encouraging'
   - Load Yoda (Jedi mentor) 'high' intensity template

   Template:
   "In harmony with your path, Humanoid, I sense.
    Strong force affinity, this species offers.
    Consider Humanoid, for mastery of the Force, you shall."

9. Mentor speaks with ENCOURAGING mood:
   - Faster pace, emphatic delivery
   - Higher pitch on "Force"
   - Confident intonation

10. Player hears mentor voice + sees UI suggestion = coherent system
```

---

## Summary

The Suggestion Engine is a **multi-layer system** that:

1. **Collects** context from 13 chargen steps
2. **Processes** via SuggestionService with domain-specific engines
3. **Scores** suggestions with 0.0-1.0 confidence values
4. **Formats** display with badges, CSS classes, and metadata
5. **Renders** in templates with visual hierarchy
6. **Integrates** with Mentor system for voice output
7. **Maps** confidence to delivery (mood, intensity, emphasis)
8. **Caches** for performance during long workflows

**Result**: Intelligent, contextual, visually-integrated, and voice-delivered character generation guidance that adapts to player choices in real-time.
