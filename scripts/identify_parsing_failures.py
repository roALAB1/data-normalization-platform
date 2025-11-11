#!/usr/bin/env python3
"""
Identify ALL name parsing failures in the output CSV.
Check for:
- Job titles in First/Last Name
- Trailing hyphens
- Emojis/special characters
- Multiple words in Last Name (unparsed content)
- Empty First/Last Name
"""

import csv
import re
from collections import Counter
from pathlib import Path

# Common job title keywords
JOB_KEYWORDS = [
    'CEO', 'CFO', 'COO', 'CTO', 'President', 'VP', 'Vice President',
    'Director', 'Manager', 'Executive', 'Founder', 'Owner', 'Partner',
    'Coach', 'Consultant', 'Specialist', 'Analyst', 'Coordinator',
    'Administrator', 'Officer', 'Leader', 'Head', 'Chief', 'Principal',
    'Speaker', 'Author', 'Photographer', 'Designer', 'Developer',
    'Engineer', 'Architect', 'Strategist', 'Advisor', 'Expert'
]

def has_job_title(text):
    """Check if text contains job title keywords."""
    if not text:
        return False
    for keyword in JOB_KEYWORDS:
        if re.search(rf'\b{keyword}\b', text, re.IGNORECASE):
            return True
    return False

def has_emoji(text):
    """Check if text contains emojis or special symbols."""
    if not text:
        return False
    # Common emoji/symbol patterns
    emoji_pattern = r'[•✊?❤️⭐️🌟💪👍🎯🚀💡🔥⚡️✨🌈🎉🎊🏆🥇]'
    return bool(re.search(emoji_pattern, text))

def has_trailing_hyphen(text):
    """Check if text ends with hyphen."""
    if not text:
        return False
    return text.strip().endswith('-')

def has_multiple_words_in_last_name(last_name):
    """Check if last name has multiple words (likely unparsed content)."""
    if not last_name:
        return False
    # Hyphenated last names are OK (e.g., "Smith-Jones")
    # But "Speaker Business and Sales Coach" is NOT
    words = last_name.split()
    if len(words) > 2:  # More than 2 words is suspicious
        return True
    if len(words) == 2 and not '-' in last_name:  # 2 words without hyphen
        return True
    return False

def analyze_failures(output_csv):
    """
    Analyze output CSV for ALL parsing failures.
    """
    print("Loading output CSV...")
    output_rows = []
    with open(output_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            output_rows.append(row)
    
    print(f"Loaded {len(output_rows)} output rows")
    
    failures = []
    failure_types = Counter()
    
    print("Analyzing rows...")
    for i, row in enumerate(output_rows, start=2):  # Start at 2 (row 1 is header)
        first_name = row.get('First Name', '').strip()
        last_name = row.get('Last Name', '').strip()
        
        failure_reasons = []
        
        # Check for empty names
        if not first_name and not last_name:
            failure_reasons.append('empty_names')
        elif not first_name:
            failure_reasons.append('empty_first_name')
        elif not last_name:
            failure_reasons.append('empty_last_name')
        
        # Check for job titles
        if has_job_title(first_name):
            failure_reasons.append('job_title_in_first_name')
        if has_job_title(last_name):
            failure_reasons.append('job_title_in_last_name')
        
        # Check for emojis
        if has_emoji(first_name):
            failure_reasons.append('emoji_in_first_name')
        if has_emoji(last_name):
            failure_reasons.append('emoji_in_last_name')
        
        # Check for trailing hyphens
        if has_trailing_hyphen(first_name):
            failure_reasons.append('trailing_hyphen_in_first_name')
        if has_trailing_hyphen(last_name):
            failure_reasons.append('trailing_hyphen_in_last_name')
        
        # Check for multiple words in last name
        if has_multiple_words_in_last_name(last_name):
            failure_reasons.append('multiple_words_in_last_name')
        
        if failure_reasons:
            failures.append({
                'row': i,
                'first_name': first_name,
                'last_name': last_name,
                'reasons': failure_reasons
            })
            for reason in failure_reasons:
                failure_types[reason] += 1
    
    # Generate report
    print(f"\n{'='*80}")
    print(f"NAME PARSING FAILURE REPORT")
    print(f"{'='*80}")
    print(f"\nTotal rows analyzed: {len(output_rows)}")
    print(f"Failures found: {len(failures)}")
    print(f"Failure rate: {len(failures)/len(output_rows)*100:.2f}%")
    
    # Failure types breakdown
    print(f"\n{'='*80}")
    print(f"FAILURE TYPES BREAKDOWN")
    print(f"{'='*80}")
    for failure_type, count in failure_types.most_common():
        print(f"{failure_type:40s} - {count:4d} occurrences")
    
    # Sample failures (first 30)
    print(f"\n{'='*80}")
    print(f"SAMPLE FAILURES (First 30)")
    print(f"{'='*80}")
    for failure in failures[:30]:
        print(f"\nRow {failure['row']}:")
        print(f"  First Name: {failure['first_name']}")
        print(f"  Last Name: {failure['last_name']}")
        print(f"  Reasons: {', '.join(failure['reasons'])}")
    
    # Save full report to file
    report_file = Path(__file__).parent / 'parsing_failures_report.txt'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"NAME PARSING FAILURE REPORT\n")
        f.write(f"{'='*80}\n\n")
        f.write(f"Total rows analyzed: {len(output_rows)}\n")
        f.write(f"Failures found: {len(failures)}\n")
        f.write(f"Failure rate: {len(failures)/len(output_rows)*100:.2f}%\n\n")
        
        f.write(f"{'='*80}\n")
        f.write(f"FAILURE TYPES BREAKDOWN\n")
        f.write(f"{'='*80}\n")
        for failure_type, count in failure_types.most_common():
            f.write(f"{failure_type:40s} - {count:4d} occurrences\n")
        
        f.write(f"\n{'='*80}\n")
        f.write(f"ALL FAILURES (complete list)\n")
        f.write(f"{'='*80}\n")
        for failure in failures:
            f.write(f"\nRow {failure['row']}:\n")
            f.write(f"  First Name: {failure['first_name']}\n")
            f.write(f"  Last Name: {failure['last_name']}\n")
            f.write(f"  Reasons: {', '.join(failure['reasons'])}\n")
    
    print(f"\n{'='*80}")
    print(f"Full report saved to: {report_file}")
    print(f"{'='*80}")
    
    return failures

if __name__ == '__main__':
    output_csv = '/home/ubuntu/upload/normalized_highintentwomenfounderssalessp(4).csv'
    
    failures = analyze_failures(output_csv)
