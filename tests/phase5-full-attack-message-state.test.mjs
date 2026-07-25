import assert from 'node:assert/strict';
import {
  FULL_ATTACK_SCHEMA_VERSION,
  buildInitialAttackEntry,
  readAttacksArray,
  normalizeAttackEntry,
  getAttackEntry,
  getActiveRevision,
  appendRevision,
  damageApplicationReceiptKey,
  findDamageApplicationReceipt,
  recordDamageApplication
} from '../scripts/engine/combat/full-attack-message-state.js';

// full-attack-message-state.js has zero Foundry-global dependencies
// (confirmed by this relative import actually resolving and executing
// under plain Node), so this test genuinely EXECUTES the state service's
// logic against a mock ChatMessage, rather than statically inspecting
// source text like most of this project's other rolling-system tests.

function mockMessage(initialFlags) {
  let flags = { swse: initialFlags };
  return {
    get flags() { return flags; },
    getFlag(scope, key) { return flags?.[scope]?.[key]; },
    async update(payload) {
      for (const [path, value] of Object.entries(payload)) {
        if (path === 'content') continue;
        // 'flags.swse.attacks' -> flags.swse.attacks
        const parts = path.split('.');
        if (parts[0] === 'flags' && parts[1] === 'swse') {
          flags = { ...flags, swse: { ...flags.swse, [parts[2]]: value } };
        }
      }
    }
  };
}

function baseEntry(overrides = {}) {
  return buildInitialAttackEntry({
    attackInstanceId: 'seq1-0',
    order: 0,
    weaponUuid: 'Actor.a1.Item.w1',
    weaponName: 'Blaster Pistol',
    targetUuid: 'Actor.t1',
    targetName: 'Stormtrooper',
    label: 'Attack 1 (Blaster Pistol)',
    penaltyText: '',
    rollInstanceId: 'roll-0',
    naturalD20: 12,
    total: 18,
    formula: '1d20 + 6',
    outcome: { hit: true, critical: false, targetDefense: 15, critMultiplier: 2 },
    componentLedger: [{ id: 'bab', label: 'BAB', value: 6, category: 'gunner', domain: 'combat.attack', applied: true }],
    damageContext: { workflowContext: null },
    attackRerollOptions: [{ id: 'r1', sourceId: 'feat1', sourceName: 'Instinctive Attack', cost: 'forcePoint', outcome: 'keepBetter', label: 'Instinctive Attack' }],
    ...overrides
  });
}

// 1. buildInitialAttackEntry() shape: revision 0, authoritative, not
// superseded, ledger/outcome preserved verbatim.
{
  const entry = baseEntry();
  assert.equal(entry.attackInstanceId, 'seq1-0');
  assert.equal(entry.activeRevision, 0);
  assert.equal(entry.revisions.length, 1);
  assert.equal(entry.revisions[0].revision, 0);
  assert.equal(entry.revisions[0].authoritative, true);
  assert.equal(entry.revisions[0].superseded, false);
  assert.equal(entry.revisions[0].rollResult.total, 18);
  assert.deepEqual(entry.revisions[0].componentLedger, [{ id: 'bab', label: 'BAB', value: 6, category: 'gunner', domain: 'combat.attack', applied: true }]);
  assert.equal(entry.attackRerollOptions.length, 1);
  console.log('1/12 buildInitialAttackEntry shape OK');
}

// 2. readAttacksArray() returns null for a non-full-attack message, and
// the array for one that has flags.swse.fullAttack === true.
{
  const notFullAttack = mockMessage({ attackRoll: true });
  assert.equal(readAttacksArray(notFullAttack), null);
  const message = mockMessage({ fullAttack: true, schemaVersion: FULL_ATTACK_SCHEMA_VERSION, sequenceId: 'seq1', attacks: [baseEntry()] });
  const attacks = readAttacksArray(message);
  assert.equal(attacks.length, 1);
  assert.equal(attacks[0].attackInstanceId, 'seq1-0');
  console.log('2/12 readAttacksArray OK');
}

