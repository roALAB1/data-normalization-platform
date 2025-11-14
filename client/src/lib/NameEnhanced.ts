/**
 * NameEnhanced - Advanced Name Parsing and Normalization
 * 
 * Enterprise-grade name parser with hardcoded credentials for worker compatibility.
 * Based on research from theiconic/name-parser (production-proven library).
 * 
 * Pattern: Define data where it's consumed (no external module imports).
 * 
 * Version: 3.7.0 - Credentials Fixed (633 credentials hardcoded)
 */

export const NAME_ENHANCED_VERSION = '3.7.0-credentials-fixed';
export const CREDENTIALS_COUNT = 996;

// ============================================================================
// HARDCODED CONSTANTS (No module imports - worker-compatible)
// ============================================================================

/**
 * All Professional Credentials (630 total)
 * Extracted from shared/normalization/names/credentials/*.ts
 * Hardcoded here to avoid Vite worker bundling issues
 * Exported for use in normalizeValue.ts
 */
export const ALL_CREDENTIALS = [
  "A+",
  "A-GLCC",
  "AADP",
  "AAGO",
  "AAI",
  "ABA",
  "ABC",
  "ABCTE",
  "ABD",
  "ABR",
  "ABS",
  "ACA",
  "ACAC",
  "ACAS",
  "ACC",
  "ACCA",
  "ACE",
  "ACG",
  "ACII",
  "ACMA",
  "ACNP",
  "ACS",
  "AE",
  "AEEVT",
  "AEM",
  "AEMT",
  "AFA",
  "AFC",
  "AFN-C",
  "AG",
  "AGI",
  "AHF",
  "AIA",
  "AIC",
  "AICI",
  "AICP",
  "AINS",
  "AITI",
  "AK",
  "ALA",
  "ALB",
  "ALC",
  "ALM",
  "A.M.ASCE",
  "AMIEEE",
  "AMP",
  "ANIPR",
  "ANLP",
  "AOBFP",
  "AOBSPOMM",
  "AP",
  "APC",
  "APM",
  "APMA",
  "APN",
  "APR",
  "APRN",
  "APTD",
  "ARA",
  "ARM",
  "ARNP",
  "ARNP-FNP",
  "AS",
  "ASA",
  "ASEAN",
  "ASG",
  "ASID",
  "ASLA",
  "ASP",
  "ASQBB",
  "AT",
  "AVA",
  "AWS",
  "Azure",
  "B.A.",
  "BA",
  "BAS",
  "B.B.A.",
  "BBA",
  "BCA",
  "BCBA",
  "BCBA-D",
  "BCC",
  "BCMAS",
  "B.Com.",
  "BCom",
  "BCPA",
  "BCS",
  "BCTMB",
  "B.E.",
  "B.Ed.",
  "BEd",
  "BEng",
  "B.F.A.",
  "BFA",
  "BHMS",
  "Black Belt",
  "BLS-I",
  "B.Mus.",
  "BMus",
  "BN",
  "BPI",
  "BPM",
  "M.S.",
  "MS",
  "M.Sc.",
  "MSc",
  "MSGT",
  "Msgt",
  "BSM",
  "BSN",
  "BVScAH",
  "CA",
  "CAAPM",
  "CAE",
  "CAGO",
  "CAIA",
  "CAMS",
  "CAP",
  "CAPM",
  "CAPP",
  "CAPS",
  "CART",
  "CAS",
  "CASP+",
  "CATD",
  "CB",
  "CBC",
  "CBE",
  "CBIA",
  "CBNE",
  "CBNT",
  "CBRTE",
  "CBT",
  "CBTE",
  "CBV",
  "CC",
  "CCAr",
  "CCC",
  "CCC-SLP",
  "CCCA",
  "CCDA",
  "CCDE",
  "CCDM",
  "CCDP",
  "CCE",
  "CCENT",
  "CCEP",
  "CCH",
  "CCIE",
  "CCIM",
  "CCM",
  "CCMP",
  "CCMT",
  "CCNA",
  "CCNL",
  "CCNP",
  "CCP",
  "CCP-C",
  "CCPR",
  "CCS",
  "CCSK",
  "CCSP",
  "CCUFC",
  "CCXP",
  "CDC",
  "CDE",
  "CDFA",
  "CDFM",
  "CDMP",
  "CDMS",
  "CDN",
  "CDP",
  "CDT",
  "CDTLF",
  "CDVC",
  "CDVS",
  "CDWF",
  "CEA",
  "CEC",
  "CED",
  "CEH",
  "CELC",
  "CEM",
  "CEME",
  "CEPA",
  "CERA",
  "CERM",
  "CERP",
  "CESSWI",
  "CFA",
  "CFC",
  "CFCC",
  "CFCM",
  "CFE",
  "CFI",
  "CFII",
  "CFLE",
  "CFM",
  "CFM-I",
  "CFM-II",
  "CFM-III",
  "CFMP",
  "CFO",
  "CFP",
  "CFPIM",
  "CFPS",
  "CFP®",
  "CFRE",
  "CFRM",
  "CFRN",
  "CFT",
  "CG",
  "CGA",
  "CGB",
  "CGC",
  "CGFM",
  "CGFO",
  "CGL",
  "CGMA",
  "CGMP",
  "CGP",
  "CGR",
  "CGSP",
  "CH",
  "CHA",
  "CHBA",
  "CHBC",
  "CHC",
  "CHDM",
  "CHE",
  "CHEK",
  "CHES",
  "CHFC",
  "CHHC",
  "ChMC",
  "CHMM",
  "CHPC",
  "CHPP",
  "CHRL",
  "CHRM",
  "CHRP",
  "CHST",
  "CHT",
  "CHTP",
  "CHWC",
  "CIA",
  "CIC",
  "CICP",
  "CICP",
  "CICS",
  "CIDP",
  "CIEH",
  "CIH",
  "CIM",
  "CIMA",
  "CIP",
  "CIPD",
  "CIPM",
  "CIR",
  "CIRO",
  "CIS",
  "CISA",
  "CISM",
  "CISR",
  "CISSN",
  "CISSP",
  "CIT",
  "CITP",
  "CIW",
  "CLC",
  "CLF",
  "Cloud+",
  "CLPC",
  "CLT",
  "CLU",
  "CM",
  "CMA",
  "C.M.C.",
  "CMCS",
  "CME",
  "CMfgE",
  "CMfgT",
  "CMFO",
  "CMG",
  "CMgr",
  "CMIC",
  "CMM",
  "CMP",
  "CMQ",
  "CMRP",
  "CMS",
  "CMT",
  "CNC",
  "CNLP",
  "CNM",
  "CNOR",
  "CNP",
  "CNS",
  "CODP",
  "COSS",
  "COTA",
  "CP-C",
  "CP-FS",
  "CPA",
  "CPACC",
  "CPAE",
  "CPC",
  "CPCC",
  "CPCP",
  "CPCS",
  "CPCU",
  "CPE",
  "CPESC",
  "CPFA",
  "CPFO",
  "CPG",
  "CPHSA",
  "CPI",
  "CPIM",
  "CPLC",
  "CPLP",
  "CPM",
  "CPMA",
  "CPN",
  "CPO",
  "CPP",
  "CPRW",
  "CPS",
  "CPSC",
  "CPSM",
  "CPT",
  "CPTD",
  "CPTM",
  "CPWM",
  "CQA",
  "CQE",
  "CQI",
  "CQIA",
  "CQM-C",
  "CQPA",
  "CRA-RT",
  "CRE",
  "CRISC",
  "CRM",
  "CRMA",
  "CRME",
  "CRMT",
  "CRNP",
  "CRO",
  "CRRN",
  "CRS",
  "CSA",
  "CSBE",
  "CSC",
  "CSCA",
  "CSCMP",
  "CSCP",
  "CSCS",
  "CSE",
  "CSEP",
  "CSFBC",
  "CSI",
  "CSL",
  "CSM",
  "CSMA",
  "CSMC",
  "CSP",
  "CSPO",
  "CSPOMM",
  "CSRE",
  "CSRTE",
  "CSSBB",
  "CSSD",
  "CSSGB",
  "CST",
  "CSTE",
  "CSW",
  "CTACC",
  "CTFA",
  "CTO",
  "CTP",
  "CTRN",
  "CTSC",
  "CTSM",
  "CTT+",
  "CVA",
  "CVBS",
  "CVPM",
  "CVRS",
  "CVT",
  "CWCM",
  "CWEP",
  "CXA",
  "CYDS",
  "CySA+",
  "DAAPM",
  "DABFM",
  "DABFP",
  "DABHP",
  "DABIM",
  "DABMP",
  "DABR",
  "DABSNM",
  "DABVLM",
  "DABVP",
  "DABVT",
  "DAc",
  "DACAW",
  "DACBN",
  "DACLAM",
  "DACM",
  "DACPV",
  "DAcRI",
  "DACT",
  "DACVAA",
  "DACVB",
  "DACVCP",
  "DACVD",
  "DACVECC",
  "DACVIM",
  "DACVM",
  "DACVNU",
  "DACVO",
  "DACVP",
  "DACVPM",
  "DACVR",
  "DACVSMR",
  "DAcWV",
  "DACZM",
  "DAOM",
  "DAVCS",
  "DAVDC",
  "DBA",
  "D.C.",
  "DC",
  "D.D.S.",
  "DDS",
  "D.Ed.",
  "DES",
  "DHANP",
  "DHt",
  "DipABLM",
  "Dipl.Ac.",
  "Dipl.OM",
  "D.M.",
  "DMCEPC",  "M.Div.",
  "MDiv",
  "MDIV",
  "Mdiv",
  "DMS",
  "DNAP",
  "DNBHE",
  "DNM",
  "DNP",
  "D.O.",
  "DO",
  "DOM",
  "D.PH.",
  "DPM",
  "DPP",
  "DPT",
  "DQ",
  "DrPH",
  "DTM",
  "D.V.M.",
  "DVM",
  "EA",
  "EAc",
  "ECPC",
  "EdD",
  "EFO",
  "EI",
  "EIT",
  "ELI-MP",
  "ELS",
  "EMBA",
  "EMBB",
  "EMT",
  "Engr",
  "ENP",
  "EQAP",
  "ESDP",
  "ESE",
  "Esq",
  "EVP",
  "FAAEM",
  "FAAFP",
  "FAAN",
  "FAANP",
  "FAANS",
  "FAAOS",
  "FAAP",
  "FACC",
  "FACD",
  "FACE",
  "FACEP",
  "FACFAS",
  "FACFO",
  "FACHA",
  "FACHE",
  "FACOFP",
  "FACOG",
  "FACOG",
  "FACOOG",
  "FACOP",
  "FACP",
  "FACS",
  "FADI",
  "FAEMS",
  "FAGD",
  "FAGO",
  "FAHA",
  "FAIA",
  "FAICP",
  "FAIHM",
  "FAIS",
  "FALA",
  "FAND",
  "FAOM",
  "F.ASCE",
  "FASD",
  "FASHP",
  "FASID",
  "FASLA",
  "FASPEN",
  "FAWM",
  "FCA",
  "FCAS",
  "FCCA",
  "FCCM",
  "FCIM",
  "FCIPD",
  "FCMC",
  "FCP",
  "FDN",
  "FEPAA",
  "FIC",
  "FICD",
  "FICF",
  "FICOI",
  "FIDSA",
  "FIEEE",
  "FISRM",
  "FITOL",
  "FMAAT",
  "FMACP",
  "FMP",
  "FNP",
  "FNP-BC",
  "FNS",
  "FP-C",
  "FPC",
  "FPFA",
  "FPMRS",
  "FPSA",
  "FRM",
  "FRSA",
  "FRSPH",
  "FSA",
  "GAICD",
  "GB",
  "GBE",
  "GC",
  "GCCE",
  "GCDF",
  "GCED",
  "GCFA",
  "GCIA",
  "GCIH",
  "GCP",
  "GGAFCEO",
  "GIAC",
  "GISP",
  "GIT",
  "GPEN",
  "GPHR",
  "Green Belt",
  "GRI",
  "GSEC",
  "GSMIEEE",
  "HASG",
  "HCCP",
  "HCIB",
  "HHP",
  "HLC",
  "HLL",
  "HMD",
  "HR",
  "HRM",
  "HSA",
  "HSG",
  "HTCP",
  "IABC",
  "IACCP",
  "IAEM",
  "IBCLC",
  "ICCM-D",
  "ICCM-F",
  "ICD.D",
  "ICF",
  "ICMA-CM",
  "IDI-QA",
  "IDVA",
  "IF",
  "IHP",
  "IJCTC",
  "ILM",
  "IMA",
  "IOM",
  "ISSP",
  "ISSP-CSP",
  "ISSP-SA",
  "ITCA",
  "ITIL",
  "ITSM",
  "IWC",
  "J.D.",
  "JD",
  "J.P.",
  "Kaizen",
  "KBE",
  "KCHS/DCHS",
  "KHS/DHS",
  "L.Ac.",
  "LAc",
  "LC",
  "LCMT",
  "LCPC",
  "LCSW",
  "LDN",
  "Lean",
  "Lean Six Sigma",
  "LEED AP",
  "LEED GA",
  "LIBERTO",
  "LicAc",
  "LICSW",
  "Linux+",
  "LISW",
  "LISW-S",
  "LL",
  "LL.D.",
  "LLD",
  "LL.M.",
  "LLM",
  "LMBT",
  "LMFT",
  "LMHC",
  "LMPNLP",
  "LMSW",
  "LMT",
  "LN",
  "LNC",
  "LPA",
  "LPC",
  "LPCC",
  "LPHA",
  "LPIC-1",
  "LPIC-2",
  "LPIC-3",
  "LPN",
  "LSCC",
  "LSI",
  "LSIT",
  "LSS",
  "LSSGB",
  "LSW",
  "LUTCF",
  "LVN",
  "LVT",
  "M Ed",
  "M Ed",
  "M.A.",
  "MA",
  "MA-OM",
  "MAAA",
  "MAAPS",
  "MABC",
  "MAC",
  "MACMHC",
  "MADR",
  "MAGD",
  "MAHRI",
  "MAI",
  "MAM",
  "MAMI",
  "MAPA",
  "MAPP",
  "M.ASCE",
  "MAT",
  "M.B.A.",
  "MBA",
  "MBA+",
  "MBA-M",
  "MBACFRE",
  "MBACP",
  "MBACSP",
  "MBAe",
  "MBAHCM",
  "MBE",
  "MBET",
  "MBL",
  "MBM",
  "MBS",
  "MBT",
  "MCC",
  "MCCT",
  "MCD",
  "MCITP",
  "MCMI",
  "MCN",
  "MCNLP",
  "M.Com.",
  "MCom",
  "MCP",
  "MCS-P",
  "MCSA",
  "MCSD",
  "MCSE",
  "MCT",
  "MCTS",
  "M.D.",
  "MD",
  "MDH",
  "M.E.",
  "MEAC",
  "M.Ed",
  "M.Ed.",
  "MEd",
  "MEng",
  "MEP",
  "M.F.A.",
  "MFA",
  "MFCC",
  "MHA",
  "MHRD",
  "MHRM",
  "MHS",
  "MIB",
  "M.IDST",
  "MIEEE",
  "MIPA",
  "MIRHR",
  "MLAS",
  "MLIS",
  "MLS",
  "MLSE",
  "MM",
  "MMFT",
  "MMSc",
  "M.Mus.",
  "MMus",
  "MNLP",
  "MNM",
  "MNNP",
  "MOL",
  "MOS",
  "M.P.A.",
  "MPA",
  "MPA-HC",
  "MPAS",
  "M.P.H.",
  "MPH",
  "M.Phil.",
  "MPhil",
  "MPP",
  "MPT",
  "MRA",
  "M.S.",
  "MS",
  "MS-LHRD",
  "MS-OLT",
  "MS-SLP",
  "MSA",
  "M.Sc.",
  "MSc",
  "MSCP",
  "MSDT",
  "MSEAT",
  "MSEC",
  "MSL",
  "MSM",
  "MSN",
  "MSOD",
  "MSOL",
  "MSOM",
  "MSW",
  "MT-BC",
  "MTLT",
  "MTM",
  "N/A",
  "NASM-CPT",
  "NBC-HWC",
  "NBCC",
  "NBCT",
  "NCARB",
  "NCC",
  "NCCA",
  "NCCAOM",
  "NCIDQ",
  "NCM",
  "ND",
  "NDCCDP",
  "Network",
  "Network+",
  "NICET I/II/III/IV",
  "NLP",
  "NLPP",
  "NMD",
  "NMT",
  "NP",
  "NREMT-P",
  "NRP",
  "OAM",
  "OBE",
  "OBM",
  "OD",
  "OHST",
  "OMCP",
  "OMD",
  "ORSCC",
  "OSCP",
  "OT",
  "OTD",
  "PA",
  "PA-C",
  "PA-CIFMCP",
  "PACE",
  "PATP",
  "PCAP",
  "PCC",
  "PCCCPCCMBA",
  "PCCMP",
  "PCEP",
  "PCM",
  "PCPP",
  "PDG",
  "P.E",
  "PE",
  "PenTest+",
  "PG",
  "PGA",
  "Ph D",
  "PharmD",
  "Ph.D.",
  "PhD",
  "PHR",
  "PHR-CA",
  "PLA",
  "PLS",
  "PM",
  "PMC-II",
  "PME",
  "PMHNP",
  "PMHNP-BC",
  "Pmhnp-Bc",
  "PMHA",
  "PMI-ACP",
  "PMI-RMP",
  "PMI-SP",
  "PMIACP",
  "PMM",
  "PMP",
  "POPM",
  "PP",
  "PPM",
  "PRINCE2",
  "PRM",
  "Project+",
  "PROSCI",
  "PRP",
  "PRSA",
  "PSA",
  "PSD",
  "PSM",
  "PSM",
  "PSMI",
  "PSPO",
  "PST",
  "Psy.D.",
  "PsyD",
  "PT",
  "PTA",
  "QC",
  "QMHP",
  "QSD",
  "QSP",
  "RA",
  "RAI",
  "RBA",
  "RBLP-T",
  "RCC",
  "RCDD",
  "RCI",
  "RD",
  "RDCS",
  "RDH",
  "RDMS",
  "RDN",
  "REHS",
  "RES",
  "RFC",
  "RFP",
  "RHCA",
  "RHCE",
  "RHCSA",
  "RHN",
  "RID",
  "RIHC",
  "RLP",
  "RLS",
  "RMT",
  "RN",
  "RN-BC",
  "RN-C",
  "RN-CS",
  "RN-MSN",
  "RN/NP",
  "RNMSNMBA",
  "RP",
  "RPA",
  "RPh",
  "RRC",
  "RRPT",
  "RRT",
  "RS Hom",
  "RSCC",
  "RSME",
  "RSO",
  "RSW",
  "RTRP",
  "RVT",
  "RYT",
  "SA",
  "SAC",
  "SCCP",
  "SCMP",
  "SCOR-P",
  "SCPM",
  "SE",
  "SECB",
  "Security+",
  "SEP",
  "Server+",
  "SES",
  "SFP",
  "SG",
  "SHRM-CP",
  "SHRM-IWC",
  "SHRM-SCP",
  "SHRMSCP",
  "SI",
  "SIIE",
  "SIM",
  "Six Sigma",
  "S.J.D.",
  "SLP",
  "SLP-CCC",
  "SLPD",
  "SMA",
  "S.M.ASCE",
  "SMC",
  "SME",
  "SMIEEE",
  "SMT",
  "SPC",
  "SPHR",
  "SPS",
  "SRA",
  "SRES",
  "SRS",
  "SSBB",
  "SSGB",
  "STS",
  "TCRN",
  "TNLP",
  "TP-C",
  "TPS",
  "TR-C",
  "TSC",
  "TTS",
  "UMC",
  "USA",
  "USAF",
  "USCG",
  "USMC",
  "USN",
  "VCAP",
  "VCDX",
  "VCP",
  "VEMM",
  "VMD",
  "VTS",
  "WAS",
  "WELL AP",
  "WHE",
  "WHNP-BC",
  "WIMI-CP",
  "WP-C",
  "WPCC",
  "XFS",
  "XPS",
] as const;

