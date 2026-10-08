"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useMotion } from "./motion/gsap";

export type Gov = {
  id: string;
  years: string;
  fm: string;
  rows: { label: string; value: string; note?: string }[];
  counts: string[];
};

/**
 * Five governments, one yardstick. The cards scroll normally; the ghost name and the side nav are
 * CSS-sticky and follow whichever card is in view (works with or without motion).
 */
export function GovStepper({ govs }: { govs: Gov[] }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const cards = [...ref.current!.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.step)));
    }, { rootMargin: "-45% 0px -45% 0px" });
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  useMotion(ref, (root) => {
    root.querySelectorAll<HTMLElement>("[data-step]").forEach((card) => {
      const trigger = { trigger: card, start: "top 70%", once: true };
      gsap.from(card.querySelectorAll("[data-in]"), { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.07, ease: "power3.out", scrollTrigger: trigger });
      card.querySelectorAll<HTMLElement>("[data-scramble]").forEach((v) => {
        gsap.from(v, { duration: 1.1, scrambleText: { text: v.textContent ?? "", chars: "0123456789+−%", speed: 0.5 }, scrollTrigger: trigger });
      });
    });
  });

  return (
    <section ref={ref} id="governments" aria-label="Five governments, one yardstick" className="relative">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-48 px-16 sm:px-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center">
          <div className="pt-96 lg:pt-0">
            <p className="stamp text-[13px] text-steel">Five governments</p>
            <h2 className="mt-12 text-[36px] font-semibold leading-[1.05] tight sm:text-[56px]">
              One <span className="display font-normal">yardstick</span> for all of them.
            </h2>
            <p className="mt-16 max-w-[460px] text-almost-white/70">
              The same four measures for every budget since 2005-06: the median gap between what was budgeted and what happened.
              A positive number means more than budgeted.
            </p>
          </div>
          <div aria-hidden className="relative mt-32 hidden h-[160px] lg:block">
            {govs.map((g, i) => (
              <span key={g.id} className="absolute left-0 top-0 font-semibold leading-none tight text-almost-white/[0.06] transition-opacity duration-700 text-[150px]"
                style={{ opacity: i === active ? 1 : 0 }}>
                {g.id}
              </span>
            ))}
          </div>
          <ol className="mt-24 hidden gap-24 lg:flex" aria-label="Jump to a government">
            {govs.map((g, i) => (
              <li key={g.id}>
                <a href={`#gov-${g.id}`} className={`font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${i === active ? "text-almost-white" : "text-ash"}`}>
                  {g.id}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="pb-96 lg:pb-[12svh] lg:pt-[30svh]">
          {govs.map((g, i) => (
            <article key={g.id} id={`gov-${g.id}`} data-step={i} className="flex min-h-[70svh] flex-col justify-center border-t py-48 lg:min-h-[80svh]" style={{ borderColor: "var(--hair)" }}>
              <div data-in className="flex flex-wrap items-baseline gap-x-16 gap-y-4">
                <h3 className="text-[40px] font-semibold tight">{g.id}</h3>
                <span className="rounded-lg border px-8 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-almost-white/80" style={{ borderColor: "var(--hair)" }}>{g.years}</span>
              </div>
              <p data-in className="mt-8 text-[14px] text-steel">Budgets presented by {g.fm}</p>
              <dl className="mt-32 grid grid-cols-2 gap-x-24 gap-y-24">
                {g.rows.map((r) => (
                  <div data-in key={r.label} className="border-t pt-12" style={{ borderColor: "var(--grid)" }}>
                    <dt className="text-[13px] text-steel">{r.label}</dt>
                    <dd data-scramble className="num mt-4 text-[32px] leading-none tight">{r.value}</dd>
                    {r.note && <dd className="mt-4 text-[12px] text-ash">{r.note}</dd>}
                  </div>
                ))}
              </dl>
              <ul className="mt-32 flex flex-col gap-8 text-[15px] text-almost-white/80">
                {g.counts.map((c) => <li data-in key={c} className="flex gap-12"><span aria-hidden className="text-saffron">+</span>{c}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
