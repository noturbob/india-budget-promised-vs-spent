"use client";

import { useEffect, useState } from "react";

const sections = () => [...document.querySelectorAll<HTMLElement>("[data-chapter]")];

// The section whose top has passed 40% of the viewport is "current".
function currentIndex() {
  const all = sections();
  let i = 0;
  all.forEach((el, k) => {
    if (el.getBoundingClientRect().top <= innerHeight * 0.4) i = k;
  });
  return { i, all };
}

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" style={{ transform: up ? "rotate(180deg)" : undefined }}>
      <path d="M8 2v12M3 9l5 5 5-5" fill="none" stroke="#f7f9fa" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChapterNav() {
  const [state, setState] = useState({ i: 0, n: 0, label: "" });

  useEffect(() => {
    const update = () => {
      const { i, all } = currentIndex();
      const label = all[i]?.dataset.chapter ?? "";
      setState((s) => (s.i === i && s.n === all.length ? s : { i, n: all.length, label }));
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  const go = (dir: 1 | -1) => {
    const { i, all } = currentIndex();
    // Partway into a long chapter, "up" first returns to that chapter's start.
    const target = dir < 0 && all[i].getBoundingClientRect().top < -40 ? i : i + dir;
    // "auto" defers to the CSS scroll-behavior, which honours reduced motion.
    all[Math.max(0, Math.min(all.length - 1, target))]?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  // aria-disabled, not disabled: Firefox restores a button's disabled state across reloads,
  // which then mismatches the server HTML on hydration. go() already clamps at the ends.
  const btn = "flex h-[40px] w-[40px] items-center justify-center rounded-lg border border-almost-white/60 bg-near-black/70 backdrop-blur aria-disabled:opacity-30";

  return (
    <nav aria-label="Previous and next chapter" className="fixed bottom-48 right-16 z-30 flex flex-col items-center gap-8 sm:right-24">
      <button type="button" className={btn} onClick={() => go(-1)} aria-disabled={state.i === 0} aria-label="Previous chapter">
        <Arrow up />
      </button>
      <span className="num font-mono text-[11px] text-almost-white/70" title={state.label}>
        <span className="sr-only">{state.label}, </span>
        {state.n ? `${state.i + 1}/${state.n}` : ""}
      </span>
      <button type="button" className={btn} onClick={() => go(1)} aria-disabled={state.n > 0 && state.i === state.n - 1} aria-label="Next chapter">
        <Arrow />
      </button>
    </nav>
  );
}
