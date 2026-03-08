/**
 * SentinelEngine — Centralized re-export
 *
 * This module re-exports the SentinelEngine from the governance layer.
 * Used by action-policy-controller and other policy enforcement layers
 * to report violations and anomalies to the central integrity system.
 */

export { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
