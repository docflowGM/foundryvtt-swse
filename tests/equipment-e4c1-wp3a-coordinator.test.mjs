import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP2-C1 + WP3-A (NOT CONVERGED): reader fail-closed occupancy boundary, intent fingerprint, journal, species evidence adapter and the
// GM-local coordinator. All persistence is a deterministic in-memory fake; the E3 resolvers and the canonical weapon shapes are REAL.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const fp = await import('/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js');
const J = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js');
const { readActorEquipmentState } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-reader.js');
const C = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js');
const { loadActorSpeciesProfile } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-evidence-adapter.js');
const { OUTCOME: O, GM_LOCAL_CONTEXT: GM } = C;

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const REC = (posture, purpose, appendageIds) => ({ weaponPosture: posture, weaponOccupancy: { schemaVersion: 1, purpose, appendageIds } });

// ------------------------------------------------------------------------------------------------ intent fingerprint
{
  const hex = (s) => fp.sha256Hex(new TextEncoder().encode(s));
  assert.equal(hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  assert.equal(hex('The quick brown fox jumps over the lazy dog'), 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  assert.equal(fp.sha256Hex(new Uint8Array(1_000_000).fill(0x61)), 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  for (let len = 0; len <= 300; len++) {
    const b = new Uint8Array(randomBytes(len));
    assert.equal(fp.sha256Hex(b), createHash('sha256').update(b).digest('hex'), `length ${len}`);
  }
  for (const s of ['é', 'ж', '日本語', '😀 emoji', 'é vs é', 'a\u0000b']) assert.equal(hex(s), createHash('sha256').update(s, 'utf8').digest('hex'), s);
  ok('1: SHA-256 matches the published vectors (including the million-a vector) and node:crypto for lengths 0-300 and Unicode inputs');
}
{
  const a = fp.canonicalize({ b: 1, a: [1, { y: 2, x: 'é' }], c: null, d: true });
  assert.equal(a, '{"a":[1,{"x":"é","y":2}],"b":1,"c":null,"d":true}');
  assert.equal(fp.canonicalize({ x: 1, y: 2 }), fp.canonicalize({ y: 2, x: 1 }));
  assert.equal(fp.canonicalize(-0), '0');
  assert.notEqual(fp.fingerprintIntent('é'), fp.fingerprintIntent('é'), 'Unicode is never normalized');
  assert.notEqual(fp.fingerprintIntent({ a: 1 }), fp.fingerprintIntent({ a: '1' }));
  assert.match(fp.fingerprintIntent({ k: [1, 2, 3] }), /^[0-9a-f]{64}$/);
  const code = (fn) => { try { fn(); } catch (e) { return e instanceof fp.CanonicalizationError ? e.code : `other:${e.message}`; } return 'no-throw'; };
  assert.equal(code(() => fp.canonicalize(undefined)), 'UNSUPPORTED_TYPE');
  assert.equal(code(() => fp.canonicalize({ a: undefined })), 'UNSUPPORTED_TYPE');
  assert.equal(code(() => fp.canonicalize(NaN)), 'NON_FINITE_NUMBER');
  assert.equal(code(() => fp.canonicalize(Infinity)), 'NON_FINITE_NUMBER');
  assert.equal(code(() => fp.canonicalize(10n)), 'UNSUPPORTED_TYPE');
  assert.equal(code(() => fp.canonicalize(() => 1)), 'UNSUPPORTED_TYPE');
  assert.equal(code(() => fp.canonicalize(Symbol('x'))), 'UNSUPPORTED_TYPE');
  assert.equal(code(() => fp.canonicalize(new Date())), 'NOT_PLAIN_OBJECT');
  assert.equal(code(() => fp.canonicalize(new Map())), 'NOT_PLAIN_OBJECT');
  assert.equal(code(() => fp.canonicalize({ [Symbol('s')]: 1 })), 'SYMBOL_KEY');
  assert.equal(code(() => fp.canonicalize('\ud800')), 'LONE_SURROGATE');
  assert.equal(code(() => fp.canonicalize({ '\udc00': 1 })), 'LONE_SURROGATE');
  assert.equal(code(() => fp.canonicalize([1, , 3])), 'SPARSE_ARRAY');
  const cyc = {}; cyc.self = cyc;
  assert.equal(code(() => fp.canonicalize(cyc)), 'CYCLE');
  let deep = {}; for (let i = 0; i < 40; i++) deep = { d: deep };
  assert.equal(code(() => fp.canonicalize(deep)), 'TOO_DEEP');
  ok('2: canonical serialization is key-order independent, Unicode-stable and rejects every malformed or unsupported value with a stable code');
}

// ------------------------------------------------------------------------------------------------ journal (pure)
const D1 = fp.fingerprintIntent('intent-1'); const D2 = fp.fingerprintIntent('plan-1');
const entryItems = [{ id: 'w1', before: { 'system.weaponPosture': 'STOWED' }, target: { 'system.weaponPosture': 'READIED', 'flags.swse.fireState.wielded': 'one-handed' }, beforeAbsent: ['flags.swse.fireState.wielded'] }];
{
  assert.equal(J.readJournal(undefined).status, 'absent');
  assert.equal(J.readJournal({ schemaVersion: 1, entries: [] }).status, 'valid');
  assert.equal(J.readJournal({ schemaVersion: 2, entries: [] }).status, 'invalid');
  assert.equal(J.readJournal('x').status, 'invalid');
  let e = J.addPreparedEntry([], { requestId: 'r1', intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'pending', actionType: 'move' } });
  assert.equal(e[0].phase, 'PREPARED'); assert.ok(J.isUnresolved(e[0]));
  assert.throws(() => J.addPreparedEntry(e, { requestId: 'r1', intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'pending' } }), (x) => x.code === 'DUPLICATE_REQUEST');
  assert.throws(() => J.transitionEntry(e, 'r1', 'FINALIZED'), (x) => x.code === 'ILLEGAL_TRANSITION');
  e = J.transitionEntry(e, 'r1', 'APPLIED'); e = J.transitionEntry(e, 'r1', 'FINALIZED');
  assert.ok(!J.isUnresolved(e[0]));
  assert.throws(() => J.transitionEntry(e, 'r1', 'NOT_APPLIED'), (x) => x.code === 'ILLEGAL_TRANSITION');
  assert.equal(J.readJournal(J.toStored(e)).status, 'valid');
  assert.deepEqual([...J.unresolvedItemIds(J.addPreparedEntry([], { requestId: 'r2', intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'not-required' } })).keys()], ['w1']);
  // bounded: resolved entries are evicted, unresolved never
  let big = [];
  for (let i = 0; i < 20; i++) { big = J.addPreparedEntry(big, { requestId: `q${i}`, intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'not-required' } }); big = J.transitionEntry(J.transitionEntry(big, `q${i}`, 'APPLIED'), `q${i}`, 'FINALIZED'); }
  big = J.addPreparedEntry(big, { requestId: 'q-new', intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'not-required' } });
  assert.equal(big.length, 20); assert.ok(!big.some((x) => x.requestId === 'q0')); assert.ok(big.some((x) => x.requestId === 'q-new'));
  let full = [];
  for (let i = 0; i < 20; i++) full = J.addPreparedEntry(full, { requestId: `u${i}`, intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'not-required' } });
  assert.throws(() => J.addPreparedEntry(full, { requestId: 'u-x', intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'not-required' } }), (x) => x.code === 'JOURNAL_FULL');
  ok('3: the journal validates, enforces phase transitions, withholds unresolved items, is bounded, and never evicts an unresolved entry');
}
{
  const entry = J.addPreparedEntry([], { requestId: 'r1', intentDigest: D1, planDigest: D2, items: entryItems, spend: { state: 'pending', actionType: 'move' } })[0];
  const obs = (o) => ({ w1: o });
  const target = { 'system.weaponPosture': 'READIED', 'flags.swse.fireState.wielded': 'one-handed' };
  const before = { 'system.weaponPosture': 'STOWED', 'flags.swse.fireState.wielded': undefined };
  assert.equal(J.classifyTransaction(entry, obs(target)).classification, 'APPLIED');
  assert.equal(J.classifyTransaction(entry, obs(before)).classification, 'NOT_APPLIED');
  assert.equal(J.classifyTransaction(entry, obs({ 'system.weaponPosture': 'READIED', 'flags.swse.fireState.wielded': undefined })).classification, 'INDETERMINATE');
  assert.equal(J.classifyTransaction(entry, obs({ 'system.weaponPosture': 'EQUIPPED', 'flags.swse.fireState.wielded': 'one-handed' })).classification, 'INDETERMINATE');
  assert.equal(J.classifyTransaction(entry, {}).classification, 'INDETERMINATE');
  const two = J.addPreparedEntry([], { requestId: 'r2', intentDigest: D1, planDigest: D2, spend: { state: 'not-required' }, items: [entryItems[0], { id: 'w2', before: { 'system.weaponPosture': 'STOWED' }, target: { 'system.weaponPosture': 'EQUIPPED' } }] })[0];
  assert.equal(J.classifyTransaction(two, { w1: target, w2: { 'system.weaponPosture': 'STOWED' } }).classification, 'PARTIAL');
  const applied = J.classifyTransaction(entry, obs(target), { spendMarkerPresent: false });
  assert.ok(applied.reasons.some((r) => /no action spend/.test(r)), 'applied without a spend marker is flagged');
  const notApplied = J.classifyTransaction(entry, obs(before), { spendMarkerPresent: true });
  assert.ok(notApplied.reasons.some((r) => /not applied but an action spend/.test(r)));
  assert.equal(J.classifyTransaction(entry, obs(target)).spend, 'unknown');
  ok('4: read-only classification distinguishes APPLIED, NOT_APPLIED, PARTIAL and INDETERMINATE and flags spend/Item mismatches; success is never inferred from a request id');
}

