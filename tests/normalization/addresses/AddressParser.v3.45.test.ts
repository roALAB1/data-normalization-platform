import { describe, it, expect } from 'vitest';
import {
  normalizeAddress,
  normalizeAddressString,
  formatAddress,
  AddressParseResult,
  NormalizedAddress
} from '../../../shared/normalization/addresses/AddressParser';
import { ConfidenceScorer } from '../../../shared/normalization/addresses/ConfidenceScorer';
import { ZIPValidationService } from '../../../shared/normalization/addresses/ZIPValidationService';
import { POBoxDetector } from '../../../shared/normalization/addresses/POBoxDetector';

describe('v3.45.0 - PO Box Detection & Normalization', () => {
  describe('POBoxDetector', () => {
    it('should detect "P.O. Box" format', () => {
      const result = POBoxDetector.detect('P.O. Box 123 Denver CO 80202');
      expect(result.isPOBox).toBe(true);
      expect(result.boxNumber).toBe('123');
    });

    it('should detect "PO Box" format', () => {
      const result = POBoxDetector.detect('PO Box 456 Boston MA 02101');
      expect(result.isPOBox).toBe(true);
      expect(result.boxNumber).toBe('456');
    });

    it('should normalize to standard "PO Box" format', () => {
      const normalized = POBoxDetector.normalize('P.O. Box 123 Denver CO 80202');
      expect(normalized).toContain('PO Box 123');
    });

    it('should extract box number correctly', () => {
      const boxNumber = POBoxDetector.extractBoxNumber('PO Box 456 Boston MA 02101');
      expect(boxNumber).toBe('456');
    });

    it('should return empty string for non-PO Box addresses', () => {
      const result = POBoxDetector.detect('123 Main St Denver CO 80202');
      expect(result.isPOBox).toBe(false);
      expect(result.boxNumber).toBe('');
    });
  });

  describe('PO Box in normalizeAddress', () => {
    it('should normalize PO Box address and extract city/state/ZIP', () => {
      const result = normalizeAddress('P.O. Box 123 Denver CO 80202');
      expect(result.isPOBox).toBe(true);
      expect(result.boxNumber).toBe('123');
      expect(result.street).toBe('PO Box 123');
      expect(result.city).toBe('Denver');
      expect(result.state).toBe('CO');
      expect(result.zip).toBe('80202');
    });

  it('should handle PO Box with secondary address (should be stripped)', () => {
    const result = normalizeAddress('P.O. Box 456 Apt 2 Cambridge MA 02138');
    expect(result.isPOBox).toBe(true);
    expect(result.boxNumber).toBe('456');
    expect(result.street).toBe('PO Box 456');
    expect(result.city).toBe('Cambridge');
    expect(result.state).toBe('MA');
    expect(result.zip).toBe('02138');
  });

    it('should handle regular address (not PO Box)', () => {
      const result = normalizeAddress('123 Main St Denver CO 80202');
      expect(result.isPOBox).toBe(false);
      expect(result.boxNumber).toBe('');
      expect(result.street).toBe('123 Main St');
      expect(result.city).toBe('Denver');
      expect(result.state).toBe('CO');
      expect(result.zip).toBe('80202');
    });
  });
});

describe('v3.45.0 - ZIP Code Validation', () => {
  describe('ZIPValidationService', () => {
    it('should lookup valid ZIP code', () => {
      const result = ZIPValidationService.lookup('62701');
      expect(result).not.toBeNull();
      expect(result?.city).toBeTruthy();
      expect(result?.state).toBeTruthy();
    });

    it('should validate ZIP matches state', () => {
      const isValid = ZIPValidationService.validateZIPState('62701', 'IL');
      expect(isValid).toBe(true);
    });

    it('should detect ZIP/state mismatch', () => {
      const isValid = ZIPValidationService.validateZIPState('62701', 'CA');
      expect(isValid).toBe(false);
    });

    it('should extract state from ZIP code', () => {
      const state = ZIPValidationService.getStateFromZIP('62701');
      expect(state).toBe('IL');
    });

    it('should check if ZIP is valid', () => {
      const isValid = ZIPValidationService.isValidZIP('62701');
      expect(isValid).toBe(true);
    });
  });
});

