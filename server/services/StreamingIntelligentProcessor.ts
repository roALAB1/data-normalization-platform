/**
 * Streaming Intelligent Batch Processor
 * Memory-efficient version that processes large CSV files without loading everything into memory
 * 
 * Key Improvements over IntelligentBatchProcessor:
 * - Uses StreamingCSVReader for input (processes chunks)
 * - Uses StreamingCSVWriter for output (writes incrementally to S3)
 * - Never loads entire file into memory
 * - Suitable for files with millions of rows
 */

import { StreamingCSVReader } from '../utils/StreamingCSVReader.js';
import { StreamingCSVWriter } from '../utils/StreamingCSVWriter.js';
import { NameEnhanced } from '../../shared/normalization/names/index.js';
import { NameSplitter } from '../../shared/normalization/names/NameSplitter.js';
import { PhoneEnhanced } from '../../shared/normalization/phones/index.js';
import { EmailEnhanced } from '../../shared/normalization/emails/index.js';
import { AddressFormatter } from '../../shared/normalization/addresses/index.js';

/**
 * Column type detection result
 */
interface ColumnDetection {
  columnName: string;
  detectedType: 'name' | 'first_name' | 'last_name' | 'email' | 'phone' | 'address' | 'company' | 'unknown';
  confidence: number;
}

/**
 * Processing progress callback
 */
export interface StreamingProcessingProgress {
  processedRows: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  percentage: number;
  bytesWritten: number;
}

/**
 * Streaming Intelligent Processor
 * Processes large CSV files with automatic column type detection
 */
export class StreamingIntelligentProcessor {
  /**
   * Detect column type based on sample values
   */
  private detectColumnType(columnName: string, sampleValues: string[]): ColumnDetection {
    const cleanSamples = sampleValues.filter(v => v && v.trim()).slice(0, 10);
    
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

      // Name detection
      if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(value.trim()) && !/\d/.test(value)) {
        nameCount++;
      }

