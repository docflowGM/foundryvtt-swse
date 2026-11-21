// TI4-A synthetic fixture: a newly introduced direct writer that is in no census and no exception list. Not production code.
export async function sneakyDebit(actor) {
  const updates = {};
  updates['system.credits'] = 0;
  await actor.update(updates);
  await actor.setFlag('swse', 'actionEconomy', { turnState: {} });
}
export function readOnly(actor) {
  return actor.system.credits + (actor.getFlag('swse', 'actionEconomy') ? 1 : 0);
}
