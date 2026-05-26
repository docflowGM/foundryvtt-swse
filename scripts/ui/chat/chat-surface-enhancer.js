/**
 * SWSE Chat Surface Enhancer
 *
 * A tiny, scoped, idempotent renderChatMessageHTML pass. It only enhances
 * SWSE-owned chat cards/messages and never mutates the full chat log, Foundry
 * base message chrome, or canvas DOM. Patch C also upgrades ordinary IC/emote
 * dialogue into the lightweight SWSE dialogue surface so player chat shares the
 * same visual language without entering the roll pipeline.
 */

import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";
import { AbilityWordHighlighter } from "/systems/foundryvtt-swse/scripts/ui/text/ability-word-highlighter.js";
import { SignedNumberHighlighter } from "/systems/foundryvtt-swse/scripts/ui/text/signed-number-highlighter.js";
import { SWSEChatEventBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-event-bridge.js";

export const SWSE_CHAT_SURFACE_SELECTOR = [
  '.swse-chat-card',
  '.swse-dialogue-card',
  '.swse-holonet-card',
  '.swse-receipt-card',
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

function isDialogueStyle(message) {
  const style = message?.style ?? message?.type ?? message?.data?.style;
  const styles = CONST?.CHAT_MESSAGE_STYLES ?? {};
  return style === styles.IC || style === styles.EMOTE || style === 'ic' || style === 'emote';
}

function shouldUpgradeDialogue(message, root) {
  if (!(root instanceof HTMLElement)) return false;
  if (!isDialogueStyle(message)) return false;
  if (message?.flags?.swse?.dialogueCard || message?.flags?.swse?.holo || message?.flags?.swse?.holonetCard) return false;
  if (root.querySelector(SWSE_CHAT_SURFACE_SELECTOR)) return false;
  if (root.querySelector('.dice-roll, .dice-result, button, form, input, select, textarea')) return false;
  const content = root.querySelector('.message-content');
  if (!content || !content.textContent?.trim()) return false;
  return true;
}

function escapeHtml(value = '') {
  const raw = String(value ?? '');
  if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(raw);
  const div = document.createElement('div');
  div.textContent = raw;
  return div.innerHTML;
}

function timeLabelForMessage(message) {
  const ts = message?.timestamp ?? message?.data?.timestamp ?? null;
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function upgradeDialogueMessage(message, root) {
  if (!shouldUpgradeDialogue(message, root)) return false;
  const content = root.querySelector('.message-content');
  const speakerName = message?.speaker?.alias || message?.alias || game.users?.get?.(message?.user?.id ?? message?.user)?.name || 'Speaker';
  const typeLabel = (message?.style ?? message?.type) === CONST?.CHAT_MESSAGE_STYLES?.EMOTE ? 'Emote' : 'Dialogue';
  const originalHtml = content.innerHTML;
  content.innerHTML = `
    <div class="swse-chat-card swse-roll-card swse-roll-card--dialogue swse-dialogue-card"
         data-swse-chat-surface="dialogue"
         data-swse-chat-card-v2="true">
      <span class="corners" aria-hidden="true">
        <span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span>
      </span>
      <div class="head swse-dialogue-head">
        <span class="type-chip"><span class="dot" aria-hidden="true"></span>${escapeHtml(typeLabel)}</span>
        <span class="who">${escapeHtml(speakerName)}</span>
        ${timeLabelForMessage(message) ? `<span class="ts">${escapeHtml(timeLabelForMessage(message))}</span>` : ''}
      </div>
      <div class="dialogue-body">${originalHtml}</div>
    </div>`;
  root.dataset.swseDialogueUpgraded = 'true';
  return true;
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

function bindHolonetKeyboard(surface) {
  if (!(surface instanceof HTMLElement)) return;
  if (!surface.matches('.swse-holonet-card')) return;
  if (surface.dataset.swseHolonetKeyBound === 'true') return;
  surface.dataset.swseHolonetKeyBound = 'true';
  surface.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    surface.click();
  });
}

function hideUnauthorizedReactionStrips(surface) {
  if (!(surface instanceof HTMLElement)) return;
  const strips = surface.querySelectorAll?.('.swse-chat-reaction-strip[data-swse-reaction-owner]') ?? [];
  for (const strip of strips) {
    const ownerId = strip.dataset.swseReactionOwner || '';
    if (!ownerId || game?.user?.isGM === true || ownerId === game?.user?.id) continue;
    strip.hidden = true;
    strip.setAttribute('aria-hidden', 'true');
  }
}

export function enhanceSWSEChatMessage(message, html) {
  const root = normalizeRoot(html);
  if (!root) return false;

  try { upgradeDialogueMessage(message, root); } catch (err) { console.warn('[SWSE Chat] Dialogue card upgrade failed', err); }

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
    try { bindHolonetKeyboard(surface); } catch (err) { console.warn('[SWSE Chat] Holonet keyboard binding failed', err); }
    try { hideUnauthorizedReactionStrips(surface); } catch (err) { console.warn('[SWSE Chat] Reaction visibility binding failed', err); }
  }

  return true;
}

export default enhanceSWSEChatMessage;
