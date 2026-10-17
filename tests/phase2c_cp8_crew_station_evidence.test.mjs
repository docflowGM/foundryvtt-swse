import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import { resolveVehicleCrewActor } from '../scripts/engine/crew/vehicle-crew-actor-authority.js';
import { resolveVehicleCrewStationEvidence } from '../scripts/domain/vehicles/vehicle-crew-station-evidence.js';
import { resolveTrustedStockAttackGroup, TRUSTED_STOCK_WEAPON_GROUP_COUNT } from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

afterEach(()=>{delete globalThis.game;delete globalThis.fromUuid;});
const createVehicle = ()=>({
  id:'GHTROC_ACTOR_1',type:'vehicle',
  system:{
    crewPositions:{gunner:null,pilot:null},
    weapons:[{id:'4d5b3422047f5eb8-weapon-1',name:'Double Laser Cannons',
      operatorStation:'gunner',firingArc:'fixed-forward'}],
    crewQuality:'normal'
  },items:new Map()
});
const gun={id:'GUNNER_1',name:'Gunner'};
const weapon={id:'system-weapons-0',name:'Double Laser Cannons',system:{operatorStation:'pilot'}};
const abstract=(vehicle)=>({ok:true,domain:'vehicle-abstract-crew',normalizedContext:{vehicleActor:vehicle,crewQuality:'normal'}});
const named=(vehicle,gunner)=>({ok:true,domain:'vehicle-actor-gunner',normalizedContext:{vehicleActor:vehicle,gunnerActor:gunner}});

test('unassigned published gunner station can be resolved as true abstract crew',async()=>{
  const vehicle=createVehicle();
  const r=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:abstract(vehicle)});
  assert.equal(r.crewStationResolved,true);
  assert.equal(r.stationKey,'gunner');
  assert.equal(r.assignmentKind,'abstract-crew');
});
test('named gunner actually assigned to vehicle gunner station can fire through this eligibility gate',async()=>{
  const vehicle=createVehicle();
  vehicle.system.crewPositions.gunner='GUNNER_1';
  globalThis.fromUuid=async()=>null;
  globalThis.game={actors:{get:id=>id==='GUNNER_1'?gun:null}};
  const r=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:named(vehicle,gun)});
  assert.equal(r.crewStationResolved,true);
  assert.equal(r.operatorActorId,'GUNNER_1');
  assert.equal(r.assignmentKind,'named');
});
test('assigned gunner cannot be impersonated by another actor or by abstract crew',async()=>{
  const vehicle=createVehicle();
  vehicle.system.crewPositions.gunner='GUNNER_1';
  globalThis.fromUuid=async()=>null;
  globalThis.game={actors:{get:id=>id==='GUNNER_1'?gun:null}};
  const wrong=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:named(vehicle,{id:'GUNNER_1',name:'Forged clone'})});
  assert.equal(wrong.crewStationResolved,false);
  assert.equal(wrong.reason,'GUNNER_NOT_ASSIGNED_TO_WEAPON_STATION');
  const abs=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:abstract(vehicle)});
  assert.equal(abs.crewStationResolved,false);
});
test('stale crew reference never falls back to generic Crew Quality',async()=>{
  const vehicle=createVehicle();vehicle.system.crewPositions.gunner='DELETED_ACTOR';
  globalThis.fromUuid=async()=>null;globalThis.game={actors:{get:()=>null}};
  const res=await resolveVehicleCrewActor(vehicle,'gunner');
  assert.equal(res.source,'invalid');
  const evidence=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:abstract(vehicle)});
  assert.equal(evidence.reason,'ASSIGNED_CREW_ACTOR_INVALID');
});
test('caller-supplied crewStation pilot cannot override verified gunner mount',async()=>{
  const vehicle=createVehicle();
  const r=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:abstract(vehicle),requestedCrewStation:'pilot'});
  assert.equal(r.crewStationResolved,false);
  assert.equal(r.reason,'REQUESTED_CREW_STATION_CONTRADICTS_INSTALLED_MOUNT');
});
test('weapon facade must match the exact installed row and cannot spoof a second mount',async()=>{
  const vehicle=createVehicle();
  const r=await resolveVehicleCrewStationEvidence({vehicle,weapon:{id:'system-weapons-1',name:'Double Laser Cannons'},domainResolution:abstract(vehicle)});
  assert.equal(r.reason,'INSTALLED_WEAPON_ROW_MISMATCH');
  const q=await resolveVehicleCrewStationEvidence({vehicle,weapon:{id:'system-weapons-0',name:'Other Cannon'},domainResolution:abstract(vehicle)});
  assert.equal(q.reason,'INSTALLED_WEAPON_ROW_MISMATCH');
});
test('stock owned Item must be the exact Item instance in vehicle collection',async()=>{
  const vehicle=createVehicle(),item={id:'OWNED_GUN',name:'Laser',system:{operatorStation:'gunner'}};
  const missing=await resolveVehicleCrewStationEvidence({vehicle,weapon:item,domainResolution:abstract(vehicle)});
  assert.equal(missing.reason,'WEAPON_NOT_OWNED_BY_VEHICLE');
  vehicle.items.set(item.id,item);
  const accepted=await resolveVehicleCrewStationEvidence({vehicle,weapon:item,domainResolution:abstract(vehicle)});
  assert.equal(accepted.crewStationResolved,true);
});
test('station-only metadata and caller flag cannot certify source stock attack',()=>{
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  assert.equal(resolveTrustedStockAttackGroup(createVehicle(),weapon),null);
});
test('unknown station fails closed',async()=>{
  const vehicle=createVehicle();vehicle.system.weapons[0].operatorStation='helm';
  const r=await resolveVehicleCrewStationEvidence({vehicle,weapon,domainResolution:abstract(vehicle)});
  assert.equal(r.reason,'WEAPON_OPERATOR_STATION_UNRESOLVED');
});
