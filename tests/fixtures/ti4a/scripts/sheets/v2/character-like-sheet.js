// TI4-A synthetic fixture: a file the Phase 0 audit documented as an exception for credits. Not production code.
export async function manualAdd(actor, value) {
  return actor.update({ 'system.credits': value });
}
