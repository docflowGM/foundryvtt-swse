// Test helper (WP5-C3 follow-up): the offline shim replaces ActorEngine with a FAKE. Force Point tests that must prove behavior against the REAL
// ActorEngine.spendForcePoints / gainForcePoints graft those two real methods onto the fake the production modules import, with an in-memory
// persistence write supplied by the test. Only those two methods are real; their only dependency on the engine object is `this.updateActor`.
export async function graftRealForcePointMethods(updateActor) {
  const fake = (await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js')).ActorEngine;
  const real = (await import(new URL('../../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href)).ActorEngine;
  const saved = { updateActor: fake.updateActor, spendForcePoints: fake.spendForcePoints, gainForcePoints: fake.gainForcePoints };
  fake.updateActor = updateActor;
  fake.spendForcePoints = real.spendForcePoints;
  fake.gainForcePoints = real.gainForcePoints;
  return { fake, real, restore: () => Object.assign(fake, saved) };
}
export const setPath = (o, p, v) => { const parts = p.split('.'); let n = o; for (let i = 0; i < parts.length - 1; i++) n = (n[parts[i]] ??= {}); n[parts.at(-1)] = JSON.parse(JSON.stringify(v)); };
