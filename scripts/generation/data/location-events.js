/**
 * PHASE 8D-2 foundation — Location event pool for `location-event.js`.
 * Representative catalog (28 entries). A "current event" is short-term
 * ambient flavor happening AT/AROUND a Location right now -- distinct
 * from `planets/planet-history-hooks.js` (past events) and
 * `planets/planet-hazards.js` (standing environmental/security risks).
 * Applies to any Location (planet or POI), Library-based or procedural
 * -- this module never touches the canonical Location schema itself.
 */

export const LOCATION_EVENTS = Object.freeze([
  { value: 'a local festival or celebration is underway', weight: 3, tags: ['civilian', 'urban'] },
  { value: 'a labor strike has brought commerce to a halt', weight: 2, tags: ['business-professional', 'urban'] },
  { value: 'a natural disaster has just struck the area', weight: 1, tags: [] },
  { value: 'a high-profile diplomatic visit is underway', weight: 2, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'a smuggling bust has just gone public', weight: 2, tags: ['criminal', 'urban'] },
  { value: 'a disease outbreak is spreading through the population', weight: 1, tags: [] },
  { value: 'a military lockdown is currently in effect', weight: 2, tags: ['military-paramilitary', 'enforcement'] },
  { value: 'a trade fair has brought unusual crowds', weight: 2, tags: ['business-professional', 'trade'] },
  { value: 'a public execution or trial is drawing attention', weight: 1, tags: ['enforcement', 'crime-syndicate'] },
  { value: 'a religious pilgrimage has swelled the local population', weight: 1, tags: ['religion'] },
  { value: 'a recent terrorist/sabotage attack has raised tensions', weight: 1, tags: ['military-paramilitary'] },
  { value: 'a corporate merger/takeover is roiling the local economy', weight: 1, tags: ['business-professional'] },
  { value: 'a missing-persons search is actively underway', weight: 2, tags: [] },
  { value: 'a curfew has just been imposed', weight: 1, tags: ['enforcement', 'military-paramilitary'] },
  { value: 'a prominent local figure has just died unexpectedly', weight: 1, tags: [] },
  { value: 'a refugee influx is straining local resources', weight: 2, tags: ['community-tribe'] },
  { value: 'a black-market crackdown is underway', weight: 2, tags: ['enforcement', 'criminal'] },
  { value: 'a power outage/infrastructure failure is ongoing', weight: 1, tags: [] },
  { value: 'a championship sporting or dueling event is drawing crowds', weight: 1, tags: ['civilian'] },
  { value: 'an unusual astronomical event is visible overhead', weight: 1, tags: ['mysterious'] },
  { value: 'a political rally or protest is gathering momentum', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'a quarantine has been declared in part of the area', weight: 1, tags: [] },
  { value: 'a recent crime wave has put locals on edge', weight: 2, tags: ['criminal'] },
  { value: 'a visiting fleet/convoy has temporarily doubled the population', weight: 1, tags: ['military-paramilitary', 'trade'] },
  { value: 'a scandal involving local leadership is breaking', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'a supply shortage is causing local unrest', weight: 2, tags: [] },
  { value: 'an anniversary of a significant historical event is being observed', weight: 1, tags: [] },
  { value: 'nothing unusual -- life continues as normal', weight: 4, tags: [] }
]);
