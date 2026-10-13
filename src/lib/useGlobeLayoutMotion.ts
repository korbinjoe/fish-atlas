import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/** Resize the drawing buffer once, then move its entire view on the compositor. */
export function useGlobeLayoutMotion(root: RefObject<HTMLDivElement | null>, reading: boolean) {
  const snapshot = useRef<DOMRect | null>(null);
  const motion = useRef<Animation | null>(null);
  const capture = useCallback(() => {
    snapshot.current = window.matchMedia("(max-width: 620px), (prefers-reduced-motion: reduce)").matches
      ? null : root.current?.querySelector<HTMLElement>(".globe-renderer")?.getBoundingClientRect() ?? null;
  }, [root]);

  useLayoutEffect(() => {
    const before = snapshot.current;
    snapshot.current = null;
    motion.current?.cancel();
    const element = root.current?.querySelector<HTMLElement>(".globe-renderer");
    if (!element || !before || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const after = element.getBoundingClientRect();
    if (!after.width || !after.height) return;
    // The perspective camera uses a vertical field of view. Preserve its
    // apparent scale and move viewport centres without stretching the sphere.
    const scale = before.height / after.height;
    const x = before.x + before.width / 2 - after.x - after.width * scale / 2;
    const y = before.y + before.height / 2 - after.y - after.height * scale / 2;
    element.dataset.layoutMoving = "true";
    const animation = element.animate([
      { transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})` },
      { transform: "none" },
    ], { duration: 480, easing: "cubic-bezier(.22, 1, .36, 1)" });
    motion.current = animation;
    const settled = () => {
      if (motion.current !== animation) return;
      element.dataset.layoutMoving = "false";
      motion.current = null;
    };
    animation.onfinish = settled;
    animation.oncancel = settled;
    return () => animation.cancel();
  }, [root, reading]);

  useEffect(() => {
    window.addEventListener("popstate", capture);
    return () => window.removeEventListener("popstate", capture);
  }, [capture]);
  return capture;
}