describe('v3.45.0 - Confidence Scoring', () => {
  describe('ConfidenceScorer - Street Scoring', () => {
    it('should score complete street address high', () => {
      const score = ConfidenceScorer.scoreStreet('123 Main St');
      expect(score).toBeGreaterThan(0.8);
    });

    it('should score street without number lower', () => {
      const score = ConfidenceScorer.scoreStreet('Main St');
      expect(score).toBeLessThan(0.8);
    });

    it('should score empty street as 0', () => {
      const score = ConfidenceScorer.scoreStreet('');
      expect(score).toBe(0);
    });
  });

  describe('ConfidenceScorer - City Scoring', () => {
    it('should score valid city high', () => {
      const score = ConfidenceScorer.scoreCity('Denver');
      expect(score).toBeGreaterThan(0.7);
    });

    it('should score empty city as 0', () => {
      const score = ConfidenceScorer.scoreCity('');
      expect(score).toBe(0);
    });
  });

  describe('ConfidenceScorer - State Scoring', () => {
    it('should score valid state high', () => {
      const score = ConfidenceScorer.scoreState('IL');
      expect(score).toBeGreaterThanOrEqual(0.5);
    });

    it('should score empty state as 0', () => {
      const score = ConfidenceScorer.scoreState('');
      expect(score).toBe(0);
    });
  });

  describe('ConfidenceScorer - ZIP Scoring', () => {
    it('should score valid ZIP high', () => {
      const score = ConfidenceScorer.scoreZIP('62701');
      expect(score).toBeGreaterThanOrEqual(0.4);
    });

    it('should score empty ZIP as 0', () => {
      const score = ConfidenceScorer.scoreZIP('');
      expect(score).toBe(0);
    });
  });

  describe('ConfidenceScorer - Overall Scoring', () => {
    it('should score complete valid address high', () => {
      const score = ConfidenceScorer.scoreOverall(
        '123 Main St',
        'Boulder',
        'CO',
        '80302'
      );
      expect(score).toBeGreaterThan(0.85);
    });

    it('should score incomplete address lower', () => {
      const score = ConfidenceScorer.scoreOverall(
        'Main St',
        'Boulder',
        'CO',
        ''
      );
      expect(score).toBeLessThan(0.7);
    });

    it('should return score between 0 and 1', () => {
      const score = ConfidenceScorer.scoreOverall(
        '123 Main St',
        'Boulder',
        'CO',
        '80302'
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('ConfidenceScorer - Flags Generation', () => {
    it('should flag missing components', () => {
      const flags = ConfidenceScorer.generateFlags('', 'Boulder', 'CO', '80302');
      expect(flags).toContain('missing_street');
    });

    it('should flag ZIP/state mismatch', () => {
      const flags = ConfidenceScorer.generateFlags(
        '123 Main St',
        'Boulder',
        'CA',
        '80302'
      );
      expect(flags).toContain('zip_state_mismatch');
    });

    it('should not flag valid complete address', () => {
      const flags = ConfidenceScorer.generateFlags(
        '123 Main St',
        'Boulder',
        'CO',
        '80302'
      );
      expect(flags.length).toBe(0);
    });
  });

  describe('ConfidenceScorer - Confidence Level', () => {
    it('should return "high" for score >= 0.85', () => {
      const level = ConfidenceScorer.getConfidenceLevel(0.90);
      expect(level).toBe('high');
    });

    it('should return "medium" for score 0.70-0.84', () => {
      const level = ConfidenceScorer.getConfidenceLevel(0.75);
      expect(level).toBe('medium');
    });

    it('should return "low" for score < 0.70', () => {
      const level = ConfidenceScorer.getConfidenceLevel(0.50);
      expect(level).toBe('low');
    });
  });

  describe('ConfidenceScorer - Complete Address Scoring', () => {
    it('should score complete address with all metrics', () => {
      const result = ConfidenceScorer.scoreAddress(
        '123 Main St',
        'Boulder',
        'CO',
        '80302'
      );
      
      expect(result.scores.street).toBeGreaterThan(0);
      expect(result.scores.city).toBeGreaterThan(0);
      expect(result.scores.state).toBeGreaterThan(0);
      expect(result.scores.zip).toBeGreaterThan(0);
      expect(result.scores.overall).toBeGreaterThan(0.8);
      expect(result.confidence_level).toBe('high');
      expect(result.flags.length).toBe(0);
    });

    it('should score incomplete address with low confidence', () => {
      const result = ConfidenceScorer.scoreAddress(
        '',
        'Boulder',
        '',
        ''
      );
      
      expect(result.scores.street).toBe(0);
      expect(result.scores.state).toBe(0);
      expect(result.scores.zip).toBe(0);
      expect(result.scores.overall).toBeLessThan(0.3);
      expect(result.confidence_level).toBe('low');
      expect(result.flags.length).toBeGreaterThan(2);
    });
  });
});

describe('v3.45.0 - Integration Tests', () => {
  it('should normalize PO Box address with confidence scoring', () => {
    const result = normalizeAddress('P.O. Box 123 Boulder CO 80302');
    
    expect(result.isPOBox).toBe(true);
    expect(result.boxNumber).toBe('123');
    expect(result.street).toBe('PO Box 123');
    expect(result.city).toBe('Boulder');
    expect(result.state).toBe('CO');
    expect(result.zip).toBe('80302');
  });

  it('should format address correctly', () => {
    const address: NormalizedAddress = {
      street: '123 Main St',
      city: 'Boulder',
      state: 'CO',
      zip: '80302'
    };
    
    const formatted = formatAddress(address);
    expect(formatted).toBe('123 Main St, Boulder, CO, 80302');
  });

  it('should handle PO Box address with confidence scoring', () => {
    const result = normalizeAddress('PO Box 456 Boston MA 02101');
    
    expect(result.isPOBox).toBe(true);
    expect(result.boxNumber).toBe('456');
    expect(result.street).toBe('PO Box 456');
    expect(result.city).toBe('Boston');
    expect(result.state).toBe('MA');
    expect(result.zip).toBe('02101');
  });

  it('should maintain backward compatibility with normalizeAddressString', () => {
    const result = normalizeAddressString('123 Main St Boulder CO 80302');
    expect(result).toBe('123 Main St');
  });
});
