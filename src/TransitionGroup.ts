import {
  children,
  createSignal,
  untrack,
  JSX,
  Component,
  createComputed,
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
  enter?: EnterIntegration;
  exit?: ExitIntegration | ExitIntegration;
  move?: MoveIntegration;
  initial?: boolean | InitialIntegration;
}

export const TransitionGroup: Component<TransitionGroupProps> = (props) => {
  let { initial, enter, exit, move } = {} as TransitionGroupProps;
  createComputed(() => (initial = props.initial));
  createComputed(() => (enter = props.enter));
  createComputed(() => (exit = props.exit));
  createComputed(() => (move = props.move));

  const getResolved = children(() => props.children);
  const [getEls, setEls] = createSignal<StylableElement[]>([]);

  let isInitial = true;
  createComputed((prevElSet: Set<StylableElement>) => {
    const resolved = getResolved();
    const els = resolvedToEls(resolved);
    const elSet = new Set(els);
    const integrations: (() => void)[] = [];

    if (isInitial) {
      if (els.length) {
        isInitial = false;
        const initial_ = initial;
        if (typeof initial_ === "function") {
          integrations.push(() => initial_(els));
        } else if (enter) {
          const enter_ = enter;
          if (initial_ === true) integrations.push(() => enter_(els));
          else if (initial_ !== false && enter_.initial)
            integrations.push(() =>
              (enter_.initial as InitialIntegration)(els)
            );
        }
      }
    } else {
      const enter_ = enter;
      const exit_ = exit;
      const move_ = move;

      const prevEls = untrack(getEls);

      if (enter_) {
        const enteringEls = els.filter((el) => !prevElSet.has(el));
        enteringEls.length && integrations.push(() => enter_(enteringEls));
      }

      if (exit_) {
        // Modify prevElSet in place since we have no more use for it
        const exitingElSet = prevElSet;
        for (const el of exitingElSet) elSet.has(el) && exitingElSet.delete(el);
        // Persist previous els; they will be removed by removeEls
        for (let i = 0; i < prevEls.length; i++)
          !elSet.has(prevEls[i]) && els.splice(i, 0, prevEls[i]);
        if (exitingElSet.size) {
          // We have els exiting
          const exitingEls = [...exitingElSet];
          integrations.push(() =>
            exit_(exitingEls, (removedEl?: StylableElement) => {
              const els = getEls().filter((el) =>
                removedEl ? el !== removedEl : !exitingElSet.has(el)
              );
              setTimeout(() => {
                schedule(
                  () => setEls(els),
                  () => move && els.length && move(els)
                );
              });
            })
          );
        }
      }

      if (move_) {
        const movingEls = prevEls;
        movingEls.length && integrations.push(() => move_(movingEls));
      }
    }

    setTimeout(() => {
      schedule(
        () => setEls(els),
        () => {
          for (const integration of integrations) integration();
        }
      );
    });

    return elSet;
  }, new Set(getEls()));

  return getEls;
};