/**
 * Generational Suffixes (29 total)
 * Used to denote family lineage (Jr., Sr., II, III, etc.)
 */
const GENERATIONAL_SUFFIXES = [
  "Jr", "Jr.", "Junior",
  "Sr", "Sr.", "Senior",
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV",
  "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"
] as const;

/**
 * Name Titles/Honorifics (43 total)
 * Prefixes that appear before a person's name
 */
const TITLES = [
  "Dr", "Dr.", "Mr", "Mr.", "Mrs", "Mrs.", "Miss", "Ms", "Ms.", 
  "Prof", "Prof.", "Mx", "Mx.", "Revd", "Rev", "Rev.", "Sir", "Lady",
  "Hon", "Hon.", "Honorable", "Judge", "Justice", "Senator", "Representative",
  "Congressman", "Congresswoman", "Governor", "Mayor", "President", "Vice President",
  "Secretary", "Ambassador", "Father", "Fr", "Fr.", "Mother", "Sr", "Sr.",
  "Brother", "Br", "Br.", "Rabbi", "Imam", "Pastor", "Bishop", "Archbishop",
  "Cardinal", "Pope", "Deacon", "Elder"
] as const;

/**
 * Last Name Prefixes (61 total)
 * Particles that are part of surnames (e.g., "van", "de", "von")
 */
