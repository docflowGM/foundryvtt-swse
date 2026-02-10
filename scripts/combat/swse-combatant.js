/**
 * SWSE Combatant Document (v13+)
 * Modernized for the new SWSE combat engine:
 * - Numeric condition track (0–5)
 * - Correct helpless/unconscious behavior
 * - New action economy structure
 * - No ActorEngine dependency
 * - GM-safe action marking
 */

export class SWSECombatant extends Combatant {

  /* -------------------------------------------- */
  /* INITIATIVE BONUS                             */
  /* -------------------------------------------- */

  /**
   * SWSE initiative bonus comes from the Initiative skill total.
   * (Actual roll handled in SWSECombatDocument)
   */
  get initiativeBonus() {
    const actor = this.actor;
    if (!actor) {return 0;}
    return actor.system.skills?.initiative?.total ?? 0;
  }

  /* -------------------------------------------- */
  /* CAN ACT? (Condition Track, Status Effects)   */
  /* -------------------------------------------- */

  get canAct() {
    const actor = this.actor;
    if (!actor) {return false;}

    const ct = actor.system.conditionTrack?.current ?? 0;

    // RAW: CT 5 = Helpless = unconscious/disabled
    if (ct === 5) {return false;}

    // Additional debilitating effects can be added here later
    // Example: stunned, paralyzed, frozen, etc.

    return true;
  }

  /* -------------------------------------------- */
  /* ACTION ECONOMY ACCESS                         */
  /* -------------------------------------------- */

  get actionEconomy() {
    return this.actor?.system?.actionEconomy ?? {
      swift: true,
      move: true,
      standard: true,
      fullRound: true,
      reaction: true
    };
  }

  hasAction(type) {
    return this.actionEconomy?.[type] === true;
  }

  /* -------------------------------------------- */
  /* USE ACTION (Update Actor)                    */
  /* -------------------------------------------- */

  async useAction(type) {
    const actor = this.actor;
    if (!actor) {return;}
    if (!game.user.isGM && !this.isCurrentCombatant) {
      return ui.notifications.warn('You may only use actions on your turn.');
    }

    const econ = foundry.utils.deepClone(this.actionEconomy);

    switch (type) {
      case 'fullRound':
        econ.swift = false;
        econ.move = false;
        econ.standard = false;
        econ.fullRound = false;
        break;

      case 'standard':
        econ.standard = false;
        econ.move = false;        // RAW: standard consumes move
        econ.fullRound = false;    // Cannot take full-round afterward
        break;

      case 'move':
      case 'swift':
        econ[type] = false;
        econ.fullRound = false;
        break;

      case 'reaction':
        econ.reaction = false;
        break;
    }

    await actor.update({ 'system.actionEconomy': econ }, { diff: true });
  }

  /* -------------------------------------------- */
  /* RESET ACTIONS FOR NEW TURN                   */
  /* -------------------------------------------- */

  async resetActions() {
    const actor = this.actor;
    if (!actor) {return;}

    await actor.update(
      {
        'system.actionEconomy': {
          swift: true,
          move: true,
          standard: true,
          fullRound: true,
          reaction: true
        }
      },
      { diff: true }
    );
  }

  /* -------------------------------------------- */
  /* PREPARE DERIVED — SYNC INIT BONUS           */
  /* -------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();

    // Store initiative bonus for the tracker if needed
    this._initiativeBonus = this.initiativeBonus;
  }

  /* -------------------------------------------- */
  /* TRACKER RESOURCE DATA                        */
  /* -------------------------------------------- */

  getResourceData() {
    const data = super.getResourceData();
    const actor = this.actor;

    if (!actor) {return data;}

    const ct = actor.system.conditionTrack?.current ?? 0;

    if (ct > 0) {
      // Show numeric CT state: 1,2,3,4,5
      data.condition = ct;
    }

    data.actions = {
      swift: this.actionEconomy.swift,
      move: this.actionEconomy.move,
      standard: this.actionEconomy.standard,
      full: this.actionEconomy.fullRound,
      react: this.actionEconomy.reaction
    };

    return data;
  }

  /* -------------------------------------------- */
  /* Helper: Is This the Active Combatant?        */
  /* -------------------------------------------- */

  get isCurrentCombatant() {
    return this.parent?.combatant?.id === this.id;
  }
}
