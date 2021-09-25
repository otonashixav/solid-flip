import { onCommit, onUpdate } from "./schedule";
import { StylableElement, MovedElement } from "./types";

export function filterMovedEls(els: StylableElement[]): MovedElement[] {
  const movableEls: MovedElement[] = [];
  for (const el of els) {
    if (el.isConnected) {
      const { x, y } = el.getBoundingClientRect();
      movableEls.push([el, x, y]);
    }
  }
  const movedEls: MovedElement[] = [];
  onUpdate(() => {
    for (const [el, prevX, prevY] of movableEls) {
      if (el.isConnected) {
        const { x, y } = el.getBoundingClientRect();
        const dX = prevX - x;
        const dY = prevY - y;
        if (dX || dY) movedEls.push([el, dX, dY]);
      }
    }
  });
  return movedEls;
}

export function detachEls(els: StylableElement[]): void {
  const detachableEls: {
    el: HTMLElement;
    left: number;
    top: number;
    width: number;
    height: number;
  }[] = [];
  for (const el of els) {
    if (el instanceof HTMLElement) {
      detachableEls.push({
        el,
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    }
  }
  onCommit(() => {
    for (const { el, ...offsets } of detachableEls) {
      el.style.setProperty("position", "absolute");
      el.style.setProperty("margin", "0px");
      for (const name in offsets)
        el.style.setProperty(
          name,
          `${offsets[name as keyof typeof offsets]}px`
        );
    }
  });
}
