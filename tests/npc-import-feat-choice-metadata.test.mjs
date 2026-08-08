import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Feat-choice-persistence task, Phase 9: NPC-template statblock import built
// feat items from a bare name string with no choiceMeta/selectedChoice at
// all (scripts/engine/import/npc-template-importer-engine.js#_createFeatItem)
// — a real "display-name-only, zero structured backing" gap, per
// docs/audits/feat-choice-integrity-current-state.md §5. This locks in the
// fix: a scoped feat name from a statblock ("Weapon Focus (Rifles)") must
// produce an item carrying the canonical choiceMeta plus a populated
// system.selectedChoice, and an unscoped feat name must be unaffected.

registerFoundryPathLoader();
installFoundryShimGlobals();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FeatRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'feat-catalog.json'), 'utf8'));
FeatRegistry._resetIndexes();
FeatRegistry._indexDocuments(catalog);
FeatRegistry._initialized = true;

const { NPCTemplateImporterEngine } = await import('/systems/foundryvtt-swse/scripts/engine/import/npc-template-importer-engine.js');

// Scoped feat with a parenthetical choice from the statblock text.
{
  const item = NPCTemplateImporterEngine._createFeatItem('Weapon Focus (Rifles)');
  assert.equal(item.name, 'Weapon Focus (Rifles)', 'display name is preserved unchanged');
  assert.equal(item.type, 'feat');
  assert.ok(item.system.choiceMeta, 'canonical choiceMeta must be attached from the feat registry');
  assert.equal(item.system.choiceMeta.choiceKind, 'weapon_focus');
  assert.equal(item.system.selectedChoice, 'Rifles', 'the parenthetical choice must be persisted as system.selectedChoice, not left only in the display name');
  assert.equal(item.system.choiceResolved, true);
  assert.ok(item.system.choiceResolvedAt);
}

// Unscoped feat — must be unaffected (no choiceMeta on the canonical record,
// no selectedChoice fabricated).
{
  const item = NPCTemplateImporterEngine._createFeatItem('Toughness');
  assert.equal(item.name, 'Toughness');
  assert.equal(item.system.choiceMeta, undefined, 'Toughness has no choiceMeta in the canonical catalog and must not get one invented');
  assert.equal(item.system.selectedChoice, undefined);
}

// Scoped feat referenced WITHOUT its choice in the statblock text — must
// still attach choiceMeta (so downstream integrity checks can flag it as
// "missing choice") but must not fabricate a selectedChoice out of nothing.
{
  const item = NPCTemplateImporterEngine._createFeatItem('Skill Focus');
  assert.ok(item.system.choiceMeta, 'canonical choiceMeta must still be attached even without a parenthetical choice');
  assert.equal(item.system.choiceMeta.choiceKind, 'skill_focus');
  assert.equal(item.system.selectedChoice, undefined, 'must not invent an arbitrary default choice');
}

console.log('OK: NPC-template statblock feat import attaches canonical choiceMeta and persists parenthetical choices as system.selectedChoice.');
