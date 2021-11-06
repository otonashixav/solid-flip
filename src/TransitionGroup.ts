import {
  children,
  createSignal,
  untrack,
  JSX,
  createComputed,
  Component,
  createRoot,
} from "solid-js";
import { EnterIntegration, ExitIntegration, MoveIntegration } from "./types";

function resolvedToEls(resolved: JSX.Element) {
  return (Array.isArray(resolved) ? resolved : [resolved]).filter(
    (el) => el instanceof HTMLElement || el instanceof SVGElement
  ) as Element[];
}

export interface TransitionGroupProps {
  children: JSX.Element;
  enter?: EnterIntegration & { initial?: EnterIntegration };
  exit?: ExitIntegration | ExitIntegration;
  move?: MoveIntegration;
  onEntering?: (els: Element[]) => void;
  onEntered?: (els: Element[]) => void;
  onExiting?: (els: Element[]) => void;
  onExited?: (els: Element[]) => void;
  initial?: boolean | EnterIntegration;
}

export const TransitionGroup: Component<TransitionGroupProps> = (props) => {
  let {
    move,
    enter,
    exit,
    initial,
    onEntering,
    onEntered,
    onExiting,
    onExited,
  } = {} as TransitionGroupProps;
  createComputed(() => (initial = props.initial));
  createComputed(() => (move = props.move));
  createComputed(() => (enter = props.enter));
  createComputed(() => (exit = props.exit));
  createComputed(() => (onEntering = props.onEntering));
  createComputed(() => (onEntered = props.onEntered));
  createComputed(() => (onExiting = props.onExiting));
  createComputed(() => (onExited = props.onExited));

  const getResolved = children(() => props.children);
  const [getEls, setEls] = createSignal<Element[]>([]);

  let isBatched = false;
  const batchedExitedEls: Set<Element> = new Set();
  const batchExit = (els: Element[]) => {
    if (!isBatched) {
      isBatched = true;
      requestAnimationFrame(() => {
        batchedExitedEls.size && finishExitEls(batchedExitedEls);
        batchedExitedEls.clear();
        isBatched = false;
      });
    }
    for (const el of els) batchedExitedEls.add(el);
  };

  const finishEnterEls = (els: Element[]) => onEntered && onEntered(els);
  const finishExitEls = (removedEls: Set<Element>) => {
    onExited && onExited([...removedEls]);
    createRoot((dispose) => {
      const els = untrack(getEls).filter((el) => !removedEls.has(el));
      move && els.length && move(els);
      setEls(els);
      setTimeout(dispose);
    });
  };

  let isInitial = true;
  createComputed((prevElSet: Set<Element>) => {
    const resolved = getResolved();
    const els = resolvedToEls(resolved);
    const elSet = new Set(els);

    if (isInitial) {
      if (els.length) {
        isInitial = false;
        onEntering && onEntering(els);
        if (typeof initial === "function") initial(els, finishEnterEls);
        else if (initial === true && enter) enter(els, finishEnterEls);
        else if (initial !== false && enter?.initial)
          enter.initial(els, finishEnterEls);
        else onEntered && onEntered(els);
      }
    } else {
      const prevEls = untrack(getEls);
      const movingEls = prevEls;
      const enteringEls = els.filter((el) => !prevElSet.has(el));
      // Modify prevElSet in place since we have no more use for it
      const exitingElSet = prevElSet;
      for (const el of exitingElSet) elSet.has(el) && exitingElSet.delete(el);
      // Persist previous els; they will be removed by removeEls
      for (let i = 0; i < prevEls.length; i++)
        !elSet.has(prevEls[i]) && els.splice(i, 0, prevEls[i]);

      if (movingEls.length) {
        move && move(movingEls);
      }

      if (enteringEls.length) {
        onEntering && onEntering(enteringEls);
        for (const el of enteringEls) {
          if (batchedExitedEls.size) batchedExitedEls.delete(el);
          else break;
        }
        if (enter) enter(enteringEls, finishEnterEls);
        else finishEnterEls(enteringEls);
      }

      if (exitingElSet.size) {
        const exitingEls = [...exitingElSet];
        onExiting && onExiting(exitingEls);
        if (exit) exit(exitingEls, batchExit);
        else finishExitEls(exitingElSet);
      }
    }

    setEls(els);
    return elSet;
  }, new Set(getEls()));

  return getEls;
};
