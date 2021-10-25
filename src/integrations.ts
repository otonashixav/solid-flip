import { onMount } from "solid-js";
import {
  EnterIntegration,
  ExitIntegration,
  KeyframeType,
  MoveIntegration,
  StylableElement,
} from "./types";
import { detachEls, filterMovedEls, undetachEls } from "./utils";

const CANCEL_EVENT_TYPE = "flipcancel";
const CANCEL_EVENT = Object.freeze(new CustomEvent(CANCEL_EVENT_TYPE));

const DEFAULT_OPTIONS: KeyframeAnimationOptions = {
  duration: 300,
  easing: "ease",
  fill: "backwards",
};

const DEFAULT_MOVE_KEYFRAMES = (
  _el: StylableElement,
  x: number,
  y: number
): KeyframeType => ({
  transform: [`translate(${x}px,${y}px)`, "none"],
  composite: "add",
});

function getAnimate<T extends unknown[], U extends Promise<unknown> | void>(
  animate:
    | ((el: StylableElement, ...params: T) => U)
    | {
        keyframes?:
          | KeyframeType
          | ((el: StylableElement, ...params: T) => KeyframeType);
        options?: KeyframeAnimationOptions;
      },
  config: {
    defaultKeyframes:
      | ([] extends T ? KeyframeType : never)
      | ((el: StylableElement, ...params: T) => KeyframeType);
    configOptions?: KeyframeAnimationOptions;
  }
): (el: StylableElement, ...params: T) => U {
  if (typeof animate === "function") return animate;
  const { defaultKeyframes, configOptions } = config;
  const { keyframes = defaultKeyframes, options } = animate;
  return (el, ...params) =>
    el.animate(
      typeof keyframes === "function" ? keyframes(el, ...params) : keyframes,
      { ...DEFAULT_OPTIONS, ...configOptions, ...options }
    ).finished as U;
}

export function animateMove(
  animate:
    | {
        keyframes?: (el: StylableElement, x: number, y: number) => KeyframeType;
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement, x: number, y: number) => void) = {}
): MoveIntegration {
  const animateEl = getAnimate(animate, {
    defaultKeyframes: DEFAULT_MOVE_KEYFRAMES,
  });
  return (els) => {
    const movedEls = filterMovedEls(els);
    onMount(() =>
      onMount(() => {
        for (const movedEl of movedEls) animateEl(...movedEl);
      })
    );
  };
}

const DEFAULT_ENTER_KEYFRAMES: (el: StylableElement) => KeyframeType = (
  el
) => ({
  opacity: ["0", getComputedStyle(el).opacity],
});

export function animateEnter(
  animate:
    | {
        keyframes?: KeyframeType | ((el: StylableElement) => KeyframeType);
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement) => Promise<unknown>) = {},
  options: {
    unabsolute?: boolean;
    reverseExit?: boolean;
  } = {}
): EnterIntegration {
  const { unabsolute, reverseExit } = options;
  const animateEl = getAnimate(animate, {
    defaultKeyframes: DEFAULT_ENTER_KEYFRAMES,
    configOptions: { id: "flipenter" },
  });
  return (els, finish) => {
    if (unabsolute) undetachEls(els);
    onMount(() => {
      for (const el of els) {
        if (reverseExit) {
          for (const animation of el.getAnimations()) {
            if (animation.id === "flipexit") {
              animation.reverse();
              animation.id = "flipenter";
            }
          }
        }
        let cancelled = false;
        el.dispatchEvent(CANCEL_EVENT);
        if (finish) {
          el.addEventListener?.(CANCEL_EVENT_TYPE, () => (cancelled = true));
          animateEl(el).then(() => cancelled || finish([el]));
        }
      }
    });
  };
}

const DEFAULT_EXIT_KEYFRAMES: (el: StylableElement) => KeyframeType = (el) => ({
  opacity: [getComputedStyle(el).opacity, "0"],
});

