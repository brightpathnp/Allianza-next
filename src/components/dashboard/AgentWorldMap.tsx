'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Globe, Compass, Plus, Minus } from 'lucide-react';

interface AgentLocation {
  id: string;
  country: string;
  percentage: number;
  color: string;
  dotsColor: string;
  count: number;
  coords: { x: number; y: number };
}

export default function AgentWorldMap() {
  const [zoom, setZoom] = useState(1);

  const locations: AgentLocation[] = [
    {
      id: "usa",
      country: "USA",
      percentage: 81,
      color: "bg-pink-550",
      dotsColor: "#F43F5E",
      count: 14,
      coords: { x: 130, y: 110 }
    },
    {
      id: "latvia",
      country: "Latvia",
      percentage: 55,
      color: "bg-amber-500",
      dotsColor: "#F59E0B",
      count: 6,
      coords: { x: 335, y: 88 }
    },
    {
      id: "brazil",
      country: "Brazil",
      percentage: 42,
      color: "bg-cyan-500",
      dotsColor: "#06B6D4",
      count: 9,
      coords: { x: 215, y: 195 }
    },
    {
      id: "australia",
      country: "Australia",
      percentage: 58,
      color: "bg-indigo-500",
      dotsColor: "#6366F1",
      count: 8,
      coords: { x: 495, y: 215 }
    }
  ];

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.8));

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xs flex flex-col space-y-6">
      
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-800 tracking-tight">Visitors from country</h2>
          <p className="text-sm font-medium text-slate-400">Visitors all over the world</p>
        </div>
        <div className="px-3.5 py-1.5 bg-[#F0F5FD] text-[#0059E7] rounded-full text-xs font-bold font-mono tracking-wider flex items-center gap-1.5">
          <Globe size={13} className="animate-spin-slow" />
          ACTIVE DOMAIN NETWORKS
        </div>
      </div>

      <div className="relative border border-slate-50 bg-[#FBFDFF] rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center p-4">
        
        <div className="absolute right-6 top-6 flex flex-col gap-2 z-10">
          <button 
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom In"
            className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-[#0059E7] transition-all cursor-pointer font-bold shrink-0"
          >
            <Plus size={16} />
          </button>
          <button 
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-[#0059E7] transition-all cursor-pointer font-bold shrink-0"
          >
            <Minus size={16} />
          </button>
        </div>

        <div className="w-full max-w-4xl overflow-hidden flex items-center justify-center">
          <svg 
            viewBox="0 0 600 300"
            className="w-full h-auto transition-transform duration-300 select-none ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            <g id="world-map-continents" fill="#E2EAF8" opacity="0.85">
              
              <path d="M40,55 L75,55 L90,40 L100,55 L95,65 L110,65 L125,50 L140,55 L165,65 L180,60 L200,85 L180,105 L150,110 L140,120 L120,115 L105,100 L80,105 L50,90 Z" />
              <path d="M125,30 L155,25 L160,40 L140,45 Z" fill="#E2EAF8" />
              
              <path d="M140,123 L152,128 L155,140 L165,145 L170,165 L190,175 L210,185 L225,200 L212,215 L200,210 L195,225 L185,255 L178,285 L170,285 L165,240 L155,205 L145,170 L135,145 L135,130 Z" />
              
              <path d="M260,118 L285,110 L315,115 L335,120 L350,140 L355,160 L350,180 L330,215 L320,235 L315,255 L310,265 L300,260 L292,235 L285,210 L275,190 L260,185 L250,175 L245,155 L252,140 Z" />
              <path d="M344,208 L355,215 L352,235 L340,225 Z" />

              <path d="M255,115 L260,95 L250,85 L265,75 L280,85 L300,80 L315,65 L325,85 L350,75 L380,70 L410,65 L445,65 L480,55 L530,60 L540,75 L530,95 L500,105 L505,120 L515,115 L525,125 L500,140 L480,140 L470,150 L455,135 L445,145 L415,142 L400,155 L382,150 L355,135 L338,118 L320,120 L295,115 L280,119 L262,118 Z" />
              
              <path d="M440,160 L452,165 L445,172 Z" />
              <path d="M465,165 L478,168 L475,178 L460,172 Z" />
              <path d="M485,168 L496,174 L490,182 L480,175 Z" />
              
              <path d="M465,225 L490,210 L515,215 L530,228 L518,255 L495,258 L482,252 L465,240 Z" />
              <path d="M515,268 L525,272 L520,278 Z" />
            </g>

            <g id="active-countries" fill="#CBE0FF">
              <path d="M68,78 L100,75 L145,75 L165,82 L150,110 L140,115 L120,115 L108,100 L80,104 Z" />
              <path d="M170,165 L190,175 L210,185 L225,200 L212,215 L200,210 L195,225 L182,215 L170,195 L165,180 Z" />
              <path d="M315,65 L328,70 L335,78 L330,88 L320,85 L312,78 Z" />
              <path d="M465,225 L490,210 L515,215 L530,228 L518,255 L495,258 L482,252 L465,240 Z" />
            </g>

            {locations.map((loc) => {
              return (
                <g key={loc.id} className="cursor-pointer group/pin">
                  <circle 
                    cx={loc.coords.x} 
                    cy={loc.coords.y} 
                    r="9" 
                    fill={loc.dotsColor} 
                    opacity="0.25"
                    className="transition-all duration-300 group-hover/pin:r-12 group-hover/pin:opacity-50"
                  />
                  <circle 
                    cx={loc.coords.x} 
                    cy={loc.coords.y} 
                    r="7" 
                    fill="white"
                    opacity="0.9"
                  />
                  <circle 
                    cx={loc.coords.x} 
                    cy={loc.coords.y} 
                    r="5" 
                    fill={loc.dotsColor}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="bg-[#EBF3FF] rounded-[22px] p-6 border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700 tracking-tight">USA</span>
              <span className="font-semibold text-slate-500">81%</span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-1000" 
                style={{ width: '81%' }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700 tracking-tight">Australia</span>
              <span className="font-semibold text-slate-500">58%</span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#6366F1] rounded-full transition-all duration-1000" 
                style={{ width: '58%' }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700 tracking-tight">Brazil</span>
              <span className="font-semibold text-slate-500">42%</span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-1000" 
                style={{ width: '42%' }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700 tracking-tight">Latvia</span>
              <span className="font-semibold text-slate-500">55%</span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#F59E0B] rounded-full transition-all duration-1000" 
                style={{ width: '55%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}