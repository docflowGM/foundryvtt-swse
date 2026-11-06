/**
 * Canonical runtime/build pack taxonomy for all 429 publication-specific vehicles.
 * Every listed source category must have exactly one owning Actor compendium.
 * Historic catch-all, 316-ship and emplacement packs are not runtime sources.
 * This module intentionally has no Foundry globals so Node builders and tests
 * consume the exact same authority as the browser and store.
 */
export const UNIVERSAL_VEHICLE_PACKS = Object.freeze([
  {name:'vehicles-starfighters',label:'Vehicles — Starfighters',family:'starship',categories:['starfighter']},
  {name:'vehicles-space-transports',label:'Vehicles — Space Transports & Escape Craft',family:'starship',categories:['space-transport','escape-craft','drop-pod']},
  {name:'vehicles-capital-ships',label:'Vehicles — Capital Ships',family:'starship',categories:['capital-ship']},
  {name:'vehicles-stations',label:'Vehicles — Space Stations',family:'starship',categories:['space-station']},
  {name:'vehicles-walkers',label:'Vehicles — Walkers',family:'ground',categories:['walker']},
  {name:'vehicles-airspeeders',label:'Vehicles — Airspeeders & Atmospheric Craft',family:'air',categories:['airspeeder','air-speeder-bike','medical-airspeeder','ornithopter','aerial-artillery']},
  {name:'vehicles-speeders',label:'Vehicles — Speeders',family:'ground',categories:['speeder','speeder-bike','ground-speeder','ground-speeder-bike','heavy-ground-speeder','landspeeder','command-speeder','swoop','water-speeder']},
  {name:'vehicles-tracked',label:'Vehicles — Tracked Vehicles',family:'ground',categories:['tracked-vehicle']},
  {name:'vehicles-wheeled',label:'Vehicles — Wheeled Vehicles',family:'ground',categories:['wheeled-vehicle','wheeled-tank','wheeled-groundcar','wheeled-utility-vehicle','wheeled-assault-vehicle','wheel-bike']},
  {name:'vehicles-ground-armor',label:'Vehicles — Repulsorlift Armor',family:'ground',categories:['repulsorlift-tank']},
  {name:'vehicles-hybrids',label:'Vehicles — Hybrid & Droid Vehicles',family:'hybrid',categories:['hybrid-vehicle-droid','vehicle-droid']}
].map(x=>Object.freeze({...x,categories:Object.freeze(x.categories)})));

export const UNIVERSAL_VEHICLE_PACK_NAMES=Object.freeze(UNIVERSAL_VEHICLE_PACKS.map(x=>x.name));
export const VEHICLE_PACK_CATEGORIES=Object.freeze(Object.fromEntries(UNIVERSAL_VEHICLE_PACKS.map(x=>[x.name,x.categories])));
const byName=new Map(UNIVERSAL_VEHICLE_PACKS.map(x=>[x.name,x]));
const byCategory=new Map();
for(const spec of UNIVERSAL_VEHICLE_PACKS){
  if(byName.size!==UNIVERSAL_VEHICLE_PACKS.length) throw new Error('Universal vehicle pack name collision');
  for(const category of spec.categories){
    if(byCategory.has(category)) throw new Error('Universal vehicle category has multiple pack owners: '+category);
    byCategory.set(category,spec);
  }
}
export function getUniversalVehiclePack(name){return byName.get(name)??null;}
export function getUniversalVehiclePackForCategory(category){return byCategory.get(category)??null;}
export function isUniversalVehiclePack(name){return byName.has(name);}
export function getUniversalVehicleCategoryCount(){return byCategory.size;}
