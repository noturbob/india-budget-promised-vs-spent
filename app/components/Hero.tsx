"use client";

import { useRef } from "react";
import { gsap, useMotion } from "./motion/gsap";
import { RupeeMark } from "./RupeeMark";

// The sky is all CSS: a dusk gradient, a horizon glow, blurred clouds and a star field.
const SKY = [
  "radial-gradient(70% 45% at 72% 100%, rgba(255,153,51,0.6), transparent 70%)",
  "radial-gradient(55% 40% at 12% 95%, rgba(19,136,8,0.5), transparent 70%)",
  "radial-gradient(30% 25% at 85% 30%, rgba(255,194,133,0.12), transparent 70%)",
  "linear-gradient(180deg, #050608 0%, #0b0d10 30%, #1b1610 55%, #4a2b10 78%, #b8611d 93%, #ffb26b 100%)",
].join(",");

const CLOUDS = [
  { left: "-10%", top: "58%", w: "60%", h: "30%", c: "rgba(255,194,133,0.28)" },
  { left: "40%", top: "68%", w: "70%", h: "34%", c: "rgba(255,153,51,0.32)" },
  { left: "-5%", top: "82%", w: "55%", h: "30%", c: "rgba(19,136,8,0.45)" },
  { left: "62%", top: "40%", w: "35%", h: "16%", c: "rgba(255,220,180,0.12)" },
];

type Bill = { fy: string; promised: string; spent: string; diff: string };

const Rule = () => <div aria-hidden className="my-16 border-t border-dashed" style={{ borderColor: "rgba(247,249,250,0.3)" }} />;
const Line = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <p className={`num flex justify-between gap-16 py-4 ${strong ? "text-almost-white" : "text-almost-white/75"}`}>
    <span>{k}</span><span className={strong ? "font-semibold" : ""}>{v}</span>
  </p>
);

