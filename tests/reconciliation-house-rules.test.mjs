/**
 * House-rule coverage for reconciliation (Phase 6 addendum).
 *
 * TEST SCOPE: unit / integration-with-stubs. The REAL canonical code runs: HouseRuleService +
 * FeatRulesAdapter + TalentCadenceEngine (settings are served by a stub game.settings), the real grant table,
 * the real HouseRuleFeatGrants service (ActorEngine.createEmbeddedDocuments and the registries are stubbed so
 * created items are captured), the real reconciler / evidence / findings / resolvers. NOT covered here (needs
 * Foundry V13): the real ActorEngine write, createActor/updateSetting hooks firing, dialogs, sheet re-render.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };

// minimal ApplicationV2 surface so the (unchanged) dialog modules the grant service imports can load under Node
const fnd = globalThis.foundry ?? (globalThis.foundry = {});
fnd.applications = fnd.applications ?? {};
fnd.applications.api = fnd.applications.api ?? { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (Base) => Base };

// ---- stub settings store served through game.settings (real HouseRuleService reads it) ----
const store = {};
const gameObj = globalThis.game ?? (globalThis.game = {});
gameObj.settings = { get: (ns, key) => store[key], set: async (ns, key, v) => { store[key] = v; }, settings: { has: () => true } };
const setRule = (key, value) => { store[key] = value; };
const resetRules = () => { for (const k of Object.keys(store)) delete store[k]; };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
const rec = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const { ProgressionReconciler } = rec;
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { resolveFinding } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-resolvers.js');
const T = await import('/systems/foundryvtt-swse/scripts/houserules/house-rule-grant-table.js');
const { HouseRuleFeatGrants } = await import('/systems/foundryvtt-swse/scripts/houserules/houserule-feat-grants.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { FeatRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js');
const evidence = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/progression-evidence.js');

for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const cls = (name, level) => ({ id: `c${++seq}`, type: 'class', name, system: { level, classId: name.toLowerCase() }, flags: { swse: {} } });
const actorOf = (items = [], level = 1, extra = {}) => ({
  id: `a${++seq}`, name: 'Hero', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 },
  items: [cls('Soldier', level), ...items],
  system: { level, hp: {}, class: { id: 'soldier', name: 'Soldier' }, progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level }] }, ...extra },
});
const ruleItem = (setting, kind = 'automatic') => {
  const g = T.grantForSetting(setting);
  return { id: `hr${++seq}`, type: g.type, name: g.name, system: { houseRuleGranted: true, houseRuleSetting: setting, acquisition: T.buildGrantAcquisition({ settingKey: setting, grantKind: kind }) }, flags: { swse: { houseRuleGranted: true } } };
};
const plainItem = (type, name, system = {}) => ({ id: `p${++seq}`, type, name, system, flags: { swse: {} } });
const stamped = (type, name, session, slotType, extra = {}) => ({ id: `s${++seq}`, type, name, system: { acquisition: { sourceSession: session, selectionKey: `${type}s`, slotType, ...extra } }, flags: { swse: { progression: { sourceSession: session, selectionKey: `${type}s`, slotType, ...extra } } } });
const report = a => ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true });
const findings = a => F.buildFindings(report(a));
const sheet = a => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });
const ids = a => findings(a).map(f => f.id);
const check = async (name, fn) => { resetRules(); await fn(); console.log(`PASS ${name}`); };

await check('1. RAW, every feat/talent house rule disabled: ordinary entitlements only, no house-rule findings or notes', () => {
  const a = actorOf();
  const r = report(a);
  assert.equal(r.slots.heroicTalents.length, 0);
  assert.deepEqual(ids(a).filter(i => i.startsWith('houserule')), []);
  assert.deepEqual(r.houseRule.notes, []);
  assert.deepEqual(r.houseRule.missingGrants, []);
  assert.ok(ids(a).includes('slot:soldier-1-class-talent-1') && ids(a).includes('slot:general-feat-level-1'), 'ordinary missing selections are identifiable');
});

await check('2. talentEveryLevel: cadence is read from TalentCadenceEngine; extra-L1 is its own entitlement; later-level interplay is informational only', () => {
  setRule('talentEveryLevel', true);            // talentEveryLevelExtraL1 defaults true
  let a = actorOf([], 3);
  let r = report(a);
  assert.equal(r.slots.heroicTalents.filter(s => s.houseRule === 'talentEveryLevelExtraL1').length, 1);
  assert.ok(r.houseRule.notes.some(n => n.code === 'house-rule-talent-cadence-undetermined'));
  const f = findings(a).find(x => x.id === 'slot:houserule-talent-extra-l1');
  assert.equal(f.code, 'MISSING_HOUSE_RULE_TALENT');
  assert.equal(f.source, 'canonical-class-progression');
  assert.match(f.explanation, /house rule/i);
  assert.equal(f.resolve.kind, 'open-step');
  // ordinary class talent slots are untouched (no entitlement invented for even levels)
  assert.deepEqual(r.slots.classTalents.map(s => s.classLevel).sort(), [1, 3]);
  setRule('talentEveryLevelExtraL1', false);
  a = actorOf([], 3);
  assert.equal(report(a).slots.heroicTalents.length, 0, 'extra L1 disabled => no extra entitlement');
  setRule('talentEveryLevel', false); setRule('talentEveryLevelExtraL1', true);
  assert.equal(report(actorOf([], 3)).slots.heroicTalents.length, 0, 'extra L1 alone (talentEveryLevel off) is not an entitlement');
});

await check('3. extra-L1 talent is satisfied by a heroic-tagged talent and does not consume the ordinary class talent', () => {
  setRule('talentEveryLevel', true);
  const a = actorOf([stamped('talent', 'Heroic Pick', 'S1', 'heroic'), stamped('talent', 'Class Pick', 'S1', 'class', { classId: 'soldier', classLevel: 1 })]);
  const r = report(a);
  assert.equal(r.slots.heroicTalents.find(s => s.houseRule).status, 'filled');
  assert.equal(r.slots.classTalents.find(s => s.classLevel === 1).status, 'filled');
  assert.ok(!ids(a).includes('slot:houserule-talent-extra-l1'));
  // only the ordinary class talent present => the extra remains missing AND the ordinary one stays satisfied
  const b = actorOf([stamped('talent', 'Class Pick', 'S1', 'class', { classId: 'soldier', classLevel: 1 })]);
  assert.ok(ids(b).includes('slot:houserule-talent-extra-l1'));
  assert.equal(report(b).slots.classTalents.find(s => s.classLevel === 1).status, 'filled');
});

await check('4. talentDoubleLevels and multiclassBonusChoice variants: audited as unimplemented (informational, never a finding)', () => {
  setRule('talentDoubleLevels', true);
  setRule('multiclassBonusChoice', 'all_feats');
  const a = actorOf([], 2);
  const notes = report(a).houseRule.notes.filter(n => n.code === 'house-rule-unimplemented');
  assert.equal(notes.length, 2);
  assert.ok(!ids(a).some(i => /double|multiclass/i.test(i)));
});

await check('5. each automatic grant: a missing grant is its own finding with a house-rule source', () => {
  for (const g of T.HOUSE_RULE_GRANTS) {
    resetRules(); setRule(g.setting, true);
    const a = actorOf();
    const f = findings(a).find(x => x.id === `houserule-grant:${g.setting}`);
    assert.ok(f, g.setting);
    assert.equal(f.code, 'MISSING_HOUSE_RULE_GRANT');
    assert.equal(f.source, `houserule:${g.setting}`);
    assert.equal(f.resolve.kind, 'grant-house-rule');
    assert.equal(f.resolve.dataset.settingKey, g.setting);
  }
});

await check('6. free grants are recognized and consume NO ordinary slot; an ordinary missing selection stays identifiable', () => {
  for (const g of T.HOUSE_RULE_GRANTS) {
    resetRules(); setRule(g.setting, true);
    const a = actorOf([ruleItem(g.setting)]);
    const r = report(a);
    assert.equal(r.evidence.counts.houseRule, 1, g.setting);
    assert.deepEqual(ids(a).filter(i => i.startsWith('houserule-grant')), [], 'owned grant => no missing-grant finding');
    assert.equal(r.rollup.counts.extra, 0, 'never extra');
    assert.ok(ids(a).includes('slot:general-feat-level-1'), 'the ordinary general feat selection is still reported missing');
    assert.ok(ids(a).includes('slot:soldier-1-class-talent-1'));
    assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 1).status, 'open', 'the grant did not fill a general slot');
  }
});

await check('7. manual Dodge before/after enabling dodgeDefault: an UNSTAMPED item is inferred, never proof - ordinary accounting becomes unverifiable, not a definite missing selection', () => {
  const generalL1 = a => report(a).slots.generalFeats.find(s => s.characterLevel === 1).status;
  setRule('dodgeDefault', false);
  const manual = actorOf([plainItem('feat', 'Dodge')]);
  assert.equal(generalL1(manual), 'unverifiable', 'before: an ordinary unattributed feat');
  setRule('dodgeDefault', true);
  const r = report(manual);
  assert.equal(r.evidence.counts.houseRuleInferred, 1);
  assert.equal(r.evidence.counts.houseRule, 0, 'not recorded as a certain house-rule grant');
  assert.deepEqual(ids(manual).filter(i => i.startsWith('houserule-grant')), [], 'the grant expectation is satisfied by the owned Dodge (no duplicate is created)');
  assert.equal(generalL1(manual), 'unverifiable', 'after: STILL not a definite missing selection (it may be the ordinary pick)');
  assert.ok(!ids(manual).includes('slot:general-feat-level-1'), 'no definite missing-selection finding is manufactured from the ambiguity');
  assert.ok(sheet(manual).validation.notes.some(n => /free house-rule grant or an ordinary selection/.test(n.text)), 'the player is told, informationally');
  assert.equal(sheet(manual).validation.findings.length, 0 + findings(manual).filter(f => f.code === 'MISSING_CLASS_TALENT').length);
  // contrast: an EXPLICITLY marked grant is certain, so the ordinary selection stays definitely missing
  const marked = actorOf([ruleItem('dodgeDefault')]);
  assert.equal(generalL1(marked), 'open');
  // a progression-stamped ordinary Dodge keeps its ordinary meaning
  const stampedOrdinary = actorOf([stamped('feat', 'Dodge', 'S1', 'general', { characterLevel: 1 })]);
  assert.equal(report(stampedOrdinary).evidence.counts.houseRuleInferred, 0);
  assert.equal(generalL1(stampedOrdinary), 'filled');
  // declining the replacement: nothing created, nothing missing; accepting: replacement is a distinct explicit grant, consumes no slot
  const withReplacement = actorOf([plainItem('feat', 'Dodge'), ruleItem('dodgeDefault', 'replacement')]);
  assert.equal(report(withReplacement).evidence.counts.houseRule, 1);
  assert.equal(generalL1(withReplacement), 'unverifiable');
});

await check('8. rule disabled AFTER creation: explicitly granted item stays identifiable, is never extra, nothing is deleted or flagged', () => {
  setRule('dodgeDefault', true);
  const a = actorOf([ruleItem('dodgeDefault')]);
  setRule('dodgeDefault', false);
  const r = report(a);
  assert.equal(r.evidence.counts.houseRule, 1);
  assert.equal(r.rollup.counts.extra, 0);
  assert.equal(a.items.filter(i => i.name === 'Dodge').length, 1);
  assert.equal(evidence.getAcquisitionEvidence(a, a.items.find(i => i.name === 'Dodge')).houseRule.active, false);
  assert.deepEqual(ids(a).filter(i => i.startsWith('houserule')), []);
});

await check('9. rule enabled AFTER creation: grant expected; legal existing selections are not relabelled extra', () => {
  const a = actorOf([plainItem('feat', 'Toughness')]);
  assert.equal(findings(a).filter(f => f.code === 'MISSING_HOUSE_RULE_GRANT').length, 0);
  setRule('powerAttackDefault', true);
  assert.ok(ids(a).includes('houserule-grant:powerAttackDefault'));
  assert.equal(report(a).rollup.counts.extra, 0);
});

await check('10. a setting change while a report is memoized is never served stale (complete effective-settings signature)', () => {
  const a = actorOf();
  const view = () => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' }).validation.findings.map(f => f.id);
  assert.ok(!view().includes('houserule-grant:dodgeDefault'));
  setRule('dodgeDefault', true);                // same actor stamp: only the rule signature differs
  assert.ok(view().includes('houserule-grant:dodgeDefault'), 'memo key includes the feat/talent rules signature');
  setRule('dodgeDefault', false);
  assert.ok(!view().includes('houserule-grant:dodgeDefault'));
  // every rule key the audit identified is covered by the ONE signature list
  for (const key of ['talentEveryLevel', 'talentEveryLevelExtraL1', 'talentDoubleLevels', 'weaponFinesseDefault', 'pointBlankShotDefault', 'powerAttackDefault', 'preciseShotDefault', 'dodgeDefault', 'armoredDefenseForAll', 'multiclassBonusChoice', 'multiclassExtraStartingFeats']) {
    assert.ok(T.FEAT_TALENT_RULE_KEYS.includes(key), key);
    const before = T.getFeatTalentRulesSignature();
    setRule(key, key === 'multiclassBonusChoice' ? 'all_feats' : true);
    assert.notEqual(T.getFeatTalentRulesSignature(), before, `${key} must change the signature`);
    delete store[key];
  }
  assert.equal(typeof rec.invalidateReconciliationForRuleChange, 'function');
  rec.invalidateReconciliationForRuleChange();   // must not throw with no apps
});

// ---- real HouseRuleFeatGrants service with captured creation ----
function captureCreation({ yieldBeforeWrite = false } = {}) {
  const created = [];
  const original = ActorEngine.createEmbeddedDocuments;
  ActorEngine.createEmbeddedDocuments = async (actor, type, docs, options = {}) => {
    if (yieldBeforeWrite) await Promise.resolve();            // lets a concurrent client interleave between its check and its write
    for (const d of docs) {
      const id = options.keepId && d._id ? d._id : `n${++seq}`;
      if (actor.items.some(i => i.id === id)) throw new Error(`Item "${id}" already exists`);   // Foundry primary-key uniqueness
      const item = { flags: {}, ...d, id };
      actor.items.push(item);
      created.push(item);
    }
    return docs;
  };
  const origFeat = FeatRegistry.getDocumentById;
  FeatRegistry.getDocumentById = async () => null;
  return { created, restore() { ActorEngine.createEmbeddedDocuments = original; FeatRegistry.getDocumentById = origFeat; } };
}

await check('11. [real grant service] grantMissing creates the item with durable provenance, once; honours the rule; never touches owned items', async () => {
  const cap = captureCreation();
  try {
    setRule('weaponFinesseDefault', true);
    const a = actorOf();
    const first = await HouseRuleFeatGrants.grantMissing(a, 'weaponFinesseDefault');
    assert.equal(first.created, true);
    const item = cap.created[0];
    assert.equal(item.system.acquisition.source, 'house-rule');
    assert.equal(item.system.acquisition.houseRuleKey, 'weaponFinesseDefault');
    assert.equal(item.system.acquisition.grantKind, 'automatic');
    assert.equal(item.system.acquisition.countsAgainstSlot, false);
    assert.equal(item.system.houseRuleGranted, true);
    const second = await HouseRuleFeatGrants.grantMissing(a, 'weaponFinesseDefault');
    assert.equal(second.created, false);
    assert.equal(second.reason, 'already-owned');
    assert.equal(cap.created[0].id.length, 16, 'deterministic 16-char document id');
    assert.equal(cap.created.length, 1, 'idempotent');
    setRule('weaponFinesseDefault', false);
    assert.equal((await HouseRuleFeatGrants.grantMissing(actorOf(), 'weaponFinesseDefault')).reason, 'rule-disabled');
    assert.equal((await HouseRuleFeatGrants.grantMissing({ type: 'npc', items: [] }, 'weaponFinesseDefault')).reason, 'not-applicable');
    // a created grant is then recognized by reconciliation as a house-rule grant
    setRule('weaponFinesseDefault', true);
    assert.equal(report(a).evidence.counts.houseRule, 1);
    assert.deepEqual(ids(a).filter(i => i.startsWith('houserule-grant')), []);
  } finally { cap.restore(); }
});

await check('12. [real grant service] replacement: offered only on rule switch-on, once; accepted => distinct house-rule identity consuming no ordinary slot; declined => no fictitious finding', async () => {
  const cap = captureCreation();
  const offers = [];
  const origOffer = HouseRuleFeatGrants._offerReplacement;
  HouseRuleFeatGrants._offerReplacement = async (actor, type, name, setting) => { offers.push(setting); };
  try {
    setRule('dodgeDefault', true);
    const a = actorOf([stamped('feat', 'Dodge', 'S1', 'general', { characterLevel: 1 })]);
    const grant = T.grantForSetting('dodgeDefault');
    await HouseRuleFeatGrants._grantFeatToActor(a, grant, 'dodgeDefault', { offerReplacement: false });
    assert.equal(offers.length, 0, 'never offered at world load / new actor');
    await HouseRuleFeatGrants._grantFeatToActor(a, grant, 'dodgeDefault', { offerReplacement: true });
    assert.equal(offers.length, 1, 'offered when the rule is switched on');
    assert.equal(cap.created.length, 0, 'no automatic duplicate');
    assert.deepEqual(ids(a).filter(i => i.startsWith('houserule-grant')), [], 'declining creates no missing-grant finding');
    // accept: replacement feat (stub registry returns a doc)
    const FeatReg = (await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js')).FeatRegistry;
    FeatReg.getDocumentById = async () => ({ name: 'Skill Focus', toObject: () => ({ name: 'Skill Focus', type: 'feat', system: {} }) });
    await HouseRuleFeatGrants._grantReplacementFeat(a, 'feat', 'x', 'dodgeDefault', 'Dodge');
    const repl = cap.created[0];
    assert.equal(repl.system.acquisition.grantKind, 'replacement');
    assert.equal(repl.system.acquisition.replacesName, 'Dodge');
    assert.equal(repl.system.acquisition.houseRuleKey, 'dodgeDefault');
    const r = report(a);
    assert.equal(r.evidence.counts.houseRule, 1);
    assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 1).status, 'filled', 'the ORIGINAL ordinary Dodge still fills its slot; the replacement took none');
    assert.equal(r.rollup.counts.extra, 0);
    await HouseRuleFeatGrants._grantFeatToActor(a, grant, 'dodgeDefault', { offerReplacement: true });
    assert.equal(offers.length, 1, 'replacement opportunity is not re-offered once taken');
  } finally { HouseRuleFeatGrants._offerReplacement = origOffer; cap.restore(); }
});

await check('13. Resolve missing grant: uses the canonical service, once; second click is a no-op; no level change', async () => {
  const cap = captureCreation();
  try {
    setRule('dodgeDefault', true);
    const a = actorOf();
    const deps = {
      findFindings: x => findings(x),
      grantHouseRule: (x, key) => HouseRuleFeatGrants.grantMissing(x, key),
      openStep: async () => {}, recalcAll: async () => {}, recomputeHP: async () => {}, confirm: async () => true,
    };
    const first = await resolveFinding({ actor: a, findingId: 'houserule-grant:dodgeDefault', deps });
    assert.equal(first.status, 'resolved');
    const second = await resolveFinding({ actor: a, findingId: 'houserule-grant:dodgeDefault', deps });
    assert.equal(second.status, 'already-resolved');
    assert.equal(cap.created.length, 1);
    assert.equal(a.system.level, 1);
  } finally { cap.restore(); }
});

await check('14. Resolve extra-L1 talent opens the existing step; repeated clicks mutate nothing; level unchanged', async () => {
  setRule('talentEveryLevel', true);
  const a = actorOf();
  const log = [];
  const deps = { findFindings: x => findings(x), openStep: async ds => log.push(ds), grantHouseRule: async () => { throw new Error('no'); }, recalcAll: async () => {}, recomputeHP: async () => {}, confirm: async () => true };
  const snapshot = JSON.stringify(a.system);
  assert.equal((await resolveFinding({ actor: a, findingId: 'slot:houserule-talent-extra-l1', deps })).status, 'opened-step');
  await resolveFinding({ actor: a, findingId: 'slot:houserule-talent-extra-l1', deps });
  assert.equal(log.length, 2);
  assert.equal(log[0].slotType, 'heroic-talent');
  assert.equal(log[0].characterLevel, 1);
  assert.equal(JSON.stringify(a.system), snapshot);
});

await check('15. Ignore a house-rule finding: persists, suppresses only it, restorable; a changed discrepancy is not hidden', () => {
  setRule('dodgeDefault', true); setRule('powerAttackDefault', true);
  const a = actorOf();
  const f = findings(a).find(x => x.id === 'houserule-grant:dodgeDefault');
  a.flags.swse.reconciliationIgnored = F.addIgnored([], f, { userId: 'u1' });
  assert.equal(a.flags.swse.reconciliationIgnored[0].source, 'houserule:dodgeDefault');
  let s = sheet(a);
  assert.ok(!s.validation.findings.some(x => x.id === f.id));
  assert.ok(s.validation.findings.some(x => x.id === 'houserule-grant:powerAttackDefault'), 'other house-rule findings stay');
  assert.ok(s.validation.findings.some(x => x.id === 'slot:general-feat-level-1'), 'ordinary findings stay');
  setRule('dodgeDefault', false);               // discrepancy gone => record is stale, not hiding anything
  s = sheet(a);
  assert.ok(s.validation.staleIgnored.some(r => r.id === f.id));
  a.flags.swse.reconciliationIgnored = F.removeIgnored(F.readIgnored(a), f.id);
  setRule('dodgeDefault', true);
  assert.ok(sheet(a).validation.findings.some(x => x.id === f.id), 'restored');
});

await check('16. Silent Success: a mechanically consistent character (manual or progression-built, with and without house rules) has no !', () => {
  setRule('dodgeDefault', true); setRule('talentEveryLevel', true);
  const common = { derived: { bab: 1, defenses: { fortitude: { classBonus: 2 }, reflex: { classBonus: 1 }, will: { classBonus: 0 } } } };
  // manual: untagged feat + two talents + the free grant
  const manual = actorOf([ruleItem('dodgeDefault'), plainItem('feat', 'Toughness'), plainItem('talent', 'A'), plainItem('talent', 'B')], 1, common);
  assert.equal(sheet(manual).validation.findings.length, 0);
  assert.equal(sheet(manual).validation.playerActionable, false);
  // progression-built: certified general feat + class talent + heroic extra talent + the free grant
  const built = actorOf([ruleItem('dodgeDefault'), stamped('feat', 'Toughness', 'S1', 'general', { characterLevel: 1 }), stamped('talent', 'Class Pick', 'S1', 'class', { classId: 'soldier', classLevel: 1 }), stamped('talent', 'Heroic Pick', 'S1', 'heroic')], 1, common);
  assert.equal(sheet(built).validation.findings.length, 0);
});

await check('19. HR-F2 single-writer election: with two GM clients only the ACTIVE GM runs automatic grant paths; players never do', () => {
  const asClient = (user, activeGM) => { gameObj.user = user; gameObj.users = { activeGM }; return T.canWriteGrants(); };
  const gm1 = { id: 'gm1', isGM: true }; const gm2 = { id: 'gm2', isGM: true }; const player = { id: 'p1', isGM: false };
  assert.equal(asClient(gm1, gm1), true);
  assert.equal(asClient(gm2, gm1), false, 'the second GM client stands down');
  assert.equal(asClient(player, gm1), false);
  assert.equal(asClient(gm1, undefined), true, 'no election info => this GM');
  // the service handler really consults it
  const handlers = [];
  const origOn = globalThis.Hooks?.on;
  globalThis.Hooks = globalThis.Hooks ?? {};
  globalThis.Hooks.on = (name, fn) => { handlers.push({ name, fn }); };
  HouseRuleFeatGrants.initialize();
  globalThis.Hooks.on = origOn;
  const onSetting = handlers.find(h => h.name === 'updateSetting').fn;
  const origActors = gameObj.actors;
  gameObj.actors = [actorOf()];
  let calls = 0;
  const origGrant = HouseRuleFeatGrants._grantFeatsToActor;
  HouseRuleFeatGrants._grantFeatsToActor = async () => { calls += 1; };
  try {
    setRule('dodgeDefault', true);
    gameObj.user = gm2; gameObj.users = { activeGM: gm1 };
    onSetting({ key: 'foundryvtt-swse.dodgeDefault' }, true, {});
    assert.equal(calls, 0, 'non-active GM: no grant');
    gameObj.user = gm1;
    onSetting({ key: 'foundryvtt-swse.dodgeDefault' }, true, {});
    return new Promise(resolve => setTimeout(() => { assert.equal(calls, 1, 'active GM: exactly one'); HouseRuleFeatGrants._grantFeatsToActor = origGrant; gameObj.actors = origActors; resolve(); }, 0));
  } finally { gameObj.user = gm1; }
});

await check('20. HR-F2 duplicate safety when two clients BOTH pass the ownership check: deterministic document id makes the second create fail, leaving exactly one item', async () => {
  const cap = captureCreation({ yieldBeforeWrite: true });
  try {
    setRule('dodgeDefault', true);
    const a = actorOf();
    const grant = T.grantForSetting('dodgeDefault');
    // two independent "clients": each saw no Dodge, each now writes (bypassing the in-process guard on purpose)
    const [r1, r2] = await Promise.all([
      HouseRuleFeatGrants._createFeatItem(a, grant, 'dodgeDefault'),
      HouseRuleFeatGrants._createFeatItem(a, grant, 'dodgeDefault'),
    ]);
    assert.deepEqual([r1.created, r2.created].sort(), [false, true]);
    assert.equal(a.items.filter(i => i.name === 'Dodge' || i.type === 'feat').length, 1, 'exactly one granted item');
    // the same client re-entering (setting change + world load + Resolve click) shares ONE operation
    const b = actorOf();
    const [s1, s2, s3] = await Promise.all([1, 2, 3].map(() => HouseRuleFeatGrants.grantMissing(b, 'dodgeDefault')));
    assert.equal(b.items.filter(i => i.type === 'feat').length, 1);
    assert.equal([s1, s2, s3].filter(r => r.created).length >= 1, true);
    // replacement: one per actor + setting, duplicate-safe
    const FeatReg = (await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js')).FeatRegistry;
    FeatReg.getDocumentById = async () => ({ name: 'Skill Focus', toObject: () => ({ name: 'Skill Focus', type: 'feat', system: {} }) });
    const c = actorOf([plainItem('feat', 'Dodge')]);
    await Promise.all([HouseRuleFeatGrants._grantReplacementFeat(c, 'feat', 'x', 'dodgeDefault', 'Dodge'), HouseRuleFeatGrants._grantReplacementFeat(c, 'feat', 'x', 'dodgeDefault', 'Dodge')]);
    assert.equal(c.items.filter(i => i.system?.acquisition?.grantKind === 'replacement').length, 1);
    // ids are stable per actor/setting/kind and distinct across them
    assert.equal(T.deterministicGrantItemId('A', 'dodgeDefault'), T.deterministicGrantItemId('A', 'dodgeDefault'));
    assert.notEqual(T.deterministicGrantItemId('A', 'dodgeDefault'), T.deterministicGrantItemId('B', 'dodgeDefault'));
    assert.notEqual(T.deterministicGrantItemId('A', 'dodgeDefault'), T.deterministicGrantItemId('A', 'dodgeDefault', 'replacement'));
    assert.match(T.deterministicGrantItemId('A', 'dodgeDefault'), /^[a-z0-9]{16}$/);
  } finally { cap.restore(); }
});

await check('21. HR-F2 wiring (static): the world-load pass and setting handler use the election; creation uses keepId', () => {
  const patches = fs.readFileSync(path.join(ROOT, 'scripts/engine/progression/feats/feat-housekeeping-runtime-patches.js'), 'utf8');
  assert.match(patches, /if \(!canWriteGrants\(\)\) return;/);
  const service = fs.readFileSync(path.join(ROOT, 'scripts/houserules/houserule-feat-grants.js'), 'utf8');
  assert.match(service, /canWriteGrants\(\) && setting\.key/);
  assert.match(service, /\{ keepId: true \}/);
});

await check('22. HR-F3 Armored Defense: the REAL DefenseCalculator already applies it from the owned talent - enabling the rule works exactly when the grant materializes', async () => {
  const { DefenseCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js');
  const armor = { id: 'ar', name: 'Body Armor', type: 'armor', system: { equipped: true, armorType: 'light', maxDexBonus: 3, armorCheckPenalty: 0, reflexBonus: 6, fortitudeBonus: 0 } };
  const prof = { id: 'pf', name: 'Armor Proficiency (light)', type: 'feat', system: {} };
  const soldier10 = { id: 'cl', type: 'class', name: 'Soldier', system: { level: 10, classId: 'soldier' } };
  const mk = items => ({ type: 'character', items: [soldier10, ...items], effects: [], system: { attributes: { dex: { base: 10, racial: 0, enhancement: 0, temp: 0 } }, abilities: {}, defenses: {}, conditionTrack: { current: 0 } } });
  const levels = [{ class: 'Soldier', level: 10 }];
  const without = await DefenseCalculator.calculate(mk([armor, prof]), levels, {}, {});
  const withTalent = await DefenseCalculator.calculate(mk([armor, prof, ruleItem('armoredDefenseForAll')]), levels, {}, {});
  assert.equal(withTalent.reflex.total - without.reflex.total, 10 - 6, 'heroic level (10) replaces the armor bonus (6) once the talent item is owned');
  // proof of mechanism: no code reads the setting; only the owned talent matters
  const src = fs.readFileSync(path.join(ROOT, 'scripts/actors/derived/defense-calculator.js'), 'utf8');
  assert.ok(!src.includes('armoredDefenseForAll'));
  // and when the talent is absent (rule enabled but grant not materialized) nothing changes - so the missing-grant finding is mechanically meaningful
  setRule('armoredDefenseForAll', true);
  assert.ok(ids(actorOf()).includes('houserule-grant:armoredDefenseForAll'));
});

await check('17. audit tripwire: settings the manifest calls "wired" but no engine code consumes (update the audit if this fails)', () => {
  const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sources = [];
  const walk = dir => { for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const rel = `${dir}/${e.name}`; if (e.isDirectory()) walk(rel); else if (/\.js$/.test(e.name)) sources.push(rel); } };
  walk('scripts');
  const consumers = key => sources.filter(f => !/houserules\/|settings-defaults|house-rules-app|GMHouseRules|houserule-/.test(f) && !f.includes('house-rule-grant-table') && read(f).includes(key));
  assert.deepEqual(consumers('talentDoubleLevels').filter(f => !f.includes('reconciler')), [], 'talentDoubleLevels gained a consumer: re-audit it');
  assert.deepEqual(consumers("'multiclassBonusChoice'").filter(f => !f.includes('reconciler') && !f.includes('ProgressionRules')), [], 'multiclassBonusChoice gained a consumer: re-audit it');
});

await check('18. one canonical grant table: the services no longer keep private copies, and only one materializer exists', () => {
  const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const patches = read('scripts/engine/progression/feats/feat-housekeeping-runtime-patches.js');
  assert.ok(!/id: '252b67d6e31c377e'/.test(patches) && !/createEmbeddedDocuments/.test(patches), 'patch file has no private table and no materializer');
  const service = read('scripts/houserules/houserule-feat-grants.js');
  assert.ok(!/id: '252b67d6e31c377e'/.test(service));
  assert.match(service, /canWriteGrants\(\)/);
  assert.match(read('scripts/sheets/v2/character-like-sheet.js'), /grantMissing\(actor, key\)/);
});

console.log('reconciliation-house-rules: all assertions passed');