// ------------------------------------------------------------------------------------------------ fixtures
const item = (id, identityKey, system, extra = {}) => ({ id, type: 'weapon', name: 'Renamed Thing', flags: { swse: { canonicalWeapon: { identityKey }, ...(extra.fireState ? { fireState: extra.fireState } : {}), ...(extra.swse ?? {}) } }, system });
const SABER = 'lightsaber-chassis-archaic-lightsaber'; const GREAT = 'lightsaber-chassis-great';
const ONE = { v: 1, wielded: 'one-handed' };
const human = () => ({ name: 'Human' });
const actorOf = (items, extra = {}) => { const a = { id: 'actor-1', type: 'character', system: { size: 'Medium' }, flags: {}, items, ...extra }; items.get = (id) => items.find((i) => i.id === id); return a; };
const by = (state, id) => state.weapons.find((w) => w.itemId === id);
const rd = (actor, extra = {}) => readActorEquipmentState(actor, { resolveSpeciesProfile: human, ...extra });
const codes = (r) => (r.issues ?? []).map((i) => i.code);

// ------------------------------------------------------------------------------------------------ WP2-C1 reader boundary
{
  // invalid record naming an arm another weapon uses
  const s1 = rd(actorOf([
    item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }),
    item('bad', SABER, REC('STOWED', 'hold', ['natural-arm-1'])), // invalid: STOWED may not hold appendages
  ]));
  assert.equal(by(s1, 'bad').status, 'contradictory');
  assert.equal(by(s1, 'a').effectivePosture, null, 'a weapon sharing an appendage with a malformed claim is not certified');
  assert.equal(by(s1, 'a').status, 'indeterminate');
  assert.ok(by(s1, 'a').gates.some((g) => g.code === 'uncertain-occupancy-collision'));
  assert.equal(s1.conflicts.length, 0, 'an uncertain collision is not an established conflict');
  assert.equal(s1.occupancy.assignments.length, 1, 'the primary occupancy still holds only the valid assignment');
  assert.deepEqual(s1.occupancyEvidence.uncertainCollisions.map((c) => [c.itemId, c.probeItemId, c.appendageId]), [['a', 'bad', 'natural-arm-1']]);
  // same weapon, different arm: certified
  const s2 = rd(actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }), item('bad', SABER, REC('STOWED', 'hold', ['natural-arm-2']))]));
  assert.equal(by(s2, 'a').effectivePosture, 'READIED');
  ok('5: a malformed record that still names an appendage withholds readiness from a weapon using it (uncertain, not established) and does not affect weapons on other appendages');
}
{
  // unreadable claim -> incomplete -> no positive readiness at all
  const unreadable = { weaponPosture: 'READIED', weaponOccupancy: 'natural-arm-1' };
  const noList = { weaponPosture: 'EQUIPPED', weaponOccupancy: { schemaVersion: 1, purpose: 'hold' } };
  const partial = { weaponPosture: 'EQUIPPED', weaponOccupancy: { schemaVersion: 1, purpose: 'hold', appendageIds: ['natural-arm-2', 7] } };
  for (const bad of [unreadable, noList, partial]) {
    const s = rd(actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }), item('s', SABER, REC('STOWED', null, [])), item('x', SABER, bad)]));
    assert.equal(s.occupancyEvidence.completeness, 'incomplete');
    assert.equal(by(s, 'a').effectivePosture, null); assert.equal(by(s, 'a').status, 'indeterminate');
    assert.ok(by(s, 'a').gates.some((g) => g.code === 'occupancy-completeness-unestablished'));
    assert.equal(by(s, 's').effectivePosture, 'STOWED', 'a STOWED weapon claims nothing and is unaffected');
    assert.ok(s.issues.some((i) => i.code === 'occupancy-completeness-unestablished'));
  }
  const readableOnly = rd(actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }), item('x', SABER, { weaponPosture: 'EQUIPPED', weaponOccupancy: { schemaVersion: 1, purpose: 'hold', appendageIds: [] } })]));
  assert.equal(readableOnly.occupancyEvidence.completeness, 'complete');
  assert.equal(by(readableOnly, 'a').effectivePosture, 'READIED', 'an invalid record with a readable, empty claim hides nothing');
  ok('6: an unreadable or incomplete appendage claim makes occupancy incomplete and fails every positive readiness closed; STOWED and readable-empty claims do not');
}
{
  // forged / uncertain special identity can never make a hand assignment disappear
  const forged = rd(actorOf([
    item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }),
    item('n', SABER, REC('EQUIPPED', 'hold', ['natural-arm-1']), { swse: { isNaturalWeapon: true, alwaysArmed: true } }),
  ]));
  assert.equal(by(forged, 'a').effectivePosture, null); assert.ok(by(forged, 'a').gates.some((g) => g.code === 'uncertain-occupancy-collision'));
  assert.equal(by(forged, 'n').pending.kind, 'natural-weapon'); assert.equal(by(forged, 'n').effectivePosture, null);
  const integrated = rd(actorOf([
    item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }),
    item('d', SABER, { integrated: true, ...REC('EQUIPPED', 'hold', ['natural-arm-1']) }),
  ]));
  assert.equal(by(integrated, 'a').effectivePosture, null);
  assert.equal(by(integrated, 'd').pending.kind, 'integrated-droid-weapon');
  const natural2 = rd(actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }), item('n', SABER, { source: 'species-natural-weapon', ...REC('STOWED', null, []) })]));
  assert.equal(by(natural2, 'a').effectivePosture, 'READIED', 'a natural-flagged weapon that claims no appendage does not block anyone');
  ok('7: forged natural and integrated flags keep their appendage claim as a probe; they neither certify themselves nor make a conflicting assignment disappear');
}
{
  // mixed validity + established collision stays the resolver's block
  const mixed = rd(actorOf([
    item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }),
    item('b', SABER, REC('EQUIPPED', 'hold', ['natural-arm-1'])),
    item('c', SABER, REC('EQUIPPED', 'hold', ['natural-arm-2'])),
    item('d', SABER, REC('STOWED', 'wield', ['natural-arm-2'])),
    { id: 'legacy', type: 'weapon', name: 'old', flags: {}, system: { equipped: true } },
  ]));
  assert.equal(mixed.conflicts.length, 1, 'two valid ordinary records on one arm are an ESTABLISHED conflict');
  assert.equal(by(mixed, 'a').status === 'blocked' || by(mixed, 'a').status === 'indeterminate', true);
  assert.equal(by(mixed, 'c').effectivePosture, null, 'c shares arm-2 with the malformed d');
  assert.equal(by(mixed, 'legacy').status, 'undeclared');
  assert.ok(mixed.summary.withheld.includes('c'));
  ok('8: mixed-validity configurations separate established collisions (resolver block) from uncertain ones (withheld) and leave undeclared legacy Items out of occupancy');
}
{
  // unresolved transaction withholds; journal unreadable withholds positive readiness; resolved entries release
  const base = (txn) => actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }), item('s', SABER, REC('STOWED', null, []))], { flags: { swse: txn === undefined ? {} : { equipmentTxn: txn } } });
  assert.equal(by(rd(base(undefined)), 'a').effectivePosture, 'READIED');
  const entry = (phase, requestId = 'r1') => { let e = J.addPreparedEntry([], { requestId, intentDigest: D1, planDigest: D2, spend: { state: 'pending' }, items: [{ id: 'a', before: { 'system.weaponPosture': 'STOWED' }, target: { 'system.weaponPosture': 'READIED' } }] }); if (phase === 'APPLIED') e = J.transitionEntry(e, requestId, 'APPLIED'); if (phase === 'FINALIZED') e = J.transitionEntry(J.transitionEntry(e, requestId, 'APPLIED'), requestId, 'FINALIZED'); if (phase === 'NOT_APPLIED') e = J.transitionEntry(e, requestId, 'NOT_APPLIED'); if (phase === 'PARTIAL') e = J.transitionEntry(e, requestId, 'PARTIAL'); if (phase === 'INDETERMINATE') e = J.transitionEntry(e, requestId, 'INDETERMINATE'); return J.toStored(e); };
  for (const phase of ['PREPARED', 'APPLIED', 'PARTIAL', 'INDETERMINATE']) {
    const s = rd(base(entry(phase)));
    assert.equal(by(s, 'a').effectivePosture, null, phase); assert.equal(by(s, 'a').status, 'indeterminate');
    assert.ok(by(s, 'a').gates.some((g) => g.code === 'unresolved-equipment-transaction'));
    assert.equal(by(s, 's').effectivePosture, 'STOWED', 'an uncovered Item is unaffected');
  }
  for (const phase of ['FINALIZED', 'NOT_APPLIED']) assert.equal(by(rd(base(entry(phase))), 'a').effectivePosture, 'READIED', phase);
  const broken = rd(base({ schemaVersion: 9, entries: [] }));
  assert.equal(by(broken, 'a').effectivePosture, null); assert.equal(by(broken, 's').effectivePosture, 'STOWED');
  assert.ok(broken.issues.some((i) => i.code === 'equipment-journal-unreadable'));
  assert.equal(by(rd(base(entry('PREPARED')), { evaluatePendingTransactions: false }), 'a').effectivePosture, 'READIED', 'planning may evaluate a hypothesis without the gate');
  ok('9: unresolved journal entries withhold every posture of the Items they cover; FINALIZED and NOT_APPLIED release them; an unreadable journal withholds positive readiness');
}

