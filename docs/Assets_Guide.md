
## Character Sheet Specific Assets

The character sheet (v1.1) uses minimal assets for a clean, accessible design:
- No background images required (pure CSS gradients used)
- SVG icons for tab indicators (optional)
- Font-based icons via FontAwesome for UI elements

**Current Asset Usage:**
- Tab icons: Can use SVG or FontAwesome classes
- Ability score backgrounds: CSS gradients
- Defense displays: Styled divs with CSS

**Removed Dependencies:**
- `Sheet-frame.png` - No longer required (CSS-only design)
- `title-logo.png` - Optional (can use text-only header)

This reduces initial load time and simplifies deployment.

1. Purpose & Overview
The assets/ directory contains all static images used by the system: icons, portraits, UI chrome, backgrounds, and other art. These images are referenced directly from actor/item JSON, Handlebars templates, and CSS. Good asset hygiene reduces bundle size, improves load performance, and makes the system look polished and consistent.
Top-level recommended structure (mirror in repo src/assets/ and copy to dist/assets/ during build):
assets/
├─ icons/
│  ├─ feats/
│  ├─ talents/
│  ├─ forcepowers/
│  ├─ classes/
│  ├─ conditions/
│  └─ equipment/
├─ images/
│  ├─ ui/
│  ├─ backgrounds/
│  └─ portraits/
├─ tokens/
│  └─ (character tokens)
└─ ui/
   ├─ logo.png
   └─ sheet-frame.png
