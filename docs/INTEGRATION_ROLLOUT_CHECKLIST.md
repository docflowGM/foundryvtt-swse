# Archetype Engine Integration Rollout Checklist

**Status:** Ready for staged rollout
**Target:** Enhance all 10+ suggestion engines with archetype weighting and explanations

---

## Phase 0: Setup (Week 1)

- [ ] **Copy core modules**
  - [ ] `ArchetypeAffinityEngine.js` → `scripts/engine/`
  - [ ] `ArchetypeSuggestionIntegration.js` → `scripts/engine/`
  - [ ] `ArchetypeEngineHooks.js` → `scripts/engine/`
  - [ ] `ArchetypeUIComponents.js` → `scripts/ui/`

- [ ] **Initialize in main module**
  - [ ] Import `setupArchetypeEngineHooks` in `module.js`
  - [ ] Call `setupArchetypeEngineHooks()` on module load
  - [ ] Test: Verify archetype data loads on game ready

- [ ] **Test basic functionality**
  - [ ] Create test character
  - [ ] Verify affinity initializes
  - [ ] Check actor flags: `actor.system.flags.swse.archetypeAffinity`
  - [ ] Verify prestige hints in `buildGuidance`

---

## Phase 1: Force/Magic Options (Week 2)

**Engines to enhance:**
1. `ForceOptionSuggestionEngine`
2. `TechSuppressionEngine` (if applicable)

### Force Option Engine

- [ ] **Create wrapper**
  - [ ] Copy `ArchetypeEnhancedForceOptionSuggestionEngine.js` as reference
  - [ ] Or integrate directly into `ForceOptionSuggestionEngine.js`

- [ ] **Add enhancement logic**
  ```javascript
  import { enhanceSuggestionWithArchetype } from './ArchetypeSuggestionIntegration.js';

  // After getting base suggestions:
  for (const suggestion of suggestions) {
    const enhanced = await enhanceSuggestionWithArchetype(suggestion, actor);
    // Use enhanced.archetypeWeightedScore instead of suggestion.tier
  }
  ```

- [ ] **Update rendering**
  - [ ] Add archetype explanation to tooltip
  - [ ] Show affinity boost indicator
  - [ ] Sort by weighted score (not just tier)

- [ ] **Testing**
  - [ ] [ ] Verify Force powers show enhanced tiers
  - [ ] [ ] Check explanations render correctly
  - [ ] [ ] Confirm sort order matches affinity

---

## Phase 2: Attributes & Class Selection (Week 2–3)

**Engines to enhance:**
1. `AttributeIncreaseSuggestionEngine`
2. `ClassSuggestionEngine`
3. `Level1SkillSuggestionEngine`

### Attribute Increase Engine

- [ ] **Locate suggestion generation**
  - [ ] Find where suggestions are created
  - [ ] Identify base score/tier system

- [ ] **Add enhancement**
  ```javascript
  const enhanced = await enhanceSuggestionWithArchetype(suggestion, actor);
  ```

- [ ] **Update UI**
  - [ ] Display affinity boost next to each suggestion
  - [ ] Show explanation on hover

- [ ] **Testing**
  - [ ] Verify attribute suggestions are weighted correctly
  - [ ] Check archetype alignment

### Class Suggestion Engine

- [ ] **Review existing logic**
  - [ ] How does it currently score classes?
  - [ ] What's the base score range?

- [ ] **Integrate affinity**
  - [ ] Apply weighting to class suggestions
  - [ ] Show prestige path recommendations for chosen class

- [ ] **Testing**
  - [ ] Verify class suggestions reflect affinity
  - [ ] Check prestige hints appear

### Level 1 Skill Engine

- [ ] **Add skill weighting**
  - [ ] Find skill suggestion logic
  - [ ] Apply archetype weighting

- [ ] **UI updates**
  - [ ] Show skill explanations

- [ ] **Testing**
  - [ ] Verify skills match character archetype

---

## Phase 3: Feature/Talent Selection (Week 3–4)

**Engines to enhance:**
1. `FeatEffectsEngine`
2. `BuildCoherenceAnalyzer` (already reads flags)
3. `CommunityMetaSynergies`

### Feat Effects Engine

- [ ] **Identify suggestion points**
  - [ ] Where are feats recommended?
  - [ ] What scoring is used?

