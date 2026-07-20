import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexSource = await readFile(new URL('../index.js', import.meta.url), 'utf8');
const settingsSource = await readFile(new URL('../scripts/core/settings.js', import.meta.url), 'utf8');
const holonetSource = await readFile(new URL('../scripts/holonet/integration/holonet-init.js', import.meta.url), 'utf8');
const holonetRegistrySource = await readFile(new URL('../scripts/holonet/holonet-source-registry.js', import.meta.url), 'utf8');
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

// Custom document classes must be installed during init before world documents
// are constructed. Registering a sheet class is not a substitute for this.
assert.match(indexSource, /import\s+\{\s*SWSEItemBase\s*\}/);
assert.match(indexSource, /CONFIG\.Actor\.documentClass\s*=\s*SWSEV2BaseActor/);
assert.match(indexSource, /CONFIG\.Item\.documentClass\s*=\s*SWSEItemBase/);

assert.match(settingsSource, /lightsaberConstructionMode/);
assert.match(settingsSource, /registerHolonetSettings\(\)/);
assert.match(holonetSource, /holonet_records/);
assert.match(holonetSource, /holonet_party_state/);

// Aliased Holonet source families must not initialize the same adapter class
// repeatedly. This previously produced duplicate source hooks and startup logs.
assert.match(holonetRegistrySource, /#initializedAdapters\s*=\s*new WeakSet/);
assert.match(holonetRegistrySource, /#initializationPromises\s*=\s*new WeakMap/);
assert.match(holonetRegistrySource, /#initializeAdapter\(adapter\)/);

assert.match(templatesSource, /templates\/shell\/partials\/holopad-frame\.hbs/);

const extraSkillUses = manifest.packs.find(pack => pack.name === 'extraskilluses');
assert.ok(extraSkillUses, 'Extra Skill Uses compendium must remain declared.');
assert.equal(extraSkillUses.path, 'packs/extraskilluses');

// Foundry v13/v14 requires directory-backed LevelDB packs. No manifest pack may
// regress to a legacy NeDB .db path.
assert.ok(manifest.packs.length >= 60);
assert.ok(manifest.packs.every(pack => typeof pack.path === 'string' && !pack.path.endsWith('.db')));
assert.ok(manifest.packs.some(pack => pack.name === 'feats' && pack.path === 'packs/feats'));
assert.equal(Number(manifest.compatibility?.minimum), 13);
assert.equal(Number(manifest.compatibility?.verified), 14);
assert.equal(Number(manifest.compatibility?.maximum), 14);

assert.doesNotMatch(babSource, /await waitForClassDataAuthority\(/);
assert.match(babSource, /Deferring heroic BAB authority during initializeDocuments/);
assert.match(babSource, /_startupSafeBab/);

console.log('Startup bootstrap regression guards passed.');
