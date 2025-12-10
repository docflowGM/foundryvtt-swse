# Force Power Unified Integration Report


Changes performed:

- Appended FORCE_POWER_DATA to existing C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\progression\data\progression-data.js (backup saved)

- Wrote C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\progression\engine\force-power-engine.js

- Wrote C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\progression\ui\force-power-picker.js

- Wrote C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\progression\ui\templates\force-power-picker.hbs

- Wrote C:\Users\Owner\Documents\GitHub\foundryvtt-swse\styles\apps\force-power-picker.css

- Patched C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\progression\engine\progression-engine.js: inserted ForcePowerEngine import and trigger calls (backup saved)

- Patched C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\progression\engine\template-engine.js: added ForcePowerEngine import and template trigger (backup saved)

- index.js already references progression modules or force engine; left unchanged.

- Old/legacy Force-power selection code (apps/chargen steps or levelup steps) should be removed or disabled to avoid duplicate dialogs. This script did not delete legacy files; review and remove them after testing.

- If your system uses a different compendium key for force powers (not 'swse.forcepowers'), edit force-power-engine.collectAvailablePowers accordingly.
