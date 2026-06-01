/* ============================================================================
   Patch notes for scripts/engine/rolls/swse-roll-engine.js

   These are the surgical changes required to feed the new template.
   Apply by hand — they intentionally don't include surrounding context
   so you can drop them in cleanly.
   ========================================================================== */

/* -------- Inside buildHoloRollData(), in the returned object: ------------- */
/* Replace the existing return statement with the additions marked NEW.       */

return {
  chatSvg: buildChatSvgContext(),
  chatState: buildChatStateContext({
    state: category === 'crit' ? 'success' : category === 'fail' ? 'failure' : 'default',
    statusLabel: label || 'Roll Result',
    statusSubLabel: `Total ${roll.total}`,
    showStatusRail: true,
    showHeaderDivider: true,
    showBadge: true
  }),
  roll,
  formula: roll.formula,
  total: roll.total,
  dice: roll.dice,
  breakdown,
  flavor,
  title,
  subtitle: context?.trained === true ? 'Trained' : '',
  category,
  actor,
  actorName,
  timestamp: new Date().toISOString(),
  context,
  weaponVisual,

  /* NEW — drives [data-ability] on the card root. Skill/ability rolls
     should populate context.abilityKey from the roll launcher. */
  abilityKey:
    (context?.abilityKey ?? context?.ability ?? context?.skill?.selectedAbility ?? '')
      .toString().toLowerCase() || null,

  /* NEW — drives [data-descriptor] on Force cards. Force-power launcher
     should pass the *primary* descriptor key (light/dark/tk/mind/form).
     Multi-descriptor powers can still surface secondary chips through
     context.descriptors. */
  forceDescriptor: context?.forceDescriptor ?? null,

  /* NEW — defender-side reactions strip. We're not introducing a new
     resolver: this is a thin wrapper around the existing
     swseDeriveChatReactions(payload) helper already defined further
     down this file. Populate context.chatReactions / context.reactions
     on attack rolls before calling buildHoloRollData. */
  reactionContext: this._buildReactionContext(actor, context)
};

/* -------- New private helper, append below _categorizeResult(): ----------- */

/**
 * Wrap swseDeriveChatReactions() into the shape the template expects.
 * Returns null when there are no reactions to render.
 */
static _buildReactionContext(actor, context = {}) {
  // Only attacks (and damage that re-opens a reaction window) have reactions.
  const isAttackLike = ['attack', 'damage'].includes(context?.type ?? context?.category);
  if (!isAttackLike) return null;

  // Use the existing module-level helper that already normalizes entries.
  const entries = (typeof swseDeriveChatReactions === 'function')
    ? swseDeriveChatReactions(context)
    : [];

  if (!entries.length) return null;

  return {
    entries,
    defenderName:  context?.defenderName ?? context?.targetName ?? 'You',
    timerSec:      context?.reactionTimerSec ?? null,
    reason:        context?.reactionBlockedReason ?? null
  };
}


/* ============================================================================
   Patch notes for templates/chat/holo-roll.hbs

   Replace the file with proposed/templates/holo-roll.hbs. Diff against
   the existing file: the changes are additive everywhere except the
   roll body, where the old `<div class="dice-roll">` block is replaced
   by the new clickable .total + hidden .breakdown.

   Existing reroll-button blocks are preserved verbatim at the bottom.
   ========================================================================== */


/* ============================================================================
   Patch notes for scripts/core/load-templates.js

   Add the two new partials to the load list:
   ========================================================================== */

// In the loadTemplates([...]) call, append:
//   'systems/foundryvtt-swse/templates/chat/holonet-card.hbs',
//   'systems/foundryvtt-swse/templates/chat/store-receipt.hbs',


/* ============================================================================
   Patch notes for system.json

   Register the new CSS file (if you didn't append to chat-surfaces.css):
   ========================================================================== */

// In "styles": [...], append:
//   "styles/system/chat-card.css"


/* ============================================================================
   Patch notes for scripts/core/init.js (or scripts/bootstrap/holo-init.js)

   Wire the three helpers + register Handlebars helpers during init:
   ========================================================================== */

// Top of file:
// import { registerSwseChatHelpers } from "/systems/foundryvtt-swse/scripts/chat/handlebars-helpers.js";
// import { ChatCardToggle }          from "/systems/foundryvtt-swse/scripts/chat/chat-card-toggle.js";
// import { HolonetChatCard }         from "/systems/foundryvtt-swse/scripts/chat/holonet-chat-card.js";
// import { StoreReceiptChat }        from "/systems/foundryvtt-swse/scripts/chat/store-receipt-chat.js";

// Inside the existing init hook:
//   Hooks.once("init",  () => { registerSwseChatHelpers(); });
//   Hooks.once("ready", () => {
//     ChatCardToggle.install();
//     HolonetChatCard.install();
//     StoreReceiptChat.install();
//   });
