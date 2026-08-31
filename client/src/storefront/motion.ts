import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false));
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Adds `.is-visible` to `.reveal` descendants when they enter the viewport. */
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/**
 * Pointer tilt for a "scene" element. Applies rotateX/rotateY to the scene's
 * `.plane` children with per-plane depth from `data-depth`. Disabled for
 * reduced-motion and coarse pointers (touch), where a static composition is
 * shown instead.
 */
export function useTilt<T extends HTMLElement>(max = 7): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const planes = () => Array.from(el.querySelectorAll<HTMLElement>(".plane"));
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const plane of planes()) {
          const depth = Number(plane.dataset.depth ?? 1);
          plane.style.transform = `rotateY(${(x * max * depth).toFixed(2)}deg) rotateX(${(-y * max * depth).toFixed(2)}deg) translate3d(${(x * 10 * depth).toFixed(1)}px, ${(y * 10 * depth).toFixed(1)}px, ${(depth * 12).toFixed(0)}px)`;
        }
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      for (const plane of planes()) plane.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [max, reduced]);
  return ref;
}

/** Scroll progress (0..1) of an element through the viewport, throttled to rAF. */
export function useScrollProgress<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const p = 1 - (rect.top + rect.height) / (vh + rect.height);
    setProgress(Math.min(1, Math.max(0, p)));
  }, []);
  useEffect(() => {
    if (reduced) {
      setProgress(0.5);
      return;
    }
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [reduced, update]);
  return [ref, progress];
}
