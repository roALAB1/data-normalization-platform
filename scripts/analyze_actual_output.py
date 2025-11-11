#!/usr/bin/env python3
"""
Analyze ACTUAL user output to find ALL credential stripping failures.
Compare input Name column vs output Last Name column for every row.
"""

import csv
import re
from collections import Counter
from pathlib import Path

def extract_potential_credentials(name_str, last_name_str):
    """
    Extract potential credentials that appear in last_name but shouldn't be there.
    Returns list of potential credentials.
    """
    # If last name is empty or same as full name, skip
    if not last_name_str or last_name_str == name_str:
        return []
    
    # Common patterns for credentials:
    # 1. All caps 2-5 letters (MD, PhD, MBA, LEED, etc.)
    # 2. Mixed case with periods (Ed.D., M.B.A., etc.)
    # 3. Hyphenated credentials (PMI-ACP, FNP-BC, etc.)
    
    potential_creds = []
    
    # Pattern 1: All caps 2-5 letters at end of last name
    if re.match(r'^[A-Z]{2,5}$', last_name_str):
        potential_creds.append(last_name_str)
    
    # Pattern 2: Mixed case with periods
    if '.' in last_name_str and len(last_name_str) <= 10:
        potential_creds.append(last_name_str)
    
    # Pattern 3: Hyphenated
    if '-' in last_name_str and len(last_name_str) <= 15:
        potential_creds.append(last_name_str)
    
    # Pattern 4: Ends with common credential suffixes
    credential_patterns = [
        r'.*\b(Jr|Sr|II|III|IV|V|PhD|MD|MBA|MS|MA|BS|BA|DDS|DVM|EdD|JD|LLM|CPA|PE|RN|LPN|LCSW|PMP|CSM|CISSP|CISM)\.?$',
        r'.*\b(Esq|Ret|Retired)\.?$'
    ]
    
    for pattern in credential_patterns:
        if re.match(pattern, last_name_str, re.IGNORECASE):
            # Extract the credential part
            match = re.search(r'\b([A-Za-z\-\.]+)\.?$', last_name_str)
            if match:
                potential_creds.append(match.group(1))
    
    return potential_creds

def analyze_output(input_csv, output_csv):
    """
    Compare input Name vs output Last Name for all rows.
    Generate comprehensive failure report.
    """
    print("Loading input CSV...")
    input_rows = []
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            input_rows.append(row)
    
    print(f"Loaded {len(input_rows)} input rows")
    
    print("Loading output CSV...")
    output_rows = []
    with open(output_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            output_rows.append(row)
    
    print(f"Loaded {len(output_rows)} output rows")
    
    # Compare rows
    failures = []
    all_potential_creds = []
    
    print("Analyzing rows...")
    for i, (input_row, output_row) in enumerate(zip(input_rows, output_rows), start=2):  # Start at 2 (row 1 is header)
        input_name = input_row.get('Name', '').strip()
        output_last_name = output_row.get('Last Name', '').strip()
        output_first_name = output_row.get('First Name', '').strip()
        
        # Skip if no data
        if not input_name or not output_last_name:
            continue
        
        # Check if last name looks like a credential
        potential_creds = extract_potential_credentials(input_name, output_last_name)
        
        if potential_creds:
            failures.append({
                'row': i,
                'input_name': input_name,
                'output_first_name': output_first_name,
                'output_last_name': output_last_name,
                'potential_credentials': potential_creds
            })
            all_potential_creds.extend(potential_creds)
    
    # Generate report
    print(f"\n{'='*80}")
    print(f"CREDENTIAL STRIPPING FAILURE REPORT")
    print(f"{'='*80}")
    print(f"\nTotal rows analyzed: {len(input_rows)}")
    print(f"Failures found: {len(failures)}")
    print(f"Failure rate: {len(failures)/len(input_rows)*100:.2f}%")
    
    # Top 50 most common missing credentials
    cred_counts = Counter(all_potential_creds)
    print(f"\n{'='*80}")
    print(f"TOP 50 MOST COMMON MISSING CREDENTIALS")
    print(f"{'='*80}")
    for cred, count in cred_counts.most_common(50):
        print(f"{cred:30s} - {count:4d} occurrences")
    
    # Sample failures (first 20)
    print(f"\n{'='*80}")
    print(f"SAMPLE FAILURES (First 20)")
    print(f"{'='*80}")
    for failure in failures[:20]:
        print(f"\nRow {failure['row']}:")
        print(f"  Input Name: {failure['input_name']}")
        print(f"  Output: {failure['output_first_name']} {failure['output_last_name']}")
        print(f"  Potential Credentials: {', '.join(failure['potential_credentials'])}")
    
    # Save full report to file
    report_file = Path(__file__).parent / 'output_analysis_report.txt'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"COMPREHENSIVE CREDENTIAL STRIPPING FAILURE REPORT\n")
        f.write(f"{'='*80}\n\n")
        f.write(f"Total rows analyzed: {len(input_rows)}\n")
        f.write(f"Failures found: {len(failures)}\n")
        f.write(f"Failure rate: {len(failures)/len(input_rows)*100:.2f}%\n\n")
        
        f.write(f"{'='*80}\n")
        f.write(f"ALL MISSING CREDENTIALS (sorted by frequency)\n")
        f.write(f"{'='*80}\n")
        for cred, count in cred_counts.most_common():
            f.write(f"{cred:30s} - {count:4d} occurrences\n")
        
        f.write(f"\n{'='*80}\n")
        f.write(f"ALL FAILURES (complete list)\n")
        f.write(f"{'='*80}\n")
        for failure in failures:
            f.write(f"\nRow {failure['row']}:\n")
            f.write(f"  Input Name: {failure['input_name']}\n")
            f.write(f"  Output: {failure['output_first_name']} {failure['output_last_name']}\n")
            f.write(f"  Potential Credentials: {', '.join(failure['potential_credentials'])}\n")
    
    print(f"\n{'='*80}")
    print(f"Full report saved to: {report_file}")
    print(f"{'='*80}")
    
    # Return unique credentials for further processing
    return sorted(set(all_potential_creds))

if __name__ == '__main__':
    input_csv = '/home/ubuntu/upload/highintentwomenfounderssalessp.csv'
    output_csv = '/home/ubuntu/upload/normalized_highintentwomenfounderssalessp(4).csv'
    
    missing_creds = analyze_output(input_csv, output_csv)
    
    print(f"\n{'='*80}")
    print(f"UNIQUE MISSING CREDENTIALS: {len(missing_creds)}")
    print(f"{'='*80}")
    print(', '.join(missing_creds))