const LAST_NAME_PREFIXES = [
  "van der", "van den", "van de", "van 't", "van", "vander",
  "ter", "der", "ten", "'s", "'t",
  "de la", "de", "des", "du", "d'", "le", "la",
  "von und zu", "von", "zu",
  "del", "degli", "della", "di", "da",
  "dos", "das", "e",
  "bin", "bint", "binti", "binte", "abu", "al", "el", "ibn",
  "aït", "at", "ath",
  "bath", "bat", "ben", "bar",
  "mac", "mc", "ni", "nic", "o'", "ó", "ua", "uí",
  "ap", "ab", "ferch", "verch", "erch",
  "af", "av",
  "a", "alam", "olam", "chaudhary", "ch", "dele",
  "fitz", "i", "ka", "kil", "gil", "mal", "mul",
  "m'", "m'c", "m.c", "mck", "mhic", "mic", "mala",
  "na", "ngā", "nin", "öz", "pour", "te", "tre", "war", "bet"
] as const;

// Create Sets for O(1) lookup performance
const CREDENTIALS_SET = new Set(ALL_CREDENTIALS);
const GENERATIONAL_SUFFIXES_SET = new Set(GENERATIONAL_SUFFIXES);
const TITLES_SET = new Set(TITLES);
const LAST_NAME_PREFIXES_SET = new Set(LAST_NAME_PREFIXES);

