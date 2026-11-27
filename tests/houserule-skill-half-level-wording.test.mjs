import assert from 'node:assert/strict';
import fs from 'node:fs';
// DC-A09: skills add half CHARACTER level (3N-DC); the manifest and the registered setting must say so.
const manifest = fs.readFileSync('scripts/houserules/houserules-manifest.js', 'utf8');
const settings = fs.readFileSync('scripts/houserules/houserule-settings.js', 'utf8');
const m = manifest.slice(manifest.indexOf("key: 'disableHalfLevelSkillBonus'"), manifest.indexOf("key: 'disableHalfLevelSkillBonus'") + 400);
assert.match(m, /character level/); assert.doesNotMatch(m, /heroic level/);
const s = settings.slice(settings.indexOf("register('disableHalfLevelSkillBonus'"), settings.indexOf("register('disableHalfLevelSkillBonus'") + 300);
assert.match(s, /character level/);
console.log('houserule-skill-half-level-wording: ok');
