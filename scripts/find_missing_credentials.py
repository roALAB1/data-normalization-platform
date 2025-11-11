#!/usr/bin/env python3
"""
Find Missing Credentials Script

Compares input Name column vs output Last Name column to find ALL credentials
that weren't stripped. This catches every missing credential across 8,000 rows.

Usage:
    python3 find_missing_credentials.py input.csv output.csv
"""

import csv
import re
import sys
from collections import Counter
from typing import Set, List, Tuple

def load_existing_credentials(credentials_file: str) -> Set[str]:
    """Load existing credentials from NameEnhanced.ts"""
    credentials = set()
    
    with open(credentials_file, 'r') as f:
        content = f.read()
        
    # Extract credentials from the array (lines with quoted strings)
    pattern = r'^\s*"([^"]+)",?\s*$'
    for line in content.split('\n'):
        match = re.match(pattern, line)
        if match:
            credential = match.group(1)
            # Normalize: remove periods for comparison
            normalized = credential.replace('.', '').upper()
            credentials.add(normalized)
    
    return credentials

def extract_potential_credentials(name: str, last_name: str) -> List[str]:
    """
    Extract potential credentials from name that ended up in last_name.
    
    Logic:
    1. If last_name is a known credential pattern (all caps, 2-10 chars), it's likely a credential
    2. Extract suffix after comma in original name
    3. Extract words after last name in original name
    """
    potential_creds = []
    
    # Pattern 1: Last name looks like a credential (all caps, 2-10 chars, no spaces)
    if last_name and re.match(r'^[A-Z]{2,10}$', last_name):
        potential_creds.append(last_name)
    
    # Pattern 2: Last name has hyphen (like PMI-ACP)
    if last_name and '-' in last_name and re.match(r'^[A-Z]+-[A-Z]+$', last_name):
        potential_creds.append(last_name)
    
    # Pattern 3: Extract everything after comma in original name
    if ',' in name:
        after_comma = name.split(',', 1)[1].strip()
        # Split by comma and extract each part
        parts = [p.strip() for p in after_comma.split(',')]
        for part in parts:
            # Remove periods and check if it looks like a credential
            normalized = part.replace('.', '').replace(' ', '')
            if re.match(r'^[A-Z]{2,10}$', normalized):
                potential_creds.append(normalized)
            elif '-' in normalized and re.match(r'^[A-Z]+-[A-Z]+$', normalized):
                potential_creds.append(normalized)
    
    # Pattern 4: Extract words at end of name (before comma if exists)
    name_part = name.split(',')[0].strip()
    words = name_part.split()
    if len(words) >= 2:
        last_word = words[-1]
        # Check if last word is all caps (likely credential)
        if re.match(r'^[A-Z]{2,10}$', last_word):
            potential_creds.append(last_word)
    
    return potential_creds

def analyze_csvs(input_csv: str, output_csv: str, existing_creds: Set[str]) -> Tuple[Counter, List[dict]]:
    """
    Analyze input and output CSVs to find missing credentials.
    
    Returns:
        (Counter of missing credentials, List of example rows)
    """
    missing_creds = Counter()
    examples = []
    
    # Read input CSV
    with open(input_csv, 'r', encoding='utf-8') as f:
        input_reader = csv.DictReader(f)
        input_rows = list(input_reader)
    
    # Read output CSV
    with open(output_csv, 'r', encoding='utf-8') as f:
        output_reader = csv.DictReader(f)
        output_rows = list(output_reader)
    
    # Compare row by row
    for i, (input_row, output_row) in enumerate(zip(input_rows, output_rows), start=2):
        input_name = input_row.get('Name', '')
        output_last = output_row.get('Last Name', '')
        
        if not input_name or not output_last:
            continue
        
        # Extract potential credentials
        potential = extract_potential_credentials(input_name, output_last)
        
        for cred in potential:
            normalized = cred.replace('.', '').upper()
            
            # Check if this credential is NOT in existing list
            if normalized not in existing_creds:
                missing_creds[normalized] += 1
                
                # Save example (first 5 occurrences)
                if missing_creds[normalized] <= 5:
                    examples.append({
                        'row': i,
                        'credential': normalized,
                        'input_name': input_name,
                        'output_last': output_last
                    })
    
    return missing_creds, examples

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 find_missing_credentials.py input.csv output.csv")
        sys.exit(1)
    
    input_csv = sys.argv[1]
    output_csv = sys.argv[2]
    credentials_file = '/home/ubuntu/name-normalization-demo/client/src/lib/NameEnhanced.ts'
    
    print("=" * 80)
    print("MISSING CREDENTIALS ANALYSIS")
    print("=" * 80)
    print()
    
    # Load existing credentials
    print("Loading existing credentials from NameEnhanced.ts...")
    existing_creds = load_existing_credentials(credentials_file)
    print(f"✅ Loaded {len(existing_creds)} existing credentials")
    print()
    
    # Analyze CSVs
    print(f"Analyzing {input_csv} vs {output_csv}...")
    missing_creds, examples = analyze_csvs(input_csv, output_csv, existing_creds)
    print(f"✅ Found {len(missing_creds)} unique missing credentials")
    print()
    
    # Report results
    if not missing_creds:
        print("🎉 NO MISSING CREDENTIALS FOUND!")
        print("All credentials are being stripped correctly.")
        return
    
    print("=" * 80)
    print("MISSING CREDENTIALS (sorted by frequency)")
    print("=" * 80)
    print()
    
    for cred, count in missing_creds.most_common():
        print(f"  {cred:<15} - {count:>4} occurrences")
    
    print()
    print("=" * 80)
    print("EXAMPLES (first occurrence of each credential)")
    print("=" * 80)
    print()
    
    seen = set()
    for ex in examples:
        if ex['credential'] not in seen:
            seen.add(ex['credential'])
            print(f"Row {ex['row']:>4}: {ex['credential']}")
            print(f"  Input:  {ex['input_name']}")
            print(f"  Output: Last Name = {ex['output_last']}")
            print()
    
    # Generate list for easy copy-paste
    print("=" * 80)
    print("CREDENTIALS TO ADD (copy-paste format)")
    print("=" * 80)
    print()
    
    for cred in sorted(missing_creds.keys()):
        print(f'  "{cred}",')
    
    print()
    print(f"Total: {len(missing_creds)} credentials to add")

if __name__ == '__main__':
    main()
