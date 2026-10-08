"use client";

import { useEffect, useRef, useState } from "react";
import { MUTED, SURFACE, cr, inr } from "./format";

export type Series = { name: string; color: string; values: number[]; dashed?: boolean; lo?: number[]; hi?: number[] };

function niceStep(range: number) {
  const raw = range / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
}

export function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// x labels and the unit are plain strings so a server page can render it.
export function LineChart({ label, x, series, height = 300, unit = "crore", onHover, endLabels = true }: {
  label: string;
  x: string[];
  series: Series[];
  height?: number;
  unit?: "crore" | "rupees";
  onHover?: (i: number | null) => void; // lets a side panel follow the crosshair
  endLabels?: boolean;
}) {
  const fmt = unit === "crore" ? cr : inr;
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => onHover?.(hover), [hover, onHover]);

  const narrow = w < 520;
  const h = height;
  const m = { t: 16, r: narrow || !endLabels ? 16 : 140, b: 32, l: 56 };
  const all = series.flatMap((s) => [...s.values, ...(s.lo ?? []), ...(s.hi ?? [])]);
  const step = niceStep(Math.max(...all) - Math.min(0, ...all));
  const yMax = Math.ceil(Math.max(...all) / step) * step;
  const yMin = Math.min(0, Math.floor(Math.min(...all) / step) * step);
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v);

  const last = x.length - 1;
  const sx = (i: number) => m.l + (i * (w - m.l - m.r)) / last;
  const sy = (v: number) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (h - m.t - m.b);
  const line = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${sx(i)},${sy(v)}`).join("");
  const area = (lo: number[], hi: number[]) =>
    `${line(hi)}${lo.map((_, i) => `L${sx(last - i)},${sy(lo[last - i])}`).join("")}Z`;

  // Label every nth point so labels never touch (first/last are edge-anchored); the last is always shown.
  const labelW = Math.max(...x.map((s) => s.length)) * 7.5 + 24;
  const stride = Math.max(1, Math.ceil(labelW / ((w - m.l - m.r) / last)));
  const showX = (i: number) => i === last || (i % stride === 0 && last - i >= stride);
  const ends = series.map((s) => sy(s.values[last])).sort((a, b) => a - b);
  // Converging end labels detach from their lines; fall back to the legend instead.
  const showEndLabels = endLabels && !narrow && ends.every((y, i) => i === 0 || y - ends[i - 1] >= 34);

  const pick = (clientX: number) => {
    const box = ref.current!.getBoundingClientRect();
    const i = Math.round(((clientX - box.left - m.l) / (w - m.l - m.r)) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-12 flex flex-wrap gap-16 text-[14px]" style={{ color: MUTED }}>
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-8">
              <svg width="18" height="4" aria-hidden><line x1="0" x2="18" y1="2" y2="2" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "4 3" : undefined} /></svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          role="img"
          aria-label={`${label}. Use left and right arrow keys to read values.`}
          tabIndex={0}
          className="block"
          style={{ touchAction: "pan-y" }}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(last)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHover((i) => Math.max(0, (i ?? last) - 1));
            if (e.key === "ArrowRight") setHover((i) => Math.min(last, (i ?? 0) + 1));
          }}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={w - m.r} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? "var(--hair)" : "var(--grid)"} />
              <text x={m.l - 10} y={sy(v)} dy="0.32em" textAnchor="end" fontSize="13" fill={MUTED} className="num">
                {fmt(v)}
              </text>
            </g>
          ))}
          {x.map((v, i) =>
            showX(i) ? (
              <text key={i} x={sx(i)} y={h - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize="13" fill={MUTED}>
                {v}
              </text>
            ) : null,
          )}
          {series.map((s) =>
            s.lo && s.hi ? <path key={`b${s.name}`} d={area(s.lo, s.hi)} fill={s.color} opacity={0.1} /> : null,
          )}
          {series.map((s) => (
            <path key={s.name} d={line(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {showEndLabels &&
            series.map((s) => (
              <g key={`e${s.name}`}>
                <circle cx={sx(last)} cy={sy(s.values[last])} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
                <text x={sx(last) + 12} y={sy(s.values[last])} dy="-0.2em" fontSize="15" fontWeight={600} fill="#f7f9fa" className="num">
                  {fmt(s.values[last])}
                </text>
                <text x={sx(last) + 12} y={sy(s.values[last])} dy="1.1em" fontSize="12" fill={MUTED}>
                  {s.name.length > 24 ? `${s.name.slice(0, 23)}…` : s.name}
                </text>
              </g>
            ))}
          {hover !== null && (
            <g>
              <line x1={sx(hover)} x2={sx(hover)} y1={m.t} y2={h - m.b} stroke="var(--hair)" />
              {series.map((s) => (
                <circle key={s.name} cx={sx(hover)} cy={sy(s.values[hover])} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg px-12 py-8 text-[14px]"
            style={{ background: "rgba(9,9,9,0.92)", border: "1px solid var(--hair)", backdropFilter: "blur(8px)", left: Math.min(sx(hover) + 14, w - 214), width: 200 }}
          >
            <div style={{ color: MUTED }}>{x[hover]}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-8">
                <svg width="12" height="4" aria-hidden><line x1="0" x2="12" y1="2" y2="2" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "3 2" : undefined} /></svg>
                <strong className="num">{fmt(s.values[hover])}</strong>
                <span className="truncate" style={{ color: MUTED }}>{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
