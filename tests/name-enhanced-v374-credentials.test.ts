import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('NameEnhanced - v3.7.4 New Credentials', () => {
  it('should strip ARNP and FMACP', () => {
    const name = new NameEnhanced('Kathleen Pizzolatto ARNP FMACP');
    expect(name.full).toBe('Kathleen Pizzolatto');
  });

  it('should strip ARNP-FNP', () => {
    const name = new NameEnhanced('Sharon Lemoine ARNP-FNP');
    expect(name.full).toBe('Sharon Lemoine');
  });

  it('should strip CCM and CLC', () => {
    const name = new NameEnhanced('Brooke Davis CCM CLC');
    expect(name.full).toBe('Brooke Davis');
  });

  it('should strip AADP and CMCS', () => {
    const name = new NameEnhanced('Clare Riordan AADP CMCS');
    expect(name.full).toBe('Clare Riordan');
  });

  it('should strip CSSD and CISSN', () => {
    const name = new NameEnhanced('Dina Griffin CSSD CISSN');
    expect(name.full).toBe('Dina Griffin');
  });

  it('should strip FACOOG', () => {
    const name = new NameEnhanced('Jennifer Hayes FACOOG');
    expect(name.full).toBe('Jennifer Hayes');
  });

  it('should strip FCMC and FCP', () => {
    const name = new NameEnhanced('Jessica Whelan FCMC FCP');
    expect(name.full).toBe('Jessica Whelan');
  });

  it('should strip CFMP', () => {
    const name = new NameEnhanced('Sujata Patel CFMP');
    expect(name.full).toBe('Sujata Patel');
  });

  it('should strip NBC-HWC, CHES, and CSMC', () => {
    const name = new NameEnhanced('Angela White NBC-HWC CHES CSMC');
    expect(name.full).toBe('Angela White');
  });

  it('should strip all 16 new credentials in one name', () => {
    const name = new NameEnhanced('John Doe ARNP ARNP-FNP FMACP CCM CLC CFMP CHES CISSN CMCS CSSD FACOOG FCMC FCP AADP NBC-HWC CSMC');
    expect(name.full).toBe('John Doe');
  });
});
