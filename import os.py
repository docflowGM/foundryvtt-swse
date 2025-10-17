#!/usr/bin/env python3
"""
SWSE Holo Theme Applier
Applies the Star Wars holo datapad theme to all SWSE sheets
"""

import os
import re
from pathlib import Path

# Base path - adjust if needed
BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

def backup_file(filepath):
    """Create a backup of the file before modifying"""
    backup_path = filepath.with_suffix(filepath.suffix + '.backup')
    if filepath.exists() and not backup_path.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Backed up: {filepath.name}")

def apply_holo_to_css():
    """Merge holo theme into main CSS files"""
    styles_dir = BASE_PATH / "styles"
    
    # Read the holo theme
    holo_css_path = styles_dir / "swse-holo.css"
    if not holo_css_path.exists():
        print(f"✗ Holo CSS not found at {holo_css_path}")
        return
    
    with open(holo_css_path, 'r', encoding='utf-8') as f:
        holo_css = f.read()
    
    # CSS files to update
    css_files = [
        "character-sheet.css",
        "unified-sheets.css",
        "swse-components.css"
    ]
    
    for css_file in css_files:
        css_path = styles_dir / css_file
        if not css_path.exists():
            print(f"⚠ Skipping {css_file} (not found)")
            continue
        
        backup_file(css_path)
        
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if holo theme already applied
        if "holo-theme" in content and "HOLO THEME" in content:
            print(f"⚠ {css_file} already has holo theme")
            continue
        
        # Add holo theme at the end
        new_content = content + "\n\n" + """/* ============================================
   HOLO THEME INTEGRATION
   ============================================ */
""" + holo_css
        
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Applied holo theme to: {css_file}")

def update_template(template_path, sheet_type):
    """Add holo-theme class to a template file"""
    if not template_path.exists():
        print(f"⚠ Template not found: {template_path}")
        return False
    
    backup_file(template_path)
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has holo-theme
    if 'holo-theme' in content:
        print(f"⚠ {template_path.name} already has holo-theme class")
        return False
    
    # Pattern to find the main sheet wrapper div/form
    patterns = [
        (r'(<form[^>]*class=")([^"]*swse[^"]*)"', r'\1\2 holo-theme"'),
        (r'(<div[^>]*class=")([^"]*swse[^"]*sheet[^"]*)"', r'\1\2 holo-theme"'),
        (r'(<div[^>]*class=")([^"]*sheet[^"]*)"', r'\1\2 holo-theme"'),
    ]
    
    modified = False
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content, count=1)
        if new_content != content:
            content = new_content
            modified = True
            break
    
    if not modified:
        # If no match found, try to add to the first class attribute
        match = re.search(r'(<(?:form|div)[^>]*class=")([^"]*)"', content)
        if match:
            content = re.sub(
                r'(<(?:form|div)[^>]*class=")([^"]*)"',
                r'\1\2 holo-theme"',
                content,
                count=1
            )
            modified = True
    
    if modified:
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Updated template: {template_path.name}")
        return True
    else:
        print(f"✗ Could not update template: {template_path.name}")
        return False

def apply_holo_to_templates():
    """Apply holo theme class to all sheet templates"""
    templates_dir = BASE_PATH / "templates" / "actors"
    
    templates = {
        "character-sheet.hbs": "character",
        "npc-sheet.hbs": "npc",
        "droid-sheet.hbs": "droid",
        "vehicle-sheet.hbs": "vehicle"
    }
    
    for template_file, sheet_type in templates.items():
        template_path = templates_dir / template_file
        update_template(template_path, sheet_type)
    
    # Also check items templates
    items_dir = BASE_PATH / "templates" / "items"
    if items_dir.exists():
        item_template = items_dir / "item-sheet.hbs"
        if item_template.exists():
            update_template(item_template, "item")

