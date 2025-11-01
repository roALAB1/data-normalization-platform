/**
 * Healthcare Professional Credentials
 * Source: FDA Practitioner Acronym Table + Wikipedia
 * Includes medical, nursing, allied health, and therapy credentials
 */

export const HEALTHCARE_CREDENTIALS = [
  // Medical Doctors & Specialists
  "MD", "M.D.", "DO", "D.O.", "DPM", "DMD", "D.M.D.", "DDS", "D.D.S.", "OD", "OMD", "DOM",
  "DHANP", "DHt", "DNBHE", "ND", "NMD", "HMD", "MDH", "MMSc", "M.M.Sc.",
  
  // Nursing
  "RN", "RN-C", "RN-CS", "RN/NP", "NP", "APRN", "ARNP", "ARNP-FNP", "BSN", "MSN", "DNP", "FNP", "CRNP", "CRRN",
  "CNM", "CNS", "APN", "LPN", "LVN", "MNNP", "PMHNP-BC", "PMH-C", "FAANP",
  
  // Physician Assistants
  "PA", "PA-C",
  
  // Allied Health
  "PT", "PTA", "OT", "COTA", "OTD", "DPT", "SLP", "MS-SLP", "SLPD",
  "RRT", "RRPT", "EMT", "AEMT", "NRP", "CPO",
  
  // Therapy & Counseling
  "LCSW", "LMFT", "LMHC", "LPC", "LPCC", "LMSW", "LSW", "LISW", "LICSW", "MSW",
  "LCPC", "LPHA", "MFCC", "MT-BC",
  
  // Pharmacy
  "RPh", "PharmD",
  
  // Chiropractic
  "DC", "D.C.", "DACBN", "DACVD",
  
  // Acupuncture & Oriental Medicine
  "LAc", "L.Ac.", "LicAc", "DAc", "DAcRI", "DAcWV", "OMD", "MSOM", "DAOM", "NCCAOM", 
  "Dipl.Ac.", "Dipl.OM", "CA", "AK", "AP",
  
  // Veterinary
  "DVM", "D.V.M.", "VMD", "BVScAH", "CVA", "DACVAA", "DACVB", "DACVCP", "DACVD", "DACVECC",
  "DACVIM", "DACVM", "DACVNU", "DACVO", "DACVP", "DACVPM", "DACVR", "DACVSMR", "DACZM",
  "DABVLM", "DABVP", "DABVT", "DACAW", "DACLAM", "DACPV", "DACT", "DAVCS", "DAVDC",
  
  // Medical Specialties & Board Certifications
  "DABFM", "DABFP", "DABHP", "DABIM", "DABMP", "DABR", "DABSNM",
  "FAAEM", "FAAFP", "FAAN", "FAANS", "FAAOS", "FAAP", "FACC", "FACD", "FACE", "FACEP",
  "FACFAS", "FACFO", "FACHA", "FACHE", "FACOFP", "FACOG", "FACOP", "FACOOG", "FACP", "FACS", "FAEMS",
  "FAGD", "FAGO", "FAHA", "FAIHM", "FAOM", "FASHP", "FASPEN", "FAWM", "FIDSA", "FPMRS",
  "FMACP", "FCP",
  
  // Alternative & Complementary Medicine
  "DACM", "BCTMB", "FAIHM", "LMT", "LCMT", "AADP", "CFMP",
  
  // Nutrition & Dietetics
  "RD", "RDN", "LDN", "CDN", "LN", "LNC", "DACBN", "CHES", "CISSN", "CSSD",
  
  // Lactation & Maternal Health
  "IBCLC", "CLC", "Dip ABLM", "Dip. ABLM", "DipABLM",
  
  // Other Healthcare
  "BHMS", "BLS-I", "CCH", "CAAPM", "CRNP", "CSPOMM", "DAAPM", "DABFP", "DABIM",
  "AOBFP", "AOBSPOMM", "ASG", "HASG", "HSG", "HLL", "LL", "SG", "RS Hom",
  "NCCA", "MNNP", "MPH", "RDCS", "RDMS", "CVT", "RVT", "MScAT", "M.Sc.AT", "MSEAT", "CPC"
] as const;

export type HealthcareCredential = typeof HEALTHCARE_CREDENTIALS[number];
