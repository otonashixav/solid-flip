import {
    StylableElement,
    MoveFunction,
    EnterFunction,
    ExitFunction,
} from "./types";

export function filterMoved(
    els: StylableElement[],
    move: (movedEls: [StylableElement, number, number][]) => void
): () => void {
    const movedEls = els
        .filter((el) => el.isConnected)
        .map((el) => {
            const { x, y } = el.getBoundingClientRect();
            return [el, x, y] as [StylableElement, number, number];
        });
    return () => {
        let i = movedEls.length;
        while (i--) {
            const movedEl = movedEls[i];
            const [el, prevX, prevY] = movedEl;
            const { x, y } = el.getBoundingClientRect();
            movedEl[1] = prevX - x;
            movedEl[2] = prevY - y;
            if (!(movedEl[1] || movedEl[2])) movedEls.splice(i, 1);
        }
        movedEls.length && move(movedEls);
    };
}

export function fixPositions(els: StylableElement[]): () => void {
    const offsetsList = els.map<
        [StylableElement, Record<string, number> | null]
    >((el) => [
        el,
        el instanceof HTMLElement
            ? {
                  left: el.offsetLeft,
                  top: el.offsetTop,
                  width: el.offsetWidth,
                  height: el.offsetHeight,
              }
            : null,
    ]);
    return () =>
        offsetsList.forEach(([el, offsets]) => {
            el.style.setProperty("position", "absolute");
            el.style.setProperty("margin", "0px");
            for (const name in offsets)
                el.style.setProperty(name, `${offsets[name]}px`);
        });
}

const DEFAULT_OPTIONS: KeyframeAnimationOptions = {
    duration: 300,
    easing: "ease",
    fill: "backwards",
};

export function animateMove(
    getKeyframes: (
        x: number,
        y: number
    ) => Keyframe[] | PropertyIndexedKeyframes | null = (x, y) => ({
        transform: [`translate(${x}px,${y}px)`, "none"],
        composite: "add",
    }),
    animationOptions?: KeyframeAnimationOptions
): MoveFunction {
    return (els) =>
        filterMoved(els, (movedEls) =>
            movedEls.forEach(([el, x, y]) =>
                el.animate(getKeyframes(x, y), {
                    ...DEFAULT_OPTIONS,
                    ...animationOptions,
                })
            )
        );
}

export function animateEnter(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
        opacity: [0, 1],
    },
    animationOptions?: KeyframeAnimationOptions
): EnterFunction {
    return (els) => () =>
        els.forEach((el) =>
            el.animate(keyframes, {
                ...DEFAULT_OPTIONS,
                ...animationOptions,
            })
        );
}

export function animateExit(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
        opacity: [1, 0],
    },
    animationOptions?: KeyframeAnimationOptions,
    options: { fixPosition?: boolean } = {}
): ExitFunction {
    const { fixPosition } = options;
    return (els, done) => {
        const setAbsolute = fixPosition && fixPositions(els);
        return () => {
            fixPosition && (setAbsolute as () => void)();
            els.forEach((el, i) => {
                const finished = el.animate(keyframes, {
                    ...DEFAULT_OPTIONS,
                    ...animationOptions,
                }).finished;
                !i && finished.then(done);
            });
        };
    };
}

export function cssEnter(classes: {
    name?: string;
    from?: string;
    to?: string;
    active?: string;
}): EnterFunction {
    const fromClasses = classes.from?.split(" ") ?? [];
    const toClasses = classes.to?.split(" ") ?? [];
    const activeClasses = classes.active?.split(" ") ?? [];

    if (classes.name) {
        fromClasses.push(classes.name + "-enter-from");
        toClasses.push(classes.name + "-enter-to");
        activeClasses.push(classes.name + "-enter-active");
    }

    return (els) => {
        els.forEach((el) => el.classList.add(...fromClasses, ...activeClasses));
        return () =>
            requestAnimationFrame(() =>
                els.forEach((el) => {
                    el.classList.remove(...fromClasses);
                    el.classList.add(...toClasses);
                    const endHandler = (ev: Event) => {
                        if (ev.target === el) {
                            el.classList.remove(...activeClasses);
                            el.removeEventListener("transitionend", endHandler);
                            el.removeEventListener("animationend", endHandler);
                        }
                    };
                    el.addEventListener("transitionend", endHandler);
                    el.addEventListener("animationend", endHandler);
                })
            );
    };
}

export function cssExit(
    classes: {
        name?: string;
        from?: string;
        to?: string;
        active?: string;
    },
    options: {
        fixPosition?: boolean;
    } = {}
): ExitFunction {
    let { fixPosition } = options;
    const fromClasses = classes.from?.split(" ") ?? [];
    const toClasses = classes.to?.split(" ") ?? [];
    const activeClasses = classes.active?.split(" ") ?? [];

    if (classes.name) {
        fromClasses.push(classes.name + "-exit-from");
        toClasses.push(classes.name + "-exit-to");
        activeClasses.push(classes.name + "-exit-active");
    }

    return (els, removeEls) => {
        const setAbsolute = fixPosition && fixPositions(els);
        els.forEach((el) => {
            el.dispatchEvent(new AnimationEvent("animationend"));
            el.classList.add(...fromClasses, ...activeClasses);
        });
        return () => {
            fixPosition && (setAbsolute as () => void)();
            els.forEach((el, i) => {
                el.classList.remove(...fromClasses);
                el.classList.add(...toClasses);
                if (i === 0) {
                    const endHandler = (ev: Event) => {
                        if (ev.target === el) {
                            removeEls();
                            el.removeEventListener("transitionend", endHandler);
                            el.removeEventListener("animationend", endHandler);
                        }
                    };
                    el.addEventListener("transitionend", endHandler);
                    el.addEventListener("animationend", endHandler);
                }
            });
        };
    };
}
