"use client";

import { useRef } from "react";
import { gsap, useMotion } from "./motion/gsap";

export type Line = { label: string; value: string; note?: string };

/** The closing bill: one big figure and an itemised receipt whose numbers decode as it prints. */
export function GrandTotal({ big, bigLabel, sections }: { big: string; bigLabel: string; sections: { title: string; lines: Line[] }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, (root) => {
    const trigger = { trigger: root, start: "top 75%", once: true };
    gsap.from("[data-receipt]", { clipPath: "inset(0 0 100% 0)", duration: 1.8, ease: "power2.out", scrollTrigger: trigger });
    root.querySelectorAll<HTMLElement>("[data-val]").forEach((el, i) => {
      gsap.from(el, { duration: 1.2, delay: 0.3 + i * 0.12, scrambleText: { text: el.textContent ?? "", chars: "0123456789₹,.", speed: 0.4 }, scrollTrigger: trigger });
    });
    gsap.from("[data-big]", { autoAlpha: 0, y: 40, duration: 1.2, ease: "expo.out", scrollTrigger: trigger });
  });

  return (
    <div ref={ref} className="grid items-start gap-48 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div data-big>
        <p className="num text-[56px] font-semibold leading-[0.95] tight sm:text-[88px]"
          style={{ background: "linear-gradient(90deg, #ff9933 0%, #f7f9fa 50%, #6fd17f 100%)", WebkitBackgroundClip: "text", color: "transparent" }}>
          {big}
        </p>
        <p className="mt-16 max-w-[420px] text-[18px] font-light leading-[1.5] text-almost-white/80">{bigLabel}</p>
      </div>
      <div data-receipt className="rounded-2xl border p-24 font-mono text-[13px] sm:p-40" style={{ borderColor: "rgba(247,249,250,0.3)", background: "rgba(247,249,250,0.04)" }}>
        <p className="text-center tracking-[0.2em]">THE BILL, ALL YEARS</p>
        {sections.map((s) => (
          <div key={s.title}>
            <div aria-hidden className="my-16 border-t border-dashed" style={{ borderColor: "rgba(247,249,250,0.3)" }} />
            <p className="text-[11px] tracking-[0.12em] text-almost-white/60">{s.title.toUpperCase()}</p>
            {s.lines.map((l) => (
              <div key={l.label} className="py-8">
                <p className="num flex justify-between gap-16">
                  <span className="text-almost-white/80">{l.label}</span>
                  <span data-val className="shrink-0 font-semibold">{l.value}</span>
                </p>
                {l.note && <p className="mt-4 font-sans text-[12px] text-steel">{l.note}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
