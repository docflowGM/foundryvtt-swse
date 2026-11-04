/**
 * Vehicle tractor beams (Core Rulebook, Vehicles, Tractor Beams) as a THIN ADAPTER over the existing weapon-control / grapple architecture:
 *   weapon-control-effects.js  acquireTractor (opposed grapple -> grabbed), the per-turn opposed maintenance check, move-intent, release
 *   grapple-state-engine.js    the one persisted state (an ActiveEffect control record) -- nothing is stored here
 *   control-rules.js           the declarative contract (controlDeclarationOf builds the tractor declaration)
 * What is vehicle-specific, and all this file adds: (1) the declaration for a vehicle beam (size limit = the beam's vehicle, move 10
 * character-scale squares or 1 starship-scale square, no hurl, the beam's PRINTED grapple bonus, the range check that breaks the hold);
 * (2) the call after a hit; (3) the range test, which is the SAME vehicle range authority the attack uses.
 * Not modelled (deferred): a target LARGER than the beam's vehicle (Core: it keeps its Dexterity bonus and moves freely while the
 * tractoring ship may pull ITSELF toward it); docking clamps. Movement is an intent on the control card, as for every tractor control.
 */
import { applyWeaponControlRecord, controlDeclarationOf } from "/systems/foundryvtt-swse/scripts/engine/combat/weapon-control-effects.js";
import { resolveVehicleAttackRange } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle-attack-range.js";
import { SWSEGrappling } from "/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js";

export const TRACTOR_IDENTITY = 'vehicle-tractor-beam';
const slug = v => String(v ?? '').trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Core: "pull the target up to 10 squares closer to you (or 1 square closer in starship scale) or hold it". */
export const tractorMoveSquares = scale => (scale === 'starship' ? 1 : 10);

export function vehicleTractorDeclaration({ vehicle, scale, controllerGrapple = null }) {
  const squares = tractorMoveSquares(scale);
  return controlDeclarationOf({
    identityKey: TRACTOR_IDENTITY,
    operation: {
      maxTargetSize: slug(vehicle?.system?.size ?? vehicle?.system?.derived?.size),
      moveGrabbedObjectSquares: squares, hurlGrabbedObjectRangeSquares: 0,
      tractorControl: {
        acquisition: { defense: 'reflex', comparison: 'equals-or-exceeds', then: 'opposed-grapple-check' },
        maintain: { timing: 'start-of-controller-turn', check: 'opposed-grapple', onLoss: 'release' },
        move: { squares, direction: 'toward-controller' }, hurl: { rangeSquares: 0 },
        controllerGrapple, rangeCheck: 'vehicle-weapon-range'
      }
    }
  });
}

/** After a HIT with a tractor beam: the weapon-control record is applied through the existing control engine. */
export async function applyVehicleTractorBeam({ vehicle, weapon, authority, target, scale, message = null, attackTotal = null }) {
  if (authority?.tractorBeam !== true) return { applied: false, reason: 'not-a-tractor-beam' };
  const declaration = vehicleTractorDeclaration({ vehicle, scale, controllerGrapple: authority.tractorGrapple ?? null });
  if (!declaration?.tractor) return { applied: false, reason: 'no-tractor-declared' };
  const rec = { id: 'tractor-beam', kind: 'weapon-control', role: 'tractor', payload: { declaration, attackTotal }, source: { identityKey: TRACTOR_IDENTITY, weaponId: weapon?.id ?? null } };
  return applyWeaponControlRecord(rec, {
    target, attacker: vehicle, weapon, message, weaponLabel: weapon?.name ?? 'Tractor beam', special: {},
    grappleBonusFor: actor => SWSEGrappling._rollGrappleBonus(actor, { mode: actor === vehicle ? 'attackGrapple' : 'resistGrapple' })
  });
}

/** Is the held vehicle still inside the beam's range (the vehicle range authority; unresolvable distance keeps the hold, a measured miss breaks it). */
export async function vehicleTractorInRange({ controller, target, control }) {
  const weapon = controller?.items?.get?.(control?.source?.weaponId) ?? null;
  if (!weapon) return true;
  const r = await resolveVehicleAttackRange({ vehicle: controller, weapon, target });
  return !(r.ok === false && r.reason === 'RANGE_TARGET_OUT_OF_RANGE');
}
