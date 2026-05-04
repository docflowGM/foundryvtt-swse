/**
 * SWSE Chat Surface Enhancer
 *
 * A tiny, scoped, idempotent renderChatMessageHTML pass. It only enhances
 * SWSE-owned chat cards/messages and never mutates the full chat log, Foundry
 * base message chrome, or canvas DOM.
 */

import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";
import { AbilityWordHighlighter } from "/systems/foundryvtt-swse/scripts/ui/text/ability-word-highlighter.js";
import { SignedNumberHighlighter } from "/systems/foundryvtt-swse/scripts/ui/text/signed-number-highlighter.js";
import { SWSEChatEventBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-event-bridge.js";

export const SWSE_CHAT_SURFACE_SELECTOR = [
  '.swse-chat-card',
  '.swse-roll-card',
  '.swse-chat-roll',
  '.swse-holo-roll-card',
  '.swse-attack-card',
  '.swse-damage-card',
  '.damage-log-container',
  '.swse-level-up-summary',
  '.swse-progression-session',
  '.swse-species-reroll-card',
  '.swse-ability-card',
  '.swse-ability-chat-card',
  '[data-swse-event-id]',
  '[data-swse-chat-surface]'
].join(',');

function normalizeRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function findSurfaces(root) {
  if (!(root instanceof HTMLElement)) return [];
  const surfaces = [];
  if (root.matches?.(SWSE_CHAT_SURFACE_SELECTOR)) surfaces.push(root);
  surfaces.push(...root.querySelectorAll(SWSE_CHAT_SURFACE_SELECTOR));
  return [...new Set(surfaces)];
}

export function enhanceSWSEChatMessage(message, html) {
  const root = normalizeRoot(html);
  if (!root) return false;

  SWSEChatEventBridge.attachMessage(message);
  SWSEChatEventBridge.bindRenderedCard(message, root);

  const surfaces = findSurfaces(root);
  if (!surfaces.length) return false;

  root.classList.add('swse-chat-message');
  root.dataset.swseThemeSurface = 'chat';

  for (const surface of surfaces) {
    surface.dataset.swseThemeSurface = surface.dataset.swseThemeSurface || 'chat';

    if (surface.dataset.swseEnhanced === 'true') continue;
    surface.dataset.swseEnhanced = 'true';

    try { AbilityWordHighlighter.enhance(surface); } catch (err) { console.warn('[SWSE Chat] Ability highlighting failed', err); }
    try { SignedNumberHighlighter.enhance(surface); } catch (err) { console.warn('[SWSE Chat] Signed number highlighting failed', err); }
    try { TooltipRegistry.bind(surface); } catch (err) { console.warn('[SWSE Chat] Tooltip binding failed', err); }
  }

  return true;
}

export default enhanceSWSEChatMessage;
