export const normalizeCountryName = (name: string): string => {
  if (!name) return '';
  const norm = name.trim().toLowerCase();
  if (norm === 'uk' || norm === 'united kingdom' || norm === 'u.k.' || norm.includes('kingdom') || norm.includes('britain') || norm.includes('england')) return 'United Kingdom';
  if (norm === 'uae' || norm === 'united arab emirates' || norm === 'u.a.e.' || norm.includes('emirates') || norm.includes('dubai')) return 'UAE';
  if (norm === 'australia' || norm.includes('australia')) return 'Australia';
  if (norm === 'france' || norm.includes('france')) return 'France';
  if (norm === 'georgia' || norm.includes('georgia')) return 'Georgia';
  if (norm === 'malta' || norm.includes('malta')) return 'Malta';
  if (norm === 'usa' || norm === 'united states' || norm === 'u.s.' || norm === 'u.s.a.' || norm.includes('america')) return 'USA';
  if (norm === 'canada' || norm.includes('canada')) return 'Canada';
  if (norm === 'germany' || norm.includes('germany')) return 'Germany';
  if (norm === 'ireland' || norm.includes('ireland')) return 'Ireland';
  if (norm === 'new zealand' || norm.includes('zealand')) return 'New Zealand';
  if (norm === 'singapore' || norm.includes('singapore')) return 'Singapore';
  if (norm === 'cyprus' || norm.includes('cyprus')) return 'Cyprus';
  if (norm === 'spain' || norm.includes('spain')) return 'Spain';
  if (norm === 'italy' || norm.includes('italy')) return 'Italy';
  if (norm === 'switzerland' || norm.includes('switz')) return 'Switzerland';
  if (norm === 'japan' || norm.includes('japan')) return 'Japan';
  if (norm === 'malaysia' || norm.includes('malaysia')) return 'Malaysia';
  if (norm === 'india' || norm.includes('india')) return 'India';
  if (norm === 'nepal' || norm.includes('nepal')) return 'Nepal';
  return name.trim();
};

export const COUNTRY_FLAGS: Record<string, string> = {
  'UK': '🇬🇧',
  'United Kingdom': '🇬🇧',
  'Australia': '🇦🇺',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Malta': '🇲🇹',
  'Georgia': '🇬🇪',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Ireland': '🇮🇪',
  'New Zealand': '🇳🇿',
  'Singapore': '🇸🇬',
  'Cyprus': '🇨🇾',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Switzerland': '🇨🇭',
  'Japan': '🇯🇵',
  'Malaysia': '🇲🇾',
  'India': '🇮🇳',
  'Nepal': '🇳🇵',
  'UAE': '🇦🇪',
  'United Arab Emirates': '🇦🇪'
};
