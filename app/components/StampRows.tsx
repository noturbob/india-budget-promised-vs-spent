"use client";

import { useRef } from "react";
import { gsap, useMotion } from "./motion/gsap";

export type Stop = { id: string; stamp: string; note: string };

/** The table of contents as stamped boarding-pass rows. Each row decodes as it scrolls in. */
export function StampRows({ stops }: { stops: Stop[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, (root) => {
    root.querySelectorAll<HTMLElement>("[data-stamp]").forEach((el) => {
      const text = el.textContent ?? "";
      const trigger = { trigger: el, start: "top 88%", once: true };
      // Outlined while it decodes, then filled: the stamp landing on the page.
      gsap.fromTo(el, { color: "transparent", WebkitTextStroke: "1px rgba(240,240,240,0.7)" },
        { color: "#f0f0f0", WebkitTextStroke: "0px rgba(240,240,240,0)", duration: 0.6, delay: 0.9, ease: "none", scrollTrigger: trigger });
      gsap.from(el, { duration: 1.4, ease: "none", scrambleText: { text, chars: "!<>-_\\/[]{}=+*^?#0123456789₹", revealDelay: 0.3, speed: 0.6 }, scrollTrigger: trigger });
    });
    gsap.from(root.querySelectorAll("[data-row]"), { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: root, start: "top 80%", once: true } });
  });

  return (
    <div ref={ref} className="flex flex-col gap-12">
      {stops.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} data-row
          className="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-16 rounded-lg border px-16 py-16 transition-colors hover:border-almost-white/40 sm:grid-cols-[64px_minmax(0,1fr)_minmax(0,280px)_auto] sm:px-24"
          style={{ borderColor: "var(--hair)" }}>
          <span className="num font-mono text-[13px] text-steel">{String(i + 1).padStart(2, "0")}</span>
          <span data-stamp className="stamp truncate text-[22px] leading-[1.1] sm:text-[clamp(26px,3.6vw,48px)]">{s.stamp}</span>
          <span className="hidden text-[14px] leading-[1.4] text-steel sm:block">{s.note}</span>
          <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden className="transition-transform group-hover:translate-x-4">
            <path d="M1 10h25M17 2l9 8-9 8" fill="none" stroke="#f7f9fa" strokeWidth="1.6" />
          </svg>
        </a>
      ))}
    </div>
  );
}
