import os
import shutil
from pathlib import Path

# Your repo path
repo_path = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

# Define the old and new directory paths
old_dir = repo_path / "templates" / "actor"
new_dir = repo_path / "templates" / "actors"

print(f"Checking paths...")
print(f"Old directory: {old_dir}")
print(f"New directory: {new_dir}")

# Check if the old directory exists
if old_dir.exists():
    print(f"\n✓ Found directory: {old_dir}")
    
    # Check if new directory already exists
    if new_dir.exists():
        print(f"⚠ Warning: {new_dir} already exists!")
        print("Please manually resolve this conflict.")
    else:
        # Rename the directory
        print(f"\nRenaming {old_dir.name} to {new_dir.name}...")
        old_dir.rename(new_dir)
        print(f"✓ Successfully renamed to: {new_dir}")
        
        # List the files in the new directory
        print(f"\nFiles in {new_dir}:")
        for file in new_dir.iterdir():
            print(f"  - {file.name}")
else:
    print(f"\n✗ Error: Directory not found: {old_dir}")
    print("Please check that your repo path is correct.")
    
    # Check if it's already renamed
    if new_dir.exists():
        print(f"\n✓ Good news: {new_dir} already exists!")
        print("The directory may have already been renamed.")

print("\nDone!")