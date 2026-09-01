'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Globe, Compass, ShieldCheck, Info } from 'lucide-react';

export interface RecruitmentNode {
  id: string;
  name: string;
  city: string;
  country: string;
  coordinates: [number, number];
  status: string;
  agentsCount?: number;
  studentsApproved?: number;
  capital?: string;
  type?: 'primary' | 'partner' | 'hub';
}

export interface InteractiveGlobalMapProps {
  nodes?: RecruitmentNode[];
  customNodes?: RecruitmentNode[];
  onNodeSelect?: (node: RecruitmentNode) => void;
  className?: string;
}

export interface ContinentInfo {
  id: string;
  name: string;
  isoCodes: string[];
  color: string;
}

export const COUNTRY_GEO_REGISTRY: Record<string, { city: string; capital: string; coordinates: [number, number]; regionName?: string }> = {
  nepal: { city: 'Kathmandu', capital: 'Kathmandu', coordinates: [85.3240, 27.7172], regionName: 'South Asia Liaison Central' },
  india: { city: 'New Delhi', capital: 'New Delhi', coordinates: [77.2090, 28.6139], regionName: 'India Operations Hub' },
  'united kingdom': { city: 'London', capital: 'London', coordinates: [-0.1276, 51.5074], regionName: 'UK & European Liaison' },
  uk: { city: 'London', capital: 'London', coordinates: [-0.1276, 51.5074], regionName: 'UK & European Liaison' },
  'united states': { city: 'Washington, D.C.', capital: 'Washington, D.C.', coordinates: [-77.0369, 38.9072], regionName: 'Americas Academic Network' },
  usa: { city: 'Washington, D.C.', capital: 'Washington, D.C.', coordinates: [-77.0369, 38.9072], regionName: 'Americas Academic Network' },
  us: { city: 'Washington, D.C.', capital: 'Washington, D.C.', coordinates: [-77.0369, 38.9072], regionName: 'Americas Academic Network' },
  nigeria: { city: 'Abuja', capital: 'Abuja', coordinates: [7.4951, 9.0579], regionName: 'West Africa Partner Node' },
  kenya: { city: 'Nairobi', capital: 'Nairobi', coordinates: [36.8219, -1.2921], regionName: 'East Africa Recruitment Center' },
  uae: { city: 'Abu Dhabi', capital: 'Abu Dhabi', coordinates: [54.3773, 24.4539], regionName: 'MENA Regional Office' },
  'united arab emirates': { city: 'Abu Dhabi', capital: 'Abu Dhabi', coordinates: [54.3773, 24.4539], regionName: 'MENA Regional Office' },
  dubai: { city: 'Dubai', capital: 'Abu Dhabi', coordinates: [55.2708, 25.2048], regionName: 'MENA Regional Office' },
  malta: { city: 'Valletta', capital: 'Valletta', coordinates: [14.5146, 35.8989], regionName: 'Malta Central Node' },
  latvia: { city: 'Riga', capital: 'Riga', coordinates: [24.1052, 56.9496], regionName: 'Baltic Operations Office' },
  australia: { city: 'Canberra', capital: 'Canberra', coordinates: [149.1300, -35.2809], regionName: 'Oceania Strategic Center' },
  japan: { city: 'Tokyo', capital: 'Tokyo', coordinates: [139.6917, 35.6895], regionName: 'East Asia Gateway' },
  brazil: { city: 'Brasília', capital: 'Brasília', coordinates: [-47.8825, -15.7942], regionName: 'LATAM Education Bureau' },
  pakistan: { city: 'Islamabad', capital: 'Islamabad', coordinates: [73.0479, 33.6844], regionName: 'South Asia Partner Node' },
  bangladesh: { city: 'Dhaka', capital: 'Dhaka', coordinates: [90.4125, 23.8103], regionName: 'Bangladesh Recruitment Hub' },
  'sri lanka': { city: 'Colombo', capital: 'Colombo', coordinates: [79.8612, 6.9271], regionName: 'Sri Lanka Liaison Center' },
  philippines: { city: 'Manila', capital: 'Manila', coordinates: [120.9842, 14.5995], regionName: 'Southeast Asia Partner Node' },
  vietnam: { city: 'Hanoi', capital: 'Hanoi', coordinates: [105.8342, 21.0278], regionName: 'Indochina Admissions Desk' },
  ghana: { city: 'Accra', capital: 'Accra', coordinates: [-0.1870, 5.6037], regionName: 'West Africa Liaison' },
  germany: { city: 'Berlin', capital: 'Berlin', coordinates: [13.4050, 52.5200], regionName: 'Central Europe Bureau' },
  france: { city: 'Paris', capital: 'Paris', coordinates: [2.3522, 48.8566], regionName: 'Western Europe Office' },
  spain: { city: 'Madrid', capital: 'Madrid', coordinates: [-3.7038, 40.4168], regionName: 'Iberian Admissions Hub' },
  italy: { city: 'Rome', capital: 'Rome', coordinates: [12.4964, 41.9028], regionName: 'Southern Europe Center' },
  canada: { city: 'Ottawa', capital: 'Ottawa', coordinates: [-75.6972, 45.4215], regionName: 'North America North Bureau' },
  china: { city: 'Beijing', capital: 'Beijing', coordinates: [116.4074, 39.9042], regionName: 'East Asia Central Hub' },
  'south africa': { city: 'Pretoria', capital: 'Pretoria', coordinates: [28.2293, -25.7479], regionName: 'Southern Africa Node' },
  egypt: { city: 'Cairo', capital: 'Cairo', coordinates: [31.2357, 30.0444], regionName: 'North Africa Gateway' },
  'saudi arabia': { city: 'Riyadh', capital: 'Riyadh', coordinates: [46.6753, 24.7136], regionName: 'Gulf Cooperation Bureau' },
  qatar: { city: 'Doha', capital: 'Doha', coordinates: [51.5310, 25.2854], regionName: 'Qatar Operations Node' },
  turkey: { city: 'Ankara', capital: 'Ankara', coordinates: [32.8597, 39.9334], regionName: 'Eurasia Gateway' },
  türkiye: { city: 'Ankara', capital: 'Ankara', coordinates: [32.8597, 39.9334], regionName: 'Eurasia Gateway' },
  colombia: { city: 'Bogota', capital: 'Bogota', coordinates: [-74.0721, 4.7110], regionName: 'Andean Liaison Node' },
  mexico: { city: 'Mexico City', capital: 'Mexico City', coordinates: [-99.1332, 19.4326], regionName: 'Central America Desk' },
  indonesia: { city: 'Jakarta', capital: 'Jakarta', coordinates: [106.8456, -6.2088], regionName: 'Indonesia Regional Bureau' },
  malaysia: { city: 'Kuala Lumpur', capital: 'Kuala Lumpur', coordinates: [101.6869, 3.1390], regionName: 'ASEAN Admissions Office' },
  singapore: { city: 'Singapore', capital: 'Singapore', coordinates: [103.8198, 1.3521], regionName: 'Singapore Strategic Hub' },
  thailand: { city: 'Bangkok', capital: 'Bangkok', coordinates: [100.5018, 13.7563], regionName: 'Southeast Asia Gateway' },
  'south korea': { city: 'Seoul', capital: 'Seoul', coordinates: [126.9780, 37.5665], regionName: 'Korea Liaison Bureau' },
  korea: { city: 'Seoul', capital: 'Seoul', coordinates: [126.9780, 37.5665], regionName: 'Korea Liaison Bureau' },
  'new zealand': { city: 'Wellington', capital: 'Wellington', coordinates: [174.7762, -41.2865], regionName: 'New Zealand Center' },
  morocco: { city: 'Rabat', capital: 'Rabat', coordinates: [-6.8498, 34.0209], regionName: 'Northwest Africa Desk' },
  uzbekistan: { city: 'Tashkent', capital: 'Tashkent', coordinates: [69.2401, 41.2995], regionName: 'Central Asia Partner Node' },
  kazakhstan: { city: 'Astana', capital: 'Astana', coordinates: [71.4491, 51.1694], regionName: 'Central Asia Bureau' },
  greece: { city: 'Athens', capital: 'Athens', coordinates: [23.7275, 37.9838], regionName: 'Eastern Mediterranean Hub' },
  portugal: { city: 'Lisbon', capital: 'Lisbon', coordinates: [-9.1393, 38.7223], regionName: 'Iberia Atlantic Center' },
  poland: { city: 'Warsaw', capital: 'Warsaw', coordinates: [21.0122, 52.2297], regionName: 'Central Europe Gateway' },
  netherlands: { city: 'Amsterdam', capital: 'Amsterdam', coordinates: [4.9041, 52.3676], regionName: 'Benelux Liaison' },
  switzerland: { city: 'Bern', capital: 'Bern', coordinates: [7.4474, 46.9480], regionName: 'Alpine Admissions Office' },
  sweden: { city: 'Stockholm', capital: 'Stockholm', coordinates: [18.0686, 59.3293], regionName: 'Nordic Operations Hub' },
  norway: { city: 'Oslo', capital: 'Oslo', coordinates: [10.7522, 59.9139], regionName: 'Scandinavia Desk' },
  ireland: { city: 'Dublin', capital: 'Dublin', coordinates: [-6.2603, 53.3498], regionName: 'Ireland Regional Office' },
  rwanda: { city: 'Kigali', capital: 'Kigali', coordinates: [30.0619, -1.9441], regionName: 'Central-East Africa Node' },
  uganda: { city: 'Kampala', capital: 'Kampala', coordinates: [32.5825, 0.3476], regionName: 'East Africa Gateway' },
  tanzania: { city: 'Dodoma', capital: 'Dodoma', coordinates: [35.7516, -6.1630], regionName: 'East Africa Coastal Desk' },
  zimbabwe: { city: 'Harare', capital: 'Harare', coordinates: [31.0530, -17.8252], regionName: 'Southern Africa Liaison' },
  cameroon: { city: 'Yaoundé', capital: 'Yaoundé', coordinates: [11.5167, 3.8480], regionName: 'Central Africa Hub' },
  senegal: { city: 'Dakar', capital: 'Dakar', coordinates: [-17.4441, 14.6928], regionName: 'West Africa Coastal Office' },
  ethiopia: { city: 'Addis Ababa', capital: 'Addis Ababa', coordinates: [38.7578, 8.9806], regionName: 'Horn of Africa Center' },
};

