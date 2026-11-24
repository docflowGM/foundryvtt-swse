/**
 * Small, failure-isolated notice card for engine-side messages (reaction results, ability denials).
 * `SWSEChat.postMessage` has never existed; calling it threw a TypeError that surfaced AFTER a paid action had already
 * completed (slice 6Y). Engines post through the canonical `SWSEChat.postHTML`, and a chat failure never changes the
 * outcome of the mechanic that was already decided.
 */
import { SWSEChat } from '/systems/foundryvtt-swse/scripts/chat/swse-chat.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function postNoticeCard({ flavor = '', content = '', actor = null } = {}) {
  try {
    return await SWSEChat.postHTML({
      content: `<div class="swse-notice-card">${flavor ? `<strong>${esc(flavor)}</strong>` : ''}<div class="swse-notice-body">${esc(content)}</div></div>`,
      actor
    });
  } catch (error) {
    console.warn('SWSE | notice card could not be posted (outcome unchanged):', error?.message ?? error);
    return null;
  }
}
