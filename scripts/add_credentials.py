#!/usr/bin/env python3
"""
Add Missing Credentials to NameEnhanced.ts

Reads the filtered credentials list and inserts them alphabetically
into the CREDENTIALS array in NameEnhanced.ts.
"""

import re
from typing import List, Tuple

def load_credentials_to_add(filepath: str) -> List[str]:
    """Load credentials from filtered list file"""
    creds = []
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            # Skip comments and empty lines
            if line and not line.startswith('#'):
                creds.append(line)
    return creds

def load_existing_credentials(filepath: str) -> Tuple[List[str], str]:
    """Load existing credentials and file content"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Extract existing credentials
    existing = []
    pattern = r'^\s*"([^"]+)",?\s*$'
    for line in content.split('\n'):
        match = re.match(pattern, line)
        if match:
            existing.append(match.group(1))
    
    return existing, content

def insert_credentials_alphabetically(existing: List[str], to_add: List[str]) -> List[str]:
    """Merge and sort credentials alphabetically"""
    # Normalize for comparison (case-insensitive, remove periods)
    def normalize(s):
        return s.replace('.', '').upper()
    
    # Filter out credentials that already exist
    existing_normalized = {normalize(c) for c in existing}
    new_creds = [c for c in to_add if normalize(c) not in existing_normalized]
    
    # Merge and sort
    all_creds = existing + new_creds
    all_creds.sort(key=lambda x: (normalize(x), x))
    
    return all_creds, new_creds

def update_credentials_file(filepath: str, new_credentials: List[str]):
    """Update NameEnhanced.ts with new credentials"""
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Find the CREDENTIALS array
    start_idx = None
    end_idx = None
    
    for i, line in enumerate(lines):
        if 'export const ALL_CREDENTIALS = [' in line:
            start_idx = i + 1
        elif start_idx is not None and '] as const;' in line:
            end_idx = i
            break
    
    if start_idx is None or end_idx is None:
        print("❌ Could not find CREDENTIALS array in file")
        return False
    
    # Generate new credentials lines
    new_lines = []
    for cred in new_credentials:
        new_lines.append(f'  "{cred}",\n')
    
    # Replace old credentials with new
    lines[start_idx:end_idx] = new_lines
    
    # Write back
    with open(filepath, 'w') as f:
        f.writelines(lines)
    
    return True

def main():
    filtered_file = '/home/ubuntu/name-normalization-demo/scripts/missing_credentials_filtered.txt'
    name_enhanced_file = '/home/ubuntu/name-normalization-demo/client/src/lib/NameEnhanced.ts'
    
    print("=" * 80)
    print("ADD MISSING CREDENTIALS TO NameEnhanced.ts")
    print("=" * 80)
    print()
    
    # Load credentials to add
    print("Loading filtered credentials list...")
    to_add = load_credentials_to_add(filtered_file)
    print(f"✅ Loaded {len(to_add)} credentials to add")
    print()
    
    # Load existing credentials
    print("Loading existing credentials from NameEnhanced.ts...")
    existing, content = load_existing_credentials(name_enhanced_file)
    print(f"✅ Found {len(existing)} existing credentials")
    print()
    
    # Merge and sort
    print("Merging and sorting credentials...")
    all_creds, new_creds = insert_credentials_alphabetically(existing, to_add)
    print(f"✅ Total credentials after merge: {len(all_creds)}")
    print(f"✅ New credentials added: {len(new_creds)}")
    print()
    
    if not new_creds:
        print("🎉 All credentials already exist! Nothing to add.")
        return
    
    # Show new credentials
    print("=" * 80)
    print(f"NEW CREDENTIALS TO ADD ({len(new_creds)})")
    print("=" * 80)
    print()
    for cred in new_creds[:20]:
        print(f"  {cred}")
    if len(new_creds) > 20:
        print(f"  ... and {len(new_creds) - 20} more")
    print()
    
    # Update file
    print("Updating NameEnhanced.ts...")
    if update_credentials_file(name_enhanced_file, all_creds):
        print("✅ Successfully updated NameEnhanced.ts")
        print()
        print(f"Credential count: {len(existing)} → {len(all_creds)} (+{len(new_creds)})")
    else:
        print("❌ Failed to update file")

if __name__ == '__main__':
    main()
