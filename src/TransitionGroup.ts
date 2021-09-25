import {
  children,
  createSignal,
  untrack,
  JSX,
  createRenderEffect,
  Component,
} from "solid-js";
import { schedule } from "./schedule";
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
  move?: MoveIntegration;
  enter?: EnterIntegration;
  exit?: ExitIntegration | ExitIntegration;
  initial?: true | InitialIntegration;
}

export const TransitionGroup: Component<TransitionGroupProps> = (props) => {
  const enterInitial = props.initial;
  let { move, enter, exit } = {} as TransitionGroupProps;
  createRenderEffect(() => (move = props.move));
  createRenderEffect(() => (enter = props.enter));
  createRenderEffect(() => (exit = props.exit));

  const getResolved = children(() => props.children);
  const [getEls, setEls] = createSignal<StylableElement[]>([]);

  let isInitial = true;
  createRenderEffect((prevElSet: Set<StylableElement>) => {
    const resolved = getResolved();
    const els = resolvedToEls(resolved);
    const elSet = new Set(els);

    if (isInitial) {
      isInitial = false;
      if (typeof enterInitial === "function") enterInitial(els);
      else if (enterInitial === true && enter) enter(els);
      else if (enter?.initial) enter.initial(els);
      setEls(els);
    } else
      schedule(requestAnimationFrame, () => {
        const prevEls = untrack(getEls);

        if (enter) {
          const enteringEls = els.filter((el) => !prevElSet.has(el));
          enteringEls.length && enter(enteringEls);
        }

        if (exit) {
          // Modify prevElSet in place since we have no more use for it
          const exitingElSet = new Set(prevElSet);
          for (const el of exitingElSet)
            elSet.has(el) && exitingElSet.delete(el);
          // Persist previous els; they will be removed by removeEls
          for (let i = 0; i < prevEls.length; i++)
            !elSet.has(prevEls[i]) && els.splice(i, 0, prevEls[i]);
          if (exitingElSet.size) {
            // We have els exiting
            const exitingEls = [...exitingElSet];
            const removeEls = (removedEl?: StylableElement) => {
              setEls((prevEls) => {
                const els = prevEls.filter((el) =>
                  removedEl === undefined
                    ? !exitingElSet.has(el)
                    : el !== removedEl
                );
                move && els.length && move(els);
                return els;
              });
            };
            exit(exitingEls, removeEls);
          }
        }

        if (move) {
          const movingEls = prevEls;
          movingEls.length && move(movingEls);
        }

        setEls(els);
      });

    return elSet;
  }, new Set(getEls()));

  return getEls;
};
