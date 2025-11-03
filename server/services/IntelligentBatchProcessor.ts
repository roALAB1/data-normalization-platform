import Papa from 'papaparse';
import { NameEnhanced } from '../../shared/normalization/names/NameEnhanced';
import { NameSplitter } from '../../shared/normalization/names/NameSplitter';
import { PhoneEnhanced } from '../../shared/normalization/phones/PhoneEnhanced';
import { EmailEnhanced } from '../../shared/normalization/emails/EmailEnhanced';
import { AddressFormatter } from '../../shared/normalization/addresses/AddressFormatter';

/**
 * Column type detection result
 */
interface ColumnDetection {
  columnName: string;
  detectedType: 'name' | 'first_name' | 'last_name' | 'email' | 'phone' | 'address' | 'unknown';
  confidence: number;
}

/**
 * Processing progress callback
 */
export interface ProcessingProgress {
  processedRows: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  percentage: number;
}

/**
 * Intelligent Batch Processor
 * Automatically detects column types and normalizes multi-column CSV files
 */
export class IntelligentBatchProcessor {
  /**
   * Detect column type based on sample values
   */
  private detectColumnType(columnName: string, sampleValues: string[]): ColumnDetection {
    const cleanSamples = sampleValues.filter(v => v && v.trim()).slice(0, 10); // Use first 10 non-empty values
    
    if (cleanSamples.length === 0) {
      return { columnName, detectedType: 'unknown', confidence: 0 };
    }

    let emailCount = 0;
    let phoneCount = 0;
    let nameCount = 0;
    let addressCount = 0;

    for (const value of cleanSamples) {
      // Email detection
      if (value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        emailCount++;
      }

      // Phone detection
      if (/[\d\(\)\-\+\s]{7,}/.test(value) && /\d{3,}/.test(value)) {
        phoneCount++;
      }

      // Name detection (has spaces, starts with capital, no numbers)
      if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(value.trim()) && !/\d/.test(value)) {
        nameCount++;
      }

      // Address detection (has numbers and street indicators)
      if (/\d+/.test(value) && /(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court)/i.test(value)) {
        addressCount++;
      }
    }

    const total = cleanSamples.length;
    const emailConf = emailCount / total;
    const phoneConf = phoneCount / total;
    const nameConf = nameCount / total;
    const addressConf = addressCount / total;

    // Determine type based on highest confidence
    const confidences = [
      { type: 'email' as const, conf: emailConf },
      { type: 'phone' as const, conf: phoneConf },
      { type: 'name' as const, conf: nameConf },
      { type: 'address' as const, conf: addressConf },
    ];

    confidences.sort((a, b) => b.conf - a.conf);

    // Also check column name for hints
    const lowerName = columnName.toLowerCase();
    if (lowerName.includes('email') || lowerName.includes('mail')) {
      return { columnName, detectedType: 'email', confidence: Math.max(emailConf, 0.7) };
    }
    if (lowerName.includes('phone') || lowerName.includes('tel') || lowerName.includes('mobile')) {
      return { columnName, detectedType: 'phone', confidence: Math.max(phoneConf, 0.7) };
    }
    // Check for first name / last name columns
    if (lowerName.match(/^(first|given)[_\s-]?name$/i) || lowerName === 'fname') {
      return { columnName, detectedType: 'first_name', confidence: 0.95 };
    }
    if (lowerName.match(/^(last|sur|family)[_\s-]?name$/i) || lowerName === 'lname') {
      return { columnName, detectedType: 'last_name', confidence: 0.95 };
    }
    if (lowerName.includes('name') || lowerName.includes('contact')) {
      return { columnName, detectedType: 'name', confidence: Math.max(nameConf, 0.7) };
    }
    if (lowerName.includes('address') || lowerName.includes('street') || lowerName.includes('location')) {
      return { columnName, detectedType: 'address', confidence: Math.max(addressConf, 0.7) };
    }

    // Return highest confidence type
    if (confidences[0].conf >= 0.5) {
      return { columnName, detectedType: confidences[0].type, confidence: confidences[0].conf };
    }