export function getCoordinatesForCountry(countryName: string, cityName?: string): { city: string; capital: string; coordinates: [number, number]; regionName: string } {
  if (!countryName) {
    return { city: cityName || 'International', capital: 'International', coordinates: [0, 20], regionName: 'Global Node' };
  }
  const clean = countryName.trim().toLowerCase();
  
  if (COUNTRY_GEO_REGISTRY[clean]) {
    const res = COUNTRY_GEO_REGISTRY[clean];
    return {
      city: cityName || res.city,
      capital: res.capital || res.city,
      coordinates: res.coordinates,
      regionName: res.regionName || `${countryName} Agency Node`
    };
  }

  for (const [key, val] of Object.entries(COUNTRY_GEO_REGISTRY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return {
        city: cityName || val.city,
        capital: val.capital || val.city,
        coordinates: val.coordinates,
        regionName: val.regionName || `${countryName} Agency Node`
      };
    }
  }

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const lng = ((Math.abs(hash) % 300) - 150);
  const lat = ((Math.abs(hash >> 3) % 100) - 40);
  return {
    city: cityName || countryName,
    capital: cityName || countryName,
    coordinates: [lng, lat],
    regionName: `${countryName} Agency Node`
  };
}

const CONTINENTS: Record<string, ContinentInfo> = {
  north_america: {
    id: 'north_america',
    name: 'North America',
    isoCodes: ['840', '124', '484', '320', '192', '332', '214', '388', '340', '558', '188', '591', '044', '084', '222', '304', '630', '136'],
    color: '#3B82F6'
  },
  south_america: {
    id: 'south_america',
    name: 'South America',
    isoCodes: ['076', '032', '170', '604', '152', '218', '068', '600', '858', '862', '328', '740', '254'],
    color: '#10B981'
  },
  europe: {
    id: 'europe',
    name: 'Europe',
    isoCodes: ['826', '250', '276', '724', '380', '616', '804', '428', '470', '528', '056', '752', '578', '246', '208', '372', '756', '040', '620', '300', '203', '348', '642', '100', '112', '440', '233', '352', '703', '191', '688', '705', '070', '008', '438', '674'],
    color: '#3B82F6'
  },
  africa: {
    id: 'africa',
    name: 'Africa',
    isoCodes: ['566', '404', '710', '288', '818', '231', '504', '012', '729', '800', '834', '024', '508', '450', '120', '384', '562', '854', '466', '686', '148', '706', '716', '894', '178', '262', '232', '430', '426', '478', '516', '646', '690', '728', '732', '768', '818', '835', '833'],
    color: '#F59E0B'
  },
  asia: {
    id: 'asia',
    name: 'Asia',
    isoCodes: ['524', '356', '050', '586', '144', '064', '462', '156', '392', '410', '408', '496', '158', '608', '704', '764', '360', '458', '702', '104', '116', '418', '784', '682', '634', '512', '414', '048', '400', '422', '376', '368', '364', '792', '398', '860', '795', '417', '762', '031', '268', '051', '626'],
    color: '#EC4899'
  },
  oceania: {
    id: 'oceania',
    name: 'Oceania',
    isoCodes: ['036', '554', '598', '242', '090', '548', '540', '882', '584', '583', '585', '520', '296', '184', '258'],
    color: '#06B6D4'
  },
  antarctica: {
    id: 'antarctica',
    name: 'Antarctica',
    isoCodes: ['010'],
    color: '#64748B'
  }
};