// ------------------------------------------------------------------------------------------------ species evidence adapter
{
  const entry = { name: 'Human', variants: [] };
  const regOk = { isInitialized: () => true, getByName: (nm) => (nm.toLowerCase() === 'human' ? entry : null) };
  const A = (species, extra = {}) => ({ system: { species, ...extra }, flags: {} });
  assert.equal((await loadActorSpeciesProfile(A('Human'), { registry: regOk })).status, 'resolved');
  const missing = await loadActorSpeciesProfile(A('Zeltron-ish'), { registry: regOk });
  assert.equal(missing.status, 'unavailable'); assert.equal(missing.reason, 'species-not-in-registry'); assert.equal(missing.profile, null);
  assert.equal((await loadActorSpeciesProfile(A(''), { registry: regOk })).reason, 'actor-species-not-recorded');
  assert.equal((await loadActorSpeciesProfile(A('Human', { speciesVariant: { id: 'nope' } }), { registry: regOk })).reason, 'recorded-variant-not-found');
  const regDown = { isInitialized: () => false, initialize: async () => {}, getByName: () => entry };
  assert.equal((await loadActorSpeciesProfile(A('Human'), { registry: regDown })).reason, 'species-registry-unavailable');
  const boom = await loadActorSpeciesProfile(A('Human'), { registry: { isInitialized: () => true, getByName: () => { throw Object.assign(new Error('x'), { code: 'BAD' }); } } });
  assert.equal(boom.status, 'unavailable'); assert.match(boom.reason, /profile-resolution-failed:BAD/);
  const src = strip(read('scripts/engine/equipment/species-evidence-adapter.js'));
  for (const f of [/\.description\b/, /\.update\(/, /setFlag/, /ActorEngine/]) assert.ok(!f.test(src), String(f));
  ok('10: the species adapter resolves only through the registry authorities and fails closed (never from a name or description) when evidence is missing, ambiguous or throws');
}

// ------------------------------------------------------------------------------------------------ coordinator harness
function setPath(obj, path, value) {
  const parts = path.split('.'); let node = obj;
  for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
  const last = parts.at(-1);
  if (last.startsWith('-=')) delete node[last.slice(2)]; else node[last] = JSON.parse(JSON.stringify(value));
}
function world(items, opts = {}) {
  const actor = actorOf(items, { flags: { swse: {} } });
  const log = { itemWrites: [], journalWrites: [], spends: [], history: [] };
  const hooks = { failItemWrite: false, failItemWriteAfterApply: false, failJournalWrite: null, failSpend: null, spendThrows: false, markerThrows: false, afterItemWrite: null, spendCommitted: true, ...opts };
  const deps = {
    loadSpecies: async () => ({ status: 'resolved', profile: human(), reason: null, evidence: { speciesName: 'Human', variantId: null } }),
    isGm: () => true,
    resolveActionCost: async () => 'move',
    isLightsaber: async () => false,
    ledger: new Map(),
    writeItems: async (a, updates) => {
      log.itemWrites.push(JSON.parse(JSON.stringify(updates)));
      if (hooks.failItemWrite) throw new Error('item write failed');
      for (const u of updates) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); }
      if (hooks.afterItemWrite) await hooks.afterItemWrite(a, updates, log);
      if (hooks.failItemWriteAfterApply) throw new Error('item write threw after applying');
    },
    writeJournal: async (a, stored) => {
      const phase = stored.entries.at(-1) && stored.entries.map((e) => e.phase).join(',');
      if (hooks.failJournalWrite && hooks.failJournalWrite(stored, log.journalWrites.length)) throw new Error('journal write failed');
      log.journalWrites.push(phase);
      (a.flags.swse ??= {}).equipmentTxn = JSON.parse(JSON.stringify(stored));
    },
    spendAction: async (a, type, meta) => {
      if (hooks.spendThrows) throw new Error('spend threw');
      if (hooks.failSpend) return { allowed: false };
      log.spends.push({ type, meta });
      if (hooks.spendCommitted) log.history.push({ metadata: meta });
      return { allowed: true, committed: hooks.spendCommitted };
    },
    spendMarkerPresent: async (a, id) => { if (hooks.markerThrows) throw new Error('marker unreadable'); return log.history.some((h) => h.metadata?.requestId === id); },
  };
  return { actor, deps, log, hooks };
}
const baseItems = () => [item('s', SABER, REC('STOWED', null, [])), item('o', SABER, REC('STOWED', null, []))];
const readyIntent = (itemId = 's', arm = 'natural-arm-1') => ({ type: 'ready', itemId, appendageIds: [arm], grip: 'one-handed' });
async function run(w, requestId, intent, { confirm = true, context = GM } = {}) {
  const plan = await C.planEquipmentIntent(w.actor, intent, w.deps);
  const request = { requestId, intent, ...(confirm && plan.planDigest ? { planDigest: plan.planDigest } : {}) };
  return { plan, out: await C.executeEquipmentIntent(w.actor, request, { context }, w.deps) };
}

