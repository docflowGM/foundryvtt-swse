# swse_find_and_fix_init.py
from pathlib import Path
import os

class InitFileFinder:
    def __init__(self, system_path=r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"):
        self.system_path = Path(system_path)
        
    def find_init_file(self):
        """Find the main initialization file"""
        print("🔍 Searching for initialization file...")
        
        possible_names = [
            "index.js",
            "swse.js",
            "main.js",
            "init.js",
            "system.js"
        ]
        
        # Search in common locations
        search_dirs = [
            self.system_path,
            self.system_path / "scripts",
            self.system_path / "module",
            self.system_path / "src"
        ]
        
        for directory in search_dirs:
            if directory.exists():
                for filename in possible_names:
                    filepath = directory / filename
                    if filepath.exists():
                        print(f"✓ Found: {filepath}")
                        return filepath
        
        # Search recursively for .js files
        print("Searching all .js files...")
        for js_file in self.system_path.glob("**/*.js"):
            if js_file.name in possible_names:
                print(f"✓ Found: {js_file}")
                return js_file
                
        print("❌ Init file not found")
        return None
        
    def check_system_json(self):
        """Check system.json for esmodules entry point"""
        print("\n🔍 Checking system.json...")
        
        system_json = self.system_path / "system.json"
        if system_json.exists():
            import json
            with open(system_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'esmodules' in data:
                print(f"Entry point(s): {data['esmodules']}")
                for module in data['esmodules']:
                    module_path = self.system_path / module
                    if module_path.exists():
                        print(f"✓ Found entry point: {module_path}")
                        return module_path
            
            if 'scripts' in data:
                print(f"Scripts: {data['scripts']}")
                
        return None
        
    def update_init_file(self, init_file):
        """Update the init file to register helpers"""
        print(f"\n🔧 Updating {init_file.name}...")
        
        content = init_file.read_text(encoding='utf-8')
        
        # Check if already has the import
        if 'handlebars-helpers' in content:
            print("✓ Helpers already imported")
            return
            
        # Add import at the top
        import_line = "import { registerHandlebarsHelpers } from './helpers/handlebars-helpers.js';\n"
        
        # Find where to add the registration
        updated = False
        
        # Look for Hooks.once('init')
        if 'Hooks.once("init"' in content or "Hooks.once('init'" in content:
            # Add import at top
            content = import_line + content
            
            # Add registration call inside init hook
            init_patterns = [
                ('Hooks.once("init"', '{\n    registerHandlebarsHelpers();\n'),
                ("Hooks.once('init'", "{\n    registerHandlebarsHelpers();\n")
            ]
            
            for pattern, replacement in init_patterns:
                if pattern in content and 'registerHandlebarsHelpers' not in content:
                    # Find the opening brace after the pattern
                    idx = content.find(pattern)
                    if idx != -1:
                        # Find the next {
                        brace_idx = content.find('{', idx)
                        if brace_idx != -1:
                            content = content[:brace_idx+1] + '\n    registerHandlebarsHelpers();' + content[brace_idx+1:]
                            updated = True
                            break
        
        # If no init hook found, add one
        if not updated:
            hook_code = '''
// Register Handlebars helpers
Hooks.once('init', function() {
    registerHandlebarsHelpers();
});
'''
            content = import_line + content + hook_code
            updated = True
        
        # Write back
        init_file.write_text(content, encoding='utf-8')
        print("✓ Init file updated with Handlebars helpers")
        
    def list_all_js_files(self):
        """List all JavaScript files for debugging"""
        print("\n📂 All JavaScript files in system:")
        js_files = sorted(self.system_path.glob("**/*.js"))
        for js_file in js_files[:20]:  # Show first 20
            rel_path = js_file.relative_to(self.system_path)
            print(f"  - {rel_path}")
        
        if len(js_files) > 20:
            print(f"  ... and {len(js_files) - 20} more files")
            
    def run(self):
        """Run the finder and fixer"""
        print("=" * 60)
        print("FINDING AND FIXING INIT FILE")
        print("=" * 60)
        
        # First check system.json
        init_file = self.check_system_json()
        
        # If not found, search manually
        if not init_file:
            init_file = self.find_init_file()
        
        if init_file:
            self.update_init_file(init_file)
            print(f"\n✅ Successfully updated {init_file}")
        else:
            print("\n⚠ Could not locate init file automatically")
            self.list_all_js_files()
            print("\nPlease provide the path to your main init file")
            
        print("\n" + "=" * 60)

if __name__ == "__main__":
    finder = InitFileFinder()
    finder.run()