// Create normalized Map for case-insensitive credential lookup
const CREDENTIALS_MAP = new Map<string, string>();
ALL_CREDENTIALS.forEach(cred => {
  const normalized = cred.replace(/\./g, '').toLowerCase();
  CREDENTIALS_MAP.set(normalized, cred);
  CREDENTIALS_MAP.set(cred, cred);
});

/**
 * Check if a string is a known credential
 */
function _isCredential(value: string, caseSensitive: boolean = false): boolean {
  if (caseSensitive) {
    return CREDENTIALS_SET.has(value as any);
  }
  const normalized = value.replace(/\./g, '').toLowerCase();
  return CREDENTIALS_MAP.has(normalized);
}

/**
 * Check if a string is a generational suffix
 */
function isGenerationalSuffix(value: string): boolean {
  if (/^[IVX]+$/.test(value)) {
    return GENERATIONAL_SUFFIXES_SET.has(value as any);
  }
  const normalized = value.replace(/\./g, '').toLowerCase();
  return GENERATIONAL_SUFFIXES.some(suffix => 
    suffix.replace(/\./g, '').toLowerCase() === normalized
  );
}

/**
 * Check if a string is a title
 */
function _isTitle(value: string): boolean {
  if (TITLES_SET.has(value as any)) {
    return true;
  }
  const normalized = value.toLowerCase();
  return TITLES.some(title => title.toLowerCase() === normalized);
}

