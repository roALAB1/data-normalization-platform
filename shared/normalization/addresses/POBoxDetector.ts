/**
 * PO Box Detection and Normalization
 * 
 * Detects various PO Box formats and normalizes them to standard format:
 * - "P.O. Box 123" → "PO Box 123"
 * - "PO BOX 456" → "PO Box 456"
 * - "POBox 789" → "PO Box 789"
 * - "P O Box 101" → "PO Box 101"
 * - "P.O.Box 202" → "PO Box 202"
 */

export interface POBoxInfo {
  isPOBox: boolean;
  boxNumber: string;
  normalizedAddress: string;
}

export class POBoxDetector {
  /**
   * Detect if an address contains a PO Box
   * 
   * @param address - Address string to check
   * @returns POBoxInfo with detection results
   */
  static detect(address: string): POBoxInfo {
    if (!address) {
      return {
        isPOBox: false,
        boxNumber: '',
        normalizedAddress: address
      };
    }
    
    // Pattern matches various PO Box formats:
    // - P.O. Box 123
    // - PO Box 123
    // - POBox 123
    // - P O Box 123
    // - P.O.Box 123
    // - P.O. BOX 123
    // - etc.
    const poBoxPattern = /\b(p\.?\s*o\.?\s*box|pobox|p\s+o\s+box)\s+([a-z0-9\-]+)\b/gi;
    const match = poBoxPattern.exec(address);
    
    if (match) {
      const boxNumber = match[2].trim();
      return {
        isPOBox: true,
        boxNumber: boxNumber,
        normalizedAddress: address
      };
    }
    
    return {
      isPOBox: false,
      boxNumber: '',
      normalizedAddress: address
    };
  }
  
  /**
   * Normalize PO Box format to standard "PO Box XXX"
   * 
   * @param address - Address string that may contain PO Box
   * @returns Normalized address with standard PO Box format
   */
  static normalize(address: string): string {
    if (!address) return '';
    
    // Replace various PO Box formats with standard "PO Box"
    // Pattern matches: P.O. Box, PO Box, POBox, P O Box, P.O.Box, etc.
    const normalized = address.replace(
      /\b(p\.?\s*o\.?\s*box|pobox|p\s+o\s+box)\s+/gi,
      'PO Box '
    );
    
    return normalized;
  }
  
  /**
   * Extract PO Box number from address
   * 
   * @param address - Address string
   * @returns Box number if found, empty string otherwise
   */
  static extractBoxNumber(address: string): string {
    if (!address) return '';
    
    const poBoxPattern = /\b(p\.?\s*o\.?\s*box|pobox|p\s+o\s+box)\s+([a-z0-9\-]+)\b/i;
    const match = poBoxPattern.exec(address);
    
    return match ? match[2].trim() : '';
  }
  
  /**
   * Remove PO Box from address string
   * 
   * @param address - Address string
   * @returns Address with PO Box removed
   */
  static removePOBox(address: string): string {
    if (!address) return '';
    
    // Remove PO Box and its number
    const cleaned = address.replace(
      /\b(p\.?\s*o\.?\s*box|pobox|p\s+o\s+box)\s+[a-z0-9\-]+\b/gi,
      ''
    ).trim();
    
    return cleaned;
  }
}
