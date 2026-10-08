"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useMotion } from "./motion/gsap";
import { crore } from "./charts/format";

type Cat = { name: string; crore: number; squares: number; note: string };

/**
 * Where every ₹100 of the newest budget goes: a 10x10 grid that stays on screen while one caption
 * per category scrolls past and lights its squares. Highlighting follows the scroll position for
 * every reader; only the grid's first assembly is animated.
 */
export function Waffle({ fy, total, cats }: { fy: string; total: number; cats: Cat[] }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(-1);
  const owner = cats.flatMap((c, i) => Array.from({ length: c.squares }, () => i));

  // Active caption = the last one whose top has passed the middle of the screen (-1 before the first).
  useEffect(() => {
    const marks = [...ref.current!.querySelectorAll<HTMLElement>("[data-cat]")];
    let raf = 0;
    const update = () => {
      raf = 0;
      const passed = marks.filter((m) => m.getBoundingClientRect().top < innerHeight * 0.55);
      setActive(passed.length ? Number(passed[passed.length - 1].dataset.cat) : -1);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  useMotion(ref, (root) => {
    gsap.from(root.querySelectorAll("[data-sq]"), {
      x: () => gsap.utils.random(-300, 300), y: () => gsap.utils.random(-200, 200), scale: 0, autoAlpha: 0,
      duration: 1.2, ease: "expo.out", stagger: { amount: 0.8, from: "random" },
      scrollTrigger: { trigger: root, start: "top 60%", once: true },
    });
  });

  return (
    <section ref={ref} id="allocation" aria-label={`Where every ₹100 of the ${fy} budget goes`} className="relative">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-48 px-16 sm:px-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sticky top-[56px] z-10 bg-near-black/90 pb-16 pt-24 lg:top-0 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center lg:bg-transparent lg:pb-0 lg:pt-0">
          <p className="stamp text-[13px] text-steel">Every ₹100</p>
          <h2 className="mt-12 text-[28px] font-semibold leading-[1.05] tight sm:text-[48px]">
            Where the <span className="display font-normal">{fy}</span> budget goes.
          </h2>
          <div role="img" aria-label={cats.map((c) => `${c.name}: ₹${c.squares} of every ₹100`).join("; ")}
            className="mt-24 grid w-full max-w-[300px] grid-cols-10 gap-[4px] sm:max-w-[420px] lg:mt-40">
            {owner.map((cat, i) => (
              <div key={i} data-sq className="aspect-square rounded-[3px] transition-colors duration-500"
                style={{
                  background: active < 0 ? "rgba(247,249,250,0.75)" : cat === active ? "#ff9933" : "rgba(247,249,250,0.1)",
                  boxShadow: cat === active ? "0 0 12px rgba(255,153,51,0.55)" : "none",
                }} />
            ))}
          </div>
          <p className="num mt-16 font-mono text-[12px] text-steel">1 square = ₹1 of every ₹100 = {crore(total / 100)}</p>
        </div>

        <div className="pb-[30svh] lg:py-[35svh]">
          <div data-cat={-1} className="flex min-h-[50svh] flex-col justify-center">
            <p className="text-[22px] font-light leading-[1.5]">
              The {fy} budget promises <span className="num font-medium">{crore(total)}</span>. Split it into a hundred squares and
              follow each one to where it is meant to end up.
            </p>
          </div>
          {cats.map((c, i) => (
            <article key={c.name} data-cat={i} className="flex min-h-[55svh] flex-col justify-center border-t py-32" style={{ borderColor: "var(--hair)" }}>
              <p className="num text-[56px] font-semibold leading-none tight">₹{c.squares}<span className="text-[20px] font-normal text-steel"> of every ₹100</span></p>
              <h3 className="mt-16 text-[24px] font-medium tight">{c.name}</h3>
              <p className="mt-8 max-w-[440px] text-[16px] leading-[1.6] text-almost-white/70">{c.note}</p>
              <p className="num mt-12 font-mono text-[12px] text-steel">{crore(c.crore)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
