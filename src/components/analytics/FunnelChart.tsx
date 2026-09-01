'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface FunnelItem {
  label: string;
  value: number | string;
  color?: string;
}

export interface FunnelChartProps {
  data: FunnelItem[];
  onItemClick?: (item: FunnelItem) => void;
  activeFilter?: { type: string; value: string } | null;
}

const STAGE_THEMES: Record<string, {
  from: string;
  mid: string;
  to: string;
  glow: string;
  rim: string;
  badgeBg: string;
}> = {
  submitted: {
    from: '#38BDF8',
    mid: '#2563EB',
    to: '#1E40AF',
    glow: 'rgba(56, 189, 248, 0.45)',
    rim: 'rgba(147, 197, 253, 0.85)',
    badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  },
  incomplete: {
    from: '#FBBF24',
    mid: '#EA580C',
    to: '#9A3412',
    glow: 'rgba(251, 191, 36, 0.45)',
    rim: 'rgba(253, 230, 138, 0.85)',
    badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  },
  'interview pending': {
    from: '#C084FC',
    mid: '#9333EA',
    to: '#581C87',
    glow: 'rgba(192, 132, 252, 0.45)',
    rim: 'rgba(233, 213, 255, 0.85)',
    badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
  },
  withdrawn: {
    from: '#94A3B8',
    mid: '#64748B',
    to: '#334155',
    glow: 'rgba(148, 163, 184, 0.45)',
    rim: 'rgba(226, 232, 240, 0.85)',
    badgeBg: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
  },
  rejected: {
    from: '#FB7185',
    mid: '#E11D48',
    to: '#881337',
    glow: 'rgba(251, 113, 133, 0.45)',
    rim: 'rgba(254, 205, 211, 0.85)',
    badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
  },
  approved: {
    from: '#34D399',
    mid: '#059669',
    to: '#064E3B',
    glow: 'rgba(52, 211, 153, 0.45)',
    rim: 'rgba(167, 243, 208, 0.85)',
    badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  },
};

const DEFAULT_THEME = {
  from: '#60A5FA',
  mid: '#3B82F6',
  to: '#1D4ED8',
  glow: 'rgba(96, 165, 250, 0.45)',
  rim: 'rgba(191, 219, 254, 0.85)',
  badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
};

