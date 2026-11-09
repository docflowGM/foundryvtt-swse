import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Droid Systems component browser: a view model over the installed-component and appendage authorities. It distinguishes confirmed installation
// from draft / item-only / unresolved evidence, shows each physical appendage by its own identity, keeps unknown capability unknown, and invents
// no defaults (no implied processor, locomotion, number of arms or left/right position).
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const { DroidSystemsResolver } = await import('../scripts/sheets/v2/droid-sheet/droid-systems-resolver.js');
const { buildDroidComponentBrowser, statusOf } = await import('../scripts/sheets/v2/droid-sheet/droid-component-browser.js');

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const hand = (i) => ({ id: 'hand', instanceId: `inst-h${i}`, locationId: `slot-${i}`, installed: true, enabled: true });
const ledger = (rows) => Object.fromEntries(rows.map((r) => [`${r.id}--${r.instanceId}`, { ...r, category: 'appendage', slot: 'appendage' }]));
const droid = (system, items = []) => ({ id: 'd1', type: 'droid', name: 'Unit', items, system: { droidSystems: { size: 'medium' }, ...system }, flags: { swse: {} } });
const browse = (actor, opts = { canOpenGarage: true }) => buildDroidComponentBrowser(actor, new DroidSystemsResolver(actor).resolve(), opts);
const by = (b, pred) => b.entries.filter(pred);

// 1. one entry per physical appendage, from its own identity; capability unknown stays "Not established"
{
  const a = droid({ installedSystems: ledger([hand(1), hand(2), hand(3)]) });
  const b = browse(a);
  const hands = by(b, (e) => e.category === 'appendage');
  assert.equal(hands.length, 3, 'three physical hands are three entries (no pairing, no cap, no default arms)');
  assert.deepEqual(hands.map((e) => e.key).sort(), ['appendage:inst:inst-h1', 'appendage:inst:inst-h2', 'appendage:inst:inst-h3']);
  assert.ok(hands.every((e) => e.status.key === 'confirmed'));
  for (const e of hands) {
    const f = Object.fromEntries(e.facts.map((x) => [x.label, x.value]));
    assert.equal(f.Instance, e.key.split(':').at(-1)); assert.ok(f.Location.startsWith('Slot')); assert.equal(f['Can hold'], 'Not established'); assert.equal(f['Can wield'], 'Not established'); assert.equal(f.Identity, 'Established (instance + location)');
  }
  assert.ok(!JSON.stringify(b).match(/Left Arm|Right Arm|Standard Droid Arms/i), 'no invented left/right positions or default arms');
  ok('each physical appendage is its own entry with its own instance/location; unknown hold/wield capability is shown as not established');
}

// 2. confirmed vs draft vs item-only vs unresolved are labelled apart
{
  const a = droid({
    installedSystems: { 'heuristic-processor': { installed: true, enabled: true, category: 'processor' } },
    droidSystems: { size: 'medium', sensors: [{ id: 'infrared-vision', name: 'Infrared Vision' }] },
  }, [{ id: 'itm_arm', type: 'droid-system', name: 'Armor Plating', system: { droidPartId: 'armor-plating', category: 'armor', integrated: true }, flags: {} }]);
  const b = browse(a);
  const st = Object.fromEntries(b.entries.map((e) => [e.name, e.status.key]));
  assert.ok(Object.values(st).includes('confirmed'), JSON.stringify(st));
  const draft = by(b, (e) => e.category === 'sensor')[0]; assert.equal(draft.status.key, 'draft'); assert.match(draft.notes.join(' '), /not confirmed in the installation ledger/);
  const item = by(b, (e) => e.name === 'Armor Plating')[0]; assert.ok(['item', 'unresolved'].includes(item.status.key)); assert.notEqual(item.status.key, 'confirmed');
  assert.deepEqual(b.statuses.map((s) => s.id).every((id) => ['confirmed', 'disabled', 'draft', 'item', 'unresolved'].includes(id)), true);
  ok('ledger-confirmed hardware, a draft (droidSystems-only) sensor and an item-only part are labelled apart; draft/item are never "installed"');
}

