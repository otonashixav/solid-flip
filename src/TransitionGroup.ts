import {
  children,
  createSignal,
  untrack,
  JSX,
  createRenderEffect,
  Component,
} from "solid-js";

function resolvedToEls(resolved: JSX.Element) {
  return (Array.isArray(resolved) ? resolved : [resolved]).filter(
    (el) => el instanceof Element
  ) as StylableElement[];
}

interface TransitionProps {
  children: JSX.Element;
  move?: MoveIntegration;
  enter?: EnterIntegration;
  exit?: ExitIntegration | ExitIntegration;
  initial?: true;
}

export const TransitionGroup: Component<TransitionProps> = (props) => {
  let { move, enter, exit } = {} as TransitionProps;
  createRenderEffect(() => (move = props.move));
  createRenderEffect(() => (enter = props.enter));
  createRenderEffect(() => (exit = props.exit));

  const enterInitial = props.initial;

  const getResolved = children(() => props.children);
  const [getEls, setEls] = createSignal(
    enterInitial ? [] : resolvedToEls(getResolved())
  );

  let isInitial = true;
  createRenderEffect((prevElSet: Set<StylableElement>) => {
    const resolved = getResolved();

    if (isInitial) {
      isInitial = false;
      if (!enterInitial) return prevElSet;
    }

    const els = resolvedToEls(resolved);
    const elSet = new Set(els);
    const prevEls = untrack(getEls);

    if (enter) {
      const enteringEls = els.filter((el) => !prevElSet.has(el));
      enteringEls.length && enter(enteringEls);
    }

    if (exit) {
      // Modify prevElSet in place since we have no more use for it
      for (const el of prevElSet) elSet.has(el) && prevElSet.delete(el);
      const exitingElSet = prevElSet;
      // Persist previous els; they will be removed by removeEls
      for (let i = 0; i < prevEls.length; i++)
        !elSet.has(prevEls[i]) && els.splice(i, 0, prevEls[i]);
      if (exitingElSet.size) {
        // We have els exiting
        const exitingEls = [...exitingElSet];
        const removeEls = (removedEl?: StylableElement) => {
          setEls((els) => {
            const nextEls = els.filter((el) =>
              removedEl === undefined ? !exitingElSet.has(el) : el !== removedEl
            );
            move && nextEls.length && move(nextEls);
            return nextEls;
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

    return elSet;
  }, new Set(getEls()));

  return getEls;
};
