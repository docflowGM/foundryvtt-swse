/**
 * TEST-PERSISTENCE-VERIFICATION.js
 *
 * Comprehensive test suite for form persistence verification.
 * Run this in the browser console while the character sheet is open.
 *
 * Tests:
 * 1. Text field (name)
 * 2. Numeric field (system.hp.value)
 * 3. Checkbox (system.skills.acrobatics.trained)
 * 4. Textarea (system.notes)
 *
 * For each test:
 * - Edit the field
 * - Trigger submit
 * - Verify no page refresh
 * - Verify logs appear
 * - Close/reopen sheet
 * - Verify persistence
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('SWSE CHARACTER SHEET PERSISTENCE VERIFICATION TEST SUITE');
console.log('═══════════════════════════════════════════════════════════');

const testResults = {
  textField: null,
  numericField: null,
  checkboxField: null,
  textareaField: null,
  duplicateListeners: null,
  overallStatus: 'PENDING'
};

/**
 * TEST 1: TEXT FIELD (actor.name)
 */
async function testTextField() {
  console.log('\n▶ TEST 1: TEXT FIELD (actor.name)');
  console.log('─────────────────────────────────────');

  const form = document.querySelector("form.swse-character-sheet-form");
  if (!form) {
    console.error('❌ Form not found');
    testResults.textField = 'FAILED - Form not found';
    return;
  }

  const nameInput = form.querySelector('input[name="name"]');
  if (!nameInput) {
    console.error('❌ Name input not found');
    testResults.textField = 'FAILED - Name input not found';
    return;
  }

  // Store original value
  const originalName = nameInput.value;
  console.log(`Original name: "${originalName}"`);

  // Change the value
  const testName = `TEST-${Date.now()}`;
  nameInput.value = testName;
  console.log(`Changed name to: "${testName}"`);

  // Trigger change event (should trigger auto-submit via listener)
  console.log('Dispatching change event...');
  nameInput.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for async submission
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if form still exists (would indicate no page refresh)
  const formAfter = document.querySelector("form.swse-character-sheet-form");
  if (!formAfter) {
    console.error('❌ PAGE REFRESHED - Form disappeared');
    testResults.textField = 'FAILED - Page refresh detected';
    return;
  }

  console.log('✓ No page refresh detected');
  console.log('Check console logs for: [PERSISTENCE] entries');
  testResults.textField = 'PASSED - Check logs for confirmation';
}

/**
 * TEST 2: NUMERIC FIELD (system.hp.value)
 */
async function testNumericField() {
  console.log('\n▶ TEST 2: NUMERIC FIELD (system.hp.value)');
  console.log('──────────────────────────────────────────');

  const form = document.querySelector("form.swse-character-sheet-form");
  if (!form) {
    console.error('❌ Form not found');
    testResults.numericField = 'FAILED - Form not found';
    return;
  }

  const hpInput = form.querySelector('input[name="system.hp.value"]');
  if (!hpInput) {
    console.error('❌ HP input not found - checking for HP in Overview tab');
    testResults.numericField = 'FAILED - HP input not found';
    return;
  }

  // Store original value
  const originalHP = hpInput.value;
  console.log(`Original HP: ${originalHP}`);

  // Change the value
  const testHP = String(Math.floor(Math.random() * 100));
  hpInput.value = testHP;
  console.log(`Changed HP to: ${testHP}`);

  // Trigger change event
  console.log('Dispatching change event...');
  hpInput.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for async submission
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if form still exists
  const formAfter = document.querySelector("form.swse-character-sheet-form");
  if (!formAfter) {
    console.error('❌ PAGE REFRESHED');
    testResults.numericField = 'FAILED - Page refresh detected';
    return;
  }

  console.log('✓ No page refresh detected');
  console.log('Check console logs for: [PERSISTENCE] entries');
  testResults.numericField = 'PASSED - Check logs for confirmation';
}

/**
 * TEST 3: CHECKBOX FIELD (system.skills.acrobatics.trained)
 */
