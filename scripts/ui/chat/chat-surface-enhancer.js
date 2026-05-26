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


function bindRollCardToggle(surface) {
  if (!(surface instanceof HTMLElement)) return;
  if (surface.dataset?.swseChatCardV2 !== 'true') return;

  const total = surface.querySelector('.swse-roll-total, .total');
  if (!(total instanceof HTMLElement)) return;
  if (total.dataset.swseToggleBound === 'true') return;
  total.dataset.swseToggleBound = 'true';

  const setExpanded = expanded => {
    const value = expanded ? 'true' : 'false';
    surface.dataset.expanded = value;
    total.setAttribute('aria-expanded', value);
  };

  if (!surface.dataset.expanded) setExpanded(false);
  total.setAttribute('role', total.getAttribute('role') || 'button');
  if (!total.hasAttribute('tabindex') && total.tagName !== 'BUTTON') total.setAttribute('tabindex', '0');

  const toggle = event => {
    const interactive = event?.target?.closest?.('button, a, input, select, textarea, [data-swse-reaction-key]');
    if (interactive && interactive !== total) return;
    event?.preventDefault?.();
    setExpanded(surface.dataset.expanded !== 'true');
  };

  total.addEventListener('click', toggle);
  total.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    toggle(event);
  });
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
    try { bindRollCardToggle(surface); } catch (err) { console.warn('[SWSE Chat] Roll card toggle binding failed', err); }
  }

  return true;
}

export default enhanceSWSEChatMessage;
