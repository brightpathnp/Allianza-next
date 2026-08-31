import { University } from '../types';

export const isSameUniversity = (idOrName1?: string | null, idOrName2?: string | null): boolean => {
  if (!idOrName1 || !idOrName2) return false;
  const s1 = idOrName1.trim().toLowerCase();
  const s2 = idOrName2.trim().toLowerCase();
  if (s1 === s2) return true;

  // Stripped non-alphanumeric comparison
  const n1 = s1.replace(/[^a-z0-9]/g, '');
  const n2 = s2.replace(/[^a-z0-9]/g, '');
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Substring matching if both are at least 4 chars long
  if (n1.length >= 4 && n2.length >= 4) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  // Known shorthand & alias groups
  const isGCM = (s: string) => s.includes('gcm') || s.includes('global') || s.includes('malta');
  const isPBA = (s: string) => s.includes('pba') || s.includes('paris') || s.includes('academy');
  const isAscensia = (s: string) => s.includes('ascensia');

  if (isGCM(n1) && isGCM(n2)) return true;
  if (isPBA(n1) && isPBA(n2)) return true;
  if (isAscensia(n1) && isAscensia(n2)) return true;

  return false;
};

export const findMatchingAgreement = (agreements: any[], uniId?: string | null, uniName?: string | null) => {
  if (!agreements || agreements.length === 0) return null;
  return agreements.find(a => 
    (uniId && a.universityId && isSameUniversity(a.universityId, uniId)) ||
    (uniName && a.universityName && isSameUniversity(a.universityName, uniName)) ||
    (uniName && a.universityId && isSameUniversity(a.universityId, uniName)) ||
    (uniId && a.universityName && isSameUniversity(a.universityName, uniId))
  ) || null;
};

export const getUniversityName = (app: any, institutions: University[] = []): string => {
  if (app.targetUniversityName) return app.targetUniversityName;
  
  if (app.targetUniversityId === 'other') {
    return app.otherUniversityName || 'Other University';
  }

  // Common ID to Name mapping for legacy or edge cases
  const legacyMapping: Record<string, string> = {
    'uni_waterloo': 'University of Waterloo',
    'uni_toronto': 'University of Toronto',
    'uni_ubc': 'University of British Columbia',
    'uni_mcgill': 'McGill University'
  };

  if (legacyMapping[app.targetUniversityId]) {
    return legacyMapping[app.targetUniversityId];
  }

  const predefined = institutions.find(u => u.id === app.targetUniversityId || isSameUniversity(u.id, app.targetUniversityId) || isSameUniversity(u.name, app.targetUniversityId));
  if (predefined) return predefined.name;

  // Fallback: Prettify the ID if it's a string
  if (typeof app.targetUniversityId === 'string' && app.targetUniversityId) {
    // If it looks like an ID (no spaces, has hyphens/underscores)
    if (!app.targetUniversityId.includes(' ') && (app.targetUniversityId.includes('_') || app.targetUniversityId.includes('-'))) {
      return app.targetUniversityId
        .replace(/^uni[_-]/i, '') // Remove uni_ or uni- prefix
        .split(/[_-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return app.targetUniversityId;
  }

  return 'University Partner';
};
