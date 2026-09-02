import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad ecosystem redesign — Phase 7: static wiring proof that
// Workspace's new campaign-dossier selection and relationship-navigation
// controls actually reach GMWorkspaceSurfaceController /
// GMCampaignTargetService end to end, and that the pre-existing party
// member command modal's actions (Full Health/Short Rest/Full
// Rest/Restore FP/Give Intel/Assign Job/Open Sheet/XP grant/XP
// presets/Level-Up XP/Remove from Party) all remain present — Phase 7
// addendum L requires proving parity before any future removal, so this
// test is also the regression guard that nothing was silently dropped
// while the new selected-Actor detail was added alongside it.
//
// PURE ADDITIVE DESIGN CONTRACT — the dossier selection/target wiring did
// not exist before this phase.

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const controller = await read('scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js');
const template = await read('templates/apps/gm-datapad/surfaces/workspace.hbs');

// --- controller imports and wires the real target service ----------------
assert.match(controller, /import \{ GMCampaignTargetService \} from '\/systems\/foundryvtt-swse\/scripts\/ui\/shell\/gm\/GMCampaignTargetService\.js';/);
assert.match(controller, /this\._wireDossierSelection\(pageElement, signal\);/);
assert.match(controller, /this\._wireDossierTargets\(pageElement, signal\);/);
assert.match(controller, /_wireDossierSelection\(pageElement, signal\)\s*\{/);
assert.match(controller, /_wireDossierTargets\(pageElement, signal\)\s*\{/);

// --- selection patches surface state and re-renders, never navigates away
assert.match(controller, /querySelectorAll\('\[data-workspace-select-actor\]'\)/);
assert.match(controller, /patchSurfaceState\?\.\('workspace', \{ selectedActorId: actorId \}/, 'selecting an actor must patch selectedActorId on the workspace surface state');

// --- relationship-row targets resolve through the real target service ----
assert.match(controller, /querySelectorAll\('\[data-dossier-target-kind\]'\)/);
assert.match(controller, /GMCampaignTargetService\.resolve\(\{ kind, id \}\)/, 'dossier relationship rows must resolve through GMCampaignTargetService, never a hand-rolled switch');
assert.match(controller, /await this\.host\?\.navigateToSurface\?\.\(target\.surfaceId, target\)/);
assert.match(controller, /if \(kind === 'actor'\)/, "an 'actor' kind must still be handled defensively (opens the real sheet) even though no dossier row currently emits it");

// --- the real template renders the attributes the handler reads ----------
assert.match(template, /data-workspace-select-actor="\{\{this\.id\}\}"/, 'the roster card grid must expose a Dossier selection control');
assert.match(template, /data-dossier-target-kind="faction" data-dossier-target-id="\{\{this\.id\}\}"/, 'the Faction standing row must carry a real navigable target');
assert.match(template, /data-dossier-target-kind="location" data-dossier-target-id="\{\{this\.id\}\}"/, 'the Location relationship row must carry a real navigable target');
assert.match(template, /data-dossier-target-kind="job" data-dossier-target-id="\{\{this\.id\}\}"/, 'the Job relationship row must carry a real navigable target');
assert.match(template, /data-dossier-target-kind="intel" data-dossier-target-id="\{\{this\.id\}\}"/, 'the Intel relationship row must carry a real navigable target');
assert.match(template, /data-dossier-target-kind="trade" data-dossier-target-id="\{\{this\.id\}\}"/, 'the Trade operation row must carry a real navigable target');

// --- Workspace remains a campaign dossier, not a second Actor sheet ------
assert.doesNotMatch(template, /system\.attacks|system\.talents|system\.feats|system\.equipment/, 'Workspace must not reproduce full Actor sheet fields (attacks/talents/feats/equipment) — those stay on the real Actor sheet');

// --- Phase 7 addendum L: the old party-member command modal's actions
// must all still be present — this is the parity proof required before
// any future removal, not a claim that removal has happened.
const modalActions = [
  /data-actor-full-health="\{\{this\.id\}\}".*Full Health/s,
  /data-party-actor-rest="short-rest"/,
  /data-party-actor-rest="extended-rest"/,
  /data-party-restore-force="\{\{this\.id\}\}"/,
  /data-party-open-intel="\{\{this\.id\}\}"/,
  /data-party-open-job="\{\{this\.id\}\}"/,
  /data-open-actor="\{\{this\.id\}\}"/,
  /data-party-xp-form="\{\{this\.id\}\}"/,
  /data-party-xp-preset="250"/,
  /data-party-level-up="\{\{this\.id\}\}"/,
  /data-party-remove-actor="\{\{this\.id\}\}"/
];
for (const pattern of modalActions) {
  assert.match(template, pattern, `the pre-existing party member command modal action matching ${pattern} must still be present — Phase 7 adds the selected-Actor dossier alongside it, it does not remove it without a proven replacement`);
}

// --- both the old modal and the new dossier delegate to the SAME
// controller data-attributes (gm-party-actor-rest, data-party-open-job,
// etc.) — never a second, duplicate action implementation.
const dossierSection = template.slice(template.indexOf('data-workspace-dossier'), template.indexOf('workspace-content'));
assert.match(dossierSection, /data-actor-full-health="\{\{selection\.identity\.id\}\}"/);
assert.match(dossierSection, /data-party-actor-rest="short-rest" data-actor-id="\{\{selection\.identity\.id\}\}"/);
assert.match(dossierSection, /data-party-restore-force="\{\{selection\.identity\.id\}\}"/);
assert.match(dossierSection, /data-party-open-intel="\{\{selection\.identity\.id\}\}"/);
assert.match(dossierSection, /data-party-open-job="\{\{selection\.identity\.id\}\}"/);
assert.match(dossierSection, /data-workspace-party-toggle="\{\{selection\.identity\.id\}\}"/);

// --- Faction inbound path (Phase 7's second inbound Actor->Workspace path)
const factionsTemplate = await read('templates/apps/gm-datapad/surfaces/factions.hbs');
const factionsController = await read('scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js');
assert.match(factionsTemplate, /data-gm-faction-action="open-workspace-actor"/, 'Factions must expose a second inbound Actor->Workspace path (addendum requirement), distinct from open-contact-actor');
assert.match(factionsController, /case 'open-workspace-actor':/);
assert.match(factionsController, /GMCampaignTargetService\.workspaceActor\(actor\.id\)/);
assert.match(factionsController, /await this\.host\?\.navigateToSurface\?\.\(target\.surfaceId, target\)/);

console.log('Workspace dossier wiring passed (selection patches state and re-renders, relationship rows resolve through the real GMCampaignTargetService/navigateToSurface() contract, Workspace stays a dossier rather than a second Actor sheet, every pre-existing party-command-modal action is still present, the new dossier delegates to the same controller data-attributes rather than duplicating them, and Factions gained a second inbound Actor->Workspace path).');