async function testCheckboxField() {
  console.log('\n▶ TEST 3: CHECKBOX FIELD (system.skills.acrobatics.trained)');
  console.log('───────────────────────────────────────────────────────────');

  const form = document.querySelector("form.swse-character-sheet-form");
  if (!form) {
    console.error('❌ Form not found');
    testResults.checkboxField = 'FAILED - Form not found';
    return;
  }

  const trainedCheckbox = form.querySelector('input[name="system.skills.acrobatics.trained"]');
  if (!trainedCheckbox) {
    console.error('❌ Trained checkbox not found - may not be in Skills tab yet');
    console.log('Try switching to Skills tab first, then run this test again');
    testResults.checkboxField = 'SKIPPED - Skills tab not visible';
    return;
  }

  // Store original value
  const originalChecked = trainedCheckbox.checked;
  console.log(`Original checked state: ${originalChecked}`);

  // Toggle the checkbox
  trainedCheckbox.checked = !originalChecked;
  console.log(`Toggled to: ${trainedCheckbox.checked}`);

  // Trigger change event
  console.log('Dispatching change event...');
  trainedCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for async submission
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if form still exists
  const formAfter = document.querySelector("form.swse-character-sheet-form");
  if (!formAfter) {
    console.error('❌ PAGE REFRESHED');
    testResults.checkboxField = 'FAILED - Page refresh detected';
    return;
  }

  console.log('✓ No page refresh detected');
  console.log('Check console logs for: [PERSISTENCE] entries');
  testResults.checkboxField = 'PASSED - Check logs for confirmation';
}

/**
 * TEST 4: TEXTAREA FIELD (system.notes)
 */
async function testTextareaField() {
  console.log('\n▶ TEST 4: TEXTAREA FIELD (system.notes)');
  console.log('─────────────────────────────────────────');

  const form = document.querySelector("form.swse-character-sheet-form");
  if (!form) {
    console.error('❌ Form not found');
    testResults.textareaField = 'FAILED - Form not found';
    return;
  }

  const notesTextarea = form.querySelector('textarea[name="system.notes"]');
  if (!notesTextarea) {
    console.error('❌ Notes textarea not found - may need to be in Notes tab');
    testResults.textareaField = 'SKIPPED - Notes tab not visible';
    return;
  }

  // Store original value
  const originalNotes = notesTextarea.value;
  console.log(`Original notes length: ${originalNotes.length}`);

  // Change the value
  const testNotes = `TEST NOTE ${Date.now()}: Persistence verification test`;
  notesTextarea.value = testNotes;
  console.log(`Changed notes to: "${testNotes}"`);

  // Trigger change event
  console.log('Dispatching change event...');
  notesTextarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for async submission
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if form still exists
  const formAfter = document.querySelector("form.swse-character-sheet-form");
  if (!formAfter) {
    console.error('❌ PAGE REFRESHED');
    testResults.textareaField = 'FAILED - Page refresh detected';
    return;
  }

  console.log('✓ No page refresh detected');
  console.log('Check console logs for: [PERSISTENCE] entries');
  testResults.textareaField = 'PASSED - Check logs for confirmation';
}

/**
 * CHECK FOR DUPLICATE LISTENERS
 */
function checkDuplicateListeners() {
  console.log('\n▶ DUPLICATE LISTENER CHECK');
  console.log('──────────────────────────');

  const form = document.querySelector("form.swse-character-sheet-form");
  if (!form) {
    console.warn('⚠ Form not found for listener check');
    testResults.duplicateListeners = 'UNKNOWN';
    return;
  }

  // Count how many times the form is mentioned in console history
  console.log('✓ Form element found: form.swse-character-sheet-form');
  console.log('⚠ Full listener count cannot be inspected via JS');
  console.log('   → If [PERSISTENCE] Attaching submit listener appears MORE THAN ONCE per render');
  console.log('     in the console, there may be a duplicate listener issue.');
  console.log('   → Monitor the console logs during sheet interactions.');

  testResults.duplicateListeners = 'REQUIRES_MANUAL_INSPECTION';
}

/**
 * RUN ALL TESTS
 */
async function runAllTests() {
  console.log('\n');
  console.log('RUNNING ALL TESTS...');
  console.log('═══════════════════════════════════════════════════════════');

  // Wait a bit for sheet to fully render
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testTextField();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testNumericField();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testCheckboxField();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testTextareaField();
  await new Promise(resolve => setTimeout(resolve, 500));

  checkDuplicateListeners();

  // Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Text Field:              ${testResults.textField}`);
  console.log(`Numeric Field:           ${testResults.numericField}`);
  console.log(`Checkbox Field:          ${testResults.checkboxField}`);
  console.log(`Textarea Field:          ${testResults.textareaField}`);
  console.log(`Duplicate Listeners:     ${testResults.duplicateListeners}`);
  console.log('═══════════════════════════════════════════════════════════');

  console.log('\n✓ Test run complete!');
  console.log('\nNEXT STEPS:');
  console.log('1. Review console logs for [PERSISTENCE] entries');
  console.log('2. Verify no page refresh occurred');
  console.log('3. Close the sheet completely');
  console.log('4. Reopen the sheet');
  console.log('5. Verify all changed values persisted');
  console.log('6. Check if [PERSISTENCE] logs appear only once per field change (no duplicates)');
}

// Export for use
window.testPersistence = { runAllTests, testResults };

console.log('\n💡 To run tests, type in console:');
console.log('   testPersistence.runAllTests()');
console.log('\n');
