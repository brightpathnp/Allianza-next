export const getCourseIntakes = (courseLevel: string | null | undefined, courseName: string | null | undefined, institution: any | null) => {
  if (!institution?.intakeSchedules) return [];
  
  const schedules = institution.intakeSchedules;
  const levelStr = (courseLevel || '').trim().toLowerCase();
  const nameStr = (courseName || '').trim().toLowerCase();
  
  // 1. If we have dynamic sections defined, try to match them intelligently
  if (schedules._sections && Array.isArray(schedules._sections)) {
    // Try to find match by title
    let section = schedules._sections.find((s: any) => s.title.toLowerCase() === levelStr);
    
    // If no exact title match, try to match by level number (e.g. "Level 6")
    if (!section) {
      const levelNumMatch = levelStr.match(/level\s*(\d)/i);
      if (levelNumMatch) {
        const num = levelNumMatch[1];
        section = schedules._sections.find((s: any) => s.title.toLowerCase().includes(`level ${num}`) || s.title.toLowerCase().includes(`level${num}`));
      }
    }

    // Fallback fuzzy match
    if (!section) {
      section = schedules._sections.find((s: any) => 
        s.title.toLowerCase().includes(levelStr) || 
        levelStr.includes(s.title.toLowerCase())
      );
    }

    if (section && schedules[section.id]) {
      return schedules[section.id];
    }
  }

  // 2. Legacy fallback for old hardcoded sections or simpler structures
  const isUg = levelStr.includes('6') || levelStr.includes('5') || levelStr.includes('diploma') || levelStr.includes('bachelor') || nameStr.includes('topup') || nameStr.includes('top-up') || levelStr.includes('level 5') || levelStr.includes('level 6');
  const isPg = levelStr.includes('7') || levelStr.includes('8') || levelStr.includes('master') || levelStr.includes('dba') || levelStr.includes('doctor') || levelStr.includes('level 7') || levelStr.includes('level 8');
  
  if (isPg && schedules.pg) return schedules.pg;
  if (isUg && schedules.ug) return schedules.ug;
  
  // 3. Fallback to generic sections
  if (schedules.ug) return schedules.ug;
  if (schedules.pg) return schedules.pg;

  // Search in any numeric keys if it's a map (dynamic sections without _sections metadata)
  const firstNonInternalKey = Object.keys(schedules).find(k => !k.startsWith('_') && k !== 'ug' && k !== 'pg');
  if (firstNonInternalKey) return schedules[firstNonInternalKey];

  return [];
};

export const getIntakeSeason = (startDateStr: string | null | undefined): string => {
  if (!startDateStr) return 'Unknown Intake';
  
  // Try to parse the date. Format could be '26 Jan 2026' or '2026-01-26' or contains '*' etc.
  // First, clean up '*'
  const cleanStr = startDateStr.replace(/\*/g, '').trim();
  
  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) {
    // maybe try to extract month name if it's strings like 'Jan', 'Feb' etc.
    const monthMatch = cleanStr.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (!monthMatch) return 'Unknown Intake';
    
    const m = monthMatch[0].toLowerCase();
    if (['jan', 'feb', 'mar'].includes(m)) return 'Spring Intake';
    if (['apr', 'may', 'jun'].includes(m)) return 'Summer Intake';
    if (['jul', 'aug', 'sep'].includes(m)) return 'Fall Intake';
    if (['oct', 'nov', 'dec'].includes(m)) return 'Winter Intake';
    return 'Unknown Intake';
  }

  const month = date.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  
  if (month >= 0 && month <= 2) return 'Spring Intake';
  if (month >= 3 && month <= 5) return 'Summer Intake';
  if (month >= 6 && month <= 8) return 'Fall Intake';
  if (month >= 9 && month <= 11) return 'Winter Intake';
  
  return 'Unknown Intake';
};

export const getIntakeSeasonWithYear = (startDateStr: string | null | undefined): string => {
  const season = getIntakeSeason(startDateStr);
  if (season === 'Unknown Intake' || !startDateStr) return season;
  
  const cleanStr = startDateStr.replace(/\*/g, '').trim();
  const date = new Date(cleanStr);
  
  if (isNaN(date.getTime())) {
    const yearMatch = cleanStr.match(/\d{4}/);
    if (yearMatch) {
      return `${season.split(' ')[0]} ${yearMatch[0]}`;
    }
    return season;
  }
  
  return `${season.split(' ')[0]} ${date.getFullYear()}`;
};

export const getFutureIntakeSeasons = (count = 4): string[] => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const seasons = [
    { name: 'Spring', startMonth: 0 },
    { name: 'Summer', startMonth: 3 },
    { name: 'Fall', startMonth: 6 },
    { name: 'Winter', startMonth: 9 }
  ];

  const currentSeasonIdx = Math.floor(currentMonth / 3);
  
  const results: string[] = [];
  let y = currentYear;
  let sIdx = currentSeasonIdx; 
  
  while (results.length < count) {
    if (sIdx > 3) {
      sIdx = 0;
      y++;
    }
    results.push(`${seasons[sIdx].name} ${y}`);
    sIdx++;
  }

  return results;
};