export function FunnelChart({ data, onItemClick, activeFilter }: FunnelChartProps) {
  const items = data.slice(0, 6);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalValue = items.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const SVG_WIDTH = 460;
  const SVG_HEIGHT = 280;
  const CENTER_X = SVG_WIDTH / 2;

  const TOP_Y = 16;
  const BOTTOM_Y = 270;
  const TOP_RX = 188;
  const TOP_RY = 18;
  const BOTTOM_RX = 56;
  const BOTTOM_RY = 8;

  const sliceHeight = (BOTTOM_Y - TOP_Y) / items.length;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      <div className="relative w-full max-w-[460px] h-full max-h-[280px] aspect-[460/280] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full overflow-visible drop-shadow-md"
          style={{ filter: 'drop-shadow(0 12px 24px rgba(15, 23, 42, 0.08))' }}
        >
          <defs>
            <linearGradient id="specular-cone-sheen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="18%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#000000" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
            </linearGradient>

            <linearGradient id="rim-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
            </linearGradient>

            <radialGradient id="top-mouth-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#1E40AF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
            </radialGradient>

            {items.map((item, idx) => {
              const key = item.label.toLowerCase().trim();
              const theme = STAGE_THEMES[key] || DEFAULT_THEME;
              const isZero = Number(item.value) === 0;

              return (
                <g key={`defs-${item.label}-${idx}`}>
                  <linearGradient id={`grad-slice-${idx}`} x1="0%" y1="0%" x2="100%" y2="80%">
                    <stop offset="0%" stopColor={isZero ? '#94A3B8' : theme.from} stopOpacity="0.92" />
                    <stop offset="45%" stopColor={isZero ? '#64748B' : theme.mid} stopOpacity="0.88" />
                    <stop offset="100%" stopColor={isZero ? '#475569' : theme.to} stopOpacity="0.95" />
                  </linearGradient>

                  <filter id={`glow-slice-${idx}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={theme.from} floodOpacity="0.5" />
                  </filter>
                </g>
              );
            })}
          </defs>

          <ellipse
            cx={CENTER_X}
            cy={TOP_Y + 10}
            rx={TOP_RX + 8}
            ry={TOP_RY + 4}
            fill="none"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="4"
            className="animate-pulse"
          />

          {items.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            const isFilterActive =
              activeFilter?.type === 'funnel' &&
              activeFilter?.value?.toLowerCase().trim() === item.label.toLowerCase().trim();

            const isZero = Number(item.value) === 0;
            const key = item.label.toLowerCase().trim();
            const theme = STAGE_THEMES[key] || DEFAULT_THEME;

            const tTop = idx / items.length;
            const tBottom = (idx + 1) / items.length;

            const yTop = TOP_Y + idx * sliceHeight;
            const yBottom = TOP_Y + (idx + 1) * sliceHeight;

            const rxTop = TOP_RX - tTop * (TOP_RX - BOTTOM_RX);
            const ryTop = TOP_RY - tTop * (TOP_RY - BOTTOM_RY);

            const rxBottom = TOP_RX - tBottom * (TOP_RX - BOTTOM_RX);
            const ryBottom = TOP_RY - tBottom * (TOP_RY - BOTTOM_RY);

            const leftTopX = CENTER_X - rxTop;
            const rightTopX = CENTER_X + rxTop;
            const leftBottomX = CENTER_X - rxBottom;
            const rightBottomX = CENTER_X + rxBottom;

            const pathData = `
              M ${leftTopX} ${yTop}
              A ${rxTop} ${ryTop} 0 0 0 ${rightTopX} ${yTop}
              L ${rightBottomX} ${yBottom}
              A ${rxBottom} ${ryBottom} 0 0 1 ${leftBottomX} ${yBottom}
              Z
            `;

            const midY = (yTop + yBottom) / 2 + (ryTop + ryBottom) / 4;

            return (
              <g
                key={item.label}
                className="cursor-pointer transition-all duration-300"
                onClick={() => onItemClick?.(item)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  transformOrigin: `${CENTER_X}px ${midY}px`,
                  filter: isHovered || isFilterActive ? `url(#glow-slice-${idx})` : undefined,
                }}
              >
                <path
                  d={pathData}
                  fill={`url(#grad-slice-${idx})`}
                  className="transition-all duration-300"
                  style={{
                    opacity: isZero ? 0.45 : isHovered ? 1 : 0.88,
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: `${CENTER_X}px ${midY}px`,
                  }}
                />

                <path
                  d={pathData}
                  fill="url(#specular-cone-sheen)"
                  className="pointer-events-none"
                  style={{
                    mixBlendMode: 'overlay',
                    opacity: isHovered ? 0.75 : 0.5,
                  }}
                />

                <path
                  d={`M ${leftBottomX} ${yBottom} A ${rxBottom} ${ryBottom} 0 0 0 ${rightBottomX} ${yBottom}`}
                  fill="none"
                  stroke={isHovered || isFilterActive ? '#FFFFFF' : theme.rim}
                  strokeWidth={isHovered || isFilterActive ? 2 : 1.25}
                  strokeOpacity={isHovered || isFilterActive ? 0.95 : 0.65}
                  className="pointer-events-none transition-all duration-300"
                />

                <g className="pointer-events-none">
                  <text
                    x={CENTER_X}
                    y={midY - 4}
                    textAnchor="middle"
                    className="text-[9px] font-extrabold uppercase tracking-wider fill-white drop-shadow-md"
                    style={{
                      fontFamily: 'Inter, system-ui, sans-serif',
                      letterSpacing: '0.08em',
                      opacity: isZero ? 0.6 : 0.95,
                    }}
                  >
                    {item.label}
                  </text>

                  <text
                    x={CENTER_X}
                    y={midY + 11}
                    textAnchor="middle"
                    className="text-sm font-black fill-white drop-shadow-md"
                    style={{
                      fontFamily: 'Plus Jakarta Sans, Outfit, sans-serif',
                      letterSpacing: '-0.02em',
                      opacity: isZero ? 0.6 : 1,
                    }}
                  >
                    {item.value}
                  </text>
                </g>
              </g>
            );
          })}

          <g className="pointer-events-none">
            <ellipse
              cx={CENTER_X}
              cy={TOP_Y}
              rx={TOP_RX}
              ry={TOP_RY}
              fill="url(#top-mouth-gradient)"
              stroke="url(#rim-gradient)"
              strokeWidth="2"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                opacity: 0.95,
              }}
            />

            <ellipse
              cx={CENTER_X}
              cy={TOP_Y - 1}
              rx={TOP_RX - 3}
              ry={TOP_RY - 2}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeOpacity="0.6"
              strokeDasharray="80 300"
            />
          </g>
        </svg>

        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute -bottom-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none z-30"
            >
              <span className="text-[10px] font-bold text-slate-300">
                {items[hoveredIdx].label}:
              </span>
              <span className="text-[11px] font-extrabold text-white">
                {items[hoveredIdx].value}
              </span>
              {totalValue > 0 && (
                <span className="text-[9px] font-bold text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded-md border border-sky-800/40">
                  {Math.round(((Number(items[hoveredIdx].value) || 0) / totalValue) * 100)}%
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}