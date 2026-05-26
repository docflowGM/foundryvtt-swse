/** GM actor workspace surface view-model. */

export class GMWorkspaceSurfaceService {
  static async buildViewModel() {
    const gmActors = game.actors.filter((actor) => actor.isOwner);

    return {
      pageTitle: 'Workspace',
      pageDescription: 'GM-owned actor access',
      gmActors: gmActors.map((actor) => ({
        id: actor.id,
        name: actor.name,
        type: actor.type,
        img: actor.img
      }))
    };
  }
}
