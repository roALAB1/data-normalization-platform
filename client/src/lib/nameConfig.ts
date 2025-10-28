export const nameConfig = {
  CREDENTIALS: [
    "BA", "B.A.", "BSc", "B.Sc.", "BEng", "B.E.", "BCom", "B.Com.", "BMus", "B.Mus.", "BFA", "B.F.A.", "BBA", "B.B.A.", "BEd", "B.Ed.", "BS", "B.S.",
    "MA", "M.A.", "MSc", "M.Sc.", "MEng", "M.E.", "MCom", "M.Com.", "MFA", "M.F.A.", "MBA", "M.B.A.", "MEd", "M.Ed.", "MS", "M.S.", "MPhil", "M.Phil.", "LLM", "LL.M.", "MPH", "M.P.H.", "MPA", "M.P.A.", "MMus", "M.Mus.",
    "PhD", "Ph.D.", "EdD", "D.Ed.", "MD", "M.D.", "DO", "D.O.", "DDS", "D.D.S.", "DMD", "D.M.D.", "JD", "J.D.", "DrPH", "D.PH.", "DVM", "D.V.M.", "PsyD", "Psy.D.", "DC", "D.C.", "LLD", "LL.D.", "QC",
    "CPA", "CFA", "CFP", "CFP®", "PE", "PMP", "LEED AP", "ACC", "CEM", "CMM", "CGMP", "HCIB", "CHRM", "CPP", "CAIA", "PACE", "OBE", "CB", "KBE", "MBE", "CBE", "CMG", "RN", "RGN", "FRCP", "FRCS", "Engr", "Esq",
    "CHIA", "CSP", "CSM", "FCCA", "CMgr", "MCMI", "GAICD", "MIRHR", "CHRL", "APMA", "C.M.C.", "PPM", "CSPO", "ICD.D", "CFRE", "CPFA", "CCEP", "DBA", "SMIEEE", "ACA", "SPHR", "FCIM", "M.IDST", "MAHRI", "FACHE", "MBACP", "CPTD", "LCPC", "LPHA", "CADC", "CODP", "P.E", "CPT", "FRSA", "FCA", "ANIPR", "PME", "ASEAN", "CISA", "CISM", "FRM", "ACII",
    "DACM", "BCTMB", "FAIHM", "LAc", "L.Ac.", "OMD", "MSOM", "DAOM", "NCCAOM", "Dipl.Ac.", "Dipl.OM", "LMHC", "LCSW", "LMFT", "LPC", "LPCC", "LMSW", "LSW", "LISW", "LICSW", "ABD"
  ],
  
  TITLES: [
    "Dr", "Dr.", "Mr", "Mr.", "Mrs", "Mrs.", "Miss", "Ms", "Ms.", 
    "Prof", "Prof.", "Mx", "Mx.", "Revd", "Rev", "Rev.", "Sir", "Lady"
  ],
  
  JOB_WORDS: [
    "Chief", "Officer", "Director", "Manager", "President", "Chair", "Board",
    "Founder", "CEO", "CFO", "COO", "CTO", "VP", "Specialist", "Consultant",
    "Partner", "Operations", "Division", "Department", "Head", "Lead", "Supervisor",
    "Administrator", "Executive"
  ],
  
  LAST_NAME_PREFIXES: [
    "van der", "van den", "van de", "van 't", "van",
    "de la", "de", "des", "du", "d'",
    "von und zu", "von", "zu",
    "del", "degli", "della", "di",
    "bin", "bint", "binti", "binte", "abu", "al", "el", "ibn",
    "ter", "der", "ten",
    "aït", "at", "ath",
    "'s", "'t",
    "bath", "bat", "ben",
    "mac", "mc", "ni", "nic", "o'", "ó", "ua", "uí",
    "a",
    "ab", "ap", "ferch", "verch", "erch",
    "af", "av", "alam", "olam", "bar", "chaudhary", "ch", "da", "das", "dele",
    "dos", "e", "fitz", "i", "ka", "kil", "gil", "mal", "mul", "la", "le",
    "m'", "m'c", "m.c", "mck", "mhic", "mic", "mala", "na", "ngā", "nin",
    "öz", "pour", "te", "tre", "war", "vander", "bet"
  ],
  
  MISENCODED_MAP: {
    "\u201a": "'",  // ‚
    "\u201c": '"',  // "
    "\u201d": '"',  // "
    "\u2018": "'",  // '
    "\u2019": "'",  // '
    "\u2013": "-",  // –
    "\u2014": "-",  // —
    "\u2026": "...", // …
    "\u00b4": "'",  // ´
    "`": "'",
    "\u00a8": "",   // ¨
    "\u00e6": "ae", // æ
    "\u0153": "oe", // œ
    "\u00df": "ss", // ß
    "\u00f8": "o",  // ø
    "\u00f0": "d",  // ð
    "\u00fe": "th", // þ
    "?": ""
  } as Record<string, string>,
  
  COMMON_LATIN_FIXES: {
    "Francois": { fixed: "François", reason: "accent_restoration" },
    "Andre": { fixed: "André", reason: "accent_restoration" },
    "Rene": { fixed: "René", reason: "accent_restoration" },
    "Jose": { fixed: "José", reason: "accent_restoration" },
    "Garcia": { fixed: "García", reason: "accent_restoration" },
    "Munoz": { fixed: "Muñoz", reason: "accent_restoration" },
    "Bjorn": { fixed: "Björn", reason: "accent_restoration" },
    "Soren": { fixed: "Søren", reason: "accent_restoration" },
    "Noel": { fixed: "Noël", reason: "accent_restoration" },
    "Schafer": { fixed: "Schäfer", reason: "accent_restoration" },
    "Muller": { fixed: "Müller", reason: "accent_restoration" },
    "Fran?ois": { fixed: "François", reason: "latin1_fix" },
    "Mu?oz": { fixed: "Muñoz", reason: "latin1_fix" },
    "Gar?ia": { fixed: "García", reason: "latin1_fix" },
    "Jos?": { fixed: "José", reason: "latin1_fix" },
    "Bj?rn": { fixed: "Björn", reason: "latin1_fix" },
    "S?ren": { fixed: "Søren", reason: "latin1_fix" },
    "No?l": { fixed: "Noël", reason: "latin1_fix" },
    "Ni?o": { fixed: "Niño", reason: "latin1_fix" },
    "Pe?a": { fixed: "Peña", reason: "latin1_fix" },
    "Mu?ller": { fixed: "Müller", reason: "latin1_fix" },
    "Sch?fer": { fixed: "Schäfer", reason: "latin1_fix" }
  } as Record<string, { fixed: string; reason: string }>
};
