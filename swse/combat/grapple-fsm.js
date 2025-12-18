/**
 * Grapple FSM – state transitions only
 * AUTO-GENERATED
 */

export const GrappleStates = {
  NONE: "none",
  GRABBED: "grabbed",
  GRAPPLED: "grappled",
  PINNED: "pinned"
};

export class GrappleFSM {
  static transitions = {
    none: { attemptGrab: "grabbed" },
    grabbed: { succeedOpposed: "grappled", failOpposed: "none" },
    grappled: { pin: "pinned", escape: "none" },
    pinned: { escape: "grappled" }
  };

  static next(state, action) {
    return this.transitions[state]?.[action] ?? state;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.GrappleFSM = GrappleFSM;
  CONFIG.SWSE.GrappleStates = GrappleStates;
});