- [ ] **Apply archetype enhancement**
  ```javascript
  const enhanced = await enhanceSuggestionWithArchetype(feat, actor);
  ```

- [ ] **UI enhancements**
  - [ ] Show feat → archetype alignment
  - [ ] Highlight key feats for current archetype

- [ ] **Testing**
  - [ ] Verify feat suggestions align with archetype
  - [ ] Check tier/score adjustments

### Build Coherence Analyzer

- [ ] **Status:** Already integrated
  - [ ] This engine reads archetype data
  - [ ] No changes needed, but can use for UI hints

### Community Meta Synergies

- [ ] **Review synergy logic**
  - [ ] How are synergies scored?
  - [ ] Can archetype weighting apply?

- [ ] **Integration approach**
  - [ ] May not need weighting
  - [ ] Consider for future phases

- [ ] **Testing**
  - [ ] Verify meta synergies still work
  - [ ] Check archetype context doesn't interfere

---

## Phase 4: UI Integration (Week 4–5)

**Components to add:**

### Character Sheet Section

- [ ] **Register archetype UI section**
  ```javascript
  Hooks.on('renderActorSheet', async (sheet) => {
    registerArchetypeUISection(sheet);
  });
  ```

- [ ] **Display components**
  - [ ] Render build identity card
  - [ ] Show affinity bars
  - [ ] Include prestige hints (if applicable)

- [ ] **Styling**
  - [ ] Add CSS from `ArchetypeUIComponents.js`
  - [ ] Ensure consistency with sheet theme

- [ ] **Testing**
  - [ ] Verify UI appears on character sheet
  - [ ] Check all sections render correctly
  - [ ] Test at different screen sizes

### Prestige Path Dialog

- [ ] **Create trigger**
  - [ ] Button in character sheet
  - [ ] Menu item in actor context
  - [ ] Hook for level-up events

- [ ] **Implement dialog**
  ```javascript
  Hooks.on('swsePrestigeHintsAvailable', (actor, hints) => {
    showPrestigePathDialog(actor);
  });
  ```

- [ ] **Testing**
  - [ ] Verify dialog appears
  - [ ] Check recommendations are accurate
  - [ ] Confirm descriptions render correctly

### Suggestion Tooltips

- [ ] **Add explanation tooltips**
  - [ ] Show on hover in suggestion lists
  - [ ] Include archetype context
  - [ ] Display affinity boost

- [ ] **Testing**
  - [ ] Verify tooltips appear
  - [ ] Check text is readable
  - [ ] Confirm no layout shifts

---

## Phase 5: Build System Integration (Week 5–6)

**Special case engines:**

### BuildIntent Engine

- [ ] **Status:** Read-only integration
  - [ ] Already reads character choices
  - [ ] Uses for intent detection
  - [ ] No changes needed

- [ ] **Enhancement opportunity**
  - [ ] Could use archetype affinity to confirm intent
  - [ ] Future optimization

### BuildIdentityAnchor Engine

- [ ] **Status:** Already integrated
  - [ ] Reads archetype data from JSON
  - [ ] Can use affinity as secondary signal
  - [ ] No immediate changes needed

### OpportunityCostAnalyzer

- [ ] **Status:** Utility engine
  - [ ] May not need archetype weighting
  - [ ] Could be skipped in Phase 1

- [ ] **Future consideration**
  - [ ] Might benefit from affinity context
  - [ ] Can be added later

---

## Testing Checklist

### Per-Engine Testing

For each engine, verify:

- [ ] **Suggestions generate correctly**
  - [ ] No errors in console
  - [ ] Suggestions array is populated
  - [ ] Scores/tiers are reasonable

- [ ] **Archetype enhancement works**
  - [ ] `enhanceSuggestionWithArchetype()` completes
  - [ ] All fields added to suggestions
  - [ ] Weighted scores are higher/lower as expected

- [ ] **UI renders properly**
  - [ ] Suggestions display in sheet/dialog
  - [ ] Explanations show on hover
  - [ ] Boost indicators visible

- [ ] **Edge cases handled**
  - [ ] Character with no feats/talents
  - [ ] Character with only stub archetypes
  - [ ] Character with high affinity to one archetype
  - [ ] Character with spread affinity

### Integration Testing

