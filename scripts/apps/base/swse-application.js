/**
 * Legacy shim for SWSEApplication
 *
 * This file re-exports SWSEApplicationV2 to unify the base class and prevent import breakage.
 * All new code should import SWSEApplicationV2 directly.
 * Legacy code that imports SWSEApplication will resolve to the V2 implementation.
 *
 * Unified to AppV2 base: https://claude.ai/code/session_01JaERZPKhu1PSi4kPKu1tdc
 */

export { default } from './swse-application-v2.js';
