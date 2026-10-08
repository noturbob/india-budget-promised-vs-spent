"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap, useMotion } from "./gsap";

/**
 * Children rise in once when they scroll into view; any [data-grow] bar inside grows from its
 * baseline ("up", "right" or "left"). Used on every chart and text block below the hero.
 */
export function Reveal({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, (root) => {
    const trigger = { trigger: root, start: "top 92%", once: true };
    gsap.from(root, { autoAlpha: 0, y: 32, duration: 0.9, ease: "power3.out", scrollTrigger: trigger });
    const bars = root.querySelectorAll<HTMLElement>("[data-grow]");
    bars.forEach((b) => {
      const dir = b.dataset.grow;
      gsap.set(b, { transformOrigin: dir === "up" ? "50% 100%" : dir === "left" ? "100% 50%" : "0% 50%" });
    });
    if (bars.length) {
      gsap.from(bars, {
        scaleY: (_, el: HTMLElement) => (el.dataset.grow === "up" ? 0 : 1),
        scaleX: (_, el: HTMLElement) => (el.dataset.grow === "up" ? 1 : 0),
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.03,
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
      });
    }
  });
  return <div ref={ref} className={className} style={style}>{children}</div>;
}
