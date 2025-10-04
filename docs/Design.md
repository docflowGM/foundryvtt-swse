# SWSE FoundryVTT System — Design Overview

## 🎯 Purpose
This document describes the overall architecture, design principles, and intended development conventions for the Star Wars Saga Edition (SWSE) system for FoundryVTT.

## 🏗️ System Architecture

/system
├── actors/ → Actor data models & sheets
├── items/ → Item data models & sheets
├── rolls/ → Roll handlers & dice logic
├── combat/ → Combat tracker hooks & initiative
├── scripts/ → System scripts (chargen, automation, etc.)
├── ui/ → Custom UI components
├── utils/ → Shared helpers & utilities
├── templates/ → HTML templates
├── styles/ → CSS / SCSS
├── assets/ → Icons, images, and other static assets
├── lang/ → Localization JSONs
├── packs/ → Compendium packs
├── system.json → System manifest
└── template.json → Actor/item templates


## ⚙️ Data Files
- `data/classes.json` – Heroic class data with defense bonuses
- `data/npc-classes.json` – NPC and non-heroic classes
- `data/prestige-classes.json` – Prestige class definitions
- `data/feats.json`, `data/talents.json`, etc. (future expansion)

## 🧩 Coding Guidelines
- **Language:** ES modules (ES2020+)
- **Style:** 2 spaces per indent, strict semicolons, single quotes
- **Data Models:** Use Foundry’s `DataModel` pattern for actors and items.
- **Naming:** 
  - `swse-actor.js`, `swse-item.js`, `swse-rolls.js` for system-level classes
  - Functions use camelCase, constants are SCREAMING_SNAKE_CASE

## 🪄 Foundry Integration
- Registered via `system.json`
- Exports global `SWSE` namespace for cross-module calls
- Uses Foundry hooks:
  - `init` → register sheets and settings
  - `ready` → initialize chargen and automation
  - `renderActorSheet` → inject dynamic elements

## 🚀 Build & Deployment
Use the Python `build.py` script (in progress) to package the system:
python build.py

Outputs a `.zip` in `/dist` for uploading to ForgeVTT.

## 🔮 Future Goals
- Fully dynamic Character Generator (CharGen)
- SWSE rules automation for conditions, damage, and talents
- Compendium generation scripts for classes, feats, and powers
- Modular theme support (light/dark UI)

---

**Maintainer:** Doc Flow  
**GitHub:** [https://github.com/docflowGM/foundryvtt-swse](https://github.com/docflowGM/foundryvtt-swse)