      // Address detection
      if (/\d+/.test(value) && /(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court)/i.test(value)) {
        addressCount++;
      }
    }

    const total = cleanSamples.length;
    const emailConf = emailCount / total;
    const phoneConf = phoneCount / total;
    const nameConf = nameCount / total;
    const addressConf = addressCount / total;

    // Check column name for hints
    const lowerName = columnName.toLowerCase();
    if (lowerName.includes('email') || lowerName.includes('mail')) {
      return { columnName, detectedType: 'email', confidence: Math.max(emailConf, 0.7) };
    }
    if (lowerName.includes('phone') || lowerName.includes('tel') || lowerName.includes('mobile')) {
      return { columnName, detectedType: 'phone', confidence: Math.max(phoneConf, 0.7) };
    }
    if (lowerName.includes('company') || lowerName.includes('organization') || 
        lowerName.includes('business') || lowerName.includes('corp')) {
      return { columnName, detectedType: 'company', confidence: 0.95 };
    }
    if (lowerName.includes('first') && lowerName.includes('name')) {
      return { columnName, detectedType: 'first_name', confidence: 0.9 };
    }
    if (lowerName.includes('last') && lowerName.includes('name')) {
      return { columnName, detectedType: 'last_name', confidence: 0.9 };
    }
    if (lowerName.includes('name')) {
      return { columnName, detectedType: 'name', confidence: Math.max(nameConf, 0.7) };
    }
    if (lowerName.includes('address') || lowerName.includes('street')) {
      return { columnName, detectedType: 'address', confidence: Math.max(addressConf, 0.7) };
    }

    // Determine type based on highest confidence
    const confidences = [
      { type: 'email' as const, conf: emailConf },
      { type: 'phone' as const, conf: phoneConf },
      { type: 'name' as const, conf: nameConf },
      { type: 'address' as const, conf: addressConf },
    ];

    confidences.sort((a, b) => b.conf - a.conf);

    if (confidences[0].conf >= 0.5) {
      return { columnName, detectedType: confidences[0].type, confidence: confidences[0].conf };
    }

    return { columnName, detectedType: 'unknown', confidence: 0 };
  }

  /**
   * Normalize a single value based on detected type
   */
  private normalizeValue(value: string, type: string): { normalized: string; isValid: boolean } {
    if (!value || !value.trim()) {
      return { normalized: '', isValid: false };
    }

    try {
      switch (type) {
        case 'email': {
          const email = new EmailEnhanced(value);
          return {
            normalized: email.normalized,
            isValid: email.isValid,
          };
        }

        case 'phone': {
          const phone = new PhoneEnhanced(value, { defaultCountry: 'US' });
          return {
            normalized: phone.format('international'),
            isValid: phone.result.isValid,
          };
        }

        case 'address': {
          const address = AddressFormatter.format(value);
          return {
            normalized: address,
            isValid: true,
          };
        }
        
        case 'company': {
          const normalized = value
            .trim()
            .split(/\s+/)
            .map(word => {
              if (word.length <= 4 && word === word.toUpperCase()) {
                return word;
              }
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
          return {
            normalized,
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
   * Process CSV file with streaming (memory-efficient for large files)
   * 
   * @param inputSource - S3 URL or local file path
   * @param outputBucket - S3 bucket for output
   * @param outputKey - S3 key for output file
   * @param onProgress - Progress callback
   */
  public async processStreaming(
    inputSource: string,
    outputKey: string,
    onProgress?: (progress: StreamingProcessingProgress) => void
  ): Promise<{
    stats: { totalRows: number; validRows: number; invalidRows: number; bytesWritten: number };
    detections: ColumnDetection[];
  }> {
    let headers: string[] = [];
    let detections: ColumnDetection[] = [];
    let processedRows = 0;
    let validRows = 0;
    let invalidRows = 0;
    let totalRows = 0;
    let outputHeaders: string[] = [];
    let writer: StreamingCSVWriter | null = null;
    const nameSplitter = new NameSplitter();

    try {
      // Phase 1: Read first chunk to detect column types
      console.log('[StreamingProcessor] Phase 1: Detecting column types...');
      const reader = new StreamingCSVReader({
        chunkSize: 100, // Small chunk for type detection
      });

      let sampleData: Record<string, string[]> = {};
      let sampleCount = 0;

      await reader.stream(inputSource, async (chunk, chunkIndex) => {
        if (chunkIndex === 0) {
          // First chunk - collect samples
          headers = Object.keys(chunk[0]);
          sampleData = Object.fromEntries(headers.map(h => [h, []]));

          chunk.slice(0, 20).forEach(row => {
            headers.forEach(header => {
              sampleData[header].push(row[header] || '');
            });
          });

          sampleCount = Math.min(chunk.length, 20);

          // Detect column types
          detections = headers.map(header => 
            this.detectColumnType(header, sampleData[header])
          );

          console.log('[StreamingProcessor] Detected column types:', detections);

          // Determine output headers
          const hasFullName = detections.some(d => d.detectedType === 'name');
          outputHeaders = headers.filter((_, index) => {
            const detection = detections[index];
            // Exclude full name column (will be split into First Name + Last Name)
            return detection.detectedType !== 'name';
          });

          // Add First Name and Last Name if we have a full name column
          if (hasFullName) {
            outputHeaders.push('First Name', 'Last Name');
          }

          // Initialize writer
          writer = new StreamingCSVWriter({
            key: outputKey,
            headers: outputHeaders,
            bufferSizeRows: 10000,
          });

          await writer.initialize();
          console.log('[StreamingProcessor] Writer initialized');
        }
        // Only process first chunk for type detection
      });

      // Phase 2: Process entire file in chunks
      console.log('[StreamingProcessor] Phase 2: Processing all rows...');
      const processingReader = new StreamingCSVReader({
        chunkSize: 10000, // Large chunks for processing
      });

      // Count total rows first (for progress calculation)
      await processingReader.stream(inputSource, async (chunk) => {
        totalRows += chunk.length;
        // Just count, don't process yet - return void
      });

      console.log(`[StreamingProcessor] Total rows: ${totalRows}`);

      // Now process all chunks
      await processingReader.stream(inputSource, async (chunk, chunkIndex) => {
        const normalizedChunk: any[] = [];

        for (const row of chunk) {
          const normalizedRow: Record<string, string> = {};
          let rowValid = true;
          let splitName: { firstName: string; lastName: string } | null = null;

          headers.forEach((header, index) => {
            const value = row[header] || '';
            const detection = detections[index];

            if (detection.detectedType === 'name') {
              // Full name - split into first and last
              const split = nameSplitter.split(value);
              splitName = { firstName: split.firstName, lastName: split.lastName };
            } else if (detection.detectedType === 'first_name') {
              const name = new NameEnhanced(value);
              if (!splitName) splitName = { firstName: '', lastName: '' };
              splitName.firstName = name.format('f');
            } else if (detection.detectedType === 'last_name') {
              const name = new NameEnhanced(value);
              if (!splitName) splitName = { firstName: '', lastName: '' };
              splitName.lastName = name.format('l');
            } else if (detection.detectedType !== 'unknown' && detection.confidence >= 0.5) {
              const { normalized, isValid } = this.normalizeValue(value, detection.detectedType);
              normalizedRow[header] = normalized;
              if (!isValid) rowValid = false;
            } else {
              normalizedRow[header] = value;
            }
          });

          // Add First Name and Last Name if we processed names
          if (splitName) {
            normalizedRow['First Name'] = splitName.firstName;
            normalizedRow['Last Name'] = splitName.lastName;
          }

          normalizedChunk.push(normalizedRow);
          processedRows++;
          if (rowValid) validRows++;
          else invalidRows++;
        }

        // Write chunk to S3
        if (writer) {
          await writer.writeChunk(normalizedChunk);
        }

        // Report progress
        if (onProgress) {
          onProgress({
            processedRows,
            totalRows,
            validRows,
            invalidRows,
            percentage: Math.round((processedRows / totalRows) * 100),
            bytesWritten: writer?.getStats().bytesWritten || 0,
          });
        }

        console.log(`[StreamingProcessor] Processed chunk ${chunkIndex + 1}: ${processedRows}/${totalRows} rows (${Math.round((processedRows / totalRows) * 100)}%)`);
      });

      // Close writer
      if (writer) {
        await writer.close();
        console.log('[StreamingProcessor] Writer closed');
      }

      return {
        stats: {
          totalRows: processedRows,
          validRows,
          invalidRows,
          bytesWritten: writer?.getStats().bytesWritten || 0,
        },
        detections,
      };
    } catch (error) {
      // Abort upload on error
      if (writer) {
        await writer.abort();
      }
      throw error;
    }
  }
}
