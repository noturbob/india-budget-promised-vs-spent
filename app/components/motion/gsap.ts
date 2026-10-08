"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useLayoutEffect, type RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

export { gsap, ScrollTrigger };

/**
 * Run GSAP setup scoped to `ref`, reverted on unmount. Skipped entirely for reduced-motion
 * readers: the server-rendered markup is already the final state of every animation.
 */
export function useMotion(ref: RefObject<HTMLElement | null>, setup: (root: HTMLElement) => void) {
  useLayoutEffect(() => {
    if (!ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => setup(ref.current!), ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