export function Hero({ budget, last }: { budget: { fy: string; promised: string }; last: Bill }) {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref, (root) => {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(root.querySelectorAll("[data-line] > span"), { yPercent: 110, duration: 1.4, stagger: 0.12 })
      .from("[data-streak]", { scaleX: 0, transformOrigin: "0% 50%", duration: 1.6, ease: "power3.inOut" }, 0.4)
      .from("[data-streak-mark]", { xPercent: -900, autoAlpha: 0, duration: 1.6, ease: "power3.inOut" }, 0.4)
      .from("[data-fade]", { autoAlpha: 0, y: 20, duration: 1.2, stagger: 0.1 }, 0.7)
      .from("[data-pass]", { autoAlpha: 0, yPercent: -8, clipPath: "inset(0 0 100% 0)", duration: 1.6, ease: "power3.out" }, 0.5);
    // Clouds drift slowly and sink as the page scrolls away, so the sky has depth.
    root.querySelectorAll<HTMLElement>("[data-cloud]").forEach((c, i) => {
      gsap.to(c, { xPercent: i % 2 ? -6 : 6, duration: 14 + i * 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(c, { yPercent: 40 + i * 15, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
    });
    gsap.to("[data-copy]", { y: -80, autoAlpha: 0.2, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
  });

  return (
    <section ref={ref} id="top" aria-label="Promised vs Spent" className="grain relative flex min-h-[100svh] items-center overflow-hidden" style={{ background: SKY }}>
      <div aria-hidden className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(1px 1px at 20px 30px, #fff, transparent), radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,0.7), transparent), radial-gradient(1.5px 1.5px at 200px 150px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 300px 50px, rgba(255,255,255,0.6), transparent)",
        backgroundSize: "340px 220px", maskImage: "linear-gradient(180deg, #000 0%, transparent 55%)", opacity: 0.7,
      }} />
      {CLOUDS.map((c, i) => (
        <div key={i} data-cloud aria-hidden className="absolute rounded-[50%]"
          style={{ left: c.left, top: c.top, width: c.w, height: c.h, background: `radial-gradient(closest-side, ${c.c}, transparent)`, filter: "blur(28px)" }} />
      ))}

      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[22svh]" style={{ background: "linear-gradient(180deg, transparent, #090909)" }} />
      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-64 px-16 pb-96 pt-128 sm:px-32 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div data-copy>
          <h1 className="tight">
            <span data-line className="block overflow-hidden pb-8"><span className="display block text-[64px] leading-[0.95] sm:text-[112px]">What India</span></span>
            <span data-line className="block overflow-hidden"><span className="block text-[48px] font-semibold leading-[0.95] sm:text-[88px]">promised, and</span></span>
            <span data-line className="block overflow-hidden pb-12"><span className="display block text-[64px] leading-[0.95] sm:text-[112px]">what it spent.</span></span>
          </h1>
          <div className="relative mt-16 h-[24px] max-w-[460px]" aria-hidden>
            <div data-streak className="absolute left-0 right-24 top-1/2 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(247,249,250,0.9))" }} />
            <div data-streak-mark className="absolute right-0 top-0"><RupeeMark size={24} /></div>
          </div>
          <p data-fade className="prose-col mt-32 text-[20px] font-light leading-[1.6] text-almost-white/85">
            Every February the Finance Minister announces what the government will spend. Two years later the audited
            accounts show what it actually spent. This is twenty years of both, read line by line from 32 official budget documents.
          </p>
          <a data-fade href="#gap" className="mt-32 inline-flex items-center gap-12 text-[18px]">
            <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full" style={{ background: "radial-gradient(circle, #ff9933 0%, #c8661a 100%)", boxShadow: "0 0 28px rgba(255,153,51,0.6)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M7 1v12M2 8l5 5 5-5" fill="none" stroke="#f7f9fa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            See the gap
          </a>
        </div>

        <div data-pass className="relative pb-24" style={{ filter: "drop-shadow(0 0 40px rgba(255,153,51,0.16))" }}>
          <div className="rounded-t-2xl border border-b-0 px-32 pb-24 pt-32 font-mono text-[13px] sm:px-40"
            style={{ background: "rgba(247,249,250,0.06)", borderColor: "rgba(247,249,250,0.3)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
            <p className="text-center tracking-[0.2em]">UNION BUDGET {budget.fy}</p>
            <p className="mt-4 text-center text-[11px] tracking-[0.12em] text-almost-white/60">MINISTRY OF FINANCE · NORTH BLOCK</p>
            <Rule />
            <Line k="Promised (BE)" v={budget.promised} strong />
            <Line k="Revised (RE)" v={`due Feb ${Number(budget.fy.slice(0, 4)) + 1}`} />
            <Line k="Spent (actual)" v={`due Feb ${Number(budget.fy.slice(0, 4)) + 2}`} />
            <Rule />
            <p className="text-[11px] tracking-[0.12em] text-almost-white/60">LAST SETTLED BILL · {last.fy}</p>
            <Line k="Promised" v={last.promised} />
            <Line k="Spent" v={last.spent} />
            <Line k="Difference" v={last.diff} strong />
            <div aria-hidden className="mt-24 h-[40px] opacity-80"
              style={{ background: "repeating-linear-gradient(90deg, #f7f9fa 0 2px, transparent 2px 4px, #f7f9fa 4px 5px, transparent 5px 9px, #f7f9fa 9px 12px, transparent 12px 14px)" }} />
            <div className="mt-24 flex flex-col gap-12 font-sans">
              <a href="#contents" className="pill">Start reading</a>
              <a href="#ministries" className="pill">Find a ministry</a>
            </div>
          </div>
          {/* torn edge */}
          <div aria-hidden className="h-[14px]" style={{
            background: "linear-gradient(-45deg, transparent 7px, rgba(247,249,250,0.06) 0) 0 0 / 14px 14px repeat-x, linear-gradient(45deg, transparent 7px, rgba(247,249,250,0.06) 0) 0 0 / 14px 14px repeat-x",
          }} />
        </div>
      </div>
    </section>
  );
}