/**
 * Check if a string is a last name prefix
 */
function _isLastNamePrefix(value: string): boolean {
  const normalized = value.toLowerCase();
  return LAST_NAME_PREFIXES_SET.has(normalized as any) || 
         LAST_NAME_PREFIXES.some(prefix => prefix.toLowerCase() === normalized);
}

/**
 * Job-related words that might appear in names but aren't part of the actual name
 */
const JOB_WORDS = [
  "Chief", "Officer", "Director", "Manager", "President", "Chair", "Board",
  "Founder", "CEO", "CFO", "COO", "CTO", "VP", "Specialist", "Consultant",
  "Partner", "Operations", "Division", "Department", "Head", "Lead", "Supervisor",
  "Administrator", "Executive", "Advisor", "Expert", "Speaker", "Keynote",
  "TEDx", "Author", "Coach", "Photographer", "Owner", "Content"
] as const;

/**
 * Misencoded character map for fixing encoding issues
 */
const MISENCODED_MAP: Record<string, string> = {
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
};

/**
 * Common Latin name fixes for accent restoration
 */
const COMMON_LATIN_FIXES: Record<string, { fixed: string; reason: string }> = {
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
};


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Stub types for Asian name detection (temporarily disabled)
type NameContext = {
  email?: string;
  phone?: string;
  company?: string;
};

type ContextAnalysis = {
  culture?: string;
  confidence?: number;
};

export interface RepairLog {
  original: string;
  repaired: string;
  reason: string;
  changes?: Array<{ type: 'add' | 'remove' | 'replace'; text: string; position?: number }>;
}

export interface NameParts {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  nickname: string | null;
  prefix: string | null;
  suffix: string | null;
  nameOrder?: 'western' | 'eastern';  // western: given-family, eastern: family-given
  asianCulture?: 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null;
  nameOrderConfidence?: number;  // 0-100
}

export interface ParseOptions {
  preserveAccents?: boolean;
  trackPerformance?: boolean;
  context?: NameContext;  // Additional context for improved parsing (feature temporarily disabled)
}

