"use client";

import { useRef } from "react";
import { gsap, useMotion } from "./motion/gsap";
import { RupeeMark } from "./RupeeMark";

type Point = { fy: string; dev: number; gov: string };
type Note = { fy: string; title: string; text: string };

const W = 1000, H = 400, PAD = 24;
const GOVS = ["UPA-1", "UPA-2", "NDA-1", "NDA-2", "NDA-3"];

/**
 * Pinned chart: actual spending vs budget, year by year. Scrolling draws the line with a ₹ marker;
 * the dashed zero line is the budget. Server render = the finished chart.
 */
export function GapLine({ points, notes }: { points: Point[]; notes: Note[] }) {
  const ref = useRef<HTMLElement>(null);
  const n = points.length;
  const lo = Math.floor(Math.min(...points.map((p) => p.dev)) * 20) / 20;
  const hi = Math.ceil(Math.max(...points.map((p) => p.dev)) * 20) / 20;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (n - 1);
  const y = (v: number) => PAD + ((hi - v) / (hi - lo)) * (H - 2 * PAD);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.dev)}`).join("");
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += 0.05) ticks.push(Math.round(v * 100) / 100);
  const last = points[n - 1];

  useMotion(ref, (root) => {
    const path = root.querySelector<SVGPathElement>("[data-path]")!;
        const marker = root.querySelector<HTMLElement>("[data-marker]")!;
    const year = root.querySelector<HTMLElement>("[data-year]")!;
    const clip = root.querySelector<SVGRectElement>("[data-clip]")!;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    const apply = (p: number) => {
      path.style.strokeDashoffset = `${len * (1 - p)}`;
      const at = path.getPointAtLength(len * p);
      clip.setAttribute("width", String(at.x));
      marker.style.left = `${(at.x / W) * 100}%`;
      marker.style.top = `${(at.y / H) * 100}%`;
      marker.style.transform = "translate(-50%, -50%)";
      const i = Math.min(n - 1, Math.round(p * (n - 1)));
      year.textContent = points[i].fy;
      root.querySelectorAll<HTMLElement>("[data-note]").forEach((el) => {
        el.style.opacity = p * (n - 1) >= Number(el.dataset.note) - 0.3 ? "1" : "0";
      });
      root.querySelectorAll<HTMLElement>("[data-gov]").forEach((el) => {
        el.dataset.active = String(el.dataset.gov === points[i].gov);
      });
    };
    const state = { p: 0 };
    apply(0);
    gsap.to(state, {
      p: 1, ease: "none", onUpdate: () => apply(state.p),
      scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.8 },
    });
  });

  return (
    <section ref={ref} id="gap" aria-label="The gap between budget and spending" className="relative h-[340vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div data-year aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[22vw] font-semibold leading-none tight text-almost-white/[0.04]">
          {last.fy}
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-16 sm:px-32">
          <p className="stamp text-[13px] text-steel">The gap</p>
          <h2 className="mt-12 max-w-[760px] text-[36px] font-semibold leading-[1.05] tight sm:text-[56px]">
            There&apos;s a gap between the <span className="display font-normal">budget</span> and the <span className="display font-normal">bill.</span>
          </h2>
          <p className="mt-16 max-w-[560px] text-[16px] text-almost-white/70">
            Each point is one year&apos;s actual spending compared with what that year&apos;s budget announced. The dashed line is the
            budget itself: spending exactly what was promised.
          </p>

          <div className="relative mt-40 grid grid-cols-[minmax(0,1fr)] gap-24 md:grid-cols-[minmax(0,1fr)_96px]">
            <div className="relative pl-48">
              {ticks.map((t) => (
                <span key={t} className="num absolute left-0 -translate-y-1/2 font-mono text-[12px] text-steel" style={{ top: `${(y(t) / H) * 100}%` }}>
                  {t > 0 ? "+" : t < 0 ? "−" : ""}{Math.abs(Math.round(t * 100))}%
                </span>
              ))}
              <div data-box className="relative h-[38svh] min-h-[220px]">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img"
                  aria-label={`Actual spending minus budget, ${points[0].fy} to ${last.fy}. ${notes.map((x) => `${x.fy}: ${x.title}`).join("; ")}.`}>
                  {ticks.map((t) => (
                    <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(247,249,250,0.55)" : "rgba(247,249,250,0.07)"}
                      strokeDasharray={t === 0 ? "6 6" : undefined} vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={`${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="url(#glow)" opacity={0.35} clipPath="url(#flown)" />
                  <defs>
                    <clipPath id="flown"><rect data-clip x={0} y={0} width={W} height={H} /></clipPath>
                    <linearGradient id="glow" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#ff9933" stopOpacity="0.55" />
                      <stop offset="1" stopColor="#ff9933" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path data-path d={d} fill="none" stroke="#ff9933" strokeWidth={2.5} vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(255,153,51,0.75))" }} />
                </svg>
                <span className="absolute right-0 -translate-y-[130%] font-mono text-[11px] uppercase tracking-[0.18em] text-almost-white/60" style={{ top: `${(y(0) / H) * 100}%` }}>
                  the budget
                </span>
                <div data-marker className="absolute" style={{ left: `${(x(n - 1) / W) * 100}%`, top: `${(y(last.dev) / H) * 100}%`, transform: "translate(-50%,-50%)" }}>
                  <RupeeMark size={24} />
                </div>
                {notes.map((note) => {
                  const i = points.findIndex((p) => p.fy === note.fy);
                  const right = i > n * 0.6;
                  return (
                    <div key={note.fy} data-note={i} className="absolute w-[200px] transition-opacity duration-500 sm:w-[240px]"
                      style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(points[i].dev) / H) * 100}%`, transform: `translate(${right ? "calc(-100% - 16px)" : "16px"}, -50%)` }}>
                      <div className="rounded-lg border px-12 py-8 text-[13px] leading-[1.35]" style={{ borderColor: "var(--hair)", background: "rgba(9,9,9,0.85)" }}>
                        <div className="num font-medium">{note.fy} · {note.title}</div>
                        <div className="text-steel">{note.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-12 flex justify-between font-mono text-[12px] text-steel">
                <span>{points[0].fy}</span><span>{last.fy}</span>
              </div>
            </div>
            <ol className="hidden flex-col justify-center gap-12 md:flex" aria-label="Governments">
              {GOVS.map((g) => (
                <li key={g} data-gov={g} data-active={String(g === last.gov)}
                  className="font-mono text-[12px] uppercase tracking-[0.12em] text-ash transition-colors data-[active=true]:text-almost-white">
                  {g}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
