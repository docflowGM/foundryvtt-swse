// TI4-A synthetic fixture: stands in for the credits authority file. Not production code.
export async function authorityWrite(actor, value) {
  return actor.update({ 'system.credits': value });
}
