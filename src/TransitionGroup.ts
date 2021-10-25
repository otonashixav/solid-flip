import {
  children,
  createSignal,
  untrack,
  JSX,
  createComputed,
  Component,
  createRoot,
} from "solid-js";
import {
  EnterIntegration,
  ExitIntegration,
  MoveIntegration,
  StylableElement,
} from "./types";

function resolvedToEls(resolved: JSX.Element) {
  return (Array.isArray(resolved) ? resolved : [resolved]).filter(
    (el) => el instanceof Element
  ) as StylableElement[];
}

export interface TransitionGroupProps {
  children: JSX.Element;
  enter?: EnterIntegration & { initial?: EnterIntegration };
  exit?: ExitIntegration | ExitIntegration;
  move?: MoveIntegration;
  onEntering?: (els: StylableElement[]) => void;
  onEntered?: (els: StylableElement[]) => void;
  onExiting?: (els: StylableElement[]) => void;
  onExited?: (els: StylableElement[]) => void;
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
  const [getEls, setEls] = createSignal<StylableElement[]>([]);

  const batchedExitedEls: Set<StylableElement> = new Set();
  const batchExit = (els: StylableElement[]) => {
    if (!batchedExitedEls.size) {
      requestAnimationFrame(() => {
        batchedExitedEls.size && finishExitEls(batchedExitedEls);
        batchedExitedEls.clear();
      });
    }
    for (const el of els) batchedExitedEls.add(el);
  };

  const finishEnterEls = (els: StylableElement[]) =>
    onEntered && onEntered(els);
  const finishExitEls = (removedEls: Set<StylableElement>) => {
    onExited && onExited([...removedEls]);
    createRoot((dispose) => {
      const els = untrack(getEls).filter((el) => !removedEls.has(el));
      move && els.length && move(els);
      setEls(els);
      setTimeout(dispose);
    });
  };

  let isInitial = true;
  createComputed((prevElSet: Set<StylableElement>) => {
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

      if (move) {
        const movingEls = prevEls;
        movingEls.length && move(movingEls);
      }

      if (enter) {
        const enteringEls = els.filter((el) => !prevElSet.has(el));
        if (enteringEls.length) {
          for (const el of enteringEls) {
            if (batchedExitedEls.size) batchedExitedEls.delete(el);
            else break;
          }
          onEntering && onEntering(enteringEls);
          enter(enteringEls, finishEnterEls);
        }
      }

      if (exit) {
        // Modify prevElSet in place since we have no more use for it
        const exitingElSet = prevElSet;
        for (const el of exitingElSet) elSet.has(el) && exitingElSet.delete(el);
        // Persist previous els; they will be removed by removeEls
        for (let i = 0; i < prevEls.length; i++)
          !elSet.has(prevEls[i]) && els.splice(i, 0, prevEls[i]);
        if (exitingElSet.size) {
          // We have els exiting
          const exitingEls = [...exitingElSet];
          onExiting && onExiting(exitingEls);
          exit(exitingEls, batchExit);
        }
      }
    }

    setEls(els);
    return elSet;
  }, new Set(getEls()));

  return getEls;
};