2. Naming Conventions (required)
Consistent names = easy references and fewer bugs.
Use lowercase, hyphen-separated names.
Good: force-training.png
Bad: Force Training.png, ForceTraining.PNG
Keep prefixes by category when helpful: feat-force-training.png, talent-guardian-stance.png
Include @2x or @3x suffix for high-DPI alternatives: logo@2x.png, portrait-guard-@2x.jpg
Do not include spaces or special characters.
Keep file extensions lowercase: .png, .jpg, .webp, .svg
Example filenames:
assets/icons/feats/force-training.png
assets/icons/weapons/blaster-pistol.png
assets/images/portraits/jedi-knight-1024x1024.png
assets/ui/logo.png
assets/tokens/jedi-knight-512.png
3. Recommended Formats & When to Use Them
PNG — Use when transparency is required (icons, tokens with transparent backgrounds, UI overlays). Good for icons; lossless.
SVG — Use for UI icons and vector artwork (logos, small crisp icons). Scales perfectly and small file size for simple shapes. Good for system chrome (sheet icons, HUD icons).
JPG / JPEG — For photographic images or backgrounds where transparency is not required. Use high-quality compression.
WebP / AVIF — Superior compression. Use for large backgrounds and portraits in the build/distribution to save bandwidth if your target environments support it. Keep a PNG/JPG fallback for compatibility.
GIF / APNG — Only for small, explicitly animated icons. Use sparingly — GIF is large and low quality; APNG better but bigger than a static PNG. Prefer CSS animations / sprite sheets instead.
Color profile: Convert/export to sRGB for consistent web color.
4. Size Guidelines (recommended targets)
These are modest, practical guidelines. For each image category we list typical pixel sizes and suggested max file sizes.
Icons (feats, talents, powers, equipment, conditions)
Standard: 128×128 px (primary)
Small: 64×64 px (UI lists/compact)
Retina: provide 256×256 px @2x optionally
Max file size: < 150 KB (ideally < 50KB for icons)
Item thumbnails / compendium thumbnails
256×256 px or 400×400 px (square)
Max < 200 KB
Portraits (actor portraits shown on sheet & chat)
Small: 280×400 px (sheet thumbnail)
High-res: 1024×1024 px (portrait modal / print)
Max file size: < 1 MB for high-res (use compression)
Tokens
Recommended: 512×512 px (square)
Acceptable: 256×256 for smaller servers, 1024×1024 for very detailed artwork
Transparent background recommended
Max file size: < 500 KB (512×512)
Backgrounds / sheet frames / UI backplates
Desktop background: 1920×1080 px (min)
Larger: 2560×1440 or 3840×2160 for hi-DPI
Sheet-frame: designed to tile or be scalable; provide large base (e.g., 2000×1200) and a @2x version
Max file size: < 2 MB (preferably compressed WebP)
Starship art / widescreen imagery
Typical: 1024×512 px or 1600×800 px
HUD icons / small chrome
24×24 px or 32×32 px (provide @2x versions for high-dpi)
5. Folder-by-folder specifics
assets/icons/*
Square icons for feats/talents/etc. Prefer transparent PNG or SVG.
Keep subfolders by semantic category: feats/, talents/, forcepowers/, equipment/, conditions/.
Each Item JSON should reference its icon path (see examples later).
assets/images/portraits
Portraits used for actor images and compendium items. Provide both thumbnail and high-res versions.
Use consistent aspect ratio (vertical for humanoid portraits, e.g., 4:5). Name sizes in filename for clarity: jedi-knight-1024x1280.png.
assets/tokens
Square images (512×512 recommended) with transparency.
Keep token-facing consistent (character center aligned).
Token naming convention: token-{actor-slug}.png (e.g., token-jedi-knight-512.png).
assets/ui
UI chrome: logo.png, sheet-frame.png, small UI sprites.
Prefer SVG for simple UI icons. Keep high-res PNG fallbacks.
6. Referencing Assets in the System
Item JSON example (in a compendium or embedded item):
{
  "name": "Force Push",
  "type": "forcePower",
  "img": "systems/swse/assets/icons/forcepowers/force-push.png",
  "system": {
    "description": "<p>Pushes a target away.</p>"
  }
}
Actor JSON example:
{
  "name": "Jedi Knight",
  "type": "character",
  "img": "systems/swse/assets/images/portraits/jedi-knight-280x400.png",
  "token": {
    "img": "systems/swse/assets/tokens/token-jedi-knight-512.png"
  }
}
Handlebars example (template):
<img class="portrait" src="{{actor.img}}" alt="{{actor.name}}">
CSS example:
.system-logo {
  background-image: url('/systems/swse/assets/ui/logo.png');
  width: 160px;
  height: 40px;
  background-repeat: no-repeat;
  background-size: contain;
}
7. Retina / High-DPI Support
Provide high-DPI versions of images where clarity matters (logos, portraits, sheet frames, tokens, icons). Use @2x or @3x suffix naming:
logo.png         (160×40)
logo@2x.png      (320×80)
logo@3x.png      (480×120)
CSS media query fallback:
.logo {
  background-image: url('../assets/ui/logo.png');
  background-size: 160px 40px;
}
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .logo { background-image: url('../assets/ui/logo@2x.png'); }
}
JS approach (recommended for assets loaded in templates):
const isHiDPI = window.devicePixelRatio && window.devicePixelRatio > 1;
const path = isHiDPI ? '.../logo@2x.png' : '.../logo.png';
element.src = path;
For icons stored in item JSON via the img property, supply the @2x file and implement a small helper that swaps to @2x when devicePixelRatio > 1 when rendering templates (you can add this logic in index.js preload step).
8. Build & Optimization Pipeline
Automate compression and copying to dist during build.
Goals
Compress images (pngquant / zopflipng / cwebp).
Optimize SVGs (svgo).
Generate retina variants if needed (sharp/ImageMagick).
Produce assets/asset-manifest.json (metadata & license).
Fingerprint assets for cache-busting in production (optional).
Tools (choose one or mix):
sharp (Node) — resizing, format conversion (recommended).
imagemin + imagemin-pngquant + imagemin-webp — compression pipelines.
svgo — optimize SVGs.
pngquant, zopfli, cwebp — CLI tools.
ImageMagick — general image ops.
Example npm scripts (conceptual)
"scripts": {
  "assets:optimize": "node scripts/optimize-assets.js",
  "build": "npm run assets:optimize && rollup -c"
}
Minimal CLI pipeline examples
# optimize PNGs
find src/assets -name '*.png' -exec pngquant --quality=65-85 --ext .png --force {} \;

# optimize SVGs
svgo -f src/assets -o dist/assets

# create webp versions
cwebp -q 80 input.jpg -o output.webp
Generate asset-manifest (JSON)
Each asset entry should include: path, width, height, author, license, source URL (optional), hash.
The build script should write dist/assets/asset-manifest.json.
9. Asset Manifest Example
assets/asset-manifest.json (source) — keep this in src/assets and copy to dist.
{
  "assets": [
    {
      "path": "icons/feats/force-training.png",
      "name": "Force Training Icon",
      "width": 128,
      "height": 128,
      "author": "Jane Artist",
      "license": "CC-BY-4.0",
      "source": "https://example.com/source",
      "notes": "Created for compendium feat entry"
    },
    {
      "path": "images/portraits/jedi-knight-1024x1280.png",
      "name": "Jedi Knight Portrait",
      "width": 1024,
      "height": 1280,
      "author": "Studio X",
      "license": "Royalty-free",
      "source": ""
    }
  ]
}
The manifest helps automation (check missing files, produce credits, enable in-app attribution).
10. Licensing, Credits & Distribution
Always keep license metadata for each asset inside the manifest and include a top-level ASSETS_LICENSES.md or credits/ folder. Example contents:
Asset file path
Asset name
Author
License (link)
Source URL
Any required attribution text
Do not include copyrighted commercial artwork unless you have distribution rights. Prefer public-domain or properly licensed assets (CC-BY, CC0, paid royalty-free with redistribution rights). If you include community contributions, require a contributor agreement (or clear license in PR).
11. Accessibility & Internationalization
Provide textual descriptions in item/actor system.description. The img property has no alt text slot — store alt text in system metadata:
"system": {
  "imgAlt": "Portrait of a human Jedi with blue lightsaber"
}
Then render in templates:
<img src="{{actor.img}}" alt="{{actor.system.imgAlt || actor.name}}">
Localize asset labels and credits through lang/*.json files, not the file names.
Ensure UI icons convey meaning beyond color (use shape) for color-blind accessibility.
12. Contributor Guidelines (artist checklist)
When submitting an asset PR:
Put source file(s) in src/assets/<category>/ with correct naming.
Keep file size reasonable (icons < 150 KB).
Add an entry to src/assets/asset-manifest.json:
path, name, width, height, author, license, source.
Include a small preview in PR description (GitHub renders images from repo).
If asset is derived from third-party, include license proof/URL.
If the asset needs a @2x version, include both or indicate generation is allowed by build step.
Add suggested usage (e.g., “Use for Force Push feat icon”).
13. Automation & QA
Implement simple checks in CI:
Lint referenced asset paths in packs/*.db or compendium .db files to ensure referenced img files exist.
Check max file sizes (fail if over configured limits).
Validate asset-manifest.json entries exist on disk.
Sample node check pseudo:
// scripts/check-assets.js
// 1) Scan packs DBs for img references
// 2) Confirm file exists in src/assets
// 3) Warn or fail CI if missing
14. Performance Tips
Prefer SVG for small, repeated chrome icons.
Use WebP for large backgrounds to save bandwidth; keep PNG fallback.
Use a build step to resize and generate thumbnails (don’t serve 4000×4000 to a sheet).
Cache-bust using hashed filenames in production builds, e.g., logo.7f3c2d.png and rewrite references via build tool.
Avoid many tiny HTTP requests on legacy servers — but Foundry preloads many assets, so optimize for total size first.
15. Troubleshooting & FAQs
Q: Image doesn’t show in Foundry item sheet.
Check the img path is systems/<system-id>/assets/... or relative to manifest.
Confirm file committed to repo and present in dist/.
Confirm correct casing of filename (case-sensitive on Linux).
Q: Token looks blurry.
Use a larger token (512/1024) and proper sizing. Make sure token is PNG with transparency. For very pixel-art tokens, keep them integral-scaled to avoid blur.
Q: Icons look pixelated on hi-dpi displays.
Provide @2x assets or SVG versions and add swap logic in templates or CSS.
Q: How do I add credits to the system?
Add ASSETS_LICENSES.md and/or credits/ with per-asset entries and display summary in README.
16. Example Summary (quick reference)
Icon standard: 128×128 PNG, name: assets/icons/feats/force-training.png
Token standard: 512×512 PNG, name: assets/tokens/token-jedi-512.png
Portrait standard: 280×400 (thumb) + 1024×1280 (hi-res)
UI logo: assets/ui/logo.png + logo@2x.png
Manifest: assets/asset-manifest.json — include author & license.
Optimize via sharp, imagemin, and svgo. Add CI checks for missing assets.