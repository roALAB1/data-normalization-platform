/**
 * Supply Chain, Logistics, Operations, and Quality Management Credentials
 * Source: APICS, ASQ, Six Sigma organizations
 */

export const SUPPLYCHAIN_CREDENTIALS = [
  // APICS/ASCM Supply Chain
  "CSCP", "CPIM", "CTSC", "CLTD", "SCPM",
  
  // Purchasing & Procurement
  "CPSM", "CPM", "CPCM",
  
  // Logistics
  "CSCMP",
  
  // Quality Management
  "Six Sigma", "Lean Six Sigma", "Black Belt", "Green Belt", "CSSBB", "CSSGB",
  "CMQ", "CQE", "CQA", "CQI", "CQIA", "CRE",
  
  // Manufacturing & Production
  "CMfgE", "CMfgT", "CMP", "CMRP",
  
  // Project Management
  "PMP", "CAPM", "PMI-SP", "PMI-RMP",
  
  // Lean & Continuous Improvement
  "Lean", "Kaizen", "5S",
  
  // Other Operations
  "CPIM", "CIRM", "CFPIM", "SCOR-P"
] as const;

export type SupplychainCredential = typeof SUPPLYCHAIN_CREDENTIALS[number];
