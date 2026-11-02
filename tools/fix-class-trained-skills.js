#!/usr/bin/env node
/**
 * Legacy entry point retained for existing developer workflows.
 * Previously hardcoded Scoundrel=5 and Scout=4, contrary to the Core Rulebook.
 * Use the validated canonical repair command instead.
 */
console.error('Deprecated: tools/fix-class-trained-skills.js does not modify production data.');
console.error('Core class skills are authoritative in packs/classes.db; validate with:');
console.error('  node --test tests/progression-data-jedi-class-skills.test.mjs');
process.exitCode = 1;
