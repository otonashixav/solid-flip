import { onMount } from "solid-js";
import { MovedElement } from "./types";

export function filterMovedEls(els: Element[]): MovedElement[] {
  const movableEls: MovedElement[] = [];
  for (const el of els) {
    if (el.isConnected) {
      const { x, y } = el.getBoundingClientRect();
      movableEls.push([el, x, y]);
    }
  }
  const movedEls: MovedElement[] = [];
  onMount(() =>
    onMount(() => {
      for (const [el, prevX, prevY] of movableEls) {
        if (el.isConnected) {
          const { x, y } = el.getBoundingClientRect();
          const dX = prevX - x;
          const dY = prevY - y;
          if (dX || dY) movedEls.push([el, dX, dY]);
        }
      }
    })
  );
  return movedEls;
}

export function undetachEls(els: Element[]): void {
  for (const el of els) {
    const animations = el.getAnimations();
    for (const animation of animations) {
      if (animation.id === "detach") animation.cancel();
    }
  }
}

export function detachEls(els: Element[]): void {
  const detachableEls: [
    el: Element,
    left: string,
    top: string,
    width: string,
    height: string
  ][] = [];
  let parentX: number | undefined, parentY: number | undefined;
  const animations = [];
  for (const el of els) {
    const parent = el.parentElement;
    if (parent) {
      const { x, y, width, height } = el.getBoundingClientRect();
      if (parentX === undefined || parentY === undefined) {
        const parentRect = parent.getBoundingClientRect();
        parentX = parentRect.x;
        parentY = parentRect.y;
      }
      animations.push(() => {
        const animation = el.animate(
          [
            {},
            {
              position: "absolute",
              margin: "0px",
              left: `${x - (parentX as number)}px`,
              top: `${y - (parentY as number)}px`,
              width: `${width}px`,
              height: `${height}px`,
            },
          ],
          { fill: "forwards" }
        );
        animation.id = "detach";
      });
    }
  }
  for (const animation of animations) animation();
}
