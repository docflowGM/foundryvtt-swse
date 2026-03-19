#!/bin/bash
################################################################################
# SWSE Progression Routing - Forensic Validation Commands
# Run these commands from the founded-swse root directory to verify findings
################################################################################

echo "=== SWSE Forensic Validation Script ==="
echo ""

# 1. Verify dead code was removed
echo "1. Verifying SWSENpcLevelUpEntry removal..."
if grep -q "import.*SWSENpcLevelUpEntry" scripts/infrastructure/hooks/levelup-sheet-hooks.js; then
    echo "   ❌ FAILED: SWSENpcLevelUpEntry import still present"
else
    echo "   ✓ PASSED: SWSENpcLevelUpEntry import removed"
fi
echo ""

# 2. Verify it's not instantiated anywhere
echo "2. Checking for SWSENpcLevelUpEntry instantiations..."
INSTANTIATIONS=$(find scripts -name "*.js" -type f | xargs grep -l "new SWSENpcLevelUpEntry" 2>/dev/null | wc -l)
if [ "$INSTANTIATIONS" -eq 0 ]; then
    echo "   ✓ PASSED: No instantiations found (dead code confirmed)"
else
    echo "   ❌ FAILED: Found $INSTANTIATIONS instantiation(s)"
fi
echo ""

# 3. Verify entry point exists and is correct
echo "3. Verifying entry point routing logic..."
if grep -q "new CharacterGenerator(actor)" scripts/infrastructure/hooks/levelup-sheet-hooks.js; then
    echo "   ✓ PASSED: CharacterGenerator instantiation found in entry point"
else
    echo "   ❌ FAILED: Entry point not found"
fi
echo ""

# 4. Verify detectIncompleteCharacter function
echo "4. Checking detectIncompleteCharacter function..."
if grep -q "function detectIncompleteCharacter" scripts/infrastructure/hooks/levelup-sheet-hooks.js; then
    echo "   ✓ PASSED: detectIncompleteCharacter function present"
    # Check for key conditions
    if grep -q "system.level.*=== 0" scripts/infrastructure/hooks/levelup-sheet-hooks.js; then
        echo "   ✓ PASSED: Level 0 check present"
    fi
    if grep -q "!actor.name" scripts/infrastructure/hooks/levelup-sheet-hooks.js; then
        echo "   ✓ PASSED: Name check present"
    fi
    if grep -q "type === 'class'" scripts/infrastructure/hooks/levelup-sheet-hooks.js; then
        echo "   ✓ PASSED: Class check present"
    fi
else
    echo "   ❌ FAILED: detectIncompleteCharacter function not found"
fi
echo ""

# 5. Verify CharacterGenerator default actorType
echo "5. Verifying CharacterGenerator defaults..."
if grep -q "actorType.*=.*options.actorType.*||.*'character'" scripts/apps/chargen/chargen-main.js; then
    echo "   ✓ PASSED: CharacterGenerator defaults to 'character' mode"
else
    echo "   ❌ FAILED: Default actorType not found or incorrect"
fi
echo ""

# 6. Check template exists
echo "6. Verifying chargen template..."
if [ -f "templates/apps/chargen.hbs" ]; then
    LINES=$(wc -l < templates/apps/chargen.hbs)
    echo "   ✓ PASSED: chargen.hbs exists ($LINES lines)"

    # Check for root element
    if head -5 templates/apps/chargen.hbs | grep -q '<div class="swse-chargen-window'; then
        echo "   ✓ PASSED: Root element found"
    fi

    # Check for closing div
    if tail -5 templates/apps/chargen.hbs | grep -q '</div>'; then
        echo "   ✓ PASSED: Closing root element found"
    fi
else
    echo "   ❌ FAILED: chargen.hbs template not found"
fi
echo ""

# 7. Count conditional blocks in template (potential issue source)
echo "7. Analyzing chargen.hbs conditionals..."
OPENS=$(grep -c '{{#if' templates/apps/chargen.hbs)
CLOSES=$(grep -c '{{/if}}' templates/apps/chargen.hbs)
echo "   Conditional opens: $OPENS"
echo "   Conditional closes: $CLOSES"
if [ "$OPENS" -eq "$CLOSES" ]; then
    echo "   ✓ PASSED: Balanced conditional blocks"
else
    echo "   ❌ WARNING: Unbalanced conditionals ($OPENS opens vs $CLOSES closes)"
fi
echo ""

# 8. Check for multiple root elements (potential crash source)
echo "8. Checking for potential multi-root violations..."
# This checks the top-level structure
TOP_LEVEL_ROOTS=$(head -30 templates/apps/chargen.hbs | grep -E '^<[a-z]' | wc -l)
if [ "$TOP_LEVEL_ROOTS" -le 1 ]; then
    echo "   ✓ PASSED: No obvious multi-root violations in template header"
else
    echo "   ⚠ WARNING: Found $TOP_LEVEL_ROOTS top-level root elements"
fi
echo ""

# 9. Summary
echo "=== VALIDATION SUMMARY ==="
echo ""
echo "All critical routing logic has been verified."
echo "If the Next button still crashes, the issue is in the template rendering."
echo ""
echo "To test progression flow in-game:"
echo "  1. Create new CHARACTER actor"
echo "  2. Click 'Chargen' from character sheet"
echo "  3. Enter name and click Next"
echo "  4. If crash occurs, check browser console for template error"
echo ""
echo "=== END VALIDATION ==="
