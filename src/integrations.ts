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

export function animateMove(
  animate:
    | ((el: StylableElement, x: number, y: number) => void)
    | {
        getKeyframes?: (x: number, y: number) => KeyframeType;
        options?: KeyframeAnimationOptions;
      } = {}
): MoveIntegration {
  if (typeof animate === "object") {
    const { getKeyframes = DEFAULT_MOVE_GET_KEYFRAMES, options } = animate;
    animate = (el, x, y) => {
      el.animate(getKeyframes(x, y), {
        ...DEFAULT_OPTIONS,
        ...options,
      });
    };
  }

  const animateEl = animate;
  return (els) => {
    const movedEls = filterMovedEls(els);
    onUpdate(() =>
      onCommit(() => {
        for (const [el, x, y] of movedEls) animateEl(el, x, y);
      })
    );
  };
}

const DEFAULT_ENTER_KEYFRAMES: KeyframeType = {
  opacity: [0, 1],
};

export function animateEnter(
  animate:
    | ((el: StylableElement) => void)
    | {
        keyframes?: KeyframeType;
        extraKeyframesList?: KeyframeType[];
        options?: KeyframeAnimationOptions;
      } = {}
): EnterIntegration {
  if (typeof animate === "object") {
    const {
      keyframes = DEFAULT_ENTER_KEYFRAMES,
      extraKeyframesList,
      options,
    } = animate;
    animate = (el) => {
      const animationOptions = { ...DEFAULT_OPTIONS, id: "enter", ...options };
      if (extraKeyframesList)
        for (const extraKeyframes of extraKeyframesList) {
          el.animate(extraKeyframes, animationOptions);
        }
      el.animate(keyframes, animationOptions);
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
    | ((el: StylableElement) => Promise<unknown>)
    | {
        keyframes?: KeyframeType;
        extraKeyframesList?: KeyframeType[];
        options?: KeyframeAnimationOptions;
      } = {},
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
      const animationOptions = { ...DEFAULT_OPTIONS, ...options };
      if (extraKeyframesList)
        for (const extraKeyframes of extraKeyframesList)
          el.animate(extraKeyframes, animationOptions);
      return el.animate(keyframes, animationOptions).finished;
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
  const name = classes.name && classes.name + isEnter ? "-enter" : "-exit";
  if (name) {
    fromClasses.unshift(`${name}-from`);
    activeClasses.unshift(`${name}-active`);
    toClasses.unshift(`${name}-to`);
  }
  return { fromClasses, activeClasses, toClasses };
}

function cssIntegration(
  classes: {
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
  const { fromClasses, activeClasses, toClasses } = classes;
  const { separate, type = "both" } = options;
  return (els, removeEls) => {
    onCommit(() => addClasses(els, ...fromClasses, ...activeClasses));
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
              if (type === "both") {
                el.removeEventListener("transitionend", handleEvent);
                el.removeEventListener("animationend", handleEvent);
              } else el.removeEventListener(type, handleEvent);
            };
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
  classNames: {
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
  const classes = splitClasses(classNames, true);
  const enter = cssIntegration(classes, options, true);
  return Object.assign(enter, {
    initial: (els: StylableElement[]) => addClasses(els, ...classes.toClasses),
  });
}

export function cssExit(
  classNames: {
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
  const classes = splitClasses(classNames, false);
  const exit = cssIntegration(classes, integrationOptions, false);
  return (els, removeEls) => {
    absolute && detachEls(els);
    exit(els, removeEls);
  };
}
