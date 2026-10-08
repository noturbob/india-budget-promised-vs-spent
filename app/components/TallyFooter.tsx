"use client";

import { useEffect, useRef } from "react";

const lakh = (crore: number) => `₹${(crore / 1e5).toFixed(1)}L`; // unit stated once in the bar

/**
 * Fixed bottom bar: a running tally that fills up as you scroll, reaching the full totals at the
 * bottom of the page. Budgeted, spent, and the part that was promised but never spent.
 */
export function TallyFooter({ budgeted, spent, neverSpent, years }: { budgeted: number; spent: number; neverSpent: number; years: string }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
      [budgeted, spent, neverSpent].forEach((v, i) => {
        const el = refs.current[i];
        if (el) el.textContent = lakh(v * p);
      });
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [budgeted, spent, neverSpent]);

  const items = [
    { label: "Budget", color: "text-almost-white" },
    { label: "Spent", color: "text-saffron-mist" },
    { label: "Never spent", color: "text-green-mist" },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20" style={{ background: "linear-gradient(0deg, rgba(9,9,9,0.92) 60%, transparent)" }}>
      <div className="h-[2px] w-full origin-left" ref={bar} style={{ transform: "scaleX(0)", background: "linear-gradient(90deg, #ff9933 0 33.3%, #f7f9fa 33.3% 66.6%, #138808 66.6%)" }} />
      <div className="flex items-center justify-between gap-16 px-16 pb-12 pt-12 text-[12px] sm:px-24">
        <div className="hidden items-center gap-12 text-almost-white/60 sm:flex">
          <span aria-hidden className="text-[16px] font-light">+</span>
          <span>Running tally, ministries {years}, ₹ lakh crore</span>
        </div>
        <div className="flex flex-1 items-center justify-between gap-12 whitespace-nowrap sm:flex-none sm:gap-32" aria-hidden>
          {items.map((it, i) => (
            <span key={it.label} className="flex items-baseline gap-4 sm:gap-8">
              <span className="text-almost-white/50">{it.label}</span>
              <span ref={(el) => { refs.current[i] = el; }} className={`num font-mono ${it.color}`}>{lakh(0)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
