export const EXCLUDED_AGENCIES = [
  "ABC Educationa Ltd",
  "ABC Consultancy",
  "Apex Education",
  "HHM Pvt Ltd",
  "UpendraHub",
  "Upendra nepal",
  "Upendra Nepal",
  "Upendra",
  "Vibe Global Pvt. Ltd.",
  "Vibe Global Pvt Ltd",
  "Vibe Global",
  "Technical University",
  "Global Code",
  "Just Abroad",
  "Just Abroad Education",
  "JustAbroad",
  "RajeshComp ABC",
  "Bright Way Pvt. Ltd.",
  "Apex Education Ltd",
  "Horizon Scholars - Office 1",
  "Pine Tree Recruiters - Office 13",
  "North Star Consultancy - Office 14",
  "Global Elite Education",
  "Himalayan Education Hub",
  "Nexus Study Solutions",
  "Oxford Academic Partners",
  "Pacific Admission Experts"
];

const normalizedExcluded = EXCLUDED_AGENCIES.map(name => name.toLowerCase().replace(/[^a-z0-9]/g, ''));

const EXCLUDED_PATTERNS = [
  'upendra',
  'vibeglobal',
  'vibe global',
  'technicaluniversity',
  'technical university',
  'globalcode',
  'global code',
  'justabroad',
  'just abroad'
];

export const shouldExcludeAgency = (agencyName?: string): boolean => {
  if (!agencyName) return false;
  const lower = agencyName.toLowerCase().trim();
  if (EXCLUDED_AGENCIES.some(ex => ex.toLowerCase() === lower)) {
    return true;
  }
  const clean = lower.replace(/[^a-z0-9]/g, '');
  if (normalizedExcluded.includes(clean)) {
    return true;
  }
  return EXCLUDED_PATTERNS.some(pattern => {
    const cleanPattern = pattern.replace(/[^a-z0-9]/g, '');
    return lower.includes(pattern) || clean.includes(cleanPattern);
  });
};
