// TI4-A synthetic fixture: stands in for the action-economy authority, which writes its flag through class constants (the analyzer's known blind spot). Not production code.
export class FixturePersistence {
  static FLAG_KEY = 'actionEconomy';
  static SCOPE = 'foundryvtt-swse';
  static async commit(actor, state) {
    await actor.setFlag(this.SCOPE, this.FLAG_KEY, state);
  }
  static async clear(actor) {
    await actor.unsetFlag(this.SCOPE, this.FLAG_KEY);
  }
}