- [ ] **Multi-engine scenarios**
  - [ ] Make a character with multiple classes
  - [ ] Select from multiple suggestion engines
  - [ ] Verify all show consistent archetype alignment

- [ ] **Performance**
  - [ ] Affinity calculation < 100ms
  - [ ] UI renders without lag
  - [ ] No repeated calculations on every render

- [ ] **Persistence**
  - [ ] Affinity cached correctly
  - [ ] Drift detection works (add/remove feat → recalc)
  - [ ] Data persists across sessions

- [ ] **User experience**
  - [ ] Explanations are clear and helpful
  - [ ] Prestige hints appear at right time
  - [ ] No confusing UI elements

---

## Rollout Timeline

### Week 1
- Setup + Phase 0 testing

### Week 2
- Phase 1: Force/magic options
- Initial user testing

### Week 3
- Phase 2: Attributes, class, skills
- Bug fixes from Week 2

### Week 4
- Phase 3: Feats, talents
- Phase 4: UI integration (partial)

### Week 5
- Phase 4: UI integration (complete)
- Performance tuning

### Week 6
- Phase 5: Build system fine-tuning
- General polish and bug fixes
- Ready for production

---

## Success Metrics

### Functional Metrics
- [ ] All suggestion engines enhanced (10/10)
- [ ] All UI components integrated
- [ ] All tests passing
- [ ] Zero console errors on character creation

### Performance Metrics
- [ ] Affinity calculation: < 100ms
- [ ] UI render: < 50ms
- [ ] No memory leaks on open/close sheets

### Quality Metrics
- [ ] Player feedback: positive on suggestions
- [ ] Prestige paths: align with build ~80% of time
- [ ] Bug reports: < 3 critical issues

---

## Known Limitations & Future Work

### Current Limitations
- [ ] Prestige mapping is manually maintained (not inferred)
- [ ] Affinity thresholds (0.30, 0.18) are fixed
- [ ] No ML adaptation of affinity weights

### Future Enhancements
- [ ] Per-world tuning of thresholds
- [ ] Community meta synergy integration
- [ ] ML model for affinity weight optimization
- [ ] Prestige narration (lore text per path)
- [ ] Export affinity to PDF character sheet

---

## Troubleshooting During Rollout

### Issue: Suggestions not showing archetype weighting

**Debug:**
```javascript
// In console
const actor = game.actors.getName("Test Character");
const affinity = actor.system.flags?.swse?.archetypeAffinity;
console.log('Affinity:', affinity);

// Should show archetypeAffinity object with affinity scores
```

**Solution:**
- Ensure `initializeActorAffinity()` was called
- Check that affinity was calculated (call `recalculateActorAffinity()`)
- Verify fetch path for archetype JSON is correct

### Issue: Prestige hints not appearing

**Debug:**
```javascript
const hints = actor.system.flags?.swse?.buildGuidance?.prestigeHints;
console.log('Prestige hints:', hints);

// Check thresholds
const affinity = actor.system.flags?.swse?.archetypeAffinity?.affinity;
console.log('Affinity scores:', affinity);
```

**Solution:**
- Affinity must be > 0.18 (secondary) or > 0.30 (primary)
- Character needs matching feat/talent keywords
- Check prestige map is configured

### Issue: Slow performance

**Debug:**
```javascript
// Time affinity calculation
console.time('affinity');
await recalculateActorAffinity(actor);
console.timeEnd('affinity');

// Should be < 100ms
```

**Solution:**
- Use lazy loading (don't recalculate every render)
- Check drift detection is working
- Profile with DevTools if still slow

---

## Rollout Sign-Off

**Phase 0:** ✅ ___________ (Date)
**Phase 1:** ✅ ___________ (Date)
**Phase 2:** ✅ ___________ (Date)
**Phase 3:** ✅ ___________ (Date)
**Phase 4:** ✅ ___________ (Date)
**Phase 5:** ✅ ___________ (Date)

**Production Ready:** ✅ ___________ (Date)

---

## Contact & Support

For issues or questions:
- Check `ARCHETYPE_INTEGRATION_GUIDE.md` for API reference
- Review `ArchetypeEnhancedForceOptionSuggestionEngine.js` for example port
- Debug with `forceAffinityRecalculation(actor)` utility

Good luck with the rollout! 🚀
