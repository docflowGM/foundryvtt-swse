/**
 * Holonet Bus
 *
 * Thin facade over socket transport and Hooks-based local events.
 * Callers use HolonetBus instead of reaching directly into HolonetSocketService or
 * writing raw Hooks.callAll for Holonet events, keeping the transport an implementation detail.
 *
 * Compatible with swseHolonetUpdated (fired alongside every emitLocal call).
 */

import { HolonetSocketService } from './holonet-socket-service.js';

const HOOK_PREFIX = 'swseHolonet:';

export class HolonetBus {
  /**
   * Send a request to the GM for a GM-authoritative action.
   * Non-GM clients call this; the GM socket handler executes the action.
   *
   * @param {string} action
   * @param {Object} data
   */
  static request(action, data = {}) {
    HolonetSocketService.emitRequest(action, data);
  }

  /**
   * Broadcast a sync update to all connected clients (GM only).
   * Pass { type, ...rest } to enable typed hook routing on receivers.
   *
   * @param {string|Object} typeOrData  Either a string type name or a full data object.
   * @param {Object} [extraData]        Additional data when typeOrData is a string.
   */
  static sync(typeOrData = {}, extraData = {}) {
    if (typeof typeOrData === 'string') {
      HolonetSocketService.emitSync({ type: typeOrData, ...extraData });
    } else {
      HolonetSocketService.emitSync(typeOrData);
    }
  }

  /**
   * Fire a local Foundry Hook for an in-process Holonet event.
   * Fires both the typed hook (swseHolonet:<type>) and the legacy
   * compatibility hook (swseHolonetUpdated) so existing listeners keep working.
   *
   * @param {string} type     Short event name, e.g. 'recordPublished'
   * @param {Object} payload
   */
  static emitLocal(type, payload = {}) {
    Hooks.callAll(`${HOOK_PREFIX}${type}`, payload);
    Hooks.callAll('swseHolonetUpdated', payload);
  }

  /**
   * Register a handler for a typed Holonet hook.
   *
   * @param {string}   type     Short event name, e.g. 'recordPublished'
   * @param {Function} handler
   * @returns {number} Hook ID (can be passed to off())
   */
  static on(type, handler) {
    return Hooks.on(`${HOOK_PREFIX}${type}`, handler);
  }

  /**
   * Unregister a typed Holonet hook listener.
   *
   * @param {string}          type
   * @param {Function|number} handlerOrId
   */
  static off(type, handlerOrId) {
    Hooks.off(`${HOOK_PREFIX}${type}`, handlerOrId);
  }
}
