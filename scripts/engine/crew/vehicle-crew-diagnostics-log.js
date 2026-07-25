// scripts/engine/crew/vehicle-crew-diagnostics-log.js
//
// Phase 7: a tiny, dependency-free event log the crew/weapon-station
// mutation services record into, and vehicle-crew-diagnostics.js reads
// from. Kept dependency-free specifically so services can import it
// without ever forming a cycle back through vehicle-crew-diagnostics.js
// (which itself imports the services to build its snapshot).
//
// Not persisted, not part of actor data — purely an in-memory dev/GM aid,
// last-event-of-each-kind only, per vehicle id.

const EVENT_LOG = new Map();

function getEntry(vehicleId) {
  if (!vehicleId) return {};
  if (!EVENT_LOG.has(vehicleId)) EVENT_LOG.set(vehicleId, {});
  return EVENT_LOG.get(vehicleId);
}

export function recordAssignmentEvent(vehicleId, event) {
  if (!vehicleId) return;
  getEntry(vehicleId).lastAssignmentEvent = { ...event, timestamp: Date.now() };
}

export function recordMutationReceipt(vehicleId, summary) {
  if (!vehicleId) return;
  getEntry(vehicleId).lastMutationReceipt = { ...summary, timestamp: Date.now() };
}

export function recordFireResult(vehicleId, result) {
  if (!vehicleId) return;
  getEntry(vehicleId).lastFireResult = { ...result, timestamp: Date.now() };
}

export function getDiagnosticsLogEntry(vehicleId) {
  return getEntry(vehicleId);
}
