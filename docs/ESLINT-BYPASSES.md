# ESLint Rule Bypasses Documentation

Phase 5 compliance requires documenting all ESLint rule bypasses in the codebase.

This file tracks ESLint disable comments and explains why they are necessary.

## Current Bypasses

### 1. `/scripts/mentor/mentor-archetype-paths.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: TBD - Needs investigation
- **Action**: Audit and document specific reason
- **Priority**: HIGH

### 2. `/scripts/engine/systems/gear-templates-engine.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: TBD - Needs investigation
- **Action**: Audit and document specific reason
- **Priority**: HIGH

### 3. `/scripts/apps/base/swse-application-v2.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: Likely AppV2 class inheritance patterns
- **Action**: Verify v13 AppV2 compatibility
- **Priority**: MEDIUM

### 4. `/scripts/core/foundry-env.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: Direct Foundry API usage (game.*,canvas.*,ui.*)
- **Status**: ✓ JUSTIFIED - Core env module must access globals
- **Priority**: LOW

### 5. `/scripts/debug/npc-render-probe.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: Debug code, not production
- **Status**: ✓ JUSTIFIED - Non-production debug utility
- **Priority**: LOW (debug only)

### 6. `/scripts/engine/ArchetypeDefinitions.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: TBD - Needs investigation
- **Action**: Audit and document specific reason
- **Priority**: HIGH

### 7. `/scripts/engine/BuildIdentityAnchor.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: TBD - Needs investigation
- **Action**: Audit and document specific reason
- **Priority**: HIGH

### 8. `/scripts/engine/TalentAbilitiesEngine.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: TBD - Needs investigation
- **Action**: Audit and document specific reason
- **Priority**: HIGH

### 9. `/scripts/maintenance/generate-mentor-dialogues-data.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: Maintenance/generator script, not production
- **Status**: ✓ JUSTIFIED - Non-production tooling
- **Priority**: LOW (dev tool)

### 10. `/scripts/utils/feat-actions-mapper.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: TBD - Needs investigation
- **Action**: Audit and document specific reason
- **Priority**: HIGH

### 11. `/scripts/validate/validate-icon-keys.js`
- **Rule**: Unspecified (file-level disable)
- **Reason**: Validation/utility script, not production
- **Status**: ✓ JUSTIFIED - Non-production validation tool
- **Priority**: LOW (validation only)

## Action Items

### Immediate (Phase 5)
- [ ] Audit files #1, #2, #6, #7, #8, #10
- [ ] Document specific ESLint rules being bypassed
- [ ] Determine if bypasses are justified or if code should be fixed
- [ ] Convert file-level disables to line-specific disables with reasons

### Best Practices for Bypasses
```javascript
// ❌ BAD - No explanation
/* eslint-disable */
code here

// ✓ GOOD - Specific rule and reason
/* eslint-disable no-restricted-properties
   Reason: Direct system data mutation is required in this edge case.
   See: https://link-to-issue
*/
code here
```

## Future Versions
- When upgrading ESLint rules, re-audit all bypasses
- Consider enabling stricter rules if code is fixed
- Document v14+ compatibility requirements
