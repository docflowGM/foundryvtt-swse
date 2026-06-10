/**
 * Token Name Sync
 *
 * Keeps generated tokens aligned with their source actor names. Foundry's
 * prototype token can keep an early placeholder such as "Actor", causing later
 * scene tokens to appear as "Actor", "Actor (2)", etc. These hooks only repair
 * blank/generic token names and same-as-old-actor-name renames, leaving explicit
 * custom token names alone.
 */

const GENERIC_TOKEN_NAME_RE = /^(actor|new actor|new character|unnamed character)(?:\s*\(\d+\))?$/i;
let hooksRegistered = false;

function cleanName(value) {
  return String(value ?? '').trim();
}

function isGenericTokenName(value) {
  const name = cleanName(value);
  return !name || GENERIC_TOKEN_NAME_RE.test(name);
}

function shouldAdoptActorName(tokenName, actorName, previousActorName = null) {
  const token = cleanName(tokenName);
  const actor = cleanName(actorName);
  if (!actor || isGenericTokenName(actor)) return false;
  if (isGenericTokenName(token)) return true;
  const previous = cleanName(previousActorName);
  return Boolean(previous && token === previous && token !== actor);
}

function setTokenNameOnSource(source, actorName) {
  if (!source || !actorName) return;
  try {
    if (typeof source.updateSource === 'function') {
      source.updateSource({ 'prototypeToken.name': actorName });
      return;
    }
    foundry.utils.setProperty(source, 'prototypeToken.name', actorName);
  } catch (_err) {
    // Non-fatal: token naming should never block actor creation/update.
  }
}

function setSceneTokenNameOnSource(tokenDoc, actorName) {
  if (!tokenDoc || !actorName) return;
  try {
    if (typeof tokenDoc.updateSource === 'function') {
      tokenDoc.updateSource({ name: actorName });
    }
  } catch (_err) {
    // Non-fatal: token naming should never block token creation.
  }
}

function resolveTokenActor(tokenDoc, data = {}) {
  return tokenDoc?.actor
    ?? game?.actors?.get?.(tokenDoc?.actorId ?? data?.actorId ?? tokenDoc?.delta?.actorId)
    ?? null;
}

export function registerTokenNameSyncHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  Hooks.on('preCreateActor', (actor, data) => {
    const actorName = cleanName(actor?.name ?? data?.name);
    const tokenName = cleanName(actor?.prototypeToken?.name ?? data?.prototypeToken?.name);
    if (shouldAdoptActorName(tokenName, actorName)) {
      setTokenNameOnSource(actor, actorName);
    }
  });

  Hooks.on('preUpdateActor', (actor, changes) => {
    const nextActorName = cleanName(changes?.name);
    if (!nextActorName) return;

    const explicitTokenName = Object.hasOwn(changes, 'prototypeToken.name')
      || Object.hasOwn(changes, 'prototypeToken')
      || foundry.utils.hasProperty(changes, 'prototypeToken.name')
      || foundry.utils.hasProperty(changes, 'prototypeToken');
    if (explicitTokenName) return;

    const currentTokenName = cleanName(actor?.prototypeToken?.name);
    const currentActorName = cleanName(actor?.name);
    if (shouldAdoptActorName(currentTokenName, nextActorName, currentActorName)) {
      changes['prototypeToken.name'] = nextActorName;
    }
  });

  Hooks.on('preCreateToken', (tokenDoc, data) => {
    const actor = resolveTokenActor(tokenDoc, data);
    const actorName = cleanName(actor?.name);
    const tokenName = cleanName(tokenDoc?.name ?? data?.name);
    if (shouldAdoptActorName(tokenName, actorName)) {
      setSceneTokenNameOnSource(tokenDoc, actorName);
    }
  });
}
