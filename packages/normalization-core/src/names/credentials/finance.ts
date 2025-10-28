/**
 * Finance, Accounting, and Business Credentials
 * Source: Wikipedia List of Professional Designations
 */

export const FINANCE_CREDENTIALS = [
  // Accounting
  "CPA", "ACA", "ACCA", "FCCA", "LPA", "ABA",
  
  // Financial Planning & Analysis
  "CFA", "CFP", "CFP®", "CFC", "CDFA", "RFP", "SFP",
  
  // Investment & Securities
  "CIPM", "CMT", "CAIA", "CAMS", "FRM", "PRM", "CIRO",
  
  // Management Accounting
  "CMA", "CGMA", "ChMC",
  
  // Internal Audit & Control
  "CIA", "CICS", "CICP", "CRMA",
  
  // Government Finance
  "CGFM", "CGFO", "CMFO", "CPFA", "CPFO", "CCMT", "CDFM",
  
  // Treasury & Cash Management
  "CTP", "CTFA",
  
  // Fraud & Forensics
  "CFE", "CFCC",
  
  // Payroll
  "CPP", "FPC",
  
  // Accounts Payable
  "CAPS", "CAPP",
  
  // Risk Management
  "ARM", "CRISC", "CRME", "CERM",
  
  // Business Valuation
  "CBV", "CVA", "AVA",
  
  // Actuarial
  "ASA", "FSA", "CERA", "ACAS", "FCAS", "MAAA", "ACA", "FCA", "EAc",
  
  // Insurance
  "CLU", "CPCU", "FICF", "FIC", "AIC", "AINS", "ARM",
  
  // Real Estate & Appraisal
  "MAI", "SRA", "ABR", "ALC", "CCIM", "CRE", "CPM", "RPA",
  
  // Tax
  "EA", "RTRP",
  
  // Credit Union
  "CCUFC",
  
  // MBA & Executive
  "MBA", "M.B.A.", "MBA+", "MBAe", "EMBA", "DBA",
  
  // Other Finance
  "ACII", "FRM", "CAIA", "PACE", "ISSP", "CFPS", "CGSP", "CGA", "CGB", "CGC", "CGL",
  "CGP", "CGR", "CG", "CFCM", "CFM", "CFM-I", "CFM-II", "CFM-III", "CFO", "CFRE"
] as const;

export type FinanceCredential = typeof FINANCE_CREDENTIALS[number];
