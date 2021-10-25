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
    const s = (el as { style?: CSSStyleDeclaration }).style;
    if (s)
      for (const property of [
        "position",
        "margin",
        "left",
        "top",
        "width",
        "height",
      ]) {
        s.removeProperty(property);
      }
  }
}

export function detachEls(els: Element[]): void {
  const detachableEls: {
    el: Element;
    left: number;
    top: number;
    width: number;
    height: number;
  }[] = [];
  let parentX: number | undefined, parentY: number | undefined;
  for (const el of els) {
    const parent = el.parentElement;
    if (parent) {
      const { x, y, width, height } = el.getBoundingClientRect();
      if (parentX === undefined || parentY === undefined) {
        const parentRect = parent.getBoundingClientRect();
        parentX = parentRect.x;
        parentY = parentRect.y;
      }
      detachableEls.push({
        el,
        left: x - parentX,
        top: y - parentY,
        width: width,
        height: height,
      });
    }
  }
  for (const { el, ...offsets } of detachableEls) {
    const s = (el as { style?: CSSStyleDeclaration }).style;
    if (s) {
      s.setProperty("position", "absolute");
      s.setProperty("margin", "0px");
      for (const name in offsets)
        s.setProperty(name, `${offsets[name as keyof typeof offsets]}px`);
    }
  }
}
