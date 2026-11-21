// TI4-A synthetic fixture: a caller of an authority API from a file outside the census. Calling the authority is the supported path.
export async function spendOne(ActorEngine, actor) {
  await ActorEngine.spendForcePoints(actor, 1);
}