// 3. disabled, unresolved appendage evidence, nothing implied for an empty droid
{
  const off = droid({ installedSystems: ledger([{ ...hand(1), enabled: false }]) });
  assert.equal(by(browse(off), (e) => e.category === 'appendage')[0].status.key, 'disabled');
  const part = droid({ installedSystems: { hand: { installed: true, enabled: true } } }); // part-keyed record: no instance, no location
  const unres = by(browse(part), (e) => e.category === 'appendage');
  assert.ok(unres.length >= 1 && unres.every((e) => e.status.key !== 'confirmed'), 'a part-keyed appendage record is not a confirmed manipulator');
  const empty = droid({});
  const be = browse(empty);
  assert.equal(be.entries.length, 0, 'nothing is implied for a droid with no established components');
  const res = new DroidSystemsResolver(empty).resolve();
  assert.equal(res.appendages.slots.filter((s) => !s.isEmpty).length, 0); assert.equal(res.processor.isConfigured, false); assert.equal(res.processor.defaultName, null); assert.equal(res.appendages.defaultName, null); assert.equal(res.locomotion.defaultName, null);
  assert.ok(!/two droid arms|Heuristic Processor/i.test(JSON.stringify(res.appendages.warning) + JSON.stringify(res.processor.warning)));
  ok('disabled is distinguished; a part-keyed appendage is unresolved, not confirmed; an empty droid shows no implied processor, locomotion or arms');
}

// 4. hosted components, Garage entry preserves identity, quote is not eligibility
{
  const host = { ...hand(1) };
  const hosted = { id: 'magnetic-hands', instanceId: 'inst-m1', locationId: 'slot-9', hostInstanceId: 'inst-h1', installed: true, enabled: true, category: 'accessory' };
  const a = droid({ installedSystems: ledger([host]) }); a.system.installedSystems['magnetic-hands--inst-m1'] = hosted;
  const b = browse(a);
  const h = by(b, (e) => e.key === 'appendage:inst:inst-h1')[0];
  assert.ok(Array.isArray(h.modifications), 'a host instance exposes the Mods tab');
  const garage = h.operations.find((o) => o.action === 'customize-droid');
  assert.deepEqual(garage.attrs, [{ k: 'garage-region', v: 'appendage' }, { k: 'garage-slot', v: 'inst-h1' }]); assert.ok(!garage.disabled);
  assert.equal(browse(a, { canOpenGarage: false }).entries[0].operations.find((o) => o.action === 'customize-droid').disabled, true);
  assert.equal(statusOf({ source: 'builder' }, null).key, 'draft');
  const priced = browse(droid({ droidSystems: { size: 'medium', sensors: [{ id: 'infrared-vision', name: 'Infrared Vision' }] } }));
  assert.ok(priced.entries.every((e) => e.notes.every((x) => !/eligible for installation|may be installed/i.test(x))));
  ok('hosted components appear under their host instance; Open Garage carries the component identity and is disabled when the Garage is unavailable');
}

// 5. static: shared surface wired, no mutation, placeholders retired
{
  const tpl = fs.readFileSync('templates/actors/droid/v2/partials/droid-systems-panel.hbs', 'utf8');
  assert.ok(tpl.includes('browse-inspect.hbs" browser=droid.componentBrowser') && !tpl.includes('{{droid.resolvedSystems.processor.defaultName}}') && !tpl.includes('SWSE.ActorUI.Default'));
  const adapter = fs.readFileSync('scripts/sheets/v2/droid-sheet/droid-component-browser.js', 'utf8');
  assert.ok(!/ActorEngine|\.update\(|setFlag|createEmbedded|deleteEmbedded/.test(adapter));
  const resolver = fs.readFileSync('scripts/sheets/v2/droid-sheet/droid-systems-resolver.js', 'utf8');
  assert.ok(!/DEFAULT_APPENDAGE_SLOTS|left-arm|right-arm|Standard Droid Arms/.test(resolver.replace(/\/\/.*$/gm, '')), 'the implied two-arm defaults are gone');
  assert.ok(fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8').includes('activateBrowseInspect(this, html, { signal })'));
  assert.ok(fs.readFileSync('scripts/load-templates.js', 'utf8').includes('shared/partials/browse-inspect.hbs') && fs.readFileSync('helpers/handlebars/partials-auto.js', 'utf8').includes('shared/partials/browse-inspect.hbs'));
  ok('static: the Droid Systems tab mounts the shared browser; the adapter writes nothing; implied defaults are retired; the partial is registered');
}
console.log(`droid-component-browser: ${n} checks ok`);
