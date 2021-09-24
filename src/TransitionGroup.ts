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

  const flip = () => move?.(untrack(getEls));

  let isInitial = true;
  createRenderEffect((prevElSet: Set<StylableElement>) => {
    const resolved = getResolved();

    if (isInitial) {
      isInitial = false;
      if (!enterInitial) return prevElSet;
    }

    const els = resolvedToEls(resolved);
    const elSet = new Set(els);

    flip();

    if (enter) {
      // Wait for the elements to be mounted before calling enter
      const enter_ = enter;
      const enteringEls = els.filter((el) => !prevElSet.has(el));
      requestAnimationFrame(() => enter_(enteringEls));
    }

    if (exit) {
      // Modify prevElSet in place since we have no more use for it
      prevElSet.forEach((el) => elSet.has(el) && prevElSet.delete(el));
      const exitingElSet = prevElSet;
      // Persist previous els; they will be removed by removeEls
      untrack(getEls).forEach(
        (el, i) => !elSet.has(el) && els.splice(i, 0, el)
      );
      if (exitingElSet.size) {
        // We have els exiting
        const exitingEls = [...exitingElSet];
        const removeEls = (index?: number) => {
          flip();
          setEls((els) =>
            els.filter((el) =>
              index !== undefined
                ? el !== exitingEls[index]
                : !exitingElSet.has(el)
            )
          );
        };

        exit(exitingEls, removeEls);
      }
    }

    setEls(els);
    return elSet;
  }, new Set(getEls()));

  return getEls;
};
