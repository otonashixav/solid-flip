import {
    children,
    createSignal,
    untrack,
    JSX,
    createRenderEffect,
} from "solid-js";

import {
    EnterFunction,
    ExitFunction,
    MoveFunction,
    StylableElement,
} from "./types";

export function Transition(props: {
    children: JSX.Element;
    move?: MoveFunction;
    enter?: EnterFunction;
    exit?: ExitFunction;
}): JSX.Element {
    const { move, enter, exit } = props;
    const getResolved = children(() => props.children);
    const [getEls, setEls] = createSignal<StylableElement[]>([]);

    createRenderEffect((prevSet: Set<StylableElement>) => {
        const resolved = getResolved();
        const els = (Array.isArray(resolved) ? resolved : [resolved]).filter(
            (el) => el instanceof Element
        ) as StylableElement[];
        const currSet = new Set(els);
        const prevEls = untrack(getEls);

        const enteringEls = enter && els.filter((el) => !prevSet.has(el));
        const movingEls =
            move && (exit ? prevEls : prevEls.filter((el) => currSet.has(el)));
        let exitingEls: StylableElement[] | undefined;
        let removeEls: (() => void) | undefined;

        if (exit) {
            const exitingSet = prevSet;
            exitingSet.forEach(
                (el) => currSet.has(el) && exitingSet.delete(el)
            );
            if (exitingSet.size) {
                prevEls.forEach(
                    (el, index) => currSet.has(el) || els.splice(index, 0, el)
                );

                removeEls = () =>
                    setEls((els) => {
                        const nextEls = els.filter((el) => !exitingSet.has(el));
                        const resumeMove = move?.(nextEls);
                        resumeMove && requestAnimationFrame(resumeMove);
                        return nextEls;
                    });

                exitingEls = [...exitingSet];
            }
        }

        setEls(els);

        const applyMove = movingEls?.length && move!(movingEls);
        const applyEnter = enteringEls?.length && enter!(enteringEls);
        const applyExit = exitingEls && exit!(exitingEls, removeEls!);

        (applyMove || applyEnter || applyExit) &&
            requestAnimationFrame(() => {
                applyEnter && applyEnter();
                applyExit && applyExit();
                applyMove && applyMove();
            });

        return currSet;
    }, new Set());

    return getEls;
}
