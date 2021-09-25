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

const DEFAULT_MOVE_GET_KEYFRAMES = (x: number, y: number): KeyframeType => ({
  transform: [`translate(${x}px,${y}px)`, "none"],
  composite: "add",
});

function animateAllKeyframes(
  el: Animatable,
  keyframes: KeyframeType,
  extraKeyframesList?: KeyframeType[],
  options?: KeyframeAnimationOptions
): Animation {
  const animationOptions = { ...DEFAULT_OPTIONS, ...options };
  if (extraKeyframesList)
    for (const extraKeyframes of extraKeyframesList)
      el.animate(extraKeyframes, animationOptions);
  return el.animate(keyframes, animationOptions);
}

export function animateMove(
  animate:
    | {
        getKeyframes?: (x: number, y: number) => KeyframeType;
        extraKeyframesList?: KeyframeType[];
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement, x: number, y: number) => void) = {}
): MoveIntegration {
  if (typeof animate === "object") {
    const {
      getKeyframes = DEFAULT_MOVE_GET_KEYFRAMES,
      extraKeyframesList,
      options,
    } = animate;
    animate = (el, x, y) => {
      animateAllKeyframes(el, getKeyframes(x, y), extraKeyframesList, options);
    };
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

const DEFAULT_ENTER_KEYFRAMES: KeyframeType = {
  opacity: [0, 1],
};

export function animateEnter(
  animate:
    | {
        keyframes?: KeyframeType;
        extraKeyframesList?: KeyframeType[];
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement) => void) = {}
): EnterIntegration {
  if (typeof animate === "object") {
    const {
      keyframes = DEFAULT_ENTER_KEYFRAMES,
      extraKeyframesList,
      options,
    } = animate;
    animate = (el) => {
      animateAllKeyframes(el, keyframes, extraKeyframesList, {
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

const DEFAULT_EXIT_KEYFRAMES: KeyframeType = {
  opacity: [1, 0],
};

export function animateExit(
  animate:
    | {
        keyframes?: KeyframeType;
        extraKeyframesList?: KeyframeType[];
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
    const {
      keyframes = DEFAULT_EXIT_KEYFRAMES,
      extraKeyframesList,
      options,
    } = animate;
    animate = (el) => {
      return animateAllKeyframes(el, keyframes, extraKeyframesList, options)
        .finished;
    };
  }

  const animate_ = animate;
  const animateEl = (el: StylableElement) => {
    if (reverseEnter) {
      const animations = el.getAnimations();
      let reversePromise: Promise<unknown> | undefined;
      for (const animation of animations) {
        if (animation.id === "enter") {
          animation.reverse();
          reversePromise = animation.finished;
        }
      }
      if (reversePromise) return reversePromise;
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
        (isEnter ? requestAnimationFrame : run)(() => {
          removeClasses(els, ...fromClasses);
          addClasses(els, ...toClasses);
          const registerEventHandler = (el: StylableElement) => {
            const handleEvent = ({ currentTarget }: Event) => {
              if (currentTarget !== el) return;
              removeEls
                ? separate
                  ? removeEls(el)
                  : removeEls()
                : separate
                ? el.classList.remove(...activeClasses)
                : removeClasses(els, ...activeClasses);
              isEnter && el.removeEventListener("cssexit", handleEvent);
              if (type === "both") {
                el.removeEventListener("transitionend", handleEvent);
                el.removeEventListener("animationend", handleEvent);
              } else el.removeEventListener(type, handleEvent);
            };
            isEnter && el.addEventListener("cssexit", handleEvent);
            if (type === "both") {
              el.addEventListener("transitionend", handleEvent);
              el.addEventListener("animationend", handleEvent);
            } else el.addEventListener(type, handleEvent);
          };
          if (separate) for (const el of els) registerEventHandler(el);
          else registerEventHandler(els[0]);
        })
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