// 3. normalizeAttackEntry() wraps a Phase 4 (v1, no revisions[]) entry into
// a synthetic single-revision v2 shape without mutating the caller's data
// or requiring a write.
{
  const legacy = { attackInstanceId: 'seq1-0', sequenceIndex: 0, activeRevision: 0, authoritative: true, superseded: false, weaponId: 'w1', naturalD20: 15, finalTotal: 20, isHit: true, isCritical: false, critMultiplier: 2 };
  const normalized = normalizeAttackEntry(legacy);
  assert.equal(normalized.attackInstanceId, 'seq1-0');
  assert.equal(Array.isArray(normalized.revisions), true);
  assert.equal(normalized.revisions[0].rollResult.total, 20);
  assert.equal(normalized.revisions[0].outcome.hit, true);
  assert.equal(normalized._legacySchema, 'full-attack-v1');
  // A v2 entry passed through is returned unchanged (identity), not re-wrapped.
  const v2 = baseEntry();
  assert.equal(normalizeAttackEntry(v2), v2);
  console.log('3/12 normalizeAttackEntry legacy-wrap OK');
}

// 4. getAttackEntry()/getActiveRevision() find the right attack and its
// currently-active revision.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  const entry = getAttackEntry(message, 'seq1-0');
  assert.ok(entry);
  const revision = getActiveRevision(entry);
  assert.equal(revision.revision, 0);
  assert.equal(getAttackEntry(message, 'does-not-exist'), null);
  console.log('4/12 getAttackEntry/getActiveRevision OK');
}

// 5. appendRevision() with the correct expectedRevision succeeds, marks
// revision 0 superseded, and makes the new revision authoritative/active.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  const result = await appendRevision(message, 'seq1-0', 0, {
    rollInstanceId: 'roll-1',
    rollResult: { naturalD20: 20, total: 26, formula: '1d20 + 6' },
    outcome: { hit: true, critical: true, targetDefense: 15, critMultiplier: 2 },
    componentLedger: [{ id: 'bab', label: 'BAB', value: 6, category: 'gunner', domain: 'combat.attack', applied: true }],
    transactions: { forcePointSpent: true },
    rerollSource: { ruleId: 'r1', sourceName: 'Instinctive Attack' },
    resultPolicy: 'keepBetter'
  });
  assert.equal(result.ok, true);
  assert.equal(result.revision, 1);
  const entry = getAttackEntry(message, 'seq1-0');
  assert.equal(entry.activeRevision, 1);
  assert.equal(entry.revisions.length, 2);
  assert.equal(entry.revisions[0].authoritative, false);
  assert.equal(entry.revisions[0].superseded, true);
  assert.equal(entry.revisions[0].supersededBy, 1);
  assert.equal(entry.revisions[1].authoritative, true);
  assert.equal(entry.revisions[1].superseded, false);
  assert.equal(entry.revisions[1].rollResult.total, 26);
  console.log('5/12 appendRevision success + supersession OK');
}

// 6. appendRevision() with a STALE expectedRevision (already advanced by a
// prior call) is rejected with conflict:'stale-revision' and does NOT
// mutate the message.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  await appendRevision(message, 'seq1-0', 0, { rollResult: { total: 26, naturalD20: 20, formula: '1d20+6' }, outcome: { hit: true } });
  const staleResult = await appendRevision(message, 'seq1-0', 0, { rollResult: { total: 5, naturalD20: 1, formula: '1d20+6' }, outcome: { hit: false } });
  assert.equal(staleResult.ok, false);
  assert.equal(staleResult.conflict, 'stale-revision');
  const entry = getAttackEntry(message, 'seq1-0');
  assert.equal(entry.activeRevision, 1, 'A rejected stale append must not change the active revision.');
  assert.equal(entry.revisions.length, 2, 'A rejected stale append must not add a phantom revision.');
  console.log('6/12 appendRevision stale-revision rejection OK');
}

// 7. appendRevision() on a nonexistent attackInstanceId is rejected
// clearly rather than throwing or silently creating a new attack.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  const result = await appendRevision(message, 'does-not-exist', 0, { rollResult: { total: 1, naturalD20: 1, formula: '1d20' }, outcome: {} });
  assert.equal(result.ok, false);
  assert.equal(result.conflict, 'attack-not-found');
  console.log('7/12 appendRevision attack-not-found OK');
}

