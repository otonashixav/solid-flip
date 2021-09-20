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

function resolvedToEls(resolved: JSX.Element) {
  return (Array.isArray(resolved) ? resolved : [resolved]).filter(
    (el) => el instanceof Element
  ) as StylableElement[];
}

export function Transition(props: {
  children: JSX.Element;
  move?: MoveFunction;
  enter?: EnterFunction;
  exit?: ExitFunction;
  initial?: true;
}): JSX.Element {
  let move: MoveFunction | undefined,
    enter: EnterFunction | undefined,
    exit: ExitFunction | undefined;
  createRenderEffect(() => (move = props.move));
  createRenderEffect(() => (enter = props.enter));
  createRenderEffect(() => (exit = props.exit));

  const enterInitial = props.initial;

  const getResolved = children(() => props.children);
  const [getEls, setEls] = createSignal<StylableElement[]>(
    enterInitial ? [] : resolvedToEls(getResolved())
  );

  let isInitial = true;
  createRenderEffect((prevSet: Set<StylableElement>) => {
    const resolved = getResolved();
    if (isInitial) {
      isInitial = false;
      if (!enterInitial) return prevSet;
    }
    const els = resolvedToEls(resolved);
    const currSet = new Set(els);
    const prevEls = untrack(getEls);

    const enteringEls = enter && els.filter((el) => !prevSet.has(el));
    const movingEls =
      move && (exit ? prevEls : prevEls.filter((el) => currSet.has(el)));
    let exitingEls: StylableElement[] | undefined;
    let removeEls: (() => void) | undefined;

    if (exit) {
      const exitingSet = prevSet;
      exitingSet.forEach((el) => currSet.has(el) && exitingSet.delete(el));
      prevEls.forEach(
        (el, index) => currSet.has(el) || els.splice(index, 0, el)
      );
      if (exitingSet.size) {
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
  }, new Set(getEls()));

  return getEls;
}
