import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexSource = await readFile(new URL('../index.js', import.meta.url), 'utf8');
const settingsSource = await readFile(new URL('../scripts/core/settings.js', import.meta.url), 'utf8');
const holonetSource = await readFile(new URL('../scripts/holonet/integration/holonet-init.js', import.meta.url), 'utf8');
const templatesSource = await readFile(new URL('../scripts/load-templates.js', import.meta.url), 'utf8');
const babSource = await readFile(new URL('../scripts/actors/derived/bab-calculator.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../system.json', import.meta.url), 'utf8'));

assert.match(indexSource, /Hooks\.once\(["']init["']/);
assert.match(indexSource, /Hooks\.once\(["']ready["']/);
assert.match(indexSource, /function registerLegacyHandlebarsHelpers\s*\(/);
assert.match(indexSource, /function registerSettings\s*\(/);
assert.match(indexSource, /await registerSystemSettings\(\)/);
assert.match(indexSource, /SystemInitHooks\.registerHooks\(\)/);
assert.match(indexSource, /await preloadHandlebarsTemplates\(\)/);
assert.match(indexSource, /await initializeHolonet\(\)/);

assert.match(settingsSource, /lightsaberConstructionMode/);
assert.match(settingsSource, /registerHolonetSettings\(\)/);
assert.match(holonetSource, /holonet_records/);
assert.match(holonetSource, /holonet_party_state/);

assert.match(templatesSource, /templates\/shell\/partials\/holopad-frame\.hbs/);
assert.ok(manifest.packs.some(pack => pack.name === 'extraskilluses' && pack.path === 'packs/extraskilluses.db'));

assert.doesNotMatch(babSource, /await waitForClassDataAuthority\(/);
assert.match(babSource, /Deferring heroic BAB authority during initializeDocuments/);
assert.match(babSource, /_startupSafeBab/);

console.log('Startup bootstrap regression guards passed.');
