import {
  children,
  createSignal,
  untrack,
  JSX,
  createComputed,
  Component,
  onMount,
} from "solid-js";
import { startCommit, startUpdate, applyCommit, applyUpdate } from "./schedule";
import {
  EnterIntegration,
  ExitIntegration,
  InitialIntegration,
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
  enter?: EnterIntegration;
  exit?: ExitIntegration | ExitIntegration;
  move?: MoveIntegration;
  initial?: boolean | InitialIntegration;
}

export const TransitionGroup: Component<TransitionGroupProps> = (props) => {
  const enterInitial = props.initial;
  let { move, enter, exit } = {} as TransitionGroupProps;
  createComputed(() => (move = props.move));
  createComputed(() => (enter = props.enter));
  createComputed(() => (exit = props.exit));

  const getResolved = children(() => props.children);
  const [getEls, setEls] = createSignal<StylableElement[]>([]);

  let isInitial = true;
  createComputed((prevElSet: Set<StylableElement>) => {
    const resolved = getResolved();
    const els = resolvedToEls(resolved);
    const elSet = new Set(els);

    startCommit();
    startUpdate();
    if (isInitial) {
      if (els.length) {
        isInitial = false;
        if (typeof enterInitial === "function") enterInitial(els);
        else if (enterInitial === true && enter) enter(els);
        else if (enterInitial !== false && enter?.initial) enter.initial(els);
      }
    } else {
      const prevEls = untrack(getEls);

      if (enter) {
        const enteringEls = els.filter((el) => !prevElSet.has(el));
        enteringEls.length && enter(enteringEls);
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
          const removeEls = (removedEl?: StylableElement) => {
            setEls((prevEls) => {
              const els = prevEls.filter((el) =>
                removedEl ? el !== removedEl : !exitingElSet.has(el)
              );
              startCommit();
              startUpdate();
              move && els.length && move(els);
              applyCommit();
              return els;
            });
            startCommit();
            applyUpdate();
            applyCommit();
          };
          exit(exitingEls, removeEls);
        }
      }

      if (move) {
        const movingEls = prevEls;
        movingEls.length && move(movingEls);
      }
    }

    applyCommit();
    setEls(els);
    onMount(() => {
      startCommit();
      applyUpdate();
      applyCommit();
    });
    return elSet;
  }, new Set(getEls()));

  return getEls;
};