    return { columnName, detectedType: 'unknown', confidence: 0 };
  }

  /**
   * Normalize a single value based on type
   */
  private normalizeValue(value: string, type: string): { normalized: string; isValid: boolean } {
    if (!value || !value.trim()) {
      return { normalized: '', isValid: false };
    }

    try {
      switch (type) {
        case 'name': {
          const name = new NameEnhanced(value);
          return {
            normalized: name.format('f l'),
            isValid: name.isValid(),
          };
        }

        case 'email': {
          const email = new EmailEnhanced(value);
          return {
            normalized: email.normalized,
            isValid: email.isValid(),
          };
        }

        case 'phone': {
          const phone = new PhoneEnhanced(value, 'US');
          return {
            normalized: phone.format('international'),
            isValid: phone.isValid(),
          };
        }

        case 'address': {
          const address = AddressFormatter.format(value);
          return {
            normalized: address,
            isValid: true,
          };
        }

        default:
          return { normalized: value, isValid: false };
      }
    } catch (error) {
      return { normalized: value, isValid: false };
    }
  }

  /**
   * Process CSV file with intelligent multi-column normalization
   */
  public async process(
    csvContent: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<{
    csv: string;
    stats: { totalRows: number; validRows: number; invalidRows: number };
    detections: ColumnDetection[];
  }> {
    return new Promise((resolve, reject) => {
      let headers: string[] = [];
      let sampleData: Record<string, string[]> = {};
      let detections: ColumnDetection[] = [];
      let processedRows = 0;
      let validRows = 0;
      let invalidRows = 0;
      let totalRows = 0;
      const results: any[] = [];

      // First pass: collect samples for type detection
      let isFirstPass = true;
      let sampleCount = 0;

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        step: (row: any) => {
          if (isFirstPass) {
            if (sampleCount === 0) {
              headers = Object.keys(row.data);
              sampleData = Object.fromEntries(headers.map(h => [h, []]));
            }

            if (sampleCount < 20) {
              headers.forEach(header => {
                sampleData[header].push(row.data[header] || '');
              });
              sampleCount++;
            } else {
              isFirstPass = false;
              
              // Detect column types
              detections = headers.map(header => 
                this.detectColumnType(header, sampleData[header])
              );

              console.log('[IntelligentBatchProcessor] Detected column types:', detections);
            }
          }

          totalRows++;
        },
        complete: () => {
          // Check if we need to handle name splitting
          const hasFullName = detections.some(d => d.detectedType === 'name');
          const hasFirstName = detections.some(d => d.detectedType === 'first_name');
          const hasLastName = detections.some(d => d.detectedType === 'last_name');
          const nameSplitter = new NameSplitter();

          // Second pass: normalize data
          Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            step: (row: any) => {
              const normalizedRow: Record<string, string> = {};
              let rowValid = true;
              let splitName: { firstName: string; lastName: string } | null = null;

              headers.forEach((header, index) => {
                const value = row.data[header] || '';
                const detection = detections[index];
                
                // Debug: Log name column detection
                if (header.toLowerCase() === 'name') {
                  console.log(`[DEBUG] Name column detected as: ${detection.detectedType}, confidence: ${detection.confidence}`);
                }

                if (detection.detectedType === 'name') {
                  // Full name - split into first and last
                  const split = nameSplitter.split(value);
                  splitName = { firstName: split.firstName, lastName: split.lastName };
                  // v3.10.0: Don't add "Name" column to output (only output First Name + Last Name)
                } else if (detection.detectedType === 'location') {
                  // v3.12.0: Split location into Personal City and Personal State
                  const parts = value.split(',').map((p: string) => p.trim());
                  
                  if (parts.length >= 2) {
                    // First part is city
                    const city = parts[0];
                    normalizedRow['Personal City'] = city.split(' ').map((w: string) => 
                      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                    ).join(' ');
                    
                    // Second part is state
                    const state = parts[1];
                    if (state.length === 2) {
                      normalizedRow['Personal State'] = state.toUpperCase();
                    } else {
                      const stateAbbreviations: Record<string, string> = {
                        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
                        'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
                        'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
                        'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
                        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
                        'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
                        'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
                        'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
                        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
                        'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
                      };
                      const stateLower = state.toLowerCase();
                      normalizedRow['Personal State'] = stateAbbreviations[stateLower] || state.toUpperCase();
                    }
                  }
                  // Don't add original location column to output
                } else if (detection.detectedType === 'first_name') {
                  // First name - normalize and store
                  const name = new NameEnhanced(value);
                  if (!splitName) splitName = { firstName: '', lastName: '' };
                  splitName.firstName = name.format('f');
                } else if (detection.detectedType === 'last_name') {
                  // Last name - normalize and store
                  const name = new NameEnhanced(value);
                  if (!splitName) splitName = { firstName: '', lastName: '' };
                  splitName.lastName = name.format('l');
                } else if (detection.detectedType !== 'unknown' && detection.confidence >= 0.5) {
                  const { normalized, isValid } = this.normalizeValue(value, detection.detectedType);
                  normalizedRow[header] = normalized;
                  if (!isValid) rowValid = false;
                } else {
                  // Keep original value for unknown types
                  normalizedRow[header] = value;
                }
              });

              // Add First Name and Last Name columns if we processed names
              if (splitName) {
                normalizedRow['First Name'] = splitName.firstName;
                normalizedRow['Last Name'] = splitName.lastName;
              }

              results.push(normalizedRow);
              processedRows++;
              if (rowValid) validRows++;
              else invalidRows++;

              // Report progress every 100 rows
              if (onProgress && processedRows % 100 === 0) {
                onProgress({
                  processedRows,
                  totalRows,
                  validRows,
                  invalidRows,
                  percentage: Math.round((processedRows / totalRows) * 100),
                });
              }
            },
            complete: () => {
              // Final progress update
              if (onProgress) {
                onProgress({
                  processedRows,
                  totalRows,
                  validRows,
                  invalidRows,
                  percentage: 100,
                });
              }

              // Generate output CSV
              const outputCsv = Papa.unparse(results);

              resolve({
                csv: outputCsv,
                stats: {
                  totalRows: processedRows,
                  validRows,
                  invalidRows,
                },
                detections,
              });
            },
            error: (error: any) => {
              reject(error);
            },
          });
        },
        error: (error: any) => {
          reject(error);
        },
      });
    });
  }
}