def update_js_classes():
    """Update JavaScript files to add holo-theme class to sheet options"""
    scripts_dir = BASE_PATH / "scripts"
    
    js_files = [
        "swse-actor.js",
        "swse-droid.js",
        "swse-vehicle.js",
        "swse-item.js"
    ]
    
    for js_file in js_files:
        js_path = scripts_dir / js_file
        if not js_path.exists():
            print(f"⚠ JS file not found: {js_file}")
            continue
        
        backup_file(js_path)
        
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already has holo-theme
        if 'holo-theme' in content:
            print(f"⚠ {js_file} already has holo-theme")
            continue
        
        # Add holo-theme to classes array in defaultOptions
        pattern = r'(classes:\s*\[)([^\]]*)"swse"([^\]]*)\]'
        replacement = r'\1\2"swse", "holo-theme"\3]'
        
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            with open(js_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Updated JS classes: {js_file}")
        else:
            # Try alternative pattern
            pattern2 = r'(classes:\s*\[[^\]]*)("])'
            replacement2 = r'\1, "holo-theme"\2'
            new_content = re.sub(pattern2, replacement2, content, count=1)
            
            if new_content != content:
                with open(js_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✓ Updated JS classes: {js_file}")
            else:
                print(f"⚠ Could not auto-update {js_file}, may need manual adjustment")

def create_enhanced_holo_css():
    """Create an enhanced version of holo CSS with sheet-specific improvements"""
    styles_dir = BASE_PATH / "styles"
    enhanced_path = styles_dir / "swse-holo-enhanced.css"
    
    enhanced_css = """/* ──────────────────────────────────────────────── */
/* STAR WARS SAGA EDITION – ENHANCED HOLO THEME    */
/* Datapad-style UI for all SWSE sheets             */
/* ──────────────────────────────────────────────── */

/* Apply to all SWSE sheets */
.swse.sheet.holo-theme,
.swse.character-sheet.holo-theme,
.swse.npc-sheet.holo-theme,
.swse.droid-sheet.holo-theme,
.swse.vehicle-sheet.holo-theme,
.swse.item-sheet.holo-theme {
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at center, #0a0f1a 20%, #05080e 80%);
  color: #9ed0ff;
  border: 2px solid #1c4b8e;
  border-radius: 12px;
  box-shadow: 0 0 20px #0ff3, inset 0 0 10px #123;
  font-family: "Orbitron", "Roboto", sans-serif;
  animation: holo-flicker 1.2s ease-in-out;
}

/* Keep content above grid layers */
.holo-theme form,
.holo-theme .sheet-body-wrapper,
.holo-theme .sheet-body {
  position: relative;
  z-index: 5;
}

/* ─────────────── Inputs & Textareas ─────────────── */
.holo-theme input,
.holo-theme textarea,
.holo-theme select {
  background: rgba(0, 30, 60, 0.4);
  color: #b5daff;
  border: 1px solid #0af;
  border-radius: 4px;
  padding: 4px 6px;
  transition: all 0.2s ease;
}

.holo-theme input:focus,
.holo-theme textarea:focus,
.holo-theme select:focus {
  border-color: #00c6ff;
  box-shadow: 0 0 8px #00c6ff;
  outline: none;
  background: rgba(0, 40, 80, 0.6);
}

.holo-theme input::placeholder {
  color: rgba(181, 218, 255, 0.5);
}

/* ─────────────── Headers ─────────────── */
.holo-theme .sheet-header {
  background: linear-gradient(135deg, rgba(26, 77, 122, 0.8), rgba(44, 95, 141, 0.8));
  border-bottom: 2px solid #0af;
  box-shadow: 0 0 20px rgba(0, 170, 255, 0.3);
}

.holo-theme .charname input,
.holo-theme h1,
.holo-theme h2,
.holo-theme h3 {
  color: #9ed0ff;
  text-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
}

.holo-theme .section-header {
  color: #00c6ff;
  border-bottom-color: #0af;
  text-shadow: 0 0 5px rgba(0, 170, 255, 0.6);
}

/* ─────────────── Tabs Navigation ─────────────── */
.holo-theme .sheet-tabs {
  display: flex;
  border-bottom: 1px solid #0af;
  justify-content: space-around;
  margin-bottom: 0.5em;
  background: rgba(0, 20, 40, 0.6);
}

.holo-theme .sheet-tabs .item {
  padding: 0.4em 0.8em;
  cursor: pointer;
  color: #9ed0ff;
  text-transform: uppercase;
  transition: all 0.2s ease;
  border: none;
  background: transparent;
}

.holo-theme .sheet-tabs .item:hover {
  color: #fff;
  text-shadow: 0 0 6px #00baff;
  background: rgba(0, 170, 255, 0.1);
}

/* Active tab pulsing holo glow */
@keyframes holo-tab-pulse {
  0%, 100% {
    text-shadow: 0 0 8px #00f0ff, 0 0 15px #00aaff33;
    box-shadow: 0 2px 10px #00aaff33;
  }
  50% {
    text-shadow: 0 0 15px #00f0ff, 0 0 25px #00aaffaa;
    box-shadow: 0 2px 15px #00aaff77;
  }
}

.holo-theme .sheet-tabs .item.active {
  color: #fff;
  border-bottom: 2px solid #00e6ff;
  background: rgba(0, 170, 255, 0.15);
  animation: holo-tab-pulse 3s ease-in-out infinite;
}

/* ─────────────── Buttons ─────────────── */
.holo-theme button,
.holo-theme .holo-btn {
  background: linear-gradient(90deg, #002f6c, #003f8f);
  border: 1px solid #00baff;
  color: #b5daff;
  border-radius: 6px;
  padding: 6px 12px;
  transition: 0.2s;
  cursor: pointer;
  text-shadow: 0 0 5px rgba(0, 170, 255, 0.3);
}

.holo-theme button:hover,
.holo-theme .holo-btn:hover {
  background: #00aaff;
  color: #fff;
  box-shadow: 0 0 10px #00cfff;
  animation: holo-pulse 1.5s infinite ease-in-out;
  transform: translateY(-1px);
}

@keyframes holo-pulse {
  0%, 100% { box-shadow: 0 0 10px #00f3ff55; }
  50% { box-shadow: 0 0 20px #00f3ff99; }
}

/* ─────────────── Stats & Values ─────────────── */
.holo-theme .ability-modifier,
.holo-theme .defense-value,
.holo-theme .stat-value,
.holo-theme .def-val,
.holo-theme .modifier-value {
  color: #00ff88;
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
}

.holo-theme .rollable:hover {
  color: #00ffff;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: scale(1.1);
}

/* ─────────────── Boxes & Containers ─────────────── */
.holo-theme .ability,
.holo-theme .defense,
.holo-theme .resource-box,
.holo-theme .stat-box,
.holo-theme .item,
.holo-theme .npc-weapon,
.holo-theme .vehicle-weapon {
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(0, 170, 255, 0.4);
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0, 170, 255, 0.1);
}

.holo-theme .ability:hover,
.holo-theme .item:hover {
  border-color: #0af;
  box-shadow: 0 0 15px rgba(0, 170, 255, 0.3);
}

/* ─────────────── Tables ─────────────── */
.holo-theme table,
.holo-theme .holo-table {
  width: 100%;
  border-collapse: collapse;
}

.holo-theme th,
.holo-theme td,
.holo-theme .holo-table th,
.holo-theme .holo-table td {
  border-bottom: 1px solid rgba(0, 77, 128, 0.5);
  padding: 6px 8px;
  color: #9ed0ff;
}

.holo-theme th {
  color: #00c6ff;
  text-shadow: 0 0 5px rgba(0, 170, 255, 0.5);
  background: rgba(0, 170, 255, 0.1);
}

.holo-theme tr:hover {
  background: rgba(0, 170, 255, 0.1);
}

/* ─────────────── Skills ─────────────── */
.holo-theme .skill-row {
  border-bottom-color: rgba(0, 170, 255, 0.2);
}

.holo-theme .skill-row:hover {
  background: rgba(0, 170, 255, 0.15);
}

.holo-theme .skill-total {
  color: #00ff88;
  text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
}

/* ─────────────── Holographic Grid Overlay ─────────────── */
.holo-theme::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    linear-gradient(90deg, rgba(0, 180, 255, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(0, 180, 255, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.25;
  animation: holo-grid-move 20s linear infinite;
  z-index: 0;
}

@keyframes holo-grid-move {
  from { background-position: 0 0, 0 0; }
  to { background-position: 200px 200px, 200px 200px; }
}

/* ─────────────── Holographic Glow Wave ─────────────── */
.holo-theme::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at center, rgba(0,255,255,0.05) 0%, transparent 70%);
  mix-blend-mode: screen;
  animation: holo-wave 12s ease-in-out infinite;
  opacity: 0.2;
  pointer-events: none;
  z-index: 1;
}

@keyframes holo-wave {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.05); opacity: 0.3; }
}

/* ─────────────── Holo Boot-up Flicker ─────────────── */
@keyframes holo-flicker {
  0% { opacity: 0; filter: brightness(0.5); }
  15% { opacity: 1; filter: brightness(1.2); }
  30% { opacity: 0.7; filter: brightness(0.8); }
  50% { opacity: 1; filter: brightness(1); }
  75% { opacity: 0.9; filter: brightness(1.3); }
  100% { opacity: 1; filter: brightness(1); }
}

/* ─────────────── Scrollbar (Datapad style) ─────────────── */
.holo-theme ::-webkit-scrollbar {
  width: 8px;
}

.holo-theme ::-webkit-scrollbar-track {
  background: rgba(0, 20, 40, 0.6);
}

.holo-theme ::-webkit-scrollbar-thumb {
  background: #0077bb;
  border-radius: 10px;
  box-shadow: 0 0 5px rgba(0, 170, 255, 0.5);
}

.holo-theme ::-webkit-scrollbar-thumb:hover {
  background: #00cfff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
}

/* ─────────────── Special Effects ─────────────── */
.holo-theme .profile-img {
  border-color: #0af;
  box-shadow: 0 0 15px rgba(0, 170, 255, 0.5);
}

.holo-theme .editor-content {
  background: rgba(0, 20, 40, 0.4);
  border: 1px solid rgba(0, 170, 255, 0.3);
  color: #b5daff;
}

/* ─────────────── Datapad Status Indicator ─────────────── */
.holo-theme::before {
  /* Grid effect already defined above */
}

/* Add subtle scan line effect */
.holo-theme .sheet-body::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
  animation: holo-scan 4s linear infinite;
  pointer-events: none;
  z-index: 100;
}

@keyframes holo-scan {
  from { transform: translateY(0); }
  to { transform: translateY(600px); }
}
"""
    
    with open(enhanced_path, 'w', encoding='utf-8') as f:
        f.write(enhanced_css)
    
    print(f"✓ Created enhanced holo CSS: {enhanced_path.name}")
    return enhanced_path

def create_missing_chargen_template():
    """Create the missing chargen.html template"""
    templates_dir = BASE_PATH / "templates" / "apps"
    templates_dir.mkdir(parents=True, exist_ok=True)
    
    chargen_template_path = templates_dir / "chargen.html"
    
    if chargen_template_path.exists():
        print(f"⚠ chargen.html already exists")
        return
    
    chargen_html = """<form class="swse character-generator holo-theme">
    <div class="chargen-container">
        <!-- Header -->
        <div class="chargen-header">
            <h1>{{localize "SWSE.CharGen.Title"}}</h1>
            <p class="step-indicator">Step {{currentStep}} of {{totalSteps}}: {{stepName}}</p>
        </div>

        <!-- Main Content Area -->
        <div class="chargen-body">
            {{#if (eq currentStep 1)}}
                <!-- Step 1: Species Selection -->
                <div class="chargen-step species-selection">
                    <h2>Choose Your Species</h2>
                    <div class="species-grid">
                        {{#each species}}
                        <div class="species-card {{#if selected}}selected{{/if}}" data-species="{{id}}">
                            <h3>{{name}}</h3>
                            <div class="species-bonuses">
                                {{#each bonuses}}
                                <span class="bonus">{{this}}</span>
                                {{/each}}
                            </div>
                        </div>
                        {{/each}}
                    </div>
                </div>
            {{/if}}

            {{#if (eq currentStep 2)}}
                <!-- Step 2: Class Selection -->
                <div class="chargen-step class-selection">
                    <h2>Choose Your Class</h2>
                    <div class="class-grid">
                        {{#each classes}}
                        <div class="class-card {{#if selected}}selected{{/if}}" data-class="{{id}}">
                            <h3>{{name}}</h3>
                            <p>{{description}}</p>
                            <div class="class-stats">
                                <span>HP: {{hitPoints}}</span>
                                <span>BAB: {{baseAttackBonus}}</span>
                            </div>
                        </div>
                        {{/each}}
                    </div>
                </div>
            {{/if}}

            {{#if (eq currentStep 3)}}
                <!-- Step 3: Ability Scores -->
                <div class="chargen-step abilities-selection">
                    <h2>Set Ability Scores</h2>
                    <div class="abilities-grid">
                        {{#each abilities}}
                        <div class="ability-input">
                            <label>{{name}}</label>
                            <input type="number" name="abilities.{{id}}" value="{{value}}" min="8" max="18" />
                            <span class="modifier">{{modifier}}</span>
                        </div>
                        {{/each}}
                    </div>
                    <div class="points-remaining">
                        <p>Points Remaining: <strong>{{pointsRemaining}}</strong></p>
                    </div>
                </div>
            {{/if}}

            {{#if (eq currentStep 4)}}
                <!-- Step 4: Skills -->
                <div class="chargen-step skills-selection">
                    <h2>Train Skills</h2>
                    <p class="skills-info">Available Skill Points: <strong>{{skillPoints}}</strong></p>
                    <div class="skills-list">
                        {{#each skills}}
                        <div class="skill-option {{#if trained}}selected{{/if}}">
                            <label class="skill-checkbox">
                                <input type="checkbox" name="skills.{{id}}" {{#if trained}}checked{{/if}} />
                                <div class="skill-info">
                                    <span class="skill-name">{{name}}</span>
                                    <span class="skill-ability">({{ability}})</span>
                                </div>
                            </label>
                        </div>
                        {{/each}}
                    </div>
                </div>
            {{/if}}

            {{#if (eq currentStep 5)}}
                <!-- Step 5: Feats -->
                <div class="chargen-step feats-selection">
                    <h2>Choose Feats</h2>
                    <p class="feats-info">Available Feats: <strong>{{featsRemaining}}</strong></p>
                    <div class="feats-list">
                        {{#each feats}}
                        <div class="feat-card {{#if selected}}selected{{/if}}" data-feat="{{id}}">
                            <h4>{{name}}</h4>
                            <p>{{description}}</p>
                            {{#if prerequisite}}
                            <p class="prerequisite">Prerequisite: {{prerequisite}}</p>
                            {{/if}}
                        </div>
                        {{/each}}
                    </div>
                </div>
            {{/if}}

            {{#if (eq currentStep 6)}}
                <!-- Step 6: Review -->
                <div class="chargen-step review-screen">
                    <h2>Review Your Character</h2>
                    <div class="review-section">
                        <h3>Basic Information</h3>
                        <div class="review-item">
                            <span class="label">Name:</span>
                            <input type="text" name="name" value="{{name}}" placeholder="Enter character name" />
                        </div>
                        <div class="review-item">
                            <span class="label">Species:</span>
                            <span class="value">{{selectedSpecies.name}}</span>
                            <button type="button" class="btn-edit" data-step="1">Edit</button>
                        </div>
                        <div class="review-item">
                            <span class="label">Class:</span>
                            <span class="value">{{selectedClass.name}}</span>
                            <button type="button" class="btn-edit" data-step="2">Edit</button>
                        </div>
                    </div>

                    <div class="review-section">
                        <h3>Ability Scores</h3>
                        {{#each abilities}}
                        <div class="review-item">
                            <span class="label">{{name}}:</span>
                            <span class="value">{{total}} ({{modifier}})</span>
                        </div>
                        {{/each}}
                        <button type="button" class="btn-edit" data-step="3">Edit</button>
                    </div>

                    <div class="review-section">
                        <h3>Trained Skills</h3>
                        {{#each trainedSkills}}
                        <div class="review-item">
                            <span class="value">{{name}}</span>
                        </div>
                        {{/each}}
                        <button type="button" class="btn-edit" data-step="4">Edit</button>
                    </div>

                    <div class="review-section">
                        <h3>Feats</h3>
                        {{#each selectedFeats}}
                        <div class="review-item">
                            <span class="value">{{name}}</span>
                        </div>
                        {{/each}}
                        <button type="button" class="btn-edit" data-step="5">Edit</button>
                    </div>
                </div>
            {{/if}}
        </div>

        <!-- Navigation Footer -->
        <div class="chargen-footer">
            <button type="button" class="btn-secondary btn-back" {{#if (eq currentStep 1)}}disabled{{/if}}>
                <i class="fas fa-arrow-left"></i> Back
            </button>
            
            {{#if (eq currentStep totalSteps)}}
                <button type="submit" class="btn-primary btn-finish">
                    <i class="fas fa-check"></i> Create Character
                </button>
            {{else}}
                <button type="button" class="btn-primary btn-next">
                    Next <i class="fas fa-arrow-right"></i>
                </button>
            {{/if}}
        </div>
    </div>
</form>
"""
    
    with open(chargen_template_path, 'w', encoding='utf-8') as f:
        f.write(chargen_html)
    
    print(f"✓ Created missing chargen.html template")

def main():
    print("=" * 60)
    print("SWSE HOLO THEME APPLIER & TEMPLATE FIXER")
    print("Transforming SWSE sheets into Star Wars datapads")
    print("=" * 60)
    print()
    
    if not BASE_PATH.exists():
        print(f"✗ Base path not found: {BASE_PATH}")
        print("Please update BASE_PATH in the script")
        return
    
    print(f"Working directory: {BASE_PATH}")
    print()
    
    # Step 0: Create missing template
    print("Step 0: Creating missing chargen template...")
    create_missing_chargen_template()
    print()
    
    # Step 1: Create enhanced holo CSS
    print("Step 1: Creating enhanced holo theme...")
    create_enhanced_holo_css()
    print()
    
    # Step 2: Apply to existing CSS files
    print("Step 2: Applying holo theme to CSS files...")
    apply_holo_to_css()
    print()
    
    # Step 3: Update templates
    print("Step 3: Updating sheet templates...")
    apply_holo_to_templates()
    print()
    
    # Step 4: Update JS files
    print("Step 4: Updating JavaScript sheet classes...")
    update_js_classes()
    print()
    
    print("=" * 60)
    print("✓ HOLO THEME APPLICATION COMPLETE!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the changes in your git diff")
    print("2. Test each sheet type (Character, NPC, Droid, Vehicle, Item)")
    print("3. Test the character generator")
    print("4. Adjust holo-enhanced.css if needed for fine-tuning")
    print("5. Backup files have been created with .backup extension")
    print()
    print("May the Force be with you! ⚡")

if __name__ == "__main__":
    main()