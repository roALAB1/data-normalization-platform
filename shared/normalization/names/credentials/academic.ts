/**
 * Academic Degrees and Educational Credentials
 * Includes undergraduate, graduate, and doctoral degrees
 */

export const ACADEMIC_CREDENTIALS = [
  // Bachelor's Degrees
  "BA", "B.A.", "BS", "B.S.", "BSc", "B.Sc.", "BEng", "B.E.", "BCom", "B.Com.", 
  "BMus", "B.Mus.", "BFA", "B.F.A.", "BBA", "B.B.A.", "BEd", "B.Ed.",
  
  // Master's Degrees
  "MA", "M.A.", "MS", "M.S.", "MSc", "M.Sc.", "MEng", "M.E.", "MCom", "M.Com.", 
  "MFA", "M.F.A.", "MBA", "M.B.A.", "MEd", "M.Ed.", "MPhil", "M.Phil.", 
  "LLM", "LL.M.", "MPH", "M.P.H.", "MPA", "M.P.A.", "MMus", "M.Mus.",
  "MSN", "MSW", "MSOM", "MBS", "MLS", "MLSE", "MRA", "MSA", "MSDT",
  
  // Doctoral Degrees
  "PhD", "Ph.D.", "EdD", "D.Ed.", "DrPH", "D.PH.", "PsyD", "Psy.D.", 
  "LLD", "LL.D.", "D.M.", "DBA", "DNP", "DPT", "DNAP",
  
  // Professional Degrees
  "JD", "J.D.", "MD", "M.D.", "DO", "D.O.", "DDS", "D.D.S.", "DMD", "D.M.D.", 
  "DVM", "D.V.M.", "DC", "D.C.", "DPM", "S.J.D.",
  
  // Other Academic
  "ABD", "BSN", "MSN", "DNP"
] as const;

export type AcademicCredential = typeof ACADEMIC_CREDENTIALS[number];