export function animateExit(
  animate:
    | {
        keyframes?: KeyframeType | ((el: StylableElement) => KeyframeType);
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement) => Promise<unknown>) = {},
  options: {
    absolute?: boolean;
    reverseEnter?: boolean;
  } = {}
): ExitIntegration {
  const { absolute, reverseEnter } = options;
  const animateEl = getAnimate(animate, {
    defaultKeyframes: DEFAULT_EXIT_KEYFRAMES,
    configOptions: { id: "flipexit" },
  });

  return (els, finish) => {
    if (absolute) detachEls(els);
    for (const el of els) {
      if (reverseEnter) {
        for (const animation of el.getAnimations()) {
          if (animation.id === "flipenter") {
            animation.reverse();
            animation.id = "flipexit";
          }
        }
      }
      let cancelled = false;
      el.dispatchEvent(CANCEL_EVENT);
      el.addEventListener?.(CANCEL_EVENT_TYPE, () => (cancelled = true));
      animateEl(el).then(() => cancelled || finish([el]));
    }
  };
}

function addClasses(els: StylableElement[], ...classes: string[]) {
  for (const el of els) el.classList.add(...classes);
}

function removeClasses(els: StylableElement[], ...classes: string[]) {
  for (const el of els) el.classList.remove(...classes);
}

function splitClasses(
  classes: {
    name?: string | undefined;
    from?: string | undefined;
    active?: string | undefined;
    to?: string | undefined;
  },
  isEnter: boolean
) {
  const split = (className?: string) => className?.split(" ") ?? [];
  const fromClasses = split(classes.from);
  const activeClasses = split(classes.active);
  const toClasses = split(classes.to);
  const name = classes.name && (classes.name + isEnter ? "-enter" : "-exit");
  if (name) {
    fromClasses.unshift(`${name}-from`);
    activeClasses.unshift(`${name}-active`);
    toClasses.unshift(`${name}-to`);
  }
  return { fromClasses, activeClasses, toClasses };
}

function cssIntegration(
  classLists: {
    fromClasses: string[];
    activeClasses: string[];
    toClasses: string[];
  },
  options: {
    type?: "animationend" | "transitionend" | "both";
  }
): (els: StylableElement[], finish?: (el: StylableElement[]) => void) => void {
  const { fromClasses, activeClasses, toClasses } = classLists;
  const { type = "both" } = options;
  return (els, finish) => {
    for (const el of els) el.dispatchEvent(CANCEL_EVENT);
    addClasses(els, ...fromClasses, ...activeClasses);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        removeClasses(els, ...fromClasses);
        addClasses(els, ...toClasses);
        const registerEventHandler = (el: StylableElement) => {
          const handleEvent = ({ target, type }: Event) => {
            if (target !== el) return;
            el.removeEventListener(CANCEL_EVENT_TYPE, handleEvent);
            type !== "animationend" &&
              el.removeEventListener("transitionend", handleEvent);
            type !== "transitionend" &&
              el.removeEventListener("animationend", handleEvent);
            el.classList.remove(...activeClasses);
            if (type !== CANCEL_EVENT_TYPE && finish) finish([el]);
          };
          el.addEventListener(CANCEL_EVENT_TYPE, handleEvent);
          type !== "animationend" &&
            el.addEventListener("transitionend", handleEvent);
          type !== "transitionend" &&
            el.addEventListener("animationend", handleEvent);
        };
        for (const el of els) registerEventHandler(el);
      })
    );
  };
}

export function cssEnter(
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    unabsolute?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): EnterIntegration {
  const { unabsolute, ...integrationOptions } = options;
  const classLists = splitClasses(classes, true);
  const enter = cssIntegration(classLists, integrationOptions);
  return Object.assign(
    ((els, finish) => {
      unabsolute && undetachEls(els);
      enter(els, finish);
    }) as EnterIntegration,
    {
      initial: ((els, finish) => {
        addClasses(els, ...classLists.toClasses);
        finish && finish(els);
      }) as EnterIntegration,
    }
  );
}

export function cssExit(
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    absolute?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): ExitIntegration {
  const { absolute, ...integrationOptions } = options;
  const classLists = splitClasses(classes, false);
  const exit = cssIntegration(classLists, integrationOptions);
  return (els, finish) => {
    absolute && detachEls(els);
    exit(els, finish);
  };
}
