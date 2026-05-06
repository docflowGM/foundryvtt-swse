/**
 * HOLONET SYSTEM - Public API
 *
 * Single source of truth for communication records, delivery state, and projection routing.
 * Does NOT own business logic for stores, approvals, mentor, progression, or campaign truth.
 */

export { HolonetEngine } from './holonet-engine.js';
export { HolonetManager } from './holonet-manager.js';
export { HolonetPreferences } from './holonet-preferences.js';
export { HolonetSourceRegistry } from './holonet-source-registry.js';
export { HolonetStorage } from './subsystems/holonet-storage.js';
export { HolonetDeliveryRouter } from './subsystems/holonet-delivery-router.js';
export { HolonetProjectionRouter } from './subsystems/holonet-projection-router.js';
export { HolonetThreadService } from './subsystems/holonet-thread-service.js';
export { HolonetNotificationService } from './subsystems/holonet-notification-service.js';
export { HolonetFeedService } from './subsystems/holonet-feed-service.js';
export { HolonetSocketService } from './subsystems/holonet-socket-service.js';
export { HolonetMessengerService } from './subsystems/holonet-messenger-service.js';

// Contracts & enums
export * from './contracts/index.js';