function getContinentId(isoCode: string | number, countryName?: string): string {
  if (isoCode !== undefined && isoCode !== null) {
    const codeStr = String(isoCode).padStart(3, '0');
    for (const [key, info] of Object.entries(CONTINENTS)) {
      if (info.isoCodes.includes(codeStr)) {
        return key;
      }
    }
  }

  if (typeof countryName === 'string' && countryName) {
    const c = countryName.toLowerCase();
    if (c.includes('united states') || c.includes('canada') || c.includes('mexico')) return 'north_america';
    if (c.includes('brazil') || c.includes('argentina') || c.includes('colombia') || c.includes('chile')) return 'south_america';
    if (c.includes('uk') || c.includes('kingdom') || c.includes('france') || c.includes('germany') || c.includes('spain') || c.includes('italy') || c.includes('malta') || c.includes('latvia') || c.includes('europe')) return 'europe';
    if (c.includes('nigeria') || c.includes('kenya') || c.includes('south africa') || c.includes('ghana') || c.includes('egypt') || c.includes('africa')) return 'africa';
    if (c.includes('nepal') || c.includes('india') || c.includes('china') || c.includes('japan') || c.includes('korea') || c.includes('uae') || c.includes('pakistan') || c.includes('bangladesh') || c.includes('philippines') || c.includes('asia')) return 'asia';
    if (c.includes('australia') || c.includes('zealand') || c.includes('fiji') || c.includes('oceania')) return 'oceania';
  }

  if (isoCode !== undefined && isoCode !== null) {
    const num = parseInt(String(isoCode), 10);
    if (num >= 800 && num <= 899) return 'north_america';
    if (num >= 300 && num <= 399) return 'europe';
    if (num >= 400 && num <= 599) return 'asia';
  }

  return 'asia';
}

