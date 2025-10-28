/**
 * IT, Technology, and Cybersecurity Credentials
 * Source: CompTIA, Cisco, Microsoft, AWS, Google Cloud, (ISC)², ISACA
 */

export const TECHNOLOGY_CREDENTIALS = [
  // CompTIA
  "A+", "Network+", "Security+", "Linux+", "Cloud+", "Server+", "CySA+", "CASP+", 
  "PenTest+", "CTT+", "Project+",
  
  // Cisco
  "CCNA", "CCNP", "CCIE", "CCENT", "CCDA", "CCDP", "CCDE", "CCAr",
  
  // Microsoft
  "MCSA", "MCSE", "MCSD", "MCP", "MCT", "MOS", "MCTS", "MCITP",
  
  // Security Certifications
  "CISSP", "CISM", "CISA", "CEH", "OSCP", "GIAC", "CRISC", "GSEC", "GCED", "GCIH", 
  "GCIA", "GCFA", "GPEN", "CCSP", "CCSK", "SSCP",
  
  // Project Management
  "PMP", "CAPM", "PRINCE2", "CSM", "PSM", "PMI-ACP", "PMI-RMP", "PMI-SP",
  
  // ITIL
  "ITIL",
  
  // Virtualization
  "VCP", "VCAP", "VCDX",
  
  // Linux
  "RHCSA", "RHCE", "RHCA", "LPIC-1", "LPIC-2", "LPIC-3",
  
  // Programming
  "PCEP", "PCAP", "PCPP", "CIW",
  
  // Database
  "DBA",
  
  // DevOps & Cloud
  "AWS", "Azure", "GCP",
  
  // Networking
  "Network", "CBNE", "CBNT",
  
  // Broadcast Engineering
  "CRO", "CTO", "CBT", "CEA", "CBTE", "CSRE", "CSTE", "CPBE", "CSBE", "CBRTE", "CSRTE",
  
  // Engineering Software
  "CSE", "CSEP",
  
  // Information Systems
  "GISP", "ICCM-D", "ICCM-F",
  
  // Other IT
  "SMIEEE", "GSMIEEE", "AMIEEE", "MIEEE", "FIEEE", "SIIE"
] as const;

export type TechnologyCredential = typeof TECHNOLOGY_CREDENTIALS[number];
