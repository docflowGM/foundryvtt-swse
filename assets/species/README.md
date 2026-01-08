# Species Photos

This directory contains portrait/avatar images for all playable species in the SWSE system.

## File Format

- **Format:** WebP (.webp) images are preferred for best performance
- **Alternative:** PNG (.png) or JPG (.jpg) files are also supported
- **Size:** Recommended 200x200px or larger (will be displayed at 60x60px with object-fit: cover)

## Naming Convention

Species photos should be named using the following pattern:

- Convert species name to lowercase
- Replace spaces with hyphens
- Append .webp extension

**Examples:**
- Human → `human.webp`
- Twi'lek → `twi'lek.webp`
- Mon Calamari → `mon-calamari.webp`
- Besalisk (Four-Armed) → `besalisk-(four-armed).webp`

## Complete Species List

The system recognizes 121 species. See the list below for exact filenames needed:

### A-B
- adnerem.webp
- advozse.webp
- aleena.webp
- anzat.webp
- aqualish.webp
- arkanian.webp
- arkanian-offshoot.webp
- balosar.webp
- barabel.webp
- besalisk.webp
- besalisk-(four-armed).webp
- bith.webp
- blood-carver.webp
- bothan.webp

### C-E
- caamasi.webp
- cathar.webp
- cathar-(savage).webp
- celegian.webp
- cerean.webp
- chagrian.webp
- chiss.webp
- chistori.webp
- clawdite.webp
- codru-ji.webp
- dashade.webp
- dathomirian.webp
- defel.webp
- devaronian.webp
- draethos.webp
- drall.webp
- dug.webp
- duros.webp
- echani.webp
- elomin.webp
- ewok.webp

### F-H
- falleen.webp
- feeorin.webp
- felucian.webp
- fosh.webp
- gamorrean.webp
- gand.webp
- gen'dai.webp
- geonosian.webp
- givin.webp
- gossam.webp
- gotal.webp
- gran.webp
- gungan.webp
- herglic.webp
- houk.webp
- human.webp
- hutt.webp

### I-N
- ikkrukkian.webp
- iktotchi.webp
- ithorian.webp
- jawa.webp
- kaleesh.webp
- kaminoan.webp
- karkarodon.webp
- kel-dor.webp
- kerkoiden.webp
- khil.webp
- kiffar.webp
- kissai.webp
- klatooinian.webp
- lannik.webp
- leporine.webp
- lurmen.webp
- mantellian-savrip.webp
- massassi.webp
- miraluka.webp
- mon-calamari.webp
- mrlssi.webp
- muun.webp
- nagai.webp
- nautolan.webp
- neimoidian.webp
- nelvaanian.webp
- nikto.webp
- noghri.webp
- nosaurian.webp
- nyriaanan.webp

### O-T
- ortolan.webp
- qel-droma.webp
- quarren.webp
- rakata.webp
- replica-droid.webp
- rishi.webp
- rodian.webp
- ryn.webp
- sakiyan.webp
- selkath.webp
- shard.webp
- snivvian.webp
- ssi-ruuvi.webp
- sullustan.webp
- talz.webp
- taung.webp
- thakwaash.webp
- togorian.webp
- togruta.webp
- toydarian.webp
- trandoshan.webp
- trianii.webp
- twi'lek.webp

### U-Z
- ubese.webp
- ugnaught.webp
- utai.webp
- vahla.webp
- vurk.webp
- weequay.webp
- whiphid.webp
- wookiee.webp
- wroonian.webp
- yarkora.webp
- yevetha.webp
- yuuzhan-vong.webp
- yuzzem.webp
- zabrak.webp
- zeltron.webp
- zygerrian.webp

## Implementation

The character sheet species picker automatically loads images from this directory:

1. When a player opens the species picker (by clicking "Select a Species" on the character sheet)
2. The system looks for images matching each species name in this directory
3. If an image is found, it displays as a 60x60px circular portrait
4. If no image is found, a DNA icon appears as a fallback

## Adding Images

Once you have species portrait images ready:

1. Convert to WebP format (optional but recommended for performance)
2. Name the file according to the convention above
3. Place in this `/assets/species/` directory
4. The species picker will automatically display them on next load (no code changes needed)

## Fallback Behavior

If an image file is missing, the species picker will display a DNA helix icon as a placeholder. The system remains fully functional without images.