// ------------------------------------------------------------------------------------------------ coordinator
{
  const w = world(baseItems());
  const { plan, out } = await run(w, 'req-1', readyIntent());
  assert.equal(plan.status, O.PLANNED); assert.deepEqual(plan.action, { required: true, actionType: 'move', direction: 'draw' });
  assert.deepEqual(plan.itemWrites[0].set['flags.swse.fireState.v'], 1);
  assert.equal(out.status, O.COMMITTED); assert.equal(out.verified, true); assert.equal(out.finalized, true);
  const it = w.actor.items.get('s');
  assert.equal(it.system.weaponPosture, 'READIED'); assert.deepEqual(it.system.weaponOccupancy, { schemaVersion: 1, purpose: 'wield', appendageIds: ['natural-arm-1'] });
  assert.equal(it.flags.swse.fireState.wielded, 'one-handed');
  assert.deepEqual(w.log.journalWrites, ['PREPARED', 'APPLIED', 'FINALIZED']);
  assert.equal(w.log.spends.length, 1); assert.equal(w.log.spends[0].meta.requestId, 'req-1'); assert.equal(w.log.spends[0].type, 'move');
  assert.equal(by(rd(w.actor), 's').effectivePosture, 'READIED');
  // writes are field scoped: only coordinator-owned paths
  const paths = w.log.itemWrites.flatMap((u) => u.flatMap((x) => Object.keys(x).filter((k) => k !== '_id')));
  assert.ok(paths.every((p) => C.OWNED_PATHS.includes(p)), paths.join());
  ok('11: a valid GM-local ready intent runs the full pipeline (journal PREPARED -> Item write -> verify -> APPLIED -> spend with the request id -> FINALIZED) and the reader then certifies READIED');
}
{
  const w = world(baseItems());
  // stow after ready, equip, and the deferred transition
  await run(w, 'a1', readyIntent());
  const stow = await run(w, 'a2', { type: 'stow', itemId: 's' });
  assert.equal(stow.out.status, O.COMMITTED); assert.equal(stow.plan.action.direction, 'holster');
  assert.equal(w.actor.items.get('s').system.weaponPosture, 'STOWED');
  const eq = await run(w, 'a3', { type: 'equip', itemId: 's', purpose: 'hold', appendageIds: ['natural-arm-2'] });
  assert.equal(eq.out.status, O.COMMITTED); assert.equal(w.actor.items.get('s').system.weaponPosture, 'EQUIPPED');
  const spendsBefore = w.log.spends.length; const writesBefore = w.log.itemWrites.length;
  const deferred = await run(w, 'a4', readyIntent('s', 'natural-arm-1'));
  assert.equal(deferred.out.status, O.DEFERRED_RULES_REVIEW); assert.equal(deferred.plan.issues[0].details.decisionId, 'EQ-001');
  assert.equal(w.log.spends.length, spendsBefore); assert.equal(w.log.itemWrites.length, writesBefore);
  assert.equal((await run(w, 'a5', { type: 'stow', itemId: 'o' })).out.status, O.NO_CHANGE);
  ok('12: stow (holster cost), equip, a no-op, and the unspecified EQUIPPED<->READIED change (DEFERRED_RULES_REVIEW EQ-001, nothing written or spent)');
}
{
  // choices are never made by the coordinator; conflicts are never resolved by it
  const w = world(baseItems());
  const p1 = await C.planEquipmentIntent(w.actor, { type: 'ready', itemId: 's' }, w.deps);
  assert.equal(p1.status, O.CHOICE_REQUIRED); assert.deepEqual(p1.choices.map((c) => c.id), ['appendageIds', 'grip']);
  assert.ok(p1.choices[0].options.some((o) => o.id === 'natural-arm-1'));
  const p2 = await C.planEquipmentIntent(w.actor, { type: 'equip', itemId: 's' }, w.deps);
  assert.deepEqual(p2.choices.map((c) => c.id), ['purpose', 'appendageIds']);
  await run(w, 'c1', readyIntent('s', 'natural-arm-1'));
  const writes = w.log.itemWrites.length;
  const clash = await run(w, 'c2', { type: 'equip', itemId: 'o', purpose: 'hold', appendageIds: ['natural-arm-1'] });
  assert.equal(clash.out.status, O.CONFLICT_UNRESOLVED);
  assert.ok(clash.plan.conflicts.length >= 1);
  assert.equal(w.actor.items.get('s').system.weaponPosture, 'READIED', 'the other weapon is not stowed automatically');
  assert.equal(w.log.itemWrites.length, writes);
  const bad = await run(w, 'c3', { type: 'ready', itemId: 'o', appendageIds: ['tail-9'], grip: 'one-handed' });
  assert.equal(bad.out.status, O.NOT_ESTABLISHED);
  const wrongGrip = await run(w, 'c4', { type: 'ready', itemId: 'o', appendageIds: ['natural-arm-2'], grip: 'two-handed' });
  assert.notEqual(wrongGrip.out.status, O.COMMITTED, 'a grip the canonical authority does not support for one arm is not committed');
  ok('13: missing appendages/purpose/grip yield CHOICE_REQUIRED, a collision yields CONFLICT_UNRESOLVED without stowing anything, and unestablished configurations write nothing');
}
{
  // authority
  const w = world(baseItems());
  const plan = await C.planEquipmentIntent(w.actor, readyIntent(), w.deps);
  const req = { requestId: 'g1', intent: readyIntent(), planDigest: plan.planDigest };
  const noCtx = await C.executeEquipmentIntent(w.actor, req, {}, w.deps);
  assert.equal(noCtx.status, O.NO_AUTHORITATIVE_EXECUTOR);
  const forgedCtx = await C.executeEquipmentIntent(w.actor, req, { context: { kind: 'gm-local-execution', remote: false } }, w.deps);
  assert.equal(forgedCtx.status, O.NO_AUTHORITATIVE_EXECUTOR, 'only the exact frozen context object authorizes execution');
  w.deps.isGm = () => false;
  assert.equal((await C.executeEquipmentIntent(w.actor, req, { context: GM }, w.deps)).status, O.REJECTED_NOT_GM);
  assert.equal(w.log.itemWrites.length, 0); assert.equal(w.log.journalWrites.length, 0); assert.equal(w.log.spends.length, 0);
  assert.equal(w.actor.items.get('s').system.weaponPosture, 'STOWED');
  assert.throws(() => C.validateIntent({ type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed', requesterUserId: 'u1' }), (e) => e.code === 'UNSUPPORTED_FIELD');
  assert.throws(() => C.validateIntent({ type: 'stow', itemId: 's', 'system.weaponPosture': 'READIED' }), (e) => e.code === 'UNSUPPORTED_FIELD');
  await assert.rejects(C.executeEquipmentIntent(w.actor, { ...req, userId: 'u1' }, { context: GM }, w.deps), (e) => e.code === 'UNSUPPORTED_FIELD');
  assert.throws(() => C.validateIntent({ type: 'carry', itemId: 's' }), (e) => e.code === 'INVALID_INTENT');
  const src = strip(read('scripts/engine/equipment/equipment-state-coordinator.js'));
  for (const f of [/game\.socket/, /socket\.(on|emit)/, /Hooks\./, /requesterUserId/, /activeGM/, /sessionId/, /isPrimaryActiveGm/, /HolonetGmAuthority/]) assert.ok(!f.test(src), `coordinator must not contain ${f}`);
  const all = ['equipment-state-coordinator', 'equipment-transaction-journal', 'intent-fingerprint', 'species-evidence-adapter', 'equipment-state-reader'].map((f) => strip(read(`scripts/engine/equipment/${f}.js`))).join('\n');
  assert.ok(!/socket\.on|socket\.emit|registerSocket|game\.socket/.test(all), 'no socket handler exists in any WP3-A module');
  ok('14: execution needs the exact local GM context and a GM user; there is no fallback, no payload identity, no raw field updates and no socket route in any new module');
}
{
  // stale state, duplicate, id reuse
  const w = world(baseItems());
  const intent = readyIntent();
  const plan = await C.planEquipmentIntent(w.actor, intent, w.deps);
  const needs = await C.executeEquipmentIntent(w.actor, { requestId: 'd0', intent }, { context: GM }, w.deps);
  assert.equal(needs.status, O.CONFIRMATION_REQUIRED); assert.equal(w.log.itemWrites.length, 0);
  // state changes between plan and execute
  w.actor.items.get('o').system.weaponPosture = 'EQUIPPED'; w.actor.items.get('o').system.weaponOccupancy = { schemaVersion: 1, purpose: 'hold', appendageIds: ['natural-arm-2'] };
  const stale = await C.executeEquipmentIntent(w.actor, { requestId: 'd1', intent, planDigest: plan.planDigest }, { context: GM }, w.deps);
  assert.equal(stale.status, O.STALE_STATE); assert.equal(w.log.itemWrites.length, 0); assert.equal(w.log.spends.length, 0); assert.equal(w.log.journalWrites.length, 0);
  const w2 = world(baseItems());
  const first = await run(w2, 'dup-1', readyIntent());
  assert.equal(first.out.status, O.COMMITTED);
  const again = await C.executeEquipmentIntent(w2.actor, { requestId: 'dup-1', intent: readyIntent(), planDigest: first.plan.planDigest }, { context: GM }, w2.deps);
  assert.equal(again.status, O.DUPLICATE_REPLAYED); assert.equal(again.replayedFrom, 'journal'); assert.equal(w2.log.spends.length, 1); assert.equal(w2.log.itemWrites.length, 1);
  w2.deps.ledger.clear(); // a reloaded executor still sees the durable journal
  assert.equal((await C.executeEquipmentIntent(w2.actor, { requestId: 'dup-1', intent: readyIntent(), planDigest: first.plan.planDigest }, { context: GM }, w2.deps)).status, O.DUPLICATE_REPLAYED);
  const reused = await C.executeEquipmentIntent(w2.actor, { requestId: 'dup-1', intent: { type: 'stow', itemId: 's' } }, { context: GM }, w2.deps);
  assert.equal(reused.status, O.REQUEST_ID_CONFLICT); assert.equal(w2.log.spends.length, 1);
  // a rejected request id is remembered by the ledger and replayed, never re-run
  const w3 = world(baseItems());
  const rej = await run(w3, 'rej-1', { type: 'ready', itemId: 's', appendageIds: ['tail-9'], grip: 'one-handed' });
  assert.equal(rej.out.status, O.NOT_ESTABLISHED);
  const rej2 = await C.executeEquipmentIntent(w3.actor, { requestId: 'rej-1', intent: { type: 'ready', itemId: 's', appendageIds: ['tail-9'], grip: 'one-handed' } }, { context: GM }, w3.deps);
  assert.equal(rej2.status, O.DUPLICATE_REPLAYED); assert.equal(rej2.replayedStatus, O.NOT_ESTABLISHED);
  assert.equal((await C.executeEquipmentIntent(w3.actor, { requestId: 'rej-1', intent: { type: 'stow', itemId: 'o' } }, { context: GM }, w3.deps)).status, O.REQUEST_ID_CONFLICT);
  ok('15: confirmation is required, a changed state is STALE_STATE with nothing written, duplicates (journal and ledger) are replayed not re-executed, and a request id reused with a different intent is refused');
}
{
  // action spend happens only after verification; refusal does not grant readiness
  const order = [];
  const w = world(baseItems(), { afterItemWrite: async () => order.push('items-written') });
  const origSpend = w.deps.spendAction;
  w.deps.spendAction = async (...a) => { order.push(`spend:${w.actor.flags.swse.equipmentTxn.entries[0].phase}:${w.actor.items.get('s').system.weaponPosture}`); return origSpend(...a); };
  await run(w, 'o1', readyIntent());
  assert.deepEqual(order, ['items-written', 'spend:APPLIED:READIED'], 'the spend runs after the write, only once the journal reads APPLIED');
  const f = world(baseItems(), { failSpend: true });
  const seenDuring = [];
  const baseWrite = f.deps.writeItems;
  f.deps.writeItems = async (a, u) => { await baseWrite(a, u); seenDuring.push(by(rd(a), 's').effectivePosture); };
  const res = await run(f, 'o2', readyIntent());
  assert.equal(res.out.status, O.FAILED_COMPENSATED);
  assert.equal(seenDuring[0], null, 'between the Item write and the finalized spend the reader withholds readiness');
  const s = f.actor.items.get('s');
  assert.equal(s.system.weaponPosture, 'STOWED'); assert.deepEqual(s.system.weaponOccupancy, { schemaVersion: 1, purpose: null, appendageIds: [] });
  assert.equal(s.flags.swse.fireState?.wielded, undefined, 'the grip choice written by the attempt is removed again');
  assert.equal(by(rd(f.actor), 's').effectivePosture, 'STOWED');
  assert.equal(f.actor.flags.swse.equipmentTxn.entries[0].phase, 'NOT_APPLIED');
  assert.equal(f.log.spends.length, 0);
  ok('16: the action is spent only after the Item write is verified and journaled APPLIED; a refused spend compensates the owned fields, ends NOT_APPLIED and never leaves usable readiness');
}
{
  // spend throws but committed (marker present) vs unestablished marker
  const a = world(baseItems(), {});
  const orig = a.deps.spendAction;
  a.deps.spendAction = async (x, t, m) => { await orig(x, t, m); throw new Error('threw after committing'); };
  const ra = await run(a, 'e1', readyIntent());
  assert.equal(ra.out.status, O.COMMITTED, 'a thrown spend whose marker is present is committed (deduplicated, not repeated)');
  assert.equal(a.log.spends.length, 1);
  const b = world(baseItems(), { spendThrows: true });
  const rb = await run(b, 'e2', readyIntent());
  assert.equal(rb.out.status, O.FAILED_COMPENSATED); assert.equal(b.actor.items.get('s').system.weaponPosture, 'STOWED');
  const c = world(baseItems(), { spendThrows: true, markerThrows: true });
  const rc = await run(c, 'e3', readyIntent());
  assert.equal(rc.out.status, O.INDETERMINATE);
  assert.equal(c.actor.flags.swse.equipmentTxn.entries[0].phase, 'INDETERMINATE');
  assert.equal(c.actor.items.get('s').system.weaponPosture, 'READIED', 'evidence is preserved, not reset');
  assert.equal(by(rd(c.actor), 's').effectivePosture, null, 'an indeterminate transaction withholds readiness');
  const again = await C.executeEquipmentIntent(c.actor, { requestId: 'e3', intent: readyIntent() }, { context: GM }, c.deps);
  assert.equal(again.status, O.DUPLICATE_UNRESOLVED); assert.equal(c.log.spends.length, 0);
  const insp = await C.inspectEquipmentTransaction(c.actor, 'e3', c.deps);
  assert.equal(insp.found, true); assert.equal(insp.unresolved, true); assert.equal(insp.classification, 'APPLIED');
  const s2 = await C.planEquipmentIntent(c.actor, { type: 'stow', itemId: 's' }, c.deps);
  assert.equal(s2.status, O.UNRESOLVED_TRANSACTION, 'no new transaction starts on an unresolved item');
  ok('17: a spend that threw is resolved by its marker (committed or compensated); an unreadable marker leaves INDETERMINATE, withheld, never replayed, and blocks new transactions on that Item');
}
{
  // journal failures
  const pre = world(baseItems(), { failJournalWrite: (stored) => stored.entries.at(-1).phase === 'PREPARED' });
  const r0 = await run(pre, 'j0', readyIntent());
  assert.equal(r0.out.status, O.JOURNAL_WRITE_FAILED); assert.equal(pre.log.itemWrites.length, 0); assert.equal(pre.log.spends.length, 0);
  assert.equal(pre.actor.items.get('s').system.weaponPosture, 'STOWED');
  const app = world(baseItems(), { failJournalWrite: (stored) => stored.entries.at(-1).phase === 'APPLIED' });
  const r1 = await run(app, 'j1', readyIntent());
  assert.equal(r1.out.status, O.UNRESOLVED_JOURNAL); assert.equal(app.log.spends.length, 0, 'no spend before APPLIED is recorded');
  assert.equal(app.actor.flags.swse.equipmentTxn.entries[0].phase, 'PREPARED'); assert.equal(by(rd(app.actor), 's').effectivePosture, null);
  const fin = world(baseItems(), { failJournalWrite: (stored) => stored.entries.at(-1).phase === 'FINALIZED' });
  const r2 = await run(fin, 'j2', readyIntent());
  assert.equal(r2.out.status, O.UNRESOLVED_FINALIZE); assert.equal(r2.out.finalized, false); assert.notEqual(r2.out.status, O.COMMITTED);
  assert.equal(fin.actor.flags.swse.equipmentTxn.entries[0].phase, 'APPLIED');
  assert.equal(by(rd(fin.actor), 's').effectivePosture, null, 'a spent but unfinalized change is not usable readiness');
  assert.equal(fin.log.spends.length, 1);
  const retry = await C.executeEquipmentIntent(fin.actor, { requestId: 'j2', intent: readyIntent() }, { context: GM }, fin.deps);
  assert.equal(retry.status, O.DUPLICATE_UNRESOLVED); assert.equal(fin.log.spends.length, 1, 'never spent twice');
  ok('18: journal failures stay unresolved: no PREPARED means no write, no APPLIED means no spend, a failed FINALIZED is never reported as success and is never free readiness or a double spend');
}
{
  // item write failure modes + conditional compensation
  const nf = world(baseItems(), { failItemWrite: true });
  const r0 = await run(nf, 'w0', readyIntent());
  assert.equal(r0.out.status, O.FAILED_NOT_APPLIED); assert.equal(nf.actor.flags.swse.equipmentTxn.entries[0].phase, 'NOT_APPLIED'); assert.equal(nf.log.spends.length, 0);
  assert.equal(by(rd(nf.actor), 's').effectivePosture, 'STOWED');
  // write applied but threw: compensated field by field
  const tw = world(baseItems(), { failItemWriteAfterApply: true });
  const r1 = await run(tw, 'w1', readyIntent());
  assert.equal(r1.out.status, O.FAILED_COMPENSATED); assert.equal(tw.actor.items.get('s').system.weaponPosture, 'STOWED'); assert.equal(tw.log.spends.length, 0);
  assert.deepEqual(r1.out.skippedConcurrentPaths, []);
  // unrelated and concurrent changes survive; a concurrently changed owned path is left alone and reported
  const cc = world(baseItems(), { failSpend: true });
  cc.actor.system.attributes = { hp: 20 }; cc.actor.credits = 500; cc.actor.items.get('o').system.weaponPosture = 'STOWED';
  cc.deps.spendAction = async (a) => { a.system.attributes.hp = 7; a.items.get('o').flags.swse.note = 'kept'; a.items.get('s').system.weaponOccupancy.appendageIds = ['natural-arm-2']; return { allowed: false }; };
  const r2 = await run(cc, 'w2', readyIntent());
  assert.equal(r2.out.status, O.FAILED_PARTIAL);
  assert.equal(cc.actor.system.attributes.hp, 7, 'unrelated actor data is never restored');
  assert.equal(cc.actor.credits, 500); assert.equal(cc.actor.items.get('o').flags.swse.note, 'kept');
  assert.deepEqual(cc.actor.items.get('s').system.weaponOccupancy.appendageIds, ['natural-arm-2'], 'a concurrently changed owned path is left untouched');
  assert.ok(r2.out.skippedConcurrentPaths.includes('s:system.weaponOccupancy'));
  assert.equal(cc.actor.items.get('s').system.weaponPosture, 'STOWED', 'the untouched-by-others path was restored');
  assert.equal(cc.actor.flags.swse.equipmentTxn.entries[0].phase, 'PARTIAL');
  assert.equal(by(rd(cc.actor), 's').effectivePosture, null);
  assert.ok(r2.out.issues.some((i) => i.code === 'compensation-incomplete' && /not atomic/.test(i.message)));
  ok('19: write failures end NOT_APPLIED or are compensated per field; unrelated actor/Item changes survive and a concurrently changed owned field is left alone, reported and PARTIAL (compensation is conditional, not atomic)');
}
{
  // indeterminate item state: evidence preserved
  const w = world(baseItems(), { afterItemWrite: async (a) => { a.items.get('s').system.weaponPosture = 'EQUIPPED'; } });
  const r = await run(w, 'i1', readyIntent());
  assert.equal(r.out.status, O.INDETERMINATE); assert.equal(w.actor.items.get('s').system.weaponPosture, 'EQUIPPED', 'neither restored nor reset');
  assert.equal(w.actor.flags.swse.equipmentTxn.entries[0].phase, 'INDETERMINATE'); assert.equal(w.log.spends.length, 0);
  ok('20: persisted values that match neither the before nor the planned values end INDETERMINATE with the evidence preserved and nothing spent');
}
{
  // serialization per actor
  const w = world(baseItems());
  const order = [];
  const baseWrite = w.deps.writeItems;
  w.deps.writeItems = async (a, u) => { order.push(`start:${u[0]._id}`); await new Promise((r) => setTimeout(r, 15)); await baseWrite(a, u); order.push(`end:${u[0]._id}`); };
  const p1 = await C.planEquipmentIntent(w.actor, readyIntent('s', 'natural-arm-1'), w.deps);
  const intentO = { type: 'equip', itemId: 'o', purpose: 'hold', appendageIds: ['natural-arm-2'] };
  const p2 = await C.planEquipmentIntent(w.actor, intentO, w.deps);
  const [r1, r2] = await Promise.all([
    C.executeEquipmentIntent(w.actor, { requestId: 'p1', intent: readyIntent('s', 'natural-arm-1'), planDigest: p1.planDigest }, { context: GM }, w.deps),
    C.executeEquipmentIntent(w.actor, { requestId: 'p2', intent: intentO, planDigest: p2.planDigest }, { context: GM }, w.deps),
  ]);
  assert.deepEqual(order, ['start:s', 'end:s'], 'the second request never writes: it ran after the first finished and saw its result');
  assert.equal(r1.status, O.COMMITTED);
  assert.equal(r2.status, O.STALE_STATE, 'the second request was planned before the first changed the state, so it must be re-planned');
  assert.equal(w.actor.items.get('o').system.weaponPosture, 'STOWED');
  const other = world(baseItems()); other.actor.id = 'actor-2';
  // different actors do not block each other
  const gate = []; let release; const held = new Promise((r) => { release = r; });
  w.deps.writeItems = async () => { gate.push('a1'); await held; };
  other.deps.writeItems = async (a, u) => { gate.push('a2'); for (const x of u) for (const [k, v] of Object.entries(x)) if (k !== '_id') setPath(a.items.get(x._id), k, v); };
  const pa = await C.planEquipmentIntent(w.actor, { type: 'equip', itemId: 'o', purpose: 'hold', appendageIds: ['natural-arm-2'] }, w.deps);
  const pb = await C.planEquipmentIntent(other.actor, readyIntent(), other.deps);
  const slow = C.executeEquipmentIntent(w.actor, { requestId: 'z1', intent: { type: 'equip', itemId: 'o', purpose: 'hold', appendageIds: ['natural-arm-2'] }, planDigest: pa.planDigest }, { context: GM }, w.deps);
  const fast = await C.executeEquipmentIntent(other.actor, { requestId: 'z2', intent: readyIntent(), planDigest: pb.planDigest }, { context: GM }, other.deps);
  assert.equal(fast.status, O.COMMITTED); assert.deepEqual(gate, ['a1', 'a2']);
  release(); await slow;
  ok('21: requests for one actor serialize (the second sees the first and is rejected STALE_STATE); different actors do not block each other');
}
{
  // no independent rules authority, no undoLast, no snapshot restore
  const src = strip(read('scripts/engine/equipment/equipment-state-coordinator.js'));
  for (const f of [/undoLast/, /\.rollback\(/, /restoreFromSnapshot/, /SnapshotService/, /applyMutationPlan/, /toObject\(/, /twoHanded/i, /requiredHands/, /isTwoHanded/, /weaponProperties/, /size(Index|Rules)/, /resolveWielding/, /resolveEffectiveWieldingSize/, /weapon-runtime\//, /\.setFlag\(/, /\.update\(/]) assert.ok(!f.test(src), `coordinator must not contain ${f}`);
  assert.ok(/resolveActionCost/.test(src) && /ActionEconomyConsumption/.test(src), 'costs and spends go through the existing authorities');
  const imports = [...src.matchAll(/^import[\s\S]*?from '([^']+)'/gm)].map((m) => m[1].replace('/systems/foundryvtt-swse/scripts/', ''));
  assert.deepEqual(imports.sort(), ['engine/combat/fire-state-store.js', 'engine/equipment/equipment-posture.js', 'engine/equipment/equipment-state-reader.js', 'engine/equipment/equipment-transaction-journal.js', 'engine/equipment/intent-fingerprint.js', 'engine/equipment/species-evidence-adapter.js', 'engine/equipment/weapon-record-invariants.js']);
  const wpn = strip(read('scripts/engine/equipment/species-evidence-adapter.js')) + strip(read('scripts/engine/equipment/equipment-transaction-journal.js'));
  assert.ok(!/ActorEngine|\.update\(|setFlag/.test(wpn), 'the adapter and the journal module do no I/O');
  ok('22: the coordinator imports no weapon rules authority and uses no undoLast, snapshot restore, transactional mutation plan or whole-document write; costs and spends use the existing authorities');
}

{
  // WP4 correction: without authoritative species evidence nothing that holds appendages is established; stowing needs no anatomy
  const w = world([item('s', SABER, REC('STOWED', null, [])), item('h', SABER, REC('EQUIPPED', 'hold', ['natural-arm-1']))]);
  w.deps.loadSpecies = async () => ({ status: 'unavailable', profile: null, reason: 'species-not-in-registry', evidence: { speciesName: 'Mystery', variantId: null } });
  const eq = await C.planEquipmentIntent(w.actor, { type: 'equip', itemId: 's', purpose: 'hold', appendageIds: ['natural-arm-2'] }, w.deps);
  assert.equal(eq.status, O.NOT_ESTABLISHED); assert.equal(eq.issues[0].code, 'species-evidence-unavailable'); assert.equal(eq.issues[0].details.reason, 'species-not-in-registry');
  const ex = await C.executeEquipmentIntent(w.actor, { requestId: 'sp1', intent: { type: 'equip', itemId: 's', purpose: 'hold', appendageIds: ['natural-arm-2'] } }, { context: GM }, w.deps);
  assert.equal(ex.status, O.NOT_ESTABLISHED); assert.equal(w.log.itemWrites.length, 0); assert.equal(w.log.journalWrites.length, 0); assert.equal(w.log.spends.length, 0);
  const stow = await run(w, 'sp2', { type: 'stow', itemId: 'h' });
  assert.equal(stow.out.status, O.COMMITTED);
  ok('23: unavailable species evidence fails closed for any posture that holds appendages (no provisional default arms) while stowing still works');
}

console.log(`equipment-e4c1-wp3a-coordinator: ${n} checks ok`);
