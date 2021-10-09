import { onCommit, onUpdate } from "./schedule";
import {
  EnterIntegration,
  ExitIntegration,
  KeyframeType,
  MoveIntegration,
  StylableElement,
} from "./types";
import { detachEls, filterMovedEls } from "./utils";

function run(fn: () => void): void {
  fn();
}

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

function animateAllKeyframes(
  el: StylableElement,
  keyframes: KeyframeType | ((el: StylableElement) => KeyframeType),
  options?: KeyframeAnimationOptions
): Animation {
  return el.animate(
    typeof keyframes === "function" ? keyframes(el) : keyframes,
    {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  );
}

export function animateMove(
  animate:
    | {
        keyframes?: (el: StylableElement, x: number, y: number) => KeyframeType;
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement, x: number, y: number) => void) = {}
): MoveIntegration {
  if (typeof animate === "object") {
    const { keyframes = DEFAULT_MOVE_KEYFRAMES, options } = animate;
    animate = (el, x, y) =>
      animateAllKeyframes(el, keyframes(el, x, y), options);
  }

  const animateEl = animate;
  return (els) => {
    const movedEls = filterMovedEls(els);
    onUpdate(() =>
      onCommit(() => {
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
    | ((el: StylableElement) => void) = {}
): EnterIntegration {
  if (typeof animate === "object") {
    const { keyframes = DEFAULT_ENTER_KEYFRAMES, options } = animate;
    animate = (el) => {
      animateAllKeyframes(el, keyframes, {
        id: "enter",
        ...options,
      });
    };
  }

  const animateEl = animate;
  return (els) =>
    onUpdate(() =>
      onCommit(() => {
        for (const el of els) animateEl(el);
      })
    );
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
    separate?: boolean;
  } = {}
): ExitIntegration {
  const { absolute, reverseEnter, separate = reverseEnter } = options;
  if (typeof animate === "object") {
    const { keyframes = DEFAULT_EXIT_KEYFRAMES, options } = animate;
    animate = (el) => animateAllKeyframes(el, keyframes, options).finished;
  }

  const animate_ = animate;
  const animateEl = (el: StylableElement) => {
    if (reverseEnter) {
      for (const animation of el.getAnimations()) {
        if (animation.id === "enter") {
          animation.reverse();
          return animation.finished;
        }
      }
    }
    return animate_(el);
  };

  return (els, removeEls) => {
    if (absolute) detachEls(els);
    onCommit(() => {
      if (separate) {
        for (const el of els) animateEl(el).then(() => removeEls(el));
      } else {
        animateEl(els.shift() as StylableElement).then(() => removeEls());
        for (const el of els) animateEl(el);
      }
    });
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
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  },
  isEnter: boolean
): (
  els: StylableElement[],
  removeElements?: (el?: StylableElement) => void
) => void {
  const { fromClasses, activeClasses, toClasses } = classLists;
  const { separate, type = "both" } = options;
  return (els, removeEls) => {
    onCommit(() => {
      if (!isEnter)
        for (const el of els) el.dispatchEvent(new CustomEvent("cssexit"));
      addClasses(els, ...fromClasses, ...activeClasses);
    });
    onUpdate(() =>
      onCommit(() =>
        (isEnter ? requestAnimationFrame : run)(() =>
          (isEnter ? setTimeout : run)(() => {
            removeClasses(els, ...fromClasses);
            addClasses(els, ...toClasses);
            const registerEventHandler = (el: StylableElement) => {
              const handleEvent = ({ target }: Event) => {
                if (target !== el) return;
                removeEls
                  ? separate
                    ? removeEls(el)
                    : removeEls()
                  : separate
                  ? el.classList.remove(...activeClasses)
                  : removeClasses(els, ...activeClasses);
                isEnter && el.removeEventListener("cssexit", handleEvent);
                type !== "animationend" &&
                  el.removeEventListener("transitionend", handleEvent);
                type !== "transitionend" &&
                  el.removeEventListener("animationend", handleEvent);
              };
              isEnter && el.addEventListener("cssexit", handleEvent);
              type !== "animationend" &&
                el.addEventListener("transitionend", handleEvent);
              type !== "transitionend" &&
                el.addEventListener("animationend", handleEvent);
            };
            if (separate) for (const el of els) registerEventHandler(el);
            else registerEventHandler(els[0]);
          })
        )
      )
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
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): EnterIntegration {
  const classLists = splitClasses(classes, true);
  const enter = cssIntegration(classLists, options, true);
  return Object.assign(enter, {
    initial: (els: StylableElement[]) =>
      addClasses(els, ...classLists.toClasses),
  });
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
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): ExitIntegration {
  const { absolute, ...integrationOptions } = options;
  const classLists = splitClasses(classes, false);
  const exit = cssIntegration(classLists, integrationOptions, false);
  return (els, removeEls) => {
    absolute && detachEls(els);
    exit(els, removeEls);
  };
}