// 8. Sibling attacks are untouched by a reroll of one attack in the same
// message.
{
  const entryA = baseEntry({ attackInstanceId: 'seq1-0', order: 0 });
  const entryB = baseEntry({ attackInstanceId: 'seq1-1', order: 1, total: 12, naturalD20: 6, outcome: { hit: false, critical: false, targetDefense: 15, critMultiplier: 2 } });
  const message = mockMessage({ fullAttack: true, attacks: [entryA, entryB] });
  await appendRevision(message, 'seq1-0', 0, { rollResult: { total: 26, naturalD20: 20, formula: '1d20+6' }, outcome: { hit: true, critical: true } });
  const siblingB = getAttackEntry(message, 'seq1-1');
  assert.equal(siblingB.activeRevision, 0, 'Sibling attack must keep its own revision unchanged.');
  assert.equal(siblingB.revisions[0].rollResult.total, 12, 'Sibling attack total must be untouched.');
  console.log('8/12 sibling isolation OK');
}

// 9. Damage-application receipts: not found before recording, found after,
// keyed by revision+target so a NEW revision (after a reroll) does not
// inherit an older revision's "already applied" state.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  const entryBefore = getAttackEntry(message, 'seq1-0');
  const key = damageApplicationReceiptKey(entryBefore.activeRevision, 'target1');
  assert.equal(findDamageApplicationReceipt(entryBefore, key), null);
  await recordDamageApplication(message, 'seq1-0', { key, targetId: 'target1', amount: 10, appliedAt: Date.now() });
  const entryAfter = getAttackEntry(message, 'seq1-0');
  assert.ok(findDamageApplicationReceipt(entryAfter, key));
  // After a reroll (new revision), the OLD revision's receipt key is no
  // longer the current one, so damage can be applied again for the new hit.
  await appendRevision(message, 'seq1-0', 0, { rollResult: { total: 26, naturalD20: 20, formula: '1d20+6' }, outcome: { hit: true, critical: true } });
  const entryRerolled = getAttackEntry(message, 'seq1-0');
  const newKey = damageApplicationReceiptKey(entryRerolled.activeRevision, 'target1');
  assert.notEqual(newKey, key);
  assert.equal(findDamageApplicationReceipt(entryRerolled, newKey), null);
  console.log('9/12 damage-application receipt keyed by revision OK');
}

// 10. No live Actor/Item/Token/Roll/Application/HTMLElement objects are
// ever required by or stored through this module's API — every value
// passed through appendRevision/buildInitialAttackEntry above was a plain
// object/string/number, and readAttacksArray/getAttackEntry only ever
// return what was stored. This is confirmed structurally (JSON round-trip
// preserves everything) rather than by type-checking each field.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  const attacks = readAttacksArray(message);
  const roundTripped = JSON.parse(JSON.stringify(attacks));
  assert.deepEqual(roundTripped, attacks, 'Full-attack state must be JSON-serializable with no data loss.');
  console.log('10/12 JSON round-trip / no live-object storage OK');
}

// 11. FULL_ATTACK_SCHEMA_VERSION is a stable, non-empty string (a real
// version bump from Phase 4's flat schema, not left unversioned).
{
  assert.equal(typeof FULL_ATTACK_SCHEMA_VERSION, 'string');
  assert.ok(FULL_ATTACK_SCHEMA_VERSION.length > 0);
  assert.notEqual(FULL_ATTACK_SCHEMA_VERSION, 'full-attack-v1');
  console.log('11/12 schema version bump OK');
}

// 12. appendRevision() re-reads the message fresh each call (does not
// trust a caller-held stale `attacks` array) — proven by mutating the
// message via a first appendRevision, then confirming a second call
// against the ORIGINAL expectedRevision (0) correctly sees it as stale
// even though no in-memory reference was updated between calls.
{
  const message = mockMessage({ fullAttack: true, attacks: [baseEntry()] });
  const firstResult = await appendRevision(message, 'seq1-0', 0, { rollResult: { total: 26, naturalD20: 20, formula: '1d20+6' }, outcome: { hit: true } });
  assert.equal(firstResult.ok, true);
  const secondResult = await appendRevision(message, 'seq1-0', 0, { rollResult: { total: 5, naturalD20: 1, formula: '1d20+6' }, outcome: { hit: false } });
  assert.equal(secondResult.ok, false);
  assert.equal(secondResult.conflict, 'stale-revision');
  console.log('12/12 fresh-read stale-revision detection OK');
}

console.log('Phase 5 full-attack-message-state genuinely-executed guards passed (12/12).');
