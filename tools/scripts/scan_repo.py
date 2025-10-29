"""
SWSE Repo Scanner
Scans and maps your entire repository structure
"""

import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

REPO_PATH = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"

# Directories to skip
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.vscode', '.idea', 'dist', 'build'}

# File extensions to track
FILE_TYPES = {
    'JavaScript': ['.js', '.mjs'],
    'Templates': ['.hbs', '.html'],
    'Styles': ['.css', '.scss', '.sass'],
    'Data': ['.json', '.yaml', '.yml'],
    'Images': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
    'Docs': ['.md', '.txt'],
    'Python': ['.py'],
    'Config': ['.toml', '.ini', '.conf'],
}

class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

def get_file_type(filename):
    """Categorize file by extension"""
    ext = Path(filename).suffix.lower()
    for category, extensions in FILE_TYPES.items():
        if ext in extensions:
            return category
    return 'Other'

def get_size_str(size_bytes):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f}{unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f}TB"

def scan_directory(root_path, prefix="", stats=None, depth=0, max_depth=None):
    """Recursively scan directory and build tree structure"""
    if stats is None:
        stats = {
            'total_files': 0,
            'total_dirs': 0,
            'total_size': 0,
            'by_type': defaultdict(int),
            'by_type_size': defaultdict(int),
        }
    
    if max_depth and depth >= max_depth:
        return [], stats
    
    root = Path(root_path)
    lines = []
    
    try:
        items = sorted(root.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
    except PermissionError:
        return [f"{prefix}{Colors.RED}[Permission Denied]{Colors.END}"], stats
    
    dirs = [item for item in items if item.is_dir() and item.name not in SKIP_DIRS]
    files = [item for item in items if item.is_file()]
    
    # Process directories
    for i, item in enumerate(dirs):
        is_last_dir = (i == len(dirs) - 1) and len(files) == 0
        connector = "└── " if is_last_dir else "├── "
        
        lines.append(f"{prefix}{connector}{Colors.CYAN}{Colors.BOLD}{item.name}/{Colors.END}")
        
        stats['total_dirs'] += 1
        
        extension = "    " if is_last_dir else "│   "
        sub_lines, stats = scan_directory(
            item, 
            prefix + extension, 
            stats, 
            depth + 1, 
            max_depth
        )
        lines.extend(sub_lines)
    
    # Process files
    for i, item in enumerate(files):
        is_last = i == len(files) - 1
        connector = "└── " if is_last else "├── "
        
        try:
            size = item.stat().st_size
            size_str = get_size_str(size)
            file_type = get_file_type(item.name)
            
            # Color based on file type
            if file_type == 'JavaScript':
                color = Colors.YELLOW
            elif file_type == 'Templates':
                color = Colors.MAGENTA
            elif file_type == 'Styles':
                color = Colors.BLUE
            elif file_type == 'Data':
                color = Colors.GREEN
            else:
                color = Colors.END
            
            lines.append(f"{prefix}{connector}{color}{item.name}{Colors.END} {Colors.DIM}({size_str}){Colors.END}")
            
            stats['total_files'] += 1
            stats['total_size'] += size
            stats['by_type'][file_type] += 1
            stats['by_type_size'][file_type] += size
            
        except (PermissionError, OSError):
            lines.append(f"{prefix}{connector}{Colors.RED}{item.name} [Error]{Colors.END}")
    
    return lines, stats

def print_stats(stats):
    """Print repository statistics"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}Repository Statistics{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")
    
    print(f"{Colors.BOLD}Total Directories:{Colors.END} {stats['total_dirs']}")
    print(f"{Colors.BOLD}Total Files:{Colors.END} {stats['total_files']}")
    print(f"{Colors.BOLD}Total Size:{Colors.END} {get_size_str(stats['total_size'])}")
    
    print(f"\n{Colors.BOLD}Files by Type:{Colors.END}")
    sorted_types = sorted(stats['by_type'].items(), key=lambda x: x[1], reverse=True)
    for file_type, count in sorted_types:
        size = get_size_str(stats['by_type_size'][file_type])
        print(f"  {file_type:15} {count:4} files  ({size})")

def save_to_file(lines, stats, output_path):
    """Save tree structure to a text file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"Repository Structure Map\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"{'='*70}\n\n")
        
        # Write tree
        for line in lines:
            # Remove ANSI color codes for text file
            clean_line = line
            for code in [Colors.CYAN, Colors.GREEN, Colors.YELLOW, Colors.BLUE, 
                        Colors.MAGENTA, Colors.RED, Colors.END, Colors.BOLD, Colors.DIM]:
                clean_line = clean_line.replace(code, '')
            f.write(clean_line + '\n')
        
        # Write stats
        f.write(f"\n{'='*70}\n")
        f.write(f"Repository Statistics\n")
        f.write(f"{'='*70}\n\n")
        f.write(f"Total Directories: {stats['total_dirs']}\n")
        f.write(f"Total Files: {stats['total_files']}\n")
        f.write(f"Total Size: {get_size_str(stats['total_size'])}\n\n")
        f.write(f"Files by Type:\n")
        sorted_types = sorted(stats['by_type'].items(), key=lambda x: x[1], reverse=True)
        for file_type, count in sorted_types:
            size = get_size_str(stats['by_type_size'][file_type])
            f.write(f"  {file_type:15} {count:4} files  ({size})\n")

def main():
    print(f"\n{Colors.BOLD}{Colors.CYAN}SWSE Repository Scanner{Colors.END}\n")
    
    repo = Path(REPO_PATH)
    if not repo.exists():
        print(f"{Colors.RED}✗ Repo not found: {REPO_PATH}{Colors.END}")
        return False
    
    print(f"Scanning: {Colors.BOLD}{REPO_PATH}{Colors.END}\n")
    print(f"Skipping: {', '.join(SKIP_DIRS)}\n")
    
    # Scan the repository
    print(f"{Colors.BOLD}{Colors.CYAN}{repo.name}/{Colors.END}")
    lines, stats = scan_directory(repo)
    
    # Print the tree
    for line in lines:
        print(line)
    
    # Print statistics
    print_stats(stats)
    
    # Save to file
    output_file = repo / "REPO_STRUCTURE.txt"
    save_to_file([f"{repo.name}/"] + lines, stats, output_file)
    print(f"\n{Colors.GREEN}✓ Structure map saved to: {output_file}{Colors.END}\n")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Scan interrupted{Colors.END}")
    except Exception as e:
        print(f"\n{Colors.RED}Error: {e}{Colors.END}")
        import traceback
        traceback.print_exc()