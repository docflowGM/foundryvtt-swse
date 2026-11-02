#!/usr/bin/env node
/**
 * Disabled legacy class rewrite script.
 *
 * Its hard-coded defense table differs from the 37 source-certified class
 * records and its Noble/Officer/Sith Apprentice BAB metadata is wrong.
 * Running it would silently overwrite published class defenses.
 *
 * packs/classes.db is the operational SSOT. Use the class BAB regression
 * test rather than regenerating class data from this obsolete mapping.
 */
console.error('Refusing legacy class defense/BAB rewrite: hardcoded values are not source-certified.');
console.error('Run: node --test tests/class-bab-canonical-progression.test.mjs');
process.exitCode = 1;
