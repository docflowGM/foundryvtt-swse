/**
 * SWSE Holo UI Initialization
 *
 * Deprecated compatibility bootstrap. Chat rendering/interactions are now owned
 * by ChatInteractionBridge and ChatSurfaceEnhancer so this file does not attach
 * independent renderChatMessageHTML listeners.
 */

import { registerChatInteractionBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-interaction-bridge.js";
import { SWSEChatEventBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-event-bridge.js";

Hooks.once('init', () => {
  CONFIG.ChatMessage = CONFIG.ChatMessage || {};
  CONFIG.ChatMessage.flags = CONFIG.ChatMessage.flags || {};
  CONFIG.ChatMessage.flags.swse = CONFIG.ChatMessage.flags.swse || {};
});

Hooks.once('ready', () => {
  SWSEChatEventBridge.installGlobal();
  registerChatInteractionBridge();

  globalThis.SWSE = globalThis.SWSE || {};
  globalThis.SWSE.HoloUI = {
    version: '1.1.0',
    phase: 'chat-bridge-consolidated',
    features: {
      rollEngine: true,
      holoTemplate: true,
      singlePipeline: true,
      centralizedChatBridge: true
    }
  };
});
