export const ALL_WORLD_COUNTRIES: string[] = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Brazzaville)",
  "Congo (Kinshasa)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor (Timor-Leste)",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast (Côte d'Ivoire)",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macau",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar (Burma)",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];

const NATIONALITY_TO_COUNTRY_MAP: Record<string, string> = {
  nepal: "Nepal",
  nepali: "Nepal",
  nepalese: "Nepal",
  
  india: "India",
  indian: "India",
  
  china: "China",
  chinese: "China",
  
  bangladesh: "Bangladesh",
  bangladeshi: "Bangladesh",
  
  pakistan: "Pakistan",
  pakistani: "Pakistan",
  
  "sri lanka": "Sri Lanka",
  "sri lankan": "Sri Lanka",
  srilankan: "Sri Lanka",
  
  philippines: "Philippines",
  filipino: "Philippines",
  pinoy: "Philippines",
  
  vietnam: "Vietnam",
  vietnamese: "Vietnam",
  
  thailand: "Thailand",
  thai: "Thailand",
  
  indonesia: "Indonesia",
  indonesian: "Indonesia",
  
  malaysia: "Malaysia",
  malaysian: "Malaysia",
  
  malta: "Malta",
  maltese: "Malta",
  
  georgia: "Georgia",
  georgian: "Georgia",
  
  "united states": "United States",
  "united states of america": "United States",
  usa: "United States",
  us: "United States",
  american: "United States",
  
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  gb: "United Kingdom",
  britain: "United Kingdom",
  british: "United Kingdom",
  english: "United Kingdom",
  
  "united arab emirates": "United Arab Emirates",
  uae: "United Arab Emirates",
  emirati: "United Arab Emirates",
  
  australia: "Australia",
  australian: "Australia",
  aussie: "Australia",
  
  canada: "Canada",
  canadian: "Canada",
  
  germany: "Germany",
  german: "Germany",
  
  france: "France",
  french: "France",
  
  spain: "Spain",
  spanish: "Spain",
  
  italy: "Italy",
  italian: "Italy",
  
  japan: "Japan",
  japanese: "Japan",
  
  "south korea": "South Korea",
  korean: "South Korea",
  
  nigeria: "Nigeria",
  nigerian: "Nigeria",
  
  kenya: "Kenya",
  kenyan: "Kenya",
  
  ghana: "Ghana",
  ghanaian: "Ghana",
  
  brazil: "Brazil",
  brazilian: "Brazil",
  
  russia: "Russia",
  russian: "Russia",
  
  turkey: "Turkey",
  turkish: "Turkey",

  egypt: "Egypt",
  egyptian: "Egypt",

  mexico: "Mexico",
  mexican: "Mexico",

  colombia: "Colombia",
  colombian: "Colombia"
};

/**
 * Normalizes any nationality string or demonym (e.g., "Nepalese", "NEPALI", "Indian")
 * into its official country name (e.g., "Nepal", "India").
 */
export function normalizeNationalityToCountry(input?: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase();

  // 1. Direct dictionary match
  if (NATIONALITY_TO_COUNTRY_MAP[key]) {
    return NATIONALITY_TO_COUNTRY_MAP[key];
  }

  // 2. Exact match in ALL_WORLD_COUNTRIES
  const exactMatch = ALL_WORLD_COUNTRIES.find(c => c.toLowerCase() === key);
  if (exactMatch) return exactMatch;

  // 3. Partial / Substring match against official country names
  for (const country of ALL_WORLD_COUNTRIES) {
    const cLow = country.toLowerCase();
    if (key.includes(cLow) || cLow.includes(key)) {
      return country;
    }
  }

  // 4. Return trimmed string if unmatched
  return trimmed;
}

/**
 * Returns a strictly deduplicated, alphabetically sorted list of official country names.
 * Translates any raw input nationalities into official country names to ensure no demonym duplicates exist.
 */
export function getDeduplicatedCountries(additionalInputs: string[] = []): string[] {
  const map = new Map<string, string>();

  // Add all standard world countries
  ALL_WORLD_COUNTRIES.forEach(country => {
    const trimmed = country.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!map.has(key)) {
      map.set(key, trimmed);
    }
  });

  // Map any additional student nationalities to official country names
  additionalInputs.forEach(input => {
    if (!input) return;
    const normalized = normalizeNationalityToCountry(input);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  });

  // Return sorted list of standard country names
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
