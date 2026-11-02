import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Officer Share Talent is a registered level-up-only step with a separate selector',()=>{
 const registry=src('scripts/engine/progression/registries/progression-node-definitions.js');
 const mapper=src('scripts/apps/progression-framework/registries/node-descriptor-mapper.js');
 const computer=src('scripts/apps/progression-framework/shell/active-step-computer.js');
 assert.match(registry,/'share-talent':\s*\{/);
 assert.match(registry,/selectionKey:\s*'shareTalentSelections'/);
 assert.match(mapper,/'share-talent':\s*ShareTalentStep/);
 assert.match(computer,/case 'share-talent':/);
 assert.match(computer,/shareTalentChoices/);
});
test('Share Talent selection is session-state-backed and separate from ordinary talent grants',()=>{
 const session=src('scripts/apps/progression-framework/shell/progression-session.js');
 const step=src('scripts/apps/progression-framework/steps/share-talent-step.js');
 assert.match(session,/shareTalentSelections:\s*\[\]/);
 assert.match(session,/shareTalentSelections:\s*\{/);
 assert.match(session,/'share-talent':\s*'shareTalentSelections'/);
 assert.match(step,/async onItemCommitted\(/);
 assert.match(step,/getSelection\(\)/);
 assert.match(step,/_commitNormalized\(shell, 'shareTalentSelections'/);
 assert.doesNotMatch(step,/_commitNormalized\(shell, 'talents'/);
 const hbs=src('templates/apps/progression-framework/steps/share-talent-work-surface.hbs');
 assert.match(hbs,/data-action="focus-item"/);
 assert.match(hbs,/option-card-action\.hbs/);
});
test('finalization freezes Share Talent under Officer flags and NOT the new-talent item bucket',()=>{
 const finalizer=src('scripts/apps/progression-framework/shell/progression-finalizer.js');
 assert.match(finalizer,/resolveOfficerShareTalentChoice\(/);
 assert.match(finalizer,/flags\.swse\.classFeatures\.officer\.sharedTalents/);
 assert.match(finalizer,/persistedOfficerShareTalents\(actor\)/);
});
