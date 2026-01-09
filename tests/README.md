# SWSE System Tests

This directory contains test utilities and manual testing scripts for the Foundry VTT SWSE system.

## Test Files

### test-feat-effects.js

**Purpose:** Manual testing utility for the FeatEffectsEngine parsing logic

**Description:**
This Node.js script tests the parsing and validation of feat effects data. It's used to verify that feat effects are correctly parsed from compendium data and that the FeatEffectsEngine can properly handle various effect definitions.

**How to Run:**
```bash
# From the repository root:
node tests/test-feat-effects.js
```

**What It Tests:**
- Feat effect parsing from JSON definitions
- Effect trigger conditions
- Effect application and resolution
- Error handling for malformed effect data
- Integration with FeatEffectsEngine

**Output:**
The script outputs test results to the console, including:
- Number of tests passed/failed
- Detailed error messages for failures
- Performance metrics for parsing operations

**Requirements:**
- Node.js 12 or higher
- Access to feat data definitions (usually from compendium packs)

**Development Notes:**
- This is a development utility and is NOT loaded by Foundry VTT
- Use for local development and testing only
- Results help validate changes to feat effect system before deploying

## Adding New Tests

To add new test files to this directory:

1. Name files with `test-*.js` or `*.test.js` pattern
2. Add a header comment explaining the test's purpose
3. Include documentation for running the test
4. Reference this README with any special requirements

## Test Philosophy

These tests are designed to:
- Verify complex parsing logic without running in Foundry
- Catch data structure errors early
- Document expected behavior for game mechanics
- Enable rapid iteration during development

Tests should be:
- Independent and reproducible
- Isolated from Foundry runtime
- Quick to execute (< 5 seconds)
- Clear in their output and assertions
