import { SWSELogger } from '../utils/logger.js';

/**
 * Register SWSE Chat Commands (Advanced Version)
 */
export function registerChatCommands() {
  SWSELogger.info('SWSE | Registering advanced chat commands...');

  Hooks.on('chatMessage', async (chatLog, message, chatData) => {
    if (!message.startsWith('/')) {return true;}

    const [rawCmd, ...rawArgs] = message.trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();

    switch (cmd) {
      case '/damage': return await cmdDamage(rawArgs);
      case '/heal': return await cmdHeal(rawArgs);
      case '/sethp': return await cmdSetHP(rawArgs);
      case '/temphp': return await cmdTempHP(rawArgs);
      case '/force': return await cmdForce(rawArgs);
      case '/xp': return await cmdXP(rawArgs);
      case '/levelup': return await cmdLevelUp(rawArgs);
      case '/condition': return await cmdCondition(rawArgs);
      case '/recalc': return await cmdRecalc(rawArgs);
      case '/rollswse': return await cmdRollSWSE(rawArgs);
      case '/rest': return await cmdRest(rawArgs);
      case '/stamina': return await cmdStamina(rawArgs);
      default:
        return true;
    }
  });

  SWSELogger.info('SWSE | Advanced chat commands registered.');
}

/* --------------------------------------------------------------- */
/* Utility                                                        */
/* --------------------------------------------------------------- */

function getSelectedTokensOrWarn() {
  const tokens = canvas?.tokens?.controlled || [];
  if (!tokens.length) {
    ui.notifications.warn('Select at least one token.');
    return null;
  }
  return tokens;
}

function parseNumber(arg, usage) {
  const n = parseInt(arg, 10);
  if (Number.isNaN(n)) {
    ui.notifications.warn(`Invalid number. Usage: ${usage}`);
    return null;
  }
  return n;
}

/* --------------------------------------------------------------- */
/* COMMAND IMPLEMENTATIONS                                        */
/* --------------------------------------------------------------- */

/** /damage <amount> */
async function cmdDamage(args) {
  const n = parseNumber(args[0], '/damage <amount>');
  if (n === null) {return false;}

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {t.actor?.applyDamage(n, { checkThreshold: true });}

  return false;
}

/** /heal <amount> */
async function cmdHeal(args) {
  const n = parseNumber(args[0], '/heal <amount>');
  if (n === null) {return false;}

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    const a = t.actor;
    if (!a) {continue;}

    const max = a.system.hp?.max ?? 0;
    const newHP = Math.clamp(a.system.hp.value + n, 0, max);

    await globalThis.SWSE.ActorEngine.updateActor(a, {
      'system.hp.value': newHP
    });
  }

  return false;
}

/** /sethp <value> */
async function cmdSetHP(args) {
  const n = parseNumber(args[0], '/sethp <value>');
  if (n === null) {return false;}

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    await globalThis.SWSE.ActorEngine.updateActor(t.actor, {
      'system.hp.value': n
    });
  }

  return false;
}

/** /temphp <amount> */
async function cmdTempHP(args) {
  const n = parseNumber(args[0], '/temphp <value>');
  if (n === null) {return false;}

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    await globalThis.SWSE.ActorEngine.updateActor(t.actor, {
      'system.hp.temp': n
    });
  }

  return false;
}

/** /force <amount>  OR  /force +5  OR  /force -3 */
async function cmdForce(args) {
  const value = args[0];

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    const actor = t.actor;
    const cur = actor.system.force?.value ?? 0;

    let newValue;

    if (value.startsWith('+')) {newValue = cur + parseInt(value.slice(1), 10);} else if (value.startsWith('-')) {newValue = cur - parseInt(value.slice(1), 10);} else {newValue = parseInt(value, 10);}

    if (Number.isNaN(newValue)) {
      ui.notifications.warn('Usage: /force <value | +n | -n>');
      return false;
    }

    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.force.value': Math.max(0, newValue)
    });
  }

  return false;
}

/** /xp <amount> */
async function cmdXP(args) {
  const n = parseNumber(args[0], '/xp <amount>');
  if (n === null) {return false;}

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}
  if (!game.user.isGM) {return ui.notifications.warn('XP commands require GM permissions.');}

  for (const t of tokens) {
    const actor = t.actor;
    const newXP = (actor.system.xp ?? 0) + n;

    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.xp': newXP
    });
  }

  return false;
}

/** /levelup */
async function cmdLevelUp() {
  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    try {
      await game.swse.progression.runLevelUp(t.actor);
      ui.notifications.info(`${t.actor.name} leveled up!`);
    } catch (e) {
      ui.notifications.error(`Failed to level up ${t.actor.name}`);
      SWSELogger.error(e);
    }
  }

  return false;
}

/** /condition <name> */
async function cmdCondition(args) {
  const name = args.join(' ');
  if (!name) {
    ui.notifications.warn('Usage: /condition <condition name>');
    return false;
  }

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    await t.actor?.toggleCondition(name);
  }

  return false;
}

/** /recalc */
async function cmdRecalc() {
  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    await globalThis.SWSE.ActorEngine.recalcAll(t.actor);
  }

  ui.notifications.info('Recalculated selected actors.');

  return false;
}

/** /rollswse <anything> (hook placeholder) */
async function cmdRollSWSE(args) {
  ui.notifications.info('SWSE custom roller coming soon!');

  return false;
}

/** /rest */
async function cmdRest() {
  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    const a = t.actor;

    // PHASE 2: Read from authoritative source, write to correct location
    await globalThis.SWSE.ActorEngine.updateActor(a, {
      'system.derived.hp.value': a.system?.derived?.hp?.max || a.system?.hp?.max || 0,
      'system.force.value': a.system.force.max ?? 0,
      'system.conditions': {}
    });
  }

  ui.notifications.info('Actors fully rested.');

  return false;
}

/** /stamina <value> */
async function cmdStamina(args) {
  const n = parseNumber(args[0], '/stamina <value>');
  if (n === null) {return false;}

  const tokens = getSelectedTokensOrWarn();
  if (!tokens) {return false;}

  for (const t of tokens) {
    await globalThis.SWSE.ActorEngine.updateActor(t.actor, {
      'system.stamina.value': Math.max(0, n)
    });
  }

  return false;
}