export default function InteractiveGlobalMap({
  nodes,
  customNodes,
  onNodeSelect,
  className = ''
}: InteractiveGlobalMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState<boolean>(true);
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: RecruitmentNode; x: number; y: number; isTopEdge?: boolean } | null>(null);
  const [hoveredContinentDetails, setHoveredContinentDetails] = useState<{ name: string; count: number; x: number; y: number; isTopEdge?: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const allNodes = useMemo(() => {
    if (nodes !== undefined) return nodes;
    if (customNodes !== undefined) return customNodes;
    return [];
  }, [nodes, customNodes]);

  const projection = useMemo(() => {
    return d3.geoNaturalEarth1()
      .scale(215)
      .translate([480, 265]);
  }, []);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  useEffect(() => {
    let isMounted = true;
    
    async function loadMapData() {
      try {
        setLoadingMap(true);
        const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        if (!response.ok) throw new Error('CDN map fetch failed');
        const topology = await response.json();
        
        if (isMounted) {
          const geojson: any = topojson.feature(topology, topology.objects.countries as any);
          if (geojson && Array.isArray(geojson.features)) {
            geojson.features = geojson.features.filter((f: any) => String(f.id) !== '010' && f.properties?.name !== 'Antarctica');
          }
          setGeoData(geojson);
          setLoadingMap(false);
        }
      } catch (err) {
        console.warn('Primary TopoJSON CDN failed, attempting secondary mirror...', err);
        try {
          const res2 = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
          if (!res2.ok) throw new Error('Secondary CDN failed');
          const topology2 = await res2.json();
          if (isMounted) {
            const geojson2: any = topojson.feature(topology2, topology2.objects.countries as any);
            if (geojson2 && Array.isArray(geojson2.features)) {
              geojson2.features = geojson2.features.filter((f: any) => String(f.id) !== '010' && f.properties?.name !== 'Antarctica');
            }
            setGeoData(geojson2);
            setLoadingMap(false);
          }
        } catch (err2) {
          console.error('All GeoJSON CDNs failed', err2);
          if (isMounted) setLoadingMap(false);
        }
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  const continentNodeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      north_america: 0,
      south_america: 0,
      europe: 0,
      africa: 0,
      asia: 0,
      oceania: 0,
      antarctica: 0
    };

    if (Array.isArray(allNodes)) {
      allNodes.forEach(node => {
        if (!node) return;
        const cId = getContinentId(0, node.country);
        if (counts[cId] !== undefined) {
          counts[cId] += (node.agentsCount || 1);
        }
      });
    }

    return counts;
  }, [allNodes]);

  const handleContinentMouseEnter = (evt: React.MouseEvent<SVGPathElement>, feature: any) => {
    if (!feature) return;
    const continentId = getContinentId(feature.id, feature.properties?.name);
    setHoveredContinent(continentId);

    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const cInfo = CONTINENTS[continentId];
      if (cInfo) {
        const width = rect.width;
        const height = rect.height;
        const rawX = evt.clientX - rect.left;
        const rawY = evt.clientY - rect.top;
        const clampedX = Math.max(90, Math.min(width - 90, rawX));
        const isTopEdge = rawY < 90;
        const clampedY = isTopEdge ? Math.min(height - 50, rawY + 12) : Math.max(10, rawY - 8);

        setHoveredContinentDetails({
          name: cInfo.name,
          count: continentNodeCounts[continentId] || 0,
          x: clampedX,
          y: clampedY,
          isTopEdge
        });
      }
    }
  };

  const handleContinentMouseMove = (evt: React.MouseEvent<SVGPathElement>) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = rect.width;
      const height = rect.height;
      const rawX = evt.clientX - rect.left;
      const rawY = evt.clientY - rect.top;
      const clampedX = Math.max(90, Math.min(width - 90, rawX));
      const isTopEdge = rawY < 90;
      const clampedY = isTopEdge ? Math.min(height - 50, rawY + 12) : Math.max(10, rawY - 8);

      setHoveredContinentDetails(prev => prev ? {
        ...prev,
        x: clampedX,
        y: clampedY,
        isTopEdge
      } : null);
    }
  };

  const handleContinentMouseLeave = () => {
    setHoveredContinent(null);
    setHoveredContinentDetails(null);
  };

  const handleNodeMouseEnter = (evt: React.MouseEvent<SVGGElement>, node: RecruitmentNode) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = rect.width;
      const height = rect.height;
      const rawX = evt.clientX - rect.left;
      const rawY = evt.clientY - rect.top;

      const clampedX = Math.max(105, Math.min(width - 105, rawX));

      const isTopEdge = rawY < 110;
      const clampedY = isTopEdge ? Math.min(height - 75, rawY + 12) : Math.max(10, rawY - 8);

      setHoveredNode({
        node,
        x: clampedX,
        y: clampedY,
        isTopEdge
      });
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
  };

  const defaultClasses = "bg-white border border-slate-200/80 rounded-[1.75rem] overflow-hidden shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] p-4 sm:p-6 text-slate-900 font-sans";

  return (
    <div 
      ref={containerRef}
      className={`relative ${className || defaultClasses}`}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold font-outfit text-slate-900 tracking-tight">Global Partner Map</h3>
            <span className="bg-blue-50 text-grad-blue border border-blue-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-grad-blue animate-pulse"></span>
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Agency nodes and continental agent allocation
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span className="text-slate-600 text-[11px]">Agency Node</span>
          </div>
          <div className="w-px h-3 bg-slate-200"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 border border-slate-400"></span>
            <span className="text-slate-500 text-[11px]">Active Continent</span>
          </div>
        </div>
      </div>

      <div 
        ref={mapContainerRef}
        className="relative w-full h-[350px] sm:h-[400px] lg:h-[430px] bg-slate-50/70 rounded-2xl border border-slate-200/70 overflow-hidden flex items-center justify-center"
      >
        
        {loadingMap ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <Globe className="w-8 h-8 text-blue-500 animate-spin-slow" />
            <span className="text-xs font-semibold tracking-wider uppercase">Loading Geographic Atlas...</span>
          </div>
        ) : (
          <svg
            className="w-full h-full select-none"
            viewBox="0 0 960 500"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="light-map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(203, 213, 225, 0.4)" strokeWidth="0.5" />
              </pattern>
              
              <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <rect width="960" height="500" fill="url(#light-map-grid)" />

            <g id="map-continents">
              {geoData?.features?.map((feature: any, idx: number) => {
                const pathD = pathGenerator(feature);

                if (!pathD) return null;

                return (
                  <path
                    key={`geo-${feature.id || idx}`}
                    d={pathD}
                    fill="#CBD5E1"
                    fillOpacity={0.85}
                    stroke="#94A3B8"
                    strokeWidth={0.6}
                    strokeLinejoin="round"
                  >
                    <title>{feature.properties?.name || 'Region'}</title>
                  </path>
                );
              })}
            </g>

            <g id="map-nodes">
              {allNodes.map((node) => {
                const projected = projection(node.coordinates);
                if (!projected) return null;
                const [x, y] = projected;

                const isNodeHovered = hoveredNode?.node.id === node.id;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    transform={`translate(${x}, ${y})`}
                    onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
                    onMouseLeave={handleNodeMouseLeave}
                    onClick={() => onNodeSelect && onNodeSelect(node)}
                  >
                    <circle
                      r={isNodeHovered ? 12 : 7}
                      fill="#3B82F6"
                      opacity={isNodeHovered ? 0.45 : 0.2}
                      className="transition-all duration-300"
                    />

                    <circle
                      r={isNodeHovered ? 7.5 : 5}
                      fill="#2563EB"
                      opacity={isNodeHovered ? 0.6 : 0.35}
                      className="transition-all duration-300"
                    />

                    <circle
                      r={isNodeHovered ? 5 : 3.5}
                      fill="#60A5FA"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                      filter="url(#node-glow)"
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        <AnimatePresence>
          {hoveredContinentDetails && !hoveredNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: hoveredContinentDetails.isTopEdge ? -4 : 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: hoveredContinentDetails.isTopEdge ? -4 : 4 }}
              transition={{ duration: 0.12 }}
              className={`absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-lg border border-slate-700/80 shadow-xl -translate-x-1/2 ${
                hoveredContinentDetails.isTopEdge ? 'translate-y-0 mt-1' : '-translate-y-full mb-1'
              }`}
              style={{
                left: `${hoveredContinentDetails.x}px`,
                top: `${hoveredContinentDetails.y}px`
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Globe size={12} className="text-blue-400 shrink-0" />
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100 whitespace-nowrap">
                  {hoveredContinentDetails.name}
                </h4>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400 font-medium">Active Partner Nodes:</span>
                <span className="font-bold text-blue-400">{hoveredContinentDetails.count}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: hoveredNode.isTopEdge ? -4 : 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: hoveredNode.isTopEdge ? -4 : 4 }}
              transition={{ duration: 0.12 }}
              className={`absolute z-40 pointer-events-none bg-slate-950/95 backdrop-blur-md text-white px-3.5 py-3 rounded-xl border border-blue-500/40 shadow-2xl -translate-x-1/2 min-w-[190px] max-w-[230px] ${
                hoveredNode.isTopEdge ? 'translate-y-0 mt-1' : '-translate-y-full mb-1'
              }`}
              style={{
                left: `${hoveredNode.x}px`,
                top: `${hoveredNode.y}px`
              }}
            >
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-800">
                <MapPin size={13} className="text-blue-400 shrink-0" />
                <h4 className="text-[11px] font-extrabold text-blue-100 uppercase tracking-wider">
                  Agency Node
                </h4>
              </div>

              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-medium">Location:</span>
                  <span className="font-bold text-white truncate">{hoveredNode.node.country}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-medium">Capital:</span>
                  <span className="font-semibold text-slate-200 truncate">{hoveredNode.node.capital || hoveredNode.node.city}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-medium">Total Agents:</span>
                  <span className="font-bold text-blue-400">{hoveredNode.node.agentsCount ?? 2}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 font-medium">Students Approved:</span>
                  <span className="font-bold text-emerald-400">{hoveredNode.node.studentsApproved ?? 20}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}