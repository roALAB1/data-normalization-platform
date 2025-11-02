/**
 * Healthcare Professional Credentials
 * Source: FDA Practitioner Acronym Table + Wikipedia
 * Includes medical, nursing, allied health, and therapy credentials
 */

export const HEALTHCARE_CREDENTIALS = [
  // Medical Doctors & Specialists
  "MD", "M.D.", "DO", "D.O.", "DPM", "DMD", "D.M.D.", "DDS", "D.D.S.", "OD", "OMD", "DOM",
  "DHANP", "DHt", "DNBHE", "ND", "NMD", "HMD", "MDH",
  
  // Nursing
  "RN", "RN-C", "RN-CS", "RN/NP", "NP", "APRN", "BSN", "MSN", "DNP", "FNP", "CRNP", "CRRN",
  "CNM", "APN", "LPN", "LVN", "MNNP",
  
  // Physician Assistants
  "PA", "PA-C",
  
  // Allied Health
  "PT", "PTA", "OT", "COTA", "OTD", "DPT", "SLP", "MS-SLP", "SLPD",
  "RRT", "RRPT", "EMT", "AEMT", "NRP",
  
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
  "FACFAS", "FACFO", "FACHA", "FACHE", "FACOFP", "FACOG", "FACP", "FACS", "FAEMS",
  "FAGD", "FAGO", "FAHA", "FAIHM", "FAOM", "FASHP", "FASPEN", "FAWM", "FIDSA",
  
  // Alternative & Complementary Medicine
  "DACM", "BCTMB", "FAIHM", "LMT", "LCMT",
  
  // Nutrition & Dietetics
  "RD", "LN", "LNC", "DACBN",
  
  // Other Healthcare
  "BHMS", "BLS-I", "CCH", "CAAPM", "CRNP", "CSPOMM", "DAAPM", "DABFP", "DABIM",
  "AOBFP", "AOBSPOMM", "ASG", "HASG", "HSG", "HLL", "LL", "SG", "RS Hom",
  "NCCA", "MNNP", "MPH", "RDCS", "RDMS", "CVT", "RVT"
] as const;

export type HealthcareCredential = typeof HEALTHCARE_CREDENTIALS[number];
