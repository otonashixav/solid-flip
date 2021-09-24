export function filterMovedEls(
  els: StylableElement[]
): Promise<MovedElement[]> {
  const allEls: MovedElement[] = [];
  els.forEach((el) => {
    if (el.isConnected) {
      const { x, y } = el.getBoundingClientRect();
      allEls.push([el, x, y]);
    }
  });
  return new Promise((res) =>
    requestAnimationFrame(() => {
      const movedEls: MovedElement[] = [];
      for (const [el, prevX, prevY] of allEls) {
        if (!el.isConnected) break;
        const { x, y } = el.getBoundingClientRect();
        const dX = prevX - x;
        const dY = prevY - y;
        if (dX || dY) movedEls.push([el, dX, dY]);
      }
      res(movedEls);
    })
  );
}

export function detachEls(els: StylableElement[]): void {
  const detachableEls: {
    el: HTMLElement;
    left: number;
    top: number;
    width: number;
    height: number;
  }[] = [];
  els.forEach((el) => {
    if (el instanceof HTMLElement) {
      detachableEls.push({
        el,
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    }
  });

  detachableEls.forEach(({ el, ...offsets }) => {
    el.style.setProperty("position", "absolute");
    el.style.setProperty("margin", "0px");
    for (const name in offsets)
      el.style.setProperty(name, `${offsets[name as keyof typeof offsets]}px`);
  });
}