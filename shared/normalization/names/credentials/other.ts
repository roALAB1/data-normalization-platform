/**
 * Other Professional Credentials
 * Includes HR, legal, communications, hospitality, and miscellaneous credentials
 */

export const OTHER_CREDENTIALS = [
  // Human Resources
  "SPHR", "PHR", "SHRM-CP", "SHRM-SCP", "CHRM", "CHRL", "MIRHR", "GPHR",
  
  // Legal
  "JD", "J.D.", "LLM", "LL.M.", "LLD", "LL.D.", "Esq", "J.P.",
  
  // Communications & PR
  "APR", "ABC", "PRSA", "IABC",
  
  // Association Management
  "CAE", "ACA", "BCA",
  
  // Fundraising & Nonprofit
  "CFRE", "CNP", "ACNP",
  
  // Hospitality & Tourism
  "CHA", "CHBA", "CHDM", "CHE", "CHTP",
  
  // Real Estate (additional)
  "GRI", "CRS", "SRES", "CIPS", "RES", "RCI", "RBA", "RAI",
  
  // Emergency Management & Public Safety
  "CEM", "AEM", "IAEM", "CFO", "EFO", "CHPP",
  
  // Genealogy
  "CG", "AG",
  
  // Geospatial
  "GISP", "GIT",
  
  // Honors & Awards
  "OBE", "CB", "KBE", "MBE", "CBE", "CMG", "KCHS/DCHS", "KHS/DHS", "QC",
  
  // Military
  "USAF", "USN", "USA", "USMC", "USCG",
  
  // Workplace Learning
  "CPTD", "APTD", "CPT", "CPLP",
  
  // Fitness & Wellness
  "ABS", "CSC", "CSCP", "CSCS", "CTSC", "CMCS", "MSCP", "PATP", "FCMC", "NASM", "RYT",
  
  // Management & Leadership
  "CMgr", "MCMI", "GAICD", "ChMC", "CMP", "SCMP", "PMP",
  
  // Contract Management
  "CPCM", "CFCM", "CCCM",
  
  // Economics
  "AE", "CBE",
  
  // Credentials & Certification Professionals
  "PACE", "ICD.D", "IACCP",
  
  // Miscellaneous Professional
  "APMA", "C.M.C.", "PPM", "CSPO", "CPFA", "CCEP", "FCIM", "M.IDST", "MAHRI", 
  "FACHE", "MBACP", "CODP", "FRSA", "FCA", "ANIPR", "PME", "ASEAN",
  
  // Testing & Certification
  "NBCT", "ABCTE",
  
  // Broadcast & Media
  "CRO", "CTO", "CBNT", "CBT", "CEA", "CBTE", "CBNE",
  
  // Fine Arts
  "AAGO", "CAGO", "FAGO",
  
  // Veterinary Technician
  "CVT", "RVT", "LVT", "CVPM", "CVRS",
  
  // Other
  "N/A", "UMC", "WAS", "VTS", "SPC", "SMT", "SMA", "SIM", "SI", "SCCP",
  "HCCP", "HCIB", "CCXP", "CPACC", "CXA", "CYDS", "WP-C", "TP-C", "TR-C",
  "FP-C", "CP-C", "CCP-C", "CFRN", "CTRN", "TCRN"
] as const;

export type OtherCredential = typeof OTHER_CREDENTIALS[number];
