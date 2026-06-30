# Implants Phase 4E — Store Catalog Completion

Phase 4E finishes the focused implant implementation by adding the actual implant items supplied from the source books and making them first-class store inventory.

## Implemented implant catalog

| Implant | Cost | Source |
|---|---:|---|
| Bio-Stabilizer Implant | 1,750 | Knights of the Old Republic Campaign Guide |
| Cardio Implant | 4,000 | Knights of the Old Republic Campaign Guide |
| Combat Implant | 5,000 | Knights of the Old Republic Campaign Guide |
| Memory Implant | 2,000 | Knights of the Old Republic Campaign Guide |
| Nerve Reinforcement Implant | 5,000 | Knights of the Old Republic Campaign Guide |
| Regenerative Implant | 4,250 | Knights of the Old Republic Campaign Guide |
| Sensory Implant | 2,500 | Knights of the Old Republic Campaign Guide |
| Subelectronic Converter | 23,000 | Jedi Academy Training Manual |

## Store behavior

Implants now normalize into the store category `Implants` instead of being hidden under generic Tech or Other Equipment. They remain equipment items so the existing store checkout path and Transaction Engine stay authoritative for credit movement.

## Runtime boundary

Purchasing an implant does not install or activate it automatically. The GM/player must explicitly install and activate the item through the actor Gear > Implants controls. Only explicitly tagged, installed/active implant items trigger ImplantRules penalties or Implant Training suppression.

## Cybernetics boundary

Generic cybernetics, prostheses, biotech, and droid systems are still not implants unless explicitly tagged as implants. Cybernetic Surgery remains a manual source-rule procedure.
