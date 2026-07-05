"use client";

import * as React from "react";

const PRIMARY = "#E8507A";
const ACCENT = "#F9A86C";

export function AreaChart({
  data,
  height = 220,
  color = PRIMARY,
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const width = 640;
  const pad = { top: 16, right: 12, bottom: 26, left: 12 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const max = maxVal * 1.1;
  const min = 0;
  const span = data.length > 1 ? data.length - 1 : 1;
  const points = data.map((d, i) => {
    const x = pad.left + (i / span) * w;
    const y = pad.top + h - ((d.value - min) / (max - min)) * h;
    return { x, y, ...d };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pad.left},${pad.top + h} ${line} ${pad.left + w},${pad.top + h}`;
  const id = React.useId();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.left}
          x2={pad.left + w}
          y1={pad.top + h * f}
          y2={pad.top + h * f}
          stroke="#EDE0E5"
          strokeDasharray="4 4"
        />
      ))}
      <polygon points={area} fill={`url(#grad-${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill="#fff" stroke={color} strokeWidth={2} />
          {i % 2 === 0 && (
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#9E8A93"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function BarChart({
  data,
  height = 220,
  color = PRIMARY,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const width = 640;
  const pad = { top: 16, right: 12, bottom: 26, left: 12 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1) * 1.1;
  const barW = data.length > 0 ? (w / data.length) * 0.6 : w;
  const gap = data.length > 0 ? (w / data.length) * 0.4 : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.left}
          x2={pad.left + w}
          y1={pad.top + h * f}
          y2={pad.top + h * f}
          stroke="#EDE0E5"
          strokeDasharray="4 4"
        />
      ))}
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = pad.left + i * (barW + gap) + gap / 2;
        const y = pad.top + h - bh;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx={4}
              fill={color}
              opacity={0.85}
            />
            {i % 2 === 0 && (
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#9E8A93"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({
  data,
  size = 180,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2;
  const stroke = 22;
  const r = radius - stroke / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * circ;
            const el = (
              <circle
                key={i}
                cx={radius}
                cy={radius}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text
          x={radius}
          y={radius - 4}
          textAnchor="middle"
          fontSize="22"
          fontWeight="600"
          fill="#1A1118"
        >
          {total}
        </text>
        <text
          x={radius}
          y={radius + 16}
          textAnchor="middle"
          fontSize="11"
          fill="#9E8A93"
        >
          total
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-nexa-ink-2">{d.label}</span>
            <span className="text-nexa-ink-4">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({
  data,
  color = PRIMARY,
  width = 120,
  height = 36,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((v, i) => {
      const span = data.length > 1 ? data.length - 1 : 1;
      const x = (i / span) * width;
      const y = height - ((v - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HBar({
  value,
  max,
  color = PRIMARY,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-nexa-bg-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export { PRIMARY, ACCENT };
