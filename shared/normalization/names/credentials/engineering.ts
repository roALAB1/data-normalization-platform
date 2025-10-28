/**
 * Engineering and Architecture Credentials
 * Source: Wikipedia List of Professional Designations
 */

export const ENGINEERING_CREDENTIALS = [
  // Professional Engineer
  "PE", "P.E", "EI", "EIT", "SE", "SECB",
  
  // Architecture
  "RA", "AIA", "FAIA", "NCARB", "ALA", "FALA",
  
  // Landscape Architecture
  "PLA", "ASLA", "FASLA",
  
  // Interior Design
  "RID", "NCIDQ", "ASID", "FASID",
  
  // Planning
  "PP", "AICP", "FAICP",
  
  // LEED & Sustainability
  "LEED AP", "LEED GA", "ISSP", "ISSP-SA", "ISSP-CSP",
  
  // Construction
  "CDT", "CCCA", "CCS", "CCPR", "CSI",
  
  // ASCE Memberships
  "A.M.ASCE", "M.ASCE", "F.ASCE", "S.M.ASCE",
  
  // Structural
  "SE", "SECB",
  
  // Geotechnical & Surveying
  "PLS", "RLS", "PG", "CPG", "GIT", "GISP", "LSIT", "LSI",
  
  // Fire Protection
  "EFO", "CFI", "CFII", "CFPS",
  
  // Environmental
  "QSD", "QSP", "CPESC", "CESSWI",
  
  // Facilities & Property
  "CFM", "CFM-I", "CFM-II", "CFM-III", "FMP", "SFP", "CPE",
  
  // Safety
  "CSP", "ASP", "CHST", "OHST", "STS",
  
  // Industrial Hygiene
  "CIH", "CIEH",
  
  // Energy
  "CEM", "CEA", "BPI",
  
  // NICET
  "NICET I/II/III/IV",
  
  // Other Engineering
  "Engr", "ELS", "ENP", "EVP", "AEEVT", "AEM"
] as const;

export type EngineeringCredential = typeof ENGINEERING_CREDENTIALS[number];
