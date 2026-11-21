// TX-03 — action-economy rollback must undo only its own spend. Real ActionEconomyConsumption + ActionEconomyPersistence, in-memory actor flags.
import { header, report, ROOT } from './_boot.mjs';
header('TX-03 action rollback identity');
const store = {};
const actor = { id: 'ae1', name: 'AE', type: 'character', system: {}, getFlag: (s, k) => store[`${s}.${k}`], setFlag: async (s, k, v) => { store[`${s}.${k}`] = JSON.parse(JSON.stringify(v)); } };
globalThis.game = { combat: { id: 'cmb1', combatants: [{ actor: { id: 'ae1' } }] }, settings: { get: () => 'loose' } };
const { ActionEconomyConsumption: AEC } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { ActionEconomyPersistence: P } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');
const rem = () => ({ ...P.getTurnState(actor, 'cmb1').remaining });
const a = await AEC.spend(actor, 'standard', { actionName: 'Reload (A)' }, { notify: false });
const b = await AEC.spend(actor, 'swift', { actionName: 'Other action (B)' }, { notify: false });
const afterBoth = rem();
const verdict = await a.rollback();
const afterRollbackA = rem();
const bUndone = afterRollbackA.swift > afterBoth.swift;           // B's swift came back although only A was rolled back
const aStillSpent = afterRollbackA.standard === afterBoth.standard; // A's standard did NOT come back
report('TX-03', bUndone && aStillSpent, 'refunding A after B was recorded undoes B and leaves A spent', `before ${JSON.stringify(afterBoth)} -> after rollback(A) ${JSON.stringify(afterRollbackA)}; rollback(A) returned ${typeof verdict === 'object' ? 'a truthy object' : verdict}; rollbackStatus=${a.rollbackStatus ?? '(none)'}`);
report('TX-03b', typeof verdict === 'object' && verdict !== null && verdict.allowed === true && aStillSpent, 'the rollback result claims success although the refunded action is still spent', `A still spent: ${aStillSpent}`);