export interface ParseResult {
  name: NameEnhanced;
  performance: {
    parseTime: number;
    repairTime: number;
    totalTime: number;
  };
  contextAnalysis?: ContextAnalysis;  // Context analysis results (feature temporarily disabled)
}export class NameEnhanced {
  // Helper function for title case conversion
  private toTitleCase(str: string): string {
    if (!str) return str;
    
    // Name particles that should remain lowercase
    const particles = new Set(['de', 'la', 'del', 'van', 'von', 'der', 'den', 'het', 'te', 'ter', 'ten', 'da', 'di', 'do', 'du']);
    
    return str
      .split(' ')
      .map((word, index) => {
        if (!word) return word;
        
        const lowerWord = word.toLowerCase();
        
        // Keep particles lowercase (always, even at start)
        if (particles.has(lowerWord)) {
          return lowerWord;
        }
        
        // Handle hyphenated names (e.g., "Smith-Johnson")
        if (word.includes('-')) {
          return word.split('-').map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join('-');
        }
        
        // Handle apostrophes (e.g., "O'Connor")
        if (word.includes("'")) {
          const parts = word.split("'");
          return parts.map((part, idx) => 
            idx === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join("'");
        }
        
        // Standard title case
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // Core properties
  rawName: string;
  firstName: string | null = null;
  middleName: string | null = null;
  lastName: string | null = null;
  nickname: string | null = null;
  prefix: string | null = null;
  suffix: string | null = null;
  nameOrder: 'western' | 'eastern' = 'western';
  asianCulture: 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null = null;
  nameOrderConfidence: number = 0;
  contextAnalysis: ContextAnalysis | null = null;
  isValid: boolean = false;
  parseLog: RepairLog[] = [];
  options: ParseOptions;
  parseTime: number = 0;

  constructor(rawName: string, options: ParseOptions = {}) {
    this.rawName = rawName;
    this.options = {
      preserveAccents: false,
      trackPerformance: true,
      ...options
    };
    this.parse();
  }

  private recordRepair(original: string, repaired: string, reason: string) {
    // Calculate detailed changes for visual diff
    const changes = this.calculateDiff(original, repaired);
    this.parseLog.push({ original, repaired, reason, changes });
  }

  private calculateDiff(original: string, repaired: string): Array<{ type: 'add' | 'remove' | 'replace'; text: string; position?: number }> {
    const changes: Array<{ type: 'add' | 'remove' | 'replace'; text: string; position?: number }> = [];
    
    if (original === repaired) return changes;
    
    // Simple diff: find what changed
    let i = 0;
    while (i < Math.max(original.length, repaired.length)) {
      if (original[i] !== repaired[i]) {
        if (i >= original.length) {
          changes.push({ type: 'add', text: repaired.slice(i), position: i });
          break;
        } else if (i >= repaired.length) {
          changes.push({ type: 'remove', text: original.slice(i), position: i });
          break;
        } else {
          // Find the extent of the change
          let j = i;
          while (j < Math.min(original.length, repaired.length) && original[j] !== repaired[j]) {
            j++;
          }
          changes.push({
            type: 'replace',
            text: `"${original.slice(i, j)}" → "${repaired.slice(i, j)}"`,
            position: i
          });
          i = j;
          continue;
        }
      }
      i++;
    }
    
    return changes;
  }

  private stripAccents(text: string): string {
    if (this.options.preserveAccents) {
      return text;
    }
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private keepLettersAndAllowed(ch: string): boolean {
    return /[a-zA-ZÀ-ÿ\s\-']/.test(ch);
  }

  private parse() {
    const startTime = performance.now();
    
    if (!this.rawName || this.rawName.trim() === '') {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    let text = this.rawName.trim();
    
    // Detect Excel error values (#NAME?, #VALUE!, #REF!, etc.)
    if (/^#[A-Z]+[?!]?$/.test(text)) {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }
    const originalText = text;

    // 1. Fix mis-encoded characters
    const repairStart = performance.now();
    for (const [bad, fix] of Object.entries(COMMON_LATIN_FIXES)) {
      const escapedBad = this.escapeRegex(bad);
      const regex = new RegExp(`\\b${escapedBad}\\b`, 'gi');
      if (regex.test(text)) {
        const before = text;
        text = text.replace(regex, fix.fixed);
        if (text !== before) {
          this.recordRepair(before, text, fix.reason);
        }
      }
    }

    for (const [bad, good] of Object.entries(MISENCODED_MAP)) {
      if (text.includes(bad)) {
        const before = text;
        const escapedBad = this.escapeRegex(bad);
        text = text.replace(new RegExp(escapedBad, 'g'), good);
        if (text !== before) {
          this.recordRepair(before, text, 'symbol_cleanup');
        }
      }
    }

    // 2. Remove pronouns in parentheses or square brackets (she/her, he/him, they/them, etc.)
    // Do this BEFORE multi-person detection to avoid false positives from pronoun slashes
    const pronounPattern = /[\(\[]\s*(she\/her|he\/him|they\/them|she\/they|he\/they|any pronouns?|all pronouns?)\s*[\)\]]/gi;
    const pronounMatch = text.match(pronounPattern);
    if (pronounMatch) {
      const before = text;
      text = text.replace(pronounPattern, '').trim();
      this.recordRepair(before, text, 'pronouns_removed');
    }

    // 3. Multi-person detection (after pronoun removal)
    if (/\b(&|and)\b|\//i.test(text)) {
      this.recordRepair(originalText, text, 'multi_person_detected');
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // 4. Remove credential modifiers in parentheses like (ABD), (c), (ret.)
    const modifierPattern = /\(\s*(ABD|c|ret\.?|retired|candidate|cand\.)\s*\)/gi;
    const modifierMatches = text.match(modifierPattern);
    if (modifierMatches) {
      const before = text;
      text = text.replace(modifierPattern, '').trim();
      this.recordRepair(before, text, 'credential_modifiers_removed');
    }

    // 5. Remove credentials in parentheses (Ph.D.), (MD), etc.
    const credInParensPattern = new RegExp(
      `\\(\\s*(${ALL_CREDENTIALS.map(c => this.escapeRegex(c)).join('|')})\\s*\\)`,
      'gi'
    );
    const credInParensMatches = text.match(credInParensPattern);
    if (credInParensMatches) {
      const before = text;
      text = text.replace(credInParensPattern, '').trim();
      this.recordRepair(before, text, 'credentials_in_parens_removed');
    }

    // 6. Extract nicknames from remaining parentheses/quotes
    const nicknames: string[] = [];
    let textNoNicknames = text;
    const nicknameRegex = /"([^"]+)"|'([^']+)'|\(([^)]+)\)/g;
    let match;
    while ((match = nicknameRegex.exec(text)) !== null) {
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          nicknames.push(match[i].trim());
        }
      }
    }
    this.nickname = nicknames.length > 0 ? nicknames.join(' ') : null;
    // Remove the entire nickname match (including quotes/parens), not just the punctuation
    textNoNicknames = text.replace(nicknameRegex, ' ').trim();

    // 7. Remove titles/prefixes (Dr, Mr, Mrs, etc.)
    const titlePattern = new RegExp(
      `^(${TITLES.map(t => this.escapeRegex(t)).join('|')})\\s+`,
      'i'
    );
    const titleMatch = textNoNicknames.match(titlePattern);
    if (titleMatch) {
      this.prefix = titleMatch[1];
      textNoNicknames = textNoNicknames.replace(titlePattern, '').trim();
      this.recordRepair(text, textNoNicknames, 'title_removed');
      text = textNoNicknames;
    }

    // 8. Remove suffixes/credentials (MD, PhD, CFP, etc.) from anywhere in the name
    let credentialsRemoved: string[] = [];
    let previousText = textNoNicknames;
    
    // Clean up leading hyphens/spaces before credentials (e.g., "Sharon Lemoine -FNP" → "Sharon Lemoine FNP")
    textNoNicknames = textNoNicknames.replace(/\s+-([A-Z])/g, ' $1');
    
    // Build pattern for credentials as standalone words
    // Use lookahead/lookbehind to ensure not part of hyphenated names
    // Sort by length (longest first) to match "ARNP-FNP" before "ARNP"
    // Make periods optional to match both "EdD" and "Ed.D."
    const sortedCredentials = [...ALL_CREDENTIALS].sort((a, b) => b.length - a.length);
    const credentialPattern = new RegExp(
      `(?<![-])\\b(${sortedCredentials.map(c => {
        // Make periods optional: EdD becomes Ed\\.?D\\.?
        // Split by character and add optional period after each letter/digit
        const escaped = this.escapeRegex(c);
        return escaped.split('').map(ch => {
          if (/[a-zA-Z0-9]/.test(ch)) {
            return ch + '\\.?';
          }
          return ch; // Keep special chars as-is (already escaped)
        }).join('');
      }).join('|')})(?=\\s|$|[^\\w])`,
      'gi'
    );
    
    // Find all credentials
    const matches = textNoNicknames.match(credentialPattern);
    if (matches) {
      credentialsRemoved.push(...matches);
      // Remove all credentials
      textNoNicknames = textNoNicknames.replace(credentialPattern, '').trim();
    }
    
    // Remove trailing hyphens/dashes that were before credentials
    textNoNicknames = textNoNicknames.replace(/\s*[-\u2013\u2014]\s*$/, '').trim();
    
    // Clean up multiple spaces
    textNoNicknames = textNoNicknames.replace(/\s+/g, ' ').trim();
    
    if (credentialsRemoved.length > 0) {
      this.suffix = credentialsRemoved.join(' ');
      this.recordRepair(previousText, textNoNicknames, 'credentials_removed');
      text = textNoNicknames;
    }

    // 9. Remove job titles instead of rejecting the name
    // Try two patterns:
    // 1. Job titles after comma/hyphen: "Name, Job Title" or "Name - Job Title"
    // 2. Job titles as last word(s): "Name JobTitle"
    const jobTitleAfterSeparator = new RegExp(
      `[,\\-\\u2013\\u2014]\\s*(.*?\\b(?:${JOB_WORDS.join('|')})\\b.*)$`,
      'i'
    );
    const jobTitleAsLastWord = new RegExp(
      `\\s+(\\b(?:${JOB_WORDS.join('|')})\\b(?:\\s+\\w+)*)\\s*$`,
      'i'
    );
    
    let jobTitleRemoved = false;
    const before = textNoNicknames;
    
    // Try pattern 1 first (after separator)
    if (jobTitleAfterSeparator.test(textNoNicknames)) {
      textNoNicknames = textNoNicknames.replace(jobTitleAfterSeparator, '').trim();
      jobTitleRemoved = true;
    }
    // Try pattern 2 (as last word)
    else if (jobTitleAsLastWord.test(textNoNicknames)) {
      textNoNicknames = textNoNicknames.replace(jobTitleAsLastWord, '').trim();
      jobTitleRemoved = true;
    }
    
    if (jobTitleRemoved) {
      this.recordRepair(before, textNoNicknames, 'job_title_removed');
      text = textNoNicknames;
    }

    // 10. Normalize punctuation and spaces
    let cleanedName = textNoNicknames;
    cleanedName = cleanedName
      .split('')
      .map(ch => this.keepLettersAndAllowed(ch) ? ch : ' ')
      .join('');
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    // 11. Strip accents (if option is enabled)
    const beforeAccents = cleanedName;
    cleanedName = this.stripAccents(cleanedName);
    if (cleanedName !== beforeAccents && !this.options.preserveAccents) {
      this.recordRepair(beforeAccents, cleanedName, 'accent_normalization');
    }

    if (!cleanedName) {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    const parts = cleanedName.split(/\s+/);

    if (parts.length === 0) {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    if (parts.length === 1) {
      this.firstName = this.toTitleCase(parts[0]);
      this.lastName = ''; // Empty string instead of null for single-word names
      this.isValid = true;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // Context analysis (if provided)
    if (this.options.context) {
      // TODO: Re-enable Asian name detection after credential fix is verified
      // this.contextAnalysis = analyzeContext(this.options.context);
      this.contextAnalysis = null;
      if (this.contextAnalysis?.detectedCulture && this.contextAnalysis.confidence >= 60) {
        this.recordRepair(text, text, `context_detected_${this.contextAnalysis.detectedCulture}_from_${this.contextAnalysis.sources?.join('_and_')}`);
      }
    }
    
    // Asian name order detection
    // Check if the first part is an Asian surname (family-name-first pattern)
    // TODO: Re-enable Asian surname confidence detection
    // let firstPartConfidence = getAsianSurnameConfidence(parts[0]);
    // const lastPartConfidence = parts.length > 1 ? getAsianSurnameConfidence(parts[parts.length - 1]) : 0;
    let firstPartConfidence = 0;
    const lastPartConfidence = 0;
    
    // Boost confidence using context if available
    if (this.contextAnalysis && this.contextAnalysis?.confidence >= 60) {
      // TODO: Re-enable confidence boosting after Asian name detection is restored
      // firstPartConfidence = boostConfidenceWithContext(firstPartConfidence, this.contextAnalysis);
    }
    
    // Heuristics for name order detection:
    // 1. If first part is a high-confidence Asian surname AND last part is not, likely family-name-first
    // 2. If both are Asian surnames, check which has higher confidence
    // 3. If name has 2 parts and first is Asian surname, likely family-name-first
    // 4. If name has 3+ parts and first is Asian surname, check for Western given names
    // 5. Context (email domain, phone country code, company) can boost confidence
    
    let shouldReorder = false;
    
    // Lower threshold if context strongly suggests Asian culture
    const confidenceThreshold = (this.contextAnalysis && this.contextAnalysis?.confidence >= 80) ? 70 : 85;
    
    if (firstPartConfidence >= confidenceThreshold) {
      // First part is a known Asian surname
      // TODO: Re-enable Asian culture detection after credential fix is verified
      // const culture = detectAsianCulture(parts[0]);
      const culture = null;
      this.asianCulture = culture;
      this.nameOrderConfidence = firstPartConfidence;
      
      if (parts.length === 2) {
        // Two-part name with Asian surname first: likely family-name-first
        // e.g., "Kim Min-jun", "Li Wei", "Tanaka Hiroshi"
        shouldReorder = true;
        this.nameOrder = 'eastern';
        this.recordRepair(text, text, `asian_name_order_detected_${culture}`);
      } else if (parts.length === 3 && lastPartConfidence < 50) {
        // Three-part name: Asian surname + given name + middle/given name
        // e.g., "Wang Li Ming" (Chinese: Wang is surname, Li Ming is given name)
        shouldReorder = true;
        this.nameOrder = 'eastern';
        this.recordRepair(text, text, `asian_name_order_detected_${culture}`);
      } else if (parts.length > 1 && lastPartConfidence >= 85) {
        // Both first and last are Asian surnames - use confidence scores
        if (firstPartConfidence > lastPartConfidence) {
          shouldReorder = true;
          this.nameOrder = 'eastern';
          this.recordRepair(text, text, `asian_name_order_detected_${culture}`);
        }
      }
    }
    
    // Reorder if family-name-first pattern detected
    if (shouldReorder && parts.length >= 2) {
      // For 2-part names: swap family and given
      // For 3+ part names: first part is family, rest are given names
      const familyName = parts[0];
      const givenNames = parts.slice(1);
      
      // Reassign parts in Western order (given-family)
      if (givenNames.length === 1) {
        this.firstName = this.toTitleCase(givenNames[0]);
        this.lastName = this.toTitleCase(familyName);
        this.isValid = true;
        this.parseTime = performance.now() - startTime;
        return;
      } else {
        // Multiple given names: first is firstName, middle ones are middleName, last is still family
        this.firstName = this.toTitleCase(givenNames[0]);
        this.middleName = givenNames.slice(1).join(' ');
        this.lastName = this.toTitleCase(familyName);
        this.isValid = true;
        this.parseTime = performance.now() - startTime;
        return;
      }
    }
    
    // Standard Western name order parsing
    this.firstName = this.toTitleCase(parts[0]);
    
    // Check if the last part is a generational suffix (Jr., Sr., II, III, etc.)
    let suffixPart: string | null = null;
    let lastPartIndex = parts.length - 1;
    const lastPart = parts[lastPartIndex];
    const lastPartNormalized = lastPart.replace(/\./g, '');
    
    // Check if it matches a generational suffix (case-insensitive for Jr/Sr, case-sensitive for Roman numerals)
    const isGenSuffix = isGenerationalSuffix(lastPart);
    
    if (isGenSuffix && parts.length > 2) {
      // Extract the suffix and use the previous part as last name
      suffixPart = lastPart;
      lastPartIndex = parts.length - 2;
    }
    
    let lastNameParts = [parts[lastPartIndex]];
    let middleParts = parts.slice(1, lastPartIndex);

    // Detect last name prefixes (start from the position before the last name)
    let i = lastPartIndex - 1;
    while (i >= 1) {
      const candidate = parts[i].toLowerCase();
      const candidate2 = i > 0 ? `${parts[i - 1]} ${parts[i]}`.toLowerCase() : candidate;
      
      // v3.13.4: Skip single-letter initials (A, B, etc.) - they're middle initials, not last name prefixes
      // Only treat as last name prefix if it's 2+ letters (e.g., "de", "van", "al")
      const isSingleLetterInitial = parts[i].length === 1;

      if (LAST_NAME_PREFIXES.includes(candidate2 as any)) {
        lastNameParts = [...parts.slice(i - 1, i + 1), ...lastNameParts];
        middleParts = parts.slice(1, i - 1);
        i -= 1;
      } else if (!isSingleLetterInitial && LAST_NAME_PREFIXES.includes(candidate as any)) {
        lastNameParts = [parts[i], ...lastNameParts];
        middleParts = parts.slice(1, i);
      } else {
        break;
      }
      i -= 1;
    }

    this.lastName = this.toTitleCase(lastNameParts.join(' '));
    
    // v3.13.4: Filter out single-letter middle initials (A., B., etc.)
    // Only keep middle names that are full words (2+ letters without trailing period)
    const filteredMiddleParts = middleParts.filter(part => {
      // Remove trailing period for checking
      const withoutPeriod = part.replace(/\.$/, '');
      // Keep only if it's 2+ letters (full middle name, not initial)
      return withoutPeriod.length >= 2;
    });
    
    this.middleName = filteredMiddleParts.length > 0 ? filteredMiddleParts.join(' ') : null;
    
    // Assign generational suffix if detected (combine with credential suffix if both exist)
    if (suffixPart) {
      if (this.suffix) {
        // Combine generational suffix with credential suffix
        this.suffix = `${suffixPart} ${this.suffix}`;
      } else {
        this.suffix = suffixPart;
      }
    }
    
    this.isValid = true;
    this.parseTime = performance.now() - startTime;
  }

  format(formatString: string): string {
    if (!this.isValid) return '';

    const formatMap: Record<string, string> = {
      'f': this.firstName || '',
      'm': this.middleName || '',
      'l': this.lastName || '',
      'p': this.prefix || '',
      's': this.suffix || '',
      'n': this.nickname || '',
      'F': (this.firstName || '').toUpperCase(),
      'M': (this.middleName || '').toUpperCase(),
      'L': (this.lastName || '').toUpperCase(),
    };

    return formatString
      .split(' ')
      .map(c => formatMap[c] !== undefined ? formatMap[c] : c)
      .filter(s => s && s.trim())  // Filter empty strings
      .join(' ')
      .trim();
  }

  get full(): string {
    // Don't include prefix (title) or suffix (credentials) in full name
    return this.format('f m l');
  }

  get short(): string {
    return this.format('f l');
  }

  get initials(): string[] {
    const result: string[] = [];
    if (this.firstName) result.push(this.firstName[0].toUpperCase());
    if (this.middleName) {
      this.middleName.split(' ').forEach(m => {
        if (m) result.push(m[0].toUpperCase());
      });
    }
    if (this.lastName) result.push(this.lastName[0].toUpperCase());
    return result;
  }

  toObject(): NameParts & { rawName: string; isValid: boolean; parseTime: number } {
    return {
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      nickname: this.nickname,
      prefix: this.prefix,
      suffix: this.suffix,
      rawName: this.rawName,
      isValid: this.isValid,
      parseTime: this.parseTime
    };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  toCSVRow(): string {
    return [
      this.rawName,
      this.firstName || '',
      this.middleName || '',
      this.lastName || '',
      this.nickname || '',
      this.isValid ? 'Valid' : 'Invalid',
      this.parseTime.toFixed(2) + 'ms'
    ].map(v => `"${v}"`).join(',');
  }

  static csvHeader(): string {
    return 'Raw Name,First Name,Middle Name,Last Name,Nickname,Status,Parse Time';
  }

  getHighlightedParts(): Array<{ text: string; type: 'first' | 'middle' | 'last' | 'nickname' | 'other' }> {
    if (!this.isValid) return [{ text: this.rawName, type: 'other' }];
    
    const parts: Array<{ text: string; type: 'first' | 'middle' | 'last' | 'nickname' | 'other' }> = [];
    const words = this.rawName.split(/\s+/);
    
    words.forEach((word, idx) => {
      const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
      
      if (this.firstName && cleanWord === this.firstName.toLowerCase()) {
        parts.push({ text: word, type: 'first' });
      } else if (this.lastName && this.lastName.toLowerCase().includes(cleanWord)) {
        parts.push({ text: word, type: 'last' });
      } else if (this.middleName && this.middleName.toLowerCase().includes(cleanWord)) {
        parts.push({ text: word, type: 'middle' });
      } else if (this.nickname && this.nickname.toLowerCase().includes(cleanWord)) {
        parts.push({ text: word, type: 'nickname' });
      } else {
        parts.push({ text: word, type: 'other' });
      }
    });
    
    return parts;
  }
}

export function parseBatch(names: string[], options: ParseOptions = {}): ParseResult[] {
  const startTime = performance.now();
  const results = names.map(name => {
    const parseStart = performance.now();
    const parsedName = new NameEnhanced(name, options);
    const parseTime = performance.now() - parseStart;
    
    return {
      name: parsedName,
      performance: {
        parseTime: parsedName.parseTime,
        repairTime: 0, // Could be calculated separately if needed
        totalTime: parseTime
      }
    };
  });
  
  return results;
}
